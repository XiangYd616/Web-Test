/**
 * Cookie 安全审计器
 * 检测 Cookie 安全属性配置：
 * - HttpOnly 属性（防止 JS 读取）
 * - Secure 属性（仅 HTTPS 传输）
 * - SameSite 属性（防止 CSRF）
 * - Path / Domain 范围
 * - 过期时间合理性
 * - 敏感信息泄露
 */

import axios from 'axios';

export interface CookieIssue {
  cookie: string;
  attribute: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  remediation: string;
}

export interface CookieAuditResult {
  score: number;
  totalCookies: number;
  issues: CookieIssue[];
  warnings: string[];
  details: {
    secureCookies: number;
    httpOnlyCookies: number;
    sameSiteCookies: number;
    sessionCookies: number;
    persistentCookies: number;
    thirdPartyCookies: number;
  };
}

interface ParsedCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  maxAge?: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: string;
  raw: string;
}

interface CookieAuditorOptions {
  timeout?: number;
  userAgent?: string;
}

const SENSITIVE_COOKIE_PATTERNS = [
  /session/i,
  /sess_?id/i,
  /token/i,
  /auth/i,
  /jwt/i,
  /access/i,
  /refresh/i,
  /csrf/i,
  /xsrf/i,
  /connect\.sid/i,
  /phpsessid/i,
  /jsessionid/i,
  /asp\.net_sessionid/i,
];

class CookieAuditor {
  private options: Required<CookieAuditorOptions>;

  constructor(options: CookieAuditorOptions = {}) {
    this.options = {
      timeout: options.timeout || 15000,
      userAgent: options.userAgent || 'Security-Scanner/3.0.0',
    };
  }

