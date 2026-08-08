import request from 'supertest';
import app from '../src/app';

describe('Auth API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeTruthy();
    });

    it('should return JSON response with success flag', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({});

      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 400 when credentials missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 when no token provided', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when invalid token provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid_token_here');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});

describe('Health Check', () => {
  it('GET /health should return 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.service).toBe('RESTREN-SYSTEM-API');
  });
});

describe('404 Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nonexistent-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
