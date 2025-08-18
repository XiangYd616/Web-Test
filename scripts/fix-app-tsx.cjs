const fs = require('fs');
const path = require('path');

// 修复App.tsx文件中的语法错误
function fixAppTsx() {
  const filePath = path.join(__dirname, '../frontend/App.tsx');
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    console.log('修复App.tsx中的语法错误...');
    
    // 修复常见的引号错误
    const fixes = [
      // 修复 )""; 模式
      { from: /\)"";\s*$/gm, to: ');' },
      { from: /\)'"';\s*$/gm, to: ');' },
      { from: /\)'"'";\s*$/gm, to: ');' },
      { from: /\)';\s*$/gm, to: ');' },
      { from: /\)'";\s*$/gm, to: ');' },
      
      // 修复导出语句
      { from: /export default ([^'"]+)'"'";\s*$/gm, to: 'export default $1;' },
      { from: /export default ([^'"]+)'";\s*$/gm, to: 'export default $1;' },
      
      // 修复console语句中的引号问题
      { from: /console\.error\('([^']*)", \{/g, to: "console.error('$1', {" },
      { from: /console\.error\('([^']*)", \{([^}]*)\}\)"""/g, to: "console.error('$1', {$2})" },
      
      // 修复字符串字面量
      { from: /([^\\])'([^']*)"([^"]*)"([^']*)'([^'])/g, to: "$1'$2$3$4'$5" },
      
      // 修复未终止的字符串
      { from: /([^\\])'([^']*)\n/g, to: "$1'$2';\n" },
      { from: /([^\\])"([^"]*)\n/g, to: '$1"$2";\n' }
    ];
    
    let fixCount = 0;
    fixes.forEach((fix, index) => {
      const before = content;
      content = content.replace(fix.from, fix.to);
      if (content !== before) {
        fixCount++;
        console.log(`✓ 应用修复规则 ${index + 1}`);
      }
    });
    
    // 写回文件
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ App.tsx修复完成，应用了 ${fixCount} 个修复`);
    
    return true;
  } catch (error) {
    console.error('❌ 修复App.tsx失败:', error.message);
    return false;
  }
}

if (require.main === module) {
  fixAppTsx();
}

module.exports = { fixAppTsx };
