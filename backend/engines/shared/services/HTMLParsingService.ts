/**
 * HTML解析服务
 * 统一HTML解析逻辑，消除多个引擎中的重复解析代码
 */

import { ErrorCode, ErrorFactory, ErrorSeverity } from '../errors/ErrorTypes';
import BaseService, { ServiceConfig } from './BaseService';

// HTML解析选项接口
export interface HTMLParsingOptions {
  decodeEntities?: boolean;
  normalizeWhitespace?: boolean;
  xmlMode?: boolean;
  lowerCaseTags?: boolean;
  lowerCaseAttributeNames?: boolean;
  recognizeSelfClosing?: boolean;
  recognizeCDATA?: boolean;
}

// 解析结果接口
export interface ParsedHTML {
  $: any; // Cheerio实例
  title: string;
  description: string;
  keywords: string;
  headings: HeadingInfo[];
  links: LinkInfo[];
  images: ImageInfo[];
  meta: MetaInfo[];
  text: string;
  wordCount: number;
  language: string;
  charset: string;
  viewport: string;
  canonical: string;
  robots: string;
  author: string;
  favicon: string;
  structuredData: StructuredDataInfo[];
}

// 标题信息接口
export interface HeadingInfo {
  level: number;
  text: string;
  id?: string;
  position: number;
}

// 链接信息接口
export interface LinkInfo {
  href: string;
  text: string;
  title?: string;
  rel: string;
  target: string;
  isExternal: boolean;
  isNoFollow: boolean;
  position: number;
}

// 图片信息接口
export interface ImageInfo {
  src: string;
  alt: string;
  title?: string;
  width?: number;
  height?: number;
  isLazy: boolean;
  position: number;
}

// Meta信息接口
export interface MetaInfo {
  name?: string;
  property?: string;
  content: string;
  charset?: string;
  'http-equiv'?: string;
}

// 结构化数据信息接口
export interface StructuredDataInfo {
  type: 'json-ld' | 'microdata' | 'rdfa';
  content: string;
  data?: any;
}

// CSS选择器配置接口
export interface CSSSelectorConfig {
  title: string;
  description: string[];
  keywords: string[];
  headings: string;
  links: string;
  images: string;
  meta: string;
  structuredData: {
    jsonLd: string;
    microdata: string;
    rdfa: string;
  };
}

class HTMLParsingService extends BaseService {
  private cheerio: any;
  private defaultSelectors: CSSSelectorConfig;

  constructor(config?: Partial<ServiceConfig>) {
    const serviceConfig: ServiceConfig = {
      name: 'HTMLParsingService',
      version: '1.0.0',
      timeout: 10000,
      retries: 2,
      dependencies: ['cheerio'],
      logging: {
        enabled: true,
        level: 'info',
      },
      metrics: {
        enabled: true,
        interval: 30000,
      },
      ...config,
    };

    super(serviceConfig);

    this.defaultSelectors = {
      title: 'title',
      description: [
        'meta[name="description"]',
        'meta[property="og:description"]',
        'meta[name="Description"]',
      ],
      keywords: ['meta[name="keywords"]', 'meta[name="Keywords"]'],
      headings: 'h1, h2, h3, h4, h5, h6',
      links: 'a[href]',
      images: 'img',
      meta: 'meta',
      structuredData: {
        jsonLd: 'script[type="application/ld+json"]',
        microdata: '[itemscope]',
        rdfa: '[vocab], [typeof], [property]',
      },
    };
  }

  /**
   * 执行初始化
   */
  protected async performInitialization(): Promise<void> {
    try {
      const cheerioModule = await import('cheerio');
      this.cheerio = cheerioModule.default || cheerioModule;
      this.log('info', 'HTMLParsingService initialized successfully');
    } catch (error) {
      throw ErrorFactory.createSystemError('Failed to initialize cheerio module', {
        code: ErrorCode.DEPENDENCY_FAILED,
        severity: ErrorSeverity.CRITICAL,
        context: { dependency: 'cheerio' },
      });
    }
  }

