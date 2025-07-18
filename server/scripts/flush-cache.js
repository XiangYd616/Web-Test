#!/usr/bin/env node

/**
 * 清空缓存脚本
 */

require('dotenv').config();
const cacheService = require('../services/redis/cache');
const fallbackHandler = require('../utils/fallback');

async function flushCache() {
  console.log('🧹 清空缓存...\n');
  
  try {
    // 检查Redis是否可用
    if (cacheService.isAvailable()) {
      console.log('📡 清空Redis缓存...');
      const result = await cacheService.flush();
      
      if (result) {
        console.log('✅ Redis缓存已清空');
      } else {
        console.log('❌ Redis缓存清空失败');
      }
    } else {
      console.log('ℹ️  Redis不可用，跳过Redis缓存清空');
    }
    
    // 清空内存缓存
    console.log('\n🧠 清空内存缓存...');
    const memoryCleared = fallbackHandler.clearMemoryCache();
    console.log(`✅ 内存缓存已清空: ${memoryCleared} 项`);
    
    // 显示统计信息
    console.log('\n📊 缓存统计:');
    const stats = cacheService.getStats();
    console.log(`   命中率: ${stats.hitRate}`);
    console.log(`   总请求: ${stats.total}`);
    console.log(`   命中: ${stats.hits}`);
    console.log(`   未命中: ${stats.misses}`);
    console.log(`   设置: ${stats.sets}`);
    console.log(`   删除: ${stats.deletes}`);
    console.log(`   错误: ${stats.errors}`);
    
    console.log('\n✅ 缓存清空完成');
    
  } catch (error) {
    console.error('\n❌ 缓存清空失败:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// 运行清空
flushCache();
