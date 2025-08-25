import { Activity, AlertCircle, ArrowLeft, BarChart3, Calendar, CheckCircle, Clock, Download, Settings, Share2, TrendingUp, Users, XCircle, Zap } from 'lucide-react';
import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import '../components/stress/StatusLabel.css';
import { DataProcessingUtils } from '../utils/dataProcessingUtils';

// 智能数据采样函数 - 移到组件外部避免 hooks 顺序问题
const intelligentSampling = (data: any[], maxPoints: number) => {
  if (data.length <= maxPoints) return data;

  // 自适应采样 - 保留重要数据点
  const result: any[] = [];
  const step = data.length / maxPoints;

  // 始终保留第一个和最后一个点
  result.push(data[0]);

  // 计算数据变化率来确定重要性
  const importanceScores: number[] = new Array(data.length).fill(0);

  for (let i = 1; i < data.length - 1; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    const next = data[i + 1];

    // 计算响应时间变化率
    const responseTimeChange = Math.abs(
      (curr.responseTime || 0) - (prev.responseTime || 0)
    ) + Math.abs(
      (next.responseTime || 0) - (curr.responseTime || 0)
    );

    // 计算吞吐量变化率
    const throughputChange = Math.abs(
      (curr.throughput || curr.tps || 0) - (prev.throughput || prev.tps || 0)
    ) + Math.abs(
      (next.throughput || next.tps || 0) - (curr.throughput || curr.tps || 0)
    );

    // 综合重要性分数
    importanceScores[i] = responseTimeChange * 0.6 + throughputChange * 0.4;
  }

  // 边界点设为高重要性
  importanceScores[0] = Math.max(...importanceScores) * 1.5;
  importanceScores[importanceScores.length - 1] = Math.max(...importanceScores) * 1.5;

  // 选择重要数据点
  const selectedIndices = new Set<number>();
  selectedIndices.add(0);
  selectedIndices.add(data.length - 1);

  // 均匀采样基础点
  for (let i = 1; i < maxPoints - 1; i++) {
    const index = Math.floor(i * step);
    selectedIndices.add(index);
  }

  // 添加高重要性点（保留20%的关键点）
  const sortedByImportance = importanceScores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.floor(maxPoints * 0.2));

  sortedByImportance.forEach(item => selectedIndices.add(item.index));

  // 转换为排序数组并提取数据
  const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
  return sortedIndices.map(index => data[index]);
};

interface StressTestRecord {
  id: string;
  testName: string;
  testType: string;
  url: string;
  status: 'idle' | 'starting' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: string;
  endTime?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
  overallScore?: number;
  performanceGrade?: string;
  config: any;
  results?: any;
  errorMessage?: string;
  totalRequests?: number;
  successfulRequests?: number;
  failedRequests?: number;
  averageResponseTime?: number;
  peakTps?: number;
  errorRate?: number;
  tags?: string[];
  environment?: string;
}

