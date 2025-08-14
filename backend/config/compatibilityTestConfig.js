/**
 * 兼容性测试配置
 */

// 支持的浏览器配置
const BROWSER_CONFIGS = {
  Chrome: {
    name: 'Chrome',
    engine: 'chromium',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    features: {
      es6: true,
      es2017: true,
      es2020: true,
      webgl: true,
      webgl2: true,
      webrtc: true,
      serviceWorker: true,
      webAssembly: true
    }
  },
  Firefox: {
    name: 'Firefox',
    engine: 'firefox',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    features: {
      es6: true,
      es2017: true,
      es2020: true,
      webgl: true,
      webgl2: true,
      webrtc: true,
      serviceWorker: true,
      webAssembly: true
    }
  },
  Safari: {
    name: 'Safari',
    engine: 'webkit',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    features: {
      es6: true,
      es2017: true,
      es2020: false, // Safari对某些ES2020特性支持有限
      webgl: true,
      webgl2: true,
      webrtc: true,
      serviceWorker: true,
      webAssembly: true
    }
  },
  Edge: {
    name: 'Edge',
    engine: 'chromium',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    features: {
      es6: true,
      es2017: true,
      es2020: true,
      webgl: true,
      webgl2: true,
      webrtc: true,
      serviceWorker: true,
      webAssembly: true
    }
  }
};

// 设备配置
const DEVICE_CONFIGS = {
  desktop: {
    name: '桌面端',
    width: 1920,
    height: 1080,
    userAgent: 'desktop',
    touchSupport: false,
    devicePixelRatio: 1
  },
  tablet: {
    name: '平板端',
    width: 768,
    height: 1024,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    touchSupport: true,
    devicePixelRatio: 2
  },
  mobile: {
    name: '移动端',
    width: 375,
    height: 667,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    touchSupport: true,
    devicePixelRatio: 3
  }
};

// CSS特性兼容性检查配置
const CSS_FEATURES = {
  flexbox: {
    name: 'Flexbox',
    property: 'display',
    value: 'flex',
    importance: 'high',
    fallback: 'float布局'
  },
  grid: {
    name: 'CSS Grid',
    property: 'display',
    value: 'grid',
    importance: 'medium',
    fallback: 'flexbox或float布局'
  },
  customProperties: {
    name: 'CSS变量',
    property: 'color',
    value: 'var(--test)',
    importance: 'medium',
    fallback: '预处理器变量'
  },
  transforms: {
    name: 'CSS变换',
    property: 'transform',
    value: 'translateX(10px)',
    importance: 'medium',
    fallback: '绝对定位'
  },
  animations: {
    name: 'CSS动画',
    property: 'animation',
    value: 'test 1s',
    importance: 'low',
    fallback: 'JavaScript动画'
  },
  filters: {
    name: 'CSS滤镜',
    property: 'filter',
    value: 'blur(5px)',
    importance: 'low',
    fallback: '图片预处理'
  }
};

// JavaScript特性兼容性检查配置
const JS_FEATURES = {
  es6Classes: {
    name: 'ES6类',
    test: 'typeof class {} === "function"',
    importance: 'high',
    fallback: '函数构造器'
  },
  arrowFunctions: {
    name: '箭头函数',
    test: '() => {}',
    importance: 'high',
    fallback: '普通函数'
  },
  asyncAwait: {
    name: 'Async/Await',
    test: 'async function() {}',
    importance: 'high',
    fallback: 'Promise.then()'
  },
  modules: {
    name: 'ES6模块',
    test: '"noModule" in document.createElement("script")',
    importance: 'medium',
    fallback: 'CommonJS或AMD'
  },
  fetch: {
    name: 'Fetch API',
    test: 'typeof fetch !== "undefined"',
    importance: 'high',
    fallback: 'XMLHttpRequest'
  },
  promises: {
    name: 'Promises',
    test: 'typeof Promise !== "undefined"',
    importance: 'high',
    fallback: '回调函数'
  },
  webWorkers: {
    name: 'Web Workers',
    test: 'typeof Worker !== "undefined"',
    importance: 'medium',
    fallback: '主线程处理'
  },
  serviceWorker: {
    name: 'Service Worker',
    test: '"serviceWorker" in navigator',
    importance: 'medium',
    fallback: '应用缓存'
  }
};

// HTML5特性兼容性检查配置
const HTML5_FEATURES = {
  canvas: {
    name: 'Canvas',
    test: '!!document.createElement("canvas").getContext',
    importance: 'medium',
    fallback: 'SVG或图片'
  },
  video: {
    name: 'HTML5视频',
    test: '!!document.createElement("video").canPlayType',
    importance: 'medium',
    fallback: 'Flash播放器'
  },
  audio: {
    name: 'HTML5音频',
    test: '!!document.createElement("audio").canPlayType',
    importance: 'medium',
    fallback: 'Flash播放器'
  },
  localStorage: {
    name: '本地存储',
    test: 'typeof Storage !== "undefined"',
    importance: 'high',
    fallback: 'Cookie存储'
  },
  sessionStorage: {
    name: '会话存储',
    test: 'typeof sessionStorage !== "undefined"',
    importance: 'medium',
    fallback: '内存存储'
  },
  webGL: {
    name: 'WebGL',
    test: 'canvas.getContext("webgl") || canvas.getContext("experimental-webgl")',
    importance: 'low',
    fallback: 'Canvas 2D'
  }
};

const TIMEOUT_CONFIG = {
  pageLoad: 30000,      // 页面加载超时
  navigation: 10000,    // 导航超时
  element: 5000,        // 元素查找超时
  script: 15000,        // 脚本执行超时
  total: 300000         // 总测试超时
};

// 评分权重配置
const SCORING_WEIGHTS = {
  basicFunctionality: 0.35,   // 基本功能 35% (increased)
  modernFeatures: 0.3,        // 现代特性 30% (increased)
  responsiveDesign: 0.2,      // 响应式设计 20%
  performance: 0.15,          // 性能 15%
  // accessibility: 0.1       // Removed - functionality integrated into other categories
};

module.exports = {
  BROWSER_CONFIGS,
  DEVICE_CONFIGS,
  CSS_FEATURES,
  JS_FEATURES,
  HTML5_FEATURES,
  TIMEOUT_CONFIG,
  SCORING_WEIGHTS
};
