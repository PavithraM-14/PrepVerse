import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { AppLayout } from '@/components/layouts/AppLayout';
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
    persona: 'You are Alex, a friendly but professional HR manager at a top tech company.',
  },
  {
    key: 'technical' as InterviewType,
    label: 'Technical',
    icon: Code2,
    color: 'text-neon-blue',
    bg: 'bg-neon-blue/10',
    border: 'border-neon-blue/30',
    persona: 'You are Dr. Sarah, a senior software engineer conducting a technical interview. Ask about data structures, algorithms, and system design.',
  },
  {
    key: 'behavioral' as InterviewType,
    label: 'Behavioral',
    icon: Brain,
    color: 'text-neon-purple',
    bg: 'bg-neon-purple/10',
    border: 'border-neon-purple/30',
    persona: 'You are Marcus, a team lead who is assessing cultural fit and behavioral competencies using the STAR method.',
  },
  {
    key: 'coding' as InterviewType,
    label: 'Coding',
    icon: TrendingUp,
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30',
    persona: 'You are Jordan, a senior engineer conducting a live coding interview. Ask algorithmic problems, ask the candidate to explain their approach, and provide hints when needed.',
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
    const openingPrompt = `Start the interview with a warm welcome and your first interview question. Keep it natural.`;

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
      typeConfig.persona
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
      typeConfig.persona + ' Continue the interview naturally based on the conversation history. Ask follow-up questions or move to the next topic.',
      abortRef.current.signal
    );
  };

  const getFeedback = async () => {
    if (messages.length < 4) {
      toast.error('Complete at least 2 exchanges before getting feedback');
      return;
    }
    setFeedbackLoading(true);
    setPhase('feedback');

    const transcript = messages.map(m => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`).join('\n\n');
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {interviewTypes.map((t) => (
              <button
                key={t.key}
                onClick={() => startInterview(t.key)}
                className={cn(
                  'rounded-2xl p-6 border-2 text-left transition-all card-hover',
                  `${t.bg} ${t.border}`
                )}
              >
                <t.icon className={`w-8 h-8 mb-3 ${t.color}`} />
                <h3 className="font-bold text-base mb-1">{t.label} Interview</h3>
                <p className="text-sm text-muted-foreground text-pretty">{t.persona.split('.')[0]}.</p>
              </button>
            ))}
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
                {/* Score cards */}
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
                        <div key={s.label} className="text-center">
                          <div className="text-3xl font-extrabold mb-1">{s.score}</div>
                          <div className="text-xs text-muted-foreground mb-2">{s.label}</div>
                          <Progress value={s.score} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

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

                <Button onClick={resetInterview} className="w-full xp-bar border-0 text-white">
                  <RefreshCw className="w-4 h-4 mr-2" /> Start New Interview
                </Button>
              </>
            ) : null}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
