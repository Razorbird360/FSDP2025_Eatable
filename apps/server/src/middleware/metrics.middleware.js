import { httpRequestDuration, httpRequestsTotal } from '../monitoring/metrics.js';

function normalizeRoute(route) {
  return route
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[A-Z0-9]{4,8}$/gi, '/:code');
}

export const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationSec = Number(durationNs) / 1e9;

    const route = req.route?.path || req.baseUrl + (req.route?.path || req.path) || req.path;
    const normalizedRoute = normalizeRoute(route);

    const labels = {
      method: req.method,
      route: normalizedRoute,
      status_code: res.statusCode,
    };

    httpRequestDuration.observe(labels, durationSec);
    httpRequestsTotal.inc(labels);
  });

  next();
};
