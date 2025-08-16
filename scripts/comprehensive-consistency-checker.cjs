#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ComprehensiveConsistencyChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.dryRun = process.argv.includes('--dry-run');
    this.results = {};
    this.summary = {
      totalIssues: 0,
      totalFiles: 0,
      categories: {}
    };
  }

  /**
   * 执行综合一致性检查
   */
  async execute() {
    console.log('🔍 开始项目综合一致性检查...\n');
    console.log(`模式: ${this.dryRun ? '预览模式' : '完整检查'}\n`);

    try {
      const startTime = Date.now();

      // 1. 代码一致性检查
      await this.runCodeConsistencyCheck();

      // 2. 功能实现一致性检查
      await this.runFunctionalConsistencyCheck();

      // 3. 配置文件一致性检查
      await this.runConfigConsistencyCheck();

      // 4. 数据结构一致性检查
      await this.runDataConsistencyCheck();

      // 5. UI样式一致性检查
      await this.runUIConsistencyCheck();

      // 6. 生成综合报告
      const endTime = Date.now();
      await this.generateComprehensiveReport(endTime - startTime);

      console.log('✅ 综合一致性检查完成！\n');

    } catch (error) {
      console.error('❌ 综合一致性检查过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 运行代码一致性检查
   */
  async runCodeConsistencyCheck() {
    console.log('📝 运行代码一致性检查...');
    
    try {
      const output = execSync('node scripts/consistency-checker.cjs', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      this.results.codeConsistency = this.parseCheckOutput(output);
      console.log('   ✅ 代码一致性检查完成\n');
      
    } catch (error) {
      console.log('   ❌ 代码一致性检查失败\n');
      this.results.codeConsistency = { error: error.message };
    }
  }

  /**
   * 运行功能实现一致性检查
   */
  async runFunctionalConsistencyCheck() {
    console.log('⚙️ 运行功能实现一致性检查...');
    
    try {
      const output = execSync('node scripts/functional-consistency-checker.cjs', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      this.results.functionalConsistency = this.parseCheckOutput(output);
      console.log('   ✅ 功能实现一致性检查完成\n');
      
    } catch (error) {
      console.log('   ❌ 功能实现一致性检查失败\n');
      this.results.functionalConsistency = { error: error.message };
    }
  }

  /**
   * 运行配置文件一致性检查
   */
  async runConfigConsistencyCheck() {
    console.log('⚙️ 运行配置文件一致性检查...');
    
    try {
      const output = execSync('node scripts/config-consistency-checker.cjs', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      this.results.configConsistency = this.parseCheckOutput(output);
      console.log('   ✅ 配置文件一致性检查完成\n');
      
    } catch (error) {
      console.log('   ❌ 配置文件一致性检查失败\n');
      this.results.configConsistency = { error: error.message };
    }
  }

  /**
   * 运行数据结构一致性检查
   */
  async runDataConsistencyCheck() {
    console.log('🗄️ 运行数据结构一致性检查...');
    
    try {
      const output = execSync('node scripts/data-consistency-checker.cjs', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      this.results.dataConsistency = this.parseCheckOutput(output);
      console.log('   ✅ 数据结构一致性检查完成\n');
      
    } catch (error) {
      console.log('   ❌ 数据结构一致性检查失败\n');
      this.results.dataConsistency = { error: error.message };
    }
  }

  /**
   * 运行UI样式一致性检查
   */
  async runUIConsistencyCheck() {
    console.log('🎨 运行UI样式一致性检查...');
    
    try {
      const output = execSync('node scripts/ui-consistency-checker.cjs', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      this.results.uiConsistency = this.parseCheckOutput(output);
      console.log('   ✅ UI样式一致性检查完成\n');
      
    } catch (error) {
      console.log('   ❌ UI样式一致性检查失败\n');
      this.results.uiConsistency = { error: error.message };
    }
  }

  /**
   * 解析检查输出
   */
  parseCheckOutput(output) {
    const result = {
      output: output,
      issues: 0,
      files: 0
    };

    // 提取问题数量
    const issuesMatch = output.match(/总问题数:\s*(\d+)/);
    if (issuesMatch) {
      result.issues = parseInt(issuesMatch[1]);
    }

    // 提取文件数量
    const filesMatch = output.match(/检查文件数:\s*(\d+)/);
    if (filesMatch) {
      result.files = parseInt(filesMatch[1]);
    }

    return result;
  }

  /**
   * 生成综合报告
   */
  async generateComprehensiveReport(duration) {
    console.log('📊 生成综合一致性检查报告...');

    // 计算总体统计
    this.calculateSummary();

    // 生成报告数据
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${Math.round(duration / 1000)}秒`,
      dryRun: this.dryRun,
      summary: this.summary,
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    // 保存JSON报告
    if (!this.dryRun) {
      const reportPath = path.join(this.projectRoot, 'comprehensive-consistency-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`   📄 JSON报告已保存: ${reportPath}`);
    }

    // 显示摘要
    this.displaySummary(report);
  }

  /**
   * 计算总体统计
   */
  calculateSummary() {
    for (const [category, result] of Object.entries(this.results)) {
      if (result.error) {
        this.summary.categories[category] = { status: 'error', issues: 0, files: 0 };
      } else {
        this.summary.totalIssues += result.issues || 0;
        this.summary.totalFiles += result.files || 0;
        this.summary.categories[category] = {
          status: 'success',
          issues: result.issues || 0,
          files: result.files || 0
        };
      }
    }
  }

  /**
   * 生成修复建议
   */
  generateRecommendations() {
    const recommendations = [];

    // 基于检查结果生成建议
    if (this.summary.categories.dataConsistency?.issues > 0) {
      recommendations.push({
        priority: 'high',
        category: 'data_consistency',
        title: 'API响应格式统一',
        description: '统一API响应格式，确保前后端数据交互一致性'
      });
    }

    if (this.summary.categories.functionalConsistency?.issues > 20) {
      recommendations.push({
        priority: 'medium-high',
        category: 'functional_consistency',
        title: '错误处理完善',
        description: '为异步操作添加统一的错误处理机制'
      });
    }

    if (this.summary.categories.configConsistency?.issues > 10) {
      recommendations.push({
        priority: 'medium-high',
        category: 'config_consistency',
        title: '配置文件标准化',
        description: '统一package.json依赖版本和TypeScript配置'
      });
    }

    if (this.summary.categories.codeConsistency?.issues > 1000) {
      recommendations.push({
        priority: 'medium',
        category: 'code_consistency',
        title: '代码规范化',
        description: '统一代码命名规范和导入格式'
      });
    }

    if (this.summary.categories.uiConsistency?.issues > 5) {
      recommendations.push({
        priority: 'medium',
        category: 'ui_consistency',
        title: '设计系统建立',
        description: '建立统一的设计系统，减少硬编码样式值'
      });
    }

    return recommendations;
  }

  /**
   * 显示检查摘要
   */
  displaySummary(report) {
    console.log('\n📊 综合一致性检查摘要:');
    console.log('=' .repeat(50));
    
    console.log(`⏱️  检查耗时: ${report.duration}`);
    console.log(`📁 检查文件: ${this.summary.totalFiles}个`);
    console.log(`🚨 发现问题: ${this.summary.totalIssues}个`);
    
    console.log('\n📋 分类统计:');
    for (const [category, stats] of Object.entries(this.summary.categories)) {
      const status = stats.status === 'success' ? '✅' : '❌';
      const categoryName = this.getCategoryDisplayName(category);
      console.log(`   ${status} ${categoryName}: ${stats.issues}个问题 (${stats.files}个文件)`);
    }

    // 计算一致性评分
    const score = this.calculateConsistencyScore();
    const scoreEmoji = score >= 90 ? '🟢' : score >= 70 ? '🟡' : '🔴';
    console.log(`\n🎯 整体一致性评分: ${score}/100 ${scoreEmoji}`);

    // 显示优先级建议
    if (report.recommendations.length > 0) {
      console.log('\n🔧 修复建议 (按优先级排序):');
      report.recommendations.forEach((rec, index) => {
        const priorityEmoji = rec.priority === 'high' ? '🔴' : 
                             rec.priority === 'medium-high' ? '🟠' : '🟡';
        console.log(`   ${index + 1}. ${priorityEmoji} ${rec.title}`);
        console.log(`      ${rec.description}`);
      });
    }

    console.log('\n' + '=' .repeat(50));
  }

  /**
   * 获取分类显示名称
   */
  getCategoryDisplayName(category) {
    const names = {
      codeConsistency: '代码一致性',
      functionalConsistency: '功能实现一致性',
      configConsistency: '配置文件一致性',
      dataConsistency: '数据结构一致性',
      uiConsistency: 'UI样式一致性'
    };
    return names[category] || category;
  }

  /**
   * 计算一致性评分
   */
  calculateConsistencyScore() {
    let totalWeight = 0;
    let weightedScore = 0;

    const weights = {
      codeConsistency: 0.2,
      functionalConsistency: 0.25,
      configConsistency: 0.2,
      dataConsistency: 0.25,
      uiConsistency: 0.1
    };

    for (const [category, weight] of Object.entries(weights)) {
      const stats = this.summary.categories[category];
      if (stats && stats.status === 'success') {
        totalWeight += weight;
        
        // 基于问题数量计算分数 (问题越少分数越高)
        const maxIssues = category === 'codeConsistency' ? 2000 : 50;
        const issueRatio = Math.min(stats.issues / maxIssues, 1);
        const categoryScore = Math.max(0, 100 - (issueRatio * 100));
        
        weightedScore += categoryScore * weight;
      }
    }

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  }
}

// 执行脚本
if (require.main === module) {
  const checker = new ComprehensiveConsistencyChecker();
  checker.execute().catch(error => {
    console.error('❌ 综合一致性检查失败:', error);
    process.exit(1);
  });
}

module.exports = ComprehensiveConsistencyChecker;
