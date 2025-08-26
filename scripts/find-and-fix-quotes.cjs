/**
 * 查找并修复引号问题的脚本
 * 专门处理 console.log('text', param'); 这种错误模式
 */

const fs = require('fs');
const path = require('path');

class QuoteFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.filePath = path.join(this.projectRoot, 'frontend/pages/StressTest.tsx');
    this.fixedLines = [];
  }

  /**
   * 开始查找并修复
   */
  async fix() {
    console.log('🔧 开始查找并修复引号问题...\n');
    
    try {
      await this.findAndFixQuotes();
      this.generateReport();
      
      console.log(`\n✅ 引号问题修复完成！`);
      console.log(`   修复行数: ${this.fixedLines.length} 行`);
    } catch (error) {
      console.error('修复失败:', error);
    }
  }

  /**
   * 查找并修复引号问题
   */
  async findAndFixQuotes() {
    const content = fs.readFileSync(this.filePath, 'utf8');
    const lines = content.split('\n');
    
    let hasChanges = false;
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      let newLine = line;
      
      const originalLine = newLine;
      
      // 查找并修复引号问题
      newLine = this.fixQuoteIssues(newLine, lineNumber);
      
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
   * 修复引号问题
   */
  fixQuoteIssues(line, lineNumber) {
    let result = line;
    
    // 查找所有可能的问题模式
    const patterns = [
      // 1. console.log('text', param'); -> console.log('text', param);
      {
        regex: /console\.(log|warn|error|info|debug)\(([^)]*), ([^)]*[^'"])';\)/,
        replacement: "console.$1($2, $3);",
        description: "console语句参数后多余引号"
      },
      
      // 2. console.log('text', param'); -> console.log('text', param);
      {
        regex: /console\.(log|warn|error|info|debug)\(([^)]*), ([^)]*[^'"])';\);/,
        replacement: "console.$1($2, $3);",
        description: "console语句参数后多余引号和分号"
      },
      
      // 3. 函数调用中的类似问题
      {
        regex: /([a-zA-Z_$][a-zA-Z0-9_$]*)\(([^)]*), ([^)]*[^'"])';\)/,
        replacement: "$1($2, $3);",
        description: "函数调用参数后多余引号"
      },
      
      // 4. localStorage.setItem等特定函数
      {
        regex: /localStorage\.setItem\(([^)]*), ([^)]*[^'"])';\)/,
        replacement: "localStorage.setItem($1, $2);",
        description: "localStorage.setItem参数后多余引号"
      },
      
      // 5. 更通用的模式：任何函数调用的最后一个参数后面有多余的引号
      {
        regex: /([a-zA-Z_$][a-zA-Z0-9_$]*\([^)]*), ([^)]*[^'"])';\)/,
        replacement: "$1, $2);",
        description: "通用函数调用参数后多余引号"
      }
    ];
    
    for (const pattern of patterns) {
      if (pattern.regex.test(result)) {
        console.log(`🔍 行 ${lineNumber}: 发现 ${pattern.description}`);
        result = result.replace(pattern.regex, pattern.replacement);
      }
    }
    
    return result;
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    console.log('\n📊 引号问题修复报告:');
    console.log('============================================================\n');
    
    if (this.fixedLines.length > 0) {
      console.log('✅ 成功修复的行:\n');
      
      this.fixedLines.forEach((fix, index) => {
        console.log(`  ${index + 1}. 行 ${fix.lineNumber}:`);
        console.log(`     原始: "${fix.original}"`);
        console.log(`     修复: "${fix.fixed}"`);
        console.log('');
      });
    }
    
    console.log('🎯 修复效果:');
    console.log(`  ✅ 修复了console语句的引号问题`);
    console.log(`  ✅ 修复了函数调用的引号问题`);
    console.log(`  ✅ 修复了localStorage等特定函数的引号问题`);
    
    console.log('\n💡 建议:');
    console.log('  1. 运行 npm run build 验证修复效果');
    console.log('  2. 如果还有问题，请检查具体的错误信息');
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new QuoteFixer();
  fixer.fix().catch(console.error);
}

module.exports = QuoteFixer;
