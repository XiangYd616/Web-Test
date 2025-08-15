#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 正则表达式修复映射
const regexFixes = [
  // 修复反斜杠转义问题
  { from: /\/\[\/\]/g, to: '/\\[\\]/' },
  { from: /\/\{\/\}/g, to: '/\\{\\}/' },
  { from: /\/\/d/g, to: '/\\d' },
  { from: /\/\/s/g, to: '/\\s' },
  { from: /\/\/w/g, to: '/\\w' },
  { from: /\/\/\./g, to: '/\\.' },
  { from: /\/\//g, to: '/' },
  
  // 修复特定的错误模式
  { from: /\/\[!\@#\$%\^&\*\(\)_\+\-=\/\[\/\]\{};':"\/\/\|,\.<>\/\/\?\]/g, to: '/[!@#$%^&*()_+\\-=\\[\\]{};\':"\\\\|,.<>\\/?]/' },
  { from: /\/Chrome\/\/\(/g, to: '/Chrome\\/\\(/' },
  { from: /\/Firefox\/\/\(/g, to: '/Firefox\\/\\(/' },
  { from: /\/Version\/\/\(/g, to: '/Version\\/\\(/' },
  { from: /\/Edg\/\/\(/g, to: '/Edg\\/\\(/' },
  { from: /\/\.\(png\|jpg\|jpeg\|gif\|webp\|svg\)\$/g, to: '/\\.(png|jpg|jpeg|gif|webp|svg)$/' },
  { from: /\/\.\(js\|ts\)\$/g, to: '/\\.(js|ts)$/' },
  { from: /\/\.\(woff\|woff2\|ttf\|eot\)\$/g, to: '/\\.(woff|woff2|ttf|eot)$/' },
  { from: /\/\^\/d\+\/\.\/d\+\/\.\/d\+\/\.\/d\+\$\/g, to: '/^\\d+\\.\\d+\\.\\d+\\.\\d+$/' },
  { from: /:\/\s\/\(/g, to: ':\\/\\s\\(' },
  { from: /\/\(\.\)\/1\{2,\}/g, to: '/(.)\\1{2,}/' },
];

// 递归遍历目录
function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDir(filePath, callback);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx'))) {
      callback(filePath);
    }
  });
}

// 修复文件中的正则表达式
function fixRegexInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    regexFixes.forEach(fix => {
      const newContent = content.replace(fix.from, fix.to);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 修复了文件: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ 修复文件失败: ${filePath}`, error.message);
  }
}

// 主函数
function main() {
  const frontendDir = path.join(__dirname, '../frontend');
  
  console.log('🔧 开始修复正则表达式错误...');
  
  walkDir(frontendDir, fixRegexInFile);
  
  console.log('✨ 正则表达式修复完成!');
}

if (require.main === module) {
  main();
}

module.exports = { fixRegexInFile, walkDir };
