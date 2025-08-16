/**
 * 统一测试工具管理器
 * 提供所有9个测试工具的统一管理界面
 */

import React, { useState, useEffect } from 'react';
import {Button} from '../ui/Button';

interface TestTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'performance' | 'security' | 'quality' | 'analysis';
  status: 'available' | 'running' | 'unavailable';
  lastRun?: string;
  averageScore?: number;
}

interface TestSuite {
  id: string;
  name: string;
  description: string;
  tools: string[];
  estimatedTime: number;
}

const TestManager: React.FC = () => {
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});

  // 9个测试工具定义
  const testTools: TestTool[] = [
    {
      id: 'api',
      name: 'API测试',
      description: 'REST API端点测试、负载测试、安全测试',
      icon: '🔌',
      category: 'performance',
      status: 'available',
      averageScore: 95
    },
    {
      id: 'compatibility',
      name: '兼容性测试',
      description: '多浏览器、多设备兼容性测试',
      icon: '🌐',
      category: 'quality',
      status: 'available',
      averageScore: 88
    },
    {
      id: 'infrastructure',
      name: '基础设施测试',
      description: '服务器监控、网络连接、系统资源测试',
      icon: '🏗️',
      category: 'performance',
      status: 'available',
      averageScore: 92
    },
    {
      id: 'performance',
      name: '性能测试',
      description: 'Core Web Vitals、页面速度、可访问性测试',
      icon: '⚡',
      category: 'performance',
      status: 'available',
      averageScore: 85
    },
    {
      id: 'security',
      name: '安全测试',
      description: 'SSL检查、漏洞扫描、OWASP Top 10测试',
      icon: '🔒',
      category: 'security',
      status: 'available',
      averageScore: 90
    },
    {
      id: 'seo',
      name: 'SEO测试',
      description: 'Meta分析、结构化数据、技术SEO测试',
      icon: '🔍',
      category: 'analysis',
      status: 'available',
      averageScore: 87
    },
    {
      id: 'stress',
      name: '压力测试',
      description: '负载测试、并发测试、性能极限测试',
      icon: '💪',
      category: 'performance',
      status: 'available',
      averageScore: 93
    },
    {
      id: 'ux',
      name: 'UX测试',
      description: '用户体验分析、交互测试、可用性评估',
      icon: '👤',
      category: 'quality',
      status: 'available',
      averageScore: 89
    },
    {
      id: 'website',
      name: '网站测试',
      description: '网站综合评估、内容分析、技术指标',
      icon: '🌍',
      category: 'analysis',
      status: 'available',
      averageScore: 91
    }
  ];

  // 预定义测试套件
  const testSuites: TestSuite[] = [
    {
      id: 'quick',
      name: '快速检查',
      description: '基础性能、安全和SEO检查',
      tools: ['performance', 'security', 'seo'],
      estimatedTime: 5
    },
    {
      id: 'comprehensive',
      name: '全面测试',
      description: '所有测试工具的完整检查',
      tools: ['api', 'compatibility', 'infrastructure', 'performance', 'security', 'seo', 'stress', 'ux', 'website'],
      estimatedTime: 25
    },
    {
      id: 'performance_focused',
      name: '性能专项',
      description: '专注于性能相关的测试',
      tools: ['performance', 'stress', 'infrastructure', 'api'],
      estimatedTime: 12
    },
    {
      id: 'security_audit',
      name: '安全审计',
      description: '全面的安全性检查',
      tools: ['security', 'api', 'infrastructure'],
      estimatedTime: 8
    },
    {
      id: 'quality_assurance',
      name: '质量保证',
      description: '用户体验和兼容性检查',
      tools: ['ux', 'compatibility', 'seo', 'website'],
      estimatedTime: 15
    }
  ];

  const handleToolToggle = (toolId: string) => {
    setSelectedTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  const handleSuiteSelect = (suiteId: string) => {
    const suite = testSuites.find(s => s.id === suiteId);
    if (suite) {
      setSelectedSuite(suiteId);
      setSelectedTools(suite.tools);
    } else {
      setSelectedSuite('');
    }
  };

  const handleStartTests = async () => {
    if (selectedTools.length === 0) {
      
        alert('请选择至少一个测试工具');
      return;
      }

    setIsRunning(true);
    setProgress({});

    // 模拟测试执行
    for (const toolId of selectedTools) {
      setProgress(prev => ({ ...prev, [toolId]: 0 }));
      
      // 模拟进度更新
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setProgress(prev => ({ ...prev, [toolId]: i }));
      }
    }

    setIsRunning(false);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'performance': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'security': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'quality': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'analysis': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 70) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="unified-test-manager max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          测试工具管理器
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          统一管理和执行所有9个测试工具，支持单独测试和套件测试
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 测试套件选择 */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              测试套件
            </h3>
            
            <div className="space-y-3">
              {testSuites.map(suite => (
                <div
                  key={suite.id}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedSuite === suite.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => handleSuiteSelect(suite.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {suite.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {suite.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        预计时间: {suite.estimatedTime}分钟
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <Button
                variant="primary"
                onClick={handleStartTests}
                disabled={selectedTools.length === 0 || isRunning}
                loading={isRunning}
                className="w-full"
              >
                {isRunning ? '测试进行中...' : `开始测试 (${selectedTools.length}个工具)`}
              </Button>
            </div>
          </div>
        </div>

        {/* 测试工具选择 */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              测试工具
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testTools.map(tool => (
                <div
                  key={tool.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTools.includes(tool.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => handleToolToggle(tool.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{tool.icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {tool.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {tool.description}
                        </p>
                        
                        <div className="flex items-center space-x-2 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(tool.category)}`}>
                            {tool.category}
                          </span>
                          
                          {tool.averageScore && (
                            <span className={`text-sm font-medium ${getScoreColor(tool.averageScore)}`}>
                              评分: {tool.averageScore}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className={`w-3 h-3 rounded-full ${
                        tool.status === 'available' ? 'bg-green-500' :
                        tool.status === 'running' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      
                      {isRunning && selectedTools.includes(tool.id) && (
                        <div className="mt-2 w-20">
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            {progress[tool.id] || 0}%
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                            <div 
                              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${progress[tool.id] || 0}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 测试进度总览 */}
      {isRunning && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            测试进度总览
          </h3>
          
          <div className="space-y-4">
            {selectedTools.map(toolId => {
              const tool = testTools.find(t => t.id === toolId);
              const toolProgress = progress[toolId] || 0;
              
              return (
                <div key={toolId} className="flex items-center space-x-4">
                  <span className="text-xl">{tool?.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-900 dark:text-white">{tool?.name}</span>
                      <span className="text-gray-600 dark:text-gray-400">{toolProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${toolProgress}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {toolProgress === 100 ? '✅ 完成' : toolProgress > 0 ? '🔄 进行中' : '⏳ 等待'}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 text-center">
            <Button
              variant="secondary"
              onClick={() => {
                setIsRunning(false);
                setProgress({});
              }}
            >
              停止所有测试
            </Button>
          </div>
        </div>
      )}

      {/* 快速操作 */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          快速操作
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="secondary"
            onClick={() => setSelectedTools(testTools.map(t => t.id))}
            disabled={isRunning}
          >
            全选
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => setSelectedTools([])}
            disabled={isRunning}
          >
            清空选择
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => setSelectedTools(testTools.filter(t => t.category === 'performance').map(t => t.id))}
            disabled={isRunning}
          >
            性能测试
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => setSelectedTools(testTools.filter(t => t.category === 'security').map(t => t.id))}
            disabled={isRunning}
          >
            安全测试
          </Button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {testTools.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            可用工具
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {testTools.filter(t => t.status === 'available').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            就绪状态
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {testSuites.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            测试套件
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {Math.round(testTools.reduce((sum, tool) => sum + (tool.averageScore || 0), 0) / testTools.length)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            平均评分
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestManager;
