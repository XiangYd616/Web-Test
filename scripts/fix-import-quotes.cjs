const fs = require('fs');
const path = require('path');

/**
 * 修复导入语句中的多余引号问题
 */
function fixImportQuotes(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    let fixCount = 0;
    
    console.log(`正在修复: ${path.relative(process.cwd(), filePath)}`);
    
    // 修复导入语句中的多余引号
    const importFixes = [
      // 修复 from 'module'''; 模式
      { from: /from\s+['"]([^'"]+)['"]''';/g, to: "from '$1';" },
      { from: /from\s+['"]([^'"]+)['"]'';/g, to: "from '$1';" },
      { from: /from\s+['"]([^'"]+)['"]";/g, to: "from '$1';" },
      
      // 修复 import 'module'''; 模式
      { from: /import\s+['"]([^'"]+)['"]''';/g, to: "import '$1';" },
      { from: /import\s+['"]([^'"]+)['"]'';/g, to: "import '$1';" },
      { from: /import\s+['"]([^'"]+)['"]";/g, to: "import '$1';" },
      
      // 修复 import { ... } from 'module'''; 模式
      { from: /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]''';/g, to: "import {$1} from '$2';" },
      { from: /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]'';/g, to: "import {$1} from '$2';" },
      { from: /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]";/g, to: "import {$1} from '$2';" },
      
      // 修复 import Name from 'module'''; 模式
      { from: /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]''';/g, to: "import $1 from '$2';" },
      { from: /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]'';/g, to: "import $1 from '$2';" },
      { from: /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]";/g, to: "import $1 from '$2';" },
      
      // 修复 import * as Name from 'module'''; 模式
      { from: /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]''';/g, to: "import * as $1 from '$2';" },
      { from: /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]'';/g, to: "import * as $1 from '$2';" },
      { from: /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]";/g, to: "import * as $1 from '$2';" },
      
      // 修复混合导入模式
      { from: /import\s+(\w+),\s*\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]''';/g, to: "import $1, {$2} from '$3';" },
      { from: /import\s+(\w+),\s*\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]'';/g, to: "import $1, {$2} from '$3';" },
      { from: /import\s+(\w+),\s*\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]";/g, to: "import $1, {$2} from '$3';" }
    ];
    
    importFixes.forEach((fix, index) => {
      const before = content;
      content = content.replace(fix.from, fix.to);
      if (content !== before) {
        hasChanges = true;
        fixCount++;
        console.log(`  ✓ 修复导入语句模式 ${index + 1}`);
      }
    });
    
    // 修复其他常见的引号问题
    const otherFixes = [
      // 修复CSS导入
      { from: /import\s+['"]([^'"]+\.css)['"]''';/g, to: "import '$1';" },
      { from: /import\s+['"]([^'"]+\.css)['"]'';/g, to: "import '$1';" },
      { from: /import\s+['"]([^'"]+\.css)['"]";/g, to: "import '$1';" },
      
      // 修复type导入
      { from: /import\s+type\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]''';/g, to: "import type {$1} from '$2';" },
      { from: /import\s+type\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]'';/g, to: "import type {$1} from '$2';" },
      { from: /import\s+type\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]";/g, to: "import type {$1} from '$2';" }
    ];
    
    otherFixes.forEach((fix, index) => {
      const before = content;
      content = content.replace(fix.from, fix.to);
      if (content !== before) {
        hasChanges = true;
        fixCount++;
        console.log(`  ✓ 修复其他引号模式 ${index + 1}`);
      }
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ 已修复 ${fixCount} 个导入语句问题`);
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
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // 跳过node_modules等目录
          if (!['node_modules', 'dist', 'build', '.git', '.cache'].includes(entry.name)) {
            scanDirectory(fullPath);
          }
        } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
          // 跳过类型定义文件
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
 * 主函数
 */
function main() {
  console.log('🔧 开始修复导入语句中的引号问题...\n');
  
  const startTime = Date.now();
  const frontendDir = path.join(process.cwd(), 'frontend');
  
  // 检查目录是否存在
  if (!fs.existsSync(frontendDir)) {
    console.error('❌ frontend目录不存在');
    process.exit(1);
  }
  
  // 获取所有TypeScript文件
  const files = getTypeScriptFiles(frontendDir);
  console.log(`📁 找到 ${files.length} 个TypeScript文件\n`);
  
  // 修复文件
  let totalFixes = 0;
  let fixedFiles = 0;
  
  files.forEach(file => {
    const fixes = fixImportQuotes(file);
    if (fixes > 0) {
      totalFixes += fixes;
      fixedFiles++;
    }
  });
  
  // 显示结果
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n📊 修复结果:');
  console.log(`  修复文件数: ${fixedFiles}/${files.length}`);
  console.log(`  总修复数: ${totalFixes}`);
  console.log(`  用时: ${duration}秒`);
  
  if (totalFixes > 0) {
    console.log('\n✅ 导入语句引号问题修复完成！');
  } else {
    console.log('\n⏭️  未发现需要修复的导入语句问题');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixImportQuotes, getTypeScriptFiles };
