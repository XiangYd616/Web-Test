import React, { useState, useCallback } from 'react';
import { Download, FileText, Share2, Printer, Eye, Settings, BarChart3, TrendingUp } from 'lucide-react';
import { SEOAnalysisResult } from '../../services/realSEOAnalysisEngine';
import { MobileSEOAnalysisResult } from '../../utils/MobileSEODetector';
import { CoreWebVitalsResult } from '../../utils/CoreWebVitalsAnalyzer';

interface SEOReportData {
  basicSEO?: SEOAnalysisResult;
  mobileSEO?: MobileSEOAnalysisResult;
  coreWebVitals?: CoreWebVitalsResult;
  timestamp: number;
  url: string;
  testConfiguration: {
    mode: 'online' | 'local';
    depth: 'basic' | 'standard' | 'comprehensive';
    includeStructuredData: boolean;
    includeMobileSEO: boolean;
    includeCoreWebVitals: boolean;
  };
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
  format: 'executive' | 'technical' | 'comprehensive';
}

interface SEOReportGeneratorProps {
  reportData: SEOReportData;
  onReportGenerated?: (format: string, data: any) => void;
  onError?: (error: string) => void;
}

export const SEOReportGenerator: React.FC<SEOReportGeneratorProps> = ({
  reportData,
  onReportGenerated,
  onError
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('comprehensive');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [customSections, setCustomSections] = useState<string[]>([]);
  
  // 预定义报告模板
  const reportTemplates: ReportTemplate[] = [
    {
      id: 'executive',
      name: '管理层报告',
      description: '简明扼要的高层次SEO概览，聚焦关键指标和业务影响',
      sections: ['summary', 'scores', 'keyIssues', 'recommendations'],
      format: 'executive'
    },
    {
      id: 'technical',
      name: '技术报告',
      description: '详细的技术SEO分析，面向开发人员和SEO专家',
      sections: ['technicalSEO', 'structuredData', 'coreWebVitals', 'mobileSEO', 'issues'],
      format: 'technical'
    },
    {
      id: 'comprehensive',
      name: '综合报告',
      description: '完整的SEO审计报告，包含所有分析维度和详细建议',
      sections: ['summary', 'scores', 'technicalSEO', 'contentQuality', 'mobileSEO', 'structuredData', 'coreWebVitals', 'recommendations', 'appendix'],
      format: 'comprehensive'
    }
  ];

  // 生成PDF报告
  const generatePDFReport = useCallback(async (): Promise<void> => {
    setIsGenerating(true);
    
    try {
      const template = reportTemplates.find(t => t.id === selectedTemplate);
      if (!template) {
        throw new Error('选择的报告模板不存在');
      }

      // 构建报告内容
      const reportContent = await buildReportContent(template);
      
      // 生成PDF（实际应用中需要使用PDF生成库如jsPDF或Puppeteer）
      const pdfBlob = await generatePDFBlob(reportContent, template);
      
      // 下载文件
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SEO报告_${reportData.url.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onReportGenerated?.('pdf', reportContent);
      
    } catch (error) {
      console.error('PDF报告生成失败:', error);
      onError?.(error instanceof Error ? error.message : 'PDF生成失败');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTemplate, reportData, onReportGenerated, onError]);

  // 生成JSON报告
  const generateJSONReport = useCallback(async (): Promise<void> => {
    setIsGenerating(true);
    
    try {
      const template = reportTemplates.find(t => t.id === selectedTemplate);
      if (!template) {
        throw new Error('选择的报告模板不存在');
      }

      const reportContent = await buildReportContent(template);
      
      // 构建JSON结构
      const jsonReport = {
        metadata: {
          generatedAt: new Date().toISOString(),
          template: template.name,
          url: reportData.url,
          testMode: reportData.testConfiguration.mode,
          version: '1.0.0'
        },
        summary: generateReportSummary(),
        sections: reportContent,
        rawData: {
          basicSEO: reportData.basicSEO,
          mobileSEO: reportData.mobileSEO,
          coreWebVitals: reportData.coreWebVitals
        }
      };

      // 下载JSON文件
      const jsonBlob = new Blob([JSON.stringify(jsonReport, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(jsonBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SEO报告_${reportData.url.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onReportGenerated?.('json', jsonReport);
      
    } catch (error) {
      console.error('JSON报告生成失败:', error);
      onError?.(error instanceof Error ? error.message : 'JSON生成失败');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTemplate, reportData, onReportGenerated, onError]);

  // 生成HTML报告
  const generateHTMLReport = useCallback(async (): Promise<void> => {
    setIsGenerating(true);
    
    try {
      const template = reportTemplates.find(t => t.id === selectedTemplate);
      if (!template) {
        throw new Error('选择的报告模板不存在');
      }

      const reportContent = await buildReportContent(template);
      const htmlContent = await generateHTMLContent(reportContent, template);
      
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      
      const url = URL.createObjectURL(htmlBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SEO报告_${reportData.url.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onReportGenerated?.('html', htmlContent);
      
    } catch (error) {
      console.error('HTML报告生成失败:', error);
      onError?.(error instanceof Error ? error.message : 'HTML生成失败');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTemplate, reportData, onReportGenerated, onError]);

  // 构建报告内容
  const buildReportContent = async (template: ReportTemplate): Promise<any> => {
    const content: any = {};

    for (const section of template.sections) {
      switch (section) {
        case 'summary':
          content.summary = generateReportSummary();
          break;
        case 'scores':
          content.scores = generateScoresSection();
          break;
        case 'technicalSEO':
          content.technicalSEO = generateTechnicalSEOSection();
          break;
        case 'contentQuality':
          content.contentQuality = generateContentQualitySection();
          break;
        case 'mobileSEO':
          content.mobileSEO = generateMobileSEOSection();
          break;
        case 'structuredData':
          content.structuredData = generateStructuredDataSection();
          break;
        case 'coreWebVitals':
          content.coreWebVitals = generateCoreWebVitalsSection();
          break;
        case 'keyIssues':
          content.keyIssues = generateKeyIssuesSection();
          break;
        case 'recommendations':
          content.recommendations = generateRecommendationsSection();
          break;
        case 'issues':
          content.issues = generateIssuesSection();
          break;
        case 'appendix':
          content.appendix = generateAppendixSection();
          break;
      }
    }

    return content;
  };

  // 生成报告摘要
  const generateReportSummary = () => {
    const summary = {
      url: reportData.url,
      testDate: new Date(reportData.timestamp).toLocaleString('zh-CN'),
      testMode: reportData.testConfiguration.mode === 'online' ? '在线测试' : '本地测试',
      overallScore: 0,
      totalIssues: 0,
      criticalIssues: 0,
      keyFindings: [] as string[]
    };

    // 计算总体评分
    let scoreSum = 0;
    let scoreCount = 0;

    if (reportData.basicSEO) {
      scoreSum += reportData.basicSEO.score;
      scoreCount++;
    }

    if (reportData.mobileSEO) {
      scoreSum += reportData.mobileSEO.overallScore;
      scoreCount++;
    }

    if (scoreCount > 0) {
      summary.overallScore = Math.round(scoreSum / scoreCount);
    }

    // 统计问题
    if (reportData.basicSEO) {
      summary.totalIssues += reportData.basicSEO.issues.length;
      summary.criticalIssues += reportData.basicSEO.issues.filter(i => i.impact === 'high').length;
    }

    // 关键发现
    if (summary.overallScore >= 90) {
      summary.keyFindings.push('网站SEO状况良好，仅需要进行少量优化');
    } else if (summary.overallScore >= 70) {
      summary.keyFindings.push('网站SEO有一定基础，存在中等程度的优化空间');
    } else {
      summary.keyFindings.push('网站SEO需要显著改进，存在多个关键问题');
    }

    return summary;
  };

  // 生成评分部分
  const generateScoresSection = () => {
    const scores = {
      overall: 0,
      technical: 0,
      content: 0,
      mobile: 0,
      performance: 0,
      accessibility: 0
    };

    if (reportData.basicSEO) {
      scores.overall = reportData.basicSEO.score;
      scores.technical = reportData.basicSEO.technicalSEO.score;
      scores.content = reportData.basicSEO.contentQuality.score;
      scores.accessibility = reportData.basicSEO.accessibility.score;
    }

    if (reportData.mobileSEO) {
      scores.mobile = reportData.mobileSEO.overallScore;
    }

    if (reportData.coreWebVitals) {
      // 基于Core Web Vitals评级计算性能分数
      const rating = reportData.coreWebVitals.overallRating;
      scores.performance = rating === 'good' ? 90 : rating === 'needs-improvement' ? 60 : 30;
    }

    return scores;
  };

  // 生成技术SEO部分
  const generateTechnicalSEOSection = () => {
    if (!reportData.basicSEO) return null;

    return {
      score: reportData.basicSEO.technicalSEO.score,
      robotsTxt: reportData.basicSEO.technicalSEO.robotsTxt,
      sitemap: reportData.basicSEO.technicalSEO.sitemap,
      canonicalTags: reportData.basicSEO.technicalSEO.canonicalTags,
      metaRobots: reportData.basicSEO.technicalSEO.metaRobots,
      urlStructure: reportData.basicSEO.technicalSEO.urlStructure
    };
  };

  // 生成内容质量部分
  const generateContentQualitySection = () => {
    if (!reportData.basicSEO) return null;

    return {
      score: reportData.basicSEO.contentQuality.score,
      titleTag: reportData.basicSEO.contentQuality.titleTag,
      metaDescription: reportData.basicSEO.contentQuality.metaDescription,
      headings: reportData.basicSEO.contentQuality.headings,
      content: reportData.basicSEO.contentQuality.content,
      images: reportData.basicSEO.contentQuality.images,
      links: reportData.basicSEO.contentQuality.links
    };
  };

  // 生成移动SEO部分
  const generateMobileSEOSection = () => {
    return reportData.mobileSEO;
  };

  // 生成结构化数据部分
  const generateStructuredDataSection = () => {
    if (!reportData.basicSEO) return null;

    return {
      score: reportData.basicSEO.structuredData.score,
      schemas: reportData.basicSEO.structuredData.schemas,
      jsonLd: reportData.basicSEO.structuredData.jsonLd,
      microdata: reportData.basicSEO.structuredData.microdata,
      issues: reportData.basicSEO.structuredData.issues
    };
  };

  // 生成Core Web Vitals部分
  const generateCoreWebVitalsSection = () => {
    return reportData.coreWebVitals;
  };

  // 生成关键问题部分
  const generateKeyIssuesSection = () => {
    const keyIssues: any[] = [];

    if (reportData.basicSEO) {
      const highImpactIssues = reportData.basicSEO.issues.filter(i => i.impact === 'high');
      keyIssues.push(...highImpactIssues.slice(0, 5)); // 最多5个关键问题
    }

    return keyIssues;
  };

  // 生成建议部分
  const generateRecommendationsSection = () => {
    const recommendations: any[] = [];

    if (reportData.basicSEO) {
      recommendations.push(...reportData.basicSEO.recommendations.slice(0, 10));
    }

    if (reportData.mobileSEO) {
      recommendations.push(...reportData.mobileSEO.recommendations.slice(0, 5));
    }

    if (reportData.coreWebVitals) {
      recommendations.push(...reportData.coreWebVitals.recommendations.slice(0, 3));
    }

    // 按优先级排序
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority as keyof typeof priorityOrder] - 
             priorityOrder[a.priority as keyof typeof priorityOrder];
    });
  };

  // 生成所有问题部分
  const generateIssuesSection = () => {
    const allIssues: any[] = [];

    if (reportData.basicSEO) {
      allIssues.push(...reportData.basicSEO.issues);
    }

    return allIssues;
  };

  // 生成附录部分
  const generateAppendixSection = () => {
    return {
      testConfiguration: reportData.testConfiguration,
      metadata: reportData.basicSEO?.metadata,
      glossary: [
        {
          term: 'LCP (Largest Contentful Paint)',
          definition: '最大内容绘制时间，衡量页面主要内容加载完成的时间'
        },
        {
          term: 'FID (First Input Delay)',
          definition: '首次输入延迟，衡量页面响应用户首次交互的时间'
        },
        {
          term: 'CLS (Cumulative Layout Shift)',
          definition: '累积布局偏移，衡量页面视觉稳定性'
        }
      ]
    };
  };

  // 生成PDF内容（简化实现，实际需要使用PDF库）
  const generatePDFBlob = async (content: any, template: ReportTemplate): Promise<Blob> => {
    // 这里应该使用jsPDF、Puppeteer或类似的PDF生成库
    // 当前返回一个模拟的PDF blob
    const pdfContent = `PDF报告内容 - ${template.name}\n\n${JSON.stringify(content, null, 2)}`;
    return new Blob([pdfContent], { type: 'application/pdf' });
  };

  // 生成HTML内容
  const generateHTMLContent = async (content: any, template: ReportTemplate): Promise<string> => {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SEO分析报告 - ${reportData.url}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #1f2937; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
        h2 { color: #374151; margin-top: 40px; }
        .score { font-size: 2em; font-weight: bold; color: #059669; }
        .issue { margin: 10px 0; padding: 10px; border-left: 4px solid #ef4444; background: #fef2f2; }
        .recommendation { margin: 10px 0; padding: 10px; border-left: 4px solid #3b82f6; background: #eff6ff; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-card { padding: 20px; background: #f8fafc; border-radius: 6px; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <h1>SEO分析报告</h1>
        <p><strong>网站:</strong> ${reportData.url}</p>
        <p><strong>测试时间:</strong> ${new Date(reportData.timestamp).toLocaleString('zh-CN')}</p>
        <p><strong>报告模板:</strong> ${template.name}</p>
        
        ${content.summary ? `
        <h2>执行摘要</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <div class="score">${content.summary.overallScore}</div>
                <div>总体评分</div>
            </div>
            <div class="summary-card">
                <div class="score">${content.summary.totalIssues}</div>
                <div>发现问题</div>
            </div>
            <div class="summary-card">
                <div class="score">${content.summary.criticalIssues}</div>
                <div>关键问题</div>
            </div>
        </div>
        ` : ''}
        
        ${content.recommendations ? `
        <h2>优化建议</h2>
        ${content.recommendations.map((rec: any, index: number) => `
            <div class="recommendation">
                <h4>${rec.title}</h4>
                <p><strong>优先级:</strong> ${rec.priority === 'high' ? '高' : rec.priority === 'medium' ? '中' : '低'}</p>
                <p><strong>说明:</strong> ${rec.description}</p>
                <p><strong>实施方案:</strong> ${rec.implementation || rec.action}</p>
            </div>
        `).join('')}
        ` : ''}
        
        <h2>详细数据</h2>
        <pre style="background: #f8fafc; padding: 20px; border-radius: 4px; overflow-x: auto; font-size: 12px;">
${JSON.stringify(content, null, 2)}
        </pre>
    </div>
</body>
</html>`;

    return htmlTemplate;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center">
          <FileText className="mr-2" />
          SEO报告生成
        </h3>
        <div className="flex items-center space-x-2">
          <Eye className="text-blue-600" size={20} />
          <span className="text-sm text-gray-600">预览和导出</span>
        </div>
      </div>

      {/* 报告模板选择 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择报告模板
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reportTemplates.map((template) => (
            <div
              key={template.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedTemplate === template.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <div className="flex items-center mb-2">
                <input
                  type="radio"
                  checked={selectedTemplate === template.id}
                  onChange={() => setSelectedTemplate(template.id)}
                  className="mr-2"
                />
                <span className="font-medium">{template.name}</span>
              </div>
              <p className="text-sm text-gray-600">{template.description}</p>
              <div className="mt-2">
                <span className="text-xs text-gray-500">
                  包含: {template.sections.length} 个部分
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 报告选项 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          报告选项
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeCharts}
              onChange={(e) => setIncludeCharts(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">包含图表和可视化</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeRecommendations}
              onChange={(e) => setIncludeRecommendations(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">包含优化建议</span>
          </label>
        </div>
      </div>

      {/* 导出按钮 */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={generatePDFReport}
          disabled={isGenerating}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          <Download className="mr-2" size={16} />
          {isGenerating ? '生成中...' : '导出PDF'}
        </button>
        
        <button
          onClick={generateJSONReport}
          disabled={isGenerating}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <Download className="mr-2" size={16} />
          {isGenerating ? '生成中...' : '导出JSON'}
        </button>
        
        <button
          onClick={generateHTMLReport}
          disabled={isGenerating}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Download className="mr-2" size={16} />
          {isGenerating ? '生成中...' : '导出HTML'}
        </button>
        
        <button
          onClick={() => {/* 实现分享功能 */}}
          disabled={isGenerating}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          <Share2 className="mr-2" size={16} />
          分享报告
        </button>
      </div>

      {/* 报告预览 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2 flex items-center">
          <Eye className="mr-2" size={16} />
          报告预览
        </h4>
        <div className="text-sm text-gray-600">
          <p><strong>URL:</strong> {reportData.url}</p>
          <p><strong>测试时间:</strong> {new Date(reportData.timestamp).toLocaleString('zh-CN')}</p>
          <p><strong>测试模式:</strong> {reportData.testConfiguration.mode === 'online' ? '在线测试' : '本地测试'}</p>
          <p><strong>分析深度:</strong> {reportData.testConfiguration.depth}</p>
          
          {reportData.basicSEO && (
            <div className="mt-2">
              <span className="font-medium">总体评分: </span>
              <span className={`font-bold ${
                reportData.basicSEO.score >= 90 ? 'text-green-600' :
                reportData.basicSEO.score >= 70 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {reportData.basicSEO.score}/100
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 报告统计 */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {reportData.basicSEO?.issues.length || 0}
          </div>
          <div className="text-sm text-blue-600">发现问题</div>
        </div>
        
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {reportData.basicSEO?.issues.filter(i => i.impact === 'high').length || 0}
          </div>
          <div className="text-sm text-red-600">高优先级</div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {reportData.basicSEO?.recommendations.length || 0}
          </div>
          <div className="text-sm text-green-600">优化建议</div>
        </div>
        
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {reportData.basicSEO?.structuredData.schemas.length || 0}
          </div>
          <div className="text-sm text-purple-600">结构化数据</div>
        </div>
      </div>
    </div>
  );
};

export default SEOReportGenerator;
