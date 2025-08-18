import { Database, Network, Server    } from 'lucide-react';import { useState, useEffect    } from 'react';import { useAsyncErrorHandler    } from '../hooks/useAsyncErrorHandler';import TestResults from '../components/TestResults';import React, { useState    } from 'react';import { useAuthCheck    } from '../../../components/auth/WithAuthCheck.tsx';import BaseTestPage from '../../../components/testing/BaseTestPage.tsx';import { useUserStats    } from '../../../hooks/useUserStats.ts';// 基础设施测试类型
type InfrastructureTestType = 'database' | 'network' | 'server' | 'all'
// 数据库连接配置
interface DatabaseConfig   {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  type: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'sqlite'
  ssl: boolean;
  timeout: number;
  maxConnections: number;
}

// 网络测试配置
interface NetworkConfig   {
  target: string;
  testType: 'ping' | 'traceroute' | 'bandwidth' | 'dns' | 'all'
  timeout: number;
  packetCount: number;
  packetSize: number;
}

// 基础设施测试配置
interface InfrastructureTestConfig   {
  testType: InfrastructureTestType;
  database: {
    enabled: boolean;
    config: DatabaseConfig;
    tests: {
      connectionTest: boolean;
      performanceTest: boolean;
      securityTest: boolean;
      loadTest: boolean;
    };
  };
  network: {
    enabled: boolean;
    config: NetworkConfig;
    tests: {
      latencyTest: boolean;
      bandwidthTest: boolean;
      dnsTest: boolean;
      tracerouteTest: boolean;
    };
  };
}

// 测试结果接口
interface InfrastructureTestResult   {
  id: string;
  timestamp: string;
  overallScore: number;
  database?: {
    connectionTest: { success: boolean; responseTime: number; };
    performanceTest: { queryTime: number; throughput: number; };
    securityTest: { sslEnabled: boolean; authStrength: number; };
  };
  network?: {
    latency: { min: number; max: number; avg: number; };
    bandwidth: { download: number; upload: number; };
    dns: { resolveTime: number; };
  };
}

