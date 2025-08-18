import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Tag, Progress, Alert, Space, Typography, Row, Col, Input } from 'antd';
import { 
  SearchOutlined, 
  EyeOutlined, 
  WarningOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Search } = Input;

interface DetectionResult {
  id: string;
  url: string;
  type: 'text' | 'image' | 'video' | 'link';
  status: 'safe' | 'warning' | 'dangerous';
  risk: 'low' | 'medium' | 'high';
  description: string;
  timestamp: string;
}

interface ContentDetectionProps {
  // 组件属性定义
}

const ContentDetection: React.FC<ContentDetectionProps> = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<DetectionResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [targetUrl, setTargetUrl] = useState('');

  // 模拟检测结果数据
  const mockResults: DetectionResult[] = [
    {
      id: '1',
      url: 'https://example.com/page1',
      type: 'text',
      status: 'safe',
      risk: 'low',
      description: '内容安全，未发现敏感信息',
      timestamp: new Date().toLocaleString('zh-CN')
    },
    {
      id: '2',
      url: 'https://example.com/image.jpg',
      type: 'image',
      status: 'warning',
      risk: 'medium',
      description: '图片包含可能的敏感内容',
      timestamp: new Date().toLocaleString('zh-CN')
    },
    {
      id: '3',
      url: 'https://example.com/video.mp4',
      type: 'video',
      status: 'dangerous',
      risk: 'high',
      description: '视频内容违反安全策略',
      timestamp: new Date().toLocaleString('zh-CN')
    },
    {
      id: '4',
      url: 'https://example.com/external-link',
      type: 'link',
      status: 'warning',
      risk: 'medium',
      description: '外部链接可能存在安全风险',
      timestamp: new Date().toLocaleString('zh-CN')
    }
  ];

  const startDetection = async (url?: string) => {
    setIsScanning(true);
    setProgress(0);
    setResults([]);

    // 模拟扫描进度
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setProgress(i);
    }

    setResults(mockResults);
    setIsScanning(false);
  };

  const columns = [
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      render: (text: string) => (
        <Text code style={{ fontSize: '12px' }}>
          {text.length > 50 ? `${text.substring(0, 50)}...` : text}
        </Text>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const config = {
          text: { color: 'blue', text: '文本' },
          image: { color: 'green', text: '图片' },
          video: { color: 'purple', text: '视频' },
          link: { color: 'orange', text: '链接' }
        };
        const { color, text } = config[type as keyof typeof config];
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = {
          safe: { color: 'green', icon: <CheckCircleOutlined />, text: '安全' },
          warning: { color: 'orange', icon: <WarningOutlined />, text: '警告' },
          dangerous: { color: 'red', icon: <CloseCircleOutlined />, text: '危险' }
        };
        const { color, icon, text } = config[status as keyof typeof config];
        return <Tag color={color} icon={icon}>{text}</Tag>;
      }
    },
    {
      title: '风险等级',
      dataIndex: 'risk',
      key: 'risk',
      render: (risk: string) => {
        const config = {
          low: { color: '#52c41a', text: '低' },
          medium: { color: '#faad14', text: '中' },
          high: { color: '#ff4d4f', text: '高' }
        };
        const { color, text } = config[risk as keyof typeof config];
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => (
        <Text style={{ fontSize: '12px' }}>
          {text.length > 30 ? `${text.substring(0, 30)}...` : text}
        </Text>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (record: DetectionResult) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />} 
          size="small"
        >
          详情
        </Button>
      )
    }
  ];

  const getStatusCounts = () => {
    const counts = { safe: 0, warning: 0, dangerous: 0 };
    results.forEach(result => {
      counts[result.status]++;
    });
    return counts;
  };

  const getRiskCounts = () => {
    const counts = { low: 0, medium: 0, high: 0 };
    results.forEach(result => {
      counts[result.risk]++;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();
  const riskCounts = getRiskCounts();

  return (
    <div className="content-detection-page">
      <div style={{ padding: '24px' }}>
        <Title level={2}>内容安全检测</Title>
        <Text type="secondary">
          扫描网站内容，检测潜在的安全风险和敏感信息
        </Text>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col span={24}>
            <Card>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Title level={4}>内容检测</Title>
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={() => startDetection(targetUrl)}
                    loading={isScanning}
                    disabled={isScanning}
                  >
                    {isScanning ? '扫描中...' : '开始检测'}
                  </Button>
                </div>

                <Search
                  placeholder="输入要检测的网站URL"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  onSearch={startDetection}
                  disabled={isScanning}
                  style={{ marginBottom: 16 }}
                />

                {isScanning && (
                  <div>
                    <Text>正在扫描内容安全...</Text>
                    <Progress percent={progress} style={{ marginTop: 8 }} />
                  </div>
                )}

                {results.length > 0 && (
                  <>
                    <Row gutter={16} style={{ marginTop: 16 }}>
                      <Col span={8}>
                        <Card size="small">
                          <div style={{ textAlign: 'center' }}>
                            <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                              {statusCounts.safe}
                            </Title>
                            <Text type="secondary">安全</Text>
                          </div>
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card size="small">
                          <div style={{ textAlign: 'center' }}>
                            <Title level={3} style={{ margin: 0, color: '#faad14' }}>
                              {statusCounts.warning}
                            </Title>
                            <Text type="secondary">警告</Text>
                          </div>
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card size="small">
                          <div style={{ textAlign: 'center' }}>
                            <Title level={3} style={{ margin: 0, color: '#ff4d4f' }}>
                              {statusCounts.dangerous}
                            </Title>
                            <Text type="secondary">危险</Text>
                          </div>
                        </Card>
                      </Col>
                    </Row>

                    <Alert
                      message="内容检测完成"
                      description={`共检测了 ${results.length} 个内容项，发现 ${statusCounts.warning + statusCounts.dangerous} 个潜在风险`}
                      type={statusCounts.dangerous > 0 ? 'error' : statusCounts.warning > 0 ? 'warning' : 'success'}
                      showIcon
                      style={{ marginTop: 16 }}
                    />

                    <Table
                      columns={columns}
                      dataSource={results}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      style={{ marginTop: 16 }}
                      size="small"
                    />
                  </>
                )}
              </Space>
            </Card>
          </Col>
        </Row>

        {/* 风险分析 */}
        {results.length > 0 && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card title="风险分析">
                <Row gutter={16}>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <Progress
                        type="circle"
                        percent={Math.round((riskCounts.low / results.length) * 100)}
                        format={() => `${riskCounts.low}`}
                        strokeColor="#52c41a"
                        size={80}
                      />
                      <div style={{ marginTop: 8 }}>
                        <Text strong>低风险</Text>
                      </div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <Progress
                        type="circle"
                        percent={Math.round((riskCounts.medium / results.length) * 100)}
                        format={() => `${riskCounts.medium}`}
                        strokeColor="#faad14"
                        size={80}
                      />
                      <div style={{ marginTop: 8 }}>
                        <Text strong>中风险</Text>
                      </div>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <Progress
                        type="circle"
                        percent={Math.round((riskCounts.high / results.length) * 100)}
                        format={() => `${riskCounts.high}`}
                        strokeColor="#ff4d4f"
                        size={80}
                      />
                      <div style={{ marginTop: 8 }}>
                        <Text strong>高风险</Text>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        )}
      </div>
    </div>
  );
};

export default ContentDetection;
