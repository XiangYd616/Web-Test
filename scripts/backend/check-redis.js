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
      process.exit(0);
    }
    
    // 检查连接状态
    const isConnected = redisConnection.isRedisConnected();
    
    if (!isConnected) {
      process.exit(1);
    }
    
    // 执行健康检查
    const health = await redisConnection.healthCheck();
    
    if (health.latency) {
    }
    if (health.memory) {
    }
    
    
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
