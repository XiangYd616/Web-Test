#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class LastErrorsFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.frontendRoot = path.join(this.projectRoot, 'frontend');
  }

  async execute() {
    console.log('🔧 修复最后2个错误...\n');

    // 修复ConfigManager.ts第264行
    await this.fixConfigManagerLine264();
    
    // 修复apiErrorInterceptor.ts第409行
    await this.fixApiErrorInterceptorLine409();

    console.log('\n✅ 最后2个错误修复完成');
  }

  async fixConfigManagerLine264() {
    const filePath = path.join(this.frontendRoot, 'config', 'ConfigManager.ts');
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let lines = content.split('\n');
      
      // 找到第264行并完全重写
      if (lines[263]) {
        console.log(`原始第264行: "${lines[263]}"`);
        console.log(`长度: ${lines[263].length}`);
        
        // 完全重写第264行
        lines[263] = "      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');";
        
        console.log(`新的第264行: "${lines[263]}"`);
        console.log(`新长度: ${lines[263].length}`);
      }
      
      // 清理所有行末的不可见字符
      lines = lines.map(line => line.replace(/[\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\s]+$/, ''));
      
      // 重新组合并写回文件
      content = lines.join('\n');
      fs.writeFileSync(filePath, content);
      
      console.log('✅ ConfigManager.ts 第264行修复完成');
      
    } catch (error) {
      console.error('❌ ConfigManager.ts 修复失败:', error.message);
    }
  }

  async fixApiErrorInterceptorLine409() {
    const filePath = path.join(this.frontendRoot, 'services', 'apiErrorInterceptor.ts');
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // 移除文件末尾的所有不可见字符和模板字符串标记
      content = content.replace(/[\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000`\s]+$/, '');
      
      // 确保文件以正确的export语句结束
      if (!content.endsWith('export default apiErrorInterceptor;')) {
        content = content.replace(/export default apiErrorInterceptor;.*$/, 'export default apiErrorInterceptor;');
      }
      
      // 添加一个换行符
      content += '\n';
      
      fs.writeFileSync(filePath, content);
      
      console.log('✅ apiErrorInterceptor.ts 第409行修复完成');
      
    } catch (error) {
      console.error('❌ apiErrorInterceptor.ts 修复失败:', error.message);
    }
  }
}

// 执行脚本
if (require.main === module) {
  const fixer = new LastErrorsFixer();
  fixer.execute().catch(error => {
    console.error('❌ 最后错误修复失败:', error);
    process.exit(1);
  });
}

module.exports = LastErrorsFixer;
