/**
 * 精确重复文件清理器
 * 基于实际分析结果，清理项目中真正的重复文件
 */

const fs = require('fs');
const path = require('path');

class PreciseDuplicateCleaner {
  constructor() {
    this.projectRoot = process.cwd();
    this.backupDir = path.join(this.projectRoot, 'backup', 'precise-cleanup');
    this.cleanupActions = [];
    this.dryRun = process.argv.includes('--dry-run');
    
    // 定义真正的重复文件
    this.duplicateFiles = [
      {
        category: 'ErrorBoundary组件',
        files: [
          {
            path: 'frontend/components/common/ErrorBoundary.tsx',
            keep: false,
            reason: '功能较简单，system版本更完整'
          },
          {
            path: 'frontend/components/system/ErrorBoundary.tsx',
            keep: true,
            reason: '功能更完整，包含更多错误处理逻辑'
          }
        ],
        targetName: 'frontend/components/common/ErrorBoundary.tsx',
        risk: 'medium'
      },
      {
        category: 'AppRoutes组件',
        files: [
          {
            path: 'frontend/components/routing/AppRoutes.tsx',
            keep: false,
            reason: '可能是旧版本'
          },
          {
            path: 'frontend/components/tools/AppRoutes.tsx',
            keep: true,
            reason: '位置更合适，功能可能更新'
          }
        ],
        targetName: 'frontend/components/routing/AppRoutes.tsx',
        risk: 'high'
      }
    ];
  }

  /**
   * 执行清理流程
   */
  async execute() {
    console.log('🔍 开始精确重复文件清理...\n');
    
    if (this.dryRun) {
      console.log('🔍 [试运行模式] 不会实际修改文件\n');
    }
    
    // 创建备份目录
    this.ensureBackupDirectory();
    
    // 分析每个重复文件组
    for (const group of this.duplicateFiles) {
      await this.processGroup(group);
    }
    
    // 生成报告
    this.generateReport();
    
    console.log('\n✅ 精确重复文件清理完成！');
  }

  /**
   * 处理重复文件组
   */
  async processGroup(group) {
    console.log(`\n📂 处理组: ${group.category}`);
    console.log(`   风险等级: ${group.risk}`);
    
    // 检查所有文件是否存在
    const existingFiles = group.files.filter(file => {
      const fullPath = path.join(this.projectRoot, file.path);
      const exists = fs.existsSync(fullPath);
      if (!exists) {
        console.log(`   ⚠️  文件不存在: ${file.path}`);
      }
      return exists;
    });
    
    if (existingFiles.length < 2) {
      console.log(`   ℹ️  跳过：只有 ${existingFiles.length} 个文件存在`);
      return;
    }
    
    // 找到要保留的文件
    const keepFile = existingFiles.find(file => file.keep);
    const removeFiles = existingFiles.filter(file => !file.keep);
    
    if (!keepFile) {
      console.log(`   ⚠️  警告：没有指定要保留的文件`);
      return;
    }
    
    console.log(`   ✅ 保留: ${keepFile.path} - ${keepFile.reason}`);
    
    // 分析文件内容差异
    await this.analyzeFileDifferences(existingFiles);
    
    // 检查导入引用
    const allReferences = new Map();
    for (const file of removeFiles) {
      const references = await this.findFileReferences(file.path);
      allReferences.set(file.path, references);
      
      if (references.length > 0) {
        console.log(`   📋 ${file.path} 被 ${references.length} 个文件引用`);
      }
    }
    
    // 执行清理操作
    if (!this.dryRun) {
      await this.executeCleanup(group, keepFile, removeFiles, allReferences);
    } else {
      console.log(`   🔍 [试运行] 将删除 ${removeFiles.length} 个重复文件`);
    }
  }

  /**
   * 分析文件内容差异
   */
  async analyzeFileDifferences(files) {
    console.log(`   🔍 分析文件差异...`);
    
    const fileContents = files.map(file => {
      const fullPath = path.join(this.projectRoot, file.path);
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').length;
      const size = content.length;
      
      return {
        ...file,
        content,
        lines,
        size,
        lastModified: fs.statSync(fullPath).mtime
      };
    });
    
    // 显示文件统计
    fileContents.forEach(file => {
      console.log(`     ${file.path}: ${file.lines} 行, ${file.size} 字节, 修改时间: ${file.lastModified.toISOString().split('T')[0]}`);
    });
    
    // 简单的相似度分析
    if (fileContents.length === 2) {
      const similarity = this.calculateSimilarity(fileContents[0].content, fileContents[1].content);
      console.log(`     相似度: ${(similarity * 100).toFixed(1)}%`);
    }
  }

  /**
   * 计算文件相似度
   */
  calculateSimilarity(content1, content2) {
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');
    
    const commonLines = lines1.filter(line => lines2.includes(line)).length;
    const totalLines = Math.max(lines1.length, lines2.length);
    
    return totalLines > 0 ? commonLines / totalLines : 0;
  }

