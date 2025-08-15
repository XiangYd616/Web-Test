/**
 * 重复组件清理脚本
 * 安全地清理项目中的重复版本组件
 */

const fs = require('fs');
const path = require('path');

class DuplicateComponentCleaner {
  constructor() {
    this.projectRoot = process.cwd();
    this.backupDir = path.join(this.projectRoot, 'backup', 'deprecated-components');
    this.cleanupActions = [];
    this.safeToDelete = [];
    this.needsManualReview = [];
  }

  /**
   * 执行清理流程
   */
  async executeCleanup() {
    console.log('🧹 开始重复组件清理流程...\n');

    try {
      // 1. 创建备份目录
      this.createBackupDirectory();

      // 2. 分析重复组件
      this.analyzeDuplicateComponents();

      // 3. 执行安全清理
      await this.performSafeCleanup();

      // 4. 生成清理报告
      this.generateCleanupReport();

      console.log('\n✅ 重复组件清理完成！');

    } catch (error) {
      console.error('❌ 清理过程中发生错误:', error);
      process.exit(1);
    }
  }

  /**
   * 创建备份目录
   */
  createBackupDirectory() {
    console.log('📁 创建备份目录...');
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`   ✅ 备份目录已创建: ${this.backupDir}`);
    } else {
      console.log(`   ℹ️  备份目录已存在: ${this.backupDir}`);
    }
  }

  /**
   * 分析重复组件
   */
  analyzeDuplicateComponents() {
    console.log('\n🔍 分析重复组件...');

    // 定义重复组件映射
    const duplicateComponents = [
      {
        category: '路由管理器',
        deprecated: 'backend/src/RouteManager.js',
        current: 'backend/src/UnifiedRouteManager.js',
        risk: 'low',
        reason: 'UnifiedRouteManager是最新版本，功能更完整'
      },
      {
        category: '错误边界',
        deprecated: 'frontend/components/ui/ErrorBoundary.tsx',
        current: 'frontend/components/system/EnhancedErrorBoundary.tsx',
        risk: 'low',
        reason: 'EnhancedErrorBoundary提供了更好的错误处理'
      },
      {
        category: '增强路由管理器',
        deprecated: 'backend/src/EnhancedRouteManager.js',
        current: 'backend/src/UnifiedRouteManager.js',
        risk: 'medium',
        reason: '需要确认所有功能都已迁移到UnifiedRouteManager'
      }
    ];

    // 分析每个重复组件
    duplicateComponents.forEach(component => {
      const deprecatedPath = path.join(this.projectRoot, component.deprecated);
      const currentPath = path.join(this.projectRoot, component.current);

      if (fs.existsSync(deprecatedPath)) {
        if (fs.existsSync(currentPath)) {
          if (component.risk === 'low') {
            this.safeToDelete.push(component);
          } else {
            this.needsManualReview.push(component);
          }
        } else {
          console.log(`   ⚠️  当前版本不存在: ${component.current}`);
        }
      } else {
        console.log(`   ℹ️  已清理: ${component.deprecated}`);
      }
    });

    console.log(`   📊 发现可安全删除的组件: ${this.safeToDelete.length}`);
    console.log(`   📊 需要手动审查的组件: ${this.needsManualReview.length}`);
  }

  /**
   * 执行安全清理
   */
  async performSafeCleanup() {
    console.log('\n🔧 执行安全清理...');

    if (this.safeToDelete.length === 0) {
      console.log('   ℹ️  没有可以安全删除的组件');
      return;
    }

    for (const component of this.safeToDelete) {
      await this.cleanupComponent(component);
    }
  }

  /**
   * 清理单个组件
   */
  async cleanupComponent(component) {
    const deprecatedPath = path.join(this.projectRoot, component.deprecated);
    const backupPath = path.join(this.backupDir, path.basename(component.deprecated));

    try {
      console.log(`   🔧 处理: ${component.category}`);

      // 1. 创建备份
      if (fs.existsSync(deprecatedPath)) {
        fs.copyFileSync(deprecatedPath, backupPath);
        console.log(`      📋 已备份到: ${backupPath}`);

        // 2. 检查导入引用
        const hasReferences = await this.checkReferences(component.deprecated);
        
        if (hasReferences.length > 0) {
          console.log(`      ⚠️  发现 ${hasReferences.length} 个引用，需要手动处理:`);
          hasReferences.forEach(ref => {
            console.log(`         - ${ref}`);
          });
          
          // 移动到手动审查列表
          this.needsManualReview.push({
            ...component,
            references: hasReferences
          });
        } else {
          // 3. 安全删除
          fs.unlinkSync(deprecatedPath);
          console.log(`      ✅ 已删除: ${component.deprecated}`);
          
          this.cleanupActions.push({
            action: 'deleted',
            file: component.deprecated,
            backup: backupPath,
            reason: component.reason
          });
        }
      }

    } catch (error) {
      console.error(`      ❌ 清理失败: ${error.message}`);
    }
  }

  /**
   * 检查文件引用
   */
  async checkReferences(filePath) {
    const references = [];
    const fileName = path.basename(filePath, path.extname(filePath));
    
    // 搜索可能的导入语句
    const searchPatterns = [
      new RegExp(`import.*${fileName}`, 'g'),
      new RegExp(`require.*${fileName}`, 'g'),
      new RegExp(`from.*${fileName}`, 'g')
    ];

    // 扫描项目文件
    const projectFiles = this.getAllProjectFiles();
    
    for (const projectFile of projectFiles) {
      if (projectFile === filePath) continue; // 跳过自身
      
      try {
        const content = fs.readFileSync(path.join(this.projectRoot, projectFile), 'utf8');
        
        for (const pattern of searchPatterns) {
          if (pattern.test(content)) {
            references.push(projectFile);
            break;
          }
        }
      } catch (error) {
        // 忽略读取错误
      }
    }

    return references;
  }

  /**
   * 获取所有项目文件
   */
  getAllProjectFiles() {
    const files = [];
    
    const scanDirectory = (dir, relativePath = '') => {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        if (item.startsWith('.') || item === 'node_modules' || item === 'backup') {
          return;
        }
        
        const fullPath = path.join(dir, item);
        const relativeFilePath = path.join(relativePath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath, relativeFilePath);
        } else if (item.match(/\.(ts|tsx|js|jsx)$/)) {
          files.push(relativeFilePath.replace(/\\/g, '/'));
        }
      });
    };

    scanDirectory(this.projectRoot);
    return files;
  }

  /**
   * 生成清理报告
   */
  generateCleanupReport() {
    console.log('\n📊 清理报告');
    console.log('=' .repeat(50));

    // 已执行的清理操作
    if (this.cleanupActions.length > 0) {
      console.log(`\n✅ 已清理的组件 (${this.cleanupActions.length}):`);
      this.cleanupActions.forEach((action, index) => {
        console.log(`   ${index + 1}. ${action.file}`);
        console.log(`      备份: ${action.backup}`);
        console.log(`      原因: ${action.reason}`);
      });
    }

    // 需要手动审查的组件
    if (this.needsManualReview.length > 0) {
      console.log(`\n⚠️  需要手动审查的组件 (${this.needsManualReview.length}):`);
      this.needsManualReview.forEach((component, index) => {
        console.log(`   ${index + 1}. ${component.deprecated}`);
        console.log(`      当前版本: ${component.current}`);
        console.log(`      风险级别: ${component.risk}`);
        console.log(`      原因: ${component.reason}`);
        
        if (component.references) {
          console.log(`      引用文件: ${component.references.length} 个`);
          component.references.slice(0, 3).forEach(ref => {
            console.log(`         - ${ref}`);
          });
          if (component.references.length > 3) {
            console.log(`         ... 还有 ${component.references.length - 3} 个`);
          }
        }
      });
    }

    // 后续建议
    console.log('\n💡 后续建议:');
    console.log('   1. 检查备份文件，确认清理正确');
    console.log('   2. 运行测试，验证功能正常');
    console.log('   3. 手动处理需要审查的组件');
    console.log('   4. 更新相关文档');

    console.log('\n' + '='.repeat(50));

    // 生成详细报告文件
    this.generateDetailedReport();
  }

  /**
   * 生成详细报告文件
   */
  generateDetailedReport() {
    const reportContent = {
      timestamp: new Date().toISOString(),
      summary: {
        totalProcessed: this.safeToDelete.length,
        successfullyDeleted: this.cleanupActions.length,
        needsManualReview: this.needsManualReview.length
      },
      cleanupActions: this.cleanupActions,
      manualReviewItems: this.needsManualReview,
      backupLocation: this.backupDir
    };

    const reportPath = path.join(this.projectRoot, 'cleanup-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportContent, null, 2));
    
    console.log(`📄 详细报告已生成: cleanup-report.json`);
  }

  /**
   * 恢复备份文件
   */
  restoreBackups() {
    console.log('🔄 恢复备份文件...');
    
    if (!fs.existsSync(this.backupDir)) {
      console.log('   ℹ️  没有找到备份目录');
      return;
    }

    const backupFiles = fs.readdirSync(this.backupDir);
    
    backupFiles.forEach(backupFile => {
      const backupPath = path.join(this.backupDir, backupFile);
      
      // 查找对应的清理操作
      const cleanupAction = this.cleanupActions.find(action => 
        path.basename(action.backup) === backupFile
      );
      
      if (cleanupAction) {
        const originalPath = path.join(this.projectRoot, cleanupAction.file);
        fs.copyFileSync(backupPath, originalPath);
        console.log(`   ✅ 已恢复: ${cleanupAction.file}`);
      }
    });
  }
}

// 主执行逻辑
if (require.main === module) {
  const cleaner = new DuplicateComponentCleaner();
  
  // 检查命令行参数
  const args = process.argv.slice(2);
  
  if (args.includes('--restore')) {
    cleaner.restoreBackups();
  } else if (args.includes('--dry-run')) {
    console.log('🔍 执行试运行模式...');
    cleaner.createBackupDirectory();
    cleaner.analyzeDuplicateComponents();
    cleaner.generateCleanupReport();
  } else {
    cleaner.executeCleanup();
  }
}

module.exports = DuplicateComponentCleaner;
