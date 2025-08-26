/**
 * 修复复杂的字符串错误
 * 专门处理字符串修复脚本过度修复的问题
 */

const fs = require('fs');
const path = require('path');

class ComplexStringErrorFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.filePath = path.join(this.projectRoot, 'frontend/pages/StressTest.tsx');
    this.fixedLines = [];
  }

  /**
   * 开始修复复杂字符串错误
   */
  async fix() {
    console.log('🔧 开始修复复杂字符串错误...\n');
    
    try {
      await this.fixComplexStringErrors();
      this.generateReport();
      
      console.log(`\n✅ 复杂字符串错误修复完成！`);
      console.log(`   修复行数: ${this.fixedLines.length} 行`);
    } catch (error) {
      console.error('修复失败:', error);
    }
  }

  /**
   * 修复复杂字符串错误
   */
  async fixComplexStringErrors() {
    const content = fs.readFileSync(this.filePath, 'utf8');
    const lines = content.split('\n');
    
    let hasChanges = false;
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      let newLine = line;
      
      const originalLine = newLine;
      
      // 修复过度修复的字符串问题
      newLine = this.fixOverFixedStrings(newLine);
      
      // 修复特定的复杂字符串错误
      newLine = this.fixSpecificComplexErrors(newLine);
      
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
   * 修复过度修复的字符串
   */
  fixOverFixedStrings(line) {
    let result = line;
    
    // 修复过度修复的字符串模式
    const patterns = [
      // 修复 'text'')'; 为 'text');
      { regex: /('.*?')\'\)';/g, replacement: "$1');" },
      
      // 修复 'text''; 为 'text';
      { regex: /('.*?')\';/g, replacement: "$1;" },
      
      // 修复 "text""); 为 "text");
      { regex: /(".*?")\"\);/g, replacement: '$1");' },
      
      // 修复 "text""; 为 "text";
      { regex: /(".*?")\";/g, replacement: '$1;' },
      
      // 修复特定的useState错误
      { regex: /useState<.*?>\('idle''\)';/g, replacement: "useState<TestStatusType>('idle');" },
      { regex: /useState<.*?>\(''\'\)';/g, replacement: "useState<string>('');" },
      
      // 修复其他常见的过度修复
      { regex: /\'\'\'\)/g, replacement: "')" },
      { regex: /\"\"\"\)/g, replacement: '")' },
      { regex: /\'\'\'/g, replacement: "'" },
      { regex: /\"\"\"/g, replacement: '"' }
    ];
    
    for (const pattern of patterns) {
      result = result.replace(pattern.regex, pattern.replacement);
    }
    
    return result;
  }

  /**
   * 修复特定的复杂字符串错误
   */
  fixSpecificComplexErrors(line) {
    let result = line;
    
    // 修复特定的错误模式
    const fixes = [
      // 修复useState的特定错误
      { regex: /useState<TestStatusType>\('idle''\)';/, replacement: "useState<TestStatusType>('idle');" },
      { regex: /useState<string>\(''\'\)';/, replacement: "useState<string>('');" },
      
      // 修复placeholder的错误
      { regex: /placeholder="用户\?\s*"/, replacement: 'placeholder="用户名"' },
      
      // 修复其他特定错误
      { regex: /'准备开始测试';/, replacement: "'准备开始测试'" },
      { regex: /'主测试阶';/, replacement: "'主测试阶段'" },
      { regex: /'测试已完成';/, replacement: "'测试已完成'" },
      { regex: /'测试已取消';/, replacement: "'测试已取消'" }
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
    console.log('\n📊 复杂字符串错误修复报告:');
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
    console.log(`  ✅ 修复了过度修复的字符串问题`);
    console.log(`  ✅ 修复了特定的复杂字符串错误`);
    console.log(`  ✅ 修复了useState语句的字符串问题`);
    
    console.log('\n💡 建议:');
    console.log('  1. 运行 npm run build 验证修复效果');
    console.log('  2. 检查是否还有剩余的字符串错误');
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new ComplexStringErrorFixer();
  fixer.fix().catch(console.error);
}

module.exports = ComplexStringErrorFixer;
