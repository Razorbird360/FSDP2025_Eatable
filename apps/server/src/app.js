import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { register } from './monitoring/metrics.js';
import { metricsMiddleware } from './middleware/metrics.middleware.js';
import {
  errorMiddleware,
  notFoundMiddleware,
} from './middleware/error.middleware.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Metrics middleware (must be early to capture all requests)
app.use(metricsMiddleware);

// Request logging removed for cleaner console output

// Prometheus metrics endpoint (before auth, no rate limit)
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// API routes
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Eatable API',
    version: '1.0.0',
    status: 'running',
  });
});

// Error handling
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
