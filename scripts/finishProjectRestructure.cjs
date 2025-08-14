#!/usr/bin/env node

/**
 * 完成项目重构工具
 * 处理剩余的重构任务
 */

const fs = require('fs');
const path = require('path');

class FinishProjectRestructure {
  constructor() {
    this.projectRoot = process.cwd();
    this.dryRun = process.argv.includes('--dry-run');
  }

  async execute() {
    console.log('🔧 完成剩余的项目重构任务...');
    console.log(`模式: ${this.dryRun ? '预览模式' : '实际执行'}`);
    console.log('==================================================');

    try {
      // 1. 整理工具目录
      await this.organizeTools();
      
      // 2. 清理构建产物提醒
      await this.cleanupBuildArtifacts();
      
      // 3. 更新package.json中的脚本路径
      await this.updatePackageJsonPaths();
      
      console.log('\n✅ 项目重构完成！');
      console.log('\n📝 手动任务:');
      console.log('   1. 将 src/ 重命名为 frontend/ (需要手动操作)');
      console.log('   2. 更新所有引用 src/ 的配置文件');
      console.log('   3. 将 dist/ 添加到 .gitignore');
      
    } catch (error) {
      console.error('❌ 重构过程中出现错误:', error.message);
      process.exit(1);
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
        try {
          if (!this.dryRun) {
            fs.renameSync(sourcePath, targetPath);
          }
          console.log(`  ✅ 移动工具: ${toolDir} → tools/${toolDir}`);
        } catch (error) {
          console.log(`  ⚠️ 无法移动 ${toolDir}: ${error.message}`);
        }
      } else {
        console.log(`  ℹ️ 工具目录不存在: ${toolDir}`);
      }
    }
  }

  async cleanupBuildArtifacts() {
    console.log('\n🧹 检查构建产物...');
    
    const distPath = path.join(this.projectRoot, 'dist');
    
    if (fs.existsSync(distPath)) {
      console.log('  ⚠️ 发现dist目录 - 这应该在.gitignore中');
      console.log('  💡 建议: 将dist目录添加到.gitignore并删除');
      
      // 检查.gitignore
      const gitignorePath = path.join(this.projectRoot, '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
        if (!gitignoreContent.includes('dist')) {
          console.log('  📝 需要在.gitignore中添加dist目录');
        }
      }
    }
  }

  async updatePackageJsonPaths() {
    console.log('\n📦 检查package.json中的路径引用...');
    
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // 检查是否有需要更新的路径
      const scriptsToCheck = packageJson.scripts || {};
      let needsUpdate = false;
      
      for (const [scriptName, scriptValue] of Object.entries(scriptsToCheck)) {
        if (typeof scriptValue === 'string') {
          // 检查是否引用了旧的配置文件路径
          if (scriptValue.includes('vite.config.ts') || 
              scriptValue.includes('tsconfig.json') ||
              scriptValue.includes('playwright.config.ts')) {
            console.log(`  ⚠️ 脚本 "${scriptName}" 可能需要更新路径`);
            needsUpdate = true;
          }
        }
      }
      
      if (needsUpdate) {
        console.log('  💡 建议: 更新package.json中的配置文件路径');
      } else {
        console.log('  ✅ package.json路径检查完成');
      }
    }
  }
}

// 执行重构
if (require.main === module) {
  const restructure = new FinishProjectRestructure();
  restructure.execute().catch(console.error);
}

module.exports = FinishProjectRestructure;
