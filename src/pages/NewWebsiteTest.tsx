import { Globe, Play, Settings, BarChart3, Download, Share2, History } from 'lucide-react';
import React, { useState } from 'react';
import { BaseTestLayout, TestStatusIndicator, TestControlButtons, TestResultCard } from '../components/layout/BaseTestLayout';
import { TestConfigPanel, TestHistoryPanel, TestResultExport, TestMetricCard, TestProgressBar } from '../components/testing/TestComponents';
import { useUserStats } from '../hooks/useUserStats';

// 网站测试配置接口
interface WebsiteTestConfig {
  url: string;
  testTypes: {
    performance: boolean;
    seo: boolean;
    security: boolean;
    accessibility: boolean;
  };
  device: 'desktop' | 'mobile' | 'both';
  location: string;
}

// 测试结果接口
interface WebsiteTestResult {
  id: string;
  url: string;
  timestamp: string;
  overallScore: number;
  performance?: {
    score: number;
    fcp: number;
    lcp: number;
    cls: number;
    fid: number;
  };
  seo?: {
    score: number;
    title: string;
    description: string;
    issues: string[];
  };
  security?: {
    score: number;
    ssl: boolean;
    vulnerabilities: number;
  };
  accessibility?: {
    score: number;
    wcagLevel: string;
    issues: number;
  };
}

