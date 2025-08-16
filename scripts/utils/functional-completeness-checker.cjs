#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class FunctionalCompletenessChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.issues = [];
    this.completenessReport = {
      frontend: {
        pages: [],
        components: [],
        routes: [],
        services: []
      },
      backend: {
        routes: [],
        controllers: [],
        services: [],
        models: []
      },
      integration: {
        apiConnections: [],
        dataFlow: []
      }
    };
  }

  /**
   * 执行功能完整性检查
   */
  async execute() {
    console.log('🔍 开始功能完整性检查...\n');

    try {
      // 1. 检查前端页面完整性
      await this.checkFrontendPages();

      // 2. 检查组件功能实现
      await this.checkComponentImplementation();

      // 3. 检查路由配置完整性
      await this.checkRouteCompleteness();

      // 4. 检查后端功能实现
      await this.checkBackendImplementation();

      // 5. 检查API集成完整性
      await this.checkApiIntegration();

      // 6. 检查核心业务流程
      await this.checkBusinessFlows();

      // 7. 生成完整性报告
      this.generateCompletenessReport();

    } catch (error) {
      console.error('❌ 功能完整性检查过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 检查前端页面完整性
   */
  async checkFrontendPages() {
    console.log('📄 检查前端页面完整性...');

    const pagesDir = path.join(this.projectRoot, 'frontend/pages');
    const componentsDir = path.join(this.projectRoot, 'frontend/components');
    
    // 检查页面目录
    if (fs.existsSync(pagesDir)) {
      const pageFiles = this.getFilesRecursively(pagesDir, ['.tsx', '.jsx']);
      
      for (const pageFile of pageFiles) {
        const analysis = await this.analyzePageImplementation(pageFile);
        this.completenessReport.frontend.pages.push(analysis);
        
        if (analysis.issues.length > 0) {
          analysis.issues.forEach(issue => this.addIssue('frontend_page', issue, pageFile));
        }
      }
    }

    // 检查组件目录中的页面级组件
    if (fs.existsSync(componentsDir)) {
      const componentFiles = this.getFilesRecursively(componentsDir, ['.tsx', '.jsx']);
      
      for (const componentFile of componentFiles) {
        if (this.isPageLevelComponent(componentFile)) {
          const analysis = await this.analyzePageImplementation(componentFile);
          this.completenessReport.frontend.pages.push(analysis);
          
          if (analysis.issues.length > 0) {
            analysis.issues.forEach(issue => this.addIssue('frontend_page', issue, componentFile));
          }
        }
      }
    }

    console.log(`   检查了 ${this.completenessReport.frontend.pages.length} 个页面组件\n`);
  }

  /**
   * 分析页面实现
   */
  async analyzePageImplementation(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const issues = [];
    
    // 检查是否只是占位符
    if (this.isPlaceholderComponent(content)) {
      issues.push('页面只是占位符，缺少实际实现');
    }

    // 检查是否有状态管理
    const hasState = content.includes('useState') || content.includes('useReducer') || content.includes('useContext');
    
    // 检查是否有API调用
    const hasApiCalls = content.includes('fetch') || content.includes('axios') || content.includes('api.');
    
    // 检查是否有错误处理
    const hasErrorHandling = content.includes('try') || content.includes('catch') || content.includes('error');
    
    // 检查是否有加载状态
    const hasLoadingState = content.includes('loading') || content.includes('Loading') || content.includes('isLoading');

    // 检查关键功能实现
    const functionalityScore = this.calculateFunctionalityScore(content, fileName);
    
    if (functionalityScore < 30) {
      issues.push('页面功能实现不完整，缺少核心业务逻辑');
    }

    return {
      file: path.relative(this.projectRoot, filePath),
      fileName,
      hasState,
      hasApiCalls,
      hasErrorHandling,
      hasLoadingState,
      functionalityScore,
      issues,
      isComplete: issues.length === 0 && functionalityScore >= 70
    };
  }

  /**
   * 检查组件功能实现
   */
  async checkComponentImplementation() {
    console.log('🧩 检查组件功能实现...');

    const componentsDir = path.join(this.projectRoot, 'frontend/components');
    
    if (fs.existsSync(componentsDir)) {
      const componentFiles = this.getFilesRecursively(componentsDir, ['.tsx', '.jsx']);
      
      for (const componentFile of componentFiles) {
        if (!this.isPageLevelComponent(componentFile)) {
          const analysis = await this.analyzeComponentImplementation(componentFile);
          this.completenessReport.frontend.components.push(analysis);
          
          if (analysis.issues.length > 0) {
            analysis.issues.forEach(issue => this.addIssue('frontend_component', issue, componentFile));
          }
        }
      }
    }

    console.log(`   检查了 ${this.completenessReport.frontend.components.length} 个组件\n`);
  }

  /**
   * 分析组件实现
   */
  async analyzeComponentImplementation(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const issues = [];
    
    // 检查是否只是占位符
    if (this.isPlaceholderComponent(content)) {
      issues.push('组件只是占位符，缺少实际实现');
    }

    // 检查Props类型定义
    const hasPropsTypes = content.includes('interface') && content.includes('Props');
    
    // 检查事件处理
    const hasEventHandlers = content.includes('onClick') || content.includes('onChange') || content.includes('onSubmit');
    
    // 检查样式实现
    const hasStyles = content.includes('className') || content.includes('style=') || content.includes('styled');

    // 计算组件复杂度
    const complexity = this.calculateComponentComplexity(content);
    
    if (complexity < 20 && !this.isSimpleComponent(fileName)) {
      issues.push('组件实现过于简单，可能缺少必要功能');
    }

    return {
      file: path.relative(this.projectRoot, filePath),
      fileName,
      hasPropsTypes,
      hasEventHandlers,
      hasStyles,
      complexity,
      issues,
      isComplete: issues.length === 0 && (complexity >= 20 || this.isSimpleComponent(fileName))
    };
  }

  /**
   * 检查路由配置完整性
   */
  async checkRouteCompleteness() {
    console.log('🛣️ 检查路由配置完整性...');

    const routeFiles = [
      path.join(this.projectRoot, 'frontend/src/App.tsx'),
      path.join(this.projectRoot, 'frontend/App.tsx'),
      path.join(this.projectRoot, 'frontend/src/router.tsx'),
      path.join(this.projectRoot, 'frontend/router.tsx')
    ];

    for (const routeFile of routeFiles) {
      if (fs.existsSync(routeFile)) {
        const content = fs.readFileSync(routeFile, 'utf8');
        const routes = this.extractRoutes(content);
        
        for (const route of routes) {
          const analysis = await this.analyzeRouteImplementation(route, routeFile);
          this.completenessReport.frontend.routes.push(analysis);
          
          if (analysis.issues.length > 0) {
            analysis.issues.forEach(issue => this.addIssue('frontend_route', issue, routeFile));
          }
        }
      }
    }

    console.log(`   检查了 ${this.completenessReport.frontend.routes.length} 个路由\n`);
  }

  /**
   * 检查后端功能实现
   */
  async checkBackendImplementation() {
    console.log('⚙️ 检查后端功能实现...');

    // 检查路由文件
    const routesDir = path.join(this.projectRoot, 'backend/routes');
    if (fs.existsSync(routesDir)) {
      const routeFiles = this.getFilesRecursively(routesDir, ['.js', '.ts']);
      
      for (const routeFile of routeFiles) {
        const analysis = await this.analyzeBackendRoute(routeFile);
        this.completenessReport.backend.routes.push(analysis);
        
        if (analysis.issues.length > 0) {
          analysis.issues.forEach(issue => this.addIssue('backend_route', issue, routeFile));
        }
      }
    }

    // 检查服务文件
    const servicesDir = path.join(this.projectRoot, 'backend/services');
    if (fs.existsSync(servicesDir)) {
      const serviceFiles = this.getFilesRecursively(servicesDir, ['.js', '.ts']);
      
      for (const serviceFile of serviceFiles) {
        const analysis = await this.analyzeBackendService(serviceFile);
        this.completenessReport.backend.services.push(analysis);
        
        if (analysis.issues.length > 0) {
          analysis.issues.forEach(issue => this.addIssue('backend_service', issue, serviceFile));
        }
      }
    }

    console.log(`   检查了 ${this.completenessReport.backend.routes.length} 个后端路由`);
    console.log(`   检查了 ${this.completenessReport.backend.services.length} 个后端服务\n`);
  }

  /**
   * 检查API集成完整性
   */
  async checkApiIntegration() {
    console.log('🔗 检查API集成完整性...');

    // 检查前端API服务
    const apiServicesDir = path.join(this.projectRoot, 'frontend/services');
    if (fs.existsSync(apiServicesDir)) {
      const apiFiles = this.getFilesRecursively(apiServicesDir, ['.ts', '.js']);
      
      for (const apiFile of apiFiles) {
        const analysis = await this.analyzeApiService(apiFile);
        this.completenessReport.frontend.services.push(analysis);
        
        if (analysis.issues.length > 0) {
          analysis.issues.forEach(issue => this.addIssue('api_integration', issue, apiFile));
        }
      }
    }

    console.log(`   检查了 ${this.completenessReport.frontend.services.length} 个API服务\n`);
  }

  /**
   * 检查核心业务流程
   */
  async checkBusinessFlows() {
    console.log('🔄 检查核心业务流程...');

    const businessFlows = [
      {
        name: '用户认证流程',
        components: ['Login', 'Register', 'AuthService'],
        endpoints: ['/api/auth/login', '/api/auth/register', '/api/auth/logout']
      },
      {
        name: '测试执行流程',
        components: ['TestRunner', 'TestConfig', 'TestResults'],
        endpoints: ['/api/tests/run', '/api/tests/results', '/api/tests/config']
      },
      {
        name: '数据管理流程',
        components: ['DataTable', 'DataForm', 'DataService'],
        endpoints: ['/api/data/list', '/api/data/create', '/api/data/update', '/api/data/delete']
      }
    ];

    for (const flow of businessFlows) {
      const analysis = this.analyzeBusinessFlow(flow);
      this.completenessReport.integration.dataFlow.push(analysis);
      
      if (analysis.issues.length > 0) {
        analysis.issues.forEach(issue => this.addIssue('business_flow', issue, flow.name));
      }
    }

    console.log(`   检查了 ${businessFlows.length} 个核心业务流程\n`);
  }

  /**
   * 工具方法
   */
  isPlaceholderComponent(content) {
    const placeholderPatterns = [
      /return\s*<div>\s*<\/div>/,
      /return\s*<div>.*TODO.*<\/div>/,
      /return\s*<div>.*Coming Soon.*<\/div>/,
      /return\s*<div>.*Placeholder.*<\/div>/,
      /return\s*null/,
      /return\s*<>\s*<\/>/
    ];
    
    return placeholderPatterns.some(pattern => pattern.test(content));
  }

  isPageLevelComponent(filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    const pagePatterns = [
      /Page$/,
      /Dashboard$/,
      /Home$/,
      /Login$/,
      /Register$/,
      /Profile$/,
      /Settings$/,
      /Test.*$/,
      /Report.*$/,
      /Management$/
    ];
    
    return pagePatterns.some(pattern => pattern.test(fileName));
  }

  isSimpleComponent(fileName) {
    const simpleComponents = [
      'Button', 'Input', 'Label', 'Icon', 'Spinner', 'Loading',
      'Modal', 'Tooltip', 'Badge', 'Avatar', 'Divider'
    ];
    
    return simpleComponents.some(simple => fileName.includes(simple));
  }

  calculateFunctionalityScore(content, fileName) {
    let score = 0;
    
    // 基础实现 (20分)
    if (!this.isPlaceholderComponent(content)) score += 20;
    
    // 状态管理 (15分)
    if (content.includes('useState') || content.includes('useReducer')) score += 15;
    
    // API调用 (15分)
    if (content.includes('fetch') || content.includes('axios') || content.includes('api.')) score += 15;
    
    // 错误处理 (10分)
    if (content.includes('try') || content.includes('catch') || content.includes('error')) score += 10;
    
    // 加载状态 (10分)
    if (content.includes('loading') || content.includes('Loading')) score += 10;
    
    // 表单处理 (10分)
    if (content.includes('onSubmit') || content.includes('formData') || content.includes('validation')) score += 10;
    
    // 路由导航 (10分)
    if (content.includes('useNavigate') || content.includes('useRouter') || content.includes('Link')) score += 10;
    
    // 复杂业务逻辑 (10分)
    const businessLogicPatterns = [
      /useEffect.*\[.*\]/,
      /useMemo/,
      /useCallback/,
      /switch.*case/,
      /if.*else.*if/
    ];
    if (businessLogicPatterns.some(pattern => pattern.test(content))) score += 10;
    
    return Math.min(score, 100);
  }

  calculateComponentComplexity(content) {
    let complexity = 0;
    
    // JSX元素数量
    const jsxElements = (content.match(/<[^\/][^>]*>/g) || []).length;
    complexity += jsxElements * 2;
    
    // 事件处理器数量
    const eventHandlers = (content.match(/on[A-Z][a-zA-Z]*=/g) || []).length;
    complexity += eventHandlers * 5;
    
    // Hook使用数量
    const hooks = (content.match(/use[A-Z][a-zA-Z]*\(/g) || []).length;
    complexity += hooks * 3;
    
    // 条件渲染数量
    const conditionals = (content.match(/\{.*\?.*:.*\}/g) || []).length;
    complexity += conditionals * 4;
    
    return complexity;
  }

  extractRoutes(content) {
    const routes = [];
    
    // React Router路由提取
    const routeMatches = content.match(/<Route[^>]*>/g) || [];
    
    for (const match of routeMatches) {
      const pathMatch = match.match(/path=["']([^"']+)["']/);
      const componentMatch = match.match(/(?:component|element)=\{?([^}]+)\}?/);
      
      if (pathMatch) {
        routes.push({
          path: pathMatch[1],
          component: componentMatch ? componentMatch[1] : 'Unknown',
          raw: match
        });
      }
    }
    
    return routes;
  }

  analyzeRouteImplementation(route, routeFile) {
    const issues = [];
    
    // 检查组件是否存在
    const componentExists = this.checkComponentExists(route.component);
    if (!componentExists) {
      issues.push(`路由组件 ${route.component} 不存在`);
    }
    
    return {
      path: route.path,
      component: route.component,
      file: path.relative(this.projectRoot, routeFile),
      componentExists,
      issues,
      isComplete: issues.length === 0
    };
  }

  analyzeBackendRoute(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const issues = [];
    
    // 检查是否有实际的路由处理
    const hasRouteHandlers = content.includes('router.') || content.includes('app.');
    if (!hasRouteHandlers) {
      issues.push('文件中没有发现路由处理器');
    }
    
    // 检查是否有错误处理
    const hasErrorHandling = content.includes('try') || content.includes('catch') || content.includes('error');
    if (!hasErrorHandling) {
      issues.push('缺少错误处理机制');
    }
    
    // 检查是否有输入验证
    const hasValidation = content.includes('validate') || content.includes('joi') || content.includes('schema');
    
    return {
      file: path.relative(this.projectRoot, filePath),
      fileName,
      hasRouteHandlers,
      hasErrorHandling,
      hasValidation,
      issues,
      isComplete: issues.length === 0
    };
  }

  analyzeBackendService(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const issues = [];
    
    // 检查是否只是空文件或占位符
    if (content.trim().length < 100) {
      issues.push('服务文件内容过少，可能只是占位符');
    }
    
    // 检查是否有类或函数定义
    const hasImplementation = content.includes('class ') || content.includes('function ') || content.includes('const ') || content.includes('exports');
    if (!hasImplementation) {
      issues.push('服务文件缺少实际实现');
    }
    
    return {
      file: path.relative(this.projectRoot, filePath),
      fileName,
      hasImplementation,
      issues,
      isComplete: issues.length === 0
    };
  }

  analyzeApiService(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const issues = [];
    
    // 检查是否有API调用
    const hasApiCalls = content.includes('fetch') || content.includes('axios') || content.includes('request');
    if (!hasApiCalls) {
      issues.push('API服务文件中没有发现API调用');
    }
    
    // 检查是否有错误处理
    const hasErrorHandling = content.includes('catch') || content.includes('error') || content.includes('throw');
    if (!hasErrorHandling) {
      issues.push('API服务缺少错误处理');
    }
    
    return {
      file: path.relative(this.projectRoot, filePath),
      fileName,
      hasApiCalls,
      hasErrorHandling,
      issues,
      isComplete: issues.length === 0
    };
  }

  analyzeBusinessFlow(flow) {
    const issues = [];
    
    // 检查组件是否存在
    const missingComponents = flow.components.filter(comp => !this.checkComponentExists(comp));
    if (missingComponents.length > 0) {
      issues.push(`缺少组件: ${missingComponents.join(', ')}`);
    }
    
    // 检查端点是否实现
    const missingEndpoints = flow.endpoints.filter(endpoint => !this.checkEndpointExists(endpoint));
    if (missingEndpoints.length > 0) {
      issues.push(`缺少API端点: ${missingEndpoints.join(', ')}`);
    }
    
    return {
      name: flow.name,
      components: flow.components,
      endpoints: flow.endpoints,
      missingComponents,
      missingEndpoints,
      issues,
      isComplete: issues.length === 0
    };
  }

  checkComponentExists(componentName) {
    const possiblePaths = [
      path.join(this.projectRoot, `frontend/components/${componentName}.tsx`),
      path.join(this.projectRoot, `frontend/components/${componentName}.jsx`),
      path.join(this.projectRoot, `frontend/pages/${componentName}.tsx`),
      path.join(this.projectRoot, `frontend/pages/${componentName}.jsx`),
      path.join(this.projectRoot, `frontend/src/components/${componentName}.tsx`),
      path.join(this.projectRoot, `frontend/src/pages/${componentName}.tsx`)
    ];
    
    return possiblePaths.some(p => fs.existsSync(p));
  }

  checkEndpointExists(endpoint) {
    // 简化的端点检查 - 在实际项目中可能需要更复杂的逻辑
    const routesDir = path.join(this.projectRoot, 'backend/routes');
    if (!fs.existsSync(routesDir)) return false;
    
    const routeFiles = this.getFilesRecursively(routesDir, ['.js', '.ts']);
    
    for (const routeFile of routeFiles) {
      const content = fs.readFileSync(routeFile, 'utf8');
      if (content.includes(endpoint)) {
        return true;
      }
    }
    
    return false;
  }

  getFilesRecursively(dir, extensions) {
    const files = [];
    
    if (!fs.existsSync(dir)) return files;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      if (item.startsWith('.') || item === 'node_modules') continue;
      
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getFilesRecursively(fullPath, extensions));
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  addIssue(category, description, file) {
    this.issues.push({
      category,
      description,
      file: typeof file === 'string' ? path.relative(this.projectRoot, file) : file,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 生成完整性报告
   */
  generateCompletenessReport() {
    const reportPath = path.join(this.projectRoot, 'functional-completeness-report.json');
    
    // 计算完整性统计
    const stats = {
      frontend: {
        pages: {
          total: this.completenessReport.frontend.pages.length,
          complete: this.completenessReport.frontend.pages.filter(p => p.isComplete).length,
          incomplete: this.completenessReport.frontend.pages.filter(p => !p.isComplete).length
        },
        components: {
          total: this.completenessReport.frontend.components.length,
          complete: this.completenessReport.frontend.components.filter(c => c.isComplete).length,
          incomplete: this.completenessReport.frontend.components.filter(c => !c.isComplete).length
        },
        routes: {
          total: this.completenessReport.frontend.routes.length,
          complete: this.completenessReport.frontend.routes.filter(r => r.isComplete).length,
          incomplete: this.completenessReport.frontend.routes.filter(r => !r.isComplete).length
        },
        services: {
          total: this.completenessReport.frontend.services.length,
          complete: this.completenessReport.frontend.services.filter(s => s.isComplete).length,
          incomplete: this.completenessReport.frontend.services.filter(s => !s.isComplete).length
        }
      },
      backend: {
        routes: {
          total: this.completenessReport.backend.routes.length,
          complete: this.completenessReport.backend.routes.filter(r => r.isComplete).length,
          incomplete: this.completenessReport.backend.routes.filter(r => !r.isComplete).length
        },
        services: {
          total: this.completenessReport.backend.services.length,
          complete: this.completenessReport.backend.services.filter(s => s.isComplete).length,
          incomplete: this.completenessReport.backend.services.filter(s => !s.isComplete).length
        }
      },
      integration: {
        businessFlows: {
          total: this.completenessReport.integration.dataFlow.length,
          complete: this.completenessReport.integration.dataFlow.filter(f => f.isComplete).length,
          incomplete: this.completenessReport.integration.dataFlow.filter(f => !f.isComplete).length
        }
      }
    };

    // 计算总体完整性分数
    const totalItems = stats.frontend.pages.total + stats.frontend.components.total + 
                      stats.frontend.routes.total + stats.frontend.services.total +
                      stats.backend.routes.total + stats.backend.services.total +
                      stats.integration.businessFlows.total;
    
    const completeItems = stats.frontend.pages.complete + stats.frontend.components.complete + 
                         stats.frontend.routes.complete + stats.frontend.services.complete +
                         stats.backend.routes.complete + stats.backend.services.complete +
                         stats.integration.businessFlows.complete;

    const completenessScore = totalItems > 0 ? Math.round((completeItems / totalItems) * 100) : 0;

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalItems,
        completeItems,
        incompleteItems: totalItems - completeItems,
        completenessScore,
        totalIssues: this.issues.length
      },
      statistics: stats,
      detailedResults: this.completenessReport,
      issues: this.issues,
      recommendations: this.generateRecommendations(stats, completenessScore)
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // 输出报告摘要
    console.log('📊 功能完整性检查报告:');
    console.log('==================================================');
    console.log(`⏱️  检查耗时: ${Math.round((Date.now() - this.startTime) / 1000)}秒`);
    console.log(`📁 检查项目: ${totalItems}个`);
    console.log(`✅ 完整实现: ${completeItems}个`);
    console.log(`❌ 不完整: ${totalItems - completeItems}个`);
    console.log(`🚨 发现问题: ${this.issues.length}个`);
    console.log('');
    console.log('📋 分类统计:');
    console.log(`   📄 前端页面: ${stats.frontend.pages.complete}/${stats.frontend.pages.total} 完整`);
    console.log(`   🧩 前端组件: ${stats.frontend.components.complete}/${stats.frontend.components.total} 完整`);
    console.log(`   🛣️  前端路由: ${stats.frontend.routes.complete}/${stats.frontend.routes.total} 完整`);
    console.log(`   🔗 API服务: ${stats.frontend.services.complete}/${stats.frontend.services.total} 完整`);
    console.log(`   ⚙️  后端路由: ${stats.backend.routes.complete}/${stats.backend.routes.total} 完整`);
    console.log(`   🔧 后端服务: ${stats.backend.services.complete}/${stats.backend.services.total} 完整`);
    console.log(`   🔄 业务流程: ${stats.integration.businessFlows.complete}/${stats.integration.businessFlows.total} 完整`);
    console.log('');
    console.log(`🎯 整体完整性评分: ${completenessScore}/100 ${this.getScoreEmoji(completenessScore)}`);
    console.log('');
    console.log(`📄 详细报告已保存: ${reportPath}`);
    console.log('==================================================');

    // 显示关键问题
    if (this.issues.length > 0) {
      console.log('\n🚨 关键问题 (前10个):');
      this.issues.slice(0, 10).forEach((issue, index) => {
        console.log(`   ${index + 1}. [${issue.category.toUpperCase()}] ${issue.description}`);
        console.log(`      文件: ${issue.file}`);
      });
      
      if (this.issues.length > 10) {
        console.log(`   ... 还有 ${this.issues.length - 10} 个问题，详见报告文件`);
      }
    }

    this.startTime = Date.now(); // 设置开始时间用于计算耗时
  }

  generateRecommendations(stats, completenessScore) {
    const recommendations = [];

    if (completenessScore < 50) {
      recommendations.push({
        priority: 'high',
        category: 'overall',
        description: '项目完整性较低，建议优先实现核心功能模块',
        actions: [
          '识别并实现关键业务流程',
          '补充缺失的页面组件实现',
          '完善API服务集成'
        ]
      });
    }

    if (stats.frontend.pages.incomplete > stats.frontend.pages.complete) {
      recommendations.push({
        priority: 'high',
        category: 'frontend_pages',
        description: '前端页面实现不完整，影响用户体验',
        actions: [
          '优先实现主要功能页面',
          '添加页面状态管理',
          '集成API调用和错误处理'
        ]
      });
    }

    if (stats.backend.routes.incomplete > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'backend_api',
        description: '后端API实现不完整，影响前后端集成',
        actions: [
          '完善API路由处理器',
          '添加输入验证和错误处理',
          '实现业务逻辑'
        ]
      });
    }

    if (stats.integration.businessFlows.incomplete > 0) {
      recommendations.push({
        priority: 'high',
        category: 'business_flows',
        description: '核心业务流程不完整，影响系统功能',
        actions: [
          '端到端实现关键业务流程',
          '确保前后端数据流通畅',
          '添加业务流程测试'
        ]
      });
    }

    return recommendations;
  }

  getScoreEmoji(score) {
    if (score >= 80) return '🟢';
    if (score >= 60) return '🟡';
    if (score >= 40) return '🟠';
    return '🔴';
  }
}

// 执行脚本
if (require.main === module) {
  const checker = new FunctionalCompletenessChecker();
  checker.startTime = Date.now();
  checker.execute().catch(error => {
    console.error('❌ 功能完整性检查失败:', error);
    process.exit(1);
  });
}

module.exports = FunctionalCompletenessChecker;
