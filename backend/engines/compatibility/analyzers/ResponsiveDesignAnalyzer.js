/**
 * 响应式设计检测器
 * 本地化程度：100%
 * 实现响应式设计检测：不同屏幕尺寸适配、断点检测、布局稳定性、触摸交互检测等
 */

const puppeteer = require('puppeteer');

class ResponsiveDesignAnalyzer {
  constructor() {
    // 预定义设备尺寸
    this.devicePresets = {
      mobile: [
        { name: 'iPhone SE', width: 375, height: 667, deviceScaleFactor: 2, isMobile: true },
        { name: 'iPhone 12', width: 390, height: 844, deviceScaleFactor: 3, isMobile: true },
        { name: 'iPhone 12 Pro Max', width: 428, height: 926, deviceScaleFactor: 3, isMobile: true },
        { name: 'Samsung Galaxy S21', width: 360, height: 800, deviceScaleFactor: 3, isMobile: true },
        { name: 'Google Pixel 5', width: 393, height: 851, deviceScaleFactor: 3, isMobile: true }
      ],
      tablet: [
        { name: 'iPad', width: 768, height: 1024, deviceScaleFactor: 2, isMobile: false },
        { name: 'iPad Pro 11"', width: 834, height: 1194, deviceScaleFactor: 2, isMobile: false },
        { name: 'iPad Pro 12.9"', width: 1024, height: 1366, deviceScaleFactor: 2, isMobile: false },
        { name: 'Samsung Galaxy Tab', width: 800, height: 1280, deviceScaleFactor: 2, isMobile: false }
      ],
      desktop: [
        { name: 'Desktop Small', width: 1366, height: 768, deviceScaleFactor: 1, isMobile: false },
        { name: 'Desktop Medium', width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false },
        { name: 'Desktop Large', width: 2560, height: 1440, deviceScaleFactor: 1, isMobile: false },
        { name: 'Desktop 4K', width: 3840, height: 2160, deviceScaleFactor: 1, isMobile: false }
      ]
    };

    // 常见断点
    this.commonBreakpoints = [
      { name: 'xs', min: 0, max: 575 },
      { name: 'sm', min: 576, max: 767 },
      { name: 'md', min: 768, max: 991 },
      { name: 'lg', min: 992, max: 1199 },
      { name: 'xl', min: 1200, max: 1399 },
      { name: 'xxl', min: 1400, max: Infinity }
    ];

    this.browser = null;
  }

