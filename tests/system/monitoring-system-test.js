/**
 * 监控系统测试
 * 验证性能监控、指标收集和告警系统的功能
 */

import { writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import MetricCollector from '../backend/modules/engines/shared/monitoring/MetricCollector.js';
import {
    AlertLevel,
    MetricCategory,
    PredefinedMetrics,
    TimeWindow
} from '../backend/modules/engines/shared/monitoring/MetricTypes.js';
import MonitoringService from '../backend/modules/engines/shared/monitoring/MonitoringService.js';

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

// 模拟服务类
class MockService {
  constructor(name) {
    this.name = name;
    this.callCount = 0;
    this.errorRate = 0.1; // 10%错误率
  }

  async performOperation() {
    this.callCount++;
    
    // 模拟响应时间
    const responseTime = Math.random() * 1000 + 100; // 100-1100ms
    await new Promise(resolve => setTimeout(resolve, responseTime));
    
    // 模拟错误
    const hasError = Math.random() < this.errorRate;
    if (hasError) {
      throw new Error(`${this.name} operation failed`);
    }
    
    return {
      success: true,
      responseTime,
      data: `Result from ${this.name}`
    };
  }
}

async function main() {
  log(colors.bold + colors.cyan, '🔧 监控系统测试开始');

  const testResults = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  try {
    // 1. 指标收集器测试
    await testMetricCollector(testResults);

    // 2. 监控服务基础功能测试
    await testMonitoringServiceBasics(testResults);

    // 3. 服务监控和指标收集测试
    await testServiceMonitoring(testResults);

    // 4. 告警系统测试
    await testAlertSystem(testResults);

    // 5. 仪表板数据测试
    await testDashboardData(testResults);

    // 6. 集成测试
    await testIntegration(testResults);

    // 生成测试报告
    await generateTestReport(testResults);

    const successRate = Math.round((testResults.summary.passed / testResults.summary.total) * 100);
    
    log(colors.bold + colors.green, `\n✅ 监控系统测试完成`);
    log(colors.green, `📊 测试结果: ${testResults.summary.passed}/${testResults.summary.total} 通过 (${successRate}%)`);

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log(colors.red, `❌ 测试执行失败: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

async function testMetricCollector(testResults) {
  log(colors.blue, '\n📋 1. 指标收集器测试');

  const collector = new MetricCollector({
    maxSeriesSize: 100,
    enableAutoCleanup: false
  });

  const tests = [
    {
      name: '计数器指标',
      test: () => {
        collector.incrementCounter('test.counter', 5);
        collector.incrementCounter('test.counter', 3);
        
        const value = collector.getMetricValue('test.counter', 'sum');
        if (value !== 8) throw new Error(`计数器值不正确: ${value}`);
        
        return { counterValue: value };
      }
    },
    {
      name: '仪表盘指标',
      test: () => {
        collector.setGauge('test.gauge', 42.5);
        
        const value = collector.getMetricValue('test.gauge', 'avg');
        if (value !== 42.5) throw new Error(`仪表盘值不正确: ${value}`);
        
        return { gaugeValue: value };
      }
    },
    {
      name: '定时器指标',
      test: () => {
        collector.recordTimer('test.timer', 100);
        collector.recordTimer('test.timer', 200);
        collector.recordTimer('test.timer', 300);
        
        const avgTime = collector.getMetricValue('test.timer', 'avg');
        const maxTime = collector.getMetricValue('test.timer', 'max');
        
        if (Math.abs(avgTime - 200) > 0.1) throw new Error(`平均时间不正确: ${avgTime}`);
        if (maxTime !== 300) throw new Error(`最大时间不正确: ${maxTime}`);
        
        return { avgTime, maxTime };
      }
    },
    {
      name: '百分位数计算',
      test: () => {
        const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        values.forEach(v => collector.recordTimer('test.percentiles', v));
        
        const p50 = collector.getMetricValue('test.percentiles', 'p50');
        const p95 = collector.getMetricValue('test.percentiles', 'p95');
        
        if (p50 < 50 || p50 > 60) throw new Error(`P50不正确: ${p50}`);
        if (p95 < 90 || p95 > 100) throw new Error(`P95不正确: ${p95}`);
        
        return { p50, p95 };
      }
    },
    {
      name: '时间窗口过滤',
      test: () => {
        const now = Date.now();
        collector.addDataPoint('test.window', 10, {}, now - 2000); // 2秒前
        collector.addDataPoint('test.window', 20, {}, now - 1000); // 1秒前
        collector.addDataPoint('test.window', 30, {}, now); // 现在
        
        const recent = collector.getMetricValue('test.window', 'avg', TimeWindow.SECOND);
        const all = collector.getMetricValue('test.window', 'avg');
        
        if (recent !== 30) throw new Error(`时间窗口过滤不正确: ${recent}`);
        if (Math.abs(all - 20) > 0.1) throw new Error(`全部数据平均值不正确: ${all}`);
        
        return { recent, all };
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

  collector.destroy();
}

async function testMonitoringServiceBasics(testResults) {
  log(colors.blue, '\n📋 2. 监控服务基础功能测试');

  const monitoring = new MonitoringService({
    enableRealTimeMonitoring: false,
    enableAlerts: false,
    enableSystemMetrics: false
  });

  const tests = [
    {
      name: '服务初始化',
      test: async () => {
        const result = await monitoring.initialize();
        if (!result) throw new Error('初始化失败');
        if (!monitoring.initialized) throw new Error('初始化状态不正确');
        return { initialized: true };
      }
    },
    {
      name: '服务注册',
      test: () => {
        const mockService = new MockService('TestService');
        const registered = monitoring.registerService('TestService', mockService);
        
        if (!registered) throw new Error('服务注册失败');
        
        const instances = monitoring.serviceInstances;
        if (!instances.has('TestService')) throw new Error('服务未注册到实例列表');
        
        return { registered: true, instanceCount: instances.size };
      }
    },
    {
      name: '自定义指标记录',
      test: () => {
        monitoring.recordCustomMetric('custom.counter', 'counter', 5);
        monitoring.recordCustomMetric('custom.gauge', 'gauge', 75.5);
        monitoring.recordCustomMetric('custom.timer', 'timer', 150);
        
        const counter = monitoring.metricCollector.getMetricValue('custom.counter', 'sum');
        const gauge = monitoring.metricCollector.getMetricValue('custom.gauge', 'avg');
        const timer = monitoring.metricCollector.getMetricValue('custom.timer', 'avg');
        
        if (counter !== 5) throw new Error(`自定义计数器错误: ${counter}`);
        if (gauge !== 75.5) throw new Error(`自定义仪表盘错误: ${gauge}`);
        if (timer !== 150) throw new Error(`自定义定时器错误: ${timer}`);
        
        return { counter, gauge, timer };
      }
    },
    {
      name: '系统健康检查',
      test: () => {
        const health = monitoring.getSystemHealth();
        
        if (!health.status) throw new Error('健康状态缺失');
        if (!health.timestamp) throw new Error('时间戳缺失');
        if (typeof health.services !== 'object') throw new Error('服务健康信息格式错误');
        
        return { status: health.status, servicesTotal: health.services.total };
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

  await monitoring.cleanup();
}

async function testServiceMonitoring(testResults) {
  log(colors.blue, '\n📋 3. 服务监控和指标收集测试');

  const monitoring = new MonitoringService({
    enableRealTimeMonitoring: false,
    enableAlerts: false
  });
  
  await monitoring.initialize();

  const mockService = new MockService('MonitoredService');
  monitoring.registerService('MonitoredService', mockService);

  const tests = [
    {
      name: '服务调用记录',
      test: async () => {
        // 记录成功调用
        monitoring.recordServiceCall('MonitoredService', 150, true);
        monitoring.recordServiceCall('MonitoredService', 200, true);
        
        // 记录失败调用
        monitoring.recordServiceCall('MonitoredService', 300, false, 'TIMEOUT');
        
        const invocations = monitoring.metricCollector.getMetricValue(
          PredefinedMetrics.SERVICE_INVOCATION_COUNT.name, 'count'
        );
        
        const avgResponseTime = monitoring.metricCollector.getMetricValue(
          PredefinedMetrics.SERVICE_RESPONSE_TIME.name, 'avg'
        );
        
        const errors = monitoring.metricCollector.getMetricValue(
          PredefinedMetrics.ERROR_COUNT.name, 'count'
        );
        
        if (invocations !== 3) throw new Error(`调用次数错误: ${invocations}`);
        if (Math.abs(avgResponseTime - 216.67) > 10) throw new Error(`平均响应时间错误: ${avgResponseTime}`);
        if (errors !== 1) throw new Error(`错误次数错误: ${errors}`);
        
        return { invocations, avgResponseTime, errors };
      }
    },
    {
      name: '服务指标获取',
      test: () => {
        const metrics = monitoring.getServiceMetrics('MonitoredService');
        
        if (!metrics.invocations) throw new Error('调用次数指标缺失');
        if (!metrics.avgResponseTime) throw new Error('平均响应时间指标缺失');
        if (typeof metrics.errorCount !== 'number') throw new Error('错误计数指标缺失');
        
        return metrics;
      }
    },
    {
      name: '计时器功能',
      test: async () => {
        const timer = monitoring.startTiming(PredefinedMetrics.SERVICE_RESPONSE_TIME.name);
        
        // 模拟操作
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const duration = timer.end();
        
        if (duration < 45 || duration > 100) throw new Error(`计时器时间不准确: ${duration}ms`);
        
        return { duration };
      }
    },
    {
      name: '业务指标记录',
      test: () => {
        monitoring.recordBusinessMetric(
          PredefinedMetrics.HTML_PARSING_SUCCESS_RATE.name,
          95.5,
          { parser: 'cheerio' }
        );
        
        const successRate = monitoring.metricCollector.getMetricValue(
          PredefinedMetrics.HTML_PARSING_SUCCESS_RATE.name,
          'avg'
        );
        
        if (successRate !== 95.5) throw new Error(`业务指标记录错误: ${successRate}`);
        
        return { successRate };
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

  await monitoring.cleanup();
}

async function testAlertSystem(testResults) {
  log(colors.blue, '\n📋 4. 告警系统测试');

  const monitoring = new MonitoringService({
    enableRealTimeMonitoring: false,
    enableAlerts: false
  });
  
  await monitoring.initialize();

  const tests = [
    {
      name: '告警规则添加',
      test: () => {
        const rule = monitoring.addAlertRule({
          name: 'test_high_response_time',
          metric: PredefinedMetrics.SERVICE_RESPONSE_TIME.name,
          type: 'threshold',
          condition: 'greater_than',
          threshold: 1000,
          window: TimeWindow.MINUTE,
          level: AlertLevel.WARNING,
          description: '响应时间过高'
        });
        
        if (!rule) throw new Error('告警规则添加失败');
        if (rule.name !== 'test_high_response_time') throw new Error('规则名称不正确');
        
        return { ruleName: rule.name, threshold: rule.threshold };
      }
    },
    {
      name: '告警监听器',
      test: () => {
        let alertReceived = null;
        
        const listener = (alert) => {
          alertReceived = alert;
        };
        
        monitoring.addAlertListener(listener);
        
        // 手动触发告警
        monitoring.triggerAlert({
          rule: 'test_alert',
          metric: 'test.metric',
          value: 150,
          threshold: 100,
          level: AlertLevel.WARNING,
          description: '测试告警',
          timestamp: new Date().toISOString()
        });
        
        if (!alertReceived) throw new Error('告警监听器未收到告警');
        if (alertReceived.rule !== 'test_alert') throw new Error('告警内容不正确');
        
        monitoring.removeAlertListener(listener);
        return { alertReceived: true };
      }
    },
    {
      name: '告警历史记录',
      test: () => {
        const historyBefore = monitoring.getRecentAlerts().length;
        
        monitoring.triggerAlert({
          rule: 'history_test',
          metric: 'test.metric',
          value: 200,
          threshold: 100,
          level: AlertLevel.ERROR,
          description: '历史测试告警',
          timestamp: new Date().toISOString()
        });
        
        const historyAfter = monitoring.getRecentAlerts().length;
        
        if (historyAfter !== historyBefore + 1) throw new Error('告警历史记录未正确更新');
        
        return { historyBefore, historyAfter };
      }
    },
    {
      name: '活跃告警检测',
      test: () => {
        // 触发一个当前告警
        monitoring.triggerAlert({
          rule: 'active_test',
          metric: 'test.metric',
          value: 300,
          threshold: 200,
          level: AlertLevel.CRITICAL,
          description: '活跃告警测试',
          timestamp: new Date().toISOString()
        });
        
        const activeAlerts = monitoring.getActiveAlerts();
        const hasActiveAlert = activeAlerts.some(alert => alert.rule === 'active_test');
        
        if (!hasActiveAlert) throw new Error('活跃告警未正确检测');
        
        return { activeAlertsCount: activeAlerts.length };
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

  await monitoring.cleanup();
}

async function testDashboardData(testResults) {
  log(colors.blue, '\n📋 5. 仪表板数据测试');

  const monitoring = new MonitoringService({
    enableRealTimeMonitoring: false,
    enableAlerts: false
  });
  
  await monitoring.initialize();
  
  // 准备测试数据
  monitoring.registerService('DashboardTest', new MockService('DashboardTest'));
  monitoring.recordServiceCall('DashboardTest', 100, true);
  monitoring.recordBusinessMetric(PredefinedMetrics.HTML_PARSING_SUCCESS_RATE.name, 98.5);

  const tests = [
    {
      name: '仪表板数据结构',
      test: () => {
        const dashboard = monitoring.getDashboardData(TimeWindow.HOUR);
        
        if (!dashboard.timestamp) throw new Error('时间戳缺失');
        if (!dashboard.health) throw new Error('健康状态缺失');
        if (!dashboard.metrics) throw new Error('指标数据缺失');
        if (!dashboard.services) throw new Error('服务数据缺失');
        if (!dashboard.alerts) throw new Error('告警数据缺失');
        
        return { 
          hasTimestamp: !!dashboard.timestamp,
          metricsCategories: Object.keys(dashboard.metrics).length,
          servicesCount: Object.keys(dashboard.services).length
        };
      }
    },
    {
      name: '指标分类数据',
      test: () => {
        const performanceMetrics = monitoring.getMetrics(MetricCategory.PERFORMANCE);
        const businessMetrics = monitoring.getMetrics(MetricCategory.BUSINESS);
        
        if (typeof performanceMetrics !== 'object') throw new Error('性能指标数据格式错误');
        if (typeof businessMetrics !== 'object') throw new Error('业务指标数据格式错误');
        
        return { 
          performanceMetricsCount: Object.keys(performanceMetrics).length,
          businessMetricsCount: Object.keys(businessMetrics).length
        };
      }
    },
    {
      name: '指标概要数据',
      test: () => {
        const summary = monitoring.getMetrics();
        
        if (typeof summary !== 'object') throw new Error('指标概要格式错误');
        
        // 检查是否包含预期的指标
        const hasServiceMetrics = Object.keys(summary).some(key => 
          key.includes('service.')
        );
        
        if (!hasServiceMetrics) throw new Error('缺少服务相关指标');
        
        return { 
          totalMetrics: Object.keys(summary).length,
          hasServiceMetrics 
        };
      }
    },
    {
      name: '数据导出功能',
      test: () => {
        const exportedData = monitoring.exportData('object');
        
        if (!exportedData.timestamp) throw new Error('导出数据缺少时间戳');
        if (!exportedData.health) throw new Error('导出数据缺少健康状态');
        if (!exportedData.metrics) throw new Error('导出数据缺少指标');
        
        const jsonExport = monitoring.exportData('json');
        if (typeof jsonExport !== 'string') throw new Error('JSON导出格式错误');
        
        return { 
          hasRequiredFields: true,
          jsonLength: jsonExport.length 
        };
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

  await monitoring.cleanup();
}

async function testIntegration(testResults) {
  log(colors.blue, '\n📋 6. 集成测试');

  const monitoring = new MonitoringService({
    monitoringInterval: 100, // 快速间隔用于测试
    alertCheckInterval: 200,
    enableRealTimeMonitoring: true,
    enableAlerts: true,
    enableSystemMetrics: true
  });

  const tests = [
    {
      name: '完整监控流程',
      test: async () => {
        await monitoring.initialize();
        
        // 注册服务
        const service1 = new MockService('IntegrationService1');
        const service2 = new MockService('IntegrationService2');
        
        monitoring.registerService('IntegrationService1', service1);
        monitoring.registerService('IntegrationService2', service2);
        
        // 模拟服务调用
        for (let i = 0; i < 10; i++) {
          try {
            const startTime = Date.now();
            await service1.performOperation();
            const duration = Date.now() - startTime;
            monitoring.recordServiceCall('IntegrationService1', duration, true);
          } catch {
            monitoring.recordServiceCall('IntegrationService1', 1000, false, 'ERROR');
          }
        }
        
        // 等待监控数据收集
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const dashboard = monitoring.getDashboardData();
        const health = monitoring.getSystemHealth();
        
        if (!dashboard.services['IntegrationService1']) throw new Error('服务监控数据缺失');
        if (health.services.total !== 2) throw new Error('服务注册数量不正确');
        
        return { 
          servicesRegistered: health.services.total,
          dashboardGenerated: true
        };
      }
    },
    {
      name: '实时监控功能',
      test: async () => {
        // 等待实时监控运行
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const beforeMetrics = monitoring.metricCollector.getMetricValue(
          PredefinedMetrics.SERVICE_ACTIVE_INSTANCES.name, 'avg'
        );
        
        // 添加新服务
        monitoring.registerService('RealtimeTestService', new MockService('RealtimeTest'));
        
        // 等待实时监控更新
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const afterMetrics = monitoring.metricCollector.getMetricValue(
          PredefinedMetrics.SERVICE_ACTIVE_INSTANCES.name, 'avg'
        );
        
        if (afterMetrics <= beforeMetrics) throw new Error('实时监控未更新服务实例数');
        
        return { 
          beforeMetrics, 
          afterMetrics,
          realTimeWorking: true 
        };
      }
    },
    {
      name: '系统指标收集',
      test: async () => {
        // 等待系统指标收集
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const memoryUsage = monitoring.metricCollector.getMetricValue(
          PredefinedMetrics.MEMORY_USAGE.name, 'avg'
        );
        
        const cpuUsage = monitoring.metricCollector.getMetricValue(
          PredefinedMetrics.CPU_USAGE.name, 'avg'
        );
        
        if (memoryUsage === null) throw new Error('内存使用指标未收集');
        if (cpuUsage === null) throw new Error('CPU使用指标未收集');
        
        return { 
          memoryUsage: memoryUsage.toFixed(2),
          cpuUsage: cpuUsage.toFixed(2)
        };
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

  await monitoring.cleanup();
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
    report.conclusion.recommendations.push('监控系统已就绪，可以部署到生产环境');
    report.conclusion.recommendations.push('建议配置告警通知渠道');
    report.conclusion.recommendations.push('建议设置监控面板和仪表板');
  } else {
    report.conclusion.recommendations.push('需要修复失败的测试后再部署');
  }

  report.conclusion.recommendations.push(
    '建议定期检查监控系统的性能影响',
    '建议根据实际负载调整指标收集频率',
    '建议建立监控数据的备份和归档策略'
  );

  const reportPath = join(__dirname, 'MONITORING_SYSTEM_TEST_REPORT.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  log(colors.green, `\n📊 测试报告已生成: ${reportPath}`);
}

main();
