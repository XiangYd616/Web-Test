/**
 * 安全分析引擎
 * 不依赖puppeteer，提供基础安全检测功能
 */

import type { IncomingMessage } from 'http';
import http from 'http';
import https from 'https';
import { URL } from 'url';

interface SecurityConfig {
  url: string;
  timeout?: number;
  [key: string]: unknown;
}

interface SecurityResults {
  url: string;
  timestamp: string;
  summary: {
    securityScore: number;
    criticalVulnerabilities: number;
    highVulnerabilities: number;
    mediumVulnerabilities: number;
    lowVulnerabilities: number;
    error?: boolean;
  };
  vulnerabilities: Array<{
    type: string;
    severity: string;
    title: string;
    description: string;
    recommendation: string;
  }>;
  securityHeaders: {
    score: number;
    present: string[];
    missing: string[];
  };
  ssl: {
    score: number;
    httpsEnabled: boolean;
    certificateValid: boolean;
  };
  recommendations: string[];
  httpCheck?: {
    statusCode: number;
    headers: Record<string, string>;
    httpsEnabled: boolean;
  };
  error?: string;
}

interface HTTPCheckResult {
  statusCode: number;
  headers: Record<string, string>;
  httpsEnabled: boolean;
  certificateValid: boolean;
}

class SecurityAnalyzer {
  private options: {
    timeout: number;
  };

  constructor(options: Record<string, unknown> = {}) {
    this.options = {
      timeout: parseInt(process.env.REQUEST_TIMEOUT || '') || 30000,
      ...options,
    };
  }

  /**
   * 执行安全测试
   */
  async executeTest(config: SecurityConfig): Promise<SecurityResults> {
    const { url } = config;

    try {
      const httpCheck = await this.performBasicHttpCheck(url);
      const requiredHeaders = [
        'content-security-policy',
        'strict-transport-security',
        'x-frame-options',
        'x-content-type-options',
        'referrer-policy',
        'permissions-policy',
        'x-xss-protection',
      ];
      const headerLabels: Record<string, string> = {
        'content-security-policy': 'Content-Security-Policy',
        'strict-transport-security': 'Strict-Transport-Security',
        'x-frame-options': 'X-Frame-Options',
        'x-content-type-options': 'X-Content-Type-Options',
        'referrer-policy': 'Referrer-Policy',
        'permissions-policy': 'Permissions-Policy',
        'x-xss-protection': 'X-XSS-Protection',
      };
      const presentHeaders = requiredHeaders.filter(header => httpCheck.headers[header]);
      const missingHeaders = requiredHeaders
        .filter(header => !httpCheck.headers[header])
        .map(header => headerLabels[header] || header);
      const headerScore = Math.round((presentHeaders.length / requiredHeaders.length) * 100);

      const sslScore = httpCheck.httpsEnabled ? (httpCheck.certificateValid ? 100 : 60) : 0;

      const vulnerabilities: SecurityResults['vulnerabilities'] = [];
      const recommendations: string[] = [];

      if (missingHeaders.length > 0) {
        vulnerabilities.push({
          type: 'headers',
          severity: 'high',
          title: '缺少安全头',
          description: `缺少${missingHeaders.join(', ')}等关键安全头`,
          recommendation: '补充缺失的安全头配置',
        });
        recommendations.push(`添加安全头: ${missingHeaders.join(', ')}`);
      }

      if (!httpCheck.httpsEnabled) {
        vulnerabilities.push({
          type: 'ssl',
          severity: 'critical',
          title: '未启用HTTPS',
          description: '网站未启用HTTPS，数据传输存在风险',
          recommendation: '启用HTTPS并强制跳转',
        });
        recommendations.push('启用HTTPS并配置强制跳转');
      } else if (!httpCheck.certificateValid) {
        vulnerabilities.push({
          type: 'ssl',
          severity: 'medium',
          title: '证书验证失败',
          description: 'HTTPS证书验证失败或未被信任',
          recommendation: '检查证书链与过期时间',
        });
        recommendations.push('检查证书链和有效期');
      }

      const securityScore = Math.round(headerScore * 0.6 + sslScore * 0.4);
      const severityCounts = vulnerabilities.reduce(
        (acc, item) => {
          if (item.severity === 'critical') acc.critical += 1;
          else if (item.severity === 'high') acc.high += 1;
          else if (item.severity === 'medium') acc.medium += 1;
          else acc.low += 1;
          return acc;
        },
        { critical: 0, high: 0, medium: 0, low: 0 }
      );

      const results: SecurityResults = {
        url,
        timestamp: new Date().toISOString(),
        summary: {
          securityScore,
          criticalVulnerabilities: severityCounts.critical,
          highVulnerabilities: severityCounts.high,
          mediumVulnerabilities: severityCounts.medium,
          lowVulnerabilities: severityCounts.low,
        },
        vulnerabilities,
        securityHeaders: {
          score: headerScore,
          present: presentHeaders.map(header => headerLabels[header] || header),
          missing: missingHeaders,
        },
        ssl: {
          score: sslScore,
          httpsEnabled: httpCheck.httpsEnabled,
          certificateValid: httpCheck.certificateValid,
        },
        recommendations,
        httpCheck,
      };

      console.log(`✅ 安全测试完成: ${url}, 评分: ${results.summary.securityScore}`);
      return results;
    } catch (error) {
      console.error(`❌ 安全测试失败: ${url}`, error);
      return {
        url,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
        summary: {
          securityScore: 0,
          criticalVulnerabilities: 1,
          highVulnerabilities: 0,
          mediumVulnerabilities: 0,
          lowVulnerabilities: 0,
          error: true,
        },
        vulnerabilities: [
          {
            type: 'system',
            severity: 'critical',
            title: '测试失败',
            description: '安全测试执行失败',
            recommendation: '检查目标网站可访问性',
          },
        ],
        securityHeaders: {
          score: 0,
          present: [],
          missing: [],
        },
        ssl: {
          score: 0,
          httpsEnabled: false,
          certificateValid: false,
        },
        recommendations: ['检查网站可访问性', '验证URL格式'],
      };
    }
  }

