import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Streamdown } from 'streamdown';
import { streamGemini, type GeminiMessage } from '@/lib/sse';
import type { ResumeAnalysisResult } from '@/types/types';
import {
  FileText, Upload, Zap, CheckCircle, AlertCircle, Sparkles,
  Flame, Trophy, Eye, Star, TrendingUp, X,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type AnalysisMode = 'roast' | 'hr' | 'mentor';

const modeConfig = {
  roast: {
    label: '🔥 Roast My Resume',
    description: 'Brutal honest feedback with humor',
    icon: Flame,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
  },
  hr: {
    label: '👔 HR Review',
    description: 'Professional corporate perspective',
    icon: Eye,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
  },
  mentor: {
    label: '🧑‍🏫 Friendly Mentor',
    description: 'Encouraging and constructive feedback',
    icon: Star,
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30',
  },
};

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-border" />
          <circle
            cx="50" cy="50" r={r} fill="none" strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            className={color}
            style={{ stroke: 'currentColor', transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">{score}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">{label}</p>
    </div>
  );
}

export default function ResumePage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<AnalysisMode>('mentor');
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [result, setResult] = useState<ResumeAnalysisResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) {
      const f = accepted[0];
      if (f.size > 5 * 1024 * 1024) {
        toast.error('File must be under 5MB');
        return;
      }
      setFile(f);
      setResult(null);
      setStreamText('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/msword': ['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] },
    maxFiles: 1,
  });

  const analyzeResume = async () => {
    if (!file) return;
    setAnalyzing(true);
    setStreamText('');
    setResult(null);

    // Read file as text
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(file);
    });

    const modePrompts = {
      roast: 'You are a brutally honest but funny career coach. Roast this resume like a comedian would while pointing out real problems. Be entertaining but educational.',
      hr: 'You are a senior HR professional from a top tech company. Review this resume from a corporate hiring perspective with professional, direct feedback.',
      mentor: 'You are a supportive career mentor. Give encouraging, constructive feedback that motivates the student while clearly identifying improvements.',
    };

    const prompt = `${modePrompts[mode]}

Analyze this resume and respond with ONLY valid JSON:
{
  "overall_score": <0-100>,
  "ats_score": <0-100>,
  "grammar_score": <0-100>,
  "keyword_score": <0-100>,
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "missing_skills": ["skill1", "skill2", "skill3"],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3", "suggestion4"],
  "roast": "${mode === 'roast' ? 'funny roast line here' : ''}",
  "feedback": "overall feedback paragraph"
}

Resume text:
${text.slice(0, 3000)}`;

    abortRef.current = new AbortController();
    const contents: GeminiMessage[] = [{ role: 'user', parts: [{ text: prompt }] }];
    let full = '';

    await streamGemini(
      contents,
      (chunk) => { full += chunk; setStreamText(full); },
      async () => {
        setStreaming(false);
        setAnalyzing(false);
        try {
          const jsonMatch = full.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed: ResumeAnalysisResult = JSON.parse(jsonMatch[0]);
            setResult(parsed);
            if (user) {
              await supabase.from('resume_analyses').insert({
                user_id: user.id,
                file_name: file.name,
                ats_score: parsed.ats_score,
                analysis_mode: mode,
                analysis_result: parsed,
                raw_text: text.slice(0, 2000),
              });
              await supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: 50 });
              // Update resume score separately
              await supabase.from('user_progress')
                .update({ resume_score: parsed.overall_score })
                .eq('user_id', user.id);
              toast.success('Analysis complete! +50 XP 🎉');
            }
          }
        } catch {
          toast.error('Failed to parse analysis');
        }
      },
      (err) => { setAnalyzing(false); setStreaming(false); toast.error(err.message); },
      undefined,
      abortRef.current.signal
    );
    setStreaming(true);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">AI Resume Analyzer</h1>
          <p className="text-muted-foreground text-sm mt-1">Upload your resume for instant AI-powered feedback</p>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.entries(modeConfig) as [AnalysisMode, typeof modeConfig.mentor][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={cn(
                'rounded-2xl p-4 border-2 text-left transition-all card-hover',
                mode === key ? `${cfg.border} ${cfg.bg}` : 'border-border hover:border-primary/30'
              )}
            >
              <cfg.icon className={`w-5 h-5 mb-2 ${cfg.color}`} />
              <p className="font-semibold text-sm">{cfg.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
            </button>
          ))}
        </div>

        {/* Upload */}
        <Card className="border-border/60">
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
                isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/30'
              )}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-semibold">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-semibold mb-1">Drop your resume here</p>
                  <p className="text-sm text-muted-foreground">PDF, DOC, DOCX or TXT — max 5MB</p>
                </>
              )}
            </div>

            {file && !result && (
              <Button
                className="w-full mt-4 xp-bar border-0 text-white h-11"
                onClick={analyzeResume}
                disabled={analyzing}
              >
                {analyzing ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Analyzing...</>
                ) : (
                  <><Zap className="w-4 h-4 mr-2" /> Analyze Resume</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Streaming raw output */}
        {streaming && !result && streamText && (
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3 text-primary">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span className="text-sm font-semibold">AI is analyzing your resume...</span>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 max-h-48 overflow-y-auto">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{streamText}</pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Score cards */}
            <Card className="border-border/60 bg-gradient-to-br from-primary/5 to-neon-purple/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-warning" /> Resume Score Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap justify-around gap-6">
                  <ScoreRing score={result.overall_score} label="Overall Score" color="text-primary" />
                  <ScoreRing score={result.ats_score} label="ATS Score" color="text-success" />
                  <ScoreRing score={result.grammar_score} label="Grammar" color="text-info" />
                  <ScoreRing score={result.keyword_score} label="Keywords" color="text-warning" />
                </div>
              </CardContent>
            </Card>

            {/* Roast line */}
            {mode === 'roast' && result.roast && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Flame className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-pretty">"{result.roast}"</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Overall feedback */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Overall Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-pretty">{result.feedback}</p>
              </CardContent>
            </Card>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-success/30 bg-success/5 h-full flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-success">
                    <CheckCircle className="w-4 h-4" /> Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-3 h-3 text-success mt-0.5 shrink-0" />
                        <span className="text-pretty">{s}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-destructive/30 bg-destructive/5 h-full flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" /> Areas to Improve
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {result.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertCircle className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
                        <span className="text-pretty">{w}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Missing Skills */}
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-warning" /> Missing Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.missing_skills.map((s, i) => (
                    <Badge key={i} variant="secondary" className="border border-warning/30 text-warning bg-warning/10">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Suggestions */}
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Improvement Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-accent/30">
                      <div className="w-6 h-6 rounded-full xp-bar flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-sm text-pretty">{s}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
