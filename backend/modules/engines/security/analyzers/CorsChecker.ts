/**
 * CORS 配置检测器
 * 检测跨域资源共享配置安全性：
 * - Access-Control-Allow-Origin 是否过于宽松（通配符 *）
 * - 是否反射任意 Origin
 * - Access-Control-Allow-Credentials 与通配符冲突
 * - 预检请求（OPTIONS）配置
 * - Access-Control-Expose-Headers 敏感头暴露
 */

import axios from 'axios';
import { Agent as HttpsAgent } from 'https';

export interface CorsIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence?: string;
  remediation: string;
}

export interface CorsCheckResult {
  score: number;
  issues: CorsIssue[];
  warnings: string[];
  details: {
    allowOrigin: string | null;
    allowCredentials: boolean;
    allowMethods: string | null;
    allowHeaders: string | null;
    exposeHeaders: string | null;
    maxAge: string | null;
    reflectsOrigin: boolean;
    wildcardOrigin: boolean;
    preflightEnabled: boolean;
  };
}

interface CorsCheckerOptions {
  timeout?: number;
  userAgent?: string;
}

class CorsChecker {
  private options: Required<CorsCheckerOptions>;

  constructor(options: CorsCheckerOptions = {}) {
    this.options = {
      timeout: options.timeout || 15000,
      userAgent: options.userAgent || 'Security-Scanner/3.0.0',
    };
  }

