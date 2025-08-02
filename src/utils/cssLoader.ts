/**
 * CSS动态加载工具
 * 用于实现CSS按需加载和性能优化
 */

// 已加载的CSS文件缓存
const loadedCSS = new Set<string>();

/**
 * 动态加载CSS文件
 * @param href CSS文件路径
 * @param id 可选的link元素ID
 * @returns Promise<void>
 */
export const loadCSS = (href: string, id?: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 如果已经加载过，直接返回
    if (loadedCSS.has(href)) {
      resolve();
      return;
    }

    // 检查是否已经存在相同的link元素
    const existingLink = document.querySelector(`link[href="${href}"]`);
    if (existingLink) {
      loadedCSS.add(href);
      resolve();
      return;
    }

    // 创建link元素
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    if (id) {
      link.id = id;
    }

    // 设置加载完成回调
    link.onload = () => {
      loadedCSS.add(href);
      resolve();
    };

    // 设置加载失败回调
    link.onerror = () => {
      reject(new Error(`Failed to load CSS: ${href}`));
    };

    // 添加到head中
    document.head.appendChild(link);
  });
};

/**
 * 预加载CSS文件（不阻塞渲染）
 * @param href CSS文件路径
 */
export const preloadCSS = (href: string): void => {
  // 如果已经加载过，直接返回
  if (loadedCSS.has(href)) {
    return;
  }

  // 检查是否已经存在相同的preload元素
  const existingPreload = document.querySelector(`link[href="${href}"][rel="preload"]`);
  if (existingPreload) {
    return;
  }

  // 创建preload link元素
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'style';
  link.href = href;

  // 预加载完成后转换为stylesheet
  link.onload = () => {
    link.rel = 'stylesheet';
    loadedCSS.add(href);
  };

  document.head.appendChild(link);
};

/**
 * 页面特定CSS映射
 */
const pageCSS: Record<string, string[]> = {
  // 注意：所有页面特定CSS已迁移到组件库
  // 保留映射结构以防需要动态加载特定样式
};

/**
 * 加载页面特定的CSS
 * @param pageName 页面名称
 * @returns Promise<void>
 */
export const loadPageCSS = async (pageName: string): Promise<void> => {
  const cssFiles = pageCSS[pageName];
  if (!cssFiles || cssFiles.length === 0) {
    return;
  }

  try {
    await Promise.all(cssFiles.map(href => loadCSS(href)));
  } catch (error) {
    console.warn(`Failed to load CSS for page: ${pageName}`, error);
  }
};

/**
 * 预加载页面特定的CSS
 * @param pageName 页面名称
 */
export const preloadPageCSS = (pageName: string): void => {
  const cssFiles = pageCSS[pageName];
  if (!cssFiles || cssFiles.length === 0) {
    return;
  }

  cssFiles.forEach(href => preloadCSS(href));
};

/**
 * 组件特定CSS映射
 */
const componentCSS: Record<string, string> = {
  // 注意：所有组件特定CSS已迁移到组件库
  // 保留映射结构以防需要动态加载特定样式
};

/**
 * 加载组件特定的CSS
 * @param componentName 组件名称
 * @returns Promise<void>
 */
export const loadComponentCSS = async (componentName: string): Promise<void> => {
  const cssFile = componentCSS[componentName];
  if (!cssFile) {
    return;
  }

  try {
    await loadCSS(cssFile);
  } catch (error) {
    console.warn(`Failed to load CSS for component: ${componentName}`, error);
  }
};

/**
 * 卸载CSS文件
 * @param href CSS文件路径
 */
export const unloadCSS = (href: string): void => {
  const link = document.querySelector(`link[href="${href}"]`);
  if (link) {
    document.head.removeChild(link);
    loadedCSS.delete(href);
  }
};

/**
 * 获取已加载的CSS文件列表
 * @returns string[]
 */
export const getLoadedCSS = (): string[] => {
  return Array.from(loadedCSS);
};

/**
 * 清理所有动态加载的CSS
 */
export const clearDynamicCSS = (): void => {
  loadedCSS.forEach(href => {
    const link = document.querySelector(`link[href="${href}"]`);
    if (link) {
      document.head.removeChild(link);
    }
  });
  loadedCSS.clear();
};

/**
 * CSS加载性能监控
 */
export const cssLoadingMetrics = {
  startTime: 0,
  endTime: 0,
  loadedFiles: 0,
  failedFiles: 0,

  start() {
    this.startTime = performance.now();
    this.loadedFiles = 0;
    this.failedFiles = 0;
  },

  recordSuccess() {
    this.loadedFiles++;
  },

  recordFailure() {
    this.failedFiles++;
  },

  end() {
    this.endTime = performance.now();
    return {
      duration: this.endTime - this.startTime,
      loadedFiles: this.loadedFiles,
      failedFiles: this.failedFiles,
      successRate: this.loadedFiles / (this.loadedFiles + this.failedFiles) * 100
    };
  }
};
