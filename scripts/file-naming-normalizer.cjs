/**
 * 文件命名规范化工具
 * 去除不必要的修饰词，规范文件命名
 */

const fs = require('fs');
const path = require('path');

class FileNamingNormalizer {
  constructor() {
    this.projectRoot = process.cwd();
    this.backupDir = path.join(this.projectRoot, 'backup', 'naming-normalization');
    this.dryRun = process.argv.includes('--dry-run');
    this.renameActions = [];

    // 需要去除的不必要修饰词
    this.unnecessaryModifiers = [
      'Advanced', 'Enhanced', 'Optimized', 'Improved', 'Unified',
      'Super', 'Extended', 'Modern', 'Smart', 'Better', 'New',
      'Updated', 'Intelligent', 'Complete', 'Full', 'Ultra',
      'Premium', 'Master', 'Final', 'Latest'
    ];

    // 需要保留的功能性修饰词
    this.functionalModifiers = [
      'Test', 'Pro', 'Backup', 'Temp', 'Real', 'Dynamic', 'Base',
      'Protected', 'Progress', 'Stress', 'API', 'Security', 'SEO',
      'UX', 'Network', 'Performance', 'Infrastructure', 'Compatibility'
    ];

    // 特殊重命名规则
    this.specialRenames = [
      {
        pattern: /RealTime(.+)/,
        replacement: '$1',
        reason: 'RealTime是不必要的修饰词'
      },
      {
        pattern: /(.+)Refactored/,
        replacement: '$1',
        reason: 'Refactored是临时标记，应该去除'
      },
      {
        pattern: /(.+)Template$/,
        replacement: '$1',
        reason: 'Template后缀通常不必要'
      }
    ];
  }

  /**
   * 执行命名规范化
   */
  async normalize() {
    console.log('🔧 开始文件命名规范化...\n');

    if (this.dryRun) {
      console.log('🔍 [试运行模式] 不会实际重命名文件\n');
    }

    // 创建备份目录
    this.ensureBackupDirectory();

    // 扫描需要重命名的文件
    const candidateFiles = this.scanCandidateFiles();
    console.log(`📊 找到 ${candidateFiles.length} 个候选文件\n`);

    // 分析重命名建议
    const renameProposals = this.analyzeRenameProposals(candidateFiles);
    console.log(`📋 生成 ${renameProposals.length} 个重命名建议\n`);

    // 执行重命名
    for (const proposal of renameProposals) {
      await this.processRename(proposal);
    }

    // 更新导入引用
    if (!this.dryRun && this.renameActions.length > 0) {
      await this.updateImportReferences();
    }

    // 生成报告
    this.generateReport();

    console.log('\n✅ 文件命名规范化完成！');
  }

