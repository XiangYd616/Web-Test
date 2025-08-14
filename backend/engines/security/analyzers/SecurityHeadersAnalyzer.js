/**
 * 安全头检测器
 * 本地化程度：100%
 * 检测HTTP安全头的配置和安全性
 */

const axios = require('axios');

class SecurityHeadersAnalyzer {
  constructor() {
    // 安全头配置规则
    this.securityHeaders = {
      'strict-transport-security': {
        required: true,
        severity: 'high',
        description: 'HTTP严格传输安全',
        recommendation: '添加HSTS头以强制HTTPS连接',
        validPatterns: [
          /max-age=\d+/,
          /includeSubDomains/,
          /preload/
        ],
        minMaxAge: 31536000 // 1年
      },
      
      'content-security-policy': {
        required: true,
        severity: 'high',
        description: '内容安全策略',
        recommendation: '配置CSP以防止XSS和数据注入攻击',
        dangerousValues: [
          /unsafe-inline/,
          /unsafe-eval/,
          /\*/
        ]
      },
      
      'x-frame-options': {
        required: true,
        severity: 'medium',
        description: '防止点击劫持',
        recommendation: '设置X-Frame-Options为DENY或SAMEORIGIN',
        validValues: ['DENY', 'SAMEORIGIN']
      },
      
      'x-content-type-options': {
        required: true,
        severity: 'medium',
        description: '防止MIME类型嗅探',
        recommendation: '设置X-Content-Type-Options为nosniff',
        validValues: ['nosniff']
      },
      
      'x-xss-protection': {
        required: false,
        severity: 'low',
        description: 'XSS保护',
        recommendation: '设置X-XSS-Protection为1; mode=block',
        validValues: ['1; mode=block', '1']
      },
      
      'referrer-policy': {
        required: true,
        severity: 'medium',
        description: '引用策略',
        recommendation: '设置适当的Referrer-Policy',
        validValues: [
          'no-referrer',
          'no-referrer-when-downgrade',
          'origin',
          'origin-when-cross-origin',
          'same-origin',
          'strict-origin',
          'strict-origin-when-cross-origin',
          'unsafe-url'
        ]
      },
      
      'permissions-policy': {
        required: false,
        severity: 'low',
        description: '权限策略',
        recommendation: '配置Permissions-Policy限制浏览器功能',
        validPatterns: [
          /camera=\(\)/,
          /microphone=\(\)/,
          /geolocation=\(\)/
        ]
      }
    };
    
    // Cookie安全属性
    this.cookieSecurityAttributes = {
      'Secure': {
        required: true,
        severity: 'medium',
        description: 'Cookie仅通过HTTPS传输'
      },
      'HttpOnly': {
        required: true,
        severity: 'medium',
        description: '防止JavaScript访问Cookie'
      },
      'SameSite': {
        required: true,
        severity: 'medium',
        description: '防止CSRF攻击',
        validValues: ['Strict', 'Lax', 'None']
      }
    };
  }

  /**
   * 执行安全头检测
   */
  async analyze(url) {
    try {
      console.log('🛡️ 开始安全头检测...');
      
      const results = {
        vulnerabilities: [],
        details: {
          headers: {},
          cookies: [],
          missing: [],
          misconfigured: []
        },
        summary: {
          riskLevel: 'low',
          securityScore: 100
        }
      };
      
      // 获取HTTP响应头
      const response = await this.fetchHeaders(url);
      results.details.headers = response.headers;
      results.details.cookies = response.cookies;
      
      // 检查安全头
      const headerVulns = this.analyzeHeaders(response.headers);
      results.vulnerabilities.push(...headerVulns.vulnerabilities);
      results.details.missing = headerVulns.missing;
      results.details.misconfigured = headerVulns.misconfigured;
      
      // 检查Cookie安全性
      const cookieVulns = this.analyzeCookies(response.cookies);
      results.vulnerabilities.push(...cookieVulns);
      
      // 计算安全评分
      results.summary = this.calculateSummary(results.vulnerabilities);
      
      console.log(`✅ 安全头检测完成，发现 ${results.vulnerabilities.length} 个安全问题`);
      
      return results;
    } catch (error) {
      console.error('❌ 安全头检测失败:', error);
      throw error;
    }
  }

