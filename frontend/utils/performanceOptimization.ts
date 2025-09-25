/**
 * 前端性能优化工具集
 * 提供图片懒加载、资源预加载、性能监控等功能
 */

// 图片懒加载观察器
class LazyImageLoader {
    private observer: IntersectionObserver | null = null;
    private images: Set<HTMLImageElement> = new Set();

    constructor() {
        this.initObserver();
    }

    private initObserver() {
        if (!('IntersectionObserver' in window)) {
            // 降级处理：直接加载所有图片
            this.loadAllImages();
            return;
        }

        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const img = entry.target as HTMLImageElement;
                        this.loadImage(img);
                        this.observer?.unobserve(img);
                        this.images.delete(img);
                    }
                });
            },
            {
                rootMargin: '50px 0px', // 提前50px开始加载
                threshold: 0.1
            }
        );
    }

    public observe(img: HTMLImageElement) {
        if (!this.observer) {
            this.loadImage(img);
            return;
        }

        this.images.add(img);
        this.observer.observe(img);
    }

    public unobserve(img: HTMLImageElement) {
        if (this.observer) {
            this.observer.unobserve(img);
        }
        this.images.delete(img);
    }

    private loadImage(img: HTMLImageElement) {
        const src = img.dataset.src;
        const srcset = img.dataset.srcset;

        if (src) {
            img.src = src;
            img.removeAttribute('data-src');
        }

        if (srcset) {
            img.srcset = srcset;
            img.removeAttribute('data-srcset');
        }

        img.classList.remove('lazy-loading');
        img.classList.add('lazy-loaded');
    }

    private loadAllImages() {
        this.images.forEach((img) => {
            this.loadImage(img);
        });
        this.images.clear();
    }

    public destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.images.clear();
    }
}

// 资源预加载管理器
class ResourcePreloader {
    private preloadedResources: Set<string> = new Set();

    /**
     * 预加载关键资源
     */
    public async preloadCriticalResources() {
        // 在开发环境中跳过资源预加载，避免404错误
        if (process.env.NODE_ENV === 'development') {
            return;
        }

        // 生产环境中预加载关键资源
        const criticalResources = [
            { url: '/critical.css', type: 'style' as const },
            { url: '/logo.svg', type: 'image' as const },
            { url: '/hero-bg.webp', type: 'image' as const },
            { url: '/inter-var.woff2', type: 'font' as const }
        ];

        // 并行检查所有资源的存在性
        const resourceChecks = criticalResources.map(async ({ url, type }) => {
            try {
                const exists = await this.checkResourceExists(url);
                if (exists) {
                    this.preloadResourceDirect(url, type);
                } else {
                    console.warn(`Critical resource not found: ${url}`);
                }
            } catch (error) {
                console.warn(`Failed to check resource: ${url}`, error);
            }
        });

        await Promise.allSettled(resourceChecks);
    }



    /**
     * 直接预加载资源（不进行存在性检查）
     */
    private preloadResourceDirect(url: string, type: 'script' | 'style' | 'image' | 'font') {
        if (this.preloadedResources.has(url)) {
            return;
        }

        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = url;

        switch (type) {
            case 'script':
                link.as = 'script';
                break;
            case 'style':
                link.as = 'style';
                break;
            case 'image':
                link.as = 'image';
                break;
            case 'font':
                link.as = 'font';
                link.crossOrigin = 'anonymous';
                break;
        }

        document.head.appendChild(link);
        this.preloadedResources.add(url);
    }

    /**
     * 预加载资源
     */
    public preloadResource(url: string, type: 'script' | 'style' | 'image' | 'font' = 'script') {
        if (this.preloadedResources.has(url)) {
            return;
        }

        // 检查资源是否存在
        this.checkResourceExists(url).then((exists) => {
            if (!exists) {
                console.warn(`Resource not found, skipping preload: ${url}`);
                return;
            }

            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = url;

            switch (type) {
                case 'script':
                    link.as = 'script';
                    break;
                case 'style':
                    link.as = 'style';
                    break;
                case 'image':
                    link.as = 'image';
                    break;
                case 'font':
                    link.as = 'font';
                    link.crossOrigin = 'anonymous';
                    break;
            }

            document.head.appendChild(link);
            this.preloadedResources.add(url);
        });
    }

    /**
     * 检查资源是否存在
     */
    private async checkResourceExists(url: string): Promise<boolean> {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                cache: 'no-cache',
                signal: AbortSignal.timeout(3000) // 3秒超时
            });
            return response.ok;
        } catch (error) {
            // 如果HEAD请求失败，尝试GET请求（某些服务器不支持HEAD）
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    cache: 'no-cache',
                    signal: AbortSignal.timeout(3000)
                });
                return response.ok;
            } catch {
                return false;
            }
        }
    }

    /**
     * 根据URL确定资源类型
     */
    private getResourceType(url: string): 'script' | 'style' | 'image' | 'font' {
        if (url.endsWith('.css')) return 'style';
        if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
        if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return 'image';
        if (url.match(/\.(js|ts)$/)) return 'script';
        return 'script';
    }

    /**
     * 预取下一页面资源
     */
    public prefetchRoute(route: string) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = route;
        document.head.appendChild(link);
    }

    /**
     * DNS预解析
     */
    public preconnectDomain(domain: string) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        document.head.appendChild(link);
    }
}

