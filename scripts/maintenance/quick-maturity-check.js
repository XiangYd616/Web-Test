#!/usr/bin/env node
/**
 * 快速项目成熟度检查
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const issues = {
  missing: [],
  placeholders: [],
  emptyFiles: [],
  suggestions: []
};

/**
 * 检查缺失的重要文件
 */
function checkMissingFiles() {
  const requiredFiles = [
    { path: 'LICENSE', description: '许可证文件' },
    { path: 'docs/API.md', description: 'API文档' },
    { path: 'docs/DEPLOYMENT.md', description: '部署文档' },
    { path: 'docs/CONTRIBUTING.md', description: '贡献指南' },
    { path: 'tests/unit', description: '单元测试目录' },
    { path: 'tests/integration', description: '集成测试目录' },
    { path: 'tests/e2e', description: '端到端测试目录' }
  ];
  
  requiredFiles.forEach(({ path: filePath, description }) => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) {
      issues.missing.push({ path: filePath, description });
    }
  });
}

/**
 * 快速扫描占位符
 */
function quickPlaceholderScan() {
  const dirsToScan = [
    'frontend/components/auth',
    'frontend/pages',
    'backend/routes',
    'backend/services'
  ];
  
  dirsToScan.forEach(dir => {
    const fullDir = path.join(__dirname, '..', dir);
    if (fs.existsSync(fullDir)) {
      const files = fs.readdirSync(fullDir);
      files.forEach(file => {
        if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx')) {
          const filePath = path.join(fullDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          
          // 检查关键占位符
          const todoCount = (content.match(/TODO/gi) || []).length;
          const placeholderCount = (content.match(/placeholder|待实现|开发中/gi) || []).length;
          
          if (todoCount > 0 || placeholderCount > 0) {
            issues.placeholders.push({
              file: path.relative(path.join(__dirname, '..'), filePath),
              todos: todoCount,
              placeholders: placeholderCount
            });
          }
          
          // 检查空文件
          if (content.trim().length < 100) {
            issues.emptyFiles.push(path.relative(path.join(__dirname, '..'), filePath));
          }
        }
      });
    }
  });
}

/**
 * 生成报告
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 快速成熟度检查报告');
  console.log('='.repeat(60));
  
  // 缺失文件
  console.log('\n📁 缺失的重要文件:');
  if (issues.missing.length > 0) {
    issues.missing.forEach(item => {
      console.log(`  ❌ ${item.path}: ${item.description}`);
    });
  } else {
    console.log('  ✅ 所有重要文件都存在');
  }
  
  // 占位符
  console.log('\n📝 包含占位符的文件:');
  if (issues.placeholders.length > 0) {
    const totalTodos = issues.placeholders.reduce((sum, p) => sum + p.todos, 0);
    const totalPlaceholders = issues.placeholders.reduce((sum, p) => sum + p.placeholders, 0);
    console.log(`  总计: ${totalTodos} 个TODO, ${totalPlaceholders} 个占位符`);
    
    // 显示前5个文件
    issues.placeholders.slice(0, 5).forEach(p => {
      console.log(`  - ${p.file}: ${p.todos} TODO, ${p.placeholders} 占位符`);
    });
    if (issues.placeholders.length > 5) {
      console.log(`  ... 还有 ${issues.placeholders.length - 5} 个文件`);
    }
  } else {
    console.log('  ✅ 没有发现占位符');
  }
  
  // 空文件
  if (issues.emptyFiles.length > 0) {
    console.log(`\n⚠️  可能为空或过小的文件: ${issues.emptyFiles.length} 个`);
    issues.emptyFiles.slice(0, 3).forEach(f => {
      console.log(`  - ${f}`);
    });
  }
  
  // 计算评分
  let score = 100;
  score -= issues.missing.length * 5;
  score -= issues.placeholders.length;
  score -= issues.emptyFiles.length * 2;
  score = Math.max(0, Math.min(100, score));
  
  console.log('\n' + '='.repeat(60));
  console.log(`🎯 快速评分: ${score}%`);
  
  return score;
}

// 主函数
function main() {
  console.log('🔍 开始快速成熟度检查...\n');
  
  checkMissingFiles();
  quickPlaceholderScan();
  
  const score = generateReport();
  
  // 保存报告
  const report = {
    score,
    issues,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(__dirname, '..', 'docs', 'quick-maturity-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📄 报告已保存到: docs/quick-maturity-report.json');
  
  return score;
}

main();
