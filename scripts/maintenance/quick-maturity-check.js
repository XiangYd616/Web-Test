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
  console.log('📊 快速成熟度检查报告');
  
  // 缺失文件
  if (issues.missing.length > 0) {
    issues.missing.forEach(item => {
    });
  } else {
  }
  
  // 占位符
  if (issues.placeholders.length > 0) {
    const totalTodos = issues.placeholders.reduce((sum, p) => sum + p.todos, 0);
    const totalPlaceholders = issues.placeholders.reduce((sum, p) => sum + p.placeholders, 0);
    
    // 显示前5个文件
    issues.placeholders.slice(0, 5).forEach(p => {
    });
    if (issues.placeholders.length > 5) {
    }
  } else {
  }
  
  // 空文件
  if (issues.emptyFiles.length > 0) {
    issues.emptyFiles.slice(0, 3).forEach(f => {
    });
  }
  
  // 计算评分
  let score = 100;
  score -= issues.missing.length * 5;
  score -= issues.placeholders.length;
  score -= issues.emptyFiles.length * 2;
  score = Math.max(0, Math.min(100, score));
  
  
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
  
  
  return score;
}

main();
