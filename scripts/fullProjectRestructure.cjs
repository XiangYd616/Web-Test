#!/usr/bin/env node

/**
 * 全项目重构工具
 * 整理整个项目的目录结构，不仅仅是src
 */

const fs = require('fs');
const path = require('path');

class FullProjectRestructure {
  constructor() {
    this.projectRoot = process.cwd();
    this.dryRun = process.argv.includes('--dry-run');
    
    // 全项目重构方案
    this.restructurePlan = {
      // 清理根目录的报告文件
      cleanupRootReports: [
        'DEEP_RESTRUCTURE_COMPLETION_REPORT.md',
        'DUPLICATE_TEST_ANALYSIS_REPORT.md', 
        'PROJECT_CHAOS_ANALYSIS.md',
        'PROJECT_CLEANUP_REPORT.md',
        'PROJECT_CLEANUP_SUMMARY.md',
        'PROJECT_RESTRUCTURE_COMPLETION_REPORT.md',
        'PROJECT_STRUCTURE_ANALYSIS_REPORT.md',
        'QUICK_FIX_GUIDE.md',
        'TEST_PAGE_ANALYSIS_REPORT.md'
      ],
      
      // 合并重复目录
      mergeDirectories: {
        // 合并后端相关
        'backend-services': {
          target: 'backend',
          sources: ['server'],
          description: '合并后端服务目录'
        },
        
        // 合并数据相关
        'data-storage': {
          target: 'data',
          sources: ['database'],
          description: '合并数据存储目录'
        },
        
        // 合并文档报告
        'documentation': {
          target: 'docs',
          sources: ['reports'],
          description: '合并文档和报告'
        }
      },
      
      // 重新组织配置文件
      configReorganization: {
        'config/build': [
          'vite.config.ts',
          'tsconfig.json', 
          'tsconfig.node.json',
          'postcss.config.js',
          'tailwind.config.js'
        ],
        'config/testing': [
          'playwright.config.ts'
        ]
      },
      
      // 新的目录结构
      newStructure: {
        'backend/': '后端服务和API',
        'frontend/': '前端应用 (原src)',
        'data/': '数据库和数据文件',
        'docs/': '文档和报告',
        'config/': '配置文件',
        'scripts/': '开发脚本',
        'deploy/': '部署配置',
        'tools/': '开发工具 (k6, electron等)',
        'public/': '静态资源',
        'dist/': '构建产物 (应该在.gitignore中)'
      }
    };
  }

  async execute() {
    console.log('🚀 开始全项目重构...');
    console.log(`模式: ${this.dryRun ? '预览模式' : '实际执行'}`);
    console.log('==================================================');

    try {
      // 1. 清理根目录报告文件
      await this.cleanupRootReports();
      
      // 2. 合并重复目录
      await this.mergeDirectories();
      
      // 3. 重组配置文件
      await this.reorganizeConfigs();
      
      // 4. 重命名src为frontend
      await this.renameSrcToFrontend();
      
      // 5. 整理工具目录
      await this.organizeTools();
      
      // 6. 清理构建产物
      await this.cleanupBuildArtifacts();
      
      console.log('\n✅ 全项目重构完成！');
      
    } catch (error) {
      console.error('❌ 重构过程中出现错误:', error.message);
      process.exit(1);
    }
  }

  async cleanupRootReports() {
    console.log('\n📄 清理根目录报告文件...');
    
    // 创建reports目录
    const reportsDir = path.join(this.projectRoot, 'docs', 'reports');
    if (!this.dryRun) {
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
    }
    
    for (const reportFile of this.restructurePlan.cleanupRootReports) {
      const sourcePath = path.join(this.projectRoot, reportFile);
      const targetPath = path.join(reportsDir, reportFile);
      
      if (fs.existsSync(sourcePath)) {
        if (!this.dryRun) {
          fs.renameSync(sourcePath, targetPath);
        }
        console.log(`  ✅ 移动报告: ${reportFile} → docs/reports/${reportFile}`);
      }
    }
  }

