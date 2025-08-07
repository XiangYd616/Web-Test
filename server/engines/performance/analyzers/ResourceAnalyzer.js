/**
 * 资源加载分析器
 * 本地化程度：100%
 * 分析页面资源加载性能、优化建议等
 */

class ResourceAnalyzer {
  constructor() {
    // 资源类型分类
    this.resourceTypes = {
      document: ['document'],
      script: ['script'],
      stylesheet: ['stylesheet'],
      image: ['image'],
      font: ['font'],
      media: ['media'],
      xhr: ['xhr', 'fetch'],
      other: ['other']
    };
    
    // 性能阈值
    this.thresholds = {
      resourceSize: {
        image: 500 * 1024,      // 500KB
        script: 200 * 1024,     // 200KB
        stylesheet: 100 * 1024, // 100KB
        font: 100 * 1024        // 100KB
      },
      loadTime: {
        critical: 1000,  // 1秒
        warning: 3000    // 3秒
      },
      totalResources: 100,
      totalSize: 5 * 1024 * 1024 // 5MB
    };
  }

  /**
   * 分析资源加载性能
   */
  async analyze(page) {
    try {
      console.log('📦 开始资源加载分析...');
      
      // 收集资源数据
      const resources = await this.collectResources(page);
      
      // 分析各类资源
      const analysis = {
        summary: this.analyzeSummary(resources),
        byType: this.analyzeByType(resources),
        performance: this.analyzePerformance(resources),
        optimization: this.analyzeOptimization(resources),
        caching: this.analyzeCaching(resources),
        compression: this.analyzeCompression(resources)
      };
      
      // 生成建议
      analysis.recommendations = this.generateRecommendations(analysis);
      
      console.log('✅ 资源加载分析完成');
      
      return analysis;
    } catch (error) {
      console.error('❌ 资源加载分析失败:', error);
      throw error;
    }
  }

  /**
   * 收集资源数据
   */
  async collectResources(page) {
    return await page.evaluate(() => {
      const resources = [];
      
      // 获取所有资源条目
      const entries = performance.getEntriesByType('resource');
      
      entries.forEach(entry => {
        const resource = {
          name: entry.name,
          type: entry.initiatorType,
          size: entry.transferSize || 0,
          encodedSize: entry.encodedBodySize || 0,
          decodedSize: entry.decodedBodySize || 0,
          duration: entry.duration,
          startTime: entry.startTime,
          responseEnd: entry.responseEnd,
          domainLookupTime: entry.domainLookupEnd - entry.domainLookupStart,
          connectTime: entry.connectEnd - entry.connectStart,
          requestTime: entry.responseStart - entry.requestStart,
          responseTime: entry.responseEnd - entry.responseStart,
          redirectTime: entry.redirectEnd - entry.redirectStart,
          cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
          protocol: entry.nextHopProtocol || 'unknown'
        };
        
        // 从URL中提取更多信息
        try {
          const url = new URL(entry.name);
          resource.domain = url.hostname;
          resource.path = url.pathname;
          resource.extension = url.pathname.split('.').pop().toLowerCase();
          resource.isThirdParty = url.hostname !== window.location.hostname;
        } catch (e) {
          resource.domain = 'unknown';
          resource.path = entry.name;
          resource.extension = '';
          resource.isThirdParty = false;
        }
        
        resources.push(resource);
      });
      
      return resources;
    });
  }

  /**
   * 分析资源摘要
   */
  analyzeSummary(resources) {
    const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
    const totalRequests = resources.length;
    const averageSize = totalRequests > 0 ? totalSize / totalRequests : 0;
    const averageLoadTime = totalRequests > 0 ? 
      resources.reduce((sum, r) => sum + r.duration, 0) / totalRequests : 0;
    
    const thirdPartyResources = resources.filter(r => r.isThirdParty);
    const cachedResources = resources.filter(r => r.cached);
    
    return {
      totalRequests,
      totalSize,
      averageSize: Math.round(averageSize),
      averageLoadTime: Math.round(averageLoadTime),
      thirdPartyCount: thirdPartyResources.length,
      thirdPartySize: thirdPartyResources.reduce((sum, r) => sum + r.size, 0),
      cachedCount: cachedResources.length,
      cachedPercentage: totalRequests > 0 ? Math.round((cachedResources.length / totalRequests) * 100) : 0,
      compressionSavings: this.calculateCompressionSavings(resources)
    };
  }

