/**
 * 修复可选链赋值错误
 * ESBuild 不支持可选链赋值，需要转换为普通赋值
 */

const fs = require('fs');
const path = require('path');

function fixOptionalChainingAssignments(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    // 修复 a?.href = 模式
    const hrefPattern = /(\w+)\?\.href\s*=/g;
    if (hrefPattern.test(content)) {
      content = content.replace(hrefPattern, '$1.href =');
      hasChanges = true;
    }

    // 修复 a?.download = 模式
    const downloadPattern = /(\w+)\?\.download\s*=/g;
    if (downloadPattern.test(content)) {
      content = content.replace(downloadPattern, '$1.download =');
      hasChanges = true;
    }

    // 修复其他常见的可选链赋值模式
    const generalPattern = /(\w+)\?\.(\w+)\s*=/g;
    if (generalPattern.test(content)) {
      content = content.replace(generalPattern, '$1.$2 =');
      hasChanges = true;
    }

    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[FIXED] ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[ERROR] ${filePath}:`, error.message);
    return false;
  }
}

function findAndFixFiles(directory) {
  const files = fs.readdirSync(directory);
  let fixedCount = 0;

  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      fixedCount += findAndFixFiles(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      if (fixOptionalChainingAssignments(filePath)) {
        fixedCount++;
      }
    }
  });

  return fixedCount;
}

console.log('[INFO] 开始修复可选链赋值错误...');

const projectRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(projectRoot, 'frontend');

if (fs.existsSync(frontendDir)) {
  const fixedCount = findAndFixFiles(frontendDir);
  console.log(`[SUCCESS] 已修复 ${fixedCount} 个文件`);
} else {
  console.error('[ERROR] frontend 目录不存在');
}

console.log('[INFO] 修复完成！');