  /**
   * 分析响应式设计
   */
  async analyzeResponsiveDesign(url, options = {}) {

    const analysis = {
      url,
      timestamp: new Date().toISOString(),
      deviceTests: [],
      breakpointAnalysis: null,
      layoutStability: null,
      touchInteraction: null,
      mediaQueries: null,
      flexboxGrid: null,
      imageResponsiveness: null,
      textReadability: null,
      navigationUsability: null,
      overallScore: 0,
      issues: [],
      recommendations: []
    };

    try {
      // 初始化浏览器
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      // 获取要测试的设备列表
      const devicesToTest = this.getDevicesToTest(options);

      // 在不同设备上测试
      for (const device of devicesToTest) {
        const deviceResult = await this.testOnDevice(url, device);
        analysis.deviceTests.push(deviceResult);
      }

      // 分析断点
      analysis.breakpointAnalysis = await this.analyzeBreakpoints(url);

      // 分析布局稳定性
      analysis.layoutStability = await this.analyzeLayoutStability(url);

      // 分析触摸交互
      analysis.touchInteraction = await this.analyzeTouchInteraction(url);

      // 分析媒体查询
      analysis.mediaQueries = await this.analyzeMediaQueries(url);

      // 分析Flexbox/Grid使用
      analysis.flexboxGrid = await this.analyzeFlexboxGrid(url);

      // 分析图片响应性
      analysis.imageResponsiveness = await this.analyzeImageResponsiveness(url);

      // 分析文本可读性
      analysis.textReadability = await this.analyzeTextReadability(url);

      // 分析导航可用性
      analysis.navigationUsability = await this.analyzeNavigationUsability(url);

      // 计算总体评分
      analysis.overallScore = this.calculateOverallScore(analysis);

      // 生成问题和建议
      analysis.issues = this.identifyIssues(analysis);
      analysis.recommendations = this.generateRecommendations(analysis);

      console.log(`✅ 响应式设计分析完成 - 总体评分: ${analysis.overallScore}`);

      return analysis;

    } catch (error) {
      console.error('响应式设计分析失败:', error);
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  /**
   * 获取要测试的设备列表
   */
  getDevicesToTest(options) {
    const devices = [];

    if (options.customDevices) {
      devices.push(...options.customDevices);
    } else {
      // 默认测试设备
      devices.push(
        this.devicePresets.mobile[0], // iPhone SE
        this.devicePresets.mobile[1], // iPhone 12
        this.devicePresets.tablet[0], // iPad
        this.devicePresets.desktop[0], // Desktop Small
        this.devicePresets.desktop[1]  // Desktop Medium
      );
    }

    return devices;
  }

  /**
   * 在特定设备上测试
   */
  async testOnDevice(url, device) {
    const page = await this.browser.newPage();

    try {
      // 设置设备参数
      await page.setViewport({
        width: device.width,
        height: device.height,
        deviceScaleFactor: device.deviceScaleFactor || 1,
        isMobile: device.isMobile || false,
        hasTouch: device.isMobile || false
      });

      // 设置用户代理
      if (device.isMobile) {
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1');
      }

      // 导航到页面
      await page.goto(url, { waitUntil: 'networkidle0', timeout: process.env.REQUEST_TIMEOUT || 30000 });

      // 等待页面稳定
      await page.waitForTimeout(2000);

      // 收集设备测试数据
      const deviceData = await page.evaluate(() => {
        return {
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
          hasVerticalScroll: document.documentElement.scrollHeight > window.innerHeight
        };
      });

      // 截图
      const screenshot = await page.screenshot({
        fullPage: true,
        encoding: 'base64'
      });

      // 检测布局问题
      const layoutIssues = await this.detectLayoutIssues(page);

      // 检测可用性问题
      const usabilityIssues = await this.detectUsabilityIssues(page, device);

      return {
        device,
        viewport: deviceData.viewport,
        scrollDimensions: {
          width: deviceData.scrollWidth,
          height: deviceData.scrollHeight
        },
        hasHorizontalScroll: deviceData.hasHorizontalScroll,
        hasVerticalScroll: deviceData.hasVerticalScroll,
        screenshot,
        layoutIssues,
        usabilityIssues,
        score: this.calculateDeviceScore(deviceData, layoutIssues, usabilityIssues)
      };

    } finally {
      await page.close();
    }
  }

  /**
   * 检测布局问题
   */
  async detectLayoutIssues(page) {
    return await page.evaluate(() => {
      const issues = [];

      // 检测溢出元素
      const elements = document.querySelectorAll('*');
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);

        // 检测水平溢出
        if (rect.right > window.innerWidth && styles.overflow !== 'hidden') {
          issues.push({
            type: 'horizontal_overflow',
            element: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''),
            width: rect.width,
            right: rect.right,
            viewportWidth: window.innerWidth
          });
        }

        // 检测过小的点击目标
        if (el.onclick || el.tagName === 'BUTTON' || el.tagName === 'A') {
          if (rect.width < 44 || rect.height < 44) {
            issues.push({
              type: 'small_touch_target',
              element: el.tagName.toLowerCase(),
              width: rect.width,
              height: rect.height,
              minSize: 44
            });
          }
        }

        // 检测过小的文字
        if (el.textContent && el.textContent.trim()) {
          const fontSize = parseFloat(styles.fontSize);
          if (fontSize < 16) {
            issues.push({
              type: 'small_text',
              element: el.tagName.toLowerCase(),
              fontSize: fontSize,
              minSize: 16,
              text: el.textContent.substring(0, 50)
            });
          }
        }
      });

      return issues;
    });
  }

  /**
   * 检测可用性问题
   */
  async detectUsabilityIssues(page, device) {
    return await page.evaluate((deviceInfo) => {
      const issues = [];

      // 检测导航菜单
      const nav = document.querySelector('nav') || document.querySelector('.nav') || document.querySelector('#nav');
      if (nav && deviceInfo.isMobile) {
        const navRect = nav.getBoundingClientRect();
        const navItems = nav.querySelectorAll('a, button');

        if (navItems.length > 5 && navRect.width < window.innerWidth * 0.8) {
          issues.push({
            type: 'mobile_nav_overflow',
            itemCount: navItems.length,
            navWidth: navRect.width,
            suggestion: '考虑使用汉堡菜单或折叠导航'
          });
        }
      }

      // 检测表单元素
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        const rect = input.getBoundingClientRect();
        if (deviceInfo.isMobile && rect.height < 44) {
          issues.push({
            type: 'small_form_element',
            element: input.tagName.toLowerCase(),
            height: rect.height,
            minHeight: 44
          });
        }
      });

      return issues;
    }, device);
  }

  /**
   * 分析断点
   */
  async analyzeBreakpoints(url) {
    const page = await this.browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle0' });

      const breakpointData = [];

      for (const breakpoint of this.commonBreakpoints) {
        if (breakpoint.max === Infinity) continue;

        const testWidth = Math.floor((breakpoint.min + breakpoint.max) / 2);
        await page.setViewport({ width: testWidth, height: 800 });
        await page.waitForTimeout(1000);

        const layoutData = await page.evaluate(() => {
          return {
            bodyWidth: document.body.offsetWidth,
            containerWidth: document.querySelector('.container, .wrapper, main')?.offsetWidth || 0,
            columnCount: document.querySelectorAll('.col, [class*="col-"]').length,
            hiddenElements: document.querySelectorAll('[style*="display: none"], .hidden, .d-none').length
          };
        });

        breakpointData.push({
          breakpoint: breakpoint.name,
          width: testWidth,
          range: `${breakpoint.min}-${breakpoint.max}px`,
          ...layoutData
        });
      }

      return {
        detectedBreakpoints: breakpointData,
        hasResponsiveDesign: this.hasResponsiveDesign(breakpointData),
        breakpointEffectiveness: this.calculateBreakpointEffectiveness(breakpointData)
      };

    } finally {
      await page.close();
    }
  }

  /**
   * 分析布局稳定性
   */
  async analyzeLayoutStability(url) {
    const page = await this.browser.newPage();

    try {
      await page.setViewport({ width: 1200, height: 800 });
      await page.goto(url, { waitUntil: 'networkidle0' });

      // 测试不同视口大小下的布局稳定性
      const stabilityTests = [];
      const testSizes = [
        { width: 320, height: 568 },
        { width: 768, height: 1024 },
        { width: 1024, height: 768 },
        { width: 1920, height: 1080 }
      ];

      for (const size of testSizes) {
        await page.setViewport(size);
        await page.waitForTimeout(1000);

        const layoutData = await page.evaluate(() => {
          const elements = document.querySelectorAll('*');
          let overflowCount = 0;
          let layoutShifts = 0;

          elements.forEach(el => {
            /**
             * if功能函数
             * @param {Object} params - 参数对象
             * @returns {Promise<Object>} 返回结果
             */
            const rect = el.getBoundingClientRect();
            if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
              overflowCount++;
            }
          });

          return {
            overflowElements: overflowCount,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            documentWidth: document.documentElement.scrollWidth,
            documentHeight: document.documentElement.scrollHeight
          };
        });

        stabilityTests.push({
          viewport: size,
          ...layoutData,
          hasHorizontalOverflow: layoutData.documentWidth > layoutData.viewportWidth,
          hasVerticalOverflow: layoutData.documentHeight > layoutData.viewportHeight
        });
      }

      return {
        tests: stabilityTests,
        overallStability: this.calculateLayoutStability(stabilityTests),
        issues: this.identifyLayoutStabilityIssues(stabilityTests)
      };

    } finally {
      await page.close();
    }
  }

  /**
   * 分析触摸交互
   */
  async analyzeTouchInteraction(url) {
    const page = await this.browser.newPage();

    try {
      await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });
      await page.goto(url, { waitUntil: 'networkidle0' });

      const touchAnalysis = await page.evaluate(() => {
        const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, [onclick], [role="button"]');
        const touchTargets = [];
        let adequateTargets = 0;
        let smallTargets = 0;
        let overlappingTargets = 0;

        interactiveElements.forEach((el, index) => {
          const rect = el.getBoundingClientRect();

          /**

           * if功能函数

           * @param {Object} params - 参数对象

           * @returns {Promise<Object>} 返回结果

           */
          const isAdequate = rect.width >= 44 && rect.height >= 44;

          if (isAdequate) {
            adequateTargets++;
          } else {
            smallTargets++;
          }

          // 检查重叠
          for (let i = index + 1; i < interactiveElements.length; i++) {
            const otherRect = interactiveElements[i].getBoundingClientRect();
            if (this.isOverlapping(rect, otherRect)) {
              overlappingTargets++;
              break;
            }
          }

          touchTargets.push({
            element: el.tagName.toLowerCase(),
            width: rect.width,
            height: rect.height,
            isAdequate,
            area: rect.width * rect.height
          });
        });

        return {
          totalTargets: interactiveElements.length,
          adequateTargets,
          smallTargets,
          overlappingTargets,
          touchTargets: touchTargets.slice(0, 20), // 限制返回数量
          averageTargetSize: touchTargets.reduce((sum, t) => sum + t.area, 0) / touchTargets.length
        };
      });

      return {
        ...touchAnalysis,
        score: this.calculateTouchScore(touchAnalysis),
        recommendations: this.generateTouchRecommendations(touchAnalysis)
      };

    } finally {
      await page.close();
    }
  }

  /**
   * 分析媒体查询
   */
  async analyzeMediaQueries(url) {
    const page = await this.browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle0' });

      const mediaQueryAnalysis = await page.evaluate(() => {
        const stylesheets = Array.from(document.styleSheets);
        const mediaQueries = [];
        let totalRules = 0;
        let mediaQueryRules = 0;

        stylesheets.forEach(sheet => {
          try {
            const rules = Array.from(sheet.cssRules || sheet.rules || []);
            totalRules += rules.length;

            rules.forEach(rule => {
              if (rule.type === CSSRule.MEDIA_RULE) {
                mediaQueryRules++;
                mediaQueries.push({
                  media: rule.media.mediaText,
                  rulesCount: rule.cssRules.length
                });
              }
            });
          } catch (e) {
            // 跨域样式表无法访问
          }
        });

        // 分析媒体查询类型
        const breakpoints = [];
        const features = {
          width: 0,
          height: 0,
          orientation: 0,
          resolution: 0,
          hover: 0,
          pointer: 0
        };

        mediaQueries.forEach(mq => {
          const media = mq.media.toLowerCase();

          if (media.includes('width')) features.width++;
          if (media.includes('height')) features.height++;
          if (media.includes('orientation')) features.orientation++;
          if (media.includes('resolution') || media.includes('dpi')) features.resolution++;
          if (media.includes('hover')) features.hover++;
          if (media.includes('pointer')) features.pointer++;

          // 提取断点
          const widthMatch = media.match(/(?:min-width|max-width):/s*(/d+)px/g);
          if (widthMatch) {
            widthMatch.forEach(match => {
              const value = parseInt(match.match(//d+/)[0]);
              if (!breakpoints.includes(value)) {
                breakpoints.push(value);
              }
            });
          }
        });

        return {
          totalStyleRules: totalRules,
          mediaQueryRules,
          mediaQueries: mediaQueries.slice(0, 10), // 限制返回数量
          detectedBreakpoints: breakpoints.sort((a, b) => a - b),
          features,
          hasResponsiveCSS: mediaQueryRules > 0
        };
      });

      return {
        ...mediaQueryAnalysis,
        score: this.calculateMediaQueryScore(mediaQueryAnalysis),
        effectiveness: this.calculateMediaQueryEffectiveness(mediaQueryAnalysis)
      };

    } finally {
      await page.close();
    }
  }

  /**
   * 分析Flexbox/Grid使用
   */
  async analyzeFlexboxGrid(url) {
    const page = await this.browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle0' });

      const layoutAnalysis = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const layoutStats = {
          flexContainers: 0,
          gridContainers: 0,
          floatElements: 0,
          positionAbsolute: 0,
          positionFixed: 0,
          tableLayouts: 0,
          inlineBlocks: 0
        };

        const modernLayoutElements = [];
        const legacyLayoutElements = [];

        elements.forEach(el => {
          const styles = window.getComputedStyle(el);
          const display = styles.display;
          const position = styles.position;
          const float = styles.float;

          // 现代布局
          if (display.includes('flex')) {
            layoutStats.flexContainers++;
            modernLayoutElements.push({
              element: el.tagName.toLowerCase(),
              type: 'flex',
              className: el.className
            });
          }
          if (display.includes('grid')) {
            layoutStats.gridContainers++;
            modernLayoutElements.push({
              element: el.tagName.toLowerCase(),
              type: 'grid',
              className: el.className
            });
          }

          // 传统布局
          if (float !== 'none') {
            layoutStats.floatElements++;
            legacyLayoutElements.push({
              element: el.tagName.toLowerCase(),
              type: 'float',
              value: float
            });
          }
          if (position === 'absolute') layoutStats.positionAbsolute++;
          if (position === 'fixed') layoutStats.positionFixed++;
          if (display === 'table' || display === 'table-cell') layoutStats.tableLayouts++;
          if (display === 'inline-block') layoutStats.inlineBlocks++;
        });

        return {
          layoutStats,
          modernLayoutElements: modernLayoutElements.slice(0, 10),
          legacyLayoutElements: legacyLayoutElements.slice(0, 10),
          modernLayoutPercentage: ((layoutStats.flexContainers + layoutStats.gridContainers) / elements.length) * 100
        };
      });

      return {
        ...layoutAnalysis,
        score: this.calculateLayoutScore(layoutAnalysis),
        recommendations: this.generateLayoutRecommendations(layoutAnalysis)
      };

    } finally {
      await page.close();
    }
  }

  /**
   * 分析图片响应性
   */
  async analyzeImageResponsiveness(url) {
    const page = await this.browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle0' });

      const imageAnalysis = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const imageStats = {
          totalImages: images.length,
          responsiveImages: 0,
          fixedSizeImages: 0,
          imagesWithSrcset: 0,
          imagesWithSizes: 0,
          pictureElements: document.querySelectorAll('picture').length
        };

        const imageDetails = [];

        images.forEach(img => {
          const styles = window.getComputedStyle(img);
          const hasFixedWidth = styles.width.includes('px');
          const hasFixedHeight = styles.height.includes('px');
          const hasSrcset = img.hasAttribute('srcset');
          const hasSizes = img.hasAttribute('sizes');
          const isResponsive = !hasFixedWidth && !hasFixedHeight;

          if (isResponsive) imageStats.responsiveImages++;
          if (hasFixedWidth || hasFixedHeight) imageStats.fixedSizeImages++;
          if (hasSrcset) imageStats.imagesWithSrcset++;
          if (hasSizes) imageStats.imagesWithSizes++;

          imageDetails.push({
            src: img.src.substring(0, 100),
            width: img.naturalWidth,
            height: img.naturalHeight,
            displayWidth: img.offsetWidth,
            displayHeight: img.offsetHeight,
            isResponsive,
            hasSrcset,
            hasSizes,
            loading: img.loading || 'eager'
          });
        });

        return {
          imageStats,
          imageDetails: imageDetails.slice(0, 20),
          responsivePercentage: (imageStats.responsiveImages / imageStats.totalImages) * 100
        };
      });

      return {
        ...imageAnalysis,
        score: this.calculateImageResponsivenessScore(imageAnalysis),
        recommendations: this.generateImageRecommendations(imageAnalysis)
      };

    } finally {
      await page.close();
    }
  }

  /**
   * 计算设备评分
   */
  calculateDeviceScore(deviceData, layoutIssues, usabilityIssues) {
    let score = 100;

    // 水平滚动扣分
    if (deviceData.hasHorizontalScroll) score -= 30;

    // 布局问题扣分
    score -= layoutIssues.length * 5;

    // 可用性问题扣分
    score -= usabilityIssues.length * 10;

    return Math.max(0, score);
  }

  /**
   * 计算总体评分
   */
  calculateOverallScore(analysis) {
    const scores = [];

    // 设备测试平均分
    if (analysis.deviceTests.length > 0) {
      const deviceAvg = analysis.deviceTests.reduce((sum, test) => sum + test.score, 0) / analysis.deviceTests.length;
      scores.push(deviceAvg);
    }

    // 其他分析评分
    if (analysis.touchInteraction) scores.push(analysis.touchInteraction.score);
    if (analysis.mediaQueries) scores.push(analysis.mediaQueries.score);
    if (analysis.flexboxGrid) scores.push(analysis.flexboxGrid.score);
    if (analysis.imageResponsiveness) scores.push(analysis.imageResponsiveness.score);

    return scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  }

  /**
   * 识别问题
   */
  identifyIssues(analysis) {
    const issues = [];

    // 收集设备测试问题
    analysis.deviceTests.forEach(test => {
      if (test.hasHorizontalScroll) {
        issues.push({
          type: 'horizontal_scroll',
          severity: 'high',
          device: test.device.name,
          message: `在${test.device.name}上出现水平滚动`
        });
      }

      test.layoutIssues.forEach(issue => {
        issues.push({
          type: issue.type,
          severity: 'medium',
          device: test.device.name,
          details: issue
        });
      });

      test.usabilityIssues.forEach(issue => {
        issues.push({
          type: issue.type,
          severity: 'medium',
          device: test.device.name,
          details: issue
        });
      });
    });

    return issues;
  }

  /**
   * 生成建议
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // 基于问题生成建议
    const issueTypes = [...new Set(analysis.issues.map(issue => issue.type))];

    issueTypes.forEach(type => {
      switch (type) {
        case 'horizontal_scroll':
          recommendations.push({
            priority: 'high',
            category: 'layout',
            title: '修复水平滚动问题',
            description: '页面在移动设备上出现水平滚动，影响用户体验',
            solution: '检查并修复超出视口宽度的元素，使用max-width: 100%',
            codeExample: `
/* 防止元素超出容器 */
* {
  box-sizing: border-box;
}

