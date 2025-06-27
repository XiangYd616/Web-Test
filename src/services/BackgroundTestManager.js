/**
 * 后台测试管理器 - 管理所有正在运行的测试任务
 * 支持页面切换时测试继续运行
 */

class BackgroundTestManager {
  constructor() {
    this.runningTests = new Map(); // 存储正在运行的测试
    this.completedTests = new Map(); // 存储已完成的测试
    this.listeners = new Set(); // 状态变化监听器
    this.testCounter = 0; // 测试计数器
    this.apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

    // 从localStorage恢复状态
    this.loadFromStorage();

    // 定期保存状态
    setInterval(() => this.saveToStorage(), 5000);
  }

  // 生成唯一测试ID
  generateTestId() {
    return `test_${Date.now()}_${++this.testCounter}`;
  }

  // 开始新测试
  startTest(testType, config, onProgress, onComplete, onError) {
    const testId = this.generateTestId();
    
    const testInfo = {
      id: testId,
      type: testType,
      config: config,
      status: 'running',
      progress: 0,
      startTime: new Date(),
      currentStep: '正在初始化测试...',
      result: null,
      error: null,
      onProgress: onProgress,
      onComplete: onComplete,
      onError: onError
    };

    this.runningTests.set(testId, testInfo);
    this.notifyListeners('testStarted', testInfo);
    
    // 根据测试类型执行相应的测试
    this.executeTest(testInfo);
    
    return testId;
  }

  // 执行测试
  async executeTest(testInfo) {
    try {
      switch (testInfo.type) {
        case 'website':
          await this.executeWebsiteTest(testInfo);
          break;
        case 'database':
          await this.executeDatabaseTest(testInfo);
          break;
        case 'api':
          await this.executeAPITest(testInfo);
          break;
        case 'performance':
          await this.executePerformanceTest(testInfo);
          break;
        case 'stress':
          await this.executeStressTest(testInfo);
          break;
        case 'security':
          await this.executeSecurityTest(testInfo);
          break;
        case 'compatibility':
          await this.executeCompatibilityTest(testInfo);
          break;
        case 'content':
          await this.executeContentTest(testInfo);
          break;
        case 'seo':
          await this.executeSEOTest(testInfo);
          break;
        default:
          throw new Error(`未知的测试类型: ${testInfo.type}`);
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error);
    }
  }

