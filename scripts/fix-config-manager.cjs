const fs = require('fs');
const path = require('path');

/**
 * 修复ConfigManager.ts文件中的语法错误
 */
function fixConfigManager() {
  const filePath = path.join(process.cwd(), 'frontend/config/ConfigManager.ts');
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    console.log('修复ConfigManager.ts中的语法错误...');
    
    // 修复常见的引号错误
    const fixes = [
      // 修复对象属性值后的多余引号
      { from: /:\s*'([^']*)',\s*'/g, to: ": '$1'," },
      { from: /:\s*"([^"]*)",\s*"/g, to: ': "$1",' },
      
      // 修复console语句中的引号问题
      { from: /console\.(log|error|warn)\s*\(\s*'([^']*)',\s*\{([^}]*)\}\)\s*";\s*$/gm, to: "console.$1('$2', {$3});" },
      { from: /console\.(log|error|warn)\s*\(\s*'([^']*)',\s*([^)]*)\)\s*";\s*$/gm, to: "console.$1('$2', $3);" },
      { from: /console\.(log|error|warn)\s*\(\s*'([^']*)',\s*([^)]*)\)\s*';\s*$/gm, to: "console.$1('$2', $3);" },
      { from: /console\.(log|error|warn)\s*\(\s*'([^']*)',\s*([^)]*)\)\s*;\s*'$/gm, to: "console.$1('$2', $3);" },
      
      // 修复emit语句中的引号问题
      { from: /this\.emit\s*\(\s*'([^']*)',\s*([^)]*)\)\s*;\s*'$/gm, to: "this.emit('$1', $2);" },
      { from: /this\.emit\s*\(\s*'([^']*)',\s*([^)]*)\)\s*";\s*$/gm, to: "this.emit('$1', $2);" },
      
      // 修复字符串字面量后的多余引号
      { from: /:\s*'([^']*)',\s*'$/gm, to: ": '$1'," },
      { from: /:\s*"([^"]*)",\s*"$/gm, to: ': "$1",' },
      
      // 修复缓存策略等配置项
      { from: /cacheStrategy:\s*'([^']*)',\s*'$/gm, to: "cacheStrategy: '$1'," },
      { from: /maxAge:\s*(\d+)\s*\/\/\s*([^']*)'$/gm, to: "maxAge: $1 // $2" },
      
      // 修复方法调用中的引号问题
      { from: /\.([a-zA-Z]+)\s*\(\s*'([^']*)',\s*([^)]*)\)\s*;\s*'$/gm, to: ".$1('$2', $3);" },
      { from: /\.([a-zA-Z]+)\s*\(\s*'([^']*)',\s*([^)]*)\)\s*";\s*$/gm, to: ".$1('$2', $3);" },
      
      // 修复fetch调用中的引号问题
      { from: /fetch\s*\(\s*"([^"]*)',\s*\{$/gm, to: 'fetch("$1", {' },
      { from: /method:\s*'([^']*)',\s*'$/gm, to: "method: '$1'," },
      { from: /'Content-Type':\s*'([^']*)';\s*$/gm, to: "'Content-Type': '$1'" },
      
      // 修复条件语句中的引号问题
      { from: /if\s*\(\s*([^)]*)\)\s*\{\s*'$/gm, to: "if ($1) {" },
      { from: /\}\s*else\s*if\s*\(\s*([^)]*)\)\s*\{\s*'$/gm, to: "} else if ($1) {" },
      { from: /\}\s*else\s*\{\s*'$/gm, to: "} else {" },
      
      // 修复try-catch语句中的引号问题
      { from: /try\s*\{\s*'$/gm, to: "try {" },
      { from: /\}\s*catch\s*\(\s*([^)]*)\)\s*\{\s*'$/gm, to: "} catch ($1) {" },
      
      // 修复函数定义中的引号问题
      { from: /private\s+([a-zA-Z]+)\s*\([^)]*\):\s*([^{]*)\s*\{\s*'$/gm, to: "private $1($2): $3 {" },
      { from: /public\s+([a-zA-Z]+)\s*\([^)]*\):\s*([^{]*)\s*\{\s*'$/gm, to: "public $1($2): $3 {" },
      
      // 修复变量声明中的引号问题
      { from: /const\s+([a-zA-Z]+)\s*=\s*([^;]*)\s*;\s*'$/gm, to: "const $1 = $2;" },
      { from: /let\s+([a-zA-Z]+)\s*=\s*([^;]*)\s*;\s*'$/gm, to: "let $1 = $2;" },
      
      // 修复对象字面量中的引号问题
      { from: /\{\s*([^:]+):\s*'([^']*)',\s*'$/gm, to: "{ $1: '$2'," },
      { from: /\{\s*([^:]+):\s*"([^"]*)",\s*"$/gm, to: '{ $1: "$2",' },
      
      // 修复数组中的引号问题
      { from: /\[\s*'([^']*)',\s*'$/gm, to: "['$1'," },
      { from: /\[\s*"([^"]*)",\s*"$/gm, to: '["$1",' },
      
      // 修复return语句中的引号问题
      { from: /return\s+([^;]*)\s*;\s*'$/gm, to: "return $1;" },
      
      // 修复特殊的多余引号组合
      { from: /'''/g, to: "'" },
      { from: /"""/g, to: '"' },
      { from: /'"/g, to: "'" },
      { from: /"'/g, to: '"' }
    ];
    
    let fixCount = 0;
    fixes.forEach((fix, index) => {
      const before = content;
      content = content.replace(fix.from, fix.to);
      if (content !== before) {
        fixCount++;
        console.log(`  ✓ 应用修复规则 ${index + 1}`);
      }
    });
    
    // 写回文件
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ConfigManager.ts修复完成，应用了 ${fixCount} 个修复`);
    
    return true;
  } catch (error) {
    console.error('❌ 修复ConfigManager.ts失败:', error.message);
    return false;
  }
}

if (require.main === module) {
  fixConfigManager();
}

module.exports = { fixConfigManager };
