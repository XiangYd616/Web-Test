#!/usr/bin/env node

/**
 * 服务依赖分析工具
 * 分析服务缺失是否由错误或缺失导入造成
 */

const fs = require('fs');
const path = require('path');

class ServiceDependencyAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.existingServices = new Map();
    this.missingServices = new Map();
    this.brokenImports = [];
    this.serviceMapping = new Map();
    this.statistics = {
      totalFiles: 0,
      existingServices: 0,
      missingServices: 0,
      brokenImports: 0,
      fixableIssues: 0
    };
  }

  /**
   * 执行分析
   */
  async execute() {
    console.log('🔍 开始服务依赖分析...\n');

    try {
      // 1. 扫描现有服务
      await this.scanExistingServices();
      
      // 2. 分析缺失的服务导入
      await this.analyzeMissingServices();
      
      // 3. 建立服务映射关系
      await this.buildServiceMapping();
      
      // 4. 生成分析报告
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 分析过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 扫描现有服务
   */
  async scanExistingServices() {
    console.log('📂 扫描现有服务文件...');

    const serviceDirectories = [
      'frontend/services',
      'backend/services',
      'backend/engines',
      'frontend/hooks',
      'frontend/utils',
      'backend/utils'
    ];

    serviceDirectories.forEach(dir => {
      const fullPath = path.join(this.projectRoot, dir);
      if (fs.existsSync(fullPath)) {
        this.scanDirectory(fullPath, 'existing');
      }
    });

    console.log(`   发现 ${this.existingServices.size} 个现有服务文件\n`);
  }

  /**
   * 分析缺失的服务导入
   */
  async analyzeMissingServices() {
    console.log('🔍 分析缺失的服务导入...');

    const files = this.getCodeFiles();
    
    for (const file of files) {
      await this.analyzeFile(file);
    }

    console.log(`   发现 ${this.brokenImports.length} 个缺失服务导入\n`);
  }

  /**
   * 分析单个文件
   */
  async analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.statistics.totalFiles++;
      
      // 提取导入语句
      const imports = this.extractImports(content);
      
      for (const importInfo of imports) {
        if (this.isServiceImport(importInfo.path)) {
          const resolvedPath = this.resolveImportPath(filePath, importInfo.path);
          
          if (!this.fileExists(resolvedPath)) {
            this.brokenImports.push({
              file: filePath,
              importPath: importInfo.path,
              resolvedPath,
              importStatement: importInfo.fullMatch,
              serviceName: this.extractServiceName(importInfo.path),
              category: this.categorizeService(importInfo.path)
            });
            this.statistics.brokenImports++;
          }
        }
      }
      
    } catch (error) {
      // 忽略无法读取的文件
    }
  }

  /**
   * 提取导入语句
   */
  extractImports(content) {
    const imports = [];
    const patterns = [
      /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"`]([^'"`]+)['"`]/g,
      /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        imports.push({
          fullMatch: match[0],
          path: match[1]
        });
      }
    });

    return imports;
  }

  /**
   * 判断是否为服务导入
   */
  isServiceImport(importPath) {
    const servicePatterns = [
      /services\//,
      /engines\//,
      /hooks\/use/,
      /utils\//,
      /Service$/,
      /Engine$/,
      /Manager$/,
      /Handler$/,
      /Client$/,
      /Analyzer$/
    ];

    return servicePatterns.some(pattern => pattern.test(importPath)) && 
           importPath.startsWith('.'); // 只检查相对路径
  }

  /**
   * 提取服务名称
   */
  extractServiceName(importPath) {
    const parts = importPath.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.(ts|js|tsx|jsx)$/, '');
  }

  /**
   * 分类服务
   */
  categorizeService(importPath) {
    if (importPath.includes('/services/')) {
      if (importPath.includes('/auth/')) return 'auth';
      if (importPath.includes('/testing/')) return 'testing';
      if (importPath.includes('/data/')) return 'data';
      if (importPath.includes('/realtime/')) return 'realtime';
      if (importPath.includes('/config/')) return 'config';
      if (importPath.includes('/analytics/')) return 'analytics';
      if (importPath.includes('/reporting/')) return 'reporting';
      return 'service';
    }
    if (importPath.includes('/engines/')) return 'engine';
    if (importPath.includes('/hooks/')) return 'hook';
    if (importPath.includes('/utils/')) return 'utility';
    return 'unknown';
  }

  /**
   * 建立服务映射关系
   */
  async buildServiceMapping() {
    console.log('🔗 建立服务映射关系...');

    // 分析缺失服务与现有服务的关系
    this.brokenImports.forEach(brokenImport => {
      const serviceName = brokenImport.serviceName;
      const category = brokenImport.category;
      
      // 查找可能的替代服务
      const alternatives = this.findAlternativeServices(serviceName, category);
      
      if (alternatives.length > 0) {
        this.serviceMapping.set(brokenImport.importPath, alternatives);
        this.statistics.fixableIssues++;
      }
    });

    console.log(`   建立 ${this.serviceMapping.size} 个服务映射关系\n`);
  }

  /**
   * 查找替代服务
   */
  findAlternativeServices(serviceName, category) {
    const alternatives = [];
    
    // 基于名称相似性查找
    for (const [existingPath, existingInfo] of this.existingServices) {
      const existingName = existingInfo.name.toLowerCase();
      const targetName = serviceName.toLowerCase();
      
      // 名称包含关系
      if (existingName.includes(targetName) || targetName.includes(existingName)) {
        alternatives.push({
          path: existingPath,
          name: existingInfo.name,
          similarity: this.calculateSimilarity(targetName, existingName),
          reason: 'name_similarity'
        });
      }
      
      // 功能相似性
      if (existingInfo.category === category) {
        const functionalSimilarity = this.calculateFunctionalSimilarity(serviceName, existingInfo.name);
        if (functionalSimilarity > 0.3) {
          alternatives.push({
            path: existingPath,
            name: existingInfo.name,
            similarity: functionalSimilarity,
            reason: 'functional_similarity'
          });
        }
      }
    }
    
    // 按相似度排序
    return alternatives.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
  }

  /**
   * 计算名称相似度
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 计算功能相似度
   */
  calculateFunctionalSimilarity(name1, name2) {
    const keywords1 = this.extractKeywords(name1);
    const keywords2 = this.extractKeywords(name2);
    
    const intersection = keywords1.filter(k => keywords2.includes(k));
    const union = [...new Set([...keywords1, ...keywords2])];
    
    return union.length > 0 ? intersection.length / union.length : 0;
  }

  /**
   * 提取关键词
   */
  extractKeywords(name) {
    const keywords = [];
    
    // 驼峰命名分割
    const camelCaseWords = name.split(/(?=[A-Z])/).map(w => w.toLowerCase());
    keywords.push(...camelCaseWords);
    
    // 下划线分割
    const underscoreWords = name.split('_').map(w => w.toLowerCase());
    keywords.push(...underscoreWords);
    
    // 功能关键词
    const functionalKeywords = ['test', 'service', 'manager', 'engine', 'analyzer', 'client', 'handler'];
    keywords.push(...functionalKeywords.filter(k => name.toLowerCase().includes(k)));
    
    return [...new Set(keywords)].filter(k => k.length > 2);
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
   * 扫描目录
   */
  scanDirectory(dir, type) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      if (this.shouldSkipDirectory(item)) return;
      
      const fullPath = path.join(dir, item);
      
      try {
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          this.scanDirectory(fullPath, type);
        } else if (/\.(ts|tsx|js|jsx)$/.test(item) && !this.shouldSkipFile(item)) {
          const relativePath = path.relative(this.projectRoot, fullPath);
          const serviceName = path.basename(item, path.extname(item));
          const category = this.categorizeService(relativePath);
          
          if (type === 'existing') {
            this.existingServices.set(relativePath, {
              name: serviceName,
              category,
              path: fullPath
            });
            this.statistics.existingServices++;
          }
        }
      } catch (error) {
        // 忽略无法访问的文件
      }
    });
  }

  /**
   * 解析导入路径
   */
  resolveImportPath(filePath, importPath) {
    const fileDir = path.dirname(filePath);
    let resolvedPath = path.resolve(fileDir, importPath);
    
    // 尝试不同的扩展名
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    for (const ext of extensions) {
      if (fs.existsSync(resolvedPath + ext)) {
        return resolvedPath + ext;
      }
    }
    
    // 检查index文件
    for (const ext of extensions) {
      const indexPath = path.join(resolvedPath, 'index' + ext);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }
    
    return resolvedPath;
  }

  /**
   * 检查文件是否存在
   */
  fileExists(filePath) {
    try {
      return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取代码文件
   */
  getCodeFiles() {
    const files = [];
    
    const scanDirectory = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        if (this.shouldSkipDirectory(item)) return;
        
        const fullPath = path.join(dir, item);
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scanDirectory(fullPath);
          } else if (/\.(ts|tsx|js|jsx)$/.test(item) && !this.shouldSkipFile(item)) {
            files.push(fullPath);
          }
        } catch (error) {
          // 忽略无法访问的文件
        }
      });
    };
    
    scanDirectory(path.join(this.projectRoot, 'frontend'));
    scanDirectory(path.join(this.projectRoot, 'backend'));
    
    return files;
  }

  shouldSkipFile(fileName) {
    const skipPatterns = [
      /\.(test|spec)\./,
      /\.stories\./,
      /node_modules/,
      /dist/,
      /build/
    ];
    
    return skipPatterns.some(pattern => pattern.test(fileName));
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', '.vite', 'backup'];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * 生成分析报告
   */
  generateReport() {
    console.log('📊 服务依赖分析报告');
    console.log('='.repeat(60));
    
    console.log(`检查文件: ${this.statistics.totalFiles}`);
    console.log(`现有服务: ${this.statistics.existingServices}`);
    console.log(`缺失服务导入: ${this.statistics.brokenImports}`);
    console.log(`可修复问题: ${this.statistics.fixableIssues}`);
    console.log(`修复成功率: ${this.statistics.brokenImports > 0 ? (this.statistics.fixableIssues / this.statistics.brokenImports * 100).toFixed(1) : 0}%`);

    if (this.brokenImports.length === 0) {
      console.log('\n✅ 没有发现服务导入问题！');
      return;
    }

    // 按类别分组显示缺失服务
    const servicesByCategory = {};
    this.brokenImports.forEach(item => {
      if (!servicesByCategory[item.category]) {
        servicesByCategory[item.category] = [];
      }
      servicesByCategory[item.category].push(item);
    });

    console.log('\n📋 缺失服务分析:');
    Object.entries(servicesByCategory).forEach(([category, services]) => {
      console.log(`\n${this.getCategoryDisplayName(category)} (${services.length}个):`);
      
      services.slice(0, 5).forEach(service => {
        console.log(`   ❌ ${service.serviceName}`);
        console.log(`      路径: ${service.importPath}`);
        console.log(`      文件: ${path.relative(this.projectRoot, service.file)}`);
        
        // 显示可能的替代方案
        const alternatives = this.serviceMapping.get(service.importPath);
        if (alternatives && alternatives.length > 0) {
          console.log(`      💡 建议替代:`);
          alternatives.slice(0, 2).forEach(alt => {
            console.log(`         → ${alt.name} (相似度: ${(alt.similarity * 100).toFixed(0)}%)`);
          });
        }
      });
      
      if (services.length > 5) {
        console.log(`   ... 还有 ${services.length - 5} 个类似问题`);
      }
    });

    console.log('\n🔧 修复建议:');
    
    if (this.statistics.fixableIssues > 0) {
      console.log(`\n1. 可自动修复的问题 (${this.statistics.fixableIssues}个):`);
      console.log('   - 使用现有的相似服务替代');
      console.log('   - 重定向到功能相近的服务');
    }
    
    const unfixableIssues = this.statistics.brokenImports - this.statistics.fixableIssues;
    if (unfixableIssues > 0) {
      console.log(`\n2. 需要手动处理的问题 (${unfixableIssues}个):`);
      console.log('   - 创建缺失的服务文件');
      console.log('   - 删除不需要的导入');
      console.log('   - 重新设计服务架构');
    }

    console.log('\n📈 现有服务统计:');
    const existingByCategory = {};
    for (const [path, info] of this.existingServices) {
      if (!existingByCategory[info.category]) {
        existingByCategory[info.category] = 0;
      }
      existingByCategory[info.category]++;
    }
    
    Object.entries(existingByCategory).forEach(([category, count]) => {
      console.log(`   ${this.getCategoryDisplayName(category)}: ${count}个`);
    });

    console.log('\n💡 下一步行动:');
    console.log('1. 运行自动修复工具处理可修复的问题');
    console.log('2. 根据业务需求创建缺失的核心服务');
    console.log('3. 清理不需要的服务导入');
    console.log('4. 重新运行依赖分析验证修复效果');
  }

  getCategoryDisplayName(category) {
    const categoryNames = {
      auth: '认证服务',
      testing: '测试服务',
      data: '数据服务',
      realtime: '实时服务',
      config: '配置服务',
      analytics: '分析服务',
      reporting: '报告服务',
      service: '通用服务',
      engine: '引擎组件',
      hook: 'React Hooks',
      utility: '工具函数',
      unknown: '未分类'
    };
    
    return categoryNames[category] || category;
  }
}

// 执行分析
if (require.main === module) {
  const analyzer = new ServiceDependencyAnalyzer();
  analyzer.execute().catch(console.error);
}

module.exports = ServiceDependencyAnalyzer;
