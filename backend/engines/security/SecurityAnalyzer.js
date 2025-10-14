/**
 * 简化版安全分析引擎
 * 不依赖puppeteer，提供基础安全检测功能
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class SecurityAnalyzer {
  constructor(options = {}) {
    this.options = {
      timeout: process.env.REQUEST_TIMEOUT || 30000,
      ...options
    };
  }

  /**
   * 执行安全测试
   */
  async executeTest(config) {
    const { url } = config;
    
    try {
      console.log(`🔍 开始安全测试: ${url}`);
      
      const results = {
        url,
        timestamp: new Date().toISOString(),
        summary: {
          securityScore: 0,
          criticalVulnerabilities: 0,
          highVulnerabilities: 0,
          mediumVulnerabilities: 0,
          lowVulnerabilities: 0
        },
        vulnerabilities: [],
        securityHeaders: null,
        ssl: null,
        recommendations: []
      };

      // 1. 执行基础HTTP检查
      const httpCheck = await this.performBasicHttpCheck(url);
      results.httpCheck = httpCheck;

      if (httpCheck.error) {
        throw new Error(`HTTP检查失败: ${httpCheck.error}`);
      }

      // 2. 分析安全头
      results.securityHeaders = this.analyzeSecurityHeaders(httpCheck.headers || {});
      
      // 3. SSL/TLS检查
      results.ssl = this.analyzeSSL(url, httpCheck);
      
      // 4. 检测常见漏洞
      results.vulnerabilities = this.detectVulnerabilities(results.securityHeaders, results.ssl);
      
      // 5. 计算安全评分
      results.summary = this.calculateSecurityScore(results);
      
      // 6. 生成建议
      results.recommendations = this.generateRecommendations(results);

      console.log(`✅ 安全测试完成: ${url}, 评分: ${results.summary.securityScore}`);
      return results;

    } catch (error) {
      console.error(`❌ 安全测试失败: ${url}`, error);
      return {
        url,
        timestamp: new Date().toISOString(),
        error: error.message,
        summary: {
          securityScore: 0,
          criticalVulnerabilities: 1,
          highVulnerabilities: 0,
          mediumVulnerabilities: 0,
          lowVulnerabilities: 0,
          error: true
        },
        vulnerabilities: [{
          type: 'system',
          severity: 'critical',
          title: '测试失败',
          description: '安全测试执行失败',
          recommendation: '检查目标网站可访问性'
        }],
        recommendations: ['检查网站可访问性', '验证URL格式']
      };
    }
  }

  /**
   * 执行基础HTTP检查
   */
  async performBasicHttpCheck(url) {
    return new Promise((resolve) => {
      try {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: 'HEAD',
          timeout: this.options.timeout || 30000,
          rejectUnauthorized: false
        };

        const req = client.request(options, (res) => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            httpsEnabled: urlObj.protocol === 'https:',
            responseTime: Date.now()
          });
        });

        req.on('error', (error) => {
          resolve({
            error: error.message,
            httpsEnabled: false,
            statusCode: 0,
            headers: {}
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            error: '请求超时',
            httpsEnabled: false,
            statusCode: 0,
            headers: {}
          });
        });

        req.end();
      } catch (error) {
        resolve({
          error: error.message,
          httpsEnabled: false,
          statusCode: 0,
          headers: {}
        });
      }
    });
  }

  /**
   * 分析安全头
   */
  analyzeSecurityHeaders(headers) {
    const requiredHeaders = {
      'strict-transport-security': 'HSTS - 强制HTTPS',
      'content-security-policy': 'CSP - 内容安全策略',
      'x-frame-options': 'X-Frame-Options - 防止点击劫持',
      'x-content-type-options': 'X-Content-Type-Options - 防止MIME类型嗅探',
      'x-xss-protection': 'X-XSS-Protection - XSS保护',
      'referrer-policy': 'Referrer-Policy - 引用策略',
      'permissions-policy': 'Permissions-Policy - 权限策略'
    };

    const present = [];
    const missing = [];
    let score = 0;

    for (const [header, description] of Object.entries(requiredHeaders)) {
      if (headers[header]) {
        present.push({ header, description, value: headers[header] });
        score += 14; // 每个头14分，总共约100分
      } else {
        missing.push({ header, description });
      }
    }

    return {
      score: Math.min(score, 100),
      present,
      missing,
      totalHeaders: Object.keys(requiredHeaders).length,
      presentCount: present.length
    };
  }

  /**
   * 分析SSL/TLS
   */
  analyzeSSL(url, httpCheck) {
    const urlObj = new URL(url);
    const httpsEnabled = urlObj.protocol === 'https:';

    let score = 0;
    const issues = [];

    if (httpsEnabled) {
      score = 80; // 基础分
      
      // 检查HSTS
      if (httpCheck.headers && httpCheck.headers['strict-transport-security']) {
        score += 20;
      } else {
        issues.push('未启用HSTS');
      }
    } else {
      issues.push('未使用HTTPS');
    }

    return {
      score,
      httpsEnabled,
      issues,
      protocol: urlObj.protocol
    };
  }

  /**
   * 检测漏洞
   */
  detectVulnerabilities(securityHeaders, ssl) {
    const vulnerabilities = [];

    // 检查缺失的安全头
    if (securityHeaders.missing.length > 0) {
      for (const missing of securityHeaders.missing) {
        let severity = 'medium';
        if (['content-security-policy', 'strict-transport-security'].includes(missing.header)) {
          severity = 'high';
        }

        vulnerabilities.push({
          type: 'headers',
          severity,
          title: `缺少${missing.description}`,
          description: `网站缺少${missing.header}安全头`,
          recommendation: `添加${missing.header}头部以增强安全性`
        });
      }
    }

    // 检查SSL问题
    if (!ssl.httpsEnabled) {
      vulnerabilities.push({
        type: 'ssl',
        severity: 'critical',
        title: '未使用HTTPS',
        description: '网站使用不安全的HTTP协议',
        recommendation: '启用HTTPS加密传输'
      });
    } else if (ssl.issues.length > 0) {
      for (const issue of ssl.issues) {
        vulnerabilities.push({
          type: 'ssl',
          severity: 'high',
          title: 'SSL配置问题',
          description: issue,
          recommendation: '改进SSL/TLS配置'
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * 计算安全评分
   */
  calculateSecurityScore(results) {
    const { securityHeaders, ssl, vulnerabilities } = results;

    // 基础分：50分
    let totalScore = 50;

    // 安全头评分：最多30分
    if (securityHeaders) {
      totalScore += Math.round(securityHeaders.score * 0.3);
    }

    // SSL评分：最多20分
    if (ssl) {
      totalScore += Math.round(ssl.score * 0.2);
    }

    // 根据漏洞数量扣分
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;
    const lowCount = vulnerabilities.filter(v => v.severity === 'low').length;

    totalScore -= (criticalCount * 20 + highCount * 10 + mediumCount * 5 + lowCount * 2);
    totalScore = Math.max(0, Math.min(100, totalScore));

    return {
      securityScore: totalScore,
      criticalVulnerabilities: criticalCount,
      highVulnerabilities: highCount,
      mediumVulnerabilities: mediumCount,
      lowVulnerabilities: lowCount,
      totalVulnerabilities: vulnerabilities.length
    };
  }

  /**
   * 生成建议
   */
  generateRecommendations(results) {
    const recommendations = [];
    const { securityHeaders, ssl, vulnerabilities } = results;

    // SSL建议
    if (!ssl.httpsEnabled) {
      recommendations.push('🔴 立即启用HTTPS加密传输');
    }

    // 安全头建议（按优先级）
    if (securityHeaders) {
      const priorityHeaders = ['content-security-policy', 'strict-transport-security', 'x-frame-options'];
      for (const missing of securityHeaders.missing) {
        if (priorityHeaders.includes(missing.header)) {
          recommendations.push(`🟡 添加${missing.description}`);
        }
      }
    }

    // 基于漏洞的建议
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
    for (const vuln of criticalVulns) {
      recommendations.push(`🔴 ${vuln.recommendation}`);
    }

    // 通用建议
    if (recommendations.length === 0) {
      recommendations.push('✅ 安全配置良好，继续保持');
    } else {
      recommendations.push('🔧 定期进行安全审计');
      recommendations.push('📚 参考OWASP安全最佳实践');
    }

    return recommendations;
  }

  /**
   * 分析方法（兼容性）
   */
  async analyze(url, config = {}) {
    return this.executeTest({ url, ...config });
  }

  /**
   * 清理资源
   */
  async cleanup() {
    // 简化版不需要清理浏览器资源
    console.log('✅ 安全分析器清理完成');
  }
}

module.exports = SecurityAnalyzer;
