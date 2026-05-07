import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { AuthHero } from './Login';

export default function ForgotPassword() {
  const session = useAuth((s) => s.session);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (session) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/password/forgot', { email });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send reset email');
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

          {sent ? (
            <div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 grid place-items-center mb-5">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-[-0.02em]">
                Check your inbox
              </h1>
              <p className="text-white/55 mt-3 text-sm leading-relaxed">
                We sent a password reset link to <span className="text-white">{email}</span>. Click
                it to set a new password. The link expires in 1 hour.
              </p>
              <p className="text-white/40 text-xs mt-4 leading-relaxed">
                Didn't get it? Check spam, or wait a minute and try again.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail('');
                }}
                className="mt-6 text-sm text-white/70 hover:text-white transition"
              >
                ← Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-[-0.02em]">
                Reset your password
              </h1>
              <p className="text-white/55 mt-2 text-sm">
                Enter your email — we'll send you a secure link to set a new password.
              </p>

              <form onSubmit={onSubmit} className="space-y-4 mt-8">
                <label className="block">
                  <span className="label">Email</span>
                  <div className="relative">
                    <Mail
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35"
                      strokeWidth={1.75}
                    />
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="input pl-10"
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 active:scale-[0.99] transition disabled:opacity-50 mt-6"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            </>
          )}

          <div className="mt-8 text-sm text-white/55 text-center">
            Remembered it?{' '}
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
