/**
 * ?? ͳһ��������ִ������� - �ع��Ż��汾
 * ������UnifiedTestPanel��ModernUnifiedTestPanel��ModernTestRunner�Ĺ���
 * �ṩ�����Ĳ���ִ�С���غͽ��չʾ����
 *
 * �ع����ԣ�
 * - ���϶���ظ�����Ĺ���
 * - ͳһ���û�����ͽ���
 * - ֧�����в�������
 * - �ṩ��������
 * - �Ż������ܺ��û�����
 */

import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Form, Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Tabs,
  Timeline,
  Typography
} from 'antd';
import React, { useCallback, useState } from 'react';
import { useTestResultAnalysis, useTestEngine } from '../../hooks/useTestEngine';
import { TestPriority, TestType } from '../../types/enums';
import type { TestResult } from '../../types/unifiedEngine.types';

// ����ר�������
import { TestHistoryPanel } from './shared/TestHistoryPanel';
import { TestProgressMonitor } from './shared/TestProgressMonitor';
import { TestResultsTable } from './shared/TestResultsTable';
import { TestStatsPanel } from './shared/TestStatsPanel';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// Helper functions
const getTestTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    performance: '?? ���ܲ���',
    security: '?? ��ȫ����',
    api: '?? API����',
    seo: '?? SEO����',
    stress: '? ѹ������',
    compatibility: '?? �����Բ���'
  };
  return labels[type] || type;
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#3f8600';
  if (score >= 60) return '#faad14';
  return '#cf1322';
};

// ��չ��Props�ӿ� - ���������������
interface UnifiedTestExecutorProps {
  className?: string;

  // �����ص�
  onTestComplete?: (testId: string, result: TestResult) => void;
  onTestError?: (error: Error) => void;

  // ����ModernUnifiedTestPanel����
  testType?: TestType;
  defaultConfig?: Partial<any>;
  showHistory?: boolean;
  showStats?: boolean;
  allowMultipleTests?: boolean;

  // ����UnifiedTestPanel����
  enableQueue?: boolean;
  enableWebSocket?: boolean;
  maxConcurrentTests?: number;

  // ����ModernTestRunner����
  showAdvancedOptions?: boolean;
  enableRealTimeMetrics?: boolean;
  enableExport?: boolean;

  // ��չ�ص�
  onTestStarted?: (data: any) => void;
  onTestProgress?: (data: any) => void;
  onConfigChange?: (config: any) => void;
}

/**
 * ͳһ��������ִ�������
 */
