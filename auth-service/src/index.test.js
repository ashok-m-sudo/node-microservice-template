const request = require('supertest');
const app = require('./index');

function uniqueUsername(prefix) {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

describe('Auth Service', () => {
    describe('GET /health', () => {
        it('returns 200 with healthy status', async () => {
            const res = await request(app).get('/health');

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                status: 'healthy',
                service: 'auth-service'
            });
        });
    });

    describe('POST /auth/register', () => {
        it('registers a new user', async () => {
            const username = uniqueUsername('user');

            const res = await request(app)
                .post('/auth/register')
                .send({ username, password: 'password123', email: `${username}@example.com` });

            expect(res.status).toBe(201);
            expect(res.body).toMatchObject({
                message: 'User registered successfully',
                username
            });
        });

        it('rejects registration missing required fields', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send({ username: 'incomplete' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBeDefined();
        });

        it('rejects duplicate registration for the same username', async () => {
            const username = uniqueUsername('dupe');
            const payload = { username, password: 'password123', email: `${username}@example.com` };

            await request(app).post('/auth/register').send(payload);
            const res = await request(app).post('/auth/register').send(payload);

            expect(res.status).toBe(409);
            expect(res.body.error).toMatch(/already exists/i);
        });
    });

    describe('POST /auth/login', () => {
        it('logs in a registered user and returns a JWT', async () => {
            const username = uniqueUsername('login');
            const password = 'password123';

            await request(app)
                .post('/auth/register')
                .send({ username, password, email: `${username}@example.com` });

            const res = await request(app)
                .post('/auth/login')
                .send({ username, password });

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
            expect(res.body.user).toMatchObject({ username });
        });

        it('rejects login with wrong password', async () => {
            const username = uniqueUsername('wrongpass');

            await request(app)
                .post('/auth/register')
                .send({ username, password: 'correct-password', email: `${username}@example.com` });

            const res = await request(app)
                .post('/auth/login')
                .send({ username, password: 'wrong-password' });

            expect(res.status).toBe(401);
        });

        it('rejects login for a nonexistent user', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({ username: uniqueUsername('ghost'), password: 'whatever' });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /auth/verify', () => {
        it('verifies a valid token issued at login', async () => {
            const username = uniqueUsername('verify');
            const password = 'password123';

            await request(app)
                .post('/auth/register')
                .send({ username, password, email: `${username}@example.com` });

            const loginRes = await request(app)
                .post('/auth/login')
                .send({ username, password });

            const verifyRes = await request(app)
                .get('/auth/verify')
                .set('Authorization', `Bearer ${loginRes.body.token}`);

            expect(verifyRes.status).toBe(200);
            expect(verifyRes.body.valid).toBe(true);
            expect(verifyRes.body.user).toMatchObject({ username });
        });

        it('rejects a missing token', async () => {
            const res = await request(app).get('/auth/verify');

            expect(res.status).toBe(401);
        });

        it('rejects an invalid token', async () => {
            const res = await request(app)
                .get('/auth/verify')
                .set('Authorization', 'Bearer not-a-real-token');

            expect(res.status).toBe(401);
            expect(res.body.valid).toBe(false);
        });
    });
});
