import { AlertCircle, AlertTriangle, BarChart3, CheckCircle, Download, ExternalLink, FileText, Globe, Hash, Info, Lightbulb, Shield, Smartphone, TrendingUp, Type, Users, XCircle, Zap } from 'lucide-react';
import type { useState, FC } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import PerformanceResults from './PerformanceResults';
import TechnicalResults from './TechnicalResults';

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
  keywords: string[];
  issues: {
    critical: Array<{ id: string; title: string; description: string; impact: string }>;
    warning: Array<{ id: string; title: string; description: string; impact: string }>;
    info: Array<{ id: string; title: string; description: string; impact: string }>;
  };
  recommendations: {
    high: Array<{ id: string; title: string; description: string; action: string }>;
    medium: Array<{ id: string; title: string; description: string; action: string }>;
    low: Array<{ id: string; title: string; description: string; action: string }>;
  };
  details: Record<string, any>;
  summary?: Record<string, any>;
  // 添加缺失的属性
  score?: number; // 总体评分
  grade?: string; // 评级
  performance?: {
    pageSize: number;
    loadTime: number;
  };
  technicalSEO?: any;
  contentQuality?: any;
}

interface SEOResultsProps {
  results: SEOResults | Record<string, any>; // 支持新的SEOAnalysisResult结构
  onExport?: (format: string) => void;
}

// 从SEO分析结果中提取各模块分数
const getModuleScores = (results: any) => {
  const scores: { [key: string]: number } = {};

  if (results.technicalSEO?.score !== undefined) scores['技术SEO'] = results.technicalSEO.score;
  if (results.contentQuality?.score !== undefined) scores['内容质量'] = results.contentQuality.score;
  if (results.accessibility?.score !== undefined) scores['可访问性'] = results.accessibility.score;
  if (results.performance?.score !== undefined) scores['性能'] = results.performance.score;
  if (results.mobileFriendly?.score !== undefined) scores['移动友好'] = results.mobileFriendly.score;
  if (results.socialMedia?.score !== undefined) scores['社交媒体'] = results.socialMedia.score;
  if (results.structuredData?.score !== undefined) scores['结构化数据'] = results.structuredData.score;
  if (results.security?.score !== undefined) scores['安全'] = results.security.score;

  return scores;
};

