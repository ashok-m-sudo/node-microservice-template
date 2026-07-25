const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const logger = require('./utils/logger');
const apiRoutes = require('./routes/api.routes');
const authMiddleware = require('./middleware/auth.middleware');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api', authMiddleware, apiRoutes);

// Health check (no auth required)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'backend-service',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error(err.message);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
    });
});

let server;
if (require.main === module) {
    server = app.listen(PORT, () => {
        logger.info(`Backend service running on port ${PORT}`);
    });
}

module.exports = app;
