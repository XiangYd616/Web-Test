import {AlertTriangle, CheckCircle, FileText, Info, Link, Search, XCircle} from 'lucide-react';
import React from 'react';
import {TechnicalSEOResult} from '../../services/testing/seoTestService';

interface TechnicalResultsProps {
  results: TechnicalSEOResult;
}

const TechnicalResults: React.FC<TechnicalResultsProps> = ({ results }) => {
  const getStatusIcon = (status: boolean | undefined, hasIssues?: boolean) => {
    if (status === undefined) return <Info className="w-5 h-5 text-gray-400" />;
    if (hasIssues) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return status ?
      <CheckCircle className="w-5 h-5 text-green-500" /> :
      <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusText = (status: boolean | undefined, successText: string, failText: string) => {
    if (status === undefined) return '未检测';
    return status ? successText : failText;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* 技术SEO评分概览 */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Search className="w-5 h-5 mr-2 text-blue-400" />
            技术SEO评分
          </h3>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getScoreColor(results.score)}`}>
              {results.score}/100
            </div>
            <div className="text-xs text-gray-400">技术健康度</div>
          </div>
        </div>
      </div>

      {/* 基础技术检查 */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-green-400" />
          基础技术检查
        </h3>

        <div className="space-y-4">
          {/* robots.txt */}
          <div className="flex items-start space-x-3 p-3 bg-gray-700/30 rounded-lg">
            {getStatusIcon(results.robotsTxt?.exists && results.robotsTxt?.accessible)}
            <div className="flex-1">
              <div className="font-medium text-white">robots.txt</div>
              <div className="text-sm text-gray-400 mt-1">
                {getStatusText(
                  results.robotsTxt?.exists && results.robotsTxt?.accessible,
                  '文件存在且可访问',
                  '文件不存在或无法访问'
                )}
              </div>
              {results.robotsTxt?.issues && results.robotsTxt.issues.length > 0 && (
                <div className="text-xs text-red-400 mt-1">
                  问题: {results.robotsTxt.issues.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* sitemap */}
          <div className="flex items-start space-x-3 p-3 bg-gray-700/30 rounded-lg">
            {getStatusIcon(results.sitemap?.exists && results.sitemap?.accessible)}
            <div className="flex-1">
              <div className="font-medium text-white">XML Sitemap</div>
              <div className="text-sm text-gray-400 mt-1">
                {results.sitemap?.exists && results.sitemap?.accessible
                  ? `发现 ${results.sitemap.urls || 0} 个URL`
                  : '未找到sitemap文件'}
              </div>
              {results.sitemap?.urls && (
                <div className="text-xs text-blue-400 mt-1">
                  包含 {results.sitemap.urls} 个URL
                </div>
              )}
            </div>
          </div>

          {/* canonical标签 */}
          <div className="flex items-start space-x-3 p-3 bg-gray-700/30 rounded-lg">
            {getStatusIcon(results.canonicalTags?.present, !results.canonicalTags?.correct)}
            <div className="flex-1">
              <div className="font-medium text-white">Canonical标签</div>
              <div className="text-sm text-gray-400 mt-1">
                {results.canonicalTags?.present
                  ? (results.canonicalTags?.correct ? '配置正确' : '存在但需要优化')
                  : '未发现canonical标签'}
              </div>
              {results.canonicalTags?.issues && results.canonicalTags.issues.length > 0 && (
                <div className="text-xs text-red-400 mt-1">
                  问题: {results.canonicalTags.issues.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* meta robots */}
          <div className="flex items-start space-x-3 p-3 bg-gray-700/30 rounded-lg">
            {getStatusIcon(results.metaRobots?.present, results.metaRobots?.issues?.length > 0)}
            <div className="flex-1">
              <div className="font-medium text-white">Meta Robots</div>
              <div className="text-sm text-gray-400 mt-1">
                {results.metaRobots?.present
                  ? (results.metaRobots?.issues?.length > 0 ? '存在但有问题' : '配置正确')
                  : '未发现meta robots标签'}
              </div>
              {results.metaRobots?.content && (
                <div className="text-xs text-blue-400 mt-1">
                  内容: {results.metaRobots.content}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* URL结构分析 */}
      {results.urlStructure && (
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Link className="w-5 h-5 mr-2 text-purple-400" />
            URL结构分析
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-700/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">URL友好性</span>
                <span className={`text-sm font-bold ${getScoreColor(results.urlStructure.score)}`}>
                  {results.urlStructure.score}/100
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {results.urlStructure.friendly ? 'URL结构友好' : 'URL结构需要优化'}
              </div>
            </div>

            <div className="p-3 bg-gray-700/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">HTTPS使用</span>
                {getStatusIcon(results.urlStructure.https)}
              </div>
              <div className="text-xs text-gray-400">
                {results.urlStructure.https ? '使用安全连接' : '建议启用HTTPS'}
              </div>
            </div>
          </div>

          {results.urlStructure.issues && results.urlStructure.issues.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium text-white mb-2">发现的问题:</div>
              <div className="space-y-1">
                {results.urlStructure.issues.slice(0, 3).map((issue, index) => (
                  <div key={index} className="text-xs text-red-400 flex items-start">
                    <XCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                    {issue}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 技术问题汇总 */}
      {(() => {
        // 从各个模块收集问题
        const allIssues = [
          ...results.robotsTxt?.issues || [],
          ...results.sitemap?.issues || [],
          ...results.canonicalTags?.issues || [],
          ...results.metaRobots?.issues || [],
          ...results.hreflang?.issues || [],
          ...results.urlStructure?.issues || []
        ];

        return allIssues.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
              技术问题汇总
            </h3>

            <div className="space-y-3">
              {allIssues.slice(0, 5).map((issue: any, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-300">{issue}</span>
                </div>
              ))}

              {allIssues.length > 5 && (
                <div className="text-center">
                  <span className="text-xs text-gray-400">
                    还有 {allIssues.length - 5} 个问题未显示
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 技术SEO建议 */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-300">
            <strong>技术SEO提示：</strong>
            确保robots.txt和sitemap.xml文件正确配置，使用canonical标签避免重复内容，
            保持URL结构简洁友好，这些都是搜索引擎优化的基础要素。
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicalResults;
