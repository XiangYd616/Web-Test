const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 修复未终止的字符串字面量
 */
function fixUnterminatedStrings() {
  console.log('🔧 开始修复未终止的字符串字面量...\n');
  
  const startTime = Date.now();
  const frontendDir = path.join(process.cwd(), 'frontend');
  
  // 检查目录是否存在
  if (!fs.existsSync(frontendDir)) {
    console.error('❌ frontend目录不存在');
    process.exit(1);
  }
  
  // 运行初始检查
  const initialErrors = runTypeScriptCheck();
  console.log(`📊 初始错误数量: ${initialErrors}\n`);
  
  // 获取所有TypeScript文件
  const files = getTypeScriptFiles(frontendDir);
  console.log(`📁 找到 ${files.length} 个TypeScript文件\n`);
  
  // 修复文件
  let totalFixes = 0;
  let fixedFiles = 0;
  
  files.forEach((file, index) => {
    if (index % 100 === 0) {
      console.log(`进度: ${index}/${files.length} (${((index/files.length)*100).toFixed(1)}%)`);
    }
    
    const fixes = fixFileStrings(file);
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
    console.log('\n✅ 部分错误已修复，继续下一轮修复');
  } else {
    console.log('\n⚠️  本轮未能减少错误，需要手动处理');
  }
  
  return { initialErrors, finalErrors, errorReduction, totalFixes, fixedFiles };
}

/**
 * 修复单个文件中的未终止字符串
 */
function fixFileStrings(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    let fixCount = 0;
    
    // 字符串修复规则
    const stringFixes = [
      // 1. 修复单引号字符串后跟分号的情况
      { from: /([^\\])'([^']*);([^'])/g, to: "$1'$2';$3" },
      { from: /([^\\])'([^']*); '/g, to: "$1'$2';" },
      { from: /([^\\])'([^']*);$/gm, to: "$1'$2';" },
      
      // 2. 修复双引号字符串后跟分号的情况
      { from: /([^\\])"([^"]*);([^"])/g, to: '$1"$2";$3' },
      { from: /([^\\])"([^"]*); "/g, to: '$1"$2";' },
      { from: /([^\\])"([^"]*);$/gm, to: '$1"$2";' },
      
      // 3. 修复模板字符串后跟分号的情况
      { from: /([^\\])`([^`]*);([^`])/g, to: "$1`$2`;$3" },
      { from: /([^\\])`([^`]*); `/g, to: "$1`$2`;" },
      { from: /([^\\])`([^`]*);$/gm, to: "$1`$2`;" },
      
      // 4. 修复字符串中的引号混合问题
      { from: /([^\\])'([^']*)"([^"]*)"([^']*)'([^'])/g, to: "$1'$2$3$4'$5" },
      { from: /([^\\])"([^"]*)'([^']*)'([^"]*)"([^"])/g, to: '$1"$2$3$4"$5' },
      
      // 5. 修复console语句中的引号问题
      { from: /console\.(log|error|warn)\s*\(\s*(['"])([^'"]*)\s*,\s*([^)]*)\)\s*;\s*['"`]/g, to: 'console.$1($2$3$2, $4);' },
      { from: /console\.(log|error|warn)\s*\(\s*(['"])([^'"]*)\s*:\s*['"`],\s*([^)]*)\)\s*;\s*['"`]/g, to: 'console.$1($2$3:$2, $4);' },
      
      // 6. 修复对象属性中的引号问题
      { from: /:\s*(['"])([^'"]*)\s*;\s*['"`]/g, to: ': $1$2$1' },
      
      // 7. 修复函数调用中的引号问题
      { from: /\(\s*(['"])([^'"]*)\s*;\s*['"`]/g, to: '($1$2$1' },
      
      // 8. 修复JSX属性中的引号问题
      { from: /(\w+)=(['"])([^'"]*)\s*;\s*['"`]/g, to: '$1=$2$3$2' },
      
      // 9. 修复return语句中的引号问题
      { from: /return\s+(['"])([^'"]*)\s*;\s*['"`]/g, to: 'return $1$2$1;' }
    ];
    
    // 应用修复规则
    stringFixes.forEach(fix => {
      const before = content;
      content = content.replace(fix.from, fix.to);
      if (content !== before) {
        hasChanges = true;
        fixCount++;
      }
    });
    
    // 特殊处理：修复常见的字符串模式
    const specialPatterns = [
      // 修复 '; ' 模式
      { from: /'; '/g, to: "';" },
      { from: /"; "/g, to: '";' },
      { from: /`; `/g, to: '`;' },
      
      // 修复 ');' 模式
      { from: /'\);'/g, to: "');" },
      { from: /"\);"/g, to: '");' },
      { from: /`\);`/g, to: '`);' },
      
      // 修复多余的引号组合
      { from: /'''/g, to: "'" },
      { from: /"""/g, to: '"' },
      { from: /```/g, to: '`' },
      
      // 修复引号后跟其他引号的情况
      { from: /'"/g, to: "'" },
      { from: /"'/g, to: '"' },
      { from: /'`/g, to: "'" },
      { from: /`'/g, to: '`' },
      { from: /"`/g, to: '"' },
      { from: /`"/g, to: '`' }
    ];
    
    specialPatterns.forEach(pattern => {
      const before = content;
      content = content.replace(pattern.from, pattern.to);
      if (content !== before) {
        hasChanges = true;
        fixCount++;
      }
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      return fixCount;
    }
    
    return 0;
  } catch (error) {
    console.error(`修复文件失败 ${filePath}: ${error.message}`);
    return 0;
  }
}

/**
 * 获取所有TypeScript文件
 */
function getTypeScriptFiles(directory) {
  const files = [];
  
  function scanDirectory(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!['node_modules', 'dist', 'build', '.git', '.cache'].includes(entry.name)) {
            scanDirectory(fullPath);
          }
        } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
          if (!entry.name.endsWith('.d.ts')) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`扫描目录失败 ${dir}: ${error.message}`);
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
    const output = execSync('npx tsc --noEmit --maxNodeModuleJsDepth 0', { 
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: path.join(process.cwd(), 'frontend')
    });
    return 0;
  } catch (error) {
    const errorOutput = error.stdout || error.stderr || '';
    const errorCount = (errorOutput.match(/error TS/g) || []).length;
    return errorCount;
  }
}

if (require.main === module) {
  fixUnterminatedStrings();
}

module.exports = { fixUnterminatedStrings, fixFileStrings, getTypeScriptFiles, runTypeScriptCheck };
