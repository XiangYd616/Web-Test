const fs = require('fs');
const path = require('path');

/**
 * 修复StressTest.tsx文件中的语法错误
 */
function fixStressTest() {
  const filePath = path.join(process.cwd(), 'frontend/pages/core/testing/StressTest.tsx');
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    console.log('修复StressTest.tsx中的语法错误...');
    
    // 第一步：修复导入语句的格式问题
    console.log('修复导入语句格式...');
    
    // 将挤在一行的导入语句分开
    content = content.replace(
      /} from 'lucide-react';import React/g,
      "} from 'lucide-react';\nimport React"
    );
    
    content = content.replace(
      /} from 'react';import { useLocation/g,
      "} from 'react';\nimport { useLocation"
    );
    
    content = content.replace(
      /} from 'react-router-dom';import { useAuthCheck/g,
      "} from 'react-router-dom';\nimport { useAuthCheck"
    );
    
    // 继续分离其他导入语句
    content = content.replace(
      /\.tsx';import { StressTestCharts/g,
      ".tsx';\nimport { StressTestCharts"
    );
    
    content = content.replace(
      /index';import StressTestHistory/g,
      "index';\nimport StressTestHistory"
    );
    
    content = content.replace(
      /URLInput';import CancelProgressFeedback/g,
      "URLInput';\nimport CancelProgressFeedback"
    );
    
    content = content.replace(
      /\.tsx';import CancelTestConfirmDialog/g,
      ".tsx';\nimport CancelTestConfirmDialog"
    );
    
    content = content.replace(
      /\.tsx';import ExportModal/g,
      ".tsx';\nimport ExportModal"
    );
    
    content = content.replace(
      /\.tsx';import { useLocalStressTest/g,
      ".tsx';\nimport { useLocalStressTest"
    );
    
    content = content.replace(
      /\.ts';import { StressTestConfig as ImportedAdvancedStressTestConfig/g,
      ".ts';\nimport { StressTestConfig as ImportedAdvancedStressTestConfig"
    );
    
    content = content.replace(
      /\.ts';import { useStressTestRecord/g,
      ".ts';\nimport { useStressTestRecord"
    );
    
    content = content.replace(
      /\.ts';import { useUserStats/g,
      ".ts';\nimport { useUserStats"
    );
    
    content = content.replace(
      /\.ts';import backgroundTestManager/g,
      ".ts';\nimport backgroundTestManager"
    );
    
    content = content.replace(
      /\.ts';import ExportUtils/g,
      ".ts';\nimport ExportUtils"
    );
    
    content = content.replace(
      /\.ts';import { systemResourceMonitor/g,
      ".ts';\nimport { systemResourceMonitor"
    );
    
    content = content.replace(
      /\.ts';import { testEngineManager/g,
      ".ts';\nimport { testEngineManager"
    );
    
    content = content.replace(
      /\.ts';import { TestPhase/g,
      ".ts';\nimport { TestPhase"
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
      { from: /=\s*([^;]+);\s*"\s*$/gm, to: '= $1;' }
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
      { from: /let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^;]*)\s*;\s*"\s*$/gm, to: "let $1 = $2;" }
    ];
    
    // 应用所有修复
    let totalFixes = 0;
    
    [quoteFixes, specificFixes].forEach((fixGroup, groupIndex) => {
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
    console.log(`✅ StressTest.tsx修复完成，应用了 ${totalFixes} 个修复`);
    
    return true;
  } catch (error) {
    console.error('❌ 修复StressTest.tsx失败:', error.message);
    return false;
  }
}

if (require.main === module) {
  fixStressTest();
}

module.exports = { fixStressTest };
