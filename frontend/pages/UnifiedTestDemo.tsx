/**
 * 统一测试状态管理系统演示页面
 * 展示如何使用统一状态管理系统管理多种测试类型
 */

import { Activity, BarChart3, Shield, Zap } from 'lucide-react';
import type { useState, FC } from 'react';
import { UnifiedTestPanel } from '../components/testing/UnifiedTestPanel';
import { useUnifiedTestState, useBatchTestState } from '../hooks/useUnifiedTestState';
import type { BaseTestConfig } from '../services/testing/UnifiedTestStateManager';

const UnifiedTestDemo: React.FC = () => {
  const [activeTestType, setActiveTestType] = useState<string>('performance');
  const [showBatchTest, setShowBatchTest] = useState(false);

  // 测试类型配置
  const testTypes = [
    {
      key: 'performance',
      name: '性能测试',
      icon: Zap,
      color: 'blue',
      description: '测试网站加载速度和性能指标'
    },
    {
      key: 'security',
      name: '安全测试',
      icon: Shield,
      color: 'red',
      description: '检测网站安全漏洞和风险'
    },
    {
      key: 'stress',
      name: '压力测试',
      icon: Activity,
      color: 'orange',
      description: '测试网站在高负载下的表现'
    },
    {
      key: 'api',
      name: 'API测试',
      icon: BarChart3,
      color: 'green',
      description: '测试API接口的功能和性能'
    }
  ];

  // 批量测试配置
  const batchTestConfigs: BaseTestConfig[] = [
    {
      url: 'https://example.com',
      testType: 'performance',
      testName: '性能测试 - 示例网站'
    },
    {
      url: 'https://example.com',
      testType: 'security',
      testName: '安全测试 - 示例网站'
    },
    {
      url: 'https://example.com',
      testType: 'stress',
      testName: '压力测试 - 示例网站'
    }
  ];

  // 批量测试状态管理
  const {
    tests: batchTests,
    isRunning: isBatchRunning,
    completed: batchCompleted,
    total: batchTotal,
    progress: batchProgress,
    startBatchTests,
    cancelAllTests
  } = useBatchTestState({
    testType: 'batch',
    maxConcurrent: 2,
    onBatchProgress: (completed, total) => {
      console.log(`批量测试进度: ${completed}/${total}`);
    },
    onBatchComplete: (results) => {
      console.log('批量测试完成:', results);
      alert('批量测试已完成！');
    }
  });

  // 系统状态监控
  const systemMonitor = useUnifiedTestState({
    testType: 'system',
    enableQueue: true,
    enableWebSocket: false,
    onStatusUpdate: (data) => {
      console.log('系统状态更新:', data);
    }
  });

  // 启动批量测试
  const handleStartBatchTests = async () => {
    try {
      await startBatchTests(batchTestConfigs);
    } catch (error: any) {
      alert(`启动批量测试失败: ${error.message}`);
    }
  };

  // 获取测试类型颜色
  const getTestTypeColor = (testType: string) => {
    const type = testTypes.find(t => t.key === testType);
    return type?.color || 'gray';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 页面标题 */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">统一测试管理系统</h1>
              <p className="text-gray-400 mt-2">
                基于压力测试完整状态管理系统的统一测试平台演示
              </p>
            </div>

            {/* 系统状态指示器 */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    systemMonitor.canStartTest ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                  <span className="text-gray-300">
                    系统状态: {systemMonitor.canStartTest ? '就绪' : '忙碌'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300">
                    运行中: {systemMonitor.queueStats.totalRunning}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧导航 */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
              <h2 className="text-white text-lg font-semibold mb-4">测试类型</h2>
              
              <div className="space-y-2">
                {testTypes.map((type) => {
                  const IconComponent = type.icon;
                  const isActive = activeTestType === type.key;
                  
                  return (
                    <button
                      key={type.key}
                      onClick={() => setActiveTestType(type.key)}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                        isActive
                          ? `bg-${type.color}-600/20 border border-${type.color}-500/30 text-${type.color}-400`
                          : 'bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{type.name}</div>
                        <div className="text-xs text-gray-400">{type.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 批量测试控制 */}
              <div className="mt-6 pt-4 border-t border-gray-700">
                <h3 className="text-white font-medium mb-3">批量测试</h3>
                
                <div className="space-y-3">
                  <button
                    onClick={() => setShowBatchTest(!showBatchTest)}
                    className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
                  >
                    {showBatchTest ? '隐藏' : '显示'}批量测试
                  </button>

                  {showBatchTest && (
                    <div className="space-y-2">
                      {isBatchRunning ? (
                        <>
                          <div className="bg-gray-800/50 rounded p-3">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-400">进度</span>
                              <span className="text-purple-400">{batchProgress.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${batchProgress}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                              {batchCompleted}/{batchTotal} 已完成
                            </div>
                          </div>
                          
                          <button
                            onClick={cancelAllTests}
                            className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                          >
                            取消批量测试
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleStartBatchTests}
                          className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                        >
                          启动批量测试
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 主要内容区域 */}
          <div className="lg:col-span-3">
            {/* 单个测试面板 */}
            <UnifiedTestPanel
              testType={activeTestType}
              defaultConfig={{
                url: 'https://example.com',
                testName: `${testTypes.find(t => t.key === activeTestType)?.name} - 演示`
              }}
              onTestComplete={(result) => {
                console.log('测试完成:', result);
                // 这里可以处理测试完成后的逻辑
              }}
              onTestError={(error) => {
                console.error('测试错误:', error);
                // 这里可以处理测试错误
              }}
              className="mb-8"
            />

            {/* 批量测试结果 */}
            {showBatchTest && (
              <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
                <h2 className="text-white text-lg font-semibold mb-4">批量测试结果</h2>
                
                {batchTests.length > 0 ? (
                  <div className="space-y-3">
                    {batchTests.map((test, index) => (
                      <div key={index} className="bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-white text-sm font-medium">
                              {test.config?.testName || `测试 ${index + 1}`}
                            </h4>
                            <p className="text-gray-400 text-xs">
                              {test.config?.testType} - {test.config?.url}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              test.status === 'completed' ? 'bg-green-600 text-green-100' :
                              test.status === 'running' ? 'bg-blue-600 text-blue-100' :
                              test.status === 'failed' ? 'bg-red-600 text-red-100' :
                              'bg-gray-600 text-gray-100'
                            }`}>
                              {test.status || 'pending'}
                            </span>
                          </div>
                        </div>
                        
                        {test.error && (
                          <div className="mt-2 text-red-400 text-xs">
                            错误: {test.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">暂无批量测试结果</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 功能说明 */}
      <div className="bg-gray-900 border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="text-white text-xl font-semibold mb-6">统一状态管理系统功能</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: '统一状态管理',
                description: '所有测试类型使用相同的状态管理逻辑，确保一致的用户体验'
              },
              {
                title: '队列系统',
                description: '智能队列管理，防止资源冲突，支持并发控制和优先级调度'
              },
              {
                title: 'WebSocket实时通信',
                description: '实时数据更新，即时获取测试进度和结果反馈'
              },
              {
                title: '错误恢复机制',
                description: '自动重试、状态恢复、异常处理，提高测试可靠性'
              },
              {
                title: '批量测试支持',
                description: '支持多个测试同时执行，智能资源分配和进度监控'
              },
              {
                title: '结果导出',
                description: '支持JSON、CSV、PDF多种格式的测试结果导出'
              },
              {
                title: '历史记录管理',
                description: '完整的测试历史记录，支持结果比较和趋势分析'
              },
              {
                title: '配置持久化',
                description: '测试配置自动保存，支持快速重复测试和模板管理'
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-white font-medium mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedTestDemo;
