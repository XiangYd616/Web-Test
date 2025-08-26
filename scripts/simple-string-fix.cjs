/**
 * 简单字符串修复脚本
 * 专门处理 console.log('text', param'); 这种错误模式
 */

const fs = require('fs');
const path = require('path');

class SimpleStringFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.filePath = path.join(this.projectRoot, 'frontend/pages/StressTest.tsx');
    this.fixedLines = [];
  }

  /**
   * 开始简单修复
   */
  async fix() {
    console.log('🔧 开始简单字符串修复...\n');
    
    try {
      await this.simpleStringFix();
      this.generateReport();
      
      console.log(`\n✅ 简单字符串修复完成！`);
      console.log(`   修复行数: ${this.fixedLines.length} 行`);
    } catch (error) {
      console.error('修复失败:', error);
    }
  }

  /**
   * 简单字符串修复
   */
  async simpleStringFix() {
    const content = fs.readFileSync(this.filePath, 'utf8');
    const lines = content.split('\n');
    
    let hasChanges = false;
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      let newLine = line;
      
      const originalLine = newLine;
      
      // 应用简单修复规则
      newLine = this.fixSimpleStringErrors(newLine);
      
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
   * 修复简单的字符串错误
   */
  fixSimpleStringErrors(line) {
    let result = line;
    
    // 修复最常见的错误模式：console.log('text', param');
    // 这种模式是：函数调用中最后一个参数后面多了一个引号
    
    // 1. 修复 console.log('text', param'); -> console.log('text', param);
    result = result.replace(/console\.(log|warn|error|info|debug)\(([^)]*[^'"])';\)/g, "console.$1($2);");
    result = result.replace(/console\.(log|warn|error|info|debug)\(([^)]*[^'"])';\);/g, "console.$1($2);");
    
    // 2. 修复 console.log('text', param'); -> console.log('text', param);
    result = result.replace(/console\.(log|warn|error|info|debug)\(([^)]*), ([^)]*[^'"])';\)/g, "console.$1($2, $3);");
    result = result.replace(/console\.(log|warn|error|info|debug)\(([^)]*), ([^)]*[^'"])';\);/g, "console.$1($2, $3);");
    
    // 3. 修复 console.log(`template`, param'); -> console.log(`template`, param);
    result = result.replace(/console\.(log|warn|error|info|debug)\(([^)]*`[^`]*`), ([^)]*[^'"])';\)/g, "console.$1($2, $3);");
    result = result.replace(/console\.(log|warn|error|info|debug)\(([^)]*`[^`]*`), ([^)]*[^'"])';\);/g, "console.$1($2, $3);");
    
    // 4. 修复其他函数调用的类似问题
    result = result.replace(/localStorage\.setItem\(([^)]*), ([^)]*[^'"])';\)/g, "localStorage.setItem($1, $2);");
    result = result.replace(/recordTestCompletion\(([^)]*), ([^)]*[^'"])';\)/g, "recordTestCompletion($1, $2);");
    
    // 5. 修复特定的错误模式
    result = result.replace(/, ([^)]*[^'"])';\)/g, ", $1);");
    result = result.replace(/, ([^)]*[^'"])';\);/g, ", $1);");
    
    // 6. 清理多余的分号
    result = result.replace(/;\);/g, ");");
    
    return result;
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    console.log('\n📊 简单字符串修复报告:');
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
    console.log(`  ✅ 修复了console语句的参数引号问题`);
    console.log(`  ✅ 修复了函数调用的参数引号问题`);
    console.log(`  ✅ 清理了多余的分号`);
    
    console.log('\n💡 建议:');
    console.log('  1. 运行 npm run build 验证修复效果');
    console.log('  2. 如果构建成功，所有字符串问题都已解决');
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new SimpleStringFixer();
  fixer.fix().catch(console.error);
}

module.exports = SimpleStringFixer;
