/**
 * UI优化示例
 * 展示如何在不改变核心功能的前提下，使用统一的UI组件优化用户体验
 * 
 * 注意：此文件已从 frontend/examples/ 移动到 docs/examples/ 以符合项目结构规范
 */

import React, { useState } from 'react';
import { TestTypeIcon, TestStatusIcon, ActionIcon } from '../components/ui/UnifiedIcons';
import { FeedbackCard, StatusIndicator, ProgressFeedback, Notification } from '../components/ui/UnifiedFeedback';
import { CollapsiblePanel, CodeBlock, StatsCard, QuickAction } from '../components/ui/OptionalEnhancements';
import { Play, Square, Settings, Download, BarChart3, Clock, CheckCircle } from 'lucide-react';

// 模拟测试状态
type TestStatus = 'idle' | 'running' | 'completed' | 'failed';

export const UIOptimizationExample: React.FC = () => {
  const [optimizationLevel, setOptimizationLevel] = useState<'none' | 'minimal' | 'moderate' | 'full'>('none');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 模拟测试执行
  const simulateTest = () => {
    setTestStatus('running');
    setProgress(0);
    setError(null);

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 10;
        if (newProgress >= 100) {
          clearInterval(interval);
          setTestStatus('completed');
          setShowNotification(true);
          return 100;
        }
        return newProgress;
      });
    }, 500);
  };

  const stopTest = () => {
    setTestStatus('idle');
    setProgress(0);
  };

  const simulateError = () => {
    setError('模拟的测试错误：连接超时');
    setTestStatus('failed');
  };

  /**
   * 原始实现（无优化）
   */
  const OriginalImplementation = () => (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">性能测试</h2>
        <div className="flex space-x-2">
          <button
            onClick={simulateTest}
            disabled={testStatus === 'running'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            开始测试
          </button>
          <button
            onClick={stopTest}
            disabled={testStatus !== 'running'}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            停止测试
          </button>
        </div>
      </div>

      {testStatus === 'running' && (
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-gray-300">测试进度</span>
            <span className="text-gray-300">{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-300">
          错误: {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-gray-300 mb-2">测试URL</label>
          <input
            type="url"
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white"
            placeholder="https://example.com"
          />
        </div>
        <div>
          <label className="block text-gray-300 mb-2">设备类型</label>
          <select className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white">
            <option>桌面</option>
            <option>移动</option>
          </select>
        </div>
      </div>
    </div>
  );

  /**
   * 最小优化（使用主题变量）
   */
  const MinimalOptimization = () => (
    <div style={{
      background: 'var(--bg-glass)',
      border: '1px solid var(--border-primary)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--spacing-6)',
      backdropFilter: 'blur(16px)'
    }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>性能测试</h2>
        <div className="flex space-x-2">
          <button
            onClick={simulateTest}
            disabled={testStatus === 'running'}
            style={{
              background: 'var(--btn-primary-bg)',
              color: 'var(--text-inverse)',
              padding: 'var(--spacing-2) var(--spacing-4)',
              borderRadius: 'var(--radius-lg)',
              border: 'none'
            }}
            className="hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            开始测试
          </button>
          <button
            onClick={stopTest}
            disabled={testStatus !== 'running'}
            style={{
              background: 'var(--btn-secondary-bg)',
              color: 'var(--text-primary)',
              padding: 'var(--spacing-2) var(--spacing-4)',
              borderRadius: 'var(--radius-lg)',
              border: 'none'
            }}
            className="hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            停止测试
          </button>
        </div>
      </div>

      {/* 其余内容保持原样但使用CSS变量 */}
      <div className="space-y-4">
        <div>
          <label className="block mb-2" style={{ color: 'var(--text-secondary)' }}>测试URL</label>
          <input
            type="url"
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-3) var(--spacing-4)',
              color: 'var(--text-primary)',
              width: '100%'
            }}
            placeholder="https://example.com"
          />
        </div>
      </div>
    </div>
  );

  /**
   * 中等优化（使用部分统一组件）
   */
  const ModerateOptimization = () => (
    <div className="glass-effect card-style">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <TestTypeIcon testType="performance" size="lg" />
          <h2 className="text-xl font-bold text-white">性能测试</h2>
        </div>
        <div className="flex space-x-3">
          <QuickAction
            label="开始测试"
            icon={Play}
            onClick={simulateTest}
            disabled={testStatus === 'running'}
            variant="primary"
          />
          <QuickAction
            label="停止测试"
            icon={Square}
            onClick={stopTest}
            disabled={testStatus !== 'running'}
            variant="secondary"
          />
          <QuickAction
            label="设置"
            icon={Settings}
            onClick={() => console.log('设置')}
            variant="ghost"
          />
        </div>
      </div>

      {/* 使用统一的进度反馈 */}
      {testStatus === 'running' && (
        <div className="mb-6">
          <ProgressFeedback
            progress={progress}
            status="running"
            currentStep="正在分析性能指标..."
          />
        </div>
      )}

      {/* 使用统一的错误反馈 */}
      {error && (
        <div className="mb-6">
          <FeedbackCard
            type="error"
            title="测试失败"
            message={error}
            closable
            onClose={() => setError(null)}
          />
        </div>
      )}

      {/* 使用可折叠面板组织内容 */}
      <CollapsiblePanel title="测试配置" defaultExpanded>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">测试URL</label>
            <input
              type="url"
              className="input-style w-full"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2">设备类型</label>
            <select className="input-style w-full">
              <option>桌面</option>
              <option>移动</option>
            </select>
          </div>
        </div>
      </CollapsiblePanel>
    </div>
  );

  /**
   * 完全优化（使用全套统一组件）
   */
  const FullOptimization = () => (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <TestTypeIcon testType="performance" size="xl" />
          <div>
            <h1 className="text-2xl font-bold text-white">性能测试</h1>
            <p className="text-gray-400">全面检测网站性能指标</p>
          </div>
        </div>
        <StatusIndicator
          status={testStatus === 'running' ? 'loading' : testStatus === 'completed' ? 'success' : 'idle'}
          text={testStatus === 'running' ? '测试进行中' : testStatus === 'completed' ? '测试完成' : '等待开始'}
          size="lg"
        />
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="总测试数"
          value="1,234"
          change={{ value: 12, type: 'increase' }}
          icon={BarChart3}
          color="primary"
        />
        <StatsCard
          title="平均响应时间"
          value="245ms"
          change={{ value: 5.3, type: 'decrease' }}
          icon={Clock}
          color="info"
        />
        <StatsCard
          title="成功率"
          value="98.5%"
          change={{ value: 2.1, type: 'increase' }}
          icon={CheckCircle}
          color="success"
        />
      </div>

      {/* 快速操作 */}
      <div className="flex flex-wrap gap-3">
        <QuickAction
          label="开始测试"
          icon={Play}
          onClick={simulateTest}
          disabled={testStatus === 'running'}
          loading={testStatus === 'running'}
          variant="primary"
          size="lg"
        />
        <QuickAction
          label="停止测试"
          icon={Square}
          onClick={stopTest}
          disabled={testStatus !== 'running'}
          variant="secondary"
          size="lg"
        />
        <QuickAction
          label="模拟错误"
          icon={ActionIcon}
          onClick={simulateError}
          variant="ghost"
          size="lg"
        />
        <QuickAction
          label="导出结果"
          icon={Download}
          onClick={() => console.log('导出')}
          variant="ghost"
          size="lg"
        />
      </div>

      {/* 测试进度 */}
      {testStatus === 'running' && (
        <ProgressFeedback
          progress={progress}
          status="running"
          currentStep="正在分析性能指标..."
          size="lg"
        />
      )}

      {/* 错误反馈 */}
      {error && (
        <FeedbackCard
          type="error"
          title="测试执行失败"
          message={error}
          closable
          onClose={() => setError(null)}
          size="lg"
        />
      )}

      {/* 测试配置 */}
      <CollapsiblePanel title="测试配置" icon={Settings} defaultExpanded>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2 font-medium">测试URL</label>
              <input
                type="url"
                className="input-style w-full"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2 font-medium">设备类型</label>
              <select className="input-style w-full">
                <option>桌面</option>
                <option>移动</option>
                <option>平板</option>
              </select>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2 font-medium">网络条件</label>
              <select className="input-style w-full">
                <option>快速 3G</option>
                <option>慢速 3G</option>
                <option>无限制</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-300 mb-2 font-medium">测试深度</label>
              <select className="input-style w-full">
                <option>基础</option>
                <option>标准</option>
                <option>全面</option>
              </select>
            </div>
          </div>
        </div>
      </CollapsiblePanel>

      {/* 测试结果 */}
      {testStatus === 'completed' && (
        <CollapsiblePanel title="测试结果" defaultExpanded>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard
                title="性能评分"
                value="85"
                color="success"
              />
              <StatsCard
                title="加载时间"
                value="2.3s"
                color="warning"
              />
            </div>
            <CodeBlock
              title="详细结果"
              language="json"
              code={JSON.stringify({
                performance_score: 85,
                load_time: 2.3,
                first_contentful_paint: 1.2,
                largest_contentful_paint: 2.1
              }, null, 2)}
            />
          </div>
        </CollapsiblePanel>
      )}

      {/* 通知 */}
      {showNotification && (
        <Notification
          type="success"
          title="测试完成"
          message="性能测试已成功完成，查看上方结果"
          onClose={() => setShowNotification(false)}
        />
      )}
    </div>
  );

  const renderImplementation = () => {
    switch (optimizationLevel) {
      case 'minimal':
        return <MinimalOptimization />;
      case 'moderate':
        return <ModerateOptimization />;
      case 'full':
        return <FullOptimization />;
      default:
        return <OriginalImplementation />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-8">UI优化示例对比</h1>

      {/* 优化级别选择 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">选择优化级别:</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { key: 'none', label: '原始实现', desc: '保持现状，无任何优化' },
            { key: 'minimal', label: '最小优化', desc: '仅使用CSS变量统一样式' },
            { key: 'moderate', label: '中等优化', desc: '使用部分统一组件' },
            { key: 'full', label: '完全优化', desc: '使用全套优化组件' }
          ].map(option => (
            <button
              key={option.key}
              onClick={() => setOptimizationLevel(option.key as any)}
              className={`
                p-4 rounded-xl border text-left transition-all
                ${optimizationLevel === option.key
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600'
                }
              `}
            >
              <h3 className="font-semibold mb-2">{option.label}</h3>
              <p className="text-sm opacity-80">{option.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 当前优化说明 */}
      <div className="mb-8 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
        <h3 className="font-semibold mb-2">当前优化级别: {
          optimizationLevel === 'none' ? '原始实现' :
          optimizationLevel === 'minimal' ? '最小优化' :
          optimizationLevel === 'moderate' ? '中等优化' : '完全优化'
        }</h3>
        <div className="text-sm text-gray-400">
          {optimizationLevel === 'none' && (
            <div>
              <p>✅ 保持现有实现，零风险</p>
              <p>❌ 样式不统一，维护成本高</p>
            </div>
          )}
          {optimizationLevel === 'minimal' && (
            <div>
              <p>✅ 使用CSS变量统一颜色和间距</p>
              <p>✅ 保持现有组件结构不变</p>
              <p>✅ 支持主题切换和毛玻璃效果</p>
            </div>
          )}
          {optimizationLevel === 'moderate' && (
            <div>
              <p>✅ 使用统一的图标和反馈组件</p>
              <p>✅ 改进用户交互体验</p>
              <p>✅ 保持核心功能完全不变</p>
            </div>
          )}
          {optimizationLevel === 'full' && (
            <div>
              <p>✅ 完整的统一UI体验</p>
              <p>✅ 最佳的用户交互和视觉效果</p>
              <p>✅ 现代化的组件和布局</p>
              <p>⚠️ 需要适配现有页面逻辑</p>
            </div>
          )}
        </div>
      </div>

      {/* 实现示例 */}
      <div className="space-y-6">
        {renderImplementation()}
      </div>

      {/* 使用说明 */}
      <div className="mt-12 p-6 bg-gray-800/50 border border-gray-700 rounded-xl">
        <h3 className="text-lg font-semibold mb-4">💡 实际应用建议</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-blue-400 mb-2">推荐页面优化策略:</h4>
            <ul className="space-y-1 text-gray-300">
              <li><strong>StressTest.tsx:</strong> 保持原始实现</li>
              <li><strong>APITest.tsx:</strong> 中等优化</li>
              <li><strong>SEOTest.tsx:</strong> 最小优化</li>
              <li><strong>新页面:</strong> 完全优化</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-green-400 mb-2">优化收益:</h4>
            <ul className="space-y-1 text-gray-300">
              <li>✅ 视觉一致性提升</li>
              <li>✅ 用户体验改善</li>
              <li>✅ 维护成本降低</li>
              <li>✅ 主题支持增强</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIOptimizationExample;