  /**
   * 按类型分析资源
   */
  analyzeByType(resources) {
    const analysis = {};
    
    Object.keys(this.resourceTypes).forEach(type => {
      const typeResources = resources.filter(r => 
        this.resourceTypes[type].includes(r.type)
      );
      
      analysis[type] = {
        count: typeResources.length,
        totalSize: typeResources.reduce((sum, r) => sum + r.size, 0),
        averageSize: typeResources.length > 0 ? 
          Math.round(typeResources.reduce((sum, r) => sum + r.size, 0) / typeResources.length) : 0,
        averageLoadTime: typeResources.length > 0 ? 
          Math.round(typeResources.reduce((sum, r) => sum + r.duration, 0) / typeResources.length) : 0,
        largestResource: this.findLargestResource(typeResources),
        slowestResource: this.findSlowestResource(typeResources)
      };
    });
    
    return analysis;
  }

  /**
   * 分析性能问题
   */
  analyzePerformance(resources) {
    const issues = [];
    const slowResources = resources.filter(r => r.duration > this.thresholds.loadTime.warning);
    const largeResources = this.findLargeResources(resources);
    const blockingResources = this.findBlockingResources(resources);
    
    return {
      slowResources: slowResources.map(r => ({
        name: r.name,
        type: r.type,
        duration: Math.round(r.duration),
        size: r.size
      })),
      largeResources,
      blockingResources,
      performanceScore: this.calculatePerformanceScore(resources),
      issues: this.identifyPerformanceIssues(resources)
    };
  }

  /**
   * 分析优化机会
   */
  analyzeOptimization(resources) {
    const imageOptimization = this.analyzeImageOptimization(resources);
    const scriptOptimization = this.analyzeScriptOptimization(resources);
    const cssOptimization = this.analyzeCSSOptimization(resources);
    const fontOptimization = this.analyzeFontOptimization(resources);
    
    return {
      images: imageOptimization,
      scripts: scriptOptimization,
      stylesheets: cssOptimization,
      fonts: fontOptimization,
      totalSavings: this.calculateTotalSavings([
        imageOptimization,
        scriptOptimization,
        cssOptimization,
        fontOptimization
      ])
    };
  }

  /**
   * 分析缓存策略
   */
  analyzeCaching(resources) {
    const uncachedResources = resources.filter(r => !r.cached && r.type !== 'document');
    const cacheableResources = uncachedResources.filter(r => 
      ['script', 'stylesheet', 'image', 'font'].includes(r.type)
    );
    
    return {
      cachedCount: resources.filter(r => r.cached).length,
      uncachedCount: uncachedResources.length,
      cacheableCount: cacheableResources.length,
      cacheHitRate: resources.length > 0 ? 
        Math.round((resources.filter(r => r.cached).length / resources.length) * 100) : 0,
      potentialSavings: cacheableResources.reduce((sum, r) => sum + r.size, 0),
      recommendations: this.getCachingRecommendations(cacheableResources)
    };
  }

  /**
   * 分析压缩情况
   */
  analyzeCompression(resources) {
    const compressibleResources = resources.filter(r => 
      ['script', 'stylesheet', 'document', 'xhr'].includes(r.type) && r.size > 1024
    );
    
    const compressionAnalysis = compressibleResources.map(r => {
      const compressionRatio = r.encodedSize > 0 ? r.decodedSize / r.encodedSize : 1;
      const isCompressed = compressionRatio > 1.1; // 压缩率超过10%认为已压缩
      
      return {
        name: r.name,
        type: r.type,
        originalSize: r.decodedSize,
        compressedSize: r.encodedSize,
        compressionRatio,
        isCompressed,
        potentialSavings: isCompressed ? 0 : Math.round(r.decodedSize * 0.7) // 估算70%压缩率
      };
    });
    
    const uncompressedResources = compressionAnalysis.filter(r => !r.isCompressed);
    const totalPotentialSavings = uncompressedResources.reduce((sum, r) => sum + r.potentialSavings, 0);
    
    return {
      compressibleCount: compressibleResources.length,
      compressedCount: compressionAnalysis.filter(r => r.isCompressed).length,
      uncompressedCount: uncompressedResources.length,
      compressionRate: compressibleResources.length > 0 ? 
        Math.round((compressionAnalysis.filter(r => r.isCompressed).length / compressibleResources.length) * 100) : 0,
      potentialSavings: totalPotentialSavings,
      uncompressedResources: uncompressedResources.slice(0, 10) // 只返回前10个
    };
  }

