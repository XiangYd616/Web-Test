/**
 * 错误处理和恢复机制测试
 * 验证增强的错误处理系统的功能
 */

import ErrorHandler, { ServiceError } from '../backend/engines/shared/errors/ErrorHandler.js';
import { ErrorCode, ErrorSeverity, RecoveryStrategy } from '../backend/engines/shared/errors/ErrorTypes.js';
import BaseService from '../backend/engines/shared/services/BaseService.enhanced.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFile } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// 模拟测试服务
class TestService extends BaseService {
  constructor() {
    super('TestService');
    this.testData = {};
    this.simulatedFailures = new Set();
  }

  async performInitialization() {
    if (this.simulatedFailures.has('init')) {
      throw new Error('模拟初始化失败');
    }
    this.testData.initialized = true;
  }

  getCapabilities() {
    return [...super.getCapabilities(), 'test-operations', 'failure-simulation'];
  }

  // 测试方法：网络请求模拟
  async simulateNetworkRequest(url) {
    if (this.simulatedFailures.has('network')) {
      const error = new Error('ENOTFOUND test.com');
      error.code = 'ENOTFOUND';
      throw error;
    }
    return { data: `Response from ${url}`, status: 200 };
  }

  // 测试方法：解析操作模拟
  async simulateParsingOperation(data) {
    if (this.simulatedFailures.has('parsing')) {
      throw new Error('Parse error: Invalid JSON format');
    }
    return { parsed: true, data };
  }

  // 测试方法：内存密集操作模拟
  async simulateMemoryIntensiveOperation() {
    if (this.simulatedFailures.has('memory')) {
      const error = new Error('Memory limit exceeded');
      error.name = 'MemoryError';
      throw error;
    }
    return { result: 'operation completed' };
  }

  // 设置模拟失败
  setSimulatedFailure(type) {
    this.simulatedFailures.add(type);
  }

  // 清除模拟失败
  clearSimulatedFailure(type) {
    this.simulatedFailures.delete(type);
  }

  // 重置状态
  resetState() {
    this.testData = {};
    this.simulatedFailures.clear();
    this.resetErrorStats();
  }
}

