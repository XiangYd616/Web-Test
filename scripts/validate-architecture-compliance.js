#!/usr/bin/env node

/**
 * 架构合规性验证脚本
 * 本地化程度：100%
 * 执行完整的架构合规性验证并生成报告
 */

// 检查是否在正确的目录中运行
const currentDir = process.cwd();
if (!currentDir.includes('Test-Web')) {
  console.error('请在Test-Web项目根目录中运行此脚本');
  process.exit(1);
}

const path = require('path');
const fs = require('fs').promises;
const ArchitectureComplianceValidator = require('../server/utils/ArchitectureComplianceValidator');
const ComplianceReportGenerator = require('../server/utils/ComplianceReportGenerator');

class ArchitectureComplianceRunner {
  constructor() {
    this.validator = new ArchitectureComplianceValidator();
    this.reportGenerator = new ComplianceReportGenerator();

    // 配置选项
    this.options = {
      outputDir: './reports/architecture-compliance',
      formats: ['html', 'json', 'markdown'],
      verbose: false,
      skipTests: false,
      onlyEngines: null // 可以指定只验证特定引擎
    };
  }

  /**
   * 运行架构合规性验证
   */
  async run(customOptions = {}) {
    console.log('🚀 开始架构合规性验证...\n');

    // 合并配置选项
    const options = { ...this.options, ...customOptions };

    try {
      // 创建输出目录
      await this.ensureOutputDirectory(options.outputDir);

      // 执行验证
      console.log('📋 执行架构合规性验证...');
      const validationResults = await this.validator.validateArchitectureCompliance(options);

      // 生成报告
      console.log('\n📊 生成合规性报告...');
      const reportResults = await this.reportGenerator.generateComplianceReport(validationResults, {
        outputDir: options.outputDir,
        formats: options.formats
      });

      // 显示结果摘要
      this.displayResultsSummary(validationResults, reportResults);

      // 保存验证结果
      await this.saveValidationResults(validationResults, options.outputDir);

      console.log('\n✅ 架构合规性验证完成！');

      return {
        validationResults,
        reportResults,
        success: true
      };

    } catch (error) {
      console.error('\n❌ 架构合规性验证失败:', error.message);

      if (options.verbose) {
        console.error(error.stack);
      }

      return {
        error: error.message,
        success: false
      };
    }
  }

