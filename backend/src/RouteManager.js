/**
 * 统一路由管理器 - 修复API路由架构问题
 * 整合RouteManager和RouteManager的功能，提供统一的路由管理
 */

const express = require('express');
const path = require('path');

// 安全导入依赖，如果不存在则使用默认实现
let ServiceError, ErrorTypes, ApiResponse;

try {
  const errorHandler = require('../utils/errorHandler');
  ServiceError = errorHandler.ServiceError;
  ErrorTypes = errorHandler.ErrorTypes;
} catch (error) {
  // 默认错误处理实现
  ServiceError = class extends Error {
    constructor(message, type = 'INTERNAL_ERROR', details = null) {
      super(message);
      this.type = type;
      this.details = details;
    }
  };
  ErrorTypes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
  };
}

try {
  ApiResponse = require('../utils/ApiResponse');
} catch (error) {
  // 默认API响应实现
  ApiResponse = {
    middleware: () => (req, res, next) => next()
  };
}

/**
 * 统一路由管理器
 */
class RouteManager {
  constructor(app) {
    this.app = app;
    this.routes = new Map();
    this.registeredRoutes = new Set();
    this.versions = new Map();
    this.routeMetrics = new Map();
    this.isInitialized = false;

    // 路由分组配置
    this.routeGroups = {
      auth: { priority: 1, prefix: '/api/auth', description: '认证相关API' },
      testSpecific: { priority: 2, prefix: '/api/test/', description: '具体测试API' },
      test: { priority: 3, prefix: '/api/test', description: '通用测试API' },
      dataSpecific: { priority: 4, prefix: '/api/data-', description: '具体数据API' },
      user: { priority: 5, prefix: '/api/user', description: '用户管理API' },
      admin: { priority: 6, prefix: '/api/admin', description: '管理员API' },
      system: { priority: 7, prefix: '/api/system', description: '系统管理API' },
      monitoring: { priority: 8, prefix: '/api/monitoring', description: '监控API' },
      reports: { priority: 9, prefix: '/api/reports', description: '报告API' },
      integrations: { priority: 10, prefix: '/api/integrations', description: '集成API' },
      files: { priority: 11, prefix: '/api/files', description: '文件管理API' },
      general: { priority: 99, prefix: '/api', description: '通用API' }
    };

    // 配置选项
    this.config = {
      enableVersioning: true,
      enableConflictDetection: true,
      enableDocGeneration: true,
      enableMetrics: true,
      enableErrorHandling: true,
      defaultVersion: 'v1'
    };
  }

  /**
   * 初始化路由管理器
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🚀 Initializing Unified Route Manager...');

    // 1. 设置全局中间件
    this.setupGlobalMiddleware();

    // 2. 注册API版本
    this.registerAPIVersions();

    // 3. 设置错误处理
    this.setupErrorHandling();

    // 4. 设置文档路由
    this.setupDocumentationRoutes();

    this.isInitialized = true;
    console.log('✅ Unified Route Manager initialized');
  }

  /**
   * 设置全局中间件
   */
  setupGlobalMiddleware() {
    // 注意：API响应格式化中间件已在app.js中统一设置
    // 这里不再重复设置，避免冲突

    // 版本检测中间件
    this.app.use('/api', (req, res, next) => {
      const version = this.extractVersion(req.path);
      if (version) {
        req.apiVersion = version;
        const versionInfo = this.versions.get(version);
        if (versionInfo?.deprecated) {
          res.set('X-API-Deprecated', 'true');
          res.set('X-API-Sunset', versionInfo.supportUntil || '');
        }
      }
      next();
    });

    // 性能监控中间件
    if (this.config.enableMetrics) {
      this.app.use('/api', (req, res, next) => {
        const startTime = Date.now();

        res.on('finish', () => {
          const duration = Date.now() - startTime;
          this.recordMetric(req.method, req.path, {
            statusCode: res.statusCode,
            duration,
            timestamp: new Date()
          });
        });

        next();
      });
    }

    console.log('✅ Global middleware setup complete');
  }

