import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Download, Eye, FileText, TrendingUp, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { FC } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface LocalSEOResultsProps {
  results: any;
  onExport?: (format: string) => void;
}

const LocalSEOResults: React.FC<LocalSEOResultsProps> = ({ results, onExport }) => {
  const { actualTheme } = useTheme();
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [selectedTab, setSelectedTab] = useState<'overview' | 'files' | 'issues' | 'recommendations'>('overview');

  const toggleFileExpansion = (fileId: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(fileId)) {
      newExpanded.delete(fileId);
    } else {
      newExpanded.add(fileId);
    }
    setExpandedFiles(newExpanded);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* 总体评分 */}
      <div className={`p-6 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border`}>
        <div className="text-center">
          <div className={`text-6xl font-bold ${getScoreColor(results.overallScore)}`}>
            {results.overallScore}
          </div>
          <div className="text-lg font-medium mt-2">
            总体SEO评分 ({getScoreGrade(results.overallScore)})
          </div>
          <div className="text-sm text-gray-500 mt-1">
            基于 {results.analyzedFiles} 个文件的分析
          </div>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border`}>
          <div className="text-2xl font-bold text-blue-600">{results.totalFiles}</div>
          <div className="text-sm text-gray-500">总文件数</div>
        </div>

        <div className={`p-4 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border`}>
          <div className="text-2xl font-bold text-green-600">{results.analyzedFiles}</div>
          <div className="text-sm text-gray-500">已分析文件</div>
        </div>

        <div className={`p-4 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border`}>
          <div className="text-2xl font-bold text-red-600">
            {results.issues?.length || 0}
          </div>
          <div className="text-sm text-gray-500">发现问题</div>
        </div>

        <div className={`p-4 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border`}>
          <div className="text-2xl font-bold text-yellow-600">
            {results.recommendations?.length || 0}
          </div>
          <div className="text-sm text-gray-500">优化建议</div>
        </div>
      </div>

      {/* 站点结构 */}
      {results.siteStructure && (
        <div className={`p-6 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border`}>
          <h3 className="text-lg font-semibold mb-4">站点结构分析</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-lg font-bold">{results.siteStructure.totalPages}</div>
              <div className="text-sm text-gray-500">HTML页面</div>
            </div>
            <div>
              <div className="text-lg font-bold">{results.siteStructure.sitemaps}</div>
              <div className="text-sm text-gray-500">站点地图</div>
            </div>
            <div>
              <div className="text-lg font-bold">{results.siteStructure.robotsTxt}</div>
              <div className="text-sm text-gray-500">robots.txt</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderFiles = () => (
    <div className="space-y-4">
      {results.fileAnalysis?.map((file: any, index: number) => (
        <div
          key={index}
          className={`border rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
        >
          <div
            className="p-4 cursor-pointer flex items-center justify-between"
            onClick={() => toggleFileExpansion(file.filename)}
          >
            <div className="flex items-center space-x-3">
              <div className="text-2xl">
                {file.fileType === '.html' ? '🌐' :
                  file.fileType === '.xml' ? '📄' :
                    file.fileType === '.txt' ? '📝' :
                      file.fileType === '.css' ? '🎨' :
                        file.fileType === '.js' ? '⚡' : '📄'}
              </div>
              <div>
                <div className="font-medium">{file.filename}</div>
                <div className="text-sm text-gray-500">
                  {file.fileType} • {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className={`text-lg font-bold ${getScoreColor(file.score)}`}>
                {file.score}
              </div>
              {expandedFiles.has(file.filename) ?
                <ChevronDown className="h-5 w-5" /> :
                <ChevronRight className="h-5 w-5" />
              }
            </div>
          </div>

          {expandedFiles.has(file.filename) && (
            <div className="px-4 pb-4 border-t">
              {file.analysis && (
                <div className="mt-4 space-y-4">
                  {/* HTML文件详细信息 */}
                  {file.analysis.type === 'html' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium mb-2">页面信息</h5>
                        <div className="space-y-1 text-sm">
                          <div>标题: {file.analysis.title || '无'}</div>
                          <div>Meta描述: {file.analysis.metaDescription || '无'}</div>
                          <div>H1标签: {file.analysis.headings?.filter((h: any) => h.level === 1).length || 0} 个</div>
                          <div>图片: {file.analysis.images?.length || 0} 个</div>
                          <div>链接: {file.analysis.links?.length || 0} 个</div>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium mb-2">SEO检查</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center space-x-2">
                            {file.analysis.technicalSEO?.canonical ?
                              <CheckCircle className="h-4 w-4 text-green-500" /> :
                              <XCircle className="h-4 w-4 text-red-500" />
                            }
                            <span>Canonical标签</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {file.analysis.openGraph && Object.keys(file.analysis.openGraph).length > 0 ?
                              <CheckCircle className="h-4 w-4 text-green-500" /> :
                              <XCircle className="h-4 w-4 text-red-500" />
                            }
                            <span>Open Graph</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {file.analysis.structuredData?.length > 0 ?
                              <CheckCircle className="h-4 w-4 text-green-500" /> :
                              <XCircle className="h-4 w-4 text-red-500" />
                            }
                            <span>结构化数据</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 站点地图信息 */}
                  {file.analysis.type === 'xml' && file.analysis.isSitemap && (
                    <div>
                      <h5 className="font-medium mb-2">站点地图信息</h5>
                      <div className="text-sm">
                        <div>URL数量: {file.analysis.urls?.length || 0}</div>
                        {file.analysis.urls?.slice(0, 3).map((url: any, i: number) => (
                          <div key={i} className="text-gray-500 truncate">
                            {url.loc}
                          </div>
                        ))}
                        {file.analysis.urls?.length > 3 && (
                          <div className="text-gray-500">
                            ... 还有 {file.analysis.urls.length - 3} 个URL
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* robots.txt信息 */}
                  {file.analysis.type === 'txt' && file.analysis.isRobotsTxt && (
                    <div>
                      <h5 className="font-medium mb-2">robots.txt规则</h5>
                      <div className="text-sm space-y-1">
                        {file.analysis.directives?.slice(0, 5).map((directive: any, i: number) => (
                          <div key={i} className="font-mono text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded">
                            {directive.directive}: {directive.path}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 问题列表 */}
                  {file.issues && file.issues.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2">发现的问题</h5>
                      <div className="space-y-2">
                        {file.issues.map((issue: any, i: number) => (
                          <div key={i} className="flex items-start space-x-2 text-sm">
                            {getSeverityIcon(issue.severity)}
                            <span>{issue.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderIssues = () => (
    <div className="space-y-4">
      {results.issues?.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <p>未发现严重问题！</p>
        </div>
      ) : (
        results.issues?.map((issue: any, index: number) => (
          <div
            key={index}
            className={`p-4 rounded-lg border-l-4 ${issue.severity === 'high' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                issue.severity === 'medium' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                  'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              } ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
          >
            <div className="flex items-start space-x-3">
              {getSeverityIcon(issue.severity)}
              <div className="flex-1">
                <div className="font-medium">{issue.type}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {issue.message}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderRecommendations = () => (
    <div className="space-y-4">
      {results.recommendations?.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 text-blue-500" />
          <p>暂无优化建议</p>
        </div>
      ) : (
        results.recommendations?.map((rec: any, index: number) => (
          <div
            key={index}
            className={`p-4 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border`}
          >
            <div className="flex items-start space-x-3">
              <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium">{rec.title || rec.type}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {rec.description || rec.message}
                </div>
                {rec.priority && (
                  <div className={`inline-block px-2 py-1 rounded text-xs mt-2 ${rec.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                    {rec.priority === 'high' ? '高优先级' :
                      rec.priority === 'medium' ? '中优先级' : '低优先级'}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 标题和导出按钮 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">本地SEO分析结果</h2>
        {onExport && (
          <div className="flex space-x-2">
            <button
              onClick={() => onExport('json')}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>JSON</span>
            </button>
            <button
              onClick={() => onExport('csv')}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: '概览', icon: Eye },
            { id: 'files', label: '文件详情', icon: FileText },
            { id: 'issues', label: '问题', icon: AlertTriangle },
            { id: 'recommendations', label: '建议', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`
                flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm
                ${selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 标签页内容 */}
      <div>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'files' && renderFiles()}
        {selectedTab === 'issues' && renderIssues()}
        {selectedTab === 'recommendations' && renderRecommendations()}
      </div>
    </div>
  );
};

export default LocalSEOResults;
