import React from 'react';
import { ChevronDown, Download, FileText, Image, Table } from 'lucide-react';
import { useState } from 'react';

// 导出格式配置
export interface ExportFormat {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  extension: string;
  mimeType: string;
}

// 预定义的导出格式
export const EXPORT_FORMATS: Record<string, ExportFormat> = {
  json: {
    key: 'json',
    label: 'JSON',
    icon: FileText,
    description: '结构化数据格式',
    extension: 'json',
    mimeType: 'application/json'
  },
  csv: {
    key: 'csv',
    label: 'CSV',
    icon: Table,
    description: '表格数据格式',
    extension: 'csv',
    mimeType: 'text/csv'
  },
  html: {
    key: 'html',
    label: 'HTML',
    icon: FileText,
    description: '网页报告格式',
    extension: 'html',
    mimeType: 'text/html'
  },
  pdf: {
    key: 'pdf',
    label: 'PDF',
    icon: FileText,
    description: '便携文档格式',
    extension: 'pdf',
    mimeType: 'application/pdf'
  },
  png: {
    key: 'png',
    label: 'PNG',
    icon: Image,
    description: '图片格式',
    extension: 'png',
    mimeType: 'image/png'
  }
};

// 导出数据接口
export interface ExportData {
  filename?: string;
  data: any;
  metadata?: {
    title?: string;
    description?: string;
    timestamp?: string;
    version?: string;
  };
}

// 组件属性接口
export interface UnifiedExportButtonProps {
  data: ExportData;
  formats?: string[]; // 支持的格式列表
  onExport?: (format: string, data: ExportData) => void;
  onExportStart?: (format: string) => void;
  onExportComplete?: (format: string, success: boolean) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  showDropdown?: boolean;
  defaultFormat?: string;
}

// 统一导出按钮组件
export const UnifiedExportButton: React.FC<UnifiedExportButtonProps> = ({
  data,
  formats = ['json', 'csv'],
  onExport,
  onExportStart,
  onExportComplete,
  className = '',
  size = 'md',
  variant = 'outline',
  disabled = false,
  loading = false,
  showDropdown = true,
  defaultFormat = 'json'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 样式配置
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600',
    outline: 'border border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // 处理导出
  const handleExport = async (format: string) => {
    if (disabled || isExporting) return;

    try {
      setIsExporting(true);
      onExportStart?.(format);

      if (onExport) {
        // 使用自定义导出处理器
        await onExport(format, data);
      } else {
        // 使用默认导出逻辑
        await defaultExportHandler(format, data);
      }

      onExportComplete?.(format, true);
    } catch (error) {
      console.error('Export failed:', error);
      onExportComplete?.(format, false);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  // 默认导出处理器
  const defaultExportHandler = async (format: string, exportData: ExportData) => {
    const formatConfig = EXPORT_FORMATS[format];
    if (!formatConfig) {
      throw new Error(`Unsupported format: ${format}`);
    }

    let content: string;

    /**

     * switch功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
    const filename = exportData.filename || `export-${Date.now()}`;

    switch (format) {
      case 'json':
        content = JSON.stringify({
          ...exportData.data,
          metadata: {
            exportedAt: new Date().toISOString(),
            format: 'json',
            ...exportData.metadata
          }
        }, null, 2);
        break;

      case 'csv':
        content = convertToCSV(exportData.data);
        break;

      case 'html':
        content = generateHTMLReport(exportData);
        break;

      default:
        throw new Error(`Default handler not implemented for format: ${format}`);
    }

    // 创建并下载文件
    const blob = new Blob([content], { type: formatConfig.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${formatConfig.extension}`;
    document.body.appendChild(a);
    a?.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 转换为CSV格式
  const convertToCSV = (data: any): string => {
    if (Array.isArray(data)) {
      if (data.length === 0) return '';

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data?.map(row =>
          headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',')
              ? `"${value}"`
              : value;
          }).join(',')
        )
      ].join('\n');

      return csvContent;
    } else {
      // 对象转换为键值对CSV
      return Object.entries(data)
        .map(([key, value]) => `${key},${value}`)
        .join('\n');
    }
  };

  // 生成HTML报告
  const generateHTMLReport = (exportData: ExportData): string => {
    const { data, metadata } = exportData;
    const title = metadata?.title || '数据报告';
    const timestamp = metadata?.timestamp || new Date().toLocaleString('zh-CN');

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; color: #111827; }
        .timestamp { color: #6b7280; margin-top: 8px; }
        .content { line-height: 1.6; }
        pre { background: #f9fafb; padding: 16px; border-radius: 8px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">${title}</div>
        <div class="timestamp">生成时间: ${timestamp}</div>
    </div>
    <div class="content">
        <pre>${JSON.stringify(data, null, 2)}</pre>
    </div>
</body>
</html>`;
  };

  // 获取可用格式
  const availableFormats = formats?.map(key => EXPORT_FORMATS[key]).filter(Boolean);

  // 单个按钮模式
  if (!showDropdown || availableFormats.length === 1) {
    const format = availableFormats[0] || EXPORT_FORMATS[defaultFormat];
    const IconComponent = format.icon;

    return (
      <button
        type="button"
        onClick={() => handleExport(format.key)}
        disabled={disabled || isExporting}
        className={`
          inline-flex items-center space-x-2 rounded-lg transition-colors
          ${sizeClasses[size]} ${variantClasses[variant]} ${className}
          ${disabled || isExporting ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title={`导出${format.label}格式`}
      >
        {isExporting ? (
          <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${iconSizes[size]}`} />
        ) : (
          <IconComponent className={iconSizes[size]} />
        )}
        <span>{loading || isExporting ? '导出中...' : `导出${format.label}`}</span>
      </button>
    );
  }

  // 下拉菜单模式
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        className={`
          inline-flex items-center space-x-2 rounded-lg transition-colors
          ${sizeClasses[size]} ${variantClasses[variant]} ${className}
          ${disabled || isExporting ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <Download className={iconSizes[size]} />
        <span>{isExporting ? '导出中...' : '导出数据'}</span>
        <ChevronDown className={`${iconSizes[size]} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {availableFormats.map((format) => {
              const IconComponent = format.icon;
              return (
                <button
                  key={format.key}
                  type="button"
                  onClick={() => handleExport(format.key)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center space-x-3"
                >
                  <IconComponent className="w-4 h-4" />
                  <div>
                    <div className="font-medium">{format.label}</div>
                    <div className="text-xs text-gray-400">{format.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 点击外部关闭下拉菜单 */}
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