const SEOResults: React.FC<SEOResultsProps> = ({ results, onExport }) => {
  const { actualTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');

  // 安全检查：确保 results 存在
  if (!results) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-center text-gray-500 dark:text-gray-400">
          暂无分析结果
        </div>
      </div>
    );
  }

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
    '技术SEO': <Zap className="w-5 h-5" />,
    '内容质量': <Globe className="w-5 h-5" />,
    '可访问性': <Users className="w-5 h-5" />,
    '性能': <TrendingUp className="w-5 h-5" />,
    '移动友好': <Smartphone className="w-5 h-5" />,
    '社交媒体': <Users className="w-5 h-5" />,
    '结构化数据': <Info className="w-5 h-5" />,
    '安全': <Shield className="w-5 h-5" />
  };

  const categoryNames = {
    '技术SEO': '技术SEO',
    '内容质量': '内容质量',
    '可访问性': '可访问性',
    '性能': '性能',
    '移动友好': '移动友好',
    '社交媒体': '社交媒体',
    '结构化数据': '结构化数据',
    '安全': '安全'
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
          <div className={`text-6xl font-bold mb-2 ${getScoreColor(results.overallScore || 0)}`}>
            {results.overallScore || 0}
          </div>
          <div className="text-lg text-gray-600 dark:text-gray-400 mb-4">
            总体SEO评分 ({results.scoreGrade || 'N/A'})
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            分析时间: {new Date(results.timestamp || Date.now()).toLocaleString()}
          </div>
        </div>
      </div>

      {/* 各项评分 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(getModuleScores(results)).map(([category, score]) => (
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
              {results.metadata?.title || '未设置'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">页面大小</div>
            <div className="font-medium text-gray-900 dark:text-white">
              {results.performance?.pageSize ? (results.performance.pageSize / 1024).toFixed(1) + ' KB' : '未知'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">加载时间</div>
            <div className="font-medium text-gray-900 dark:text-white">
              {results.performance?.loadTime ? results.performance.loadTime.toFixed(0) + ' ms' : '未知'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">分析时间</div>
            <div className="font-medium text-gray-900 dark:text-white">
              {new Date(results.timestamp || Date.now()).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 关键问题摘要 */}
      {(results.issues && results.issues.length > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">关键问题</h3>
          <div className="space-y-3">
            {(results.issues || []).slice(0, 5).map((issue: any, index: number) => (
              <div key={index} className="flex items-start space-x-3">
                {issue.type === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <Info className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <div className={`font-medium ${issue.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                    {issue.category || issue.title}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {issue.description || issue.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderTechnicalAnalysis = () => {
    if (!results.technicalSEO) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">暂无技术SEO检查数据</div>
          <div className="text-sm text-gray-400 mt-2">
            请选择包含技术SEO检测的分析模板
          </div>
        </div>
      );
    }

    return <TechnicalResults results={results.technicalSEO} />;
  };

  const renderContentAnalysis = () => {
    if (!results.contentQuality) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">暂无内容分析数据</div>
        </div>
      );
    }

    const { contentQuality } = results;

    return (
      <div className="space-y-6">
        {/* 内容质量评分 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <Globe className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">内容质量评分</h3>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {contentQuality.score}/100
            </div>
            <div className="text-gray-600 dark:text-gray-400">内容优化程度</div>
          </div>
        </div>

        {/* 标题标签分析 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <Type className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">标题标签分析</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-gray-700 dark:text-gray-300">标题存在</span>
                {contentQuality.titleTag.present ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                {contentQuality.titleTag.present ? '已设置' : '未设置'}
              </span>
            </div>

            {contentQuality.titleTag.present && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">标题长度</span>
                  <span className={`text-sm ${contentQuality.titleTag.optimal ? 'text-green-600' : 'text-orange-600'
                    }`}>
                    {contentQuality.titleTag.length} 字符
                  </span>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-medium">当前标题：</p>
                  <p className="text-gray-900 dark:text-white font-semibold text-base leading-relaxed">
                    {contentQuality.titleTag.content || '无标题'}
                  </p>
                </div>

                {contentQuality.titleTag.issues.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">优化建议：</p>
                    <ul className="space-y-2">
                      {contentQuality.titleTag.issues.map((issue: any, index: number) => (
                        <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start space-x-2">
                          <span className="text-orange-500 dark:text-orange-400 mt-1 font-bold">•</span>
                          <span className="leading-relaxed">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Meta描述分析 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <FileText className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Meta描述分析</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-gray-700 dark:text-gray-300">描述存在</span>
                {contentQuality.metaDescription.present ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                {contentQuality.metaDescription.present ? '已设置' : '未设置'}
              </span>
            </div>

            {contentQuality.metaDescription.present && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">描述长度</span>
                  <span className={`text-sm ${contentQuality.metaDescription.optimal ? 'text-green-600' : 'text-orange-600'
                    }`}>
                    {contentQuality.metaDescription.length} 字符
                  </span>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-medium">当前描述：</p>
                  <p className="text-gray-900 dark:text-white font-medium text-base leading-relaxed">
                    {contentQuality.metaDescription.content || '无描述'}
                  </p>
                </div>

                {contentQuality.metaDescription.issues.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">优化建议：</p>
                    <ul className="space-y-2">
                      {contentQuality.metaDescription.issues.map((issue: any, index: number) => (
                        <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start space-x-2">
                          <span className="text-orange-500 dark:text-orange-400 mt-1 font-bold">•</span>
                          <span className="leading-relaxed">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 标题结构分析 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <Hash className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">标题结构分析</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">H1标签数量</span>
                <span className={`text-sm font-medium ${contentQuality.headings.h1Count === 1 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                  {contentQuality.headings.h1Count}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">结构合理</span>
                {contentQuality.headings.structure ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>

            {contentQuality.headings.h1Content.length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 font-medium">H1标签内容：</p>
                <ul className="space-y-2">
                  {contentQuality.headings.h1Content.map((h1: any, index: number) => (
                    <li key={index} className="text-gray-900 dark:text-white text-sm leading-relaxed">
                      <span className="text-blue-500 dark:text-blue-400 font-bold mr-2">•</span>
                      {h1}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {contentQuality.headings.issues.length > 0 && (
              <div className="space-y-3 mt-4">
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">优化建议：</p>
                <ul className="space-y-2">
                  {contentQuality.headings.issues.map((issue: any, index: number) => (
                    <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start space-x-2">
                      <span className="text-orange-500 dark:text-orange-400 mt-1 font-bold">•</span>
                      <span className="leading-relaxed">{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* 内容统计 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">内容统计</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {contentQuality.content.wordCount}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">字数统计</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {contentQuality.content.readability}%
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">可读性评分</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Object.keys(contentQuality.content.keywordDensity).length}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">关键词数量</div>
            </div>
          </div>

          {Object.keys(contentQuality.content.keywordDensity).length > 0 && (
            <div className="mt-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 font-medium">关键词密度：</p>
              <div className="space-y-2">
                {Object.entries(contentQuality.content.keywordDensity).map(([keyword, density]: [string, any]) => (
                  <div key={keyword} className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 dark:text-white font-medium">{keyword}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-semibold">{(density as number).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPerformanceAnalysis = () => {
    if (!results.performance) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">暂无性能分析数据</div>
        </div>
      );
    }

    return <PerformanceResults results={results.performance} />;
  };

  const renderIssuesAndSuggestions = () => {
    const allIssues = [];
    const allRecommendations = [];

    // 收集所有问题和建议
    if (results.issues) allIssues.push(...results.issues);
    if (results.recommendations) allRecommendations.push(...results.recommendations);

    // 从各个分析结果中收集问题
    if (results.technicalSEO) {
      if (results.technicalSEO.robotsTxt.issues) allIssues.push(...results.technicalSEO.robotsTxt.issues.map((issue: any) => ({ title: 'robots.txt', description: issue, priority: 'medium' as const })));
      if (results.technicalSEO.sitemap.issues) allIssues.push(...results.technicalSEO.sitemap.issues.map((issue: any) => ({ title: 'XML Sitemap', description: issue, priority: 'medium' as const })));
      if (results.technicalSEO.canonicalTags.issues) allIssues.push(...results.technicalSEO.canonicalTags.issues.map((issue: any) => ({ title: 'Canonical标签', description: issue, priority: 'high' as const })));
      if (results.technicalSEO.metaRobots.issues) allIssues.push(...results.technicalSEO.metaRobots.issues.map((issue: any) => ({ title: 'Meta Robots', description: issue, priority: 'medium' as const })));
    }

    if (results.contentQuality) {
      if (results.contentQuality.titleTag.issues) allIssues.push(...results.contentQuality.titleTag.issues.map((issue: any) => ({ title: '标题标签', description: issue, priority: 'high' as const })));
      if (results.contentQuality.metaDescription.issues) allIssues.push(...results.contentQuality.metaDescription.issues.map((issue: any) => ({ title: 'Meta描述', description: issue, priority: 'high' as const })));
      if (results.contentQuality.headings.issues) allIssues.push(...results.contentQuality.headings.issues.map((issue: any) => ({ title: '标题结构', description: issue, priority: 'medium' as const })));
      if (results.contentQuality.content.issues) allIssues.push(...results.contentQuality.content.issues.map((issue: any) => ({ title: '内容质量', description: issue, priority: 'medium' as const })));
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sortedIssues = allIssues.sort((a: any, b: any) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]);

    return (
      <div className="space-y-6">
        {/* 问题总览 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">问题总览</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {sortedIssues.filter(issue => issue.priority === 'high').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">高优先级</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {sortedIssues.filter(issue => issue.priority === 'medium').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">中优先级</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {sortedIssues.filter(issue => issue.priority === 'low').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">低优先级</div>
            </div>
          </div>
        </div>

        {/* 问题列表 */}
        {sortedIssues.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">发现的问题</h3>
            </div>
            <div className="space-y-4">
              {sortedIssues.map((issue, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className={`w-3 h-3 rounded-full mt-2 ${issue.priority === 'high' ? 'bg-red-500' :
                    issue.priority === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                    }`} />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{issue.title}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${issue.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        issue.priority === 'medium' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                        {issue.priority === 'high' ? '高优先级' : issue.priority === 'medium' ? '中优先级' : '低优先级'}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{issue.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 优化建议 */}
        {allRecommendations.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">优化建议</h3>
            </div>
            <div className="space-y-4">
              {allRecommendations.map((recommendation, index) => (
                <div key={index} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">{recommendation.title}</h4>
                  <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">{recommendation.description}</p>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">实施方法：</span>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{recommendation.implementation}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">预期效果：</span>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{recommendation.expectedImpact}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 如果没有问题和建议 */}
        {sortedIssues.length === 0 && allRecommendations.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">太棒了！</h3>
            <p className="text-gray-600 dark:text-gray-400">未发现明显的SEO问题，您的网站SEO状况良好。</p>
          </div>
        )}
      </div>
    );
  };

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
              type="button"
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
              type="button"
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
        {activeTab === 'content' && renderContentAnalysis()}
        {activeTab === 'performance' && renderPerformanceAnalysis()}
        {activeTab === 'issues' && renderIssuesAndSuggestions()}
      </div>
    </div>
  );
};

export default SEOResults;
