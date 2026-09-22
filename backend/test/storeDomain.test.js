const request = require('supertest');
const app = require('../src/app');

describe('Store domains endpoints - auth protection', () => {
  test('GET /api/stores/123/domains without token returns 401', async () => {
    const res = await request(app).get('/api/stores/123/domains');
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/stores/123/domains without token returns 401', async () => {
    const res = await request(app).post('/api/stores/123/domains').send({ domain: 'example.com' });
    expect(res.statusCode).toBe(401);
  });
});
