/**
 * 重复文件内容分析工具
 * 检测项目中内容相同或高度相似的文件
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DuplicateAnalyzer {
  constructor() {
    this.files = new Map(); // 存储文件路径和内容哈希
    this.duplicates = new Map(); // 存储重复文件组
    this.similarFiles = []; // 存储相似文件
    this.excludePatterns = [
      /node_modules/,
      /\.git/,
      /dist/,
      /build/,
      /coverage/,
      /\.next/,
      /package-lock\.json/,
      /yarn\.lock/,
      /\.png$/,
      /\.jpg$/,
      /\.jpeg$/,
      /\.gif$/,
      /\.ico$/,
      /\.svg$/,
      /\.woff/,
      /\.ttf/,
      /\.eot/,
      /\.map$/,
      /\.min\./
    ];
  }

  // 计算文件内容的哈希值
  getFileHash(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      return null;
    }
  }

  // 获取文件内容
  getFileContent(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      return null;
    }
  }

  // 计算两个文件的相似度
  calculateSimilarity(content1, content2) {
    if (!content1 || !content2) return 0;
    
    const lines1 = content1.split('\n').filter(line => line.trim());
    const lines2 = content2.split('\n').filter(line => line.trim());
    
    const set1 = new Set(lines1);
    const set2 = new Set(lines2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size === 0 ? 0 : (intersection.size / union.size) * 100;
  }

  // 判断是否应该排除该文件
  shouldExclude(filePath) {
    return this.excludePatterns.some(pattern => pattern.test(filePath));
  }

  // 递归扫描目录
  scanDirectory(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (this.shouldExclude(fullPath)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        this.scanDirectory(fullPath);
      } else if (entry.isFile()) {
        const hash = this.getFileHash(fullPath);
        if (hash) {
          if (!this.files.has(hash)) {
            this.files.set(hash, []);
          }
          this.files.get(hash).push(fullPath);
        }
      }
    }
  }

  // 查找完全重复的文件
  findExactDuplicates() {
    for (const [hash, paths] of this.files) {
      if (paths.length > 1) {
        this.duplicates.set(hash, paths);
      }
    }
  }

  // 查找相似文件（用于特定类型的文件）
  findSimilarFiles(threshold = 80) {
    const allFiles = [];
    for (const paths of this.files.values()) {
      allFiles.push(...paths);
    }

    // 只检查代码文件
    const codeFiles = allFiles.filter(file => {
      const ext = path.extname(file);
      return ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss'].includes(ext);
    });

    for (let i = 0; i < codeFiles.length; i++) {
      for (let j = i + 1; j < codeFiles.length; j++) {
        const content1 = this.getFileContent(codeFiles[i]);
        const content2 = this.getFileContent(codeFiles[j]);
        
        if (content1 && content2) {
          const similarity = this.calculateSimilarity(content1, content2);
          if (similarity >= threshold && similarity < 100) {
            this.similarFiles.push({
              file1: codeFiles[i],
              file2: codeFiles[j],
              similarity: similarity.toFixed(2)
            });
          }
        }
      }
    }
  }

  // 分析特定模式的重复
  analyzePatterns() {
    const patterns = {
      testFiles: [],
      configFiles: [],
      componentFiles: [],
      serviceFiles: [],
      routeFiles: [],
      typeFiles: []
    };

    for (const paths of this.files.values()) {
      for (const filePath of paths) {
        const fileName = path.basename(filePath).toLowerCase();
        const dirName = path.dirname(filePath).toLowerCase();

        if (fileName.includes('test') || dirName.includes('test')) {
          patterns.testFiles.push(filePath);
        }
        if (fileName.includes('config') || dirName.includes('config')) {
          patterns.configFiles.push(filePath);
        }
        if (fileName.includes('component') || dirName.includes('component')) {
          patterns.componentFiles.push(filePath);
        }
        if (fileName.includes('service') || dirName.includes('service')) {
          patterns.serviceFiles.push(filePath);
        }
        if (fileName.includes('route') || dirName.includes('route')) {
          patterns.routeFiles.push(filePath);
        }
        if (fileName.includes('type') || fileName.includes('interface') || dirName.includes('type')) {
          patterns.typeFiles.push(filePath);
        }
      }
    }

    return patterns;
  }

  // 生成报告
  generateReport() {
    const report = {
      summary: {
        totalFiles: 0,
        duplicateGroups: this.duplicates.size,
        totalDuplicateFiles: 0,
        totalSimilarPairs: this.similarFiles.length,
        potentialSpaceSaved: 0
      },
      exactDuplicates: [],
      similarFiles: [],
      recommendations: []
    };

    // 统计文件总数
    for (const paths of this.files.values()) {
      report.summary.totalFiles += paths.length;
    }

    // 处理完全重复的文件
    for (const [hash, paths] of this.duplicates) {
      if (paths.length > 1) {
        const fileSize = fs.statSync(paths[0]).size;
        const duplicateGroup = {
          hash,
          files: paths.map(p => {
            const relativePath = path.relative(process.cwd(), p);
            return {
              path: relativePath,
              size: fileSize,
              sizeStr: this.formatFileSize(fileSize)
            };
          }),
          totalSize: fileSize * paths.length,
          potentialSaving: fileSize * (paths.length - 1)
        };
        
        report.exactDuplicates.push(duplicateGroup);
        report.summary.totalDuplicateFiles += paths.length - 1;
        report.summary.potentialSpaceSaved += duplicateGroup.potentialSaving;
      }
    }

    // 处理相似文件
    report.similarFiles = this.similarFiles.map(item => ({
      file1: path.relative(process.cwd(), item.file1),
      file2: path.relative(process.cwd(), item.file2),
      similarity: item.similarity + '%'
    }));

    // 生成建议
    report.recommendations = this.generateRecommendations(report);

    return report;
  }

  // 格式化文件大小
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // 生成优化建议
  generateRecommendations(report) {
    const recommendations = [];

    // 检查测试文件重复
    const testDuplicates = report.exactDuplicates.filter(group => 
      group.files.some(f => f.path.includes('test'))
    );
    if (testDuplicates.length > 0) {
      recommendations.push({
        type: 'TEST_DUPLICATES',
        severity: 'medium',
        message: `发现 ${testDuplicates.length} 组重复的测试文件，建议合并或删除重复项`,
        files: testDuplicates.flatMap(g => g.files.map(f => f.path))
      });
    }

    // 检查配置文件重复
    const configDuplicates = report.exactDuplicates.filter(group => 
      group.files.some(f => f.path.includes('config'))
    );
    if (configDuplicates.length > 0) {
      recommendations.push({
        type: 'CONFIG_DUPLICATES',
        severity: 'high',
        message: `发现 ${configDuplicates.length} 组重复的配置文件，可能导致配置冲突`,
        files: configDuplicates.flatMap(g => g.files.map(f => f.path))
      });
    }

    // 检查组件重复
    const componentDuplicates = report.exactDuplicates.filter(group => 
      group.files.some(f => f.path.includes('component'))
    );
    if (componentDuplicates.length > 0) {
      recommendations.push({
        type: 'COMPONENT_DUPLICATES',
        severity: 'medium',
        message: `发现 ${componentDuplicates.length} 组重复的组件文件，建议提取为共享组件`,
        files: componentDuplicates.flatMap(g => g.files.map(f => f.path))
      });
    }

    // 检查高相似度文件
    const highSimilarity = report.similarFiles.filter(item => 
      parseFloat(item.similarity) > 90
    );
    if (highSimilarity.length > 0) {
      recommendations.push({
        type: 'HIGH_SIMILARITY',
        severity: 'low',
        message: `发现 ${highSimilarity.length} 对高度相似的文件（相似度>90%），考虑合并或重构`,
        files: highSimilarity
      });
    }

    // 空间优化建议
    if (report.summary.potentialSpaceSaved > 1024 * 1024) {
      recommendations.push({
        type: 'SPACE_OPTIMIZATION',
        severity: 'low',
        message: `通过删除重复文件可以节省 ${this.formatFileSize(report.summary.potentialSpaceSaved)} 空间`
      });
    }

    return recommendations;
  }

  // 主执行函数
  async analyze(rootPath = '.') {
    console.log('🔍 开始扫描项目文件...');
    this.scanDirectory(rootPath);
    
    console.log('📊 分析完全重复的文件...');
    this.findExactDuplicates();
    
    console.log('🔄 分析相似文件（这可能需要一些时间）...');
    this.findSimilarFiles();
    
    console.log('📝 生成分析报告...');
    const report = this.generateReport();
    
    // 保存报告
    const reportPath = path.join(process.cwd(), 'duplicate-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // 打印摘要
    console.log('\n' + '='.repeat(80));
    console.log('📋 重复文件分析报告');
    console.log('='.repeat(80));
    console.log(`\n📊 摘要统计:`);
    console.log(`  • 扫描文件总数: ${report.summary.totalFiles}`);
    console.log(`  • 重复文件组数: ${report.summary.duplicateGroups}`);
    console.log(`  • 重复文件总数: ${report.summary.totalDuplicateFiles}`);
    console.log(`  • 相似文件对数: ${report.summary.totalSimilarPairs}`);
    console.log(`  • 可节省空间: ${this.formatFileSize(report.summary.potentialSpaceSaved)}`);
    
    if (report.exactDuplicates.length > 0) {
      console.log(`\n🔴 完全重复的文件组（前10个）:`);
      report.exactDuplicates.slice(0, 10).forEach((group, index) => {
        console.log(`\n  ${index + 1}. 重复组 (${group.files.length} 个文件, 每个 ${group.files[0].sizeStr}):`);
        group.files.forEach(file => {
          console.log(`     - ${file.path}`);
        });
      });
    }
    
    if (report.similarFiles.length > 0) {
      console.log(`\n🟡 高度相似的文件（相似度>80%，前10对）:`);
      report.similarFiles.slice(0, 10).forEach((pair, index) => {
        console.log(`\n  ${index + 1}. 相似度 ${pair.similarity}:`);
        console.log(`     - ${pair.file1}`);
        console.log(`     - ${pair.file2}`);
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log(`\n💡 优化建议:`);
      report.recommendations.forEach((rec, index) => {
        const severityIcon = rec.severity === 'high' ? '🔴' : rec.severity === 'medium' ? '🟡' : '🟢';
        console.log(`\n  ${severityIcon} ${rec.message}`);
        if (rec.files && Array.isArray(rec.files) && typeof rec.files[0] === 'string') {
          console.log(`     涉及文件: ${rec.files.slice(0, 3).join(', ')}${rec.files.length > 3 ? '...' : ''}`);
        }
      });
    }
    
    console.log(`\n✅ 完整报告已保存至: ${reportPath}`);
    console.log('='.repeat(80));
    
    return report;
  }
}

// 执行分析
if (require.main === module) {
  const analyzer = new DuplicateAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = DuplicateAnalyzer;
