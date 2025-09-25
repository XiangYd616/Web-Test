/**
 * 侧边栏路由和页面一致性检查脚本
 * 检查ModernSidebar中的路由是否都有对应的页面组件和路由配置
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从ModernSidebar.tsx提取的路由配置
const sidebarRoutes = [
  // 仪表板
  { id: 'dashboard', name: '仪表板', href: '/' },

  // 测试工具
  { id: 'website-test', name: '网站测试', href: '/website-test' },
  { id: 'stress-test', name: '压力测试', href: '/stress-test' },
  { id: 'seo-test', name: 'SEO测试', href: '/seo-test' },
  { id: 'security-test', name: '安全测试', href: '/security-test' },
  { id: 'performance-test', name: '性能测试', href: '/performance-test' },
  { id: 'compatibility-test', name: '兼容性测试', href: '/compatibility-test' },
  { id: 'api-test', name: 'API测试', href: '/api-test' },
  { id: 'network-test', name: '网络测试', href: '/network-test' },
  { id: 'database-test', name: '数据库测试', href: '/database-test' },
  { id: 'ux-test', name: 'UX测试', href: '/ux-test' },
  { id: 'unified-test', name: '统一测试引擎', href: '/unified-test' },

  // 数据管理
  { id: 'test-history', name: '测试历史', href: '/test-history' },
  { id: 'statistics', name: '统计分析', href: '/statistics' },
  { id: 'data-center', name: '数据中心', href: '/data-center' },

  // 集成配置
  { id: 'cicd', name: 'CI/CD集成', href: '/cicd' },
  { id: 'api-keys', name: 'API密钥', href: '/api-keys' },
  { id: 'webhooks', name: 'Webhooks', href: '/webhooks' },
  { id: 'integrations', name: '第三方集成', href: '/integrations' },

  // 系统设置
  { id: 'settings', name: '系统设置', href: '/settings' }
];

// 页面文件映射
const pageFileMapping = {
  '/': 'dashboard/ModernDashboard.tsx',
  '/website-test': 'WebsiteTest.tsx',
  '/stress-test': 'StressTest.tsx',
  '/seo-test': 'SEOTest.tsx',
  '/security-test': 'SecurityTest.tsx',
  '/performance-test': 'PerformanceTest.tsx',
  '/compatibility-test': 'CompatibilityTest.tsx',
  '/api-test': 'APITest.tsx',
  '/network-test': 'NetworkTest.tsx',
  '/database-test': 'DatabaseTest.tsx',
  '/ux-test': 'UXTest.tsx',
  '/unified-test': 'UnifiedTestPage.tsx',
  '/test-history': 'TestHistory.tsx',
  '/statistics': 'Statistics.tsx',
  '/data-center': null, // 需要创建
  '/cicd': 'CICDIntegration.tsx',
  '/api-keys': 'APIKeys.tsx',
  '/webhooks': 'Webhooks.tsx',
  '/integrations': 'Integrations.tsx',
  '/settings': 'admin/Settings.tsx'
};

/**
 * 检查页面文件是否存在
 */
function checkPageExists(pagePath) {
  if (!pagePath) return false;

  const fullPath = path.join(__dirname, '../frontend/pages', pagePath);
  return fs.existsSync(fullPath);
}

/**
 * 检查路由配置是否存在
 */
function checkRouteConfigExists(routePath) {
  const appRoutesPath = path.join(__dirname, '../frontend/components/routing/AppRoutes.tsx');

  if (!fs.existsSync(appRoutesPath)) {
    return false;
  }

  const content = fs.readFileSync(appRoutesPath, 'utf8');

  // 检查路由是否在AppRoutes.tsx中定义
  const routePattern = new RegExp(`path="${routePath.replace('/', '')}"`, 'g');
  const indexPattern = new RegExp(`path="/".*element.*ModernDashboard`, 's');

  if (routePath === '/') {
    return indexPattern.test(content);
  }

  return routePattern.test(content);
}

/**
 * 获取页面目录中的所有文件
 */
function getAllPageFiles() {
  const pagesDir = path.join(__dirname, '../frontend/pages');
  const files = [];

  function scanDirectory(dir, prefix = '') {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relativePath = prefix ? `${prefix}/${item}` : item;

      if (fs.statSync(fullPath).isDirectory()) {
        scanDirectory(fullPath, relativePath);
      } else if (item.endsWith('.tsx') && !item.includes('.backup')) {
        files.push(relativePath);
      }
    }
  }

  scanDirectory(pagesDir);
  return files;
}

/**
 * 主检查函数
 */
function checkRoutesConsistency() {
  console.log('🔍 开始侧边栏路由和页面一致性检查...\n');

  const results = {
    total: sidebarRoutes.length,
    valid: 0,
    missing: [],
    missingRoutes: [],
    orphanedPages: [],
    backupFiles: []
  };

  // 1. 检查侧边栏路由对应的页面
  sidebarRoutes.forEach(route => {
    const pagePath = pageFileMapping[route.href];
    const pageExists = checkPageExists(pagePath);
    const routeExists = checkRouteConfigExists(route.href);


    if (pageExists && routeExists) {
      results.valid++;
    } else {
      if (!pageExists) {
        results.missing.push({
          route: route.href,
          name: route.name,
          expectedFile: pagePath || '未定义'
        });
      }
      if (!routeExists) {
        results.missingRoutes.push({
          route: route.href,
          name: route.name
        });
      }
    }
  });

  // 2. 检查孤立的页面文件
  const allPageFiles = getAllPageFiles();
  const usedPageFiles = Object.values(pageFileMapping).filter(Boolean);

  allPageFiles.forEach(file => {
    if (!usedPageFiles.includes(file)) {
      // 检查是否是备份文件
      if (file.includes('.backup') || file.includes('Refactored') || file.includes('Demo')) {
        results.backupFiles.push(file);
      } else {
        results.orphanedPages.push(file);
      }
    }
  });

  // 3. 生成报告

  // 4. 详细问题列表
  if (results.missing.length > 0) {
    results.missing.forEach(item => {
    });
  }

  if (results.missingRoutes.length > 0) {
    results.missingRoutes.forEach(item => {
    });
  }

  if (results.orphanedPages.length > 0) {
    results.orphanedPages.forEach(file => {
    });
  }

  if (results.backupFiles.length > 0) {
    results.backupFiles.forEach(file => {
    });
  }

  // 5. 建议
  if (results.missing.length > 0) {
  }
  if (results.missingRoutes.length > 0) {
  }
  if (results.backupFiles.length > 0) {
  }
  if (results.orphanedPages.length > 0) {
  }


  return results;
}

// 执行检查
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const results = checkRoutesConsistency();

    // 输出JSON格式的结果供其他脚本使用
    const outputPath = path.join(__dirname, 'route-consistency-report.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

    process.exit(results.missing.length === 0 && results.missingRoutes.length === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  }
}

export { checkRoutesConsistency };
