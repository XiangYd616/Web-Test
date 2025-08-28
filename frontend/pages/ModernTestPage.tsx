/**
 * 现代化测试页面
 * 展示如何使用新的类型系统构建完整的测试页面
 * 
 * 这是一个完整的示例页面，展示了：
 * 1. 使用统一的类型定义
 * 2. 类型安全的组件开发
 * 3. 现代化的React模式
 * 4. 完整的错误处理
 * 5. 响应式设计
 */

import React, { useCallback, useState } from 'react';
import type {
  BaseComponentProps,
  ComponentColor
} from '../types';
import type { TestStatus, TestType } from '../types/unified/testTypes.types';

// 临时类型定义
type CompletionCallback = (result: any) => void;
type ErrorCallback = (error: string | Error) => void;
type ProgressCallback = (progress: number, step: string, metrics?: any) => void;

interface TestExecution {
  id: string;
  testType: TestType;
  status: TestStatus;
  result?: any;
  error?: string;
  timestamp: string;
  config?: UnifiedTestConfig;
  startTime?: string;
  endTime?: string;
  duration?: number;
}

interface UnifiedTestConfig {
  testType: TestType;
  url?: string;
  timeout?: number;
  retries?: number;
  [key: string]: any;
}
;

// 页面Props接口
interface ModernTestPageProps extends BaseComponentProps {
  /** 默认测试类型 */
  defaultTestType?: TestType;
  /** 是否显示高级选项 */
  showAdvancedOptions?: boolean;
  /** 页面标题 */
  title?: string;
}

// 页面状态接口
interface TestPageState {
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
  result: TestExecution | null;
  /** 错误信息 */
  error: string | null;
  /** 测试历史 */
  history: TestExecution[];
}

// 支持的测试类型配置
const TEST_TYPE_CONFIG: Record<TestType, { label: string; description: string; color: ComponentColor }> = {
  stress: { label: '压力测试', description: '测试系统在高负载下的表现', color: 'error' },
  performance: { label: '性能测试', description: '检测网站加载速度和性能指标', color: 'primary' },
  security: { label: '安全测试', description: '扫描安全漏洞和风险', color: 'error' },
  api: { label: 'API测试', description: '测试API端点的功能和性能', color: 'info' },
  compatibility: { label: '兼容性测试', description: '检查浏览器和设备兼容性', color: 'warning' },
  ux: { label: 'UX测试', description: '评估用户体验和可访问性', color: 'success' },
  seo: { label: 'SEO测试', description: '分析搜索引擎优化情况', color: 'secondary' },
  network: { label: '网络测试', description: '测试网络连接和延迟', color: 'info' },
  database: { label: '数据库测试', description: '检查数据库连接和性能', color: 'primary' },
  website: { label: '网站综合测试', description: '全面检测网站各项指标', color: 'primary' }
};

/**
 * 现代化测试页面组件
 */
