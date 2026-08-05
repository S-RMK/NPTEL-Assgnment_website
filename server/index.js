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

// Support both /api/endpoint and /endpoint
app.use('/api', routes);

// Initialize background deadline reminder scheduler
try {
    initScheduler();
} catch (e) {
    console.warn('Scheduler init warning:', e.message);
}

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/dist')));

// Handle React routing, return all requests to React app
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
