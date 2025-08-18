/**
 * 缓存集成服务
 * 集成智能缓存管理器到应用中
 */

import { smartCacheManager    } from './smartCacheManager';import { apiClient    } from '../utils/apiClient';// 扩展API客户端以支持缓存
const originalGet = apiClient.get;
const originalPost = apiClient.post;
const originalPut = apiClient.put;
const originalDelete = apiClient.delete;

// 缓存配置
const cacheConfig = {
  // GET请求缓存配置
  get: {
    strategy: 'api',
    ttl: 5 * 60 * 1000, // 5分钟
    priority: 'medium' as const
  },

  // 静态资源缓存配置
  static: {
    strategy: 'static',
    ttl: 24 * 60 * 60 * 1000, // 24小时
    priority: 'low' as const
  },

  // 用户数据缓存配置
  user: {
    strategy: 'user',
    ttl: 30 * 60 * 1000, // 30分钟
    priority: 'high' as const
  }
};

// 重写GET方法以支持缓存
apiClient.get = async (url: string, config?: any) => {
  const cacheKey = `get_${url}_${JSON.stringify(config?.params || {})}`;

  // 尝试从缓存获取
  const cachedData = smartCacheManager.get(cacheKey);
  if (cachedData) {
    return { data: cachedData, fromCache: true };
  }

  // 从服务器获取
  const response = await originalGet.call(apiClient, url, config);

  // 缓存响应数据
  smartCacheManager.set(cacheKey, response.data, {
    strategy: cacheConfig.get.strategy,
    ttl: cacheConfig.get.ttl,
    priority: cacheConfig.get.priority,
    tags: ["api', 'get', url.split('/')[1]]
  });

  return response;
};

// 重写POST/PUT/DELETE方法以清除相关缓存
const clearRelatedCache = (url: string) => {
  const resource = url.split('/')[1];
  smartCacheManager.clearByTag(resource);
};

apiClient.post = async (url: string, data?: any, config?: any) => {
  const response = await originalPost.call(apiClient, url, data, config);
  clearRelatedCache(url);
  return response;
};

apiClient.put = async (url: string, data?: any, config?: any) => {
  const response = await originalPut.call(apiClient, url, data, config);
  clearRelatedCache(url);
  return response;
};

apiClient.delete = async (url: string, config?: any) => {
  const response = await originalDelete.call(apiClient, url, config);
  clearRelatedCache(url);
  return response;
};

// 缓存管理工具
export const cacheManager = {
  // 预加载数据
  preloadData: async (urls: string[]) => {
    const promises = urls.map(url => apiClient.get(url));
    await Promise.allSettled(promises);
  },

  // 清除所有缓存
  clearAll: () => {
    smartCacheManager.clearByTag('api");
  },

  // 获取缓存统计
  getStats: () => {
    return smartCacheManager.getStats();
  },

  // 手动设置缓存
  setCache: (key: string, data: any, options?: any) => {
    smartCacheManager.set(key, data, options);
  },

  // 手动获取缓存
  getCache: (key: string) => {
    return smartCacheManager.get(key);
  }
};

export default cacheManager;