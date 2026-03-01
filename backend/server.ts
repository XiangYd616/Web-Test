/**
 * Test-Web Platform Backend Server
 * 网站测试平台后端服务器
 */

// 必须在所有 import 之前加载 .env，否则 database.ts 等模块顶层读取不到环境变量
import dotenv from 'dotenv';
import path from 'path';
// __dirname 在编译后为 dist/backend/，需要回退两级到项目根目录
// 同时兼容 process.cwd()（PM2 的 cwd 通常是项目根目录）
const envRoot = path.resolve(process.cwd());
dotenv.config({ path: path.join(envRoot, '.env') });
if (process.env.NODE_ENV) {
  dotenv.config({ path: path.join(envRoot, `.env.${process.env.NODE_ENV}`), override: false });
}

import axios from 'axios';
import compression from 'compression';
import cors from 'cors';
import type { ErrorRequestHandler, Request, RequestHandler, Response } from 'express';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import http, { type Server } from 'http';
import https from 'https';
import morgan from 'morgan';
import { Server as SocketIOServer } from 'socket.io';
import apiRequestLogger from './modules/api/middleware/requestLogger';
import createOptimizationMiddleware from './modules/api/middleware/staticOptimization';

// 测试平台需要检测任意目标网站，全局放宽 SSL 证书验证
axios.defaults.httpsAgent = new https.Agent({ rejectUnauthorized: false });

import { closeConnection, connectDB } from './modules/config/database';
import { setupSwaggerDocs } from './modules/config/swagger';
import testEngineRegistry from './modules/core/TestEngineRegistry';
import registerTestEngines from './modules/engines/core/registerEngines';
import { errorMiddleware, handleError, notFoundHandler } from './modules/middleware/errorHandler';
import { apiStats, performanceMonitor, requestLogger } from './modules/middleware/logger';
import { rateLimiter as apiRateLimiter } from './modules/middleware/rateLimiter';
import { response } from './modules/middleware/responseFormatter';
// PG 监控服务已移除（纯本地 SQLite 模式）
// import { DatabaseMonitoringService } from './modules/monitoring/services/DatabaseMonitoringService';
// import { MonitoringDataCollector } from './modules/monitoring/services/MonitoringDataCollector';
import JwtService from './modules/core/services/jwtService';
import PerformanceBenchmarkService from './modules/performance/services/PerformanceBenchmarkService';
import * as scheduledRunController from './modules/schedules/controllers/scheduledRunController';
import ScheduledRunService from './modules/schedules/services/ScheduledRunService';
import { storageService } from './modules/storage/services/storageServiceSingleton';
import { setQueueEnabled } from './modules/testing/services/TestQueueService';
import userTestManager from './modules/testing/services/UserTestManager';
import { stopSecurityCleanup } from './modules/utils/securityLogger';
import { typeAlignmentMiddleware } from './modules/utils/typeAlignment';

const loadRoute = async (routePath: string, label: string) => {
  const start = Date.now();
  const moduleExports = await import(routePath);
  const route = moduleExports?.default || moduleExports;
  console.log(`⏱️ 路由加载完成 [${label}]: ${Date.now() - start}ms`);
  return route;
};

// 创建Express应用
const app = express();

// 生产环境下信任 Nginx 反向代理（正确识别客户端 IP，修复 express-rate-limit X-Forwarded-For 警告）
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// 环境变量配置
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN =
  process.env.CORS_ORIGIN ||
  (NODE_ENV === 'production'
    ? 'https://app.xiangweb.space,https://xiangweb.space,https://www.xiangweb.space,https://web-test-pied.vercel.app'
    : 'http://localhost:5174,http://localhost:3000');

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
        if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
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

// 速率限制：生产环境启用，开发/本地模式跳过（避免正常刷新触发 429）
if (NODE_ENV === 'production') {
  app.use('/api', apiRateLimiter);
}

const enableApiRequestLogger = process.env.API_REQUEST_LOGGER_ENABLED !== 'false';
if (enableApiRequestLogger) {
  app.use(
    '/api',
    apiRequestLogger({
      excludePaths: ['/api/health', '/health'],
      includeBody: false,
      logLevel: process.env.API_REQUEST_LOGGER_LEVEL as 'debug' | 'info' | 'warn' | 'error',
    })
  );
}

// 自定义日志中间件
app.use(requestLogger as unknown as RequestHandler);
app.use(performanceMonitor as unknown as RequestHandler);
app.use(apiStats as unknown as RequestHandler);

