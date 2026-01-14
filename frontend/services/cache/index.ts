/**
 * 统一缓存服务导出
 * 版本: v3.0.0
 *
 * 提供统一的缓存接口，整合所有缓存功能
 */

// 主要导出 - CacheManager是最完整的实现
export { CacheManager } from './cacheManager';
export type { CacheConfig, CacheItem, CacheStats, CacheStrategy } from './cacheManager';

// 创建默认实例
import { CacheManager } from './cacheManager';

/**
 * 默认缓存管理器实例
 * 使用推荐的配置
 */
export const cacheManager = new CacheManager({
  defaultTTL: 3600, // 1小时
  maxMemorySize: 50 * 1024 * 1024, // 50MB
  enableLocalStorage: true,
  enableMemoryCache: true,
  compressionThreshold: 10240, // 10KB
  enableCompression: true,
});

/**
 * 向后兼容别名
 * @deprecated 请使用 cacheManager
 */
export const cacheService = cacheManager;

/**
 * 向后兼容别名
 * @deprecated 请使用 cacheManager
 */
export const unifiedCache = cacheManager;

// 默认导出
export default cacheManager;