  /**
   * 查找最大的资源
   */
  findLargestResource(resources) {
    if (resources.length === 0) return null;
    
    return resources.reduce((largest, current) => 
      current.size > largest.size ? current : largest
    );
  }

  /**
   * 查找最慢的资源
   */
  findSlowestResource(resources) {
    if (resources.length === 0) return null;
    
    return resources.reduce((slowest, current) => 
      current.duration > slowest.duration ? current : slowest
    );
  }

  /**
   * 查找大文件
   */
  findLargeResources(resources) {
    return resources.filter(r => {
      const threshold = this.thresholds.resourceSize[r.type] || 1024 * 1024; // 默认1MB
      return r.size > threshold;
    }).map(r => ({
      name: r.name,
      type: r.type,
      size: r.size,
      threshold: this.thresholds.resourceSize[r.type] || 1024 * 1024
    }));
  }

  /**
   * 查找阻塞资源
   */
  findBlockingResources(resources) {
    // 查找可能阻塞渲染的资源
    return resources.filter(r => 
      (r.type === 'script' || r.type === 'stylesheet') && 
      r.startTime < 1000 && // 在页面加载早期
      r.duration > 500 // 加载时间超过500ms
    ).map(r => ({
      name: r.name,
      type: r.type,
      duration: Math.round(r.duration),
      startTime: Math.round(r.startTime)
    }));
  }

  /**
   * 计算性能评分
   */
  calculatePerformanceScore(resources) {
    let score = 100;
    
    // 总请求数扣分
    if (resources.length > this.thresholds.totalResources) {
      score -= Math.min(20, (resources.length - this.thresholds.totalResources) * 0.2);
    }
    
    // 总大小扣分
    const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
    if (totalSize > this.thresholds.totalSize) {
      score -= Math.min(30, ((totalSize - this.thresholds.totalSize) / this.thresholds.totalSize) * 30);
    }
    
    // 慢资源扣分
    const slowResources = resources.filter(r => r.duration > this.thresholds.loadTime.warning);
    score -= Math.min(25, slowResources.length * 5);
    
    // 缓存率加分
    const cacheRate = resources.length > 0 ? 
      resources.filter(r => r.cached).length / resources.length : 0;
    score += cacheRate * 10;
    
    return Math.max(0, Math.round(score));
  }

  /**
   * 识别性能问题
   */
  identifyPerformanceIssues(resources) {
    const issues = [];
    
    // 检查总请求数
    if (resources.length > this.thresholds.totalResources) {
      issues.push({
        type: 'too_many_requests',
        severity: 'medium',
        message: `页面请求数过多 (${resources.length}个)，建议合并资源`
      });
    }
    
    // 检查总大小
    const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
    if (totalSize > this.thresholds.totalSize) {
      issues.push({
        type: 'large_page_size',
        severity: 'high',
        message: `页面总大小过大 (${Math.round(totalSize / 1024 / 1024)}MB)，建议优化资源`
      });
    }
    
    // 检查第三方资源
    const thirdPartyResources = resources.filter(r => r.isThirdParty);
    if (thirdPartyResources.length > 10) {
      issues.push({
        type: 'too_many_third_party',
        severity: 'medium',
        message: `第三方资源过多 (${thirdPartyResources.length}个)，可能影响性能`
      });
    }
    
    return issues;
  }

  /**
   * 分析图片优化
   */
  analyzeImageOptimization(resources) {
    const images = resources.filter(r => r.type === 'image');
    const largeImages = images.filter(r => r.size > this.thresholds.resourceSize.image);
    
    return {
      totalImages: images.length,
      largeImages: largeImages.length,
      totalSize: images.reduce((sum, r) => sum + r.size, 0),
      averageSize: images.length > 0 ? Math.round(images.reduce((sum, r) => sum + r.size, 0) / images.length) : 0,
      potentialSavings: Math.round(images.reduce((sum, r) => sum + r.size, 0) * 0.3), // 估算30%压缩
      recommendations: this.getImageOptimizationRecommendations(images)
    };
  }

