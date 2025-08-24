/**
 * 性能优化和监控脚本
 * 提供性能分析、优化建议、缓存管理等功能
 */

const { performanceCollector } = require('../services/performance/PerformanceMonitor');
const { cacheService } = require('../services/cache/CacheService');
const { logger } = require('../utils/errorHandler');

/**
 * 性能优化器
 */
class PerformanceOptimizer {
  constructor() {
    this.thresholds = {
      responseTime: 1000,    // 1秒
      errorRate: 5,          // 5%
      cpuUsage: 80,          // 80%
      memoryUsage: 85,       // 85%
      cacheHitRate: 70       // 70%
    };
  }

  /**
   * 分析系统性能
   */
  async analyzePerformance() {
    console.log('🔍 分析系统性能...');
    console.log('=' .repeat(60));

    try {
      // 获取性能统计
      const stats = performanceCollector.getStats();
      const apiStats = performanceCollector.getApiStats();
      const cacheStats = await cacheService.getStats();

      // 显示基本统计
      this.displayBasicStats(stats);
      
      // 显示API统计
      this.displayApiStats(apiStats);
      
      // 显示缓存统计
      this.displayCacheStats(cacheStats);
      
      // 生成优化建议
      const recommendations = this.generateRecommendations(stats, apiStats, cacheStats);
      this.displayRecommendations(recommendations);

      return {
        stats,
        apiStats,
        cacheStats,
        recommendations
      };

    } catch (error) {
      console.error('❌ 性能分析失败:', error.message);
      throw error;
    }
  }

