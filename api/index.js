// Vercel Serverless Function entrypoint
// Routes all /api/* requests directly to Express backend
const app = require('../server/src/server');

module.exports = app;
