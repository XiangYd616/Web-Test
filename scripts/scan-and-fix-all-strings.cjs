/**
 * 扫描并修复所有字符串问题的脚本
 * 使用更全面的方法来检测和修复字符串未闭合问题
 */

const fs = require('fs');
const path = require('path');

class StringScanner {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.filePath = path.join(this.projectRoot, 'frontend/pages/StressTest.tsx');
    this.fixCount = 0;
  }

  /**
   * 开始扫描并修复
   */
  async fix() {
    console.log('🔧 开始扫描并修复所有字符串问题...\n');
    
    try {
      await this.scanAndFixAllStrings();
      
      console.log(`\n✅ 扫描修复完成！`);
      console.log(`   修复次数: ${this.fixCount} 次`);
    } catch (error) {
      console.error('修复失败:', error);
    }
  }

  /**
   * 扫描并修复所有字符串问题
   */
  async scanAndFixAllStrings() {
    let content = fs.readFileSync(this.filePath, 'utf8');
    const originalContent = content;
    
    // 使用多种方法来检测和修复字符串问题
    content = this.fixAllStringPatterns(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(this.filePath, content, 'utf8');
      console.log('✅ 文件已更新');
    } else {
      console.log('ℹ️ 没有需要修复的内容');
    }
  }

  /**
   * 修复所有字符串模式
   */
  fixAllStringPatterns(content) {
    let result = content;
    const originalLength = result.length;
    
    // 1. 修复 setTestProgress('); -> setTestProgress('');
    result = result.replace(/setTestProgress\('\);/g, "setTestProgress('');");
    
    // 2. 修复 useState<string>('); -> useState<string>('');
    result = result.replace(/useState<string>\('\);/g, "useState<string>('');");
    
    // 3. 修复 useRef<string>('); -> useRef<string>('');
    result = result.replace(/useRef<string>\('\);/g, "useRef<string>('');");
    
    // 4. 修复 console.log('text', { ... }'); -> console.log('text', { ... });
    result = result.replace(/console\.(log|warn|error|info|debug)\('([^']*)', \{ ([^}]*) \}'\);/g, "console.$1('$2', { $3 });");
    
    // 5. 修复 console.log('text'); -> console.log('text');
    result = result.replace(/console\.(log|warn|error|info|debug)\('([^']*)'\);/g, "console.$1('$2');");
    
    // 6. 修复函数调用中的字符串参数
    result = result.replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)\('([^']*)'\);/g, "$1('$2');");
    
    // 7. 修复特定的错误模式
    const specificFixes = [
      { from: /setCurrentStatus\('\);/g, to: "setCurrentStatus('');" },
      { from: /setStatusMessage\('\);/g, to: "setStatusMessage('');" },
      { from: /setError\('\);/g, to: "setError('');" },
      { from: /localStorage\.setItem\('([^']*)', '\);/g, to: "localStorage.setItem('$1', '');" },
      { from: /throw new Error\('\);/g, to: "throw new Error('');" }
    ];
    
    for (const fix of specificFixes) {
      const beforeCount = (result.match(fix.from) || []).length;
      result = result.replace(fix.from, fix.to);
      const afterCount = (result.match(fix.from) || []).length;
      const fixedCount = beforeCount - afterCount;
      
      if (fixedCount > 0) {
        console.log(`✅ 修复了 ${fixedCount} 个特定模式`);
        this.fixCount += fixedCount;
      }
    }
    
    // 8. 使用正则表达式查找所有可能的字符串未闭合问题
    const lines = result.split('\n');
    const fixedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const originalLine = line;
      
      // 检查是否有未闭合的字符串
      if (this.hasUnterminatedString(line)) {
        line = this.fixUnterminatedStringInLine(line, i + 1);
        
        if (line !== originalLine) {
          console.log(`✅ 修复行 ${i + 1}: ${originalLine.trim()} -> ${line.trim()}`);
          this.fixCount++;
        }
      }
      
      fixedLines.push(line);
    }
    
    result = fixedLines.join('\n');
    
    if (result.length !== originalLength) {
      console.log(`📊 内容长度变化: ${originalLength} -> ${result.length}`);
    }
    
    return result;
  }

  /**
   * 检查行是否有未闭合的字符串
   */
  hasUnterminatedString(line) {
    // 简单的启发式检查
    const patterns = [
      /\('\);$/,  // 以 ('); 结尾
      /'\);$/,    // 以 '); 结尾但可能缺少引号
      /'[^']*$/,  // 单引号开始但没有结束
      /"[^"]*$/   // 双引号开始但没有结束
    ];
    
    return patterns.some(pattern => pattern.test(line.trim()));
  }

  /**
   * 修复行中的未闭合字符串
   */
  fixUnterminatedStringInLine(line, lineNumber) {
    let result = line;
    
    // 修复常见的未闭合字符串模式
    if (result.includes("(');")) {
      result = result.replace(/\('\);/g, "('');");
    }
    
    if (result.includes("');") && !result.includes("('")) {
      // 可能是缺少开始引号的情况
      result = result.replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)\('\);/g, "$1('');");
    }
    
    return result;
  }
}

// 运行修复
if (require.main === module) {
  const scanner = new StringScanner();
  scanner.fix().catch(console.error);
}

module.exports = StringScanner;