  /**
   * 执行关闭
   */
  protected async performShutdown(): Promise<void> {
    this.cheerio = undefined;
    this.log('info', 'HTMLParsingService shutdown successfully');
  }

  /**
   * 解析HTML内容
   */
  async parseHTML(html: string, options: HTMLParsingOptions = {}): Promise<ParsedHTML> {
    if (!html || typeof html !== 'string') {
      throw ErrorFactory.createValidationError('HTML content is required and must be a string', [
        {
          field: 'html',
          value: html,
          constraint: 'non-empty string',
          message: 'HTML content must be a non-empty string',
        },
      ]);
    }

    return this.executeWithRetry(async () => {
      const startTime = Date.now();

      try {
        const $ = this.cheerio.load(html, {
          decodeEntities: options.decodeEntities !== false,
          normalizeWhitespace: options.normalizeWhitespace || false,
          xmlMode: options.xmlMode || false,
          lowerCaseTags: options.lowerCaseTags || false,
          lowerCaseAttributeNames: options.lowerCaseAttributeNames || false,
          recognizeSelfClosing: options.recognizeSelfClosing || false,
          recognizeCDATA: options.recognizeCDATA || false,
          ...options,
        });

        const result: ParsedHTML = {
          $,
          title: this.extractTitle($),
          description: this.extractDescription($),
          keywords: this.extractKeywords($),
          headings: this.extractHeadings($),
          links: this.extractLinks($),
          images: this.extractImages($),
          meta: this.extractMeta($),
          text: this.extractText($),
          wordCount: 0,
          language: this.extractLanguage($),
          charset: this.extractCharset($),
          viewport: this.extractViewport($),
          canonical: this.extractCanonical($),
          robots: this.extractRobots($),
          author: this.extractAuthor($),
          favicon: this.extractFavicon($),
          structuredData: this.extractStructuredData($),
        };

        // 计算字数
        result.wordCount = this.countWords(result.text);

        const responseTime = Date.now() - startTime;
        this.recordRequest(true, responseTime);
        this.log('debug', 'HTML parsed successfully', {
          wordCount: result.wordCount,
          headingsCount: result.headings.length,
          linksCount: result.links.length,
          imagesCount: result.images.length,
        });

        return result;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.recordRequest(false, responseTime);

        throw ErrorFactory.createParsingError(
          `Failed to parse HTML: ${error instanceof Error ? error.message : String(error)}`,
          {
            context: { htmlLength: html.length, options },
          }
        );
      }
    });
  }

  /**
   * 提取标题
   */
  private extractTitle($: any): string {
    return $(this.defaultSelectors.title).first().text().trim() || '';
  }

  /**
   * 提取描述
   */
  private extractDescription($: any): string {
    for (const selector of this.defaultSelectors.description) {
      const content = $(selector).first().attr('content') || '';
      if (content) {
        return content.trim();
      }
    }
    return '';
  }

  /**
   * 提取关键词
   */
  private extractKeywords($: any): string {
    for (const selector of this.defaultSelectors.keywords) {
      const content = $(selector).first().attr('content') || '';
      if (content) {
        return content.trim();
      }
    }
    return '';
  }

  /**
   * 提取标题结构
   */
  private extractHeadings($: any): HeadingInfo[] {
    const headings: HeadingInfo[] = [];

    $(this.defaultSelectors.headings).each((index: number, element: any) => {
      const $element = $(element);
      const tagName = element.tagName.toLowerCase();
      const level = parseInt(tagName.charAt(1));

      headings.push({
        level,
        text: $element.text().trim(),
        id: $element.attr('id') || undefined,
        position: index,
      });
    });

    return headings;
  }

  /**
   * 提取链接
   */
  private extractLinks($: any): LinkInfo[] {
    const links: LinkInfo[] = [];

    $(this.defaultSelectors.links).each((index: number, element: any) => {
      const $element = $(element);
      const href = $element.attr('href') || '';
      const text = $element.text().trim();

      if (href) {
        links.push({
          href,
          text,
          title: $element.attr('title') || undefined,
          rel: $element.attr('rel') || '',
          target: $element.attr('target') || '_self',
          isExternal: this.isExternalLink(href),
          isNoFollow: $element.attr('rel')?.includes('nofollow') || false,
          position: index,
        });
      }
    });

    return links;
  }