  /**
   * 显示基本统计信息
   */
  displayBasicStats(stats) {
    console.log('📊 系统概览:');
    console.log(`  运行时间: ${this.formatUptime(stats.uptime)}`);
    console.log(`  总请求数: ${stats.requests.total.toLocaleString()}`);
    console.log(`  错误数: ${stats.requests.errors.toLocaleString()}`);
    console.log(`  吞吐量: ${stats.requests.throughput} 请求/秒`);
    console.log(`  错误率: ${stats.requests.errorRate}%`);
    console.log(`  平均响应时间: ${stats.requests.avgResponseTime}ms`);
    console.log(`  P95响应时间: ${stats.requests.p95ResponseTime}ms`);
    console.log(`  活跃请求: ${stats.requests.activeRequests}`);
    console.log('');

    console.log('💻 系统资源:');
    console.log(`  CPU使用率: ${stats.system.cpu}%`);
    console.log(`  内存使用率: ${stats.system.memory}%`);
    console.log(`  可用内存: ${stats.system.freeMemory}MB / ${stats.system.totalMemory}MB`);
    console.log(`  负载平均: ${stats.system.loadAverage.map(l => l.toFixed(2)).join(', ')}`);
    console.log(`  平台: ${stats.system.platform} ${stats.system.arch}`);
    console.log(`  Node.js版本: ${stats.system.nodeVersion}`);
    console.log('');

    console.log('🔧 进程信息:');
    const memUsage = stats.process.memoryUsage;
    console.log(`  PID: ${stats.process.pid}`);
    console.log(`  堆内存: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
    console.log(`  外部内存: ${Math.round(memUsage.external / 1024 / 1024)}MB`);
    console.log(`  数组缓冲区: ${Math.round(memUsage.arrayBuffers / 1024 / 1024)}MB`);
    console.log('');
  }

  /**
   * 显示API统计信息
   */
  displayApiStats(apiStats) {
    console.log('🌐 API端点统计 (前10个最活跃):');
    
    if (apiStats.length === 0) {
      console.log('  暂无API统计数据');
      console.log('');
      return;
    }

    apiStats.slice(0, 10).forEach((api, index) => {
      const status = api.errorRate > this.thresholds.errorRate ? '❌' : 
                    api.avgTime > this.thresholds.responseTime ? '⚠️' : '✅';
      
      console.log(`  ${index + 1}. ${status} ${api.method} ${api.path}`);
      console.log(`     请求数: ${api.count.toLocaleString()}, 平均时间: ${api.avgTime}ms`);
      console.log(`     错误率: ${api.errorRate}%, 时间范围: ${api.minTime}-${api.maxTime}ms`);
    });
    console.log('');
  }

  /**
   * 显示缓存统计信息
   */
  displayCacheStats(cacheStats) {
    console.log('💾 缓存统计:');
    console.log(`  策略: ${cacheStats.strategy}`);
    
    if (cacheStats.memory) {
      console.log(`  内存缓存:`);
      console.log(`    命中率: ${(cacheStats.memory.hitRate * 100).toFixed(1)}%`);
      console.log(`    大小: ${cacheStats.memory.size} / ${cacheStats.memory.maxSize}`);
      console.log(`    命中: ${cacheStats.memory.hits}, 未命中: ${cacheStats.memory.misses}`);
    }
    
    if (cacheStats.redis && cacheStats.redis.connected) {
      console.log(`  Redis缓存:`);
      console.log(`    连接状态: ${cacheStats.redis.connected ? '✅ 已连接' : '❌ 未连接'}`);
      console.log(`    命中率: ${(cacheStats.redis.hitRate * 100).toFixed(1)}%`);
      console.log(`    内存使用: ${Math.round(cacheStats.redis.memoryUsed / 1024 / 1024)}MB`);
      console.log(`    命中: ${cacheStats.redis.hits}, 未命中: ${cacheStats.redis.misses}`);
    }
    
    if (cacheStats.combined) {
      console.log(`  总体缓存:`);
      console.log(`    总命中率: ${(cacheStats.combined.overallHitRate * 100).toFixed(1)}%`);
      console.log(`    总命中: ${cacheStats.combined.totalHits}, 总未命中: ${cacheStats.combined.totalMisses}`);
    }
    console.log('');
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(stats, apiStats, cacheStats) {
    const recommendations = [];

    // 响应时间建议
    if (stats.requests.avgResponseTime > this.thresholds.responseTime) {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        title: '响应时间过长',
        description: `平均响应时间 ${stats.requests.avgResponseTime}ms 超过阈值 ${this.thresholds.responseTime}ms`,
        suggestions: [
          '检查数据库查询性能',
          '启用更积极的缓存策略',
          '优化API端点逻辑',
          '考虑使用CDN加速静态资源'
        ]
      });
    }

    // 错误率建议
    if (stats.requests.errorRate > this.thresholds.errorRate) {
      recommendations.push({
        type: 'reliability',
        severity: 'high',
        title: '错误率过高',
        description: `错误率 ${stats.requests.errorRate}% 超过阈值 ${this.thresholds.errorRate}%`,
        suggestions: [
          '检查错误日志找出根本原因',
          '增加输入验证和错误处理',
          '实施熔断器模式',
          '增加健康检查和监控'
        ]
      });
    }

    // CPU使用率建议
    if (stats.system.cpu > this.thresholds.cpuUsage) {
      recommendations.push({
        type: 'resource',
        severity: 'medium',
        title: 'CPU使用率过高',
        description: `CPU使用率 ${stats.system.cpu}% 超过阈值 ${this.thresholds.cpuUsage}%`,
        suggestions: [
          '分析CPU密集型操作',
          '考虑使用集群模式',
          '优化算法和数据结构',
          '使用异步处理减少阻塞'
        ]
      });
    }

    // 内存使用率建议
    if (stats.system.memory > this.thresholds.memoryUsage) {
      recommendations.push({
        type: 'resource',
        severity: 'medium',
        title: '内存使用率过高',
        description: `内存使用率 ${stats.system.memory}% 超过阈值 ${this.thresholds.memoryUsage}%`,
        suggestions: [
          '检查内存泄漏',
          '优化缓存大小',
          '清理未使用的对象',
          '考虑增加服务器内存'
        ]
      });
    }

    // 缓存命中率建议
    const overallHitRate = cacheStats.combined?.overallHitRate * 100 || 0;
    if (overallHitRate < this.thresholds.cacheHitRate) {
      recommendations.push({
        type: 'cache',
        severity: 'medium',
        title: '缓存命中率过低',
        description: `缓存命中率 ${overallHitRate.toFixed(1)}% 低于阈值 ${this.thresholds.cacheHitRate}%`,
        suggestions: [
          '分析缓存键的设计',
          '增加缓存TTL时间',
          '预热常用数据',
          '优化缓存策略'
        ]
      });
    }

    return recommendations;
  }

  /**
   * 显示优化建议
   */
  displayRecommendations(recommendations) {
    console.log('💡 优化建议:');
    
    if (recommendations.length === 0) {
      console.log('  🎉 系统性能良好，暂无优化建议');
      console.log('');
      return;
    }

    recommendations.forEach((rec, index) => {
      const severityIcon = rec.severity === 'high' ? '🔴' : 
                          rec.severity === 'medium' ? '🟡' : '🟢';
      
      console.log(`  ${index + 1}. ${severityIcon} ${rec.title}`);
      console.log(`     ${rec.description}`);
      console.log(`     建议:`);
      rec.suggestions.forEach(suggestion => {
        console.log(`       • ${suggestion}`);
      });
      console.log('');
    });
  }

  /**
   * 格式化运行时间
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分钟`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`);
    
    return parts.join(' ');
  }

  /**
   * 清理缓存
   */
  async cleanupCache() {
    console.log('🧹 清理缓存...');
    
    try {
      await cacheService.clear();
      console.log('✅ 缓存清理完成');
    } catch (error) {
      console.error('❌ 缓存清理失败:', error.message);
    }
  }

  /**
   * 重置性能统计
   */
  resetStats() {
    console.log('🔄 重置性能统计...');
    
    try {
      performanceCollector.reset();
      console.log('✅ 性能统计重置完成');
    } catch (error) {
      console.error('❌ 性能统计重置失败:', error.message);
    }
  }
}

/**
 * 命令行接口
 */
async function main() {
  const command = process.argv[2];
  const optimizer = new PerformanceOptimizer();
  
  try {
    switch (command) {
      case 'analyze':
        await optimizer.analyzePerformance();
        break;
        
      case 'cleanup':
        await optimizer.cleanupCache();
        break;
        
      case 'reset':
        optimizer.resetStats();
        break;
        
      default:
        console.log(`
🚀 性能优化工具

使用方法:
  npm run perf:analyze   - 分析系统性能
  npm run perf:cleanup   - 清理缓存
  npm run perf:reset     - 重置性能统计

示例:
  npm run perf:analyze
        `);
        break;
    }
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    process.exit(1);
  }
}

// 运行命令行接口
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { PerformanceOptimizer };
