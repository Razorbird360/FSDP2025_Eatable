import api from './api';

const ANON_ID_KEY = 'eatable_anon_id';
const SESSION_ID_KEY = 'eatable_session_id';
const FLUSH_DELAY_MS = 1200;
const MAX_BATCH_SIZE = 25;

const eventQueue = [];
let flushTimer = null;

const getStorageItem = (storage, key) => {
  try {
    return storage.getItem(key);
  } catch (error) {
    return null;
  }
};

const setStorageItem = (storage, key, value) => {
  try {
    storage.setItem(key, value);
  } catch (error) {
    // Ignore storage failures (private mode, etc.)
  }
};

const generateId = (prefix) => {
  if (typeof window !== 'undefined' && typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const getOrCreateAnonId = () => {
  if (typeof window === 'undefined') return null;
  const stored = getStorageItem(window.localStorage, ANON_ID_KEY);
  if (stored) return stored;
  const anonId = generateId('anon');
  setStorageItem(window.localStorage, ANON_ID_KEY, anonId);
  return anonId;
};

export const getOrCreateSessionId = () => {
  if (typeof window === 'undefined') return null;
  const stored = getStorageItem(window.sessionStorage, SESSION_ID_KEY);
  if (stored) return stored;
  const sessionId = generateId('session');
  setStorageItem(window.sessionStorage, SESSION_ID_KEY, sessionId);
  return sessionId;
};

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

const normalizeEvent = (event) => {
  if (!event?.eventType || !event?.itemId) return null;
  const userId = event.userId ?? null;
  const anonId = userId ? null : event.anonId ?? getOrCreateAnonId();
  if (!userId && !anonId) return null;

  const sessionId = event.sessionId ?? getOrCreateSessionId();
  if (!sessionId) return null;

  const metadata = {
    time_of_day: getTimeOfDay(),
    ...(event.metadata && typeof event.metadata === 'object' ? event.metadata : {}),
  };

  return {
    userId,
    anonId,
    sessionId,
    eventType: event.eventType,
    itemId: event.itemId,
    categoryId: event.categoryId || null,
    timestamp: event.timestamp ?? new Date().toISOString(),
    metadata,
  };
};

const flushEvents = async () => {
  if (eventQueue.length === 0) return;
  const payload = eventQueue.splice(0, eventQueue.length);
  try {
    await api.post('/events', { events: payload });
  } catch (error) {
    console.warn('Failed to send events batch', error);
  }
};

const scheduleFlush = () => {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushEvents();
  }, FLUSH_DELAY_MS);
};

export const trackEvents = (events) => {
  if (!Array.isArray(events) || events.length === 0) return;
  const normalized = events.map(normalizeEvent).filter(Boolean);
  if (normalized.length === 0) return;
  eventQueue.push(...normalized);
  if (eventQueue.length >= MAX_BATCH_SIZE) {
    void flushEvents();
    return;
  }
  scheduleFlush();
};

export const trackEvent = (event) => {
  trackEvents([event]);
};
