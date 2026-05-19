import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Zap, Eye, EyeOff, User, Lock, Mail, Chrome } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signInWithUsername, signUpWithUsername, signInWithGoogle } = useAuth();

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    const { error } = await signInWithUsername(loginUsername, loginPassword);
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Login failed');
    } else {
      toast.success('Welcome back! 🚀');
      navigate('/dashboard');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regPassword || !regConfirm) {
      toast.error('Please fill in all fields');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(regUsername)) {
      toast.error('Username can only contain letters, digits, and underscores');
      return;
    }
    if (regPassword !== regConfirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (regPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!agreed) {
      toast.error('Please agree to the User Agreement and Privacy Policy');
      return;
    }
    setLoading(true);
    const { error } = await signUpWithUsername(regUsername, regPassword);
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Registration failed');
    } else {
      toast.success('Account created! Welcome to PrepVerse 🎉');
      navigate('/onboarding');
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) toast.error('Google sign-in failed');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      {/* Background decorative blobs */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 z-0"
        style={{ background: 'radial-gradient(circle, hsl(221 83% 53%), transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-20 z-0"
        style={{ background: 'radial-gradient(circle, hsl(271 91% 65%), transparent 70%)' }}
      />

      <div className="w-full max-w-md z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center xp-bar shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">PrepVerse</span>
          </Link>
          <p className="text-muted-foreground text-sm">Your AI-Powered Placement Universe</p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-8 shadow-card">
          <Tabs defaultValue="login">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="login" className="flex-1">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="flex-1">Sign Up</TabsTrigger>
            </TabsList>

            {/* Login */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-username"
                      placeholder="your_username"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showLoginPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPw(!showLoginPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 xp-bar border-0 text-white font-semibold" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            {/* Register */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-username"
                      placeholder="your_username"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-password"
                      type={showRegPw ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPw(!showRegPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-confirm">Confirm Password</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder="Repeat password"
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="agree"
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(v === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="agree" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    I agree to the{' '}
                    <span className="text-primary underline cursor-pointer">User Agreement</span>{' '}
                    and{' '}
                    <span className="text-primary underline cursor-pointer">Privacy Policy</span>
                  </label>
                </div>
                <Button type="submit" className="w-full h-11 xp-bar border-0 text-white font-semibold" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with</span>
            </div>
          </div>

          {/* Google SSO */}
          <Button
            variant="outline"
            className="w-full h-11"
            onClick={handleGoogle}
            disabled={googleLoading}
          >
            <Chrome className="w-4 h-4 mr-2" />
            {googleLoading ? 'Redirecting...' : 'Continue with Google'}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By using PrepVerse, you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}
