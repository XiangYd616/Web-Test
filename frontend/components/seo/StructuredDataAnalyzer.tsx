import React, { useState, useCallback } from 'react';
import {AlertCircle, CheckCircle, Code, Database, XCircle} from 'lucide-react';

// Schema.org types mapping
const SCHEMA_TYPES = {
  'Organization': {
    required: ['@type', 'name'],
    recommended: ['url', 'logo', 'contactPoint', 'address'],
    description: '组织机构信息'
  },
  'Article': {
    required: ['@type', 'headline', 'author', 'datePublished'],
    recommended: ['image', 'dateModified', 'publisher'],
    description: '文章内容'
  },
  'Product': {
    required: ['@type', 'name'],
    recommended: ['image', 'description', 'brand', 'offers'],
    description: '产品信息'
  },
  'Recipe': {
    required: ['@type', 'name', 'recipeIngredient', 'recipeInstructions'],
    recommended: ['image', 'author', 'nutrition', 'cookTime', 'prepTime'],
    description: '食谱信息'
  },
  'Event': {
    required: ['@type', 'name', 'startDate'],
    recommended: ['location', 'description', 'endDate', 'organizer'],
    description: '活动事件'
  },
  'LocalBusiness': {
    required: ['@type', 'name', 'address'],
    recommended: ['telephone', 'openingHours', 'geo', 'review'],
    description: '本地商业'
  },
  'WebSite': {
    required: ['@type', 'name', 'url'],
    recommended: ['potentialAction', 'author', 'description'],
    description: '网站信息'
  },
  'BreadcrumbList': {
    required: ['@type', 'itemListElement'],
    recommended: [],
    description: '面包屑导航'
  }
};

interface StructuredDataItem {
  type: string;
  format: 'json-ld' | 'microdata' | 'rdfa';
  data: any;
  element?: HTMLElement;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    field?: string;
  }>;
  score: number;
}

interface StructuredDataAnalysisResult {
  totalItems: number;
  validItems: number;
  invalidItems: number;
  overallScore: number;
  items: StructuredDataItem[];
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    message: string;
    action: string;
  }>;
}

interface StructuredDataAnalyzerProps {
  htmlContent?: string;
  dom?: Document;
  onAnalysisComplete?: (result: StructuredDataAnalysisResult) => void;
}

