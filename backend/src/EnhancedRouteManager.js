/**
 * 增强的API路由管理器
 * 提供路由冲突检测、版本管理、自动文档生成、性能监控等企业级功能
 */

const express = require('express');
const { ServiceError, ErrorTypes } = require('../utils/ErrorHandler');
const ApiResponse = require('../utils/ApiResponse');

/**
 * 路由版本管理器
 */
class RouteVersionManager {
  constructor() {
    this.versions = new Map();
    this.currentVersion = 'v1';
    this.deprecatedVersions = new Set();
  }

  /**
   * 注册API版本
   */
  registerVersion(version, config = {}) {
    this.versions.set(version, {
      version,
      releaseDate: config.releaseDate || new Date().toISOString(),
      description: config.description || '',
      deprecated: config.deprecated || false,
      supportUntil: config.supportUntil,
      routes: new Map(),
      ...config
    });

    if (config.deprecated) {
      this.deprecatedVersions.add(version);
    }

    console.log(`📝 Registered API version: ${version}`);
  }

  /**
   * 添加版本化路由
   */
  addVersionedRoute(version, path, router, metadata = {}) {
    if (!this.versions.has(version)) {
      this.registerVersion(version);
    }

    const versionInfo = this.versions.get(version);
    versionInfo.routes.set(path, {
      path,
      router,
      metadata,
      registeredAt: new Date()
    });
  }

  /**
   * 获取版本信息
   */
  getVersionInfo(version) {
    return this.versions.get(version);
  }

  /**
   * 获取所有版本
   */
  getAllVersions() {
    return Array.from(this.versions.values());
  }

  /**
   * 检查版本是否已弃用
   */
  isDeprecated(version) {
    return this.deprecatedVersions.has(version);
  }
}

/**
 * 路由冲突检测器
 */
class RouteConflictDetector {
  constructor() {
    this.routes = new Map();
    this.conflicts = [];
  }

  /**
   * 添加路由进行检测
   */
  addRoute(method, path, metadata = {}) {
    const routeKey = `${method.toUpperCase()} ${path}`;

    if (this.routes.has(routeKey)) {
      this.conflicts.push({
        type: 'duplicate',
        route: routeKey,
        existing: this.routes.get(routeKey),
        new: metadata
      });
    }

    this.routes.set(routeKey, {
      method: method.toUpperCase(),
      path,
      ...metadata
    });

    // 检查路径冲突
    this.checkPathConflicts(method, path, metadata);
  }

  /**
   * 检查路径冲突
   */
  checkPathConflicts(method, path, metadata) {
    const methodRoutes = Array.from(this.routes.entries())
      .filter(([key]) => key.startsWith(method.toUpperCase()));

    for (const [existingKey, existingRoute] of methodRoutes) {
      if (existingRoute.path !== path && this.isPathConflict(path, existingRoute.path)) {
        this.conflicts.push({
          type: 'path_conflict',
          route1: `${method.toUpperCase()} ${path}`,
          route2: existingKey,
          reason: 'Path patterns may conflict'
        });
      }
    }
  }

  /**
   * 检查两个路径是否冲突
   */
  isPathConflict(path1, path2) {
    // 将路径转换为正则表达式模式
    const pattern1 = this.pathToRegex(path1);
    const pattern2 = this.pathToRegex(path2);

    // 检查是否有重叠
    const testPaths = [
      '/api/test/123',
      '/api/test/performance',
      '/api/test/security/scan',
      '/api/data/export',
      '/api/data/123'
    ];

    let conflicts = 0;
    for (const testPath of testPaths) {
      if (pattern1.test(testPath) && pattern2.test(testPath)) {
        conflicts++;
      }
    }

    return conflicts > 0;
  }

  /**
   * 将路径转换为正则表达式
   */
  pathToRegex(path) {
    // 简化的路径转正则表达式
    let pattern = path
      .replace(/:[^/]+/g, '[^/]+')  // :id -> [^/]+
      .replace(/\*/g, '.*')         // * -> .*
      .replace(/\//g, '\\/');       // / -> \/

    return new RegExp(`^${pattern}$`);
  }

  /**
   * 获取所有冲突
   */
  getConflicts() {
    return this.conflicts;
  }

  /**
   * 清除冲突记录
   */
  clearConflicts() {
    this.conflicts = [];
  }
}

/**
 * 路由文档生成器
 */
class RouteDocumentationGenerator {
  constructor() {
    this.routes = [];
  }

