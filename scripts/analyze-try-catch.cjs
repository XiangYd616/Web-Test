/**
 * 分析StressTest.tsx中的try-catch结构
 * 找出第1355行"Unexpected catch"错误的根本原因
 */

const fs = require('fs');
const path = require('path');

class TryCatchAnalyzer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.filePath = path.join(this.projectRoot, 'frontend/pages/StressTest.tsx');
  }

  /**
   * 开始分析
   */
  async analyze() {
    console.log('🔍 开始分析try-catch结构...\n');
    
    const content = fs.readFileSync(this.filePath, 'utf8');
    const lines = content.split('\n');
    
    console.log('📊 关键行分析:');
    console.log('============================================================\n');
    
    // 分析关键行
    const keyLines = [1046, 1262, 1344, 1345, 1354, 1355, 1390];
    
    keyLines.forEach(lineNum => {
      if (lineNum <= lines.length) {
        const line = lines[lineNum - 1];
        const indent = line.match(/^(\s*)/)[1].length;
        console.log(`行 ${lineNum}: (缩进${indent}个空格)`);
        console.log(`  内容: "${line}"`);
        console.log('');
      }
    });
    
    console.log('🔍 try-catch匹配分析:');
    console.log('============================================================\n');
    
    const tryStack = [];
    const catchLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // 查找try语句
      if (line.includes('try {')) {
        const indent = line.match(/^(\s*)/)[1].length;
        tryStack.push({ lineNum, indent, line: line.trim() });
        console.log(`✅ Try 发现: 行 ${lineNum}, 缩进 ${indent}`);
      }
      
      // 查找catch语句
      if (line.includes('} catch')) {
        const indent = line.match(/^(\s*)/)[1].length;
        catchLines.push({ lineNum, indent, line: line.trim() });
        console.log(`❓ Catch 发现: 行 ${lineNum}, 缩进 ${indent}`);
        
        // 尝试匹配对应的try
        let matched = false;
        for (let j = tryStack.length - 1; j >= 0; j--) {
          const tryInfo = tryStack[j];
          if (tryInfo.indent === indent) {
            console.log(`  ✅ 匹配到 Try: 行 ${tryInfo.lineNum}, 缩进 ${tryInfo.indent}`);
            tryStack.splice(j, 1); // 移除已匹配的try
            matched = true;
            break;
          }
        }
        
        if (!matched) {
          console.log(`  ❌ 未找到匹配的 Try! (缩进 ${indent})`);
          console.log(`  可用的 Try:`);
          tryStack.forEach(tryInfo => {
            console.log(`    行 ${tryInfo.lineNum}, 缩进 ${tryInfo.indent}: ${tryInfo.line}`);
          });
        }
      }
    }
    
    console.log('\n🎯 问题诊断:');
    console.log('============================================================\n');
    
    if (tryStack.length > 0) {
      console.log('❌ 未匹配的 Try 语句:');
      tryStack.forEach(tryInfo => {
        console.log(`  行 ${tryInfo.lineNum}, 缩进 ${tryInfo.indent}: ${tryInfo.line}`);
      });
    }
    
    console.log('\n💡 建议修复方案:');
    console.log('============================================================\n');
    
    // 分析第1355行的问题
    const line1355 = lines[1354]; // 0-based index
    const indent1355 = line1355.match(/^(\s*)/)[1].length;
    
    console.log(`第1355行当前缩进: ${indent1355}个空格`);
    console.log(`第1355行内容: "${line1355}"`);
    
    // 查找第1046行的try
    const line1046 = lines[1045]; // 0-based index
    const indent1046 = line1046.match(/^(\s*)/)[1].length;
    
    console.log(`第1046行缩进: ${indent1046}个空格`);
    console.log(`第1046行内容: "${line1046}"`);
    
    if (indent1355 !== indent1046) {
      console.log(`\n🔧 修复建议: 将第1355行的缩进从 ${indent1355} 改为 ${indent1046} 个空格`);
    }
  }
}

// 运行分析
if (require.main === module) {
  const analyzer = new TryCatchAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = TryCatchAnalyzer;
