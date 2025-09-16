/**
 * API缓存中间件
 * 提供智能的API响应缓存功能
 */

const crypto = require('crypto');

/**
 * 创建API缓存中间件
 */
const createCacheMiddleware = (cacheManager, options = {}) => {
  const defaultOptions = {
    defaultTTL: 15 * 60, // 15分钟
    skipCache: false,
    skipCacheHeader: 'x-skip-cache',
    cacheKeyGenerator: null,
    shouldCache: null,
    onCacheHit: null,
    onCacheMiss: null,
    onCacheSet: null
  };
  
  const config = { ...defaultOptions, ...options };
  
  return (req, res, next) => {
    // 检查是否跳过缓存
    if (config.skipCache || req.headers[config.skipCacheHeader]) {
      
        return next();
      }
    
    // 只缓存GET请求
    if (req.method !== 'GET') {
      
        return next();
      }
    
    // 生成缓存键
    const cacheKey = config.cacheKeyGenerator 
      ? config.cacheKeyGenerator(req)
      : generateDefaultCacheKey(req);
    
    // 尝试从缓存获取响应
    cacheManager.get('api_responses', cacheKey)
      .then(cachedResponse => {
        if (cachedResponse) {
          // 缓存命中
          if (config.onCacheHit) {
            config.onCacheHit(req, cacheKey, cachedResponse);
          }
          
          // 设置缓存相关头部
          res.set({
            'X-Cache': 'HIT',
            'X-Cache-Key': cacheKey,
            'X-Cache-TTL': cachedResponse.ttl || 'unknown'
          });
          
          // 返回缓存的响应
          res.status(cachedResponse.statusCode || 200);
          
          // 设置原始头部
          if (cachedResponse.headers) {
            Object.entries(cachedResponse.headers).forEach(([key, value]) => {
              res.set(key, value);
            });
          }
          
          return res.json(cachedResponse.data);
        }
        
        // 缓存未命中，继续处理请求
        if (config.onCacheMiss) {
          config.onCacheMiss(req, cacheKey);
        }
        
        // 拦截响应以进行缓存
        interceptResponse(req, res, next, cacheManager, cacheKey, config);
      })
      .catch(error => {
        console.error('缓存获取失败:', error);
        // 缓存失败时继续正常处理
        next();
      });
  };
};

/**
 * 生成默认缓存键
 */
function generateDefaultCacheKey(req) {
  const url = req.originalUrl || req.url;
  const query = req.query;
  const user = req.user;
  
  // 基础键组件
  const keyComponents = [url];
  
  // 添加查询参数
  if (Object.keys(query).length > 0) {
    const sortedQuery = Object.keys(query).sort().reduce((result, key) => {
      result[key] = query[key];
      return result;
    }, {});
    keyComponents.push(JSON.stringify(sortedQuery));
  }
  
  // 添加用户相关信息（如果需要用户特定缓存）
  if (user) {
    keyComponents.push(`user:${user.id}`);
    keyComponents.push(`role:${user.role}`);
    keyComponents.push(`plan:${user.plan}`);
  }
  
  // 生成哈希
  const keyString = keyComponents.join('|');
  return crypto.createHash('md5').update(keyString).digest('hex');
}

/**
 * 拦截响应进行缓存
 */
function interceptResponse(req, res, next, cacheManager, cacheKey, config) {
  const originalJson = res.json;
  const originalSend = res.send;
  const originalEnd = res.end;
  
  let responseData = null;
  let responseSent = false;
  
  // 拦截 res.json
  res.json = function(data) {
    if (!responseSent) {
      responseData = data;
      responseSent = true;
      cacheResponse(req, res, cacheManager, cacheKey, config, data, res.statusCode);
    }
    return originalJson.call(this, data);
  };
  
  // 拦截 res.send
  res.send = function(data) {
    if (!responseSent) {
      responseData = data;
      responseSent = true;
      
      // 尝试解析JSON数据
      let parsedData = data;
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          // 不是JSON数据，保持原样
        }
      }
      
      cacheResponse(req, res, cacheManager, cacheKey, config, parsedData, res.statusCode);
    }
    return originalSend.call(this, data);
  };
  
  // 拦截 res.end
  res.end = function(data) {
    if (!responseSent && data) {
      responseData = data;
      responseSent = true;
      cacheResponse(req, res, cacheManager, cacheKey, config, data, res.statusCode);
    }
    return originalEnd.call(this, data);
  };
  
  // 设置缓存未命中头部
  res.set('X-Cache', 'MISS');
  res.set('X-Cache-Key', cacheKey);
  
  next();
}

