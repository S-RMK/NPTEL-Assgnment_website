const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');
const { initScheduler } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Liveness probe. Answers even when Firebase credentials are missing, so it can be
// used to tell "API not deployed" (HTML/text 404) apart from "API up but misconfigured".
app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        firebase: Boolean(require('./db')),
        runtime: process.env.VERCEL ? 'vercel' : 'local'
    });
});

// Support both /api/endpoint and /endpoint
app.use('/api', routes);

// Unmatched /api requests must answer with JSON. Express' default 404 is an HTML
// page, which makes the client blow up in res.json() instead of showing the error.
app.use('/api', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Local dev only: serve the built React app from the same process. On Vercel the
// static build is served by the CDN and this function only ever receives /api/*,
// so serving client/dist here would just 500 (it is not in the function bundle).
if (!process.env.VERCEL) {
    // Background deadline reminder scheduler. Only meaningful on a long-lived process —
    // a Vercel serverless function is frozen between requests, so node-cron never fires.
    try {
        initScheduler();
    } catch (e) {
        console.warn('Scheduler init warning:', e.message);
    }

    app.use(express.static(path.join(__dirname, '../client/dist')));

    app.get(/(.*)/, (req, res) => {
        res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
    });
}

// Never bind a port inside a serverless function — it has no listening socket.
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
