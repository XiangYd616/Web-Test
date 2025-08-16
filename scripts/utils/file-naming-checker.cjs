#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 文件命名规范检查器
 * 检查项目中的文件命名是否符合规范
 */
class FileNamingChecker {
  constructor() {
    this.issues = [];
    this.suggestions = [];
    this.stats = {
      totalFiles: 0,
      checkedFiles: 0,
      issuesFound: 0
    };

    // 命名规范定义
    this.namingRules = {
      // React组件文件：PascalCase
      components: {
        pattern: /^[A-Z][a-zA-Z0-9]*\.(tsx|jsx)$/,
        description: 'React组件应使用PascalCase命名',
        examples: ['Button.tsx', 'UserProfile.tsx', 'DataTable.tsx']
      },

      // 工具文件：camelCase
      utils: {
        pattern: /^[a-z][a-zA-Z0-9]*\.(ts|js)$/,
        description: '工具文件应使用camelCase命名',
        examples: ['apiUtils.ts', 'dateHelper.js', 'formatUtils.ts']
      },

      // 样式文件：kebab-case
      styles: {
        pattern: /^[a-z][a-z0-9-]*\.(css|scss|sass|less)$/,
        description: '样式文件应使用kebab-case命名',
        examples: ['user-profile.css', 'data-table.scss', 'main-layout.css']
      },

      // 页面文件：PascalCase
      pages: {
        pattern: /^[A-Z][a-zA-Z0-9]*\.(tsx|jsx)$/,
        description: '页面文件应使用PascalCase命名',
        examples: ['Dashboard.tsx', 'UserSettings.tsx', 'TestResults.tsx']
      },

      // Hook文件：camelCase with 'use' prefix
      hooks: {
        pattern: /^use[A-Z][a-zA-Z0-9]*\.(ts|tsx)$/,
        description: 'Hook文件应使用camelCase并以use开头',
        examples: ['useAuth.ts', 'useApi.tsx', 'useLocalStorage.ts']
      },

      // 服务文件：camelCase
      services: {
        pattern: /^[a-z][a-zA-Z0-9]*\.(ts|js)$/,
        description: '服务文件应使用camelCase命名',
        examples: ['authService.ts', 'apiClient.js', 'dataProcessor.ts']
      },

      // 类型定义文件：camelCase
      types: {
        pattern: /^[a-z][a-zA-Z0-9]*\.(ts|d\.ts)$/,
        description: '类型定义文件应使用camelCase命名',
        examples: ['user.ts', 'apiResponse.ts', 'common.d.ts']
      }
    };
  }

  /**
   * 检查文件命名规范
   */
  checkNamingConventions(rootDir = 'frontend') {
    console.log('🔍 开始检查文件命名规范...\n');

    this.walkDirectory(rootDir);
    this.generateReport();
  }

