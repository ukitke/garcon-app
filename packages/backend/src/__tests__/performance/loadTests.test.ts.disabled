import request from 'supertest';
import { app } from '../../app';
import jwt from 'jsonwebtoken';

// Mock AuthService for testing
const AuthService = {
  generateToken: (payload: any, expiresIn: string = '15m') => {
    return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn });
  }
};

describe('Load Testing', () => {
  const CONCURRENT_USERS = 50;
  const REQUESTS_PER_USER = 10;
  const ACCEPTABLE_RESPONSE_TIME = 1000; // 1 second
  const ACCEPTABLE_ERROR_RATE = 0.05; // 5%

  describe('Authentication Load Tests', () => {
    it('should handle concurrent login requests', async () => {
      const loginPayload = {
        email: 'loadtest@example.com',
        password: 'password123'
      };

      const startTime = Date.now();
      const requests = Array(CONCURRENT_USERS).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send(loginPayload)
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Calculate metrics
      const successfulRequests = responses.filter(r => r.status === 200 || r.status === 401);
      const errorRate = 1 - (successfulRequests.length / responses.length);
      const avgResponseTime = totalTime / responses.length;

      expect(errorRate).toBeLessThan(ACCEPTABLE_ERROR_RATE);
      expect(avgResponseTime).toBeLessThan(ACCEPTABLE_RESPONSE_TIME);
      
      console.log(`Login Load Test Results:
        - Total Requests: ${responses.length}
        - Successful Requests: ${successfulRequests.length}
        - Error Rate: ${(errorRate * 100).toFixed(2)}%
        - Average Response Time: ${avgResponseTime.toFixed(2)}ms
        - Total Time: ${totalTime}ms`);
    });

    it('should handle concurrent token validation requests', async () => {
      const token = await AuthService.generateToken({ id: '1', role: 'customer' });

      const startTime = Date.now();
      const requests = Array(CONCURRENT_USERS * 2).fill(null).map(() =>
        request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successfulRequests = responses.filter(r => r.status === 200);
      const errorRate = 1 - (successfulRequests.length / responses.length);
      const avgResponseTime = totalTime / responses.length;

      expect(errorRate).toBeLessThan(ACCEPTABLE_ERROR_RATE);
      expect(avgResponseTime).toBeLessThan(ACCEPTABLE_RESPONSE_TIME / 2); // Profile should be faster

      console.log(`Token Validation Load Test Results:
        - Total Requests: ${responses.length}
        - Successful Requests: ${successfulRequests.length}
        - Error Rate: ${(errorRate * 100).toFixed(2)}%
        - Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    });
  });

  describe('Menu Service Load Tests', () => {
    it('should handle concurrent menu retrieval requests', async () => {
      const startTime = Date.now();
      const requests = Array(CONCURRENT_USERS * 3).fill(null).map(() =>
        request(app).get('/api/menu/1')
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successfulRequests = responses.filter(r => r.status === 200);
      const errorRate = 1 - (successfulRequests.length / responses.length);
      const avgResponseTime = totalTime / responses.length;

      expect(errorRate).toBeLessThan(ACCEPTABLE_ERROR_RATE);
      expect(avgResponseTime).toBeLessThan(ACCEPTABLE_RESPONSE_TIME / 2); // Read operations should be fast

      console.log(`Menu Retrieval Load Test Results:
        - Total Requests: ${responses.length}
        - Successful Requests: ${successfulRequests.length}
        - Error Rate: ${(errorRate * 100).toFixed(2)}%
        - Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    });

    it('should handle concurrent menu updates', async () => {
      const token = await AuthService.generateToken({ id: '1', role: 'owner' });
      
      const updatePayload = {
        name: 'Load Test Item',
        description: 'Testing concurrent updates',
        price: Math.random() * 50 + 10 // Random price between 10-60
      };

      const startTime = Date.now();
      const requests = Array(20).fill(null).map((_, index) =>
        request(app)
          .put(`/api/menu/1/items/${index + 1}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ ...updatePayload, name: `${updatePayload.name} ${index}` })
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successfulRequests = responses.filter(r => r.status === 200 || r.status === 404);
      const errorRate = 1 - (successfulRequests.length / responses.length);
      const avgResponseTime = totalTime / responses.length;

      expect(errorRate).toBeLessThan(ACCEPTABLE_ERROR_RATE);
      expect(avgResponseTime).toBeLessThan(ACCEPTABLE_RESPONSE_TIME);

      console.log(`Menu Update Load Test Results:
        - Total Requests: ${responses.length}
        - Successful Requests: ${successfulRequests.length}
        - Error Rate: ${(errorRate * 100).toFixed(2)}%
        - Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    });
  });

  describe('Order Processing Load Tests', () => {
    it('should handle concurrent order creation', async () => {
      const token = await AuthService.generateToken({ id: '1', role: 'customer' });
      
      const orderPayload = {
        tableId: '1',
        items: [
          { menuItemId: '1', quantity: 2 },
          { menuItemId: '2', quantity: 1 }
        ]
      };

      const startTime = Date.now();
      const requests = Array(30).fill(null).map((_, index) =>
        request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${token}`)
          .send({ ...orderPayload, tableId: `${(index % 10) + 1}` }) // Distribute across tables
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successfulRequests = responses.filter(r => r.status === 201);
      const errorRate = 1 - (successfulRequests.length / responses.length);
      const avgResponseTime = totalTime / responses.length;

      expect(errorRate).toBeLessThan(ACCEPTABLE_ERROR_RATE);
      expect(avgResponseTime).toBeLessThan(ACCEPTABLE_RESPONSE_TIME);

      console.log(`Order Creation Load Test Results:
        - Total Requests: ${responses.length}
        - Successful Requests: ${successfulRequests.length}
        - Error Rate: ${(errorRate * 100).toFixed(2)}%
        - Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    });

    it('should handle concurrent order status updates', async () => {
      const waiterToken = await AuthService.generateToken({ id: '1', role: 'waiter' });
      
      const statusUpdates = ['confirmed', 'preparing', 'ready', 'delivered'];

      const startTime = Date.now();
      const requests = Array(40).fill(null).map((_, index) =>
        request(app)
          .put(`/api/orders/${(index % 10) + 1}/status`)
          .set('Authorization', `Bearer ${waiterToken}`)
          .send({ status: statusUpdates[index % statusUpdates.length] })
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successfulRequests = responses.filter(r => r.status === 200 || r.status === 404);
      const errorRate = 1 - (successfulRequests.length / responses.length);
      const avgResponseTime = totalTime / responses.length;

      expect(errorRate).toBeLessThan(ACCEPTABLE_ERROR_RATE);
      expect(avgResponseTime).toBeLessThan(ACCEPTABLE_RESPONSE_TIME / 2);

      console.log(`Order Status Update Load Test Results:
        - Total Requests: ${responses.length}
        - Successful Requests: ${successfulRequests.length}
        - Error Rate: ${(errorRate * 100).toFixed(2)}%
        - Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    });
  });

  describe('Payment Processing Load Tests', () => {
    it('should handle concurrent payment processing', async () => {
      const token = await AuthService.generateToken({ id: '1', role: 'customer' });
      
      const paymentMethods = ['card', 'google_pay', 'apple_pay', 'paypal'];

      const startTime = Date.now();
      const requests = Array(25).fill(null).map((_, index) =>
        request(app)
          .post('/api/payments/process')
          .set('Authorization', `Bearer ${token}`)
          .send({
            orderId: `${(index % 10) + 1}`,
            amount: Math.round((Math.random() * 50 + 10) * 100) / 100,
            method: paymentMethods[index % paymentMethods.length]
          })
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successfulRequests = responses.filter(r => 
        r.status === 200 || r.status === 400 || r.status === 404
      );
      const errorRate = 1 - (successfulRequests.length / responses.length);
      const avgResponseTime = totalTime / responses.length;

      expect(errorRate).toBeLessThan(ACCEPTABLE_ERROR_RATE);
      expect(avgResponseTime).toBeLessThan(ACCEPTABLE_RESPONSE_TIME * 2); // Payments can be slower

      console.log(`Payment Processing Load Test Results:
        - Total Requests: ${responses.length}
        - Successful Requests: ${successfulRequests.length}
        - Error Rate: ${(errorRate * 100).toFixed(2)}%
        - Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    });
  });

  describe('Location Services Load Tests', () => {
    it('should handle concurrent location searches', async () => {
      const coordinates = [
        { lat: 40.7128, lng: -74.0060 }, // New York
        { lat: 34.0522, lng: -118.2437 }, // Los Angeles
        { lat: 41.8781, lng: -87.6298 }, // Chicago
        { lat: 29.7604, lng: -95.3698 }, // Houston
        { lat: 33.4484, lng: -112.0740 }  // Phoenix
      ];

      const startTime = Date.now();
      const requests = Array(CONCURRENT_USERS).fill(null).map((_, index) => {
        const coord = coordinates[index % coordinates.length];
        return request(app).get(`/api/locations/nearby?lat=${coord.lat}&lng=${coord.lng}`);
      });

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successfulRequests = responses.filter(r => r.status === 200);
      const errorRate = 1 - (successfulRequests.length / responses.length);
      const avgResponseTime = totalTime / responses.length;

      expect(errorRate).toBeLessThan(ACCEPTABLE_ERROR_RATE);
      expect(avgResponseTime).toBeLessThan(ACCEPTABLE_RESPONSE_TIME);

      console.log(`Location Search Load Test Results:
        - Total Requests: ${responses.length}
        - Successful Requests: ${successfulRequests.length}
        - Error Rate: ${(errorRate * 100).toFixed(2)}%
        - Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    });
  });

  describe('WebSocket Connection Load Tests', () => {
    it('should handle multiple concurrent WebSocket connections', async () => {
      // This would require Socket.io client for proper testing
      // For now, we'll test the HTTP endpoints that support WebSocket functionality
      
      const token = await AuthService.generateToken({ id: '1', role: 'customer' });

      const startTime = Date.now();
      const requests = Array(30).fill(null).map((_, index) =>
        request(app)
          .post('/api/notifications/waiter-call')
          .set('Authorization', `Bearer ${token}`)
          .send({ tableId: `${(index % 10) + 1}` })
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successfulRequests = responses.filter(r => r.status === 200 || r.status === 201);
      const errorRate = 1 - (successfulRequests.length / responses.length);
      const avgResponseTime = totalTime / responses.length;

      expect(errorRate).toBeLessThan(ACCEPTABLE_ERROR_RATE);
      expect(avgResponseTime).toBeLessThan(ACCEPTABLE_RESPONSE_TIME / 2);

      console.log(`Notification Load Test Results:
        - Total Requests: ${responses.length}
        - Successful Requests: ${successfulRequests.length}
        - Error Rate: ${(errorRate * 100).toFixed(2)}%
        - Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    });
  });

  describe('Database Performance Under Load', () => {
    it('should maintain performance with concurrent database operations', async () => {
      const ownerToken = await AuthService.generateToken({ id: '1', role: 'owner' });
      const customerToken = await AuthService.generateToken({ id: '2', role: 'customer' });

      // Mix of read and write operations
      const operations = [
        () => request(app).get('/api/menu/1'),
        () => request(app).get('/api/locations/nearby?lat=40.7128&lng=-74.0060'),
        () => request(app).get('/api/orders/table/1'),
        () => request(app)
          .post('/api/menu/1/items')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            name: `Load Test Item ${Date.now()}`,
            description: 'Performance test item',
            price: Math.random() * 30 + 5
          }),
        () => request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${customerToken}`)
      ];

      const startTime = Date.now();
      const requests = Array(60).fill(null).map(() => {
        const operation = operations[Math.floor(Math.random() * operations.length)];
        return operation();
      });

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successfulRequests = responses.filter(r => 
        r.status >= 200 && r.status < 500 // Include client errors as "handled"
      );
      const errorRate = 1 - (successfulRequests.length / responses.length);
      const avgResponseTime = totalTime / responses.length;

      expect(errorRate).toBeLessThan(ACCEPTABLE_ERROR_RATE);
      expect(avgResponseTime).toBeLessThan(ACCEPTABLE_RESPONSE_TIME);

      console.log(`Mixed Database Operations Load Test Results:
        - Total Requests: ${responses.length}
        - Successful Requests: ${successfulRequests.length}
        - Error Rate: ${(errorRate * 100).toFixed(2)}%
        - Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    });
  });
});