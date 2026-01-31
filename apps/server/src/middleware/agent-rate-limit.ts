type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = Number(process.env.AGENT_RATE_LIMIT_WINDOW_MS ?? 60_000);
const MAX_REQUESTS = Number(process.env.AGENT_RATE_LIMIT_MAX ?? 20);
const SWEEP_INTERVAL = 200;

const buckets = new Map<string, RateLimitEntry>();
let requestCount = 0;

const getClientKey = (req: any) => {
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.ip ?? 'unknown';
  const userId = req.user?.id ?? 'anonymous';
  return `${userId}:${ip}`;
};

const sweepExpired = (now: number) => {
  if (buckets.size === 0) return;
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
};

export const agentRateLimit = (req: any, res: any, next: any) => {
  const now = Date.now();
  requestCount += 1;
  if (requestCount % SWEEP_INTERVAL === 0) {
    sweepExpired(now);
  }

  const key = getClientKey(req);
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + WINDOW_MS;
    buckets.set(key, { count: 1, resetAt });
    res.setHeader('X-RateLimit-Limit', String(MAX_REQUESTS));
    res.setHeader('X-RateLimit-Remaining', String(MAX_REQUESTS - 1));
    res.setHeader('X-RateLimit-Reset', String(resetAt));
    return next();
  }

  entry.count += 1;
  res.setHeader('X-RateLimit-Limit', String(MAX_REQUESTS));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, MAX_REQUESTS - entry.count)));
  res.setHeader('X-RateLimit-Reset', String(entry.resetAt));

  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too many requests. Please slow down.',
    });
  }

  return next();
};
