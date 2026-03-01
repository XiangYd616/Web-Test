/**
 * 统一的色彩工具函数
 * 所有面板共享同一套颜色规范，确保品牌一致性
 */

/** Web Vitals 评级颜色（good / needs-improvement / poor） */
export const ratingColor = (rating: string | null): string => {
  if (!rating) return 'text-muted-foreground bg-muted/30';
  const r = rating.toLowerCase();
  if (r === 'good') return 'text-green-600 bg-green-50 dark:bg-green-950/30';
  if (r === 'needs-improvement' || r === 'needsimprovement')
    return 'text-orange-600 bg-orange-50 dark:bg-orange-950/30';
  if (r === 'poor') return 'text-red-600 bg-red-50 dark:bg-red-950/30';
  return 'text-muted-foreground bg-muted/30';
};

/** Web Vitals 评级标签 */
export const ratingLabel = (rating: string | null): string => {
  if (rating === 'good') return '良好';
  if (rating === 'needs-improvement') return '待改善';
  if (rating === 'poor') return '较差';
  return '-';
};

/** 分数颜色（0-100 分制） */
export const scoreColor = (score: number | null): string => {
  if (score === null) return 'text-muted-foreground';
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-blue-600';
  if (score >= 50) return 'text-orange-500';
  return 'text-red-500';
};

/** 分数背景色（卡片用） */
export const scoreBgColor = (score: number | null): string => {
  if (score === null) return 'bg-muted/30';
  if (score >= 90) return 'bg-green-50 dark:bg-green-950/30';
  if (score >= 70) return 'bg-blue-50 dark:bg-blue-950/30';
  if (score >= 50) return 'bg-orange-50 dark:bg-orange-950/30';
  return 'bg-red-50 dark:bg-red-950/30';
};

/** 严重性颜色（critical / high / medium / low） */
export const severityColor = (severity: string): string => {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'bg-red-600 hover:bg-red-700 text-white';
    case 'high':
      return 'bg-red-500 hover:bg-red-600 text-white';
    case 'medium':
      return 'bg-orange-500 hover:bg-orange-600 text-white';
    case 'low':
      return 'bg-blue-500 hover:bg-blue-600 text-white';
    case 'info':
      return 'bg-slate-500 hover:bg-slate-600 text-white';
    default:
      return 'bg-slate-500 hover:bg-slate-600 text-white';
  }
};

/** 严重性标签 */
export const severityLabel = (severity: string): string => {
  switch (severity.toLowerCase()) {
    case 'critical':
      return '严重';
    case 'high':
      return '高';
    case 'medium':
      return '中';
    case 'low':
      return '低';
    case 'info':
      return '信息';
    default:
      return severity;
  }
};

/** 等级颜色（A-F 等级制） */
export const gradeColor = (grade: string): string => {
  switch (grade.toUpperCase()) {
    case 'A':
    case 'A+':
      return 'text-green-600';
    case 'B':
    case 'B+':
      return 'text-blue-600';
    case 'C':
    case 'C+':
      return 'text-orange-500';
    case 'D':
      return 'text-orange-600';
    default:
      return 'text-red-500';
  }
};

/** 图表调色板（一致的图表颜色序列） */
export const CHART_COLORS = {
  green: 'rgba(34, 197, 94, 0.65)',
  blue: 'rgba(59, 130, 246, 0.65)',
  red: 'rgba(239, 68, 68, 0.65)',
  orange: 'rgba(249, 115, 22, 0.65)',
  purple: 'rgba(168, 85, 247, 0.65)',
  cyan: 'rgba(6, 182, 212, 0.65)',
  pink: 'rgba(236, 72, 153, 0.65)',
  amber: 'rgba(245, 158, 11, 0.65)',
} as const;

/** 图表调色板数组（按顺序取色） */
export const CHART_PALETTE = [
  CHART_COLORS.blue,
  CHART_COLORS.green,
  CHART_COLORS.orange,
  CHART_COLORS.red,
  CHART_COLORS.purple,
  CHART_COLORS.cyan,
  CHART_COLORS.pink,
  CHART_COLORS.amber,
] as const;
