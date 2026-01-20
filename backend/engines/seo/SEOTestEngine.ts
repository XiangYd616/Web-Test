const cheerio = require('cheerio');
const axios = require('axios');
const Joi = require('joi');
const EventEmitter = require('events');
const { query } = require('../../config/database');

type CheerioSelection = {
  each: (callback: (index: number, el: unknown) => void) => void;
  length?: number;
  attr?: (name: string) => string | undefined;
  text?: () => string;
  first?: () => CheerioSelection;
  html?: () => string | null;
  toArray?: () => unknown[];
};

type CheerioAPI = ((selector: string | unknown) => CheerioSelection) & {
  (el: unknown): CheerioSelection;
};

type SeoConfig = {
  url: string;
  checks?: string[];
  timeout?: number;
  userAgent?: string;
  testId?: string;
};

type SeoCheckResult = {
  status: string;
  score: number;
  details?: Record<string, unknown>;
  issues?: string[];
};

class SeoTestEngine extends EventEmitter {
  name: string;
  activeTests: Map<string, Record<string, unknown>>;
  defaultTimeout: number;
  progressCallback: ((progress: Record<string, unknown>) => void) | null;
  completionCallback: ((results: Record<string, unknown>) => void) | null;
  errorCallback: ((error: Error) => void) | null;

  constructor() {
    super();
    this.name = 'seo';
    this.activeTests = new Map();
    this.defaultTimeout = 30000;
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
  }

  validateConfig(config: SeoConfig) {
    const schema = Joi.object({
      url: Joi.string().uri().required(),
      checks: Joi.array()
        .items(
          Joi.string().valid(
            'meta',
            'headings',
            'images',
            'links',
            'structured-data',
            'robots',
            'sitemap'
          )
        )
        .default(['meta', 'headings', 'images', 'links']),
      timeout: Joi.number().min(5000).max(60000).default(30000),
      userAgent: Joi.string().default('Mozilla/5.0 (compatible; SEO-Bot/1.0)'),
    });

    const { error, value } = schema.validate(config);
    if (error) {
      throw new Error(`配置验证失败: ${error.details[0].message}`);
    }

    return value as SeoConfig;
  }

  async checkAvailability() {
    try {
      const probeUrl = process.env.SEO_HEALTHCHECK_URL || '';
      if (probeUrl) {
        const testResponse = await axios.get(probeUrl, {
          timeout: 5000,
        });

        const $ = cheerio.load(testResponse.data) as CheerioAPI;
        const hasTitle = ($('title').length || 0) > 0;

        return {
          engine: this.name,
          available: testResponse.status === 200 && hasTitle,
          version: {
            cheerio: require('cheerio/package.json').version,
            axios: require('axios/package.json').version,
          },
          dependencies: ['cheerio', 'axios'],
          probeUrl,
        };
      }

      return {
        engine: this.name,
        available: true,
        version: {
          cheerio: require('cheerio/package.json').version,
          axios: require('axios/package.json').version,
        },
        dependencies: ['cheerio', 'axios'],
        probeUrl: null,
      };
    } catch (error) {
      return {
        engine: this.name,
        available: false,
        error: (error as Error).message,
        dependencies: ['cheerio', 'axios'],
        probeUrl: process.env.SEO_HEALTHCHECK_URL || null,
      };
    }
  }

  async execute(config: SeoConfig) {
    return this.runSeoTest(config);
  }

