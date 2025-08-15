/**
 * 全面重复文件查找器
 * 查找项目中所有类型的重复文件
 */

const fs = require('fs');
const path = require('path');

class ComprehensiveDuplicateFinder {
  constructor() {
    this.projectRoot = process.cwd();
    this.duplicateGroups = new Map();
    this.potentialDuplicates = [];
    
    // 扩展的修饰词列表
    this.modifierKeywords = [
      'advanced', 'enhanced', 'optimized', 'improved', 'unified',
      'super', 'extended', 'modern', 'smart', 'better', 'new',
      'updated', 'intelligent', 'complete', 'full', 'ultra',
      'pro', 'premium', 'master', 'final', 'latest', 'v2', 'v3',
      'backup', 'old', 'temp', 'tmp', 'copy', 'duplicate', 'test'
    ];
  }

  /**
   * 执行全面扫描
   */
  async scan() {
    console.log('🔍 开始全面重复文件扫描...\n');
    
    // 扫描所有文件
    const allFiles = this.scanAllFiles();
    console.log(`📊 扫描到 ${allFiles.length} 个文件\n`);
    
    // 查找不同类型的重复文件
    await this.findExactDuplicates(allFiles);
    await this.findSimilarNamedFiles(allFiles);
    await this.findModifierFiles(allFiles);
    await this.findBackupFiles(allFiles);
    
    // 生成报告
    this.generateReport();
    
    console.log('\n✅ 全面扫描完成！');
  }

  /**
   * 扫描所有文件
   */
  scanAllFiles() {
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
            if (fileInfo) {
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
    scanDirectory(path.join(this.projectRoot, 'scripts'));
    
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
    
    return {
      fullPath,
      relativePath: relativePath.replace(/\\/g, '/'),
      fileName,
      baseName,
      extension,
      directory: directory.replace(/\\/g, '/'),
      size: stat.size,
      lastModified: stat.mtime,
      lines: this.countLines(fullPath),
      hash: this.calculateFileHash(fullPath)
    };
  }

  /**
   * 查找完全相同的文件
   */
  async findExactDuplicates(files) {
    console.log('🔍 查找完全相同的文件...');
    
    const hashGroups = new Map();
    
    files.forEach(file => {
      if (!hashGroups.has(file.hash)) {
        hashGroups.set(file.hash, []);
      }
      hashGroups.get(file.hash).push(file);
    });
    
    let exactDuplicates = 0;
    hashGroups.forEach((fileList, hash) => {
      if (fileList.length > 1) {
        exactDuplicates += fileList.length;
        this.potentialDuplicates.push({
          type: 'exact_duplicate',
          reason: '文件内容完全相同',
          risk: 'low',
          files: fileList,
          recommendation: '保留一个，删除其他'
        });
      }
    });
    
    console.log(`   找到 ${exactDuplicates} 个完全相同的文件\n`);
  }

  /**
   * 查找相似命名的文件
   */
  async findSimilarNamedFiles(files) {
    console.log('🔍 查找相似命名的文件...');
    
    const nameGroups = new Map();
    
    files.forEach(file => {
      const cleanName = this.getCleanName(file.baseName);
      const groupKey = `${file.directory}/${cleanName}${file.extension}`;
      
      if (!nameGroups.has(groupKey)) {
        nameGroups.set(groupKey, []);
      }
      nameGroups.get(groupKey).push(file);
    });
    
    let similarNamed = 0;
    nameGroups.forEach((fileList, groupKey) => {
      if (fileList.length > 1) {
        similarNamed += fileList.length;
        this.potentialDuplicates.push({
          type: 'similar_named',
          reason: '文件名相似，可能是不同版本',
          risk: 'medium',
          files: fileList,
          recommendation: '检查功能差异，保留最完整版本'
        });
      }
    });
    
    console.log(`   找到 ${similarNamed} 个相似命名的文件\n`);
  }

  /**
   * 查找带修饰词的文件
   */
  async findModifierFiles(files) {
    console.log('🔍 查找带修饰词的文件...');
    
    const modifierFiles = files.filter(file => {
      return this.modifierKeywords.some(keyword => 
        file.baseName.toLowerCase().includes(keyword.toLowerCase())
      );
    });
    
    if (modifierFiles.length > 0) {
      console.log(`   找到 ${modifierFiles.length} 个带修饰词的文件:`);
      modifierFiles.forEach(file => {
        const modifiers = this.extractModifiers(file.baseName);
        console.log(`     ${file.relativePath} (修饰词: ${modifiers.join(', ')})`);
      });
      
      this.potentialDuplicates.push({
        type: 'modifier_files',
        reason: '文件名包含版本修饰词',
        risk: 'medium',
        files: modifierFiles,
        recommendation: '检查是否为功能描述或版本标识'
      });
    }
    
    console.log('');
  }

  /**
   * 查找备份文件
   */
  async findBackupFiles(files) {
    console.log('🔍 查找备份文件...');
    
    const backupPatterns = [
      /\.bak$/i,
      /\.backup$/i,
      /\.old$/i,
      /\.orig$/i,
      /\.tmp$/i,
      /\.temp$/i,
      /_backup\./i,
      /_old\./i,
      /_copy\./i,
      /\(copy\)/i,
      /\(backup\)/i,
      /\(old\)/i
    ];
    
    const backupFiles = files.filter(file => {
      return backupPatterns.some(pattern => pattern.test(file.fileName));
    });
    
    if (backupFiles.length > 0) {
      console.log(`   找到 ${backupFiles.length} 个可能的备份文件:`);
      backupFiles.forEach(file => {
        console.log(`     ${file.relativePath}`);
      });
      
      this.potentialDuplicates.push({
        type: 'backup_files',
        reason: '可能是备份文件',
        risk: 'low',
        files: backupFiles,
        recommendation: '确认后可以安全删除'
      });
    }
    
    console.log('');
  }

  /**
   * 提取修饰词
   */
  extractModifiers(baseName) {
    const modifiers = [];
    const lowerBaseName = baseName.toLowerCase();
    
    this.modifierKeywords.forEach(keyword => {
      if (lowerBaseName.includes(keyword.toLowerCase())) {
        modifiers.push(keyword);
      }
    });
    
    return modifiers;
  }

  /**
   * 获取清理后的文件名
   */
  getCleanName(baseName) {
    let cleanName = baseName.toLowerCase();
    
    // 移除修饰词
    this.modifierKeywords.forEach(keyword => {
      const regex = new RegExp(keyword.toLowerCase(), 'g');
      cleanName = cleanName.replace(regex, '');
    });
    
    // 清理连接符
    cleanName = cleanName.replace(/[-_]{2,}/g, '-');
    cleanName = cleanName.replace(/^[-_]+|[-_]+$/g, '');
    
    return cleanName || 'unnamed';
  }

  /**
   * 计算文件哈希
   */
  calculateFileHash(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      // 简单的哈希算法
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
      }
      return hash.toString();
    } catch {
      return 'error';
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
    return /\.(ts|tsx|js|jsx|cjs|mjs)$/.test(fileName) && 
           !fileName.includes('.test.') && 
           !fileName.includes('.spec.');
  }