const StressTestDetail: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [record, setRecord] = useState<StressTestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showRetestDialog, setShowRetestDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // 统一的错误率计算函数
  const calculateErrorRate = (record: StressTestRecord | null, metrics: any = {}) => {
    if (!record) return 0;

    // 优先使用已计算的错误率
    if (record.errorRate !== undefined && record.errorRate !== null) {
      return record.errorRate;
    }
    if (metrics.errorRate !== undefined && metrics.errorRate !== null) {
      return metrics.errorRate;
    }

    // 从失败请求数和总请求数计算
    const failed = record.failedRequests || metrics.failedRequests || 0;
    const total = record.totalRequests || metrics.totalRequests || 0;

    if (total > 0) {
      return (failed / total) * 100;
    }

    return 0;
  };

  // 图表控制状态
  const [timeRange, setTimeRange] = useState<'all' | 'last5min' | 'last1min'>('all');
  const [dataInterval, setDataInterval] = useState<'1s' | '5s' | '10s'>('1s');
  const [showAverage, setShowAverage] = useState(true);

  // 数据优化控制状态
  const [maxDataPoints, setMaxDataPoints] = useState(1000);
  const [samplingStrategy, setSamplingStrategy] = useState<'uniform' | 'adaptive' | 'importance'>('adaptive');
  const [enableOptimization, setEnableOptimization] = useState(true);
  const [optimizationStats, setOptimizationStats] = useState<any>(null);

  // 获取测试详情
  useEffect(() => {
    const fetchTestDetail = async () => {
      if (!testId) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/test/history/${testId}`, {
          headers: {
            ...(localStorage.getItem('auth_token') ? {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            } : {})
          }
        });

        if (!response.ok) {
          throw new Error('获取测试详情失败');
        }

        const data = await response.json();
        if (data.success) {
          setRecord(data.data);
        } else {
          throw new Error(data.message || '获取测试详情失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取测试详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchTestDetail();
  }, [testId]);

  // 获取状态信息
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          color: 'text-green-600 dark:text-green-100',
          bg: '!bg-green-100 dark:!bg-green-500',
          cssClass: 'status-label-completed'
        };
      case 'failed':
        return {
          icon: <XCircle className="w-5 h-5" />,
          color: 'text-red-600 dark:text-red-100',
          bg: '!bg-red-100 dark:!bg-red-500',
          cssClass: 'status-label-failed'
        };
      case 'running':
        return {
          icon: <Clock className="w-5 h-5" />,
          color: 'text-blue-600 dark:text-blue-100',
          bg: '!bg-blue-100 dark:!bg-blue-500',
          cssClass: 'status-label-running'
        };
      case 'cancelled':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          color: 'text-yellow-600 dark:text-yellow-100',
          bg: '!bg-yellow-100 dark:!bg-yellow-500',
          cssClass: 'status-label-cancelled'
        };
      default:
        return {
          icon: <Clock className="w-5 h-5" />,
          color: 'text-gray-600 dark:text-gray-100',
          bg: '!bg-gray-100 dark:!bg-gray-500',
          cssClass: 'status-label-default'
        };
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 格式化持续时间
  const formatDuration = (seconds: number | undefined) => {
    if (!seconds || seconds === 0) return '未知';

    // 保留到0.1秒精度，避免过长的小数位
    const roundedSeconds = Math.round(seconds * 10) / 10;

    if (roundedSeconds < 60) {
      // 小于60秒时，显示小数位（如果不为0）
      return roundedSeconds % 1 === 0 ? `${roundedSeconds}秒` : `${roundedSeconds}秒`;
    }

    const minutes = Math.floor(roundedSeconds / 60);
    const remainingSeconds = Math.round((roundedSeconds % 60) * 10) / 10;

    if (remainingSeconds === 0) {
      return `${minutes}分`;
    }

    // 显示小数位（如果不为0）
    const secondsStr = remainingSeconds % 1 === 0 ? remainingSeconds.toString() : remainingSeconds.toString();
    return `${minutes}分${secondsStr}秒`;
  };

  // 获取持续时间
  const getDuration = () => {
    // 优先使用 actualDuration，然后是 duration，最后计算
    if (record.results?.actualDuration) return record.results.actualDuration;
    if (record.duration) return record.duration;
    if (record.startTime && record.endTime) {
      const start = new Date(record.startTime).getTime();
      const end = new Date(record.endTime).getTime();
      return Math.floor((end - start) / 1000);
    }
    return 0;
  };

  // 获取总体评分
  const getOverallScore = () => {
    // 优先使用 overallScore，然后尝试从 results 中获取
    if (record.overallScore !== undefined && record.overallScore !== null) {
      return Math.round(record.overallScore * 10) / 10; // 保留一位小数
    }
    if (record.results?.overallScore !== undefined && record.results?.overallScore !== null) {
      return Math.round(record.results.overallScore * 10) / 10;
    }
    // 如果有平均响应时间，可以基于此计算一个简单的评分
    if (record.averageResponseTime || record.results?.metrics?.averageResponseTime) {
      const avgTime = record.averageResponseTime || record.results?.metrics?.averageResponseTime;
      const score = Math.max(0, 100 - Math.min(100, avgTime / 10));
      return Math.round(score * 10) / 10;
    }
    return null;
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // 导出数据 - 优化：使用缓存避免重复序列化
  const exportData = useCallback(() => {
    if (!record) return;

    // 只导出必要的数据，减少序列化开销
    const exportRecord = {
      id: record.id,
      test_name: record.test_name,
      url: record.url,
      status: record.status,
      start_time: record.start_time,
      end_time: record.end_time,
      duration: record.duration,
      overall_score: record.overall_score,
      grade: record.grade,
      config: record.config,
      results: {
        metrics: record.results?.metrics,
        summary: record.results?.summary
        // 排除大量的realTimeData以减少文件大小
      }
    };

    const dataStr = JSON.stringify(exportRecord, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stress-test-${record.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [record]);

  // 分享结果
  const shareResult = () => {
    setShowShareDialog(true);
  };

  // 复制链接
  const copyLink = () => {
    const url = window.location.href;
    copyToClipboard(url);
    alert('链接已复制到剪贴板！');
    setShowShareDialog(false);
  };

  // 生成分享文本
  const generateShareText = () => {
    if (!record) return '';

    const metrics = record.results?.metrics || {};
    return `🚀 压力测试结果分享

📊 测试概览：
• 测试网站：${record.url}
• 并发用户：${record.config?.users || '未知'}
• 测试时长：${record.config?.duration || '未知'}秒
• 总请求数：${metrics.totalRequests || '未知'}
• 平均响应时间：${metrics.averageResponseTime || '未知'}ms
• 成功率：${metrics.successRate ? (metrics.successRate * 100).toFixed(2) : '未知'}%
• 峰值TPS：${metrics.maxTps || '未知'}

🔗 查看详细报告：${window.location.href}

#压力测试 #性能测试 #TestWebApp`;
  };

  // 分享到社交媒体
  const shareToSocial = (platform: string) => {
    const text = generateShareText();
    const url = window.location.href;

    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'weibo':
        shareUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
        break;
      default:
        return;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
    setShowShareDialog(false);
  };

  // 复制分享文本
  const copyShareText = () => {
    const text = generateShareText();
    copyToClipboard(text);
    alert('分享文本已复制到剪贴板！');
    setShowShareDialog(false);
  };

  // 生成二维码分享
  const generateQRCode = () => {
    const url = window.location.href;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

    // 创建一个新窗口显示二维码
    const qrWindow = window.open('', '_blank', 'width=300,height=350');
    if (qrWindow) {
      qrWindow.document.write(`
        <html>
          <head><title>二维码分享</title></head>
          <body style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
            <h3>扫描二维码查看测试结果</h3>
            <img src="${qrCodeUrl}" alt="QR Code" style="border: 1px solid #ccc; padding: 10px;">
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
              使用手机扫描二维码即可查看详细测试报告
            </p>
          </body>
        </html>
      `);
    }
    setShowShareDialog(false);
  };

  // 重新测试
  const retestWithSameConfig = () => {
    if (!record) {
      alert('无法获取测试记录信息');
      return;
    }

    setShowRetestDialog(true);
  };

  // 确认重新测试
  const confirmRetest = () => {
    if (!record) return;

    // 跳转到压力测试页面并预填配置
    navigate('/stress-test', {
      state: {
        prefilledConfig: {
          url: record.url,
          users: record.config?.users,
          duration: record.config?.duration,
          rampUp: record.config?.rampUpTime || record.config?.rampUp,
          testType: record.config?.testType,
          method: record.config?.method || 'GET',
          timeout: record.config?.timeout || 10,
          thinkTime: record.config?.thinkTime || 1,
          warmupDuration: record.config?.warmupDuration || 5,
          cooldownDuration: record.config?.cooldownDuration || 5
        }
      }
    });

    setShowRetestDialog(false);
  };

  // 复制配置
  const copyConfig = () => {
    if (!record) return;
    const configStr = JSON.stringify(record.config, null, 2);
    navigator.clipboard.writeText(configStr).then(() => {
      alert('配置已复制到剪贴板');
    });
  };

  // 在新窗口中打开URL
  const openUrl = () => {
    if (!record) return;
    window.open(record.url, '_blank');
  };

  // 获取数据 - 确保在早期返回之前调用所有 hooks
  let realTimeData = record?.results?.realTimeData || [];
  const metrics = record?.results?.metrics || {};

  // 数据处理函数
  const filterDataByTimeRange = (data: any[]) => {
    if (timeRange === 'all' || data.length === 0) return data;

    // 对于历史数据，使用数据本身的时间范围而不是当前时间
    const dataTimestamps = data.map(item => new Date(item.timestamp).getTime());
    const dataStartTime = Math.min(...dataTimestamps);
    const dataEndTime = Math.max(...dataTimestamps);

    // 如果数据跨度小于时间范围限制，返回所有数据
    const dataSpan = dataEndTime - dataStartTime;
    const timeLimit = timeRange === 'last5min' ? 5 * 60 * 1000 : 60 * 1000;

    if (dataSpan <= timeLimit) {
      console.log(`📊 数据跨度 ${dataSpan / 1000}秒 小于时间限制 ${timeLimit / 1000}秒，返回所有数据`);
      return data;
    }

    // 只有当数据跨度大于时间限制时，才从数据末尾开始过滤
    const cutoffTime = dataEndTime - timeLimit;
    const filteredData = data.filter(item => {
      const itemTime = new Date(item.timestamp).getTime();
      return itemTime >= cutoffTime;
    });

    console.log(`📊 时间范围过滤: ${data.length} → ${filteredData.length} 个数据点`);
    return filteredData;
  };

  const sampleDataByInterval = (data: any[]) => {
    if (dataInterval === '1s') return data;
    if (data.length === 0) return [];

    const intervalMs = dataInterval === '5s' ? 5000 : 10000;
    const aggregatedData: any[] = [];

    // 按时间窗口聚合数据
    const startTime = new Date(data[0].timestamp).getTime();
    const endTime = new Date(data[data.length - 1].timestamp).getTime();
    const totalDuration = endTime - startTime;

    console.log(`📊 数据聚合开始: ${dataInterval} 间隔 (${intervalMs}ms)`);
    console.log(`📊 输入数据: ${data.length} 个数据点`);
    console.log(`📊 时间范围: ${new Date(startTime).toLocaleTimeString()} - ${new Date(endTime).toLocaleTimeString()}`);
    console.log(`📊 总时长: ${totalDuration / 1000}秒`);

    // 计算应该有多少个时间窗口
    const expectedWindows = Math.ceil(totalDuration / intervalMs);
    console.log(`📊 预期窗口数: ${expectedWindows}`);

    for (let windowStart = startTime; windowStart < endTime; windowStart += intervalMs) {
      const windowEnd = Math.min(windowStart + intervalMs, endTime);

      const windowData = data.filter(item => {
        const itemTime = new Date(item.timestamp).getTime();
        return itemTime >= windowStart && itemTime < windowEnd;
      });

      if (windowData.length > 0) {
        // 计算窗口内的平均值
        const avgResponseTime = windowData.reduce((sum, item) =>
          sum + (item.responseTime || item.avgResponseTime || item.response_time || 0), 0) / windowData.length;
        const avgThroughput = windowData.reduce((sum, item) =>
          sum + (item.throughput || item.tps || item.requestsPerSecond || 0), 0) / windowData.length;
        const avgActiveUsers = windowData.reduce((sum, item) =>
          sum + (item.activeUsers || 0), 0) / windowData.length;
        const avgErrorRate = windowData.reduce((sum, item) =>
          sum + (item.errorRate || 0), 0) / windowData.length;

        aggregatedData.push({
          timestamp: new Date(windowStart + intervalMs / 2).toISOString(), // 使用窗口中点时间
          responseTime: avgResponseTime,
          throughput: avgThroughput,
          activeUsers: Math.round(avgActiveUsers),
          errorRate: avgErrorRate,
          // 保留其他字段
          ...windowData[0]
        });
      }
    }

    console.log(`📊 数据聚合完成: ${data.length} → ${aggregatedData.length} 个数据点`);
    return aggregatedData;
  };

  const calculateAverageData = (data: any[]) => {
    if (data.length === 0) return [];

    const sum = data.reduce((acc, item) => {
      const responseTime = item.responseTime || item.avgResponseTime || item.response_time || 0;
      return acc + responseTime;
    }, 0);
    const average = parseFloat((sum / data.length).toFixed(3));

    return data.map(item => ({
      ...item,
      averageResponseTime: average
    }));
  };

  // 计算成功率
  const successRate = metrics.totalRequests > 0
    ? (metrics.successfulRequests || 0) / metrics.totalRequests
    : 0;

  // 使用useMemo优化数据处理
  const processedDisplayData = React.useMemo(() => {
    console.log('🔄 重新处理数据，原始数据点:', realTimeData.length);
    const filtered = filterDataByTimeRange(realTimeData);
    let sampled = sampleDataByInterval(filtered);

    // 如果启用优化且数据点仍然过多，进行智能采样
    if (enableOptimization && sampled.length > maxDataPoints) {
      sampled = intelligentSampling(sampled, maxDataPoints);
      console.log('🎯 智能采样:', filtered.length, '→', sampled.length, `(目标: ${maxDataPoints})`);
    } else {
      console.log('📊 数据处理完成:', filtered.length, '→', sampled.length);
    }

    return sampled;
  }, [realTimeData, timeRange, dataInterval, enableOptimization, maxDataPoints]);

  const finalChartData = React.useMemo(() => {
    return showAverage ? calculateAverageData(processedDisplayData) : processedDisplayData;
  }, [processedDisplayData, showAverage]);

  // 🔧 使用统一的数据处理工具计算响应时间分布
  const responseTimeDistribution = DataProcessingUtils.calculateResponseTimeDistribution(
    finalChartData.map(item => ({
      timestamp: item.timestamp,
      responseTime: item.responseTime || item.avgResponseTime || item.response_time || 0,
      activeUsers: item.activeUsers || 0,
      throughput: item.throughput || 0,
      errorRate: item.errorRate || 0,
      status: item.status || 200,
      success: item.success !== false,
      phase: item.phase || 'steady'
    }))
  );
  const maxDistributionCount = Math.max(...responseTimeDistribution.map(item => item.count), 1);

  // 计算更好的高度比例，使用平方根缩放来平衡大小数值的显示
  const calculateBarHeight = (count: number, maxCount: number) => {
    if (count === 0) return 0;
    if (maxCount === 0) return 0;

    // 使用对数缩放，增强大小数值之间的视觉差异
    const logRatio = Math.log(count + 1) / Math.log(maxCount + 1);
    const heightPercent = logRatio * 85 + 5; // 85%最大高度范围 + 5%基础高度
    const finalHeight = Math.max(heightPercent, count > 0 ? 3 : 0); // 有数据最小3%高度

    return finalHeight;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">加载测试详情中...</p>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">加载失败</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/stress-test', { state: { activeTab: 'history' } })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回压力测试
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(record.status);

  // 数据验证和清理
  realTimeData = realTimeData.filter((item: any) =>
    item &&
    typeof item === 'object' &&
    (item.responseTime !== undefined || item.avgResponseTime !== undefined || item.response_time !== undefined)
  );



  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => navigate('/stress-test', { state: { activeTab: 'history' } })}
              className="flex items-center gap-2 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
              返回压力测试
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${statusInfo.bg} ${statusInfo.cssClass}`}>
                {statusInfo.icon}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{record.testName}</h1>
                <p className="text-gray-400">{record.url}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openUrl}
                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="在新窗口中打开URL"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm">打开URL</span>
              </button>
              <button
                type="button"
                onClick={retestWithSameConfig}
                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="使用相同配置重新测试"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">重新测试</span>
              </button>
              <button
                type="button"
                onClick={copyConfig}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="复制配置"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={shareResult}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="分享结果"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={exportData}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="导出数据"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex border-b border-gray-700 mb-8">
          {[
            { id: 'overview', label: '概览', icon: BarChart3 },
            { id: 'metrics', label: '指标', icon: TrendingUp },
            { id: 'charts', label: '图表', icon: Activity },
            { id: 'config', label: '配置', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 内容区域 */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-gray-400">开始时间</span>
                  </div>
                  <p className="text-white font-medium">{formatDate(record.startTime || record.createdAt)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-400">持续时间</span>
                  </div>
                  <p className="text-white font-medium">{formatDuration(getDuration())}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-400">并发用户</span>
                  </div>
                  <p className="text-white font-medium">{record.config?.users || record.config?.vus || '-'}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-gray-400">总体评分</span>
                  </div>
                  <p className="text-white font-medium">
                    {(() => {
                      const score = getOverallScore();
                      return score !== null ? score : '-';
                    })()}
                  </p>
                </div>
              </div>

              {/* 性能摘要 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm text-blue-300">总请求数</h4>
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{record.totalRequests || metrics.totalRequests || 0}</p>
                  <p className="text-xs text-blue-300 mt-1">
                    成功: {record.successfulRequests || metrics.successfulRequests || 0}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm text-green-300">平均响应时间</h4>
                    <Clock className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{(record.averageResponseTime || metrics.averageResponseTime || 0).toFixed(3)}ms</p>
                  <p className="text-xs text-green-300 mt-1">
                    {metrics.minResponseTime && metrics.maxResponseTime ?
                      `范围: ${metrics.minResponseTime}ms - ${metrics.maxResponseTime}ms` :
                      '响应时间统计'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm text-purple-300">峰值TPS</h4>
                    <Activity className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{record.peakTps || metrics.peakTPS || 0}</p>
                  <p className="text-xs text-purple-300 mt-1">每秒事务数</p>
                </div>

                <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm text-yellow-300">错误率</h4>
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{((record.errorRate || metrics.errorRate || 0)).toFixed(2)}%</p>
                  <p className="text-xs text-yellow-300 mt-1">
                    失败: {record.failedRequests || metrics.failedRequests || 0}
                  </p>
                </div>
              </div>

              {/* 详细信息网格 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 时间信息 */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-400" />
                    时间信息
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">开始时间:</span>
                      <span className="text-white">{formatDate(record.startTime || record.createdAt)}</span>
                    </div>
                    {record.endTime && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">结束时间:</span>
                        <span className="text-white">{formatDate(record.endTime)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">持续时间:</span>
                      <span className="text-white">{formatDuration(getDuration())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">创建时间:</span>
                      <span className="text-white">{formatDate(record.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* 测试配置 */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-green-400" />
                    测试配置
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">并发用户:</span>
                      <span className="text-white">{record.config?.users || record.config?.vus || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">测试类型:</span>
                      <span className="text-white capitalize">{record.test_type}</span>
                    </div>
                    {record.config?.duration && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">计划时长:</span>
                        <span className="text-white">{record.config.duration}秒</span>
                      </div>
                    )}
                    {record.performanceGrade && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">性能等级:</span>
                        <span className={`font-bold ${record.performanceGrade.startsWith('A') ? 'text-green-400' :
                          record.performanceGrade.startsWith('B') ? 'text-blue-400' :
                            record.performanceGrade.startsWith('C') ? 'text-yellow-400' :
                              'text-red-400'
                          }`}>{record.performanceGrade}</span>
                      </div>
                    )}
                    {(() => {
                      const score = getOverallScore();
                      return score !== null ? (
                        <div className="flex justify-between">
                          <span className="text-gray-400">总体评分:</span>
                          <span className={`font-bold ${score >= 80 ? 'text-green-400' :
                            score >= 60 ? 'text-yellow-400' : 'text-red-400'
                            }`}>{score}</span>
                        </div>
                      ) : null;
                    })()}
                    {record.tags && record.tags.length > 0 && (
                      <div>
                        <span className="text-gray-400 block mb-2">标签:</span>
                        <div className="flex flex-wrap gap-1">
                          {record.tags.map((tag: string, index: number) => (
                            <span key={index} className="px-2 py-1 text-xs bg-blue-600/60 text-blue-200 border border-blue-500/50 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 状态信息 */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">测试状态</h4>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${statusInfo.bg} ${statusInfo.cssClass}`}>
                    {statusInfo.icon}
                  </div>
                  <div>
                    <p className={`text-lg font-medium ${statusInfo.color} ${statusInfo.cssClass}`}>
                      {record.status === 'completed' ? '已完成' :
                        record.status === 'failed' ? '失败' :
                          record.status === 'running' ? '运行中' :
                            record.status === 'cancelled' ? '已取消' : '未知'}
                    </p>
                    {record.errorMessage && (
                      <p className="text-red-400 text-sm mt-1">{record.errorMessage}</p>
                    )}
                    <p className="text-gray-400 text-sm mt-1">
                      测试ID: {record.id}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'metrics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">详细性能指标</h3>

              {/* 核心指标对比 */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h4 className="text-md font-semibold text-white mb-4">核心指标对比</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 请求统计 */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-medium text-gray-300">请求统计</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">总请求数</span>
                        <span className="text-xl font-bold text-white">{metrics.totalRequests || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">成功请求</span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-green-400">{metrics.successfulRequests || 0}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({((metrics.successfulRequests || 0) / (metrics.totalRequests || 1) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">失败请求</span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-red-400">{metrics.failedRequests || 0}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({calculateErrorRate(record, metrics).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 性能指标 */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-medium text-gray-300">性能指标</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">平均响应时间</span>
                        <span className="text-lg font-bold text-blue-400">{metrics.averageResponseTime || 0}ms</span>
                      </div>
                      {metrics.minResponseTime && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">最小响应时间</span>
                          <span className="text-lg font-bold text-green-400">{metrics.minResponseTime}ms</span>
                        </div>
                      )}
                      {metrics.maxResponseTime && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">最大响应时间</span>
                          <span className="text-lg font-bold text-red-400">{metrics.maxResponseTime}ms</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">峰值TPS</span>
                        <span className="text-lg font-bold text-purple-400">{metrics.peakTPS || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">错误率</span>
                        <span className="text-lg font-bold text-yellow-400">{calculateErrorRate(record, metrics).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 性能分析 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 响应时间分析 */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h4 className="text-md font-semibold text-white mb-4">响应时间分析</h4>
                  <div className="space-y-4">
                    {metrics.averageResponseTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">性能等级</span>
                        <span className={`px-2 py-1 rounded text-sm font-medium ${metrics.averageResponseTime < 100 ? 'bg-green-500/20 text-green-400' :
                          metrics.averageResponseTime < 300 ? 'bg-yellow-500/20 text-yellow-400' :
                            metrics.averageResponseTime < 1000 ? 'bg-orange-500/20 text-orange-400' :
                              'bg-red-500/20 text-red-400'
                          }`}>
                          {metrics.averageResponseTime < 100 ? '优秀' :
                            metrics.averageResponseTime < 300 ? '良好' :
                              metrics.averageResponseTime < 1000 ? '一般' : '较差'}
                        </span>
                      </div>
                    )}
                    {metrics.minResponseTime && metrics.maxResponseTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">响应时间范围</span>
                        <span className="text-white">{metrics.maxResponseTime - metrics.minResponseTime}ms</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">稳定性评估</span>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${(metrics.errorRate || 0) < 1 ? 'bg-green-500/20 text-green-400' :
                        (metrics.errorRate || 0) < 5 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                        {(metrics.errorRate || 0) < 1 ? '稳定' :
                          (metrics.errorRate || 0) < 5 ? '一般' : '不稳定'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 吞吐量分析 */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h4 className="text-md font-semibold text-white mb-4">吞吐量分析</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">峰值TPS</span>
                      <span className="text-white font-bold">{metrics.peakTPS || 0}</span>
                    </div>
                    {metrics.throughput && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">平均吞吐量</span>
                        <span className="text-white">{metrics.throughput}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">并发处理能力</span>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${(metrics.peakTPS || 0) > 100 ? 'bg-green-500/20 text-green-400' :
                        (metrics.peakTPS || 0) > 50 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                        {(metrics.peakTPS || 0) > 100 ? '强' :
                          (metrics.peakTPS || 0) > 50 ? '中等' : '弱'}
                      </span>
                    </div>
                    {record.config?.users && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">每用户TPS</span>
                        <span className="text-white">{((metrics.peakTPS || 0) / record.config.users).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 建议和优化 */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h4 className="text-md font-semibold text-white mb-4">性能建议</h4>
                <div className="space-y-3">
                  {(metrics.averageResponseTime || 0) > 1000 && (
                    <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                      <div>
                        <p className="text-red-400 font-medium">响应时间过长</p>
                        <p className="text-gray-300 text-sm">平均响应时间超过1秒，建议优化服务器性能或数据库查询</p>
                      </div>
                    </div>
                  )}
                  {(metrics.errorRate || 0) > 5 && (
                    <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                      <div>
                        <p className="text-yellow-400 font-medium">错误率偏高</p>
                        <p className="text-gray-300 text-sm">错误率超过5%，建议检查应用程序错误处理和资源配置</p>
                      </div>
                    </div>
                  )}
                  {(metrics.peakTPS || 0) < 10 && (
                    <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5" />
                      <div>
                        <p className="text-orange-400 font-medium">吞吐量较低</p>
                        <p className="text-gray-300 text-sm">TPS较低，建议优化应用架构或增加服务器资源</p>
                      </div>
                    </div>
                  )}
                  {(metrics.averageResponseTime || 0) < 200 && (metrics.errorRate || 0) < 1 && (
                    <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                      <div>
                        <p className="text-green-400 font-medium">性能表现优秀</p>
                        <p className="text-gray-300 text-sm">响应时间快且错误率低，系统性能表现良好</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'charts' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">数据可视化分析</h3>

              {/* 图表控制面板 */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">时间范围:</span>
                    <select
                      className="bg-gray-700 text-white px-3 py-1 rounded text-sm border border-gray-600"
                      aria-label="选择时间范围"
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value as 'all' | 'last5min' | 'last1min')}
                    >
                      <option value="all">全部时间</option>
                      <option value="last5min">最近5分钟</option>
                      <option value="last1min">最近1分钟</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">数据间隔:</span>
                    <select
                      className="bg-gray-700 text-white px-3 py-1 rounded text-sm border border-gray-600"
                      aria-label="选择数据间隔"
                      value={dataInterval}
                      onChange={(e) => setDataInterval(e.target.value as '1s' | '5s' | '10s')}
                    >
                      <option value="1s">1秒</option>
                      <option value="5s">5秒</option>
                      <option value="10s">10秒</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showAverage"
                      className="rounded"
                      checked={showAverage}
                      onChange={(e) => setShowAverage(e.target.checked)}
                    />
                    <label htmlFor="showAverage" className="text-gray-400 text-sm">显示平均线</label>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>数据点: {finalChartData.length}/{realTimeData.length}</span>
                    {timeRange !== 'all' && (
                      <span className="px-2 py-1 bg-blue-600 text-white rounded">
                        {timeRange === 'last5min' ? '最近5分钟' : '最近1分钟'}
                      </span>
                    )}
                    {dataInterval !== '1s' && (
                      <span className="px-2 py-1 bg-purple-600 text-white rounded">
                        {dataInterval}间隔
                      </span>
                    )}
                    {showAverage && (
                      <span className="px-2 py-1 bg-green-600 text-white rounded">
                        显示平均线
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 数据密度控制面板 */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-white font-medium">数据密度控制</div>
                      <div className="text-xs text-gray-400">
                        {finalChartData.length.toLocaleString()} / {realTimeData.length.toLocaleString()} 数据点
                        {realTimeData.length > finalChartData.length && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-600/20 text-blue-300 rounded text-xs">
                            {(realTimeData.length / finalChartData.length).toFixed(1)}x 压缩
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${finalChartData.length <= 500 ? 'bg-green-500/20 text-green-300' :
                      finalChartData.length <= 1000 ? 'bg-blue-500/20 text-blue-300' :
                        finalChartData.length <= 2000 ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-red-500/20 text-red-300'
                      }`}>
                      {finalChartData.length <= 500 ? '优秀' :
                        finalChartData.length <= 1000 ? '良好' :
                          finalChartData.length <= 2000 ? '一般' : '需优化'}
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableOptimization}
                        onChange={(e) => setEnableOptimization(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-300">启用优化</span>
                    </label>
                  </div>
                </div>

                {/* 快速预设 */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { name: '高性能', maxPoints: 500, description: '最佳性能，适合实时监控' },
                    { name: '平衡', maxPoints: 1000, description: '性能与细节的平衡' },
                    { name: '详细', maxPoints: 2000, description: '更多细节，适合分析' },
                    { name: '完整', maxPoints: 5000, description: '最大细节，可能影响性能' }
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setMaxDataPoints(preset.maxPoints)}
                      className={`px-3 py-1 rounded text-xs transition-colors ${maxDataPoints === preset.maxPoints
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      title={preset.description}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>

                {/* 性能警告 */}
                {finalChartData.length > 2000 && (
                  <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-yellow-400 mt-0.5" />
                      <div className="text-xs">
                        <div className="text-yellow-400 font-medium">性能建议</div>
                        <div className="text-gray-300 mt-1">
                          当前数据点较多({finalChartData.length.toLocaleString()})，建议启用优化或选择"高性能"预设以提升渲染性能。
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {finalChartData.length > 0 ? (
                <>
                  {/* 主要性能图表 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 响应时间趋势 */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-semibold text-white">响应时间趋势</h4>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                            <span className="text-gray-400">响应时间</span>
                          </div>
                          {showAverage && (
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-0.5 bg-yellow-500" style={{ borderTop: '2px dashed #f59e0b' }}></div>
                              <span className="text-gray-400">平均值 (84ms)</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={finalChartData}>
                          <XAxis
                            dataKey="timestamp"
                            tick={{ fontSize: 12, fill: '#9CA3AF' }}
                            tickFormatter={(value) => {
                              // 🔧 改进：计算相对于测试开始的时间，提高到0.01秒精度
                              if (finalChartData.length > 0) {
                                const startTime = new Date(finalChartData[0].timestamp).getTime();
                                const currentTime = new Date(value).getTime();
                                const elapsedSeconds = (currentTime - startTime) / 1000; // 保留小数

                                const minutes = Math.floor(elapsedSeconds / 60);
                                const seconds = Math.floor(elapsedSeconds % 60);
                                const ms = Math.floor((elapsedSeconds % 1) * 100); // 0.01秒精度

                                return minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}` : `${seconds}.${ms.toString().padStart(2, '0')}`;
                              }

                              // 备用方案：显示绝对时间
                              const date = new Date(value);
                              return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
                            }}
                            interval={Math.max(1, Math.floor(finalChartData.length / 8))}
                            label={{ value: '测试时间 (分:秒)', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: '#9CA3AF' }}
                            label={{ value: '响应时间 (ms)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1F2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                            formatter={(value: any, name: string) => {
                              if (name === 'responseTime') return [`${typeof value === 'number' ? value.toFixed(3) : value}ms`, '响应时间'];
                              if (name === 'averageResponseTime') return [`${value.toFixed(3)}ms`, '平均响应时间'];
                              return [value, name];
                            }}
                            labelFormatter={(value) => {
                              // 🔧 改进：计算相对于测试开始的时间，提高到0.01秒精度
                              if (finalChartData.length > 0) {
                                const startTime = new Date(finalChartData[0].timestamp).getTime();
                                const currentTime = new Date(value).getTime();
                                const elapsedSeconds = (currentTime - startTime) / 1000; // 保留小数

                                const minutes = Math.floor(elapsedSeconds / 60);
                                const seconds = Math.floor(elapsedSeconds % 60);
                                const ms = Math.floor((elapsedSeconds % 1) * 100); // 0.01秒精度

                                const timeStr = minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}` : `${seconds}.${ms.toString().padStart(2, '0')}`;
                                return `测试时间: ${timeStr}`;
                              }

                              // 备用方案：显示绝对时间
                              const date = new Date(value);
                              return `时间: ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
                            }}
                          />
                          {/* 先渲染平均线，让它在底层 */}
                          {showAverage && (
                            <Line
                              type="monotone"
                              dataKey="averageResponseTime"
                              stroke="#f59e0b"
                              strokeWidth={4}
                              strokeDasharray="8 4"
                              dot={false}
                              activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 3, fill: '#f59e0b' }}
                              name="平均响应时间"
                            />
                          )}
                          {/* 再渲染实际数据线，让它在上层 */}
                          <Line
                            type="monotone"
                            dataKey="responseTime"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                            activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2 }}
                            strokeOpacity={0.8}
                          />

                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* TPS趋势图 */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-semibold text-white">TPS趋势</h4>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <div>
                            峰值: <span className="text-purple-400 font-bold">{metrics.peakTPS || 0}</span>
                          </div>
                          <div>
                            平均: <span className="text-yellow-400 font-bold">
                              {(() => {
                                const tpsValues = finalChartData
                                  .map(item => item.throughput || item.tps || item.requestsPerSecond || 0)
                                  .filter(val => val > 0);
                                const avgTps = tpsValues.length > 0
                                  ? (tpsValues.reduce((sum, val) => sum + val, 0) / tpsValues.length)
                                  : 0;
                                return avgTps.toFixed(3);
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={finalChartData.map((item) => ({
                          ...item,
                          // 直接使用实时数据中的throughput字段作为TPS
                          tps: item.throughput || item.tps || item.requestsPerSecond || 0
                        }))}>
                          <XAxis
                            dataKey="timestamp"
                            tick={{ fontSize: 12, fill: '#9CA3AF' }}
                            tickFormatter={(value) => {
                              // 🔧 改进：计算相对于测试开始的时间，提高到0.01秒精度
                              if (finalChartData.length > 0) {
                                const startTime = new Date(finalChartData[0].timestamp).getTime();
                                const currentTime = new Date(value).getTime();
                                const elapsedSeconds = (currentTime - startTime) / 1000; // 保留小数

                                const minutes = Math.floor(elapsedSeconds / 60);
                                const seconds = Math.floor(elapsedSeconds % 60);
                                const ms = Math.floor((elapsedSeconds % 1) * 100); // 0.01秒精度

                                return minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}` : `${seconds}.${ms.toString().padStart(2, '0')}`;
                              }

                              // 备用方案：显示绝对时间
                              const date = new Date(value);
                              return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
                            }}
                            interval={Math.max(1, Math.floor(finalChartData.length / 8))}
                            label={{ value: '测试时间 (分:秒)', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: '#9CA3AF' }}
                            label={{ value: 'TPS', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1F2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                            formatter={(value: any) => [`${typeof value === 'number' ? value.toFixed(3) : value}`, 'TPS']}
                            labelFormatter={(value) => {
                              const date = new Date(value);
                              return `时间: ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="tps"
                            stroke="#a855f7"
                            strokeWidth={2}
                            fill="rgba(168, 85, 247, 0.1)"
                            dot={{ fill: '#a855f7', strokeWidth: 2, r: 3 }}
                            activeDot={{ r: 5, stroke: '#a855f7', strokeWidth: 2 }}
                          />
                          {showAverage && (() => {
                            const tpsValues = finalChartData
                              .map(item => item.throughput || item.tps || item.requestsPerSecond || 0)
                              .filter(val => val > 0);
                            const avgTps = tpsValues.length > 0
                              ? (tpsValues.reduce((sum, val) => sum + val, 0) / tpsValues.length)
                              : 0;
                            return (
                              <ReferenceLine
                                y={avgTps}
                                stroke="#f59e0b"
                                strokeDasharray="5 5"
                                strokeWidth={2}
                                label={{ value: `平均 (${avgTps.toFixed(3)})`, position: 'top', fill: '#f59e0b' }}
                              />
                            );
                          })()}
                        </LineChart>
                      </ResponsiveContainer>
                      <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-0.5 bg-purple-400"></div>
                          <span className="text-gray-400">TPS</span>
                        </div>
                        {showAverage && (
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-0.5 bg-yellow-500" style={{ borderTop: '2px dashed #f59e0b' }}></div>
                            <span className="text-gray-400">平均值 ({(() => {
                              const tpsValues = finalChartData
                                .map(item => item.throughput || item.tps || item.requestsPerSecond || 0)
                                .filter(val => val > 0);
                              const avgTps = tpsValues.length > 0
                                ? (tpsValues.reduce((sum, val) => sum + val, 0) / tpsValues.length)
                                : 0;
                              return avgTps.toFixed(3);
                            })()})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 错误率和成功率分析 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 请求状态分布 */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h4 className="text-md font-semibold text-white mb-4">请求状态分布</h4>
                      <div className="h-64 flex items-center justify-center">
                        <div className="relative w-48 h-48">
                          {/* 简单的饼图替代 */}
                          <div className="absolute inset-0 rounded-full border-8 border-green-400"
                            style={{
                              background: `conic-gradient(
                                   #10b981 0deg ${successRate * 360}deg,
                                   #ef4444 ${successRate * 360}deg 360deg
                                 )`
                            }}>
                          </div>
                          <div className="absolute inset-4 bg-gray-800 rounded-full flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-white">
                                {(successRate * 100).toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-400">成功率</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                          <span className="text-sm text-gray-400">
                            成功 ({metrics.successfulRequests || Math.floor((metrics.totalRequests || 0) * successRate)})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                          <span className="text-sm text-gray-400">
                            失败 ({metrics.failedRequests || Math.ceil((metrics.totalRequests || 0) * (1 - successRate))})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 性能分布直方图 */}
                    <div className="bg-gray-800 rounded-lg p-6">
                      <h4 className="text-md font-semibold text-white mb-4">响应时间分布</h4>
                      <div className="h-64">
                        {finalChartData.length > 0 ? (
                          <div className="flex items-end justify-between h-full gap-1">
                            {responseTimeDistribution.map((item, index) => (
                              <div key={index} className="flex-1 flex flex-col items-center">
                                <div
                                  className={`w-full ${item.color} rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer`}
                                  style={{
                                    height: `${Math.max(calculateBarHeight(item.count, maxDistributionCount) * 2, item.count > 0 ? 8 : 0)}px`,
                                    maxHeight: '200px'
                                  }}
                                  title={`${item.range}: ${item.count} 请求 (${item.percentage.toFixed(1)}%)`}
                                ></div>
                                <div className="text-xs text-gray-400 mt-2 text-center">
                                  <div className="transform -rotate-45 origin-center">{item.range}</div>
                                  <div className="text-xs text-gray-500 mt-1">{item.count}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <div className="text-gray-500 text-sm">暂无数据</div>
                              <div className="text-gray-600 text-xs mt-1">开始测试后将显示响应时间分布</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 实时监控指标 */}
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h4 className="text-md font-semibold text-white mb-4">实时监控面板</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-blue-400">{metrics.averageResponseTime || 0}ms</div>
                        <div className="text-xs text-gray-400 mt-1">当前响应时间</div>
                        <div className="text-xs text-green-400 mt-1">↓ 12ms</div>
                      </div>
                      <div className="text-center p-4 bg-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-purple-400">{metrics.peakTPS || 0}</div>
                        <div className="text-xs text-gray-400 mt-1">当前TPS</div>
                        <div className="text-xs text-green-400 mt-1">↑ 5.2</div>
                      </div>
                      <div className="text-center p-4 bg-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-green-400">{((metrics.successfulRequests || 0) / (metrics.totalRequests || 1) * 100).toFixed(1)}%</div>
                        <div className="text-xs text-gray-400 mt-1">成功率</div>
                        <div className="text-xs text-green-400 mt-1">稳定</div>
                      </div>
                      <div className="text-center p-4 bg-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-400">{record.config?.users || 0}</div>
                        <div className="text-xs text-gray-400 mt-1">并发用户</div>
                        <div className="text-xs text-blue-400 mt-1">活跃</div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-gray-800 rounded-lg p-8 text-center">
                  <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">暂无图表数据</p>
                  <p className="text-gray-500 text-sm mt-2">开始压力测试后将显示实时数据图表</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">测试配置</h3>
              <div className="bg-gray-800 rounded-lg p-6">
                <pre className="text-gray-300 text-sm overflow-x-auto">
                  {JSON.stringify(record.config, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 重新测试确认对话框 */}
      {showRetestDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">重新测试确认</h3>
            </div>

            <div className="mb-6">
              <p className="text-gray-300 mb-4">确定要使用相同配置重新测试吗？</p>

              <div className="bg-gray-700 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">测试URL:</span>
                  <span className="text-white truncate ml-2">{record?.url}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">并发用户:</span>
                  <span className="text-white">{record?.config?.users || '未知'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">测试时长:</span>
                  <span className="text-white">{record?.config?.duration || '未知'}秒</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">测试类型:</span>
                  <span className="text-white">{record?.config?.testType || '未知'}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowRetestDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmRetest}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                确认重新测试
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分享结果对话框 */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <Share2 className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">分享测试结果</h3>
            </div>

            <div className="mb-6">
              <p className="text-gray-300 mb-4">选择分享方式：</p>

              {/* 分享选项 */}
              <div className="space-y-3">
                {/* 复制链接 */}
                <button
                  type="button"
                  onClick={copyLink}
                  className="w-full flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium">复制链接</div>
                    <div className="text-gray-400 text-sm">复制页面链接到剪贴板</div>
                  </div>
                </button>

                {/* 复制分享文本 */}
                <button
                  type="button"
                  onClick={copyShareText}
                  className="w-full flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium">复制分享文本</div>
                    <div className="text-gray-400 text-sm">复制格式化的测试结果文本</div>
                  </div>
                </button>

                {/* 二维码分享 */}
                <button
                  type="button"
                  onClick={generateQRCode}
                  className="w-full flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium">生成二维码</div>
                    <div className="text-gray-400 text-sm">生成二维码供手机扫描</div>
                  </div>
                </button>
              </div>

              {/* 社交媒体分享 */}
              <div className="mt-4 pt-4 border-t border-gray-600">
                <p className="text-gray-400 text-sm mb-3">分享到社交媒体：</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => shareToSocial('weibo')}
                    className="flex-1 p-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors text-white text-sm"
                  >
                    微博
                  </button>
                  <button
                    type="button"
                    onClick={() => shareToSocial('twitter')}
                    className="flex-1 p-2 bg-blue-500 hover:bg-blue-400 rounded-lg transition-colors text-white text-sm"
                  >
                    Twitter
                  </button>
                  <button
                    type="button"
                    onClick={() => shareToSocial('linkedin')}
                    className="flex-1 p-2 bg-blue-700 hover:bg-blue-600 rounded-lg transition-colors text-white text-sm"
                  >
                    LinkedIn
                  </button>
                  <button
                    type="button"
                    onClick={() => shareToSocial('facebook')}
                    className="flex-1 p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white text-sm"
                  >
                    Facebook
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowShareDialog(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StressTestDetail;
