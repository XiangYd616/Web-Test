const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 批量修复剩余文件中的语法错误
 */
function fixRemainingSyntaxErrors() {
  console.log('🔧 开始批量修复剩余的语法错误...\n');
  
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
  
  // 获取错误最多的文件
  const errorFiles = getFilesWithMostErrors();
  console.log(`📁 找到 ${errorFiles.length} 个需要修复的文件\n`);
  
  // 修复文件
  let totalFixes = 0;
  let fixedFiles = 0;
  
  errorFiles.forEach((file, index) => {
    console.log(`[${index + 1}/${errorFiles.length}] 修复: ${path.relative(frontendDir, file)}`);
    const fixes = fixFileErrors(file);
    if (fixes > 0) {
      totalFixes += fixes;
      fixedFiles++;
      console.log(`  ✅ 修复了 ${fixes} 个问题`);
    } else {
      console.log(`  ⏭️  无需修复`);
    }
  });
  
  // 运行最终检查
  console.log('\n🔍 运行最终TypeScript检查...');
  const finalErrors = runTypeScriptCheck();
  
  // 显示结果
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const errorReduction = initialErrors - finalErrors;
  const reductionPercentage = initialErrors > 0 ? ((errorReduction / initialErrors) * 100).toFixed(1) : 0;
  
  console.log('\n📊 批量修复结果:');
  console.log(`  修复文件数: ${fixedFiles}/${errorFiles.length}`);
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
 * 获取错误最多的文件列表
 */
function getFilesWithMostErrors() {
  const targetFiles = [
    'pages/user/docs/Help.tsx',
    'services/seo/localSEOAnalysisEngine.ts',
    'utils/exportUtils.ts',
    'pages/core/testing/CompatibilityTest.tsx',
    'services/testing/stressTestRecordService.ts',
    'services/errorService.ts',
    'utils/performanceMonitor.ts',
    'utils/routePreloader.ts',
    'services/apiErrorInterceptor.ts'
  ];
  
  const frontendDir = path.join(process.cwd(), 'frontend');
  return targetFiles
    .map(file => path.join(frontendDir, file))
    .filter(file => fs.existsSync(file));
}

/**
 * 修复单个文件的错误
 */
function fixFileErrors(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    let fixCount = 0;
    
    // 通用语法修复规则
    const syntaxFixes = [
      // 1. 修复行末的多余引号
      { from: /;\s*'\s*$/gm, to: ';' },
      { from: /;\s*"\s*$/gm, to: ';' },
      { from: /\)\s*;\s*'\s*$/gm, to: ');' },
      { from: /\)\s*;\s*"\s*$/gm, to: ');' },
      { from: /\}\s*;\s*'\s*$/gm, to: '};' },
      { from: /\}\s*;\s*"\s*$/gm, to: '};' },
      
      // 2. 修复单独的引号行
      { from: /^\s*'\s*$/gm, to: '' },
      { from: /^\s*"\s*$/gm, to: '' },
      
      // 3. 修复对象属性后的多余引号
      { from: /,\s*'\s*$/gm, to: ',' },
      { from: /,\s*"\s*$/gm, to: ',' },
      
      // 4. 修复函数调用后的多余引号
      { from: /\)\s*'\s*$/gm, to: ')' },
      { from: /\)\s*"\s*$/gm, to: ')' },
      
      // 5. 修复条件语句后的多余引号
      { from: /\{\s*'\s*$/gm, to: '{' },
      { from: /\{\s*"\s*$/gm, to: '{' },
      
      // 6. 修复数组和对象字面量
      { from: /\[\s*'\s*$/gm, to: '[' },
      { from: /\[\s*"\s*$/gm, to: '[' },
      
      // 7. 修复变量声明后的多余引号
      { from: /=\s*([^;]+);\s*'\s*$/gm, to: '= $1;' },
      { from: /=\s*([^;]+);\s*"\s*$/gm, to: '= $1;' },
      
      // 8. 修复字符串字面量中的引号问题
      { from: /'([^']*)',\s*'\s*$/gm, to: "'$1'," },
      { from: /"([^"]*)",\s*"\s*$/gm, to: '"$1",' },
      
      // 9. 修复对象属性值的引号问题
      { from: /:\s*'([^']*)',\s*'\s*$/gm, to: ": '$1'," },
      { from: /:\s*"([^"]*)",\s*"\s*$/gm, to: ': "$1",' },
      
      // 10. 修复console语句
      { from: /console\.(log|error|warn)\s*\(\s*'([^']*)',\s*([^)]*)\)\s*;\s*'\s*$/gm, to: "console.$1('$2', $3);" },
      { from: /console\.(log|error|warn)\s*\(\s*'([^']*)',\s*([^)]*)\)\s*;\s*"\s*$/gm, to: "console.$1('$2', $3);" },
      
      // 11. 修复return语句
      { from: /return\s+([^;]*)\s*;\s*'\s*$/gm, to: "return $1;" },
      { from: /return\s+([^;]*)\s*;\s*"\s*$/gm, to: "return $1;" },
      
      // 12. 修复导入语句后的注释
      { from: /} from '([^']+)';\/\/ ([^']*)'$/gm, to: "} from '$1';\n// $2" },
      { from: /} from '([^']+)';([^']*)'$/gm, to: "} from '$1';\n$2" },
      
      // 13. 修复特殊的多余引号组合
      { from: /'''/g, to: "'" },
      { from: /"""/g, to: '"' },
      { from: /'"/g, to: "'" },
      { from: /"'/g, to: '"' }
    ];
    
    // 应用修复规则
    syntaxFixes.forEach(fix => {
      const before = content;
      content = content.replace(fix.from, fix.to);
      if (content !== before) {
        hasChanges = true;
        fixCount++;
      }
    });
    
    // 清理空行和多余的空白
    if (hasChanges) {
      content = content
        .replace(/\n\s*\n\s*\n/g, '\n\n') // 移除多余的空行
        .replace(/\s+$/gm, '') // 移除行末空白
        .replace(/\n+$/, '\n'); // 确保文件以单个换行符结束
      
      fs.writeFileSync(filePath, content, 'utf8');
    }
    
    return fixCount;
  } catch (error) {
    console.error(`修复文件失败 ${filePath}: ${error.message}`);
    return 0;
  }
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
  fixRemainingSyntaxErrors();
}

module.exports = { fixRemainingSyntaxErrors, fixFileErrors, getFilesWithMostErrors, runTypeScriptCheck };
