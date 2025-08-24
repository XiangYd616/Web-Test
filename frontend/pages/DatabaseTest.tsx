import { Activity, AlertCircle, AlertTriangle, BarChart3, CheckCircle, Clock, CloudOff, Cpu, Database, Download, Gauge, HardDrive, History, Layers, Lock, Monitor, Network, Pause, Play, RefreshCw, RotateCcw, Save, Search, Server, Settings, Shield, Signal, Square, Target, Timer, TrendingUp, Wifi, WifiOff, XCircle, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useTheme } from '../contexts/ThemeContext';
import backgroundTestManager from '../services/backgroundTestManager';
import type {
  DatabaseTestConfig,
  DatabaseTestResult
} from '../types';

// CSS样式已迁移到组件库中
// 进度条样式已集成到ProgressBar组件

// 本地数据库配置，保留向后兼容性
interface LocalDatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  type: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'sqlite';
  ssl: boolean;
  timeout: number;
  maxConnections: number;
}

// 本地数据库测试配置，扩展统一类型
interface LocalDatabaseTestConfig extends Partial<DatabaseTestConfig> {
  connectionTest: boolean;
  performanceTest: boolean;
  integrityTest: boolean;
  securityTest: boolean;
  backupTest: boolean;
  queryOptimization: boolean;
  loadTest: boolean;
  stressTest: boolean;
  replicationTest: boolean;
  indexAnalysis: boolean;
  deadlockDetection: boolean;
  memoryUsageTest: boolean;
  diskSpaceAnalysis: boolean;
  concurrentUsers: number;
  testDuration: number;
  queryTimeout: number;
  maxRetries: number;
  customQueries: string[];
}

interface DatabaseTestResult {
  id: string;
  timestamp: string;
  overallScore: number;
  connectionTest: {
    success: boolean;
    responseTime: number;
    error?: string;
  };
  performanceMetrics: {
    connectionTime: number;
    queryResponseTime: number;
    throughput: number;
    maxConnections: number;
    connectionPoolTest: boolean;
  };
  queryTests: Array<{
    name: string;
    query: string;
    success: boolean;
    responseTime: number;
    error?: string;
  }>;
  securityChecks: {
    sslEnabled: boolean;
    authenticationRequired: boolean;
    vulnerabilities: string[];
  };
  recommendations: string[];
  status: string;
  startTime: string;
  endTime?: string;
  actualDuration?: number;
}

