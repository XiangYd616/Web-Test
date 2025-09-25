/**
 * 安全测试引擎
 * 提供真实的安全扫描、SSL检测、头部分析、漏洞检测等功能
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const tls = require('tls');

class SecurityTestEngine {
  constructor(options = {}) {
    this.name = 'security';
    this.version = '2.0.0';
    this.description = '安全测试引擎';
    this.options = {
      timeout: process.env.REQUEST_TIMEOUT || 30000,
      userAgent: 'Security-Scanner/2.0.0',
      ...options
    };
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
    try {
      const { url = 'https://example.com' } = config;
      
      
      const results = await this.performSecurityScan(url);
      
      return {
        engine: this.name,
        version: this.version,
        success: true,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ 安全测试失败: ${error.message}`);
      return {
        engine: this.name,
        version: this.version,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 执行安全扫描
   */
  async performSecurityScan(url) {
    const startTime = Date.now();
    const urlObj = new URL(url);
    
    const sslAnalysis = await this.analyzeSSL(urlObj);
    
    const headersAnalysis = await this.analyzeSecurityHeaders(url);
    
    const vulnerabilityAnalysis = await this.scanVulnerabilities(url);
    
    const informationDisclosure = await this.checkInformationDisclosure(url);
    
    const accessControl = await this.testAccessControl(url);
    
    const endTime = Date.now();
    
    // 计算总体安全评分
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
      overallScore,
      summary: {
        securityLevel: this.getSecurityLevel(overallScore),
        criticalIssues: this.countCriticalIssues({ ssl: sslAnalysis, headers: headersAnalysis, vulnerabilities: vulnerabilityAnalysis }),
        totalIssues: this.countTotalIssues({ ssl: sslAnalysis, headers: headersAnalysis, vulnerabilities: vulnerabilityAnalysis })
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
      })
    };
    
    console.log(`✅ 安全扫描完成，评分: ${overallScore}/100`);
    return results;
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
      { path: '/api/v1/', description: 'API v1端点' },
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
   * 计算安全评分
   */
  calculateSecurityScore(analyses) {
    let totalScore = 0;
    let weights = {
      ssl: 0.3,
      headers: 0.25,
      vulnerabilities: 0.25,
      informationDisclosure: 0.1,
      accessControl: 0.1
    };
    
    Object.keys(weights).forEach(key => {
      if (analyses[key] && analyses[key].score !== undefined) {
        totalScore += analyses[key].score * weights[key];
      }
    });
    
    return Math.round(totalScore);
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
    if (analyses.vulnerabilities?.vulnerabilities) count += analyses.vulnerabilities.vulnerabilities.length;
    
    return count;
  }

  /**
   * 生成安全建议
   */
  generateSecurityRecommendations(analyses) {
    const recommendations = [];
    
    // SSL建议
    if (analyses.ssl && !analyses.ssl.enabled) {
      recommendations.push('立即启用HTTPS以保护数据传输');
    }
    if (analyses.ssl?.certificate && !analyses.ssl.certificate.valid) {
      recommendations.push('更新SSL证书，当前证书已过期或无效');
    }
    
    // 安全头部建议
    if (analyses.headers?.missingHeaders) {
      const criticalMissing = analyses.headers.missingHeaders.filter(h => h.importance === 'high');
      if (criticalMissing.length > 0) {
        recommendations.push(`添加重要的安全头部: ${criticalMissing.map(h => h.name).join(', ')}`);
      }
    }
    
    // 漏洞建议
    if (analyses.vulnerabilities?.vulnerabilities) {
      const critical = analyses.vulnerabilities.vulnerabilities.filter(v => v.severity === 'critical');
      if (critical.length > 0) {
        recommendations.push(`立即修复严重漏洞: ${critical.map(v => v.description).join(', ')}`);
      }
    }
    
    // 信息泄露建议
    if (analyses.informationDisclosure?.disclosures?.length > 0) {
      recommendations.push('隐藏服务器版本和技术栈信息，减少攻击面');
    }
    
    // 访问控制建议
    if (analyses.accessControl?.issues?.length > 0) {
      recommendations.push('加强访问控制，确保敏感端点需要认证');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('安全状态良好，继续保持当前的安全措施');
    }
    
    return recommendations;
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
   * 清理资源
   */
  async cleanup() {
    console.log('✅ 安全测试引擎清理完成');
  }
}

module.exports = SecurityTestEngine;
