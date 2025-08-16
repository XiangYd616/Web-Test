import React from 'react';
import { AlertTriangle, Square, Clock, Database } from 'lucide-react';

interface StopTestConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testProgress?: string;
  testDuration?: number;
  dataCollected?: number;
}

export const StopTestConfirmDialog: React.FC<StopTestConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  testProgress = '',
  testDuration = 0,
  dataCollected = 0
}) => {
  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-md w-full">
        {/* 头部 */}
        <div className="flex items-center space-x-3 p-6 border-b border-gray-700">
          <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">停止压力测试</h3>
            <p className="text-sm text-gray-400">确认要停止当前正在运行的测试吗？</p>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-4">
          {/* 警告信息 */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Square className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-yellow-300">停止后将无法恢复</p>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• 测试将立即停止，无法继续</li>
                  <li>• 已收集的数据将被保留</li>
                  <li>• 测试记录将标记为"已取消"</li>
                  <li>• 可以重新开始新的测试</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 当前测试信息 */}
          <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-gray-300">当前测试状态</h4>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-gray-400">运行时长</p>
                  <p className="text-white font-medium">{formatDuration(testDuration)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-green-400" />
                <div>
                  <p className="text-gray-400">数据点</p>
                  <p className="text-white font-medium">{dataCollected} 个</p>
                </div>
              </div>
            </div>

            {testProgress && (
              <div className="pt-2 border-t border-gray-600">
                <p className="text-xs text-gray-400">当前进度</p>
                <p className="text-sm text-gray-300">{testProgress}</p>
              </div>
            )}
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-colors"
          >
            继续测试
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <Square className="w-4 h-4" />
            <span>确认停止</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StopTestConfirmDialog;
