/**
 * 常见问题页面
 * 
 * 提供常见问题和解答
 * 
 * @component
 * @author Test-Web Team
 * @since 1.0.0
 */

import {
  BugOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { Card, Collapse, Space, Tag, Typography } from 'antd';
import React from 'react';

const { Title, Paragraph } = Typography;
const { Panel } = Collapse;

const FAQ: React.FC = () => {
  const faqData = [
    {
      category: '基础使用',
      icon: <QuestionCircleOutlined />,
      color: 'blue',
      questions: [
        {
          question: '如何开始第一次测试？',
          answer: '1. 在左侧导航栏选择"测试工具" 2. 选择适合的测试类型 3. 输入要测试的网站URL 4. 配置测试参数 5. 点击"开始测试"按钮'
        },
        {
          question: '支持哪些类型的网站测试？',
          answer: 'Test-Web支持多种测试类型：压力测试、性能测试、安全测试、SEO测试、API测试、网站综合测试和内容安全检测。每种测试都有专门的配置选项和详细的结果分析。'
        },
        {
          question: '测试结果如何查看和导出？',
          answer: '测试完成后，您可以在结果页面查看详细的分析报告。支持导出为Excel、PDF或JSON格式，方便后续分析和分享。'
        }
      ]
    },
    {
      category: '性能测试',
      icon: <ThunderboltOutlined />,
      color: 'green',
      questions: [
        {
          question: '性能测试包含哪些指标？',
          answer: '性能测试包含：页面加载时间、首次内容绘制(FCP)、最大内容绘制(LCP)、累积布局偏移(CLS)、首次输入延迟(FID)等Core Web Vitals指标，以及资源加载分析。'
        },
        {
          question: '如何理解性能测试评分？',
          answer: '评分基于Google Lighthouse标准：90-100分为优秀，50-89分为需要改进，0-49分为较差。我们会提供具体的优化建议帮助您提升网站性能。'
        },
        {
          question: '性能测试需要多长时间？',
          answer: '通常需要30-60秒，具体时间取决于网站复杂度和网络状况。测试过程中会显示实时进度，您可以随时查看当前状态。'
        }
      ]
    },
    {
      category: '安全测试',
      icon: <SafetyOutlined />,
      color: 'red',
      questions: [
        {
          question: '安全测试检查哪些方面？',
          answer: '安全测试包含：SSL证书验证、安全头检查、漏洞扫描、HTTPS配置、内容安全策略(CSP)、跨站脚本(XSS)防护等多个安全维度。'
        },
        {
          question: '发现安全问题怎么办？',
          answer: '我们会提供详细的安全问题描述、风险等级评估和具体的修复建议。建议优先处理高风险问题，并定期进行安全测试。'
        },
        {
          question: '安全测试是否会影响网站运行？',
          answer: '我们的安全测试是非侵入性的，只进行被动扫描和配置检查，不会对您的网站造成任何影响或损害。'
        }
      ]
    },
    {
      category: '压力测试',
      icon: <BugOutlined />,
      color: 'orange',
      questions: [
        {
          question: '压力测试的并发用户数如何设置？',
          answer: '建议从小规模开始测试，如10-50个并发用户，然后逐步增加。具体数值应根据您的服务器配置和预期流量来设定。'
        },
        {
          question: '压力测试会不会影响生产环境？',
          answer: '压力测试会产生真实的访问流量，建议在测试环境进行。如需在生产环境测试，请选择低峰时段并设置合理的并发数。'
        },
        {
          question: '如何分析压力测试结果？',
          answer: '重点关注响应时间、错误率、吞吐量等指标。正常情况下错误率应低于1%，响应时间应保持稳定。我们会提供详细的性能分析图表。'
        }
      ]
    },
    {
      category: '账户设置',
      icon: <SettingOutlined />,
      color: 'purple',
      questions: [
        {
          question: '如何修改个人资料？',
          answer: '进入"用户中心" > "个人资料"，您可以修改头像、姓名、联系方式等信息。修改后点击保存即可生效。'
        },
        {
          question: '如何启用双因子认证？',
          answer: '在"用户中心" > "个人资料" > "安全设置"中，点击"启用双因子认证"，按照提示使用认证应用扫描二维码完成设置。'
        },
        {
          question: '忘记密码怎么办？',
          answer: '在登录页面点击"忘记密码"，输入注册邮箱，我们会发送重置密码的链接到您的邮箱。'
        }
      ]
    }
  ];

  return (
    <div className="faq-page">
      <div className="mb-6">
        <Title level={2}>
          <QuestionCircleOutlined className="mr-2" />
          常见问题
        </Title>
        <Paragraph>
          这里收集了用户最常遇到的问题和解答，帮助您快速解决使用中的疑问。
        </Paragraph>
      </div>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {faqData.map((category, index) => (
          <Card
            key={index}
            title={
              <Space>
                {category.icon}
                {category.category}
                <Tag color={category.color}>{category.questions.length}个问题</Tag>
              </Space>
            }
          >
            <Collapse ghost>
              {category.questions.map((item, qIndex) => (
                <Panel
                  header={item.question}
                  key={qIndex}
                  style={{ fontSize: '16px', fontWeight: 500 }}
                >
                  <Paragraph style={{ marginLeft: 24 }}>
                    {item.answer}
                  </Paragraph>
                </Panel>
              ))}
            </Collapse>
          </Card>
        ))}
      </Space>

      {/* 联系支持 */}
      <Card title="没有找到答案？" className="mt-6">
        <Paragraph>
          如果您的问题没有在上面找到答案，请联系我们的技术支持团队：
        </Paragraph>
        <Space>
          <Tag color="blue">邮箱: support@test-web.com</Tag>
          <Tag color="green">QQ群: 123456789</Tag>
          <Tag color="orange">微信: test-web-support</Tag>
        </Space>
      </Card>
    </div>
  );
};

export default FAQ;
