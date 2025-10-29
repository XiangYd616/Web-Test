/**
 * Test-Web Platform Backend Server
 * 网站测试平台后端服务器
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// 导入数据库连接
const { connectDatabase, syncDatabase } = require('./database/sequelize');

// 导入路由
const authRoutes = require('./routes/auth');
const oauthRoutes = require('./routes/oauth');
const testRoutes = require('./routes/test');
const testsRoutes = require('./routes/tests');
const seoRoutes = require('./routes/seo');
const securityRoutes = require('./routes/security');
const performanceRoutes = require('./routes/performance');

// 导入中间件
const authMiddleware = require('./middleware/auth');
const { responseFormatter, errorResponseFormatter } = require('./middleware/responseFormatter');
// 导入统一错误处理系统
const { errorMiddleware, notFoundHandler, handleError, ErrorCode } = require('./middleware/UnifiedErrorHandler');
const { requestLogger, performanceMonitor, apiStats } = require('./middleware/logger');

// 创建Express应用
const app = express();

// 环境变量配置
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// 基础中间件配置
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

app.use(compression());

// CORS配置
app.use(cors({
  origin: function (origin, callback) {
    // 在开发环境允许所有源，生产环境使用配置的源
    if (NODE_ENV === 'development') {
      callback(null, true);
    } else {
      const allowedOrigins = CORS_ORIGIN.split(',');
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 日志中间件
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // 生产环境使用更详细的日志格式
  app.use(morgan('combined', {
    stream: fs.createWriteStream(path.join(__dirname, 'logs/access.log'), { flags: 'a' })
  }));
}

// 请求解析中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: NODE_ENV === 'development' ? 1000 : 200, // 开发环境允许更多请求
  message: {
    error: 'Too many requests from this IP',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// 自定义响应格式化中间件
app.use(responseFormatter);

// 自定义日志中间件
app.use(requestLogger);
app.use(performanceMonitor);
app.use(apiStats);

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API信息端点
app.get('/info', (req, res) => {
  res.json({
    name: 'Test-Web Platform API',
    version: process.env.npm_package_version || '1.0.0',
    description: '网站测试平台后端API服务',
    endpoints: {
      auth: '/api/auth',
      oauth: '/api/oauth',
      tests: '/api/tests',
      seo: '/api/seo',
      security: '/api/security',
      performance: '/api/performance'
    },
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/test', testRoutes);
app.use('/api/tests', testsRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/performance', performanceRoutes);

// 静态文件服务（如果需要）
if (NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../frontend/build');
  if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
    
    // SPA路由支持
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
  }
}

// 404处理 - 使用统一错误处理
app.use('*', notFoundHandler);

// 全局错误处理 - 使用统一错误处理系统
app.use(errorMiddleware);

// 优雅关闭处理
const gracefulShutdown = () => {
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // 关闭数据库连接
    if (require('./database/sequelize').sequelize) {
      require('./database/sequelize').sequelize.close().then(() => {
        console.log('✅ Database connection closed');
        process.exit(0);
      }).catch(err => {
        console.error('❌ Error during database shutdown:', err);
        process.exit(1);
      });
    } else {
      process.exit(0);
    }
  });

  // 强制关闭超时
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// 处理进程信号
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// 处理未捕获的异常 - 使用统一错误处理系统
process.on('uncaughtException', (error) => {
  handleError(error, { type: 'uncaughtException', severity: 'CRITICAL' });
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  handleError(new Error(`Unhandled Rejection: ${reason}`), { 
    type: 'unhandledRejection', 
    severity: 'HIGH',
    promise: promise 
  });
  gracefulShutdown();
});

// 启动服务器
const startServer = async () => {
  try {
    console.log('🚀 Starting Test-Web Platform Backend...');
    
    // 确保日志目录存在
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // 连接数据库
    const dbConnected = await connectDatabase();
    
    if (dbConnected) {
      // 同步数据库表结构（仅在开发环境）
      if (NODE_ENV === 'development') {
        await syncDatabase(false); // false = 不强制重建表
      }
    } else {
      console.warn('⚠️  Database connection failed, but server will continue...');
    }
    
    // 启动HTTP服务器
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      
      if (NODE_ENV === 'development') {
        console.log('🔧 Development mode - CORS enabled for all origins');
      }
      
    });

    // 设置服务器超时
    server.timeout = 30000; // 30秒超时
    server.keepAliveTimeout = 65000; // Keep-alive超时
    server.headersTimeout = 66000; // 请求头超时

    return server;
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// 导出服务器实例（用于测试）
let server;

if (require.main === module) {
  // 直接运行时启动服务器
  startServer().then(s => { server = s; });
} else {
  // 被require时导出app（用于测试）
  module.exports = app;
  module.exports.app = app;
  module.exports.startServer = startServer;
  module.exports.getServer = () => server;
}
