/**
 * Centralized Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  console.error('[Error caught in middleware]:', err);

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  let message = err.message || 'An internal server error occurred';

  // Check for common Prisma connection issues (e.g. unconfigured cloud DB on Vercel)
  if (
    err.name === 'PrismaClientInitializationError' ||
    (err.message && (err.message.includes("Can't reach database server") || err.message.includes('ECONNREFUSED')))
  ) {
    message = 'Database unreachable. Please ensure DATABASE_URL is set to an accessible cloud MySQL database in your environment settings.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || null,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = errorHandler;
