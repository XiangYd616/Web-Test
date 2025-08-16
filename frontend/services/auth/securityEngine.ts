
// ==================== 错误类型 ====================

export class SecurityTestError extends Error {
  // 监控和指标收集
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    errorsByType: new Map<string, number>()
  };
  
  private logSuccess(info: any): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    
    // 更新平均响应时间
    const responseTime = info.responseTime || 0;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + responseTime) / 
      this.metrics.successfulRequests;
  }
  
  private logError(error: Error, context: any): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    
    const errorType = error.name || 'UnknownError';
    this.metrics.errorsByType.set(
      errorType, 
      (this.metrics.errorsByType.get(errorType) || 0) + 1
    );
    
    // 发送错误到监控系统
    this.sendErrorToMonitoring(error, context);
  }
  
  private logMetrics(info: any): void {
    // 记录请求指标
    console.debug('API Metrics:', {
      url: info.url,
      method: info.method,
      status: info.status,
      responseTime: info.responseTime
    });
  }
  
  getMetrics(): any {
    return {
      ...this.metrics,
      errorsByType: Object.fromEntries(this.metrics.errorsByType),
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
        : 0
    };
  }
  private async retryRequest(fn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(`请求失败，第${attempt}次重试:`, error.message);
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
}
  }
  public readonly code: string;
  public readonly details: any;
  public readonly timestamp: string;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'SecurityTestError';
    this.code = code;
    this.details = details || {};
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

// ==================== 类型定义 ====================

export interface SecurityTestConfig {
  // 基础配置
  url: string;
  timeout?: number;
  userAgent?: string;

  // 检测模块配置
  modules: {
    ssl?: SSLTestConfig;
    headers?: HeaderTestConfig;
    vulnerabilities?: VulnerabilityTestConfig;
    cookies?: CookieTestConfig;
    content?: ContentTestConfig;
    network?: NetworkTestConfig;
    compliance?: ComplianceTestConfig;
  };

  // 扫描配置
  depth: 'quick' | 'standard' | 'comprehensive' | 'custom';
  concurrent?: boolean;
  retries?: number;

  // 输出配置
  includeRawData?: boolean;
  generateReport?: boolean;
  reportFormat?: 'json' | 'html' | 'pdf';
}

export interface SSLTestConfig {
  enabled: boolean;
  checkCertificate?: boolean;
  checkProtocols?: boolean;
  checkCiphers?: boolean;
  checkChain?: boolean;
  checkOCSP?: boolean;
}

export interface HeaderTestConfig {
  enabled: boolean;
  checkSecurity?: boolean;
  checkCSP?: boolean;
  checkCORS?: boolean;
  checkCaching?: boolean;
  customHeaders?: string[];
}

export interface VulnerabilityTestConfig {
  enabled: boolean;
  checkXSS?: boolean;
  checkSQLInjection?: boolean;
  checkCSRF?: boolean;
  checkPathTraversal?: boolean;
  checkCommandInjection?: boolean;
  checkXXE?: boolean;
  checkOpenRedirect?: boolean;
  checkSensitiveFiles?: boolean;
  customPayloads?: string[];
}

export interface CookieTestConfig {
  enabled: boolean;
  checkSecure?: boolean;
  checkHttpOnly?: boolean;
  checkSameSite?: boolean;
  checkExpiry?: boolean;
}

export interface ContentTestConfig {
  enabled: boolean;
  checkMixedContent?: boolean;
  checkSensitiveData?: boolean;
  checkMetadata?: boolean;
  checkForms?: boolean;
}

export interface NetworkTestConfig {
  enabled: boolean;
  checkDNS?: boolean;
  checkSubdomains?: boolean;
  checkPorts?: boolean;
  checkServices?: boolean;
}

export interface ComplianceTestConfig {
  enabled: boolean;
  standards?: ('OWASP' | 'NIST' | 'ISO27001' | 'GDPR' | 'PCI-DSS')[];
  customRules?: ComplianceRule[];
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  check: (result: SecurityTestResult) => boolean;
}

// ==================== 结果类型 ====================

export interface SecurityTestResult {
  // 基础信息
  id: string;
  url: string;
  timestamp: string;
  duration: number;
  status: 'completed' | 'failed' | 'partial';

  // 总体评估
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

  // 模块结果
  modules: {
    ssl?: SSLTestResult;
    headers?: HeaderTestResult;
    vulnerabilities?: VulnerabilityTestResult;
    cookies?: CookieTestResult;
    content?: ContentTestResult;
    network?: NetworkTestResult;
    compliance?: ComplianceTestResult;
  };

  // 发现的问题
  findings: SecurityFinding[];

