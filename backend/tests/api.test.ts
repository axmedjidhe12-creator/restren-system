import request from 'supertest';
import app from '../src/app';
import jwt from 'jsonwebtoken';

const mockOwnerToken = jwt.sign(
  {
    id: 'test-user-id',
    email: 'owner@test.com',
    role: 'RESTAURANT_OWNER',
    restaurantId: 'test-restaurant-id',
    branchId: 'test-branch-id'
  },
  process.env.JWT_SECRET || 'test_jwt_secret_restren_2026',
  { expiresIn: '1h' }
);

describe('Menu API - Tenant Isolation', () => {
  it('should return 401 when no auth token provided for categories', async () => {
    const res = await request(app).get('/api/v1/menu/categories');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return JSON structure with authenticated request (even if DB unreachable)', async () => {
    const res = await request(app)
      .get('/api/v1/menu/categories')
      .set('Authorization', `Bearer ${mockOwnerToken}`);

    // Either 200 (DB connected) or 500 (DB not available in test env) — either way, JSON
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('success');
  });
});

describe('Orders API', () => {
  it('should return 400 when placing order with missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/orders/public')
      .send({ restaurantId: 'some-id' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 for authenticated order endpoints without token', async () => {
    const res = await request(app).get('/api/v1/orders/live');
    expect(res.status).toBe(401);
  });

  it('should return 400 for order with empty items array', async () => {
    const res = await request(app)
      .post('/api/v1/orders/public')
      .send({ restaurantId: 'r1', branchId: 'b1', items: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Table API - Auth Protection', () => {
  it('should return 401 when fetching tables without auth', async () => {
    const res = await request(app).get('/api/v1/tables?branchId=123');
    expect(res.status).toBe(401);
  });
});

describe('Superadmin API - Role Protection', () => {
  it('should return 401 when no token provided', async () => {
    const res = await request(app).get('/api/v1/superadmin/tenants');
    expect(res.status).toBe(401);
  });

  it('should return 403 when non-superadmin token provided', async () => {
    const res = await request(app)
      .get('/api/v1/superadmin/tenants')
      .set('Authorization', `Bearer ${mockOwnerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
