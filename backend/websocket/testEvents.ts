const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/logger');
const { createEngine } = require('../services/testing/TestEngineFactory');

type SocketLike = {
  id: string;
  join: (room: string) => void;
  leave: (room: string) => void;
  emit: (event: string, data: unknown) => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
};

type RoomEmitter = {
  emit: (event: string, data: unknown) => void;
};

type IoLike = {
  on: (event: string, callback: (socket: SocketLike) => void) => void;
  to: (room: string) => RoomEmitter;
  emit: (event: string, data: unknown) => void;
};

type TestSession = {
  testId: string;
  type: string;
  status: string;
  progress: number;
  startTime: Date;
  config: Record<string, unknown>;
  socketId: string;
  endTime?: Date;
  results?: Record<string, unknown>;
};

class TestEventsHandler {
  private io: IoLike;
  private activeTests: Map<string, TestSession> = new Map();
  private testRooms: Map<string, Set<string>> = new Map();

  constructor(io: IoLike) {
    this.io = io;
  }

  initialize() {
    this.io.on('connection', socket => {
      Logger.info(`客户端连接: ${socket.id}`);

      socket.on('test:join', testId => {
        this.handleJoinTest(socket, String(testId));
      });

      socket.on('test:leave', testId => {
        this.handleLeaveTest(socket, String(testId));
      });

      socket.on('stress:start', config => {
        this.handleStressTestStart(socket, config as Record<string, unknown>);
      });

      socket.on('stress:stop', testId => {
        this.handleStressTestStop(socket, String(testId));
      });

      socket.on('api:start', config => {
        this.handleApiTestStart(socket, config as Record<string, unknown>);
      });

      socket.on('performance:start', config => {
        this.handlePerformanceTestStart(socket, config as Record<string, unknown>);
      });

      socket.on('test:status', testId => {
        this.handleGetTestStatus(socket, String(testId));
      });

      socket.on('disconnect', () => {
        Logger.info(`客户端断开: ${socket.id}`);
        this.handleDisconnect(socket);
      });
    });

    Logger.info('✅ WebSocket测试事件处理器已初始化');
  }

  handleJoinTest(socket: SocketLike, testId: string) {
    socket.join(testId);

    if (!this.testRooms.has(testId)) {
      this.testRooms.set(testId, new Set());
    }
    this.testRooms.get(testId)?.add(socket.id);

    Logger.info(`客户端 ${socket.id} 加入测试房间: ${testId}`);

    socket.emit('test:joined', {
      testId,
      timestamp: new Date().toISOString(),
    });

    const activeTest = this.activeTests.get(testId);
    if (activeTest) {
      socket.emit('test:status', {
        testId,
        status: activeTest.status,
        progress: activeTest.progress,
      });
    }
  }

  handleLeaveTest(socket: SocketLike, testId: string) {
    socket.leave(testId);

    if (this.testRooms.has(testId)) {
      this.testRooms.get(testId)?.delete(socket.id);

      if (this.testRooms.get(testId)?.size === 0) {
        this.testRooms.delete(testId);
      }
    }

    Logger.info(`客户端 ${socket.id} 离开测试房间: ${testId}`);

    socket.emit('test:left', {
      testId,
      timestamp: new Date().toISOString(),
    });
  }

  async handleStressTestStart(socket: SocketLike, config: Record<string, unknown>) {
    const testId = uuidv4();

    try {
      Logger.info(`启动压力测试: ${testId}`, config);

      const testSession: TestSession = {
        testId,
        type: 'stress',
        status: 'running',
        progress: 0,
        startTime: new Date(),
        config,
        socketId: socket.id,
      };

      this.activeTests.set(testId, testSession);
      socket.join(testId);

      socket.emit('stress:started', {
        testId,
        timestamp: new Date().toISOString(),
        config,
      });

      const engine = createEngine('stress');

      const testConfig = {
        ...config,
        onProgress: (progressData: Record<string, unknown>) => {
          const percentage = Number((progressData as { percentage?: number }).percentage || 0);
          testSession.progress = percentage;

          this.io.to(testId).emit('stress:progress', {
            testId,
            percentage,
            stage: (progressData as { stage?: string }).stage,
            message: (progressData as { message?: string }).message,
            stats: (progressData as { stats?: unknown }).stats,
            timestamp: new Date().toISOString(),
          });
        },
      };

      const results = await engine.executeTest(testConfig);

      testSession.status = results.success ? 'completed' : 'failed';
      testSession.progress = 100;
      testSession.endTime = new Date();
      testSession.results = results;

      this.io.to(testId).emit('stress:completed', {
        testId,
        success: results.success,
        results: results.results,
        timestamp: new Date().toISOString(),
      });

      Logger.info(`压力测试完成: ${testId}`);

      setTimeout(() => {
        this.activeTests.delete(testId);
      }, 60000);
    } catch (error) {
      Logger.error(`压力测试失败: ${testId}`, error);

      this.io.to(testId).emit('stress:error', {
        testId,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });

      this.activeTests.delete(testId);
    }
  }

