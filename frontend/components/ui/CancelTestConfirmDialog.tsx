import { Activity, AlertTriangle, Clock, Square, Users, X } from 'lucide-react';
import React, { useState } from 'react';

interface CancelTestConfirmDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (reason: string, preserveData: boolean) => void;
  testProgress?: {
    duration: number;
    completedRequests: number;
    totalRequests: number;
    currentUsers: number;
    phase: string;
    totalDuration: number; // 添加总测试时长
  };
  isLoading?: boolean;
}

const CancelTestConfirmDialog: React.FC<CancelTestConfirmDialogProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  testProgress,
  isLoading = false
}) => {
  
  // 页面级功能
  const [pageTitle, setPageTitle] = useState('');

  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => 
    debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  const [selectedReason, setSelectedReason] = useState('user_cancelled');
  const [preserveData, setPreserveData] = useState(true);
  const [customReason, setCustomReason] = useState('');

  const cancelReasons = [
    { value: 'user_cancelled', label: '用户主动取消' },
    { value: 'test_error', label: '测试出现错误' },
    { value: 'resource_limit', label: '资源限制' },
    { value: 'time_constraint', label: '时间限制' },
    { value: 'configuration_change', label: '配置需要调整' },
    { value: 'other', label: '其他原因' }
  ];

  const handleConfirm = () => {
    const reason = selectedReason === 'other' ? customReason :
      cancelReasons.find(r => r.value === selectedReason)?.label || '用户取消';
    onConfirm(reason, preserveData);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const calculateProgress = () => {
    if (!testProgress) return 0;

    // 🔧 修复：改为基于时间计算进度，而不是请求数
    if (testProgress.duration <= 0) return 0;

    // 🔧 修复：直接使用实际配置，如果没有配置说明测试有问题
    if (!testProgress.totalDuration || testProgress.totalDuration <= 0) {
      
        console.error('测试配置错误：无法获取总测试时长');
      return 0; // 配置错误时返回0%
      }

    // 基于时间计算进度：已运行时间 / 总测试时间
    const timeProgress = (testProgress.duration / testProgress.totalDuration) * 100;

    return Math.min(Math.round(timeProgress), 100); // 限制最大值为100%
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700 max-h-[95vh] flex flex-col">
        {/* 头部 - 固定高度 */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="p-2 bg-red-500/20 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-white">取消压力测试</h3>
              <p className="text-xs sm:text-sm text-gray-400">确认要取消当前正在运行的测试吗？</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            disabled={isLoading}
            title="关闭弹窗"
            aria-label="关闭弹窗"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          </button>
        </div>

        {/* 主体内容 - 可滚动区域 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* 测试进度信息 */}
          {testProgress && (
            <div className="p-4 sm:p-6 border-b border-gray-700 bg-gray-750">
              <h4 className="text-sm font-medium text-gray-300 mb-3">当前测试状态</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300">运行时长:</span>
                  <span className="text-white font-medium">{formatDuration(testProgress.duration)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-green-400" />
                  <span className="text-gray-300">当前用户:</span>
                  <span className="text-white font-medium">{testProgress.currentUsers}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-300">完成进度:</span>
                  <span className="text-white font-medium">{calculateProgress()}%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Square className="w-4 h-4 text-orange-400" />
                  <span className="text-gray-300">当前阶段:</span>
                  <span className="text-white font-medium">{testProgress.phase}</span>
                </div>
              </div>

              {/* 进度条 */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>测试进度</span>
                  <span>
                    {!testProgress.totalDuration || testProgress.totalDuration <= 0 ? (
                      <span className="text-red-400">配置错误</span>
                    ) : (
                      `${calculateProgress()}% (${formatDuration(testProgress.duration)} / ${formatDuration(testProgress.totalDuration)})`
                    )}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${calculateProgress()}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 取消原因选择 */}
          <div className="p-4 sm:p-6 border-b border-gray-700">
            <h4 className="text-sm font-medium text-gray-300 mb-3">取消原因</h4>
            <div className="space-y-2">
              {cancelReasons.map((reason) => (
                <label key={reason.value} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="cancelReason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-300">{reason.label}</span>
                </label>
              ))}
            </div>

            {/* 自定义原因输入 */}
            {selectedReason === 'other' && (
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="请输入取消原因..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          {/* 数据保存选项 */}
          <div className="p-4 sm:p-6 border-b border-gray-700">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preserveData}
                onChange={(e) => setPreserveData(e.target.checked)}
                className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 mt-0.5 flex-shrink-0"
                disabled={isLoading}
              />
              <div className="min-w-0">
                <span className="text-sm font-medium text-gray-300">保存已收集的测试数据</span>
                <p className="text-xs text-gray-400 mt-1">
                  勾选此项将保存测试过程中已收集的性能数据，便于后续分析
                </p>
              </div>
            </label>
          </div>

          {/* 警告信息 */}
          <div className="p-4 sm:p-6 bg-red-500/5">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-red-300 font-medium">注意事项</p>
                <ul className="text-xs text-red-200/80 mt-1 space-y-1">
                  <li>• 取消后测试将立即停止，无法恢复</li>
                  <li>• 正在进行的请求可能需要几秒钟才能完全停止</li>
                  <li>• 取消操作将被记录在测试历史中</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 按钮 - 固定在底部 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-700 bg-gray-800 flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-colors disabled:opacity-50 order-2 sm:order-1"
            disabled={isLoading}
          >
            继续测试
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || (selectedReason === 'other' && !customReason.trim())}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>取消中...</span>
              </>
            ) : (
              <>
                <Square className="w-4 h-4" />
                <span>确认取消</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelTestConfirmDialog;
