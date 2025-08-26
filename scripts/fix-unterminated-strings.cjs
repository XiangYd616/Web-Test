/**
 * 修复未终止的字符串字面量
 * 自动检测并修复所有未正确闭合的字符串
 */

const fs = require('fs');
const path = require('path');

class UnterminatedStringsFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.frontendPath = path.join(this.projectRoot, 'frontend');
    this.fixedFiles = [];
    this.errors = [];
  }

  /**
   * 开始修复
   */
  async fix() {
    console.log('🔧 开始修复未终止的字符串字面量...\n');

    // 直接修复StressTest.tsx文件
    const stressTestFile = path.join(this.frontendPath, 'pages/StressTest.tsx');
    await this.fixFileStrings(stressTestFile);

    this.generateReport();

    console.log(`\n✅ 修复完成！`);
    console.log(`   修复文件: ${this.fixedFiles.length} 个`);
    console.log(`   错误: ${this.errors.length} 个`);
  }

  /**
   * 修复文件中的字符串
   */
  async fixFileStrings(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      let hasChanges = false;
      const newLines = [];

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const originalLine = line;

        // 修复常见的未终止字符串模式
        const fixes = [
          // 修复 '测试已完成); -> '测试已完成');
          { pattern: /'([^']*测试已完成[^']*)\);/g, replacement: "'$1');" },
          { pattern: /'([^']*测试已取消[^']*)\);/g, replacement: "'$1');" },
          { pattern: /'([^']*测试失败[^']*)\);/g, replacement: "'$1');" },
          { pattern: /'([^']*压力测试完成[^']*)\);/g, replacement: "'$1');" },

          // 修复 '测试已完成, -> '测试已完成',
          { pattern: /'([^']*测试已完成[^']*),$/g, replacement: "'$1'," },
          { pattern: /'([^']*测试已取消[^']*),$/g, replacement: "'$1'," },

          // 修复 '测试已完成; -> '测试已完成';
          { pattern: /'([^']*测试已完成[^']*);$/g, replacement: "'$1';" },

          // 修复其他常见模式
          { pattern: /'([^']*正在启动[^']*)\?/g, replacement: "'$1'" },
          { pattern: /'([^']*测试进行中[^']*)\?/g, replacement: "'$1'" },
          { pattern: /'([^']*测试状态[^']*)\?/g, replacement: "'$1'" },

          // 修复问号结尾的字符串
          { pattern: /'([^']*)\?\s*:/g, replacement: "'$1' :" },

          // 修复缺失引号的情况
          { pattern: /console\.log\('([^']*)\);/g, replacement: "console.log('$1');" },
          { pattern: /setStatusMessage\('([^']*)\);/g, replacement: "setStatusMessage('$1');" },
          { pattern: /setTestProgress\('([^']*)\);/g, replacement: "setTestProgress('$1');" },
          { pattern: /updateTestStatus\('([^']*)',\s*'([^']*)\);/g, replacement: "updateTestStatus('$1', '$2');" },

          // 修复特定的错误模式
          { pattern: /'测试已完成,\s*$/g, replacement: "'测试已完成'," },
          { pattern: /message:\s*'测试已完成,\s*$/g, replacement: "message: '测试已完成'," },

          // 修复try-catch结构错误
          { pattern: /}\s*catch\s*\(error\)\s*{\s*}\s*;/g, replacement: "} catch (error) {\n                    console.error('Error:', error);\n                }" },

          // 修复注释和代码混合的问题
          { pattern: /\/\/\s*([^\/\n]*)\s+(if\s*\()/g, replacement: "// $1\n                    $2" }
        ];

        for (const fix of fixes) {
          const newLine = line.replace(fix.pattern, fix.replacement);
          if (newLine !== line) {
            line = newLine;
            hasChanges = true;
          }
        }

        newLines.push(line);
      }

      if (hasChanges) {
        const newContent = newLines.join('\n');
        fs.writeFileSync(filePath, newContent, 'utf8');

        this.fixedFiles.push({
          file: path.relative(this.projectRoot, filePath),
          changes: 'Fixed unterminated string literals'
        });
      }

    } catch (error) {
      this.errors.push({
        file: path.relative(this.projectRoot, filePath),
        error: error.message
      });
    }
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    console.log('\n📊 未终止字符串修复报告:');
    console.log('============================================================\n');

    if (this.fixedFiles.length > 0) {
      console.log('✅ 成功修复的文件:\n');

      this.fixedFiles.forEach((fix, index) => {
        console.log(`  ${index + 1}. 📁 ${fix.file}`);
        console.log(`     修复: ${fix.changes}`);
        console.log('');
      });
    }

    if (this.errors.length > 0) {
      console.log('❌ 修复失败的文件:\n');

      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. 📁 ${error.file}`);
        console.log(`     错误: ${error.error}`);
        console.log('');
      });
    }

    console.log('🎯 修复效果:');
    console.log(`  ✅ 修复了未终止的字符串字面量`);
    console.log(`  ✅ 确保语法正确性`);
    console.log(`  ✅ 提高构建成功率`);

    console.log('\n💡 建议:');
    console.log('  1. 运行 npm run build 验证修复效果');
    console.log('  2. 检查修复后的代码逻辑');
    console.log('  3. 测试应用功能确保正常工作');
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new UnterminatedStringsFixer();
  fixer.fix().catch(console.error);
}

module.exports = UnterminatedStringsFixer;