// 响应格式化中间件（提供 res.success 等）
app.use(response as unknown as RequestHandler);
// 响应类型对齐
app.use(typeAlignmentMiddleware as unknown as RequestHandler);

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
    name: 'Test-Web Local Tool',
    version: process.env.npm_package_version || '1.0.0',
    description: '本地 API 测试工具',
    endpoints: {
      auth: '/api/auth',
      oauth: '/api/oauth',
      test: '/api/test',
      users: '/api/users',
      comparison: '/api/comparison',
      batch: '/api/batch',
      core: '/api/core',
      system: '/api/system',
      data: '/api/data',
      storage: '/api/storage',
      admin: '/api/admin',
      workspaces: '/api/workspaces',
      collections: '/api/collections',
      environments: '/api/environments',
      schedules: '/api/schedules',
      uat: '/api/uat',
      testPlans: '/api/test-plans',
      ci: '/api/ci',
    },
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

const registerRoutes = async () => {
  // 导入路由
  const authRoutes = await loadRoute('./modules/auth/routes/auth', 'auth');
  const oauthRoutes = await loadRoute('./modules/auth/routes/oauth', 'oauth');
  const testRoutes = await loadRoute('./modules/testing/routes', 'test');
  const usersRoutes = await loadRoute('./modules/users/routes/users', 'users');
  const comparisonRoutes = await loadRoute('./modules/testing/routes/comparison', 'comparison');
  const batchRoutes = await loadRoute('./modules/testing/routes/batch', 'batch');
  const coreRoutes = await loadRoute('./modules/testing/routes/core', 'core');
  const systemRoutes = await loadRoute('./modules/system/routes', 'system');
  const dataRoutes = await loadRoute('./modules/data/routes', 'data');
  const storageRoutes = await loadRoute('./modules/data/routes/storage', 'storage');
  const adminRoutes = await loadRoute('./modules/admin/routes/admin', 'admin');
  const workspaceRoutes = await loadRoute('./modules/workspaces/routes/workspaces', 'workspaces');
  const collectionRoutes = await loadRoute(
    './modules/collections/routes/collections',
    'collections'
  );
  const environmentRoutes = await loadRoute(
    './modules/environments/routes/environments',
    'environments'
  );
  const scheduledRunRoutes = await loadRoute(
    './modules/schedules/routes/scheduledRuns',
    'scheduledRuns'
  );
  const uatRoutes = await loadRoute('./modules/uat/routes', 'uat');
  const testPlanRoutes = await loadRoute('./modules/testplans/routes/testPlans', 'testPlans');
  const ciRoutes = await loadRoute('./modules/ci/routes/ci', 'ci');
  const syncRoutes = await loadRoute('./modules/sync/routes/sync', 'sync');

  // API路由
  app.use('/api/auth', authRoutes);
  app.use('/api/oauth', oauthRoutes);
  app.use('/api/test', testRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/comparison', comparisonRoutes);
  app.use('/api/batch', batchRoutes);
  app.use('/api/core', coreRoutes);
  app.use('/api/system', systemRoutes);
  app.use('/api/data', dataRoutes);
  app.use('/api/storage', storageRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api/collections', collectionRoutes);
  app.use('/api/environments', environmentRoutes);
  app.use('/api/schedules', scheduledRunRoutes);
  app.use('/api/uat', uatRoutes);
  app.use('/api/test-plans', testPlanRoutes);
  app.use('/api/ci', ciRoutes);
  app.use('/api/sync', syncRoutes);
};

// 静态文件服务（如果需要）
if (NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../frontend/dist');
  if (fs.existsSync(frontendBuildPath)) {
    const enableStaticOptimization = process.env.STATIC_OPTIMIZATION_ENABLED !== 'false';
    if (enableStaticOptimization) {
      app.use(createOptimizationMiddleware());
    }
    app.use(express.static(frontendBuildPath));

    // SPA路由支持
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
  }
}

// 优雅关闭处理
const gracefulShutdown = () => {
  if (!server) {
    process.exit(0);
  }
  server.close(async () => {
    console.log('✅ HTTP server closed');

    // 停止安全日志清理定时器
    stopSecurityCleanup();

    // 先停止所有依赖数据库的服务，再关闭连接池
    const serverWithServices = server as unknown as {
      performanceBenchmarkService?: PerformanceBenchmarkService | null;
    };

    try {
      await Promise.allSettled([
        serverWithServices.performanceBenchmarkService?.shutdown().catch((error: unknown) => {
          console.error('❌ Failed to shutdown performance benchmark service:', error);
        }),
        storageService.stop().catch((error: unknown) => {
          console.error('❌ Failed to stop storage services:', error);
        }),
      ]);
    } catch {
      // ignore — allSettled never rejects but guard anyway
    }

    // 所有服务已停止，安全关闭数据库连接池
    try {
      await closeConnection();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (err: unknown) {
      console.error('❌ Error during database shutdown:', err);
      process.exit(1);
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
  // 本地工具模式下，单个异步错误不应导致整个服务退出
  console.error('⚠️ 捕获到未处理的 Promise 拒绝，服务继续运行。');
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

    // 纯本地模式：禁用 Redis 队列，测试直接异步执行
    setQueueEnabled(false);
    const performanceBenchmarkService = new PerformanceBenchmarkService();

    await performanceBenchmarkService.initialize();
    logStep('性能基准服务启动完成');

    await registerRoutes();
    logStep('路由加载完成');

    // 404处理 - 使用统一错误处理
    app.use('*', notFoundHandler as unknown as RequestHandler);

    // 全局错误处理 - 使用统一错误处理系统
    app.use(errorMiddleware as unknown as ErrorRequestHandler);

    try {
      await storageService.start();
      logStep('存储归档/清理服务启动完成');
    } catch (error: unknown) {
      console.error('启动存储归档/清理服务失败:', error);
    }

    registerTestEngines();
    logStep('测试引擎注册完成');
    await testEngineRegistry.initialize();
    logStep('测试引擎初始化完成');

    // 预加载 Puppeteer 浏览器池（正式依赖，启动时即检测可用性）
    const { puppeteerPool } = await import('./modules/engines/shared/services/PuppeteerPool');
    await puppeteerPool.preload();
    logStep('Puppeteer 浏览器池预加载完成');

    logStep('本地模式: 测试任务直接异步执行（无 Redis 队列）');

    const enableScheduledRuns = process.env.SCHEDULED_RUNS_ENABLED === 'true';

    if (enableScheduledRuns) {
      const scheduledRunService = new ScheduledRunService();
      scheduledRunController.setScheduledRunService(scheduledRunService);
      scheduledRunService.start().catch((error: unknown) => {
        console.error('启动定时运行服务失败:', error);
      });
      logStep('定时运行服务启动完成');
    }

    // 启动HTTP服务器（使用 http.createServer 以便挂载 Socket.IO）
    const httpServer = http.createServer(app);

    // 挂载 Socket.IO 用于实时推送测试进度
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: NODE_ENV === 'development' ? true : (CORS_ORIGIN.split(',') as string[]),
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    const socketJwtService = new JwtService();

    io.on('connection', socket => {
      const token = socket.handshake.auth?.token as string | undefined;
      let userId = 'local';

      if (token) {
        try {
          const decoded = socketJwtService.verifyAccessToken(token);
          userId = String(decoded.userId);
        } catch {
          if (NODE_ENV !== 'development') {
            socket.disconnect(true);
            return;
          }
        }
      } else if (NODE_ENV !== 'development') {
        socket.disconnect(true);
        return;
      }

      userTestManager.registerUserSocket(userId, socket);
      if (NODE_ENV === 'development') {
        console.log(`[WS] 用户已连接: ${userId} (socket=${socket.id})`);
      }

      socket.on('disconnect', () => {
        userTestManager.unregisterUserSocket(userId);
        if (NODE_ENV === 'development') {
          console.log(`[WS] 用户已断开: ${userId}`);
        }
      });
    });

    const server: Server = httpServer;

    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      logStep('HTTP + WebSocket 服务监听完成');

      if (NODE_ENV === 'development') {
        console.log('🔧 Development mode - CORS enabled for all origins');
      }
    });

    // CollaborationService 已移除（本地工具不需要实时协作）

    // 设置服务器超时
    server.timeout = 30000; // 30秒超时
    server.keepAliveTimeout = 65000; // Keep-alive超时
    server.headersTimeout = 66000; // 请求头超时

    (
      server as unknown as { performanceBenchmarkService?: PerformanceBenchmarkService | null }
    ).performanceBenchmarkService = performanceBenchmarkService;

    return server;
  } catch (error: unknown) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// 导出服务器实例（用于测试）
let server: Server | null = null;

const isMain = require.main === module;

if (isMain) {
  // 直接运行时启动服务器
  startServer().then(s => {
    server = s;
  });
}

const getServer = () => server;

export { app, getServer, startServer };
