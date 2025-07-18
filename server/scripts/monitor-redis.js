#!/usr/bin/env node

/**
 * Redis监控脚本
 */

require('dotenv').config();
const cacheMonitoring = require('../services/redis/monitoring');
const cacheService = require('../services/redis/cache');

function displayReport(report) {
  console.clear();
  console.log('📊 Redis缓存监控报告');
  console.log('='.repeat(50));
  console.log(`时间: ${new Date(report.timestamp).toLocaleString()}`);
  console.log(`周期: ${report.period}`);
  console.log();
  
  // 连接状态
  console.log('🔗 连接状态:');
  console.log(`   已连接: ${report.connection.isConnected ? '✅' : '❌'}`);
  console.log(`   已启用: ${report.connection.isEnabled ? '✅' : '❌'}`);
  console.log();
  
  // 缓存统计
  console.log('📈 缓存统计:');
  console.log(`   命中率: ${report.cache.hitRate}`);
  console.log(`   总请求: ${report.cache.total}`);
  console.log(`   命中: ${report.cache.hits}`);
  console.log(`   未命中: ${report.cache.misses}`);
  console.log(`   设置: ${report.cache.sets}`);
  console.log(`   删除: ${report.cache.deletes}`);
  console.log(`   错误: ${report.cache.errors}`);
  console.log();
  
  // 性能指标
  console.log('⚡ 性能指标:');
  Object.entries(report.metrics).forEach(([metric, stats]) => {
    if (stats && stats.latest !== undefined) {
      const unit = getMetricUnit(metric);
      console.log(`   ${getMetricName(metric)}: ${stats.latest}${unit} (平均: ${stats.avg?.toFixed(2)}${unit})`);
    }
  });
  console.log();
  
  // 告警信息
  if (report.alerts && report.alerts.length > 0) {
    console.log('🚨 告警信息:');
    report.alerts.forEach(alert => {
      const icon = alert.type === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`   ${icon} ${alert.message}`);
    });
    console.log();
  }
  
  console.log(`最后更新: ${new Date().toLocaleString()}`);
  console.log('按 Ctrl+C 退出监控');
}

function getMetricName(metric) {
  const names = {
    responseTime: '响应时间',
    memoryUsage: '内存使用',
    hitRate: '命中率',
    errorRate: '错误率',
    connectionCount: '连接数',
    keyCount: '键数量'
  };
  return names[metric] || metric;
}

function getMetricUnit(metric) {
  const units = {
    responseTime: 'ms',
    memoryUsage: '%',
    hitRate: '%',
    errorRate: '%',
    connectionCount: '',
    keyCount: ''
  };
  return units[metric] || '';
}

async function startMonitoring() {
  console.log('🚀 启动Redis监控...\n');
  
  try {
    // 检查Redis是否可用
    if (!cacheService.isAvailable()) {
      console.log('❌ Redis不可用，无法启动监控');
      process.exit(1);
    }
    
    console.log('✅ Redis连接正常，开始监控...\n');
    
    // 定期获取监控报告
    const monitorInterval = setInterval(async () => {
      try {
        const report = cacheMonitoring.getMonitoringReport('5m');
        displayReport(report);
      } catch (error) {
        console.error('获取监控报告失败:', error.message);
      }
    }, 5000); // 每5秒更新一次
    
    // 立即显示一次
    const initialReport = cacheMonitoring.getMonitoringReport('5m');
    displayReport(initialReport);
    
    // 处理退出信号
    process.on('SIGINT', () => {
      clearInterval(monitorInterval);
      console.log('\n\n👋 监控已停止');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ 监控启动失败:', error.message);
    process.exit(1);
  }
}

// 启动监控
startMonitoring();
