/**
 * 批量修复前端语法错误的脚本
 */

const fs = require('fs');
const path = require('path');

// 需要修复的文件列表
const filesToFix = [
  'frontend/services/testing/testApiService.ts'
];

// 语法错误修复规则
const fixRules = [
  // 修复引号不匹配的console.error
  {
    pattern: /console\.error\('([^']*): , error\);/g,
    replacement: "console.error('$1:', error);"
  },
  // 修复引号不匹配的method
  {
    pattern: /method: 'POST,/g,
    replacement: "method: 'POST',"
  },
  {
    pattern: /method: 'GET,/g,
    replacement: "method: 'GET',"
  },
  {
    pattern: /method: 'PUT,/g,
    replacement: "method: 'PUT',"
  },
  {
    pattern: /method: 'DELETE,/g,
    replacement: "method: 'DELETE',"
  },
  // 修复引号不匹配的字符串
  {
    pattern: /"([^"]*): ", error"\)/g,
    replacement: '"$1:", error)'
  },
  {
    pattern: /"([^"]*): ", error\);/g,
    replacement: '"$1:", error);'
  },
  // 修复其他引号问题
  {
    pattern: /'\);$/gm,
    replacement: "');"
  },
  {
    pattern: /"\);$/gm,
    replacement: '");'
  },
  {
    pattern: /"}\)/g,
    replacement: '"}'
  },
  {
    pattern: /'\}/g,
    replacement: "'}"
  }
];

function fixFile(filePath) {
  try {
    console.log(`正在修复文件: ${filePath}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fixCount = 0;

    // 应用所有修复规则
    fixRules.forEach((rule, index) => {
      const matches = content.match(rule.pattern);
      if (matches) {
        content = content.replace(rule.pattern, rule.replacement);
        fixCount += matches.length;
        console.log(`  规则 ${index + 1}: 修复了 ${matches.length} 个问题`);
      }
    });

    // 如果有修改，写回文件
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filePath} 修复完成，共修复 ${fixCount} 个问题`);
    } else {
      console.log(`✅ ${filePath} 无需修复`);
    }

  } catch (error) {
    console.error(`❌ 修复文件 ${filePath} 失败:`, error.message);
  }
}

function main() {
  console.log('🔧 开始批量修复语法错误...\n');

  filesToFix.forEach(filePath => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      fixFile(fullPath);
    } else {
      console.log(`⚠️ 文件不存在: ${filePath}`);
    }
  });

  console.log('\n🎉 语法错误修复完成!');
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, fixRules };
