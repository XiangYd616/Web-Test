/**
 * 🛡️ 安全测试核心服务
 * 统一所有安全测试功能，消除重复代码
 */

import axios from 'axios';
import * as tls from 'tls';
import { URL } from 'url';
import SQLInjectionAnalyzer from '../../security/analyzers/SQLInjectionAnalyzer';
import XSSAnalyzer from '../../security/analyzers/XSSAnalyzer';

interface SecurityTestResult {
  id: string;
  url: string;
  timestamp: Date;
  overallScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  categories: {
    ssl: {
      score: number;
      enabled: boolean;
      valid: boolean;
      protocol: string;
      issuer: string;
      expiresAt: Date;
      daysUntilExpiry: number;
      issues: string[];
    };
    headers: {
      score: number;
      present: Record<string, boolean>;
      missing: string[];
      issues: string[];
    };
    vulnerabilities: {
      score: number;
      xss: boolean;
      sqlInjection: boolean;
      csrf: boolean;
      directoryTraversal: boolean;
      openRedirect: boolean;
      issues: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        evidence?: string;
      }>;
    };
    configuration: {
      score: number;
      methods: string[];
      cors: {
        enabled: boolean;
        origins: string[];
        credentials: boolean;
      };
      authentication: {
        required: boolean;
        methods: string[];
      };
      issues: string[];
    };
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    category: string;
    effort: 'low' | 'medium' | 'high';
  }>;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
}

interface SecurityTestConfig {
  timeout?: number;
  userAgent?: string;
  followRedirects?: boolean;
  maxRedirects?: number;
  checkSSL?: boolean;
  checkHeaders?: boolean;
  checkVulnerabilities?: boolean;
  checkConfiguration?: boolean;
  testId?: string;
}

interface SSLCertificate {
  valid: boolean;
  protocol: string;
  cipher: string;
  issuer: string;
  subject: string;
  expiresAt: Date;
  daysUntilExpiry: number;
  fingerprint: string;
  serial: string;
  selfSigned: boolean;
  issues: string[];
}

class SecurityTestCore {
  private cache: Map<string, SecurityTestResult>;
  private securityHeaders: Record<string, string>;
  private sqlInjectionAnalyzer: SQLInjectionAnalyzer;
  private xssAnalyzer: XSSAnalyzer;

  constructor() {
    this.cache = new Map(); // 结果缓存
    this.sqlInjectionAnalyzer = new SQLInjectionAnalyzer();
    this.xssAnalyzer = new XSSAnalyzer();

    // 安全头配置
    this.securityHeaders = {
      'strict-transport-security': 'HSTS (HTTP Strict Transport Security)',
      'content-security-policy': 'CSP (Content Security Policy)',
      'x-frame-options': 'X-Frame-Options',
      'x-content-type-options': 'X-Content-Type-Options',
      'x-xss-protection': 'X-XSS-Protection',
      'referrer-policy': 'Referrer Policy',
      'permissions-policy': 'Permissions Policy',
      'cross-origin-embedder-policy': 'COEP',
      'cross-origin-opener-policy': 'COOP',
      'cross-origin-resource-policy': 'CORP',
    };
  }

