/**
 * 移动端优化分析器
 * 本地化程度：80%
 * 分析页面的移动端友好性和响应式设计
 */

class MobileOptimizationAnalyzer {
  constructor() {
    this.mobileViewport = { width: 375, height: 667 }; // iPhone SE
    this.tabletViewport = { width: 768, height: 1024 }; // iPad
    
    this.thresholds = {
      minTouchTargetSize: 44, // 最小触摸目标尺寸 (px)
      maxContentWidth: 320,   // 最大内容宽度 (px)
      minFontSize: 16        // 最小字体大小 (px)
    };
  }

  /**
   * 执行移动端优化分析
   */
  async analyze(pageData) {
    const { page, $ } = pageData;
    
    const analysis = {
      viewport: this.analyzeViewport($),
      responsiveDesign: await this.analyzeResponsiveDesign(page),
      touchTargets: await this.analyzeTouchTargets(page),
      typography: await this.analyzeTypography(page),
      contentFit: await this.analyzeContentFit(page),
      performance: await this.analyzeMobilePerformance(page),
      usability: await this.analyzeMobileUsability(page, $)
    };
    
    // 汇总分析结果
    analysis.summary = this.createSummary(analysis);
    analysis.score = this.calculateScore(analysis);
    analysis.issues = this.identifyIssues(analysis);
    
    return analysis;
  }

  /**
   * 分析Viewport设置
   */
  analyzeViewport($) {
    const viewportMeta = $('meta[name="viewport"]');
    const content = viewportMeta.attr('content') || '';
    
    const settings = {};
    content.split(',').forEach(setting => {
      const [key, value] = setting.split('=').map(s => s.trim());
      if (key && value) {
        settings[key] = value;
      }
    });
    
    return {
      exists: viewportMeta.length > 0,
      content,
      settings,
      hasDeviceWidth: settings.width === 'device-width',
      hasInitialScale: !!settings['initial-scale'],
      initialScale: parseFloat(settings['initial-scale']) || null,
      hasUserScalable: !!settings['user-scalable'],
      userScalable: settings['user-scalable'] !== 'no',
      hasMaximumScale: !!settings['maximum-scale'],
      maximumScale: parseFloat(settings['maximum-scale']) || null,
      isOptimal: settings.width === 'device-width' && 
                settings['initial-scale'] === '1' &&
                settings['user-scalable'] !== 'no'
    };
  }

  /**
   * 分析响应式设计
   */
  async analyzeResponsiveDesign(page) {
    try {
      // 测试不同视口大小
      const viewports = [
        { name: 'mobile', ...this.mobileViewport },
        { name: 'tablet', ...this.tabletViewport },
        { name: 'desktop', width: 1920, height: 1080 }
      ];
      
      const results = {};
      
      for (const viewport of viewports) {
        await page.setViewport(viewport);
        await page.waitForTimeout(1000); // 等待布局调整
        
        const metrics = await page.evaluate(() => {
          return {
            scrollWidth: document.documentElement.scrollWidth,
            scrollHeight: document.documentElement.scrollHeight,
            clientWidth: document.documentElement.clientWidth,
            clientHeight: document.documentElement.clientHeight,
            hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            hasVerticalScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight
          };
        });
        
        results[viewport.name] = {
          viewport,
          metrics,
          fitsViewport: !metrics.hasHorizontalScroll,
          aspectRatio: viewport.width / viewport.height
        };
      }
      
      return {
        results,
        isResponsive: results.mobile.fitsViewport && results.tablet.fitsViewport,
        hasHorizontalScrollOnMobile: results.mobile.metrics.hasHorizontalScroll,
        hasHorizontalScrollOnTablet: results.tablet.metrics.hasHorizontalScroll
      };
    } catch (error) {
      console.error('响应式设计分析失败:', error);
      return {
        results: {},
        isResponsive: false,
        hasHorizontalScrollOnMobile: true,
        hasHorizontalScrollOnTablet: true,
        error: error.message
      };
    }
  }

