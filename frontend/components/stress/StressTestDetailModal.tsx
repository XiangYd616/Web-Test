/**
 * StressTestDetailModal.tsx - React组件
 * 
 * 文件路径: frontend\components\stress\StressTestDetailModal.tsx
 * 创建时间: 2025-09-25
 */

import { AlertCircle, BarChart3, Calendar, CheckCircle, Clock, Copy, Download, ExternalLink, Settings, TrendingUp, Users, X, XCircle, Zap } from 'lucide-react';
import React from 'react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';;
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import ExportUtils from '../../utils/exportUtils';
import ExportModal from '../common/ExportModal';

import './StressTestDetailModal.css';
import type { StressTestRecord, TestProgress, TestMetrics, TestResults } from '../types/common';

interface StressTestDetailModalProps {
  record: any;
  isOpen: boolean;
  onClose: () => void;
}

const StressTestDetailModal: React.FC<StressTestDetailModalProps> = React.memo(({
  record,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isDataReady, setIsDataReady] = useState(false);
  const navigate = useNavigate();

  // 统一的错误率计算函数
  const calculateErrorRate = (record: unknown, metrics: any = {}) => {
    if (!record) return 0;

    // 优先使用已计算的错误率
    if (record?.errorRate !== undefined && record?.errorRate !== null) {
      return record?.errorRate;
    }
    if (metrics?.errorRate !== undefined && metrics?.errorRate !== null) {
      return metrics?.errorRate;
    }

    // 从失败请求数和总请求数计算
    const failed = record?.failedRequests || metrics?.failedRequests || 0;
    const total = record?.totalRequests || metrics?.totalRequests || 0;

    if (total > 0) {
      return (failed / total) * 100;
    }

    return 0;
  };

  // 导入统一的状态管理函数（手动添加，因为IDE自动格式化移除了导入）
  // 临时解决方案：直接在组件内部定义这些函数
  const getStatusConfig = (status: string) => {
    const configs = {
      completed: { text: '已完成', description: '测试成功完成' },
      failed: { text: '测试失败', description: '测试执行失败' },
      cancelled: { text: '已取消', description: '测试被用户取消' },
      running: { text: '运行中', description: '测试正在执行中' },
      pending: { text: '准备中', description: '测试准备启动' }
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const calculateTestCompletion = (record: any) => {
    /**
     * if功能函数
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} 返回结果
     */
    if (!record || record.status === 'completed') return 100;
    if (record.status === 'failed' || record.status === 'cancelled') {
      const actualDuration = record?.duration || 0;
      const expectedDuration = record?.config?.duration || 60;
      return Math.min(Math.round((actualDuration / expectedDuration) * 100), 100);
    }
    return 0;
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch { return '-'; }
  };

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
    const config = getStatusConfig(status);

    // 根据状态返回对应的图标
    const getIcon = () => {
      switch (status) {
        case 'completed':
          return <CheckCircle className="w-5 h-5" />;
        case 'failed':
          return <XCircle className="w-5 h-5" />;
        case 'cancelled':
          return <AlertCircle className="w-5 h-5" />;
        case 'running':
          return <Clock className="w-5 h-5" />;
        default:
          return <Clock className="w-5 h-5" />;
      }
    };

    return {
      icon: getIcon(),
      color: getStatusTextColor(status),
      bg: getStatusStyle(status),
      text: config?.text,
      description: config?.description
    };
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
    let seconds = record?.duration;

    // 如果没有duration，尝试从results?.metrics获取
    if ((!seconds || seconds <= 0) && record?.results?.metrics?.duration) {
      seconds = record?.results.metrics?.duration;
    }

    // 如果还是没有，尝试从results?.summary获取
    if ((!seconds || seconds <= 0) && record?.results?.summary?.duration) {
      seconds = record?.results.summary?.duration;
    }

    // 尝试从results直接获取
    if ((!seconds || seconds <= 0) && record?.results?.duration) {
      seconds = record?.results.duration;
    }

    // 尝试从actualDuration获取（如果存在）
    if ((!seconds || seconds <= 0) && record?.actualDuration) {
      seconds = record?.actualDuration;
    }

    // 最后尝试计算时间差（仅对已完成的测试）
    if ((!seconds || seconds <= 0) && record?.start_time && record?.end_time) {
      const start = new Date(record?.start_time).getTime();
      const end = new Date(record?.end_time).getTime();
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

  // 优化数据准备状态，避免在数据未准备好时渲染复杂内容
  React.useEffect(() => {
    if (isOpen && record) {
      // 使用setTimeout确保数据在下一个事件循环中准备好
      const timer = setTimeout(() => {
        setIsDataReady(true);
      }, 0);
      return () => clearTimeout(timer);
    } else {
      setIsDataReady(false);
    }
    return undefined;
  }, [isOpen, record]);

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

  // 导出模态框状态
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // 使用useCallback优化事件处理函数，避免子组件不必要的重新渲染
  const copyToClipboard = React.useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  // 处理导出
  const handleExport = React.useCallback(async (exportType: string, data: any) => {
    try {
      await ExportUtils.exportByType(exportType, data);
      setIsExportModalOpen(false);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  }, []);

  const goToDetailPage = React.useCallback(() => {
    if (!record) return;
    navigate(`/stress-test/${record?.id}`);
    onClose(); // 关闭模态框
  }, [record, navigate, onClose]);

  // 使用useMemo优化状态信息计算，避免每次渲染都重新计算
  const statusInfo = React.useMemo(() => record ? getStatusInfo(record?.status) : { icon: null, color: '', bg: '', text: '', description: '' }, [record?.status]);
  const metrics = React.useMemo(() => record?.results?.metrics || {}, [record?.results?.metrics]);

  // 优化错误率计算，避免每次渲染都重新计算
  const errorRate = React.useMemo(() => {
    if (!record) return '0%';
    const rate = record?.results?.metrics?.errorRate ||
      record?.errorRate ||
      (record?.results?.metrics?.failedRequests && record?.results?.metrics?.totalRequests
        ? ((record?.results.metrics?.failedRequests / record?.results.metrics?.totalRequests) * 100)
        : 0);
    return rate > 0 ? `${rate.toFixed(2)}%` : '0%';
  }, [record?.results?.metrics?.errorRate, record?.errorRate, record?.results?.metrics?.failedRequests, record?.results?.metrics?.totalRequests]);

  // 优化格式化的持续时间计算
  const formattedDuration = React.useMemo(() => record ? formatDuration(record) : '-', [record]);

  // 优化格式化的日期计算
  const formattedDate = React.useMemo(() => record ? formatDate(record?.start_time || record?.created_at) : '-', [record?.start_time, record?.created_at]);

  // 优化标签页切换处理函数，添加防抖避免快速切换
  const handleTabChange = React.useCallback((tabId: string) => {
    // 使用requestAnimationFrame确保在下一帧更新，避免阻塞当前渲染
    requestAnimationFrame(() => {
      setActiveTab(tabId);
    });
  }, []);

  // 创建优化的标签页内容组件
  const TabContent = React.useMemo(() => {
    if (!record) return null;

    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-400">开始时间</span>
                </div>
                <p className="text-white font-medium">{formattedDate}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-400">持续时间</span>
                </div>
                <p className="text-white font-medium">{formattedDuration}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-400">并发用户</span>
                </div>
                <p className="text-white font-medium">{record?.config?.users || '-'}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-gray-400">错误率</span>
                </div>
                <p className="text-white font-medium">{errorRate}</p>
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
                    {statusInfo.text}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    {statusInfo.description}
                  </p>

                  {/* 详细的错误信息和取消原因 */}
                  {(record.status === 'failed' || record.status === 'cancelled') && record?.errorMessage && (
                    <div className={`mt-3 p-3 rounded-lg border-l-4 ${record.status === 'failed'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-400 text-red-700 dark:text-red-300'
                      : 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 text-orange-700 dark:text-orange-300'
                      }`}>
                      <div className="font-medium text-sm mb-2">
                        {record.status === 'failed' ? '失败详情' : '取消详情'}
                      </div>
                      <div className="text-sm">
                        <div className="mb-2">
                          <span className="font-medium">
                            {record.status === 'failed' ? '错误原因：' : '取消原因：'}
                          </span>
                          {record?.errorMessage}
                        </div>
                        {record.status === 'cancelled' && (
                          <div className="text-xs opacity-75">
                            <span className="font-medium">测试完成度：</span>
                            {calculateTestCompletion(record)}%
                          </div>
                        )}
                        {record?.end_time && (
                          <div className="text-xs opacity-75 mt-1">
                            <span className="font-medium">
                              {record.status === 'failed' ? '失败时间：' : '取消时间：'}
                            </span>
                            {formatDateTime(record?.end_time)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 'metrics':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">性能指标</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm text-gray-400 mb-2">总请求数</h4>
                <p className="text-2xl font-bold text-white">{record?.totalRequests || metrics?.totalRequests || 0}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm text-gray-400 mb-2">成功请求</h4>
                <p className="text-2xl font-bold text-green-400">{record?.successfulRequests || metrics?.successfulRequests || 0}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm text-gray-400 mb-2">失败请求</h4>
                <p className="text-2xl font-bold text-red-400">{record?.failedRequests || metrics?.failedRequests || 0}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm text-gray-400 mb-2">平均响应时间</h4>
                <p className="text-2xl font-bold text-blue-400">{record?.averageResponseTime || metrics?.averageResponseTime || 0}ms</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm text-gray-400 mb-2">峰值TPS</h4>
                <p className="text-2xl font-bold text-purple-400">{record?.peakTps || metrics?.peakTPS || 0}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm text-gray-400 mb-2">错误率</h4>
                <p className="text-2xl font-bold text-yellow-400">{calculateErrorRate(record, metrics).toFixed(2)}%</p>
              </div>
              {metrics?.minResponseTime && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm text-gray-400 mb-2">最小响应时间</h4>
                  <p className="text-2xl font-bold text-green-400">{metrics?.minResponseTime}ms</p>
                </div>
              )}
              {metrics?.maxResponseTime && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm text-gray-400 mb-2">最大响应时间</h4>
                  <p className="text-2xl font-bold text-red-400">{metrics?.maxResponseTime}ms</p>
                </div>
              )}
              {record?.performanceGrade && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm text-gray-400 mb-2">性能等级</h4>
                  <p className={`text-2xl font-bold ${record?.performanceGrade.startsWith('A') ? 'text-green-400' :
                    record?.performanceGrade.startsWith('B') ? 'text-blue-400' :
                      record?.performanceGrade.startsWith('C') ? 'text-yellow-400' :
                        'text-red-400'
                    }`}>{record?.performanceGrade}</p>
                </div>
              )}
            </div>

            {/* 标签显示 */}
            {record?.tags && record?.tags.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-white mb-4">标签</h4>
                <div className="flex flex-wrap gap-2">
                  {record?.tags.map((tag: string, index: number) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-blue-600/60 text-blue-200 border border-blue-500/50">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'config':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">测试配置</h3>

            {/* 基本配置 */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-md font-semibold text-white mb-4">基本配置</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-400">并发用户数</span>
                  <p className="text-white font-medium">{record?.config?.users || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-400">测试时长</span>
                  <p className="text-white font-medium">{record?.config?.duration || '-'}秒</p>
                </div>
                <div>
                  <span className="text-sm text-gray-400">加压时间</span>
                  <p className="text-white font-medium">{record?.config?.rampUpTime || record?.config?.rampUp || '-'}秒</p>
                </div>
                <div>
                  <span className="text-sm text-gray-400">测试类型</span>
                  <p className="text-white font-medium">{record?.config?.testType || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-400">请求方法</span>
                  <p className="text-white font-medium">{record?.config?.method || 'GET'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-400">超时时间</span>
                  <p className="text-white font-medium">{record?.config?.timeout || '-'}秒</p>
                </div>
              </div>
            </div>

            {/* 代理配置 */}
            {record?.config?.proxy && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  代理配置
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400 w-20">状态</span>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${record?.config.proxy.enabled ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                      <span className={`text-sm font-medium ${record?.config.proxy.enabled ? 'text-green-400' : 'text-gray-400'}`}>
                        {record?.config.proxy.enabled ? '已启用' : '已禁用'}
                      </span>
                    </div>
                  </div>

                  {record?.config.proxy.enabled && (
                    <>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-400 w-20">类型</span>
                        <span className="text-white font-medium">{record?.config.proxy.type?.toUpperCase() || 'HTTP'}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-400 w-20">地址</span>
                        <span className="text-white font-medium">
                          {record?.config.proxy.host}:{record?.config.proxy.port || 8080}
                        </span>
                      </div>
                      {record?.config.proxy.username && (
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-400 w-20">认证</span>
                          <span className="text-white font-medium">
                            {record?.config.proxy.username} (已配置密码)
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 高级配置 */}
            {(record?.config?.headers || record?.config?.body || record?.config?.warmupDuration || record?.config?.cooldownDuration) && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-md font-semibold text-white mb-4">高级配置</h4>
                <div className="space-y-3">
                  {record?.config?.warmupDuration && (
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-400 w-24">预热时间</span>
                      <span className="text-white font-medium">{record?.config.warmupDuration}秒</span>
                    </div>
                  )}
                  {record?.config?.cooldownDuration && (
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-400 w-24">冷却时间</span>
                      <span className="text-white font-medium">{record?.config.cooldownDuration}秒</span>
                    </div>
                  )}
                  {record?.config?.thinkTime && (
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-400 w-24">思考时间</span>
                      <span className="text-white font-medium">{record?.config.thinkTime}秒</span>
                    </div>
                  )}
                  {record?.config?.headers && Object.keys(record?.config.headers).length > 0 && (
                    <div>
                      <span className="text-sm text-gray-400">自定义请求头</span>
                      <div className="mt-2 bg-gray-900 rounded p-3">
                        <pre className="text-xs text-gray-300 overflow-x-auto">
                          {JSON.stringify(record?.config.headers, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  {record?.config?.body && (
                    <div>
                      <span className="text-sm text-gray-400">请求体</span>
                      <div className="mt-2 bg-gray-900 rounded p-3">
                        <pre className="text-xs text-gray-300 overflow-x-auto">
                          {record?.config.body}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 完整配置（折叠显示） */}
            <details className="bg-gray-800 rounded-lg">
              <summary className="p-4 cursor-pointer text-white font-medium hover:bg-gray-700 rounded-lg">
                查看完整配置 JSON
              </summary>
              <div className="px-4 pb-4">
                <pre className="text-gray-300 text-sm overflow-x-auto bg-gray-900 rounded p-3">
                  {JSON.stringify(record?.config, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        );
      default:
        return null;
    }
  }, [activeTab, formattedDate, formattedDuration, errorRate, statusInfo, record, metrics]);

  if (!isOpen || !record) return null;





  /**
   * 处理modalContent事件
   * @param {Object} event - 事件对象
   * @returns {Promise<void>}
   */
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
        onClick={(e) => e?.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg border ${statusInfo.bg} ${statusInfo.color}`}>
              {statusInfo.icon}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{record?.test_name}</h2>
              <p className="text-gray-400 text-sm">{record?.url}</p>
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
              onClick={() => setIsExportModalOpen(true)}
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
                onClick={() => handleTabChange(tab.id)}
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
          {isDataReady ? TabContent : (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400">加载中...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // 使用React Portal将模态窗口渲染到document.body，确保不受父容器样式影响
  return (
    <>
      {createPortal(modalContent, document.body)}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        data={{
          testConfig: record?.config || {},
          result: record?.results || {},
          metrics: record?.results?.metrics || {},
          realTimeData: record?.realTimeData || [],
          logs: record?.logs || [],
          errors: record?.errors || []
        }}
        testType="stress"
        testId={record?.id}
        testName={record?.testName || record?.name}
        onExport={handleExport}
      />
    </>
  );
});

export default StressTestDetailModal;
