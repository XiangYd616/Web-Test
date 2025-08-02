import {
  AlertTriangle,
  BarChart3,
  Clock,
  Download,
  Eye,
  Gauge,
  Globe,
  Play,
  Square,
  Timer,
  Wifi,
  Zap
} from 'lucide-react';
import React, { useCallback, useState } from 'react';
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

type TestMode = 'quick' | 'standard' | 'comprehensive';
type NetworkCondition = 'fast' | 'slow' | 'mobile';
type TestEngine = 'pagespeed' | 'lighthouse' | 'gtmetrix' | 'webpagetest' | 'local';

interface PerformanceTestConfig {
  url: string;
  mode: TestMode;
  checkPageSpeed: boolean;
  checkCoreWebVitals: boolean;
  checkResourceOptimization: boolean;
  checkCaching: boolean;
  checkCompression: boolean;
  checkImageOptimization: boolean;
  checkJavaScriptOptimization: boolean;
  checkCSSOptimization: boolean;
  checkMobilePerformance: boolean;
  checkAccessibility: boolean;
  device: 'desktop' | 'mobile' | 'both';
  networkCondition: NetworkCondition;
  engine: TestEngine;
  location: string;
  runs: number;
}

interface PerformanceTestResult {
  id: string;
  url: string;
  timestamp: string;
  engine: TestEngine;
  device: string;
  location: string;
  overallScore: number;
  coreWebVitals: {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    ttfb: number;
    si: number;
  };
  metrics: {
    loadTime: number;
    domContentLoaded: number;
    firstPaint: number;
    pageSize: number;
    requests: number;
    domElements: number;
  };
  opportunities: Array<{
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    savings: number;
  }>;
  diagnostics: Array<{
    title: string;
    description: string;
    severity: 'error' | 'warning' | 'info';
  }>;
}

