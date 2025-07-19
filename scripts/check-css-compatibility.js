#!/usr/bin/env node

/**
 * CSS浏览器兼容性检查和修复脚本
 * 自动检查CSS文件中的兼容性问题并提供修复建议
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 兼容性规则配置
const COMPATIBILITY_RULES = {
  'backdrop-filter': {
    prefixes: ['-webkit-backdrop-filter'],
    description: 'Safari 9+ 需要 -webkit- 前缀',
    severity: 'error'
  },
  'min-width: fit-content': {
    fallbacks: ['min-width: -webkit-fill-available'],
    description: 'Samsung Internet 需要 -webkit-fill-available 回退',
    severity: 'warning'
  },
  'scrollbar-width': {
    alternatives: ['::-webkit-scrollbar { display: none; }'],
    description: 'Webkit 浏览器需要 ::-webkit-scrollbar 规则',
    severity: 'info'
  }
};

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CSS_PATTERN = path.join(PROJECT_ROOT, 'src/**/*.css');

/**
 * 检查CSS文件的兼容性问题
 */
function checkCSSCompatibility() {
  console.log('🔍 开始检查CSS浏览器兼容性问题...\n');
  
  const cssFiles = glob.sync(CSS_PATTERN);
  const issues = [];
  
  cssFiles.forEach(filePath => {
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();
      
      // 检查 backdrop-filter
      if (trimmedLine.includes('backdrop-filter:') && !content.includes('-webkit-backdrop-filter:')) {
        issues.push({
          file: relativePath,
          line: lineNumber,
          rule: 'backdrop-filter',
          content: trimmedLine,
          severity: 'error',
          message: 'Missing -webkit-backdrop-filter prefix for Safari compatibility'
        });
      }
      
      // 检查 min-width: fit-content
      if (trimmedLine.includes('min-width: fit-content') && !content.includes('min-width: -webkit-fill-available')) {
        issues.push({
          file: relativePath,
          line: lineNumber,
          rule: 'min-width: fit-content',
          content: trimmedLine,
          severity: 'warning',
          message: 'Missing -webkit-fill-available fallback for Samsung Internet'
        });
      }
      
      // 检查 scrollbar-width
      if (trimmedLine.includes('scrollbar-width:') && !content.includes('::-webkit-scrollbar')) {
        issues.push({
          file: relativePath,
          line: lineNumber,
          rule: 'scrollbar-width',
          content: trimmedLine,
          severity: 'info',
          message: 'Missing ::-webkit-scrollbar rule for Webkit browsers'
        });
      }
    });
  });
  
  return issues;
}

/**
 * 生成修复建议
 */
function generateFixSuggestions(issues) {
  const suggestions = {};
  
  issues.forEach(issue => {
    if (!suggestions[issue.file]) {
      suggestions[issue.file] = [];
    }
    
    const rule = COMPATIBILITY_RULES[issue.rule];
    if (rule) {
      suggestions[issue.file].push({
        line: issue.line,
        rule: issue.rule,
        current: issue.content,
        suggestions: rule.prefixes || rule.fallbacks || rule.alternatives,
        description: rule.description
      });
    }
  });
  
  return suggestions;
}

/**
 * 显示检查结果
 */
function displayResults(issues, suggestions) {
  if (issues.length === 0) {
    console.log('✅ 所有CSS文件都通过了兼容性检查！');
    return;
  }
  
  console.log(`❌ 发现 ${issues.length} 个兼容性问题:\n`);
  
  // 按严重程度分组
  const errorIssues = issues.filter(i => i.severity === 'error');
  const warningIssues = issues.filter(i => i.severity === 'warning');
  const infoIssues = issues.filter(i => i.severity === 'info');
  
  if (errorIssues.length > 0) {
    console.log('🚨 错误 (必须修复):');
    errorIssues.forEach(issue => {
      console.log(`  ${issue.file}:${issue.line} - ${issue.message}`);
      console.log(`    ${issue.content}`);
    });
    console.log();
  }
  
  if (warningIssues.length > 0) {
    console.log('⚠️  警告 (建议修复):');
    warningIssues.forEach(issue => {
      console.log(`  ${issue.file}:${issue.line} - ${issue.message}`);
      console.log(`    ${issue.content}`);
    });
    console.log();
  }
  
  if (infoIssues.length > 0) {
    console.log('ℹ️  信息 (可选修复):');
    infoIssues.forEach(issue => {
      console.log(`  ${issue.file}:${issue.line} - ${issue.message}`);
      console.log(`    ${issue.content}`);
    });
    console.log();
  }
  
  // 显示修复建议
  console.log('🔧 修复建议:\n');
  Object.entries(suggestions).forEach(([file, fileSuggestions]) => {
    console.log(`📄 ${file}:`);
    fileSuggestions.forEach(suggestion => {
      console.log(`  第${suggestion.line}行: ${suggestion.description}`);
      console.log(`    当前: ${suggestion.current}`);
      console.log(`    建议: ${suggestion.suggestions.join(', ')}`);
      console.log();
    });
  });
}

/**
 * 生成兼容性报告
 */
function generateReport(issues, suggestions) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: glob.sync(CSS_PATTERN).length,
      totalIssues: issues.length,
      errorCount: issues.filter(i => i.severity === 'error').length,
      warningCount: issues.filter(i => i.severity === 'warning').length,
      infoCount: issues.filter(i => i.severity === 'info').length
    },
    issues,
    suggestions
  };
  
  const reportPath = path.join(PROJECT_ROOT, 'css-compatibility-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📊 详细报告已保存到: ${path.relative(PROJECT_ROOT, reportPath)}`);
}

/**
 * 主函数
 */
function main() {
  try {
    const issues = checkCSSCompatibility();
    const suggestions = generateFixSuggestions(issues);
    
    displayResults(issues, suggestions);
    generateReport(issues, suggestions);
    
    // 设置退出码
    const hasErrors = issues.some(i => i.severity === 'error');
    process.exit(hasErrors ? 1 : 0);
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  checkCSSCompatibility,
  generateFixSuggestions,
  COMPATIBILITY_RULES
};
