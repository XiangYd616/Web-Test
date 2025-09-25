/**
 * 项目结构优化脚本
 * 统一项目架构，消除重复和不一致
 */

const fs = require('fs');
const path = require('path');

class StructureOptimizer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.optimizations = {
      engines: [],
      routes: [],
      components: [],
      services: [],
      configs: []
    };
  }

  /**
   * 执行结构优化
   */
  async optimize() {

    // 1. 统一测试引擎架构
    await this.unifyEngineArchitecture();

    // 2. 统一API路由结构
    await this.unifyRouteStructure();

    // 3. 统一前端组件架构
    await this.unifyComponentArchitecture();

    // 4. 统一服务层架构
    await this.unifyServiceArchitecture();

    // 5. 统一配置管理
    await this.unifyConfigManagement();

    // 6. 生成优化报告
    await this.generateOptimizationReport();

  }

  /**
   * 统一测试引擎架构
   */
  async unifyEngineArchitecture() {
    console.log('🔧 统一测试引擎架构...');

    const targetStructure = {
      'backend/engines/': {
        'core/': [
          'BaseTestEngine.js',
          'TestEngineManager.js',
          'EngineRegistry.js'
        ],
        'performance/': [
          'PerformanceTestEngine.js',
          'index.js'
        ],
        'security/': [
          'SecurityTestEngine.js',
          'index.js'
        ],
        'stress/': [
          'StressTestEngine.js',
          'index.js'
        ],
        'api/': [
          'ApiTestEngine.js',
          'index.js'
        ],
        'seo/': [
          'SeoTestEngine.js',
          'index.js'
        ],
        'compatibility/': [
          'CompatibilityTestEngine.js',
          'index.js'
        ],
        'ux/': [
          'UxTestEngine.js',
          'index.js'
        ],
        'website/': [
          'WebsiteTestEngine.js',
          'index.js'
        ]
      }
    };

    // 检查当前结构
    const currentEngines = this.scanEngineStructure();
    
    // 生成重构计划
    const restructurePlan = this.generateEngineRestructurePlan(currentEngines, targetStructure);
    
    this.optimizations.engines = restructurePlan;
  }

  /**
   * 扫描引擎结构
   */
  scanEngineStructure() {
    const enginesDir = path.join(this.projectRoot, 'backend/engines');
    const engines = {};

    if (fs.existsSync(enginesDir)) {
      const engineTypes = fs.readdirSync(enginesDir);
      
      for (const engineType of engineTypes) {
        const engineDir = path.join(enginesDir, engineType);
        if (fs.statSync(engineDir).isDirectory()) {
          const files = fs.readdirSync(engineDir);
          engines[engineType] = files.filter(f => f.endsWith('.js'));
        }
      }
    }

    return engines;
  }

  /**
   * 生成引擎重构计划
   */
  generateEngineRestructurePlan(current, target) {
    const plan = [];

    for (const [engineType, currentFiles] of Object.entries(current)) {
      const targetFiles = target['backend/engines/'][`${engineType}/`];
      
      if (!targetFiles) {
        plan.push({
          type: 'unknown-engine',
          engine: engineType,
          action: 'review',
          files: currentFiles
        });
        continue;
      }

      // 检查文件命名一致性
      const engineFiles = currentFiles.filter(f => f.includes('Engine'));
      
      if (engineFiles.length > 1) {
        plan.push({
          type: 'duplicate-engine',
          engine: engineType,
          action: 'merge',
          files: engineFiles,
          target: targetFiles[0]
        });
      } else if (engineFiles.length === 0) {
        plan.push({
          type: 'missing-engine',
          engine: engineType,
          action: 'create',
          target: targetFiles[0]
        });
      } else {
        const currentName = engineFiles[0];
        const targetName = targetFiles[0];
        
        if (currentName !== targetName) {
          plan.push({
            type: 'rename-engine',
            engine: engineType,
            action: 'rename',
            from: currentName,
            to: targetName
          });
        }
      }

      // 检查index.js
      if (!currentFiles.includes('index.js')) {
        plan.push({
          type: 'missing-index',
          engine: engineType,
          action: 'create-index',
          target: 'index.js'
        });
      }
    }

    return plan;
  }

  /**
   * 统一API路由结构
   */
  async unifyRouteStructure() {

    const targetStructure = {
      'backend/routes/': [
        'auth.js',           // 认证路由
        'test.js',           // 主测试路由
        'user.js',           // 用户管理
        'admin.js',          // 管理员功能
        'system.js',         // 系统管理
        'files.js'           // 文件管理
      ],
      'backend/api/v1/routes/': [
        'tests.js',          // 测试API v1
        'results.js',        // 结果API v1
        'analytics.js'       // 分析API v1
      ]
    };

    const currentRoutes = this.scanRouteStructure();
    const routePlan = this.generateRouteRestructurePlan(currentRoutes, targetStructure);
    
    this.optimizations.routes = routePlan;
  }

  /**
   * 扫描路由结构
   */
  scanRouteStructure() {
    const routes = {};
    const routeDirs = [
      'backend/routes',
      'backend/api/v1/routes'
    ];

    for (const routeDir of routeDirs) {
      const fullPath = path.join(this.projectRoot, routeDir);
      if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.js'));
        routes[routeDir] = files;
      }
    }

    return routes;
  }

  /**
   * 生成路由重构计划
   */
  generateRouteRestructurePlan(current, target) {
    const plan = [];

    // 检查重复路由
    const allRoutes = [];
    for (const [dir, files] of Object.entries(current)) {
      for (const file of files) {
        allRoutes.push({ dir, file, path: path.join(dir, file) });
      }
    }

    // 查找功能重复的路由
    const duplicates = this.findDuplicateRoutes(allRoutes);
    for (const duplicate of duplicates) {
      plan.push({
        type: 'duplicate-route',
        action: 'merge',
        files: duplicate.files,
        reason: duplicate.reason
      });
    }

    // 检查缺失的标准路由
    for (const [targetDir, targetFiles] of Object.entries(target)) {
      const currentFiles = current[targetDir] || [];
      
      for (const targetFile of targetFiles) {
        if (!currentFiles.includes(targetFile)) {
          plan.push({
            type: 'missing-route',
            action: 'create',
            dir: targetDir,
            file: targetFile
          });
        }
      }
    }

    return plan;
  }

  /**
   * 查找重复路由
   */
  findDuplicateRoutes(routes) {
    const duplicates = [];
    const routeMap = new Map();

    for (const route of routes) {
      const fullPath = path.join(this.projectRoot, route.path);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const endpoints = this.extractRouteEndpoints(content);
        
        for (const endpoint of endpoints) {
          const key = `${endpoint.method}:${endpoint.path}`;
          
          if (routeMap.has(key)) {
            const existing = routeMap.get(key);
            duplicates.push({
              endpoint: key,
              files: [existing.route, route],
              reason: '相同的API端点定义'
            });
          } else {
            routeMap.set(key, { endpoint, route });
          }
        }
      }
    }

    return duplicates;
  }

  /**
   * 提取路由端点
   */
  extractRouteEndpoints(content) {
    const endpoints = [];
    const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    
    let match;
    while ((match = routeRegex.exec(content)) !== null) {
      endpoints.push({
        method: match[1].toUpperCase(),
        path: match[2]
      });
    }
    
    return endpoints;
  }

  /**
   * 统一前端组件架构
   */
  async unifyComponentArchitecture() {

    const targetStructure = {
      'frontend/components/': {
        'ui/': [
          'Button.tsx',
          'Input.tsx',
          'Modal.tsx',
          'Progress.tsx',
          'StatusBadge.tsx'
        ],
        'layout/': [
          'Header.tsx',
          'Sidebar.tsx',
          'Footer.tsx',
          'PageLayout.tsx'
        ],
        'testing/': [
          'UnifiedTestPanel.tsx',
          'TestProgress.tsx',
          'TestResults.tsx',
          'TestHistory.tsx'
        ],
        'business/': [
          'TestRunner.tsx',
          'ResultViewer.tsx',
          'ConfigManager.tsx'
        ]
      }
    };

    const currentComponents = this.scanComponentStructure();
    const componentPlan = this.generateComponentRestructurePlan(currentComponents, targetStructure);
    
    this.optimizations.components = componentPlan;
  }

  /**
   * 扫描组件结构
   */
  scanComponentStructure() {
    const components = {};
    const componentDirs = [
      'frontend/components',
      'frontend/pages'
    ];

    for (const componentDir of componentDirs) {
      const fullPath = path.join(this.projectRoot, componentDir);
      if (fs.existsSync(fullPath)) {
        components[componentDir] = this.scanDirectoryRecursive(fullPath, ['.tsx', '.jsx']);
      }
    }

    return components;
  }

  /**
   * 递归扫描目录
   */
  scanDirectoryRecursive(dir, extensions) {
    const files = [];
    
    const scan = (currentDir, relativePath = '') => {
      if (!fs.existsSync(currentDir)) return;
      
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.')) {
          scan(fullPath, path.join(relativePath, item));
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push({
            name: item,
            path: path.join(relativePath, item),
            fullPath,
            size: stat.size
          });
        }
      }
    };
    
    scan(dir);
    return files;
  }

  /**
   * 生成组件重构计划
   */
  generateComponentRestructurePlan(current, target) {
    const plan = [];

    // 查找重复的测试组件
    const testingComponents = this.findTestingComponents(current);
    const duplicateGroups = this.groupDuplicateComponents(testingComponents);
    
    for (const group of duplicateGroups) {
      plan.push({
        type: 'duplicate-components',
        action: 'consolidate',
        components: group.components,
        target: group.recommended,
        reason: group.reason
      });
    }

    return plan;
  }

  /**
   * 查找测试相关组件
   */
  findTestingComponents(componentStructure) {
    const testingComponents = [];
    
    for (const [dir, files] of Object.entries(componentStructure)) {
      for (const file of files) {
        if (this.isTestingRelated(file.name) || this.isTestingRelated(file.path)) {
          testingComponents.push({
            ...file,
            dir,
            type: this.getComponentType(file.name)
          });
        }
      }
    }
    
    return testingComponents;
  }

  /**
   * 判断是否与测试相关
   */
  isTestingRelated(name) {
    const testKeywords = [
      'test', 'Test', 'testing', 'Testing',
      'api', 'API', 'security', 'Security',
      'performance', 'Performance', 'stress', 'Stress',
      'seo', 'SEO', 'ux', 'UX', 'compatibility'
    ];
    
    return testKeywords.some(keyword => name.includes(keyword));
  }

  /**
   * 获取组件类型
   */
  getComponentType(name) {
    if (name.includes('Panel')) return 'panel';
    if (name.includes('Progress')) return 'progress';
    if (name.includes('Result')) return 'result';
    if (name.includes('History')) return 'history';
    if (name.includes('Runner')) return 'runner';
    if (name.includes('Test')) return 'test-page';
    
    return 'unknown';
  }

  /**
   * 分组重复组件
   */
  groupDuplicateComponents(components) {
    const groups = [];
    const typeGroups = {};
    
    // 按类型分组
    for (const component of components) {
      if (!typeGroups[component.type]) {
        typeGroups[component.type] = [];
      }
      typeGroups[component.type].push(component);
    }
    
    // 找出重复的类型
    for (const [type, componentList] of Object.entries(typeGroups)) {
      if (componentList.length > 1) {
        // 推荐保留最新或最完整的组件
        const recommended = this.selectBestComponent(componentList);
        
        groups.push({
          type,
          components: componentList,
          recommended,
          reason: `合并${componentList.length}个${type}组件到统一实现`
        });
      }
    }
    
    return groups;
  }

  /**
   * 选择最佳组件
   */
  selectBestComponent(components) {
    // 优先选择包含"Unified"的组件
    const unified = components.find(c => c.name.includes('Unified'));
    if (unified) return unified;
    
    // 否则选择最大的文件
    return components.reduce((best, current) => {
      return current.size > best.size ? current : best;
    });
  }

  /**
   * 统一服务层架构
   */
  async unifyServiceArchitecture() {

    const targetStructure = {
      'frontend/services/': {
        'api/': [
          'testApiService.ts',
          'userApiService.ts',
          'systemApiService.ts'
        ],
        'testing/': [
          'UnifiedTestStateManager.ts',
          'TestConfigurationManager.ts',
          'TestResultAnalyzer.ts'
        ]
      },
      'backend/services/': {
        'core/': [
          'TestEngineService.js',
          'UserService.js',
          'SystemService.js'
        ],
        'testing/': [
          'TestExecutionService.js',
          'TestResultService.js',
          'TestHistoryService.js'
        ]
      }
    };

    const currentServices = this.scanServiceStructure();
    const servicePlan = this.generateServiceRestructurePlan(currentServices, targetStructure);
    
    this.optimizations.services = servicePlan;
  }

  /**
   * 扫描服务结构
   */
  scanServiceStructure() {
    const services = {};
    const serviceDirs = [
      'frontend/services',
      'backend/services'
    ];

    for (const serviceDir of serviceDirs) {
      const fullPath = path.join(this.projectRoot, serviceDir);
      if (fs.existsSync(fullPath)) {
        services[serviceDir] = this.scanDirectoryRecursive(fullPath, ['.ts', '.js']);
      }
    }

    return services;
  }

  /**
   * 生成服务重构计划
   */
  generateServiceRestructurePlan(current, target) {
    const plan = [];

    // 查找重复的服务功能
    const allServices = [];
    for (const [dir, files] of Object.entries(current)) {
      for (const file of files) {
        allServices.push({ ...file, dir });
      }
    }

    const duplicateServices = this.findDuplicateServices(allServices);
    
    for (const duplicate of duplicateServices) {
      plan.push({
        type: 'duplicate-service',
        action: 'merge',
        services: duplicate.services,
        function: duplicate.function,
        recommended: duplicate.recommended
      });
    }

    return plan;
  }

  /**
   * 查找重复服务
   */
  findDuplicateServices(services) {
    const duplicates = [];
    const functionMap = new Map();

    for (const service of services) {
      const content = fs.readFileSync(service.fullPath, 'utf8');
      const functions = this.extractServiceFunctions(content);
      
      for (const func of functions) {
        if (!functionMap.has(func)) {
          functionMap.set(func, []);
        }
        functionMap.get(func).push(service);
      }
    }

    // 找出重复的功能
    for (const [func, serviceList] of functionMap.entries()) {
      if (serviceList.length > 1) {
        duplicates.push({
          function: func,
          services: serviceList,
          recommended: this.selectBestService(serviceList)
        });
      }
    }

    return duplicates;
  }

  /**
   * 提取服务函数
   */
  extractServiceFunctions(content) {
    const functions = [];
    const patterns = [
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
      /(\w+)\s*[:=]\s*(?:async\s+)?function/g,
      /(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1] && !functions.includes(match[1])) {
          functions.push(match[1]);
        }
      }
    }

    return functions;
  }

  /**
   * 选择最佳服务
   */
  selectBestService(services) {
    // 优先选择统一的服务
    const unified = services.find(s => s.name.includes('Unified'));
    if (unified) return unified;

    // 选择最大的文件
    return services.reduce((best, current) => {
      return current.size > best.size ? current : best;
    });
  }

  /**
   * 统一配置管理
   */
  async unifyConfigManagement() {

    const configFiles = this.scanConfigFiles();
    const configPlan = this.generateConfigOptimizationPlan(configFiles);
    
    this.optimizations.configs = configPlan;
  }

  /**
   * 扫描配置文件
   */
  scanConfigFiles() {
    const configs = [];
    const configPatterns = [
      '*.config.js',
      '*.config.ts',
      '.env*',
      'package.json',
      'tsconfig.json',
      'vite.config.*'
    ];

    // 扫描根目录和子目录的配置文件
    const scanDirs = [
      this.projectRoot,
      path.join(this.projectRoot, 'frontend'),
      path.join(this.projectRoot, 'backend')
    ];

    for (const dir of scanDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          if (this.isConfigFile(file)) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            configs.push({
              name: file,
              path: fullPath,
              dir: path.relative(this.projectRoot, dir),
              size: stat.size,
              type: this.getConfigType(file)
            });
          }
        }
      }
    }

    return configs;
  }

  /**
   * 判断是否是配置文件
   */
  isConfigFile(filename) {
    const configPatterns = [
      /\.config\.(js|ts|json)$/,
      /^\.env/,
      /^package\.json$/,
      /^tsconfig.*\.json$/,
      /^vite\.config\./,
      /^webpack\.config\./,
      /^babel\.config\./
    ];

    return configPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * 获取配置类型
   */
  getConfigType(filename) {
    if (filename.includes('vite')) return 'build';
    if (filename.includes('webpack')) return 'build';
    if (filename.includes('babel')) return 'build';
    if (filename.includes('tsconfig')) return 'typescript';
    if (filename.includes('package.json')) return 'package';
    if (filename.startsWith('.env')) return 'environment';
    
    return 'other';
  }

  /**
   * 生成配置优化计划
   */
  generateConfigOptimizationPlan(configs) {
    const plan = [];

    // 检查重复的配置
    const typeGroups = {};
    for (const config of configs) {
      if (!typeGroups[config.type]) {
        typeGroups[config.type] = [];
      }
      typeGroups[config.type].push(config);
    }

    for (const [type, configList] of Object.entries(typeGroups)) {
      if (configList.length > 1 && type !== 'environment') {
        plan.push({
          type: 'duplicate-config',
          configType: type,
          configs: configList,
          action: 'review',
          reason: `发现${configList.length}个${type}配置文件`
        });
      }
    }

    return plan;
  }

  /**
   * 生成优化报告
   */
  async generateOptimizationReport() {
    console.log('📊 生成优化报告...');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalOptimizations: Object.values(this.optimizations).reduce((sum, arr) => sum + arr.length, 0),
        categories: {
          engines: this.optimizations.engines.length,
          routes: this.optimizations.routes.length,
          components: this.optimizations.components.length,
          services: this.optimizations.services.length,
          configs: this.optimizations.configs.length
        }
      },
      optimizations: this.optimizations,
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(this.projectRoot, 'structure-optimization-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  }

  /**
   * 生成建议
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.optimizations.engines.length > 0) {
      recommendations.push('统一测试引擎命名规范，使用PascalCase命名');
      recommendations.push('为每个引擎添加index.js导出文件');
    }

    if (this.optimizations.routes.length > 0) {
      recommendations.push('合并重复的API路由，避免端点冲突');
      recommendations.push('建立清晰的API版本管理策略');
    }

    if (this.optimizations.components.length > 0) {
      recommendations.push('使用统一的测试组件替换分散的实现');
      recommendations.push('建立组件库，提高代码复用率');
    }

    if (this.optimizations.services.length > 0) {
      recommendations.push('合并重复的服务功能，建立统一的服务层');
      recommendations.push('使用依赖注入管理服务实例');
    }

    recommendations.push('建立代码规范和架构文档');
    recommendations.push('设置自动化检查防止重复代码');

    return recommendations;
  }
}

// 执行优化
if (require.main === module) {
  const optimizer = new StructureOptimizer();
  optimizer.optimize().catch(console.error);
}

module.exports = StructureOptimizer;
