/**
 * 安全测试引擎
 * 提供真实的安全扫描、SSL检测、头部分析、漏洞检测等功能
 *
 * 增强功能:
 * - WebSocket实时进度通知
 * - 告警系统集成
 * - 测试ID支持
 */

const { URL } = require('url');
const tls = require('tls');
const axios = require('axios');
const SecurityHeadersAnalyzer = require('./analyzers/securityHeadersAnalyzer');
const { emitTestProgress, emitTestComplete, emitTestError } = require('../../websocket/testEvents');
const { getAlertManager } = require('../../alert/AlertManager');
const Logger = require('../../utils/logger');

type SecurityHeaderMissing = {
  name: string;
  importance: 'high' | 'medium' | 'low';
};

type VulnerabilityItem = {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence?: string;
};

type VulnerabilityAnalysis = {
  xss: { vulnerabilities: VulnerabilityItem[]; summary: { totalTests: number; riskLevel: string } };
  sqlInjection: {
    vulnerabilities: VulnerabilityItem[];
    summary: { totalTests: number; riskLevel: string };
  };
  other: VulnerabilityItem[];
};

type SecurityAnalyses = {
  ssl?: { score: number; issues?: string[]; enabled?: boolean };
  headers?: { score: number; missingHeaders?: SecurityHeaderMissing[] };
  vulnerabilities?: {
    xss?: { vulnerabilities: VulnerabilityItem[] };
    sqlInjection?: { vulnerabilities: VulnerabilityItem[] };
    other?: VulnerabilityItem[];
  };
  informationDisclosure?: { score: number; issues?: string[] };
  accessControl?: { score: number; issues?: string[] };
};

type SSLAnalysis = {
  enabled: boolean;
  version: string;
  certificate: { valid: boolean; issuer: string; expires: string | null };
  score: number;
  issues: string[];
};

type HeadersAnalysis = {
  score: number;
  headers: unknown;
  missingHeaders: SecurityHeaderMissing[];
  warnings: string[];
};

type InfoDisclosureAnalysis = {
  score: number;
  issues: string[];
  warnings: string[];
};

type AccessControlAnalysis = {
  score: number;
  issues: string[];
  warnings: string[];
};

class SecurityTestEngine {
  name: string;
  version: string;
  description: string;
  options: Record<string, unknown>;
  activeTests: Map<string, Record<string, unknown>>;
  progressCallback: ((progress: Record<string, unknown>) => void) | null;
  completionCallback: ((results: Record<string, unknown>) => void) | null;
  errorCallback: ((error: Error) => void) | null;
  alertManager: {
    checkAlert?: (type: string, payload: Record<string, unknown>) => Promise<void>;
  } | null;
  constructor(options: Record<string, unknown> = {}) {
    this.name = 'security';
    this.version = '3.0.0';
    this.description = '安全测试引擎 - 支持实时通知和告警';
    this.options = {
      timeout: process.env.REQUEST_TIMEOUT || 30000,
      userAgent: 'Security-Scanner/3.0.0',
      ...options,
    };
    this.activeTests = new Map();
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;

    // 初始化告警管理器
    this.alertManager = null;
    try {
      this.alertManager = getAlertManager();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Logger.warn('告警管理器未初始化:', message);
    }
  }

  updateTestProgress(
    testId: string,
    progress: number,
    message: string,
    stage = 'running',
    extra: Record<string, unknown> = {}
  ) {
    const test = this.activeTests.get(testId) || { status: 'running' };
    this.activeTests.set(testId, {
      ...test,
      progress,
      message,
      lastUpdate: Date.now(),
    });

    emitTestProgress(testId, {
      stage,
      progress,
      message,
      ...extra,
    });

    if (this.progressCallback) {
      this.progressCallback({
        testId,
        progress,
        message,
        status: test.status || 'running',
      });
    }
  }

  getTestStatus(testId: string) {
    return this.activeTests.get(testId);
  }

  async stopTest(testId: string) {
    const test = this.activeTests.get(testId);
    if (test) {
      this.activeTests.set(testId, {
        ...test,
        status: 'cancelled',
      });
      return true;
    }
    return false;
  }

  setProgressCallback(callback: (progress: Record<string, unknown>) => void) {
    this.progressCallback = callback;
  }

  setCompletionCallback(callback: (results: Record<string, unknown>) => void) {
    this.completionCallback = callback;
  }

  setErrorCallback(callback: (error: Error) => void) {
    this.errorCallback = callback;
  }

