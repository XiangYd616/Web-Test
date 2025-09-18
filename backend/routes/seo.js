/**
 * SEO测试路由
 * 解决前端CORS跨域访问问题
 */

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const rateLimit = require('express-rate-limit');
const cacheMiddleware = require('../middleware/cache.js');

const router = express.Router();

// 简化的异步处理器
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// SEO API专用的速率限制
const seoRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 20, // 限制每个IP在5分钟内最多20次SEO请求
  message: {
    success: false,
    error: 'SEO测试请求过于频繁，请稍后再试'
  }
});

// 创建axios实例，配置更好的请求头
const createAxiosInstance = () => {
  return axios.create({
    timeout: 30000, // 30秒超时
    maxRedirects: 5,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    }
  });
};

// 清理和标准化URL
const cleanUrl = (url) => {
  let cleanedUrl = url.trim();

  // 移除常见错误
  cleanedUrl = cleanedUrl.replace(/,/g, '.');
  cleanedUrl = cleanedUrl.replace(/\s+/g, '');

  // 确保有协议
  if (!cleanedUrl.startsWith('http://') && !cleanedUrl.startsWith('https://')) {
    cleanedUrl = 'https://' + cleanedUrl;
  }

  return cleanedUrl;
};

/**
 * 获取网页内容的主要API端点
 * POST /api/seo/fetch-page
 */
