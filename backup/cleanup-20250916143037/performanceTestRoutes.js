/**
 * 性能测试路由
 * 使用Lighthouse和Chrome进行Web性能分析
 */

const express = require('express');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const router = express.Router();

// Core Web Vitals 阈值定义
const CWV_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FCP: { good: 1800, poor: 3000 },
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  FID: { good: 100, poor: 300 },
  TTFB: { good: 800, poor: 1800 }
};

// 评级判断函数
const getRating = (value, thresholds) => {
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
};

// 性能测试主接口
router.post('/api/test/performance', async (req, res) => {
  const {
    config = {}
  } = req.body;
  
  const {
    url,
    device = 'desktop',
    throttling = 'none',
    categories = ['performance', 'accessibility', 'best-practices', 'seo'],
    iterations = 1,
    compareUrl
  } = config;

  // 验证输入
  if (!url) {
    return res.status(400).json({
      success: false,
      error: '请提供测试URL'
    });
  }

  // 设备和网络配置映射
  const formFactor = device === 'mobile' ? 'mobile' : 'desktop';
  const throttlingConfigs = {
    'none': {
      rttMs: 0,
      throughputKbps: 0,
      cpuSlowdownMultiplier: 1
    },
    '4G': {
      rttMs: 150,
      throughputKbps: 16000,
      cpuSlowdownMultiplier: 2
    },
    '3G': {
      rttMs: 300,
      throughputKbps: 1600,
      cpuSlowdownMultiplier: 4
    }
  };

  let chrome;
  
  try {
    // 启动Chrome
    chrome = await chromeLauncher.launch({
      chromeFlags: [
        '--headless=new',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const results = [];
    
    // 执行多次测试以获得平均值
    for (let i = 0; i < iterations; i++) {
      const flags = {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
        disableNetworkThrottling: throttling === 'none',
        disableCpuThrottling: throttling === 'none'
      };

      const config = {
        extends: 'lighthouse:default',
        settings: {
          emulatedFormFactor: formFactor,
          throttling: throttlingConfigs[throttling] || throttlingConfigs['none'],
          onlyCategories: categories,
          skipAudits: null
        }
      };

      try {
        const runnerResult = await lighthouse(url, flags, config);
        if (runnerResult && runnerResult.lhr) {
          results.push(runnerResult.lhr);
        }
      } catch (error) {
        console.error('Lighthouse运行错误:', error);
      }
    }

    if (results.length === 0) {
      throw new Error('无法获取测试结果');
    }

    // 取最后一次结果（或可以计算平均值）
    const lhr = results[results.length - 1];

    // 提取Core Web Vitals
    const coreWebVitals = {
      LCP: {
        value: (lhr.audits['largest-contentful-paint']?.numericValue || 0) / 1000,
        score: String(lhr.audits['largest-contentful-paint']?.score || 0),
        rating: getRating(
          lhr.audits['largest-contentful-paint']?.numericValue || 0,
          CWV_THRESHOLDS.LCP
        )
      },
      FCP: {
        value: (lhr.audits['first-contentful-paint']?.numericValue || 0) / 1000,
        score: String(lhr.audits['first-contentful-paint']?.score || 0),
        rating: getRating(
          lhr.audits['first-contentful-paint']?.numericValue || 0,
          CWV_THRESHOLDS.FCP
        )
      },
      CLS: {
        value: lhr.audits['cumulative-layout-shift']?.numericValue || 0,
        score: String(lhr.audits['cumulative-layout-shift']?.score || 0),
        rating: getRating(
          lhr.audits['cumulative-layout-shift']?.numericValue || 0,
          CWV_THRESHOLDS.CLS
        )
      },
      INP: {
        value: lhr.audits['interaction-to-next-paint']?.numericValue || 0,
        score: String(lhr.audits['interaction-to-next-paint']?.score || 0),
        rating: getRating(
          lhr.audits['interaction-to-next-paint']?.numericValue || 0,
          CWV_THRESHOLDS.INP
        )
      },
      FID: {
        value: lhr.audits['max-potential-fid']?.numericValue || 0,
        score: String(lhr.audits['max-potential-fid']?.score || 0),
        rating: getRating(
          lhr.audits['max-potential-fid']?.numericValue || 0,
          CWV_THRESHOLDS.FID
        )
      },
      TTFB: {
        value: lhr.audits['server-response-time']?.numericValue || 0,
        score: String(lhr.audits['server-response-time']?.score || 0),
        rating: getRating(
          lhr.audits['server-response-time']?.numericValue || 0,
          CWV_THRESHOLDS.TTFB
        )
      }
    };

    // 提取优化建议
    const opportunities = [];
    const opportunityAudits = [
      'uses-optimized-images',
      'uses-webp-images',
      'uses-text-compression',
      'uses-responsive-images',
      'unminified-css',
      'unminified-javascript',
      'unused-css-rules',
      'unused-javascript',
      'modern-image-formats',
      'efficient-animated-content',
      'duplicated-javascript',
      'legacy-javascript'
    ];

    for (const auditId of opportunityAudits) {
      const audit = lhr.audits[auditId];
      if (audit && audit.score !== null && audit.score < 0.9) {
        opportunities.push({
          title: audit.title,
          description: audit.description,
          savings: (audit.numericValue || 0) / 1000,
          impact: audit.score < 0.5 ? 'high' : audit.score < 0.8 ? 'medium' : 'low'
        });
      }
    }

    // 提取诊断信息
    const diagnostics = [];
    const diagnosticAudits = [
      'font-display',
      'critical-request-chains',
      'mainthread-work-breakdown',
      'bootup-time',
      'uses-long-cache-ttl',
      'total-byte-weight'
    ];

    for (const auditId of diagnosticAudits) {
      const audit = lhr.audits[auditId];
      if (audit && audit.score !== null && audit.score < 0.9) {
        diagnostics.push({
          title: audit.title,
          description: audit.description,
          details: audit.displayValue || ''
        });
      }
    }

    // 计算资源大小
    const resourceSummary = lhr.audits['resource-summary'];
    const networkRequests = lhr.audits['network-requests'];
    
    let scriptSize = 0;
    let styleSize = 0;
    let imageSize = 0;
    let fontSize = 0;
    let otherSize = 0;
    let totalSize = 0;

    if (networkRequests && networkRequests.details && networkRequests.details.items) {
      for (const item of networkRequests.details.items) {
        const size = item.transferSize || 0;
        totalSize += size;
        
        if (item.resourceType === 'Script') {
          scriptSize += size;
        } else if (item.resourceType === 'Stylesheet') {
          styleSize += size;
        } else if (item.resourceType === 'Image') {
          imageSize += size;
        } else if (item.resourceType === 'Font') {
          fontSize += size;
        } else {
          otherSize += size;
        }
      }
    }

    // 构建响应数据
    const responseData = {
      testId: `perf_${Date.now()}`,
      url,
      timestamp: new Date(),
      scores: {
        performance: Math.round((lhr.categories.performance?.score || 0) * 100),
        accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
        seo: Math.round((lhr.categories.seo?.score || 0) * 100),
        pwa: Math.round((lhr.categories.pwa?.score || 0) * 100)
      },
      coreWebVitals,
      metrics: {
        firstContentfulPaint: lhr.audits['first-contentful-paint']?.numericValue || 0,
        speedIndex: lhr.audits['speed-index']?.numericValue || 0,
        timeToInteractive: lhr.audits['interactive']?.numericValue || 0,
        totalBlockingTime: lhr.audits['total-blocking-time']?.numericValue || 0,
        cumulativeLayoutShift: lhr.audits['cumulative-layout-shift']?.numericValue || 0,
        largestContentfulPaint: lhr.audits['largest-contentful-paint']?.numericValue || 0
      },
      opportunities: opportunities.sort((a, b) => b.savings - a.savings).slice(0, 10),
      diagnostics: diagnostics.slice(0, 10),
      resources: {
        totalSize,
        scriptSize,
        styleSize,
        imageSize,
        fontSize,
        otherSize
      },
      screenshots: {
        initial: lhr.audits['screenshot-thumbnails']?.details?.items?.[0]?.data || null,
        final: lhr.audits['final-screenshot']?.details?.data || null,
        filmstrip: lhr.audits['screenshot-thumbnails']?.details?.items?.map(item => item.data) || []
      }
    };

    // 如果有对比URL，也运行测试
    let compareData = null;
    if (compareUrl) {
      try {
        const compareFlags = {
          port: chrome.port,
          output: 'json',
          logLevel: 'error'
        };

        const compareResult = await lighthouse(compareUrl, compareFlags, config);
        if (compareResult && compareResult.lhr) {
          const compareLhr = compareResult.lhr;
          compareData = {
            url: compareUrl,
            scores: {
              performance: Math.round((compareLhr.categories.performance?.score || 0) * 100),
              accessibility: Math.round((compareLhr.categories.accessibility?.score || 0) * 100),
              bestPractices: Math.round((compareLhr.categories['best-practices']?.score || 0) * 100),
              seo: Math.round((compareLhr.categories.seo?.score || 0) * 100),
              pwa: Math.round((compareLhr.categories.pwa?.score || 0) * 100)
            }
          };
        }
      } catch (error) {
        console.error('对比URL测试失败:', error);
      }
    }

    res.json({
      success: true,
      data: responseData,
      compareData
    });

  } catch (error) {
    console.error('性能测试错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '性能测试失败'
    });
  } finally {
    // 确保Chrome被关闭
    if (chrome) {
      try {
        await chrome.kill();
      } catch (error) {
        console.error('关闭Chrome时出错:', error);
      }
    }
  }
});

// 获取性能测试历史记录（示例接口，需要数据库支持）
router.get('/api/test/performance/history', async (req, res) => {
  // TODO: 从数据库获取历史记录
  res.json({
    success: true,
    data: []
  });
});

// 获取单个测试详情（示例接口，需要数据库支持）
router.get('/api/test/performance/:testId', async (req, res) => {
  const { testId } = req.params;
  
  // TODO: 从数据库获取测试详情
  res.json({
    success: false,
    error: '测试记录未找到'
  });
});

module.exports = router;
