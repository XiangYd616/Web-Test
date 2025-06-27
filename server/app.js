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
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const dataRoutes = require('./routes/data');
const monitoringRoutes = require('./routes/monitoring');
const reportRoutes = require('./routes/reports');
const integrationRoutes = require('./routes/integrations');

// 导入中间件
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');
const { rateLimiter } = require('./middleware/rateLimiter');
const { securityMiddleware } = require('./middleware/security');

// 导入数据库连接
const { connectDB, testConnection } = require('./config/database');

const app = express();
const PORT = parseInt(process.env.PORT || process.env.API_PORT || process.env.APP_PORT) || 3001;
const HOST = process.env.HOST || 'localhost';
const APP_NAME = process.env.APP_NAME || 'Test Web App';
const APP_VERSION = process.env.APP_VERSION || '1.0.0';

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

// CORS配置
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5174', 'http://localhost:3001', 'http://127.0.0.1:5174', 'http://127.0.0.1:3001'];

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
app.use('/api/test-engines', testRoutes); // 测试引擎状态API
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/integrations', integrationRoutes);

// 健康检查端点
app.get('/health', async (req, res) => {
  try {
    // 检查数据库连接
    await testConnection();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      name: APP_NAME,
      version: APP_VERSION,
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      uptime: process.uptime(),
      host: HOST,
      port: PORT
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: 'disconnected'
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
      user: '/api/user',
      admin: '/api/admin',
      data: '/api/data',
      monitoring: '/api/monitoring',
      reports: '/api/reports',
      integrations: '/api/integrations'
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
    
    // 启动服务器
    const server = app.listen(PORT, () => {
      console.log(`🚀 服务器运行在端口 ${PORT}`);
      console.log(`📖 API文档: http://localhost:${PORT}/api`);
      console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
      console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
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

// 启动应用
if (require.main === module) {
  startServer();
}

module.exports = app;
