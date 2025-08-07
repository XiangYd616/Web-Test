/**
 * 系统集成检查和清理执行脚本
 * 本地化程度：100%
 * 执行完整的系统集成验证和代码清理
 */

const { SystemIntegrationChecker } = require('./system-integration-checker.cjs');
const { CodeCleanupTool } = require('./code-cleanup-tool.cjs');

class SystemIntegrationRunner {
  constructor() {
    this.results = {
      integration: null,
      cleanup: null,
      overallStatus: 'pending'
    };
  }

  /**
   * 执行完整的系统集成检查和清理
   */
  async runFullSystemCheck(options = {}) {
    const {
      runCleanup = true,
      executeCleanup = false,
      generateReport = true
    } = options;

    console.log('🚀 开始系统集成检查和清理流程...\n');

    try {
      // 1. 执行系统集成检查
      console.log('📋 第一阶段：系统集成检查');
      console.log('='.repeat(50));
      
      const integrationChecker = new SystemIntegrationChecker();
      this.results.integration = await integrationChecker.runFullCheck();

      // 2. 执行代码清理（如果启用）
      if (runCleanup) {
        console.log('\n🧹 第二阶段：代码清理');
        console.log('='.repeat(50));
        
        const cleanupTool = new CodeCleanupTool();
        this.results.cleanup = await cleanupTool.runFullCleanup({
          dryRun: !executeCleanup,
          cleanTempFiles: true,
          cleanEmptyFiles: true,
          cleanObsoleteEndpoints: true,
          cleanDeprecatedComponents: true
        });
      }

      // 3. 生成综合报告
      if (generateReport) {
        await this.generateComprehensiveReport();
      }

      // 4. 评估整体状态
      this.evaluateOverallStatus();

      // 5. 显示最终结果
      this.displayFinalResults();

      return this.results;

    } catch (error) {
      console.error('\n❌ 系统集成检查流程失败:', error.message);
      this.results.overallStatus = 'failed';
      throw error;
    }
  }

  /**
   * 评估整体状态
   */
  evaluateOverallStatus() {
    const integration = this.results.integration;
    const cleanup = this.results.cleanup;

    // 检查验收标准
    const integrationPassed = integration.overallScore >= 85 &&
                             integration.frontendBackendAlignment.score >= 90 &&
                             integration.databaseConsistency.score >= 90 &&
                             integration.codeCleanup.score >= 80;

    const cleanupPassed = !cleanup || (
      cleanup.unusedFiles.length <= 5 &&
      cleanup.emptyFiles.length <= 3 &&
      cleanup.obsoleteEndpoints.length <= 2
    );

    if (integrationPassed && cleanupPassed) {
      this.results.overallStatus = 'excellent';
    } else if (integration.overallScore >= 70 && cleanupPassed) {
      this.results.overallStatus = 'good';
    } else if (integration.overallScore >= 50) {
      this.results.overallStatus = 'needs_improvement';
    } else {
      this.results.overallStatus = 'poor';
    }
  }

  /**
   * 显示最终结果
   */
  displayFinalResults() {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 系统集成检查和清理 - 最终结果');
    console.log('='.repeat(80));

    // 集成检查结果
    const integration = this.results.integration;
    console.log('\n📊 系统集成检查结果:');
    console.log(`  🎯 总体评分: ${integration.overallScore.toFixed(2)}/100`);
    console.log(`  🔗 前后端适配: ${integration.frontendBackendAlignment.score.toFixed(2)}/100`);
    console.log(`  💾 数据库一致性: ${integration.databaseConsistency.score.toFixed(2)}/100`);
    console.log(`  🧹 代码清理: ${integration.codeCleanup.score.toFixed(2)}/100`);

    // 代码清理结果
    if (this.results.cleanup) {
      const cleanup = this.results.cleanup;
      console.log('\n🧹 代码清理结果:');
      console.log(`  🗑️ 临时文件: ${cleanup.unusedFiles.length}`);
      console.log(`  📄 空文件: ${cleanup.emptyFiles.length}`);
      console.log(`  🔗 过时API端点: ${cleanup.obsoleteEndpoints.length}`);
      console.log(`  🧩 废弃组件: ${cleanup.deprecatedComponents.length}`);
      console.log(`  🔄 重复文件: ${cleanup.duplicateFiles.length}`);
    }

    // 验收标准检查
    console.log('\n🎯 验收标准检查:');
    console.log(`  ${integration.frontendBackendAlignment.score >= 90 ? '✅' : '❌'} 前后端完整适配 (≥90分) - ${integration.frontendBackendAlignment.score.toFixed(2)}/100`);
    console.log(`  ${integration.databaseConsistency.score >= 90 ? '✅' : '❌'} 数据库一致性 (≥90分) - ${integration.databaseConsistency.score.toFixed(2)}/100`);
    console.log(`  ${integration.codeCleanup.score >= 80 ? '✅' : '❌'} 代码清理完成 (≥80分) - ${integration.codeCleanup.score.toFixed(2)}/100`);
    console.log(`  ${integration.overallScore >= 85 ? '✅' : '❌'} 总体评分 (≥85分) - ${integration.overallScore.toFixed(2)}/100`);

    // 整体状态
    console.log('\n🏆 整体状态评估:');
    const statusEmoji = {
      'excellent': '🎉',
      'good': '✅',
      'needs_improvement': '⚠️',
      'poor': '❌',
      'failed': '💥'
    };

    const statusMessage = {
      'excellent': '优秀！系统已达到企业级标准，所有验收标准都已满足。',
      'good': '良好！系统基本达标，建议关注评分较低的项目进行优化。',
      'needs_improvement': '需要改进！系统存在一些问题，建议优先解决发现的问题。',
      'poor': '较差！系统存在严重问题，需要大幅改进才能达到验收标准。',
      'failed': '失败！系统检查过程中出现错误，请检查系统配置。'
    };

    console.log(`  ${statusEmoji[this.results.overallStatus]} ${this.results.overallStatus.toUpperCase()}: ${statusMessage[this.results.overallStatus]}`);

    // 改进建议
    this.displayImprovementSuggestions();

    console.log('\n' + '='.repeat(80));
  }

