import {Clock, Play, Square, Target} from 'lucide-react';
import React, { useCallback, useState } from 'react';
import {TestResult, TestType} from '../../services/testing/testEngine';
import {ButtonFeedback} from '../tools/InteractiveFeedback.tsx';
import {ErrorDisplay, useErrorHandler, useNotifications} from '../system/ErrorHandling';
import {Loader, useLoadingState} from '../ui/LoadingStates';

interface TestInterfaceProps {
  testType: TestType;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  defaultConfig: any;
  onRunTest: (config: any) => Promise<TestResult>;
  onCancelTest: () => Promise<void>;
  className?: string;
}

const TestInterface: React.FC<TestInterfaceProps> = ({
  testType,
  title,
  description,
  icon: Icon,
  defaultConfig,
  onRunTest,
  onCancelTest,
  className = ''
}) => {
  const [config, setConfig] = useState(defaultConfig);
  const [result, setResult] = useState<TestResult | null>(null);
  const { isLoading, progress, stage, error, startLoading, updateProgress, finishLoading, setLoadingError } = useLoadingState();
  const { error: handledError, handleError, clearError } = useErrorHandler();
  const { success, error: notifyError } = useNotifications();

  const handleStartTest = useCallback(async () => {
    if (!config.url) {
      notifyError('输入错误', '请输入有效的URL');
      return;
    }

    clearError();
    setResult(null);
    startLoading('初始化测试...');

    // 模拟测试进度
    const progressSteps = [
      { progress: 10, stage: '验证URL' },
      { progress: 30, stage: '建立连接' },
      { progress: 50, stage: '执行测试' },
      { progress: 80, stage: '分析结果' },
      { progress: 100, stage: '生成报告' }
    ];

    try {
      for (const step of progressSteps) {
        updateProgress(step.progress, step.stage);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟延迟
      }

      const testResult = await onRunTest(config);
      setResult(testResult);
      finishLoading();
      success('测试完成', '测试已成功完成，请查看结果');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '测试失败';
      setLoadingError(errorMessage);
      handleError(err, '执行测试');
      notifyError('测试失败', errorMessage);
    }
  }, [config, onRunTest, startLoading, updateProgress, finishLoading, setLoadingError, handleError, clearError, success, notifyError]);

  const handleCancelTest = useCallback(async () => {
    try {
      await onCancelTest();
      setLoadingError('测试已取消');
      success('测试取消', '测试已成功取消');
    } catch (err) {
      console.error('取消测试失败:', err);
      handleError(err, '取消测试');
    }
  }, [onCancelTest, setLoadingError, handleError, success]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-50 border-green-200';
    if (score >= 70) return 'bg-yellow-50 border-yellow-200';
    if (score >= 50) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderConfigForm = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            测试URL
          </label>
          <input
            type="url"
            value={config.url}
            onChange={(e) => setConfig({ ...config, url: e.target.value })}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
        </div>

        {/* 根据测试类型显示特定配置 */}
        {testType === 'stress' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="users-input" className="block text-sm font-medium text-gray-700 mb-2">
                  并发用户数
                </label>
                <input
                  id="users-input"
                  type="number"
                  value={config.users || 10}
                  onChange={(e) => setConfig({ ...config, users: parseInt(e.target.value) })}
                  min="1"
                  max="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                  aria-label="设置并发用户数"
                />
              </div>
              <div>
                <label htmlFor="duration-input" className="block text-sm font-medium text-gray-700 mb-2">
                  测试时长 (秒)
                </label>
                <input
                  id="duration-input"
                  type="number"
                  value={config.duration || 30}
                  onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) })}
                  min="10"
                  max="3600"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                  aria-label="设置测试时长（秒）"
                />
              </div>
            </div>
          </>
        )}

        {testType === 'content' && (
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.checkSEO || false}
                onChange={(e) => setConfig({ ...config, checkSEO: e.target.checked })}
                disabled={isLoading}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">SEO 检查</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.checkAccessibility || false}
                onChange={(e) => setConfig({ ...config, checkAccessibility: e.target.checked })}
                disabled={isLoading}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">可访问性检查</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.checkPerformance || false}
                onChange={(e) => setConfig({ ...config, checkPerformance: e.target.checked })}
                disabled={isLoading}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">性能检查</span>
            </label>
          </div>
        )}
      </div>
    );
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <div className="space-y-6">
        {/* 总体评分 */}
        <div className={`p-6 rounded-xl border-2 ${getScoreBgColor(result.score)}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">总体评分</h3>
              <p className="text-sm text-gray-600">{result.summary}</p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${getScoreColor(result.score)}`}>
                {result.score}
              </div>
              <div className="text-sm text-gray-500">满分 100</div>
            </div>
          </div>
        </div>

        {/* 关键指标 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">测试时长</span>
            </div>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {(result.duration / 1000).toFixed(1)}s
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">状态</span>
            </div>
            <p className="text-xl font-bold text-green-600 mt-1">
              {result.status === 'completed' ? '完成' : '失败'}
            </p>
          </div>
        </div>

        {/* 建议 */}
        {result.recommendations && result.recommendations.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">优化建议</h3>
            <div className="space-y-4">
              {result.recommendations.slice(0, 5).map((rec, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">{rec.title}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(rec.priority)}`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                      <p className="text-sm text-blue-600 mt-2">{rec.solution}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 头部 */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <Icon className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-gray-600 mt-1">{description}</p>
          </div>
          <div className="flex items-center space-x-3">
            {!isLoading ? (
              <ButtonFeedback
                onClick={handleStartTest}
                variant="primary"
                size="lg"
                feedback={result ? 'success' : undefined}
              >
                <Play className="w-5 h-5 mr-2" />
                开始测试
              </ButtonFeedback>
            ) : (
              <ButtonFeedback
                onClick={handleCancelTest}
                variant="danger"
                size="lg"
                loading={false}
              >
                <Square className="w-5 h-5 mr-2" />
                停止测试
              </ButtonFeedback>
            )}
          </div>
        </div>
      </div>

      {/* 配置表单 */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">测试配置</h2>
        {renderConfigForm()}
      </div>

      {/* 错误信息 */}
      {handledError && (
        <ErrorDisplay
          error={handledError}
          onRetry={handleStartTest}
          className="mb-6"
        />
      )}

      {/* 进度显示 */}
      {isLoading && (
        <Loader
          type="test"
          testType={testType as 'stress' | 'content' | 'security' | 'api'}
          progress={progress}
          stage={stage}
          className="mb-6"
        />
      )}

      {/* 测试结果 */}
      {renderResult()}
    </div>
  );
};

export default TestInterface;
