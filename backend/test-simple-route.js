/**
 * 简单路由测试
 */

const express = require('express');

console.log('🧪 测试简单路由...');

try {
  // 加载测试路由
  const testRoutes = require('./routes/test.js');
  
  console.log('✅ 路由模块加载成功');
  console.log('路由类型:', typeof testRoutes);
  console.log('路由构造函数:', testRoutes.constructor.name);
  
  // 检查是否是Express Router
  if (testRoutes && typeof testRoutes === 'function') {
    console.log('✅ 路由是一个函数');
    
    // 检查是否有router的特征
    if (testRoutes.stack) {
      console.log('✅ 路由有stack属性，是Express Router');
      console.log('路由数量:', testRoutes.stack.length);
    } else {
      console.log('❌ 路由没有stack属性，不是Express Router');
    }
  } else {
    console.log('❌ 路由不是函数');
  }
  
} catch (error) {
  console.error('❌ 测试失败:', error.message);
  console.error('错误位置:', error.stack.split('\n')[1]);
}
