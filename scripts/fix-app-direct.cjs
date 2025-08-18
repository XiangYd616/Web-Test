const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 直接修复App.tsx文件
 */
function fixAppDirect() {
  const frontendPath = path.join(process.cwd(), 'frontend');
  const appPath = path.join(frontendPath, 'App.tsx');
  
  console.log('🔧 直接修复App.tsx文件...');
  
  try {
    // 获取初始错误数量
    const initialErrors = getErrorCount(frontendPath);
    console.log('📊 初始错误数量:', initialErrors);
    
    if (!fs.existsSync(appPath)) {
      console.error('❌ App.tsx文件不存在');
      return;
    }
    
    let content = fs.readFileSync(appPath, 'utf8');
    console.log('📄 原始文件长度:', content.length, '字符');
    
    // 显示前几行的问题
    const lines = content.split('\n');
    console.log('🔍 检查前5行:');
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      console.log(`  ${i + 1}: ${lines[i]}`);
    }
    
    // 修复每行末尾的多余引号
    let fixedLines = [];
    let fixCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const originalLine = line;
      
      // 移除行尾的多余单引号
      if (line.endsWith("';'")) {
        line = line.slice(0, -2) + ';';
        fixCount++;
      } else if (line.endsWith("'")) {
        // 检查这是否是多余的引号
        const withoutLastQuote = line.slice(0, -1);
        const singleQuotes = (withoutLastQuote.match(/'/g) || []).length;
        const doubleQuotes = (withoutLastQuote.match(/"/g) || []).length;
        
        // 如果去掉最后一个引号后，引号是配对的，则移除它
        if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0) {
          line = withoutLastQuote;
          fixCount++;
        }
      }
      
      // 移除行尾的多余双引号
      if (line.endsWith('";')) {
        line = line.slice(0, -2) + ';';
        fixCount++;
      }
      
      if (line !== originalLine) {
        console.log(`  ✓ 修复第${i + 1}行: ${originalLine} -> ${line}`);
      }
      
      fixedLines.push(line);
    }
    
    const fixedContent = fixedLines.join('\n');
    
    // 应用额外的修复
    let finalContent = fixedContent;
    
    // 修复import语句
    finalContent = finalContent.replace(/import ([^;]+);'/g, 'import $1;');
    finalContent = finalContent.replace(/import ([^;]+)'/g, 'import $1;');
    
    // 修复其他常见问题
    finalContent = finalContent.replace(/;;+/g, ';');
    finalContent = finalContent.replace(/\s+$/gm, '');
    
    // 写回文件
    fs.writeFileSync(appPath, finalContent);
    
    console.log('✅ App.tsx修复完成');
    console.log('🔧 应用了', fixCount, '个修复');
    console.log('📄 修复后文件长度:', finalContent.length, '字符');
    
    // 检查修复效果
    const finalErrors = getErrorCount(frontendPath);
    console.log('📊 修复后错误数量:', finalErrors);
    console.log('✅ 减少了', initialErrors - finalErrors, '个错误');
    
    // 显示修复后的前几行
    const fixedLines2 = finalContent.split('\n');
    console.log('🔍 修复后前5行:');
    for (let i = 0; i < Math.min(5, fixedLines2.length); i++) {
      console.log(`  ${i + 1}: ${fixedLines2[i]}`);
    }
    
  } catch (error) {
    console.error('❌ 修复App.tsx失败:', error.message);
  }
}

/**
 * 获取错误数量
 */
function getErrorCount(frontendPath) {
  try {
    execSync('npx tsc --noEmit --maxNodeModuleJsDepth 0', { 
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: frontendPath
    });
    return 0;
  } catch (error) {
    const errorOutput = error.stdout || error.stderr || '';
    return (errorOutput.match(/error TS/g) || []).length;
  }
}

if (require.main === module) {
  fixAppDirect();
}

module.exports = { fixAppDirect };
