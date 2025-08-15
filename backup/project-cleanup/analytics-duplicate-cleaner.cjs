/**
 * Analytics相关重复文件清理器
 * 专门处理Analytics相关的重复文件版本问题
 */

const fs = require('fs');
const path = require('path');

class AnalyticsDuplicateCleaner {
  constructor() {
    this.projectRoot = process.cwd();
    this.backupDir = path.join(this.projectRoot, 'backup', 'analytics-cleanup');
    this.dryRun = process.argv.includes('--dry-run');

    // 定义Analytics相关的重复文件
    this.analyticsDuplicates = [
      {
        category: 'Analytics组件',
        files: [
          {
            path: 'frontend/components/analytics/Analytics.tsx',
            keep: true,
            reason: '高级分析组件，功能完整，包含趋势分析、对比分析等'
          },
          {
            path: 'frontend/pages/data/reports/Analytics.tsx',
            keep: false,
            reason: '简化版本，功能重复'
          }
        ],
        targetName: 'frontend/components/analytics/Analytics.tsx',
        risk: 'medium'
      },
      {
        category: 'AnalyticsPage页面',
        files: [
          {
            path: 'frontend/pages/analytics/AnalyticsPage.tsx',
            keep: true,
            reason: '完整的分析页面，包含多种数据类型和时间范围选择'
          }
        ],
        targetName: 'frontend/pages/analytics/AnalyticsPage.tsx',
        risk: 'low'
      },
      {
        category: 'AnalyticsOverview组件',
        files: [
          {
            path: 'frontend/components/features/AnalyticsOverview.tsx',
            keep: true,
            reason: '概览组件，提供数据总览功能'
          }
        ],
        targetName: 'frontend/components/features/AnalyticsOverview.tsx',
        risk: 'low'
      },
      {
        category: 'AnalyticsService服务',
        files: [
          {
            path: 'frontend/services/analytics/analyticsService.ts',
            keep: true,
            reason: '高级分析服务，功能完整，包含详细指标和洞察分析'
          },
          {
            path: 'frontend/services/analytics/index.ts',
            keep: false,
            reason: '基础版本，功能相对简单'
          }
        ],
        targetName: 'frontend/services/analytics/analyticsService.ts',
        risk: 'high'
      }
    ];
  }

  /**
   * 执行清理流程
   */
  async execute() {
    console.log('🔍 开始Analytics重复文件清理...\n');

    if (this.dryRun) {
      console.log('🔍 [试运行模式] 不会实际修改文件\n');
    }

    // 创建备份目录
    this.ensureBackupDirectory();

    // 首先分析所有Analytics相关文件
    await this.analyzeAnalyticsFiles();

    // 处理每个重复文件组
    for (const group of this.analyticsDuplicates) {
      await this.processGroup(group);
    }

    // 生成清理报告
    this.generateReport();

    console.log('\n✅ Analytics重复文件清理完成！');
  }

  /**
   * 分析所有Analytics相关文件
   */
  async analyzeAnalyticsFiles() {
    console.log('📊 分析Analytics相关文件...\n');

    const analyticsFiles = this.findAnalyticsFiles();

    console.log(`找到 ${analyticsFiles.length} 个Analytics相关文件:`);
    analyticsFiles.forEach(file => {
      try {
        const fullPath = path.join(this.projectRoot, file);
        const stat = fs.statSync(fullPath);
        const lines = this.countLines(fullPath);
        console.log(`  📄 ${file} (${lines}行, ${stat.size}字节)`);
      } catch (error) {
        console.log(`  ❌ ${file} (文件不存在或无法访问)`);
      }
    });

    console.log('\n');
  }

  /**
   * 查找所有Analytics相关文件
   */
  findAnalyticsFiles() {
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
          } else if (this.isAnalyticsFile(item)) {
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
   * 判断是否是Analytics相关文件
   */
  isAnalyticsFile(fileName) {
    const analyticsKeywords = [
      'analytics', 'Analytics', 'analysis', 'Analysis'
    ];

    return analyticsKeywords.some(keyword =>
      fileName.toLowerCase().includes(keyword.toLowerCase())
    ) && /\.(ts|tsx|js|jsx)$/.test(fileName);
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

    if (existingFiles.length < 1) {
      console.log(`   ℹ️  跳过：没有文件存在`);
      return;
    }

    // 找到要保留和删除的文件
    const keepFiles = existingFiles.filter(file => file.keep);
    const removeFiles = existingFiles.filter(file => !file.keep);

    if (keepFiles.length === 0) {
      console.log(`   ℹ️  跳过：没有指定要保留的文件`);
      return;
    }

    console.log(`   ✅ 保留 ${keepFiles.length} 个文件:`);
    keepFiles.forEach(file => {
      console.log(`     - ${file.path} (${file.reason})`);
    });

    if (removeFiles.length > 0) {
      console.log(`   🗑️  删除 ${removeFiles.length} 个文件:`);
      removeFiles.forEach(file => {
        console.log(`     - ${file.path} (${file.reason})`);
      });

      // 分析文件差异
      if (existingFiles.length > 1) {
        await this.analyzeFileDifferences(existingFiles);
      }

      // 检查引用
      for (const file of removeFiles) {
        const references = await this.findFileReferences(file.path);
        if (references.length > 0) {
          console.log(`     📋 ${file.path} 被 ${references.length} 个文件引用`);
        }
      }

      // 执行清理
      if (!this.dryRun) {
        await this.executeCleanup(group, keepFiles[0], removeFiles);
      } else {
        console.log(`   🔍 [试运行] 将删除 ${removeFiles.length} 个重复文件`);
      }
    } else {
      console.log(`   ℹ️  无需删除文件`);
    }
  }

  /**
   * 分析文件内容差异
   */
  async analyzeFileDifferences(files) {
    console.log(`     🔍 分析文件差异...`);

    files.forEach(file => {
      const fullPath = path.join(this.projectRoot, file.path);
      const stat = fs.statSync(fullPath);
      const lines = this.countLines(fullPath);

      console.log(`       ${file.path}: ${lines}行, ${stat.size}字节, 修改时间: ${stat.mtime.toISOString().split('T')[0]}`);
    });
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
   * 执行清理操作
   */
  async executeCleanup(group, keepFile, removeFiles) {
    console.log(`     🧹 执行清理操作...`);

    for (const removeFile of removeFiles) {
      const sourcePath = path.join(this.projectRoot, removeFile.path);
      const backupPath = path.join(this.backupDir, path.basename(removeFile.path));

      // 创建备份
      fs.copyFileSync(sourcePath, backupPath);
      console.log(`       📋 已备份: ${removeFile.path}`);

      // 删除文件
      fs.unlinkSync(sourcePath);
      console.log(`       🗑️  已删除: ${removeFile.path}`);
    }
  }

  /**
   * 工具方法
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
    }
  }

  /**
   * 生成清理报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'analytics-cleanup-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: this.dryRun,
      summary: {
        totalGroups: this.analyticsDuplicates.length,
        processedGroups: this.analyticsDuplicates.length
      },
      groups: this.analyticsDuplicates.map(group => ({
        category: group.category,
        risk: group.risk,
        files: group.files.map(f => ({
          path: f.path,
          keep: f.keep,
          reason: f.reason
        }))
      }))
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 清理报告:');
    console.log(`   处理组数: ${report.summary.totalGroups}`);
    console.log(`   报告已保存: ${reportPath}`);
  }
}

// 执行清理
if (require.main === module) {
  const cleaner = new AnalyticsDuplicateCleaner();
  cleaner.execute().catch(console.error);
}

module.exports = AnalyticsDuplicateCleaner;
