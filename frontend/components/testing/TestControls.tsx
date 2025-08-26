
import { AlertCircle, CheckCircle, Loader, Play, RotateCcw, Square, XCircle } from 'lucide-react';
import type { useState, ComponentType, FC } from 'react';
import { TestPhase, TestState } from '../../services/TestStateManager';

// 控制组件属性接口
export interface TestControlsProps {
  testState: TestState;
  testPhase: TestPhase;
  progress: { progress: number; message: string };
  error: Error | null;
  isAuthenticated: boolean;
  canStartTest: boolean;
  isConnected: boolean;
  onStartTest: () => void;
  onStopTest: () => void;
  onResetTest: () => void;
  onRequireLogin: () => boolean;
}

// 状态配置
interface StateConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
  showProgress: boolean;
  allowStart: boolean;
  allowStop: boolean;
  allowReset: boolean;
}

// 状态配置映射
const stateConfigs: Record<TestState, StateConfig> = {
  [TestState.IDLE]: {
    label: '就绪',
    color: 'text-gray-300',
    bgColor: 'bg-gray-600',
    borderColor: 'border-gray-500',
    icon: Play,
    showProgress: false,
    allowStart: true,
    allowStop: false,
    allowReset: false
  },
  [TestState.STARTING]: {
    label: '启动中',
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    icon: Loader,
    showProgress: true,
    allowStart: false,
    allowStop: true,
    allowReset: false
  },
  [TestState.RUNNING]: {
    label: '运行中',
    color: 'text-green-300',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    icon: Play,
    showProgress: true,
    allowStart: false,
    allowStop: true,
    allowReset: false
  },
  [TestState.COMPLETED]: {
    label: '已完成',
    color: 'text-blue-300',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    icon: CheckCircle,
    showProgress: false,
    allowStart: false,
    allowStop: false,
    allowReset: true
  },
  [TestState.FAILED]: {
    label: '失败',
    color: 'text-red-300',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    icon: XCircle,
    showProgress: false,
    allowStart: false,
    allowStop: false,
    allowReset: true
  },
  [TestState.CANCELLED]: {
    label: '已取消',
    color: 'text-orange-300',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    icon: Square,
    showProgress: false,
    allowStart: false,
    allowStop: false,
    allowReset: true
  }
};

// 阶段描述映射
const phaseDescriptions: Record<TestPhase, string> = {
  [TestPhase.INITIALIZATION]: '初始化中...',
  [TestPhase.RAMP_UP]: '加压阶段',
  [TestPhase.STEADY_STATE]: '稳定测试中',
  [TestPhase.RAMP_DOWN]: '减压阶段',
  [TestPhase.CLEANUP]: '清理中...'
};

