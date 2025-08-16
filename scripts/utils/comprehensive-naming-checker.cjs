#!/usr/bin/env node

/**
 * 全面命名规范检查器
 * 检查项目中所有类型的命名问题
 */

const fs = require('fs');
const path = require('path');

class ComprehensiveNamingChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.issues = [];
    this.statistics = {
      totalFiles: 0,
      checkedFiles: 0,
      totalIssues: 0,
      fixableIssues: 0
    };

    // 命名规范定义
    this.namingRules = {
      // 文件命名规范
      files: {
        components: /^[A-Z][a-zA-Z0-9]*\.(tsx|jsx)$/,
        utils: /^[a-z][a-zA-Z0-9]*\.(ts|js)$/,
        services: /^[a-z][a-zA-Z0-9]*\.(ts|js)$/,
        types: /^[a-z][a-zA-Z0-9]*\.(ts|d\.ts)$/,
        hooks: /^use[A-Z][a-zA-Z0-9]*\.(ts|tsx)$/,
        pages: /^[A-Z][a-zA-Z0-9]*\.(tsx|jsx)$/,
        styles: /^[a-z][a-z0-9-]*\.(css|scss|sass|less)$/
      },

      // 代码命名规范
      code: {
        // 类名：PascalCase
        classes: /^[A-Z][a-zA-Z0-9]*$/,
        // 变量和函数：camelCase
        variables: /^[a-z][a-zA-Z0-9]*$/,
        // 常量：UPPER_SNAKE_CASE
        constants: /^[A-Z][A-Z0-9_]*$/,
        // 接口：PascalCase
        interfaces: /^[A-Z][a-zA-Z0-9]*$/,
        // 类型：PascalCase
        types: /^[A-Z][a-zA-Z0-9]*$/
      }
    };

    // 不规范的命名模式
    this.antiPatterns = {
      // 版本化前缀 - 只检查明显的版本化前缀
      versionPrefixes: ['Enhanced', 'Advanced', 'Optimized', 'Improved', 'Unified', 'Extended', 'Modern', 'Smart', 'Better', 'New', 'Updated', 'Intelligent', 'Ultra', 'Master', 'Final', 'Latest'],

      // 匈牙利命名法
      hungarianNotation: ['str', 'int', 'bool', 'obj', 'arr', 'fn', 'num'],

      // 过时的方法
      deprecatedMethods: ['substr', 'var ', 'function '],

      // 不规范的缩写
      badAbbreviations: ['mgr', 'ctrl', 'btn', 'txt', 'img', 'div', 'elem', 'obj', 'arr', 'str', 'num', 'bool'],

      // 下划线命名（JavaScript中应避免）
      underscoreNaming: /_[a-z]/,

      // 连续大写字母
      consecutiveUppercase: /[A-Z]{3,}/
    };
  }

  /**
   * 执行全面检查
   */
  async executeCheck() {
    console.log('🔍 开始全面命名规范检查...\n');

    try {
      // 1. 检查文件命名
      await this.checkFileNaming();

      // 2. 检查代码命名
      await this.checkCodeNaming();

      // 3. 检查过时用法
      await this.checkDeprecatedUsage();

      // 4. 生成报告
      this.generateReport();

      console.log('✅ 命名规范检查完成！');

    } catch (error) {
      console.error('❌ 检查过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 检查文件命名
   */
  async checkFileNaming() {
    console.log('📁 检查文件命名规范...');

    const files = this.getAllProjectFiles();
    this.statistics.totalFiles = files.length;

    for (const file of files) {
      this.statistics.checkedFiles++;
      await this.checkSingleFile(file);
    }

    console.log(`   检查了 ${files.length} 个文件\n`);
  }

  /**
   * 检查单个文件
   */
  async checkSingleFile(filePath) {
    const fileName = path.basename(filePath);
    const baseName = path.basename(fileName, path.extname(fileName));
    const extension = path.extname(fileName);
    const directory = path.dirname(filePath);

    // 跳过特殊文件
    if (this.shouldSkipFile(fileName)) {
      return;
    }

    // 检查版本化前缀 - 只检查明显的版本化前缀
    const hasVersionPrefix = this.antiPatterns.versionPrefixes.some(prefix =>
      baseName.startsWith(prefix) || baseName.includes(prefix + 'Test') || baseName.includes(prefix + 'Engine')
    );

    if (hasVersionPrefix) {
      this.addIssue({
        type: 'file_naming',
        severity: 'medium',
        file: filePath,
        issue: '文件名包含版本化前缀',
        current: fileName,
        suggestion: this.removeVersionPrefixes(baseName) + extension,
        fixable: true
      });
    }

    // 检查文件类型特定的命名规范
    const fileType = this.determineFileType(filePath);
    if (fileType && this.namingRules.files[fileType]) {
      const pattern = this.namingRules.files[fileType];
      if (!pattern.test(fileName)) {
        this.addIssue({
          type: 'file_naming',
          severity: 'high',
          file: filePath,
          issue: `${fileType}文件命名不符合规范`,
          current: fileName,
          suggestion: this.generateFileNameSuggestion(baseName, fileType) + extension,
          fixable: true
        });
      }
    }

    // 检查代码内容
    if (/\.(ts|tsx|js|jsx)$/.test(fileName)) {
      await this.checkFileContent(filePath);
    }
  }

  /**
   * 检查文件内容中的命名
   */
  async checkFileContent(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // 检查类名
      this.checkClassNames(content, filePath);

      // 检查变量名
      this.checkVariableNames(content, filePath);

      // 检查函数名
      this.checkFunctionNames(content, filePath);

      // 检查常量名
      this.checkConstantNames(content, filePath);

    } catch (error) {
      // 忽略无法读取的文件
    }
  }

  /**
   * 检查类名
   */
  checkClassNames(content, filePath) {
    const classMatches = content.match(/class\s+([A-Za-z_$][A-Za-z0-9_$]*)/g);
    if (classMatches) {
      classMatches.forEach(match => {
        const className = match.replace('class ', '').trim();

        // 检查版本化前缀
        if (this.hasVersionPrefix(className)) {
          this.addIssue({
            type: 'class_naming',
            severity: 'medium',
            file: filePath,
            issue: '类名包含版本化前缀',
            current: className,
            suggestion: this.removeVersionPrefixes(className),
            fixable: true
          });
        }

        // 检查PascalCase
        if (!this.namingRules.code.classes.test(className)) {
          this.addIssue({
            type: 'class_naming',
            severity: 'high',
            file: filePath,
            issue: '类名应使用PascalCase',
            current: className,
            suggestion: this.toPascalCase(className),
            fixable: true
          });
        }
      });
    }
  }

  /**
   * 检查变量名
   */
  checkVariableNames(content, filePath) {
    // 检查let/const声明
    const varMatches = content.match(/(let|const)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g);
    if (varMatches) {
      varMatches.forEach(match => {
        const parts = match.split(/\s+/);
        const varName = parts[1];

        // 跳过常量（全大写）
        if (varName === varName.toUpperCase()) {
          return;
        }

        // 检查camelCase
        if (!this.namingRules.code.variables.test(varName)) {
          this.addIssue({
            type: 'variable_naming',
            severity: 'medium',
            file: filePath,
            issue: '变量名应使用camelCase',
            current: varName,
            suggestion: this.toCamelCase(varName),
            fixable: true
          });
        }
      });
    }
  }

  /**
   * 检查函数名
   */
  checkFunctionNames(content, filePath) {
    // 检查函数声明和箭头函数
    const functionMatches = content.match(/(function\s+([A-Za-z_$][A-Za-z0-9_$]*)|([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*\([^)]*\)\s*=>)/g);
    if (functionMatches) {
      functionMatches.forEach(match => {
        let funcName;
        if (match.includes('function')) {
          funcName = match.replace(/function\s+/, '').split('(')[0].trim();
        } else {
          funcName = match.split('=')[0].trim();
        }

        // 检查camelCase
        if (!this.namingRules.code.variables.test(funcName)) {
          this.addIssue({
            type: 'function_naming',
            severity: 'medium',
            file: filePath,
            issue: '函数名应使用camelCase',
            current: funcName,
            suggestion: this.toCamelCase(funcName),
            fixable: true
          });
        }
      });
    }
  }

  /**
   * 检查常量名
   */
  checkConstantNames(content, filePath) {
    // 检查全大写的常量
    const constantMatches = content.match(/const\s+([A-Z][A-Z0-9_]*)\s*=/g);
    if (constantMatches) {
      constantMatches.forEach(match => {
        const constName = match.replace(/const\s+/, '').split('=')[0].trim();

        // 检查UPPER_SNAKE_CASE
        if (!this.namingRules.code.constants.test(constName)) {
          this.addIssue({
            type: 'constant_naming',
            severity: 'low',
            file: filePath,
            issue: '常量名应使用UPPER_SNAKE_CASE',
            current: constName,
            suggestion: this.toUpperSnakeCase(constName),
            fixable: true
          });
        }
      });
    }
  }

  /**
   * 检查代码命名
   */
  async checkCodeNaming() {
    console.log('💻 检查代码命名规范...');
    // 这部分在checkFileContent中已经实现
    console.log('   代码命名检查完成\n');
  }

  /**
   * 检查过时用法
   */
  async checkDeprecatedUsage() {
    console.log('⚠️  检查过时用法...');

    const files = this.getAllProjectFiles().filter(file =>
      /\.(ts|tsx|js|jsx)$/.test(file)
    );

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');

        // 检查substr
        if (content.includes('.substr(')) {
          this.addIssue({
            type: 'deprecated_method',
            severity: 'medium',
            file,
            issue: '使用了过时的substr方法',
            current: '.substr(',
            suggestion: '.substring(',
            fixable: true
          });
        }

        // 检查var声明
        if (content.match(/\bvar\s+/)) {
          this.addIssue({
            type: 'deprecated_syntax',
            severity: 'medium',
            file,
            issue: '使用了过时的var声明',
            current: 'var',
            suggestion: 'let/const',
            fixable: true
          });
        }

      } catch (error) {
        // 忽略无法读取的文件
      }
    }

    console.log('   过时用法检查完成\n');
  }

  /**
   * 辅助方法
   */
  getAllProjectFiles() {
    const files = [];

    const scanDirectory = (dir, relativePath = '') => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);

      items.forEach(item => {
        if (this.shouldSkipDirectory(item)) return;

        const fullPath = path.join(dir, item);
        const relativeFilePath = path.join(relativePath, item);

        try {
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            scanDirectory(fullPath, relativeFilePath);
          } else {
            files.push(relativeFilePath.replace(/\\/g, '/'));
          }
        } catch (error) {
          // 忽略无法访问的文件
        }
      });
    };

    scanDirectory(path.join(this.projectRoot, 'frontend'));
    scanDirectory(path.join(this.projectRoot, 'backend'));

    return files;
  }

  shouldSkipFile(fileName) {
    const skipPatterns = [
      /^index\.(ts|tsx|js|jsx)$/,
      /\.(test|spec)\./,
      /\.stories\./,
      /^\./, // 隐藏文件
      /node_modules/,
      /dist/,
      /build/
    ];

    return skipPatterns.some(pattern => pattern.test(fileName));
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', '.vite'];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  determineFileType(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();

    if (normalizedPath.includes('/components/') && filePath.match(/\.(tsx|jsx)$/)) {
      return 'components';
    }
    if (normalizedPath.includes('/pages/') && filePath.match(/\.(tsx|jsx)$/)) {
      return 'pages';
    }
    if (normalizedPath.includes('/hooks/') && filePath.match(/\.(ts|tsx)$/)) {
      return 'hooks';
    }
    if (normalizedPath.includes('/utils/') && filePath.match(/\.(ts|js)$/)) {
      return 'utils';
    }
    if (normalizedPath.includes('/services/') && filePath.match(/\.(ts|js)$/)) {
      return 'services';
    }
    if (normalizedPath.includes('/types/') && filePath.match(/\.(ts|d\.ts)$/)) {
      return 'types';
    }

    return null;
  }

  hasVersionPrefix(name) {
    return this.antiPatterns.versionPrefixes.some(prefix =>
      name.includes(prefix)
    );
  }

  removeVersionPrefixes(name) {
    let cleanName = name;

    // 只移除明显的版本化前缀
    this.antiPatterns.versionPrefixes.forEach(prefix => {
      if (cleanName.startsWith(prefix)) {
        cleanName = cleanName.substring(prefix.length);
      }
    });

    // 清理连接符
    cleanName = cleanName.replace(/^[-_]+|[-_]+$/g, '');

    return cleanName || name; // 如果清理后为空，返回原名
  }

  toPascalCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  toCamelCase(str) {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  toUpperSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter}`).toUpperCase();
  }

  generateFileNameSuggestion(baseName, fileType) {
    const cleanName = this.removeVersionPrefixes(baseName);

    switch (fileType) {
      case 'components':
      case 'pages':
        return this.toPascalCase(cleanName);
      case 'utils':
      case 'services':
      case 'types':
        return this.toCamelCase(cleanName);
      case 'hooks':
        return cleanName.startsWith('use') ? cleanName : `use${this.toPascalCase(cleanName)}`;
      default:
        return cleanName;
    }
  }

  addIssue(issue) {
    this.issues.push(issue);
    this.statistics.totalIssues++;
    if (issue.fixable) {
      this.statistics.fixableIssues++;
    }
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('📊 命名规范检查报告');
    console.log('='.repeat(50));

    console.log(`总文件数: ${this.statistics.totalFiles}`);
    console.log(`检查文件数: ${this.statistics.checkedFiles}`);
    console.log(`发现问题: ${this.statistics.totalIssues}`);
    console.log(`可修复问题: ${this.statistics.fixableIssues}`);

    if (this.issues.length === 0) {
      console.log('\n✅ 恭喜！没有发现命名规范问题。');
      return;
    }

    // 按类型分组显示问题
    const issuesByType = {};
    this.issues.forEach(issue => {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
    });

    console.log('\n📋 问题详情:');
    Object.entries(issuesByType).forEach(([type, issues]) => {
      console.log(`\n${this.getTypeDisplayName(type)} (${issues.length}个问题):`);
      issues.slice(0, 5).forEach(issue => { // 只显示前5个
        console.log(`   ❌ ${issue.file}`);
        console.log(`      问题: ${issue.issue}`);
        console.log(`      当前: ${issue.current}`);
        console.log(`      建议: ${issue.suggestion}`);
      });

      if (issues.length > 5) {
        console.log(`   ... 还有 ${issues.length - 5} 个类似问题`);
      }
    });

    console.log('\n💡 修复建议:');
    console.log('1. 运行 `node scripts/fix-naming-issues.cjs` 自动修复可修复的问题');
    console.log('2. 手动检查和修复其他问题');
    console.log('3. 更新相关的导入语句');
  }

  getTypeDisplayName(type) {
    const typeNames = {
      file_naming: '文件命名',
      class_naming: '类命名',
      variable_naming: '变量命名',
      function_naming: '函数命名',
      constant_naming: '常量命名',
      deprecated_method: '过时方法',
      deprecated_syntax: '过时语法'
    };

    return typeNames[type] || type;
  }
}

// 执行检查
if (require.main === module) {
  const checker = new ComprehensiveNamingChecker();
  checker.executeCheck().catch(console.error);
}

module.exports = ComprehensiveNamingChecker;
