#!/usr/bin/env node

/**
 * 修复进度跟踪器
 * 实时监控修复进度和质量指标
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProgressTracker {
  constructor() {
    this.metrics = {
      totalErrors: 14044,
      currentErrors: 0,
      fixedFiles: 0,
      totalFiles: 452,
      testCoverage: 0,
      buildTime: 0,
      phases: {
        phase1: { status: 'not_started', progress: 0 },
        phase2: { status: 'not_started', progress: 0 },
        phase3: { status: 'not_started', progress: 0 },
        phase4: { status: 'not_started', progress: 0 },
        phase5: { status: 'not_started', progress: 0 },
        phase6: { status: 'not_started', progress: 0 }
      }
    };
  }

  async updateMetrics() {
    console.log('📊 更新项目指标...\n');
    
    // 获取当前TypeScript错误数
    await this.getCurrentErrors();
    
    // 获取修复的文件数
    await this.getFixedFiles();
    
    // 获取构建时间
    await this.getBuildTime();
    
    // 更新阶段进度
    await this.updatePhaseProgress();
    
    this.displayDashboard();
    this.saveMetrics();
  }

  async getCurrentErrors() {
    try {
      const result = execSync('npx tsc --noEmit --maxNodeModuleJsDepth 0', {
        cwd: path.join(process.cwd(), 'frontend'),
        encoding: 'utf8',
        stdio: 'pipe'
      });
      this.metrics.currentErrors = 0;
    } catch (error) {
      const output = error.stdout || error.stderr || '';
      const errorCount = (output.match(/error TS/g) || []).length;
      this.metrics.currentErrors = errorCount;
    }
  }

  async getFixedFiles() {
    // 统计没有错误的文件数
    this.metrics.fixedFiles = this.metrics.totalFiles - this.getFilesWithErrors();
  }

  getFilesWithErrors() {
    try {
      const result = execSync('npx tsc --noEmit --maxNodeModuleJsDepth 0', {
        cwd: path.join(process.cwd(), 'frontend'),
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return 0;
    } catch (error) {
      const output = error.stdout || error.stderr || '';
      const lines = output.split('\n');
      const fileSet = new Set();
      
      lines.forEach(line => {
        const match = line.match(/^(.+?)\(\d+,\d+\): error/);
        if (match) {
          fileSet.add(match[1]);
        }
      });
      
      return fileSet.size;
    }
  }

  async getBuildTime() {
    const startTime = Date.now();
    try {
      execSync('npm run build', {
        cwd: path.join(process.cwd(), 'frontend'),
        stdio: 'pipe'
      });
      this.metrics.buildTime = (Date.now() - startTime) / 1000;
    } catch (error) {
      this.metrics.buildTime = -1; // 构建失败
    }
  }

  async updatePhaseProgress() {
    // 检查各阶段的完成情况
    const reports = [
      'reports/phase1-repair-report.json',
      'reports/phase2-repair-report.json',
      'reports/phase3-repair-report.json',
      'reports/phase4-repair-report.json',
      'reports/phase5-repair-report.json',
      'reports/phase6-repair-report.json'
    ];

    reports.forEach((reportPath, index) => {
      const phaseKey = `phase${index + 1}`;
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        this.metrics.phases[phaseKey].status = 'completed';
        this.metrics.phases[phaseKey].progress = 100;
      }
    });

    // 基于错误数估算当前进度
    const errorReduction = (this.metrics.totalErrors - this.metrics.currentErrors) / this.metrics.totalErrors;
    const overallProgress = Math.round(errorReduction * 100);

    if (overallProgress > 0 && this.metrics.phases.phase1.status === 'not_started') {
      this.metrics.phases.phase1.status = 'in_progress';
      this.metrics.phases.phase1.progress = Math.min(overallProgress * 2, 100);
    }
  }

  displayDashboard() {
    console.clear();
    console.log('🎯 Test-Web项目修复进度仪表板');
    console.log('='.repeat(60));
    
    // 总体进度
    const overallProgress = Math.round(
      ((this.metrics.totalErrors - this.metrics.currentErrors) / this.metrics.totalErrors) * 100
    );
    
    console.log(`\n📊 总体进度: ${overallProgress}%`);
    console.log(this.createProgressBar(overallProgress));
    
    // 关键指标
    console.log('\n📈 关键指标:');
    console.log(`  TypeScript错误: ${this.metrics.currentErrors.toLocaleString()} / ${this.metrics.totalErrors.toLocaleString()}`);
    console.log(`  修复文件: ${this.metrics.fixedFiles} / ${this.metrics.totalFiles}`);
    console.log(`  构建时间: ${this.metrics.buildTime === -1 ? '构建失败' : this.metrics.buildTime + 's'}`);
    
    // 阶段进度
    console.log('\n🎯 阶段进度:');
    Object.entries(this.metrics.phases).forEach(([phase, data]) => {
      const statusIcon = this.getStatusIcon(data.status);
      const progressBar = this.createProgressBar(data.progress, 20);
      console.log(`  ${statusIcon} ${phase}: ${progressBar} ${data.progress}%`);
    });
    
    // 质量指标
    console.log('\n🏆 质量目标:');
    console.log(`  ✅ TypeScript错误: ${this.metrics.currentErrors === 0 ? '达标' : '未达标'}`);
    console.log(`  ${this.metrics.buildTime > 0 && this.metrics.buildTime < 120 ? '✅' : '❌'} 构建时间: ${this.metrics.buildTime === -1 ? '失败' : (this.metrics.buildTime < 120 ? '达标' : '超时')}`);
    
    // 下一步建议
    console.log('\n🎯 下一步建议:');
    if (this.metrics.currentErrors > 10000) {
      console.log('  🔧 继续修复基础语法错误');
    } else if (this.metrics.currentErrors > 1000) {
      console.log('  🏗️ 开始重建服务层');
    } else if (this.metrics.currentErrors > 100) {
      console.log('  🎨 修复UI组件');
    } else if (this.metrics.currentErrors > 0) {
      console.log('  ✨ 完善细节和优化');
    } else {
      console.log('  🎉 项目修复完成！');
    }
    
    console.log(`\n⏰ 最后更新: ${new Date().toLocaleString()}`);
  }

  createProgressBar(percentage, length = 30) {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
  }

  getStatusIcon(status) {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'not_started': return '⏳';
      default: return '❓';
    }
  }

  saveMetrics() {
    const metricsPath = 'reports/progress-metrics.json';
    fs.mkdirSync(path.dirname(metricsPath), { recursive: true });
    
    const data = {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      overallProgress: Math.round(
        ((this.metrics.totalErrors - this.metrics.currentErrors) / this.metrics.totalErrors) * 100
      )
    };
    
    fs.writeFileSync(metricsPath, JSON.stringify(data, null, 2));
  }

  async startMonitoring(intervalSeconds = 30) {
    console.log(`🔄 开始监控，每${intervalSeconds}秒更新一次...\n`);
    
    // 立即更新一次
    await this.updateMetrics();
    
    // 设置定时更新
    setInterval(async () => {
      await this.updateMetrics();
    }, intervalSeconds * 1000);
  }
}

// 命令行接口
if (require.main === module) {
  const tracker = new ProgressTracker();
  
  const args = process.argv.slice(2);
  if (args.includes('--monitor')) {
    const interval = parseInt(args[args.indexOf('--monitor') + 1]) || 30;
    tracker.startMonitoring(interval);
  } else {
    tracker.updateMetrics();
  }
}

module.exports = ProgressTracker;