  async analyze(url: string): Promise<CorsCheckResult> {
    const result: CorsCheckResult = {
      score: 100,
      issues: [],
      warnings: [],
      details: {
        allowOrigin: null,
        allowCredentials: false,
        allowMethods: null,
        allowHeaders: null,
        exposeHeaders: null,
        maxAge: null,
        reflectsOrigin: false,
        wildcardOrigin: false,
        preflightEnabled: false,
      },
    };

    try {
      // 1. 基础 CORS 头检测
      await this.checkBasicCors(url, result);

      // 2. Origin 反射检测
      await this.checkOriginReflection(url, result);

      // 3. 预检请求检测
      await this.checkPreflight(url, result);

      // 4. null Origin 检测
      await this.checkNullOrigin(url, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.warnings.push(`CORS 检测部分失败: ${message}`);
      result.score = Math.max(0, result.score - 10);
    }

    result.score = Math.max(0, result.score);
    return result;
  }

  private async checkBasicCors(url: string, result: CorsCheckResult): Promise<void> {
    try {
      const response = await axios.get(url, {
        timeout: this.options.timeout,
        headers: {
          'User-Agent': this.options.userAgent,
          Origin: 'https://test-cors-check.example.com',
        },
        maxRedirects: 5,
        validateStatus: () => true,
      });

      const headers = response.headers || {};
      const allowOrigin = String(headers['access-control-allow-origin'] || '') || null;
      const allowCredentials = String(headers['access-control-allow-credentials'] || '') === 'true';
      const exposeHeaders = String(headers['access-control-expose-headers'] || '') || null;

      result.details.allowOrigin = allowOrigin;
      result.details.allowCredentials = allowCredentials;
      result.details.exposeHeaders = exposeHeaders;

      // 通配符 Origin 检查
      if (allowOrigin === '*') {
        result.details.wildcardOrigin = true;

        if (allowCredentials) {
          // 通配符 + Credentials 是严重问题
          result.issues.push({
            type: 'cors-wildcard-credentials',
            severity: 'critical',
            description:
              'CORS 配置同时使用通配符 Origin (*) 和 Allow-Credentials，这是严重的安全漏洞',
            evidence: `Access-Control-Allow-Origin: * + Access-Control-Allow-Credentials: true`,
            remediation: '不要同时使用通配符 Origin 和 Allow-Credentials，应指定具体的允许域名',
          });
          result.score -= 30;
        } else {
          result.issues.push({
            type: 'cors-wildcard-origin',
            severity: 'medium',
            description: 'CORS 配置使用通配符 (*)，允许任何域名跨域访问',
            evidence: `Access-Control-Allow-Origin: *`,
            remediation: '将 Access-Control-Allow-Origin 限制为具体的可信域名列表',
          });
          result.score -= 10;
        }
      }

      // 检查 Expose-Headers 是否暴露敏感头
      if (exposeHeaders) {
        const sensitiveHeaders = ['authorization', 'set-cookie', 'x-csrf-token', 'x-api-key'];
        const exposed = exposeHeaders
          .toLowerCase()
          .split(',')
          .map((h: string) => h.trim());
        const leakedHeaders = exposed.filter((h: string) => sensitiveHeaders.includes(h));

        if (leakedHeaders.length > 0) {
          result.issues.push({
            type: 'cors-expose-sensitive-headers',
            severity: 'medium',
            description: `CORS 暴露了敏感响应头: ${leakedHeaders.join(', ')}`,
            evidence: `Access-Control-Expose-Headers: ${exposeHeaders}`,
            remediation: '仅暴露前端必需的非敏感响应头',
          });
          result.score -= 8;
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      result.warnings.push(`基础 CORS 检测失败: ${msg}`);
    }
  }

  private async checkOriginReflection(url: string, result: CorsCheckResult): Promise<void> {
    const testOrigins = ['https://evil-attacker.com', 'https://malicious-site.example.org'];

    for (const origin of testOrigins) {
      try {
        const response = await axios.get(url, {
          timeout: this.options.timeout,
          headers: {
            'User-Agent': this.options.userAgent,
            Origin: origin,
          },
          maxRedirects: 5,
          validateStatus: () => true,
        });

        const allowOrigin = response.headers['access-control-allow-origin'];
        if (allowOrigin === origin) {
          result.details.reflectsOrigin = true;

          const allowCredentials = response.headers['access-control-allow-credentials'] === 'true';

          if (allowCredentials) {
            result.issues.push({
              type: 'cors-origin-reflection-credentials',
              severity: 'critical',
              description: '服务器反射任意 Origin 并允许携带凭据，攻击者可窃取用户数据',
              evidence: `Origin: ${origin} → Access-Control-Allow-Origin: ${allowOrigin}, Credentials: true`,
              remediation: '实现 Origin 白名单验证，仅允许可信域名',
            });
            result.score -= 30;
          } else {
            result.issues.push({
              type: 'cors-origin-reflection',
              severity: 'high',
              description: '服务器反射任意 Origin，可能允许未授权的跨域数据读取',
              evidence: `Origin: ${origin} → Access-Control-Allow-Origin: ${allowOrigin}`,
              remediation: '实现严格的 Origin 白名单，不要直接反射请求中的 Origin',
            });
            result.score -= 20;
          }
          break;
        }
      } catch {
        // 忽略单个测试失败
      }
    }
  }

  private async checkPreflight(url: string, result: CorsCheckResult): Promise<void> {
    try {
      const response = await axios.request({
        method: 'OPTIONS',
        url,
        timeout: this.options.timeout,
        headers: {
          'User-Agent': this.options.userAgent,
          Origin: 'https://test-preflight.example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        },
        validateStatus: () => true,
        httpsAgent: new HttpsAgent({ rejectUnauthorized: false }),
      });

      const headers = response.headers || {};
      const allowMethods = String(headers['access-control-allow-methods'] || '') || null;
      const allowHeaders = String(headers['access-control-allow-headers'] || '') || null;
      const maxAge = String(headers['access-control-max-age'] || '') || null;

      result.details.allowMethods = allowMethods;
      result.details.allowHeaders = allowHeaders;
      result.details.maxAge = maxAge;

      if (response.status === 200 || response.status === 204) {
        result.details.preflightEnabled = true;

        // 检查是否允许危险方法
        if (allowMethods) {
          const methods = allowMethods
            .toUpperCase()
            .split(',')
            .map((m: string) => m.trim());
          const dangerousMethods = methods.filter((m: string) =>
            ['PUT', 'DELETE', 'PATCH', 'TRACE'].includes(m)
          );
          if (dangerousMethods.length > 0) {
            result.warnings.push(`CORS 预检允许危险 HTTP 方法: ${dangerousMethods.join(', ')}`);
          }
        }

        // 检查 max-age 是否过长
        if (maxAge) {
          const maxAgeSeconds = parseInt(maxAge, 10);
          if (maxAgeSeconds > 86400) {
            result.warnings.push(
              `CORS 预检缓存时间过长: ${maxAgeSeconds} 秒（建议不超过 86400 秒）`
            );
          }
        }
      }
    } catch {
      // OPTIONS 请求失败不影响评分
    }
  }

  private async checkNullOrigin(url: string, result: CorsCheckResult): Promise<void> {
    try {
      const response = await axios.get(url, {
        timeout: this.options.timeout,
        headers: {
          'User-Agent': this.options.userAgent,
          Origin: 'null',
        },
        maxRedirects: 5,
        validateStatus: () => true,
      });

      const allowOrigin = response.headers['access-control-allow-origin'];
      if (allowOrigin === 'null') {
        result.issues.push({
          type: 'cors-null-origin',
          severity: 'high',
          description: '服务器允许 null Origin 跨域访问，可被 iframe sandbox 或 data: URI 利用',
          evidence: `Origin: null → Access-Control-Allow-Origin: null`,
          remediation: '不要将 "null" 加入 Origin 白名单',
        });
        result.score -= 15;
      }
    } catch {
      // 忽略
    }
  }
}

export default CorsChecker;
