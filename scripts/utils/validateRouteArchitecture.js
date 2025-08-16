/**
 * 路由架构验证脚本
 * 验证API路由架构修复效果
 */

const fs = require('fs');
const path = require('path');

class RouteArchitectureValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.routes = new Map();
    this.routeFiles = [];
    this.duplicates = [];
    this.conflicts = [];
  }

  /**
   * 运行完整验证
   */
  async validate() {
    console.log('🔍 Starting route architecture validation...\n');

    try {
      // 1. 扫描路由文件
      await this.scanRouteFiles();
      
      // 2. 分析路由定义
      await this.analyzeRoutes();
      
      // 3. 检查路由冲突
      this.checkRouteConflicts();
      
      // 4. 验证路由管理器
      this.validateRouteManager();
      
      // 5. 检查API响应格式
      this.validateAPIResponseFormat();
      
      // 6. 验证版本管理
      this.validateVersionManagement();
      
      // 7. 生成报告
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    }
  }

  /**
   * 扫描路由文件
   */
  async scanRouteFiles() {
    const routesDir = path.join(__dirname, '../backend/routes');
    
    try {
      const files = fs.readdirSync(routesDir);
      this.routeFiles = files.filter(file => file.endsWith('.js'));
      
      console.log(`📁 Found ${this.routeFiles.length} route files`);
      
      if (this.routeFiles.length === 0) {
        this.errors.push('No route files found in backend/routes directory');
      }
      
    } catch (error) {
      this.errors.push(`Failed to scan routes directory: ${error.message}`);
    }
  }

  /**
   * 分析路由定义
   */
  async analyzeRoutes() {
    console.log('🔍 Analyzing route definitions...');
    
    for (const file of this.routeFiles) {
      try {
        const filePath = path.join(__dirname, '../backend/routes', file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 提取路由定义
        this.extractRouteDefinitions(content, file);
        
      } catch (error) {
        this.warnings.push(`Failed to analyze ${file}: ${error.message}`);
      }
    }
    
    console.log(`📊 Analyzed ${this.routes.size} route definitions`);
  }

  /**
   * 提取路由定义
   */
  extractRouteDefinitions(content, fileName) {
    // 匹配 router.method('/path', ...) 模式
    const routePattern = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = routePattern.exec(content)) !== null) {
      const [, method, path] = match;
      const routeKey = `${method.toUpperCase()} ${path}`;
      
      if (this.routes.has(routeKey)) {
        this.duplicates.push({
          route: routeKey,
          files: [this.routes.get(routeKey).file, fileName]
        });
      }
      
      this.routes.set(routeKey, {
        method: method.toUpperCase(),
        path,
        file: fileName,
        fullPath: this.constructFullPath(path, fileName)
      });
    }
  }

  /**
   * 构造完整路径
   */
  constructFullPath(path, fileName) {
    const pathMappings = {
      'auth.js': '/api/auth',
      'test.js': '/api/test',
      'testHistory.js': '/api/test/history',
      'seo.js': '/api/seo',
      'dataManagement.js': '/api/data-management',
      'dataExport.js': '/api/data-export',
      'dataImport.js': '/api/data-import',
      'data.js': '/api/data',
      'user.js': '/api/user',
      'admin.js': '/api/admin',
      'system.js': '/api/system',
      'monitoring.js': '/api/monitoring',
      'reports.js': '/api/reports',
      'integrations.js': '/api/integrations',
      'files.js': '/api/files',
      'performance.js': '/api/performance',
      'security.js': '/api/security',
      'alerts.js': '/api/alerts',
      'analytics.js': '/api/analytics',
      'batch.js': '/api/batch'
    };
    
    const basePath = pathMappings[fileName] || '/api';
    return path === '/' ? basePath : `${basePath}${path}`;
  }

  /**
   * 检查路由冲突
   */
  checkRouteConflicts() {
    console.log('⚔️ Checking route conflicts...');
    
    const pathGroups = new Map();
    
    // 按路径分组
    for (const [routeKey, route] of this.routes) {
      const fullPath = route.fullPath;
      
      if (!pathGroups.has(fullPath)) {
        pathGroups.set(fullPath, []);
      }
      pathGroups.get(fullPath).push(route);
    }
    
    // 检查同路径不同方法的冲突
    for (const [fullPath, routes] of pathGroups) {
      const methods = routes.map(r => r.method);
      const uniqueMethods = new Set(methods);
      
      if (methods.length !== uniqueMethods.size) {
        this.conflicts.push({
          type: 'method_duplicate',
          path: fullPath,
          routes: routes
        });
      }
    }
    
    // 检查路径模式冲突
    const paths = Array.from(pathGroups.keys());
    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        if (this.isPathConflict(paths[i], paths[j])) {
          this.conflicts.push({
            type: 'path_conflict',
            path1: paths[i],
            path2: paths[j]
          });
        }
      }
    }
    
    if (this.conflicts.length > 0) {
      console.log(`⚠️ Found ${this.conflicts.length} route conflicts`);
    } else {
      console.log('✅ No route conflicts detected');
    }
  }

  /**
   * 检查路径冲突
   */
  isPathConflict(path1, path2) {
    // 简单的冲突检测：一个路径是另一个的前缀
    return path1 !== path2 && (path1.startsWith(path2) || path2.startsWith(path1));
  }

  /**
   * 验证路由管理器
   */
  validateRouteManager() {
    console.log('🔧 Validating route manager...');
    
    const managerPath = path.join(__dirname, '../backend/src/UnifiedRouteManager.js');
    
    if (!fs.existsSync(managerPath)) {
      this.errors.push('UnifiedRouteManager.js not found');
      return;
    }
    
    try {
      const content = fs.readFileSync(managerPath, 'utf8');
      
      // 检查关键功能
      const requiredFeatures = [
        'registerRoute',
        'applyRoutes',
        'setupGlobalMiddleware',
        'setupErrorHandling',
        'detectConflicts',
        'recordMetric'
      ];
      
      for (const feature of requiredFeatures) {
        if (!content.includes(feature)) {
          this.warnings.push(`UnifiedRouteManager missing feature: ${feature}`);
        }
      }
      
      console.log('✅ Route manager validation complete');
      
    } catch (error) {
      this.errors.push(`Failed to validate route manager: ${error.message}`);
    }
  }

  /**
   * 验证API响应格式
   */
  validateAPIResponseFormat() {
    console.log('📋 Validating API response format...');
    
    let hasStandardResponse = false;
    
    for (const file of this.routeFiles) {
      try {
        const filePath = path.join(__dirname, '../backend/routes', file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 检查是否使用标准响应格式
        if (content.includes('res.success') || content.includes('res.error')) {
          hasStandardResponse = true;
        }
        
        // 检查是否有不一致的响应格式
        if (content.includes('res.json({') && !content.includes('success:')) {
          this.warnings.push(`${file} may have inconsistent response format`);
        }
        
      } catch (error) {
        this.warnings.push(`Failed to check response format in ${file}: ${error.message}`);
      }
    }
    
    if (hasStandardResponse) {
      console.log('✅ Standard response format detected');
    } else {
      this.warnings.push('No standard response format detected in route files');
    }
  }

  /**
   * 验证版本管理
   */
  validateVersionManagement() {
    console.log('🔢 Validating version management...');
    
    const appPath = path.join(__dirname, '../backend/src/app.js');
    
    try {
      const content = fs.readFileSync(appPath, 'utf8');
      
      if (content.includes('UnifiedRouteManager')) {
        console.log('✅ UnifiedRouteManager is being used');
      } else {
        this.warnings.push('UnifiedRouteManager not found in app.js');
      }
      
      if (content.includes('/api/v1') || content.includes('version')) {
        console.log('✅ Version management detected');
      } else {
        this.warnings.push('No version management detected');
      }
      
    } catch (error) {
      this.errors.push(`Failed to validate version management: ${error.message}`);
    }
  }

  /**
   * 生成验证报告
   */
  generateReport() {
    console.log('\n📊 Route Architecture Validation Report');
    console.log('=' .repeat(50));
    
    // 统计信息
    console.log('\n📈 Statistics:');
    console.log(`  Route files: ${this.routeFiles.length}`);
    console.log(`  Route definitions: ${this.routes.size}`);
    console.log(`  Duplicates: ${this.duplicates.length}`);
    console.log(`  Conflicts: ${this.conflicts.length}`);
    console.log(`  Errors: ${this.errors.length}`);
    console.log(`  Warnings: ${this.warnings.length}`);
    
    // 错误报告
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    // 警告报告
    if (this.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }
    
    // 重复路由报告
    if (this.duplicates.length > 0) {
      console.log('\n🔄 Duplicate Routes:');
      this.duplicates.forEach((duplicate, index) => {
        console.log(`  ${index + 1}. ${duplicate.route} in files: ${duplicate.files.join(', ')}`);
      });
    }
    
    // 冲突报告
    if (this.conflicts.length > 0) {
      console.log('\n⚔️ Route Conflicts:');
      this.conflicts.forEach((conflict, index) => {
        if (conflict.type === 'path_conflict') {
          console.log(`  ${index + 1}. Path conflict: ${conflict.path1} vs ${conflict.path2}`);
        } else {
          console.log(`  ${index + 1}. Method conflict at ${conflict.path}`);
        }
      });
    }
    
    // 总结
    console.log('\n🎯 Summary:');
    if (this.errors.length === 0 && this.conflicts.length === 0) {
      console.log('✅ Route architecture validation PASSED');
      console.log('🎉 API route architecture has been successfully fixed!');
    } else {
      console.log('❌ Route architecture validation FAILED');
      console.log('🔧 Please fix the errors and conflicts before proceeding');
    }
    
    console.log('\n' + '='.repeat(50));
  }
}

// 运行验证
if (require.main === module) {
  const validator = new RouteArchitectureValidator();
  validator.validate().catch(console.error);
}

module.exports = RouteArchitectureValidator;
