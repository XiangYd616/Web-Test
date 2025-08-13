#!/usr/bin/env node

/**
 * 维护仪表板
 * 显示项目健康状态和维护历史
 */

const fs = require('fs');
const path = require('path');

class MaintenanceDashboard {
  constructor() {
    this.projectRoot = process.cwd();
    this.reportsDir = path.join(this.projectRoot, 'reports', 'maintenance');
  }

  // 显示仪表板
  async showDashboard() {
    console.log('🎛️  项目维护仪表板\n');
    
    try {
      const latestReports = this.getLatestReports();
      const healthTrends = this.calculateHealthTrends();
      const recommendations = this.generateRecommendations(latestReports);
      
      this.displayCurrentStatus(latestReports);
      this.displayHealthTrends(healthTrends);
      this.displayRecommendations(recommendations);
      this.displayQuickActions();
      
    } catch (error) {
      console.error('❌ 无法加载仪表板:', error.message);
    }
  }

  // 获取最新报告
  getLatestReports() {
    if (!fs.existsSync(this.reportsDir)) {
      return { daily: null, weekly: null, monthly: null };
    }

    const files = fs.readdirSync(this.reportsDir);
    const reports = { daily: null, weekly: null, monthly: null };

    ['daily', 'weekly', 'monthly'].forEach(type => {
      const typeFiles = files
        .filter(file => file.includes(`maintenance-${type}-`))
        .sort()
        .reverse();
      
      if (typeFiles.length > 0) {
        try {
          const content = fs.readFileSync(
            path.join(this.reportsDir, typeFiles[0]), 
            'utf8'
          );
          reports[type] = JSON.parse(content);
        } catch (error) {
          console.warn(`⚠️ 无法读取${type}报告:`, error.message);
        }
      }
    });

    return reports;
  }

  // 计算健康趋势
  calculateHealthTrends() {
    if (!fs.existsSync(this.reportsDir)) {
      return { trend: 'stable', change: 0, history: [] };
    }

    const files = fs.readdirSync(this.reportsDir)
      .filter(file => file.includes('maintenance-daily-'))
      .sort()
      .slice(-7); // 最近7天

    const history = [];
    files.forEach(file => {
      try {
        const content = fs.readFileSync(path.join(this.reportsDir, file), 'utf8');
        const report = JSON.parse(content);
        if (report.summary) {
          history.push({
            date: file.match(/(\d{4}-\d{2}-\d{2})/)[1],
            score: report.summary.healthScore
          });
        }
      } catch (error) {
        // 忽略无法解析的文件
      }
    });

    if (history.length < 2) {
      return { trend: 'stable', change: 0, history };
    }

    const latest = history[history.length - 1].score;
    const previous = history[history.length - 2].score;
    const change = latest - previous;

    let trend = 'stable';
    if (change > 5) trend = 'improving';
    else if (change < -5) trend = 'declining';

    return { trend, change, history };
  }

