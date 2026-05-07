import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { AuthHero } from './Login';

export default function Register() {
  const { session, fetchProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw error;
      if (!data.session) {
        toast.success('Check your email to confirm your account.');
        navigate('/login');
        return;
      }
      await fetchProfile();
      toast.success('Account created. Welcome.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign-up failed');
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
            Create your account
          </h1>
          <p className="text-white/55 mt-2 text-sm">Start your discipline streak today.</p>

          <form onSubmit={onSubmit} className="space-y-4 mt-8">
            <Field label="Name" icon={User} required value={name} onChange={setName} placeholder="Your name" />
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
              autoComplete="new-password"
              required
              value={password}
              onChange={setPassword}
              placeholder="At least 8 characters"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 active:scale-[0.99] transition disabled:opacity-50 mt-6"
            >
              {loading ? 'Creating account…' : 'Create account'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>

            <p className="text-xs text-white/40 text-center leading-relaxed">
              By creating an account you agree to our{' '}
              <Link to="/terms" className="text-white/70 hover:text-white underline underline-offset-2">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-white/70 hover:text-white underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
          </form>

          <div className="mt-8 text-sm text-white/55 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-white hover:underline underline-offset-4">
              Sign in
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

function Field({
  label,
  icon: Icon,
  type = 'text',
  required,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  icon: typeof Mail;
  type?: string;
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