  /**
   * 分析触摸目标
   */
  async analyzeTouchTargets(page) {
    try {
      await page.setViewport(this.mobileViewport);
      
      const touchTargets = await page.evaluate((minSize) => {
        const clickableElements = document.querySelectorAll('a, button, input, select, textarea, [onclick], [role="button"]');
        const targets = [];
        
        clickableElements.forEach((element, index) => {
          const rect = element.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(element);
          
          targets.push({
            index,
            tagName: element.tagName.toLowerCase(),
            width: rect.width,
            height: rect.height,
            area: rect.width * rect.height,
            isTooSmall: rect.width < minSize || rect.height < minSize,
            isVisible: rect.width > 0 && rect.height > 0,
            padding: {
              top: parseFloat(computedStyle.paddingTop),
              right: parseFloat(computedStyle.paddingRight),
              bottom: parseFloat(computedStyle.paddingBottom),
              left: parseFloat(computedStyle.paddingLeft)
            },
            margin: {
              top: parseFloat(computedStyle.marginTop),
              right: parseFloat(computedStyle.marginRight),
              bottom: parseFloat(computedStyle.marginBottom),
              left: parseFloat(computedStyle.marginLeft)
            }
          });
        });
        
        return targets;
      }, this.thresholds.minTouchTargetSize);
      
      const visibleTargets = touchTargets.filter(target => target.isVisible);
      const smallTargets = visibleTargets.filter(target => target.isTooSmall);
      
      return {
        total: touchTargets.length,
        visible: visibleTargets.length,
        smallTargets: smallTargets.length,
        smallTargetPercentage: visibleTargets.length > 0 ? 
          Math.round((smallTargets.length / visibleTargets.length) * 100) : 0,
        averageSize: visibleTargets.length > 0 ? {
          width: Math.round(visibleTargets.reduce((sum, t) => sum + t.width, 0) / visibleTargets.length),
          height: Math.round(visibleTargets.reduce((sum, t) => sum + t.height, 0) / visibleTargets.length)
        } : { width: 0, height: 0 },
        targets: touchTargets
      };
    } catch (error) {
      console.error('触摸目标分析失败:', error);
      return {
        total: 0,
        visible: 0,
        smallTargets: 0,
        smallTargetPercentage: 0,
        averageSize: { width: 0, height: 0 },
        targets: [],
        error: error.message
      };
    }
  }

  /**
   * 分析移动端字体
   */
  async analyzeTypography(page) {
    try {
      await page.setViewport(this.mobileViewport);
      
      const typography = await page.evaluate((minFontSize) => {
        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, li');
        const fontSizes = [];
        
        textElements.forEach(element => {
          const computedStyle = window.getComputedStyle(element);
          const fontSize = parseFloat(computedStyle.fontSize);
          const text = element.textContent.trim();
          
          if (text.length > 0 && fontSize > 0) {
            fontSizes.push({
              fontSize,
              isTooSmall: fontSize < minFontSize,
              element: element.tagName.toLowerCase(),
              textLength: text.length
            });
          }
        });
        
        return fontSizes;
      }, this.thresholds.minFontSize);
      
      const smallFonts = typography.filter(font => font.isTooSmall);
      const averageFontSize = typography.length > 0 ? 
        Math.round(typography.reduce((sum, font) => sum + font.fontSize, 0) / typography.length) : 0;
      
      return {
        totalElements: typography.length,
        smallFonts: smallFonts.length,
        smallFontPercentage: typography.length > 0 ? 
          Math.round((smallFonts.length / typography.length) * 100) : 0,
        averageFontSize,
        minFontSize: typography.length > 0 ? Math.min(...typography.map(f => f.fontSize)) : 0,
        maxFontSize: typography.length > 0 ? Math.max(...typography.map(f => f.fontSize)) : 0,
        isReadable: smallFonts.length === 0
      };
    } catch (error) {
      console.error('字体分析失败:', error);
      return {
        totalElements: 0,
        smallFonts: 0,
        smallFontPercentage: 0,
        averageFontSize: 0,
        minFontSize: 0,
        maxFontSize: 0,
        isReadable: false,
        error: error.message
      };
    }
  }

  /**
   * 分析内容适配
   */
  async analyzeContentFit(page) {
    try {
      await page.setViewport(this.mobileViewport);
      
      const contentFit = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const tables = document.querySelectorAll('table');
        const videos = document.querySelectorAll('video, iframe');
        
        const oversizedImages = Array.from(images).filter(img => {
          const rect = img.getBoundingClientRect();
          return rect.width > window.innerWidth;
        });
        
        const oversizedTables = Array.from(tables).filter(table => {
          const rect = table.getBoundingClientRect();
          return rect.width > window.innerWidth;
        });
        
        const oversizedVideos = Array.from(videos).filter(video => {
          const rect = video.getBoundingClientRect();
          return rect.width > window.innerWidth;
        });
        
        return {
          images: {
            total: images.length,
            oversized: oversizedImages.length
          },
          tables: {
            total: tables.length,
            oversized: oversizedTables.length
          },
          videos: {
            total: videos.length,
            oversized: oversizedVideos.length
          }
        };
      });
      
