/**
 * CSS和JavaScript兼容性检测器
 * 本地化程度：90%
 * 实现CSS和JavaScript兼容性检测：新特性支持情况、Polyfill需求、性能影响等
 */

const puppeteer = require('puppeteer');

class CSSJavaScriptCompatibilityAnalyzer {
  constructor() {
    // CSS特性兼容性数据库（简化版Can I Use数据）
    this.cssFeatures = {
      'flexbox': {
        name: 'Flexbox',
        description: 'CSS Flexible Box Layout',
        support: {
          chrome: { min: 29, partial: 21 },
          firefox: { min: 28, partial: 18 },
          safari: { min: 9, partial: 6.1 },
          edge: { min: 12 },
          ie: { min: 11, partial: 10 }
        },
        polyfill: 'flexibility.js',
        fallback: 'float-based layout'
      },
      'grid': {
        name: 'CSS Grid Layout',
        description: 'CSS Grid Layout Module',
        support: {
          chrome: { min: 57 },
          firefox: { min: 52 },
          safari: { min: 10.1 },
          edge: { min: 16 },
          ie: { min: null }
        },
        polyfill: 'css-grid-polyfill',
        fallback: 'flexbox or float layout'
      },
      'custom-properties': {
        name: 'CSS Custom Properties',
        description: 'CSS Variables',
        support: {
          chrome: { min: 49 },
          firefox: { min: 31 },
          safari: { min: 9.1 },
          edge: { min: 15 },
          ie: { min: null }
        },
        polyfill: 'css-vars-ponyfill',
        fallback: 'static values'
      },
      'transforms': {
        name: 'CSS Transforms',
        description: '2D/3D Transforms',
        support: {
          chrome: { min: 36 },
          firefox: { min: 16 },
          safari: { min: 9 },
          edge: { min: 12 },
          ie: { min: 9 }
        },
        polyfill: null,
        fallback: 'position-based animations'
      },
      'animations': {
        name: 'CSS Animations',
        description: 'CSS3 Animations',
        support: {
          chrome: { min: 43 },
          firefox: { min: 16 },
          safari: { min: 9 },
          edge: { min: 12 },
          ie: { min: 10 }
        },
        polyfill: 'animate.css',
        fallback: 'JavaScript animations'
      }
    };

    // JavaScript特性兼容性数据库
    this.jsFeatures = {
      'arrow-functions': {
        name: 'Arrow Functions',
        description: 'ES6 Arrow Functions',
        support: {
          chrome: { min: 45 },
          firefox: { min: 22 },
          safari: { min: 10 },
          edge: { min: 12 },
          ie: { min: null }
        },
        polyfill: 'babel-polyfill',
        fallback: 'function expressions'
      },
      'promises': {
        name: 'Promises',
        description: 'ES6 Promises',
        support: {
          chrome: { min: 32 },
          firefox: { min: 29 },
          safari: { min: 8 },
          edge: { min: 12 },
          ie: { min: null }
        },
        polyfill: 'es6-promise',
        fallback: 'callback patterns'
      },
      'fetch': {
        name: 'Fetch API',
        description: 'Modern HTTP API',
        support: {
          chrome: { min: 42 },
          firefox: { min: 39 },
          safari: { min: 10.1 },
          edge: { min: 14 },
          ie: { min: null }
        },
        polyfill: 'whatwg-fetch',
        fallback: 'XMLHttpRequest'
      },
      'async-await': {
        name: 'Async/Await',
        description: 'ES2017 Async Functions',
        support: {
          chrome: { min: 55 },
          firefox: { min: 52 },
          safari: { min: 10.1 },
          edge: { min: 15 },
          ie: { min: null }
        },
        polyfill: 'babel-polyfill',
        fallback: 'Promise chains'
      },
      'modules': {
        name: 'ES6 Modules',
        description: 'Native JavaScript Modules',
        support: {
          chrome: { min: 61 },
          firefox: { min: 60 },
          safari: { min: 10.1 },
          edge: { min: 16 },
          ie: { min: null }
        },
        polyfill: 'systemjs',
        fallback: 'bundlers (webpack, rollup)'
      }
    };

    this.browser = null;
  }

