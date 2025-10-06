#!/usr/bin/env node
/**
 * test.js 路由分类分析脚本
 * 分析并分类所有路由端点
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_FILE = path.join(__dirname, 'backend', 'routes', 'test.js');

// 路由分类规则
const ROUTE_CATEGORIES = {
  engines: {
    patterns: ['/k6/', '/lighthouse/', '/playwright/', '/engines/', '/engine/'],
    name: '测试引擎管理'
  },
  stress: {
    patterns: ['/stress', '/load', '/performance-test'],
    name: '压力测试'
  },
  api: {
    patterns: ['/api-test', '/endpoint', '/request'],
    name: 'API测试'
  },
  seo: {
    patterns: ['/seo', '/meta', '/sitemap', '/robots'],
    name: 'SEO测试'
  },
  security: {
    patterns: ['/security', '/vulnerability', '/xss', '/sql-injection'],
    name: '安全测试'
  },
  compatibility: {
    patterns: ['/compatibility', '/browser', '/cross-browser'],
    name: '兼容性测试'
  },
  accessibility: {
    patterns: ['/accessibility', '/a11y', '/wcag'],
    name: '可访问性测试'
  },
  ux: {
    patterns: ['/ux', '/user-experience'],
    name: 'UX测试'
  },
  history: {
    patterns: ['/history', '/records'],
    name: '测试历史'
  },
  cache: {
    patterns: ['/cache'],
    name: '缓存管理'
  },
  config: {
    patterns: ['/config', '/templates', '/settings'],
    name: '配置管理'
  },
  queue: {
    patterns: ['/queue'],
    name: '队列管理'
  },
  general: {
    patterns: ['/status', '/statistics', '/run', '/:testId'],
    name: '通用测试'
  }
};

// 分析结果
const analysis = {
  totalLines: 0,
  totalRoutes: 0,
  categories: {},
  uncategorized: [],
  imports: [],
  helpers: []
};

// 初始化分类
Object.keys(ROUTE_CATEGORIES).forEach(key => {
  analysis.categories[key] = {
    name: ROUTE_CATEGORIES[key].name,
    routes: [],
    count: 0
  };
});

console.log('🔍 分析 test.js 路由结构...\n');

// 读取文件
const content = fs.readFileSync(TEST_FILE, 'utf-8');
const lines = content.split('\n');
analysis.totalLines = lines.length;

console.log(`📁 文件总行数: ${analysis.totalLines}\n`);

// 提取所有路由
const routeRegex = /router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g;
let match;
const routes = [];

while ((match = routeRegex.exec(content)) !== null) {
  routes.push({
    method: match[1].toUpperCase(),
    path: match[2],
    line: content.substring(0, match.index).split('\n').length
  });
}

analysis.totalRoutes = routes.length;
console.log(`📊 找到 ${routes.length} 个路由端点\n`);

// 分类路由
routes.forEach(route => {
  let categorized = false;

  for (const [categoryKey, category] of Object.entries(ROUTE_CATEGORIES)) {
    for (const pattern of category.patterns) {
      if (route.path.includes(pattern) || route.path.startsWith(pattern)) {
        analysis.categories[categoryKey].routes.push(route);
        analysis.categories[categoryKey].count++;
        categorized = true;
        break;
      }
    }
    if (categorized) break;
  }

  if (!categorized) {
    analysis.uncategorized.push(route);
  }
});

// 分析导入语句
const importRegex = /(const|import)\s+(\{[^}]+\}|[\w]+)\s*=\s*require\(['"]([^'"]+)['"]\)/g;
while ((match = importRegex.exec(content)) !== null) {
  analysis.imports.push({
    name: match[2].trim(),
    path: match[3]
  });
}

// 输出分析报告
console.log('═══════════════════════════════════════════════════');
console.log('📋 test.js 路由分类报告');
console.log('═══════════════════════════════════════════════════\n');

console.log('📊 统计信息:\n');
console.log(`   总行数:        ${analysis.totalLines}`);
console.log(`   总路由数:      ${analysis.totalRoutes}`);
console.log(`   已分类:        ${analysis.totalRoutes - analysis.uncategorized.length}`);
console.log(`   未分类:        ${analysis.uncategorized.length}`);
console.log(`   导入模块:      ${analysis.imports.length}\n`);

console.log('📂 路由分类详情:\n');

// 按数量排序
const sortedCategories = Object.entries(analysis.categories)
  .sort((a, b) => b[1].count - a[1].count)
  .filter(([_, cat]) => cat.count > 0);

sortedCategories.forEach(([key, category]) => {
  console.log(`   ${category.name} (${category.count} 个):`);
  category.routes.forEach(route => {
    console.log(`      ${route.method.padEnd(6)} ${route.path.padEnd(40)} (line ${route.line})`);
  });
  console.log('');
});

if (analysis.uncategorized.length > 0) {
  console.log(`   ⚠️  未分类路由 (${analysis.uncategorized.length} 个):`);
  analysis.uncategorized.forEach(route => {
    console.log(`      ${route.method.padEnd(6)} ${route.path.padEnd(40)} (line ${route.line})`);
  });
  console.log('');
}

console.log('═══════════════════════════════════════════════════\n');

// 生成拆分建议
console.log('💡 拆分建议:\n');

const recommendations = [];

sortedCategories.forEach(([key, category]) => {
  if (category.count > 0) {
    recommendations.push({
      file: `tests/${key}.js`,
      routes: category.count,
      name: category.name,
      priority: category.count > 10 ? 'high' : category.count > 5 ? 'medium' : 'low'
    });
  }
});

// 按优先级分组
const highPriority = recommendations.filter(r => r.priority === 'high');
const mediumPriority = recommendations.filter(r => r.priority === 'medium');
const lowPriority = recommendations.filter(r => r.priority === 'low');

if (highPriority.length > 0) {
  console.log('   🔴 高优先级拆分 (>10 路由):');
  highPriority.forEach(r => {
    console.log(`      → ${r.file.padEnd(30)} ${r.routes} 个路由 - ${r.name}`);
  });
  console.log('');
}

if (mediumPriority.length > 0) {
  console.log('   🟡 中优先级拆分 (5-10 路由):');
  mediumPriority.forEach(r => {
    console.log(`      → ${r.file.padEnd(30)} ${r.routes} 个路由 - ${r.name}`);
  });
  console.log('');
}

if (lowPriority.length > 0) {
  console.log('   🟢 低优先级拆分 (<5 路由):');
  lowPriority.forEach(r => {
    console.log(`      → ${r.file.padEnd(30)} ${r.routes} 个路由 - ${r.name}`);
  });
  console.log('');
}

console.log('═══════════════════════════════════════════════════\n');

// 共享代码分析
console.log('🔧 共享代码建议:\n');
console.log('   应提取到 tests/shared/:');
console.log('   → middleware.js     - 认证、限流等中间件');
console.log('   → validators.js     - URL验证、参数验证');
console.log('   → helpers.js        - 通用辅助函数');
console.log('   → engines.js        - 测试引擎实例管理\n');

console.log('═══════════════════════════════════════════════════\n');

// 预估工作量
const estimatedDays = Math.ceil(recommendations.length * 0.3);
console.log(`⏱️  预估工作量: ${estimatedDays} 天 (${recommendations.length} 个文件)\n`);

// 保存详细分析到JSON
const reportPath = path.join(__dirname, 'test-routes-analysis.json');
fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
console.log(`📄 详细分析已保存到: ${reportPath}\n`);

console.log('✅ 分析完成!\n');

