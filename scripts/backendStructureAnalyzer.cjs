#!/usr/bin/env node

/**
 * Backend结构分析和优化工具
 * 分析backend目录结构，识别需要整理优化的问题
 */

const fs = require('fs');
const path = require('path');

class BackendStructureAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.backendRoot = path.join(this.projectRoot, 'backend');
    this.issues = [];
    this.warnings = [];
    this.suggestions = [];
    this.fileStats = {
      totalFiles: 0,
      totalDirectories: 0,
      serviceFiles: 0,
      engineFiles: 0,
      routeFiles: 0,
      testFiles: 0
    };
  }

  async execute() {
    console.log('🔍 开始Backend结构分析...');
    console.log('==================================================');

    try {
      // 1. 分析目录结构
      await this.analyzeDirectoryStructure();
      
      // 2. 分析services目录
      await this.analyzeServicesDirectory();
      
      // 3. 分析engines目录
      await this.analyzeEnginesDirectory();
      
      // 4. 分析文件组织
      await this.analyzeFileOrganization();
      
      // 5. 检查重复和冗余
      await this.checkDuplicatesAndRedundancy();
      
      // 6. 生成分析报告
      await this.generateAnalysisReport();
      
    } catch (error) {
      console.error('❌ 分析过程中出现错误:', error.message);
      process.exit(1);
    }
  }

  async analyzeDirectoryStructure() {
    console.log('\n📁 分析Backend目录结构...');
    
    if (!fs.existsSync(this.backendRoot)) {
      this.issues.push('Backend目录不存在');
      return;
    }
    
    const rootItems = fs.readdirSync(this.backendRoot);
    console.log(`  📊 根目录项目数量: ${rootItems.length}`);
    
    // 检查预期的目录结构
    const expectedDirs = {
      'api': 'API路由和文档',
      'services': '业务服务层',
      'engines': '测试引擎',
      'models': '数据模型',
      'middleware': '中间件',
      'routes': '路由定义',
      'utils': '工具函数',
      'config': '配置文件',
      '__tests__': '测试文件'
    };
    
    const unexpectedDirs = ['data', 'reports', 'backups', 'scripts'];
    const unexpectedFiles = ['app.js', 'index.js'];
    
    // 检查预期目录
    for (const [dir, description] of Object.entries(expectedDirs)) {
      if (rootItems.includes(dir)) {
        console.log(`  ✅ ${dir}/ - ${description}`);
      } else {
        this.warnings.push(`缺少预期目录: ${dir}/ (${description})`);
      }
    }
    
    // 检查不应该在根目录的项目
    for (const dir of unexpectedDirs) {
      if (rootItems.includes(dir)) {
        console.log(`  ⚠️ ${dir}/ 应该移动到其他位置`);
        this.warnings.push(`${dir}/ 目录位置不当，建议重新组织`);
      }
    }
    
    for (const file of unexpectedFiles) {
      if (rootItems.includes(file)) {
        console.log(`  ⚠️ ${file} 应该移动到src/或bin/目录`);
        this.warnings.push(`${file} 文件位置不当，建议移动`);
      }
    }
  }

  async analyzeServicesDirectory() {
    console.log('\n🔧 分析Services目录...');
    
    const servicesPath = path.join(this.backendRoot, 'services');
    if (!fs.existsSync(servicesPath)) {
      this.issues.push('services目录不存在');
      return;
    }
    
    const serviceItems = fs.readdirSync(servicesPath);
    const serviceFiles = serviceItems.filter(item => {
      const itemPath = path.join(servicesPath, item);
      return fs.statSync(itemPath).isFile() && item.endsWith('.js');
    });
    
    const serviceDirs = serviceItems.filter(item => {
      const itemPath = path.join(servicesPath, item);
      return fs.statSync(itemPath).isDirectory();
    });
    
    console.log(`  📄 服务文件数量: ${serviceFiles.length}`);
    console.log(`  📁 服务子目录数量: ${serviceDirs.length}`);
    
    this.fileStats.serviceFiles = serviceFiles.length;
    
    // 分析服务文件命名模式
    const namingPatterns = {
      engines: serviceFiles.filter(f => f.includes('Engine')),
      services: serviceFiles.filter(f => f.includes('Service')),
      managers: serviceFiles.filter(f => f.includes('Manager')),
      others: serviceFiles.filter(f => !f.includes('Engine') && !f.includes('Service') && !f.includes('Manager'))
    };
    
    console.log(`    🔧 引擎文件: ${namingPatterns.engines.length}个`);
    console.log(`    🛠️ 服务文件: ${namingPatterns.services.length}个`);
    console.log(`    📋 管理器文件: ${namingPatterns.managers.length}个`);
    console.log(`    ❓ 其他文件: ${namingPatterns.others.length}个`);
    
    // 检查是否有重复功能
    if (namingPatterns.engines.length > 10) {
      this.warnings.push(`services目录中有${namingPatterns.engines.length}个引擎文件，建议移动到engines目录`);
    }
    
    if (serviceFiles.length > 30) {
      this.warnings.push(`services目录文件过多 (${serviceFiles.length}个)，建议按功能分类`);
    }
  }

  async analyzeEnginesDirectory() {
    console.log('\n⚙️ 分析Engines目录...');
    
    const enginesPath = path.join(this.backendRoot, 'engines');
    if (!fs.existsSync(enginesPath)) {
      this.issues.push('engines目录不存在');
      return;
    }
    
    const engineDirs = fs.readdirSync(enginesPath).filter(item => {
      const itemPath = path.join(enginesPath, item);
      return fs.statSync(itemPath).isDirectory();
    });
    
    console.log(`  📁 引擎类型数量: ${engineDirs.length}`);
    console.log(`  🔧 引擎类型: ${engineDirs.join(', ')}`);
    
    const expectedEngines = ['api', 'compatibility', 'performance', 'security', 'seo', 'stress'];
    
    for (const engine of expectedEngines) {
      if (engineDirs.includes(engine)) {
        console.log(`    ✅ ${engine} 引擎存在`);
      } else {
        this.warnings.push(`缺少预期引擎: ${engine}`);
      }
    }
  }

  async analyzeFileOrganization() {
    console.log('\n📋 分析文件组织...');
    
    // 统计各类文件数量
    await this.countFiles(this.backendRoot);
    
    console.log(`  📊 文件统计:`);
    console.log(`    总文件数: ${this.fileStats.totalFiles}`);
    console.log(`    总目录数: ${this.fileStats.totalDirectories}`);
    console.log(`    服务文件: ${this.fileStats.serviceFiles}`);
    console.log(`    路由文件: ${this.fileStats.routeFiles}`);
    console.log(`    测试文件: ${this.fileStats.testFiles}`);
  }

  async countFiles(dirPath, level = 0) {
    if (level > 3) return; // 限制递归深度
    
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      if (item === 'node_modules') continue; // 跳过node_modules
      
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        this.fileStats.totalDirectories++;
        await this.countFiles(itemPath, level + 1);
      } else {
        this.fileStats.totalFiles++;
        
        // 分类统计
        if (item.endsWith('.test.js') || item.endsWith('.spec.js')) {
          this.fileStats.testFiles++;
        } else if (dirPath.includes('routes')) {
          this.fileStats.routeFiles++;
        } else if (dirPath.includes('engines')) {
          this.fileStats.engineFiles++;
        }
      }
    }
  }

  async checkDuplicatesAndRedundancy() {
    console.log('\n🔍 检查重复和冗余...');
    
    // 检查是否有功能重复的文件
    const duplicateChecks = [
      { pattern: /cache/i, files: [], description: '缓存相关' },
      { pattern: /test.*engine/i, files: [], description: '测试引擎' },
      { pattern: /monitoring/i, files: [], description: '监控相关' }
    ];
    
    // 扫描所有文件
    await this.scanForDuplicates(this.backendRoot, duplicateChecks);
    
    for (const check of duplicateChecks) {
      if (check.files.length > 3) {
        this.warnings.push(`${check.description}功能可能重复: 发现${check.files.length}个相关文件`);
        console.log(`  ⚠️ ${check.description}: ${check.files.length}个文件`);
      }
    }
  }

  async scanForDuplicates(dirPath, checks, level = 0) {
    if (level > 3 || dirPath.includes('node_modules')) return;
    
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        await this.scanForDuplicates(itemPath, checks, level + 1);
      } else if (item.endsWith('.js')) {
        for (const check of checks) {
          if (check.pattern.test(item)) {
            check.files.push(path.relative(this.backendRoot, itemPath));
          }
        }
      }
    }
  }

  async generateAnalysisReport() {
    console.log('\n📊 生成Backend分析报告...');
    
    const reportPath = path.join(this.projectRoot, 'docs/reports/BACKEND_STRUCTURE_ANALYSIS_REPORT.md');
    
    const report = `# Backend结构分析报告

**分析时间**: ${new Date().toISOString()}
**分析状态**: ${this.issues.length === 0 ? '✅ 良好' : '⚠️ 需要改进'}

## 📊 分析摘要

- **严重问题**: ${this.issues.length}个
- **警告**: ${this.warnings.length}个
- **建议**: ${this.suggestions.length}个

## 📈 文件统计

- **总文件数**: ${this.fileStats.totalFiles}
- **总目录数**: ${this.fileStats.totalDirectories}
- **服务文件**: ${this.fileStats.serviceFiles}
- **路由文件**: ${this.fileStats.routeFiles}
- **测试文件**: ${this.fileStats.testFiles}
- **引擎文件**: ${this.fileStats.engineFiles}

## 🚨 严重问题 (${this.issues.length}个)

${this.issues.length === 0 ? '无严重问题 🎉' : this.issues.map(issue => `- ❌ ${issue}`).join('\n')}

## ⚠️ 警告 (${this.warnings.length}个)

${this.warnings.length === 0 ? '无警告 ✅' : this.warnings.map(warning => `- ⚠️ ${warning}`).join('\n')}

## 💡 优化建议

### 1. 目录结构优化
- 将data/目录移动到项目根目录
- 将reports/目录移动到docs/reports/
- 将backups/目录移动到项目根目录
- 将app.js移动到src/目录

### 2. 文件组织优化
- Services目录按功能分类到子目录
- 将services中的引擎文件移动到engines目录
- 增加测试文件覆盖率

### 3. 命名规范优化
- 统一服务文件命名规范
- 建立文件命名规范文档

## 🎯 Backend健康度评分

- **目录结构**: ${this.calculateScore()}/5 ⭐
- **文件组织**: ${this.calculateScore()}/5 ⭐
- **命名规范**: ${this.calculateScore()}/5 ⭐
- **代码重复**: ${this.calculateScore()}/5 ⭐

**总体评分**: ${this.calculateScore()}/5 ⭐

---
*此报告由Backend结构分析工具自动生成*
`;

    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`  📄 Backend分析报告已生成: ${reportPath}`);
    
    // 输出摘要
    console.log('\n📊 Backend分析结果摘要:');
    console.log(`- 严重问题: ${this.issues.length}`);
    console.log(`- 警告: ${this.warnings.length}`);
    console.log(`- 总体评分: ${this.calculateScore()}/5`);
    
    if (this.issues.length === 0 && this.warnings.length <= 3) {
      console.log('\n🎉 Backend结构分析通过！结构合理，组织良好！');
    } else {
      console.log(`\n⚠️ 发现 ${this.issues.length + this.warnings.length} 个问题，建议进行优化。`);
    }
  }

  calculateScore() {
    let score = 5;
    if (this.issues.length > 0) score -= 2;
    if (this.warnings.length > 5) score -= 1;
    if (this.warnings.length > 10) score -= 1;
    return Math.max(1, score);
  }
}

// 执行分析
if (require.main === module) {
  const analyzer = new BackendStructureAnalyzer();
  analyzer.execute().catch(console.error);
}

module.exports = BackendStructureAnalyzer;