  /**
   * 检查引擎可用性
   */
  checkAvailability() {
    return {
      engine: this.name,
      available: true,
      version: this.version,
      features: ['security-testing', 'vulnerability-scanning', 'ssl-analysis', 'security-headers'],
    };
  }

  /**
   * 执行安全测试
   */
  async executeTest(config: { testId?: string; url?: string; enableDeepScan?: boolean }) {
    const testId = config.testId || `security-${Date.now()}`;
    const { url } = config;
    if (!url) {
      throw new Error('安全测试URL不能为空');
    }

    try {
      Logger.info(`🚀 开始安全测试: ${testId} - ${url}`);

      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now(),
      });

      // 发送测试开始事件
      this.updateTestProgress(testId, 0, '安全扫描开始', 'started', { url });

      const results = await this.performSecurityScan(url, { testId });

      const warnings: string[] = [];
      const errors: string[] = [];
      const checks = (results as { checks?: Record<string, unknown> }).checks || {};
      const sslIssues = (checks as { ssl?: { issues?: string[] } }).ssl?.issues || [];
      const headerWarnings =
        (checks as { headers?: { warnings?: string[] } }).headers?.warnings || [];
      const infoIssues =
        (checks as { informationDisclosure?: { issues?: string[] } }).informationDisclosure
          ?.issues || [];
      const infoWarnings =
        (checks as { informationDisclosure?: { warnings?: string[] } }).informationDisclosure
          ?.warnings || [];
      const accessIssues =
        (checks as { accessControl?: { issues?: string[] } }).accessControl?.issues || [];
      const accessWarnings =
        (checks as { accessControl?: { warnings?: string[] } }).accessControl?.warnings || [];
      errors.push(...sslIssues, ...infoIssues, ...accessIssues);
      warnings.push(...headerWarnings, ...infoWarnings, ...accessWarnings);

      const vulnerabilities = (
        checks as {
          vulnerabilities?: {
            xss?: { vulnerabilities?: Array<{ severity?: string; description?: string }> };
            sqlInjection?: { vulnerabilities?: Array<{ severity?: string; description?: string }> };
            other?: Array<{ severity?: string; description?: string }>;
          };
        }
      ).vulnerabilities;
      const vulnerabilityLists = [
        ...(vulnerabilities?.xss?.vulnerabilities || []),
        ...(vulnerabilities?.sqlInjection?.vulnerabilities || []),
        ...(vulnerabilities?.other || []),
      ];
      vulnerabilityLists.forEach(item => {
        const severity = (item.severity || 'low').toLowerCase();
        const description = item.description || '安全漏洞';
        if (severity === 'critical' || severity === 'high') {
          errors.push(String(description));
        } else {
          warnings.push(String(description));
        }
      });

      const normalizedResult = {
        testId,
        status: 'completed',
        score:
          (results as { score?: number }).score ??
          (results as { summary?: { securityScore?: number } }).summary?.securityScore ??
          0,
        summary: (results as { summary?: Record<string, unknown> }).summary || {},
        metrics:
          (results as { metrics?: Record<string, unknown> }).metrics ||
          (results as { summary?: Record<string, unknown> }).summary ||
          {},
        warnings,
        errors,
        recommendations:
          (results as { recommendations?: Record<string, unknown> }).recommendations || {},
        details: results,
      };

