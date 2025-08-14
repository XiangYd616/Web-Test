#!/usr/bin/env node

/**
 * 项目结构重构工具
 * 解决项目结构混乱问题，建立清晰的组织架构
 */

const fs = require('fs');
const path = require('path');

class ProjectRestructure {
  constructor() {
    this.projectRoot = process.cwd();
    this.dryRun = process.argv.includes('--dry-run');
    this.verbose = process.argv.includes('--verbose');

    this.restructurePlan = {
      // 新的页面目录结构
      pages: {
        'auth': ['Login.tsx', 'Register.tsx'],
        'admin': ['Admin.tsx', 'DataManagement.tsx', 'UserProfile.tsx', 'UserBookmarks.tsx'],
        'testing': [
          'APITest.tsx', 'CompatibilityTest.tsx', 'InfrastructureTest.tsx',
          'SecurityTest.tsx', 'SEOTest.tsx', 'StressTest.tsx', 'UXTest.tsx',
          'WebsiteTest.tsx', 'TestHistory.tsx', 'TestOptimizations.tsx',
          'TestResultDetail.tsx', 'TestSchedule.tsx'
        ],
        'analytics': [
          'Analytics.tsx', 'PerformanceAnalysis.tsx', 'Reports.tsx',
          'Statistics.tsx', 'StressTestDetail.tsx', 'StressTestReport.tsx',
          'SecurityReport.tsx', 'MonitoringDashboard.tsx'
        ],
        'integration': [
          'CICDIntegration.tsx', 'Integrations.tsx', 'Webhooks.tsx',
          'APIKeys.tsx', 'Notifications.tsx', 'ScheduledTasks.tsx'
        ],
        'docs': ['APIDocs.tsx', 'Help.tsx'],
        'settings': ['Settings.tsx', 'Subscription.tsx'],
        'misc': ['DownloadDesktop.tsx']
      },

      // 需要合并的组件目录
      componentMerges: {
        'analytics': ['analysis', 'analytics'],
        'testing': ['testing', 'stress'],
        'auth': ['auth'],
        'data': ['data', 'business'],
        'ui': ['ui', 'common', 'layout'],
        'charts': ['charts', 'modern'],
        'system': ['system', 'monitoring']
      }
    };
  }

  /**
   * 执行重构
   */
  async execute() {
    console.log('🚀 开始项目结构重构...');
    console.log(`模式: ${this.dryRun ? '预览模式' : '实际执行'}`);
    console.log('==================================================');

    try {
      // 1. 分析当前结构
      await this.analyzeCurrentStructure();

      // 2. 重构页面目录
      await this.restructurePages();

      // 3. 重构组件目录
      await this.restructureComponents();

      // 4. 清理空目录和重复文件
      await this.cleanupDuplicatesAndEmpty();

      console.log('\n✅ 项目结构重构完成！');

    } catch (error) {
      console.error('❌ 重构过程中出现错误:', error.message);
      process.exit(1);
    }
  }

  /**
   * 分析当前结构
   */
  async analyzeCurrentStructure() {
    console.log('📊 分析当前项目结构...');

    const analysis = {
      pages: this.analyzeDirectory('src/pages'),
      components: this.analyzeDirectory('src/components'),
      services: this.analyzeDirectory('src/services')
    };

    console.log(`  - 页面文件: ${analysis.pages.files.length}个`);
    console.log(`  - 页面目录: ${analysis.pages.directories.length}个`);
    console.log(`  - 组件目录: ${analysis.components.directories.length}个`);
    console.log(`  - 服务文件: ${analysis.services.files.length}个`);

    return analysis;
  }