export const UnifiedTestExecutor: React.FC<UnifiedTestExecutorProps> = ({
  className = '',
  testType: defaultTestType,
  defaultConfig = {},
  showHistory = true,
  showStats = true,
  allowMultipleTests = false,
  enableQueue = true,
  enableWebSocket = true,
  maxConcurrentTests = 3,
  showAdvancedOptions = false,
  enableRealTimeMetrics = true,
  enableExport = true,
  onTestComplete,
  onTestError,
  onTestStarted,
  onTestProgress,
  onConfigChange
}) => {
  const [form] = Form.useForm();
  const [selectedTestType, setSelectedTestType] = useState<TestType>(
    defaultTestType || TestType.PERFORMANCE
  );
  const [activeTab, setActiveTab] = useState<string>('config');
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [showResultModal, setShowResultModal] = useState(false);

  // �������������״̬
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [testStatistics, setTestStatistics] = useState<any>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<any>(null);

  // ʹ��ͳһ��������Hook
  const engine = useTestEngine();

  // ��ǰѡ�в��ԵĽ������
  const resultAnalysis = useTestResultAnalysis(engine.results);

  // ���ϵĹ��ܷ���

  /**
   * ���ز�����ʷ - ����UnifiedTestPanel����
   */
  const loadTestHistory = useCallback(async () => {
    try {
      const history = await engine.getTestHistory?.(selectedTestType);
      if (history) {
        setTestHistory(history);
      }
    } catch (error) {
      console.error('���ز�����ʷʧ��:', error);
    }
  }, [engine, selectedTestType]);

  /**
   * ���ز���ͳ�� - ����ModernUnifiedTestPanel����
   */
  const loadTestStatistics = useCallback(async () => {
    try {
      const stats = engine.getStats?.();
      if (stats) {
        setTestStatistics(stats);
      }
    } catch (error) {
      console.error('���ز���ͳ��ʧ��:', error);
    }
  }, [engine]);

  /**
   * ����ʵʱָ���� - ����ModernTestRunner����
   */
  const startRealTimeMetrics = useCallback((testId: string) => {
    if (!enableRealTimeMetrics) return () => { };

    const interval = setInterval(async () => {
      try {
        /**
         * if���ܺ���
         * @param {Object} params - ��������
         * @returns {Promise<Object>} ���ؽ��
         */
        const status = await engine.getTestStatus?.(testId);
        if (status) {
          setRealTimeMetrics({
            progress: status.progress,
            currentStep: status.currentStep,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('��ȡʵʱָ��ʧ��:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [engine, enableRealTimeMetrics]);

  // �����ʼ�� - ������������ĳ�ʼ���߼�
  React.useEffect(() => {
    // ��ʼ����Ĭ��ֵ
    if (defaultConfig && Object.keys(defaultConfig).length > 0) {
      form.setFieldsValue(defaultConfig);
    }

    // ���س�ʼ����
    if (showHistory) {
      loadTestHistory();
    }
    if (showStats) {
      loadTestStatistics();
    }

    // ����WebSocket
    if (enableWebSocket) {
      engine.connectWebSocket();
    }
  }, [form, defaultConfig, showHistory, showStats, enableWebSocket, engine, loadTestHistory, loadTestStatistics]);

  // �������Խ��ȸ���
  React.useEffect(() => {
    if (enableRealTimeMetrics && selectedTestId) {
      const cleanup = startRealTimeMetrics(selectedTestId);
      return cleanup;
    }
    return undefined;
  }, [selectedTestId, enableRealTimeMetrics, startRealTimeMetrics]);

  /**
   * ִ�в��� - ������������Ĳ���ִ���߼�
   */
  const handleExecuteTest = useCallback(async () => {
    try {
      const values = await form.validateFields();

      // �ϲ�Ĭ������
      const finalConfig = { ...defaultConfig, ...values };

      const testId = await engine.executeTest?.({
        testType: selectedTestType,
        config: finalConfig,
        options: {
          priority: TestPriority.MEDIUM,
          tags: [selectedTestType, 'unified-engine', 'web-ui']
        }
      });

      if (!testId) {
        throw new Error('��������ʧ��');
      }

      console.log(`?? ����������: ${testId}`);

      // �����ص�
      onTestStarted?.({ testId, config: finalConfig });
      onConfigChange?.(finalConfig);

      // �л�����ر�ǩҳ
      setActiveTab('monitor');

      // ���Ĳ��Ը���
      engine.subscribeToTest(testId);

      // ����ʵʱ���
      if (enableRealTimeMetrics) {
        startRealTimeMetrics(testId);
      }

    } catch (error) {
      console.error('����ִ��ʧ��:', error);
      onTestError?.(error as Error);
    }
  }, [form, engine, selectedTestType, defaultConfig, onTestError, onTestStarted, onConfigChange, enableRealTimeMetrics, startRealTimeMetrics]);

  /**
   * �鿴���Խ��
   */
  const handleViewResult = useCallback((testId: string) => {
    setSelectedTestId(testId);
    setShowResultModal(true);
  }, []);

  /**
   * �������Խ�� - ����ModernTestRunner����
   */
  const handleExportResult = useCallback(async (testId: string, format: 'json' | 'csv' | 'pdf') => {
    if (!enableExport) return;

    try {
      const result = await engine.getTestResult?.(testId);
      if (result) {
        // ������������
        const dataStr = format === 'json' ?
          JSON.stringify(result, null, 2) :
          `����ID,��������,����,����ʱ��\n${testId},${result.testType},${result.overallScore},${result.duration}`;

        const dataBlob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/csv' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `test-result-${testId}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('�������Խ��ʧ��:', error);
      onTestError?.(error as Error);
    }
  }, [engine, enableExport, onTestError]);

  /**
   * �������� - ����UnifiedTestPanel����
   */
  const _handleBatchCancel = useCallback(async () => {
    try {
      await engine.cancelAllTests();
      console.log('? ��ȡ�����������еĲ���');
    } catch (error) {
      console.error('����ȡ��ʧ��:', error);
      onTestError?.(error as Error);
    }
  }, [engine, onTestError]);

  const handleClearHistory = useCallback(() => {
    engine.clearCompletedTests();
    setTestHistory([]);
    console.log('? �����������ʷ');
  }, [engine]);

  /**
   * ��Ⱦ�������ñ�
   */
  const renderConfigForm = () => (
    <Card title="?? ��������" className="mb-4">
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          url: 'https://example.com',
          testType: selectedTestType
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="��������"
              name="testType"
              rules={[{ required: true, message: '��ѡ���������' }]}
            >
              <Select
                value={selectedTestType}
                onChange={setSelectedTestType}
                loading={false}
              >
                {engine.supportedTypes?.map(type => (
                  <Option key={type} value={type}>
                    {getTestTypeLabel(type)}
                  </Option>
                )) || []}
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="Ŀ��URL"
              name="url"
              rules={[
                { required: true, message: '������Ŀ��URL' },
                { type: 'url', message: '��������Ч��URL' }
              ]}
            >
              <Input
                placeholder="https://example.com"
                prefix="??"
              />
            </Form.Item>
          </Col>
        </Row>

        {renderTestTypeSpecificFields()}

        <Divider />

        <Form.Item>
          <Space>
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleExecuteTest}
              loading={engine.executingTest}
              disabled={!engine.isConnected}
            >
              ��ʼ����
            </Button>

            <Button
              icon={<ReloadOutlined />}
              onClick={() => engine.fetchSupportedTypes()}
              loading={false}
            >
              ˢ������
            </Button>

            <Button
              icon={<DeleteOutlined />}
              onClick={() => engine.clearCompletedTests()}
              disabled={engine.getStats().completedTests === 0}
            >
              ������ʷ
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );

  /**
   * ��Ⱦ���������ض��ֶ�
   */
  const renderTestTypeSpecificFields = () => {
    switch (selectedTestType) {
      case 'performance':
        return (
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="�豸����" name="device">
                <Select defaultValue="desktop">
                  <Option value="desktop">??? �����</Option>
                  <Option value="mobile">?? �ƶ���</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="��������" name="throttling">
                <Select defaultValue="simulated3G">
                  <Option value="none">?? ������</Option>
                  <Option value="simulated3G">?? ģ��3G</Option>
                  <Option value="applied3G">?? ��ʵ3G</Option>
                  <Option value="applied4G">?? ��ʵ4G</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="����" name="locale">
                <Select defaultValue="zh-CN">
                  <Option value="zh-CN">???? ����</Option>
                  <Option value="en-US">???? English</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        );

      case 'stress':
        return (
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="�����û���"
                name="users"
                rules={[{ required: true, message: '�����벢���û���' }]}
              >
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  placeholder="100"
                  addonAfter="�û�"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="����ʱ��"
                name="duration"
                rules={[{ required: true, message: '���������ʱ��' }]}
              >
                <Input
                  type="number"
                  min={10}
                  max={3600}
                  placeholder="300"
                  addonAfter="��"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="��������" name="stressType">
                <Select defaultValue="load">
                  <Option value="load">?? ���ز���</Option>
                  <Option value="stress">? ѹ������</Option>
                  <Option value="spike">?? ��ֵ����</Option>
                  <Option value="volume">?? ��������</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        );

      case 'api':
        return (
          <Form.Item label="API�˵�����" name="endpoints">
            <Input.TextArea
              rows={6}
              placeholder={`������API�˵����ã�JSON��ʽ����
[
  {
    "id": "test1",
    "name": "��ȡ�û���Ϣ",
    "method": "GET",
    "path": "/api/users/1"
  }
]`}
            />
          </Form.Item>
        );

      case 'security':
        return (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="ɨ�����" name="scanDepth">
                <Select defaultValue={3}>
                  <Option value={1}>?? ǳ��ɨ��</Option>
                  <Option value={3}>?? ��׼ɨ��</Option>
                  <Option value={5}>?? ���ɨ��</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="��ʱʱ��" name="timeout">
                <Select defaultValue={30000}>
                  <Option value={15000}>?? 15��</Option>
                  <Option value={30000}>?? 30��</Option>
                  <Option value={60000}>?? 60��</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        );

      default:
        return null;
    }
  };

  /**
   * ��Ⱦ����״̬
   */
  const renderEngineStatus = () => {
    const stats = engine.getStats();

    return (
      <Card title="?? ����״̬" className="mb-4">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="����״̬"
              value={engine.isConnected ? '������' : 'δ����'}
              valueStyle={{
                color: engine.isConnected ? '#3f8600' : '#cf1322',
                fontSize: '16px'
              }}
              prefix={
                <Badge
                  status={engine.isConnected ? 'success' : 'error'}
                />
              }
            />
          </Col>

          <Col span={6}>
            <Statistic
              title="�����в���"
              value={stats.runningTests}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Col>

          <Col span={6}>
            <Statistic
              title="����ɲ���"
              value={stats.completedTests}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>

          <Col span={6}>
            <Statistic
              title="ʧ�ܲ���"
              value={stats.failedTests}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
        </Row>

        {engine.engineVersion && (
          <div className="mt-4">
            <Text type="secondary">����汾: {engine.engineVersion}</Text>
          </div>
        )}
      </Card>
    );
  };

  /**
   * ��Ⱦ���Լ�� - ʹ��ר�������
   */
  const renderTestMonitor = () => {
    return (
      <TestProgressMonitor
        activeTests={engine.activeTests}
        realTimeMetrics={realTimeMetrics}
        onStopTest={(testId: string) => engine.cancelTest(testId)}
        onCancelTest={(testId: string) => engine.cancelTest(testId)}
        className="mb-4"
      />
    );
  };

  /**
   * ��Ⱦͳ����� - ʹ��ר�������
   */
  const renderStatsPanel = () => {
    if (!showStats) return null;

    const stats = engine.getStats();

    return (
      <TestStatsPanel
        stats={stats}
        className="mb-4"
      />
    );
  };

  /**
   * ��Ⱦ��ʷ��¼��� - ʹ��ר�������
   */
  const renderHistoryPanel = () => {
    if (!showHistory) return null;

    return (
      <TestHistoryPanel
        testHistory={testHistory}
        onViewResult={handleViewResult}
        onExportResult={enableExport ? handleExportResult : undefined}
        onClearHistory={handleClearHistory}
        enableExport={enableExport}
        className="mb-4"
      />
    );
  };

  /**
   * ��Ⱦ���Խ���б� - ʹ��ר�������
   */
  const renderTestResults = () => {
    return (
      <TestResultsTable
        testResults={engine.testResults}
        onViewResult={handleViewResult}
        onDownloadResult={enableExport ? (result: TestResult) => downloadResult(result) : undefined}
        enableExport={enableExport}
        className="mb-4"
      />
    );
  };

  /**
   * ��Ⱦ�������ģ̬��
   */
  const renderResultModal = () => (
    <Modal
      title="?? ���Խ������"
      open={showResultModal}
      onCancel={() => setShowResultModal(false)}
      width={800}
      footer={[
        <Button key="download" icon={<DownloadOutlined />}>
          ���ر���
        </Button>,
        <Button key="close" onClick={() => setShowResultModal(false)}>
          �ر�
        </Button>
      ]}
    >
      {resultAnalysis.hasResult && resultAnalysis.result && (
        <div>
          <Row gutter={16} className="mb-4">
            <Col span={8}>
              <Statistic
                title="��������"
                value={resultAnalysis.result.overallScore}
                suffix="��"
                valueStyle={{
                  color: getScoreColor(resultAnalysis.result.overallScore),
                  fontSize: '24px'
                }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="����ʱ��"
                value={(resultAnalysis.result.duration / 1000).toFixed(1)}
                suffix="��"
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="��������"
                value={resultAnalysis.analysis?.recommendationCount.total || 0}
                suffix="��"
              />
            </Col>
          </Row>

          {resultAnalysis.analysis?.hasRecommendations && (
            <div>
              <Title level={5}>?? �Ż�����</Title>
              <Timeline>
                {resultAnalysis.result.recommendations.immediate.map((rec, index) => (
                  <Timeline.Item key={index} color="red">
                    <Text strong>��������:</Text> {rec}
                  </Timeline.Item>
                ))}
                {resultAnalysis.result.recommendations.shortTerm.map((rec, index) => (
                  <Timeline.Item key={index} color="orange">
                    <Text strong>�����Ż�:</Text> {rec}
                  </Timeline.Item>
                ))}
                {resultAnalysis.result.recommendations.longTerm.map((rec, index) => (
                  <Timeline.Item key={index} color="blue">
                    <Text strong>���ڹ滮:</Text> {rec}
                  </Timeline.Item>
                ))}
              </Timeline>
            </div>
          )}
        </div>
      )}
    </Modal>
  );

  /**
   * ���ز��Խ��
   */
  const downloadResult = useCallback((result: TestResult) => {
    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `test-result-${result.testId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className={`unified-test-executor ${className}`}>
      {renderEngineStatus()}

      {/* ���ϵ�ͳ����� */}
      {showStats && renderStatsPanel()}

      {/* ���ϵ���ʷ��¼��� */}
      {showHistory && renderHistoryPanel()}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'config',
            label: (
              <span>
                <SettingOutlined />
                ���ò���
              </span>
            ),
            children: renderConfigForm()
          },
          {
            key: 'monitor',
            label: (
              <span>
                <ClockCircleOutlined />
                ��ؽ��� ({engine.getStats().runningTests})
              </span>
            ),
            children: renderTestMonitor()
          },
          {
            key: 'results',
            label: (
              <span>
                <BarChartOutlined />
                �鿴��� ({engine.getStats().totalTests})
              </span>
            ),
            children: renderTestResults()
          },
          // ���ϵ��±�ǩҳ
          ...(showStats ? [{
            key: 'stats',
            label: (
              <span>
                <BarChartOutlined />
                ͳ����Ϣ
              </span>
            ),
            children: renderStatsPanel()
          }] : []),
          ...(showHistory ? [{
            key: 'history',
            label: (
              <span>
                <HistoryOutlined />
                ������ʷ
              </span>
            ),
            children: renderHistoryPanel()
          }] : [])
        ]}
      />

      {renderResultModal()}
    </div>
  );
};

/**
 * ���ߺ���
 */
const _getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'blue',
    running: 'orange',
    completed: 'green',
    failed: 'red',
    cancelled: 'gray'
  };
  return colors[status] || 'default';
};

const _getStatusText = (status: string): string => {
  const texts: Record<string, string> = {
    pending: '�ȴ���',
    running: '������',
    completed: '�����',
    failed: 'ʧ��',
    cancelled: '��ȡ��'
  };
  return texts[status] || status;
};

export default UnifiedTestExecutor;
