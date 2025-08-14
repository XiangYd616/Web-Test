/**
 * 性能优化建议引擎
 * 本地化程度：100%
 * 基于性能分析结果生成智能化优化建议：代码优化、资源压缩、CDN配置、数据库优化等
 */

class PerformanceOptimizationEngine {
  constructor() {
    // 优化规则库
    this.optimizationRules = {
      // Core Web Vitals 优化规则
      coreWebVitals: {
        fcp: {
          threshold: 1800,
          rules: [
            {
              condition: (metrics) => metrics.fcp > 3000,
              priority: 'high',
              category: 'critical_rendering_path',
              title: '优化关键渲染路径',
              description: 'First Contentful Paint 时间过长，需要优化关键渲染路径',
              solutions: [
                '内联关键CSS，减少渲染阻塞',
                '延迟加载非关键JavaScript',
                '优化字体加载策略',
                '减少DOM深度和复杂性'
              ],
              codeExamples: [
                {
                  title: '内联关键CSS',
                  code: `<style>
/* 关键CSS内联到HTML中 */
.above-fold { display: block; }
.hero { background: #fff; }
</style>
<link rel="preload" href="/css/non-critical.css" as="style" onload="this.onload=null;this.rel='stylesheet'">`
                },
                {
                  title: '延迟加载JavaScript',
                  code: `<!-- 使用defer属性延迟执行 -->
<script defer src="/js/non-critical.js"></script>

<!-- 动态加载非关键脚本 -->
<script>
window.addEventListener('load', () => {
  const script = document.createElement('script');
  script.src = '/js/analytics.js';
  document.head.appendChild(script);
});
</script>`
                }
              ],
              estimatedImprovement: '减少FCP时间30-50%',
              implementationCost: 'medium',
              implementationTime: '2-3天'
            }
          ]
        },
        lcp: {
          threshold: 2500,
          rules: [
            {
              condition: (metrics) => metrics.lcp > 4000,
              priority: 'high',
              category: 'largest_contentful_paint',
              title: '优化最大内容绘制',
              description: 'LCP元素加载时间过长，影响用户体验',
              solutions: [
                '优化LCP元素的图片加载',
                '使用适当的图片格式和尺寸',
                '实施资源预加载',
                '优化服务器响应时间'
              ],
              codeExamples: [
                {
                  title: '图片优化和预加载',
                  code: `<!-- 预加载LCP图片 -->
<link rel="preload" as="image" href="/hero-image.webp">

<!-- 响应式图片 -->
<picture>
  <source media="(min-width: 800px)" srcset="/hero-large.webp" type="image/webp">
  <source media="(min-width: 400px)" srcset="/hero-medium.webp" type="image/webp">
  <img src="/hero-small.webp" alt="Hero image" loading="eager">
</picture>`
                },
                {
                  title: '服务器端优化',
                  code: `// Express.js 缓存配置
app.use(express.static('public', {
  maxAge: '1y',
  etag: true,
  lastModified: true
}));

// 启用Gzip压缩
app.use(compression({
  level: 6,
  threshold: 1024
}));`
                }
              ],
              estimatedImprovement: '减少LCP时间40-60%',
              implementationCost: 'medium',
              implementationTime: '3-5天'
            }
          ]
        },
        cls: {
          threshold: 0.1,
          rules: [
            {
              condition: (metrics) => metrics.cls > 0.25,
              priority: 'high',
              category: 'layout_stability',
              title: '修复布局偏移问题',
              description: '页面存在严重的布局偏移，影响用户体验',
              solutions: [
                '为图片和视频设置尺寸属性',
                '为动态内容预留空间',
                '避免在现有内容上方插入内容',
                '使用transform动画替代改变布局的动画'
              ],
              codeExamples: [
                {
                  title: '图片尺寸预设',
                  code: `<!-- 设置图片尺寸避免布局偏移 -->
<img src="/image.jpg" width="800" height="600" alt="Description">

<!-- CSS aspect-ratio -->
.image-container {
  aspect-ratio: 16 / 9;
  width: 100%;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}`
                },
                {
                  title: '动态内容占位符',
                  code: `<!-- 为动态内容预留空间 -->
.skeleton-loader {
  height: 200px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}`
                }
              ],
              estimatedImprovement: '减少CLS值80-90%',
              implementationCost: 'low',
              implementationTime: '1-2天'
            }
          ]
        }
      },

      // 资源优化规则
      resources: {
        images: {
          rules: [
            {
              condition: (analysis) => analysis.unoptimizedImages > 0,
              priority: 'medium',
              category: 'image_optimization',
              title: '图片优化',
              description: '检测到未优化的图片资源',
              solutions: [
                '使用现代图片格式（WebP、AVIF）',
                '实施响应式图片',
                '启用图片懒加载',
                '压缩图片文件大小'
              ],
              codeExamples: [
                {
                  title: '现代图片格式',
                  code: `<picture>
  <source srcset="/image.avif" type="image/avif">
  <source srcset="/image.webp" type="image/webp">
  <img src="/image.jpg" alt="Description" loading="lazy">
</picture>`
                }
              ],
              estimatedImprovement: '减少图片大小60-80%',
              implementationCost: 'low',
              implementationTime: '1天'
            }
          ]
        },
        javascript: {
          rules: [
            {
              condition: (analysis) => analysis.unusedJavaScript > 30,
              priority: 'medium',
              category: 'javascript_optimization',
              title: 'JavaScript代码分割',
              description: '检测到大量未使用的JavaScript代码',
              solutions: [
                '实施代码分割（Code Splitting）',
                '移除未使用的代码',
                '使用动态导入',
                '启用Tree Shaking'
              ],
              codeExamples: [
                {
                  title: '动态导入',
                  code: `// 按需加载模块
async function loadFeature() {
  const { feature } = await import('./feature.js');
  return feature;
}

// React代码分割
const LazyComponent = React.lazy(() => import('./LazyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}`
                }
              ],
              estimatedImprovement: '减少初始包大小40-60%',
              implementationCost: 'medium',
              implementationTime: '3-5天'
            }
          ]
        }
      },

      // 缓存优化规则
      caching: {
        rules: [
          {
            condition: (analysis) => !analysis.hasServiceWorker,
            priority: 'medium',
            category: 'caching_strategy',
            title: '实施Service Worker缓存',
            description: '未检测到Service Worker，可以显著提升重复访问性能',
            solutions: [
              '实施Service Worker缓存策略',
              '缓存关键资源',
              '实现离线功能',
              '优化缓存更新策略'
            ],
            codeExamples: [
              {
                title: 'Service Worker基本实现',
                code: `// sw.js
const CACHE_NAME = 'app-v1';
const urlsToCache = [
  '/',
  '/css/style.css',
  '/js/app.js',
  '/images/logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});`
              }
            ],
            estimatedImprovement: '提升重复访问速度70-90%',
            implementationCost: 'medium',
            implementationTime: '2-3天'
          }
        ]
      }
    };

    // 成本效益分析模型
    this.costBenefitModel = {
      implementationCosts: {
        low: { hours: 8, cost: 800 },
        medium: { hours: 24, cost: 2400 },
        high: { hours: 80, cost: 8000 }
      },
      performanceValue: {
        // 每毫秒性能提升的业务价值
        loadTimeValue: 0.1, // 每减少1ms加载时间的价值
        conversionImpact: 0.02, // 每1%性能提升对转化率的影响
        seoImpact: 0.05 // 每1%性能提升对SEO排名的影响
      }
    };
  }

