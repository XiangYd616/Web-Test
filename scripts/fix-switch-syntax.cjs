#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 修复switch语句语法错误的脚本
function fixSwitchSyntax() {
  console.log('🔧 开始修复switch语句语法错误...\n');
  
  let totalFiles = 0;
  let fixedFiles = 0;
  let totalFixes = 0;

  function processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let newContent = content;
      let fileFixed = false;
      let fileFixes = 0;

      // 修复 case X: undefined, // 已修复 模式
      const switchPattern = /case\s+([^:]+):\s*undefined,\s*\/\/\s*已修复\s*\n/g;
      newContent = newContent.replace(switchPattern, (match, caseValue) => {
        fileFixed = true;
        fileFixes++;
        return `case ${caseValue}:\n`;
      });

      // 修复 default: undefined, // 已修复 模式
      const defaultPattern = /default:\s*undefined,\s*\/\/\s*已修复\s*\n/g;
      newContent = newContent.replace(defaultPattern, () => {
        fileFixed = true;
        fileFixes++;
        return 'default:\n';
      });

      // 修复模板字符串中的反斜杠问题
      const templateStringPattern = /`([^`]*?)\\(\$\{[^}]*\})/g;
      newContent = newContent.replace(templateStringPattern, (match, before, variable) => {
        fileFixed = true;
        fileFixes++;
        return `\`${before}${variable}`;
      });

      // 修复 if (condition) { 后面缺少换行的问题
      const ifPattern = /if\s*\([^)]+\)\s*\{\s*([^}]+)\s*\}/g;
      newContent = newContent.replace(ifPattern, (match, body) => {
        if (!body.trim().startsWith('\n') && body.includes('return')) {
          fileFixed = true;
          fileFixes++;
          return match.replace(body, `\n        ${body.trim()}\n      `);
        }
        return match;
      });

      if (fileFixed) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ 修复 ${filePath}`);
        console.log(`   修复数量: ${fileFixes}处`);
        fixedFiles++;
        totalFixes += fileFixes;
      }

      totalFiles++;
    } catch (error) {
      console.error(`❌ 处理文件失败: ${filePath}`, error.message);
    }
  }

  function walkDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // 跳过 node_modules 和其他不需要的目录
        if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(file)) {
          walkDirectory(fullPath);
        }
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        processFile(fullPath);
      }
    }
  }

  // 处理前端目录
  if (fs.existsSync('frontend')) {
    walkDirectory('frontend');
  }

  // 处理后端目录
  if (fs.existsSync('backend')) {
    walkDirectory('backend');
  }

  console.log('\n📊 修复报告');
  console.log('==================================================');
  console.log(`处理文件: ${totalFiles}`);
  console.log(`修复文件: ${fixedFiles}`);
  console.log(`总修复数: ${totalFixes}`);
  console.log('\n✅ switch语句语法修复完成！');
}

// 检查命令行参数
const args = process.argv.slice(2);
if (args.includes('--fix')) {
  fixSwitchSyntax();
} else {
  console.log('使用方法: node fix-switch-syntax.cjs --fix');
  console.log('这将修复项目中的switch语句语法错误');
}
