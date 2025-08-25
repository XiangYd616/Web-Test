/**
 * 测试路由加载
 */

console.log('🧪 开始测试路由加载...');

try {
  console.log('1. 测试基础依赖...');
  
  // 测试中间件依赖
  const { asyncHandler } = require('./middleware/errorHandler');
  console.log('✅ asyncHandler 加载成功');
  
  const { authMiddleware, optionalAuth } = require('./middleware/auth');
  console.log('✅ auth middleware 加载成功');
  
  console.log('2. 测试路由模块...');
  
  // 测试路由模块加载
  const testRoutes = require('./routes/test.js');
  console.log('✅ 测试路由模块加载成功');
  console.log('路由类型:', typeof testRoutes);
  
  // 检查路由方法
  if (testRoutes && typeof testRoutes.use === 'function') {
    console.log('✅ 路由对象有效，包含 use 方法');
  } else {
    console.log('❌ 路由对象无效');
  }
  
  console.log('3. 测试路由应用...');
  
  // 创建测试应用
  const express = require('express');
  const app = express();
  
  // 应用响应格式化中间件
  const responseFormatter = require('./middleware/responseFormatter');
  app.use(responseFormatter);
  
  // 应用测试路由
  app.use('/api/test', testRoutes);
  
  console.log('✅ 路由应用成功');
  
  // 启动测试服务器
  const server = app.listen(3003, () => {
    console.log('🚀 测试服务器启动在端口 3003');
    console.log('📊 测试 k6 状态API: http://localhost:3003/api/test/k6/status');
    
    // 5秒后关闭服务器
    setTimeout(() => {
      server.close(() => {
        console.log('✅ 测试完成，服务器已关闭');
        process.exit(0);
      });
    }, 5000);
  });
  
} catch (error) {
  console.error('❌ 路由加载测试失败:', error.message);
  console.error('错误堆栈:', error.stack);
  process.exit(1);
}