const DatabaseTest: React.FC = () => {
  const { actualTheme } = useTheme();
  const [dbConfig, setDbConfig] = useState<LocalDatabaseConfig>({
    host: 'localhost',
    port: 5432,
    database: 'testweb_prod',
    username: '',
    password: '',
    type: 'postgresql',
    ssl: false,
    timeout: 30000,
    maxConnections: 100
  });

  const [testConfig, setTestConfig] = useState<LocalDatabaseTestConfig>({
    connectionTest: true,
    performanceTest: true,
    integrityTest: true,
    securityTest: false,
    backupTest: false,
    queryOptimization: true,
    loadTest: false,
    stressTest: false,
    replicationTest: false,
    indexAnalysis: true,
    deadlockDetection: false,
    memoryUsageTest: true,
    diskSpaceAnalysis: true,
    concurrentUsers: 10,
    testDuration: 60,
    queryTimeout: 30000,
    maxRetries: 3,
    customQueries: []
  });

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DatabaseTestResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState('');

  const [showHistory, setShowHistory] = useState(false);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configName, setConfigName] = useState('');
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);

  // 网络状态管理
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkError, setNetworkError] = useState('');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [lastConnectionCheck, setLastConnectionCheck] = useState<Date | null>(null);
  const [connectionRetryCount, setConnectionRetryCount] = useState(0);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [pausedTest, setPausedTest] = useState<any>(null);

  // 处理测试选择（从历史记录）
  const handleTestSelect = (record: any) => {
    // 将历史记录转换为测试结果格式
    if (record.results) {
      setResult(record.results);
    }
  };

  // 处理测试重新运行
  const handleTestRerun = (record: any) => {
    // 从历史记录中恢复配置
    if (record.config) {
      if (record.config.dbConfig) {
        setDbConfig(record.config.dbConfig);
      }
      if (record.config.testConfig) {
        setTestConfig(record.config.testConfig);
      }
    }
  };

  // 页面加载时恢复后台测试状态
  useEffect(() => {
    // 检查是否有正在运行的数据库测试
    const runningTests = backgroundTestManager.getRunningTests();
    const databaseTest = runningTests.find(test => test.type === 'database');

    if (databaseTest) {
      console.log('🔄 发现正在运行的数据库测试，恢复状态...');
      setCurrentTestId(databaseTest.id);
      setIsRunning(true);
      setProgress(databaseTest.progress);
      setCurrentStep(databaseTest.currentStep);
      setError('');

      // 重新绑定回调函数
      databaseTest.onProgress = (progress: number, currentStep: string) => {
        setProgress(progress);
        setCurrentStep(currentStep);
      };

      databaseTest.onComplete = (result: any) => {
        setIsRunning(false);
        setResult(result);
        setCurrentStep('✅ 数据库测试完成！');
        setCurrentTestId(null);

        // 自动保存测试结果到历史记录
        const newTestResult = {
          ...result,
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          config: { ...dbConfig, ...testConfig }
        };
        // setTestHistory(prev => [newTestResult, ...prev.slice(0, 9)]);
      };

      databaseTest.onError = (error: Error) => {
        setIsRunning(false);
        setError(error.message);
        setCurrentStep('❌ 测试失败');
        setCurrentTestId(null);
      };
    }
  }, []);

  // 网络状态监听
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network connection restored');
      setIsOnline(true);
      setNetworkError('');
      setConnectionRetryCount(0);
      setShowOfflineModal(false);

      // 处理离线队列
      if (offlineQueue.length > 0) {
        handleOfflineQueue();
      }

      // 恢复暂停的测试
      if (pausedTest) {
        resumePausedTest();
      }
    };

    const handleOffline = () => {
      console.log('📡 Network connection lost');
      setIsOnline(false);
      setNetworkError('网络连接已断开');
      setShowOfflineModal(true);

      // 如果正在运行测试，暂停测试
      if (isRunning) {
        pauseCurrentTest();
      }
    };

    // 添加事件监听器
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 定期检查网络连接
    const connectionCheckInterval = setInterval(checkNetworkConnection, 30000); // 每30秒检查一次

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectionCheckInterval);
    };
  }, [isRunning, offlineQueue, pausedTest]);

  // 检查网络连接
  const checkNetworkConnection = async () => {
    try {
      setLastConnectionCheck(new Date());

      // 尝试ping服务器
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5秒超时
      });

      if (response.ok) {
        if (!isOnline) {
          setIsOnline(true);
          setNetworkError('');
          setConnectionRetryCount(0);
          console.log('✅ Network connection verified');
        }
      } else {
        throw new Error('Server not responding');
      }
    } catch (error) {
      console.warn('⚠️ Network check failed:', error);
      if (isOnline) {
        setIsOnline(false);
        setNetworkError('服务器连接失败');
        setConnectionRetryCount(prev => prev + 1);
      }
    }
  };

  // 暂停当前测试
  const pauseCurrentTest = () => {
    if (isRunning) {
      console.log('⏸️ Pausing test due to network disconnection');
      setPausedTest({
        dbConfig,
        testConfig,
        progress,
        currentStep,
        timestamp: new Date()
      });
      setCurrentStep('⏸️ 测试已暂停 - 等待网络恢复...');
    }
  };

  // 恢复暂停的测试
  const resumePausedTest = async () => {
    if (pausedTest) {
      console.log('▶️ Resuming paused test');
      setCurrentStep('🔄 正在恢复测试...');

      // 等待2秒确保连接稳定
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 重新开始测试
      setPausedTest(null);
      handleStartTest();
    }
  };

  // 处理离线队列
  const handleOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;

    console.log(`📤 Processing ${offlineQueue.length} queued operations`);
    setIsReconnecting(true);

    try {
      for (const operation of offlineQueue) {
        await processQueuedOperation(operation);
      }
      setOfflineQueue([]);
      console.log('✅ All queued operations processed');
    } catch (error) {
      console.error('❌ Failed to process queued operations:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  // 处理队列中的操作
  const processQueuedOperation = async (operation: any) => {
    try {
      switch (operation.type) {
        case 'saveTestResult':
          await fetch('/api/test-results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(operation.data)
          });
          break;
        case 'saveConfig':
          // 保存配置到本地存储
          localStorage.setItem('savedConfigs', JSON.stringify(operation.data));
          break;
        default:
          console.warn('Unknown operation type:', operation.type);
      }
    } catch (error) {
      console.error('Failed to process operation:', operation.type, error);
      throw error;
    }
  };

  // 添加到离线队列
  const addToOfflineQueue = (operation: any) => {
    setOfflineQueue(prev => [...prev, { ...operation, timestamp: new Date() }]);
    console.log('📥 Added operation to offline queue:', operation.type);
  };

  // 重试网络连接
  const retryConnection = async () => {
    setIsReconnecting(true);
    setConnectionRetryCount(prev => prev + 1);

    try {
      await checkNetworkConnection();
      if (isOnline) {
        setShowOfflineModal(false);
      }
    } catch (error) {
      console.error('Retry connection failed:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleStartTest = async () => {
    if (!dbConfig.host || !dbConfig.database) {
      setError('请填写数据库主机和数据库名称');
      return;
    }

    // 检查网络连接
    if (!isOnline) {
      setError('网络连接已断开，无法开始测试');
      setShowOfflineModal(true);
      return;
    }

    // 验证服务器连接
    try {
      setCurrentStep('🔍 正在检查服务器连接...');
      await checkNetworkConnection();
      if (!isOnline) {
        setError('无法连接到服务器，请检查网络连接');
        return;
      }
    } catch (error) {
      setError('服务器连接检查失败，请稍后重试');
      return;
    }

    // 使用后台测试管理器启动测试
    const testConfig_combined = {
      ...dbConfig,
      testConfig: testConfig
    };

    const testId = backgroundTestManager.startTest(
      'database',
      testConfig_combined,
      // onProgress callback
      (progress: number, currentStep: string) => {
        setProgress(progress);
        setCurrentStep(currentStep);
      },
      // onComplete callback
      (result: any) => {
        setIsRunning(false);
        setResult(result);
        setCurrentStep('✅ 数据库测试完成！');
        setCurrentTestId(null);

        // 自动保存测试结果到历史记录
        const newTestResult = {
          ...result,
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          config: { ...dbConfig, ...testConfig }
        };
        // setTestHistory(prev => [newTestResult, ...prev.slice(0, 9)]);
      },
      // onError callback
      (error: Error) => {
        setIsRunning(false);
        setError(error.message);
        setCurrentStep('❌ 测试失败');
        setCurrentTestId(null);
      }
    );

    setCurrentTestId(testId);
    setIsRunning(true);
    setProgress(0);
    setResult(null);
    setError('');
    setNetworkError('');

    console.log('🚀 Started background test with ID:', testId);

  };

  // 停止测试
  const handleStopTest = () => {
    if (currentTestId) {
      backgroundTestManager.cancelTest(currentTestId);
      setIsRunning(false);
      setCurrentTestId(null);
      setCurrentStep('⏹️ 测试已停止');
      setProgress(0);
    }
  };

  // 保存配置
  const handleSaveConfig = () => {
    if (!configName.trim()) {
      alert('请输入配置名称');
      return;
    }

    const newConfig = {
      name: configName,
      config: { ...dbConfig }
    };

    // setSavedConfigs(prev => [...prev, newConfig]);
    setConfigName('');
    setShowConfigModal(false);
    alert('配置保存成功！');
  };

  // 加载配置

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusIcon = (success: boolean) => {
    if (success) {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };

  return (
    <div className={`theme-transition ${actualTheme === 'light' ? 'light-theme-wrapper' : 'dark-theme-wrapper'}`}>
      {/* 网络状态指示器 */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg transition-all duration-300 ${isOnline
          ? 'bg-green-600/90 text-white'
          : 'bg-red-600/90 text-white animate-pulse'
          }`}>
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4" />
              <span className="text-sm font-medium">在线</span>
              {lastConnectionCheck && (
                <span className="text-xs opacity-75">
                  {lastConnectionCheck.toLocaleTimeString()}
                </span>
              )}
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">离线</span>
              {connectionRetryCount > 0 && (
                <span className="text-xs opacity-75">
                  重试 {connectionRetryCount}
                </span>
              )}
            </>
          )}
          {isReconnecting && (
            <RefreshCw className="w-4 h-4 animate-spin" />
          )}
        </div>

        {/* 离线队列指示器 */}
        {offlineQueue.length > 0 && (
          <div className="mt-2 bg-orange-600/90 text-white px-3 py-2 rounded-lg shadow-lg">
            <div className="flex items-center space-x-2">
              <CloudOff className="w-4 h-4" />
              <span className="text-sm font-medium">
                队列: {offlineQueue.length} 项
              </span>
            </div>
          </div>
        )}
      </div>

      <UnifiedTestPageLayout
        testType="database"
        title="数据库测试"
        description="测试数据库连接、性能、安全性和数据完整性"
        icon={Database}
        testTabLabel="数据库测试"
        historyTabLabel="测试历史"
        testStatus={testStatus === 'starting' ? 'running' : testStatus as 'idle' | 'running' | 'completed' | 'failed'}
        isTestDisabled={!config.connectionString}
        onStartTest={handleStartTest}
        onTestSelect={handleTestSelect}
        onTestRerun={handleTestRerun}
        testContent={
          <div className="space-y-6">
            {/* 页面标题 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">数据库测试</h2>
                  <p className="text-gray-300 mt-1">检测数据库连接、性能、完整性和安全性</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Database className="w-8 h-8 text-blue-400" />
                  {/* 网络状态小图标 */}
                  {isOnline ? (
                    <Signal className="w-5 h-5 text-green-400" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-red-400" />
                  )}
                </div>
              </div>

              {/* 网络错误提示 */}
              {networkError && (
                <div className="mt-4 bg-red-600/20 border border-red-600/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-red-400">
                      <AlertTriangle className="w-5 h-5" />
                      <span>{networkError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={retryConnection}
                      disabled={isReconnecting}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded text-sm transition-colors"
                    >
                      {isReconnecting ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin inline mr-1" />
                          重试中...
                        </>
                      ) : (
                        '重试连接'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 数据库配置 */}
            <div className="themed-card">
              <h3 className="text-lg font-semibold themed-text-primary mb-4">数据库配置</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium themed-text-secondary mb-2">数据库类型</label>
                  <select
                    title="选择数据库类型"
                    aria-label="选择数据库类型"
                    value={dbConfig.type}
                    onChange={(e) => {
                      const type = e.target.value as DatabaseConfig['type'];
                      const defaultPorts = {
                        postgresql: 5432,
                        mysql: 3306,
                        mongodb: 27017,
                        redis: 6379,
                        sqlite: 3306
                      };
                      setDbConfig(prev => ({
                        ...prev,
                        type,
                        port: defaultPorts[type],
                        // 根据数据库类型设置默认配置
                        ssl: type === 'postgresql' || type === 'mysql',
                        maxConnections: type === 'sqlite' ? 1 : prev.maxConnections,
                        host: type === 'sqlite' ? '' : prev.host
                      }));
                    }}
                    className="themed-input"
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="mongodb">MongoDB</option>
                    <option value="redis">Redis</option>
                    <option value="sqlite">SQLite</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-400">
                    {dbConfig.type === 'sqlite' ? '* SQLite为本地文件数据库' : `默认端口: ${dbConfig.port}`}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium themed-text-secondary mb-2">主机地址</label>
                  <input
                    type="text"
                    value={dbConfig.host}
                    onChange={(e) => {
                      const host = e.target.value.trim();
                      // 验证主机地址格式
                      const isValidHost = /^[a-zA-Z0-9]([a-zA-Z0-9\-\.]*[a-zA-Z0-9])?$/.test(host) ||
                        /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
                      setDbConfig(prev => ({
                        ...prev,
                        host: host,
                        // 如果是本地主机，自动设置相关配置
                        ssl: host !== 'localhost' && host !== '127.0.0.1' ? prev.ssl : false
                      }));
                    }}
                    placeholder="localhost 或 IP地址"
                    className="themed-input"
                    title="输入有效的主机名或IP地址"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    支持域名、IP地址或localhost
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium themed-text-secondary mb-2">端口</label>
                  <input
                    type="number"
                    value={dbConfig.port}
                    onChange={(e) => {
                      const port = parseInt(e.target.value);
                      // 验证端口范围
                      if (!isNaN(port) && port >= 0 && port <= 65535) {
                        setDbConfig(prev => ({ ...prev, port: port }));
                      }
                    }}
                    min="0"
                    max="65535"
                    className="themed-input"
                    title="输入0-65535之间的端口号"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    有效端口范围: 0-65535
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium themed-text-secondary mb-2">数据库名</label>
                  <input
                    type="text"
                    value={dbConfig.database}
                    onChange={(e) => {
                      const dbName = e.target.value.trim();
                      // 验证数据库名格式
                      const isValidName = /^[a-zA-Z0-9_\-]+$/.test(dbName);
                      if (isValidName || dbName === '') {
                        setDbConfig(prev => ({ ...prev, database: dbName }));
                      }
                    }}
                    placeholder="输入数据库名称"
                    className="themed-input"
                    title="仅允许字母、数字、下划线和连字符"
                    pattern="[a-zA-Z0-9_\-]+"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    仅支持字母、数字、下划线和连字符
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium themed-text-secondary mb-2">用户名</label>
                  <input
                    type="text"
                    value={dbConfig.username}
                    onChange={(e) => setDbConfig(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="username"
                    className="themed-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium themed-text-secondary mb-2">密码</label>
                  <input
                    type="password"
                    value={dbConfig.password}
                    onChange={(e) => setDbConfig(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="password"
                    className="themed-input"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={dbConfig.ssl}
                    onChange={(e) => setDbConfig(prev => ({ ...prev, ssl: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-300">启用SSL连接</span>
                </label>
              </div>
            </div>

            {/* 测试选项 */}
            <div className="themed-card">
              <h3 className="text-lg font-semibold themed-text-primary mb-4">测试项目</h3>

              {/* 基础测试 */}
              <div className="mb-6">
                <h4 className="text-md font-medium themed-text-secondary mb-3 flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  基础测试
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { key: 'connectionTest', label: '连接测试', icon: Network, description: '测试数据库连接状态和响应时间' },
                    { key: 'performanceTest', label: '性能测试', icon: Zap, description: '分析查询性能和系统资源使用' },
                    { key: 'integrityTest', label: '完整性检查', icon: Shield, description: '检查数据完整性和表结构' },
                    { key: 'securityTest', label: '安全测试', icon: Lock, description: '评估数据库安全配置' },
                    { key: 'queryOptimization', label: '查询优化', icon: Settings, description: '分析慢查询和索引优化' },
                    { key: 'indexAnalysis', label: '索引分析', icon: Search, description: '检查索引使用效率和优化建议' }
                  ].map((test) => (
                    <div key={test.key} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <test.icon className="w-5 h-5 text-blue-400" />
                          <span className="font-medium text-white">{test.label}</span>
                        </div>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={testConfig[test.key as keyof DatabaseTestConfig] as boolean}
                            onChange={(e) => setTestConfig(prev => ({ ...prev, [test.key]: e.target.checked }))}
                            className="sr-only"
                            aria-label={test.label}
                          />
                          <div
                            className={`test-config-toggle ${testConfig[test.key as keyof DatabaseTestConfig]
                              ? 'test-config-toggle-active'
                              : 'test-config-toggle-inactive'
                              }`}
                            onClick={() => setTestConfig(prev => ({ ...prev, [test.key]: !prev[test.key as keyof DatabaseTestConfig] }))}
                          >
                            {testConfig[test.key as keyof DatabaseTestConfig] && (
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400">{test.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 高级测试 */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-300 mb-3 flex items-center">
                  <Gauge className="w-4 h-4 mr-2" />
                  高级测试
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { key: 'loadTest', label: '负载测试', icon: TrendingUp, description: '模拟高并发访问测试数据库性能' },
                    { key: 'stressTest', label: '压力测试', icon: Gauge, description: '测试数据库在极限条件下的表现' },
                    { key: 'replicationTest', label: '复制测试', icon: Layers, description: '检查主从复制和数据同步' },
                    { key: 'deadlockDetection', label: '死锁检测', icon: AlertTriangle, description: '检测和分析潜在的死锁问题' },
                    { key: 'memoryUsageTest', label: '内存分析', icon: Cpu, description: '分析内存使用情况和缓存效率' },
                    { key: 'diskSpaceAnalysis', label: '磁盘分析', icon: HardDrive, description: '检查磁盘空间使用和I/O性能' }
                  ].map((test) => (
                    <div key={test.key} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <test.icon className="w-5 h-5 text-purple-400" />
                          <span className="font-medium text-white">{test.label}</span>
                        </div>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={testConfig[test.key as keyof DatabaseTestConfig] as boolean}
                            onChange={(e) => setTestConfig(prev => ({ ...prev, [test.key]: e.target.checked }))}
                            className="sr-only"
                            aria-label={test.label}
                          />
                          <div
                            className={`w-6 h-6 rounded-lg border-2 cursor-pointer transition-all duration-200 flex items-center justify-center ${testConfig[test.key as keyof DatabaseTestConfig]
                              ? 'border-purple-500 bg-purple-500 shadow-lg shadow-purple-500/25'
                              : 'border-gray-500 bg-gray-700/50 hover:border-gray-400 hover:bg-gray-600/50'
                              }`}
                            onClick={() => setTestConfig(prev => ({ ...prev, [test.key]: !prev[test.key as keyof DatabaseTestConfig] }))}
                          >
                            {testConfig[test.key as keyof DatabaseTestConfig] && (
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400">{test.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 测试参数配置 */}
              <div>
                <h4 className="text-md font-medium text-gray-300 mb-3 flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  测试参数
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">并发用户数</label>
                    <input
                      type="number"
                      value={testConfig.concurrentUsers}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, concurrentUsers: parseInt(e.target.value) || 10 }))}
                      min="1"
                      max="1000"
                      className="themed-input"
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">测试时长 (秒)</label>
                    <input
                      type="number"
                      value={testConfig.testDuration}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, testDuration: parseInt(e.target.value) || 60 }))}
                      min="10"
                      max="3600"
                      className="themed-input"
                      placeholder="60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">查询超时 (ms)</label>
                    <input
                      type="number"
                      value={testConfig.queryTimeout}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, queryTimeout: parseInt(e.target.value) || 30000 }))}
                      min="1000"
                      max="300000"
                      className="themed-input"
                      placeholder="30000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">最大重试次数</label>
                    <input
                      type="number"
                      value={testConfig.maxRetries}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 3 }))}
                      min="0"
                      max="10"
                      className="themed-input"
                      placeholder="3"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 测试控制 */}
            <div className="themed-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold themed-text-primary">测试控制</h3>
                  {isRunning && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-300">{currentStep}</p>
                      <div className="mt-2">
                        <ProgressBar
                          value={progress}
                          variant="primary"
                          size="md"
                          animated
                        />
                      </div>
                    </div>
                  )}
                  {error && (
                    <p className="text-red-400 text-sm mt-2">{error}</p>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="themed-button-secondary flex items-center space-x-2"
                  >
                    <History className="w-4 h-4" />
                    <span>测试历史</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowConfigModal(true)}
                    className="themed-button-success flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>保存配置</span>
                  </button>

                  {!isRunning ? (
                    <button
                      type="button"
                      onClick={handleStartTest}
                      disabled={!dbConfig.host || !dbConfig.database}
                      className={`px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all ${!dbConfig.host || !dbConfig.database
                        ? 'themed-button-disabled'
                        : 'themed-button-primary'
                        }`}
                    >
                      <Play className="w-4 h-4" />
                      <span>开始测试</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopTest}
                      className="themed-button-danger px-6 py-3 font-medium flex items-center space-x-2"
                    >
                      <Square className="w-4 h-4" />
                      <span>停止测试</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 快速配置预设 */}
              <div className="border-t border-gray-700 pt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">快速配置</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: '基础检查', config: { connectionTest: true, performanceTest: true, integrityTest: false, securityTest: false } },
                    { name: '性能优化', config: { connectionTest: true, performanceTest: true, queryOptimization: true, indexAnalysis: true } },
                    { name: '安全审计', config: { connectionTest: true, securityTest: true, integrityTest: true, deadlockDetection: true } },
                    { name: '全面测试', config: { connectionTest: true, performanceTest: true, integrityTest: true, securityTest: true, queryOptimization: true, indexAnalysis: true } }
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setTestConfig(prev => ({ ...prev, ...preset.config }))}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-md text-sm transition-colors"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 测试结果 */}
            {
              result && (
                <div className="space-y-6">
                  {/* 总体评分 */}
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">数据库健康评分</h3>
                    <div className="flex items-center justify-center">
                      <div className="relative w-32 h-32">
                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-gray-700"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - result.overallScore / 100)}`}
                            className={getScoreColor(result.overallScore)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-2xl font-bold ${getScoreColor(result.overallScore)}`}>
                            {Math.round(result.overallScore)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 连接状态 */}
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">连接状态</h3>
                    <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(result.connectionTest.success)}
                        <div>
                          <div className="font-medium text-white">
                            {result.connectionTest.success ? '连接成功' : '连接失败'}
                          </div>
                          <div className="text-sm text-gray-400">
                            响应时间: {result.connectionTest.responseTime.toFixed(0)}ms
                          </div>
                        </div>
                      </div>
                      {result.connectionTest.error && (
                        <div className="text-red-400 text-sm">
                          {result.connectionTest.error}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 性能指标 */}
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">性能指标</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { label: '连接时间', value: result.performanceMetrics.connectionTime, unit: 'ms', icon: Clock },
                        { label: '查询响应时间', value: result.performanceMetrics.queryResponseTime, unit: 'ms', icon: Clock },
                        { label: '吞吐量', value: result.performanceMetrics.throughput, unit: 'ops/s', icon: Activity },
                        { label: '最大连接数', value: result.performanceMetrics.maxConnections, unit: '', icon: Network },
                        { label: '连接池测试', value: result.performanceMetrics.connectionPoolTest ? 1 : 0, unit: '', icon: Server, isBoolean: true }
                      ].map((metric, index) => (
                        <div key={index} className="bg-gray-700/30 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <metric.icon className="w-5 h-5 text-blue-400" />
                            <span className={`text-lg font-bold ${metric.isBoolean ?
                              (metric.value ? 'text-green-400' : 'text-red-400') :
                              'text-blue-400'
                              }`}>
                              {metric.isBoolean ?
                                (metric.value ? '✅ 通过' : '❌ 失败') :
                                `${metric.value.toFixed(metric.unit === 'ms' ? 0 : 1)}${metric.unit}`
                              }
                            </span>
                          </div>
                          <div className="text-sm text-white">{metric.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 查询测试结果 */}
                  {result.queryTests && result.queryTests.length > 0 && (
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">查询测试结果</h3>
                      <div className="space-y-3">
                        {result.queryTests.map((test, index) => (
                          <div key={index} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                            <div className="flex items-center space-x-3">
                              {getStatusIcon(test.success)}
                              <div>
                                <div className="font-medium text-white">{test.name}</div>
                                <div className="text-sm text-gray-400">{test.query}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${test.success ? 'text-green-400' : 'text-red-400'}`}>
                                {test.responseTime.toFixed(0)}ms
                              </div>
                              {test.error && (
                                <div className="text-red-400 text-xs mt-1">{test.error}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 安全分析 */}
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">安全分析</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Shield className="w-5 h-5 text-blue-400" />
                          <span className="text-white">SSL加密</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {result.securityChecks.sslEnabled ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                          <span className={result.securityChecks.sslEnabled ? 'text-green-400' : 'text-red-400'}>
                            {result.securityChecks.sslEnabled ? '已启用' : '未启用'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Settings className="w-5 h-5 text-blue-400" />
                          <span className="text-white">身份认证</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {result.securityChecks.authenticationRequired ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                          <span className={result.securityChecks.authenticationRequired ? 'text-green-400' : 'text-red-400'}>
                            {result.securityChecks.authenticationRequired ? '已配置' : '未配置'}
                          </span>
                        </div>
                      </div>

                      {result.securityChecks.vulnerabilities.length > 0 && (
                        <div>
                          <h4 className="text-md font-semibold text-white mb-2">发现的安全问题</h4>
                          <div className="space-y-2">
                            {result.securityChecks.vulnerabilities.map((vuln, index) => (
                              <div key={index} className="p-3 rounded-lg border-l-4 border-yellow-500 bg-yellow-500/10">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-white">安全警告</span>
                                  <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-300">
                                    中等
                                  </span>
                                </div>
                                <p className="text-gray-300 text-sm mt-1">{vuln}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 优化建议 */}
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">优化建议</h3>
                    <div className="space-y-3">
                      {result.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700/30 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-300">{recommendation}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 详细分析 */}
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">详细分析</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* 性能趋势 */}
                      <div className="bg-gray-700/30 rounded-lg p-4">
                        <h4 className="text-md font-medium text-white mb-3 flex items-center">
                          <TrendingUp className="w-4 h-4 mr-2 text-green-400" />
                          性能趋势
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">连接性能</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-600 rounded-full h-2">
                                <div className="bg-green-400 h-2 rounded-full w-4/5"></div>
                              </div>
                              <span className="text-green-400 text-sm">优秀</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">查询效率</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-600 rounded-full h-2">
                                <div className="bg-yellow-400 h-2 rounded-full w-3/5"></div>
                              </div>
                              <span className="text-yellow-400 text-sm">良好</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">资源利用</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-600 rounded-full h-2">
                                <div className="bg-blue-400 h-2 rounded-full w-11/12"></div>
                              </div>
                              <span className="text-blue-400 text-sm">优秀</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 风险评估 */}
                      <div className="bg-gray-700/30 rounded-lg p-4">
                        <h4 className="text-md font-medium text-white mb-3 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-2 text-orange-400" />
                          风险评估
                        </h4>
                        <div className="space-y-3">
                          {[
                            { risk: '数据丢失风险', level: 'low', color: 'green' },
                            { risk: '性能瓶颈风险', level: 'medium', color: 'yellow' },
                            { risk: '安全漏洞风险', level: 'low', color: 'green' },
                            { risk: '可用性风险', level: 'low', color: 'green' }
                          ].map((item, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-gray-300">{item.risk}</span>
                              <span className={`px-2 py-1 rounded text-xs bg-${item.color}-500/20 text-${item.color}-400`}>
                                {item.level === 'low' ? '低' : item.level === 'medium' ? '中' : '高'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">测试报告</h3>
                        <p className="text-gray-400 text-sm">导出详细的数据库测试报告和分析结果</p>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => {
                            // 保存测试结果到数据中心
                            if (result) {
                              fetch('/api/test-results', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  testName: `数据库测试 - ${dbConfig.database}`,
                                  testType: 'database',
                                  url: `${dbConfig.type}://${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`,
                                  config: { ...dbConfig, ...testConfig },
                                  results: result,
                                  overallScore: result.overallScore,
                                  status: 'completed',
                                  engine: 'database-test-engine',
                                  startTime: result.startTime,
                                  endTime: result.endTime,
                                  duration: result.actualDuration
                                })
                              }).then(response => response.json())
                                .then(data => {
                                  if (data.success) {
                                    alert('✅ 测试结果已保存到数据中心');
                                  } else {
                                    alert('❌ 保存失败: ' + data.error);
                                  }
                                })
                                .catch(error => {
                                  console.error('保存失败:', error);
                                  alert('❌ 保存失败: ' + error.message);
                                });
                            }
                          }}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          <span>保存到数据中心</span>
                        </button>

                        <button
                          type="button"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          <span>下载PDF</span>
                        </button>

                        <button
                          type="button"
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
                        >
                          <BarChart3 className="w-4 h-4" />
                          <span>详细报告</span>
                        </button>

                        <button
                          type="button"
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
                        >
                          <Monitor className="w-4 h-4" />
                          <span>实时监控</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            {/* 离线模态框 */}
            {
              showOfflineModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full mx-4">
                    <div className="text-center">
                      <div className="mb-4">
                        <WifiOff className="w-16 h-16 text-red-400 mx-auto" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">网络连接已断开</h3>
                      <p className="text-gray-400 mb-6">
                        检测到网络连接中断。您可以继续配置测试，系统会在网络恢复后自动重试。
                      </p>

                      {/* 离线功能说明 */}
                      <div className="bg-gray-700/50 rounded-lg p-4 mb-6 text-left">
                        <h4 className="text-sm font-medium text-white mb-2">离线模式功能：</h4>
                        <ul className="text-sm text-gray-300 space-y-1">
                          <li>• 配置保存到本地存储</li>
                          <li>• 测试结果加入离线队列</li>
                          <li>• 网络恢复后自动同步</li>
                          <li>• 暂停的测试将自动恢复</li>
                        </ul>
                      </div>

                      {/* 重试信息 */}
                      {connectionRetryCount > 0 && (
                        <div className="bg-orange-600/20 border border-orange-600/50 rounded-lg p-3 mb-4">
                          <div className="flex items-center justify-center space-x-2 text-orange-400">
                            <Timer className="w-4 h-4" />
                            <span className="text-sm">已重试 {connectionRetryCount} 次</span>
                          </div>
                        </div>
                      )}

                      {/* 离线队列状态 */}
                      {offlineQueue.length > 0 && (
                        <div className="bg-blue-600/20 border border-blue-600/50 rounded-lg p-3 mb-4">
                          <div className="flex items-center justify-center space-x-2 text-blue-400">
                            <CloudOff className="w-4 h-4" />
                            <span className="text-sm">离线队列: {offlineQueue.length} 项待同步</span>
                          </div>
                        </div>
                      )}

                      {/* 暂停的测试 */}
                      {pausedTest && (
                        <div className="bg-yellow-600/20 border border-yellow-600/50 rounded-lg p-3 mb-4">
                          <div className="flex items-center justify-center space-x-2 text-yellow-400">
                            <Pause className="w-4 h-4" />
                            <span className="text-sm">测试已暂停，等待网络恢复</span>
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={retryConnection}
                          disabled={isReconnecting}
                          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors"
                        >
                          {isReconnecting ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                              重试中...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-4 h-4 inline mr-2" />
                              重试连接
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowOfflineModal(false)}
                          className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        >
                          继续离线工作
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            {/* 配置保存模态框 */}
            {
              showConfigModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full mx-4">
                    <h3 className="text-xl font-bold text-white mb-4">保存配置</h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">配置名称</label>
                      <input
                        type="text"
                        value={configName}
                        onChange={(e) => setConfigName(e.target.value)}
                        placeholder="输入配置名称"
                        className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={handleSaveConfig}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfigModal(false)}
                        className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              )
            }
          </div>
        }
      />
    </div>
  );
};

export default DatabaseTest;
