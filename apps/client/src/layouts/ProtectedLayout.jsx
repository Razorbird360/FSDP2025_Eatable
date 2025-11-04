import { Outlet, Navigate } from 'react-router-dom';

/**
 * ProtectedLayout - Wraps authenticated routes
 * Redirects to login if not authenticated
 * Used for: Order history, profile, photo uploads, cart checkout
 */
function ProtectedLayout() {
  // TODO: Get actual auth state from Supabase context
  const isAuthenticated = false; // Placeholder

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedLayout;
