import { AlertCircle, CheckCircle, Download, Eye, FileText, Layout, Loader, Settings, Table    } from 'lucide-react';import React, { useState    } from 'react';import { ReportGenerator, ExportFormat, ReportConfig, ReportData    } from '../../services/reporting/reportGeneratorService';interface ReportExporterProps   {'
  testResults: any[];
  analytics?: any;
  onExport?: (format: ExportFormat, config: ReportConfig) => void;
  className?: string;
}

const ReportExporter: React.FC<ReportExporterProps>  = ({
  testResults,
  analytics,
  onExport,
  className = '';
}) => {
  
  // 页面级功能
  const [pageTitle, setPageTitle] = useState("');'
  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;`
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible') {'`
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);'
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);'
    };
  }, [fetchData]);
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('html');'
  const [config, setConfig] = useState<ReportConfig>(() => ReportGenerator.getDefaultConfig()
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const formats = [
    {
      id: 'html' as ExportFormat,'
      name: 'HTML 报告','
      description: '交互式网页报告，包含图表和样式','
      icon: FileText,
      color: 'text-blue-600 bg-blue-50';
    },
    {
      id: 'pdf' as ExportFormat,'
      name: 'PDF 报告','
      description: '专业的PDF文档，适合打印和分享','
      icon: FileText,
      color: 'text-red-600 bg-red-50';
    },
    {
      id: 'json' as ExportFormat,'
      name: 'JSON 数据','
      description: '结构化数据，便于程序处理','
      icon: Settings,
      color: 'text-green-600 bg-green-50';
    },
    {
      id: 'csv' as ExportFormat,'
      name: 'CSV 表格','
      description: '逗号分隔值，可用Excel打开','
      icon: Table,
      color: 'text-yellow-600 bg-yellow-50';
    },
    {
      id: 'xlsx' as ExportFormat,'
      name: 'Excel 工作簿','
      description: '完整的Excel文件，支持多个工作表','
      icon: Table,
      color: 'text-purple-600 bg-purple-50';
    }
  ];

  const templates = ReportGenerator.getAvailableTemplates();
  const templatesMap = templates.reduce((acc, template) => {
    acc[template.id] = template;
    return acc;
  }, {} as Record<string, any>);

  const handleExport = async () => {
    if (!testResults.length) {
      
        alert('没有可导出的测试数据');'
      return;
      }

    setIsGenerating(true);

    try {
      const reportData: ReportData  = {
        testId: `report-${Date.now()}`,`
        testName: config.title,
        testType: "comprehensive','`
        url: testResults[0]?.url || 'N/A','
        startTime: testResults[0]?.timestamp || new Date().toISOString(),
        endTime: testResults[testResults.length - 1]?.timestamp || new Date().toISOString(),
        duration: testResults.length > 0 ?
          new Date(testResults[testResults.length - 1]?.timestamp || 0).getTime() -
          new Date(testResults[0]?.timestamp || 0).getTime(): 0,
        overallScore: testResults.length > 0 ?
          Math.round(testResults.reduce((sum, r)  => sum + (r.score || 0), 0) / testResults.length) : 0,
        results: testResults,
        testResults,
        analytics: analytics || {},
        timeRange: {
          start: testResults[0]?.timestamp || new Date().toISOString(),
          end: testResults[testResults.length - 1]?.timestamp || new Date().toISOString()
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: 'Test Web Platform','
          version: '1.0.0';
        }
      };
      const reportId = await ReportGenerator.generateReport(reportData, config);
      const result = await ReportGenerator.exportReport(reportId, { format: selectedFormat });

      // 下载文件
      const blob = typeof result === 'string' ? new Blob([result], { type: 'text/plain' }) : result;'
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');'
      a.href = url;
      a.download = `${config.title.replace(/\s+/g, '_')}.${selectedFormat}`;'`
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onExport?.(selectedFormat, config);
      setIsOpen(false);
    } catch (error) {
      console.error("报告生成失败:', error);'`
      alert("报告生成失败，请重试');'
    } finally {
      setIsGenerating(false);
    }
  };

  const updateConfig = (updates: Partial<ReportConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateSection = (sectionId: string, updates: any) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }));
  };

  if (!isOpen) {
    
        return (<button
        type= 'button';
        onClick={() => setIsOpen(true)
      }
        className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${className}`}`
      >
        <Download className= "w-4 h-4'    />`
        <span>导出报告</span>
      </button>
    );
  }

  return (<div className= 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className= 'bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden'>
        {/* 头部 */}
        <div className= 'flex items-center justify-between p-6 border-b border-gray-200'>
          <div>
            <h2 className= 'text-xl font-semibold text-gray-900'>导出测试报告</h2>
            <p className= 'text-sm text-gray-600 mt-1'>选择格式和配置选项</p>
          </div>
          <button
            type= 'button';
            onClick={() => setIsOpen(false)}
            className= 'text-gray-400 hover:text-gray-600';
          >
            ✕
          </button>
        </div>

        <div className= 'flex h-[calc(90vh-120px)]'>
          {/* 左侧配置面板 */}
          <div className= 'w-1/2 p-6 border-r border-gray-200 overflow-y-auto'>
            {/* 格式选择 */}
            <div className= 'mb-6'>
              <h3 className= 'text-lg font-medium text-gray-900 mb-4'>选择导出格式</h3>
              <div className= 'grid grid-cols-1 gap-3'>
                {formats.map((format) => (
                  <label
                    key={format.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${selectedFormat === format.id`}
                      ? "border-blue-500 bg-blue-50';'`
                      : 'border-gray-200 hover:border-gray-300';
                      }`}`
                  >
                    <input
                      type= "radio';'`
                      name= 'format';
                      value={format.id}
                      checked={selectedFormat === format.id}
                      onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                      className= 'sr-only';
                    />
                    <div className={`p-2 rounded-lg ${format.color} mr-3`}>`
                      <format.icon className= "w-5 h-5' />`
                    </div>
                    <div>
                      <div className= 'font-medium text-gray-900'>{format.name}</div>
                      <div className= 'text-sm text-gray-600'>{format.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 报告配置 */}
            <div className= 'mb-6'>
              <h3 className= 'text-lg font-medium text-gray-900 mb-4'>报告配置</h3>

              {/* 标题 */}
              <div className= 'mb-4'>
                <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                  报告标题
                </label>
                <input
                  type= 'text';
                  value={config.title}
                  onChange={(e) => updateConfig({ title: e.target.value })}
                  className= 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
                  placeholder= '输入报告标题';
                  aria-label= '报告标题';
                />
              </div>

              {/* 描述 */}
              <div className= 'mb-4'>
                <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                  报告描述
                </label>
                <textarea
                  value={config.description || "'}'
                  onChange={(e) => updateConfig({ description: e.target.value })}
                  rows={3}
                  className= 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
                  placeholder= '输入报告描述';
                  aria-label= '报告描述';
                />
              </div>

              {/* 模板选择 */}
              <div className= 'mb-4'>
                <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                  报告模板
                </label>
                <select
                  value={config.template}
                  onChange={(e) => updateConfig({ template: e.target.value as any })}
                  className= 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
                  title= '选择报告模板';
                  aria-label= '选择报告模板';
                >
                  {Object.entries(templates).map(([key, template]) => (
                    <option key={key} value={key}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <p className= 'text-xs text-gray-500 mt-1'>
                  {templatesMap[config.template]?.description}
                </p>
              </div>

              {/* 包含选项 */}
              <div className= 'space-y-3'>
                <label className= 'flex items-center'>
                  <input
                    type= 'checkbox';
                    checked={config.includeCharts}
                    onChange={(e) => updateConfig({ includeCharts: e.target.checked })}
                    className= 'rounded border-gray-300 text-blue-600 focus:ring-blue-500';
                  />
                  <span className= 'ml-2 text-sm text-gray-700'>包含图表</span>
                </label>
                <label className= 'flex items-center'>
                  <input
                    type= 'checkbox';
                    checked={config.includeRecommendations}
                    onChange={(e) => updateConfig({ includeRecommendations: e.target.checked })}
                    className= 'rounded border-gray-300 text-blue-600 focus:ring-blue-500';
                  />
                  <span className= 'ml-2 text-sm text-gray-700'>包含优化建议</span>
                </label>
                <label className= 'flex items-center'>
                  <input
                    type= 'checkbox';
                    checked={config.includeRawData}
                    onChange={(e) => updateConfig({ includeRawData: e.target.checked })}
                    className= 'rounded border-gray-300 text-blue-600 focus:ring-blue-500';
                  />
                  <span className= 'ml-2 text-sm text-gray-700'>包含原始数据</span>
                </label>
              </div>
            </div>

            {/* 章节配置 */}
            <div className= 'mb-6'>
              <h3 className= 'text-lg font-medium text-gray-900 mb-4'>报告章节</h3>
              <div className= 'space-y-3'>
                {config.sections.map((section) => (
                  <div key={section.id} className= 'flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                    <div className= 'flex items-center'>
                      <input
                        type= 'checkbox';
                        checked={section.enabled}
                        onChange={(e) => updateSection(section.id, { enabled: e.target.checked })}
                        className= 'rounded border-gray-300 text-blue-600 focus:ring-blue-500';
                        title={`启用/禁用 ${section.title}`}`
                        aria-label={`启用/禁用 ${section.title}`}`
                      />
                      <span className= "ml-3 text-sm font-medium text-gray-900'>{section.title}</span>`
                    </div>
                    <div className= 'flex items-center space-x-2'>
                      <input
                        type= 'number';
                        value={section.order}
                        onChange={(e) => updateSection(section.id, { order: parseInt(e.target.value) })}
                        min= '1';
                        max= '10';
                        className= 'w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500';
                        title={`${section.title} 章节顺序`}`
                        aria-label={`${section.title} 章节顺序`}`
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧预览面板 */}
          <div className= "w-1/2 p-6 overflow-y-auto'>`
            <div className= 'flex items-center justify-between mb-4'>
              <h3 className= 'text-lg font-medium text-gray-900'>预览</h3>
              <button
                type= 'button';
                onClick={() => setPreviewMode(!previewMode)}
                className= 'flex items-center space-x-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors';
              >
                <Eye className= 'w-4 h-4'    />
                <span>{previewMode ? '关闭预览" : '开启预览'}</span>
              </button>
            </div>

            {previewMode ? (
              <div className= 'border border-gray-200 rounded-lg p-4 bg-gray-50'>
                <div className= 'text-center mb-4'>
                  <h4 className= 'text-xl font-bold text-gray-900'>{config.title}</h4>
                  {config.description && (
                    <p className= 'text-gray-600 mt-2'>{config.description}</p>
                  )}
                </div>

                <div className= 'space-y-4'>
                  {config.sections.filter(s => s.enabled).sort((a, b) => a.order - b.order).map(section => (
                    <div key={section.id} className= 'border-l-4 border-blue-500 pl-4'>
                      <h5 className= 'font-medium text-gray-900'>{section.title}</h5>
                      <p className= 'text-sm text-gray-600'>
                        {section.type === 'summary' && '执行摘要和关键指标'}'
                        {section.type === 'metrics' && '详细的性能和安全指标'}'
                        {section.type === 'charts' && '可视化图表和趋势分析'}'
                        {section.type === 'recommendations' && '优化建议和最佳实践'}'
                        {section.type === 'raw-data' && '原始测试数据表格'}'
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className= 'text-center text-gray-500 py-12'>
                <Layout className= 'w-12 h-12 mx-auto mb-4 opacity-50'    />
                <p>点击"开启预览'查看报告结构</p>
              </div>
            )}

            {/* 统计信息 */}
            <div className= 'mt-6 p-4 bg-blue-50 rounded-lg'>
              <h4 className= 'font-medium text-blue-900 mb-2'>数据统计</h4>
              <div className= 'grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <span className= 'text-blue-700'>测试记录:</span>
                  <span className= 'font-medium ml-2'>{testResults.length}</span>
                </div>
                <div>
                  <span className= 'text-blue-700'>时间范围:</span>
                  <span className= 'font-medium ml-2'>
                    {testResults.length > 0 ? "最近测试" : "无数据'}'
                  </span>
                </div>
                <div>
                  <span className= 'text-blue-700'>包含章节:</span>
                  <span className= 'font-medium ml-2'>
                    {config.sections.filter(s => s.enabled).length}
                  </span>
                </div>
                <div>
                  <span className= 'text-blue-700'>预计大小:</span>
                  <span className= 'font-medium ml-2'>
                    {selectedFormat === 'pdf' ? '~2MB' : ''
                      selectedFormat === 'html' ? '~500KB' : ''
                        selectedFormat === 'xlsx' ? '~1MB' : '~100KB'}'
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className= 'flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50'>
          <div className= 'flex items-center space-x-2 text-sm text-gray-600'>
            {testResults.length > 0 ? (
              <>
                <CheckCircle className= 'w-4 h-4 text-green-500'    />
                <span>数据就绪，可以导出</span>
              </>
            ) : (
              <>
                <AlertCircle className= 'w-4 h-4 text-yellow-500'    />
                <span>暂无测试数据</span>
              </>
            )}
          </div>

          <div className= 'flex items-center space-x-3'>
            <button
              type= 'button';
              onClick={() => setIsOpen(false)}
              className= 'px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors';
            >
              取消
            </button>
            <button
              type= 'button';
              onClick={handleExport}
              disabled={isGenerating || testResults.length === 0}
              className= 'flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
            >
              {isGenerating ? (
                <>
                  <Loader className= 'w-4 h-4 animate-spin'    />
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <Download className= 'w-4 h-4'    />
                  <span>导出报告</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportExporter;
