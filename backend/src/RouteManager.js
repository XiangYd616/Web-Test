/**
 * 统一路由管理器
 * 解决路由注册顺序问题，提供系统化的路由管理
 */

const express = require('express');
const path = require('path');

class RouteManager {
  constructor(app) {
    this.app = app;
    this.routes = new Map();
    this.registeredRoutes = new Set();
    this.routeGroups = {
      // 按优先级排序：更具体的路由优先级更高
      auth: { priority: 1, prefix: '/api/auth' },
      testSpecific: { priority: 2, prefix: '/api/test/' }, // 具体的测试路由
      test: { priority: 3, prefix: '/api/test' }, // 通用测试路由
      dataSpecific: { priority: 4, prefix: '/api/data-' }, // 具体的数据路由
      user: { priority: 5, prefix: '/api/user' },
      admin: { priority: 6, prefix: '/api/admin' },
      system: { priority: 7, prefix: '/api/system' },
      monitoring: { priority: 8, prefix: '/api/monitoring' },
      reports: { priority: 9, prefix: '/api/reports' },
      integrations: { priority: 10, prefix: '/api/integrations' },
      files: { priority: 11, prefix: '/api/files' },
      errors: { priority: 12, prefix: '/api/errors' },
      performance: { priority: 13, prefix: '/api/performance' },
      general: { priority: 99, prefix: '/api' } // 最低优先级
    };
  }

  /**
   * 注册路由
   * @param {string} path - 路由路径
   * @param {Object} router - 路由处理器
   * @param {Object} options - 选项
   */
  registerRoute(path, router, options = {}) {
    const {
      priority = this.calculatePriority(path),
      group = this.determineGroup(path),
      description = '',
      middleware = []
    } = options;

    if (this.registeredRoutes.has(path)) {
      console.warn(`⚠️ 路由 ${path} 已经注册，跳过重复注册`);
      return;
    }

    this.routes.set(path, {
      path,
      router,
      priority,
      group,
      description,
      middleware,
      registeredAt: new Date()
    });

    console.log(`📝 注册路由: ${path} (优先级: ${priority}, 组: ${group})`);
  }

  /**
   * 计算路由优先级
   * @param {string} path - 路由路径
   * @returns {number} 优先级（数字越小优先级越高）
   */
  calculatePriority(path) {
    // 路径越具体，优先级越高
    const segments = path.split('/').filter(s => s);
    const specificity = segments.length;

    // 检查是否包含参数
    const hasParams = path.includes(':') || path.includes('*');

    // 具体路径优先级更高
    let priority = 100 - specificity * 10;

    // 有参数的路由优先级降低
    if (hasParams) {
      priority += 50;
    }

    return Math.max(1, priority);
  }

  /**
   * 确定路由组
   * @param {string} path - 路由路径
   * @returns {string} 路由组
   */
  determineGroup(path) {
    for (const [groupName, config] of Object.entries(this.routeGroups)) {
      if (path.startsWith(config.prefix)) {
        return groupName;
      }
    }
    return 'general';
  }

  /**
   * 应用所有路由到Express应用
   */
  applyRoutes() {
    console.log('🚀 开始应用路由...');

    // 按优先级排序路由
    const sortedRoutes = Array.from(this.routes.values())
      .sort((a, b) => a.priority - b.priority);

    // 应用路由
    for (const route of sortedRoutes) {
      try {
        // 应用中间件
        if (route.middleware.length > 0) {
          this.app.use(route.path, ...route.middleware);
        }

        // 应用路由
        this.app.use(route.path, route.router);
        this.registeredRoutes.add(route.path);

        console.log(`✅ 应用路由: ${route.path} (优先级: ${route.priority})`);
      } catch (error) {
        console.error(`❌ 应用路由失败: ${route.path}`, error);
      }
    }

    console.log(`🎉 路由应用完成，共注册 ${this.registeredRoutes.size} 个路由`);
    this.logRoutesSummary();
  }

  /**
   * 记录路由摘要
   */
  logRoutesSummary() {
    console.log('\n📊 路由注册摘要:');
    console.log('='.repeat(50));

    const groupedRoutes = {};
    for (const route of this.routes.values()) {
      if (!groupedRoutes[route.group]) {
        groupedRoutes[route.group] = [];
      }
      groupedRoutes[route.group].push(route);
    }

    for (const [group, routes] of Object.entries(groupedRoutes)) {
      console.log(`\n${group.toUpperCase()} (${routes.length} 个路由):`);
      routes
        .sort((a, b) => a.priority - b.priority)
        .forEach(route => {
          console.log(`  ${route.path} (优先级: ${route.priority})`);
        });
    }
    console.log('='.repeat(50));
  }