  // 修复建议
  recommendations: SecurityRecommendation[];

  // 合规性检查
  compliance: ComplianceResult[];

  // 统计信息
  statistics: TestStatistics;

  // 原始数据（可选）
  rawData?: any;
}

export interface SecurityFinding {
  id: string;
  type: string;
  category: 'ssl' | 'headers' | 'vulnerabilities' | 'cookies' | 'content' | 'network' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  evidence?: any;
  location?: string;
  cwe?: string;
  cvss?: number;
  references?: string[];
}

export interface SecurityRecommendation {
  id: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  solution: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  resources?: string[];
  code?: string;
}

export interface ComplianceResult {
  standard: string;
  score: number;
  status: 'compliant' | 'partial' | 'non-compliant';
  requirements: ComplianceRequirement[];
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  description: string;
  evidence?: any;
}

export interface TestStatistics {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  skippedChecks: number;
  executionTime: number;
  requestCount: number;
  errorCount: number;
}

// ==================== 模块结果类型 ====================

export interface SSLTestResult {
  score: number;
  certificate: CertificateInfo;
  protocols: ProtocolInfo[];
  ciphers: CipherInfo[];
  vulnerabilities: string[];
  recommendations: string[];
}

export interface HeaderTestResult {
  score: number;
  securityHeaders: HeaderCheck[];
  cspAnalysis?: CSPAnalysis;
  corsAnalysis?: CORSAnalysis;
  recommendations: string[];
}

export interface VulnerabilityTestResult {
  score: number;
  vulnerabilities: VulnerabilityInfo[];
  testedPayloads: number;
  successfulPayloads: number;
  recommendations: string[];
}

export interface CookieTestResult {
  score: number;
  cookies: CookieInfo[];
  securityIssues: string[];
  recommendations: string[];
}

export interface ContentTestResult {
  score: number;
  mixedContent: MixedContentInfo[];
  sensitiveData: SensitiveDataInfo[];
  metadata: MetadataInfo;
  recommendations: string[];
}

export interface NetworkTestResult {
  score: number;
  dnsRecords: DNSRecord[];
  subdomains: SubdomainInfo[];
  openPorts: PortInfo[];
  services: ServiceInfo[];
  recommendations: string[];
}

export interface ComplianceTestResult {
  score: number;
  standards: ComplianceResult[];
  overallCompliance: number;
  recommendations: string[];
}

// ==================== 详细信息类型 ====================

export interface CertificateInfo {
  valid: boolean;
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  daysUntilExpiry: number;
  signatureAlgorithm: string;
  keySize: number;
  san: string[];
  chain: CertificateChainInfo[];
}

export interface CertificateChainInfo {
  subject: string;
  issuer: string;
  valid: boolean;
}

export interface ProtocolInfo {
  version: string;
  supported: boolean;
  secure: boolean;
  deprecated: boolean;
}

export interface CipherInfo {
  name: string;
  strength: 'weak' | 'medium' | 'strong';
  keySize: number;
  supported: boolean;
}

export interface HeaderCheck {
  name: string;
  present: boolean;
  value?: string;
  secure: boolean;
  recommendation?: string;
}

export interface CSPAnalysis {
  present: boolean;
  directives: CSPDirective[];
  issues: string[];
  score: number;
}

export interface CSPDirective {
  name: string;
  value: string;
  secure: boolean;
  issues: string[];
}

export interface CORSAnalysis {
  present: boolean;
  allowOrigin: string;
  allowCredentials: boolean;
  allowMethods: string[];
  allowHeaders: string[];
  issues: string[];
}

export interface VulnerabilityInfo {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  payload: string;
  response?: string;
  evidence: any;
  cwe?: string;
  cvss?: number;
}

export interface CookieInfo {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  expires?: string;
  issues: string[];
}