async function main() {
  log(colors.bold + colors.cyan, '🔧 错误处理和恢复机制测试');

  let testResults = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  try {
    // 1. 错误类型和分类测试
    await testErrorTypes(testResults);

    // 2. 错误处理器基础功能测试
    await testErrorHandlerBasics(testResults);

    // 3. 错误恢复策略测试
    await testRecoveryStrategies(testResults);

    // 4. 增强BaseService测试
    await testEnhancedBaseService(testResults);

    // 5. 集成测试
    await testIntegration(testResults);

    // 生成测试报告
    await generateTestReport(testResults);

    const successRate = Math.round((testResults.summary.passed / testResults.summary.total) * 100);
    
    log(colors.bold + colors.green, `\n✅ 错误处理测试完成`);
    log(colors.green, `📊 测试结果: ${testResults.summary.passed}/${testResults.summary.total} 通过 (${successRate}%)`);

  } catch (error) {
    log(colors.red, `❌ 测试执行失败: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

async function testErrorTypes(testResults) {
  log(colors.blue, '\n📋 1. 错误类型和分类测试');

  const tests = [
    {
      name: '创建ServiceError',
      test: () => {
        const error = new ServiceError(ErrorCode.NETWORK_TIMEOUT, 'Test timeout');
        if (error.code !== ErrorCode.NETWORK_TIMEOUT) throw new Error('错误代码不匹配');
        if (error.severity !== ErrorSeverity.HIGH) throw new Error('错误严重级别不正确');
        if (!error.recoverable) throw new Error('可恢复标志不正确');
        return { errorCode: error.code, severity: error.severity };
      }
    },
    {
      name: '错误JSON序列化',
      test: () => {
        const error = new ServiceError(ErrorCode.PARSING_FAILED, 'Parse failed');
        const json = error.toJSON();
        if (!json.code || !json.timestamp || !json.severity) {
          throw new Error('JSON序列化缺少必要字段');
        }
        return { serialized: true, fields: Object.keys(json).length };
      }
    }
  ];

  for (const test of tests) {
    try {
      const result = test.test();
      testResults.tests.push({ name: test.name, status: 'PASSED', result });
      testResults.summary.passed++;
      log(colors.green, `  ✓ ${test.name}`);
    } catch (error) {
      testResults.tests.push({ name: test.name, status: 'FAILED', error: error.message });
      testResults.summary.failed++;
      log(colors.red, `  ✗ ${test.name}: ${error.message}`);
    }
    testResults.summary.total++;
  }
}

async function testErrorHandlerBasics(testResults) {
  log(colors.blue, '\n📋 2. 错误处理器基础功能测试');

  const errorHandler = new ErrorHandler('TestHandler');

  const tests = [
    {
      name: '创建标准化错误',
      test: () => {
        const originalError = new TypeError('Invalid type');
        const serviceError = errorHandler.normalizeError(originalError, {});
        if (serviceError.code !== ErrorCode.VALIDATION_TYPE_MISMATCH) {
          throw new Error('错误代码映射不正确');
        }
        return { normalized: true, code: serviceError.code };
      }
    },
    {
      name: '错误统计记录',
      test: () => {
        const error = errorHandler.createError(ErrorCode.NETWORK_TIMEOUT);
        errorHandler.recordError(error);
        const stats = errorHandler.getErrorStats();
        if (stats.total !== 1) throw new Error('错误统计不正确');
        if (!stats.bySeverity[ErrorSeverity.HIGH]) throw new Error('严重级别统计不正确');
        return { stats: stats.total };
      }
    },
    {
      name: '错误监听器',
      test: () => {
        let listenerCalled = false;
        const listener = (error, context, service) => {
          listenerCalled = true;
        };
        
        errorHandler.addErrorListener(listener);
        errorHandler.notifyErrorListeners(new ServiceError(ErrorCode.SYSTEM_FAILURE, 'test'), {});
        
        if (!listenerCalled) throw new Error('错误监听器未被调用');
        
        errorHandler.removeErrorListener(listener);
        return { listenerWorking: true };
      }
    }
  ];

  for (const test of tests) {
    try {
      const result = test.test();
      testResults.tests.push({ name: test.name, status: 'PASSED', result });
      testResults.summary.passed++;
      log(colors.green, `  ✓ ${test.name}`);
    } catch (error) {
      testResults.tests.push({ name: test.name, status: 'FAILED', error: error.message });
      testResults.summary.failed++;
      log(colors.red, `  ✗ ${test.name}: ${error.message}`);
    }
    testResults.summary.total++;
  }
}

async function testRecoveryStrategies(testResults) {
  log(colors.blue, '\n📋 3. 错误恢复策略测试');

  const errorHandler = new ErrorHandler('RecoveryTestHandler');

  const tests = [
    {
      name: '重试策略',
      test: async () => {
        let attempts = 0;
        const retryFunction = async () => {
          attempts++;
          if (attempts < 2) {
            throw new Error('Still failing');
          }
          return { success: true, attempts };
        };

        const error = errorHandler.createError(ErrorCode.NETWORK_TIMEOUT);
        const result = await errorHandler.retryOperation(error, {
          retryFunction,
          operation: 'test-retry'
        }, { maxRetries: 3, retryDelay: 10, backoffMultiplier: 1 });

        if (!result.success) throw new Error('重试策略失败');
        if (result.result.attempts !== 2) throw new Error('重试次数不正确');
        return result;
      }
    },
    {
      name: '备用方案策略',
      test: async () => {
        const fallbackFunction = async () => {
          return { fallbackUsed: true, data: 'fallback data' };
        };

        const error = errorHandler.createError(ErrorCode.DEPENDENCY_UNAVAILABLE);
        const result = await errorHandler.fallbackOperation(error, {
          fallbackFunction,
          operation: 'test-fallback'
        }, {});

        if (!result.success) throw new Error('备用方案策略失败');
        if (!result.result.fallbackUsed) throw new Error('备用方案未正确执行');
        return result;
      }
    },
    {
      name: '跳过策略',
      test: () => {
        const error = errorHandler.createError(ErrorCode.ANALYSIS_INSUFFICIENT_DATA);
        const result = errorHandler.skipOperation(error, {}, {
          skipMessage: '测试跳过消息'
        });

        if (!result.success) throw new Error('跳过策略失败');
        if (result.strategy !== 'skip') throw new Error('策略类型不正确');
        return result;
      }
    }
  ];

  for (const test of tests) {
    try {
      const result = await test.test();
      testResults.tests.push({ name: test.name, status: 'PASSED', result });
      testResults.summary.passed++;
      log(colors.green, `  ✓ ${test.name}`);
    } catch (error) {
      testResults.tests.push({ name: test.name, status: 'FAILED', error: error.message });
      testResults.summary.failed++;
      log(colors.red, `  ✗ ${test.name}: ${error.message}`);
    }
    testResults.summary.total++;
  }
}

async function testEnhancedBaseService(testResults) {
  log(colors.blue, '\n📋 4. 增强BaseService测试');

  const testService = new TestService();

  const tests = [
    {
      name: '服务初始化',
      test: async () => {
        const result = await testService.initialize();
        if (!result) throw new Error('初始化失败');
        if (!testService.initialized) throw new Error('初始化状态不正确');
        return { initialized: true };
      }
    },
    {
      name: '可用性检查',
      test: () => {
        const availability = testService.checkAvailability();
        if (!availability.available) throw new Error('可用性检查失败');
        if (!availability.errorStats) throw new Error('错误统计缺失');
        return availability;
      }
    },
    {
      name: '错误处理集成',
      test: async () => {
        testService.setSimulatedFailure('network');
        
        try {
          await testService.simulateNetworkRequest('https://test.com');
          throw new Error('应该抛出错误');
        } catch (error) {
          if (error.message === '应该抛出错误') throw error;
          // 错误被正确处理
        }

        const stats = testService.getErrorStats();
        if (stats.total === 0) throw new Error('错误统计未更新');
        
        testService.clearSimulatedFailure('network');
        return { errorsHandled: stats.total };
      }
    },
    {
      name: '安全执行',
      test: async () => {
        // 测试成功情况
        const successResult = await testService.safeExecute(async () => {
          return { data: 'test success' };
        }, 'test-operation');

        if (!successResult.success) throw new Error('安全执行成功情况失败');

        // 测试失败情况
        testService.setSimulatedFailure('parsing');
        const failureResult = await testService.safeExecute(async () => {
          return await testService.simulateParsingOperation('invalid');
        }, 'test-parsing');

        if (failureResult.success) throw new Error('安全执行应该返回失败结果');
        
        testService.clearSimulatedFailure('parsing');
        return { successHandled: true, failureHandled: true };
      }
    }
  ];

  for (const test of tests) {
    try {
      const result = await test.test();
      testResults.tests.push({ name: test.name, status: 'PASSED', result });
      testResults.summary.passed++;
      log(colors.green, `  ✓ ${test.name}`);
    } catch (error) {
      testResults.tests.push({ name: test.name, status: 'FAILED', error: error.message });
      testResults.summary.failed++;
      log(colors.red, `  ✗ ${test.name}: ${error.message}`);
    }
    testResults.summary.total++;
  }
}

async function testIntegration(testResults) {
  log(colors.blue, '\n📋 5. 集成测试');

  const testService = new TestService();
  await testService.initialize();

  const tests = [
    {
      name: '多种错误类型处理',
      test: async () => {
        const errorTypes = ['network', 'parsing', 'memory'];
        const results = [];

        for (const type of errorTypes) {
          testService.setSimulatedFailure(type);
          
          try {
            switch (type) {
              case 'network':
                await testService.simulateNetworkRequest('test.com');
                break;
              case 'parsing':
                await testService.simulateParsingOperation('invalid');
                break;
              case 'memory':
                await testService.simulateMemoryIntensiveOperation();
                break;
            }
          } catch (error) {
            // 预期的错误
          }
          
          testService.clearSimulatedFailure(type);
        }

        const stats = testService.getErrorStats();
        if (stats.total < errorTypes.length) {
          throw new Error('未处理所有错误类型');
        }

        return { errorTypesHandled: errorTypes.length, totalErrors: stats.total };
      }
    },
    {
      name: '性能监控集成',
      test: async () => {
        const measuredOperation = testService.measurePerformance('test-operation', async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return { completed: true };
        });

        const result = await measuredOperation();
        if (!result.completed) throw new Error('性能监控操作失败');
        return { performanceMonitoring: true };
      }
    },
    {
      name: '错误恢复完整流程',
      test: async () => {
        let retryCount = 0;
        
        const result = await testService.executeWithErrorHandling(async () => {
          retryCount++;
          if (retryCount < 2) {
            const error = new Error('TIMEOUT');
            error.code = 'TIMEOUT';
            throw error;
          }
          return { success: true, retries: retryCount };
        }, {
          operationName: 'retry-test',
          retryFunction: async () => {
            retryCount++;
            if (retryCount < 2) {
              const error = new Error('TIMEOUT');
              error.code = 'TIMEOUT';
              throw error;
            }
            return { success: true, retries: retryCount };
          }
        });

        if (!result || (!result.success && !result.result)) {
          throw new Error('错误恢复流程失败');
        }

        return { recoveryCompleted: true };
      }
    }
  ];

  for (const test of tests) {
    try {
      const result = await test.test();
      testResults.tests.push({ name: test.name, status: 'PASSED', result });
      testResults.summary.passed++;
      log(colors.green, `  ✓ ${test.name}`);
    } catch (error) {
      testResults.tests.push({ name: test.name, status: 'FAILED', error: error.message });
      testResults.summary.failed++;
      log(colors.red, `  ✗ ${test.name}: ${error.message}`);
    }
    testResults.summary.total++;
  }
}

async function generateTestReport(testResults) {
  const report = {
    ...testResults,
    conclusion: {
      successRate: Math.round((testResults.summary.passed / testResults.summary.total) * 100),
      status: testResults.summary.failed === 0 ? 'ALL_PASSED' : 'SOME_FAILED',
      recommendations: []
    }
  };

  if (report.conclusion.successRate === 100) {
    report.conclusion.recommendations.push('错误处理系统已就绪，可以部署到生产环境');
  } else {
    report.conclusion.recommendations.push('需要修复失败的测试后再部署');
  }

  report.conclusion.recommendations.push(
    '建议监控生产环境中的错误统计',
    '定期检查错误恢复策略的有效性',
    '根据实际使用情况调整重试参数'
  );

  const reportPath = join(__dirname, 'ERROR_HANDLING_TEST_REPORT.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  log(colors.green, `\n📊 测试报告已生成: ${reportPath}`);
}

main();
