#!/usr/bin/env node

/**
 * 智能TypeScript错误修复器
 * 基于企业级AI助手规则体系
 * 遵循: P1-frontend-rules-2.1 + P5-ai-powered-code-review + P7-analyze-issue
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class IntelligentTypeScriptFixer {
  constructor() {
    this.fixedFiles = [];
    this.errors = [];
    this.fixStrategies = new Map();
    this.totalFixed = 0;
    
    // 基于P1-frontend-rules-2.1的修复策略
    this.initializeFixStrategies();
  }

  initializeFixStrategies() {
    // TS1002: 未终止字符串字面量
    this.fixStrategies.set('TS1002', {
      priority: 1,
      method: 'fixUnterminatedStrings',
      description: '修复未终止的字符串字面量'
    });

    // TS1005: 缺少标点符号
    this.fixStrategies.set('TS1005', {
      priority: 2,
      method: 'fixMissingPunctuation',
      description: '添加缺少的标点符号'
    });

    // TS1109: 缺少表达式
    this.fixStrategies.set('TS1109', {
      priority: 3,
      method: 'fixMissingExpressions',
      description: '修复缺少的表达式'
    });

    // TS1128: 缺少声明或语句
    this.fixStrategies.set('TS1128', {
      priority: 4,
      method: 'fixMissingStatements',
      description: '修复缺少的声明或语句'
    });
  }

  async execute() {
    console.log('🧠 启动智能TypeScript错误修复...\n');
    
    try {
      // 获取错误列表
      const errors = this.getTypeScriptErrors();
      
      // 按优先级分组
      const groupedErrors = this.groupErrorsByPriority(errors);
      
      // 按优先级修复
      for (const [priority, errorGroup] of groupedErrors) {
        await this.fixErrorGroup(priority, errorGroup);
      }
      
      // 验证修复结果
      await this.validateFixes();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 修复失败:', error.message);
    }
  }

  getTypeScriptErrors() {
    try {
      execSync('npx tsc --noEmit --maxNodeModuleJsDepth 0', {
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      return [];
    } catch (error) {
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      return this.parseErrors(output);
    }
  }

  parseErrors(output) {
    const lines = output.split('\n').filter(line => line.trim());
    const errors = [];
    
    for (const line of lines) {
      const match = line.match(/^(.+?):(\d+):(\d+)\s+-\s+error\s+(TS\d+):\s+(.+)$/);
      if (match) {
        const [, file, line, column, code, message] = match;
        errors.push({
          file: file.trim(),
          line: parseInt(line),
          column: parseInt(column),
          code: code,
          message: message.trim()
        });
      }
    }
    
    console.log(`📊 发现 ${errors.length} 个错误`);
    return errors;
  }

  groupErrorsByPriority(errors) {
    const grouped = new Map();
    
    for (const error of errors) {
      const strategy = this.fixStrategies.get(error.code);
      const priority = strategy ? strategy.priority : 999;
      
      if (!grouped.has(priority)) {
        grouped.set(priority, []);
      }
      grouped.get(priority).push(error);
    }
    
    // 按优先级排序
    return new Map([...grouped.entries()].sort((a, b) => a[0] - b[0]));
  }

  async fixErrorGroup(priority, errors) {
    console.log(`\n🔧 修复优先级 ${priority} 错误 (${errors.length}个)...`);
    
    // 按文件分组
    const fileGroups = new Map();
    for (const error of errors) {
      if (!fileGroups.has(error.file)) {
        fileGroups.set(error.file, []);
      }
      fileGroups.get(error.file).push(error);
    }
    
    // 逐文件修复
    for (const [file, fileErrors] of fileGroups) {
      try {
        await this.fixFile(file, fileErrors);
        console.log(`  ✅ ${file} (${fileErrors.length}个错误)`);
      } catch (error) {
        console.log(`  ❌ ${file}: ${error.message}`);
        this.errors.push(`${file}: ${error.message}`);
      }
    }
  }

  async fixFile(filePath, errors) {
    if (!fs.existsSync(filePath)) {
      throw new Error('文件不存在');
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 按行号排序，从后往前修复避免行号变化
    errors.sort((a, b) => b.line - a.line);

    for (const error of errors) {
      const strategy = this.fixStrategies.get(error.code);
      if (strategy && this[strategy.method]) {
        const result = this[strategy.method](content, error);
        if (result !== content) {
          content = result;
          modified = true;
          this.totalFixed++;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      this.fixedFiles.push(filePath);
    }
  }

  fixUnterminatedStrings(content, error) {
    const lines = content.split('\n');
    const lineIndex = error.line - 1;
    
    if (lineIndex >= 0 && lineIndex < lines.length) {
      let line = lines[lineIndex];
      
      // 检查常见的未终止字符串模式
      if (line.includes("from 'react") && !line.includes("';")) {
        line = line.replace(/from 'react$/, "from 'react';");
      } else if (line.includes("import") && line.includes("'") && !line.endsWith("';")) {
        line += "';";
      } else if (line.includes('"') && !line.includes('";')) {
        line += '";';
      } else if (line.includes("'") && !line.includes("';")) {
        line += "';";
      }
      
      lines[lineIndex] = line;
    }
    
    return lines.join('\n');
  }

  fixMissingPunctuation(content, error) {
    const lines = content.split('\n');
    const lineIndex = error.line - 1;
    
    if (lineIndex >= 0 && lineIndex < lines.length) {
      let line = lines[lineIndex];
      
      // 修复缺少的逗号和分号
      if (error.message.includes("',' expected")) {
        line = line.replace(/;$/, ',');
      } else if (error.message.includes("';' expected")) {
        line = line.replace(/,$/, ';');
      } else if (error.message.includes("'>' expected")) {
        line = line.replace(/;$/, '>');
      }
      
      lines[lineIndex] = line;
    }
    
    return lines.join('\n');
  }

  fixMissingExpressions(content, error) {
    const lines = content.split('\n');
    const lineIndex = error.line - 1;
    
    if (lineIndex >= 0 && lineIndex < lines.length) {
      let line = lines[lineIndex];
      
      // 修复常见的表达式错误
      if (line.includes('return (;')) {
        line = line.replace('return (;', 'return (');
      } else if (line.includes('(;')) {
        line = line.replace('(;', '(');
      }
      
      lines[lineIndex] = line;
    }
    
    return lines.join('\n');
  }

  fixMissingStatements(content, error) {
    const lines = content.split('\n');
    const lineIndex = error.line - 1;
    
    if (lineIndex >= 0 && lineIndex < lines.length) {
      let line = lines[lineIndex];
      
      // 修复常见的语句错误
      if (line.trim() === ');' || line.trim() === '};') {
        // 这些通常是多余的结束符，可以删除
        lines[lineIndex] = '';
      }
      
      lines[lineIndex] = line;
    }
    
    return lines.join('\n');
  }

  async validateFixes() {
    console.log('\n🔍 验证修复结果...');
    
    try {
      execSync('npx tsc --noEmit --maxNodeModuleJsDepth 0', {
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      console.log('✅ 所有TypeScript错误已修复！');
      return 0;
    } catch (error) {
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      const remainingErrors = (output.match(/error TS/g) || []).length;
      console.log(`⚠️ 剩余 ${remainingErrors} 个错误`);
      return remainingErrors;
    }
  }

  generateReport() {
    console.log('\n📊 智能修复报告');
    console.log('='.repeat(50));
    console.log(`修复的文件: ${this.fixedFiles.length}个`);
    console.log(`修复的错误: ${this.totalFixed}个`);
    console.log(`失败的文件: ${this.errors.length}个`);
    
    if (this.fixedFiles.length > 0) {
      console.log('\n✅ 成功修复的文件:');
      this.fixedFiles.slice(0, 10).forEach(file => {
        console.log(`  - ${file}`);
      });
      if (this.fixedFiles.length > 10) {
        console.log(`  ... 还有 ${this.fixedFiles.length - 10} 个文件`);
      }
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ 修复失败的文件:');
      this.errors.slice(0, 5).forEach(error => {
        console.log(`  - ${error}`);
      });
    }
    
    // 保存详细报告
    const report = {
      timestamp: new Date().toISOString(),
      fixedFiles: this.fixedFiles,
      totalFixed: this.totalFixed,
      errors: this.errors,
      strategies: Array.from(this.fixStrategies.entries())
    };
    
    fs.writeFileSync('typescript-fix-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 详细报告已保存: typescript-fix-report.json');
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new IntelligentTypeScriptFixer();
  fixer.execute().catch(console.error);
}

module.exports = IntelligentTypeScriptFixer;
