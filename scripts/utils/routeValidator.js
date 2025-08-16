/**
 * 路由验证器 - 检查项目中的路由问题
 * 检查无用路由、错误路由、缺失页面等问题
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PAGES_DIR = path.join(PROJECT_ROOT, 'frontend/pages');
const ROUTES_FILE = path.join(PROJECT_ROOT, 'frontend/components/tools/AppRoutes.tsx');
const ROUTE_UTILS_FILE = path.join(PROJECT_ROOT, 'frontend/utils/routeUtils.ts');

// 验证结果
const validationResults = {
  missingPages: [],
  unusedPages: [],
  invalidRoutes: [],
  duplicateRoutes: [],
  routeConfigMismatches: [],
  errors: []
};

/**
 * 获取所有页面文件
 */
function getAllPageFiles() {
  const pageFiles = new Set();

  function scanDirectory(dir, relativePath = '') {
    try {
      const items = fs.readdirSync(dir);

      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const itemRelativePath = path.join(relativePath, item);

        if (fs.statSync(fullPath).isDirectory()) {
          scanDirectory(fullPath, itemRelativePath);
        } else if (item.endsWith('.tsx') && !item.endsWith('.test.tsx')) {
          // 移除扩展名，转换为组件名
          const componentName = item.replace('.tsx', '');
          pageFiles.add({
            name: componentName,
            path: itemRelativePath,
            fullPath: fullPath
          });
        }
      });
    } catch (error) {
      validationResults.errors.push(`扫描目录失败 ${dir}: ${error.message}`);
    }
  }

  scanDirectory(PAGES_DIR);
  return Array.from(pageFiles);
}

/**
 * 解析AppRoutes.tsx中的路由定义
 */
