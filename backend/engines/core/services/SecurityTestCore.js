/**
 * 🛡️ 安全测试核心服务
 * 统一所有安全测试功能，消除重复代码
 */

const tls = require('tls');
const https = require('https');
const axios = require('axios');
const { URL } = require('url');

class SecurityTestCore {
  constructor() {
    this.name = 'security-core';
    this.cache = new Map(); // 结果缓存
    
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
      'cross-origin-resource-policy': 'CORP'
    };
  }

  /**
   * SSL/TLS 检查 - 统一实现
   * 消除在多个测试工具中的重复实现
   */
  async checkSSL(url) {
    const cacheKey = `ssl_${url}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      
      const parsedUrl = new URL(url);
      
      if (parsedUrl.protocol !== 'https:') {
        const result = {
          status: 'failed',
          message: '网站未使用HTTPS',
          score: 0,
          details: {
            protocol: parsedUrl.protocol,
            secure: false,
            certificate: null
          },
          recommendations: ['启用HTTPS以保护数据传输安全'],
          timestamp: new Date().toISOString()
        };
        
        this.cache.set(cacheKey, result);
        return result;
      }

      // 获取SSL证书信息
      const certificateInfo = await this.getCertificateInfo(parsedUrl.hostname, parsedUrl.port || 443);
      
      // 分析SSL配置
      const sslAnalysis = this.analyzeSSLConfiguration(certificateInfo);
      
      const result = {
        status: sslAnalysis.score >= 70 ? 'passed' : sslAnalysis.score >= 40 ? 'warning' : 'failed',
        message: sslAnalysis.message,
        score: sslAnalysis.score,
        details: {
          protocol: parsedUrl.protocol,
          secure: true,
          certificate: certificateInfo,
          ...sslAnalysis.details
        },
        recommendations: sslAnalysis.recommendations,
        timestamp: new Date().toISOString()
      };

      this.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      console.error('SSL检查失败:', error);
      const result = {
        status: 'failed',
        message: `SSL检查失败: ${error.message}`,
        score: 0,
        details: { error: error.message },
        recommendations: ['检查网站SSL配置'],
        timestamp: new Date().toISOString()
      };
      
      this.cache.set(cacheKey, result);
      return result;
    }
  }

  /**
   * 安全头检查 - 统一实现
   */
  async checkSecurityHeaders(url) {
    const cacheKey = `headers_${url}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {

      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true,
        maxRedirects: 5
      });

      const headers = response.headers;
      const analysis = this.analyzeSecurityHeaders(headers);

      const result = {
        status: analysis.score >= 70 ? 'passed' : analysis.score >= 40 ? 'warning' : 'failed',
        message: `${analysis.present.length}/${Object.keys(this.securityHeaders).length} 安全头部已配置`,
        score: analysis.score,
        details: {
          present: analysis.present,
          missing: analysis.missing,
          headers: analysis.headerDetails,
          totalHeaders: Object.keys(this.securityHeaders).length
        },
        recommendations: analysis.recommendations,
        timestamp: new Date().toISOString()
      };

      this.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      console.error('安全头检查失败:', error);
      const result = {
        status: 'failed',
        message: `安全头检查失败: ${error.message}`,
        score: 0,
        details: { error: error.message },
        recommendations: ['检查网站安全头配置'],
        timestamp: new Date().toISOString()
      };
      
      this.cache.set(cacheKey, result);
      return result;
    }
  }

  /**
   * 漏洞扫描 - 统一实现
   */
  async scanVulnerabilities(url, config = {}) {
    const cacheKey = `vuln_${url}_${JSON.stringify(config)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`🔍 扫描安全漏洞: ${url}`);

      const vulnerabilities = [];
      
      // 检查常见漏洞
      const checks = [
        this.checkXSSVulnerability(url),
        this.checkSQLInjectionVulnerability(url),
        this.checkDirectoryTraversal(url),
        this.checkOpenRedirect(url),
        this.checkClickjacking(url)
      ];

      const results = await Promise.allSettled(checks);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          vulnerabilities.push(result.value);
        }
      });

      // 计算风险评分
      const riskScore = this.calculateRiskScore(vulnerabilities);
      
      const result = {
        status: riskScore < 30 ? 'passed' : riskScore < 70 ? 'warning' : 'failed',
        message: `发现 ${vulnerabilities.length} 个潜在安全问题`,
        score: Math.max(0, 100 - riskScore),
        details: {
          vulnerabilities,
          riskScore,
          totalChecks: checks.length,
          riskLevel: this.getRiskLevel(riskScore)
        },
        recommendations: this.generateVulnerabilityRecommendations(vulnerabilities),
        timestamp: new Date().toISOString()
      };

      this.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      console.error('漏洞扫描失败:', error);
      const result = {
        status: 'failed',
        message: `漏洞扫描失败: ${error.message}`,
        score: 0,
        details: { error: error.message },
        recommendations: ['检查网站安全配置'],
        timestamp: new Date().toISOString()
      };
      
      this.cache.set(cacheKey, result);
      return result;
    }
  }

  /**
   * Cookie 安全分析 - 统一实现
   */
  async analyzeCookies(url) {
    const cacheKey = `cookies_${url}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {

      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true,
        maxRedirects: 5
      });

      const setCookieHeaders = response.headers['set-cookie'] || [];
      const cookieAnalysis = this.analyzeCookieHeaders(setCookieHeaders);

      const result = {
        status: cookieAnalysis.score >= 70 ? 'passed' : cookieAnalysis.score >= 40 ? 'warning' : 'failed',
        message: cookieAnalysis.message,
        score: cookieAnalysis.score,
        details: cookieAnalysis.details,
        recommendations: cookieAnalysis.recommendations,
        timestamp: new Date().toISOString()
      };

      this.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Cookie分析失败:', error);
      const result = {
        status: 'failed',
        message: `Cookie分析失败: ${error.message}`,
        score: 0,
        details: { error: error.message },
        recommendations: ['检查Cookie安全配置'],
        timestamp: new Date().toISOString()
      };
      
      this.cache.set(cacheKey, result);
      return result;
    }
  }

  /**
   * 获取SSL证书信息
   */
  async getCertificateInfo(hostname, port) {
    return new Promise((resolve, reject) => {
      const socket = tls.connect(port, hostname, { servername: hostname }, () => {
        const certificate = socket.getPeerCertificate(true);
        const protocol = socket.getProtocol();
        const cipher = socket.getCipher();
        
        socket.destroy();
        
        resolve({
          subject: certificate.subject,
          issuer: certificate.issuer,
          validFrom: certificate.valid_from,
          validTo: certificate.valid_to,
          fingerprint: certificate.fingerprint,
          serialNumber: certificate.serialNumber,
          protocol,
          cipher,
          isValid: new Date() < new Date(certificate.valid_to),
          daysUntilExpiry: Math.ceil((new Date(certificate.valid_to) - new Date()) / (1000 * 60 * 60 * 24))
        });
      });

      socket.on('error', reject);
      socket.setTimeout(10000, () => {
        socket.destroy();
        reject(new Error('SSL连接超时'));
      });
    });
  }

  /**
   * 分析SSL配置
   */
  analyzeSSLConfiguration(certificateInfo) {
    let score = 0;
    const details = {};
    const recommendations = [];

    // 证书有效性检查
    if (certificateInfo.isValid) {
      score += 30;
      details.certificateValid = true;
    } else {
      details.certificateValid = false;
      recommendations.push('SSL证书已过期，请及时更新');
    }

    // 证书即将过期检查
    if (certificateInfo.daysUntilExpiry < 30) {
      recommendations.push(`SSL证书将在${certificateInfo.daysUntilExpiry}天后过期`);
    } else {
      score += 20;
    }

    // 协议版本检查
    if (certificateInfo.protocol && certificateInfo.protocol.includes('TLSv1.3')) {
      score += 25;
      details.protocolGrade = 'A';
    } else if (certificateInfo.protocol && certificateInfo.protocol.includes('TLSv1.2')) {
      score += 20;
      details.protocolGrade = 'B';
    } else {
      details.protocolGrade = 'C';
      recommendations.push('建议升级到TLS 1.2或更高版本');
    }

    // 加密套件检查
    if (certificateInfo.cipher) {
      if (certificateInfo.cipher.name && certificateInfo.cipher.name.includes('ECDHE')) {
        score += 15;
        details.forwardSecrecy = true;
      } else {
        details.forwardSecrecy = false;
        recommendations.push('建议启用前向保密(Forward Secrecy)');
      }
    }

    // 证书颁发机构检查
    if (certificateInfo.issuer && certificateInfo.issuer.O) {
      score += 10;
      details.trustedCA = true;
    }

    return {
      score: Math.min(100, score),
      message: score >= 70 ? 'SSL配置良好' : score >= 40 ? 'SSL配置需要改进' : 'SSL配置存在严重问题',
      details,
      recommendations
    };
  }

  /**
   * 分析安全头
   */
  analyzeSecurityHeaders(headers) {
    let score = 0;
    const maxScore = Object.keys(this.securityHeaders).length * 10;
    const headerDetails = {};
    const present = [];
    const missing = [];
    const recommendations = [];

      /**
       * if功能函数
       * @param {Object} params - 参数对象
       * @returns {Promise<Object>} 返回结果
       */
    Object.keys(this.securityHeaders).forEach(header => {
      if (headers[header]) {
        score += 10;
        present.push(this.securityHeaders[header]);
        headerDetails[header] = {
          present: true,
          value: headers[header]
        };
      } else {
        missing.push(this.securityHeaders[header]);
        headerDetails[header] = {
          present: false
        };
        recommendations.push(`建议添加 ${this.securityHeaders[header]} 安全头`);
      }
    });

    const finalScore = Math.round((score / maxScore) * 100);

    return {
      score: finalScore,
      present,
      missing,
      headerDetails,
      recommendations
    };
  }

  /**
   * 检查XSS漏洞
   */
  async checkXSSVulnerability(url) {
    try {
      const testPayload = '<script>alert("xss")</script>';
      const testUrl = `${url}?test=${encodeURIComponent(testPayload)}`;
      
      const response = await axios.get(testUrl, {
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.data && response.data.includes(testPayload)) {
        return {
          type: 'XSS',
          severity: 'high',
          description: '检测到潜在的XSS漏洞',
          evidence: testPayload
        };
      }
    } catch (error) {
      // 忽略检查错误
    }
    return null;
  }

  /**
   * 检查SQL注入漏洞
   */
  async checkSQLInjectionVulnerability(url) {
    try {
      const testPayload = "' OR '1'='1";
      const testUrl = `${url}?id=${encodeURIComponent(testPayload)}`;
      
      const response = await axios.get(testUrl, {
        timeout: 5000,
        validateStatus: () => true
      });

      // 检查SQL错误信息
      const sqlErrors = [
        'sql syntax',
        'mysql_fetch',
        'ora-',
        'microsoft ole db',
        'sqlite_'
      ];

      /**
       * for功能函数
       * @param {Object} params - 参数对象
       * @returns {Promise<Object>} 返回结果
       */
      const responseText = response.data.toLowerCase();
      for (const error of sqlErrors) {
        if (responseText.includes(error)) {
          return {
            type: 'SQL Injection',
            severity: 'critical',
            description: '检测到潜在的SQL注入漏洞',
            evidence: error
          };
        }
      }
    } catch (error) {
      // 忽略检查错误
    }
    return null;
  }

  /**
   * 检查目录遍历漏洞
   */
  async checkDirectoryTraversal(url) {
    try {
      const testPayload = '../../../etc/passwd';
      const testUrl = `${url}?file=${encodeURIComponent(testPayload)}`;
      
      const response = await axios.get(testUrl, {
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.data && response.data.includes('root:x:0:0:')) {
        return {
          type: 'Directory Traversal',
          severity: 'high',
          description: '检测到潜在的目录遍历漏洞',
          evidence: testPayload
        };
      }
    } catch (error) {
      // 忽略检查错误
    }
    return null;
  }

  /**
   * 检查开放重定向漏洞
   */
  async checkOpenRedirect(url) {
    try {
      const testPayload = 'http://evil.com';
      const testUrl = `${url}?redirect=${encodeURIComponent(testPayload)}`;
      
      const response = await axios.get(testUrl, {
        timeout: 5000,
        validateStatus: () => true,
        maxRedirects: 0
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.location;
        if (location && location.includes('evil.com')) {
          return {
            type: 'Open Redirect',
            severity: 'medium',
            description: '检测到潜在的开放重定向漏洞',
            evidence: location
          };
        }
      }
    } catch (error) {
      // 忽略检查错误
    }
    return null;
  }

  /**
   * 检查点击劫持漏洞
   */
  async checkClickjacking(url) {
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        validateStatus: () => true
      });

      const xFrameOptions = response.headers['x-frame-options'];
      const csp = response.headers['content-security-policy'];

      if (!xFrameOptions && (!csp || !csp.includes('frame-ancestors'))) {
        return {
          type: 'Clickjacking',
          severity: 'medium',
          description: '缺少点击劫持保护',
          evidence: '未设置 X-Frame-Options 或 CSP frame-ancestors'
        };
      }
    } catch (error) {
      // 忽略检查错误
    }
    return null;
  }

  /**
   * 分析Cookie头
   */
  analyzeCookieHeaders(setCookieHeaders) {
    if (!setCookieHeaders.length) {
      return {
        score: 100,
        message: '未设置Cookie',
        details: { noCookies: true },
        recommendations: []
      };
    }

    let score = 0;
    const cookieDetails = [];
    const recommendations = [];

    setCookieHeaders.forEach(cookieHeader => {
      const cookie = this.parseCookieHeader(cookieHeader);
      cookieDetails.push(cookie);

      // 检查安全属性
      if (cookie.secure) score += 20;
      else recommendations.push(`Cookie "${cookie.name}" 缺少 Secure 属性`);

      if (cookie.httpOnly) score += 20;
      else recommendations.push(`Cookie "${cookie.name}" 缺少 HttpOnly 属性`);

      if (cookie.sameSite) score += 15;
      else recommendations.push(`Cookie "${cookie.name}" 缺少 SameSite 属性`);
    });

    const finalScore = Math.min(100, Math.round(score / setCookieHeaders.length));

    return {
      score: finalScore,
      message: `分析了 ${setCookieHeaders.length} 个Cookie`,
      details: {
        cookies: cookieDetails,
        totalCookies: setCookieHeaders.length
      },
      recommendations
    };
  }

  /**
   * 解析Cookie头
   */
  parseCookieHeader(cookieHeader) {
    const parts = cookieHeader.split(';').map(part => part.trim());
    const [nameValue] = parts;
    const [name, value] = nameValue.split('=');

    const cookie = { name, value };

    parts.slice(1).forEach(part => {
      const [key, val] = part.split('=');
      const lowerKey = key.toLowerCase();

      switch (lowerKey) {
        case 'secure':
          cookie.secure = true;
          break;
        case 'httponly':
          cookie.httpOnly = true;
          break;
        case 'samesite':
          cookie.sameSite = val || true;
          break;
        case 'expires':
          cookie.expires = val;
          break;
        case 'max-age':
          cookie.maxAge = parseInt(val);
          break;
        case 'domain':
          cookie.domain = val;
          break;
        case 'path':
          cookie.path = val;
          break;
      }
    });

    return cookie;
  }

  /**
   * 计算风险评分
   */
  calculateRiskScore(vulnerabilities) {
    const severityWeights = {
      critical: 40,
      high: 25,
      medium: 15,
      low: 5
    };

    return vulnerabilities.reduce((total, vuln) => {
      return total + (severityWeights[vuln.severity] || 0);
    }, 0);
  }

  /**
   * 获取风险等级
   */
  getRiskLevel(riskScore) {
    if (riskScore >= 70) return 'critical';
    if (riskScore >= 40) return 'high';
    if (riskScore >= 20) return 'medium';
    return 'low';
  }

  /**
   * 生成漏洞修复建议
   */
  generateVulnerabilityRecommendations(vulnerabilities) {
    const recommendations = [];
    
    vulnerabilities.forEach(vuln => {
      switch (vuln.type) {
        case 'XSS':
          recommendations.push('对用户输入进行适当的转义和验证');
          break;
        case 'SQL Injection':
          recommendations.push('使用参数化查询或预编译语句');
          break;
        case 'Directory Traversal':
          recommendations.push('验证和限制文件路径访问');
          break;
        case 'Open Redirect':
          recommendations.push('验证重定向URL的白名单');
          break;
        case 'Clickjacking':
          recommendations.push('设置适当的X-Frame-Options或CSP frame-ancestors');
          break;
      }
    });

    return [...new Set(recommendations)]; // 去重
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = SecurityTestCore;
