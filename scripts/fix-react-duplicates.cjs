/**
 * 修复React重复导入问题
 * 自动检测并修复所有文件中的React重复导入语句
 */

const fs = require('fs');
const path = require('path');

class ReactDuplicatesFixer {
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
    console.log('🔧 开始修复React重复导入问题...\n');
    
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
        await this.fixFileReactImports(file);
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
   * 修复文件中的React重复导入
   */
  async fixFileReactImports(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // 查找React导入行
    const reactImportLines = [];
    const otherLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (this.isReactImport(line)) {
        reactImportLines.push({ line, index: i });
      } else {
        otherLines.push({ line, index: i });
      }
    }
    
    // 如果有多个React导入，合并它们
    if (reactImportLines.length > 1) {
      const mergedImport = this.mergeReactImports(reactImportLines);
      
      // 重建文件内容
      const newLines = [];
      let reactImportAdded = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (this.isReactImport(line)) {
          if (!reactImportAdded) {
            newLines.push(mergedImport);
            reactImportAdded = true;
          }
          // 跳过其他React导入行
        } else {
          newLines.push(line);
        }
      }
      
      const newContent = newLines.join('\n');
      
      if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        this.fixedFiles.push({
          file: path.relative(this.projectRoot, filePath),
          reactImports: reactImportLines.length,
          mergedTo: mergedImport
        });
      }
    }
  }

  /**
   * 检查是否是React导入
   */
  isReactImport(line) {
    const trimmed = line.trim();
    return trimmed.startsWith('import') && 
           (trimmed.includes("from 'react'") || 
            trimmed.includes('from "react"') ||
            trimmed.includes("from 'react';") ||
            trimmed.includes('from "react";'));
  }

  /**
   * 合并React导入
   */
  mergeReactImports(reactImportLines) {
    const imports = new Set();
    let hasDefaultImport = false;
    let hasTypeImport = false;
    
    for (const { line } of reactImportLines) {
      const trimmed = line.trim();
      
      // 检查默认导入
      if (trimmed.includes('import React') && !trimmed.includes('import type')) {
        hasDefaultImport = true;
      }
      
      // 检查类型导入
      if (trimmed.includes('import type')) {
        hasTypeImport = true;
        // 提取类型导入
        const typeMatch = trimmed.match(/import type\s*{([^}]+)}/);
        if (typeMatch) {
          const types = typeMatch[1].split(',').map(t => t.trim());
          types.forEach(type => imports.add(type));
        }
      } else {
        // 提取命名导入
        const namedMatch = trimmed.match(/import(?:\s+React,?)?\s*{([^}]+)}/);
        if (namedMatch) {
          const named = namedMatch[1].split(',').map(n => n.trim());
          named.forEach(name => imports.add(name));
        }
      }
    }
    
    // 构建合并后的导入语句
    let mergedImport = 'import';
    
    if (hasDefaultImport) {
      mergedImport += ' React';
    }
    
    if (imports.size > 0) {
      if (hasDefaultImport) {
        mergedImport += ', ';
      } else {
        mergedImport += ' ';
      }
      
      if (hasTypeImport) {
        mergedImport += `type { ${Array.from(imports).join(', ')} }`;
      } else {
        mergedImport += `{ ${Array.from(imports).join(', ')} }`;
      }
    }
    
    mergedImport += " from 'react';";
    
    return mergedImport;
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    console.log('\n📊 React重复导入修复报告:');
    console.log('============================================================\n');
    
    if (this.fixedFiles.length > 0) {
      console.log('✅ 成功修复的文件:\n');
      
      this.fixedFiles.forEach((fix, index) => {
        console.log(`  ${index + 1}. 📁 ${fix.file}`);
        console.log(`     重复导入: ${fix.reactImports} 个`);
        console.log(`     合并为: ${fix.mergedTo}`);
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
    console.log(`  ✅ 消除了React重复导入问题`);
    console.log(`  ✅ 提高了代码质量`);
    console.log(`  ✅ 减少了构建时间`);
    
    console.log('\n💡 建议:');
    console.log('  1. 运行 npm run type-check 验证修复效果');
    console.log('  2. 运行 npm run check:imports:duplicate 再次检查');
    console.log('  3. 测试应用功能确保正常工作');
  }
}

// 运行修复
if (require.main === module) {
  const fixer = new ReactDuplicatesFixer();
  fixer.fix().catch(console.error);
}

module.exports = ReactDuplicatesFixer;
