#!/usr/bin/env node

/**
 * 语法检查工具
 * 检查TypeScript文件的基本语法错误
 */

const fs = require('fs');
const path = require('path');

class SyntaxChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.errors = [];
    this.checkedFiles = 0;
  }

  /**
   * 执行语法检查
   */
  async execute() {
    console.log('🔍 开始语法检查...\n');

    try {
      const files = this.getTypeScriptFiles();

      for (const file of files) {
        await this.checkFile(file);
      }

      this.generateReport();

    } catch (error) {
      console.error('❌ 检查过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 检查单个文件
   */
  async checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.checkedFiles++;

      // 检查基本语法错误
      this.checkBasicSyntax(filePath, content);

    } catch (error) {
      this.errors.push({
        file: filePath,
        type: 'read_error',
        message: error.message
      });
    }
  }

  /**
   * 检查基本语法
   */
  checkBasicSyntax(filePath, content) {
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // 检查未闭合的模板字符串
      const templateStringMatches = line.match(/`/g);
      if (templateStringMatches && templateStringMatches.length % 2 !== 0) {
        // 检查是否在下一行有闭合
        const nextLine = lines[index + 1];
        if (!nextLine || !nextLine.includes('`')) {
          this.errors.push({
            file: filePath,
            line: lineNumber,
            type: 'unclosed_template',
            message: '未闭合的模板字符串',
            content: line.trim()
          });
        }
      }

      // 检查未闭合的括号
      const openBrackets = (line.match(/\{/g) || []).length;
      const closeBrackets = (line.match(/\}/g) || []).length;
      if (openBrackets !== closeBrackets && !line.trim().endsWith(',') && !line.trim().endsWith('{')) {
        this.errors.push({
          file: filePath,
          line: lineNumber,
          type: 'bracket_mismatch',
          message: '括号不匹配',
          content: line.trim()
        });
      }

      // 检查错误的正则表达式
      if (line.includes('//') && !line.trim().startsWith('//')) {
        const regexMatches = line.match(/\/[^\/\s]*\/[^\/\s]*\/[gim]*/g);
        if (regexMatches) {
          regexMatches.forEach(regex => {
            if (regex.includes('//')) {
              this.errors.push({
                file: filePath,
                line: lineNumber,
                type: 'invalid_regex',
                message: '可能的错误正则表达式',
                content: regex
              });
            }
          });
        }
      }

      // 检查错误的模板字符串语法
      if (line.includes('${ ') || line.includes(' }')) {
        this.errors.push({
          file: filePath,
          line: lineNumber,
          type: 'template_spacing',
          message: '模板字符串变量周围有多余空格',
          content: line.trim()
        });
      }

      // 检查未闭合的字符串
      const singleQuotes = (line.match(/'/g) || []).length;
      const doubleQuotes = (line.match(/"/g) || []).length;
      if ((singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) &&
        !line.trim().endsWith(',') &&
        !line.trim().endsWith('+') &&
        !line.includes('//')) {
        this.errors.push({
          file: filePath,
          line: lineNumber,
          type: 'unclosed_string',
          message: '可能的未闭合字符串',
          content: line.trim()
        });
      }
    });
  }

  /**
   * 获取TypeScript文件
   */
  getTypeScriptFiles() {
    const files = [];

    const scanDirectory = (dir) => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);

      items.forEach(item => {
        if (this.shouldSkipDirectory(item)) return;

        const fullPath = path.join(dir, item);

        try {
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            scanDirectory(fullPath);
          } else if (/\.(ts|tsx)$/.test(item) && !this.shouldSkipFile(item)) {
            files.push(fullPath);
          }
        } catch (error) {
          // 忽略无法访问的文件
        }
      });
    };

    // 扫描当前目录（如果在frontend目录中）或frontend目录
    if (this.projectRoot.endsWith('frontend')) {
      scanDirectory(this.projectRoot);
    } else {
      scanDirectory(path.join(this.projectRoot, 'frontend'));
    }

    return files;
  }

  shouldSkipFile(fileName) {
    const skipPatterns = [
      /\.(test|spec)\./,
      /\.stories\./,
      /node_modules/,
      /dist/,
      /build/,
      /\.d\.ts$/
    ];

    return skipPatterns.some(pattern => pattern.test(fileName));
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', '.vite'];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('📊 语法检查报告');
    console.log('='.repeat(50));

    console.log(`检查文件: ${this.checkedFiles}`);
    console.log(`发现错误: ${this.errors.length}`);

    if (this.errors.length === 0) {
      console.log('\n✅ 没有发现明显的语法错误！');
      return;
    }

    // 按类型分组显示错误
    const errorsByType = {};
    this.errors.forEach(error => {
      if (!errorsByType[error.type]) {
        errorsByType[error.type] = [];
      }
      errorsByType[error.type].push(error);
    });

    console.log('\n📋 错误详情:');
    Object.entries(errorsByType).forEach(([type, errors]) => {
      console.log(`\n${this.getErrorTypeDisplayName(type)} (${errors.length}个):`);
      errors.slice(0, 5).forEach(error => {
        console.log(`   ❌ ${path.relative(this.projectRoot, error.file)}:${error.line || '?'}`);
        console.log(`      ${error.message}`);
        if (error.content) {
          console.log(`      内容: ${error.content}`);
        }
      });

      if (errors.length > 5) {
        console.log(`   ... 还有 ${errors.length - 5} 个类似错误`);
      }
    });

    console.log('\n💡 建议:');
    console.log('1. 修复上述语法错误');
    console.log('2. 运行 TypeScript 编译检查');
    console.log('3. 使用 IDE 的语法高亮功能');
  }

  getErrorTypeDisplayName(type) {
    const typeNames = {
      unclosed_template: '未闭合的模板字符串',
      bracket_mismatch: '括号不匹配',
      invalid_regex: '错误的正则表达式',
      template_spacing: '模板字符串空格问题',
      unclosed_string: '未闭合的字符串',
      read_error: '文件读取错误'
    };

    return typeNames[type] || type;
  }
}

// 执行检查
if (require.main === module) {
  const checker = new SyntaxChecker();
  checker.execute().catch(console.error);
}

module.exports = SyntaxChecker;
