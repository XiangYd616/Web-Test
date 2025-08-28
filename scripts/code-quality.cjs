/**
 * 代码质量检查脚本
 * 运行各种代码质量检查工具
 *
 * 注意：此文件使用CommonJS格式，需要重命名为.cjs扩展名
 * 或者转换为ES模块格式以兼容项目的"type": "module"设置
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 检查工具是否安装
function checkTool(command, name) {
  try {
    execSync(`npx ${command} --version`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    logWarning(`${name} 未安装或不可用`);
    return false;
  }
}

// 运行命令并捕获输出
function runCommand(command, description) {
  logInfo(`运行: ${description}`);
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..')
    });
    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || error.stderr || error.message
    };
  }
}

// TypeScript 类型检查
function runTypeCheck() {
  logSection('TypeScript 类型检查');

  if (!checkTool('tsc', 'TypeScript')) {
    return false;
  }

  const result = runCommand('npx tsc --noEmit', 'TypeScript 类型检查');

  if (result.success) {
    logSuccess('TypeScript 类型检查通过');
    return true;
  } else {
    logError('TypeScript 类型检查失败');
    console.log(result.output);
    return false;
  }
}

// ESLint 检查
function runESLint() {
  logSection('ESLint 代码检查');

  if (!checkTool('eslint', 'ESLint')) {
    return false;
  }

  const result = runCommand(
    'npx eslint . --ext .ts,.tsx,.js,.jsx --format=stylish',
    'ESLint 代码检查'
  );

  if (result.success) {
    logSuccess('ESLint 检查通过');
    return true;
  } else {
    logError('ESLint 检查发现问题');
    console.log(result.output);
    return false;
  }
}

// Prettier 格式检查
function runPrettierCheck() {
  logSection('Prettier 格式检查');

  if (!checkTool('prettier', 'Prettier')) {
    return false;
  }

  const result = runCommand(
    'npx prettier --check "**/*.{ts,tsx,js,jsx,json,css,scss,md}"',
    'Prettier 格式检查'
  );

  if (result.success) {
    logSuccess('Prettier 格式检查通过');
    return true;
  } else {
    logError('Prettier 格式检查发现问题');
    console.log(result.output);
    logInfo('运行 "npm run format" 来自动修复格式问题');
    return false;
  }
}

// 运行测试
function runTests() {
  logSection('单元测试');

  if (!checkTool('jest', 'Jest')) {
    return false;
  }

  const result = runCommand(
    'npm test -- --coverage --watchAll=false',
    '运行单元测试'
  );

  if (result.success) {
    logSuccess('所有测试通过');
    return true;
  } else {
    logError('测试失败');
    console.log(result.output);
    return false;
  }
}

// 依赖安全检查
function runSecurityAudit() {
  logSection('依赖安全检查');

  const result = runCommand('npm audit --audit-level=moderate', '依赖安全检查');

  if (result.success) {
    logSuccess('依赖安全检查通过');
    return true;
  } else {
    logWarning('发现安全漏洞');
    console.log(result.output);
    logInfo('运行 "npm audit fix" 来修复可自动修复的漏洞');
    return false;
  }
}

// 包大小分析
function analyzeBundleSize() {
  logSection('包大小分析');

  try {
    // 检查是否有构建输出
    const buildPath = path.join(__dirname, '../frontend/dist');
    if (!fs.existsSync(buildPath)) {
      logWarning('未找到构建输出，跳过包大小分析');
      logInfo('运行 "npm run build" 来生成构建输出');
      return true;
    }

    // 分析包大小
    const result = runCommand('npx bundlesize', '包大小检查');

    if (result.success) {
      logSuccess('包大小检查通过');
      return true;
    } else {
      logWarning('包大小超出限制');
      console.log(result.output);
      return false;
    }
  } catch (error) {
    logWarning('包大小分析失败');
    return true; // 非关键检查
  }
}

// 代码复杂度分析
function analyzeComplexity() {
  logSection('代码复杂度分析');

  if (!checkTool('plato', '代码复杂度分析工具')) {
    logWarning('跳过代码复杂度分析');
    return true;
  }

  try {
    const result = runCommand(
      'npx plato -r -d complexity-report **/*.{ts,tsx} --exclude node_modules',
      '代码复杂度分析'
    );

    if (result.success) {
      logSuccess('代码复杂度分析完成');
      logInfo('复杂度报告已生成到 complexity-report 目录');
      return true;
    } else {
      logWarning('代码复杂度分析失败');
      return true; // 非关键检查
    }
  } catch (error) {
    logWarning('代码复杂度分析失败');
    return true;
  }
}

// 生成质量报告
function generateQualityReport(results) {
  logSection('质量报告');

  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(Boolean).length;
  const score = Math.round((passedChecks / totalChecks) * 100);

  log(`\n📊 代码质量评分: ${score}/100`, score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red');
  log(`✅ 通过检查: ${passedChecks}/${totalChecks}`);

  console.log('\n详细结果:');
  Object.entries(results).forEach(([check, passed]) => {
    const status = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`  ${status} ${check}`, color);
  });

  if (score < 80) {
    log('\n🔧 建议:', 'yellow');
    if (!results['TypeScript 类型检查']) {
      log('  - 修复 TypeScript 类型错误');
    }
    if (!results['ESLint 检查']) {
      log('  - 修复 ESLint 报告的问题');
    }
    if (!results['Prettier 格式检查']) {
      log('  - 运行 "npm run format" 修复格式问题');
    }
    if (!results['单元测试']) {
      log('  - 修复失败的测试');
    }
    if (!results['依赖安全检查']) {
      log('  - 运行 "npm audit fix" 修复安全漏洞');
    }
  }

  // 生成 JSON 报告
  const report = {
    timestamp: new Date().toISOString(),
    score,
    totalChecks,
    passedChecks,
    results,
    recommendations: score < 80 ? [
      '修复类型错误',
      '解决代码规范问题',
      '确保测试通过',
      '修复安全漏洞'
    ] : []
  };

  const reportPath = path.join(__dirname, '../quality-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  logInfo(`质量报告已保存到: ${reportPath}`);

  return score >= 80;
}

// 主函数
function main() {
  log('🔍 开始代码质量检查...', 'cyan');

  const results = {};

  // 运行所有检查
  results['TypeScript 类型检查'] = runTypeCheck();
  results['ESLint 检查'] = runESLint();
  results['Prettier 格式检查'] = runPrettierCheck();
  results['单元测试'] = runTests();
  results['依赖安全检查'] = runSecurityAudit();
  results['包大小分析'] = analyzeBundleSize();
  results['代码复杂度分析'] = analyzeComplexity();

  // 生成报告
  const passed = generateQualityReport(results);

  if (passed) {
    log('\n🎉 代码质量检查通过！', 'green');
    process.exit(0);
  } else {
    log('\n💥 代码质量检查未通过，请修复上述问题', 'red');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  runTypeCheck,
  runESLint,
  runPrettierCheck,
  runTests,
  runSecurityAudit,
  analyzeBundleSize,
  analyzeComplexity,
  generateQualityReport
};
