#!/usr/bin/env node
/**
 * 路由结构分析脚本
 * 检查路由文件、注册状态、缺失文件等问题
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROUTES_DIR = path.join(__dirname, 'backend', 'routes');
const APP_JS = path.join(__dirname, 'backend', 'src', 'app.js');

// 分析结果
const analysis = {
  totalFiles: 0,
  registeredRoutes: [],
  unregisteredFiles: [],
  missingFiles: [],
  unusedDirs: [],
  errors: [],
  warnings: []
};

// 1. 扫描所有路由文件
console.log('🔍 扫描路由文件...\n');

function scanDirectory(dir, relativePath = '') {
  const items = fs.readdirSync(dir);
  const files = [];

  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stats = fs.statSync(fullPath);
    const relative = relativePath ? `${relativePath}/${item}` : item;

    if (stats.isDirectory()) {
      if (item === '.backup' || item === 'node_modules') return;
      files.push(...scanDirectory(fullPath, relative));
    } else if (item.endsWith('.js')) {
      files.push(relative);
    }
  });

  return files;
}

const allRouteFiles = scanDirectory(ROUTES_DIR);
analysis.totalFiles = allRouteFiles.length;

console.log(`📁 找到 ${allRouteFiles.length} 个路由文件\n`);

// 2. 读取 app.js 并分析注册的路由
const appJsContent = fs.readFileSync(APP_JS, 'utf-8');

// 匹配 app.use 和 require 语句
const useRegex = /app\.use\(['"]([^'"]+)['"]/g;
const requireRegex = /require\(['"]\.\.\/routes\/([^'"]+)['"]\)/g;

let match;
const usedPaths = [];
const requiredFiles = [];

while ((match = useRegex.exec(appJsContent)) !== null) {
  usedPaths.push(match[1]);
}

while ((match = requireRegex.exec(appJsContent)) !== null) {
  requiredFiles.push(match[1]);
}

// 标准化路由文件路径
const normalizedRequiredFiles = requiredFiles.map(f => {
  if (f.endsWith('.js')) return f;
  if (fs.existsSync(path.join(ROUTES_DIR, `${f}.js`))) return `${f}.js`;
  if (fs.existsSync(path.join(ROUTES_DIR, f, 'index.js'))) return `${f}/index.js`;
  return f;
});

// 3. 分析注册状态
console.log('📊 分析路由注册状态...\n');

// 已注册的路由
usedPaths.forEach((route, index) => {
  const file = normalizedRequiredFiles[index] || '未知';
  analysis.registeredRoutes.push({ route, file });
});

// 未注册的文件
allRouteFiles.forEach(file => {
  const isRegistered = normalizedRequiredFiles.some(rf => {
    return rf === file || rf.replace(/\.js$/, '') === file.replace(/\.js$/, '');
  });

  if (!isRegistered) {
    analysis.unregisteredFiles.push(file);
  }
});

// 缺失的文件
normalizedRequiredFiles.forEach(file => {
  const exists = allRouteFiles.some(af => {
    return af === file || af.replace(/\.js$/, '') === file.replace(/\.js$/, '');
  });

  if (!exists && !file.includes('index.js')) {
    analysis.missingFiles.push(file);
  }
});

// 4. 输出报告
console.log('═══════════════════════════════════════════════════\n');
console.log('📋 路由结构分析报告\n');
console.log('═══════════════════════════════════════════════════\n');

console.log(`✅ 已注册路由 (${analysis.registeredRoutes.length} 个):\n`);
analysis.registeredRoutes.forEach(({ route, file }) => {
  console.log(`   ${route.padEnd(20)} ← ${file}`);
});

console.log(`\n⚠️  未注册路由文件 (${analysis.unregisteredFiles.length} 个):\n`);
if (analysis.unregisteredFiles.length > 0) {
  analysis.unregisteredFiles.forEach(file => {
    console.log(`   ❌ ${file}`);
  });
} else {
  console.log('   (无)');
}

if (analysis.missingFiles.length > 0) {
  console.log(`\n❌ 缺失的路由文件 (${analysis.missingFiles.length} 个):\n`);
  analysis.missingFiles.forEach(file => {
    console.log(`   🔴 ${file} (在 app.js 中被引用但文件不存在)`);
  });
}

console.log('\n═══════════════════════════════════════════════════\n');

// 5. 统计信息
console.log('📊 统计信息:\n');
console.log(`   总路由文件:    ${analysis.totalFiles}`);
console.log(`   已注册路由:    ${analysis.registeredRoutes.length}`);
console.log(`   未注册文件:    ${analysis.unregisteredFiles.length}`);
console.log(`   缺失文件:      ${analysis.missingFiles.length}`);
console.log(`   路由利用率:    ${Math.round((analysis.registeredRoutes.length / analysis.totalFiles) * 100)}%`);

console.log('\n═══════════════════════════════════════════════════\n');

// 6. 建议
console.log('💡 建议:\n');

if (analysis.unregisteredFiles.length > 42) {
  console.log('   🔴 严重冗余: 超过 40 个路由文件未被使用');
  console.log('   ➜ 建议: 清理或归档这些文件\n');
}

if (analysis.missingFiles.length > 0) {
  console.log('   🔴 缺失文件: 有被引用但不存在的路由文件');
  console.log('   ➜ 建议: 创建这些文件或移除引用\n');
}

if (analysis.registeredRoutes.length / analysis.totalFiles < 0.3) {
  console.log('   ⚠️  低利用率: 路由利用率低于30%');
  console.log('   ➜ 建议: 考虑清理未使用的路由文件\n');
}

// 7. 生成 JSON 报告
const reportPath = path.join(__dirname, 'route-analysis-report.json');
fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
console.log(`📄 详细报告已保存到: ${reportPath}\n`);

// 8. 退出码
const exitCode = (analysis.missingFiles.length > 0 || analysis.errors.length > 0) ? 1 : 0;
process.exit(exitCode);