  /**
   * 提取图片
   */
  private extractImages($: any): ImageInfo[] {
    const images: ImageInfo[] = [];

    $(this.defaultSelectors.images).each((index: number, element: any) => {
      const $element = $(element);
      const src = $element.attr('src') || '';

      if (src) {
        images.push({
          src,
          alt: $element.attr('alt') || '',
          title: $element.attr('title') || undefined,
          width: parseInt($element.attr('width') || '0') || undefined,
          height: parseInt($element.attr('height') || '0') || undefined,
          isLazy:
            $element.attr('loading') === 'lazy' ||
            $element.attr('data-src') !== undefined ||
            $element.hasClass('lazy'),
          position: index,
        });
      }
    });

    return images;
  }

  /**
   * 提取Meta标签
   */
  private extractMeta($: any): MetaInfo[] {
    const meta: MetaInfo[] = [];

    $(this.defaultSelectors.meta).each((_: number, element: any) => {
      const $element = $(element);
      const metaInfo: MetaInfo = {
        content: $element.attr('content') || '',
      };

      // 检查各种可能的属性
      const name = $element.attr('name');
      const property = $element.attr('property');
      const charset = $element.attr('charset');
      const httpEquiv = $element.attr('http-equiv');

      if (name) metaInfo.name = name;
      if (property) metaInfo.property = property;
      if (charset) metaInfo.charset = charset;
      if (httpEquiv) metaInfo['http-equiv'] = httpEquiv;

      meta.push(metaInfo);
    });

    return meta;
  }

  /**
   * 提取纯文本
   */
  private extractText($: any): string {
    return $('body').text() || $.text() || '';
  }

  /**
   * 提取语言
   */
  private extractLanguage($: any): string {
    return $('html').attr('lang') || $('meta[http-equiv="content-language"]').attr('content') || '';
  }

  /**
   * 提取字符集
   */
  private extractCharset($: any): string {
    return (
      $('meta[charset]').attr('charset') ||
      $('meta[http-equiv="content-type"]')
        .attr('content')
        ?.match(/charset=([^;]+)/i)?.[1] ||
      ''
    );
  }

  /**
   * 提取视口设置
   */
  private extractViewport($: any): string {
    return $('meta[name="viewport"]').attr('content') || '';
  }

  /**
   * 提取Canonical URL
   */
  private extractCanonical($: any): string {
    return $('link[rel="canonical"]').attr('href') || '';
  }

  /**
   * 提取Robots设置
   */
  private extractRobots($: any): string {
    return $('meta[name="robots"]').attr('content') || '';
  }

  /**
   * 提取作者
   */
  private extractAuthor($: any): string {
    return $('meta[name="author"]').attr('content') || '';
  }

  /**
   * 提取Favicon
   */
  private extractFavicon($: any): string {
    return $('link[rel="icon"], link[rel="shortcut icon"]').attr('href') || '';
  }

  /**
   * 提取结构化数据
   */
  private extractStructuredData($: any): StructuredDataInfo[] {
    const structuredData: StructuredDataInfo[] = [];

    // JSON-LD
    $(this.defaultSelectors.structuredData.jsonLd).each((_: number, element: any) => {
      const content = $(element).html() || '';
      if (content.trim()) {
        try {
          const data = JSON.parse(content);
          structuredData.push({
            type: 'json-ld',
            content,
            data,
          });
        } catch {
          // 忽略无效的JSON
          structuredData.push({
            type: 'json-ld',
            content,
          });
        }
      }
    });

    // Microdata
    $(this.defaultSelectors.structuredData.microdata).each((_: number, element: any) => {
      const $element = $(element);
      structuredData.push({
        type: 'microdata',
        content: $element.html() || '',
        data: {
          itemType: $element.attr('itemtype'),
          itemScope: $element.attr('itemscope') !== undefined,
        },
      });
    });

    // RDFa
    $(this.defaultSelectors.structuredData.rdfa).each((_: number, element: any) => {
      const $element = $(element);
      structuredData.push({
        type: 'rdfa',
        content: $element.html() || '',
        data: {
          vocab: $element.attr('vocab'),
          typeof: $element.attr('typeof'),
          property: $element.attr('property'),
        },
      });
    });

    return structuredData;
  }

