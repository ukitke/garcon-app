#!/usr/bin/env node

/**
 * Security and Performance Test Runner
 * 
 * This script runs comprehensive security and performance tests
 * and generates detailed reports for the Garçon application.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  duration: number;
  details: string[];
}

interface SecurityReport {
  vulnerabilityScans: TestResult;
  penetrationTests: TestResult;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    securityScore: number;
  };
}

interface PerformanceReport {
  loadTests: TestResult;
  benchmarks: TestResult;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    avgResponseTime: number;
    throughput: number;
  };
}

class SecurityPerformanceRunner {
  private resultsDir: string;

  constructor() {
    this.resultsDir = path.join(__dirname, '../../test-results');
    this.ensureResultsDirectory();
  }

  private ensureResultsDirectory(): void {
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  private parseJestOutput(output: string): TestResult {
    const lines = output.split('\n');
    let passed = 0;
    let failed = 0;
    let duration = 0;
    const details: string[] = [];

    for (const line of lines) {
      if (line.includes('✓') || line.includes('PASS')) {
        passed++;
      } else if (line.includes('✗') || line.includes('FAIL')) {
        failed++;
        details.push(line.trim());
      } else if (line.includes('Time:')) {
        const timeMatch = line.match(/Time:\s*(\d+\.?\d*)\s*s/);
        if (timeMatch) {
          duration = parseFloat(timeMatch[1]) * 1000; // Convert to ms
        }
      }
    }

    return {
      suite: 'Unknown',
      passed,
      failed,
      duration,
      details
    };
  }

  async runSecurityTests(): Promise<SecurityReport> {
    console.log('🔒 Running Security Tests...\n');

    // Run vulnerability scans
    console.log('Running vulnerability scans...');
    let vulnerabilityResult: TestResult;
    try {
      const output = execSync(
        'npm test -- --testPathPattern=vulnerabilityScans.test.ts --verbose',
        { encoding: 'utf8', cwd: path.join(__dirname, '../..') }
      );
      vulnerabilityResult = this.parseJestOutput(output);
      vulnerabilityResult.suite = 'Vulnerability Scans';
      console.log('✅ Vulnerability scans completed');
    } catch (error) {
      console.log('❌ Vulnerability scans failed');
      vulnerabilityResult = {
        suite: 'Vulnerability Scans',
        passed: 0,
        failed: 1,
        duration: 0,
        details: [error instanceof Error ? error.message : 'Unknown error']
      };
    }

    // Run penetration tests
    console.log('Running penetration tests...');
    let penetrationResult: TestResult;
    try {
      const output = execSync(
        'npm test -- --testPathPattern=penetrationTests.test.ts --verbose',
        { encoding: 'utf8', cwd: path.join(__dirname, '../..') }
      );
      penetrationResult = this.parseJestOutput(output);
      penetrationResult.suite = 'Penetration Tests';
      console.log('✅ Penetration tests completed');
    } catch (error) {
      console.log('❌ Penetration tests failed');
      penetrationResult = {
        suite: 'Penetration Tests',
        passed: 0,
        failed: 1,
        duration: 0,
        details: [error instanceof Error ? error.message : 'Unknown error']
      };
    }

    const totalTests = vulnerabilityResult.passed + vulnerabilityResult.failed + 
                      penetrationResult.passed + penetrationResult.failed;
    const totalPassed = vulnerabilityResult.passed + penetrationResult.passed;
    const totalFailed = vulnerabilityResult.failed + penetrationResult.failed;
    const securityScore = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

    return {
      vulnerabilityScans: vulnerabilityResult,
      penetrationTests: penetrationResult,
      summary: {
        totalTests,
        passed: totalPassed,
        failed: totalFailed,
        securityScore
      }
    };
  }

  async runPerformanceTests(): Promise<PerformanceReport> {
    console.log('\n⚡ Running Performance Tests...\n');

    // Run load tests
    console.log('Running load tests...');
    let loadTestResult: TestResult;
    try {
      const output = execSync(
        'npm test -- --testPathPattern=loadTests.test.ts --verbose --runInBand',
        { encoding: 'utf8', cwd: path.join(__dirname, '../..') }
      );
      loadTestResult = this.parseJestOutput(output);
      loadTestResult.suite = 'Load Tests';
      console.log('✅ Load tests completed');
    } catch (error) {
      console.log('❌ Load tests failed');
      loadTestResult = {
        suite: 'Load Tests',
        passed: 0,
        failed: 1,
        duration: 0,
        details: [error instanceof Error ? error.message : 'Unknown error']
      };
    }

    // Run benchmarks
    console.log('Running performance benchmarks...');
    let benchmarkResult: TestResult;
    try {
      const output = execSync(
        'npm test -- --testPathPattern=benchmarks.test.ts --verbose --runInBand',
        { encoding: 'utf8', cwd: path.join(__dirname, '../..') }
      );
      benchmarkResult = this.parseJestOutput(output);
      benchmarkResult.suite = 'Performance Benchmarks';
      console.log('✅ Performance benchmarks completed');
    } catch (error) {
      console.log('❌ Performance benchmarks failed');
      benchmarkResult = {
        suite: 'Performance Benchmarks',
        passed: 0,
        failed: 1,
        duration: 0,
        details: [error instanceof Error ? error.message : 'Unknown error']
      };
    }

    const totalTests = loadTestResult.passed + loadTestResult.failed + 
                      benchmarkResult.passed + benchmarkResult.failed;
    const totalPassed = loadTestResult.passed + benchmarkResult.passed;
    const totalFailed = loadTestResult.failed + benchmarkResult.failed;
    
    // Calculate average response time and throughput from test results
    const avgResponseTime = (loadTestResult.duration + benchmarkResult.duration) / 2;
    const throughput = totalTests > 0 ? (totalTests / (avgResponseTime / 1000)) : 0;

    return {
      loadTests: loadTestResult,
      benchmarks: benchmarkResult,
      summary: {
        totalTests,
        passed: totalPassed,
        failed: totalFailed,
        avgResponseTime,
        throughput
      }
    };
  }

  private generateSecurityReport(report: SecurityReport): string {
    const timestamp = new Date().toISOString();
    
    return `
# Security Test Report

**Generated:** ${timestamp}

## Summary
- **Total Tests:** ${report.summary.totalTests}
- **Passed:** ${report.summary.passed}
- **Failed:** ${report.summary.failed}
- **Security Score:** ${report.summary.securityScore.toFixed(2)}%

## Vulnerability Scans
- **Passed:** ${report.vulnerabilityScans.passed}
- **Failed:** ${report.vulnerabilityScans.failed}
- **Duration:** ${report.vulnerabilityScans.duration}ms

${report.vulnerabilityScans.details.length > 0 ? 
  '### Issues Found:\n' + report.vulnerabilityScans.details.map(d => `- ${d}`).join('\n') : 
  '### ✅ No vulnerabilities detected'}

## Penetration Tests
- **Passed:** ${report.penetrationTests.passed}
- **Failed:** ${report.penetrationTests.failed}
- **Duration:** ${report.penetrationTests.duration}ms

${report.penetrationTests.details.length > 0 ? 
  '### Issues Found:\n' + report.penetrationTests.details.map(d => `- ${d}`).join('\n') : 
  '### ✅ All penetration tests passed'}

## Recommendations

${report.summary.securityScore >= 90 ? 
  '✅ **Excellent security posture.** Continue monitoring and regular testing.' :
  report.summary.securityScore >= 70 ?
  '⚠️ **Good security posture** with some areas for improvement. Address failed tests.' :
  '🚨 **Security concerns detected.** Immediate attention required for failed tests.'}

---
*Report generated by Garçon Security Test Suite*
`;
  }

  private generatePerformanceReport(report: PerformanceReport): string {
    const timestamp = new Date().toISOString();
    
    return `
# Performance Test Report

**Generated:** ${timestamp}

## Summary
- **Total Tests:** ${report.summary.totalTests}
- **Passed:** ${report.summary.passed}
- **Failed:** ${report.summary.failed}
- **Average Response Time:** ${report.summary.avgResponseTime.toFixed(2)}ms
- **Throughput:** ${report.summary.throughput.toFixed(2)} req/sec

## Load Tests
- **Passed:** ${report.loadTests.passed}
- **Failed:** ${report.loadTests.failed}
- **Duration:** ${report.loadTests.duration}ms

${report.loadTests.details.length > 0 ? 
  '### Performance Issues:\n' + report.loadTests.details.map(d => `- ${d}`).join('\n') : 
  '### ✅ All load tests passed'}

## Performance Benchmarks
- **Passed:** ${report.benchmarks.passed}
- **Failed:** ${report.benchmarks.failed}
- **Duration:** ${report.benchmarks.duration}ms

${report.benchmarks.details.length > 0 ? 
  '### Benchmark Issues:\n' + report.benchmarks.details.map(d => `- ${d}`).join('\n') : 
  '### ✅ All benchmarks met performance thresholds'}

## Performance Analysis

${report.summary.avgResponseTime <= 500 ? 
  '✅ **Excellent performance.** Response times are well within acceptable limits.' :
  report.summary.avgResponseTime <= 1000 ?
  '⚠️ **Good performance** with room for optimization. Monitor response times.' :
  '🚨 **Performance concerns.** Response times exceed recommended thresholds.'}

${report.summary.throughput >= 50 ? 
  '✅ **High throughput capability.** System can handle significant load.' :
  report.summary.throughput >= 20 ?
  '⚠️ **Moderate throughput.** Consider optimization for higher loads.' :
  '🚨 **Low throughput.** Performance optimization required.'}

## Recommendations

### Response Time Optimization
- Implement caching strategies for frequently accessed data
- Optimize database queries and add appropriate indexes
- Consider CDN for static assets

### Scalability Improvements
- Implement horizontal scaling with load balancers
- Use connection pooling for database connections
- Consider microservices architecture for better resource utilization

### Monitoring
- Set up real-time performance monitoring
- Implement alerting for response time thresholds
- Regular performance testing in CI/CD pipeline

---
*Report generated by Garçon Performance Test Suite*
`;
  }

  private saveReport(filename: string, content: string): void {
    const filepath = path.join(this.resultsDir, filename);
    fs.writeFileSync(filepath, content);
    console.log(`📄 Report saved: ${filepath}`);
  }

  async run(): Promise<void> {
    console.log('🚀 Starting Garçon Security and Performance Test Suite\n');
    
    const startTime = Date.now();

    try {
      // Run security tests
      const securityReport = await this.runSecurityTests();
      
      // Run performance tests
      const performanceReport = await this.runPerformanceTests();

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Generate and save reports
      console.log('\n📊 Generating Reports...\n');
      
      const securityReportContent = this.generateSecurityReport(securityReport);
      const performanceReportContent = this.generatePerformanceReport(performanceReport);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      this.saveReport(`security-report-${timestamp}.md`, securityReportContent);
      this.saveReport(`performance-report-${timestamp}.md`, performanceReportContent);

      // Generate combined summary
      const combinedSummary = `
# Garçon Test Suite Summary

**Total Duration:** ${totalDuration}ms

## Security Results
- Tests: ${securityReport.summary.totalTests}
- Passed: ${securityReport.summary.passed}
- Failed: ${securityReport.summary.failed}
- Score: ${securityReport.summary.securityScore.toFixed(2)}%

## Performance Results
- Tests: ${performanceReport.summary.totalTests}
- Passed: ${performanceReport.summary.passed}
- Failed: ${performanceReport.summary.failed}
- Avg Response Time: ${performanceReport.summary.avgResponseTime.toFixed(2)}ms
- Throughput: ${performanceReport.summary.throughput.toFixed(2)} req/sec

## Overall Status
${securityReport.summary.securityScore >= 80 && performanceReport.summary.failed === 0 ? 
  '✅ **PASS** - System meets security and performance requirements' :
  '❌ **ATTENTION REQUIRED** - Review detailed reports for issues'}
`;

      this.saveReport(`test-summary-${timestamp}.md`, combinedSummary);

      console.log('\n🎉 Test Suite Completed Successfully!');
      console.log(`📁 Results saved in: ${this.resultsDir}`);
      
    } catch (error) {
      console.error('\n❌ Test Suite Failed:', error);
      process.exit(1);
    }
  }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
  const runner = new SecurityPerformanceRunner();
  runner.run().catch(console.error);
}

export { SecurityPerformanceRunner };