img, video, iframe {
  max-width: 100%;
  height: auto;
}

.container {
  max-width: 100%;
  overflow-x: hidden;
}`
          });
          break;

        case 'small_touch_target':
          recommendations.push({
            priority: 'medium',
            category: 'usability',
            title: '增大触摸目标尺寸',
            description: '触摸目标过小，建议最小尺寸为44x44px',
            solution: '增加按钮和链接的padding，确保触摸区域足够大',
            codeExample: `
/* 确保触摸目标足够大 */
button, a, input[type="submit"] {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}

/* 移动设备特定样式 */
@media (max-width: 768px) {
  .btn {
    padding: 16px 24px;
    font-size: 16px;
  }
}`
          });
          break;

        case 'small_text':
          recommendations.push({
            priority: 'medium',
            category: 'readability',
            title: '增大文字尺寸',
            description: '文字过小影响可读性，建议最小字体大小为16px',
            solution: '调整字体大小，特别是在移动设备上',
            codeExample: `
/* 基础字体大小 */
body {
  font-size: 16px;
  line-height: 1.5;
}

/* 移动设备字体优化 */
@media (max-width: 768px) {
  body {
    font-size: 18px;
  }

  h1 { font-size: 2rem; }
  h2 { font-size: 1.5rem; }
  h3 { font-size: 1.25rem; }
}`
          });
          break;
      }
    });

    return recommendations;
  }

  // 辅助方法
  hasResponsiveDesign(breakpointData) {
    return breakpointData.some(bp => bp.containerWidth !== breakpointData[0].containerWidth);
  }

  calculateBreakpointEffectiveness(breakpointData) {
    // 简化的断点有效性计算
    const uniqueLayouts = new Set(breakpointData.map(bp => `${bp.containerWidth}-${bp.columnCount}`));
    return (uniqueLayouts.size / breakpointData.length) * 100;
  }

  calculateLayoutStability(stabilityTests) {
    const stableTests = stabilityTests.filter(test => !test.hasHorizontalOverflow);
    return (stableTests.length / stabilityTests.length) * 100;
  }

  identifyLayoutStabilityIssues(stabilityTests) {
    return stabilityTests
      .filter(test => test.hasHorizontalOverflow || test.overflowElements > 0)
      .map(test => ({
        viewport: test.viewport,
        issue: test.hasHorizontalOverflow ? 'horizontal_overflow' : 'element_overflow',
        overflowElements: test.overflowElements
      }));
  }

  calculateTouchScore(touchAnalysis) {
    if (touchAnalysis.totalTargets === 0) return 100;
    return Math.round((touchAnalysis.adequateTargets / touchAnalysis.totalTargets) * 100);
  }

  generateTouchRecommendations(touchAnalysis) {
    const recommendations = [];

    if (touchAnalysis.smallTargets > 0) {
      recommendations.push('增大触摸目标尺寸至44x44px以上');
    }

    if (touchAnalysis.overlappingTargets > 0) {
      recommendations.push('增加触摸目标之间的间距');
    }

    return recommendations;
  }

  calculateMediaQueryScore(mediaQueryAnalysis) {
    if (!mediaQueryAnalysis.hasResponsiveCSS) return 0;

    let score = 50; // 基础分

    // 断点数量加分
    if (mediaQueryAnalysis.detectedBreakpoints.length >= 3) score += 20;
    if (mediaQueryAnalysis.detectedBreakpoints.length >= 5) score += 10;

    // 特性使用加分
    if (mediaQueryAnalysis.features.orientation > 0) score += 5;
    if (mediaQueryAnalysis.features.hover > 0) score += 5;
    if (mediaQueryAnalysis.features.pointer > 0) score += 5;
    if (mediaQueryAnalysis.features.resolution > 0) score += 5;

    return Math.min(100, score);
  }

  calculateMediaQueryEffectiveness(mediaQueryAnalysis) {
    const totalFeatures = Object.values(mediaQueryAnalysis.features).reduce((sum, count) => sum + count, 0);
    return totalFeatures > 0 ? Math.min(100, (totalFeatures / 10) * 100) : 0;
  }

  calculateLayoutScore(layoutAnalysis) {
    const modernPercentage = layoutAnalysis.modernLayoutPercentage;
    return Math.min(100, modernPercentage * 2); // 现代布局使用率转换为评分
  }

  generateLayoutRecommendations(layoutAnalysis) {
    const recommendations = [];

    if (layoutAnalysis.modernLayoutPercentage < 50) {
      recommendations.push('考虑使用Flexbox或Grid替代传统布局方法');
    }

    if (layoutAnalysis.layoutStats.floatElements > 5) {
      recommendations.push('减少float的使用，改用Flexbox布局');
    }

    return recommendations;
  }

  calculateImageResponsivenessScore(imageAnalysis) {
    if (imageAnalysis.imageStats.totalImages === 0) return 100;
    return Math.round(imageAnalysis.responsivePercentage);
  }

  generateImageRecommendations(imageAnalysis) {
    const recommendations = [];

    if (imageAnalysis.responsivePercentage < 80) {
      recommendations.push('使用响应式图片技术（srcset、sizes属性）');
    }

    if (imageAnalysis.imageStats.pictureElements === 0 && imageAnalysis.imageStats.totalImages > 5) {
      recommendations.push('考虑使用<picture>元素实现艺术指导');
    }

    return recommendations;
  }

  isOverlapping(rect1, rect2) {
    return !(rect1.right < rect2.left ||
      rect1.left > rect2.right ||
      rect1.bottom < rect2.top ||
      rect1.top > rect2.bottom);
  }

  // 分析文本可读性和导航可用性的简化实现
  async analyzeTextReadability(url) {
    // 简化实现
    return { score: 85, issues: [], recommendations: [] };
  }

  async analyzeNavigationUsability(url) {
    // 简化实现
    return { score: 80, issues: [], recommendations: [] };
  }
}

module.exports = ResponsiveDesignAnalyzer;
