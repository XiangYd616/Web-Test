#!/usr/bin/env node

/**
 * 深度重构后的导入路径更新工具
 * 更新所有受深度重构影响的导入路径
 */

const fs = require('fs');
const path = require('path');

class DeepImportPathUpdater {
  constructor() {
    this.projectRoot = process.cwd();
    this.dryRun = process.argv.includes('--dry-run');
    
    // 页面文件的新路径映射
    this.pagePathMappings = {
      // 认证页面
      'Login': 'core/auth/Login',
      'Register': 'core/auth/Register',
      
      // 仪表板
      'ModernDashboard': 'core/dashboard/ModernDashboard',
      
      // 测试页面
      'APITest': 'core/testing/APITest',
      'CompatibilityTest': 'core/testing/CompatibilityTest',
      'InfrastructureTest': 'core/testing/InfrastructureTest',
      'SecurityTest': 'core/testing/SecurityTest',
      'SEOTest': 'core/testing/SEOTest',
      'StressTest': 'core/testing/StressTest',
      'UXTest': 'core/testing/UXTest',
      'WebsiteTest': 'core/testing/WebsiteTest',
      
      // 管理页面
      'Admin': 'management/admin/Admin',
      'DataManagement': 'management/admin/DataManagement',
      'DataStorage': 'management/admin/DataStorage',
      'SystemMonitor': 'management/admin/SystemMonitor',
      'Settings': 'management/settings/Settings',
      
      // 集成页面
      'Integrations': 'management/integration/Integrations',
      'CICDIntegration': 'management/integration/CICDIntegration',
      'Webhooks': 'management/integration/Webhooks',
      'APIKeys': 'management/integration/APIKeys',
      'Notifications': 'management/integration/Notifications',
      
      // 调度页面
      'ScheduledTasks': 'management/scheduling/ScheduledTasks',
      'TestSchedule': 'management/scheduling/TestSchedule',
      'TestOptimizations': 'management/scheduling/TestOptimizations',
      
      // 报告页面
      'Analytics': 'data/reports/Analytics',
      'Reports': 'data/reports/Reports',
      'Statistics': 'data/reports/Statistics',
      'PerformanceAnalysis': 'data/reports/PerformanceAnalysis',
      'MonitoringDashboard': 'data/reports/MonitoringDashboard',
      
      // 结果页面
      'TestHistory': 'data/results/TestHistory',
      'TestResultDetail': 'data/results/TestResultDetail',
      'StressTestDetail': 'data/results/StressTestDetail',
      'StressTestReport': 'data/results/StressTestReport',
      'SecurityReport': 'data/results/SecurityReport',
      
      // 用户页面
      'UserProfile': 'user/profile/UserProfile',
      'UserBookmarks': 'user/profile/UserBookmarks',
      
      // 文档页面
      'APIDocs': 'user/docs/APIDocs',
      'Help': 'user/docs/Help',
      
      // 其他页面
      'DownloadDesktop': 'user/misc/DownloadDesktop',
      'Subscription': 'user/misc/Subscription'
    };
    
    // 组件路径映射（主要是移动到tools的组件）
    this.componentPathMappings = {
      'AppRoutes': 'tools/AppRoutes',
      'PreloadLink': 'tools/PreloadLink',
      'GlobalSearch': 'tools/GlobalSearch',
      'DataQueryPanel': 'tools/DataQueryPanel',
      'CICDDemo': 'tools/CICDDemo',
      'InteractiveFeedback': 'tools/InteractiveFeedback'
    };
    
    // 需要更新的文件列表
    this.filesToUpdate = [
      'src/components/tools/AppRoutes.tsx',
      'src/utils/routePreloader.ts',
      'src/utils/routeUtils.ts'
    ];
  }

