import { AlertCircle, BarChart3, Calendar, CheckCircle, Clock, Copy, Download, ExternalLink, Settings, TrendingUp, Users, X, XCircle, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import './StressTestDetailModal.css';

interface StressTestDetailModalProps {
  record: any;
  isOpen: boolean;
  onClose: () => void;
}

const StressTestDetailModal: React.FC<StressTestDetailModalProps> = ({
  record,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  // 管理键盘事件（移除页面滚动锁定，允许用户滚动页面）
  useEffect(() => {
    if (isOpen) {
      // ESC 键关闭模态窗口
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
    // 当 isOpen 为 false 时，返回 undefined（可选）
    return undefined;
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  // 获取状态样式（与历史记录列表保持一致）
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 dark:bg-green-600 border-green-600 dark:border-green-500';
      case 'failed':
        return 'bg-red-500 dark:bg-red-600 border-red-600 dark:border-red-500';
      case 'running':
        return 'bg-blue-500 dark:bg-blue-600 border-blue-600 dark:border-blue-500';
      case 'cancelled':
        return 'bg-yellow-500 dark:bg-yellow-600 border-yellow-600 dark:border-yellow-500';
      default:
        return 'bg-gray-500 dark:bg-gray-600 border-gray-600 dark:border-gray-500';
    }
  };

  // 获取状态文字颜色（与历史记录列表保持一致）
  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-white dark:text-white';
      case 'failed':
        return 'text-white dark:text-white';
      case 'running':
        return 'text-white dark:text-white';
      case 'cancelled':
        return 'text-white dark:text-white';
      default:
        return 'text-white dark:text-white';
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          color: getStatusTextColor(status),
          bg: getStatusStyle(status)
        };
      case 'failed':
        return {
          icon: <XCircle className="w-5 h-5" />,
          color: getStatusTextColor(status),
          bg: getStatusStyle(status)
        };
      case 'running':
        return {
          icon: <Clock className="w-5 h-5" />,
          color: getStatusTextColor(status),
          bg: getStatusStyle(status)
        };
      case 'cancelled':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          color: getStatusTextColor(status),
          bg: getStatusStyle(status)
        };
      default:
        return {
          icon: <Clock className="w-5 h-5" />,
          color: getStatusTextColor(status),
          bg: getStatusStyle(status)
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 🔧 修复：使用与历史记录页面相同的持续时间计算逻辑
  const formatDuration = (record: any) => {
    // 对于运行中的测试，不显示时长
    if (record.status === 'running' || record.status === 'pending') {
      return '-';
    }

    // 优先使用 duration
    let seconds = record.duration;

    // 如果没有duration，尝试从results.metrics获取
    if ((!seconds || seconds <= 0) && record.results?.metrics?.duration) {
      seconds = record.results.metrics.duration;
    }

    // 如果还是没有，尝试从results.summary获取
    if ((!seconds || seconds <= 0) && record.results?.summary?.duration) {
      seconds = record.results.summary.duration;
    }

    // 尝试从results直接获取
    if ((!seconds || seconds <= 0) && record.results?.duration) {
      seconds = record.results.duration;
    }

    // 尝试从actualDuration获取（如果存在）
    if ((!seconds || seconds <= 0) && record.actualDuration) {
      seconds = record.actualDuration;
    }

    // 最后尝试计算时间差（仅对已完成的测试）
    if ((!seconds || seconds <= 0) && record.startTime && record.endTime) {
      const start = new Date(record.startTime).getTime();
      const end = new Date(record.endTime).getTime();
      seconds = Math.floor((end - start) / 1000);
    }

    if (!seconds || seconds <= 0) return '-';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    } else {
      return `${remainingSeconds}秒`;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const exportData = () => {
    if (!record) return;
    const dataStr = JSON.stringify(record, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stress-test-${record.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const goToDetailPage = () => {
    if (!record) return;
    navigate(`/stress-test/${record.id}`);
    onClose(); // 关闭模态框
  };

  const statusInfo = getStatusInfo(record.status);
  const metrics = record.results?.metrics || {};

  // 使用React Portal确保模态窗口渲染到document.body，避免父容器样式影响
  const modalContent = (
    <div className="stress-test-modal-container">
      {/* 背景遮罩 - 覆盖整个视口 */}
      <div
        className="stress-test-modal-backdrop"
        onClick={onClose}
      />

      {/* 模态窗口 - 始终在用户当前视口中心 */}
      <div
        className="stress-test-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg border ${statusInfo.bg} ${statusInfo.color}`}>
              {statusInfo.icon}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{record.testName}</h2>
              <p className="text-gray-400 text-sm">{record.url}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToDetailPage}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="进入详细页面"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={exportData}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="导出数据"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(window.location.href)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="复制链接"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-700 flex-shrink-0">
          {[
            { id: 'overview', label: '概览', icon: BarChart3 },
            { id: 'metrics', label: '指标', icon: TrendingUp },
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

        <div className="flex-1 p-6 overflow-y-auto modal-body">
          {activeTab === 'overview' && (
            <div className="space-y-6">
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
                  <p className="text-white font-medium">{formatDuration(record)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-400">并发用户</span>
                  </div>
                  <p className="text-white font-medium">{record.config?.users || '-'}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-gray-400">错误率</span>
                  </div>
                  <p className="text-white font-medium">
                    {(() => {
                      const errorRate = record.results?.metrics?.errorRate ||
                        record.errorRate ||
                        (record.results?.metrics?.failedRequests && record.results?.metrics?.totalRequests
                          ? ((record.results.metrics.failedRequests / record.results.metrics.totalRequests) * 100)
                          : 0);
                      return errorRate > 0 ? `${errorRate.toFixed(2)}%` : '0%';
                    })()}
                  </p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">测试状态</h3>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${statusInfo.bg} ${statusInfo.color}`}>
                    {statusInfo.icon}
                  </div>
                  <div>
                    <p className={`font-medium ${statusInfo.color}`}>
                      {record.status === 'completed' ? '已完成' :
                        record.status === 'failed' ? '失败' :
                          record.status === 'running' ? '运行中' :
                            record.status === 'cancelled' ? '已取消' : '未知'}
                    </p>
                    {record.errorMessage && (
                      <p className="text-red-400 text-sm mt-1">{record.errorMessage}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">性能指标</h3>

              {/* 所有指标统一显示 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm text-gray-400 mb-2">总请求数</h4>
                  <p className="text-2xl font-bold text-white">{record.totalRequests || metrics.totalRequests || 0}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm text-gray-400 mb-2">成功请求</h4>
                  <p className="text-2xl font-bold text-green-400">{record.successfulRequests || metrics.successfulRequests || 0}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm text-gray-400 mb-2">失败请求</h4>
                  <p className="text-2xl font-bold text-red-400">{record.failedRequests || metrics.failedRequests || 0}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm text-gray-400 mb-2">平均响应时间</h4>
                  <p className="text-2xl font-bold text-blue-400">{record.averageResponseTime || metrics.averageResponseTime || 0}ms</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm text-gray-400 mb-2">峰值TPS</h4>
                  <p className="text-2xl font-bold text-purple-400">{record.peakTps || metrics.peakTPS || 0}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm text-gray-400 mb-2">错误率</h4>
                  <p className="text-2xl font-bold text-yellow-400">{((record.errorRate || metrics.errorRate || 0)).toFixed(2)}%</p>
                </div>
                {metrics.minResponseTime && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="text-sm text-gray-400 mb-2">最小响应时间</h4>
                    <p className="text-2xl font-bold text-green-400">{metrics.minResponseTime}ms</p>
                  </div>
                )}
                {metrics.maxResponseTime && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="text-sm text-gray-400 mb-2">最大响应时间</h4>
                    <p className="text-2xl font-bold text-red-400">{metrics.maxResponseTime}ms</p>
                  </div>
                )}
                {record.performanceGrade && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="text-sm text-gray-400 mb-2">性能等级</h4>
                    <p className={`text-2xl font-bold ${record.performanceGrade.startsWith('A') ? 'text-green-400' :
                      record.performanceGrade.startsWith('B') ? 'text-blue-400' :
                        record.performanceGrade.startsWith('C') ? 'text-yellow-400' :
                          'text-red-400'
                      }`}>{record.performanceGrade}</p>
                  </div>
                )}
              </div>

              {/* 标签显示 */}
              {record.tags && record.tags.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-white mb-4">标签</h4>
                  <div className="flex flex-wrap gap-2">
                    {record.tags.map((tag: string, index: number) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-blue-600/60 text-blue-200 border border-blue-500/50">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">测试配置</h3>
              <div className="bg-gray-800 rounded-lg p-4">
                <pre className="text-gray-300 text-sm overflow-x-auto">
                  {JSON.stringify(record.config, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // 使用React Portal将模态窗口渲染到document.body，确保不受父容器样式影响
  return createPortal(modalContent, document.body);
};

export default StressTestDetailModal;
