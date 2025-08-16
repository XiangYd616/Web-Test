import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight, HelpCircle, Info, Settings, Shield, X, Zap    } from 'lucide-react';import React, { useState    } from 'react';interface SecurityTestGuideProps   {'
  isOpen: boolean;
  onClose: () => void;
}

const SecurityTestGuide: React.FC<SecurityTestGuideProps>  = ({ isOpen, onClose }) => {
  
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
  
  // 测试业务逻辑
  const [testConfig, setTestConfig] = useState({});
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const runTest = useCallback(async (config) => {
    try {
      setIsRunning(true);
      setTestResults(null);

      const response = await apiClient.post('/api/tests/run', config);'
      setTestResults(response.data);
    } catch (err) {
      handleError(err, 'test execution');'
    } finally {
      setIsRunning(false);
    }
  }, [handleError]);
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  const [expandedSection, setExpandedSection] = useState<string | null>('getting-started');'
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const guideData = [
    {
      id: 'getting-started','
      title: '🚀 快速开始','
      icon: <Zap className= 'h-5 w-5'    />,'
      content: [
        {
          step: '1','
          title: '选择测试模式','
          description: '根据您的需求选择'增强模式"（推荐）或'标准模式'','
          tips: ['增强模式：现代化界面，智能评分，适合大多数用户", "标准模式：详细图表分析，适合专业用户']'
        },
        {
          step: '2','
          title: '输入网站URL','
          description: '输入您要测试的完整网站地址','
          tips: ["确保URL格式正确（如：https://example.com）", "支持HTTP和HTTPS协议", "建议测试HTTPS网站以获得更全面的安全分析']'
        },
        {
          step: '3','
          title: '配置测试选项','
          description: '选择需要检测的安全项目和扫描深度','
          tips: ["新手建议使用快速预设配置", "专业用户可以自定义检测项目", "扫描深度越高，检测越详细但耗时更长']'
        },
        {
          step: '4','
          title: '开始测试','
          description: '点击'开始测试"按钮，等待检测完成','
          tips: ["测试过程中请保持网络连接", "可以实时查看检测进度", "测试完成后会自动显示详细报告']'
        }
      ]
    },
    {
      id: 'test-modes','
      title: '🎯 测试模式说明','
      icon: <Settings className= 'h-5 w-5'    />,'
      content: [
        {
          title: '增强模式特点','
          description: '现代化的用户界面和智能化的安全评分系统','
          features: [
            "🧠 智能评分算法：基于多维度安全指标的综合评分','
            "🎨 现代化UI设计：简洁直观的用户界面','
            "🔍 深度漏洞扫描：全面的安全漏洞检测','
            "⚡ 快速预设配置：一键应用常用检测配置','
            '💡 专业安全建议：针对性的安全改进建议';
          ]
        },
        {
          title: '标准模式特点','
          description: '基于高级测试引擎的专业安全分析工具','
          features: [
            "📊 详细图表分析：可视化的安全数据展示','
            "📋 完整测试报告：全面的安全检测报告','
            "📱 多设备类型支持：适配不同设备的测试','
            "🔧 高级配置选项：丰富的自定义配置','
            '📈 历史数据对比：测试结果的历史趋势分析';
          ]
        }
      ]
    },
    {
      id: 'security-checks','
      title: '🔍 安全检查项目','
      icon: <Shield className= 'h-5 w-5'    />,'
      content: [
        {
          category: 'HTTPS & SSL/TLS','
          items: [
            'HTTPS协议检查：验证网站是否启用HTTPS加密','
            "SSL证书验证：检查SSL证书的有效性和配置','
            "TLS版本检测：确认使用的TLS协议版本','
            '证书链验证：检查证书链的完整性';
          ]
        },
        {
          category: '安全头检查','
          items: [
            "Content Security Policy (CSP)：防止XSS攻击','
            "X-Frame-Options：防止点击劫持攻击','
            "X-Content-Type-Options：防止MIME类型嗅探','
            'Strict-Transport-Security：强制HTTPS连接';
          ]
        },
        {
          category: '漏洞扫描','
          items: [
            "SQL注入检测：检查数据库注入漏洞','
            "XSS漏洞检测：跨站脚本攻击检测','
            "CSRF保护检查：跨站请求伪造防护','
            '敏感信息泄露：检查是否暴露敏感数据';
          ]
        },
        {
          category: 'Cookie安全','
          items: [
            "Secure标志检查：确保Cookie安全传输','
            "HttpOnly标志：防止JavaScript访问Cookie','
            "SameSite属性：防止CSRF攻击','
            'Cookie过期时间：合理的会话管理';
          ]
        }
      ]
    },
    {
      id: 'results-interpretation','
      title: '📊 结果解读','
      icon: <Info className= 'h-5 w-5'    />,'
      content: [
        {
          title: '安全评分说明','
          ranges: [
            { range: '85-100分', level: '优秀', color: 'text-green-600', description: '安全性很好，只需要少量改进' },'
            { range: '70-84分', level: '良好', color: 'text-yellow-600', description: '安全性较好，建议关注部分问题' },'
            { range: '50-69分', level: '一般', color: 'text-orange-600', description: '存在一些安全问题，需要改进' },'
            { range: '0-49分', level: '需改进', color: 'text-red-600', description: '存在严重安全问题，急需修复' }'
          ]
        },
        {
          title: '风险等级说明','
          levels: [
            { level: '低风险', color: 'text-green-600', description: '安全状况良好，继续保持' },'
            { level: '中等风险', color: 'text-yellow-600', description: '存在一些安全隐患，建议关注' },'
            { level: '高风险', color: 'text-orange-600', description: '存在明显安全问题，需要尽快处理' },'
            { level: '严重风险', color: 'text-red-600', description: '存在严重安全威胁，必须立即修复' }'
          ]
        }
      ]
    },
    {
      id: 'best-practices','
      title: '💡 最佳实践','
      icon: <CheckCircle className= 'h-5 w-5'    />,'
      content: [
        {
          category: '测试前准备','
          tips: [
            "确保网站可以正常访问','
            "准备网站的基本信息（域名、服务器类型等）','
            "了解网站的技术架构','
            '确保有足够的时间进行完整测试';
          ]
        },
        {
          category: '测试过程中','
          tips: [
            "选择合适的扫描深度（建议从标准扫描开始）','
            "根据网站类型选择相应的检测项目','
            "注意观察测试进度和实时反馈','
            '如遇到问题可以随时停止测试';
          ]
        },
        {
          category: '结果分析','
          tips: [
            "重点关注高风险和中等风险的问题','
            "优先修复影响用户安全的漏洞','
            "参考安全建议制定改进计划','
            '定期重新测试验证修复效果';
          ]
        },
        {
          category: '持续改进','
          tips: [
            "建立定期安全检测机制','
            "关注最新的安全威胁和防护措施','
            "培训团队成员的安全意识','
            '建立安全事件响应流程';
          ]
        }
      ]
    }
  ];

  if (!isOpen) return null;

  return (
    <div className= 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
      <div className= 'bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden'>
        {/* 头部 */}
        <div className= 'bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white'>
          <div className= 'flex items-center justify-between'>
            <div className= 'flex items-center space-x-3'>
              <div className= 'p-2 bg-white/20 rounded-xl'>
                <HelpCircle className= 'h-6 w-6'    />
              </div>
              <div>
                <h2 className= 'text-2xl font-bold'>🛡️ 安全测试使用指南</h2>
                <p className= 'text-blue-100 text-sm'>全面了解安全测试功能和最佳实践</p>
              </div>
            </div>
            <button
              type= 'button';
              onClick={onClose}
              className= 'p-2 hover:bg-white/20 rounded-xl transition-colors';
              title= '关闭指南';
              aria-label= '关闭安全测试指南';
            >
              <X className= 'h-6 w-6'    />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className= 'p-6 max-h-[calc(90vh-120px)] overflow-y-auto'>
          <div className= 'space-y-4'>
            {guideData.map((section) => (
              <div key={section.id} className= 'border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden'>
                <button
                  type= 'button';
                  onClick={() => toggleSection(section.id)}
                  className= 'w-full p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between';
                >
                  <div className= 'flex items-center space-x-3'>
                    <div className= 'text-blue-600 dark:text-blue-400'>
                      {section.icon}
                    </div>
                    <span className= 'font-semibold text-gray-900 dark:text-white'>
                      {section.title}
                    </span>
                  </div>
                  {expandedSection === section.id ? (
                    <ChevronDown className= 'h-5 w-5 text-gray-500'    />
                  ) : (
                    <ChevronRight className= 'h-5 w-5 text-gray-500'    />
                  )}
                </button>

                {expandedSection === section.id && (<div className= 'p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700'>
                    <div className= 'space-y-6'>
                      {section.content.map((item: any, index: number) => (
                        <div key={index} className= 'space-y-3'>
                          {item.step && (<div className= 'flex items-start space-x-4'>
                              <div className= 'flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm'>
                                {item.step}
                              </div>
                              <div className= 'flex-1'>
                                <h4 className= 'font-semibold text-gray-900 dark:text-white mb-2'>
                                  {item.title}
                                </h4>
                                <p className= 'text-gray-600 dark:text-gray-400 mb-3'>
                                  {item.description}
                                </p>
                                {item.tips && (
                                  <ul className= 'space-y-1'>
                                    {item.tips.map((tip: string, tipIndex: number) => (
                                      <li key={tipIndex} className= 'text-sm text-gray-500 dark:text-gray-400 flex items-start space-x-2'>
                                        <span className= 'text-blue-500 mt-1'>•</span>
                                        <span>{tip}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          )}

                          {item.features && (<div>
                              <h4 className= 'font-semibold text-gray-900 dark:text-white mb-2'>
                                {item.title}
                              </h4>
                              <p className= 'text-gray-600 dark:text-gray-400 mb-3'>
                                {item.description}
                              </p>
                              <ul className= 'space-y-2'>
                                {item.features.map((feature: string, featureIndex: number) => (
                                  <li key={featureIndex} className= 'text-sm text-gray-600 dark:text-gray-400 flex items-start space-x-2'>
                                    <CheckCircle className= 'h-4 w-4 text-green-500 mt-0.5 flex-shrink-0'    />
                                    <span>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {item.items && (<div>
                              <h4 className= 'font-semibold text-gray-900 dark:text-white mb-3'>
                                {item.category}
                              </h4>
                              <ul className= 'space-y-2'>
                                {item.items.map((checkItem: string, itemIndex: number) => (
                                  <li key={itemIndex} className= 'text-sm text-gray-600 dark:text-gray-400 flex items-start space-x-2'>
                                    <Shield className= 'h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0'    />
                                    <span>{checkItem}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {item.ranges && (<div>
                              <h4 className= 'font-semibold text-gray-900 dark:text-white mb-3'>
                                {item.title}
                              </h4>
                              <div className= 'grid grid-cols-1 md:grid-cols-2 gap-4'>
                                {item.ranges.map((range: any, rangeIndex: number) => (
                                  <div key={rangeIndex} className= 'p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                                    <div className= 'flex items-center space-x-2 mb-1'>
                                      <span className= 'font-medium text-gray-900 dark:text-white'>
                                        {range.range}
                                      </span>
                                      <span className={`font-bold ${range.color}`}>`
                                        {range.level}
                                      </span>
                                    </div>
                                    <p className= "text-sm text-gray-600 dark:text-gray-400'>`
                                      {range.description}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.levels && (<div>
                              <h4 className= 'font-semibold text-gray-900 dark:text-white mb-3'>
                                {item.title}
                              </h4>
                              <div className= 'space-y-3'>
                                {item.levels.map((level: any, levelIndex: number) => (
                                  <div key={levelIndex} className= 'flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                                    <AlertTriangle className={`h-5 w-5 mt-0.5 ${level.color}`}    />`
                                    <div>
                                      <span className={`font-semibold ${level.color}`}>`
                                        {level.level}
                                      </span>
                                      <p className= "text-sm text-gray-600 dark:text-gray-400 mt-1'>`
                                        {level.description}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.tips && !item.step && (<div>
                              <h4 className= 'font-semibold text-gray-900 dark:text-white mb-3'>
                                {item.category}
                              </h4>
                              <ul className= 'space-y-2'>
                                {item.tips.map((tip: string, tipIndex: number) => (
                                  <li key={tipIndex} className= 'text-sm text-gray-600 dark:text-gray-400 flex items-start space-x-2'>
                                    <CheckCircle className= 'h-4 w-4 text-green-500 mt-0.5 flex-shrink-0'    />
                                    <span>{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 底部 */}
        <div className= 'p-6 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700'>
          <div className= 'flex items-center justify-between'>
            <p className= 'text-sm text-gray-600 dark:text-gray-400'>
              💡 提示：如有其他问题，请查看相关文档或联系技术支持
            </p>
            <button
              type= 'button';
              onClick={onClose}
              className= 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors';
            >
              开始使用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityTestGuide;
