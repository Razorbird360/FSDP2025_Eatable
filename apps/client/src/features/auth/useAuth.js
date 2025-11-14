import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import api from '../../lib/api';

/**
 * useAuth Hook
 * Handles authentication logic for signup, login, and logout
 * Integrates with Supabase Auth and syncs with backend
 */
export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Sign up a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} username - Desired username (also used as default display name)
   * @returns {Promise<{success: boolean, user?: object, error?: string}>}
   */
  const signup = async (email, password, username) => {
    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedUsername = username.trim().toLowerCase();
      const displayName = username.trim();

      // 1. Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            display_name: displayName,
            username: normalizedUsername,
          },
        },
      });

      if (authError) throw authError;

      // 2. Sync user to backend database
      // Backend will create User record in database
      const session = authData.session;
      if (session) {
        try {
          await api.post('/auth/sync-user', {
            username: normalizedUsername,
            displayName,
          });
        } catch (syncError) {
          // Non-critical error - user is created in Supabase, just not synced to DB yet
          console.error('Backend sync error:', syncError);
        }
      }

      return {
        success: true,
        user: authData.user,
      };
    } catch (err) {
      const errorMessage = err.message || 'An error occurred during signup';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log in an existing user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{success: boolean, user?: object, error?: string}>}
   */
  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      return {
        success: true,
        user: data.user,
        session: data.session,
      };
    } catch (err) {
      const errorMessage = err.message || 'An error occurred during login';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log out the current user
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const logout = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: logoutError } = await supabase.auth.signOut();
      if (logoutError) throw logoutError;

      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'An error occurred during logout';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get current session
   * @returns {Promise<Session|null>}
   */
  const getSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  };

  /**
   * Get current user
   * @returns {Promise<User|null>}
   */
  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  };

  return {
    signup,
    login,
    logout,
    getSession,
    getCurrentUser,
    loading,
    error,
  };
};
