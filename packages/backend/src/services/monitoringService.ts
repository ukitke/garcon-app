import { CloudWatch } from 'aws-sdk';
import logger from '../config/logger';

interface MetricData {
  MetricName: string;
  Value: number;
  Unit: string;
  Dimensions?: Array<{
    Name: string;
    Value: string;
  }>;
  Timestamp?: Date;
}

export class MonitoringService {
  private cloudWatch: CloudWatch;
  private namespace: string;
  private enabled: boolean;

  constructor() {
    this.namespace = 'Garcon/Application';
    this.enabled = process.env.NODE_ENV === 'production' && !!process.env.AWS_REGION;
    
    if (this.enabled) {
      this.cloudWatch = new CloudWatch({
        region: process.env.AWS_REGION || 'us-east-1',
      });
    }
  }

  /**
   * Send a custom metric to CloudWatch
   */
  async putMetric(metricData: MetricData): Promise<void> {
    if (!this.enabled) {
      logger.debug('Monitoring disabled, skipping metric', { metric: metricData.MetricName });
      return;
    }

    try {
      const params = {
        Namespace: this.namespace,
        MetricData: [
          {
            MetricName: metricData.MetricName,
            Value: metricData.Value,
            Unit: metricData.Unit,
            Dimensions: metricData.Dimensions,
            Timestamp: metricData.Timestamp || new Date(),
          },
        ],
      };

      await this.cloudWatch.putMetricData(params).promise();
      logger.debug('Metric sent to CloudWatch', { metric: metricData.MetricName });
    } catch (error) {
      logger.error('Failed to send metric to CloudWatch', {
        metric: metricData.MetricName,
        error: error.message,
      });
    }
  }

  /**
   * Track API request metrics
   */
  async trackApiRequest(endpoint: string, method: string, statusCode: number, responseTime: number): Promise<void> {
    const dimensions = [
      { Name: 'Endpoint', Value: endpoint },
      { Name: 'Method', Value: method },
      { Name: 'StatusCode', Value: statusCode.toString() },
    ];

    // Track request count
    await this.putMetric({
      MetricName: 'ApiRequestCount',
      Value: 1,
      Unit: 'Count',
      Dimensions: dimensions,
    });

    // Track response time
    await this.putMetric({
      MetricName: 'ApiResponseTime',
      Value: responseTime,
      Unit: 'Milliseconds',
      Dimensions: dimensions,
    });

    // Track error rate
    if (statusCode >= 400) {
      await this.putMetric({
        MetricName: 'ApiErrorCount',
        Value: 1,
        Unit: 'Count',
        Dimensions: dimensions,
      });
    }
  }

  /**
   * Track database operation metrics
   */
  async trackDatabaseOperation(operation: string, duration: number, success: boolean): Promise<void> {
    const dimensions = [
      { Name: 'Operation', Value: operation },
      { Name: 'Status', Value: success ? 'Success' : 'Error' },
    ];

    await this.putMetric({
      MetricName: 'DatabaseOperationCount',
      Value: 1,
      Unit: 'Count',
      Dimensions: dimensions,
    });

    await this.putMetric({
      MetricName: 'DatabaseOperationDuration',
      Value: duration,
      Unit: 'Milliseconds',
      Dimensions: dimensions,
    });
  }

  /**
   * Track business metrics
   */
  async trackOrderCreated(locationId: string, amount: number): Promise<void> {
    const dimensions = [
      { Name: 'LocationId', Value: locationId },
    ];

    await this.putMetric({
      MetricName: 'OrdersCreated',
      Value: 1,
      Unit: 'Count',
      Dimensions: dimensions,
    });

    await this.putMetric({
      MetricName: 'OrderValue',
      Value: amount,
      Unit: 'None',
      Dimensions: dimensions,
    });
  }

  /**
   * Track payment metrics
   */
  async trackPayment(method: string, amount: number, success: boolean): Promise<void> {
    const dimensions = [
      { Name: 'PaymentMethod', Value: method },
      { Name: 'Status', Value: success ? 'Success' : 'Failed' },
    ];

    await this.putMetric({
      MetricName: 'PaymentCount',
      Value: 1,
      Unit: 'Count',
      Dimensions: dimensions,
    });

    if (success) {
      await this.putMetric({
        MetricName: 'PaymentAmount',
        Value: amount,
        Unit: 'None',
        Dimensions: dimensions,
      });
    }
  }

  /**
   * Track user activity metrics
   */
  async trackUserActivity(activity: string, locationId?: string): Promise<void> {
    const dimensions = [
      { Name: 'Activity', Value: activity },
    ];

    if (locationId) {
      dimensions.push({ Name: 'LocationId', Value: locationId });
    }

    await this.putMetric({
      MetricName: 'UserActivity',
      Value: 1,
      Unit: 'Count',
      Dimensions: dimensions,
    });
  }

  /**
   * Track waiter call metrics
   */
  async trackWaiterCall(locationId: string, responseTime?: number): Promise<void> {
    const dimensions = [
      { Name: 'LocationId', Value: locationId },
    ];

    await this.putMetric({
      MetricName: 'WaiterCallsCount',
      Value: 1,
      Unit: 'Count',
      Dimensions: dimensions,
    });

    if (responseTime) {
      await this.putMetric({
        MetricName: 'WaiterResponseTime',
        Value: responseTime,
        Unit: 'Seconds',
        Dimensions: dimensions,
      });
    }
  }

  /**
   * Track system performance metrics
   */
  async trackSystemMetrics(): Promise<void> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Memory metrics
    await this.putMetric({
      MetricName: 'MemoryUsage',
      Value: memUsage.heapUsed,
      Unit: 'Bytes',
    });

    await this.putMetric({
      MetricName: 'MemoryTotal',
      Value: memUsage.heapTotal,
      Unit: 'Bytes',
    });

    // CPU metrics (convert microseconds to milliseconds)
    await this.putMetric({
      MetricName: 'CpuUserTime',
      Value: cpuUsage.user / 1000,
      Unit: 'Milliseconds',
    });

    await this.putMetric({
      MetricName: 'CpuSystemTime',
      Value: cpuUsage.system / 1000,
      Unit: 'Milliseconds',
    });

    // Uptime
    await this.putMetric({
      MetricName: 'ProcessUptime',
      Value: process.uptime(),
      Unit: 'Seconds',
    });
  }

  /**
   * Start periodic system metrics collection
   */
  startSystemMetricsCollection(intervalMs: number = 60000): void {
    if (!this.enabled) {
      logger.info('System metrics collection disabled');
      return;
    }

    logger.info('Starting system metrics collection', { intervalMs });
    
    setInterval(async () => {
      try {
        await this.trackSystemMetrics();
      } catch (error) {
        logger.error('Failed to collect system metrics', { error: error.message });
      }
    }, intervalMs);
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();