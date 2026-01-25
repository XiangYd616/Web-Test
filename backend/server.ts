/**
 * Test-Web Platform Backend Server
 * 网站测试平台后端服务器
 */

import type { Request, Response } from 'express';
import type { Server } from 'http';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// 导入数据库连接 (pg)
const { connectDB, closeConnection } = require('./config/database');

const loadRoute = (routePath: string, label: string) => {
  const start = Date.now();
  const moduleExports = require(routePath);
  const route = moduleExports?.default || moduleExports;
  console.log(`⏱️ 路由加载完成 [${label}]: ${Date.now() - start}ms`);
  return route;
};
const scheduledRunController = require('./controllers/scheduledRunController');
const ScheduledRunService = require('./services/runs/ScheduledRunService');
const CollaborationService = require('./services/collaboration/CollaborationService');
const registerTestEngines = require('./engines/core/registerEngines');
const testEngineRegistry = require('./core/TestEngineRegistry');
const { startWorker } = require('./services/testing/TestQueueService');
const { setupSwaggerDocs } = require('./config/swagger');

// 导入中间件
const { response } = require('./middleware/responseFormatter');
// 导入统一错误处理系统
const { errorMiddleware, notFoundHandler, handleError } = require('./middleware/errorHandler');
const { requestLogger, performanceMonitor, apiStats } = require('./middleware/logger');
const { typeAlignmentMiddleware } = require('./utils/typeAlignment');

// 创建Express应用
const app = express();

