import { BarChart3, Database, Download, Grid, X, Zap } from 'lucide-react';
import { useState } from 'react';
import type { ComponentType, FC } from 'react';
import { createPortal } from 'react-dom';

// 导出类型定义
export interface ExportType {
  key: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  format: string;
  prefix: string;
  color: string;
}

// 导出模态框属性
export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  testType?: 'stress' | 'api' | 'performance';
  testId?: string;
  testName?: string;
  onExport: (type: string, data: any) => Promise<void>;
}

// 导出类型配置
const EXPORT_TYPES: ExportType[] = [
  {
    key: 'raw-data',
    title: '原始数据导出',
    description: '完整的JSON格式测试记录，包含所有原始数据，适用于数据备份和程序化处理',
    icon: Database,
    format: 'JSON',
    prefix: 'raw-data',
    color: 'blue'
  },
  {
    key: 'analysis-report',
    title: '分析报告导出',
    description: '包含图表、性能分析、建议的HTML格式报告，适用于展示和分享',
    icon: BarChart3,
    format: 'HTML',
    prefix: 'analysis-report',
    color: 'green'
  },
  {
    key: 'data-table',
    title: '数据表格导出',
    description: '核心性能指标的CSV格式表格，适用于Excel分析和统计处理',
    icon: Grid,
    format: 'CSV',
    prefix: 'data-table',
    color: 'purple'
  },
  {
    key: 'summary',
    title: '快速摘要导出',
    description: '关键指标的简化JSON格式，适用于快速查看和轻量级处理',
    icon: Zap,
    format: 'JSON',
    prefix: 'summary',
    color: 'orange'
  }
];

// 导出模态框组件
export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  data,
  testType = 'stress',
  testId,
  testName,
  onExport
}) => {
  const [exportingType, setExportingType] = useState<string | null>(null);

  // 处理导出
  const handleExport = async (exportType: ExportType) => {
    if (exportingType) return; // 防止重复点击

    try {
      setExportingType(exportType.key);
      await onExport(exportType.key, {
        ...data,
        exportType: exportType.key,
        testType,
        testId,
        testName
      });
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setExportingType(null);
    }
  };

  // 获取颜色类名
  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        hover: 'hover:border-blue-400/50 hover:bg-blue-500/20',
        icon: 'text-blue-400',
        button: 'bg-blue-600 hover:bg-blue-700 text-white'
      },
      green: {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        hover: 'hover:border-green-400/50 hover:bg-green-500/20',
        icon: 'text-green-400',
        button: 'bg-green-600 hover:bg-green-700 text-white'
      },
      purple: {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        hover: 'hover:border-purple-400/50 hover:bg-purple-500/20',
        icon: 'text-purple-400',
        button: 'bg-purple-600 hover:bg-purple-700 text-white'
      },
      orange: {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        hover: 'hover:border-orange-400/50 hover:bg-orange-500/20',
        icon: 'text-orange-400',
        button: 'bg-orange-600 hover:bg-orange-700 text-white'
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 模态框内容 */}
      <div className="relative bg-gray-900 rounded-xl border border-gray-700 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Download className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">导出选项</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <p className="text-gray-300 mb-6">
            选择适合您需求的导出格式。每种格式包含不同的数据内容，适用于不同的使用场景。
          </p>

          {/* 导出选项网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EXPORT_TYPES.map((exportType) => {
              const IconComponent = exportType.icon;
              const colors = getColorClasses(exportType.color);
              const isExporting = exportingType === exportType.key;

              return (
                <div
                  key={exportType.key}
                  className={`
                    p-4 rounded-lg border transition-all duration-200
                    ${colors.bg} ${colors.border} ${colors.hover}
                  `}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg bg-gray-800/50 ${colors.icon}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium text-white">
                          {exportType.title}
                        </h3>
                        <span className={`
                          px-2 py-1 text-xs font-medium rounded
                          ${colors.bg} ${colors.icon} border ${colors.border}
                        `}>
                          {exportType.format}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                        {exportType.description}
                      </p>
                      <button
                        onClick={() => handleExport(exportType)}
                        disabled={!!exportingType}
                        className={`
                          w-full px-4 py-2 rounded-lg font-medium transition-colors
                          ${colors.button}
                          ${exportingType && !isExporting ? 'opacity-50 cursor-not-allowed' : ''}
                          ${isExporting ? 'opacity-75' : ''}
                        `}
                      >
                        {isExporting ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>导出中...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <Download className="w-4 h-4" />
                            <span>导出 {exportType.format}</span>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ExportModal;
