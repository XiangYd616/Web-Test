import { BarChart3, Bug, CheckCircle, Database, Plus, RefreshCw, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { dataAnalysisService } from '../../services/analytics';
import { monitoringService } from '../../services/monitoring';
import { TestDataGenerator } from '../../utils/testDataGenerator';

const DebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const generateTestData = () => {
    try {
      const records = TestDataGenerator.generateSampleTestRecords(50);
      TestDataGenerator.saveTestDataToLocalStorage(records);
      addLog(`生成并保存了 ${records.length} 条测试记录`);
    } catch (error) {
      addLog(`生成测试数据失败: ${error}`);
    }
  };

  const clearAllData = () => {
    try {
      TestDataGenerator.clearAllTestData();
      addLog('所有数据已清除');
    } catch (error) {
      addLog(`清除数据失败: ${error}`);
    }
  };

  const testMonitoringService = async () => {
    try {
      addLog('测试监控服务...');
      const sites = await monitoringService.getSites();
      addLog(`获取到 ${sites.length} 个监控站点`);

      const stats = monitoringService.getMonitoringStats();
      addLog(`监控统计: ${JSON.stringify(stats)}`);
    } catch (error) {
      addLog(`监控服务测试失败: ${error}`);
    }
  };

  const testAnalyticsService = async () => {
    try {
      addLog('测试分析服务...');
      const analytics = await dataAnalysisService.getAnalyticsData(30);
      addLog(`分析数据: 总测试 ${analytics.totalTests}, 成功率 ${analytics.successRate.toFixed(1)}%`);

      const performance = await dataAnalysisService.getPerformanceAnalysis();
      addLog(`性能分析: FCP ${performance.coreWebVitals.fcp.average.toFixed(2)}s`);
    } catch (error) {
      addLog(`分析服务测试失败: ${error}`);
    }
  };

  const addTestSite = async () => {
    try {
      addLog('添加测试站点...');
      const site = await monitoringService.addSite({
        name: '测试站点',
        url: 'https://www.google.com',
        region: '测试',
        enabled: true
      });
      addLog(`成功添加站点: ${site.name} (${site.url})`);
    } catch (error) {
      addLog(`添加站点失败: ${error}`);
    }
  };

  const getDataStats = () => {
    try {
      const stats = TestDataGenerator.getDataStatistics();
      addLog(`数据统计: 总记录 ${stats.totalRecords}, 类型分布: ${JSON.stringify(stats.byType)}`);
    } catch (error) {
      addLog(`获取统计失败: ${error}`);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg z-50"
        title="调试面板"
      >
        <Bug className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-white font-semibold flex items-center">
          <Bug className="w-4 h-4 mr-2" />
          调试面板
        </h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={generateTestData}
            className="flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            type="button">
            <Database className="w-4 h-4" />
            <span>生成数据</span>
          </button>

          <button
            onClick={clearAllData}
            className="flex items-center justify-center space-x-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
            type="button">
            <Trash2 className="w-4 h-4" />
            <span>清除数据</span>
          </button>

          <button
            onClick={testMonitoringService}
            className="flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
            type="button">
            <RefreshCw className="w-4 h-4" />
            <span>测试监控</span>
          </button>

          <button
            onClick={testAnalyticsService}
            className="flex items-center justify-center space-x-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
            type="button">
            <CheckCircle className="w-4 h-4" />
            <span>测试分析</span>
          </button>

          <button
            onClick={addTestSite}
            className="flex items-center justify-center space-x-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm"
            type="button">
            <Plus className="w-4 h-4" />
            <span>添加站点</span>
          </button>

          <button
            onClick={getDataStats}
            className="flex items-center justify-center space-x-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
            type="button">
            <BarChart3 className="w-4 h-4" />
            <span>数据统计</span>
          </button>
        </div>

        <div className="border-t border-gray-700 pt-3">
          <h4 className="text-gray-300 text-sm font-medium mb-2">调试日志</h4>
          <div className="bg-gray-800 rounded p-2 h-32 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-xs">暂无日志</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-xs text-gray-300 mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setLogs([])}
          className="w-full px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm"
        >
          清除日志
        </button>
      </div>
    </div>
  );
};

export default DebugPanel;