  /**
   * 添加路由文档
   */
  addRoute(method, path, metadata = {}) {
    this.routes.push({
      method: method.toUpperCase(),
      path,
      description: metadata.description || '',
      parameters: metadata.parameters || [],
      responses: metadata.responses || {},
      examples: metadata.examples || {},
      tags: metadata.tags || [],
      deprecated: metadata.deprecated || false,
      version: metadata.version || 'v1'
    });
  }

  /**
   * 生成OpenAPI文档
   */
  generateOpenAPIDoc() {
    const doc = {
      openapi: '3.0.0',
      info: {
        title: 'Test-Web Platform API',
        version: '1.0.0',
        description: '网站测试工具平台API文档',
        contact: {
          name: 'API Support',
          email: 'support@test-web.com'
        }
      },
      servers: [
        {
          url: '/api/v1',
          description: 'API v1'
        }
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    };

    // 按路径分组路由
    const pathGroups = this.routes.reduce((groups, route) => {
      if (!groups[route.path]) {
        groups[route.path] = {};
      }

      groups[route.path][route.method.toLowerCase()] = {
        summary: route.description,
        tags: route.tags,
        deprecated: route.deprecated,
        parameters: route.parameters.map(param => ({
          name: param.name,
          in: param.in || 'query',
          required: param.required || false,
          schema: { type: param.type || 'string' },
          description: param.description || ''
        })),
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'object' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Bad Request'
          },
          '401': {
            description: 'Unauthorized'
          },
          '500': {
            description: 'Internal Server Error'
          }
        }
      };

      return groups;
    }, {});

    doc.paths = pathGroups;
    return doc;
  }

  /**
   * 生成Markdown文档
   */
  generateMarkdownDoc() {
    let markdown = '# API Documentation\n\n';

    // 按标签分组
    const tagGroups = this.routes.reduce((groups, route) => {
      const tag = route.tags[0] || 'General';
      if (!groups[tag]) {
        groups[tag] = [];
      }
      groups[tag].push(route);
      return groups;
    }, {});

    for (const [tag, routes] of Object.entries(tagGroups)) {
      markdown += `## ${tag}\n\n`;

      for (const route of routes) {
        markdown += `### ${route.method} ${route.path}\n\n`;
        markdown += `${route.description}\n\n`;

        if (route.deprecated) {
          markdown += '> ⚠️ **Deprecated**: This endpoint is deprecated and will be removed in a future version.\n\n';
        }

        if (route.parameters.length > 0) {
          markdown += '**Parameters:**\n\n';
          for (const param of route.parameters) {
            markdown += `- \`${param.name}\` (${param.type || 'string'}): ${param.description || ''}\n`;
          }
          markdown += '\n';
        }

        markdown += '---\n\n';
      }
    }

    return markdown;
  }
}

/**
 * 增强的路由管理器
 */
class EnhancedRouteManager {
  constructor(app) {
    this.app = app;
    this.routes = new Map();
    this.versionManager = new RouteVersionManager();
    this.conflictDetector = new RouteConflictDetector();
    this.docGenerator = new RouteDocumentationGenerator();
    this.middleware = [];
    this.isInitialized = false;

    // 性能监控
    this.routeMetrics = new Map();

    // 配置
    this.config = {
      enableVersioning: true,
      enableConflictDetection: true,
      enableDocGeneration: true,
      enableMetrics: true,
      defaultVersion: 'v1'
    };
  }

  /**
   * 初始化路由管理器
   */
  async initialize() {
    if (this.isInitialized) return;

    // 注册默认版本
    this.versionManager.registerVersion('v1', {
      description: 'Initial API version',
      releaseDate: '2024-08-15'
    });

    // 设置全局中间件
    this.setupGlobalMiddleware();

    // 设置版本化路由
    this.setupVersionedRoutes();

    this.isInitialized = true;
    console.log('✅ Enhanced Route Manager initialized');
  }

  /**
   * 设置全局中间件
   */
  setupGlobalMiddleware() {
    // API响应助手中间件
    this.app.use('/api', ApiResponse.middleware());

    // 版本检测中间件
    this.app.use('/api', (req, res, next) => {
      const version = this.extractVersion(req.path);
      if (version && this.versionManager.isDeprecated(version)) {
        res.set('X-API-Deprecated', 'true');
        res.set('X-API-Sunset', this.versionManager.getVersionInfo(version)?.supportUntil || '');
      }
      next();
    });

    // 路由指标收集中间件
    if (this.config.enableMetrics) {
      this.app.use('/api', (req, res, next) => {
        const startTime = Date.now();
        const routeKey = `${req.method} ${req.route?.path || req.path}`;

        res.on('finish', () => {
          const duration = Date.now() - startTime;
          this.recordMetric(routeKey, {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            timestamp: new Date()
          });
        });

        next();
      });
    }
  }

