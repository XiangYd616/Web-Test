#!/usr/bin/env node

/**
 * 更新导入路径工具
 * 根据新的页面目录结构更新所有导入路径
 */

const fs = require('fs');
const path = require('path');

class ImportPathUpdater {
  constructor() {
    this.projectRoot = process.cwd();
    this.dryRun = process.argv.includes('--dry-run');
    
    // 页面文件的新路径映射
    this.pathMappings = {
      // 认证页面
      'Login': 'auth/Login',
      'Register': 'auth/Register',
      
      // 测试页面
      'APITest': 'testing/APITest',
      'CompatibilityTest': 'testing/CompatibilityTest',
      'StressTest': 'testing/StressTest',
      'SecurityTest': 'testing/SecurityTest',
      'SEOTest': 'testing/SEOTest',
      'UXTest': 'testing/UXTest',
      'WebsiteTest': 'testing/WebsiteTest',
      'InfrastructureTest': 'testing/InfrastructureTest',
      
      // 管理页面
      'Admin': 'admin/Admin',
      'DataManagement': 'admin/DataManagement',
      'Settings': 'admin/Settings',
      
      // 用户页面
      'UserProfile': 'user/UserProfile',
      'UserBookmarks': 'user/UserBookmarks',
      
      // 报告和分析页面
      'TestHistory': 'reports/TestHistory',
      'TestResultDetail': 'reports/TestResultDetail',
      'StressTestDetail': 'reports/StressTestDetail',
      'Reports': 'reports/Reports',
      'SecurityReport': 'reports/SecurityReport',
      'StressTestReport': 'reports/StressTestReport',
      'Analytics': 'reports/Analytics',
      'PerformanceAnalysis': 'reports/PerformanceAnalysis',
      'Statistics': 'reports/Statistics',
      'MonitoringDashboard': 'reports/MonitoringDashboard',
      
      // 配置和集成页面
      'Integrations': 'config/Integrations',
      'CICDIntegration': 'config/CICDIntegration',
      'Webhooks': 'config/Webhooks',
      'APIKeys': 'config/APIKeys',
      'Notifications': 'config/Notifications',
      'ScheduledTasks': 'config/ScheduledTasks',
      'TestSchedule': 'config/TestSchedule',
      'TestOptimizations': 'config/TestOptimizations',
      
      // 文档页面
      'APIDocs': 'docs/APIDocs',
      'Help': 'docs/Help',
      
      // 其他页面
      'DownloadDesktop': 'misc/DownloadDesktop',
      'Subscription': 'misc/Subscription'
    };
    
    // 需要更新的文件列表
    this.filesToUpdate = [
      'src/components/routing/AppRoutes.tsx',
      'src/utils/routePreloader.ts',
      'src/utils/routeUtils.ts'
    ];
  }

  async execute() {
    console.log('🔄 开始更新导入路径...');
    console.log(`模式: ${this.dryRun ? '预览模式' : '实际执行'}`);
    console.log('==================================================');

    try {
      for (const filePath of this.filesToUpdate) {
        await this.updateFile(filePath);
      }
      
      console.log('\n✅ 导入路径更新完成！');
      
    } catch (error) {
      console.error('❌ 更新过程中出现错误:', error.message);
      process.exit(1);
    }
  }

  async updateFile(filePath) {
    const fullPath = path.join(this.projectRoot, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️ 文件不存在，跳过: ${filePath}`);
      return;
    }
    
    console.log(`\n📝 更新文件: ${filePath}`);
    
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    let changeCount = 0;
    
    // 更新懒加载导入
    for (const [componentName, newPath] of Object.entries(this.pathMappings)) {
      // 匹配各种导入模式
      const patterns = [
        // lazy(() => import('../../pages/ComponentName'))
        new RegExp(`(lazy\\(\\(\\)\\s*=>\\s*import\\(['"\`])../../pages/${componentName}(['"\`]\\))`, 'g'),
        // import('../../pages/ComponentName')
        new RegExp(`(import\\(['"\`])../../pages/${componentName}(['"\`]\\))`, 'g'),
        // import ComponentName from '../../pages/ComponentName'
        new RegExp(`(import\\s+\\w+\\s+from\\s+['"\`])../../pages/${componentName}(['"\`])`, 'g')
      ];
      
      for (const pattern of patterns) {
        const newContent = content.replace(pattern, `$1../../pages/${newPath}$2`);
        if (newContent !== content) {
          content = newContent;
          changeCount++;
          console.log(`  ✅ 更新: ${componentName} → ${newPath}`);
        }
      }
    }
    
    // 特殊处理：更新路由映射对象
    if (filePath.includes('routePreloader.ts')) {
      content = this.updateRoutePreloaderMappings(content);
    }
    
    const hasChanges = content !== originalContent;
    
    if (hasChanges) {
      if (!this.dryRun) {
        fs.writeFileSync(fullPath, content, 'utf8');
      }
      console.log(`  📊 总共更新了 ${changeCount} 个导入路径`);
    } else {
      console.log(`  ℹ️ 没有需要更新的导入路径`);
    }
  }

  updateRoutePreloaderMappings(content) {
    // 更新 routeImports 对象中的路径
    const routeImportMappings = {
      "'/website-test': () => import('../pages/WebsiteTest')": "'/website-test': () => import('../pages/testing/WebsiteTest')",
      "'/security-test': () => import('../pages/SecurityTest')": "'/security-test': () => import('../pages/testing/SecurityTest')",
      "'/performance-test': () => import('../pages/WebsiteTest')": "'/performance-test': () => import('../pages/testing/WebsiteTest')",
      "'/seo-test': () => import('../pages/SEOTest')": "'/seo-test': () => import('../pages/testing/SEOTest')",
      "'/api-test': () => import('../pages/APITest')": "'/api-test': () => import('../pages/testing/APITest')",
      "'/infrastructure-test': () => import('../pages/InfrastructureTest')": "'/infrastructure-test': () => import('../pages/testing/InfrastructureTest')",
      "'/stress-test': () => import('../pages/StressTest')": "'/stress-test': () => import('../pages/testing/StressTest')",
      "'/compatibility-test': () => import('../pages/CompatibilityTest')": "'/compatibility-test': () => import('../pages/testing/CompatibilityTest')",
      "'/ux-test': () => import('../pages/UXTest')": "'/ux-test': () => import('../pages/testing/UXTest')",
      "'/login': () => import('../pages/Login')": "'/login': () => import('../pages/auth/Login')",
      "'/register': () => import('../pages/Register')": "'/register': () => import('../pages/auth/Register')"
    };
    
    for (const [oldPattern, newPattern] of Object.entries(routeImportMappings)) {
      content = content.replace(oldPattern, newPattern);
    }
    
    return content;
  }
}

// 执行更新
if (require.main === module) {
  const updater = new ImportPathUpdater();
  updater.execute().catch(console.error);
}

module.exports = ImportPathUpdater;
