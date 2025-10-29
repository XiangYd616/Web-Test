/**
 * 🎯 统一测试引擎页面
 * 展示统一测试引擎的完整功�? */

import {
  BarChartOutlined, ClockCircleOutlined,
  ExperimentOutlined,
  HomeOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Layout,
  Row,
  Space,
  Statistic,
  Tabs,
  Tooltip,
  Typography
} from 'antd';
import React, { useState } from 'react';
import { UnifiedTestExecutor } from '../components/testing/UnifiedTestExecutor';
import { useTestEngine } from '../hooks/useTestEngine';
import type { TestResult } from '../types/unifiedEngine.types';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

/**
 * 统一测试引擎页面组件
 */
export const UnifiedTestPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('executor');
  const [showHelp, setShowHelp] = useState(false);

  // 使用统一测试引擎Hook
  const engine = useTestEngine();

  /**
   * 处理测试完成
   */
  const handleTestComplete = (testId: string, result: TestResult) => {
    console.log(`�?测试完成: ${testId}`, result);

    // 显示成功通知
    if (result.overallScore >= 80) {
    } else if (result.overallScore >= 60) {
      console.log('⚠️ 测试结果良好，有改进空间');
    } else {
      console.log('�?测试结果需要优�?);
    }
  };

  /**
   * 处理测试错误
   */
  const handleTestError = (error: Error) => {
    console.error('�?测试执行失败:', error);
  };

  /**
   * 渲染页面头部
   */
  const renderPageHeader = () => (
    <div className="mb-6">
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item href="/">
          <HomeOutlined />
          首页
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <ExperimentOutlined />
          测试工具
        </Breadcrumb.Item>
        <Breadcrumb.Item>统一测试引擎</Breadcrumb.Item>
      </Breadcrumb>

      <div className="flex justify-between items-center">
        <div>
          <Title level={2} className="mb-2">
            🧠 统一测试引擎
          </Title>
          <Paragraph className="text-gray-600 mb-0">
            集成多种测试工具，提供统一的测试执行和结果分析平台
          </Paragraph>
        </div>

        <Space>
          <Tooltip title="查看帮助文档">
            <Button
              icon={<QuestionCircleOutlined />}
              onClick={() => setShowHelp(!showHelp)}
            >
              帮助
            </Button>
          </Tooltip>

          <Tooltip title="刷新引擎状�?>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => engine.fetchSupportedTypes()}
              loading={false}
            >
              刷新
            </Button>
          </Tooltip>
        </Space>
      </div>
    </div>
  );

  /**
   * 渲染引擎概览
   */
  const renderEngineOverview = () => {
    const stats = engine.getStats();

    return (
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="引擎状�?
              value={engine.isConnected ? '在线' : '离线'}
              valueStyle={{
                color: engine.isConnected ? '#3f8600' : '#cf1322',
                fontSize: '18px'
              }}
              prefix={
                <Badge
                  status={engine.isConnected ? 'success' : 'error'}
                />
              }
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card>
            <Statistic
              title="支持的测试类�?
              value={engine.supportedTypes.length}
              valueStyle={{ color: '#1890ff' }}
              prefix={<SettingOutlined />}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card>
            <Statistic
              title="运行中测�?
              value={stats.runningTests}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card>
            <Statistic
              title="总测试结�?
              value={stats.totalTests}
              valueStyle={{ color: '#52c41a' }}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  /**
   * 渲染帮助信息
   */
  const renderHelpInfo = () => (
    showHelp && (
      <Alert
        message="统一测试引擎使用指南"
        description={
          <div>
            <Paragraph>
              <Text strong>支持的测试类�?</Text>
            </Paragraph>
            <ul>
              <li><Text code>performance</Text> - 网站性能测试，包括Core Web Vitals</li>
              <li><Text code>security</Text> - 安全漏洞扫描和SSL检�?/li>
              <li><Text code>api</Text> - API端点测试和文档生�?/li>
              <li><Text code>stress</Text> - 压力测试和负载测�?/li>
              <li><Text code>database</Text> - 数据库连接和性能测试</li>
              <li><Text code>network</Text> - 网络连通性和延迟测试</li>
            </ul>
            <Paragraph>
              <Text strong>使用步骤:</Text>
            </Paragraph>
            <ol>
              <li>选择测试类型并配置参�?/li>
              <li>点击"开始测�?执行测试</li>
              <li>�?监控进度"标签页查看实时进�?/li>
              <li>�?查看结果"标签页分析测试结�?/li>
            </ol>
          </div>
        }
        type="info"
        showIcon
        closable
        onClose={() => setShowHelp(false)}
        className="mb-4"
      />
    )
  );

  return (
    <Layout>
      <Content className="p-6">
        {renderPageHeader()}
        {renderHelpInfo()}
        {renderEngineOverview()}

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
          items={[
            {
              key: 'executor',
              label: (
                <span>
                  <ExperimentOutlined />
                  测试执行�?                </span>
              ),
              children: (
                <UnifiedTestExecutor
                  onTestComplete={handleTestComplete}
                  onTestError={handleTestError}
                />
              )
            },
            {
              key: 'panel',
              label: (
                <span>
                  <SettingOutlined />
                  高级面板
                </span>
              ),
              children: (
                <UnifiedTestExecutor
                  onTestComplete={handleTestComplete}
                  onTestError={handleTestError}
                  showHistory={true}
                  showStats={true}
                  allowMultipleTests={true}
                  enableQueue={true}
                  enableWebSocket={true}
                  showAdvancedOptions={true}
                  enableRealTimeMetrics={true}
                  enableExport={true}
                />
              )
            }
          ]}
        />

        {/* 错误提示 */}
        {engine.lastError && (
          <Alert
            message="引擎错误"
            description={engine.lastError.message}
            type="error"
            showIcon
            closable
            className="mt-4"
          />
        )}

        {/* 连接状态提�?*/}
        {!engine.isConnected && (
          <Alert
            message="引擎未连�?
            description="统一测试引擎当前未连接，某些功能可能不可�?
            type="warning"
            showIcon
            action={
              <Button
                size="small"
                onClick={() => engine.connectWebSocket()}
              >
                重新连接
              </Button>
            }
            className="mt-4"
          />
        )}
      </Content>
    </Layout>
  );
};

export default UnifiedTestPage;
