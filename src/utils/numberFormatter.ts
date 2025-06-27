/**
 * 数字格式化工具函数
 */

export const formatNumber = (num: number, decimals: number = 2): string => {
  if (isNaN(num)) return '0';
  return Number(num.toFixed(decimals)).toString();
};

export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const formatPercentage = (value: number, total: number, decimals: number = 1): string => {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${formatNumber(percentage, decimals)}%`;
};

export const formatDuration = (milliseconds: number): string => {
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  }
  
  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${formatNumber(seconds, 1)}s`;
  }
  
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${formatNumber(minutes, 1)}m`;
  }
  
  const hours = minutes / 60;
  return `${formatNumber(hours, 1)}h`;
};

export const formatLargeNumber = (num: number): string => {
  if (num < 1000) {
    return num.toString();
  }
  
  if (num < 1000000) {
    return `${formatNumber(num / 1000, 1)}K`;
  }
  
  if (num < 1000000000) {
    return `${formatNumber(num / 1000000, 1)}M`;
  }
  
  return `${formatNumber(num / 1000000000, 1)}B`;
};

export const formatScore = (score: number, maxScore: number = 100): string => {
  const percentage = (score / maxScore) * 100;
  return Math.round(percentage).toString();
};

export const formatResponseTime = (ms: number): string => {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${formatNumber(ms / 1000, 2)}s`;
};

export const formatThroughput = (requestsPerSecond: number): string => {
  if (requestsPerSecond < 1) {
    return `${formatNumber(requestsPerSecond, 2)} req/s`;
  }
  
  if (requestsPerSecond < 1000) {
    return `${formatNumber(requestsPerSecond, 1)} req/s`;
  }
  
  return `${formatNumber(requestsPerSecond / 1000, 1)}K req/s`;
};

export const formatErrorRate = (errors: number, total: number): string => {
  return formatPercentage(errors, total, 2);
};

export const formatUptime = (uptimePercentage: number): string => {
  return `${formatNumber(uptimePercentage, 3)}%`;
};

export const formatLatency = (latency: number): string => {
  return formatResponseTime(latency);
};

export const formatBandwidth = (bytesPerSecond: number): string => {
  return `${formatBytes(bytesPerSecond)}/s`;
};

export const formatCurrency = (amount: number, currency: string = 'CNY'): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN');
};

export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}天前`;
  }
  
  if (hours > 0) {
    return `${hours}小时前`;
  }
  
  if (minutes > 0) {
    return `${minutes}分钟前`;
  }
  
  return `${seconds}秒前`;
};

export const formatRange = (min: number, max: number, unit: string = ''): string => {
  return `${formatNumber(min)} - ${formatNumber(max)}${unit}`;
};

export const formatConfidenceInterval = (value: number, margin: number, unit: string = ''): string => {
  const lower = value - margin;
  const upper = value + margin;
  return `${formatNumber(value)}${unit} (±${formatNumber(margin)}${unit})`;
};

export const formatGrowthRate = (current: number, previous: number): string => {
  if (previous === 0) return 'N/A';
  
  const growth = ((current - previous) / previous) * 100;
  const sign = growth >= 0 ? '+' : '';
  return `${sign}${formatNumber(growth, 1)}%`;
};

export const formatMetric = (value: number, type: 'bytes' | 'duration' | 'percentage' | 'number' | 'throughput' | 'score'): string => {
  switch (type) {
    case 'bytes':
      return formatBytes(value);
    case 'duration':
      return formatDuration(value);
    case 'percentage':
      return `${formatNumber(value, 1)}%`;
    case 'throughput':
      return formatThroughput(value);
    case 'score':
      return formatScore(value);
    case 'number':
    default:
      return formatLargeNumber(value);
  }
};
