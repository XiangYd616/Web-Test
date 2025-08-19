import { AlertCircle, CheckCircle, Loader2, Square } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface CancelProgressFeedbackProps {
  isVisible: boolean;
  onComplete: () => void;
  testId?: string;
}

interface CancelStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
}

const CancelProgressFeedback: React.FC<CancelProgressFeedbackProps> = ({
  isVisible,
  onComplete,
  testId
}) => {
  const [steps, setSteps] = useState<CancelStep[]>([
    { id: 'stop_requests', label: '停止新请求', status: 'pending' },
    { id: 'cleanup_connections', label: '清理连接', status: 'pending' },
    { id: 'save_data', label: '保存测试数据', status: 'pending' },
    { id: 'update_status', label: '更新测试状态', status: 'pending' },
    { id: 'notify_completion', label: '完成取消操作', status: 'pending' }
  ]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      // 重置状态
      setSteps(steps.map(step => ({ ...step, status: 'pending' })));
      setCurrentStepIndex(0);
      setIsCompleted(false);
      setHasError(false);
      return;
    }

    // 模拟取消进度
    const simulateProgress = async () => {
      for (let i = 0; i < steps.length; i++) {
        // 更新当前步骤为运行中
        setSteps(prev => prev.map((step, index) => ({
          ...step,
          status: index === i ? 'running' : index < i ? 'completed' : 'pending'
        })));
        setCurrentStepIndex(i);

        // 模拟步骤执行时间
        const delay = i === 0 ? 500 : i === steps.length - 1 ? 300 : 400;
        await new Promise(resolve => setTimeout(resolve, delay));

        // 标记当前步骤完成
        setSteps(prev => prev.map((step, index) => ({
          ...step,
          status: index <= i ? 'completed' : 'pending'
        })));
      }

      setIsCompleted(true);

      // 延迟一下再调用完成回调
      setTimeout(() => {
        onComplete();
      }, 1000);
    };

    simulateProgress().catch(() => {
      setHasError(true);
      setSteps(prev => prev.map((step, index) => ({
        ...step,
        status: index === currentStepIndex ? 'error' : step.status
      })));
    });
  }, [isVisible]);

  const getStepIcon = (step: CancelStep) => {
    switch (step.status) {
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <div className="w-4 h-4 border-2 border-gray-600 rounded-full" />;
    }
  };

  const getStepTextColor = (step: CancelStep) => {
    switch (step.status) {
      case 'running':
        return 'text-blue-300';
      case 'completed':
        return 'text-green-300';
      case 'error':
        return 'text-red-300';
      default:
        return 'text-gray-400';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center space-x-3 p-6 border-b border-gray-700">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <Square className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">正在取消测试</h3>
            <p className="text-sm text-gray-400">
              {isCompleted ? '取消完成' : hasError ? '取消过程中出现错误' : '请稍候，正在安全停止测试...'}
            </p>
          </div>
        </div>

        {/* 进度步骤 */}
        <div className="p-6">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-3">
                {getStepIcon(step)}
                <div className="flex-1">
                  <div className={`text-sm font-medium ${getStepTextColor(step)}`}>
                    {step.label}
                  </div>
                  {step.message && (
                    <div className="text-xs text-gray-500 mt-1">{step.message}</div>
                  )}
                </div>
                {step.status === 'completed' && (
                  <div className="text-xs text-green-400">✓</div>
                )}
                {step.status === 'error' && (
                  <div className="text-xs text-red-400">✗</div>
                )}
              </div>
            ))}
          </div>

          {/* 整体进度条 */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>取消进度</span>
              <span>{Math.round(((currentStepIndex + (isCompleted ? 1 : 0)) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${hasError ? 'bg-red-500' : isCompleted ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                style={{
                  width: `${((currentStepIndex + (isCompleted ? 1 : 0)) / steps.length) * 100}%`
                }}
              />
            </div>
          </div>

          {/* 测试ID信息 */}
          {testId && (
            <div className="mt-4 p-3 bg-gray-750 rounded-lg">
              <div className="text-xs text-gray-400">测试ID</div>
              <div className="text-sm text-gray-300 font-mono">{testId}</div>
            </div>
          )}

          {/* 完成状态 */}
          {isCompleted && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-sm font-medium text-green-300">取消成功</div>
                  <div className="text-xs text-green-400/80">测试已安全停止，数据已保存</div>
                </div>
              </div>
            </div>
          )}

          {/* 错误状态 */}
          {hasError && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <div>
                  <div className="text-sm font-medium text-red-300">取消过程中出现问题</div>
                  <div className="text-xs text-red-400/80">测试可能仍在运行，请稍后检查状态</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部信息 */}
        {!isCompleted && !hasError && (
          <div className="px-6 pb-6">
            <div className="text-xs text-gray-500 text-center">
              取消操作通常需要 2-5 秒完成，请耐心等待
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CancelProgressFeedback;
