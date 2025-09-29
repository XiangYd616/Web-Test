/**
 * 批量测试管理组件
 * 支持多URL同时测试，批量结果管理和对比分析
 */

import React, { useState, useEffect, useCallback } from 'react';
import {Upload, Plus, X, Play, Pause, Square, FileText, Globe, Settings, BarChart3, Zap, Shield, Search, Trash2, Copy, ExternalLink, Eye, Target, TrendingUp, RefreshCw} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BatchTestItem {
  id: string;
  url: string;
  testType: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: unknown;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
}

interface BatchTestConfig {
  name: string;
  description: string;
  testTypes: string[];
  concurrency: number;
  timeout: number;
  retryCount: number;
  scheduleType: 'immediate' | 'scheduled' | 'recurring';
  scheduleTime?: Date;
  recurringPattern?: string;
}

interface BatchTestManagerProps {
  onTestComplete?: (results: BatchTestItem[]) => void;
  onTestStart?: (config: BatchTestConfig) => void;
}

const BatchTestManager: React.FC<BatchTestManagerProps> = ({
  onTestComplete,
  onTestStart
}) => {
  // 状态管理
  const [testItems, setTestItems] = useState<BatchTestItem[]>([]);
  const [config, setConfig] = useState<BatchTestConfig>({
    name: '批量测试任务',
    description: '',
    testTypes: ['performance', 'security', 'seo'],
    concurrency: 3,
    timeout: 60,
    retryCount: 1,
    scheduleType: 'immediate'
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTab, setCurrentTab] = useState<'config' | 'results' | 'analysis'>('config');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 批量导入URL
  const [bulkUrlText, setBulkUrlText] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);

  // 测试类型选项
  const testTypeOptions = [
    { value: 'performance', label: '性能测试', icon: Zap, color: 'text-orange-600' },
    { value: 'security', label: '安全测试', icon: Shield, color: 'text-red-600' },
    { value: 'seo', label: 'SEO测试', icon: Search, color: 'text-green-600' },
    { value: 'accessibility', label: '可访问性测试', icon: Eye, color: 'text-purple-600' },
    { value: 'api', label: 'API测试', icon: Target, color: 'text-blue-600' }
  ];

  // 添加单个测试项
  const addTestItem = useCallback((url: string = '', testType: string = 'performance') => {
    const newItem: BatchTestItem = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url,
      testType,
      priority: 'medium',
      status: 'pending',
      progress: 0
    };
    setTestItems(prev => [...prev, newItem]);
  }, []);

  // 批量添加URL
  const handleBulkAdd = useCallback(() => {
    if (!bulkUrlText.trim()) {
      toast.error('请输入URL列表');
      return;
    }

    const urls = bulkUrlText
      .split('\n')
      .map(url => url.trim())
      .filter(url => url && isValidUrl(url));

    if (urls.length === 0) {
      toast.error('未找到有效的URL');
      return;
    }

    const newItems: BatchTestItem[] = urls.map(url => ({
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url,
      testType: config.testTypes[0] || 'performance',
      priority: 'medium',
      status: 'pending',
      progress: 0
    }));

    setTestItems(prev => [...prev, ...newItems]);
    setBulkUrlText('');
    setShowBulkInput(false);
    toast.success(`成功添加 ${urls.length} 个测试项`);
  }, [bulkUrlText, config.testTypes]);

  // URL验证
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // 更新测试项
  const updateTestItem = useCallback((id: string, updates: Partial<BatchTestItem>) => {
    setTestItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  // 删除测试项
  const removeTestItem = useCallback((id: string) => {
    setTestItems(prev => prev.filter(item => item.id !== id));
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  // 复制测试项
  const duplicateTestItem = useCallback((id: string) => {
    const item = testItems.find(t => t.id === id);
    if (item) {
      const newItem: BatchTestItem = {
        ...item,
        id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        progress: 0,
        result: undefined,
        startTime: undefined,
        endTime: undefined,
        duration: undefined,
        error: undefined
      };
      setTestItems(prev => [...prev, newItem]);
    }
  }, [testItems]);

  // 开始批量测试
  const startBatchTest = useCallback(async () => {
    if (testItems.length === 0) {
      toast.error('请添加要测试的URL');
      return;
    }

    const pendingItems = testItems.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) {
      toast.error('没有待测试的项目');
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
    
    // 触发测试开始回调
    onTestStart?.(config);

    try {
      // 模拟批量测试执行
      await executeBatchTest(pendingItems);
    } catch (error) {
      toast.error('批量测试执行失败');
      console.error('Batch test error:', error);
    } finally {
      setIsRunning(false);
    }
  }, [testItems, config, onTestStart]);

  // 执行批量测试的模拟逻辑
  const executeBatchTest = async (items: BatchTestItem[]) => {
    const { concurrency, timeout, retryCount } = config;
    let currentIndex = 0;
    const runningTests = new Map<string, Promise<void>>();

    const processTestItem = async (item: BatchTestItem): Promise<void> => {
      updateTestItem(item.id, { 
        status: 'running', 
        startTime: new Date(),
        progress: 0 
      });

      try {
        // 模拟测试进度
        for (let progress = 0; progress <= 100; progress += 10) {
          if (isPaused) {
            // 暂停逻辑
            await new Promise(resolve => {
              const checkPause = () => {
                if (!isPaused) resolve(undefined);
                else setTimeout(checkPause, 100);
              };
              checkPause();
            });
          }

          updateTestItem(item.id, { progress });
          await new Promise(resolve => setTimeout(resolve, 200)); // 模拟测试时间
        }

        // 模拟测试结果
        const mockResult = generateMockTestResult(item.testType);
        const endTime = new Date();
        const duration = endTime?.getTime() - (item.startTime?.getTime() || Date.now());

        updateTestItem(item.id, {
          status: 'completed',
          progress: 100,
          result: mockResult,
          endTime,
          duration
        });

      } catch (error) {
        updateTestItem(item.id, {
          status: 'failed',
          error: error instanceof Error ? error?.message : '测试失败'
        });
      }
    };

    // 并发控制
    while (currentIndex < items.length) {
      // 启动新的测试直到达到并发限制
      while (runningTests.size < concurrency && currentIndex < items.length) {
        const item = items[currentIndex];
        const testPromise = processTestItem(item);
        runningTests.set(item.id, testPromise);
        currentIndex++;
      }

      // 等待至少一个测试完成
      if (runningTests.size > 0) {
        await Promise.race(Array.from(runningTests.values()));
        // 清理已完成的测试
        for (const [id, promise] of runningTests.entries()) {
          try {
            await promise;
            runningTests.delete(id);
          } catch {
            runningTests.delete(id);
          }
        }
      }
    }

    // 等待所有剩余测试完成
    await Promise.all(runningTests.values());

    // 完成回调
    const completedResults = testItems.filter(item => item.status === 'completed');
    onTestComplete?.(completedResults);
    toast.success(`批量测试完成！成功: ${completedResults.length}, 失败: ${testItems.length - completedResults.length}`);
  };

  // 生成模拟测试结果
  const generateMockTestResult = (testType: string) => {
    const baseScore = 60 + Math.random() * 40; // 60-100分
    
    switch (testType) {
      case 'performance':
        return {
          score: Math.round(baseScore),
          metrics: {
            FCP: { value: Math.round(800 + Math.random() * 2000), unit: 'ms' },
            LCP: { value: Math.round(1200 + Math.random() * 3000), unit: 'ms' },
            CLS: { value: (Math.random() * 0.3).toFixed(3), unit: '' },
            TTFB: { value: Math.round(200 + Math.random() * 800), unit: 'ms' }
          },
          recommendations: [
            '优化图片加载',
            '减少JavaScript包大小',
            '启用浏览器缓存'
          ]
        };
      
      case 'security':
        return {
          score: Math.round(baseScore),
          vulnerabilities: Math.floor(Math.random() * 5),
          issues: [
            'Missing Security Headers',
            'Insecure Cookie Settings'
          ].slice(0, Math.floor(Math.random() * 3)),
          recommendations: [
            '添加安全头部',
            '启用HTTPS',
            '配置CSP策略'
          ]
        };
        
      case 'seo':
        return {
          score: Math.round(baseScore),
          issues: Math.floor(Math.random() * 8),
          checks: {
            title: Math.random() > 0.3,
            description: Math.random() > 0.2,
            headings: Math.random() > 0.4
          },
          recommendations: [
            '优化页面标题',
            '添加meta描述',
            '改进内容结构'
          ]
        };
        
      default:
        return {
          score: Math.round(baseScore),
          status: 'passed',
          details: '测试完成'
        };
    }
  };

  // 暂停/恢复测试
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
    toast.info(isPaused ? '测试已恢复' : '测试已暂停');
  }, [isPaused]);

  // 停止测试
  const stopTest = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    
    // 取消所有运行中的测试
    setTestItems(prev => prev.map(item => 
      item.status === 'running' ? { ...item, status: 'cancelled' } : item
    ));
    
    toast.info('批量测试已停止');
  }, []);

  // 清空所有测试项
  const clearAllTests = useCallback(() => {
    if (isRunning) {
      toast.error('请先停止正在运行的测试');
      return;
    }
    setTestItems([]);
    setSelectedItems(new Set());
    toast.info('已清空所有测试项');
  }, [isRunning]);

  // 重新运行失败的测试
  const retryFailedTests = useCallback(() => {
    const failedItems = testItems.filter(item => item.status === 'failed');
    if (failedItems.length === 0) {
      toast.info('没有失败的测试项');
      return;
    }

    setTestItems(prev => prev.map(item => 
      item.status === 'failed' 
        ? { ...item, status: 'pending', progress: 0, error: undefined }
        : item
    ));
    
    toast.success(`已重置 ${failedItems.length} 个失败的测试项`);
  }, [testItems]);

  // 过滤后的测试项
  const filteredItems = testItems.filter(item => {
    const matchesSearch = item.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // 统计信息
  const stats = {
    total: testItems.length,
    pending: testItems.filter(item => item.status === 'pending').length,
    running: testItems.filter(item => item.status === 'running').length,
    completed: testItems.filter(item => item.status === 'completed').length,
    failed: testItems.filter(item => item.status === 'failed').length,
    cancelled: testItems.filter(item => item.status === 'cancelled').length
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* 头部区域 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">批量测试管理</h2>
              <p className="text-blue-100">
                支持多URL并发测试，实时监控进度和结果分析
              </p>
            </div>
          </div>
          
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-blue-100">总计</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-300">{stats.pending}</div>
              <div className="text-xs text-blue-100">待测试</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-300">{stats.running}</div>
              <div className="text-xs text-blue-100">进行中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300">{stats.completed}</div>
              <div className="text-xs text-blue-100">已完成</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-300">{stats.failed}</div>
              <div className="text-xs text-blue-100">失败</div>
            </div>
          </div>
        </div>
      </div>

      {/* 主要控制栏 */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => addTestItem()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
              disabled={isRunning}
            >
              <Plus className="w-4 h-4" />
              <span>添加测试</span>
            </button>
            
            <button
              onClick={() => setShowBulkInput(true)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
              disabled={isRunning}
            >
              <Upload className="w-4 h-4" />
              <span>批量导入</span>
            </button>

            <div className="h-6 border-l border-gray-300" />

            {!isRunning ? (
              <button
                onClick={startBatchTest}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                disabled={testItems.length === 0}
              >
                <Play className="w-4 h-4" />
                <span>开始测试</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={togglePause}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  <span>{isPaused ? '恢复' : '暂停'}</span>
                </button>
                
                <button
                  onClick={stopTest}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
                >
                  <Square className="w-4 h-4" />
                  <span>停止</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={retryFailedTests}
              className="text-orange-600 hover:text-orange-700 px-3 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
              disabled={isRunning || stats.failed === 0}
            >
              <RefreshCw className="w-4 h-4" />
              <span>重试失败</span>
            </button>

            <button
              onClick={clearAllTests}
              className="text-red-600 hover:text-red-700 px-3 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
              disabled={isRunning}
            >
              <Trash2 className="w-4 h-4" />
              <span>清空</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab导航 */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {[
            { key: 'config', label: '测试配置', icon: Settings },
            { key: 'results', label: '测试结果', icon: FileText },
            { key: 'analysis', label: '数据分析', icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCurrentTab(tab.key as any)}
              className={`flex items-center space-x-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                currentTab === tab.key
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 批量导入模态框 */}
      {showBulkInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">批量导入URL</h3>
              <button
                onClick={() => setShowBulkInput(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL列表 (每行一个URL)
                </label>
                <textarea
                  value={bulkUrlText}
                  onChange={(e) => setBulkUrlText(e?.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`https://example1.com\nhttps://example2.com\nhttps://example3.com`}
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowBulkInput(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleBulkAdd}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  导入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab内容区域 */}
      <div className="p-6">
        {currentTab === 'config' && (
          <div className="space-y-6">
            {/* 搜索和过滤 */}
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e?.target.value)}
                  placeholder="搜索URL..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e?.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">全部状态</option>
                <option value="pending">待测试</option>
                <option value="running">进行中</option>
                <option value="completed">已完成</option>
                <option value="failed">失败</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>

            {/* 测试项列表 */}
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 transition-all ${
                    selectedItems.has(item.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedItems);
                          if (e?.target.checked) {
                            newSet.add(item.id);
                          } else {
                            newSet.delete(item.id);
                          }
                          setSelectedItems(newSet);
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={item.status === 'running'}
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <input
                            type="url"
                            value={item.url}
                            onChange={(e) => updateTestItem(item.id, { url: e?.target.value })}
                            placeholder="输入URL..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={item.status === 'running' || item.status === 'completed'}
                          />
                          
                          <select
                            value={item.testType}
                            onChange={(e) => updateTestItem(item.id, { testType: e?.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={item.status === 'running' || item.status === 'completed'}
                          >
                            {testTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <select
                            value={item.priority}
                            onChange={(e) => updateTestItem(item.id, { priority: e?.target.value as any })}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={item.status === 'running' || item.status === 'completed'}
                          >
                            <option value="high">高优先级</option>
                            <option value="medium">中优先级</option>
                            <option value="low">低优先级</option>
                          </select>
                        </div>

                        {/* 进度条和状态 */}
                        {item.status !== 'pending' && (
                          <div className="mt-2 flex items-center space-x-3">
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className={`font-medium ${
                                  item.status === 'completed' ? 'text-green-600' :
                                  item.status === 'failed' ? 'text-red-600' :
                                  item.status === 'running' ? 'text-blue-600' :
                                  item.status === 'cancelled' ? 'text-gray-600' :
                                  'text-yellow-600'
                                }`}>
                                  {item.status === 'completed' && '✅ 已完成'}
                                  {item.status === 'failed' && '❌ 失败'}
                                  {item.status === 'running' && '🔄 运行中'}
                                  {item.status === 'cancelled' && '⏹️ 已取消'}
                                </span>
                                <span className="text-gray-500">{item.progress}%</span>
                              </div>
                              
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    item.status === 'completed' ? 'bg-green-500' :
                                    item.status === 'failed' ? 'bg-red-500' :
                                    item.status === 'running' ? 'bg-blue-500' :
                                    'bg-gray-400'
                                  }`}
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                            </div>

                            {item.duration && (
                              <div className="text-sm text-gray-500">
                                {(item.duration / 1000).toFixed(1)}s
                              </div>
                            )}
                          </div>
                        )}

                        {/* 错误信息 */}
                        {item.error && (
                          <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                            {item.error}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => duplicateTestItem(item.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="复制"
                        disabled={isRunning}
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      {item.url && (
                        <button
                          onClick={() => window.open(item.url, '_blank')}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="打开URL"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => removeTestItem(item.id)}
                        className="p-2 text-red-400 hover:text-red-600 transition-colors"
                        title="删除"
                        disabled={item.status === 'running'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredItems.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>还没有添加测试项目</p>
                  <p className="text-sm">点击"添加测试"或"批量导入"开始</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === 'results' && (
          <div className="space-y-6">
            <div className="text-center text-gray-500 py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>测试结果将在测试完成后显示</p>
            </div>
          </div>
        )}

        {currentTab === 'analysis' && (
          <div className="space-y-6">
            <div className="text-center text-gray-500 py-12">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>数据分析功能即将推出</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchTestManager;
