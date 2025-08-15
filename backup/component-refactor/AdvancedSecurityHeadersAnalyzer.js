/**
 * 高级安全头和配置分析器
 * 本地化程度：100%
 * 深度分析HTTP安全头、服务器配置、安全策略等
 */

const axios = require('axios');
const { URL } = require('url');

class AdvancedSecurityHeadersAnalyzer {
  constructor() {
    // 扩展的安全头配置
    this.securityHeaders = {
      'strict-transport-security': {
        required: true,
        severity: 'high',
        category: 'transport',
        description: 'HTTP严格传输安全(HSTS)',
        purpose: '强制客户端使用HTTPS连接，防止协议降级攻击',
        recommendation: '配置HSTS头，建议包含includeSubDomains和preload指令',
        scoring: { present: 25, configured: 15, optimal: 10 },
        validation: {
          minMaxAge: 31536000, // 1年
          shouldIncludeSubDomains: true,
          shouldIncludePreload: true
        }
      },

      'content-security-policy': {
        required: true,
        severity: 'critical',
        category: 'injection',
        description: '内容安全策略(CSP)',
        purpose: '防止XSS、数据注入和其他代码注入攻击',
        recommendation: '配置严格的CSP策略，避免使用unsafe-inline和unsafe-eval',
        scoring: { present: 30, configured: 20, optimal: 15 },
        validation: {
          dangerousDirectives: ['unsafe-inline', 'unsafe-eval', '*'],
          requiredDirectives: ['default-src', 'script-src', 'style-src'],
          recommendedDirectives: ['img-src', 'font-src', 'connect-src', 'frame-src']
        }
      },

      'x-frame-options': {
        required: true,
        severity: 'medium',
        category: 'clickjacking',
        description: '防点击劫持保护',
        purpose: '防止页面被嵌入到iframe中进行点击劫持攻击',
        recommendation: '设置为DENY或SAMEORIGIN，或使用CSP的frame-ancestors指令',
        scoring: { present: 15, configured: 10 },
        validation: {
          validValues: ['DENY', 'SAMEORIGIN'],
          conflictsWith: 'content-security-policy'
        }
      },

      'x-content-type-options': {
        required: true,
        severity: 'medium',
        category: 'sniffing',
        description: '防MIME类型嗅探',
        purpose: '防止浏览器进行MIME类型嗅探，避免安全漏洞',
        recommendation: '设置为nosniff',
        scoring: { present: 10, configured: 5 },
        validation: {
          validValues: ['nosniff']
        }
      },

      'referrer-policy': {
        required: true,
        severity: 'medium',
        category: 'privacy',
        description: '引用策略',
        purpose: '控制Referer头的发送策略，保护用户隐私',
        recommendation: '根据需要设置适当的策略，推荐strict-origin-when-cross-origin',
        scoring: { present: 10, configured: 5 },
        validation: {
          validValues: [
            'no-referrer', 'no-referrer-when-downgrade', 'origin',
            'origin-when-cross-origin', 'same-origin', 'strict-origin',
            'strict-origin-when-cross-origin', 'unsafe-url'
          ],
          recommended: 'strict-origin-when-cross-origin'
        }
      },

      'permissions-policy': {
        required: false,
        severity: 'low',
        category: 'privacy',
        description: '权限策略',
        purpose: '控制浏览器功能的访问权限',
        recommendation: '限制不必要的浏览器功能访问',
        scoring: { present: 5, configured: 5 },
        validation: {
          recommendedPolicies: ['camera=()', 'microphone=()', 'geolocation=()']
        }
      },

      'cross-origin-embedder-policy': {
        required: false,
        severity: 'low',
        category: 'isolation',
        description: '跨源嵌入策略',
        purpose: '启用跨源隔离，提高安全性',
        recommendation: '设置为require-corp以启用跨源隔离',
        scoring: { present: 5, configured: 5 },
        validation: {
          validValues: ['unsafe-none', 'require-corp']
        }
      },

      'cross-origin-opener-policy': {
        required: false,
        severity: 'low',
        category: 'isolation',
        description: '跨源开启策略',
        purpose: '防止跨源窗口访问',
        recommendation: '设置为same-origin或same-origin-allow-popups',
        scoring: { present: 5, configured: 5 },
        validation: {
          validValues: ['unsafe-none', 'same-origin-allow-popups', 'same-origin']
        }
      },

      'cross-origin-resource-policy': {
        required: false,
        severity: 'low',
        category: 'isolation',
        description: '跨源资源策略',
        purpose: '防止跨源资源访问',
        recommendation: '根据需要设置为same-site或cross-origin',
        scoring: { present: 5, configured: 5 },
        validation: {
          validValues: ['same-site', 'same-origin', 'cross-origin']
        }
      }
    };

    // 服务器配置检测
    this.serverConfigs = {
      'server': {
        category: 'information_disclosure',
        description: '服务器信息泄露',
        severity: 'low',
        recommendation: '隐藏或修改Server头以减少信息泄露'
      },
      'x-powered-by': {
        category: 'information_disclosure',
        description: '技术栈信息泄露',
        severity: 'low',
        recommendation: '移除X-Powered-By头以减少攻击面'
      },
      'x-aspnet-version': {
        category: 'information_disclosure',
        description: 'ASP.NET版本信息泄露',
        severity: 'medium',
        recommendation: '隐藏ASP.NET版本信息'
      }
    };

    // Cookie安全属性
    this.cookieAttributes = {
      'Secure': {
        required: true,
        severity: 'medium',
        description: 'Cookie仅通过HTTPS传输',
        purpose: '防止Cookie在不安全连接中传输'
      },
      'HttpOnly': {
        required: true,
        severity: 'medium',
        description: '防止JavaScript访问Cookie',
        purpose: '减少XSS攻击的影响'
      },
      'SameSite': {
        required: true,
        severity: 'medium',
        description: '防止CSRF攻击',
        purpose: '控制跨站请求中Cookie的发送',
        validValues: ['Strict', 'Lax', 'None']
      }
    };
  }

