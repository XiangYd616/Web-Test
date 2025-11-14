/**
 * WebSocket 测试事件处理器
 * 
 * 文件路径: backend/websocket/testEvents.js
 * 创建时间: 2025-11-14
 * 
 * 功能:
 * - 测试进度实时推送
 * - 状态更新通知
 * - 错误实时提醒
 * - 多客户端同步
 */

const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/logger');

class TestEventsHandler {
  constructor(io) {
    this.io = io;
    this.activeTests = new Map(); // 存储活跃的测试会话
    this.testRooms = new Map();   // 测试ID -> Socket Room映射
  }

  /**
   * 初始化WebSocket事件处理
   */
  initialize() {
    this.io.on('connection', (socket) => {
      Logger.info(`客户端连接: ${socket.id}`);

      // 加入测试房间
      socket.on('test:join', (testId) => {
        this.handleJoinTest(socket, testId);
      });

      // 离开测试房间
      socket.on('test:leave', (testId) => {
        this.handleLeaveTest(socket, testId);
      });

      // 启动压力测试
      socket.on('stress:start', (config) => {
        this.handleStressTestStart(socket, config);
      });

      // 停止压力测试
      socket.on('stress:stop', (testId) => {
        this.handleStressTestStop(socket, testId);
      });

      // 启动API测试
      socket.on('api:start', (config) => {
        this.handleApiTestStart(socket, config);
      });

      // 启动性能测试
      socket.on('performance:start', (config) => {
        this.handlePerformanceTestStart(socket, config);
      });

      // 获取测试状态
      socket.on('test:status', (testId) => {
        this.handleGetTestStatus(socket, testId);
      });

      // 客户端断开连接
      socket.on('disconnect', () => {
        Logger.info(`客户端断开: ${socket.id}`);
        this.handleDisconnect(socket);
      });
    });

    Logger.info('✅ WebSocket测试事件处理器已初始化');
  }

  /**
   * 处理加入测试房间
   */
  handleJoinTest(socket, testId) {
    socket.join(testId);
    
    if (!this.testRooms.has(testId)) {
      this.testRooms.set(testId, new Set());
    }
    this.testRooms.get(testId).add(socket.id);

    Logger.info(`客户端 ${socket.id} 加入测试房间: ${testId}`);

    // 发送确认消息
    socket.emit('test:joined', {
      testId,
      timestamp: new Date().toISOString()
    });

    // 如果测试正在运行，发送当前状态
    const activeTest = this.activeTests.get(testId);
    if (activeTest) {
      socket.emit('test:status', {
        testId,
        status: activeTest.status,
        progress: activeTest.progress
      });
    }
  }