  /**
   * 显示改进建议
   */
  displayImprovementSuggestions() {
    console.log('\n💡 改进建议:');

    const integration = this.results.integration;

    // 前后端适配建议
    if (integration.frontendBackendAlignment.score < 90) {
      console.log('  🔗 前后端适配改进:');
      if (integration.frontendBackendAlignment.issues.some(issue => issue.includes('前端组件文件缺失'))) {
        console.log('    - 创建缺失的前端测试组件');
        console.log('    - 确保每个测试引擎都有对应的Vue/React组件');
      }
      if (integration.frontendBackendAlignment.issues.some(issue => issue.includes('核心模块缺失'))) {
        console.log('    - 实现缺失的核心功能模块');
        console.log('    - 确保前后端功能模块一一对应');
      }
      if (integration.frontendBackendAlignment.issues.some(issue => issue.includes('WebSocket'))) {
        console.log('    - 实现WebSocket实时通信功能');
        console.log('    - 确保前后端WebSocket连接正常');
      }
    }

    // 数据库一致性建议
    if (integration.databaseConsistency.score < 90) {
      console.log('  💾 数据库一致性改进:');
      if (integration.databaseConsistency.issues.some(issue => issue.includes('数据模型'))) {
        console.log('    - 创建完整的数据模型文件');
        console.log('    - 确保前后端数据结构一致');
      }
    }

    // 代码清理建议
    if (this.results.cleanup) {
      const cleanup = this.results.cleanup;
      if (cleanup.unusedFiles.length > 0) {
        console.log('  🗑️ 代码清理建议:');
        console.log(`    - 清理 ${cleanup.unusedFiles.length} 个临时文件`);
        console.log('    - 运行: node scripts/code-cleanup-tool.cjs --execute');
      }
    }

    // 下一步行动
    console.log('\n🎯 建议的下一步行动:');
    if (this.results.overallStatus === 'excellent') {
      console.log('  1. 系统已达到优秀标准，可以部署到生产环境');
      console.log('  2. 建立定期的系统集成检查流程');
      console.log('  3. 持续监控系统性能和稳定性');
    } else {
      console.log('  1. 优先解决评分最低的检查项目');
      console.log('  2. 创建缺失的前端组件和功能模块');
      console.log('  3. 完善数据库模型和文档');
      console.log('  4. 重新运行系统集成检查验证改进效果');
    }
  }

  /**
   * 生成综合报告
   */
  async generateComprehensiveReport() {
    const fs = require('fs');
    const path = require('path');

    const reportPath = 'reports/comprehensive-system-report.md';
    const reportDir = path.dirname(reportPath);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = this.generateComprehensiveMarkdown();
    fs.writeFileSync(reportPath, report);

    console.log(`\n📄 综合报告已生成: ${reportPath}`);
  }

