/**
 * 批量操作面板
 * 提供批量测试、批量导出、批量管理等功能的用户界面
 */

import { AlertCircle, CheckCircle, Clock, Download, Minus, Play, Plus, RotateCcw, Settings, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
// 暂时注释掉缺失的导入
// import { //   batchOperationService, //   BatchTestConfig, //   BatchExportConfig, //   BatchOperation
// } from '../../services/batch/batchOperationService';

interface BatchOperationPanelProps {
  onClose?: () => void;
}

const BatchOperationPanel: React.FC<BatchOperationPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'test' | 'export' | 'operations'>('test');
  const [operations, setOperations] = useState<BatchOperation[]>([]);
  const [loading, setLoading] = useState(false);

  // 批量测试配置
  const [testConfig, setTestConfig] = useState<BatchTestConfig>({
    urls: [''],
    testTypes: ['performance'],
    options: {
      concurrent: 3,
      timeout: 300000,
      retryAttempts: 2,
      notifyOnComplete: true,
      exportResults: false
    }
  });

  // 批量导出配置
  const [exportConfig, setExportConfig] = useState<BatchExportConfig>({
    dataType: 'test-results',
    filters: {},
    format: 'json',
    options: {
      includeDetails: true,
      compressOutput: true,
      splitByType: false
    }
  });

  useEffect(() => {
    loadOperations();

    // 定期刷新操作状态
    const interval = setInterval(loadOperations, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadOperations = () => {
    const allOperations = batchOperationService.getAllOperations();
    setOperations(allOperations);
  };

  const handleStartBatchTest = async () => {
    if (testConfig.urls.filter(url => url.trim()).length === 0) {
      alert('请至少添加一个URL');
      return;
    }

    setLoading(true);
    try {
      const operationId = await batchOperationService.startBatchTest({
        ...testConfig,
        urls: testConfig.urls.filter(url => url.trim())
      });

      alert(`批量测试已启动，操作ID: ${operationId}`);
      setActiveTab('operations');
      loadOperations();
    } catch (error) {
      console.error('启动批量测试失败:', error);
      alert('启动批量测试失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartBatchExport = async () => {
    setLoading(true);
    try {
      const operationId = await batchOperationService.startBatchExport(exportConfig);

      alert(`批量导出已启动，操作ID: ${operationId}`);
      setActiveTab('operations');
      loadOperations();
    } catch (error) {
      console.error('启动批量导出失败:', error);
      alert('启动批量导出失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOperation = async (operationId: string) => {
    if (confirm('确定要取消这个操作吗？')) {
      const success = await batchOperationService.cancelOperation(operationId);
      if (success) {
        loadOperations();
      }
    }
  };

  const handleDownloadResults = async (operationId: string) => {
    try {
      await batchOperationService.downloadExportFile(operationId);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败: ' + (error as Error).message);
    }
  };

  const addUrl = () => {
    setTestConfig(prev => ({
      ...prev,
      urls: [...prev.urls, '']
    }));
  };

  const removeUrl = (index: number) => {
    setTestConfig(prev => ({
      ...prev,
      urls: prev.urls.filter((_, i) => i !== index)
    }));
  };

  const updateUrl = (index: number, value: string) => {
    setTestConfig(prev => ({
      ...prev,
      urls: prev.urls.map((url, i) => i === index ? value : url)
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <RotateCcw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'cancelled':
        return <X className="w-5 h-5 text-gray-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'running':
        return 'text-blue-400';
      case 'cancelled':
        return 'text-gray-400';
      default:
        return 'text-yellow-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">批量操作中心</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* 标签页 */}
        <div className="flex border-b border-gray-700">
          {[
            { key: 'test', label: '批量测试', icon: Play },
            { key: 'export', label: '批量导出', icon: Download },
            { key: 'operations', label: '操作管理', icon: Settings }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 transition-colors ${activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* 批量测试 */}
          {activeTab === 'test' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-white font-medium mb-3">测试URL列表</h3>
                <div className="space-y-2">
                  {testConfig.urls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateUrl(index, e.target.value)}
                        placeholder="输入要测试的URL"
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                      />
                      {testConfig.urls.length > 1 && (
                        <button
                          onClick={() => removeUrl(index)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addUrl}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    添加URL
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-white font-medium mb-3">测试类型</h3>
                <div className="grid grid-cols-2 gap-2">
                  {['performance', 'seo', 'security', 'accessibility'].map(type => (
                    <label key={type} className="flex items-center gap-2 text-gray-300">
                      <input
                        type="checkbox"
                        checked={testConfig.testTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTestConfig(prev => ({
                              ...prev,
                              testTypes: [...prev.testTypes, type]
                            }));
                          } else {
                            setTestConfig(prev => ({
                              ...prev,
                              testTypes: prev.testTypes.filter(t => t !== type)
                            }));
                          }
                        }}
                        className="rounded"
                      />
                      {type.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">并发数</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={testConfig.options.concurrent}
                    onChange={(e) => setTestConfig(prev => ({
                      ...prev,
                      options: { ...prev.options, concurrent: parseInt(e.target.value) }
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-2">超时时间(秒)</label>
                  <input
                    type="number"
                    min="30"
                    max="600"
                    value={testConfig.options.timeout! / 1000}
                    onChange={(e) => setTestConfig(prev => ({
                      ...prev,
                      options: { ...prev.options, timeout: parseInt(e.target.value) * 1000 }
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={testConfig.options.notifyOnComplete}
                    onChange={(e) => setTestConfig(prev => ({
                      ...prev,
                      options: { ...prev.options, notifyOnComplete: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  完成时通知
                </label>
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={testConfig.options.exportResults}
                    onChange={(e) => setTestConfig(prev => ({
                      ...prev,
                      options: { ...prev.options, exportResults: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  自动导出结果
                </label>
              </div>

              <button
                onClick={handleStartBatchTest}
                disabled={loading}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                {loading ? '启动中...' : '开始批量测试'}
              </button>
            </div>
          )}

          {/* 批量导出 */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div>
                <label className="block text-gray-300 text-sm mb-2">数据类型</label>
                <select
                  value={exportConfig.dataType}
                  onChange={(e) => setExportConfig(prev => ({
                    ...prev,
                    dataType: e.target.value as any
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="test-results">测试结果</option>
                  <option value="test-history">测试历史</option>
                  <option value="analytics">分析数据</option>
                  <option value="reports">报告数据</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">导出格式</label>
                <select
                  value={exportConfig.format}
                  onChange={(e) => setExportConfig(prev => ({
                    ...prev,
                    format: e.target.value as any
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">开始日期</label>
                  <input
                    type="date"
                    value={exportConfig.filters.startDate || ''}
                    onChange={(e) => setExportConfig(prev => ({
                      ...prev,
                      filters: { ...prev.filters, startDate: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-2">结束日期</label>
                  <input
                    type="date"
                    value={exportConfig.filters.endDate || ''}
                    onChange={(e) => setExportConfig(prev => ({
                      ...prev,
                      filters: { ...prev.filters, endDate: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={exportConfig.options.includeDetails}
                    onChange={(e) => setExportConfig(prev => ({
                      ...prev,
                      options: { ...prev.options, includeDetails: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  包含详细信息
                </label>
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={exportConfig.options.compressOutput}
                    onChange={(e) => setExportConfig(prev => ({
                      ...prev,
                      options: { ...prev.options, compressOutput: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  压缩输出文件
                </label>
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={exportConfig.options.splitByType}
                    onChange={(e) => setExportConfig(prev => ({
                      ...prev,
                      options: { ...prev.options, splitByType: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  按类型分割文件
                </label>
              </div>

              <button
                onClick={handleStartBatchExport}
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                {loading ? '启动中...' : '开始批量导出'}
              </button>
            </div>
          )}

          {/* 操作管理 */}
          {activeTab === 'operations' && (
            <div className="space-y-4">
              {operations.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  暂无批量操作记录
                </div>
              ) : (
                operations.map(operation => (
                  <div key={operation.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(operation.status)}
                        <div>
                          <h4 className="text-white font-medium">
                            {operation.type === 'test' ? '批量测试' :
                              operation.type === 'export' ? '批量导出' : '批量删除'}
                          </h4>
                          <p className="text-gray-400 text-sm">ID: {operation.id}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {operation.status === 'running' && (
                          <button
                            onClick={() => handleCancelOperation(operation.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            取消
                          </button>
                        )}
                        {operation.status === 'completed' && operation.type === 'export' && (
                          <button
                            onClick={() => handleDownloadResults(operation.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            下载
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">状态:</span>
                        <span className={getStatusColor(operation.status)}>
                          {operation.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">进度:</span>
                        <span className="text-white">
                          {operation.completedItems}/{operation.totalItems} ({operation.progress.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${operation.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm text-gray-400">
                        <span>开始: {new Date(operation.startTime).toLocaleString()}</span>
                        {operation.endTime && (
                          <span>结束: {new Date(operation.endTime).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchOperationPanel;
