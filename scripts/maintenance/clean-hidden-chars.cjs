#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class HiddenCharsCleaner {
  constructor() {
    this.projectRoot = process.cwd();
    this.frontendRoot = path.join(this.projectRoot, 'frontend');
  }

  async execute() {
    console.log('🧹 清理隐藏字符...\n');

    const files = [
      'config/ConfigManager.ts',
      'services/apiErrorInterceptor.ts',
      'services/errorService.ts',
      'utils/performanceMonitor.ts',
      'utils/routePreloader.ts'
    ];

    for (const filePath of files) {
      await this.cleanFile(path.join(this.frontendRoot, filePath));
    }

    console.log('\n✅ 隐藏字符清理完成');
  }

  async cleanFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ 文件不存在: ${path.relative(this.projectRoot, filePath)}`);
        return;
      }

      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;

      // 清理各种隐藏字符
      content = this.cleanHiddenChars(content);

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ 清理: ${path.relative(this.projectRoot, filePath)}`);
      }

    } catch (error) {
      console.log(`❌ 错误: ${path.relative(this.projectRoot, filePath)} - ${error.message}`);
    }
  }

  cleanHiddenChars(content) {
    // 1. 移除行末的隐藏字符（保留换行符）
    content = content.replace(/[\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+$/gm, '');
    
    // 2. 移除字符串末尾的隐藏字符
    content = content.replace(/(['"`])([^'"`]*?)[\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+\1/g, '$1$2$1');
    
    // 3. 清理特定的问题行
    content = content.replace(/const mediaQuery = window\.matchMedia\('prefers-color-scheme: dark'\);[\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+/g,
      "const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');");
    
    // 4. 修复模板字符串中的隐藏字符
    content = content.replace(/`([^`]*?)[\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+`/g, '`$1`');
    
    // 5. 修复函数调用中的隐藏字符
    content = content.replace(/\)[\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+;/g, ');');
    
    // 6. 修复对象属性中的隐藏字符
    content = content.replace(/}[\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+;/g, '};');
    
    // 7. 修复数组声明中的隐藏字符
    content = content.replace(/\][\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+;/g, '];');
    
    // 8. 移除多余的空白字符
    content = content.replace(/[\t ]+$/gm, '');
    
    // 9. 标准化换行符
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // 10. 移除文件末尾的多余空行
    content = content.replace(/\n{3,}$/g, '\n');

    return content;
  }
}

// 执行脚本
if (require.main === module) {
  const cleaner = new HiddenCharsCleaner();
  cleaner.execute().catch(error => {
    console.error('❌ 隐藏字符清理失败:', error);
    process.exit(1);
  });
}

module.exports = HiddenCharsCleaner;
