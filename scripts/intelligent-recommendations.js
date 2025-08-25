#!/usr/bin/env node
/**
 * Test-Web 智能推荐引擎
 * 提供代码优化建议、最佳实践推荐和问题解决方案
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色定义
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// 日志函数
const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

class IntelligentRecommendationEngine {
  constructor() {
    this.projectRoot = process.cwd();
    this.recommendations = [];
    this.projectAnalysis = {};
  }

  // 分析项目结构
  analyzeProject() {
    log('🔍 分析项目结构...', 'cyan');

    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const tsConfigPath = path.join(this.projectRoot, 'tsconfig.json');
    const frontendPath = path.join(this.projectRoot, 'frontend');
    const backendPath = path.join(this.projectRoot, 'backend');

    this.projectAnalysis = {
      hasPackageJson: fs.existsSync(packageJsonPath),
      hasTsConfig: fs.existsSync(tsConfigPath),
      hasFrontend: fs.existsSync(frontendPath),
      hasBackend: fs.existsSync(backendPath),
      isMonorepo: fs.existsSync(frontendPath) && fs.existsSync(backendPath),
      packageJson: null,
      tsConfig: null,
    };

    if (this.projectAnalysis.hasPackageJson) {
      try {
        this.projectAnalysis.packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, 'utf8')
        );
      } catch (error) {
        log('⚠️  无法解析 package.json', 'yellow');
      }
    }

    if (this.projectAnalysis.hasTsConfig) {
      try {
        const tsConfigContent = fs.readFileSync(tsConfigPath, 'utf8');
        // 简单解析，忽略注释
        const cleanContent = tsConfigContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
        this.projectAnalysis.tsConfig = JSON.parse(cleanContent);
      } catch (error) {
        log('⚠️  无法解析 tsconfig.json', 'yellow');
      }
    }

    log('✅ 项目结构分析完成', 'green');
  }

  // 检查代码质量
  checkCodeQuality() {
    log('🔍 检查代码质量...', 'cyan');

    const checks = [
      this.checkTypeScriptErrors(),
      this.checkESLintIssues(),
      this.checkPrettierFormatting(),
      this.checkTestCoverage(),
      this.checkDependencyVulnerabilities(),
    ];

    return checks.filter(Boolean);
  }

  // TypeScript 错误检查
  checkTypeScriptErrors() {
    if (!this.projectAnalysis.hasTsConfig) return null;

    try {
      execSync('npx tsc --noEmit', { stdio: 'ignore' });
      return {
        type: 'success',
        category: 'TypeScript',
        message: 'TypeScript 类型检查通过',
        recommendation: '继续保持良好的类型安全实践',
      };
    } catch (error) {
      return {
        type: 'error',
        category: 'TypeScript',
        message: 'TypeScript 类型检查失败',
        recommendation: '运行 `npx tsc --noEmit` 查看详细错误信息并修复',
        action: 'npm run type-check',
      };
    }
  }

  // ESLint 问题检查
  checkESLintIssues() {
    const eslintConfigPath = path.join(this.projectRoot, '.eslintrc.js');
    if (!fs.existsSync(eslintConfigPath)) {
      return {
        type: 'warning',
        category: 'ESLint',
        message: '未找到 ESLint 配置文件',
        recommendation: '建议添加 ESLint 配置以保持代码质量',
        action: '创建 .eslintrc.js 配置文件',
      };
    }

    try {
      execSync('npx eslint . --ext .ts,.tsx,.js,.jsx --quiet', { stdio: 'ignore' });
      return {
        type: 'success',
        category: 'ESLint',
        message: 'ESLint 检查通过',
        recommendation: '代码符合 ESLint 规范',
      };
    } catch (error) {
      return {
        type: 'warning',
        category: 'ESLint',
        message: 'ESLint 发现代码质量问题',
        recommendation: '运行 `npm run lint:fix` 自动修复可修复的问题',
        action: 'npm run lint:fix',
      };
    }
  }

  // Prettier 格式检查
  checkPrettierFormatting() {
    const prettierConfigPath = path.join(this.projectRoot, '.prettierrc');
    if (!fs.existsSync(prettierConfigPath)) {
      return {
        type: 'info',
        category: 'Prettier',
        message: '建议添加 Prettier 配置',
        recommendation: '统一的代码格式有助于团队协作',
      };
    }

    try {
      execSync('npx prettier --check "**/*.{ts,tsx,js,jsx}"', { stdio: 'ignore' });
      return {
        type: 'success',
        category: 'Prettier',
        message: '代码格式检查通过',
        recommendation: '代码格式符合 Prettier 规范',
      };
    } catch (error) {
      return {
        type: 'info',
        category: 'Prettier',
        message: '代码格式需要调整',
        recommendation: '运行 `npm run format` 自动格式化代码',
        action: 'npm run format',
      };
    }
  }

  // 测试覆盖率检查
  checkTestCoverage() {
    const packageJson = this.projectAnalysis.packageJson;
    if (!packageJson || !packageJson.scripts || !packageJson.scripts.test) {
      return {
        type: 'warning',
        category: '测试',
        message: '未配置测试脚本',
        recommendation: '建议添加单元测试以提高代码质量',
      };
    }

    return {
      type: 'info',
      category: '测试',
      message: '已配置测试脚本',
      recommendation: '定期运行测试确保代码质量',
      action: 'npm test',
    };
  }

  // 依赖漏洞检查
  checkDependencyVulnerabilities() {
    try {
      execSync('npm audit --audit-level=moderate', { stdio: 'ignore' });
      return {
        type: 'success',
        category: '安全',
        message: '依赖安全检查通过',
        recommendation: '依赖包没有已知的安全漏洞',
      };
    } catch (error) {
      return {
        type: 'warning',
        category: '安全',
        message: '发现依赖安全漏洞',
        recommendation: '运行 `npm audit fix` 修复可自动修复的漏洞',
        action: 'npm audit fix',
      };
    }
  }

  // 生成性能优化建议
  generatePerformanceRecommendations() {
    const recommendations = [];

    // 检查 bundle 大小
    const distPath = path.join(this.projectRoot, 'dist');
    if (fs.existsSync(distPath)) {
      recommendations.push({
        type: 'info',
        category: '性能',
        message: '建议分析打包体积',
        recommendation: '使用 webpack-bundle-analyzer 分析打包体积',
        action: 'npx webpack-bundle-analyzer dist/static/js/*.js',
      });
    }

    // 检查图片优化
    const publicPath = path.join(this.projectRoot, 'public');
    if (fs.existsSync(publicPath)) {
      recommendations.push({
        type: 'info',
        category: '性能',
        message: '建议优化静态资源',
        recommendation: '压缩图片和使用现代图片格式 (WebP, AVIF)',
      });
    }

    return recommendations;
  }

  // 生成最佳实践建议
  generateBestPracticeRecommendations() {
    const recommendations = [];

    // 检查 Git hooks
    const preCommitHook = path.join(this.projectRoot, '.git/hooks/pre-commit');
    if (!fs.existsSync(preCommitHook)) {
      recommendations.push({
        type: 'info',
        category: '最佳实践',
        message: '建议添加 Git pre-commit hook',
        recommendation: '自动运行代码检查，防止有问题的代码提交',
      });
    }

    // 检查 README
    const readmePath = path.join(this.projectRoot, 'README.md');
    if (!fs.existsSync(readmePath)) {
      recommendations.push({
        type: 'warning',
        category: '文档',
        message: '缺少 README.md 文件',
        recommendation: '添加项目说明文档，包括安装和使用指南',
      });
    }

    // 检查环境变量配置
    const envExamplePath = path.join(this.projectRoot, '.env.example');
    if (!fs.existsSync(envExamplePath)) {
      recommendations.push({
        type: 'info',
        category: '配置',
        message: '建议添加 .env.example 文件',
        recommendation: '提供环境变量配置示例，方便其他开发者设置',
      });
    }

    return recommendations;
  }

  // 输出推荐报告
  generateReport() {
    log('\n📊 生成智能推荐报告...', 'cyan');

    const allRecommendations = [
      ...this.checkCodeQuality(),
      ...this.generatePerformanceRecommendations(),
      ...this.generateBestPracticeRecommendations(),
    ];

    // 按类型分组
    const groupedRecommendations = allRecommendations.reduce((groups, rec) => {
      const type = rec.type;
      if (!groups[type]) groups[type] = [];
      groups[type].push(rec);
      return groups;
    }, {});

    // 输出报告
    log('\n🎯 智能推荐报告', 'bright');
    log('='.repeat(50), 'cyan');

    // 成功项
    if (groupedRecommendations.success) {
      log('\n✅ 做得很好:', 'green');
      groupedRecommendations.success.forEach(rec => {
        log(`  • ${rec.category}: ${rec.message}`, 'green');
      });
    }

    // 警告项
    if (groupedRecommendations.warning) {
      log('\n⚠️  需要注意:', 'yellow');
      groupedRecommendations.warning.forEach(rec => {
        log(`  • ${rec.category}: ${rec.message}`, 'yellow');
        log(`    推荐: ${rec.recommendation}`, 'reset');
        if (rec.action) {
          log(`    执行: ${rec.action}`, 'cyan');
        }
      });
    }

    // 错误项
    if (groupedRecommendations.error) {
      log('\n❌ 需要修复:', 'red');
      groupedRecommendations.error.forEach(rec => {
        log(`  • ${rec.category}: ${rec.message}`, 'red');
        log(`    推荐: ${rec.recommendation}`, 'reset');
        if (rec.action) {
          log(`    执行: ${rec.action}`, 'cyan');
        }
      });
    }

    // 信息项
    if (groupedRecommendations.info) {
      log('\n💡 优化建议:', 'blue');
      groupedRecommendations.info.forEach(rec => {
        log(`  • ${rec.category}: ${rec.message}`, 'blue');
        log(`    推荐: ${rec.recommendation}`, 'reset');
        if (rec.action) {
          log(`    执行: ${rec.action}`, 'cyan');
        }
      });
    }

    // 保存报告到文件
    const reportPath = path.join(this.projectRoot, 'intelligent-recommendations-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      projectAnalysis: this.projectAnalysis,
      recommendations: allRecommendations,
      summary: {
        total: allRecommendations.length,
        success: groupedRecommendations.success?.length || 0,
        warning: groupedRecommendations.warning?.length || 0,
        error: groupedRecommendations.error?.length || 0,
        info: groupedRecommendations.info?.length || 0,
      },
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`\n📄 详细报告已保存到: ${reportPath}`, 'cyan');

    return report;
  }

  // 运行智能推荐引擎
  run() {
    log('🧠 启动智能推荐引擎...', 'magenta');

    this.analyzeProject();
    const report = this.generateReport();

    log('\n🎉 智能推荐引擎运行完成!', 'green');

    return report;
  }
}

// 主函数
function main() {
  const engine = new IntelligentRecommendationEngine();
  return engine.run();
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = IntelligentRecommendationEngine;