  /**
   * 生成性能优化建议
   */
  generateOptimizationRecommendations(performanceAnalysis) {
    console.log('🔧 生成性能优化建议...');

    const recommendations = {
      timestamp: new Date().toISOString(),
      overallScore: performanceAnalysis.scores?.overall?.score || 0,
      prioritizedRecommendations: [],
      quickWins: [],
      longTermImprovements: [],
      costBenefitAnalysis: null,
      implementationRoadmap: null,
      estimatedImpact: null
    };

    // 分析Core Web Vitals
    const coreWebVitalsRecommendations = this.analyzeCoreWebVitals(performanceAnalysis.coreWebVitals);
    recommendations.prioritizedRecommendations.push(...coreWebVitalsRecommendations);

    // 分析资源优化机会
    const resourceRecommendations = this.analyzeResourceOptimization(performanceAnalysis.resources);
    recommendations.prioritizedRecommendations.push(...resourceRecommendations);

    // 分析缓存策略
    const cachingRecommendations = this.analyzeCachingStrategy(performanceAnalysis);
    recommendations.prioritizedRecommendations.push(...cachingRecommendations);

    // 按优先级排序
    recommendations.prioritizedRecommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // 识别快速胜利和长期改进
    recommendations.quickWins = recommendations.prioritizedRecommendations
      .filter(rec => rec.implementationCost === 'low' && rec.priority === 'high')
      .slice(0, 3);

    recommendations.longTermImprovements = recommendations.prioritizedRecommendations
      .filter(rec => rec.implementationCost === 'high')
      .slice(0, 3);

    // 生成成本效益分析
    recommendations.costBenefitAnalysis = this.generateCostBenefitAnalysis(recommendations.prioritizedRecommendations);

    // 生成实施路线图
    recommendations.implementationRoadmap = this.generateImplementationRoadmap(recommendations.prioritizedRecommendations);

    // 估算总体影响
    recommendations.estimatedImpact = this.estimateOverallImpact(recommendations.prioritizedRecommendations, performanceAnalysis);

    console.log(`✅ 生成了 ${recommendations.prioritizedRecommendations.length} 条优化建议`);

    return recommendations;
  }

