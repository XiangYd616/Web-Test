import {
  AlertTriangle,
  BarChart3,
  Download,
  Eye,
  Globe,
  Lock,
  Search,
  Shield,
  XCircle,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ProgressBadge,
  Select,
  SimpleCheckbox,
  StatusBadge
} from '../components/ui';
import { useUserStats } from '../hooks/useUserStats';
import { SecurityTestResult, TestProgress } from '../services/unifiedSecurityEngine';

interface SecurityTestConfig {
  url: string;
  testType: 'basic' | 'comprehensive';
  checkSSL: boolean;
  checkHeaders: boolean;
  checkVulnerabilities: boolean;
  checkMalware: boolean;
  checkPrivacy: boolean;
  checkCookies: boolean;
  checkCSP: boolean;
  checkXSS: boolean;
  checkSQLInjection: boolean;
  checkDDoS: boolean;
}

const SecurityTestMigrated: React.FC = () => {
  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "安全测试",
    description: "使用安全测试功能"
  });

  // 状态管理
  const [testConfig, setTestConfig] = useState<SecurityTestConfig>({
    url: '',
    testType: 'basic',
    checkSSL: true,
    checkHeaders: true,
    checkVulnerabilities: true,
    checkMalware: true,
    checkPrivacy: false,
    checkCookies: false,
    checkCSP: false,
    checkXSS: false,
    checkSQLInjection: false,
    checkDDoS: false
  });

  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testProgress, setTestProgress] = useState<TestProgress | null>(null);
  const [testResult, setTestResult] = useState<SecurityTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'test' | 'history' | 'comparison'>('test');
  const [showReportModal, setShowReportModal] = useState(false);

  // 用户统计
  const { stats } = useUserStats();

  // 安全检测项目配置
  const securityTests = [
    {
      key: 'checkSSL',
      name: 'SSL/TLS安全',
      description: '检查HTTPS配置和证书有效性',
      icon: Lock,
      color: 'green',
      estimatedTime: '10-15秒',
      priority: 'high',
      category: 'basic'
    },
    {
      key: 'checkHeaders',
      name: '安全头部',
      description: '检查HTTP安全头部配置',
      icon: Shield,
      color: 'blue',
      estimatedTime: '15-20秒',
      priority: 'high',
      category: 'basic'
    },
    {
      key: 'checkVulnerabilities',
      name: '漏洞扫描',
      description: '检测常见安全漏洞',
      icon: AlertTriangle,
      color: 'red',
      estimatedTime: '30-45秒',
      priority: 'high',
      category: 'basic'
    },
    {
      key: 'checkMalware',
      name: '恶意软件',
      description: '检测恶意软件和病毒',
      icon: Search,
      color: 'purple',
      estimatedTime: '20-30秒',
      priority: 'high',
      category: 'basic'
    },
    {
      key: 'checkPrivacy',
      name: '隐私保护',
      description: '检查隐私政策和数据保护',
      icon: Eye,
      color: 'indigo',
      estimatedTime: '25-35秒',
      priority: 'medium',
      category: 'advanced'
    },
    {
      key: 'checkCookies',
      name: 'Cookie安全',
      description: '检查Cookie配置和安全性',
      icon: Globe,
      color: 'yellow',
      estimatedTime: '15-25秒',
      priority: 'medium',
      category: 'advanced'
    },
    {
      key: 'checkCSP',
      name: '内容安全策略',
      description: '检查CSP配置',
      icon: Shield,
      color: 'cyan',
      estimatedTime: '20-30秒',
      priority: 'medium',
      category: 'advanced'
    },
    {
      key: 'checkXSS',
      name: 'XSS防护',
      description: '检测跨站脚本攻击防护',
      icon: Zap,
      color: 'orange',
      estimatedTime: '25-40秒',
      priority: 'medium',
      category: 'advanced'
    }
  ];

  // 测试类型选项
  const testTypeOptions = [
    { value: 'basic', label: '基础安全检测' },
    { value: 'comprehensive', label: '全面安全检测' }
  ];

  // 标签页选项
  const tabOptions = [
    { key: 'test', label: '安全测试', icon: Shield },
    { key: 'history', label: '测试历史', icon: BarChart3 },
    { key: 'comparison', label: '对比分析', icon: Eye }
  ];

  // 处理配置变更
  const handleConfigChange = (key: string, value: any) => {
    setTestConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 开始测试
  const handleStartTest = async () => {
    // 检查登录状态
    if (!requireLogin()) {
      return;
    }

    if (!testConfig.url.trim()) {
      alert('请输入要测试的URL');
      return;
    }

    try {
      setIsTestRunning(true);
      setError(null);
      setTestResult(null);

      // 模拟测试进度
      const progressSteps: TestProgress[] = [
        { phase: 'initializing', progress: 10, currentModule: '连接检查', currentCheck: '正在连接目标网站...' },
        { phase: 'scanning', progress: 25, currentModule: 'SSL检查', currentCheck: '检查SSL/TLS配置...' },
        { phase: 'scanning', progress: 40, currentModule: '安全头部', currentCheck: '扫描安全头部...' },
        { phase: 'analyzing', progress: 60, currentModule: '漏洞检测', currentCheck: '检测安全漏洞...' },
        { phase: 'analyzing', progress: 80, currentModule: '恶意软件', currentCheck: '分析恶意软件...' },
        { phase: 'reporting', progress: 100, currentModule: '报告生成', currentCheck: '生成安全报告...' }
      ];

      for (const step of progressSteps) {
        setTestProgress(step);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 模拟测试结果
      const mockResult: SecurityTestResult = {
        id: `security_${Date.now()}`,
        url: testConfig.url,
        timestamp: new Date().toISOString(),
        duration: 5000,
        status: 'completed',
        overallScore: 85,
        riskLevel: 'medium',
        grade: 'B',
        modules: {
          headers: {
            score: 88,
            securityHeaders: [],
            recommendations: []
          }
        },
        findings: [
          {
            id: 'finding-1',
            type: 'security-header',
            category: 'headers',
            severity: 'medium',
            title: '缺少安全头部',
            description: '网站缺少重要的安全响应头',
            impact: '可能导致XSS攻击',
            cvss: 5.0
          }
        ],
        compliance: [],
        statistics: {
          totalChecks: 10,
          passedChecks: 7,
          failedChecks: 3,
          warningChecks: 0,
          skippedChecks: 0,
          executionTime: 5000,
          requestCount: 15,
          errorCount: 3
        },
        recommendations: [
          {
            id: 'rec-1',
            category: 'headers',
            priority: 'high',
            title: '启用HSTS头部',
            description: '建议启用HSTS头部以增强安全性',
            solution: '在服务器配置中添加Strict-Transport-Security头部',
            effort: 'low',
            impact: 'high'
          },
          {
            id: 'rec-2',
            category: 'headers',
            priority: 'medium',
            title: '优化CSP配置',
            description: '优化Content Security Policy配置',
            solution: '配置更严格的CSP策略以防止XSS攻击',
            effort: 'medium',
            impact: 'medium'
          },
          {
            id: 'rec-3',
            category: 'vulnerabilities',
            priority: 'medium',
            title: '修复中等风险漏洞',
            description: '修复发现的中等风险漏洞',
            solution: '根据漏洞扫描结果修复相关安全问题',
            effort: 'medium',
            impact: 'medium'
          }
        ]
      };

      setTestResult(mockResult);
      // 统计信息已在mockResult中设置

    } catch (error) {
      console.error('安全测试失败:', error);
      setError('测试过程中发生错误，请重试');
    } finally {
      setIsTestRunning(false);
      setTestProgress(null);
    }
  };

  // 停止测试
  const handleStopTest = () => {
    setIsTestRunning(false);
    setTestProgress(null);
  };

  // 生成报告
  const generateReport = () => {
    setShowReportModal(true);
  };

  // 获取安全等级配置
  const getSecurityGradeConfig = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return { status: 'success' as const, text: grade };
      case 'B+':
      case 'B':
        return { status: 'warning' as const, text: grade };
      case 'C+':
      case 'C':
        return { status: 'error' as const, text: grade };
      default:
        return { status: 'info' as const, text: grade };
    }
  };

  // 移除强制登录检查，允许未登录用户查看页面
  // 在使用功能时才提示登录

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* 页面标题 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                  <Shield className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <CardTitle>安全测试 (新版本)</CardTitle>
                  <p className="text-sm text-gray-400 mt-1">
                    全面检测网站安全漏洞和防护措施
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">已迁移</Badge>
                {isTestRunning && (
                  <StatusBadge status="loading" text="测试中" />
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 标签页导航 */}
        <Card>
          <CardBody className="p-0">
            <div className="flex border-b border-gray-700/50">
              {tabOptions.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === tab.key
                      ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
                      : 'text-gray-400 hover:text-gray-300'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* 测试页面内容 */}
        {activeTab === 'test' && (
          <>
            {/* 测试配置 */}
            <Card>
              <CardHeader>
                <CardTitle>测试配置</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-6">
                  {/* URL和测试类型 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="网站URL"
                      placeholder="https://www.example.com"
                      value={testConfig.url}
                      onChange={(e) => handleConfigChange('url', e.target.value)}
                      leftIcon={<Globe className="w-4 h-4" />}
                    />
                    <Select
                      label="测试类型"
                      options={testTypeOptions}
                      value={testConfig.testType}
                      onChange={(e) => handleConfigChange('testType', e.target.value)}
                    />
                  </div>

                  {/* 开始测试按钮 */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleStartTest}
                      disabled={isTestRunning || !testConfig.url.trim()}
                      loading={isTestRunning}
                      className="flex-1"
                    >
                      {isTestRunning ? '测试中...' : '开始安全测试'}
                    </Button>
                    {isTestRunning && (
                      <Button variant="ghost" onClick={handleStopTest}>
                        停止测试
                      </Button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* 检测项目选择 */}
            <Card>
              <CardHeader>
                <CardTitle>检测项目</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {securityTests.map((test) => {
                    const Icon = test.icon;
                    return (
                      <div
                        key={test.key}
                        className="p-4 border border-gray-700/50 rounded-lg hover:border-gray-600/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <SimpleCheckbox
                            checked={testConfig[test.key as keyof SecurityTestConfig] as boolean}
                            onChange={(e) => handleConfigChange(test.key, e.target.checked)}
                            aria-label={`启用${test.name}测试`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className="w-4 h-4 text-blue-400" />
                              <h4 className="font-medium text-white text-sm">{test.name}</h4>
                              {test.priority === 'high' && (
                                <Badge variant="warning" size="xs">核心</Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mb-2">{test.description}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{test.estimatedTime}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>

            {/* 测试进度 */}
            {isTestRunning && testProgress && (
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 animate-pulse text-blue-400" />
                      <div>
                        <h3 className="font-medium text-white">安全测试进行中</h3>
                        <p className="text-sm text-gray-400">{testProgress.currentCheck}</p>
                      </div>
                    </div>
                    <Button variant="ghost" onClick={handleStopTest}>
                      停止测试
                    </Button>
                  </div>
                  <ProgressBadge value={testProgress.progress} showValue />
                </CardBody>
              </Card>
            )}

            {/* 测试结果 */}
            {testResult && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>安全测试结果</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={generateReport}>
                        <Download className="w-4 h-4" />
                        生成报告
                      </Button>
                      <Button onClick={() => window.location.reload()}>
                        重新测试
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  {/* 总体评分 */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-400 mb-2">
                        {testResult.overallScore}
                      </div>
                      <div className="text-gray-400 mb-2">安全评分</div>
                      <ProgressBadge value={testResult.overallScore} />
                    </div>

                    <div className="text-center">
                      <div className="text-2xl font-bold text-white mb-2">
                        {testResult.grade}
                      </div>
                      <div className="text-gray-400 mb-2">安全等级</div>
                      <StatusBadge
                        {...getSecurityGradeConfig(testResult.grade)}
                      />
                    </div>

                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-400 mb-2">
                        {testResult.findings?.filter(f => f.severity === 'critical' || f.severity === 'high').length || 0}
                      </div>
                      <div className="text-gray-400 mb-2">高危漏洞</div>
                      <StatusBadge
                        status={(testResult.findings?.filter(f => f.severity === 'critical' || f.severity === 'high').length || 0) > 0 ? 'error' : 'success'}
                        text={(testResult.findings?.filter(f => f.severity === 'critical' || f.severity === 'high').length || 0) > 0 ? '需修复' : '安全'}
                      />
                    </div>

                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-400 mb-2">
                        {testResult.findings?.filter(f => f.severity === 'medium' || f.severity === 'low').length || 0}
                      </div>
                      <div className="text-gray-400 mb-2">中低危漏洞</div>
                      <StatusBadge
                        status={(testResult.findings?.filter(f => f.severity === 'medium' || f.severity === 'low').length || 0) > 0 ? 'warning' : 'success'}
                        text={(testResult.findings?.filter(f => f.severity === 'medium' || f.severity === 'low').length || 0) > 0 ? '建议修复' : '良好'}
                      />
                    </div>
                  </div>

                  {/* 检测详情 */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-white">检测详情</h4>
                    {testResult.findings?.map((finding) => (
                      <div key={finding.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <StatusBadge
                            status={finding.severity === 'low' ? 'success' : finding.severity === 'medium' ? 'warning' : 'error'}
                            text={finding.severity === 'low' ? '通过' : finding.severity === 'medium' ? '警告' : '失败'}
                          />
                          <span className="text-white">{finding.title}</span>
                        </div>
                        <ProgressBadge value={finding.cvss || 0} />
                      </div>
                    )) || []}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* 错误显示 */}
            {error && (
              <Card variant="outlined">
                <CardBody>
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-400 mb-2">测试失败</h4>
                      <p className="text-sm text-red-300">{error}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3"
                        onClick={() => setError(null)}
                      >
                        重试
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
          </>
        )}

        {/* 测试历史页面 */}
        {activeTab === 'history' && (
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">测试历史</h3>
                <p className="text-gray-400">
                  这里将显示历史测试记录
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* 对比分析页面 */}
        {activeTab === 'comparison' && (
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">对比分析</h3>
                <p className="text-gray-400">
                  这里将显示安全测试对比分析
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* 报告生成模态框 */}
        <Modal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          title="生成安全测试报告"
          size="md"
        >
          <ModalBody>
            <div className="space-y-4">
              <p className="text-gray-300">
                选择要生成的报告格式：
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
                  <BarChart3 className="w-6 h-6" />
                  <span className="font-medium">PDF报告</span>
                  <span className="text-xs text-gray-400">专业格式</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
                  <Globe className="w-6 h-6" />
                  <span className="font-medium">HTML报告</span>
                  <span className="text-xs text-gray-400">交互式</span>
                </Button>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowReportModal(false)}>
              取消
            </Button>
            <Button onClick={() => setShowReportModal(false)}>
              生成报告
            </Button>
          </ModalFooter>
        </Modal>

        {/* 登录提示组件 */}
        {LoginPromptComponent}
      </div>
    </div>
  );
};

export default SecurityTestMigrated;
