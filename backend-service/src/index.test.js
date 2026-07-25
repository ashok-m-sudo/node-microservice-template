jest.mock('axios');
const axios = require('axios');
const request = require('supertest');
const app = require('./index');

const AUTH_HEADER = 'Bearer valid-token';

beforeEach(() => {
    axios.get.mockResolvedValue({ data: { valid: true, user: { username: 'alice' } } });
});

afterEach(() => {
    jest.resetAllMocks();
});

describe('Backend Service', () => {
    describe('GET /health', () => {
        it('returns 200 without requiring authentication', async () => {
            const res = await request(app).get('/health');

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                status: 'healthy',
                service: 'backend-service'
            });
            expect(axios.get).not.toHaveBeenCalled();
        });
    });

    describe('authentication', () => {
        it('rejects /api/data with no authorization header', async () => {
            const res = await request(app).get('/api/data');

            expect(res.status).toBe(401);
        });
    });

    describe('data CRUD', () => {
        it('creates, lists, fetches, updates and deletes an item', async () => {
            const createRes = await request(app)
                .post('/api/data')
                .set('Authorization', AUTH_HEADER)
                .send({ title: 'First item', description: 'desc' });

            expect(createRes.status).toBe(201);
            const { id } = createRes.body.data;
            expect(createRes.body.data).toMatchObject({
                title: 'First item',
                description: 'desc',
                createdBy: 'alice'
            });

            const listRes = await request(app)
                .get('/api/data')
                .set('Authorization', AUTH_HEADER);

            expect(listRes.status).toBe(200);
            expect(listRes.body.data.some((item) => item.id === id)).toBe(true);

            const getRes = await request(app)
                .get(`/api/data/${id}`)
                .set('Authorization', AUTH_HEADER);

            expect(getRes.status).toBe(200);
            expect(getRes.body.data.id).toBe(id);

            const updateRes = await request(app)
                .put(`/api/data/${id}`)
                .set('Authorization', AUTH_HEADER)
                .send({ title: 'Updated title' });

            expect(updateRes.status).toBe(200);
            expect(updateRes.body.data.title).toBe('Updated title');

            const deleteRes = await request(app)
                .delete(`/api/data/${id}`)
                .set('Authorization', AUTH_HEADER);

            expect(deleteRes.status).toBe(200);

            const getAfterDeleteRes = await request(app)
                .get(`/api/data/${id}`)
                .set('Authorization', AUTH_HEADER);

            expect(getAfterDeleteRes.status).toBe(404);
        });

        it('rejects creating data without a title', async () => {
            const res = await request(app)
                .post('/api/data')
                .set('Authorization', AUTH_HEADER)
                .send({ description: 'no title here' });

            expect(res.status).toBe(400);
        });

        it('returns 404 for a nonexistent item id', async () => {
            const res = await request(app)
                .get('/api/data/999999')
                .set('Authorization', AUTH_HEADER);

            expect(res.status).toBe(404);
        });
    });
});
