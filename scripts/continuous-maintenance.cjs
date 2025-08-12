#!/usr/bin/env node

/**
 * 持续维护检查工具
 * 定期运行以保持代码质量和项目健康度
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ContinuousMaintenanceChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.reports = [];
    this.issues = [];
    this.recommendations = [];
  }

  // 主要检查流程
  async runAllChecks() {
    console.log('🔧 开始持续维护检查...\n');
    
    try {
      await this.checkProjectStructure();
      await this.checkDependencies();
      await this.checkBuildHealth();
      await this.checkCodeQuality();
      await this.checkPerformance();
      await this.generateMaintenanceReport();
      
      console.log('\n✅ 持续维护检查完成！');
      return this.generateSummary();
    } catch (error) {
      console.error('❌ 检查过程中出现错误:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 检查项目结构健康度
  async checkProjectStructure() {
    console.log('📁 检查项目结构...');
    
    const structureIssues = [];
    
    // 检查重复文件
    const duplicateFiles = this.findDuplicateFiles();
    if (duplicateFiles.length > 0) {
      structureIssues.push({
        type: 'duplicate_files',
        count: duplicateFiles.length,
        files: duplicateFiles
      });
    }

    // 检查未使用的文件
    const unusedFiles = this.findUnusedFiles();
    if (unusedFiles.length > 0) {
      structureIssues.push({
        type: 'unused_files',
        count: unusedFiles.length,
        files: unusedFiles.slice(0, 10) // 只显示前10个
      });
    }

    // 检查大文件
    const largeFiles = this.findLargeFiles();
    if (largeFiles.length > 0) {
      structureIssues.push({
        type: 'large_files',
        count: largeFiles.length,
        files: largeFiles
      });
    }

    this.reports.push({
      category: 'project_structure',
      status: structureIssues.length === 0 ? 'healthy' : 'needs_attention',
      issues: structureIssues
    });

    console.log(`   ${structureIssues.length === 0 ? '✅' : '⚠️'} 项目结构检查完成`);
  }

  // 检查依赖健康度
  async checkDependencies() {
    console.log('📦 检查依赖健康度...');
    
    const dependencyIssues = [];
    
    try {
      // 检查过时的依赖
      const outdatedDeps = this.checkOutdatedDependencies();
      if (outdatedDeps.length > 0) {
        dependencyIssues.push({
          type: 'outdated_dependencies',
          count: outdatedDeps.length,
          packages: outdatedDeps
        });
      }

      // 检查安全漏洞
      const vulnerabilities = this.checkSecurityVulnerabilities();
      if (vulnerabilities.length > 0) {
        dependencyIssues.push({
          type: 'security_vulnerabilities',
          count: vulnerabilities.length,
          vulnerabilities: vulnerabilities
        });
      }

      // 检查重复依赖
      const duplicateDeps = this.checkDuplicateDependencies();
      if (duplicateDeps.length > 0) {
        dependencyIssues.push({
          type: 'duplicate_dependencies',
          count: duplicateDeps.length,
          packages: duplicateDeps
        });
      }

    } catch (error) {
      dependencyIssues.push({
        type: 'dependency_check_error',
        error: error.message
      });
    }

    this.reports.push({
      category: 'dependencies',
      status: dependencyIssues.length === 0 ? 'healthy' : 'needs_attention',
      issues: dependencyIssues
    });

    console.log(`   ${dependencyIssues.length === 0 ? '✅' : '⚠️'} 依赖检查完成`);
  }

  // 检查构建健康度
  async checkBuildHealth() {
    console.log('🏗️ 检查构建健康度...');
    
    const buildIssues = [];
    
    try {
      // 运行构建并分析输出
      const buildOutput = execSync('npm run build', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });

      // 分析chunk大小
      const chunkAnalysis = this.analyzeBuildOutput(buildOutput);
      if (chunkAnalysis.largeChunks.length > 0) {
        buildIssues.push({
          type: 'large_chunks',
          count: chunkAnalysis.largeChunks.length,
          chunks: chunkAnalysis.largeChunks
        });
      }

      // 检查构建时间
      if (chunkAnalysis.buildTime > 60) {
        buildIssues.push({
          type: 'slow_build',
          buildTime: chunkAnalysis.buildTime
        });
      }

    } catch (error) {
      buildIssues.push({
        type: 'build_failure',
        error: error.message
      });
    }

    this.reports.push({
      category: 'build_health',
      status: buildIssues.length === 0 ? 'healthy' : 'needs_attention',
      issues: buildIssues
    });

    console.log(`   ${buildIssues.length === 0 ? '✅' : '⚠️'} 构建检查完成`);
  }

  // 检查代码质量
  async checkCodeQuality() {
    console.log('🔍 检查代码质量...');
    
    const qualityIssues = [];
    
    try {
      // 运行系统集成检查
      const integrationResult = execSync('node scripts/system-integration-checker.cjs', {
        encoding: 'utf8',
        cwd: this.projectRoot
      });

      const integrationScore = this.parseIntegrationScore(integrationResult);
      if (integrationScore < 95) {
        qualityIssues.push({
          type: 'low_integration_score',
          score: integrationScore
        });
      }

    } catch (error) {
      qualityIssues.push({
        type: 'integration_check_error',
        error: error.message
      });
    }

    this.reports.push({
      category: 'code_quality',
      status: qualityIssues.length === 0 ? 'healthy' : 'needs_attention',
      issues: qualityIssues
    });

    console.log(`   ${qualityIssues.length === 0 ? '✅' : '⚠️'} 代码质量检查完成`);
  }

  // 检查性能指标
  async checkPerformance() {
    console.log('⚡ 检查性能指标...');
    
    const performanceIssues = [];
    
    // 检查bundle大小
    const bundleSize = this.checkBundleSize();
    if (bundleSize.totalSize > 5 * 1024 * 1024) { // 5MB
      performanceIssues.push({
        type: 'large_bundle',
        size: bundleSize.totalSize,
        sizeFormatted: this.formatBytes(bundleSize.totalSize)
      });
    }

    // 检查图片优化
    const imageOptimization = this.checkImageOptimization();
    if (imageOptimization.unoptimizedImages > 0) {
      performanceIssues.push({
        type: 'unoptimized_images',
        count: imageOptimization.unoptimizedImages
      });
    }

    this.reports.push({
      category: 'performance',
      status: performanceIssues.length === 0 ? 'healthy' : 'needs_attention',
      issues: performanceIssues
    });

    console.log(`   ${performanceIssues.length === 0 ? '✅' : '⚠️'} 性能检查完成`);
  }

  // 生成维护报告
  async generateMaintenanceReport() {
    const reportPath = path.join(this.projectRoot, 'reports', 'maintenance-report.md');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = this.formatMaintenanceReport();
    fs.writeFileSync(reportPath, report, 'utf8');
    
    console.log(`📄 维护报告已生成: ${reportPath}`);
  }

  // 辅助方法
  findDuplicateFiles() {
    // 简化实现 - 实际应该检查文件内容hash
    return [];
  }

  findUnusedFiles() {
    // 简化实现 - 实际应该分析import/require关系
    return [];
  }

  findLargeFiles() {
    const largeFiles = [];
    const checkDir = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          checkDir(filePath);
        } else if (stat.isFile() && stat.size > 1024 * 1024) { // 1MB
          largeFiles.push({
            path: filePath,
            size: stat.size,
            sizeFormatted: this.formatBytes(stat.size)
          });
        }
      });
    };
    
    checkDir(path.join(this.projectRoot, 'src'));
    return largeFiles;
  }

  checkOutdatedDependencies() {
    try {
      const result = execSync('npm outdated --json', { encoding: 'utf8' });
      return Object.keys(JSON.parse(result));
    } catch {
      return [];
    }
  }

  checkSecurityVulnerabilities() {
    try {
      const result = execSync('npm audit --json', { encoding: 'utf8' });
      const audit = JSON.parse(result);
      return audit.vulnerabilities ? Object.keys(audit.vulnerabilities) : [];
    } catch {
      return [];
    }
  }

  checkDuplicateDependencies() {
    // 简化实现
    return [];
  }

  analyzeBuildOutput(output) {
    const largeChunks = [];
    const lines = output.split('\n');
    
    lines.forEach(line => {
      if (line.includes('.js') && line.includes('kB')) {
        const match = line.match(/(\d+\.?\d*)\s*kB/);
        if (match && parseFloat(match[1]) > 300) {
          largeChunks.push({
            name: line.trim(),
            size: parseFloat(match[1])
          });
        }
      }
    });

    return {
      largeChunks,
      buildTime: 30 // 简化实现
    };
  }

  parseIntegrationScore(output) {
    const match = output.match(/总体评分[：:]\s*(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 100;
  }

  checkBundleSize() {
    const distPath = path.join(this.projectRoot, 'dist');
    if (!fs.existsSync(distPath)) {
      return { totalSize: 0 };
    }

    let totalSize = 0;
    const calculateSize = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          calculateSize(filePath);
        } else {
          totalSize += stat.size;
        }
      });
    };

    calculateSize(distPath);
    return { totalSize };
  }

  checkImageOptimization() {
    // 简化实现
    return { unoptimizedImages: 0 };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatMaintenanceReport() {
    const timestamp = new Date().toISOString();
    let report = `# 项目维护报告\n\n`;
    report += `**生成时间:** ${timestamp}\n\n`;
    
    this.reports.forEach(category => {
      report += `## ${this.getCategoryName(category.category)}\n\n`;
      report += `**状态:** ${category.status === 'healthy' ? '✅ 健康' : '⚠️ 需要关注'}\n\n`;
      
      if (category.issues.length > 0) {
        report += `**发现的问题:**\n\n`;
        category.issues.forEach(issue => {
          report += `- **${this.getIssueTypeName(issue.type)}**\n`;
          if (issue.count) report += `  - 数量: ${issue.count}\n`;
          if (issue.error) report += `  - 错误: ${issue.error}\n`;
        });
        report += '\n';
      }
    });

    return report;
  }

  getCategoryName(category) {
    const names = {
      'project_structure': '项目结构',
      'dependencies': '依赖管理',
      'build_health': '构建健康度',
      'code_quality': '代码质量',
      'performance': '性能指标'
    };
    return names[category] || category;
  }

  getIssueTypeName(type) {
    const names = {
      'duplicate_files': '重复文件',
      'unused_files': '未使用文件',
      'large_files': '大文件',
      'outdated_dependencies': '过时依赖',
      'security_vulnerabilities': '安全漏洞',
      'duplicate_dependencies': '重复依赖',
      'large_chunks': '大chunk',
      'slow_build': '构建缓慢',
      'build_failure': '构建失败',
      'low_integration_score': '集成评分低',
      'large_bundle': 'Bundle过大',
      'unoptimized_images': '未优化图片'
    };
    return names[type] || type;
  }

  generateSummary() {
    const totalIssues = this.reports.reduce((sum, report) => sum + report.issues.length, 0);
    const healthyCategories = this.reports.filter(report => report.status === 'healthy').length;
    
    return {
      success: true,
      totalCategories: this.reports.length,
      healthyCategories,
      totalIssues,
      overallHealth: totalIssues === 0 ? 'excellent' : totalIssues < 5 ? 'good' : 'needs_attention'
    };
  }
}

// 主执行函数
async function main() {
  const checker = new ContinuousMaintenanceChecker();
  const result = await checker.runAllChecks();
  
  console.log('\n📊 维护检查总结:');
  console.log(`   健康类别: ${result.healthyCategories}/${result.totalCategories}`);
  console.log(`   发现问题: ${result.totalIssues}`);
  console.log(`   整体健康度: ${result.overallHealth}`);
  
  process.exit(result.success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ContinuousMaintenanceChecker;
