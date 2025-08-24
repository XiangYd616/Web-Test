#!/usr/bin/env node

/**
 * 重复文件清理工具
 * 检测和清理项目中的重复文件和功能
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DuplicateFileCleaner {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.duplicates = [];
    this.backupDir = path.join(this.projectRoot, 'backup', 'duplicate-cleanup');
    this.reportFile = path.join(this.projectRoot, 'duplicate-cleanup-report.md');
  }

  /**
   * 开始清理流程
   */
  async startCleanup() {
    console.log('🔍 开始检测重复文件...');
    console.log('='.repeat(60));

    // 创建备份目录
    this.ensureBackupDir();

    // 检测重复文件
    await this.detectDuplicates();

    // 分析重复文件
    await this.analyzeDuplicates();

    // 生成报告
    await this.generateReport();

    // 执行清理（如果用户确认）
    if (process.argv.includes('--execute')) {
      await this.executeCleaning();
    } else {
      console.log('\n💡 要执行清理，请运行: node scripts/duplicateFileCleaner.cjs --execute');
    }
  }

  /**
   * 确保备份目录存在
   */
  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`📁 创建备份目录: ${this.backupDir}`);
    }
  }

  /**
   * 检测重复文件
   */
  async detectDuplicates() {
    const fileMap = new Map(); // hash -> [files]
    const nameMap = new Map(); // basename -> [files]

    // 扫描前端文件
    const frontendFiles = this.scanDirectory(path.join(this.projectRoot, 'frontend'), ['.ts', '.tsx', '.js', '.jsx']);

    console.log(`📊 扫描到 ${frontendFiles.length} 个前端文件`);

    // 按内容哈希分组
    for (const file of frontendFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const hash = this.calculateContentHash(content);
        const basename = path.basename(file, path.extname(file));

        if (!fileMap.has(hash)) {
          fileMap.set(hash, []);
        }
        fileMap.get(hash).push({ file, content, size: content.length });

        if (!nameMap.has(basename)) {
          nameMap.set(basename, []);
        }
        nameMap.get(basename).push({ file, content, size: content.length });
      } catch (error) {
        console.warn(`⚠️ 无法读取文件: ${file}`);
      }
    }

    // 找出重复文件
    for (const [hash, files] of fileMap) {
      if (files.length > 1) {
        this.duplicates.push({
          type: 'identical',
          hash,
          files,
          reason: '文件内容完全相同'
        });
      }
    }

    // 找出同名文件
    for (const [basename, files] of nameMap) {
      if (files.length > 1) {
        // 检查是否已经在identical中
        const isIdentical = this.duplicates.some(dup =>
          dup.type === 'identical' &&
          dup.files.some(f => files.some(file => f.file === file.file))
        );

        if (!isIdentical) {
          this.duplicates.push({
            type: 'similar_name',
            basename,
            files,
            reason: '文件名相同但内容不同'
          });
        }
      }
    }

    console.log(`🔍 发现 ${this.duplicates.length} 组重复文件`);
  }

  /**
   * 分析重复文件
   */
  async analyzeDuplicates() {
    console.log('\n📊 分析重复文件...');

    for (const duplicate of this.duplicates) {
      // 计算文件相似度
      if (duplicate.type === 'similar_name') {
        duplicate.similarity = this.calculateSimilarity(duplicate.files);
      }

      // 确定推荐操作
      duplicate.recommendation = this.getRecommendation(duplicate);

      // 风险评估
      duplicate.risk = this.assessRisk(duplicate);
    }
  }

  /**
   * 计算内容哈希
   */
  calculateContentHash(content) {
    // 更保守的标准化，只移除行尾空白
    const normalized = content
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      .trim();

    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * 计算文件相似度
   */
  calculateSimilarity(files) {
    if (files.length !== 2) return 0;

    const [file1, file2] = files;
    const lines1 = file1.content.split('\n');
    const lines2 = file2.content.split('\n');

    let commonLines = 0;
    const totalLines = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < Math.min(lines1.length, lines2.length); i++) {
      if (lines1[i].trim() === lines2[i].trim()) {
        commonLines++;
      }
    }

    return totalLines > 0 ? (commonLines / totalLines) * 100 : 0;
  }

  /**
   * 获取推荐操作
   */
  getRecommendation(duplicate) {
    if (duplicate.type === 'identical') {
      // 完全相同的文件，保留路径更合理的
      const sortedFiles = duplicate.files.sort((a, b) => {
        // 优先保留更短路径的文件
        const pathA = a.file.split('/').length;
        const pathB = b.file.split('/').length;
        if (pathA !== pathB) return pathA - pathB;

        // 优先保留非测试文件
        const isTestA = a.file.includes('test') || a.file.includes('__tests__');
        const isTestB = b.file.includes('test') || b.file.includes('__tests__');
        if (isTestA !== isTestB) return isTestA ? 1 : -1;

        return 0;
      });

      return {
        action: 'delete_duplicates',
        keep: sortedFiles[0].file,
        delete: sortedFiles.slice(1).map(f => f.file)
      };
    }

    if (duplicate.type === 'similar_name' && duplicate.similarity > 80) {
      // 高相似度的同名文件，保留更大的
      const sortedFiles = duplicate.files.sort((a, b) => b.size - a.size);

      return {
        action: 'merge_or_delete',
        keep: sortedFiles[0].file,
        delete: sortedFiles.slice(1).map(f => f.file),
        note: '建议手动检查差异后合并'
      };
    }

    return {
      action: 'manual_review',
      note: '需要手动检查和决定'
    };
  }

  /**
   * 评估风险等级
   */
  assessRisk(duplicate) {
    let risk = 'low';

    // 检查是否有导入引用
    const hasImports = duplicate.files.some(f =>
      this.checkFileReferences(f.file)
    );

    if (hasImports) risk = 'medium';

    // 检查是否是核心文件
    const isCoreFile = duplicate.files.some(f =>
      f.file.includes('/core/') ||
      f.file.includes('/main/') ||
      f.file.includes('index.')
    );

    if (isCoreFile) risk = 'high';

    return risk;
  }

  /**
   * 检查文件引用
   */
  checkFileReferences(filePath) {
    // 简化的引用检查
    const relativePath = path.relative(this.projectRoot, filePath);
    const basename = path.basename(filePath, path.extname(filePath));

    try {
      const frontendDir = path.join(this.projectRoot, 'frontend');
      const files = this.scanDirectory(frontendDir, ['.ts', '.tsx', '.js', '.jsx']);

      for (const file of files) {
        if (file === filePath) continue;

        const content = fs.readFileSync(file, 'utf8');
        if (content.includes(basename) || content.includes(relativePath)) {
          return true;
        }
      }
    } catch (error) {
      console.warn(`⚠️ 检查引用时出错: ${error.message}`);
    }

    return false;
  }

  /**
   * 扫描目录
   */
  scanDirectory(dir, extensions) {
    const files = [];

    if (!fs.existsSync(dir)) return files;

    const scan = (currentDir) => {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // 跳过某些目录
          if (['node_modules', 'dist', 'build', '.git', '__pycache__'].includes(item)) {
            continue;
          }
          scan(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    scan(dir);
    return files;
  }

  /**
   * 生成报告
   */
  async generateReport() {
    console.log('\n📋 生成清理报告...');

    let report = '# 重复文件清理报告\n\n';
    report += `**生成时间**: ${new Date().toISOString()}\n`;
    report += `**检测到重复组数**: ${this.duplicates.length}\n\n`;

    if (this.duplicates.length === 0) {
      report += '🎉 没有发现重复文件！\n';
    } else {
      report += '## 📊 重复文件详情\n\n';

      this.duplicates.forEach((duplicate, index) => {
        report += `### ${index + 1}. ${duplicate.type === 'identical' ? '完全相同' : '同名文件'}\n\n`;
        report += `**原因**: ${duplicate.reason}\n`;
        report += `**风险等级**: ${duplicate.risk}\n`;

        if (duplicate.similarity) {
          report += `**相似度**: ${duplicate.similarity.toFixed(1)}%\n`;
        }

        report += `**文件列表**:\n`;
        duplicate.files.forEach(file => {
          report += `- \`${path.relative(this.projectRoot, file.file)}\` (${file.size} 字节)\n`;
        });

        report += `\n**推荐操作**: ${duplicate.recommendation.action}\n`;
        if (duplicate.recommendation.keep) {
          report += `**保留**: \`${path.relative(this.projectRoot, duplicate.recommendation.keep)}\`\n`;
        }
        if (duplicate.recommendation.delete) {
          report += `**删除**: \n`;
          duplicate.recommendation.delete.forEach(file => {
            report += `- \`${path.relative(this.projectRoot, file)}\`\n`;
          });
        }
        if (duplicate.recommendation.note) {
          report += `**注意**: ${duplicate.recommendation.note}\n`;
        }

        report += '\n---\n\n';
      });
    }

    fs.writeFileSync(this.reportFile, report);
    console.log(`📄 报告已保存到: ${this.reportFile}`);
  }

  /**
   * 执行清理
   */
  async executeCleaning() {
    console.log('\n🧹 开始执行清理...');

    let cleanedCount = 0;
    let skippedCount = 0;

    for (const duplicate of this.duplicates) {
      if (duplicate.recommendation.action === 'delete_duplicates' && duplicate.risk !== 'high') {
        for (const fileToDelete of duplicate.recommendation.delete) {
          try {
            // 备份文件
            const backupPath = path.join(this.backupDir, path.basename(fileToDelete));
            fs.copyFileSync(fileToDelete, backupPath);

            // 删除文件
            fs.unlinkSync(fileToDelete);

            console.log(`✅ 已删除: ${path.relative(this.projectRoot, fileToDelete)}`);
            cleanedCount++;
          } catch (error) {
            console.error(`❌ 删除失败: ${fileToDelete} - ${error.message}`);
          }
        }
      } else {
        console.log(`⏭️ 跳过高风险文件: ${duplicate.recommendation.keep || '未知'}`);
        skippedCount++;
      }
    }

    console.log(`\n📊 清理完成: 删除 ${cleanedCount} 个文件，跳过 ${skippedCount} 个文件`);
    console.log(`💾 备份位置: ${this.backupDir}`);
  }
}

// 主函数
async function main() {
  const cleaner = new DuplicateFileCleaner();

  try {
    await cleaner.startCleanup();
  } catch (error) {
    console.error('❌ 清理过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行清理
if (require.main === module) {
  main().catch(console.error);
}

module.exports = DuplicateFileCleaner;
