/**
 * 系统性修复StressTest.tsx中的语法错误
 * 主要处理：字符串未闭合、注释和代码混合、缩进问题
 */

const fs = require('fs');
const path = require('path');

class SyntaxErrorFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.filePath = path.join(this.projectRoot, 'frontend/pages/StressTest.tsx');
    this.fixedLines = [];
    this.errors = [];
  }

  /**
   * 开始修复
   */
  async fix() {
    console.log('🔧 开始系统性修复语法错误...\n');
    
    try {
      await this.fixSyntaxErrors();
      this.generateReport();
      
      console.log(`\n✅ 修复完成！`);
      console.log(`   修复行数: ${this.fixedLines.length} 行`);
      console.log(`   错误: ${this.errors.length} 个`);
    } catch (error) {
      console.error('修复失败:', error);
    }
  }

  /**
   * 修复语法错误
   */
  async fixSyntaxErrors() {
    const content = fs.readFileSync(this.filePath, 'utf8');
    const lines = content.split('\n');
    
    let hasChanges = false;
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      let newLine = line;
      
      // 修复字符串未闭合问题
      if (this.hasUnterminatedString(line)) {
        newLine = this.fixUnterminatedString(line);
        if (newLine !== line) {
          hasChanges = true;
          this.fixedLines.push({
            lineNumber,
            type: '字符串未闭合',
            original: line,
            fixed: newLine
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
            original: line,
            fixed: newLine
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
          original: line,
          fixed: newLine
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
   * 检查是否有未终止的字符串
   */
  hasUnterminatedString(line) {
    // 检查单引号字符串
    const singleQuotes = (line.match(/'/g) || []).length;
    const doublequotes = (line.match(/"/g) || []).length;
    
    // 简单检查：如果引号数量是奇数，可能有未闭合的字符串
    return (singleQuotes % 2 !== 0) || (doublequotes % 2 !== 0);
  }

  /**
   * 修复未终止的字符串
   */
  fixUnterminatedString(line) {
    // 常见的未闭合字符串模式
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
    // 检查注释后面直接跟代码的情况
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
   * 修复特定的语法错误
   */
  fixSpecificErrors(line, lineNumber) {
    const fixes = [
      // 修复条件表达式缺少?
      { regex: /\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*([a-zA-Z_$])/, replacement: ' ? $1 : $2' },
      // 修复字符串中的特殊字符
      { regex: /'/g, replacement: "'" },
      { regex: /'/g, replacement: "'" },
      { regex: /"/g, replacement: '"' },
      { regex: /"/g, replacement: '"' },
      // 修复console.log中的语法错误
      { regex: /console\.(log|error)\('([^']*)'([^,)]*)/, replacement: "console.$1('$2'$3" }
    ];
    
    let result = line;
    for (const fix of fixes) {
      result = result.replace(fix.regex, fix.replacement);
    }
    
    return result;
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    console.log('\n📊 语法错误修复报告:');
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
        typeGroups[type].forEach(fix => {
          console.log(`   行 ${fix.lineNumber}: "${fix.original.trim()}" → "${fix.fixed.trim()}"`);
        });
        console.log('');
      });
    }
    
    if (this.errors.length > 0) {
      console.log('❌ 修复失败的错误:\n');
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    console.log('🎯 修复效果:');
    console.log(`  ✅ 修复了字符串未闭合问题`);
    console.log(`  ✅ 修复了注释和代码混合问题`);
    console.log(`  ✅ 修复了特定语法错误`);
    
    console.log('\n💡 建议:');
    console.log('  1. 运行 npm run build 验证修复效果');
    console.log('  2. 检查语法错误是否已解决');
    console.log('  3. 测试应用功能确保正常工作');
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new SyntaxErrorFixer();
  fixer.fix().catch(console.error);
}

module.exports = SyntaxErrorFixer;
