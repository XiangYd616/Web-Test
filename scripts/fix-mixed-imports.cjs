/**
 * 修复混合导入语法错误
 * 将 "import React, type { FC } from 'react';" 这样的错误语法
 * 修复为正确的分离导入语法
 */

const fs = require('fs');
const path = require('path');

class MixedImportsFixer {
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
    console.log('🔧 开始修复混合导入语法错误...\n');
    
    await this.scanAndFixFiles();
    this.generateReport();
    
    console.log(`\n✅ 修复完成！`);
    console.log(`   修复文件: ${this.fixedFiles.length} 个`);
    console.log(`   错误: ${this.errors.length} 个`);
  }

  /**
   * 扫描并修复文件
   */
  async scanAndFixFiles() {
    const files = this.getAllTSXFiles();
    
    for (const file of files) {
      try {
        await this.fixFileMixedImports(file);
      } catch (error) {
        this.errors.push({
          file: path.relative(this.projectRoot, file),
          error: error.message
        });
      }
    }
  }

  /**
   * 获取所有TSX文件
   */
  getAllTSXFiles() {
    const files = [];
    
    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDir(fullPath);
        } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts'))) {
          files.push(fullPath);
        }
      }
    };
    
    scanDir(this.frontendPath);
    return files;
  }

  /**
   * 修复文件中的混合导入
   */
  async fixFileMixedImports(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let hasChanges = false;
    const newLines = [];
    
    for (const line of lines) {
      if (this.isMixedReactImport(line)) {
        const fixedImports = this.fixMixedImport(line);
        newLines.push(...fixedImports);
        hasChanges = true;
      } else {
        newLines.push(line);
      }
    }
    
    if (hasChanges) {
      const newContent = newLines.join('\n');
      fs.writeFileSync(filePath, newContent, 'utf8');
      
      this.fixedFiles.push({
        file: path.relative(this.projectRoot, filePath),
        originalImport: lines.find(line => this.isMixedReactImport(line)),
        fixedImports: this.fixMixedImport(lines.find(line => this.isMixedReactImport(line)))
      });
    }
  }

  /**
   * 检查是否是混合React导入
   */
  isMixedReactImport(line) {
    const trimmed = line.trim();
    return trimmed.includes('import React, type {') && 
           trimmed.includes("from 'react'");
  }

  /**
   * 修复混合导入
   */
  fixMixedImport(line) {
    const trimmed = line.trim();
    
    // 提取类型导入部分
    const typeMatch = trimmed.match(/import React, type\s*{([^}]+)}\s*from\s*['"]react['"];?/);
    
    if (typeMatch) {
      const types = typeMatch[1].trim();
      return [
        "import React from 'react';",
        `import type { ${types} } from 'react';`
      ];
    }
    
    return [line];
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    console.log('\n📊 混合导入语法修复报告:');
    console.log('============================================================\n');
    
    if (this.fixedFiles.length > 0) {
      console.log('✅ 成功修复的文件:\n');
      
      this.fixedFiles.forEach((fix, index) => {
        console.log(`  ${index + 1}. 📁 ${fix.file}`);
        console.log(`     原导入: ${fix.originalImport}`);
        console.log(`     修复为:`);
        fix.fixedImports.forEach(imp => {
          console.log(`       ${imp}`);
        });
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
    console.log(`  ✅ 修复了混合导入语法错误`);
    console.log(`  ✅ 提高了代码兼容性`);
    console.log(`  ✅ 确保构建正常进行`);
    
    console.log('\n💡 建议:');
    console.log('  1. 运行 npm run build 验证修复效果');
    console.log('  2. 运行 npm run type-check 检查类型');
    console.log('  3. 测试应用功能确保正常工作');
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new MixedImportsFixer();
  fixer.fix().catch(console.error);
}

module.exports = MixedImportsFixer;