  async execute() {
    console.log('🔄 开始更新深度重构后的导入路径...');
    console.log(`模式: ${this.dryRun ? '预览模式' : '实际执行'}`);
    console.log('==================================================');

    try {
      for (const filePath of this.filesToUpdate) {
        await this.updateFile(filePath);
      }
      
      console.log('\n✅ 深度重构导入路径更新完成！');
      
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
    
    // 更新页面导入路径
    for (const [componentName, newPath] of Object.entries(this.pagePathMappings)) {
      const patterns = [
        // lazy(() => import('../../pages/ComponentName'))
        new RegExp(`(lazy\\(\\(\\)\\s*=>\\s*import\\(['"\`])[^'"\`]*pages[/\\\\][^'"\`]*${componentName}(['"\`]\\))`, 'g'),
        // import('../../pages/ComponentName')
        new RegExp(`(import\\(['"\`])[^'"\`]*pages[/\\\\][^'"\`]*${componentName}(['"\`]\\))`, 'g'),
        // import ComponentName from '../../pages/ComponentName'
        new RegExp(`(import\\s+\\w+\\s+from\\s+['"\`])[^'"\`]*pages[/\\\\][^'"\`]*${componentName}(['"\`])`, 'g')
      ];
      
      for (const pattern of patterns) {
        const newContent = content.replace(pattern, `$1../pages/${newPath}$2`);
        if (newContent !== content) {
          content = newContent;
          changeCount++;
          console.log(`  ✅ 更新页面: ${componentName} → ${newPath}`);
        }
      }
    }
    
    // 更新组件导入路径
    for (const [componentName, newPath] of Object.entries(this.componentPathMappings)) {
      const patterns = [
        new RegExp(`(import\\s+[^'"\`]*from\\s+['"\`])[^'"\`]*components[/\\\\][^'"\`]*${componentName}(['"\`])`, 'g'),
        new RegExp(`(import\\(['"\`])[^'"\`]*components[/\\\\][^'"\`]*${componentName}(['"\`]\\))`, 'g')
      ];
      
      for (const pattern of patterns) {
        const newContent = content.replace(pattern, `$1../components/${newPath}$2`);
        if (newContent !== content) {
          content = newContent;
          changeCount++;
          console.log(`  ✅ 更新组件: ${componentName} → ${newPath}`);
        }
      }
    }
    
    // 特殊处理：更新路由预加载器中的路径映射
    if (filePath.includes('routePreloader.ts')) {
      content = this.updateRoutePreloaderMappings(content);
      if (content !== originalContent) {
        changeCount++;
      }
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
      // 测试页面
      "'/website-test': () => import('../pages/testing/WebsiteTest')": "'/website-test': () => import('../pages/core/testing/WebsiteTest')",
      "'/security-test': () => import('../pages/testing/SecurityTest')": "'/security-test': () => import('../pages/core/testing/SecurityTest')",
      "'/performance-test': () => import('../pages/testing/WebsiteTest')": "'/performance-test': () => import('../pages/core/testing/WebsiteTest')",
      "'/seo-test': () => import('../pages/testing/SEOTest')": "'/seo-test': () => import('../pages/core/testing/SEOTest')",
      "'/api-test': () => import('../pages/testing/APITest')": "'/api-test': () => import('../pages/core/testing/APITest')",
      "'/infrastructure-test': () => import('../pages/testing/InfrastructureTest')": "'/infrastructure-test': () => import('../pages/core/testing/InfrastructureTest')",
      "'/stress-test': () => import('../pages/testing/StressTest')": "'/stress-test': () => import('../pages/core/testing/StressTest')",
      "'/compatibility-test': () => import('../pages/testing/CompatibilityTest')": "'/compatibility-test': () => import('../pages/core/testing/CompatibilityTest')",
      "'/ux-test': () => import('../pages/testing/UXTest')": "'/ux-test': () => import('../pages/core/testing/UXTest')",
      
      // 认证页面
      "'/login': () => import('../pages/auth/Login')": "'/login': () => import('../pages/core/auth/Login')",
      "'/register': () => import('../pages/auth/Register')": "'/register': () => import('../pages/core/auth/Register')",
      
      // 仪表板
      "'/dashboard': () => import('../pages/dashboard/ModernDashboard')": "'/dashboard': () => import('../pages/core/dashboard/ModernDashboard')",
      
      // 管理页面
      "'/data-management': () => import('../pages/admin/DataManagement')": "'/data-management': () => import('../pages/management/admin/DataManagement')",
      "'/settings': () => import('../pages/admin/Settings')": "'/settings': () => import('../pages/management/settings/Settings')",
      "'/admin': () => import('../pages/admin/Admin')": "'/admin': () => import('../pages/management/admin/Admin')",
      
      // 报告页面
      "'/statistics': () => import('../pages/reports/Statistics')": "'/statistics': () => import('../pages/data/reports/Statistics')",
      "'/analytics': () => import('../pages/reports/Analytics')": "'/analytics': () => import('../pages/data/reports/Analytics')",
      "'/test-history': () => import('../pages/reports/TestHistory')": "'/test-history': () => import('../pages/data/results/TestHistory')",
      "'/reports': () => import('../pages/reports/Reports')": "'/reports': () => import('../pages/data/reports/Reports')",
      
      // 用户页面
      "'/profile': () => import('../pages/user/UserProfile')": "'/profile': () => import('../pages/user/profile/UserProfile')",
      
      // 集成页面
      "'/integrations': () => import('../pages/config/Integrations')": "'/integrations': () => import('../pages/management/integration/Integrations')",
      "'/notifications': () => import('../pages/config/Notifications')": "'/notifications': () => import('../pages/management/integration/Notifications')",
      
      // 文档页面
      "'/api-docs': () => import('../pages/docs/APIDocs')": "'/api-docs': () => import('../pages/user/docs/APIDocs')"
    };
    
    for (const [oldPattern, newPattern] of Object.entries(routeImportMappings)) {
      content = content.replace(oldPattern, newPattern);
    }
    
    return content;
  }
}

// 执行更新
if (require.main === module) {
  const updater = new DeepImportPathUpdater();
  updater.execute().catch(console.error);
}

module.exports = DeepImportPathUpdater;
