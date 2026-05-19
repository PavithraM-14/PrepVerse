import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Streamdown } from 'streamdown';
import { streamGemini, type GeminiMessage } from '@/lib/sse';
import type { RoadmapData } from '@/types/types';
import {
  Brain, Target, ChevronRight, ChevronLeft,
  Sparkles, CheckCircle, Building2, Code2,
  BookOpen, Clock, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const skillLevels = ['Beginner', 'Intermediate', 'Advanced'];
const roles = ['Software Engineer', 'Data Scientist', 'Frontend Developer', 'Backend Developer', 'Full Stack', 'DevOps', 'ML Engineer', 'Product Manager'];
const timelines = ['1 month', '2-3 months', '3-6 months', '6+ months'];
const weakSubjectOptions = ['DSA', 'System Design', 'OS', 'DBMS', 'Networks', 'SQL', 'OOP', 'Aptitude', 'Communication', 'Statistics'];

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [roadmapText, setRoadmapText] = useState('');
  const [roadmapStreaming, setRoadmapStreaming] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [form, setForm] = useState({
    dreamCompany: '',
    skillLevel: '',
    preferredRole: '',
    weakSubjects: [] as string[],
    confidence: 5,
    timeline: '',
  });

  const steps = [
    { label: 'Dream Company', icon: Building2 },
    { label: 'Your Skills', icon: Code2 },
    { label: 'Weak Areas', icon: BookOpen },
    { label: 'Timeline', icon: Clock },
    { label: 'AI Roadmap', icon: Sparkles },
  ];

  const toggleWeak = (s: string) => {
    setForm(prev => ({
      ...prev,
      weakSubjects: prev.weakSubjects.includes(s)
        ? prev.weakSubjects.filter(x => x !== s)
        : [...prev.weakSubjects, s],
    }));
  };

  const canNext = () => {
    if (step === 0) return form.dreamCompany.trim().length > 0;
    if (step === 1) return form.skillLevel && form.preferredRole;
    if (step === 2) return true;
    if (step === 3) return form.timeline.length > 0;
    return true;
  };

  const generateRoadmap = async () => {
    setLoading(true);
    setRoadmapText('');
    setRoadmap(null);
    abortRef.current = new AbortController();

    const prompt = `Create a detailed placement preparation roadmap for a student with:
- Dream Company: ${form.dreamCompany}
- Current Skill Level: ${form.skillLevel}
- Target Role: ${form.preferredRole}
- Weak Subjects: ${form.weakSubjects.join(', ') || 'None specified'}
- Confidence Level: ${form.confidence}/10
- Timeline: ${form.timeline}

Respond ONLY with valid JSON in this exact format:
{
  "phases": [
    {"week": 1, "title": "Foundation Building", "tasks": ["task1", "task2", "task3"], "focus": "topic focus"},
    {"week": 2, "title": "Core Concepts", "tasks": ["task1", "task2", "task3"], "focus": "topic focus"},
    {"week": 3, "title": "Practice Intensification", "tasks": ["task1", "task2", "task3"], "focus": "topic focus"},
    {"week": 4, "title": "Mock & Refine", "tasks": ["task1", "task2", "task3"], "focus": "topic focus"}
  ],
  "daily_tasks": ["daily task 1", "daily task 2", "daily task 3"],
  "weekly_goals": ["week 1 goal", "week 2 goal", "week 3 goal", "week 4 goal"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3", "recommendation 4"]
}`;

    const contents: GeminiMessage[] = [{ role: 'user', parts: [{ text: prompt }] }];
    let full = '';

    await streamGemini(
      contents,
      (chunk) => { full += chunk; setRoadmapText(full); },
      async () => {
        setRoadmapStreaming(false);
        // Parse JSON from response
        let parsedRoadmap: RoadmapData | null = null;
        try {
          const jsonMatch = full.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsedRoadmap = JSON.parse(jsonMatch[0]);
        } catch {
          console.error('Failed to parse roadmap JSON');
        }
        setRoadmap(parsedRoadmap);

        // Save to DB
        if (user) {
          const { error } = await supabase.from('placement_personas').upsert({
            user_id: user.id,
            dream_company: form.dreamCompany,
            current_skill_level: form.skillLevel,
            preferred_role: form.preferredRole,
            weak_subjects: form.weakSubjects,
            confidence_level: form.confidence,
            placement_timeline: form.timeline,
            roadmap: parsedRoadmap,
          }, { onConflict: 'user_id' });

          if (error) {
            // Try insert if upsert fails
            await supabase.from('placement_personas').insert({
              user_id: user.id,
              dream_company: form.dreamCompany,
              current_skill_level: form.skillLevel,
              preferred_role: form.preferredRole,
              weak_subjects: form.weakSubjects,
              confidence_level: form.confidence,
              placement_timeline: form.timeline,
              roadmap: parsedRoadmap,
            });
          }

          // Add XP for completing onboarding
          await supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: 100 });
          toast.success('Roadmap saved! +100 XP 🎉');
        }
        setLoading(false);
      },
      (err) => { setLoading(false); toast.error(err.message); },
      'You are an expert placement coach. Generate a personalized placement preparation roadmap. Always return valid JSON only.',
      abortRef.current.signal
    );
    setRoadmapStreaming(true);
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      if (nextStep === 4) generateRoadmap();
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold gradient-text">AI Placement Persona</h1>
            <span className="text-sm text-muted-foreground">Step {step + 1} of {steps.length}</span>
          </div>
          <Progress value={((step + 1) / steps.length) * 100} className="h-2 [&>div]:xp-bar" />
          <div className="flex justify-between mt-2">
            {steps.map((s, i) => (
              <div key={s.label} className={cn(
                'flex flex-col items-center gap-1 text-xs',
                i <= step ? 'text-primary' : 'text-muted-foreground'
              )}>
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center',
                  i < step ? 'xp-bar text-white' : i === step ? 'border-2 border-primary bg-primary/10 text-primary' : 'border-2 border-border bg-background'
                )}>
                  {i < step ? <CheckCircle className="w-4 h-4" /> : <s.icon className="w-3 h-3" />}
                </div>
                <span className="hidden md:block text-balance text-center w-16">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Card className="border-border/60 min-h-96">
          {/* Step 0: Dream Company */}
          {step === 0 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" /> What's Your Dream Company?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label>Dream Company</Label>
                <Input
                  placeholder="e.g. Google, Amazon, Microsoft, Infosys..."
                  value={form.dreamCompany}
                  onChange={(e) => setForm(p => ({ ...p, dreamCompany: e.target.value }))}
                  className="text-base"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Your roadmap will be tailored specifically for this company's interview process.
                </p>
              </CardContent>
            </>
          )}

          {/* Step 1: Skills */}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-primary" /> Your Current Skills
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="mb-3 block">Skill Level</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {skillLevels.map((s) => (
                      <button
                        key={s}
                        onClick={() => setForm(p => ({ ...p, skillLevel: s }))}
                        className={cn(
                          'rounded-xl p-3 text-sm font-medium border-2 transition-all',
                          form.skillLevel === s
                            ? 'border-primary xp-bar text-white'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-3 block">Preferred Role</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {roles.map((r) => (
                      <button
                        key={r}
                        onClick={() => setForm(p => ({ ...p, preferredRole: r }))}
                        className={cn(
                          'rounded-xl p-2.5 text-sm border-2 transition-all text-left',
                          form.preferredRole === r
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2: Weak Subjects */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-warning" /> What Are Your Weak Areas?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Select topics you want to focus on (optional)</p>
                <div className="flex flex-wrap gap-2">
                  {weakSubjectOptions.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleWeak(s)}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium border-2 transition-all',
                        form.weakSubjects.includes(s)
                          ? 'border-warning bg-warning/10 text-warning'
                          : 'border-border hover:border-warning/50'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <Label className="mb-2 block">Confidence Level: {form.confidence}/10</Label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={form.confidence}
                    onChange={(e) => setForm(p => ({ ...p, confidence: Number(e.target.value) }))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Not confident</span>
                    <span>Very confident</span>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3: Timeline */}
          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-info" /> Your Placement Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">How long do you have to prepare?</p>
                <div className="grid grid-cols-2 gap-3">
                  {timelines.map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm(p => ({ ...p, timeline: t }))}
                      className={cn(
                        'rounded-xl p-4 text-sm font-medium border-2 transition-all',
                        form.timeline === t
                          ? 'border-info bg-info/10 text-info'
                          : 'border-border hover:border-info/50'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </CardContent>
            </>
          )}

          {/* Step 4: AI Roadmap */}
          {step === 4 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" /> Your Personalized Roadmap
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading || roadmapStreaming ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-primary">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Generating your AI roadmap for {form.dreamCompany}...</span>
                    </div>
                    {roadmapText && (
                      <div className="bg-muted/30 rounded-xl p-4 max-h-64 overflow-y-auto">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{roadmapText}</pre>
                      </div>
                    )}
                  </div>
                ) : roadmap ? (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Company', value: form.dreamCompany, icon: Building2 },
                        { label: 'Role', value: form.preferredRole, icon: Target },
                        { label: 'Level', value: form.skillLevel, icon: TrendingUp },
                        { label: 'Timeline', value: form.timeline, icon: Clock },
                      ].map((s) => (
                        <div key={s.label} className="bg-accent/30 rounded-xl p-3 text-center">
                          <s.icon className="w-4 h-4 mx-auto mb-1 text-primary" />
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                          <p className="text-sm font-semibold truncate">{s.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Weekly goals */}
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">Weekly Goals</h3>
                      <div className="space-y-2">
                        {(roadmap.weekly_goals || []).map((g, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Badge className="xp-bar border-0 text-white text-xs w-16 justify-center shrink-0">
                              Week {i + 1}
                            </Badge>
                            <span className="text-sm text-pretty">{g}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">AI Recommendations</h3>
                      <div className="space-y-2">
                        {(roadmap.recommendations || []).map((r, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Sparkles className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                            <p className="text-sm text-muted-foreground text-pretty">{r}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      className="w-full xp-bar border-0 text-white"
                      onClick={() => navigate('/dashboard')}
                    >
                      Go to Dashboard <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Generating roadmap...</p>
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>

        {/* Navigation */}
        {step < 4 && (
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canNext()}
              className="xp-bar border-0 text-white"
            >
              {step === 3 ? 'Generate Roadmap' : 'Next'} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
