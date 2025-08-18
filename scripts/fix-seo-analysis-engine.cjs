const fs = require('fs');
const path = require('path');

/**
 * 修复seoAnalysisEngine.ts文件中的语法错误
 */
function fixSeoAnalysisEngine() {
  const filePath = path.join(process.cwd(), 'frontend/services/seo/seoAnalysisEngine.ts');
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    console.log('修复seoAnalysisEngine.ts中的语法错误...');
    
    // 第一步：修复导入语句的格式问题
    console.log('修复导入语句格式...');
    
    // 修复导入语句后的注释问题
    content = content.replace(
      /} from '([^']+)';\/\/ ([^']*)'$/gm,
      "} from '$1';\n// $2"
    );
    
    content = content.replace(
      /} from '([^']+)';([^']*)'$/gm,
      "} from '$1';\n$2"
    );
    
    // 第二步：修复基础的引号问题
    console.log('修复引号问题...');
    
    const quoteFixes = [
      // 修复行末的多余引号
      { from: /;\s*'\s*$/gm, to: ';' },
      { from: /;\s*"\s*$/gm, to: ';' },
      { from: /\)\s*;\s*'\s*$/gm, to: ');' },
      { from: /\)\s*;\s*"\s*$/gm, to: ');' },
      { from: /\}\s*;\s*'\s*$/gm, to: '};' },
      { from: /\}\s*;\s*"\s*$/gm, to: '};' },
      
      // 修复单独的引号行
      { from: /^\s*'\s*$/gm, to: '' },
      { from: /^\s*"\s*$/gm, to: '' },
      
      // 修复对象属性后的多余引号
      { from: /,\s*'\s*$/gm, to: ',' },
      { from: /,\s*"\s*$/gm, to: ',' },
      
      // 修复函数调用后的多余引号
      { from: /\)\s*'\s*$/gm, to: ')' },
      { from: /\)\s*"\s*$/gm, to: ')' },
      
      // 修复条件语句后的多余引号
      { from: /\{\s*'\s*$/gm, to: '{' },
      { from: /\{\s*"\s*$/gm, to: '{' },
      
      // 修复数组和对象字面量
      { from: /\[\s*'\s*$/gm, to: '[' },
      { from: /\[\s*"\s*$/gm, to: '[' },
      
      // 修复变量声明后的多余引号
      { from: /=\s*([^;]+);\s*'\s*$/gm, to: '= $1;' },
      { from: /=\s*([^;]+);\s*"\s*$/gm, to: '= $1;' },
      
      // 修复字符串字面量中的引号问题
      { from: /'([^']*)',\s*'\s*$/gm, to: "'$1'," },
      { from: /"([^"]*)",\s*"\s*$/gm, to: '"$1",' },
      
      // 修复对象属性值的引号问题
      { from: /:\s*'([^']*)',\s*'\s*$/gm, to: ": '$1'," },
      { from: /:\s*"([^"]*)",\s*"\s*$/gm, to: ': "$1",' }
    ];
    
    // 第三步：修复特定的语法模式
    console.log('修复特定语法模式...');
    
    const specificFixes = [
      // 修复console语句
      { from: /console\.(log|error|warn)\s*\(\s*'([^']*)',\s*([^)]*)\)\s*;\s*'\s*$/gm, to: "console.$1('$2', $3);" },
      { from: /console\.(log|error|warn)\s*\(\s*'([^']*)',\s*([^)]*)\)\s*;\s*"\s*$/gm, to: "console.$1('$2', $3);" },
      
      // 修复条件语句
      { from: /if\s*\(\s*([^)]*)\)\s*\{\s*'\s*$/gm, to: "if ($1) {" },
      { from: /if\s*\(\s*([^)]*)\)\s*\{\s*"\s*$/gm, to: "if ($1) {" },
      { from: /\}\s*else\s*if\s*\(\s*([^)]*)\)\s*\{\s*'\s*$/gm, to: "} else if ($1) {" },
      { from: /\}\s*else\s*if\s*\(\s*([^)]*)\)\s*\{\s*"\s*$/gm, to: "} else if ($1) {" },
      { from: /\}\s*else\s*\{\s*'\s*$/gm, to: "} else {" },
      { from: /\}\s*else\s*\{\s*"\s*$/gm, to: "} else {" },
      
      // 修复try-catch语句
      { from: /try\s*\{\s*'\s*$/gm, to: "try {" },
      { from: /try\s*\{\s*"\s*$/gm, to: "try {" },
      { from: /\}\s*catch\s*\(\s*([^)]*)\)\s*\{\s*'\s*$/gm, to: "} catch ($1) {" },
      { from: /\}\s*catch\s*\(\s*([^)]*)\)\s*\{\s*"\s*$/gm, to: "} catch ($1) {" },
      
      // 修复return语句
      { from: /return\s+([^;]*)\s*;\s*'\s*$/gm, to: "return $1;" },
      { from: /return\s+([^;]*)\s*;\s*"\s*$/gm, to: "return $1;" },
      
      // 修复变量声明
      { from: /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^;]*)\s*;\s*'\s*$/gm, to: "const $1 = $2;" },
      { from: /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^;]*)\s*;\s*"\s*$/gm, to: "const $1 = $2;" },
      { from: /let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^;]*)\s*;\s*'\s*$/gm, to: "let $1 = $2;" },
      { from: /let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^;]*)\s*;\s*"\s*$/gm, to: "let $1 = $2;" },
      
      // 修复函数定义
      { from: /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*:\s*([^{]*)\s*\{\s*'\s*$/gm, to: "function $1(): $2 {" },
      { from: /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*:\s*([^{]*)\s*\{\s*"\s*$/gm, to: "function $1(): $2 {" },
      
      // 修复async函数
      { from: /async\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*:\s*([^{]*)\s*\{\s*'\s*$/gm, to: "async $1(): $2 {" },
      { from: /async\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*:\s*([^{]*)\s*\{\s*"\s*$/gm, to: "async $1(): $2 {" },
      
      // 修复方法调用
      { from: /\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*;\s*'\s*$/gm, to: ".$1();" },
      { from: /\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*;\s*"\s*$/gm, to: ".$1();" },
      
      // 修复数组方法
      { from: /\.push\s*\(\s*([^)]*)\)\s*;\s*'\s*$/gm, to: ".push($1);" },
      { from: /\.push\s*\(\s*([^)]*)\)\s*;\s*"\s*$/gm, to: ".push($1);" }
    ];
    
    // 第四步：修复对象字面量和数组
    console.log('修复对象和数组...');
    
    const objectFixes = [
      // 修复对象属性
      { from: /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*([^,}]*),\s*'\s*$/gm, to: "$1: $2," },
      { from: /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*([^,}]*),\s*"\s*$/gm, to: "$1: $2," },
      
      // 修复数组元素
      { from: /,\s*([^,\]]*),\s*'\s*$/gm, to: ", $1," },
      { from: /,\s*([^,\]]*),\s*"\s*$/gm, to: ", $1," },
      
      // 修复对象和数组的结束
      { from: /\}\s*,\s*'\s*$/gm, to: "}," },
      { from: /\}\s*,\s*"\s*$/gm, to: "}," },
      { from: /\]\s*,\s*'\s*$/gm, to: "]," },
      { from: /\]\s*,\s*"\s*$/gm, to: "]," }
    ];
    
    // 应用所有修复
    let totalFixes = 0;
    
    [quoteFixes, specificFixes, objectFixes].forEach((fixGroup, groupIndex) => {
      console.log(`应用修复组 ${groupIndex + 1}...`);
      fixGroup.forEach((fix, index) => {
        const before = content;
        content = content.replace(fix.from, fix.to);
        if (content !== before) {
          totalFixes++;
          console.log(`  ✓ 修复规则 ${groupIndex + 1}.${index + 1}`);
        }
      });
    });
    
    // 最后清理：移除空行和多余的空白
    content = content
      .replace(/\n\s*\n\s*\n/g, '\n\n') // 移除多余的空行
      .replace(/\s+$/gm, '') // 移除行末空白
      .replace(/\n+$/, '\n'); // 确保文件以单个换行符结束
    
    // 写回文件
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ seoAnalysisEngine.ts修复完成，应用了 ${totalFixes} 个修复`);
    
    return true;
  } catch (error) {
    console.error('❌ 修复seoAnalysisEngine.ts失败:', error.message);
    return false;
  }
}

if (require.main === module) {
  fixSeoAnalysisEngine();
}

module.exports = { fixSeoAnalysisEngine };
