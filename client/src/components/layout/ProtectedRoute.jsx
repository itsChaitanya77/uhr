import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, homePathFor } from '../../context/AuthContext';
import { PageSkeleton } from '../ui';

/** Requires sign-in; optionally restricts to specific roles (others are sent to their own home). */
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-8"><PageSkeleton /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />;
  return <Outlet />;
}
