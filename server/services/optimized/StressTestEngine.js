/**
 * 优化的压力测试引擎
 * 基于新的基类架构重构，大幅简化代码
 */

const HttpTestEngine = require('../base/HttpTestEngine');
const { AppError } = require('../../middleware/errorHandler');

class StressTestEngine extends HttpTestEngine {
  constructor(options = {}) {
    super({
      name: 'StressTestEngine',
      version: '2.0.0',
      ...options
    });
    
    // 压力测试特定配置
    this.stressConfig = {
      maxConcurrentUsers: 1000,
      rampUpTime: 60000, // 1分钟
      testDuration: 300000, // 5分钟
      thinkTime: 1000, // 用户思考时间
      ...options.stressConfig
    };
    
    // 虚拟用户管理
    this.virtualUsers = new Map();
    this.activeUsers = 0;
    this.completedUsers = 0;
    
    // 测试阶段
    this.phases = {
      rampUp: 'ramp-up',
      steady: 'steady-state',
      rampDown: 'ramp-down'
    };
    this.currentPhase = null;
  }

  /**
   * 验证压力测试配置
   */
  validateConfig(config) {
    super.validateConfig(config);
    
    if (!config.url) {
      throw new AppError('Target URL is required for stress test', 400);
    }
    
    if (!config.users || config.users < 1) {
      throw new AppError('Number of users must be at least 1', 400);
    }
    
    if (config.users > this.stressConfig.maxConcurrentUsers) {
      throw new AppError(`Maximum concurrent users is ${this.stressConfig.maxConcurrentUsers}`, 400);
    }
    
    return true;
  }

  /**
   * 执行压力测试
   */
  async executeTest(config) {
    const { url, users, duration = this.stressConfig.testDuration, rampUpTime = this.stressConfig.rampUpTime } = config;
    
    this.log('info', `Starting stress test`, { 
      url, 
      users, 
      duration: duration / 1000 + 's',
      rampUpTime: rampUpTime / 1000 + 's'
    });
    
    const testResult = {
      success: true,
      phases: {},
      summary: {}
    };
    
    try {
      // 阶段1: 用户爬坡
      this.currentPhase = this.phases.rampUp;
      this.updateProgress(0, 100, this.currentPhase, 'Starting user ramp-up');
      
      const rampUpResult = await this.executeRampUp(url, users, rampUpTime);
      testResult.phases.rampUp = rampUpResult;
      
      if (this.isCancelled()) return this.getCancelledResult();
      
      // 阶段2: 稳定状态测试
      this.currentPhase = this.phases.steady;
      this.updateProgress(33, 100, this.currentPhase, 'Running steady-state test');
      
      const steadyResult = await this.executeSteadyState(url, duration);
      testResult.phases.steady = steadyResult;
      
      if (this.isCancelled()) return this.getCancelledResult();
      
      // 阶段3: 用户下降
      this.currentPhase = this.phases.rampDown;
      this.updateProgress(66, 100, this.currentPhase, 'Ramping down users');
      
      const rampDownResult = await this.executeRampDown();
      testResult.phases.rampDown = rampDownResult;
      
      // 生成测试摘要
      testResult.summary = this.generateTestSummary();
      this.updateProgress(100, 100, 'completed', 'Stress test completed successfully');
      
      return testResult;
      
    } catch (error) {
      this.log('error', `Stress test failed: ${error.message}`, { phase: this.currentPhase });
      throw error;
    }
  }

  /**
   * 执行用户爬坡阶段
   */
  async executeRampUp(url, targetUsers, rampUpTime) {
    this.log('info', `Starting ramp-up phase`, { targetUsers, rampUpTime });
    
    const userInterval = rampUpTime / targetUsers;
    const startTime = Date.now();
    
    for (let i = 0; i < targetUsers; i++) {
      if (this.isCancelled()) break;
      
      // 创建虚拟用户
      const userId = `user_${i + 1}`;
      await this.createVirtualUser(userId, url);
      
      // 更新进度
      const progress = ((i + 1) / targetUsers) * 33; // 爬坡阶段占总进度的33%
      this.updateProgress(progress, 100, this.currentPhase, `Started ${i + 1}/${targetUsers} users`);
      
      // 等待下一个用户启动间隔
      if (i < targetUsers - 1) {
        await this.sleep(userInterval);
      }
    }
    
    const endTime = Date.now();
    return {
      duration: endTime - startTime,
      usersStarted: this.activeUsers,
      avgStartupTime: (endTime - startTime) / targetUsers
    };
  }