  /**
   * 确保输出目录存在
   */
  async ensureOutputDirectory(outputDir) {
    try {
      await fs.mkdir(outputDir, { recursive: true });
      console.log(`📁 输出目录已创建: ${outputDir}`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * 显示结果摘要
   */
  displayResultsSummary(validationResults, reportResults) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 架构合规性验证结果摘要');
    console.log('='.repeat(60));

    // 总体评分
    console.log(`\n🎯 总体评分: ${validationResults.overallScore}/100`);

    // 状态指示
    const status = this.getStatusIndicator(validationResults.overallScore);
    console.log(`📈 合规状态: ${status}`);

    // 组件评分
    console.log('\n📋 组件评分详情:');
    console.log(`  • API架构合规性: ${validationResults.apiCompliance?.score || 0}/100`);
    console.log(`  • 数据库设计一致性: ${validationResults.databaseCompliance?.score || 0}/100`);
    console.log(`  • 实时通信系统: ${validationResults.realTimeCompliance?.score || 0}/100`);
    console.log(`  • 缓存性能优化: ${validationResults.cacheCompliance?.score || 0}/100`);
    console.log(`  • 通用组件标准化: ${validationResults.utilsCompliance?.score || 0}/100`);

    // 测试结果
    console.log('\n🧪 测试结果:');
    const integrationTests = validationResults.integrationTests;
    if (integrationTests) {
      console.log(`  • 集成测试: ${integrationTests.summary.passed}/${integrationTests.summary.total} 通过 (${integrationTests.score}/100)`);
    }

    const performanceTests = validationResults.performanceTests;
    if (performanceTests) {
      console.log(`  • 性能基准测试: ${performanceTests.score}/100`);
      console.log(`    - 响应时间: ${performanceTests.benchmarks.responseTime?.actual || 'N/A'}ms`);
      console.log(`    - 吞吐量: ${performanceTests.benchmarks.throughput?.actual || 'N/A'} req/s`);
      console.log(`    - 内存使用: ${performanceTests.benchmarks.memoryUsage?.actual || 'N/A'}MB`);
      console.log(`    - CPU使用: ${performanceTests.benchmarks.cpuUsage?.actual || 'N/A'}%`);
    }

    // 关键问题
    const criticalIssues = this.identifyCriticalIssues(validationResults);
    if (criticalIssues.length > 0) {
      console.log('\n⚠️  关键问题:');
      criticalIssues.forEach(issue => {
        console.log(`  • ${issue}`);
      });
    }

    // 建议
    const recommendations = validationResults.recommendations || [];
    const highPriorityRecs = recommendations.filter(r => r.priority === 'high');
    if (highPriorityRecs.length > 0) {
      console.log('\n🔧 高优先级建议:');
      highPriorityRecs.slice(0, 3).forEach(rec => {
        console.log(`  • ${rec.title}`);
      });
    }

    // 生成的报告文件
    console.log('\n📄 生成的报告文件:');
    if (reportResults.exports) {
      Object.entries(reportResults.exports).forEach(([format, filePath]) => {
        console.log(`  • ${format.toUpperCase()}: ${filePath}`);
      });
    }

    console.log('\n' + '='.repeat(60));
  }

  /**
   * 获取状态指示器
   */
  getStatusIndicator(score) {
    if (score >= 80) {
      return '🟢 完全合规';
    } else if (score >= 60) {
      return '🟡 部分合规';
    } else {
      return '🔴 不合规';
    }
  }

  /**
   * 识别关键问题
   */
  identifyCriticalIssues(validationResults) {
    const issues = [];

    if (validationResults.apiCompliance?.score < 60) {
      issues.push('API架构合规性严重不足');
    }

    if (validationResults.performanceTests?.score < 60) {
      issues.push('系统性能未达到基准要求');
    }

    if (validationResults.integrationTests?.summary.failed > 2) {
      issues.push('多个集成测试失败');
    }

    if (validationResults.overallScore < 50) {
      issues.push('整体架构合规性严重不足');
    }

    return issues;
  }

  /**
   * 保存验证结果
   */
  async saveValidationResults(validationResults, outputDir) {
    const resultsPath = path.join(outputDir, 'validation-results.json');
    const resultsData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      results: validationResults
    };

    await fs.writeFile(resultsPath, JSON.stringify(resultsData, null, 2), 'utf8');
    console.log(`💾 验证结果已保存: ${resultsPath}`);
  }

  /**
   * 解析命令行参数
   */
  parseCommandLineArgs() {
    const args = process.argv.slice(2);
    const options = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case '--output':
        case '-o':
          options.outputDir = args[++i];
          break;
        case '--format':
        case '-f':
          options.formats = args[++i].split(',');
          break;
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
        case '--skip-tests':
          options.skipTests = true;
          break;
        case '--engines':
        case '-e':
          options.onlyEngines = args[++i].split(',');
          break;
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;
      }
    }

    return options;
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
架构合规性验证工具

用法: node scripts/validate-architecture-compliance.js [选项]

选项:
  -o, --output <dir>     输出目录 (默认: ./reports/architecture-compliance)
  -f, --format <formats> 报告格式，逗号分隔 (默认: html,json,markdown)
  -v, --verbose          详细输出
  --skip-tests           跳过集成测试和性能测试
  -e, --engines <list>   只验证指定的引擎，逗号分隔
  -h, --help             显示帮助信息

示例:
  node scripts/validate-architecture-compliance.js
  node scripts/validate-architecture-compliance.js -o ./custom-reports -f html,json
  node scripts/validate-architecture-compliance.js --engines SEO,Performance --verbose
`);
  }
}

// 主执行逻辑
async function main() {
  const runner = new ArchitectureComplianceRunner();

  try {
    const options = runner.parseCommandLineArgs();
    const result = await runner.run(options);

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = ArchitectureComplianceRunner;
