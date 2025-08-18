const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 修复字符串字面量问题
 */
class StringLiteralsFixer {
  constructor() {
    this.frontendPath = path.join(process.cwd(), 'frontend');
    this.fixedFiles = [];
  }

  /**
   * 执行修复
   */
  async execute() {
    console.log('🔧 修复字符串字面量问题...\n');

    try {
      const initialErrors = this.getErrorCount();
      console.log('📊 初始错误数量:', initialErrors);

      // 获取有TS1002错误的文件
      const problematicFiles = this.getTS1002ErrorFiles();
      console.log('📁 发现', problematicFiles.length, '个有未终止字符串错误的文件');

      let totalFixedLines = 0;

      for (const fileInfo of problematicFiles.slice(0, 100)) { // 限制处理文件数量
        const fixedLines = await this.fixFileStringLiterals(fileInfo.file);
        if (fixedLines > 0) {
          totalFixedLines += fixedLines;
          const relativePath = path.relative(this.frontendPath, fileInfo.file);
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

      if (reduction > 5000) {
        console.log('🎉 巨大改善！减少了超过5000个错误');
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
   * 获取有TS1002错误的文件
   */
  getTS1002ErrorFiles() {
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
        if (line.includes('error TS1002')) {
          const match = line.match(/^([^(]+)\(\d+,\d+\): error TS1002/);
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
   * 修复单个文件的字符串字面量问题
   */
  async fixFileStringLiterals(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const fixedLines = [];
      let fixedCount = 0;

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const originalLine = line;

        // 修复字符串字面量问题
        line = this.fixStringLiteralInLine(line);

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
   * 修复单行的字符串字面量问题
   */
  fixStringLiteralInLine(line) {
    // 1. 修复import语句缺少结尾引号
    if (line.trim().startsWith('import') && !line.includes(';')) {
      // 检查是否缺少结尾引号
      if (line.includes("from 'react") && !line.includes("from 'react'")) {
        line = line.replace("from 'react", "from 'react'");
      }
      if (line.includes('from "react') && !line.includes('from "react"')) {
        line = line.replace('from "react', 'from "react"');
      }
      if (line.includes("from 'react-router-dom") && !line.includes("from 'react-router-dom'")) {
        line = line.replace("from 'react-router-dom", "from 'react-router-dom'");
      }
      if (line.includes("from 'antd") && !line.includes("from 'antd'")) {
        line = line.replace("from 'antd", "from 'antd'");
      }
      if (line.includes("from './") && !line.endsWith("';")) {
        line = line.replace(/from '\.\/([^']*)\s*$/, "from './$1';");
      }
      if (line.includes('from "./') && !line.endsWith('";')) {
        line = line.replace(/from "\.\/([^"]*)\s*$/, 'from "./$1";');
      }
      
      // 添加分号
      if (!line.endsWith(';')) {
        line = line + ';';
      }
    }

    // 2. 修复export语句
    if (line.trim().startsWith('export default') && !line.includes(';')) {
      line = line + ';';
    }

    // 3. 修复字符串字面量
    const trimmed = line.trim();
    
    // 检查是否是未完成的字符串
    if (trimmed.includes("'") || trimmed.includes('"') || trimmed.includes('`')) {
      // 修复单引号字符串
      if (trimmed.match(/^[^']*'[^']*$/)) {
        line = line + "'";
      }
      
      // 修复双引号字符串
      if (trimmed.match(/^[^"]*"[^"]*$/)) {
        line = line + '"';
      }
      
      // 修复模板字符串
      if (trimmed.match(/^[^`]*`[^`]*$/)) {
        line = line + '`';
      }
    }

    // 4. 修复常见的字符串模式
    
    // 修复console.log语句
    if (line.includes('console.log(') && !line.includes(');')) {
      if (line.includes("'") && !line.includes("');")) {
        line = line.replace(/console\.log\('([^']*)\s*$/, "console.log('$1');");
      }
      if (line.includes('"') && !line.includes('");')) {
        line = line.replace(/console\.log\("([^"]*)\s*$/, 'console.log("$1");');
      }
    }

    // 修复className属性
    if (line.includes('className=') && !line.includes('>')) {
      if (line.includes("className='") && !line.includes("'>")) {
        line = line.replace(/className='([^']*)\s*$/, "className='$1'>");
      }
      if (line.includes('className="') && !line.includes('">')) {
        line = line.replace(/className="([^"]*)\s*$/, 'className="$1">');
      }
    }

    // 修复JSX标签
    if (line.includes('<') && !line.includes('>') && !line.includes('</')) {
      line = line + '>';
    }

    // 5. 修复特殊情况
    
    // 移除多余的引号组合
    line = line.replace(/'"$/, '"');
    line = line.replace(/"'$/, "'");
    line = line.replace(/';'$/, ';');
    line = line.replace(/";'$/, ';');

    return line;
  }
}

if (require.main === module) {
  const fixer = new StringLiteralsFixer();
  fixer.execute().catch(console.error);
}

module.exports = { StringLiteralsFixer };
