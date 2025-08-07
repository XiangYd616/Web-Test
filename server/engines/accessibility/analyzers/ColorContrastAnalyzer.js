/**
 * 色彩对比度和视觉检测器
 * 本地化程度：100%
 * 实现WCAG 2.1色彩对比度检测、色盲友好性、动画控制、字体缩放等
 */

const puppeteer = require('puppeteer');

class ColorContrastAnalyzer {
  constructor() {
    // WCAG 2.1 对比度标准
    this.contrastStandards = {
      AA: {
        normal: 4.5,    // 正常文本
        large: 3.0      // 大文本（18pt+或14pt粗体+）
      },
      AAA: {
        normal: 7.0,    // 正常文本
        large: 4.5      // 大文本
      }
    };

    // 大文本定义
    this.largeTextThresholds = {
      fontSize: 18,     // 18pt或更大
      boldFontSize: 14  // 14pt粗体或更大
    };

    // 色盲模拟矩阵
    this.colorBlindnessMatrices = {
      protanopia: [
        [0.567, 0.433, 0],
        [0.558, 0.442, 0],
        [0, 0.242, 0.758]
      ],
      deuteranopia: [
        [0.625, 0.375, 0],
        [0.7, 0.3, 0],
        [0, 0.3, 0.7]
      ],
      tritanopia: [
        [0.95, 0.05, 0],
        [0, 0.433, 0.567],
        [0, 0.475, 0.525]
      ]
    };

    this.browser = null;
  }

