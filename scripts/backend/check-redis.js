#!/usr/bin/env node

/**
 * Redis连接检查脚本
 */

require('dotenv').config();
const redisConnection = require('../services/redis/connection');

async function checkRedis() {
  console.log('🔍 检查Redis连接状态...\n');
  
  try {
    // 检查Redis是否启用
    if (process.env.REDIS_ENABLED !== 'true') {
      console.log('ℹ️  Redis缓存已禁用');
      console.log('   要启用Redis，请在.env文件中设置 REDIS_ENABLED=true');
      process.exit(0);
    }
    
    // 检查连接状态
    const isConnected = redisConnection.isRedisConnected();
    console.log(`📡 连接状态: ${isConnected ? '✅ 已连接' : '❌ 未连接'}`);
    
    if (!isConnected) {
      console.log('\n❌ Redis连接失败');
      console.log('请检查以下配置:');
      console.log(`   - REDIS_HOST: ${process.env.REDIS_HOST || 'localhost'}`);
      console.log(`   - REDIS_PORT: ${process.env.REDIS_PORT || '6379'}`);
      console.log(`   - REDIS_PASSWORD: ${process.env.REDIS_PASSWORD ? '***' : '(未设置)'}`);
      console.log(`   - REDIS_DB: ${process.env.REDIS_DB || '0'}`);
      process.exit(1);
    }
    
    // 执行健康检查
    console.log('\n🏥 执行健康检查...');
    const health = await redisConnection.healthCheck();
    
    console.log(`   状态: ${health.status}`);
    if (health.latency) {
      console.log(`   延迟: ${health.latency}`);
    }
    if (health.memory) {
      console.log(`   内存使用: ${health.memory.formatted || health.memory.used}`);
    }
    
    console.log('\n✅ Redis连接正常');
    
  } catch (error) {
    console.error('\n❌ Redis检查失败:', error.message);
    process.exit(1);
  } finally {
    // 关闭连接
    await redisConnection.disconnect();
    process.exit(0);
  }
}

// 运行检查
checkRedis();
