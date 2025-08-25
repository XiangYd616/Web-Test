import { createElement } from 'react';

export class ChromeCompatibilityHelper {
  /**
   * 检测是否为Chrome浏览器
   */
  static isChrome(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  }

  /**
   * 检测是否为Edge浏览器
   */
  static isEdge(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Edg/.test(navigator.userAgent);
  }

  /**
   * 检测是否为Safari浏览器
   */
  static isSafari(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
  }

  /**
   * 检测是否为Firefox浏览器
   */
  static isFirefox(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Firefox/.test(navigator.userAgent);
  }

  /**
   * 获取浏览器信息
   */
  static getBrowserInfo() {
    return {
      isChrome: this.isChrome(),
      isEdge: this.isEdge(),
      isSafari: this.isSafari(),
      isFirefox: this.isFirefox(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      vendor: typeof navigator !== 'undefined' ? navigator.vendor : ''
    };
  }

  /**
   * 检测CSS特性支持
   */
  static checkCSSSupport() {
    // 安全检查CSS.supports是否可用
    const supportsCSS = typeof CSS !== 'undefined' && CSS.supports;

    if (!supportsCSS) {
      // 如果CSS.supports不可用，返回默认值
      return {
        backdropFilter: true,
        grid: true,
        flexbox: true,
        customProperties: true,
        transforms: true,
        animations: true,
        filters: true
      };
    }

    return {
      backdropFilter: CSS.supports('backdrop-filter', 'blur(10px)') || CSS.supports('-webkit-backdrop-filter', 'blur(10px)'),
      grid: CSS.supports('display', 'grid'),
      flexbox: CSS.supports('display', 'flex'),
      customProperties: CSS.supports('color', 'var(--test)'),
      transforms: CSS.supports('transform', 'translateX(10px)'),
      animations: CSS.supports('animation', 'test 1s'),
      filters: CSS.supports('filter', 'blur(5px)')
    };
  }

  /**
   * 应用Chrome特定的修复
   */
  static applyChromeCompatibilityFixes() {
    // 检查是否在浏览器环境中
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    if (!this.isChrome()) {
      return;
    }

    // 添加Chrome特定的CSS类
    document.documentElement.classList.add('chrome-browser');

    // 修复backdrop-filter
    this.fixBackdropFilter();

    // 修复Grid布局
    this.fixGridLayout();

    // 修复Flexbox
    this.fixFlexbox();

    // 修复颜色渲染
    this.fixColorRendering();

    console.log('Chrome兼容性修复已应用');
  }

  /**
   * 修复backdrop-filter支持
   */
  private static fixBackdropFilter() {
    const style = document.createElement('style');
    style.textContent = `
      .chrome-browser .backdrop-blur-xl,
      .chrome-browser .backdrop-blur-lg,
      .chrome-browser .backdrop-blur-md,
      .chrome-browser .backdrop-blur-sm {
        -webkit-backdrop-filter: blur(24px) !important;
        backdrop-filter: blur(24px) !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 修复Grid布局
   */
  private static fixGridLayout() {
    const style = document.createElement('style');
    style.textContent = `
      .chrome-browser .grid {
        display: -ms-grid !important;
        display: grid !important;
      }

      .chrome-browser .grid-cols-1 {
        -ms-grid-columns: 1fr !important;
        grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
      }

      .chrome-browser .grid-cols-3 {
        -ms-grid-columns: 1fr 1fr 1fr !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      }

      .chrome-browser .gap-1 {
        gap: 0.25rem !important;
        grid-gap: 0.25rem !important;
      }

      .chrome-browser .gap-2 {
        gap: 0.5rem !important;
        grid-gap: 0.5rem !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 修复Flexbox
   */
  private static fixFlexbox() {
    const style = document.createElement('style');
    style.textContent = `
      .chrome-browser .flex {
        display: -webkit-box !important;
        display: -ms-flexbox !important;
        display: flex !important;
      }

      .chrome-browser .flex-col {
        -webkit-box-orient: vertical !important;
        -webkit-box-direction: normal !important;
        -ms-flex-direction: column !important;
        flex-direction: column !important;
      }

      .chrome-browser .items-center {
        -webkit-box-align: center !important;
        -ms-flex-align: center !important;
        align-items: center !important;
      }

      .chrome-browser .justify-between {
        -webkit-box-pack: justify !important;
        -ms-flex-pack: justify !important;
        justify-content: space-between !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 修复颜色渲染
   */
  private static fixColorRendering() {
    const style = document.createElement('style');
    style.textContent = `
      .chrome-browser .border-green-500 {
        border-color: #10b981 !important;
      }

      .chrome-browser .border-blue-500 {
        border-color: #3b82f6 !important;
      }

      .chrome-browser .border-red-500 {
        border-color: #ef4444 !important;
      }

      .chrome-browser .border-purple-500 {
        border-color: #8b5cf6 !important;
      }

      .chrome-browser .bg-green-50 {
        background-color: rgba(16, 185, 129, 0.1) !important;
      }

      .chrome-browser .bg-blue-50 {
        background-color: rgba(59, 130, 246, 0.1) !important;
      }

      .chrome-browser .bg-red-50 {
        background-color: rgba(239, 68, 68, 0.1) !important;
      }

      .chrome-browser .bg-purple-50 {
        background-color: rgba(139, 92, 246, 0.1) !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 检测并报告兼容性问题
   */
  static detectCompatibilityIssues() {
    const browserInfo = this.getBrowserInfo();
    const cssSupport = this.checkCSSSupport();

    const issues: string[] = [];

    if (browserInfo.isChrome) {
      if (!cssSupport.backdropFilter) {
        issues.push('backdrop-filter不支持');
      }
      if (!cssSupport.grid) {
        issues.push('CSS Grid不支持');
      }
    }

    return {
      browserInfo,
      cssSupport,
      issues,
      needsFixes: issues.length > 0
    };
  }

  /**
   * 初始化兼容性修复
   */
  static initialize() {
    // 检查是否在浏览器环境中
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return { browserInfo: {}, cssSupport: {}, issues: [] as string[], needsFixes: false };
    }

    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.applyChromeCompatibilityFixes();
      });
    } else {
      this.applyChromeCompatibilityFixes();
    }

    // 检测兼容性问题
    const compatibility = this.detectCompatibilityIssues();

    if (compatibility.needsFixes) {
      console.warn('检测到浏览器兼容性问题:', compatibility.issues);
    }

    return compatibility;
  }
}

// 自动初始化
if (typeof window !== 'undefined') {
  ChromeCompatibilityHelper.initialize();
}

export default ChromeCompatibilityHelper;
