#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ConfigManagerLineFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.filePath = path.join(this.projectRoot, 'frontend', 'config', 'ConfigManager.ts');
  }

  async execute() {
    console.log('🔧 修复 ConfigManager.ts 第264行...\n');

    try {
      let content = fs.readFileSync(this.filePath, 'utf8');
      
      // 读取所有行
      let lines = content.split('\n');
      
      // 找到问题行并重写
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 检查第264行（索引263）
        if (i === 263 && line.includes('matchMedia')) {
          console.log(`原始第264行: "${line}"`);
          console.log(`原始长度: ${line.length}`);
          
          // 完全重写这一行
          lines[i] = "      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');";
          console.log(`新的第264行: "${lines[i]}"`);
          console.log(`新的长度: ${lines[i].length}`);
        }
        
        // 清理所有行末的不可见字符
        lines[i] = line.replace(/[\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\s]+$/, '');
      }
      
      // 重新组合内容
      content = lines.join('\n');
      
      // 写回文件
      fs.writeFileSync(this.filePath, content);
      console.log('✅ ConfigManager.ts 第264行修复完成');

    } catch (error) {
      console.error('❌ 修复失败:', error);
      throw error;
    }
  }
}

// 执行脚本
if (require.main === module) {
  const fixer = new ConfigManagerLineFixer();
  fixer.execute().catch(error => {
    console.error('❌ ConfigManager 行修复失败:', error);
    process.exit(1);
  });
}

module.exports = ConfigManagerLineFixer;