  /**
   * 执行高级安全头分析
   */
  async analyze(url) {
    try {
      console.log('🛡️ 开始高级安全头和配置分析...');

      const analysis = {
        url,
        timestamp: new Date().toISOString(),
        securityHeaders: null,
        serverConfiguration: null,
        cookieSecurity: null,
        vulnerabilities: [],
        recommendations: [],
        securityScore: 0,
        grade: 'F',
        compliance: null
      };

      // 获取HTTP响应信息
      const responseData = await this.fetchResponseData(url);

      // 分析安全头
      analysis.securityHeaders = this.analyzeSecurityHeaders(responseData.headers);

      // 分析服务器配置
      analysis.serverConfiguration = this.analyzeServerConfiguration(responseData.headers);

      // 分析Cookie安全性
      analysis.cookieSecurity = this.analyzeCookieSecurity(responseData.cookies);

      // 合并漏洞
      analysis.vulnerabilities = [
        ...analysis.securityHeaders.vulnerabilities,
        ...analysis.serverConfiguration.vulnerabilities,
        ...analysis.cookieSecurity.vulnerabilities
      ];

      // 计算安全评分
      const scoring = this.calculateSecurityScore(analysis);
      analysis.securityScore = scoring.score;
      analysis.grade = scoring.grade;

      // 生成建议
      analysis.recommendations = this.generateRecommendations(analysis);

      // 合规性检查
      analysis.compliance = this.checkCompliance(analysis);

      console.log(`✅ 高级安全头分析完成 - 评分: ${analysis.securityScore}/100 (${analysis.grade}级)`);

      return analysis;

    } catch (error) {
      console.error('❌ 高级安全头分析失败:', error);
      throw error;
    }
  }

