/**
 * 可选的统一测试结果展示组件
 * 各个测试页面可以选择使用，不强制替换现有实现
 */

import React, { useState } from 'react';
import { 
  BarChart3, Download, Eye, EyeOff, FileText, Share2, 
  CheckCircle, XCircle, AlertTriangle, Info, Zap,
  Clock, Globe, Shield, Activity, TrendingUp
} from 'lucide-react';

// 测试结果接口
export interface TestResult {
  id: string;
  testType: string;
  url: string;
  status: 'completed' | 'failed' | 'partial';
  score?: number;
  startTime: Date;
  endTime: Date;
  duration: number;
  summary?: {
    [key: string]: any;
  };
  metrics?: {
    [key: string]: any;
  };
  issues?: Array<{
    type: 'error' | 'warning' | 'info';
    title: string;
    description: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }>;
  recommendations?: string[];
  rawData?: any;
}

// 结果展示属性
export interface TestResultsViewerProps {
  result: TestResult | null;
  loading?: boolean;
  error?: string;
  onExport?: (format: 'json' | 'csv' | 'pdf') => void;
  onShare?: () => void;
  onRetry?: () => void;
  showRawData?: boolean;
  customSections?: React.ReactNode;
  compact?: boolean;
}

/**
 * 可选的统一测试结果展示组件
 */
export const TestResultsViewer: React.FC<TestResultsViewerProps> = ({
  result,
  loading = false,
  error,
  onExport,
  onShare,
  onRetry,
  showRawData = false,
  customSections,
  compact = false
}) => {
  const [showDetails, setShowDetails] = useState(!compact);
  const [activeTab, setActiveTab] = useState<'summary' | 'metrics' | 'issues' | 'raw'>('summary');

  /**
   * 获取状态颜色
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'partial':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  /**
   * 获取分数颜色
   */
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  /**
   * 格式化持续时间
   */
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  /**
   * 导出结果
   */
  const handleExport = (format: 'json' | 'csv' | 'pdf') => {
    if (onExport && result) {
      onExport(format);
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            <span className="text-gray-300">正在加载测试结果...</span>
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">加载结果失败</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                重试
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 无结果状态
  if (!result) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400">暂无测试结果</h3>
            <p className="text-gray-500">运行测试后，结果将在这里显示</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
      {/* 结果标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <BarChart3 className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">测试结果</h3>
            <p className="text-gray-400 text-sm">
              {result.testType} - {new Date(result.endTime).toLocaleString()}
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-2">
          {!compact && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              title={showDetails ? '隐藏详情' : '显示详情'}
            >
              {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          
          {onShare && (
            <button
              onClick={onShare}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              title="分享结果"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          
          {onExport && (
            <div className="relative group">
              <button className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">
                <Download className="w-4 h-4" />
              </button>
              <div className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => handleExport('json')}
                    className="block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
                  >
                    导出 JSON
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
                  >
                    导出 CSV
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
                  >
                    导出 PDF
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 结果概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* 状态 */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm">状态</span>
          </div>
          <span className={`text-lg font-semibold ${getStatusColor(result.status)}`}>
            {result.status === 'completed' ? '完成' : 
             result.status === 'failed' ? '失败' : '部分完成'}
          </span>
        </div>

        {/* 分数 */}
        {result.score !== undefined && (
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400 text-sm">评分</span>
            </div>
            <span className={`text-lg font-semibold ${getScoreColor(result.score)}`}>
              {result.score}/100
            </span>
          </div>
        )}

        {/* 用时 */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm">用时</span>
          </div>
          <span className="text-lg font-semibold text-white">
            {formatDuration(result.duration)}
          </span>
        </div>

        {/* URL */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm">测试URL</span>
          </div>
          <span className="text-white text-sm font-mono truncate" title={result.url}>
            {result.url}
          </span>
        </div>
      </div>

      {/* 详细信息 */}
      {showDetails && (
        <>
          {/* 标签页导航 */}
          <div className="flex border-b border-gray-700 mb-6">
            {[
              { key: 'summary', label: '摘要', icon: Info },
              { key: 'metrics', label: '指标', icon: BarChart3 },
              { key: 'issues', label: '问题', icon: AlertTriangle },
              ...(showRawData ? [{ key: 'raw' as const, label: '原始数据', icon: FileText }] : [])
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* 标签页内容 */}
          <div className="min-h-[200px]">
            {/* 摘要标签页 */}
            {activeTab === 'summary' && result.summary && (
              <div className="space-y-4">
                {Object.entries(result.summary).map(([key, value]) => (
                  <div key={key} className="bg-gray-900/30 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-2 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <div className="text-gray-300 text-sm">
                      {typeof value === 'object' ? (
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      ) : (
                        String(value)
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 指标标签页 */}
            {activeTab === 'metrics' && result.metrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(result.metrics).map(([key, value]) => (
                  <div key={key} className="bg-gray-900/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="text-white font-medium">
                        {typeof value === 'number' ? value.toFixed(2) : String(value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 问题标签页 */}
            {activeTab === 'issues' && (
              <div className="space-y-3">
                {result.issues && result.issues.length > 0 ? (
                  result.issues.map((issue, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      issue.type === 'error' ? 'bg-red-500/10 border-red-500/20' :
                      issue.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' :
                      'bg-blue-500/10 border-blue-500/20'
                    }`}>
                      <div className="flex items-center space-x-2 mb-2">
                        {issue.type === 'error' ? (
                          <XCircle className="w-4 h-4 text-red-400" />
                        ) : issue.type === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <Info className="w-4 h-4 text-blue-400" />
                        )}
                        <span className={`font-medium ${
                          issue.type === 'error' ? 'text-red-400' :
                          issue.type === 'warning' ? 'text-yellow-400' :
                          'text-blue-400'
                        }`}>
                          {issue.title}
                        </span>
                        {issue.severity && (
                          <span className={`px-2 py-1 rounded text-xs ${
                            issue.severity === 'critical' ? 'bg-red-600 text-red-100' :
                            issue.severity === 'high' ? 'bg-orange-600 text-orange-100' :
                            issue.severity === 'medium' ? 'bg-yellow-600 text-yellow-100' :
                            'bg-gray-600 text-gray-100'
                          }`}>
                            {issue.severity}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-300 text-sm">{issue.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <p className="text-gray-400">未发现问题</p>
                  </div>
                )}

                {/* 建议 */}
                {result.recommendations && result.recommendations.length > 0 && (
                  <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <Zap className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-400 font-medium">优化建议</span>
                    </div>
                    <ul className="space-y-2">
                      {result.recommendations.map((rec, index) => (
                        <li key={index} className="text-gray-300 text-sm flex items-start space-x-2">
                          <span className="text-blue-400 mt-1">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 原始数据标签页 */}
            {activeTab === 'raw' && result.rawData && (
              <div className="bg-gray-900/30 rounded-lg p-4">
                <pre className="text-gray-300 text-xs whitespace-pre-wrap overflow-auto max-h-96">
                  {JSON.stringify(result.rawData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </>
      )}

      {/* 自定义内容 */}
      {customSections && (
        <div className="mt-6 border-t border-gray-700/50 pt-6">
          {customSections}
        </div>
      )}
    </div>
  );
};

export default TestResultsViewer;
