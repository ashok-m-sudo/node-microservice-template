const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const proxyConfig = require('./config/proxy.config');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(limiter);

// Request logging (before proxy to log all requests)
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// Setup proxies BEFORE body parsing middleware
// This is crucial - proxies need raw request stream
proxyConfig.setupProxies(app);

// Body parsing middleware (after proxies)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'api-gateway',
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'API Gateway - Microservices Template',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth/*',
            backend: '/api/backend/*'
        }
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
        logger.info(`API Gateway running on port ${PORT}`);
    });
}

module.exports = app;
