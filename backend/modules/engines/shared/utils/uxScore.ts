type UXMetrics = {
  lcp?: number;
  cls?: number;
  fcp?: number;
  fid?: number;
  inp?: number;
  tbt?: number;
  longTaskCount?: number;
  navigation?: {
    ttfb?: number;
    dcl?: number;
    loadTime?: number;
    domContentLoaded?: number;
    domInteractive?: number;
  } | null;
};

/**
 * Lighthouse 风格对数正态分布评分函数。
 * 给定指标值 value、中位数 median（得 50 分的值）和 p10（得 90 分的值），
 * 返回 0-100 的分数。
 *
 * 参考: https://developer.chrome.com/docs/lighthouse/performance/performance-scoring
 */
function logNormalScore(value: number, p10: number, median: number): number {
  if (value <= 0) return 100;
  if (median <= 0 || p10 <= 0 || p10 >= median) return value <= p10 ? 100 : 0;

  // 对数正态 CDF 参数
  const logMedian = Math.log(median);
  const logP10 = Math.log(p10);
  // σ = (logMedian - logP10) / (√2 × erfinv(0.8))
  // erfinv(0.8) ≈ 0.9061938024
  const sigma = (logMedian - logP10) / (Math.SQRT2 * 0.9061938024);
  const mu = logMedian;

  // 标准正态 CDF 近似 (Abramowitz & Stegun)
  const z = (Math.log(value) - mu) / sigma;
  const cdf = normalCDF(z);

  // Lighthouse 将 CDF 映射为 1 - CDF（值越小越好）
  const score = (1 - cdf) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** 标准正态分布 CDF 近似 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return 0.5 * (1.0 + sign * y);
}

/**
 * 各指标的评分参数 { p10, median, weight }
 * p10 = 得 90 分的阈值（Google "Good" 阈值）
 * median = 得 50 分的阈值（Google "Poor" 阈值附近）
 * weight = 在综合评分中的权重
 *
 * 参考 Lighthouse v11 权重:
 * FCP 10%, LCP 25%, TBT 30%, CLS 25%, SI 10% (Speed Index)
 * 我们用 INP 替代 SI，用 TTFB 作为补充
 */
const METRIC_PARAMS: Record<string, { p10: number; median: number; weight: number }> = {
  fcp: { p10: 1800, median: 3000, weight: 0.1 },
  lcp: { p10: 2500, median: 4000, weight: 0.25 },
  tbt: { p10: 200, median: 600, weight: 0.25 },
  cls: { p10: 0.1, median: 0.25, weight: 0.25 },
  inp: { p10: 200, median: 500, weight: 0.1 },
  ttfb: { p10: 800, median: 1800, weight: 0.05 },
};

const calculateUXScore = (metrics: UXMetrics): number => {
  const values: Record<string, number> = {
    fcp: Number(metrics.fcp || 0),
    lcp: Number(metrics.lcp || 0),
    tbt: Number(metrics.tbt || 0),
    cls: Number(metrics.cls || 0),
    inp: Number(metrics.inp || 0),
    ttfb: Number(metrics.navigation?.ttfb || 0),
  };

  let totalWeight = 0;
  let weightedScore = 0;

  for (const [key, params] of Object.entries(METRIC_PARAMS)) {
    const value = values[key];
    if (value === undefined) continue;

    const metricScore = logNormalScore(value, params.p10, params.median);
    weightedScore += metricScore * params.weight;
    totalWeight += params.weight;
  }

  if (totalWeight === 0) return 0;
  return Math.max(0, Math.min(100, Math.round(weightedScore / totalWeight)));
};

/**
 * 单项指标评分（供前端展示各指标独立分数）
 */
const calculateMetricScore = (metricKey: string, value: number): number => {
  const params = METRIC_PARAMS[metricKey];
  if (!params) return 0;
  return logNormalScore(value, params.p10, params.median);
};

const scoreToGrade = (score: number): string => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 40) return 'D';
  return 'F';
};

export { METRIC_PARAMS, calculateMetricScore, calculateUXScore, scoreToGrade };