/**
 * 缓存响应数据
 */
async function cacheResponse(req, res, cacheManager, cacheKey, config, data, statusCode) {
  try {
    // 检查是否应该缓存此响应
    if (config.shouldCache && !config.shouldCache(req, res, data, statusCode)) {
      return;
    }
    
    // 只缓存成功的响应
    if (statusCode < 200 || statusCode >= 300) {
      
        return;
      }
    
    // 准备缓存数据
    const cacheData = {
      data,
      statusCode,
      headers: extractCacheableHeaders(res),
      timestamp: new Date().toISOString(),
      ttl: config.defaultTTL
    };
    
    // 存储到缓存
    const success = await cacheManager.set('api_responses', cacheKey, cacheData, config.defaultTTL);
    
    if (success && config.onCacheSet) {
      config.onCacheSet(req, cacheKey, cacheData);
    }
    
    // 设置缓存相关头部
    res.set('X-Cache-Stored', success ? 'true' : 'false');
    
  } catch (error) {
    console.error('缓存响应失败:', error);
  }
}

/**
 * 提取可缓存的响应头
 */
function extractCacheableHeaders(res) {
  const cacheableHeaders = [
    'content-type',
    'content-encoding',
    'content-language',
    'last-modified',
    'etag',
    'expires',
    'cache-control'
  ];
  
  const headers = {};
  cacheableHeaders.forEach(header => {
    const value = res.get(header);
    if (value) {
      headers[header] = value;
    }
  });
  
  return headers;
}

/**
 * 条件缓存中间件
 * 基于特定条件决定是否缓存
 */
const conditionalCache = (cacheManager, conditions) => {
  return createCacheMiddleware(cacheManager, {
    shouldCache: (req, res, data, statusCode) => {
      // 检查所有条件
      for (const condition of conditions) {
        if (!condition(req, res, data, statusCode)) {
          return false;
        }
      }
      return true;
    }
  });
};

/**
 * 用户特定缓存中间件
 * 为不同用户缓存不同的响应
 */
const userSpecificCache = (cacheManager, options = {}) => {
  return createCacheMiddleware(cacheManager, {
    ...options,
    cacheKeyGenerator: (req) => {
      const baseKey = generateDefaultCacheKey(req);
      const userKey = req.user ? `user:${req.user.id}` : 'anonymous';
      return `${baseKey}:${userKey}`;
    }
  });
};

/**
 * 时间敏感缓存中间件
 * 根据时间动态调整TTL
 */
const timeSensitiveCache = (cacheManager, getTTL) => {
  return createCacheMiddleware(cacheManager, {
    defaultTTL: 0, // 将被动态计算覆盖
    shouldCache: (req, res, data, statusCode) => {
      const ttl = getTTL(req, res, data);
      return ttl > 0;
    },
    onCacheSet: async (req, cacheKey, cacheData) => {
      const ttl = getTTL(req, null, cacheData.data);
      if (ttl !== cacheData.ttl) {
        // 更新TTL
        await cacheManager.set('api_responses', cacheKey, cacheData, ttl);
      }
    }
  });
};

/**
 * 缓存失效中间件
 * 在特定操作后使相关缓存失效
 */
const cacheInvalidation = (cacheManager, getInvalidationPatterns) => {
  return async (req, res, next) => {
    // 先执行原始请求
    next();
    
    // 在响应完成后执行缓存失效
    res.on('finish', async () => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const patterns = getInvalidationPatterns(req, res);
          
          for (const pattern of patterns) {
            await cacheManager.deletePattern('api_responses', pattern);
          }
        }
      } catch (error) {
        console.error('缓存失效失败:', error);
      }
    });
  };
};

/**
 * 缓存预热中间件
 * 在应用启动时预热常用的API响应
 */
const cacheWarmup = async (cacheManager, warmupRoutes) => {
  console.log('🔥 开始API缓存预热...');
  
  const results = [];
  
  for (const route of warmupRoutes) {
    try {
      // 这里可以模拟请求来预热缓存
      // 实际实现可能需要更复杂的逻辑
      console.log(`预热路由: ${route.path}`);
      results.push({ route: route.path, success: true });
    } catch (error) {
      console.error(`预热路由失败: ${route.path}`, error);
      results.push({ route: route.path, success: false, error: error.message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ API缓存预热完成: ${successCount}/${results.length}`);
  
  return results;
};

module.exports = {
  createCacheMiddleware,
  conditionalCache,
  userSpecificCache,
  timeSensitiveCache,
  cacheInvalidation,
  cacheWarmup,
  generateDefaultCacheKey
};
