/**
 * 安全测试页面示例 - 使用标签页结构
 * 展示如何在其他测试页面中集成测试历史标签页
 */

import React, { useState } from 'react';
import TestPageWithHistory from '../components/testing/TestPageWithHistory';
import TestPageHistory from '..\components\ui\TestPageHistory.tsx';

const SecurityTestWithHistory: React.FC = () => {
  // 安全测试的状态
  const [testUrl, setTestUrl] = useState('');
  const [testName, setTestName] = useState('');
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  // 开始安全测试
  const handleStartTest = async () => {
    if (!testUrl.trim()) {
      alert('请输入测试URL');
      return;
    }

    setIsTestRunning(true);
    try {
      // 这里是安全测试的逻辑
      console.log('开始安全测试:', { testUrl, testName });
      
      // 模拟测试过程
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 模拟测试结果
      setTestResults({
        overallScore: 85,
        vulnerabilities: 3,
        securityGrade: 'B+',
        // ... 其他安全测试结果
      });
    } catch (error) {
      console.error('安全测试失败:', error);
    } finally {
      setIsTestRunning(false);
    }
  };

  // 处理测试记录选择
  const handleTestSelect = (test: any) => {
    console.log('选择的测试记录:', test);
    // 可以在这里处理测试记录的选择，比如显示详情
  };

  // 处理重新运行测试
  const handleTestRerun = (test: any) => {
    console.log('重新运行测试:', test);
    // 预填测试配置
    setTestUrl(test.url);
    setTestName(`${test.testName} - 重新运行`);
  };

  // 安全测试内容
  const testContent = (
    <div className="space-y-6">
      {/* URL 输入区域 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          🛡️ 安全测试配置
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              测试名称
            </label>
            <input
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="输入测试名称..."
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              测试URL
            </label>
            <input
              type="url"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            />
          </div>

          <button
            onClick={handleStartTest}
            disabled={isTestRunning || !testUrl.trim()}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isTestRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                正在进行安全测试...
              </>
            ) : (
              <>
                🛡️ 开始安全测试
              </>
            )}
          </button>
        </div>
      </div>

      {/* 测试进度和结果 */}
      {isTestRunning && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">测试进度</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              <span className="text-gray-300">正在扫描安全漏洞...</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* 测试结果 */}
      {testResults && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            📊 安全测试结果
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{testResults.overallScore}</div>
              <div className="text-sm text-gray-300">安全评分</div>
            </div>
            
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{testResults.vulnerabilities}</div>
              <div className="text-sm text-gray-300">发现漏洞</div>
            </div>
            
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{testResults.securityGrade}</div>
              <div className="text-sm text-gray-300">安全等级</div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              查看详细报告
            </button>
            <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
              导出结果
            </button>
          </div>
        </div>
      )}

      {/* 安全测试配置选项 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">高级配置</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" defaultChecked />
              <span className="text-gray-300">SQL注入检测</span>
            </label>
          </div>
          
          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" defaultChecked />
              <span className="text-gray-300">XSS漏洞扫描</span>
            </label>
          </div>
          
          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" defaultChecked />
              <span className="text-gray-300">CSRF检测</span>
            </label>
          </div>
          
          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" defaultChecked />
              <span className="text-gray-300">SSL/TLS配置检查</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  // 历史记录内容
  const historyContent = (
    <TestPageHistory
      testType="security"
      onTestSelect={handleTestSelect}
      onTestRerun={handleTestRerun}
    />
  );

  return (
    <TestPageWithHistory
      testType="security"
      testName="安全测试"
      testIcon="🛡️"
      testContent={testContent}
      historyContent={historyContent}
      onTabChange={(tab) => {
        console.log('切换到标签页:', tab);
      }}
    />
  );
};

export default SecurityTestWithHistory;