  /**
   * 综合分析色彩对比度和视觉可访问性
   */
  async analyzeColorContrast(url, options = {}) {
    console.log('🎨 开始色彩对比度和视觉分析...');

    const analysis = {
      url,
      timestamp: new Date().toISOString(),
      contrastAnalysis: null,
      colorBlindnessAnalysis: null,
      animationAnalysis: null,
      fontScalingAnalysis: null,
      visualElementsAnalysis: null,
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

      const page = await this.browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // 分析色彩对比度
      analysis.contrastAnalysis = await this.analyze(page);

      // 分析色盲友好性
      analysis.colorBlindnessAnalysis = await this.analyzeColorBlindness(page);

      // 分析动画和运动
      analysis.animationAnalysis = await this.analyzeAnimations(page);

      // 分析字体缩放
      analysis.fontScalingAnalysis = await this.analyzeFontScaling(page);

      // 分析视觉元素
      analysis.visualElementsAnalysis = await this.analyzeVisualElements(page);

      // 计算总体评分
      analysis.overallScore = this.calculateOverallScore(analysis);

      // 识别问题
      analysis.issues = this.identifyIssues(analysis);

      // 生成建议
      analysis.recommendations = this.generateRecommendations(analysis);

      console.log(`✅ 色彩对比度分析完成 - 总体评分: ${analysis.overallScore}`);

      return analysis;

    } catch (error) {
      console.error('色彩对比度分析失败:', error);
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  /**
   * 分析页面色彩对比度（原有方法）
   */
  async analyze(page) {
    try {
      console.log('🎨 开始色彩对比度分析...');

      const results = await page.evaluate(() => {
        // 获取所有文本元素
        const textElements = this.getAllTextElements();
        const contrastResults = [];

        textElements.forEach((element, index) => {
          try {
            const textColor = this.getComputedColor(element, 'color');
            const backgroundColor = this.getBackgroundColor(element);

            if (textColor && backgroundColor) {
              const contrast = this.calculateContrast(textColor, backgroundColor);
              const isLargeText = this.isLargeText(element);
              const compliance = this.checkCompliance(contrast, isLargeText);

              contrastResults.push({
                elementIndex: index,
                selector: this.getElementSelector(element),
                text: element.textContent.trim().substring(0, 100),
                textColor: this.rgbToHex(textColor),
                backgroundColor: this.rgbToHex(backgroundColor),
                contrast: Math.round(contrast * 100) / 100,
                isLargeText,
                compliance,
                position: this.getElementPosition(element),
                fontSize: this.getFontSize(element),
                fontWeight: this.getFontWeight(element)
              });
            }
          } catch (error) {
            console.warn('元素分析失败:', error);
          }
        });

        return contrastResults;
      });

      // 分析结果
      const analysis = this.analyzeResults(results);

      console.log(`✅ 色彩对比度分析完成，检测了 ${results.length} 个文本元素`);

      return {
        elements: results,
        analysis,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ 色彩对比度分析失败:', error);
      throw error;
    }
  }

  /**
   * 在页面中注入分析函数
   */
  async injectAnalysisFunctions(page) {
    await page.evaluate(() => {
      // 获取所有文本元素
      window.getAllTextElements = function () {
        const textElements = [];
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: function (node) {
              // 过滤掉空白文本和隐藏元素
              if (node.textContent.trim().length === 0) {
                return NodeFilter.FILTER_REJECT;
              }

              const element = node.parentElement;
              if (!element) return NodeFilter.FILTER_REJECT;

              const style = window.getComputedStyle(element);
              if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return NodeFilter.FILTER_REJECT;
              }

              return NodeFilter.FILTER_ACCEPT;
            }
          }
        );

        let node;
        while (node = walker.nextNode()) {
          const element = node.parentElement;
          if (element && !textElements.includes(element)) {
            textElements.push(element);
          }
        }

        return textElements;
      };

      // 获取计算后的颜色
      window.getComputedColor = function (element, property) {
        const style = window.getComputedStyle(element);
        const color = style.getPropertyValue(property);
        return this.parseColor(color);
      };

      // 获取背景颜色
      window.getBackgroundColor = function (element) {
        let currentElement = element;

        while (currentElement && currentElement !== document.body) {
          const style = window.getComputedStyle(currentElement);
          const bgColor = style.backgroundColor;

          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            return this.parseColor(bgColor);
          }

          currentElement = currentElement.parentElement;
        }

        // 默认返回白色背景
        return { r: 255, g: 255, b: 255, a: 1 };
      };

      // 解析颜色值
      window.parseColor = function (colorStr) {
        if (!colorStr) return null;

        // RGB/RGBA格式
        const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbaMatch) {
          return {
            r: parseInt(rgbaMatch[1]),
            g: parseInt(rgbaMatch[2]),
            b: parseInt(rgbaMatch[3]),
            a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1
          };
        }

        // HEX格式
        const hexMatch = colorStr.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        if (hexMatch) {
          return {
            r: parseInt(hexMatch[1], 16),
            g: parseInt(hexMatch[2], 16),
            b: parseInt(hexMatch[3], 16),
            a: 1
          };
        }

        // 命名颜色
        const namedColors = {
          'black': { r: 0, g: 0, b: 0, a: 1 },
          'white': { r: 255, g: 255, b: 255, a: 1 },
          'red': { r: 255, g: 0, b: 0, a: 1 },
          'green': { r: 0, g: 128, b: 0, a: 1 },
          'blue': { r: 0, g: 0, b: 255, a: 1 }
        };

        return namedColors[colorStr.toLowerCase()] || null;
      };

      // 计算对比度
      window.calculateContrast = function (color1, color2) {
        const l1 = this.getLuminance(color1);
        const l2 = this.getLuminance(color2);

        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);

        return (lighter + 0.05) / (darker + 0.05);
      };

      // 计算相对亮度
      window.getLuminance = function (color) {
        const { r, g, b } = color;

        const [rs, gs, bs] = [r, g, b].map(c => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      };

      // 检查是否为大文本
      window.isLargeText = function (element) {
        const style = window.getComputedStyle(element);
        const fontSize = parseFloat(style.fontSize);
        const fontWeight = style.fontWeight;

        // 转换为pt（假设96dpi）
        const fontSizePt = fontSize * 0.75;

        // 18pt或更大，或14pt粗体或更大
        return fontSizePt >= 18 || (fontSizePt >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
      };

      // 检查合规性
      window.checkCompliance = function (contrast, isLargeText) {
        const standards = {
          AA: {
            normal: 4.5,
            large: 3.0
          },
          AAA: {
            normal: 7.0,
            large: 4.5
          }
        };

        const threshold = isLargeText ? 'large' : 'normal';

        return {
          AA: contrast >= standards.AA[threshold],
          AAA: contrast >= standards.AAA[threshold],
          level: contrast >= standards.AAA[threshold] ? 'AAA' :
            contrast >= standards.AA[threshold] ? 'AA' : 'Fail'
        };
      };

      // 获取元素选择器
      window.getElementSelector = function (element) {
        if (element.id) {
          return `#${element.id}`;
        }

        if (element.className) {
          return `${element.tagName.toLowerCase()}.${element.className.split(' ')[0]}`;
        }

        return element.tagName.toLowerCase();
      };

      // 获取元素位置
      window.getElementPosition = function (element) {
        const rect = element.getBoundingClientRect();
        return {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      };

      // 获取字体大小
      window.getFontSize = function (element) {
        const style = window.getComputedStyle(element);
        return parseFloat(style.fontSize);
      };

      // 获取字体粗细
      window.getFontWeight = function (element) {
        const style = window.getComputedStyle(element);
        return style.fontWeight;
      };

      // RGB转HEX
      window.rgbToHex = function (color) {
        const { r, g, b } = color;
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      };
    });
  }

