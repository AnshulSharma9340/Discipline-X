import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/auth';

/**
 * Wrapper that redirects authenticated users without an org to /onboarding.
 * Place inside ProtectedRoute so we know `user` is loaded.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const loc = useLocation();

  // Allow these paths even without an org
  const allowed = ['/onboarding', '/settings'];

  if (user && !user.org_id && !allowed.some((p) => loc.pathname.startsWith(p))) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}
