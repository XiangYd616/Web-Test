#!/usr/bin/env node

/**
 * TypeScript语法错误批量修复脚本
 * 专门处理Test-Web项目中的常见语法错误
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 常见语法错误修复规则
const SYNTAX_FIXES = [
  // 1. 修复未终止的字符串字面量 (最常见)
  {
    name: '修复未终止的单引号字符串',
    pattern: /([^\\])'([^']*);/g,
    replacement: "$1'$2';"
  },
  {
    name: '修复未终止的双引号字符串',
    pattern: /([^\\])"([^"]*);/g,
    replacement: '$1"$2";'
  },
  {
    name: '修复未终止的模板字符串',
    pattern: /([^\\])`([^`]*);/g,
    replacement: "$1`$2`;"
  },
  
  // 2. 修复return语句中的引号问题
  {
    name: '修复return语句中的单引号',
    pattern: /return\s+'([^']*);/g,
    replacement: "return '$1';"
  },
  {
    name: '修复return语句中的双引号',
    pattern: /return\s+"([^"]*);/g,
    replacement: 'return "$1";'
  },
  {
    name: '修复return语句中的模板字符串',
    pattern: /return\s+`([^`]*);/g,
    replacement: "return `$1`;"
  },
  
  // 3. 修复JSX属性中的引号问题
  {
    name: '修复className属性',
    pattern: /className=['"]([^'"]*);/g,
    replacement: 'className="$1"'
  },
  {
    name: '修复其他JSX属性',
    pattern: /(\w+)=['"]([^'"]*);/g,
    replacement: '$1="$2"'
  },
  
  // 4. 修复对象属性中的引号问题
  {
    name: '修复对象属性值',
    pattern: /:\s*['"]([^'"]*);/g,
    replacement: ': "$1"'
  },
  
  // 5. 修复数组元素中的引号问题
  {
    name: '修复数组字符串元素',
    pattern: /\[['"]([^'"]*);/g,
    replacement: '["$1"]'
  },
  
  // 6. 修复console语句
  {
    name: '修复console.log',
    pattern: /console\.log\(['"]([^'"]*)\);/g,
    replacement: 'console.log("$1");'
  },
  {
    name: '修复console.error',
    pattern: /console\.error\(['"]([^'"]*)\);/g,
    replacement: 'console.error("$1");'
  },
  
  // 7. 修复switch case语句
  {
    name: '修复case语句',
    pattern: /case\s+['"]([^'"]*)\s*:\s*'/g,
    replacement: 'case "$1":'
  }
];

/**
 * 修复单个文件
 */
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    let fixCount = 0;
    
    console.log(`正在修复: ${path.relative(process.cwd(), filePath)}`);
    
    // 应用简单修复规则
    SYNTAX_FIXES.forEach(fix => {
      const originalContent = content;
      content = content.replace(fix.pattern, fix.replacement);
      if (content !== originalContent) {
        hasChanges = true;
        fixCount++;
        console.log(`  ✓ ${fix.name}`);
      }
    });
    
    // 特殊修复：处理常见的语法模式
    const specialFixes = [
      // 修复未闭合的字符串后跟分号
      { from: /([^\\])'([^']*);([^'])/g, to: "$1'$2';$3" },
      { from: /([^\\])"([^"]*);([^"])/g, to: '$1"$2";$3' },
      { from: /([^\\])`([^`]*);([^`])/g, to: "$1`$2`;$3" },
      
      // 修复JSX标签中的引号问题
      { from: /className='([^']*)'>/g, to: 'className="$1">' },
      { from: /className="([^"]*)">/g, to: 'className="$1">' },
      
      // 修复对象字面量中的引号问题
      { from: /{\s*([^:]+):\s*'([^']*);/g, to: '{ $1: "$2"' },
      { from: /{\s*([^:]+):\s*"([^"]*);/g, to: '{ $1: "$2"' }
    ];
    
    specialFixes.forEach(fix => {
      const originalContent = content;
      content = content.replace(fix.from, fix.to);
      if (content !== originalContent) {
        hasChanges = true;
        fixCount++;
      }
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ 已修复 ${fixCount} 个问题`);
      return fixCount;
    } else {
      console.log(`  ⏭️  无需修复`);
      return 0;
    }
    
  } catch (error) {
    console.error(`  ❌ 修复失败: ${error.message}`);
    return 0;
  }
}

/**
 * 获取所有TypeScript文件
 */
function getTypeScriptFiles(directory) {
  const files = [];
  
  function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // 跳过node_modules等目录
        if (!['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
          scanDirectory(fullPath);
        }
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        // 跳过类型定义文件
        if (!entry.name.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    }
  }
  
  scanDirectory(directory);
  return files;
}

/**
 * 运行TypeScript检查
 */
function runTypeScriptCheck() {
  try {
    console.log('\n🔍 运行TypeScript检查...');
    const output = execSync('npx tsc --noEmit --maxNodeModuleJsDepth 0', { 
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: path.join(process.cwd(), 'frontend')
    });
    console.log('✅ TypeScript检查通过！');
    return 0;
  } catch (error) {
    const errorOutput = error.stdout || error.stderr || '';
    const errorCount = (errorOutput.match(/error TS/g) || []).length;
    console.log(`❌ 发现 ${errorCount} 个TypeScript错误`);
    return errorCount;
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🔧 开始批量修复TypeScript语法错误...\n');
  
  const startTime = Date.now();
  const frontendDir = path.join(process.cwd(), 'frontend');
  
  // 检查目录是否存在
  if (!fs.existsSync(frontendDir)) {
    console.error('❌ frontend目录不存在');
    process.exit(1);
  }
  
  // 运行初始检查
  const initialErrors = runTypeScriptCheck();
  console.log(`\n📊 初始错误数量: ${initialErrors}`);
  
  // 获取所有TypeScript文件
  const files = getTypeScriptFiles(frontendDir);
  console.log(`\n📁 找到 ${files.length} 个TypeScript文件`);
  
  // 修复文件
  let totalFixes = 0;
  let fixedFiles = 0;
  
  files.forEach(file => {
    const fixes = fixFile(file);
    if (fixes > 0) {
      totalFixes += fixes;
      fixedFiles++;
    }
  });
  
  // 运行最终检查
  console.log('\n🔍 运行最终TypeScript检查...');
  const finalErrors = runTypeScriptCheck();
  
  // 显示结果
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const errorReduction = initialErrors - finalErrors;
  const reductionPercentage = initialErrors > 0 ? ((errorReduction / initialErrors) * 100).toFixed(1) : 0;
  
  console.log('\n📊 修复结果:');
  console.log(`  修复文件数: ${fixedFiles}/${files.length}`);
  console.log(`  总修复数: ${totalFixes}`);
  console.log(`  初始错误: ${initialErrors}`);
  console.log(`  最终错误: ${finalErrors}`);
  console.log(`  减少错误: ${errorReduction} (${reductionPercentage}%)`);
  console.log(`  用时: ${duration}秒`);
  
  if (finalErrors === 0) {
    console.log('\n🎉 所有TypeScript错误已修复！');
  } else if (errorReduction > 0) {
    console.log('\n✅ 部分错误已修复，建议继续手动修复剩余问题');
  } else {
    console.log('\n⚠️  未能自动修复错误，需要手动处理');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, getTypeScriptFiles, runTypeScriptCheck };
