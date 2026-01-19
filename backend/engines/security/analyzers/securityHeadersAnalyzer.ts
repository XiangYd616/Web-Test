/**
 * 安全头分析器
 * 检测HTTP安全头配置，包括CSP、HSTS、X-Frame-Options等
 */

import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

interface SecurityHeadersConfig {
  'content-security-policy': string;
  'strict-transport-security': string;
  'x-frame-options': string;
  'x-content-type-options': string;
  'x-xss-protection': string;
  'referrer-policy': string;
  'permissions-policy': string;
  'cross-origin-embedder-policy': string;
  'cross-origin-opener-policy': string;
  'cross-origin-resource-policy': string;
}

interface SecurityHeaderResult {
  header: string;
  present: boolean;
  value?: string;
  valid: boolean;
  issues: string[];
  recommendations: string[];
  score: number;
}

interface SecurityHeadersAnalysisResult {
  url: string;
  timestamp: Date;
  overall: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    headersPresent: number;
    headersMissing: number;
    criticalIssues: number;
  };
  headers: SecurityHeaderResult[];
  recommendations: SecurityHeaderRecommendation[];
  summary: {
    totalHeaders: number;
    secureHeaders: number;
    insecureHeaders: number;
    missingHeaders: string[];
  };
}

interface SecurityHeaderRecommendation {
  priority: 'high' | 'medium' | 'low';
  header: string;
  title: string;
  description: string;
  currentValue?: string;
  suggestedValue?: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

class SecurityHeadersAnalyzer {
  private name: string;
  private timeout: number;
  private securityHeaders: SecurityHeadersConfig;

  constructor() {
    this.name = 'securityHeaders';
    this.timeout = 30000;

    // 重要的安全头
    this.securityHeaders = {
      'content-security-policy': 'Content-Security-Policy',
      'strict-transport-security': 'Strict-Transport-Security',
      'x-frame-options': 'X-Frame-Options',
      'x-content-type-options': 'X-Content-Type-Options',
      'x-xss-protection': 'X-XSS-Protection',
      'referrer-policy': 'Referrer-Policy',
      'permissions-policy': 'Permissions-Policy',
      'cross-origin-embedder-policy': 'Cross-Origin-Embedder-Policy',
      'cross-origin-opener-policy': 'Cross-Origin-Opener-Policy',
      'cross-origin-resource-policy': 'Cross-Origin-Resource-Policy',
    };
  }

