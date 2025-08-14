#!/usr/bin/env node

/**
 * 简化的项目结构重构工具
 * 按照用户的合理分类来重新组织项目
 */

const fs = require('fs');
const path = require('path');

class SimpleRestructure {
  constructor() {
    this.projectRoot = process.cwd();
    this.dryRun = process.argv.includes('--dry-run');
    
    // 按照用户的合理分类
    this.pageCategories = {
      'auth': ['Login.tsx', 'Register.tsx'],
      'testing': [
        'APITest.tsx', 'CompatibilityTest.tsx', 'StressTest.tsx', 
        'SecurityTest.tsx', 'SEOTest.tsx', 'UXTest.tsx', 
        'WebsiteTest.tsx', 'InfrastructureTest.tsx'
      ],
      'admin': ['Admin.tsx', 'DataManagement.tsx', 'Settings.tsx'],
      'user': ['UserProfile.tsx', 'UserBookmarks.tsx'],
      'reports': [
        'TestHistory.tsx', 'TestResultDetail.tsx', 'StressTestDetail.tsx',
        'Reports.tsx', 'SecurityReport.tsx', 'StressTestReport.tsx',
        'Analytics.tsx', 'PerformanceAnalysis.tsx', 'Statistics.tsx',
        'MonitoringDashboard.tsx'
      ],
      'config': [
        'Integrations.tsx', 'CICDIntegration.tsx', 'Webhooks.tsx',
        'APIKeys.tsx', 'Notifications.tsx', 'ScheduledTasks.tsx', 
        'TestSchedule.tsx', 'TestOptimizations.tsx'
      ],
      'docs': ['APIDocs.tsx', 'Help.tsx'],
      'misc': ['DownloadDesktop.tsx', 'Subscription.tsx']
    };
  }

  async execute() {
    console.log('🚀 开始简化项目结构重构...');
    console.log(`模式: ${this.dryRun ? '预览模式' : '实际执行'}`);
    console.log('==================================================');

    try {
      // 1. 重构页面目录
      await this.restructurePages();
      
      // 2. 清理空目录
      await this.cleanupEmptyDirectories();
      
      // 3. 清理重复组件目录
      await this.cleanupDuplicateComponents();
      
      console.log('\n✅ 项目结构重构完成！');
      
    } catch (error) {
      console.error('❌ 重构过程中出现错误:', error.message);
      process.exit(1);
    }
  }

  async restructurePages() {
    console.log('\n📁 重构页面目录结构...');
    
    const pagesDir = path.join(this.projectRoot, 'src/pages');
    const currentFiles = fs.readdirSync(pagesDir)
      .filter(file => file.endsWith('.tsx'))
      .filter(file => fs.statSync(path.join(pagesDir, file)).isFile());
    
    console.log(`  发现 ${currentFiles.length} 个页面文件需要重新组织`);
    
    // 创建新的目录结构并移动文件
    for (const [category, files] of Object.entries(this.pageCategories)) {
      const categoryDir = path.join(pagesDir, category);
      
      // 检查是否有文件需要移动到这个分类
      const filesToMove = files.filter(file => currentFiles.includes(file));
      
      if (filesToMove.length > 0) {
        console.log(`  📂 创建分类目录: ${category}/ (${filesToMove.length}个文件)`);
        
        if (!this.dryRun) {
          if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true });
          }
        }
        
        // 移动文件到对应分类
        for (const fileName of filesToMove) {
          const sourcePath = path.join(pagesDir, fileName);
          const targetPath = path.join(categoryDir, fileName);
          
          if (fs.existsSync(sourcePath)) {
            if (!this.dryRun) {
              fs.renameSync(sourcePath, targetPath);
            }
            console.log(`    ✅ 移动: ${fileName} → ${category}/${fileName}`);
          }
        }
      }
    }
    
    // 检查未分类的文件
    const allCategorizedFiles = Object.values(this.pageCategories).flat();
    const uncategorizedFiles = currentFiles.filter(file => !allCategorizedFiles.includes(file));
    
    if (uncategorizedFiles.length > 0) {
      console.log(`  ⚠️ 发现 ${uncategorizedFiles.length} 个未分类文件:`);
      uncategorizedFiles.forEach(file => console.log(`    - ${file}`));
    }
  }

  async cleanupEmptyDirectories() {
    console.log('\n🧹 清理空目录...');
    
    const pagesDir = path.join(this.projectRoot, 'src/pages');
    const emptyDirs = ['admin', 'analytics', 'auth', 'dashboard', 'integration', 'misc', 'scheduling', 'testing', 'user'];
    
    for (const dirName of emptyDirs) {
      const dirPath = path.join(pagesDir, dirName);
      
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        const hasOnlyIndex = files.length === 1 && files[0] === 'index.ts';
        const isEmpty = files.length === 0;
        
        if (isEmpty || hasOnlyIndex) {
          console.log(`  🗑️ 删除空目录: pages/${dirName}`);
          if (!this.dryRun) {
            fs.rmSync(dirPath, { recursive: true, force: true });
          }
        } else {
          console.log(`  ⚠️ 目录不为空，跳过: pages/${dirName} (${files.length}个文件)`);
        }
      }
    }
  }

  async cleanupDuplicateComponents() {
    console.log('\n🧩 清理重复的组件目录...');
    
    const componentsDir = path.join(this.projectRoot, 'src/components');
    
    // 识别需要合并的重复目录
    const duplicatePairs = [
      { keep: 'analytics', remove: 'analysis' },
      { keep: 'charts', remove: 'modern' },
      { keep: 'system', remove: 'monitoring' }
    ];
    
    for (const { keep, remove } of duplicatePairs) {
      const keepDir = path.join(componentsDir, keep);
      const removeDir = path.join(componentsDir, remove);
      
      if (fs.existsSync(keepDir) && fs.existsSync(removeDir)) {
        console.log(`  🔄 合并重复目录: ${remove} → ${keep}`);
        
        if (!this.dryRun) {
          // 移动文件从 remove 到 keep
          const filesToMove = fs.readdirSync(removeDir);
          
          for (const file of filesToMove) {
            const sourcePath = path.join(removeDir, file);
            const targetPath = path.join(keepDir, file);
            
            if (fs.statSync(sourcePath).isFile()) {
              if (!fs.existsSync(targetPath)) {
                fs.renameSync(sourcePath, targetPath);
                console.log(`    ✅ 移动文件: ${file}`);
              } else {
                console.log(`    ⚠️ 文件冲突，跳过: ${file}`);
              }
            }
          }
          
          // 删除空的源目录
          if (fs.readdirSync(removeDir).length === 0) {
            fs.rmdirSync(removeDir);
            console.log(`    🗑️ 删除空目录: ${remove}`);
          }
        }
      }
    }
  }
}

// 执行重构
if (require.main === module) {
  const restructure = new SimpleRestructure();
  restructure.execute().catch(console.error);
}

module.exports = SimpleRestructure;