  /**
   * 分析CSS和JavaScript兼容性
   */
  async analyzeCompatibility(url, options = {}) {
    console.log('🔍 开始CSS和JavaScript兼容性分析...');

    const analysis = {
      url,
      timestamp: new Date().toISOString(),
      cssCompatibility: null,
      jsCompatibility: null,
      polyfillRecommendations: [],
      fallbackSuggestions: [],
      performanceImpact: null,
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

      // 分析CSS兼容性
      analysis.cssCompatibility = await this.analyzeCSSCompatibility(page);

      // 分析JavaScript兼容性
      analysis.jsCompatibility = await this.analyzeJavaScriptCompatibility(page);

      // 生成Polyfill建议
      analysis.polyfillRecommendations = this.generatePolyfillRecommendations(analysis);

      // 生成回退建议
      analysis.fallbackSuggestions = this.generateFallbackSuggestions(analysis);

      // 分析性能影响
      analysis.performanceImpact = this.analyzePerformanceImpact(analysis);

      // 计算总体评分
      analysis.overallScore = this.calculateOverallScore(analysis);

      // 识别问题
      analysis.issues = this.identifyCompatibilityIssues(analysis);

      // 生成建议
      analysis.recommendations = this.generateCompatibilityRecommendations(analysis);

      console.log(`✅ 兼容性分析完成 - 总体评分: ${analysis.overallScore}`);

      return analysis;

    } catch (error) {
      console.error('兼容性分析失败:', error);
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  /**
   * 分析CSS兼容性
   */
  async analyzeCSSCompatibility(page) {
    return await page.evaluate((cssFeatures) => {
      const usedFeatures = [];
      const compatibilityIssues = [];

      // 获取所有样式表
      const stylesheets = Array.from(document.styleSheets);

      stylesheets.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules || []);

          rules.forEach(rule => {
            if (rule.type === CSSRule.STYLE_RULE) {
              const cssText = rule.cssText.toLowerCase();

              // 检测CSS特性使用
              Object.entries(cssFeatures).forEach(([featureKey, feature]) => {
                let isUsed = false;

                switch (featureKey) {
                  case 'flexbox':
                    isUsed = cssText.includes('display: flex') ||
                      cssText.includes('display: inline-flex') ||
                      cssText.includes('flex-direction') ||
                      cssText.includes('justify-content');
                    break;
                  case 'grid':
                    isUsed = cssText.includes('display: grid') ||
                      cssText.includes('display: inline-grid') ||
                      cssText.includes('grid-template') ||
                      cssText.includes('grid-area');
                    break;
                  case 'custom-properties':
                    isUsed = cssText.includes('var(--') || cssText.includes('--');
                    break;
                  case 'transforms':
                    isUsed = cssText.includes('transform:') ||
                      cssText.includes('transform3d') ||
                      cssText.includes('translate') ||
                      cssText.includes('rotate') ||
                      cssText.includes('scale');
                    break;
                  case 'animations':
                    isUsed = cssText.includes('animation:') ||
                      cssText.includes('@keyframes') ||
                      cssText.includes('animation-name');
                    break;
                }

                if (isUsed && !usedFeatures.find(f => f.feature === featureKey)) {
                  usedFeatures.push({
                    feature: featureKey,
                    name: feature.name,
                    description: feature.description,
                    support: feature.support,
                    polyfill: feature.polyfill,
                    fallback: feature.fallback,
                    usage: cssText.substring(0, 100) + '...'
                  });
                }
              });
            }
          });
        } catch (e) {
          // 跨域样式表无法访问
        }
      });

      // 检测内联样式
      const elementsWithStyle = document.querySelectorAll('[style]');
      elementsWithStyle.forEach(el => {
        const style = el.style.cssText.toLowerCase();

        Object.entries(cssFeatures).forEach(([featureKey, feature]) => {
          let isUsed = false;

          switch (featureKey) {
            case 'transforms':
              isUsed = style.includes('transform');
              break;
            case 'animations':
              isUsed = style.includes('animation');
              break;
          }

          if (isUsed && !usedFeatures.find(f => f.feature === featureKey)) {
            usedFeatures.push({
              feature: featureKey,
              name: feature.name,
              description: feature.description,
              support: feature.support,
              polyfill: feature.polyfill,
              fallback: feature.fallback,
              usage: 'inline style'
            });
          }
        });
      });

      return {
        usedFeatures,
        totalFeatures: usedFeatures.length,
        compatibilityIssues,
        modernFeatures: usedFeatures.filter(f =>
          !f.support.ie || f.support.ie.min === null
        ).length
      };
    }, this.cssFeatures);
  }

  /**
   * 分析JavaScript兼容性
   */
  async analyzeJavaScriptCompatibility(page) {
    return await page.evaluate((jsFeatures) => {
      const usedFeatures = [];
      const compatibilityIssues = [];

      // 获取所有脚本内容
      const scripts = Array.from(document.scripts);
      let allScriptContent = '';

      scripts.forEach(script => {
        if (script.src) {
          
        // 外部脚本，无法直接分析内容
          return;
      }
        allScriptContent += script.textContent + '/n';
      });

      // 检测JavaScript特性使用
      Object.entries(jsFeatures).forEach(([featureKey, feature]) => {
        let isUsed = false;
        let usage = '';

        switch (featureKey) {
          case 'arrow-functions':
            isUsed = /=>/s*{/.test(allScriptContent) || /=>/s*[^{]/.test(allScriptContent);
            usage = 'Arrow function syntax detected';
            break;
          case 'promises':
            isUsed = /new Promise/s*/(/.test(allScriptContent) ||
              //.then/s*/(/.test(allScriptContent) ||
              //.catch/s*/(/.test(allScriptContent);
            usage = 'Promise API usage detected';
            break;
          case 'fetch':
            isUsed = /fetch/s*/(/.test(allScriptContent);
            usage = 'Fetch API usage detected';
            break;
          case 'async-await':
            isUsed = /async/s+function/.test(allScriptContent) ||
              /await/s+/.test(allScriptContent);
            usage = 'Async/await syntax detected';
            break;
          case 'modules':
            isUsed = /import/s+/.test(allScriptContent) ||
              /export/s+/.test(allScriptContent) ||
              document.querySelector('script[type="module"]');
            usage = 'ES6 modules detected';
            break;
        }

        if (isUsed) {
          usedFeatures.push({
            feature: featureKey,
            name: feature.name,
            description: feature.description,
            support: feature.support,
            polyfill: feature.polyfill,
            fallback: feature.fallback,
            usage
          });
        }
      });

      // 检测运行时特性
      const runtimeFeatures = [];

      // 检测Promise支持
      if (typeof Promise !== 'undefined') {
        runtimeFeatures.push('promises-runtime');
      }

      // 检测Fetch支持
      if (typeof fetch !== 'undefined') {
        runtimeFeatures.push('fetch-runtime');
      }

      // 检测ES6特性
      try {
        eval('() => {}'); // Arrow function test
        runtimeFeatures.push('arrow-functions-runtime');
      } catch (e) {
        // Arrow functions not supported
      }

      return {
        usedFeatures,
        totalFeatures: usedFeatures.length,
        runtimeFeatures,
        compatibilityIssues,
        modernFeatures: usedFeatures.filter(f =>
          !f.support.ie || f.support.ie.min === null
        ).length
      };
    }, this.jsFeatures);
  }

  /**
   * 生成Polyfill建议
   */
  generatePolyfillRecommendations(analysis) {
    const recommendations = [];
    const allFeatures = [
      ...(analysis.cssCompatibility?.usedFeatures || []),
      ...(analysis.jsCompatibility?.usedFeatures || [])
    ];

    allFeatures.forEach(feature => {
      if (feature.polyfill && this.needsPolyfill(feature)) {
        recommendations.push({
          feature: feature.name,
          polyfill: feature.polyfill,
          reason: `${feature.name} 在旧版浏览器中不支持`,
          installation: this.getPolyfillInstallation(feature.polyfill),
          usage: this.getPolyfillUsage(feature.polyfill),
          priority: this.getPolyfillPriority(feature)
        });
      }
    });

    return recommendations;
  }

  /**
   * 生成回退建议
   */
  generateFallbackSuggestions(analysis) {
    const suggestions = [];
    const allFeatures = [
      ...(analysis.cssCompatibility?.usedFeatures || []),
      ...(analysis.jsCompatibility?.usedFeatures || [])
    ];

    allFeatures.forEach(feature => {
      if (feature.fallback && this.needsFallback(feature)) {
        suggestions.push({
          feature: feature.name,
          fallback: feature.fallback,
          reason: `为不支持 ${feature.name} 的浏览器提供回退方案`,
          implementation: this.getFallbackImplementation(feature),
          priority: this.getFallbackPriority(feature)
        });
      }
    });

    return suggestions;
  }

  /**
   * 分析性能影响
   */
  analyzePerformanceImpact(analysis) {
    const impact = {
      polyfillOverhead: 0,
      bundleSize: 0,
      runtimePerformance: 'good',
      recommendations: []
    };

    // 计算Polyfill开销
    analysis.polyfillRecommendations.forEach(rec => {
      impact.polyfillOverhead += this.getPolyfillSize(rec.polyfill);
    });

    // 评估运行时性能
    const modernFeatureCount =
      (analysis.cssCompatibility?.modernFeatures || 0) +
      (analysis.jsCompatibility?.modernFeatures || 0);

    if (modernFeatureCount > 5) {
      impact.runtimePerformance = 'excellent';
    } else if (modernFeatureCount > 2) {
      impact.runtimePerformance = 'good';
    } else {
      impact.runtimePerformance = 'fair';
    }

    // 生成性能建议
    if (impact.polyfillOverhead > 50000) { // 50KB
      impact.recommendations.push('考虑减少Polyfill使用，优化包大小');
    }

    if (modernFeatureCount === 0) {
      impact.recommendations.push('考虑使用现代CSS和JavaScript特性提升性能');
    }

    return impact;
  }

  /**
   * 计算总体评分
   */
  calculateOverallScore(analysis) {
    let score = 100;

    // CSS兼容性评分
    const cssModernFeatures = analysis.cssCompatibility?.modernFeatures || 0;
    const cssTotalFeatures = analysis.cssCompatibility?.totalFeatures || 1;
    const cssModernRatio = cssModernFeatures / cssTotalFeatures;

    // JavaScript兼容性评分
    const jsModernFeatures = analysis.jsCompatibility?.modernFeatures || 0;
    const jsTotalFeatures = analysis.jsCompatibility?.totalFeatures || 1;
    const jsModernRatio = jsModernFeatures / jsTotalFeatures;

    // 现代特性使用率加分
    score += (cssModernRatio + jsModernRatio) * 25;

    // Polyfill需求扣分
    const polyfillCount = analysis.polyfillRecommendations.length;
    score -= polyfillCount * 5;

    // 性能影响调整
    const performanceImpact = analysis.performanceImpact?.runtimePerformance;
    if (performanceImpact === 'excellent') score += 10;
    else if (performanceImpact === 'fair') score -= 10;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * 识别兼容性问题
   */
  identifyCompatibilityIssues(analysis) {
    const issues = [];

    // CSS兼容性问题
    if (analysis.cssCompatibility?.usedFeatures) {
      analysis.cssCompatibility.usedFeatures.forEach(feature => {
        if (!feature.support.ie || feature.support.ie.min === null) {
          issues.push({
            type: 'css_compatibility',
            severity: 'medium',
            feature: feature.name,
            message: `${feature.name} 在IE浏览器中不支持`,
            browsers: ['Internet Explorer'],
            solution: feature.polyfill ? `使用 ${feature.polyfill}` : `使用回退方案: ${feature.fallback}`
          });
        }
      });
    }

    // JavaScript兼容性问题
    if (analysis.jsCompatibility?.usedFeatures) {
      analysis.jsCompatibility.usedFeatures.forEach(feature => {
        if (!feature.support.ie || feature.support.ie.min === null) {
          issues.push({
            type: 'js_compatibility',
            severity: 'high',
            feature: feature.name,
            message: `${feature.name} 在IE浏览器中不支持`,
            browsers: ['Internet Explorer'],
            solution: feature.polyfill ? `使用 ${feature.polyfill}` : `使用回退方案: ${feature.fallback}`
          });
        }
      });
    }

    // 性能问题
    if (analysis.performanceImpact?.polyfillOverhead > 100000) { // 100KB
      issues.push({
        type: 'performance',
        severity: 'medium',
        feature: 'polyfills',
        message: 'Polyfill文件过大，可能影响加载性能',
        solution: '考虑按需加载或使用更轻量的替代方案'
      });
    }

    return issues;
  }

  /**
   * 生成兼容性建议
   */
  generateCompatibilityRecommendations(analysis) {
    const recommendations = [];

    // 基于现代特性使用情况的建议
    const totalModernFeatures =
      (analysis.cssCompatibility?.modernFeatures || 0) +
      (analysis.jsCompatibility?.modernFeatures || 0);

    if (totalModernFeatures === 0) {
      recommendations.push({
        category: 'modernization',
        priority: 'medium',
        title: '采用现代CSS和JavaScript特性',
        description: '当前代码较为保守，建议采用现代特性提升开发效率和性能',
        suggestions: [
          '使用CSS Flexbox或Grid布局',
          '采用ES6+语法特性',
          '使用现代API如Fetch',
          '实施渐进式增强策略'
        ],
        codeExample: `
/* 现代CSS示例 */
.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

// 现代JavaScript示例
const fetchData = async (url) => {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
};`
      });
    }

    // 基于Polyfill需求的建议
    if (analysis.polyfillRecommendations.length > 3) {
      recommendations.push({
        category: 'polyfills',
        priority: 'high',
        title: '优化Polyfill策略',
        description: '当前需要多个Polyfill，建议优化加载策略',
        suggestions: [
          '使用polyfill.io按需加载',
          '考虑使用Babel进行代码转换',
          '实施特性检测和条件加载',
          '评估目标浏览器支持范围'
        ],
        codeExample: `
<!-- 条件加载Polyfill -->
<script>
if (!window.Promise) {
  document.write('<script src="https://polyfill.io/v3/polyfill.min.js?features=Promise"><//script>');
}
</script>

<!-- 或使用polyfill.io -->
<script src="https://polyfill.io/v3/polyfill.min.js?features=default,fetch,Promise"></script>`
      });
    }

    // 基于性能影响的建议
    if (analysis.performanceImpact?.polyfillOverhead > 50000) {
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        title: '减少Polyfill体积',
        description: 'Polyfill文件较大，建议优化以提升加载性能',
        suggestions: [
          '只加载必需的Polyfill',
          '使用Tree Shaking移除未使用代码',
          '考虑使用CDN加速',
          '实施代码分割和懒加载'
        ]
      });
    }

    // 基于兼容性问题的建议
    const ieIssues = analysis.issues.filter(issue =>
      issue.browsers && issue.browsers.includes('Internet Explorer')
    );

    if (ieIssues.length > 0) {
      recommendations.push({
        category: 'browser_support',
        priority: 'high',
        title: 'IE浏览器兼容性',
        description: `检测到${ieIssues.length}个IE兼容性问题`,
        suggestions: [
          '为IE用户提供降级体验',
          '使用适当的Polyfill',
          '实施渐进式增强',
          '考虑放弃IE支持'
        ],
        codeExample: `
/* CSS回退示例 */
.container {
  /* IE回退 */
  display: block;
  /* 现代浏览器 */
  display: grid;
}

// JavaScript特性检测
if ('fetch' in window) {
  // 使用Fetch API
  fetch('/api/data');
} else {
  // 使用XMLHttpRequest回退
  let xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/data');
  xhr.send();
}`
      });
    }

    return recommendations;
  }

  // 辅助方法
  needsPolyfill(feature) {
    // 简化判断：如果IE不支持，则需要polyfill
    return !feature.support.ie || feature.support.ie.min === null;
  }

  needsFallback(feature) {
    // 简化判断：如果有旧浏览器不支持，则需要回退
    return this.needsPolyfill(feature);
  }

  getPolyfillInstallation(polyfillName) {
    const installations = {
      'flexibility.js': 'npm install flexibility',
      'css-grid-polyfill': 'npm install css-grid-polyfill',
      'css-vars-ponyfill': 'npm install css-vars-ponyfill',
      'babel-polyfill': 'npm install @babel/polyfill',
      'es6-promise': 'npm install es6-promise',
      'whatwg-fetch': 'npm install whatwg-fetch',
      'systemjs': 'npm install systemjs'
    };

    return installations[polyfillName] || `npm install ${polyfillName}`;
  }

  getPolyfillUsage(polyfillName) {
    const usages = {
      'flexibility.js': 'import "flexibility"; // 在入口文件中导入',
      'css-vars-ponyfill': 'import cssVars from "css-vars-ponyfill"; cssVars();',
      'es6-promise': 'import "es6-promise/auto";',
      'whatwg-fetch': 'import "whatwg-fetch";',
      'babel-polyfill': 'import "@babel/polyfill";'
    };

    return usages[polyfillName] || `import "${polyfillName}";`;
  }

  getPolyfillPriority(feature) {
    // 基于特性重要性确定优先级
    const highPriorityFeatures = ['promises', 'fetch', 'flexbox'];
    return highPriorityFeatures.includes(feature.feature) ? 'high' : 'medium';
  }

  getFallbackImplementation(feature) {
    const implementations = {
      'flexbox': 'float-based layout with clearfix',
      'grid': 'flexbox or float-based layout',
      'custom-properties': 'Sass/Less variables',
      'promises': 'callback patterns or libraries like Q.js',
      'fetch': 'XMLHttpRequest or axios library',
      'async-await': 'Promise chains with .then()',
      'modules': 'CommonJS with bundlers'
    };

    return implementations[feature.feature] || feature.fallback;
  }

  getFallbackPriority(feature) {
    // JavaScript特性通常比CSS特性更重要
    const jsFeatures = ['promises', 'fetch', 'async-await', 'modules'];
    return jsFeatures.includes(feature.feature) ? 'high' : 'medium';
  }

  getPolyfillSize(polyfillName) {
    // 估算的Polyfill大小（字节）
    const sizes = {
      'flexibility.js': 15000,
      'css-grid-polyfill': 25000,
      'css-vars-ponyfill': 12000,
      'babel-polyfill': 85000,
      'es6-promise': 8000,
      'whatwg-fetch': 5000,
      'systemjs': 45000
    };

    return sizes[polyfillName] || 10000;
  }
}

module.exports = CSSJavaScriptCompatibilityAnalyzer;
