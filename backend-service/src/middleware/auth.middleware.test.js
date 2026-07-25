jest.mock('axios');
const axios = require('axios');
const request = require('supertest');
const express = require('express');
const authMiddleware = require('./auth.middleware');

function buildApp() {
    const app = express();
    app.get('/protected', authMiddleware, (req, res) => {
        res.status(200).json({ user: req.user });
    });
    return app;
}

describe('auth middleware', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    it('rejects requests with no authorization header', async () => {
        const app = buildApp();

        const res = await request(app).get('/protected');

        expect(res.status).toBe(401);
        expect(axios.get).not.toHaveBeenCalled();
    });

    it('attaches req.user and calls next when auth-service confirms a valid token', async () => {
        axios.get.mockResolvedValue({ data: { valid: true, user: { username: 'alice' } } });
        const app = buildApp();

        const res = await request(app)
            .get('/protected')
            .set('Authorization', 'Bearer valid-token');

        expect(res.status).toBe(200);
        expect(res.body.user).toMatchObject({ username: 'alice' });
    });

    it('rejects when auth-service reports the token invalid', async () => {
        axios.get.mockResolvedValue({ data: { valid: false } });
        const app = buildApp();

        const res = await request(app)
            .get('/protected')
            .set('Authorization', 'Bearer bad-token');

        expect(res.status).toBe(401);
    });

    it('rejects when auth-service is unreachable', async () => {
        axios.get.mockRejectedValue(new Error('connect ECONNREFUSED'));
        const app = buildApp();

        const res = await request(app)
            .get('/protected')
            .set('Authorization', 'Bearer some-token');

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/Authentication failed/);
    });
});