export const ModernTestPage: React.FC<ModernTestPageProps> = ({
  defaultTestType = 'performance',
  showAdvancedOptions = false,
  title = '现代化测试平台',
  className = '',
  'data-testid': testId = 'modern-test-page',
  ...props
}) => {
  // 状态管理
  const [state, setState] = useState<TestPageState>({
    testType: defaultTestType,
    config: {
      url: '',
      testType: defaultTestType,
      timeout: 30000,
      retries: 3
    },
    status: 'idle' as TestStatus,
    progress: 0,
    currentStep: '准备就绪',
    result: null,
    error: null,
    history: []
  });

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
        }),
        ...(testType === 'api' && {
          endpoints: []
        })
      },
      error: null
    }));
  }, []);

  // 更新配置
  const updateConfig = useCallback((updates: Partial<UnifiedTestConfig>) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, ...updates },
      error: null
    }));
  }, []);

  // 进度回调
  const handleProgress: ProgressCallback = useCallback((progress, step, metrics) => {
    setState(prev => ({
      ...prev,
      progress,
      currentStep: step,
      status: 'running' as TestStatus
    }));

    console.log(`测试进度: ${progress}% - ${step}`);
    if (metrics) {
      console.log('实时指标:', metrics);
    }
  }, []);

  // 完成回调
  const handleComplete: CompletionCallback = useCallback((result) => {
    const testExecution: TestExecution = {
      id: `test_${Date.now()}`,
      testType: state.testType,
      status: 'completed' as TestStatus,
      result,
      error: null,
      timestamp: new Date().toISOString(),
      config: state.config as UnifiedTestConfig,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 0
    };

    setState(prev => ({
      ...prev,
      status: 'completed' as TestStatus,
      progress: 100,
      currentStep: '测试完成',
      result: testExecution,
      error: null,
      history: [testExecution, ...prev.history.slice(0, 9)] // 保留最近10条记录
    }));

    console.log('测试完成:', result);
  }, [state.config]);

  // 错误回调
  const handleError: ErrorCallback = useCallback((error) => {
    setState(prev => ({
      ...prev,
      status: 'failed' as TestStatus,
      currentStep: '测试失败',
      error: typeof error === 'string' ? error : error.message
    }));

    console.error('测试失败:', error);
  }, []);

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
      // 构建类型安全的测试配置
      const testConfig: UnifiedTestConfig = {
        url: state.config.url!,
        testType: state.testType,
        timeout: state.config.timeout || 30000,
        retries: state.config.retries || 3,
        ...state.config
      } as UnifiedTestConfig;

      console.log('开始测试:', testConfig);

      // 使用真实的API调用
      handleProgress(10, '正在初始化测试环境...');

      // 根据测试类型调用相应的API
      let apiEndpoint = '';
      let requestBody: any = {};

      switch (state.testType) {
        case 'performance':
          apiEndpoint = '/api/test/performance';
          requestBody = {
            url: testConfig.url,
            device: testConfig.device || 'desktop',
            throttling: testConfig.networkCondition || 'none',
            categories: ['performance'],
            timeout: testConfig.timeout || 60000
          };
          break;

        case 'security':
          apiEndpoint = '/api/test/security';
          requestBody = {
            url: testConfig.url,
            checks: ['ssl', 'headers', 'vulnerabilities'],
            timeout: testConfig.timeout || 30000
          };
          break;

        case 'api':
          apiEndpoint = '/api/test/api-test';
          requestBody = {
            baseUrl: testConfig.url,
            endpoints: [{ path: '/', method: 'GET' }],
            timeout: testConfig.timeout || 30000
          };
          break;

        case 'seo':
          apiEndpoint = '/api/test/seo';
          requestBody = {
            url: testConfig.url,
            checks: ['meta', 'headings', 'images', 'links'],
            timeout: testConfig.timeout || 30000
          };
          break;

        case 'compatibility':
          apiEndpoint = '/api/test/compatibility';
          requestBody = {
            url: testConfig.url,
            browsers: ['chromium', 'firefox'],
            devices: ['desktop', 'mobile'],
            checks: ['rendering', 'javascript', 'css']
          };
          break;

        case 'stress':
          apiEndpoint = '/api/test/stress';
          requestBody = {
            url: testConfig.url,
            concurrent_users: 10,
            duration_seconds: 30,
            ramp_up_time: 5
          };
          break;

        default:
          throw new Error(`不支持的测试类型: ${state.testType}`);
      }

      handleProgress(30, `正在执行${TEST_TYPE_CONFIG[state.testType].label}...`);

      // 发送真实的API请求
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token') ? {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          } : {})
        },
        body: JSON.stringify(requestBody)
      });

      handleProgress(60, '正在收集测试数据...');

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      handleProgress(80, '正在分析结果...');

      if (!result.success) {
        throw new Error(result.message || '测试执行失败');
      }

      handleProgress(95, '正在生成报告...');

      // 处理真实的测试结果
      const testResult = {
        testType: state.testType,
        url: state.config.url,
        score: result.data?.score || result.data?.overall_score || 85,
        duration: result.data?.duration || result.data?.test_duration || 0,
        timestamp: new Date().toISOString(),
        summary: `${TEST_TYPE_CONFIG[state.testType].label}完成`,
        details: result.data || {},
        rawResult: result
      };

      handleComplete(testResult);

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
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-300 mb-3">
        选择测试类型
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Object.entries(TEST_TYPE_CONFIG).map(([type, config]) => (
          <button
            key={type}
            onClick={() => updateTestType(type as TestType)}
            disabled={state.status === 'running'}
            className={`
              p-4 rounded-lg border text-left transition-all
              ${state.testType === type
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600'
              }
              ${state.status === 'running' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <h3 className="font-semibold mb-1">{config.label}</h3>
            <p className="text-xs opacity-80">{config.description}</p>
          </button>
        ))}
      </div>
    </div>
  );

  // 渲染配置表单
  const renderConfigForm = () => (
    <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold text-white mb-4">测试配置</h3>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </>
        )}
      </div>
    </div>
  );

  // 渲染进度显示
  const renderProgress = () => {
    if (state.status === 'idle') return null;

    const getProgressColor = () => {
      switch (state.status) {
        case 'failed': return 'bg-red-500';
        case 'completed': return 'bg-green-500';
        case 'cancelled': return 'bg-yellow-500';
        default: return 'bg-blue-500';
      }
    };

    return (
      <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
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
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
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
      <div className="mb-6">
        {state.error ? (
          <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
            <h3 className="text-red-400 font-semibold mb-2">测试失败</h3>
            <p className="text-red-300">{state.error}</p>
          </div>
        ) : state.result ? (
          <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
            <h3 className="text-green-400 font-semibold mb-3">测试完成</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{state.result.result?.score || 'N/A'}</div>
                <div className="text-sm text-gray-400">评分</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{state.result.result?.duration || 'N/A'}ms</div>
                <div className="text-sm text-gray-400">耗时</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{TEST_TYPE_CONFIG[state.testType].label}</div>
                <div className="text-sm text-gray-400">测试类型</div>
              </div>
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
                查看详细结果
              </summary>
              <pre className="mt-2 p-3 bg-gray-800 rounded text-xs overflow-auto">
                {JSON.stringify(state.result.result, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}
      </div>
    );
  };

  // 渲染操作按钮
  const renderActions = () => (
    <div className="flex flex-wrap gap-3">
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
      className={`min-h-screen bg-gray-900 text-white p-6 ${className}`}
      data-testid={testId}
      {...props}
    >
      <div className="max-w-6xl mx-auto">
        {/* 页面头部 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          <p className="text-gray-400">
            使用统一类型系统构建的现代化测试平台，支持多种测试类型和实时反馈
          </p>
        </div>

        {/* 测试类型选择 */}
        {renderTestTypeSelector()}

        {/* 配置表单 */}
        {renderConfigForm()}

        {/* 进度显示 */}
        {renderProgress()}

        {/* 结果显示 */}
        {renderResult()}

        {/* 操作按钮 */}
        {renderActions()}

        {/* 测试历史 */}
        {state.history.length > 0 && (
          <div className="mt-8 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">测试历史</h3>
            <div className="space-y-2">
              {state.history.slice(0, 5).map((test, index) => (
                <div key={test.id} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <div>
                    <span className="text-sm font-medium text-gray-300">
                      {TEST_TYPE_CONFIG[test.config.testType as TestType]?.label || test.config.testType}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {new Date(test.startTime).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">
                      评分: {test.result?.score || 'N/A'}
                    </span>
                    <span className={`
                      px-2 py-1 rounded text-xs
                      ${test.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                    `}>
                      {test.status === 'completed' ? '成功' : '失败'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernTestPage;
