#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ApiInterceptorCleaner {
  constructor() {
    this.projectRoot = process.cwd();
    this.filePath = path.join(this.projectRoot, 'frontend', 'services', 'apiErrorInterceptor.ts');
  }

  async execute() {
    console.log('🧹 清理 apiErrorInterceptor.ts...\n');

    try {
      let content = fs.readFileSync(this.filePath, 'utf8');
      
      // 读取所有行
      let lines = content.split('\n');
      
      console.log(`原始文件行数: ${lines.length}`);
      
      // 找到最后一个有意义的行
      let lastMeaningfulLine = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line && line !== '`' && !line.match(/^[\s`]*$/)) {
          lastMeaningfulLine = i;
          break;
        }
      }
      
      console.log(`最后有意义的行: ${lastMeaningfulLine + 1}`);
      console.log(`内容: "${lines[lastMeaningfulLine]}"`);
      
      // 只保留到最后有意义的行
      if (lastMeaningfulLine >= 0) {
        lines = lines.slice(0, lastMeaningfulLine + 1);
      }
      
      // 清理每一行的末尾字符
      lines = lines.map(line => {
        // 移除行末的所有不可见字符，但保留正常的空格缩进
        return line.replace(/[\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+$/, '')
                  .replace(/\s+$/, '');
      });
      
      // 确保最后一行是export语句
      const lastLine = lines[lines.length - 1];
      if (!lastLine.includes('export default apiErrorInterceptor')) {
        // 如果最后一行不是export语句，添加它
        lines.push('export default apiErrorInterceptor;');
      }
      
      // 重新组合内容
      content = lines.join('\n');
      
      // 确保文件以单个换行符结束
      content = content.replace(/\n+$/, '') + '\n';
      
      // 写回文件
      fs.writeFileSync(this.filePath, content);
      
      console.log(`✅ 清理完成，新文件行数: ${lines.length}`);
      console.log(`最后一行: "${lines[lines.length - 1]}"`);

    } catch (error) {
      console.error('❌ 清理失败:', error.message);
      throw error;
    }
  }
}

// 执行脚本
if (require.main === module) {
  const cleaner = new ApiInterceptorCleaner();
  cleaner.execute().catch(error => {
    console.error('❌ apiErrorInterceptor 清理失败:', error);
    process.exit(1);
  });
}

module.exports = ApiInterceptorCleaner;