  /**
   * 设置版本化路由
   */
  setupVersionedRoutes() {
    if (!this.config.enableVersioning) return;

    // 创建版本化路由器
    const v1Router = express.Router();

    // 注册v1路由
    this.registerV1Routes(v1Router);

    // 应用版本化路由
    this.app.use('/api/v1', v1Router);

    // 默认版本重定向
    this.app.use('/api', (req, res, next) => {
      if (!req.path.startsWith('/v')) {
        req.url = `/v1${req.url}`;
      }
      next();
    });
  }

  /**
   * 注册v1路由
   */
  registerV1Routes(router) {
    // 这里注册所有v1版本的路由
    const routeConfigs = [
      { path: '/auth', module: '../routes/auth.js', description: '用户认证API' },
      { path: '/test', module: '../routes/test.js', description: '测试API' },
      { path: '/data', module: '../routes/data.js', description: '数据管理API' },
      { path: '/reports', module: '../routes/reports.js', description: '报告API' },
      { path: '/monitoring', module: '../routes/monitoring.js', description: '监控API' },
      { path: '/system', module: '../routes/system.js', description: '系统API' }
    ];

    for (const config of routeConfigs) {
      try {
        const routeModule = require(config.module);
        router.use(config.path, routeModule);

        // 添加到版本管理器
        this.versionManager.addVersionedRoute('v1', config.path, routeModule, {
          description: config.description
        });

        // 添加到文档生成器
        this.docGenerator.addRoute('*', `/api/v1${config.path}`, {
          description: config.description,
          version: 'v1',
          tags: [this.getTagFromPath(config.path)]
        });

        console.log(`📝 Registered v1 route: ${config.path}`);
      } catch (error) {
        console.error(`❌ Failed to register route ${config.path}:`, error.message);
      }
    }
  }

  /**
   * 注册路由
   */
  registerRoute(method, path, handler, metadata = {}) {
    const routeKey = `${method.toUpperCase()} ${path}`;

    // 冲突检测
    if (this.config.enableConflictDetection) {
      this.conflictDetector.addRoute(method, path, metadata);
    }

    // 添加到文档生成器
    if (this.config.enableDocGeneration) {
      this.docGenerator.addRoute(method, path, metadata);
    }

    // 存储路由信息
    this.routes.set(routeKey, {
      method: method.toUpperCase(),
      path,
      handler,
      metadata,
      registeredAt: new Date()
    });

    console.log(`📝 Registered route: ${routeKey}`);
  }

  /**
   * 检查路由冲突
   */
  checkConflicts() {
    if (!this.config.enableConflictDetection) return [];

    const conflicts = this.conflictDetector.getConflicts();

    if (conflicts.length > 0) {
      console.warn('⚠️ Route conflicts detected:');
      conflicts.forEach(conflict => {
        console.warn(`  ${conflict.type}: ${conflict.route1 || conflict.route} vs ${conflict.route2 || 'existing'}`);
      });
    }

    return conflicts;
  }

  /**
   * 生成API文档
   */
  generateDocumentation(format = 'openapi') {
    if (!this.config.enableDocGeneration) {
      throw new ServiceError('Documentation generation is disabled', ErrorTypes.INTERNAL_ERROR);
    }

    switch (format) {
      case 'openapi':
        return this.docGenerator.generateOpenAPIDoc();
      case 'markdown':
        return this.docGenerator.generateMarkdownDoc();
      default:
        throw new ServiceError(`Unsupported documentation format: ${format}`, ErrorTypes.VALIDATION_ERROR);
    }
  }

  /**
   * 获取路由指标
   */
  getRouteMetrics() {
    if (!this.config.enableMetrics) return {};

    const metrics = {};
    for (const [route, data] of this.routeMetrics) {
      metrics[route] = {
        totalRequests: data.length,
        averageResponseTime: data.reduce((sum, req) => sum + req.duration, 0) / data.length,
        errorRate: data.filter(req => req.statusCode >= 400).length / data.length,
        lastRequest: data[data.length - 1]?.timestamp
      };
    }

    return metrics;
  }

