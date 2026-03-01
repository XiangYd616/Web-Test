const { Worker } = require('worker_threads');
const path = require('path');
const os = require('os');
const EventEmitter = require('events');

/**
 * 本地压力测试引擎
 * 利用用户本地资源进行大规模压力测试，不受服务器限制
 */
class LocalStressTestEngine extends EventEmitter {
  constructor() {
    super();
    this.workers = [];
    this.isRunning = false;
    this.testId = null;
    this.config = null;
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      responseTimeSum: 0,
      responseTimeCount: 0,
      recentResponseTimes: [],
      errors: [],
      startTime: null,
      endTime: null,
      throughput: 0
    };
    // 滑动窗口大小：保留最近 1000 条响应时间用于百分位数计算
    this.maxRecentSamples = 1000;
    
    // 获取系统信息
    this.systemInfo = {
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      platform: os.platform(),
      arch: os.arch()
    };
    
    console.log(`🚀 本地压力测试引擎初始化完成`);
  }

  /**
   * 启动压力测试
   * @param {Object} config 测试配置
   */
  async startTest(config) {
    if (this.isRunning) {
      throw new Error('测试已在运行中');
    }

    this.testId = `local-test-${Date.now()}`;
    this.config = config;
    this.isRunning = true;
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      responseTimeSum: 0,
      responseTimeCount: 0,
      recentResponseTimes: [],
      errors: [],
      startTime: Date.now(),
      endTime: null,
      throughput: 0
    };

    console.log(`📊 测试类型: ${config.testType}, 目标URL: ${config.url}`);

    try {
      // 计算最优Worker数量（基于CPU核心数和用户数）
      const optimalWorkers = this.calculateOptimalWorkers(config.users);
      const usersPerWorker = Math.ceil(config.users / optimalWorkers);


      // 创建Worker进程
      for (let i = 0; i < optimalWorkers; i++) {
        const workerConfig = {
          ...config,
          workerId: i,
          users: Math.min(usersPerWorker, config.users - i * usersPerWorker),
          startDelay: this.calculateStartDelay(i, config)
        };

        if (workerConfig.users > 0) {
          await this.createWorker(workerConfig);
        }
      }

      // 发送测试开始事件
      this.emit('testStarted', {
        testId: this.testId,
        config: this.config,
        workers: this.workers.length,
        systemInfo: this.systemInfo
      });

      // 设置测试结束定时器
      setTimeout(() => {
        this.stopTest();
      }, config.duration * 1000);

    } catch (error) {
      console.error('❌ 启动测试失败:', error);
      this.isRunning = false;
      this.emit('testError', { error: error.message });
      throw error;
    }
  }

  /**
   * 计算最优Worker数量
   */
  calculateOptimalWorkers(users) {
    const cpuCores = this.systemInfo.cpus;
    const maxWorkers = Math.min(cpuCores * 2, 16); // 最多16个Worker
    const minWorkers = Math.min(cpuCores, 4); // 最少4个Worker
    
    if (users <= 100) return minWorkers;
    if (users <= 1000) return Math.min(8, maxWorkers);
    return maxWorkers;
  }

  /**
   * 计算Worker启动延迟（实现梯度加压）
   */
  calculateStartDelay(workerIndex, config) {
    if (config.testType === 'spike') {
      return 0; // 峰值测试立即启动所有Worker
    }
    
    // 梯度加压：根据rampUp时间分散启动
    const rampUpMs = (config.rampUp || 10) * 1000;
    return (workerIndex * rampUpMs) / this.workers.length;
  }

  /**
   * 创建Worker进程
   */
  async createWorker(workerConfig) {
    return new Promise((resolve, _reject) => {
      const workerPath = path.join(__dirname, 'stressTestWorker.js');
      const worker = new Worker(workerPath, {
        workerData: workerConfig
      });

      worker.on('message', (data) => {
        this.handleWorkerMessage(data);
      });

      worker.on('error', (error) => {
        console.error(`❌ Worker ${workerConfig.workerId} 错误:`, error);
        this.results.errors.push({
          type: 'worker_error',
          message: error.message,
          workerId: workerConfig.workerId,
          timestamp: Date.now()
        });
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`⚠️ Worker ${workerConfig.workerId} 异常退出，代码: ${code}`);
        }
        this.workers = this.workers.filter(w => w !== worker);
        
        // 如果所有Worker都退出且测试仍在运行，结束测试
        if (this.workers.length === 0 && this.isRunning) {
          this.stopTest();
        }
      });

      this.workers.push(worker);
      resolve(worker);
    });
  }

  /**
   * 处理Worker消息
   */
  handleWorkerMessage(data) {
    switch (data.type) {
      case 'request_completed':
        this.updateResults(data);
        break;
      case 'worker_ready':
        console.log(`✅ Worker ${data.workerId} 准备就绪`);
        break;
      case 'worker_finished':
        break;
      case 'error':
        this.results.errors.push({
          type: 'request_error',
          message: data.error,
          workerId: data.workerId,
          timestamp: Date.now()
        });
        break;
    }

    // 发送实时更新
    this.emit('testUpdate', {
      testId: this.testId,
      results: this.getResults(),
      activeWorkers: this.workers.length
    });
  }

  /**
   * 更新测试结果
   */
  updateResults(data) {
    this.results.totalRequests++;
    
    if (data.success) {
      this.results.successfulRequests++;
      
      // 增量统计：避免存储所有响应时间导致内存溢出
      this.results.responseTimeSum += data.responseTime;
      this.results.responseTimeCount++;
      this.results.averageResponseTime = this.results.responseTimeSum / this.results.responseTimeCount;
      
      // 滑动窗口：保留最近 N 条用于百分位数计算
      this.results.recentResponseTimes.push(data.responseTime);
      if (this.results.recentResponseTimes.length > this.maxRecentSamples) {
        this.results.recentResponseTimes.shift();
      }
      
      // 更新响应时间统计
      this.results.minResponseTime = Math.min(this.results.minResponseTime, data.responseTime);
      this.results.maxResponseTime = Math.max(this.results.maxResponseTime, data.responseTime);
    } else {
      this.results.failedRequests++;
    }

    // 计算吞吐量
    const elapsedSeconds = (Date.now() - this.results.startTime) / 1000;
    this.results.throughput = this.results.totalRequests / elapsedSeconds;
  }

  /**
   * 停止测试
   */
  async stopTest() {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.results.endTime = Date.now();

    // 终止所有Worker
    const terminatePromises = this.workers.map(worker => {
      return new Promise((resolve) => {
        worker.terminate().then(() => resolve()).catch(() => resolve());
      });
    });

    await Promise.all(terminatePromises);
    this.workers = [];

    const finalResults = this.getResults();
    console.log(`✅ 测试完成! 总请求: ${finalResults.totalRequests}, 成功率: ${finalResults.successRate.toFixed(2)}%`);

    this.emit('testCompleted', {
      testId: this.testId,
      results: finalResults
    });
  }

  /**
   * 获取测试结果
   */
  getResults() {
    const successRate = this.results.totalRequests > 0 
      ? (this.results.successfulRequests / this.results.totalRequests) * 100 
      : 0;

    const duration = this.results.endTime 
      ? (this.results.endTime - this.results.startTime) / 1000
      : (Date.now() - this.results.startTime) / 1000;

    return {
      ...this.results,
      successRate,
      errorRate: 100 - successRate,
      duration,
      isRunning: this.isRunning,
      systemInfo: this.systemInfo
    };
  }

  /**
   * 获取系统资源使用情况
   */
  getSystemUsage() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        external: memUsage.external,
        percentage: (memUsage.heapUsed / this.systemInfo.totalMemory) * 100
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      workers: this.workers.length,
      uptime: process.uptime()
    };
  }
}

module.exports = LocalStressTestEngine;