  /**
   * 查找文件引用
   */
  async findFileReferences(filePath) {
    const references = [];
    const fileName = path.basename(filePath, path.extname(filePath));
    const relativePath = filePath.replace(/\\/g, '/');
    
    // 搜索模式
    const searchPatterns = [
      new RegExp(`import.*from.*['"\`].*${fileName}.*['"\`]`, 'g'),
      new RegExp(`import.*['"\`].*${fileName}.*['"\`]`, 'g'),
      new RegExp(`require\\(['"\`].*${fileName}.*['"\`]\\)`, 'g'),
      new RegExp(`from.*['"\`].*${relativePath}.*['"\`]`, 'g')
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
   * 执行清理操作
   */
  async executeCleanup(group, keepFile, removeFiles, allReferences) {
    console.log(`   🧹 执行清理操作...`);
    
    for (const removeFile of removeFiles) {
      const sourcePath = path.join(this.projectRoot, removeFile.path);
      const backupPath = path.join(this.backupDir, path.basename(removeFile.path));
      
      // 创建备份
      fs.copyFileSync(sourcePath, backupPath);
      console.log(`     📋 已备份: ${removeFile.path} → ${backupPath}`);
      
      // 更新引用
      const references = allReferences.get(removeFile.path) || [];
      if (references.length > 0) {
        await this.updateReferences(removeFile.path, keepFile.path, references);
      }
      
      // 删除文件
      fs.unlinkSync(sourcePath);
      console.log(`     🗑️  已删除: ${removeFile.path}`);
      
      this.cleanupActions.push({
        action: 'deleted',
        file: removeFile.path,
        backup: backupPath,
        replacedBy: keepFile.path,
        references: references.length,
        reason: removeFile.reason
      });
    }
    
    // 如果需要移动保留的文件到目标位置
    if (group.targetName && group.targetName !== keepFile.path) {
      await this.moveFile(keepFile.path, group.targetName);
    }
  }

  /**
   * 更新文件引用
   */
  async updateReferences(oldPath, newPath, references) {
    console.log(`     🔄 更新 ${references.length} 个引用...`);
    
    const oldFileName = path.basename(oldPath, path.extname(oldPath));
    const newFileName = path.basename(newPath, path.extname(newPath));
    const oldRelativePath = oldPath.replace(/\\/g, '/');
    const newRelativePath = newPath.replace(/\\/g, '/');
    
    for (const refFile of references) {
      try {
        const refFullPath = path.join(this.projectRoot, refFile);
        let content = fs.readFileSync(refFullPath, 'utf8');
        let updated = false;
        
        // 更新导入路径
        const patterns = [
          {
            old: new RegExp(`(['"\`])([^'"\`]*${oldFileName}[^'"\`]*)(['"\`])`, 'g'),
            new: `$1${this.calculateRelativePath(refFile, newPath)}$3`
          },
          {
            old: new RegExp(`(['"\`])([^'"\`]*${oldRelativePath}[^'"\`]*)(['"\`])`, 'g'),
            new: `$1${this.calculateRelativePath(refFile, newPath)}$3`
          }
        ];
        
        patterns.forEach(pattern => {
          if (pattern.old.test(content)) {
            content = content.replace(pattern.old, pattern.new);
            updated = true;
          }
        });
        
        if (updated) {
          fs.writeFileSync(refFullPath, content);
          console.log(`       ✅ 已更新: ${refFile}`);
        }
      } catch (error) {
        console.log(`       ❌ 更新失败: ${refFile} - ${error.message}`);
      }
    }
  }

  /**
   * 计算相对路径
   */
  calculateRelativePath(fromFile, toFile) {
    const fromDir = path.dirname(fromFile);
    const relativePath = path.relative(fromDir, toFile);
    return relativePath.replace(/\\/g, '/').replace(/\.tsx?$/, '').replace(/\.jsx?$/, '');
  }

  /**
   * 移动文件
   */
  async moveFile(sourcePath, targetPath) {
    const sourceFullPath = path.join(this.projectRoot, sourcePath);
    const targetFullPath = path.join(this.projectRoot, targetPath);
    
    // 确保目标目录存在
    const targetDir = path.dirname(targetFullPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // 移动文件
    fs.renameSync(sourceFullPath, targetFullPath);
    console.log(`     📁 已移动: ${sourcePath} → ${targetPath}`);
    
    this.cleanupActions.push({
      action: 'moved',
      from: sourcePath,
      to: targetPath
    });
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
          } else if (this.isTargetFile(item)) {
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

  isTargetFile(fileName) {
    return /\.(ts|tsx|js|jsx)$/.test(fileName) && 
           !fileName.includes('.test.') && 
           !fileName.includes('.spec.');
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * 生成清理报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'precise-cleanup-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: this.dryRun,
      summary: {
        totalGroups: this.duplicateFiles.length,
        totalActions: this.cleanupActions.length,
        deletedFiles: this.cleanupActions.filter(a => a.action === 'deleted').length,
        movedFiles: this.cleanupActions.filter(a => a.action === 'moved').length
      },
      actions: this.cleanupActions
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 清理报告:');
    console.log(`   处理组数: ${report.summary.totalGroups}`);
    console.log(`   执行操作: ${report.summary.totalActions}`);
    console.log(`   删除文件: ${report.summary.deletedFiles}`);
    console.log(`   移动文件: ${report.summary.movedFiles}`);
    console.log(`   报告已保存: ${reportPath}`);
  }
}

// 执行清理
if (require.main === module) {
  const cleaner = new PreciseDuplicateCleaner();
  cleaner.execute().catch(console.error);
}

module.exports = PreciseDuplicateCleaner;
