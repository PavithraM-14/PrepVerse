import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
// @ts-ignore
import { supabase } from '@/db/supabase';
import type { UserProgress, Task, PlacementPersona, Notification } from '@/types/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Streamdown } from 'streamdown';
import { streamGemini, type GeminiMessage } from '@/lib/sse';
import {
  Flame, Trophy, Target, CheckCircle, Brain, Zap,
  BookOpen, Code2, FileText, MessageSquare, ArrowRight,
  TrendingUp, Bell, ChevronRight, Star, Users,
} from 'lucide-react';
import { toast } from 'sonner';

function getLevelFromXP(xp: number) {
  return Math.floor(xp / 500) + 1;
}

function getXPForNextLevel(level: number) {
  return level * 500;
}

function getTipOfDay(progress: UserProgress | null) {
  const tips = [
    'Practice at least 2 DSA problems today to maintain your momentum.',
    'Update your resume with recent projects for better ATS scores.',
    'Complete a mock interview to boost your confidence score.',
    'Review weak topics from your placement persona roadmap.',
    'Join the community leaderboard challenge this week!',
  ];
  return tips[(progress?.streak_days ?? 0) % tips.length];
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [persona, setPersona] = useState<PlacementPersona | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiTip, setAiTip] = useState('');
  const [tipLoading, setTipLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Ensure user_progress row exists
      const { data: prog } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!prog) {
        await supabase.from('user_progress').insert({ user_id: user.id });
        const { data: newProg } = await supabase.from('user_progress').select('*').eq('user_id', user.id).maybeSingle();
        setProgress(newProg);
      } else {
        setProgress(prog);
      }

      const [tasksRes, personaRes, notifsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('placement_personas').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('notifications').select('*').eq('user_id', user.id).eq('is_read', false).order('created_at', { ascending: false }).limit(3),
      ]);

      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
      setPersona(personaRes.data);
      setNotifications(Array.isArray(notifsRes.data) ? notifsRes.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (task: Task) => {
    const updated = { is_completed: !task.is_completed, completed_at: !task.is_completed ? new Date().toISOString() : null };
    await supabase.from('tasks').update(updated).eq('id', task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...updated } : t));
    if (!task.is_completed) {
      toast.success(`+${task.xp_reward} XP earned! 🎉`);
      await supabase.rpc('increment_xp', { p_user_id: user?.id, p_amount: task.xp_reward });
      setProgress(prev => prev ? { ...prev, xp_points: prev.xp_points + task.xp_reward } : prev);
    }
  };

  const generateAiTip = async () => {
    setTipLoading(true);
    setAiTip('');
    abortRef.current = new AbortController();
    const contents: GeminiMessage[] = [{
      role: 'user',
      parts: [{
        text: `Give me a single, personalized, motivational tip for today based on: dream company: ${persona?.dream_company || 'top tech companies'}, role: ${persona?.preferred_role || 'software engineer'}, streak: ${progress?.streak_days || 0} days, XP: ${progress?.xp_points || 0}. Keep it under 2 sentences, make it actionable and motivating.`
      }]
    }];
    let full = '';
    await streamGemini(
      contents, (c) => { full += c; setAiTip(full); },
      () => setTipLoading(false),
      (e) => { setTipLoading(false); toast.error(e.message); },
      'You are a placement coach. Give concise, actionable tips.',
      abortRef.current.signal
    );
  };

  const level = getLevelFromXP(progress?.xp_points ?? 0);
  const xpForNext = getXPForNextLevel(level);
  const xpProgress = ((progress?.xp_points ?? 0) % 500 / 500) * 100;
  const completedTasks = tasks.filter(t => t.is_completed).length;

  const quickActions = [
    { icon: FileText, label: 'Analyze Resume', path: '/resume', color: 'text-neon-purple', bg: 'bg-neon-purple/10' },
    { icon: MessageSquare, label: 'Mock Interview', path: '/interview', color: 'text-success', bg: 'bg-success/10' },
    { icon: Code2, label: 'Practice Coding', path: '/coding', color: 'text-warning', bg: 'bg-warning/10' },
    { icon: BookOpen, label: 'Study Plan', path: '/planner', color: 'text-info', bg: 'bg-info/10' },
  ];

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Welcome header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-balance">
              Welcome back, {profile?.username || 'Student'} 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {persona?.dream_company
                ? `On your way to ${persona.dream_company}`
                : 'Ready to conquer your placement journey?'}
            </p>
          </div>
          {!persona && (
            <Button onClick={() => navigate('/onboarding')} className="xp-bar border-0 text-white shrink-0">
              <Brain className="w-4 h-4 mr-2" /> Setup AI Persona
            </Button>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              icon: Flame, label: 'Day Streak', value: loading ? '-' : `${progress?.streak_days ?? 0}`,
              sub: 'days', color: 'text-orange-500', bgClass: 'stats-gradient-1'
            },
            {
              icon: Trophy, label: 'XP Points', value: loading ? '-' : (progress?.xp_points ?? 0).toLocaleString(),
              sub: `Level ${level}`, color: 'text-primary', bgClass: 'stats-gradient-2'
            },
            {
              icon: Target, label: 'Resume Score', value: loading ? '-' : `${progress?.resume_score ?? 0}%`,
              sub: 'ATS optimized', color: 'text-info', bgClass: 'stats-gradient-3'
            },
            {
              icon: Zap, label: 'Interview Ready', value: loading ? '-' : `${progress?.interview_readiness ?? 0}%`,
              sub: 'readiness', color: 'text-success', bgClass: 'stats-gradient-4'
            },
          ].map((s) => (
            <Card key={s.label} className={`card-hover glass border-border/40 ${s.bgClass}`}>
              <CardContent className="p-6">
                {loading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <s.icon className={`w-6 h-6 ${s.color}`} />
                    </div>
                    <p className="text-3xl font-bold mb-1">{s.value}</p>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground/80">{s.sub}</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* XP Progress */}
        <Card className="glass border-border/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                <span className="font-semibold">Level {level} Progress</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {progress?.xp_points ?? 0} / {(level) * 500} XP
              </span>
            </div>
            <Progress value={xpProgress} className="h-4 [&>div]:xp-bar" />
            <p className="text-sm text-muted-foreground mt-2">
              {xpForNext - ((progress?.xp_points ?? 0) % 500)} XP to Level {level + 1}
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions + Tasks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card className="glass border-border/40 h-full flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" /> Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 grid grid-cols-2 gap-4 content-start">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  className={`${a.bg} rounded-2xl p-6 text-left hover:opacity-80 transition-all card-hover flex flex-col gap-3 glass border-border/30`}
                >
                  <a.icon className={`w-6 h-6 ${a.color}`} />
                  <span className="font-medium text-balance">{a.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Today's Tasks */}
          <Card className="glass border-border/40 h-full flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" /> Daily Goals
                </CardTitle>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0">{completedTasks}/{tasks.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="mb-4">No tasks yet.</p>
                  <Button size="sm" variant="outline" className="glass border-border/40" onClick={() => navigate('/planner')}>
                    Create Tasks
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task)}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent/50 cursor-pointer transition-colors glass border-border/30"
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        task.is_completed ? 'bg-success border-success' : 'border-border'
                      }`}>
                        {task.is_completed && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                      <span className={`flex-1 min-w-0 truncate ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </span>
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-0 shrink-0">+{task.xp_reward} XP</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Tip + Notifications */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Daily Tip */}
          <Card className="glass border-border/40 stats-gradient-1">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" /> AI Tip of the Day
                </CardTitle>
                <Button size="sm" variant="ghost" onClick={generateAiTip} disabled={tipLoading} className="hover:bg-primary/10">
                  {tipLoading ? '...' : <TrendingUp className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {aiTip ? (
                <Streamdown parseIncompleteMarkdown isAnimating={tipLoading} className="text-muted-foreground [&>*]:m-0">
                  {aiTip}
                </Streamdown>
              ) : (
                <p className="text-muted-foreground text-pretty">{getTipOfDay(progress)}</p>
              )}
              {!aiTip && (
                <Button size="sm" variant="outline" className="mt-4 glass border-border/40" onClick={generateAiTip} disabled={tipLoading}>
                  Get AI Tip <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="glass border-border/40 h-full flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-warning" /> Notifications
                </CardTitle>
                {notifications.length > 0 && (
                  <Badge className="bg-destructive/10 text-destructive border-0">{notifications.length}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              {notifications.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p>You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div key={n.id} className="flex items-start gap-4 p-3 rounded-xl glass border-border/30">
                      <div className="w-3 h-3 rounded-full bg-primary shrink-0 mt-2" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{n.title}</p>
                        <p className="text-sm text-muted-foreground text-pretty">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Roadmap preview */}
        {persona?.roadmap && (
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-neon-blue" /> Your Roadmap to {persona.dream_company}
                </CardTitle>
                <Button size="sm" variant="ghost" onClick={() => navigate('/onboarding')}>
                  View All <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(persona.roadmap.weekly_goals || []).slice(0, 4).map((goal, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    Week {i + 1}: {goal}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Community teaser */}
        <Card className="glass border-border/40 stats-gradient-2">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Users className="w-10 h-10 text-primary shrink-0" />
              <div>
                <p className="font-semibold">Join the Community Challenge</p>
                <p className="text-sm text-muted-foreground">Compete with 200+ students this week</p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate('/leaderboard')} className="xp-bar border-0 text-white shrink-0">
              Join <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
