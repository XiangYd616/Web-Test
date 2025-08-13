#!/usr/bin/env node

/**
 * 项目文件清理工具
 * 整理清理项目中的冗余、过时、重复文件
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

class ProjectCleanupTool {
  constructor() {
    this.projectRoot = process.cwd();
    this.cleanupResults = {
      duplicateFiles: [],
      obsoleteFiles: [],
      emptyFiles: [],
      tempFiles: [],
      backupFiles: [],
      reportFiles: [],
      totalCleaned: 0,
      spaceSaved: 0
    };

    // 需要保护的路径
    this.protectedPaths = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.next',
      '.nuxt',
      '.vscode',
      '.idea'
    ];

    // 临时文件模式
    this.tempFilePatterns = [
      /\.tmp$/,
      /\.temp$/,
      /\.bak$/,
      /\.old$/,
      /~$/,
      /^temp-/,
      /^debug-/,
      /\.log$/,
      /\.cache$/,
      /^\.DS_Store$/,
      /^Thumbs\.db$/
    ];

    // 过时文件模式
    this.obsoletePatterns = [
      /^Real.*Test\.tsx$/,  // 已重命名的测试文件
      /^TestPageLayout\.tsx$/,  // 已删除的布局组件
      /^UnifiedTestPageLayout\.tsx$/,  // 已删除的布局组件
      /.*\.cjs$/,  // 已规范化为.js的脚本文件
      /^check.*\.cjs$/,  // 旧的检查脚本
      /DEPRECATED/i,
      /OBSOLETE/i,
      /LEGACY/i
    ];

    // 报告文件模式
    this.reportPatterns = [
      /.*_REPORT\.md$/,
      /.*_SUMMARY\.md$/,
      /.*CLEANUP.*\.md$/,
      /.*ANALYSIS.*\.md$/,
      /.*OPTIMIZATION.*\.md$/
    ];
  }

  /**
   * 运行完整清理
   */
  async runCleanup(options = {}) {
    const {
      dryRun = true,
      cleanTemp = true,
      cleanEmpty = true,
      cleanDuplicates = true,
      cleanObsolete = true,
      cleanReports = false,
      cleanBackups = false
    } = options;

    console.log('🧹 开始项目文件清理...');
    console.log(`模式: ${dryRun ? '预览模式' : '实际清理'}`);
    console.log('='.repeat(50));

    try {
      // 1. 清理临时文件
      if (cleanTemp) {
        await this.cleanTempFiles(dryRun);
      }

      // 2. 清理空文件
      if (cleanEmpty) {
        await this.cleanEmptyFiles(dryRun);
      }

      // 3. 清理重复文件
      if (cleanDuplicates) {
        await this.findDuplicateFiles(dryRun);
      }

      // 4. 清理过时文件
      if (cleanObsolete) {
        await this.cleanObsoleteFiles(dryRun);
      }

      // 5. 清理报告文件
      if (cleanReports) {
        await this.cleanReportFiles(dryRun);
      }

      // 6. 清理备份文件
      if (cleanBackups) {
        await this.cleanBackupFiles(dryRun);
      }

      // 7. 生成清理报告
      await this.generateCleanupReport();

      console.log('\n✅ 项目清理完成！');
      return this.cleanupResults;

    } catch (error) {
      console.error('❌ 清理过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 清理临时文件
   */
  async cleanTempFiles(dryRun = true) {
    console.log('\n🗑️ 清理临时文件...');

    const allFiles = this.getAllFiles(this.projectRoot);
    const tempFiles = allFiles.filter(file => {
      const basename = path.basename(file);
      return this.tempFilePatterns.some(pattern => pattern.test(basename)) &&
        !this.isProtectedPath(file);
    });

    console.log(`  发现 ${tempFiles.length} 个临时文件`);

    for (const file of tempFiles) {
      try {
        const stats = fs.statSync(file);
        const size = stats.size;

        if (dryRun) {
          console.log(`  [预览] 将删除: ${file} (${this.formatSize(size)})`);
          this.cleanupResults.tempFiles.push({ file, size });
        } else {
          fs.unlinkSync(file);
          console.log(`  ✅ 已删除: ${file} (${this.formatSize(size)})`);
          this.cleanupResults.totalCleaned++;
          this.cleanupResults.spaceSaved += size;
        }
      } catch (error) {
        console.log(`  ❌ 处理失败: ${file} - ${error.message}`);
      }
    }
  }

  /**
   * 清理空文件
   */
  async cleanEmptyFiles(dryRun = true) {
    console.log('\n📄 清理空文件...');

    const allFiles = this.getAllFiles(this.projectRoot, ['.js', '.ts', '.tsx', '.jsx', '.vue', '.css', '.scss', '.md']);
    const emptyFiles = [];

    for (const file of allFiles) {
      if (this.isProtectedPath(file)) continue;

      try {
        const content = fs.readFileSync(file, 'utf8').trim();
        if (content.length === 0 || this.isEffectivelyEmpty(content)) {
          emptyFiles.push(file);
        }
      } catch (error) {
        // 忽略读取错误
      }
    }

    console.log(`  发现 ${emptyFiles.length} 个空文件`);

    for (const file of emptyFiles) {
      try {
        const stats = fs.statSync(file);
        const size = stats.size;

        if (dryRun) {
          console.log(`  [预览] 将删除空文件: ${file}`);
          this.cleanupResults.emptyFiles.push({ file, size });
        } else {
          fs.unlinkSync(file);
          console.log(`  ✅ 已删除空文件: ${file}`);
          this.cleanupResults.totalCleaned++;
          this.cleanupResults.spaceSaved += size;
        }
      } catch (error) {
        console.log(`  ❌ 删除失败: ${file} - ${error.message}`);
      }
    }
  }

  /**
   * 查找重复文件
   */
  async findDuplicateFiles(dryRun = true) {
    console.log('\n🔍 查找重复文件...');

    const allFiles = this.getAllFiles(this.projectRoot, ['.js', '.ts', '.tsx', '.jsx', '.vue']);
    const fileHashes = new Map();
    const duplicates = [];

    for (const file of allFiles) {
      if (this.isProtectedPath(file)) continue;

      try {
        const content = fs.readFileSync(file, 'utf8');
        const hash = this.generateContentHash(content);

        if (fileHashes.has(hash)) {
          const original = fileHashes.get(hash);
          duplicates.push({ original, duplicate: file });
        } else {
          fileHashes.set(hash, file);
        }
      } catch (error) {
        // 忽略读取错误
      }
    }

    console.log(`  发现 ${duplicates.length} 组重复文件`);

    for (const dup of duplicates) {
      console.log(`  🔄 重复: ${dup.original} ↔ ${dup.duplicate}`);
      this.cleanupResults.duplicateFiles.push(dup);
    }
  }

  /**
   * 清理过时文件
   */
  async cleanObsoleteFiles(dryRun = true) {
    console.log('\n🗂️ 清理过时文件...');

    const allFiles = this.getAllFiles(this.projectRoot);
    const obsoleteFiles = allFiles.filter(file => {
      const basename = path.basename(file);
      const relativePath = path.relative(this.projectRoot, file);

      return this.obsoletePatterns.some(pattern => pattern.test(basename) || pattern.test(relativePath)) &&
        !this.isProtectedPath(file);
    });

    console.log(`  发现 ${obsoleteFiles.length} 个过时文件`);

    for (const file of obsoleteFiles) {
      try {
        const stats = fs.statSync(file);
        const size = stats.size;

        if (dryRun) {
          console.log(`  [预览] 将删除过时文件: ${file}`);
          this.cleanupResults.obsoleteFiles.push({ file, size });
        } else {
          fs.unlinkSync(file);
          console.log(`  ✅ 已删除过时文件: ${file}`);
          this.cleanupResults.totalCleaned++;
          this.cleanupResults.spaceSaved += size;
        }
      } catch (error) {
        console.log(`  ❌ 删除失败: ${file} - ${error.message}`);
      }
    }
  }

  /**
   * 清理报告文件
   */
  async cleanReportFiles(dryRun = true) {
    console.log('\n📊 清理报告文件...');

    const allFiles = this.getAllFiles(this.projectRoot, ['.md']);
    const reportFiles = allFiles.filter(file => {
      const basename = path.basename(file);
      return this.reportPatterns.some(pattern => pattern.test(basename)) &&
        !this.isProtectedPath(file);
    });

    console.log(`  发现 ${reportFiles.length} 个报告文件`);

    for (const file of reportFiles) {
      try {
        const stats = fs.statSync(file);
        const size = stats.size;

        if (dryRun) {
          console.log(`  [预览] 将删除报告文件: ${file}`);
          this.cleanupResults.reportFiles.push({ file, size });
        } else {
          fs.unlinkSync(file);
          console.log(`  ✅ 已删除报告文件: ${file}`);
          this.cleanupResults.totalCleaned++;
          this.cleanupResults.spaceSaved += size;
        }
      } catch (error) {
        console.log(`  ❌ 删除失败: ${file} - ${error.message}`);
      }
    }
  }

  /**
   * 清理备份文件
   */
  async cleanBackupFiles(dryRun = true) {
    console.log('\n💾 清理备份文件...');

    const allFiles = this.getAllFiles(this.projectRoot);
    const backupFiles = allFiles.filter(file => {
      const basename = path.basename(file);
      return (basename.includes('backup') || basename.includes('Backup') ||
        basename.endsWith('.bak') || basename.endsWith('.backup')) &&
        !this.isProtectedPath(file);
    });

    console.log(`  发现 ${backupFiles.length} 个备份文件`);

    for (const file of backupFiles) {
      try {
        const stats = fs.statSync(file);
        const size = stats.size;

        if (dryRun) {
          console.log(`  [预览] 将删除备份文件: ${file} (${this.formatSize(size)})`);
          this.cleanupResults.backupFiles.push({ file, size });
        } else {
          fs.unlinkSync(file);
          console.log(`  ✅ 已删除备份文件: ${file} (${this.formatSize(size)})`);
          this.cleanupResults.totalCleaned++;
          this.cleanupResults.spaceSaved += size;
        }
      } catch (error) {
        console.log(`  ❌ 删除失败: ${file} - ${error.message}`);
      }
    }
  }

  /**
   * 获取所有文件
   */
  getAllFiles(dir, extensions = []) {
    const files = [];

    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);

        if (this.isProtectedPath(fullPath)) continue;

        try {
          const stats = fs.statSync(fullPath);

          if (stats.isDirectory()) {
            files.push(...this.getAllFiles(fullPath, extensions));
          } else if (stats.isFile()) {
            if (extensions.length === 0 || extensions.some(ext => fullPath.endsWith(ext))) {
              files.push(fullPath);
            }
          }
        } catch (error) {
          // 忽略无法访问的文件
        }
      }
    } catch (error) {
      // 忽略无法访问的目录
    }

    return files;
  }

  /**
   * 检查是否为受保护路径
   */
  isProtectedPath(filePath) {
    const relativePath = path.relative(this.projectRoot, filePath);
    return this.protectedPaths.some(protectedPath =>
      relativePath.startsWith(protectedPath) ||
      relativePath.includes(`${path.sep}${protectedPath}${path.sep}`)
    );
  }

  /**
   * 检查文件是否实际为空
   */
  isEffectivelyEmpty(content) {
    // 移除注释和空白字符后检查
    const cleaned = content
      .replace(/\/\*[\s\S]*?\*\//g, '') // 移除块注释
      .replace(/\/\/.*$/gm, '') // 移除行注释
      .replace(/<!--[\s\S]*?-->/g, '') // 移除HTML注释
      .replace(/\s+/g, ''); // 移除所有空白字符

    return cleaned.length === 0;
  }

  /**
   * 生成内容哈希
   */
  generateContentHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * 格式化文件大小
   */
  formatSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * 生成清理报告
   */
  async generateCleanupReport() {
    console.log('\n📋 生成清理报告...');

    const report = `# 项目文件清理报告

生成时间: ${new Date().toISOString()}

## 📊 清理结果概览

| 清理项目 | 数量 | 节省空间 |
|---------|------|----------|
| 临时文件 | ${this.cleanupResults.tempFiles.length} | ${this.formatSize(this.cleanupResults.tempFiles.reduce((sum, f) => sum + f.size, 0))} |
| 空文件 | ${this.cleanupResults.emptyFiles.length} | ${this.formatSize(this.cleanupResults.emptyFiles.reduce((sum, f) => sum + f.size, 0))} |
| 过时文件 | ${this.cleanupResults.obsoleteFiles.length} | ${this.formatSize(this.cleanupResults.obsoleteFiles.reduce((sum, f) => sum + f.size, 0))} |
| 报告文件 | ${this.cleanupResults.reportFiles.length} | ${this.formatSize(this.cleanupResults.reportFiles.reduce((sum, f) => sum + f.size, 0))} |
| 备份文件 | ${this.cleanupResults.backupFiles.length} | ${this.formatSize(this.cleanupResults.backupFiles.reduce((sum, f) => sum + f.size, 0))} |
| 重复文件 | ${this.cleanupResults.duplicateFiles.length} | - |

## 📁 详细清理列表

### 临时文件
${this.cleanupResults.tempFiles.map(f => `- ${f.file} (${this.formatSize(f.size)})`).join('\n')}

### 空文件
${this.cleanupResults.emptyFiles.map(f => `- ${f.file}`).join('\n')}

### 过时文件
${this.cleanupResults.obsoleteFiles.map(f => `- ${f.file}`).join('\n')}

### 重复文件
${this.cleanupResults.duplicateFiles.map(d => `- ${d.original} ↔ ${d.duplicate}`).join('\n')}

## 📈 清理统计

- 总清理文件数: ${this.cleanupResults.totalCleaned}
- 总节省空间: ${this.formatSize(this.cleanupResults.spaceSaved)}
- 清理完成时间: ${new Date().toISOString()}
`;

    const reportPath = path.join(this.projectRoot, 'PROJECT_CLEANUP_REPORT.md');
    fs.writeFileSync(reportPath, report);
    console.log(`  📄 报告已生成: ${reportPath}`);
  }
}

