#!/usr/bin/env node

/**
 * 深度项目重构工具
 * 解决真正的结构混乱问题，建立合理的分类
 */

const fs = require('fs');
const path = require('path');

class DeepRestructure {
  constructor() {
    this.projectRoot = process.cwd();
    this.dryRun = process.argv.includes('--dry-run');
    
    // 更合理的页面分类
    this.pageRestructure = {
      // 核心功能页面
      'core': {
        'auth': ['Login.tsx', 'Register.tsx'],
        'dashboard': ['ModernDashboard.tsx'],
        'testing': [
          'APITest.tsx', 'CompatibilityTest.tsx', 'InfrastructureTest.tsx',
          'SecurityTest.tsx', 'SEOTest.tsx', 'StressTest.tsx', 
          'UXTest.tsx', 'WebsiteTest.tsx'
        ]
      },
      
      // 管理和配置页面
      'management': {
        'admin': ['Admin.tsx', 'DataManagement.tsx', 'DataStorage.tsx', 'SystemMonitor.tsx'],
        'settings': ['Settings.tsx'], // 从admin移出
        'integration': [
          'Integrations.tsx', 'CICDIntegration.tsx', 'Webhooks.tsx', 
          'APIKeys.tsx', 'Notifications.tsx'
        ],
        'scheduling': ['ScheduledTasks.tsx', 'TestSchedule.tsx', 'TestOptimizations.tsx'] // 从config移出
      },
      
      // 数据和报告页面
      'data': {
        'reports': [
          'Analytics.tsx', 'Reports.tsx', 'Statistics.tsx',
          'PerformanceAnalysis.tsx', 'MonitoringDashboard.tsx'
        ],
        'results': [
          'TestHistory.tsx', 'TestResultDetail.tsx', 
          'StressTestDetail.tsx', 'StressTestReport.tsx', 'SecurityReport.tsx'
        ]
      },
      
      // 用户和其他页面
      'user': {
        'profile': ['UserProfile.tsx', 'UserBookmarks.tsx'],
        'docs': ['APIDocs.tsx', 'Help.tsx'],
        'misc': ['DownloadDesktop.tsx', 'Subscription.tsx']
      }
    };
    
    // 组件重构方案 - 从22个目录减少到8个
    this.componentRestructure = {
      // 基础UI组件
      'ui': {
        keep: ['ui'],
        merge: ['common', 'dialogs', 'feedback'],
        description: '所有基础UI组件和通用组件'
      },
      
      // 布局和导航
      'layout': {
        keep: ['layout'],
        merge: [],
        moveFrom: {
          'charts': ['Layout.tsx', 'Navigation.tsx', 'Sidebar.tsx', 'TopNavbar.tsx', 'UserDropdownMenu.tsx', 'UserMenu.tsx']
        },
        description: '布局、导航、侧边栏等结构组件'
      },
      
      // 图表和可视化
      'charts': {
        keep: ['charts'],
        merge: [],
        exclude: ['Layout.tsx', 'Navigation.tsx', 'Sidebar.tsx', 'TopNavbar.tsx', 'UserDropdownMenu.tsx', 'UserMenu.tsx'],
        description: '纯图表和数据可视化组件'
      },
      
      // 业务功能组件
      'features': {
        keep: [],
        merge: ['business', 'data', 'analytics', 'reports'],
        description: '业务逻辑相关的功能组件'
      },
      
      // 测试相关组件
      'testing': {
        keep: ['testing'],
        merge: ['security', 'seo', 'stress'],
        description: '所有测试相关的组件'
      },
      
      // 系统和管理
      'system': {
        keep: ['system'],
        merge: ['admin', 'monitoring'],
        description: '系统管理和监控组件'
      },
      
      // 认证和权限
      'auth': {
        keep: ['auth'],
        merge: [],
        description: '认证、授权、权限管理组件'
      },
      
      // 工具和集成
      'tools': {
        keep: [],
        merge: ['integration', 'search', 'routing'],
        description: '工具类和集成相关组件'
      }
    };
  }

  async execute() {
    console.log('🚀 开始深度项目重构...');
    console.log(`模式: ${this.dryRun ? '预览模式' : '实际执行'}`);
    console.log('==================================================');

    try {
      // 1. 重构页面结构
      await this.restructurePages();
      
      // 2. 重构组件结构  
      await this.restructureComponents();
      
      // 3. 清理空目录
      await this.cleanupEmptyDirectories();
      
      console.log('\n✅ 深度项目重构完成！');
      
    } catch (error) {
      console.error('❌ 重构过程中出现错误:', error.message);
      process.exit(1);
    }
  }

  async restructurePages() {
    console.log('\n📁 深度重构页面目录结构...');
    
    const pagesDir = path.join(this.projectRoot, 'src/pages');
    
    // 创建新的目录结构
    for (const [category, subcategories] of Object.entries(this.pageRestructure)) {
      console.log(`\n📂 创建分类: ${category}/`);
      
      for (const [subcat, files] of Object.entries(subcategories)) {
        const subcatDir = path.join(pagesDir, category, subcat);
        
        if (!this.dryRun) {
          if (!fs.existsSync(subcatDir)) {
            fs.mkdirSync(subcatDir, { recursive: true });
          }
        }
        
        console.log(`  📁 子分类: ${category}/${subcat}/ (${files.length}个文件)`);
        
        // 移动文件
        for (const fileName of files) {
          const found = this.findFileInPages(fileName);
          if (found) {
            const targetPath = path.join(subcatDir, fileName);
            
            if (!this.dryRun) {
              fs.renameSync(found.fullPath, targetPath);
            }
            console.log(`    ✅ 移动: ${found.relativePath} → ${category}/${subcat}/${fileName}`);
          } else {
            console.log(`    ⚠️ 未找到文件: ${fileName}`);
          }
        }
      }
    }
  }

