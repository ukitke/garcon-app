import request from 'supertest';
import { app } from '../index';

describe('Health Check', () => {
  it('should return 200 OK for health endpoint', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('service', 'garcon-backend');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should return API information for /api/v1', async () => {
    const response = await request(app).get('/api/v1');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Garçon API v1');
    expect(response.body).toHaveProperty('version', '1.0.0');
    expect(response.body).toHaveProperty('endpoints');
  });

  it('should return 404 for unknown endpoints', async () => {
    const response = await request(app).get('/unknown-endpoint');
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});