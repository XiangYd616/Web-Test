/**
 * CSS特性检测器
 * 本地化程度：100%
 * 检测CSS特性在不同浏览器中的支持情况
 */

class CSSFeatureDetector {
  constructor() {
    // CSS特性检测规则
    this.cssFeatures = {
      // Flexbox
      flexbox: {
        name: 'Flexbox',
        category: 'layout',
        properties: ['display: flex', 'flex-direction', 'justify-content', 'align-items'],
        testCode: `
          const testEl = document.createElement('div');
          testEl.style.display = 'flex';
          return testEl.style.display === 'flex';
        `
      },
      
      // Grid
      grid: {
        name: 'CSS Grid',
        category: 'layout',
        properties: ['display: grid', 'grid-template-columns', 'grid-gap'],
        testCode: `
          const testEl = document.createElement('div');
          testEl.style.display = 'grid';
          return testEl.style.display === 'grid';
        `
      },
      
      // CSS Variables
      customProperties: {
        name: 'CSS Custom Properties',
        category: 'variables',
        properties: ['--custom-property', 'var()'],
        testCode: `
          const testEl = document.createElement('div');
          testEl.style.setProperty('--test', 'value');
          return testEl.style.getPropertyValue('--test') === 'value';
        `
      },
      
      // Transforms
      transforms: {
        name: 'CSS Transforms',
        category: 'effects',
        properties: ['transform', 'transform-origin'],
        testCode: `
          const testEl = document.createElement('div');
          testEl.style.transform = 'rotate(45deg)';
          return testEl.style.transform.includes('rotate');
        `
      },
      
      // Transitions
      transitions: {
        name: 'CSS Transitions',
        category: 'animation',
        properties: ['transition', 'transition-duration', 'transition-property'],
        testCode: `
          const testEl = document.createElement('div');
          testEl.style.transition = 'all 0.3s ease';
          return testEl.style.transition.includes('0.3s');
        `
      },
      
      // Animations
      animations: {
        name: 'CSS Animations',
        category: 'animation',
        properties: ['animation', 'animation-name', '@keyframes'],
        testCode: `
          const testEl = document.createElement('div');
          testEl.style.animation = 'test 1s linear';
          return testEl.style.animation.includes('test');
        `
      },
      
      // Border Radius
      borderRadius: {
        name: 'Border Radius',
        category: 'styling',
        properties: ['border-radius'],
        testCode: `
          const testEl = document.createElement('div');
          testEl.style.borderRadius = '10px';
          return testEl.style.borderRadius === '10px';
        `
      },
      
      // Box Shadow
      boxShadow: {
        name: 'Box Shadow',
        category: 'effects',
        properties: ['box-shadow'],
        testCode: `
          const testEl = document.createElement('div');
          testEl.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
          return testEl.style.boxShadow.includes('rgba');
        `
      },
      
      // Gradients
      gradients: {
        name: 'CSS Gradients',
        category: 'styling',
        properties: ['linear-gradient', 'radial-gradient'],
        testCode: `
          const testEl = document.createElement('div');
          testEl.style.background = 'linear-gradient(to right, red, blue)';
          return testEl.style.background.includes('linear-gradient');
        `
      },
      
      // Media Queries
      mediaQueries: {
        name: 'Media Queries',
        category: 'responsive',
        properties: ['@media'],
        testCode: `
          return window.matchMedia && window.matchMedia('(min-width: 768px)').matches !== undefined;
        `
      },
      
      // Viewport Units
      viewportUnits: {
        name: 'Viewport Units',
        category: 'units',
        properties: ['vw', 'vh', 'vmin', 'vmax'],
        testCode: `
          const testEl = document.createElement('div');
          testEl.style.width = '50vw';
          return testEl.style.width === '50vw';
        `
      },
      
      // Calc Function
      calc: {
        name: 'Calc Function',
        category: 'functions',
        properties: ['calc()'],
        testCode: `
          const testEl = document.createElement('div');
          testEl.style.width = 'calc(100% - 20px)';
          return testEl.style.width.includes('calc');
        `
      },
      
      // Object Fit
      objectFit: {
        name: 'Object Fit',
        category: 'layout',
        properties: ['object-fit', 'object-position'],
        testCode: `
          const testEl = document.createElement('img');
          testEl.style.objectFit = 'cover';
          return testEl.style.objectFit === 'cover';
        `
      },
      
      // Sticky Position
      stickyPosition: {
        name: 'Sticky Position',
        category: 'layout',
        properties: ['position: sticky'],
        testCode: `
          const testEl = document.createElement('div');
          testEl.style.position = 'sticky';
          return testEl.style.position === 'sticky';
        `
      },
      
      // CSS Filters
      filters: {
        name: 'CSS Filters',
        category: 'effects',
        properties: ['filter', 'backdrop-filter'],
        testCode: `
          const testEl = document.createElement('div');
          testEl.style.filter = 'blur(5px)';
          return testEl.style.filter.includes('blur');
        `
      },
      
      // CSS Masks
      masks: {
        name: 'CSS Masks',
        category: 'effects',
        properties: ['mask', 'mask-image'],
        testCode: `
          const testEl = document.createElement('div');
          testEl.style.mask = 'url(mask.png)';
          return testEl.style.mask.includes('url') || testEl.style.webkitMask !== undefined;
        `
      },
      
      // CSS Shapes
      shapes: {
        name: 'CSS Shapes',
        category: 'layout',
        properties: ['shape-outside', 'clip-path'],
        testCode: `
          const testEl = document.createElement('div');
          testEl.style.clipPath = 'circle(50%)';
          return testEl.style.clipPath.includes('circle') || testEl.style.webkitClipPath !== undefined;
        `
      },
      
      // CSS Scroll Snap
      scrollSnap: {
        name: 'CSS Scroll Snap',
        category: 'interaction',
        properties: ['scroll-snap-type', 'scroll-snap-align'],
        testCode: `
          const testEl = document.createElement('div');
          testEl.style.scrollSnapType = 'x mandatory';
          return testEl.style.scrollSnapType === 'x mandatory';
        `
      },
      
      // CSS Containment
      containment: {
        name: 'CSS Containment',
        category: 'performance',
        properties: ['contain'],
        testCode: `
          const testEl = document.createElement('div');
          testEl.style.contain = 'layout';
          return testEl.style.contain === 'layout';
        `
      },
      
      // CSS Logical Properties
      logicalProperties: {
        name: 'CSS Logical Properties',
        category: 'layout',
        properties: ['margin-inline-start', 'padding-block-end'],
        testCode: `
          const testEl = document.createElement('div');
          testEl.style.marginInlineStart = '10px';
          return testEl.style.marginInlineStart === '10px';
        `
      }
    };
    
    // 浏览器前缀
    this.vendorPrefixes = ['-webkit-', '-moz-', '-ms-', '-o-'];
  }

