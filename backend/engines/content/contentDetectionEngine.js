/**
 * 内容检测引擎
 * 
 * 提供全面的内容安全扫描功能，包括恶意内容检测、敏感信息扫描、
 * 内容质量分析、合规性检查等
 * 
 * @author Test-Web Team
 * @since 1.0.0
 */

const axios = require('axios');
const cheerio = require('cheerio');
const Joi = require('joi');

class ContentDetectionEngine {
  constructor() {
    this.name = 'ContentDetectionEngine';
    this.version = '1.0.0';
    this.activeTests = new Map();
    
    // 恶意内容关键词库
    this.maliciousKeywords = [
      // 恶意软件相关
      'virus', 'malware', 'trojan', 'spyware', 'adware', 'ransomware',
      '病毒', '恶意软件', '木马', '间谍软件', '广告软件', '勒索软件',
      
      // 钓鱼相关
      'phishing', 'fake login', 'steal password', 'credit card',
      '钓鱼', '虚假登录', '盗取密码', '信用卡',
      
      // 诈骗相关
      'scam', 'fraud', 'fake', 'counterfeit', 'illegal',
      '诈骗', '欺诈', '虚假', '假冒', '非法',
      
      // 成人内容
      'adult content', 'pornography', 'explicit',
      '成人内容', '色情', '露骨'
    ];
    
    // 敏感信息模式
    this.sensitivePatterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /(\+?\d{1,4}[\s-]?)?\(?\d{3,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/g,
      creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
      idCard: /\b\d{15}|\d{18}\b/g,
      ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
    };
  }

  /**
   * 验证配置
   */
  validateConfig(config) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      checks: Joi.array().items(
        Joi.string().valid('malicious', 'sensitive', 'quality', 'compliance', 'privacy', 'accessibility')
      ).default(['malicious', 'sensitive', 'quality']),
      depth: Joi.number().min(1).max(3).default(1),
      timeout: Joi.number().min(10000).max(120000).default(30000),
      language: Joi.string().valid('zh', 'en', 'auto').default('auto'),
      strictMode: Joi.boolean().default(false)
    });

    const { error, value } = schema.validate(config);
    if (error) {
      throw new Error(`配置验证失败: ${error.details[0].message}`);
    }

    return value;
  }

  /**
   * 检查可用性
   */
  async checkAvailability() {
    try {
      const testResponse = await axios.get('https://httpbin.org/html', {
        timeout: 5000
      });

      const $ = cheerio.load(testResponse.data);
      const hasContent = $('body').text().length > 0;

      return {
        available: testResponse.status === 200 && hasContent,
        version: {
          cheerio: require('cheerio/package.json').version,
          axios: require('axios/package.json').version
        },
        dependencies: ['cheerio', 'axios', 'joi']
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        dependencies: ['cheerio', 'axios', 'joi']
      };
    }
  }

  /**
   * 执行内容检测
   */
  async runContentDetection(config) {
    const testId = `content_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    try {
      const validatedConfig = this.validateConfig(config);

      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      this.updateTestProgress(testId, 5, '开始内容检测');

      const results = {
        testId,
        url: validatedConfig.url,
        timestamp: new Date().toISOString(),
        checks: {},
        summary: {
          totalChecks: validatedConfig.checks.length,
          passed: 0,
          failed: 0,
          warnings: 0,
          overallScore: 0,
          riskLevel: 'low'
        },
        issues: [],
        recommendations: []
      };

      // 获取页面内容
      this.updateTestProgress(testId, 10, '获取页面内容');
      const pageContent = await this.fetchPageContent(validatedConfig.url, validatedConfig.timeout);

      const progressStep = 80 / validatedConfig.checks.length;
      let currentProgress = 10;

      // 执行各项检查
      for (const check of validatedConfig.checks) {
        this.updateTestProgress(testId, currentProgress, `执行${check}检查`);

        switch (check) {
          case 'malicious':
            results.checks.malicious = await this.checkMaliciousContent(pageContent, validatedConfig);
            break;
          case 'sensitive':
            results.checks.sensitive = await this.checkSensitiveInformation(pageContent, validatedConfig);
            break;
          case 'quality':
            results.checks.quality = await this.checkContentQuality(pageContent, validatedConfig);
            break;
          case 'compliance':
            results.checks.compliance = await this.checkCompliance(pageContent, validatedConfig);
            break;
          case 'privacy':
            results.checks.privacy = await this.checkPrivacyCompliance(pageContent, validatedConfig);
            break;
          case 'accessibility':
            results.checks.accessibility = await this.checkAccessibilityContent(pageContent, validatedConfig);
            break;
        }

        currentProgress += progressStep;
      }

      this.updateTestProgress(testId, 90, '计算综合评分');

      // 计算总体评分和风险等级
      results.summary = this.calculateContentScore(results.checks);
      results.recommendations = this.generateRecommendations(results.checks);
      results.totalTime = Date.now() - this.activeTests.get(testId).startTime;

      this.updateTestProgress(testId, 100, '内容检测完成');

      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results
      });

      return results;

    } catch (error) {
      this.activeTests.set(testId, {
        status: 'failed',
        progress: 0,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 获取页面内容
   */
  async fetchPageContent(url, timeout) {
    try {
      const response = await axios.get(url, {
        timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ContentDetectionEngine/1.0)'
        },
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      
      return {
        html: response.data,
        text: $('body').text(),
        title: $('title').text(),
        meta: this.extractMetaData($),
        links: this.extractLinks($),
        images: this.extractImages($),
        scripts: this.extractScripts($),
        statusCode: response.status,
        headers: response.headers
      };
    } catch (error) {
      throw new Error(`获取页面内容失败: ${error.message}`);
    }
  }

  /**
   * 检查恶意内容
   */
  async checkMaliciousContent(pageContent, config) {
    const issues = [];
    let score = 100;

    // 检查恶意关键词
    const text = pageContent.text.toLowerCase();
    const foundKeywords = [];

    for (const keyword of this.maliciousKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
        score -= 10;
      }
    }

    if (foundKeywords.length > 0) {
      issues.push({
        type: 'malicious_keywords',
        severity: 'high',
        message: `发现可疑关键词: ${foundKeywords.join(', ')}`,
        count: foundKeywords.length
      });
    }

    // 检查可疑链接
    const suspiciousLinks = pageContent.links.filter(link => 
      this.isSuspiciousUrl(link.href)
    );

    if (suspiciousLinks.length > 0) {
      issues.push({
        type: 'suspicious_links',
        severity: 'medium',
        message: `发现可疑链接: ${suspiciousLinks.length}个`,
        links: suspiciousLinks.slice(0, 5) // 只显示前5个
      });
      score -= suspiciousLinks.length * 5;
    }

    // 检查恶意脚本
    const maliciousScripts = pageContent.scripts.filter(script =>
      this.isMaliciousScript(script)
    );

    if (maliciousScripts.length > 0) {
      issues.push({
        type: 'malicious_scripts',
        severity: 'high',
        message: `发现可疑脚本: ${maliciousScripts.length}个`,
        count: maliciousScripts.length
      });
      score -= maliciousScripts.length * 15;
    }

    return {
      score: Math.max(0, score),
      status: score >= 80 ? 'safe' : score >= 60 ? 'warning' : 'dangerous',
      issues,
      details: {
        keywordsFound: foundKeywords,
        suspiciousLinksCount: suspiciousLinks.length,
        maliciousScriptsCount: maliciousScripts.length
      }
    };
  }

  /**
   * 检查敏感信息
   */
  async checkSensitiveInformation(pageContent, config) {
    const issues = [];
    let score = 100;
    const foundSensitiveData = {};

    // 检查各种敏感信息模式
    for (const [type, pattern] of Object.entries(this.sensitivePatterns)) {
      const matches = pageContent.text.match(pattern) || [];
      if (matches.length > 0) {
        foundSensitiveData[type] = matches.length;
        issues.push({
          type: `sensitive_${type}`,
          severity: type === 'creditCard' || type === 'ssn' ? 'high' : 'medium',
          message: `发现${type}信息: ${matches.length}处`,
          count: matches.length
        });
        score -= matches.length * (type === 'creditCard' || type === 'ssn' ? 20 : 10);
      }
    }

    return {
      score: Math.max(0, score),
      status: score >= 90 ? 'safe' : score >= 70 ? 'warning' : 'risky',
      issues,
      details: foundSensitiveData
    };
  }

  /**
   * 检查内容质量
   */
  async checkContentQuality(pageContent, config) {
    const issues = [];
    let score = 100;

    // 检查内容长度
    const textLength = pageContent.text.trim().length;
    if (textLength < 100) {
      issues.push({
        type: 'content_too_short',
        severity: 'medium',
        message: '页面内容过少',
        details: { length: textLength }
      });
      score -= 20;
    }

    // 检查标题
    if (!pageContent.title || pageContent.title.length < 10) {
      issues.push({
        type: 'poor_title',
        severity: 'medium',
        message: '页面标题缺失或过短',
        details: { title: pageContent.title }
      });
      score -= 15;
    }

    // 检查重复内容
    const duplicateRatio = this.calculateDuplicateRatio(pageContent.text);
    if (duplicateRatio > 0.3) {
      issues.push({
        type: 'duplicate_content',
        severity: 'low',
        message: '内容重复度较高',
        details: { ratio: duplicateRatio }
      });
      score -= 10;
    }

    return {
      score: Math.max(0, score),
      status: score >= 80 ? 'good' : score >= 60 ? 'fair' : 'poor',
      issues,
      details: {
        textLength,
        titleLength: pageContent.title?.length || 0,
        duplicateRatio
      }
    };
  }

  /**
   * 辅助方法
   */
  extractMetaData($) {
    const meta = {};
    $('meta').each((i, elem) => {
      const name = $(elem).attr('name') || $(elem).attr('property');
      const content = $(elem).attr('content');
      if (name && content) {
        meta[name] = content;
      }
    });
    return meta;
  }

  extractLinks($) {
    const links = [];
    $('a[href]').each((i, elem) => {
      links.push({
        href: $(elem).attr('href'),
        text: $(elem).text().trim()
      });
    });
    return links;
  }

  extractImages($) {
    const images = [];
    $('img[src]').each((i, elem) => {
      images.push({
        src: $(elem).attr('src'),
        alt: $(elem).attr('alt') || ''
      });
    });
    return images;
  }

  extractScripts($) {
    const scripts = [];
    $('script').each((i, elem) => {
      const src = $(elem).attr('src');
      const content = $(elem).html();
      scripts.push({ src, content });
    });
    return scripts;
  }

  isSuspiciousUrl(url) {
    const suspiciousPatterns = [
      /bit\.ly|tinyurl|t\.co/i,
      /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/,
      /[a-z0-9]{20,}\.com/i
    ];
    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  isMaliciousScript(script) {
    if (!script.content) return false;
    const maliciousPatterns = [
      /eval\s*\(/i,
      /document\.write\s*\(/i,
      /innerHTML\s*=/i,
      /fromCharCode/i
    ];
    return maliciousPatterns.some(pattern => pattern.test(script.content));
  }

  calculateDuplicateRatio(text) {
    const words = text.split(/\s+/);
    const uniqueWords = new Set(words);
    return 1 - (uniqueWords.size / words.length);
  }

  /**
   * 更新测试进度
   */
  updateTestProgress(testId, progress, message) {
    const test = this.activeTests.get(testId);
    if (test) {
      test.progress = progress;
      test.message = message;
      test.lastUpdate = Date.now();
    }
  }

  /**
   * 获取测试状态
   */
  getTestStatus(testId) {
    return this.activeTests.get(testId) || null;
  }

  /**
   * 计算内容评分
   */
  calculateContentScore(checks) {
    // 实现评分计算逻辑
    // 这里简化处理，实际应该根据各项检查结果计算
    return {
      totalChecks: Object.keys(checks).length,
      passed: 0,
      failed: 0,
      warnings: 0,
      overallScore: 85,
      riskLevel: 'low'
    };
  }

  /**
   * 生成建议
   */
  generateRecommendations(checks) {
    const recommendations = [];
    
    // 根据检查结果生成具体建议
    if (checks.malicious && checks.malicious.issues.length > 0) {
      recommendations.push('移除或修改可疑内容和链接');
    }
    
    if (checks.sensitive && checks.sensitive.issues.length > 0) {
      recommendations.push('保护或移除敏感信息');
    }
    
    if (checks.quality && checks.quality.score < 80) {
      recommendations.push('改善内容质量和结构');
    }

    return recommendations;
  }
}

module.exports = ContentDetectionEngine;
