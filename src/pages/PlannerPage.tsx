import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Streamdown } from 'streamdown';
import { streamGemini, type GeminiMessage } from '@/lib/sse';
import type { Task, Mood } from '@/types/types';
import {
  BookOpen, Plus, CheckCircle, Trash2, Sparkles,
  Zap, Brain, Battery, Rocket, Coffee, Calendar, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const moods: { key: Mood; label: string; icon: React.FC<{ className?: string }>; color: string; bg: string; border: string; message: string }[] = [
  { key: 'motivated', label: 'Motivated', icon: Rocket, color: 'text-success', bg: 'bg-success/10', border: 'border-success/40', message: 'You\'re on fire! Let\'s tackle the hardest topics today.' },
  { key: 'productive', label: 'Productive', icon: Zap, color: 'text-neon-blue', bg: 'bg-neon-blue/10', border: 'border-neon-blue/40', message: 'Great mindset! Let\'s make meaningful progress.' },
  { key: 'stressed', label: 'Stressed', icon: Brain, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/40', message: 'Take it easy. Lighter topics and small wins today.' },
  { key: 'tired', label: 'Tired', icon: Coffee, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', message: 'Rest is important. Light revision only — you deserve a break.' },
];

export default function PlannerPage() {
  const { user } = useAuth();
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [aiPlan, setAiPlan] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [hours, setHours] = useState('4');
  const [topics, setTopics] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!user) return;
    loadTasks();
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setTasks(Array.isArray(data) ? data : []);
  };

  const addTask = async () => {
    if (!newTask.trim() || !user) {
      toast.error('Please enter a task');
      return;
    }
    
    setLoading(true);
    
    try {
      // Start with basic task data that definitely exists in the table
      const taskData: any = {
        user_id: user.id,
        title: newTask.trim(),
        category: 'study',
        is_completed: false,
        xp_reward: 15,
      };

      // Try to add reminder_time only if both date and time are provided
      // and handle it gracefully if the column doesn't exist
      let hasReminder = false;
      if (newTaskDate && newTaskTime) {
        try {
          taskData.reminder_time = new Date(`${newTaskDate}T${newTaskTime}`).toISOString();
          hasReminder = true;
        } catch (dateError) {
          console.log('Date parsing error, skipping reminder:', dateError);
        }
      }

      const { data, error } = await supabase.from('tasks').insert(taskData).select().maybeSingle();

      if (error) {
        console.error('Error adding task:', error);
        
        // If it's a column error, try without reminder_time
        if (error.message.includes('reminder_time') || error.message.includes('column')) {
          console.log('Retrying without reminder_time column...');
          
          const basicTaskData = {
            user_id: user.id,
            title: newTask.trim(),
            category: 'study',
            is_completed: false,
            xp_reward: 15,
          };
          
          const { data: retryData, error: retryError } = await supabase
            .from('tasks')
            .insert(basicTaskData)
            .select()
            .maybeSingle();
          
          if (retryError) {
            throw retryError;
          }
          
          if (retryData) {
            setTasks(prev => [retryData, ...prev]);
            setNewTask('');
            setNewTaskDate('');
            setNewTaskTime('');
            toast.success('Task added successfully! (Reminders not available) ✅');
            setLoading(false);
            return;
          }
        }
        
        // If tasks table doesn't exist, create a simple local task
        if (error.message.includes('does not exist') || error.code === '42P01') {
          const mockTask = {
            id: Date.now().toString(),
            user_id: user.id,
            title: newTask.trim(),
            description: null,
            category: 'study',
            is_completed: false,
            due_date: null,
            reminder_time: hasReminder ? taskData.reminder_time : null,
            notification_sent: false,
            xp_reward: 15,
            created_at: new Date().toISOString(),
            completed_at: null,
          };
          
          setTasks(prev => [mockTask, ...prev]);
          setNewTask('');
          setNewTaskDate('');
          setNewTaskTime('');
          
          toast.success('Task added locally! (Database setup needed for persistence) 📝');
          setLoading(false);
          return;
        }
        
        toast.error(`Failed to add task: ${error.message}`);
        setLoading(false);
        return;
      }
      
      if (data) {
        setTasks(prev => [data, ...prev]);
        setNewTask('');
        setNewTaskDate('');
        setNewTaskTime('');
        
        if (hasReminder) {
          toast.success('Task added with reminder! 🔔');
        } else {
          toast.success('Task added successfully! ✅');
        }
      } else {
        toast.error('Failed to add task - no data returned');
      }
    } catch (err) {
      console.error('Unexpected error adding task:', err);
      
      // Fallback: create local task
      const mockTask = {
        id: Date.now().toString(),
        user_id: user.id,
        title: newTask.trim(),
        description: null,
        category: 'study',
        is_completed: false,
        due_date: null,
        reminder_time: (newTaskDate && newTaskTime) ? new Date(`${newTaskDate}T${newTaskTime}`).toISOString() : null,
        notification_sent: false,
        xp_reward: 15,
        created_at: new Date().toISOString(),
        completed_at: null,
      };
      
      setTasks(prev => [mockTask, ...prev]);
      setNewTask('');
      setNewTaskDate('');
      setNewTaskTime('');
      
      toast.success('Task added locally! (Database setup needed for persistence) 📝');
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (task: Task) => {
    const updated = { is_completed: !task.is_completed, completed_at: !task.is_completed ? new Date().toISOString() : null };
    await supabase.from('tasks').update(updated).eq('id', task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...updated } : t));
    if (!task.is_completed) toast.success(`+${task.xp_reward} XP!`);
    if (!task.is_completed && user) {
      await supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: task.xp_reward });
    }
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const generateAIPlan = async () => {
    if (!selectedMood) { toast.error('Please select your mood first'); return; }
    setAiLoading(true);
    setAiPlan('');
    abortRef.current = new AbortController();

    const moodData = moods.find(m => m.key === selectedMood)!;
    const prompt = `Create a smart daily study plan for a placement student with:
- Mood: ${selectedMood} (${moodData.message})
- Available study hours: ${hours} hours
- Topics to cover: ${topics || 'DSA, aptitude, system design'}

Create a structured hourly schedule with specific tasks. Be concise and practical. Format as a clear schedule.`;

    const contents: GeminiMessage[] = [{ role: 'user', parts: [{ text: prompt }] }];
    let full = '';
    await streamGemini(
      contents,
      (c) => { full += c; setAiPlan(full); },
      async () => {
        setAiLoading(false);
        // Parse tasks from AI and add them
        if (user) {
          await supabase.from('study_sessions').insert({
            user_id: user.id,
            mood: selectedMood,
            hours_studied: parseFloat(hours) || 0,
            topics: topics ? topics.split(',').map(t => t.trim()) : [],
          });
        }
      },
      (err) => { setAiLoading(false); toast.error(err.message); },
      'You are a smart study planner AI. Create practical, motivating study schedules.',
      abortRef.current.signal
    );
  };

  const todayTasks = tasks.filter(t => {
    const created = new Date(t.created_at);
    const today = new Date();
    return created.toDateString() === today.toDateString();
  });
  const completed = tasks.filter(t => t.is_completed).length;
  const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Smart Study Planner</h1>
          <p className="text-muted-foreground text-sm mt-1">Adaptive study plans powered by AI</p>
        </div>

        {/* Mood selector */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" /> How are you feeling today?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {moods.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setSelectedMood(m.key)}
                  className={cn(
                    'rounded-2xl p-4 border-2 text-center transition-all card-hover',
                    selectedMood === m.key ? `${m.border} ${m.bg}` : 'border-border hover:border-primary/30'
                  )}
                >
                  <m.icon className={`w-7 h-7 mx-auto mb-2 ${m.color}`} />
                  <p className="text-sm font-semibold">{m.label}</p>
                </button>
              ))}
            </div>

            {selectedMood && (
              <div className={cn(
                'mt-4 p-3 rounded-xl border',
                moods.find(m => m.key === selectedMood)?.border,
                moods.find(m => m.key === selectedMood)?.bg
              )}>
                <p className={cn('text-sm font-medium', moods.find(m => m.key === selectedMood)?.color)}>
                  {moods.find(m => m.key === selectedMood)?.message}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Plan generator */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Generate AI Study Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Study Hours Available</Label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="e.g. 4"
                />
              </div>
              <div className="space-y-2">
                <Label>Topics to Cover</Label>
                <Input
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  placeholder="e.g. DSA, System Design, SQL"
                />
              </div>
            </div>

            <Button
              onClick={generateAIPlan}
              disabled={aiLoading || !selectedMood}
              className="w-full xp-bar border-0 text-white"
            >
              {aiLoading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Generating Plan...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Generate My Study Plan</>
              )}
            </Button>

            {aiPlan && (
              <div className="bg-accent/30 rounded-xl p-4 border border-border/50">
                <Streamdown parseIncompleteMarkdown isAnimating={aiLoading} className="text-sm [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm">
                  {aiPlan}
                </Streamdown>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Add task */}
          <Card className="border-border/60 h-full flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Add Task
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTask()}
                    placeholder="e.g. Solve 5 LeetCode problems"
                    className="flex-1"
                  />
                  <Button 
                    onClick={addTask} 
                    disabled={loading || !newTask.trim()} 
                    className="xp-bar border-0 text-white bg-purple-600 hover:bg-purple-700 font-bold px-4"
                    style={{ minWidth: '60px', minHeight: '40px' }}
                    title={loading ? "Adding task..." : !newTask.trim() ? "Enter a task first" : "Add task"}
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" /> Add Task
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Note about database setup */}
                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                  💡 If you're getting column errors, the database schema might need to refresh. Try refreshing the page or check the database setup.
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
                <span>{completed}/{tasks.length} completed</span>
                <span>{completionRate}% done</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full xp-bar rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Task list */}
          <Card className="border-border/60 h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" /> Your Tasks
                </CardTitle>
                <Badge variant="secondary">{tasks.length} total</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto min-h-0">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No tasks yet. Add one above!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/30 group transition-colors">
                      <button
                        onClick={() => toggleTask(task)}
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                          task.is_completed ? 'bg-success border-success' : 'border-border hover:border-success'
                        )}
                      >
                        {task.is_completed && <CheckCircle className="w-3 h-3 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className={cn('text-sm block truncate', task.is_completed && 'line-through text-muted-foreground')}>
                          {task.title}
                        </span>
                        {task.reminder_time && (
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(task.reminder_time).toLocaleDateString()} at {new Date(task.reminder_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">+{task.xp_reward}</Badge>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