  async analyze(url: string): Promise<CookieAuditResult> {
    const result: CookieAuditResult = {
      score: 100,
      totalCookies: 0,
      issues: [],
      warnings: [],
      details: {
        secureCookies: 0,
        httpOnlyCookies: 0,
        sameSiteCookies: 0,
        sessionCookies: 0,
        persistentCookies: 0,
        thirdPartyCookies: 0,
      },
    };

    try {
      const response = await axios.get(url, {
        timeout: this.options.timeout,
        headers: { 'User-Agent': this.options.userAgent },
        maxRedirects: 5,
        validateStatus: (status: number) => status >= 200 && status < 500,
      });

      const setCookieHeader = response.headers['set-cookie'];
      if (!setCookieHeader) {
        return result;
      }

      const cookies = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : [String(setCookieHeader)];

      const isHttps = url.startsWith('https://');
      const urlDomain = new URL(url).hostname;

      result.totalCookies = cookies.length;

      for (const raw of cookies) {
        const parsed = this.parseCookie(raw);
        this.auditCookie(parsed, isHttps, urlDomain, result);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.warnings.push(`Cookie 审计部分失败: ${message}`);
      result.score = Math.max(0, result.score - 10);
    }

    result.score = Math.max(0, result.score);
    return result;
  }

  private parseCookie(raw: string): ParsedCookie {
    const parts = raw.split(';').map(p => p.trim());
    const [nameValue, ...attributes] = parts;
    const eqIndex = nameValue.indexOf('=');
    const name = eqIndex > 0 ? nameValue.substring(0, eqIndex).trim() : nameValue.trim();
    const value = eqIndex > 0 ? nameValue.substring(eqIndex + 1).trim() : '';

    const cookie: ParsedCookie = {
      name,
      value,
      secure: false,
      httpOnly: false,
      raw: raw.substring(0, 200),
    };

    for (const attr of attributes) {
      const lower = attr.toLowerCase();
      if (lower === 'secure') {
        cookie.secure = true;
      } else if (lower === 'httponly') {
        cookie.httpOnly = true;
      } else if (lower.startsWith('samesite=')) {
        cookie.sameSite = attr.split('=')[1]?.trim();
      } else if (lower.startsWith('domain=')) {
        cookie.domain = attr.split('=')[1]?.trim();
      } else if (lower.startsWith('path=')) {
        cookie.path = attr.split('=')[1]?.trim();
      } else if (lower.startsWith('expires=')) {
        cookie.expires = attr.substring(8).trim();
      } else if (lower.startsWith('max-age=')) {
        cookie.maxAge = parseInt(attr.split('=')[1]?.trim() || '0', 10);
      }
    }

    return cookie;
  }

  private auditCookie(
    cookie: ParsedCookie,
    isHttps: boolean,
    urlDomain: string,
    result: CookieAuditResult
  ): void {
    const isSensitive = SENSITIVE_COOKIE_PATTERNS.some(p => p.test(cookie.name));

    // 统计
    if (cookie.secure) result.details.secureCookies++;
    if (cookie.httpOnly) result.details.httpOnlyCookies++;
    if (cookie.sameSite) result.details.sameSiteCookies++;
    if (cookie.expires || cookie.maxAge !== undefined) {
      result.details.persistentCookies++;
    } else {
      result.details.sessionCookies++;
    }
    if (cookie.domain && !urlDomain.endsWith(cookie.domain.replace(/^\./, ''))) {
      result.details.thirdPartyCookies++;
    }

    // 1. HttpOnly 检查
    if (!cookie.httpOnly && isSensitive) {
      result.issues.push({
        cookie: cookie.name,
        attribute: 'HttpOnly',
        severity: 'high',
        description: `敏感 Cookie "${cookie.name}" 未设置 HttpOnly 属性，可被 JavaScript 读取`,
        remediation: '为敏感 Cookie 添加 HttpOnly 属性，防止 XSS 攻击窃取凭据',
      });
      result.score -= 15;
    } else if (!cookie.httpOnly) {
      result.issues.push({
        cookie: cookie.name,
        attribute: 'HttpOnly',
        severity: 'low',
        description: `Cookie "${cookie.name}" 未设置 HttpOnly 属性`,
        remediation: '建议为所有非前端必需的 Cookie 添加 HttpOnly 属性',
      });
      result.score -= 3;
    }

    // 2. Secure 检查
    if (!cookie.secure && isHttps) {
      const severity = isSensitive ? 'high' : 'medium';
      result.issues.push({
        cookie: cookie.name,
        attribute: 'Secure',
        severity,
        description: `HTTPS 站点的 Cookie "${cookie.name}" 未设置 Secure 属性，可能通过 HTTP 泄露`,
        remediation: '为所有 Cookie 添加 Secure 属性，确保仅通过 HTTPS 传输',
      });
      result.score -= isSensitive ? 15 : 5;
    }

    // 3. SameSite 检查
    if (!cookie.sameSite) {
      result.issues.push({
        cookie: cookie.name,
        attribute: 'SameSite',
        severity: isSensitive ? 'medium' : 'low',
        description: `Cookie "${cookie.name}" 未设置 SameSite 属性`,
        remediation: '添加 SameSite=Lax 或 SameSite=Strict 属性以防止 CSRF 攻击',
      });
      result.score -= isSensitive ? 10 : 3;
    } else if (cookie.sameSite.toLowerCase() === 'none' && !cookie.secure) {
      result.issues.push({
        cookie: cookie.name,
        attribute: 'SameSite',
        severity: 'high',
        description: `Cookie "${cookie.name}" 设置 SameSite=None 但缺少 Secure 属性`,
        remediation: 'SameSite=None 必须配合 Secure 属性使用',
      });
      result.score -= 10;
    }

    // 4. Path 范围检查
    if (cookie.path === '/') {
      // 宽泛路径对敏感 Cookie 是风险
      if (isSensitive) {
        result.issues.push({
          cookie: cookie.name,
          attribute: 'Path',
          severity: 'low',
          description: `敏感 Cookie "${cookie.name}" 的 Path 设置为 "/"，作用范围过大`,
          remediation: '将 Cookie Path 限制到实际需要的路径范围',
        });
        result.score -= 2;
      }
    }

    // 5. 过期时间检查
    if (cookie.maxAge !== undefined && cookie.maxAge > 31536000) {
      result.issues.push({
        cookie: cookie.name,
        attribute: 'Max-Age',
        severity: 'low',
        description: `Cookie "${cookie.name}" 的有效期超过 1 年（${Math.round(cookie.maxAge / 86400)} 天）`,
        remediation: '缩短 Cookie 有效期，敏感 Cookie 建议不超过 24 小时',
      });
      result.score -= 2;
    }

    // 6. Cookie 值中的敏感信息检查
    if (this.containsSensitiveData(cookie.value)) {
      result.issues.push({
        cookie: cookie.name,
        attribute: 'Value',
        severity: 'medium',
        description: `Cookie "${cookie.name}" 的值可能包含未加密的敏感信息`,
        remediation: 'Cookie 值应使用加密或签名，避免直接存储敏感数据',
      });
      result.score -= 8;
    }

    // 7. Domain 范围检查
    if (cookie.domain) {
      const domainParts = cookie.domain.replace(/^\./, '').split('.');
      if (domainParts.length <= 2) {
        result.issues.push({
          cookie: cookie.name,
          attribute: 'Domain',
          severity: 'low',
          description: `Cookie "${cookie.name}" 的 Domain 设置为顶级域 "${cookie.domain}"，所有子域均可访问`,
          remediation: '将 Cookie Domain 限制到具体子域名',
        });
        result.score -= 2;
      }
    }
  }

  private containsSensitiveData(value: string): boolean {
    if (!value || value.length < 10) return false;

    // 检查是否像 Base64 编码的 JSON（可能是未加密的 JWT payload）
    try {
      const decoded = Buffer.from(value, 'base64').toString('utf-8');
      if (decoded.includes('"email"') || decoded.includes('"password"') || decoded.includes('"user')) {
        return true;
      }
    } catch {
      // 不是 Base64
    }

    // 检查是否包含明文邮箱或 IP
    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(value)) return true;
    if (/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(value)) return true;

    return false;
  }
}

export default CookieAuditor;