  /**
   * 分析检测结果
   */
  analyzeResults(results) {
    const analysis = {
      summary: {
        total: results.length,
        compliant: {
          AA: 0,
          AAA: 0
        },
        nonCompliant: {
          AA: 0,
          AAA: 0
        },
        averageContrast: 0
      },
      issues: [],
      recommendations: []
    };

    // 统计分析
    let totalContrast = 0;

    results.forEach((result, index) => {
      totalContrast += result.contrast;

      if (result.compliance.AA) {
        analysis.summary.compliant.AA++;
      } else {
        analysis.summary.nonCompliant.AA++;

        // 记录不合规问题
        analysis.issues.push({
          type: 'contrast_aa_fail',
          severity: 'high',
          element: result.selector,
          text: result.text,
          contrast: result.contrast,
          required: result.isLargeText ? 3.0 : 4.5,
          textColor: result.textColor,
          backgroundColor: result.backgroundColor,
          position: result.position,
          recommendation: this.generateContrastRecommendation(result, 'AA')
        });
      }

      if (result.compliance.AAA) {
        analysis.summary.compliant.AAA++;
      } else {
        analysis.summary.nonCompliant.AAA++;

        if (result.compliance.AA) {
          // AA合规但AAA不合规
          analysis.issues.push({
            type: 'contrast_aaa_fail',
            severity: 'medium',
            element: result.selector,
            text: result.text,
            contrast: result.contrast,
            required: result.isLargeText ? 4.5 : 7.0,
            textColor: result.textColor,
            backgroundColor: result.backgroundColor,
            position: result.position,
            recommendation: this.generateContrastRecommendation(result, 'AAA')
          });
        }
      }
    });

    analysis.summary.averageContrast = results.length > 0 ?
      Math.round((totalContrast / results.length) * 100) / 100 : 0;

    // 生成建议
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * 生成对比度建议
   */
  generateContrastRecommendation(result, level) {
    const required = level === 'AAA' ?
      (result.isLargeText ? 4.5 : 7.0) :
      (result.isLargeText ? 3.0 : 4.5);

    const improvement = required / result.contrast;

    if (improvement <= 1.2) {
      return '轻微调整文本或背景颜色即可达到标准';
    } else if (improvement <= 2.0) {
      return '需要显著调整颜色对比度';
    } else {
      return '需要完全重新设计颜色方案';
    }
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // 基于不合规数量生成建议
    if (analysis.summary.nonCompliant.AA > 0) {
      recommendations.push({
        priority: 'high',
        category: 'contrast',
        title: '修复AA级别对比度问题',
        description: `发现 ${analysis.summary.nonCompliant.AA} 个不符合WCAG AA标准的对比度问题`,
        solution: '调整文本颜色或背景颜色以达到4.5:1（正常文本）或3:1（大文本）的对比度'
      });
    }

    if (analysis.summary.nonCompliant.AAA > analysis.summary.nonCompliant.AA) {
      recommendations.push({
        priority: 'medium',
        category: 'contrast',
        title: '提升至AAA级别对比度',
        description: `${analysis.summary.nonCompliant.AAA - analysis.summary.nonCompliant.AA} 个元素可进一步提升至AAA标准`,
        solution: '调整颜色以达到7:1（正常文本）或4.5:1（大文本）的对比度'
      });
    }

    // 基于平均对比度生成建议
    if (analysis.summary.averageContrast < 4.5) {
      recommendations.push({
        priority: 'high',
        category: 'overall',
        title: '整体对比度偏低',
        description: `平均对比度为 ${analysis.summary.averageContrast}:1，低于推荐标准`,
        solution: '考虑使用更高对比度的配色方案'
      });
    }

    return recommendations;
  }

  /**
   * 生成颜色建议
   */
  suggestColors(currentTextColor, currentBgColor, targetContrast) {
    // 简化的颜色建议算法
    const suggestions = [];

    // 建议加深文本颜色
    suggestions.push({
      type: 'darken_text',
      description: '加深文本颜色',
      textColor: this.adjustBrightness(currentTextColor, -0.3),
      backgroundColor: currentBgColor
    });

    // 建议加亮背景颜色
    suggestions.push({
      type: 'lighten_background',
      description: '加亮背景颜色',
      textColor: currentTextColor,
      backgroundColor: this.adjustBrightness(currentBgColor, 0.3)
    });

    return suggestions;
  }

  /**
   * 调整颜色亮度
   */
  adjustBrightness(color, factor) {
    const adjust = (value) => {
      if (factor > 0) {
        return Math.min(255, Math.round(value + (255 - value) * factor));
      } else {
        return Math.max(0, Math.round(value * (1 + factor)));
      }
    };

    return {
      r: adjust(color.r),
      g: adjust(color.g),
      b: adjust(color.b),
      a: color.a
    };
  }

  /**
   * 分析色盲友好性
   */
  async analyzeColorBlindness(page) {
    return await page.evaluate(() => {
      const colorDependentElements = [];
      const problematicElements = [];

      // 检查仅依赖颜色传达信息的元素
      const allElements = document.querySelectorAll('*');

      allElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        const text = element.textContent.trim();

        // 检查链接是否仅通过颜色区分
        if (element.tagName === 'A' && text) {
          const textDecoration = styles.textDecoration;
          const color = styles.color;
          const parentColor = window.getComputedStyle(element.parentElement).color;

          if (textDecoration === 'none' && color !== parentColor) {
            colorDependentElements.push({
              type: 'link_color_only',
              element: 'a',
              text: text.substring(0, 30),
              issue: '链接仅通过颜色区分，缺少下划线或其他视觉提示'
            });
          }
        }

        // 检查状态指示器
        if (element.classList.contains('success') ||
          element.classList.contains('error') ||
          element.classList.contains('warning') ||
          element.classList.contains('info')) {

          const hasIcon = element.querySelector('i, svg, .icon');
          const hasText = text.includes('成功') || text.includes('错误') ||
            text.includes('警告') || text.includes('信息') ||
            text.includes('success') || text.includes('error') ||
            text.includes('warning') || text.includes('info');

          if (!hasIcon && !hasText) {
            problematicElements.push({
              type: 'status_color_only',
              element: element.tagName.toLowerCase(),
              className: element.className,
              issue: '状态信息仅通过颜色传达，缺少图标或文字说明'
            });
          }
        }
      });

      return {
        colorDependentElements,
        problematicElements,
        totalIssues: colorDependentElements.length + problematicElements.length,
        colorBlindFriendlyScore: Math.max(0, 100 - (colorDependentElements.length + problematicElements.length) * 10)
      };
    });
  }

  /**
   * 分析动画和运动
   */
  async analyzeAnimations(page) {
    return await page.evaluate(() => {
      const animations = [];
      const problematicAnimations = [];

      // 检查CSS动画
      const animatedElements = document.querySelectorAll('*');
      animatedElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        const animationName = styles.animationName;

        if (animationName !== 'none') {
          const animationDuration = parseFloat(styles.animationDuration);
          const animationIterationCount = styles.animationIterationCount;

          animations.push({
            type: 'css_animation',
            element: element.tagName.toLowerCase(),
            animationName,
            duration: animationDuration,
            iterationCount: animationIterationCount
          });

          // 检查可能引起前庭障碍的动画
          if (animationIterationCount === 'infinite' ||
            animationName.includes('shake') ||
            animationName.includes('bounce') ||
            animationName.includes('flash')) {
            problematicAnimations.push({
              type: 'vestibular_trigger',
              element: element.tagName.toLowerCase(),
              issue: '动画可能引起前庭障碍，建议提供关闭选项'
            });
          }
        }
      });

      // 检查是否有动画控制选项
      const hasReducedMotionSupport = document.querySelector('[data-reduce-motion], .reduce-motion') !== null;

      return {
        totalAnimations: animations.length,
        animations: animations.slice(0, 10),
        problematicAnimations,
        hasReducedMotionSupport,
        animationScore: Math.max(0, 100 - problematicAnimations.length * 20)
      };
    });
  }

  /**
   * 分析字体缩放
   */
  async analyzeFontScaling(page) {
    return await page.evaluate(() => {
      const scalingIssues = [];
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button, label');

      textElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        const fontSize = parseFloat(styles.fontSize);
        const fontSizeUnit = styles.fontSize.replace(/[\d.]/g, '');

        // 检查是否使用了固定单位
        if (fontSizeUnit === 'px' && fontSize < 16) {
          scalingIssues.push({
            type: 'small_fixed_font',
            element: element.tagName.toLowerCase(),
            fontSize: fontSize,
            issue: '使用了过小的固定字体大小，可能影响缩放'
          });
        }
      });

      return {
        totalTextElements: textElements.length,
        scalingIssues: scalingIssues.slice(0, 10),
        totalIssues: scalingIssues.length,
        fontScalingScore: Math.max(0, 100 - (scalingIssues.length / textElements.length) * 100)
      };
    });
  }

  /**
   * 分析视觉元素
   */
  async analyzeVisualElements(page) {
    return await page.evaluate(() => {
      const visualIssues = [];

      // 检查图片的alt属性
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (!img.alt) {
          visualIssues.push({
            type: 'missing_alt',
            element: 'img',
            src: img.src.substring(0, 50),
            issue: '图片缺少alt属性'
          });
        }
      });

      return {
        totalImages: images.length,
        imagesWithAlt: images.length - visualIssues.filter(issue => issue.type === 'missing_alt').length,
        visualIssues: visualIssues.slice(0, 10),
        visualScore: Math.max(0, 100 - (visualIssues.length / Math.max(images.length, 1)) * 100)
      };
    });
  }

  /**
   * 计算总体评分
   */
  calculateOverallScore(analysis) {
    const scores = [];

    if (analysis.contrastAnalysis && analysis.contrastAnalysis.overallScore !== undefined) {
      scores.push(analysis.contrastAnalysis.overallScore);
    }

    if (analysis.colorBlindnessAnalysis) {
      scores.push(analysis.colorBlindnessAnalysis.colorBlindFriendlyScore);
    }

    if (analysis.animationAnalysis) {
      scores.push(analysis.animationAnalysis.animationScore);
    }

    if (analysis.fontScalingAnalysis) {
      scores.push(analysis.fontScalingAnalysis.fontScalingScore);
    }

    if (analysis.visualElementsAnalysis) {
      scores.push(analysis.visualElementsAnalysis.visualScore);
    }

    return scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  }

  /**
   * 识别问题
   */
  identifyIssues(analysis) {
    const issues = [];

    // 对比度问题
    if (analysis.contrastAnalysis && analysis.contrastAnalysis.failedElements) {
      analysis.contrastAnalysis.failedElements.forEach(element => {
        issues.push({
          type: 'contrast',
          severity: 'high',
          element: element.element,
          message: `对比度不足: ${element.contrast}:1 (需要 ${element.required}:1)`
        });
      });
    }

    // 色盲友好性问题
    if (analysis.colorBlindnessAnalysis) {
      analysis.colorBlindnessAnalysis.colorDependentElements.forEach(element => {
        issues.push({
          type: 'color_dependency',
          severity: 'medium',
          element: element.element,
          message: element.issue
        });
      });
    }

    return issues;
  }

  /**
   * 生成建议
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // 对比度建议
    if (analysis.contrastAnalysis && analysis.contrastAnalysis.overallScore < 80) {
      recommendations.push({
        category: 'contrast',
        priority: 'high',
        title: '改善色彩对比度',
        description: '多个元素的对比度不符合WCAG标准',
        suggestions: [
          '增加文本和背景之间的对比度',
          '使用更深的文本颜色或更浅的背景色',
          '避免使用低对比度的颜色组合'
        ]
      });
    }

    // 色盲友好性建议
    if (analysis.colorBlindnessAnalysis && analysis.colorBlindnessAnalysis.totalIssues > 0) {
      recommendations.push({
        category: 'color_blindness',
        priority: 'medium',
        title: '提升色盲友好性',
        description: '某些元素仅依赖颜色传达信息',
        suggestions: [
          '为链接添加下划线或其他视觉提示',
          '在状态信息中添加图标或文字说明',
          '使用图案或纹理区分数据'
        ]
      });
    }

    return recommendations;
  }
}

module.exports = ColorContrastAnalyzer;
