/**
 * CSRF 漏洞检测器
 * 检测跨站请求伪造防护措施：
 * - 表单是否包含 CSRF token
 * - 是否设置 SameSite Cookie
 * - 是否存在 Origin/Referer 验证
 * - 自定义请求头验证
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface CsrfVulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence?: string;
  remediation: string;
}

export interface CsrfAnalysisResult {
  score: number;
  vulnerabilities: CsrfVulnerability[];
  warnings: string[];
  details: {
    formsAnalyzed: number;
    formsWithToken: number;
    formsWithoutToken: number;
    sameSiteCookieSet: boolean;
    customHeaderRequired: boolean;
  };
}

interface CsrfAnalyzerOptions {
  timeout?: number;
  userAgent?: string;
}

class CsrfAnalyzer {
  private options: Required<CsrfAnalyzerOptions>;

  constructor(options: CsrfAnalyzerOptions = {}) {
    this.options = {
      timeout: options.timeout || 15000,
      userAgent: options.userAgent || 'Security-Scanner/3.0.0',
    };
  }

  async analyze(url: string): Promise<CsrfAnalysisResult> {
    const result: CsrfAnalysisResult = {
      score: 100,
      vulnerabilities: [],
      warnings: [],
      details: {
        formsAnalyzed: 0,
        formsWithToken: 0,
        formsWithoutToken: 0,
        sameSiteCookieSet: false,
        customHeaderRequired: false,
      },
    };

    try {
      const response = await axios.get(url, {
        timeout: this.options.timeout,
        headers: { 'User-Agent': this.options.userAgent },
        maxRedirects: 5,
        validateStatus: (status: number) => status >= 200 && status < 500,
      });

      const body = typeof response.data === 'string' ? response.data : '';
      const headers = response.headers || {};

      // 1. 检查 Set-Cookie 中的 SameSite 属性
      this.checkSameSiteCookie(headers, result);

      // 2. 分析 HTML 表单中的 CSRF token
      if (body) {
        this.analyzeFormTokens(body, result);
      }

      // 3. 检查是否要求自定义请求头（如 X-Requested-With）
      await this.checkCustomHeaderRequirement(url, result);

      // 4. 检查 Origin 验证（通过发送伪造 Origin 的 POST 请求）
      await this.checkOriginValidation(url, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.warnings.push(`CSRF 检测部分失败: ${message}`);
      result.score = Math.max(0, result.score - 10);
    }

    result.score = Math.max(0, result.score);
    return result;
  }

  private checkSameSiteCookie(headers: Record<string, unknown>, result: CsrfAnalysisResult): void {
    const setCookieHeader = headers['set-cookie'];
    if (!setCookieHeader) {
      return;
    }

    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [String(setCookieHeader)];

    let hasSameSite = false;
    for (const cookie of cookies) {
      const cookieStr = String(cookie).toLowerCase();
      if (cookieStr.includes('samesite=strict') || cookieStr.includes('samesite=lax')) {
        hasSameSite = true;
      } else if (cookieStr.includes('samesite=none')) {
        result.vulnerabilities.push({
          type: 'csrf-samesite-none',
          severity: 'medium',
          description: 'Cookie 设置了 SameSite=None，可能允许跨站请求携带凭据',
          evidence: cookie.substring(0, 100),
          remediation: '将 SameSite 属性设置为 Strict 或 Lax',
        });
        result.score -= 15;
      } else if (!cookieStr.includes('samesite')) {
        // 未设置 SameSite（旧浏览器默认 None）
        result.vulnerabilities.push({
          type: 'csrf-samesite-missing',
          severity: 'medium',
          description: 'Cookie 未设置 SameSite 属性，旧浏览器可能默认允许跨站发送',
          evidence: cookie.substring(0, 100),
          remediation: '为所有 Cookie 添加 SameSite=Lax 或 SameSite=Strict 属性',
        });
        result.score -= 10;
      }
    }

    result.details.sameSiteCookieSet = hasSameSite;
  }

  private analyzeFormTokens(html: string, result: CsrfAnalysisResult): void {
    try {
      const $ = cheerio.load(html);
      const forms = $('form');
      result.details.formsAnalyzed = forms.length;

      if (forms.length === 0) {
        return;
      }

      const csrfTokenPatterns = [
        /csrf/i,
        /xsrf/i,
        /token/i,
        /_token/i,
        /authenticity_token/i,
        /anti.?forgery/i,
        /__RequestVerificationToken/i,
      ];

      forms.each((_, form) => {
        const $form = $(form);
        const method = ($form.attr('method') || 'get').toLowerCase();

        // 只检查 POST/PUT/DELETE 表单
        if (method === 'get') return;

        const inputs = $form.find('input[type="hidden"]');
        let hasToken = false;

        inputs.each((__, input) => {
          const name = $(input).attr('name') || '';
          const value = $(input).attr('value') || '';
          if (csrfTokenPatterns.some(p => p.test(name)) && value.length > 0) {
            hasToken = true;
          }
        });

        // 也检查 meta 标签中的 CSRF token
        if (!hasToken) {
          const metaCsrf = $(
            'meta[name="csrf-token"], meta[name="_csrf"], meta[name="csrf_token"]'
          );
          if (metaCsrf.length > 0 && (metaCsrf.attr('content') || '').length > 0) {
            hasToken = true;
          }
        }

        if (hasToken) {
          result.details.formsWithToken++;
        } else {
          result.details.formsWithoutToken++;
        }
      });

      if (result.details.formsWithoutToken > 0) {
        result.vulnerabilities.push({
          type: 'csrf-missing-token',
          severity: 'high',
          description: `发现 ${result.details.formsWithoutToken} 个 POST 表单缺少 CSRF token`,
          remediation: '为所有状态变更表单添加 CSRF token 隐藏字段',
        });
        result.score -= 20;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      result.warnings.push(`表单 CSRF token 分析失败: ${msg}`);
    }
  }

  private async checkCustomHeaderRequirement(
    url: string,
    result: CsrfAnalysisResult
  ): Promise<void> {
    try {
      // 使用 GET 请求检测自定义头验证（避免 POST 产生副作用）
      const withoutHeader = await axios.get(url, {
        timeout: this.options.timeout,
        headers: { 'User-Agent': this.options.userAgent },
        maxRedirects: 0,
        validateStatus: () => true,
      });

      const withHeader = await axios.get(url, {
        timeout: this.options.timeout,
        headers: {
          'User-Agent': this.options.userAgent,
          'X-Requested-With': 'XMLHttpRequest',
        },
        maxRedirects: 0,
        validateStatus: () => true,
      });

      // 如果带自定义头的请求被接受而不带的被拒绝，说明有自定义头验证
      if (
        (withoutHeader.status === 403 || withoutHeader.status === 401) &&
        withHeader.status !== 403 &&
        withHeader.status !== 401
      ) {
        result.details.customHeaderRequired = true;
      }
    } catch {
      // 忽略，不影响评分
    }
  }

  private async checkOriginValidation(url: string, result: CsrfAnalysisResult): Promise<void> {
    try {
      // 使用 GET + 伪造 Origin 检测（避免 POST 产生副作用）
      const response = await axios.get(url, {
        timeout: this.options.timeout,
        headers: {
          'User-Agent': this.options.userAgent,
          Origin: 'https://evil-attacker.com',
          Referer: 'https://evil-attacker.com/attack',
        },
        maxRedirects: 0,
        validateStatus: () => true,
      });

      // 如果伪造 Origin 的请求返回 200，可能缺少 Origin 验证
      if (response.status === 200) {
        result.warnings.push('服务器可能未验证 Origin/Referer 头，建议添加验证');
        result.score -= 5;
      }
    } catch {
      // 忽略
    }
  }
}

export default CsrfAnalyzer;
