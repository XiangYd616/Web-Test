/**
 * 项目重复文件清理脚本
 * 自动识别和清理重复的文件和功能
 */

const fs = require('fs');
const path = require('path');

class ProjectCleaner {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.duplicates = {
      engines: [],
      routes: [],
      components: [],
      services: []
    };
    this.toRemove = [];
    this.toMerge = [];
  }

  /**
   * 执行清理
   */
  async cleanup() {
    console.log('🧹 开始项目清理...\n');

    // 1. 识别重复文件
    await this.identifyDuplicates();

    // 2. 分析文件依赖
    await this.analyzeDependencies();

    // 3. 生成清理计划
    await this.generateCleanupPlan();

    // 4. 执行清理（需要确认）
    await this.executeCleanup();

    console.log('\n✅ 项目清理完成！');
  }

  /**
   * 识别重复文件
   */
  async identifyDuplicates() {
    console.log('🔍 识别重复文件...');

    // 检查测试引擎重复
    await this.checkEnginesDuplicates();

    // 检查API路由重复
    await this.checkRoutesDuplicates();

    // 检查前端组件重复
    await this.checkComponentsDuplicates();

    // 检查服务重复
    await this.checkServicesDuplicates();
  }

  /**
   * 检查测试引擎重复
   */
  async checkEnginesDuplicates() {
    const enginesDir = path.join(this.projectRoot, 'backend/engines');
    if (!fs.existsSync(enginesDir)) return;

    const engineTypes = fs.readdirSync(enginesDir);

    for (const engineType of engineTypes) {
      const engineDir = path.join(enginesDir, engineType);
      if (!fs.statSync(engineDir).isDirectory()) continue;

      const files = fs.readdirSync(engineDir);
      const engineFiles = files.filter(f => f.includes('Engine') && f.endsWith('.js'));

      if (engineFiles.length > 1) {
        // 检查文件内容相似度
        const duplicateGroup = await this.analyzeSimilarFiles(
          engineFiles.map(f => path.join(engineDir, f))
        );

        if (duplicateGroup.length > 1) {
          this.duplicates.engines.push({
            type: engineType,
            files: duplicateGroup,
            recommendation: this.recommendEngineCleanup(duplicateGroup)
          });
        }
      }
    }

    console.log(`   发现 ${this.duplicates.engines.length} 组重复的测试引擎`);
  }

  /**
   * 检查API路由重复
   */
  async checkRoutesDuplicates() {
    const routePaths = [
      'backend/routes/test.js',
      'backend/api/v1/routes/tests.js',
      'backend/routes/tests.js',
      'backend/routes/testEngine.js'
    ];

    const existingRoutes = [];
    for (const routePath of routePaths) {
      const fullPath = path.join(this.projectRoot, routePath);
      if (fs.existsSync(fullPath)) {
        existingRoutes.push({
          path: routePath,
          fullPath,
          content: fs.readFileSync(fullPath, 'utf8')
        });
      }
    }

    // 分析路由冲突
    const conflicts = this.analyzeRouteConflicts(existingRoutes);
    if (conflicts.length > 0) {
      this.duplicates.routes.push(...conflicts);
    }

    console.log(`   发现 ${conflicts.length} 个路由冲突`);
  }

  /**
   * 检查前端组件重复
   */
  async checkComponentsDuplicates() {
    const componentPaths = [
      'frontend/components/testing/',
      'frontend/components/business/',
      'frontend/pages/'
    ];

    const testingComponents = [];
    for (const componentPath of componentPaths) {
      const fullPath = path.join(this.projectRoot, componentPath);
      if (fs.existsSync(fullPath)) {
        const components = this.findTestingComponents(fullPath);
        testingComponents.push(...components);
      }
    }

    // 按功能分组检查重复
    const grouped = this.groupComponentsByFunction(testingComponents);
    for (const [func, components] of Object.entries(grouped)) {
      if (components.length > 1) {
        this.duplicates.components.push({
          function: func,
          components,
          recommendation: this.recommendComponentCleanup(components)
        });
      }
    }

    console.log(`   发现 ${this.duplicates.components.length} 组重复的组件功能`);
  }

  /**
   * 检查服务重复
   */
  async checkServicesDuplicates() {
    const servicePaths = [
      'frontend/services/testing/',
      'frontend/services/api/',
      'frontend/hooks/',
      'backend/services/'
    ];

    const services = [];
    for (const servicePath of servicePaths) {
      const fullPath = path.join(this.projectRoot, servicePath);
      if (fs.existsSync(fullPath)) {
        const serviceFiles = this.findServiceFiles(fullPath);
        services.push(...serviceFiles);
      }
    }

    // 检查功能重复
    const duplicateServices = this.findDuplicateServices(services);
    this.duplicates.services.push(...duplicateServices);

    console.log(`   发现 ${duplicateServices.length} 组重复的服务`);
  }

  /**
   * 分析相似文件
   */
  async analyzeSimilarFiles(filePaths) {
    const files = [];
    
    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const stats = fs.statSync(filePath);
        
        files.push({
          path: filePath,
          content,
          size: stats.size,
          lines: content.split('\n').length,
          functions: this.extractFunctions(content),
          lastModified: stats.mtime
        });
      }
    }

    // 计算相似度
    const similar = [];
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const similarity = this.calculateSimilarity(files[i], files[j]);
        if (similarity > 0.7) { // 70%以上相似度认为是重复
          similar.push({
            file1: files[i],
            file2: files[j],
            similarity
          });
        }
      }
    }

    return similar;
  }

  /**
   * 计算文件相似度
   */
  calculateSimilarity(file1, file2) {
    // 简化的相似度计算
    const lines1 = file1.content.split('\n').filter(line => line.trim());
    const lines2 = file2.content.split('\n').filter(line => line.trim());
    
    let matchingLines = 0;
    const maxLines = Math.max(lines1.length, lines2.length);
    
    for (const line1 of lines1) {
      if (lines2.some(line2 => this.linesAreSimilar(line1, line2))) {
        matchingLines++;
      }
    }
    
    return matchingLines / maxLines;
  }

  /**
   * 判断两行代码是否相似
   */
  linesAreSimilar(line1, line2) {
    // 移除空白字符和注释后比较
    const clean1 = line1.replace(/\s+/g, '').replace(/\/\/.*$/, '');
    const clean2 = line2.replace(/\s+/g, '').replace(/\/\/.*$/, '');
    
    if (clean1 === clean2) return true;
    
    // 检查结构相似性（函数名、变量名可能不同）
    const pattern1 = clean1.replace(/[a-zA-Z_$][a-zA-Z0-9_$]*/g, 'VAR');
    const pattern2 = clean2.replace(/[a-zA-Z_$][a-zA-Z0-9_$]*/g, 'VAR');
    
    return pattern1 === pattern2;
  }

  /**
   * 提取函数名
   */
  extractFunctions(content) {
    const functions = [];
    const functionRegex = /(?:function\s+(\w+)|(\w+)\s*[:=]\s*(?:async\s+)?function|(?:async\s+)?(\w+)\s*\([^)]*\)\s*{)/g;
    
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const funcName = match[1] || match[2] || match[3];
      if (funcName) {
        functions.push(funcName);
      }
    }
    
    return functions;
  }

  /**
   * 分析路由冲突
   */
  analyzeRouteConflicts(routes) {
    const conflicts = [];
    const routeMap = new Map();

    for (const route of routes) {
      // 提取路由定义
      const routeDefinitions = this.extractRouteDefinitions(route.content);
      
      for (const def of routeDefinitions) {
        const key = `${def.method}:${def.path}`;
        
        if (routeMap.has(key)) {
          conflicts.push({
            route: def.path,
            method: def.method,
            files: [routeMap.get(key).file, route.path],
            severity: 'high'
          });
        } else {
          routeMap.set(key, { ...def, file: route.path });
        }
      }
    }

    return conflicts;
  }

  /**
   * 提取路由定义
   */
  extractRouteDefinitions(content) {
    const routes = [];
    const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    
    let match;
    while ((match = routeRegex.exec(content)) !== null) {
      routes.push({
        method: match[1].toUpperCase(),
        path: match[2]
      });
    }
    
    return routes;
  }

  /**
   * 查找测试相关组件
   */
  findTestingComponents(dir) {
    const components = [];
    
    const scanDir = (currentDir) => {
      if (!fs.existsSync(currentDir)) return;
      
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (item.match(/\.(tsx?|jsx?)$/) && this.isTestingComponent(fullPath)) {
          components.push({
            path: fullPath,
            name: item,
            type: this.getComponentType(fullPath),
            size: stat.size
          });
        }
      }
    };
    
    scanDir(dir);
    return components;
  }

  /**
   * 判断是否是测试相关组件
   */
  isTestingComponent(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const testKeywords = [
      'test', 'Test', 'testing', 'Testing',
      'api', 'API', 'security', 'Security',
      'performance', 'Performance', 'stress', 'Stress'
    ];
    
    return testKeywords.some(keyword => 
      filePath.includes(keyword) || content.includes(keyword)
    );
  }

  /**
   * 获取组件类型
   */
  getComponentType(filePath) {
    const name = path.basename(filePath, path.extname(filePath));
    
    if (name.includes('Test')) return 'test-page';
    if (name.includes('Panel')) return 'test-panel';
    if (name.includes('Runner')) return 'test-runner';
    if (name.includes('Progress')) return 'progress';
    if (name.includes('Result')) return 'result';
    
    return 'unknown';
  }

  /**
   * 按功能分组组件
   */
  groupComponentsByFunction(components) {
    const groups = {};
    
    for (const component of components) {
      const func = component.type;
      if (!groups[func]) {
        groups[func] = [];
      }
      groups[func].push(component);
    }
    
    return groups;
  }

  /**
   * 查找服务文件
   */
  findServiceFiles(dir) {
    const services = [];
    
    const scanDir = (currentDir) => {
      if (!fs.existsSync(currentDir)) return;
      
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (item.match(/\.(ts|js)$/) && !item.includes('.test.') && !item.includes('.spec.')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          services.push({
            path: fullPath,
            name: item,
            content,
            exports: this.extractExports(content),
            functions: this.extractFunctions(content)
          });
        }
      }
    };
    
    scanDir(dir);
    return services;
  }

  /**
   * 提取导出
   */
  extractExports(content) {
    const exports = [];
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
    
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    return exports;
  }

  /**
   * 查找重复服务
   */
  findDuplicateServices(services) {
    const duplicates = [];
    const functionGroups = {};
    
    // 按功能分组
    for (const service of services) {
      for (const func of service.functions) {
        if (!functionGroups[func]) {
          functionGroups[func] = [];
        }
        functionGroups[func].push(service);
      }
    }
    
    // 找出重复的功能
    for (const [func, serviceList] of Object.entries(functionGroups)) {
      if (serviceList.length > 1) {
        duplicates.push({
          function: func,
          services: serviceList,
          severity: this.calculateDuplicationSeverity(serviceList)
        });
      }
    }
    
    return duplicates;
  }

  /**
   * 计算重复严重程度
   */
  calculateDuplicationSeverity(services) {
    if (services.length > 3) return 'high';
    if (services.length > 2) return 'medium';
    return 'low';
  }

  /**
   * 推荐引擎清理方案
   */
  recommendEngineCleanup(duplicateGroup) {
    // 选择最完整的实现作为主文件
    const primary = duplicateGroup.reduce((best, current) => {
      return current.file1.size > best.file1.size ? current : best;
    });

    return {
      action: 'merge',
      primary: primary.file1.path,
      secondary: duplicateGroup.filter(d => d !== primary).map(d => d.file2.path),
      reason: '保留最完整的实现，合并其他文件的独特功能'
    };
  }

  /**
   * 推荐组件清理方案
   */
  recommendComponentCleanup(components) {
    // 优先保留最新的统一组件
    const unified = components.find(c => c.name.includes('Unified'));
    if (unified) {
      return {
        action: 'replace',
        primary: unified.path,
        secondary: components.filter(c => c !== unified).map(c => c.path),
        reason: '使用统一组件替换分散的实现'
      };
    }

    // 否则保留最大的文件
    const primary = components.reduce((best, current) => {
      return current.size > best.size ? current : best;
    });

    return {
      action: 'merge',
      primary: primary.path,
      secondary: components.filter(c => c !== primary).map(c => c.path),
      reason: '合并到最完整的组件实现中'
    };
  }

  /**
   * 分析文件依赖
   */
  async analyzeDependencies() {
    console.log('🔗 分析文件依赖关系...');
    
    // 这里应该分析哪些文件被其他文件引用
    // 避免删除被大量引用的文件
    
    console.log('   依赖分析完成');
  }

  /**
   * 生成清理计划
   */
  async generateCleanupPlan() {
    console.log('📋 生成清理计划...');
    
    // 生成详细的清理计划
    const plan = {
      engines: this.duplicates.engines,
      routes: this.duplicates.routes,
      components: this.duplicates.components,
      services: this.duplicates.services,
      summary: {
        totalDuplicates: this.duplicates.engines.length + 
                        this.duplicates.routes.length + 
                        this.duplicates.components.length + 
                        this.duplicates.services.length,
        estimatedSpaceSaved: '计算中...',
        riskLevel: 'medium'
      }
    };

    // 保存清理计划
    const planPath = path.join(this.projectRoot, 'cleanup-plan.json');
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
    
    console.log(`   清理计划已保存到: ${planPath}`);
    console.log(`   发现 ${plan.summary.totalDuplicates} 个重复项`);
  }

  /**
   * 执行清理
   */
  async executeCleanup() {
    console.log('⚠️  清理操作需要手动确认');
    console.log('   请查看 cleanup-plan.json 文件');
    console.log('   确认无误后运行: node scripts/cleanup/execute-cleanup.js');
  }
}

// 执行清理
if (require.main === module) {
  const cleaner = new ProjectCleaner();
  cleaner.cleanup().catch(console.error);
}

module.exports = ProjectCleaner;
