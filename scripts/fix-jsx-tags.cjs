const fs = require('fs');
const path = require('path');

// 修复JSX标签中的语法错误
function fixJsxTags() {
  const filePath = path.join(__dirname, '../frontend/App.tsx');
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    console.log('修复JSX标签中的语法错误...');
    
    // JSX标签修复规则
    const jsxFixes = [
      // 修复JSX标签开始的引号问题
      { from: /<(\w+)";/g, to: '<$1' },
      { from: /<(\w+)'\s*;/g, to: '<$1' },
      
      // 修复JSX属性中的引号问题
      { from: /(\w+)="([^"]*)";\s*$/gm, to: '$1="$2"' },
      { from: /(\w+)='([^']*)';\s*$/gm, to: "$1='$2'" },
      
      // 修复JSX标签结束的问题
      { from: /\/>\s*";\s*$/gm, to: '/>' },
      { from: /\/>\s*';\s*$/gm, to: '/>' },
      { from: />\s*";\s*$/gm, to: '>' },
      { from: />\s*';\s*$/gm, to: '>' },
      
      // 修复JSX注释
      { from: /{\s*\/\*([^*]*)\*\/\s*}\s*";\s*$/gm, to: '{/* $1 */}' },
      { from: /{\s*\/\*([^*]*)\*\/\s*}\s*';\s*$/gm, to: '{/* $1 */}' },
      
      // 修复JSX闭合标签
      { from: /<\/(\w+)\s*>\s*";\s*$/gm, to: '</$1>' },
      { from: /<\/(\w+)\s*>\s*';\s*$/gm, to: '</$1>' },
      
      // 修复input标签
      { from: /<input";\s*$/gm, to: '<input' },
      { from: /<button";\s*$/gm, to: '<button' },
      { from: /<form";\s*$/gm, to: '<form' },
      { from: /<div";\s*$/gm, to: '<div' },
      { from: /<nav";\s*$/gm, to: '<nav' },
      { from: /<Route";\s*$/gm, to: '<Route' },
      
      // 修复组件标签
      { from: /<EnhancedErrorBoundary";\s*$/gm, to: '<EnhancedErrorBoundary' },
      { from: /<StatCard";\s*$/gm, to: '<StatCard' },
      { from: /<SimpleTestTools";\s*$/gm, to: '<SimpleTestTools' },
      
      // 修复属性值中的引号问题
      { from: /level="([^"]*)";\s*$/gm, to: 'level="$1"' },
      { from: /className="([^"]*)";\s*$/gm, to: 'className="$1"' },
      { from: /title="([^"]*)";\s*$/gm, to: 'title="$1"' },
      { from: /value="([^"]*)";\s*$/gm, to: 'value="$1"' },
      { from: /change="([^"]*)";\s*$/gm, to: 'change="$1"' },
      { from: /href="([^"]*)";\s*$/gm, to: 'href="$1"' },
      { from: /type="([^"]*)";\s*$/gm, to: 'type="$1"' },
      
      // 修复函数调用中的引号问题
      { from: /console\.error\('([^']*)', \{([^}]*)\}\)\s*";\s*$/gm, to: "console.error('$1', {$2})" },
      { from: /console\.log\('([^']*)', \{([^}]*)\}\)\s*";\s*$/gm, to: "console.log('$1', {$2})" },
      
      // 修复箭头函数和对象中的引号问题
      { from: /=>\s*\{\s*";\s*$/gm, to: '=> {' },
      { from: /\}\s*";\s*$/gm, to: '}' },
      
      // 修复特殊的JSX表达式
      { from: /onError\s*=\s*\{/g, to: 'onError={' }
    ];
    
    let fixCount = 0;
    jsxFixes.forEach((fix, index) => {
      const before = content;
      content = content.replace(fix.from, fix.to);
      if (content !== before) {
        fixCount++;
        console.log(`✓ 应用JSX修复规则 ${index + 1}`);
      }
    });
    
    // 写回文件
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ JSX标签修复完成，应用了 ${fixCount} 个修复`);
    
    return true;
  } catch (error) {
    console.error('❌ 修复JSX标签失败:', error.message);
    return false;
  }
}

if (require.main === module) {
  fixJsxTags();
}

module.exports = { fixJsxTags };
