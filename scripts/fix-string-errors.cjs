/**
 * 修复字符串未闭合错误
 * 专门处理所有的字符串语法问题
 */

const fs = require('fs');
const path = require('path');

class StringErrorFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.filePath = path.join(this.projectRoot, 'frontend/pages/StressTest.tsx');
    this.fixedLines = [];
  }

  /**
   * 开始修复字符串错误
   */
  async fix() {
    console.log('🔧 开始修复字符串错误...\n');
    
    try {
      await this.fixStringErrors();
      this.generateReport();
      
      console.log(`\n✅ 字符串错误修复完成！`);
      console.log(`   修复行数: ${this.fixedLines.length} 行`);
    } catch (error) {
      console.error('修复失败:', error);
    }
  }

  /**
   * 修复字符串错误
   */
  async fixStringErrors() {
    const content = fs.readFileSync(this.filePath, 'utf8');
    const lines = content.split('\n');
    
    let hasChanges = false;
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      let newLine = line;
      
      const originalLine = newLine;
      
      // 修复各种字符串未闭合问题
      newLine = this.fixUnterminatedStrings(newLine);
      
      // 修复特定的字符串错误模式
      newLine = this.fixSpecificStringPatterns(newLine);
      
      // 修复console.log语句的字符串问题
      newLine = this.fixConsoleLogStrings(newLine);
      
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
   * 修复未终止的字符串
   */
  fixUnterminatedStrings(line) {
    let result = line;
    
    // 修复各种字符串未闭合的情况
    const patterns = [
      // 修复 '文本); 为 '文本');
      { regex: /('.*?)\);\s*$/, replacement: "$1');" },
      
      // 修复 '文本; 为 '文本';
      { regex: /('.*?);\s*$/, replacement: "$1';" },
      
      // 修复 "文本); 为 "文本");
      { regex: /(".*?)\);\s*$/, replacement: '$1");' },
      
      // 修复 "文本; 为 "文本";
      { regex: /(".*?);\s*$/, replacement: '$1";' },
      
      // 修复多行字符串问题
      { regex: /('.*?)\s*'\s*$/, replacement: "$1'" },
      { regex: /(".*?)\s*"\s*$/, replacement: '$1"' },
      
      // 修复特定的错误模式
      { regex: /'准备开始测试;\s*'/, replacement: "'准备开始测试'" },
      { regex: /'主测试阶;\s*'/, replacement: "'主测试阶段'" },
      { regex: /'测试已完成;\s*'/, replacement: "'测试已完成'" },
      { regex: /'测试已取消;\s*'/, replacement: "'测试已取消'" },
      { regex: /'清理并继\?\s*'/, replacement: "'清理并继续'" },
      
      // 修复console.log中的字符串问题
      { regex: /console\.log\('([^']*),\s*{/, replacement: "console.log('$1', {" },
      { regex: /console\.warn\('([^']*),\s*{/, replacement: "console.warn('$1', {" },
      { regex: /console\.error\('([^']*),\s*{/, replacement: "console.error('$1', {" }
    ];
    
    for (const pattern of patterns) {
      result = result.replace(pattern.regex, pattern.replacement);
    }
    
    return result;
  }

  /**
   * 修复特定的字符串错误模式
   */
  fixSpecificStringPatterns(line) {
    let result = line;
    
    // 修复特定的错误模式
    const fixes = [
      // 修复 testDuration + '? 为 testDuration + '秒'
      { regex: /testDuration\s*\+\s*'\?\s*'/, replacement: "testDuration + '秒'" },
      
      // 修复 expectedDuration + '? 为 expectedDuration + '秒'
      { regex: /expectedDuration\s*\+\s*'\?\s*'/, replacement: "expectedDuration + '秒'" },
      
      // 修复其他类似的模式
      { regex: /\+\s*'\?\s*'/, replacement: " + '秒'" },
      
      // 修复 mins > 0  ` 为 mins > 0 ? `
      { regex: /mins\s*>\s*0\s+`/, replacement: 'mins > 0 ? `' }
    ];
    
    for (const fix of fixes) {
      result = result.replace(fix.regex, fix.replacement);
    }
    
    return result;
  }

  /**
   * 修复console.log语句的字符串问题
   */
  fixConsoleLogStrings(line) {
    let result = line;
    
    // 修复console.log中的字符串和对象混合问题
    const patterns = [
      // 修复 console.log('文本, { 为 console.log('文本', {
      { regex: /console\.log\('([^']*),\s*{/, replacement: "console.log('$1', {" },
      { regex: /console\.warn\('([^']*),\s*{/, replacement: "console.warn('$1', {" },
      { regex: /console\.error\('([^']*),\s*{/, replacement: "console.error('$1', {" },
      
      // 修复 console.log('文本'', 为 console.log('文本',
      { regex: /console\.log\('([^']*)'',/, replacement: "console.log('$1'," },
      { regex: /console\.warn\('([^']*)'',/, replacement: "console.warn('$1'," },
      { regex: /console\.error\('([^']*)'',/, replacement: "console.error('$1'," }
    ];
    
    for (const pattern of patterns) {
      result = result.replace(pattern.regex, pattern.replacement);
    }
    
    return result;
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    console.log('\n📊 字符串错误修复报告:');
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
    console.log(`  ✅ 修复了字符串未闭合问题`);
    console.log(`  ✅ 修复了console.log语句字符串问题`);
    console.log(`  ✅ 修复了特定字符串错误模式`);
    
    console.log('\n💡 建议:');
    console.log('  1. 运行 npm run build 验证修复效果');
    console.log('  2. 检查是否还有剩余的字符串错误');
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new StringErrorFixer();
  fixer.fix().catch(console.error);
}

module.exports = StringErrorFixer;
