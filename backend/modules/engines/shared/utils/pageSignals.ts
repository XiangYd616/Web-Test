/**
 * 公共页面信号提取工具
 * 消除 SEO / Compatibility 引擎中对 viewport、charset、lang、h1 等基础 HTML 信号的重复提取。
 */

import type { CheerioAPI } from 'cheerio';

export interface PageMetaSignals {
  hasViewport: boolean;
  viewportContent: string;
  hasH1: boolean;
  hasCharset: boolean;
  charsetValue: string;
  hasLang: boolean;
  langValue: string;
}

export interface PageResourceSignals {
  hasPicture: boolean;
  hasModuleScript: boolean;
  hasNoModule: boolean;
  hasWebp: boolean;
  hasAvif: boolean;
  hasLazyLoading: boolean;
}

export interface PageCssSignals {
  usesGrid: boolean;
  usesFlexbox: boolean;
  usesCustomProperties: boolean;
  usesContainerQueries: boolean;
  vendorPrefixes: string[];
  usesCalc: boolean;
  usesClamp: boolean;
  usesHas: boolean;
  usesNesting: boolean;
}

export interface PageFontSignals {
  formats: string[];
  hasWoff2: boolean;
  hasWoff: boolean;
  hasTtf: boolean;
  hasEot: boolean;
  fontFaceCount: number;
}

export interface PageMediaSignals {
  videoSources: string[];
  audioSources: string[];
  hasVideoFallback: boolean;
  hasAudioFallback: boolean;
}

export interface PagePolyfillSignals {
  hasPolyfillHint: boolean;
}

export interface PageSignalsResult {
  meta: PageMetaSignals;
  resources: PageResourceSignals;
  css: PageCssSignals;
  fonts: PageFontSignals;
  media: PageMediaSignals;
  polyfill: PagePolyfillSignals;
  requiredFeatures: string[];
  issues: string[];
}

/**
 * 从 Cheerio 实例中提取页面基础信号。
 * SEO 和 Compatibility 引擎共享此函数，避免重复的 cheerio 查询逻辑。
 */