  /**
   * 执行基础HTTP检查
   */
  private async performBasicHttpCheck(url: string): Promise<HTTPCheckResult> {
    return new Promise(resolve => {
      try {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;

        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: 'HEAD',
          timeout: this.options.timeout,
          rejectUnauthorized: false,
        };

        const req = client.request(options, (res: IncomingMessage) => {
          const socket = res.socket as unknown as {
            authorized?: boolean;
            getPeerCertificate?: () => { valid_to?: string };
          };
          const certificate = socket?.getPeerCertificate ? socket.getPeerCertificate() : undefined;
          const validTo = certificate?.valid_to ? new Date(certificate.valid_to) : null;
          const certificateValid =
            Boolean(socket?.authorized) && (!validTo || validTo > new Date());
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers as Record<string, string>,
            httpsEnabled: urlObj.protocol === 'https:',
            certificateValid,
          });
        });

        req.on('error', () => {
          resolve({
            statusCode: 0,
            headers: {},
            httpsEnabled: urlObj.protocol === 'https:',
            certificateValid: false,
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            statusCode: 0,
            headers: {},
            httpsEnabled: urlObj.protocol === 'https:',
            certificateValid: false,
          });
        });

        req.end();
      } catch {
        resolve({
          statusCode: 0,
          headers: {},
          httpsEnabled: false,
          certificateValid: false,
        });
      }
    });
  }

  /**
   * 获取引擎信息
   */
  getEngineInfo() {
    return {
      name: 'SecurityAnalyzer',
      version: '1.0.0',
      description: '基础安全分析引擎',
      capabilities: ['HTTP安全头检查', 'SSL/TLS配置检查', '基础漏洞检测', '安全评分计算'],
    };
  }

  /**
   * 验证配置
   */
  validateConfig(config: SecurityConfig): SecurityConfig {
    if (!config.url) {
      throw new Error('URL是必需的配置项');
    }

    try {
      new URL(config.url);
    } catch {
      throw new Error('无效的URL格式');
    }

    return config;
  }
}

export default SecurityAnalyzer;