  /**
   * 注册API版本
   */
  registerAPIVersions() {
    // 注册v1版本
    this.versions.set('v1', {
      version: 'v1',
      description: 'Initial API version',
      releaseDate: '2024-08-15',
      deprecated: false,
      routes: new Map()
    });

    // 为未来版本预留
    this.versions.set('v2', {
      version: 'v2',
      description: 'Enhanced API version',
      releaseDate: '2024-12-01',
      deprecated: false,
      routes: new Map()
    });

    console.log('✅ API versions registered');
  }

  /**
   * 注册路由
   */
  registerRoute(path, router, options = {}) {
    const {
      priority = this.calculatePriority(path),
      group = this.determineGroup(path),
      description = '',
      middleware = [],
      version = this.config.defaultVersion
    } = options;

    // 检查重复注册
    if (this.registeredRoutes.has(path)) {
      console.warn(`⚠️ Route ${path} already registered, skipping`);
      return false;
    }

    // 冲突检测
    if (this.config.enableConflictDetection) {
      const conflicts = this.detectConflicts(path);
      if (conflicts.length > 0) {
        console.warn(`⚠️ Route conflicts detected for ${path}:`, conflicts);
      }
    }

    // 存储路由信息
    this.routes.set(path, {
      path,
      router,
      priority,
      group,
      description,
      middleware,
      version,
      registeredAt: new Date()
    });

    return true;
  }

