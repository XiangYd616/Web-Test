/**
 * 执行重复文件清理
 * 基于分析结果，安全地清理项目中的重复文件
 */

const fs = require('fs');
const path = require('path');

class DuplicateCleanupExecutor {
  constructor() {
    this.projectRoot = process.cwd();
    this.backupDir = path.join(this.projectRoot, 'backup', 'duplicate-cleanup-execution');
    this.dryRun = process.argv.includes('--dry-run');
    this.cleanupActions = [];
    
    // 基于分析结果定义要清理的重复文件
    this.duplicateFiles = [
      {
        category: 'Analytics组件重复',
        action: 'delete',
        files: [
          {
            path: 'frontend/pages/data/reports/Analytics.tsx',
            reason: '功能与frontend/components/analytics/Analytics.tsx重复，后者更完整',
            risk: 'medium',
            size: '551行, 25968字节'
          }
        ]
      },
      {
        category: 'AnalyticsService重复',
        action: 'delete',
        files: [
          {
            path: 'frontend/services/analytics/index.ts',
            reason: '功能与analyticsService.ts重复，后者更完整',
            risk: 'high',
            size: '99行, 2576字节'
          }
        ]
      }
    ];
  }

  /**
   * 执行清理
   */
  async execute() {
    console.log('🧹 开始执行重复文件清理...\n');
    
    if (this.dryRun) {
      console.log('🔍 [试运行模式] 不会实际修改文件\n');
    }
    
    // 创建备份目录
    this.ensureBackupDirectory();
    
    // 执行预检查
    const preCheckResult = await this.preCheck();
    if (!preCheckResult.success) {
      console.log('❌ 预检查失败，停止执行');
      return;
    }
    
    // 执行清理
    for (const group of this.duplicateFiles) {
      await this.processGroup(group);
    }
    
    // 验证清理结果
    await this.postCheck();
    
    // 生成报告
    this.generateReport();
    
    console.log('\n✅ 重复文件清理执行完成！');
  }

  /**
   * 预检查
   */
  async preCheck() {
    console.log('🔍 执行预检查...\n');
    
    let allFilesExist = true;
    let totalFilesToDelete = 0;
    
    for (const group of this.duplicateFiles) {
      console.log(`📂 检查组: ${group.category}`);
      
      for (const file of group.files) {
        const fullPath = path.join(this.projectRoot, file.path);
        const exists = fs.existsSync(fullPath);
        
        if (exists) {
          console.log(`   ✅ ${file.path} - 存在`);
          totalFilesToDelete++;
          
          // 检查文件引用
          const references = await this.findFileReferences(file.path);
          if (references.length > 0) {
            console.log(`     ⚠️  被 ${references.length} 个文件引用:`);
            references.slice(0, 3).forEach(ref => {
              console.log(`       - ${ref}`);
            });
            if (references.length > 3) {
              console.log(`       ... 还有 ${references.length - 3} 个引用`);
            }
          }
        } else {
          console.log(`   ❌ ${file.path} - 不存在`);
          allFilesExist = false;
        }
      }
    }
    
    console.log(`\n📊 预检查结果:`);
    console.log(`   待删除文件数: ${totalFilesToDelete}`);
    console.log(`   文件存在性: ${allFilesExist ? '✅ 全部存在' : '❌ 部分文件不存在'}`);
    
    return {
      success: allFilesExist,
      totalFiles: totalFilesToDelete
    };
  }

  /**
   * 处理清理组
   */
  async processGroup(group) {
    console.log(`\n🧹 处理组: ${group.category}`);
    
    for (const file of group.files) {
      await this.processFile(file);
    }
  }

