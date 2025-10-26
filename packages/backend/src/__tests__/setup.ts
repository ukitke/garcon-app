import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for performance tests
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Initialize test database if needed
  console.log('🔧 Setting up test environment...');
});

afterAll(async () => {
  // Cleanup test resources
  console.log('🧹 Cleaning up test environment...');
});

// Mock external services for security tests
jest.mock('../services/paymentProviders/stripeProvider', () => ({
  StripeProvider: {
    processPayment: jest.fn().mockResolvedValue({ success: true, transactionId: 'test_tx_123' }),
    refundPayment: jest.fn().mockResolvedValue({ success: true })
  }
}));

jest.mock('../services/paymentProviders/paypalProvider', () => ({
  PayPalProvider: {
    processPayment: jest.fn().mockResolvedValue({ success: true, transactionId: 'test_pp_123' }),
    refundPayment: jest.fn().mockResolvedValue({ success: true })
  }
}));

// Performance monitoring utilities
global.performanceMonitor = {
  startTimer: () => Date.now(),
  endTimer: (start: number) => Date.now() - start,
  measureMemory: () => process.memoryUsage(),
  measureCPU: () => process.cpuUsage()
};

// Security test utilities
global.securityUtils = {
  generateMaliciousPayload: (type: string) => {
    const payloads = {
      sql: "'; DROP TABLE users; --",
      xss: '<script>alert("XSS")</script>',
      nosql: { $ne: null },
      command: '; rm -rf /',
      ldap: ')(|(password=*))'
    };
    return payloads[type as keyof typeof payloads] || '';
  },
  
  generateOversizedPayload: (size: number) => 'A'.repeat(size),
  
  generateInvalidEmails: () => [
    'notanemail',
    '@domain.com',
    'user@',
    'user..user@domain.com',
    'user@domain',
    '<script>alert("xss")</script>@domain.com'
  ]
};

// Extend Jest matchers for performance assertions
expect.extend({
  toBeWithinPerformanceThreshold(received: number, threshold: number) {
    const pass = received <= threshold;
    return {
      message: () => 
        pass 
          ? `Expected ${received}ms to exceed ${threshold}ms threshold`
          : `Expected ${received}ms to be within ${threshold}ms threshold`,
      pass
    };
  },
  
  toHaveAcceptableErrorRate(received: number, maxErrorRate: number) {
    const pass = received <= maxErrorRate;
    return {
      message: () =>
        pass
          ? `Expected error rate ${received} to exceed ${maxErrorRate}`
          : `Expected error rate ${received} to be within acceptable limit ${maxErrorRate}`,
      pass
    };
  }
});

// Type declarations for global utilities
declare global {
  var performanceMonitor: {
    startTimer: () => number;
    endTimer: (start: number) => number;
    measureMemory: () => NodeJS.MemoryUsage;
    measureCPU: () => NodeJS.CpuUsage;
  };
  
  var securityUtils: {
    generateMaliciousPayload: (type: string) => any;
    generateOversizedPayload: (size: number) => string;
    generateInvalidEmails: () => string[];
  };
  
  namespace jest {
    interface Matchers<R> {
      toBeWithinPerformanceThreshold(threshold: number): R;
      toHaveAcceptableErrorRate(maxErrorRate: number): R;
    }
  }
}