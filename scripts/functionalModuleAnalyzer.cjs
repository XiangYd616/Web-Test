#!/usr/bin/env node

/**
 * 功能模块对应关系分析工具
 * 分析前端功能模块与后端服务的对应关系
 */

const fs = require('fs');
const path = require('path');

class FunctionalModuleAnalyzer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.frontendDir = path.join(this.projectRoot, 'frontend');
    this.backendDir = path.join(this.projectRoot, 'backend');
    
    this.analysis = {
      frontend: {
        pages: new Map(),
        services: new Map(),
        components: new Map(),
        hooks: new Map()
      },
      backend: {
        routes: new Map(),
        services: new Map(),
        engines: new Map(),
        middleware: new Map()
      },
      mappings: [],
      mismatches: [],
      duplicates: []
    };
  }

  /**
   * 开始功能模块分析
   */
  async analyze() {
    console.log('🧩 开始功能模块对应关系分析...');
    console.log('=' .repeat(60));

    // 分析前端模块
    await this.analyzeFrontendModules();
    
    // 分析后端模块
    await this.analyzeBackendModules();
    
    // 建立对应关系
    this.establishMappings();
    
    // 检测问题
    this.detectIssues();
    
    // 生成报告
    this.generateReport();

    console.log(`\n📊 功能模块分析完成:`);
    console.log(`  前端模块: ${this.getTotalFrontendModules()} 个`);
    console.log(`  后端模块: ${this.getTotalBackendModules()} 个`);
    console.log(`  映射关系: ${this.analysis.mappings.length} 个`);
    console.log(`  发现问题: ${this.analysis.mismatches.length} 个`);
  }

  /**
   * 分析前端模块
   */
  async analyzeFrontendModules() {
    console.log('\n📱 分析前端功能模块...');
    
    // 分析页面组件
    await this.analyzeFrontendPages();
    
    // 分析服务模块
    await this.analyzeFrontendServices();
    
    // 分析业务组件
    await this.analyzeFrontendComponents();
    
    // 分析自定义Hooks
    await this.analyzeFrontendHooks();
  }

  /**
   * 分析前端页面
   */
  async analyzeFrontendPages() {
    const pagesDir = path.join(this.frontendDir, 'pages');
    const pageFiles = this.findFiles(pagesDir, /\.(tsx|ts)$/, []);
    
    for (const file of pageFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(this.frontendDir, file);
      const pageName = path.basename(file, path.extname(file));
      
      // 分析页面功能
      const functionality = this.analyzeFunctionality(content, 'page');
      
      this.analysis.frontend.pages.set(pageName, {
        file: relativePath,
        functionality: functionality,
        apiCalls: this.extractApiCalls(content),
        dependencies: this.extractDependencies(content)
      });
    }
    
    console.log(`  页面组件: ${this.analysis.frontend.pages.size} 个`);
  }

  /**
   * 分析前端服务
   */
  async analyzeFrontendServices() {
    const servicesDir = path.join(this.frontendDir, 'services');
    const serviceFiles = this.findFiles(servicesDir, /\.(ts|tsx)$/, []);
    
    for (const file of serviceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(this.frontendDir, file);
      const serviceName = path.basename(file, path.extname(file));
      
      // 分析服务功能
      const functionality = this.analyzeFunctionality(content, 'service');
      
      this.analysis.frontend.services.set(serviceName, {
        file: relativePath,
        functionality: functionality,
        apiCalls: this.extractApiCalls(content),
        exports: this.extractExports(content)
      });
    }
    
    console.log(`  服务模块: ${this.analysis.frontend.services.size} 个`);
  }

  /**
   * 分析前端组件
   */
  async analyzeFrontendComponents() {
    const componentsDir = path.join(this.frontendDir, 'components');
    const componentFiles = this.findFiles(componentsDir, /\.(tsx|ts)$/, []);
    
    for (const file of componentFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(this.frontendDir, file);
      const componentName = path.basename(file, path.extname(file));
      
      // 只分析业务组件，跳过纯UI组件
      if (this.isBusinessComponent(content)) {
        const functionality = this.analyzeFunctionality(content, 'component');
        
        this.analysis.frontend.components.set(componentName, {
          file: relativePath,
          functionality: functionality,
          apiCalls: this.extractApiCalls(content)
        });
      }
    }
    
    console.log(`  业务组件: ${this.analysis.frontend.components.size} 个`);
  }

  /**
   * 分析前端Hooks
   */
  async analyzeFrontendHooks() {
    const hooksDir = path.join(this.frontendDir, 'hooks');
    const hookFiles = this.findFiles(hooksDir, /\.(ts|tsx)$/, []);
    
    for (const file of hookFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(this.frontendDir, file);
      const hookName = path.basename(file, path.extname(file));
      
      const functionality = this.analyzeFunctionality(content, 'hook');
      
      this.analysis.frontend.hooks.set(hookName, {
        file: relativePath,
        functionality: functionality,
        apiCalls: this.extractApiCalls(content)
      });
    }
    
    console.log(`  自定义Hooks: ${this.analysis.frontend.hooks.size} 个`);
  }

  /**
   * 分析后端模块
   */
  async analyzeBackendModules() {
    console.log('\n🔧 分析后端功能模块...');
    
    // 分析路由模块
    await this.analyzeBackendRoutes();
    
    // 分析服务模块
    await this.analyzeBackendServices();
    
    // 分析测试引擎
    await this.analyzeBackendEngines();
    
    // 分析中间件
    await this.analyzeBackendMiddleware();
  }

  /**
   * 分析后端路由
   */
  async analyzeBackendRoutes() {
    const routesDir = path.join(this.backendDir, 'routes');
    const routeFiles = this.findFiles(routesDir, /\.js$/, []);
    
    for (const file of routeFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(this.backendDir, file);
      const routeName = path.basename(file, path.extname(file));
      
      const functionality = this.analyzeFunctionality(content, 'route');
      const endpoints = this.extractEndpoints(content);
      
      this.analysis.backend.routes.set(routeName, {
        file: relativePath,
        functionality: functionality,
        endpoints: endpoints,
        dependencies: this.extractDependencies(content)
      });
    }
    
    console.log(`  路由模块: ${this.analysis.backend.routes.size} 个`);
  }

  /**
   * 分析后端服务
   */
  async analyzeBackendServices() {
    const servicesDir = path.join(this.backendDir, 'services');
    const serviceFiles = this.findFiles(servicesDir, /\.js$/, []);
    
    for (const file of serviceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(this.backendDir, file);
      const serviceName = path.basename(file, path.extname(file));
      
      const functionality = this.analyzeFunctionality(content, 'service');
      
      this.analysis.backend.services.set(serviceName, {
        file: relativePath,
        functionality: functionality,
        exports: this.extractExports(content)
      });
    }
    
    console.log(`  服务模块: ${this.analysis.backend.services.size} 个`);
  }

  /**
   * 分析后端测试引擎
   */
  async analyzeBackendEngines() {
    const enginesDir = path.join(this.backendDir, 'engines');
    const engineFiles = this.findFiles(enginesDir, /\.js$/, []);
    
    for (const file of engineFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(this.backendDir, file);
      const engineName = path.basename(file, path.extname(file));
      
      const functionality = this.analyzeFunctionality(content, 'engine');
      
      this.analysis.backend.engines.set(engineName, {
        file: relativePath,
        functionality: functionality,
        capabilities: this.extractEngineCapabilities(content)
      });
    }
    
    console.log(`  测试引擎: ${this.analysis.backend.engines.size} 个`);
  }

  /**
   * 分析后端中间件
   */
  async analyzeBackendMiddleware() {
    const middlewareDir = path.join(this.backendDir, 'middleware');
    const middlewareFiles = this.findFiles(middlewareDir, /\.js$/, []);
    
    for (const file of middlewareFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(this.backendDir, file);
      const middlewareName = path.basename(file, path.extname(file));
      
      const functionality = this.analyzeFunctionality(content, 'middleware');
      
      this.analysis.backend.middleware.set(middlewareName, {
        file: relativePath,
        functionality: functionality
      });
    }
    
    console.log(`  中间件: ${this.analysis.backend.middleware.size} 个`);
  }

  /**
   * 分析功能性
   */
  analyzeFunctionality(content, type) {
    const functionality = [];
    
    // 根据不同类型分析不同的功能特征
    switch (type) {
      case 'page':
        functionality.push(...this.analyzePageFunctionality(content));
        break;
      case 'service':
        functionality.push(...this.analyzeServiceFunctionality(content));
        break;
      case 'component':
        functionality.push(...this.analyzeComponentFunctionality(content));
        break;
      case 'route':
        functionality.push(...this.analyzeRouteFunctionality(content));
        break;
      case 'engine':
        functionality.push(...this.analyzeEngineFunctionality(content));
        break;
    }
    
    return functionality;
  }

  /**
   * 分析页面功能
   */
  analyzePageFunctionality(content) {
    const features = [];
    
    // 检测测试相关功能
    if (content.includes('stress') || content.includes('压力测试')) {
      features.push('stress_testing');
    }
    if (content.includes('performance') || content.includes('性能测试')) {
      features.push('performance_testing');
    }
    if (content.includes('security') || content.includes('安全测试')) {
      features.push('security_testing');
    }
    if (content.includes('api') || content.includes('API测试')) {
      features.push('api_testing');
    }
    
    // 检测管理功能
    if (content.includes('admin') || content.includes('管理')) {
      features.push('administration');
    }
    if (content.includes('user') || content.includes('用户')) {
      features.push('user_management');
    }
    
    return features;
  }

  /**
   * 分析服务功能
   */
  analyzeServiceFunctionality(content) {
    const features = [];
    
    // 检测API调用
    if (content.includes('fetch') || content.includes('axios')) {
      features.push('api_client');
    }
    
    // 检测数据处理
    if (content.includes('transform') || content.includes('process')) {
      features.push('data_processing');
    }
    
    // 检测缓存
    if (content.includes('cache') || content.includes('缓存')) {
      features.push('caching');
    }
    
    return features;
  }

  /**
   * 分析组件功能
   */
  analyzeComponentFunctionality(content) {
    const features = [];
    
    // 检测表单处理
    if (content.includes('form') || content.includes('表单')) {
      features.push('form_handling');
    }
    
    // 检测数据展示
    if (content.includes('table') || content.includes('chart')) {
      features.push('data_visualization');
    }
    
    return features;
  }

  /**
   * 分析路由功能
   */
  analyzeRouteFunctionality(content) {
    const features = [];
    
    // 检测CRUD操作
    if (content.includes('router.get')) features.push('read_operations');
    if (content.includes('router.post')) features.push('create_operations');
    if (content.includes('router.put')) features.push('update_operations');
    if (content.includes('router.delete')) features.push('delete_operations');
    
    return features;
  }

  /**
   * 分析引擎功能
   */
  analyzeEngineFunctionality(content) {
    const features = [];
    
    // 检测测试类型
    if (content.includes('stress') || content.includes('load')) {
      features.push('load_testing');
    }
    if (content.includes('security') || content.includes('vulnerability')) {
      features.push('security_scanning');
    }
    if (content.includes('performance') || content.includes('lighthouse')) {
      features.push('performance_analysis');
    }
    
    return features;
  }

  /**
   * 提取API调用
   */
  extractApiCalls(content) {
    const apiCalls = [];
    const patterns = [
      /fetch\s*\(\s*[`'"](\/api\/[^`'"]+)[`'"]/g,
      /axios\.[get|post|put|delete]+\s*\(\s*[`'"](\/api\/[^`'"]+)[`'"]/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        apiCalls.push(match[1]);
      }
    });

    return [...new Set(apiCalls)]; // 去重
  }

  /**
   * 提取端点
   */
  extractEndpoints(content) {
    const endpoints = [];
    const pattern = /router\.(get|post|put|delete|patch)\s*\(\s*[`'"](\/[^`'"]*)[`'"]/g;
    
    let match;
    while ((match = pattern.exec(content)) !== null) {
      endpoints.push({
        method: match[1].toUpperCase(),
        path: match[2]
      });
    }
    
    return endpoints;
  }

  /**
   * 提取依赖
   */
  extractDependencies(content) {
    const dependencies = [];
    const requirePattern = /require\s*\(\s*[`'"](\.\/[^`'"]+)[`'"]\)/g;
    const importPattern = /import.*from\s+[`'"](\.\/[^`'"]+)[`'"]/g;
    
    [requirePattern, importPattern].forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        dependencies.push(match[1]);
      }
    });
    
    return [...new Set(dependencies)];
  }

  /**
   * 提取导出
   */
  extractExports(content) {
    const exports = [];
    const patterns = [
      /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g,
      /module\.exports\s*=\s*(\w+)/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        exports.push(match[1]);
      }
    });

    return [...new Set(exports)];
  }

  /**
   * 提取引擎能力
   */
  extractEngineCapabilities(content) {
    const capabilities = [];
    
    // 检测引擎方法
    const methodPattern = /async\s+(\w+)\s*\(/g;
    let match;
    while ((match = methodPattern.exec(content)) !== null) {
      if (match[1].startsWith('run') || match[1].startsWith('test') || match[1].startsWith('check')) {
        capabilities.push(match[1]);
      }
    }
    
    return capabilities;
  }

  /**
   * 判断是否为业务组件
   */
  isBusinessComponent(content) {
    // 检查是否包含业务逻辑特征
    const businessIndicators = [
      'useEffect', 'useState', 'fetch', 'axios', 'api',
      'service', 'manager', 'handler', 'submit'
    ];
    
    return businessIndicators.some(indicator => content.includes(indicator));
  }

  /**
   * 建立映射关系
   */
  establishMappings() {
    console.log('\n🔗 建立功能模块映射关系...');
    
    // 基于功能特征建立映射
    this.mapByFunctionality();
    
    // 基于API调用建立映射
    this.mapByApiCalls();
    
    // 基于命名相似性建立映射
    this.mapByNamingSimilarity();
  }

  /**
   * 基于功能特征映射
   */
  mapByFunctionality() {
    // 实现功能特征映射逻辑
    // 这里可以根据具体需求实现
  }

  /**
   * 基于API调用映射
   */
  mapByApiCalls() {
    // 实现API调用映射逻辑
    // 这里可以根据具体需求实现
  }

  /**
   * 基于命名相似性映射
   */
  mapByNamingSimilarity() {
    // 实现命名相似性映射逻辑
    // 这里可以根据具体需求实现
  }

  /**
   * 检测问题
   */
  detectIssues() {
    console.log('\n🔍 检测功能模块问题...');
    
    // 检测缺失的后端支持
    this.detectMissingBackendSupport();
    
    // 检测未使用的后端功能
    this.detectUnusedBackendFeatures();
    
    // 检测功能重复
    this.detectDuplicateFunctionality();
  }

  /**
   * 检测缺失的后端支持
   */
  detectMissingBackendSupport() {
    // 实现缺失后端支持检测逻辑
  }

  /**
   * 检测未使用的后端功能
   */
  detectUnusedBackendFeatures() {
    // 实现未使用后端功能检测逻辑
  }

  /**
   * 检测功能重复
   */
  detectDuplicateFunctionality() {
    // 实现功能重复检测逻辑
  }

  /**
   * 工具方法
   */
  findFiles(dir, pattern, excludeDirs = []) {
    const files = [];
    
    if (!fs.existsSync(dir)) {
      return files;
    }
    
    const scan = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!excludeDirs.includes(item) && !item.startsWith('.')) {
            scan(fullPath);
          }
        } else if (stat.isFile() && pattern.test(item)) {
          files.push(fullPath);
        }
      }
    };
    
    scan(dir);
    return files;
  }

  getTotalFrontendModules() {
    return this.analysis.frontend.pages.size + 
           this.analysis.frontend.services.size + 
           this.analysis.frontend.components.size + 
           this.analysis.frontend.hooks.size;
  }

  getTotalBackendModules() {
    return this.analysis.backend.routes.size + 
           this.analysis.backend.services.size + 
           this.analysis.backend.engines.size + 
           this.analysis.backend.middleware.size;
  }

  /**
   * 生成报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'functional-module-analysis.md');
    
    let report = '# 功能模块对应关系分析报告\n\n';
    report += `**生成时间**: ${new Date().toISOString()}\n\n`;

    // 前端模块统计
    report += '## 📱 前端功能模块\n\n';
    report += `- 页面组件: ${this.analysis.frontend.pages.size} 个\n`;
    report += `- 服务模块: ${this.analysis.frontend.services.size} 个\n`;
    report += `- 业务组件: ${this.analysis.frontend.components.size} 个\n`;
    report += `- 自定义Hooks: ${this.analysis.frontend.hooks.size} 个\n\n`;

    // 后端模块统计
    report += '## 🔧 后端功能模块\n\n';
    report += `- 路由模块: ${this.analysis.backend.routes.size} 个\n`;
    report += `- 服务模块: ${this.analysis.backend.services.size} 个\n`;
    report += `- 测试引擎: ${this.analysis.backend.engines.size} 个\n`;
    report += `- 中间件: ${this.analysis.backend.middleware.size} 个\n\n`;

    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 功能模块分析报告已保存到: ${reportPath}`);
  }
}

// 主函数
async function main() {
  const analyzer = new FunctionalModuleAnalyzer();
  
  try {
    await analyzer.analyze();
  } catch (error) {
    console.error('❌ 功能模块分析过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行分析
if (require.main === module) {
  main().catch(console.error);
}

module.exports = FunctionalModuleAnalyzer;
