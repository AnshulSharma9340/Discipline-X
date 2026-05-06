import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function Login() {
  const { session, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await fetchProfile();
      toast.success('Welcome back, operator');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <AuthHero />
      <div className="grid place-items-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass w-full max-w-md p-8"
        >
          <div className="mb-6">
            <div className="text-3xl font-display font-bold neon-text">Welcome back</div>
            <p className="text-white/60 mt-1">Sign in to keep your streak alive.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-[42px] w-4 h-4 text-white/40" />
              <Input
                label="Email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                placeholder="you@example.com"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-[42px] w-4 h-4 text-white/40" />
              <Input
                label="Password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign in <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-6 text-sm text-white/60 text-center">
            New here?{' '}
            <Link to="/register" className="text-neon-violet hover:text-neon-cyan transition">
              Create an account
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function AuthHero() {
  return (
    <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-ink-900 to-ink-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-aurora opacity-40 animate-gradient-x [background-size:200%_200%]" />
      <div className="relative">
        <div className="text-3xl font-display font-bold neon-text">DisciplineX</div>
        <div className="text-sm text-white/50 mt-1 tracking-wider uppercase">
          Stay Sharp · Ship Daily
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative max-w-md"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs mb-4">
          <Sparkles className="w-3.5 h-3.5 text-neon-cyan" /> AI productivity OS
        </div>
        <h1 className="text-4xl font-display font-bold leading-tight">
          Discipline isn't a feeling. <br />
          <span className="neon-text">It's a system.</span>
        </h1>
        <p className="mt-4 text-white/70">
          Daily tasks. Verified proof. Streaks that mean something. Compete with the room and stay
          accountable to yourself.
        </p>
      </motion.div>

      <div className="relative text-xs text-white/40">© DisciplineX</div>
    </div>
  );
}