  /**
   * 获取HTTP响应头
   */
  async fetchHeaders(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true, // 接受所有状态码
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      // 解析Cookie
      const cookies = this.parseCookies(response.headers['set-cookie'] || []);
      
      return {
        headers: response.headers,
        cookies,
        status: response.status
      };
    } catch (error) {
      throw new Error(`获取响应头失败: ${error.message}`);
    }
  }

  /**
   * 分析安全头
   */
  analyzeHeaders(headers) {
    const vulnerabilities = [];
    const missing = [];
    const misconfigured = [];
    
    // 检查每个安全头
    for (const [headerName, config] of Object.entries(this.securityHeaders)) {
      const headerValue = headers[headerName] || headers[headerName.toLowerCase()];
      
      if (!headerValue) {
        if (config.required) {
          missing.push(headerName);
          vulnerabilities.push({
            type: 'missing_security_header',
            severity: config.severity,
            description: `缺少安全头: ${headerName}`,
            details: {
              header: headerName,
              description: config.description,
              recommendation: config.recommendation
            },
            recommendation: config.recommendation
          });
        }
      } else {
        // 检查头部配置是否正确
        const configIssues = this.validateHeaderConfig(headerName, headerValue, config);
        if (configIssues.length > 0) {
          misconfigured.push({
            header: headerName,
            value: headerValue,
            issues: configIssues
          });
          
          configIssues.forEach(issue => {
            vulnerabilities.push({
              type: 'misconfigured_security_header',
              severity: issue.severity || config.severity,
              description: `安全头配置错误: ${headerName} - ${issue.description}`,
              details: {
                header: headerName,
                value: headerValue,
                issue: issue.description
              },
              recommendation: issue.recommendation || config.recommendation
            });
          });
        }
      }
    }
    
    return {
      vulnerabilities,
      missing,
      misconfigured
    };
  }

  /**
   * 验证安全头配置
   */
  validateHeaderConfig(headerName, headerValue, config) {
    const issues = [];
    
    switch (headerName) {
      case 'strict-transport-security':
        issues.push(...this.validateHSTS(headerValue));
        break;
        
      case 'content-security-policy':
        issues.push(...this.validateCSP(headerValue));
        break;
        
      case 'x-frame-options':
        if (!config.validValues.includes(headerValue.toUpperCase())) {
          issues.push({
            description: `无效的X-Frame-Options值: ${headerValue}`,
            recommendation: '使用DENY或SAMEORIGIN'
          });
        }
        break;
        
      case 'x-content-type-options':
        if (headerValue.toLowerCase() !== 'nosniff') {
          issues.push({
            description: `无效的X-Content-Type-Options值: ${headerValue}`,
            recommendation: '设置为nosniff'
          });
        }
        break;
        
      case 'referrer-policy':
        if (!config.validValues.includes(headerValue.toLowerCase())) {
          issues.push({
            description: `无效的Referrer-Policy值: ${headerValue}`,
            recommendation: '使用推荐的策略值'
          });
        }
        break;
    }
    
    return issues;
  }

  /**
   * 验证HSTS配置
   */
  validateHSTS(value) {
    const issues = [];
    
    // 检查max-age
    const maxAgeMatch = value.match(/max-age=(\d+)/);
    if (!maxAgeMatch) {
      issues.push({
        description: '缺少max-age指令',
        recommendation: '添加max-age指令'
      });
    } else {
      const maxAge = parseInt(maxAgeMatch[1]);
      if (maxAge < this.securityHeaders['strict-transport-security'].minMaxAge) {
        issues.push({
          description: `max-age值过小: ${maxAge}秒`,
          recommendation: '建议设置为至少31536000秒（1年）'
        });
      }
    }
    
    // 检查includeSubDomains
    if (!value.includes('includeSubDomains')) {
      issues.push({
        severity: 'low',
        description: '建议添加includeSubDomains指令',
        recommendation: '添加includeSubDomains以保护子域名'
      });
    }
    
    // 检查preload
    if (!value.includes('preload')) {
      issues.push({
        severity: 'low',
        description: '建议添加preload指令',
        recommendation: '添加preload指令并提交到HSTS预加载列表'
      });
    }
    
    return issues;
  }

  /**
   * 验证CSP配置
   */
  validateCSP(value) {
    const issues = [];
    
    // 检查危险的指令
    if (value.includes('unsafe-inline')) {
      issues.push({
        severity: 'high',
        description: 'CSP包含unsafe-inline指令',
        recommendation: '移除unsafe-inline，使用nonce或hash'
      });
    }
    
    if (value.includes('unsafe-eval')) {
      issues.push({
        severity: 'high',
        description: 'CSP包含unsafe-eval指令',
        recommendation: '移除unsafe-eval，避免动态代码执行'
      });
    }
    
    // 检查通配符
    if (value.includes("'*'") || value.includes('*')) {
      issues.push({
        severity: 'medium',
        description: 'CSP使用通配符，可能过于宽松',
        recommendation: '使用具体的域名而不是通配符'
      });
    }
    
    // 检查基本指令
    const requiredDirectives = ['default-src', 'script-src', 'style-src'];
    requiredDirectives.forEach(directive => {
      if (!value.includes(directive)) {
        issues.push({
          severity: 'medium',
          description: `CSP缺少${directive}指令`,
          recommendation: `添加${directive}指令以增强安全性`
        });
      }
    });
    
    return issues;
  }

  /**
   * 分析Cookie安全性
   */
  analyzeCookies(cookies) {
    const vulnerabilities = [];
    
    cookies.forEach(cookie => {
      // 检查Secure属性
      if (!cookie.secure) {
        vulnerabilities.push({
          type: 'insecure_cookie',
          severity: 'medium',
          description: `Cookie "${cookie.name}" 缺少Secure属性`,
          details: { cookieName: cookie.name },
          recommendation: '为所有Cookie添加Secure属性'
        });
      }
      
      // 检查HttpOnly属性
      if (!cookie.httpOnly) {
        vulnerabilities.push({
          type: 'cookie_accessible_by_javascript',
          severity: 'medium',
          description: `Cookie "${cookie.name}" 缺少HttpOnly属性`,
          details: { cookieName: cookie.name },
          recommendation: '为敏感Cookie添加HttpOnly属性'
        });
      }
      
      // 检查SameSite属性
      if (!cookie.sameSite) {
        vulnerabilities.push({
          type: 'cookie_missing_samesite',
          severity: 'medium',
          description: `Cookie "${cookie.name}" 缺少SameSite属性`,
          details: { cookieName: cookie.name },
          recommendation: '为Cookie添加适当的SameSite属性'
        });
      } else if (!this.cookieSecurityAttributes.SameSite.validValues.includes(cookie.sameSite)) {
        vulnerabilities.push({
          type: 'cookie_invalid_samesite',
          severity: 'low',
          description: `Cookie "${cookie.name}" 的SameSite值无效: ${cookie.sameSite}`,
          details: { cookieName: cookie.name, sameSite: cookie.sameSite },
          recommendation: '使用Strict、Lax或None作为SameSite值'
        });
      }
    });
    
    return vulnerabilities;
  }

  /**
   * 解析Cookie
   */
  parseCookies(setCookieHeaders) {
    const cookies = [];
    
    setCookieHeaders.forEach(cookieHeader => {
      const parts = cookieHeader.split(';').map(part => part.trim());
      const [nameValue] = parts;
      const [name, value] = nameValue.split('=');
      
      const cookie = {
        name: name.trim(),
        value: value ? value.trim() : '',
        secure: false,
        httpOnly: false,
        sameSite: null,
        domain: null,
        path: null,
        expires: null,
        maxAge: null
      };
      
      // 解析Cookie属性
      parts.slice(1).forEach(part => {
        const [attrName, attrValue] = part.split('=').map(s => s.trim());
        
        switch (attrName.toLowerCase()) {
          case 'secure':
            cookie.secure = true;
            break;
          case 'httponly':
            cookie.httpOnly = true;
            break;
          case 'samesite':
            cookie.sameSite = attrValue;
            break;
          case 'domain':
            cookie.domain = attrValue;
            break;
          case 'path':
            cookie.path = attrValue;
            break;
          case 'expires':
            cookie.expires = attrValue;
            break;
          case 'max-age':
            cookie.maxAge = parseInt(attrValue);
            break;
        }
      });
      
      cookies.push(cookie);
    });
    
    return cookies;
  }

  /**
   * 计算安全评分
   */
  calculateSummary(vulnerabilities) {
    const severities = vulnerabilities.map(v => v.severity);
    let riskLevel = 'low';
    let securityScore = 100;
    
    // 根据漏洞严重程度扣分
    severities.forEach(severity => {
      switch (severity) {
        case 'critical':
          securityScore -= 25;
          break;
        case 'high':
          securityScore -= 15;
          break;
        case 'medium':
          securityScore -= 10;
          break;
        case 'low':
          securityScore -= 5;
          break;
      }
    });
    
    securityScore = Math.max(0, securityScore);
    
    // 确定风险等级
    if (severities.includes('critical')) {
      riskLevel = 'critical';
    } else if (severities.includes('high')) {
      riskLevel = 'high';
    } else if (severities.includes('medium')) {
      riskLevel = 'medium';
    }
    
    return {
      riskLevel,
      securityScore,
      totalIssues: vulnerabilities.length,
      criticalCount: severities.filter(s => s === 'critical').length,
      highCount: severities.filter(s => s === 'high').length,
      mediumCount: severities.filter(s => s === 'medium').length,
      lowCount: severities.filter(s => s === 'low').length
    };
  }
}

module.exports = SecurityHeadersAnalyzer;