// 环境变量配置
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// 基础中间件配置
app.use(
  helmet({
    contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(compression());

// CORS配置
app.use(
  cors({
    origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// 日志中间件
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // 生产环境使用更详细的日志格式
  app.use(
    morgan('combined', {
      stream: fs.createWriteStream(path.join(__dirname, 'logs/access.log'), { flags: 'a' }),
    })
  );
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
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// 自定义日志中间件
app.use(requestLogger);
app.use(performanceMonitor);
app.use(apiStats);

// 响应格式化中间件（提供 res.success 等）
app.use(response);
// 响应类型对齐
app.use(typeAlignmentMiddleware);

// Swagger 文档
setupSwaggerDocs(app);

// 健康检查端点
app.get('/health', (_req: Request, res: Response) => {
  res.success(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
    },
    undefined,
    200
  );
});

// API信息端点
app.get('/api/info', (_req: Request, res: Response) => {
  res.success({
    name: 'Test-Web Platform API',
    version: process.env.npm_package_version || '1.0.0',
    description: '网站测试平台后端API服务',
    endpoints: {
      auth: '/api/auth',
      oauth: '/api/oauth',
      test: '/api/test',
      users: '/api/users',
      performance: '/api/performance',

      comparison: '/api/comparison',
      analytics: '/api/analytics',
      integrations: '/api/integrations',
      batch: '/api/batch',
      core: '/api/core',
      system: '/api/system',
      data: '/api/data',
      admin: '/api/admin',
    },
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

const registerRoutes = () => {
  // 导入路由
  const authRoutes = loadRoute('./routes/auth', 'auth');
  const oauthRoutes = loadRoute('./routes/oauth', 'oauth');
  const testRoutes = loadRoute('./routes/test', 'test');
  const usersRoutes = loadRoute('./routes/users', 'users');
  const comparisonRoutes = loadRoute('./routes/misc/comparison', 'comparison');
  const integrationsRoutes = loadRoute('./routes/misc/integrations', 'integrations');
  const batchRoutes = loadRoute('./routes/misc/batch', 'batch');
  const coreRoutes = loadRoute('./routes/misc/core', 'core');
  const analyticsRoutes = loadRoute('./routes/analytics', 'analytics');
  const systemRoutes = loadRoute('./routes/system', 'system');
  const dataRoutes = loadRoute('./routes/data', 'data');
  const storageRoutes = loadRoute('./routes/data/storage', 'storage');
  const adminRoutes = loadRoute('./routes/admin', 'admin');
  const workspaceRoutes = loadRoute('./routes/workspaces', 'workspaces');
  const collectionRoutes = loadRoute('./routes/collections', 'collections');
  const environmentRoutes = loadRoute('./routes/environments', 'environments');
  const runRoutes = loadRoute('./routes/runs', 'runs');
  const scheduledRunRoutes = loadRoute('./routes/scheduledRuns', 'scheduledRuns');

  // API路由
  app.use('/api/auth', authRoutes);
  app.use('/api/oauth', oauthRoutes);
  app.use('/api/test', testRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/comparison', comparisonRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/integrations', integrationsRoutes);
  app.use('/api/batch', batchRoutes);
  app.use('/api/core', coreRoutes);
  app.use('/api/system', systemRoutes);
  app.use('/api/data', dataRoutes);
  app.use('/api/storage', storageRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api/collections', collectionRoutes);
  app.use('/api/environments', environmentRoutes);
  app.use('/api/runs', runRoutes);
  app.use('/api/schedules', scheduledRunRoutes);
};

// 静态文件服务（如果需要）
if (NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../frontend/build');
  if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));

    // SPA路由支持
    app.get('*', (_req: Request, res: Response) => {
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
  if (!server) {
    process.exit(0);
  }
  server.close(() => {
    console.log('✅ HTTP server closed');

    // 关闭数据库连接 (pg)
    closeConnection()
      .then(() => {
        console.log('✅ Database connection closed');
        process.exit(0);
      })
      .catch((err: unknown) => {
        console.error('❌ Error during database shutdown:', err);
        process.exit(1);
      });
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
process.on('uncaughtException', (error: Error) => {
  handleError(error, { type: 'uncaughtException', severity: 'CRITICAL' });
  gracefulShutdown();
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  handleError(new Error(`Unhandled Rejection: ${reason}`), {
    type: 'unhandledRejection',
    severity: 'HIGH',
    promise,
  });
  gracefulShutdown();
});

// 启动服务器
const startServer = async (): Promise<Server> => {
  try {
    console.log('🚀 Starting Test-Web Platform Backend...');
    const startTime = Date.now();
    const logStep = (label: string) => {
      console.log(`⏱️ ${label}: ${Date.now() - startTime}ms`);
    };

    // 确保日志目录存在
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // 连接数据库
    await connectDB();
    logStep('数据库连接完成');

    registerRoutes();
    logStep('路由加载完成');

    registerTestEngines();
    logStep('测试引擎注册完成');
    await testEngineRegistry.initialize();
    logStep('测试引擎初始化完成');

    const enableTestQueue = process.env.TEST_QUEUE_ENABLED !== 'false';
    if (enableTestQueue) {
      try {
        startWorker({ queueName: 'test-execution' });
        startWorker({ queueName: 'test-execution-heavy' });
        console.log('✅ 测试队列 Worker 已启动');
        logStep('测试队列 Worker 启动完成');
      } catch (error: unknown) {
        console.error('启动测试队列 Worker 失败:', error);
      }
    }

    const enableScheduledRuns = process.env.SCHEDULED_RUNS_ENABLED === 'true';

    if (enableScheduledRuns) {
      const scheduledRunService = new ScheduledRunService();
      scheduledRunController.setScheduledRunService(scheduledRunService);
      scheduledRunService.start().catch((error: unknown) => {
        console.error('启动定时运行服务失败:', error);
      });
      logStep('定时运行服务启动完成');
    }

    // 启动HTTP服务器
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      logStep('HTTP 服务监听完成');

      if (NODE_ENV === 'development') {
        console.log('🔧 Development mode - CORS enabled for all origins');
      }
    });

    const collaborationService = new CollaborationService();
    collaborationService
      .initialize({
        server,
        path: '/ws/collaboration',
      })
      .catch((error: unknown) => {
        console.error('启动协作服务失败:', error);
      });
    logStep('协作服务启动完成');

    // 设置服务器超时
    server.timeout = 30000; // 30秒超时
    server.keepAliveTimeout = 65000; // Keep-alive超时
    server.headersTimeout = 66000; // 请求头超时

    return server;
  } catch (error: unknown) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// 导出服务器实例（用于测试）
let server: Server | null = null;

if (require.main === module) {
  // 直接运行时启动服务器
  startServer().then(s => {
    server = s;
  });
} else {
  // 被require时导出启动函数
  module.exports = { app, startServer };
}

// 导出服务器实例
module.exports.getServer = () => server;