  /**
   * 分析Core Web Vitals优化机会
   */
  analyzeCoreWebVitals(coreWebVitals) {
    const recommendations = [];

    if (!coreWebVitals) return recommendations;

    // 分析FCP
    if (coreWebVitals.fcp) {
      const fcpRules = this.optimizationRules.coreWebVitals.fcp.rules;
      fcpRules.forEach(rule => {
        if (rule.condition(coreWebVitals)) {
          recommendations.push({
            ...rule,
            currentValue: coreWebVitals.fcp,
            targetValue: this.optimizationRules.coreWebVitals.fcp.threshold,
            metric: 'FCP'
          });
        }
      });
    }

    // 分析LCP
    if (coreWebVitals.lcp) {
      const lcpRules = this.optimizationRules.coreWebVitals.lcp.rules;
      lcpRules.forEach(rule => {
        if (rule.condition(coreWebVitals)) {
          recommendations.push({
            ...rule,
            currentValue: coreWebVitals.lcp,
            targetValue: this.optimizationRules.coreWebVitals.lcp.threshold,
            metric: 'LCP'
          });
        }
      });
    }

    // 分析CLS
    if (coreWebVitals.cls) {
      const clsRules = this.optimizationRules.coreWebVitals.cls.rules;
      clsRules.forEach(rule => {
        if (rule.condition(coreWebVitals)) {
          recommendations.push({
            ...rule,
            currentValue: coreWebVitals.cls,
            targetValue: this.optimizationRules.coreWebVitals.cls.threshold,
            metric: 'CLS'
          });
        }
      });
    }

    return recommendations;
  }

  /**
   * 分析资源优化机会
   */
  analyzeResourceOptimization(resources) {
    const recommendations = [];

    if (!resources) return recommendations;

    // 分析图片优化
    const imageAnalysis = this.analyzeImageOptimization(resources);
    if (imageAnalysis.unoptimizedImages > 0) {
      const imageRules = this.optimizationRules.resources.images.rules;
      imageRules.forEach(rule => {
        if (rule.condition(imageAnalysis)) {
          recommendations.push({
            ...rule,
            currentValue: imageAnalysis.unoptimizedImages,
            details: imageAnalysis
          });
        }
      });
    }

    // 分析JavaScript优化
    const jsAnalysis = this.analyzeJavaScriptOptimization(resources);
    if (jsAnalysis.unusedJavaScript > 30) {
      const jsRules = this.optimizationRules.resources.javascript.rules;
      jsRules.forEach(rule => {
        if (rule.condition(jsAnalysis)) {
          recommendations.push({
            ...rule,
            currentValue: jsAnalysis.unusedJavaScript,
            details: jsAnalysis
          });
        }
      });
    }

    return recommendations;
  }

