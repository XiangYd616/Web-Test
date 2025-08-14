#!/usr/bin/env node

/**
 * 更新frontend目录的导入路径工具
 * 适配src重命名为frontend后的路径更新
 */

const fs = require('fs');
const path = require('path');

class FrontendImportPathUpdater {
  constructor() {
    this.projectRoot = process.cwd();
    this.dryRun = process.argv.includes('--dry-run');
    
    // 需要更新的文件列表
    this.filesToUpdate = [
      'frontend/components/tools/AppRoutes.tsx',
      'frontend/utils/routePreloader.ts',
      'frontend/utils/routeUtils.ts'
    ];
  }

  async execute() {
    console.log('🔄 开始更新frontend目录的导入路径...');
    console.log(`模式: ${this.dryRun ? '预览模式' : '实际执行'}`);
    console.log('==================================================');

    try {
      for (const filePath of this.filesToUpdate) {
        await this.updateFile(filePath);
      }
      
      console.log('\n✅ frontend导入路径更新完成！');
      
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
    
    // 更新页面导入路径，将相对路径调整为新的结构
    const pathUpdates = [
      // 更新页面导入路径
      { from: /import\(['"`]\.\.\/pages\//g, to: "import('../pages/" },
      { from: /lazy\(\(\) => import\(['"`]\.\.\/pages\//g, to: "lazy(() => import('../pages/" },
      
      // 更新组件导入路径
      { from: /import\(['"`]\.\.\/components\//g, to: "import('../components/" },
      { from: /from ['"`]\.\.\/components\//g, to: "from '../components/" },
      
      // 更新utils导入路径
      { from: /import\(['"`]\.\.\/utils\//g, to: "import('../utils/" },
      { from: /from ['"`]\.\.\/utils\//g, to: "from '../utils/" },
    ];
    
    for (const update of pathUpdates) {
      const newContent = content.replace(update.from, update.to);
      if (newContent !== content) {
        content = newContent;
        changeCount++;
        console.log(`  ✅ 更新路径模式: ${update.from.source}`);
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
}

// 执行更新
if (require.main === module) {
  const updater = new FrontendImportPathUpdater();
  updater.execute().catch(console.error);
}

module.exports = FrontendImportPathUpdater;
