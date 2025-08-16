/**
 * 重复文件版本分析器
 * 系统性分析和清理项目中带有修饰词的重复文件
 */

const fs = require('fs');
const path = require('path');

class DuplicateFileAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.backupDir = path.join(this.projectRoot, 'backup', 'duplicate-cleanup');

    // 修饰词前缀和后缀
    this.modifierPrefixes = [
      'Enhanced', 'Optimized', 'Improved', 'Advanced', 'Unified',
      'Super', 'Extended', 'Modern', 'Smart', 'Better', 'New',
      'Updated', 'Intelligent', 'Complete', 'Full', 'Ultra',
      'Pro', 'Premium', 'Master', 'Final', 'Latest'
    ];

    this.modifierSuffixes = [
      'Enhanced', 'Optimized', 'Improved', 'Advanced', 'Unified',
      'Super', 'Extended', 'Modern', 'Smart', 'Better', 'New',
      'Updated', 'Intelligent', 'Complete', 'Full', 'Ultra',
      'Pro', 'Premium', 'Master', 'Final', 'Latest', 'V2', 'V3', '2', '3'
    ];

    this.duplicateGroups = new Map();
    this.analysisResults = {
      totalFiles: 0,
      duplicateFiles: 0,
      duplicateGroups: 0,
      recommendations: []
    };
  }

  /**
   * 执行完整的重复文件分析
   */
  async analyze() {
    console.log('🔍 开始重复文件版本分析...\n');

    // 创建备份目录
    this.ensureBackupDirectory();

    // 扫描所有文件
    const allFiles = this.scanAllFiles();
    this.analysisResults.totalFiles = allFiles.length;

    // 找出所有带有修饰词的文件
    const modifiedFiles = allFiles.filter(file => file.hasModifiers);
    console.log(`📋 找到 ${modifiedFiles.length} 个带有修饰词的文件:`);
    modifiedFiles.forEach(file => {
      console.log(`   ${file.relativePath} (修饰词: ${file.modifiers.map(m => m.value).join(', ')})`);
    });

    // 分组重复文件
    this.groupDuplicateFiles(allFiles);

    // 分析每个组
    await this.analyzeGroups();

    // 生成报告
    this.generateReport(modifiedFiles);

    console.log('✅ 分析完成！');
  }

  /**
   * 扫描所有项目文件
   */
  scanAllFiles() {
    const files = [];

    const scanDirectory = (dir, relativePath = '') => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);

      items.forEach(item => {
        // 跳过不需要的目录
        if (this.shouldSkipDirectory(item)) return;

        const fullPath = path.join(dir, item);
        const relativeFilePath = path.join(relativePath, item);

        try {
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            scanDirectory(fullPath, relativeFilePath);
          } else if (this.isTargetFile(item)) {
            const fileInfo = this.analyzeFile(fullPath, relativeFilePath, stat);
            if (fileInfo) {
              files.push(fileInfo);
            }
          }
        } catch (error) {
          // 忽略无法访问的文件
        }
      });
    };

    // 扫描前端和后端目录
    scanDirectory(path.join(this.projectRoot, 'frontend'));
    scanDirectory(path.join(this.projectRoot, 'backend'));

    return files;
  }

  /**
   * 分析单个文件
   */
  analyzeFile(fullPath, relativePath, stat) {
    const fileName = path.basename(relativePath);
    const baseName = path.basename(fileName, path.extname(fileName));
    const extension = path.extname(fileName);
    const directory = path.dirname(relativePath);

    // 检查是否包含修饰词
    const modifiers = this.extractModifiers(baseName);
    const cleanName = this.generateCleanName(baseName);

    return {
      fullPath,
      relativePath: relativePath.replace(/\\/g, '/'),
      fileName,
      baseName,
      cleanName,
      extension,
      directory: directory.replace(/\\/g, '/'),
      modifiers,
      hasModifiers: modifiers.length > 0,
      size: stat.size,
      lastModified: stat.mtime,
      lines: this.countLines(fullPath),
      imports: this.extractImports(fullPath),
      exports: this.extractExports(fullPath)
    };
  }

  /**
   * 提取文件中的修饰词
   */
  extractModifiers(baseName) {
    const modifiers = [];
    const lowerBaseName = baseName.toLowerCase();

    // 检查前缀（不区分大小写）
    this.modifierPrefixes.forEach(prefix => {
      const lowerPrefix = prefix.toLowerCase();
      if (lowerBaseName.startsWith(lowerPrefix)) {
        modifiers.push({ type: 'prefix', value: prefix });
      }
    });

    // 检查后缀（不区分大小写）
    this.modifierSuffixes.forEach(suffix => {
      const lowerSuffix = suffix.toLowerCase();
      if (lowerBaseName.endsWith(lowerSuffix)) {
        modifiers.push({ type: 'suffix', value: suffix });
      }
    });

    // 检查中间包含的修饰词（不区分大小写）
    this.modifierPrefixes.forEach(prefix => {
      const lowerPrefix = prefix.toLowerCase();
      if (lowerBaseName.includes(lowerPrefix) &&
        !lowerBaseName.startsWith(lowerPrefix) &&
        !lowerBaseName.endsWith(lowerPrefix)) {
        modifiers.push({ type: 'middle', value: prefix });
      }
    });

    return modifiers;
  }

  /**
   * 生成清理后的文件名
   */
  generateCleanName(baseName) {
    let cleanName = baseName;

    // 移除所有修饰词
    [...this.modifierPrefixes, ...this.modifierSuffixes].forEach(modifier => {
      // 移除前缀
      if (cleanName.startsWith(modifier)) {
        cleanName = cleanName.substring(modifier.length);
      }
      // 移除后缀
      if (cleanName.endsWith(modifier)) {
        cleanName = cleanName.substring(0, cleanName.length - modifier.length);
      }
      // 移除中间的修饰词
      cleanName = cleanName.replace(new RegExp(modifier, 'g'), '');
    });

    // 清理多余的连接符
    cleanName = cleanName.replace(/^[-_]+|[-_]+$/g, '');
    cleanName = cleanName.replace(/[-_]{2,}/g, '-');

    // 如果清理后为空，使用默认名称
    if (!cleanName) {
      cleanName = 'Component';
    }

    return cleanName;
  }

  /**
   * 分组重复文件
   */
  groupDuplicateFiles(files) {
    const groups = new Map();

    files.forEach(file => {
      const groupKey = `${file.directory}/${file.cleanName}${file.extension}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }

      groups.get(groupKey).push(file);
    });

    // 只保留有多个文件的组（重复文件组）
    groups.forEach((fileList, groupKey) => {
      if (fileList.length > 1) {
        this.duplicateGroups.set(groupKey, fileList);
        this.analysisResults.duplicateFiles += fileList.length;
      }
    });

    this.analysisResults.duplicateGroups = this.duplicateGroups.size;
  }

  /**
   * 分析重复文件组
   */
  async analyzeGroups() {
    for (const [groupKey, files] of this.duplicateGroups) {
      const analysis = await this.analyzeGroup(groupKey, files);
      this.analysisResults.recommendations.push(analysis);
    }
  }

  /**
   * 分析单个重复文件组
   */
  async analyzeGroup(groupKey, files) {
    // 按评分排序文件
    const scoredFiles = files.map(file => ({
      ...file,
      score: this.calculateFileScore(file)
    })).sort((a, b) => b.score - a.score);

    const bestFile = scoredFiles[0];
    const duplicates = scoredFiles.slice(1);

    return {
      groupKey,
      bestFile,
      duplicates,
      action: this.determineAction(bestFile, duplicates),
      risk: this.assessRisk(bestFile, duplicates),
      estimatedEffort: this.estimateEffort(files.length)
    };
  }

  /**
   * 计算文件评分
   */
  calculateFileScore(file) {
    let score = 0;

    // 基于文件大小和复杂度
    score += Math.min(file.lines / 10, 50);
    score += Math.min(file.size / 1000, 30);
    score += file.exports.length * 5;

    // 修饰词权重（越高级的修饰词得分越高）
    const modifierWeights = {
      'Unified': 20, 'Enhanced': 15, 'Advanced': 12, 'Optimized': 10,
      'Improved': 8, 'Extended': 6, 'Modern': 5, 'Smart': 4,
      'Better': 3, 'New': 2, 'Updated': 1
    };

    file.modifiers.forEach(modifier => {
      if (modifierWeights[modifier.value]) {
        score += modifierWeights[modifier.value];
      }
    });

    // 最近修改时间权重
    const daysSinceModified = (Date.now() - file.lastModified.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 15 - daysSinceModified / 30);

    // 没有修饰词的文件得分较低（可能是基础版本）
    if (!file.hasModifiers) {
      score -= 10;
    }

    return score;
  }

  /**
   * 确定处理动作
   */
  determineAction(bestFile, duplicates) {
    if (bestFile.hasModifiers) {
      return 'rename_and_cleanup';
    } else {
      return 'replace_and_cleanup';
    }
  }

  /**
   * 评估风险等级
   */
  assessRisk(bestFile, duplicates) {
    const totalImports = duplicates.reduce((sum, file) => sum + file.imports.length, 0);

    if (totalImports > 10) return 'high';
    if (totalImports > 5) return 'medium';
    return 'low';
  }

  /**
   * 估算工作量
   */
  estimateEffort(fileCount) {
    if (fileCount > 5) return '60-90分钟';
    if (fileCount > 3) return '30-60分钟';
    return '15-30分钟';
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

  countLines(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return content.split('\n').length;
    } catch {
      return 0;
    }
  }

  extractImports(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
      const imports = [];
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }

      return imports;
    } catch {
      return [];
    }
  }

  extractExports(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const exportRegex = /export\s+(default\s+)?(class|function|const|let|var|interface|type)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
      const exports = [];
      let match;

      while ((match = exportRegex.exec(content)) !== null) {
        exports.push(match[3]);
      }

      return exports;
    } catch {
      return [];
    }
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * 生成分析报告
   */
  generateReport(modifiedFiles = []) {
    const reportPath = path.join(this.projectRoot, 'duplicate-file-analysis-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        ...this.analysisResults,
        modifiedFiles: modifiedFiles.length
      },
      modifiedFiles: modifiedFiles.map(f => ({
        path: f.relativePath,
        modifiers: f.modifiers,
        cleanName: f.cleanName,
        score: this.calculateFileScore(f),
        size: f.size,
        lines: f.lines,
        lastModified: f.lastModified
      })),
      duplicateGroups: Array.from(this.duplicateGroups.entries()).map(([key, files]) => ({
        groupKey: key,
        files: files.map(f => ({
          path: f.relativePath,
          modifiers: f.modifiers,
          score: this.calculateFileScore(f),
          size: f.size,
          lines: f.lines,
          lastModified: f.lastModified
        }))
      })),
      recommendations: this.analysisResults.recommendations
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 分析报告:');
    console.log(`   总文件数: ${this.analysisResults.totalFiles}`);
    console.log(`   带修饰词文件数: ${modifiedFiles.length}`);
    console.log(`   重复文件数: ${this.analysisResults.duplicateFiles}`);
    console.log(`   重复文件组: ${this.analysisResults.duplicateGroups}`);
    console.log(`   报告已保存: ${reportPath}`);
  }
}

// 执行分析
if (require.main === module) {
  const analyzer = new DuplicateFileAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = DuplicateFileAnalyzer;
