import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from './AuthProvider';
import {
  cacheSession,
  clearSessionCache,
  getCachedSession,
  hydrateSessionFromStorage,
} from './sessionCache';

/**
 * useAuth Hook
 * Thin wrapper around AuthProvider context for auth actions
 */
export const useAuth = () => {
  const {
    session,
    supabaseUser,
    profile,
    status,
    error: contextError,
    refreshProfile,
  } = useAuthContext();

  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const signup = async (email, password, username) => {
    setLoading(true);
    setActionError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedUsername = username.trim().toLowerCase();
      const displayName = username.trim();

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            display_name: displayName,
            username: normalizedUsername,
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        cacheSession(data.session);
        await refreshProfile(data.session, { force: true, useStoredSession: false });
      }

      return {
        success: true,
        user: data.user,
        needsConfirmation: !data.session,
      };
    } catch (err) {
      const message = err.message || 'An error occurred during signup';
      setActionError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setActionError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        cacheSession(data.session);
        await refreshProfile(data.session, { force: true, useStoredSession: false });
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
      };
    } catch (err) {
      const message = err.message || 'An error occurred during login';
      setActionError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setActionError(null);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      clearSessionCache();
      await refreshProfile(null, {
        suppressError: true,
        force: true,
        useStoredSession: false,
      });
      return { success: true };
    } catch (err) {
      const message = err.message || 'An error occurred during logout';
      setActionError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const resolveSession = () => session ?? getCachedSession() ?? hydrateSessionFromStorage();

  const getSession = async () => resolveSession();

  const getCurrentUser = async () => {
    const activeSession = resolveSession();
    return supabaseUser ?? activeSession?.user ?? null;
  };

  return {
    signup,
    login,
    logout,
    getSession,
    getCurrentUser,
    loading,
    error: actionError ?? contextError,
    status,
    session,
    supabaseUser,
    profile,
  };
};
