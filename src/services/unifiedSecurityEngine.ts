/**
 * 统一安全测试引擎 - 重新设计的核心安全测试服务
 * 整合所有安全检测功能，提供统一的API接口
 */

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

class UnifiedSecurityEngine {
  private static instance: UnifiedSecurityEngine;
  private activeTests = new Map<string, AbortController>();

  private constructor() { }

  public static getInstance(): UnifiedSecurityEngine {
    if (!UnifiedSecurityEngine.instance) {
      UnifiedSecurityEngine.instance = new UnifiedSecurityEngine();
    }
    return UnifiedSecurityEngine.instance;
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
      throw new Error(`Security test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  private validateConfig(config: SecurityTestConfig): void {
    if (!config.url) {
      throw new Error('URL is required');
    }

    try {
      new URL(config.url);
    } catch {
      throw new Error('Invalid URL format');
    }
  }

  private async executeTestModules(
    config: SecurityTestConfig,
    result: SecurityTestResult,
    onProgress?: ProgressCallback,
    signal?: AbortSignal
  ): Promise<void> {
    const modules = Object.keys(config.modules).filter(
      key => config.modules[key as keyof typeof config.modules]?.enabled
    );

    let completedModules = 0;

    for (const moduleName of modules) {
      if (signal?.aborted) {
        throw new Error('Test was cancelled');
      }

      const moduleProgress = (completedModules / modules.length) * 80; // 80% for modules, 20% for analysis

      onProgress?.({
        phase: 'scanning',
        progress: moduleProgress,
        currentModule: moduleName,
        currentCheck: `Running ${moduleName} tests`
      });

      try {
        await this.executeModule(moduleName, config, result);
        completedModules++;
      } catch (error) {
        console.error(`Module ${moduleName} failed:`, error);
        result.statistics.errorCount++;
      }
    }

    // 分析阶段
    onProgress?.({
      phase: 'analyzing',
      progress: 90,
      currentModule: 'analysis',
      currentCheck: 'Analyzing results and generating report'
    });
  }

  private async executeModule(
    moduleName: string,
    config: SecurityTestConfig,
    result: SecurityTestResult
  ): Promise<void> {
    // 调用现有的安全测试API
    const response = await fetch('/api/test/security', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: config.url,
        module: moduleName,
        options: config.modules[moduleName as keyof typeof config.modules]
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Module test failed');
    }

    // 处理模块结果
    this.processModuleResult(moduleName, data.data, result);
  }

  private processModuleResult(
    moduleName: string,
    moduleData: any,
    result: SecurityTestResult
  ): void {
    // 根据模块类型处理结果
    switch (moduleName) {
      case 'ssl':
        result.modules.ssl = this.processSSLResult(moduleData);
        break;
      case 'headers':
        result.modules.headers = this.processHeaderResult(moduleData);
        break;
      case 'vulnerabilities':
        result.modules.vulnerabilities = this.processVulnerabilityResult(moduleData);
        break;
      // ... 其他模块
    }

    // 提取发现的问题
    if (moduleData.findings) {
      result.findings.push(...moduleData.findings);
    }

    // 更新统计信息
    result.statistics.totalChecks += moduleData.totalChecks || 0;
    result.statistics.passedChecks += moduleData.passedChecks || 0;
    result.statistics.failedChecks += moduleData.failedChecks || 0;
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
}

// 导出单例实例
export const unifiedSecurityEngine = UnifiedSecurityEngine.getInstance();
export default unifiedSecurityEngine;
