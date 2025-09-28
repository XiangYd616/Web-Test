import { useState } from 'react';
/**
 * 共享安全检查模块
 * 为所有测试页面提供统一的安全检查功能
 */

// 安全检查结果接口
export interface SSLResult {
  isValid: boolean;
  issuer: string;
  validFrom: string;
  validTo: string;
  protocol: string;
  cipher: string;
  keyExchange: string;
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
  }>;
}

export interface SecurityHeaderResult {
  headers: {
    [headerName: string]: {
      present: boolean;
      value?: string;
      secure: boolean;
      recommendation?: string;
    };
  };
  score: number;
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    header: string;
    description: string;
    recommendation: string;
  }>;
}

export interface VulnerabilityResult {
  vulnerabilities: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    impact: string;
    solution: string;
    references: string[];
  }>;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  score: number;
}

export interface ContentSecurityResult {
  csp: {
    present: boolean;
    policies: string[];
    issues: string[];
    score: number;
  };
  xss: {
    protected: boolean;
    vulnerabilities: string[];
    score: number;
  };
  clickjacking: {
    protected: boolean;
    headers: string[];
    score: number;
  };
}

export interface AuthenticationSecurityResult {
  loginSecurity: {
    httpsOnly: boolean;
    strongPasswordPolicy: boolean;
    twoFactorAvailable: boolean;
    sessionSecurity: boolean;
    score: number;
  };
  apiSecurity: {
    authenticationRequired: boolean;
    tokenSecurity: boolean;
    rateLimiting: boolean;
    score: number;
  };
}

class SecurityCheckModule {
  private baseUrl: string = '';

