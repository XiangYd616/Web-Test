/**
 * 安全分析引擎
 * 本地化程度：100%
 * 集成SQL注入、XSS、SSL/TLS、安全头等安全检测功能
 */

const puppeteer = require('puppeteer');
const SQLInjectionAnalyzer = require('./analyzers/SQLInjectionAnalyzer');
const XSSAnalyzer = require('./analyzers/XSSAnalyzer');
const SSLAnalyzer = require('./analyzers/SSLAnalyzer');
const AdvancedSSLAnalyzer = require('./analyzers/AdvancedSSLAnalyzer');
const SecurityHeadersAnalyzer = require('./analyzers/SecurityHeadersAnalyzer');
const AdvancedSecurityHeadersAnalyzer = require('./analyzers/AdvancedSecurityHeadersAnalyzer');
const SecurityRiskAssessment = require('./utils/SecurityRiskAssessment');

class SecurityAnalyzer {
  constructor(options = {}) {
    this.options = {
      timeout: 30000,
      waitUntil: 'networkidle2',
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...options
    };

    this.browser = null;
    this.page = null;

    // 分析器实例
    this.sqlInjectionAnalyzer = new SQLInjectionAnalyzer();
    this.xssAnalyzer = new XSSAnalyzer();
    this.sslAnalyzer = new SSLAnalyzer();
    this.advancedSSLAnalyzer = new AdvancedSSLAnalyzer();
    this.securityHeadersAnalyzer = new SecurityHeadersAnalyzer();
    this.advancedSecurityHeadersAnalyzer = new AdvancedSecurityHeadersAnalyzer();
    this.riskAssessment = new SecurityRiskAssessment();
  }