const PerformanceTestMigrated: React.FC = () => {
  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "性能测试",
    description: "使用性能测试功能"
  });

  // 状态管理
  const [testConfig, setTestConfig] = useState<PerformanceTestConfig>({
    url: '',
    mode: 'standard',
    checkPageSpeed: true,
    checkCoreWebVitals: true,
    checkResourceOptimization: true,
    checkCaching: true,
    checkCompression: true,
    checkImageOptimization: false,
    checkJavaScriptOptimization: false,
    checkCSSOptimization: false,
    checkMobilePerformance: false,
    checkAccessibility: false,
    device: 'desktop',
    networkCondition: 'fast',
    engine: 'lighthouse',
    location: 'beijing',
    runs: 1
  });

  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [testProgressMessage, setTestProgressMessage] = useState('');
  const [testResult, setTestResult] = useState<PerformanceTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'test' | 'history' | 'comparison'>('test');
  const [showReportModal, setShowReportModal] = useState(false);

  // 性能检测项目
  const performanceTests = [
    {
      key: 'checkPageSpeed',
      name: '页面速度',
      description: '检测页面加载速度',
      icon: Timer,
      color: 'blue',
      estimatedTime: '10-20秒'
    },
    {
      key: 'checkCoreWebVitals',
      name: 'Core Web Vitals',
      description: '检测核心网页指标',
      icon: Gauge,
      color: 'green',
      estimatedTime: '15-30秒'
    },
    {
      key: 'checkResourceOptimization',
      name: '资源优化',
      description: '检查资源加载优化',
      icon: Zap,
      color: 'yellow',
      estimatedTime: '20-40秒'
    },
    {
      key: 'checkCaching',
      name: '缓存策略',
      description: '检查缓存配置',
      icon: Clock,
      color: 'purple',
      estimatedTime: '10-20秒'
    },
    {
      key: 'checkCompression',
      name: '压缩优化',
      description: '检查Gzip/Brotli压缩',
      icon: Wifi,
      color: 'indigo',
      estimatedTime: '10-15秒'
    },
    {
      key: 'checkImageOptimization',
      name: '图片优化',
      description: '检查图片压缩和格式',
      icon: Eye,
      color: 'pink',
      estimatedTime: '15-25秒'
    }
  ];

  // 选项配置
  const testModeOptions = [
    { value: 'quick', label: '快速测试 (30秒)' },
    { value: 'standard', label: '标准测试 (60秒)' },
    { value: 'comprehensive', label: '全面测试 (120秒)' }
  ];

  const deviceOptions = [
    { value: 'desktop', label: '桌面端' },
    { value: 'mobile', label: '移动端' },
    { value: 'both', label: '桌面+移动' }
  ];

  const networkOptions = [
    { value: 'fast', label: '快速网络 (4G+)' },
    { value: 'slow', label: '慢速网络 (3G)' },
    { value: 'mobile', label: '移动网络' }
  ];

  const engineOptions = [
    { value: 'lighthouse', label: 'Google Lighthouse' },
    { value: 'pagespeed', label: 'PageSpeed Insights' },
    { value: 'gtmetrix', label: 'GTmetrix' },
    { value: 'webpagetest', label: 'WebPageTest' },
    { value: 'local', label: '本地测试' }
  ];

  const locationOptions = [
    { value: 'beijing', label: '北京' },
    { value: 'shanghai', label: '上海' },
    { value: 'guangzhou', label: '广州' },
    { value: 'hongkong', label: '香港' },
    { value: 'singapore', label: '新加坡' },
    { value: 'tokyo', label: '东京' },
    { value: 'london', label: '伦敦' },
    { value: 'newyork', label: '纽约' }
  ];

  // 标签页选项
  const tabOptions = [
    { key: 'test', label: '性能测试', icon: Timer },
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
  const handleStartTest = useCallback(async () => {
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
      setTestProgress(0);

      // 模拟测试进度
      const progressSteps = [
        { message: '正在连接测试服务器...', progress: 10 },
        { message: '开始页面加载测试...', progress: 25 },
        { message: '分析Core Web Vitals...', progress: 40 },
        { message: '检查资源优化...', progress: 60 },
        { message: '评估缓存策略...', progress: 80 },
        { message: '生成性能报告...', progress: 100 }
      ];

      for (const step of progressSteps) {
        setTestProgressMessage(step.message);
        setTestProgress(step.progress);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // 模拟测试结果
      const mockResult: PerformanceTestResult = {
        id: `perf_${Date.now()}`,
        url: testConfig.url,
        timestamp: new Date().toISOString(),
        engine: testConfig.engine,
        device: testConfig.device,
        location: testConfig.location,
        overallScore: 78,
        coreWebVitals: {
          lcp: 2.1,
          fid: 85,
          cls: 0.08,
          fcp: 1.2,
          ttfb: 0.6,
          si: 2.8
        },
        metrics: {
          loadTime: 3200,
          domContentLoaded: 1800,
          firstPaint: 1200,
          pageSize: 2.4,
          requests: 45,
          domElements: 1250
        },
        opportunities: [
          {
            title: '启用文本压缩',
            description: '对文本资源启用压缩可减少网络传输时间',
            impact: 'high',
            savings: 1.2
          },
          {
            title: '优化图片格式',
            description: '使用WebP格式可减少图片大小',
            impact: 'medium',
            savings: 0.8
          }
        ],
        diagnostics: [
          {
            title: '避免过大的DOM',
            description: 'DOM元素过多会影响页面性能',
            severity: 'warning'
          }
        ]
      };

      setTestResult(mockResult);

    } catch (error) {
      console.error('性能测试失败:', error);
      setError('测试过程中发生错误，请重试');
    } finally {
      setIsTestRunning(false);
      setTestProgress(0);
      setTestProgressMessage('');
    }
  }, [testConfig]);

  // 停止测试
  const handleStopTest = () => {
    setIsTestRunning(false);
    setTestProgress(0);
    setTestProgressMessage('');
  };

  // 生成报告
  const generateReport = () => {
    setShowReportModal(true);
  };

  // 获取Core Web Vitals状态
  const getCWVStatus = (metric: string, value: number) => {
    const thresholds: Record<string, { good: number; poor: number }> = {
      lcp: { good: 2.5, poor: 4.0 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      fcp: { good: 1.8, poor: 3.0 },
      ttfb: { good: 0.8, poor: 1.8 }
    };

    const threshold = thresholds[metric];
    if (!threshold) return { status: 'info' as const, text: '未知' };

    if (value <= threshold.good) {
      return { status: 'success' as const, text: '良好' };
    } else if (value <= threshold.poor) {
      return { status: 'warning' as const, text: '需改进' };
    } else {
      return { status: 'error' as const, text: '较差' };
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
                  <Timer className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <CardTitle>性能测试 (新版本)</CardTitle>
                  <p className="text-sm text-gray-400 mt-1">
                    全面检测网站性能和Core Web Vitals指标
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
                  {/* 基础配置 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="网站URL"
                      placeholder="https://www.example.com"
                      value={testConfig.url}
                      onChange={(e) => handleConfigChange('url', e.target.value)}
                      leftIcon={<Globe className="w-4 h-4" />}
                    />
                    <Select
                      label="测试模式"
                      options={testModeOptions}
                      value={testConfig.mode}
                      onChange={(e) => handleConfigChange('mode', e.target.value)}
                    />
                  </div>

                  {/* 高级配置 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Select
                      label="设备类型"
                      options={deviceOptions}
                      value={testConfig.device}
                      onChange={(e) => handleConfigChange('device', e.target.value)}
                    />
                    <Select
                      label="网络条件"
                      options={networkOptions}
                      value={testConfig.networkCondition}
                      onChange={(e) => handleConfigChange('networkCondition', e.target.value)}
                    />
                    <Select
                      label="测试引擎"
                      options={engineOptions}
                      value={testConfig.engine}
                      onChange={(e) => handleConfigChange('engine', e.target.value)}
                    />
                    <Select
                      label="测试位置"
                      options={locationOptions}
                      value={testConfig.location}
                      onChange={(e) => handleConfigChange('location', e.target.value)}
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
                      <Play className="w-4 h-4" />
                      {isTestRunning ? '测试中...' : '开始性能测试'}
                    </Button>
                    {isTestRunning && (
                      <Button variant="ghost" onClick={handleStopTest}>
                        <Square className="w-4 h-4" />
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
                  {performanceTests.map((test) => {
                    const Icon = test.icon;
                    return (
                      <div
                        key={test.key}
                        className="p-4 border border-gray-700/50 rounded-lg hover:border-gray-600/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <SimpleCheckbox
                            checked={testConfig[test.key as keyof PerformanceTestConfig] as boolean}
                            onChange={(e) => handleConfigChange(test.key, e.target.checked)}
                            aria-label={`启用${test.name}测试`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className="w-4 h-4 text-blue-400" />
                              <h4 className="font-medium text-white text-sm">{test.name}</h4>
                            </div>
                            <p className="text-xs text-gray-400 mb-2">{test.description}</p>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-gray-500" />
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
            {isTestRunning && (
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Timer className="w-5 h-5 animate-pulse text-blue-400" />
                      <div>
                        <h3 className="font-medium text-white">性能测试进行中</h3>
                        <p className="text-sm text-gray-400">{testProgressMessage}</p>
                      </div>
                    </div>
                    <Button variant="ghost" onClick={handleStopTest}>
                      停止测试
                    </Button>
                  </div>
                  <ProgressBadge value={testProgress} showValue />
                </CardBody>
              </Card>
            )}

            {/* 测试结果 */}
            {testResult && (
              <>
                {/* 总体评分 */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>性能测试结果</CardTitle>
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-400 mb-2">
                          {testResult.overallScore}
                        </div>
                        <div className="text-gray-400 mb-2">性能评分</div>
                        <ProgressBadge value={testResult.overallScore} />
                      </div>

                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-400 mb-2">
                          {testResult.metrics.loadTime}ms
                        </div>
                        <div className="text-gray-400 mb-2">加载时间</div>
                        <StatusBadge
                          status={testResult.metrics.loadTime < 3000 ? 'success' : 'warning'}
                          text={testResult.metrics.loadTime < 3000 ? '良好' : '需优化'}
                        />
                      </div>

                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-400 mb-2">
                          {testResult.metrics.pageSize}MB
                        </div>
                        <div className="text-gray-400 mb-2">页面大小</div>
                        <StatusBadge
                          status={testResult.metrics.pageSize < 3 ? 'success' : 'warning'}
                          text={testResult.metrics.pageSize < 3 ? '合理' : '偏大'}
                        />
                      </div>

                      <div className="text-center">
                        <div className="text-3xl font-bold text-yellow-400 mb-2">
                          {testResult.metrics.requests}
                        </div>
                        <div className="text-gray-400 mb-2">请求数量</div>
                        <StatusBadge
                          status={testResult.metrics.requests < 50 ? 'success' : 'warning'}
                          text={testResult.metrics.requests < 50 ? '良好' : '较多'}
                        />
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Core Web Vitals */}
                <Card>
                  <CardHeader>
                    <CardTitle>Core Web Vitals</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(testResult.coreWebVitals).slice(0, 3).map(([key, value]) => {
                        const status = getCWVStatus(key, value);
                        const labels: Record<string, string> = {
                          lcp: 'LCP (最大内容绘制)',
                          fid: 'FID (首次输入延迟)',
                          cls: 'CLS (累积布局偏移)'
                        };

                        return (
                          <div key={key} className="p-4 bg-gray-800/50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-white">{labels[key]}</h4>
                              <StatusBadge {...status} />
                            </div>
                            <div className="text-2xl font-bold text-blue-400">
                              {key === 'fid' ? `${value}ms` : key === 'cls' ? value.toFixed(3) : `${value}s`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardBody>
                </Card>

                {/* 优化建议 */}
                {testResult.opportunities.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>优化建议</CardTitle>
                    </CardHeader>
                    <CardBody>
                      <div className="space-y-3">
                        {testResult.opportunities.map((opportunity, index) => (
                          <div key={index} className="p-4 bg-gray-800/50 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-white mb-1">{opportunity.title}</h4>
                                <p className="text-sm text-gray-400">{opportunity.description}</p>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <Badge
                                  variant={opportunity.impact === 'high' ? 'danger' : opportunity.impact === 'medium' ? 'warning' : 'info'}
                                  size="xs"
                                >
                                  {opportunity.impact === 'high' ? '高影响' : opportunity.impact === 'medium' ? '中影响' : '低影响'}
                                </Badge>
                                <span className="text-sm text-green-400">节省 {opportunity.savings}s</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                )}
              </>
            )}

            {/* 错误显示 */}
            {error && (
              <Card variant="outlined">
                <CardBody>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
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
                  这里将显示性能测试对比分析
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* 报告生成模态框 */}
        <Modal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          title="生成性能测试报告"
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

export default PerformanceTestMigrated;
