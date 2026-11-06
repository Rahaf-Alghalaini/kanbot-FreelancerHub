import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { PageLoader } from '../../components/Loader';
import { t } from '../../i18n';
import { REDIRECT_PARAM } from '../../lib/redirect';
import { tokenStore } from '../../lib/token';

/** Only for signed-in users. A signed-out visitor goes to /login?redirect=<where they were> and comes back after signing in. */
export function ProtectedRoute() {
  const { user, loading, manualLogout, expireSession } = useAuth();
  const location = useLocation();

  // Token deleted (e.g. in DevTools): any navigation signs the user out.
  useEffect(() => {
    if (user && !tokenStore.get()) expireSession();
  }, [user, expireSession, location.pathname]);

  if (loading) return <PageLoader label={t('err.restoring')} />;
  if (!user) {
    const here = location.pathname + location.search + location.hash;
    return <Navigate to={manualLogout ? '/login' : `/login?${REDIRECT_PARAM}=${encodeURIComponent(here)}`} replace />;
  }
  return <Outlet />;
}
