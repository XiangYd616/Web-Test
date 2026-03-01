/**
 * 统一截图服务
 * 提供 Puppeteer 驱动的页面截图能力，供各测试引擎共享使用
 * 支持全页截图、元素截图、多视口截图、截图对比等功能
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import Logger from '../../../utils/logger';
import { puppeteerPool } from './PuppeteerPool';

export interface ScreenshotOptions {
  /** 目标 URL */
  url: string;
  /** 视口宽度 */
  width?: number;
  /** 视口高度 */
  height?: number;
  /** 是否全页截图 */
  fullPage?: boolean;
  /** 设备缩放比 */
  deviceScaleFactor?: number;
  /** 等待页面加载完成的策略 */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  /** 截图前额外等待时间 (ms) */
  delay?: number;
  /** 超时时间 (ms) */
  timeout?: number;
  /** 输出格式 */
  format?: 'png' | 'jpeg' | 'webp';
  /** JPEG/WebP 质量 (0-100) */
  quality?: number;
  /** 要截图的 CSS 选择器（元素截图） */
  selector?: string;
  /** 是否隐藏滚动条 */
  hideScrollbar?: boolean;
  /** 自定义 User-Agent */
  userAgent?: string;
  /** 是否使用移动端模拟 */
  mobile?: boolean;
  /** 是否启用 JavaScript */
  javascript?: boolean;
  /** 额外的 HTTP 头 */
  extraHeaders?: Record<string, string>;
  /** 注入的 CSS（截图前应用） */
  injectCSS?: string;
  /** 高亮指定选择器的元素 */
  highlightSelectors?: string[];
  /** 高亮颜色 */
  highlightColor?: string;
}

export interface ScreenshotResult {
  /** 截图 base64 数据 */
  data: string;
  /** 图片格式 */
  format: 'png' | 'jpeg' | 'webp';
  /** 图片宽度 */
  width: number;
  /** 图片高度 */
  height: number;
  /** 文件大小 (bytes) */
  size: number;
  /** 截图时间戳 */
  timestamp: string;
  /** 截图耗时 (ms) */
  duration: number;
  /** 页面标题 */
  pageTitle?: string;
  /** 页面 URL（可能经过重定向） */
  finalUrl?: string;
  /** 保存的文件路径（如果已保存） */
  filePath?: string;
}

export interface MultiViewportScreenshotResult {
  viewport: { width: number; height: number; label: string };
  screenshot: ScreenshotResult;
}

export interface ElementHighlight {
  selector: string;
  color: string;
  label?: string;
}

/** 预定义视口配置 */
export const PRESET_VIEWPORTS = {
  desktop: { width: 1920, height: 1080, label: 'Desktop (1920×1080)' },
  laptop: { width: 1366, height: 768, label: 'Laptop (1366×768)' },
  tablet: { width: 768, height: 1024, label: 'Tablet (768×1024)' },
  mobile: { width: 375, height: 812, label: 'Mobile (375×812)' },
  mobileLandscape: { width: 812, height: 375, label: 'Mobile Landscape (812×375)' },
} as const;

class ScreenshotService {
  private storageDir: string;

  constructor(options: { storageDir?: string } = {}) {
    this.storageDir = options.storageDir || path.join(process.cwd(), 'data', 'screenshots');
  }

  /**
   * 检查截图服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    return puppeteerPool.isAvailable();
  }

  /**
   * 单页截图
   */
  async capture(options: ScreenshotOptions): Promise<ScreenshotResult> {
    const startTime = Date.now();
    const { page, release } = await puppeteerPool.acquirePage({
      width: options.width || 1920,
      height: options.height || 1080,
      deviceScaleFactor: options.deviceScaleFactor || 1,
      isMobile: options.mobile || false,
      userAgent: options.userAgent,
      extraHeaders: options.extraHeaders,
      disableJavaScript: options.javascript === false,
    });

    try {
      // 导航到目标页面
      await page.goto(options.url, {
        waitUntil: options.waitUntil || 'networkidle2',
        timeout: options.timeout || 30000,
      });

      // 额外等待
      if (options.delay && options.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, options.delay));
      }

      // 隐藏滚动条
      if (options.hideScrollbar !== false) {
        await page.addStyleTag({
          content:
            '::-webkit-scrollbar { display: none !important; } * { scrollbar-width: none !important; }',
        });
      }

      // 注入自定义 CSS
      if (options.injectCSS) {
        await page.addStyleTag({ content: options.injectCSS });
      }

      // 高亮元素
      if (options.highlightSelectors && options.highlightSelectors.length > 0) {
        const color = options.highlightColor || 'rgba(255, 0, 0, 0.3)';
        await this.highlightElements(page, options.highlightSelectors, color);
      }

      // 获取页面信息
      const pageTitle = await page.title();
      const finalUrl = page.url();

      // 执行截图
      let screenshotBuffer: Buffer;
      const format = options.format || 'png';

