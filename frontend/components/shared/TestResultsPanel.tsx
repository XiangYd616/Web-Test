/**
 * 共享测试结果展示组件
 * 为各个独立测试页面提供统一的结果展示基础设施
 */

import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Download,
  Eye,
  EyeOff,
  Info,
  RefreshCw,
  Share2,
  XCircle,
} from 'lucide-react';
import React, { ReactNode, useState } from 'react';

export interface TestMetric {
  key: string;
  label: string;
  value: string | number;
  unit?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  description?: string;
}

export interface TestResultSection {
  title: string;
  type: 'metrics' | 'table' | 'text' | 'custom';
  data: any;
  renderer?: (data: any) => ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface TestResultsPanelProps {
  title?: string;
  result: any;
  sections?: TestResultSection[];
  metrics?: TestMetric[];
  onRetest?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  showRawData?: boolean;
  children?: ReactNode;
  className?: string;
}

/**
 * 共享测试结果面板
 * 提供统一的结果展示界面，支持多种展示格式
 */
export const TestResultsPanel: React.FC<TestResultsPanelProps> = ({
  title = '测试结果',
  result,
  sections = [],
  metrics = [],
  onRetest,
  onDownload,
  onShare,
  showRawData = false,
  children,
  className = '',
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections?.filter(s => s?.defaultExpanded !== false).map(s => s?.title))
  );
  const [showRaw, setShowRaw] = useState(false);

  // 切换章节展开状态
  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionTitle)) {
        newSet.delete(sectionTitle);
      } else {
        newSet.add(sectionTitle);
      }
      return newSet;
    });
  };

  // 获取状态图标
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  // 获取状态颜色类
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      case 'info':
      default:
        return 'text-blue-400';
    }
  };

  // 渲染指标卡片
  const renderMetrics = () => {
    if (metrics.length === 0) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {metrics?.map(metric => (
          <div
            key={metric.key}
            className="themed-bg-secondary rounded-lg p-4 border themed-border-secondary"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">{metric.label}</span>
              {metric.status && getStatusIcon(metric.status)}
            </div>
            <div className="flex items-baseline space-x-1">
              <span className={`text-2xl font-bold ${getStatusColor(metric.status)}`}>
                {metric.value}
              </span>
              {metric.unit && <span className="text-sm text-gray-400">{metric.unit}</span>}
            </div>
            {metric.description && (
              <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  // 渲染结果章节
  const renderSection = (section: TestResultSection) => {
    const isExpanded = expandedSections.has(section.title);

    return (
      <div
        key={section.title}
        className="themed-bg-secondary rounded-lg border themed-border-secondary"
      >
        <button
          type="button"
          onClick={() => section.collapsible && toggleSection(section.title)}
          className={`w-full px-4 py-3 flex items-center justify-between text-left ${
            section.collapsible ? 'hover:bg-gray-700/50 cursor-pointer' : 'cursor-default'
          } transition-colors`}
        >
          <h4 className="font-medium themed-text-primary">{section.title}</h4>
          {section.collapsible && (
            <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          )}
        </button>

        {(!section.collapsible || isExpanded) && (
          <div className="px-4 pb-4 border-t themed-border-secondary">
            {section.renderer ? (
              section.renderer(section.data)
            ) : (
              <div className="mt-3">
                {section.type === 'table' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b themed-border-secondary">
                          {Object.keys(section.data[0] || {}).map(key => (
                            <th key={key} className="text-left py-2 px-3 text-gray-400 font-medium">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.data.map((row: unknown, index: number) => (
                          <tr key={index} className="border-b themed-border-secondary">
                            {Object.values(row as any).map((value: unknown, cellIndex) => (
                              <td key={cellIndex} className="py-2 px-3 text-gray-300">
                                {String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {section.type === 'text' && (
                  <div className="mt-3 text-gray-300 whitespace-pre-wrap">{section.data}</div>
                )}

                {section.type === 'metrics' && (
                  <div className="mt-3 space-y-2">
                    {Object.entries(section.data).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-gray-400">{key}:</span>
                        <span className="text-gray-300 font-mono">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`themed-bg-card rounded-lg shadow-xl border themed-border-primary p-6 ${className}`}
    >
      {/* 结果头部 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold themed-text-primary flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-green-400" />
          {title}
        </h3>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-2">
          {showRawData && (
            <button
              type="button"
              onClick={() => setShowRaw(!showRaw)}
              className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
              title={showRaw ? '隐藏原始数据' : '显示原始数据'}
            >
              {showRaw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}

          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
              title="分享结果"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
              title="下载报告"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {onRetest && (
            <button
              type="button"
              onClick={onRetest}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>重新测试</span>
            </button>
          )}
        </div>
      </div>

      {/* 指标展示 */}
      {renderMetrics()}

      {/* 结果章节 */}
      <div className="space-y-4">{sections?.map(renderSection)}</div>

      {/* 自定义内容 */}
      {children && <div className="mt-6 pt-6 border-t themed-border-secondary">{children}</div>}

      {/* 原始数据展示 */}
      {showRawData && showRaw && (
        <div className="mt-6 pt-6 border-t themed-border-secondary">
          <h4 className="text-md font-medium themed-text-primary mb-3">原始数据</h4>
          <pre className="text-sm text-gray-300 bg-gray-800 p-4 rounded-lg overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TestResultsPanel;