export const StructuredDataAnalyzer: React.FC<StructuredDataAnalyzerProps> = ({
  htmlContent,
  dom,
  onAnalysisComplete
}) => {
  const [analysisResult, setAnalysisResult] = useState<StructuredDataAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StructuredDataItem | null>(null);

  const analyzeStructuredData = useCallback(async () => {
    if (!htmlContent && !dom) return;

    setIsAnalyzing(true);
    
    try {
      const targetDom = dom || new DOMParser().parseFromString(htmlContent!, 'text/html');
      const items: StructuredDataItem[] = [];

      // 1. 分析JSON-LD结构化数据
      const jsonLdElements = targetDom.querySelectorAll('script[type="application/ld+json"]');
      jsonLdElements.forEach((element) => {
        try {
          const jsonData = JSON.parse(element?.textContent || '');
          const jsonLdItems = Array.isArray(jsonData) ? jsonData : [jsonData];
          
          jsonLdItems.forEach((item) => {
            if (item['@type']) {
              const structuredItem = validateStructuredDataItem(item, 'json-ld', element as HTMLElement);
              items.push(structuredItem);
            }
          });
        } catch (error) {
          items.push({
            type: 'Unknown',
            format: 'json-ld',
            data: null,
            element: element as HTMLElement,
            issues: [{
              severity: 'error',
              message: 'JSON-LD 语法错误',
            }],
            score: 0
          });
        }
      });

      // 2. 分析Microdata
      const microdataElements = targetDom.querySelectorAll('[itemscope][itemtype]');
      microdataElements.forEach((element) => {
        const itemType = element?.getAttribute('itemtype') || '';
        const schemaType = extractSchemaType(itemType);
        
        if (schemaType) {
          const microdataItem = extractMicrodataProperties(element);
          const structuredItem = validateStructuredDataItem(
            { '@type': schemaType, ...microdataItem }, 
            'microdata', 
            element as HTMLElement
          );
          items.push(structuredItem);
        }
      });

      // 3. 分析RDFa (基础支持)
      const rdfaElements = targetDom.querySelectorAll('[typeof]');
      rdfaElements.forEach((element) => {
        const typeOf = element?.getAttribute('typeof') || '';
        const schemaType = extractSchemaType(typeOf);
        
        if (schemaType) {
          const rdfaItem = extractRdfaProperties(element);
          const structuredItem = validateStructuredDataItem(
            { '@type': schemaType, ...rdfaItem }, 
            'rdfa', 
            element as HTMLElement
          );
          items.push(structuredItem);
        }
      });

      // 计算整体分析结果
      const result = calculateAnalysisResult(items);
      setAnalysisResult(result);
      onAnalysisComplete?.(result);

    } catch (error) {
      console.error('Structured data analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [htmlContent, dom, onAnalysisComplete]);

  // 验证结构化数据项
  const validateStructuredDataItem = (
    data: any, 
    format: 'json-ld' | 'microdata' | 'rdfa',
    element: HTMLElement
  ): StructuredDataItem => {
    const type = data?.['@type'] || 'Unknown';
    const schema = SCHEMA_TYPES[type as keyof typeof SCHEMA_TYPES];
    const issues: StructuredDataItem['issues'] = [];
    let score = 100;

    if (!schema) {
      issues.push({
        severity: 'warning',
        message: `未识别的Schema类型: ${type}`
      });
      score -= 20;
    } else {
      // 检查必需字段
      schema.required.forEach(field => {
        if (!data?.[field]) {
          issues.push({
            severity: 'error',
            message: `缺少必需字段: ${field}`,
            field
          });
          score -= 30;
        }
      });

      // 检查推荐字段
      schema.recommended.forEach(field => {
        if (!data?.[field]) {
          issues.push({
            severity: 'warning',
            message: `建议添加字段: ${field}`,
            field
          });
          score -= 10;
        }
      });

      // 特殊验证规则
      if (type === 'Organization' || type === 'LocalBusiness') {
        if (data?.logo && !isValidImageUrl(data.logo)) {
          issues.push({
            severity: 'warning',
            message: 'logo字段应该是有效的图片URL',
            field: 'logo'
          });
          score -= 10;
        }
      }

      if (type === 'Article') {
        if (data?.author && typeof data.author === 'string') {
          issues.push({
            severity: 'info',
            message: 'author字段建议使用Person或Organization对象',
            field: 'author'
          });
          score -= 5;
        }
      }
    }

    return {
      type,
      format,
      data,
      element,
      issues,
      score: Math.max(0, score)
    };
  };

  // 提取Schema类型
  const extractSchemaType = (typeUrl: string): string | null => {
    const match = typeUrl.match(/schema\.org\/(\w+)$/);
    return match ? match[1] : null;
  };

  // 提取Microdata属性
  const extractMicrodataProperties = (element: Element): Record<string, any> => {
    const properties: Record<string, any> = {};
    
    element?.querySelectorAll('[itemprop]').forEach(propElement => {
      const prop = propElement.getAttribute('itemprop');
      if (prop) {
        let value = propElement.getAttribute('content') || 
                   propElement.getAttribute('href') || 
                   propElement.textContent?.trim();
        
        if (propElement.hasAttribute('itemscope')) {
          value = extractMicrodataProperties(propElement);
        }
        
        properties[prop] = value;
      }
    });
    
    return properties;
  };

  // 提取RDFa属性
  const extractRdfaProperties = (element: Element): Record<string, any> => {
    const properties: Record<string, any> = {};
    
    element?.querySelectorAll('[property]').forEach(propElement => {
      const prop = propElement.getAttribute('property');
      if (prop) {
        const value = propElement.getAttribute('content') || 
                     propElement.getAttribute('href') || 
                     propElement.textContent?.trim();
        properties[prop] = value;
      }
    });
    
    return properties;
  };

  // 验证图片URL
  const isValidImageUrl = (url: string): boolean => {
    try {
      new URL(url);
      return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
    } catch {
      return false;
    }
  };

  // 计算分析结果
  const calculateAnalysisResult = (items: StructuredDataItem[]): StructuredDataAnalysisResult => {
    const totalItems = items.length;
    const validItems = items.filter(item => item.score >= 80).length;
    const invalidItems = totalItems - validItems;
    const overallScore = totalItems > 0 
      ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / totalItems)
      : 0;

    const recommendations: StructuredDataAnalysisResult['recommendations'] = [];

    // 生成推荐
    if (totalItems === 0) {
      recommendations.push({
        priority: 'high',
        message: '页面中未找到结构化数据',
        action: '添加JSON-LD结构化数据以改善搜索引擎理解'
      });
    }

    if (invalidItems > 0) {
      recommendations.push({
        priority: 'medium',
        message: `${invalidItems}个结构化数据项存在问题`,
        action: '修复结构化数据中的错误和缺失字段'
      });
    }

    const hasOrganization = items.some(item => item.type === 'Organization');
    if (!hasOrganization) {
      recommendations.push({
        priority: 'low',
        message: '建议添加Organization结构化数据',
        action: '添加组织信息以提升品牌在搜索结果中的展示'
      });
    }

    return {
      totalItems,
      validItems,
      invalidItems,
      overallScore,
      items,
      recommendations
    };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return CheckCircle;
    if (score >= 60) return AlertCircle;
    return XCircle;
  };


    /**

     * switch功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center">
          <Database className="mr-2" />
          结构化数据分析
        </h3>
        <button
          onClick={analyzeStructuredData}
          disabled={isAnalyzing || (!htmlContent && !dom)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? '分析中...' : '开始分析'}
        </button>
      </div>

      {analysisResult && (
        <div className="space-y-6">
          {/* 总体概览 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-800">{analysisResult.totalItems}</div>
              <div className="text-sm text-gray-600">总数据项</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{analysisResult.validItems}</div>
              <div className="text-sm text-green-600">有效项</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{analysisResult.invalidItems}</div>
              <div className="text-sm text-red-600">问题项</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className={`text-2xl font-bold ${getScoreColor(analysisResult.overallScore)}`}>
                {analysisResult.overallScore}
              </div>
              <div className="text-sm text-blue-600">总体评分</div>
            </div>
          </div>

          {/* 详细项目列表 */}
          <div className="space-y-4">
            <h4 className="text-md font-semibold">检测到的结构化数据项:</h4>
            {analysisResult.items.map((item, index) => {
              const ScoreIcon = getScoreIcon(item.score);
              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <ScoreIcon className={`mr-2 ${getScoreColor(item.score)}`} size={20} />
                      <span className="font-semibold">{item.type}</span>
                      <span className="ml-2 px-2 py-1 bg-gray-100 text-xs rounded">
                        {item.format.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className={`font-semibold ${getScoreColor(item.score)}`}>
                        {item.score}/100
                      </span>
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <Code size={16} />
                      </button>
                    </div>
                  </div>

                  {item.issues.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {item.issues.slice(0, 3).map((issue, issueIndex) => (
                        <div key={issueIndex} className="flex items-start text-sm">
                          <AlertCircle 
                            size={14} 
                            className={`mr-2 mt-0.5 ${getSeverityColor(issue.severity)}`} 
                          />
                          <span className={getSeverityColor(issue.severity)}>
                            {issue.message}
                          </span>
                        </div>
                      ))}
                      {item.issues.length > 3 && (
                        <div className="text-sm text-gray-500">
                          还有 {item.issues.length - 3} 个问题...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 推荐建议 */}
          {analysisResult.recommendations.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-md font-semibold">优化建议:</h4>
              {analysisResult.recommendations.map((rec, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center mb-1">
                    <span className={`px-2 py-1 text-xs rounded ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {rec.priority === 'high' ? '高优先级' : 
                       rec.priority === 'medium' ? '中优先级' : '低优先级'}
                    </span>
                  </div>
                  <div className="font-medium">{rec.message}</div>
                  <div className="text-sm text-gray-600 mt-1">{rec.action}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 详细数据模态框 */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {selectedItem.type} 详细信息
                </h3>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">数据内容:</h4>
                  <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
                    {JSON.stringify(selectedItem.data, null, 2)}
                  </pre>
                </div>

                {selectedItem.issues.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">发现的问题:</h4>
                    <div className="space-y-2">
                      {selectedItem.issues.map((issue, index) => (
                        <div key={index} className="flex items-start">
                          <AlertCircle 
                            size={16} 
                            className={`mr-2 mt-0.5 ${getSeverityColor(issue.severity)}`} 
                          />
                          <div>
                            <span className={`font-medium ${getSeverityColor(issue.severity)}`}>
                              {issue.severity === 'error' ? '错误' : 
                               issue.severity === 'warning' ? '警告' : '信息'}:
                            </span>
                            <span className="ml-2">{issue.message}</span>
                            {issue.field && (
                              <span className="ml-2 text-sm text-gray-500">
                                (字段: {issue.field})
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StructuredDataAnalyzer;
