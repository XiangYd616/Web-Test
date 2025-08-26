/**
 * 修复剩余的语法错误
 * 专门处理 ? property : 语法错误
 */

const fs = require('fs');
const path = require('path');

class RemainingSyntaxFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.filePath = path.join(this.projectRoot, 'frontend/pages/StressTest.tsx');
    this.fixedLines = [];
  }

  /**
   * 开始修复
   */
  async fix() {
    console.log('🔧 开始修复剩余的语法错误...\n');
    
    try {
      await this.fixRemainingSyntaxErrors();
      this.generateReport();
      
      console.log(`\n✅ 修复完成！`);
      console.log(`   修复行数: ${this.fixedLines.length} 行`);
    } catch (error) {
      console.error('修复失败:', error);
    }
  }

  /**
   * 修复剩余的语法错误
   */
  async fixRemainingSyntaxErrors() {
    const content = fs.readFileSync(this.filePath, 'utf8');
    const lines = content.split('\n');
    
    let hasChanges = false;
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      let newLine = line;
      
      // 修复对象属性中的 ? property : 语法
      if (this.hasObjectPropertyError(line)) {
        newLine = this.fixObjectPropertyError(newLine);
        if (newLine !== line) {
          hasChanges = true;
          this.fixedLines.push({
            lineNumber,
            original: line.trim(),
            fixed: newLine.trim()
          });
        }
      }
      
      // 修复函数参数中的 ? parameter : 语法
      if (this.hasFunctionParameterError(line)) {
        newLine = this.fixFunctionParameterError(newLine);
        if (newLine !== line) {
          hasChanges = true;
          this.fixedLines.push({
            lineNumber,
            original: line.trim(),
            fixed: newLine.trim()
          });
        }
      }
      
      // 修复特定的错误模式
      newLine = this.fixSpecificPatterns(newLine);
      if (newLine !== line && !this.fixedLines.some(f => f.lineNumber === lineNumber)) {
        hasChanges = true;
        this.fixedLines.push({
          lineNumber,
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
    // 匹配 ? property : 模式，但排除三元运算符
    return /\?\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/.test(line) && 
           !line.includes('?') || // 不包含其他问号
           line.match(/\?\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/g)?.length === 1; // 只有一个问号
  }

  /**
   * 修复对象属性语法错误
   */
  fixObjectPropertyError(line) {
    // 修复 ? property : 为 property:
    return line.replace(/\?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1:');
  }

  /**
   * 检查是否有函数参数语法错误
   */
  hasFunctionParameterError(line) {
    // 匹配函数参数中的 ? parameter : 模式
    return /\(\s*[^,)]*,\s*\?\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/.test(line);
  }

  /**
   * 修复函数参数语法错误
   */
  fixFunctionParameterError(line) {
    // 修复函数参数中的 ? parameter : 为 parameter:
    return line.replace(/(\(\s*[^,)]*,\s*)\?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1$2:');
  }

  /**
   * 修复特定的错误模式
   */
  fixSpecificPatterns(line) {
    let result = line;
    
    // 修复特定的错误模式
    const patterns = [
      // 修复 ?startTestDirectly: 
      { regex: /\?startTestDirectly\s*:/, replacement: 'startTestDirectly:' },
      // 修复 ?cancelTest:
      { regex: /\?cancelTest\s*:/, replacement: 'cancelTest:' },
      // 修复 ?autoLoad:
      { regex: /\?\s*autoLoad\s*:/, replacement: 'autoLoad:' },
      // 修复 ?startTest:
      { regex: /\?\s*startTest\s*:/, replacement: 'startTest:' },
      // 修复其他常见模式
      { regex: /\?\s*url\s*:/, replacement: 'url:' },
      { regex: /\?\s*config\s*:/, replacement: 'config:' },
      { regex: /\?\s*body\s*:/, replacement: 'body:' },
      { regex: /\?\s*recordId\s*:/, replacement: 'recordId:' },
      { regex: /\?\s*username\s*:/, replacement: 'username:' },
      { regex: /\?\s*password\s*:/, replacement: 'password:' },
      { regex: /\?\s*users\s*:/, replacement: 'users:' },
      { regex: /\?\s*duration\s*:/, replacement: 'duration:' },
      { regex: /\?\s*rampUp\s*:/, replacement: 'rampUp:' },
      { regex: /\?\s*testType\s*:/, replacement: 'testType:' },
      { regex: /\?\s*method\s*:/, replacement: 'method:' },
      { regex: /\?\s*timeout\s*:/, replacement: 'timeout:' },
      { regex: /\?\s*thinkTime\s*:/, replacement: 'thinkTime:' },
      { regex: /\?\s*warmupDuration\s*:/, replacement: 'warmupDuration:' },
      { regex: /\?\s*cooldownDuration\s*:/, replacement: 'cooldownDuration:' },
      { regex: /\?\s*headers\s*:/, replacement: 'headers:' },
      { regex: /\?\s*concurrent_users\s*:/, replacement: 'concurrent_users:' },
      { regex: /\?\s*duration_seconds\s*:/, replacement: 'duration_seconds:' },
      { regex: /\?\s*ramp_up_time\s*:/, replacement: 'ramp_up_time:' },
      { regex: /\?\s*think_time\s*:/, replacement: 'think_time:' },
      { regex: /\?\s*timestamp\s*:/, replacement: 'timestamp:' },
      { regex: /\?\s*responseTime\s*:/, replacement: 'responseTime:' },
      { regex: /\?\s*throughput\s*:/, replacement: 'throughput:' },
      { regex: /\?\s*activeUsers\s*:/, replacement: 'activeUsers:' },
      { regex: /\?\s*connectionTime\s*:/, replacement: 'connectionTime:' },
      { regex: /\?\s*dnsTime\s*:/, replacement: 'dnsTime:' },
      { regex: /\?\s*totalDataPoints\s*:/, replacement: 'totalDataPoints:' },
      { regex: /\?\s*recentDataPoints\s*:/, replacement: 'recentDataPoints:' },
      { regex: /\?\s*calculatedTPS\s*:/, replacement: 'calculatedTPS:' },
      { regex: /\?\s*totalTimeSpanSeconds\s*:/, replacement: 'totalTimeSpanSeconds:' },
      { regex: /\?\s*calculatedAverageTPS\s*:/, replacement: 'calculatedAverageTPS:' },
      { regex: /\?\s*peakTPS\s*:/, replacement: 'peakTPS:' },
      { regex: /\?\s*errorRate\s*:/, replacement: 'errorRate:' },
      { regex: /\?\s*p95ResponseTime\s*:/, replacement: 'p95ResponseTime:' },
      { regex: /\?\s*p99ResponseTime\s*:/, replacement: 'p99ResponseTime:' },
      { regex: /\?\s*metrics\s*:/, replacement: 'metrics:' },
      { regex: /\?\s*testDuration\s*:/, replacement: 'testDuration:' },
      { regex: /\?\s*currentDataPoints\s*:/, replacement: 'currentDataPoints:' },
      { regex: /\?\s*errors\s*:/, replacement: 'errors:' },
      { regex: /\?\s*upgrade\s*:/, replacement: 'upgrade:' },
      // 修复 ?rampUpTime: (没有空格)
      { regex: /\?rampUpTime\s*:/, replacement: 'rampUpTime:' },
      { regex: /\?username\s*:/, replacement: 'username:' },
      { regex: /\?password\s*:/, replacement: 'password:' }
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
    console.log('\n📊 剩余语法错误修复报告:');
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
    console.log(`  ✅ 修复了对象属性语法错误`);
    console.log(`  ✅ 修复了函数参数语法错误`);
    console.log(`  ✅ 修复了特定语法模式错误`);
    
    console.log('\n💡 建议:');
    console.log('  1. 运行 npm run build 验证修复效果');
    console.log('  2. 检查语法错误是否已解决');
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new RemainingSyntaxFixer();
  fixer.fix().catch(console.error);
}

module.exports = RemainingSyntaxFixer;
