import { TestMetrics } from '../types/test';

export interface TestResult {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  metrics: TestMetrics;
  errors: Array<{
    type: string;
    message: string;
    count: number;
  }>;
  startTime: string;
  endTime?: string;
}

export interface AdvancedTestOptions {
  testType: 'load' | 'stress' | 'performance' | 'security' | 'functional';
  maxUsers: number;
  duration: number;
  rampUpTime: number;
  targetUrl: string;
  environment: 'development' | 'staging' | 'production';
  protocol: 'HTTP' | 'HTTPS';
  requestsPerSecond?: number;
  customHeaders?: Record<string, string>;
  authentication?: {
    type: 'basic' | 'bearer' | 'oauth';
    credentials: Record<string, string>;
  };
}

export type TestExecutionResult = TestResult;

export class AdvancedTestEngine {
  private activeTests: Map<string, TestExecutionResult> = new Map();
  private testCounter = 0;

  /**
   * Start a new test execution
   */
  async startTest(options: AdvancedTestOptions): Promise<string> {
    const testId = `test_${++this.testCounter}_${Date.now()}`;

    const testResult: TestExecutionResult = {
      id: testId,
      status: 'running',
      progress: 0,
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        throughput: 0,
        errorRate: 0,
        activeUsers: 0
      },
      errors: [],
      startTime: new Date().toISOString()
    };

    this.activeTests.set(testId, testResult);

    // Simulate test execution
    this.executeTest(testId, options);

    return testId;
  }

  /**
   * Get test status and results
   */
  getTestStatus(testId: string): TestExecutionResult | null {
    return this.activeTests.get(testId) || null;
  }

  /**
   * Stop a running test
   */
  async stopTest(testId: string): Promise<boolean> {
    const test = this.activeTests.get(testId);
    if (test && test.status === 'running') {
      test.status = 'cancelled';
      test.endTime = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Get all active tests
   */
  getActiveTests(): TestExecutionResult[] {
    return Array.from(this.activeTests.values()).filter(test => test.status === 'running');
  }

  /**
   * Get test history
   */
  getTestHistory(): TestExecutionResult[] {
    return Array.from(this.activeTests.values()).filter(test => test.status !== 'running');
  }

  /**
   * Execute test simulation
   */
  private async executeTest(testId: string, options: AdvancedTestOptions): Promise<void> {
    const test = this.activeTests.get(testId);
    if (!test) return;

    const totalDuration = options.duration * 1000; // Convert to milliseconds
    const updateInterval = 1000; // Update every second
    const totalUpdates = totalDuration / updateInterval;

    let currentUpdate = 0;

    const interval = setInterval(() => {
      if (!this.activeTests.has(testId) || test.status !== 'running') {
        clearInterval(interval);
        return;
      }

      currentUpdate++;
      const progress = (currentUpdate / totalUpdates) * 100;

      // Simulate metrics
      const baseRequests = Math.floor(Math.random() * 50) + 20;
      const successRate = Math.random() * 0.1 + 0.9; // 90-100% success rate
      const successfulRequests = Math.floor(baseRequests * successRate);
      const failedRequests = baseRequests - successfulRequests;

      test.progress = Math.min(progress, 100);
      test.metrics = {
        totalRequests: test.metrics.totalRequests + baseRequests,
        successfulRequests: test.metrics.successfulRequests + successfulRequests,
        failedRequests: test.metrics.failedRequests + failedRequests,
        averageResponseTime: Math.floor(Math.random() * 200) + 100,
        minResponseTime: Math.floor(Math.random() * 50) + 50,
        maxResponseTime: Math.floor(Math.random() * 500) + 300,
        throughput: Math.floor(Math.random() * 20) + 10,
        errorRate: (test.metrics.failedRequests / test.metrics.totalRequests) * 100,
        activeUsers: Math.floor(Math.random() * options.maxUsers * 0.8) + options.maxUsers * 0.2
      };

      // Simulate errors
      if (Math.random() > 0.8) {
        const errorTypes = ['Connection Timeout', 'HTTP 500', 'HTTP 429', 'Network Error'];
        const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];

        const existingError = test.errors.find(e => e.type === errorType);
        if (existingError) {
          existingError.count++;
        } else {
          test.errors.push({
            type: errorType,
            message: `${errorType} occurred during test execution`,
            count: 1
          });
        }
      }

      // Complete test
      if (progress >= 100) {
        test.status = 'completed';
        test.endTime = new Date().toISOString();
        test.progress = 100;
        clearInterval(interval);
      }
    }, updateInterval);
  }

  /**
   * Generate test report
   */
  generateReport(testId: string): any {
    const test = this.activeTests.get(testId);
    if (!test) return null;

    return {
      testId,
      summary: {
        status: test.status,
        duration: test.endTime
          ? new Date(test.endTime).getTime() - new Date(test.startTime).getTime()
          : Date.now() - new Date(test.startTime).getTime(),
        totalRequests: test.metrics.totalRequests,
        successRate: ((test.metrics.successfulRequests / test.metrics.totalRequests) * 100).toFixed(2),
        averageResponseTime: test.metrics.averageResponseTime
      },
      metrics: test.metrics,
      errors: test.errors,
      timestamps: {
        startTime: test.startTime,
        endTime: test.endTime
      }
    };
  }

  /**
   * Validate test configuration
   */
  validateConfiguration(options: AdvancedTestOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!options.targetUrl || !this.isValidUrl(options.targetUrl)) {
      errors.push('Invalid target URL');
    }

    if (options.maxUsers <= 0) {
      errors.push('Max users must be greater than 0');
    }

    if (options.duration <= 0) {
      errors.push('Duration must be greater than 0');
    }

    if (options.rampUpTime < 0) {
      errors.push('Ramp up time cannot be negative');
    }

    if (options.rampUpTime >= options.duration) {
      errors.push('Ramp up time must be less than total duration');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get test recommendations based on configuration
   */
  getTestRecommendations(options: AdvancedTestOptions): string[] {
    const recommendations: string[] = [];

    if (options.maxUsers > 1000) {
      recommendations.push('Consider running this test during off-peak hours due to high user load');
    }

    if (options.duration > 3600) {
      recommendations.push('Long duration tests may impact system resources');
    }

    if (options.rampUpTime < options.duration * 0.1) {
      recommendations.push('Consider increasing ramp-up time for more realistic load patterns');
    }

    if (options.environment === 'production') {
      recommendations.push('Exercise caution when testing against production environment');
    }

    return recommendations;
  }

  /**
   * Clean up completed tests
   */
  cleanup(olderThanHours: number = 24): number {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [testId, test] of this.activeTests.entries()) {
      if (test.status !== 'running' && new Date(test.startTime).getTime() < cutoffTime) {
        this.activeTests.delete(testId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Utility method to validate URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const advancedTestEngine = new AdvancedTestEngine();

// Types already exported above with interface declarations