  /**
   * 执行安全分析
   */
  async analyze(url, config = {}) {
    const startTime = Date.now();

    try {
      console.log(`🔒 开始安全分析: ${url}`);

      // 初始化浏览器
      await this.initBrowser();

      // 发送进度更新
      if (config.onProgress) {
        config.onProgress({
          percentage: 10,
          stage: 'loading',
          message: '加载页面...'
        });
      }

      // 加载页面
      await this.loadPage(url);

      // 执行各项安全检测
      const results = {
        url,
        timestamp: new Date().toISOString(),
        analysisTime: 0,
        vulnerabilities: [],
        details: {
          sqlInjection: null,
          xss: null,
          ssl: null,
          headers: null
        },
        scores: null,
        recommendations: []
      };

      // SQL注入检测
      if (config.onProgress) {
        config.onProgress({
          percentage: 25,
          stage: 'analyzing',
          message: '检测SQL注入漏洞...'
        });
      }

      try {
        const sqlResults = await this.sqlInjectionAnalyzer.analyze(this.page, url);
        results.details.sqlInjection = sqlResults;
        results.vulnerabilities.push(...sqlResults.vulnerabilities);
      } catch (error) {
        console.warn('SQL注入检测失败:', error.message);
        results.details.sqlInjection = { error: error.message };
      }

      // XSS检测
      if (config.onProgress) {
        config.onProgress({
          percentage: 45,
          stage: 'analyzing',
          message: '检测XSS漏洞...'
        });
      }

      try {
        const xssResults = await this.xssAnalyzer.analyze(this.page, url);
        results.details.xss = xssResults;
        results.vulnerabilities.push(...xssResults.vulnerabilities);
      } catch (error) {
        console.warn('XSS检测失败:', error.message);
        results.details.xss = { error: error.message };
      }

      // SSL/TLS检测
      if (config.onProgress) {
        config.onProgress({
          percentage: 65,
          stage: 'analyzing',
          message: '检测SSL/TLS安全性...'
        });
      }

      try {
        // 使用高级SSL分析器进行深度分析
        const advancedSSLResults = await this.advancedSSLAnalyzer.analyze(url);
        results.details.ssl = advancedSSLResults;
        results.vulnerabilities.push(...advancedSSLResults.vulnerabilities);

        // 如果高级分析失败，回退到基础SSL分析
        if (!advancedSSLResults || advancedSSLResults.vulnerabilities.length === 0) {
          const basicSSLResults = await this.sslAnalyzer.analyze(url);
          results.details.sslBasic = basicSSLResults;
          if (basicSSLResults.vulnerabilities) {
            results.vulnerabilities.push(...basicSSLResults.vulnerabilities);
          }
        }
      } catch (error) {
        console.warn('SSL/TLS检测失败:', error.message);

        // 尝试基础SSL分析作为备用
        try {
          const basicSSLResults = await this.sslAnalyzer.analyze(url);
          results.details.ssl = basicSSLResults;
          results.vulnerabilities.push(...basicSSLResults.vulnerabilities);
        } catch (fallbackError) {
          results.details.ssl = { error: error.message, fallbackError: fallbackError.message };
        }
      }

      // 安全头检测
      if (config.onProgress) {
        config.onProgress({
          percentage: 80,
          stage: 'analyzing',
          message: '检测安全头配置...'
        });
      }

      try {
        // 使用高级安全头分析器进行深度分析
        const advancedHeaderResults = await this.advancedSecurityHeadersAnalyzer.analyze(url);
        results.details.headers = advancedHeaderResults;
        results.vulnerabilities.push(...advancedHeaderResults.vulnerabilities);

        // 如果高级分析失败，回退到基础安全头分析
        if (!advancedHeaderResults || advancedHeaderResults.vulnerabilities.length === 0) {
          const basicHeaderResults = await this.securityHeadersAnalyzer.analyze(url);
          results.details.headersBasic = basicHeaderResults;
          if (basicHeaderResults.vulnerabilities) {
            results.vulnerabilities.push(...basicHeaderResults.vulnerabilities);
          }
        }
      } catch (error) {
        console.warn('安全头检测失败:', error.message);

        // 尝试基础安全头分析作为备用
        try {
          const basicHeaderResults = await this.securityHeadersAnalyzer.analyze(url);
          results.details.headers = basicHeaderResults;
          results.vulnerabilities.push(...basicHeaderResults.vulnerabilities);
        } catch (fallbackError) {
          results.details.headers = { error: error.message, fallbackError: fallbackError.message };
        }
      }

      if (config.onProgress) {
        config.onProgress({
          percentage: 90,
          stage: 'calculating',
          message: '计算安全评分...'
        });
      }

      // 计算分析时间
      results.analysisTime = Date.now() - startTime;

      // 计算评分
      results.scores = this.calculateScores(results);

      // 生成建议
      results.recommendations = this.generateRecommendations(results);

      // 执行风险评估
      results.riskAssessment = this.riskAssessment.assessSecurityRisk(results);

      console.log(`✅ 安全分析完成: ${url} - 总评分: ${results.scores.overall.score} - 风险等级: ${results.riskAssessment.overallRiskLevel}`);

      return results;

    } catch (error) {
      console.error(`❌ 安全分析失败: ${url}`, error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 初始化浏览器
   */
  async initBrowser() {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security', // 允许跨域请求以进行安全测试
          '--allow-running-insecure-content'
        ]
      });

      this.page = await this.browser.newPage();

      // 设置视口
      await this.page.setViewport(this.options.viewport);

      // 设置用户代理
      await this.page.setUserAgent(this.options.userAgent);

      // 设置超时
      this.page.setDefaultTimeout(this.options.timeout);

      // 忽略HTTPS错误以进行SSL测试
      await this.page.setIgnoreHTTPSErrors(true);

      console.log('✅ 浏览器初始化完成');
    } catch (error) {
      console.error('❌ 浏览器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 加载页面
   */
  async loadPage(url) {
    try {
      // 导航到页面
      const response = await this.page.goto(url, {
        waitUntil: this.options.waitUntil,
        timeout: this.options.timeout
      });

      // 注意：对于安全测试，我们不检查响应状态，因为可能需要测试错误页面

      // 等待页面稳定
      await this.page.waitForTimeout(2000);

      console.log('✅ 页面加载完成');
    } catch (error) {
      console.error('❌ 页面加载失败:', error);
      // 对于安全测试，即使页面加载失败也继续进行某些检测
    }
  }

  /**
   * 计算综合评分
   */
  calculateScores(results) {
    const scores = {
      sqlInjection: {
        score: this.calculateModuleScore(results.details.sqlInjection),
        grade: null,
        weight: 0.3
      },
      xss: {
        score: this.calculateModuleScore(results.details.xss),
        grade: null,
        weight: 0.3
      },
      ssl: {
        score: this.calculateSSLScore(results.details.ssl),
        grade: null,
        weight: 0.25
      },
      headers: {
        score: this.calculateHeadersScore(results.details.headers),
        grade: null,
        weight: 0.15
      }
    };

    // 计算各模块等级
    Object.keys(scores).forEach(key => {
      scores[key].grade = this.getGrade(scores[key].score);
    });

    // 计算总分
    const totalScore = Object.values(scores).reduce((sum, category) => {
      return sum + (category.score * category.weight);
    }, 0);

    scores.overall = {
      score: Math.round(totalScore),
      grade: this.getGrade(Math.round(totalScore))
    };

    return scores;
  }

  /**
   * 计算模块评分
   */
  calculateModuleScore(moduleResults) {
    if (!moduleResults || moduleResults.error) {
      return 50; // 检测失败给中等分数
    }

    const vulnerabilities = moduleResults.vulnerabilities || [];
    if (vulnerabilities.length === 0) {
      return 100; // 无漏洞
    }

    let score = 100;

    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
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

  /**
   * 计算SSL评分
   */
  calculateSSLScore(sslResults) {
    if (!sslResults || sslResults.error) {
      return 50;
    }

    if (!sslResults.summary.httpsEnabled) {
      return 0; // 未启用HTTPS
    }

    return this.calculateModuleScore(sslResults);
  }

  /**
   * 计算安全头评分
   */
  calculateHeadersScore(headerResults) {
    if (!headerResults || headerResults.error) {
      return 50;
    }

    // 如果是高级分析结果，使用其评分
    if (headerResults.securityScore !== undefined) {
      return headerResults.securityScore;
    }

    // 否则使用传统评分方法
    return headerResults.summary?.securityScore || this.calculateModuleScore(headerResults);
  }

  /**
   * 获取等级
   */
  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(results) {
    const recommendations = [];

    // 收集所有漏洞的建议
    results.vulnerabilities.forEach(vuln => {
      if (vuln.recommendation) {
        recommendations.push({
          category: this.getVulnerabilityCategory(vuln.type),
          type: vuln.type,
          priority: this.getPriority(vuln.severity),
          title: vuln.recommendation,
          description: vuln.description,
          severity: vuln.severity,
          impact: this.getImpact(vuln.severity)
        });
      }
    });

    // 添加通用安全建议
    if (results.scores.overall.score < 80) {
      recommendations.push({
        category: 'general',
        priority: 'high',
        title: '实施全面的安全策略',
        description: '建议制定和实施全面的Web应用安全策略',
        impact: 'high'
      });
    }

    // 按优先级排序
    return recommendations.sort((a, b) => {
      const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * 获取漏洞分类
   */
  getVulnerabilityCategory(type) {
    if (type.includes('sql')) return 'injection';
    if (type.includes('xss')) return 'xss';
    if (type.includes('ssl') || type.includes('certificate')) return 'ssl';
    if (type.includes('header') || type.includes('cookie')) return 'headers';
    return 'general';
  }

  /**
   * 获取优先级
   */
  getPriority(severity) {
    const priorityMap = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low'
    };
    return priorityMap[severity] || 'medium';
  }

  /**
   * 获取影响程度
   */
  getImpact(severity) {
    const impactMap = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low'
    };
    return impactMap[severity] || 'medium';
  }

  /**
   * 清理资源
   */
  async cleanup() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      console.log('✅ 资源清理完成');
    } catch (error) {
      console.error('❌ 资源清理失败:', error);
    }
  }
}

module.exports = SecurityAnalyzer;
