/**
 * API文档服务
 * 提供API文档生成、管理、更新功能
 */

const fs = require('fs');
const path = require('path');
const Logger = require('../../middleware/logger.js');

class ApiDocumentationService {
  constructor() {
    this.logger = Logger;
    this.apiRoutes = new Map();
    this.documentation = {
      info: {
        title: 'Test Web API',
        version: '1.0.0',
        description: '网站测试工具API文档',
        contact: {
          name: 'API Support',
          email: 'support@testweb.com'
        }
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: '开发环境'
        },
        {
          url: 'https://api.testweb.com',
          description: '生产环境'
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
  }

  /**
   * 注册API路由
   */
  registerRoute(method, path, options = {}) {
    try {
      const routeKey = `${method.toUpperCase()} ${path}`;
      
      const routeInfo = {
        method: method.toUpperCase(),
        path,
        summary: options.summary || '',
        description: options.description || '',
        tags: options.tags || [],
        parameters: options.parameters || [],
        requestBody: options.requestBody || null,
        responses: options.responses || {
          '200': {
            description: '成功',
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
          }
        },
        security: options.security || [],
        deprecated: options.deprecated || false
      };

      this.apiRoutes.set(routeKey, routeInfo);
      this.updateDocumentation();

      this.logger.info(`API路由已注册: ${routeKey}`);
    } catch (error) {
      this.logger.error('注册API路由失败:', error);
    }
  }

  /**
   * 更新文档
   */
  updateDocumentation() {
    try {
      // 清空现有路径
      this.documentation.paths = {};

      // 重新构建路径文档
      for (const [routeKey, routeInfo] of this.apiRoutes) {
        const { method, path: routePath, ...pathInfo } = routeInfo;
        
        if (!this.documentation.paths[routePath]) {
          this.documentation.paths[routePath] = {};
        }

        this.documentation.paths[routePath][method.toLowerCase()] = pathInfo;
      }

      this.logger.info('API文档已更新');
    } catch (error) {
      this.logger.error('更新API文档失败:', error);
    }
  }

  /**
   * 获取完整文档
   */
  getDocumentation() {
    return {
      success: true,
      data: {
        openapi: '3.0.0',
        ...this.documentation
      }
    };
  }

  /**
   * 获取路由列表
   */
  getRoutes() {
    try {
      const routes = Array.from(this.apiRoutes.entries()).map(([key, info]) => ({
        key,
        method: info.method,
        path: info.path,
        summary: info.summary,
        tags: info.tags,
        deprecated: info.deprecated
      }));

      return {
        success: true,
        data: routes
      };
    } catch (error) {
      this.logger.error('获取路由列表失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取特定路由文档
   */
  getRouteDocumentation(method, path) {
    try {
      const routeKey = `${method.toUpperCase()} ${path}`;
      const routeInfo = this.apiRoutes.get(routeKey);

      if (!routeInfo) {
        return {
          success: false,
          error: '路由不存在'
        };
      }

      return {
        success: true,
        data: routeInfo
      };
    } catch (error) {
      this.logger.error('获取路由文档失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 生成Swagger JSON
   */
  generateSwaggerJson() {
    try {
      const swaggerDoc = {
        openapi: '3.0.0',
        ...this.documentation
      };

      return {
        success: true,
        data: swaggerDoc
      };
    } catch (error) {
      this.logger.error('生成Swagger JSON失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 导出文档到文件
   */
  async exportDocumentation(format = 'json', outputPath = null) {
    try {
      const doc = this.generateSwaggerJson();
      if (!doc.success) {
        throw new Error(doc.error);
      }

      let content;
      let filename;

      switch (format.toLowerCase()) {
        case 'json':
          content = JSON.stringify(doc.data, null, 2);
          filename = 'api-documentation.json';
          break;
        case 'yaml':
          // 简化的YAML输出
          content = this.convertToYaml(doc.data);
          filename = 'api-documentation.yaml';
          break;
        default:
          throw new Error('不支持的格式');
      }

      const filePath = outputPath || path.join(process.cwd(), 'docs', filename);
      
      // 确保目录存在
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, content, 'utf8');

      this.logger.info(`API文档已导出到: ${filePath}`);

      return {
        success: true,
        data: {
          filePath,
          format,
          size: content.length
        }
      };
    } catch (error) {
      this.logger.error('导出API文档失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 简化的YAML转换
   */
  convertToYaml(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        yaml += `${spaces}${key}: null/n`;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        yaml += `${spaces}${key}:/n`;
        yaml += this.convertToYaml(value, indent + 1);
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:/n`;
        value.forEach(item => {
          if (typeof item === 'object') {
            yaml += `${spaces}  -/n`;
            yaml += this.convertToYaml(item, indent + 2);
          } else {
            yaml += `${spaces}  - ${item}/n`;
          }
        });
      } else {
        yaml += `${spaces}${key}: ${JSON.stringify(value)}/n`;
      }
    }

    return yaml;
  }

  /**
   * 添加数据模型
   */
  addSchema(name, schema) {
    try {
      this.documentation.components.schemas[name] = schema;
      this.logger.info(`数据模型已添加: ${name}`);

      return {
        success: true,
        message: '数据模型添加成功'
      };
    } catch (error) {
      this.logger.error('添加数据模型失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    try {
      const routes = Array.from(this.apiRoutes.values());
      const methods = {};
      const tags = {};
      let deprecatedCount = 0;

      routes.forEach(route => {
        // 统计HTTP方法
        methods[route.method] = (methods[route.method] || 0) + 1;

        // 统计标签
        route.tags.forEach(tag => {
          tags[tag] = (tags[tag] || 0) + 1;
        });

        // 统计废弃的API
        if (route.deprecated) {
          deprecatedCount++;
        }
      });

      return {
        success: true,
        data: {
          totalRoutes: routes.length,
          methods,
          tags,
          deprecatedCount,
          schemas: Object.keys(this.documentation.components.schemas).length
        }
      };
    } catch (error) {
      this.logger.error('获取统计信息失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 验证文档完整性
   */
  validateDocumentation() {
    try {
      const issues = [];
      const routes = Array.from(this.apiRoutes.values());

      routes.forEach(route => {
        // 检查必要字段
        if (!route.summary) {
          issues.push(`路由 ${route.method} ${route.path} 缺少摘要`);
        }

        if (!route.description) {
          issues.push(`路由 ${route.method} ${route.path} 缺少描述`);
        }

        if (route.tags.length === 0) {
          issues.push(`路由 ${route.method} ${route.path} 缺少标签`);
        }

        // 检查响应定义
        if (!route.responses || Object.keys(route.responses).length === 0) {
          issues.push(`路由 ${route.method} ${route.path} 缺少响应定义`);
        }
      });

      return {
        success: true,
        data: {
          isValid: issues.length === 0,
          issues,
          totalRoutes: routes.length,
          validRoutes: routes.length - issues.length
        }
      };
    } catch (error) {
      this.logger.error('验证文档完整性失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 初始化默认路由
   */
  initializeDefaultRoutes() {
    try {
      // 测试相关API
      this.registerRoute('POST', '/api/test/performance', {
        summary: '执行性能测试',
        description: '对指定URL执行性能测试',
        tags: ['测试'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  url: { type: 'string', description: '测试URL' },
                  config: { type: 'object', description: '测试配置' }
                },
                required: ['url']
              }
            }
          }
        }
      });

      this.registerRoute('GET', '/api/test/history', {
        summary: '获取测试历史',
        description: '获取用户的测试历史记录',
        tags: ['测试', '历史'],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20 }
          }
        ]
      });

      // 用户相关API
      this.registerRoute('POST', '/api/auth/login', {
        summary: '用户登录',
        description: '用户登录认证',
        tags: ['认证'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' }
                },
                required: ['username', 'password']
              }
            }
          }
        }
      });

      this.logger.info('默认API路由初始化完成');
    } catch (error) {
      this.logger.error('初始化默认路由失败:', error);
    }
  }
}

module.exports = new ApiDocumentationService();
