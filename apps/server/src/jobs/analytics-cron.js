import { analyticsJobsService } from '../services/analytics-jobs.service.js';

const DEFAULT_TIME = '03:00';
const DAY_MS = 24 * 60 * 60 * 1000;

let isRunning = false;

const parseTime = (value) => {
  if (!value) return null;
  const parts = String(value).split(':');
  if (parts.length !== 2) return null;
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
};

const runSimilarityJob = async () => {
  if (isRunning) {
    console.warn('[analytics] Similarity rebuild already running, skipping');
    return;
  }
  isRunning = true;
  console.log(
    `[analytics] Rebuilding item similarity (${new Date().toISOString()})`
  );
  try {
    await analyticsJobsService.rebuildItemSimilarity();
    console.log('[analytics] Item similarity rebuild completed');
  } catch (error) {
    console.error('[analytics] Item similarity rebuild failed', error);
  } finally {
    isRunning = false;
  }
};

const scheduleDaily = (time) => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(time.hour, time.minute, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  const delay = next.getTime() - now.getTime();

  console.log(
    `[analytics] Scheduled item similarity rebuild at ${String(
      time.hour
    ).padStart(2, '0')}:${String(time.minute).padStart(2, '0')} server time`
  );

  setTimeout(() => {
    void runSimilarityJob();
    setInterval(() => {
      void runSimilarityJob();
    }, DAY_MS);
  }, delay);
};

export const scheduleAnalyticsJobs = () => {
  const enabled = process.env.ANALYTICS_JOBS_ENABLED !== 'false';
  if (!enabled) {
    console.log('[analytics] Analytics jobs disabled');
    return;
  }

  const configuredTime = parseTime(process.env.ANALYTICS_SIMILARITY_TIME);
  if (process.env.ANALYTICS_SIMILARITY_TIME && !configuredTime) {
    console.warn(
      `[analytics] Invalid ANALYTICS_SIMILARITY_TIME, using ${DEFAULT_TIME}`
    );
  }

  const fallbackTime = parseTime(DEFAULT_TIME);
  const scheduleTime = configuredTime || fallbackTime;
  if (!scheduleTime) {
    console.error('[analytics] Failed to parse schedule time');
    return;
  }

  scheduleDaily(scheduleTime);

  if (process.env.ANALYTICS_SIMILARITY_RUN_ON_STARTUP === 'true') {
    void runSimilarityJob();
  }
};
