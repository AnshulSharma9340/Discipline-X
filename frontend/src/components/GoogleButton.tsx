import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export function GoogleButton({
  label = 'Continue with Google',
  loginHint,
}: {
  label?: string;
  loginHint?: string;
}) {
  const [loading, setLoading] = useState(false);

  function onClick() {
    setLoading(true);
    try {
      // Backend handles the full OAuth dance: Google → backend callback →
      // Supabase magic link → frontend dashboard.
      const qs = loginHint ? `?hint=${encodeURIComponent(loginHint)}` : '';
      window.location.href = `${API_BASE}/auth/google/login${qs}`;
    } catch (err) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 active:scale-[0.99] transition disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
            fill="#EA4335"
          />
        </svg>
      )}
      <span>{loading ? 'Redirecting…' : label}</span>
    </button>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-[11px] uppercase tracking-[0.18em] text-white/35">or</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}
