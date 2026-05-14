import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Lock, KeyRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { ShaderAnimation } from '@/components/ui/ShaderAnimation';
import { GoogleButton, AuthDivider } from '@/components/GoogleButton';
import { Logo } from '@/components/Logo';
import { forgetLogin, getLastLogin, rememberLogin, type LoginHint } from '@/lib/consent';

type Mode = 'password' | 'otp';

export default function Login() {
  const { session, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard';

  const [mode, setMode] = useState<Mode>('password');
  const [hint, setHint] = useState<LoginHint | null>(null);

  useEffect(() => {
    setHint(getLastLogin());
  }, []);

  if (session) return <Navigate to={from} replace />;

  function clearHint() {
    forgetLogin();
    setHint(null);
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
          <Link to="/" className="inline-flex items-center gap-2.5 mb-10 lg:hidden">
            <Logo size={28} />
            <span className="font-display font-semibold tracking-tight">DisciplineX</span>
          </Link>

          <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-[-0.02em]">
            Welcome back
          </h1>
          <p className="text-white/55 mt-2 text-sm">Sign in to keep your streak alive.</p>

          {hint ? (
            <div className="mt-7 flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-xs">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neon-violet to-neon-cyan grid place-items-center text-[11px] font-semibold shrink-0">
                {hint.email[0]?.toUpperCase()}
              </div>
              <span className="text-white/55 shrink-0">Continue as</span>
              <span className="text-white truncate flex-1">{hint.email}</span>
              <button
                onClick={clearHint}
                className="shrink-0 text-white/40 hover:text-white/80 transition p-0.5"
                title="Use a different account"
                aria-label="Forget this account"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}

          <div className="mt-6">
            <GoogleButton
              label={hint?.method === 'google' ? `Continue with Google` : 'Sign in with Google'}
              loginHint={hint?.method === 'google' ? hint.email : undefined}
            />
          </div>

          <AuthDivider />

          <div className="flex p-1 rounded-full bg-white/5 border border-white/10 text-xs">
            <button
              onClick={() => setMode('password')}
              className={`flex-1 px-4 py-1.5 rounded-full transition ${
                mode === 'password' ? 'bg-white text-black font-medium' : 'text-white/60 hover:text-white'
              }`}
            >
              Password
            </button>
            <button
              onClick={() => setMode('otp')}
              className={`flex-1 px-4 py-1.5 rounded-full transition ${
                mode === 'otp' ? 'bg-white text-black font-medium' : 'text-white/60 hover:text-white'
              }`}
            >
              Email code
            </button>
          </div>

          <div className="mt-6">
            {mode === 'password' ? (
              <PasswordForm
                prefillEmail={hint?.method !== 'google' ? hint?.email : undefined}
                onSuccess={async (email) => {
                  rememberLogin(email, 'password');
                  await fetchProfile();
                  toast.success('Welcome back');
                  navigate(from, { replace: true });
                }}
              />
            ) : (
              <OtpForm
                prefillEmail={hint?.method !== 'google' ? hint?.email : undefined}
                onSuccess={async (email) => {
                  rememberLogin(email, 'otp');
                  await fetchProfile();
                  toast.success('Signed in');
                  navigate(from, { replace: true });
                }}
              />
            )}
          </div>

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

function PasswordForm({
  onSuccess,
  prefillEmail,
}: {
  onSuccess: (email: string) => Promise<void>;
  prefillEmail?: string;
}) {
  const [email, setEmail] = useState(prefillEmail ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await onSuccess(email);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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

      <div className="flex justify-end -mt-2">
        <Link
          to="/forgot-password"
          className="text-xs text-white/55 hover:text-white transition underline-offset-4 hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 active:scale-[0.99] transition disabled:opacity-50 mt-4"
      >
        {loading ? 'Signing in…' : 'Sign in'}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </button>
    </form>
  );
}

function OtpForm({
  onSuccess: _onSuccess,
  prefillEmail,
}: {
  onSuccess: (email: string) => Promise<void>;
  prefillEmail?: string;
}) {
  const [email, setEmail] = useState(prefillEmail ?? '');
  const [token, setToken] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await api.post('/auth/otp/request', { email });
      if (res.status >= 400) throw new Error('Could not send code');
      toast.success(`Code sent to ${email}`);
      setStage('code');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send code');
    } finally {
      setSending(false);
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    if (token.length !== 6) {
      toast.error('Code must be 6 digits');
      return;
    }
    setVerifying(true);
    try {
      const res = await api.post<{ action_link: string }>('/auth/otp/verify', {
        email,
        code: token,
      });
      rememberLogin(email, 'otp');
      // Navigate to Supabase magic-link URL — Supabase sets the session and
      // redirects back to /dashboard, where detectSessionInUrl picks it up.
      window.location.href = res.data.action_link;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setVerifying(false);
    }
  }

  if (stage === 'email') {
    return (
      <form onSubmit={sendCode} className="space-y-4">
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
        <button
          type="submit"
          disabled={sending}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 active:scale-[0.99] transition disabled:opacity-50 mt-2"
        >
          {sending ? 'Sending…' : 'Send 6-digit code'}
          {!sending && <ArrowRight className="w-4 h-4" />}
        </button>
        <p className="text-[11px] text-white/40 text-center leading-relaxed">
          We'll email you a one-time code. No password required.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={verifyCode} className="space-y-4">
      <div className="text-xs text-white/55">
        Code sent to <span className="text-white">{email}</span>
      </div>
      <label className="block">
        <span className="label">6-digit code</span>
        <div className="relative">
          <KeyRound
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35"
            strokeWidth={1.75}
          />
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            pattern="[0-9]{6}"
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="input pl-10 tracking-[0.4em] font-mono text-lg"
          />
        </div>
      </label>

      <button
        type="submit"
        disabled={verifying}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 active:scale-[0.99] transition disabled:opacity-50 mt-2"
      >
        {verifying ? 'Verifying…' : 'Verify & sign in'}
        {!verifying && <ArrowRight className="w-4 h-4" />}
      </button>

      <button
        type="button"
        onClick={() => {
          setStage('email');
          setToken('');
        }}
        className="w-full text-xs text-white/55 hover:text-white transition"
      >
        ← Use a different email
      </button>
    </form>
  );
}

export function AuthHero() {
  return (
    <div className="hidden lg:block relative overflow-hidden border-r border-white/[0.06]">
      <ShaderAnimation />
      <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-black/60 pointer-events-none" />

      <div className="relative z-10 h-full flex flex-col justify-between p-12">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <Logo size={28} className="transition group-hover:scale-105" />
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