  handleStressTestStop(socket: SocketLike, testId: string) {
    const testSession = this.activeTests.get(testId);

    if (!testSession) {
      socket.emit('stress:error', {
        testId,
        error: '测试不存在或已结束',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (testSession.socketId !== socket.id) {
      socket.emit('stress:error', {
        testId,
        error: '无权停止此测试',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      testSession.status = 'stopped';
      testSession.endTime = new Date();

      this.io.to(testId).emit('stress:stopped', {
        testId,
        timestamp: new Date().toISOString(),
      });

      Logger.info(`压力测试已停止: ${testId}`);
      this.activeTests.delete(testId);
    } catch (error) {
      Logger.error(`停止压力测试失败: ${testId}`, error);

      socket.emit('stress:error', {
        testId,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async handleApiTestStart(socket: SocketLike, config: Record<string, unknown>) {
    const testId = uuidv4();

    try {
      Logger.info(`启动API测试: ${testId}`, config);

      const testSession: TestSession = {
        testId,
        type: 'api',
        status: 'running',
        progress: 0,
        startTime: new Date(),
        config,
        socketId: socket.id,
      };

      this.activeTests.set(testId, testSession);
      socket.join(testId);

      socket.emit('api:started', {
        testId,
        timestamp: new Date().toISOString(),
        config,
      });

      const engine = createEngine('api');
      const results = await engine.executeTest(config);

      testSession.status = results.success ? 'completed' : 'failed';
      testSession.progress = 100;
      testSession.endTime = new Date();
      testSession.results = results;

      this.io.to(testId).emit('api:completed', {
        testId,
        success: results.success,
        results: results.results,
        timestamp: new Date().toISOString(),
      });

      Logger.info(`API测试完成: ${testId}`);

      setTimeout(() => {
        this.activeTests.delete(testId);
      }, 60000);
    } catch (error) {
      Logger.error(`API测试失败: ${testId}`, error);

      this.io.to(testId).emit('api:error', {
        testId,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });

      this.activeTests.delete(testId);
    }
  }

  async handlePerformanceTestStart(socket: SocketLike, config: Record<string, unknown>) {
    const testId = uuidv4();

    try {
      Logger.info(`启动性能测试: ${testId}`, config);

      const testSession: TestSession = {
        testId,
        type: 'performance',
        status: 'running',
        progress: 0,
        startTime: new Date(),
        config,
        socketId: socket.id,
      };

      this.activeTests.set(testId, testSession);
      socket.join(testId);

      socket.emit('performance:started', {
        testId,
        timestamp: new Date().toISOString(),
        config,
      });

      const progressInterval = setInterval(() => {
        if (testSession.status === 'running') {
          testSession.progress = Math.min(testSession.progress + 10, 90);

          this.io.to(testId).emit('performance:progress', {
            testId,
            percentage: testSession.progress,
            message: '正在分析页面性能...',
            timestamp: new Date().toISOString(),
          });
        }
      }, 2000);

      const engine = createEngine('performance');
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
        timestamp: new Date().toISOString(),
      });

      Logger.info(`性能测试完成: ${testId}`);

      setTimeout(() => {
        this.activeTests.delete(testId);
      }, 60000);
    } catch (error) {
      Logger.error(`性能测试失败: ${testId}`, error);

      this.io.to(testId).emit('performance:error', {
        testId,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });

      this.activeTests.delete(testId);
    }
  }

  handleGetTestStatus(socket: SocketLike, testId: string) {
    const testSession = this.activeTests.get(testId);

    if (!testSession) {
      socket.emit('test:status', {
        testId,
        exists: false,
        message: '测试不存在或已结束',
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
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(socket: SocketLike) {
    for (const [testId, sockets] of this.testRooms.entries()) {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);

        if (sockets.size === 0) {
          this.testRooms.delete(testId);
        }
      }
    }
  }

  getActiveTests() {
    const tests: Array<Record<string, unknown>> = [];

    for (const [testId, session] of this.activeTests.entries()) {
      tests.push({
        testId,
        type: session.type,
        status: session.status,
        progress: session.progress,
        startTime: session.startTime,
        clientCount: this.testRooms.get(testId)?.size || 0,
      });
    }

    return tests;
  }

  broadcastSystemMessage(message: string, data: Record<string, unknown> = {}) {
    this.io.emit('system:message', {
      message,
      data,
      timestamp: new Date().toISOString(),
    });

    Logger.info(`广播系统消息: ${message}`);
  }
}

module.exports = TestEventsHandler;

export {};