      const totalOversized = contentFit.images.oversized + 
                           contentFit.tables.oversized + 
                           contentFit.videos.oversized;
      
      return {
        ...contentFit,
        totalOversized,
        hasOversizedContent: totalOversized > 0,
        contentFitsViewport: totalOversized === 0
      };
    } catch (error) {
      console.error('内容适配分析失败:', error);
      return {
        images: { total: 0, oversized: 0 },
        tables: { total: 0, oversized: 0 },
        videos: { total: 0, oversized: 0 },
        totalOversized: 0,
        hasOversizedContent: true,
        contentFitsViewport: false,
        error: error.message
      };
    }
  }

  /**
   * 分析移动端性能
   */
  async analyzeMobilePerformance(page) {
    try {
      await page.setViewport(this.mobileViewport);
      
      // 模拟慢速网络
      await page.emulateNetworkConditions({
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
        uploadThroughput: 750 * 1024 / 8,           // 750 Kbps
        latency: 40                                 // 40ms
      });
      
      const startTime = Date.now();
      await page.reload({ waitUntil: 'networkidle2' });
      const loadTime = Date.now() - startTime;
      
      const performance = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0
        };
      });
      
      return {
        loadTime,
        ...performance,
        isAcceptable: loadTime <= 5000, // 5秒内加载完成
        isFast: loadTime <= 3000        // 3秒内加载完成
      };
    } catch (error) {
      console.error('移动端性能分析失败:', error);
      return {
        loadTime: 0,
        domContentLoaded: 0,
        loadComplete: 0,
        firstPaint: 0,
        firstContentfulPaint: 0,
        isAcceptable: false,
        isFast: false,
        error: error.message
      };
    }
  }

  /**
   * 分析移动端可用性
   */
  async analyzeMobileUsability(page, $) {
    const usability = {
      hasAppIcon: this.checkAppIcon($),
      hasThemeColor: this.checkThemeColor($),
      hasManifest: this.checkManifest($),
      hasServiceWorker: await this.checkServiceWorker(page),
      navigation: this.analyzeNavigationUsability($),
      forms: this.analyzeFormUsability($)
    };
    
    return usability;
  }

  /**
   * 检查应用图标
   */
  checkAppIcon($) {
    const appleIcon = $('link[rel="apple-touch-icon"]').length > 0;
    const favicon = $('link[rel="icon"]').length > 0;
    const manifest = $('link[rel="manifest"]').length > 0;
    
    return {
      hasAppleIcon: appleIcon,
      hasFavicon: favicon,
      hasManifest: manifest,
      hasAnyIcon: appleIcon || favicon || manifest
    };
  }

  /**
   * 检查主题颜色
   */
  checkThemeColor($) {
    const themeColor = $('meta[name="theme-color"]').attr('content');
    const msapplicationTileColor = $('meta[name="msapplication-TileColor"]').attr('content');
    
    return {
      hasThemeColor: !!themeColor,
      hasMsTileColor: !!msapplicationTileColor,
      themeColor,
      msapplicationTileColor
    };
  }

  /**
   * 检查Web App Manifest
   */
  checkManifest($) {
    const manifestLink = $('link[rel="manifest"]');
    return {
      exists: manifestLink.length > 0,
      href: manifestLink.attr('href')
    };
  }

  /**
   * 检查Service Worker
   */
  async checkServiceWorker(page) {
    try {
      const hasServiceWorker = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });
      
      return {
        supported: hasServiceWorker,
        registered: false // 需要更复杂的检测逻辑
      };
    } catch (error) {
      return {
        supported: false,
        registered: false,
        error: error.message
      };
    }
  }

  /**
   * 分析导航可用性
   */
  analyzeNavigationUsability($) {
    const hamburgerMenu = $('.hamburger, .menu-toggle, .nav-toggle, [data-toggle="menu"]').length > 0;
    const stickyNav = $('nav[style*="position: fixed"], nav[style*="position: sticky"], .navbar-fixed, .sticky-nav').length > 0;
    
    return {
      hasHamburgerMenu: hamburgerMenu,
      hasStickyNavigation: stickyNav,
      isMobileFriendly: hamburgerMenu || stickyNav
    };
  }

  /**
   * 分析表单可用性
   */
  analyzeFormUsability($) {
    const forms = $('form');
    let mobileOptimizedInputs = 0;
    let totalInputs = 0;
    
    forms.find('input, select, textarea').each((i, el) => {
      const $input = $(el);
      const type = $input.attr('type');
      const inputmode = $input.attr('inputmode');
      
      totalInputs++;
      
      // 检查是否使用了移动端优化的输入类型
      if (['email', 'tel', 'url', 'number', 'date', 'time'].includes(type) || inputmode) {
        mobileOptimizedInputs++;
      }
    });
    
    return {
      totalForms: forms.length,
      totalInputs,
      mobileOptimizedInputs,
      optimizationPercentage: totalInputs > 0 ? 
        Math.round((mobileOptimizedInputs / totalInputs) * 100) : 0,
      isOptimized: totalInputs === 0 || mobileOptimizedInputs === totalInputs
    };
  }

  /**
   * 创建分析摘要
   */
  createSummary(analysis) {
    return {
      hasViewport: analysis.viewport.exists,
      isResponsive: analysis.responsiveDesign.isResponsive,
      touchTargetsOptimal: analysis.touchTargets.smallTargetPercentage <= 10,
      typographyReadable: analysis.typography.isReadable,
      contentFits: analysis.contentFit.contentFitsViewport,
      performanceAcceptable: analysis.performance.isAcceptable,
      overallMobileFriendly: analysis.viewport.isOptimal && 
                           analysis.responsiveDesign.isResponsive &&
                           analysis.touchTargets.smallTargetPercentage <= 10 &&
                           analysis.typography.isReadable &&
                           analysis.contentFit.contentFitsViewport
    };
  }

  /**
   * 计算移动端优化评分
   */
  calculateScore(analysis) {
    let score = 0;
    let maxScore = 0;
    
    // Viewport配置评分 (权重: 25%)
    maxScore += 25;
    if (analysis.viewport.isOptimal) score += 25;
    else if (analysis.viewport.exists) score += 15;
    
    // 响应式设计评分 (权重: 25%)
    maxScore += 25;
    if (analysis.responsiveDesign.isResponsive) score += 25;
    else if (!analysis.responsiveDesign.hasHorizontalScrollOnMobile) score += 15;
    
    // 触摸目标评分 (权重: 20%)
    maxScore += 20;
    if (analysis.touchTargets.smallTargetPercentage === 0) score += 20;
    else if (analysis.touchTargets.smallTargetPercentage <= 10) score += 15;
    else if (analysis.touchTargets.smallTargetPercentage <= 25) score += 10;
    
    // 字体可读性评分 (权重: 15%)
    maxScore += 15;
    if (analysis.typography.isReadable) score += 15;
    else if (analysis.typography.smallFontPercentage <= 20) score += 10;
    
    // 内容适配评分 (权重: 10%)
    maxScore += 10;
    if (analysis.contentFit.contentFitsViewport) score += 10;
    else if (analysis.contentFit.totalOversized <= 2) score += 6;
    
    // 性能评分 (权重: 5%)
    maxScore += 5;
    if (analysis.performance.isFast) score += 5;
    else if (analysis.performance.isAcceptable) score += 3;
    
    return Math.round((score / maxScore) * 100);
  }

  /**
   * 识别移动端问题
   */
  identifyIssues(analysis) {
    const issues = [];
    
    // Viewport问题
    if (!analysis.viewport.exists) {
      issues.push({
        type: 'viewport-missing',
        severity: 'critical',
        message: '缺少viewport meta标签'
      });
    } else if (!analysis.viewport.isOptimal) {
      issues.push({
        type: 'viewport-suboptimal',
        severity: 'high',
        message: 'viewport设置不是最优的'
      });
    }
    
    // 响应式设计问题
    if (!analysis.responsiveDesign.isResponsive) {
      issues.push({
        type: 'not-responsive',
        severity: 'critical',
        message: '页面不是响应式设计'
      });
    }
    
    // 触摸目标问题
    if (analysis.touchTargets.smallTargetPercentage > 25) {
      issues.push({
        type: 'small-touch-targets',
        severity: 'high',
        message: `${analysis.touchTargets.smallTargetPercentage}%的触摸目标过小`
      });
    }
    
    // 字体可读性问题
    if (!analysis.typography.isReadable) {
      issues.push({
        type: 'small-fonts',
        severity: 'medium',
        message: `${analysis.typography.smallFontPercentage}%的文本字体过小`
      });
    }
    
    // 内容适配问题
    if (!analysis.contentFit.contentFitsViewport) {
      issues.push({
        type: 'content-overflow',
        severity: 'medium',
        message: `${analysis.contentFit.totalOversized}个元素超出视口宽度`
      });
    }
    
    return issues;
  }
}

module.exports = MobileOptimizationAnalyzer;
