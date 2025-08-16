import { Activity, AlertCircle, CheckCircle, Pause, Play, XCircle } from 'lucide-react';
import React from 'react';

// 测试状态类型 - 简化版本
export type TestStatus = 'idle' | 'starting' | 'running' | 'completed' | 'cancelled' | 'failed';

// 状态配置接口
export interface StatusConfig {
  text: string;
  icon: React.ComponentType<any>;
  bgColor: string;
  textColor: string;
  borderColor: string;
  description: string;
}

// 统一的状态配置
export const STATUS_CONFIG: Record<TestStatus, StatusConfig> = {
  idle: {
    text: '空闲',
    icon: Pause,
    bgColor: 'bg-gray-100 dark:bg-gray-500',
    textColor: 'text-gray-800 dark:text-gray-100',
    borderColor: 'border-gray-200 dark:border-gray-400',
    description: '测试未开始'
  },
  starting: {
    text: '启动中',
    icon: Play,
    bgColor: 'bg-blue-100 dark:bg-blue-500',
    textColor: 'text-blue-800 dark:text-blue-100',
    borderColor: 'border-blue-200 dark:border-blue-400',
    description: '测试正在启动'
  },
  completed: {
    text: '已完成',
    icon: CheckCircle,
    bgColor: 'bg-green-100 dark:bg-green-500',
    textColor: 'text-green-800 dark:text-green-100',
    borderColor: 'border-green-200 dark:border-green-400',
    description: '测试成功完成'
  },
  failed: {
    text: '测试失败',
    icon: XCircle,
    bgColor: 'bg-red-100 dark:bg-red-500',
    textColor: 'text-red-800 dark:text-red-100',
    borderColor: 'border-red-200 dark:border-red-400',
    description: '测试执行失败'
  },
  cancelled: {
    text: '已取消',
    icon: AlertCircle,
    bgColor: 'bg-orange-100 dark:bg-orange-500',
    textColor: 'text-orange-800 dark:text-orange-100',
    borderColor: 'border-orange-200 dark:border-orange-400',
    description: '测试被用户取消'
  },
  running: {
    text: '运行中',
    icon: Activity,
    bgColor: 'bg-blue-100 dark:bg-blue-500',
    textColor: 'text-blue-800 dark:text-blue-100',
    borderColor: 'border-blue-200 dark:border-blue-400',
    description: '测试正在执行中'
  }
};

// 获取状态配置
export const getStatusConfig = (status: string): StatusConfig => {
  return STATUS_CONFIG[status as TestStatus] || STATUS_CONFIG.idle;
};

// 获取状态文本
export const getStatusText = (status: string): string => {
  return getStatusConfig(status).text;
};

// 获取状态图标
export const getStatusIcon = (status: string, className: string = 'w-4 h-4'): React.ReactElement => {
  const config = getStatusConfig(status);
  const IconComponent = config.icon;
  const isAnimated = status === 'running';

  return React.createElement(IconComponent, {
    className: `${className} ${isAnimated ? 'animate-pulse' : ''}`
  });
};

// 获取状态样式类
export const getStatusStyleClasses = (status: string): string => {
  const config = getStatusConfig(status);
  const isAnimated = status === 'running';

  return `${config.bgColor} ${config.textColor} ${config.borderColor} ${isAnimated ? 'animate-pulse' : ''}`;
};

// 解析错误信息
export interface ParsedErrorInfo {
  type: 'error' | 'cancel' | 'timeout';
  message: string;
  reason?: string;
  details?: string;
  timestamp?: string;
}

export const parseErrorMessage = (errorMessage: string | null, status: string): ParsedErrorInfo | null => {
  if (!errorMessage) return null;

  // 取消状态的处理
  if (status === 'cancelled') {
    
        return {
      type: 'cancel',
      message: errorMessage,
      reason: errorMessage.includes('用户') ? '用户主动取消' : errorMessage
      };
  }

  // 超时状态的处理
  if (status === 'timeout') {
    
        return {
      type: 'timeout',
      message: errorMessage,
      details: '测试执行时间超过预设限制'
      };
  }

  // 失败状态的处理
  if (status === 'failed') {
    
        return {
      type: 'error',
      message: errorMessage,
      details: errorMessage
      };
  }

  return {
    type: 'error',
    message: errorMessage
  };
};

// 计算测试完成度
export const calculateTestCompletion = (record: any): number => {
  if (!record) return 0;

  // 如果测试已完成，返回100%
  if (record.status === 'completed') return 100;

  // 如果测试失败或取消，根据实际数据计算完成度
  if (record.status === 'failed' || record.status === 'cancelled') {
    
        const totalRequests = record.totalRequests || record.results?.metrics?.totalRequests || 0;
    const expectedDuration = record.config?.duration || 60; // 默认60秒
    const actualDuration = record.duration || 0;

    // 基于时间的完成度
    const timeCompletion = Math.min((actualDuration / expectedDuration) * 100, 100);

    // 基于请求数的完成度（如果有的话）
    if (totalRequests > 0) {
      const expectedRequests = (record.config?.users || 20) * expectedDuration; // 粗略估算
      const requestCompletion = Math.min((totalRequests / expectedRequests) * 100, 100);

      // 取两者的平均值
      return Math.round((timeCompletion + requestCompletion) / 2);
      }

    return Math.round(timeCompletion);
  }

  // 运行中或准备中的测试
  return 0;
};

// 格式化持续时间
export const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds || seconds <= 0) return '-';

  if (seconds < 60) {
    
        return `${seconds
      }秒`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    
        return remainingSeconds > 0 ? `${minutes
      }分${remainingSeconds}秒` : `${minutes}分钟`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}小时${remainingMinutes > 0 ? `${remainingMinutes}分钟` : ''}`;
};

// 格式化日期时间
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';

  try {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    return '-';
  }
};

// 获取状态描述
export const getStatusDescription = (status: string, errorInfo?: ParsedErrorInfo | null): string => {
  const config = getStatusConfig(status);

  if (errorInfo) {
    
        switch (errorInfo.type) {
      case 'cancel':
        return `测试被取消：${errorInfo.reason || errorInfo.message
      }`;
      case 'timeout':
        return `测试超时：${errorInfo.details || errorInfo.message}`;
      case 'error':
        return `测试失败：${errorInfo.message}`;
      default:
        return config.description;
    }
  }

  return config.description;
};
