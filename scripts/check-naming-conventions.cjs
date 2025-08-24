#!/usr/bin/env node

/**
 * 文件命名规范检查脚本
 * 检查项目中的文件是否符合命名规范
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 命名规范规则
const namingRules = {
  // React组件文件 - PascalCase.tsx
  reactComponents: {
    pattern: /^[A-Z][a-zA-Z0-9]*\.tsx$/,
    description: 'React组件应使用PascalCase.tsx格式',
    paths: ['frontend/components/**/*.tsx', 'frontend/pages/**/*.tsx']
  },

  // Hook文件 - use + PascalCase.ts (允许index.ts例外)
  hooks: {
    pattern: /^(use[A-Z][a-zA-Z0-9]*\.ts|index\.ts)$/,
    description: 'Hook文件应使用use + PascalCase.ts格式（index.ts除外）',
    paths: ['frontend/hooks/**/*.ts']
  },

  // 服务类文件 - camelCase.ts
  services: {
    pattern: /^[a-z][a-zA-Z0-9]*\.ts$/,
    description: '服务类文件应使用camelCase.ts格式',
    paths: ['frontend/services/**/*.ts']
  },

  // 类型定义文件 - camelCase.types.ts (允许特殊例外)
  types: {
    pattern: /^([a-z][a-zA-Z0-9]*\.types\.ts|index\.ts|electron\.d\.ts)$/,
    description: '类型定义文件应使用camelCase.types.ts格式（index.ts和electron.d.ts除外）',
    paths: ['frontend/types/**/*.ts']
  },

  // 工具函数文件 - camelCase.ts 或 camelCase.utils.ts
  utils: {
    pattern: /^[a-z][a-zA-Z0-9]*(\.utils)?\.ts$/,
    description: '工具函数文件应使用camelCase.ts或camelCase.utils.ts格式',
    paths: ['frontend/utils/**/*.ts']
  },

  // 样式文件 - kebab-case.css/scss
  styles: {
    pattern: /^[a-z][a-z0-9-]*\.(css|scss)$/,
    description: '样式文件应使用kebab-case.css/scss格式',
    paths: ['frontend/styles/**/*.css', 'frontend/styles/**/*.scss']
  },

  // 测试文件 - 与被测试文件相同.test.ts/tsx
  tests: {
    pattern: /^[a-zA-Z][a-zA-Z0-9]*\.test\.(ts|tsx)$/,
    description: '测试文件应使用与被测试文件相同的命名.test.ts/tsx格式',
    paths: ['frontend/**/*.test.ts', 'frontend/**/*.test.tsx']
  },

  // 文档文件 - kebab-case.md 或 UPPER_CASE.md
  docs: {
    pattern: /^([a-z][a-z0-9-]*|[A-Z][A-Z0-9_]*)\.md$/,
    description: '文档文件应使用kebab-case.md或UPPER_CASE.md格式',
    paths: ['**/*.md']
  }
};

// 检查单个文件
function checkFile(filePath, rule) {
  const fileName = path.basename(filePath);
  const isValid = rule.pattern.test(fileName);

  return {
    filePath,
    fileName,
    isValid,
    rule: rule.description
  };
}

// 检查所有文件
function checkAllFiles() {
  const results = {
    total: 0,
    valid: 0,
    invalid: 0,
    violations: []
  };

  for (const [ruleName, rule] of Object.entries(namingRules)) {
    log(`\n🔍 检查 ${ruleName}...`, 'blue');

    for (const pattern of rule.paths) {
      const files = glob.sync(pattern, { ignore: ['node_modules/**', 'dist/**', 'build/**'] });

      for (const file of files) {
        const result = checkFile(file, rule);
        results.total++;

        if (result.isValid) {
          results.valid++;
        } else {
          results.invalid++;
          results.violations.push({
            ...result,
            ruleName
          });
          log(`  ❌ ${result.filePath}`, 'red');
          log(`     规则: ${result.rule}`, 'yellow');
        }
      }
    }
  }

  return results;
}