  /**
   * 检测CSS特性支持
   */
  async detectFeatures(page) {
    try {
      
      const results = await page.evaluate((cssFeatures) => {
        const featureResults = {};
        
        // 检测每个CSS特性
        for (const [featureKey, feature] of Object.entries(cssFeatures)) {
          try {
            // 执行特性检测代码
            const testFunction = new Function(feature.testCode);
            const supported = testFunction();
            
            featureResults[featureKey] = {
              name: feature.name,
              category: feature.category,
              properties: feature.properties,
              supported,
              prefixRequired: false,
              supportedPrefixes: []
            };
            
            // 如果不支持，检测是否需要前缀
            if (!supported) {
              const prefixResults = this.checkVendorPrefixes(feature, featureKey);
              featureResults[featureKey].prefixRequired = prefixResults.prefixRequired;
              featureResults[featureKey].supportedPrefixes = prefixResults.supportedPrefixes;
            }
            
          } catch (error) {
            featureResults[featureKey] = {
              name: feature.name,
              category: feature.category,
              properties: feature.properties,
              supported: false,
              error: error.message
            };
          }
        }
        
        // 获取浏览器信息
        const browserInfo = {
          userAgent: navigator.userAgent,
          vendor: navigator.vendor,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine
        };
        
        return {
          features: featureResults,
          browserInfo,
          timestamp: new Date().toISOString()
        };
        
      }, this.cssFeatures);
      
      // 分析结果
      const analysis = this.analyzeResults(results);
      
      console.log(`✅ CSS特性检测完成，检测了 ${Object.keys(results.features).length} 个特性`);
      
      return {
        ...results,
        analysis
      };
      
    } catch (error) {
      console.error('❌ CSS特性检测失败:', error);
      throw error;
    }
  }

  /**
   * 检测厂商前缀支持
   */
  checkVendorPrefixes(feature, featureKey) {
    const supportedPrefixes = [];
    let prefixRequired = false;
    
    // 针对不同特性类型检测前缀
    if (featureKey === 'transforms') {
      for (const prefix of this.vendorPrefixes) {
        try {
          const testEl = document.createElement('div');
          testEl.style[prefix + 'transform'] = 'rotate(45deg)';
          if (testEl.style[prefix + 'transform']) {
            supportedPrefixes.push(prefix);
            prefixRequired = true;
          }
        } catch (e) {
          // 忽略错误
        }
      }
    } else if (featureKey === 'transitions') {
      for (const prefix of this.vendorPrefixes) {
        try {
          const testEl = document.createElement('div');
          /**
           * if功能函数
           * @param {Object} params - 参数对象
           * @returns {Promise<Object>} 返回结果
           */
          testEl.style[prefix + 'transition'] = 'all 0.3s ease';
          if (testEl.style[prefix + 'transition']) {
            supportedPrefixes.push(prefix);
            prefixRequired = true;
          }
        } catch (e) {
          // 忽略错误
        }
      }
    } else if (featureKey === 'animations') {
      for (const prefix of this.vendorPrefixes) {
        try {
          const testEl = document.createElement('div');
          /**
           * if功能函数
           * @param {Object} params - 参数对象
           * @returns {Promise<Object>} 返回结果
           */
          testEl.style[prefix + 'animation'] = 'test 1s linear';
          if (testEl.style[prefix + 'animation']) {
            supportedPrefixes.push(prefix);
            prefixRequired = true;
          }
        } catch (e) {
          // 忽略错误
        }
      }
    }
    
    return { prefixRequired, supportedPrefixes };
  }

