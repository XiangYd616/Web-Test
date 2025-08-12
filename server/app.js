/**
 * Test Web App - 主应用程序
 * 完整的后端服务
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
// 加载后端专用环境变量配置
require('dotenv').config({ path: path.join(__dirname, '.env') });

// 导入路由
const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/test');
const seoRoutes = require('./routes/seo');
// const unifiedSecurityRoutes = require('./routes/unifiedSecurity'); // 已移除
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
// const dataRoutes = require('./routes/data'); // 已移除，功能合并到 dataManagementRoutes

// 导入中间件
// const { authMiddleware } = require('./middleware/auth'); // 已移除，不再需要
const dataManagementRoutes = require('./routes/dataManagement');
const testHistoryRoutes = require('./routes/testHistory');
const monitoringRoutes = require('./routes/monitoring');
const reportRoutes = require('./routes/reports');
const integrationRoutes = require('./routes/integrations');
const cacheRoutes = require('./routes/cache');
const errorRoutes = require('./routes/errorRoutes');
const performanceRoutes = require('./routes/performanceRoutes');
// Accessibility routes removed - functionality moved to compatibility test

// 导入中间件
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');
const { rateLimiter } = require('./middleware/rateLimiter');
const { securityMiddleware } = require('./middleware/security');
const {
  responseFormatter,
  errorResponseFormatter,
  notFoundHandler,
  responseTimeLogger
} = require('./middleware/responseFormatter');

// 导入数据库连接
const { connectDB, testConnection } = require('./config/database');

// 导入缓存和性能优化系统
const cacheConfig = require('./config/cache');
const CacheManager = require('./services/CacheManager');
const { createCacheMiddleware } = require('./middleware/cacheMiddleware');
const {
  createCompressionMiddleware,
  createCacheControlMiddleware,
  createETagMiddleware,
  createSecurityHeadersMiddleware
} = require('./api/middleware/staticOptimization');

// 导入实时通信系统
const realtimeConfig = require('./config/realtime');

// 导入Redis服务
const redisConnection = require('./services/redis/connection');
const cacheMonitoring = require('./services/redis/monitoring');

// 导入测试历史服务将在启动时动态加载

const app = express();
const http = require('http');
const { Server } = require('socket.io');

const PORT = parseInt(process.env.PORT) || 3001;
const HOST = process.env.HOST || 'localhost';
const APP_NAME = process.env.APP_NAME || 'Test Web App';
const APP_VERSION = process.env.APP_VERSION || '1.0.0';

// CORS配置 - 需要在Socket.IO之前定义
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5174', 'http://localhost:3001', 'http://127.0.0.1:5174', 'http://127.0.0.1:3001'];

// 创建HTTP服务器和Socket.IO实例
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 确保必要的目录存在
const ensureDirectories = () => {
  const dirs = ['logs', 'exports', 'temp', 'uploads'];
  dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
};

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

console.log('🔧 CORS允许的源:', corsOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // 允许没有origin的请求（比如移动应用）
    if (!origin) return callback(null, true);

    // 检查origin是否在允许列表中
    if (corsOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // 一些旧版浏览器（IE11, 各种SmartTVs）在204上有问题
}));

// 基础中间件 - 使用优化的压缩中间件
app.use(createCompressionMiddleware({
  level: 6,
  threshold: 1024
}));

// 缓存控制中间件
app.use(createCacheControlMiddleware());

// ETag中间件
app.use(createETagMiddleware());

// 安全头中间件
app.use(createSecurityHeadersMiddleware());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 响应格式化中间件 - 必须在路由之前
app.use(responseFormatter);
app.use(responseTimeLogger);

// 日志中间件
app.use(morgan('combined', {
  stream: fs.createWriteStream(path.join(__dirname, 'logs', 'access.log'), { flags: 'a' })
}));
app.use(requestLogger);

// 速率限制
app.use(rateLimiter);

// 安全中间件
app.use(securityMiddleware);

// 静态文件服务
app.use('/exports', express.static(path.join(__dirname, 'exports')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API路由
app.use('/api/auth', authRoutes);
// 🔧 修复：更具体的路由必须在更通用的路由之前注册
app.use('/api/test/history', testHistoryRoutes); // 新的测试历史API - 必须在 /api/test 之前
app.use('/api/test', testRoutes);
app.use('/api/seo', seoRoutes); // SEO测试API - 解决CORS问题
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// 偏好设置API已移除，请使用 /api/user/preferences
// 原有的 /api/preferences 路由功能已整合到 /api/user/preferences 中

// 数据管理API - 统一到 /api/data-management
app.use('/api/data-management', dataManagementRoutes);
app.use('/api/data-export', require('./routes/dataExport').router);
app.use('/api/data-import', require('./routes/dataImport').router);
app.use('/api/backup', require('./routes/backup').router);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/reports', reportRoutes);
app.use('/api/system', require('./routes/system'));
app.use('/api/integrations', integrationRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/errors', errorRoutes);
app.use('/api/performance', performanceRoutes);
// Accessibility API routes removed - functionality moved to compatibility test

// API响应格式示例路由（仅在开发环境中启用）
if (process.env.NODE_ENV === 'development') {
  app.use('/api/example', require('./routes/api-example'));
}

// 健康检查端点
app.get('/health', async (req, res) => {
  try {
    // 检查数据库连接
    await testConnection();

    // 检查Redis连接
    const redisHealth = await redisConnection.healthCheck();

    // 检查实时通信系统
    const realtimeHealth = realtimeConfig.isReady() ?
      await realtimeConfig.healthCheck() :
      { status: 'not_initialized' };

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      name: APP_NAME,
      version: APP_VERSION,
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      redis: redisHealth,
      cache: global.cacheManager ? 'initialized' : 'not_initialized',
      realtime: realtimeHealth.status,
      uptime: process.uptime(),
      host: HOST,
      port: PORT
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: 'disconnected',
      redis: { status: 'error', message: 'Health check failed' }
    });
  }
});

// 缓存监控端点
app.get('/cache/stats', async (req, res) => {
  try {
    const period = req.query.period || '1h';

    // 尝试使用新的缓存系统
    if (global.cacheManager) {
      const stats = await cacheConfig.getCacheStatistics();
      res.json({
        success: true,
        data: stats,
        source: 'new_cache_system'
      });
    } else {
      // 回退到旧的缓存监控
      const report = cacheMonitoring.getMonitoringReport(period);
      res.json({
        success: true,
        data: report,
        source: 'legacy_cache_system'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 性能监控端点
app.get('/performance/stats', async (req, res) => {
  try {
    if (global.performanceMonitor) {
      const timeRange = req.query.timeRange || '1h';
      const report = await global.performanceMonitor.getPerformanceReport(timeRange);

      res.json({
        success: true,
        data: report
      });
    } else {
      res.status(503).json({
        success: false,
        error: '性能监控系统未初始化'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 缓存管理端点
app.post('/cache/flush', async (req, res) => {
  try {
    if (global.cacheManager) {
      const result = await cacheConfig.flushAllCache();
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(503).json({
        success: false,
        error: '缓存系统未初始化'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 实时通信统计端点
app.get('/realtime/stats', async (req, res) => {
  try {
    if (realtimeConfig.isReady()) {
      const stats = realtimeConfig.getFullStats();
      res.json({
        success: true,
        data: stats
      });
    } else {
      res.status(503).json({
        success: false,
        error: '实时通信系统未初始化'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 实时通信健康检查端点
app.get('/realtime/health', async (req, res) => {
  try {
    const health = await realtimeConfig.healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status === 'healthy',
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 发送系统通知端点（仅管理员）
app.post('/realtime/notify', async (req, res) => {
  try {
    // 这里应该添加管理员权限验证
    const { message, level, targetUsers, targetRoles } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: '消息内容不能为空'
      });
    }

    if (global.realtimeService) {
      const notificationId = await global.realtimeService.sendSystemNotification(message, {
        level,
        targetUsers,
        targetRoles
      });

      res.json({
        success: true,
        data: { notificationId }
      });
    } else {
      res.status(503).json({
        success: false,
        error: '实时通信系统未初始化'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API文档路由
app.get('/api', (req, res) => {
  res.json({
    name: `${APP_NAME} API`,
    version: APP_VERSION,
    description: '网站测试工具API',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth',
      test: '/api/test',
      performance: '/api/test/performance',
      seo: '/api/seo',
      seoUnified: '/api/test/seo',
      user: '/api/user',
      admin: '/api/admin',
      data: '/api/data',
      monitoring: '/api/monitoring',
      reports: '/api/reports',
      integrations: '/api/integrations'
    },
    deprecatedEndpoints: {
      note: '以下端点已废弃，请使用新的统一端点',
      removed: [
        '/api/tests (使用 /api/test)',
        '/api/test-engines (功能已整合)',
        '/api/test-history (使用 /api/test/history)',
        '/api/preferences (使用 /api/user/preferences)',
        '/api/unified-security (已移除)'
      ]
    },
    documentation: '/api/docs',
    health: '/health'
  });
});

// 404处理 - 使用统一格式
app.use('*', notFoundHandler);

// 错误处理中间件 - 使用统一格式
app.use(errorResponseFormatter);
app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    // 确保目录存在
    ensureDirectories();

    // 连接数据库
    const dbPool = await connectDB();
    console.log('✅ 数据库连接成功');

    // 初始化新的缓存系统
    try {
      const cacheManager = new CacheManager(dbPool);
      const initialized = await cacheManager.initialize();

      if (initialized) {
        // 将缓存实例设置为全局变量供其他模块使用
        global.cacheManager = cacheManager;

        console.log('✅ 新缓存系统初始化成功');

        // 添加缓存中间件到应用
        app.use(createCacheMiddleware(cacheManager, {
          apiCache: {
            ttl: 15 * 60, // 15分钟
            excludeMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
            excludeStatus: [400, 401, 403, 404, 500, 502, 503, 504]
          },
          queryCache: {
            enabled: true,
            ttl: 10 * 60 // 10分钟
          },
          warmup: true,
          health: true,
          statsApi: true,
          management: true
        }));

        console.log('✅ 缓存中间件已配置');
      } else {
        console.warn('⚠️ 缓存系统初始化失败，使用降级模式');
      }

    } catch (error) {
      console.warn('⚠️ 缓存系统初始化失败，继续使用无缓存模式:', error.message);
    }

    // 初始化实时通信系统 - 使用现有的Socket.IO实例
    try {
      const redisClient = global.cacheManager ? global.cacheManager.redis : null;

      // 直接使用现有的io实例，避免创建重复的WebSocket服务器
      global.io = io;
      global.socketManager = { io }; // 简化的socket管理器
      global.realtimeService = {
        emit: (event, data) => io.emit(event, data),
        to: (room) => ({ emit: (event, data) => io.to(room).emit(event, data) })
      };

      console.log('✅ 实时通信系统初始化成功');

    } catch (error) {
      console.warn('⚠️ 实时通信系统初始化失败，继续使用无实时功能模式:', error.message);
    }

    // 🔧 移除全局测试历史服务，改为各模块使用本地实例
    // 这样可以避免全局状态的复杂性，让每个模块都有独立的服务实例
    console.log('✅ 测试历史服务将在各模块中独立初始化');

    // 初始化监控服务
    try {
      const MonitoringService = require('./services/MonitoringService');
      const AlertService = require('./services/AlertService');

      // 创建监控服务实例
      const monitoringService = new MonitoringService(dbPool);
      const alertService = new AlertService(dbPool);

      // 设置监控服务到路由
      const monitoringRoutes = require('./routes/monitoring');
      monitoringRoutes.setMonitoringService(monitoringService);

      // 设置告警服务到路由
      const alertRoutes = require('./routes/alerts');
      alertRoutes.setAlertService(alertService);

      // 监听告警事件
      monitoringService.on('alert:triggered', (alertData) => {
        alertService.handleMonitoringAlert(alertData);
      });

      // 启动服务
      await monitoringService.start();
      await alertService.start();

      // 设置为全局变量供其他模块使用
      global.monitoringService = monitoringService;
      global.alertService = alertService;

      console.log('✅ 监控系统初始化成功');

    } catch (error) {
      console.warn('⚠️ 监控系统初始化失败，继续使用无监控模式:', error.message);
    }

    // 初始化地理位置自动更新服务
    const geoUpdateService = require('./services/geoUpdateService');
    console.log('✅ 地理位置自动更新服务初始化成功');

    // 设置WebSocket事件处理
    try {
      setupWebSocketHandlers(io);
      console.log('✅ WebSocket事件处理器已设置');
    } catch (wsError) {
      console.warn('⚠️ WebSocket事件处理器设置失败，继续启动:', wsError.message);
    }

    // 清理旧的测试房间
    setTimeout(async () => {
      try {
        const { RealStressTestEngine } = require('./services/realStressTestEngine');
        const stressTestEngine = new RealStressTestEngine();
        try {
          stressTestEngine.io = io; // 设置WebSocket实例
        } catch (ioError) {
          console.warn('⚠️ 设置WebSocket实例失败:', ioError.message);
        }
        await stressTestEngine.cleanupAllTestRooms();
      } catch (error) {
        console.error('❌ 清理旧测试房间失败:', error);
      }
    }, 2000); // 延迟2秒执行，确保服务器完全启动

    // 启动服务器
    server.listen(PORT, () => {
      console.log(`🚀 服务器运行在端口 ${PORT}`);
      console.log(`📖 API文档: http://localhost:${PORT}/api`);
      console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
      console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔌 WebSocket服务已启动`);

      // 显示地理位置服务状态
      const geoUpdateService = require('./services/geoUpdateService');
      const geoStatus = geoUpdateService.getStatus();
      console.log(`🗺️  地理位置自动更新: ${geoStatus.enabled ? '已启用' : '已禁用'}`);
      if (geoStatus.enabled) {
        console.log(`📅 更新计划: ${geoStatus.schedule}`);
      }
    });

    // 优雅关闭
    const gracefulShutdown = (signal) => {
      console.log(`\n收到 ${signal} 信号，开始优雅关闭...`);
      server.close(() => {
        console.log('HTTP服务器已关闭');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};

// WebSocket事件处理
function setupWebSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌🔌🔌 WebSocket客户端连接 🔌🔌🔌: ${socket.id}`);
    console.log(`🔌 连接详情:`, {
      socketId: socket.id,
      remoteAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
      timestamp: new Date().toISOString()
    });

    // 🔧 重构：简化的用户测试连接
    socket.on('join-stress-test', (data) => {
      const { testId, userId } = data;
      console.log(`🔥 用户连接测试: ${userId}/${testId}`, { socketId: socket.id });

      // 🔧 重构：注册用户WebSocket连接
      const userTestManager = require('./services/UserTestManager');
      userTestManager.registerUserSocket(userId, socket);

      // 存储userId到socket对象，用于断开连接时清理
      socket.userId = userId;

      // 发送连接确认
      const confirmData = {
        testId,
        userId,
        clientId: socket.id,
        timestamp: Date.now()
      };

      socket.emit('room-joined', confirmData);
      console.log(`✅ 用户测试连接确认: ${userId}/${testId}`);

      // 🔧 重构：检查用户测试状态
      const currentTest = userTestManager.getUserTestStatus(userId, testId);

      if (currentTest) {
        console.log(`📤 向新加入的客户端发送当前测试状态:`, {
          testId,
          status: currentTest.status,
          hasData: !!currentTest.data,
          hasMetrics: !!currentTest.metrics
        });

        // 如果测试正在运行，发送当前数据
        if (currentTest.status === 'running' && currentTest.data && currentTest.metrics) {
          socket.emit('stress-test-data', {
            testId,
            dataPoint: currentTest.data[currentTest.data.length - 1] || null,
            metrics: currentTest.metrics,
            totalRequests: currentTest.metrics.totalRequests || 0,
            currentTPS: currentTest.metrics.currentTPS || 0,
            peakTPS: currentTest.metrics.peakTPS || 0,
            dataPointTimestamp: Date.now(),
            dataPointResponseTime: currentTest.metrics.averageResponseTime || 0,
            clientCount: room ? room.size : 0,
            timestamp: Date.now()
          });
        }

        // 如果测试已完成，发送最终结果
        if (currentTest.status === 'completed' && currentTest.results) {
          socket.emit('stress-test-complete', {
            testId,
            timestamp: Date.now(),
            results: currentTest.results
          });
        }
      }
    });

    // 离开压力测试房间
    socket.on('leave-stress-test', (testId) => {
      socket.leave(`stress-test-${testId}`);
      console.log(`📊 客户端 ${socket.id} 离开压力测试房间: ${testId}`);
    });

    // 加入测试历史更新房间
    socket.on('join-room', (data) => {
      if (data.room === 'test-history-updates') {
        socket.join('test-history-updates');
        console.log(`📋 客户端 ${socket.id} 加入测试历史更新房间`);

        // 发送房间加入确认
        socket.emit('room-joined', {
          room: 'test-history-updates',
          clientId: socket.id,
          timestamp: Date.now()
        });
      }
    });

    // 离开测试历史更新房间
    socket.on('leave-room', (data) => {
      if (data.room === 'test-history-updates') {
        socket.leave('test-history-updates');
        console.log(`📋 客户端 ${socket.id} 离开测试历史更新房间`);
      }
    });

    socket.on('test-ping', (data) => {
      console.log(`🏓 收到测试ping:`, data);
      socket.emit('test-pong', {
        ...data,
        pongTime: Date.now(),
        socketId: socket.id
      });
    });

    // 🔧 添加WebSocket取消测试事件处理
    socket.on('cancel-stress-test', async (data) => {
      console.log(`🛑 收到WebSocket取消测试事件:`, { socketId: socket.id, data });

      try {
        const { testId, reason = '用户手动取消' } = data;

        if (!testId) {
          console.warn('⚠️ WebSocket取消事件缺少testId');
          return;
        }

        // 获取测试引擎实例
        const { RealStressTestEngine } = require('./services/realStressTestEngine');
        const stressTestEngine = new RealStressTestEngine();
        stressTestEngine.io = io;

        // 调用取消测试方法
        const result = await stressTestEngine.cancelStressTest(testId, reason, true);

        console.log(`🛑 WebSocket取消测试结果:`, { testId, result });

        // 向客户端发送取消确认
        socket.emit('cancel-stress-test-ack', {
          testId,
          success: result.success,
          message: result.message,
          timestamp: Date.now()
        });

      } catch (error) {
        console.error('❌ WebSocket取消测试失败:', error);
        socket.emit('cancel-stress-test-ack', {
          testId: data.testId,
          success: false,
          message: error.message || '取消测试失败',
          timestamp: Date.now()
        });
      }
    });

    // 简化的事件监听器 - 只记录关键事件
    socket.onAny((eventName, ...args) => {
      if (['join-stress-test', 'leave-stress-test', 'cancel-stress-test'].includes(eventName)) {
        console.log(`📥 收到关键事件: ${eventName}`, { socketId: socket.id, data: args[0] });
      }
    });

    // 处理断开连接
    socket.on('disconnect', () => {
      console.log(`🔌 WebSocket客户端断开连接: ${socket.id}`);

      // 🔧 重构：清理用户WebSocket连接
      // 注意：这里我们不知道具体的userId，所以需要在连接时存储
      // 实际实现中可以在socket对象上存储userId
      if (socket.userId) {
        const userTestManager = require('./services/UserTestManager');
        userTestManager.unregisterUserSocket(socket.userId);
      }
    });
  });

  // 将io实例设置为全局变量，供其他模块使用
  global.io = io;
}

// 启动应用
if (require.main === module) {
  startServer();
}

module.exports = app;
