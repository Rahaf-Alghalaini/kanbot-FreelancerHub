import { Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { PageLoader } from '../../components/Loader';
import { REDIRECT_PARAM, safeRedirect } from '../../lib/redirect';

/** Only for signed-out visitors (login, register). Signed-in users go to ?redirect= or the projects page. */
export function GuestRoute() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to={safeRedirect(params.get(REDIRECT_PARAM))} replace />;
  return <Outlet />;
}