  /**
   * 分析图片优化机会
   */
  analyzeImageOptimization(resources) {
    const analysis = {
      totalImages: 0,
      unoptimizedImages: 0,
      totalImageSize: 0,
      potentialSavings: 0,
      issues: []
    };

    if (resources.images) {
      analysis.totalImages = resources.images.length;

      resources.images.forEach(image => {
        // 检查图片格式
        if (!image.url.match(/\.(webp|avif)$/i)) {
          analysis.unoptimizedImages++;
          analysis.issues.push({
            type: 'format',
            url: image.url,
            suggestion: '使用现代图片格式（WebP/AVIF）'
          });
        }

        // 检查图片大小
        if (image.size > 500000) { // 500KB
          analysis.unoptimizedImages++;
          analysis.issues.push({
            type: 'size',
            url: image.url,
            size: image.size,
            suggestion: '压缩图片文件大小'
          });
        }

        analysis.totalImageSize += image.size || 0;
      });

      // 估算潜在节省
      analysis.potentialSavings = Math.round(analysis.totalImageSize * 0.6); // 假设可节省60%
    }

    return analysis;
  }

  /**
   * 分析JavaScript优化机会
   */
  analyzeJavaScriptOptimization(resources) {
    const analysis = {
      totalJavaScript: 0,
      unusedJavaScript: 0,
      totalJSSize: 0,
      potentialSavings: 0,
      issues: []
    };

    if (resources.scripts) {
      resources.scripts.forEach(script => {
        analysis.totalJSSize += script.size || 0;

        // 简化的未使用代码检测
        if (script.coverage && script.coverage < 70) {
          const unusedSize = script.size * (1 - script.coverage / 100);
          analysis.unusedJavaScript += unusedSize;
          analysis.issues.push({
            type: 'unused_code',
            url: script.url,
            coverage: script.coverage,
            unusedSize,
            suggestion: '移除未使用的代码或实施代码分割'
          });
        }
      });

      analysis.unusedJavaScript = (analysis.unusedJavaScript / analysis.totalJSSize) * 100;
      analysis.potentialSavings = Math.round(analysis.totalJSSize * (analysis.unusedJavaScript / 100));
    }

    return analysis;
  }

  /**
   * 分析缓存策略
   */
  analyzeCachingStrategy(performanceAnalysis) {
    const recommendations = [];
    const analysis = {
      hasServiceWorker: false,
      cacheableResources: 0,
      uncachedResources: 0
    };

    // 检查Service Worker
    if (performanceAnalysis.serviceWorker) {
      analysis.hasServiceWorker = performanceAnalysis.serviceWorker.registered;
    }

    // 检查资源缓存
    if (performanceAnalysis.resources) {
      const resources = [
        ...(performanceAnalysis.resources.scripts || []),
        ...(performanceAnalysis.resources.stylesheets || []),
        ...(performanceAnalysis.resources.images || [])
      ];

      resources.forEach(resource => {
        if (resource.cacheable) {
          analysis.cacheableResources++;
        } else {
          analysis.uncachedResources++;
        }
      });
    }

    // 应用缓存规则
    const cachingRules = this.optimizationRules.caching.rules;
    cachingRules.forEach(rule => {
      if (rule.condition(analysis)) {
        recommendations.push({
          ...rule,
          details: analysis
        });
      }
    });

    return recommendations;
  }

