/**
 * Test Web App - 主应用程序
 * 融合简化版和完整版功能的统一后端
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

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
const monitoringRoutes = require('./routes/monitoring');
const reportRoutes = require('./routes/reports');
const integrationRoutes = require('./routes/integrations');
const cacheRoutes = require('./routes/cache');

// 导入中间件
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');
const { rateLimiter } = require('./middleware/rateLimiter');
const { securityMiddleware } = require('./middleware/security');

// 导入数据库连接
const { connectDB, testConnection } = require('./config/database');

// 导入Redis服务
const redisConnection = require('./services/redis/connection');
const cacheMonitoring = require('./services/redis/monitoring');

// 导入测试历史服务
const TestHistoryService = require('./services/dataManagement/testHistoryService');

const app = express();
const http = require('http');
const { Server } = require('socket.io');

const PORT = parseInt(process.env.PORT || process.env.API_PORT || process.env.APP_PORT) || 3001;
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

// 基础中间件
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
app.use('/api/test', testRoutes);
app.use('/api/seo', seoRoutes); // SEO测试API - 解决CORS问题
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// 偏好设置API已移除，请使用 /api/user/preferences
// 原有的 /api/preferences 路由功能已整合到 /api/user/preferences 中

// 数据管理API - 统一到 /api/data-management
app.use('/api/data-management', dataManagementRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/system', require('./routes/system'));
app.use('/api/integrations', integrationRoutes);
app.use('/api/cache', cacheRoutes);

// 健康检查端点
app.get('/health', async (req, res) => {
  try {
    // 检查数据库连接
    await testConnection();

    // 检查Redis连接
    const redisHealth = await redisConnection.healthCheck();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      name: APP_NAME,
      version: APP_VERSION,
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      redis: redisHealth,
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
    const report = cacheMonitoring.getMonitoringReport(period);

    res.json({
      success: true,
      data: report
    });
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

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    path: req.originalUrl
  });
});

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    // 确保目录存在
    ensureDirectories();

    // 连接数据库
    await connectDB();
    console.log('✅ 数据库连接成功');

    // 初始化测试历史服务
    global.testHistoryService = new TestHistoryService();
    console.log('✅ 测试历史服务初始化成功');

    // 设置WebSocket事件处理
    setupWebSocketHandlers(io);

    // 清理旧的测试房间
    setTimeout(async () => {
      try {
        const { RealStressTestEngine } = require('./services/realStressTestEngine');
        const stressTestEngine = new RealStressTestEngine();
        stressTestEngine.io = io; // 设置WebSocket实例
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

    // 加入压力测试房间
    socket.on('join-stress-test', (testId) => {
      console.log(`🔥🔥🔥 收到 join-stress-test 事件 🔥🔥🔥`, { testId, socketId: socket.id });

      const roomName = `stress-test-${testId}`;
      socket.join(roomName);
      console.log(`📊📊📊 客户端 ${socket.id} 加入压力测试房间: ${testId} 📊📊📊`);

      // 检查房间中的客户端数量
      const room = io.sockets.adapter.rooms.get(roomName);
      const clientCount = room ? room.size : 0;
      console.log(`📊 房间 ${roomName} 当前客户端数量: ${clientCount}`);

      // 发送房间加入确认
      const confirmData = {
        testId,
        roomName: roomName,
        clientId: socket.id,
        clientCount: clientCount,
        timestamp: Date.now()
      };

      console.log(`🚀🚀🚀 准备发送房间加入确认 🚀🚀🚀`, confirmData);
      socket.emit('room-joined', confirmData);
      console.log(`✅✅✅ 房间加入确认已发送给客户端 ${socket.id} ✅✅✅`);

      // 🆕 检查是否有正在运行或已完成的测试，发送当前状态
      // 使用全局的压力测试引擎实例
      const currentTest = global.stressTestEngine ? global.stressTestEngine.getTestStatus(testId) : null;

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

    // 测试连接ping/pong
    socket.on('test-ping', (data) => {
      console.log(`🏓 收到测试ping:`, data);
      socket.emit('test-pong', {
        ...data,
        pongTime: Date.now(),
        socketId: socket.id
      });
    });

    // 简化的事件监听器 - 只记录关键事件
    socket.onAny((eventName, ...args) => {
      if (['join-stress-test', 'leave-stress-test'].includes(eventName)) {
        console.log(`📥 收到关键事件: ${eventName}`, { socketId: socket.id, data: args[0] });
      }
    });

    // 处理断开连接
    socket.on('disconnect', () => {
      console.log(`🔌 WebSocket客户端断开连接: ${socket.id}`);
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