// 性能监控器
class PerformanceMonitor {
    private metrics: Map<string, number> = new Map();
    private observers: PerformanceObserver[] = [];

    constructor() {
        this.initObservers();
    }

    private initObservers() {
        // 监控导航性能
        if ('PerformanceObserver' in window) {
            try {
                const navObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        if (entry.entryType === 'navigation') {
                            const navEntry = entry as PerformanceNavigationTiming;
                            this.recordNavigationMetrics(navEntry);
                        }
                    });
                });
                navObserver.observe({ entryTypes: ['navigation'] });
                this.observers.push(navObserver);
            } catch (e) {
                console.warn('Navigation timing observer not supported');
            }

            // 监控资源加载性能
            try {
                const resourceObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        if (entry.entryType === 'resource') {
                            this.recordResourceMetrics(entry as PerformanceResourceTiming);
                        }
                    });
                });
                resourceObserver.observe({ entryTypes: ['resource'] });
                this.observers.push(resourceObserver);
            } catch (e) {
                console.warn('Resource timing observer not supported');
            }

            // 监控最大内容绘制 (LCP)
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.metrics.set('LCP', lastEntry.startTime);
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                this.observers.push(lcpObserver);
            } catch (e) {
                console.warn('LCP observer not supported');
            }

            // 监控首次输入延迟 (FID)
            try {
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        this.metrics.set('FID', (entry as any).processingStart - entry.startTime);
                    });
                });
                fidObserver.observe({ entryTypes: ['first-input'] });
                this.observers.push(fidObserver);
            } catch (e) {
                console.warn('FID observer not supported');
            }

            // 监控累积布局偏移 (CLS)
            try {
                let clsValue = 0;
                const clsObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry: any) => {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                            this.metrics.set('CLS', clsValue);
                        }
                    });
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });
                this.observers.push(clsObserver);
            } catch (e) {
                console.warn('CLS observer not supported');
            }
        }
    }

    private recordNavigationMetrics(entry: PerformanceNavigationTiming) {
        // DNS查询时间
        this.metrics.set('DNS', entry.domainLookupEnd - entry.domainLookupStart);

        // TCP连接时间
        this.metrics.set('TCP', entry.connectEnd - entry.connectStart);

        // SSL握手时间
        if (entry.secureConnectionStart > 0) {
            this.metrics.set('SSL', entry.connectEnd - entry.secureConnectionStart);
        }

        // 请求响应时间
        this.metrics.set('Request', entry.responseEnd - entry.requestStart);

        // DOM解析时间
        this.metrics.set('DOMParse', entry.domContentLoadedEventEnd - entry.responseEnd);

        // 资源加载时间
        this.metrics.set('ResourceLoad', entry.loadEventEnd - entry.domContentLoadedEventEnd);

        // 总页面加载时间
        this.metrics.set('PageLoad', entry.loadEventEnd - (entry as any).navigationStart);

        // 首次内容绘制 (FCP)
        const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
        if (fcpEntry) {
            this.metrics.set('FCP', fcpEntry.startTime);
        }
    }

    private recordResourceMetrics(entry: PerformanceResourceTiming) {
        const resourceType = this.getResourceType(entry.name);
        const loadTime = entry.responseEnd - entry.startTime;

        // 记录不同类型资源的加载时间
        const currentMax = this.metrics.get(`${resourceType}Max`) || 0;
        if (loadTime > currentMax) {
            this.metrics.set(`${resourceType}Max`, loadTime);
        }

        // 记录资源大小
        if (entry.transferSize) {
            const currentSize = this.metrics.get(`${resourceType}Size`) || 0;
            this.metrics.set(`${resourceType}Size`, currentSize + entry.transferSize);
        }
    }

    private getResourceType(url: string): string {
        if (url.includes('.css')) return 'CSS';
        if (url.includes('.js')) return 'JS';
        if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return 'Image';
        if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'Font';
        return 'Other';
    }

    /**
     * 获取性能指标
     */
    public getMetrics(): Record<string, number> {
        return Object.fromEntries(this.metrics);
    }

    /**
     * 获取核心Web指标
     */
    public getCoreWebVitals(): { LCP?: number; FID?: number; CLS?: number } {
        return {
            LCP: this.metrics.get('LCP'),
            FID: this.metrics.get('FID'),
            CLS: this.metrics.get('CLS')
        };
    }

    /**
     * 发送性能数据到服务器
     */
    public async sendMetrics() {
        const metrics = this.getMetrics();
        const coreVitals = this.getCoreWebVitals();

        try {
            await fetch('/api/v1/analytics/performance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    metrics,
                    coreVitals,
                    userAgent: navigator.userAgent,
                    timestamp: Date.now(),
                    url: window.location.href
                })
            });
        } catch (error) {
            console.warn('Failed to send performance metrics:', error);
        }
    }

    public destroy() {
        this.observers.forEach((observer) => {
            observer.disconnect();
        });
        this.observers = [];
        this.metrics.clear();
    }
}

