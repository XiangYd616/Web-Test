#!/usr/bin/env node

/**
 * 简单重复文件检测器
 * 使用精确的内容比较来检测真正的重复文件
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SimpleDuplicateDetector {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.duplicates = [];
  }

  /**
   * 开始检测
   */
  async detect() {
    console.log('🔍 开始精确检测重复文件...');
    console.log('=' .repeat(60));

    const files = this.scanFrontendFiles();
    console.log(`📊 扫描到 ${files.length} 个前端文件`);

    const fileMap = new Map(); // hash -> [files]
    const nameMap = new Map(); // basename -> [files]

    // 计算文件哈希
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const hash = crypto.createHash('md5').update(content).digest('hex');
        const basename = path.basename(file, path.extname(file));

        // 按内容哈希分组
        if (!fileMap.has(hash)) {
          fileMap.set(hash, []);
        }
        fileMap.get(hash).push({ file, content, size: content.length });

        // 按文件名分组
        if (!nameMap.has(basename)) {
          nameMap.set(basename, []);
        }
        nameMap.get(basename).push({ file, content, size: content.length });
      } catch (error) {
        console.warn(`⚠️ 无法读取文件: ${file}`);
      }
    }

    // 找出内容完全相同的文件
    let identicalGroups = 0;
    for (const [hash, files] of fileMap) {
      if (files.length > 1) {
        identicalGroups++;
        console.log(`\n📋 发现 ${files.length} 个内容完全相同的文件:`);
        files.forEach(f => {
          console.log(`  - ${path.relative(this.projectRoot, f.file)} (${f.size} 字节)`);
        });
        
        this.duplicates.push({
          type: 'identical',
          files,
          recommendation: this.getIdenticalRecommendation(files)
        });
      }
    }

    // 找出同名但内容不同的文件
    let sameNameGroups = 0;
    for (const [basename, files] of nameMap) {
      if (files.length > 1) {
        // 检查是否已经在identical中
        const isIdentical = this.duplicates.some(dup => 
          dup.type === 'identical' && 
          dup.files.some(f => files.some(file => f.file === file.file))
        );
        
        if (!isIdentical) {
          sameNameGroups++;
          const similarity = this.calculateSimilarity(files[0].content, files[1].content);
          
          console.log(`\n📋 发现 ${files.length} 个同名文件 (相似度: ${similarity.toFixed(1)}%):`);
          files.forEach(f => {
            console.log(`  - ${path.relative(this.projectRoot, f.file)} (${f.size} 字节)`);
          });
          
          this.duplicates.push({
            type: 'same_name',
            files,
            similarity,
            recommendation: this.getSameNameRecommendation(files, similarity)
          });
        }
      }
    }

    console.log(`\n📊 检测结果:`);
    console.log(`  内容完全相同: ${identicalGroups} 组`);
    console.log(`  同名不同内容: ${sameNameGroups} 组`);
    console.log(`  总重复组数: ${this.duplicates.length} 组`);

    // 生成报告
    this.generateReport();
  }

  /**
   * 扫描前端文件
   */
  scanFrontendFiles() {
    const files = [];
    const frontendDir = path.join(this.projectRoot, 'frontend');
    
    const scan = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!['node_modules', 'dist', 'build', '.git'].includes(item)) {
            scan(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath);
          if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    scan(frontendDir);
    return files;
  }

  /**
   * 计算文件相似度
   */
  calculateSimilarity(content1, content2) {
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');
    
    let commonLines = 0;
    const maxLines = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < Math.min(lines1.length, lines2.length); i++) {
      if (lines1[i].trim() === lines2[i].trim()) {
        commonLines++;
      }
    }
    
    return maxLines > 0 ? (commonLines / maxLines) * 100 : 0;
  }

  /**
   * 获取完全相同文件的推荐操作
   */
  getIdenticalRecommendation(files) {
    // 按路径优先级排序
    const sorted = files.sort((a, b) => {
      // 优先保留更短路径
      const pathLengthA = a.file.split(path.sep).length;
      const pathLengthB = b.file.split(path.sep).length;
      if (pathLengthA !== pathLengthB) return pathLengthA - pathLengthB;
      
      // 优先保留非测试文件
      const isTestA = a.file.includes('test') || a.file.includes('__tests__');
      const isTestB = b.file.includes('test') || b.file.includes('__tests__');
      if (isTestA !== isTestB) return isTestA ? 1 : -1;
      
      // 优先保留index文件
      const isIndexA = path.basename(a.file).startsWith('index.');
      const isIndexB = path.basename(b.file).startsWith('index.');
      if (isIndexA !== isIndexB) return isIndexA ? -1 : 1;
      
      return 0;
    });
    
    return {
      action: 'delete_duplicates',
      keep: sorted[0].file,
      delete: sorted.slice(1).map(f => f.file),
      reason: '内容完全相同，保留路径最合理的文件'
    };
  }

  /**
   * 获取同名文件的推荐操作
   */
  getSameNameRecommendation(files, similarity) {
    if (similarity > 90) {
      // 高相似度，建议合并
      const sorted = files.sort((a, b) => b.size - a.size);
      return {
        action: 'merge',
        keep: sorted[0].file,
        merge_from: sorted.slice(1).map(f => f.file),
        reason: '高相似度文件，建议手动合并差异'
      };
    } else if (similarity < 30) {
      // 低相似度，可能是不同功能
      return {
        action: 'rename',
        reason: '低相似度同名文件，建议重命名以区分功能'
      };
    } else {
      // 中等相似度，需要手动检查
      return {
        action: 'manual_review',
        reason: '中等相似度文件，需要手动检查决定处理方式'
      };
    }
  }

  /**
   * 生成报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'simple-duplicate-report.md');
    
    let report = '# 精确重复文件检测报告\n\n';
    report += `**生成时间**: ${new Date().toISOString()}\n`;
    report += `**检测到重复组数**: ${this.duplicates.length}\n\n`;
    
    if (this.duplicates.length === 0) {
      report += '🎉 没有发现重复文件！\n';
    } else {
      report += '## 📊 重复文件详情\n\n';
      
      this.duplicates.forEach((duplicate, index) => {
        report += `### ${index + 1}. ${duplicate.type === 'identical' ? '内容完全相同' : '同名文件'}\n\n`;
        
        if (duplicate.similarity) {
          report += `**相似度**: ${duplicate.similarity.toFixed(1)}%\n`;
        }
        
        report += `**文件列表**:\n`;
        duplicate.files.forEach(file => {
          report += `- \`${path.relative(this.projectRoot, file.file)}\` (${file.size} 字节)\n`;
        });
        
        report += `\n**推荐操作**: ${duplicate.recommendation.action}\n`;
        report += `**原因**: ${duplicate.recommendation.reason}\n`;
        
        if (duplicate.recommendation.keep) {
          report += `**保留**: \`${path.relative(this.projectRoot, duplicate.recommendation.keep)}\`\n`;
        }
        if (duplicate.recommendation.delete) {
          report += `**删除**:\n`;
          duplicate.recommendation.delete.forEach(file => {
            report += `- \`${path.relative(this.projectRoot, file)}\`\n`;
          });
        }
        if (duplicate.recommendation.merge_from) {
          report += `**合并来源**:\n`;
          duplicate.recommendation.merge_from.forEach(file => {
            report += `- \`${path.relative(this.projectRoot, file)}\`\n`;
          });
        }
        
        report += '\n---\n\n';
      });
    }
    
    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 详细报告已保存到: ${reportPath}`);
  }
}

// 主函数
async function main() {
  const detector = new SimpleDuplicateDetector();
  
  try {
    await detector.detect();
  } catch (error) {
    console.error('❌ 检测过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行检测
if (require.main === module) {
  main().catch(console.error);
}

module.exports = SimpleDuplicateDetector;
