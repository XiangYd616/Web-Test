const fs = require('fs');
const path = require('path');

/**
 * 批量修复JSX错误
 */
class BatchJSXFixer {
  constructor() {
    this.frontendPath = path.join(process.cwd(), 'frontend');
    this.fixedFiles = [];
  }

  /**
   * 执行批量修复
   */
  async execute() {
    console.log('🔧 批量修复JSX错误...\n');
    console.log('Frontend path:', this.frontendPath);

    try {
      // 获取所有TypeScript文件
      const files = this.getAllTypeScriptFiles();
      console.log('📁 发现', files.length, '个TypeScript文件');

      let totalFixedLines = 0;

      for (const file of files) {
        const fixedLines = await this.fixFileJSX(file);
        if (fixedLines > 0) {
          totalFixedLines += fixedLines;
          const relativePath = path.relative(this.frontendPath, file);
          this.fixedFiles.push(relativePath);
        }
      }

      console.log('\n📊 修复结果:');
      console.log(`  修复文件: ${this.fixedFiles.length}`);
      console.log(`  修复行数: ${totalFixedLines}`);

      if (this.fixedFiles.length > 0) {
        console.log('\n✅ 修复的文件:');
        this.fixedFiles.forEach(file => {
          console.log(`  - ${file}`);
        });
      }

    } catch (error) {
      console.error('❌ 批量修复失败:', error);
    }
  }

  /**
   * 修复单个文件的JSX问题
   */
  async fixFileJSX(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;

      // 应用所有修复规则
      content = this.applyJSXFixes(content);

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);

        const relativePath = path.relative(this.frontendPath, filePath);
        const linesDiff = content.split('\n').length - originalContent.split('\n').length;
        console.log(`  ✓ 修复 ${relativePath}`);
        return Math.abs(linesDiff) + 1; // 估算修复的行数
      }

      return 0;

    } catch (error) {
      console.error(`  ❌ 修复失败 ${filePath}:`, error.message);
      return 0;
    }
  }

  /**
   * 应用JSX修复规则
   */
  applyJSXFixes(content) {
    // 1. 修复className属性格式
    content = content.replace(/className=\s*'/g, "className='");
    content = content.replace(/className=\s*"/g, 'className="');

    // 2. 修复JSX标签末尾的分号
    content = content.replace(/>\s*;/g, '>');
    content = content.replace(/\/>\s*;/g, ' />');

    // 3. 修复自闭合标签的多余空格
    content = content.replace(/className='([^']*)'(\s{4,})\/>/g, "className='$1' />");
    content = content.replace(/className="([^"]*)"(\s{4,})\/>/g, 'className="$1" />');

    // 4. 修复标签属性格式
    content = content.replace(/=\s*'/g, "='");
    content = content.replace(/=\s*"/g, '="');

    // 5. 修复条件渲染语法
    content = content.replace(/{\s*([^}]+)\s*===\s*'([^']+)'\s*\n\s*<>/g, "{$1 === '$2' && (\n<>");
    content = content.replace(/{\s*([^}]+)\s*===\s*"([^"]+)"\s*\n\s*<>/g, '{$1 === "$2" && (\n<>');

    // 6. 修复React Fragment闭合
    content = content.replace(/\n\s*<\/>\s*\n\s*}\s*$/gm, '\n</>\n)}');
    content = content.replace(/\n\s*<\/>\s*\n\s*\)\s*}\s*$/gm, '\n</>\n)}');

    // 7. 修复button标签
    content = content.replace(/<button;/g, '<button');
    content = content.replace(/<button\s*;/g, '<button');

    // 8. 修复div标签
    content = content.replace(/<div;/g, '<div');
    content = content.replace(/<div\s*;/g, '<div');

    // 9. 修复其他常见标签
    content = content.replace(/<(\w+);/g, '<$1');
    content = content.replace(/<(\w+)\s*;/g, '<$1');

    // 10. 修复JSX表达式中的多余分号
    content = content.replace(/{\s*\(\s*''\s*\)\s*}/g, '');
    content = content.replace(/{\s*\(\s*""\s*\)\s*}/g, '');

    // 11. 修复条件渲染的闭合括号
    content = content.replace(/\)\s*}\s*$/gm, ')}');

    // 12. 修复多余的空格和格式问题
    content = content.replace(/\s{4,}\/>/g, ' />');
    content = content.replace(/\s{4,}>/g, '>');

    return content;
  }

  /**
   * 获取所有TypeScript文件
   */
  getAllTypeScriptFiles() {
    const files = [];

    function scanDirectory(dir) {
      try {
        const items = fs.readdirSync(dir);

        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            scanDirectory(fullPath);
          } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    }

    scanDirectory(this.frontendPath);
    return files;
  }
}

if (require.main === module) {
  const fixer = new BatchJSXFixer();
  fixer.execute().catch(console.error);
}

module.exports = { BatchJSXFixer };
