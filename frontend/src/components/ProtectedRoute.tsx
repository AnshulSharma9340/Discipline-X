import { Navigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { Button } from '@/components/ui/Button';
import type { UserRole } from '@/types';

interface Props {
  children: React.ReactNode;
  requireRole?: UserRole;
}

export function ProtectedRoute({ children, requireRole }: Props) {
  const { session, user, initialized, loading, fetchProfile, signOut } = useAuth();
  const location = useLocation();

  // If the URL hash carries a Supabase auth token (magic-link / OAuth callback),
  // Supabase is still parsing it asynchronously. We must NOT bounce to /login
  // here — that's the visible flash the user sees right after signing in.
  // Wait it out with the loading spinner; the hash will be replaced as soon
  // as the session is established.
  const hasAuthHash =
    typeof window !== 'undefined' &&
    /access_token=|refresh_token=|type=(magiclink|recovery|signup)/.test(
      window.location.hash,
    );

  if (!initialized || loading || (hasAuthHash && !session)) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Session exists but profile didn't load → backend unreachable or auth mismatch.
  // Show a clear error instead of rendering protected pages with no user data.
  if (session && !user) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="glass p-8 max-w-md text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 grid place-items-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-300" />
          </div>
          <h1 className="text-xl font-display font-bold mb-2">Couldn't load your profile</h1>
          <p className="text-sm text-white/60 mb-1">
            You're signed in but the backend didn't respond.
          </p>
          <p className="text-xs text-white/40 mb-6">
            Backend: <code className="px-1 bg-white/5 rounded">{import.meta.env.VITE_API_BASE_URL || 'not set'}</code>
            <br />Likely causes: backend asleep (Render free tier wakes in ~30s), CORS blocking, or wrong VITE_API_BASE_URL.
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="ghost" onClick={fetchProfile}>
              <RefreshCw className="w-4 h-4" /> Retry
            </Button>
            <Button variant="danger" onClick={signOut}>
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (requireRole && user?.role !== requireRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
