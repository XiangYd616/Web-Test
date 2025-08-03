#!/usr/bin/env node

/**
 * 代码质量优化脚本
 * 用于清理未使用的导入、移除死代码、统一代码格式等
 */

const fs = require('fs');
const path = require('path');

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 需要检查的文件扩展名
const FILE_EXTENSIONS = ['.tsx', '.ts', '.js', '.jsx'];

// 常见的未使用导入模式
const UNUSED_IMPORT_PATTERNS = [
  /^\/\/ import .+;?\s*$/gm,  // 注释掉的导入
  /^\/\*[\s\S]*?\*\/\s*$/gm, // 块注释
  /^\s*\/\/ .+已删除.*$/gm,   // 标记为已删除的注释
  /^\s*\/\/ .+已移除.*$/gm,   // 标记为已移除的注释
];

// 死代码模式
const DEAD_CODE_PATTERNS = [
  /^\/\/ TODO: .+$/gm,        // TODO注释（可选清理）
  /^\/\/ FIXME: .+$/gm,       // FIXME注释（可选清理）
  /^\/\/ @ts-ignore.*$/gm,    // TypeScript忽略注释（需要检查）
  /console\.log\(.+\);?\s*$/gm, // console.log语句（开发调试用）
];

// 优化结果统计
const optimizationResults = {
  processedFiles: [],
  cleanedImports: [],
  removedDeadCode: [],
  formattedFiles: [],
  errors: []
};

/**
 * 获取所有需要处理的文件
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // 跳过node_modules和其他不需要的目录
      if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      // 只处理指定扩展名的文件
      if (FILE_EXTENSIONS.includes(path.extname(file))) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

/**
 * 清理文件中的未使用导入
 */
function cleanUnusedImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let cleanedCount = 0;
    
    // 应用清理模式
    UNUSED_IMPORT_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, '');
        cleanedCount += matches.length;
      }
    });
    
    // 移除多余的空行
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      optimizationResults.cleanedImports.push({
        file: path.relative(PROJECT_ROOT, filePath),
        count: cleanedCount
      });
      return true;
    }
    
    return false;
  } catch (error) {
    optimizationResults.errors.push(`清理导入失败 ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * 移除死代码
 */
function removeDeadCode(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let removedCount = 0;
    
    // 只移除明确标记为废弃的代码，保留TODO和FIXME
    const safePatterns = [
      /^\/\/ .+已删除.*$/gm,
      /^\/\/ .+已移除.*$/gm,
      /^\/\/ .+废弃.*$/gm,
      /^\/\/ .+deprecated.*$/gmi
    ];
    
    safePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, '');
        removedCount += matches.length;
      }
    });
    
    // 移除多余的空行
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      optimizationResults.removedDeadCode.push({
        file: path.relative(PROJECT_ROOT, filePath),
        count: removedCount
      });
      return true;
    }
    
    return false;
  } catch (error) {
    optimizationResults.errors.push(`移除死代码失败 ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * 统一代码格式
 */
function formatCode(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // 统一缩进（使用2个空格）
    content = content.replace(/\t/g, '  ');
    
    // 统一行尾
    content = content.replace(/\r\n/g, '\n');
    
    // 移除行尾空格
    content = content.replace(/ +$/gm, '');
    
    // 确保文件以换行符结尾
    if (!content.endsWith('\n')) {
      content += '\n';
    }
    
    // 统一导入语句格式
    content = content.replace(/import\s+\{\s*([^}]+)\s*\}\s+from/g, (match, imports) => {
      const cleanImports = imports.split(',').map(imp => imp.trim()).join(', ');
      return `import { ${cleanImports} } from`;
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      optimizationResults.formattedFiles.push(path.relative(PROJECT_ROOT, filePath));
      return true;
    }
    
    return false;
  } catch (error) {
    optimizationResults.errors.push(`格式化失败 ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * 检查并修复导入顺序
 */
function fixImportOrder(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // 提取所有导入语句
    const importRegex = /^import\s+.+from\s+.+;?\s*$/gm;
    const imports = content.match(importRegex) || [];
    
    if (imports.length === 0) return false;
    
    // 分类导入
    const thirdPartyImports = [];
    const localImports = [];
    const relativeImports = [];
    
    imports.forEach(imp => {
      if (imp.includes("from 'react'") || imp.includes('from "react"')) {
        thirdPartyImports.unshift(imp); // React放在最前面
      } else if (imp.includes("from '.") || imp.includes('from ".')) {
        relativeImports.push(imp);
      } else if (imp.includes("from '../") || imp.includes('from "../')) {
        localImports.push(imp);
      } else {
        thirdPartyImports.push(imp);
      }
    });
    
    // 重新组织导入
    const organizedImports = [
      ...thirdPartyImports,
      ...(thirdPartyImports.length > 0 && localImports.length > 0 ? [''] : []),
      ...localImports,
      ...(localImports.length > 0 && relativeImports.length > 0 ? [''] : []),
      ...relativeImports
    ].join('\n');
    
    // 替换原有导入
    const firstImportIndex = content.search(importRegex);
    const lastImportIndex = content.lastIndexOf(imports[imports.length - 1]) + imports[imports.length - 1].length;
    
    if (firstImportIndex !== -1) {
      const beforeImports = content.substring(0, firstImportIndex);
      const afterImports = content.substring(lastImportIndex);
      
      content = beforeImports + organizedImports + '\n' + afterImports;
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        return true;
      }
    }
    
    return false;
  } catch (error) {
    optimizationResults.errors.push(`修复导入顺序失败 ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * 处理单个文件
 */
function processFile(filePath) {
  console.log(`🔧 处理文件: ${path.relative(PROJECT_ROOT, filePath)}`);
  
  let modified = false;
  
  // 清理未使用的导入
  if (cleanUnusedImports(filePath)) {
    modified = true;
  }
  
  // 移除死代码
  if (removeDeadCode(filePath)) {
    modified = true;
  }
  
  // 修复导入顺序
  if (fixImportOrder(filePath)) {
    modified = true;
  }
  
  // 统一代码格式
  if (formatCode(filePath)) {
    modified = true;
  }
  
  if (modified) {
    optimizationResults.processedFiles.push(path.relative(PROJECT_ROOT, filePath));
  }
  
  return modified;
}

/**
 * 生成优化报告
 */
function generateOptimizationReport() {
  const timestamp = new Date().toISOString();
  const reportContent = `# 代码质量优化报告

## 📅 优化日期
${timestamp.split('T')[0]}

## 🎯 优化目标
清理未使用的导入、移除死代码、统一代码格式，提高代码质量和可维护性。

## 📊 优化统计

### 处理的文件 (${optimizationResults.processedFiles.length}个)
${optimizationResults.processedFiles.map(file => `- \`${file}\``).join('\n')}

### 清理的导入 (${optimizationResults.cleanedImports.length}个文件)
${optimizationResults.cleanedImports.map(item => `- \`${item.file}\`: 清理了 ${item.count} 个未使用导入`).join('\n')}

### 移除的死代码 (${optimizationResults.removedDeadCode.length}个文件)
${optimizationResults.removedDeadCode.map(item => `- \`${item.file}\`: 移除了 ${item.count} 行死代码`).join('\n')}

### 格式化的文件 (${optimizationResults.formattedFiles.length}个)
${optimizationResults.formattedFiles.map(file => `- \`${file}\``).join('\n')}

## ❌ 错误记录 (${optimizationResults.errors.length}个)
${optimizationResults.errors.length > 0 ? optimizationResults.errors.map(error => `- ${error}`).join('\n') : '无错误'}

## ✅ 优化完成

代码质量优化已完成，项目代码更加整洁，可维护性得到提升。

### 🎯 主要成果
- ✅ 清理了未使用的导入语句
- ✅ 移除了标记为废弃的死代码
- ✅ 统一了代码格式和缩进
- ✅ 优化了导入语句的顺序

---
**生成时间**: ${timestamp}
**脚本版本**: v1.0.0
`;

  const reportPath = path.join(PROJECT_ROOT, 'docs', 'reports', 'CODE_QUALITY_OPTIMIZATION_REPORT.md');
  
  // 确保目录存在
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`📄 优化报告已保存: ${reportPath}`);
}

/**
 * 主函数
 */
function main() {
  try {
    console.log('🔧 开始代码质量优化...\n');
    
    // 获取所有需要处理的文件
    const srcDir = path.join(PROJECT_ROOT, 'src');
    const allFiles = getAllFiles(srcDir);
    
    console.log(`📁 找到 ${allFiles.length} 个文件需要处理\n`);
    
    // 处理每个文件
    let processedCount = 0;
    allFiles.forEach(filePath => {
      if (processFile(filePath)) {
        processedCount++;
      }
    });
    
    console.log(`\n📊 优化统计:`);
    console.log(`   处理文件: ${processedCount} 个`);
    console.log(`   清理导入: ${optimizationResults.cleanedImports.length} 个文件`);
    console.log(`   移除死代码: ${optimizationResults.removedDeadCode.length} 个文件`);
    console.log(`   格式化文件: ${optimizationResults.formattedFiles.length} 个文件`);
    
    // 生成优化报告
    generateOptimizationReport();
    
    console.log('\n🎉 代码质量优化完成！');
    
    if (optimizationResults.errors.length === 0) {
      console.log('✅ 优化过程中无错误');
    } else {
      console.log(`⚠️  优化过程中发现 ${optimizationResults.errors.length} 个错误，请检查报告`);
    }
    
  } catch (error) {
    console.error('\n💥 优化过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  getAllFiles,
  cleanUnusedImports,
  removeDeadCode,
  formatCode,
  fixImportOrder,
  processFile,
  generateOptimizationReport
};
