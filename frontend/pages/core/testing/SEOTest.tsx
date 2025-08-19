import React, { useState } from 'react';
import { Search, Globe, CheckCircle, AlertCircle, Clock, Play, Pause, Square } from 'lucide-react';

interface SEOTestConfig {
  url: string;
  checkMeta: boolean;
  checkHeadings: boolean;
  checkImages: boolean;
  checkLinks: boolean;
  checkStructuredData: boolean;
  checkMobileFriendly: boolean;
  checkPageSpeed: boolean;
}

interface SEOTestResult {
  score: number;
  metaTags: { title: boolean; description: boolean; keywords: boolean };
  headings: { h1Count: number; structure: boolean };
  images: { withAlt: number; total: number };
  links: { internal: number; external: number; broken: number };
  pageSpeed: { score: number; loadTime: number };
  mobile: { friendly: boolean; responsive: boolean };
}

const SEOTest: React.FC = () => {
  const [config, setConfig] = useState<SEOTestConfig>({
    url: '',
    checkMeta: true,
    checkHeadings: true,
    checkImages: true,
    checkLinks: true,
    checkStructuredData: true,
    checkMobileFriendly: true,
    checkPageSpeed: true,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<SEOTestResult | null>(null);

  const handleStartTest = () => {
    if (!config.url) return;
    
    setIsRunning(true);
    // 模拟测试过程
    setTimeout(() => {
      setResults({
        score: 85,
        metaTags: { title: true, description: true, keywords: false },
        headings: { h1Count: 1, structure: true },
        images: { withAlt: 8, total: 10 },
        links: { internal: 25, external: 5, broken: 1 },
        pageSpeed: { score: 78, loadTime: 2.3 },
        mobile: { friendly: true, responsive: true }
      });
      setIsRunning(false);
    }, 3000);
  };

  const handleStopTest = () => {
    setIsRunning(false);
  };

  return (
    <div className="seo-test-container">
      <div className="page-header mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Search className="w-6 h-6 text-blue-400" />
          SEO测试
        </h2>
        <p className="text-gray-400 mt-2">
          全面分析网站SEO优化状况，提供详细的优化建议
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 测试配置 */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">测试配置</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  目标URL *
                </label>
                <input
                  type="url"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">检查项目</h4>
                
                {[
                  { key: 'checkMeta', label: 'Meta标签检查' },
                  { key: 'checkHeadings', label: '标题结构检查' },
                  { key: 'checkImages', label: '图片优化检查' },
                  { key: 'checkLinks', label: '链接检查' },
                  { key: 'checkStructuredData', label: '结构化数据' },
                  { key: 'checkMobileFriendly', label: '移动友好性' },
                  { key: 'checkPageSpeed', label: '页面速度' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config[key as keyof SEOTestConfig] as boolean}
                      onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                      className="mr-2 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">{label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleStartTest}
                  disabled={!config.url || isRunning}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  开始测试
                </button>
                <button
                  onClick={handleStopTest}
                  disabled={!isRunning}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 测试结果 */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">测试结果</h3>
            
            {isRunning ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Clock className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">正在进行SEO分析...</p>
                </div>
              </div>
            ) : results ? (
              <div className="space-y-6">
                {/* SEO总分 */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">{results.score}</div>
                  <div className="text-gray-400">SEO总分</div>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm mt-2 ${
                    results.score >= 80 ? 'bg-green-600 text-white' :
                    results.score >= 60 ? 'bg-yellow-600 text-white' :
                    'bg-red-600 text-white'
                  }`}>
                    {results.score >= 80 ? '优秀' : results.score >= 60 ? '良好' : '需要改进'}
                  </div>
                </div>

                {/* 详细结果 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">Meta标签</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">标题标签</span>
                        {results.metaTags.title ? 
                          <CheckCircle className="w-4 h-4 text-green-400" /> :
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        }
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">描述标签</span>
                        {results.metaTags.description ? 
                          <CheckCircle className="w-4 h-4 text-green-400" /> :
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        }
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">关键词标签</span>
                        {results.metaTags.keywords ? 
                          <CheckCircle className="w-4 h-4 text-green-400" /> :
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        }
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">图片优化</h4>
                    <div className="text-sm text-gray-300">
                      <div>总图片数: {results.images.total}</div>
                      <div>有Alt属性: {results.images.withAlt}</div>
                      <div className="mt-2">
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${(results.images.withAlt / results.images.total) * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {Math.round((results.images.withAlt / results.images.total) * 100)}% 优化率
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">链接分析</h4>
                    <div className="space-y-1 text-sm text-gray-300">
                      <div>内部链接: {results.links.internal}</div>
                      <div>外部链接: {results.links.external}</div>
                      <div className="text-red-400">损坏链接: {results.links.broken}</div>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">页面速度</h4>
                    <div className="text-sm text-gray-300">
                      <div>速度评分: {results.pageSpeed.score}</div>
                      <div>加载时间: {results.pageSpeed.loadTime}s</div>
                      <div className="mt-2">
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              results.pageSpeed.score >= 80 ? 'bg-green-500' :
                              results.pageSpeed.score >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${results.pageSpeed.score}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>请配置测试参数并开始SEO分析</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SEOTest;
