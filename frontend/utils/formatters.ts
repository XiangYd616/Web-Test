/**
 * 格式化工具函数
 * 提供数据格式化、数字处理、时间转换等实用功能
 */

/**
 * 格式化字节数
 * @param bytes 字节数
 * @param decimals 小数位数，默认2位
 * @returns 格式化后的字符串，如 "1.23 MB"
 */
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * 格式化持续时间
 * @param milliseconds 毫秒数
 * @returns 格式化后的时间字符串，如 "2小时30分钟"
 */
export const formatDuration = (milliseconds: number): string => {
  if (milliseconds < 0) return '0秒';

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}天${remainingHours}小时` : `${days}天`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}小时${remainingMinutes}分钟` : `${hours}小时`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}分钟${remainingSeconds}秒` : `${minutes}分钟`;
  }

  return `${seconds}秒`;
};

/**
 * 格式化数字
 * @param num 数字
 * @param options 格式化选项
 * @returns 格式化后的数字字符串
 */
export const formatNumber = (
  num: number, 
  options: {
    decimals?: number;
    useThousandSeparator?: boolean;
    unit?: string;
    compact?: boolean;
  } = {}
): string => {
  const {
    decimals = 0,
    useThousandSeparator = true,
    unit = '',
    compact = false
  } = options;

  if (compact && Math.abs(num) >= 1000) {
    const units = ['', 'K', 'M', 'B', 'T'];
    const unitIndex = Math.floor(Math.log10(Math.abs(num)) / 3);
    const scaledNum = num / Math.pow(1000, unitIndex);
    
    return scaledNum.toFixed(decimals) + units[unitIndex] + unit;
  }

  let formatted = num.toFixed(decimals);
  
  if (useThousandSeparator) {
    formatted = parseFloat(formatted).toLocaleString('zh-CN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  return formatted + unit;
};

/**
 * 格式化百分比
 * @param value 数值（0-1之间或0-100之间）
 * @param decimals 小数位数
 * @param isAlreadyPercent 是否已经是百分比形式
 * @returns 格式化后的百分比字符串
 */
export const formatPercent = (
  value: number, 
  decimals: number = 1, 
  isAlreadyPercent: boolean = false
): string => {
  const percent = isAlreadyPercent ? value : value * 100;
  return percent.toFixed(decimals) + '%';
};

/**
 * 格式化货币
 * @param amount 金额
 * @param currency 货币类型
 * @param locale 地区设置
 * @returns 格式化后的货币字符串
 */
export const formatCurrency = (
  amount: number, 
  currency: string = 'CNY', 
  locale: string = 'zh-CN'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
};

/**
 * 格式化日期时间
 * @param date 日期对象、时间戳或日期字符串
 * @param format 格式类型
 * @returns 格式化后的日期时间字符串
 */
export const formatDateTime = (
  date: Date | number | string, 
  format: 'full' | 'date' | 'time' | 'relative' | 'iso' = 'full'
): string => {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return '无效日期';
  }

  switch (format) {
    case 'full':
      return dateObj.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    
    case 'date':
      return dateObj.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    
    case 'time':
      return dateObj.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    
    case 'relative':
      return formatRelativeTime(dateObj);
    
    case 'iso':
      return dateObj.toISOString();
    
    default:
      return dateObj.toLocaleString('zh-CN');
  }
};

/**
 * 格式化相对时间
 * @param date 日期对象
 * @returns 相对时间字符串，如 "3分钟前"
 */
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return diffSeconds <= 0 ? '刚刚' : `${diffSeconds}秒前`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 30) {
    return `${diffDays}天前`;
  } else {
    return formatDateTime(date, 'date');
  }
};

/**
 * 格式化文件大小
 * @param size 文件大小（字节）
 * @param precision 精度
 * @returns 格式化后的文件大小字符串
 */
export const formatFileSize = (size: number, precision: number = 2): string => {
  return formatBytes(size, precision);
};

/**
 * 格式化网络速度
 * @param bytesPerSecond 每秒字节数
 * @returns 格式化后的网络速度字符串
 */
export const formatNetworkSpeed = (bytesPerSecond: number): string => {
  const bitsPerSecond = bytesPerSecond * 8;
  
  if (bitsPerSecond >= 1e9) {
    return (bitsPerSecond / 1e9).toFixed(2) + ' Gbps';
  } else if (bitsPerSecond >= 1e6) {
    return (bitsPerSecond / 1e6).toFixed(2) + ' Mbps';
  } else if (bitsPerSecond >= 1e3) {
    return (bitsPerSecond / 1e3).toFixed(2) + ' Kbps';
  } else {
    return bitsPerSecond.toFixed(0) + ' bps';
  }
};

/**
 * 格式化响应时间
 * @param milliseconds 毫秒数
 * @returns 格式化后的响应时间字符串
 */
export const formatResponseTime = (milliseconds: number): string => {
  if (milliseconds < 1000) {
    return milliseconds.toFixed(0) + 'ms';
  } else {
    return (milliseconds / 1000).toFixed(2) + 's';
  }
};

/**
 * 格式化URL
 * @param url URL字符串
 * @param maxLength 最大长度
 * @returns 格式化后的URL字符串
 */
export const formatUrl = (url: string, maxLength: number = 50): string => {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    let display = urlObj.hostname + urlObj.pathname;
    
    if (display.length > maxLength) {
      display = display.substring(0, maxLength - 3) + '...';
    }
    
    return display;
  } catch {
    return url.length > maxLength ? url.substring(0, maxLength - 3) + '...' : url;
  }
};

/**
 * 格式化状态码
 * @param statusCode HTTP状态码
 * @returns 包含状态码和说明的对象
 */
export const formatStatusCode = (statusCode: number): { code: number; text: string; color: string } => {
  let text = '';
  let color = '';

  if (statusCode >= 200 && statusCode < 300) {
    text = '成功';
    color = '#4caf50';
  } else if (statusCode >= 300 && statusCode < 400) {
    text = '重定向';
    color = '#ff9800';
  } else if (statusCode >= 400 && statusCode < 500) {
    text = '客户端错误';
    color = '#f44336';
  } else if (statusCode >= 500) {
    text = '服务器错误';
    color = '#f44336';
  } else {
    text = '未知';
    color = '#9e9e9e';
  }

  return { code: statusCode, text, color };
};

/**
 * 格式化测试类型
 * @param testType 测试类型
 * @returns 格式化后的测试类型显示名称
 */
export const formatTestType = (testType: string): string => {
  const typeMap: Record<string, string> = {
    'performance': '性能测试',
    'security': '安全测试',
    'seo': 'SEO测试',
    'accessibility': '可访问性测试',
    'compatibility': '兼容性测试',
    'api': 'API测试',
    'load': '负载测试',
    'stress': '压力测试',
    'uptime': '可用性监控'
  };

  return typeMap[testType.toLowerCase()] || testType;
};

/**
 * 格式化错误信息
 * @param error 错误对象或字符串
 * @returns 用户友好的错误信息
 */
export const formatError = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    return error?.message;
  }

  if (error?.error) {
    return typeof error.error === 'string' ? error?.error : JSON.stringify(error?.error);
  }

  return '发生未知错误';
};

/**
 * 截断文本
 * @param text 文本内容
 * @param maxLength 最大长度
 * @param suffix 后缀，默认为省略号
 * @returns 截断后的文本
 */
export const truncateText = (text: string, maxLength: number, suffix: string = '...'): string => {
  if (!text || text.length <= maxLength) {
    return text || '';
  }

  return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * 格式化评分
 * @param score 评分（通常0-100）
 * @param maxScore 最大分数
 * @returns 格式化后的评分显示
 */
export const formatScore = (score: number, maxScore: number = 100): { 
  value: number; 
  display: string; 
  grade: string; 
  color: string 
} => {
  const normalizedScore = Math.min(Math.max(score, 0), maxScore);
  const percentage = (normalizedScore / maxScore) * 100;
  
  let grade = '';
  let color = '';

  if (percentage >= 90) {
    grade = 'A';
    color = '#4caf50';
  } else if (percentage >= 80) {
    grade = 'B';
    color = '#8bc34a';
  } else if (percentage >= 70) {
    grade = 'C';
    color = '#ffeb3b';
  } else if (percentage >= 60) {
    grade = 'D';
    color = '#ff9800';
  } else {
    grade = 'F';
    color = '#f44336';
  }

  return {
    value: normalizedScore,
    display: `${normalizedScore}/${maxScore}`,
    grade,
    color
  };
};

/**
 * 验证和格式化URL
 * @param url URL字符串
 * @returns 验证结果和格式化后的URL
 */
export const validateAndFormatUrl = (url: string): { 
  isValid: boolean; 
  formatted: string; 
  error?: string 
} => {
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      formatted: '',
      error: 'URL不能为空'
    };
  }

  try {
    // 如果没有协议，默认添加http://
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'http://' + formattedUrl;
    }

    const urlObj = new URL(formattedUrl);
    
    return {
      isValid: true,
      formatted: urlObj.toString()
    };
  } catch (error) {
    return {
      isValid: false,
      formatted: url,
      error: 'URL格式无效'
    };
  }
};

/**
 * 颜色工具函数
 */
export const colorUtils = {
  /**
   * 根据数值获取颜色
   * @param value 数值
   * @param min 最小值
   * @param max 最大值
   * @returns 颜色值
   */
  getColorByValue: (value: number, min: number, max: number): string => {
    const percentage = Math.max(0, Math.min(1, (value - min) / (max - min)));
    
    if (percentage < 0.5) {
      // 绿色到黄色
      const red = Math.floor(255 * percentage * 2);
      return `rgb(${red}, 255, 0)`;
    } else {
      // 黄色到红色
      const green = Math.floor(255 * (1 - percentage) * 2);
      return `rgb(255, ${green}, 0)`;
    }
  },

  /**
   * 获取健康状态颜色
   * @param status 健康状态
   * @returns 颜色值
   */
  getHealthColor: (status: string): string => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'excellent':
      case 'good':
        return '#4caf50';
      case 'warning':
      case 'fair':
        return '#ff9800';
      case 'critical':
      case 'poor':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  },

  /**
   * 获取测试结果颜色
   * @param result 测试结果
   * @returns 颜色值
   */
  getResultColor: (result: string): string => {
    switch (result.toLowerCase()) {
      case 'passed':
      case 'success':
        return '#4caf50';
      case 'failed':
      case 'error':
        return '#f44336';
      case 'warning':
        return '#ff9800';
      case 'pending':
      case 'running':
        return '#2196f3';
      default:
        return '#9e9e9e';
    }
  }
};

// 默认导出所有函数
export default {
  formatBytes,
  formatDuration,
  formatNumber,
  formatPercent,
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
  formatFileSize,
  formatNetworkSpeed,
  formatResponseTime,
  formatUrl,
  formatStatusCode,
  formatTestType,
  formatError,
  truncateText,
  formatScore,
  validateAndFormatUrl,
  colorUtils
};