  /**
   * 分析检测结果
   */
  analyzeResults(results) {
    const features = results.features;
    const categories = {};
    
    // 按类别统计
    for (const [featureKey, feature] of Object.entries(features)) {
      const category = feature.category;
      
      if (!categories[category]) {
        categories[category] = {
          total: 0,
          supported: 0,
          unsupported: 0,
          needsPrefix: 0,
          features: []
        };
      }
      
      categories[category].total++;
      categories[category].features.push({
        key: featureKey,
        name: feature.name,
        supported: feature.supported,
        prefixRequired: feature.prefixRequired
      });
      
      if (feature.supported) {
        categories[category].supported++;
      } else {
        categories[category].unsupported++;
        if (feature.prefixRequired) {
          categories[category].needsPrefix++;
        }
      }
    }
    
    // 计算总体支持率
    const totalFeatures = Object.keys(features).length;
    const supportedFeatures = Object.values(features).filter(f => f.supported).length;
    const supportRate = totalFeatures > 0 ? (supportedFeatures / totalFeatures) * 100 : 0;
    
    // 识别问题特性
    const problematicFeatures = Object.entries(features)
      .filter(([key, feature]) => !feature.supported)
      .map(([key, feature]) => ({
        key,
        name: feature.name,
        category: feature.category,
        prefixRequired: feature.prefixRequired,
        supportedPrefixes: feature.supportedPrefixes || []
      }));
    
    return {
      summary: {
        totalFeatures,
        supportedFeatures,
        unsupportedFeatures: totalFeatures - supportedFeatures,
        supportRate: Math.round(supportRate * 100) / 100,
        categoriesCount: Object.keys(categories).length
      },
      categories,
      problematicFeatures,
      recommendations: this.generateRecommendations(problematicFeatures, categories)
    };
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(problematicFeatures, categories) {
    const recommendations = [];
    
    // 针对不支持的特性生成建议
    problematicFeatures.forEach(feature => {
      if (feature.prefixRequired && feature.supportedPrefixes.length > 0) {
        recommendations.push({
          type: 'prefix',
          priority: 'medium',
          feature: feature.name,
          title: `为 ${feature.name} 添加厂商前缀`,
          description: `该特性需要厂商前缀支持: ${feature.supportedPrefixes.join(', ')}`,
          solution: `添加前缀: ${feature.supportedPrefixes.map(p => p + feature.key).join(', ')}`
        });
      } else {
        recommendations.push({
          type: 'fallback',
          priority: 'high',
          feature: feature.name,
          title: `为 ${feature.name} 提供降级方案`,
          description: `该特性在当前浏览器中不受支持`,
          solution: '考虑使用Polyfill或提供替代实现'
        });
      }
    });
    
    // 针对类别生成建议
    Object.entries(categories).forEach(([category, data]) => {
      if (data.supportRate < 80) {
        recommendations.push({
          type: 'category',
          priority: 'medium',
          category,
          title: `${category} 类特性支持率较低`,
          description: `该类别特性支持率仅为 ${Math.round(data.supportRate)}%`,
          solution: '考虑使用渐进增强或优雅降级策略'
        });
      }
    });
    
    return recommendations;
  }

  /**
   * 批量检测多个浏览器
   */
  async batchDetect(browserPages) {
    const results = [];
    
    for (const { browserType, version, page } of browserPages) {
      try {
        const detection = await this.detectFeatures(page);
        results.push({
          browserType,
          version,
          detection,
          success: true
        });
      } catch (error) {
        results.push({
          browserType,
          version,
          detection: null,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * 比较浏览器间的特性支持差异
   */
  compareFeatureSupport(detectionResults) {
    const comparison = {
      browsers: detectionResults.map(r => ({
        type: r.browserType,
        version: r.version,
        supportRate: r.detection?.analysis?.summary?.supportRate || 0
      })),
      featureComparison: {},
      recommendations: []
    };
    
    // 比较每个特性在不同浏览器中的支持情况
    const allFeatures = Object.keys(this.cssFeatures);
    
    allFeatures.forEach(featureKey => {
      const feature = this.cssFeatures[featureKey];
      const browserSupport = {};
      
      detectionResults.forEach(result => {
        if (result.detection && result.detection.features[featureKey]) {
          browserSupport[`${result.browserType}_${result.version}`] = 
            result.detection.features[featureKey].supported;
        }
      });
      
      comparison.featureComparison[featureKey] = {
        name: feature.name,
        category: feature.category,
        browserSupport,
        Support: Object.values(browserSupport).every(supported => supported),
        noSupport: Object.values(browserSupport).every(supported => !supported),
        partialSupport: Object.values(browserSupport).some(supported => supported) && 
                       Object.values(browserSupport).some(supported => !supported)
      };
    });
    
    return comparison;
  }
}

module.exports = CSSFeatureDetector;