// 命令行接口
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: !args.includes('--execute'),
    cleanTemp: !args.includes('--no-temp'),
    cleanEmpty: !args.includes('--no-empty'),
    cleanDuplicates: !args.includes('--no-duplicates'),
    cleanObsolete: !args.includes('--no-obsolete'),
    cleanReports: args.includes('--clean-reports'),
    cleanBackups: args.includes('--clean-backups')
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
项目文件清理工具

用法: node projectCleanup.js [选项]

选项:
  --execute          实际执行清理（默认为预览模式）
  --no-temp          跳过临时文件清理
  --no-empty         跳过空文件清理
  --no-duplicates    跳过重复文件检查
  --no-obsolete      跳过过时文件清理
  --clean-reports    清理报告文件
  --clean-backups    清理备份文件
  --help, -h         显示此帮助信息

示例:
  node projectCleanup.js                    # 预览模式
  node projectCleanup.js --execute          # 实际清理
  node projectCleanup.js --clean-reports    # 包含报告文件清理
`);
    return;
  }

  const cleaner = new ProjectCleanupTool();
  try {
    await cleaner.runCleanup(options);
  } catch (error) {
    console.error('清理失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (process.argv[1] && process.argv[1].endsWith('projectCleanup.js')) {
  main();
}

export default ProjectCleanupTool;