  /**
   * 分析目录结构
   */
  analyzeDirectory(dirPath) {
    const fullPath = path.join(this.projectRoot, dirPath);
    const result = { files: [], directories: [] };

    if (!fs.existsSync(fullPath)) {
      return result;
    }

    const items = fs.readdirSync(fullPath);

    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        result.directories.push(item);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        result.files.push(item);
      }
    }

    return result;
  }

  /**
   * 重构页面目录
   */
  async restructurePages() {
    console.log('\n📁 重构页面目录结构...');

    const pagesDir = path.join(this.projectRoot, 'src/pages');
    const currentFiles = fs.readdirSync(pagesDir)
      .filter(file => file.endsWith('.tsx'))
      .filter(file => fs.statSync(path.join(pagesDir, file)).isFile());

    console.log(`  发现 ${currentFiles.length} 个页面文件需要重新组织`);

    // 创建新的目录结构
    for (const [category, files] of Object.entries(this.restructurePlan.pages)) {
      const categoryDir = path.join(pagesDir, category);

      if (!this.dryRun) {
        if (!fs.existsSync(categoryDir)) {
          fs.mkdirSync(categoryDir, { recursive: true });
        }
      }

      console.log(`  📂 创建分类目录: ${category}/`);

      // 移动文件到对应分类
      for (const fileName of files) {
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

    // 处理未分类的文件
    const remainingFiles = currentFiles.filter(file => {
      return !Object.values(this.restructurePlan.pages).flat().includes(file);
    });

    if (remainingFiles.length > 0) {
      console.log(`  ⚠️ 发现 ${remainingFiles.length} 个未分类文件:`);
      remainingFiles.forEach(file => console.log(`    - ${file}`));
    }
  }

  /**
   * 重构组件目录
   */
  async restructureComponents() {
    console.log('\n🧩 重构组件目录结构...');

    const componentsDir = path.join(this.projectRoot, 'src/components');
    const currentDirs = fs.readdirSync(componentsDir)
      .filter(item => fs.statSync(path.join(componentsDir, item)).isDirectory());

    console.log(`  发现 ${currentDirs.length} 个组件目录需要整理`);

    // 执行目录合并
    for (const [targetDir, sourceDirs] of Object.entries(this.restructurePlan.componentMerges)) {
      const existingDirs = sourceDirs.filter(dir => currentDirs.includes(dir));

      if (existingDirs.length > 1) {
        console.log(`  🔄 合并目录: ${existingDirs.join(', ')} → ${targetDir}`);

        if (!this.dryRun) {
          await this.mergeDirectories(
            existingDirs.map(dir => path.join(componentsDir, dir)),
            path.join(componentsDir, targetDir)
          );
        }
      }
    }
  }

  /**
   * 合并目录
   */
  async mergeDirectories(sourceDirs, targetDir) {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    for (const sourceDir of sourceDirs) {
      if (fs.existsSync(sourceDir) && sourceDir !== targetDir) {
        const files = fs.readdirSync(sourceDir);

        for (const file of files) {
          const sourcePath = path.join(sourceDir, file);
          const targetPath = path.join(targetDir, file);

          if (fs.statSync(sourcePath).isFile()) {
            // 检查目标文件是否已存在
            if (fs.existsSync(targetPath)) {
              console.log(`    ⚠️ 文件冲突: ${file} (跳过)`);
              continue;
            }

            fs.renameSync(sourcePath, targetPath);
          }
        }

        // 删除空的源目录
        if (fs.readdirSync(sourceDir).length === 0) {
          fs.rmdirSync(sourceDir);
        }
      }
    }
  }

  /**
   * 清理重复文件和空目录
   */
  async cleanupDuplicatesAndEmpty() {
    console.log('\n🧹 清理重复文件和空目录...');

    // 清理空的页面子目录
    const pagesDir = path.join(this.projectRoot, 'src/pages');
    const pageSubDirs = ['admin', 'analytics', 'auth', 'dashboard', 'integration', 'misc', 'scheduling', 'testing', 'user'];

    for (const subDir of pageSubDirs) {
      const subDirPath = path.join(pagesDir, subDir);
      if (fs.existsSync(subDirPath)) {
        const files = fs.readdirSync(subDirPath);
        const hasOnlyIndex = files.length === 1 && files[0] === 'index.ts';

        if (files.length === 0 || hasOnlyIndex) {
          console.log(`  🗑️ 删除空目录: pages/${subDir}`);
          if (!this.dryRun) {
            fs.rmSync(subDirPath, { recursive: true, force: true });
          }
        }
      }
    }
  }
}

// 执行重构
if (require.main === module) {
  const restructure = new ProjectRestructure();
  restructure.execute().catch(console.error);
}

module.exports = ProjectRestructure;
