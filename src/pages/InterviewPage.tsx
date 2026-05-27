import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { VoiceInterviewModal } from '@/components/VoiceInterviewModal';
import { CodingInterviewModal } from '@/components/CodingInterviewModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Streamdown } from 'streamdown';
import { streamGemini, type GeminiMessage } from '@/lib/sse';
import type { InterviewMessage, InterviewFeedback } from '@/types/types';
import {
  MessageSquare, Send, Bot, User, Trophy, Zap,
  Brain, Code2, Users, TrendingUp, Star, RefreshCw,
  Video, Mic, Volume2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type InterviewType = 'hr' | 'technical' | 'behavioral' | 'coding';

const interviewTypes = [
  {
    key: 'hr' as InterviewType,
    label: 'HR Round',
    icon: Users,
    color: 'text-info',
    bg: 'bg-info/10',
    border: 'border-info/30',
    persona: 'Sarah Chen - Friendly HR Manager focusing on cultural fit and soft skills',
  },
  {
    key: 'technical' as InterviewType,
    label: 'Technical',
    icon: Code2,
    color: 'text-neon-blue',
    bg: 'bg-neon-blue/10',
    border: 'border-neon-blue/30',
    persona: 'Dr. Alex Kumar - Senior Software Engineer with deep technical expertise',
  },
  {
    key: 'behavioral' as InterviewType,
    label: 'Behavioral',
    icon: Brain,
    color: 'text-neon-purple',
    bg: 'bg-neon-purple/10',
    border: 'border-neon-purple/30',
    persona: 'Maria Rodriguez - Team Lead using STAR method for behavioral assessment',
  },
  {
    key: 'coding' as InterviewType,
    label: 'Coding',
    icon: TrendingUp,
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30',
    persona: 'Jordan Kim - Senior Engineer conducting live coding challenges',
  },
  {
    key: 'startup' as InterviewType,
    label: 'Startup',
    icon: Zap,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    persona: 'Jake Thompson - Startup Founder looking for adaptability and growth mindset',
  },
  {
    key: 'faang' as InterviewType,
    label: 'FAANG',
    icon: Star,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    persona: 'Dr. Jennifer Liu - Principal Engineer with rigorous standards',
  },
];

export default function InterviewPage() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<InterviewType | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [phase, setPhase] = useState<'select' | 'interview' | 'feedback'>('select');
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [codingModalOpen, setCodingModalOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  const startInterview = async (type: InterviewType) => {
    setSelectedType(type);
    setMessages([]);
    setFeedback(null);
    setPhase('interview');

    const typeConfig = interviewTypes.find(t => t.key === type)!;
    const openingPrompt = `You are conducting a ${type} interview. Start by introducing yourself with your name and role, then ask the candidate for their name in a warm, professional manner. Do not ask any interview questions yet - just introduce yourself and get their name first.`;

    const contents: GeminiMessage[] = [{ role: 'user', parts: [{ text: openingPrompt }] }];
    let full = '';
    setStreamText('');
    setStreaming(true);

    await streamGemini(
      contents,
      (c) => { full += c; setStreamText(full); },
      async () => {
        setStreaming(false);
        const msg: InterviewMessage = { role: 'interviewer', content: full, timestamp: new Date().toISOString() };
        setMessages([msg]);
        setStreamText('');

        if (user) {
          const { data } = await supabase.from('interview_sessions').insert({
            user_id: user.id,
            interview_type: type,
            messages: [msg],
            status: 'active',
          }).select('id').maybeSingle();
          if (data?.id) setSessionId(data.id);
        }
      },
      (err) => { setStreaming(false); toast.error(err.message); },
      `You are an experienced ${type} interviewer. Introduce yourself professionally and ask for the candidate's name before starting the actual interview.`
    );
  };

  const sendMessage = async () => {
    if (!input.trim() || streaming || !selectedType) return;
    const userText = input.trim();
    setInput('');

    const userMsg: InterviewMessage = { role: 'candidate', content: userText, timestamp: new Date().toISOString() };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);

    const typeConfig = interviewTypes.find(t => t.key === selectedType)!;

    // Build history
    const history: GeminiMessage[] = updatedMsgs.slice(-10).map(m => ({
      role: m.role === 'interviewer' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    setStreaming(true);
    setStreamText('');
    abortRef.current = new AbortController();
    let full = '';

    await streamGemini(
      history,
      (c) => { full += c; setStreamText(full); },
      async () => {
        setStreaming(false);
        const aiMsg: InterviewMessage = { role: 'interviewer', content: full, timestamp: new Date().toISOString() };
        const newMsgs = [...updatedMsgs, aiMsg];
        setMessages(newMsgs);
        setStreamText('');

        if (sessionId) {
          await supabase.from('interview_sessions').update({ messages: newMsgs }).eq('id', sessionId);
        }
      },
      (err) => { setStreaming(false); toast.error(err.message); },
      typeConfig.persona + ` ${updatedMsgs.length === 2 ? 'The candidate just provided their name. Thank them and now ask the first actual interview question relevant to the interview type.' : 'Continue the interview naturally based on the conversation history. Ask follow-up questions or move to the next topic.'}`,
      abortRef.current.signal
    );
  };

  const getFeedback = async () => {
    if (messages.length < 6) {
      toast.error('Complete at least 2 interview questions before getting feedback');
      return;
    }
    setFeedbackLoading(true);
    setPhase('feedback');

    // Skip the introduction exchange for analysis
    const interviewMessages = messages.slice(2); // Skip first AI intro and first user name response
    const transcript = interviewMessages.map(m => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`).join('\n\n');
    const prompt = `Analyze this ${selectedType} interview transcript and provide feedback. Return ONLY valid JSON:
{
  "overall_score": <0-100>,
  "confidence_score": <0-100>,
  "communication_score": <0-100>,
  "technical_score": <0-100>,
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "summary": "overall feedback paragraph"
}

Transcript:
${transcript}`;

    abortRef.current = new AbortController();
    const contents: GeminiMessage[] = [{ role: 'user', parts: [{ text: prompt }] }];
    let full = '';

    await streamGemini(
      contents,
      (c) => { full += c; },
      async () => {
        setFeedbackLoading(false);
        try {
          const jsonMatch = full.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed: InterviewFeedback = JSON.parse(jsonMatch[0]);
            setFeedback(parsed);
            if (user && sessionId) {
              await supabase.from('interview_sessions').update({
                feedback: parsed,
                confidence_score: parsed.confidence_score,
                status: 'completed',
                completed_at: new Date().toISOString(),
              }).eq('id', sessionId);
              await supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: 75 });
              // Update interview readiness score separately
              await supabase.from('user_progress')
                .update({ interview_readiness: parsed.overall_score })
                .eq('user_id', user.id);
              toast.success('Interview feedback saved! +75 XP 🎉');
            }
          }
        } catch {
          toast.error('Failed to parse feedback');
          setFeedbackLoading(false);
        }
      },
      (err) => { setFeedbackLoading(false); toast.error(err.message); },
      undefined,
      abortRef.current.signal
    );
  };

  const resetInterview = () => {
    setSelectedType(null);
    setMessages([]);
    setFeedback(null);
    setSessionId(null);
    setPhase('select');
  };

  const handleVoiceInterviewComplete = async (voiceFeedback: InterviewFeedback) => {
    setFeedback(voiceFeedback);
    setPhase('feedback');
    
    // Save voice interview session to database
    if (user && selectedType) {
      const { data } = await supabase.from('interview_sessions').insert({
        user_id: user.id,
        interview_type: selectedType,
        messages: [], // Voice interviews don't have text messages
        feedback: voiceFeedback,
        confidence_score: voiceFeedback.confidence_score,
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).select('id').maybeSingle();
      
      if (data?.id) {
        await supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: 100 }); // Higher XP for voice interviews
        await supabase.from('user_progress')
          .update({ interview_readiness: voiceFeedback.overall_score })
          .eq('user_id', user.id);
        toast.success('Video interview completed! +100 XP 🎉');
      }
    }
  };

  const handleCodingInterviewComplete = async (codingFeedback: InterviewFeedback) => {
    setFeedback(codingFeedback);
    setPhase('feedback');
    
    // Save coding interview session to database
    if (user) {
      const { data } = await supabase.from('interview_sessions').insert({
        user_id: user.id,
        interview_type: 'coding',
        messages: [], // Coding interviews don't have text messages
        feedback: codingFeedback,
        confidence_score: codingFeedback.overall_score, // Use overall score for coding
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).select('id').maybeSingle();
      
      if (data?.id) {
        await supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: 150 }); // Highest XP for coding interviews
        await supabase.from('user_progress')
          .update({ interview_readiness: codingFeedback.overall_score })
          .eq('user_id', user.id);
        toast.success('Coding interview completed! +150 XP 🎉');
      }
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">AI Interview Simulator</h1>
            <p className="text-muted-foreground text-sm mt-1">Practice with realistic AI interviewers</p>
          </div>
          {phase !== 'select' && (
            <Button variant="outline" size="sm" onClick={resetInterview}>
              <RefreshCw className="w-4 h-4 mr-1" /> New Session
            </Button>
          )}
        </div>

        {/* Select Type */}
        {phase === 'select' && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold gradient-text">Choose Your Interview Experience</h2>
              <p className="text-muted-foreground text-lg">Practice with AI interviewers from top companies</p>
              
              {/* Feature Highlights */}
              <div className="flex flex-wrap justify-center gap-4 mt-6">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30 px-3 py-1">
                  <Video className="w-3 h-3 mr-1" />
                  Live Video + Voice
                </Badge>
                <Badge variant="secondary" className="bg-success/10 text-success border-success/30 px-3 py-1">
                  <Brain className="w-3 h-3 mr-1" />
                  Real-time Analysis
                </Badge>
                <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/30 px-3 py-1">
                  <Zap className="w-3 h-3 mr-1" />
                  Adaptive AI
                </Badge>
                <Badge variant="secondary" className="bg-info/10 text-info border-info/30 px-3 py-1">
                  <Award className="w-3 h-3 mr-1" />
                  Detailed Feedback
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {interviewTypes.map((t) => (
                <Card key={t.key} className={cn(
                  'border-2 transition-all duration-300 card-hover group relative overflow-hidden',
                  `${t.border} hover:shadow-lg hover:shadow-${t.color.split('-')[1]}/20`
                )}>
                  {/* Background Gradient */}
                  <div className={cn('absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity', t.bg)} />
                  
                  <CardHeader className="pb-4 relative">
                    <div className="flex items-start gap-4">
                      <div className={cn('p-3 rounded-xl', t.bg, 'border', t.border)}>
                        <t.icon className={`w-6 h-6 ${t.color}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{t.label} Interview</CardTitle>
                        <p className="text-sm text-muted-foreground leading-relaxed">{t.persona}</p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 relative">
                    {t.key === 'coding' ? (
                      <Button
                        onClick={() => setCodingModalOpen(true)}
                        className="w-full h-11 bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 text-white font-medium"
                      >
                        <Code2 className="w-4 h-4 mr-2" />
                        Start Coding Challenge
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        {/* Video Interview - Primary Option */}
                        <Button
                          onClick={() => {
                            setSelectedType(t.key);
                            setVoiceModalOpen(true);
                          }}
                          className={cn(
                            'w-full h-11 font-medium transition-all duration-200',
                            'bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white'
                          )}
                        >
                          <Video className="w-4 h-4 mr-2" />
                          AI Video Interview
                        </Button>
                        
                        {/* Text Chat - Secondary Option */}
                        <Button
                          onClick={() => startInterview(t.key)}
                          variant="outline"
                          className="w-full h-10 border-gray-300 hover:bg-gray-50 text-gray-700"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Text Chat Mode
                        </Button>
                      </div>
                    )}
                    
                    {/* Interview Features */}
                    <div className="mt-4 pt-3 border-t border-border/50">
                      <div className="flex flex-wrap gap-2">
                        {t.key !== 'coding' && (
                          <>
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              <Mic className="w-2 h-2 mr-1" />
                              Voice Analysis
                            </Badge>
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              <Eye className="w-2 h-2 mr-1" />
                              Behavioral Tracking
                            </Badge>
                          </>
                        )}
                        {t.key === 'coding' && (
                          <>
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              <Brain className="w-2 h-2 mr-1" />
                              13 Languages
                            </Badge>
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              <TrendingUp className="w-2 h-2 mr-1" />
                              Live Coding
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Additional Info */}
            <div className="text-center space-y-4 pt-8 border-t border-border/30">
              <h3 className="text-lg font-semibold">What makes our AI interviews special?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Camera className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-medium">Real-time Video Analysis</h4>
                  <p className="text-sm text-muted-foreground">AI analyzes your body language, eye contact, and confidence in real-time</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                    <Volume2 className="w-6 h-6 text-success" />
                  </div>
                  <h4 className="font-medium">Voice & Speech Analysis</h4>
                  <p className="text-sm text-muted-foreground">Advanced voice analysis for pace, clarity, and confidence scoring</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6 text-warning" />
                  </div>
                  <h4 className="font-medium">Adaptive AI Interviewer</h4>
                  <p className="text-sm text-muted-foreground">AI adapts questions based on your responses and interview performance</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interview Chat */}
        {phase === 'interview' && selectedType && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {(() => {
                const tc = interviewTypes.find(t => t.key === selectedType)!;
                return <Badge className={`${tc.bg} ${tc.color} border border-current/30`}>{tc.label} Interview</Badge>;
              })()}
              <Button size="sm" onClick={getFeedback} className="ml-auto xp-bar border-0 text-white">
                <Star className="w-4 h-4 mr-1" /> Get Feedback
              </Button>
            </div>

            <Card className="border-border/60">
              <CardContent className="p-0">
                {/* Messages */}
                <div className="h-96 overflow-y-auto p-4 space-y-4">
                  {messages.map((m, i) => (
                    <div key={i} className={cn('flex gap-3', m.role === 'candidate' ? 'justify-end' : 'justify-start')}>
                      {m.role === 'interviewer' && (
                        <div className="w-8 h-8 rounded-full xp-bar flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                        m.role === 'candidate'
                          ? 'xp-bar text-white rounded-tr-sm'
                          : 'bg-secondary text-secondary-foreground rounded-tl-sm'
                      )}>
                        {m.role === 'interviewer' ? (
                          <Streamdown parseIncompleteMarkdown isAnimating={false} className="text-sm [&>*]:m-0">
                            {m.content}
                          </Streamdown>
                        ) : m.content}
                      </div>
                      {m.role === 'candidate' && (
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}

                  {streaming && streamText && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full xp-bar flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm bg-secondary text-secondary-foreground">
                        <Streamdown parseIncompleteMarkdown isAnimating={streaming} className="text-sm [&>*]:m-0">
                          {streamText}
                        </Streamdown>
                      </div>
                    </div>
                  )}

                  {streaming && !streamText && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full xp-bar flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-secondary">
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="border-t border-border p-3 flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Type your answer..."
                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-0"
                    disabled={streaming}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={streaming || !input.trim()}
                    className="xp-bar border-0 text-white h-10 px-4 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Feedback */}
        {phase === 'feedback' && (
          <div className="space-y-6">
            {feedbackLoading ? (
              <Card className="border-border/60">
                <CardContent className="p-8 text-center">
                  <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Analyzing your performance...</p>
                </CardContent>
              </Card>
            ) : feedback ? (
              <>
                {/* Coding Analysis (if available) */}
                {(feedback as any).coding_analysis && (
                  <>
                    {/* Main Coding Score */}
                    <Card className="border-border/60 bg-gradient-to-br from-success/5 to-neon-blue/5">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Code2 className="w-5 h-5 text-success" /> Coding Interview Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center mb-6">
                          <div className="text-6xl font-extrabold text-success mb-2 tabular-nums">{feedback.overall_score}%</div>
                          <div className="text-lg text-muted-foreground">Overall Coding Score</div>
                          <Progress value={feedback.overall_score} className="h-3 mt-3" />
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { label: 'Problem Solving', score: (feedback as any).coding_analysis.problem_solving_score, color: 'bg-success' },
                            { label: 'Code Quality', score: (feedback as any).coding_analysis.code_quality_score, color: 'bg-neon-blue' },
                            { label: 'Algorithm Efficiency', score: (feedback as any).coding_analysis.algorithm_efficiency_score, color: 'bg-warning' },
                            { label: 'Completion Rate', score: (feedback as any).coding_analysis.completion_rate, color: 'bg-neon-purple' },
                          ].map((s) => (
                            <div key={s.label} className="text-center min-w-0">
                              <div className="text-2xl font-bold mb-1 tabular-nums">{s.score}%</div>
                              <div className="text-xs text-muted-foreground mb-2 leading-tight">{s.label}</div>
                              <Progress value={s.score} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Regular Interview Scores (if not coding) */}
                {!(feedback as any).coding_analysis && (
                  <Card className="border-border/60 bg-gradient-to-br from-primary/5 to-neon-purple/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-warning" /> Interview Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'Overall', score: feedback.overall_score, color: 'bg-primary' },
                          { label: 'Confidence', score: feedback.confidence_score, color: 'bg-neon-purple' },
                          { label: 'Communication', score: feedback.communication_score, color: 'bg-success' },
                          { label: 'Technical', score: feedback.technical_score, color: 'bg-warning' },
                        ].map((s) => (
                          <div key={s.label} className="text-center min-w-0">
                            <div className="text-3xl font-extrabold mb-1 tabular-nums">{s.score}%</div>
                            <div className="text-xs text-muted-foreground mb-2 leading-tight">{s.label}</div>
                            <Progress value={s.score} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Behavioral Analysis (if available) */}
                {feedback.behavioral_analysis && (
                  <Card className="border-purple-500/30 bg-purple-500/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-purple-500" /> Behavioral Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'Eye Contact', score: feedback.behavioral_analysis.eye_contact_score, color: 'bg-purple-500' },
                          { label: 'Professionalism', score: feedback.behavioral_analysis.professionalism_score, color: 'bg-blue-500' },
                          { label: 'Response Timing', score: feedback.behavioral_analysis.response_timing_score, color: 'bg-green-500' },
                          { label: 'Composure', score: feedback.behavioral_analysis.composure_score, color: 'bg-orange-500' },
                        ].map((s) => (
                          <div key={s.label} className="text-center min-w-0">
                            <div className="text-2xl font-bold mb-1 tabular-nums">{s.score}%</div>
                            <div className="text-xs text-muted-foreground mb-2 leading-tight">{s.label}</div>
                            <Progress value={s.score} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Interview Duration & Stats */}
                {feedback.interview_duration && (
                  <Card className="border-border/60 bg-gradient-to-br from-gray-500/5 to-slate-500/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-500" /> Interview Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-primary">{feedback.interview_duration}m</div>
                          <div className="text-sm text-muted-foreground">Duration</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-success">{feedback.conversation_transcript?.length || 0}</div>
                          <div className="text-sm text-muted-foreground">Exchanges</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-warning">{feedback.interview_readiness || feedback.overall_score}%</div>
                          <div className="text-sm text-muted-foreground">Readiness</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-info">{feedback.interviewer_info?.name || 'AI'}</div>
                          <div className="text-sm text-muted-foreground">Interviewer</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {/* Voice Analysis (only for video interviews) */}
                {feedback.voice_analysis && !(feedback as any).coding_analysis && (
                  <Card className="border-border/60 bg-gradient-to-br from-neon-blue/5 to-primary/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mic className="w-5 h-5 text-neon-blue" /> Voice Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'Pace', score: feedback.voice_analysis.pace_score, color: 'bg-neon-blue' },
                          { label: 'Clarity', score: feedback.voice_analysis.clarity_score, color: 'bg-success' },
                          { label: 'Volume', score: feedback.voice_analysis.volume_score, color: 'bg-warning' },
                          { label: 'Voice Confidence', score: feedback.voice_analysis.confidence_score, color: 'bg-neon-purple' },
                        ].map((s) => (
                          <div key={s.label} className="text-center min-w-0">
                            <div className="text-2xl font-bold mb-1 tabular-nums">{s.score}%</div>
                            <div className="text-xs text-muted-foreground mb-2 leading-tight">{s.label}</div>
                            <Progress value={s.score} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-border/60">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" /> Summary</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground text-pretty">{feedback.summary}</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-success/30 bg-success/5 h-full flex flex-col">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-success flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <ul className="space-y-2">
                        {feedback.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Star className="w-3 h-3 text-success mt-0.5 shrink-0" />
                            <span className="text-pretty">{s}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-warning/30 bg-warning/5 h-full flex flex-col">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-warning flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Improvements
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <ul className="space-y-2">
                        {feedback.improvements.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Brain className="w-3 h-3 text-warning mt-0.5 shrink-0" />
                            <span className="text-pretty">{s}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Voice Feedback (if available) */}
                {feedback.voice_feedback && feedback.voice_feedback.length > 0 && (
                  <Card className="border-neon-blue/30 bg-neon-blue/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-neon-blue flex items-center gap-2">
                        <Mic className="w-4 h-4" /> Voice Communication Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {feedback.voice_feedback.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Volume2 className="w-3 h-3 text-neon-blue mt-0.5 shrink-0" />
                            <span className="text-pretty">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Behavioral Feedback (if available) */}
                {feedback.behavioral_feedback && feedback.behavioral_feedback.length > 0 && (
                  <Card className="border-purple-500/30 bg-purple-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-purple-500 flex items-center gap-2">
                        <Eye className="w-4 h-4" /> Behavioral Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {feedback.behavioral_feedback.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Users className="w-3 h-3 text-purple-500 mt-0.5 shrink-0" />
                            <span className="text-pretty">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Personalized Roadmap (if available) */}
                {feedback.personalized_roadmap && feedback.personalized_roadmap.length > 0 && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-primary flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Your Improvement Roadmap
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {feedback.personalized_roadmap.map((action, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-primary">{i + 1}</span>
                            </div>
                            <span className="text-pretty">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Next Steps (if available) */}
                {feedback.next_steps && feedback.next_steps.length > 0 && (
                  <Card className="border-success/30 bg-success/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-success flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Immediate Next Steps
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {feedback.next_steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ArrowRight className="w-3 h-3 text-success mt-0.5 shrink-0" />
                            <span className="text-pretty">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Coding Feedback (if available) */}
                {(feedback as any).coding_feedback && (feedback as any).coding_feedback.length > 0 && (
                  <Card className="border-success/30 bg-success/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-success flex items-center gap-2">
                        <Code2 className="w-4 h-4" />
                        Coding Performance Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {(feedback as any).coding_feedback.map((tip: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <TrendingUp className="w-3 h-3 text-success mt-0.5 shrink-0" />
                            <span className="text-pretty">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Button onClick={resetInterview} className="w-full xp-bar border-0 text-white">
                  <RefreshCw className="w-4 h-4 mr-2" /> Start New Interview
                </Button>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Voice Interview Modal */}
      <VoiceInterviewModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        interviewType={selectedType || 'hr'}
        onComplete={handleVoiceInterviewComplete}
      />

      {/* Coding Interview Modal */}
      <CodingInterviewModal
        isOpen={codingModalOpen}
        onClose={() => setCodingModalOpen(false)}
        onComplete={handleCodingInterviewComplete}
      />
    </AppLayout>
  );
}