export interface MixedContentInfo {
  type: 'active' | 'passive';
  url: string;
  element: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SensitiveDataInfo {
  type: string;
  pattern: string;
  location: string;
  context: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface MetadataInfo {
  title: string;
  description: string;
  keywords: string[];
  generator: string;
  server: string;
  technologies: string[];
}

export interface DNSRecord {
  type: string;
  name: string;
  value: string;
  ttl: number;
}

export interface SubdomainInfo {
  subdomain: string;
  ip: string;
  status: number;
  title: string;
  technologies: string[];
}

export interface PortInfo {
  port: number;
  protocol: string;
  state: 'open' | 'closed' | 'filtered';
  service?: string;
  version?: string;
}

export interface ServiceInfo {
  name: string;
  version: string;
  port: number;
  vulnerabilities: string[];
}

// ==================== 进度回调类型 ====================

export interface TestProgress {
  phase: 'initializing' | 'scanning' | 'analyzing' | 'reporting' | 'completed';
  progress: number; // 0-100
  currentModule: string;
  currentCheck: string;
  estimatedTimeRemaining?: number;
  statistics?: Partial<TestStatistics>;
}

export type ProgressCallback = (progress: TestProgress) => void;

// ==================== 核心引擎类 ====================

class SecurityEngine {
  private static instance: SecurityEngine;
  private activeTests = new Map<string, AbortController>();

  private constructor() { }

  public static getInstance(): SecurityEngine {
    if (!SecurityEngine.instance) {
      SecurityEngine.instance = new SecurityEngine();
    }
    return SecurityEngine.instance;
  }

  /**
   * 运行安全测试
   */
  async runSecurityTest(
    config: SecurityTestConfig,
    onProgress?: ProgressCallback
  ): Promise<SecurityTestResult> {
    const testId = this.generateTestId();
    const abortController = new AbortController();
    this.activeTests.set(testId, abortController);

    try {
      const startTime = Date.now();

      // 初始化进度
      onProgress?.({
        phase: 'initializing',
        progress: 0,
        currentModule: 'initialization',
        currentCheck: 'Preparing test environment'
      });

      // 验证配置
      this.validateConfig(config);

      // 检查网络连接
      await this.checkNetworkConnectivity(config.url);

      // 创建结果对象
      const result: SecurityTestResult = {
        id: testId,
        url: config.url,
        timestamp: new Date().toISOString(),
        duration: 0,
        status: 'completed',
        overallScore: 0,
        riskLevel: 'low',
        grade: 'A',
        modules: {},
        findings: [],
        recommendations: [],
        compliance: [],
        statistics: {
          totalChecks: 0,
          passedChecks: 0,
          failedChecks: 0,
          warningChecks: 0,
          skippedChecks: 0,
          executionTime: 0,
          requestCount: 0,
          errorCount: 0
        }
      };

      // 执行测试模块
      await this.executeTestModules(config, result, onProgress, abortController.signal);

      // 计算最终分数和等级
      this.calculateFinalScores(result);

      // 生成建议
      this.generateRecommendations(result);

      // 完成测试
      result.duration = Date.now() - startTime;
      result.statistics.executionTime = result.duration;

      onProgress?.({
        phase: 'completed',
        progress: 100,
        currentModule: 'completed',
        currentCheck: 'Test completed successfully',
        statistics: result.statistics
      });

      return result;

    } catch (error) {
      // 增强错误处理
      const enhancedError = this.enhanceError(error, config, testId);

      // 记录错误统计
      this.recordErrorStatistics(error, config);

      throw enhancedError;
    } finally {
      this.activeTests.delete(testId);
    }
  }

  /**
   * 取消测试
   */
  cancelTest(testId: string): boolean {
    const controller = this.activeTests.get(testId);
    if (controller) {
      
        controller.abort();
      this.activeTests.delete(testId);
      return true;
      }
    return false;
  }

  /**
   * 获取预设配置
   */
  getPresetConfigs(): Record<string, Partial<SecurityTestConfig>> {
    return {
      quick: {
        depth: 'quick',
        modules: {
          ssl: { enabled: true, checkCertificate: true },
          headers: { enabled: true, checkSecurity: true },
          vulnerabilities: { enabled: false },
          cookies: { enabled: true, checkSecure: true },
          content: { enabled: true, checkMixedContent: true },
          network: { enabled: false },
          compliance: { enabled: false }
        }
      },
      standard: {
        depth: 'standard',
        modules: {
          ssl: { enabled: true, checkCertificate: true, checkProtocols: true },
          headers: { enabled: true, checkSecurity: true, checkCSP: true },
          vulnerabilities: { enabled: true, checkXSS: true, checkSQLInjection: true },
          cookies: { enabled: true, checkSecure: true, checkHttpOnly: true },
          content: { enabled: true, checkMixedContent: true, checkSensitiveData: true },
          network: { enabled: true, checkDNS: true },
          compliance: { enabled: true, standards: ['OWASP'] }
        }
      },
      comprehensive: {
        depth: 'comprehensive',
        modules: {
          ssl: {
            enabled: true,
            checkCertificate: true,
            checkProtocols: true,
            checkCiphers: true,
            checkChain: true
          },
          headers: {
            enabled: true,
            checkSecurity: true,
            checkCSP: true,
            checkCORS: true
          },
          vulnerabilities: {
            enabled: true,
            checkXSS: true,
            checkSQLInjection: true,
            checkCSRF: true,
            checkPathTraversal: true,
            checkCommandInjection: true,
            checkXXE: true,
            checkOpenRedirect: true,
            checkSensitiveFiles: true
          },
          cookies: {
            enabled: true,
            checkSecure: true,
            checkHttpOnly: true,
            checkSameSite: true
          },
          content: {
            enabled: true,
            checkMixedContent: true,
            checkSensitiveData: true,
            checkMetadata: true
          },
          network: {
            enabled: true,
            checkDNS: true,
            checkSubdomains: true,
            checkPorts: true
          },
          compliance: {
            enabled: true,
            standards: ['OWASP', 'NIST', 'ISO27001']
          }
        }
      }
    };
  }

  private generateTestId(): string {
    return `security-test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  // validateConfig方法已在文件末尾定义，删除重复实现

  private async executeTestModules(
    config: SecurityTestConfig,
    result: SecurityTestResult,
    onProgress?: ProgressCallback,
    signal?: AbortSignal
  ): Promise<void> {
    // 准备阶段
    onProgress?.({
      phase: 'initializing',
      progress: 10,
      currentModule: 'initialization',
      currentCheck: 'Preparing security test'
    });

    if (signal?.aborted) {
      throw new Error('Test was cancelled');
    }

    // 执行完整的安全测试
    onProgress?.({
      phase: 'scanning',
      progress: 30,
      currentModule: 'security',
      currentCheck: 'Running comprehensive security scan'
    });

    try {
      await this.executeFullSecurityTest(config, result, onProgress, signal);
    } catch (error) {
      console.error('Security test failed:', error);
      result.statistics.errorCount++;
      throw error;
    }

    // 分析阶段
    onProgress?.({
      phase: 'analyzing',
      progress: 90,
      currentModule: 'analysis',
      currentCheck: 'Analyzing results and generating report'
    });
  }

  private async executeFullSecurityTest(
    config: SecurityTestConfig,
    result: SecurityTestResult,
    onProgress?: ProgressCallback,
    signal?: AbortSignal
  ): Promise<void> {
    // 构建API请求选项
    const apiOptions = {
      checkSSL: config.modules.ssl?.enabled || false,
      checkHeaders: config.modules.headers?.enabled || false,
      checkVulnerabilities: config.modules.vulnerabilities?.enabled || false,
      checkCookies: config.modules.cookies?.enabled || false,
      timeout: config.timeout || 30000
    };

    onProgress?.({
      phase: 'scanning',
      progress: 50,
      currentModule: 'security',
      currentCheck: 'Executing security tests'
    });

    // 调用完整的安全测试API
    const response = await fetch('/api/test/security', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: config.url,
        options: apiOptions
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Security test failed');
    }

    onProgress?.({
      phase: 'scanning',
      progress: 80,
      currentModule: 'security',
      currentCheck: 'Processing test results'
    });

    // 处理完整的安全测试结果
    this.processFullSecurityResult(data.data, result);
  }

  private processFullSecurityResult(
    securityData: any,
    result: SecurityTestResult
  ): void {
    // 处理SSL/TLS结果
    if (securityData.sslInfo) {
      result.modules.ssl = {
        score: this.calculateSSLScore(securityData),
        certificate: this.extractCertificateInfo(securityData.sslInfo),
        protocols: [],
        ciphers: [],
        vulnerabilities: this.extractSSLVulnerabilities(securityData),
        recommendations: this.generateSSLRecommendations(securityData)
      };
    }

    // 处理安全头结果
    if (securityData.securityHeaders) {
      result.modules.headers = {
        score: this.calculateHeaderScore(securityData),
        securityHeaders: this.extractSecurityHeaders(securityData.securityHeaders),
        recommendations: this.generateHeaderRecommendations(securityData)
      };
    }

    // 处理漏洞扫描结果
    if (securityData.vulnerabilities) {
      result.modules.vulnerabilities = {
        score: this.calculateVulnerabilityScore(securityData),
        vulnerabilities: this.extractVulnerabilities(securityData.vulnerabilities),
        testedPayloads: securityData.testedPayloads || 0,
        successfulPayloads: securityData.vulnerabilities?.length || 0,
        recommendations: this.generateVulnerabilityRecommendations(securityData)
      };
    }

    // 处理Cookie安全结果
    if (securityData.cookieInfo) {
      result.modules.cookies = {
        score: this.calculateCookieScore(securityData),
        cookies: this.extractCookieInfo(securityData.cookieInfo),
        securityIssues: this.extractCookieIssues(securityData),
        recommendations: this.generateCookieRecommendations(securityData)
      };
    }

    // 提取总体发现
    result.findings = this.extractFindings(securityData);

    // 更新统计信息 - 修复统计逻辑
    const vulnerabilitiesCount = securityData.vulnerabilities?.length || 0;
    const warningsCount = securityData.warnings?.length || 0;
    const passedChecks = securityData.passedChecks || 0;

    // 确保统计数据的一致性
    result.statistics.passedChecks = passedChecks;
    result.statistics.failedChecks = vulnerabilitiesCount;
    result.statistics.warningChecks = warningsCount;
    result.statistics.totalChecks = passedChecks + vulnerabilitiesCount + warningsCount;

    // 如果后端提供了总检查数，使用它（但要确保逻辑一致）
    if (securityData.totalChecks && securityData.totalChecks > 0) {
      result.statistics.totalChecks = Math.max(result.statistics.totalChecks, securityData.totalChecks);
    }
  }

  private processSSLResult(data: any): SSLTestResult {
    // 处理SSL测试结果
    return {
      score: data.score || 0,
      certificate: data.certificate || {},
      protocols: data.protocols || [],
      ciphers: data.ciphers || [],
      vulnerabilities: data.vulnerabilities || [],
      recommendations: data.recommendations || []
    };
  }

  private processHeaderResult(data: any): HeaderTestResult {
    // 处理安全头测试结果
    return {
      score: data.score || 0,
      securityHeaders: data.headers || [],
      cspAnalysis: data.csp,
      corsAnalysis: data.cors,
      recommendations: data.recommendations || []
    };
  }

  private processVulnerabilityResult(data: any): VulnerabilityTestResult {
    // 处理漏洞测试结果
    return {
      score: data.score || 0,
      vulnerabilities: data.vulnerabilities || [],
      testedPayloads: data.testedPayloads || 0,
      successfulPayloads: data.successfulPayloads || 0,
      recommendations: data.recommendations || []
    };
  }

  private calculateFinalScores(result: SecurityTestResult): void {
    // 计算总体分数
    const moduleScores = Object.values(result.modules)
      .filter(module => module && typeof module.score === 'number')
      .map(module => module.score);

    if (moduleScores.length > 0) {
      result.overallScore = Math.round(
        moduleScores.reduce((sum, score) => sum + score, 0) / moduleScores.length
      );
    }

    // 汇总所有模块的统计数据
    this.aggregateStatistics(result);

    // 确定风险等级
    if (result.overallScore >= 90) {
      result.riskLevel = 'low';
      result.grade = result.overallScore >= 95 ? 'A+' : 'A';
    } else if (result.overallScore >= 70) {
      result.riskLevel = 'medium';
      result.grade = result.overallScore >= 80 ? 'B' : 'C';
    } else if (result.overallScore >= 50) {
      result.riskLevel = 'high';
      result.grade = 'D';
    } else {
      result.riskLevel = 'critical';
      result.grade = 'F';
    }
  }

  private aggregateStatistics(result: SecurityTestResult): void {
    // 汇总所有模块的统计数据
    let totalChecks = 0;
    let passedChecks = 0;
    let failedChecks = 0;
    let warningChecks = 0;

    Object.values(result.modules).forEach(module => {
      if (module) {
        const moduleWithStats = module as any; // 类型断言以访问统计属性
        totalChecks += moduleWithStats.totalChecks || 0;
        passedChecks += moduleWithStats.passedChecks || 0;
        failedChecks += moduleWithStats.failedChecks || 0;
        warningChecks += moduleWithStats.warningChecks || 0;
      }
    });

    // 如果模块没有提供统计数据，基于发现的问题计算
    if (totalChecks === 0) {
      failedChecks = result.findings.length;
      totalChecks = failedChecks;
    }

    // 更新最终统计数据
    result.statistics.totalChecks = Math.max(result.statistics.totalChecks, totalChecks);
    result.statistics.passedChecks = Math.max(result.statistics.passedChecks, passedChecks);
    result.statistics.failedChecks = Math.max(result.statistics.failedChecks, failedChecks);
    result.statistics.warningChecks = Math.max(result.statistics.warningChecks, warningChecks);

    // 确保统计数据的一致性
    if (result.statistics.totalChecks === 0 &&
      (result.statistics.passedChecks > 0 || result.statistics.failedChecks > 0 || result.statistics.warningChecks > 0)) {
      result.statistics.totalChecks = result.statistics.passedChecks + result.statistics.failedChecks + result.statistics.warningChecks;
    }
  }

  private generateRecommendations(result: SecurityTestResult): void {
    // 基于发现的问题生成修复建议
    const recommendations: SecurityRecommendation[] = [];

    // 从各个模块收集建议
    Object.values(result.modules).forEach(module => {
      if (module?.recommendations) {
        module.recommendations.forEach((rec, index) => {
          recommendations.push({
            id: `rec-${recommendations.length + 1}`,
            category: 'general',
            priority: 'medium',
            title: rec,
            description: rec,
            solution: rec,
            effort: 'medium',
            impact: 'medium'
          });
        });
      }
    });

    result.recommendations = recommendations;
  }

  // ==================== 结果处理辅助方法 ====================

  private calculateSSLScore(data: any): number {
    if (!data.sslInfo) return 0;
    if (!data.sslInfo.valid) return 20;

    let score = 100;
    if (data.sslInfo.protocol?.includes('TLSv1.0')) score -= 30;
    if (data.sslInfo.protocol?.includes('TLSv1.1')) score -= 20;

    return Math.max(0, score);
  }

  private extractCertificateInfo(sslInfo: any): CertificateInfo {
    return {
      valid: sslInfo.valid || false,
      issuer: sslInfo.issuer?.CN || 'Unknown',
      subject: sslInfo.subject?.CN || 'Unknown',
      validFrom: sslInfo.validFrom || '',
      validTo: sslInfo.validTo || '',
      daysUntilExpiry: this.calculateDaysUntilExpiry(sslInfo.validTo),
      signatureAlgorithm: sslInfo.signatureAlgorithm || 'Unknown',
      keySize: sslInfo.keySize || 0,
      san: sslInfo.subjectAltName || [],
      chain: []
    };
  }

  private calculateDaysUntilExpiry(validTo: string): number {
    if (!validTo) return 0;
    const expiryDate = new Date(validTo);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private extractSSLVulnerabilities(data: any): string[] {
    const vulnerabilities: string[] = [];

    if (data.vulnerabilities) {
      data.vulnerabilities.forEach((vuln: any) => {
        if (vuln.type?.includes('SSL') || vuln.type?.includes('TLS')) {
          vulnerabilities.push(vuln.description);
        }
      });
    }

    return vulnerabilities;
  }

  private generateSSLRecommendations(data: any): string[] {
    const recommendations: string[] = [];

    if (!data.sslInfo?.valid) {
      recommendations.push('修复SSL证书配置');
    }

    if (data.sslInfo?.protocol?.includes('TLSv1.0')) {
      recommendations.push('升级到TLS 1.2或更高版本');
    }

    return recommendations;
  }

  private calculateHeaderScore(data: any): number {
    if (!data.securityHeaders) return 0;

    const requiredHeaders = [
      'X-Frame-Options',
      'X-Content-Type-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security'
    ];

    const presentHeaders = Object.keys(data.securityHeaders).filter(
      header => data.securityHeaders[header]
    );

    return Math.round((presentHeaders.length / requiredHeaders.length) * 100);
  }

  private extractSecurityHeaders(headers: any): HeaderCheck[] {
    const headerChecks: HeaderCheck[] = [];

    const securityHeaders = [
      'X-Frame-Options',
      'X-Content-Type-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Content-Security-Policy',
      'Referrer-Policy'
    ];

    securityHeaders.forEach(headerName => {
      headerChecks.push({
        name: headerName,
        present: !!headers[headerName],
        value: headers[headerName] || undefined,
        secure: this.isHeaderSecure(headerName, headers[headerName]),
        recommendation: this.getHeaderRecommendation(headerName, headers[headerName])
      });
    });

    return headerChecks;
  }

  private isHeaderSecure(headerName: string, value: string): boolean {
    if (!value) return false;

    switch (headerName) {
      case 'X-Frame-Options':
        return value.toLowerCase().includes('deny') || value.toLowerCase().includes('sameorigin');
      case 'X-Content-Type-Options':
        return value.toLowerCase().includes('nosniff');
      case 'X-XSS-Protection':
        return value.includes('1');
      case 'Strict-Transport-Security':
        return value.includes('max-age');
      default:
        return true;
    }
  }

  private getHeaderRecommendation(headerName: string, value: string): string | undefined {
    if (!value) {
      
        return `添加 ${headerName
      } 安全头`;
    }

    if (!this.isHeaderSecure(headerName, value)) {
      return `优化 ${headerName} 配置`;
    }

    return undefined;
  }

  private generateHeaderRecommendations(data: any): string[] {
    const recommendations: string[] = [];

    if (!data.securityHeaders) {
      
        recommendations.push('配置基本的HTTP安全头');
      return recommendations;
      }

    const headers = data.securityHeaders;

    if (!headers['X-Frame-Options']) {
      recommendations.push('添加 X-Frame-Options 防止点击劫持');
    }

    if (!headers['Content-Security-Policy']) {
      recommendations.push('配置内容安全策略(CSP)');
    }

    if (!headers['Strict-Transport-Security']) {
      recommendations.push('启用HSTS强制HTTPS');
    }

    return recommendations;
  }

  private calculateVulnerabilityScore(data: any): number {
    if (!data.vulnerabilities || data.vulnerabilities.length === 0) return 100;

    let score = 100;
    data.vulnerabilities.forEach((vuln: any) => {
      switch (vuln.severity) {
        case '高':
        case 'high':
          score -= 20;
          break;
        case '中':
        case 'medium':
          score -= 12;
          break;
        case '低':
        case 'low':
          score -= 5;
          break;
      }
    });

    return Math.max(0, score);
  }

  private extractVulnerabilities(vulnerabilities: any[]): VulnerabilityInfo[] {
    return vulnerabilities.map(vuln => ({
      type: vuln.type || 'Unknown',
      severity: this.mapSeverity(vuln.severity),
      description: vuln.description || '',
      payload: vuln.payload || '',
      response: vuln.response,
      evidence: vuln.evidence || {},
      cwe: vuln.cwe,
      cvss: vuln.cvss
    }));
  }

  private mapSeverity(severity: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (severity?.toLowerCase()) {
      case '高':
      case 'high':
        return 'high';
      case '中':
      case 'medium':
        return 'medium';
      case '低':
      case 'low':
        return 'low';
      case '严重':
      case 'critical':
        return 'critical';
      default:
        return 'medium';
    }
  }

  private generateVulnerabilityRecommendations(data: any): string[] {
    const recommendations: string[] = [];

    if (data.vulnerabilities) {
      data.vulnerabilities.forEach((vuln: any) => {
        if (vuln.recommendation) {
          recommendations.push(vuln.recommendation);
        }
      });
    }

    // 去重
    return [...new Set(recommendations)];
  }

  private calculateCookieScore(data: any): number {
    if (!data.cookieInfo || data.cookieInfo.length === 0) return 100;

    let totalCookies = data.cookieInfo.length;
    let secureCookies = 0;

    data.cookieInfo.forEach((cookie: any) => {
      if (cookie.secure && cookie.httpOnly) {
        secureCookies++;
      }
    });

    return Math.round((secureCookies / totalCookies) * 100);
  }

  private extractCookieInfo(cookieInfo: any[]): CookieInfo[] {
    return cookieInfo.map(cookie => ({
      name: cookie.name || '',
      value: cookie.value || '',
      domain: cookie.domain || '',
      path: cookie.path || '/',
      secure: cookie.secure || false,
      httpOnly: cookie.httpOnly || false,
      sameSite: cookie.sameSite || 'None',
      expires: cookie.expires,
      issues: this.identifyCookieIssues(cookie)
    }));
  }

  private identifyCookieIssues(cookie: any): string[] {
    const issues: string[] = [];

    if (!cookie.secure) {
      issues.push('缺少Secure标志');
    }

    if (!cookie.httpOnly) {
      issues.push('缺少HttpOnly标志');
    }

    if (!cookie.sameSite || cookie.sameSite === 'None') {
      issues.push('SameSite属性配置不当');
    }

    return issues;
  }

  private extractCookieIssues(data: any): string[] {
    const issues: string[] = [];

    if (data.cookieInfo) {
      data.cookieInfo.forEach((cookie: any) => {
        issues.push(...this.identifyCookieIssues(cookie));
      });
    }

    return [...new Set(issues)];
  }

  private generateCookieRecommendations(data: any): string[] {
    const recommendations: string[] = [];

    if (data.cookieInfo) {
      const hasInsecureCookies = data.cookieInfo.some((cookie: any) => !cookie.secure);
      const hasNonHttpOnlyCookies = data.cookieInfo.some((cookie: any) => !cookie.httpOnly);

      if (hasInsecureCookies) {
        recommendations.push('为所有Cookie添加Secure标志');
      }

      if (hasNonHttpOnlyCookies) {
        recommendations.push('为敏感Cookie添加HttpOnly标志');
      }

      recommendations.push('配置适当的SameSite属性');
    }

    return recommendations;
  }

  private extractFindings(data: any): SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    // 从漏洞中提取发现
    if (data.vulnerabilities) {
      data.vulnerabilities.forEach((vuln: any, index: number) => {
        findings.push({
          id: `finding-${index + 1}`,
          type: vuln.type || 'vulnerability',
          category: 'vulnerabilities',
          severity: this.mapSeverity(vuln.severity),
          title: vuln.type || 'Security Issue',
          description: vuln.description || '',
          impact: vuln.recommendation || vuln.impact || 'Security vulnerability detected',
          evidence: vuln.evidence || {},
          cwe: vuln.cwe,
          cvss: vuln.cvss
        });
      });
    }

    // 从SSL问题中提取发现
    if (data.sslInfo && !data.sslInfo.valid) {
      findings.push({
        id: `finding-ssl`,
        type: 'ssl-certificate',
        category: 'ssl',
        severity: 'high',
        title: 'SSL证书问题',
        description: data.sslInfo.reason || 'SSL证书无效',
        impact: '网站安全性受到影响，用户数据可能面临风险',
        evidence: data.sslInfo
      });
    }

    return findings;
  }

  /**
   * 验证配置
   */
  private validateConfig(config: SecurityTestConfig): void {
    if (!config.url) {
      throw new SecurityTestError('URL不能为空', 'INVALID_CONFIG', {
        field: 'url',
        value: config.url,
        suggestion: '请提供有效的URL地址'
      });
    }

    try {
      new URL(config.url);
    } catch (error) {
      throw new SecurityTestError('URL格式无效', 'INVALID_URL', {
        field: 'url',
        value: config.url,
        suggestion: '请提供有效的URL格式，如: https://example.com'
      });
    }

    // 检查协议
    const url = new URL(config.url);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new SecurityTestError('不支持的协议', 'UNSUPPORTED_PROTOCOL', {
        field: 'protocol',
        value: url.protocol,
        suggestion: '仅支持HTTP和HTTPS协议'
      });
    }
  }

  /**
   * 检查网络连接
   */
  private async checkNetworkConnectivity(url: string): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok && response.status >= 500) {
        throw new SecurityTestError('服务器错误', 'SERVER_ERROR', {
          status: response.status,
          statusText: response.statusText,
          suggestion: '目标服务器返回错误，请稍后重试'
        });
      }
    } catch (error) {
      if (error instanceof SecurityTestError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new SecurityTestError('连接超时', 'TIMEOUT', {
          timeout: 10000,
          suggestion: '网络连接超时，请检查网络状况或稍后重试'
        });
      }

      if (error instanceof Error && (error as any).code === 'ENOTFOUND') {
        throw new SecurityTestError('域名解析失败', 'DNS_ERROR', {
          hostname: new URL(url).hostname,
          suggestion: '无法解析域名，请检查URL是否正确'
        });
      }

      if (error instanceof Error && (error as any).code === 'ECONNREFUSED') {
        throw new SecurityTestError('连接被拒绝', 'CONNECTION_REFUSED', {
          url: url,
          suggestion: '目标服务器拒绝连接，请检查服务是否正常运行'
        });
      }

      throw new SecurityTestError('网络连接失败', 'NETWORK_ERROR', {
        originalError: error instanceof Error ? error.message : String(error),
        suggestion: '网络连接失败，请检查网络设置'
      });
    }
  }

  /**
   * 增强错误信息
   */
  private enhanceError(error: any, config: SecurityTestConfig, testId: string): SecurityTestError {
    if (error instanceof SecurityTestError) {
      
        return error;
      }

    // 根据错误类型提供具体的错误信息和建议
    let errorType = 'UNKNOWN_ERROR';
    let suggestion = '请联系技术支持';
    let details: any = {};

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorType = 'FETCH_ERROR';
      suggestion = '网络请求失败，请检查网络连接';
    } else if (error.name === 'SyntaxError') {
      errorType = 'PARSE_ERROR';
      suggestion = '响应数据解析失败，目标网站可能返回了无效数据';
    } else if (error.code === 'ENOTFOUND') {
      errorType = 'DNS_ERROR';
      suggestion = '域名解析失败，请检查URL是否正确';
      details.hostname = new URL(config.url).hostname;
    } else if (error.code === 'ECONNRESET') {
      errorType = 'CONNECTION_RESET';
      suggestion = '连接被重置，目标服务器可能过载或配置问题';
    } else if (error.code === 'ETIMEDOUT') {
      errorType = 'TIMEOUT';
      suggestion = '请求超时，请稍后重试或检查网络状况';
    }

    return new SecurityTestError(
      error.message || '安全测试执行失败',
      errorType,
      {
        ...details,
        testId,
        url: config.url,
        originalError: error.stack,
        suggestion
      }
    );
  }

  /**
   * 记录错误统计
   */
  private recordErrorStatistics(error: any, config: SecurityTestConfig): void {
    // 这里可以记录错误统计信息，用于后续分析和改进
    console.warn('Security test error recorded:', {
      error: error.message,
      url: config.url,
      timestamp: new Date().toISOString()
    });
  }
}

// 导出单例实例
export const unifiedSecurityEngine = SecurityEngine.getInstance();
export default unifiedSecurityEngine;