  /**
   * 设置基础URL
   */
  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  /**
   * SSL/TLS安全检查
   */
  async checkSSL(url: string): Promise<SSLResult> {
    try {
      // 模拟SSL检查 - 在实际实现中应该调用真实的SSL检查API
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';

      const result: SSLResult = {
        isValid: isHttps,
        issuer: isHttps ? 'Let\'s Encrypt Authority X3' : 'N/A',
        validFrom: isHttps ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() : 'N/A',
        validTo: isHttps ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() : 'N/A',
        protocol: isHttps ? 'TLS 1.3' : 'HTTP',
        cipher: isHttps ? 'ECDHE-RSA-AES256-GCM-SHA384' : 'N/A',
        keyExchange: isHttps ? 'ECDH P-256' : 'N/A',
        issues: []
      };

      if (!isHttps) {
        result.issues.push({
          severity: 'critical',
          description: '网站未使用HTTPS加密',
          recommendation: '启用HTTPS以保护用户数据传输安全'
        });
      }

      // 模拟其他SSL问题检查
      if (isHttps && Math.random() > 0.7) {
        result.issues.push({
          severity: 'medium',
          description: 'SSL证书即将过期',
          recommendation: '及时更新SSL证书以避免服务中断'
        });
      }

      return result;
    } catch (error) {
      throw new Error(`SSL检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 安全头检查
   */
  async checkSecurityHeaders(url: string): Promise<SecurityHeaderResult> {
    try {
      // 模拟安全头检查
      const securityHeaders = [
        'Strict-Transport-Security',
        'Content-Security-Policy',
        'X-Frame-Options',
        'X-Content-Type-Options',
        'X-XSS-Protection',
        'Referrer-Policy',
        'Permissions-Policy'
      ];

      const result: SecurityHeaderResult = {
        headers: {},
        score: 0,
        issues: []
      };

      let presentHeaders = 0;

      securityHeaders.forEach(header => {
        const isPresent = Math.random() > 0.4; // 模拟60%的头存在
        const isSecure = isPresent && Math.random() > 0.2; // 80%的存在头是安全的

        result.headers[header] = {
          present: isPresent,
          value: isPresent ? this.getMockHeaderValue(header) : undefined,
          secure: isSecure,
          recommendation: !isPresent ? this.getHeaderRecommendation(header) : undefined
        };

        if (isPresent) {
          presentHeaders++;
          if (!isSecure) {
            result.issues.push({
              severity: this.getHeaderSeverity(header),
              header,
              description: `${header} 配置不安全`,
              recommendation: this.getHeaderRecommendation(header)
            });
          }
        } else {
          result.issues.push({
            severity: this.getHeaderSeverity(header),
            header,
            description: `缺少 ${header} 安全头`,
            recommendation: this.getHeaderRecommendation(header)
          });
        }
      });

      result.score = Math.round((presentHeaders / securityHeaders.length) * 100);

      return result;
    } catch (error) {
      throw new Error(`安全头检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 漏洞扫描
   */
  async scanVulnerabilities(url: string): Promise<VulnerabilityResult> {
    try {
      // 模拟漏洞扫描
      const commonVulnerabilities = [
        {
          id: 'XSS-001',
          type: 'Cross-Site Scripting',
          severity: 'high' as const,
          title: '反射型XSS漏洞',
          description: '用户输入未经过滤直接输出到页面',
          impact: '攻击者可以执行恶意脚本，窃取用户信息',
          solution: '对所有用户输入进行HTML编码和验证',
          references: ['https://owasp.org/www-community/attacks/xss/']
        },
        {
          id: 'CSRF-001',
          type: 'Cross-Site Request Forgery',
          severity: 'medium' as const,
          title: 'CSRF攻击风险',
          description: '缺少CSRF令牌保护',
          impact: '攻击者可能伪造用户请求执行未授权操作',
          solution: '实施CSRF令牌验证机制',
          references: ['https://owasp.org/www-community/attacks/csrf']
        },
        {
          id: 'SQL-001',
          type: 'SQL Injection',
          severity: 'critical' as const,
          title: 'SQL注入风险',
          description: '数据库查询参数未经过滤',
          impact: '攻击者可能获取、修改或删除数据库数据',
          solution: '使用参数化查询和输入验证',
          references: ['https://owasp.org/www-community/attacks/SQL_Injection']
        }
      ];

      // 随机选择一些漏洞
      const foundVulnerabilities = commonVulnerabilities.filter(() => Math.random() > 0.6);

      const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
      const totalSeverity = foundVulnerabilities.reduce((sum, vuln) => sum + severityScores[vuln.severity], 0);
      const maxSeverity = Math.max(...foundVulnerabilities.map(v => severityScores[v.severity]), 0);

      let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (maxSeverity >= 4) overallRisk = 'critical';
      else if (maxSeverity >= 3) overallRisk = 'high';
      else if (maxSeverity >= 2) overallRisk = 'medium';

      const score = Math.max(0, 100 - (totalSeverity * 10));

      return {
        vulnerabilities: foundVulnerabilities,
        overallRisk,
        score
      };
    } catch (error) {
      throw new Error(`漏洞扫描失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 内容安全检查
   */
  async checkContentSecurity(url: string): Promise<ContentSecurityResult> {
    try {
      // 模拟内容安全检查
      const hasCsp = Math.random() > 0.5;
      const hasXssProtection = Math.random() > 0.3;
      const hasClickjackingProtection = Math.random() > 0.4;

      return {
        csp: {
          present: hasCsp,
          policies: hasCsp ? [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'"
          ] : [],
          issues: hasCsp ? [] : ['缺少Content Security Policy'],
          score: hasCsp ? 85 : 20
        },
        xss: {
          protected: hasXssProtection,
          vulnerabilities: hasXssProtection ? [] : ['缺少XSS保护机制'],
          score: hasXssProtection ? 90 : 30
        },
        clickjacking: {
          protected: hasClickjackingProtection,
          headers: hasClickjackingProtection ? ['X-Frame-Options: DENY'] : [],
          score: hasClickjackingProtection ? 95 : 25
        }
      };
    } catch (error) {
      throw new Error(`内容安全检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 认证安全检查
   */
  async checkAuthenticationSecurity(url: string): Promise<AuthenticationSecurityResult> {
    try {
      // 模拟认证安全检查
      const httpsOnly = url.startsWith('https://');
      const strongPasswordPolicy = Math.random() > 0.4;
      const twoFactorAvailable = Math.random() > 0.6;
      const sessionSecurity = Math.random() > 0.3;

      const authRequired = Math.random() > 0.2;
      const tokenSecurity = Math.random() > 0.5;
      const rateLimiting = Math.random() > 0.4;

      return {
        loginSecurity: {
          httpsOnly,
          strongPasswordPolicy,
          twoFactorAvailable,
          sessionSecurity,
          score: Math.round(
            (Number(httpsOnly) + Number(strongPasswordPolicy) +
              Number(twoFactorAvailable) + Number(sessionSecurity)) / 4 * 100
          )
        },
        apiSecurity: {
          authenticationRequired: authRequired,
          tokenSecurity,
          rateLimiting,
          score: Math.round(
            (Number(authRequired) + Number(tokenSecurity) + Number(rateLimiting)) / 3 * 100
          )
        }
      };
    } catch (error) {
      throw new Error(`认证安全检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 综合安全评估
   */
  async performComprehensiveSecurityCheck(url: string) {
    try {
      const [
        sslResult,
        headersResult,
        vulnerabilityResult,
        contentSecurityResult,
        authSecurityResult
      ] = await Promise.all([
        this.checkSSL(url),
        this.checkSecurityHeaders(url),
        this.scanVulnerabilities(url),
        this.checkContentSecurity(url),
        this.checkAuthenticationSecurity(url)
      ]);

      // 计算总体安全评分
      const scores = [
        sslResult.isValid ? 100 : 0,
        headersResult.score,
        vulnerabilityResult.score,
        contentSecurityResult.csp.score,
        authSecurityResult.loginSecurity.score
      ];

      const overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

      return {
        ssl: sslResult,
        headers: headersResult,
        vulnerabilities: vulnerabilityResult,
        contentSecurity: contentSecurityResult,
        authentication: authSecurityResult,
        overallScore,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`综合安全检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取模拟头值
   */
  private getMockHeaderValue(header: string): string {
    const mockValues: { [key: string]: string } = {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    };
    return mockValues[header] || 'present';
  }

  /**
   * 获取头建议
   */
  private getHeaderRecommendation(header: string): string {
    const recommendations: { [key: string]: string } = {
      'Strict-Transport-Security': '添加HSTS头以强制HTTPS连接',
      'Content-Security-Policy': '配置CSP以防止XSS攻击',
      'X-Frame-Options': '设置X-Frame-Options防止点击劫持',
      'X-Content-Type-Options': '设置nosniff防止MIME类型嗅探',
      'X-XSS-Protection': '启用浏览器XSS过滤器',
      'Referrer-Policy': '配置引用策略保护用户隐私',
      'Permissions-Policy': '限制浏览器功能访问权限'
    };
    return recommendations[header] || '配置此安全头以提高安全性';
  }

  /**
   * 获取头严重程度
   */
  private getHeaderSeverity(header: string): 'low' | 'medium' | 'high' | 'critical' {
    const severities: { [key: string]: 'low' | 'medium' | 'high' | 'critical' } = {
      'Strict-Transport-Security': 'high',
      'Content-Security-Policy': 'high',
      'X-Frame-Options': 'medium',
      'X-Content-Type-Options': 'medium',
      'X-XSS-Protection': 'medium',
      'Referrer-Policy': 'low',
      'Permissions-Policy': 'low'
    };
    return severities[header] || 'medium';
  }
}

// 创建单例实例
export const securityCheckModule = new SecurityCheckModule();

export default securityCheckModule;

// 导出React Hook
export const useSecurityCheck = () => {
  const [error, setError] = useState<string | null>(null);

  return {
    checkSSL: securityCheckModule.checkSSL.bind(securityCheckModule),
    checkSecurityHeaders: securityCheckModule.checkSecurityHeaders.bind(securityCheckModule),
    scanVulnerabilities: securityCheckModule.scanVulnerabilities.bind(securityCheckModule),
    checkContentSecurity: securityCheckModule.checkContentSecurity.bind(securityCheckModule),
    checkAuthenticationSecurity: securityCheckModule.checkAuthenticationSecurity.bind(securityCheckModule),
    performComprehensiveCheck: securityCheckModule.performComprehensiveSecurityCheck.bind(securityCheckModule)
  };
};
