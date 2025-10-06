/**
 * 共享中间件
 * 集中管理测试路由使用的所有中间件
 */

const { authMiddleware, optionalAuth, adminAuth } = require('../../../middleware/auth');
const { testRateLimiter, historyRateLimiter } = require('../../../middleware/rateLimiter');
const { asyncHandler } = require('../../../middleware/errorHandler');
const { validateURLMiddleware, validateAPIURLMiddleware } = require('../../../middleware/urlValidator');
const { apiCache, dbCache } = require('../../../middleware/cache');

module.exports = {
  // 认证中间件
  authMiddleware,      // 需要登录
  optionalAuth,        // 可选登录
  adminAuth,           // 需要管理员权限
  
  // 限流中间件
  testRateLimiter,     // 测试限流
  historyRateLimiter,  // 历史记录限流
  
  // 错误处理
  asyncHandler,        // 异步错误处理
  
  // 验证中间件
  validateURLMiddleware,    // URL验证
  validateAPIURLMiddleware, // API URL验证
  
  // 缓存中间件
  apiCache,            // API缓存
  dbCache              // 数据库缓存
};