  /**
   * 执行稳定状态测试
   */
  async executeSteadyState(url, duration) {
    this.log('info', `Starting steady-state phase`, { duration, activeUsers: this.activeUsers });
    
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    // 监控测试进度
    const progressInterval = setInterval(() => {
      if (this.isCancelled()) {
        clearInterval(progressInterval);
        return;
      }
      
      const elapsed = Date.now() - startTime;
      const progress = 33 + (elapsed / duration) * 33; // 稳定阶段占33%
      this.updateProgress(
        Math.min(progress, 66), 
        100, 
        this.currentPhase, 
        `Running for ${Math.round(elapsed / 1000)}s, ${this.activeUsers} active users`
      );
    }, 1000);
    
    this.addCleanupCallback(() => clearInterval(progressInterval));
    
    // 等待测试完成
    while (Date.now() < endTime && !this.isCancelled()) {
      await this.sleep(1000);
    }
    
    clearInterval(progressInterval);
    
    return {
      duration: Date.now() - startTime,
      activeUsers: this.activeUsers,
      completedUsers: this.completedUsers
    };
  }

  /**
   * 执行用户下降阶段
   */
  async executeRampDown() {
    this.log('info', `Starting ramp-down phase`, { activeUsers: this.activeUsers });
    
    const startTime = Date.now();
    const usersToStop = Array.from(this.virtualUsers.keys());
    
    // 逐步停止虚拟用户
    for (let i = 0; i < usersToStop.length; i++) {
      const userId = usersToStop[i];
      await this.stopVirtualUser(userId);
      
      const progress = 66 + ((i + 1) / usersToStop.length) * 34; // 下降阶段占34%
      this.updateProgress(progress, 100, this.currentPhase, `Stopped ${i + 1}/${usersToStop.length} users`);
      
      // 短暂延迟
      await this.sleep(50);
    }
    
    const endTime = Date.now();
    return {
      duration: endTime - startTime,
      usersStopped: usersToStop.length
    };
  }

  /**
   * 创建虚拟用户
   */
  async createVirtualUser(userId, url) {
    const user = {
      id: userId,
      startTime: Date.now(),
      requestCount: 0,
      errorCount: 0,
      active: true
    };
    
    this.virtualUsers.set(userId, user);
    this.activeUsers++;
    
    // 启动用户请求循环
    this.startUserRequestLoop(user, url);
    
    this.log('debug', `Virtual user ${userId} created`);
  }

  /**
   * 启动用户请求循环
   */
  async startUserRequestLoop(user, url) {
    const requestLoop = async () => {
      while (user.active && !this.isCancelled()) {
        try {
          const result = await this.makeRequest(url);
          user.requestCount++;
          
          if (result.statusCode >= 400) {
            user.errorCount++;
          }
          
        } catch (error) {
          user.errorCount++;
          this.log('debug', `User ${user.id} request failed: ${error.message}`);
        }
        
        // 思考时间
        if (user.active && !this.isCancelled()) {
          await this.sleep(this.stressConfig.thinkTime);
        }
      }
    };
    
    // 异步执行请求循环
    requestLoop().catch(error => {
      this.log('warn', `User ${user.id} loop error: ${error.message}`);
    });
  }

  /**
   * 停止虚拟用户
   */
  async stopVirtualUser(userId) {
    const user = this.virtualUsers.get(userId);
    if (user) {
      user.active = false;
      this.virtualUsers.delete(userId);
      this.activeUsers--;
      this.completedUsers++;
      
      this.log('debug', `Virtual user ${userId} stopped`, {
        requests: user.requestCount,
        errors: user.errorCount,
        duration: Date.now() - user.startTime
      });
    }
  }

  /**
   * 生成测试摘要
   */
  generateTestSummary() {
    const metrics = this.getMetricsSummary();
    const httpStats = this.getHttpStats();
    
    return {
      totalUsers: this.completedUsers + this.activeUsers,
      completedUsers: this.completedUsers,
      activeUsers: this.activeUsers,
      totalRequests: metrics.totalRequests,
      successfulRequests: metrics.successfulRequests,
      failedRequests: metrics.failedRequests,
      successRate: metrics.successRate,
      responseTime: metrics.responseTime,
      errors: metrics.errorTypes,
      httpStats
    };
  }

  /**
   * 获取取消结果
   */
  getCancelledResult() {
    return {
      success: false,
      cancelled: true,
      summary: this.generateTestSummary(),
      message: 'Test was cancelled by user'
    };
  }

  /**
   * 清理资源
   */
  async cleanup() {
    // 停止所有虚拟用户
    const userIds = Array.from(this.virtualUsers.keys());
    for (const userId of userIds) {
      await this.stopVirtualUser(userId);
    }
    
    // 调用父类清理
    await super.cleanup();
    
    this.log('info', `Stress test cleanup completed`, {
      stoppedUsers: userIds.length,
      finalMetrics: this.getMetricsSummary()
    });
  }
}

module.exports = StressTestEngine;