function parseAppRoutes() {
  const routes = {
    imports: [],
    routeDefinitions: [],
    lazyImports: []
  };

  try {
    const content = fs.readFileSync(ROUTES_FILE, 'utf8');

    // 提取懒加载导入
    const lazyImportRegex = /const\s+(\w+)\s+=\s+lazy\(\(\)\s*=>\s*import\(['"`]([^'"`]+)['"`]\)\);/g;
    let match;
    while ((match = lazyImportRegex.exec(content)) !== null) {
      routes.lazyImports.push({
        componentName: match[1],
        importPath: match[2]
      });
    }

    // 提取直接导入
    const directImportRegex = /import\s+(\w+)\s+from\s+['"`]([^'"`]+)['"`];/g;
    while ((match = directImportRegex.exec(content)) !== null) {
      routes.imports.push({
        componentName: match[1],
        importPath: match[2]
      });
    }

    // 提取路由定义
    const routeRegex = /<Route\s+path=['"`]([^'"`]+)['"`][^>]*>/g;
    while ((match = routeRegex.exec(content)) !== null) {
      routes.routeDefinitions.push(match[1]);
    }

  } catch (error) {
    validationResults.errors.push(`解析AppRoutes.tsx失败: ${error.message}`);
  }

  return routes;
}

/**
 * 解析routeUtils.ts中的路由配置
 */
function parseRouteUtils() {
  const routeConfigs = [];

  try {
    const content = fs.readFileSync(ROUTE_UTILS_FILE, 'utf8');

    // 提取路由配置
    const routeConfigRegex = /{\s*path:\s*['"`]([^'"`]+)['"`],\s*name:\s*['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = routeConfigRegex.exec(content)) !== null) {
      routeConfigs.push({
        path: match[1],
        name: match[2]
      });
    }

  } catch (error) {
    validationResults.errors.push(`解析routeUtils.ts失败: ${error.message}`);
  }

  return routeConfigs;
}

/**
 * 验证页面文件是否存在
 */
function validatePageFiles(routes) {
  const allImports = [...routes.lazyImports, ...routes.imports];

  allImports.forEach(importItem => {
    const { componentName, importPath } = importItem;

    // 转换导入路径为实际文件路径
    let actualPath = importPath;
    if (actualPath.startsWith('../../pages/')) {
      actualPath = actualPath.replace('../../pages/', '');
    }

    // 添加.tsx扩展名
    if (!actualPath.endsWith('.tsx')) {
      actualPath += '.tsx';
    }

    const fullPath = path.join(PAGES_DIR, actualPath);

    if (!fs.existsSync(fullPath)) {
      validationResults.missingPages.push({
        componentName,
        importPath,
        expectedPath: fullPath
      });
    }
  });
}

/**
 * 查找未使用的页面文件
 */
function findUnusedPages(pageFiles, routes) {
  const usedPages = new Set();

  // 收集所有被导入的页面
  [...routes.lazyImports, ...routes.imports].forEach(importItem => {
    const { importPath } = importItem;
    let actualPath = importPath;

    if (actualPath.startsWith('../../pages/')) {
      actualPath = actualPath.replace('../../pages/', '');
    }

    if (!actualPath.endsWith('.tsx')) {
      actualPath += '.tsx';
    }

    usedPages.add(actualPath);
  });

  // 查找未使用的页面
  pageFiles.forEach(pageFile => {
    if (!usedPages.has(pageFile.path)) {
      // 排除一些特殊文件
      const excludePatterns = [
        'index.ts',
        'index.tsx',
        '.test.tsx',
        '.spec.tsx'
      ];

      const shouldExclude = excludePatterns.some(pattern =>
        pageFile.path.includes(pattern)
      );

      if (!shouldExclude) {
        validationResults.unusedPages.push(pageFile);
      }
    }
  });
}

/**
 * 检查重复路由
 */
function checkDuplicateRoutes(routes) {
  const routeCounts = {};

  routes.routeDefinitions.forEach(route => {
    routeCounts[route] = (routeCounts[route] || 0) + 1;
  });

  Object.entries(routeCounts).forEach(([route, count]) => {
    if (count > 1) {
      validationResults.duplicateRoutes.push({
        route,
        count
      });
    }
  });
}

/**
 * 检查路由配置不匹配
 */
function checkRouteConfigMismatches(routes, routeConfigs) {
  // 标准化路径 - 将相对路径转换为绝对路径进行比较
  const normalizeRoute = (route) => {
    if (route.startsWith('/')) return route;
    return '/' + route;
  };

  const definedRoutes = new Set(routes.routeDefinitions.map(normalizeRoute));
  const configuredRoutes = new Set(routeConfigs.map(config => config.path));

  // 检查配置中有但路由定义中没有的
  configuredRoutes.forEach(configRoute => {
    if (!definedRoutes.has(configRoute)) {
      validationResults.routeConfigMismatches.push({
        type: 'configured_but_not_defined',
        route: configRoute
      });
    }
  });

  // 检查路由定义中有但配置中没有的（排除一些特殊路由）
  const excludeFromConfig = ['/login', '/register', '/', '/test', '/cicd'];
  definedRoutes.forEach(definedRoute => {
    // 排除动态路由和特殊路由
    const isDynamicRoute = definedRoute.includes(':');
    const isSpecialRoute = excludeFromConfig.includes(definedRoute);
    const isReportRoute = definedRoute.includes('-report');
    const isDemoRoute = definedRoute.includes('-demo');
    const isDetailRoute = definedRoute.includes('/:');

    if (!configuredRoutes.has(definedRoute) &&
      !isSpecialRoute &&
      !isDynamicRoute &&
      !isReportRoute &&
      !isDemoRoute &&
      !isDetailRoute) {
      validationResults.routeConfigMismatches.push({
        type: 'defined_but_not_configured',
        route: definedRoute
      });
    }
  });
}

/**
 * 生成验证报告
 */
function generateValidationReport() {
  const timestamp = new Date().toISOString();

  let report = `# 路由验证报告

**验证时间**: ${timestamp}

## 📋 验证概述

本次验证检查了项目中的路由配置、页面文件和路由定义的一致性。

`;

  // 缺失页面文件
  if (validationResults.missingPages.length > 0) {
    report += `## ❌ 缺失页面文件 (${validationResults.missingPages.length})

以下组件在路由中被引用，但对应的页面文件不存在：

`;
    validationResults.missingPages.forEach(item => {
      report += `- **${item.componentName}**: 导入路径 \`${item.importPath}\`，期望文件 \`${item.expectedPath}\`\n`;
    });
    report += '\n';
  }

  // 未使用的页面文件
  if (validationResults.unusedPages.length > 0) {
    report += `## 📄 未使用的页面文件 (${validationResults.unusedPages.length})

以下页面文件存在但未在路由中使用：

`;
    validationResults.unusedPages.forEach(page => {
      report += `- **${page.name}**: \`${page.path}\`\n`;
    });
    report += '\n';
  }

  // 重复路由
  if (validationResults.duplicateRoutes.length > 0) {
    report += `## 🔄 重复路由定义 (${validationResults.duplicateRoutes.length})

以下路由被定义了多次：

`;
    validationResults.duplicateRoutes.forEach(item => {
      report += `- **${item.route}**: 定义了 ${item.count} 次\n`;
    });
    report += '\n';
  }

  // 路由配置不匹配
  if (validationResults.routeConfigMismatches.length > 0) {
    report += `## ⚠️ 路由配置不匹配 (${validationResults.routeConfigMismatches.length})

路由定义与routeUtils.ts配置不一致：

`;
    validationResults.routeConfigMismatches.forEach(item => {
      if (item.type === 'configured_but_not_defined') {
        report += `- **${item.route}**: 在配置中存在但未定义路由\n`;
      } else {
        report += `- **${item.route}**: 已定义路由但未在配置中声明\n`;
      }
    });
    report += '\n';
  }

  // 错误记录
  if (validationResults.errors.length > 0) {
    report += `## ❌ 验证错误 (${validationResults.errors.length})

`;
    validationResults.errors.forEach(error => {
      report += `- ${error}\n`;
    });
    report += '\n';
  }

  // 验证总结
  const totalIssues = validationResults.missingPages.length +
    validationResults.unusedPages.length +
    validationResults.duplicateRoutes.length +
    validationResults.routeConfigMismatches.length +
    validationResults.errors.length;

  if (totalIssues === 0) {
    report += `## ✅ 验证结果

🎉 **所有路由验证通过！** 未发现任何问题。

`;
  } else {
    report += `## 📊 验证统计

- 缺失页面文件: ${validationResults.missingPages.length}
- 未使用页面文件: ${validationResults.unusedPages.length}
- 重复路由定义: ${validationResults.duplicateRoutes.length}
- 路由配置不匹配: ${validationResults.routeConfigMismatches.length}
- 验证错误: ${validationResults.errors.length}

**总问题数**: ${totalIssues}

`;
  }

  report += `## 📚 建议

1. **清理未使用页面**: 删除或移动未使用的页面文件到适当位置
2. **修复缺失页面**: 创建缺失的页面文件或移除无效的路由引用
3. **解决重复路由**: 合并或移除重复的路由定义
4. **同步路由配置**: 确保routeUtils.ts与实际路由定义保持一致
5. **定期验证**: 建议在添加新路由时运行此验证脚本

---

**生成时间**: ${timestamp}
**脚本版本**: v1.0.0
`;

  // 保存报告
  const reportPath = path.join(PROJECT_ROOT, 'docs/reports/ROUTE_VALIDATION_REPORT.md');
  const reportDir = path.dirname(reportPath);

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`📄 验证报告已生成: ${reportPath}`);
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🔍 开始路由验证...\n');

    // 获取所有页面文件
    console.log('📁 扫描页面文件...');
    const pageFiles = getAllPageFiles();
    console.log(`✅ 找到 ${pageFiles.length} 个页面文件`);

    // 解析路由配置
    console.log('📋 解析路由配置...');
    const routes = parseAppRoutes();
    const routeConfigs = parseRouteUtils();
    console.log(`✅ 找到 ${routes.lazyImports.length + routes.imports.length} 个导入，${routes.routeDefinitions.length} 个路由定义`);

    // 执行验证
    console.log('🔍 执行验证检查...');
    validatePageFiles(routes);
    findUnusedPages(pageFiles, routes);
    checkDuplicateRoutes(routes);
    checkRouteConfigMismatches(routes, routeConfigs);

    // 生成报告
    generateValidationReport();

    // 输出结果摘要
    const totalIssues = validationResults.missingPages.length +
      validationResults.unusedPages.length +
      validationResults.duplicateRoutes.length +
      validationResults.routeConfigMismatches.length +
      validationResults.errors.length;

    console.log('\n📊 验证结果摘要:');
    console.log(`- 缺失页面文件: ${validationResults.missingPages.length}`);
    console.log(`- 未使用页面文件: ${validationResults.unusedPages.length}`);
    console.log(`- 重复路由定义: ${validationResults.duplicateRoutes.length}`);
    console.log(`- 路由配置不匹配: ${validationResults.routeConfigMismatches.length}`);
    console.log(`- 验证错误: ${validationResults.errors.length}`);

    if (totalIssues === 0) {
      console.log('\n🎉 路由验证通过！未发现任何问题。');
      process.exit(0);
    } else {
      console.log(`\n⚠️  发现 ${totalIssues} 个问题，请查看详细报告。`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 验证过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行验证
main();