  /**
   * 分析脚本优化
   */
  analyzeScriptOptimization(resources) {
    const scripts = resources.filter(r => r.type === 'script');
    const largeScripts = scripts.filter(r => r.size > this.thresholds.resourceSize.script);
    
    return {
      totalScripts: scripts.length,
      largeScripts: largeScripts.length,
      totalSize: scripts.reduce((sum, r) => sum + r.size, 0),
      potentialSavings: Math.round(scripts.reduce((sum, r) => sum + r.size, 0) * 0.2), // 估算20%优化
      recommendations: this.getScriptOptimizationRecommendations(scripts)
    };
  }

  /**
   * 分析CSS优化
   */
  analyzeCSSOptimization(resources) {
    const stylesheets = resources.filter(r => r.type === 'stylesheet');
    
    return {
      totalStylesheets: stylesheets.length,
      totalSize: stylesheets.reduce((sum, r) => sum + r.size, 0),
      potentialSavings: Math.round(stylesheets.reduce((sum, r) => sum + r.size, 0) * 0.15), // 估算15%优化
      recommendations: this.getCSSOptimizationRecommendations(stylesheets)
    };
  }

  /**
   * 分析字体优化
   */
  analyzeFontOptimization(resources) {
    const fonts = resources.filter(r => r.type === 'font');
    
    return {
      totalFonts: fonts.length,
      totalSize: fonts.reduce((sum, r) => sum + r.size, 0),
      recommendations: this.getFontOptimizationRecommendations(fonts)
    };
  }

  /**
   * 计算压缩节省
   */
  calculateCompressionSavings(resources) {
    return resources.reduce((savings, r) => {
      if (r.decodedSize > r.encodedSize) {
        return savings + (r.decodedSize - r.encodedSize);
      }
      return savings;
    }, 0);
  }

  /**
   * 计算总节省
   */
  calculateTotalSavings(optimizations) {
    return optimizations.reduce((total, opt) => total + (opt.potentialSavings || 0), 0);
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(analysis) {
    const recommendations = [];
    
    // 基于分析结果生成建议
    if (analysis.summary.totalRequests > this.thresholds.totalResources) {
      recommendations.push({
        priority: 'high',
        category: 'requests',
        title: '减少HTTP请求数',
        description: '合并CSS和JavaScript文件，使用CSS Sprites或图标字体',
        impact: 'high'
      });
    }
    
    if (analysis.performance.performanceScore < 70) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        title: '优化资源加载性能',
        description: '压缩文件、启用缓存、使用CDN',
        impact: 'high'
      });
    }
    
    if (analysis.caching.cacheHitRate < 50) {
      recommendations.push({
        priority: 'medium',
        category: 'caching',
        title: '改善缓存策略',
        description: '为静态资源设置适当的缓存头',
        impact: 'medium'
      });
    }
    
    return recommendations;
  }

  // 各种优化建议方法
  getImageOptimizationRecommendations(images) {
    const recommendations = [];
    
    if (images.length > 0) {
      recommendations.push('使用现代图片格式（WebP、AVIF）');
      recommendations.push('实现响应式图片');
      recommendations.push('使用图片懒加载');
      recommendations.push('压缩图片文件');
    }
    
    return recommendations;
  }

  getScriptOptimizationRecommendations(scripts) {
    const recommendations = [];
    
    if (scripts.length > 0) {
      recommendations.push('压缩和混淆JavaScript');
      recommendations.push('移除未使用的代码');
      recommendations.push('使用代码分割');
      recommendations.push('延迟加载非关键脚本');
    }
    
    return recommendations;
  }

  getCSSOptimizationRecommendations(stylesheets) {
    const recommendations = [];
    
    if (stylesheets.length > 0) {
      recommendations.push('压缩CSS文件');
      recommendations.push('移除未使用的CSS');
      recommendations.push('内联关键CSS');
      recommendations.push('合并CSS文件');
    }
    
    return recommendations;
  }

  getFontOptimizationRecommendations(fonts) {
    const recommendations = [];
    
    if (fonts.length > 0) {
      recommendations.push('使用字体显示策略');
      recommendations.push('预加载关键字体');
      recommendations.push('使用字体子集');
      recommendations.push('选择高效的字体格式');
    }
    
    return recommendations;
  }

  getCachingRecommendations(resources) {
    const recommendations = [];
    
    if (resources.length > 0) {
      recommendations.push('设置适当的Cache-Control头');
      recommendations.push('使用ETag进行缓存验证');
      recommendations.push('实现浏览器缓存策略');
      recommendations.push('考虑使用Service Worker');
    }
    
    return recommendations;
  }
}

module.exports = ResourceAnalyzer;
