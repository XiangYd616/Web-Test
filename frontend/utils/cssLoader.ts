
// 已加载的CSS文件缓存
const loadedCSS = new Set<string>();

export const loadCSS = (href: string, id?: string): Promise<void>  => {
  return new Promise((resolve, reject) => {
    // 如果已经加载过，直接返回
    if (loadedCSS.has(href)) {
      resolve();
      return;
    }

    // 检查是否已经存在相同的link元素
    const existingLink = document.querySelector(`link[href= '${href}']`);'`
    if (existingLink) {
      
        loadedCSS.add(href);
      resolve();
      return;
      }

    // 创建link元素
    const link = document.createElement("link");`
    link.rel = 'stylesheet'
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
      reject(new Error(`Failed to load CSS: ${href}`));`
    };

    // 添加到head中
    document.head.appendChild(link);
  });
};

export const preloadCSS = (href: string): void  => {
  // 如果已经加载过，直接返回
  if (loadedCSS.has(href)) {
    return;
  }

  // 检查是否已经存在相同的preload元素
  const existingPreload = document.querySelector(`link[href= '${href}'][rel= 'preload']`);'`
  if (existingPreload) {
    
        return;
      }

  // 创建preload link元素
  const link = document.createElement("link");`
  link.rel = 'preload'
  link.as = 'style'
  link.href = href;

  // 预加载完成后转换为stylesheet
  link.onload = () => {
    link.rel = 'stylesheet'
    loadedCSS.add(href);
  };

  document.head.appendChild(link);
};

const pageCSS: Record<string, string[]>  = {
  // 注意：所有页面特定CSS已迁移到组件库
  // 保留映射结构以防需要动态加载特定样式
};
export const loadPageCSS = async (pageName: string): Promise<void>  => {
  const cssFiles = pageCSS[pageName];
  if (!cssFiles || cssFiles.length === 0) {
    
        return;
      }

  try {
    await Promise.all(cssFiles.map(href => loadCSS(href)));
  } catch (error) {
    console.warn(`Failed to load CSS for page: ${pageName}`, error);`
  }
};

export const preloadPageCSS = (pageName: string): void  => {
  const cssFiles = pageCSS[pageName];
  if (!cssFiles || cssFiles.length === 0) {
    
        return;
      }

  cssFiles.forEach(href => preloadCSS(href));
};

const componentCSS: Record<string, string>  = {
  // 注意：所有组件特定CSS已迁移到组件库
  // 保留映射结构以防需要动态加载特定样式
};
export const loadComponentCSS = async (componentName: string): Promise<void>  => {
  const cssFile = componentCSS[componentName];
  if (!cssFile) {
    
        return;
      }

  try {
    await loadCSS(cssFile);
  } catch (error) {
    console.warn(`Failed to load CSS for component: ${componentName}`, error);`
  }
};

export const unloadCSS = (href: string): void  => {
  const link = document.querySelector(`link[href= '${href}']`);'`
  if (link) {
    document.head.removeChild(link);
    loadedCSS.delete(href);
  }
};

export const getLoadedCSS = (): string[]  => {
  return Array.from(loadedCSS);
};

export const clearDynamicCSS = (): void  => {
  loadedCSS.forEach(href => {
    const link = document.querySelector(`link[href= '${href}']`);'`
    if (link) {
      document.head.removeChild(link);
    }
  });
  loadedCSS.clear();
};

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
