import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AIMentor } from '@/components/mentor/AIMentor';
import {
  LayoutDashboard, FileText, MessageSquare, BookOpen,
  Code2, Trophy, User, Menu, LogOut, Bell,
  ChevronDown, Moon, Sun, Target, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const navItems: Array<{
  icon: React.FC<{ className?: string }>;
  label: string;
  path: string;
  badge?: string;
}> = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Target, label: 'My Roadmap', path: '/roadmap' },
  { icon: FileText, label: 'Resume AI', path: '/resume' },
  { icon: MessageSquare, label: 'Interview AI', path: '/interview' },
  { icon: BookOpen, label: 'Study Planner', path: '/planner' },
  { icon: Code2, label: 'Coding Tracker', path: '/coding' },
  { icon: Sparkles, label: 'AI Code Reviewer', path: '/code-review', badge: 'NEW' },
  { icon: Trophy, label: 'Leaderboard', path: '/leaderboard' },
  { icon: User, label: 'Profile', path: '/profile' },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    const loadUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      setUnreadCount(count || 0);
    };

    loadUnreadCount();
    
    // Set up real-time subscription for notifications
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, 
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

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

  const initials = profile?.username
    ? profile.username.slice(0, 2).toUpperCase()
    : profile?.email?.slice(0, 2).toUpperCase() ?? 'U';

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
          <img src="/images/logo.png.ico" alt="PrepVerse Logo" className="w-8 h-8 rounded-lg object-contain" />
        </div>
        <span className="font-bold text-lg gradient-text">PrepVerse</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'xp-bar text-white shadow-sm'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              {item.badge && !active && (
                <Badge className="ml-auto bg-primary text-white border-0 text-xs py-0 px-2">
                  {item.badge}
                </Badge>
              )}
              {active && <Badge className="ml-auto bg-white/20 text-white border-0 text-xs py-0">●</Badge>}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="xp-bar text-white text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{profile?.username || 'Student'}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.role || 'User'}</p>
          </div>
          <button onClick={handleSignOut} className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-sidebar border-r border-sidebar-border fixed left-0 top-0 h-screen z-30">
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col lg:ml-64">
        {/* Top bar */}
        <header className="h-14 glass border-b border-border/50 flex items-center px-4 md:px-6 gap-3 sticky top-0 z-40">
          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar" aria-label="Navigation">
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Title */}
          <span className="font-semibold flex-1 min-w-0 truncate text-sm md:text-base">
            {navItems.find(n => n.path === location.pathname)?.label ?? 'PrepVerse'}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-accent transition-colors text-foreground hidden md:block">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => navigate('/notifications')} 
              className="p-2 rounded-lg hover:bg-accent transition-colors text-foreground relative"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <Avatar className="h-8 w-8 cursor-pointer" onClick={() => navigate('/profile')}>
              <AvatarFallback className="xp-bar text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
            <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:block" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* AI Mentor Assistant */}
      <AIMentor />
    </div>
  );
}
