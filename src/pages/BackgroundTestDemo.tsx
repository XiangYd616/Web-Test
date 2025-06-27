import React, { useState, useEffect } from 'react';
import '../styles/progress-bars.css';
import {
  Play,
  Square,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Database,
  Code,
  Zap,
  Shield,
  Globe,
  Search
} from 'lucide-react';
import backgroundTestManager from '../services/BackgroundTestManager';

const BackgroundTestDemo: React.FC = () => {
  const [runningTests, setRunningTests] = useState<any[]>([]);
  const [completedTests, setCompletedTests] = useState<any[]>([]);
  const [selectedTestType, setSelectedTestType] = useState('database');

  useEffect(() => {
    // 初始化状态
    setRunningTests(backgroundTestManager.getRunningTests());
    setCompletedTests(backgroundTestManager.getCompletedTests());

    // 监听测试状态变化
    const unsubscribe = backgroundTestManager.addListener((event, testInfo) => {
      console.log('Test event:', event, testInfo);
      
      // 更新状态
      setRunningTests(backgroundTestManager.getRunningTests());
      setCompletedTests(backgroundTestManager.getCompletedTests());
    });

    return unsubscribe;
  }, []);

  const startTest = () => {
    const configs = {
      database: {
        host: 'localhost',
        port: 5432,
        database: 'testweb_prod',
        username: 'postgres',
        password: 'postgres',
        type: 'postgresql',
        testConfig: {
          connectionTest: true,
          performanceTest: true,
          integrityTest: true
        }
      },
      api: {
        baseUrl: 'https://jsonplaceholder.typicode.com',
        endpoints: [
          { path: '/posts/1', method: 'GET' },
          { path: '/posts', method: 'POST', body: { title: 'test', body: 'test', userId: 1 } }
        ],
        timeout: 10000,
        retries: 3
      },
      performance: {
        url: 'https://jsonplaceholder.typicode.com',
        duration: 30,
        concurrentUsers: 10,
        rampUpTime: 5
      },
      security: {
        url: 'https://jsonplaceholder.typicode.com',
        scanDepth: 'medium',
        checkSSL: true,
        checkHeaders: true
      },
      compatibility: {
        url: 'https://jsonplaceholder.typicode.com',
        browsers: ['chrome', 'firefox', 'safari'],
        devices: ['desktop', 'mobile']
      },
      content: {
        url: 'https://jsonplaceholder.typicode.com',
        checkImages: true,
        checkLinks: true,
        checkText: true
      }
    };

    const config = configs[selectedTestType as keyof typeof configs];
    
    backgroundTestManager.startTest(
      selectedTestType as any,
      config,
      (progress, step) => {
        console.log(`Progress: ${progress}% - ${step}`);
      },
      (result) => {
        console.log('Test completed:', result);
      },
      (error) => {
        console.error('Test failed:', error);
      }
    );
  };

  const cancelTest = (testId: string) => {
    backgroundTestManager.cancelTest(testId);
  };

  const getTestIcon = (type: string) => {
    const icons = {
      database: Database,
      api: Code,
      performance: Zap,
      security: Shield,
      compatibility: Globe,
      content: Search
    };
    const Icon = icons[type as keyof typeof icons] || Clock;
    return <Icon className="w-5 h-5" />;
  };

  const getTestTypeName = (type: string) => {
    const names = {
      database: '数据库测试',
      api: 'API测试',
      performance: '性能测试',
      security: '安全测试',
      compatibility: '兼容性测试',
      content: '内容测试'
    };
    return names[type as keyof typeof names] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'cancelled': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Clock className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'cancelled': return <Pause className="w-4 h-4 text-yellow-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h2 className="text-2xl font-bold text-white mb-2">后台测试演示</h2>
          <p className="text-gray-300">
            演示后台测试功能 - 测试在页面切换时继续运行
          </p>
        </div>

        {/* 启动新测试 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">启动新测试</h3>
          
          <div className="flex items-center space-x-4 mb-4">
            <select
              value={selectedTestType}
              onChange={(e) => setSelectedTestType(e.target.value)}
              className="themed-input"
              aria-label="选择测试类型"
              title="选择测试类型"
            >
              <option value="database">数据库测试</option>
              <option value="api">API测试</option>
              <option value="performance">性能测试</option>
              <option value="security">安全测试</option>
              <option value="compatibility">兼容性测试</option>
              <option value="content">内容测试</option>
            </select>
            
            <button
              onClick={startTest}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
             type="button">
              <Play className="w-4 h-4" />
              <span>启动测试</span>
            </button>
          </div>

          <div className="text-sm text-gray-400">
            💡 提示：启动测试后，您可以切换到其他页面，测试将在后台继续运行
          </div>
        </div>

        {/* 运行中的测试 */}
        {runningTests.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              运行中的测试 ({runningTests.length})
            </h3>
            
            <div className="space-y-4">
              {runningTests.map((test) => (
                <div key={test.id} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getTestIcon(test.type)}
                      <div>
                        <h4 className="font-medium text-white">
                          {getTestTypeName(test.type)}
                        </h4>
                        <p className="text-sm text-gray-400">
                          开始时间: {new Date(test.startTime).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-blue-400">
                        {Math.round(test.progress)}%
                      </span>
                      <button
                        type="button"
            onClick={() => cancelTest(test.id)}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        title="取消测试"
                      >
                        <Square className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div
                        className="progress-fill progress-fill-blue h-2 rounded-full transition-all duration-300"
                        style={{ width: `${test.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-300">
                    {test.currentStep}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 已完成的测试 */}
        {completedTests.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              最近完成的测试 ({completedTests.length})
            </h3>
            
            <div className="space-y-3">
              {completedTests.slice(0, 10).map((test) => (
                <div key={test.id} className="bg-gray-700/30 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getTestIcon(test.type)}
                      <div>
                        <h4 className="font-medium text-white">
                          {getTestTypeName(test.type)}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {test.endTime ? new Date(test.endTime).toLocaleString() : '进行中'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(test.status)}
                      <span className={`text-sm ${getStatusColor(test.status)}`}>
                        {test.status === 'completed' ? '完成' : 
                         test.status === 'failed' ? '失败' : 
                         test.status === 'cancelled' ? '已取消' : '运行中'}
                      </span>
                    </div>
                  </div>
                  
                  {test.error && (
                    <p className="text-sm text-red-400 mt-2">
                      错误: {test.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">功能说明</h3>
          
          <div className="space-y-3 text-gray-300">
            <div className="flex items-start space-x-2">
              <span className="text-blue-400">•</span>
              <span>启动测试后，可以自由切换到其他页面，测试将在后台继续运行</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-400">•</span>
              <span>右下角会显示后台测试状态面板，实时显示进度</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-400">•</span>
              <span>测试完成后会显示通知，无论您在哪个页面</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-400">•</span>
              <span>所有测试历史都会被保存，页面刷新后仍然可见</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-400">•</span>
              <span>支持同时运行多个不同类型的测试</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackgroundTestDemo;
