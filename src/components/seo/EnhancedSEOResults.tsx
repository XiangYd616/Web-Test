import {
  AlertCircle,
  CheckCircle,
  Download,
  ExternalLink,
  Globe,
  Info,
  Search,
  Shield,
  Smartphone,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface SEOResults {
  id: string;
  url: string;
  timestamp: string;
  status: string;
  progress: number;
  overallScore: number;
  scoreGrade: string;
  duration: number;
  pageInfo: any;
  metadata: any;
  checks: {
    technical: any;
    onPage: any;
    content: any;
    performance: any;
    mobile: any;
    social: any;
    structured: any;
    accessibility: any;
    security: any;
    coreWebVitals: any;
    pageExperience: any;
  };
  scores: {
    technical: number;
    onPage: number;
    content: number;
    performance: number;
    mobile: number;
    social: number;
    structured: number;
    accessibility: number;
    security: number;
    coreWebVitals: number;
    pageExperience: number;
  };
  keywords: any;
  issues: {
    critical: any[];
    warning: any[];
    info: any[];
  };
  recommendations: {
    high: any[];
    medium: any[];
    low: any[];
  };
  details: any;
  summary?: any;
}

interface EnhancedSEOResultsProps {
  results: SEOResults;
  onExport?: (format: string) => void;
}

const EnhancedSEOResults: React.FC<EnhancedSEOResultsProps> = ({ results, onExport }) => {
  const { actualTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
    if (score >= 70) return <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
    return <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
  };

  const categoryIcons = {
    technical: <Zap className="w-5 h-5" />,
    onPage: <Search className="w-5 h-5" />,
    content: <Globe className="w-5 h-5" />,
    performance: <TrendingUp className="w-5 h-5" />,
    mobile: <Smartphone className="w-5 h-5" />,
    social: <Users className="w-5 h-5" />,
    structured: <Info className="w-5 h-5" />,
    accessibility: <Users className="w-5 h-5" />,
    security: <Shield className="w-5 h-5" />,
    coreWebVitals: <TrendingUp className="w-5 h-5" />,
    pageExperience: <Users className="w-5 h-5" />
  };

  const categoryNames = {
    technical: '技术SEO',
    onPage: '页面SEO',
    content: '内容质量',
    performance: '性能优化',
    mobile: '移动友好',
    social: '社交媒体',
    structured: '结构化数据',
    accessibility: '可访问性',
    security: '安全性',
    coreWebVitals: 'Core Web Vitals',
    pageExperience: '页面体验'
  };

  const tabs = [
    { id: 'overview', name: '概览', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'technical', name: '技术分析', icon: <Zap className="w-4 h-4" /> },
    { id: 'content', name: '内容分析', icon: <Globe className="w-4 h-4" /> },
    { id: 'performance', name: '性能分析', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'issues', name: '问题建议', icon: <AlertCircle className="w-4 h-4" /> }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* 总体评分 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className={`text-6xl font-bold mb-2 ${getScoreColor(results.overallScore)}`}>
            {results.overallScore}
          </div>
          <div className="text-lg text-gray-600 dark:text-gray-400 mb-4">
            总体SEO评分 ({results.scoreGrade})
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            分析时间: {new Date(results.timestamp).toLocaleString()}
          </div>
        </div>
      </div>

      {/* 各项评分 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(results.scores).map(([category, score]) => (
          <div
            key={category}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {categoryIcons[category as keyof typeof categoryIcons]}
                <span className="font-medium text-gray-900 dark:text-white">
                  {categoryNames[category as keyof typeof categoryNames]}
                </span>
              </div>
              {getScoreIcon(score)}
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score}/100
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${score >= 90 ? 'bg-green-500' :
                  score >= 70 ? 'bg-yellow-500' :
                    score >= 50 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 页面基本信息 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">页面信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">页面标题</div>
            <div className="font-medium text-gray-900 dark:text-white">
              {results.pageInfo.title || '未设置'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">页面大小</div>
            <div className="font-medium text-gray-900 dark:text-white">
              {(results.metadata.pageSize / 1024).toFixed(1)} KB
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">加载时间</div>
            <div className="font-medium text-gray-900 dark:text-white">
              {results.metadata.loadTime} ms
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">状态码</div>
            <div className="font-medium text-gray-900 dark:text-white">
              {results.pageInfo.statusCode}
            </div>
          </div>
        </div>
      </div>

      {/* 关键问题摘要 */}
      {(results.issues.critical.length > 0 || results.issues.warning.length > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">关键问题</h3>
          <div className="space-y-3">
            {results.issues.critical.slice(0, 3).map((issue, index) => (
              <div key={index} className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-red-600 dark:text-red-400">
                    {issue.category}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {issue.message}
                  </div>
                </div>
              </div>
            ))}
            {results.issues.warning.slice(0, 2).map((issue, index) => (
              <div key={index} className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-yellow-600 dark:text-yellow-400">
                    {issue.category}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {issue.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderTechnicalAnalysis = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">技术SEO检查</h3>
        {results.checks.technical.checks && results.checks.technical.checks.length > 0 ? (
          <div className="space-y-3">
            {results.checks.technical.checks.map((check: any, index: number) => (
              <div key={index} className="flex items-start space-x-3">
                {check.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                ) : check.type === 'warning' ? (
                  <Info className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {check.category || '技术检查'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {check.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400">暂无技术SEO检查数据</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">SEO分析报告</h2>
          <div className="flex items-center space-x-2 mt-1">
            <ExternalLink className="w-4 h-4 text-gray-500" />
            <a
              href={results.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {results.url}
            </a>
          </div>
        </div>
        {onExport && (
          <div className="flex space-x-2">
            <button
              onClick={() => onExport('pdf')}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>导出PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* 标签页 */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              {tab.icon}
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 标签页内容 */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'technical' && renderTechnicalAnalysis()}
        {/* 其他标签页内容可以在这里添加 */}
      </div>
    </div>
  );
};

export default EnhancedSEOResults;
