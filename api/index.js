// Vercel Serverless Function entry point
const app = require('../server/src/server');

module.exports = app.app || app;
