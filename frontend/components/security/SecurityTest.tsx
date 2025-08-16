/**
 * 高级安全测试组件
 * 提供深度安全分析、漏洞扫描、安全评估等功能
 */

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Lock, Unlock, Eye, EyeOff, Bug, Zap, Target, FileText, Download, // RefreshCw } from 'lucide-react'; // 已修复
import { createApiUrl } from '../../config/api';

interface SecurityVulnerability {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  payload?: string;
  location: string;
  impact: string;
  recommendation: string;
}

interface SecurityTestResult {
  testId: string;
  url: string;
  timestamp: string;
  summary: {
    totalVulnerabilities: number;
    criticalVulnerabilities: number;
    highVulnerabilities: number;
    mediumVulnerabilities: number;
    lowVulnerabilities: number;
    securityScore: number;
  };
  vulnerabilities: SecurityVulnerability[];
  securityHeaders: any;
  sslAnalysis: any;
  authenticationAnalysis: any;
  inputValidationAnalysis: any;
  sessionManagementAnalysis: any;
  recommendations: string[];
}

interface SecurityTestProps {
  url?: string;
  onTestComplete?: (result: SecurityTestResult) => void;
}

const SecurityTest: React.FC<SecurityTestProps> = ({
  url: initialUrl = '',
  onTestComplete
}) => {
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => 
    debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  
  const ariaProps = {
    id: componentId,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': [
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': !!error,
    'aria-disabled': disabled,
    'aria-busy': loading,
    'aria-expanded': expanded,
    'aria-selected': selected,
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
  const [url, setUrl] = useState(initialUrl);
  const [testTypes, setTestTypes] = useState(['all']);
  const [depth, setDepth] = useState<'basic' | 'standard' | 'deep'>('standard');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SecurityTestResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'vulnerabilities' | 'headers' | 'ssl' | 'recommendations'>('overview');
  const [showPayloads, setShowPayloads] = useState(false);

  const testTypeOptions = [
    { value: 'all', label: '全面扫描', description: '执行所有安全测试' },
    { value: 'headers', label: '安全头部', description: '检查HTTP安全头部' },
    { value: 'ssl', label: 'SSL/TLS', description: '分析SSL/TLS配置' },
    { value: 'vulnerabilities', label: '漏洞扫描', description: '扫描常见安全漏洞' },
    { value: 'authentication', label: '认证分析', description: '分析认证机制' },
    { value: 'input', label: '输入验证', description: '检查输入验证' },
    { value: 'session', label: '会话管理', description: '分析会话安全' }
  ];

  const handleRunTest = async () => {
    if (!url.trim()) {
      alert('请输入要测试的URL');
      return;
    }

    setIsRunning(true);
    setResult(null);

    try {
      const response = await fetch(createApiUrl('/api/security/advanced-test'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          url: url.trim(),
          testTypes,
          depth,
          options: {
            timeout: 30000,
            maxRedirects: 5
          }
        })
      });

      if (!response.ok) {
        throw new Error(`测试失败: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setResult(data.data);
        onTestComplete?.(data.data);
      } else {
        throw new Error(data.message || '测试失败');
      }
    } catch (error) {
      console.error('高级安全测试失败:', error);
      alert('测试失败: ' + (error as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'low':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <Eye className="w-4 h-4" />;
      case 'low':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Bug className="w-4 h-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const exportReport = () => {
    if (!result) return;

    const reportData = {
      ...result,
      generatedAt: new Date().toISOString(),
      reportType: 'Advanced Security Test Report'
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${result.testId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-500" />
            高级安全测试
          </h2>
          <p className="text-gray-400 mt-1">深度安全分析和漏洞扫描</p>
        </div>
        
        {result && (
          <button
            onClick={exportReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出报告
          </button>
        )}
      </div>

      {/* 测试配置 */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            目标URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
            disabled={isRunning}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              测试类型
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {testTypeOptions.map(option => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={testTypes.includes(option.value)}
                    onChange={(e) => {
                      if (option.value === 'all') {
                        setTestTypes(e.target.checked ? ['all'] : []);
                      } else {
                        if (e.target.checked) {
                          setTestTypes(prev => prev.filter(t => t !== 'all').concat(option.value));
                        } else {
                          setTestTypes(prev => prev.filter(t => t !== option.value));
                        }
                      }
                    }}
                    className="rounded text-blue-600"
                    disabled={isRunning}
                  />
                  <div>
                    <span className="text-gray-300 text-sm">{option.label}</span>
                    <p className="text-gray-500 text-xs">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              扫描深度
            </label>
            <select
              value={depth}
              onChange={(e) => setDepth(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              disabled={isRunning}
            >
              <option value="basic">基础扫描 (快速)</option>
              <option value="standard">标准扫描 (推荐)</option>
              <option value="deep">深度扫描 (全面)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleRunTest}
          disabled={isRunning || !url.trim()}
          className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              正在扫描...
            </>
          ) : (
            <>
              <Shield className="w-5 h-5" />
              开始安全扫描
            </>
          )}
        </button>
      </div>

      {/* 测试结果 */}
      {result && (
        <div className="space-y-6">
          {/* 安全评分概览 */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">安全评分</h3>
              <div className={`text-2xl font-bold ${getScoreColor(result.summary.securityScore)}`}>
                {result.summary.securityScore}/100
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-red-400 text-xl font-bold">{result.summary.criticalVulnerabilities}</div>
                <div className="text-gray-400 text-sm">严重</div>
              </div>
              <div className="text-center">
                <div className="text-orange-400 text-xl font-bold">{result.summary.highVulnerabilities}</div>
                <div className="text-gray-400 text-sm">高危</div>
              </div>
              <div className="text-center">
                <div className="text-yellow-400 text-xl font-bold">{result.summary.mediumVulnerabilities}</div>
                <div className="text-gray-400 text-sm">中危</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 text-xl font-bold">{result.summary.lowVulnerabilities}</div>
                <div className="text-gray-400 text-sm">低危</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-xl font-bold">{result.summary.totalVulnerabilities}</div>
                <div className="text-gray-400 text-sm">总计</div>
              </div>
            </div>
          </div>

          {/* 标签页 */}
          <div className="flex space-x-1 bg-gray-700 rounded-lg p-1">
            {[
              { key: 'overview', label: '概览', icon: Target },
              { key: 'vulnerabilities', label: '漏洞', icon: Bug },
              { key: 'headers', label: '安全头部', icon: Shield },
              { key: 'ssl', label: 'SSL/TLS', icon: Lock },
              { key: 'recommendations', label: '建议', icon: FileText }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* 标签页内容 */}
          <div className="bg-gray-700 rounded-lg p-4">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <h3 className="text-white font-medium mb-3">测试概览</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-gray-300 font-medium mb-2">测试信息</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">测试ID:</span>
                        <span className="text-gray-300">{result.testId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">测试时间:</span>
                        <span className="text-gray-300">{new Date(result.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">目标URL:</span>
                        <span className="text-gray-300 truncate">{result.url}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-gray-300 font-medium mb-2">安全状态</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {result.sslAnalysis.supported ? (
                          <Lock className="w-4 h-4 text-green-400" />
                        ) : (
                          <Unlock className="w-4 h-4 text-red-400" />
                        )}
                        <span className="text-gray-300 text-sm">
                          {result.sslAnalysis.supported ? 'HTTPS已启用' : 'HTTPS未启用'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {result.securityHeaders.score > 70 ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        )}
                        <span className="text-gray-300 text-sm">
                          安全头部评分: {result.securityHeaders.score}/100
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'vulnerabilities' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium">发现的漏洞</h3>
                  <button
                    onClick={() => setShowPayloads(!showPayloads)}
                    className="flex items-center gap-2 px-3 py-1 bg-gray-600 text-gray-300 rounded text-sm hover:bg-gray-500"
                  >
                    {showPayloads ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showPayloads ? '隐藏载荷' : '显示载荷'}
                  </button>
                </div>
                
                {result.vulnerabilities.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
                    未发现安全漏洞
                  </div>
                ) : (
                  <div className="space-y-3">
                    {result.vulnerabilities.map((vuln, index) => (
                      <div key={index} className={`border rounded-lg p-4 ${getSeverityColor(vuln.severity)}`}>
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(vuln.severity)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{vuln.type}</h4>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(vuln.severity)}`}>
                                {vuln.severity.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm mb-2">{vuln.description}</p>
                            <div className="text-xs space-y-1">
                              <div><strong>位置:</strong> {vuln.location}</div>
                              <div><strong>影响:</strong> {vuln.impact}</div>
                              <div><strong>建议:</strong> {vuln.recommendation}</div>
                              {showPayloads && vuln.payload && (
                                <div><strong>载荷:</strong> <code className="bg-gray-800 px-1 rounded">{vuln.payload}</code></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'headers' && (
              <div className="space-y-4">
                <h3 className="text-white font-medium">安全头部分析</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-green-400 font-medium mb-2">已配置的头部</h4>
                    {Object.keys(result.securityHeaders.present).length === 0 ? (
                      <p className="text-gray-400 text-sm">无</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(result.securityHeaders.present).map(([header, info]: [string, any]) => (
                          <div key={header} className="bg-green-500/10 border border-green-500/20 rounded p-2">
                            <div className="font-medium text-green-400">{info.name}</div>
                            <div className="text-xs text-gray-300">{info.description}</div>
                            <div className="text-xs text-gray-400 mt-1">值: {info.value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-red-400 font-medium mb-2">缺失的头部</h4>
                    {result.securityHeaders.missing.length === 0 ? (
                      <p className="text-gray-400 text-sm">无</p>
                    ) : (
                      <div className="space-y-2">
                        {result.securityHeaders.missing.map((header: any, index: number) => (
                          <div key={index} className="bg-red-500/10 border border-red-500/20 rounded p-2">
                            <div className="font-medium text-red-400">{header.name}</div>
                            <div className="text-xs text-gray-300">{header.description}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ssl' && (
              <div className="space-y-4">
                <h3 className="text-white font-medium">SSL/TLS 分析</h3>
                
                {result.sslAnalysis.supported ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-gray-300 font-medium mb-2">证书信息</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">颁发者:</span>
                            <span className="text-gray-300">{result.sslAnalysis.certificate?.issuer?.CN || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">有效期至:</span>
                            <span className="text-gray-300">{result.sslAnalysis.certificate?.validTo || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-gray-300 font-medium mb-2">加密信息</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">加密套件:</span>
                            <span className="text-gray-300">{result.sslAnalysis.cipher?.name || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">协议版本:</span>
                            <span className="text-gray-300">{result.sslAnalysis.cipher?.version || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {result.sslAnalysis.issues.length > 0 && (
                      <div>
                        <h4 className="text-red-400 font-medium mb-2">发现的问题</h4>
                        <div className="space-y-1">
                          {result.sslAnalysis.issues.map((issue: string, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              <span className="text-gray-300">{issue}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Unlock className="w-12 h-12 mx-auto mb-2 text-red-400" />
                    <p className="text-red-400">网站未启用HTTPS</p>
                    <p className="text-gray-400 text-sm mt-1">建议启用HTTPS以保护数据传输</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'recommendations' && (
              <div className="space-y-4">
                <h3 className="text-white font-medium">安全建议</h3>
                
                {result.recommendations.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
                    暂无特别建议，安全状况良好
                  </div>
                ) : (
                  <div className="space-y-3">
                    {result.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <Zap className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityTest;
