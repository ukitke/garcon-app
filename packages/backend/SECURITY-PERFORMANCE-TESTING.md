# Security and Performance Testing Guide

This document describes the comprehensive security and performance testing suite implemented for the Garçon application.

## Overview

The testing suite includes:
- **Security Tests**: Penetration testing and vulnerability scans
- **Performance Tests**: Load testing and performance benchmarking
- **Automated Reporting**: Detailed reports with recommendations

## Test Structure

```
src/__tests__/
├── security/
│   ├── penetrationTests.test.ts    # Security penetration tests
│   └── vulnerabilityScans.test.ts  # Vulnerability scanning tests
├── performance/
│   ├── loadTests.test.ts           # Load testing under concurrent users
│   └── benchmarks.test.ts          # Performance benchmarking
├── setup.ts                       # Test environment setup
└── security-performance-runner.ts # Automated test runner
```

## Security Tests

### Penetration Tests (`penetrationTests.test.ts`)

Tests for common security vulnerabilities:

- **SQL Injection Protection**
  - Login endpoint injection attempts
  - Location search injection
  - Menu item creation injection

- **XSS Protection**
  - Script tag sanitization in menu descriptions
  - HTML sanitization in review comments

- **Authentication Bypass Attempts**
  - Malformed JWT token validation
  - Expired token handling
  - Privilege escalation prevention

- **Input Validation Attacks**
  - Oversized payload rejection
  - Email format validation
  - Phone number validation

- **Rate Limiting Protection**
  - Login attempt rate limiting
  - Password reset rate limiting

- **CORS Security**
  - Unauthorized origin rejection

- **File Upload Security**
  - Malicious file upload prevention
  - File size limit validation

- **Session Security**
  - Session invalidation on logout
  - Session fixation prevention

### Vulnerability Scans (`vulnerabilityScans.test.ts`)

Comprehensive vulnerability scanning:

- **Information Disclosure**
  - Server information exposure
  - Database error exposure
  - Stack trace exposure

- **HTTP Security Headers**
  - Security header validation
  - Secure cookie attributes

- **Injection Vulnerabilities**
  - NoSQL injection prevention
  - Command injection prevention
  - LDAP injection prevention

- **Authentication Vulnerabilities**
  - Timing attack prevention
  - Password enumeration prevention
  - Strong password policy enforcement

- **Authorization Vulnerabilities**
  - Horizontal privilege escalation prevention
  - Vertical privilege escalation prevention
  - Resource ownership validation

- **Data Validation Vulnerabilities**
  - Mass assignment attack prevention
  - Numeric range validation

- **Business Logic Vulnerabilities**
  - Race condition prevention
  - Payment amount manipulation prevention
  - Double spending prevention

- **Cryptographic Vulnerabilities**
  - Secure random number generation
  - Proper password hashing

## Performance Tests

### Load Tests (`loadTests.test.ts`)

Tests system behavior under concurrent load:

- **Authentication Load Tests**
  - Concurrent login requests (50 users)
  - Token validation under load (100 requests)

- **Menu Service Load Tests**
  - Concurrent menu retrieval (150 requests)
  - Concurrent menu updates (20 requests)

- **Order Processing Load Tests**
  - Concurrent order creation (30 orders)
  - Concurrent order status updates (40 updates)

- **Payment Processing Load Tests**
  - Concurrent payment processing (25 payments)

- **Location Services Load Tests**
  - Concurrent location searches (50 searches)

- **WebSocket Connection Load Tests**
  - Multiple concurrent notifications (30 calls)

- **Database Performance Under Load**
  - Mixed read/write operations (60 operations)

### Performance Benchmarks (`benchmarks.test.ts`)

Detailed performance measurements:

- **API Response Time Benchmarks**
  - Health check response time (< 100ms)
  - Authentication response time (< 500ms)
  - Menu retrieval response time (< 200ms)
  - Order processing response time (< 500ms)
  - Location search response time (< 200ms)

