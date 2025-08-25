import { createElement, useState } from 'react';

// 浏览器信息接口
interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  platform: string;
}

// 特性支持状态接口
interface FeatureSupport {
  cssGrid: boolean;
  cssVariables: boolean;
  backdropFilter: boolean;
  flexboxGap: boolean;
  containerQueries: boolean;
  cssNesting: boolean;
  cssLayers: boolean;
  cssSubgrid: boolean;
  viewportUnits: boolean;
  stickyPosition: boolean;
  clipPath: boolean;
  cssFilters: boolean;
  cssTransforms3d: boolean;
  cssAnimations: boolean;
  cssTransitions: boolean;
  webpSupport: boolean;
  avifSupport: boolean;
}

export const detectCSSSupport = (): FeatureSupport => {
  const support: FeatureSupport = {
    cssGrid: false,
    cssVariables: false,
    backdropFilter: false,
    flexboxGap: false,
    containerQueries: false,
    cssNesting: false,
    cssLayers: false,
    cssSubgrid: false,
    viewportUnits: false,
    stickyPosition: false,
    clipPath: false,
    cssFilters: false,
    cssTransforms3d: false,
    cssAnimations: false,
    cssTransitions: false,
    webpSupport: false,
    avifSupport: false,
  };

  // 检查CSS.supports是否可用
  if (typeof CSS !== 'undefined' && CSS.supports) {
    try {
      // CSS Grid
      support.cssGrid = CSS.supports('display', 'grid');

      // CSS变量
      support.cssVariables = CSS.supports('color', 'var(--test)');

      // backdrop-filter
      support.backdropFilter = CSS.supports('backdrop-filter', 'blur(1px)') ||
                              CSS.supports('-webkit-backdrop-filter', 'blur(1px)');

      // Flexbox gap
      support.flexboxGap = CSS.supports('gap', '1rem');

      // 容器查询
      support.containerQueries = CSS.supports('container-type', 'inline-size');

      // CSS嵌套
      support.cssNesting = CSS.supports('selector(&)', '&:hover');

      // CSS层叠层
      support.cssLayers = CSS.supports('@layer', 'base');

      // CSS子网格
      support.cssSubgrid = CSS.supports('grid-template-columns', 'subgrid');

      // 视口单位
      support.viewportUnits = CSS.supports('width', '100vw');

      // sticky定位
      support.stickyPosition = CSS.supports('position', 'sticky');

      // clip-path
      support.clipPath = CSS.supports('clip-path', 'circle(50%)');

      // CSS滤镜
      support.cssFilters = CSS.supports('filter', 'blur(1px)');

      // 3D变换
      support.cssTransforms3d = CSS.supports('transform', 'translateZ(0)');

      // CSS动画
      support.cssAnimations = CSS.supports('animation', 'test 1s');

      // CSS过渡
      support.cssTransitions = CSS.supports('transition', 'all 0.3s');

    } catch (error) {
      console.warn('CSS.supports检测失败:', error);
    }
  }

  // 图片格式支持检测（异步）
  detectImageFormats().then(formats => {
    support.webpSupport = formats.webp;
    support.avifSupport = formats.avif;
  });

  return support;
};

const detectImageFormats = async (): Promise<{webp: boolean; avif: boolean}> => {
  const formats = { webp: false, avif: false };

  try {
    // 检测WebP支持
    const webpCanvas = document.createElement('canvas');
    webpCanvas.width = 1;
    webpCanvas.height = 1;
    formats.webp = webpCanvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;

    // 检测AVIF支持
    const avifImage = new Image();
    formats.avif = await new Promise((resolve) => {
      avifImage.onload = () => resolve(true);
      avifImage.onerror = () => resolve(false);
      avifImage.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
    });
  } catch (error) {
    console.warn('图片格式检测失败:', error);
  }

  return formats;
};

export const getBrowserInfo = (): BrowserInfo => {
  const userAgent = navigator.userAgent;
  const browserInfo: BrowserInfo = {
    name: 'Unknown',
    version: 'Unknown',
    engine: 'Unknown',
    platform: navigator.platform || 'Unknown'
  };

  // 检测浏览器名称和版本
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browserInfo.name = 'Chrome';
    browserInfo.engine = 'Blink';
    const match = userAgent.match(/Chrome\/(\d+)/);
    if (match) browserInfo.version = match[1];
  } else if (userAgent.includes('Firefox')) {
    browserInfo.name = 'Firefox';
    browserInfo.engine = 'Gecko';
    const match = userAgent.match(/Firefox\/(\d+)/);
    if (match) browserInfo.version = match[1];
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserInfo.name = 'Safari';
    browserInfo.engine = 'WebKit';
    const match = userAgent.match(/Version\/(\d+)/);
    if (match) browserInfo.version = match[1];
  } else if (userAgent.includes('Edg')) {
    browserInfo.name = 'Edge';
    browserInfo.engine = 'Blink';
    const match = userAgent.match(/Edg\/(\d+)/);
    if (match) browserInfo.version = match[1];
  }

  return browserInfo;
};

export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const getScreenInfo = () => {
  const [error, setError] = useState<string | null>(null);

  return {
    width: window.screen.width,
    height: window.screen.height,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
    pixelRatio: window.devicePixelRatio || 1,
    colorDepth: window.screen.colorDepth,
    orientation: window.screen.orientation?.type || 'unknown'
  };
};

export const generateCompatibilityReport = () => {
  const support = detectCSSSupport();
  const browser = getBrowserInfo();
  const screen = getScreenInfo();

  return {
    timestamp: new Date().toISOString(),
    browser,
    screen,
    mobile: isMobile(),
    touch: isTouchDevice(),
    features: support,
    recommendations: generateRecommendations(support, browser)
  };
};

const generateRecommendations = (support: FeatureSupport, browser: BrowserInfo): string[] => {
  const recommendations: string[] = [];

  if (!support.cssGrid) {
    recommendations.push('建议使用Flexbox作为CSS Grid的降级方案');
  }

  if (!support.cssVariables) {
    recommendations.push('建议使用PostCSS插件转换CSS变量');
  }

  if (!support.backdropFilter) {
    recommendations.push('建议为毛玻璃效果提供降级背景');
  }

  if (!support.flexboxGap) {
    recommendations.push('建议使用margin模拟Flexbox gap属性');
  }

  if (!support.stickyPosition) {
    recommendations.push('建议使用JavaScript实现sticky定位效果');
  }

  if (browser.name === 'Safari' && parseInt(browser.version) < 14) {
    recommendations.push('Safari版本较旧，建议提示用户升级浏览器');
  }

  return recommendations;
};

// 导出全局支持状态
export const browserSupport = detectCSSSupport();
