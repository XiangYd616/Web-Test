import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Download,
  File,
  FileText,
  Folder,
  Upload,
  X
} from 'lucide-react';
import React, { useRef, useState } from 'react';

interface ImportTask {
  id: string;
  fileName: string;
  fileSize: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  recordsImported?: number;
  errors?: string[];
}

interface ExportTask {
  id: string;
  name: string;
  format: 'json' | 'csv' | 'excel';
  status: 'preparing' | 'exporting' | 'completed' | 'failed';
  progress: number;
  recordCount?: number;
  downloadUrl?: string;
}

const ImportExport: React.FC = () => {
  const [importTasks, setImportTasks] = useState<ImportTask[]>([]);
  const [exportTasks, setExportTasks] = useState<ExportTask[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    format: 'json' as 'json' | 'csv' | 'excel',
    dateRange: '30',
    testTypes: [] as string[],
    includeConfig: true,
    includeResults: true
  });
  const [showExportConfig, setShowExportConfig] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach(file => {
      const task: ImportTask = {
        id: Date.now().toString() + Math.random(),
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        status: 'uploading',
        progress: 0
      };

      setImportTasks(prev => [...prev, task]);

      // 模拟文件上传和处理过程
      simulateImport(task.id);
    });
  };

  const simulateImport = (taskId: string) => {
    // 模拟上传进度
    const uploadInterval = setInterval(() => {
      setImportTasks(prev => prev.map(task => {
        if (task.id === taskId && task.status === 'uploading') {
          const newProgress = Math.min(task.progress + Math.random() * 20, 100);
          if (newProgress >= 100) {
            clearInterval(uploadInterval);
            // 开始处理
            setTimeout(() => {
              setImportTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, status: 'processing', progress: 0 } : t
              ));
              simulateProcessing(taskId);
            }, 500);
            return { ...task, progress: 100 };
          }
          return { ...task, progress: newProgress };
        }
        return task;
      }));
    }, 200);
  };

  const simulateProcessing = (taskId: string) => {
    const processInterval = setInterval(() => {
      setImportTasks(prev => prev.map(task => {
        if (task.id === taskId && task.status === 'processing') {
          const newProgress = Math.min(task.progress + Math.random() * 15, 100);
          if (newProgress >= 100) {
            clearInterval(processInterval);
            // 完成处理
            const success = Math.random() > 0.2; // 80% 成功率
            return {
              ...task,
              status: success ? 'completed' : 'failed',
              progress: 100,
              recordsImported: success ? Math.floor(Math.random() * 100) + 10 : undefined,
              errors: success ? undefined : ['数据格式不正确', '缺少必需字段']
            };
          }
          return { ...task, progress: newProgress };
        }
        return task;
      }));
    }, 300);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const startExport = () => {
    const task: ExportTask = {
      id: Date.now().toString(),
      name: `测试数据导出_${new Date().toLocaleDateString('zh-CN')}`,
      format: exportConfig.format,
      status: 'preparing',
      progress: 0
    };

    setExportTasks(prev => [...prev, task]);
    setShowExportConfig(false);

    // 模拟导出过程
    simulateExport(task.id);
  };

  const simulateExport = (taskId: string) => {
    // 准备阶段
    setTimeout(() => {
      setExportTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, status: 'exporting', recordCount: Math.floor(Math.random() * 500) + 100 } : task
      ));

      // 导出进度
      const exportInterval = setInterval(() => {
        setExportTasks(prev => prev.map(task => {
          if (task.id === taskId && task.status === 'exporting') {
            const newProgress = Math.min(task.progress + Math.random() * 10, 100);
            if (newProgress >= 100) {
              clearInterval(exportInterval);
              return {
                ...task,
                status: 'completed',
                progress: 100,
                downloadUrl: '#'
              };
            }
            return { ...task, progress: newProgress };
          }
          return task;
        }));
      }, 200);
    }, 1000);
  };

  const removeTask = (taskId: string, type: 'import' | 'export') => {
    if (type === 'import') {
      setImportTasks(prev => prev.filter(task => task.id !== taskId));
    } else {
      setExportTasks(prev => prev.filter(task => task.id !== taskId));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/20';
      case 'failed': return 'text-red-400 bg-red-500/20';
      case 'uploading':
      case 'processing':
      case 'preparing':
      case 'exporting': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <AlertTriangle className="w-4 h-4" />;
      case 'uploading':
      case 'processing':
      case 'preparing':
      case 'exporting': return <Clock className="w-4 h-4 animate-spin" />;
      default: return <File className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">数据导入导出</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 数据导入 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Upload className="w-6 h-6 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">数据导入</h3>
          </div>

          {/* 文件上传区域 */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-600 hover:border-gray-500'
              }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Database className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">拖拽文件到此处或点击选择文件</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              选择文件
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".json,.csv,.xlsx"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              aria-label="选择要导入的文件"
            />
            <div className="text-sm text-gray-500 mt-4">
              支持格式：JSON, CSV, Excel (.xlsx)
            </div>
          </div>

          {/* 导入任务列表 */}
          {importTasks.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-300 mb-3">导入任务</h4>
              <div className="space-y-3">
                {importTasks.map((task) => (
                  <div key={task.id} className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-white text-sm font-medium">{task.fileName}</div>
                          <div className="text-gray-400 text-xs">{task.fileSize}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusIcon(task.status)}
                          <span>
                            {task.status === 'uploading' ? '上传中' :
                              task.status === 'processing' ? '处理中' :
                                task.status === 'completed' ? '已完成' : '失败'}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeTask(task.id, 'import')}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          aria-label="删除导入任务"
                          title="删除任务"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 进度条 */}
                    {(task.status === 'uploading' || task.status === 'processing') && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                          <span>{task.status === 'uploading' ? '上传进度' : '处理进度'}</span>
                          <span>{Math.round(task.progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* 结果信息 */}
                    {task.status === 'completed' && task.recordsImported && (
                      <div className="text-green-400 text-sm">
                        成功导入 {task.recordsImported} 条记录
                      </div>
                    )}

                    {task.status === 'failed' && task.errors && (
                      <div className="text-red-400 text-sm">
                        <div>导入失败：</div>
                        <ul className="list-disc list-inside mt-1">
                          {task.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 数据导出 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Download className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-semibold text-white">数据导出</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowExportConfig(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>开始导出</span>
            </button>
          </div>

          {/* 快速导出选项 */}
          <div className="grid grid-cols-1 gap-3 mb-6">
            <button
              type="button"
              onClick={() => {
                setExportConfig(prev => ({ ...prev, format: 'json' }));
                setShowExportConfig(true);
              }}
              className="flex items-center justify-between p-4 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-blue-400" />
                <div className="text-left">
                  <div className="text-white font-medium">JSON格式</div>
                  <div className="text-gray-400 text-sm">完整的测试数据和配置</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-gray-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                setExportConfig(prev => ({ ...prev, format: 'csv' }));
                setShowExportConfig(true);
              }}
              className="flex items-center justify-between p-4 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-green-400" />
                <div className="text-left">
                  <div className="text-white font-medium">CSV格式</div>
                  <div className="text-gray-400 text-sm">表格数据，便于分析</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-gray-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                setExportConfig(prev => ({ ...prev, format: 'excel' }));
                setShowExportConfig(true);
              }}
              className="flex items-center justify-between p-4 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <div className="text-white font-medium">Excel格式</div>
                  <div className="text-gray-400 text-sm">包含图表的详细报告</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* 导出任务列表 */}
          {exportTasks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">导出任务</h4>
              <div className="space-y-3">
                {exportTasks.map((task) => (
                  <div key={task.id} className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Folder className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-white text-sm font-medium">{task.name}</div>
                          <div className="text-gray-400 text-xs">
                            {task.format.toUpperCase()} • {task.recordCount ? `${task.recordCount} 条记录` : '准备中...'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusIcon(task.status)}
                          <span>
                            {task.status === 'preparing' ? '准备中' :
                              task.status === 'exporting' ? '导出中' :
                                task.status === 'completed' ? '已完成' : '失败'}
                          </span>
                        </span>
                        {task.status === 'completed' && task.downloadUrl && (
                          <button
                            type="button"
                            className="p-1 text-green-400 hover:text-green-300 transition-colors"
                            aria-label="下载导出文件"
                            title="下载文件"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeTask(task.id, 'export')}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          aria-label="删除导出任务"
                          title="删除任务"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 进度条 */}
                    {(task.status === 'preparing' || task.status === 'exporting') && (
                      <div>
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                          <span>{task.status === 'preparing' ? '准备数据' : '导出进度'}</span>
                          <span>{Math.round(task.progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 导出配置模态框 */}
      {showExportConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">导出配置</h3>
              <button
                type="button"
                onClick={() => setShowExportConfig(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                aria-label="关闭导出配置对话框"
                title="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="export-format-select" className="block text-sm font-medium text-gray-300 mb-2">导出格式</label>
                <select
                  id="export-format-select"
                  value={exportConfig.format}
                  onChange={(e) => setExportConfig(prev => ({ ...prev, format: e.target.value as any }))}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  aria-label="选择导出格式"
                >
                  <option value="json">JSON格式</option>
                  <option value="csv">CSV格式</option>
                  <option value="excel">Excel格式</option>
                </select>
              </div>

              <div>
                <label htmlFor="export-date-range-select" className="block text-sm font-medium text-gray-300 mb-2">时间范围</label>
                <select
                  id="export-date-range-select"
                  value={exportConfig.dateRange}
                  onChange={(e) => setExportConfig(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  aria-label="选择导出时间范围"
                >
                  <option value="7">最近7天</option>
                  <option value="30">最近30天</option>
                  <option value="90">最近90天</option>
                  <option value="all">全部数据</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">导出内容</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={exportConfig.includeConfig}
                      onChange={(e) => setExportConfig(prev => ({ ...prev, includeConfig: e.target.checked }))}
                      className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
                    />
                    <span className="text-gray-300">包含测试配置</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={exportConfig.includeResults}
                      onChange={(e) => setExportConfig(prev => ({ ...prev, includeResults: e.target.checked }))}
                      className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
                    />
                    <span className="text-gray-300">包含测试结果</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowExportConfig(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={startExport}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                开始导出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportExport;
