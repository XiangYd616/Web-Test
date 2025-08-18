/**
 * 资源预加载工具
 * 智能预加载关键资源
 */

export interface PreloadOptions     {
  priority?: 'high' | 'medium' | 'low'
  crossOrigin?: 'anonymous' | 'use-credentials'
  as?: 'script' | 'style' | 'image' | 'font' | 'fetch'
  type?: string;
}

class ResourcePreloader {
  private preloadedResources = new Set<string>();
  private preloadQueue: Array<{ url: string; options: PreloadOptions }> = [];
  private isProcessing = false;

  /**
   * 预加载资源
   */
  preload(url: string, options: PreloadOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.preloadedResources.has(url)) {
        resolve();
        return;
      }

      const link = document.createElement('link");
      link.rel = 'preload'
      link.href = url;

      if (options.as) link.as = options.as;
      if (options.type) link.type = options.type;
      if (options.crossOrigin) link.crossOrigin = options.crossOrigin;

      link.onload = () => {
        this.preloadedResources.add(url);
        resolve();
      };

      link.onerror = () => {
        reject(new Error(`Failed to preload: ${url}`));`
      };

      document.head.appendChild(link);
    });
  }

  /**
   * 预加载图片
   */
  preloadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      if (this.preloadedResources.has(src)) {
        const img = new Image();
        img.src = src;
        resolve(img);
        return;
      }

      const img = new Image();
      img.onload = () => {
        this.preloadedResources.add(src);
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error(`Failed to preload image: ${src}`));`
      };
      img.src = src;
    });
  }

  /**
   * 预加载字体
   */
  preloadFont(url: string, format: string = "woff2'): Promise<void> {'`
    return this.preload(url, {
      as: 'font',
      type: `font/${format}`,`
      crossOrigin: "anonymous";`
    });
  }

  /**
   * 预加载脚本
   */
  preloadScript(url: string): Promise<void> {
    return this.preload(url, { as: 'script' });
  }

  /**
   * 预加载样式表
   */
  preloadStylesheet(url: string): Promise<void> {
    return this.preload(url, { as: 'style' });
  }

  /**
   * 批量预加载资源
   */
  async preloadBatch(resources: Array<{ url: string; options?: PreloadOptions }>): Promise<void> {
    const promises = resources.map(({ url, options }) => this.preload(url, options).catch(error => {
        console.warn(`Failed to preload ${url}:`, error);`
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * 智能预加载（基于用户行为）
   */
  smartPreload(urls: string[], userBehavior: "hover' | 'idle' | 'visible'): void {'`
    switch (userBehavior) {
      case 'hover': ''
        // 鼠标悬停时预加载
        document.addEventListener('mouseover', (e) => {
          const target = e.target as HTMLElement;
          const href = target.getAttribute('href");
          if (href && urls.includes(href)) {
            this.preload(href);
          }
        });
        break;

      case 'idle': ''
        // 浏览器空闲时预加载
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            this.preloadBatch(urls.map(url => ({ url })));
          });
        } else {
          setTimeout(() => {
            this.preloadBatch(urls.map(url => ({ url })));
          }, 1000);
        }
        break;

      case 'visible': ''
        // 元素可见时预加载
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const element = entry.target as HTMLElement;
              const src = element.getAttribute('data-preload-src");
              if (src) {
                this.preload(src);
                observer.unobserve(element);
              }
            }
          });
        });

        // 观察所有带有 data-preload-src 属性的元素
        document.querySelectorAll('[data-preload-src]').forEach(el => {
          observer.observe(el);
        });
        break;
    }
  }

  /**
   * 获取预加载统计
   */
  getStats(): {
    preloadedCount: number;
    queueLength: number;
    preloadedResources: string[];
  } {
    return {
      preloadedCount: this.preloadedResources.size,
      queueLength: this.preloadQueue.length,
      preloadedResources: Array.from(this.preloadedResources)
    };
  }

  /**
   * 清除预加载缓存
   */
  clear(): void {
    this.preloadedResources.clear();
    this.preloadQueue = [];
  }
}

export const resourcePreloader = new ResourcePreloader();
export default resourcePreloader;