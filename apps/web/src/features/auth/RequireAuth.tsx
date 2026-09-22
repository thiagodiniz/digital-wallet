import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RequireAuth() {
  const { session, loading } = useAuth();
  if (loading) return <p className="page">Loading…</p>;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}
