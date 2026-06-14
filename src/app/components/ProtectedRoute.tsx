import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

/**
 * Route guard. The landing page (and /login, /register) are the only public
 * surfaces — everything else (dashboard, analysis, compare, results, live
 * monitor) requires an authenticated Supabase session. Unauthenticated users
 * are bounced to /login.
 */
export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="font-mono text-xs tracking-widest text-muted-foreground animate-pulse">
          AUTHENTICATING…
        </span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
