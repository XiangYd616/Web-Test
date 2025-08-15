/**
 * 全面组件清理脚本
 * 彻底清理项目中所有带修饰词的文件
 */

const fs = require('fs');
const path = require('path');

class ComprehensiveComponentCleanup {
  constructor() {
    this.projectRoot = process.cwd();
    this.backupDir = path.join(this.projectRoot, 'backup', 'comprehensive-cleanup');
    this.modifierPrefixes = [
      'Enhanced', 'Optimized', 'Improved', 'Advanced', 'Unified', 
      'Super', 'Extended', 'Modern', 'Smart', 'Better', 'New'
    ];
    this.cleanupActions = [];
    this.dryRun = false;
  }

  /**
   * 执行全面清理
   */
  async executeComprehensiveCleanup(options = {}) {
    this.dryRun = options.dryRun || false;
    
    console.log(`🧹 开始全面组件清理 - ${this.dryRun ? '试运行模式' : '实际执行'}\n`);

    try {
      // 1. 创建备份目录
      this.createBackupDirectory();
      
      // 2. 扫描所有带修饰词的文件
      const modifiedFiles = this.scanModifiedFiles();
      
      // 3. 分析和制定清理策略
      const cleanupPlan = this.createCleanupPlan(modifiedFiles);
      
      // 4. 执行清理操作
      await this.executeCleanupPlan(cleanupPlan);
      
      // 5. 生成清理报告
      this.generateCleanupReport();
      
      console.log('\n✅ 全面组件清理完成！');
      
    } catch (error) {
      console.error('❌ 清理过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 创建备份目录
   */
  createBackupDirectory() {
    if (!this.dryRun && !fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`📁 创建备份目录: ${this.backupDir}`);
    }
  }

  /**
   * 扫描带修饰词的文件
   */
  scanModifiedFiles() {
    console.log('🔍 扫描带修饰词的文件...');
    
    const modifiedFiles = [];
    
    const scanDirectory = (dir, relativePath = '') => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        if (item.startsWith('.') || item === 'node_modules' || item === 'backup' || item === 'dist') {
          return;
        }
        
        const fullPath = path.join(dir, item);
        const relativeFilePath = path.join(relativePath, item);
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scanDirectory(fullPath, relativeFilePath);
          } else if (item.match(/\.(ts|tsx|js|jsx)$/)) {
            const fileName = path.basename(item, path.extname(item));
            
            // 检查是否包含修饰词
            const hasModifier = this.modifierPrefixes.some(prefix => 
              fileName.includes(prefix)
            );
            
            if (hasModifier) {
              modifiedFiles.push({
                fullPath,
                relativePath: relativeFilePath.replace(/\\/g, '/'),
                fileName,
                directory: path.dirname(relativeFilePath).replace(/\\/g, '/'),
                extension: path.extname(item),
                modifiers: this.modifierPrefixes.filter(prefix => fileName.includes(prefix))
              });
            }
          }
        } catch (error) {
          // 忽略无法访问的文件
        }
      });
    };

    scanDirectory(this.projectRoot);
    
    console.log(`   📊 发现 ${modifiedFiles.length} 个带修饰词的文件`);
    
    return modifiedFiles;
  }

  /**
   * 创建清理策略
   */
  createCleanupPlan(modifiedFiles) {
    console.log('\n📋 制定清理策略...');
    
    const cleanupPlan = [];
    
    modifiedFiles.forEach(file => {
      const cleanName = this.generateCleanName(file);
      const targetPath = path.join(file.directory, cleanName + file.extension);
      
      // 检查目标文件是否已存在
      const targetFullPath = path.join(this.projectRoot, targetPath);
      const targetExists = fs.existsSync(targetFullPath);
      
      let action = 'rename';
      let risk = 'low';
      
      if (targetExists) {
        // 如果目标文件存在，需要合并或选择保留
        action = 'merge_or_replace';
        risk = 'medium';
      }
      
      // 特殊处理某些文件
      if (file.fileName.includes('Modern') && file.directory.includes('modern')) {
        // Modern目录下的Modern文件可能是合理的
        action = 'keep';
        risk = 'none';
      }
      
      if (file.fileName.includes('Test') && file.fileName.includes('Enhanced')) {
        // 测试相关的Enhanced文件需要谨慎处理
        risk = 'medium';
      }
      
      cleanupPlan.push({
        ...file,
        cleanName,
        targetPath,
        targetExists,
        action,
        risk,
        priority: this.calculatePriority(file, risk)
      });
    });
    
    // 按优先级排序
    cleanupPlan.sort((a, b) => b.priority - a.priority);
    
    console.log(`   📊 制定了 ${cleanupPlan.length} 个清理操作`);
    console.log(`   📊 低风险: ${cleanupPlan.filter(p => p.risk === 'low').length}`);
    console.log(`   📊 中风险: ${cleanupPlan.filter(p => p.risk === 'medium').length}`);
    console.log(`   📊 保持不变: ${cleanupPlan.filter(p => p.action === 'keep').length}`);
    
    return cleanupPlan;
  }

  /**
   * 生成清理后的文件名
   */
  generateCleanName(file) {
    let cleanName = file.fileName;
    
    // 移除修饰词前缀
    this.modifierPrefixes.forEach(prefix => {
      if (cleanName.startsWith(prefix)) {
        cleanName = cleanName.substring(prefix.length);
      }
    });
    
    // 移除修饰词后缀
    this.modifierPrefixes.forEach(prefix => {
      if (cleanName.endsWith(prefix)) {
        cleanName = cleanName.substring(0, cleanName.length - prefix.length);
      }
    });
    
    // 移除中间的修饰词
    this.modifierPrefixes.forEach(prefix => {
      cleanName = cleanName.replace(new RegExp(prefix, 'g'), '');
    });
    
    // 确保首字母大写（对于组件）
    if (file.extension === '.tsx' && file.directory.includes('components')) {
      cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }
    
    // 确保首字母小写（对于工具文件）
    if ((file.extension === '.ts' || file.extension === '.js') && 
        (file.directory.includes('utils') || file.directory.includes('services'))) {
      cleanName = cleanName.charAt(0).toLowerCase() + cleanName.slice(1);
    }
    
    // 处理空名称的情况
    if (!cleanName) {
      cleanName = 'Component'; // 默认名称
    }
    
    return cleanName;
  }

  /**
   * 计算优先级
   */
  calculatePriority(file, risk) {
    let priority = 0;
    
    // 基于风险级别
    if (risk === 'low') priority += 10;
    if (risk === 'medium') priority += 5;
    
    // 基于文件类型
    if (file.extension === '.tsx') priority += 3;
    if (file.extension === '.ts') priority += 2;
    if (file.extension === '.js') priority += 1;
    
    // 基于目录重要性
    if (file.directory.includes('components')) priority += 5;
    if (file.directory.includes('utils')) priority += 4;
    if (file.directory.includes('services')) priority += 3;
    
    return priority;
  }

  /**
   * 执行清理计划
   */
  async executeCleanupPlan(cleanupPlan) {
    console.log('\n🔧 执行清理计划...');
    
    const lowRiskActions = cleanupPlan.filter(p => p.risk === 'low' && p.action !== 'keep');
    
    console.log(`   📊 执行 ${lowRiskActions.length} 个低风险操作`);
    
    for (let i = 0; i < lowRiskActions.length; i++) {
      const action = lowRiskActions[i];
      console.log(`\n🔧 [${i + 1}/${lowRiskActions.length}] 处理: ${action.fileName}`);
      
      await this.executeAction(action);
    }
    
    // 报告需要手动处理的中风险操作
    const mediumRiskActions = cleanupPlan.filter(p => p.risk === 'medium');
    if (mediumRiskActions.length > 0) {
      console.log(`\n⚠️  需要手动处理的中风险操作: ${mediumRiskActions.length} 个`);
      mediumRiskActions.forEach(action => {
        console.log(`   - ${action.relativePath} → ${action.targetPath}`);
        if (action.targetExists) {
          console.log(`     原因: 目标文件已存在`);
        }
      });
    }
  }

  /**
   * 执行单个操作
   */
  async executeAction(action) {
    try {
      if (action.action === 'rename') {
        await this.executeRename(action);
      } else if (action.action === 'merge_or_replace') {
        console.log(`   ⚠️  目标文件已存在，跳过: ${action.targetPath}`);
      }
      
      this.cleanupActions.push({
        ...action,
        status: 'success',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`   ❌ 操作失败: ${error.message}`);
      
      this.cleanupActions.push({
        ...action,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 执行重命名操作
   */
  async executeRename(action) {
    const oldPath = path.join(this.projectRoot, action.relativePath);
    const newPath = path.join(this.projectRoot, action.targetPath);
    
    console.log(`   📝 重命名: ${action.relativePath} → ${action.targetPath}`);
    
    if (!fs.existsSync(oldPath)) {
      throw new Error(`源文件不存在: ${oldPath}`);
    }
    
    if (!this.dryRun) {
      // 创建备份
      const backupPath = path.join(this.backupDir, path.basename(action.relativePath));
      fs.copyFileSync(oldPath, backupPath);
      console.log(`   📋 已备份到: ${backupPath}`);
      
      // 确保目标目录存在
      const targetDir = path.dirname(newPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // 执行重命名
      fs.renameSync(oldPath, newPath);
      console.log(`   ✅ 重命名完成`);
      
      // 更新导入引用
      await this.updateImportReferences(action.relativePath, action.targetPath);
    } else {
      console.log(`   🔍 [试运行] 将重命名文件`);
    }
  }

  /**
   * 更新导入引用
   */
  async updateImportReferences(oldFile, newFile) {
    console.log(`   🔗 更新导入引用: ${oldFile} → ${newFile}`);
    
    const oldFileName = path.basename(oldFile, path.extname(oldFile));
    const newFileName = path.basename(newFile, path.extname(newFile));
    
    if (oldFileName === newFileName) {
      return; // 文件名没有变化，不需要更新引用
    }
    
    // 扫描所有项目文件
    const allFiles = this.getAllProjectFiles();
    let updatedFiles = 0;
    
    for (const file of allFiles) {
      const filePath = path.join(this.projectRoot, file);
      
      if (!fs.existsSync(filePath) || file === oldFile || file === newFile) {
        continue;
      }
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        let newContent = content;
        let hasChanges = false;
        
        // 更新导入语句
        const importPatterns = [
          new RegExp(`from\\s+['"]([^'"]*${oldFileName})['"]/g`, 'g'),
          new RegExp(`import\\s+[^'"]*from\\s+['"]([^'"]*${oldFileName})['"]`, 'g'),
          new RegExp(`require\\s*\\(\\s*['"]([^'"]*${oldFileName})['"]\\s*\\)`, 'g')
        ];
        
        importPatterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            matches.forEach(match => {
              const newMatch = match.replace(oldFileName, newFileName);
              newContent = newContent.replace(match, newMatch);
              hasChanges = true;
            });
          }
        });
        
        if (hasChanges && !this.dryRun) {
          fs.writeFileSync(filePath, newContent);
          updatedFiles++;
        } else if (hasChanges) {
          updatedFiles++;
        }
        
      } catch (error) {
        console.warn(`   ⚠️  无法更新文件: ${file}`);
      }
    }
    
    if (updatedFiles > 0) {
      console.log(`   ✅ 更新了 ${updatedFiles} 个文件的导入引用`);
    }
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
        if (item.startsWith('.') || item === 'node_modules' || item === 'backup' || item === 'dist') {
          return;
        }
        
        const fullPath = path.join(dir, item);
        const relativeFilePath = path.join(relativePath, item);
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scanDirectory(fullPath, relativeFilePath);
          } else if (item.match(/\.(ts|tsx|js|jsx)$/)) {
            files.push(relativeFilePath.replace(/\\/g, '/'));
          }
        } catch (error) {
          // 忽略无法访问的文件
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
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: this.dryRun,
      summary: {
        totalActions: this.cleanupActions.length,
        successfulActions: this.cleanupActions.filter(a => a.status === 'success').length,
        failedActions: this.cleanupActions.filter(a => a.status === 'failed').length
      },
      cleanupActions: this.cleanupActions,
      backupLocation: this.dryRun ? null : this.backupDir
    };
    
    const reportPath = path.join(this.projectRoot, 'comprehensive-cleanup-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 清理报告:');
    console.log(`   📄 详细报告: comprehensive-cleanup-report.json`);
    console.log(`   ✅ 成功操作: ${report.summary.successfulActions}`);
    console.log(`   ❌ 失败操作: ${report.summary.failedActions}`);
    
    if (!this.dryRun && report.summary.successfulActions > 0) {
      console.log(`   📋 备份位置: ${this.backupDir}`);
    }
  }
}

// 命令行执行
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run')
  };
  
  const cleanup = new ComprehensiveComponentCleanup();
  cleanup.executeComprehensiveCleanup(options).catch(console.error);
}

module.exports = ComprehensiveComponentCleanup;