  /**
   * 运行完整的安全测试
   */
  async runSecurityTest(url: string, config: SecurityTestConfig = {}): Promise<SecurityTestResult> {
    const { testId: _ignoredTestId, ...cacheConfig } = config;
    const cacheKey = `security_${url}_${JSON.stringify(cacheConfig)}`;

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const testId =
        typeof config.testId === 'string' && config.testId.trim().length > 0
          ? config.testId
          : this.generateId();
      const timestamp = new Date();

      // 并行执行各项安全测试
      const [sslResult, headersResult, vulnerabilityResult, configurationResult] =
        await Promise.all([
          this.checkSSL(url, config),
          this.checkSecurityHeaders(url, config),
          this.scanVulnerabilities(url, config),
          this.checkConfiguration(url, config),
        ]);

      // 计算分类分数
      const categoryScores = {
        ssl: sslResult.score,
        headers: headersResult.score,
        vulnerabilities: vulnerabilityResult.score,
        configuration: configurationResult.score,
      };

      // 计算总体分数
      const overallScore =
        Object.values(categoryScores).reduce((sum, score) => sum + score, 0) /
        Object.keys(categoryScores).length;

      // 生成建议
      const recommendations = this.generateRecommendations({
        ssl: sslResult,
        headers: headersResult,
        vulnerabilities: vulnerabilityResult,
        configuration: configurationResult,
      });

      // 生成摘要
      const summary = this.generateSummary(vulnerabilityResult.issues);

      const result: SecurityTestResult = {
        id: testId,
        url,
        timestamp,
        overallScore,
        grade: this.getGrade(overallScore),
        categories: {
          ssl: sslResult,
          headers: headersResult,
          vulnerabilities: vulnerabilityResult,
          configuration: configurationResult,
        },
        recommendations,
        summary,
      };

      // 缓存结果
      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      throw new Error(`安全测试失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 检查SSL/TLS配置
   */
  private async checkSSL(
    url: string,
    config: SecurityTestConfig
  ): Promise<{
    score: number;
    enabled: boolean;
    valid: boolean;
    protocol: string;
    issuer: string;
    expiresAt: Date;
    daysUntilExpiry: number;
    issues: string[];
  }> {
    if (!config.checkSSL) {
      return {
        score: 0,
        enabled: false,
        valid: false,
        protocol: '',
        issuer: '',
        expiresAt: new Date(),
        daysUntilExpiry: 0,
        issues: ['SSL检查已禁用'],
      };
    }

    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;
      const port = parsedUrl.port ? Number(parsedUrl.port) : 443;

      const certificate = await this.getSSLCertificate(hostname, port);

      const issues: string[] = [];
      let score = 100;

      if (!certificate.valid) {
        issues.push('SSL证书无效');
        score -= 50;
      }

      if (certificate.selfSigned) {
        issues.push('使用自签名证书');
        score -= 30;
      }

      if (certificate.daysUntilExpiry < 30) {
        issues.push(`SSL证书将在${certificate.daysUntilExpiry}天内过期`);
        score -= 20;
      }

      if (certificate.protocol !== 'TLSv1.2' && certificate.protocol !== 'TLSv1.3') {
        issues.push(`使用不安全的协议: ${certificate.protocol}`);
        score -= 25;
      }

      return {
        score: Math.max(0, score),
        enabled: true,
        valid: certificate.valid,
        protocol: certificate.protocol,
        issuer: certificate.issuer,
        expiresAt: certificate.expiresAt,
        daysUntilExpiry: certificate.daysUntilExpiry,
        issues,
      };
    } catch {
      return {
        score: 0,
        enabled: false,
        valid: false,
        protocol: '',
        issuer: '',
        expiresAt: new Date(),
        daysUntilExpiry: 0,
        issues: ['无法检查SSL配置'],
      };
    }
  }

  /**
   * 获取SSL证书信息
   */
  private getSSLCertificate(hostname: string, port: number): Promise<SSLCertificate> {
    return new Promise((resolve, reject) => {
      const socket = tls.connect(
        {
          host: hostname,
          port,
          servername: hostname,
        },
        () => {
          const cert = socket.getPeerCertificate(true);

          if (!cert) {
            resolve({
              valid: false,
              protocol: socket.getProtocol() || 'unknown',
              cipher: socket.getCipher()?.name || 'unknown',
              issuer: '',
              subject: '',
              expiresAt: new Date(),
              daysUntilExpiry: 0,
              fingerprint: '',
              serial: '',
              selfSigned: false,
              issues: ['无法获取证书'],
            });
            return;
          }

          const expiresAt = new Date(cert.valid_to);
          const daysUntilExpiry = Math.ceil(
            (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          const selfSigned = cert.issuer === cert.subject;

          resolve({
            valid: socket.authorized || true,
            protocol: socket.getProtocol() || 'unknown',
            cipher: socket.getCipher()?.name || 'unknown',
            issuer: String(cert.issuer?.CN || ''),
            subject: String(cert.subject?.CN || ''),
            expiresAt,
            daysUntilExpiry,
            fingerprint: cert.fingerprint || '',
            serial: cert.serialNumber || '',
            selfSigned,
            issues: [],
          });
        }
      );

      socket.on('error', _error => {
        reject(_error);
      });

      socket.setTimeout(10000, () => {
        socket.destroy();
        reject(new Error('SSL连接超时'));
      });
    });
  }

  /**
   * 检查安全头
   */
  private async checkSecurityHeaders(
    url: string,
    config: SecurityTestConfig
  ): Promise<{
    score: number;
    present: Record<string, boolean>;
    missing: string[];
    issues: string[];
  }> {
    if (!config.checkHeaders) {
      return {
        score: 0,
        present: {},
        missing: [],
        issues: ['安全头检查已禁用'],
      };
    }

    try {
      const response = await axios.get(url, {
        timeout: config.timeout || 10000,
        headers: {
          'User-Agent': config.userAgent || 'SecurityTestCore/1.0',
        },
        maxRedirects: config.maxRedirects || 5,
      });

      const headers = response.headers;
      const present: Record<string, boolean> = {};
      const missing: string[] = [];
      const issues: string[] = [];
      let score = 100;

      // 检查每个安全头
      Object.keys(this.securityHeaders).forEach(header => {
        const isPresent = headers[header] !== undefined;
        present[header] = isPresent;

        if (!isPresent) {
          missing.push(header);
          score -= 10;
        } else {
          // 验证头值
          const value = headers[header] as string;
          const validation = this.validateSecurityHeader(header, value);

          if (!validation.valid) {
            issues.push(validation.issue || `无效的${header}头`);
            score -= 5;
          }
        }
      });

      return {
        score: Math.max(0, score),
        present,
        missing,
        issues,
      };
    } catch {
      return {
        score: 0,
        present: {},
        missing: Object.keys(this.securityHeaders),
        issues: ['无法获取HTTP头'],
      };
    }
  }

  /**
   * 验证安全头值
   */
  private validateSecurityHeader(
    header: string,
    value: string
  ): { valid: boolean; issue?: string } {
    switch (header) {
      case 'strict-transport-security':
        return {
          valid:
            value.includes('max-age') &&
            (value.includes('includeSubDomains') || value.includes('preload')),
          issue: 'HSTS应包含max-age和includeSubDomains',
        };

      case 'content-security-policy':
        return {
          valid: value.includes('default-src'),
          issue: 'CSP应包含default-src指令',
        };

      case 'x-frame-options':
        return {
          valid: ['DENY', 'SAMEORIGIN', 'ALLOW-FROM'].some(option =>
            value.toUpperCase().includes(option)
          ),
          issue: 'X-Frame-Options应为DENY、SAMEORIGIN或ALLOW-FROM',
        };

      case 'x-content-type-options':
        return {
          valid: value.toUpperCase() === 'NOSNIFF',
          issue: 'X-Content-Type-Options应为nosniff',
        };

      case 'x-xss-protection':
        return {
          valid: value.includes('1') && (value.includes('mode=block') || value.includes('mode')),
          issue: 'X-XSS-Protection应为1; mode=block',
        };

      default:
        return { valid: true };
    }
  }

  /**
   * 扫描漏洞
   */
  private async scanVulnerabilities(
    url: string,
    config: SecurityTestConfig
  ): Promise<{
    score: number;
    xss: boolean;
    sqlInjection: boolean;
    csrf: boolean;
    directoryTraversal: boolean;
    openRedirect: boolean;
    issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      evidence?: string;
    }>;
  }> {
    if (!config.checkVulnerabilities) {
      return {
        score: 0,
        xss: false,
        sqlInjection: false,
        csrf: false,
        directoryTraversal: false,
        openRedirect: false,
        issues: [
          {
            type: 'vulnerability-scan',
            severity: 'low',
            description: '漏洞扫描已禁用',
          },
        ],
      };
    }

    const issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      evidence?: string;
    }> = [];

    let score = 100;

    // XSS检测
    const xssResult = await this.detectXSS(url, config);
    if (xssResult.vulnerable) {
      issues.push(...xssResult.issues);
      score -= 30;
    }

    // SQL注入检测
    const sqlResult = await this.detectSQLInjection(url, config);
    if (sqlResult.vulnerable) {
      issues.push(...sqlResult.issues);
      score -= 40;
    }

    // CSRF检测
    const csrfResult = await this.detectCSRF(url);
    if (csrfResult.vulnerable) {
      issues.push(...csrfResult.issues);
      score -= 20;
    }

    // 目录遍历检测
    const dirResult = await this.detectDirectoryTraversal(url);
    if (dirResult.vulnerable) {
      issues.push(...dirResult.issues);
      score -= 25;
    }

    // 开放重定向检测
    const redirectResult = await this.detectOpenRedirect(url);
    if (redirectResult.vulnerable) {
      issues.push(...redirectResult.issues);
      score -= 15;
    }

    return {
      score: Math.max(0, score),
      xss: xssResult.vulnerable,
      sqlInjection: sqlResult.vulnerable,
      csrf: csrfResult.vulnerable,
      directoryTraversal: dirResult.vulnerable,
      openRedirect: redirectResult.vulnerable,
      issues,
    };
  }

  /**
   * 检测XSS漏洞
   */
  private async detectXSS(
    url: string,
    config: SecurityTestConfig
  ): Promise<{
    vulnerable: boolean;
    issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      evidence?: string;
    }>;
  }> {
    try {
      const result = await this.xssAnalyzer.analyze(url, {
        timeout: config.timeout,
        userAgent: config.userAgent,
        testHeaders: true,
        testCookies: true,
        delay: 150,
        headless: true,
      });

      const issues = result.vulnerabilities.map(vuln => ({
        type: 'xss',
        severity: vuln.severity,
        description: vuln.description,
        evidence: vuln.evidence,
      }));

      return {
        vulnerable: result.vulnerable,
        issues,
      };
    } catch {
      return {
        vulnerable: false,
        issues: [],
      };
    }
  }

  /**
   * 检测SQL注入漏洞
   */
  private async detectSQLInjection(
    url: string,
    config: SecurityTestConfig
  ): Promise<{
    vulnerable: boolean;
    issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      evidence?: string;
    }>;
  }> {
    try {
      const result = await this.sqlInjectionAnalyzer.analyze(url, {
        timeout: config.timeout,
        userAgent: config.userAgent,
        followRedirects: config.followRedirects,
        maxRedirects: config.maxRedirects,
        testHeaders: true,
        testCookies: true,
        delay: 150,
      });

      const issues = result.vulnerabilities.map(vuln => ({
        type: 'sql-injection',
        severity: vuln.severity,
        description: vuln.description,
        evidence: vuln.evidence,
      }));

      return {
        vulnerable: result.vulnerable,
        issues,
      };
    } catch {
      return {
        vulnerable: false,
        issues: [],
      };
    }
  }

  /**
   * 检测CSRF漏洞
   */
  private async detectCSRF(url: string): Promise<{
    vulnerable: boolean;
    issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
    }>;
  }> {
    const issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
    }> = [];

    try {
      const response = await axios.get(url, { timeout: 5000 });
      const html = response.data;

      // 检查表单是否有CSRF保护
      const forms = html.match(/<form[^>]*>[\s\S]*?<\/form>/gi) || [];

      for (const form of forms) {
        const hasCSRFToken =
          form.includes('csrf') || form.includes('token') || form.includes('_token');

        if (!hasCSRFToken) {
          issues.push({
            type: 'csrf',
            severity: 'medium',
            description: '表单缺少CSRF保护',
          });
        }
      }

      return {
        vulnerable: issues.length > 0,
        issues,
      };
    } catch {
      return {
        vulnerable: false,
        issues: [],
      };
    }
  }

  /**
   * 检测目录遍历漏洞
   */
  private async detectDirectoryTraversal(url: string): Promise<{
    vulnerable: boolean;
    issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
    }>;
  }> {
    const issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
    }> = [];

    try {
      // 测试目录遍历向量
      const traversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
        '....//....//....//etc/passwd',
      ];

      for (const payload of traversalPayloads) {
        try {
          const response = await axios.get(url, {
            params: { file: payload },
            timeout: 5000,
          });

          // 检查响应中是否包含系统文件内容
          const systemFilePatterns = ['root:x:0:0', 'localhost', '# Copyright'];

          if (systemFilePatterns.some(pattern => response.data.includes(pattern))) {
            issues.push({
              type: 'directory-traversal',
              severity: 'high',
              description: '发现目录遍历漏洞：路径未正确验证',
            });
          }
        } catch {
          // 忽略错误
        }
      }

      return {
        vulnerable: issues.length > 0,
        issues,
      };
    } catch {
      return {
        vulnerable: false,
        issues: [],
      };
    }
  }

  /**
   * 检测开放重定向漏洞
   */
  private async detectOpenRedirect(url: string): Promise<{
    vulnerable: boolean;
    issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
    }>;
  }> {
    const issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
    }> = [];

    try {
      // 测试重定向向量
      const redirectPayloads = [
        'http://evil.com',
        '//evil.com',
        '/\\evil.com',
        'javascript:alert(1)',
      ];

      for (const payload of redirectPayloads) {
        try {
          const response = await axios.get(url, {
            params: { redirect: payload },
            timeout: 5000,
            maxRedirects: 0, // 不自动跟随重定向
          });

          // 检查响应状态码和位置头
          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.location;
            if (location && (location.includes('evil.com') || location.startsWith('javascript:'))) {
              issues.push({
                type: 'open-redirect',
                severity: 'medium',
                description: '发现开放重定向漏洞：重定向URL未正确验证',
              });
            }
          }
        } catch {
          // 忽略错误
        }
      }

      return {
        vulnerable: issues.length > 0,
        issues,
      };
    } catch {
      return {
        vulnerable: false,
        issues: [],
      };
    }
  }

  /**
   * 检查配置
   */
  private async checkConfiguration(
    url: string,
    config: SecurityTestConfig
  ): Promise<{
    score: number;
    methods: string[];
    cors: {
      enabled: boolean;
      origins: string[];
      credentials: boolean;
    };
    authentication: {
      required: boolean;
      methods: string[];
    };
    issues: string[];
  }> {
    if (!config.checkConfiguration) {
      return {
        score: 0,
        methods: [],
        cors: {
          enabled: false,
          origins: [],
          credentials: false,
        },
        authentication: {
          required: false,
          methods: [],
        },
        issues: ['配置检查已禁用'],
      };
    }

    try {
      const issues: string[] = [];
      let score = 100;

      // 检查支持的HTTP方法
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
      const supportedMethods: string[] = [];

      for (const method of methods) {
        try {
          await axios({
            method,
            url,
            timeout: 5000,
            validateStatus: () => true,
          });
          supportedMethods.push(method);
        } catch {
          // 方法不支持
        }
      }

      // 检查CORS配置
      const corsConfig = {
        enabled: false,
        origins: [] as string[],
        credentials: false,
      };

      try {
        const optionsResponse = await axios.options(url, { timeout: 5000 });
        const corsHeaders = optionsResponse.headers;

        if (corsHeaders['access-control-allow-origin']) {
          corsConfig.enabled = true;
          corsConfig.origins = Array.isArray(corsHeaders['access-control-allow-origin'])
            ? (corsHeaders['access-control-allow-origin'] as string[])
            : [corsHeaders['access-control-allow-origin'] as string];
          corsConfig.credentials = corsHeaders['access-control-allow-credentials'] === 'true';
        }
      } catch {
        // OPTIONS不支持
      }

      // 检查认证要求
      const authConfig = {
        required: false,
        methods: [] as string[],
      };

      for (const method of supportedMethods) {
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
          try {
            await axios({
              method,
              url,
              timeout: 5000,
              validateStatus: status => status !== 401 && status !== 403,
            });
          } catch (error) {
            if (
              axios.isAxiosError(error) &&
              (error.response?.status === 401 || error.response?.status === 403)
            ) {
              authConfig.required = true;
              authConfig.methods.push(method);
            }
          }
        }
      }

      // 评估配置安全性
      if (corsConfig.enabled && corsConfig.origins.includes('*')) {
        issues.push('CORS配置过于宽松，允许所有来源');
        score -= 20;
      }

      if (!authConfig.required && supportedMethods.includes('POST')) {
        issues.push('POST请求未要求身份验证');
        score -= 25;
      }

      if (supportedMethods.includes('DELETE') && !authConfig.methods.includes('DELETE')) {
        issues.push('DELETE请求未要求身份验证');
        score -= 30;
      }

      return {
        score: Math.max(0, score),
        methods: supportedMethods,
        cors: corsConfig,
        authentication: authConfig,
        issues,
      };
    } catch {
      return {
        score: 0,
        methods: [],
        cors: {
          enabled: false,
          origins: [],
          credentials: false,
        },
        authentication: {
          required: false,
          methods: [],
        },
        issues: ['无法检查配置'],
      };
    }
  }

  /**
   * 生成建议
   */
  private generateRecommendations(results: {
    ssl: {
      enabled: boolean;
      daysUntilExpiry: number;
      issues: string[];
    };
    headers: {
      missing: string[];
    };
    vulnerabilities: {
      issues: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
      }>;
    };
    configuration: {
      issues: string[];
    };
  }): Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    category: string;
    effort: 'low' | 'medium' | 'high';
  }> {
    const recommendations: Array<{
      priority: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      category: string;
      effort: 'low' | 'medium' | 'high';
    }> = [];

    // SSL建议
    if (!results.ssl.enabled) {
      recommendations.push({
        priority: 'high',
        title: '启用HTTPS',
        description: '为网站启用SSL/TLS加密以保护数据传输安全',
        category: 'ssl',
        effort: 'medium',
      });
    }

    if (results.ssl.daysUntilExpiry < 30) {
      recommendations.push({
        priority: 'high',
        title: '更新SSL证书',
        description: `SSL证书将在${results.ssl.daysUntilExpiry}天内过期，请及时更新`,
        category: 'ssl',
        effort: 'low',
      });
    }

    // 安全头建议
    results.headers.missing.forEach((header: string) => {
      recommendations.push({
        priority: 'medium',
        title: `添加${header}头`,
        description: `添加${this.securityHeaders[header]}以提高安全性`,
        category: 'headers',
        effort: 'low',
      });
    });

    // 漏洞建议
    results.vulnerabilities.issues.forEach(issue => {
      recommendations.push({
        priority:
          issue.severity === 'critical' ? 'high' : issue.severity === 'high' ? 'medium' : 'low',
        title: `修复${issue.type}漏洞`,
        description: issue.description,
        category: 'vulnerabilities',
        effort: issue.severity === 'critical' ? 'high' : 'medium',
      });
    });

    // 配置建议
    results.configuration.issues.forEach((issue: string) => {
      recommendations.push({
        priority: 'medium',
        title: '改进安全配置',
        description: issue,
        category: 'configuration',
        effort: 'medium',
      });
    });

    return recommendations;
  }

  /**
   * 生成摘要
   */
  private generateSummary(issues: Array<{ severity: string }>): {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  } {
    const summary = {
      totalIssues: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      highIssues: issues.filter(i => i.severity === 'high').length,
      mediumIssues: issues.filter(i => i.severity === 'medium').length,
      lowIssues: issues.filter(i => i.severity === 'low').length,
    };

    return summary;
  }

  /**
   * 获取等级
   */
  private getGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return `security_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()).slice(0, 10),
    };
  }
}

export default SecurityTestCore;
