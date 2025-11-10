#!/usr/bin/env node
/**
 * TypeScript 错误批量修复脚本
 * 用于自动修复常见的 TypeScript 严格模式错误
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取所有 TypeScript 错误
function getTypeScriptErrors() {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe', encoding: 'utf-8' });
    return [];
  } catch (error) {
    return error.stdout.toString();
  }
}

// 修复未使用的变量（添加下划线前缀）
function fixUnusedVariables(filePath, lineNumber, varName) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  if (lineNumber > 0 && lineNumber <= lines.length) {
    const line = lines[lineNumber - 1];
    // 为未使用的变量添加下划线前缀
    const newLine = line.replace(new RegExp(`\\b${varName}\\b`), `_${varName}`);
    lines[lineNumber - 1] = newLine;
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    console.log(`✓ Fixed unused variable: ${varName} in ${filePath}:${lineNumber}`);
    return true;
  }
  
  return false;
}

// 移除未使用的导入
function removeUnusedImport(filePath, lineNumber) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  if (lineNumber > 0 && lineNumber <= lines.length) {
    const line = lines[lineNumber - 1];
    
    // 检查是否是整行导入未使用
    if (line.trim().startsWith('import') && !line.includes('{')) {
      // 完整导入行未使用，删除整行
      lines.splice(lineNumber - 1, 1);
      fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
      console.log(`✓ Removed unused import line in ${filePath}:${lineNumber}`);
      return true;
    }
  }
  
  return false;
}

// 主函数
function main() {
  console.log('🔍 Analyzing TypeScript errors...\n');
  
  const errors = getTypeScriptErrors();
  
  if (!errors || errors.length === 0) {
    console.log('✅ No TypeScript errors found!');
    return;
  }
  
  console.log(`Found TypeScript errors. Processing...\n`);
  
  // 解析错误
  const errorPattern = /(.+?):(\d+):(\d+) - error (TS\d+): '(.+?)' is declared but (?:its value is )?never (?:read|used)/g;
  
  let match;
  let fixCount = 0;
  
  while ((match = errorPattern.exec(errors)) !== null) {
    const [, filePath, lineNumber, , errorCode, varName] = match;
    
    if (errorCode === 'TS6133' || errorCode === 'TS6192' || errorCode === 'TS6196') {
      // 尝试修复
      const fixed = fixUnusedVariables(filePath, parseInt(lineNumber), varName);
      if (fixed) fixCount++;
    }
  }
  
  console.log(`\n✅ Fixed ${fixCount} errors`);
  console.log('\nRun "npx tsc --noEmit" again to check remaining errors.');
}

main();

