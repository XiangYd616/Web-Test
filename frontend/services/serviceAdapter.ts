/**
 * 服务适配器 — 消除前端 isDesktop() 散弹式判断
 *
 * 使用方式：
 *   const getItems = routeByMode(
 *     async () => { ... SQLite / IPC 本地逻辑 ... },
 *     async () => { ... HTTP API 云端逻辑 ... }
 *   );
 *
 * 运行时根据环境自动选择执行路径，业务组件只需调用 getItems()。
 */
import { isDesktop } from '../utils/environment';

/**
 * 根据运行环境路由到本地实现或云端实现。
 *
 * @param localImpl  桌面端（Electron）实现
 * @param cloudImpl  云端（HTTP API）实现
 * @returns 统一的异步函数
 */
export function routeByMode<TArgs extends unknown[], TResult>(
  localImpl: (...args: TArgs) => Promise<TResult>,
  cloudImpl: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => {
    return isDesktop() ? localImpl(...args) : cloudImpl(...args);
  };
}

/**
 * 创建带缓存的模式路由（适用于不频繁变更的配置类查询）
 */
export function routeByModeWithCache<TArgs extends unknown[], TResult>(
  localImpl: (...args: TArgs) => Promise<TResult>,
  cloudImpl: (...args: TArgs) => Promise<TResult>,
  options: { ttlMs: number; keyFn?: (...args: TArgs) => string }
): (...args: TArgs) => Promise<TResult> {
  const cache = new Map<string, { data: TResult; expiry: number }>();
  const route = routeByMode(localImpl, cloudImpl);

  return async (...args: TArgs) => {
    const key = options.keyFn ? options.keyFn(...args) : JSON.stringify(args);
    const cached = cache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
    const result = await route(...args);
    cache.set(key, { data: result, expiry: Date.now() + options.ttlMs });
    return result;
  };
}

/**
 * 获取当前运行模式
 */
export type AppMode = 'desktop' | 'cloud';
export function getAppMode(): AppMode {
  return isDesktop() ? 'desktop' : 'cloud';
}