  // 生成建议
  generateRecommendations(reports) {
    const recommendations = [];

    // 基于最新日报告生成建议
    if (reports.daily) {
      const dailyReport = reports.daily;
      
      if (dailyReport.summary.healthScore < 80) {
        recommendations.push({
          priority: 'high',
          type: 'health',
          message: '项目健康评分较低，建议立即检查错误日志'
        });
      }

      dailyReport.checks.forEach(check => {
        if (check.status === 'error') {
          recommendations.push({
            priority: 'high',
            type: 'error',
            message: `${check.name} 检查失败: ${check.error}`
          });
        }

        if (check.name === 'build_health' && check.largeChunks > 3) {
          recommendations.push({
            priority: 'medium',
            type: 'performance',
            message: `发现 ${check.largeChunks} 个大chunk，建议优化代码分割`
          });
        }

        if (check.name === 'dependencies' && check.vulnerabilities > 0) {
          recommendations.push({
            priority: 'high',
            type: 'security',
            message: `发现 ${check.vulnerabilities} 个安全漏洞，建议立即修复`
          });
        }

        if (check.name === 'dependencies' && check.outdated > 10) {
          recommendations.push({
            priority: 'medium',
            type: 'maintenance',
            message: `有 ${check.outdated} 个过时依赖，建议定期更新`
          });
        }
      });
    }

    // 如果没有建议，添加一些通用建议
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        type: 'maintenance',
        message: '项目状态良好，建议继续保持定期维护'
      });
    }

    return recommendations;
  }

  // 显示当前状态
  displayCurrentStatus(reports) {
    console.log('📊 当前状态\n');
    
    ['daily', 'weekly', 'monthly'].forEach(type => {
      const report = reports[type];
      const typeLabel = { daily: '日检查', weekly: '周检查', monthly: '月检查' }[type];
      
      if (report) {
        const status = report.summary.healthScore >= 90 ? '✅' : 
                      report.summary.healthScore >= 70 ? '⚠️' : '❌';
        const date = new Date(report.timestamp).toLocaleDateString('zh-CN');
        
        console.log(`   ${status} ${typeLabel}: ${report.summary.healthScore}% (${date})`);
        
        if (report.summary.errors > 0) {
          console.log(`      ⚠️ ${report.summary.errors} 个错误需要关注`);
        }
      } else {
        console.log(`   ⭕ ${typeLabel}: 暂无数据`);
      }
    });
    
    console.log();
  }

  // 显示健康趋势
  displayHealthTrends(trends) {
    console.log('📈 健康趋势 (最近7天)\n');
    
    if (trends.history.length === 0) {
      console.log('   📊 暂无趋势数据\n');
      return;
    }

    const trendIcon = {
      'improving': '📈',
      'declining': '📉',
      'stable': '➡️'
    }[trends.trend];

    console.log(`   ${trendIcon} 趋势: ${trends.trend} (${trends.change > 0 ? '+' : ''}${trends.change}%)`);
    
    // 显示简单的趋势图
    console.log('   图表:');
    trends.history.forEach(point => {
      const bar = '█'.repeat(Math.round(point.score / 10));
      console.log(`   ${point.date}: ${bar} ${point.score}%`);
    });
    
    console.log();
  }

  // 显示建议
  displayRecommendations(recommendations) {
    console.log('💡 维护建议\n');
    
    const priorityOrder = ['high', 'medium', 'low'];
    const priorityIcons = { high: '🔴', medium: '🟡', low: '🟢' };
    
    priorityOrder.forEach(priority => {
      const items = recommendations.filter(rec => rec.priority === priority);
      if (items.length > 0) {
        console.log(`   ${priorityIcons[priority]} ${priority.toUpperCase()} 优先级:`);
        items.forEach(item => {
          console.log(`      • ${item.message}`);
        });
        console.log();
      }
    });
  }

  // 显示快速操作
  displayQuickActions() {
    console.log('⚡ 快速操作\n');
    
    const actions = [
      { command: 'npm run build', description: '运行构建检查' },
      { command: 'node scripts/continuous-maintenance.cjs', description: '运行完整维护检查' },
      { command: 'node scripts/scheduled-maintenance.cjs daily', description: '运行日常检查' },
      { command: 'node scripts/system-integration-checker.cjs', description: '运行系统集成检查' },
      { command: 'npm audit fix', description: '修复安全漏洞' },
      { command: 'npm update', description: '更新依赖包' }
    ];

    actions.forEach((action, index) => {
      console.log(`   ${index + 1}. ${action.description}`);
      console.log(`      命令: ${action.command}`);
      console.log();
    });
  }

  // 生成HTML报告
  async generateHTMLReport() {
    const reports = this.getLatestReports();
    const trends = this.calculateHealthTrends();
    const recommendations = this.generateRecommendations(reports);
    
    const html = this.createHTMLReport(reports, trends, recommendations);
    const htmlPath = path.join(this.projectRoot, 'reports', 'maintenance-dashboard.html');
    
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`📄 HTML报告已生成: ${htmlPath}`);
    
    return htmlPath;
  }

  createHTMLReport(reports, trends, recommendations) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>项目维护仪表板</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .status-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .health-score { font-size: 2em; font-weight: bold; color: #28a745; }
        .recommendations { background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .trend-chart { background: #e9ecef; padding: 20px; border-radius: 8px; }
        .priority-high { color: #dc3545; }
        .priority-medium { color: #ffc107; }
        .priority-low { color: #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎛️ 项目维护仪表板</h1>
            <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        </div>
        
        <div class="status-grid">
            ${this.generateStatusCards(reports)}
        </div>
        
        <div class="trend-chart">
            <h3>📈 健康趋势</h3>
            ${this.generateTrendChart(trends)}
        </div>
        
        <div class="recommendations">
            <h3>💡 维护建议</h3>
            ${this.generateRecommendationsList(recommendations)}
        </div>
    </div>
</body>
</html>`;
  }

  generateStatusCards(reports) {
    return ['daily', 'weekly', 'monthly'].map(type => {
      const report = reports[type];
      const typeLabel = { daily: '日检查', weekly: '周检查', monthly: '月检查' }[type];
      
      if (report) {
        return `
          <div class="status-card">
            <h4>${typeLabel}</h4>
            <div class="health-score">${report.summary.healthScore}%</div>
            <p>成功: ${report.summary.success}/${report.summary.total}</p>
            <p>时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}</p>
          </div>`;
      } else {
        return `
          <div class="status-card">
            <h4>${typeLabel}</h4>
            <div class="health-score">--</div>
            <p>暂无数据</p>
          </div>`;
      }
    }).join('');
  }

  generateTrendChart(trends) {
    if (trends.history.length === 0) {
      return '<p>暂无趋势数据</p>';
    }

    return trends.history.map(point => 
      `<div>${point.date}: ${'█'.repeat(Math.round(point.score / 10))} ${point.score}%</div>`
    ).join('');
  }

  generateRecommendationsList(recommendations) {
    const priorityOrder = ['high', 'medium', 'low'];
    
    return priorityOrder.map(priority => {
      const items = recommendations.filter(rec => rec.priority === priority);
      if (items.length === 0) return '';
      
      return `
        <h4 class="priority-${priority}">${priority.toUpperCase()} 优先级</h4>
        <ul>
          ${items.map(item => `<li>${item.message}</li>`).join('')}
        </ul>`;
    }).join('');
  }
}

// 主执行函数
async function main() {
  const args = process.argv.slice(2);
  const dashboard = new MaintenanceDashboard();
  
  if (args.includes('--html')) {
    await dashboard.generateHTMLReport();
  } else {
    await dashboard.showDashboard();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MaintenanceDashboard;
