import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import {
  errorMiddleware,
  notFoundMiddleware,
} from './middleware/error.middleware.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
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
