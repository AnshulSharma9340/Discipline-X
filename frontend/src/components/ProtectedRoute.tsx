import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/store/auth';
import type { UserRole } from '@/types';

interface Props {
  children: React.ReactNode;
  requireRole?: UserRole;
}

export function ProtectedRoute({ children, requireRole }: Props) {
  const { session, user, initialized, loading } = useAuth();
  const location = useLocation();

  if (!initialized || loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-neon-violet" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireRole && user?.role !== requireRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