  /**
   * 生成报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'comprehensive-duplicate-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalDuplicateGroups: this.potentialDuplicates.length,
        exactDuplicates: this.potentialDuplicates.filter(g => g.type === 'exact_duplicate').length,
        similarNamed: this.potentialDuplicates.filter(g => g.type === 'similar_named').length,
        modifierFiles: this.potentialDuplicates.filter(g => g.type === 'modifier_files').length,
        backupFiles: this.potentialDuplicates.filter(g => g.type === 'backup_files').length
      },
      duplicateGroups: this.potentialDuplicates.map(group => ({
        type: group.type,
        reason: group.reason,
        risk: group.risk,
        recommendation: group.recommendation,
        fileCount: group.files.length,
        files: group.files.map(f => ({
          path: f.relativePath,
          size: f.size,
          lines: f.lines,
          lastModified: f.lastModified
        }))
      }))
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('📊 扫描报告:');
    console.log(`   重复文件组: ${report.summary.totalDuplicateGroups}`);
    console.log(`   完全相同: ${report.summary.exactDuplicates}`);
    console.log(`   相似命名: ${report.summary.similarNamed}`);
    console.log(`   修饰词文件: ${report.summary.modifierFiles}`);
    console.log(`   备份文件: ${report.summary.backupFiles}`);
    console.log(`   报告已保存: ${reportPath}`);
  }
}

// 执行扫描
if (require.main === module) {
  const finder = new ComprehensiveDuplicateFinder();
  finder.scan().catch(console.error);
}

module.exports = ComprehensiveDuplicateFinder;
