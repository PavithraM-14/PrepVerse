import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { streamGemini, type GeminiMessage } from '@/lib/sse';
import { Streamdown } from 'streamdown';
import type { CodingProblem, QuizAttempt, QuizAnswer } from '@/types/types';
import {
  Code2, Plus, CheckCircle, Clock, TrendingUp,
  Brain, Zap, Trophy, Target, RefreshCw, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const dsaTopics = ['Arrays', 'Linked List', 'Trees', 'Graphs', 'DP', 'Sorting', 'Binary Search', 'Hashing', 'Stack/Queue', 'Recursion'];
const platforms = ['LeetCode', 'HackerRank', 'Codeforces', 'GeeksforGeeks', 'CodeChef'];
const difficulties = ['Easy', 'Medium', 'Hard'];

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export default function CodingPage() {
  const { user } = useAuth();
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizTopic, setQuizTopic] = useState('Arrays');
  const [quizDiff, setQuizDiff] = useState('Easy');
  const [quizText, setQuizText] = useState('');
  const [newProblem, setNewProblem] = useState({ name: '', platform: 'LeetCode', difficulty: 'Easy', topic: 'Arrays' });
  const [addingProblem, setAddingProblem] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!user) return;
    loadProblems();
  }, [user]);

  const loadProblems = async () => {
    if (!user) return;
    try {
      // Try to load from coding_problems table first
      let { data, error } = await supabase.from('coding_problems').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
      
      // If table doesn't exist, try loading from tasks with coding category
      if (error && error.message.includes('relation "public.coding_problems" does not exist')) {
        console.log('coding_problems table not found, loading from tasks instead');
        const tasksResult = await supabase.from('tasks').select('*').eq('user_id', user.id).eq('category', 'coding').order('created_at', { ascending: false }).limit(50);
        
        if (tasksResult.error) {
          console.error('Error loading tasks:', tasksResult.error);
          toast.error(`Failed to load problems: ${tasksResult.error.message}`);
          return;
        }
        
        // Convert tasks to coding problem format
        const codingProblems = (tasksResult.data || []).map(task => {
          // Try to parse the title to extract platform and problem name
          const titleMatch = task.title.match(/^([^:]+):\s*(.+?)\s*\(([^)]+)\)$/);
          return {
            id: task.id,
            user_id: task.user_id,
            problem_name: titleMatch ? titleMatch[2] : task.title,
            platform: titleMatch ? titleMatch[1] : 'Unknown',
            difficulty: titleMatch ? titleMatch[3] : 'Medium',
            topic: task.description?.replace('Topic: ', '') || 'General',
            status: task.is_completed ? 'solved' : 'todo' as const,
            notes: null,
            solved_at: task.completed_at,
            created_at: task.created_at,
          };
        });
        
        setProblems(codingProblems);
        return;
      }
      
      if (error) {
        console.error('Error loading problems:', error);
        toast.error(`Failed to load problems: ${error.message}`);
        return;
      }
      
      setProblems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Unexpected error loading problems:', err);
      toast.error(`Failed to load problems: ${err.message || 'Unknown error'}`);
    }
  };

  const addProblem = async () => {
    if (!newProblem.name.trim() || !user) {
      toast.error('Please enter a problem name');
      return;
    }
    
    console.log('Adding problem:', {
      user_id: user.id,
      problem_name: newProblem.name.trim(),
      platform: newProblem.platform,
      difficulty: newProblem.difficulty,
      topic: newProblem.topic,
      status: 'todo',
    });
    
    setAddingProblem(true);
    try {
      // Try coding_problems table first
      let { data, error } = await supabase.from('coding_problems').insert({
        user_id: user.id,
        problem_name: newProblem.name.trim(),
        platform: newProblem.platform,
        difficulty: newProblem.difficulty,
        topic: newProblem.topic,
        status: 'todo',
      }).select().maybeSingle();
      
      // If coding_problems table doesn't exist, try creating a task instead
      if (error && error.message.includes('relation "public.coding_problems" does not exist')) {
        console.log('coding_problems table not found, creating as task instead');
        const taskResult = await supabase.from('tasks').insert({
          user_id: user.id,
          title: `${newProblem.platform}: ${newProblem.name.trim()} (${newProblem.difficulty})`,
          description: `Topic: ${newProblem.topic}`,
          category: 'coding',
          xp_reward: newProblem.difficulty === 'Easy' ? 15 : newProblem.difficulty === 'Medium' ? 25 : 35,
        }).select().maybeSingle();
        
        if (taskResult.error) {
          throw taskResult.error;
        }
        
        // Convert task to coding problem format for display
        if (taskResult.data) {
          const codingProblem = {
            id: taskResult.data.id,
            user_id: taskResult.data.user_id,
            problem_name: newProblem.name.trim(),
            platform: newProblem.platform,
            difficulty: newProblem.difficulty,
            topic: newProblem.topic,
            status: 'todo' as const,
            notes: null,
            solved_at: null,
            created_at: taskResult.data.created_at,
          };
          
          setProblems(prev => [codingProblem, ...prev]);
          setNewProblem(p => ({ ...p, name: '' }));
          toast.success('Problem added successfully! (Note: Please run the database setup script to create the proper coding_problems table)');
          setAddingProblem(false);
          return;
        }
      }
      
      if (error) {
        console.error('Error adding problem:', error);
        toast.error(`Failed to add problem: ${error.message}`);
        setAddingProblem(false);
        return;
      }
      
      if (data) {
        setProblems(prev => [data, ...prev]);
        setNewProblem(p => ({ ...p, name: '' }));
        toast.success('Problem added successfully!');
      } else {
        toast.error('No data returned after adding problem');
      }
    } catch (err: any) {
      console.error('Unexpected error adding problem:', err);
      toast.error(`Failed to add problem: ${err.message || 'Unknown error'}`);
    } finally {
      setAddingProblem(false);
    }
  };

  const updateStatus = async (id: string, status: 'todo' | 'in_progress' | 'solved') => {
    try {
      // Try updating in coding_problems table first
      let { error } = await supabase.from('coding_problems').update({
        status,
        solved_at: status === 'solved' ? new Date().toISOString() : null,
      }).eq('id', id);
      
      // If table doesn't exist, try updating in tasks table
      if (error && error.message.includes('relation "public.coding_problems" does not exist')) {
        console.log('coding_problems table not found, updating task instead');
        const taskUpdate = await supabase.from('tasks').update({
          is_completed: status === 'solved',
          completed_at: status === 'solved' ? new Date().toISOString() : null,
        }).eq('id', id);
        
        if (taskUpdate.error) {
          console.error('Error updating task:', taskUpdate.error);
          toast.error(`Failed to update status: ${taskUpdate.error.message}`);
          return;
        }
      } else if (error) {
        console.error('Error updating problem status:', error);
        toast.error(`Failed to update status: ${error.message}`);
        return;
      }
      
      // Update local state
      setProblems(prev => prev.map(p => p.id === id ? { 
        ...p, 
        status, 
        solved_at: status === 'solved' ? new Date().toISOString() : null 
      } : p));
      
      if (status === 'solved') {
        toast.success('+20 XP! Problem solved! 🎉');
        if (user) await supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: 20 });
      }
    } catch (err: any) {
      console.error('Unexpected error updating status:', err);
      toast.error(`Failed to update status: ${err.message || 'Unknown error'}`);
    }
  };

  const generateQuiz = async () => {
    setQuizLoading(true);
    setQuiz([]);
    setQuizAnswers([]);
    setQuizSubmitted(false);
    setQuizText('');
    abortRef.current = new AbortController();

    const prompt = `Generate 5 multiple choice aptitude/coding questions on topic: ${quizTopic}, difficulty: ${quizDiff}.
Return ONLY valid JSON array:
[
  {
    "question": "question text",
    "options": ["A", "B", "C", "D"],
    "correct": 0,
    "explanation": "why this is correct"
  }
]
The "correct" field is the 0-based index of the correct option.`;

    const contents: GeminiMessage[] = [{ role: 'user', parts: [{ text: prompt }] }];
    let full = '';

    await streamGemini(
      contents,
      (c) => { full += c; setQuizText(full); },
      () => {
        setQuizLoading(false);
        try {
          const jsonMatch = full.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed: QuizQuestion[] = JSON.parse(jsonMatch[0]);
            setQuiz(parsed);
            setQuizAnswers(new Array(parsed.length).fill(-1));
            setQuizText('');
          }
        } catch {
          toast.error('Failed to parse quiz questions');
        }
      },
      (err) => { setQuizLoading(false); toast.error(err.message); },
      'You are a technical quiz generator. Generate valid JSON quiz questions only.',
      abortRef.current.signal
    );
  };

  const submitQuiz = async () => {
    if (quizAnswers.includes(-1)) { toast.error('Please answer all questions'); return; }
    setQuizSubmitted(true);
    const score = quizAnswers.filter((a, i) => a === quiz[i].correct).length;
    const xpEarned = score * 10;
    toast.success(`Score: ${score}/${quiz.length} — +${xpEarned} XP!`);
    if (user) {
      await supabase.from('quiz_attempts').insert({
        user_id: user.id,
        quiz_type: 'aptitude',
        topic: quizTopic,
        difficulty: quizDiff,
        score,
        total_questions: quiz.length,
        xp_earned: xpEarned,
      });
      if (xpEarned > 0) await supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: xpEarned });
    }
  };

  const solved = problems.filter(p => p.status === 'solved').length;
  const inProgress = problems.filter(p => p.status === 'in_progress').length;
  const byDiff: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0 };
  problems.filter(p => p.status === 'solved').forEach(p => { if (p.difficulty in byDiff) byDiff[p.difficulty]++; });

  const statusColors: Record<string, string> = {
    todo: 'text-muted-foreground',
    in_progress: 'text-warning',
    solved: 'text-success',
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Coding Tracker</h1>
          <p className="text-muted-foreground text-sm mt-1">Track DSA problems, take quizzes, build consistency</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Solved', value: solved, icon: CheckCircle, color: 'text-success', bg: 'from-green-500/10' },
            { label: 'In Progress', value: inProgress, icon: Clock, color: 'text-warning', bg: 'from-orange-500/10' },
            { label: 'Total Added', value: problems.length, icon: Target, color: 'text-neon-blue', bg: 'from-blue-500/10' },
            { label: 'Easy Solved', value: byDiff.Easy, icon: Trophy, color: 'text-neon-purple', bg: 'from-purple-500/10' },
          ].map((s) => (
            <Card key={s.label} className={`bg-gradient-to-br ${s.bg} to-transparent border-border/60`}>
              <CardContent className="p-4">
                <s.icon className={`w-5 h-5 mb-2 ${s.color}`} />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="tracker">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="tracker">DSA Tracker</TabsTrigger>
            <TabsTrigger value="quiz">Aptitude Quiz</TabsTrigger>
          </TabsList>

          {/* DSA Tracker */}
          <TabsContent value="tracker" className="space-y-4">
            {/* Add form */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" /> Add Problem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <Input
                    placeholder="Problem name (e.g. Two Sum)"
                    value={newProblem.name}
                    onChange={(e) => setNewProblem(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addProblem()}
                    className="md:col-span-2"
                  />
                  <Select value={newProblem.platform} onValueChange={(v) => setNewProblem(p => ({ ...p, platform: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{platforms.map(pl => <SelectItem key={pl} value={pl}>{pl}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={newProblem.difficulty} onValueChange={(v) => setNewProblem(p => ({ ...p, difficulty: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{difficulties.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button onClick={addProblem} disabled={addingProblem} className="xp-bar border-0 text-white">
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {dsaTopics.map(t => (
                    <button
                      key={t}
                      onClick={() => setNewProblem(p => ({ ...p, topic: t }))}
                      className={cn('px-3 py-1 rounded-full text-xs border transition-all', newProblem.topic === t ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50')}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Problems list */}
            <Card className="border-border/60">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Problem</th>
                        <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Platform</th>
                        <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Topic</th>
                        <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Difficulty</th>
                        <th className="text-left p-4 text-xs font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {problems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                            <Code2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            No problems yet. Add your first one!
                          </td>
                        </tr>
                      ) : (
                        problems.map((p) => (
                          <tr key={p.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                            <td className="p-4 font-medium text-sm">{p.problem_name}</td>
                            <td className="p-4 text-sm text-muted-foreground">{p.platform}</td>
                            <td className="p-4"><Badge variant="secondary" className="text-xs">{p.topic}</Badge></td>
                            <td className="p-4">
                              <Badge className={cn('text-xs border', {
                                'bg-success/10 text-success border-success/30': p.difficulty === 'Easy',
                                'bg-warning/10 text-warning border-warning/30': p.difficulty === 'Medium',
                                'bg-destructive/10 text-destructive border-destructive/30': p.difficulty === 'Hard',
                              })}>{p.difficulty}</Badge>
                            </td>
                            <td className="p-4">
                              <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v as 'todo' | 'in_progress' | 'solved')}>
                                <SelectTrigger className={cn('w-32 h-8 text-xs', statusColors[p.status])}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="todo">To Do</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="solved">Solved ✓</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quiz */}
          <TabsContent value="quiz" className="space-y-4">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" /> Generate Quiz
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 mb-4">
                  <Select value={quizTopic} onValueChange={setQuizTopic}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{dsaTopics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={quizDiff} onValueChange={setQuizDiff}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{difficulties.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button onClick={generateQuiz} disabled={quizLoading} className="xp-bar border-0 text-white">
                    {quizLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                    Generate Quiz
                  </Button>
                </div>

                {quizLoading && quizText && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Generating {quizDiff} questions on {quizTopic}...
                  </div>
                )}
              </CardContent>
            </Card>

            {quiz.length > 0 && (
              <div className="space-y-4">
                {quiz.map((q, qi) => (
                  <Card key={qi} className={cn('border-border/60', quizSubmitted && (quizAnswers[qi] === q.correct ? 'border-success/40 bg-success/5' : 'border-destructive/40 bg-destructive/5'))}>
                    <CardContent className="p-5">
                      <p className="font-semibold text-sm mb-4">Q{qi + 1}. {q.question}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {q.options.map((opt, oi) => (
                          <button
                            key={oi}
                            onClick={() => !quizSubmitted && setQuizAnswers(prev => { const n = [...prev]; n[qi] = oi; return n; })}
                            className={cn(
                              'rounded-xl p-3 text-sm text-left border-2 transition-all',
                              quizSubmitted
                                ? oi === q.correct
                                  ? 'border-success bg-success/10 text-success font-semibold'
                                  : oi === quizAnswers[qi] && oi !== q.correct
                                    ? 'border-destructive bg-destructive/10 text-destructive'
                                    : 'border-border opacity-50'
                                : quizAnswers[qi] === oi
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border hover:border-primary/50'
                            )}
                          >
                            {String.fromCharCode(65 + oi)}. {opt}
                          </button>
                        ))}
                      </div>
                      {quizSubmitted && (
                        <div className="mt-3 p-3 rounded-xl bg-accent/30 text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">Explanation: </span>{q.explanation}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {!quizSubmitted ? (
                  <Button onClick={submitQuiz} className="w-full xp-bar border-0 text-white h-11">
                    Submit Quiz <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <div className="flex gap-3">
                    <Card className="flex-1 border-border/60">
                      <CardContent className="p-4 text-center">
                        <Trophy className="w-6 h-6 text-warning mx-auto mb-1" />
                        <p className="text-2xl font-bold">
                          {quizAnswers.filter((a, i) => a === quiz[i].correct).length}/{quiz.length}
                        </p>
                        <p className="text-xs text-muted-foreground">Correct Answers</p>
                      </CardContent>
                    </Card>
                    <Button variant="outline" onClick={generateQuiz} className="shrink-0 h-auto">
                      <RefreshCw className="w-4 h-4 mr-1" /> New Quiz
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
