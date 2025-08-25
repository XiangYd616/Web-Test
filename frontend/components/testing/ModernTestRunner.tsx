/**
 * 现代化测试运行器组件
 * 展示如何使用新的类型系统构建测试组件
 * 
 * 这是一个示例组件，展示了：
 * 1. 使用统一的类型定义
 * 2. 类型安全的组件Props
 * 3. 完整的TypeScript支持
 * 4. 现代化的React模式
 */

import { useCallback, useState } from 'react';
import type { FC } from 'react';
import type {
  TestType,
  TestStatus,
  UnifiedTestConfig,
  TestExecution,
  ProgressCallback,
  CompletionCallback,
  ErrorCallback,
  ComponentSize,
  ComponentColor,
  ComponentVariant,
  BaseComponentProps
} from '../../types';

// 组件Props接口 - 使用统一的类型系统
interface ModernTestRunnerProps extends BaseComponentProps {
  /** 支持的测试类型 */
  supportedTestTypes: TestType[];
  /** 默认测试类型 */
  defaultTestType?: TestType;
  /** 组件尺寸 */
  size?: ComponentSize;
  /** 颜色主题 */
  color?: ComponentColor;
  /** 按钮变体 */
  variant?: ComponentVariant;
  /** 是否显示高级选项 */
  showAdvancedOptions?: boolean;
  /** 测试完成回调 */
  onTestComplete?: (result: any) => void;
  /** 测试错误回调 */
  onTestError?: (error: Error) => void;
}

// 组件状态接口
interface TestRunnerState {
  /** 当前测试类型 */
  testType: TestType;
  /** 测试配置 */
  config: Partial<UnifiedTestConfig>;
  /** 测试状态 */
  status: TestStatus;
  /** 测试进度 */
  progress: number;
  /** 当前步骤 */
  currentStep: string;
  /** 测试结果 */
  result: any;
  /** 错误信息 */
  error: string | null;
}

/**
 * 现代化测试运行器组件
 */