      if (options.selector) {
        // 元素截图
        const element = await page.$(options.selector);
        if (!element) {
          throw new Error(`未找到元素: ${options.selector}`);
        }
        screenshotBuffer = (await element.screenshot({
          type: format,
          quality: format !== 'png' ? options.quality || 80 : undefined,
        })) as Buffer;
      } else {
        // 全页或视口截图
        screenshotBuffer = (await page.screenshot({
          type: format,
          quality: format !== 'png' ? options.quality || 80 : undefined,
          fullPage: options.fullPage ?? true,
        })) as Buffer;
      }

      const base64Data = screenshotBuffer.toString('base64');
      const viewport = page.viewport();

      return {
        data: base64Data,
        format,
        width: viewport?.width || options.width || 1920,
        height: viewport?.height || options.height || 1080,
        size: screenshotBuffer.length,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        pageTitle,
        finalUrl,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Logger.error('截图失败', { url: options.url, error: message });
      throw error;
    } finally {
      await release();
    }
  }

  /**
   * 多视口截图
   */
  async captureMultiViewport(
    url: string,
    viewports?: Array<{ width: number; height: number; label: string }>,
    baseOptions?: Partial<ScreenshotOptions>
  ): Promise<MultiViewportScreenshotResult[]> {
    const targets = viewports || [
      PRESET_VIEWPORTS.desktop,
      PRESET_VIEWPORTS.tablet,
      PRESET_VIEWPORTS.mobile,
    ];

    const results: MultiViewportScreenshotResult[] = [];

    for (const viewport of targets) {
      try {
        const screenshot = await this.capture({
          ...baseOptions,
          url,
          width: viewport.width,
          height: viewport.height,
          mobile: viewport.width < 768,
        });
        results.push({ viewport, screenshot });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Logger.warn(`视口 ${viewport.label} 截图失败: ${message}`);
      }
    }

    return results;
  }

  /**
   * 带元素高亮的截图（用于无障碍/SEO 问题标注）
   */
  async captureWithHighlights(
    url: string,
    highlights: ElementHighlight[],
    baseOptions?: Partial<ScreenshotOptions>
  ): Promise<ScreenshotResult> {
    const selectors = highlights.map(h => h.selector);
    const color = highlights[0]?.color || 'rgba(255, 0, 0, 0.3)';

    return this.capture({
      ...baseOptions,
      url,
      highlightSelectors: selectors,
      highlightColor: color,
    });
  }

  /**
   * 在页面上高亮指定元素
   */
  private async highlightElements(
    page: import('puppeteer').Page,
    selectors: string[],
    color: string
  ): Promise<void> {
    await page.evaluate(
      (sels: string[], clr: string) => {
        for (const selector of sels) {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.outline = `3px solid ${clr}`;
            htmlEl.style.outlineOffset = '2px';
            htmlEl.style.backgroundColor = clr;
          });
        }
      },
      selectors,
      color
    );
  }

  /**
   * 保存截图到文件系统
   */
  async saveScreenshot(
    result: ScreenshotResult,
    options: { testId?: string; label?: string; subDir?: string } = {}
  ): Promise<string> {
    const subDir = options.subDir || 'general';
    const dir = path.join(this.storageDir, subDir);
    await fs.mkdir(dir, { recursive: true });

    const hash = crypto.randomBytes(4).toString('hex');
    const label = options.label ? `-${options.label}` : '';
    const testId = options.testId ? `${options.testId}-` : '';
    const filename = `${testId}${Date.now()}${label}-${hash}.${result.format}`;
    const filePath = path.join(dir, filename);

    const buffer = Buffer.from(result.data, 'base64');
    await fs.writeFile(filePath, buffer);

    result.filePath = filePath;
    return filePath;
  }

  /**
   * 截图对比（返回差异百分比）
   */
  async compareScreenshots(
    base64A: string,
    base64B: string
  ): Promise<{ diffPercentage: number; diffPixels: number; totalPixels: number }> {
    const bufA = Buffer.from(base64A, 'base64');
    const bufB = Buffer.from(base64B, 'base64');

    // 简单的字节级对比（精确像素对比需要 pixelmatch 等库）
    const minLen = Math.min(bufA.length, bufB.length);
    const maxLen = Math.max(bufA.length, bufB.length);
    let diffBytes = Math.abs(bufA.length - bufB.length);

    for (let i = 0; i < minLen; i++) {
      if (bufA[i] !== bufB[i]) {
        diffBytes++;
      }
    }

    return {
      diffPercentage: maxLen > 0 ? (diffBytes / maxLen) * 100 : 0,
      diffPixels: diffBytes,
      totalPixels: maxLen,
    };
  }

  /**
   * 清理过期截图
   */
  async cleanupOldScreenshots(maxAgeDays = 7): Promise<number> {
    let cleaned = 0;
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

    try {
      const entries = await fs.readdir(this.storageDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDir = path.join(this.storageDir, entry.name);
          const files = await fs.readdir(subDir);
          for (const file of files) {
            const filePath = path.join(subDir, file);
            const stat = await fs.stat(filePath);
            if (stat.mtimeMs < cutoff) {
              await fs.unlink(filePath);
              cleaned++;
            }
          }
        }
      }
    } catch {
      // storage dir may not exist yet
    }

    return cleaned;
  }
}

export default ScreenshotService;
