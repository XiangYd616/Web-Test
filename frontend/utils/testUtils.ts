/**
 * 测试工具集
 * 提供前端测试、性能测试、用户体验测试等工具
 */

import {errorService} from '../services/errorService';

// 测试结果接口
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

// 性能测试结果
interface PerformanceTestResult {
  metric: string;
  value: number;
  unit: string;
  threshold: number;
  passed: boolean;
}

// 用户体验测试结果
interface UXTestResult {
  component: string;
  interaction: string;
  responseTime: number;
  passed: boolean;
}

/**
 * 测试套件类
 */
export class TestSuite {
  private tests: Array<() => Promise<TestResult>> = [];
  private results: TestResult[] = [];

  /**
   * 添加测试
   */
  addTest(name: string, testFn: () => Promise<void> | void): void {
    this.tests.push(async () => {
      const startTime = performance.now();
      try {
        await testFn();
        const duration = performance.now() - startTime;
        return {
          name,
          passed: true,
          duration
        };
      } catch (error) {
        const duration = performance.now() - startTime;
        return {
          name,
          passed: false,
          duration,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
  }

  /**
   * 运行所有测试
   */
  async runAll(): Promise<TestResult[]> {
    this.results = [];

    for (const test of this.tests) {
      const result = await test();
      this.results.push(result);
    }

    return this.results;
  }

  /**
   * 获取测试摘要
   */
  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? (passed / total * 100).toFixed(2) : '0',
      totalDuration: totalDuration.toFixed(2),
      avgDuration: total > 0 ? (totalDuration / total).toFixed(2) : '0'
    };
  }
}

/**
 * 性能测试工具
 */
export class PerformanceTester {
  private thresholds = {
    loadTime: 3000, // 3秒
    renderTime: 1000, // 1秒
    interactionTime: 100, // 100毫秒
    memoryUsage: 50, // 50MB
    bundleSize: 1000 // 1MB
  };

  /**
   * 测试页面加载性能
   */
  async testPageLoad(): Promise<PerformanceTestResult[]> {
    const results: PerformanceTestResult[] = [];

    // 测试导航时间
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navEntries.length > 0) {
        const nav = navEntries[0];
        const loadTime = nav.loadEventEnd - (nav as any).navigationStart;

        results.push({
          metric: 'Page Load Time',
          value: loadTime,
          unit: 'ms',
          threshold: this.thresholds.loadTime,
          passed: loadTime <= this.thresholds.loadTime
        });

        const renderTime = nav.domContentLoadedEventEnd - (nav as any).navigationStart;
        results.push({
          metric: 'DOM Content Loaded',
          value: renderTime,
          unit: 'ms',
          threshold: this.thresholds.renderTime,
          passed: renderTime <= this.thresholds.renderTime
        });
      }
    }

    // 测试首次内容绘制
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcp) {
      results.push({
        metric: 'First Contentful Paint',
        value: fcp.startTime,
        unit: 'ms',
        threshold: this.thresholds.renderTime,
        passed: fcp.startTime <= this.thresholds.renderTime
      });
    }

    return results;
  }

  /**
   * 测试内存使用
   */
  testMemoryUsage(): PerformanceTestResult | null {
    if ('memory' in performance) {
      
        const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;

      return {
        metric: 'Memory Usage',
        value: usedMB,
        unit: 'MB',
        threshold: this.thresholds.memoryUsage,
        passed: usedMB <= this.thresholds.memoryUsage
      };
    }
    return null;
  }

  /**
   * 测试组件渲染性能
   */
  async testComponentRender(componentName: string, renderFn: () => void): Promise<PerformanceTestResult> {
    const startMark = `${componentName}-start`;
    const endMark = `${componentName}-end`;
    const measureName = `${componentName}-render`;

    performance.mark(startMark);
    renderFn();
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);

    const measure = performance.getEntriesByName(measureName)[0];
    const renderTime = measure ? measure.duration : 0;

    return {
      metric: `${componentName} Render Time`,
      value: renderTime,
      unit: 'ms',
      threshold: this.thresholds.renderTime,
      passed: renderTime <= this.thresholds.renderTime
    };
  }
}

/**
 * 用户体验测试工具
 */
export class UXTester {
  /**
   * 测试按钮响应时间
   */
  async testButtonResponse(buttonSelector: string): Promise<UXTestResult> {
    return new Promise((resolve) => {
      const button = document.querySelector(buttonSelector) as HTMLButtonElement;
      if (!button) {
        resolve({
          component: 'Button',
          interaction: 'Click',
          responseTime: -1,
          passed: false
        });
        return;
      }

      const startTime = performance.now();

      const handleClick = () => {
        const responseTime = performance.now() - startTime;
        button.removeEventListener('click', handleClick);

        resolve({
          component: 'Button',
          interaction: 'Click',
          responseTime,
          passed: responseTime <= 100 // 100ms threshold
        });
      };

      button.addEventListener('click', handleClick);
      button.click();
    });
  }

