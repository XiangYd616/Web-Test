/**
 * 修复console语句的字符串错误
 * 专门处理console.log, console.error, console.warn等语句的字符串问题
 */

const fs = require('fs');
const path = require('path');

class ConsoleErrorFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.filePath = path.join(this.projectRoot, 'frontend/pages/StressTest.tsx');
    this.fixedLines = [];
  }

  /**
   * 开始修复console错误
   */
  async fix() {
    console.log('🔧 开始修复console语句错误...\n');
    
    try {
      await this.fixConsoleErrors();
      this.generateReport();
      
      console.log(`\n✅ console语句错误修复完成！`);
      console.log(`   修复行数: ${this.fixedLines.length} 行`);
    } catch (error) {
      console.error('修复失败:', error);
    }
  }

  /**
   * 修复console错误
   */
  async fixConsoleErrors() {
    const content = fs.readFileSync(this.filePath, 'utf8');
    const lines = content.split('\n');
    
    let hasChanges = false;
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      let newLine = line;
      
      const originalLine = newLine;
      
      // 修复console语句的字符串错误
      newLine = this.fixConsoleStringErrors(newLine);
      
      if (newLine !== originalLine) {
        hasChanges = true;
        this.fixedLines.push({
          lineNumber,
          original: originalLine.trim(),
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
   * 修复console语句的字符串错误
   */
  fixConsoleStringErrors(line) {
    let result = line;
    
    // 修复console语句中的字符串错误模式
    const patterns = [
      // 修复 console.log('text', param')'; -> console.log('text', param);
      { regex: /console\.(log|warn|error|info|debug)\(([^)]*[^'"])''\)';/g, replacement: "console.$1($2);" },
      
      // 修复 console.log('text', param')''; -> console.log('text', param);
      { regex: /console\.(log|warn|error|info|debug)\(([^)]*[^'"])''\)'';/g, replacement: "console.$1($2);" },
      
      // 修复 console.log('text')'; -> console.log('text');
      { regex: /console\.(log|warn|error|info|debug)\(([^)]*)\)';/g, replacement: "console.$1($2);" },
      
      // 修复 console.log('text')''; -> console.log('text');
      { regex: /console\.(log|warn|error|info|debug)\(([^)]*)\)'';/g, replacement: "console.$1($2);" },
      
      // 修复特定的错误模式
      { regex: /console\.(log|warn|error|info|debug)\('([^']*)', ([^)]*)''\)';/g, replacement: "console.$1('$2', $3);" },
      { regex: /console\.(log|warn|error|info|debug)\('([^']*)', ([^)]*)''\)'';/g, replacement: "console.$1('$2', $3);" },
      
      // 修复更复杂的模式
      { regex: /console\.(log|warn|error|info|debug)\('([^']*)', ([^)]*[^'"])''\)';/g, replacement: "console.$1('$2', $3);" },
      { regex: /console\.(log|warn|error|info|debug)\('([^']*)', ([^)]*[^'"])''\)'';/g, replacement: "console.$1('$2', $3);" },
      
      // 修复带有多个参数的情况
      { regex: /console\.(log|warn|error|info|debug)\(([^)]+[^'"])''\)';/g, replacement: "console.$1($2);" },
      { regex: /console\.(log|warn|error|info|debug)\(([^)]+[^'"])''\)'';/g, replacement: "console.$1($2);" }
    ];
    
    for (const pattern of patterns) {
      result = result.replace(pattern.regex, pattern.replacement);
    }
    
    // 额外的清理步骤
    result = result.replace(/console\.(log|warn|error|info|debug)\(([^)]*)\)\)';/g, "console.$1($2);");
    result = result.replace(/console\.(log|warn|error|info|debug)\(([^)]*)\)\)'';/g, "console.$1($2);");
    
    return result;
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    console.log('\n📊 console语句错误修复报告:');
    console.log('============================================================\n');
    
    if (this.fixedLines.length > 0) {
      console.log('✅ 成功修复的行:\n');
      
      this.fixedLines.slice(0, 10).forEach((fix, index) => {
        console.log(`  ${index + 1}. 行 ${fix.lineNumber}:`);
        console.log(`     原始: "${fix.original}"`);
        console.log(`     修复: "${fix.fixed}"`);
        console.log('');
      });
      
      if (this.fixedLines.length > 10) {
        console.log(`  ... 还有 ${this.fixedLines.length - 10} 个修复`);
      }
    }
    
    console.log('🎯 修复效果:');
    console.log(`  ✅ 修复了console.log语句的字符串错误`);
    console.log(`  ✅ 修复了console.error语句的字符串错误`);
    console.log(`  ✅ 修复了console.warn语句的字符串错误`);
    console.log(`  ✅ 修复了其他console语句的字符串错误`);
    
    console.log('\n💡 建议:');
    console.log('  1. 运行 npm run build 验证修复效果');
    console.log('  2. 检查是否还有剩余的console语句错误');
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new ConsoleErrorFixer();
  fixer.fix().catch(console.error);
}

module.exports = ConsoleErrorFixer;