// 生成修复建议
function generateFixSuggestions(violations) {
  const suggestions = [];

  for (const violation of violations) {
    const { filePath, fileName, ruleName } = violation;
    let suggestion = '';

    switch (ruleName) {
      case 'reactComponents':
        // 转换为PascalCase
        suggestion = fileName.replace(/^[a-z]/, char => char.toUpperCase())
          .replace(/-([a-z])/g, (_, char) => char.toUpperCase());
        break;

      case 'hooks':
        // 确保以use开头且为PascalCase
        if (!fileName.startsWith('use')) {
          suggestion = 'use' + fileName.charAt(0).toUpperCase() + fileName.slice(1);
        }
        break;

      case 'services':
        // 转换为camelCase
        suggestion = fileName.replace(/^[A-Z]/, char => char.toLowerCase())
          .replace(/-([a-z])/g, (_, char) => char.toUpperCase());
        break;

      case 'styles':
        // 转换为kebab-case
        suggestion = fileName.replace(/([A-Z])/g, '-$1').toLowerCase()
          .replace(/^-/, '');
        break;

      case 'docs':
        // 转换为kebab-case（除非是特殊文档）
        const specialDocs = ['README', 'CHANGELOG', 'LICENSE'];
        const baseName = fileName.replace('.md', '');
        if (specialDocs.includes(baseName.toUpperCase())) {
          suggestion = baseName.toUpperCase() + '.md';
        } else {
          suggestion = baseName.replace(/([A-Z])/g, '-$1').toLowerCase()
            .replace(/^-/, '') + '.md';
        }
        break;

      default:
        suggestion = '请参考命名规范手动修复';
    }

    if (suggestion && suggestion !== fileName) {
      suggestions.push({
        current: filePath,
        suggested: path.join(path.dirname(filePath), suggestion),
        command: `git mv "${filePath}" "${path.join(path.dirname(filePath), suggestion)}"`
      });
    }
  }

  return suggestions;
}

// 生成报告
function generateReport(results) {
  log('\n📊 检查结果汇总', 'blue');
  log(`总文件数: ${results.total}`, 'blue');
  log(`符合规范: ${results.valid}`, 'green');
  log(`不符合规范: ${results.invalid}`, results.invalid > 0 ? 'red' : 'green');

  if (results.invalid > 0) {
    log(`\n❌ 发现 ${results.invalid} 个命名规范违规`, 'red');

    // 按规则分组显示违规
    const violationsByRule = {};
    for (const violation of results.violations) {
      if (!violationsByRule[violation.ruleName]) {
        violationsByRule[violation.ruleName] = [];
      }
      violationsByRule[violation.ruleName].push(violation);
    }

    for (const [ruleName, violations] of Object.entries(violationsByRule)) {
      log(`\n📋 ${ruleName} (${violations.length}个违规):`, 'yellow');
      for (const violation of violations) {
        log(`  • ${violation.filePath}`, 'red');
      }
    }

    // 生成修复建议
    const suggestions = generateFixSuggestions(results.violations);
    if (suggestions.length > 0) {
      log('\n🔧 修复建议:', 'blue');
      log('可以使用以下命令修复文件名:', 'blue');
      log('```bash', 'blue');
      for (const suggestion of suggestions.slice(0, 10)) { // 只显示前10个
        log(suggestion.command, 'yellow');
      }
      if (suggestions.length > 10) {
        log(`... 还有 ${suggestions.length - 10} 个文件需要修复`, 'yellow');
      }
      log('```', 'blue');

      // 保存修复脚本
      const fixScript = suggestions.map(s => s.command).join('\n');
      fs.writeFileSync('fix-naming.sh', `#!/bin/bash\n\n# 自动生成的文件命名修复脚本\n# 执行前请确保代码已提交到Git\n\n${fixScript}\n`);
      log('\n💾 修复脚本已保存到 fix-naming.sh', 'green');
      log('执行前请确保代码已提交到Git！', 'yellow');
    }
  } else {
    log('\n🎉 所有文件都符合命名规范！', 'green');
  }

  return results.invalid === 0;
}

// 主函数
function main() {
  log('🚀 开始检查文件命名规范...', 'blue');

  try {
    const results = checkAllFiles();
    const isValid = generateReport(results);

    if (isValid) {
      log('\n✅ 命名规范检查通过', 'green');
      process.exit(0);
    } else {
      log('\n❌ 命名规范检查失败', 'red');
      log('请修复上述问题后重新检查', 'yellow');
      process.exit(1);
    }
  } catch (error) {
    log(`❌ 检查过程中出现错误: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 检查依赖
function checkDependencies() {
  try {
    require('glob');
    return true;
  } catch (error) {
    log('❌ 缺少必要依赖: glob', 'red');
    log('请运行: npm install glob', 'yellow');
    return false;
  }
}

// 入口点
if (require.main === module) {
  if (!checkDependencies()) {
    process.exit(1);
  }
  main();
}

module.exports = {
  checkFile,
  checkAllFiles,
  generateFixSuggestions,
  namingRules
};
