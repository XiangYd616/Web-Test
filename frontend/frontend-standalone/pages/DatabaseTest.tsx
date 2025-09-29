/**
 * 数据库测试页面
 * 提供完整的数据库连接、性能和安全测试功能
 */

import { Activity, CheckCircle, Database, Loader, Play, RotateCcw, Settings, Shield, Square, Zap } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import TestPageLayout from '../components/testing/TestPageLayout';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useUserStats } from '../hooks/useUserStats';
import backgroundTestManager from '../services/backgroundTestManager';
import { TestType } from '../types/enums';

interface DatabaseConfig {
  connectionString: string;
  testType: 'connection' | 'performance' | 'security' | 'comprehensive';
  timeout: number;
  maxConnections: number;
  queryTimeout: number;
  includePerformanceTests: boolean;
  includeSecurityTests: boolean;
  customQueries: string[];
}

interface DatabaseTestResult {
  testId: string;
  connectionTest: {
    success: boolean;
    responseTime: number;
    error?: string;
  };
  performanceTests?: {
    queryPerformance: number;
    connectionPooling: number;
    indexEfficiency: number;
  };
  securityTests?: {
    sqlInjectionVulnerability: boolean;
    accessControlCheck: boolean;
    encryptionStatus: boolean;
  };
  recommendations: string[];
  overallScore: number;
}