  /**
   * 分析安全头
   */
  async analyze(
    url: string,
    options: {
      timeout?: number;
      userAgent?: string;
      followRedirects?: boolean;
      maxRedirects?: number;
    } = {}
  ): Promise<SecurityHeadersAnalysisResult> {
    const {
      timeout = this.timeout,
      userAgent = 'SecurityHeadersAnalyzer/1.0',
      followRedirects = true,
      maxRedirects = 5,
    } = options;

    const timestamp = new Date();

    try {
      // 获取HTTP响应头
      const response = await this.fetchHeaders(url, {
        timeout,
        userAgent,
        followRedirects,
        maxRedirects,
      });

      // 分析每个安全头
      const headers = this.analyzeHeaders(response.headers);

      // 生成建议
      const recommendations = this.generateRecommendations(headers);

      // 计算总体分数
      const overall = this.calculateOverallScore(headers);

      // 生成摘要
      const summary = this.generateSummary(headers);

      return {
        url,
        timestamp,
        overall,
        headers,
        recommendations,
        summary,
      };
    } catch (error) {
      throw new Error(`安全头分析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取HTTP响应头
   */
  private async fetchHeaders(
    url: string,
    options: {
      timeout: number;
      userAgent: string;
      followRedirects: boolean;
      maxRedirects: number;
    }
  ): Promise<{
    statusCode: number;
    headers: Record<string, string>;
    url: string;
  }> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': options.userAgent,
          Accept: '*/*',
          'Accept-Encoding': 'gzip, deflate',
        },
        timeout: options.timeout,
      };

      const req = httpModule.request(requestOptions, res => {
        let redirectCount = 0;
        let finalUrl = url;

        // 处理重定向
        if (
          options.followRedirects &&
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400
        ) {
          const location = res.headers['location'];
          if (location && redirectCount < options.maxRedirects) {
            redirectCount++;
            const redirectUrl = new URL(location, url).toString();

            // 递归处理重定向
            this.fetchHeaders(redirectUrl, options)
              .then(result => resolve(result))
              .catch(reject);
            return;
          }
        }

        // 收集响应头
        const headers: Record<string, string> = {};

        // 转换headers为小写键名
        Object.keys(res.headers).forEach(key => {
          const value = res.headers[key];
          if (typeof value === 'string') {
            headers[key.toLowerCase()] = value;
          } else if (Array.isArray(value)) {
            headers[key.toLowerCase()] = value.join(', ');
          }
        });

        resolve({
          statusCode: res.statusCode || 0,
          headers,
          url: finalUrl,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });

      req.on('error', error => {
        reject(error);
      });

      req.end();
    });
  }

  /**
   * 分析安全头
   */
  private analyzeHeaders(headers: Record<string, string>): SecurityHeaderResult[] {
    const results: SecurityHeaderResult[] = [];

    Object.keys(this.securityHeaders).forEach(headerKey => {
      const headerName = this.securityHeaders[headerKey];
      const headerValue = headers[headerKey.toLowerCase()];
      const present = !!headerValue;

      const result = this.analyzeHeader(headerKey, headerName, headerValue, present);
      results.push(result);
    });

    return results;
  }

  /**
   * 分析单个安全头
   */
  private analyzeHeader(
    headerKey: keyof SecurityHeadersConfig,
    headerName: string,
    headerValue: string | undefined,
    present: boolean
  ): SecurityHeaderResult {
    const result: SecurityHeaderResult = {
      header: headerName,
      present,
      valid: false,
      issues: [],
      recommendations: [],
      score: 0,
    };

    if (headerValue) {
      result.value = headerValue;
    }

    switch (headerKey) {
      case 'content-security-policy':
        this.analyzeCSP(result);
        break;
      case 'strict-transport-security':
        this.analyzeHSTS(result);
        break;
      case 'x-frame-options':
        this.analyzeXFrameOptions(result);
        break;
      case 'x-content-type-options':
        this.analyzeXContentTypeOptions(result);
        break;
      case 'x-xss-protection':
        this.analyzeXXSSProtection(result);
        break;
      case 'referrer-policy':
        this.analyzeReferrerPolicy(result);
        break;
      case 'permissions-policy':
        this.analyzePermissionsPolicy(result);
        break;
      case 'cross-origin-embedder-policy':
        this.analyzeCOEP(result);
        break;
      case 'cross-origin-opener-policy':
        this.analyzeCOOP(result);
        break;
      case 'cross-origin-resource-policy':
        this.analyzeCORP(result);
        break;
    }

    return result;
  }

  /**
   * 分析CSP头
   */
  private analyzeCSP(result: SecurityHeaderResult): void {
    if (!result.present) {
      result.issues.push('缺少Content-Security-Policy头');
      result.recommendations.push('实施内容安全策略来防止XSS攻击');
      result.score = 0;
      return;
    }

    if (!result.value) {
      result.valid = false;
      result.issues.push('CSP头值为空');
      result.score = 0;
      return;
    }

    let score = 100;
    const issues: string[] = [];

    // 检查基本指令
    if (!result.value.includes('default-src')) {
      issues.push('缺少default-src指令');
      score -= 20;
    }

    // 检查unsafe-inline
    if (result.value.includes('unsafe-inline')) {
      issues.push('使用了unsafe-inline，降低安全性');
      score -= 15;
    }

    // 检查unsafe-eval
    if (result.value.includes('unsafe-eval')) {
      issues.push('使用了unsafe-eval，存在安全风险');
      score -= 20;
    }

    // 检查script-src
    if (!result.value.includes('script-src')) {
      issues.push('缺少script-src指令');
      score -= 15;
    }

    // 检查style-src
    if (!result.value.includes('style-src')) {
      issues.push('缺少style-src指令');
      score -= 10;
    }

    result.valid = issues.length === 0;
    result.issues = issues;
    result.score = Math.max(0, score);

    if (issues.length > 0) {
      result.recommendations.push('完善CSP策略，移除unsafe指令');
    }
  }

  /**
   * 分析HSTS头
   */
  private analyzeHSTS(result: SecurityHeaderResult): void {
    if (!result.present) {
      result.issues.push('缺少Strict-Transport-Security头');
      result.recommendations.push('实施HSTS来强制HTTPS连接');
      result.score = 0;
      return;
    }

    if (!result.value) {
      result.valid = false;
      result.issues.push('HSTS头值为空');
      result.score = 0;
      return;
    }

    let score = 100;
    const issues: string[] = [];

    // 检查max-age
    if (!result.value.includes('max-age=')) {
      issues.push('缺少max-age参数');
      score -= 30;
    } else {
      const maxAgeMatch = result.value.match(/max-age=(\d+)/);
      if (maxAgeMatch) {
        const maxAge = parseInt(maxAgeMatch[1]);
        if (maxAge < 31536000) {
          // 少于1年
          issues.push('max-age建议设置为至少1年(31536000秒)');
          score -= 15;
        }
      }
    }

    // 检查includeSubDomains
    if (!result.value.includes('includeSubDomains')) {
      issues.push('建议添加includeSubDomains');
      score -= 10;
    }

    // 检查preload
    if (!result.value.includes('preload')) {
      issues.push('建议添加preload以获得更好保护');
      score -= 5;
    }

    result.valid = issues.length === 0;
    result.issues = issues;
    result.score = Math.max(0, score);

    if (issues.length > 0) {
      result.recommendations.push('完善HSTS配置，增加max-age和includeSubDomains');
    }
  }

  /**
   * 分析X-Frame-Options头
   */
  private analyzeXFrameOptions(result: SecurityHeaderResult): void {
    if (!result.present) {
      result.issues.push('缺少X-Frame-Options头');
      result.recommendations.push('设置X-Frame-Options防止点击劫持');
      result.score = 0;
      return;
    }

    if (!result.value) {
      result.valid = false;
      result.issues.push('X-Frame-Options头值为空');
      result.score = 0;
      return;
    }

    const validValues = ['DENY', 'SAMEORIGIN', 'ALLOW-FROM'];
    const value = result.value.toUpperCase();

    if (!validValues.some(valid => value.includes(valid))) {
      result.valid = false;
      result.issues.push(`无效的X-Frame-Options值: ${result.value}`);
      result.recommendations.push('使用DENY或SAMEORIGIN');
      result.score = 0;
    } else {
      result.valid = true;
      result.score = 100;

      if (value.includes('ALLOW-FROM')) {
        result.issues.push('ALLOW-FROM已废弃，建议使用CSP的frame-ancestors');
        result.score = 80;
        result.recommendations.push('使用CSP的frame-ancestors替代ALLOW-FROM');
      }
    }
  }

  /**
   * 分析X-Content-Type-Options头
   */
  private analyzeXContentTypeOptions(result: SecurityHeaderResult): void {
    if (!result.present) {
      result.issues.push('缺少X-Content-Type-Options头');
      result.recommendations.push('设置X-Content-Type-Options防止MIME嗅探');
      result.score = 0;
      return;
    }

    if (!result.value) {
      result.valid = false;
      result.issues.push('X-Content-Type-Options头值为空');
      result.score = 0;
      return;
    }

    if (result.value.toLowerCase() === 'nosniff') {
      result.valid = true;
      result.score = 100;
    } else {
      result.valid = false;
      result.issues.push(`无效的X-Content-Type-Options值: ${result.value}`);
      result.recommendations.push('设置为nosniff');
      result.score = 0;
    }
  }

  /**
   * 分析X-XSS-Protection头
   */
  private analyzeXXSSProtection(result: SecurityHeaderResult): void {
    if (!result.present) {
      result.issues.push('缺少X-XSS-Protection头');
      result.recommendations.push('设置X-XSS-Protection启用XSS过滤器');
      result.score = 0;
      return;
    }

    if (!result.value) {
      result.valid = false;
      result.issues.push('X-XSS-Protection头值为空');
      result.score = 0;
      return;
    }

    const value = result.value.trim();

    if (value === '1; mode=block') {
      result.valid = true;
      result.score = 100;
    } else if (value === '1') {
      result.valid = true;
      result.issues.push('建议添加mode=block以提供更好保护');
      result.score = 80;
      result.recommendations.push('设置为1; mode=block');
    } else if (value === '0') {
      result.valid = false;
      result.issues.push('X-XSS-Protection被禁用');
      result.recommendations.push('启用XSS保护');
      result.score = 0;
    } else {
      result.valid = false;
      result.issues.push(`无效的X-XSS-Protection值: ${result.value}`);
      result.recommendations.push('设置为1; mode=block');
      result.score = 0;
    }
  }

  /**
   * 分析Referrer-Policy头
   */
  private analyzeReferrerPolicy(result: SecurityHeaderResult): void {
    if (!result.present) {
      result.issues.push('缺少Referrer-Policy头');
      result.recommendations.push('设置Referrer-Policy控制referrer信息');
      result.score = 0;
      return;
    }

    if (!result.value) {
      result.valid = false;
      result.issues.push('Referrer-Policy头值为空');
      result.score = 0;
      return;
    }

    const validValues = [
      'no-referrer',
      'no-referrer-when-downgrade',
      'origin',
      'origin-when-cross-origin',
      'same-origin',
      'strict-origin',
      'strict-origin-when-cross-origin',
      'unsafe-url',
    ];

    const value = result.value.toLowerCase();

    if (validValues.includes(value)) {
      result.valid = true;

      // 根据安全性评分
      if (value === 'no-referrer' || value === 'strict-origin-when-cross-origin') {
        result.score = 100;
      } else if (value === 'origin' || value === 'strict-origin') {
        result.score = 80;
      } else if (value === 'no-referrer-when-downgrade') {
        result.score = 60;
        result.issues.push('no-referrer-when-downgrade存在隐私泄露风险');
        result.recommendations.push('考虑使用更严格的策略');
      } else {
        result.score = 40;
        result.issues.push('当前策略安全性较低');
        result.recommendations.push('使用更安全的referrer策略');
      }
    } else {
      result.valid = false;
      result.issues.push(`无效的Referrer-Policy值: ${result.value}`);
      result.recommendations.push('使用有效的referrer策略');
      result.score = 0;
    }
  }

  /**
   * 分析Permissions-Policy头
   */
  private analyzePermissionsPolicy(result: SecurityHeaderResult): void {
    if (!result.present) {
      result.issues.push('缺少Permissions-Policy头');
      result.recommendations.push('设置Permissions-Policy控制浏览器功能');
      result.score = 0;
      return;
    }

    if (!result.value) {
      result.valid = false;
      result.issues.push('Permissions-Policy头值为空');
      result.score = 0;
      return;
    }

    // 基本验证
    const policies = result.value.split(',').map(p => p.trim());
    let score = 100;
    const issues: string[] = [];

    // 检查是否禁用了不必要的功能
    const sensitiveFeatures = ['geolocation', 'camera', 'microphone', 'payment'];
    const hasSensitiveRestrictions = sensitiveFeatures.some(feature =>
      policies.some(policy => policy.startsWith(feature) && policy.includes('=()'))
    );

    if (!hasSensitiveRestrictions) {
      issues.push('建议限制敏感功能的使用权限');
      score -= 20;
    }

    result.valid = issues.length === 0;
    result.issues = issues;
    result.score = Math.max(0, score);

    if (issues.length > 0) {
      result.recommendations.push('限制不必要的浏览器功能权限');
    }
  }

  /**
   * 分析COEP头
   */
  private analyzeCOEP(result: SecurityHeaderResult): void {
    if (!result.present) {
      result.issues.push('缺少Cross-Origin-Embedder-Policy头');
      result.recommendations.push('设置COEP防止跨域嵌入攻击');
      result.score = 0;
      return;
    }

    if (!result.value) {
      result.valid = false;
      result.issues.push('COEP头值为空');
      result.score = 0;
      return;
    }

    const validValues = ['require-corp', 'unsafe-none'];
    const value = result.value.toLowerCase();

    if (validValues.includes(value)) {
      result.valid = true;
      result.score = value === 'require-corp' ? 100 : 80;

      if (value === 'unsafe-none') {
        result.issues.push('unsafe-none降低了安全性');
        result.recommendations.push('考虑使用require-corp');
      }
    } else {
      result.valid = false;
      result.issues.push(`无效的COEP值: ${result.value}`);
      result.recommendations.push('使用require-corp或unsafe-none');
      result.score = 0;
    }
  }

  /**
   * 分析COOP头
   */
  private analyzeCOOP(result: SecurityHeaderResult): void {
    if (!result.present) {
      result.issues.push('缺少Cross-Origin-Opener-Policy头');
      result.recommendations.push('设置COOP防止跨窗口攻击');
      result.score = 0;
      return;
    }

    if (!result.value) {
      result.valid = false;
      result.issues.push('COOP头值为空');
      result.score = 0;
      return;
    }

    const validValues = ['same-origin', 'same-origin-allow-popups', 'unsafe-none'];
    const value = result.value.toLowerCase();

    if (validValues.includes(value)) {
      result.valid = true;
      result.score = value === 'same-origin' ? 100 : 80;

      if (value === 'unsafe-none') {
        result.issues.push('unsafe-none降低了安全性');
        result.recommendations.push('考虑使用same-origin');
      }
    } else {
      result.valid = false;
      result.issues.push(`无效的COOP值: ${result.value}`);
      result.recommendations.push('使用same-origin或same-origin-allow-popups');
      result.score = 0;
    }
  }

  /**
   * 分析CORP头
   */
  private analyzeCORP(result: SecurityHeaderResult): void {
    if (!result.present) {
      result.issues.push('缺少Cross-Origin-Resource-Policy头');
      result.recommendations.push('设置CORP控制跨域资源访问');
      result.score = 0;
      return;
    }

    if (!result.value) {
      result.valid = false;
      result.issues.push('CORP头值为空');
      result.score = 0;
      return;
    }

    const validValues = ['same-origin', 'same-site', 'cross-origin'];
    const value = result.value.toLowerCase();

    if (validValues.includes(value)) {
      result.valid = true;
      result.score = 100;
    } else {
      result.valid = false;
      result.issues.push(`无效的CORP值: ${result.value}`);
      result.recommendations.push('使用same-origin、same-site或cross-origin');
      result.score = 0;
    }
  }

  /**
   * 生成建议
   */
  private generateRecommendations(headers: SecurityHeaderResult[]): SecurityHeaderRecommendation[] {
    const recommendations: SecurityHeaderRecommendation[] = [];

    headers.forEach(header => {
      if (!header.present) {
        let priority: 'high' | 'medium' | 'low' = 'medium';
        let suggestedValue: string | undefined;

        switch (header.header) {
          case 'Content-Security-Policy':
            priority = 'high';
            suggestedValue =
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";
            break;
          case 'Strict-Transport-Security':
            priority = 'high';
            suggestedValue = 'max-age=31536000; includeSubDomains; preload';
            break;
          case 'X-Frame-Options':
            priority = 'medium';
            suggestedValue = 'DENY';
            break;
          case 'X-Content-Type-Options':
            priority = 'medium';
            suggestedValue = 'nosniff';
            break;
          case 'X-XSS-Protection':
            priority = 'medium';
            suggestedValue = '1; mode=block';
            break;
          case 'Referrer-Policy':
            priority = 'low';
            suggestedValue = 'strict-origin-when-cross-origin';
            break;
        }

        recommendations.push({
          priority,
          header: header.header,
          title: `添加${header.header}`,
          description: `实施${header.header}以提高安全性`,
          suggestedValue,
          impact: this.getHeaderImpact(header.header),
          effort: 'low',
        });
      } else if (header.issues.length > 0) {
        recommendations.push({
          priority: header.score < 50 ? 'high' : header.score < 80 ? 'medium' : 'low',
          header: header.header,
          title: `修复${header.header}配置`,
          description: header.issues.join('; '),
          currentValue: header.value,
          impact: this.getHeaderImpact(header.header),
          effort: 'low',
        });
      }
    });

    return recommendations;
  }

  /**
   * 获取头部影响
   */
  private getHeaderImpact(header: string): string {
    const impacts: Record<string, string> = {
      'Content-Security-Policy': '防止XSS攻击和代码注入',
      'Strict-Transport-Security': '强制HTTPS连接，防止中间人攻击',
      'X-Frame-Options': '防止点击劫持攻击',
      'X-Content-Type-Options': '防止MIME类型嗅探攻击',
      'X-XSS-Protection': '启用浏览器XSS过滤器',
      'Referrer-Policy': '控制referrer信息泄露',
      'Permissions-Policy': '控制浏览器功能权限',
      'Cross-Origin-Embedder-Policy': '防止跨域嵌入攻击',
      'Cross-Origin-Opener-Policy': '防止跨窗口攻击',
      'Cross-Origin-Resource-Policy': '控制跨域资源访问',
    };

    return impacts[header] || '提高整体安全性';
  }

  /**
   * 计算总体分数
   */
  private calculateOverallScore(headers: SecurityHeaderResult[]): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    headersPresent: number;
    headersMissing: number;
    criticalIssues: number;
  } {
    const totalHeaders = headers.length;
    const presentHeaders = headers.filter(h => h.present).length;
    const missingHeaders = totalHeaders - presentHeaders;
    const criticalIssues = headers.filter(h => h.score < 50).length;

    const averageScore = headers.reduce((sum, h) => sum + h.score, 0) / totalHeaders;
    const score = Math.round(averageScore);

    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    return {
      score,
      grade,
      headersPresent: presentHeaders,
      headersMissing: missingHeaders,
      criticalIssues,
    };
  }

  /**
   * 生成摘要
   */
  private generateSummary(headers: SecurityHeaderResult[]): {
    totalHeaders: number;
    secureHeaders: number;
    insecureHeaders: number;
    missingHeaders: string[];
  } {
    const totalHeaders = headers.length;
    const secureHeaders = headers.filter(h => h.valid).length;
    const insecureHeaders = headers.filter(h => h.present && !h.valid).length;
    const missingHeaders = headers.filter(h => !h.present).map(h => h.header);

    return {
      totalHeaders,
      secureHeaders,
      insecureHeaders,
      missingHeaders,
    };
  }

  /**
   * 获取安全头配置
   */
  getSecurityHeaders(): SecurityHeadersConfig {
    return { ...this.securityHeaders };
  }

  /**
   * 设置安全头配置
   */
  setSecurityHeaders(headers: Partial<SecurityHeadersConfig>): void {
    this.securityHeaders = { ...this.securityHeaders, ...headers };
  }

  /**
   * 导出分析报告
   */
  exportReport(result: SecurityHeadersAnalysisResult): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        result,
        headers: this.securityHeaders,
      },
      null,
      2
    );
  }
}

export default SecurityHeadersAnalyzer;
