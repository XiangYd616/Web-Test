#!/usr/bin/env node

/**
 * 🔍 Test-Web测试工具重复和耦合分析器
 * 专门分析测试相关Hook、组件和服务的重复问题
 */

const fs = require('fs');
const path = require('path');

class TestToolsDuplicationAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.results = {
      hooks: {
        duplicates: [],
        coupling: [],
        recommendations: []
      },
      components: {
        duplicates: [],
        coupling: [],
        recommendations: []
      },
      services: {
        duplicates: [],
        coupling: [],
        recommendations: []
      },
      summary: {
        totalDuplicates: 0,
        totalCouplingIssues: 0,
        codeReductionPotential: 0
      }
    };
  }

  /**
   * 运行完整分析
   */
  async analyze() {
    console.log('🔍 开始测试工具重复和耦合分析...\n');

    await this.analyzeHooks();
    await this.analyzeComponents();
    await this.analyzeServices();
    this.generateSummary();
    this.generateRecommendations();

    console.log('📊 分析完成！\n');
    this.printResults();
  }

  /**
   * 分析Hook重复
   */
  async analyzeHooks() {
    console.log('🎣 分析Hook重复问题...');
    
    const hooksDir = path.join(this.projectRoot, 'frontend/hooks');
    const testHooks = this.findTestHooks(hooksDir);
    
    // 分析功能重复
    const duplicateGroups = this.groupByFunctionality(testHooks);
    
    for (const [functionality, hooks] of Object.entries(duplicateGroups)) {
      if (hooks.length > 1) {
        const analysis = await this.analyzeHookSimilarity(hooks);
        this.results.hooks.duplicates.push({
          functionality,
          hooks: hooks.map(h => h.name),
          similarity: analysis.similarity,
          duplicatedLines: analysis.duplicatedLines,
          recommendation: this.getHookRecommendation(functionality, hooks)
        });
      }
    }

    console.log(`   发现 ${this.results.hooks.duplicates.length} 组重复Hook`);
  }

  /**
   * 分析组件重复
   */
  async analyzeComponents() {
    console.log('🧩 分析组件重复问题...');
    
    const componentsDir = path.join(this.projectRoot, 'frontend/components');
    const testComponents = this.findTestComponents(componentsDir);
    
    // 分析功能重复
    const duplicateGroups = this.groupComponentsByFunction(testComponents);
    
    for (const [functionality, components] of Object.entries(duplicateGroups)) {
      if (components.length > 1) {
        const analysis = await this.analyzeComponentSimilarity(components);
        this.results.components.duplicates.push({
          functionality,
          components: components.map(c => c.name),
          similarity: analysis.similarity,
          duplicatedLines: analysis.duplicatedLines,
          recommendation: this.getComponentRecommendation(functionality, components)
        });
      }
    }

    console.log(`   发现 ${this.results.components.duplicates.length} 组重复组件`);
  }

  /**
   * 分析服务重复
   */
  async analyzeServices() {
    console.log('⚙️ 分析服务重复问题...');
    
    const servicesDir = path.join(this.projectRoot, 'frontend/services');
    const backendServicesDir = path.join(this.projectRoot, 'backend/services');
    
    const testServices = [
      ...this.findTestServices(servicesDir),
      ...this.findTestServices(backendServicesDir)
    ];
    
    // 分析功能重复
    const duplicateGroups = this.groupServicesByFunction(testServices);
    
    for (const [functionality, services] of Object.entries(duplicateGroups)) {
      if (services.length > 1) {
        const analysis = await this.analyzeServiceSimilarity(services);
        this.results.services.duplicates.push({
          functionality,
          services: services.map(s => s.name),
          similarity: analysis.similarity,
          duplicatedLines: analysis.duplicatedLines,
          recommendation: this.getServiceRecommendation(functionality, services)
        });
      }
    }

    console.log(`   发现 ${this.results.services.duplicates.length} 组重复服务`);
  }

  /**
   * 查找测试相关Hook
   */
  findTestHooks(dir) {
    const hooks = [];
    
    if (!fs.existsSync(dir)) return hooks;
    
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      if (file.endsWith('.ts') && this.isTestHook(file)) {
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        hooks.push({
          name: file,
          path: filePath,
          content,
          size: content.length,
          lines: content.split('\n').length,
          exports: this.extractExports(content),
          imports: this.extractImports(content)
        });
      }
    }
    
    return hooks;
  }

  /**
   * 查找测试相关组件
   */
  findTestComponents(dir) {
    const components = [];
    
    const scanDir = (currentDir) => {
      if (!fs.existsSync(currentDir)) return;
      
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (item.endsWith('.tsx') && this.isTestComponent(item)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          components.push({
            name: item,
            path: fullPath,
            content,
            size: content.length,
            lines: content.split('\n').length,
            exports: this.extractExports(content),
            imports: this.extractImports(content)
          });
        }
      }
    };
    
    scanDir(dir);
    return components;
  }

  /**
   * 查找测试相关服务
   */
  findTestServices(dir) {
    const services = [];
    
    const scanDir = (currentDir) => {
      if (!fs.existsSync(currentDir)) return;
      
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if ((item.endsWith('.ts') || item.endsWith('.js')) && this.isTestService(item)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          services.push({
            name: item,
            path: fullPath,
            content,
            size: content.length,
            lines: content.split('\n').length,
            exports: this.extractExports(content),
            imports: this.extractImports(content)
          });
        }
      }
    };
    
    scanDir(dir);
    return services;
  }

  /**
   * 判断是否为测试Hook
   */
  isTestHook(filename) {
    const testKeywords = [
      'test', 'Test', 'testing', 'Testing',
      'engine', 'Engine', 'execution', 'Execution',
      'state', 'State', 'universal', 'Universal',
      'unified', 'Unified'
    ];
    
    return testKeywords.some(keyword => filename.includes(keyword));
  }

  /**
   * 判断是否为测试组件
   */
  isTestComponent(filename) {
    const testKeywords = [
      'Test', 'testing', 'Testing',
      'Engine', 'engine', 'Executor', 'executor',
      'Panel', 'panel', 'Runner', 'runner',
      'Unified', 'unified', 'Modern', 'modern'
    ];
    
    return testKeywords.some(keyword => filename.includes(keyword));
  }

  /**
   * 判断是否为测试服务
   */
  isTestService(filename) {
    const testKeywords = [
      'test', 'Test', 'testing', 'Testing',
      'engine', 'Engine', 'service', 'Service',
      'manager', 'Manager', 'unified', 'Unified'
    ];
    
    return testKeywords.some(keyword => filename.includes(keyword));
  }

  /**
   * 按功能分组Hook
   */
  groupByFunctionality(hooks) {
    const groups = {};
    
    for (const hook of hooks) {
      const functionality = this.getHookFunctionality(hook.name);
      if (!groups[functionality]) {
        groups[functionality] = [];
      }
      groups[functionality].push(hook);
    }
    
    return groups;
  }

  /**
   * 获取Hook功能类型
   */
  getHookFunctionality(filename) {
    if (filename.includes('Engine') || filename.includes('engine')) {
      return 'TestEngine';
    }
    if (filename.includes('State') || filename.includes('state')) {
      return 'TestState';
    }
    if (filename.includes('Execution') || filename.includes('execution')) {
      return 'TestExecution';
    }
    if (filename.includes('Result') || filename.includes('result')) {
      return 'TestResult';
    }
    return 'Other';
  }

  /**
   * 按功能分组组件
   */
  groupComponentsByFunction(components) {
    const groups = {};
    
    for (const component of components) {
      const functionality = this.getComponentFunctionality(component.name);
      if (!groups[functionality]) {
        groups[functionality] = [];
      }
      groups[functionality].push(component);
    }
    
    return groups;
  }

  /**
   * 获取组件功能类型
   */
  getComponentFunctionality(filename) {
    if (filename.includes('Panel') || filename.includes('panel')) {
      return 'TestPanel';
    }
    if (filename.includes('Executor') || filename.includes('executor')) {
      return 'TestExecutor';
    }
    if (filename.includes('Runner') || filename.includes('runner')) {
      return 'TestRunner';
    }
    if (filename.includes('Monitor') || filename.includes('monitor')) {
      return 'TestMonitor';
    }
    return 'Other';
  }

  /**
   * 按功能分组服务
   */
  groupServicesByFunction(services) {
    const groups = {};
    
    for (const service of services) {
      const functionality = this.getServiceFunctionality(service.name);
      if (!groups[functionality]) {
        groups[functionality] = [];
      }
      groups[functionality].push(service);
    }
    
    return groups;
  }

  /**
   * 获取服务功能类型
   */
  getServiceFunctionality(filename) {
    if (filename.includes('Engine') || filename.includes('engine')) {
      return 'TestEngine';
    }
    if (filename.includes('Manager') || filename.includes('manager')) {
      return 'TestManager';
    }
    if (filename.includes('Service') || filename.includes('service')) {
      return 'TestService';
    }
    return 'Other';
  }

  /**
   * 分析Hook相似度
   */
  async analyzeHookSimilarity(hooks) {
    // 简化的相似度分析
    let totalSimilarity = 0;
    let duplicatedLines = 0;
    
    for (let i = 0; i < hooks.length; i++) {
      for (let j = i + 1; j < hooks.length; j++) {
        const similarity = this.calculateSimilarity(hooks[i].content, hooks[j].content);
        totalSimilarity += similarity;
        duplicatedLines += Math.floor(Math.min(hooks[i].lines, hooks[j].lines) * similarity / 100);
      }
    }
    
    const avgSimilarity = hooks.length > 1 ? totalSimilarity / (hooks.length * (hooks.length - 1) / 2) : 0;
    
    return {
      similarity: Math.round(avgSimilarity),
      duplicatedLines
    };
  }

  /**
   * 分析组件相似度
   */
  async analyzeComponentSimilarity(components) {
    return this.analyzeHookSimilarity(components); // 使用相同的逻辑
  }

  /**
   * 分析服务相似度
   */
  async analyzeServiceSimilarity(services) {
    return this.analyzeHookSimilarity(services); // 使用相同的逻辑
  }

  /**
   * 计算代码相似度
   */
  calculateSimilarity(content1, content2) {
    const lines1 = content1.split('\n').filter(line => line.trim());
    const lines2 = content2.split('\n').filter(line => line.trim());
    
    let matchingLines = 0;
    
    for (const line1 of lines1) {
      for (const line2 of lines2) {
        if (this.linesAreSimilar(line1, line2)) {
          matchingLines++;
          break;
        }
      }
    }
    
    const totalLines = Math.max(lines1.length, lines2.length);
    return totalLines > 0 ? (matchingLines / totalLines) * 100 : 0;
  }

  /**
   * 判断两行代码是否相似
   */
  linesAreSimilar(line1, line2) {
    // 移除空格和注释进行比较
    const clean1 = line1.replace(/\s+/g, '').replace(/\/\/.*$/, '');
    const clean2 = line2.replace(/\s+/g, '').replace(/\/\/.*$/, '');
    
    if (clean1 === clean2) return true;
    
    // 检查结构相似性
    const similarity = this.calculateStringSimilarity(clean1, clean2);
    return similarity > 0.8;
  }

  /**
   * 计算字符串相似度
   */
  calculateStringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 计算编辑距离
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * 提取导出
   */
  extractExports(content) {
    const exports = [];
    const exportRegex = /export\s+(?:const|function|class|interface|type)\s+(\w+)/g;
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    return exports;
  }

  /**
   * 提取导入
   */
  extractImports(content) {
    const imports = [];
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  /**
   * 获取Hook重构建议
   */
  getHookRecommendation(functionality, hooks) {
    const sortedHooks = hooks.sort((a, b) => b.lines - a.lines);
    const mainHook = sortedHooks[0];
    const duplicateHooks = sortedHooks.slice(1);
    
    return {
      action: 'merge',
      keepFile: mainHook.name,
      removeFiles: duplicateHooks.map(h => h.name),
      reason: `保留功能最完整的${mainHook.name}，删除重复的Hook`
    };
  }

  /**
   * 获取组件重构建议
   */
  getComponentRecommendation(functionality, components) {
    const sortedComponents = components.sort((a, b) => b.lines - a.lines);
    const mainComponent = sortedComponents[0];
    const duplicateComponents = sortedComponents.slice(1);
    
    return {
      action: 'merge',
      keepFile: mainComponent.name,
      removeFiles: duplicateComponents.map(c => c.name),
      reason: `保留功能最完整的${mainComponent.name}，删除重复的组件`
    };
  }

  /**
   * 获取服务重构建议
   */
  getServiceRecommendation(functionality, services) {
    const sortedServices = services.sort((a, b) => b.lines - a.lines);
    const mainService = sortedServices[0];
    const duplicateServices = sortedServices.slice(1);
    
    return {
      action: 'merge',
      keepFile: mainService.name,
      removeFiles: duplicateServices.map(s => s.name),
      reason: `保留功能最完整的${mainService.name}，删除重复的服务`
    };
  }

  /**
   * 生成汇总统计
   */
  generateSummary() {
    this.results.summary.totalDuplicates = 
      this.results.hooks.duplicates.length +
      this.results.components.duplicates.length +
      this.results.services.duplicates.length;
    
    // 计算代码减少潜力
    let totalDuplicatedLines = 0;
    
    for (const group of this.results.hooks.duplicates) {
      totalDuplicatedLines += group.duplicatedLines;
    }
    for (const group of this.results.components.duplicates) {
      totalDuplicatedLines += group.duplicatedLines;
    }
    for (const group of this.results.services.duplicates) {
      totalDuplicatedLines += group.duplicatedLines;
    }
    
    this.results.summary.codeReductionPotential = totalDuplicatedLines;
  }

  /**
   * 生成重构建议
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Hook重构建议
    if (this.results.hooks.duplicates.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'hooks',
        title: 'Hook层重构',
        description: `发现${this.results.hooks.duplicates.length}组重复Hook，建议合并统一`
      });
    }
    
    // 组件重构建议
    if (this.results.components.duplicates.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'components',
        title: '组件层重构',
        description: `发现${this.results.components.duplicates.length}组重复组件，建议合并优化`
      });
    }
    
    // 服务重构建议
    if (this.results.services.duplicates.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'services',
        title: '服务层重构',
        description: `发现${this.results.services.duplicates.length}组重复服务，建议统一接口`
      });
    }
    
    this.results.hooks.recommendations = recommendations.filter(r => r.category === 'hooks');
    this.results.components.recommendations = recommendations.filter(r => r.category === 'components');
    this.results.services.recommendations = recommendations.filter(r => r.category === 'services');
  }

  /**
   * 打印分析结果
   */
  printResults() {
    console.log('📊 测试工具重复和耦合分析结果');
    console.log('='.repeat(50));
    
    console.log(`\n🎣 Hook重复问题:`);
    console.log(`   发现 ${this.results.hooks.duplicates.length} 组重复Hook`);
    for (const duplicate of this.results.hooks.duplicates) {
      console.log(`   - ${duplicate.functionality}: ${duplicate.hooks.join(', ')} (${duplicate.similarity}%相似)`);
    }
    
    console.log(`\n🧩 组件重复问题:`);
    console.log(`   发现 ${this.results.components.duplicates.length} 组重复组件`);
    for (const duplicate of this.results.components.duplicates) {
      console.log(`   - ${duplicate.functionality}: ${duplicate.components.join(', ')} (${duplicate.similarity}%相似)`);
    }
    
    console.log(`\n⚙️ 服务重复问题:`);
    console.log(`   发现 ${this.results.services.duplicates.length} 组重复服务`);
    for (const duplicate of this.results.services.duplicates) {
      console.log(`   - ${duplicate.functionality}: ${duplicate.services.join(', ')} (${duplicate.similarity}%相似)`);
    }
    
    console.log(`\n📈 汇总统计:`);
    console.log(`   总重复组数: ${this.results.summary.totalDuplicates}`);
    console.log(`   可减少代码行数: ${this.results.summary.codeReductionPotential}`);
    console.log(`   预计代码减少: ${Math.round(this.results.summary.codeReductionPotential / 100)}%`);
  }
}

// 运行分析
if (require.main === module) {
  const analyzer = new TestToolsDuplicationAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = TestToolsDuplicationAnalyzer;
