// Global error handling middleware
export function errorMiddleware(err, req, res, _next) {
  console.error('Error:', err);

  // Prisma errors
  if (err.code?.startsWith('P')) {
    return res.status(400).json({
      error: 'Database error',
      message: err.message,
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message,
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

// 404 Not Found middleware
export function notFoundMiddleware(req, res) {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
  });
}
