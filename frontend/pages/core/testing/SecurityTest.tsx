/**
 * 安全测试页面
 * 提供全面的网站安全测试功能
 */

import { Shield } from 'lucide-react';
import React, { useEffect } from 'react';

interface SecurityTestConfig {
  url: string;
  depth: 'basic' | 'standard' | 'comprehensive';
  timeout: number;
  retries: number;
  modules: {
    ssl: boolean;
    headers: boolean;
    vulnerabilities: boolean;
    cookies: boolean;
    content: boolean;
    owasp: boolean;
  };
  advanced: {
    userAgent?: string;
    followRedirects?: boolean;
    maxRedirects?: number;
    includeSubdomains?: boolean;
    customHeaders?: Record<string, string>;
  };
}

interface SecurityTestResult {
  testId: string;
  url: string;
  timestamp: number;
  overallScore: number;
  securityGrade: string;
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  vulnerabilities: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    solution: string;
    impact: string;
  }>;
  securityHeaders: {
    present: string[];
    missing: string[];
    recommendations: string[];
  };
  sslAnalysis: {
    enabled: boolean;
    grade: string;
    issues: string[];
    certificate: any;
  };
  owaspFindings: Array<{
    category: string;
    risk: string;
    description: string;
    recommendation: string;
  }>;
  recommendations: string[];
  duration: number;
}