// 内存管理器
class MemoryManager {
    private cleanupTasks: (() => void)[] = [];
    private memoryCheckInterval: number | null = null;

    constructor() {
        this.startMemoryMonitoring();
    }

    private startMemoryMonitoring() {
        // 每30秒检查一次内存使用情况
        this.memoryCheckInterval = window.setInterval(() => {
            this.checkMemoryUsage();
        }, 30000);
    }

    private checkMemoryUsage() {
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

            // 如果内存使用超过80%，执行清理
            if (usedPercent > 80) {
                this.performCleanup();
            }
        }
    }

    private performCleanup() {

        // 执行注册的清理任务
        this.cleanupTasks.forEach((task) => {
            try {
                task();
            } catch (error) {
                console.warn('Cleanup task failed:', error);
            }
        });

        // 建议垃圾回收（仅在开发环境）
        if (process.env.NODE_ENV === 'development' && 'gc' in window) {
            (window as any).gc();
        }
    }

    /**
     * 注册清理任务
     */
    public registerCleanupTask(task: () => void) {
        this.cleanupTasks.push(task);
    }

    /**
     * 移除清理任务
     */
    public unregisterCleanupTask(task: () => void) {
        const index = this.cleanupTasks.indexOf(task);
        if (index > -1) {
            this.cleanupTasks.splice(index, 1);
        }
    }

    public destroy() {
        if (this.memoryCheckInterval) {
            clearInterval(this.memoryCheckInterval);
            this.memoryCheckInterval = null;
        }
        this.cleanupTasks = [];
    }
}

// 缓存管理器
class FrontendCacheManager {
    private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
    private maxSize = 100; // 最大缓存项数
    private defaultTTL = 5 * 60 * 1000; // 5分钟

    /**
     * 设置缓存
     */
    public set(key: string, data: any, ttl: number = this.defaultTTL) {
        // 如果缓存已满，删除最旧的项
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    /**
     * 获取缓存
     */
    public get(key: string): any | null {
        const cached = this.cache.get(key);

        if (!cached) {
            return null;
        }

        // 检查是否过期
        if (Date.now() - cached.timestamp > cached.ttl) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    /**
     * 删除缓存
     */
    public delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * 清空缓存
     */
    public clear() {
        this.cache.clear();
    }

    /**
     * 获取缓存统计
     */
    public getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            keys: Array.from(this.cache.keys())
        };
    }
}

// 单例实例
export const lazyImageLoader = new LazyImageLoader();
export const resourcePreloader = new ResourcePreloader();
export const performanceMonitor = new PerformanceMonitor();
export const memoryManager = new MemoryManager();
export const frontendCache = new FrontendCacheManager();

// 初始化性能优化
export function initializePerformanceOptimization() {

    // 只在生产环境中进行资源预加载
    if (process.env.NODE_ENV === 'production') {
        // 延迟预加载关键资源，避免阻塞初始渲染
        setTimeout(() => {
            resourcePreloader.preloadCriticalResources();
        }, 100);

        // 预连接外部域名
        resourcePreloader.preconnectDomain('https://fonts.googleapis.com');
        resourcePreloader.preconnectDomain('https://fonts.gstatic.com');
    } else {
    }

    // 页面加载完成后发送性能指标（仅在生产环境）
    if (process.env.NODE_ENV === 'production') {
        window.addEventListener('load', () => {
            setTimeout(() => {
                performanceMonitor.sendMetrics();
            }, 1000);
        });
    }

    // 页面卸载时清理资源
    window.addEventListener('beforeunload', () => {
        lazyImageLoader.destroy();
        performanceMonitor.destroy();
        memoryManager.destroy();
    });
}

// 工具函数
export const performanceUtils = {
    /**
     * 防抖函数
     */
    debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: NodeJS.Timeout;
        return (...args: Parameters<T>) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    /**
     * 节流函数
     */
    throttle<T extends (...args: any[]) => any>(
        func: T,
        limit: number
    ): (...args: Parameters<T>) => void {
        let inThrottle: boolean;
        return (...args: Parameters<T>) => {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    },

    /**
     * 空闲时执行
     */
    runWhenIdle(callback: () => void, timeout: number = 5000) {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(callback, { timeout });
        } else {
            setTimeout(callback, 1);
        }
    },

    /**
     * 检查是否为慢速网络
     */
    isSlowNetwork(): boolean {
        if ('connection' in navigator) {
            const connection = (navigator as any).connection;
            return connection.effectiveType === 'slow-2g' ||
                connection.effectiveType === '2g' ||
                connection.saveData;
        }
        return false;
    },

    /**
     * 获取设备性能等级
     */
    getDevicePerformanceLevel(): 'high' | 'medium' | 'low' {
        const cores = navigator.hardwareConcurrency || 4;
        const memory = (navigator as any).deviceMemory || 4;

        if (cores >= 8 && memory >= 8) return 'high';
        if (cores >= 4 && memory >= 4) return 'medium';
        return 'low';
    }
};