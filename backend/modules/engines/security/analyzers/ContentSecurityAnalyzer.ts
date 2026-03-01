/**
 * 内容安全分析器
 * 包含以下检测能力：
 * - 子资源完整性 (SRI) 检测
 * - 混合内容检测 (HTTPS 页面加载 HTTP 资源)
 * - HTTP 危险方法检测 (TRACE/PUT/DELETE 等)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { Agent as HttpsAgent } from 'https';

// ─── SRI 检测 ───

export interface SriIssue {
  element: string;
  src: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface SriCheckResult {
  score: number;
  totalExternalResources: number;
  resourcesWithSri: number;
  resourcesWithoutSri: number;
  issues: SriIssue[];
  warnings: string[];
}

// ─── 混合内容检测 ───

export interface MixedContentIssue {
  element: string;
  src: string;
  type: 'active' | 'passive';
  severity: 'medium' | 'high';
  description: string;
}

export interface MixedContentResult {
  score: number;
  isHttps: boolean;
  totalMixedContent: number;
  activeMixedContent: number;
  passiveMixedContent: number;
  issues: MixedContentIssue[];
  warnings: string[];
}

// ─── HTTP 方法检测 ───

export interface HttpMethodIssue {
  method: string;
  statusCode: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface HttpMethodResult {
  score: number;
  allowedMethods: string[];
  dangerousMethods: string[];
  issues: HttpMethodIssue[];
  warnings: string[];
}

// ─── 统一结果 ───

export interface ContentSecurityResult {
  sri: SriCheckResult;
  mixedContent: MixedContentResult;
  httpMethods: HttpMethodResult;
}

interface ContentSecurityOptions {
  timeout?: number;
  userAgent?: string;
}

class ContentSecurityAnalyzer {
  private options: Required<ContentSecurityOptions>;

  constructor(options: ContentSecurityOptions = {}) {
    this.options = {
      timeout: options.timeout || 15000,
      userAgent: options.userAgent || 'Security-Scanner/3.0.0',
    };
  }

  async analyze(url: string): Promise<ContentSecurityResult> {
    let html = '';
    try {
      const response = await axios.get(url, {
        timeout: this.options.timeout,
        headers: { 'User-Agent': this.options.userAgent },
        maxRedirects: 5,
        validateStatus: (status: number) => status >= 200 && status < 500,
      });
      html = typeof response.data === 'string' ? response.data : '';
    } catch {
      // 获取 HTML 失败，各子检测会返回空结果
    }

    const [sri, mixedContent, httpMethods] = await Promise.all([
      this.checkSri(html, url),
      this.checkMixedContent(html, url),
      this.checkHttpMethods(url),
    ]);

    return { sri, mixedContent, httpMethods };
  }

  // ─── SRI 检测 ───

  private async checkSri(html: string, _url: string): Promise<SriCheckResult> {
    const result: SriCheckResult = {
      score: 100,
      totalExternalResources: 0,
      resourcesWithSri: 0,
      resourcesWithoutSri: 0,
      issues: [],
      warnings: [],
    };

    if (!html) {
      result.warnings.push('未获取到 HTML 内容，无法检测 SRI');
      return result;
    }

    try {
      const $ = cheerio.load(html);

      // 检查外部 script 标签
      $('script[src]').each((_, el) => {
        const src = $(el).attr('src') || '';
        if (!this.isExternalResource(src)) return;

        result.totalExternalResources++;
        const integrity = $(el).attr('integrity');
        if (integrity) {
          result.resourcesWithSri++;
        } else {
          result.resourcesWithoutSri++;
          result.issues.push({
            element: 'script',
            src: src.substring(0, 200),
            severity: 'high',
            description: `外部脚本缺少 integrity 属性: ${src.substring(0, 100)}`,
          });
          result.score -= 10;
        }
      });

      // 检查外部 link[rel=stylesheet] 标签
      $('link[rel="stylesheet"][href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (!this.isExternalResource(href)) return;

        result.totalExternalResources++;
        const integrity = $(el).attr('integrity');
        if (integrity) {
          result.resourcesWithSri++;
        } else {
          result.resourcesWithoutSri++;
          result.issues.push({
            element: 'link',
            src: href.substring(0, 200),
            severity: 'medium',
            description: `外部样式表缺少 integrity 属性: ${href.substring(0, 100)}`,
          });
          result.score -= 5;
        }
      });

      // 如果没有外部资源，满分
      if (result.totalExternalResources === 0) {
        result.score = 100;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      result.warnings.push(`SRI 检测失败: ${msg}`);
    }

    result.score = Math.max(0, result.score);
    return result;
  }

  private isExternalResource(src: string): boolean {
    if (!src) return false;
    // 以 // 或 http:// 或 https:// 开头，且不是同域
    return /^(https?:)?\/\//.test(src);
  }

  // ─── 混合内容检测 ───

  private async checkMixedContent(html: string, url: string): Promise<MixedContentResult> {
    const result: MixedContentResult = {
      score: 100,
      isHttps: url.startsWith('https://'),
      totalMixedContent: 0,
      activeMixedContent: 0,
      passiveMixedContent: 0,
      issues: [],
      warnings: [],
    };

    if (!result.isHttps) {
      result.warnings.push('站点未使用 HTTPS，混合内容检测不适用');
      return result;
    }

    if (!html) {
      result.warnings.push('未获取到 HTML 内容，无法检测混合内容');
      return result;
    }

    try {
      const $ = cheerio.load(html);

      // 活跃混合内容（高风险）：script, link[stylesheet], iframe, object, embed, form[action]
      const activeSelectors = [
        { selector: 'script[src]', attr: 'src', element: 'script' },
        { selector: 'link[rel="stylesheet"][href]', attr: 'href', element: 'stylesheet' },
        { selector: 'iframe[src]', attr: 'src', element: 'iframe' },
        { selector: 'object[data]', attr: 'data', element: 'object' },
        { selector: 'embed[src]', attr: 'src', element: 'embed' },
      ];

      for (const { selector, attr, element } of activeSelectors) {
        $(selector).each((_, el) => {
          const src = $(el).attr(attr) || '';
          if (src.startsWith('http://')) {
            result.activeMixedContent++;
            result.totalMixedContent++;
            result.issues.push({
              element,
              src: src.substring(0, 200),
              type: 'active',
              severity: 'high',
              description: `活跃混合内容: HTTPS 页面通过 HTTP 加载 ${element} (${src.substring(0, 80)})`,
            });
            result.score -= 15;
          }
        });
      }

      // 被动混合内容（中风险）：img, audio, video
      const passiveSelectors = [
        { selector: 'img[src]', attr: 'src', element: 'image' },
        { selector: 'audio[src]', attr: 'src', element: 'audio' },
        { selector: 'video[src]', attr: 'src', element: 'video' },
        { selector: 'source[src]', attr: 'src', element: 'source' },
      ];

      for (const { selector, attr, element } of passiveSelectors) {
        $(selector).each((_, el) => {
          const src = $(el).attr(attr) || '';
          if (src.startsWith('http://')) {
            result.passiveMixedContent++;
            result.totalMixedContent++;
            result.issues.push({
              element,
              src: src.substring(0, 200),
              type: 'passive',
              severity: 'medium',
              description: `被动混合内容: HTTPS 页面通过 HTTP 加载 ${element} (${src.substring(0, 80)})`,
            });
            result.score -= 5;
          }
        });
      }

      // 检查 form action
      $('form[action]').each((_, el) => {
        const action = $(el).attr('action') || '';
        if (action.startsWith('http://')) {
          result.activeMixedContent++;
          result.totalMixedContent++;
          result.issues.push({
            element: 'form',
            src: action.substring(0, 200),
            type: 'active',
            severity: 'high',
            description: `表单提交到 HTTP 地址: ${action.substring(0, 80)}`,
          });
          result.score -= 15;
        }
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      result.warnings.push(`混合内容检测失败: ${msg}`);
    }

    result.score = Math.max(0, result.score);
    return result;
  }

  // ─── HTTP 危险方法检测 ───

  private async checkHttpMethods(url: string): Promise<HttpMethodResult> {
    const result: HttpMethodResult = {
      score: 100,
      allowedMethods: [],
      dangerousMethods: [],
      issues: [],
      warnings: [],
    };

    // 先尝试 OPTIONS 获取 Allow 头
    try {
      const optionsResponse = await axios.request({
        method: 'OPTIONS',
        url,
        timeout: this.options.timeout,
        headers: { 'User-Agent': this.options.userAgent },
        validateStatus: () => true,
        httpsAgent: new HttpsAgent({ rejectUnauthorized: false }),
      });

      const allow = optionsResponse.headers['allow'];
      if (allow) {
        result.allowedMethods = allow.split(',').map((m: string) => m.trim().toUpperCase());
      }
    } catch {
      // OPTIONS 不可用，逐个测试
    }

    // 测试危险方法
    const dangerousMethodsToTest = ['TRACE', 'PUT', 'DELETE', 'CONNECT'];

    for (const method of dangerousMethodsToTest) {
      // 如果 OPTIONS 已返回 Allow 列表，检查是否包含
      if (result.allowedMethods.length > 0 && !result.allowedMethods.includes(method)) {
        continue;
      }

      try {
        const response = await axios.request({
          method,
          url,
          timeout: Math.min(this.options.timeout, 5000),
          headers: { 'User-Agent': this.options.userAgent },
          validateStatus: () => true,
          httpsAgent: new HttpsAgent({ rejectUnauthorized: false }),
          // 不发送 body
          data: undefined,
        });

        // 405 Method Not Allowed 是正确行为
        if (response.status !== 405 && response.status !== 501 && response.status < 500) {
          result.dangerousMethods.push(method);

          const severity = method === 'TRACE' ? 'high' : 'medium';
          const description =
            method === 'TRACE'
              ? 'TRACE 方法已启用，可能被用于跨站追踪 (XST) 攻击窃取凭据'
              : `${method} 方法已启用 (HTTP ${response.status})，可能允许未授权的数据修改`;

          result.issues.push({
            method,
            statusCode: response.status,
            severity,
            description,
          });
          result.score -= severity === 'high' ? 15 : 8;
        }
      } catch {
        // 连接失败视为方法不可用
      }
    }

    result.score = Math.max(0, result.score);
    return result;
  }
}

export default ContentSecurityAnalyzer;
