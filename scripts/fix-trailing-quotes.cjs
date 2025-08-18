const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 修复行尾多余引号的问题
 */
class TrailingQuotesFixer {
  constructor() {
    this.frontendPath = path.join(process.cwd(), 'frontend');
    this.fixedFiles = [];
  }

  /**
   * 执行修复
   */
  async execute() {
    console.log('🔧 修复行尾多余引号问题...\n');

    try {
      const initialErrors = this.getErrorCount();
      console.log('📊 初始错误数量:', initialErrors);

      // 获取所有TypeScript文件
      const files = this.getAllTypeScriptFiles();
      console.log('📁 发现', files.length, '个TypeScript文件');

      let totalFixedLines = 0;

      for (const file of files) {
        const fixedLines = await this.fixFileTrailingQuotes(file);
        if (fixedLines > 0) {
          totalFixedLines += fixedLines;
          const relativePath = path.relative(this.frontendPath, file);
          this.fixedFiles.push(relativePath);
        }
      }

      const finalErrors = this.getErrorCount();
      const reduction = initialErrors - finalErrors;

      console.log('\n📊 修复结果:');
      console.log(`  初始错误: ${initialErrors}`);
      console.log(`  最终错误: ${finalErrors}`);
      console.log(`  减少错误: ${reduction}`);
      console.log(`  修复文件: ${this.fixedFiles.length}`);
      console.log(`  修复行数: ${totalFixedLines}`);

      if (reduction > 10000) {
        console.log('🎉 巨大改善！减少了超过10000个错误');
      } else if (reduction > 1000) {
        console.log('🎉 显著改善！减少了超过1000个错误');
      } else if (reduction > 100) {
        console.log('✅ 良好改善！减少了超过100个错误');
      } else if (reduction > 0) {
        console.log('👍 有所改善！');
      }

    } catch (error) {
      console.error('❌ 修复失败:', error);
    }
  }

  /**
   * 获取错误数量
   */
  getErrorCount() {
    try {
      execSync('npx tsc --noEmit --maxNodeModuleJsDepth 0', {
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: this.frontendPath
      });
      return 0;
    } catch (error) {
      const errorOutput = error.stdout || error.stderr || '';
      return (errorOutput.match(/error TS/g) || []).length;
    }
  }

  /**
   * 修复单个文件的行尾引号问题
   */
  async fixFileTrailingQuotes(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const fixedLines = [];
      let fixedCount = 0;

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const originalLine = line;

        // 修复各种行尾多余引号的模式
        line = this.fixLineTrailingQuotes(line);

        if (line !== originalLine) {
          fixedCount++;
        }

        fixedLines.push(line);
      }

      if (fixedCount > 0) {
        const fixedContent = fixedLines.join('\n');
        fs.writeFileSync(filePath, fixedContent);

        const relativePath = path.relative(this.frontendPath, filePath);
        console.log(`  ✓ 修复 ${relativePath}: ${fixedCount} 行`);
      }

      return fixedCount;

    } catch (error) {
      console.error(`  ❌ 修复失败 ${filePath}:`, error.message);
      return 0;
    }
  }

  /**
   * 修复单行的行尾引号问题
   */
  fixLineTrailingQuotes(line) {
    // 1. 修复行尾的 ';' 模式
    line = line.replace(/';'$/g, ';');

    // 2. 修复行尾的 ';"' 模式
    line = line.replace(/';'"$/g, ';');

    // 3. 修复行尾的 '"' 模式 (但保留字符串内的引号)
    line = line.replace(/'"$/g, '"');

    // 4. 修复行尾的 '" 模式
    line = line.replace(/'"$/g, "'");

    // 5. 修复行尾的 ';' 模式
    line = line.replace(/';$/g, "'");

    // 6. 修复行尾的 ,"' 模式
    line = line.replace(/,"'$/g, ',');

    // 7. 修复行尾的 }"' 模式
    line = line.replace(/}"'$/g, '}');

    // 8. 修复行尾的 ]"' 模式
    line = line.replace(/]"'$/g, ']');

    // 9. 修复行尾的 )"' 模式
    line = line.replace(/\)"'$/g, ')');

    // 10. 修复行尾的 >"' 模式
    line = line.replace(/>"'$/g, '>');

    // 11. 修复行尾的多余单引号（但不是字符串的一部分）
    if (line.endsWith("'") && !this.isValidStringEnding(line)) {
      line = line.slice(0, -1);
    }

    // 12. 修复行尾的多余双引号（但不是字符串的一部分）
    if (line.endsWith('"') && !this.isValidStringEnding(line)) {
      line = line.slice(0, -1);
    }

    return line;
  }

  /**
   * 检查行尾的引号是否是有效的字符串结尾
   */
  isValidStringEnding(line) {
    // 简单的启发式检查：如果行中包含等号、冒号或其他赋值操作符，
    // 且引号前有内容，则可能是有效的字符串
    const hasAssignment = /[:=]/.test(line);
    const hasContent = line.trim().length > 1;

    if (!hasAssignment || !hasContent) {
      return false;
    }

    // 检查引号是否配对
    const withoutLast = line.slice(0, -1);
    const singleQuotes = (withoutLast.match(/'/g) || []).length;
    const doubleQuotes = (withoutLast.match(/"/g) || []).length;

    // 如果去掉最后一个引号后，引号数量是奇数，说明最后的引号是配对的
    if (line.endsWith("'")) {
      return singleQuotes % 2 === 1;
    }
    if (line.endsWith('"')) {
      return doubleQuotes % 2 === 1;
    }

    return false;
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
          } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
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
  const fixer = new TrailingQuotesFixer();
  fixer.execute().catch(console.error);
}

module.exports = { TrailingQuotesFixer };
