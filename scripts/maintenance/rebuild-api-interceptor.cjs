#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ApiInterceptorRebuilder {
  constructor() {
    this.projectRoot = process.cwd();
    this.filePath = path.join(this.projectRoot, 'frontend', 'services', 'apiErrorInterceptor.ts');
  }

  async execute() {
    console.log('🔧 重建 apiErrorInterceptor.ts...\n');

    try {
      let content = fs.readFileSync(this.filePath, 'utf8');
      
      // 将内容按行分割
      let lines = content.split(/\r?\n/);
      
      console.log(`原始行数: ${lines.length}`);
      
      // 找到export语句的位置
      let exportLineIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === 'export default apiErrorInterceptor;') {
          exportLineIndex = i;
          break;
        }
      }
      
      console.log(`找到export语句在第 ${exportLineIndex + 1} 行`);
      
      // 如果找到了export语句，只保留到那一行
      if (exportLineIndex >= 0) {
        lines = lines.slice(0, exportLineIndex + 1);
      } else {
        // 如果没找到，手动添加
        // 先移除末尾的空行和无效字符
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
          lines.pop();
        }
        lines.push('export default apiErrorInterceptor;');
      }
      
      // 清理每一行，移除不可见字符
      lines = lines.map(line => {
        // 移除所有不可见字符，但保留正常的空格和制表符
        return line.replace(/[\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+/g, '')
                  .replace(/\s+$/, ''); // 移除行末空白
      });
      
      // 重新组合内容
      content = lines.join('\n');
      
      // 确保文件以单个换行符结束
      if (!content.endsWith('\n')) {
        content += '\n';
      }
      
      // 写回文件
      fs.writeFileSync(this.filePath, content, 'utf8');
      
      console.log(`✅ 重建完成，新行数: ${lines.length}`);
      console.log(`最后一行: "${lines[lines.length - 1]}"`);
      
      // 验证文件
      const newContent = fs.readFileSync(this.filePath, 'utf8');
      const newLines = newContent.split('\n');
      console.log(`验证: 文件现在有 ${newLines.length} 行`);

    } catch (error) {
      console.error('❌ 重建失败:', error.message);
      throw error;
    }
  }
}

// 执行脚本
if (require.main === module) {
  const rebuilder = new ApiInterceptorRebuilder();
  rebuilder.execute().catch(error => {
    console.error('❌ apiErrorInterceptor 重建失败:', error);
    process.exit(1);
  });
}

module.exports = ApiInterceptorRebuilder;