  async runSeoTest(config: SeoConfig) {
    const testId =
      config?.testId || `seo_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    try {
      const validatedConfig = this.validateConfig(config);

      this.activeTests.set(testId, {
        status: 'running',
        progress: 0,
        startTime: Date.now(),
      });

      this.updateTestProgress(testId, 5, '开始SEO分析');

      this.updateTestProgress(testId, 15, '获取页面内容');
      const response = await axios.get(validatedConfig.url, {
        timeout: validatedConfig.timeout,
        headers: {
          'User-Agent': validatedConfig.userAgent,
        },
      });

      const $ = cheerio.load(response.data) as CheerioAPI;

      const results: Record<string, unknown> = {
        testId,
        url: validatedConfig.url,
        timestamp: new Date().toISOString(),
        checks: {} as Record<string, SeoCheckResult>,
        summary: {
          totalChecks: 0,
          passed: 0,
          failed: 0,
          warnings: 0,
          score: 0,
        },
      };

      const checks = [...(validatedConfig.checks || []), 'mobile', 'content'];
      const progressStep = checks.length > 0 ? 75 / checks.length : 75;
      let currentProgress = 15;

      for (const check of checks) {
        this.updateTestProgress(testId, currentProgress, `执行${check}检查`);

        switch (check) {
          case 'meta':
            (results.checks as Record<string, SeoCheckResult>).meta = this.checkMetaTags($);
            break;
          case 'headings':
            (results.checks as Record<string, SeoCheckResult>).headings = this.checkHeadings($);
            break;
          case 'images':
            (results.checks as Record<string, SeoCheckResult>).images = this.checkImages($);
            break;
          case 'links':
            (results.checks as Record<string, SeoCheckResult>).links = this.checkLinks($);
            break;
          case 'structured-data':
            (results.checks as Record<string, SeoCheckResult>).structuredData =
              this.checkStructuredData($);
            break;
          case 'robots':
            (results.checks as Record<string, SeoCheckResult>).robots = await this.checkRobotsTxt(
              validatedConfig.url
            );
            break;
          case 'sitemap':
            (results.checks as Record<string, SeoCheckResult>).sitemap = await this.checkSitemap(
              validatedConfig.url
            );
            break;
          case 'mobile':
            (results.checks as Record<string, SeoCheckResult>).mobile =
              await this.checkMobileOptimization(validatedConfig.url, $);
            break;
          case 'content':
            (results.checks as Record<string, SeoCheckResult>).content =
              this.checkContentQuality($);
            break;
        }

        currentProgress += progressStep;
      }

      this.updateTestProgress(testId, 92, '计算SEO评分和竞争力分析');

      results.summary = this.calculateSeoScore(results.checks as Record<string, SeoCheckResult>);
      results.totalTime = Date.now() - ((this.activeTests.get(testId)?.startTime as number) || 0);
      results.detailedAnalysis = {
        strengths: this.identifyStrengths(results.checks as Record<string, SeoCheckResult>),
        weaknesses: this.identifyWeaknesses(results.checks as Record<string, SeoCheckResult>),
        competitorInsights: await this.generateCompetitorInsights(
          (results.summary as { score?: number })?.score || 0
        ),
        actionPlan: this.generateActionPlan(
          (results.summary as { recommendations?: Record<string, unknown> })?.recommendations
        ),
      };

      this.updateTestProgress(testId, 100, 'SEO分析完成');

      const warnings: string[] = [];
      const errors: string[] = [];
      Object.values(results.checks as Record<string, SeoCheckResult>).forEach(check => {
        if (!check) return;
        const issues = Array.isArray(check.issues) ? check.issues : [];
        if (check.status === 'failed') {
          if (issues.length > 0) {
            errors.push(...issues.map(issue => String(issue)));
          } else {
            errors.push('SEO检查失败');
          }
        } else if (check.status === 'warning') {
          warnings.push(...issues.map(issue => String(issue)));
        }
      });

      const normalizedResult = {
        testId,
        status: 'completed',
        score: (results.summary as { score?: number })?.score ?? 0,
        summary: results.summary as Record<string, unknown>,
        warnings,
        errors,
        details: results,
      };

      const finalResult = {
        engine: this.name,
        success: true,
        testId,
        results: normalizedResult,
        status: normalizedResult.status,
        score: normalizedResult.score,
        summary: normalizedResult.summary,
        warnings: normalizedResult.warnings,
        errors: normalizedResult.errors,
        timestamp: new Date().toISOString(),
      };

      this.activeTests.set(testId, {
        status: 'completed',
        progress: 100,
        results: normalizedResult,
      });

      if (this.completionCallback) {
        this.completionCallback(finalResult);
      }

      if (this.listenerCount('complete') > 0) {
        this.emit('complete', { testId, result: finalResult });
      }

      return finalResult;
    } catch (error) {
      const message = (error as Error).message;
      const errorResult = {
        engine: this.name,
        success: false,
        testId,
        error: message,
        status: 'failed',
        score: 0,
        summary: {},
        warnings: [],
        errors: [message],
        timestamp: new Date().toISOString(),
      };

      this.activeTests.set(testId, {
        status: 'failed',
        error: message,
      });

      if (this.errorCallback) {
        this.errorCallback(error as Error);
      }
      if (this.listenerCount('error') > 0) {
        this.emit('error', { testId, error: message });
      }

      return errorResult;
    }
  }

  checkMetaTags($: CheerioAPI): SeoCheckResult {
    const results: Record<string, unknown> = {
      title: null,
      description: null,
      keywords: null,
      viewport: null,
      charset: null,
      score: 0,
      issues: [] as string[],
    };

    const titleSelection = $('title');
    const title =
      typeof titleSelection.first === 'function' ? titleSelection.first() : titleSelection;
    if ((title?.length || 0) > 0) {
      const titleText = (typeof title.text === 'function' ? title.text() : '').trim();
      results.title = {
        content: titleText,
        length: titleText.length,
        present: true,
      };

      if (titleText.length < 30) {
        (results.issues as string[]).push('标题过短（建议30-60字符）');
      } else if (titleText.length > 60) {
        (results.issues as string[]).push('标题过长（建议30-60字符）');
      } else {
        results.score = (results.score as number) + 25;
      }
    } else {
      results.title = { present: false };
      (results.issues as string[]).push('缺少title标签');
    }

    const descriptionSelection = $('meta[name="description"]');
    const description = descriptionSelection.first?.() ?? descriptionSelection;
    if ((description?.length || 0) > 0) {
      const descContent = description.attr?.('content') ?? '';
      results.description = {
        content: descContent,
        length: descContent.length,
        present: true,
      };

      if (descContent.length < 120) {
        (results.issues as string[]).push('描述过短（建议120-160字符）');
      } else if (descContent.length > 160) {
        (results.issues as string[]).push('描述过长（建议120-160字符）');
      } else {
        results.score = (results.score as number) + 25;
      }
    } else {
      results.description = { present: false };
      (results.issues as string[]).push('缺少meta description');
    }

    const viewportSelection = $('meta[name="viewport"]');
    const viewport = viewportSelection.first?.() ?? viewportSelection;
    if ((viewport?.length || 0) > 0) {
      results.viewport = {
        content: viewport.attr ? viewport.attr('content') : undefined,
        present: true,
      };
      results.score = (results.score as number) + 25;
    } else {
      results.viewport = { present: false };
      (results.issues as string[]).push('缺少viewport meta标签');
    }

    const charsetSelection = $('meta[charset]');
    const charset = charsetSelection.first?.() ?? charsetSelection;
    if ((charset?.length || 0) > 0) {
      results.charset = {
        content: charset.attr ? charset.attr('charset') : undefined,
        present: true,
      };
      results.score = (results.score as number) + 25;
    } else {
      results.charset = { present: false };
      (results.issues as string[]).push('缺少charset声明');
    }

    return {
      status:
        (results.score as number) >= 75
          ? 'passed'
          : (results.score as number) >= 50
            ? 'warning'
            : 'failed',
      score: results.score as number,
      details: results,
    };
  }

  checkHeadings($: CheerioAPI): SeoCheckResult {
    const headings: Array<Record<string, unknown>> = [];
    let score = 0;
    const issues: string[] = [];

    $('h1, h2, h3, h4, h5, h6').each((_, elem) => {
      const $elem = $(elem);
      headings.push({
        tag: ((elem as { tagName?: string }).tagName || '').toLowerCase(),
        text: ($elem.text?.() ?? '').trim(),
        level: parseInt(((elem as { tagName?: string }).tagName || 'h0').charAt(1), 10),
      });
    });

    const h1Count = headings.filter(h => h.tag === 'h1').length;
    if (h1Count === 1) {
      score += 50;
    } else if (h1Count === 0) {
      issues.push('缺少H1标签');
    } else {
      issues.push('H1标签过多（建议只有一个）');
    }

    if (headings.length > 0) {
      score += 50;
    } else {
      issues.push('页面缺少标题结构');
    }

    return {
      status: score >= 75 ? 'passed' : score >= 50 ? 'warning' : 'failed',
      score,
      details: {
        headings,
        h1Count,
        totalHeadings: headings.length,
      },
      issues,
    };
  }

  checkImages($: CheerioAPI): SeoCheckResult {
    const images: Array<Record<string, unknown>> = [];
    let score = 100;
    const issues: string[] = [];

    $('img').each((_, elem) => {
      const $img = $(elem);
      const src = $img.attr ? $img.attr('src') : undefined;
      const alt = $img.attr ? $img.attr('alt') : undefined;

      const imageInfo = {
        src,
        hasAlt: !!alt,
        altText: alt || '',
        hasTitle: !!($img.attr ? $img.attr('title') : undefined),
      };

      if (!alt) {
        issues.push(`图片缺少alt属性: ${src}`);
        score -= 10;
      }

      images.push(imageInfo);
    });

    const imagesWithoutAlt = images.filter(img => !img.hasAlt).length;
    const altCoverage =
      images.length > 0 ? ((images.length - imagesWithoutAlt) / images.length) * 100 : 100;

    return {
      status: score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed',
      score: Math.max(0, score),
      details: {
        totalImages: images.length,
        imagesWithAlt: images.length - imagesWithoutAlt,
        imagesWithoutAlt,
        altCoverage: Math.round(altCoverage),
        images: images.slice(0, 10),
      },
      issues,
    };
  }

  updateTestProgress(testId: string, progress: number, message: string) {
    const test = this.activeTests.get(testId);
    if (test) {
      test.progress = progress;
      test.message = message;
      this.activeTests.set(testId, test);
    }

    if (this.progressCallback) {
      this.progressCallback({
        testId,
        progress,
        message,
        status: (test as { status?: string })?.status || 'running',
      });
    }

    if (this.listenerCount('progress') > 0) {
      this.emit('progress', { testId, progress, message });
    }
  }

  getTestStatus(testId: string) {
    return this.activeTests.get(testId);
  }

  setProgressCallback(callback: (progress: Record<string, unknown>) => void) {
    this.progressCallback = callback;
  }

  setCompletionCallback(callback: (results: Record<string, unknown>) => void) {
    this.completionCallback = callback;
  }

  setErrorCallback(callback: (error: Error) => void) {
    this.errorCallback = callback;
  }

  checkLinks($: CheerioAPI): SeoCheckResult {
    const links: Array<Record<string, unknown>> = [];
    let score = 100;
    const issues: string[] = [];

    $('a').each((_, elem) => {
      const $link = $(elem);
      const href = $link.attr ? $link.attr('href') : undefined;
      const text = ($link.text ? $link.text() : '').trim();
      const title = $link.attr ? $link.attr('title') : undefined;
      const target = $link.attr ? $link.attr('target') : undefined;
      const rel = $link.attr ? $link.attr('rel') : undefined;

      const linkInfo = {
        href: href || '',
        text,
        hasTitle: !!title,
        target: target || '_self',
        rel: rel || '',
      };

      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        if (target === '_blank' && !(rel || '').includes('noopener')) {
          issues.push(`外部链接缺少rel="noopener": ${href}`);
          score -= 5;
        }
      }

      if (!href || href === '#') {
        issues.push('发现空链接或占位符链接');
        score -= 2;
      }

      if (!text && !title) {
        issues.push(`链接缺少描述文本: ${href}`);
        score -= 3;
      }

      links.push(linkInfo);
    });

    const internalLinks = links.filter(l => !(l.href as string).startsWith('http'));
    const externalLinks = links.filter(l => (l.href as string).startsWith('http'));

    return {
      status: score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed',
      score: Math.max(0, score),
      details: {
        totalLinks: links.length,
        internalLinks: internalLinks.length,
        externalLinks: externalLinks.length,
        links: links.slice(0, 10),
      },
      issues,
    };
  }

  checkStructuredData($: CheerioAPI): SeoCheckResult {
    const structuredData: Array<Record<string, unknown>> = [];
    let score = 0;
    const issues: string[] = [];

    $('script[type="application/ld+json"]').each((_, elem) => {
      try {
        const scriptContent = $(elem).html?.() ?? '';
        const data = JSON.parse(scriptContent as string);
        structuredData.push({
          type: 'JSON-LD',
          schema: (data as { ['@type']?: string })['@type'] || 'Unknown',
          valid: true,
        });
        score += 50;
      } catch (error) {
        issues.push('JSON-LD数据格式错误');
        structuredData.push({
          type: 'JSON-LD',
          valid: false,
          error: (error as Error).message,
        });
      }
    });

    const hasItemScope = ($('[itemscope]').length || 0) > 0;
    if (hasItemScope) {
      structuredData.push({
        type: 'Microdata',
        count: $('[itemscope]').length,
        valid: true,
      });
      score += 30;
    }

    const ogTags: Array<Record<string, unknown>> = [];
    $('meta[property^="og:"]').each((_, elem) => {
      const $meta = $(elem);
      ogTags.push({
        property: $meta.attr ? $meta.attr('property') : undefined,
        content: $meta.attr ? $meta.attr('content') : undefined,
      });
    });

    if (ogTags.length > 0) {
      structuredData.push({
        type: 'Open Graph',
        tags: ogTags,
        valid: true,
      });
      score += 20;
    }

    if (structuredData.length === 0) {
      issues.push('未检测到结构化数据');
    }

    return {
      status: score >= 50 ? 'passed' : score >= 30 ? 'warning' : 'failed',
      score,
      details: {
        structuredData,
        hasJsonLd: structuredData.some(d => d.type === 'JSON-LD'),
        hasMicrodata: hasItemScope,
        hasOpenGraph: ogTags.length > 0,
      },
      issues,
    };
  }

  async checkRobotsTxt(url: string): Promise<SeoCheckResult> {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

    try {
      const response = await axios.get(robotsUrl, {
        timeout: 5000,
        validateStatus: (status: number) => status < 500,
      });

      if (response.status === 200) {
        const content = response.data as string;
        const lines = content.split('\n').filter(line => line.trim());

        const hasUserAgent = lines.some(line => line.toLowerCase().startsWith('user-agent:'));
        const hasSitemap = lines.some(line => line.toLowerCase().startsWith('sitemap:'));
        const hasDisallow = lines.some(line => line.toLowerCase().startsWith('disallow:'));
        const hasAllow = lines.some(line => line.toLowerCase().startsWith('allow:'));

        let score = 50;
        const issues: string[] = [];

        if (!hasUserAgent) {
          issues.push('robots.txt缺少User-agent指令');
          score -= 20;
        }

        if (!hasSitemap) {
          issues.push('robots.txt中未指定sitemap');
          score -= 10;
        } else {
          score += 30;
        }

        if (hasDisallow || hasAllow) {
          score += 20;
        }

        return {
          status: 'passed',
          score,
          details: {
            exists: true,
            url: robotsUrl,
            hasUserAgent,
            hasSitemap,
            hasDirectives: hasDisallow || hasAllow,
            size: content.length,
          },
          issues,
        };
      }

      return {
        status: 'warning',
        score: 0,
        details: {
          exists: false,
          url: robotsUrl,
          statusCode: response.status,
        },
        issues: ['robots.txt不存在或无法访问'],
      };
    } catch (error) {
      return {
        status: 'failed',
        score: 0,
        details: {
          exists: false,
          url: robotsUrl,
          error: (error as Error).message,
        },
        issues: [`无法检查robots.txt: ${(error as Error).message}`],
      };
    }
  }

  async checkSitemap(url: string): Promise<SeoCheckResult> {
    const urlObj = new URL(url);
    const sitemapUrl = `${urlObj.protocol}//${urlObj.host}/sitemap.xml`;

    try {
      const response = await axios.get(sitemapUrl, {
        timeout: 5000,
        validateStatus: (status: number) => status < 500,
      });

      if (response.status === 200) {
        const content = response.data as string;
        const $ = cheerio.load(content, { xmlMode: true }) as CheerioAPI;

        const urls = $('url').length || 0;
        const hasLastmod = ($('lastmod').length || 0) > 0;
        const hasChangefreq = ($('changefreq').length || 0) > 0;
        const hasPriority = ($('priority').length || 0) > 0;

        let score = 50;
        const issues: string[] = [];

        if (urls === 0) {
          issues.push('sitemap.xml为空或格式错误');
          score = 0;
        } else {
          score += 30;
        }

        if (hasLastmod) {
          score += 10;
        } else {
          issues.push('sitemap缺少lastmod标签');
        }

        if (hasChangefreq) {
          score += 5;
        }

        if (hasPriority) {
          score += 5;
        }

        return {
          status: score >= 50 ? 'passed' : 'warning',
          score,
          details: {
            exists: true,
            url: sitemapUrl,
            urlCount: urls,
            hasLastmod,
            hasChangefreq,
            hasPriority,
          },
          issues,
        };
      }

      return {
        status: 'warning',
        score: 0,
        details: {
          exists: false,
          url: sitemapUrl,
          statusCode: response.status,
        },
        issues: ['sitemap.xml不存在或无法访问'],
      };
    } catch (error) {
      return {
        status: 'failed',
        score: 0,
        details: {
          exists: false,
          url: sitemapUrl,
          error: (error as Error).message,
        },
        issues: [`无法检查sitemap: ${(error as Error).message}`],
      };
    }
  }

