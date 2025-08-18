#!/usr/bin/env node

/**
 * 文件健康状态分析器
 * 分析项目中每个文件的状态，为选择性保留策略提供数据支持
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class FileHealthAnalyzer {
  constructor() {
    this.results = {
      healthy: [],      // 健康文件 - 保留
      repairable: [],   // 可修复文件 - 修复
      critical: [],     // 严重损坏 - 重建
      statistics: {}
    };
    
    this.coreFiles = [
      'frontend/App.tsx',
      'frontend/main.tsx',
      'frontend/components/layout/Layout.tsx',
      'frontend/components/layout/Sidebar.tsx',
      'frontend/components/layout/TopNavbar.tsx',
      'frontend/pages/core/Dashboard.tsx',
      'frontend/pages/core/testing/TestingDashboard.tsx',
      'frontend/pages/core/testing/StressTest.tsx'
    ];
  }

  async analyze() {
    console.log('🔍 开始文件健康状态分析...\n');
    
    // 获取TypeScript错误
    const tsErrors = this.getTypeScriptErrors();
    
    // 分析所有TypeScript文件
    const tsFiles = this.getAllTypeScriptFiles();
    
    for (const file of tsFiles) {
      const health = this.analyzeFile(file, tsErrors);
      this.categorizeFile(file, health);
    }
    
    this.generateStatistics();
    this.generateReport();
    
    return this.results;
  }

  getTypeScriptErrors() {
    console.log('📊 获取TypeScript编译错误...');
    try {
      execSync('npx tsc --noEmit --maxNodeModuleJsDepth 0', { 
        cwd: path.join(process.cwd(), 'frontend'),
        stdio: 'pipe'
      });
      return {};
    } catch (error) {
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      return this.parseTypeScriptErrors(output);
    }
  }

  parseTypeScriptErrors(output) {
    const errors = {};
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
      if (match) {
        const [, file, lineNum, colNum, errorCode, message] = match;
        const normalizedFile = file.replace(/\\/g, '/');
        
        if (!errors[normalizedFile]) {
          errors[normalizedFile] = [];
        }
        
        errors[normalizedFile].push({
          line: parseInt(lineNum),
          column: parseInt(colNum),
          code: errorCode,
          message: message.trim()
        });
      }
    }
    
    return errors;
  }

  getAllTypeScriptFiles() {
    const files = [];
    const frontendDir = path.join(process.cwd(), 'frontend');
    
    function scanDirectory(dir) {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
          const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
          files.push(relativePath);
        }
      }
    }
    
    scanDirectory(frontendDir);
    return files;
  }

  analyzeFile(filePath, tsErrors) {
    const fileErrors = tsErrors[filePath] || [];
    const content = this.getFileContent(filePath);
    
    const health = {
      path: filePath,
      errorCount: fileErrors.length,
      errors: fileErrors,
      isCoreFile: this.coreFiles.includes(filePath),
      size: content.length,
      issues: this.detectIssues(content, fileErrors)
    };
    
    // 计算健康分数 (0-100)
    health.score = this.calculateHealthScore(health);
    
    return health;
  }

  getFileContent(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      return '';
    }
  }

  detectIssues(content, errors) {
    const issues = [];
    
    // 检测未终止字符串
    const unterminatedStrings = errors.filter(e => e.code === 'TS1002').length;
    if (unterminatedStrings > 0) {
      issues.push(`未终止字符串: ${unterminatedStrings}个`);
    }
    
    // 检测JSX错误
    const jsxErrors = errors.filter(e => e.code === 'TS1382' || e.code === 'TS17002').length;
    if (jsxErrors > 0) {
      issues.push(`JSX语法错误: ${jsxErrors}个`);
    }
    
    // 检测导入错误
    const importErrors = errors.filter(e => e.message.includes('import')).length;
    if (importErrors > 0) {
      issues.push(`导入错误: ${importErrors}个`);
    }
    
    // 检测模板字符串错误
    const templateErrors = errors.filter(e => e.code === 'TS1160').length;
    if (templateErrors > 0) {
      issues.push(`模板字符串错误: ${templateErrors}个`);
    }
    
    return issues;
  }

  calculateHealthScore(health) {
    let score = 100;
    
    // 错误数量影响
    score -= Math.min(health.errorCount * 2, 80);
    
    // 核心文件加权
    if (health.isCoreFile && health.errorCount > 10) {
      score -= 20;
    }
    
    // 特定错误类型严重性
    const criticalErrors = health.errors.filter(e => 
      e.code === 'TS1002' || e.code === 'TS1160' || e.code === 'TS1382'
    ).length;
    
    score -= criticalErrors * 3;
    
    return Math.max(0, score);
  }

  categorizeFile(filePath, health) {
    if (health.score >= 80) {
      this.results.healthy.push(health);
    } else if (health.score >= 40) {
      this.results.repairable.push(health);
    } else {
      this.results.critical.push(health);
    }
  }

  generateStatistics() {
    const total = this.results.healthy.length + this.results.repairable.length + this.results.critical.length;
    
    this.results.statistics = {
      total,
      healthy: this.results.healthy.length,
      repairable: this.results.repairable.length,
      critical: this.results.critical.length,
      healthyPercentage: ((this.results.healthy.length / total) * 100).toFixed(1),
      repairablePercentage: ((this.results.repairable.length / total) * 100).toFixed(1),
      criticalPercentage: ((this.results.critical.length / total) * 100).toFixed(1)
    };
  }

  generateReport() {
    const stats = this.results.statistics;
    
    console.log('\n📊 文件健康状态分析报告');
    console.log('='.repeat(50));
    console.log(`总文件数: ${stats.total}`);
    console.log(`✅ 健康文件: ${stats.healthy} (${stats.healthyPercentage}%)`);
    console.log(`🔧 可修复文件: ${stats.repairable} (${stats.repairablePercentage}%)`);
    console.log(`❌ 严重损坏文件: ${stats.critical} (${stats.criticalPercentage}%)`);
    
    console.log('\n🚨 最严重的损坏文件 (前10个):');
    const worstFiles = this.results.critical
      .sort((a, b) => a.score - b.score)
      .slice(0, 10);
      
    worstFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.path} (分数: ${file.score}, 错误: ${file.errorCount})`);
      if (file.issues.length > 0) {
        console.log(`   问题: ${file.issues.join(', ')}`);
      }
    });
    
    console.log('\n🎯 核心文件状态:');
    this.coreFiles.forEach(coreFile => {
      const file = [...this.results.healthy, ...this.results.repairable, ...this.results.critical]
        .find(f => f.path === coreFile);
      
      if (file) {
        const status = file.score >= 80 ? '✅' : file.score >= 40 ? '🔧' : '❌';
        console.log(`${status} ${coreFile} (分数: ${file.score})`);
      } else {
        console.log(`❓ ${coreFile} (文件不存在)`);
      }
    });
    
    // 保存详细报告
    const reportPath = 'reports/file-health-analysis.json';
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 详细报告已保存: ${reportPath}`);
  }
}

// 运行分析
if (require.main === module) {
  const analyzer = new FileHealthAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = FileHealthAnalyzer;
