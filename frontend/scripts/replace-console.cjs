#!/usr/bin/env node

/**
 * 自动替换 console 语句为 Logger 工具
 */

const fs = require('fs');
const path = require('path');

// 需要处理的文件扩展名
const extensions = ['.ts', '.tsx'];

// 排除的目录
const excludeDirs = ['node_modules', 'dist', 'build', '.git', 'scripts'];

// 替换映射
const replacements = [
  {
    pattern: /console\.log\(/g,
    replacement: 'Logger.debug(',
    needsImport: true
  },
  {
    pattern: /console\.info\(/g,
    replacement: 'Logger.info(',
    needsImport: true
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'Logger.warn(',
    needsImport: true
  },
  {
    pattern: /console\.error\(/g,
    replacement: 'Logger.error(',
    needsImport: true
  },
  {
    pattern: /console\.debug\(/g,
    replacement: 'Logger.debug(',
    needsImport: true
  }
];

// 检查文件是否需要处理
function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  if (!extensions.includes(ext)) return false;
  
  const relativePath = path.relative(process.cwd(), filePath);
  return !excludeDirs.some(dir => relativePath.includes(dir));
}

// 检查是否已有 Logger 导入
function hasLoggerImport(content) {
  return /import.*Logger.*from.*['"].*logger.*['"]/.test(content) ||
         /import.*Logger.*from.*['"]@\/utils\/logger['"]/.test(content);
}

// 添加 Logger 导入
function addLoggerImport(content) {
  // 如果已有导入，不添加
  if (hasLoggerImport(content)) return content;
  
  // 查找第一个 import 语句
  const importMatch = content.match(/^import /m);
  if (importMatch) {
    const index = importMatch.index;
    return content.slice(0, index) + 
           "import Logger from '@/utils/logger';\n" + 
           content.slice(index);
  }
  
  // 如果没有 import，在文件开头添加
  return "import Logger from '@/utils/logger';\n\n" + content;
}

// 处理单个文件
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let needsImport = false;
    
    // 应用所有替换
    for (const { pattern, replacement, needsImport: requiresImport } of replacements) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
        if (requiresImport) needsImport = true;
      }
    }
    
    // 如果修改了且需要导入
    if (modified && needsImport && !hasLoggerImport(content)) {
      content = addLoggerImport(content);
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

// 递归遍历目录
function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(file)) {
        walkDir(filePath, callback);
      }
    } else if (shouldProcessFile(filePath)) {
      callback(filePath);
    }
  });
}

// 主函数
function main() {
  const startDir = process.cwd();
  let processedCount = 0;
  let modifiedCount = 0;
  
  console.log('开始替换 console 语句...\n');
  
  walkDir(startDir, (filePath) => {
    processedCount++;
    if (processFile(filePath)) {
      modifiedCount++;
      const relativePath = path.relative(startDir, filePath);
      console.log(`✓ ${relativePath}`);
    }
  });
  
  console.log(`\n完成！`);
  console.log(`处理文件: ${processedCount}`);
  console.log(`修改文件: ${modifiedCount}`);
}

// 运行
if (require.main === module) {
  main();
}

module.exports = { processFile, walkDir };