  /**
   * 递归遍历目录
   */
  walkDirectory(dir) {
    if (!fs.existsSync(dir)) {
      console.log(`⚠️ 目录不存在: ${dir}`);
      return;
    }

    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // 跳过特定目录
        if (this.shouldSkipDirectory(file)) {
          return;
        }
        this.walkDirectory(filePath);
      } else if (stat.isFile()) {
        this.stats.totalFiles++;
        this.checkFile(filePath, file);
      }
    });
  }

  /**
   * 检查单个文件
   */
  checkFile(filePath, fileName) {
    const relativePath = path.relative(process.cwd(), filePath);
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);

    // 跳过特定文件
    if (this.shouldSkipFile(fileName)) {
      return;
    }

    this.stats.checkedFiles++;

    // 根据文件路径和类型确定应该遵循的命名规范
    const expectedRule = this.determineNamingRule(filePath, fileName);

    if (expectedRule && !expectedRule.pattern.test(fileName)) {
      this.issues.push({
        file: relativePath,
        currentName: fileName,
        rule: expectedRule.description,
        examples: expectedRule.examples,
        suggestion: this.generateSuggestion(fileName, expectedRule)
      });
      this.stats.issuesFound++;
    }
  }

  /**
   * 确定文件应该遵循的命名规范
   */
  determineNamingRule(filePath, fileName) {
    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();

    // React组件
    if (normalizedPath.includes('/components/') && fileName.match(/\.(tsx|jsx)$/)) {
      return this.namingRules.components;
    }

    // 页面文件
    if (normalizedPath.includes('/pages/') && fileName.match(/\.(tsx|jsx)$/)) {
      return this.namingRules.pages;
    }

    // Hook文件
    if (normalizedPath.includes('/hooks/') && fileName.match(/\.(ts|tsx)$/)) {
      return this.namingRules.hooks;
    }

    // 工具文件
    if (normalizedPath.includes('/utils/') && fileName.match(/\.(ts|js)$/)) {
      return this.namingRules.utils;
    }

    // 服务文件
    if (normalizedPath.includes('/services/') && fileName.match(/\.(ts|js)$/)) {
      return this.namingRules.services;
    }

    // 类型文件
    if (normalizedPath.includes('/types/') && fileName.match(/\.(ts|d\.ts)$/)) {
      return this.namingRules.types;
    }

    // 样式文件
    if (fileName.match(/\.(css|scss|sass|less)$/)) {
      return this.namingRules.styles;
    }

    return null;
  }

  /**
   * 生成命名建议
   */
  generateSuggestion(fileName, rule) {
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);

    // 根据规则类型生成建议
    if (rule === this.namingRules.components || rule === this.namingRules.pages) {
      // PascalCase
      return this.toPascalCase(baseName) + ext;
    } else if (rule === this.namingRules.utils || rule === this.namingRules.services || rule === this.namingRules.types) {
      // camelCase
      return this.toCamelCase(baseName) + ext;
    } else if (rule === this.namingRules.styles) {
      // kebab-case
      return this.toKebabCase(baseName) + ext;
    } else if (rule === this.namingRules.hooks) {
      // use + PascalCase
      const cleanName = baseName.replace(/^use/, '');
      return 'use' + this.toPascalCase(cleanName) + ext;
    }

    return fileName;
  }

  /**
   * 转换为PascalCase
   */
  toPascalCase(str) {
    return str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
      .replace(/^(.)/, (_, char) => char.toUpperCase());
  }

  /**
   * 转换为camelCase
   */
  toCamelCase(str) {
    return str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
      .replace(/^(.)/, (_, char) => char.toLowerCase());
  }

  /**
   * 转换为kebab-case
   */
  toKebabCase(str) {
    return str.replace(/([A-Z])/g, '-$1')
      .replace(/[-_\s]+/g, '-')
      .toLowerCase()
      .replace(/^-/, '');
  }

  /**
   * 是否跳过目录
   */
  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules', '.git', 'dist', 'build', 'coverage',
      '__tests__', '.vscode', '.idea', 'temp', 'tmp'
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * 是否跳过文件
   */
  shouldSkipFile(fileName) {
    const skipFiles = [
      'index.ts', 'index.tsx', 'index.js', 'index.jsx',
      'vite-env.d.ts', 'global.d.ts'
    ];
    return skipFiles.includes(fileName) ||
      fileName.startsWith('.') ||
      fileName.includes('.test.') ||
      fileName.includes('.spec.') ||
      fileName.includes('.stories.'); // 跳过Storybook文件
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('📊 文件命名规范检查报告\n');
    console.log(`📁 总文件数: ${this.stats.totalFiles}`);
    console.log(`🔍 检查文件数: ${this.stats.checkedFiles}`);
    console.log(`⚠️ 发现问题: ${this.stats.issuesFound}\n`);

    if (this.issues.length === 0) {
      console.log('✅ 所有文件命名都符合规范！');
      return;
    }

    console.log('🔧 需要修复的文件:\n');

    this.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.file}`);
      console.log(`   当前名称: ${issue.currentName}`);
      console.log(`   建议名称: ${issue.suggestion}`);
      console.log(`   规范说明: ${issue.rule}`);
      console.log(`   示例: ${issue.examples.join(', ')}\n`);
    });

    this.generateSummary();
  }

  /**
   * 生成总结
   */
  generateSummary() {
    console.log('📋 修复建议总结:\n');

    const ruleGroups = {};
    this.issues.forEach(issue => {
      if (!ruleGroups[issue.rule]) {
        ruleGroups[issue.rule] = [];
      }
      ruleGroups[issue.rule].push(issue);
    });

    Object.entries(ruleGroups).forEach(([rule, issues]) => {
      console.log(`📌 ${rule}: ${issues.length} 个文件`);
      issues.slice(0, 3).forEach(issue => {
        console.log(`   • ${issue.currentName} → ${issue.suggestion}`);
      });
      if (issues.length > 3) {
        console.log(`   ... 还有 ${issues.length - 3} 个文件`);
      }
      console.log('');
    });
  }
}

// 主函数
function main() {
  const checker = new FileNamingChecker();
  checker.checkNamingConventions();
}

if (require.main === module) {
  main();
}

module.exports = FileNamingChecker;
