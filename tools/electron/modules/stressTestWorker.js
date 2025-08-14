const { parentPort, workerData } = require('worker_threads');
const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * 压力测试Worker进程
 * 每个Worker负责模拟一定数量的并发用户
 */
class StressTestWorker {
  constructor(config) {
    this.config = config;
    this.isRunning = false;
    this.users = [];
    this.requestCount = 0;
    this.startTime = Date.now();
    
    console.log(`🔧 Worker ${config.workerId} 初始化: ${config.users}个用户`);
  }

  /**
   * 启动Worker
   */
  async start() {
    this.isRunning = true;
    
    // 通知主进程Worker准备就绪
    parentPort.postMessage({
      type: 'worker_ready',
      workerId: this.config.workerId
    });

    // 等待启动延迟
    if (this.config.startDelay > 0) {
      await this.sleep(this.config.startDelay);
    }

    // 创建虚拟用户
    for (let i = 0; i < this.config.users; i++) {
      const user = {
        id: `${this.config.workerId}-${i}`,
        requestInterval: this.calculateRequestInterval(),
        lastRequestTime: 0
      };
      this.users.push(user);
      
      // 启动用户请求循环
      this.startUserLoop(user);
      
      // 用户启动间隔（模拟真实用户逐步进入）
      if (i < this.config.users - 1) {
        await this.sleep(this.config.rampUp * 1000 / this.config.users);
      }
    }

    console.log(`🚀 Worker ${this.config.workerId} 启动完成，${this.config.users}个用户开始测试`);
  }

  /**
   * 计算请求间隔
   */
  calculateRequestInterval() {
    const baseInterval = (this.config.thinkTime || 1) * 1000;
    const variation = baseInterval * 0.3; // 30%的随机变化
    return baseInterval + (Math.random() - 0.5) * variation;
  }

  /**
   * 启动用户请求循环
   */
  async startUserLoop(user) {
    while (this.isRunning) {
      try {
        const now = Date.now();
        
        // 检查是否到了发送请求的时间
        if (now - user.lastRequestTime >= user.requestInterval) {
          await this.sendRequest(user);
          user.lastRequestTime = now;
          
          // 重新计算下次请求间隔
          user.requestInterval = this.calculateRequestInterval();
        }
        
        // 短暂休眠避免CPU占用过高
        await this.sleep(10);
        
      } catch (error) {
        parentPort.postMessage({
          type: 'error',
          workerId: this.config.workerId,
          userId: user.id,
          error: error.message
        });
      }
    }
  }

  /**
   * 发送HTTP请求
   */
  async sendRequest(user) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const url = new URL(this.config.url);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: this.config.method || 'GET',
        headers: {
          'User-Agent': `StressTest-Worker-${this.config.workerId}-User-${user.id}`,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          ...this.config.headers
        },
        timeout: (this.config.timeout || 30) * 1000
      };

      const req = client.request(options, (res) => {
        const responseTime = Date.now() - startTime;
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const success = res.statusCode >= 200 && res.statusCode < 400;
          
          parentPort.postMessage({
            type: 'request_completed',
            workerId: this.config.workerId,
            userId: user.id,
            success,
            responseTime,
            statusCode: res.statusCode,
            responseSize: data.length
          });
          
          this.requestCount++;
          resolve();
        });
      });

      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        
        parentPort.postMessage({
          type: 'request_completed',
          workerId: this.config.workerId,
          userId: user.id,
          success: false,
          responseTime,
          error: error.message
        });
        
        this.requestCount++;
        resolve();
      });

      req.on('timeout', () => {
        req.destroy();
        const responseTime = Date.now() - startTime;
        
        parentPort.postMessage({
          type: 'request_completed',
          workerId: this.config.workerId,
          userId: user.id,
          success: false,
          responseTime,
          error: 'Request timeout'
        });
        
        this.requestCount++;
        resolve();
      });

      // 发送请求体（如果有）
      if (this.config.body) {
        req.write(this.config.body);
      }
      
      req.end();
    });
  }

  /**
   * 停止Worker
   */
  stop() {
    this.isRunning = false;
    
    parentPort.postMessage({
      type: 'worker_finished',
      workerId: this.config.workerId,
      requestCount: this.requestCount,
      duration: Date.now() - this.startTime
    });
    
    console.log(`🏁 Worker ${this.config.workerId} 停止，共发送 ${this.requestCount} 个请求`);
  }

  /**
   * 休眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 启动Worker
if (workerData) {
  const worker = new StressTestWorker(workerData);
  
  // 监听主进程消息
  parentPort.on('message', (message) => {
    if (message.type === 'stop') {
      worker.stop();
      process.exit(0);
    }
  });

  // 启动测试
  worker.start().catch((error) => {
    parentPort.postMessage({
      type: 'error',
      workerId: workerData.workerId,
      error: error.message
    });
    process.exit(1);
  });
}
