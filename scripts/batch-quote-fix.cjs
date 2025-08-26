/**
 * 批量引号修复脚本
 * 使用简单的字符串替换来修复所有剩余的引号问题
 */

const fs = require('fs');
const path = require('path');

class BatchQuoteFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.filePath = path.join(this.projectRoot, 'frontend/pages/StressTest.tsx');
    this.fixCount = 0;
  }

  /**
   * 开始批量修复
   */
  async fix() {
    console.log('🔧 开始批量引号修复...\n');

    try {
      await this.batchFixQuotes();

      console.log(`\n✅ 批量引号修复完成！`);
      console.log(`   修复次数: ${this.fixCount} 次`);
    } catch (error) {
      console.error('修复失败:', error);
    }
  }

  /**
   * 批量修复引号问题
   */
  async batchFixQuotes() {
    let content = fs.readFileSync(this.filePath, 'utf8');
    const originalContent = content;

    // 定义所有需要修复的模式
    const fixes = [
      // 修复 console.log('text', param'); -> console.log('text', param);
      { from: /', ([^)]*[^'"])';\)/g, to: ', $1);' },
      { from: /', ([^)]*[^'"])';\);/g, to: ', $1);' },

      // 修复 console.log('text'); -> console.log('text');
      { from: /console\.(log|warn|error|info|debug)\('([^']*)', ([^)]*[^'"])';\)/g, to: "console.$1('$2', $3);" },
      { from: /console\.(log|warn|error|info|debug)\('([^']*)', ([^)]*[^'"])';\);/g, to: "console.$1('$2', $3);" },

      // 修复 localStorage.setItem('key', value'); -> localStorage.setItem('key', value);
      { from: /localStorage\.setItem\('([^']*)', ([^)]*[^'"])';\)/g, to: "localStorage.setItem('$1', $2);" },

      // 修复其他函数调用
      { from: /([a-zA-Z_$][a-zA-Z0-9_$]*)\('([^']*)', ([^)]*[^'"])';\)/g, to: "$1('$2', $3);" },

      // 修复模板字符串的情况
      { from: /console\.(log|warn|error|info|debug)\((`[^`]*`), ([^)]*[^'"])';\)/g, to: "console.$1($2, $3);" },

      // 修复特定的错误模式
      { from: /'📊 保留所有数据点:', combined\.length'\);/g, to: "'📊 保留所有数据点:', combined.length);" },
      { from: /'🔍 获取测试结果:', testId'\);/g, to: "'🔍 获取测试结果:', testId);" },
      { from: /'📊 测试结果数据:', statusData'\);/g, to: "'📊 测试结果数据:', statusData);" },
      { from: /'📊 设置测试结果对象:, /g, to: "'📊 设置测试结果对象:', " },
      { from: /'设置指标数据:, /g, to: "'设置指标数据:', " },

      // 更通用的修复
      { from: /', ([a-zA-Z_$][a-zA-Z0-9_$]*)\'\);/g, to: ', $1);' },
      { from: /', ([a-zA-Z_$][a-zA-Z0-9_$]*\.[a-zA-Z_$][a-zA-Z0-9_$]*)\'\);/g, to: ', $1);' },
      { from: /', ([a-zA-Z_$][a-zA-Z0-9_$]*\[[^\]]*\])\'\);/g, to: ', $1);' }
    ];

    // 应用所有修复
    for (const fix of fixes) {
      const beforeCount = (content.match(fix.from) || []).length;
      content = content.replace(fix.from, fix.to);
      const afterCount = (content.match(fix.from) || []).length;
      const fixedCount = beforeCount - afterCount;

      if (fixedCount > 0) {
        console.log(`✅ 修复了 ${fixedCount} 个匹配项`);
        this.fixCount += fixedCount;
      }
    }

    // 额外的清理步骤
    content = content.replace(/;\);/g, ');'); // 清理多余的分号
    content = content.replace(/\)\)';/g, ');'); // 清理多余的引号和括号

    if (content !== originalContent) {
      fs.writeFileSync(this.filePath, content, 'utf8');
      console.log('✅ 文件已更新');
    } else {
      console.log('ℹ️ 没有需要修复的内容');
    }
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new BatchQuoteFixer();
  fixer.fix().catch(console.error);
}

module.exports = BatchQuoteFixer;
