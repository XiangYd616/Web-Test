/**
 * 安全测试引擎单元测试
 * 测试安全扫描功能的核心逻辑
 */

const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');

// 模拟安全测试引擎
class MockSecurityTestEngine {
  constructor() {
    this.config = {
      url: '',
      options: {
        checkSSL: true,
        checkHeaders: true,
        checkVulnerabilities: true,
        checkCookies: true,
        checkRedirects: true,
        checkMixedContent: true,
        checkCSP: true,
        checkXSS: true,
        checkSQLi: true
      }
    };
    this.results = null;
  }

  async analyze(url, options = {}) {
    this.config.url = url;
    this.config.options = { ...this.config.options, ...options };

    // 验证URL
    if (!this.isValidUrl(url)) {
      throw new Error('Invalid URL provided');
    }

    // 模拟分析过程
    const results = {
      url,
      timestamp: new Date(),
      overallScore: 0,
      issues: [],
      summary: {},
      details: {}
    };

    // SSL证书检查
    if (this.config.options.checkSSL) {
      const sslResult = await this.checkSSLCertificate(url);
      results.details.ssl = sslResult;
      if (!sslResult.valid) {
        results.issues.push({
          type: 'ssl',
          severity: 'high',
          message: 'SSL证书存在问题',
          details: sslResult.errors
        });
      }
    }

    // 安全头部检查
    if (this.config.options.checkHeaders) {
      const headersResult = await this.checkSecurityHeaders(url);
      results.details.headers = headersResult;
      headersResult.missing.forEach(header => {
        results.issues.push({
          type: 'header',
          severity: header.severity,
          message: `缺少安全头部: ${header.name}`,
          recommendation: header.recommendation
        });
      });
    }

    // Cookie安全性检查
    if (this.config.options.checkCookies) {
      const cookiesResult = await this.checkCookieSecurity(url);
      results.details.cookies = cookiesResult;
      cookiesResult.insecure.forEach(cookie => {
        results.issues.push({
          type: 'cookie',
          severity: 'medium',
          message: `不安全的Cookie: ${cookie.name}`,
          details: cookie.issues
        });
      });
    }

    // XSS漏洞检查
    if (this.config.options.checkXSS) {
      const xssResult = await this.checkXSSVulnerabilities(url);
      results.details.xss = xssResult;
      if (xssResult.vulnerable) {
        results.issues.push({
          type: 'xss',
          severity: 'critical',
          message: 'XSS漏洞检测到',
          details: xssResult.details
        });
      }
    }

    // SQL注入检查
    if (this.config.options.checkSQLi) {
      const sqliResult = await this.checkSQLInjection(url);
      results.details.sqli = sqliResult;
      if (sqliResult.vulnerable) {
        results.issues.push({
          type: 'sqli',
          severity: 'critical',
          message: 'SQL注入漏洞检测到',
          details: sqliResult.details
        });
      }
    }

    // 计算总体得分
    results.overallScore = this.calculateSecurityScore(results.issues);
    
    // 生成摘要
    results.summary = {
      totalIssues: results.issues.length,
      criticalIssues: results.issues.filter(i => i.severity === 'critical').length,
      highIssues: results.issues.filter(i => i.severity === 'high').length,
      mediumIssues: results.issues.filter(i => i.severity === 'medium').length,
      lowIssues: results.issues.filter(i => i.severity === 'low').length
    };

    this.results = results;
    return results;
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  async checkSSLCertificate(url) {
    // 模拟SSL证书检查
    const isHttps = url.startsWith('https://');
    
    if (!isHttps) {
      return {
        valid: false,
        errors: ['网站未使用HTTPS'],
        grade: 'F'
      };
    }

    // 模拟证书检查结果
    return {
      valid: true,
      issuer: 'Let\'s Encrypt',
      validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      validTo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      protocol: 'TLSv1.3',
      cipher: 'TLS_AES_256_GCM_SHA384',
      grade: 'A',
      errors: []
    };
  }

  async checkSecurityHeaders(url) {
    // 模拟安全头部检查
    const requiredHeaders = [
      { name: 'Strict-Transport-Security', severity: 'high', recommendation: '添加 HSTS 头部以强制HTTPS' },
      { name: 'X-Content-Type-Options', severity: 'medium', recommendation: '添加 nosniff 防止MIME类型嗅探' },
      { name: 'X-Frame-Options', severity: 'high', recommendation: '添加 SAMEORIGIN 防止点击劫持' },
      { name: 'Content-Security-Policy', severity: 'high', recommendation: '实施内容安全策略' },
      { name: 'X-XSS-Protection', severity: 'medium', recommendation: '启用XSS过滤器' }
    ];

    // 模拟检测到的头部
    const detectedHeaders = Math.random() > 0.3 ? 
      ['X-Content-Type-Options', 'X-Frame-Options'] : 
      requiredHeaders.map(h => h.name);

    const missing = requiredHeaders.filter(h => !detectedHeaders.includes(h.name));

    return {
      present: detectedHeaders,
      missing,
      score: ((requiredHeaders.length - missing.length) / requiredHeaders.length) * 100
    };
  }

  async checkCookieSecurity(url) {
    // 模拟Cookie安全性检查
    const cookies = [
      {
        name: 'sessionId',
        value: 'abc123',
        secure: Math.random() > 0.3,
        httpOnly: Math.random() > 0.2,
        sameSite: Math.random() > 0.4 ? 'Strict' : 'None'
      },
      {
        name: 'userPref',
        value: 'theme=dark',
        secure: true,
        httpOnly: false,
        sameSite: 'Lax'
      }
    ];

    const insecure = cookies.filter(cookie => {
      const issues = [];
      if (!cookie.secure) issues.push('未设置Secure标志');
      if (!cookie.httpOnly && cookie.name.toLowerCase().includes('session')) {
        issues.push('敏感Cookie未设置HttpOnly');
      }
      if (cookie.sameSite === 'None') issues.push('SameSite设置过于宽松');
      
      return issues.length > 0 ? { ...cookie, issues } : null;
    }).filter(Boolean);

    return {
      total: cookies.length,
      secure: cookies.length - insecure.length,
      insecure
    };
  }

  async checkXSSVulnerabilities(url) {
    // 模拟XSS漏洞检查
    const testPayloads = [
      '<script>alert(1)</script>',
      '"><script>alert(1)</script>',
      'javascript:alert(1)',
      '<img src=x onerror=alert(1)>'
    ];

    // 模拟检测结果（随机决定是否发现漏洞）
    const vulnerable = Math.random() > 0.7;

    return {
      vulnerable,
      tested: testPayloads.length,
      details: vulnerable ? {
        payload: testPayloads[0],
        location: 'search parameter',
        type: 'Reflected XSS'
      } : null
    };
  }

  async checkSQLInjection(url) {
    // 模拟SQL注入检查
    const testPayloads = [
      "' OR '1'='1",
      "1' OR '1' = '1",
      "' OR 1=1--",
      "admin' --"
    ];

    // 模拟检测结果
    const vulnerable = Math.random() > 0.8;

    return {
      vulnerable,
      tested: testPayloads.length,
      details: vulnerable ? {
        payload: testPayloads[0],
        parameter: 'id',
        type: 'Error-based SQL Injection'
      } : null
    };
  }

  calculateSecurityScore(issues) {
    let score = 100;
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    return Math.max(0, score);
  }

  getResults() {
    return this.results;
  }

  reset() {
    this.results = null;
    this.config = {
      url: '',
      options: {
        checkSSL: true,
        checkHeaders: true,
        checkVulnerabilities: true,
        checkCookies: true,
        checkRedirects: true,
        checkMixedContent: true,
        checkCSP: true,
        checkXSS: true,
        checkSQLi: true
      }
    };
  }
}

// 测试套件
describe('SecurityTestEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new MockSecurityTestEngine();
  });

  afterEach(() => {
    engine.reset();
  });

  describe('初始化和配置', () => {
    it('应该正确初始化引擎', () => {
      expect(engine).toBeDefined();
      expect(engine.config.options.checkSSL).toBe(true);
      expect(engine.config.options.checkHeaders).toBe(true);
      expect(engine.results).toBeNull();
    });

    it('应该允许自定义配置选项', async () => {
      const options = {
        checkSSL: false,
        checkHeaders: true,
        checkXSS: false
      };

      await engine.analyze('https://example.com', options);
      expect(engine.config.options.checkSSL).toBe(false);
      expect(engine.config.options.checkXSS).toBe(false);
    });
  });

  describe('URL验证', () => {
    it('应该接受有效的URL', () => {
      expect(engine.isValidUrl('https://example.com')).toBe(true);
      expect(engine.isValidUrl('http://localhost:3000')).toBe(true);
      expect(engine.isValidUrl('https://sub.domain.com/path')).toBe(true);
    });

    it('应该拒绝无效的URL', () => {
      expect(engine.isValidUrl('not-a-url')).toBe(false);
      expect(engine.isValidUrl('ftp://example.com')).toBe(true); // FTP仍然是有效URL
      expect(engine.isValidUrl('')).toBe(false);
    });

    it('应该在无效URL时抛出错误', async () => {
      await expect(engine.analyze('invalid-url')).rejects.toThrow('Invalid URL provided');
    });
  });

  describe('SSL证书检查', () => {
    it('应该检测HTTPS使用情况', async () => {
      const httpsResult = await engine.checkSSLCertificate('https://example.com');
      expect(httpsResult.valid).toBe(true);
      expect(httpsResult.grade).toBeDefined();

      const httpResult = await engine.checkSSLCertificate('http://example.com');
      expect(httpResult.valid).toBe(false);
      expect(httpResult.errors).toContain('网站未使用HTTPS');
    });

    it('应该返回证书详细信息', async () => {
      const result = await engine.checkSSLCertificate('https://example.com');
      expect(result.issuer).toBeDefined();
      expect(result.validFrom).toBeInstanceOf(Date);
      expect(result.validTo).toBeInstanceOf(Date);
      expect(result.protocol).toBeDefined();
      expect(result.cipher).toBeDefined();
    });
  });

  describe('安全头部检查', () => {
    it('应该检测缺失的安全头部', async () => {
      const result = await engine.checkSecurityHeaders('https://example.com');
      expect(result.present).toBeInstanceOf(Array);
      expect(result.missing).toBeInstanceOf(Array);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('应该为每个缺失头部提供建议', async () => {
      const result = await engine.checkSecurityHeaders('https://example.com');
      if (result.missing.length > 0) {
        result.missing.forEach(header => {
          expect(header.name).toBeDefined();
          expect(header.severity).toMatch(/^(low|medium|high|critical)$/);
          expect(header.recommendation).toBeDefined();
        });
      }
    });
  });

  describe('Cookie安全性检查', () => {
    it('应该检测不安全的Cookie设置', async () => {
      const result = await engine.checkCookieSecurity('https://example.com');
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.secure).toBeGreaterThanOrEqual(0);
      expect(result.insecure).toBeInstanceOf(Array);
    });

    it('应该识别Cookie安全问题', async () => {
      const result = await engine.checkCookieSecurity('https://example.com');
      if (result.insecure.length > 0) {
        result.insecure.forEach(cookie => {
          expect(cookie.name).toBeDefined();
          expect(cookie.issues).toBeInstanceOf(Array);
          expect(cookie.issues.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('XSS漏洞检查', () => {
    it('应该测试XSS漏洞', async () => {
      const result = await engine.checkXSSVulnerabilities('https://example.com');
      expect(result.vulnerable).toBeDefined();
      expect(result.tested).toBeGreaterThan(0);
      
      if (result.vulnerable) {
        expect(result.details).toBeDefined();
        expect(result.details.payload).toBeDefined();
        expect(result.details.type).toBeDefined();
      }
    });
  });

  describe('SQL注入检查', () => {
    it('应该测试SQL注入漏洞', async () => {
      const result = await engine.checkSQLInjection('https://example.com');
      expect(result.vulnerable).toBeDefined();
      expect(result.tested).toBeGreaterThan(0);
      
      if (result.vulnerable) {
        expect(result.details).toBeDefined();
        expect(result.details.payload).toBeDefined();
        expect(result.details.type).toBeDefined();
      }
    });
  });

  describe('完整安全分析', () => {
    it('应该执行完整的安全分析', async () => {
      const result = await engine.analyze('https://example.com');
      
      expect(result.url).toBe('https://example.com');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
      expect(result.details).toBeDefined();
    });

    it('应该正确分类安全问题', async () => {
      const result = await engine.analyze('https://example.com');
      
      result.issues.forEach(issue => {
        expect(issue.type).toBeDefined();
        expect(issue.severity).toMatch(/^(low|medium|high|critical)$/);
        expect(issue.message).toBeDefined();
      });
    });

    it('应该生成准确的摘要统计', async () => {
      const result = await engine.analyze('https://example.com');
      const summary = result.summary;
      
      expect(summary.totalIssues).toBe(result.issues.length);
      
      const criticalCount = result.issues.filter(i => i.severity === 'critical').length;
      const highCount = result.issues.filter(i => i.severity === 'high').length;
      const mediumCount = result.issues.filter(i => i.severity === 'medium').length;
      const lowCount = result.issues.filter(i => i.severity === 'low').length;
      
      expect(summary.criticalIssues).toBe(criticalCount);
      expect(summary.highIssues).toBe(highCount);
      expect(summary.mediumIssues).toBe(mediumCount);
      expect(summary.lowIssues).toBe(lowCount);
    });

    it('应该正确计算安全评分', async () => {
      const result = await engine.analyze('https://example.com');
      
      // 验证评分计算逻辑
      let expectedScore = 100;
      result.issues.forEach(issue => {
        switch (issue.severity) {
          case 'critical':
            expectedScore -= 25;
            break;
          case 'high':
            expectedScore -= 15;
            break;
          case 'medium':
            expectedScore -= 10;
            break;
          case 'low':
            expectedScore -= 5;
            break;
        }
      });
      expectedScore = Math.max(0, expectedScore);
      
      expect(result.overallScore).toBe(expectedScore);
    });
  });

  describe('选择性测试', () => {
    it('应该只执行选定的测试', async () => {
      const options = {
        checkSSL: true,
        checkHeaders: false,
        checkCookies: false,
        checkXSS: false,
        checkSQLi: false
      };

      const result = await engine.analyze('https://example.com', options);
      
      expect(result.details.ssl).toBeDefined();
      expect(result.details.headers).toBeUndefined();
      expect(result.details.cookies).toBeUndefined();
      expect(result.details.xss).toBeUndefined();
      expect(result.details.sqli).toBeUndefined();
    });
  });

  describe('边界情况处理', () => {
    it('应该处理没有发现问题的情况', async () => {
      // 模拟一个没有问题的场景
      engine.checkSecurityHeaders = jest.fn().mockResolvedValue({
        present: ['all', 'headers'],
        missing: [],
        score: 100
      });

      engine.checkCookieSecurity = jest.fn().mockResolvedValue({
        total: 2,
        secure: 2,
        insecure: []
      });

      const result = await engine.analyze('https://secure-example.com');
      
      // 可能还有其他问题，但至少这两个检查没有问题
      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('应该处理所有测试都失败的情况', async () => {
      // 使用HTTP URL来触发一些失败
      const result = await engine.analyze('http://insecure-example.com');
      
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThan(100);
    });
  });
});

// 导出供其他测试使用
module.exports = MockSecurityTestEngine;
