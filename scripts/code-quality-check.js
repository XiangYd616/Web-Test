/**
 * 代码质量检查工具
 * 
 * 检查代码中的常见问题：
 * - 未使用的变量和导入
 * - 重复代码
 * - 命名规范
 * - 注释覆盖率
 * - 错误处理
 */

const fs = require('fs');
const path = require('path');

/**
 * 代码质量检查器
 */
class CodeQualityChecker {
  constructor() {
    this.issues = [];
    this.stats = {
      totalFiles: 0,
      totalLines: 0,
      totalFunctions: 0,
      totalClasses: 0,
      commentedLines: 0,
      issueCount: 0
    };
  }

  /**
   * 检查单个文件
   */
  checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      this.stats.totalFiles++;
      this.stats.totalLines += lines.length;
      
      // 检查各种问题
      this.checkNamingConventions(filePath, content);
      this.checkCommentCoverage(filePath, lines);
      this.checkErrorHandling(filePath, content);
      this.checkUnusedVariables(filePath, content);
      this.checkDuplicateCode(filePath, content);
      this.checkFunctionComplexity(filePath, content);
      this.checkConsoleStatements(filePath, content);
      
    } catch (error) {
      this.addIssue(filePath, 0, 'error', `无法读取文件: ${error.message}`);
    }
  }

  /**
   * 检查命名规范
   */
  checkNamingConventions(filePath, content) {
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // 检查变量命名（应该使用camelCase）
      const varMatches = line.match(/(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g);
      if (varMatches) {
        varMatches.forEach(match => {
          const varName = match.split(/\s+/)[1];
          if (varName && !this.isCamelCase(varName) && !this.isConstantCase(varName)) {
            this.addIssue(filePath, index + 1, 'warning', 
              `变量名 '${varName}' 不符合命名规范（应使用camelCase或CONSTANT_CASE）`);
          }
        });
      }

      // 检查函数命名
      const funcMatches = line.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g);
      if (funcMatches) {
        funcMatches.forEach(match => {
          const funcName = match.split(/\s+/)[1];
          if (funcName && !this.isCamelCase(funcName)) {
            this.addIssue(filePath, index + 1, 'warning', 
              `函数名 '${funcName}' 不符合命名规范（应使用camelCase）`);
          }
        });
      }

      // 检查类命名
      const classMatches = line.match(/class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g);
      if (classMatches) {
        classMatches.forEach(match => {
          const className = match.split(/\s+/)[1];
          if (className && !this.isPascalCase(className)) {
            this.addIssue(filePath, index + 1, 'warning', 
              `类名 '${className}' 不符合命名规范（应使用PascalCase）`);
          }
        });
        this.stats.totalClasses++;
      }
    });
  }

  /**
   * 检查注释覆盖率
   */
  checkCommentCoverage(filePath, lines) {
    let commentLines = 0;
    let codeLines = 0;
    let inBlockComment = false;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('/*')) {
        inBlockComment = true;
        commentLines++;
      } else if (trimmed.endsWith('*/')) {
        inBlockComment = false;
        commentLines++;
      } else if (inBlockComment) {
        commentLines++;
      } else if (trimmed.startsWith('//')) {
        commentLines++;
      } else if (trimmed && !trimmed.startsWith('*')) {
        codeLines++;
      }
    });

    this.stats.commentedLines += commentLines;
    
    const commentRatio = codeLines > 0 ? (commentLines / codeLines) * 100 : 0;
    if (commentRatio < 10 && codeLines > 50) {
      this.addIssue(filePath, 0, 'info', 
        `注释覆盖率较低 (${commentRatio.toFixed(1)}%)，建议增加注释`);
    }
  }

  /**
   * 检查错误处理
   */
  checkErrorHandling(filePath, content) {
    const lines = content.split('\n');
    let tryBlocks = 0;
    let asyncFunctions = 0;
    let unhandledAsync = 0;

    lines.forEach((line, index) => {
      if (line.includes('try {')) {
        tryBlocks++;
      }
      
      if (line.includes('async ') || line.includes('async(')) {
        asyncFunctions++;
        
        // 检查async函数是否有错误处理
        const nextLines = lines.slice(index, index + 10).join('\n');
        if (!nextLines.includes('try') && !nextLines.includes('catch')) {
          unhandledAsync++;
          this.addIssue(filePath, index + 1, 'warning', 
            'async函数缺少错误处理（try-catch）');
        }
      }

      // 检查Promise是否有catch
      if (line.includes('.then(') && !line.includes('.catch(')) {
        const nextLines = lines.slice(index, index + 5).join('\n');
        if (!nextLines.includes('.catch(')) {
          this.addIssue(filePath, index + 1, 'warning', 
            'Promise链缺少错误处理（.catch）');
        }
      }
    });
  }

  /**
   * 检查未使用的变量
   */
  checkUnusedVariables(filePath, content) {
    // 简单的未使用变量检查
    const varDeclarations = content.match(/(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g);
    if (varDeclarations) {
      varDeclarations.forEach(declaration => {
        const varName = declaration.split(/\s+/)[1];
        if (varName) {
          const usageCount = (content.match(new RegExp(`\\b${varName}\\b`, 'g')) || []).length;
          if (usageCount === 1) {
            this.addIssue(filePath, 0, 'info', 
              `变量 '${varName}' 可能未被使用`);
          }
        }
      });
    }
  }

  /**
   * 检查重复代码
   */
  checkDuplicateCode(filePath, content) {
    const lines = content.split('\n');
    const lineGroups = {};

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed && trimmed.length > 20 && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
        if (!lineGroups[trimmed]) {
          lineGroups[trimmed] = [];
        }
        lineGroups[trimmed].push(index + 1);
      }
    });

    Object.entries(lineGroups).forEach(([line, occurrences]) => {
      if (occurrences.length > 1) {
        this.addIssue(filePath, occurrences[0], 'info', 
          `重复代码行，出现在第 ${occurrences.join(', ')} 行`);
      }
    });
  }

  /**
   * 检查函数复杂度
   */
  checkFunctionComplexity(filePath, content) {
    const functionRegex = /function\s+\w+\s*\([^)]*\)\s*\{/g;
    const arrowFunctionRegex = /\w+\s*=\s*\([^)]*\)\s*=>\s*\{/g;
    
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      this.checkSingleFunctionComplexity(filePath, content, match.index);
    }
    
    while ((match = arrowFunctionRegex.exec(content)) !== null) {
      this.checkSingleFunctionComplexity(filePath, content, match.index);
    }
  }

  /**
   * 检查单个函数的复杂度
   */
  checkSingleFunctionComplexity(filePath, content, startIndex) {
    const lines = content.substring(startIndex).split('\n');
    let braceCount = 0;
    let complexity = 1; // 基础复杂度
    let lineCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      lineCount++;

      // 计算大括号
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;

      // 计算复杂度
      if (line.includes('if ') || line.includes('else if ')) complexity++;
      if (line.includes('for ') || line.includes('while ')) complexity++;
      if (line.includes('switch ')) complexity++;
      if (line.includes('case ')) complexity++;
      if (line.includes('catch ')) complexity++;

      // 函数结束
      if (braceCount === 0 && i > 0) {
        break;
      }
    }

    this.stats.totalFunctions++;

    if (complexity > 10) {
      this.addIssue(filePath, 0, 'warning', 
        `函数复杂度过高 (${complexity})，建议重构`);
    }

    if (lineCount > 50) {
      this.addIssue(filePath, 0, 'info', 
        `函数过长 (${lineCount} 行)，建议拆分`);
    }
  }

  /**
   * 检查console语句
   */
  checkConsoleStatements(filePath, content) {
    const consoleMatches = content.match(/console\.(log|error|warn|info|debug)/g);
    if (consoleMatches && consoleMatches.length > 0) {
      this.addIssue(filePath, 0, 'info', 
        `发现 ${consoleMatches.length} 个console语句，建议使用统一的日志系统`);
    }
  }

  /**
   * 添加问题
   */
  addIssue(filePath, lineNumber, severity, message) {
    this.issues.push({
      file: filePath,
      line: lineNumber,
      severity,
      message
    });
    this.stats.issueCount++;
  }

  /**
   * 检查是否为camelCase
   */
  isCamelCase(str) {
    return /^[a-z][a-zA-Z0-9]*$/.test(str);
  }

  /**
   * 检查是否为PascalCase
   */
  isPascalCase(str) {
    return /^[A-Z][a-zA-Z0-9]*$/.test(str);
  }

  /**
   * 检查是否为CONSTANT_CASE
   */
  isConstantCase(str) {
    return /^[A-Z][A-Z0-9_]*$/.test(str);
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n📊 代码质量检查报告');
    console.log('='.repeat(50));
    
    console.log('\n📈 统计信息:');
    console.log(`   - 总文件数: ${this.stats.totalFiles}`);
    console.log(`   - 总行数: ${this.stats.totalLines}`);
    console.log(`   - 函数数: ${this.stats.totalFunctions}`);
    console.log(`   - 类数: ${this.stats.totalClasses}`);
    console.log(`   - 注释行数: ${this.stats.commentedLines}`);
    console.log(`   - 问题总数: ${this.stats.issueCount}`);

    if (this.issues.length > 0) {
      console.log('\n🔍 发现的问题:');
      
      const groupedIssues = this.groupIssuesBySeverity();
      
      ['error', 'warning', 'info'].forEach(severity => {
        const issues = groupedIssues[severity] || [];
        if (issues.length > 0) {
          console.log(`\n${this.getSeverityIcon(severity)} ${severity.toUpperCase()} (${issues.length}个):`);
          issues.slice(0, 10).forEach(issue => {
            const location = issue.line > 0 ? `:${issue.line}` : '';
            console.log(`   ${issue.file}${location} - ${issue.message}`);
          });
          
          if (issues.length > 10) {
            console.log(`   ... 还有 ${issues.length - 10} 个${severity}问题`);
          }
        }
      });
    } else {
      console.log('\n✅ 未发现代码质量问题！');
    }

    console.log('\n' + '='.repeat(50));
  }

  /**
   * 按严重程度分组问题
   */
  groupIssuesBySeverity() {
    return this.issues.reduce((groups, issue) => {
      if (!groups[issue.severity]) {
        groups[issue.severity] = [];
      }
      groups[issue.severity].push(issue);
      return groups;
    }, {});
  }

  /**
   * 获取严重程度图标
   */
  getSeverityIcon(severity) {
    const icons = {
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[severity] || '•';
  }
}

module.exports = CodeQualityChecker;
