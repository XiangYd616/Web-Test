/**
 * 统一API架构 v1.0
 * 本地化优先的测试工具平台API
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { body, validationResult } = require('express-validator');

// 导入路由模块
const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/tests');
const userRoutes = require('./routes/users');
const systemRoutes = require('./routes/system');

// 导入中间件
const authMiddleware = require('../middleware/auth');
const errorHandler = require('../middleware/errorHandler');
const requestLogger = require('../middleware/requestLogger');
const responseFormatter = require('../middleware/responseFormatter');

const router = express.Router();

// =====================================================
// 1. 全局中间件配置
// =====================================================

// 安全中间件
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS配置
router.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 压缩响应
router.use(compression());

// 请求日志
router.use(requestLogger);

// 响应格式化
router.use(responseFormatter);

// =====================================================
// 2. 全局限流配置
// =====================================================

// 通用API限流
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 每个IP最多1000次请求
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '请求过于频繁，请稍后再试',
      details: {
        windowMs: 15 * 60 * 1000,
        max: 1000
      }
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // 跳过健康检查和系统监控请求
    return req.path === '/health' || req.path === '/metrics';
  }
});

// 测试API限流（更严格）
const testLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 10, // 每分钟最多10次测试请求
  message: {
    error: {
      code: 'TEST_RATE_LIMIT_EXCEEDED',
      message: '测试请求过于频繁，请稍后再试',
      details: {
        windowMs: 60 * 1000,
        max: 10
      }
    }
  },
  keyGenerator: (req) => {
    // 基于用户ID和IP的组合限流
    return req.user ? `${req.user.id}:${req.ip}` : req.ip;
  }
});

// 认证API限流（最严格）
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 每15分钟最多5次登录尝试
  message: {
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: '登录尝试过于频繁，请15分钟后再试',
      details: {
        windowMs: 15 * 60 * 1000,
        max: 5
      }
    }
  },
  skipSuccessfulRequests: true // 成功的请求不计入限制
});

// 应用限流中间件
router.use(generalLimiter);

// =====================================================
// 3. API版本和健康检查
// =====================================================

// API版本信息
router.get('/', (req, res) => {
  res.success({
    name: 'Test-Web Platform API',
    version: '1.0.0',
    description: '本地化优先的测试工具平台API',
    documentation: '/api/v1/docs',
    endpoints: {
      auth: '/api/v1/auth',
      tests: '/api/v1/tests',
      users: '/api/v1/users',
      system: '/api/v1/system'
    },
    features: [
      '本地化SEO分析引擎',
      '本地化性能测试引擎',
      '本地化安全扫描引擎',
      '本地化API测试引擎',
      '本地化兼容性测试引擎',
      '本地化可访问性测试引擎',
      '本地化压力测试引擎'
    ],
    timestamp: new Date().toISOString()
  });
});

// 健康检查端点
router.get('/health', async (req, res) => {
  try {
    const { healthCheck } = require('../../config/database');
    const dbHealth = await healthCheck();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbHealth,
      engines: {
        seo: 'healthy',
        performance: 'healthy',
        security: 'healthy',
        api: 'healthy',
        compatibility: 'healthy',
        accessibility: 'healthy',
        stress: 'healthy'
      }
    };
    
    // 如果数据库不健康，整体状态为不健康
    if (dbHealth.status !== 'healthy') {
      health.status = 'unhealthy';
    }
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 系统指标端点（需要认证）
router.get('/metrics', authMiddleware, async (req, res) => {
  try {
    const { getStats } = require('../../config/database');
    const stats = await getStats();
    
    res.success({
      database: stats,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.version,
        platform: process.platform
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.error('METRICS_ERROR', '获取系统指标失败', error.message);
  }
});

// =====================================================
// 4. 路由注册
// =====================================================

// 认证路由（应用认证限流）
router.use('/auth', authLimiter, authRoutes);

// 测试路由（应用测试限流）
router.use('/tests', testLimiter, testRoutes);

// 用户路由（需要认证）
router.use('/users', authMiddleware, userRoutes);

// 系统路由（需要认证）
router.use('/system', authMiddleware, systemRoutes);

// =====================================================
// 5. 错误处理
// =====================================================

// 404处理
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `API端点 ${req.method} ${req.originalUrl} 不存在`,
      details: {
        method: req.method,
        path: req.originalUrl,
        availableEndpoints: [
          'GET /api/v1/',
          'GET /api/v1/health',
          'POST /api/v1/auth/login',
          'POST /api/v1/auth/register',
          'GET /api/v1/tests',
          'POST /api/v1/tests/{type}/start',
          'GET /api/v1/users/profile',
          'GET /api/v1/system/config'
        ]
      }
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

// 全局错误处理
router.use(errorHandler);

module.exports = router;
