/**
 * 简化的测试工具组件
 * 提供基本的网站测试功能
 */

import React, { useState } from 'react
import { SimpleBarChart, StatCard, ProgressRing } from '../charts/SimpleCharts

// 测试结果类型
interface TestResult {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'pending'
  score?: number;
  details?: string;
  timestamp: Date;
}

// URL输入组件
interface URLInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}

const URLInput: React.FC<URLInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = "请输入要测试的网站URL",
  disabled = false
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
        required
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        开始测试
      </button>
    </form>
  );
};

// 测试进度组件
interface TestProgressProps {
  tests: TestResult[];
  currentTest?: string;
}

const TestProgress: React.FC<TestProgressProps> = ({ tests, currentTest }) => {
  const completedTests = tests.filter(t => t.status === 'completed').length;
  const failedTests = tests.filter(t => t.status === 'failed').length;
  const totalTests = tests.length;
  const progress = totalTests > 0 ? (completedTests + failedTests) / totalTests * 100 : 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">测试进度</h3>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-4">
          <StatCard
            title="已完成"
            value={completedTests}
            className="flex-1"
          />
          <StatCard
            title="失败"
            value={failedTests}
            changeType="negative"
            className="flex-1"
          />
          <StatCard
            title="总计"
            value={totalTests}
            className="flex-1"
          />
        </div>
        
        <ProgressRing
          percentage={progress}
          size={80}
          label="总进度"
        />
      </div>

      {currentTest && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            当前测试: <span className="font-medium">{currentTest}</span>
          </p>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {tests.map((test) => (
          <div key={test.id} className="flex items-center justify-between p-2 border rounded">
            <span className="text-sm">{test.name}</span>
            <span className={`text-xs px-2 py-1 rounded ${
              test.status === 'completed' ? 'bg-green-100 text-green-800' :
              test.status === 'failed' ? 'bg-red-100 text-red-800' :
              test.status === 'running' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800
            }`}>
              {test.status === 'completed' ? '完成' :
               test.status === 'failed' ? '失败' :
               test.status === 'running' ? '运行中' : '等待'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 测试结果展示组件
interface TestResultsProps {
  results: TestResult[];
}

const TestResults: React.FC<TestResultsProps> = ({ results }) => {
  const completedResults = results.filter(r => r.status === 'completed' && r.score !== undefined);
  
  if (completedResults.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center">
        <p className="text-gray-500">暂无测试结果</p>
      </div>
    );
  }

  const chartData = completedResults.map(result => ({
    name: result.name,
    value: result.score || 0,
    color: (result.score || 0) >= 80 ? '#10B981' : 
           (result.score || 0) >= 60 ? '#F59E0B' : '#EF4444'
  }));

  const averageScore = completedResults.reduce((sum, r) => sum + (r.score || 0), 0) / completedResults.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="平均分数"
          value={`${Math.round(averageScore)}分`}
          changeType={averageScore >= 80 ? 'positive' : averageScore >= 60 ? 'neutral' : 'negative'}
        />
        <StatCard
          title="通过测试"
          value={completedResults.filter(r => (r.score || 0) >= 60).length}
          changeType="positive"
        />
        <StatCard
          title="需要改进"
          value={completedResults.filter(r => (r.score || 0) < 60).length}
          changeType="negative"
        />
      </div>

      <SimpleBarChart
        title="测试结果详情"
        data={chartData}
      />

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">详细结果</h3>
        <div className="space-y-3">
          {completedResults.map((result) => (
            <div key={result.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{result.name}</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  (result.score || 0) >= 80 ? 'bg-green-100 text-green-800' :
                  (result.score || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800
                }`}>
                  {result.score}分
                </span>
              </div>
              {result.details && (
                <p className="text-sm text-gray-600">{result.details}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                测试时间: {result.timestamp.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 主要的测试工具组件
interface SimpleTestToolsProps {
  className?: string;
}

const SimpleTestTools: React.FC<SimpleTestToolsProps> = ({ className = '' }) => {
  const [url, setUrl] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');

  const runTests = async () => {
    if (!url.trim()) return;

    setIsRunning(true);
    const testTypes = [
      { id: '1', name: '性能测试', duration: 2000 },
      { id: '2', name: '安全测试', duration: 3000 },
      { id: '3', name: 'SEO测试', duration: 2500 },
      { id: '4', name: '可访问性测试', duration: 1500 }
    ];

    // 初始化测试状态
    const initialTests: TestResult[] = testTypes.map(test => ({
      id: test.id,
      name: test.name,
      status: 'pending',
      timestamp: new Date()
    }));
    setTests(initialTests);

    // 模拟运行测试
    for (const test of testTypes) {
      setCurrentTest(test.name);
      setTests(prev => prev.map(t => 
        t.id === test.id ? { ...t, status: 'running' } : t
      ));

      // 模拟测试延迟
      await new Promise(resolve => setTimeout(resolve, test.duration));

      // 模拟测试结果
      const score = Math.floor(Math.random() * 40) + 60; // 60-100分
      const isSuccess = Math.random() > 0.1; // 90%成功率

      setTests(prev => prev.map(t => 
        t.id === test.id ? {
          ...t,
          status: isSuccess ? 'completed' : 'failed',
          score: isSuccess ? score : undefined,
          details: isSuccess ? 
            `测试完成，得分 ${score}分` : 
            '测试失败，请检查网站配置
        } : t
      ));
    }

    setCurrentTest('');
    setIsRunning(false);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">网站测试工具</h2>
        <URLInput
          value={url}
          onChange={setUrl}
          onSubmit={runTests}
          disabled={isRunning}
        />
      </div>

      {tests.length > 0 && (
        <TestProgress tests={tests} currentTest={currentTest} />
      )}

      <TestResults results={tests} />
    </div>
  );
};

export default SimpleTestTools;
