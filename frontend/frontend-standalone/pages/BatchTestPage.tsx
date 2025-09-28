/**
 * 批量测试页面
 * 集成批量测试管理组件，提供完整的批量测试工作流
 */

import React, { useState, useCallback } from 'react';
import { 
  BarChart3, 
  Download, 
  Settings, 
  RefreshCw, 
  Clock,
  TrendingUp,
  FileText,
  Share2,
  Save,
  History
} from 'lucide-react';
import BatchTestManager from '../components/testing/BatchTestManager';
import { toast } from 'react-hot-toast';

interface BatchTestPageProps {}

const BatchTestPage: React.FC<BatchTestPageProps> = () => {
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [currentResults, setCurrentResults] = useState<any[]>([]);

  // 处理测试完成
  const handleTestComplete = useCallback((results: any[]) => {
    setCurrentResults(results);
    
    // 添加到历史记录
    const newHistoryEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      successfulTests: results.filter(r => r.status === 'completed').length,
      failedTests: results.filter(r => r.status === 'failed').length,
      results: results
    };
    
    setTestHistory(prev => [newHistoryEntry, ...prev.slice(0, 9)]); // 保留最近10次记录
    
    toast.success('批量测试已完成，结果已保存到历史记录');
  }, []);

  // 处理测试开始
  const handleTestStart = useCallback((config: any) => {
    console.log('批量测试开始:', config);
    toast.info(`开始批量测试: ${config.name}`);
  }, []);

  // 导出结果
  const exportResults = useCallback((format: 'json' | 'csv' | 'excel') => {
    if (currentResults.length === 0) {
      toast.error('没有可导出的结果');
      return;
    }

    // 模拟导出
    const exportData = {
      timestamp: new Date().toISOString(),
      totalTests: currentResults.length,
      results: currentResults
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `batch-test-results-${Date.now()}.${format === 'json' ? 'json' : 'csv'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`结果已导出为 ${format.toUpperCase()} 格式`);
  }, [currentResults]);

  // 保存测试配置
  const saveTestConfiguration = useCallback(() => {
    // 这里可以实现保存测试配置的逻辑
    toast.success('测试配置已保存');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面头部 */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">批量测试中心</h1>
                <p className="text-gray-600 mt-1">
                  高效的多URL并发测试平台，支持性能、安全、SEO等多维度测试
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>设置</span>
              </button>

              <button
                onClick={saveTestConfiguration}
                className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>保存配置</span>
              </button>
            </div>
          </div>

          {/* 快速操作栏 */}
          {currentResults.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    最近测试: {currentResults.length} 个URL，
                    成功 {currentResults.filter(r => r.status === 'completed').length} 个，
                    失败 {currentResults.filter(r => r.status === 'failed').length} 个
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => exportResults('json')}
                    className="flex items-center space-x-2 px-3 py-2 text-green-600 hover:text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>JSON</span>
                  </button>

                  <button
                    onClick={() => exportResults('csv')}
                    className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>CSV</span>
                  </button>

                  <button
                    onClick={() => exportResults('excel')}
                    className="flex items-center space-x-2 px-3 py-2 text-purple-600 hover:text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Excel</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 设置面板 */}
        {showSettings && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">批量测试设置</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  并发数量
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="1">1 (顺序执行)</option>
                  <option value="3">3 (默认)</option>
                  <option value="5">5 (快速)</option>
                  <option value="10">10 (最快)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  超时时间
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="30">30秒</option>
                  <option value="60">60秒 (默认)</option>
                  <option value="120">2分钟</option>
                  <option value="300">5分钟</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  重试次数
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="0">0 (不重试)</option>
                  <option value="1">1次 (默认)</option>
                  <option value="2">2次</option>
                  <option value="3">3次</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center space-x-4">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" defaultChecked />
                <span className="text-sm text-gray-700">启用详细日志</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <span className="text-sm text-gray-700">测试完成后发送邮件通知</span>
              </label>
            </div>
          </div>
        )}

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* 批量测试管理器 */}
          <div className="xl:col-span-3">
            <BatchTestManager
              onTestComplete={handleTestComplete}
              onTestStart={handleTestStart}
            />
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 测试统计 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                测试统计
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">今日测试</span>
                  <span className="text-sm font-semibold text-gray-900">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">本周测试</span>
                  <span className="text-sm font-semibold text-gray-900">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">本月测试</span>
                  <span className="text-sm font-semibold text-gray-900">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">平均成功率</span>
                  <span className="text-sm font-semibold text-green-600">0%</span>
                </div>
              </div>
            </div>

            {/* 测试历史 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <History className="w-5 h-5 mr-2" />
                测试历史
              </h3>
              
              {testHistory.length > 0 ? (
                <div className="space-y-3">
                  {testHistory.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {entry.totalTests} 个URL
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(entry.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="text-green-600">
                          ✅ {entry.successfulTests}
                        </span>
                        <span className="text-red-600">
                          ❌ {entry.failedTests}
                        </span>
                        <span className="text-gray-500">
                          {Math.round((entry.successfulTests / entry.totalTests) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无测试历史</p>
                </div>
              )}
            </div>

            {/* 快速操作 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                快速操作
              </h3>
              
              <div className="space-y-3">
                <button className="w-full flex items-center space-x-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">导入URL列表</span>
                </button>
                
                <button className="w-full flex items-center space-x-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                  <span className="text-sm">导出测试模板</span>
                </button>
                
                <button className="w-full flex items-center space-x-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm">分享测试配置</span>
                </button>
                
                <button className="w-full flex items-center space-x-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-sm">重置所有设置</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchTestPage;
