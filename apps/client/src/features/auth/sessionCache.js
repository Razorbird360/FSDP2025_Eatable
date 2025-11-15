const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const projectRef = (() => {
  try {
    if (!SUPABASE_URL) return null;
    const url = new URL(SUPABASE_URL);
    return url.hostname.split('.')[0];
  } catch {
    return null;
  }
})();

const STORAGE_KEY = projectRef ? `sb-${projectRef}-auth-token` : null;

let cachedSession = null;

const isBrowser = typeof window !== 'undefined';

const isValidSession = (session) => {
  if (!session || typeof session !== 'object') {
    return false;
  }

  if (!session.access_token || !session.refresh_token) {
    return false;
  }

  if (session.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    // Add a 10 second buffer to avoid edge cases near expiry.
    if (session.expires_at <= now - 10) {
      return false;
    }
  }

  return true;
};

const parseStoredSession = (rawValue) => {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    return isValidSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const hydrateSessionFromStorage = () => {
  if (!isBrowser || !STORAGE_KEY) {
    cachedSession = null;
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cachedSession = parseStoredSession(raw);
    return cachedSession;
  } catch (error) {
    console.error('Failed to read Supabase session from storage:', error);
    cachedSession = null;
    return null;
  }
};

export const cacheSession = (session) => {
  cachedSession = session ?? null;
  return cachedSession;
};

export const clearSessionCache = () => {
  cachedSession = null;
};

export const getCachedSession = ({ refresh = false } = {}) => {
  if (refresh || !cachedSession) {
    return hydrateSessionFromStorage();
  }
  return cachedSession;
};

export const getSessionAccessToken = () => {
  const session = getCachedSession();
  return session?.access_token ?? null;
};
