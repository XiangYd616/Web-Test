/**
 * 精确语法修复脚本
 * 只修复最关键的语法错误，保持代码结构完整
 */

const fs = require('fs');
const path = require('path');

class PreciseSyntaxFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.filePath = path.join(this.projectRoot, 'frontend/pages/StressTest.tsx');
    this.fixedLines = [];
  }

  /**
   * 开始精确修复
   */
  async fix() {
    console.log('🔧 开始精确语法修复...\n');
    
    try {
      await this.performPreciseFix();
      this.generateReport();
      
      console.log(`\n✅ 精确修复完成！`);
      console.log(`   修复行数: ${this.fixedLines.length} 行`);
    } catch (error) {
      console.error('修复失败:', error);
    }
  }

  /**
   * 执行精确修复
   */
  async performPreciseFix() {
    const content = fs.readFileSync(this.filePath, 'utf8');
    const lines = content.split('\n');
    
    let hasChanges = false;
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      let newLine = line;
      
      // 只修复最关键的语法错误
      const originalLine = newLine;
      
      // 1. 修复对象属性中的 ? property : 语法
      if (/\?\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/.test(newLine)) {
        newLine = newLine.replace(/\?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1:');
      }
      
      // 2. 修复函数参数中的 ? parameter : 语法
      if (/\(\s*[^,)]*,\s*\?\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/.test(newLine)) {
        newLine = newLine.replace(/(\(\s*[^,)]*,\s*)\?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1$2:');
      }
      
      // 3. 修复 HTTP error! ? status : 语法
      if (newLine.includes('HTTP error! ? status :')) {
        newLine = newLine.replace('HTTP error! ? status :', 'HTTP error! status:');
      }
      
      // 4. 修复 const ? variable : 语法
      if (/const\s+\?\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/.test(newLine)) {
        newLine = newLine.replace(/const\s+\?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, 'const $1:');
      }
      
      // 5. 修复 let ? variable : 语法
      if (/let\s+\?\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/.test(newLine)) {
        newLine = newLine.replace(/let\s+\?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, 'let $1:');
      }
      
      // 6. 修复特定的错误模式
      newLine = this.fixSpecificPatterns(newLine);
      
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
      // 修复常见属性
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
      // 修复没有空格的情况
      { regex: /\?rampUpTime\s*:/, replacement: 'rampUpTime:' },
      { regex: /\?username\s*:/, replacement: 'username:' },
      { regex: /\?password\s*:/, replacement: 'password:' },
      { regex: /\?enabled\s*:/, replacement: 'enabled:' },
      { regex: /\?type\s*:/, replacement: 'type:' },
      { regex: /\?host\s*:/, replacement: 'host:' },
      { regex: /\?port\s*:/, replacement: 'port:' }
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
    console.log('\n📊 精确语法修复报告:');
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
    console.log(`  ✅ 修复了变量声明语法错误`);
    console.log(`  ✅ 修复了特定语法模式错误`);
    
    console.log('\n💡 建议:');
    console.log('  1. 运行 npm run build 验证修复效果');
    console.log('  2. 检查是否还有剩余的语法错误');
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new PreciseSyntaxFixer();
  fixer.fix().catch(console.error);
}

module.exports = PreciseSyntaxFixer;
