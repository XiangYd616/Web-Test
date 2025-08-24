#!/usr/bin/env node

/**
 * 项目结构优化工具
 * 分析和优化项目的目录结构，提供重构建议
 */

const fs = require('fs');
const path = require('path');

class ProjectStructureOptimizer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.frontendDir = path.join(this.projectRoot, 'frontend');
    this.backendDir = path.join(this.projectRoot, 'backend');
    this.analysis = {
      directories: new Map(),
      files: new Map(),
      issues: [],
      recommendations: []
    };
  }

  /**
   * 开始优化分析
   */
  async optimize() {
    console.log('🏗️ 开始项目结构优化分析...');
    console.log('=' .repeat(60));

    // 分析前端结构
    await this.analyzeFrontendStructure();
    
    // 分析后端结构
    await this.analyzeBackendStructure();
    
    // 检测结构问题
    this.detectStructureIssues();
    
    // 生成优化建议
    this.generateRecommendations();
    
    // 生成报告
    this.generateReport();

    console.log(`\n📊 分析完成:`);
    console.log(`  发现问题: ${this.analysis.issues.length} 个`);
    console.log(`  优化建议: ${this.analysis.recommendations.length} 个`);
  }

  /**
   * 分析前端结构
   */
  async analyzeFrontendStructure() {
    console.log('\n📱 分析前端结构...');
    
    if (!fs.existsSync(this.frontendDir)) {
      this.analysis.issues.push({
        type: 'missing_directory',
        path: 'frontend',
        message: '前端目录不存在'
      });
      return;
    }

    const structure = this.scanDirectory(this.frontendDir, 'frontend');
    this.analysis.directories.set('frontend', structure);
    
    // 检查标准前端目录结构
    const expectedDirs = [
      'components',
      'pages', 
      'services',
      'utils',
      'types',
      'hooks',
      'contexts'
    ];
    
    for (const dir of expectedDirs) {
      const dirPath = path.join(this.frontendDir, dir);
      if (!fs.existsSync(dirPath)) {
        this.analysis.issues.push({
          type: 'missing_standard_directory',
          path: `frontend/${dir}`,
          message: `缺少标准目录: ${dir}`
        });
      }
    }

    console.log(`  扫描到 ${structure.fileCount} 个文件，${structure.dirCount} 个目录`);
  }

  /**
   * 分析后端结构
   */
  async analyzeBackendStructure() {
    console.log('\n🔧 分析后端结构...');
    
    if (!fs.existsSync(this.backendDir)) {
      this.analysis.issues.push({
        type: 'missing_directory',
        path: 'backend',
        message: '后端目录不存在'
      });
      return;
    }

    const structure = this.scanDirectory(this.backendDir, 'backend');
    this.analysis.directories.set('backend', structure);
    
    // 检查标准后端目录结构
    const expectedDirs = [
      'routes',
      'controllers', 
      'services',
      'models',
      'middleware',
      'utils',
      'config'
    ];
    
    for (const dir of expectedDirs) {
      const dirPath = path.join(this.backendDir, dir);
      if (!fs.existsSync(dirPath)) {
        this.analysis.issues.push({
          type: 'missing_standard_directory',
          path: `backend/${dir}`,
          message: `缺少标准目录: ${dir}`
        });
      }
    }

    console.log(`  扫描到 ${structure.fileCount} 个文件，${structure.dirCount} 个目录`);
  }

  /**
   * 扫描目录结构
   */
  scanDirectory(dirPath, relativePath = '') {
    const structure = {
      path: relativePath,
      type: 'directory',
      children: [],
      fileCount: 0,
      dirCount: 0,
      depth: relativePath.split('/').length - 1
    };

    if (!fs.existsSync(dirPath)) {
      return structure;
    }

    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        // 跳过隐藏文件和特殊目录
        if (item.startsWith('.') || ['node_modules', 'dist', 'build'].includes(item)) {
          continue;
        }

        const fullPath = path.join(dirPath, item);
        const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          const childStructure = this.scanDirectory(fullPath, itemRelativePath);
          structure.children.push(childStructure);
          structure.dirCount += 1 + childStructure.dirCount;
          structure.fileCount += childStructure.fileCount;
        } else if (stat.isFile()) {
          structure.children.push({
            path: itemRelativePath,
            type: 'file',
            size: stat.size,
            ext: path.extname(item),
            name: path.basename(item, path.extname(item))
          });
          structure.fileCount += 1;
        }
      }
    } catch (error) {
      console.warn(`⚠️ 扫描目录失败: ${dirPath} - ${error.message}`);
    }

    return structure;
  }

  /**
   * 检测结构问题
   */
  detectStructureIssues() {
    console.log('\n🔍 检测结构问题...');

    // 检查目录深度
    this.checkDirectoryDepth();
    
    // 检查文件分布
    this.checkFileDistribution();
    
    // 检查命名一致性
    this.checkNamingConsistency();
    
    // 检查重复功能
    this.checkDuplicateFunctionality();
  }

  /**
   * 检查目录深度
   */
  checkDirectoryDepth() {
    const maxDepth = 5; // 最大推荐深度
    
    const checkDepth = (structure, currentDepth = 0) => {
      if (currentDepth > maxDepth) {
        this.analysis.issues.push({
          type: 'deep_directory',
          path: structure.path,
          depth: currentDepth,
          message: `目录层级过深 (${currentDepth}层): ${structure.path}`
        });
      }
      
      if (structure.children) {
        for (const child of structure.children) {
          if (child.type === 'directory') {
            checkDepth(child, currentDepth + 1);
          }
        }
      }
    };

    for (const [, structure] of this.analysis.directories) {
      checkDepth(structure);
    }
  }

  /**
   * 检查文件分布
   */
  checkFileDistribution() {
    const maxFilesPerDir = 20; // 每个目录最大文件数
    
    const checkDistribution = (structure) => {
      if (structure.type === 'directory') {
        const fileCount = structure.children.filter(child => child.type === 'file').length;
        
        if (fileCount > maxFilesPerDir) {
          this.analysis.issues.push({
            type: 'too_many_files',
            path: structure.path,
            fileCount,
            message: `目录文件过多 (${fileCount}个): ${structure.path}`
          });
        }
        
        // 递归检查子目录
        for (const child of structure.children) {
          if (child.type === 'directory') {
            checkDistribution(child);
          }
        }
      }
    };

    for (const [, structure] of this.analysis.directories) {
      checkDistribution(structure);
    }
  }

  /**
   * 检查命名一致性
   */
  checkNamingConsistency() {
    const patterns = {
      component: /^[A-Z][a-zA-Z0-9]*\.tsx?$/,
      page: /^[A-Z][a-zA-Z0-9]*\.tsx?$/,
      service: /^[a-z][a-zA-Z0-9]*Service\.ts$/,
      util: /^[a-z][a-zA-Z0-9]*\.ts$/,
      hook: /^use[A-Z][a-zA-Z0-9]*\.ts$/,
      type: /^[a-z][a-zA-Z0-9]*\.types\.ts$/
    };

    const checkNaming = (structure, expectedPattern, context) => {
      if (structure.type === 'directory') {
        for (const child of structure.children) {
          if (child.type === 'file' && expectedPattern) {
            if (!expectedPattern.test(path.basename(child.path))) {
              this.analysis.issues.push({
                type: 'naming_inconsistency',
                path: child.path,
                context,
                message: `文件命名不符合${context}规范: ${path.basename(child.path)}`
              });
            }
          } else if (child.type === 'directory') {
            const childContext = this.getContextFromPath(child.path);
            const childPattern = patterns[childContext];
            checkNaming(child, childPattern, childContext);
          }
        }
      }
    };

    for (const [, structure] of this.analysis.directories) {
      checkNaming(structure);
    }
  }

  /**
   * 从路径获取上下文
   */
  getContextFromPath(filePath) {
    if (filePath.includes('/components/')) return 'component';
    if (filePath.includes('/pages/')) return 'page';
    if (filePath.includes('/services/')) return 'service';
    if (filePath.includes('/utils/')) return 'util';
    if (filePath.includes('/hooks/')) return 'hook';
    if (filePath.includes('/types/')) return 'type';
    return null;
  }

  /**
   * 检查重复功能
   */
  checkDuplicateFunctionality() {
    // 检查是否有功能相似的目录
    const similarDirs = [
      ['components/ui', 'components/common'],
      ['utils', 'helpers'],
      ['services', 'api'],
      ['types', 'interfaces']
    ];

    for (const [dir1, dir2] of similarDirs) {
      const path1 = path.join(this.frontendDir, dir1);
      const path2 = path.join(this.frontendDir, dir2);
      
      if (fs.existsSync(path1) && fs.existsSync(path2)) {
        this.analysis.issues.push({
          type: 'duplicate_functionality',
          paths: [dir1, dir2],
          message: `可能存在功能重复的目录: ${dir1} 和 ${dir2}`
        });
      }
    }
  }

  /**
   * 生成优化建议
   */
  generateRecommendations() {
    console.log('\n💡 生成优化建议...');

    // 基于问题生成建议
    for (const issue of this.analysis.issues) {
      switch (issue.type) {
        case 'deep_directory':
          this.analysis.recommendations.push({
            type: 'restructure',
            priority: 'medium',
            title: '重构深层目录结构',
            description: `将 ${issue.path} 的深层结构扁平化`,
            action: `考虑将深层目录重新组织为更扁平的结构`
          });
          break;
          
        case 'too_many_files':
          this.analysis.recommendations.push({
            type: 'organize',
            priority: 'high',
            title: '组织目录文件',
            description: `${issue.path} 目录包含 ${issue.fileCount} 个文件`,
            action: '考虑创建子目录来分组相关文件'
          });
          break;
          
        case 'naming_inconsistency':
          this.analysis.recommendations.push({
            type: 'rename',
            priority: 'low',
            title: '统一命名规范',
            description: `${issue.path} 命名不规范`,
            action: `重命名文件以符合${issue.context}命名规范`
          });
          break;
          
        case 'duplicate_functionality':
          this.analysis.recommendations.push({
            type: 'merge',
            priority: 'high',
            title: '合并重复功能',
            description: `${issue.paths.join(' 和 ')} 可能有功能重复`,
            action: '考虑合并这些目录或明确区分它们的职责'
          });
          break;
      }
    }

    // 添加通用优化建议
    this.addGeneralRecommendations();
  }

  /**
   * 添加通用优化建议
   */
  addGeneralRecommendations() {
    this.analysis.recommendations.push(
      {
        type: 'structure',
        priority: 'medium',
        title: '建立标准目录结构',
        description: '确保项目遵循标准的目录结构',
        action: '创建缺失的标准目录，如 components、services、utils 等'
      },
      {
        type: 'documentation',
        priority: 'low',
        title: '添加目录说明文档',
        description: '为主要目录添加 README.md 文件',
        action: '在每个主要目录下创建 README.md 说明该目录的用途'
      },
      {
        type: 'index',
        priority: 'medium',
        title: '添加索引文件',
        description: '为组件和服务目录添加 index.ts 文件',
        action: '创建 index.ts 文件来统一导出，简化导入路径'
      }
    );
  }

  /**
   * 生成报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'project-structure-analysis.md');
    
    let report = '# 项目结构优化分析报告\n\n';
    report += `**生成时间**: ${new Date().toISOString()}\n`;
    report += `**发现问题**: ${this.analysis.issues.length} 个\n`;
    report += `**优化建议**: ${this.analysis.recommendations.length} 个\n\n`;

    // 项目概览
    report += '## 📊 项目概览\n\n';
    for (const [name, structure] of this.analysis.directories) {
      report += `### ${name}\n`;
      report += `- 文件数: ${structure.fileCount}\n`;
      report += `- 目录数: ${structure.dirCount}\n`;
      report += `- 最大深度: ${this.getMaxDepth(structure)}\n\n`;
    }

    // 问题列表
    if (this.analysis.issues.length > 0) {
      report += '## 🚨 发现的问题\n\n';
      
      const groupedIssues = this.groupIssuesByType(this.analysis.issues);
      
      for (const [type, issues] of Object.entries(groupedIssues)) {
        report += `### ${this.getIssueTypeTitle(type)} (${issues.length}个)\n\n`;
        
        issues.forEach((issue, index) => {
          report += `${index + 1}. **${issue.path || issue.paths?.join(' 和 ')}**\n`;
          report += `   ${issue.message}\n\n`;
        });
      }
    }

    // 优化建议
    if (this.analysis.recommendations.length > 0) {
      report += '## 💡 优化建议\n\n';
      
      const priorityOrder = ['high', 'medium', 'low'];
      const groupedRecs = {};
      
      for (const priority of priorityOrder) {
        groupedRecs[priority] = this.analysis.recommendations.filter(r => r.priority === priority);
      }
      
      for (const [priority, recs] of Object.entries(groupedRecs)) {
        if (recs.length > 0) {
          const priorityIcon = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
          report += `### ${priorityIcon} ${priority.toUpperCase()}优先级 (${recs.length}个)\n\n`;
          
          recs.forEach((rec, index) => {
            report += `${index + 1}. **${rec.title}**\n`;
            report += `   ${rec.description}\n`;
            report += `   **建议**: ${rec.action}\n\n`;
          });
        }
      }
    }

    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 分析报告已保存到: ${reportPath}`);
  }

  /**
   * 获取最大深度
   */
  getMaxDepth(structure, currentDepth = 0) {
    let maxDepth = currentDepth;
    
    if (structure.children) {
      for (const child of structure.children) {
        if (child.type === 'directory') {
          maxDepth = Math.max(maxDepth, this.getMaxDepth(child, currentDepth + 1));
        }
      }
    }
    
    return maxDepth;
  }

  /**
   * 按类型分组问题
   */
  groupIssuesByType(issues) {
    const grouped = {};
    
    for (const issue of issues) {
      if (!grouped[issue.type]) {
        grouped[issue.type] = [];
      }
      grouped[issue.type].push(issue);
    }
    
    return grouped;
  }

  /**
   * 获取问题类型标题
   */
  getIssueTypeTitle(type) {
    const titles = {
      'deep_directory': '📁 目录层级过深',
      'too_many_files': '📄 文件过多',
      'naming_inconsistency': '🏷️ 命名不一致',
      'duplicate_functionality': '🔄 功能重复',
      'missing_standard_directory': '📂 缺少标准目录'
    };
    
    return titles[type] || type;
  }
}

// 主函数
async function main() {
  const optimizer = new ProjectStructureOptimizer();
  
  try {
    await optimizer.optimize();
  } catch (error) {
    console.error('❌ 优化分析过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行优化分析
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ProjectStructureOptimizer;