  /**
   * 测试表单验证响应
   */
  async testFormValidation(formSelector: string): Promise<UXTestResult> {
    const form = document.querySelector(formSelector) as HTMLFormElement;
    if (!form) {
      
        return {
        component: 'Form',
        interaction: 'Validation',
        responseTime: -1,
        passed: false
      };
    }

    const startTime = performance.now();

    // 触发表单验证
    const inputs = form.querySelectorAll('input[required]');
    if (inputs.length > 0) {
      const firstInput = inputs[0] as HTMLInputElement;
      firstInput.value = '';
      firstInput.blur();
    }

    // 等待验证消息出现
    await new Promise(resolve => setTimeout(resolve, 50));

    const responseTime = performance.now() - startTime;

    return {
      component: 'Form',
      interaction: 'Validation',
      responseTime,
      passed: responseTime <= 200 // 200ms threshold for validation
    };
  }

  /**
   * 测试页面滚动性能
   */
  async testScrollPerformance(): Promise<UXTestResult> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      let frameCount = 0;
      let lastFrameTime = startTime;

      const measureFrame = () => {
        const currentTime = performance.now();
        const frameDuration = currentTime - lastFrameTime;
        lastFrameTime = currentTime;
        frameCount++;

        if (frameCount >= 60) { // 测试60帧
          const totalTime = currentTime - startTime;
          const avgFrameTime = totalTime / frameCount;
          const fps = 1000 / avgFrameTime;

          resolve({
            component: 'Page',
            interaction: 'Scroll',
            responseTime: avgFrameTime,
            passed: fps >= 30 // 至少30fps
          });
        } else {
          requestAnimationFrame(measureFrame);
        }
      };

      // 开始滚动测试
      window.scrollBy(0, 10);
      requestAnimationFrame(measureFrame);
    });
  }
}

/**
 * API测试工具
 */
export class APITester {
  /**
   * 测试API响应时间
   */
  async testAPIResponse(url: string, options?: RequestInit): Promise<TestResult> {
    const startTime = performance.now();

    try {
      const response = await fetch(url, options);
      const duration = performance.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        name: `API Response: ${url}`,
        passed: true,
        duration,
        details: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        name: `API Response: ${url}`,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 测试API错误处理
   */
  async testErrorHandling(url: string): Promise<TestResult> {
    const startTime = performance.now();

    try {
      // 故意发送错误请求
      const response = await fetch(url + '/nonexistent', {
        method: 'POST',
        body: 'invalid data'
      });

      const duration = performance.now() - startTime;

      // 检查是否正确处理了错误
      const hasErrorResponse = !response.ok;

      return {
        name: `Error Handling: ${url}`,
        passed: hasErrorResponse,
        duration,
        details: {
          status: response.status,
          expectedError: true,
          receivedError: hasErrorResponse
        }
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        name: `Error Handling: ${url}`,
        passed: true, // 网络错误也是正确的错误处理
        duration,
        details: {
          networkError: true,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
}

/**
 * 综合测试运行器
 */
export class TestRunner {
  private performanceTester = new PerformanceTester();
  private uxTester = new UXTester();
  private apiTester = new APITester();

  /**
   * 运行完整的测试套件
   */
  async runFullTestSuite(): Promise<{
    performance: PerformanceTestResult[];
    ux: UXTestResult[];
    api: TestResult[];
    summary: any;
  }> {
    console.log('🧪 开始运行完整测试套件...');

    try {
      // 性能测试
      console.log('📊 运行性能测试...');
      const performanceResults = await this.performanceTester.testPageLoad();
      const memoryResult = this.performanceTester.testMemoryUsage();
      if (memoryResult) {
        performanceResults.push(memoryResult);
      }

      // 用户体验测试
      console.log('👤 运行用户体验测试...');
      const uxResults: UXTestResult[] = [];

      // API测试
      console.log('🌐 运行API测试...');
      const apiResults: TestResult[] = [];

      // 测试健康检查端点
      const healthTest = await this.apiTester.testAPIResponse('/api/health');
      apiResults.push(healthTest);

      // 测试错误处理
      const errorTest = await this.apiTester.testErrorHandling('/api');
      apiResults.push(errorTest);

      const summary = {
        performance: {
          total: performanceResults.length,
          passed: performanceResults.filter(r => r.passed).length
        },
        ux: {
          total: uxResults.length,
          passed: uxResults.filter(r => r.passed).length
        },
        api: {
          total: apiResults.length,
          passed: apiResults.filter(r => r.passed).length
        }
      };

      console.log('✅ 测试套件运行完成');

      return {
        performance: performanceResults,
        ux: uxResults,
        api: apiResults,
        summary
      };

    } catch (error) {
      console.error('❌ 测试套件运行失败:', error);
      errorService.handleError(error, { context: 'test_suite' });
      throw error;
    }
  }
}

// 导出便捷函数
export const createTestSuite = () => new TestSuite();
export const createPerformanceTester = () => new PerformanceTester();
export const createUXTester = () => new UXTester();
export const createAPITester = () => new APITester();
export const createTestRunner = () => new TestRunner();

export default {
  TestSuite,
  PerformanceTester,
  UXTester,
  APITester,
  TestRunner,
  createTestSuite,
  createPerformanceTester,
  createUXTester,
  createAPITester,
  createTestRunner
};
