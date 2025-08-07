/**
 * Core Web Vitals分析器
 * 本地化程度：100%
 * 实现LCP、FID、CLS等核心性能指标的本地计算
 */

class CoreWebVitalsAnalyzer {
  constructor() {
    // Core Web Vitals阈值配置
    this.thresholds = {
      lcp: {
        good: 2500,      // 2.5秒
        needsImprovement: 4000  // 4秒
      },
      fid: {
        good: 100,       // 100毫秒
        needsImprovement: 300   // 300毫秒
      },
      cls: {
        good: 0.1,       // 0.1
        needsImprovement: 0.25  // 0.25
      },
      fcp: {
        good: 1800,      // 1.8秒
        needsImprovement: 3000  // 3秒
      },
      ttfb: {
        good: 800,       // 800毫秒
        needsImprovement: 1800  // 1.8秒
      }
    };
  }

  /**
   * 分析Core Web Vitals
   */
  async analyze(page) {
    try {
      console.log('📊 开始Core Web Vitals分析...');
      
      // 等待页面完全加载
      await page.waitForLoadState('networkidle');
      
      // 收集性能指标
      const metrics = await this.collectMetrics(page);
      
      // 计算各项指标
      const analysis = {
        lcp: this.analyzeLCP(metrics.lcp),
        fid: this.analyzeFID(metrics.fid),
        cls: this.analyzeCLS(metrics.cls),
        fcp: this.analyzeFCP(metrics.fcp),
        ttfb: this.analyzeTTFB(metrics.ttfb),
        overall: null
      };
      
      // 计算总体评分
      analysis.overall = this.calculateOverallScore(analysis);
      
      console.log('✅ Core Web Vitals分析完成');
      
      return analysis;
    } catch (error) {
      console.error('❌ Core Web Vitals分析失败:', error);
      throw error;
    }
  }

  /**
   * 收集性能指标
   */
  async collectMetrics(page) {
    return await page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics = {
          lcp: null,
          fid: null,
          cls: null,
          fcp: null,
          ttfb: null
        };
        
        // 获取Navigation Timing API数据
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          metrics.ttfb = navigation.responseStart - navigation.requestStart;
        }
        
