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
   * 分析键盘导航
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
}

module.exports = KeyboardNavigationAnalyzer;
