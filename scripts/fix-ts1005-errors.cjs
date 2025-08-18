const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 专门修复TS1005错误（期望的标记）
 */
class TS1005ErrorFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.frontendPath = path.join(this.projectRoot, 'frontend');
    this.fixes = [];
  }

  /**
   * 执行TS1005错误修复
   */
  async execute() {
    console.log('🎯 专门修复TS1005错误（期望的标记）...\n');

    try {
      // 1. 获取TS1005错误最多的文件
      const problematicFiles = this.getTS1005ErrorFiles();
      console.log(`📊 发现${problematicFiles.length}个文件有TS1005错误`);

      // 2. 逐个修复文件
      for (const fileInfo of problematicFiles.slice(0, 10)) {
        console.log(`🔧 修复文件: ${fileInfo.file} (${fileInfo.count}个TS1005错误)`);
        await this.fixTS1005InFile(fileInfo.file);
      }

      // 3. 检查修复效果
      const remainingErrors = this.getTS1005ErrorCount();
      console.log(`📊 剩余TS1005错误: ${remainingErrors}`);

      console.log(`✅ TS1005错误修复完成，修复了${this.fixes.length}个文件`);

    } catch (error) {
      console.error('❌ TS1005错误修复失败:', error);
    }
  }

  /**
   * 获取TS1005错误文件列表
   */
  getTS1005ErrorFiles() {
    try {
      const output = execSync('npx tsc --noEmit --maxNodeModuleJsDepth 0', { 
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: this.frontendPath
      });
      return [];
    } catch (error) {
      const errorOutput = error.stdout || error.stderr || '';
      const lines = errorOutput.split('\n');
      const fileErrors = {};

      lines.forEach(line => {
        if (line.includes('error TS1005')) {
          const match = line.match(/^([^(]+)\(\d+,\d+\): error TS1005/);
          if (match) {
            const file = match[1].trim();
            fileErrors[file] = (fileErrors[file] || 0) + 1;
          }
        }
      });

      return Object.entries(fileErrors)
        .map(([file, count]) => ({ file, count }))
        .sort((a, b) => b.count - a.count);
    }
  }

  /**
   * 获取TS1005错误总数
   */
  getTS1005ErrorCount() {
    try {
      execSync('npx tsc --noEmit --maxNodeModuleJsDepth 0', { 
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: this.frontendPath
      });
      return 0;
    } catch (error) {
      const errorOutput = error.stdout || error.stderr || '';
      const ts1005Errors = (errorOutput.match(/error TS1005/g) || []).length;
      return ts1005Errors;
    }
  }

  /**
   * 修复文件中的TS1005错误
   */
  async fixTS1005InFile(relativePath) {
    const filePath = path.join(this.frontendPath, relativePath);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ 文件不存在: ${relativePath}`);
      return;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      let fixCount = 0;

      // TS1005错误通常是期望某个标记（如逗号、分号、括号等）
      // 应用专门的修复规则

      // 1. 修复缺少逗号的问题
      const commaFixes = [
        // 对象属性缺少逗号
        { from: /(\w+:\s*[^,}\n]+)\s*\n\s*(\w+:)/g, to: '$1,\n  $2' },
        // 数组元素缺少逗号
        { from: /([^,\[\n]+)\s*\n\s*([^,\]\n]+)/g, to: '$1,\n  $2' },
        // 函数参数缺少逗号
        { from: /(\w+:\s*[^,)]+)\s+(\w+:)/g, to: '$1, $2' }
      ];

      commaFixes.forEach(fix => {
        const before = content;
        content = content.replace(fix.from, fix.to);
        if (content !== before) {
          fixCount++;
          console.log(`  ✓ 修复缺少逗号`);
        }
      });

      // 2. 修复缺少分号的问题
      const semicolonFixes = [
        // 语句结尾缺少分号
        { from: /^(\s*[^{};\/\n]+[^{};\/\s])\s*$/gm, to: '$1;' },
        // import语句缺少分号
        { from: /^(\s*import\s+[^;]+)\s*$/gm, to: '$1;' },
        // export语句缺少分号
        { from: /^(\s*export\s+[^{;]+)\s*$/gm, to: '$1;' }
      ];

      semicolonFixes.forEach(fix => {
        const before = content;
        content = content.replace(fix.from, fix.to);
        if (content !== before) {
          fixCount++;
          console.log(`  ✓ 修复缺少分号`);
        }
      });

      // 3. 修复缺少括号的问题
      const bracketFixes = [
        // 函数调用缺少右括号
        { from: /(\w+\([^)]*)\s*$/gm, to: '$1)' },
        // 数组缺少右括号
        { from: /(\[[^\]]*)\s*$/gm, to: '$1]' },
        // 对象缺少右括号
        { from: /(\{[^}]*)\s*$/gm, to: '$1}' }
      ];

      bracketFixes.forEach(fix => {
        const before = content;
        content = content.replace(fix.from, fix.to);
        if (content !== before) {
          fixCount++;
          console.log(`  ✓ 修复缺少括号`);
        }
      });

      // 4. 修复字符串引号问题
      const quoteFixes = [
        // 未闭合的单引号
        { from: /([^\\])'([^']*)\s*$/gm, to: "$1'$2'" },
        // 未闭合的双引号
        { from: /([^\\])"([^"]*)\s*$/gm, to: '$1"$2"' },
        // 未闭合的模板字符串
        { from: /([^\\])`([^`]*)\s*$/gm, to: "$1`$2`" }
      ];

      quoteFixes.forEach(fix => {
        const before = content;
        content = content.replace(fix.from, fix.to);
        if (content !== before) {
          fixCount++;
          console.log(`  ✓ 修复字符串引号`);
        }
      });

      // 5. 修复JSX语法问题
      const jsxFixes = [
        // JSX标签缺少闭合
        { from: /<(\w+)([^>]*)\s*$/gm, to: '<$1$2>' },
        // JSX属性缺少引号
        { from: /(\w+)=([^"\s>]+)(\s|>)/g, to: '$1="$2"$3' }
      ];

      jsxFixes.forEach(fix => {
        const before = content;
        content = content.replace(fix.from, fix.to);
        if (content !== before) {
          fixCount++;
          console.log(`  ✓ 修复JSX语法`);
        }
      });

      // 6. 特殊处理：逐行检查常见的TS1005问题
      const lines = content.split('\n');
      const fixedLines = [];
      let lineFixCount = 0;

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const originalLine = line;

        // 检查行尾是否缺少必要的标记
        const trimmed = line.trim();
        
        // 如果是对象属性但没有逗号或分号结尾
        if (trimmed.match(/^\s*\w+:\s*[^,;{}]+$/) && i < lines.length - 1) {
          const nextLine = lines[i + 1].trim();
          if (nextLine.match(/^\w+:/) || nextLine === '}') {
            line = line + ',';
            lineFixCount++;
          }
        }

        // 如果是import/export语句但没有分号
        if (trimmed.match(/^(import|export)\s+/) && !trimmed.endsWith(';') && !trimmed.includes('{')) {
          line = line + ';';
          lineFixCount++;
        }

        // 如果是函数调用但括号不匹配
        const openParens = (line.match(/\(/g) || []).length;
        const closeParens = (line.match(/\)/g) || []).length;
        if (openParens > closeParens && trimmed.endsWith('(')) {
          // 简单情况：只是缺少右括号
          line = line + ')';
          lineFixCount++;
        }

        if (line !== originalLine) {
          console.log(`  ✓ 修复第${i + 1}行: ${originalLine.trim().substring(0, 30)}...`);
        }

        fixedLines.push(line);
      }

      content = fixedLines.join('\n');
      fixCount += lineFixCount;

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        this.fixes.push({
          file: relativePath,
          fixCount,
          timestamp: new Date().toISOString()
        });
        console.log(`  ✅ 文件修复完成，应用了${fixCount}个修复`);
      } else {
        console.log(`  ℹ️ 文件无需修复`);
      }

    } catch (error) {
      console.error(`❌ 修复文件失败 ${relativePath}:`, error.message);
    }
  }
}

if (require.main === module) {
  const fixer = new TS1005ErrorFixer();
  fixer.execute().catch(console.error);
}

module.exports = { TS1005ErrorFixer };