  findFileInPages(fileName) {
    const pagesDir = path.join(this.projectRoot, 'src/pages');
    
    function searchRecursively(dir, relativePath = '') {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const itemRelativePath = path.join(relativePath, item);
        
        if (fs.statSync(fullPath).isDirectory()) {
          const result = searchRecursively(fullPath, itemRelativePath);
          if (result) return result;
        } else if (item === fileName) {
          return {
            fullPath,
            relativePath: itemRelativePath
          };
        }
      }
      return null;
    }
    
    return searchRecursively(pagesDir);
  }

  async restructureComponents() {
    console.log('\n🧩 深度重构组件目录结构...');
    
    const componentsDir = path.join(this.projectRoot, 'src/components');
    
    for (const [targetDir, config] of Object.entries(this.componentRestructure)) {
      console.log(`\n📂 重构组件分类: ${targetDir}/`);
      console.log(`  📝 ${config.description}`);
      
      const targetPath = path.join(componentsDir, targetDir);
      
      if (!this.dryRun) {
        if (!fs.existsSync(targetPath)) {
          fs.mkdirSync(targetPath, { recursive: true });
        }
      }
      
      // 合并目录
      if (config.merge && config.merge.length > 0) {
        for (const sourceDir of config.merge) {
          await this.mergeComponentDirectory(sourceDir, targetDir, config.exclude || []);
        }
      }
      
      // 移动特定文件
      if (config.moveFrom) {
        for (const [sourceDir, files] of Object.entries(config.moveFrom)) {
          await this.moveSpecificFiles(sourceDir, targetDir, files);
        }
      }
    }
  }

  async mergeComponentDirectory(sourceDir, targetDir, excludeFiles = []) {
    const componentsDir = path.join(this.projectRoot, 'src/components');
    const sourcePath = path.join(componentsDir, sourceDir);
    const targetPath = path.join(componentsDir, targetDir);
    
    if (!fs.existsSync(sourcePath)) {
      console.log(`    ⚠️ 源目录不存在: ${sourceDir}`);
      return;
    }
    
    console.log(`  🔄 合并目录: ${sourceDir} → ${targetDir}`);
    
    const files = fs.readdirSync(sourcePath);
    let movedCount = 0;
    
    for (const file of files) {
      if (excludeFiles.includes(file)) {
        console.log(`    ⏭️ 跳过文件: ${file} (排除列表)`);
        continue;
      }
      
      const sourceFilePath = path.join(sourcePath, file);
      const targetFilePath = path.join(targetPath, file);
      
      if (fs.statSync(sourceFilePath).isFile()) {
        if (!fs.existsSync(targetFilePath)) {
          if (!this.dryRun) {
            fs.renameSync(sourceFilePath, targetFilePath);
          }
          console.log(`    ✅ 移动文件: ${file}`);
          movedCount++;
        } else {
          console.log(`    ⚠️ 文件冲突，跳过: ${file}`);
        }
      }
    }
    
    // 删除空的源目录
    if (!this.dryRun && fs.existsSync(sourcePath)) {
      const remainingFiles = fs.readdirSync(sourcePath);
      if (remainingFiles.length === 0) {
        fs.rmdirSync(sourcePath);
        console.log(`    🗑️ 删除空目录: ${sourceDir}`);
      }
    }
    
    console.log(`    📊 移动了 ${movedCount} 个文件`);
  }

  async moveSpecificFiles(sourceDir, targetDir, files) {
    const componentsDir = path.join(this.projectRoot, 'src/components');
    const sourcePath = path.join(componentsDir, sourceDir);
    const targetPath = path.join(componentsDir, targetDir);
    
    console.log(`  📦 移动特定文件: ${sourceDir} → ${targetDir}`);
    
    for (const file of files) {
      const sourceFilePath = path.join(sourcePath, file);
      const targetFilePath = path.join(targetPath, file);
      
      if (fs.existsSync(sourceFilePath)) {
        if (!this.dryRun) {
          fs.renameSync(sourceFilePath, targetFilePath);
        }
        console.log(`    ✅ 移动: ${file}`);
      } else {
        console.log(`    ⚠️ 文件不存在: ${file}`);
      }
    }
  }

  async cleanupEmptyDirectories() {
    console.log('\n🧹 清理空目录...');
    
    const dirsToCheck = [
      'src/pages',
      'src/components'
    ];
    
    for (const dirPath of dirsToCheck) {
      await this.cleanupEmptyDirsRecursively(path.join(this.projectRoot, dirPath));
    }
  }

  async cleanupEmptyDirsRecursively(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      if (fs.statSync(itemPath).isDirectory()) {
        await this.cleanupEmptyDirsRecursively(itemPath);
        
        // 检查目录是否为空或只有index.ts
        const remainingItems = fs.readdirSync(itemPath);
        const isEmpty = remainingItems.length === 0;
        const hasOnlyIndex = remainingItems.length === 1 && remainingItems[0] === 'index.ts';
        
        if (isEmpty || hasOnlyIndex) {
          console.log(`  🗑️ 删除空目录: ${path.relative(this.projectRoot, itemPath)}`);
          if (!this.dryRun) {
            fs.rmSync(itemPath, { recursive: true, force: true });
          }
        }
      }
    }
  }
}

// 执行重构
if (require.main === module) {
  const restructure = new DeepRestructure();
  restructure.execute().catch(console.error);
}

module.exports = DeepRestructure;
