windsurf.cascadeCommandsAllowList/**
 * 简化的缓存中间件
 * 使用内存缓存提供基础缓存功能
 */

const crypto = require('crypto');

// 简单的内存缓存存储
const cache = new Map();

/**
 * 创建缓存中间件
 */
function createCacheMiddleware(options = {}) {
    const defaultOptions = {
        ttl: 15 * 60, // 15分钟
        excludeMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
        excludeStatus: [400, 401, 403, 404, 500, 502, 503, 504]
    };

    const config = { ...defaultOptions, ...options };

    return async (req, res, next) => {
        try {
            // 跳过不缓存的方法
            if (config.excludeMethods.includes(req.method)) {
                return next();
            }

            // 生成缓存键
            const cacheKey = generateCacheKey(req);
            
            // 尝试从缓存获取
            const cached = cache.get(cacheKey);
            
            if (cached && Date.now() - cached.timestamp < config.ttl * 1000) {
                res.set('X-Cache', 'HIT');
                return res.json(cached.data);
            }

            // 设置缓存未命中标记
            res.set('X-Cache', 'MISS');

            // 拦截响应以缓存结果
            const originalJson = res.json;
            res.json = function(data) {
                // 只缓存成功的响应
                if (res.statusCode >= 200 && res.statusCode < 300 && 
                    !config.excludeStatus.includes(res.statusCode)) {
                    cache.set(cacheKey, {
                        data,
                        timestamp: Date.now()
                    });
                    
                    // 清理过期缓存
                    cleanExpiredCache(config.ttl);
                }
                return originalJson.call(this, data);
            };

            next();
        } catch (error) {
            console.error('缓存中间件错误:', error);
            next();
        }
    };
}

/**
 * 清理过期缓存
 */
function cleanExpiredCache(ttl) {
    const now = Date.now();
    const maxAge = (ttl || 900) * 1000; // 默认15分钟
    
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > maxAge) {
            cache.delete(key);
        }
    }
}

/**
 * 生成缓存键
 */
function generateCacheKey(req) {
    const url = req.originalUrl || req.url;
    const method = req.method;
    const userId = req.user?.id || 'anonymous';
    
    const keyData = `${method}:${url}:${userId}`;
    return crypto.createHash('md5').update(keyData).digest('hex');
}

/**
 * 缓存控制中间件
 */
function createCacheControlMiddleware() {
    return (req, res, next) => {
        // 设置缓存控制头
        if (req.method === 'GET') {
            res.set('Cache-Control', 'public, max-age=300'); // 5分钟
        } else {
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        next();
    };
}

module.exports = {
    createCacheMiddleware,
    createCacheControlMiddleware,
    generateCacheKey
};
