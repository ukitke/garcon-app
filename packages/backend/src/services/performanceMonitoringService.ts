import { EventEmitter } from 'events';
import { performance, PerformanceObserver } from 'perf_hooks';
import { Pool } from 'pg';
// import { Redis } from 'ioredis';
import os from 'os';
import process from 'process';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    used: number;
    free: number;
    total: number;
    usage: number;
    heapUsed: number;
    heapTotal: number;
  };
  disk: {
    usage: number;
    free: number;
    total: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
}

interface ApplicationMetrics {
  requests: {
    total: number;
    perSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
  database: {
    connections: number;
    queryTime: number;
    slowQueries: number;
  };
  cache: {
    hitRate: number;
    memoryUsage: number;
    operations: number;
  };
  websockets: {
    connections: number;
    messagesPerSecond: number;
  };
}

interface PerformanceAlert {
  id: string;
  type: 'cpu' | 'memory' | 'disk' | 'response_time' | 'error_rate' | 'database' | 'cache';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
}

interface PerformanceThresholds {
  cpu: { warning: number; critical: number };
  memory: { warning: number; critical: number };
  disk: { warning: number; critical: number };
  responseTime: { warning: number; critical: number };
  errorRate: { warning: number; critical: number };
  databaseConnections: { warning: number; critical: number };
  cacheHitRate: { warning: number; critical: number };
}

class PerformanceMonitoringService extends EventEmitter {
  private dbPool: Pool;
  private redis: any;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private alerts: PerformanceAlert[] = [];
  private thresholds: PerformanceThresholds;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private requestMetrics: {
    count: number;
    totalTime: number;
    errors: number;
    lastReset: number;
  } = {
    count: 0,
    totalTime: 0,
    errors: 0,
    lastReset: Date.now(),
  };

  constructor(dbPool: Pool, redis: any) {
    super();
    this.dbPool = dbPool;
    this.redis = redis;
    
    this.thresholds = {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 80, critical: 95 },
      disk: { warning: 85, critical: 95 },
      responseTime: { warning: 1000, critical: 3000 }, // milliseconds
      errorRate: { warning: 5, critical: 10 }, // percentage
      databaseConnections: { warning: 80, critical: 95 }, // percentage of max
      cacheHitRate: { warning: 80, critical: 60 }, // percentage (lower is worse)
    };
    
    this.setupPerformanceObserver();
    this.startMonitoring();
  }