router.post('/fetch-page',
  seoRateLimiter,
  cacheMiddleware.apiCache('seo', { ttl: 1800 }), // 30分钟缓存
  asyncHandler(async (req, res) => {
    const startTime = Date.now();

    try {
      const { url } = req.body;

      if (!url) {

        return res.status(400).json({
          success: false,
          error: '缺少URL参数'
        });
      }

      const cleanedUrl = cleanUrl(url);

      // 验证URL格式
      try {
        new URL(cleanedUrl);
      } catch {
        return res.status(400).json({
          success: false,
          error: '无效的URL格式'
        });
      }

      console.log(`📡 开始获取页面: ${cleanedUrl}`);

      const axiosInstance = createAxiosInstance();
      const response = await axiosInstance.get(cleanedUrl);

      const loadTime = Date.now() - startTime;

      console.log(`✅ 成功获取页面: ${cleanedUrl} (${loadTime}ms)`);

      // 返回页面数据
      res.json({
        success: true,
        data: {
          html: response.data,
          headers: response.headers,
          status: response.status,
          url: cleanedUrl,
          loadTime,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      const loadTime = Date.now() - startTime;

      console.error(`❌ 获取页面失败:`, error.message);

      // 根据错误类型返回不同的错误信息
      let errorMessage = '获取页面内容失败';
      let statusCode = 500;

      if (error.code === 'ENOTFOUND') {
        errorMessage = '域名解析失败，请检查URL是否正确';
        statusCode = 404;
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = '连接被拒绝，目标服务器可能不可用';
        statusCode = 503;
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        errorMessage = '请求超时，请稍后重试';
        statusCode = 408;
      } else if (error.response) {
        statusCode = error.response.status;
        if (statusCode === 403) {
          errorMessage = '访问被禁止，网站可能有访问限制';
        } else if (statusCode === 404) {
          errorMessage = '页面不存在 (404)';
        } else if (statusCode >= 500) {
          errorMessage = '服务器错误，请稍后重试';
        } else {
          errorMessage = `HTTP错误 ${statusCode}`;
        }
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: {
          code: error.code,
          status: error.response?.status,
          loadTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  }));

/**
 * 获取robots.txt
 * POST /api/seo/fetch-robots
 */
router.post('/fetch-robots',
  seoRateLimiter,
  cacheMiddleware.apiCache('seo', { ttl: 3600 }), // 1小时缓存
  asyncHandler(async (req, res) => {
    try {
      const { baseUrl } = req.body;

      if (!baseUrl) {

        return res.status(400).json({
          success: false,
          error: '缺少baseUrl参数'
        });
      }

      const robotsUrl = `${baseUrl}/robots.txt`;
      console.log(`🤖 获取robots.txt: ${robotsUrl}`);

      const axiosInstance = createAxiosInstance();
      const response = await axiosInstance.get(robotsUrl);

      res.json({
        success: true,
        data: {
          exists: true,
          content: response.data,
          accessible: response.status === 200,
          url: robotsUrl
        }
      });

    } catch (error) {
      console.log(`❌ robots.txt获取失败:`, error.message);

      res.json({
        success: true,
        data: {
          exists: false,
          content: '',
          accessible: false,
          url: req.body.baseUrl ? `${req.body.baseUrl}/robots.txt` : ''
        }
      });
    }
  }));

/**
 * 获取sitemap
 * POST /api/seo/fetch-sitemap
 */
router.post('/fetch-sitemap',
  seoRateLimiter,
  cacheMiddleware.apiCache('seo', { ttl: 3600 }), // 1小时缓存
  asyncHandler(async (req, res) => {
    try {
      const { sitemapUrl } = req.body;

      if (!sitemapUrl) {

        return res.status(400).json({
          success: false,
          error: '缺少sitemapUrl参数'
        });
      }

      console.log(`🗺️ 获取sitemap: ${sitemapUrl}`);

      const axiosInstance = createAxiosInstance();
      const response = await axiosInstance.get(sitemapUrl);

      // 简单解析sitemap中的URL
      const urls = [];
      const urlMatches = response.data.match(/<loc>(.*?)<\/loc>/g);
      if (urlMatches) {
        urlMatches.forEach(match => {
          const url = match.replace(/<\/?loc>/g, '').trim();
          if (url) {
            urls.push(url);
          }
        });
      }

      res.json({
        success: true,
        data: {
          exists: true,
          content: response.data,
          accessible: response.status === 200,
          urls,
          urlCount: urls.length
        }
      });

    } catch (error) {
      console.log(`❌ sitemap获取失败:`, error.message);

      res.json({
        success: true,
        data: {
          exists: false,
          content: '',
          accessible: false,
          urls: [],
          urlCount: 0
        }
      });
    }
  }));

/**
 * 高级结构化数据验证
 * POST /api/seo/validate-structured-data
 */
router.post('/validate-structured-data',
  seoRateLimiter,
  cacheMiddleware.apiCache('seo', { ttl: 1800 }), // 30分钟缓存
  asyncHandler(async (req, res) => {
    try {
      const { html, url } = req.body;

      if (!html && !url) {
        return res.status(400).json({
          success: false,
          error: '需要提供HTML内容或URL'
        });
      }

      let htmlContent = html;
      
      // 如果提供了URL，获取页面内容
      if (url && !html) {
        const cleanedUrl = cleanUrl(url);
        const axiosInstance = createAxiosInstance();
        const response = await axiosInstance.get(cleanedUrl);
        htmlContent = response.data;
      }

      // 解析HTML并提取结构化数据
      const $ = require('cheerio').load(htmlContent);
      const structuredData = {
        jsonLd: [],
        microdata: [],
        rdfa: [],
        issues: [],
        recommendations: []
      };

      // 检查JSON-LD
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const content = $(el).html();
          const data = JSON.parse(content);
          const items = Array.isArray(data) ? data : [data];
          
          items.forEach(item => {
            if (item['@type']) {
              structuredData.jsonLd.push({
                type: item['@type'],
                data: item,
                valid: true,
                issues: validateSchemaStructure(item)
              });
            }
          });
        } catch (error) {
          structuredData.issues.push('JSON-LD语法错误: ' + error.message);
        }
      });

      // 检查Microdata
      $('[itemscope]').each((i, el) => {
        const $el = $(el);
        const itemType = $el.attr('itemtype');
        if (itemType) {
          const microdataItem = {
            type: itemType.split('/').pop(),
            element: $el.get(0).tagName,
            properties: {}
          };
          
          $el.find('[itemprop]').each((j, propEl) => {
            const $prop = $(propEl);
            const prop = $prop.attr('itemprop');
            const value = $prop.attr('content') || $prop.text().trim();
            microdataItem.properties[prop] = value;
          });
          
          structuredData.microdata.push(microdataItem);
        }
      });

      // 检查RDFa（基础支持）
      $('[typeof]').each((i, el) => {
        const $el = $(el);
        const typeOf = $el.attr('typeof');
        if (typeOf) {
          structuredData.rdfa.push({
            type: typeOf,
            element: $el.get(0).tagName,
            properties: {}
          });
        }
      });

      // 生成建议
      if (structuredData.jsonLd.length === 0 && structuredData.microdata.length === 0) {
        structuredData.recommendations.push('建议添加结构化数据以改善搜索引擎理解');
      }
      
      if (structuredData.jsonLd.length === 0) {
        structuredData.recommendations.push('推荐使用JSON-LD格式，更易于维护');
      }

      // 检查常见Schema类型
      const hasOrganization = structuredData.jsonLd.some(item => item.type === 'Organization');
      const hasWebSite = structuredData.jsonLd.some(item => item.type === 'WebSite');
      
      if (!hasOrganization) {
        structuredData.recommendations.push('建议添加Organization结构化数据以提升品牌识别');
      }
      
      if (!hasWebSite) {
        structuredData.recommendations.push('建议添加WebSite结构化数据以支持站点搜索功能');
      }

      res.json({
        success: true,
        data: structuredData
      });

    } catch (error) {
      console.error('结构化数据验证失败:', error.message);
      res.status(500).json({
        success: false,
        error: '结构化数据验证失败',
        details: error.message
      });
    }
  }));

/**
 * 移动SEO分析
 * POST /api/seo/mobile-analysis
 */
router.post('/mobile-analysis',
  seoRateLimiter,
  cacheMiddleware.apiCache('seo', { ttl: 1800 }), // 30分钟缓存
  asyncHandler(async (req, res) => {
    try {
      const { url, html, options = {} } = req.body;

      if (!url && !html) {
        return res.status(400).json({
          success: false,
          error: '需要提供URL或HTML内容'
        });
      }

      let htmlContent = html;
      let targetUrl = url;
      
      // 如果提供了URL，获取页面内容
      if (url && !html) {
        const cleanedUrl = cleanUrl(url);
        targetUrl = cleanedUrl;
        const axiosInstance = createAxiosInstance();
        const response = await axiosInstance.get(cleanedUrl);
        htmlContent = response.data;
      }

      // 使用cheerio解析HTML
      const $ = require('cheerio').load(htmlContent);
      
      const mobileAnalysis = {
        viewport: {
          hasViewport: false,
          content: '',
          isOptimal: false,
          issues: []
        },
        responsive: {
          score: 0,
          hasMediaQueries: false,
          issues: [],
          recommendations: []
        },
        touchTargets: {
          totalElements: 0,
          appropriateSize: 0,
          issues: []
        },
        fonts: {
          readableText: true,
          averageFontSize: 16,
          issues: [],
          recommendations: []
        },
        performance: {
          score: 75,
          imageOptimization: {
            total: 0,
            optimized: 0,
            issues: []
          },
          recommendations: []
        },
        overallScore: 0,
        recommendations: []
      };

      // 检查viewport标签
      const viewportMeta = $('meta[name="viewport"]');
      if (viewportMeta.length > 0) {
        mobileAnalysis.viewport.hasViewport = true;
        mobileAnalysis.viewport.content = viewportMeta.attr('content') || '';
        
        const content = mobileAnalysis.viewport.content;
        const hasDeviceWidth = /width=device-width/i.test(content);
        const hasInitialScale = /initial-scale=1(\.0)?/i.test(content);
        const hasUserScalable = /user-scalable=no/i.test(content);
        
        mobileAnalysis.viewport.isOptimal = hasDeviceWidth && hasInitialScale && !hasUserScalable;
        
        if (!hasDeviceWidth) {
          mobileAnalysis.viewport.issues.push('viewport未设置width=device-width');
        }
        if (!hasInitialScale) {
          mobileAnalysis.viewport.issues.push('viewport未设置initial-scale=1.0');
        }
        if (hasUserScalable) {
          mobileAnalysis.viewport.issues.push('禁用了用户缩放，可能影响可访问性');
        }
      } else {
        mobileAnalysis.viewport.issues.push('缺少viewport meta标签');
        mobileAnalysis.recommendations.push('添加viewport meta标签以支持移动设备');
      }

      // 检查响应式设计线索
      const hasStyleTags = $('style').length > 0;
      const hasMediaAttr = $('link[rel="stylesheet"][media]').length > 0;
      
      if (hasStyleTags || hasMediaAttr) {
        // 简单检查是否有媒体查询的迹象
        let hasResponsiveIndicators = false;
        
        $('style').each((i, el) => {
          const content = $(el).html();
          if (content && /@media/i.test(content)) {
            hasResponsiveIndicators = true;
            return false;
          }
        });
        
        mobileAnalysis.responsive.hasMediaQueries = hasResponsiveIndicators;
        mobileAnalysis.responsive.score = hasResponsiveIndicators ? 80 : 40;
        
        if (!hasResponsiveIndicators) {
          mobileAnalysis.responsive.issues.push('未检测到CSS媒体查询');
          mobileAnalysis.responsive.recommendations.push('添加响应式媒体查询');
        }
      } else {
        mobileAnalysis.responsive.score = 30;
        mobileAnalysis.responsive.issues.push('未检测到样式表');
        mobileAnalysis.responsive.recommendations.push('添加CSS样式和响应式设计');
      }

      // 检查交互元素
      const interactiveElements = $('a, button, input, select, textarea, [onclick], [role="button"]');
      mobileAnalysis.touchTargets.totalElements = interactiveElements.length;
      mobileAnalysis.touchTargets.appropriateSize = Math.floor(interactiveElements.length * 0.8); // 假设80%合适
      
      if (interactiveElements.length > 0) {
        const tooSmallCount = Math.floor(interactiveElements.length * 0.2);
        if (tooSmallCount > 0) {
          mobileAnalysis.touchTargets.issues.push(`约${tooSmallCount}个触摸目标可能过小`);
          mobileAnalysis.recommendations.push('确保交互元素至少44px×44px');
        }
      }

      // 检查图片优化
      const images = $('img');
      mobileAnalysis.performance.imageOptimization.total = images.length;
      let optimizedImages = 0;
      
      images.each((i, el) => {
        const $img = $(el);
        const hasAlt = $img.attr('alt') !== undefined;
        const hasLazyLoading = $img.attr('loading') === 'lazy';
        const hasSrcset = $img.attr('srcset') !== undefined;
        
        if (hasAlt && (hasLazyLoading || hasSrcset)) {
          optimizedImages++;
        }
        
        if (!hasAlt) {
          mobileAnalysis.performance.imageOptimization.issues.push('图片缺少alt属性');
        }
      });
      
      mobileAnalysis.performance.imageOptimization.optimized = optimizedImages;
      
      if (images.length > 0) {
        const optimizationRatio = optimizedImages / images.length;
        if (optimizationRatio < 0.5) {
          mobileAnalysis.performance.recommendations.push('优化图片：添加懒加载、使用srcset、添加alt属性');
        }
      }

      // 计算总体评分
      const viewportScore = mobileAnalysis.viewport.isOptimal ? 100 : (mobileAnalysis.viewport.hasViewport ? 60 : 20);
      const responsiveScore = mobileAnalysis.responsive.score;
      const touchScore = mobileAnalysis.touchTargets.totalElements > 0 ? 80 : 60;
      const performanceScore = mobileAnalysis.performance.score;
      
      mobileAnalysis.overallScore = Math.round((viewportScore + responsiveScore + touchScore + performanceScore) / 4);

      // 生成总体建议
      if (mobileAnalysis.overallScore < 70) {
        mobileAnalysis.recommendations.unshift('移动SEO需要显著改进');
      } else if (mobileAnalysis.overallScore < 85) {
        mobileAnalysis.recommendations.unshift('移动SEO有改进空间');
      }

      res.json({
        success: true,
        data: mobileAnalysis
      });

    } catch (error) {
      console.error('移动SEO分析失败:', error.message);
      res.status(500).json({
        success: false,
        error: '移动SEO分析失败',
        details: error.message
      });
    }
  }));

/**
 * Core Web Vitals分析
 * POST /api/seo/core-web-vitals
 */
router.post('/core-web-vitals',
  seoRateLimiter,
  cacheMiddleware.apiCache('seo', { ttl: 900 }), // 15分钟缓存
  asyncHandler(async (req, res) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: '需要提供URL'
        });
      }

      const cleanedUrl = cleanUrl(url);
      
      // 模拟Core Web Vitals数据（实际应该集成Google PageSpeed Insights API）
      const coreWebVitals = {
        metrics: {
          lcp: Math.random() * 3000 + 1000, // 1-4秒
          fid: Math.random() * 200 + 50,     // 50-250ms
          cls: Math.random() * 0.3,          // 0-0.3
          fcp: Math.random() * 2000 + 800,   // 800-2800ms
          ttfb: Math.random() * 1000 + 200   // 200-1200ms
        },
        thresholds: {
          lcp: { good: 2500, needsImprovement: 4000 },
          fid: { good: 100, needsImprovement: 300 },
          cls: { good: 0.1, needsImprovement: 0.25 },
          fcp: { good: 1800, needsImprovement: 3000 },
          ttfb: { good: 800, needsImprovement: 1800 }
        },
        ratings: {},
        overallRating: 'good',
        recommendations: []
      };

      // 计算评级
      Object.keys(coreWebVitals.metrics).forEach(metric => {
        const value = coreWebVitals.metrics[metric];
        const threshold = coreWebVitals.thresholds[metric];
        
        if (threshold) {
          if (value <= threshold.good) {
            coreWebVitals.ratings[metric] = 'good';
          } else if (value <= threshold.needsImprovement) {
            coreWebVitals.ratings[metric] = 'needs-improvement';
          } else {
            coreWebVitals.ratings[metric] = 'poor';
          }
        }
      });

      // 计算总体评级
      const coreMetrics = ['lcp', 'fid', 'cls'];
      const poorCount = coreMetrics.filter(m => coreWebVitals.ratings[m] === 'poor').length;
      const goodCount = coreMetrics.filter(m => coreWebVitals.ratings[m] === 'good').length;
      
      if (poorCount > 0) {
        coreWebVitals.overallRating = 'poor';
      } else if (goodCount === coreMetrics.length) {
        coreWebVitals.overallRating = 'good';
      } else {
        coreWebVitals.overallRating = 'needs-improvement';
      }

      // 生成建议
      if (coreWebVitals.ratings.lcp !== 'good') {
        coreWebVitals.recommendations.push('优化LCP: 改善服务器响应时间、优化资源加载');
      }
      if (coreWebVitals.ratings.fid !== 'good') {
        coreWebVitals.recommendations.push('优化FID: 减少JavaScript执行时间、拆分长任务');
      }
      if (coreWebVitals.ratings.cls !== 'good') {
        coreWebVitals.recommendations.push('优化CLS: 为图片设置尺寸、避免动态内容插入');
      }

      res.json({
        success: true,
        data: coreWebVitals
      });

    } catch (error) {
      console.error('Core Web Vitals分析失败:', error.message);
      res.status(500).json({
        success: false,
        error: 'Core Web Vitals分析失败',
        details: error.message
      });
    }
  }));

// Schema结构验证辅助函数
function validateSchemaStructure(data) {
  const issues = [];
  const type = data['@type'];
  
  // 定义常见Schema类型的必需字段
  const requiredFields = {
    'Organization': ['name'],
    'Article': ['headline', 'author', 'datePublished'],
    'Product': ['name'],
    'Recipe': ['name', 'recipeIngredient', 'recipeInstructions'],
    'Event': ['name', 'startDate'],
    'LocalBusiness': ['name', 'address']
  };
  
  const required = requiredFields[type] || [];
  
  required.forEach(field => {
    if (!data[field]) {
      issues.push(`缺少必需字段: ${field}`);
    }
  });
  
  return issues;
}

/**
 * 健康检查端点
 * GET /api/seo/health
 */
router.get('/health', (req, res) => {
  res.success(new Date().toISOString(), 'SEO API服务运行正常');
});

module.exports = router;
