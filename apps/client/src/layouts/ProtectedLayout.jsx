import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Center, Spinner } from '@chakra-ui/react';
import { useAuth } from '../features/auth/useAuth';

/**
 * ProtectedLayout - Wraps authenticated routes
 * Redirects to login if not authenticated
 * Used for: Order history, profile, photo uploads, cart checkout
 */
function ProtectedLayout() {
  const location = useLocation();
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <Center minH="60vh">
        <Spinner size="lg" thickness="4px" color="#21421B" label="Loading account" />
      </Center>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedLayout;
