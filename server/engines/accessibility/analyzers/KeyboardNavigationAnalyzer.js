/**
 * 键盘导航分析器
 * 本地化程度：100%
 * 检测键盘导航和焦点管理的可访问性
 */

class KeyboardNavigationAnalyzer {
  constructor() {
    // 可聚焦元素选择器
    this.focusableSelectors = [
      'a[href]',
      'button',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      'iframe',
      'object',
      'embed',
      'area[href]',
      'audio[controls]',
      'video[controls]',
      '[contenteditable]',
      'details summary'
    ];

    // 交互元素选择器
    this.interactiveSelectors = [
      'button',
      'a',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="tab"]',
      '[onclick]'
    ];
  }

  /**
   * 分析键盘导航和焦点管理
   */
  async analyzeKeyboardNavigation(url, options = {}) {
    console.log('⌨️ 开始键盘导航分析...');

    const analysis = {
      url,
      timestamp: new Date().toISOString(),
      focusableElements: null,
      tabOrder: null,
      focusVisibility: null,
      keyboardTraps: null,
      skipLinks: null,
      accessKeys: null,
      modalFocusManagement: null,
      customKeyboardHandlers: null,
      overallScore: 0,
      issues: [],
      recommendations: []
    };

    const puppeteer = require('puppeteer');
    let browser = null;

    try {
      // 初始化浏览器
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // 分析可聚焦元素
      analysis.focusableElements = await this.analyzeFocusableElements(page);

      // 分析Tab键导航顺序
      analysis.tabOrder = await this.analyzeTabOrder(page);

      // 分析焦点可见性
      analysis.focusVisibility = await this.analyzeFocusVisibility(page);

      // 检测键盘陷阱
      analysis.keyboardTraps = await this.detectKeyboardTraps(page);

      // 分析跳转链接
      analysis.skipLinks = await this.analyzeSkipLinks(page);

      // 分析访问键
      analysis.accessKeys = await this.analyzeAccessKeys(page);

      // 分析模态框焦点管理
      analysis.modalFocusManagement = await this.analyzeModalFocusManagement(page);

      // 分析自定义键盘处理器
      analysis.customKeyboardHandlers = await this.analyzeCustomKeyboardHandlers(page);

      // 计算总体评分
      analysis.overallScore = this.calculateOverallScore(analysis);

      // 识别问题
      analysis.issues = this.identifyIssues(analysis);

      // 生成建议
      analysis.recommendations = this.generateRecommendations(analysis);

      console.log(`✅ 键盘导航分析完成 - 总体评分: ${analysis.overallScore}`);

      return analysis;

    } catch (error) {
      console.error('键盘导航分析失败:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * 分析键盘导航（兼容原有方法）
   */
  async analyze(page) {
    try {
      console.log('⌨️ 开始键盘导航分析...');

      // 注入分析函数
      await this.injectAnalysisFunctions(page);

      const results = await page.evaluate(() => {
        const analyzer = window.keyboardNavigationAnalyzer;

        return {
          focusableElements: analyzer.analyzeFocusableElements(),
          tabOrder: analyzer.analyzeTabOrder(),
          focusVisibility: analyzer.analyzeFocusVisibility(),
          keyboardTraps: analyzer.detectKeyboardTraps(),
          skipLinks: analyzer.analyzeSkipLinks(),
          accessKeys: analyzer.analyzeAccessKeys(),
          interactiveElements: analyzer.analyzeInteractiveElements()
        };
      });

      // 分析结果
      const analysis = this.analyzeResults(results);

      console.log(`✅ 键盘导航分析完成`);

      return {
        ...results,
        analysis,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ 键盘导航分析失败:', error);
      throw error;
    }
  }

  /**
   * 注入分析函数
   */
  async injectAnalysisFunctions(page) {
    await page.evaluate(() => {
      window.keyboardNavigationAnalyzer = {

        // 分析可聚焦元素
        analyzeFocusableElements() {
          const focusableSelectors = [
            'a[href]', 'button', 'input:not([disabled])', 'select:not([disabled])',
            'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
            'iframe', 'object', 'embed', 'area[href]', 'audio[controls]',
            'video[controls]', '[contenteditable]', 'details summary'
          ];

          const elements = [];

          focusableSelectors.forEach(selector => {
            const found = document.querySelectorAll(selector);
            found.forEach((element, index) => {
              if (this.isVisible(element)) {
                elements.push({
                  tagName: element.tagName.toLowerCase(),
                  selector: this.getElementSelector(element),
                  tabIndex: element.tabIndex,
                  hasTabIndex: element.hasAttribute('tabindex'),
                  position: this.getElementPosition(element),
                  text: this.getElementText(element),
                  ariaLabel: element.getAttribute('aria-label'),
                  ariaLabelledBy: element.getAttribute('aria-labelledby'),
                  role: element.getAttribute('role'),
                  disabled: element.disabled || element.getAttribute('aria-disabled') === 'true'
                });
              }
            });
          });

          return elements;
        },

        // 分析Tab顺序
        analyzeTabOrder() {
          const focusableElements = document.querySelectorAll(
            'a[href], button, input:not([disabled]), select:not([disabled]), ' +
            'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );

          const tabOrder = [];
          const issues = [];

          Array.from(focusableElements).forEach((element, index) => {
            if (this.isVisible(element)) {
              const tabIndex = element.tabIndex;
              const position = this.getElementPosition(element);

              tabOrder.push({
                element: this.getElementSelector(element),
                tabIndex,
                visualOrder: index,
                position,
                text: this.getElementText(element)
              });

              // 检查Tab顺序问题
              if (tabIndex > 0) {
                issues.push({
                  type: 'positive_tabindex',
                  element: this.getElementSelector(element),
                  tabIndex,
                  message: '使用正数tabindex可能导致导航混乱'
                });
              }
            }
          });

          // 按tabIndex和DOM顺序排序
          tabOrder.sort((a, b) => {
            if (a.tabIndex === 0 && b.tabIndex === 0) {
              return a.visualOrder - b.visualOrder;
            }
            if (a.tabIndex === 0) return 1;
            if (b.tabIndex === 0) return -1;
            return a.tabIndex - b.tabIndex;
          });

          return { tabOrder, issues };
        },

        // 分析焦点可见性
        analyzeFocusVisibility() {
          const focusableElements = document.querySelectorAll(
            'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );

          const results = [];

          Array.from(focusableElements).forEach(element => {
            if (this.isVisible(element)) {
              const style = window.getComputedStyle(element);
              const pseudoStyle = window.getComputedStyle(element, ':focus');

              const hasFocusOutline = pseudoStyle.outline !== 'none' &&
                pseudoStyle.outline !== '0px' &&
                pseudoStyle.outline !== '';

              const hasFocusStyles = pseudoStyle.boxShadow !== style.boxShadow ||
                pseudoStyle.backgroundColor !== style.backgroundColor ||
                pseudoStyle.borderColor !== style.borderColor;

              const hasVisibleFocus = hasFocusOutline || hasFocusStyles;

              results.push({
                element: this.getElementSelector(element),
                hasVisibleFocus,
                outlineStyle: pseudoStyle.outline,
                position: this.getElementPosition(element),
                text: this.getElementText(element)
              });
            }
          });

          return results;
        },

        // 检测键盘陷阱
        detectKeyboardTraps() {
          const modals = document.querySelectorAll('[role="dialog"], .modal, .popup');
          const traps = [];

          modals.forEach(modal => {
            if (this.isVisible(modal)) {
              const focusableInModal = modal.querySelectorAll(
                'a[href], button, input:not([disabled]), select:not([disabled]), ' +
                'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
              );

              if (focusableInModal.length > 0) {
                traps.push({
                  element: this.getElementSelector(modal),
                  type: 'modal',
                  focusableCount: focusableInModal.length,
                  position: this.getElementPosition(modal),
                  hasProperTrap: this.checkModalTrap(modal)
                });
              }
            }
          });

          return traps;
        },

        // 分析跳转链接
        analyzeSkipLinks() {
          const skipLinks = [];
          const links = document.querySelectorAll('a[href^="#"]');

          links.forEach(link => {
            const href = link.getAttribute('href');
            const target = document.querySelector(href);
            const text = this.getElementText(link).toLowerCase();

            if (text.includes('skip') || text.includes('跳转') || text.includes('跳过')) {
              skipLinks.push({
                element: this.getElementSelector(link),
                href,
                text: this.getElementText(link),
                hasValidTarget: !!target,
                targetFocusable: target ? target.tabIndex >= 0 || target.hasAttribute('tabindex') : false,
                position: this.getElementPosition(link),
                visible: this.isVisible(link)
              });
            }
          });

          return skipLinks;
        },

        // 分析访问键
        analyzeAccessKeys() {
          const elementsWithAccessKey = document.querySelectorAll('[accesskey]');
          const accessKeys = [];
          const duplicates = new Map();

          elementsWithAccessKey.forEach(element => {
            const accessKey = element.getAttribute('accesskey');

            if (!duplicates.has(accessKey)) {
              duplicates.set(accessKey, []);
            }
            duplicates.get(accessKey).push(element);

            accessKeys.push({
              element: this.getElementSelector(element),
              accessKey,
              text: this.getElementText(element),
              position: this.getElementPosition(element)
            });
          });

          const duplicateKeys = Array.from(duplicates.entries())
            .filter(([key, elements]) => elements.length > 1)
            .map(([key, elements]) => ({
              accessKey: key,
              count: elements.length,
              elements: elements.map(el => this.getElementSelector(el))
            }));

          return { accessKeys, duplicateKeys };
        },

        // 分析交互元素
        analyzeInteractiveElements() {
          const interactiveSelectors = [
            'button', 'a', 'input', 'select', 'textarea',
            '[role="button"]', '[role="link"]', '[role="menuitem"]',
            '[role="tab"]', '[onclick]'
          ];

          const elements = [];

          interactiveSelectors.forEach(selector => {
            const found = document.querySelectorAll(selector);
            found.forEach(element => {
              if (this.isVisible(element)) {
                const isFocusable = element.tabIndex >= 0 ||
                  element.matches('a[href], button, input, select, textarea');

                elements.push({
                  element: this.getElementSelector(element),
                  tagName: element.tagName.toLowerCase(),
                  role: element.getAttribute('role'),
                  isFocusable,
                  hasClickHandler: element.hasAttribute('onclick') ||
                    element.addEventListener !== undefined,
                  text: this.getElementText(element),
                  position: this.getElementPosition(element)
                });
              }
            });
          });

          return elements;
        },

        // 检查模态框陷阱
        checkModalTrap(modal) {
          // 简化检查：查看是否有焦点管理相关的属性或脚本
          return modal.hasAttribute('aria-modal') ||
            modal.querySelector('[data-focus-trap]') !== null;
        },

        // 检查元素是否可见
        isVisible(element) {
          const style = window.getComputedStyle(element);
          return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            element.offsetWidth > 0 &&
            element.offsetHeight > 0;
        },

        // 获取元素选择器
        getElementSelector(element) {
          if (element.id) {
            return `#${element.id}`;
          }

          if (element.className) {
            const className = element.className.split(' ')[0];
            return `${element.tagName.toLowerCase()}.${className}`;
          }

          return element.tagName.toLowerCase();
        },

        // 获取元素位置
        getElementPosition(element) {
          const rect = element.getBoundingClientRect();
          return {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          };
        },

        // 获取元素文本
        getElementText(element) {
          return (element.textContent || element.value || element.alt ||
            element.getAttribute('aria-label') || '').trim().substring(0, 100);
        }
      };
    });
  }

  /**
   * 分析检测结果
   */
  analyzeResults(results) {
    const analysis = {
      summary: {
        focusableElements: results.focusableElements.length,
        tabOrderIssues: results.tabOrder.issues.length,
        focusVisibilityIssues: 0,
        keyboardTraps: results.keyboardTraps.length,
        skipLinks: results.skipLinks.length,
        accessKeyDuplicates: results.accessKeys.duplicateKeys.length
      },
      issues: [],
      recommendations: []
    };

    // 分析焦点可见性问题
    results.focusVisibility.forEach(item => {
      if (!item.hasVisibleFocus) {
        analysis.summary.focusVisibilityIssues++;
        analysis.issues.push({
          type: 'focus_not_visible',
          severity: 'high',
          element: item.element,
          description: '元素获得焦点时没有可见的焦点指示器',
          position: item.position
        });
      }
    });

    // 分析Tab顺序问题
    results.tabOrder.issues.forEach(issue => {
      analysis.issues.push({
        type: issue.type,
        severity: 'medium',
        element: issue.element,
        description: issue.message,
        tabIndex: issue.tabIndex
      });
    });

    // 分析跳转链接问题
    results.skipLinks.forEach(skipLink => {
      if (!skipLink.hasValidTarget) {
        analysis.issues.push({
          type: 'invalid_skip_link',
          severity: 'medium',
          element: skipLink.element,
          description: '跳转链接指向的目标不存在',
          href: skipLink.href
        });
      }

      if (!skipLink.visible) {
        analysis.issues.push({
          type: 'hidden_skip_link',
          severity: 'low',
          element: skipLink.element,
          description: '跳转链接不可见（建议在获得焦点时显示）'
        });
      }
    });

    // 分析访问键重复
    results.accessKeys.duplicateKeys.forEach(duplicate => {
      analysis.issues.push({
        type: 'duplicate_accesskey',
        severity: 'medium',
        accessKey: duplicate.accessKey,
        description: `访问键 "${duplicate.accessKey}" 被重复使用`,
        elements: duplicate.elements,
        count: duplicate.count
      });
    });

    // 分析交互元素
    results.interactiveElements.forEach(element => {
      if (!element.isFocusable && element.hasClickHandler) {
        analysis.issues.push({
          type: 'non_focusable_interactive',
          severity: 'high',
          element: element.element,
          description: '交互元素无法通过键盘访问',
          tagName: element.tagName
        });
      }
    });

    // 生成建议
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.summary.focusVisibilityIssues > 0) {
      recommendations.push({
        priority: 'high',
        category: 'focus',
        title: '添加焦点可见性指示器',
        description: `${analysis.summary.focusVisibilityIssues} 个元素缺少焦点可见性指示器`,
        solution: '为所有可聚焦元素添加:focus样式，确保焦点状态清晰可见'
      });
    }

    if (analysis.summary.tabOrderIssues > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'navigation',
        title: '优化Tab导航顺序',
        description: `发现 ${analysis.summary.tabOrderIssues} 个Tab顺序问题`,
        solution: '避免使用正数tabindex，确保Tab顺序符合视觉布局'
      });
    }

    if (analysis.summary.skipLinks === 0) {
      recommendations.push({
        priority: 'medium',
        category: 'navigation',
        title: '添加跳转链接',
        description: '页面缺少跳转链接，不利于键盘用户快速导航',
        solution: '在页面顶部添加"跳转到主内容"链接'
      });
    }

    if (analysis.summary.accessKeyDuplicates > 0) {
      recommendations.push({
        priority: 'low',
        category: 'shortcuts',
        title: '修复重复的访问键',
        description: `发现 ${analysis.summary.accessKeyDuplicates} 个重复的访问键`,
        solution: '确保每个访问键在页面中唯一'
      });
    }

    return recommendations;
  }

  /**
   * 分析可聚焦元素
   */
  async analyzeFocusableElements(page) {
    const focusableSelectors = this.focusableSelectors.join(', ');

    return await page.evaluate((selector) => {
      const elements = document.querySelectorAll(selector);
      const elementData = [];

      elements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        const isVisible = rect.width > 0 && rect.height > 0 &&
          styles.visibility !== 'hidden' &&
          styles.display !== 'none';

        elementData.push({
          index,
          tagName: el.tagName.toLowerCase(),
          type: el.type || null,
          id: el.id || null,
          className: el.className || null,
          tabIndex: el.tabIndex,
          href: el.href || null,
          ariaLabel: el.getAttribute('aria-label') || null,
          ariaLabelledby: el.getAttribute('aria-labelledby') || null,
          ariaDescribedby: el.getAttribute('aria-describedby') || null,
          role: el.getAttribute('role') || null,
          isVisible,
          position: {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
          }
        });
      });

      return {
        totalElements: elements.length,
        visibleElements: elementData.filter(el => el.isVisible).length,
        hiddenElements: elementData.filter(el => !el.isVisible).length,
        elements: elementData
      };
    }, focusableSelectors);
  }

  /**
   * 分析Tab键导航顺序
   */
  async analyzeTabOrder(page) {
    const tabOrder = [];
    const maxTabs = 30; // 限制最大Tab次数

    try {
      // 重置焦点
      await page.evaluate(() => {
        if (document.activeElement) {
          document.activeElement.blur();
        }
        document.body.focus();
      });

      // 模拟Tab键导航
      for (let i = 0; i < maxTabs; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);

        const focusedElement = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;

          const rect = el.getBoundingClientRect();
          return {
            tagName: el.tagName.toLowerCase(),
            type: el.type || null,
            id: el.id || null,
            className: el.className || null,
            tabIndex: el.tabIndex,
            textContent: el.textContent ? el.textContent.substring(0, 50) : null,
            href: el.href || null,
            position: {
              x: rect.left,
              y: rect.top
            }
          };
        });

        if (focusedElement) {
          // 检查是否回到了第一个元素
          if (tabOrder.length > 0 && this.isSameElement(focusedElement, tabOrder[0])) {
            break;
          }
          tabOrder.push({ ...focusedElement, tabIndex: i + 1 });
        }
      }

      return {
        tabSequence: tabOrder,
        totalTabStops: tabOrder.length,
        hasLogicalOrder: this.checkLogicalTabOrder(tabOrder),
        issues: this.identifyTabOrderIssues(tabOrder)
      };

    } catch (error) {
      return {
        tabSequence: [],
        totalTabStops: 0,
        hasLogicalOrder: false,
        issues: ['Tab顺序分析失败']
      };
    }
  }

  /**
   * 分析焦点可见性
   */
  async analyzeFocusVisibility(page) {
    const visibilityResults = [];
    const focusableSelectors = this.focusableSelectors.join(', ');

    try {
      const focusableElements = await page.$$eval(focusableSelectors, elements => {
        return elements.slice(0, 15).map((el, index) => ({
          index,
          selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ''),
          tagName: el.tagName.toLowerCase()
        }));
      });

      for (const element of focusableElements) {
        try {
          await page.focus(element.selector);
          await page.waitForTimeout(100);

          const focusStyles = await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            if (!el) return null;

            const styles = window.getComputedStyle(el);
            return {
              outline: styles.outline,
              outlineWidth: styles.outlineWidth,
              outlineStyle: styles.outlineStyle,
              outlineColor: styles.outlineColor,
              boxShadow: styles.boxShadow,
              border: styles.border
            };
          }, element.selector);

          const hasVisibleFocus = this.checkFocusVisibility(focusStyles);

          visibilityResults.push({
            element: element.selector,
            tagName: element.tagName,
            hasVisibleFocus,
            focusStyles
          });

        } catch (error) {
          visibilityResults.push({
            element: element.selector,
            tagName: element.tagName,
            hasVisibleFocus: false,
            focusStyles: null
          });
        }
      }

      const visibleFocusCount = visibilityResults.filter(r => r.hasVisibleFocus).length;
      const totalTested = visibilityResults.length;

      return {
        totalTested,
        visibleFocusCount,
        invisibleFocusCount: totalTested - visibleFocusCount,
        visibilityPercentage: totalTested > 0 ? Math.round((visibleFocusCount / totalTested) * 100) : 0,
        results: visibilityResults,
        score: totalTested > 0 ? Math.round((visibleFocusCount / totalTested) * 100) : 100
      };

    } catch (error) {
      return {
        totalTested: 0,
        visibleFocusCount: 0,
        invisibleFocusCount: 0,
        visibilityPercentage: 0,
        results: [],
        score: 0
      };
    }
  }

  /**
   * 检测键盘陷阱
   */
  async detectKeyboardTraps(page) {
    return await page.evaluate(() => {
      // 简化的键盘陷阱检测
      const modals = document.querySelectorAll('[role="dialog"], .modal, .popup');
      const traps = [];

      modals.forEach(modal => {
        const isVisible = window.getComputedStyle(modal).display !== 'none';
        if (isVisible) {
          const focusableInModal = modal.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
          if (focusableInModal.length > 0) {
            traps.push({
              element: modal.tagName.toLowerCase(),
              id: modal.id || null,
              className: modal.className || null,
              focusableElements: focusableInModal.length
            });
          }
        }
      });

      return {
        totalTraps: traps.length,
        traps,
        hasTraps: traps.length > 0,
        score: traps.length === 0 ? 100 : Math.max(0, 100 - traps.length * 20)
      };
    });
  }

  /**
   * 分析跳转链接
   */
  async analyzeSkipLinks(page) {
    return await page.evaluate(() => {
      const skipLinks = [];
      const links = document.querySelectorAll('a[href^="#"]');

      links.forEach(link => {
        const text = link.textContent.trim().toLowerCase();
        const isSkipLink = text.includes('skip') || text.includes('跳转') ||
          text.includes('main') || text.includes('content') ||
          text.includes('导航') || text.includes('菜单');

        if (isSkipLink) {
          const href = link.getAttribute('href');
          const target = document.querySelector(href);

          skipLinks.push({
            text: link.textContent.trim(),
            href,
            hasTarget: !!target,
            isVisible: window.getComputedStyle(link).display !== 'none'
          });
        }
      });

      return {
        totalSkipLinks: skipLinks.length,
        validSkipLinks: skipLinks.filter(link => link.hasTarget).length,
        visibleSkipLinks: skipLinks.filter(link => link.isVisible).length,
        skipLinks,
        score: skipLinks.length > 0 ? Math.min(100, skipLinks.length * 25) : 0
      };
    });
  }

  /**
   * 分析访问键
   */
  async analyzeAccessKeys(page) {
    return await page.evaluate(() => {
      const elementsWithAccessKey = document.querySelectorAll('[accesskey]');
      const accessKeys = [];
      const keyMap = {};

      elementsWithAccessKey.forEach(el => {
        const accessKey = el.getAttribute('accesskey');
        const elementInfo = {
          tagName: el.tagName.toLowerCase(),
          accessKey,
          id: el.id || null,
          text: el.textContent ? el.textContent.trim().substring(0, 50) : null
        };

        accessKeys.push(elementInfo);

        if (keyMap[accessKey]) {
          keyMap[accessKey].push(elementInfo);
        } else {
          keyMap[accessKey] = [elementInfo];
        }
      });

      const duplicates = Object.entries(keyMap)
        .filter(([key, elements]) => elements.length > 1)
        .map(([key, elements]) => ({ accessKey: key, elements }));

      return {
        totalAccessKeys: accessKeys.length,
        uniqueAccessKeys: Object.keys(keyMap).length,
        duplicateKeys: duplicates,
        accessKeys,
        score: duplicates.length === 0 ? 100 : Math.max(0, 100 - duplicates.length * 20)
      };
    });
  }

  /**
   * 分析模态框焦点管理
   */
  async analyzeModalFocusManagement(page) {
    return await page.evaluate(() => {
      const modals = document.querySelectorAll('[role="dialog"], .modal, .popup');
      const modalAnalysis = [];

      modals.forEach(modal => {
        const isVisible = window.getComputedStyle(modal).display !== 'none';
        if (isVisible) {
          const focusableElements = modal.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
          const hasCloseButton = modal.querySelector('button[aria-label*="close"], button[aria-label*="关闭"], .close, [data-dismiss]');

          modalAnalysis.push({
            id: modal.id || null,
            className: modal.className || null,
            focusableElements: focusableElements.length,
            hasCloseButton: !!hasCloseButton,
            hasAriaLabel: modal.hasAttribute('aria-label') || modal.hasAttribute('aria-labelledby')
          });
        }
      });

      return {
        totalModals: modalAnalysis.length,
        modalsWithProperFocus: modalAnalysis.filter(m => m.focusableElements > 0 && m.hasCloseButton).length,
        modalAnalysis,
        score: modalAnalysis.length === 0 ? 100 :
          Math.round((modalAnalysis.filter(m => m.focusableElements > 0 && m.hasCloseButton).length / modalAnalysis.length) * 100)
      };
    });
  }

  /**
   * 分析自定义键盘处理器
   */
  async analyzeCustomKeyboardHandlers(page) {
    return await page.evaluate(() => {
      const elementsWithKeyHandlers = document.querySelectorAll('[onkeydown], [onkeyup], [onkeypress]');
      const customHandlers = [];

      elementsWithKeyHandlers.forEach(el => {
        customHandlers.push({
          tagName: el.tagName.toLowerCase(),
          id: el.id || null,
          className: el.className || null,
          hasKeydown: el.hasAttribute('onkeydown'),
          hasKeyup: el.hasAttribute('onkeyup'),
          hasKeypress: el.hasAttribute('onkeypress')
        });
      });

      return {
        totalCustomHandlers: customHandlers.length,
        customHandlers,
        score: 100 // 自定义处理器本身不是问题，需要进一步测试
      };
    });
  }

  // 辅助方法
  isSameElement(el1, el2) {
    return el1.tagName === el2.tagName &&
      el1.id === el2.id &&
      el1.className === el2.className;
  }

  checkLogicalTabOrder(tabOrder) {
    // 简化的逻辑顺序检查
    for (let i = 1; i < tabOrder.length; i++) {
      const prev = tabOrder[i - 1];
      const curr = tabOrder[i];

      // 检查Y坐标是否大致按顺序
      if (curr.position.y < prev.position.y - 50) {
        return false;
      }
    }
    return true;
  }

  identifyTabOrderIssues(tabOrder) {
    const issues = [];

    if (tabOrder.length === 0) {
      issues.push('没有可聚焦的元素');
    }

    if (!this.checkLogicalTabOrder(tabOrder)) {
      issues.push('Tab顺序不符合逻辑');
    }

    return issues;
  }

  checkFocusVisibility(styles) {
    if (!styles) return false;

    // 检查是否有可见的焦点指示器
    const hasOutline = styles.outline && styles.outline !== 'none' && styles.outlineWidth !== '0px';
    const hasBoxShadow = styles.boxShadow && styles.boxShadow !== 'none';
    const hasBorder = styles.border && styles.border !== 'none';

    return hasOutline || hasBoxShadow || hasBorder;
  }

  calculateOverallScore(analysis) {
    const scores = [];

    if (analysis.focusVisibility) scores.push(analysis.focusVisibility.score);
    if (analysis.keyboardTraps) scores.push(analysis.keyboardTraps.score);
    if (analysis.skipLinks) scores.push(analysis.skipLinks.score);
    if (analysis.accessKeys) scores.push(analysis.accessKeys.score);
    if (analysis.modalFocusManagement) scores.push(analysis.modalFocusManagement.score);

    return scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  }

  identifyIssues(analysis) {
    const issues = [];

    if (analysis.focusVisibility && analysis.focusVisibility.invisibleFocusCount > 0) {
      issues.push({
        type: 'invisible_focus',
        severity: 'high',
        count: analysis.focusVisibility.invisibleFocusCount,
        message: `${analysis.focusVisibility.invisibleFocusCount}个元素的焦点不可见`
      });
    }

    if (analysis.keyboardTraps && analysis.keyboardTraps.hasTraps) {
      issues.push({
        type: 'keyboard_trap',
        severity: 'high',
        count: analysis.keyboardTraps.totalTraps,
        message: '检测到键盘陷阱'
      });
    }

    if (analysis.skipLinks && analysis.skipLinks.totalSkipLinks === 0) {
      issues.push({
        type: 'no_skip_links',
        severity: 'medium',
        message: '缺少跳转链接'
      });
    }

    if (analysis.accessKeys && analysis.accessKeys.duplicateKeys.length > 0) {
      issues.push({
        type: 'duplicate_access_keys',
        severity: 'medium',
        count: analysis.accessKeys.duplicateKeys.length,
        message: '访问键重复'
      });
    }

    return issues;
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.focusVisibility && analysis.focusVisibility.invisibleFocusCount > 0) {
      recommendations.push({
        priority: 'high',
        category: 'focus_visibility',
        title: '改善焦点可见性',
        description: '确保所有可聚焦元素都有清晰的焦点指示器',
        solution: '添加CSS焦点样式，使用outline或box-shadow',
        codeExample: `
/* 为所有可聚焦元素添加焦点样式 */
button:focus, a:focus, input:focus, select:focus, textarea:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* 或使用box-shadow */
.btn:focus {
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.5);
  outline: none;
}`
      });
    }

    if (analysis.skipLinks && analysis.skipLinks.totalSkipLinks === 0) {
      recommendations.push({
        priority: 'medium',
        category: 'skip_links',
        title: '添加跳转链接',
        description: '为键盘用户提供快速导航选项',
        solution: '在页面顶部添加跳转到主要内容的链接',
        codeExample: `
<!-- 跳转链接 -->
<a href="#main-content" class="skip-link">跳转到主要内容</a>

<style>
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
  z-index: 1000;
}

.skip-link:focus {
  top: 6px;
}
</style>`
      });
    }

    if (analysis.keyboardTraps && analysis.keyboardTraps.hasTraps) {
      recommendations.push({
        priority: 'high',
        category: 'keyboard_traps',
        title: '修复键盘陷阱',
        description: '确保用户可以使用键盘退出模态框',
        solution: '实现正确的焦点管理和Escape键处理',
        codeExample: `
// 模态框焦点管理
function openModal(modal) {
  // 保存当前焦点
  const previousFocus = document.activeElement;

  // 显示模态框
  modal.style.display = 'block';

  // 聚焦到模态框的第一个可聚焦元素
  const firstFocusable = modal.querySelector('button, input, select, textarea, a[href]');
  if (firstFocusable) firstFocusable.focus();

  // 监听Escape键
  modal.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeModal(modal, previousFocus);
    }
  });
}

function closeModal(modal, previousFocus) {
  modal.style.display = 'none';
  if (previousFocus) previousFocus.focus();
}`
      });
    }

    return recommendations;
  }
}

module.exports = KeyboardNavigationAnalyzer;
