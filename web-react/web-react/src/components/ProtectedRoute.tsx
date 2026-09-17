import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { isLoggedIn } from '../lib/auth';

/** Redirects to /login if no session token exists — mirrors app.js's requireAuth() */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  if (!isLoggedIn()) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return <>{children}</>;
}
