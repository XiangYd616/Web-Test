const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 修复JSX结构错误
 */
class JSXErrorsFixer {
  constructor() {
    this.frontendPath = path.join(process.cwd(), 'frontend');
    this.fixedFiles = [];
  }

  /**
   * 执行修复
   */
  async execute() {
    console.log('🔧 修复JSX结构错误...\n');

    try {
      const initialErrors = this.getJSXErrorCount();
      console.log('📊 初始JSX错误数量:', initialErrors);

      // 获取有JSX错误的文件
      const problematicFiles = this.getJSXErrorFiles();
      console.log('📁 发现', problematicFiles.length, '个有JSX错误的文件');

      let totalFixedLines = 0;

      for (const fileInfo of problematicFiles) {
        const fixedLines = await this.fixFileJSXErrors(fileInfo.file);
        if (fixedLines > 0) {
          totalFixedLines += fixedLines;
          const relativePath = path.relative(this.frontendPath, fileInfo.file);
          this.fixedFiles.push(relativePath);
        }
      }

      const finalErrors = this.getJSXErrorCount();
      const reduction = initialErrors - finalErrors;
      
      console.log('\n📊 修复结果:');
      console.log(`  初始JSX错误: ${initialErrors}`);
      console.log(`  最终JSX错误: ${finalErrors}`);
      console.log(`  减少错误: ${reduction}`);
      console.log(`  修复文件: ${this.fixedFiles.length}`);
      console.log(`  修复行数: ${totalFixedLines}`);

      if (reduction > 20) {
        console.log('🎉 显著改善！减少了超过20个JSX错误');
      } else if (reduction > 10) {
        console.log('✅ 良好改善！减少了超过10个JSX错误');
      } else if (reduction > 0) {
        console.log('👍 有所改善！');
      }

    } catch (error) {
      console.error('❌ 修复失败:', error);
    }
  }

  /**
   * 获取JSX错误数量
   */
  getJSXErrorCount() {
    try {
      execSync('npx tsc --project tsconfig.safe.json --noEmit', { 
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: this.frontendPath
      });
      return 0;
    } catch (error) {
      const errorOutput = error.stdout || error.stderr || '';
      return (errorOutput.match(/error TS2657/g) || []).length;
    }
  }

  /**
   * 获取有JSX错误的文件
   */
  getJSXErrorFiles() {
    try {
      const output = execSync('npx tsc --project tsconfig.safe.json --noEmit', { 
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
        if (line.includes('error TS2657')) {
          const match = line.match(/^([^(]+)\(\d+,\d+\): error TS2657/);
          if (match) {
            const file = path.join(this.frontendPath, match[1].trim());
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
   * 修复单个文件的JSX错误
   */
  async fixFileJSXErrors(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const fixedLines = [];
      let fixedCount = 0;

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const originalLine = line;

        // 修复JSX问题
        line = this.fixJSXInLine(line);

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
   * 修复单行的JSX问题
   */
  fixJSXInLine(line) {
    // 1. 修复className属性的格式
    line = line.replace(/className=\s*'/g, "className='");
    line = line.replace(/className=\s*"/g, 'className="');
    
    // 2. 修复JSX标签末尾的分号
    line = line.replace(/>;$/g, '>');
    line = line.replace(/>\s*;$/g, '>');
    
    // 3. 修复自闭合标签
    line = line.replace(/\s+\/>\s*;/g, ' />');
    line = line.replace(/\/>\s*;$/g, ' />');
    
    // 4. 修复标签属性
    line = line.replace(/=\s*'/g, "='");
    line = line.replace(/=\s*"/g, '="');
    
    // 5. 修复button标签
    line = line.replace(/<button;/g, '<button');
    line = line.replace(/<button\s*;/g, '<button');
    
    // 6. 修复div标签
    line = line.replace(/<div;/g, '<div');
    line = line.replace(/<div\s*;/g, '<div');
    
    // 7. 修复其他常见标签
    line = line.replace(/<(\w+);/g, '<$1');
    line = line.replace(/<(\w+)\s*;/g, '<$1');
    
    // 8. 修复空的JSX表达式
    line = line.replace(/{\s*\(\s*''\s*\)\s*}/g, '');
    line = line.replace(/{\s*\(\s*""\s*\)\s*}/g, '');
    
    // 9. 修复React Fragment
    line = line.replace(/<>\s*;/g, '<>');
    line = line.replace(/<\/>\s*;/g, '</>');
    
    // 10. 修复条件渲染
    line = line.replace(/&&\s*\(\s*''\s*\)/g, '');
    line = line.replace(/&&\s*\(\s*""\s*\)/g, '');

    return line;
  }
}

if (require.main === module) {
  const fixer = new JSXErrorsFixer();
  fixer.execute().catch(console.error);
}

module.exports = { JSXErrorsFixer };