- **Database Performance Benchmarks**
  - Complex analytics queries (< 1000ms)
  - Batch operations efficiency

- **Memory Usage Benchmarks**
  - Memory usage under load (< 1MB increase per 100 requests)

- **Caching Performance Benchmarks**
  - Cache hit/miss performance comparison
  - Speed improvement measurement

- **Concurrent User Simulation**
  - Realistic user behavior patterns (20 users, 5 actions each)
  - Throughput measurement (> 10 req/sec)

- **Resource Utilization Benchmarks**
  - CPU usage monitoring (< 90% under load)

## Performance Thresholds

| Operation Type | Threshold | Description |
|---------------|-----------|-------------|
| Fast Endpoint | 100ms | Cached/simple operations |
| Normal Endpoint | 500ms | Standard operations |
| Slow Endpoint | 1000ms | Complex operations |
| Database Query | 200ms | Database queries |
| File Upload | 2000ms | File operations |

## Running Tests

### Individual Test Suites

```bash
# Run all security tests
npm run test:security

# Run all performance tests
npm run test:performance

# Run specific test types
npm run test:penetration
npm run test:vulnerability
npm run test:load
npm run test:benchmark
```

### Comprehensive Test Suite

```bash
# Run complete security and performance test suite with reporting
npm run test:security-performance
```

This command will:
1. Run all security tests
2. Run all performance tests
3. Generate detailed reports
4. Save results to `test-results/` directory

### Test Configuration

The tests use a specialized Jest configuration (`jest.security-performance.config.js`) with:
- 30-second timeout for performance tests
- Sequential execution for accurate measurements
- Detailed reporting with JUnit output

## Test Reports

The automated test runner generates three types of reports:

### Security Report
- Vulnerability scan results
- Penetration test results
- Security score calculation
- Detailed recommendations

### Performance Report
- Load test results
- Benchmark measurements
- Response time analysis
- Throughput calculations
- Performance recommendations

### Combined Summary
- Overall test status
- Key metrics summary
- Pass/fail overview

Reports are saved in Markdown format with timestamps for tracking improvements over time.

## Continuous Integration

### GitHub Actions Integration

Add to your CI pipeline:

```yaml
- name: Run Security and Performance Tests
  run: |
    cd packages/backend
    npm run test:security-performance
    
- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: security-performance-reports
    path: packages/backend/test-results/
```

### Monitoring and Alerting

Set up monitoring for:
- Security test failures (immediate alert)
- Performance degradation (> 20% increase in response times)
- Error rate increases (> 5% error rate)

## Best Practices

### Security Testing
1. Run security tests on every deployment
2. Update tests when adding new endpoints
3. Review security reports regularly
4. Address failed security tests immediately

### Performance Testing
1. Establish baseline performance metrics
2. Run performance tests in production-like environment
3. Monitor trends over time
4. Set up alerts for performance degradation

### Test Maintenance
1. Update test thresholds based on infrastructure changes
2. Add new test cases for new features
3. Review and update security test scenarios regularly
4. Keep performance benchmarks realistic and achievable

## Troubleshooting

### Common Issues

**Tests timing out:**
- Increase Jest timeout in configuration
- Check database connection performance
- Verify external service mocks are working

**High error rates in load tests:**
- Check rate limiting configuration
- Verify database connection pool size
- Monitor system resources during tests

**Security tests failing:**
- Review security middleware configuration
- Check input validation rules
- Verify authentication/authorization logic

### Performance Optimization

If performance tests fail:
1. Profile slow endpoints
2. Optimize database queries
3. Implement caching strategies
4. Review resource utilization
5. Consider horizontal scaling

## Security Hardening

If security tests fail:
1. Review input validation
2. Update security headers
3. Strengthen authentication
4. Implement rate limiting
5. Audit authorization logic

## Reporting Issues

When reporting performance or security issues:
1. Include test report outputs
2. Specify environment details
3. Provide reproduction steps
4. Include system resource usage
5. Attach relevant logs