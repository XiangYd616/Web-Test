import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Globe,
  HardDrive,
  Loader,
  Search,
  Settings,
  Shield,
  Smartphone,
  Square,
  XCircle,
  Zap,
  Download,
  BarChart3
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardFooter,
  Input,
  SearchInput,
  Select,
  Badge,
  StatusBadge,
  ProgressBadge,
  SimpleCheckbox,
  Modal,
  ModalBody,
  ModalFooter
} from '../components/ui';
import { useAuthCheck } from '../components/auth/withAuthCheck';
import { URLInput } from '../components/testing';
import type { SEOTestMode } from '../hooks/useUnifiedSEOTest';
import { useUnifiedSEOTest } from '../hooks/useUnifiedSEOTest';

type TestMode = 'standard' | 'comprehensive';
type TestStatusType = 'idle' | 'starting' | 'running' | 'completed' | 'failed';

interface SEOTestConfig {
  url: string;
  keywords: string;
  mode: TestMode;
  checkTechnicalSEO: boolean;
  checkContentQuality: boolean;
  checkAccessibility: boolean;
  checkPerformance: boolean;
  checkMobileFriendly: boolean;
  checkSocialMedia: boolean;
  checkStructuredData: boolean;
  checkSecurity: boolean;
  checkImageOptimization: boolean;
  checkInternalLinking: boolean;
  checkSchemaMarkup: boolean;
  checkLocalSEO: boolean;
  checkCompetitorAnalysis: boolean;
  checkKeywordDensity: boolean;
  [key: string]: any;
}

