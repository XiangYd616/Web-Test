#!/usr/bin/env node

/**
 * 智能TypeScript错误分析器
 * 基于企业级AI助手规则体系 (P7-analyze-issue + P5-ai-powered-code-review)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class IntelligentErrorAnalyzer {
  constructor() {
    this.errorPatterns = new Map();
    this.fileErrors = new Map();
    this.totalErrors = 0;
    this.analysisResults = {
      criticalErrors: [],
      commonPatterns: [],
      fixableErrors: [],
      priorityFiles: []
    };
  }

  async analyze() {
    console.log('🧠 启动智能TypeScript错误分析...\n');
    
    try {
      // 获取TypeScript错误
      const errors = this.getTypeScriptErrors();
      
      // 分析错误模式
      this.analyzeErrorPatterns(errors);
      
      // 分类错误
      this.categorizeErrors();
      
      // 生成修复策略
      this.generateFixStrategy();
      
      // 输出分析报告
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 分析失败:', error.message);
    }
  }

  getTypeScriptErrors() {
    console.log('📊 收集TypeScript错误信息...');
    
    try {
      execSync('npx tsc --noEmit --maxNodeModuleJsDepth 0', {
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      return [];
    } catch (error) {
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      return this.parseErrors(output);
    }
  }

  parseErrors(output) {
    const lines = output.split('\n').filter(line => line.trim());
    const errors = [];
    
    for (const line of lines) {
      const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/);
      if (match) {
        const [, file, line, column, code, message] = match;
        errors.push({
          file: file.trim(),
          line: parseInt(line),
          column: parseInt(column),
          code: code,
          message: message.trim()
        });
      }
    }
    
    this.totalErrors = errors.length;
    console.log(`  📈 发现 ${this.totalErrors} 个错误`);
    return errors;
  }

  analyzeErrorPatterns(errors) {
    console.log('🔍 分析错误模式...');
    
    for (const error of errors) {
      // 统计错误类型
      const count = this.errorPatterns.get(error.code) || 0;
      this.errorPatterns.set(error.code, count + 1);
      
      // 统计文件错误
      const fileCount = this.fileErrors.get(error.file) || 0;
      this.fileErrors.set(error.file, fileCount + 1);
    }
    
    console.log(`  📊 发现 ${this.errorPatterns.size} 种错误类型`);
    console.log(`  📁 涉及 ${this.fileErrors.size} 个文件`);
  }

  categorizeErrors() {
    console.log('📋 错误分类和优先级排序...');
    
    // 按错误类型分类
    const sortedPatterns = Array.from(this.errorPatterns.entries())
      .sort((a, b) => b[1] - a[1]);
    
    // 按文件错误数排序
    const sortedFiles = Array.from(this.fileErrors.entries())
      .sort((a, b) => b[1] - a[1]);
    
    // 识别关键错误类型
    const criticalErrorCodes = ['TS1002', 'TS1005', 'TS1109', 'TS1128', 'TS1160'];
    
    for (const [code, count] of sortedPatterns) {
      const pattern = {
        code,
        count,
        percentage: Math.round((count / this.totalErrors) * 100),
        isCritical: criticalErrorCodes.includes(code),
        description: this.getErrorDescription(code)
      };
      
      if (pattern.isCritical || pattern.count > 50) {
        this.analysisResults.criticalErrors.push(pattern);
      }
      
      this.analysisResults.commonPatterns.push(pattern);
    }
    
    // 识别优先修复文件
    for (const [file, count] of sortedFiles.slice(0, 10)) {
      this.analysisResults.priorityFiles.push({
        file,
        errorCount: count,
        priority: count > 20 ? 'HIGH' : count > 10 ? 'MEDIUM' : 'LOW'
      });
    }
  }

  getErrorDescription(code) {
    const descriptions = {
      'TS1002': '未终止的字符串字面量',
      'TS1005': '缺少逗号或分号',
      'TS1109': '缺少表达式',
      'TS1128': '缺少声明或语句',
      'TS1131': '缺少属性或签名',
      'TS1136': '缺少属性赋值',
      'TS1160': '未终止的模板字面量',
      'TS2304': '找不到名称',
      'TS2307': '找不到模块',
      'TS2322': '类型不匹配',
      'TS2339': '属性不存在',
      'TS2345': '参数类型错误'
    };
    
    return descriptions[code] || '未知错误类型';
  }

  generateFixStrategy() {
    console.log('🎯 生成智能修复策略...');
    
    // 基于P1-frontend-rules-2.1的修复策略
    const strategies = {
      'TS1002': {
        strategy: 'auto_fix',
        description: '自动修复未终止的字符串',
        method: 'addMissingQuotes'
      },
      'TS1005': {
        strategy: 'auto_fix', 
        description: '自动添加缺少的标点符号',
        method: 'addMissingPunctuation'
      },
      'TS1109': {
        strategy: 'manual_review',
        description: '需要手动检查表达式',
        method: 'reviewExpressions'
      },
      'TS1128': {
        strategy: 'auto_fix',
        description: '修复语法结构',
        method: 'fixSyntaxStructure'
      }
    };
    
    for (const pattern of this.analysisResults.commonPatterns) {
      const strategy = strategies[pattern.code];
      if (strategy) {
        this.analysisResults.fixableErrors.push({
          ...pattern,
          ...strategy
        });
      }
    }
  }

  generateReport() {
    console.log('\n📊 智能错误分析报告');
    console.log('='.repeat(60));
    
    console.log(`\n📈 总体统计:`);
    console.log(`  总错误数: ${this.totalErrors}`);
    console.log(`  错误类型: ${this.errorPatterns.size}`);
    console.log(`  涉及文件: ${this.fileErrors.size}`);
    
    console.log(`\n🔥 最常见错误类型 (Top 5):`);
    for (const pattern of this.analysisResults.commonPatterns.slice(0, 5)) {
      console.log(`  ${pattern.code}: ${pattern.count}个 (${pattern.percentage}%) - ${pattern.description}`);
    }
    
    console.log(`\n⚠️ 关键错误类型:`);
    for (const error of this.analysisResults.criticalErrors) {
      console.log(`  ${error.code}: ${error.count}个 - ${error.description}`);
    }
    
    console.log(`\n📁 优先修复文件 (Top 10):`);
    for (const file of this.analysisResults.priorityFiles) {
      console.log(`  ${file.priority}: ${file.file} (${file.errorCount}个错误)`);
    }
    
    console.log(`\n🔧 可自动修复的错误:`);
    const autoFixable = this.analysisResults.fixableErrors.filter(e => e.strategy === 'auto_fix');
    const autoFixCount = autoFixable.reduce((sum, e) => sum + e.count, 0);
    console.log(`  可自动修复: ${autoFixCount}个错误 (${Math.round(autoFixCount/this.totalErrors*100)}%)`);
    
    for (const error of autoFixable) {
      console.log(`    ${error.code}: ${error.count}个 - ${error.description}`);
    }
    
    console.log(`\n🎯 修复建议:`);
    if (autoFixCount > this.totalErrors * 0.7) {
      console.log(`  ✅ 建议使用自动修复工具 (可修复${Math.round(autoFixCount/this.totalErrors*100)}%的错误)`);
    } else {
      console.log(`  ⚠️ 需要手动修复较多错误，建议分批处理`);
    }
    
    // 保存详细报告
    this.saveDetailedReport();
  }

  saveDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: this.totalErrors,
        errorTypes: this.errorPatterns.size,
        affectedFiles: this.fileErrors.size
      },
      analysis: this.analysisResults,
      recommendations: this.generateRecommendations()
    };
    
    fs.writeFileSync('error-analysis-report.json', JSON.stringify(report, null, 2));
    console.log(`\n📄 详细报告已保存: error-analysis-report.json`);
  }

  generateRecommendations() {
    const autoFixCount = this.analysisResults.fixableErrors
      .filter(e => e.strategy === 'auto_fix')
      .reduce((sum, e) => sum + e.count, 0);
    
    return {
      immediateActions: [
        '运行自动修复工具处理语法错误',
        '优先修复错误数最多的文件',
        '建立TypeScript严格模式配置'
      ],
      autoFixPotential: `${Math.round(autoFixCount/this.totalErrors*100)}%`,
      estimatedTime: this.totalErrors < 1000 ? '2-4小时' : '1-2天',
      nextSteps: [
        '执行自动修复',
        '手动审查复杂错误',
        '建立代码质量检查流程'
      ]
    };
  }
}

// 运行分析
if (require.main === module) {
  const analyzer = new IntelligentErrorAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = IntelligentErrorAnalyzer;