  calculateSeoScore(checks: Record<string, SeoCheckResult>) {
    let totalScore = 0;
    let totalWeight = 0;
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    const weights: Record<string, number> = {
      meta: 30,
      headings: 20,
      images: 15,
      links: 10,
      structuredData: 10,
      robots: 5,
      sitemap: 10,
      mobile: 25,
      content: 20,
      performance: 15,
    };

    for (const [checkName, checkResult] of Object.entries(checks)) {
      if (checkResult && typeof checkResult === 'object') {
        const weight = weights[checkName] || 10;
        const score = checkResult.score || 0;

        totalScore += (score * weight) / 100;
        totalWeight += weight;

        if (checkResult.status === 'passed') {
          passed++;
        } else if (checkResult.status === 'failed') {
          failed++;
        } else if (checkResult.status === 'warning') {
          warnings++;
        }
      }
    }

    const finalScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;

    return {
      totalChecks: Object.keys(checks).length,
      passed,
      failed,
      warnings,
      score: finalScore,
      grade: this.getGrade(finalScore),
      level: this.getSEOLevel(finalScore),
      breakdown: this.getScoreBreakdown(checks, weights),
      competitiveness: this.calculateCompetitiveness(finalScore),
      recommendations: this.generateRecommendations(checks),
    };
  }

