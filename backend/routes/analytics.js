/**
 * 高级分析API路由
 * 提供趋势分析、对比分析、性能分析等功能
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authMiddleware } = require('../middleware/auth');

// 应用认证中间件
router.use(authMiddleware);

/**
 * 趋势分析
 */
router.post('/trend', asyncHandler(async (req, res) => {
  const { dataPoints, options = {} } = req.body;

  if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length < 2) {
    return res.status(400).json({
      success: false,
      message: '需要至少2个数据点进行趋势分析'
    });
  }

  try {
    const result = await performTrendAnalysis(dataPoints, options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('趋势分析失败:', error);
    res.status(500).json({
      success: false,
      message: '趋势分析失败',
      error: error.message
    });
  }
}));

/**
 * 对比分析
 */
router.post('/compare', asyncHandler(async (req, res) => {
  const { baseline, comparison, options = {} } = req.body;

  if (!baseline || !comparison || !Array.isArray(baseline) || !Array.isArray(comparison)) {
    return res.status(400).json({
      success: false,
      message: '需要提供基准数据和对比数据'
    });
  }

  try {
    const result = await performComparisonAnalysis(baseline, comparison, options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('对比分析失败:', error);
    res.status(500).json({
      success: false,
      message: '对比分析失败',
      error: error.message
    });
  }
}));

/**
 * 性能指标分析
 */
router.post('/performance', asyncHandler(async (req, res) => {
  const { filter = {} } = req.body;

  try {
    const result = await analyzePerformanceMetrics(filter, req.user.id);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('性能分析失败:', error);
    res.status(500).json({
      success: false,
      message: '性能分析失败',
      error: error.message
    });
  }
}));

/**
 * 智能洞察
 */
router.post('/insights', asyncHandler(async (req, res) => {
  const { dataType, timeRange = '7d' } = req.body;

  if (!dataType) {
    return res.status(400).json({
      success: false,
      message: '需要指定数据类型'
    });
  }

  try {
    const result = await generateInsights(dataType, timeRange, req.user.id);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('洞察分析失败:', error);
    res.status(500).json({
      success: false,
      message: '洞察分析失败',
      error: error.message
    });
  }
}));

/**
 * 执行趋势分析
 */
async function performTrendAnalysis(dataPoints, options) {
  const {
    predictionDays = 7,
    smoothing = true,
    seasonality = false
  } = options;

  // 数据预处理
  const processedData = smoothing ? applySmoothing(dataPoints) : dataPoints;
  
  // 线性回归分析
  const regression = calculateLinearRegression(processedData);
  
  // 确定趋势
  const trend = regression.slope > 0.1 ? 'increasing' : 
                regression.slope < -0.1 ? 'decreasing' : 'stable';
  
  const trendStrength = Math.min(Math.abs(regression.slope) / 10, 1);
  
  // 计算变化率
  const firstValue = processedData[0].value;
  const lastValue = processedData[processedData.length - 1].value;
  const changeRate = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
  
  // 生成预测
  const prediction = generatePrediction(processedData, regression, predictionDays);
  
  // 计算置信度
  const confidence = calculateConfidence(processedData, regression);
  
  // 生成洞察
  const insights = generateTrendInsights(trend, trendStrength, changeRate, confidence);
  
  return {
    trend,
    trendStrength,
    changeRate,
    prediction,
    confidence,
    insights
  };
}

/**
 * 执行对比分析
 */
async function performComparisonAnalysis(baseline, comparison, options) {
  const {
    alignByTime = true,
    significanceThreshold = 0.05,
    includeStatistics = true
  } = options;

  // 数据对齐
  const { alignedBaseline, alignedComparison } = alignByTime ? 
    alignDataByTime(baseline, comparison) : 
    { alignedBaseline: baseline, alignedComparison: comparison };

  const minLength = Math.min(alignedBaseline.length, alignedComparison.length);
  const baselineData = alignedBaseline.slice(0, minLength);
  const comparisonData = alignedComparison.slice(0, minLength);

  // 计算差异
  const absolute = baselineData.map((b, i) => comparisonData[i].value - b.value);
  const percentage = baselineData.map((b, i) => 
    b.value !== 0 ? ((comparisonData[i].value - b.value) / b.value) * 100 : 0
  );
  
  // 显著性检验
  const significant = percentage.map(p => Math.abs(p) > significanceThreshold * 100);
  
  // 统计摘要
  const summary = {
    averageDifference: absolute.reduce((a, b) => a + b, 0) / absolute.length,
    maxDifference: Math.max(...absolute.map(Math.abs)),
    minDifference: Math.min(...absolute.map(Math.abs)),
    significantChanges: significant.filter(Boolean).length
  };

  // 生成洞察
  const insights = generateComparisonInsights(summary, significant.length);

  return {
    baseline: baselineData,
    comparison: comparisonData,
    differences: { absolute, percentage, significant },
    summary,
    insights
  };
}

/**
 * 分析性能指标
 */
async function analyzePerformanceMetrics(filter, userId) {
  // 这里应该从数据库获取真实数据
  // 目前返回模拟数据
  const now = Date.now();
  const generateMetricData = (baseValue, variance, count = 24) => {
    return Array.from({ length: count }, (_, i) => ({
      timestamp: new Date(now - (count - i) * 60 * 60 * 1000).toISOString(),
      value: Math.max(0, baseValue + (Math.random() - 0.5) * variance),
      metadata: { userId, generated: true }
    }));
  };

  return {
    responseTime: generateMetricData(200, 100),
    throughput: generateMetricData(1000, 200),
    errorRate: generateMetricData(2, 1),
    availability: generateMetricData(99.5, 0.5),
    userSatisfaction: generateMetricData(4.2, 0.8)
  };
}

/**
 * 生成智能洞察
 */
async function generateInsights(dataType, timeRange, userId) {
  // 这里应该基于真实数据生成洞察
  // 目前返回模拟洞察
  const insightTemplates = {
    performance: {
      insights: [
        '响应时间在过去24小时内平均为200ms，符合预期',
        '吞吐量保持稳定，峰值出现在上午10-11点',
        '错误率控制在2%以下，系统运行良好',
        '用户满意度评分为4.2/5，表现优秀'
      ],
      recommendations: [
        '建议在高峰期增加服务器资源',
        '优化数据库查询以进一步降低响应时间',
        '实施缓存策略提升系统性能',
        '设置自动化监控告警'
      ],
      alerts: []
    },
    security: {
      insights: [
        '未发现严重安全漏洞',
        'SSL证书配置正确，有效期至2025年',
        '所有API端点都启用了认证',
        '密码策略符合安全要求'
      ],
      recommendations: [
        '建议启用HSTS安全头部',
        '定期进行安全扫描',
        '实施多因素认证',
        '加强日志监控'
      ],
      alerts: []
    },
    seo: {
      insights: [
        'SEO总体得分为85分，表现良好',
        '所有页面都有合适的标题和描述',
        '网站结构清晰，便于搜索引擎抓取',
        '移动端适配良好'
      ],
      recommendations: [
        '优化页面加载速度',
        '增加内部链接',
        '完善图片alt属性',
        '提升内容质量'
      ],
      alerts: []
    },
    accessibility: {
      insights: [
        '可访问性得分为92分，表现优秀',
        '所有图片都有alt属性',
        '颜色对比度符合WCAG标准',
        '键盘导航功能完整'
      ],
      recommendations: [
        '增加屏幕阅读器支持',
        '优化表单标签',
        '提供跳转链接',
        '增加语音导航'
      ],
      alerts: []
    }
  };

  const template = insightTemplates[dataType] || insightTemplates.performance;
  
  return {
    insights: template.insights,
    recommendations: template.recommendations,
    alerts: template.alerts,
    score: 85 + Math.random() * 10,
    generatedAt: new Date().toISOString(),
    timeRange,
    dataType
  };
}

/**
 * 辅助函数
 */

function applySmoothing(dataPoints) {
  if (dataPoints.length < 3) return dataPoints;
  
  const smoothed = [...dataPoints];
  for (let i = 1; i < dataPoints.length - 1; i++) {
    smoothed[i] = {
      ...dataPoints[i],
      value: (dataPoints[i-1].value + dataPoints[i].value + dataPoints[i+1].value) / 3
    };
  }
  return smoothed;
}

function calculateLinearRegression(dataPoints) {
  const n = dataPoints.length;
  const xValues = dataPoints.map((_, i) => i);
  const yValues = dataPoints.map(p => p.value);
  
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
}

function generatePrediction(dataPoints, regression, days) {
  const prediction = [];
  const lastTimestamp = new Date(dataPoints[dataPoints.length - 1].timestamp);
  
  for (let i = 1; i <= days; i++) {
    const predictedValue = regression.slope * (dataPoints.length + i - 1) + regression.intercept;
    const futureDate = new Date(lastTimestamp.getTime() + i * 24 * 60 * 60 * 1000);
    
    prediction.push({
      timestamp: futureDate.toISOString(),
      value: Math.max(0, predictedValue)
    });
  }
  
  return prediction;
}

function calculateConfidence(dataPoints, regression) {
  // 简化的置信度计算
  const predictions = dataPoints.map((_, i) => regression.slope * i + regression.intercept);
  const actual = dataPoints.map(p => p.value);
  
  const mse = predictions.reduce((sum, pred, i) => sum + Math.pow(pred - actual[i], 2), 0) / predictions.length;
  const variance = actual.reduce((sum, val) => sum + Math.pow(val - actual.reduce((a, b) => a + b, 0) / actual.length, 2), 0) / actual.length;
  
  return Math.max(0, Math.min(1, 1 - mse / variance));
}

function generateTrendInsights(trend, strength, changeRate, confidence) {
  const insights = [];
  
  insights.push(`数据呈现${trend === 'increasing' ? '上升' : trend === 'decreasing' ? '下降' : '稳定'}趋势`);
  insights.push(`趋势强度为${(strength * 100).toFixed(1)}%`);
  insights.push(`相对变化率为${changeRate.toFixed(2)}%`);
  insights.push(`预测置信度为${(confidence * 100).toFixed(1)}%`);
  
  if (strength > 0.7) {
    insights.push('趋势非常明显，建议密切关注');
  } else if (strength > 0.3) {
    insights.push('趋势较为明显，需要持续监控');
  } else {
    insights.push('趋势不明显，数据相对稳定');
  }
  
  return insights;
}

function generateComparisonInsights(summary, totalPoints) {
  const insights = [];
  
  insights.push(`平均差异为${summary.averageDifference.toFixed(2)}`);
  insights.push(`最大差异为${summary.maxDifference.toFixed(2)}`);
  insights.push(`显著变化点数量为${summary.significantChanges}/${totalPoints}`);
  
  const significanceRatio = summary.significantChanges / totalPoints;
  if (significanceRatio > 0.5) {
    insights.push('大部分数据点存在显著差异');
  } else if (significanceRatio > 0.2) {
    insights.push('部分数据点存在显著差异');
  } else {
    insights.push('数据差异较小，变化不明显');
  }
  
  return insights;
}

function alignDataByTime(baseline, comparison) {
  // 简化的时间对齐算法
  return { alignedBaseline: baseline, alignedComparison: comparison };
}

module.exports = router;
