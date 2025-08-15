/**
 * 懒加载管理器
 * 提供组件级别的懒加载和代码分割功能
 */

import React, { ComponentType, LazyExoticComponent, ReactNode, Suspense } from 'react';
import EnhancedErrorBoundary from '../components/system/EnhancedErrorBoundary';
import { enhancedConfigManager } from '../config/EnhancedConfigManager';
import { performanceMonitor } from './performanceMonitor';

/**
 * 懒加载配置
 */
interface LazyLoadConfig {
  fallback?: ReactNode;
  errorBoundary?: boolean;
  preload?: boolean;
  timeout?: number;
  retries?: number;
  chunkName?: string;
}

/**
 * 加载状态
 */
interface LoadingState {
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * 懒加载组件包装器
 */
interface LazyComponentWrapper<P = {}> {
  Component: LazyExoticComponent<ComponentType<P>>;
  preload: () => Promise<void>;
  isLoaded: () => boolean;
  getLoadingState: () => LoadingState;
}

/**
 * 懒加载管理器
 */
export class LazyLoadManager {
  private static instance: LazyLoadManager;
  private loadedComponents = new Map<string, boolean>();
  private loadingComponents = new Map<string, Promise<any>>();
  private preloadQueue: string[] = [];
  private isPreloading = false;

  private constructor() { }

  static getInstance(): LazyLoadManager {
    if (!LazyLoadManager.instance) {
      LazyLoadManager.instance = new LazyLoadManager();
    }
    return LazyLoadManager.instance;
  }

