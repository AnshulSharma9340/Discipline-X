import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { ShaderAnimation } from '@/components/ui/ShaderAnimation';

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
      toast.success('Welcome back');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black grid lg:grid-cols-2">
      <AuthHero />
      <div className="grid place-items-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <Link to="/" className="inline-flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-7 h-7 rounded-md bg-white grid place-items-center">
              <span className="text-black font-display font-bold text-sm leading-none">D</span>
            </div>
            <span className="font-display font-semibold tracking-tight">DisciplineX</span>
          </Link>

          <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-[-0.02em]">
            Welcome back
          </h1>
          <p className="text-white/55 mt-2 text-sm">Sign in to keep your streak alive.</p>

          <form onSubmit={onSubmit} className="space-y-4 mt-8">
            <Field
              label="Email"
              icon={Mail}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              icon={Lock}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 active:scale-[0.99] transition disabled:opacity-50 mt-6"
            >
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-8 text-sm text-white/55 text-center">
            New here?{' '}
            <Link to="/register" className="text-white hover:underline underline-offset-4">
              Create an account
            </Link>
          </div>

          <div className="mt-12 text-center">
            <Link to="/" className="text-xs text-white/35 hover:text-white/60 transition">
              ← Back to home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function AuthHero() {
  return (
    <div className="hidden lg:block relative overflow-hidden border-r border-white/[0.06]">
      <ShaderAnimation />
      <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-black/60 pointer-events-none" />

      <div className="relative z-10 h-full flex flex-col justify-between p-12">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-md bg-white grid place-items-center transition group-hover:scale-105">
            <span className="text-black font-display font-bold text-sm leading-none">D</span>
          </div>
          <span className="font-display font-semibold tracking-tight">DisciplineX</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="max-w-md"
        >
          <h2 className="text-4xl font-display font-semibold leading-[1.05] tracking-[-0.03em]">
            Discipline isn't a feeling.
            <br />
            <span className="italic font-light text-white/70">It's a system.</span>
          </h2>
          <p className="mt-5 text-white/60 text-sm leading-relaxed max-w-sm">
            Daily tasks. Verified proof. Streaks that actually matter. Compete with the room and
            stay accountable to yourself.
          </p>
        </motion.div>

        <div className="text-[11px] text-white/30 uppercase tracking-[0.2em]">© DisciplineX</div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  type,
  required,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  icon: typeof Mail;
  type: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <Icon
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35"
          strokeWidth={1.75}
        />
        <input
          type={type}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input pl-10"
        />
      </div>
    </label>
  );
}