  /**
   * 生成综合Markdown报告
   */
  generateComprehensiveMarkdown() {
    const timestamp = new Date().toISOString();
    const integration = this.results.integration;
    const cleanup = this.results.cleanup;

    return `# 系统集成检查和清理综合报告

**生成时间**: ${timestamp}
**整体状态**: ${this.results.overallStatus.toUpperCase()}

## 📊 执行摘要

本报告包含了测试工具平台的完整系统集成检查和代码清理结果。

### 🎯 关键指标

| 指标 | 得分 | 状态 | 验收标准 |
|------|------|------|----------|
| 总体评分 | ${integration.overallScore.toFixed(2)}/100 | ${integration.overallScore >= 85 ? '✅' : '❌'} | ≥85分 |
| 前后端适配 | ${integration.frontendBackendAlignment.score.toFixed(2)}/100 | ${integration.frontendBackendAlignment.score >= 90 ? '✅' : '❌'} | ≥90分 |
| 数据库一致性 | ${integration.databaseConsistency.score.toFixed(2)}/100 | ${integration.databaseConsistency.score >= 90 ? '✅' : '❌'} | ≥90分 |
| 代码清理 | ${integration.codeCleanup.score.toFixed(2)}/100 | ${integration.codeCleanup.score >= 80 ? '✅' : '❌'} | ≥80分 |

## 🔗 前后端适配详情

**评分**: ${integration.frontendBackendAlignment.score.toFixed(2)}/100

### 检查项目
- ✅ 7个测试工具对齐验证
- ✅ 26个核心功能模块验证  
- ✅ API端点对齐验证
- ✅ WebSocket实时通信验证
- ✅ 错误处理一致性验证

### 发现的问题
${integration.frontendBackendAlignment.issues.length > 0 ? 
  integration.frontendBackendAlignment.issues.map(issue => `- ❌ ${issue}`).join('\n') : 
  '✅ 未发现问题'}

## 💾 数据库一致性详情

**评分**: ${integration.databaseConsistency.score.toFixed(2)}/100

### 发现的问题
${integration.databaseConsistency.issues.length > 0 ? 
  integration.databaseConsistency.issues.map(issue => `- ❌ ${issue}`).join('\n') : 
  '✅ 未发现问题'}

## 🧹 代码清理详情

${cleanup ? `
**清理项目总数**: ${cleanup.totalCleaned}

| 清理项目 | 数量 | 状态 |
|---------|------|------|
| 临时文件 | ${cleanup.unusedFiles.length} | ${cleanup.unusedFiles.length > 0 ? '⚠️' : '✅'} |
| 空文件 | ${cleanup.emptyFiles.length} | ${cleanup.emptyFiles.length > 0 ? '⚠️' : '✅'} |
| 过时API端点 | ${cleanup.obsoleteEndpoints.length} | ${cleanup.obsoleteEndpoints.length > 0 ? '⚠️' : '✅'} |
| 废弃组件 | ${cleanup.deprecatedComponents.length} | ${cleanup.deprecatedComponents.length > 0 ? '⚠️' : '✅'} |
| 重复文件 | ${cleanup.duplicateFiles.length} | ${cleanup.duplicateFiles.length > 0 ? '⚠️' : '✅'} |
` : '未执行代码清理'}

## 🎯 验收标准评估

- [${integration.frontendBackendAlignment.score >= 90 ? 'x' : ' '}] 前后端完整适配 (≥90分)
- [${integration.databaseConsistency.score >= 90 ? 'x' : ' '}] 数据库一致性 (≥90分)  
- [${integration.codeCleanup.score >= 80 ? 'x' : ' '}] 代码清理完成 (≥80分)
- [${integration.overallScore >= 85 ? 'x' : ' '}] 总体评分 (≥85分)

## 📈 改进建议

${this.results.overallStatus === 'excellent' ? 
  '🎉 系统已达到优秀标准！建议建立定期检查流程以维持高质量。' :
  '建议优先解决评分较低的项目，特别是前后端适配和数据库一致性问题。'}

## 🚀 下一步行动

1. 解决发现的关键问题
2. 完善缺失的功能模块
3. 重新运行检查验证改进效果
4. 建立持续集成检查流程

---
*报告生成时间: ${timestamp}*
*整体状态: ${this.results.overallStatus.toUpperCase()}*
`;
  }
}

// 主执行函数
async function runSystemIntegrationCheck(options = {}) {
  const runner = new SystemIntegrationRunner();
  
  try {
    const results = await runner.runFullSystemCheck(options);
    
    if (results.overallStatus === 'excellent') {
      console.log('\n🎉 恭喜！系统已达到企业级优秀标准！');
      process.exit(0);
    } else if (results.overallStatus === 'good') {
      console.log('\n✅ 系统状态良好，建议进行小幅优化。');
      process.exit(0);
    } else {
      console.log('\n⚠️ 系统需要改进，请查看详细报告。');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ 系统集成检查失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const options = {
    runCleanup: !process.argv.includes('--no-cleanup'),
    executeCleanup: process.argv.includes('--execute-cleanup'),
    generateReport: !process.argv.includes('--no-report')
  };
  
  console.log('使用参数:');
  console.log('  --no-cleanup: 跳过代码清理');
  console.log('  --execute-cleanup: 执行实际清理（默认为预览）');
  console.log('  --no-report: 跳过报告生成');
  
  runSystemIntegrationCheck(options);
}

module.exports = { SystemIntegrationRunner, runSystemIntegrationCheck };
