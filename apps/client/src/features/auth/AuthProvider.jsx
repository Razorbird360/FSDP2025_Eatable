import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import api from '../../lib/api';

const AuthContext = createContext(null);

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

  const isSyncingRef = useRef(false);

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
    async (activeSession = session) => {
      if (!activeSession) {
        setProfile(null);
        setStatus('unauthenticated');
        return null;
      }

      setStatus((prev) => (prev === 'authenticated' ? prev : 'loading'));

      try {
        let { data } = await api.get('/auth/me');

        if (data?.isSynced === false && !isSyncingRef.current) {
          await syncUser(activeSession);
          const refreshed = await api.get('/auth/me');
          data = refreshed.data;
        }

        setProfile(data);
        setStatus('authenticated');
        setError(null);
        return data;
      } catch (profileError) {
        console.error('Failed to load profile:', profileError);
        setError(profileError.message ?? 'Failed to load profile');
        setStatus('error');
        throw profileError;
      }
    },
    [session, syncUser]
  );

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      setSession(currentSession);
      setSupabaseUser(currentSession?.user ?? null);

      if (currentSession) {
        await refreshProfile(currentSession);
      } else {
        setProfile(null);
        setStatus('unauthenticated');
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);
      setSupabaseUser(newSession?.user ?? null);

      if (newSession) {
        await refreshProfile(newSession);
      } else {
        setProfile(null);
        setStatus('unauthenticated');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
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

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
