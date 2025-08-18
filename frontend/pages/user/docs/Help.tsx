import React, { useState } from 'react';
import { 
  Card, 
  Typography, 
  Collapse, 
  Input, 
  Button, 
  Space, 
  Row, 
  Col,
  Anchor,
  Divider,
  Tag,
  Alert
} from 'antd';
import { 
  QuestionCircleOutlined, 
  SearchOutlined,
  BookOutlined,
  RocketOutlined,
  SettingOutlined,
  BugOutlined,
  SafetyOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { Search } = Input;

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const Help: React.FC = () => {
  const [searchText, setSearchText] = useState('');

  const helpSections: HelpSection[] = [
    {
      id: 'getting-started',
      title: '快速开始',
      icon: <RocketOutlined />,
      content: (
        <div>
          <Paragraph>
            欢迎使用Test-Web压力测试平台！本指南将帮助您快速上手。
          </Paragraph>
          
          <Title level={4}>第一步：创建测试</Title>
          <Paragraph>
            1. 点击"新建测试"按钮<br/>
            2. 选择测试类型（压力测试、性能测试等）<br/>
            3. 配置测试参数（URL、并发数、持续时间等）<br/>
            4. 点击"开始测试"
          </Paragraph>

          <Title level={4}>第二步：监控测试</Title>
          <Paragraph>
            测试开始后，您可以在仪表板中实时查看：
            <ul>
              <li>测试进度</li>
              <li>响应时间统计</li>
              <li>成功率</li>
              <li>错误信息</li>
            </ul>
          </Paragraph>

          <Title level={4}>第三步：分析结果</Title>
          <Paragraph>
            测试完成后，系统会生成详细的测试报告，包括性能指标和建议。
          </Paragraph>
        </div>
      ),
    },
    {
      id: 'stress-testing',
      title: '压力测试',
      icon: <ThunderboltOutlined />,
      content: (
        <div>
          <Title level={4}>什么是压力测试？</Title>
          <Paragraph>
            压力测试是通过模拟大量并发用户访问来测试系统在高负载下的性能表现。
          </Paragraph>

          <Title level={4}>配置参数说明</Title>
          <ul>
            <li><strong>目标URL：</strong>要测试的API端点或网页地址</li>
            <li><strong>并发数：</strong>同时发送请求的用户数量</li>
            <li><strong>测试时长：</strong>测试持续的时间（秒）</li>
            <li><strong>每秒请求数：</strong>每秒发送的请求数量限制</li>
          </ul>

          <Title level={4}>最佳实践</Title>
          <Paragraph>
            <Tag color="blue">建议</Tag> 从小规模开始，逐步增加负载<br/>
            <Tag color="green">提示</Tag> 监控服务器资源使用情况<br/>
            <Tag color="orange">注意</Tag> 避免对生产环境进行过度测试
          </Paragraph>
        </div>
      ),
    },
    {
      id: 'configuration',
      title: '系统配置',
      icon: <SettingOutlined />,
      content: (
        <div>
          <Title level={4}>通用设置</Title>
          <Paragraph>
            在设置页面可以配置：
            <ul>
              <li>界面主题（浅色/深色）</li>
              <li>语言偏好</li>
              <li>自动保存选项</li>
              <li>通知设置</li>
            </ul>
          </Paragraph>

          <Title level={4}>测试设置</Title>
          <Paragraph>
            <ul>
              <li><strong>最大并发测试数：</strong>同时运行的测试任务数量限制</li>
              <li><strong>默认超时时间：</strong>请求超时的默认值</li>
              <li><strong>重试次数：</strong>失败请求的重试次数</li>
              <li><strong>详细日志：</strong>是否记录详细的测试日志</li>
            </ul>
          </Paragraph>

          <Title level={4}>性能优化</Title>
          <Paragraph>
            <ul>
              <li>启用缓存可以提高重复测试的速度</li>
              <li>调整压缩级别平衡性能和存储空间</li>
              <li>合理设置内存使用限制</li>
            </ul>
          </Paragraph>
        </div>
      ),
    },
    {
      id: 'troubleshooting',
      title: '故障排除',
      icon: <BugOutlined />,
      content: (
        <div>
          <Title level={4}>常见问题</Title>
          
          <Collapse ghost>
            <Panel header="测试无法启动" key="1">
              <Paragraph>
                可能原因：
                <ul>
                  <li>URL格式不正确</li>
                  <li>网络连接问题</li>
                  <li>目标服务器不可达</li>
                </ul>
                解决方案：检查URL格式，确认网络连接正常。
              </Paragraph>
            </Panel>
            
            <Panel header="测试结果异常" key="2">
              <Paragraph>
                可能原因：
                <ul>
                  <li>目标服务器负载过高</li>
                  <li>测试参数设置不当</li>
                  <li>网络延迟较高</li>
                </ul>
                解决方案：降低并发数，检查网络状况。
              </Paragraph>
            </Panel>
            
            <Panel header="页面加载缓慢" key="3">
              <Paragraph>
                可能原因：
                <ul>
                  <li>浏览器缓存过多</li>
                  <li>系统资源不足</li>
                  <li>网络带宽限制</li>
                </ul>
                解决方案：清理浏览器缓存，关闭不必要的程序。
              </Paragraph>
            </Panel>
          </Collapse>

          <Title level={4}>错误代码说明</Title>
          <Paragraph>
            <ul>
              <li><Tag color="red">500</Tag> 服务器内部错误</li>
              <li><Tag color="orange">404</Tag> 资源未找到</li>
              <li><Tag color="blue">200</Tag> 请求成功</li>
              <li><Tag color="purple">timeout</Tag> 请求超时</li>
            </ul>
          </Paragraph>
        </div>
      ),
    },
    {
      id: 'security',
      title: '安全说明',
      icon: <SafetyOutlined />,
      content: (
        <div>
          <Alert
            message="重要提醒"
            description="请勿对未经授权的系统进行压力测试，这可能违反相关法律法规。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Title level={4}>安全最佳实践</Title>
          <Paragraph>
            <ul>
              <li>仅对自己拥有或有权限的系统进行测试</li>
              <li>在测试前通知相关团队</li>
              <li>避免在业务高峰期进行大规模测试</li>
              <li>设置合理的测试限制</li>
              <li>及时停止异常的测试</li>
            </ul>
          </Paragraph>

          <Title level={4}>数据保护</Title>
          <Paragraph>
            <ul>
              <li>测试数据仅在本地存储</li>
              <li>不会收集敏感信息</li>
              <li>支持数据导出和删除</li>
              <li>遵循数据保护法规</li>
            </ul>
          </Paragraph>
        </div>
      ),
    },
    {
      id: 'api-reference',
      title: 'API参考',
      icon: <BookOutlined />,
      content: (
        <div>
          <Title level={4}>REST API端点</Title>
          <Paragraph>
            <ul>
              <li><code>GET /api/tests</code> - 获取测试列表</li>
              <li><code>POST /api/tests</code> - 创建新测试</li>
              <li><code>GET /api/tests/:id</code> - 获取测试详情</li>
              <li><code>PUT /api/tests/:id</code> - 更新测试</li>
              <li><code>DELETE /api/tests/:id</code> - 删除测试</li>
            </ul>
          </Paragraph>

          <Title level={4}>WebSocket事件</Title>
          <Paragraph>
            <ul>
              <li><code>test:start</code> - 测试开始</li>
              <li><code>test:progress</code> - 测试进度更新</li>
              <li><code>test:complete</code> - 测试完成</li>
              <li><code>test:error</code> - 测试错误</li>
            </ul>
          </Paragraph>

          <Title level={4}>配置文件格式</Title>
          <Paragraph>
            支持JSON格式的测试配置导入导出：
          </Paragraph>
          <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
{`{
  "name": "API压力测试",
  "url": "https://api.example.com",
  "method": "GET",
  "concurrency": 10,
  "duration": 60,
  "headers": {
    "Content-Type": "application/json"
  }
}`}
          </pre>
        </div>
      ),
    },
  ];

  const filteredSections = helpSections.filter(section =>
    section.title.toLowerCase().includes(searchText.toLowerCase()) ||
    section.content.toString().toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="help-container">
      <div className="help-header">
        <Title level={2}>
          <QuestionCircleOutlined /> 帮助文档
        </Title>
        <Text type="secondary">
          Test-Web压力测试平台使用指南和常见问题解答
        </Text>
      </div>

      <Row gutter={24} style={{ marginTop: 24 }}>
        {/* 侧边导航 */}
        <Col span={6}>
          <Card title="快速导航" size="small">
            <Search
              placeholder="搜索帮助内容"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ marginBottom: 16 }}
            />
            <Anchor
              items={filteredSections.map(section => ({
                key: section.id,
                href: `#${section.id}`,
                title: (
                  <Space>
                    {section.icon}
                    {section.title}
                  </Space>
                ),
              }))}
            />
          </Card>
        </Col>

        {/* 主要内容 */}
        <Col span={18}>
          <div className="help-content">
            {filteredSections.map((section, index) => (
              <Card
                key={section.id}
                id={section.id}
                title={
                  <Space>
                    {section.icon}
                    {section.title}
                  </Space>
                }
                style={{ marginBottom: 24 }}
              >
                {section.content}
                {index < filteredSections.length - 1 && <Divider />}
              </Card>
            ))}
          </div>

          {filteredSections.length === 0 && (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">
                  没有找到匹配的帮助内容，请尝试其他关键词。
                </Text>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      {/* 联系支持 */}
      <Card style={{ marginTop: 24 }}>
        <Title level={4}>需要更多帮助？</Title>
        <Paragraph>
          如果您在使用过程中遇到问题，可以通过以下方式获取支持：
        </Paragraph>
        <Space>
          <Button type="primary">
            提交反馈
          </Button>
          <Button>
            查看更新日志
          </Button>
          <Button>
            访问社区论坛
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default Help;
