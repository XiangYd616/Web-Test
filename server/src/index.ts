import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import { db } from './config/database';
import { migrationManager } from './database/migrationManager';
import { logger, requestLogger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { authMiddleware } from './middleware/auth';

// 导入路由
import adminRoutes from './routes/admin';
import authRoutes from './routes/auth';
import testRoutes from './routes/test';
import userRoutes from './routes/user';
import testHistoryRoutes from './routes/testHistory';
import testEnginesRoutes from './routes/testEngines';
import preferencesRoutes from './routes/preferences';
import monitoringRoutes from './routes/monitoring';
import reportsRoutes from './routes/reports';
import integrationsRoutes from './routes/integrations';
import dataManagementRoutes from './routes/dataManagement';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 基础中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(compression());

// CORS配置
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5174',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// 请求解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      requestLogger.info(message.trim());
    }
  }
}));

// 速率限制
app.use(rateLimiter);

// 健康检查端点
app.get('/health', async (_req, res) => {
  try {
    const dbHealth = await db.checkHealth();
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbHealth,
      version: process.env.npm_package_version || '1.0.0',
    };

    res.json(health);
  } catch (error) {
    logger.error('健康检查失败', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/test', testRoutes); // 移除强制认证，让路由内部处理
app.use('/api/tests', testRoutes); // 添加复数形式的路由映射
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/users', authMiddleware, userRoutes); // 添加复数形式的路由映射
app.use('/api/test-history', testHistoryRoutes);
app.use('/api/test-engines', testEnginesRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/monitoring', authMiddleware, monitoringRoutes);
app.use('/api/reports', authMiddleware, reportsRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/data-management', dataManagementRoutes);

// 静态文件服务（如果需要）
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));
  
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  });
}

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API端点不存在',
    path: req.originalUrl,
  });
});

// 错误处理中间件
app.use(errorHandler);

// 优雅关闭处理
const gracefulShutdown = async (signal: string) => {
  logger.info(`收到${signal}信号，开始优雅关闭...`);
  
  try {
    // 关闭数据库连接
    await db.close();
    logger.info('数据库连接已关闭');
    
    // 关闭服务器
    server.close(() => {
      logger.info('HTTP服务器已关闭');
      process.exit(0);
    });
    
    // 强制退出超时
    setTimeout(() => {
      logger.error('强制退出：优雅关闭超时');
      process.exit(1);
    }, 10000);
  } catch (error) {
    logger.error('优雅关闭过程中发生错误', error);
    process.exit(1);
  }
};

// 启动服务器
const startServer = async () => {
  try {
    // 初始化数据库连接
    logger.info('正在初始化数据库连接...');
    await db.initialize();
    
    // 运行数据库迁移
    logger.info('正在检查数据库迁移...');
    await migrationManager.runMigrations();
    
    // 启动HTTP服务器
    const server = app.listen(PORT, () => {
      logger.info(`服务器启动成功`, {
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        pid: process.pid,
      });
    });

    // 注册优雅关闭处理器
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // 未捕获异常处理
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常', error);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的Promise拒绝', { reason, promise });
      gracefulShutdown('unhandledRejection');
    });

    return server;
  } catch (error) {
    logger.error('服务器启动失败', error);
    process.exit(1);
  }
};

// 导出app用于测试
export { app };

// 如果直接运行此文件，启动服务器
if (require.main === module) {
  startServer();
}

// 声明server变量用于优雅关闭
let server: any;
