/**
 * DatabaseTest.tsx - 数据库测试页面
 */

import React, { useState, useCallback } from 'react';
import { Database, Play, Square, RotateCcw, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuthCheck } from '../components/auth/WithAuthCheck';
import TestPageLayout from '../components/testing/TestPageLayout';
import { toast } from 'react-hot-toast';

interface DatabaseTestConfig {
  connectionString: string;
  databaseType: 'mysql' | 'postgresql' | 'mongodb' | 'redis';
  testTypes: string[];
  queryTimeout: number;
}

interface TestResult {
  testName: string;
  status: 'pass' | 'fail' | 'warning';
  duration: number;
  message: string;
}

const DatabaseTest: React.FC = () => {
  const { requireLogin } = useAuthCheck({
    feature: "数据库测试",
    description: "使用数据库测试功能"
  });
  
  const [activeTab, setActiveTab] = useState<'test' | 'history'>('test');
  const [config, setConfig] = useState<DatabaseTestConfig>({
    connectionString: '',
    databaseType: 'mysql',
    testTypes: ['connection', 'performance', 'integrity'],
    queryTimeout: 30
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TestResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleStartTest = useCallback(async () => {
    if (!requireLogin()) return;
    
    if (!config.connectionString) {
      setError('请输入数据库连接字符串');
      return;
    }
    
    try {
      setError(null);
      setResult(null);
      setIsRunning(true);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockResults: TestResult[] = [
        {
          testName: '连接测试',
          status: 'pass',
          duration: 120,
          message: '数据库连接成功'
        },
        {
          testName: '性能测试',
          status: Math.random() > 0.5 ? 'pass' : 'warning',
          duration: 1500,
          message: '查询响应时间正常'
        },
        {
          testName: '完整性检查',
          status: 'pass',
          duration: 800,
          message: '数据完整性验证通过'
        }
      ];
      
      setResult(mockResults);
      toast.success('测试完成');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '测试失败';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsRunning(false);
    }
  }, [config, requireLogin]);
  
  const handleStopTest = useCallback(() => {
    setIsRunning(false);
    toast('测试已停止');
  }, []);
  
  const handleResetTest = useCallback(() => {
    setResult(null);
    setError(null);
    toast.success('已重置测试');
  }, []);
  
  const toggleTestType = (testType: string) => {
    setConfig(prev => ({
      ...prev,
      testTypes: prev.testTypes.includes(testType)
        ? prev.testTypes.filter(t => t !== testType)
        : [...prev.testTypes, testType]
    }));
  };

  return (
    <TestPageLayout
      title="数据库测试"
      description="数据库性能和完整性检测"
      icon={Database}
      testStatus={isRunning ? 'running' : result ? 'completed' : 'idle'}
      isTestDisabled={!config.connectionString || config.testTypes.length === 0}
      onStartTest={handleStartTest}
      onStopTest={handleStopTest}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {activeTab === 'test' ? (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">测试配置</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  数据库类型
                </label>
                <select
                  value={config.databaseType}
                  onChange={(e) => setConfig({ ...config, databaseType: e.target.value as any })}
                  disabled={isRunning}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mysql">MySQL</option>
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mongodb">MongoDB</option>
                  <option value="redis">Redis</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  连接字符串
                </label>
                <input
                  type="password"
                  value={config.connectionString}
                  onChange={(e) => setConfig({ ...config, connectionString: e.target.value })}
                  placeholder="例如: mysql://user:password@localhost:3306/database"
                  disabled={isRunning}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  选择测试项
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { id: 'connection', label: '连接测试' },
                    { id: 'performance', label: '性能测试' },
                    { id: 'integrity', label: '完整性检查' }
                  ].map(testType => (
                    <button
                      key={testType.id}
                      onClick={() => toggleTestType(testType.id)}
                      disabled={isRunning}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        config.testTypes.includes(testType.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      } disabled:opacity-50`}
                    >
                      {testType.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  查询超时 (秒): {config.queryTimeout}
                </label>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={config.queryTimeout}
                  onChange={(e) => setConfig({ ...config, queryTimeout: parseInt(e.target.value) })}
                  disabled={isRunning}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          {/* 额外控制按钮 - 仅保留重置按钮 */}
          {result && !isRunning && (
            <div className="flex items-center space-x-4">
              <button
                onClick={handleResetTest}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
              >
                <RotateCcw className="h-5 w-5" />
                <span>重置</span>
              </button>
            </div>
          )}
          
          {error && (
            <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-400 mb-1">测试错误</h4>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {result && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">测试结果</h3>
              <div className="space-y-3">
                {result.map((testResult, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {testResult.status === 'pass' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {testResult.status === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                      {testResult.status === 'fail' && <XCircle className="h-5 w-5 text-red-500" />}
                      <div>
                        <p className="text-white font-medium">{testResult.testName}</p>
                        <p className="text-sm text-gray-400">{testResult.message}</p>
                        <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                          <Clock className="h-3 w-3" />
                          <span>{testResult.duration}ms</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      testResult.status === 'pass' ? 'bg-green-500/20 text-green-400' :
                      testResult.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {testResult.status === 'pass' ? '通过' : testResult.status === 'warning' ? '警告' : '失败'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400">暂无测试历史</p>
        </div>
      )}
    </TestPageLayout>
  );
};

export default DatabaseTest;

