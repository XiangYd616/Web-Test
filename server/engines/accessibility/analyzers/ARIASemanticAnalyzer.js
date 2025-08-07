/**
 * ARIA和语义化分析器
 * 本地化程度：100%
 * 检测ARIA标签使用和HTML语义化结构
 */

class ARIASemanticAnalyzer {
  constructor() {
    // ARIA角色定义
    this.ariaRoles = {
      landmark: ['banner', 'main', 'navigation', 'contentinfo', 'complementary', 'search', 'form'],
      widget: ['button', 'checkbox', 'radio', 'slider', 'textbox', 'combobox', 'listbox', 'tab', 'tabpanel'],
      structure: ['article', 'section', 'list', 'listitem', 'table', 'row', 'cell', 'heading'],
      live: ['alert', 'log', 'status', 'timer', 'marquee']
    };
    
    // 必需的ARIA属性
    this.requiredAriaAttributes = {
      'button': [],
      'checkbox': ['aria-checked'],
      'radio': ['aria-checked'],
      'slider': ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
      'textbox': [],
      'combobox': ['aria-expanded'],
      'listbox': [],
      'tab': ['aria-selected'],
      'tabpanel': ['aria-labelledby'],
      'dialog': ['aria-labelledby', 'aria-describedby']
    };
    
    // 语义化HTML元素
    this.semanticElements = [
      'header', 'nav', 'main', 'article', 'section', 'aside', 'footer',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'figure', 'figcaption', 'time', 'mark', 'details', 'summary'
    ];
  }

