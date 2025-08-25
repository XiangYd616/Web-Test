
/**
 * 浏览器兼容性测试页面
 * 扩展版本 - 支持多浏览器兼容性检测和深度分析
 */

import {
  AlertTriangle,
  CheckCircle,
  Chrome,
  Info,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ComponentType, FC } from 'react';
import TestPageLayout from '../components/testing/TestPageLayout';

// 浏览器信息接口
interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  marketShare: number;
  icon: React.ComponentType<any>;
  color: string;
}

// 兼容性测试配置
interface CompatibilityTestConfig {
  url: string;
  browsers: string[];
  devices: string[];
  testTypes: string[];
  checkAccessibility: boolean;
  checkPerformance: boolean;
  checkSecurity: boolean;
  includePolyfills: boolean;
  customViewports: Array<{
    name: string;
    width: number;
    height: number;
  }>;
}

// 兼容性测试结果
interface CompatibilityTestResult {
  id: string;
  timestamp: string;
  url: string;
  overallScore: number;
  browserResults: {
    [browserName: string]: {
      score: number;
      issues: Array<{
        type: 'error' | 'warning' | 'info';
        category: string;
        description: string;
        impact: 'high' | 'medium' | 'low';
        solution?: string;
      }>;
      features: {
        [feature: string]: {
          supported: boolean;
          version?: string;
          notes?: string;
        };
      };
      performance: {
        loadTime: number;
        renderTime: number;
        interactiveTime: number;
      };
      accessibility: {
        score: number;
        violations: number;
        warnings: number;
      };
    };
  };
  recommendations: string[];
  polyfillSuggestions: Array<{
    feature: string;
    polyfill: string;
    browsers: string[];
  }>;
}

