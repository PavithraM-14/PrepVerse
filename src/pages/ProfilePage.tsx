import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import type { UserProgress } from '@/types/types';
import {
  User, Trophy, Flame, Zap, Star, Settings,
  LogOut, Moon, Sun, Shield, Bell, CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

function getLevelFromXP(xp: number) { return Math.floor(xp / 500) + 1; }

const defaultBadges = [
  { id: '1', name: 'First Steps', icon: '👣', description: 'Completed first task', earned_at: new Date().toISOString() },
  { id: '2', name: 'Code Warrior', icon: '⚔️', description: 'Solved 10 problems', earned_at: new Date().toISOString() },
  { id: '3', name: 'Resume Pro', icon: '📄', description: 'Analyzed first resume', earned_at: new Date().toISOString() },
];

export default function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [username, setUsername] = useState(profile?.username || '');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadProgress();
    setUsername(profile?.username || '');
    setFullName(profile?.full_name || '');
  }, [user, profile]);

  const loadProgress = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_progress').select('*').eq('user_id', user.id).maybeSingle();
    setProgress(data);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      username: username.trim() || null,
      full_name: fullName.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      await refreshProfile();
      toast.success('Profile updated!');
    }
  };

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    toast.success('Signed out successfully');
  };

  const level = getLevelFromXP(progress?.xp_points ?? 0);
  const xpProgress = ((progress?.xp_points ?? 0) % 500 / 500) * 100;
  const initials = profile?.username
    ? profile.username.slice(0, 2).toUpperCase()
    : profile?.email?.slice(0, 2).toUpperCase() ?? 'U';
  const badges = (progress?.badges as typeof defaultBadges) || defaultBadges;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Profile & Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
        </div>

        {/* Profile card */}
        <Card className="border-border/60 bg-gradient-to-br from-primary/5 to-neon-purple/5">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarFallback className="xp-bar text-white text-2xl font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full xp-bar flex items-center justify-center text-white text-xs font-bold border-2 border-background">
                  {level}
                </div>
              </div>

              <div className="flex-1 min-w-0 text-center md:text-left">
                <h2 className="text-xl font-bold">{profile?.username || 'Student'}</h2>
                <p className="text-muted-foreground text-sm">{profile?.email || ''}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                  <Badge className="bg-warning/10 text-warning border-warning/30">
                    <Flame className="w-3 h-3 mr-1" />{progress?.streak_days || 0} Day Streak
                  </Badge>
                  <Badge className="bg-primary/10 text-primary border-primary/30">
                    <Zap className="w-3 h-3 mr-1" />{progress?.xp_points?.toLocaleString() || 0} XP
                  </Badge>
                  <Badge className="bg-success/10 text-success border-success/30">
                    <Trophy className="w-3 h-3 mr-1" />Level {level}
                  </Badge>
                </div>

                <div className="mt-4 max-w-xs mx-auto md:mx-0">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Level {level}</span>
                    <span>{progress?.xp_points ?? 0} / {level * 500} XP</span>
                  </div>
                  <Progress value={xpProgress} className="h-2 [&>div]:xp-bar" />
                  <p className="text-xs text-muted-foreground mt-1">{level * 500 - (progress?.xp_points ?? 0) % 500} XP to Level {level + 1}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Tasks Completed', value: progress?.total_tasks_completed ?? 0, icon: CheckCircle, color: 'text-success' },
            { label: 'Study Hours', value: `${progress?.total_study_hours ?? 0}h`, icon: Star, color: 'text-neon-blue' },
            { label: 'Resume Score', value: `${progress?.resume_score ?? 0}%`, icon: User, color: 'text-warning' },
            { label: 'Interview Ready', value: `${progress?.interview_readiness ?? 0}%`, icon: Shield, color: 'text-neon-purple' },
          ].map((s) => (
            <Card key={s.label} className="border-border/60">
              <CardContent className="p-4 text-center">
                <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Badges */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-warning" /> Badges Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {badges.map((b) => (
                <div key={b.id} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-accent/30 w-24">
                  <span className="text-2xl">{b.icon}</span>
                  <span className="text-xs font-semibold text-center text-balance">{b.name}</span>
                </div>
              ))}
              {badges.length === 0 && (
                <p className="text-sm text-muted-foreground">Complete tasks to earn badges!</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit profile */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" /> Edit Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your_username" />
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="xp-bar border-0 text-white">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" /> Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <div>
                  <p className="text-sm font-medium">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Toggle the app theme</p>
                </div>
              </div>
              <Switch checked={isDark} onCheckedChange={toggleTheme} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4" />
                <div>
                  <p className="text-sm font-medium">Notifications</p>
                  <p className="text-xs text-muted-foreground">Daily reminders and alerts</p>
                </div>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
          </CardContent>
        </Card>

        {/* Sign out */}
        <Button variant="outline" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </AppLayout>
  );
}
