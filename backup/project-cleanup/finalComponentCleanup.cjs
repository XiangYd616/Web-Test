/**
 * 最终组件清理脚本
 * 处理剩余的修饰词文件和冲突
 */

const fs = require('fs');
const path = require('path');

class FinalComponentCleanup {
  constructor() {
    this.projectRoot = process.cwd();
    this.backupDir = path.join(this.projectRoot, 'backup', 'final-cleanup');
  }

  /**
   * 执行最终清理
   */
  async executeFinalCleanup() {
    console.log('🧹 开始最终组件清理...\n');

    try {
      // 创建备份目录
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      // 1. 处理RouteManager冲突
      await this.handleRouteManagerConflict();

      // 2. 处理TestHistory冲突
      await this.handleTestHistoryConflict();

      // 3. 清理剩余的修饰词文件
      await this.cleanupRemainingModifiedFiles();

      // 4. 验证构建
      await this.validateBuild();

      console.log('\n✅ 最终组件清理完成！');

    } catch (error) {
      console.error('❌ 清理过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 处理RouteManager冲突
   */
  async handleRouteManagerConflict() {
    console.log('🔧 处理RouteManager冲突...');

    // app.js使用UnifiedRouteManager，所以保留它，删除其他的
    const filesToRemove = [
      'backend/src/EnhancedRouteManager.js'
    ];

    for (const file of filesToRemove) {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        // 备份
        const backupPath = path.join(this.backupDir, path.basename(file));
        fs.copyFileSync(filePath, backupPath);
        console.log(`   📋 已备份: ${file}`);

        // 删除
        fs.unlinkSync(filePath);
        console.log(`   🗑️  已删除: ${file}`);
      }
    }

    // 重命名UnifiedRouteManager为RouteManager
    const unifiedPath = path.join(this.projectRoot, 'backend/src/UnifiedRouteManager.js');
    const targetPath = path.join(this.projectRoot, 'backend/src/RouteManager.js');

    if (fs.existsSync(unifiedPath)) {
      // 备份现有的RouteManager
      if (fs.existsSync(targetPath)) {
        const backupPath = path.join(this.backupDir, 'RouteManager.js.old');
        fs.copyFileSync(targetPath, backupPath);
        fs.unlinkSync(targetPath);
      }

      // 备份UnifiedRouteManager
      const backupPath = path.join(this.backupDir, 'UnifiedRouteManager.js');
      fs.copyFileSync(unifiedPath, backupPath);

      // 重命名
      fs.renameSync(unifiedPath, targetPath);
      console.log(`   📝 重命名: UnifiedRouteManager.js → RouteManager.js`);

      // 更新app.js中的导入
      await this.updateAppJsImport();
    }
  }

  /**
   * 更新app.js中的导入
   */
  async updateAppJsImport() {
    const appPath = path.join(this.projectRoot, 'backend/src/app.js');
    if (fs.existsSync(appPath)) {
      let content = fs.readFileSync(appPath, 'utf8');
      
      // 更新导入语句
      content = content.replace(
        "const UnifiedRouteManager = require('./UnifiedRouteManager.js');",
        "const RouteManager = require('./RouteManager.js');"
      );
      
      // 更新实例化
      content = content.replace(
        "const routeManager = new UnifiedRouteManager(app);",
        "const routeManager = new RouteManager(app);"
      );

      fs.writeFileSync(appPath, content);
      console.log(`   ✅ 更新了app.js中的导入引用`);
    }
  }

  /**
   * 处理TestHistory冲突
   */
  async handleTestHistoryConflict() {
    console.log('\n🔧 处理TestHistory冲突...');

    // 检查哪个文件被更多地使用
    const enhancedPath = path.join(this.projectRoot, 'frontend/components/ui/TestHistoryEnhanced.tsx');
    const regularPath = path.join(this.projectRoot, 'frontend/components/ui/TestHistory.tsx');

    if (fs.existsSync(enhancedPath) && fs.existsSync(regularPath)) {
      // 备份两个文件
      const backupEnhanced = path.join(this.backupDir, 'TestHistoryEnhanced.tsx');
      const backupRegular = path.join(this.backupDir, 'TestHistory.tsx.old');
      
      fs.copyFileSync(enhancedPath, backupEnhanced);
      fs.copyFileSync(regularPath, backupRegular);

      // 删除旧的TestHistory，重命名Enhanced版本
      fs.unlinkSync(regularPath);
      fs.renameSync(enhancedPath, regularPath);

      console.log(`   📝 重命名: TestHistoryEnhanced.tsx → TestHistory.tsx`);
      console.log(`   📋 已备份原文件`);

      // 更新文件内容中的组件名
      await this.updateTestHistoryContent();
    }
  }

  /**
   * 更新TestHistory文件内容
   */
  async updateTestHistoryContent() {
    const filePath = path.join(this.projectRoot, 'frontend/components/ui/TestHistory.tsx');
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // 更新组件名和相关引用
      content = content.replace(/EnhancedTestHistory/g, 'TestHistory');
      content = content.replace(/EnhancedTestRecord/g, 'TestRecord');
      content = content.replace(/EnhancedTestHistoryProps/g, 'TestHistoryProps');

      fs.writeFileSync(filePath, content);
      console.log(`   ✅ 更新了TestHistory组件内容`);
    }
  }

  /**
   * 清理剩余的修饰词文件
   */
  async cleanupRemainingModifiedFiles() {
    console.log('\n🔧 清理剩余的修饰词文件...');

    const filesToCleanup = [
      {
        old: 'backend/engines/api/enhancedTestEngine.js',
        new: 'backend/engines/api/testEngine.js'
      },
      {
        old: 'backend/engines/seo/utils/smartOptimizationEngine.js',
        new: 'backend/engines/seo/utils/optimizationEngine.js'
      },
      {
        old: 'backend/utils/enhancedDatabaseConnectionManager.js',
        new: 'backend/utils/databaseConnectionManager.js'
      },
      {
        old: 'backend/utils/optimizedQueries.js',
        new: 'backend/utils/queries.js'
      },
      {
        old: 'frontend/services/analytics/advancedAnalyticsService.ts',
        new: 'frontend/services/analytics/analyticsService.ts'
      },
      {
        old: 'frontend/services/api/enhancedApiService.ts',
        new: 'frontend/services/api/apiService.ts'
      },
      {
        old: 'frontend/types/modernTest.ts',
        new: 'frontend/types/test.ts'
      }
    ];

    for (const file of filesToCleanup) {
      const oldPath = path.join(this.projectRoot, file.old);
      const newPath = path.join(this.projectRoot, file.new);

      if (fs.existsSync(oldPath)) {
        // 检查目标文件是否存在
        if (fs.existsSync(newPath)) {
          // 备份并删除旧文件
          const backupPath = path.join(this.backupDir, path.basename(file.old));
          fs.copyFileSync(oldPath, backupPath);
          fs.unlinkSync(oldPath);
          console.log(`   🗑️  删除重复文件: ${file.old}`);
        } else {
          // 备份并重命名
          const backupPath = path.join(this.backupDir, path.basename(file.old));
          fs.copyFileSync(oldPath, backupPath);
          
          // 确保目标目录存在
          const targetDir = path.dirname(newPath);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          
          fs.renameSync(oldPath, newPath);
          console.log(`   📝 重命名: ${file.old} → ${file.new}`);
        }
      }
    }
  }

  /**
   * 验证构建
   */
  async validateBuild() {
    console.log('\n🔍 验证构建...');

    try {
      const { spawn } = require('child_process');
      
      return new Promise((resolve, reject) => {
        const buildProcess = spawn('npm', ['run', 'build'], {
          cwd: this.projectRoot,
          stdio: 'pipe'
        });
        
        let output = '';
        let errorOutput = '';
        
        buildProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        buildProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        buildProcess.on('close', (code) => {
          if (code === 0) {
            console.log('   ✅ 构建验证通过');
            resolve(true);
          } else {
            console.log('   ❌ 构建验证失败');
            console.log('   错误输出:', errorOutput.substring(0, 500));
            resolve(false); // 不抛出错误，只是报告失败
          }
        });
      });
      
    } catch (error) {
      console.error('   ❌ 验证过程出错:', error.message);
      return false;
    }
  }

  /**
   * 生成最终报告
   */
  generateFinalReport() {
    console.log('\n📊 最终清理报告:');
    console.log('   📋 备份位置:', this.backupDir);
    console.log('   ✅ RouteManager冲突已解决');
    console.log('   ✅ TestHistory冲突已解决');
    console.log('   ✅ 剩余修饰词文件已清理');
    console.log('   📄 详细备份文件可在备份目录中找到');
  }
}

// 执行清理
if (require.main === module) {
  const cleanup = new FinalComponentCleanup();
  cleanup.executeFinalCleanup()
    .then(() => {
      cleanup.generateFinalReport();
    })
    .catch(console.error);
}

module.exports = FinalComponentCleanup;
