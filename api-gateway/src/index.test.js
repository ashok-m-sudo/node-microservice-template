const request = require('supertest');
const app = require('./index');

describe('API Gateway', () => {
    describe('GET /health', () => {
        it('returns 200 with healthy status', async () => {
            const res = await request(app).get('/health');

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                status: 'healthy',
                service: 'api-gateway'
            });
            expect(res.body.timestamp).toBeDefined();
        });
    });

    describe('GET /', () => {
        it('returns service info and endpoint map', async () => {
            const res = await request(app).get('/');

            expect(res.status).toBe(200);
            expect(res.body.message).toMatch(/API Gateway/);
            expect(res.body.endpoints).toMatchObject({
                health: '/health',
                auth: '/api/auth/*',
                backend: '/api/backend/*'
            });
        });
    });

    describe('unknown routes', () => {
        it('returns 404 for a route not handled by any proxy or endpoint', async () => {
            const res = await request(app).get('/does-not-exist');

            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Route not found' });
        });
    });

    describe('rate limiting', () => {
        it('sets standard rate limit headers on responses', async () => {
            const res = await request(app).get('/health');

            expect(res.headers).toHaveProperty('ratelimit-limit');
        });
    });
});