      const finalResult = {
        engine: this.name,
        version: this.version,
        success: true,
        testId,
        results: normalizedResult,
        status: normalizedResult.status,
        score: normalizedResult.score,
        summary: normalizedResult.summary,
        warnings: normalizedResult.warnings,
        errors: normalizedResult.errors,
        recommendations: normalizedResult.recommendations,
        timestamp: new Date().toISOString(),
      };

      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results: normalizedResult,
      });
      if (this.completionCallback) {
        this.completionCallback(finalResult);
      }

      // 发送完成事件
      emitTestComplete(testId, finalResult);

      Logger.info(`✅ 安全测试完成: ${testId}`);

      return finalResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Logger.error(`❌ 安全测试失败: ${testId}`, message);

      const startTimestamp = this.activeTests.get(testId)?.startTime;
      const startAt = typeof startTimestamp === 'number' ? new Date(startTimestamp) : new Date();
      const errorResult = {
        engine: this.name,
        version: this.version,
        success: false,
        testId,
        url,
        error: message,
        status: 'failed',
        score: 0,
        summary: {},
        metrics: {},
        warnings: [],
        errors: [message],
        timestamp: new Date().toISOString(),
        startTime: startAt.toISOString(),
        endTime: new Date().toISOString(),
      };

      this.activeTests.set(testId, {
        status: 'failed',
        error: message,
      });
      if (this.errorCallback) {
        this.errorCallback(error instanceof Error ? error : new Error(message));
      }

      // 发送错误事件
      emitTestError(testId, {
        error: message,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // 触发错误告警
      if (this.alertManager?.checkAlert) {
        await this.alertManager.checkAlert('TEST_FAILURE', {
          testId,
          testType: 'security',
          url,
          error: message,
        });
      }

      return errorResult;
    }
  }

  /**
   * 执行安全扫描
   */
  async performSecurityScan(
    url: string,
    options: { testId?: string; enableDeepScan?: boolean; page?: unknown } = {}
  ) {
    const startTime = Date.now();
    const urlObj = new URL(url);
    const testId = options.testId;

    try {
      Logger.info(`🔍 开始全面安全扫描: ${url}`);

      // 发送进度: SSL分析
      if (testId) {
        this.updateTestProgress(testId, 10, '分析SSL/TLS配置...', 'running');
      }

      // 初始化漏洞分析器
      const XSSAnalyzer = require('./analyzers/XSSAnalyzer');
      const SQLInjectionAnalyzer = require('./analyzers/SQLInjectionAnalyzer');

      const xssAnalyzer = new XSSAnalyzer();
      const sqlAnalyzer = new SQLInjectionAnalyzer();

      // 并行执行基础安全检查
      const [sslAnalysis, headersAnalysis, informationDisclosure, accessControl]: [
        SSLAnalysis,
        HeadersAnalysis,
        InfoDisclosureAnalysis,
        AccessControlAnalysis,
      ] = await Promise.all([
        this.analyzeSSL(urlObj),
        this.analyzeSecurityHeaders(url),
        this.checkInformationDisclosure(url),
        this.testAccessControl(url),
      ]);

      // 发送进度: 基础检查完成
      if (testId) {
        this.updateTestProgress(testId, 40, 'SSL和安全头部分析完成', 'running');
      }

      // 深度漏洞扫描（需要浏览器环境）
      let vulnerabilityAnalysis: VulnerabilityAnalysis = {
        xss: { vulnerabilities: [], summary: { totalTests: 0, riskLevel: 'low' } },
        sqlInjection: { vulnerabilities: [], summary: { totalTests: 0, riskLevel: 'low' } },
        other: [],
      };

      if (options.enableDeepScan && options.page) {
        Logger.info('🔍 开始深度漏洞扫描...');

        if (testId) {
          this.updateTestProgress(testId, 50, '执行深度漏洞扫描...', 'running');
        }

        try {
          // XSS漏洞检测
          const xssResults = await xssAnalyzer.analyze(url, {
            timeout: this.options.timeout as number,
            userAgent: this.options.userAgent as string,
            testHeaders: true,
            testCookies: true,
            delay: 100,
            headless: true,
          });
          vulnerabilityAnalysis.xss = xssResults;

          // SQL注入漏洞检测
          const sqlResults = await sqlAnalyzer.analyze(url, {
            timeout: this.options.timeout as number,
            userAgent: this.options.userAgent as string,
            followRedirects: true,
            maxRedirects: 5,
            testHeaders: true,
            testCookies: true,
            delay: 100,
          });
          vulnerabilityAnalysis.sqlInjection = sqlResults;

          // 其他漏洞检测
          const otherVulns = await this.scanOtherVulnerabilities(undefined, url);
          vulnerabilityAnalysis.other = otherVulns;
        } catch (deepScanError) {
          const message =
            deepScanError instanceof Error ? deepScanError.message : String(deepScanError);
          console.warn('⚠️ 深度扫描部分失败:', message);
        }
      } else {
        Logger.info('🔍 执行快速安全扫描...');

        if (testId) {
          this.updateTestProgress(testId, 50, '执行快速漏洞扫描...', 'running');
        }

        vulnerabilityAnalysis = await this.performQuickVulnerabilityScan(url);
      }

      const endTime = Date.now();

      // 发送进度: 分析结果
      if (testId) {
        this.updateTestProgress(testId, 80, '分析安全测试结果...', 'analyzing');
      }

      // 计算总体安全评分（增强版）
      const overallScore = this.calculateSecurityScore({
        ssl: sslAnalysis,
        headers: headersAnalysis,
        vulnerabilities: vulnerabilityAnalysis,
        informationDisclosure,
        accessControl,
      });

      const securityRating = this.calculateRiskRating(vulnerabilityAnalysis);

      const complianceStatus = this.assessComplianceStatus({
        ssl: sslAnalysis,
        headers: headersAnalysis,
        vulnerabilities: vulnerabilityAnalysis,
        informationDisclosure,
        accessControl,
      });

      const recommendations = this.generateSecurityRecommendations({
        ssl: sslAnalysis,
        headers: headersAnalysis,
        vulnerabilities: vulnerabilityAnalysis,
        informationDisclosure,
        accessControl,
      });

      const results = {
        url,
        timestamp: new Date().toISOString(),
        duration: endTime - startTime,
        score: overallScore,
        rating: securityRating,
        compliance: complianceStatus,
        summary: {
          totalIssues: this.countTotalSecurityIssues({
            ssl: sslAnalysis,
            headers: headersAnalysis,
            vulnerabilities: vulnerabilityAnalysis,
            informationDisclosure,
            accessControl,
          }),
          criticalIssues: this.countCriticalVulnerabilities(vulnerabilityAnalysis),
          highRiskIssues: this.countHighRiskIssues(vulnerabilityAnalysis),
          recommendations: recommendations.immediate.length + recommendations.shortTerm.length,
        },
        checks: {
          ssl: sslAnalysis,
          headers: headersAnalysis,
          informationDisclosure,
          accessControl,
          vulnerabilities: vulnerabilityAnalysis,
        },
        recommendations,
        detailedAnalysis: {
          threatIntelligence: this.generateThreatIntelligence(vulnerabilityAnalysis),
        },
      };

      if (testId) {
        this.updateTestProgress(testId, 100, '安全测试完成', 'completed');
      }

      return {
        success: true,
        testId,
        url,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration: endTime - startTime,
        results,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Logger.error(`❌ 安全扫描失败: ${url}`, message);

      if (testId) {
        this.updateTestProgress(testId, 100, '安全测试失败', 'failed');
      }

      return {
        success: false,
        testId,
        url,
        error: message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async analyzeSSL(urlObj: {
    protocol: string;
    hostname: string;
    port?: string;
  }): Promise<SSLAnalysis> {
    if (urlObj.protocol !== 'https:') {
      return {
        enabled: false,
        version: 'unknown',
        certificate: {
          valid: false,
          issuer: '',
          expires: null,
        },
        score: 0,
        issues: ['未启用HTTPS'],
      };
    }

    const hostname = urlObj.hostname;
    const port = urlObj.port ? Number(urlObj.port) : 443;

    return new Promise(resolve => {
      const socket = tls.connect(
        {
          host: hostname,
          port,
          servername: hostname,
        },
        () => {
          const cert = socket.getPeerCertificate(true) || {};
          const expiresAt = cert.valid_to ? new Date(cert.valid_to) : null;
          const daysUntilExpiry = expiresAt
            ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : 0;
          const selfSigned =
            cert.issuer && cert.subject ? cert.issuer.CN === cert.subject.CN : false;

          const issues: string[] = [];
          let score = 100;

          if (!socket.authorized) {
            issues.push('SSL证书无效或不被信任');
            score -= 40;
          }
          if (selfSigned) {
            issues.push('使用自签名证书');
            score -= 20;
          }
          if (daysUntilExpiry > 0 && daysUntilExpiry < 30) {
            issues.push(`SSL证书将在${daysUntilExpiry}天内过期`);
            score -= 15;
          }

          const protocol = socket.getProtocol() || 'unknown';
          if (protocol !== 'TLSv1.2' && protocol !== 'TLSv1.3') {
            issues.push(`使用不安全的协议: ${protocol}`);
            score -= 15;
          }

          resolve({
            enabled: true,
            version: protocol,
            certificate: {
              valid: socket.authorized || false,
              issuer: cert.issuer?.CN || '',
              expires: expiresAt ? expiresAt.toISOString() : null,
            },
            score: Math.max(0, score),
            issues,
          });
        }
      );

      socket.setTimeout(10000, () => {
        socket.destroy();
        resolve({
          enabled: true,
          version: 'unknown',
          certificate: { valid: false, issuer: '', expires: null },
          score: 0,
          issues: ['SSL连接超时'],
        });
      });

      socket.on('error', () => {
        resolve({
          enabled: true,
          version: 'unknown',
          certificate: { valid: false, issuer: '', expires: null },
          score: 0,
          issues: ['无法获取SSL证书信息'],
        });
      });
    });
  }

  async analyzeSecurityHeaders(url: string): Promise<HeadersAnalysis> {
    const analyzer = new SecurityHeadersAnalyzer();
    const analysis = await analyzer.analyze(url, {
      timeout: Number(this.options.timeout) || 30000,
      userAgent: this.options.userAgent as string,
      followRedirects: true,
      maxRedirects: 5,
    });

    const importanceMap: Record<string, 'high' | 'medium' | 'low'> = {
      'Content-Security-Policy': 'high',
      'Strict-Transport-Security': 'high',
      'X-Frame-Options': 'high',
      'X-Content-Type-Options': 'high',
      'X-XSS-Protection': 'medium',
      'Referrer-Policy': 'medium',
      'Permissions-Policy': 'medium',
      'Cross-Origin-Embedder-Policy': 'low',
      'Cross-Origin-Opener-Policy': 'low',
      'Cross-Origin-Resource-Policy': 'low',
    };

    const missingHeaders = (analysis.headers as Array<{ header: string; present: boolean }>)
      .filter(header => !header.present)
      .map(header => ({
        name: header.header,
        importance: importanceMap[header.header] || 'low',
      }));

    const warnings = (
      analysis.headers as Array<{ header: string; present: boolean; valid: boolean }>
    )
      .filter(header => header.present && !header.valid)
      .map(header => `安全头配置不符合要求: ${header.header}`);

    return {
      score: analysis.overall.score,
      headers: analysis.headers,
      missingHeaders,
      warnings,
    };
  }

  async checkInformationDisclosure(url: string): Promise<InfoDisclosureAnalysis> {
    const result = {
      score: 100,
      issues: [] as string[],
      warnings: [] as string[],
    };

    try {
      const response = await axios.get(url, {
        timeout: Number(this.options.timeout) || 15000,
        headers: { 'User-Agent': this.options.userAgent as string },
      });

      const headers = response.headers || {};
      const disclosedHeaders = ['server', 'x-powered-by', 'x-aspnet-version'];
      disclosedHeaders.forEach(header => {
        if (headers[header]) {
          result.issues.push(`响应头暴露敏感信息: ${header}`);
          result.score -= 10;
        }
      });

      const body = typeof response.data === 'string' ? response.data : '';
      const leakagePatterns = ['Stack trace', 'Traceback', 'Exception', 'SQLSTATE'];
      leakagePatterns.forEach(pattern => {
        if (body.includes(pattern)) {
          result.issues.push(`页面内容疑似泄露错误信息: ${pattern}`);
          result.score -= 15;
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.warnings.push(`无法检查信息泄露: ${message}`);
      result.score = Math.max(0, result.score - 10);
    }

    result.score = Math.max(0, result.score);
    return result;
  }

  async testAccessControl(url: string): Promise<AccessControlAnalysis> {
    const result = {
      score: 100,
      issues: [] as string[],
      warnings: [] as string[],
    };

    const target = new URL(url);
    const sensitivePaths = ['/admin', '/admin/login', '/dashboard', '/config', '/.env'];

    await Promise.all(
      sensitivePaths.map(async path => {
        try {
          const response = await axios.get(`${target.origin}${path}`, {
            timeout: 8000,
            maxRedirects: 0,
            validateStatus: (status: number) => status >= 200 && status < 500,
            headers: { 'User-Agent': this.options.userAgent as string },
          });

          if (response.status === 200) {
            result.issues.push(`疑似未授权访问敏感路径: ${path}`);
            result.score -= 15;
          } else if (
            response.status === 302 ||
            response.status === 401 ||
            response.status === 403
          ) {
            result.warnings.push(`敏感路径受限: ${path}`);
          }
        } catch {
          result.warnings.push(`无法验证访问控制: ${path}`);
        }
      })
    );

    result.score = Math.max(0, result.score);
    return result;
  }

  async scanOtherVulnerabilities(_page: unknown, url: string) {
    const issues: VulnerabilityItem[] = [];

    const redirectPayloads = ['http://evil.com', '//evil.com', 'javascript:alert(1)'];
    for (const payload of redirectPayloads) {
      try {
        const response = await axios.get(url, {
          params: { redirect: payload },
          timeout: 5000,
          maxRedirects: 0,
          validateStatus: (status: number) => status >= 200 && status < 500,
        });
        if (response.status >= 300 && response.status < 400) {
          issues.push({
            type: 'open-redirect',
            severity: 'medium',
            description: '检测到开放重定向风险',
          });
          break;
        }
      } catch {
        // ignore
      }
    }

    const traversalPayloads = ['../etc/passwd', '..\\..\\windows\\system32\\drivers\\etc\\hosts'];
    for (const payload of traversalPayloads) {
      try {
        const response = await axios.get(url, {
          params: { file: payload },
          timeout: 5000,
          validateStatus: (status: number) => status >= 200 && status < 500,
        });
        const body = typeof response.data === 'string' ? response.data : '';
        if (body.includes('root:x:0:0') || body.includes('localhost')) {
          issues.push({
            type: 'directory-traversal',
            severity: 'high',
            description: '检测到目录遍历风险',
          });
          break;
        }
      } catch {
        // ignore
      }
    }

    return issues;
  }

  async performQuickVulnerabilityScan(url: string) {
    const XSSAnalyzer = require('./analyzers/XSSAnalyzer');
    const SQLInjectionAnalyzer = require('./analyzers/SQLInjectionAnalyzer');
    const xssAnalyzer = new XSSAnalyzer();
    const sqlAnalyzer = new SQLInjectionAnalyzer();

    const buildRiskLevel = (vulnerabilities: Array<{ severity: string }>) => {
      if (vulnerabilities.some(v => v.severity === 'critical')) return 'critical';
      if (vulnerabilities.some(v => v.severity === 'high')) return 'high';
      if (vulnerabilities.some(v => v.severity === 'medium')) return 'medium';
      return 'low';
    };

    const [xssResult, sqlResult, other] = await Promise.all([
      xssAnalyzer
        .analyze(url, {
          timeout: this.options.timeout as number,
          userAgent: this.options.userAgent as string,
          testHeaders: false,
          testCookies: false,
          delay: 50,
          headless: true,
        })
        .catch(() => ({ vulnerabilities: [], summary: { totalTests: 0 } })),
      sqlAnalyzer
        .analyze(url, {
          timeout: this.options.timeout as number,
          userAgent: this.options.userAgent as string,
          followRedirects: true,
          maxRedirects: 3,
          testHeaders: false,
          testCookies: false,
          delay: 50,
        })
        .catch(() => ({ vulnerabilities: [], summary: { totalTests: 0 } })),
      this.scanOtherVulnerabilities(undefined, url).catch(() => []),
    ]);

    return {
      xss: {
        ...xssResult,
        summary: {
          totalTests: xssResult.summary?.totalTests || 0,
          riskLevel: buildRiskLevel(xssResult.vulnerabilities || []),
        },
      },
      sqlInjection: {
        ...sqlResult,
        summary: {
          totalTests: sqlResult.summary?.totalTests || 0,
          riskLevel: buildRiskLevel(sqlResult.vulnerabilities || []),
        },
      },
      other,
    };
  }

  calculateSecurityScore(analyses: SecurityAnalyses) {
    let totalScore = 0;
    let totalWeight = 0;
    const weights = {
      ssl: 0.3,
      headers: 0.2,
      vulnerabilities: 0.3,
      informationDisclosure: 0.1,
      accessControl: 0.1,
    };

    if (analyses.ssl && analyses.ssl.score !== undefined) {
      totalScore += analyses.ssl.score * weights.ssl;
      totalWeight += weights.ssl;
    }

    if (analyses.headers && analyses.headers.score !== undefined) {
      totalScore += analyses.headers.score * weights.headers;
      totalWeight += weights.headers;
    }

    if (analyses.vulnerabilities) {
      let vulnScore = 100;
      const { xss, sqlInjection } = analyses.vulnerabilities;
      if (xss && xss.vulnerabilities) {
        vulnScore -= xss.vulnerabilities.filter(v => v.severity === 'critical').length * 25;
        vulnScore -= xss.vulnerabilities.filter(v => v.severity === 'high').length * 15;
        vulnScore -= xss.vulnerabilities.filter(v => v.severity === 'medium').length * 8;
      }
      if (sqlInjection && sqlInjection.vulnerabilities) {
        vulnScore -=
          sqlInjection.vulnerabilities.filter(v => v.severity === 'critical').length * 30;
        vulnScore -= sqlInjection.vulnerabilities.filter(v => v.severity === 'high').length * 20;
        vulnScore -= sqlInjection.vulnerabilities.filter(v => v.severity === 'medium').length * 10;
      }
      if (analyses.vulnerabilities.other) {
        vulnScore -= analyses.vulnerabilities.other.filter(v => v.severity === 'high').length * 12;
        vulnScore -= analyses.vulnerabilities.other.filter(v => v.severity === 'medium').length * 8;
      }

      vulnScore = Math.max(0, vulnScore);
      totalScore += vulnScore * weights.vulnerabilities;
      totalWeight += weights.vulnerabilities;
    }

    if (analyses.informationDisclosure && analyses.informationDisclosure.score !== undefined) {
      totalScore += analyses.informationDisclosure.score * weights.informationDisclosure;
      totalWeight += weights.informationDisclosure;
    }

    if (analyses.accessControl && analyses.accessControl.score !== undefined) {
      totalScore += analyses.accessControl.score * weights.accessControl;
      totalWeight += weights.accessControl;
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  calculateRiskRating(vulnerabilities: VulnerabilityAnalysis) {
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;

    [vulnerabilities.xss, vulnerabilities.sqlInjection].forEach(vulnCategory => {
      if (vulnCategory && vulnCategory.vulnerabilities) {
        vulnCategory.vulnerabilities.forEach(vuln => {
          if (vuln.severity === 'critical') criticalCount++;
          else if (vuln.severity === 'high') highCount++;
          else if (vuln.severity === 'medium') mediumCount++;
        });
      }
    });

    if (vulnerabilities.other) {
      vulnerabilities.other.forEach(vuln => {
        if (vuln.severity === 'critical') criticalCount++;
        else if (vuln.severity === 'high') highCount++;
        else if (vuln.severity === 'medium') mediumCount++;
      });
    }

    if (criticalCount > 0) return 'Critical';
    if (highCount > 2) return 'High';
    if (highCount > 0 || mediumCount > 3) return 'Medium';
    if (mediumCount > 0) return 'Low';
    return 'Minimal';
  }

  countCriticalVulnerabilities(vulnerabilities: VulnerabilityAnalysis) {
    let count = 0;

    if (vulnerabilities.xss && vulnerabilities.xss.vulnerabilities) {
      count += vulnerabilities.xss.vulnerabilities.filter(v => v.severity === 'critical').length;
    }

    if (vulnerabilities.sqlInjection && vulnerabilities.sqlInjection.vulnerabilities) {
      count += vulnerabilities.sqlInjection.vulnerabilities.filter(
        v => v.severity === 'critical'
      ).length;
    }

    if (vulnerabilities.other) {
      count += vulnerabilities.other.filter(v => v.severity === 'critical').length;
    }

    return count;
  }

  countHighRiskIssues(vulnerabilities: VulnerabilityAnalysis) {
    let count = 0;

    if (vulnerabilities.xss && vulnerabilities.xss.vulnerabilities) {
      count += vulnerabilities.xss.vulnerabilities.filter(v => v.severity === 'high').length;
    }

    if (vulnerabilities.sqlInjection && vulnerabilities.sqlInjection.vulnerabilities) {
      count += vulnerabilities.sqlInjection.vulnerabilities.filter(
        v => v.severity === 'high'
      ).length;
    }

    if (vulnerabilities.other) {
      count += vulnerabilities.other.filter(v => v.severity === 'high').length;
    }

    return count;
  }

  countTotalSecurityIssues(analyses: SecurityAnalyses) {
    let count = 0;

    if (analyses.ssl?.issues) {
      count += analyses.ssl.issues.length;
    }

    if (analyses.headers?.missingHeaders) {
      count += analyses.headers.missingHeaders.filter(h => h.importance === 'high').length;
    }

    if (analyses.vulnerabilities) {
      if (analyses.vulnerabilities.xss?.vulnerabilities) {
        count += analyses.vulnerabilities.xss.vulnerabilities.length;
      }
      if (analyses.vulnerabilities.sqlInjection?.vulnerabilities) {
        count += analyses.vulnerabilities.sqlInjection.vulnerabilities.length;
      }
      if (analyses.vulnerabilities.other) {
        count += analyses.vulnerabilities.other.length;
      }
    }

    return count;
  }

  assessComplianceStatus(analyses: SecurityAnalyses) {
    const compliance = {
      owasp: { status: 'unknown', issues: [] as string[] },
      gdpr: { status: 'unknown', issues: [] as string[] },
      pci: { status: 'unknown', issues: [] as string[] },
    };

    let owaspIssues = 0;
    if (analyses.vulnerabilities) {
      if ((analyses.vulnerabilities.xss?.vulnerabilities.length || 0) > 0) {
        compliance.owasp.issues.push('A03: Injection (XSS)');
        owaspIssues++;
      }
      if ((analyses.vulnerabilities.sqlInjection?.vulnerabilities.length || 0) > 0) {
        compliance.owasp.issues.push('A03: Injection (SQL)');
        owaspIssues++;
      }
      if (analyses.vulnerabilities.other?.some(v => v.type === 'csrf')) {
        compliance.owasp.issues.push('A01: Broken Access Control (CSRF)');
        owaspIssues++;
      }
    }

    compliance.owasp.status =
      owaspIssues === 0 ? 'compliant' : owaspIssues <= 2 ? 'partial' : 'non-compliant';

    if (analyses.ssl && analyses.ssl.enabled && analyses.ssl.score >= 80) {
      compliance.gdpr.status = 'partial';
    } else {
      compliance.gdpr.issues.push('缺少适当的数据传输加密');
      compliance.gdpr.status = 'non-compliant';
    }

    if (analyses.ssl && analyses.ssl.enabled && analyses.headers && analyses.headers.score >= 70) {
      compliance.pci.status = 'partial';
    } else {
      compliance.pci.issues.push('不满足PCI DSS基础安全要求');
      compliance.pci.status = 'non-compliant';
    }

    return compliance;
  }

  generateSecurityRecommendations(analyses: SecurityAnalyses) {
    type RecommendationItem = {
      priority: string;
      issue: string;
      action: string;
      timeframe: string;
    };
    const recommendations: {
      immediate: RecommendationItem[];
      shortTerm: RecommendationItem[];
      longTerm: RecommendationItem[];
      preventive: RecommendationItem[];
    } = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      preventive: [],
    };

    if (analyses.vulnerabilities) {
      if ((analyses.vulnerabilities.sqlInjection?.vulnerabilities.length || 0) > 0) {
        recommendations.immediate.push({
          priority: 'critical',
          issue: 'SQL注入漏洞',
          action: '立即修复所有SQL注入漏洞，使用参数化查询',
          timeframe: '24小时内',
        });
      }
      if ((analyses.vulnerabilities.xss?.vulnerabilities.length || 0) > 0) {
        recommendations.immediate.push({
          priority: 'high',
          issue: 'XSS漏洞',
          action: '对所有用户输入进行输出编码，使用CSP',
          timeframe: '48小时内',
        });
      }
    }

    if (analyses.headers && analyses.headers.missingHeaders) {
      analyses.headers.missingHeaders.forEach((header: SecurityHeaderMissing) => {
        if (header.importance === 'high') {
          recommendations.shortTerm.push({
            priority: 'high',
            issue: `缺少安全头部: ${header.name}`,
            action: `添加 ${header.name} 头部`,
            timeframe: '1周内',
          });
        }
      });
    }

    recommendations.preventive.push({
      priority: 'medium',
      issue: '安全测试流程',
      action: '建立定期安全扫描和渗透测试流程',
      timeframe: '1个月内',
    });

    return recommendations;
  }

  generateThreatIntelligence(vulnerabilities: VulnerabilityAnalysis) {
    const intelligence = {
      threatLevel: 'unknown',
      attackVectors: [] as Array<{ type: string; risk: string; description: string }>,
      mitigationStrategies: [] as string[],
      industryTrends: [] as string[],
    };

    const criticalCount = this.countCriticalVulnerabilities(vulnerabilities);
    const highCount = this.countHighRiskIssues(vulnerabilities);

    if (criticalCount > 0) {
      intelligence.threatLevel = 'critical';
    } else if (highCount > 2) {
      intelligence.threatLevel = 'high';
    } else if (highCount > 0) {
      intelligence.threatLevel = 'medium';
    } else {
      intelligence.threatLevel = 'low';
    }

    if ((vulnerabilities.xss?.vulnerabilities.length || 0) > 0) {
      intelligence.attackVectors.push({
        type: 'Cross-Site Scripting (XSS)',
        risk: 'High',
        description: '攻击者可能通过XSS攻击窃取用户凭据或执行恶意代码',
      });
    }

    if ((vulnerabilities.sqlInjection?.vulnerabilities.length || 0) > 0) {
      intelligence.attackVectors.push({
        type: 'SQL Injection',
        risk: 'Critical',
        description: '攻击者可能通过SQL注入访问或修改数据库数据',
      });
    }

    intelligence.mitigationStrategies = [
      '实施Web应用防火墙(WAF)',
      '建立入侵检测系统(IDS)',
      '定期进行安全扫描和渗透测试',
      '保持软件和依赖项更新',
      '实施最小权限原则',
    ];

    intelligence.industryTrends = [
      '2024年XSS攻击增长了15%',
      'SQL注入仍然是最常见的Web应用漏洞',
      'API安全问题呈上升趋势',
      '供应链攻击成为新的关注点',
    ];

    return intelligence;
  }

  async cleanup() {
    console.log('✅ 安全测试引擎清理完成');
  }
}

module.exports = SecurityTestEngine;

export {};