  /**
   * 批量注册标准路由
   */
  registerStandardRoutes() {
    // 首先设置Swagger API文档
    this.setupSwaggerDocs();

    const routeConfigs = [
      // 认证路由 - 最高优先级
      {
        path: '/api/auth',
        module: '../routes/auth.js',
        description: '用户认证API',
        group: 'auth'
      },

      // 缺失API路由 - 补充前端需要的API (已禁用，避免路径冲突)
      // {
      //   path: '/api',
      //   module: '../routes/missing-apis.js',
      //   description: '缺失API端点实现 - 第一部分',
      //   group: 'general'
      // },
      // {
      //   path: '/api',
      //   module: '../routes/missing-apis-part2.js',
      //   description: '缺失API端点实现 - 第二部分',
      //   group: 'general'
      // },
      // {
      //   path: '/api',
      //   module: '../routes/missing-apis-part3.js',
      //   description: '缺失API端点实现 - 第三部分',
      //   group: 'general'
      // },
      // {
      //   path: '/api',
      //   module: '../routes/missing-apis-part4.js',
      //   description: '缺失API端点实现 - 第四部分',
      //   group: 'general'
      // },

      // 测试执行路由 - 新增
      {
        path: '/api/tests',
        module: '../routes/test.js',
        description: '测试执行API',
        group: 'testSpecific'
      },
      
      // 测试管理路由 - 新增统一测试管理系统
      {
        path: '/api/testing',
        module: '../routes/testing.js',
        description: '统一测试管理API',
        group: 'testSpecific'
      },

      // 测试引擎路由 - 统一测试引擎管理
      {
        path: '/api/test-engine',
        module: '../routes/testEngine.js',
        description: '统一测试引擎API',
        group: 'testSpecific'
      },

      // 数据管理路由 - 新增
      {
        path: '/api/data',
        module: '../routes/data.js',
        description: '数据管理API',
        group: 'dataSpecific'
      },

      // 配置管理路由 - 高优先级
      {
        path: '/api/config',
        module: '../routes/config.js',
        description: '配置管理API',
        group: 'system'
      },

      // 错误管理路由 - 高优先级
      {
        path: '/api/error-management',
        module: '../routes/errorManagement.js',
        description: '错误管理API',
        group: 'system'
      },

      // 具体测试路由 - 必须在通用测试路由之前
      {
        path: '/api/test/history',
        module: '../routes/testHistory.js',
        description: '统一测试历史API',
        group: 'testSpecific'
      },

      // 通用测试路由
      {
        path: '/api/test',
        module: '../routes/test.js',
        description: '通用测试API',
        group: 'test'
      },

      // SEO测试路由
      {
        path: '/api/seo',
        module: '../routes/seo.js',
        description: 'SEO测试API',
        group: 'testSpecific'
      },

      // 性能测试路由
      {
        path: '/api/test/performance',
        module: '../routes/performanceTestRoutes.js',
        description: '性能测试API（Lighthouse集成）',
        group: 'testSpecific'
      },

      // 引擎状态路由
      {
        path: '/api/engines',
        module: '../routes/engineStatus.js',
        description: '测试引擎状态API',
        group: 'system'
      },

      // 存储管理路由
      {
        path: '/api/storage',
        module: '../routes/storageManagement.js',
        description: '存储管理API',
        group: 'system'
      },

      // 数据管理路由



      {
        path: '/api/data',
        module: '../routes/data.js',
        description: '数据API',
        group: 'dataSpecific'
      },

      // 用户和管理路由
      {
        path: '/api/user',
        module: '../routes/user.js',
        description: '用户管理API',
        group: 'user'
      },
      {
        path: '/api/admin',
        module: '../routes/admin.js',
        description: '管理员API',
        group: 'admin'
      },

      // 系统路由
      {
        path: '/api/system',
        module: '../routes/system.js',
        description: '系统管理API',
        group: 'system'
      },
      {
        path: '/api/monitoring',
        module: '../routes/monitoring.js',
        description: '监控API',
        group: 'monitoring'
      },
      {
        path: '/api/reports',
        module: '../routes/reports.js',
        description: '报告API',
        group: 'reports'
      },
      {
        path: '/api/integrations',
        module: '../routes/integrations.js',
        description: '集成API',
        group: 'integrations'
      },
      {
        path: '/api/files',
        module: '../routes/files.js',
        description: '文件管理API',
        group: 'files'
      },

      // API映射修复路由 - 统一处理缺失的API端点
      {
        path: '/api',
        module: '../routes/api-mappings.js',
        description: 'API映射修复 - 统一处理缺失的API端点',
        group: 'general',
        priority: 50  // 给予较低优先级，确保具体路由优先
      },

      // 其他路由
      {
        path: '/api/performance',
        module: '../routes/performance.js',
        description: '性能API',
        group: 'general'
      },
      {
        path: '/api/security',
        module: '../routes/security.js',
        description: '安全测试API',
        group: 'testSpecific'
      },
      {
        path: '/api/alerts',
        module: '../routes/alerts.js',
        description: '告警API',
        group: 'monitoring'
      },
      {
        path: '/api/analytics',
        module: '../routes/analytics.js',
        description: '分析API',
        group: 'reports'
      },
      {
        path: '/api/batch',
        module: '../routes/batch.js',
        description: '批量操作API',
        group: 'system'
      }
    ];

    // 开发环境专用路由
    if (process.env.NODE_ENV === 'development') {
      routeConfigs.push({
        path: '/api/example',
        module: '../routes/apiExample.js',
        description: 'API示例（仅开发环境）',
        group: 'general'
      });

      routeConfigs.push({
        path: '/api/database-fix',
        module: '../routes/database-fix.js',
        description: '数据库修复API（仅开发环境）',
        group: 'system'
      });
    }

    let successCount = 0;
    let errorCount = 0;

    for (const config of routeConfigs) {
      try {
        const routeModule = require(config.module);
        const router = config.exportProperty ? routeModule[config.exportProperty] : routeModule;

        const success = this.registerRoute(config.path, router, {
          group: config.group,
          description: config.description,
          priority: config.priority  // 传递自定义优先级
        });

        if (success) {
          successCount++;
        }
      } catch (error) {
        console.error(`❌ Failed to register route ${config.path}:`, error.message);
        errorCount++;
      }
    }

  }

  /**
   * 应用所有路由
   */
  applyRoutes() {
    console.log('🚀 Applying routes...');

    // 按优先级排序路由
    const sortedRoutes = Array.from(this.routes.values())
      .sort((a, b) => a.priority - b.priority);

    let appliedCount = 0;

    for (const route of sortedRoutes) {
      try {
        // 应用中间件
        if (route.middleware.length > 0) {
          this.app.use(route.path, ...route.middleware);
        }

        // 应用路由
        this.app.use(route.path, route.router);
        this.registeredRoutes.add(route.path);
        appliedCount++;

        console.log(`✅ Applied route: ${route.path} (priority: ${route.priority})`);
      } catch (error) {
        console.error(`❌ Failed to apply route ${route.path}:`, error.message);
      }
    }

    this.logRoutesSummary();
  }

