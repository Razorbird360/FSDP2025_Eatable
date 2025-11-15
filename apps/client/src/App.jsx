import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import AppRoutes from './routes';
import { supabase } from './lib/supabase';
import api from './lib/api';

function App() {
  useEffect(() => {
    let isSyncing = false;

    const buildUsername = (session) => {
      const fromMeta = session.user.user_metadata?.username;
      if (fromMeta) {
        return String(fromMeta).toLowerCase();
      }

      const emailHandle = session.user.email?.split('@')[0] ?? '';
      const sanitized = emailHandle.replace(/[^a-zA-Z0-9_]/g, '');
      return (sanitized || 'eatable_user').toLowerCase();
    };

    const syncUser = async (session) => {
      if (!session || isSyncing) return;
      isSyncing = true;

      try {
        const username = buildUsername(session);
        await api.post('/auth/sync-user', {
          username,
          displayName:
            session.user.user_metadata?.display_name ??
            session.user.user_metadata?.username ??
            username,
        });
      } catch (error) {
        // Non-blocking: sync failures shouldn't crash the app
        console.error('User sync failed:', error);
      } finally {
        isSyncing = false;
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await syncUser(session);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        syncUser(data.session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ChakraProvider>
  );
}

export default App;