const SEOTestMigrated: React.FC = () => {
  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "SEO分析",
    description: "使用SEO分析功能"
  });

  // 统一SEO测试
  const {
    currentMode,
    isRunning,
    progress: testProgress,
    results: testResults,
    error: testError,
    startTest: startUnifiedTest,
    stopTest: stopUnifiedTest,
    switchMode
  } = useUnifiedSEOTest();

  const [testConfig, setTestConfig] = useState<SEOTestConfig>({
    url: '',
    keywords: '',
    mode: 'standard',
    checkTechnicalSEO: true,
    checkContentQuality: true,
    checkAccessibility: true,
    checkPerformance: true,
    checkMobileFriendly: true,
    checkSocialMedia: true,
    checkStructuredData: true,
    checkSecurity: true,
    checkImageOptimization: false,
    checkInternalLinking: false,
    checkSchemaMarkup: false,
    checkLocalSEO: false,
    checkCompetitorAnalysis: false,
    checkKeywordDensity: false,
  });

  const [testStatus, setTestStatus] = useState<TestStatusType>('idle');
  const [seoTestMode, setSeoTestMode] = useState<SEOTestMode>('online');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);

  // SEO检测项目配置
  const seoTests = [
    {
      key: 'checkTechnicalSEO',
      name: '页面基础SEO',
      description: '检查Title、Meta描述、H标签等基础要素',
      icon: Settings,
      color: 'blue',
      estimatedTime: '30-45秒',
      priority: 'high',
      category: 'core'
    },
    {
      key: 'checkContentQuality',
      name: '内容结构',
      description: '分析内容长度、关键词密度、可读性',
      icon: Eye,
      color: 'green',
      estimatedTime: '20-30秒',
      priority: 'high',
      category: 'core'
    },
    {
      key: 'checkPerformance',
      name: '用户体验',
      description: '检测Core Web Vitals和页面性能',
      icon: Zap,
      color: 'yellow',
      estimatedTime: '30-45秒',
      priority: 'high',
      category: 'core'
    },
    {
      key: 'checkMobileFriendly',
      name: '技术健康度',
      description: '检查HTTPS、响应速度、移动友好性',
      icon: Smartphone,
      color: 'pink',
      estimatedTime: '20-30秒',
      priority: 'high',
      category: 'core'
    },
    {
      key: 'checkAccessibility',
      name: '可访问性',
      description: '检查网站无障碍访问支持',
      icon: Shield,
      color: 'purple',
      estimatedTime: '25-35秒',
      priority: 'medium',
      category: 'advanced'
    },
    {
      key: 'checkSocialMedia',
      name: '社交媒体',
      description: '检查Open Graph和Twitter Card',
      icon: Globe,
      color: 'indigo',
      estimatedTime: '15-25秒',
      priority: 'medium',
      category: 'advanced'
    }
  ];

  // 测试模式选项
  const testModeOptions = [
    { value: 'standard', label: '标准检测 (快速)' },
    { value: 'comprehensive', label: '全面检测 (详细)' }
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
    if (!testConfig.url.trim()) {
      alert('请输入要测试的URL');
      return;
    }

    try {
      setTestStatus('starting');
      
      if (seoTestMode === 'online') {
        await startUnifiedTest({
          mode: 'online',
          online: {
            url: testConfig.url,
            keywords: testConfig.keywords,
            checkTechnicalSEO: testConfig.checkTechnicalSEO,
            checkContentQuality: testConfig.checkContentQuality,
            checkAccessibility: testConfig.checkAccessibility,
            checkPerformance: testConfig.checkPerformance,
            checkMobileFriendly: testConfig.checkMobileFriendly,
            checkSocialMedia: testConfig.checkSocialMedia,
            checkStructuredData: testConfig.checkStructuredData,
            checkSecurity: testConfig.checkSecurity,
            depth: testConfig.mode === 'comprehensive' ? 'comprehensive' : 'standard'
          }
        });
      }

      setTestStatus('running');
    } catch (error) {
      console.error('SEO测试启动失败:', error);
      setTestStatus('failed');
    }
  };

  // 停止测试
  const handleStopTest = () => {
    stopUnifiedTest();
    setTestStatus('idle');
  };

  // 生成报告
  const generateReport = () => {
    setShowReportModal(true);
  };

  // 获取测试状态配置
  const getTestStatusConfig = () => {
    switch (testStatus) {
      case 'running':
        return { status: 'loading' as const, text: '测试中' };
      case 'completed':
        return { status: 'success' as const, text: '已完成' };
      case 'failed':
        return { status: 'error' as const, text: '测试失败' };
      default:
        return { status: 'pending' as const, text: '待开始' };
    }
  };

  // 监听测试状态变化
  useEffect(() => {
    if (testResults) {
      setTestStatus('completed');
    }
    if (testError) {
      setTestStatus('failed');
    }
  }, [testResults, testError]);

  if (!isAuthenticated) {
    return LoginPromptComponent;
  }

  const statusConfig = getTestStatusConfig();

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* 页面标题 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                  <Search className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <CardTitle>SEO综合分析 (新版本)</CardTitle>
                  <p className="text-sm text-gray-400 mt-1">
                    全面分析网站SEO状况，发现关键问题和优化机会
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">已迁移</Badge>
                <StatusBadge 
                  status={statusConfig.status} 
                  text={statusConfig.text}
                />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 测试配置 */}
        <Card>
          <CardHeader>
            <CardTitle>测试配置</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {/* URL输入 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="网站URL"
                  placeholder="https://www.example.com"
                  value={testConfig.url}
                  onChange={(e) => handleConfigChange('url', e.target.value)}
                  leftIcon={<Globe className="w-4 h-4" />}
                />
                <Input
                  label="关键词 (可选)"
                  placeholder="输入目标关键词"
                  value={testConfig.keywords}
                  onChange={(e) => handleConfigChange('keywords', e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>

              {/* 测试模式 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="测试模式"
                  options={testModeOptions}
                  value={testConfig.mode}
                  onChange={(e) => handleConfigChange('mode', e.target.value)}
                />
                <div className="flex items-end">
                  <Button
                    className="w-full"
                    onClick={handleStartTest}
                    disabled={isRunning || !testConfig.url.trim()}
                    loading={testStatus === 'starting' || isRunning}
                  >
                    {isRunning ? '测试中...' : '开始SEO分析'}
                  </Button>
                </div>
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
              {seoTests.map((test) => {
                const Icon = test.icon;
                return (
                  <div
                    key={test.key}
                    className="p-4 border border-gray-700/50 rounded-lg hover:border-gray-600/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <SimpleCheckbox
                        checked={testConfig[test.key]}
                        onChange={(e) => handleConfigChange(test.key, e.target.checked)}
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
        {isRunning && (
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Loader className="w-5 h-5 animate-spin text-blue-400" />
                  <div>
                    <h3 className="font-medium text-white">SEO分析进行中</h3>
                    <p className="text-sm text-gray-400">正在检测网站SEO状况...</p>
                  </div>
                </div>
                <Button variant="ghost" onClick={handleStopTest}>
                  停止测试
                </Button>
              </div>
              <ProgressBadge value={testProgress || 0} showValue />
            </CardBody>
          </Card>
        )}

        {/* 测试结果 */}
        {testResults && testStatus === 'completed' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>测试结果</CardTitle>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">
                    {testResults.overallScore || 0}
                  </div>
                  <div className="text-gray-400 mb-2">总体评分</div>
                  <ProgressBadge value={testResults.overallScore || 0} />
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {testResults.passedChecks || 0}
                  </div>
                  <div className="text-gray-400 mb-2">通过检查</div>
                  <StatusBadge status="success" text="正常" />
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400 mb-2">
                    {testResults.warningChecks || 0}
                  </div>
                  <div className="text-gray-400 mb-2">警告项目</div>
                  <StatusBadge status="warning" text="需优化" />
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-400 mb-2">
                    {testResults.failedChecks || 0}
                  </div>
                  <div className="text-gray-400 mb-2">失败检查</div>
                  <StatusBadge status="error" text="需修复" />
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* 错误显示 */}
        {testError && testStatus === 'failed' && (
          <Card variant="outlined">
            <CardBody>
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-400 mb-2">测试失败</h4>
                  <p className="text-sm text-red-300">{testError}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => setTestStatus('idle')}
                  >
                    重试
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* 报告生成模态框 */}
        <Modal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          title="生成SEO分析报告"
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
      </div>
    </div>
  );
};

export default SEOTestMigrated;
