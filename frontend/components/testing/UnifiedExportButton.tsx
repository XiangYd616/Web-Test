/**
 * 统一导出按钮组件
 * 为所有测试页面提供标准化的导出功能
 */

import { CheckCircle, Download, FileText, Loader2, Settings, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { TestType } from '../../types';
import type { ExportFormat, ExportOptions } from '../../services/unifiedExportManager';
import { useExportManager } from '../../services/unifiedExportManager';

interface UnifiedExportButtonProps {
  testType: TestType;
  testData: any;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const UnifiedExportButton: React.FC<UnifiedExportButtonProps> = ({
  testType,
  testData,
  disabled = false,
  className = '',
  variant = 'outline',
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    includeConfig: true,
    includeResults: true,
    includeCharts: false,
    includeRecommendations: true,
    includeTimestamp: true
  });

  const { createExport, getTask, downloadExport } = useExportManager();

  // 监听导出进度
  useEffect(() => {
    if (!currentTaskId) return;

    const checkProgress = () => {
      const task = getTask(currentTaskId);
      if (task) {
        setExportProgress(task.progress);
        
        if (task.status === 'completed') {
          setIsExporting(false);
          downloadExport(currentTaskId);
          setCurrentTaskId(null);
          setExportProgress(0);
        } else if (task.status === 'failed') {
          setIsExporting(false);
          setCurrentTaskId(null);
          setExportProgress(0);
          alert(`导出失败: ${task.error}`);
        }
      }
    };

    const interval = setInterval(checkProgress, 500);
    return () => clearInterval(interval);
  }, [currentTaskId, getTask, downloadExport]);

  const handleExport = async () => {
    if (!testData) {
      alert('没有可导出的测试数据');
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress(0);
      
      const taskId = await createExport(testType, testData, exportOptions);
      setCurrentTaskId(taskId);
      setIsOpen(false);
    } catch (error) {
      setIsExporting(false);
      alert(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const formatOptions: { value: ExportFormat; label: string; description: string }[] = [
    { value: 'json', label: 'JSON', description: '结构化数据格式，适合程序处理' },
    { value: 'csv', label: 'CSV', description: '表格数据格式，适合Excel打开' },
    { value: 'html', label: 'HTML', description: '网页报告格式，适合查看和分享' },
    { value: 'pdf', label: 'PDF', description: 'PDF报告格式，适合打印和存档' },
    { value: 'xml', label: 'XML', description: 'XML数据格式，适合系统集成' }
  ];

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    const variantClasses = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
      outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:ring-blue-500'
    };

    const disabledClasses = disabled || isExporting 
      ? 'opacity-50 cursor-not-allowed' 
      : 'cursor-pointer';

    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabledClasses} ${className}`;
  };

  if (isExporting) {
    return (
      <div className="inline-flex items-center space-x-2">
        <button
          disabled
          className={getButtonClasses()}
        >
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          <span>导出中... {exportProgress}%</span>
        </button>
        {exportProgress > 0 && (
          <div className="w-32 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || !testData}
        className={getButtonClasses()}
        title="导出测试结果"
      >
        <Download className="w-4 h-4 mr-2" />
        <span>导出</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">导出设置</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 导出格式选择 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                导出格式
              </label>
              <div className="space-y-2">
                {formatOptions.map((option) => (
                  <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value={option.value}
                      checked={exportOptions.format === option.value}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        format: e.target.value as ExportFormat 
                      }))}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 导出选项 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                包含内容
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeConfig}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeConfig: e.target.checked 
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">测试配置</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeResults}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeResults: e.target.checked 
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">测试结果</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeCharts}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeCharts: e.target.checked 
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">图表数据</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeRecommendations}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeRecommendations: e.target.checked 
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">优化建议</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeTimestamp}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeTimestamp: e.target.checked 
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">时间戳</span>
                </label>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                取消
              </button>
              <button
                onClick={handleExport}
                disabled={!exportOptions.includeResults && !exportOptions.includeConfig}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 mr-2" />
                开始导出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 背景遮罩 */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default UnifiedExportButton;
