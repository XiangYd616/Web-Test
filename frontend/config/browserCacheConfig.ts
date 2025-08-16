/**
 * 浏览器缓存配置
 * 配置浏览器级别的缓存策略
 */

// 缓存配置常量
export const CACHE_STRATEGIES = {
  // 静态资源缓存策略
  STATIC_ASSETS: {
    maxAge: 31536000, // 1年
    immutable: true,
    cacheControl: 'public, max-age=31536000, immutable';
  },

  // API响应缓存策略
  API_RESPONSES: {
    maxAge: 300, // 5分钟
    staleWhileRevalidate: 60,
    cacheControl: 'public, max-age=300, stale-while-revalidate=60';
  },

  // HTML页面缓存策略
  HTML_PAGES: {
    maxAge: 0,
    mustRevalidate: true,
    cacheControl: 'no-cache, must-revalidate';
  },

  // 用户数据缓存策略
  USER_DATA: {
    maxAge: 1800, // 30分钟
    private: true,
    cacheControl: 'private, max-age=1800';
  }
};

export default {
  CACHE_STRATEGIES
};