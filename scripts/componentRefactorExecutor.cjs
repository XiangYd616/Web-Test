/**
 * 组件重构执行器
 * 基于分析结果执行安全的组件重构操作
 */

const fs = require('fs');
const path = require('path');

class ComponentRefactorExecutor {
  constructor() {
    this.projectRoot = process.cwd();
    this.backupDir = path.join(this.projectRoot, 'backup', 'component-refactor');
    this.analysisFile = path.join(this.projectRoot, 'component-version-analysis.json');
    this.executionLog = [];
    this.dryRun = false;
  }

  /**
   * 执行重构
   */
  async executeRefactor(options = {}) {
    this.dryRun = options.dryRun || false;
    const phase = options.phase || 'phase1';
    
    console.log(`🚀 开始执行组件重构 - ${this.dryRun ? '试运行模式' : '实际执行'}`);
    console.log(`📋 执行阶段: ${phase}\n`);

    try {
      // 1. 加载分析结果
      const analysis = this.loadAnalysis();
      
      // 2. 创建备份目录
      this.createBackupDirectory();
      
      // 3. 执行指定阶段的重构
      await this.executePhase(analysis, phase);
      
      // 4. 生成执行报告
      this.generateExecutionReport();
      
      console.log('\n✅ 重构执行完成！');
      
    } catch (error) {
      console.error('❌ 重构执行失败:', error);
      throw error;
    }
  }

  /**
   * 加载分析结果
   */
  loadAnalysis() {
    if (!fs.existsSync(this.analysisFile)) {
      throw new Error('分析文件不存在，请先运行组件版本分析');
    }
    
    const content = fs.readFileSync(this.analysisFile, 'utf8');
    return JSON.parse(content);
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
   * 执行指定阶段
   */
  async executePhase(analysis, phase) {
    const strategy = analysis.analysis.refactoringStrategy;
    
    if (!strategy || !strategy[phase]) {
      console.log(`⚠️  阶段 ${phase} 没有操作项`);
      return;
    }
    
    const actions = strategy[phase].actions;
    console.log(`📊 ${phase} 包含 ${actions.length} 个操作`);
    
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      console.log(`\n🔧 [${i + 1}/${actions.length}] 处理: ${action.group}`);
      
      await this.executeAction(action);
    }
  }

