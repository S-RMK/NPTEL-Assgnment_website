const express = require('express');
const cors = require('cors');
const routes = require('../server/routes');
const { initScheduler } = require('../server/scheduler');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Request logging for Vercel functions
app.use((req, res, next) => {
    console.log(`[Vercel Serverless] ${req.method} ${req.url}`);
    next();
});

// Support both /api/endpoint and /endpoint for Vercel serverless rewrites
app.use('/api', routes);
app.use('/', routes);

try {
    initScheduler();
} catch (e) {
    console.warn('Scheduler init warning:', e.message);
}

module.exports = app;