const InfrastructureTest: React.FC  = () => {
  
  // 页面级功能
  const [pageTitle, setPageTitle] = useState('");"
  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible') {'`"`
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);
  
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const showFeedback = (type, message, duration = 3000) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });
    }, duration);
  };
  
  useEffect(() => {
    if (state.error) {
      showFeedback('error', state.error.message);
    }
  }, [state.error]);
  
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  
  const handleConfirmAction = (action, message) => {
    setConfirmAction({ action, message });
    setShowConfirmDialog(true);
  };
  
  const executeConfirmedAction = async () => {
    if (confirmAction) {
      await confirmAction.action();
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };
  
  const [buttonStates, setButtonStates] = useState({});
  
  const setButtonLoading = (buttonId, loading) => {
    setButtonStates(prev => ({
      ...prev,
      [buttonId]: { ...prev[buttonId], loading }
    }));
  };
  
  const setButtonDisabled = (buttonId, disabled) => {
    setButtonStates(prev => ({
      ...prev,
      [buttonId]: { ...prev[buttonId], disabled }
    }));
  };
  
  const runTest = async (config) => {
    setIsRunning(true);
    const result = await executeAsync(() => fetch('/api/tests/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType: 'performance', config })
      }).then(res => res.json()),
      { context: 'TestExecution.runTest' }
    );
    
    if (result && result.success) {
      setTestResult(result.data);
      // 轮询获取测试结果
      pollTestResult(result.data.executionId);
    }
    setIsRunning(false);
  };
  
  const pollTestResult = async (executionId) => {
    const interval = setInterval(async () => {
      const result = await executeAsync(
        () => fetch(`/api/tests/results/${executionId}`).then(res => res.json()),`
        { context: "TestExecution.pollResult' }'`"`
      );
      
      if (result && result.success && result.data.status === 'completed') {
        setTestResult(result.data);
        clearInterval(interval);
      }
    }, 2000);
  };
  const { executeAsync, state } = useAsyncErrorHandler();
  const [testConfig, setTestConfig] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: '基础设施测试',
    description: '使用基础设施测试功能'
  });

  // 用户统计
  const { recordTestCompletion } = useUserStats();

  const [config, setConfig] = useState<InfrastructureTestConfig>({
    testType: 'all',
    database: {
      enabled: true,
      config: {
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: '',
        password: '',
        type: 'postgresql',
        ssl: false,
        timeout: 30000,
        maxConnections: 10,
      },
      tests: {
        connectionTest: true,
        performanceTest: true,
        securityTest: true,
        loadTest: false,
      },
    },
    network: {
      enabled: true,
      config: {
        target: 'google.com',
        testType: 'all',
        timeout: 30000,
        packetCount: 10,
        packetSize: 64,
      },
      tests: {
        latencyTest: true,
        bandwidthTest: true,
        dnsTest: true,
        tracerouteTest: false,
      },
    },
  });

  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>("idle");
  const [results, setResults] = useState<InfrastructureTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 开始测试
  const handleStartTest = async () => {
    if (!isAuthenticated) {
      
        requireLogin();
      return;
      }

    setTestStatus('running");"
    setError(null);

    try {
      // 模拟测试过程
      await new Promise(resolve => setTimeout(resolve, 3000));

      const mockResult: InfrastructureTestResult  = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        overallScore: Math.floor(Math.random() * 30) + 70,
        database: config.database.enabled ? {
          connectionTest: { success: true, responseTime: Math.random() * 100 + 50 },
          performanceTest: { queryTime: Math.random() * 50 + 10, throughput: Math.random() * 1000 + 500 },
          securityTest: { sslEnabled: config.database.config.ssl, authStrength: Math.random() * 100 },
        } : undefined,
        network: config.network.enabled ? {
          latency: { min: 10, max: 50, avg: 25 },
          bandwidth: { download: Math.random() * 100 + 50, upload: Math.random() * 50 + 20 },
          dns: { resolveTime: Math.random() * 100 + 20 },
        } : undefined,
      };
      setResults(mockResult);
      setTestStatus('completed");"
      recordTestCompletion('infrastructure', true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '测试失败");"
      setTestStatus("failed");
    }
  };

  // 处理测试选择和重新运行
  const handleTestSelect = (test: any) => {
    console.log('选择测试:', test);
  };

  const handleTestRerun = (test: any) => {
    console.log('重新运行测试:', test);
  };

  
  if (state.isLoading || loading) {
    return (
      <div className= 'flex justify-center items-center h-64'>
        <div className= 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500'></div>
        <span className= 'ml-3 text-gray-600'>加载中...</span>
      </div>
    );
  }

  if (state.error) {
    return (<div className= 'bg-red-50 border border-red-200 rounded-md p-4'>
        <div className= 'flex'>
          <div className= 'flex-shrink-0'>
            <svg className= 'h-5 w-5 text-red-400' viewBox= '0 0 20 20' fill= 'currentColor'>
              <path fillRule= 'evenodd' d= 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' clipRule= 'evenodd' />
            </svg>
          </div>
          <div className= 'ml-3'>
            <h3 className= 'text-sm font-medium text-red-800'>
              操作失败
            </h3>
            <div className= 'mt-2 text-sm text-red-700'>
              <p>{state.error.message}</p>
            </div>
            <div className= 'mt-4'>
              <button>
                onClick={() => window.location.reload()}
                className= 'bg-red-100 px-2 py-1 text-sm text-red-800 rounded hover:bg-red-200'
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (<BaseTestPage>
      testType= 'performance'
      title= '基础设施测试'
      description= '全面测试数据库性能、网络连接质量和服务器基础设施'
      icon={Server}
      isTestDisabled={!config.database.enabled && !config.network.enabled}
      onStartTest={handleStartTest}
      onTestSelect={handleTestSelect}
      onTestRerun={handleTestRerun}
      testContent={
        <div className= 'space-y-6'>
          {/* 测试类型选择 */}
          <div className= 'bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6'>
            <h3 className= 'text-xl font-semibold text-white mb-4'>选择测试类型</h3>
            <div className= 'grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* 数据库测试 */}
              <div className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${config.database.enabled`}>
                ? "border-blue-500 bg-blue-500/10";``
                : 'border-gray-600 bg-gray-800/50'
                }`}`
                onClick={() => setConfig(prev => ({
                  ...prev,
                  database: { ...prev.database, enabled: !prev.database.enabled }
                }))}>
                <div className= "flex items-center space-x-3'>`'"`
                  <Database className= 'w-6 h-6 text-blue-400'    />
                  <div>
                    <h4 className= 'font-semibold text-white'>数据库测试</h4>
                    <p className= 'text-sm text-gray-300'>测试数据库连接、性能和安全性</p>
                  </div>
                </div>
              </div>

              {/* 网络测试 */}
              <div className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${config.network.enabled`}>
                ? "border-green-500 bg-green-500/10";``
                : 'border-gray-600 bg-gray-800/50'
                }`}`
                onClick={() => setConfig(prev => ({
                  ...prev,
                  network: { ...prev.network, enabled: !prev.network.enabled }
                }))}>
                <div className= "flex items-center space-x-3'>`'"`
                  <Network className= 'w-6 h-6 text-green-400'    />
                  <div>
                    <h4 className= 'font-semibold text-white'>网络测试</h4>
                    <p className= 'text-sm text-gray-300'>测试网络延迟、带宽和连接质量</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 测试结果 */}
          {results && (
            <div className= 'bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6'>
              <h3 className= 'text-xl font-semibold text-white mb-4'>测试结果</h3>
              <div className= 'grid grid-cols-1 md:grid-cols-2 gap-6'>
                {results.database && (
                  <div className= 'space-y-4'>
                    <h4 className= 'font-semibold text-blue-400'>数据库测试</h4>
                    <div className= 'space-y-2'>
                      <div className= 'flex justify-between'>
                        <span className= 'text-gray-300'>连接测试:</span>
                        <span className={results.database.connectionTest.success ? 'text-green-400' : 'text-red-400'}>
                          {results.database.connectionTest.success ? '成功" : "失败'}
                        </span>
                      </div>
                      <div className= 'flex justify-between'>
                        <span className= 'text-gray-300'>响应时间:</span>
                        <span className= 'text-white'>{results.database.connectionTest.responseTime.toFixed(2)}ms</span>
                      </div>
                    </div>
                  </div>
                )}

                {results.network && (
                  <div className= 'space-y-4'>
                    <h4 className= 'font-semibold text-green-400'>网络测试</h4>
                    <div className= 'space-y-2'>
                      <div className= 'flex justify-between'>
                        <span className= 'text-gray-300'>平均延迟:</span>
                        <span className= 'text-white'>{results.network.latency.avg}ms</span>
                      </div>
                      <div className= 'flex justify-between'>
                        <span className= 'text-gray-300'>下载速度:</span>
                        <span className= 'text-white'>{results.network.bandwidth.download.toFixed(2)} Mbps</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 错误显示 */}
          {error && (
            <div className= 'bg-red-500/10 border border-red-500/30 rounded-lg p-4'>
              <p className= 'text-red-400'>{error}</p>
            </div>
          )}
        </div>
      }
    />
  );
};

export default InfrastructureTest;
