import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Globe,
  Loader,
  Play,
  Search,
  Settings,
  Shield,
  Smartphone,
  Square,
  TrendingUp,
  Upload,
  Users,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import EnhancedSEOResults from '../components/seo/EnhancedSEOResults';
import FileUploadSEO from '../components/seo/FileUploadSEO';
import LocalSEOResults from '../components/seo/LocalSEOResults';
import { URLInput } from '../components/testing';
import { useTheme } from '../contexts/ThemeContext';
import { useUserStats } from '../hooks/useUserStats';

type TestMode = 'online' | 'local' | 'enhanced';

interface SEOConfig {
  url: string;
  keywords: string;
  competitorUrls: string[];
  deepCrawl: boolean;
  maxPages: number;
  maxDepth: number;
  competitorAnalysis: boolean;
  backlinksAnalysis: boolean;
  keywordRanking: boolean;
  internationalSEO: boolean;
  technicalAudit: boolean;
  checkTechnicalSEO: boolean;
  checkContentQuality: boolean;
  checkAccessibility: boolean;
  checkPerformance: boolean;
  checkMobileFriendly: boolean;
  checkSocialMedia: boolean;
  checkStructuredData: boolean;
  checkSecurity: boolean;
  includeImages: boolean;
  includeLinks: boolean;
  generateReport: boolean;
  reportFormat: 'html' | 'pdf' | 'json';
}