  /**
   * 执行单个操作
   */
  async executeAction(action) {
    const recommendation = action.recommendation;
    
    try {
      switch (recommendation.action) {
        case 'rename':
          await this.executeRename(recommendation);
          break;
        case 'consolidate':
          await this.executeConsolidate(recommendation);
          break;
        default:
          console.log(`   ⏭️  跳过操作: ${recommendation.action}`);
      }
      
      this.executionLog.push({
        action: recommendation.action,
        status: 'success',
        files: {
          keep: recommendation.keepFile,
          remove: recommendation.removeFiles,
          rename: recommendation.newName
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`   ❌ 操作失败: ${error.message}`);
      
      this.executionLog.push({
        action: recommendation.action,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 执行重命名操作
   */
  async executeRename(recommendation) {
    const oldPath = path.join(this.projectRoot, recommendation.keepFile);
    const newPath = path.join(this.projectRoot, recommendation.newName);
    
    console.log(`   📝 重命名: ${recommendation.keepFile} → ${recommendation.newName}`);
    
    if (!fs.existsSync(oldPath)) {
      throw new Error(`源文件不存在: ${oldPath}`);
    }
    
    if (fs.existsSync(newPath)) {
      throw new Error(`目标文件已存在: ${newPath}`);
    }
    
    if (!this.dryRun) {
      // 创建备份
      const backupPath = path.join(this.backupDir, path.basename(recommendation.keepFile));
      fs.copyFileSync(oldPath, backupPath);
      console.log(`   📋 已备份到: ${backupPath}`);
      
      // 执行重命名
      fs.renameSync(oldPath, newPath);
      console.log(`   ✅ 重命名完成`);
      
      // 更新导入引用
      await this.updateImportReferences(recommendation.keepFile, recommendation.newName);
    } else {
      console.log(`   🔍 [试运行] 将重命名文件`);
    }
  }

  /**
   * 执行合并操作
   */
  async executeConsolidate(recommendation) {
    const keepPath = path.join(this.projectRoot, recommendation.keepFile);
    const newPath = path.join(this.projectRoot, recommendation.newName);
    
    console.log(`   🔗 合并到: ${recommendation.newName}`);
    console.log(`   📦 保留文件: ${recommendation.keepFile}`);
    console.log(`   🗑️  删除文件: ${recommendation.removeFiles.join(', ')}`);
    
    if (!fs.existsSync(keepPath)) {
      throw new Error(`保留文件不存在: ${keepPath}`);
    }
    
    if (!this.dryRun) {
      // 备份所有相关文件
      for (const fileToRemove of recommendation.removeFiles) {
        const removePath = path.join(this.projectRoot, fileToRemove);
        if (fs.existsSync(removePath)) {
          const backupPath = path.join(this.backupDir, path.basename(fileToRemove));
          fs.copyFileSync(removePath, backupPath);
          console.log(`   📋 已备份: ${fileToRemove}`);
        }
      }
      
      // 如果需要重命名保留的文件
      if (recommendation.keepFile !== recommendation.newName) {
        const keepBackupPath = path.join(this.backupDir, path.basename(recommendation.keepFile));
        fs.copyFileSync(keepPath, keepBackupPath);
        fs.renameSync(keepPath, newPath);
        console.log(`   📝 重命名保留文件: ${recommendation.keepFile} → ${recommendation.newName}`);
      }
      
      // 删除多余文件
      for (const fileToRemove of recommendation.removeFiles) {
        const removePath = path.join(this.projectRoot, fileToRemove);
        if (fs.existsSync(removePath)) {
          fs.unlinkSync(removePath);
          console.log(`   🗑️  已删除: ${fileToRemove}`);
        }
      }
      
      // 更新导入引用
      const finalPath = recommendation.newName || recommendation.keepFile;
      await this.updateImportReferences(recommendation.keepFile, finalPath);
      
      for (const removedFile of recommendation.removeFiles) {
        await this.updateImportReferences(removedFile, finalPath);
      }
      
    } else {
      console.log(`   🔍 [试运行] 将合并和删除文件`);
    }
  }

  /**
   * 更新导入引用
   */
  async updateImportReferences(oldFile, newFile) {
    console.log(`   🔗 更新导入引用: ${oldFile} → ${newFile}`);
    
    const oldFileName = path.basename(oldFile, path.extname(oldFile));
    const newFileName = path.basename(newFile, path.extname(newFile));
    const oldRelativePath = oldFile.replace(/\\/g, '/');
    const newRelativePath = newFile.replace(/\\/g, '/');
    
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
        
        // 更新相对路径导入
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
   * 生成执行报告
   */
  generateExecutionReport() {
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: this.dryRun,
      summary: {
        totalActions: this.executionLog.length,
        successfulActions: this.executionLog.filter(log => log.status === 'success').length,
        failedActions: this.executionLog.filter(log => log.status === 'failed').length
      },
      executionLog: this.executionLog,
      backupLocation: this.dryRun ? null : this.backupDir
    };
    
    const reportPath = path.join(this.projectRoot, 'refactor-execution-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 执行报告:');
    console.log(`   📄 详细报告: refactor-execution-report.json`);
    console.log(`   ✅ 成功操作: ${report.summary.successfulActions}`);
    console.log(`   ❌ 失败操作: ${report.summary.failedActions}`);
    
    if (!this.dryRun && report.summary.successfulActions > 0) {
      console.log(`   📋 备份位置: ${this.backupDir}`);
    }
  }

  /**
   * 验证重构结果
   */
  async validateRefactor() {
    console.log('\n🔍 验证重构结果...');
    
    try {
      // 检查构建
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
            console.log('   错误输出:', errorOutput);
            reject(new Error('构建失败'));
          }
        });
      });
      
    } catch (error) {
      console.error('   ❌ 验证过程出错:', error);
      return false;
    }
  }
}

// 命令行执行
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    phase: args.find(arg => arg.startsWith('--phase='))?.split('=')[1] || 'phase1'
  };
  
  const executor = new ComponentRefactorExecutor();
  
  if (args.includes('--validate')) {
    executor.validateRefactor().catch(console.error);
  } else {
    executor.executeRefactor(options).catch(console.error);
  }
}

module.exports = ComponentRefactorExecutor;