  /**
   * 扫描候选文件
   */
  scanCandidateFiles() {
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
            const fileInfo = this.analyzeFile(fullPath, relativeFilePath, stat);
            if (fileInfo && this.needsRename(fileInfo)) {
              files.push(fileInfo);
            }
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
   * 分析文件信息
   */
  analyzeFile(fullPath, relativePath, stat) {
    const fileName = path.basename(relativePath);
    const baseName = path.basename(fileName, path.extname(fileName));
    const extension = path.extname(fileName);
    const directory = path.dirname(relativePath);

    return {
      fullPath,
      relativePath: relativePath.replace(/\\/g, '/'),
      fileName,
      baseName,
      extension,
      directory: directory.replace(/\\/g, '/'),
      size: stat.size,
      lastModified: stat.mtime
    };
  }

  /**
   * 判断是否需要重命名
   */
  needsRename(fileInfo) {
    // 检查是否包含不必要的修饰词
    const hasUnnecessaryModifier = this.unnecessaryModifiers.some(modifier =>
      fileInfo.baseName.includes(modifier)
    );

    // 检查特殊重命名规则
    const hasSpecialPattern = this.specialRenames.some(rule =>
      rule.pattern.test(fileInfo.baseName)
    );

    return hasUnnecessaryModifier || hasSpecialPattern;
  }

  /**
   * 分析重命名建议
   */
  analyzeRenameProposals(files) {
    const proposals = [];

    files.forEach(file => {
      const newName = this.generateNewName(file.baseName);

      if (newName !== file.baseName) {
        const newFileName = newName + file.extension;
        const newRelativePath = path.join(file.directory, newFileName).replace(/\\/g, '/');
        // 确保使用正确的完整路径
        const newFullPath = path.join(path.dirname(file.fullPath), newFileName);

        // 检查新文件名是否已存在
        const targetExists = fs.existsSync(newFullPath);
        const isSameFile = path.resolve(newFullPath) === path.resolve(file.fullPath);
        const conflict = targetExists && !isSameFile;

        proposals.push({
          originalFile: file,
          newBaseName: newName,
          newFileName,
          newRelativePath,
          newFullPath,
          hasConflict: conflict,
          reason: this.getRenameReason(file.baseName, newName),
          risk: conflict ? 'high' : 'low'
        });
      }
    });

    return proposals;
  }

  /**
   * 生成新的文件名
   */
  generateNewName(baseName) {
    let newName = baseName;

    // 应用特殊重命名规则
    this.specialRenames.forEach(rule => {
      if (rule.pattern.test(newName)) {
        newName = newName.replace(rule.pattern, rule.replacement);
      }
    });

    // 移除不必要的修饰词
    this.unnecessaryModifiers.forEach(modifier => {
      // 移除前缀
      if (newName.startsWith(modifier)) {
        newName = newName.substring(modifier.length);
      }
      // 移除后缀
      if (newName.endsWith(modifier)) {
        newName = newName.substring(0, newName.length - modifier.length);
      }
      // 移除中间的修饰词
      newName = newName.replace(new RegExp(modifier, 'g'), '');
    });

    // 清理连接符
    newName = newName.replace(/^[-_]+|[-_]+$/g, '');
    newName = newName.replace(/[-_]{2,}/g, '');

    // 确保首字母大写（对于组件文件）
    if (newName && newName.length > 0) {
      newName = newName.charAt(0).toUpperCase() + newName.slice(1);
    }

    // 如果清理后为空，保持原名
    if (!newName) {
      newName = baseName;
    }

    return newName;
  }

  /**
   * 获取重命名原因
   */
  getRenameReason(oldName, newName) {
    const removedParts = [];

    this.unnecessaryModifiers.forEach(modifier => {
      if (oldName.includes(modifier) && !newName.includes(modifier)) {
        removedParts.push(modifier);
      }
    });

    this.specialRenames.forEach(rule => {
      if (rule.pattern.test(oldName)) {
        removedParts.push(rule.reason);
      }
    });

    if (removedParts.length > 0) {
      return `移除不必要的修饰词: ${removedParts.join(', ')}`;
    }

    return '规范化文件命名';
  }

  /**
   * 处理重命名
   */
  async processRename(proposal) {
    console.log(`📝 处理重命名: ${proposal.originalFile.relativePath}`);
    console.log(`   原名: ${proposal.originalFile.baseName}`);
    console.log(`   新名: ${proposal.newBaseName}`);
    console.log(`   原因: ${proposal.reason}`);
    console.log(`   风险: ${proposal.risk}`);

    if (proposal.hasConflict) {
      console.log(`   ⚠️  冲突: 目标文件已存在 ${proposal.newRelativePath}`);

      // 对于Refactored文件，如果目标文件存在，说明应该删除Refactored版本
      if (proposal.originalFile.baseName.includes('Refactored')) {
        console.log(`   🗑️  [建议] 删除Refactored版本，保留原版本`);
        await this.handleRefactoredFileConflict(proposal);
      } else {
        console.log(`   🔍 [跳过] 由于文件名冲突，跳过此重命名`);
      }
      return;
    }

    if (!this.dryRun) {
      try {
        // 确保目标目录存在
        const targetDir = path.dirname(proposal.newFullPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // 重命名文件
        fs.renameSync(proposal.originalFile.fullPath, proposal.newFullPath);
        console.log(`   ✅ 重命名成功: ${proposal.originalFile.relativePath} → ${proposal.newRelativePath}`);

        this.renameActions.push({
          action: 'renamed',
          oldPath: proposal.originalFile.relativePath,
          newPath: proposal.newRelativePath,
          oldBaseName: proposal.originalFile.baseName,
          newBaseName: proposal.newBaseName,
          reason: proposal.reason,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.log(`   ❌ 重命名失败: ${error.message}`);
      }
    } else {
      console.log(`   🔍 [试运行] 将重命名为: ${proposal.newRelativePath}`);
    }

    console.log('');
  }

  /**
   * 处理Refactored文件冲突
   */
  async handleRefactoredFileConflict(proposal) {
    if (!this.dryRun) {
      try {
        // 比较两个文件的内容和大小
        const originalPath = proposal.newFullPath; // 目标文件（原版本）
        const refactoredPath = proposal.originalFile.fullPath; // Refactored版本

        const originalStat = fs.statSync(originalPath);
        const refactoredStat = fs.statSync(refactoredPath);

        const originalLines = this.countLines(originalPath);
        const refactoredLines = this.countLines(refactoredPath);

        console.log(`     📊 文件对比:`);
        console.log(`       原版本: ${originalLines}行, ${originalStat.size}字节`);
        console.log(`       Refactored版本: ${refactoredLines}行, ${refactoredStat.size}字节`);

        // 如果Refactored版本更大，可能包含更多功能
        if (refactoredStat.size > originalStat.size * 1.2) {
          console.log(`     ⚠️  Refactored版本明显更大，可能包含更多功能，建议手动检查`);
          return;
        }

        // 创建备份
        const backupPath = path.join(this.backupDir, path.basename(refactoredPath));
        fs.copyFileSync(refactoredPath, backupPath);
        console.log(`     📋 已备份Refactored版本到: ${backupPath}`);

        // 删除Refactored版本
        fs.unlinkSync(refactoredPath);
        console.log(`     🗑️  已删除Refactored版本: ${proposal.originalFile.relativePath}`);

        this.renameActions.push({
          action: 'deleted_refactored',
          deletedPath: proposal.originalFile.relativePath,
          keptPath: proposal.newRelativePath,
          backup: backupPath,
          reason: 'Refactored版本与原版本冲突，删除Refactored版本',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.log(`     ❌ 处理Refactored文件冲突失败: ${error.message}`);
      }
    } else {
      console.log(`     🔍 [试运行] 将删除Refactored版本，保留原版本`);
    }
  }

  /**
   * 计算文件行数
   */
  countLines(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return content.split('\n').length;
    } catch {
      return 0;
    }
  }

  /**
   * 更新导入引用
   */
  async updateImportReferences() {
    console.log('🔄 更新导入引用...\n');

    const projectFiles = this.getAllProjectFiles();
    let updatedFiles = 0;

    for (const action of this.renameActions) {
      if (action.action === 'renamed') {
        const oldBaseName = action.oldBaseName;
        const newBaseName = action.newBaseName;

        if (oldBaseName === newBaseName) continue;

        for (const projectFile of projectFiles) {
          try {
            const fullPath = path.join(this.projectRoot, projectFile);
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = false;

            // 更新导入语句中的文件名
            const importPatterns = [
              new RegExp(`(import.*from\\s*['"\`][^'"\`]*/)${oldBaseName}(['"\`])`, 'g'),
              new RegExp(`(import\\s*['"\`][^'"\`]*/)${oldBaseName}(['"\`])`, 'g'),
              new RegExp(`(require\\s*\\(['"\`][^'"\`]*/)${oldBaseName}(['"\`]\\))`, 'g')
            ];

            importPatterns.forEach(pattern => {
              if (pattern.test(content)) {
                content = content.replace(pattern, `$1${newBaseName}$2`);
                updated = true;
              }
            });

            if (updated) {
              fs.writeFileSync(fullPath, content);
              updatedFiles++;
            }
          } catch (error) {
            console.log(`   ❌ 更新引用失败: ${projectFile} - ${error.message}`);
          }
        }
      }
    }

    console.log(`✅ 更新了 ${updatedFiles} 个文件的导入引用\n`);
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

  isTargetFile(fileName) {
    return /\.(ts|tsx|js|jsx)$/.test(fileName) &&
      !fileName.includes('.test.') &&
      !fileName.includes('.spec.');
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`📁 创建备份目录: ${this.backupDir}\n`);
    }
  }

  /**
   * 生成报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'naming-normalization-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: this.dryRun,
      summary: {
        totalRenames: this.renameActions.length,
        successfulRenames: this.renameActions.filter(a => a.action === 'renamed').length
      },
      actions: this.renameActions,
      unnecessaryModifiers: this.unnecessaryModifiers,
      functionalModifiers: this.functionalModifiers
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 规范化报告:');
    console.log(`   重命名操作: ${report.summary.totalRenames}`);
    console.log(`   成功重命名: ${report.summary.successfulRenames}`);
    console.log(`   报告已保存: ${reportPath}`);
  }
}

// 执行规范化
if (require.main === module) {
  const normalizer = new FileNamingNormalizer();
  normalizer.normalize().catch(console.error);
}

module.exports = FileNamingNormalizer;
