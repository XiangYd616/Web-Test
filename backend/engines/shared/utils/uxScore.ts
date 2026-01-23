type UXMetrics = {
  lcp?: number;
  cls?: number;
  navigation?: { ttfb?: number } | null;
};

const calculateUXScore = (metrics: UXMetrics) => {
  const lcp = Number(metrics.lcp || 0);
  const cls = Number(metrics.cls || 0);
  const ttfb = Number(metrics.navigation?.ttfb || 0);

  let score = 100;
  if (lcp > 2500) score -= Math.min(30, Math.round((lcp - 2500) / 100));
  if (cls > 0.1) score -= Math.min(20, Math.round((cls - 0.1) * 100));
  if (ttfb > 800) score -= Math.min(20, Math.round((ttfb - 800) / 50));
  return Math.max(0, Math.min(100, score));
};

const scoreToGrade = (score: number) => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

module.exports = {
  calculateUXScore,
  scoreToGrade,
};

export {};