  async mergeDirectories() {
    console.log('\n🔄 合并重复目录...');
    
    for (const [key, config] of Object.entries(this.restructurePlan.mergeDirectories)) {
      console.log(`\n📂 ${config.description}`);
      
      const targetDir = path.join(this.projectRoot, config.target);
      
      for (const sourceDir of config.sources) {
        const sourcePath = path.join(this.projectRoot, sourceDir);
        
        if (fs.existsSync(sourcePath)) {
          console.log(`  🔄 合并: ${sourceDir} → ${config.target}`);
          
          if (!this.dryRun) {
            await this.mergeDirectory(sourcePath, targetDir);
          }
        } else {
          console.log(`  ⚠️ 源目录不存在: ${sourceDir}`);
        }
      }
    }
  }

  async mergeDirectory(sourceDir, targetDir) {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const items = fs.readdirSync(sourceDir);
    
    for (const item of items) {
      const sourcePath = path.join(sourceDir, item);
      const targetPath = path.join(targetDir, item);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        await this.mergeDirectory(sourcePath, targetPath);
      } else {
        if (!fs.existsSync(targetPath)) {
          fs.renameSync(sourcePath, targetPath);
          console.log(`    ✅ 移动文件: ${item}`);
        } else {
          console.log(`    ⚠️ 文件冲突，跳过: ${item}`);
        }
      }
    }
    
    // 删除空的源目录
    if (fs.readdirSync(sourceDir).length === 0) {
      fs.rmdirSync(sourceDir);
      console.log(`    🗑️ 删除空目录: ${path.basename(sourceDir)}`);
    }
  }

  async reorganizeConfigs() {
    console.log('\n⚙️ 重组配置文件...');
    
    for (const [subdir, files] of Object.entries(this.restructurePlan.configReorganization)) {
      const targetDir = path.join(this.projectRoot, subdir);
      
      if (!this.dryRun) {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
      }
      
      console.log(`  📁 创建配置分类: ${subdir}/`);
      
      for (const configFile of files) {
        const sourcePath = path.join(this.projectRoot, configFile);
        const targetPath = path.join(targetDir, configFile);
        
        if (fs.existsSync(sourcePath)) {
          if (!this.dryRun) {
            fs.renameSync(sourcePath, targetPath);
          }
          console.log(`    ✅ 移动配置: ${configFile} → ${subdir}/${configFile}`);
        }
      }
    }
  }

  async renameSrcToFrontend() {
    console.log('\n🎨 重命名src为frontend...');
    
    const srcPath = path.join(this.projectRoot, 'src');
    const frontendPath = path.join(this.projectRoot, 'frontend');
    
    if (fs.existsSync(srcPath)) {
      if (!this.dryRun) {
        fs.renameSync(srcPath, frontendPath);
      }
      console.log('  ✅ 重命名: src → frontend');
    }
  }

  async organizeTools() {
    console.log('\n🛠️ 整理开发工具...');
    
    const toolsDir = path.join(this.projectRoot, 'tools');
    if (!this.dryRun) {
      if (!fs.existsSync(toolsDir)) {
        fs.mkdirSync(toolsDir, { recursive: true });
      }
    }
    
    const toolDirectories = ['k6', 'electron', 'e2e'];
    
    for (const toolDir of toolDirectories) {
      const sourcePath = path.join(this.projectRoot, toolDir);
      const targetPath = path.join(toolsDir, toolDir);
      
      if (fs.existsSync(sourcePath)) {
        if (!this.dryRun) {
          fs.renameSync(sourcePath, targetPath);
        }
        console.log(`  ✅ 移动工具: ${toolDir} → tools/${toolDir}`);
      }
    }
  }

  async cleanupBuildArtifacts() {
    console.log('\n🧹 清理构建产物...');
    
    const distPath = path.join(this.projectRoot, 'dist');
    
    if (fs.existsSync(distPath)) {
      console.log('  ⚠️ 发现dist目录 - 这应该在.gitignore中');
      console.log('  💡 建议: 将dist目录添加到.gitignore并删除');
      
      if (!this.dryRun) {
        // 不自动删除，只是提醒
        console.log('  ℹ️ 请手动处理dist目录');
      }
    }
  }
}

// 执行重构
if (require.main === module) {
  const restructure = new FullProjectRestructure();
  restructure.execute().catch(console.error);
}

module.exports = FullProjectRestructure;