  getGrade(score: number) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  generateRecommendations(checks: Record<string, SeoCheckResult>) {
    const recommendations: Array<Record<string, unknown>> = [];
    const actionableItems: Array<Record<string, unknown>> = [];
    const quickWins: Array<Record<string, unknown>> = [];

    for (const [checkName, checkResult] of Object.entries(checks)) {
      if (checkResult && checkResult.issues && checkResult.issues.length > 0) {
        const categoryRecommendations = {
          category: checkName,
          priority: this.getPriorityLevel(checkResult.status, checkResult.score),
          issues: checkResult.issues,
          estimatedImpact: this.calculateImpact(checkName, checkResult.score),
          difficulty: this.getDifficultyLevel(checkName),
          timeToImplement: this.getImplementationTime(checkName, checkResult.issues.length),
        };

        recommendations.push(categoryRecommendations);

        if (
          (categoryRecommendations.difficulty as number) <= 3 &&
          (categoryRecommendations.estimatedImpact as number) >= 7
        ) {
          actionableItems.push(categoryRecommendations);
        }

        if (
          (categoryRecommendations.timeToImplement as number) <= 30 &&
          (categoryRecommendations.estimatedImpact as number) >= 5
        ) {
          quickWins.push(categoryRecommendations);
        }
      }
    }

    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
      if (priorityOrder[a.priority as string] !== priorityOrder[b.priority as string]) {
        return priorityOrder[a.priority as string] - priorityOrder[b.priority as string];
      }
      return (b.estimatedImpact as number) - (a.estimatedImpact as number);
    });

    return {
      all: recommendations,
      actionable: actionableItems,
      quickWins,
      summary: {
        total: recommendations.length,
        critical: recommendations.filter(r => r.priority === 'critical').length,
        high: recommendations.filter(r => r.priority === 'high').length,
        medium: recommendations.filter(r => r.priority === 'medium').length,
        low: recommendations.filter(r => r.priority === 'low').length,
      },
    };
  }

  async stopTest(testId: string) {
    const test = this.activeTests.get(testId) as { status?: string } | undefined;
    if (test && test.status === 'running') {
      test.status = 'cancelled';
      this.activeTests.set(testId, test as Record<string, unknown>);
      return true;
    }
    return false;
  }

  getSEOLevel(score: number) {
    if (score >= 90) return { level: 'Excellent', description: '优秀：SEO优化非常完善' };
    if (score >= 80) return { level: 'Good', description: '良好：SEO基础扎实，还有优化空间' };
    if (score >= 70) return { level: 'Fair', description: '一般：需要重点优化SEO策略' };
    if (score >= 60) return { level: 'Poor', description: '较差：SEO存在重大问题' };
    return { level: 'Very Poor', description: '很差：急需全面SEO优化' };
  }

  getScoreBreakdown(checks: Record<string, SeoCheckResult>, weights: Record<string, number>) {
    const breakdown: Record<string, unknown> = {};
    let totalPossibleScore = 0;

    for (const [checkName, checkResult] of Object.entries(checks)) {
      if (checkResult && typeof checkResult === 'object') {
        const weight = weights[checkName] || 10;
        const score = checkResult.score || 0;

        breakdown[checkName] = {
          score,
          weight,
          contribution: Math.round((score * weight) / 100),
          status: checkResult.status,
        };

        totalPossibleScore += weight;
      }
    }

    return { breakdown, totalPossibleScore };
  }

  calculateCompetitiveness(score: number) {
    const levels: Record<number, Record<string, string>> = {
      90: { level: 'Highly Competitive', description: '在搜索结果中具有很强竞争力' },
      80: { level: 'Competitive', description: '在搜索结果中具有竞争力' },
      70: { level: 'Moderately Competitive', description: '在搜索结果中具有中等竞争力' },
      60: { level: 'Low Competitive', description: '在搜索结果中竞争力较低' },
      0: { level: 'Not Competitive', description: '在搜索结果中缺乏竞争力' },
    };

    for (const [threshold, data] of Object.entries(levels)) {
      if (score >= parseInt(threshold, 10)) {
        return data;
      }
    }

    return levels[0];
  }

  getPriorityLevel(status: string, score: number) {
    if (status === 'failed' && score < 30) return 'critical';
    if (status === 'failed' || score < 50) return 'high';
    if (status === 'warning' || score < 70) return 'medium';
    return 'low';
  }

  calculateImpact(category: string, score: number) {
    const categoryImpacts: Record<string, number> = {
      meta: 9,
      headings: 7,
      mobile: 8,
      content: 8,
      performance: 7,
      structuredData: 6,
      links: 5,
      images: 4,
      robots: 3,
      sitemap: 4,
    };

    const baseImpact = categoryImpacts[category] || 5;
    const scoreFactor = (100 - score) / 100;

    return Math.min(10, Math.round(baseImpact * (1 + scoreFactor)));
  }

  getDifficultyLevel(category: string) {
    const categoryDifficulties: Record<string, number> = {
      meta: 2,
      headings: 2,
      images: 3,
      content: 7,
      mobile: 6,
      performance: 8,
      structuredData: 5,
      links: 4,
      robots: 1,
      sitemap: 2,
    };

    return categoryDifficulties[category] || 5;
  }

  getImplementationTime(category: string, issueCount: number) {
    const baseTimes: Record<string, number> = {
      meta: 30,
      headings: 45,
      images: 60,
      content: 240,
      mobile: 180,
      performance: 360,
      structuredData: 120,
      links: 90,
      robots: 15,
      sitemap: 30,
    };

    const baseTime = baseTimes[category] || 60;
    return baseTime * Math.min(issueCount, 3);
  }

  async checkMobileOptimization(url: string, $: CheerioAPI): Promise<SeoCheckResult> {
    void url;
    const results: Record<string, unknown> = {
      viewport: null,
      responsive: false,
      mobileSpeed: 0,
      touchOptimization: false,
      score: 0,
      issues: [] as string[],
    };

    const viewportSelection = $('meta[name="viewport"]');
    const viewport = viewportSelection.first?.() ?? viewportSelection;
    if ((viewport?.length || 0) > 0) {
      const content = viewport.attr?.('content') ?? '';
      results.viewport = {
        present: true,
        content,
        hasWidth: content.includes('width='),
        hasInitialScale: content.includes('initial-scale='),
        isOptimal: content.includes('width=device-width') && content.includes('initial-scale=1'),
      };

      if ((results.viewport as { isOptimal?: boolean }).isOptimal) {
        results.score = (results.score as number) + 30;
      } else {
        (results.issues as string[]).push(
          'viewport设置不是最优的（建议：width=device-width, initial-scale=1）'
        );
      }
    } else {
      results.viewport = { present: false };
      (results.issues as string[]).push('缺少viewport meta标签');
    }

    const mediaSelection = $('link[media*="screen"], style');
    const hasMediaQueries = (mediaSelection.text?.() ?? '').includes('@media');
    const allElements = $('*');
    const hasFlexboxGrid = (allElements.toArray?.() ?? []).some(elem => {
      const style = $(elem).attr?.('style') ?? '';
      return style.includes('flex') || style.includes('grid');
    });

    results.responsive = hasMediaQueries || hasFlexboxGrid;
    if (results.responsive) {
      results.score = (results.score as number) + 25;
    } else {
      (results.issues as string[]).push('未检测到响应式设计');
    }

    const hasAppropriateButtonSizes = $('button, a, input[type="button"]').length || 0;
    const hasTouchFriendlyElements = hasAppropriateButtonSizes > 0;

    results.touchOptimization = hasTouchFriendlyElements;
    if (results.touchOptimization) {
      results.score = (results.score as number) + 25;
    } else {
      (results.issues as string[]).push('未优化触摸交互元素');
    }

    const imageCount = $('img').length || 0;
    const scriptCount = $('script').length || 0;
    const stylesheetCount = $('link[rel="stylesheet"]').length || 0;

    let speedScore = 100;
    if (imageCount > 20) speedScore -= 20;
    if (scriptCount > 10) speedScore -= 15;
    if (stylesheetCount > 5) speedScore -= 10;

    results.mobileSpeed = Math.max(0, speedScore);
    results.score = (results.score as number) + Math.round((results.mobileSpeed as number) * 0.2);

    if ((results.mobileSpeed as number) < 70) {
      (results.issues as string[]).push('移动端加载速度可能较慢');
    }

    return {
      status:
        (results.score as number) >= 70
          ? 'passed'
          : (results.score as number) >= 50
            ? 'warning'
            : 'failed',
      score: results.score as number,
      details: results,
    };
  }

  checkContentQuality($: CheerioAPI): SeoCheckResult {
    const results: Record<string, unknown> = {
      wordCount: 0,
      readability: 0,
      keywordDensity: 0,
      headingStructure: false,
      contentDepth: 0,
      score: 0,
      issues: [] as string[],
    };

    const mainContentSelection = $('main, article, .content, #content, .post, #main');
    const mainContent = mainContentSelection.first?.() ?? mainContentSelection;
    const mainSelection = (mainContent?.length || 0) > 0 ? mainContent : $('body');
    const contentText = (mainSelection.text?.() ?? '').trim() || '';

    const words = contentText.split(/\s+/).filter(word => word.length > 0);
    results.wordCount = words.length;

    if ((results.wordCount as number) >= 300) {
      results.score = (results.score as number) + 25;
    } else if ((results.wordCount as number) >= 150) {
      results.score = (results.score as number) + 15;
      (results.issues as string[]).push('内容字数较少，建议增加到300字以上');
    } else {
      (results.issues as string[]).push('内容字数过少，严重影响SEO效果');
    }

    const sentences = contentText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;

    if (avgWordsPerSentence <= 20 && avgWordsPerSentence >= 15) {
      results.readability = 80;
      results.score = (results.score as number) + 20;
    } else if (avgWordsPerSentence <= 25) {
      results.readability = 60;
      results.score = (results.score as number) + 10;
    } else {
      results.readability = 40;
      (results.issues as string[]).push('句子过长，影响可读性');
    }

    const h1Count = $('h1').length || 0;
    const h2Count = $('h2').length || 0;
    const h3Count = $('h3').length || 0;

    results.headingStructure = h1Count === 1 && (h2Count > 0 || h3Count > 0);
    if (results.headingStructure) {
      results.score = (results.score as number) + 20;
    } else {
      (results.issues as string[]).push('标题结构不合理');
    }

    const paragraphCount = $('p').length || 0;
    const listCount = $('ul, ol').length || 0;
    const tableCount = $('table').length || 0;

    results.contentDepth = paragraphCount * 2 + listCount * 3 + tableCount * 5;
    if ((results.contentDepth as number) >= 20) {
      results.score = (results.score as number) + 25;
    } else if ((results.contentDepth as number) >= 10) {
      results.score = (results.score as number) + 15;
    } else {
      (results.issues as string[]).push('内容结构单一，缺乏深度');
    }

    results.score = Math.min(100, results.score as number);

    return {
      status:
        (results.score as number) >= 70
          ? 'passed'
          : (results.score as number) >= 50
            ? 'warning'
            : 'failed',
      score: results.score as number,
      details: results,
    };
  }

  identifyStrengths(checks: Record<string, SeoCheckResult>) {
    const strengths: Array<Record<string, unknown>> = [];

    for (const [category, result] of Object.entries(checks)) {
      if (result && result.status === 'passed' && result.score >= 80) {
        strengths.push({
          category,
          score: result.score,
          description: this.getStrengthDescription(category),
        });
      }
    }

    return strengths.sort((a, b) => (b.score as number) - (a.score as number));
  }

  identifyWeaknesses(checks: Record<string, SeoCheckResult>) {
    const weaknesses: Array<Record<string, unknown>> = [];

    for (const [category, result] of Object.entries(checks)) {
      if (result && (result.status === 'failed' || result.score < 60)) {
        weaknesses.push({
          category,
          score: result.score,
          status: result.status,
          description: this.getWeaknessDescription(category),
          impact: this.calculateImpact(category, result.score),
        });
      }
    }

    return weaknesses.sort((a, b) => (b.impact as number) - (a.impact as number));
  }

  async generateCompetitorInsights(score: number) {
    return {
      marketPosition: this.getMarketPosition(score),
      competitiveAdvantages: this.getCompetitiveAdvantages(score),
      improvementAreas: this.getImprovementAreas(score),
      benchmarkComparison: await this.getBenchmarkComparison(score),
    };
  }

  generateActionPlan(recommendations?: Record<string, unknown>) {
    const plan = {
      immediate: [] as Record<string, unknown>[],
      shortTerm: [] as Record<string, unknown>[],
      longTerm: [] as Record<string, unknown>[],
    };

    if (recommendations && (recommendations.all as Array<Record<string, unknown>>)) {
      (recommendations.all as Array<Record<string, unknown>>).forEach(rec => {
        const timeToImplement = (rec.timeToImplement as number) || 0;
        if (timeToImplement <= 4320) {
          plan.immediate.push(rec);
        } else if (timeToImplement <= 40320) {
          plan.shortTerm.push(rec);
        } else {
          plan.longTerm.push(rec);
        }
      });
    }

    return plan;
  }

  getStrengthDescription(category: string) {
    const descriptions: Record<string, string> = {
      meta: '页面元标签优化优秀，有利于搜索引擎理解页面内容',
      headings: '标题结构清晰合理，便于用户和搜索引擎理解内容层次',
      mobile: '移动端优化出色，提供良好的移动用户体验',
      content: '内容质量高，有深度且易读性好',
      performance: '页面性能优秀，加载速度快',
      structuredData: '结构化数据实现完善，增强搜索结果展示',
      links: '链接结构合理，内部链接和外部链接管理良好',
      images: '图片优化到位，所有图片都有适当的alt属性',
      robots: 'robots.txt配置正确，搜索引擎抓取指导清晰',
      sitemap: '站点地图完整，有助于搜索引擎发现和索引页面',
    };

    return descriptions[category] || '该项SEO指标表现优秀';
  }

  getWeaknessDescription(category: string) {
    const descriptions: Record<string, string> = {
      meta: '页面元标签需要优化，影响搜索引擎对页面的理解',
      headings: '标题结构需要改进，不利于内容层次的展现',
      mobile: '移动端优化不足，可能影响移动用户体验和排名',
      content: '内容质量有待提升，需要增加深度和可读性',
      performance: '页面性能较差，加载速度影响用户体验和SEO',
      structuredData: '结构化数据缺失或不完整，错失搜索结果增强机会',
      links: '链接结构需要优化，影响页面权重传递',
      images: '图片优化不足，缺少alt属性影响可访问性',
      robots: 'robots.txt配置有问题，可能影响搜索引擎抓取',
      sitemap: '站点地图缺失或有问题，影响页面被搜索引擎发现',
    };

    return descriptions[category] || '该项SEO指标需要改进';
  }

  getMarketPosition(score: number) {
    if (score >= 90) return '市场领先者 - SEO优化水平处于行业顶尖';
    if (score >= 80) return '强力竞争者 - SEO基础扎实，具备竞争优势';
    if (score >= 70) return '稳定参与者 - SEO水平中等，需要持续优化';
    if (score >= 60) return '努力追赶者 - SEO存在明显短板，需要重点改进';
    return '亟需提升者 - SEO严重滞后，需要全面重构';
  }

  getCompetitiveAdvantages(score: number) {
    const advantages: string[] = [];
    if (score >= 85) advantages.push('整体SEO水平较高');
    if (score >= 80) advantages.push('基础SEO配置完善');
    if (score >= 75) advantages.push('用户体验较好');
    if (score >= 70) advantages.push('内容质量尚可');

    return advantages.length > 0 ? advantages : ['需要建立SEO竞争优势'];
  }

  getImprovementAreas(score: number) {
    const areas: string[] = [];
    if (score < 90) areas.push('进一步优化技术SEO');
    if (score < 80) areas.push('提升内容质量和相关性');
    if (score < 70) areas.push('改善用户体验和页面性能');
    if (score < 60) areas.push('建立基础SEO配置');

    return areas;
  }

  async getBenchmarkComparison(score: number) {
    const scores = await this.fetchSeoScores();
    const comparison = this.buildScoreComparison(score, scores);

    return {
      industryAverage: comparison.industry,
      yourScore: score,
      percentile: comparison.percentile,
      gap: Math.max(0, comparison.benchmark - score),
      recommendation: score >= comparison.benchmark ? '保持优势，持续优化' : '重点改进，缩小差距',
    };
  }

  private async fetchSeoScores(limit = 200): Promise<number[]> {
    const result = await query(
      `SELECT tr.score
       FROM test_results tr
       INNER JOIN test_executions te ON te.id = tr.execution_id
       WHERE te.engine_type = 'seo'
         AND tr.score IS NOT NULL
       ORDER BY tr.created_at DESC
       LIMIT $1`,
      [limit]
    );

    return (result.rows || [])
      .map((row: { score?: number | string }) => Number(row.score))
      .filter((score: number) => Number.isFinite(score));
  }

  private buildScoreComparison(score: number, scores: number[]) {
    if (!scores.length) {
      const fallback = score || 0;
      return {
        industry: fallback,
        competitors: fallback,
        benchmark: fallback,
        percentile: 0,
      };
    }

    const sorted = [...scores].sort((a, b) => a - b);
    const industry = this.calculateAverage(sorted);
    const competitors = this.calculatePercentileValue(sorted, 0.75);
    const benchmark = this.calculatePercentileValue(sorted, 0.9);
    const percentile = this.calculatePercentileRank(sorted, score);

    return {
      industry: Math.round(industry * 100) / 100,
      competitors: Math.round(competitors * 100) / 100,
      benchmark: Math.round(benchmark * 100) / 100,
      percentile,
    };
  }

  private calculateAverage(values: number[]): number {
    const total = values.reduce((sum, value) => sum + value, 0);
    return total / values.length;
  }

  private calculatePercentileValue(values: number[], percentile: number): number {
    if (values.length === 1) {
      return values[0];
    }
    const index = Math.min(values.length - 1, Math.floor(percentile * (values.length - 1)));
    return values[index];
  }

  private calculatePercentileRank(values: number[], score: number): number {
    if (!values.length) return 0;
    const below = values.filter(value => value <= score).length;
    return Math.round((below / values.length) * 100);
  }

  async cleanup() {
    this.activeTests.clear();
  }
}

module.exports = SeoTestEngine;

export {};
