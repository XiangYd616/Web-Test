#!/usr/bin/env node
/**
 * 未注册路由审查脚本
 * 智能分析每个未注册的路由文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROUTES_DIR = path.join(__dirname, 'backend', 'routes');

// 未注册文件列表（排除备份）
const unregisteredFiles = [
  'accessibility.js',
  'analytics.js',
  'automation.js',
  'batch.js',
  'cache.js',
  'clients.js',
  'config.js',
  'content.js',
  'core.js',
  'data.js',
  'database.js',
  'databaseHealth.js',
  'dataExport.js',
  'dataImport.js',
  'documentation.js',
  'engines/k6.js',
  'engines/lighthouse.js',
  'engineStatus.js',
  'environments.js',
  'errorManagement.js',
  'infrastructure.js',
  'mfa.js',
  'network.js',
  'oauth.js',
  'regression.js',
  'scheduler.js',
  'services.js',
  'storageManagement.js',
  'stress.js',
  'ux.js',
  'website.js'
];

// 分析结果
const analysis = {
  total: unregisteredFiles.length,
  checked: 0,
  details: [],
  recommendations: {
    register: [],
    integrate: [],
    delete: [],
    keep: []
  }
};

console.log('🔍 开始审查未注册路由文件...\n');
console.log(`📁 总共 ${analysis.total} 个文件需要审查\n`);

// 分析单个文件
function analyzeFile(filename) {
  const filePath = path.join(ROUTES_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    return {
      filename,
      exists: false,
      decision: 'delete',
      reason: '文件不存在'
    };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const firstLines = lines.slice(0, 30).join('\n');
  
  // 统计信息
  const stats = {
    lines: lines.length,
    routes: (content.match(/router\.(get|post|put|delete|patch)/g) || []).length,
    hasExport: content.includes('module.exports'),
    hasRouter: content.includes('express.Router()'),
    hasImports: (content.match(/require\(/g) || []).length
  };

  // 提取注释
  const commentMatch = firstLines.match(/\/\*\*([\s\S]*?)\*\//);
  const description = commentMatch ? commentMatch[1].trim() : '';

  // 决策逻辑
  let decision = 'keep';
  let reason = '';
  let priority = 'low';

  // 规则1: 已在 engines/ 目录下的子路由
  if (filename.startsWith('engines/')) {
    decision = 'keep';
    reason = '引擎子路由，已由 engines/index.js 管理';
    priority = 'info';
  }
  // 规则2: 空文件或示例文件
  else if (stats.lines < 20 || filename.includes('Example')) {
    decision = 'delete';
    reason = '文件内容过少或为示例文件';
    priority = 'low';
  }
  // 规则3: 重复功能
  else if (
    (filename === 'stress.js' && fs.existsSync(path.join(ROUTES_DIR, 'test.js'))) ||
    (filename === 'engineStatus.js' && fs.existsSync(path.join(ROUTES_DIR, 'engines')))
  ) {
    decision = 'delete';
    reason = '功能与现有路由重复';
    priority = 'medium';
  }
  // 规则4: 应集成到已有路由
  else if (['oauth.js', 'mfa.js'].includes(filename)) {
    decision = 'integrate';
    reason = '应集成到 auth.js';
    priority = 'medium';
  }
  else if (['dataExport.js', 'dataImport.js', 'data.js'].includes(filename)) {
    decision = 'integrate';
    reason = '应统一到数据管理路由';
    priority = 'medium';
  }
  else if (['databaseHealth.js', 'database.js'].includes(filename)) {
    decision = 'integrate';
    reason = '应集成到 system.js 或 /health';
    priority = 'low';
  }
  else if (['config.js', 'environments.js', 'infrastructure.js', 'services.js'].includes(filename)) {
    decision = 'integrate';
    reason = '应集成到 system.js';
    priority = 'low';
  }
  // 规则5: 应该注册为独立路由
  else if (stats.routes > 5 && stats.hasRouter) {
    decision = 'register';
    reason = `包含 ${stats.routes} 个路由，应独立注册`;
    priority = 'high';
  }
  // 规则6: 可能有用但不确定
  else if (stats.routes > 0) {
    decision = 'keep';
    reason = '包含路由定义，需要进一步评估';
    priority = 'medium';
  }

  return {
    filename,
    exists: true,
    stats,
    description: description.substring(0, 100),
    decision,
    reason,
    priority
  };
}

// 分析所有文件
console.log('═══════════════════════════════════════════════════\n');

unregisteredFiles.forEach((file, index) => {
  const result = analyzeFile(file);
  analysis.details.push(result);
  analysis.checked++;

  // 分类
  if (result.decision) {
    analysis.recommendations[result.decision].push(result);
  }

  // 显示进度
  if ((index + 1) % 10 === 0) {
    console.log(`进度: ${index + 1}/${analysis.total} (${Math.round((index + 1) / analysis.total * 100)}%)`);
  }
});

console.log(`\n✅ 审查完成: ${analysis.checked}/${analysis.total} 个文件\n`);

// 输出报告
console.log('═══════════════════════════════════════════════════\n');
console.log('📋 审查报告\n');
console.log('═══════════════════════════════════════════════════\n');

// 应注册的路由
console.log(`🟢 应该注册为独立路由 (${analysis.recommendations.register.length} 个):\n`);
analysis.recommendations.register
  .sort((a, b) => b.stats.routes - a.stats.routes)
  .forEach(item => {
    console.log(`   ✓ ${item.filename.padEnd(30)} (${item.stats.routes} 路由, ${item.stats.lines} 行)`);
    console.log(`     理由: ${item.reason}\n`);
  });

// 应集成的路由
console.log(`🟡 应该集成到现有路由 (${analysis.recommendations.integrate.length} 个):\n`);
analysis.recommendations.integrate.forEach(item => {
  console.log(`   → ${item.filename.padEnd(30)}`);
  console.log(`     理由: ${item.reason}\n`);
});

// 应删除的文件
console.log(`🔴 建议删除 (${analysis.recommendations.delete.length} 个):\n`);
analysis.recommendations.delete.forEach(item => {
  console.log(`   ✗ ${item.filename.padEnd(30)}`);
  console.log(`     理由: ${item.reason}\n`);
});

// 需要保留评估
console.log(`⚪ 保留待评估 (${analysis.recommendations.keep.length} 个):\n`);
analysis.recommendations.keep.forEach(item => {
  console.log(`   ? ${item.filename.padEnd(30)} (${item.stats.routes} 路由)`);
  console.log(`     理由: ${item.reason}\n`);
});

console.log('═══════════════════════════════════════════════════\n');

// 统计摘要
console.log('📊 统计摘要:\n');
console.log(`   应注册:    ${analysis.recommendations.register.length} 个`);
console.log(`   应集成:    ${analysis.recommendations.integrate.length} 个`);
console.log(`   应删除:    ${analysis.recommendations.delete.length} 个`);
console.log(`   待评估:    ${analysis.recommendations.keep.length} 个\n`);

// 预估工作量
const workload = {
  register: analysis.recommendations.register.length * 0.5, // 每个0.5小时
  integrate: analysis.recommendations.integrate.length * 1,  // 每个1小时
  delete: analysis.recommendations.delete.length * 0.1,      // 每个0.1小时
  evaluate: analysis.recommendations.keep.length * 0.5       // 每个0.5小时
};

const totalHours = Object.values(workload).reduce((a, b) => a + b, 0);

console.log('⏱️  预估工作量:\n');
console.log(`   注册路由: ${workload.register.toFixed(1)} 小时`);
console.log(`   集成路由: ${workload.integrate.toFixed(1)} 小时`);
console.log(`   删除文件: ${workload.delete.toFixed(1)} 小时`);
console.log(`   评估文件: ${workload.evaluate.toFixed(1)} 小时`);
console.log(`   总计:     ${totalHours.toFixed(1)} 小时 (约 ${Math.ceil(totalHours / 8)} 天)\n`);

console.log('═══════════════════════════════════════════════════\n');

// 保存详细报告
const reportPath = path.join(__dirname, 'unregistered-routes-audit.json');
fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
console.log(`📄 详细报告已保存到: ${reportPath}\n`);

// 生成行动计划
console.log('💡 建议的执行顺序:\n');
console.log('   1. 删除确认不需要的文件 (最快见效)');
console.log('   2. 集成简单的路由到现有文件');
console.log('   3. 注册独立的路由文件');
console.log('   4. 评估待定文件\n');

console.log('✅ 审查完成!\n');