        // 获取Paint Timing API数据
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          metrics.fcp = fcpEntry.startTime;
        }
        
        let metricsCollected = 0;
        const totalMetrics = 3; // LCP, FID, CLS
        
        // 收集LCP
        if ('PerformanceObserver' in window) {
          try {
            const lcpObserver = new PerformanceObserver((entryList) => {
              const entries = entryList.getEntries();
              const lastEntry = entries[entries.length - 1];
              metrics.lcp = lastEntry.startTime;
              metricsCollected++;
              if (metricsCollected >= totalMetrics) {
                resolve(metrics);
              }
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          } catch (e) {
            metricsCollected++;
          }
          
          // 收集FID
          try {
            const fidObserver = new PerformanceObserver((entryList) => {
              const entries = entryList.getEntries();
              entries.forEach(entry => {
                if (entry.processingStart && entry.startTime) {
                  metrics.fid = entry.processingStart - entry.startTime;
                }
              });
              metricsCollected++;
              if (metricsCollected >= totalMetrics) {
                resolve(metrics);
              }
            });
            fidObserver.observe({ entryTypes: ['first-input'] });
          } catch (e) {
            metricsCollected++;
          }
          
          // 收集CLS
          try {
            let clsValue = 0;
            let sessionValue = 0;
            let sessionEntries = [];
            
            const clsObserver = new PerformanceObserver((entryList) => {
              for (const entry of entryList.getEntries()) {
                if (!entry.hadRecentInput) {
                  const firstSessionEntry = sessionEntries[0];
                  const lastSessionEntry = sessionEntries[sessionEntries.length - 1];
                  
                  if (sessionValue && 
                      entry.startTime - lastSessionEntry.startTime < 1000 &&
                      entry.startTime - firstSessionEntry.startTime < 5000) {
                    sessionValue += entry.value;
                    sessionEntries.push(entry);
                  } else {
                    sessionValue = entry.value;
                    sessionEntries = [entry];
                  }
                  
                  if (sessionValue > clsValue) {
                    clsValue = sessionValue;
                  }
                }
              }
              metrics.cls = clsValue;
            });
            
            clsObserver.observe({ entryTypes: ['layout-shift'] });
            
            // CLS需要在页面交互后才能准确测量，这里设置延迟
            setTimeout(() => {
              metrics.cls = clsValue;
              metricsCollected++;
              if (metricsCollected >= totalMetrics) {
                resolve(metrics);
              }
            }, 2000);
          } catch (e) {
            metricsCollected++;
          }
        } else {
          // 如果不支持PerformanceObserver，直接返回已收集的数据
          resolve(metrics);
        }
        
        // 超时保护
        setTimeout(() => {
          resolve(metrics);
        }, 5000);
      });
    });
  }

  /**
   * 分析LCP (Largest Contentful Paint)
   */
  analyzeLCP(lcpValue) {
    if (!lcpValue) {
      return {
        value: null,
        score: 0,
        rating: 'poor',
        description: '无法获取LCP数据'
      };
    }
    
    let rating, score;
    
    if (lcpValue <= this.thresholds.lcp.good) {
      rating = 'good';
      score = 100;
    } else if (lcpValue <= this.thresholds.lcp.needsImprovement) {
      rating = 'needs-improvement';
      score = Math.round(100 - ((lcpValue - this.thresholds.lcp.good) / 
        (this.thresholds.lcp.needsImprovement - this.thresholds.lcp.good)) * 50);
    } else {
      rating = 'poor';
      score = Math.max(0, Math.round(50 - ((lcpValue - this.thresholds.lcp.needsImprovement) / 
        this.thresholds.lcp.needsImprovement) * 50));
    }
    
    return {
      value: Math.round(lcpValue),
      score,
      rating,
      description: this.getLCPDescription(lcpValue),
      recommendations: this.getLCPRecommendations(lcpValue)
    };
  }

  /**
   * 分析FID (First Input Delay)
   */
  analyzeFID(fidValue) {
    if (fidValue === null || fidValue === undefined) {
      return {
        value: null,
        score: 75, // 默认给一个中等分数
        rating: 'needs-improvement',
        description: '无法测量FID，可能页面没有用户交互'
      };
    }
    
    let rating, score;
    
    if (fidValue <= this.thresholds.fid.good) {
      rating = 'good';
      score = 100;
    } else if (fidValue <= this.thresholds.fid.needsImprovement) {
      rating = 'needs-improvement';
      score = Math.round(100 - ((fidValue - this.thresholds.fid.good) / 
        (this.thresholds.fid.needsImprovement - this.thresholds.fid.good)) * 50);
    } else {
      rating = 'poor';
      score = Math.max(0, Math.round(50 - ((fidValue - this.thresholds.fid.needsImprovement) / 
        this.thresholds.fid.needsImprovement) * 50));
    }
    
    return {
      value: Math.round(fidValue),
      score,
      rating,
      description: this.getFIDDescription(fidValue),
      recommendations: this.getFIDRecommendations(fidValue)
    };
  }

  /**
   * 分析CLS (Cumulative Layout Shift)
   */
  analyzeCLS(clsValue) {
    if (clsValue === null || clsValue === undefined) {
      return {
        value: null,
        score: 75,
        rating: 'needs-improvement',
        description: '无法获取CLS数据'
      };
    }
    
    let rating, score;
    
    if (clsValue <= this.thresholds.cls.good) {
      rating = 'good';
      score = 100;
    } else if (clsValue <= this.thresholds.cls.needsImprovement) {
      rating = 'needs-improvement';
      score = Math.round(100 - ((clsValue - this.thresholds.cls.good) / 
        (this.thresholds.cls.needsImprovement - this.thresholds.cls.good)) * 50);
    } else {
      rating = 'poor';
      score = Math.max(0, Math.round(50 - ((clsValue - this.thresholds.cls.needsImprovement) / 
        this.thresholds.cls.needsImprovement) * 50));
    }
    
    return {
      value: Math.round(clsValue * 1000) / 1000, // 保留3位小数
      score,
      rating,
      description: this.getCLSDescription(clsValue),
      recommendations: this.getCLSRecommendations(clsValue)
    };
  }

  /**
   * 分析FCP (First Contentful Paint)
   */
  analyzeFCP(fcpValue) {
    if (!fcpValue) {
      return {
        value: null,
        score: 0,
        rating: 'poor',
        description: '无法获取FCP数据'
      };
    }
    
    let rating, score;
    
    if (fcpValue <= this.thresholds.fcp.good) {
      rating = 'good';
      score = 100;
    } else if (fcpValue <= this.thresholds.fcp.needsImprovement) {
      rating = 'needs-improvement';
      score = Math.round(100 - ((fcpValue - this.thresholds.fcp.good) / 
        (this.thresholds.fcp.needsImprovement - this.thresholds.fcp.good)) * 50);
    } else {
      rating = 'poor';
      score = Math.max(0, Math.round(50 - ((fcpValue - this.thresholds.fcp.needsImprovement) / 
        this.thresholds.fcp.needsImprovement) * 50));
    }
    
    return {
      value: Math.round(fcpValue),
      score,
      rating,
      description: this.getFCPDescription(fcpValue)
    };
  }

  /**
   * 分析TTFB (Time to First Byte)
   */
  analyzeTTFB(ttfbValue) {
    if (!ttfbValue) {
      return {
        value: null,
        score: 0,
        rating: 'poor',
        description: '无法获取TTFB数据'
      };
    }
    
    let rating, score;
    
    if (ttfbValue <= this.thresholds.ttfb.good) {
      rating = 'good';
      score = 100;
    } else if (ttfbValue <= this.thresholds.ttfb.needsImprovement) {
      rating = 'needs-improvement';
      score = Math.round(100 - ((ttfbValue - this.thresholds.ttfb.good) / 
        (this.thresholds.ttfb.needsImprovement - this.thresholds.ttfb.good)) * 50);
    } else {
      rating = 'poor';
      score = Math.max(0, Math.round(50 - ((ttfbValue - this.thresholds.ttfb.needsImprovement) / 
        this.thresholds.ttfb.needsImprovement) * 50));
    }
    
    return {
      value: Math.round(ttfbValue),
      score,
      rating,
      description: this.getTTFBDescription(ttfbValue)
    };
  }

  /**
   * 计算总体评分
   */
  calculateOverallScore(analysis) {
    const weights = {
      lcp: 0.25,  // 25%
      fid: 0.25,  // 25%
      cls: 0.25,  // 25%
      fcp: 0.15,  // 15%
      ttfb: 0.10  // 10%
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.entries(weights).forEach(([metric, weight]) => {
      if (analysis[metric] && analysis[metric].score !== null) {
        totalScore += analysis[metric].score * weight;
        totalWeight += weight;
      }
    });
    
    const score = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    
    let rating;
    if (score >= 90) rating = 'good';
    else if (score >= 50) rating = 'needs-improvement';
    else rating = 'poor';
    
    return {
      score,
      rating,
      description: this.getOverallDescription(score)
    };
  }

  // 描述和建议方法
  getLCPDescription(value) {
    if (value <= this.thresholds.lcp.good) {
      return '最大内容绘制时间优秀，用户能快速看到主要内容';
    } else if (value <= this.thresholds.lcp.needsImprovement) {
      return '最大内容绘制时间需要改进，可能影响用户体验';
    } else {
      return '最大内容绘制时间过长，严重影响用户体验';
    }
  }

  getLCPRecommendations(value) {
    const recommendations = [];
    
    if (value > this.thresholds.lcp.good) {
      recommendations.push('优化服务器响应时间');
      recommendations.push('使用CDN加速资源加载');
      recommendations.push('优化关键渲染路径');
      recommendations.push('预加载重要资源');
      recommendations.push('压缩和优化图片');
    }
    
    return recommendations;
  }

  getFIDDescription(value) {
    if (value <= this.thresholds.fid.good) {
      return '首次输入延迟优秀，页面响应迅速';
    } else if (value <= this.thresholds.fid.needsImprovement) {
      return '首次输入延迟需要改进，可能影响交互体验';
    } else {
      return '首次输入延迟过长，严重影响交互体验';
    }
  }

  getFIDRecommendations(value) {
    const recommendations = [];
    
    if (value > this.thresholds.fid.good) {
      recommendations.push('减少JavaScript执行时间');
      recommendations.push('分割长任务');
      recommendations.push('使用Web Workers处理复杂计算');
      recommendations.push('延迟加载非关键JavaScript');
      recommendations.push('优化第三方脚本');
    }
    
    return recommendations;
  }

  getCLSDescription(value) {
    if (value <= this.thresholds.cls.good) {
      return '累积布局偏移优秀，页面布局稳定';
    } else if (value <= this.thresholds.cls.needsImprovement) {
      return '累积布局偏移需要改进，可能影响用户体验';
    } else {
      return '累积布局偏移过大，严重影响用户体验';
    }
  }

  getCLSRecommendations(value) {
    const recommendations = [];
    
    if (value > this.thresholds.cls.good) {
      recommendations.push('为图片和视频设置尺寸属性');
      recommendations.push('避免在现有内容上方插入内容');
      recommendations.push('使用transform动画代替改变布局的动画');
      recommendations.push('预留广告和嵌入内容的空间');
      recommendations.push('确保字体加载不会导致布局偏移');
    }
    
    return recommendations;
  }

  getFCPDescription(value) {
    if (value <= this.thresholds.fcp.good) {
      return '首次内容绘制时间优秀';
    } else if (value <= this.thresholds.fcp.needsImprovement) {
      return '首次内容绘制时间需要改进';
    } else {
      return '首次内容绘制时间过长';
    }
  }

  getTTFBDescription(value) {
    if (value <= this.thresholds.ttfb.good) {
      return '首字节时间优秀';
    } else if (value <= this.thresholds.ttfb.needsImprovement) {
      return '首字节时间需要改进';
    } else {
      return '首字节时间过长';
    }
  }

  getOverallDescription(score) {
    if (score >= 90) {
      return 'Core Web Vitals表现优秀，用户体验良好';
    } else if (score >= 50) {
      return 'Core Web Vitals表现一般，有改进空间';
    } else {
      return 'Core Web Vitals表现较差，需要重点优化';
    }
  }
}

module.exports = CoreWebVitalsAnalyzer;