  /**
   * 判断是否为外部链接
   */
  private isExternalLink(href: string): boolean {
    try {
      const url = new URL(href, 'http://example.com');
      return url.protocol !== 'http:' && url.protocol !== 'https:';
    } catch {
      return false;
    }
  }

  /**
   * 计算字数
   */
  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }

  /**
   * 验证HTML内容
   */
  validateHTML(html: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!html) {
      errors.push('HTML content is empty');
      return { isValid: false, errors, warnings };
    }

    // 基本HTML结构检查
    if (!html.includes('<html')) {
      warnings.push('Missing <html> tag');
    }

    if (!html.includes('<head')) {
      warnings.push('Missing <head> tag');
    }

    if (!html.includes('<body')) {
      warnings.push('Missing <body> tag');
    }

    // 检查未闭合的标签（简化检查）
    const openTags = (html.match(/<[^\/][^>]*>/g) || []).length;
    const closeTags = (html.match(/<\/[^>]*>/g) || []).length;

    if (openTags !== closeTags) {
      warnings.push('Possible unclosed tags detected');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 清理HTML内容
   */
  sanitizeHTML(
    html: string,
    options: {
      removeScripts?: boolean;
      removeStyles?: boolean;
      removeComments?: boolean;
      allowedTags?: string[];
    } = {}
  ): string {
    const {
      removeScripts = true,
      removeStyles = true,
      removeComments = true,
      allowedTags = [],
    } = options;

    let sanitized = html;

    if (removeScripts) {
      sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      sanitized = sanitized.replace(/<script[^>]*>/gi, '');
    }

    if (removeStyles) {
      sanitized = sanitized.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      sanitized = sanitized.replace(/<style[^>]*>/gi, '');
    }

    if (removeComments) {
      sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');
    }

    // 如果指定了允许的标签，移除其他标签
    if (allowedTags.length > 0) {
      const allowedPattern = allowedTags.join('|');
      sanitized = sanitized.replace(
        new RegExp(`<(?!\/?(?:${allowedPattern})[^>]*>)[^>]*>`, 'gi'),
        ''
      );
      sanitized = sanitized.replace(new RegExp(`<\/(?!${allowedPattern})[^>]*>`, 'gi'), '');
    }

    return sanitized;
  }

  /**
   * 提取特定选择器的内容
   */
  extractBySelector(
    $: any,
    selector: string
  ): {
    text: string;
    html: string;
    attributes: Record<string, string>;
    count: number;
  } {
    const elements = $(selector);

    return {
      text: elements.text().trim(),
      html: elements.html() || '',
      attributes: elements.length > 0 ? elements[0].attribs || {} : {},
      count: elements.length,
    };
  }

  /**
   * 获取CSS选择器配置
   */
  getSelectors(): CSSSelectorConfig {
    return { ...this.defaultSelectors };
  }

  /**
   * 设置CSS选择器配置
   */
  setSelectors(selectors: Partial<CSSSelectorConfig>): void {
    this.defaultSelectors = { ...this.defaultSelectors, ...selectors };
  }

  /**
   * 重置选择器为默认配置
   */
  resetSelectors(): void {
    this.defaultSelectors = {
      title: 'title',
      description: [
        'meta[name="description"]',
        'meta[property="og:description"]',
        'meta[name="Description"]',
      ],
      keywords: ['meta[name="keywords"]', 'meta[name="Keywords"]'],
      headings: 'h1, h2, h3, h4, h5, h6',
      links: 'a[href]',
      images: 'img',
      meta: 'meta',
      structuredData: {
        jsonLd: 'script[type="application/ld+json"]',
        microdata: '[itemscope]',
        rdfa: '[vocab], [typeof], [property]',
      },
    };
  }
}

export default HTMLParsingService;