const NewWebsiteTest: React.FC = () => {
  const { recordTestCompletion } = useUserStats();
  
  const [config, setConfig] = useState<WebsiteTestConfig>({
    url: '',
    testTypes: {
      performance: true,
      seo: true,
      security: false,
      accessibility: false,
    },
    device: 'desktop',
    location: 'global',
  });

  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<WebsiteTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 开始测试
  const handleStartTest = async () => {
    if (!config.url) {
      setError('请输入要测试的网站URL');
      return;
    }

    setTestStatus('running');
    setProgress(0);
    setError(null);

    try {
      // 模拟测试过程
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // 模拟测试结果
      const mockResult: WebsiteTestResult = {
        id: Date.now().toString(),
        url: config.url,
        timestamp: new Date().toISOString(),
        overallScore: Math.floor(Math.random() * 30) + 70,
        performance: config.testTypes.performance ? {
          score: Math.floor(Math.random() * 30) + 70,
          fcp: Math.random() * 2000 + 1000,
          lcp: Math.random() * 3000 + 2000,
          cls: Math.random() * 0.1,
          fid: Math.random() * 100 + 50,
        } : undefined,
        seo: config.testTypes.seo ? {
          score: Math.floor(Math.random() * 30) + 70,
          title: '示例页面标题',
          description: '示例页面描述',
          issues: ['缺少meta描述', 'H1标签重复'],
        } : undefined,
        security: config.testTypes.security ? {
          score: Math.floor(Math.random() * 30) + 70,
          ssl: true,
          vulnerabilities: Math.floor(Math.random() * 3),
        } : undefined,
        accessibility: config.testTypes.accessibility ? {
          score: Math.floor(Math.random() * 30) + 70,
          wcagLevel: 'AA',
          issues: Math.floor(Math.random() * 5),
        } : undefined,
      };

      setResults(mockResult);
      setTestStatus('completed');
      recordTestCompletion('website', true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '测试失败');
      setTestStatus('failed');
    }
  };

  // 停止测试
  const handleStopTest = () => {
    setTestStatus('idle');
    setProgress(0);
  };

  // 重置测试
  const handleResetTest = () => {
    setTestStatus('idle');
    setProgress(0);
    setResults(null);
    setError(null);
  };

  return (
    <BaseTestLayout
      title="网站综合测试"
      description="全面测试网站性能、SEO、安全性和可访问性"
      icon={Globe}
      requireAuth={true}
      authFeature="网站测试"
      authDescription="使用网站综合测试功能"
    >
      {/* 测试状态指示器 */}
      <TestStatusIndicator
        status={testStatus}
        progress={testStatus === 'running' ? progress : undefined}
        message={testStatus === 'running' ? '正在分析网站...' : undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：测试配置 */}
        <div className="lg:col-span-2 space-y-6">
          {/* URL输入 */}
          <TestConfigPanel title="网站URL">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  要测试的网站URL
                </label>
                <input
                  type="url"
                  value={config.url}
                  onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </TestConfigPanel>

          {/* 测试类型选择 */}
          <TestConfigPanel title="测试类型">
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(config.testTypes).map(([key, enabled]) => (
                <label key={key} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      testTypes: { ...prev.testTypes, [key]: e.target.checked }
                    }))}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-white capitalize">{key}</span>
                </label>
              ))}
            </div>
          </TestConfigPanel>

          {/* 测试控制 */}
          <div className="flex items-center justify-between">
            <TestControlButtons
              status={testStatus}
              onStart={handleStartTest}
              onStop={handleStopTest}
              onReset={handleResetTest}
              isDisabled={!config.url || !Object.values(config.testTypes).some(Boolean)}
            />
            
            {results && (
              <TestResultExport
                testData={results}
                testType="website"
                formats={['json', 'pdf', 'html']}
              />
            )}
          </div>

          {/* 测试进度 */}
          {testStatus === 'running' && (
            <TestProgressBar
              progress={progress}
              status="running"
              label="测试进度"
              showPercentage={true}
            />
          )}

          {/* 错误显示 */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* 右侧：历史记录 */}
        <div>
          <TestHistoryPanel
            testType="website"
            onTestSelect={(test) => console.log('选择测试:', test)}
            onTestRerun={(test) => console.log('重新运行:', test)}
          />
        </div>
      </div>

      {/* 测试结果 */}
      {results && (
        <div className="space-y-6">
          {/* 总体评分 */}
          <TestResultCard title="总体评分">
            <div className="text-center">
              <div className="text-6xl font-bold text-blue-400 mb-2">
                {results.overallScore}
              </div>
              <p className="text-gray-300">综合评分</p>
            </div>
          </TestResultCard>

          {/* 详细指标 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {results.performance && (
              <TestMetricCard
                title="性能评分"
                value={results.performance.score}
                status={results.performance.score >= 80 ? 'good' : results.performance.score >= 60 ? 'warning' : 'error'}
                description="页面加载性能"
              />
            )}
            
            {results.seo && (
              <TestMetricCard
                title="SEO评分"
                value={results.seo.score}
                status={results.seo.score >= 80 ? 'good' : results.seo.score >= 60 ? 'warning' : 'error'}
                description="搜索引擎优化"
              />
            )}
            
            {results.security && (
              <TestMetricCard
                title="安全评分"
                value={results.security.score}
                status={results.security.score >= 80 ? 'good' : results.security.score >= 60 ? 'warning' : 'error'}
                description="网站安全性"
              />
            )}
            
            {results.accessibility && (
              <TestMetricCard
                title="可访问性评分"
                value={results.accessibility.score}
                status={results.accessibility.score >= 80 ? 'good' : results.accessibility.score >= 60 ? 'warning' : 'error'}
                description="无障碍访问"
              />
            )}
          </div>

          {/* 详细结果 */}
          {results.performance && (
            <TestResultCard title="性能详情">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <TestMetricCard
                  title="首次内容绘制"
                  value={results.performance.fcp.toFixed(0)}
                  unit="ms"
                  status={results.performance.fcp < 1800 ? 'good' : results.performance.fcp < 3000 ? 'warning' : 'error'}
                />
                <TestMetricCard
                  title="最大内容绘制"
                  value={results.performance.lcp.toFixed(0)}
                  unit="ms"
                  status={results.performance.lcp < 2500 ? 'good' : results.performance.lcp < 4000 ? 'warning' : 'error'}
                />
                <TestMetricCard
                  title="累积布局偏移"
                  value={results.performance.cls.toFixed(3)}
                  status={results.performance.cls < 0.1 ? 'good' : results.performance.cls < 0.25 ? 'warning' : 'error'}
                />
                <TestMetricCard
                  title="首次输入延迟"
                  value={results.performance.fid.toFixed(0)}
                  unit="ms"
                  status={results.performance.fid < 100 ? 'good' : results.performance.fid < 300 ? 'warning' : 'error'}
                />
              </div>
            </TestResultCard>
          )}
        </div>
      )}
    </BaseTestLayout>
  );
};

export default NewWebsiteTest;