  private setupPerformanceObserver() {
    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        this.recordMetric({
          name: entry.name,
          value: entry.duration,
          unit: 'ms',
          timestamp: new Date(),
          tags: {
            type: entry.entryType,
          },
        });
      });
    });
    
    this.performanceObserver.observe({ entryTypes: ['measure', 'measure', 'resource'] });
  }

  private startMonitoring() {
    // Collect metrics every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.collectSystemMetrics();
      await this.collectApplicationMetrics();
      await this.checkThresholds();
      await this.cleanupOldMetrics();
    }, 30000);
    
    // Reset request metrics every minute
    setInterval(() => {
      this.resetRequestMetrics();
    }, 60000);
  }

  public recordMetric(metric: PerformanceMetric) {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    
    const metricArray = this.metrics.get(metric.name)!;
    metricArray.push(metric);
    
    // Keep only last 1000 metrics per type
    if (metricArray.length > 1000) {
      metricArray.splice(0, metricArray.length - 1000);
    }
    
    // Store in Redis for persistence
    this.storeMetricInRedis(metric);
  }

  private async storeMetricInRedis(metric: PerformanceMetric) {
    try {
      const key = `metrics:${metric.name}:${Math.floor(metric.timestamp.getTime() / 60000)}`; // Per minute
      await this.redis.lpush(key, JSON.stringify(metric));
      await this.redis.expire(key, 86400); // Keep for 24 hours
    } catch (error) {
      console.error('Failed to store metric in Redis:', error);
    }
  }

  public recordRequest(responseTime: number, isError: boolean = false) {
    this.requestMetrics.count++;
    this.requestMetrics.totalTime += responseTime;
    
    if (isError) {
      this.requestMetrics.errors++;
    }
    
    // Record individual request metric
    this.recordMetric({
      name: 'http_request_duration',
      value: responseTime,
      unit: 'ms',
      timestamp: new Date(),
      tags: {
        status: isError ? 'error' : 'success',
      },
    });
  }

  private resetRequestMetrics() {
    const now = Date.now();
    const timeDiff = (now - this.requestMetrics.lastReset) / 1000; // seconds
    
    // Calculate rates
    const requestsPerSecond = this.requestMetrics.count / timeDiff;
    const averageResponseTime = this.requestMetrics.count > 0 
      ? this.requestMetrics.totalTime / this.requestMetrics.count 
      : 0;
    const errorRate = this.requestMetrics.count > 0 
      ? (this.requestMetrics.errors / this.requestMetrics.count) * 100 
      : 0;
    
    // Record aggregated metrics
    this.recordMetric({
      name: 'requests_per_second',
      value: requestsPerSecond,
      unit: 'req/s',
      timestamp: new Date(),
    });
    
    this.recordMetric({
      name: 'average_response_time',
      value: averageResponseTime,
      unit: 'ms',
      timestamp: new Date(),
    });
    
    this.recordMetric({
      name: 'error_rate',
      value: errorRate,
      unit: '%',
      timestamp: new Date(),
    });
    
    // Reset counters
    this.requestMetrics = {
      count: 0,
      totalTime: 0,
      errors: 0,
      lastReset: now,
    };
  }

  private async collectSystemMetrics() {
    try {
      // CPU metrics
      const cpuUsage = await this.getCPUUsage();
      const loadAverage = os.loadavg();
      
      this.recordMetric({
        name: 'cpu_usage',
        value: cpuUsage,
        unit: '%',
        timestamp: new Date(),
      });
      
      this.recordMetric({
        name: 'load_average_1m',
        value: loadAverage[0],
        unit: 'load',
        timestamp: new Date(),
      });
      
      // Memory metrics
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      
      this.recordMetric({
        name: 'memory_usage',
        value: memoryUsagePercent,
        unit: '%',
        timestamp: new Date(),
      });
      
      this.recordMetric({
        name: 'heap_used',
        value: memoryUsage.heapUsed / 1024 / 1024, // MB
        unit: 'MB',
        timestamp: new Date(),
      });
      
      // Disk metrics (simplified - would need more sophisticated implementation for production)
      const diskUsage = await this.getDiskUsage();
      this.recordMetric({
        name: 'disk_usage',
        value: diskUsage,
        unit: '%',
        timestamp: new Date(),
      });
      
    } catch (error) {
      console.error('Failed to collect system metrics:', error);
    }
  }

  private async collectApplicationMetrics() {
    try {
      // Database metrics
      const dbStats = {
        totalConnections: this.dbPool.totalCount,
        idleConnections: this.dbPool.idleCount,
        waitingClients: this.dbPool.waitingCount,
        maxConnections: this.dbPool.options.max || 20,
      };
      
      const connectionUsage = (dbStats.totalConnections / dbStats.maxConnections) * 100;
      
      this.recordMetric({
        name: 'database_connections',
        value: connectionUsage,
        unit: '%',
        timestamp: new Date(),
      });
      
      this.recordMetric({
        name: 'database_waiting_clients',
        value: dbStats.waitingClients,
        unit: 'count',
        timestamp: new Date(),
      });
      
      // Cache metrics
      const cacheInfo = await this.redis.info('memory');
      const cacheStats = this.parseCacheInfo(cacheInfo);
      
      this.recordMetric({
        name: 'cache_memory_usage',
        value: cacheStats.usedMemory / 1024 / 1024, // MB
        unit: 'MB',
        timestamp: new Date(),
      });
      
      // Get cache hit rate from our cache service if available
      const cacheHitRate = await this.getCacheHitRate();
      if (cacheHitRate !== null) {
        this.recordMetric({
          name: 'cache_hit_rate',
          value: cacheHitRate,
          unit: '%',
          timestamp: new Date(),
        });
      }
      
    } catch (error) {
      console.error('Failed to collect application metrics:', error);
    }
  }

  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();
      
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime(startTime);
        
        const totalTime = endTime[0] * 1000000 + endTime[1] / 1000; // microseconds
        const cpuTime = endUsage.user + endUsage.system;
        const cpuUsage = (cpuTime / totalTime) * 100;
        
        resolve(Math.min(cpuUsage, 100)); // Cap at 100%
      }, 100);
    });
  }

  private async getDiskUsage(): Promise<number> {
    // Simplified disk usage - in production, you'd want to use a proper library
    // like 'node-disk-info' or similar
    try {
      const { execSync } = require('child_process');
      const output = execSync('df -h /', { encoding: 'utf8' });
      const lines = output.split('\n');
      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/);
        const usagePercent = parseInt(parts[4].replace('%', ''));
        return usagePercent;
      }
    } catch (error) {
      console.error('Failed to get disk usage:', error);
    }
    return 0;
  }

  private parseCacheInfo(info: string): { usedMemory: number; maxMemory: number } {
    const lines = info.split('\r\n');
    let usedMemory = 0;
    let maxMemory = 0;
    
    lines.forEach(line => {
      if (line.startsWith('used_memory:')) {
        usedMemory = parseInt(line.split(':')[1]);
      } else if (line.startsWith('maxmemory:')) {
        maxMemory = parseInt(line.split(':')[1]);
      }
    });
    
    return { usedMemory, maxMemory };
  }

  private async getCacheHitRate(): Promise<number | null> {
    try {
      const stats = await this.redis.hgetall('cache:stats');
      if (stats && stats.hitRate) {
        return parseFloat(stats.hitRate);
      }
    } catch (error) {
      console.error('Failed to get cache hit rate:', error);
    }
    return null;
  }

  private async checkThresholds() {
    // Get latest metrics
    const latestMetrics = new Map<string, number>();
    
    this.metrics.forEach((metricArray, name) => {
      if (metricArray.length > 0) {
        const latest = metricArray[metricArray.length - 1];
        latestMetrics.set(name, latest.value);
      }
    });
    
    // Check CPU usage
    const cpuUsage = latestMetrics.get('cpu_usage');
    if (cpuUsage !== undefined) {
      if (cpuUsage > this.thresholds.cpu.critical) {
        this.createAlert('cpu', 'critical', `CPU usage is critically high: ${cpuUsage.toFixed(1)}%`, cpuUsage, this.thresholds.cpu.critical);
      } else if (cpuUsage > this.thresholds.cpu.warning) {
        this.createAlert('cpu', 'high', `CPU usage is high: ${cpuUsage.toFixed(1)}%`, cpuUsage, this.thresholds.cpu.warning);
      }
    }
    
    // Check memory usage
    const memoryUsage = latestMetrics.get('memory_usage');
    if (memoryUsage !== undefined) {
      if (memoryUsage > this.thresholds.memory.critical) {
        this.createAlert('memory', 'critical', `Memory usage is critically high: ${memoryUsage.toFixed(1)}%`, memoryUsage, this.thresholds.memory.critical);
      } else if (memoryUsage > this.thresholds.memory.warning) {
        this.createAlert('memory', 'high', `Memory usage is high: ${memoryUsage.toFixed(1)}%`, memoryUsage, this.thresholds.memory.warning);
      }
    }
    
    // Check response time
    const responseTime = latestMetrics.get('average_response_time');
    if (responseTime !== undefined) {
      if (responseTime > this.thresholds.responseTime.critical) {
        this.createAlert('response_time', 'critical', `Response time is critically slow: ${responseTime.toFixed(0)}ms`, responseTime, this.thresholds.responseTime.critical);
      } else if (responseTime > this.thresholds.responseTime.warning) {
        this.createAlert('response_time', 'high', `Response time is slow: ${responseTime.toFixed(0)}ms`, responseTime, this.thresholds.responseTime.warning);
      }
    }
    
    // Check error rate
    const errorRate = latestMetrics.get('error_rate');
    if (errorRate !== undefined) {
      if (errorRate > this.thresholds.errorRate.critical) {
        this.createAlert('error_rate', 'critical', `Error rate is critically high: ${errorRate.toFixed(1)}%`, errorRate, this.thresholds.errorRate.critical);
      } else if (errorRate > this.thresholds.errorRate.warning) {
        this.createAlert('error_rate', 'high', `Error rate is high: ${errorRate.toFixed(1)}%`, errorRate, this.thresholds.errorRate.warning);
      }
    }
    
    // Check database connections
    const dbConnections = latestMetrics.get('database_connections');
    if (dbConnections !== undefined) {
      if (dbConnections > this.thresholds.databaseConnections.critical) {
        this.createAlert('database', 'critical', `Database connection usage is critically high: ${dbConnections.toFixed(1)}%`, dbConnections, this.thresholds.databaseConnections.critical);
      } else if (dbConnections > this.thresholds.databaseConnections.warning) {
        this.createAlert('database', 'high', `Database connection usage is high: ${dbConnections.toFixed(1)}%`, dbConnections, this.thresholds.databaseConnections.warning);
      }
    }
    
    // Check cache hit rate (lower is worse)
    const cacheHitRate = latestMetrics.get('cache_hit_rate');
    if (cacheHitRate !== undefined) {
      if (cacheHitRate < this.thresholds.cacheHitRate.critical) {
        this.createAlert('cache', 'critical', `Cache hit rate is critically low: ${cacheHitRate.toFixed(1)}%`, cacheHitRate, this.thresholds.cacheHitRate.critical);
      } else if (cacheHitRate < this.thresholds.cacheHitRate.warning) {
        this.createAlert('cache', 'medium', `Cache hit rate is low: ${cacheHitRate.toFixed(1)}%`, cacheHitRate, this.thresholds.cacheHitRate.warning);
      }
    }
  }

  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    value: number,
    threshold: number
  ) {
    // Check if similar alert already exists and is not resolved
    const existingAlert = this.alerts.find(alert => 
      alert.type === type && 
      alert.severity === severity && 
      !alert.resolved &&
      Date.now() - alert.timestamp.getTime() < 300000 // 5 minutes
    );
    
    if (existingAlert) {
      return; // Don't create duplicate alerts
    }
    
    const alert: PerformanceAlert = {
      id: `${type}_${severity}_${Date.now()}`,
      type,
      severity,
      message,
      value,
      threshold,
      timestamp: new Date(),
      resolved: false,
    };
    
    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    this.emit('alert', alert);
    
    // Store alert in Redis
    this.storeAlertInRedis(alert);
  }

  private async storeAlertInRedis(alert: PerformanceAlert) {
    try {
      await this.redis.lpush('performance:alerts', JSON.stringify(alert));
      await this.redis.ltrim('performance:alerts', 0, 99); // Keep last 100
    } catch (error) {
      console.error('Failed to store alert in Redis:', error);
    }
  }

  private async cleanupOldMetrics() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    this.metrics.forEach((metricArray, name) => {
      const filteredMetrics = metricArray.filter(metric => metric.timestamp > oneHourAgo);
      this.metrics.set(name, filteredMetrics);
    });
  }

  public getMetrics(name?: string, since?: Date): PerformanceMetric[] {
    if (name) {
      const metrics = this.metrics.get(name) || [];
      if (since) {
        return metrics.filter(metric => metric.timestamp >= since);
      }
      return metrics;
    }
    
    const allMetrics: PerformanceMetric[] = [];
    this.metrics.forEach(metricArray => {
      allMetrics.push(...metricArray);
    });
    
    if (since) {
      return allMetrics.filter(metric => metric.timestamp >= since);
    }
    
    return allMetrics;
  }

  public getAlerts(resolved?: boolean): PerformanceAlert[] {
    if (resolved !== undefined) {
      return this.alerts.filter(alert => alert.resolved === resolved);
    }
    return this.alerts;
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('alertResolved', alert);
      return true;
    }
    return false;
  }

  public getSystemMetrics(): SystemMetrics {
    const latestMetrics = new Map<string, number>();
    
    this.metrics.forEach((metricArray, name) => {
      if (metricArray.length > 0) {
        const latest = metricArray[metricArray.length - 1];
        latestMetrics.set(name, latest.value);
      }
    });
    
    return {
      cpu: {
        usage: latestMetrics.get('cpu_usage') || 0,
        loadAverage: [latestMetrics.get('load_average_1m') || 0, 0, 0],
        cores: os.cpus().length,
      },
      memory: {
        used: (os.totalmem() - os.freemem()) / 1024 / 1024, // MB
        free: os.freemem() / 1024 / 1024, // MB
        total: os.totalmem() / 1024 / 1024, // MB
        usage: latestMetrics.get('memory_usage') || 0,
        heapUsed: latestMetrics.get('heap_used') || 0,
        heapTotal: process.memoryUsage().heapTotal / 1024 / 1024, // MB
      },
      disk: {
        usage: latestMetrics.get('disk_usage') || 0,
        free: 0, // Would need proper implementation
        total: 0, // Would need proper implementation
      },
      network: {
        bytesIn: 0, // Would need proper implementation
        bytesOut: 0, // Would need proper implementation
      },
    };
  }

  public getApplicationMetrics(): ApplicationMetrics {
    const latestMetrics = new Map<string, number>();
    
    this.metrics.forEach((metricArray, name) => {
      if (metricArray.length > 0) {
        const latest = metricArray[metricArray.length - 1];
        latestMetrics.set(name, latest.value);
      }
    });
    
    return {
      requests: {
        total: this.requestMetrics.count,
        perSecond: latestMetrics.get('requests_per_second') || 0,
        averageResponseTime: latestMetrics.get('average_response_time') || 0,
        errorRate: latestMetrics.get('error_rate') || 0,
      },
      database: {
        connections: latestMetrics.get('database_connections') || 0,
        queryTime: 0, // Would need integration with database service
        slowQueries: 0, // Would need integration with database service
      },
      cache: {
        hitRate: latestMetrics.get('cache_hit_rate') || 0,
        memoryUsage: latestMetrics.get('cache_memory_usage') || 0,
        operations: 0, // Would need integration with cache service
      },
      websockets: {
        connections: 0, // Would need integration with WebSocket service
        messagesPerSecond: 0, // Would need integration with WebSocket service
      },
    };
  }

  public updateThresholds(newThresholds: Partial<PerformanceThresholds>) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  public async healthCheck(): Promise<{ status: string; metrics: any; alerts: number }> {
    const systemMetrics = this.getSystemMetrics();
    const appMetrics = this.getApplicationMetrics();
    const unresolvedAlerts = this.getAlerts(false).length;
    
    let status = 'healthy';
    
    if (unresolvedAlerts > 0) {
      const criticalAlerts = this.getAlerts(false).filter(a => a.severity === 'critical').length;
      if (criticalAlerts > 0) {
        status = 'critical';
      } else {
        status = 'warning';
      }
    }
    
    return {
      status,
      metrics: {
        system: systemMetrics,
        application: appMetrics,
      },
      alerts: unresolvedAlerts,
    };
  }

  public stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
  }
}

// Singleton instance
let performanceMonitoringServiceInstance: PerformanceMonitoringService;

export const initializePerformanceMonitoringService = (
  dbPool: Pool, 
  redis: any
): PerformanceMonitoringService => {
  if (!performanceMonitoringServiceInstance) {
    performanceMonitoringServiceInstance = new PerformanceMonitoringService(dbPool, redis);
  }
  return performanceMonitoringServiceInstance;
};

export const performanceMonitoringService = null;

export default PerformanceMonitoringService;
export { PerformanceMetric, SystemMetrics, ApplicationMetrics, PerformanceAlert, PerformanceThresholds };