  /**
   * 获取响应数据
   */
  async fetchResponseData(url) {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        validateStatus: () => true,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      // 解析Cookie
      const cookies = this.parseCookies(response.headers['set-cookie'] || []);

      return {
        headers: response.headers,
        cookies,
        status: response.status,
        redirects: response.request._redirects || []
      };
    } catch (error) {
      throw new Error(`获取响应数据失败: ${error.message}`);
    }
  }

  /**
   * 分析安全头
   */
  analyzeSecurityHeaders(headers) {
    const vulnerabilities = [];
    const present = [];
    const missing = [];
    const misconfigured = [];
    let totalScore = 0;
    let maxScore = 0;

    for (const [headerName, config] of Object.entries(this.securityHeaders)) {
      maxScore += config.scoring.present + (config.scoring.configured || 0) + (config.scoring.optimal || 0);

      const headerValue = this.getHeaderValue(headers, headerName);

      if (!headerValue) {
        missing.push({
          header: headerName,
          severity: config.severity,
          description: config.description,
          recommendation: config.recommendation
        });

        if (config.required) {
          vulnerabilities.push({
            type: 'missing_security_header',
            severity: config.severity,
            header: headerName,
            description: `缺少${config.description}安全头`,
            recommendation: config.recommendation,
            category: config.category
          });
        }
      } else {
        present.push({ header: headerName, value: headerValue });
        totalScore += config.scoring.present;

        // 验证头部配置
        const validation = this.validateHeader(headerName, headerValue, config);
        if (validation.isValid) {
          totalScore += config.scoring.configured || 0;
          if (validation.isOptimal) {
            totalScore += config.scoring.optimal || 0;
          }
        } else {
          misconfigured.push({
            header: headerName,
            value: headerValue,
            issues: validation.issues,
            severity: config.severity
          });

          validation.issues.forEach(issue => {
            vulnerabilities.push({
              type: 'misconfigured_security_header',
              severity: config.severity,
              header: headerName,
              description: `${config.description}配置不当: ${issue}`,
              recommendation: config.recommendation,
              category: config.category
            });
          });
        }
      }
    }

    return {
      present,
      missing,
      misconfigured,
      vulnerabilities,
      score: Math.round((totalScore / maxScore) * 100),
      analysis: {
        totalHeaders: Object.keys(this.securityHeaders).length,
        presentCount: present.length,
        missingCount: missing.length,
        misconfiguredCount: misconfigured.length
      }
    };
  }

  /**
   * 分析服务器配置
   */
  analyzeServerConfiguration(headers) {
    const vulnerabilities = [];
    const exposedInfo = [];
    const recommendations = [];

    // 检查信息泄露头
    for (const [headerName, config] of Object.entries(this.serverConfigs)) {
      const headerValue = this.getHeaderValue(headers, headerName);

      if (headerValue) {
        exposedInfo.push({
          header: headerName,
          value: headerValue,
          risk: config.severity
        });

        vulnerabilities.push({
          type: 'information_disclosure',
          severity: config.severity,
          header: headerName,
          description: config.description,
          value: headerValue,
          recommendation: config.recommendation,
          category: config.category
        });
      }
    }

    // 检查HTTP方法
    const allowedMethods = this.getHeaderValue(headers, 'allow');
    if (allowedMethods) {
      const methods = allowedMethods.split(',').map(m => m.trim().toUpperCase());
      const dangerousMethods = ['TRACE', 'TRACK', 'DELETE', 'PUT', 'PATCH'];
      const foundDangerous = methods.filter(m => dangerousMethods.includes(m));

      if (foundDangerous.length > 0) {
        vulnerabilities.push({
          type: 'dangerous_http_methods',
          severity: 'medium',
          description: `允许危险的HTTP方法: ${foundDangerous.join(', ')}`,
          recommendation: '禁用不必要的HTTP方法',
          category: 'configuration'
        });
      }
    }

    // 检查缓存控制
    const cacheControl = this.getHeaderValue(headers, 'cache-control');
    if (!cacheControl || !cacheControl.includes('no-cache')) {
      const pragma = this.getHeaderValue(headers, 'pragma');
      if (!pragma || !pragma.includes('no-cache')) {
        recommendations.push({
          type: 'cache_control',
          priority: 'low',
          description: '考虑为敏感页面设置适当的缓存控制头',
          recommendation: '为敏感内容添加Cache-Control: no-cache, no-store'
        });
      }
    }

    return {
      exposedInfo,
      vulnerabilities,
      recommendations,
      analysis: {
        hasServerHeader: !!this.getHeaderValue(headers, 'server'),
        hasPoweredBy: !!this.getHeaderValue(headers, 'x-powered-by'),
        hasVersionInfo: exposedInfo.some(info => info.header.includes('version'))
      }
    };
  }

  /**
   * 分析Cookie安全性
   */
  analyzeCookieSecurity(cookies) {
    const vulnerabilities = [];
    const insecureCookies = [];
    const recommendations = [];

    cookies.forEach(cookie => {
      const issues = [];

      // 检查Secure属性
      if (!cookie.secure) {
        issues.push('缺少Secure属性');
      }

      // 检查HttpOnly属性
      if (!cookie.httpOnly) {
        issues.push('缺少HttpOnly属性');
      }

      // 检查SameSite属性
      if (!cookie.sameSite) {
        issues.push('缺少SameSite属性');
      } else if (!this.cookieAttributes.SameSite.validValues.includes(cookie.sameSite)) {
        issues.push(`SameSite值无效: ${cookie.sameSite}`);
      }

      // 检查过期时间
      if (!cookie.expires && !cookie.maxAge) {
        issues.push('缺少过期时间设置');
      }

      if (issues.length > 0) {
        insecureCookies.push({
          name: cookie.name,
          issues,
          severity: 'medium'
        });

        vulnerabilities.push({
          type: 'insecure_cookie',
          severity: 'medium',
          cookie: cookie.name,
          description: `Cookie安全配置不当: ${issues.join(', ')}`,
          recommendation: '为Cookie添加Secure、HttpOnly和SameSite属性',
          category: 'cookie_security'
        });
      }
    });

    return {
      totalCookies: cookies.length,
      insecureCookies,
      vulnerabilities,
      recommendations,
      analysis: {
        allSecure: insecureCookies.length === 0,
        secureCount: cookies.filter(c => c.secure).length,
        httpOnlyCount: cookies.filter(c => c.httpOnly).length,
        sameSiteCount: cookies.filter(c => c.sameSite).length
      }
    };
  }

  /**
   * 验证安全头配置
   */
  validateHeader(headerName, headerValue, config) {
    const issues = [];
    let isValid = true;
    let isOptimal = true;

    switch (headerName) {
      case 'strict-transport-security':
        const maxAgeMatch = headerValue.match(/max-age=(/d+)/);
        if (!maxAgeMatch) {
          issues.push('缺少max-age指令');
          isValid = false;
        } else {
          const maxAge = parseInt(maxAgeMatch[1]);
          if (maxAge < config.validation.minMaxAge) {
            issues.push(`max-age时间过短，建议至少${config.validation.minMaxAge}秒`);
            isOptimal = false;
          }
        }

        if (!headerValue.includes('includeSubDomains')) {
          issues.push('建议添加includeSubDomains指令');
          isOptimal = false;
        }

        if (!headerValue.includes('preload')) {
          issues.push('建议添加preload指令');
          isOptimal = false;
        }
        break;

      case 'content-security-policy':
        config.validation.dangerousDirectives.forEach(dangerous => {
          if (headerValue.includes(dangerous)) {
            issues.push(`包含危险指令: ${dangerous}`);
            isValid = false;
          }
        });

        config.validation.requiredDirectives.forEach(required => {
          if (!headerValue.includes(required)) {
            issues.push(`缺少必需指令: ${required}`);
            isOptimal = false;
          }
        });
        break;

      case 'x-frame-options':
        if (!config.validation.validValues.includes(headerValue.toUpperCase())) {
          issues.push(`无效值: ${headerValue}`);
          isValid = false;
        }
        break;

      case 'referrer-policy':
        if (!config.validation.validValues.includes(headerValue)) {
          issues.push(`无效值: ${headerValue}`);
          isValid = false;
        } else if (headerValue !== config.validation.recommended) {
          issues.push(`建议使用: ${config.validation.recommended}`);
          isOptimal = false;
        }
        break;
    }

    return { isValid, isOptimal, issues };
  }

  /**
   * 计算安全评分
   */
  calculateSecurityScore(analysis) {
    let totalScore = 0;
    let maxScore = 100;

    // 安全头评分 (60%)
    const headerScore = analysis.securityHeaders.score * 0.6;
    totalScore += headerScore;

    // 服务器配置评分 (25%)
    let configScore = 25;
    analysis.serverConfiguration.vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'high': configScore -= 10; break;
        case 'medium': configScore -= 5; break;
        case 'low': configScore -= 2; break;
      }
    });
    totalScore += Math.max(0, configScore);

    // Cookie安全评分 (15%)
    let cookieScore = 15;
    if (analysis.cookieSecurity.totalCookies > 0) {
      const secureRatio = (analysis.cookieSecurity.totalCookies - analysis.cookieSecurity.insecureCookies.length) /
        analysis.cookieSecurity.totalCookies;
      cookieScore = secureRatio * 15;
    }
    totalScore += cookieScore;

    const finalScore = Math.max(0, Math.min(100, Math.round(totalScore)));

    return {
      score: finalScore,
      grade: this.getGrade(finalScore),
      breakdown: {
        headers: Math.round(headerScore),
        configuration: Math.round(Math.max(0, configScore)),
        cookies: Math.round(cookieScore)
      }
    };
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // 基于缺失的安全头生成建议
    analysis.securityHeaders.missing.forEach(missing => {
      if (missing.severity === 'critical' || missing.severity === 'high') {
        recommendations.push({
          priority: 'high',
          category: 'security_headers',
          title: `添加${missing.header}安全头`,
          description: missing.description,
          implementation: this.getHeaderImplementation(missing.header),
          impact: 'high'
        });
      }
    });

    // 基于配置错误生成建议
    analysis.securityHeaders.misconfigured.forEach(misc => {
      recommendations.push({
        priority: 'medium',
        category: 'security_headers',
        title: `修复${misc.header}配置`,
        description: `当前配置存在问题: ${misc.issues.join(', ')}`,
        implementation: this.getHeaderImplementation(misc.header),
        impact: 'medium'
      });
    });

    // 基于信息泄露生成建议
    analysis.serverConfiguration.exposedInfo.forEach(info => {
      recommendations.push({
        priority: 'low',
        category: 'information_disclosure',
        title: `隐藏${info.header}头信息`,
        description: '减少服务器信息泄露',
        implementation: `移除或修改${info.header}头`,
        impact: 'low'
      });
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 合规性检查
   */
  checkCompliance(analysis) {
    const compliance = {
      owasp: this.checkOWASPCompliance(analysis),
      gdpr: this.checkGDPRCompliance(analysis),
      pci: this.checkPCICompliance(analysis)
    };

    return compliance;
  }

  // 辅助方法
  getHeaderValue(headers, headerName) {
    return headers[headerName] || headers[headerName.toLowerCase()];
  }

  parseCookies(setCookieHeaders) {
    return setCookieHeaders.map(cookieStr => {
      const parts = cookieStr.split(';').map(part => part.trim());
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
            cookie.sameSite = val;
            break;
          case 'expires':
            cookie.expires = val;
            break;
          case 'max-age':
            cookie.maxAge = parseInt(val);
            break;
        }
      });

      return cookie;
    });
  }

  getHeaderImplementation(headerName) {
    const implementations = {
      'strict-transport-security': 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
      'content-security-policy': "Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
      'x-frame-options': 'X-Frame-Options: DENY',
      'x-content-type-options': 'X-Content-Type-Options: nosniff',
      'referrer-policy': 'Referrer-Policy: strict-origin-when-cross-origin'
    };

    return implementations[headerName] || `${headerName}: <appropriate-value>`;
  }

  checkOWASPCompliance(analysis) {
    const requiredHeaders = ['content-security-policy', 'x-frame-options', 'x-content-type-options'];
    const presentHeaders = analysis.securityHeaders.present.map(h => h.header);
    const missing = requiredHeaders.filter(h => !presentHeaders.includes(h));

    return {
      compliant: missing.length === 0,
      missing,
      score: Math.round(((requiredHeaders.length - missing.length) / requiredHeaders.length) * 100)
    };
  }

  checkGDPRCompliance(analysis) {
    // 简化的GDPR检查
    const hasPrivacyHeaders = analysis.securityHeaders.present.some(h =>
      ['referrer-policy', 'permissions-policy'].includes(h.header)
    );

    return {
      compliant: hasPrivacyHeaders,
      recommendations: hasPrivacyHeaders ? [] : ['添加隐私相关安全头']
    };
  }

  checkPCICompliance(analysis) {
    // 简化的PCI DSS检查
    const hasSecureTransport = analysis.securityHeaders.present.some(h =>
      h.header === 'strict-transport-security'
    );

    return {
      compliant: hasSecureTransport,
      recommendations: hasSecureTransport ? [] : ['启用HSTS以满足安全传输要求']
    };
  }

  getGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 55) return 'C-';
    if (score >= 50) return 'D+';
    if (score >= 45) return 'D';
    if (score >= 40) return 'D-';
    return 'F';
  }
}

module.exports = AdvancedSecurityHeadersAnalyzer;