  /**
   * 处理离开测试房间
   */
  handleLeaveTest(socket, testId) {
    socket.leave(testId);
    
    if (this.testRooms.has(testId)) {
      this.testRooms.get(testId).delete(socket.id);
      
      // 如果房间为空，删除映射
      if (this.testRooms.get(testId).size === 0) {
        this.testRooms.delete(testId);
      }
    }

    Logger.info(`客户端 ${socket.id} 离开测试房间: ${testId}`);

    socket.emit('test:left', {
      testId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 处理压力测试启动
   */
  async handleStressTestStart(socket, config) {
    const testId = uuidv4();
    
    try {
      Logger.info(`启动压力测试: ${testId}`, config);

      // 创建测试会话
      const testSession = {
        testId,
        type: 'stress',
        status: 'running',
        progress: 0,
        startTime: new Date(),
        config,
        socketId: socket.id
      };

      this.activeTests.set(testId, testSession);

      // 让客户端加入测试房间
      socket.join(testId);

      // 发送测试启动确认
      socket.emit('stress:started', {
        testId,
        timestamp: new Date().toISOString(),
        config
      });

      // 动态导入测试引擎（避免循环依赖）
      const StressTestEngine = require('../engines/stress/stressTestEngine');
      const engine = new StressTestEngine();

      // 执行测试，带进度回调
      const testConfig = {
        ...config,
        onProgress: (progressData) => {
          // 更新进度
          testSession.progress = progressData.percentage;

          // 推送进度到房间内所有客户端
          this.io.to(testId).emit('stress:progress', {
            testId,
            percentage: progressData.percentage,
            stage: progressData.stage,
            message: progressData.message,
            stats: progressData.stats,
            timestamp: new Date().toISOString()
          });
        }
      };

      const results = await engine.executeTest(testConfig);

      // 更新测试状态
      testSession.status = results.success ? 'completed' : 'failed';
      testSession.progress = 100;
      testSession.endTime = new Date();
      testSession.results = results;

      // 推送完成结果
      this.io.to(testId).emit('stress:completed', {
        testId,
        success: results.success,
        results: results.results,
        timestamp: new Date().toISOString()
      });

      Logger.info(`压力测试完成: ${testId}`);

      // 延迟清理测试会话
      setTimeout(() => {
        this.activeTests.delete(testId);
      }, 60000); // 1分钟后清理

    } catch (error) {
      Logger.error(`压力测试失败: ${testId}`, error);

      // 推送错误信息
      this.io.to(testId).emit('stress:error', {
        testId,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      // 清理失败的测试
      this.activeTests.delete(testId);
    }
  }

  /**
   * 处理压力测试停止
   */
  handleStressTestStop(socket, testId) {
    const testSession = this.activeTests.get(testId);

    if (!testSession) {
      socket.emit('stress:error', {
        testId,
        error: '测试不存在或已结束',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 检查权限（只有启动测试的用户可以停止）
    if (testSession.socketId !== socket.id) {
      socket.emit('stress:error', {
        testId,
        error: '无权停止此测试',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      // 更新状态
      testSession.status = 'stopped';
      testSession.endTime = new Date();

      // 通知所有客户端
      this.io.to(testId).emit('stress:stopped', {
        testId,
        timestamp: new Date().toISOString()
      });

      Logger.info(`压力测试已停止: ${testId}`);

      // 清理测试会话
      this.activeTests.delete(testId);

    } catch (error) {
      Logger.error(`停止压力测试失败: ${testId}`, error);
      
      socket.emit('stress:error', {
        testId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 处理API测试启动
   */
  async handleApiTestStart(socket, config) {
    const testId = uuidv4();
    
    try {
      Logger.info(`启动API测试: ${testId}`, config);

      const testSession = {
        testId,
        type: 'api',
        status: 'running',
        progress: 0,
        startTime: new Date(),
        config,
        socketId: socket.id
      };

      this.activeTests.set(testId, testSession);
      socket.join(testId);

      socket.emit('api:started', {
        testId,
        timestamp: new Date().toISOString(),
        config
      });

      // 导入API测试引擎
      const ApiTestEngine = require('../engines/api/apiTestEngine');
      const engine = new ApiTestEngine();

      // 执行测试
      const results = await engine.executeTest(config);

      testSession.status = results.success ? 'completed' : 'failed';
      testSession.progress = 100;
      testSession.endTime = new Date();
      testSession.results = results;

      this.io.to(testId).emit('api:completed', {
        testId,
        success: results.success,
        results: results.results,
        timestamp: new Date().toISOString()
      });

      Logger.info(`API测试完成: ${testId}`);

      setTimeout(() => {
        this.activeTests.delete(testId);
      }, 60000);

    } catch (error) {
      Logger.error(`API测试失败: ${testId}`, error);

      this.io.to(testId).emit('api:error', {
        testId,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      this.activeTests.delete(testId);
    }
  }

  /**
   * 处理性能测试启动
   */
  async handlePerformanceTestStart(socket, config) {
    const testId = uuidv4();
    
    try {
      Logger.info(`启动性能测试: ${testId}`, config);

      const testSession = {
        testId,
        type: 'performance',
        status: 'running',
        progress: 0,
        startTime: new Date(),
        config,
        socketId: socket.id
      };

      this.activeTests.set(testId, testSession);
      socket.join(testId);

      socket.emit('performance:started', {
        testId,
        timestamp: new Date().toISOString(),
        config
      });

      // 性能测试需要更多时间，发送中间进度
      const progressInterval = setInterval(() => {
        if (testSession.status === 'running') {
          testSession.progress = Math.min(testSession.progress + 10, 90);
          
          this.io.to(testId).emit('performance:progress', {
            testId,
            percentage: testSession.progress,
            message: '正在分析页面性能...',
            timestamp: new Date().toISOString()
          });
        }
      }, 2000);

      // 导入性能测试引擎
      const PerformanceTestEngine = require('../engines/performance/PerformanceTestEngine');
      const engine = new PerformanceTestEngine();

      const results = await engine.executeTest(config);

      clearInterval(progressInterval);

      testSession.status = results.success ? 'completed' : 'failed';
      testSession.progress = 100;
      testSession.endTime = new Date();
      testSession.results = results;

      this.io.to(testId).emit('performance:completed', {
        testId,
        success: results.success,
        results: results.results,
        timestamp: new Date().toISOString()
      });

      Logger.info(`性能测试完成: ${testId}`);

      setTimeout(() => {
        this.activeTests.delete(testId);
      }, 60000);

    } catch (error) {
      Logger.error(`性能测试失败: ${testId}`, error);

      this.io.to(testId).emit('performance:error', {
        testId,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      this.activeTests.delete(testId);
    }
  }

  /**
   * 获取测试状态
   */
  handleGetTestStatus(socket, testId) {
    const testSession = this.activeTests.get(testId);

    if (!testSession) {
      socket.emit('test:status', {
        testId,
        exists: false,
        message: '测试不存在或已结束'
      });
      return;
    }

    socket.emit('test:status', {
      testId,
      exists: true,
      type: testSession.type,
      status: testSession.status,
      progress: testSession.progress,
      startTime: testSession.startTime,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 处理客户端断开连接
   */
  handleDisconnect(socket) {
    // 清理客户端相关的房间映射
    for (const [testId, sockets] of this.testRooms.entries()) {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        
        if (sockets.size === 0) {
          this.testRooms.delete(testId);
        }
      }
    }
  }

  /**
   * 获取活跃测试列表
   */
  getActiveTests() {
    const tests = [];
    
    for (const [testId, session] of this.activeTests.entries()) {
      tests.push({
        testId,
        type: session.type,
        status: session.status,
        progress: session.progress,
        startTime: session.startTime,
        clientCount: this.testRooms.get(testId)?.size || 0
      });
    }

    return tests;
  }

  /**
   * 广播系统消息
   */
  broadcastSystemMessage(message, data = {}) {
    this.io.emit('system:message', {
      message,
      data,
      timestamp: new Date().toISOString()
    });

    Logger.info(`广播系统消息: ${message}`);
  }
}

module.exports = TestEventsHandler;