  // 执行网站综合测试
  async executeWebsiteTest(testInfo) {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 10, '🌐 正在准备网站测试...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/test/website`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 30, '🔍 正在执行综合测试...');

      // 模拟网站测试步骤
      await this.simulateProgressiveTest(testInfo.id, 30, 90, [
        '⚡ 正在测试性能指标...',
        '🔍 正在分析SEO优化...',
        '🔒 正在检查安全配置...',
        '🌍 正在测试兼容性...',
        '📊 正在生成综合报告...'
      ]);

      const data = await response.json();

      if (data.success || data.status === 'completed') {
        // 正确处理后端返回的数据结构
        const testResult = data.data || data.results || data;
        console.log('🔍 Processing test result:', testResult);
        this.completeTest(testInfo.id, testResult);
      } else {
        throw new Error(data.message || '网站测试失败');
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error);
    }
  }

  // 执行SEO测试
  async executeSEOTest(testInfo) {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 10, '🔍 正在准备SEO测试...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/test/seo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 30, '📈 正在执行SEO分析...');

      // 模拟SEO测试步骤
      await this.simulateProgressiveTest(testInfo.id, 30, 90, [
        '🏷️ 正在检查标题和描述...',
        '🔗 正在分析内链结构...',
        '📱 正在测试移动友好性...',
        '⚡ 正在检查页面速度...',
        '📊 正在生成SEO报告...'
      ]);

      const data = await response.json();

      if (data.success || data.status === 'completed') {
        // 确保SEO测试结果有正确的数据结构
        const seoResults = data.data || data.results || data;

        // 如果是直接的SEO结果，确保有必要的字段
        if (seoResults && !seoResults.findings && seoResults.issues) {
          seoResults.findings = seoResults.issues;
        }

        this.completeTest(testInfo.id, seoResults);
      } else {
        throw new Error(data.message || 'SEO测试失败');
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error);
    }
  }

  // 执行数据库测试
  async executeDatabaseTest(testInfo) {
    const { config } = testInfo;
    
    this.updateTestProgress(testInfo.id, 10, '🔍 正在连接数据库...');
    
    try {
      const response = await fetch('/api/test/database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 50, '📊 正在分析数据库性能...');
      
      const data = await response.json();
      
      this.updateTestProgress(testInfo.id, 90, '✅ 正在生成测试报告...');
      
      if (data.success) {
        this.completeTest(testInfo.id, data.data);
      } else {
        throw new Error(data.message || '数据库测试失败');
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error);
    }
  }

  // 执行API测试
  async executeAPITest(testInfo) {
    const { config } = testInfo;
    
    this.updateTestProgress(testInfo.id, 10, '🔌 正在准备API测试...');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/test/api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 50, '🧪 正在执行API测试...');
      
      const data = await response.json();
      
      this.updateTestProgress(testInfo.id, 90, '📋 正在生成测试报告...');
      
      if (data.success || data.status === 'completed') {
        this.completeTest(testInfo.id, data.results || data);
      } else {
        throw new Error(data.message || 'API测试失败');
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error);
    }
  }

  // 执行性能测试
  async executePerformanceTest(testInfo) {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 10, '⚡ 正在准备性能测试...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/test/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 30, '🚀 正在执行性能测试...');

      // 模拟长时间运行的测试
      await this.simulateProgressiveTest(testInfo.id, 30, 90, [
        '📈 正在分析页面性能...',
        '💾 正在测试加载速度...',
        '🔍 正在检查资源优化...',
        '📊 正在生成性能报告...'
      ]);

      const data = await response.json();

      if (data.success || data.status === 'completed') {
        this.completeTest(testInfo.id, data.results || data);
      } else {
        throw new Error(data.message || '性能测试失败');
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error);
    }
  }

  // 执行压力测试
  async executeStressTest(testInfo) {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 5, '⚡ 正在准备压力测试...');

    try {
      // 准备压力测试配置
      const stressConfig = {
        url: config.url,
        options: {
          users: config.vus || config.users || 10,
          duration: parseInt(config.duration) || 30,
          rampUpTime: config.rampUp || 5,
          testType: config.testType || 'gradual',
          method: config.method || 'GET',
          timeout: config.timeout || 30,
          thinkTime: config.thinkTime || 1,
          warmupDuration: config.warmupDuration || 5
        }
      };

      console.log('🔥 Starting stress test with config:', stressConfig);

      this.updateTestProgress(testInfo.id, 10, '🚀 正在启动压力测试引擎...');

      const response = await fetch(`${this.apiBaseUrl}/test/stress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(stressConfig)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 20, '👥 正在启动虚拟用户...');

      // 根据测试时长模拟进度
      const duration = stressConfig.options.duration;
      const progressSteps = [
        { progress: 30, message: '📈 正在执行压力测试...' },
        { progress: 50, message: '💾 正在收集响应时间数据...' },
        { progress: 70, message: '🔍 正在分析并发性能...' },
        { progress: 85, message: '📊 正在计算性能指标...' },
        { progress: 95, message: '✅ 正在生成测试报告...' }
      ];

      // 根据实际测试时长分配进度更新时间
      const stepDuration = (duration * 1000) / progressSteps.length;

      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, stepDuration));
        this.updateTestProgress(testInfo.id, step.progress, step.message);
      }

      const data = await response.json();
      console.log('🎯 Stress test response:', data);

      if (data.success) {
        // 处理成功的压力测试结果
        const result = data.data || data;

        // 确保结果包含必要的指标
        const processedResult = {
          ...result,
          success: true,
          metrics: {
            totalRequests: result.metrics?.totalRequests || 0,
            successfulRequests: result.metrics?.successfulRequests || 0,
            failedRequests: result.metrics?.failedRequests || 0,
            averageResponseTime: result.metrics?.averageResponseTime || 0,
            minResponseTime: result.metrics?.minResponseTime || 0,
            maxResponseTime: result.metrics?.maxResponseTime || 0,
            p50ResponseTime: result.metrics?.p50ResponseTime || 0,
            p90ResponseTime: result.metrics?.p90ResponseTime || 0,
            p95ResponseTime: result.metrics?.p95ResponseTime || 0,
            p99ResponseTime: result.metrics?.p99ResponseTime || 0,
            throughput: result.metrics?.throughput || 0,
            errorRate: result.metrics?.errorRate || 0,
            errors: result.metrics?.errors || [],
            ...result.metrics
          },
          duration: result.actualDuration || duration,
          testType: 'stress'
        };

        this.completeTest(testInfo.id, processedResult);
      } else {
        throw new Error(data.message || data.error || '压力测试失败');
      }
    } catch (error) {
      console.error('❌ Stress test failed:', error);
      this.handleTestError(testInfo.id, error);
    }
  }

  // 执行安全测试
  async executeSecurityTest(testInfo) {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 10, '🔒 正在准备安全测试...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/test/security`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 30, '🛡️ 正在执行安全扫描...');

      // 模拟安全测试步骤
      await this.simulateProgressiveTest(testInfo.id, 30, 90, [
        '🔍 正在检查漏洞...',
        '🔐 正在验证SSL/TLS...',
        '🚫 正在测试XSS防护...',
        '📋 正在生成安全报告...'
      ]);

      const data = await response.json();

      if (data.success || data.status === 'completed') {
        this.completeTest(testInfo.id, data.results || data);
      } else {
        throw new Error(data.message || '安全测试失败');
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error);
    }
  }

  // 执行兼容性测试
  async executeCompatibilityTest(testInfo) {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 10, '🌐 正在准备兼容性测试...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/test/compatibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 30, '🔄 正在测试多浏览器兼容性...');

      // 模拟兼容性测试步骤
      await this.simulateProgressiveTest(testInfo.id, 30, 90, [
        '🌍 正在测试Chrome兼容性...',
        '🦊 正在测试Firefox兼容性...',
        '🧭 正在测试Safari兼容性...',
        '📊 正在生成兼容性报告...'
      ]);

      const data = await response.json();

      if (data.success || data.status === 'completed') {
        this.completeTest(testInfo.id, data.results || data);
      } else {
        throw new Error(data.message || '兼容性测试失败');
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error);
    }
  }

  // 执行内容测试
  async executeContentTest(testInfo) {
    const { config } = testInfo;

    this.updateTestProgress(testInfo.id, 10, '📄 正在准备内容测试...');

    try {
      const response = await fetch('/api/test/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.updateTestProgress(testInfo.id, 30, '🔍 正在分析页面内容...');

      // 模拟内容测试步骤
      await this.simulateProgressiveTest(testInfo.id, 30, 90, [
        '📝 正在检查文本内容...',
        '🖼️ 正在验证图片资源...',
        '🔗 正在检查链接有效性...',
        '📋 正在生成内容报告...'
      ]);

      const data = await response.json();

      if (data.success || data.status === 'completed') {
        this.completeTest(testInfo.id, data.results || data);
      } else {
        throw new Error(data.message || '内容测试失败');
      }
    } catch (error) {
      this.handleTestError(testInfo.id, error);
    }
  }

  // 模拟渐进式测试进度
  async simulateProgressiveTest(testId, startProgress, endProgress, steps) {
    const stepSize = (endProgress - startProgress) / steps.length;
    
    for (let i = 0; i < steps.length; i++) {
      const progress = startProgress + (stepSize * (i + 1));
      this.updateTestProgress(testId, progress, steps[i]);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 每步等待2秒
    }
  }

  // 更新测试进度
  updateTestProgress(testId, progress, currentStep) {
    const testInfo = this.runningTests.get(testId);
    if (testInfo) {
      testInfo.progress = progress;
      testInfo.currentStep = currentStep;
      
      // 调用原始的进度回调
      if (testInfo.onProgress) {
        testInfo.onProgress(progress, currentStep);
      }
      
      this.notifyListeners('testProgress', testInfo);
    }
  }

  // 完成测试
  completeTest(testId, result) {
    const testInfo = this.runningTests.get(testId);
    if (testInfo) {
      testInfo.status = 'completed';
      testInfo.progress = 100;
      testInfo.currentStep = '✅ 测试完成！';
      testInfo.result = result;
      testInfo.endTime = new Date();
      
      // 移动到已完成列表
      this.runningTests.delete(testId);
      this.completedTests.set(testId, testInfo);
      
      // 调用原始的完成回调
      if (testInfo.onComplete) {
        testInfo.onComplete(result);
      }
      
      this.notifyListeners('testCompleted', testInfo);
      this.saveToStorage();
    }
  }

  // 处理测试错误
  handleTestError(testId, error) {
    const testInfo = this.runningTests.get(testId);
    if (testInfo) {
      testInfo.status = 'failed';
      testInfo.error = error.message;
      testInfo.endTime = new Date();
      
      // 移动到已完成列表
      this.runningTests.delete(testId);
      this.completedTests.set(testId, testInfo);
      
      // 调用原始的错误回调
      if (testInfo.onError) {
        testInfo.onError(error);
      }
      
      this.notifyListeners('testFailed', testInfo);
      this.saveToStorage();
    }
  }

  // 取消测试
  cancelTest(testId) {
    const testInfo = this.runningTests.get(testId);
    if (testInfo) {
      testInfo.status = 'cancelled';
      testInfo.endTime = new Date();
      
      this.runningTests.delete(testId);
      this.completedTests.set(testId, testInfo);
      
      this.notifyListeners('testCancelled', testInfo);
      this.saveToStorage();
    }
  }

  // 获取测试状态
  getTestStatus(testId) {
    return this.runningTests.get(testId) || this.completedTests.get(testId);
  }

  // 获取所有运行中的测试
  getRunningTests() {
    return Array.from(this.runningTests.values());
  }

  // 获取所有已完成的测试
  getCompletedTests() {
    return Array.from(this.completedTests.values());
  }

  // 添加状态监听器
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // 通知所有监听器
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  // 保存状态到localStorage
  saveToStorage() {
    try {
      const state = {
        runningTests: Array.from(this.runningTests.entries()).map(([id, test]) => [
          id, 
          { ...test, onProgress: null, onComplete: null, onError: null } // 移除回调函数
        ]),
        completedTests: Array.from(this.completedTests.entries()).map(([id, test]) => [
          id,
          { ...test, onProgress: null, onComplete: null, onError: null }
        ])
      };
      localStorage.setItem('backgroundTestManager', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save test manager state:', error);
    }
  }

  // 从localStorage加载状态
  loadFromStorage() {
    try {
      const saved = localStorage.getItem('backgroundTestManager');
      if (saved) {
        const state = JSON.parse(saved);
        
        // 恢复已完成的测试
        if (state.completedTests) {
          this.completedTests = new Map(state.completedTests);
        }
        
        // 运行中的测试需要重新启动或标记为失败
        if (state.runningTests) {
          state.runningTests.forEach(([id, test]) => {
            test.status = 'failed';
            test.error = '页面刷新导致测试中断';
            test.endTime = new Date();
            this.completedTests.set(id, test);
          });
        }
      }
    } catch (error) {
      console.error('Failed to load test manager state:', error);
    }
  }

  // 清理旧的测试记录
  cleanup() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时
    
    for (const [id, test] of this.completedTests.entries()) {
      if (test.endTime && (now - new Date(test.endTime)) > maxAge) {
        this.completedTests.delete(id);
      }
    }
    
    this.saveToStorage();
  }
}

// 创建全局实例
const backgroundTestManager = new BackgroundTestManager();

// 定期清理
setInterval(() => backgroundTestManager.cleanup(), 60 * 60 * 1000); // 每小时清理一次

export default backgroundTestManager;
