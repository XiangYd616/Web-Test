/**
 * 组件版本分析器
 * 全面分析项目中的组件版本情况并制定重构策略
 */

const fs = require('fs');
const path = require('path');

class ComponentVersionAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.versionPrefixes = ['Enhanced', 'Unified', 'Advanced', 'Optimized', 'Improved', 'Extended', 'Super'];
    this.componentGroups = new Map();
    this.analysisResults = {
      totalFiles: 0,
      versionedFiles: 0,
      componentGroups: [],
      recommendations: [],
      riskAssessment: {}
    };
  }

  /**
   * 执行完整分析
   */
  async executeAnalysis() {
    console.log('🔍 开始组件版本全面分析...\n');

    try {
      // 1. 扫描所有文件
      await this.scanAllFiles();
      
      // 2. 分组分析组件
      this.groupComponents();
      
      // 3. 分析功能差异
      await this.analyzeFunctionalDifferences();
      
      // 4. 制定重构策略
      this.createRefactoringStrategy();
      
      // 5. 生成分析报告
      this.generateAnalysisReport();
      
      console.log('✅ 组件版本分析完成！');
      
    } catch (error) {
      console.error('❌ 分析过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 扫描所有项目文件
   */
  async scanAllFiles() {
    console.log('📁 扫描项目文件...');
    
    const allFiles = this.getAllProjectFiles();
    this.analysisResults.totalFiles = allFiles.length;
    
    const versionedFiles = allFiles.filter(file => {
      const fileName = path.basename(file, path.extname(file));
      return this.versionPrefixes.some(prefix => fileName.includes(prefix));
    });
    
    this.analysisResults.versionedFiles = versionedFiles.length;
    
    console.log(`   📊 总文件数: ${allFiles.length}`);
    console.log(`   📊 版本化文件数: ${versionedFiles.length}`);
    
    return versionedFiles;
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
   * 分组组件
   */
  groupComponents() {
    console.log('\n🔗 分组相关组件...');
    
    const allFiles = this.getAllProjectFiles();
    const componentMap = new Map();
    
    // 分析每个文件，提取基础名称
    allFiles.forEach(file => {
      const fileName = path.basename(file, path.extname(file));
      const dir = path.dirname(file);
      
      // 移除版本前缀，获取基础名称
      let baseName = fileName;
      this.versionPrefixes.forEach(prefix => {
        if (fileName.startsWith(prefix)) {
          baseName = fileName.substring(prefix.length);
        }
      });
      
      // 创建组件组标识
      const groupKey = `${dir}/${baseName}`;
      
      if (!componentMap.has(groupKey)) {
        componentMap.set(groupKey, []);
      }
      
      componentMap.get(groupKey).push({
        file,
        fileName,
        baseName,
        directory: dir,
        hasVersionPrefix: fileName !== baseName,
        versionPrefix: fileName !== baseName ? fileName.substring(0, fileName.length - baseName.length) : null
      });
    });
    
    // 筛选出有多个版本的组件组
    componentMap.forEach((files, groupKey) => {
      if (files.length > 1 || files.some(f => f.hasVersionPrefix)) {
        this.componentGroups.set(groupKey, {
          baseName: files[0].baseName,
          directory: files[0].directory,
          files: files,
          hasMultipleVersions: files.length > 1,
          hasVersionedFiles: files.some(f => f.hasVersionPrefix)
        });
      }
    });
    
    console.log(`   📊 发现组件组: ${this.componentGroups.size}`);
  }

  /**
   * 分析功能差异
   */
  async analyzeFunctionalDifferences() {
    console.log('\n🔍 分析功能差异...');
    
    for (const [groupKey, group] of this.componentGroups) {
      console.log(`\n📦 分析组件组: ${group.baseName}`);
      
      const analysis = {
        groupKey,
        baseName: group.baseName,
        directory: group.directory,
        files: [],
        recommendation: null,
        riskLevel: 'low'
      };
      
      // 分析每个文件
      for (const file of group.files) {
        const filePath = path.join(this.projectRoot, file.file);
        const fileAnalysis = await this.analyzeFile(filePath, file);
        analysis.files.push(fileAnalysis);
      }
      
      // 制定推荐策略
      analysis.recommendation = this.createRecommendationForGroup(analysis);
      
      this.analysisResults.componentGroups.push(analysis);
    }
  }

  /**
   * 分析单个文件
   */
  async analyzeFile(filePath, fileInfo) {
    const analysis = {
      ...fileInfo,
      exists: fs.existsSync(filePath),
      size: 0,
      lines: 0,
      exports: [],
      imports: [],
      complexity: 0,
      lastModified: null
    };
    
    if (!analysis.exists) {
      return analysis;
    }
    
    try {
      const stats = fs.statSync(filePath);
      analysis.size = stats.size;
      analysis.lastModified = stats.mtime;
      
      const content = fs.readFileSync(filePath, 'utf8');
      analysis.lines = content.split('\n').length;
      
      // 分析导出
      const exportMatches = content.match(/export\s+(default\s+)?(class|function|const|let|var|interface|type)\s+(\w+)/g);
      if (exportMatches) {
        analysis.exports = exportMatches.map(match => {
          const parts = match.split(/\s+/);
          return parts[parts.length - 1];
        });
      }
      
      // 分析导入
      const importMatches = content.match(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
      if (importMatches) {
        analysis.imports = importMatches.map(match => {
          const fromMatch = match.match(/from\s+['"]([^'"]+)['"]/);
          return fromMatch ? fromMatch[1] : '';
        });
      }
      
      // 简单复杂度分析（基于代码行数和函数数量）
      const functionMatches = content.match(/(function|=>|\bclass\b)/g);
      analysis.complexity = (functionMatches ? functionMatches.length : 0) + Math.floor(analysis.lines / 50);
      
    } catch (error) {
      console.warn(`   ⚠️  无法分析文件: ${filePath}`);
    }
    
    return analysis;
  }

  /**
   * 为组件组创建推荐策略
   */
  createRecommendationForGroup(analysis) {
    const files = analysis.files.filter(f => f.exists);
    
    if (files.length === 0) {
      return {
        action: 'no_action',
        reason: '没有存在的文件',
        keepFile: null,
        removeFiles: [],
        riskLevel: 'none'
      };
    }
    
    if (files.length === 1) {
      const file = files[0];
      if (file.hasVersionPrefix) {
        return {
          action: 'rename',
          reason: '移除不必要的版本前缀',
          keepFile: file.file,
          newName: `${analysis.directory}/${file.baseName}${path.extname(file.file)}`,
          removeFiles: [],
          riskLevel: 'low'
        };
      } else {
        return {
          action: 'no_action',
          reason: '单一文件，无需处理',
          keepFile: file.file,
          removeFiles: [],
          riskLevel: 'none'
        };
      }
    }
    
    // 多文件情况：选择最佳版本
    const scoredFiles = files.map(file => ({
      ...file,
      score: this.calculateFileScore(file)
    }));
    
    scoredFiles.sort((a, b) => b.score - a.score);
    const bestFile = scoredFiles[0];
    const filesToRemove = scoredFiles.slice(1);
    
    return {
      action: 'consolidate',
      reason: `保留功能最完整的版本: ${bestFile.fileName}`,
      keepFile: bestFile.file,
      newName: bestFile.hasVersionPrefix ? 
        `${analysis.directory}/${bestFile.baseName}${path.extname(bestFile.file)}` : 
        bestFile.file,
      removeFiles: filesToRemove.map(f => f.file),
      riskLevel: this.assessRiskLevel(analysis),
      mergeRequired: filesToRemove.some(f => f.complexity > 10)
    };
  }

  /**
   * 计算文件评分
   */
  calculateFileScore(file) {
    let score = 0;
    
    // 基于文件大小和复杂度
    score += Math.min(file.lines / 10, 50); // 最多50分
    score += Math.min(file.complexity, 30); // 最多30分
    score += file.exports.length * 5; // 每个导出5分
    
    // 版本前缀权重
    const versionWeights = {
      'Unified': 20,
      'Enhanced': 15,
      'Advanced': 10,
      'Optimized': 8,
      'Improved': 5,
      'Extended': 3
    };
    
    if (file.versionPrefix && versionWeights[file.versionPrefix]) {
      score += versionWeights[file.versionPrefix];
    }
    
    // 最近修改时间权重
    if (file.lastModified) {
      const daysSinceModified = (Date.now() - file.lastModified.getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 10 - daysSinceModified / 30); // 最近修改的文件得分更高
    }
    
    return score;
  }

  /**
   * 评估风险级别
   */
  assessRiskLevel(analysis) {
    const files = analysis.files.filter(f => f.exists);
    
    // 高风险：多个复杂文件
    if (files.length > 2 && files.some(f => f.complexity > 20)) {
      return 'high';
    }
    
    // 中风险：有导入依赖的文件
    if (files.some(f => f.imports.length > 5)) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * 创建重构策略
   */
  createRefactoringStrategy() {
    console.log('\n📋 制定重构策略...');
    
    const strategy = {
      phase1: { // 低风险操作
        actions: [],
        estimatedTime: '1-2小时'
      },
      phase2: { // 中风险操作
        actions: [],
        estimatedTime: '2-4小时'
      },
      phase3: { // 高风险操作
        actions: [],
        estimatedTime: '4-8小时'
      }
    };
    
    this.analysisResults.componentGroups.forEach(group => {
      if (group.recommendation && group.recommendation.action !== 'no_action') {
        const phase = group.recommendation.riskLevel === 'high' ? 'phase3' :
                     group.recommendation.riskLevel === 'medium' ? 'phase2' : 'phase1';
        
        strategy[phase].actions.push({
          group: group.baseName,
          action: group.recommendation.action,
          files: group.files.map(f => f.file),
          recommendation: group.recommendation
        });
      }
    });
    
    this.analysisResults.refactoringStrategy = strategy;
    
    console.log(`   📊 第一阶段操作: ${strategy.phase1.actions.length}`);
    console.log(`   📊 第二阶段操作: ${strategy.phase2.actions.length}`);
    console.log(`   📊 第三阶段操作: ${strategy.phase3.actions.length}`);
  }

  /**
   * 生成分析报告
   */
  generateAnalysisReport() {
    console.log('\n📊 生成分析报告...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: this.analysisResults.totalFiles,
        versionedFiles: this.analysisResults.versionedFiles,
        componentGroups: this.analysisResults.componentGroups.length,
        refactoringActions: this.analysisResults.componentGroups.filter(g => 
          g.recommendation && g.recommendation.action !== 'no_action'
        ).length
      },
      analysis: this.analysisResults,
      recommendations: this.generateDetailedRecommendations()
    };
    
    // 保存报告
    const reportPath = path.join(this.projectRoot, 'component-version-analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // 生成Markdown报告
    this.generateMarkdownReport(report);
    
    console.log(`   📄 JSON报告: component-version-analysis.json`);
    console.log(`   📄 Markdown报告: docs/reports/COMPONENT_VERSION_REFACTORING_PLAN.md`);
  }

  /**
   * 生成详细推荐
   */
  generateDetailedRecommendations() {
    const recommendations = [];
    
    this.analysisResults.componentGroups.forEach(group => {
      if (group.recommendation && group.recommendation.action !== 'no_action') {
        recommendations.push({
          priority: group.recommendation.riskLevel === 'low' ? 'high' : 
                   group.recommendation.riskLevel === 'medium' ? 'medium' : 'low',
          component: group.baseName,
          action: group.recommendation.action,
          description: group.recommendation.reason,
          files: {
            keep: group.recommendation.keepFile,
            remove: group.recommendation.removeFiles,
            rename: group.recommendation.newName
          },
          estimatedEffort: this.estimateEffort(group.recommendation),
          prerequisites: this.getPrerequisites(group.recommendation)
        });
      }
    });
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 估算工作量
   */
  estimateEffort(recommendation) {
    switch (recommendation.riskLevel) {
      case 'low': return '15-30分钟';
      case 'medium': return '30-60分钟';
      case 'high': return '1-2小时';
      default: return '5-15分钟';
    }
  }

  /**
   * 获取前置条件
   */
  getPrerequisites(recommendation) {
    const prerequisites = ['创建备份'];
    
    if (recommendation.mergeRequired) {
      prerequisites.push('分析功能差异', '合并重要功能');
    }
    
    if (recommendation.riskLevel === 'high') {
      prerequisites.push('详细测试计划', '团队评审');
    }
    
    return prerequisites;
  }

  /**
   * 生成Markdown报告
   */
  generateMarkdownReport(report) {
    const markdownContent = this.createMarkdownContent(report);
    
    const reportsDir = path.join(this.projectRoot, 'docs', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const markdownPath = path.join(reportsDir, 'COMPONENT_VERSION_REFACTORING_PLAN.md');
    fs.writeFileSync(markdownPath, markdownContent);
  }

  /**
   * 创建Markdown内容
   */
  createMarkdownContent(report) {
    return `# 🔄 组件版本重构计划

## 📋 分析概述

**分析时间**: ${new Date(report.timestamp).toLocaleString()}  
**总文件数**: ${report.summary.totalFiles}  
**版本化文件数**: ${report.summary.versionedFiles}  
**组件组数**: ${report.summary.componentGroups}  
**重构操作数**: ${report.summary.refactoringActions}

## 🎯 重构推荐

${report.recommendations.map((rec, index) => `
### ${index + 1}. ${rec.component} (${rec.priority}优先级)

**操作**: ${rec.action}  
**描述**: ${rec.description}  
**预估工作量**: ${rec.estimatedEffort}

**文件操作**:
- 保留: \`${rec.files.keep}\`
${rec.files.rename ? `- 重命名为: \`${rec.files.rename}\`` : ''}
${rec.files.remove.length > 0 ? `- 删除: ${rec.files.remove.map(f => `\`${f}\``).join(', ')}` : ''}

**前置条件**:
${rec.prerequisites.map(p => `- ${p}`).join('\n')}
`).join('\n')}

## 📊 详细分析

${report.analysis.componentGroups.map(group => `
### ${group.baseName}

**目录**: ${group.directory}  
**文件数**: ${group.files.length}

${group.files.map(file => `
- **${file.fileName}**
  - 大小: ${file.size} bytes
  - 行数: ${file.lines}
  - 复杂度: ${file.complexity}
  - 导出: ${file.exports.length}个
  - 最后修改: ${file.lastModified ? new Date(file.lastModified).toLocaleString() : 'N/A'}
`).join('')}

**推荐操作**: ${group.recommendation ? group.recommendation.action : 'no_action'}  
**风险级别**: ${group.recommendation ? group.recommendation.riskLevel : 'none'}
`).join('\n')}

---
*报告生成时间: ${new Date().toLocaleString()}*
`;
  }
}

// 执行分析
if (require.main === module) {
  const analyzer = new ComponentVersionAnalyzer();
  analyzer.executeAnalysis().catch(console.error);
}

module.exports = ComponentVersionAnalyzer;
