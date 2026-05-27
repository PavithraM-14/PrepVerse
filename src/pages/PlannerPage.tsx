import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  const [startTime, setStartTime] = useState('16:00'); // Default to 4:00 PM
  const [sessionLength, setSessionLength] = useState('30'); // Default to 30 min sessions
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
    
    // Convert start time to readable format
    const [startHour, startMinute] = startTime.split(':');
    const startHour12 = parseInt(startHour);
    const startTimeFormatted = `${startHour12 > 12 ? startHour12 - 12 : startHour12 === 0 ? 12 : startHour12}:${startMinute} ${startHour12 >= 12 ? 'PM' : 'AM'}`;
    
    // Process topics - handle both comma-separated and line-separated formats
    const processedTopics = topics 
      ? topics.split(/[,\n]/).map(t => t.trim()).filter(t => t.length > 0)
      : ['DSA', 'aptitude', 'system design'];
    
    const topicsText = processedTopics.join(', ');
    
    const prompt = `Create a realistic study schedule for a placement student with:
- Mood: ${selectedMood} (${moodData.message})
- Total study time: ${hours} hours
- Start time: ${startTimeFormatted}
- Session length: ${sessionLength} minutes each
- Topics to cover: ${topicsText}

CRITICAL REQUIREMENT: You MUST create a study plan that covers ONLY these specific topics: ${topicsText}
Do NOT include any other subjects or topics not listed above.

IMPORTANT: Create a student-friendly schedule with:
- ${sessionLength}-minute focused study sessions
- 15-20 minute breaks between sessions for rest and absorption
- Longer 30-45 minute breaks after every 2-3 sessions for meals/refresh
- Realistic pacing that allows proper learning and retention
- End the day at a reasonable time
- Each study session must focus on one of the specified topics: ${topicsText}

Format as a detailed timeline starting from ${startTimeFormatted}. Include both study sessions and break times.

Example format:
${startTimeFormatted} - [End Time]: Study Session 1 - [Topic from: ${topicsText}]
• Specific learning objectives for this topic
• Practice problems to solve

[Break Time] - [Resume Time]: Break (15 min rest)
• Stretch, hydrate, quick snack

Make the schedule practical for effective learning, not just cramming. Remember: ONLY use the topics specified: ${topicsText}`;

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
            topics: processedTopics,
          });
        }
      },
      (err) => { setAiLoading(false); toast.error(err.message); },
      'You are a smart study planner AI. Create practical, motivating study schedules that strictly follow the user\'s specified topics and requirements. Never deviate from the topics provided by the user.',
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
        <Card className="border-border/60 bg-gradient-to-br from-purple-500/5 via-background to-pink-500/5 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-primary flex items-center justify-center shadow-lg">
                <Brain className="w-4 h-4 text-white" />
              </div>
              How are you feeling today?
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your mood helps us create the perfect study plan for you ✨
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {moods.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setSelectedMood(m.key)}
                  className={cn(
                    'rounded-2xl p-6 border-2 text-center transition-all duration-300 card-hover group relative overflow-hidden',
                    selectedMood === m.key 
                      ? `${m.border} ${m.bg} shadow-xl scale-105 ring-2 ring-primary/20` 
                      : 'border-border/50 hover:border-primary/40 hover:shadow-lg hover:scale-102 bg-gradient-to-br from-background/80 to-accent/20'
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <m.icon className={`w-8 h-8 mx-auto mb-3 transition-all duration-300 group-hover:scale-110 relative z-10 ${m.color}`} />
                  <p className="text-sm font-semibold mb-1 relative z-10">{m.label}</p>
                  <p className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 relative z-10">
                    {m.key === 'motivated' ? 'Ready to conquer!' : 
                     m.key === 'productive' ? 'Steady progress' :
                     m.key === 'stressed' ? 'Take it easy' : 'Light & gentle'}
                  </p>
                </button>
              ))}
            </div>

            {selectedMood && (
              <div className={cn(
                'mt-6 p-4 rounded-2xl border-2 bg-gradient-to-r transition-all duration-500 animate-in slide-in-from-bottom-2',
                moods.find(m => m.key === selectedMood)?.border,
                moods.find(m => m.key === selectedMood)?.bg
              )}>
                <div className="flex items-center gap-3">
                  {(() => {
                    const MoodIcon = moods.find(m => m.key === selectedMood)?.icon || Brain;
                    return <MoodIcon className={cn("w-5 h-5", moods.find(m => m.key === selectedMood)?.color)} />;
                  })()}
                  <p className={cn('text-sm font-medium', moods.find(m => m.key === selectedMood)?.color)}>
                    {moods.find(m => m.key === selectedMood)?.message}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Plan generator */}
        <Card className="border-border/60 bg-gradient-to-br from-background to-accent/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-neon-purple flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              Generate AI Study Plan
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Create a personalized study schedule based on your mood and preferences
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Study Hours Available
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="e.g. 4"
                  className="px-4 py-3 rounded-xl border-border hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
                <p className="text-xs text-muted-foreground">Total hours to study today</p>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Start Time
                </Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="e.g. 16:00"
                  className="px-4 py-3 rounded-xl border-border hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
                <p className="text-xs text-muted-foreground">When do you want to begin studying?</p>
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Session Length
                </Label>
                <select 
                  value={sessionLength} 
                  onChange={(e) => setSessionLength(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-border rounded-xl bg-background hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 cursor-pointer"
                >
                  <option value="30">⚡ 30 min (Quick Focus)</option>
                  <option value="45">🎯 45 min (Focused)</option>
                  <option value="60">📚 1 hour (Standard)</option>
                  <option value="90">🧠 1.5 hours (Deep Dive)</option>
                </select>
                <p className="text-xs text-muted-foreground">Duration per study session</p>
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-medium flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  Topics to Cover
                </Label>
                <Textarea
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  placeholder="Enter topics (one per line or comma separated):&#10;DSA&#10;System Design&#10;SQL&#10;&#10;Or: DSA, System Design, SQL"
                  className="px-4 py-3 rounded-xl border-border hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 min-h-[100px] resize-y"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">Enter topics separated by commas or new lines</p>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                onClick={generateAIPlan}
                disabled={aiLoading || !selectedMood}
                className="w-full xp-bar border-0 text-white py-4 rounded-xl font-medium hover:shadow-lg transition-all duration-200 text-base"
              >
                {aiLoading ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" /> Generating Your Plan...</>
                ) : (
                  <><Sparkles className="w-5 h-5 mr-3" /> Generate My Study Plan</>
                )}
              </Button>

              {/* Fallback button for realistic study schedule */}
              {!aiPlan && !aiLoading && (
                <Button
                  onClick={() => {
                    if (!selectedMood) {
                      toast.error('Please select your mood first');
                      return;
                    }
                    
                    const moodData = moods.find(m => m.key === selectedMood)!;
                    
                    // Convert start time and calculate realistic schedule
                    const [startHour, startMinute] = startTime.split(':');
                    const startHour24 = parseInt(startHour);
                    const startHour12 = startHour24 > 12 ? startHour24 - 12 : startHour24 === 0 ? 12 : startHour24;
                    const startTimeFormatted = `${startHour12}:${startMinute} ${startHour24 >= 12 ? 'PM' : 'AM'}`;
                    
                    // Calculate realistic schedule with breaks
                    const totalMinutes = parseInt(hours) * 60;
                    const sessionMinutes = parseInt(sessionLength);
                    const shortBreak = 15; // 15 min break
                    const longBreak = 30; // 30 min meal break
                    
                    let currentTime = startHour24 * 60 + parseInt(startMinute);
                    let remainingMinutes = totalMinutes;
                    let sessionCount = 0;
                    let schedule = [];
                    
                    while (remainingMinutes > 0) {
                      sessionCount++;
                      
                      // Study session
                      const sessionStart = Math.floor(currentTime / 60);
                      const sessionStartMin = currentTime % 60;
                      const sessionEnd = currentTime + sessionMinutes;
                      const sessionEndHour = Math.floor(sessionEnd / 60);
                      const sessionEndMin = sessionEnd % 60;
                      
                      const startFormat = `${sessionStart > 12 ? sessionStart - 12 : sessionStart === 0 ? 12 : sessionStart}:${sessionStartMin.toString().padStart(2, '0')} ${sessionStart >= 12 ? 'PM' : 'AM'}`;
                      const endFormat = `${sessionEndHour > 12 ? sessionEndHour - 12 : sessionEndHour === 0 ? 12 : sessionEndHour}:${sessionEndMin.toString().padStart(2, '0')} ${sessionEndHour >= 12 ? 'PM' : 'AM'}`;
                      
                      const topics = ['Core Concepts & Theory', 'Practice Problems', 'Advanced Topics', 'Review & Mock Tests', 'System Design', 'Aptitude & Reasoning'];
                      const topicIndex = (sessionCount - 1) % topics.length;
                      
                      schedule.push(`### ${startFormat} - ${endFormat}: Session ${sessionCount} - ${topics[topicIndex]}
- **Focus**: ${topics || 'Data Structures & Algorithms'}
- **Tasks**: 
  - ${sessionCount === 1 ? 'Review fundamental concepts and theory' : 
      sessionCount === 2 ? 'Solve 3-5 practice problems with explanations' :
      sessionCount === 3 ? 'Study advanced patterns and optimization techniques' :
      sessionCount === 4 ? 'Take mock tests and review mistakes' :
      'Practice system design or work on weak areas'}
  - ${sessionCount === 1 ? 'Take detailed notes and create mind maps' :
      sessionCount === 2 ? 'Debug solutions and analyze time complexity' :
      sessionCount === 3 ? 'Implement complex algorithms from scratch' :
      sessionCount === 4 ? 'Analyze performance and identify improvement areas' :
      'Focus on interview-style problem solving'}`);
                      
                      currentTime += sessionMinutes;
                      remainingMinutes -= sessionMinutes;
                      
                      if (remainingMinutes > 0) {
                        // Add break
                        const breakDuration = (sessionCount % 3 === 0) ? longBreak : shortBreak;
                        const breakStart = currentTime;
                        const breakEnd = currentTime + breakDuration;
                        const breakStartHour = Math.floor(breakStart / 60);
                        const breakStartMin = breakStart % 60;
                        const breakEndHour = Math.floor(breakEnd / 60);
                        const breakEndMin = breakEnd % 60;
                        
                        const breakStartFormat = `${breakStartHour > 12 ? breakStartHour - 12 : breakStartHour === 0 ? 12 : breakStartHour}:${breakStartMin.toString().padStart(2, '0')} ${breakStartHour >= 12 ? 'PM' : 'AM'}`;
                        const breakEndFormat = `${breakEndHour > 12 ? breakEndHour - 12 : breakEndHour === 0 ? 12 : breakEndHour}:${breakEndMin.toString().padStart(2, '0')} ${breakEndHour >= 12 ? 'PM' : 'AM'}`;
                        
                        schedule.push(`### ${breakStartFormat} - ${breakEndFormat}: ${breakDuration === longBreak ? 'Meal Break' : 'Rest Break'} (${breakDuration} min)
- **Activities**: 
  - ${breakDuration === longBreak ? 'Have a proper meal and relax' : 'Stretch, hydrate, and rest your eyes'}
  - ${breakDuration === longBreak ? 'Take a short walk or do light exercise' : 'Quick snack if needed'}
  - ${breakDuration === longBreak ? 'Clear your mind and prepare for next session' : 'Review what you just learned mentally'}`);
                        
                        currentTime += breakDuration;
                      }
                    }
                    
                    const fallbackPlan = `# ${moodData.label} Study Schedule (${hours} hours)
**Start Time:** ${startTimeFormatted} | **Session Length:** ${sessionLength} minutes

## Schedule Overview
Based on your ${selectedMood} mood: ${moodData.message}

${schedule.join('\n\n')}

## Study Tips for ${selectedMood} mood:
${moodData.key === 'motivated' ? '- Tackle the hardest problems first while energy is high\n- Set ambitious goals for each session\n- Challenge yourself with advanced topics\n- Use the Pomodoro technique for maximum focus' :
  moodData.key === 'productive' ? '- Focus on consistent, steady progress\n- Break complex topics into smaller chunks\n- Maintain a steady pace throughout\n- Track your progress after each session' :
  moodData.key === 'stressed' ? '- Start with easier, familiar topics to build confidence\n- Take longer breaks if needed\n- Focus on review rather than new concepts\n- Practice relaxation techniques during breaks' :
  '- Keep sessions shorter and lighter than usual\n- Focus on revision and light practice\n- Take plenty of breaks and stay hydrated\n- Don\'t push too hard - rest is important too'}

## Break Guidelines:
- **Short breaks (15 min)**: Stretch, hydrate, rest eyes
- **Long breaks (30 min)**: Proper meal, walk, mental reset
- **Stay consistent**: Stick to the schedule for best results

*This is a student-friendly schedule with realistic pacing for effective learning and retention.*`;
                    
                    setAiPlan(fallbackPlan);
                    toast.success('Realistic study schedule generated! 📚');
                  }}
                  variant="outline"
                  className="w-full py-4 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 font-medium text-base"
                >
                  <Clock className="w-5 h-5 mr-3" /> Generate Realistic Schedule
                </Button>
              )}
            </div>

            {aiPlan && (
              <div className="bg-gradient-to-br from-accent/20 to-primary/5 rounded-2xl p-6 border border-primary/20 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm text-primary">Your Personalized Study Plan</h3>
                </div>
                <Streamdown parseIncompleteMarkdown isAnimating={aiLoading} className="text-sm [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>p]:text-muted-foreground [&>ul]:text-muted-foreground">
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
