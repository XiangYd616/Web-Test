/**
 * 针对性重复文件清理器
 * 基于全面扫描结果，清理真正的重复文件
 */

const fs = require('fs');
const path = require('path');

class TargetedDuplicateCleaner {
  constructor() {
    this.projectRoot = process.cwd();
    this.backupDir = path.join(this.projectRoot, 'backup', 'targeted-cleanup');
    this.dryRun = process.argv.includes('--dry-run');
    this.cleanupActions = [];
    
    // 基于扫描结果定义真正的重复文件
    this.duplicateFiles = [
      {
        category: 'Charts组件重复',
        action: 'delete',
        files: [
          {
            path: 'frontend/components/charts/TestCharts.tsx',
            reason: '功能与Charts.tsx重复，后者更完整(1585行 vs 467行)',
            risk: 'medium',
            keepFile: 'frontend/components/charts/Charts.tsx'
          }
        ]
      },
      {
        category: 'DataManager组件重复',
        action: 'delete',
        files: [
          {
            path: 'frontend/components/features/DataBackupManager.tsx',
            reason: '功能与DataManager.tsx重复，后者更完整(582行 vs 442行)',
            risk: 'medium',
            keepFile: 'frontend/components/features/DataManager.tsx'
          }
        ]
      },
      {
        category: 'ApiService重复',
        action: 'delete',
        files: [
          {
            path: 'frontend/services/api/testApiService.ts',
            reason: '功能与apiService.ts重复，后者更完整(513行 vs 414行)',
            risk: 'high',
            keepFile: 'frontend/services/api/apiService.ts'
          }
        ]
      },
      {
        category: 'HistoryService重复',
        action: 'delete',
        files: [
          {
            path: 'frontend/services/history/historyService.ts',
            reason: '功能与testHistoryService.ts重复，后者更完整(417行 vs 219行)',
            risk: 'high',
            keepFile: 'frontend/services/history/testHistoryService.ts'
          }
        ]
      },
      {
        category: 'SecurityEngine重复',
        action: 'delete',
        files: [
          {
            path: 'backend/engines/security/SecurityEngine.js',
            reason: '功能与securityTestEngine.js重复，后者更完整(3050行 vs 670行)',
            risk: 'high',
            keepFile: 'backend/engines/security/securityTestEngine.js'
          }
        ]
      }
    ];
  }

  /**
   * 执行清理
   */
  async execute() {
    console.log('🧹 开始针对性重复文件清理...\n');
    
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
    
    console.log('\n✅ 针对性重复文件清理执行完成！');
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
          
          // 检查保留文件是否存在
          const keepPath = path.join(this.projectRoot, file.keepFile);
          const keepExists = fs.existsSync(keepPath);
          if (keepExists) {
            console.log(`   ✅ 保留文件 ${file.keepFile} - 存在`);
          } else {
            console.log(`   ❌ 保留文件 ${file.keepFile} - 不存在`);
            allFilesExist = false;
          }
          
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
    console.log(`     保留文件: ${file.keepFile}`);
    
    // 分析文件差异
    await this.analyzeFileDifference(file.path, file.keepFile);
    
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
        keepFile: file.keepFile,
        reason: file.reason,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`     🔍 [试运行] 将删除此文件`);
    }
  }

  /**
   * 分析文件差异
   */
  async analyzeFileDifference(deletePath, keepPath) {
    try {
      const deleteFullPath = path.join(this.projectRoot, deletePath);
      const keepFullPath = path.join(this.projectRoot, keepPath);
      
      const deleteStat = fs.statSync(deleteFullPath);
      const keepStat = fs.statSync(keepFullPath);
      
      const deleteLines = this.countLines(deleteFullPath);
      const keepLines = this.countLines(keepFullPath);
      
      console.log(`     📊 文件对比:`);
      console.log(`       删除: ${deletePath} (${deleteLines}行, ${deleteStat.size}字节)`);
      console.log(`       保留: ${keepPath} (${keepLines}行, ${keepStat.size}字节)`);
      
      const sizeDiff = ((keepStat.size - deleteStat.size) / deleteStat.size * 100).toFixed(1);
      const linesDiff = ((keepLines - deleteLines) / deleteLines * 100).toFixed(1);
      
      console.log(`       差异: 大小${sizeDiff}%, 行数${linesDiff}%`);
    } catch (error) {
      console.log(`     ❌ 无法分析文件差异: ${error.message}`);
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
    
    // 检查删除的文件是否确实被删除
    let allDeleted = true;
    for (const action of this.cleanupActions) {
      if (action.action === 'deleted') {
        const fullPath = path.join(this.projectRoot, action.file);
        if (fs.existsSync(fullPath)) {
          console.log(`   ❌ 文件未成功删除: ${action.file}`);
          allDeleted = false;
        } else {
          console.log(`   ✅ 文件已删除: ${action.file}`);
        }
      }
    }
    
    console.log(`   删除状态: ${allDeleted ? '✅ 全部成功' : '❌ 部分失败'}`);
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

  countLines(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return content.split('\n').length;
    } catch {
      return 0;
    }
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
    const reportPath = path.join(this.projectRoot, 'targeted-cleanup-report.json');
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
  const cleaner = new TargetedDuplicateCleaner();
  cleaner.execute().catch(console.error);
}

module.exports = TargetedDuplicateCleaner;