  /**
   * 检查路由冲突
   */
  checkRouteConflicts() {
    const conflicts = [];
    const routes = Array.from(this.routes.values());

    for (let i = 0; i < routes.length; i++) {
      for (let j = i + 1; j < routes.length; j++) {
        const route1 = routes[i];
        const route2 = routes[j];

        if (this.isRouteConflict(route1.path, route2.path)) {
          conflicts.push({
            route1: route1.path,
            route2: route2.path,
            priority1: route1.priority,
            priority2: route2.priority
          });
        }
      }
    }

    if (conflicts.length > 0) {
      console.warn('⚠️ 发现路由冲突:');
      conflicts.forEach(conflict => {
        console.warn(`  ${conflict.route1} vs ${conflict.route2}`);
      });
    }

    return conflicts;
  }

  /**
   * 检查两个路由是否冲突
   * @param {string} path1 - 路由1
   * @param {string} path2 - 路由2
   * @returns {boolean} 是否冲突
   */
  isRouteConflict(path1, path2) {
    // 简单的冲突检测：一个路径是另一个的前缀
    return path1.startsWith(path2) || path2.startsWith(path1);
  }

  /**
   * 获取路由状态
   */
  getRouteStatus() {
    return {
      totalRoutes: this.routes.size,
      registeredRoutes: this.registeredRoutes.size,
      routeGroups: Object.keys(this.routeGroups),
      conflicts: this.checkRouteConflicts()
    };
  }

  /**
   * 预定义的路由注册方法
   */
  registerStandardRoutes() {
    try {
      // 认证路由 - 最高优先级
      this.registerRoute('/api/auth', require('../routes/auth.js'), {
        group: 'auth',
        description: '用户认证相关API'
      });

      // 具体的测试路由 - 必须在通用测试路由之前
      this.registerRoute('/api/test/history', require('../routes/testHistory.js'), {
        group: 'testSpecific',
        description: '测试历史记录API'
      });

      // 通用测试路由
      this.registerRoute('/api/test', require('../routes/test.js'), {
        group: 'test',
        description: '通用测试API'
      });

      // SEO测试路由
      this.registerRoute('/api/seo', require('../routes/seo.js'), {
        group: 'testSpecific',
        description: 'SEO测试API'
      });

      // 数据管理相关路由
      this.registerRoute('/api/data-management', require('../routes/dataManagement.js'), {
        group: 'dataSpecific',
        description: '数据管理API'
      });

      this.registerRoute('/api/data-export', require('../routes/dataExport.js').router, {
        group: 'dataSpecific',
        description: '数据导出API'
      });

      this.registerRoute('/api/data-import', require('../routes/dataImport.js').router, {
        group: 'dataSpecific',
        description: '数据导入API'
      });

      // 用户相关路由
      this.registerRoute('/api/user', require('../routes/user.js'), {
        group: 'user',
        description: '用户管理API'
      });

      // 管理员路由
      this.registerRoute('/api/admin', require('../routes/admin.js'), {
        group: 'admin',
        description: '管理员API'
      });

      // 系统相关路由
      this.registerRoute('/api/system', require('../routes/system.js'), {
        group: 'system',
        description: '系统管理API'
      });

      this.registerRoute('/api/monitoring', require('../routes/monitoring.js'), {
        group: 'monitoring',
        description: '监控API'
      });

      this.registerRoute('/api/reports', require('../routes/reports.js'), {
        group: 'reports',
        description: '报告API'
      });

      this.registerRoute('/api/integrations', require('../routes/integrations.js'), {
        group: 'integrations',
        description: '集成API'
      });

      this.registerRoute('/api/performance', require('../routes/performance.js'), {
        group: 'performance',
        description: '性能API'
      });

      this.registerRoute('/api/files', require('../routes/files.js'), {
        group: 'files',
        description: '文件管理API'
      });

      this.registerRoute('/api/errors', require('../routes/errors.js'), {
        group: 'errors',
        description: '错误处理API'
      });

      this.registerRoute('/api/backup', require('../routes/backup.js').router, {
        group: 'system',
        description: '备份API'
      });

      this.registerRoute('/api/alerts', require('../routes/alerts.js'), {
        group: 'monitoring',
        description: '告警API'
      });

      this.registerRoute('/api/analytics', require('../routes/analytics.js'), {
        group: 'reports',
        description: '高级分析API'
      });

      this.registerRoute('/api/batch', require('../routes/batch.js'), {
        group: 'system',
        description: '批量操作API'
      });

      this.registerRoute('/api/security', require('../routes/security.js'), {
        group: 'testSpecific',
        description: '高级安全测试API'
      });

      this.registerRoute('/api/data', require('../routes/data.js'), {
        group: 'core',
        description: '数据管理API'
      });

      // 开发环境专用路由
      if (process.env.NODE_ENV === 'development') {
        this.registerRoute('/api/example', require('../routes/apiExample.js'), {
          group: 'general',
          description: 'API示例（仅开发环境）'
        });
      }

      console.log('✅ 标准路由注册完成');
    } catch (error) {
      console.error('❌ 标准路由注册失败:', error);
      throw error;
    }
  }
}

module.exports = RouteManager;
