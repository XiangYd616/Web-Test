/**
 * API升级示例
 * 展示如何在现有页面中可选地使用新的统一API调用模式
 * 
 * 注意：此文件已从 frontend/examples/ 移动到 docs/examples/ 以符合项目结构规范
 */

import React, { useState, useEffect } from 'react';
import { testApiServiceAdapter } from '../services/api/testApiServiceAdapter';
import { backgroundTestManagerAdapter } from '../services/backgroundTestManagerAdapter';
import { unifiedTestApiClient } from '../services/api/unifiedTestApiClient'; // 更新导入路径

// 示例：现有页面的API升级方案
export const ApiUpgradeExample: React.FC = () => {
  const [upgradeMode, setUpgradeMode] = useState<'original' | 'adapter' | 'unified'>('original');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 配置适配器（可选）
  useEffect(() => {
    if (upgradeMode === 'adapter') {
      backgroundTestManagerAdapter.configure({
        useUnifiedApi: true,
        enableWebSocket: true,
        fallbackToOriginal: true,
        enableLogging: true
      });
    }
  }, [upgradeMode]);

  /**
   * 方案1: 保持现有实现（完全不变）
   */
  const executeTestWithOriginalApi = async () => {
    try {
      setIsRunning(true);
      setError(null);
      setResult(null);

      // 模拟现有的API调用方式
      console.log('🔄 使用原始API实现...');
      
      // 这里应该是现有的testApiService调用
      // const response = await testApiService.executePerformanceTest(url, config);
      
      // 模拟原始API调用
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setResult({
        method: 'original',
        performance_score: 85,
        load_time: 2.3,
        message: '使用原始API实现完成'
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * 方案2: 使用兼容性适配器（推荐）
   */
  const executeTestWithAdapter = async () => {
    try {
      setIsRunning(true);
      setError(null);
      setResult(null);

      console.log('🔧 使用兼容性适配器...');

      // 使用适配器，接口完全相同但获得增强功能
      const response = await testApiServiceAdapter.executePerformanceTest(
        'https://example.com',
        {
          device: 'desktop',
          network_condition: 'fast-3g',
          include_screenshots: true,
          lighthouse_categories: ['performance'],
          custom_metrics: []
        }
      );

      if (response.success) {
        setResult({
          method: 'adapter',
          ...response.data,
          message: '使用兼容性适配器完成，获得了增强功能'
        });
      } else {
        throw new Error(response.error?.message || '测试失败');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * 方案3: 使用统一API客户端（最佳体验）
   */
  const executeTestWithUnifiedApi = async () => {
    try {
      setIsRunning(true);
      setError(null);
      setResult(null);
      setProgress(0);

      console.log('🚀 使用统一API客户端...');

      // 使用统一API客户端的实时测试功能
      const testId = await unifiedTestApiClient.startRealtimeTest(
        {
          url: 'https://example.com',
          testType: 'performance',
          device: 'desktop',
          network_condition: 'fast-3g'
        },
        {
          onProgress: (progress, step, metrics) => {
            console.log(`📊 进度: ${progress}% - ${step}`);
            setProgress(progress);
            
            if (metrics) {
              console.log('📈 实时指标:', metrics);
            }
          },
          onComplete: (result) => {
            console.log('✅ 测试完成:', result);
            setResult({
              method: 'unified',
              ...result,
              message: '使用统一API客户端完成，支持实时更新'
            });
            setIsRunning(false);
          },
          onError: (error) => {
            console.error('❌ 测试失败:', error);
            setError(error.message);
            setIsRunning(false);
          }
        }
      );

      console.log(`🆔 测试ID: ${testId}`);

    } catch (err: any) {
      setError(err.message);
      setIsRunning(false);
    }
  };

  /**
   * 执行测试（根据选择的模式）
   */
  const handleStartTest = () => {
    switch (upgradeMode) {
      case 'original':
        executeTestWithOriginalApi();
        break;
      case 'adapter':
        executeTestWithAdapter();
        break;
      case 'unified':
        executeTestWithUnifiedApi();
        break;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-6">API升级示例</h1>
      
      {/* 升级模式选择 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">选择API调用模式:</h2>
        <div className="space-y-2">
          <label className="flex items-center space-x-3">
            <input
              type="radio"
              value="original"
              checked={upgradeMode === 'original'}
              onChange={(e) => setUpgradeMode(e.target.value as any)}
              className="text-blue-600"
            />
            <span>🔄 原始实现 (保持现状)</span>
          </label>
          
          <label className="flex items-center space-x-3">
            <input
              type="radio"
              value="adapter"
              checked={upgradeMode === 'adapter'}
              onChange={(e) => setUpgradeMode(e.target.value as any)}
              className="text-blue-600"
            />
            <span>🔧 兼容性适配器 (推荐升级)</span>
          </label>
          
          <label className="flex items-center space-x-3">
            <input
              type="radio"
              value="unified"
              checked={upgradeMode === 'unified'}
              onChange={(e) => setUpgradeMode(e.target.value as any)}
              className="text-blue-600"
            />
            <span>🚀 统一API客户端 (最佳体验)</span>
          </label>
        </div>
      </div>

      {/* 模式说明 */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <h3 className="font-semibold mb-2">当前模式说明:</h3>
        {upgradeMode === 'original' && (
          <div className="text-gray-300">
            <p>✅ 完全保持现有实现，不做任何改动</p>
            <p>✅ 100%兼容，零风险</p>
            <p>❌ 无法获得新功能和性能优化</p>
          </div>
        )}
        {upgradeMode === 'adapter' && (
          <div className="text-gray-300">
            <p>✅ 保持现有接口100%兼容</p>
            <p>✅ 获得统一错误处理、重试、缓存等增强功能</p>
            <p>✅ 支持WebSocket实时更新（可选）</p>
            <p>✅ 失败时自动回退到原始实现</p>
          </div>
        )}
        {upgradeMode === 'unified' && (
          <div className="text-gray-300">
            <p>✅ 最佳的API调用体验</p>
            <p>✅ 原生WebSocket实时更新支持</p>
            <p>✅ 完整的类型安全和错误处理</p>
            <p>⚠️ 需要适配现有UI逻辑</p>
          </div>
        )}
      </div>

      {/* 测试控制 */}
      <div className="mb-6">
        <button
          onClick={handleStartTest}
          disabled={isRunning}
          className={`px-6 py-3 rounded-lg font-medium ${
            isRunning
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isRunning ? '测试运行中...' : '开始测试'}
        </button>
      </div>

      {/* 进度显示（仅统一API模式） */}
      {upgradeMode === 'unified' && isRunning && (
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-400">测试进度</span>
            <span className="text-blue-400">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 错误显示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <h3 className="text-red-400 font-semibold mb-2">测试失败</h3>
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* 结果显示 */}
      {result && (
        <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
          <h3 className="text-green-400 font-semibold mb-2">测试结果</h3>
          <div className="space-y-2">
            <p><span className="text-gray-400">调用方式:</span> <span className="text-green-300">{result.method}</span></p>
            <p><span className="text-gray-400">消息:</span> <span className="text-green-300">{result.message}</span></p>
            {result.performance_score && (
              <p><span className="text-gray-400">性能评分:</span> <span className="text-green-300">{result.performance_score}</span></p>
            )}
            {result.load_time && (
              <p><span className="text-gray-400">加载时间:</span> <span className="text-green-300">{result.load_time}s</span></p>
            )}
          </div>
          
          {/* 详细结果 */}
          <details className="mt-4">
            <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
              查看详细结果
            </summary>
            <pre className="mt-2 p-3 bg-gray-800 rounded text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-8 p-4 bg-gray-800 rounded-lg">
        <h3 className="font-semibold mb-3">💡 实际使用建议:</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <p><strong>StressTest.tsx:</strong> 保持原始实现（功能完整，性能优秀）</p>
          <p><strong>APITest.tsx:</strong> 使用兼容性适配器（获得增强功能但保持兼容）</p>
          <p><strong>SEOTest.tsx:</strong> 保持现有useUnifiedSEOTest（已经很完善）</p>
          <p><strong>新页面:</strong> 使用统一API客户端（最佳体验）</p>
        </div>
      </div>
    </div>
  );
};

export default ApiUpgradeExample;
