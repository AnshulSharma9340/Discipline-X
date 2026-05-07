import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { AuthHero } from './Login';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);

  // Supabase parses the recovery token from the URL hash automatically (because
  // detectSessionInUrl is true on the client). When that happens, an auth state
  // event of "PASSWORD_RECOVERY" fires and a recovery session is created. We
  // listen for it so we can show the form only when the user has a valid token.
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) setHasRecoverySession(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setHasRecoverySession(true);
      }
    });

    const timeout = setTimeout(() => {
      if (!cancelled) setHasRecoverySession((prev) => (prev === null ? false : prev));
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated. Welcome back.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update password');
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

          {hasRecoverySession === false ? (
            <div>
              <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 grid place-items-center mb-5">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-[-0.02em]">
                Link expired
              </h1>
              <p className="text-white/55 mt-3 text-sm leading-relaxed">
                This password reset link is invalid or has expired. Request a fresh one.
              </p>
              <Link
                to="/forgot-password"
                className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition"
              >
                Send new link <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-[-0.02em]">
                Set a new password
              </h1>
              <p className="text-white/55 mt-2 text-sm">
                Choose something strong — at least 8 characters.
              </p>

              <form onSubmit={onSubmit} className="space-y-4 mt-8">
                <PasswordField
                  label="New password"
                  value={password}
                  onChange={setPassword}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
                <PasswordField
                  label="Confirm password"
                  value={confirm}
                  onChange={setConfirm}
                  placeholder="Type it again"
                  autoComplete="new-password"
                />

                <button
                  type="submit"
                  disabled={loading || hasRecoverySession === null}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 active:scale-[0.99] transition disabled:opacity-50 mt-6"
                >
                  {loading ? 'Updating…' : 'Update password'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            </>
          )}

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

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <Lock
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35"
          strokeWidth={1.75}
        />
        <input
          type="password"
          required
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