export const TestControls: React.FC<TestControlsProps> = ({
  testState,
  testPhase,
  progress,
  error,
  isAuthenticated,
  canStartTest,
  isConnected,
  onStartTest,
  onStopTest,
  onResetTest,
  onRequireLogin
}) => {
  const config = stateConfigs[testState];
  const IconComponent = config.icon;

  // 处理开始测试
  const handleStartTest = () => {
  const [canStartTest, setCanStartTest] = useState(false);

  const [error, setError] = useState<string | null>(null);

    if (!isAuthenticated) {
      onRequireLogin();
      return;
    }
    onStartTest();
  };

  // 获取连接状态指示器
  const getConnectionIndicator = () => {
    if (!isConnected && (testState === TestState.RUNNING || testState === TestState.STARTING)) {
      return (
        <div className="flex items-center space-x-1 text-xs text-yellow-400">
          <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
          <span>离线模式</span>
        </div>
      );
    }

    if (isConnected && (testState === TestState.RUNNING || testState === TestState.STARTING)) {
      return (
        <div className="flex items-center space-x-1 text-xs text-green-400">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
          <span>实时连接</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* 状态显示区域 */}
        <div className="flex items-center space-x-4">
          {/* 状态指示器 */}
          <div className={`flex items-center space-x-3 px-4 py-2 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
            <IconComponent
              className={`w-5 h-5 ${config.color} ${testState === TestState.STARTING || testState === TestState.RUNNING ? 'animate-pulse' : ''}`}
            />
            <div>
              <div className={`font-medium ${config.color}`}>
                {config.label}
              </div>
              {config.showProgress && (
                <div className="text-xs text-gray-400 mt-0.5">
                  {testState === TestState.RUNNING ? phaseDescriptions[testPhase] : progress.message}
                </div>
              )}
            </div>
          </div>

          {/* 进度条 */}
          {config.showProgress && progress.progress > 0 && (
            <div className="flex-1 min-w-32">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>进度</span>
                <span>{progress.progress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300 bg-gradient-to-r from-blue-500 to-green-500"
                  style={{ width: `${Math.min(100, Math.max(0, progress.progress))}%` }}
                />
              </div>
            </div>
          )}

          {/* 连接状态指示器 */}
          {getConnectionIndicator()}
        </div>

        {/* 控制按钮区域 */}
        <div className="flex items-center space-x-3">
          {/* 开始测试按钮 */}
          {config.allowStart && (
            <button
              type="button"
              onClick={handleStartTest}
              disabled={!canStartTest}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${!canStartTest
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : isAuthenticated
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-sm hover:shadow-md'
                }`}
            >
              <Play className="w-4 h-4" />
              <span>开始测试</span>
            </button>
          )}

          {/* 取消测试按钮 */}
          {config.allowStop && (
            <button
              type="button"
              onClick={onStopTest}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow-md"
            >
              <Square className="w-4 h-4" />
              <span>取消测试</span>
            </button>
          )}

          {/* 重置按钮 */}
          {config.allowReset && (
            <button
              type="button"
              onClick={onResetTest}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-all text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              <span>重新测试</span>
            </button>
          )}
        </div>
      </div>

      {/* 错误信息显示 */}
      {error && testState === TestState.FAILED && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-red-300">测试失败</div>
              <div className="text-xs text-red-400 mt-1">{error.message}</div>
            </div>
          </div>
        </div>
      )}

      {/* 详细进度信息 */}
      {config.showProgress && progress.message && (
        <div className="mt-3 text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
            <span>{progress.message}</span>
          </div>
        </div>
      )}

      {/* 测试阶段详细信息 */}
      {testState === TestState.RUNNING && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${testPhase === TestPhase.INITIALIZATION ? 'bg-yellow-400 animate-pulse' :
              testPhase === TestPhase.RAMP_UP || testPhase === TestPhase.STEADY_STATE || testPhase === TestPhase.RAMP_DOWN || testPhase === TestPhase.CLEANUP ? 'bg-green-400' : 'bg-gray-600'
              }`}></div>
            <span className={testPhase === TestPhase.INITIALIZATION ? 'text-yellow-300' : 'text-gray-400'}>
              初始化
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${testPhase === TestPhase.RAMP_UP ? 'bg-yellow-400 animate-pulse' :
              testPhase === TestPhase.STEADY_STATE || testPhase === TestPhase.RAMP_DOWN || testPhase === TestPhase.CLEANUP ? 'bg-green-400' : 'bg-gray-600'
              }`}></div>
            <span className={testPhase === TestPhase.RAMP_UP ? 'text-yellow-300' : testPhase === TestPhase.STEADY_STATE || testPhase === TestPhase.RAMP_DOWN || testPhase === TestPhase.CLEANUP ? 'text-green-300' : 'text-gray-400'}>
              加压
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${testPhase === TestPhase.STEADY_STATE ? 'bg-green-400 animate-pulse' :
              testPhase === TestPhase.RAMP_DOWN || testPhase === TestPhase.CLEANUP ? 'bg-green-400' : 'bg-gray-600'
              }`}></div>
            <span className={testPhase === TestPhase.STEADY_STATE ? 'text-green-300' : testPhase === TestPhase.RAMP_DOWN || testPhase === TestPhase.CLEANUP ? 'text-green-300' : 'text-gray-400'}>
              稳定
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${testPhase === TestPhase.RAMP_DOWN ? 'bg-yellow-400 animate-pulse' :
              testPhase === TestPhase.CLEANUP ? 'bg-green-400' : 'bg-gray-600'
              }`}></div>
            <span className={testPhase === TestPhase.RAMP_DOWN ? 'text-yellow-300' : testPhase === TestPhase.CLEANUP ? 'text-green-300' : 'text-gray-400'}>
              减压
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestControls;
