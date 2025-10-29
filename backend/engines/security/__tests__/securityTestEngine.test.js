/**
 * 安全测试引擎单元测试
 * @description 测试安全扫描、漏洞检测等核心功能
 */

const SecurityTestEngine = require('../securityTestEngine');
const https = require('https');
const tls = require('tls');

// Mock模块
jest.mock('https');
jest.mock('tls');

describe('安全测试引擎', () => {
  let securityEngine;

  beforeEach(() => {
    securityEngine = new SecurityTestEngine();
    jest.clearAllMocks();
  });

  describe('引擎初始化', () => {
    test('应该正确初始化引擎属性', () => {
      expect(securityEngine.name).toBe('security');
      expect(securityEngine.version).toBeDefined();
      expect(securityEngine.description).toBe('安全测试引擎');
    });
  });

  describe('可用性检查', () => {
    test('应该返回引擎可用状态', () => {
      const availability = securityEngine.checkAvailability();
      
      expect(availability.available).toBe(true);
      expect(availability.version).toBeDefined();
      expect(availability.features).toContain('security-testing');
      expect(availability.features).toContain('vulnerability-scanning');
      expect(availability.features).toContain('ssl-analysis');
    });
  });

  describe('SSL/TLS证书分析', () => {
    test('应该检测有效的SSL证书', async () => {
      const mockCert = {
        subject: { CN: 'example.com' },
        issuer: { O: 'Test CA' },
        valid_from: new Date(Date.now() - 86400000).toISOString(),
        valid_to: new Date(Date.now() + 86400000 * 365).toISOString(),
        fingerprint: 'AA:BB:CC:DD:EE:FF'
      };

      // Mock TLS连接
      tls.connect = jest.fn((options, callback) => {
        callback();
        return {
          getPeerCertificate: () => mockCert,
          destroy: jest.fn()
        };
      });

      const result = await securityEngine.analyzeSSL({ 
        protocol: 'https:', 
        hostname: 'example.com', 
        port: 443 
      });

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.certificate).toBeDefined();
    });

    test('应该检测过期的SSL证书', async () => {
      const expiredCert = {
        subject: { CN: 'example.com' },
        valid_from: new Date(Date.now() - 86400000 * 730).toISOString(),
        valid_to: new Date(Date.now() - 86400000).toISOString(), // 昨天过期
        fingerprint: 'AA:BB:CC:DD:EE:FF'
      };

      tls.connect = jest.fn((options, callback) => {
        callback();
        return {
          getPeerCertificate: () => expiredCert,
          destroy: jest.fn()
        };
      });

      const result = await securityEngine.analyzeSSL({ 
        protocol: 'https:', 
        hostname: 'example.com', 
        port: 443 
      });

      expect(result.issues).toBeDefined();
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          severity: 'critical',
          type: 'expired_certificate'
        })
      );
    });

    test('应该检测即将过期的证书', async () => {
      const soonExpireCert = {
        subject: { CN: 'example.com' },
        valid_from: new Date(Date.now() - 86400000 * 300).toISOString(),
        valid_to: new Date(Date.now() + 86400000 * 20).toISOString(), // 20天后过期
        fingerprint: 'AA:BB:CC:DD:EE:FF'
      };

      tls.connect = jest.fn((options, callback) => {
        callback();
        return {
          getPeerCertificate: () => soonExpireCert,
          destroy: jest.fn()
        };
      });

      const result = await securityEngine.analyzeSSL({ 
        protocol: 'https:', 
        hostname: 'example.com', 
        port: 443 
      });

      expect(result.issues).toBeDefined();
      expect(result.issues.some(issue => issue.type === 'expiring_soon')).toBe(true);
    });
  });

  describe('安全头部检查', () => {
    test('应该检测缺失的安全头部', async () => {
      const mockResponse = {
        headers: {
          'content-type': 'text/html'
          // 缺少所有安全头部
        }
      };

      const result = securityEngine.analyzeSecurityHeaders(mockResponse);

      expect(result.missing).toBeDefined();
      expect(result.missing.length).toBeGreaterThan(0);
      expect(result.missing).toContain('strict-transport-security');
      expect(result.missing).toContain('x-frame-options');
      expect(result.missing).toContain('x-content-type-options');
      expect(result.missing).toContain('content-security-policy');
    });

    test('应该识别正确配置的安全头部', () => {
      const mockResponse = {
        headers: {
          'strict-transport-security': 'max-age=31536000; includeSubDomains',
          'x-frame-options': 'DENY',
          'x-content-type-options': 'nosniff',
          'x-xss-protection': '1; mode=block',
          'content-security-policy': "default-src 'self'"
        }
      };

      const result = securityEngine.analyzeSecurityHeaders(mockResponse);

      expect(result.present).toBeDefined();
      expect(result.present.length).toBeGreaterThan(4);
      expect(result.missing.length).toBe(0);
      expect(result.score).toBeGreaterThan(90);
    });

    test('应该检测弱配置的安全头部', () => {
      const mockResponse = {
        headers: {
          'strict-transport-security': 'max-age=0', // 弱配置
          'x-frame-options': 'SAMEORIGIN' // 不如DENY安全
        }
      };

      const result = securityEngine.analyzeSecurityHeaders(mockResponse);

      expect(result.weakConfigurations).toBeDefined();
      expect(result.weakConfigurations.length).toBeGreaterThan(0);
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('XSS漏洞检测', () => {
    test('应该检测可能的XSS漏洞', async () => {
      const vulnerableHtml = `
        <html>
          <body>
            <script>
              var userInput = "${req.query.input}"; // 未转义的用户输入
            </script>
          </body>
        </html>
      `;

      const result = await securityEngine.scanXSSVulnerabilities(vulnerableHtml);

      expect(result.vulnerabilities).toBeDefined();
      expect(result.vulnerabilities.length).toBeGreaterThan(0);
      expect(result.riskLevel).toBe('high');
    });

    test('应该识别安全的输出编码', async () => {
      const safeHtml = `
        <html>
          <body>
            <div id="content"></div>
            <script>
              document.getElementById('content').textContent = userInput; // 安全的方法
            </script>
          </body>
        </html>
      `;

      const result = await securityEngine.scanXSSVulnerabilities(safeHtml);

      expect(result.vulnerabilities.length).toBe(0);
      expect(result.riskLevel).toBe('low');
    });
  });

  describe('SQL注入检测', () => {
    test('应该检测SQL注入风险', async () => {
      const vulnerableCode = `
        const query = "SELECT * FROM users WHERE id = " + userId;
        db.query(query);
      `;

      const result = await securityEngine.scanSQLInjection(vulnerableCode);

      expect(result.vulnerabilities).toBeDefined();
      expect(result.vulnerabilities.length).toBeGreaterThan(0);
      expect(result.vulnerabilities[0].type).toBe('sql-injection');
      expect(result.vulnerabilities[0].severity).toBe('critical');
    });

    test('应该识别参数化查询', async () => {
      const safeCode = `
        const query = "SELECT * FROM users WHERE id = $1";
        db.query(query, [userId]);
      `;

      const result = await securityEngine.scanSQLInjection(safeCode);

      expect(result.vulnerabilities.length).toBe(0);
      expect(result.safe).toBe(true);
    });
  });

  describe('CSRF保护检查', () => {
    test('应该检测缺少CSRF token的表单', () => {
      const html = `
        <form method="POST" action="/submit">
          <input name="data" />
          <button type="submit">Submit</button>
        </form>
      `;

      const result = securityEngine.checkCSRFProtection(html);

      expect(result.vulnerable).toBe(true);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'missing_csrf_token'
        })
      );
    });

    test('应该识别有CSRF保护的表单', () => {
      const html = `
        <form method="POST" action="/submit">
          <input type="hidden" name="csrf_token" value="abc123" />
          <input name="data" />
          <button type="submit">Submit</button>
        </form>
      `;

      const result = securityEngine.checkCSRFProtection(html);

      expect(result.vulnerable).toBe(false);
      expect(result.protected).toBe(true);
    });
  });

  describe('敏感信息泄露检测', () => {
    test('应该检测响应中的敏感信息', () => {
      const response = {
        data: JSON.stringify({
          user: {
            name: 'John',
            email: 'john@example.com',
            password: 'secret123', // 泄露
            apiKey: 'sk-1234567890' // 泄露
          }
        })
      };

      const result = securityEngine.checkInformationDisclosure(response);

      expect(result.leaks).toBeDefined();
      expect(result.leaks.length).toBeGreaterThan(0);
      expect(result.leaks).toContainEqual(
        expect.objectContaining({
          type: 'password',
          severity: 'critical'
        })
      );
      expect(result.leaks).toContainEqual(
        expect.objectContaining({
          type: 'api_key',
          severity: 'high'
        })
      );
    });

    test('应该检测错误消息中的敏感信息', () => {
      const errorResponse = {
        error: {
          message: 'Database connection failed at server 10.0.0.5:5432',
          stack: 'Error at /home/user/app/database.js:123'
        }
      };

      const result = securityEngine.checkInformationDisclosure(errorResponse);

      expect(result.leaks).toBeDefined();
      expect(result.leaks.some(leak => leak.type === 'internal_path')).toBe(true);
      expect(result.leaks.some(leak => leak.type === 'ip_address')).toBe(true);
    });
  });

  describe('完整安全扫描', () => {
    test('应该执行完整的安全扫描', async () => {
      const config = {
        url: 'https://example.com'
      };

      // Mock各种检查
      securityEngine.analyzeSSL = jest.fn().mockResolvedValue({
        valid: true,
        score: 95
      });
      
      securityEngine.analyzeSecurityHeaders = jest.fn().mockReturnValue({
        score: 85,
        missing: ['content-security-policy']
      });

      securityEngine.performQuickVulnerabilityScan = jest.fn().mockResolvedValue({
        xss: { vulnerabilities: [], riskLevel: 'low' },
        sqlInjection: { vulnerabilities: [], riskLevel: 'low' },
        other: []
      });

      const result = await securityEngine.performSecurityScan('https://example.com');

      expect(result).toBeDefined();
      expect(result.url).toBe('https://example.com');
      expect(result.overallScore).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.securityLevel).toBeDefined();
      expect(result.details).toBeDefined();
      expect(result.details.ssl).toBeDefined();
      expect(result.details.headers).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('应该生成安全建议', async () => {
      const scanResults = {
        ssl: { valid: false, issues: [{ type: 'expired' }] },
        headers: { missing: ['strict-transport-security', 'csp'] },
        vulnerabilities: {
          xss: { vulnerabilities: [{ severity: 'high' }] }
        }
      };

      const recommendations = securityEngine.generateEnhancedSecurityRecommendations(scanResults);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations).toContainEqual(
        expect.objectContaining({
          priority: 'high',
          category: expect.any(String)
        })
      );
    });
  });

  describe('安全评分计算', () => {
    test('应该基于扫描结果计算安全评分', () => {
      const scanResults = {
        ssl: { valid: true, score: 95 },
        headers: { score: 85, missing: 1 },
        vulnerabilities: {
          xss: { vulnerabilities: [], riskLevel: 'low' },
          sqlInjection: { vulnerabilities: [], riskLevel: 'low' }
        }
      };

      const score = securityEngine.calculateEnhancedSecurityScore(scanResults);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThan(80); // 应该是良好的分数
    });

    test('应该对严重漏洞降低评分', () => {
      const scanResults = {
        ssl: { valid: true, score: 95 },
        headers: { score: 85 },
        vulnerabilities: {
          xss: { 
            vulnerabilities: [
              { severity: 'critical' },
              { severity: 'high' }
            ],
            riskLevel: 'critical'
          },
          sqlInjection: { 
            vulnerabilities: [{ severity: 'critical' }],
            riskLevel: 'critical' 
          }
        }
      };

      const score = securityEngine.calculateEnhancedSecurityScore(scanResults);

      expect(score).toBeLessThan(50); // 严重漏洞应大幅降分
    });
  });

  describe('性能考虑', () => {
    test('快速扫描应在合理时间内完成', async () => {
      const startTime = Date.now();
      
      await securityEngine.performQuickVulnerabilityScan('https://example.com');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000); // 应在3秒内完成
    });
  });

  describe('错误处理', () => {
    test('应该优雅处理网络错误', async () => {
      tls.connect = jest.fn(() => {
        throw new Error('Connection refused');
      });

      await expect(
        securityEngine.analyzeSSL({ hostname: 'invalid.example.com' })
      ).rejects.toThrow();
    });

    test('应该处理无效的URL', async () => {
      await expect(
        securityEngine.performSecurityScan('not-a-valid-url')
      ).rejects.toThrow();
    });
  });
});

