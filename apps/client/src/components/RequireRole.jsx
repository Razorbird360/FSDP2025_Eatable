import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';

export default function RequireRole({ role, verified = false, children }) {
  const { profile, status } = useAuth();

  // Wait for auth to resolve
  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  // Check role
  if (!profile || profile.role !== role) {
    return <Navigate to="/home" replace />;
  }

  // Check verification if required
  if (verified && !profile.verified) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