const SecurityTest: React.FC = () => {
  
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  
  const showFeedback = (type, message, duration = 3000) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });
    }, duration);
  };
  
  useEffect(() => {
    if (state.error) {
      showFeedback('error', state.error.message);
    }
  }, [state.error]);
  
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  
  const handleConfirmAction = (action, message) => {
    setConfirmAction({ action, message });
    setShowConfirmDialog(true);
  };
  
  const executeConfirmedAction = async () => {
    if (confirmAction) {
      await confirmAction.action();
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };
  
  const [buttonStates, setButtonStates] = useState({});
  
  const setButtonLoading = (buttonId, loading) => {
    setButtonStates(prev => ({
      ...prev,
      [buttonId]: { ...prev[buttonId], loading }
    }));
  };
  
  const setButtonDisabled = (buttonId, disabled) => {
    setButtonStates(prev => ({
      ...prev,
      [buttonId]: { ...prev[buttonId], disabled }
    }));
  };
  const [config, setConfig] = useState<SecurityTestConfig>({
    url: '',
    depth: 'standard',
    timeout: 30000,
    retries: 2,
    modules: {
      ssl: true,
      headers: true,
      vulnerabilities: true,
      cookies: true,
      content: true,
      owasp: true
    },
    advanced: {
      userAgent: 'SecurityTestBot/1.0',
      followRedirects: true,
      maxRedirects: 5,
      includeSubdomains: false
    }
  });

  const [activeTab, setActiveTab] = useState<'config' | 'results' | 'history'>('config');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SecurityTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConfigChange = (newConfig: Partial<SecurityTestConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const handleModuleChange = (module: keyof SecurityTestConfig['modules'], enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      modules: { ...prev.modules, [module]: enabled }
    }));
  };

  const handleStartTest = async () => {
    if (!config.url) {
      
        alert('请输入测试URL');
      return;
      }

    setIsRunning(true);
    setProgress(0);
    setResult(null);
    setError(null);

    try {
      // 模拟测试进度
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            
        clearInterval(progressInterval);
            return 100;
      }
          return prev + 10;
        });
      }, 500);

      // 模拟API调用
      const response = await fetch('/api/v1/tests/security/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`测试失败: ${response.status}`);
      }

      const data = await response.json();

      // 模拟测试结果
      setTimeout(() => {
        setResult({
          testId: 'sec_' + Date.now(),
          url: config.url,
          timestamp: Date.now(),
          overallScore: 85,
          securityGrade: 'B+',
          summary: {
            totalChecks: 25,
            passed: 18,
            failed: 4,
            warnings: 3
          },
          vulnerabilities: [
            {
              id: 'xss_1',
              type: 'Cross-Site Scripting',
              severity: 'high',
              title: 'XSS漏洞',
              description: '发现潜在的XSS攻击点',
              solution: '对用户输入进行适当的转义和验证',
              impact: '攻击者可能执行恶意脚本'
            }
          ],
          securityHeaders: {
            present: ['X-Frame-Options', 'X-Content-Type-Options'],
            missing: ['Content-Security-Policy', 'Strict-Transport-Security'],
            recommendations: ['添加CSP头部', '启用HSTS']
          },
          sslAnalysis: {
            enabled: true,
            grade: 'A',
            issues: [],
            certificate: {}
          },
          owaspFindings: [],
          recommendations: [
            '添加Content Security Policy头部',
            '启用Strict Transport Security',
            '修复XSS漏洞'
          ],
          duration: 5000
        });
        setIsRunning(false);
        clearInterval(progressInterval);
        setActiveTab('results');
      }, 5000);

    } catch (err) {
      setError(err instanceof Error ? err.message : '测试失败');
      setIsRunning(false);
    }
  };

  const renderConfig = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          安全测试配置
        </h3>

        {/* 基础配置 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              测试URL *
            </label>
            <input
              type="url"
              value={config.url}
              onChange={(e) => handleConfigChange({ url: e.target.value })}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                扫描深度
              </label>
              <select
                value={config.depth}
                onChange={(e) => handleConfigChange({ depth: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="basic">基础扫描</option>
                <option value="standard">标准扫描</option>
                <option value="comprehensive">全面扫描</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                超时时间 (秒)
              </label>
              <input
                type="number"
                value={config.timeout / 1000}
                onChange={(e) => handleConfigChange({ timeout: parseInt(e.target.value) * 1000 })}
                min="10"
                max="300"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 测试模块选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              测试模块
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'ssl', label: 'SSL/TLS检查', icon: '🔒' },
                { key: 'headers', label: '安全头部', icon: '📋' },
                { key: 'vulnerabilities', label: '漏洞扫描', icon: '🔍' },
                { key: 'cookies', label: 'Cookie安全', icon: '🍪' },
                { key: 'content', label: '内容安全', icon: '📄' },
                { key: 'owasp', label: 'OWASP Top 10', icon: '🛡️' }
              ].map(module => (
                <label key={module.key} className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="checkbox"
                    checked={config.modules[module.key as keyof SecurityTestConfig['modules']]}
                    onChange={(e) => handleModuleChange(module.key as keyof SecurityTestConfig['modules'], e.target.checked)}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="mr-2">{module.icon}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {module.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => setConfig({
              url: '',
              depth: 'standard',
              timeout: 30000,
              retries: 2,
              modules: {
                ssl: true,
                headers: true,
                vulnerabilities: true,
                cookies: true,
                content: true,
                owasp: true
              },
              advanced: {
                userAgent: 'SecurityTestBot/1.0',
                followRedirects: true,
                maxRedirects: 5,
                includeSubdomains: false
              }
            })}
            disabled={isRunning}
          >
            重置
          </Button>

          <Button
            variant="primary"
            onClick={handleStartTest}
            disabled={!config.url || isRunning}
            loading={isRunning}
          >
            {isRunning ? '扫描中...' : '开始安全扫描'}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderResults = () => {
    if (isRunning) {
      
        return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="text-center">
            <LoadingStates
              type="progress"
              progress={progress
      }
              message="正在执行安全扫描，请稍候..."
            />
            <div className="mt-4">
              <Button variant="secondary" onClick={() => setIsRunning(false)}>
                取消扫描
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      
        return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="text-center text-red-600 dark:text-red-400">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold mb-2">安全扫描失败</h3>
            <p className="mb-4">{error
      }</p>
            <Button variant="primary" onClick={() => { setError(null); handleStartTest(); }}>
              重新扫描
            </Button>
          </div>
        </div>
      );
    }

    if (result) {
      
        return (
        <div className="space-y-6">
          {/* 安全评分概览 */
      }
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                安全评分
              </h3>
              <div className={`px-4 py-2 rounded-full text-lg font-bold ${result.overallScore >= 90 ? 'bg-green-100 text-green-800' :
                result.overallScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                {result.securityGrade} ({result.overallScore}分)
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {result.summary.totalChecks}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">总检查项</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {result.summary.passed}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">通过</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {result.summary.failed}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">失败</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {result.summary.warnings}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">警告</div>
              </div>
            </div>
          </div>

          {/* 漏洞详情 */}
          {result.vulnerabilities.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                发现的漏洞
              </h3>

              <div className="space-y-4">
                {result.vulnerabilities.map((vuln, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {vuln.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {vuln.description}
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                          <strong>解决方案:</strong> {vuln.solution}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${vuln.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        vuln.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          vuln.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                        }`}>
                        {vuln.severity.toUpperCase()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 安全头部分析 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-500" />
              安全头部分析
            </h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">
                  ✅ 已配置的头部
                </h4>
                <div className="space-y-1">
                  {result.securityHeaders.present.map((header, index) => (
                    <div key={index} className="text-sm text-gray-700 dark:text-gray-300">
                      • {header}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">
                  ❌ 缺失的头部
                </h4>
                <div className="space-y-1">
                  {result.securityHeaders.missing.map((header, index) => (
                    <div key={index} className="text-sm text-gray-700 dark:text-gray-300">
                      • {header}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SSL分析 */}
          {result.sslAnalysis.enabled && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
                <Lock className="w-5 h-5 mr-2 text-green-500" />
                SSL/TLS分析
              </h3>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-700 dark:text-gray-300">
                    SSL等级: <span className="font-semibold">{result.sslAnalysis.grade}</span>
                  </p>
                  {result.sslAnalysis.issues.length === 0 ? (
                    <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                      ✅ SSL配置良好
                    </p>
                  ) : (
                    <div className="mt-2">
                      <p className="text-red-600 dark:text-red-400 text-sm">发现问题:</p>
                      {result.sslAnalysis.issues.map((issue, index) => (
                        <p key={index} className="text-sm text-gray-600 dark:text-gray-400 ml-4">
                          • {issue}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 改进建议 */}
          {result.recommendations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                改进建议
              </h3>

              <div className="space-y-2">
                {result.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {recommendation}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
        <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600 dark:text-gray-400">
          配置安全扫描参数并点击"开始安全扫描"来检测网站安全性
        </p>
      </div>
    );
  };

  return (
    <div className="security-test-page max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          安全测试
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          全面检测网站安全漏洞、SSL配置、安全头部和OWASP Top 10风险
        </p>
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {[
            { key: 'config', label: '安全扫描' },
            { key: 'results', label: '扫描结果' },
            { key: 'history', label: '历史记录' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.key
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 标签页内容 */}
      <div>
        {activeTab === 'config' && renderConfig()}
        {activeTab === 'results' && renderResults()}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              历史记录功能开发中...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityTest;
