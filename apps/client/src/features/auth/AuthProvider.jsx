import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import api from '../../lib/api';
import {
  cacheSession,
  clearSessionCache,
  hydrateSessionFromStorage,
} from './sessionCache';
import { AuthContext } from './AuthContext';

const buildUsername = (session) => {
  const fromMeta = session.user?.user_metadata?.username;
  if (fromMeta) {
    return String(fromMeta).toLowerCase();
  }

  const emailHandle = session.user?.email?.split('@')[0] ?? '';
  const sanitized = emailHandle.replace(/[^a-zA-Z0-9_]/g, '');
  return (sanitized || 'eatable_user').toLowerCase();
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [supabaseUser, setSupabaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const sessionRef = useRef(null);
  const isSyncingRef = useRef(false);
  const refreshPromiseRef = useRef(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const syncUser = useCallback(async (activeSession) => {
    if (!activeSession || isSyncingRef.current) return;

    isSyncingRef.current = true;
    try {
      const username = buildUsername(activeSession);
      const displayName =
        activeSession.user?.user_metadata?.display_name ??
        activeSession.user?.user_metadata?.username ??
        username;

      await api.post('/auth/sync-user', {
        username,
        displayName,
      });
    } catch (syncError) {
      console.error('User sync failed:', syncError);
      setError(syncError.message ?? 'Failed to sync user');
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  const refreshProfile = useCallback(
    async (activeSession = null, options = {}) => {
      const {
        suppressError = false,
        force = false,
        useStoredSession = true,
      } = options;
      const sessionToUse =
        useStoredSession && activeSession == null
          ? sessionRef.current
          : activeSession;

      if (!sessionToUse) {
        setProfile(null);
        setStatus('unauthenticated');
        return null;
      }

      if (refreshPromiseRef.current && suppressError && !force) {
        return refreshPromiseRef.current;
      }

      setStatus((prev) => (prev === 'authenticated' ? prev : 'loading'));

      const request = (async () => {
        try {
          let { data } = await api.get('/auth/me');

          if (data?.isSynced === false && !isSyncingRef.current) {
            await syncUser(sessionToUse);
            const refreshed = await api.get('/auth/me');
            data = refreshed.data;
          }

          setProfile(data);
          setStatus('authenticated');
          setError(null);
          return data;
        } catch (profileError) {
          console.error('Failed to load profile:', profileError);
          setProfile(null);

          setStatus('unauthenticated');

          if (suppressError) {
            return null;
          }

          setError(
            profileError.message ??
              (profileError.code === 'ECONNABORTED'
                ? 'Request timed out while loading profile'
                : 'Failed to load profile')
          );
          throw profileError;
        } finally {
          refreshPromiseRef.current = null;
        }
      })();

      refreshPromiseRef.current = request;
      return request;
    },
    [syncUser]
  );

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const currentSession = hydrateSessionFromStorage();

        if (!isMounted) return;

        cacheSession(currentSession);
        setSession(currentSession);
        setSupabaseUser(currentSession?.user ?? null);
        sessionRef.current = currentSession;

        if (currentSession) {
          await refreshProfile(currentSession, {
            suppressError: true,
            useStoredSession: false,
          });
        } else {
          setProfile(null);
          setStatus('unauthenticated');
        }
      } catch (bootstrapError) {
        console.error('Failed to initialize auth session:', bootstrapError);
        if (!isMounted) return;
        setProfile(null);
        setStatus('unauthenticated');
        setError(bootstrapError.message ?? 'Failed to initialize auth');
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;

      cacheSession(newSession ?? null);
      setSession(newSession);
      setSupabaseUser(newSession?.user ?? null);
      sessionRef.current = newSession;

      if (newSession) {
        await refreshProfile(newSession, { suppressError: true, useStoredSession: false });
      } else {
        setProfile(null);
        setStatus('unauthenticated');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearSessionCache();
    };
  }, [refreshProfile]);

  const value = {
    session,
    supabaseUser,
    profile,
    status,
    error,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
