// 模块声明文件 - 为缺失的模块提供类型声明

// 声明图片模块
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module '*.webp' {
  const value: string;
  export default value;
}

// 声明CSS模块
declare module '*.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

// 声明JSON模块
declare module '*.json' {
  const value: any;
  export default value;
}

// 声明Web Workers
declare module '*.worker.ts' {
  class WebpackWorker extends Worker {
    constructor();
  }
  export default WebpackWorker;
}

// 声明Service Worker
declare module '*?worker' {
  class WebpackWorker extends Worker {
    constructor();
  }
  export default WebpackWorker;
}

// 声明环境变量类型
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_GOOGLE_PAGESPEED_API_KEY: string;
  readonly VITE_ENABLE_MOCK: string;
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_SENTRY_DSN: string;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 扩展Window接口
declare global {
  interface Window {
    // Google Analytics
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    
    // Service Worker
    workbox?: any;
    
    // 性能监控
    __PERFORMANCE_OBSERVER__?: PerformanceObserver;
    
    // 错误监控
    __ERROR_HANDLER__?: (error: Error) => void;
    
    // 开发工具
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: any;
    __REDUX_DEVTOOLS_EXTENSION__?: any;
  }
}

// 声明第三方库模块（如果没有类型定义）
declare module 'some-library-without-types' {
  export function someFunction(): void;
  export const someConstant: string;
}

// 声明自定义事件类型
declare global {
  interface CustomEventMap {
    'test-completed': CustomEvent<{ testId: string; result: any }>;
    'test-failed': CustomEvent<{ testId: string; error: string }>;
    'performance-update': CustomEvent<{ metrics: any }>;
  }
  
  interface Document {
    addEventListener<K extends keyof CustomEventMap>(
      type: K,
      listener: (this: Document, ev: CustomEventMap[K]) => void
    ): void;
    removeEventListener<K extends keyof CustomEventMap>(
      type: K,
      listener: (this: Document, ev: CustomEventMap[K]) => void
    ): void;
  }
}

export {};
