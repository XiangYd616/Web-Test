#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 修复正则表达式错误的脚本
 * 批量修复项目中错误的正则表达式语法
 */
class RegexErrorFixer {
  constructor() {
    this.fixes = [
      // 修复 //s+ 错误
      {
        from: /\/\/s\+/g,
        to: '/\\s+'
      },

      // 修复 /s * 错误
      {
        from: /\/s\s*\*/g,
        to: '\\s*'
      },

      // 修复 /s+ 错误
      {
        from: /\/s\+/g,
        to: '\\s+'
      },

      // 修复 //. 错误
      {
        from: /\/\/\./g,
        to: '/\\.'
      },

      // 修复 //( 错误
      {
        from: /\/\/\(/g,
        to: '/\\('
      },

      // 修复 //) 错误
      {
        from: /\/\/\)/g,
        to: '/\\)'
      },

      // 修复 //[ 错误
      {
        from: /\/\/\[/g,
        to: '/\\['
      },

      // 修复 //] 错误
      {
        from: /\/\/\]/g,
        to: '/\\]'
      },

      // 修复 //$ 错误
      {
        from: /\/\/\$/g,
        to: '/\\$'
      },

      // 修复 //^ 错误
      {
        from: /\/\/\^/g,
        to: '/\\^'
      },

      // 修复 //+ 错误
      {
        from: /\/\/\+/g,
        to: '/\\+'
      },

      // 修复 //* 错误
      {
        from: /\/\/\*/g,
        to: '/\\*'
      },

      // 修复 //? 错误
      {
        from: /\/\/\?/g,
        to: '/\\?'
      },

      // 修复 //| 错误
      {
        from: /\/\/\|/g,
        to: '/\\|'
      },

      // 修复 //{ 错误
      {
        from: /\/\/\{/g,
        to: '/\\{'
      },

      // 修复 //} 错误
      {
        from: /\/\/\}/g,
        to: '/\\}'
      },

      // 修复多余的斜杠 :///// -> ://
      {
        from: /:\/\/\/\/\//g,
        to: '://'
      },

      // 修复字符类中的错误转义 [/]//] -> [\]\\]
      {
        from: /\[.*?\/\]\/\/\]/g,
        to: (match) => match.replace(/\/\]\/\/\]/, '\\]\\\\]')
      }
    ];

    this.stats = {
      filesProcessed: 0,
      filesModified: 0,
      totalFixes: 0
    };
  }

  /**
   * 修复所有正则表达式错误
   */
  fixAllRegexErrors(rootDir = 'frontend') {
    console.log('🔧 开始修复正则表达式错误...\n');

    this.walkDirectory(rootDir);
    this.generateReport();
  }

  /**
   * 递归遍历目录
   */
  walkDirectory(dir) {
    if (!fs.existsSync(dir)) {
      console.log(`⚠️ 目录不存在: ${dir}`);
      return;
    }

    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // 跳过特定目录
        if (this.shouldSkipDirectory(file)) {
          return;
        }
        this.walkDirectory(filePath);
      } else if (stat.isFile()) {
        if (this.shouldProcessFile(file)) {
          this.processFile(filePath);
        }
      }
    });
  }

  /**
   * 处理单个文件
   */
  processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let newContent = content;
      let fileModified = false;
      let fixesInFile = 0;

      // 应用所有修复规则
      this.fixes.forEach(fix => {
        const originalContent = newContent;
        if (typeof fix.to === 'function') {
          newContent = newContent.replace(fix.from, fix.to);
        } else {
          newContent = newContent.replace(fix.from, fix.to);
        }

        if (newContent !== originalContent) {
          fileModified = true;
          fixesInFile++;
        }
      });

      // 如果文件被修改，写回文件
      if (fileModified) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        const relativePath = path.relative(process.cwd(), filePath);
        console.log(`✅ 修复了 ${fixesInFile} 个正则表达式错误: ${relativePath}`);
        this.stats.filesModified++;
        this.stats.totalFixes += fixesInFile;
      }

      this.stats.filesProcessed++;

    } catch (error) {
      console.error(`❌ 处理文件失败: ${filePath}`, error.message);
    }
  }

  /**
   * 是否跳过目录
   */
  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules', '.git', 'dist', 'build', 'coverage',
      '__tests__', '.vscode', '.idea', 'temp', 'tmp'
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * 是否处理文件
   */
  shouldProcessFile(fileName) {
    return fileName.match(/\.(ts|tsx|js|jsx)$/) &&
      !fileName.includes('.test.') &&
      !fileName.includes('.spec.');
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n📊 正则表达式错误修复报告\n');
    console.log(`📁 处理文件数: ${this.stats.filesProcessed}`);
    console.log(`🔧 修改文件数: ${this.stats.filesModified}`);
    console.log(`✨ 总修复数: ${this.stats.totalFixes}\n`);

    if (this.stats.totalFixes === 0) {
      console.log('✅ 所有正则表达式都正确！');
    } else {
      console.log('🎉 正则表达式错误修复完成！');
    }
  }
}

// 主函数
function main() {
  const fixer = new RegexErrorFixer();
  fixer.fixAllRegexErrors();
}

if (require.main === module) {
  main();
}

module.exports = RegexErrorFixer;
