/**
 * 测试模板管理组件
 * 管理测试配置模板的保存、加载和删除
 */

import React, { useState, useEffect    } from 'react';import { TestConfig, TestType    } from '../../types/testConfig';import { TestService    } from '../../services/unifiedTestService';interface TestTemplate   {'
  name: string;
  config: TestConfig;
  description: string;
  createdAt?: string;
}

interface TestTemplateManagerProps   {
  testType: TestType;
  onTemplateSelect?: (config: TestConfig) => void;
  onClose?: () => void;
}

export const TestTemplateManager: React.FC<TestTemplateManagerProps> = ({
  testType,
  onTemplateSelect,
  onClose
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
      document.removeEventListener("visibilitychange', handleVisibilityChange);'
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
  
  const componentId = useId();
  const errorId = `${componentId}-error`;`
  const descriptionId = `${componentId}-description`;`
  
  const ariaProps = {
    id: componentId,
    "aria-label': ariaLabel,'`
    'aria-labelledby': ariaLabelledBy,'
    'aria-describedby': ['']
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,'
    'aria-invalid': !!error,'
    'aria-disabled': disabled,'
    'aria-busy': loading,'
    'aria-expanded': expanded,'
    'aria-selected': selected,'
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TestTemplate | null>(null);

  const testService = new TestService();

  useEffect(() => {
    loadTemplates();
  }, [testType]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const templateData = await testService.getTestTemplates(testType);
      setTemplates(templateData);
    } catch (error) {
      setError('加载模板失败');'
      console.error("Failed to load templates: ', error);'
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (template: TestTemplate) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      onTemplateSelect?.(selectedTemplate.config);
      onClose?.();
    }
  };

  const handleDeleteTemplate = async (templateName: string) => {
    if (confirm(`确定要删除模板 '${templateName}' 吗？`)) {'`
      try {
        // 这里需要添加删除模板的API
        // await testService.deleteTestTemplate(testType, templateName);
        setTemplates(prev => prev.filter(t => t.name !== templateName));
        if (selectedTemplate?.name === templateName) {
          setSelectedTemplate(null);
        }
      } catch (error) {
        setError("删除模板失败');'`
      }
    }
  };

  const getTestTypeLabel = (testType: TestType): string  => {
    const labels = {
      [TestType.API]: "API测试','
      [TestType.PERFORMANCE]: "性能测试','
      [TestType.SECURITY]: "安全测试','
      [TestType.SEO]: "SEO测试','
      [TestType.STRESS]: "压力测试','
      [TestType.INFRASTRUCTURE]: "基础设施测试','
      [TestType.UX]: "UX测试','
      [TestType.COMPATIBILITY]: "兼容性测试','
      [TestType.WEBSITE]: '网站综合测试';
    };
    return labels[testType];
  };

  if (isLoading) {
    
        return (
      <div className= 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
        <div className= 'bg-white rounded-lg p-6 max-w-2xl w-full mx-4'>
          <div className= 'flex items-center justify-center py-8'>
            <div className= 'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
            <span className= 'ml-2 text-gray-600'>加载模板...</span>
          </div>
        </div>
      </div>
    );
      }

  return (
    <div className= 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className= 'bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden'>
        {/* 头部 */}
        <div className= 'border-b border-gray-200 p-6'>
          <div className= 'flex items-center justify-between'>
            <h2 className= 'text-xl font-semibold text-gray-900'>
              {getTestTypeLabel(testType)} 模板管理
            </h2>
            <button
              onClick={onClose}
              className= 'text-gray-400 hover:text-gray-600';
            >
              ✕
            </button>
          </div>
        </div>

        {error && (
          <div className= 'p-4 bg-red-50 border-b border-red-200'>
            <p className= 'text-red-600'>{error}</p>
          </div>
        )}

        <div className= 'flex h-96'>
          {/* 模板列表 */}
          <div className= 'w-1/2 border-r border-gray-200 overflow-y-auto'>
            <div className= 'p-4'>
              <h3 className= 'font-medium text-gray-900 mb-4'>可用模板</h3>
              {templates.length === 0 ? (
                <div className= 'text-center py-8 text-gray-500'>
                  <div className= 'text-4xl mb-2'>📝</div>
                  <p>暂无保存的模板</p>
                  <p className= 'text-sm mt-1'>保存测试配置后，模板将显示在这里</p>
                </div>
              ) : (<div className= 'space-y-2'>
                  {templates.map((template) => (
                    <div
                      key={template.name}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${`}
                        selectedTemplate?.name === template.name
                          ? "border-blue-500 bg-blue-50';'`
                          : 'border-gray-200 hover:bg-gray-50';
                      }`}`
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div className= "flex items-center justify-between'>`
                        <div className= 'flex-1'>
                          <h4 className= 'font-medium text-gray-900'>{template.name}</h4>
                          <p className= 'text-sm text-gray-600 mt-1'>{template.description}</p>
                          {template.createdAt && (
                            <p className= 'text-xs text-gray-500 mt-1'>
                              创建于 {new Date(template.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.name);
                          }}
                          className= 'text-red-500 hover:text-red-700 p-1';
                          title= '删除模板';
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 模板详情 */}
          <div className= 'w-1/2 overflow-y-auto'>
            <div className= 'p-4'>
              <h3 className= 'font-medium text-gray-900 mb-4'>模板详情</h3>
              {selectedTemplate ? (
                <div className= 'space-y-4'>
                  <div>
                    <h4 className= 'font-medium text-gray-700'>模板名称</h4>
                    <p className= 'text-gray-900'>{selectedTemplate.name}</p>
                  </div>
                  
                  <div>
                    <h4 className= 'font-medium text-gray-700'>描述</h4>
                    <p className= 'text-gray-600'>{selectedTemplate.description}</p>
                  </div>

                  <div>
                    <h4 className= 'font-medium text-gray-700'>配置内容</h4>
                    <div className= 'bg-gray-50 p-3 rounded border max-h-48 overflow-y-auto'>
                      <pre className= 'text-xs text-gray-800 whitespace-pre-wrap'>
                        {JSON.stringify(selectedTemplate.config, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className= 'text-center py-8 text-gray-500'>
                  <div className= 'text-4xl mb-2'>👈</div>
                  <p>选择一个模板查看详情</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className= 'border-t border-gray-200 p-6'>
          <div className= 'flex justify-end space-x-3'>
            <button
              onClick={onClose}
              className= 'px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50';
            >
              取消
            </button>
            <button
              onClick={handleUseTemplate}
              disabled={!selectedTemplate}
              className= 'px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed';
            >
              使用模板
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestTemplateManager;