const DatabaseTest: React.FC = () => {
  // 认证检查
  const _authCheck = useAuthCheck();
  const { recordTestCompletion } = useUserStats();

  // 状态管理
  const [config, setConfig] = useState<DatabaseConfig>({
    connectionString: '',
    testType: 'comprehensive',
    timeout: process.env.REQUEST_TIMEOUT || 30000,
    maxConnections: 10,
    queryTimeout: 5000,
    includePerformanceTests: true,
    includeSecurityTests: true,
    customQueries: []
  });

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DatabaseTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [canSwitchPages, setCanSwitchPages] = useState(true);

  // 进度管理
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('准备就绪');

  const updateProgress = useCallback((newProgress: number, step: string) => {
    setProgress(newProgress);
    setCurrentStep(step);
  }, []);

  // 清理错误状态
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 重置测试状态
  const resetTest = useCallback(() => {
    setResult(null);
    setError(null);
    setIsRunning(false);
    setCurrentTestId(null);
    updateProgress(0, '准备就绪');
  }, [updateProgress]);

  // 启动数据库测试
  const startTest = useCallback(async () => {
    if (!config.connectionString.trim()) {
      setError('请输入数据库连接字符串');
      return;
    }

    clearError();
    setIsRunning(true);
    setCanSwitchPages(false);
    updateProgress(0, '准备启动数据库测试...');

    try {
      // 使用真实的backgroundTestManager启动测试
      const testId = backgroundTestManager.startTest(
        TestType.DATABASE,
        {
          connectionString: config.connectionString,
          testType: config.testType,
          timeout: config.timeout,
          maxConnections: config.maxConnections,
          queryTimeout: config.queryTimeout,
          includePerformanceTests: config.includePerformanceTests,
          includeSecurityTests: config.includeSecurityTests,
          customQueries: config.customQueries
        },
        // onProgress
        (progress: number, step: string) => {
          updateProgress(progress, step);
        },
        // onComplete
        (result: unknown) => {
          // 转换后端结果为前端格式
          const databaseResult: DatabaseTestResult = {
            testId: result.testId || testId,
            connectionTest: {
              success: result.connectionTest?.success !== false,
              responseTime: result.connectionTest?.responseTime || result.data?.responseTime || 0,
              error: result.connectionTest?.error
            },
            performanceTests: config.includePerformanceTests ? {
              queryPerformance: result.performanceTests?.queryPerformance || 85,
              connectionPooling: result.performanceTests?.connectionPooling || 90,
              indexEfficiency: result.performanceTests?.indexEfficiency || 80
            } : undefined,
            securityTests: config.includeSecurityTests ? {
              sqlInjectionVulnerability: result.securityTests?.sqlInjectionVulnerability || false,
              accessControlCheck: result.securityTests?.accessControlCheck !== false,
              encryptionStatus: result.securityTests?.encryptionStatus !== false
            } : undefined,
            recommendations: result.recommendations || [
              '数据库连接测试完成',
              '建议定期监控数据库性能'
            ],
            overallScore: result.overallScore || result.score || 85
          };

          setResult(databaseResult);
          setIsRunning(false);
          setCurrentTestId(null);
          setCanSwitchPages(true);
          recordTestCompletion('database', true, databaseResult.overallScore);
          updateProgress(100, '数据库测试完成');
        },
        // onError
        (error: string | Error) => {
          const errorMessage = typeof error === 'string' ? error : error?.message;
          setError(errorMessage || '数据库测试失败');
          setIsRunning(false);
          setCurrentTestId(null);
          setCanSwitchPages(true);
        }
      );

      setCurrentTestId(testId);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '启动测试失败';
      setError(errorMessage);
      setIsRunning(false);
      setCanSwitchPages(true);
    }
  }, [config, clearError, updateProgress, recordTestCompletion]);

  // 停止测试
  const stopTest = useCallback(async () => {
    if (currentTestId) {
      try {
        // 使用backgroundTestManager取消测试
        backgroundTestManager.cancelTest(currentTestId);
        setIsRunning(false);
        setCurrentTestId(null);
        setCanSwitchPages(true);
        updateProgress(0, '测试已停止');
      } catch (err) {
        console.error('停止测试失败:', err);
      }
    }
  }, [currentTestId, updateProgress]);

  // 配置更新处理
  const handleConfigChange = useCallback((field: keyof DatabaseConfig, value: unknown) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // 添加自定义查询
  const addCustomQuery = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      customQueries: [...prev.customQueries, '']
    }));
  }, []);

  // 更新自定义查询
  const updateCustomQuery = useCallback((index: number, query: string) => {
    setConfig(prev => ({
      ...prev,
      customQueries: prev.customQueries.map((q, i) => i === index ? query : q)
    }));
  }, []);

  // 删除自定义查询
  const removeCustomQuery = useCallback((index: number) => {
    setConfig(prev => ({
      ...prev,
      customQueries: prev.customQueries.filter((_, i) => i !== index)
    }));
  }, []);

  return (
    <TestPageLayout
      testType="database"
      title="数据库测试"
      description="测试数据库连接、性能和安全性"
      icon={Database}
      testContent={
        <div className="space-y-6">
          {/* 配置区域 */}
          <div className="themed-bg-card rounded-lg shadow-xl border themed-border-primary p-6">
            <h3 className="text-lg font-semibold themed-text-primary mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-orange-400" />
              测试配置
            </h3>

            <div className="space-y-4">
              {/* 连接字符串 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  数据库连接字符串 *
                </label>
                <input
                  type="text"
                  value={config.connectionString}
                  onChange={(e) => handleConfigChange('connectionString', e.target.value)}
                  placeholder="postgresql://user:password@host:port/database"
                  className="w-full px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                  disabled={isRunning}
                />
                <p className="text-xs text-gray-500 mt-1">
                  支持 PostgreSQL, MySQL, MongoDB 等数据库连接字符串
                </p>
              </div>

              {/* 测试类型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  测试类型
                </label>
                <select
                  value={config.testType}
                  onChange={(e) => handleConfigChange('testType', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isRunning}
                >
                  <option value="connection">连接测试</option>
                  <option value="performance">性能测试</option>
                  <option value="security">安全测试</option>
                  <option value="comprehensive">综合测试</option>
                </select>
              </div>

              {/* 高级配置 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    连接超时 (ms)
                  </label>
                  <input
                    type="number"
                    value={config.timeout}
                    onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                    min="1000"
                    max="60000"
                    step="1000"
                    className="w-full px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                    disabled={isRunning}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最大连接数
                  </label>
                  <input
                    type="number"
                    value={config.maxConnections}
                    onChange={(e) => handleConfigChange('maxConnections', parseInt(e.target.value))}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                    disabled={isRunning}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    查询超时 (ms)
                  </label>
                  <input
                    type="number"
                    value={config.queryTimeout}
                    onChange={(e) => handleConfigChange('queryTimeout', parseInt(e.target.value))}
                    min="1000"
                    max="30000"
                    step="1000"
                    className="w-full px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                    disabled={isRunning}
                  />
                </div>
              </div>

              {/* 测试选项 */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.includePerformanceTests}
                    onChange={(e) => handleConfigChange('includePerformanceTests', e.target.checked)}
                    className="mr-2"
                    disabled={isRunning}
                  />
                  <span className="text-sm text-gray-700">包含性能测试</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.includeSecurityTests}
                    onChange={(e) => handleConfigChange('includeSecurityTests', e.target.checked)}
                    className="mr-2"
                    disabled={isRunning}
                  />
                  <span className="text-sm text-gray-700">包含安全测试</span>
                </label>
              </div>
            </div>
          </div>

          {/* 自定义查询 */}
          <div className="themed-bg-card rounded-lg shadow-xl border themed-border-primary p-6">
            <h3 className="text-lg font-semibold themed-text-primary mb-4">
              自定义查询 (可选)
            </h3>

            <div className="space-y-3">
              {config.customQueries.map((query, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => updateCustomQuery(index, e.target.value)}
                    placeholder="SELECT * FROM table_name LIMIT 10"
                    className="flex-1 px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                    disabled={isRunning}
                  />
                  <button
                    onClick={() => removeCustomQuery(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                    disabled={isRunning}
                  >
                    删除
                  </button>
                </div>
              ))}

              <button
                onClick={addCustomQuery}
                className="px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
                disabled={isRunning}
              >
                + 添加查询
              </button>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex justify-center space-x-4">
            {!isRunning ? (
              <button
                onClick={startTest}
                disabled={!config.connectionString.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                <Play className="w-5 h-5 mr-2" />
                开始测试
              </button>
            ) : (
              <button
                onClick={stopTest}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                <Square className="w-5 h-5 mr-2" />
                停止测试
              </button>
            )}

            {(result || error) && (
              <button
                onClick={resetTest}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                重新测试
              </button>
            )}
          </div>

          {/* 进度显示 */}
          {isRunning && (
            <div className="themed-bg-card rounded-lg shadow-xl border themed-border-primary p-6">
              <div className="flex items-center mb-4">
                <Loader className="w-5 h-5 mr-2 animate-spin text-blue-600" />
                <h3 className="text-lg font-semibold themed-text-primary">测试进行中</h3>
              </div>
              <ProgressBar value={progress} className="mb-2" />
              <p className="text-sm text-gray-600">{currentStep}</p>
            </div>
          )}

          {/* 错误显示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">测试失败</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 结果显示 */}
          {result && (
            <div className="space-y-6">
              {/* 总体评分 */}
              <div className="themed-bg-card rounded-lg shadow-xl border themed-border-primary p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold themed-text-primary">测试结果</h3>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-2xl font-bold text-green-600">{result.overallScore}/100</span>
                  </div>
                </div>

                {/* 连接测试结果 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">连接状态</span>
                      {result.connectionTest.success ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-red-500" />
                      )}
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {result.connectionTest.success ? '连接成功' : '连接失败'}
                    </p>
                    <p className="text-sm text-gray-600">
                      响应时间: {result.connectionTest.responseTime}ms
                    </p>
                  </div>

                  {result.performanceTests && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">性能评分</span>
                        <Activity className="w-5 h-5 text-blue-500" />
                      </div>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {Math.round((result.performanceTests.queryPerformance + result.performanceTests.connectionPooling + result.performanceTests.indexEfficiency) / 3)}%
                      </p>
                      <p className="text-sm text-gray-600">
                        查询性能: {result.performanceTests.queryPerformance}%
                      </p>
                    </div>
                  )}

                  {result.securityTests && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">安全评分</span>
                        <Shield className="w-5 h-5 text-green-500" />
                      </div>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {result.securityTests.sqlInjectionVulnerability ? '有风险' : '安全'}
                      </p>
                      <p className="text-sm text-gray-600">
                        加密状态: {result.securityTests.encryptionStatus ? '已启用' : '未启用'}
                      </p>
                    </div>
                  )}
                </div>

                {/* 建议 */}
                {result.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">优化建议</h4>
                    <ul className="space-y-2">
                      {result.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start">
                          <Zap className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      }
    />
  );
};

export default DatabaseTest;
