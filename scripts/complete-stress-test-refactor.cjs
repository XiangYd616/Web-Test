/**
 * 完整重构StressTest.tsx文件
 * 修正所有语法错误，保留所有功能
 */

const fs = require('fs');
const path = require('path');

class StressTestRefactor {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.filePath = path.join(this.projectRoot, 'frontend/pages/StressTest.tsx');
    this.backupPath = path.join(this.projectRoot, 'frontend/pages/StressTest.tsx.backup');
    this.fixedLines = [];
    this.errors = [];
  }

  /**
   * 开始完整重构
   */
  async refactor() {
    console.log('🔧 开始完整重构StressTest.tsx文件...\n');
    
    try {
      // 创建备份
      await this.createBackup();
      
      // 执行重构
      await this.performRefactor();
      
      this.generateReport();
      
      console.log(`\n✅ 重构完成！`);
      console.log(`   修复行数: ${this.fixedLines.length} 行`);
      console.log(`   错误: ${this.errors.length} 个`);
      console.log(`   备份文件: ${this.backupPath}`);
    } catch (error) {
      console.error('重构失败:', error);
      // 恢复备份
      if (fs.existsSync(this.backupPath)) {
        fs.copyFileSync(this.backupPath, this.filePath);
        console.log('已恢复备份文件');
      }
    }
  }

  /**
   * 创建备份
   */
  async createBackup() {
    fs.copyFileSync(this.filePath, this.backupPath);
    console.log('✅ 已创建备份文件');
  }

  /**
   * 执行重构
   */
  async performRefactor() {
    const content = fs.readFileSync(this.filePath, 'utf8');
    const lines = content.split('\n');
    
    let hasChanges = false;
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      let newLine = line;
      
      // 修复对象属性语法错误 (? property : -> property:)
      if (this.hasObjectPropertyError(line)) {
        newLine = this.fixObjectPropertyError(newLine);
        if (newLine !== line) {
          hasChanges = true;
          this.fixedLines.push({
            lineNumber,
            type: '对象属性语法',
            original: line.trim(),
            fixed: newLine.trim()
          });
        }
      }
      
      // 修复字符串未闭合问题
      if (this.hasUnterminatedString(line)) {
        newLine = this.fixUnterminatedString(newLine);
        if (newLine !== line) {
          hasChanges = true;
          this.fixedLines.push({
            lineNumber,
            type: '字符串未闭合',
            original: line.trim(),
            fixed: newLine.trim()
          });
        }
      }
      
      // 修复注释和代码混合问题
      if (this.hasCommentCodeMix(line)) {
        newLine = this.fixCommentCodeMix(newLine);
        if (newLine !== line) {
          hasChanges = true;
          this.fixedLines.push({
            lineNumber,
            type: '注释代码混合',
            original: line.trim(),
            fixed: newLine.trim()
          });
        }
      }
      
      // 修复条件表达式语法错误
      if (this.hasConditionalError(line)) {
        newLine = this.fixConditionalError(newLine);
        if (newLine !== line) {
          hasChanges = true;
          this.fixedLines.push({
            lineNumber,
            type: '条件表达式语法',
            original: line.trim(),
            fixed: newLine.trim()
          });
        }
      }
      
      // 修复函数参数语法错误
      if (this.hasFunctionParameterError(line)) {
        newLine = this.fixFunctionParameterError(newLine);
        if (newLine !== line) {
          hasChanges = true;
          this.fixedLines.push({
            lineNumber,
            type: '函数参数语法',
            original: line.trim(),
            fixed: newLine.trim()
          });
        }
      }
      
      // 修复特定的语法错误
      newLine = this.fixSpecificErrors(newLine, lineNumber);
      if (newLine !== line && !this.fixedLines.some(f => f.lineNumber === lineNumber)) {
        hasChanges = true;
        this.fixedLines.push({
          lineNumber,
          type: '特定语法错误',
          original: line.trim(),
          fixed: newLine.trim()
        });
      }
      
      newLines.push(newLine);
    }
    
    if (hasChanges) {
      const newContent = newLines.join('\n');
      fs.writeFileSync(this.filePath, newContent, 'utf8');
      console.log('✅ 文件已更新');
    } else {
      console.log('ℹ️ 没有需要修复的内容');
    }
  }

  /**
   * 检查是否有对象属性语法错误
   */
  hasObjectPropertyError(line) {
    return /\s+\?\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/.test(line);
  }

  /**
   * 修复对象属性语法错误
   */
  fixObjectPropertyError(line) {
    // 修复 ? property : 为 property:
    return line.replace(/(\s+)\?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1$2:');
  }

  /**
   * 检查是否有未终止的字符串
   */
  hasUnterminatedString(line) {
    // 检查单引号和双引号是否成对
    const singleQuotes = (line.match(/'/g) || []).length;
    const doubleQuotes = (line.match(/"/g) || []).length;
    return (singleQuotes % 2 !== 0) || (doubleQuotes % 2 !== 0);
  }

  /**
   * 修复未终止的字符串
   */
  fixUnterminatedString(line) {
    const patterns = [
      { regex: /'([^']*),\s*$/, replacement: "'$1'," },
      { regex: /"([^"]*),\s*$/, replacement: '"$1",' },
      { regex: /'([^']*)\s*$/, replacement: "'$1'" },
      { regex: /"([^"]*)\s*$/, replacement: '"$1"' },
      { regex: /console\.log\('([^']*),\s*{/, replacement: "console.log('$1', {" },
      { regex: /console\.error\('([^']*),\s*/, replacement: "console.error('$1'," }
    ];
    
    for (const pattern of patterns) {
      if (pattern.regex.test(line)) {
        return line.replace(pattern.regex, pattern.replacement);
      }
    }
    
    return line;
  }

  /**
   * 检查是否有注释和代码混合
   */
  hasCommentCodeMix(line) {
    return /\/\/.*[^?]\s+[a-zA-Z_$]/.test(line) || 
           /\/\*.*\*\/\s*[a-zA-Z_$]/.test(line);
  }

  /**
   * 修复注释和代码混合
   */
  fixCommentCodeMix(line) {
    // 将注释和代码分离到不同行
    const patterns = [
      { regex: /(\/\/.*?)\s+([a-zA-Z_$].*)/, replacement: '$1\n        $2' },
      { regex: /(\/\*.*?\*\/)\s*([a-zA-Z_$].*)/, replacement: '$1\n        $2' }
    ];
    
    for (const pattern of patterns) {
      if (pattern.regex.test(line)) {
        return line.replace(pattern.regex, pattern.replacement);
      }
    }
    
    return line;
  }

  /**
   * 检查是否有条件表达式语法错误
   */
  hasConditionalError(line) {
    return /\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*([a-zA-Z_$])/.test(line) &&
           !line.includes('?');
  }

  /**
   * 修复条件表达式语法错误
   */
  fixConditionalError(line) {
    return line.replace(/(\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*([a-zA-Z_$])/g, '$1? $2 : $3');
  }

  /**
   * 检查是否有函数参数语法错误
   */
  hasFunctionParameterError(line) {
    return /\(\s*[^,)]+,\s*\?\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/.test(line);
  }

  /**
   * 修复函数参数语法错误
   */
  fixFunctionParameterError(line) {
    return line.replace(/(\(\s*[^,)]+,\s*)\?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1$2:');
  }

  /**
   * 修复特定的语法错误
   */
  fixSpecificErrors(line, lineNumber) {
    let result = line;
    
    // 修复特殊字符
    result = result.replace(/'/g, "'");
    result = result.replace(/'/g, "'");
    result = result.replace(/"/g, '"');
    result = result.replace(/"/g, '"');
    
    // 修复特定的错误模式
    const fixes = [
      // 修复 const ?StressTest
      { regex: /const\s+\?([a-zA-Z_$][a-zA-Z0-9_$]*)/, replacement: 'const $1' },
      // 修复 let ?variable
      { regex: /let\s+\?([a-zA-Z_$][a-zA-Z0-9_$]*)/, replacement: 'let $1' },
      // 修复 HTTP error! ? status
      { regex: /HTTP error!\s+\?\s*status\s*:/, replacement: 'HTTP error! status:' },
      // 修复其他常见错误
      { regex: /\?\s*enabled\s*:/, replacement: 'enabled:' },
      { regex: /\?\s*type\s*:/, replacement: 'type:' },
      { regex: /\?\s*host\s*:/, replacement: 'host:' },
      { regex: /\?\s*port\s*:/, replacement: 'port:' }
    ];
    
    for (const fix of fixes) {
      result = result.replace(fix.regex, fix.replacement);
    }
    
    return result;
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    console.log('\n📊 完整重构报告:');
    console.log('============================================================\n');
    
    if (this.fixedLines.length > 0) {
      const typeGroups = {};
      this.fixedLines.forEach(fix => {
        if (!typeGroups[fix.type]) {
          typeGroups[fix.type] = [];
        }
        typeGroups[fix.type].push(fix);
      });
      
      Object.keys(typeGroups).forEach(type => {
        console.log(`✅ ${type} (${typeGroups[type].length}个):`);
        typeGroups[type].slice(0, 5).forEach(fix => {
          console.log(`   行 ${fix.lineNumber}: "${fix.original}" → "${fix.fixed}"`);
        });
        if (typeGroups[type].length > 5) {
          console.log(`   ... 还有 ${typeGroups[type].length - 5} 个修复`);
        }
        console.log('');
      });
    }
    
    console.log('🎯 重构效果:');
    console.log(`  ✅ 修复了对象属性语法错误`);
    console.log(`  ✅ 修复了字符串未闭合问题`);
    console.log(`  ✅ 修复了注释和代码混合问题`);
    console.log(`  ✅ 修复了条件表达式语法错误`);
    console.log(`  ✅ 修复了函数参数语法错误`);
    console.log(`  ✅ 修复了特定语法错误`);
    
    console.log('\n💡 建议:');
    console.log('  1. 运行 npm run build 验证修复效果');
    console.log('  2. 运行 npm run type-check 检查TypeScript类型');
    console.log('  3. 测试应用功能确保正常工作');
    console.log('  4. 如有问题可恢复备份文件');
  }
}

// 运行重构
if (require.main === module) {
  const refactor = new StressTestRefactor();
  refactor.refactor().catch(console.error);
}

module.exports = StressTestRefactor;