  /**
   * 分析ARIA和语义化
   */
  async analyze(page) {
    try {
      console.log('🏷️ 开始ARIA和语义化分析...');
      
      // 注入分析函数
      await this.injectAnalysisFunctions(page);
      
      const results = await page.evaluate(() => {
        const analyzer = window.ariaSemanticAnalyzer;
        
        return {
          ariaUsage: analyzer.analyzeARIAUsage(),
          landmarks: analyzer.analyzeLandmarks(),
          headingStructure: analyzer.analyzeHeadingStructure(),
          semanticElements: analyzer.analyzeSemanticElements(),
          formLabels: analyzer.analyzeFormLabels(),
          images: analyzer.analyzeImages(),
          tables: analyzer.analyzeTables(),
          liveRegions: analyzer.analyzeLiveRegions()
        };
      });
      
      // 分析结果
      const analysis = this.analyzeResults(results);
      
      console.log(`✅ ARIA和语义化分析完成`);
      
      return {
        ...results,
        analysis,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ ARIA和语义化分析失败:', error);
      throw error;
    }
  }

  /**
   * 注入分析函数
   */
  async injectAnalysisFunctions(page) {
    await page.evaluate(() => {
      window.ariaSemanticAnalyzer = {
        
        // 分析ARIA使用情况
        analyzeARIAUsage() {
          const elementsWithAria = document.querySelectorAll('[role], [aria-label], [aria-labelledby], [aria-describedby]');
          const ariaElements = [];
          const issues = [];
          
          elementsWithAria.forEach(element => {
            const role = element.getAttribute('role');
            const ariaLabel = element.getAttribute('aria-label');
            const ariaLabelledBy = element.getAttribute('aria-labelledby');
            const ariaDescribedBy = element.getAttribute('aria-describedby');
            
            const elementInfo = {
              element: this.getElementSelector(element),
              tagName: element.tagName.toLowerCase(),
              role,
              ariaLabel,
              ariaLabelledBy,
              ariaDescribedBy,
              position: this.getElementPosition(element),
              text: this.getElementText(element)
            };
            
            ariaElements.push(elementInfo);
            
            // 检查ARIA使用问题
            if (role) {
              const requiredAttrs = this.getRequiredAriaAttributes(role);
              requiredAttrs.forEach(attr => {
                if (!element.hasAttribute(attr)) {
                  issues.push({
                    type: 'missing_required_aria',
                    element: this.getElementSelector(element),
                    role,
                    missingAttribute: attr,
                    message: `角色 "${role}" 缺少必需的属性 "${attr}"`
                  });
                }
              });
            }
            
            // 检查aria-labelledby引用
            if (ariaLabelledBy) {
              const referencedElements = ariaLabelledBy.split(' ').map(id => document.getElementById(id));
              if (referencedElements.some(el => !el)) {
                issues.push({
                  type: 'invalid_aria_labelledby',
                  element: this.getElementSelector(element),
                  ariaLabelledBy,
                  message: 'aria-labelledby引用的元素不存在'
                });
              }
            }
            
            // 检查aria-describedby引用
            if (ariaDescribedBy) {
              const referencedElements = ariaDescribedBy.split(' ').map(id => document.getElementById(id));
              if (referencedElements.some(el => !el)) {
                issues.push({
                  type: 'invalid_aria_describedby',
                  element: this.getElementSelector(element),
                  ariaDescribedBy,
                  message: 'aria-describedby引用的元素不存在'
                });
              }
            }
          });
          
          return { elements: ariaElements, issues };
        },
        
        // 分析地标元素
        analyzeLandmarks() {
          const landmarks = [];
          const landmarkRoles = ['banner', 'main', 'navigation', 'contentinfo', 'complementary', 'search', 'form'];
          const semanticLandmarks = ['header', 'nav', 'main', 'aside', 'footer'];
          
          // 检查ARIA地标
          landmarkRoles.forEach(role => {
            const elements = document.querySelectorAll(`[role="${role}"]`);
            elements.forEach(element => {
              landmarks.push({
                type: 'aria',
                role,
                element: this.getElementSelector(element),
                hasLabel: element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby'),
                position: this.getElementPosition(element),
                text: this.getElementText(element)
              });
            });
          });
          
          // 检查语义化地标
          semanticLandmarks.forEach(tag => {
            const elements = document.querySelectorAll(tag);
            elements.forEach(element => {
              landmarks.push({
                type: 'semantic',
                role: this.getImplicitRole(tag),
                element: this.getElementSelector(element),
                hasLabel: element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby'),
                position: this.getElementPosition(element),
                text: this.getElementText(element)
              });
            });
          });
          
          return landmarks;
        },
        
        // 分析标题结构
        analyzeHeadingStructure() {
          const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
          const structure = [];
          const issues = [];
          
          let previousLevel = 0;
          
          headings.forEach((heading, index) => {
            let level;
            
            if (heading.hasAttribute('role') && heading.getAttribute('role') === 'heading') {
              level = parseInt(heading.getAttribute('aria-level')) || 1;
            } else {
              level = parseInt(heading.tagName.charAt(1));
            }
            
            const headingInfo = {
              element: this.getElementSelector(heading),
              level,
              text: this.getElementText(heading),
              position: this.getElementPosition(heading),
              isEmpty: this.getElementText(heading).trim() === ''
            };
            
            structure.push(headingInfo);
            
            // 检查标题层级跳跃
            if (index > 0 && level > previousLevel + 1) {
              issues.push({
                type: 'heading_level_skip',
                element: this.getElementSelector(heading),
                level,
                previousLevel,
                message: `标题层级从 h${previousLevel} 跳跃到 h${level}`
              });
            }
            
            // 检查空标题
            if (headingInfo.isEmpty) {
              issues.push({
                type: 'empty_heading',
                element: this.getElementSelector(heading),
                level,
                message: '标题内容为空'
              });
            }
            
            previousLevel = level;
          });
          
          // 检查是否有h1
          const hasH1 = structure.some(h => h.level === 1);
          if (!hasH1) {
            issues.push({
              type: 'missing_h1',
              message: '页面缺少h1标题'
            });
          }
          
          return { structure, issues };
        },
        
        // 分析语义化元素
        analyzeSemanticElements() {
          const semanticTags = ['header', 'nav', 'main', 'article', 'section', 'aside', 'footer', 'figure', 'figcaption'];
          const elements = [];
          const issues = [];
          
          semanticTags.forEach(tag => {
            const found = document.querySelectorAll(tag);
            found.forEach(element => {
              elements.push({
                tagName: tag,
                element: this.getElementSelector(element),
                hasLabel: element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby'),
                position: this.getElementPosition(element),
                text: this.getElementText(element)
              });
            });
          });
          
          // 检查main元素
          const mainElements = document.querySelectorAll('main');
          if (mainElements.length === 0) {
            issues.push({
              type: 'missing_main',
              message: '页面缺少main元素'
            });
          } else if (mainElements.length > 1) {
            issues.push({
              type: 'multiple_main',
              message: '页面有多个main元素',
              count: mainElements.length
            });
          }
          
          return { elements, issues };
        },
        
        // 分析表单标签
        analyzeFormLabels() {
          const formControls = document.querySelectorAll('input, select, textarea');
          const labels = [];
          const issues = [];
          
          formControls.forEach(control => {
            const id = control.id;
            const type = control.type;
            const name = control.name;
            
            // 跳过隐藏和提交按钮
            if (type === 'hidden' || type === 'submit' || type === 'button') {
              return;
            }
            
            let hasLabel = false;
            let labelText = '';
            let labelMethod = '';
            
            // 检查显式标签
            if (id) {
              const label = document.querySelector(`label[for="${id}"]`);
              if (label) {
                hasLabel = true;
                labelText = this.getElementText(label);
                labelMethod = 'explicit';
              }
            }
            
            // 检查包装标签
            if (!hasLabel) {
              const parentLabel = control.closest('label');
              if (parentLabel) {
                hasLabel = true;
                labelText = this.getElementText(parentLabel);
                labelMethod = 'implicit';
              }
            }
            
            // 检查ARIA标签
            if (!hasLabel) {
              if (control.hasAttribute('aria-label')) {
                hasLabel = true;
                labelText = control.getAttribute('aria-label');
                labelMethod = 'aria-label';
              } else if (control.hasAttribute('aria-labelledby')) {
                const labelledBy = control.getAttribute('aria-labelledby');
                const referencedElement = document.getElementById(labelledBy);
                if (referencedElement) {
                  hasLabel = true;
                  labelText = this.getElementText(referencedElement);
                  labelMethod = 'aria-labelledby';
                }
              }
            }
            
            labels.push({
              element: this.getElementSelector(control),
              type,
              name,
              hasLabel,
              labelText,
              labelMethod,
              position: this.getElementPosition(control)
            });
            
            if (!hasLabel) {
              issues.push({
                type: 'missing_form_label',
                element: this.getElementSelector(control),
                controlType: type,
                message: '表单控件缺少标签'
              });
            }
          });
          
          return { labels, issues };
        },
        
        // 分析图片
        analyzeImages() {
          const images = document.querySelectorAll('img');
          const results = [];
          const issues = [];
          
          images.forEach(img => {
            const alt = img.getAttribute('alt');
            const src = img.src;
            const isDecorative = alt === '';
            const hasAlt = img.hasAttribute('alt');
            
            results.push({
              element: this.getElementSelector(img),
              src,
              alt,
              hasAlt,
              isDecorative,
              position: this.getElementPosition(img)
            });
            
            if (!hasAlt) {
              issues.push({
                type: 'missing_alt_attribute',
                element: this.getElementSelector(img),
                src,
                message: '图片缺少alt属性'
              });
            }
          });
          
          return { images: results, issues };
        },
        
        // 分析表格
        analyzeTables() {
          const tables = document.querySelectorAll('table');
          const results = [];
          const issues = [];
          
          tables.forEach(table => {
            const caption = table.querySelector('caption');
            const headers = table.querySelectorAll('th');
            const hasScope = Array.from(headers).some(th => th.hasAttribute('scope'));
            
            results.push({
              element: this.getElementSelector(table),
              hasCaption: !!caption,
              captionText: caption ? this.getElementText(caption) : '',
              headerCount: headers.length,
              hasScope,
              position: this.getElementPosition(table)
            });
            
            if (!caption) {
              issues.push({
                type: 'missing_table_caption',
                element: this.getElementSelector(table),
                message: '表格缺少caption'
              });
            }
            
            if (headers.length === 0) {
              issues.push({
                type: 'missing_table_headers',
                element: this.getElementSelector(table),
                message: '表格缺少表头'
              });
            }
          });
          
          return { tables: results, issues };
        },
        
        // 分析实时区域
        analyzeLiveRegions() {
          const liveElements = document.querySelectorAll('[aria-live], [role="alert"], [role="status"], [role="log"]');
          const regions = [];
          
          liveElements.forEach(element => {
            const ariaLive = element.getAttribute('aria-live');
            const role = element.getAttribute('role');
            
            regions.push({
              element: this.getElementSelector(element),
              ariaLive,
              role,
              position: this.getElementPosition(element),
              text: this.getElementText(element)
            });
          });
          
          return regions;
        },
        
        // 获取必需的ARIA属性
        getRequiredAriaAttributes(role) {
          const required = {
            'checkbox': ['aria-checked'],
            'radio': ['aria-checked'],
            'slider': ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
            'combobox': ['aria-expanded'],
            'tab': ['aria-selected'],
            'tabpanel': ['aria-labelledby']
          };
          
          return required[role] || [];
        },
        
        // 获取隐式角色
        getImplicitRole(tagName) {
          const roles = {
            'header': 'banner',
            'nav': 'navigation',
            'main': 'main',
            'aside': 'complementary',
            'footer': 'contentinfo'
          };
          
          return roles[tagName] || tagName;
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
        ariaElements: results.ariaUsage.elements.length,
        ariaIssues: results.ariaUsage.issues.length,
        landmarks: results.landmarks.length,
        headingIssues: results.headingStructure.issues.length,
        semanticIssues: results.semanticElements.issues.length,
        formLabelIssues: results.formLabels.issues.length,
        imageIssues: results.images.issues.length,
        tableIssues: results.tables.issues.length
      },
      issues: [],
      recommendations: []
    };
    
    // 收集所有问题
    const allIssues = [
      ...results.ariaUsage.issues,
      ...results.headingStructure.issues,
      ...results.semanticElements.issues,
      ...results.formLabels.issues,
      ...results.images.issues,
      ...results.tables.issues
    ];
    
    allIssues.forEach(issue => {
      analysis.issues.push({
        type: issue.type,
        severity: this.getIssueSeverity(issue.type),
        element: issue.element,
        description: issue.message,
        details: issue
      });
    });
    
    // 生成建议
    analysis.recommendations = this.generateRecommendations(analysis);
    
    return analysis;
  }

  /**
   * 获取问题严重程度
   */
  getIssueSeverity(issueType) {
    const severityMap = {
      'missing_required_aria': 'high',
      'invalid_aria_labelledby': 'high',
      'invalid_aria_describedby': 'high',
      'missing_h1': 'high',
      'missing_main': 'high',
      'missing_form_label': 'high',
      'missing_alt_attribute': 'high',
      'heading_level_skip': 'medium',
      'empty_heading': 'medium',
      'multiple_main': 'medium',
      'missing_table_caption': 'medium',
      'missing_table_headers': 'medium'
    };
    
    return severityMap[issueType] || 'low';
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.summary.ariaIssues > 0) {
      recommendations.push({
        priority: 'high',
        category: 'aria',
        title: '修复ARIA使用问题',
        description: `发现 ${analysis.summary.ariaIssues} 个ARIA使用问题`,
        solution: '确保ARIA属性正确使用，引用的元素存在'
      });
    }
    
    if (analysis.summary.headingIssues > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'structure',
        title: '优化标题结构',
        description: `发现 ${analysis.summary.headingIssues} 个标题结构问题`,
        solution: '确保标题层级连续，避免跳级，每个页面有且仅有一个h1'
      });
    }
    
    if (analysis.summary.formLabelIssues > 0) {
      recommendations.push({
        priority: 'high',
        category: 'forms',
        title: '为表单控件添加标签',
        description: `${analysis.summary.formLabelIssues} 个表单控件缺少标签`,
        solution: '为所有表单控件添加适当的标签或ARIA标签'
      });
    }
    
    if (analysis.summary.imageIssues > 0) {
      recommendations.push({
        priority: 'high',
        category: 'images',
        title: '为图片添加替代文本',
        description: `${analysis.summary.imageIssues} 个图片缺少alt属性`,
        solution: '为所有图片添加描述性的alt属性，装饰性图片使用空alt=""'
      });
    }
    
    if (analysis.summary.landmarks === 0) {
      recommendations.push({
        priority: 'medium',
        category: 'structure',
        title: '添加地标元素',
        description: '页面缺少地标元素，不利于屏幕阅读器导航',
        solution: '使用语义化HTML元素（header、nav、main、aside、footer）或ARIA地标角色'
      });
    }
    
    return recommendations;
  }
}

module.exports = ARIASemanticAnalyzer;