  /**
   * 生成成本效益分析
   */
  generateCostBenefitAnalysis(recommendations) {
    const analysis = {
      totalImplementationCost: 0,
      totalEstimatedBenefit: 0,
      roi: 0,
      paybackPeriod: 0,
      recommendations: []
    };

    recommendations.forEach(rec => {
      const cost = this.costBenefitModel.implementationCosts[rec.implementationCost];
      const benefit = this.estimateRecommendationBenefit(rec);

      analysis.totalImplementationCost += cost.cost;
      analysis.totalEstimatedBenefit += benefit.annualValue;

      analysis.recommendations.push({
        title: rec.title,
        cost: cost.cost,
        benefit: benefit.annualValue,
        roi: benefit.annualValue > 0 ? (benefit.annualValue - cost.cost) / cost.cost : 0,
        paybackMonths: cost.cost > 0 ? Math.ceil(cost.cost / (benefit.annualValue / 12)) : 0
      });
    });

    analysis.roi = analysis.totalImplementationCost > 0 ?
      (analysis.totalEstimatedBenefit - analysis.totalImplementationCost) / analysis.totalImplementationCost : 0;

    analysis.paybackPeriod = analysis.totalEstimatedBenefit > 0 ?
      Math.ceil(analysis.totalImplementationCost / (analysis.totalEstimatedBenefit / 12)) : 0;

    return analysis;
  }

  /**
   * 估算单个建议的收益
   */
  estimateRecommendationBenefit(recommendation) {
    const benefit = {
      performanceImprovement: 0,
      conversionImprovement: 0,
      seoImprovement: 0,
      annualValue: 0
    };

    // 基于改进百分比估算收益
    const improvementMatch = recommendation.estimatedImprovement.match(/(\d+)-?(\d+)?%/);
    if (improvementMatch) {
      const minImprovement = parseInt(improvementMatch[1]);
      const maxImprovement = parseInt(improvementMatch[2]) || minImprovement;
      const avgImprovement = (minImprovement + maxImprovement) / 2;

      benefit.performanceImprovement = avgImprovement;
      benefit.conversionImprovement = avgImprovement * this.costBenefitModel.performanceValue.conversionImpact;
      benefit.seoImprovement = avgImprovement * this.costBenefitModel.performanceValue.seoImpact;

      // 简化的年度价值计算（假设基础年收入100万）
      const baseAnnualRevenue = 1000000;
      benefit.annualValue = baseAnnualRevenue * (benefit.conversionImprovement / 100);
    }

    return benefit;
  }

  /**
   * 生成实施路线图
   */
  generateImplementationRoadmap(recommendations) {
    const roadmap = {
      phase1: { // 第一阶段：快速胜利（1-2周）
        title: '快速胜利阶段',
        duration: '1-2周',
        recommendations: [],
        estimatedImpact: 'medium'
      },
      phase2: { // 第二阶段：中等改进（1个月）
        title: '核心优化阶段',
        duration: '1个月',
        recommendations: [],
        estimatedImpact: 'high'
      },
      phase3: { // 第三阶段：长期改进（2-3个月）
        title: '深度优化阶段',
        duration: '2-3个月',
        recommendations: [],
        estimatedImpact: 'high'
      }
    };

    recommendations.forEach(rec => {
      if (rec.implementationCost === 'low') {
        roadmap.phase1.recommendations.push(rec);
      } else if (rec.implementationCost === 'medium') {
        roadmap.phase2.recommendations.push(rec);
      } else {
        roadmap.phase3.recommendations.push(rec);
      }
    });

    return roadmap;
  }