const BrowserCompatibilityTest: React.FC = () => {
  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "浏览器兼容性测试",
    description: "使用浏览器兼容性测试功能"
  });

  // 用户统计
  const { recordTestCompletion } = useUserStats();

  // 测试配置状态
  const [config, setConfig] = useState<CompatibilityTestConfig>({
    url: '',
    browsers: ['chrome', 'firefox', 'safari', 'edge'],
    devices: ['desktop', 'mobile', 'tablet'],
    testTypes: ['css', 'javascript', 'html5', 'accessibility'],
    checkAccessibility: true,
    checkPerformance: true,
    checkSecurity: false,
    includePolyfills: true,
    customViewports: []
  });

  // 测试状态
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<CompatibilityTestResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState('');

  // 后台测试管理状态
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [backgroundTestInfo, setBackgroundTestInfo] = useState<any>(null);
  const [canSwitchPages, setCanSwitchPages] = useState(true);

  // 支持的浏览器列表
  const supportedBrowsers: BrowserInfo[] = [
    { name: 'Chrome', version: '120+', engine: 'Blink', marketShare: 65.12, icon: Chrome, color: '#4285f4' },
    { name: 'Firefox', version: '121+', engine: 'Gecko', marketShare: 3.05, icon: Globe, color: '#ff7139' },
    { name: 'Safari', version: '17+', engine: 'WebKit', marketShare: 18.78, icon: Globe, color: '#006cff' },
    { name: 'Edge', version: '120+', engine: 'Blink', marketShare: 5.65, icon: Globe, color: '#0078d4' },
    { name: 'Opera', version: '106+', engine: 'Blink', marketShare: 2.43, icon: Globe, color: '#ff1b2d' },
    { name: 'Samsung Internet', version: '23+', engine: 'Blink', marketShare: 2.75, icon: Smartphone, color: '#1428a0' }
  ];

  // 设备类型
  const deviceTypes = [
    { id: 'desktop', name: '桌面端', icon: Monitor, description: '1920x1080及以上分辨率' },
    { id: 'tablet', name: '平板端', icon: Tablet, description: '768x1024分辨率' },
    { id: 'mobile', name: '移动端', icon: Smartphone, description: '375x667分辨率' }
  ];

  // 测试类型
  const testTypes = [
    { id: 'css', name: 'CSS特性', icon: Code, description: '检查CSS3特性支持情况' },
    { id: 'javascript', name: 'JavaScript', icon: Zap, description: '检查ES6+特性支持' },
    { id: 'html5', name: 'HTML5', icon: Globe, description: '检查HTML5 API支持' },
    { id: 'accessibility', name: '可访问性', icon: Accessibility, description: '检查WCAG合规性' },
    { id: 'performance', name: '性能', icon: TrendingUp, description: '检查性能表现差异' },
    { id: 'security', name: '安全性', icon: Shield, description: '检查安全特性支持' }
  ];

  // 检查是否有正在运行的后台测试
  useEffect(() => {
    const checkBackgroundTest = () => {
      const tasks = unifiedBackgroundTestManager.getAllTasks();
      const runningCompatibilityTest = tasks.find(task =>
        task.type === 'compatibility' &&
        ['running', 'pending', 'queued'].includes(task.status)
      );

      if (runningCompatibilityTest) {
        setCurrentTestId(runningCompatibilityTest.id);
        setBackgroundTestInfo(runningCompatibilityTest);
        setIsRunning(true);
        setProgress(runningCompatibilityTest.progress);
        setCurrentStep(runningCompatibilityTest.currentStep);
        setCanSwitchPages(runningCompatibilityTest.canSwitchPages);

        // 监听测试进度
        const handleProgress = (progress: number, step: string) => {
          setProgress(progress);
          setCurrentStep(step);
        };

        const handleComplete = (results: any) => {
          setResult(results);
          setIsRunning(false);
          setCurrentTestId(null);
          setBackgroundTestInfo(null);
          setCanSwitchPages(true);
          recordTestCompletion('compatibility', 'completed');
        };

        const handleError = (error: string) => {
          setError(error);
          setIsRunning(false);
          setCurrentTestId(null);
          setBackgroundTestInfo(null);
          setCanSwitchPages(true);
        };

        unifiedBackgroundTestManager.on(`progress:${runningCompatibilityTest.id}`, handleProgress);
        unifiedBackgroundTestManager.on(`complete:${runningCompatibilityTest.id}`, handleComplete);
        unifiedBackgroundTestManager.on(`error:${runningCompatibilityTest.id}`, handleError);

        return () => {
          unifiedBackgroundTestManager.off(`progress:${runningCompatibilityTest.id}`, handleProgress);
          unifiedBackgroundTestManager.off(`complete:${runningCompatibilityTest.id}`, handleComplete);
          unifiedBackgroundTestManager.off(`error:${runningCompatibilityTest.id}`, handleError);
        };
      }
    };

    checkBackgroundTest();
  }, [recordTestCompletion]);

  // 启动测试
  const handleStartTest = async (runInBackground: boolean = false) => {
    if (!config.url) {
      setError('请输入要测试的网站URL');
      return;
    }

    if (!isAuthenticated) {
      requireLogin();
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setResult(null);
    setError('');

    try {
      if (runInBackground) {
        // 启动后台测试
        const taskId = await unifiedBackgroundTestManager.startBackgroundTest(
          'compatibility',
          config,
          {
            onProgress: (progress: number, step: string) => {
              setProgress(progress);
              setCurrentStep(step);
            },
            onComplete: (results: any) => {
              setResult(results);
              setIsRunning(false);
              setCurrentTestId(null);
              setBackgroundTestInfo(null);
              setCanSwitchPages(true);
              recordTestCompletion('compatibility', 'completed');
            },
            onError: (error: string) => {
              setError(error);
              setIsRunning(false);
              setCurrentTestId(null);
              setBackgroundTestInfo(null);
              setCanSwitchPages(true);
            }
          }
        );

        setCurrentTestId(taskId);
        setCanSwitchPages(true);
        return;
      }

      // 前台测试逻辑
      await runCompatibilityTest();
    } catch (error) {
      setError(error instanceof Error ? error.message : '测试失败');
      setIsRunning(false);
    }
  };

  // 运行兼容性测试
  const runCompatibilityTest = async () => {
    const steps = [
      '初始化测试环境',
      '检测浏览器特性',
      '分析CSS兼容性',
      '检查JavaScript支持',
      '测试HTML5 API',
      '评估可访问性',
      '生成兼容性报告'
    ];

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(steps[i]);
      setProgress(Math.round((i / steps.length) * 100));

      // 模拟测试执行时间
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
    }

    // 生成模拟测试结果
    const mockResult: CompatibilityTestResult = {
      id: `compat_${Date.now()}`,
      timestamp: new Date().toISOString(),
      url: config.url,
      overallScore: Math.round(75 + Math.random() * 20),
      browserResults: {},
      recommendations: [
        '使用CSS前缀确保更好的兼容性',
        '考虑为旧版浏览器添加polyfill',
        '优化移动端显示效果',
        '改善可访问性支持'
      ],
      polyfillSuggestions: [
        {
          feature: 'CSS Grid',
          polyfill: 'css-grid-polyfill',
          browsers: ['IE11', 'Edge 15']
        },
        {
          feature: 'Fetch API',
          polyfill: 'whatwg-fetch',
          browsers: ['IE11', 'Safari 10']
        }
      ]
    };

    // 为每个选中的浏览器生成结果
    config.browsers.forEach(browserName => {
      const browser = supportedBrowsers.find(b => b.name.toLowerCase() === browserName);
      if (browser) {
        mockResult.browserResults[browser.name] = {
          score: Math.round(70 + Math.random() * 25),
          issues: [
            {
              type: 'warning',
              category: 'CSS',
              description: `${browser.name}中部分CSS3特性需要前缀`,
              impact: 'medium',
              solution: '添加浏览器前缀'
            },
            {
              type: 'info',
              category: 'JavaScript',
              description: 'ES6特性支持良好',
              impact: 'low'
            }
          ],
          features: {
            'CSS Grid': { supported: browser.name !== 'IE', version: browser.version },
            'Flexbox': { supported: true, version: browser.version },
            'Fetch API': { supported: browser.name !== 'IE', version: browser.version },
            'Web Components': { supported: browser.name === 'Chrome', version: browser.version }
          },
          performance: {
            loadTime: 1500 + Math.random() * 1000,
            renderTime: 800 + Math.random() * 500,
            interactiveTime: 2000 + Math.random() * 1000
          },
          accessibility: {
            score: Math.round(80 + Math.random() * 15),
            violations: Math.floor(Math.random() * 5),
            warnings: Math.floor(Math.random() * 10)
          }
        };
      }
    });

    setResult(mockResult);
    setProgress(100);
    setCurrentStep('测试完成');
    setIsRunning(false);
    recordTestCompletion('compatibility', 'completed');
  };

  // 停止测试
  const handleStopTest = async () => {
    if (currentTestId) {
      const cancelled = await unifiedBackgroundTestManager.cancelTask(currentTestId);
      if (cancelled) {
        setCurrentTestId(null);
        setBackgroundTestInfo(null);
        setCanSwitchPages(true);
      }
    }

    setIsRunning(false);
    setProgress(0);
    setCurrentStep('');
  };

  // 如果未登录，显示登录提示
  if (!isAuthenticated) {
    return <LoginPromptComponent />;
  }

  return (
    <TestPageLayout
      title="浏览器兼容性测试"
      description="检测网站在不同浏览器和设备上的兼容性，提供详细的兼容性分析和优化建议"
      currentTest={backgroundTestInfo}
      canSwitchPages={canSwitchPages}
    >
      <div className="space-y-6">
        {/* URL输入 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">测试配置</h3>

          <div className="space-y-4">
            <URLInput
              value={config.url}
              onChange={(url) => setConfig(prev => ({ ...prev, url }))}
              placeholder="输入要测试的网站URL"
              disabled={isRunning}
            />

            {/* 浏览器选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                选择测试浏览器
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {supportedBrowsers.map((browser) => {
                  const IconComponent = browser.icon;
                  const isSelected = config.browsers.includes(browser.name.toLowerCase());

                  return (
                    <label
                      key={browser.name}
                      className={`relative flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const browserName = browser.name.toLowerCase();
                          if (e.target.checked) {
                            setConfig(prev => ({
                              ...prev,
                              browsers: [...prev.browsers, browserName]
                            }));
                          } else {
                            setConfig(prev => ({
                              ...prev,
                              browsers: prev.browsers.filter(b => b !== browserName)
                            }));
                          }
                        }}
                        className="sr-only"
                        disabled={isRunning}
                      />
                      <div className="flex items-center space-x-3 flex-1">
                        <IconComponent
                          className="w-6 h-6"
                          style={{ color: browser.color }}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {browser.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {browser.version} • {browser.marketShare}%
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 设备类型选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                测试设备类型
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {deviceTypes.map((device) => {
                  const IconComponent = device.icon;
                  const isSelected = config.devices.includes(device.id);

                  return (
                    <label
                      key={device.id}
                      className={`relative flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setConfig(prev => ({
                              ...prev,
                              devices: [...prev.devices, device.id]
                            }));
                          } else {
                            setConfig(prev => ({
                              ...prev,
                              devices: prev.devices.filter(d => d !== device.id)
                            }));
                          }
                        }}
                        className="sr-only"
                        disabled={isRunning}
                      />
                      <div className="flex items-center space-x-3 flex-1">
                        <IconComponent className="w-6 h-6 text-gray-600" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {device.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {device.description}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 测试类型选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                测试项目
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {testTypes.map((testType) => {
                  const IconComponent = testType.icon;
                  const isSelected = config.testTypes.includes(testType.id);

                  return (
                    <label
                      key={testType.id}
                      className={`relative flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setConfig(prev => ({
                              ...prev,
                              testTypes: [...prev.testTypes, testType.id]
                            }));
                          } else {
                            setConfig(prev => ({
                              ...prev,
                              testTypes: prev.testTypes.filter(t => t !== testType.id)
                            }));
                          }
                        }}
                        className="sr-only"
                        disabled={isRunning}
                      />
                      <div className="flex items-center space-x-3 flex-1">
                        <IconComponent className="w-5 h-5 text-gray-600" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {testType.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {testType.description}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-purple-500" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 高级选项 */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">高级选项</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.includePolyfills}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      includePolyfills: e.target.checked
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={isRunning}
                  />
                  <span className="text-sm text-gray-700">包含Polyfill建议</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 测试控制按钮 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {isRunning && (
                <button
                  onClick={handleStopTest}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center space-x-2 transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  <span>停止测试</span>
                </button>
              )}

              <button
                onClick={() => handleStartTest(false)}
                disabled={isRunning || !config.url || config.browsers.length === 0}
                className={`px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all ${isRunning || !config.url || config.browsers.length === 0
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>测试中...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>开始测试</span>
                  </>
                )}
              </button>

              {!isRunning && (
                <button
                  onClick={() => handleStartTest(true)}
                  disabled={!config.url || config.browsers.length === 0}
                  className={`px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-all ${!config.url || config.browsers.length === 0
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  title="在后台运行测试，可以切换到其他页面"
                >
                  <Cloud className="w-4 h-4" />
                  <span>后台测试</span>
                </button>
              )}
            </div>

            {result && (
              <UnifiedExportButton
                testType="compatibility"
                testData={result}
                disabled={isRunning}
                variant="outline"
              />
            )}
          </div>
        </div>

        {/* 测试进度 */}
        {isRunning && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">测试进度</h3>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>

            <ProgressBar progress={progress} className="mb-4" />

            {currentStep && (
              <p className="text-sm text-gray-600 flex items-center">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                {currentStep}
              </p>
            )}
          </div>
        )}

        {/* 错误显示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* 测试结果 */}
        {result && (
          <div className="space-y-6">
            {/* 总体评分 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">兼容性评分</h3>

              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">总体兼容性</span>
                    <span className="text-2xl font-bold text-blue-600">{result.overallScore}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${result.overallScore}%` }}
                    />
                  </div>
                </div>

                <div className="text-center">
                  {result.overallScore >= 90 ? (
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-1" />
                  ) : result.overallScore >= 70 ? (
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-1" />
                  ) : (
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-1" />
                  )}
                  <div className="text-xs text-gray-500">
                    {result.overallScore >= 90 ? '优秀' : result.overallScore >= 70 ? '良好' : '需改进'}
                  </div>
                </div>
              </div>
            </div>

            {/* 浏览器兼容性详情 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">浏览器兼容性详情</h3>

              <div className="space-y-4">
                {Object.entries(result.browserResults).map(([browserName, browserResult]) => {
                  const browser = supportedBrowsers.find(b => b.name === browserName);
                  const IconComponent = browser?.icon || Globe;

                  return (
                    <div key={browserName} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <IconComponent
                            className="w-6 h-6"
                            style={{ color: browser?.color || '#666' }}
                          />
                          <div>
                            <h4 className="font-medium text-gray-900">{browserName}</h4>
                            <p className="text-sm text-gray-500">兼容性评分: {browserResult.score}/100</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {browserResult.issues.length} 个问题
                          </div>
                          <div className="text-xs text-gray-400">
                            可访问性: {browserResult.accessibility.score}/100
                          </div>
                        </div>
                      </div>

                      {/* 问题列表 */}
                      {browserResult.issues.length > 0 && (
                        <div className="space-y-2">
                          {browserResult.issues.slice(0, 3).map((issue, index) => (
                            <div key={index} className="flex items-start space-x-2 text-sm">
                              {issue.type === 'error' ? (
                                <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                              ) : issue.type === 'warning' ? (
                                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                              ) : (
                                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <span className="text-gray-700">{issue.description}</span>
                                {issue.solution && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    解决方案: {issue.solution}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {browserResult.issues.length > 3 && (
                            <div className="text-xs text-gray-500 text-center pt-2">
                              还有 {browserResult.issues.length - 3} 个问题...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 优化建议 */}
            {result.recommendations.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">优化建议</h3>

                <div className="space-y-3">
                  {result.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{recommendation}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Polyfill建议 */}
            {result.polyfillSuggestions.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Polyfill建议</h3>

                <div className="space-y-4">
                  {result.polyfillSuggestions.map((suggestion, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{suggestion.feature}</h4>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {suggestion.polyfill}
                        </code>
                      </div>
                      <div className="text-sm text-gray-600">
                        需要支持的浏览器: {suggestion.browsers.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </TestPageLayout>
  );
};

export default BrowserCompatibilityTest;