export function extractPageSignals($: CheerioAPI): PageSignalsResult {
  const viewportEl = $('meta[name="viewport"]');
  const hasViewport = viewportEl.length > 0;
  const viewportContent = viewportEl.attr?.('content') ?? '';

  const hasH1 = $('h1').length > 0;

  const charsetEl = $('meta[charset]');
  const hasCharset = charsetEl.length > 0;
  const charsetValue = charsetEl.attr?.('charset') ?? '';

  const langValue = $('html').attr?.('lang') ?? '';
  const hasLang = langValue.length > 0;

  const hasPicture = $('picture, img[srcset]').length > 0;
  const hasModuleScript = $('script[type="module"]').length > 0;
  const hasNoModule = $('script[nomodule]').length > 0;
  const hasWebp = $('img[src$=".webp"], source[type="image/webp"]').length > 0;
  const hasAvif = $('img[src$=".avif"], source[type="image/avif"]').length > 0;
  const hasLazyLoading = $('img[loading="lazy"]').length > 0;
  const hasPolyfillHint = $('script[src*="polyfill"], script[src*="core-js"]').length > 0;

  // ── CSS 特性检测 ──
  const allCss = collectInlineCss($);
  const usesGrid = /display\s*:\s*grid|grid-template/i.test(allCss);
  const usesFlexbox = /display\s*:\s*flex|flex-direction|flex-wrap/i.test(allCss);
  const usesCustomProperties =
    /--[a-zA-Z][\w-]*\s*:/i.test(allCss) || /var\s*\(\s*--/i.test(allCss);
  const usesContainerQueries = /@container\b/i.test(allCss);
  const usesCalc = /calc\s*\(/i.test(allCss);
  const usesClamp = /clamp\s*\(/i.test(allCss);
  const usesHas = /:has\s*\(/i.test(allCss);
  const usesNesting = /&\s*[{.#:[>~+]/i.test(allCss);

  const vendorPrefixSet = new Set<string>();
  const prefixMatches = allCss.match(/-(?:webkit|moz|ms|o)-[a-zA-Z-]+/g);
  if (prefixMatches) {
    for (const p of prefixMatches) {
      const prefix = p.match(/^-(webkit|moz|ms|o)-/)?.[1];
      if (prefix) vendorPrefixSet.add(prefix);
    }
  }

  // ── 字体格式检测 ──
  const fontFormats = new Set<string>();
  let fontFaceCount = 0;
  const fontFaceBlocks = allCss.match(/@font-face\s*\{[^}]*\}/gi) || [];
  fontFaceCount = fontFaceBlocks.length;
  for (const block of fontFaceBlocks) {
    if (/\.woff2|format\(['"]?woff2/i.test(block)) fontFormats.add('woff2');
    if (/\.woff(?!2)|format\(['"]?woff['"]?\)/i.test(block)) fontFormats.add('woff');
    if (/\.ttf|format\(['"]?truetype/i.test(block)) fontFormats.add('ttf');
    if (/\.otf|format\(['"]?opentype/i.test(block)) fontFormats.add('otf');
    if (/\.eot|format\(['"]?embedded-opentype/i.test(block)) fontFormats.add('eot');
  }
  // 也检查 <link> 引用的字体文件
  $('link[rel="stylesheet"], link[rel="preload"][as="font"]').each((_, el) => {
    const href = $(el).attr?.('href') ?? '';
    if (/\.woff2/i.test(href)) fontFormats.add('woff2');
    if (/\.woff(?!2)/i.test(href)) fontFormats.add('woff');
    if (/\.ttf/i.test(href)) fontFormats.add('ttf');
    if (/\.eot/i.test(href)) fontFormats.add('eot');
  });

  // ── 媒体格式检测 ──
  const videoSources = new Set<string>();
  const audioSources = new Set<string>();
  $('video source').each((_, el) => {
    const type = $(el).attr?.('type') ?? '';
    if (type) videoSources.add(type);
  });
  $('video[src]').each((_, el) => {
    const src = $(el).attr?.('src') ?? '';
    if (/\.mp4/i.test(src)) videoSources.add('video/mp4');
    if (/\.webm/i.test(src)) videoSources.add('video/webm');
    if (/\.ogv|ogg/i.test(src)) videoSources.add('video/ogg');
  });
  $('audio source').each((_, el) => {
    const type = $(el).attr?.('type') ?? '';
    if (type) audioSources.add(type);
  });
  $('audio[src]').each((_, el) => {
    const src = $(el).attr?.('src') ?? '';
    if (/\.mp3/i.test(src)) audioSources.add('audio/mpeg');
    if (/\.ogg/i.test(src)) audioSources.add('audio/ogg');
    if (/\.wav/i.test(src)) audioSources.add('audio/wav');
  });
  const hasVideoFallback = $('video').length > 0 && $('video source').length >= 2;
  const hasAudioFallback = $('audio').length > 0 && $('audio source').length >= 2;

  // ── Issues ──
  const issues: string[] = [];
  if (!hasViewport) issues.push('缺少viewport meta标签');
  if (!hasH1) issues.push('缺少H1标题');
  if (!hasCharset) issues.push('缺少charset声明');
  if (!hasLang) issues.push('html缺少lang属性');
  if (hasModuleScript && !hasNoModule) {
    issues.push('使用ES模块但缺少nomodule兜底脚本');
  }

  // ── Required Features ──
  const requiredFeatures: string[] = [];
  if (hasModuleScript) requiredFeatures.push('es6module');
  if (hasPicture) requiredFeatures.push('responsiveImages');
  if (hasWebp) requiredFeatures.push('webp');
  if (hasAvif) requiredFeatures.push('avif');
  if (hasLazyLoading) requiredFeatures.push('lazyloading');
  if (usesGrid) requiredFeatures.push('cssGrid');
  if (usesFlexbox) requiredFeatures.push('flexbox');
  if (usesCustomProperties) requiredFeatures.push('cssVariables');
  if (usesContainerQueries) requiredFeatures.push('containerQueries');
  if (usesHas) requiredFeatures.push('cssHas');
  if (usesNesting) requiredFeatures.push('cssNesting');

  const css: PageCssSignals = {
    usesGrid,
    usesFlexbox,
    usesCustomProperties,
    usesContainerQueries,
    vendorPrefixes: Array.from(vendorPrefixSet),
    usesCalc,
    usesClamp,
    usesHas,
    usesNesting,
  };

  const fonts: PageFontSignals = {
    formats: Array.from(fontFormats),
    hasWoff2: fontFormats.has('woff2'),
    hasWoff: fontFormats.has('woff'),
    hasTtf: fontFormats.has('ttf'),
    hasEot: fontFormats.has('eot'),
    fontFaceCount,
  };

  const media: PageMediaSignals = {
    videoSources: Array.from(videoSources),
    audioSources: Array.from(audioSources),
    hasVideoFallback,
    hasAudioFallback,
  };

  return {
    meta: { hasViewport, viewportContent, hasH1, hasCharset, charsetValue, hasLang, langValue },
    resources: { hasPicture, hasModuleScript, hasNoModule, hasWebp, hasAvif, hasLazyLoading },
    css,
    fonts,
    media,
    polyfill: { hasPolyfillHint },
    requiredFeatures,
    issues,
  };
}

/**
 * 收集页面内所有内联 <style> 标签和元素 style 属性中的 CSS 文本。
 */
function collectInlineCss($: CheerioAPI): string {
  const parts: string[] = [];
  $('style').each((_, el) => {
    parts.push($(el).text() || '');
  });
  $('[style]').each((_, el) => {
    parts.push($(el).attr?.('style') ?? '');
  });
  return parts.join('\n');
}