  /**
   * 估算总体影响
   */
  estimateOverallImpact(recommendations, performanceAnalysis) {
    const impact = {
      loadTimeImprovement: 0,
      coreWebVitalsImprovement: {
        fcp: 0,
        lcp: 0,
        cls: 0
      },
      userExperienceScore: 0,
      seoScore: 0,
      conversionRateImprovement: 0
    };

    // 累计所有建议的影响
    recommendations.forEach(rec => {
      const improvementMatch = rec.estimatedImprovement.match(/(\d+)-?(\d+)?%/);
      if (improvementMatch) {
        const avgImprovement = (parseInt(improvementMatch[1]) + (parseInt(improvementMatch[2]) || parseInt(improvementMatch[1]))) / 2;

        if (rec.metric === 'FCP') {
          impact.coreWebVitalsImprovement.fcp += avgImprovement;
        } else if (rec.metric === 'LCP') {
          impact.coreWebVitalsImprovement.lcp += avgImprovement;
        } else if (rec.metric === 'CLS') {
          impact.coreWebVitalsImprovement.cls += avgImprovement;
        }

        impact.loadTimeImprovement += avgImprovement * 0.3; // 权重调整
      }
    });

    // 计算综合评分改进
    impact.userExperienceScore = Math.min(100, (impact.loadTimeImprovement +
      impact.coreWebVitalsImprovement.fcp +
      impact.coreWebVitalsImprovement.lcp +
      impact.coreWebVitalsImprovement.cls) / 4);

    impact.seoScore = impact.userExperienceScore * 0.8; // SEO与性能相关性
    impact.conversionRateImprovement = impact.userExperienceScore * 0.02; // 每1%性能提升对转化率的影响

    return impact;
  }

  /**
   * 生成优化报告
   */
  generateOptimizationReport(recommendations) {
    return {
      executiveSummary: {
        totalRecommendations: recommendations.prioritizedRecommendations.length,
        quickWins: recommendations.quickWins.length,
        estimatedROI: recommendations.costBenefitAnalysis?.roi || 0,
        implementationTime: this.calculateTotalImplementationTime(recommendations.prioritizedRecommendations),
        expectedImpact: recommendations.estimatedImpact?.userExperienceScore || 0
      },
      priorityMatrix: this.createPriorityMatrix(recommendations.prioritizedRecommendations),
      implementationGuide: this.createImplementationGuide(recommendations.implementationRoadmap),
      monitoringPlan: this.createMonitoringPlan(recommendations.prioritizedRecommendations)
    };
  }

  /**
   * 计算总实施时间
   */
  calculateTotalImplementationTime(recommendations) {
    let totalHours = 0;
    recommendations.forEach(rec => {
      const cost = this.costBenefitModel.implementationCosts[rec.implementationCost];
      totalHours += cost.hours;
    });
    return {
      hours: totalHours,
      days: Math.ceil(totalHours / 8),
      weeks: Math.ceil(totalHours / 40)
    };
  }

  /**
   * 创建优先级矩阵
   */
  createPriorityMatrix(recommendations) {
    return {
      highImpactLowCost: recommendations.filter(r => r.priority === 'high' && r.implementationCost === 'low'),
      highImpactMediumCost: recommendations.filter(r => r.priority === 'high' && r.implementationCost === 'medium'),
      highImpactHighCost: recommendations.filter(r => r.priority === 'high' && r.implementationCost === 'high'),
      mediumImpactLowCost: recommendations.filter(r => r.priority === 'medium' && r.implementationCost === 'low')
    };
  }

  /**
   * 创建实施指南
   */
  createImplementationGuide(roadmap) {
    return {
      overview: '按阶段实施性能优化，确保最大化投资回报',
      phases: Object.entries(roadmap).map(([phase, data]) => ({
        phase,
        title: data.title,
        duration: data.duration,
        taskCount: data.recommendations.length,
        keyTasks: data.recommendations.slice(0, 3).map(r => r.title)
      })),
      successMetrics: [
        'Core Web Vitals改进',
        '页面加载时间减少',
        '用户体验评分提升',
        '转化率改善'
      ]
    };
  }

  /**
   * 创建监控计划
   */
  createMonitoringPlan(recommendations) {
    return {
      keyMetrics: [
        'First Contentful Paint (FCP)',
        'Largest Contentful Paint (LCP)',
        'Cumulative Layout Shift (CLS)',
        'Time to Interactive (TTI)',
        'Total Blocking Time (TBT)'
      ],
      monitoringFrequency: '每日监控，每周报告',
      alertThresholds: {
        fcp: 1800,
        lcp: 2500,
        cls: 0.1
      },
      reportingSchedule: {
        daily: '关键指标监控',
        weekly: '趋势分析报告',
        monthly: '优化效果评估'
      }
    };
  }
}

module.exports = PerformanceOptimizationEngine;
