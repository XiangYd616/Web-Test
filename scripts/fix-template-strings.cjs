const fs = require('fs');
const path = require('path');

// 递归查找所有 TypeScript 和 JavaScript 文件
function findTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // 跳过 node_modules
      if (item !== 'node_modules') {
        findTsFiles(fullPath, files);
      }
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// 修复模板字符串语法
function fixTemplateStrings(content) {
  // 修复错误的模板字符串语法：'http://${...}' -> `http://${...}`
  const pattern = /'(http:\/\/\$\{[^}]+\}[^']*?)'/g;
  const pattern2 = /'(ws:\/\/\$\{[^}]+\}[^']*?)'/g;
  
  content = content.replace(pattern, '`$1`');
  content = content.replace(pattern2, '`$1`');
  
  return content;
}

// 处理单个文件
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fixedContent = fixTemplateStrings(content);
    
    if (content !== fixedContent) {
      fs.writeFileSync(filePath, fixedContent, 'utf-8');
      console.log(`✅ 修复: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ 错误处理文件 ${filePath}:`, error.message);
    return false;
  }
}

// 主函数
function main() {
  console.log('🔧 开始修复模板字符串语法错误...\n');
  
  // 查找 frontend 目录下的所有 TS 文件
  const frontendDir = path.join(process.cwd(), 'frontend');
  
  if (!fs.existsSync(frontendDir)) {
    console.error('❌ frontend 目录不存在');
    process.exit(1);
  }
  
  const tsFiles = findTsFiles(frontendDir);
  console.log(`📄 找到 ${tsFiles.length} 个 TypeScript 文件\n`);
  
  let fixedCount = 0;
  
  for (const file of tsFiles) {
    if (processFile(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n✨ 修复完成！共处理 ${fixedCount} 个文件`);
}

main();
