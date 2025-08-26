/**
 * 最终全面修复脚本
 * 一次性处理所有剩余的字符串问题
 */

const fs = require('fs');
const path = require('path');

class FinalComprehensiveFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.filePath = path.join(this.projectRoot, 'frontend/pages/StressTest.tsx');
    this.fixCount = 0;
  }

  /**
   * 开始最终全面修复
   */
  async fix() {
    console.log('🔧 开始最终全面修复...\n');
    
    try {
      await this.finalComprehensiveFix();
      
      console.log(`\n✅ 最终全面修复完成！`);
      console.log(`   修复次数: ${this.fixCount} 次`);
    } catch (error) {
      console.error('修复失败:', error);
    }
  }

  /**
   * 最终全面修复
   */
  async finalComprehensiveFix() {
    let content = fs.readFileSync(this.filePath, 'utf8');
    const originalContent = content;
    
    // 使用更简单直接的方法：逐行处理
    const lines = content.split('\n');
    const fixedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const originalLine = line;
      
      // 修复各种字符串问题
      line = this.fixLineStringIssues(line, i + 1);
      
      if (line !== originalLine) {
        console.log(`✅ 修复行 ${i + 1}: ${originalLine.trim()} -> ${line.trim()}`);
        this.fixCount++;
      }
      
      fixedLines.push(line);
    }
    
    const newContent = fixedLines.join('\n');
    
    if (newContent !== originalContent) {
      fs.writeFileSync(this.filePath, newContent, 'utf8');
      console.log('✅ 文件已更新');
    } else {
      console.log('ℹ️ 没有需要修复的内容');
    }
  }

  /**
   * 修复单行的字符串问题
   */
  fixLineStringIssues(line, lineNumber) {
    let result = line;
    
    // 1. 修复 console.log('text:, param); -> console.log('text:', param);
    result = result.replace(/console\.(log|warn|error|info|debug)\('([^']*):,\s*([^)]*)\);/g, "console.$1('$2:', $3);");
    
    // 2. 修复 console.error('text:, param); -> console.error('text:', param);
    result = result.replace(/console\.(log|warn|error|info|debug)\('([^']*):,\s*([^)]*)\);/g, "console.$1('$2:', $3);");
    
    // 3. 修复缺少引号的情况
    result = result.replace(/console\.(log|warn|error|info|debug)\('([^']*):,\s*/g, "console.$1('$2:', ");
    
    // 4. 修复特定的错误模式
    if (result.includes("'获取测试结果失败:,")) {
      result = result.replace("'获取测试结果失败:,", "'获取测试结果失败:',");
    }
    
    if (result.includes("'设置指标数据:,")) {
      result = result.replace("'设置指标数据:,", "'设置指标数据:',");
    }
    
    if (result.includes("'📊 设置测试结果对象:,")) {
      result = result.replace("'📊 设置测试结果对象:,", "'📊 设置测试结果对象:',");
    }
    
    // 5. 修复其他常见的模式
    result = result.replace(/:,\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\);/g, ":', $1);");
    result = result.replace(/:,\s*([a-zA-Z_$][a-zA-Z0-9_$]*\.[a-zA-Z_$][a-zA-Z0-9_$]*)\);/g, ":', $1);");
    result = result.replace(/:,\s*([a-zA-Z_$][a-zA-Z0-9_$]*\[[^\]]*\])\);/g, ":', $1);");
    
    // 6. 修复函数调用中的类似问题
    result = result.replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)\('([^']*):,\s*([^)]*)\);/g, "$1('$2:', $3);");
    
    // 7. 清理多余的逗号和引号
    result = result.replace(/:,\s*\)/g, "')");
    result = result.replace(/:,\s*;/g, "';");
    
    return result;
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new FinalComprehensiveFixer();
  fixer.fix().catch(console.error);
}

module.exports = FinalComprehensiveFixer;