export const ModernTestRunner: React.FC<ModernTestRunnerProps> = ({
  supportedTestTypes,
  defaultTestType = 'performance',
  size = 'md',
  color = 'primary',
  variant = 'primary',
  showAdvancedOptions = false,
  onTestComplete,
  onTestError,
  className = '',
  'data-testid': testId = 'modern-test-runner',
  ...props
}) => {
  // 状态管理 - 使用类型安全的状态
  const [state, setState] = useState<TestRunnerState>({
    testType: defaultTestType,
    config: {
      url: '',
      testType: defaultTestType,
      timeout: 30000,
      retries: 3
    },
    status: 'idle',
    progress: 0,
    currentStep: '准备就绪',
    result: null,
    error: null
  });

  // 更新配置的类型安全方法
  const updateConfig = useCallback((updates: Partial<UnifiedTestConfig>) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, ...updates },
      error: null // 清除之前的错误
    }));
  }, []);

  // 更新测试类型
  const updateTestType = useCallback((testType: TestType) => {
    setState(prev => ({
      ...prev,
      testType,
      config: {
        ...prev.config,
        testType,
        // 根据测试类型设置默认配置
        ...(testType === 'performance' && {
          device: 'desktop' as const,
          networkCondition: 'fast-3g' as const
        }),
        ...(testType === 'security' && {
          scanDepth: 'standard' as const
        })
      }
    }));
  }, []);

  // 进度回调 - 类型安全
  const handleProgress: ProgressCallback = useCallback((progress, step, metrics) => {
    setState(prev => ({
      ...prev,
      progress,
      currentStep: step,
      status: 'running'
    }));
  }, []);

  // 完成回调 - 类型安全
  const handleComplete: CompletionCallback = useCallback((result) => {
    setState(prev => ({
      ...prev,
      status: 'completed',
      progress: 100,
      currentStep: '测试完成',
      result,
      error: null
    }));
    onTestComplete?.(result);
  }, [onTestComplete]);

  // 错误回调 - 类型安全
  const handleError: ErrorCallback = useCallback((error) => {
    setState(prev => ({
      ...prev,
      status: 'failed',
      currentStep: '测试失败',
      error: error.message
    }));
    onTestError?.(error);
  }, [onTestError]);

  // 开始测试
  const startTest = useCallback(async () => {
    if (!state.config.url) {
      handleError(new Error('请输入测试URL'));
      return;
    }

    setState(prev => ({
      ...prev,
      status: 'starting',
      progress: 0,
      currentStep: '正在启动测试...',
      result: null,
      error: null
    }));

    try {
      // 这里应该调用实际的测试API
      // 使用类型安全的配置
      const testConfig: UnifiedTestConfig = {
        url: state.config.url!,
        testType: state.testType,
        timeout: state.config.timeout || 30000,
        retries: state.config.retries || 3,
        ...state.config
      } as UnifiedTestConfig;

      // 模拟测试执行
      handleProgress(10, '正在初始化测试环境...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      handleProgress(30, '正在执行测试...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      handleProgress(70, '正在分析结果...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      handleProgress(90, '正在生成报告...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // 模拟测试结果
      const mockResult = {
        testType: state.testType,
        url: state.config.url,
        score: Math.floor(Math.random() * 40) + 60, // 60-100分
        duration: Math.floor(Math.random() * 5000) + 2000, // 2-7秒
        timestamp: new Date().toISOString(),
        details: {
          [`${state.testType}_specific_metric`]: Math.random() * 100
        }
      };

      handleComplete(mockResult);

    } catch (error) {
      handleError(error as Error);
    }
  }, [state.config, state.testType, handleProgress, handleComplete, handleError]);

  // 停止测试
  const stopTest = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'cancelled',
      currentStep: '测试已取消'
    }));
  }, []);

  // 重置测试
  const resetTest = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'idle',
      progress: 0,
      currentStep: '准备就绪',
      result: null,
      error: null
    }));
  }, []);

  // 渲染测试类型选择器
  const renderTestTypeSelector = () => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        测试类型
      </label>
      <select
        value={state.testType}
        onChange={(e) => updateTestType(e.target.value as TestType)}
        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={state.status === 'running'}
      >
        {supportedTestTypes.map(type => (
          <option key={type} value={type}>
            {type === 'performance' && '性能测试'}
            {type === 'security' && '安全测试'}
            {type === 'api' && 'API测试'}
            {type === 'compatibility' && '兼容性测试'}
            {type === 'ux' && 'UX测试'}
            {type === 'seo' && 'SEO测试'}
            {type === 'network' && '网络测试'}
            {type === 'database' && '数据库测试'}
            {type === 'website' && '网站综合测试'}
          </option>
        ))}
      </select>
    </div>
  );

  // 渲染配置表单
  const renderConfigForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          测试URL *
        </label>
        <input
          type="url"
          value={state.config.url || ''}
          onChange={(e) => updateConfig({ url: e.target.value })}
          placeholder="https://example.com"
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={state.status === 'running'}
          required
        />
      </div>

      {showAdvancedOptions && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              超时时间 (毫秒)
            </label>
            <input
              type="number"
              value={state.config.timeout || 30000}
              onChange={(e) => updateConfig({ timeout: parseInt(e.target.value) })}
              min="5000"
              max="300000"
              step="1000"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={state.status === 'running'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              重试次数
            </label>
            <input
              type="number"
              value={state.config.retries || 3}
              onChange={(e) => updateConfig({ retries: parseInt(e.target.value) })}
              min="0"
              max="10"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={state.status === 'running'}
            />
          </div>
        </>
      )}
    </div>
  );

  // 渲染进度显示
  const renderProgress = () => {
    if (state.status === 'idle') return null;

    return (
      <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">
            {state.currentStep}
          </span>
          <span className="text-sm text-gray-400">
            {state.progress.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              state.status === 'failed' ? 'bg-red-500' :
              state.status === 'completed' ? 'bg-green-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${state.progress}%` }}
          />
        </div>
      </div>
    );
  };

  // 渲染结果显示
  const renderResult = () => {
    if (!state.result && !state.error) return null;

    return (
      <div className="mt-6">
        {state.error ? (
          <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
            <h3 className="text-red-400 font-semibold mb-2">测试失败</h3>
            <p className="text-red-300">{state.error}</p>
          </div>
        ) : (
          <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
            <h3 className="text-green-400 font-semibold mb-2">测试完成</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-400">评分:</span> <span className="text-green-300">{state.result.score}</span></p>
              <p><span className="text-gray-400">耗时:</span> <span className="text-green-300">{state.result.duration}ms</span></p>
              <p><span className="text-gray-400">时间:</span> <span className="text-green-300">{new Date(state.result.timestamp).toLocaleString()}</span></p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染操作按钮
  const renderActions = () => (
    <div className="mt-6 flex space-x-3">
      <button
        onClick={startTest}
        disabled={state.status === 'running' || !state.config.url}
        className={`
          px-6 py-3 rounded-lg font-medium transition-colors
          ${state.status === 'running' || !state.config.url
            ? 'bg-gray-600 cursor-not-allowed text-gray-400'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
          }
        `}
      >
        {state.status === 'running' ? '测试进行中...' : '开始测试'}
      </button>

      {state.status === 'running' && (
        <button
          onClick={stopTest}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          停止测试
        </button>
      )}

      {(state.result || state.error) && (
        <button
          onClick={resetTest}
          className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
        >
          重新测试
        </button>
      )}
    </div>
  );

  return (
    <div 
      className={`bg-gray-900 border border-gray-700 rounded-xl p-6 ${className}`}
      data-testid={testId}
      {...props}
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">现代化测试运行器</h2>
        <p className="text-gray-400 text-sm">
          使用统一类型系统构建的测试组件示例
        </p>
      </div>

      {renderTestTypeSelector()}
      {renderConfigForm()}
      {renderProgress()}
      {renderResult()}
      {renderActions()}
    </div>
  );
};

export default ModernTestRunner;
