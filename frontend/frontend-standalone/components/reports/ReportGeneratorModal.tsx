/**
 * 报告生成器模态框组件
 * 提供丰富的报告定制选项和多格式导出功能
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  Image,
  FileSpreadsheet,
  FileArchive,
  Settings,
  Palette,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ReportTemplate {
  key: string;
  name: string;
  description: string;
  sections: string[];
  style: string;
  preview?: string;
}

interface ReportFormat {
  key: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  size?: string;
}

interface BrandingOptions {
  logo?: string;
  companyName: string;
  primaryColor: string;
  secondaryColor?: string;
  includeWatermark: boolean;
}

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  testData: any[];
  onGenerate: (reportConfig: any) => Promise<void>;
}

const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({
  isOpen,
  onClose,
  testData,
  onGenerate
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // 报告配置状态
  const [reportConfig, setReportConfig] = useState({
    template: 'technical',
    format: 'html',
    title: '测试分析报告',
    description: '',
    dateRange: {
      start: '',
      end: ''
    },
    includeCharts: true,
    includeRecommendations: true,
    includeDetailedResults: true,
    customSections: [],
    brandingOptions: {
      logo: null,
      companyName: 'Test-Web Platform',
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      includeWatermark: false
    } as BrandingOptions
  });

  // 可用模板
  const templates: ReportTemplate[] = [
    {
      key: 'executive',
      name: '高管摘要报告',
      description: '简洁的高层管理报告，专注于关键指标和建议',
      sections: ['summary', 'key_metrics', 'recommendations', 'cost_impact'],
      style: 'professional',
      preview: '📊 适合高层决策者的精简报告'
    },
    {
      key: 'technical',
      name: '技术详细报告',
      description: '包含完整技术细节的综合分析报告',
      sections: ['summary', 'detailed_metrics', 'performance_analysis', 'security_analysis', 'recommendations', 'appendix'],
      style: 'detailed',
      preview: '🔧 技术人员需要的详细分析'
    },
    {
      key: 'compliance',
      name: '合规性报告',
      description: '专注于安全合规性和风险评估',
      sections: ['compliance_summary', 'security_analysis', 'vulnerability_assessment', 'remediation_plan'],
      style: 'security',
      preview: '🛡️ 安全和合规专用报告'
    },
    {
      key: 'performance',
      name: '性能优化报告',
      description: '专门分析性能指标和优化机会',
      sections: ['performance_summary', 'core_web_vitals', 'performance_timeline', 'optimization_opportunities'],
      style: 'performance',
      preview: '⚡ 网站性能优化专用'
    },
    {
      key: 'comparison',
      name: '对比分析报告',
      description: '多时期测试结果的趋势对比分析',
      sections: ['comparison_summary', 'trend_analysis', 'improvement_tracking', 'benchmark_comparison'],
      style: 'analytical',
      preview: '📈 时间序列趋势分析'
    }
  ];

  // 支持的格式
  const formats: ReportFormat[] = [
    {
      key: 'html',
      name: 'HTML报告',
      description: '交互式网页报告，支持图表和动画',
      icon: <Eye className="w-5 h-5" />,
      size: '~2-5MB'
    },
    {
      key: 'pdf',
      name: 'PDF文档',
      description: '标准PDF文档，适合打印和分享',
      icon: <FileText className="w-5 h-5" />,
      size: '~1-3MB'
    },
    {
      key: 'excel',
      name: 'Excel表格',
      description: '数据表格格式，便于进一步分析',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      size: '~500KB-2MB'
    },
    {
      key: 'word',
      name: 'Word文档',
      description: '可编辑的文档格式',
      icon: <FileArchive className="w-5 h-5" />,
      size: '~1-4MB'
    }
  ];

  // 预定义颜色主题
  const colorThemes = [
    { name: '商务蓝', primary: '#2563eb', secondary: '#64748b' },
    { name: '专业紫', primary: '#7c3aed', secondary: '#6b7280' },
    { name: '安全红', primary: '#dc2626', secondary: '#991b1b' },
    { name: '性能橙', primary: '#ea580c', secondary: '#c2410c' },
    { name: '分析青', primary: '#0891b2', secondary: '#0e7490' },
    { name: '成功绿', primary: '#059669', secondary: '#047857' }
  ];

  useEffect(() => {
    if (testData.length > 0) {
      // 自动设置日期范围
      const dates = testData.map(test => new Date(test.created_at || test.timestamp)).filter(d => !isNaN(d.getTime()));
      if (dates.length > 0) {
        dates.sort((a, b) => a.getTime() - b.getTime());
        setReportConfig(prev => ({
          ...prev,
          dateRange: {
            start: dates[0].toISOString().split('T')[0],
            end: dates[dates.length - 1].toISOString().split('T')[0]
          }
        }));
      }
    }
  }, [testData]);

  const handleConfigChange = (key: string, value: any) => {
    setReportConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleBrandingChange = (key: string, value: any) => {
    setReportConfig(prev => ({
      ...prev,
      brandingOptions: {
        ...prev.brandingOptions,
        [key]: value
      }
    }));
  };

  const handleGenerate = async () => {
    if (!reportConfig.title.trim()) {
      toast.error('请输入报告标题');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      // 模拟生成进度
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 20;
        });
      }, 500);

      await onGenerate(reportConfig);
      
      clearInterval(progressInterval);
      setGenerationProgress(100);
      
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
        onClose();
        toast.success('报告生成成功！');
      }, 1000);
      
    } catch (error) {
      setIsGenerating(false);
      setGenerationProgress(0);
      console.error('生成报告失败:', error);
      toast.error('报告生成失败，请重试');
    }
  };

  const selectedTemplate = templates.find(t => t.key === reportConfig.template);
  const selectedFormat = formats.find(f => f.key === reportConfig.format);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">生成测试报告</h2>
              <p className="text-sm text-gray-500">
                自定义报告模板、格式和样式设置
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isGenerating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center p-4 bg-gray-50 border-b">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === currentStep 
                  ? 'bg-blue-600 text-white' 
                  : step < currentStep 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-300 text-gray-600'
              }`}>
                {step < currentStep ? <CheckCircle className="w-4 h-4" /> : step}
              </div>
              {step < 4 && (
                <div className={`w-16 h-0.5 mx-2 ${
                  step < currentStep ? 'bg-green-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* 步骤 1: 模板选择 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">选择报告模板</h3>
                <p className="text-gray-600 mb-4">
                  根据您的需要选择合适的报告模板，不同模板会包含不同的分析维度和内容结构。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.key}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      reportConfig.template === template.key
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => handleConfigChange('template', template.key)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{template.name}</h4>
                      {reportConfig.template === template.key && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    {template.preview && (
                      <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        {template.preview}
                      </div>
                    )}
                    <div className="mt-3 text-xs text-gray-500">
                      包含: {template.sections.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 步骤 2: 基本配置 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">基本配置</h3>
                <p className="text-gray-600 mb-4">
                  设置报告的基本信息和包含的内容范围。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左列 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      报告标题 *
                    </label>
                    <input
                      type="text"
                      value={reportConfig.title}
                      onChange={(e) => handleConfigChange('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="输入报告标题"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      报告描述
                    </label>
                    <textarea
                      value={reportConfig.description}
                      onChange={(e) => handleConfigChange('description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="可选：添加报告描述或目的说明"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      时间范围
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={reportConfig.dateRange.start}
                        onChange={(e) => handleConfigChange('dateRange', { 
                          ...reportConfig.dateRange, 
                          start: e.target.value 
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="date"
                        value={reportConfig.dateRange.end}
                        onChange={(e) => handleConfigChange('dateRange', { 
                          ...reportConfig.dateRange, 
                          end: e.target.value 
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* 右列 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      包含内容
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={reportConfig.includeCharts}
                          onChange={(e) => handleConfigChange('includeCharts', e.target.checked)}
                          className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <PieChart className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="text-sm">包含图表和可视化</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={reportConfig.includeRecommendations}
                          onChange={(e) => handleConfigChange('includeRecommendations', e.target.checked)}
                          className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <TrendingUp className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="text-sm">包含优化建议</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={reportConfig.includeDetailedResults}
                          onChange={(e) => handleConfigChange('includeDetailedResults', e.target.checked)}
                          className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <FileText className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="text-sm">包含详细测试结果</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      数据统计
                    </label>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm">
                      <div className="flex justify-between mb-1">
                        <span>测试记录数:</span>
                        <span className="font-semibold">{testData.length}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>测试类型:</span>
                        <span className="font-semibold">
                          {[...new Set(testData.map(t => t.type || t.engine_type))].length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>时间跨度:</span>
                        <span className="font-semibold">
                          {reportConfig.dateRange.start && reportConfig.dateRange.end
                            ? `${Math.ceil((new Date(reportConfig.dateRange.end).getTime() - new Date(reportConfig.dateRange.start).getTime()) / (1000 * 60 * 60 * 24))}天`
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 步骤 3: 样式和品牌设置 */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">样式和品牌设置</h3>
                <p className="text-gray-600 mb-4">
                  自定义报告的视觉风格和品牌元素。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左列 - 品牌设置 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      公司/组织名称
                    </label>
                    <input
                      type="text"
                      value={reportConfig.brandingOptions.companyName}
                      onChange={(e) => handleBrandingChange('companyName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="输入公司或组织名称"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      主题颜色
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {colorThemes.map((theme, index) => (
                        <div
                          key={index}
                          className={`p-2 border rounded-lg cursor-pointer transition-all ${
                            reportConfig.brandingOptions.primaryColor === theme.primary
                              ? 'border-blue-500 shadow-md'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            handleBrandingChange('primaryColor', theme.primary);
                            handleBrandingChange('secondaryColor', theme.secondary);
                          }}
                        >
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: theme.primary }}
                            />
                            <span className="text-xs font-medium">{theme.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      自定义颜色
                    </label>
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <input
                          type="color"
                          value={reportConfig.brandingOptions.primaryColor}
                          onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                          className="w-full h-10 border border-gray-300 rounded-md"
                        />
                        <span className="text-xs text-gray-500">主色调</span>
                      </div>
                      <div className="flex-1">
                        <input
                          type="color"
                          value={reportConfig.brandingOptions.secondaryColor || '#64748b'}
                          onChange={(e) => handleBrandingChange('secondaryColor', e.target.value)}
                          className="w-full h-10 border border-gray-300 rounded-md"
                        />
                        <span className="text-xs text-gray-500">辅色调</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 右列 - 其他设置 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      附加选项
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={reportConfig.brandingOptions.includeWatermark}
                          onChange={(e) => handleBrandingChange('includeWatermark', e.target.checked)}
                          className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm">包含水印</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      预览效果
                    </label>
                    <div 
                      className="p-4 border rounded-lg"
                      style={{
                        borderColor: reportConfig.brandingOptions.primaryColor,
                        backgroundColor: `${reportConfig.brandingOptions.primaryColor}10`
                      }}
                    >
                      <div 
                        className="text-lg font-bold mb-1"
                        style={{ color: reportConfig.brandingOptions.primaryColor }}
                      >
                        {reportConfig.title || '测试分析报告'}
                      </div>
                      <div 
                        className="text-sm"
                        style={{ color: reportConfig.brandingOptions.secondaryColor }}
                      >
                        {reportConfig.brandingOptions.companyName}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        使用 {selectedTemplate?.name} 模板
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 步骤 4: 格式选择和确认 */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">选择输出格式</h3>
                <p className="text-gray-600 mb-4">
                  选择最适合您需要的报告格式。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formats.map((format) => (
                  <div
                    key={format.key}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      reportConfig.format === format.key
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => handleConfigChange('format', format.key)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {format.icon}
                        <h4 className="font-semibold text-gray-900">{format.name}</h4>
                      </div>
                      {reportConfig.format === format.key && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{format.description}</p>
                    {format.size && (
                      <div className="text-xs text-gray-500">
                        预计文件大小: {format.size}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 配置摘要 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">配置摘要</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="mb-2">
                      <span className="font-medium">模板:</span> {selectedTemplate?.name}
                    </div>
                    <div className="mb-2">
                      <span className="font-medium">格式:</span> {selectedFormat?.name}
                    </div>
                    <div className="mb-2">
                      <span className="font-medium">标题:</span> {reportConfig.title}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2">
                      <span className="font-medium">数据量:</span> {testData.length} 条记录
                    </div>
                    <div className="mb-2">
                      <span className="font-medium">包含图表:</span> {reportConfig.includeCharts ? '是' : '否'}
                    </div>
                    <div className="mb-2">
                      <span className="font-medium">包含建议:</span> {reportConfig.includeRecommendations ? '是' : '否'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 生成进度 */}
        {isGenerating && (
          <div className="p-6 border-t bg-gray-50">
            <div className="flex items-center space-x-3">
              <Loader className="w-5 h-5 text-blue-600 animate-spin" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">生成报告中...</span>
                  <span className="text-sm text-gray-500">{Math.round(generationProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex items-center space-x-2">
            {currentStep > 1 && !isGenerating && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                上一步
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {!isGenerating && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                取消
              </button>
            )}
            
            {currentStep < 4 && !isGenerating && (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>下一步</span>
              </button>
            )}
            
            {currentStep === 4 && (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !reportConfig.title.trim()}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>{isGenerating ? '生成中...' : '生成报告'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportGeneratorModal;
