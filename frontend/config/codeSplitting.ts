/**
 * 代码分割配置
 * 定义代码分割策略和chunk配置
 */

export interface ChunkConfig     {
  name: string;
  test: RegExp | string;
  priority: number;
  chunks: 'all' | 'async' | 'initial
  minSize?: number;
  maxSize?: number;
  cacheGroups?: Record<string, any>;
}

export const chunkConfigs: ChunkConfig[] = [
  // Vendor库分割
  {
    name: 'vendor',
    test: /[\\/]node_modules[\\/]/,
    priority: 10,
    chunks: 'all',
    minSize: 20000,
    maxSize: 244000
  },
  
  // React相关库
  {
    name: 'react-vendor',
    test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
    priority: 20,
    chunks: 'all',
    minSize: 0
  },
  
  // UI库
  {
    name: 'ui-vendor',
    test: /[\\/]node_modules[\\/](@mui|antd|tailwindcss)[\\/]/,
    priority: 15,
    chunks: 'all',
    minSize: 0
  },
  
  // 工具库
  {
    name: 'utils-vendor',
    test: /[\\/]node_modules[\\/](lodash|moment|date-fns|axios)[\\/]/,
    priority: 12,
    chunks: 'all',
    minSize: 0
  },
  
  // 图表库
  {
    name: 'chart-vendor',
    test: /[\\/]node_modules[\\/](chart\.js|recharts|d3)[\\/]/,
    priority: 11,
    chunks: 'async',
    minSize: 0
  },
  
  // 公共组件
  {
    name: 'common',
    test: /[\\/]src[\\/]components[\\/]/,
    priority: 5,
    chunks: 'all',
    minSize: 10000,
    minChunks: 2
  },
  
  // 页面级组件
  {
    name: 'pages',
    test: /[\\/]src[\\/]pages[\\/]/,
    priority: 3,
    chunks: 'async',
    minSize: 20000
  }
];

/**
 * 动态导入配置
 */
export const dynamicImportConfig = {
  // 预加载策略
  preloadStrategy: {
    immediate: ['home', 'dashboard'],
    onHover: ['login', 'register'],
    onIdle: ['settings', 'profile'],
    onDemand: ['admin', 'management']
  },
  
  // 重试配置
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true
  },
  
  // 超时配置
  timeoutConfig: {
    loadTimeout: 10000,
    networkTimeout: 5000
  }
};

/**
 * 获取chunk优先级
 */
export const getChunkPriority = (chunkName: string): number  => {
  const config = chunkConfigs.find(c => c.name === chunkName);
  return config?.priority || 0;
};

/**
 * 检查是否应该分割chunk
 */
export const shouldSplitChunk = (modulePath: string, size: number): boolean  => {
  // 检查模块路径和大小
  if (size < 10000) return false; // 小于10KB不分割
  
  // 检查是否为vendor模块
  if (modulePath.includes('node_modules')) return true;
  // 检查是否为大型组件
  if (size > 50000) return true; // 大于50KB分割
  
  return false;
};

export default chunkConfigs;