/**
 * 最终语法修复脚本
 * 处理所有剩余的复杂语法错误
 */

const fs = require('fs');
const path = require('path');

class FinalSyntaxFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.filePath = path.join(this.projectRoot, 'frontend/pages/StressTest.tsx');
    this.fixedLines = [];
  }

  /**
   * 开始最终修复
   */
  async fix() {
    console.log('🔧 开始最终语法修复...\n');
    
    try {
      await this.performFinalFix();
      this.generateReport();
      
      console.log(`\n✅ 最终修复完成！`);
      console.log(`   修复行数: ${this.fixedLines.length} 行`);
    } catch (error) {
      console.error('修复失败:', error);
    }
  }

  /**
   * 执行最终修复
   */
  async performFinalFix() {
    const content = fs.readFileSync(this.filePath, 'utf8');
    const lines = content.split('\n');
    
    let hasChanges = false;
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      let newLine = line;
      
      // 修复各种语法错误
      const originalLine = newLine;
      
      // 1. 修复三元运算符缺少 ? 的问题
      newLine = this.fixTernaryOperator(newLine);
      
      // 2. 修复注释和代码混合问题
      newLine = this.fixCommentCodeMix(newLine);
      
      // 3. 修复字符串未闭合问题
      newLine = this.fixUnterminatedStrings(newLine);
      
      // 4. 修复对象属性语法错误
      newLine = this.fixObjectPropertySyntax(newLine);
      
      // 5. 修复特定的错误模式
      newLine = this.fixSpecificPatterns(newLine);
      
      // 6. 修复条件表达式语法
      newLine = this.fixConditionalSyntax(newLine);
      
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
   * 修复三元运算符缺少 ? 的问题
   */
  fixTernaryOperator(line) {
    // 修复 condition false: value 为 condition ? false : value
    line = line.replace(/(\w+\.includes\([^)]+\))\s+false\s*:\s*(\w+)/g, '$1 ? false : $2');
    
    // 修复 condition value: otherValue 为 condition ? value : otherValue
    line = line.replace(/(\w+\.length\s*>\s*0)\s+(\w+)\s*:\s*(\w+)/g, '$1 ? $2 : $3');
    
    return line;
  }

  /**
   * 修复注释和代码混合问题
   */
  fixCommentCodeMix(line) {
    // 修复 // 注释 代码 为 // 注释
    line = line.replace(/\/\/\s*([^?]+?)\s+([a-zA-Z_$]\w*\s*数据[^?]*)/g, '// $1 $2');
    
    // 修复 cancelled 状态 ? setIsRunning(false);
    line = line.replace(/cancelled\s+状态\s*\?\s*setIsRunning/g, 'cancelled 状态\n            setIsRunning');
    
    return line;
  }

  /**
   * 修复字符串未闭合问题
   */
  fixUnterminatedStrings(line) {
    // 修复各种字符串未闭合的情况
    const patterns = [
      { regex: /console\.error\('([^']*)\);/, replacement: "console.error('$1');" },
      { regex: /console\.warn\('([^']*)\);/, replacement: "console.warn('$1');" },
      { regex: /console\.log\('([^']*)\);/, replacement: "console.log('$1');" },
      { regex: /'([^']*),\s*$/, replacement: "'$1'," },
      { regex: /"([^"]*),\s*$/, replacement: '"$1",' }
    ];
    
    for (const pattern of patterns) {
      line = line.replace(pattern.regex, pattern.replacement);
    }
    
    return line;
  }

  /**
   * 修复对象属性语法错误
   */
  fixObjectPropertySyntax(line) {
    // 确保所有对象属性都有正确的语法
    line = line.replace(/\?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1:');
    
    return line;
  }

  /**
   * 修复特定的错误模式
   */
  fixSpecificPatterns(line) {
    const patterns = [
      // 修复 timestamp: data.dataPointTimestamp  new Date... 
      { regex: /timestamp:\s*data\.dataPointTimestamp\s+new\s+Date/, replacement: 'timestamp: data.dataPointTimestamp ? new Date' },
      
      // 修复 } else if 结构
      { regex: /}\s*else\s*$/, replacement: '} else {' },
      
      // 修复 保持取消状态不 }
      { regex: /保持取消状态不\s*}\s*$/, replacement: '保持取消状态不变\n        }' },
      
      // 修复各种特殊字符
      { regex: /'/g, "'" },
      { regex: /'/g, "'" },
      { regex: /"/g, '"' },
      { regex: /"/g, '"' }
    ];
    
    for (const pattern of patterns) {
      line = line.replace(pattern.regex, pattern.replacement);
    }
    
    return line;
  }

  /**
   * 修复条件表达式语法
   */
  fixConditionalSyntax(line) {
    // 修复缺少问号的条件表达式
    line = line.replace(/(\w+)\s*:\s*([a-zA-Z_$]\w*)\s*===\s*'([^']+)'\s*\?\s*/g, '$1: $2 === \'$3\' ? ');
    
    return line;
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    console.log('\n📊 最终语法修复报告:');
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
    console.log(`  ✅ 修复了三元运算符语法错误`);
    console.log(`  ✅ 修复了注释和代码混合问题`);
    console.log(`  ✅ 修复了字符串未闭合问题`);
    console.log(`  ✅ 修复了对象属性语法错误`);
    console.log(`  ✅ 修复了特定语法模式错误`);
    console.log(`  ✅ 修复了条件表达式语法错误`);
    
    console.log('\n💡 建议:');
    console.log('  1. 运行 npm run build 验证修复效果');
    console.log('  2. 检查是否还有剩余的语法错误');
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new FinalSyntaxFixer();
  fixer.fix().catch(console.error);
}

module.exports = FinalSyntaxFixer;