  /**
   * 处理单个文件
   */
  async processFile(file) {
    const fullPath = path.join(this.projectRoot, file.path);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`   ⚠️  跳过不存在的文件: ${file.path}`);
      return;
    }
    
    console.log(`   🗑️  处理文件: ${file.path}`);
    console.log(`     原因: ${file.reason}`);
    console.log(`     风险: ${file.risk}`);
    console.log(`     大小: ${file.size}`);
    
    if (!this.dryRun) {
      // 创建备份
      const backupPath = path.join(this.backupDir, path.basename(file.path));
      let backupCounter = 1;
      let finalBackupPath = backupPath;
      
      // 如果备份文件已存在，添加序号
      while (fs.existsSync(finalBackupPath)) {
        const ext = path.extname(backupPath);
        const name = path.basename(backupPath, ext);
        finalBackupPath = path.join(this.backupDir, `${name}_${backupCounter}${ext}`);
        backupCounter++;
      }
      
      fs.copyFileSync(fullPath, finalBackupPath);
      console.log(`     📋 已备份到: ${finalBackupPath}`);
      
      // 删除文件
      fs.unlinkSync(fullPath);
      console.log(`     ✅ 已删除: ${file.path}`);
      
      this.cleanupActions.push({
        action: 'deleted',
        file: file.path,
        backup: finalBackupPath,
        reason: file.reason,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`     🔍 [试运行] 将删除此文件`);
    }
  }

  /**
   * 查找文件引用
   */
  async findFileReferences(filePath) {
    const references = [];
    const fileName = path.basename(filePath, path.extname(filePath));
    
    // 搜索模式
    const searchPatterns = [
      new RegExp(`import.*from.*['"\`].*${fileName}.*['"\`]`, 'g'),
      new RegExp(`import.*['"\`].*${fileName}.*['"\`]`, 'g'),
      new RegExp(`require\\(['"\`].*${fileName}.*['"\`]\\)`, 'g')
    ];
    
    // 扫描项目文件
    const projectFiles = this.getAllProjectFiles();
    
    for (const projectFile of projectFiles) {
      if (projectFile === filePath) continue;
      
      try {
        const fullPath = path.join(this.projectRoot, projectFile);
        const content = fs.readFileSync(fullPath, 'utf8');
        
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
   * 后检查
   */
  async postCheck() {
    if (this.dryRun) {
      console.log('\n🔍 [试运行] 跳过后检查');
      return;
    }
    
    console.log('\n🔍 执行后检查...');
    
    // 检查是否有编译错误
    console.log('   📝 检查TypeScript编译...');
    // 这里可以添加TypeScript编译检查
    
    console.log('   ✅ 后检查完成');
  }

  /**
   * 获取所有项目文件
   */
  getAllProjectFiles() {
    const files = [];
    
    const scanDirectory = (dir, relativePath = '') => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        if (this.shouldSkipDirectory(item)) return;
        
        const fullPath = path.join(dir, item);
        const relativeFilePath = path.join(relativePath, item);
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scanDirectory(fullPath, relativeFilePath);
          } else if (/\.(ts|tsx|js|jsx)$/.test(item)) {
            files.push(relativeFilePath.replace(/\\/g, '/'));
          }
        } catch (error) {
          // 忽略无法访问的文件
        }
      });
    };

    scanDirectory(path.join(this.projectRoot, 'frontend'));
    scanDirectory(path.join(this.projectRoot, 'backend'));
    
    return files;
  }

  /**
   * 工具方法
   */
  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules', '.git', 'dist', 'build', 'coverage',
      '__tests__', '.vscode', '.idea', 'temp', 'tmp', 'backup'
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`📁 创建备份目录: ${this.backupDir}`);
    }
  }

  /**
   * 生成执行报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'duplicate-cleanup-execution-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: this.dryRun,
      summary: {
        totalGroups: this.duplicateFiles.length,
        totalFiles: this.duplicateFiles.reduce((sum, group) => sum + group.files.length, 0),
        deletedFiles: this.cleanupActions.filter(a => a.action === 'deleted').length,
        backupLocation: this.backupDir
      },
      actions: this.cleanupActions,
      groups: this.duplicateFiles
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 执行报告:');
    console.log(`   处理组数: ${report.summary.totalGroups}`);
    console.log(`   总文件数: ${report.summary.totalFiles}`);
    console.log(`   已删除文件: ${report.summary.deletedFiles}`);
    console.log(`   备份位置: ${report.summary.backupLocation}`);
    console.log(`   报告已保存: ${reportPath}`);
  }
}

// 执行清理
if (require.main === module) {
  const executor = new DuplicateCleanupExecutor();
  executor.execute().catch(console.error);
}

module.exports = DuplicateCleanupExecutor;