const SEOTest: React.FC = () => {
  const { actualTheme } = useTheme();

  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "SEO分析",
    description: "使用SEO分析功能"
  });

  // 用户统计
  const { recordTestCompletion } = useUserStats();

  const [testMode, setTestMode] = useState<TestMode>('online');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const [config, setConfig] = useState<SEOConfig>({
    url: '',
    keywords: '',
    competitorUrls: [],
    deepCrawl: false,
    maxPages: 10,
    maxDepth: 2,
    competitorAnalysis: false,
    backlinksAnalysis: false,
    keywordRanking: false,
    internationalSEO: false,
    technicalAudit: false,
    checkTechnicalSEO: true,
    checkContentQuality: true,
    checkAccessibility: true,
    checkPerformance: true,
    checkMobileFriendly: true,
    checkSocialMedia: true,
    checkStructuredData: true,
    checkSecurity: true,
    includeImages: true,
    includeLinks: true,
    generateReport: false,
    reportFormat: 'html'
  });

  const handleOnlineAnalysis = async () => {
    if (!config.url) {
      setError('请输入要分析的URL');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setProgress(0);
    setCurrentStep('准备分析...');

    try {
      const endpoint = config.deepCrawl || config.competitorAnalysis ||
        config.backlinksAnalysis || config.keywordRanking ||
        config.internationalSEO || config.technicalAudit
        ? '/api/test/seo/enhanced'
        : '/api/test/seo';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: config.url,
          options: config
        }),
      });

      const result = await response.json();

      if (result.success) {
        setResults(result.data);
        setProgress(100);
        setCurrentStep('分析完成');
      } else {
        throw new Error(result.message || '分析失败');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLocalAnalysis = async (files: File[], options: any) => {
    setIsAnalyzing(true);
    setError('');
    setProgress(0);
    setCurrentStep('上传文件...');

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      Object.entries(options).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      setCurrentStep('分析文件...');
      setProgress(50);

      const response = await fetch('/api/test/seo/local', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setResults(result.data);
        setProgress(100);
        setCurrentStep('分析完成');
      } else {
        throw new Error(result.message || '本地分析失败');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCompetitorUrlChange = (index: number, value: string) => {
    const newUrls = [...config.competitorUrls];
    newUrls[index] = value;
    setConfig(prev => ({ ...prev, competitorUrls: newUrls }));
  };

  const addCompetitorUrl = () => {
    setConfig(prev => ({
      ...prev,
      competitorUrls: [...prev.competitorUrls, '']
    }));
  };

  const removeCompetitorUrl = (index: number) => {
    setConfig(prev => ({
      ...prev,
      competitorUrls: prev.competitorUrls.filter((_, i) => i !== index)
    }));
  };

  const exportResults = (format: string) => {
    if (!results) return;

    const dataStr = format === 'json'
      ? JSON.stringify(results, null, 2)
      : convertToCSV(results);

    const dataBlob = new Blob([dataStr], {
      type: format === 'json' ? 'application/json' : 'text/csv'
    });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `seo-analysis-${Date.now()}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: any) => {
    const headers = ['项目', '值', '状态'];
    const rows = [
      ['总体评分', data.overallScore || 0, ''],
      ['分析文件数', data.analyzedFiles || 0, ''],
      ['发现问题', data.issues?.length || 0, ''],
      ['优化建议', data.recommendations?.length || 0, '']
    ];

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const renderModeSelector = () => (
    <div className="mb-6">
      <h2 className={`text-lg font-semibold mb-4 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        选择分析模式
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[
          {
            id: 'online',
            label: '在线分析',
            icon: Globe,
            desc: '分析在线网站的SEO表现',
            features: ['实时抓取', '技术检查', '内容分析'],
            color: 'blue'
          },
          {
            id: 'local',
            label: '本地分析',
            icon: Upload,
            desc: '上传HTML文件进行离线分析',
            features: ['文件上传', '离线分析', '快速检查'],
            color: 'green'
          },
          {
            id: 'enhanced',
            label: '增强分析',
            icon: TrendingUp,
            desc: '深度SEO审计和优化建议',
            features: ['9项检查', '智能评分', '专业建议'],
            color: 'purple'
          }
        ].map(mode => (
          <button
            key={mode.id}
            type="button"
            onClick={() => setTestMode(mode.id as TestMode)}
            className={`
              group relative p-6 rounded-xl border transition-all duration-300 text-left
              ${testMode === mode.id
                ? `border-${mode.color}-500 ${actualTheme === 'dark'
                  ? `bg-${mode.color}-900/20 shadow-lg shadow-${mode.color}-500/20`
                  : `bg-${mode.color}-50 shadow-lg shadow-${mode.color}-500/10`
                }`
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }
              ${actualTheme === 'dark'
                ? 'bg-gray-800/50 hover:bg-gray-800/70'
                : 'bg-white/70 hover:bg-white/90 shadow-sm hover:shadow-md'
              }
            `}
          >
            {/* 选中指示器 */}
            {testMode === mode.id && (
              <div className={`absolute top-3 right-3 w-2 h-2 rounded-full bg-${mode.color}-500`} />
            )}

            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-lg transition-colors ${testMode === mode.id
                ? `bg-${mode.color}-500 text-white`
                : `${actualTheme === 'dark' ? `bg-${mode.color}-600/20` : `bg-${mode.color}-100`} ${actualTheme === 'dark' ? `text-${mode.color}-400` : `text-${mode.color}-600`}`
                }`}>
                <mode.icon className="h-6 w-6" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-lg mb-2 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {mode.label}
                </h3>
                <p className={`text-sm mb-3 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {mode.desc}
                </p>

                {/* 功能特色 */}
                <div className="flex flex-wrap gap-2">
                  {mode.features.map((feature, index) => (
                    <span
                      key={index}
                      className={`px-3 py-1 text-xs rounded-full ${testMode === mode.id
                        ? `bg-${mode.color}-500/20 text-${mode.color}-600 dark:text-${mode.color}-400`
                        : `${actualTheme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`
                        }`}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // 如果未登录，显示登录提示
  if (!isAuthenticated) {
    return LoginPromptComponent;
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${actualTheme === 'dark'
      ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
      : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
      }`}>
      <div className="container mx-auto px-6 py-6 max-w-[1800px]">
        {/* 简化的页面头部 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${actualTheme === 'dark'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600'
                : 'bg-gradient-to-r from-blue-500 to-purple-500'
                }`}>
                <Search className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  SEO分析工具
                </h1>
                <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  专业级SEO分析，全面优化您的网站搜索表现
                </p>
              </div>
            </div>

            {/* 快速统计 */}
            <div className="hidden lg:flex items-center space-x-6">
              <div className="text-center">
                <div className={`text-lg font-bold ${actualTheme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>9+</div>
                <div className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>检查项目</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${actualTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>30s</div>
                <div className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>分析时间</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${actualTheme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>免费</div>
                <div className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>完全免费</div>
              </div>
            </div>
          </div>

          {/* 功能特色 - 宽屏优化布局 */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
            <div className={`p-3 rounded-lg border ${actualTheme === 'dark'
              ? 'bg-gray-800/50 border-gray-700'
              : 'bg-white/70 border-gray-200 shadow-sm'
              }`}>
              <div className="flex items-center space-x-2">
                <Globe className={`h-4 w-4 ${actualTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                <div>
                  <div className={`text-sm font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>技术SEO</div>
                  <div className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>HTTPS、性能检查</div>
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${actualTheme === 'dark'
              ? 'bg-gray-800/50 border-gray-700'
              : 'bg-white/70 border-gray-200 shadow-sm'
              }`}>
              <div className="flex items-center space-x-2">
                <Eye className={`h-4 w-4 ${actualTheme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                <div>
                  <div className={`text-sm font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>内容分析</div>
                  <div className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>标题、关键词优化</div>
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${actualTheme === 'dark'
              ? 'bg-gray-800/50 border-gray-700'
              : 'bg-white/70 border-gray-200 shadow-sm'
              }`}>
              <div className="flex items-center space-x-2">
                <TrendingUp className={`h-4 w-4 ${actualTheme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
                <div>
                  <div className={`text-sm font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>智能建议</div>
                  <div className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>专业优化建议</div>
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${actualTheme === 'dark'
              ? 'bg-gray-800/50 border-gray-700'
              : 'bg-white/70 border-gray-200 shadow-sm'
              }`}>
              <div className="flex items-center space-x-2">
                <Shield className={`h-4 w-4 ${actualTheme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
                <div>
                  <div className={`text-sm font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>安全保护</div>
                  <div className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>数据安全保护</div>
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${actualTheme === 'dark'
              ? 'bg-gray-800/50 border-gray-700'
              : 'bg-white/70 border-gray-200 shadow-sm'
              }`}>
              <div className="flex items-center space-x-2">
                <Smartphone className={`h-4 w-4 ${actualTheme === 'dark' ? 'text-pink-400' : 'text-pink-600'}`} />
                <div>
                  <div className={`text-sm font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>移动优化</div>
                  <div className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>响应式设计检查</div>
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${actualTheme === 'dark'
              ? 'bg-gray-800/50 border-gray-700'
              : 'bg-white/70 border-gray-200 shadow-sm'
              }`}>
              <div className="flex items-center space-x-2">
                <BarChart3 className={`h-4 w-4 ${actualTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <div>
                  <div className={`text-sm font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>数据分析</div>
                  <div className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>详细报告生成</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {renderModeSelector()}

        {/* 进度显示 */}
        {isAnalyzing && (
          <div className={`mb-8 p-6 rounded-xl border ${actualTheme === 'dark'
            ? 'bg-gray-800/50 border-gray-700 backdrop-blur-sm'
            : 'bg-white/70 border-gray-200 backdrop-blur-sm shadow-sm'
            }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${actualTheme === 'dark' ? 'bg-blue-600/20' : 'bg-blue-100'
                  }`}>
                  <Loader className={`h-5 w-5 animate-spin ${actualTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    }`} />
                </div>
                <div>
                  <div className={`font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                    SEO分析进行中...
                  </div>
                  <div className={`text-sm ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                    {currentStep}
                  </div>
                </div>
              </div>
              <div className={`text-2xl font-bold ${actualTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`}>
                {progress}%
              </div>
            </div>

            {/* 进度条 */}
            <div className={`w-full h-3 rounded-full overflow-hidden ${actualTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
              }`}>
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* 进度步骤 */}
            <div className="flex justify-between mt-4 text-xs">
              <span className={`${progress >= 10 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                获取页面
              </span>
              <span className={`${progress >= 30 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                技术分析
              </span>
              <span className={`${progress >= 50 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                内容分析
              </span>
              <span className={`${progress >= 70 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                性能检查
              </span>
              <span className={`${progress >= 90 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                生成报告
              </span>
            </div>
          </div>
        )}

        {/* 错误显示 */}
        {error && (
          <div className={`mb-8 p-6 rounded-xl border ${actualTheme === 'dark'
            ? 'bg-red-900/20 border-red-800/50 backdrop-blur-sm'
            : 'bg-red-50 border-red-200 backdrop-blur-sm shadow-sm'
            }`}>
            <div className="flex items-start space-x-4">
              <div className={`p-2 rounded-lg ${actualTheme === 'dark' ? 'bg-red-600/20' : 'bg-red-100'
                }`}>
                <AlertTriangle className={`h-5 w-5 ${actualTheme === 'dark' ? 'text-red-400' : 'text-red-600'
                  }`} />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${actualTheme === 'dark' ? 'text-red-400' : 'text-red-800'
                  }`}>
                  分析失败
                </h3>
                <p className={`text-sm ${actualTheme === 'dark' ? 'text-red-300' : 'text-red-700'
                  }`}>
                  {error}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                title="关闭错误提示"
                aria-label="关闭错误提示"
                className={`p-1 rounded-lg transition-colors ${actualTheme === 'dark'
                  ? 'hover:bg-red-600/20 text-red-400'
                  : 'hover:bg-red-100 text-red-600'
                  }`}
              >
                <Square className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* 测试模式内容 */}
        <div className="mb-8">
          {testMode === 'online' && renderOnlineMode()}
          {testMode === 'local' && renderLocalMode()}
          {testMode === 'enhanced' && renderEnhancedMode()}
        </div>

        {/* 结果显示 */}
        {results && (
          <div className="mt-8">
            {testMode === 'local' ? (
              <LocalSEOResults
                results={results}
                onExport={exportResults}
              />
            ) : testMode === 'enhanced' ? (
              <EnhancedSEOResults
                results={results}
                onExport={exportResults}
              />
            ) : (
              <div className="space-y-6">
                {/* 在线和增强模式的结果显示 */}
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">SEO分析结果</h2>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => exportResults('json')}
                      className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-1"
                    >
                      <Download className="h-4 w-4" />
                      <span>JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => exportResults('csv')}
                      className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-1"
                    >
                      <Download className="h-4 w-4" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {/* 总体评分 */}
                <div className={`p-6 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border`}>
                  <div className="text-center">
                    <div className={`text-6xl font-bold ${getScoreColor(results.overallScore)}`}>
                      {results.overallScore}
                    </div>
                    <div className="text-lg font-medium mt-2">
                      SEO总体评分 ({getScoreGrade(results.overallScore)})
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      基于多项SEO检查的综合评分
                    </div>
                  </div>
                </div>

                {/* 分项评分 */}
                {results.scores && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(results.scores).map(([key, score]: [string, any]) => (
                      <div key={key} className={`p-4 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border`}>
                        <div className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</div>
                        <div className="text-sm text-gray-500 capitalize">
                          {getScoreLabel(key)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 问题和建议 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 发现的问题 */}
                  <div className={`p-6 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border`}>
                    <h3 className="text-lg font-semibold mb-4">发现的问题</h3>
                    <div className="space-y-3">
                      {results.issues?.slice(0, 5).map((issue: any, index: number) => (
                        <div key={index} className="flex items-start space-x-3">
                          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                          <div>
                            <div className="font-medium">{issue.type || issue.message}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              影响: {issue.impact}
                            </div>
                          </div>
                        </div>
                      ))}
                      {results.issues?.length > 5 && (
                        <div className="text-sm text-gray-500">
                          还有 {results.issues.length - 5} 个问题...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 优化建议 */}
                  <div className={`p-6 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border`}>
                    <h3 className="text-lg font-semibold mb-4">优化建议</h3>
                    <div className="space-y-3">
                      {results.recommendations?.slice(0, 5).map((rec: any, index: number) => (
                        <div key={index} className="flex items-start space-x-3">
                          <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
                          <div>
                            <div className="font-medium">{rec.title || rec.type}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {rec.description || rec.message}
                            </div>
                          </div>
                        </div>
                      ))}
                      {results.recommendations?.length > 5 && (
                        <div className="text-sm text-gray-500">
                          还有 {results.recommendations.length - 5} 条建议...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // 辅助函数
  function getScoreColor(score: number) {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  }

  function getScoreGrade(score: number) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  }

  function getScoreLabel(key: string) {
    const labels: { [key: string]: string } = {
      technical: '技术SEO',
      content: '内容质量',
      onPage: '页面SEO',
      performance: '性能优化',
      mobile: '移动友好',
      social: '社交媒体',
      coreWebVitals: 'Core Web Vitals',
      pageExperience: '页面体验'
    };
    return labels[key] || key;
  }

  // 渲染在线分析模式
  function renderOnlineMode() {
    return (
      <div className={`p-8 rounded-xl border ${actualTheme === 'dark'
        ? 'bg-gray-800/50 border-gray-700 backdrop-blur-sm'
        : 'bg-white/70 border-gray-200 backdrop-blur-sm shadow-sm'
        }`}>
        <div className="flex items-center space-x-3 mb-6">
          <div className={`p-2 rounded-lg ${actualTheme === 'dark' ? 'bg-blue-600/20' : 'bg-blue-100'
            }`}>
            <Globe className={`h-5 w-5 ${actualTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`} />
          </div>
          <div>
            <h3 className={`text-xl font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
              在线SEO分析
            </h3>
            <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
              输入网站URL，获取实时SEO分析报告
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 第一列：基础配置 */}
          <div className="space-y-6">
            {/* URL输入 */}
            <div>
              <label className={`block text-sm font-medium mb-3 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                网站URL <span className="text-red-500">*</span>
              </label>
              <URLInput
                value={config.url}
                onChange={(url) => setConfig(prev => ({ ...prev, url }))}
                placeholder="https://example.com"
                disabled={isAnalyzing}
              />
            </div>

            {/* 关键词输入 */}
            <div>
              <label className={`block text-sm font-medium mb-3 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                目标关键词 <span className="text-gray-400">(可选)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={config.keywords}
                  onChange={(e) => setConfig(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="SEO优化, 网站分析, 搜索引擎"
                  disabled={isAnalyzing}
                  className={`
                  w-full px-4 py-3 border rounded-xl transition-colors
                  ${actualTheme === 'dark'
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Search className={`h-4 w-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                </div>
              </div>
              <p className={`text-xs mt-2 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                用逗号分隔多个关键词，将用于关键词密度分析
              </p>
            </div>
          </div>

          {/* 第二列：基础分析选项 */}
          <div className="space-y-6">
            {/* 基础分析选项 */}
            <div>
              <label className={`block text-sm font-medium mb-4 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                基础分析选项
              </label>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { key: 'checkTechnicalSEO', label: '技术SEO', icon: Zap, desc: 'HTTPS、状态码、性能' },
                  { key: 'checkContentQuality', label: '内容质量', icon: Eye, desc: '标题、描述、关键词' },
                  { key: 'checkAccessibility', label: '可访问性', icon: Users, desc: '无障碍访问检查' },
                  { key: 'checkPerformance', label: '性能分析', icon: TrendingUp, desc: '加载速度、优化建议' }
                ].map((option) => (
                  <label
                    key={option.key}
                    className={`
                    flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all
                    ${config[option.key as keyof SEOConfig]
                        ? `border-blue-500 ${actualTheme === 'dark'
                          ? 'bg-blue-900/20'
                          : 'bg-blue-50'
                        }`
                        : `border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600`
                      }
                    ${actualTheme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50/50'}
                  `}
                  >
                    <input
                      type="checkbox"
                      checked={config[option.key as keyof SEOConfig] as boolean}
                      onChange={(e) => setConfig(prev => ({ ...prev, [option.key]: e.target.checked }))}
                      disabled={isAnalyzing}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <option.icon className={`h-4 w-4 ${config[option.key as keyof SEOConfig]
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-400'
                          }`} />
                        <span className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                          {option.label}
                        </span>
                      </div>
                      <p className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        {option.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 第三列：高级选项 */}
          <div className="space-y-6">
            {/* 高级分析选项 */}
            <div>
              <label className={`block text-sm font-medium mb-4 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                高级选项
              </label>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { key: 'checkMobileFriendly', label: '移动友好性', icon: Smartphone, desc: '响应式设计检查' },
                  { key: 'checkSocialMedia', label: '社交媒体', icon: Users, desc: 'Open Graph和Twitter卡片' },
                  { key: 'checkStructuredData', label: '结构化数据', icon: BarChart3, desc: 'Schema标记检查' },
                  { key: 'checkSecurity', label: '安全性分析', icon: Shield, desc: 'HTTPS和安全头检查' }
                ].map((option) => (
                  <label
                    key={option.key}
                    className={`
                    flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all
                    ${config[option.key as keyof SEOConfig]
                        ? `border-purple-500 ${actualTheme === 'dark'
                          ? 'bg-purple-900/20'
                          : 'bg-purple-50'
                        }`
                        : `border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600`
                      }
                    ${actualTheme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50/50'}
                  `}
                  >
                    <input
                      type="checkbox"
                      checked={config[option.key as keyof SEOConfig] as boolean}
                      onChange={(e) => setConfig(prev => ({ ...prev, [option.key]: e.target.checked }))}
                      disabled={isAnalyzing}
                      className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <option.icon className={`h-4 w-4 ${config[option.key as keyof SEOConfig]
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-gray-400'
                          }`} />
                        <span className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                          {option.label}
                        </span>
                      </div>
                      <p className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        {option.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 报告选项 */}
            <div>
              <label className={`block text-sm font-medium mb-4 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                报告选项
              </label>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={config.generateReport}
                    onChange={(e) => setConfig(prev => ({ ...prev, generateReport: e.target.checked }))}
                    disabled={isAnalyzing}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    生成详细报告
                  </span>
                </label>

                {config.generateReport && (
                  <div className="ml-6">
                    <label className={`block text-sm font-medium mb-2 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      报告格式
                    </label>
                    <select
                      value={config.reportFormat}
                      onChange={(e) => setConfig(prev => ({ ...prev, reportFormat: e.target.value as 'html' | 'pdf' | 'json' }))}
                      disabled={isAnalyzing}
                      className={`
                        w-full px-3 py-2 border rounded-lg transition-colors
                        ${actualTheme === 'dark'
                          ? 'bg-gray-700/50 border-gray-600 text-white focus:border-blue-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                        }
                        focus:outline-none focus:ring-2 focus:ring-blue-500/20
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      <option value="html">HTML报告</option>
                      <option value="pdf">PDF报告</option>
                      <option value="json">JSON数据</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 分析按钮 */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleOnlineAnalysis}
            disabled={!config.url || isAnalyzing}
            className={`
              w-full py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-3 transition-all duration-200
              ${!config.url || isAnalyzing
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : `bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700
                   shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]`
              }
            `}
          >
            {isAnalyzing ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                <span>正在分析网站...</span>
                <div className="ml-2 flex space-x-1">
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                <span>开始SEO分析</span>
                <div className={`px-2 py-1 rounded-full text-xs ${actualTheme === 'dark' ? 'bg-white/20' : 'bg-white/20'
                  }`}>
                  免费
                </div>
              </>
            )}
          </button>

          {/* 提示信息 */}
          <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <CheckCircle className={`h-3 w-3 ${actualTheme === 'dark' ? 'text-green-400' : 'text-green-600'
                }`} />
              <span className={actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                实时分析
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Shield className={`h-3 w-3 ${actualTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`} />
              <span className={actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                数据安全
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className={`h-3 w-3 ${actualTheme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`} />
              <span className={actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                30秒完成
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 渲染本地分析模式
  function renderLocalMode() {
    return (
      <FileUploadSEO
        onAnalysisComplete={setResults}
        isAnalyzing={isAnalyzing}
        onStartAnalysis={handleLocalAnalysis}
      />
    );
  }

  // 渲染增强分析模式
  function renderEnhancedMode() {
    return (
      <div className={`p-8 rounded-xl border ${actualTheme === 'dark'
        ? 'bg-gray-800/50 border-gray-700 backdrop-blur-sm'
        : 'bg-white/70 border-gray-200 backdrop-blur-sm shadow-sm'
        }`}>
        <div className="flex items-center space-x-3 mb-6">
          <div className={`p-2 rounded-lg ${actualTheme === 'dark' ? 'bg-purple-600/20' : 'bg-purple-100'
            }`}>
            <TrendingUp className={`h-5 w-5 ${actualTheme === 'dark' ? 'text-purple-400' : 'text-purple-600'
              }`} />
          </div>
          <div>
            <h3 className={`text-xl font-semibold ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
              增强SEO分析
            </h3>
            <p className={`text-sm ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
              深度SEO审计，包含9项专业检查和智能优化建议
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左列：基础配置 */}
          <div className="space-y-6">
            {/* URL输入 */}
            <div>
              <label className={`block text-sm font-medium mb-3 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                网站URL <span className="text-red-500">*</span>
              </label>
              <URLInput
                value={config.url}
                onChange={(url) => setConfig(prev => ({ ...prev, url }))}
                placeholder="https://example.com"
                disabled={isAnalyzing}
              />
            </div>

            {/* 关键词输入 */}
            <div>
              <label className={`block text-sm font-medium mb-3 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                目标关键词 <span className="text-gray-400">(可选)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={config.keywords}
                  onChange={(e) => setConfig(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="SEO优化, 网站分析, 搜索引擎"
                  disabled={isAnalyzing}
                  className={`
                  w-full px-4 py-3 border rounded-xl transition-colors
                  ${actualTheme === 'dark'
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-purple-500'
                    }
                  focus:outline-none focus:ring-2 focus:ring-purple-500/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Search className={`h-4 w-4 ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                </div>
              </div>
            </div>
          </div>

          {/* 右列：增强分析选项 */}
          <div className="space-y-6">
            {/* 增强分析选项 */}
            <div>
              <label className={`block text-sm font-medium mb-4 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                增强分析选项
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'checkMobileFriendly', label: '移动友好性', icon: Smartphone, desc: '响应式设计检查' },
                  { key: 'checkSocialMedia', label: '社交媒体', icon: Users, desc: 'Open Graph和Twitter卡片' },
                  { key: 'checkStructuredData', label: '结构化数据', icon: BarChart3, desc: 'Schema标记检查' },
                  { key: 'checkSecurity', label: '安全性分析', icon: Shield, desc: 'HTTPS和安全头检查' }
                ].map((option) => (
                  <label
                    key={option.key}
                    className={`
                    flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all
                    ${config[option.key as keyof SEOConfig]
                        ? `border-purple-500 ${actualTheme === 'dark'
                          ? 'bg-purple-900/20'
                          : 'bg-purple-50'
                        }`
                        : `border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600`
                      }
                    ${actualTheme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50/50'}
                  `}
                  >
                    <input
                      type="checkbox"
                      checked={config[option.key as keyof SEOConfig] as boolean}
                      onChange={(e) => setConfig(prev => ({ ...prev, [option.key]: e.target.checked }))}
                      disabled={isAnalyzing}
                      className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <option.icon className={`h-4 w-4 ${config[option.key as keyof SEOConfig]
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-gray-400'
                          }`} />
                        <span className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                          {option.label}
                        </span>
                      </div>
                      <p className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        {option.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 高级选项 */}
            <div>
              <label className={`block text-sm font-medium mb-4 ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                高级选项 <span className="text-gray-400">(实验性功能)</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'deepCrawl', label: '深度爬取', icon: Eye, desc: '多页面深度分析' },
                  { key: 'competitorAnalysis', label: '竞争对手分析', icon: BarChart3, desc: '对比竞争对手SEO' }
                ].map((option) => (
                  <label
                    key={option.key}
                    className={`
                    flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all
                    ${config[option.key as keyof SEOConfig]
                        ? `border-orange-500 ${actualTheme === 'dark'
                          ? 'bg-orange-900/20'
                          : 'bg-orange-50'
                        }`
                        : `border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600`
                      }
                    ${actualTheme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50/50'}
                  `}
                  >
                    <input
                      type="checkbox"
                      checked={config[option.key as keyof SEOConfig] as boolean}
                      onChange={(e) => setConfig(prev => ({ ...prev, [option.key]: e.target.checked }))}
                      disabled={isAnalyzing}
                      className="mt-1 rounded border-gray-300 text-orange-600 focus:ring-orange-500 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <option.icon className={`h-4 w-4 ${config[option.key as keyof SEOConfig]
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-gray-400'
                          }`} />
                        <span className={`font-medium ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                          {option.label}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${actualTheme === 'dark' ? 'bg-orange-600/20 text-orange-400' : 'bg-orange-100 text-orange-600'
                          }`}>
                          Beta
                        </span>
                      </div>
                      <p className={`text-xs ${actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        {option.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {config.deepCrawl && (
              <div className="ml-6 space-y-2">
                <div>
                  <label className="block text-sm">最大页面数</label>
                  <input
                    type="number"
                    value={config.maxPages}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxPages: parseInt(e.target.value) || 10 }))}
                    min="1"
                    max="100"
                    className="w-20 px-2 py-1 border rounded text-sm"
                    aria-label="最大页面数"
                  />
                </div>
                <div>
                  <label className="block text-sm">爬取深度</label>
                  <input
                    type="number"
                    value={config.maxDepth}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxDepth: parseInt(e.target.value) || 2 }))}
                    min="1"
                    max="5"
                    className="w-20 px-2 py-1 border rounded text-sm"
                    aria-label="爬取深度"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 其他高级选项 */}
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.competitorAnalysis}
                onChange={(e) => setConfig(prev => ({ ...prev, competitorAnalysis: e.target.checked }))}
                className="rounded"
              />
              <span className="font-medium">竞争对手分析</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.backlinksAnalysis}
                onChange={(e) => setConfig(prev => ({ ...prev, backlinksAnalysis: e.target.checked }))}
                className="rounded"
              />
              <span className="font-medium">反向链接分析</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.keywordRanking}
                onChange={(e) => setConfig(prev => ({ ...prev, keywordRanking: e.target.checked }))}
                className="rounded"
              />
              <span className="font-medium">关键词排名</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.internationalSEO}
                onChange={(e) => setConfig(prev => ({ ...prev, internationalSEO: e.target.checked }))}
                className="rounded"
              />
              <span className="font-medium">国际化SEO</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.technicalAudit}
                onChange={(e) => setConfig(prev => ({ ...prev, technicalAudit: e.target.checked }))}
                className="rounded"
              />
              <span className="font-medium">技术审计</span>
            </label>
          </div>

          {/* 竞争对手URL */}
          {config.competitorAnalysis && (
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">
                竞争对手URL
              </label>
              <div className="space-y-2">
                {config.competitorUrls.map((url, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => handleCompetitorUrlChange(index, e.target.value)}
                      placeholder="输入竞争对手URL"
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeCompetitorUrl(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      删除
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addCompetitorUrl}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  + 添加竞争对手URL
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 分析按钮 */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleOnlineAnalysis}
            disabled={!config.url || isAnalyzing}
            className={`
              w-full py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-3 transition-all duration-200
              ${!config.url || isAnalyzing
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : `bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700
                   shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]`
              }
            `}
          >
            {isAnalyzing ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                <span>正在进行增强分析...</span>
              </>
            ) : (
              <>
                <TrendingUp className="h-5 w-5" />
                <span>开始增强SEO分析</span>
                <div className={`px-2 py-1 rounded-full text-xs ${actualTheme === 'dark' ? 'bg-white/20' : 'bg-white/20'
                  }`}>
                  专业版
                </div>
              </>
            )}
          </button>

          {/* 提示信息 */}
          <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <BarChart3 className={`h-3 w-3 ${actualTheme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`} />
              <span className={actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                9项检查
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <TrendingUp className={`h-3 w-3 ${actualTheme === 'dark' ? 'text-pink-400' : 'text-pink-600'
                }`} />
              <span className={actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                智能评分
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Settings className={`h-3 w-3 ${actualTheme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                }`} />
              <span className={actualTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                专业建议
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default SEOTest;