  /**
   * 创建懒加载组件
   */
  createLazyComponent<P = {}>(
    importFn: () => Promise<{ default: ComponentType<P> }>,
    config: LazyLoadConfig = {}
  ): LazyComponentWrapper<P> {
    const {
      fallback = <DefaultLoadingComponent />,
      errorBoundary = true,
      preload = false,
      timeout = 30000,
      retries = 3,
      chunkName
    } = config;

    let loadingState: LoadingState = {
      isLoading: false,
      error: null,
      retryCount: 0
    };

    // 创建带重试机制的导入函数
    const importWithRetry = async (): Promise<{ default: ComponentType<P> }> => {
      loadingState.isLoading = true;
      loadingState.error = null;

      const componentName = chunkName || 'unknown';

      // 记录开始加载
      performanceMonitor.startMeasure(`lazy-load-${componentName}`);

      try {
        // 设置超时
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Component load timeout')), timeout);
        });

        const result = await Promise.race([importFn(), timeoutPromise]);

        // 记录加载完成
        const duration = performanceMonitor.endMeasure(`lazy-load-${componentName}`);
        performanceMonitor.recordMetric(`lazy-load-success-${componentName}`, duration, 'ms');

        // 标记为已加载
        this.loadedComponents.set(componentName, true);
        loadingState.isLoading = false;

        return result;

      } catch (error) {
        loadingState.error = error as Error;
        loadingState.isLoading = false;
        loadingState.retryCount++;

        // 记录加载失败
        performanceMonitor.recordMetric(`lazy-load-error-${componentName}`, 1, 'count');

        // 如果还有重试次数，则重试
        if (loadingState.retryCount < retries) {
          console.warn(`Component load failed, retrying... (${loadingState.retryCount}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * loadingState.retryCount));
          return importWithRetry();
        }

        throw error;
      }
    };

    // 创建懒加载组件
    const LazyComponent = React.lazy(importWithRetry);

    // 预加载函数
    const preloadFn = async (): Promise<void> => {
      const componentName = chunkName || 'unknown';

      if (this.loadedComponents.get(componentName)) {
        return; // 已经加载过了
      }

      if (this.loadingComponents.has(componentName)) {
        return this.loadingComponents.get(componentName); // 正在加载中
      }

      const loadingPromise = importWithRetry().catch(error => {
        console.error('Preload failed:', error);
        this.loadingComponents.delete(componentName);
        throw error;
      });

      this.loadingComponents.set(componentName, loadingPromise);

      try {
        await loadingPromise;
        this.loadingComponents.delete(componentName);
      } catch (error) {
        this.loadingComponents.delete(componentName);
        throw error;
      }
    };

    // 检查是否已加载
    const isLoadedFn = (): boolean => {
      return this.loadedComponents.get(chunkName || 'unknown') || false;
    };

    // 获取加载状态
    const getLoadingStateFn = (): LoadingState => {
      return { ...loadingState };
    };

    // 如果需要预加载，添加到队列
    if (preload && chunkName) {
      this.addToPreloadQueue(chunkName);
    }

    // 包装组件
    const WrappedComponent: ComponentType<P> = (props: P) => {
      const content = (
        <Suspense fallback={fallback}>
          <LazyComponent {...props} />
        </Suspense>
      );

      if (errorBoundary) {
        return (
          <EnhancedErrorBoundary level="component">
            {content}
          </EnhancedErrorBoundary>
        );
      }

      return content;
    };

    return {
      Component: WrappedComponent as LazyExoticComponent<ComponentType<P>>,
      preload: preloadFn,
      isLoaded: isLoadedFn,
      getLoadingState: getLoadingStateFn
    };
  }

  /**
   * 添加到预加载队列
   */
  private addToPreloadQueue(chunkName: string): void {
    if (!this.preloadQueue.includes(chunkName)) {
      this.preloadQueue.push(chunkName);
    }

    // 如果启用了懒加载，开始预加载
    if (enhancedConfigManager.get('features.lazyLoading') && !this.isPreloading) {
      this.startPreloading();
    }
  }

  /**
   * 开始预加载
   */
  private async startPreloading(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return;
    }

    this.isPreloading = true;

    try {
      // 检查网络状态
      const connection = (navigator as any).connection;
      const isSlowConnection = connection && (
        connection.effectiveType === 'slow-2g' ||
        connection.effectiveType === '2g' ||
        connection.saveData
      );

      if (isSlowConnection) {
        console.log('Slow connection detected, skipping preload');
        return;
      }

      // 逐个预加载
      while (this.preloadQueue.length > 0) {
        const chunkName = this.preloadQueue.shift()!;

        try {
          // 这里需要根据实际的组件映射来预加载
          await this.preloadComponent(chunkName);

          // 添加延迟，避免阻塞主线程
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.warn(`Failed to preload component: ${chunkName}`, error);
        }
      }

    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * 预加载指定组件
   */
  private async preloadComponent(chunkName: string): Promise<void> {
    // 这里需要根据实际的组件映射来实现
    // 可以维护一个组件名到导入函数的映射
    console.log(`Preloading component: ${chunkName}`);
  }

  /**
   * 批量预加载组件
   */
  async preloadComponents(chunkNames: string[]): Promise<void> {
    const preloadPromises = chunkNames.map(chunkName =>
      this.preloadComponent(chunkName).catch(error => {
        console.warn(`Failed to preload ${chunkName}:`, error);
      })
    );

    await Promise.allSettled(preloadPromises);
  }

  /**
   * 获取加载统计
   */
  getLoadingStats() {
    return {
      loadedComponents: this.loadedComponents.size,
      loadingComponents: this.loadingComponents.size,
      preloadQueue: this.preloadQueue.length,
      isPreloading: this.isPreloading
    };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.loadedComponents.clear();
    this.loadingComponents.clear();
    this.preloadQueue.length = 0;
    this.isPreloading = false;
  }
}

/**
 * 默认加载组件
 */
const DefaultLoadingComponent: React.FC = () => (
  <div className="lazy-loading-container">
    <div className="lazy-loading-spinner">
      <div className="spinner"></div>
    </div>
    <p className="lazy-loading-text">加载中...</p>

    <style jsx>{`
      .lazy-loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        min-height: 200px;
      }
      
      .lazy-loading-spinner {
        margin-bottom: 16px;
      }
      
      .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #007bff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .lazy-loading-text {
        color: #666;
        font-size: 14px;
        margin: 0;
      }
    `}</style>
  </div>
);

/**
 * 骨架屏加载组件
 */
export const SkeletonLoadingComponent: React.FC<{ lines?: number; height?: string }> = ({
  lines = 3,
  height = '200px'
}) => (
  <div className="skeleton-container" style={{ minHeight: height }}>
    {Array.from({ length: lines }, (_, index) => (
      <div key={index} className="skeleton-line" />
    ))}

    <style jsx>{`
      .skeleton-container {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .skeleton-line {
        height: 16px;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        border-radius: 4px;
      }
      
      .skeleton-line:last-child {
        width: 60%;
      }
      
      @keyframes loading {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
    `}</style>
  </div>
);

/**
 * 懒加载Hook
 */
export function useLazyLoad<P = {}>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  config?: LazyLoadConfig
) {
  const manager = LazyLoadManager.getInstance();
  return React.useMemo(() => manager.createLazyComponent(importFn, config), [importFn, config]);
}

/**
 * 路由级别的懒加载
 */
export function createLazyRoute<P = {}>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  chunkName: string
) {
  return LazyLoadManager.getInstance().createLazyComponent(importFn, {
    chunkName,
    preload: true,
    errorBoundary: true,
    fallback: <SkeletonLoadingComponent height="100vh" lines={5} />
  });
}

// 导出单例实例
export const lazyLoadManager = LazyLoadManager.getInstance();
