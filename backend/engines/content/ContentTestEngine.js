/**
 * 内容测试引擎（重构版本）
 * 使用共享服务，消除重复代码
 */

import HTMLParsingService from '../shared/services/HTMLParsingService.js';
import ContentAnalysisService from '../shared/services/ContentAnalysisService.js';
import PerformanceMetricsService from '../shared/services/PerformanceMetricsService.js';
import https from 'https';
import http from 'http';
import { URL } from 'url';

class ContentTestEngine {
  constructor() {
    this.name = 'content';
    this.version = '2.0.0';
    this.description = '内容测试引擎 (使用共享服务)';
    this.activeTests = new Map();
    
    // 初始化服务
    this.htmlService = new HTMLParsingService();
    this.contentService = new ContentAnalysisService();
    this.performanceService = new PerformanceMetricsService();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return true;
    }
    
    // 初始化所有服务
    await Promise.all([
      this.htmlService.initialize(),
      this.contentService.initialize(),
      this.performanceService.initialize()
    ]);
    
    this.initialized = true;
    return true;
  }

  async checkAvailability() {
    await this.initialize();

    return {
      available: this.initialized,
      version: this.version,
      capabilities: this.getCapabilities(),
      services: {
        html: this.htmlService.checkAvailability(),
        content: this.contentService.checkAvailability(),
        performance: this.performanceService.checkAvailability()
      }
    };
  }

  getCapabilities() {
    return {
      analysisTypes: [
        'content-quality',    // 内容质量分析
        'readability',        // 可读性检测
        'seo-optimization',   // SEO优化
        'keyword-analysis',   // 关键词分析
        'content-structure',  // 内容结构分析
        'duplicate-content',  // 重复内容检测
        'content-freshness',  // 内容时效性
        'multimedia-analysis' // 多媒体内容分析
      ],
      languages: ['en', 'zh', 'auto-detect'],
      metrics: [
        'flesch-reading-ease',
        'word-count',
        'sentence-count',
        'paragraph-count',
        'keyword-density',
        'content-uniqueness',
        'seo-score'
      ],
      seoFactors: [
        'title-optimization',
        'meta-description',
        'heading-structure',
        'internal-links',
        'external-links',
        'image-optimization',
        'schema-markup'
      ]
    };
  }

  validateConfig(config) {
    if (!config || !config.url) {
      throw new Error('配置验证失败: URL必填');
    }

    try {
      new URL(config.url);
    } catch (error) {
      throw new Error('配置验证失败: URL格式无效');
    }

    return {
      url: config.url,
      analysisTypes: config.analysisTypes || ['content-quality', 'readability', 'seo-optimization'],
      language: config.language || 'auto-detect',
      targetKeywords: config.targetKeywords || [],
      minWordCount: config.minWordCount || 300,
      maxWordCount: config.maxWordCount || 10000,
      includeImages: config.includeImages !== false,
      includeLinks: config.includeLinks !== false,
      includePerformance: config.includePerformance || false,
      seoChecks: {
        titleLength: { min: 30, max: 60 },
        metaDescriptionLength: { min: 120, max: 160 },
        headingStructure: true,
        keywordDensity: { min: 0.5, max: 3.0 },
        ...config.seoChecks
      }
    };
  }

  async runContentTest(config) {
    const testId = `content_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    try {
      await this.initialize();
      const validatedConfig = this.validateConfig(config);
      
      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now()
      });

      this.updateTestProgress(testId, 5, '获取页面内容');
      
      const results = await this.performContentAnalysis(validatedConfig, testId);
      
      this.updateTestProgress(testId, 100, '内容测试完成');
      
      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results
      });
      
      return {
        success: true,
        testId,
        results,
        duration: Date.now() - this.activeTests.get(testId)?.startTime || 0
      };

    } catch (error) {
      this.activeTests.set(testId, {
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }

  async performContentAnalysis(config, testId) {
    try {
      // 获取页面内容
      const pageData = await this.fetchPageContent(config.url);
      this.updateTestProgress(testId, 15, '解析页面结构');
      
      // 使用HTML解析服务解析页面
      const parseResult = this.htmlService.parseHTML(pageData.html);
      if (!parseResult.success) {
        throw new Error(`HTML解析失败: ${parseResult.error}`);
      }

      this.updateTestProgress(testId, 25, '提取内容数据');
      
      // 使用HTML解析服务提取完整分析数据
      const htmlAnalysis = await this.htmlService.analyzeHTML(pageData.html, {
        baseUrl: config.url
      });

      if (!htmlAnalysis.success) {
        throw new Error(`HTML分析失败: ${htmlAnalysis.error}`);
      }

      this.updateTestProgress(testId, 40, '准备内容分析数据');

      // 准备内容数据用于分析
      const contentData = {
        textContent: htmlAnalysis.data.textContent.totalText,
        headings: htmlAnalysis.data.headingStructure.headings,
        images: htmlAnalysis.data.images.images,
        links: htmlAnalysis.data.links.links,
        paragraphCount: htmlAnalysis.data.textContent.paragraphCount,
        metaTags: htmlAnalysis.data.metaTags.metaData
      };

      this.updateTestProgress(testId, 50, '执行内容质量分析');

      // 使用内容分析服务进行分析
      const contentAnalysisResult = await this.contentService.analyzeContent(contentData, {
        analysisTypes: config.analysisTypes,
        language: config.language,
        targetKeywords: config.targetKeywords,
        ...config
      });

      if (!contentAnalysisResult.success) {
        console.warn('内容分析失败，使用基础数据:', contentAnalysisResult.error);
      }

      this.updateTestProgress(testId, 70, 'SEO优化分析');

      // SEO分析
      const seoAnalysis = await this.analyzeSEO(htmlAnalysis.data, config);

      this.updateTestProgress(testId, 85, '多媒体内容分析');

      // 多媒体分析
      const multimediaAnalysis = this.analyzeMultimedia(htmlAnalysis.data);

      // 性能指标（可选）
      let performanceAnalysis = null;
      if (config.includePerformance) {
        this.updateTestProgress(testId, 90, '性能指标收集');
        const perfResult = await this.performanceService.collectMetrics(config.url, {
          iterations: 1,
          includeContent: false
        });
        
        if (perfResult.success) {
          performanceAnalysis = {
            loadTime: perfResult.data.basicTiming.totalTime.avg,
            ttfb: perfResult.data.basicTiming.ttfb.avg,
            performanceScore: perfResult.data.performanceScore.score
          };
        }
      }

      // 汇总结果
      const results = {
        testId,
        url: config.url,
        timestamp: new Date().toISOString(),
        config,
        language: this.detectLanguage(contentData.textContent),
        
        // 基础数据
        htmlAnalysis: htmlAnalysis.data,
        
        // 内容分析结果
        contentAnalysis: contentAnalysisResult.success ? contentAnalysisResult.data : null,
        
        // SEO分析
        seoAnalysis,
        
        // 多媒体分析
        multimediaAnalysis,
        
        // 性能分析（可选）
        performanceAnalysis,
        
        // 综合评分
        summary: {
          totalIssues: 0,
          criticalIssues: 0,
          warnings: 0,
          suggestions: 0,
          overallScore: 0
        }
      };

      // 计算综合评分
      results.summary = this.calculateOverallSummary(results);
      
      // 生成综合建议
      results.recommendations = this.generateComprehensiveRecommendations(results);

      return results;
    } catch (error) {
      throw new Error(`内容分析失败: ${error.message}`);
    }
  }

  async fetchPageContent(url) {
    try {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      return new Promise((resolve, reject) => {
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
          headers: {
            'User-Agent': 'ContentTestEngine/2.0.0',
            'Accept': 'text/html,application/xhtml+xml'
          },
          timeout: 30000
        };
        
        const req = client.request(options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            resolve({
              html: data,
              statusCode: res.statusCode,
              headers: res.headers,
              size: data.length
            });
          });
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('请求超时'));
        });
        
        req.end();
      });
    } catch (error) {
      throw new Error(`无法获取页面内容: ${error.message}`);
    }
  }

  async analyzeSEO(htmlData, config) {
    try {
      const { metaTags, headingStructure, images, links, textContent } = htmlData;
      const seoIssues = [];
      const seoScore = { total: 0, maxScore: 0 };

      // 标题分析
      const titleAnalysis = {
        title: metaTags.metaData.title,
        length: metaTags.metaData.title.length,
        hasTitle: metaTags.metaData.title.length > 0,
        isOptimal: metaTags.metaData.title.length >= config.seoChecks.titleLength.min && 
                   metaTags.metaData.title.length <= config.seoChecks.titleLength.max,
        isTooShort: metaTags.metaData.title.length < config.seoChecks.titleLength.min,
        isTooLong: metaTags.metaData.title.length > config.seoChecks.titleLength.max
      };

      seoScore.maxScore += 20;
      if (titleAnalysis.hasTitle) {
        if (titleAnalysis.isOptimal) seoScore.total += 20;
        else if (!titleAnalysis.isTooShort) seoScore.total += 10;
      } else {
        seoIssues.push({
          type: 'title-missing',
          severity: 'critical',
          message: '缺少页面标题'
        });
      }

      // Meta描述分析
      const metaDescription = metaTags.metaData.description;
      const descriptionAnalysis = {
        description: metaDescription,
        length: metaDescription.length,
        hasDescription: metaDescription.length > 0,
        isOptimal: metaDescription.length >= config.seoChecks.metaDescriptionLength.min && 
                   metaDescription.length <= config.seoChecks.metaDescriptionLength.max,
        isTooShort: metaDescription.length < config.seoChecks.metaDescriptionLength.min,
        isTooLong: metaDescription.length > config.seoChecks.metaDescriptionLength.max
      };

      seoScore.maxScore += 15;
      if (descriptionAnalysis.hasDescription) {
        if (descriptionAnalysis.isOptimal) seoScore.total += 15;
        else if (!descriptionAnalysis.isTooShort) seoScore.total += 10;
      } else {
        seoIssues.push({
          type: 'meta-description-missing',
          severity: 'high',
          message: '缺少Meta描述'
        });
      }

      // 标题结构分析
      seoScore.maxScore += 20;
      if (headingStructure.hasH1) {
        seoScore.total += 10;
        if (!headingStructure.hasMultipleH1) {
          seoScore.total += 10;
        } else {
          seoIssues.push({
            type: 'multiple-h1',
            severity: 'high',
            message: `页面有${headingStructure.h1Count}个H1标题`
          });
        }
      } else {
        seoIssues.push({
          type: 'h1-missing',
          severity: 'critical',
          message: '缺少H1标题'
        });
      }

      // 图片优化分析
      seoScore.maxScore += 15;
      if (images.totalCount > 0) {
        const altPercentage = (images.withAlt / images.totalCount) * 100;
        if (altPercentage >= 90) seoScore.total += 15;
        else if (altPercentage >= 70) seoScore.total += 10;
        else seoScore.total += 5;

        if (images.withoutAlt > 0) {
          seoIssues.push({
            type: 'missing-alt-text',
            severity: 'medium',
            message: `${images.withoutAlt}张图片缺少alt属性`
          });
        }
      } else {
        seoScore.total += 10; // 没有图片也不算问题
      }

      // 链接分析
      seoScore.maxScore += 10;
      if (links.totalCount > 0) {
        seoScore.total += 5;
        if (links.internal > 0) seoScore.total += 3;
        if (links.external > 0) seoScore.total += 2;

        if (links.externalWithoutNoopener > 0) {
          seoIssues.push({
            type: 'external-links-security',
            severity: 'low',
            message: `${links.externalWithoutNoopener}个外部链接缺少安全属性`
          });
        }
      }

      // 内容长度分析
      seoScore.maxScore += 20;
      const wordCount = textContent.wordCount;
      if (wordCount >= config.minWordCount) {
        if (wordCount >= 800) seoScore.total += 20;
        else if (wordCount >= 500) seoScore.total += 15;
        else seoScore.total += 10;
      } else {
        seoIssues.push({
          type: 'content-too-short',
          severity: 'high',
          message: `内容过短 (${wordCount}词)，建议至少${config.minWordCount}词`
        });
      }

      const finalScore = seoScore.maxScore > 0 ? Math.round((seoScore.total / seoScore.maxScore) * 100) : 0;

      return {
        title: titleAnalysis,
        metaDescription: descriptionAnalysis,
        headingStructure: {
          hasH1: headingStructure.hasH1,
          h1Count: headingStructure.h1Count,
          totalHeadings: headingStructure.totalCount,
          hasProperHierarchy: headingStructure.hierarchy.isProper
        },
        images: {
          total: images.totalCount,
          withAlt: images.withAlt,
          withoutAlt: images.withoutAlt,
          altCoverage: images.totalCount > 0 ? Math.round((images.withAlt / images.totalCount) * 100) : 0
        },
        links: {
          total: links.totalCount,
          internal: links.internal,
          external: links.external,
          securityIssues: links.externalWithoutNoopener
        },
        content: {
          wordCount: wordCount,
          isAdequate: wordCount >= config.minWordCount
        },
        score: finalScore,
        grade: this.getSEOGrade(finalScore),
        issues: seoIssues
      };
    } catch (error) {
      return {
        error: error.message,
        score: 0,
        grade: 'F'
      };
    }
  }

  analyzeMultimedia(htmlData) {
    try {
      const { images } = htmlData;
      
      // 分析图片
      const imageAnalysis = {
        totalImages: images.totalCount,
        formats: this.analyzeImageFormats(images.images),
        sizeIssues: this.identifyImageSizeIssues(images.images),
        lazyLoadingSupport: images.images.filter(img => img.loading === 'lazy').length,
        responsiveImages: images.images.filter(img => img.srcset).length
      };

      // 检测视频和音频（基础检测）
      const videoCount = 0; // HTML解析服务暂不支持，可以扩展
      const audioCount = 0; // HTML解析服务暂不支持，可以扩展

      return {
        images: imageAnalysis,
        videos: { count: videoCount },
        audios: { count: audioCount },
        totalMultimedia: imageAnalysis.totalImages + videoCount + audioCount,
        hasMultimedia: imageAnalysis.totalImages + videoCount + audioCount > 0,
        optimizationScore: this.calculateMultimediaScore(imageAnalysis, videoCount, audioCount)
      };
    } catch (error) {
      return {
        error: error.message,
        optimizationScore: 0
      };
    }
  }

  // 工具方法

  detectLanguage(textContent) {
    if (!textContent) return 'unknown';
    
    // 简单的语言检测
    const chineseChars = (textContent.match(/[\u4e00-\u9fff]/g) || []).length;
    const totalChars = textContent.length;
    
    if (chineseChars / totalChars > 0.1) return 'zh';
    return 'en';
  }

  analyzeImageFormats(images) {
    const formats = {};
    
    images.forEach(image => {
      if (image.src) {
        const extension = image.src.split('.').pop()?.toLowerCase();
        if (extension) {
          formats[extension] = (formats[extension] || 0) + 1;
        }
      }
    });
    
    return formats;
  }

  identifyImageSizeIssues(images) {
    const issues = [];
    
    images.forEach((image, index) => {
      if (!image.width && !image.height) {
        issues.push({
          index,
          issue: 'missing-dimensions',
          message: '图片缺少尺寸属性'
        });
      }
    });
    
    return issues;
  }

  calculateMultimediaScore(imageAnalysis, videoCount, audioCount) {
    let score = 50; // 基础分
    
    // 图片优化评分
    if (imageAnalysis.totalImages > 0) {
      score += 20;
      
      if (imageAnalysis.lazyLoadingSupport > 0) {
        score += 15;
      }
      
      if (imageAnalysis.responsiveImages > 0) {
        score += 15;
      }
    }
    
    return Math.min(100, score);
  }

  getSEOGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  calculateOverallSummary(results) {
    let totalIssues = 0;
    let criticalIssues = 0;
    let warnings = 0;
    let totalScore = 0;
    let scoreCount = 0;

    // 统计内容分析问题
    if (results.contentAnalysis && results.contentAnalysis.summary) {
      totalIssues += results.contentAnalysis.summary.totalIssues;
      criticalIssues += results.contentAnalysis.summary.criticalIssues;
      warnings += results.contentAnalysis.summary.warnings;
      totalScore += results.contentAnalysis.summary.overallScore;
      scoreCount++;
    }

    // 统计SEO问题
    if (results.seoAnalysis && results.seoAnalysis.issues) {
      totalIssues += results.seoAnalysis.issues.length;
      criticalIssues += results.seoAnalysis.issues.filter(i => i.severity === 'critical').length;
      warnings += results.seoAnalysis.issues.filter(i => i.severity === 'medium').length;
      totalScore += results.seoAnalysis.score;
      scoreCount++;
    }

    return {
      totalIssues,
      criticalIssues,
      warnings,
      suggestions: totalIssues - criticalIssues - warnings,
      overallScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0
    };
  }

  generateComprehensiveRecommendations(results) {
    const recommendations = [];

    // 从内容分析获取建议
    if (results.contentAnalysis && results.contentAnalysis.recommendations) {
      recommendations.push(...results.contentAnalysis.recommendations);
    }

    // 从SEO分析获取建议
    if (results.seoAnalysis && results.seoAnalysis.issues) {
      results.seoAnalysis.issues.forEach(issue => {
        recommendations.push({
          category: 'seo',
          type: issue.type,
          priority: issue.severity,
          message: issue.message,
          suggestion: this.getSEOSuggestion(issue.type)
        });
      });
    }

    // 按优先级排序
    const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  }

  getSEOSuggestion(issueType) {
    const suggestions = {
      'title-missing': '添加页面标题，确保每个页面都有唯一的标题',
      'meta-description-missing': '添加Meta描述，简洁描述页面内容',
      'h1-missing': '添加H1标题，明确页面主要主题',
      'multiple-h1': '确保每个页面只有一个H1标题',
      'missing-alt-text': '为所有图片添加描述性的alt属性',
      'content-too-short': '增加内容长度，提供更详细和有价值的信息'
    };
    
    return suggestions[issueType] || '根据具体情况进行SEO优化';
  }

  updateTestProgress(testId, progress, message) {
    const test = this.activeTests.get(testId);
    if (test) {
      test.progress = progress;
      test.message = message;
      this.activeTests.set(testId, test);
    }
  }

  getTestProgress(testId) {
    return this.activeTests.get(testId) || null;
  }

  getAllActiveTests() {
    return Array.from(this.activeTests.entries()).map(([id, data]) => ({
      testId: id,
      ...data
    }));
  }
}

export default ContentTestEngine;
