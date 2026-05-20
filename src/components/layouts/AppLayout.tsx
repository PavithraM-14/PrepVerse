import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
// @ts-ignore
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Streamdown } from 'streamdown';
import { streamGemini, type GeminiMessage } from '@/lib/sse';
import {
  LayoutDashboard, FileText, MessageSquare, BookOpen,
  Code2, Trophy, User, Menu, X, LogOut, Bell, Send,
  Bot, ChevronDown, Moon, Sun, Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Target, label: 'My Roadmap', path: '/roadmap' },
  { icon: FileText, label: 'Resume AI', path: '/resume' },
  { icon: MessageSquare, label: 'Interview AI', path: '/interview' },
  { icon: BookOpen, label: 'Study Planner', path: '/planner' },
  { icon: Code2, label: 'Coding Tracker', path: '/coding' },
  { icon: Trophy, label: 'Leaderboard', path: '/leaderboard' },
  { icon: User, label: 'Profile', path: '/profile' },
];

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: '👋 Hi! I\'m Vera, your AI placement assistant. Ask me anything about interviews, coding, resumes, or study strategies!' }
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setStreaming(true);
    setStreamText('');

    const history: GeminiMessage[] = messages.slice(-6).map(m => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));
    history.push({ role: 'user', parts: [{ text: userMsg }] });

    abortRef.current = new AbortController();
    let full = '';
    await streamGemini(
      history,
      (chunk) => { full += chunk; setStreamText(full); },
      () => {
        setStreaming(false);
        setMessages(prev => [...prev, { role: 'model', content: full }]);
        setStreamText('');
      },
      (err) => {
        setStreaming(false);
        toast.error('AI error: ' + err.message);
      },
      'You are Vera, a friendly and knowledgeable AI placement assistant for PrepVerse. Help students with placement preparation, coding interviews, resume building, and career advice. Be concise and encouraging.',
      abortRef.current.signal
    );
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full xp-bar shadow-lg neon-glow flex items-center justify-center transition-transform',
          open && 'scale-95'
        )}
      >
        {open ? <X className="w-6 h-6 text-white" /> : <Bot className="w-6 h-6 text-white" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 md:w-96 rounded-2xl glass-strong border border-border/60 shadow-hover flex flex-col overflow-hidden"
          style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 xp-bar">
            <Bot className="w-5 h-5 text-white" />
            <div>
              <p className="font-semibold text-sm text-white">Vera — AI Assistant</p>
              <p className="text-xs text-white/70">Placement & Career Coach</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                  m.role === 'user'
                    ? 'xp-bar text-white rounded-tr-sm'
                    : 'bg-secondary text-secondary-foreground rounded-tl-sm'
                )}>
                  {m.role === 'model' ? (
                    <Streamdown parseIncompleteMarkdown isAnimating={false} className="text-sm [&>*]:m-0">
                      {m.content}
                    </Streamdown>
                  ) : m.content}
                </div>
              </div>
            ))}
            {streaming && streamText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-3 py-2 text-sm bg-secondary text-secondary-foreground">
                  <Streamdown parseIncompleteMarkdown isAnimating={streaming} className="text-sm [&>*]:m-0">
                    {streamText}
                  </Streamdown>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 p-3 border-t border-border/50">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask Vera anything..."
              className="flex-1 bg-background/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-0"
            />
            <Button size="icon" onClick={send} disabled={streaming || !input.trim()} className="xp-bar border-0 text-white h-9 w-9 shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

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
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
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

      {/* AI Chatbot */}
      <AIChatbot />
    </div>
  );
}
