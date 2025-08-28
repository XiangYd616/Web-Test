/**
 * 安全头分析器
 * 检测HTTP安全头配置，包括CSP、HSTS、X-Frame-Options等
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class SecurityHeadersAnalyzer {
  constructor() {
    this.name = 'securityHeaders';
    this.timeout = 30000;
    
    // 重要的安全头
    this.securityHeaders = {
      'content-security-policy': 'Content-Security-Policy',
      'strict-transport-security': 'Strict-Transport-Security',
      'x-frame-options': 'X-Frame-Options',
      'x-content-type-options': 'X-Content-Type-Options',
      'x-xss-protection': 'X-XSS-Protection',
      'referrer-policy': 'Referrer-Policy',
      'permissions-policy': 'Permissions-Policy',
      'cross-origin-embedder-policy': 'Cross-Origin-Embedder-Policy',
      'cross-origin-opener-policy': 'Cross-Origin-Opener-Policy',
      'cross-origin-resource-policy': 'Cross-Origin-Resource-Policy'
    };
  }

  /**
   * 分析安全头配置
   */
  async analyze(url) {
    try {
      console.log(`🛡️ 开始安全头分析: ${url}`);
      
      const urlObj = new URL(url);
      
      // 获取HTTP响应头
      const headers = await this.getResponseHeaders(urlObj);
      
      const results = {
        url,
        headers: headers,
        analysis: {},
        vulnerabilities: [],
        score: 0,
        summary: {}
      };

      // 分析各个安全头
      results.analysis = this.analyzeHeaders(headers);
      
      // 生成漏洞报告
      results.vulnerabilities = this.generateVulnerabilities(results.analysis);
      
      // 计算安全评分
      results.score = this.calculateSecurityScore(results.analysis);
      
      // 生成摘要
      results.summary = {
        totalHeaders: Object.keys(this.securityHeaders).length,
        presentHeaders: Object.keys(results.analysis.present).length,
        missingHeaders: results.analysis.missing.length,
        score: results.score,
        grade: this.getSecurityGrade(results.score)
      };

      console.log(`✅ 安全头分析完成: ${url}, 评分: ${results.score}`);
      return results;

    } catch (error) {
      console.error(`❌ 安全头分析失败: ${url}`, error);
      return {
        url,
        error: error.message,
        vulnerabilities: [{
          type: 'headers',
          severity: 'medium',
          description: '安全头分析失败',
          recommendation: '检查网站可访问性'
        }],
        score: 0,
        summary: {
          error: error.message
        }
      };
    }
  }

  /**
   * 获取响应头
   */
  async getResponseHeaders(urlObj) {
    return new Promise((resolve, reject) => {
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'HEAD',
        timeout: this.timeout,
        rejectUnauthorized: false // 允许自签名证书
      };

      const req = client.request(options, (res) => {
        resolve(res.headers);
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });

      req.end();
    });
  }

  /**
   * 分析安全头
   */
  analyzeHeaders(headers) {
    const present = {};
    const missing = [];
    const analysis = {};

    Object.keys(this.securityHeaders).forEach(headerKey => {
      const headerName = this.securityHeaders[headerKey];
      const headerValue = headers[headerKey] || headers[headerKey.toLowerCase()];

      if (headerValue) {
        present[headerKey] = {
          name: headerName,
          value: headerValue,
          analysis: this.analyzeSpecificHeader(headerKey, headerValue)
        };
      } else {
        missing.push({
          name: headerName,
          key: headerKey,
          recommendation: this.getHeaderRecommendation(headerKey)
        });
      }
    });

    return {
      present,
      missing,
      total: Object.keys(this.securityHeaders).length
    };
  }

  /**
   * 分析特定安全头
   */
  analyzeSpecificHeader(headerKey, headerValue) {
    switch (headerKey) {
      case 'content-security-policy':
        return this.analyzeCSP(headerValue);
      case 'strict-transport-security':
        return this.analyzeHSTS(headerValue);
      case 'x-frame-options':
        return this.analyzeFrameOptions(headerValue);
      default:
        return { valid: true, issues: [] };
    }
  }

  /**
   * 分析CSP头
   */
  analyzeCSP(cspValue) {
    const issues = [];
    
    if (cspValue.includes("'unsafe-inline'")) {
      issues.push('包含不安全的inline脚本允许');
    }
    
    if (cspValue.includes("'unsafe-eval'")) {
      issues.push('包含不安全的eval允许');
    }
    
    if (!cspValue.includes('default-src')) {
      issues.push('缺少default-src指令');
    }

    return {
      valid: issues.length === 0,
      issues,
      strength: issues.length === 0 ? 'strong' : 'weak'
    };
  }

  /**
   * 分析HSTS头
   */
  analyzeHSTS(hstsValue) {
    const issues = [];
    
    const maxAgeMatch = hstsValue.match(/max-age=(\d+)/);
    if (!maxAgeMatch) {
      issues.push('缺少max-age指令');
    } else {
      const maxAge = parseInt(maxAgeMatch[1]);
      if (maxAge < 31536000) { // 1年
        issues.push('max-age时间过短，建议至少1年');
      }
    }
    
    if (!hstsValue.includes('includeSubDomains')) {
      issues.push('建议添加includeSubDomains指令');
    }

    return {
      valid: issues.length === 0,
      issues,
      maxAge: maxAgeMatch ? parseInt(maxAgeMatch[1]) : 0
    };
  }

  /**
   * 分析Frame Options头
   */
  analyzeFrameOptions(frameValue) {
    const validValues = ['DENY', 'SAMEORIGIN'];
    const issues = [];
    
    if (!validValues.includes(frameValue.toUpperCase())) {
      issues.push('X-Frame-Options值不安全');
    }

    return {
      valid: issues.length === 0,
      issues,
      value: frameValue
    };
  }

  /**
   * 生成漏洞报告
   */
  generateVulnerabilities(analysis) {
    const vulnerabilities = [];

    // 缺失的安全头
    analysis.missing.forEach(header => {
      vulnerabilities.push({
        type: 'headers',
        severity: this.getHeaderSeverity(header.key),
        description: `缺少${header.name}安全头`,
        recommendation: header.recommendation
      });
    });

    // 配置不当的安全头
    Object.keys(analysis.present).forEach(headerKey => {
      const headerInfo = analysis.present[headerKey];
      if (headerInfo.analysis && !headerInfo.analysis.valid) {
        headerInfo.analysis.issues.forEach(issue => {
          vulnerabilities.push({
            type: 'headers',
            severity: 'medium',
            description: `${headerInfo.name}: ${issue}`,
            recommendation: `修复${headerInfo.name}配置`
          });
        });
      }
    });

    return vulnerabilities;
  }

  /**
   * 计算安全评分
   */
  calculateSecurityScore(analysis) {
    const totalHeaders = analysis.total;
    const presentHeaders = Object.keys(analysis.present).length;
    
    let score = (presentHeaders / totalHeaders) * 100;
    
    // 根据配置质量调整评分
    Object.keys(analysis.present).forEach(headerKey => {
      const headerInfo = analysis.present[headerKey];
      if (headerInfo.analysis && !headerInfo.analysis.valid) {
        score -= 10; // 配置不当扣分
      }
    });

    return Math.max(0, Math.round(score));
  }

  /**
   * 获取安全头严重程度
   */
  getHeaderSeverity(headerKey) {
    const criticalHeaders = ['content-security-policy', 'strict-transport-security'];
    const highHeaders = ['x-frame-options', 'x-content-type-options'];
    
    if (criticalHeaders.includes(headerKey)) return 'high';
    if (highHeaders.includes(headerKey)) return 'medium';
    return 'low';
  }

  /**
   * 获取安全头建议
   */
  getHeaderRecommendation(headerKey) {
    const recommendations = {
      'content-security-policy': '添加CSP头防止XSS攻击',
      'strict-transport-security': '添加HSTS头强制HTTPS',
      'x-frame-options': '添加X-Frame-Options防止点击劫持',
      'x-content-type-options': '添加X-Content-Type-Options防止MIME嗅探',
      'x-xss-protection': '添加X-XSS-Protection启用XSS过滤',
      'referrer-policy': '添加Referrer-Policy控制引用信息',
      'permissions-policy': '添加Permissions-Policy控制浏览器功能'
    };

    return recommendations[headerKey] || '添加此安全头以提升安全性';
  }

  /**
   * 获取安全等级
   */
  getSecurityGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}

module.exports = SecurityHeadersAnalyzer;
