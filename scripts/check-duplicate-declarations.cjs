#!/usr/bin/env node

/**
 * 重复声明检查工具
 * 检测项目中的重复变量声明、参数冲突等问题
 */

const fs = require('fs');
const path = require('path');

class DuplicateDeclarationChecker {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.frontendPath = path.join(this.projectRoot, 'frontend');
    this.issues = [];
  }

  /**
   * 开始检查
   */
  async check() {
    console.log('🔍 开始检查重复声明问题...\n');
    
    const files = this.getAllTSFiles();
    let checkedCount = 0;
    
    for (const file of files) {
      await this.checkFile(file);
      checkedCount++;
    }
    
    this.generateReport();
    
    console.log(`\n✅ 检查完成！`);
    console.log(`   检查文件: ${checkedCount} 个`);
    console.log(`   发现问题: ${this.issues.length} 个`);
  }

  /**
   * 检查单个文件
   */
  async checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.frontendPath, filePath);
      const lines = content.split('\n');
      
      // 检查函数参数与局部变量冲突
      this.checkParameterConflicts(content, lines, relativePath);
      
      // 检查重复的const/let声明
      this.checkDuplicateDeclarations(content, lines, relativePath);
      
      // 检查useState在非组件函数中的使用
      this.checkInvalidUseState(content, lines, relativePath);
      
    } catch (error) {
      console.log(`   ⚠️ 无法读取文件: ${path.relative(this.frontendPath, filePath)}`);
    }
  }

  /**
   * 检查参数与局部变量冲突
   */
  checkParameterConflicts(content, lines, filePath) {
    // 匹配函数定义和参数
    const functionPattern = /(?:function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>|\w+\s*:\s*\([^)]*\)\s*=>)\s*\{/g;
    let match;
    
    while ((match = functionPattern.exec(content)) !== null) {
      const functionStart = match.index;
      const functionLine = content.substring(0, functionStart).split('\n').length;
      
      // 提取参数名
      const paramMatch = match[0].match(/\(([^)]*)\)/);
      if (paramMatch) {
        const params = this.extractParameterNames(paramMatch[1]);
        
        // 查找函数体中的变量声明
        const functionBody = this.extractFunctionBody(content, functionStart);
        if (functionBody) {
          this.checkVariableConflictsInBody(functionBody, params, filePath, functionLine);
        }
      }
    }
  }

  /**
   * 提取参数名
   */
  extractParameterNames(paramString) {
    const params = [];
    const paramParts = paramString.split(',');
    
    for (const part of paramParts) {
      const cleanPart = part.trim();
      if (cleanPart) {
        // 提取参数名（忽略类型注解）
        const nameMatch = cleanPart.match(/^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/);
        if (nameMatch) {
          params.push(nameMatch[1]);
        }
      }
    }
    
    return params;
  }

  /**
   * 提取函数体
   */
  extractFunctionBody(content, startIndex) {
    let braceCount = 0;
    let inFunction = false;
    let functionBody = '';
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      
      if (char === '{') {
        braceCount++;
        inFunction = true;
      } else if (char === '}') {
        braceCount--;
      }
      
      if (inFunction) {
        functionBody += char;
      }
      
      if (inFunction && braceCount === 0) {
        break;
      }
    }
    
    return functionBody;
  }

  /**
   * 检查函数体中的变量冲突
   */
  checkVariableConflictsInBody(functionBody, params, filePath, functionLine) {
    const lines = functionBody.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 检查const/let声明
      const declMatch = line.match(/(?:const|let|var)\s+\[?([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (declMatch) {
        const varName = declMatch[1];
        if (params.includes(varName)) {
          this.issues.push({
            type: 'parameter-conflict',
            file: filePath,
            line: functionLine + i,
            message: `参数 '${varName}' 与局部变量声明冲突`,
            code: line
          });
        }
      }
    }
  }

  /**
   * 检查重复声明
   */
  checkDuplicateDeclarations(content, lines, filePath) {
    const declarations = new Map();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 匹配变量声明
      const declMatch = line.match(/(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (declMatch) {
        const varName = declMatch[1];
        
        if (declarations.has(varName)) {
          this.issues.push({
            type: 'duplicate-declaration',
            file: filePath,
            line: i + 1,
            message: `重复声明变量 '${varName}'`,
            code: line,
            previousLine: declarations.get(varName)
          });
        } else {
          declarations.set(varName, i + 1);
        }
      }
    }
  }

  /**
   * 检查无效的useState使用
   */
  checkInvalidUseState(content, lines, filePath) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes('useState') && !this.isInReactComponent(content, i)) {
        this.issues.push({
          type: 'invalid-usestate',
          file: filePath,
          line: i + 1,
          message: 'useState 只能在React组件或自定义Hook中使用',
          code: line
        });
      }
    }
  }

  /**
   * 检查是否在React组件中
   */
  isInReactComponent(content, lineIndex) {
    const beforeContent = content.split('\n').slice(0, lineIndex).join('\n');
    
    // 简单检查：是否在以大写字母开头的函数中，或者包含React.FC
    const componentPattern = /(?:const|function)\s+[A-Z][a-zA-Z0-9]*|React\.FC|FunctionComponent/;
    return componentPattern.test(beforeContent);
  }

  /**
   * 获取所有TypeScript文件
   */
  getAllTSFiles() {
    const files = [];
    
    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDir(fullPath);
        } else if (stat.isFile() && /\.(ts|tsx)$/.test(item)) {
          files.push(fullPath);
        }
      }
    };
    
    scanDir(this.frontendPath);
    return files;
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n📊 重复声明检查报告:');
    console.log('='.repeat(60));
    
    if (this.issues.length === 0) {
      console.log('\n✅ 没有发现重复声明问题！');
      return;
    }
    
    // 按类型分组
    const groupedIssues = {};
    this.issues.forEach(issue => {
      if (!groupedIssues[issue.type]) {
        groupedIssues[issue.type] = [];
      }
      groupedIssues[issue.type].push(issue);
    });
    
    // 参数冲突
    if (groupedIssues['parameter-conflict']) {
      console.log('\n❌ 参数与局部变量冲突:');
      groupedIssues['parameter-conflict'].forEach((issue, index) => {
        console.log(`  ${index + 1}. 📁 ${issue.file}:${issue.line}`);
        console.log(`     ${issue.message}`);
        console.log(`     代码: ${issue.code}`);
      });
    }
    
    // 重复声明
    if (groupedIssues['duplicate-declaration']) {
      console.log('\n❌ 重复变量声明:');
      groupedIssues['duplicate-declaration'].forEach((issue, index) => {
        console.log(`  ${index + 1}. 📁 ${issue.file}:${issue.line}`);
        console.log(`     ${issue.message}`);
        console.log(`     代码: ${issue.code}`);
        console.log(`     首次声明: 第${issue.previousLine}行`);
      });
    }
    
    // 无效useState
    if (groupedIssues['invalid-usestate']) {
      console.log('\n❌ 无效的useState使用:');
      groupedIssues['invalid-usestate'].forEach((issue, index) => {
        console.log(`  ${index + 1}. 📁 ${issue.file}:${issue.line}`);
        console.log(`     ${issue.message}`);
        console.log(`     代码: ${issue.code}`);
      });
    }
    
    console.log('\n📈 问题统计:');
    Object.entries(groupedIssues).forEach(([type, issues]) => {
      const typeNames = {
        'parameter-conflict': '参数冲突',
        'duplicate-declaration': '重复声明',
        'invalid-usestate': '无效useState'
      };
      console.log(`   ${typeNames[type] || type}: ${issues.length} 个`);
    });
  }
}

// 运行检查工具
if (require.main === module) {
  const checker = new DuplicateDeclarationChecker();
  checker.check().catch(console.error);
}

module.exports = DuplicateDeclarationChecker;