  /**
   * 记录路由指标
   */
  recordMetric(routeKey, metric) {
    if (!this.routeMetrics.has(routeKey)) {
      this.routeMetrics.set(routeKey, []);
    }

    const metrics = this.routeMetrics.get(routeKey);
    metrics.push(metric);

    // 保持最近1000条记录
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }
  }

  /**
   * 获取管理器状态
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      totalRoutes: this.routes.size,
      versions: this.versionManager.getAllVersions().map(v => ({
        version: v.version,
        deprecated: v.deprecated,
        routeCount: v.routes.size
      })),
      conflicts: this.checkConflicts().length,
      config: this.config,
      metrics: this.config.enableMetrics ? Object.keys(this.routeMetrics).length : 0
    };
  }

  /**
   * 设置文档路由
   */
  setupDocumentationRoutes() {
    // OpenAPI JSON文档
    this.app.get('/api/docs/openapi.json', (req, res) => {
      try {
        const doc = this.generateDocumentation('openapi');
        res.json(doc);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to generate OpenAPI documentation',
          message: error.message
        });
      }
    });

    // Markdown文档
    this.app.get('/api/docs/markdown', (req, res) => {
      try {
        const doc = this.generateDocumentation('markdown');
        res.set('Content-Type', 'text/markdown');
        res.send(doc);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to generate Markdown documentation',
          message: error.message
        });
      }
    });

    // 交互式文档界面
    this.app.get('/api/docs', (req, res) => {
      const html = this.generateSwaggerUI();
      res.set('Content-Type', 'text/html');
      res.send(html);
    });

    // 路由状态和指标
    this.app.get('/api/routes/status', (req, res) => {
      res.json({
        success: true,
        data: this.getStatus(),
        metrics: this.getRouteMetrics()
      });
    });

    // 路由冲突检查
    this.app.get('/api/routes/conflicts', (req, res) => {
      const conflicts = this.checkConflicts();
      res.json({
        success: true,
        data: {
          hasConflicts: conflicts.length > 0,
          conflicts,
          totalConflicts: conflicts.length
        }
      });
    });
  }

  /**
   * 生成Swagger UI HTML
   */
  generateSwaggerUI() {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test-Web Platform API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '/api/docs/openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                validatorUrl: null,
                tryItOutEnabled: true,
                supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
                onComplete: function() {
                    console.log('Swagger UI loaded');
                },
                onFailure: function(data) {
                    console.error('Failed to load Swagger UI', data);
                }
            });
        };
    </script>
</body>
</html>`;
  }

  /**
   * 启用路由热重载（开发环境）
   */
  enableHotReload() {
    if (process.env.NODE_ENV !== 'development') return;

    const chokidar = require('chokidar');
    const path = require('path');

    const routesPath = path.join(__dirname, '../routes');
    const watcher = chokidar.watch(routesPath, {
      ignored: /node_modules/,
      persistent: true
    });

    watcher.on('change', (filePath) => {
      console.log(`🔄 Route file changed: ${filePath}`);

      // 清除require缓存
      delete require.cache[require.resolve(filePath)];

      // 重新加载路由
      this.reloadRoute(filePath);
    });

    console.log('🔥 Hot reload enabled for routes');
  }

  /**
   * 重新加载路由
   */
  reloadRoute(filePath) {
    try {
      // 这里可以实现更复杂的热重载逻辑
      console.log(`♻️ Reloading route: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to reload route ${filePath}:`, error);
    }
  }

  /**
   * 验证路由配置
   */
  validateRoutes() {
    const errors = [];
    const warnings = [];

    // 检查重复路由
    const routePaths = new Set();
    for (const [routeKey, route] of this.routes) {
      if (routePaths.has(route.path)) {
        errors.push(`Duplicate route path: ${route.path}`);
      }
      routePaths.add(route.path);
    }

    // 检查路由命名规范
    for (const [routeKey, route] of this.routes) {
      if (!route.path.startsWith('/api/')) {
        warnings.push(`Route ${route.path} does not follow /api/ convention`);
      }

      if (route.path.includes('//')) {
        errors.push(`Route ${route.path} contains double slashes`);
      }
    }

    // 检查版本一致性
    const versions = new Set();
    for (const version of this.versionManager.getAllVersions()) {
      versions.add(version.version);
    }

    if (versions.size === 0) {
      warnings.push('No API versions registered');
    }

    return { errors, warnings };
  }

  /**
   * 辅助方法
   */
  extractVersion(path) {
    const match = path.match(/^\/api\/(v\d+)/);
    return match ? match[1] : null;
  }

  getTagFromPath(path) {
    const segments = path.split('/').filter(s => s);
    return segments[0] || 'general';
  }
}

module.exports = {
  EnhancedRouteManager,
  RouteVersionManager,
  RouteConflictDetector,
  RouteDocumentationGenerator
};
