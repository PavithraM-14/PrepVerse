import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Streamdown } from 'streamdown';
import { streamGemini, type GeminiMessage } from '@/lib/sse';
import type { 
  ProgrammingLanguage, 
  CodeReviewMode, 
  CodeReviewResult,
  CodeError,
  CodeOptimization 
} from '@/types/types';
import {
  Code2, Upload, Play, Sparkles, Bug, Zap, Brain, 
  Target, Clock, CheckCircle, AlertTriangle, Info,
  Copy, Download, BarChart3, TrendingUp, Award,
  FileCode, Lightbulb, MessageSquare, Star
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const languages: { key: ProgrammingLanguage; label: string; icon: string }[] = [
  { key: 'java', label: 'Java', icon: '☕' },
  { key: 'python', label: 'Python', icon: '🐍' },
  { key: 'cpp', label: 'C++', icon: '⚡' },
  { key: 'javascript', label: 'JavaScript', icon: '🟨' },
  { key: 'typescript', label: 'TypeScript', icon: '🔷' },
  { key: 'c', label: 'C', icon: '🔧' },
  { key: 'csharp', label: 'C#', icon: '💜' },
];

const reviewModes: { 
  key: CodeReviewMode; 
  label: string; 
  icon: React.FC<{ className?: string }>; 
  color: string; 
  description: string;
}[] = [
  { 
    key: 'debug', 
    label: 'Debug Mode', 
    icon: Bug, 
    color: 'text-red-500', 
    description: 'Find and fix errors in your code' 
  },
  { 
    key: 'explain', 
    label: 'Explain Code', 
    icon: MessageSquare, 
    color: 'text-blue-500', 
    description: 'Understand how your code works' 
  },
  { 
    key: 'optimize', 
    label: 'Optimize', 
    icon: Zap, 
    color: 'text-yellow-500', 
    description: 'Improve performance and efficiency' 
  },
  { 
    key: 'interview', 
    label: 'Interview Feedback', 
    icon: Target, 
    color: 'text-purple-500', 
    description: 'Get coding interview assessment' 
  },
  { 
    key: 'complexity', 
    label: 'Complexity Analysis', 
    icon: BarChart3, 
    color: 'text-green-500', 
    description: 'Analyze time and space complexity' 
  },
];

export default function CodeReviewPage() {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<ProgrammingLanguage>('python');
  const [mode, setMode] = useState<CodeReviewMode>('debug');
  const [filename, setFilename] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string>('');
  const [recentReviews, setRecentReviews] = useState<CodeReviewResult[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadRecentReviews();
      loadAnalytics();
    }
  }, [user]);

  const loadRecentReviews = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('code_reviews')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentReviews(data || []);
    } catch (error) {
      console.error('Error loading recent reviews:', error);
    }
  };

  const loadAnalytics = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('coding_analytics')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type and set language
    const extension = file.name.split('.').pop()?.toLowerCase();
    const langMap: Record<string, ProgrammingLanguage> = {
      'java': 'java',
      'py': 'python',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'js': 'javascript',
      'ts': 'typescript',
      'c': 'c',
      'cs': 'csharp',
    };

    if (extension && langMap[extension]) {
      setLanguage(langMap[extension]);
    }

    setFilename(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCode(content);
      toast.success(`File "${file.name}" loaded successfully!`);
    };
    reader.readAsText(file);
  };

  const analyzeCode = async () => {
    if (!code.trim()) {
      toast.error('Please enter some code to analyze');
      return;
    }

    if (!user) {
      toast.error('Please log in to use the code reviewer');
      return;
    }

    setAnalyzing(true);
    setResult('');
    abortRef.current = new AbortController();

    const modeConfig = reviewModes.find(m => m.key === mode)!;
    const langConfig = languages.find(l => l.key === language)!;

    const prompt = `You are an expert ${langConfig.label} developer and coding mentor. Analyze this code in ${mode} mode:

**Code to analyze:**
\`\`\`${language}
${code}
\`\`\`

**Analysis Mode:** ${modeConfig.label} - ${modeConfig.description}

${mode === 'debug' ? `
Please provide:
1. **Syntax Errors**: Any syntax issues found
2. **Logic Errors**: Potential logical problems
3. **Runtime Issues**: Possible runtime errors
4. **Corrected Code**: Fixed version if errors found
5. **Explanation**: Clear explanation of each issue
` : mode === 'explain' ? `
Please provide:
1. **Code Overview**: What this code does
2. **Line-by-Line**: Explain key sections
3. **Concepts Used**: Programming concepts demonstrated
4. **Best Practices**: How it follows or violates best practices
5. **Learning Points**: Key takeaways for understanding
` : mode === 'optimize' ? `
Please provide:
1. **Performance Issues**: Inefficient code sections
2. **Memory Usage**: Memory optimization opportunities
3. **Optimized Code**: Improved version
4. **Optimization Explanation**: Why changes improve performance
5. **Best Practices**: Modern coding standards
` : mode === 'interview' ? `
Please provide:
1. **Problem Understanding**: How well code solves the problem
2. **Solution Approach**: Quality of the approach taken
3. **Code Quality**: Readability, structure, naming
4. **Edge Cases**: How well edge cases are handled
5. **Interview Score**: Rate out of 10 with detailed feedback
6. **Improvement Suggestions**: Specific areas to improve
` : `
Please provide:
1. **Time Complexity**: Big O notation with explanation
2. **Space Complexity**: Memory usage analysis
3. **Complexity Breakdown**: Step-by-step analysis
4. **Optimization Potential**: Can it be improved?
5. **Alternative Approaches**: Better complexity solutions if available
`}

Format your response in clear markdown with proper sections and code blocks. Be encouraging but honest in your feedback.`;

    const contents: GeminiMessage[] = [{ role: 'user', parts: [{ text: prompt }] }];
    let fullResponse = '';

    try {
      await streamGemini(
        contents,
        (chunk) => {
          fullResponse += chunk;
          setResult(fullResponse);
        },
        async () => {
          setAnalyzing(false);
          
          // Award XP and save to database
          const xpAwarded = 25;
          if (user) {
            try {
              await supabase.rpc('increment_xp', { 
                p_user_id: user.id, 
                p_amount: xpAwarded 
              });

              // Save review to database (simplified for demo)
              await supabase.from('code_reviews').insert({
                user_id: user.id,
                original_code: code,
                language,
                mode,
                filename: filename || null,
                analysis_result: fullResponse,
                code_quality_score: Math.floor(Math.random() * 40) + 60, // Mock score
                overall_score: Math.floor(Math.random() * 30) + 70,
                xp_awarded: xpAwarded,
                analysis_time_ms: Date.now(),
              });

              toast.success(`Code analyzed successfully! +${xpAwarded} XP 🎉`);
              loadRecentReviews();
              loadAnalytics();
            } catch (error) {
              console.error('Error saving review:', error);
              toast.success('Code analyzed successfully!');
            }
          }
        },
        (error) => {
          setAnalyzing(false);
          console.error('Analysis error:', error);
          toast.error(`Analysis failed: ${error.message}`);
        },
        'You are an expert code reviewer and programming mentor. Provide detailed, helpful analysis.',
        abortRef.current.signal
      );
    } catch (error) {
      setAnalyzing(false);
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred during analysis');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const clearCode = () => {
    setCode('');
    setResult('');
    setFilename('');
    toast.success('Code cleared');
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-neon-purple flex items-center justify-center">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              AI Code Reviewer
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Debug, optimize, and learn from AI-powered code analysis
            </p>
          </div>

          {analytics && (
            <div className="flex gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-primary">{analytics.total_reviews || 0}</div>
                <div className="text-xs text-muted-foreground">Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-success">{Math.round(analytics.avg_code_quality || 0)}</div>
                <div className="text-xs text-muted-foreground">Avg Score</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-warning">{analytics.coding_streak || 0}</div>
                <div className="text-xs text-muted-foreground">Streak</div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Code Input Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Language and Mode Selection */}
            <Card className="border-border/60">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Analysis Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Programming Language</Label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as ProgrammingLanguage)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    >
                      {languages.map((lang) => (
                        <option key={lang.key} value={lang.key}>
                          {lang.icon} {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Analysis Mode</Label>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value as CodeReviewMode)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    >
                      {reviewModes.map((reviewMode) => (
                        <option key={reviewMode.key} value={reviewMode.key}>
                          {reviewMode.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mode Description */}
                <div className="p-3 rounded-lg bg-accent/20 border border-border/30">
                  <div className="flex items-center gap-2 mb-1">
                    {(() => {
                      const ModeIcon = reviewModes.find(m => m.key === mode)?.icon || Bug;
                      return <ModeIcon className={cn("w-4 h-4", reviewModes.find(m => m.key === mode)?.color)} />;
                    })()}
                    <span className="text-sm font-medium">{reviewModes.find(m => m.key === mode)?.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reviewModes.find(m => m.key === mode)?.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Code Input */}
            <Card className="border-border/60">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-primary" />
                    Code Input
                    {filename && (
                      <Badge variant="secondary" className="ml-2">
                        {filename}
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearCode}
                      disabled={!code}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".java,.py,.cpp,.js,.ts,.c,.cs"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={`Paste your ${languages.find(l => l.key === language)?.label} code here or upload a file...`}
                  className="min-h-[300px] font-mono text-sm"
                />
                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-muted-foreground">
                    {code.length} characters • {code.split('\n').length} lines
                  </div>
                  <Button
                    onClick={analyzeCode}
                    disabled={analyzing || !code.trim()}
                    className="xp-bar border-0 text-white"
                  >
                    {analyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Analyze Code
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Results */}
            {result && (
              <Card className="border-border/60">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      AI Analysis Results
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(result)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-accent/20 rounded-xl p-4 border border-border/30">
                    <Streamdown 
                      parseIncompleteMarkdown 
                      isAnimating={analyzing}
                      className="text-sm [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>pre]:bg-muted [&>pre]:p-3 [&>pre]:rounded-lg [&>pre]:overflow-x-auto"
                    >
                      {result}
                    </Streamdown>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Coding Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-accent/20">
                    <div className="text-lg font-bold text-primary">{analytics?.total_reviews || 0}</div>
                    <div className="text-xs text-muted-foreground">Reviews</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-accent/20">
                    <div className="text-lg font-bold text-success">{analytics?.errors_fixed || 0}</div>
                    <div className="text-xs text-muted-foreground">Bugs Fixed</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-accent/20">
                    <div className="text-lg font-bold text-warning">{analytics?.coding_streak || 0}</div>
                    <div className="text-xs text-muted-foreground">Day Streak</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-accent/20">
                    <div className="text-lg font-bold text-purple-500">{analytics?.total_xp_earned || 0}</div>
                    <div className="text-xs text-muted-foreground">XP Earned</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Reviews */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Recent Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentReviews.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <Code2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No reviews yet</p>
                    <p className="text-xs">Start analyzing code to see history</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentReviews.map((review) => (
                      <div key={review.id} className="p-3 rounded-lg bg-accent/20 border border-border/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {languages.find(l => l.key === review.language)?.icon} {review.language}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {reviewModes.find(m => m.key === review.mode)?.label}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        {review.filename && (
                          <div className="text-xs text-muted-foreground mb-1">
                            📄 {review.filename}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">Score: {review.overall_score}/100</div>
                          <div className="text-xs text-success">+{review.xp_awarded} XP</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  Pro Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                    <p>Upload files directly or paste code for instant analysis</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                    <p>Use Debug mode to find and fix errors quickly</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                    <p>Interview mode gives you coding interview feedback</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                    <p>Earn XP for every code review to level up!</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}