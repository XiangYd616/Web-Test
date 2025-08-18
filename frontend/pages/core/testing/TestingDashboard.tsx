import React, { useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  Table, 
  Tag, 
  Space, 
  Typography, 
  Statistic,
  Progress,
  Select,
  Input,
  DatePicker,
  Modal,
  Descriptions
} from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  StopOutlined,
  EyeOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
  FilterOutlined,
  PlusOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface TestRecord {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  startTime: string;
  endTime?: string;
  duration: number;
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
}

const TestingDashboard: React.FC = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestRecord | null>(null);

  // 模拟测试数据
  const testRecords: TestRecord[] = [
    {
      id: '1',
      name: 'API压力测试 - 用户登录',
      type: '压力测试',
      status: 'running',
      progress: 65,
      startTime: '2024-01-15 14:30:00',
      duration: 300,
      totalRequests: 1250,
      successRate: 98.5,
      averageResponseTime: 245,
    },
    {
      id: '2',
      name: '数据库连接测试',
      type: '连接测试',
      status: 'completed',
      progress: 100,
      startTime: '2024-01-15 13:15:00',
      endTime: '2024-01-15 13:45:00',
      duration: 1800,
      totalRequests: 5000,
      successRate: 99.2,
      averageResponseTime: 156,
    },
    {
      id: '3',
      name: '前端性能测试',
      type: '性能测试',
      status: 'failed',
      progress: 45,
      startTime: '2024-01-15 12:00:00',
      endTime: '2024-01-15 12:15:00',
      duration: 900,
      totalRequests: 800,
      successRate: 67.3,
      averageResponseTime: 1250,
    },
    {
      id: '4',
      name: 'WebSocket连接测试',
      type: '连接测试',
      status: 'paused',
      progress: 30,
      startTime: '2024-01-15 11:30:00',
      duration: 600,
      totalRequests: 450,
      successRate: 95.8,
      averageResponseTime: 89,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'processing';
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'paused': return 'warning';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running': return '运行中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      case 'paused': return '已暂停';
      default: return '未知';
    }
  };

  const columns = [
    {
      title: '测试名称',
      dataIndex: 'name',
      key: 'name',
      width: 250,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress: number, record: TestRecord) => (
        <Progress 
          percent={progress} 
          size="small"
          status={record.status === 'failed' ? 'exception' : 'normal'}
        />
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 150,
    },
    {
      title: '总请求数',
      dataIndex: 'totalRequests',
      key: 'totalRequests',
      width: 100,
      render: (value: number) => value.toLocaleString(),
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      width: 100,
      render: (rate: number) => `${rate}%`,
    },
    {
      title: '平均响应时间',
      dataIndex: 'averageResponseTime',
      key: 'averageResponseTime',
      width: 120,
      render: (time: number) => `${time}ms`,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record: TestRecord) => (
        <Space size="small">
          {record.status === 'running' && (
            <>
              <Button size="small" icon={<PauseCircleOutlined />}>
                暂停
              </Button>
              <Button size="small" danger icon={<StopOutlined />}>
                停止
              </Button>
            </>
          )}
          {record.status === 'paused' && (
            <Button size="small" type="primary" icon={<PlayCircleOutlined />}>
              继续
            </Button>
          )}
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedTest(record);
              setDetailModalVisible(true);
            }}
          >
            详情
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  // 统计数据
  const runningTests = testRecords.filter(t => t.status === 'running').length;
  const completedTests = testRecords.filter(t => t.status === 'completed').length;
  const failedTests = testRecords.filter(t => t.status === 'failed').length;
  const totalRequests = testRecords.reduce((sum, t) => sum + t.totalRequests, 0);

  return (
    <div className="testing-dashboard-container">
      <div className="testing-dashboard-header">
        <Title level={2}>
          测试管理中心
        </Title>
        <Text type="secondary">
          管理和监控所有测试任务的执行状态
        </Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginTop: 24, marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="运行中"
              value={runningTests}
              valueStyle={{ color: '#1890ff' }}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成"
              value={completedTests}
              valueStyle={{ color: '#3f8600' }}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="失败"
              value={failedTests}
              valueStyle={{ color: '#cf1322' }}
              prefix={<StopOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总请求数"
              value={totalRequests}
              formatter={(value) => value?.toLocaleString()}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button type="primary" icon={<PlusOutlined />}>
                新建测试
              </Button>
              <Button icon={<ExportOutlined />} disabled={selectedRowKeys.length === 0}>
                导出结果
              </Button>
              <Button icon={<DeleteOutlined />} danger disabled={selectedRowKeys.length === 0}>
                批量删除
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Select placeholder="测试类型" style={{ width: 120 }}>
                <Option value="">全部</Option>
                <Option value="stress">压力测试</Option>
                <Option value="performance">性能测试</Option>
                <Option value="connection">连接测试</Option>
              </Select>
              <Select placeholder="状态" style={{ width: 100 }}>
                <Option value="">全部</Option>
                <Option value="running">运行中</Option>
                <Option value="completed">已完成</Option>
                <Option value="failed">失败</Option>
                <Option value="paused">已暂停</Option>
              </Select>
              <RangePicker />
              <Button icon={<FilterOutlined />}>
                筛选
              </Button>
              <Button icon={<ReloadOutlined />}>
                刷新
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 测试列表 */}
      <Card title="测试列表">
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={testRecords}
          rowKey="id"
          pagination={{
            total: testRecords.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          }}
        />
      </Card>

      {/* 详情模态框 */}
      <Modal
        title="测试详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          <Button key="export" type="primary" icon={<ExportOutlined />}>
            导出报告
          </Button>,
        ]}
        width={800}
      >
        {selectedTest && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="测试名称" span={2}>
              {selectedTest.name}
            </Descriptions.Item>
            <Descriptions.Item label="测试类型">
              {selectedTest.type}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={getStatusColor(selectedTest.status)}>
                {getStatusText(selectedTest.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="开始时间">
              {selectedTest.startTime}
            </Descriptions.Item>
            <Descriptions.Item label="结束时间">
              {selectedTest.endTime || '未结束'}
            </Descriptions.Item>
            <Descriptions.Item label="测试时长">
              {Math.floor(selectedTest.duration / 60)}分{selectedTest.duration % 60}秒
            </Descriptions.Item>
            <Descriptions.Item label="进度">
              <Progress percent={selectedTest.progress} />
            </Descriptions.Item>
            <Descriptions.Item label="总请求数">
              {selectedTest.totalRequests.toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="成功率">
              {selectedTest.successRate}%
            </Descriptions.Item>
            <Descriptions.Item label="平均响应时间">
              {selectedTest.averageResponseTime}ms
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default TestingDashboard;
