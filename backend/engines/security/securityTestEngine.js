/**
 * 安全测试引擎
 * 提供真实的安全扫描、SSL检测、头部分析、漏洞检测等功能
 * 
 * 增强功能:
 * - WebSocket实时进度通知
 * - 告警系统集成
 * - 测试ID支持
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { emitTestProgress, emitTestComplete, emitTestError } = require('../../websocket/testEvents');
const { getAlertManager } = require('../../alert/AlertManager');
const Logger = require('../../utils/logger');

class SecurityTestEngine {
  constructor(options = {}) {
    this.name = 'security';
    this.version = '3.0.0';
    this.description = '安全测试引擎 - 支持实时通知和告警';
    this.options = {
      timeout: process.env.REQUEST_TIMEOUT || 30000,
      userAgent: 'Security-Scanner/3.0.0',
      ...options
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
      Logger.warn('告警管理器未初始化:', error.message);
    }
  }

  updateTestProgress(testId, progress, message, stage = 'running', extra = {}) {
    const test = this.activeTests.get(testId) || { status: 'running' };
    this.activeTests.set(testId, {
      ...test,
      progress,
      message,
      lastUpdate: Date.now()
    });

    emitTestProgress(testId, {
      stage,
      progress,
      message,
      ...extra
    });

    if (this.progressCallback) {
      this.progressCallback({
        testId,
        progress,
        message,
        status: test.status || 'running'
      });
    }
  }

  getTestStatus(testId) {
    return this.activeTests.get(testId);
  }

  async stopTest(testId) {
    const test = this.activeTests.get(testId);
    if (test) {
      this.activeTests.set(testId, {
        ...test,
        status: 'stopped'
      });
      return true;
    }
    return false;
  }

  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  setCompletionCallback(callback) {
    this.completionCallback = callback;
  }

  setErrorCallback(callback) {
    this.errorCallback = callback;
  }

  /**
   * 检查引擎可用性
   */
  checkAvailability() {
    return {
      available: true,
      version: this.version,
      features: [
        'security-testing',
        'vulnerability-scanning',
        'ssl-analysis',
        'security-headers'
      ]
    };
  }

  /**
   * 执行安全测试
   */
  async executeTest(config) {
    const testId = config.testId || `security-${Date.now()}`;
    const { url = 'https://example.com' } = config;
    
    try {
      Logger.info(`🚀 开始安全测试: ${testId} - ${url}`);

      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      // 发送测试开始事件
      this.updateTestProgress(testId, 0, '安全扫描开始', 'started', { url });
      
      const results = await this.performSecurityScan(url, { testId });
      
      const finalResult = {
        engine: this.name,
        version: this.version,
        success: true,
        testId,
        results,
        timestamp: new Date().toISOString()
      };

      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results
      });
      if (this.completionCallback) {
        this.completionCallback(finalResult);
      }
      
      // 发送完成事件
      emitTestComplete(testId, finalResult);
      
      Logger.info(`✅ 安全测试完成: ${testId}`);
      
      return finalResult;
      
    } catch (error) {
      Logger.error(`❌ 安全测试失败: ${testId}`, error);
      
      const errorResult = {
        engine: this.name,
        version: this.version,
        success: false,
        testId,
        url,
        error: error.message,
        timestamp: new Date().toISOString(),
        startTime: new Date(this.activeTests.get(testId).startTime).toISOString(),
        endTime: new Date().toISOString(),
      };

      this.activeTests.set(testId, {
        status: 'failed',
        error: error.message
      });
      if (this.errorCallback) {
        this.errorCallback(error);
      }
      
      // 发送错误事件
      emitTestError(testId, {
        error: error.message,
        stack: error.stack
      });
      
      // 触发错误告警
      if (this.alertManager) {
        await this.alertManager.checkAlert('TEST_FAILURE', {
          testId,
          testType: 'security',
          url,
          error: error.message
        });
      }
      
      return errorResult;
    }
  }

  /**
   * 执行安全扫描
   */
  async performSecurityScan(url, options = {}) {
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
      const [sslAnalysis, headersAnalysis, informationDisclosure, accessControl] = await Promise.all([
        this.analyzeSSL(urlObj),
        this.analyzeSecurityHeaders(url),
        this.checkInformationDisclosure(url),
        this.testAccessControl(url)
      ]);
      
      // 发送进度: 基础检查完成
      if (testId) {
        this.updateTestProgress(testId, 40, 'SSL和安全头部分析完成', 'running');
      }
      
      // 深度漏洞扫描（需要浏览器环境）
      let vulnerabilityAnalysis = {
        xss: { vulnerabilities: [], summary: { totalTests: 0, riskLevel: 'low' } },
        sqlInjection: { vulnerabilities: [], summary: { totalTests: 0, riskLevel: 'low' } },
        other: []
      };
      
      if (options.enableDeepScan && options.page) {
        Logger.info('🔍 开始深度漏洞扫描...');
        
        if (testId) {
          this.updateTestProgress(testId, 50, '执行深度漏洞扫描...', 'running');
        }
        
        try {
          // XSS漏洞检测
          const xssResults = await xssAnalyzer.analyze(options.page, url);
          vulnerabilityAnalysis.xss = xssResults;
          
          // SQL注入漏洞检测
          const sqlResults = await sqlAnalyzer.analyze(options.page, url);
          vulnerabilityAnalysis.sqlInjection = sqlResults;
          
          // 其他漏洞检测
          const otherVulns = await this.scanOtherVulnerabilities(options.page, url);
          vulnerabilityAnalysis.other = otherVulns;
          
        } catch (deepScanError) {
          console.warn('⚠️ 深度扫描部分失败:', deepScanError.message);
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
        accessControl
      });
      
      const results = {
        url,
        timestamp: new Date().toISOString(),
        scanDuration: `${endTime - startTime}ms`,
        scanType: options.enableDeepScan ? 'comprehensive' : 'standard',
        overallScore,
        summary: {
          securityLevel: this.getSecurityLevel(overallScore),
          riskRating: this.calculateRiskRating(vulnerabilityAnalysis),
          criticalVulnerabilities: this.countCriticalVulnerabilities(vulnerabilityAnalysis),
          highRiskIssues: this.countHighRiskIssues(vulnerabilityAnalysis),
          totalIssues: this.countTotalSecurityIssues({
            ssl: sslAnalysis, 
            headers: headersAnalysis, 
            vulnerabilities: vulnerabilityAnalysis
          }),
          complianceStatus: this.assessComplianceStatus({
            ssl: sslAnalysis,
            headers: headersAnalysis,
            vulnerabilities: vulnerabilityAnalysis
          })
        },
        details: {
          ssl: sslAnalysis,
          headers: headersAnalysis,
          vulnerabilities: vulnerabilityAnalysis,
          informationDisclosure,
          accessControl
        },
        recommendations: this.generateSecurityRecommendations({
          ssl: sslAnalysis,
          headers: headersAnalysis,
          vulnerabilities: vulnerabilityAnalysis,
          informationDisclosure,
          accessControl
        }),
        threatIntelligence: this.generateThreatIntelligence(vulnerabilityAnalysis)
      };
      
      // 检查告警条件
      if (this.alertManager && testId) {
        await this._checkSecurityAlerts(testId, url, results);
      }
      
      Logger.info(`✅ 安全扫描完成，评分: ${overallScore}/100`);
      return results;
      
    } catch (error) {
      Logger.error('❌ 安全扫描失败:', error);
      throw error;
    }
  }
  
  /**
   * 检查安全告警条件
   * @private
   */
  async _checkSecurityAlerts(testId, url, results) {
    try {
      // 检查安全评分告警
      if (results.overallScore < 60) {
        await this.alertManager.checkAlert('SECURITY_SCORE_LOW', {
          testId,
          url,
          score: results.overallScore,
          threshold: 60,
          securityLevel: results.summary.securityLevel
        });
      }
      
      // 检查关键漏洞
      if (results.summary.criticalVulnerabilities > 0) {
        await this.alertManager.checkAlert('CRITICAL_VULNERABILITIES', {
          testId,
          url,
          count: results.summary.criticalVulnerabilities,
          vulnerabilities: results.details.vulnerabilities
        });
      }
      
      // 检查SSL问题
      if (!results.details.ssl.enabled) {
        await this.alertManager.checkAlert('HTTPS_NOT_ENABLED', {
          testId,
          url,
          message: '未启用HTTPS加密'
        });
      }
      
      // 检查缺少安全头部
      const criticalHeadersMissing = results.details.headers.missingHeaders?.filter(
        h => h.importance === 'high'
      ).length || 0;
      
      if (criticalHeadersMissing > 0) {
        await this.alertManager.checkAlert('SECURITY_HEADERS_MISSING', {
          testId,
          url,
          count: criticalHeadersMissing,
          headers: results.details.headers.missingHeaders
        });
      }
      
    } catch (error) {
      console.warn('安全告警检查失败:', error.message);
    }
  }

  /**
   * 快速漏洞扫描（不需浏览器）
   */
  async performQuickVulnerabilityScan(url) {
    const vulnerabilities = {
      xss: { vulnerabilities: [], summary: { totalTests: 0, riskLevel: 'low' } },
      sqlInjection: { vulnerabilities: [], summary: { totalTests: 0, riskLevel: 'low' } },
      other: []
    };
    
    try {
      // 基础XSS检测（通过HTTP请求）
      const xssBasicTest = await this.performBasicXSSTest(url);
      if (xssBasicTest.length > 0) {
        vulnerabilities.xss = {
          vulnerabilities: xssBasicTest,
          summary: { totalTests: xssBasicTest.length, riskLevel: 'medium' }
        };
      }
      
      // 基础SQL注入检测
      const sqlBasicTest = await this.performBasicSQLTest(url);
      if (sqlBasicTest.length > 0) {
        vulnerabilities.sqlInjection = {
          vulnerabilities: sqlBasicTest,
          summary: { totalTests: sqlBasicTest.length, riskLevel: 'medium' }
        };
      }
      
      // 其他基础安全检测
      vulnerabilities.other = await this.performOtherBasicTests(url);
      
    } catch (error) {
      console.warn('快速漏洞扫描失败:', error.message);
    }
    
    return vulnerabilities;
  }
  
  /**
   * 基础XSS检测
   */
  async performBasicXSSTest(url) {
    const vulnerabilities = [];
    const testPayloads = ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>'];
    
    try {
      const urlObj = new URL(url);
      
      for (const [paramName] of urlObj.searchParams.entries()) {
        for (const payload of testPayloads) {
          const testUrl = new URL(url);
          testUrl.searchParams.set(paramName, payload);
          
          try {
            const response = await this.makeRequest(testUrl.toString());
            if (response.data && response.data.includes(payload)) {
              vulnerabilities.push({
                type: 'xss',
                subtype: 'reflected',
                severity: 'high',
                confidence: 'medium',
                context: {
                  parameter: paramName,
                  payload,
                  url: testUrl.toString()
                },
                description: `参数 ${paramName} 可能存在反射型XSS漏洞`,
                recommendation: '对用户输入进行HTML编码'
              });
            }
          } catch {
            // 忽略单个请求失败
          }
        }
      }
    } catch (error) {
      console.warn('基础XSS检测失败:', error.message);
    }
    
    return vulnerabilities;
  }
  
  /**
   * 基础SQL注入检测
   */
  async performBasicSQLTest(url) {
    const vulnerabilities = [];
    const testPayloads = ["'", "' OR '1'='1", "'; DROP TABLE users; --"];
    const errorSignatures = [
      /mysql_fetch_array/i,
      /you have an error in your sql syntax/i,
      /warning.*mysql_/i,
      /ora-\d{5}/i,
      /microsoft ole db provider/i
    ];
    
    try {
      const urlObj = new URL(url);
      
      for (const [paramName] of urlObj.searchParams.entries()) {
        for (const payload of testPayloads) {
          const testUrl = new URL(url);
          testUrl.searchParams.set(paramName, payload);
          
          try {
            const response = await this.makeRequest(testUrl.toString());
            const content = response.data || '';
            
            for (const errorPattern of errorSignatures) {
              if (errorPattern.test(content)) {
                vulnerabilities.push({
                  type: 'sql_injection',
                  severity: 'high',
                  confidence: 'high',
                  context: {
                    parameter: paramName,
                    payload,
                    url: testUrl.toString()
                  },
                  evidence: {
                    errorPattern: errorPattern.toString(),
                    matchedText: content.match(errorPattern)[0]
                  },
                  description: `参数 ${paramName} 存在SQL注入漏洞`,
                  recommendation: '使用参数化查询和输入验证'
                });
                break;
              }
            }
          } catch {
            // 忽略单个请求失败
          }
        }
      }
    } catch (error) {
      console.warn('基础SQL注入检测失败:', error.message);
    }
    
    return vulnerabilities;
  }
  
  /**
   * 其他基础安全检测
   */
  async performOtherBasicTests(url) {
    const vulnerabilities = [];
    
    try {
      // 目录遍历检测
      const directoryVulns = await this.checkDirectoryTraversal(url);
      vulnerabilities.push(...directoryVulns);
      
      // 敏感文件检测
      const sensitiveFileVulns = await this.checkSensitiveFiles(url);
      vulnerabilities.push(...sensitiveFileVulns);
      
      // 命令执行检测
      const commandVulns = await this.checkCommandInjection(url);
      vulnerabilities.push(...commandVulns);
      
    } catch (error) {
      console.warn('其他安全检测失败:', error.message);
    }
    
    return vulnerabilities;
  }
  
  /**
   * 目录遍历检测
   */
  async checkDirectoryTraversal(url) {
    const vulnerabilities = [];
    const payloads = ['../../../etc/passwd', '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts'];
    
    try {
      const urlObj = new URL(url);
      
      for (const [paramName, _paramValue] of urlObj.searchParams.entries()) {
        for (const payload of payloads) {
          const testUrl = new URL(url);
          testUrl.searchParams.set(paramName, payload);
          
          try {
            const response = await this.makeRequest(testUrl.toString());
            const content = response.data || '';
            
            if (content.includes('root:') || content.includes('# Copyright')) {
              vulnerabilities.push({
                type: 'directory_traversal',
                severity: 'high',
                confidence: 'high',
                context: {
                  parameter: paramName,
                  payload,
                  url: testUrl.toString()
                },
                description: `参数 ${paramName} 存在目录遍历漏洞`,
                recommendation: '限制文件访问路径，验证用户输入'
              });
            }
          } catch {
            // 忽略单个请求失败
          }
        }
      }
    } catch (error) {
      console.warn('目录遍历检测失败:', error.message);
    }
    
    return vulnerabilities;
  }
  
  /**
   * 敏感文件检测
   */
  async checkSensitiveFiles(url) {
    const vulnerabilities = [];
    const sensitiveFiles = [
      'robots.txt', '.git/config', '.env', 'config.php', 
      'web.config', '.htaccess', 'phpinfo.php', 'admin.php'
    ];
    
    try {
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      
      for (const file of sensitiveFiles) {
        const testUrl = `${baseUrl}/${file}`;
        
        try {
          const response = await this.makeRequest(testUrl);
          if (response.status === 200 && response.data) {
            vulnerabilities.push({
              type: 'sensitive_file_exposure',
              severity: 'medium',
              confidence: 'high',
              context: {
                file,
                url: testUrl
              },
              description: `发现敏感文件: ${file}`,
              recommendation: '限制敏感文件的访问权限'
            });
          }
        } catch {
          // 忽略单个请求失败
        }
      }
    } catch (error) {
      console.warn('敏感文件检测失败:', error.message);
    }
    
    return vulnerabilities;
  }
  
  /**
   * 命令执行检测
   */
  async checkCommandInjection(url) {
    const vulnerabilities = [];
    const payloads = ['; cat /etc/passwd', '&& dir', '| whoami'];
    
    try {
      const urlObj = new URL(url);
      
      for (const [paramName, _paramValue] of urlObj.searchParams.entries()) {
        for (const payload of payloads) {
          const testUrl = new URL(url);
          testUrl.searchParams.set(paramName, `test${payload}`);
          
          try {
            const response = await this.makeRequest(testUrl.toString());
            const content = response.data || '';
            
            if (content.includes('root:') || content.includes('Directory of') || content.includes('uid=')) {
              vulnerabilities.push({
                type: 'command_injection',
                severity: 'critical',
                confidence: 'high',
                context: {
                  parameter: paramName,
                  payload,
                  url: testUrl.toString()
                },
                description: `参数 ${paramName} 存在命令注入漏洞`,
                recommendation: '禁止直接执行系统命令，使用安全的API'
              });
            }
          } catch {
            // 忽略单个请求失败
          }
        }
      }
    } catch (error) {
      console.warn('命令执行检测失败:', error.message);
    }
    
    return vulnerabilities;
  }
  
  /**
   * 深度其他漏洞扫描
   */
  async scanOtherVulnerabilities(page, _url) {
    const vulnerabilities = [];
    
    try {
      // CSRF检测
      const csrfVulns = await this.checkCSRF(page);
      vulnerabilities.push(...csrfVulns);
      
      // 点击劫持检测
      const clickjackingVulns = await this.checkClickjacking(page);
      vulnerabilities.push(...clickjackingVulns);
      
      // 会话管理检测
      const sessionVulns = await this.checkSessionManagement(page);
      vulnerabilities.push(...sessionVulns);
      
    } catch (error) {
      console.warn('其他漏洞检测失败:', error.message);
    }
    
    return vulnerabilities;
  }
  
  /**
   * CSRF检测
   */
  async checkCSRF(page) {
    const vulnerabilities = [];
    
    try {
      const forms = await page.evaluate(() => {
        const formElements = document.querySelectorAll('form');
        return Array.from(formElements).map((form, index) => {
          const method = (form.method || 'GET').toUpperCase();
          const hasCSRFToken = !!(form.querySelector('input[name*="token"], input[name*="csrf"]'));
          
          return {
            index,
            method,
            action: form.action || window.location.href,
            hasCSRFToken
          };
        });
      });
      
      forms.forEach(form => {
        if (form.method === 'POST' && !form.hasCSRFToken) {
          vulnerabilities.push({
            type: 'csrf',
            severity: 'medium',
            confidence: 'medium',
            context: {
              form: form.action,
              method: form.method
            },
            description: '表单缺少CSRF保护',
            recommendation: '添加CSRF令牌验证'
          });
        }
      });
    } catch (error) {
      console.warn('CSRF检测失败:', error.message);
    }
    
    return vulnerabilities;
  }
  
  /**
   * 点击劫持检测
   */
  async checkClickjacking(page) {
    const vulnerabilities = [];
    
    try {
      const hasFrameOptions = await page.evaluate(() => {
        const metaTags = document.querySelectorAll('meta[http-equiv]');
        return Array.from(metaTags).some(meta => 
          meta.getAttribute('http-equiv').toLowerCase() === 'x-frame-options'
        );
      });
      
      if (!hasFrameOptions) {
        vulnerabilities.push({
          type: 'clickjacking',
          severity: 'medium',
          confidence: 'high',
          context: {
            protection: 'x-frame-options'
          },
          description: '缺少点击劫持保护',
          recommendation: '设置X-Frame-Options或CSP frame-ancestors指令'
        });
      }
    } catch (error) {
      console.warn('点击劫持检测失败:', error.message);
    }
    
    return vulnerabilities;
  }
  
  /**
   * 会话管理检测
   */
  async checkSessionManagement(page) {
    const vulnerabilities = [];
    
    try {
      const cookies = await page.cookies();
      
      cookies.forEach(cookie => {
        // 检查会话 Cookie
        if (cookie.name.toLowerCase().includes('session') || 
            cookie.name.toLowerCase().includes('auth')) {
          
          if (!cookie.secure) {
            vulnerabilities.push({
              type: 'insecure_cookie',
              severity: 'medium',
              confidence: 'high',
              context: {
                cookie: cookie.name,
                issue: 'missing_secure_flag'
              },
              description: `Cookie ${cookie.name} 缺少Secure标志`,
              recommendation: '为会话 Cookie 设置 Secure 标志'
            });
          }
          
          if (!cookie.httpOnly) {
            vulnerabilities.push({
              type: 'insecure_cookie',
              severity: 'medium',
              confidence: 'high',
              context: {
                cookie: cookie.name,
                issue: 'missing_httponly_flag'
              },
              description: `Cookie ${cookie.name} 缺少HttpOnly标志`,
              recommendation: '为会话 Cookie 设置 HttpOnly 标志'
            });
          }
        }
      });
    } catch (error) {
      console.warn('会话管理检测失败:', error.message);
    }
    
    return vulnerabilities;
  }
  
  /**
   * HTTP请求工具方法
   */
  async makeRequest(url, options = {}) {
    const https = require('https');
    const http = require('http');
    
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SecurityScanner/1.0)',
          ...options.headers
        },
        timeout: options.timeout || 10000,
        rejectUnauthorized: false
      };
      
      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data
          });
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      
      if (options.data) {
        req.write(options.data);
      }
      
      req.end();
    });
  }
  
  /**
   * 分析SSL/TLS配置
   */
  async analyzeSSL(urlObj) {
    const result = {
      enabled: urlObj.protocol === 'https:',
      score: 0,
      certificate: null,
      protocols: [],
      ciphers: [],
      issues: []
    };
    
    if (!result.enabled) {
      result.score = 0;
      result.issues.push({ severity: 'critical', message: '未使用HTTPS协议' });
      return result;
    }
    
    try {
      const options = {
        host: urlObj.hostname,
        port: urlObj.port || 443,
        method: 'GET',
        rejectUnauthorized: false
      };
      
      return new Promise((resolve) => {
        const req = https.request(options, (res) => {

          
          /**

          
           * if功能函数

          
           * @param {Object} params - 参数对象

          
           * @returns {Promise<Object>} 返回结果

          
           */
          const cert = res.socket.getPeerCertificate();
          
          if (cert) {
            result.certificate = {
              subject: cert.subject,
              issuer: cert.issuer,
              valid: new Date() < new Date(cert.valid_to),
              validFrom: cert.valid_from,
              validTo: cert.valid_to,
              fingerprint: cert.fingerprint
            };
            
            // 检查证书有效性
            if (!result.certificate.valid) {
              result.issues.push({ severity: 'critical', message: '证书已过期' });
            }
            
            // 检查证书即将过期
            const daysToExpiry = Math.floor((new Date(cert.valid_to) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysToExpiry < 30) {
              result.issues.push({ severity: 'warning', message: `证书将在${daysToExpiry}天内过期` });
            }
          }
          
          // 获取TLS版本
          if (res.socket.getProtocol) {
            result.protocols.push(res.socket.getProtocol());
          }
          
          // 计算评分
          result.score = result.issues.length === 0 ? 95 : 
                        result.issues.some(i => i.severity === 'critical') ? 30 : 70;
          
          res.resume();
          resolve(result);
        });
        
        req.on('error', () => {
          result.issues.push({ severity: 'error', message: 'SSL连接失败' });
          result.score = 0;
          resolve(result);
        });
        
        req.end();
      });
    } catch (error) {
      result.issues.push({ severity: 'error', message: error.message });
      result.score = 0;
      return result;
    }
  }

  /**
   * 分析安全头部
   */
  async analyzeSecurityHeaders(url) {
    const result = {
      score: 0,
      presentHeaders: [],
      missingHeaders: [],
      issues: []
    };
    
    const requiredHeaders = [
      { name: 'strict-transport-security', importance: 'high', description: 'HSTS防止协议降级攻击' },
      { name: 'x-frame-options', importance: 'high', description: '防止点击劫持' },
      { name: 'x-content-type-options', importance: 'high', description: '防止MIME类型混淆' },
      { name: 'content-security-policy', importance: 'high', description: 'CSP防止XSS攻击' },
      { name: 'x-xss-protection', importance: 'medium', description: 'XSS保护' },
      { name: 'referrer-policy', importance: 'medium', description: '控制引用信息' },
      { name: 'permissions-policy', importance: 'low', description: '控制浏览器功能' }
    ];
    
    try {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      return new Promise((resolve) => {
        const req = client.get(url, (res) => {
          const headers = res.headers;
          
          requiredHeaders.forEach(header => {
            if (headers[header.name]) {
              result.presentHeaders.push({
                name: header.name,
                value: headers[header.name],
                description: header.description
              });
            } else {
              result.missingHeaders.push({
                name: header.name,
                importance: header.importance,
                description: header.description
              });
              
              if (header.importance === 'high') {
                result.issues.push({ 
                  severity: 'high', 
                  message: `缺少重要安全头部: ${header.name}` 
                });
              }
            }
          });
          
          // 计算评分
          const presentCount = result.presentHeaders.length;
          const totalCount = requiredHeaders.length;
          const highImportancePresent = result.presentHeaders.filter(h => 
            requiredHeaders.find(r => r.name === h.name && r.importance === 'high')
          ).length;
          const highImportanceTotal = requiredHeaders.filter(h => h.importance === 'high').length;
          
          result.score = Math.round(
            (presentCount / totalCount) * 50 + 
            (highImportancePresent / highImportanceTotal) * 50
          );
          
          res.resume();
          resolve(result);
        });
        
        req.on('error', () => {
          result.issues.push({ severity: 'error', message: '无法检查HTTP头部' });
          result.score = 0;
          resolve(result);
        });
        
        req.setTimeout(10000, () => {
          req.destroy();
          result.issues.push({ severity: 'error', message: '请求超时' });
          resolve(result);
        });
      });
    } catch (error) {
      result.issues.push({ severity: 'error', message: error.message });
      return result;
    }
  }

  /**
   * 扫描常见漏洞
   */
  async scanVulnerabilities(url) {
    const result = {
      score: 100,
      vulnerabilities: [],
      checks: []
    };
    
    // 检查常见的不安全路径
    const dangerousPaths = [
      { path: '/.git/config', name: 'Git配置文件暴露', severity: 'critical' },
      { path: '/.env', name: '环境变量文件暴露', severity: 'critical' },
      { path: '/admin', name: '管理面板暴露', severity: 'medium' },
      { path: '/phpmyadmin', name: 'phpMyAdmin暴露', severity: 'high' },
      { path: '/.DS_Store', name: 'DS_Store文件暴露', severity: 'low' },
      { path: '/robots.txt', name: 'Robots.txt存在', severity: 'info' },
      { path: '/sitemap.xml', name: 'Sitemap存在', severity: 'info' }
    ];
    
    for (const dangerousPath of dangerousPaths) {
      const checkResult = await this.checkPath(url, dangerousPath.path);
      result.checks.push({
        path: dangerousPath.path,
        name: dangerousPath.name,
        found: checkResult.found,
        statusCode: checkResult.statusCode
      });
      
      if (checkResult.found && dangerousPath.severity !== 'info') {
        result.vulnerabilities.push({
          type: 'exposure',
          severity: dangerousPath.severity,
          path: dangerousPath.path,
          description: dangerousPath.name
        });
        
        // 根据严重性降低评分
        if (dangerousPath.severity === 'critical') result.score -= 30;
        else if (dangerousPath.severity === 'high') result.score -= 20;
        else if (dangerousPath.severity === 'medium') result.score -= 10;
        else if (dangerousPath.severity === 'low') result.score -= 5;
      }
    }
    
    result.score = Math.max(0, result.score);
    return result;
  }

  /**
   * 检查路径是否存在
   */
  async checkPath(baseUrl, path) {
    try {
      const url = new URL(path, baseUrl).toString();
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      return new Promise((resolve) => {
        const req = client.get(url, (res) => {
          res.resume();
          resolve({
            found: res.statusCode >= 200 && res.statusCode < 400,
            statusCode: res.statusCode
          });
        });
        
        req.on('error', () => {
          resolve({ found: false, statusCode: 0 });
        });
        
        req.setTimeout(5000, () => {
          req.destroy();
          resolve({ found: false, statusCode: 0 });
        });
      });
    } catch {
      return { found: false, statusCode: 0 };
    }
  }

  /**
   * 检查信息泄露
   */
  async checkInformationDisclosure(url) {
    const result = {
      score: 100,
      disclosures: []
    };
    
    try {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      return new Promise((resolve) => {
        const req = client.get(url, (res) => {
          // 检查服务器信息泄露
          if (res.headers['server']) {
            const serverHeader = res.headers['server'];
            if (serverHeader.includes('/')) {
              result.disclosures.push({
                type: 'server_version',
                value: serverHeader,
                severity: 'low',
                description: '服务器版本信息暴露'
              });
              result.score -= 10;
            }
          }
          
          // 检查X-Powered-By
          if (res.headers['x-powered-by']) {
            result.disclosures.push({
              type: 'powered_by',
              value: res.headers['x-powered-by'],
              severity: 'low',
              description: '技术栈信息暴露'
            });
            result.score -= 10;
          }
          
          // 检查ASP.NET版本
          if (res.headers['x-aspnet-version']) {
            result.disclosures.push({
              type: 'aspnet_version',
              value: res.headers['x-aspnet-version'],
              severity: 'low',
              description: 'ASP.NET版本暴露'
            });
            result.score -= 10;
          }
          
          result.score = Math.max(0, result.score);
          res.resume();
          resolve(result);
        });
        
        req.on('error', () => {
          resolve(result);
        });
        
        req.setTimeout(5000, () => {
          req.destroy();
          resolve(result);
        });
      });
    } catch {
      return result;
    }
  }

  /**
   * 测试访问控制
   */
  async testAccessControl(url) {
    const result = {
      score: 100,
      tests: [],
      issues: []
    };
    
    // 测试常见的认证绕过
    const testPaths = [
      { path: '/api/', description: 'API端点' },
      { path: '/api/users', description: '用户API' },
      { path: '/api/admin', description: '管理API' }
    ];
    
    for (const test of testPaths) {
      const checkResult = await this.checkPath(url, test.path);
      result.tests.push({
        path: test.path,
        description: test.description,
        accessible: checkResult.found,
        statusCode: checkResult.statusCode
      });
      
      if (checkResult.found && test.path.includes('admin')) {
        result.issues.push({
          severity: 'high',
          message: `未授权访问: ${test.path}`
        });
        result.score -= 30;
      }
    }
    
    result.score = Math.max(0, result.score);
    return result;
  }

  /**
   * 获取安全级别
   */
  getSecurityLevel(score) {
    if (score >= 90) return '优秀';
    if (score >= 75) return '良好';
    if (score >= 60) return '一般';
    if (score >= 40) return '较差';
    return '危险';
  }

  /**
   * 统计严重问题数
   */
  countCriticalIssues(analyses) {
    let count = 0;
    
    if (analyses.ssl?.issues) {
      count += analyses.ssl.issues.filter(i => i.severity === 'critical').length;
    }
    if (analyses.headers?.issues) {
      count += analyses.headers.issues.filter(i => i.severity === 'critical' || i.severity === 'high').length;
    }
    if (analyses.vulnerabilities?.vulnerabilities) {
      count += analyses.vulnerabilities.vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length;
    }
    
    return count;
  }

  /**
   * 统计所有问题数
   */
  countTotalIssues(analyses) {
    let count = 0;
    
    if (analyses.ssl?.issues) count += analyses.ssl.issues.length;
    if (analyses.headers?.issues) count += analyses.headers.issues.length;
    if (analyses.vulnerabilities?.vulnerabilities) {
      count += analyses.vulnerabilities.vulnerabilities.length;
    }

    return count;
  }

  /**
   * 获取引擎信息
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      available: this.checkAvailability()
    };
  }

  /**
   * 计算增强安全评分
   */
  calculateSecurityScore(analyses) {
    const weights = {
      ssl: 0.25,
      headers: 0.20,
      vulnerabilities: 0.35, // 增加漏洞权重
      informationDisclosure: 0.10,
      accessControl: 0.10
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    // SSL评分
    if (analyses.ssl && analyses.ssl.score !== undefined) {
      totalScore += analyses.ssl.score * weights.ssl;
      totalWeight += weights.ssl;
    }
    
    // 安全头部评分
    if (analyses.headers && analyses.headers.score !== undefined) {
      totalScore += analyses.headers.score * weights.headers;
      totalWeight += weights.headers;
    }
    
    // 漏洞评分（综合各种漏洞类型）
    if (analyses.vulnerabilities) {
      let vulnScore = 100;
      
      // XSS漏洞影响
      if (analyses.vulnerabilities.xss && analyses.vulnerabilities.xss.vulnerabilities.length > 0) {
        const xssVulns = analyses.vulnerabilities.xss.vulnerabilities;
        vulnScore -= xssVulns.filter(v => v.severity === 'critical').length * 30;
        vulnScore -= xssVulns.filter(v => v.severity === 'high').length * 20;
        vulnScore -= xssVulns.filter(v => v.severity === 'medium').length * 10;
      }
      
      // SQL注入漏洞影响
      if (analyses.vulnerabilities.sqlInjection && analyses.vulnerabilities.sqlInjection.vulnerabilities.length > 0) {
        const sqlVulns = analyses.vulnerabilities.sqlInjection.vulnerabilities;
        vulnScore -= sqlVulns.filter(v => v.severity === 'critical').length * 35;
        vulnScore -= sqlVulns.filter(v => v.severity === 'high').length * 25;
        vulnScore -= sqlVulns.filter(v => v.severity === 'medium').length * 15;
      }
      
      // 其他漏洞影响
      if (analyses.vulnerabilities.other && analyses.vulnerabilities.other.length > 0) {
        const otherVulns = analyses.vulnerabilities.other;
        vulnScore -= otherVulns.filter(v => v.severity === 'critical').length * 25;
        vulnScore -= otherVulns.filter(v => v.severity === 'high').length * 15;
        vulnScore -= otherVulns.filter(v => v.severity === 'medium').length * 8;
      }
      
      vulnScore = Math.max(0, vulnScore);
      totalScore += vulnScore * weights.vulnerabilities;
      totalWeight += weights.vulnerabilities;
    }
    
    // 信息泄露评分
    if (analyses.informationDisclosure && analyses.informationDisclosure.score !== undefined) {
      totalScore += analyses.informationDisclosure.score * weights.informationDisclosure;
      totalWeight += weights.informationDisclosure;
    }
    
    // 访问控制评分
    if (analyses.accessControl && analyses.accessControl.score !== undefined) {
      totalScore += analyses.accessControl.score * weights.accessControl;
      totalWeight += weights.accessControl;
    }
    
    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }
  
  /**
   * 计算风险评级
   */
  calculateRiskRating(vulnerabilities) {
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    
    // 统计各类漏洞
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
  
  /**
   * 统计关键漏洞数量
   */
  countCriticalVulnerabilities(vulnerabilities) {
    let count = 0;
    
    if (vulnerabilities.xss && vulnerabilities.xss.vulnerabilities) {
      count += vulnerabilities.xss.vulnerabilities.filter(v => v.severity === 'critical').length;
    }
    
    if (vulnerabilities.sqlInjection && vulnerabilities.sqlInjection.vulnerabilities) {
      count += vulnerabilities.sqlInjection.vulnerabilities.filter(v => v.severity === 'critical').length;
    }
    
    if (vulnerabilities.other) {
      count += vulnerabilities.other.filter(v => v.severity === 'critical').length;
    }
    
    return count;
  }
  
  /**
   * 统计高风险问题数量
   */
  countHighRiskIssues(vulnerabilities) {
    let count = 0;
    
    if (vulnerabilities.xss && vulnerabilities.xss.vulnerabilities) {
      count += vulnerabilities.xss.vulnerabilities.filter(v => v.severity === 'high').length;
    }
    
    if (vulnerabilities.sqlInjection && vulnerabilities.sqlInjection.vulnerabilities) {
      count += vulnerabilities.sqlInjection.vulnerabilities.filter(v => v.severity === 'high').length;
    }
    
    if (vulnerabilities.other) {
      count += vulnerabilities.other.filter(v => v.severity === 'high').length;
    }
    
    return count;
  }
  
  /**
   * 统计总安全问题数量
   */
  countTotalSecurityIssues(analyses) {
    let count = 0;
    
    // SSL问题
    if (analyses.ssl?.issues) {
      count += analyses.ssl.issues.length;
    }
    
    // 安全头部问题
    if (analyses.headers?.missingHeaders) {
      count += analyses.headers.missingHeaders.filter(h => h.importance === 'high').length;
    }
    
    // 漏洞问题
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
  
  /**
   * 评估合规状态
   */
  assessComplianceStatus(analyses) {
    const compliance = {
      owasp: { status: 'unknown', issues: [] },
      gdpr: { status: 'unknown', issues: [] },
      pci: { status: 'unknown', issues: [] }
    };
    
    // OWASP Top 10 检查
    let owaspIssues = 0;
    if (analyses.vulnerabilities) {
      if (analyses.vulnerabilities.xss?.vulnerabilities.length > 0) {
        compliance.owasp.issues.push('A03: Injection (XSS)');
        owaspIssues++;
      }
      if (analyses.vulnerabilities.sqlInjection?.vulnerabilities.length > 0) {
        compliance.owasp.issues.push('A03: Injection (SQL)');
        owaspIssues++;
      }
      if (analyses.vulnerabilities.other?.some(v => v.type === 'csrf')) {
        compliance.owasp.issues.push('A01: Broken Access Control (CSRF)');
        owaspIssues++;
      }
    }
    
    compliance.owasp.status = owaspIssues === 0 ? 'compliant' : 
                              owaspIssues <= 2 ? 'partial' : 'non-compliant';
    
    // GDPR基础检查（HTTPS）
    if (analyses.ssl && analyses.ssl.enabled && analyses.ssl.score >= 80) {
      compliance.gdpr.status = 'partial';
    } else {
      compliance.gdpr.issues.push('缺少适当的数据传输加密');
      compliance.gdpr.status = 'non-compliant';
    }
    
    // PCI DSS基础检查
    if (analyses.ssl && analyses.ssl.enabled && 
        analyses.headers && analyses.headers.score >= 70) {
      compliance.pci.status = 'partial';
    } else {
      compliance.pci.issues.push('不满足PCI DSS基础安全要求');
      compliance.pci.status = 'non-compliant';
    }
    
    return compliance;
  }
  
  /**
   * 生成增强的安全建议
   */
  generateSecurityRecommendations(analyses) {
    const recommendations = {
      immediate: [], // 立即处理
      shortTerm: [], // 短期处理
      longTerm: [],  // 长期处理
      preventive: [] // 预防措施
    };
    
    // 立即处理的关键问题
    if (analyses.vulnerabilities) {
      if (analyses.vulnerabilities.sqlInjection?.vulnerabilities.length > 0) {
        recommendations.immediate.push({
          priority: 'critical',
          issue: 'SQL注入漏洞',
          action: '立即修复所有SQL注入漏洞，使用参数化查询',
          timeframe: '24小时内'
        });
      }
      
      if (analyses.vulnerabilities.xss?.vulnerabilities.filter(v => v.severity === 'critical').length > 0) {
        recommendations.immediate.push({
          priority: 'critical',
          issue: '关键XSS漏洞',
          action: '修复关键XSS漏洞，实施输入验证和输出编码',
          timeframe: '48小时内'
        });
      }
    }
    
    if (!analyses.ssl?.enabled) {
      recommendations.immediate.push({
        priority: 'high',
        issue: '未启用HTTPS',
        action: '立即部署SSL证书，强制HTTPS访问',
        timeframe: '72小时内'
      });
    }
    
    // 短期处理
    if (analyses.headers?.missingHeaders?.filter(h => h.importance === 'high').length > 0) {
      recommendations.shortTerm.push({
        priority: 'high',
        issue: '缺少关键安全头部',
        action: '配置所有重要的安全HTTP头部',
        timeframe: '1周内'
      });
    }
    
    if (analyses.vulnerabilities?.other?.length > 0) {
      recommendations.shortTerm.push({
        priority: 'medium',
        issue: '其他安全漏洞',
        action: '修复发现的其他安全问题',
        timeframe: '2周内'
      });
    }
    
    // 长期改进
    recommendations.longTerm.push({
      priority: 'medium',
      issue: '安全监控',
      action: '建立持续的安全监控和漏洞扫描机制',
      timeframe: '1个月内'
    });
    
    recommendations.longTerm.push({
      priority: 'low',
      issue: '安全培训',
      action: '为开发团队提供安全开发培训',
      timeframe: '3个月内'
    });
    
    // 预防措施
    recommendations.preventive.push({
      priority: 'medium',
      issue: '代码审查',
      action: '建立安全代码审查流程',
      type: 'process'
    });
    
    recommendations.preventive.push({
      priority: 'medium',
      issue: '自动化测试',
      action: '集成安全测试到CI/CD流水线',
      type: 'automation'
    });
    
    return recommendations;
  }
  
  /**
   * 生成威胁情报
   */
  generateThreatIntelligence(vulnerabilities) {
    const intelligence = {
      threatLevel: 'unknown',
      attackVectors: [],
      mitigationStrategies: [],
      industryTrends: []
    };
    
    // 确定威胁等级
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
    
    // 识别攻击向量
    if (vulnerabilities.xss?.vulnerabilities.length > 0) {
      intelligence.attackVectors.push({
        type: 'Cross-Site Scripting (XSS)',
        risk: 'High',
        description: '攻击者可能通过XSS攻击窃取用户凭据或执行恶意代码'
      });
    }
    
    if (vulnerabilities.sqlInjection?.vulnerabilities.length > 0) {
      intelligence.attackVectors.push({
        type: 'SQL Injection',
        risk: 'Critical',
        description: '攻击者可能通过SQL注入访问或修改数据库数据'
      });
    }
    
    // 缓解策略
    intelligence.mitigationStrategies = [
      '实施Web应用防火墙(WAF)',
      '建立入侵检测系统(IDS)',
      '定期进行安全扫描和渗透测试',
      '保持软件和依赖项更新',
      '实施最小权限原则'
    ];
    
    // 行业趋势（模拟数据）
    intelligence.industryTrends = [
      '2024年XSS攻击增长了15%',
      'SQL注入仍然是最常见的Web应用漏洞',
      'API安全问题呈上升趋势',
      '供应链攻击成为新的关注点'
    ];
    
    return intelligence;
  }
  
  /**
   * 清理资源
   */
  async cleanup() {
    console.log('✅ 安全测试引擎清理完成');
  }
}

module.exports = SecurityTestEngine;