  /**
   * 设置错误处理
   */
  setupErrorHandling() {
    if (!this.config.enableErrorHandling) return;

    // 404处理
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'API endpoint not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });

    // 全局错误处理
    this.app.use('/api', (error, req, res, next) => {
      console.error('API Error:', error);

      const statusCode = error.statusCode || error.status || 500;
      const message = error.message || 'Internal Server Error';

      res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
        timestamp: new Date().toISOString()
      });
    });

    console.log('✅ Error handling setup complete');
  }

  /**
   * 设置文档路由
   */
  setupDocumentationRoutes() {
    // API信息端点
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Test-Web Platform API',
        version: '1.0.0',
        description: '网站测试工具平台API',
        documentation: '/api/docs',
        versions: Array.from(this.versions.keys()),
        endpoints: this.getEndpointsList(),
        timestamp: new Date().toISOString()
      });
    });

    // 路由状态端点
    this.app.get('/api/routes/status', (req, res) => {
      res.json({
        success: true,
        data: {
          totalRoutes: this.routes.size,
          registeredRoutes: this.registeredRoutes.size,
          versions: Array.from(this.versions.keys()),
          groups: Object.keys(this.routeGroups),
          metrics: this.config.enableMetrics ? this.getRouteMetrics() : null
        }
      });
    });

    console.log('✅ Documentation routes setup complete');
  }

  /**
   * 辅助方法
   */
  calculatePriority(path) {
    const segments = path.split('/').filter(s => s);
    const specificity = segments.length;
    const hasParams = path.includes(':') || path.includes('*');

    let priority = 100 - specificity * 10;
    if (hasParams) priority += 50;

    return Math.max(1, priority);
  }

  determineGroup(path) {
    for (const [groupName, config] of Object.entries(this.routeGroups)) {
      if (path.startsWith(config.prefix)) {
        return groupName;
      }
    }
    return 'general';
  }

  detectConflicts(newPath) {
    const conflicts = [];
    for (const [existingPath] of this.routes) {
      if (this.isPathConflict(newPath, existingPath)) {
        conflicts.push(existingPath);
      }
    }
    return conflicts;
  }

  isPathConflict(path1, path2) {
    return path1 !== path2 && (path1.startsWith(path2) || path2.startsWith(path1));
  }

  extractVersion(path) {
    const match = path.match(/^\/api\/(v\d+)/);
    return match ? match[1] : null;
  }

  recordMetric(method, path, data) {
    const key = `${method} ${path}`;
    if (!this.routeMetrics.has(key)) {
      this.routeMetrics.set(key, []);
    }

    const metrics = this.routeMetrics.get(key);
    metrics.push(data);

    // 保持最近100条记录
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }
  }

  getRouteMetrics() {
    const metrics = {};
    for (const [route, data] of this.routeMetrics) {
      if (data.length > 0) {
        metrics[route] = {
          totalRequests: data.length,
          averageResponseTime: data.reduce((sum, req) => sum + req.duration, 0) / data.length,
          errorRate: data.filter(req => req.statusCode >= 400).length / data.length,
          lastRequest: data[data.length - 1]?.timestamp
        };
      }
    }
    return metrics;
  }

  getEndpointsList() {
    const endpoints = {};
    for (const [path, route] of this.routes) {
      endpoints[route.group] = endpoints[route.group] || [];
      endpoints[route.group].push({
        path: route.path,
        description: route.description
      });
    }
    return endpoints;
  }

  logRoutesSummary() {
    const groupCounts = {};
    for (const route of this.routes.values()) {
      groupCounts[route.group] = (groupCounts[route.group] || 0) + 1;
    }

    for (const [group, count] of Object.entries(groupCounts)) {
    }
  }

  /**
   * 设置Swagger API文档
   */
  setupSwaggerDocs() {
    try {
      const { setupSwagger } = require('../config/swagger');
      setupSwagger(this.app);
    } catch (error) {
      console.warn('⚠️  Swagger集成失败，跳过API文档设置:', error.message);
    }
  }

  /**
   * 获取管理器状态
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      totalRoutes: this.routes.size,
      registeredRoutes: this.registeredRoutes.size,
      versions: Array.from(this.versions.keys()),
      config: this.config
    };
  }
}

module.exports = RouteManager;
