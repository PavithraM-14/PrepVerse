import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Brain,
  FileText,
  Code2,
  MessageSquare,
  Trophy,
  BookOpen,
  Target,
  ArrowRight,
  Star,
  Users,
  CheckCircle,
  Flame,
  Moon,
  Sun,
  ChevronRight,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const features = [
  {
    icon: Brain,
    title: 'AI Placement Persona',
    description: 'Get a personalized roadmap tailored to your dream company, skill level, and timeline.',
    color: 'text-neon-blue',
    gradient: 'from-blue-500/10 to-purple-500/10',
  },
  {
    icon: FileText,
    title: 'AI Resume Analyzer',
    description: 'Boost your ATS score with AI-powered resume analysis, keyword optimization, and feedback.',
    color: 'text-neon-purple',
    gradient: 'from-purple-500/10 to-pink-500/10',
  },
  {
    icon: MessageSquare,
    title: 'AI Interview Simulator',
    description: 'Practice with realistic HR, technical, behavioral, and coding interview simulations.',
    color: 'text-success',
    gradient: 'from-green-500/10 to-emerald-500/10',
  },
  {
    icon: Code2,
    title: 'Coding Tracker',
    description: 'Track DSA problems, monitor your coding progress, and tackle daily challenges.',
    color: 'text-warning',
    gradient: 'from-orange-500/10 to-yellow-500/10',
  },
  {
    icon: BookOpen,
    title: 'Smart Study Planner',
    description: 'Mood-adaptive study schedules that adjust difficulty and tasks based on how you feel.',
    color: 'text-info',
    gradient: 'from-sky-500/10 to-cyan-500/10',
  },
  {
    icon: Trophy,
    title: 'Gamification & XP',
    description: 'Earn XP, unlock badges, maintain streaks, and compete on the leaderboard.',
    color: 'text-warning',
    gradient: 'from-yellow-500/10 to-orange-500/10',
  },
];

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'SWE at Google',
    content: 'PrepVerse\'s AI mock interviews gave me the confidence to crack my Google interview. The feedback was incredibly detailed!',
    avatar: 'PS',
    rating: 5,
  },
  {
    name: 'Arjun Mehta',
    role: 'Intern at Amazon',
    content: 'The personalized roadmap was spot on. I went from zero DSA knowledge to landing an Amazon internship in 3 months.',
    avatar: 'AM',
    rating: 5,
  },
  {
    name: 'Sneha Patel',
    role: 'SDE at Microsoft',
    content: 'The resume analyzer boosted my ATS score from 42 to 91! Got callbacks from companies I only dreamed of.',
    avatar: 'SP',
    rating: 5,
  },
];

const stats = [
  { label: 'Students Placed', value: 50000, suffix: '+' },
  { label: 'Mock Interviews', value: 200000, suffix: '+' },
  { label: 'Resumes Analyzed', value: 100000, suffix: '+' },
  { label: 'Success Rate', value: 94, suffix: '%' },
];

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let start = 0;
          const duration = 2000;
          const step = target / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );
  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
  };
  return (
    <button onClick={toggle} className="p-2 rounded-lg hover:bg-accent transition-colors text-foreground">
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center xp-bar">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">PrepVerse</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Reviews</a>
            <a href="#stats" className="hover:text-foreground transition-colors">Results</a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <Button onClick={() => navigate('/dashboard')} size="sm" className="xp-bar border-0 text-white">
                Dashboard <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
                <Button size="sm" onClick={() => navigate('/login')} className="xp-bar border-0 text-white hidden md:inline-flex">
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 md:px-6 relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl z-0"
          style={{ background: 'radial-gradient(circle, hsl(221 83% 53%), transparent 70%)' }} />
        <div className="pointer-events-none absolute top-40 right-1/4 w-80 h-80 rounded-full opacity-15 blur-3xl z-0"
          style={{ background: 'radial-gradient(circle, hsl(271 91% 65%), transparent 70%)' }} />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <Badge className="mb-6 border-primary/30 text-primary bg-primary/10 px-4 py-1">
            <Flame className="w-3 h-3 mr-1" /> AI-Powered Placement Prep
          </Badge>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 text-balance leading-tight">
            Your{' '}
            <span className="gradient-text">AI-Powered</span>
            <br />
            Placement Universe
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-pretty">
            Master placements with personalized AI roadmaps, smart study plans, mock interviews, resume analysis, and gamified learning — all in one platform.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              className="xp-bar border-0 text-white h-12 px-8 text-base font-semibold shadow-lg neon-glow"
            >
              Start Your Journey <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/login')} className="h-12 px-8 text-base">
              Watch Demo
            </Button>
          </div>

          {/* Hero image / preview card */}
          <div className="mt-16 relative max-w-4xl mx-auto">
            <div className="glass rounded-2xl border border-border/60 p-6 shadow-card">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Target, label: 'Roadmap', value: 'Generated', color: 'text-neon-blue' },
                  { icon: Flame, label: 'Streak', value: '14 Days', color: 'text-warning' },
                  { icon: Trophy, label: 'XP Points', value: '2,450', color: 'text-neon-purple' },
                  { icon: CheckCircle, label: 'Tasks Done', value: '48/52', color: 'text-success' },
                ].map((item) => (
                  <div key={item.label} className="bg-card rounded-xl p-4 border border-border/50 text-center">
                    <item.icon className={`w-6 h-6 mx-auto mb-2 ${item.color}`} />
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-bold text-sm">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-16 px-4 md:px-6 border-y border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-3xl md:text-4xl font-extrabold gradient-text">
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4 border-primary/30 text-primary bg-primary/10">Everything You Need</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-balance">
              Supercharge Your Placement Prep
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-pretty">
              Six powerful AI tools designed to take you from preparation to placement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className={`card-hover rounded-2xl border border-border/60 p-6 bg-gradient-to-br ${f.gradient} bg-card`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-background/50`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-base mb-2 text-balance">{f.title}</h3>
                <p className="text-sm text-muted-foreground text-pretty">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 md:px-6 bg-accent/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4 border-primary/30 text-primary bg-primary/10">
              <Users className="w-3 h-3 mr-1" /> Student Stories
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-balance">
              Real Students, Real Results
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="glass rounded-2xl p-6 shadow-card card-hover h-full flex flex-col">
                <div className="flex mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-warning fill-warning" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground flex-1 text-pretty">"{t.content}"</p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-9 h-9 rounded-full xp-bar flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {t.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass rounded-3xl p-10 shadow-card relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-60" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
                Ready to Land Your Dream Job?
              </h2>
              <p className="text-muted-foreground mb-8 text-pretty">
                Join 50,000+ students preparing smarter with AI. Start free today.
              </p>
              <Button
                size="lg"
                onClick={() => navigate(user ? '/dashboard' : '/login')}
                className="xp-bar border-0 text-white h-12 px-10 text-base font-semibold neon-glow"
              >
                Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center xp-bar">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold gradient-text">PrepVerse</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">About</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">User Agreement</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-xs text-muted-foreground">© 2026 PrepVerse. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
