import React, { useState } from 'react';
import { 
  Globe, 
  Upload, 
  Settings, 
  TrendingUp, 
  Users, 
  Search,
  Loader,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { URLInput } from '../components/testing';
import FileUploadSEO from '../components/seo/FileUploadSEO';
import LocalSEOResults from '../components/seo/LocalSEOResults';
import { EnhancedSEOAnalysis } from '../components/analysis';

type TestMode = 'online' | 'local' | 'enhanced';

interface EnhancedSEOConfig {
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
}

const EnhancedSEOTest: React.FC = () => {
  const { actualTheme } = useTheme();
  const [testMode, setTestMode] = useState<TestMode>('online');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const [onlineConfig, setOnlineConfig] = useState<EnhancedSEOConfig>({
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
    technicalAudit: false
  });

  const handleOnlineAnalysis = async () => {
    if (!onlineConfig.url) {
      setError('请输入要分析的URL');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setProgress(0);
    setCurrentStep('准备分析...');

    try {
      const endpoint = onlineConfig.deepCrawl || onlineConfig.competitorAnalysis || 
                     onlineConfig.backlinksAnalysis || onlineConfig.keywordRanking ||
                     onlineConfig.internationalSEO || onlineConfig.technicalAudit
                     ? '/api/test/seo/enhanced'
                     : '/api/test/seo';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: onlineConfig.url,
          options: onlineConfig
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
    const newUrls = [...onlineConfig.competitorUrls];
    newUrls[index] = value;
    setOnlineConfig(prev => ({ ...prev, competitorUrls: newUrls }));
  };

  const addCompetitorUrl = () => {
    setOnlineConfig(prev => ({
      ...prev,
      competitorUrls: [...prev.competitorUrls, '']
    }));
  };

  const removeCompetitorUrl = (index: number) => {
    setOnlineConfig(prev => ({
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
    // 简化的CSV转换
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
    <div className="flex space-x-4 mb-6">
      {[
        { id: 'online', label: '在线分析', icon: Globe, desc: '分析在线网站' },
        { id: 'local', label: '本地分析', icon: Upload, desc: '上传文件分析' },
        { id: 'enhanced', label: '增强分析', icon: TrendingUp, desc: '深度SEO审计' }
      ].map(mode => (
        <button
          key={mode.id}
          onClick={() => setTestMode(mode.id as TestMode)}
          className={`
            flex-1 p-4 rounded-lg border-2 transition-colors
            ${testMode === mode.id
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }
            ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}
          `}
        >
          <div className="flex items-center justify-center mb-2">
            <mode.icon className={`h-6 w-6 ${testMode === mode.id ? 'text-blue-600' : 'text-gray-400'}`} />
          </div>
          <div className={`font-medium ${testMode === mode.id ? 'text-blue-600' : ''}`}>
            {mode.label}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {mode.desc}
          </div>
        </button>
      ))}
    </div>
  );

  const renderOnlineMode = () => (
    <div className="space-y-6">
      <URLInput
        value={onlineConfig.url}
        onChange={(url) => setOnlineConfig(prev => ({ ...prev, url }))}
        placeholder="输入要分析的网站URL..."
        onSubmit={handleOnlineAnalysis}
        disabled={isAnalyzing}
      />

      <div className={`p-6 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border`}>
        <h3 className="text-lg font-semibold mb-4">基础SEO分析选项</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              目标关键词（可选）
            </label>
            <input
              type="text"
              value={onlineConfig.keywords}
              onChange={(e) => setOnlineConfig(prev => ({ ...prev, keywords: e.target.value }))}
              placeholder="输入关键词，用逗号分隔"
              className={`
                w-full px-3 py-2 border rounded-lg
                ${actualTheme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
                }
              `}
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleOnlineAnalysis}
        disabled={!onlineConfig.url || isAnalyzing}
        className={`
          w-full py-3 px-6 rounded-lg font-medium flex items-center justify-center space-x-2
          ${!onlineConfig.url || isAnalyzing
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
          }
        `}
      >
        {isAnalyzing ? (
          <>
            <Loader className="h-5 w-5 animate-spin" />
            <span>分析中...</span>
          </>
        ) : (
          <>
            <Search className="h-5 w-5" />
            <span>开始SEO分析</span>
          </>
        )}
      </button>
    </div>
  );

  const renderEnhancedMode = () => (
    <div className="space-y-6">
      <URLInput
        value={onlineConfig.url}
        onChange={(url) => setOnlineConfig(prev => ({ ...prev, url }))}
        placeholder="输入要分析的网站URL..."
        disabled={isAnalyzing}
      />

      <div className={`p-6 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border`}>
        <h3 className="text-lg font-semibold mb-4">增强分析选项</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 深度爬取 */}
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={onlineConfig.deepCrawl}
                onChange={(e) => setOnlineConfig(prev => ({ ...prev, deepCrawl: e.target.checked }))}
                className="rounded"
              />
              <span className="font-medium">深度爬取分析</span>
            </label>
            
            {onlineConfig.deepCrawl && (
              <div className="ml-6 space-y-2">
                <div>
                  <label className="block text-sm">最大页面数</label>
                  <input
                    type="number"
                    value={onlineConfig.maxPages}
                    onChange={(e) => setOnlineConfig(prev => ({ ...prev, maxPages: parseInt(e.target.value) || 10 }))}
                    min="1"
                    max="100"
                    className="w-20 px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm">爬取深度</label>
                  <input
                    type="number"
                    value={onlineConfig.maxDepth}
                    onChange={(e) => setOnlineConfig(prev => ({ ...prev, maxDepth: parseInt(e.target.value) || 2 }))}
                    min="1"
                    max="5"
                    className="w-20 px-2 py-1 border rounded text-sm"
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
                checked={onlineConfig.competitorAnalysis}
                onChange={(e) => setOnlineConfig(prev => ({ ...prev, competitorAnalysis: e.target.checked }))}
                className="rounded"
              />
              <span className="font-medium">竞争对手分析</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={onlineConfig.backlinksAnalysis}
                onChange={(e) => setOnlineConfig(prev => ({ ...prev, backlinksAnalysis: e.target.checked }))}
                className="rounded"
              />
              <span className="font-medium">反向链接分析</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={onlineConfig.keywordRanking}
                onChange={(e) => setOnlineConfig(prev => ({ ...prev, keywordRanking: e.target.checked }))}
                className="rounded"
              />
              <span className="font-medium">关键词排名</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={onlineConfig.internationalSEO}
                onChange={(e) => setOnlineConfig(prev => ({ ...prev, internationalSEO: e.target.checked }))}
                className="rounded"
              />
              <span className="font-medium">国际化SEO</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={onlineConfig.technicalAudit}
                onChange={(e) => setOnlineConfig(prev => ({ ...prev, technicalAudit: e.target.checked }))}
                className="rounded"
              />
              <span className="font-medium">技术审计</span>
            </label>
          </div>
        </div>

        {/* 竞争对手URL */}
        {onlineConfig.competitorAnalysis && (
          <div className="mt-6">
            <label className="block text-sm font-medium mb-2">
              竞争对手URL
            </label>
            <div className="space-y-2">
              {onlineConfig.competitorUrls.map((url, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleCompetitorUrlChange(index, e.target.value)}
                    placeholder="输入竞争对手URL"
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                  <button
                    onClick={() => removeCompetitorUrl(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    删除
                  </button>
                </div>
              ))}
              <button
                onClick={addCompetitorUrl}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                + 添加竞争对手URL
              </button>
            </div>
          </div>
        )}

        {/* 关键词 */}
        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">
            目标关键词
          </label>
          <input
            type="text"
            value={onlineConfig.keywords}
            onChange={(e) => setOnlineConfig(prev => ({ ...prev, keywords: e.target.value }))}
            placeholder="输入关键词，用逗号分隔"
            className={`
              w-full px-3 py-2 border rounded-lg
              ${actualTheme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
              }
            `}
          />
        </div>
      </div>

      <button
        onClick={handleOnlineAnalysis}
        disabled={!onlineConfig.url || isAnalyzing}
        className={`
          w-full py-3 px-6 rounded-lg font-medium flex items-center justify-center space-x-2
          ${!onlineConfig.url || isAnalyzing
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-purple-600 text-white hover:bg-purple-700'
          }
        `}
      >
        {isAnalyzing ? (
          <>
            <Loader className="h-5 w-5 animate-spin" />
            <span>增强分析中...</span>
          </>
        ) : (
          <>
            <TrendingUp className="h-5 w-5" />
            <span>开始增强SEO分析</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <div className={`min-h-screen p-6 ${actualTheme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">增强SEO分析工具</h1>
          <p className="text-gray-600 dark:text-gray-300">
            专业级SEO分析，支持在线分析、本地文件分析和深度审计
          </p>
        </div>

        {renderModeSelector()}

        {/* 进度显示 */}
        {isAnalyzing && (
          <div className={`mb-6 p-4 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border`}>
            <div className="flex items-center space-x-3 mb-2">
              <Loader className="h-5 w-5 animate-spin text-blue-600" />
              <span className="font-medium">{currentStep}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 错误显示 */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 dark:text-red-200">{error}</span>
            </div>
          </div>
        )}

        {/* 测试模式内容 */}
        <div className="mb-8">
          {testMode === 'online' && renderOnlineMode()}
          {testMode === 'local' && (
            <FileUploadSEO
              onAnalysisComplete={setResults}
              isAnalyzing={isAnalyzing}
              onStartAnalysis={handleLocalAnalysis}
            />
          )}
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
            ) : (
              <EnhancedSEOAnalysis 
                results={results}
                onExport={exportResults}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedSEOTest;
