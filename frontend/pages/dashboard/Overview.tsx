/**
 * 仪表板总览页面
 *
 * 提供系统总览和关键指标展示
 *
 * @component
 * @author Test-Web Team
 * @since 1.0.0
 */

import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    ProjectOutlined,
    RocketOutlined,
    TrophyOutlined,
    UserOutlined
} from '@ant-design/icons';
import { Button, Card, Col, Progress, Row, Space, Statistic, Typography } from 'antd';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const Overview: React.FC = () => {
    const navigate = useNavigate();

    const stats = [
        {
            title: '总测试次数',
            value: 1234,
            suffix: '次',
            icon: <ProjectOutlined style={{ color: '#1890ff' }} />,
            color: '#1890ff'
        },
        {
            title: '成功测试',
            value: 1156,
            suffix: '次',
            icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
            color: '#52c41a'
        },
        {
            title: '活跃用户',
            value: 89,
            suffix: '人',
            icon: <UserOutlined style={{ color: '#722ed1' }} />,
            color: '#722ed1'
        },
        {
            title: '系统正常运行时间',
            value: 99.9,
            suffix: '%',
            icon: <TrophyOutlined style={{ color: '#fa8c16' }} />,
            color: '#fa8c16'
        }
    ];

    const recentTests = [
        { name: '性能测试', status: '成功', time: '2分钟前' },
        { name: '安全测试', status: '成功', time: '5分钟前' },
        { name: '压力测试', status: '进行中', time: '8分钟前' },
        { name: 'SEO测试', status: '成功', time: '12分钟前' }
    ];

    return (
        <div className="dashboard-overview">
            <div className="mb-6">
                <Title level={2}>仪表板总览</Title>
                <Paragraph>
                    欢迎使用Test-Web测试平台，这里是您的测试活动概览。
                </Paragraph>
            </div>

            {/* 统计卡片 */}
            <Row gutter={16} className="mb-6">
                {stats.map((stat, index) => (
                    <Col xs={24} sm={12} lg={6} key={index}>
                        <Card>
                            <Statistic
                                title={stat.title}
                                value={stat.value}
                                suffix={stat.suffix}
                                prefix={stat.icon}
                                valueStyle={{ color: stat.color }}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row gutter={16}>
                {/* 测试活动 */}
                <Col xs={24} lg={12}>
                    <Card title="最近测试活动" className="mb-4">
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {recentTests.map((test, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 0',
                                    borderBottom: index < recentTests.length - 1 ? '1px solid #f0f0f0' : 'none'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{test.name}</div>
                                        <div style={{ color: '#666', fontSize: '12px' }}>{test.time}</div>
                                    </div>
                                    <div style={{
                                        color: test.status === '成功' ? '#52c41a' :
                                            test.status === '进行中' ? '#1890ff' : '#ff4d4f',
                                        fontWeight: 500
                                    }}>
                                        {test.status}
                                    </div>
                                </div>
                            ))}
                        </Space>
                        <div style={{ textAlign: 'center', marginTop: 16 }}>
                            <Button type="link" onClick={() => navigate('/app/testing')}>
                                查看所有测试 →
                            </Button>
                        </div>
                    </Card>
                </Col>

                {/* 系统状态 */}
                <Col xs={24} lg={12}>
                    <Card title="系统状态" className="mb-4">
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <div>
                                <div style={{ marginBottom: 8 }}>CPU使用率</div>
                                <Progress percent={45} status="active" />
                            </div>
                            <div>
                                <div style={{ marginBottom: 8 }}>内存使用率</div>
                                <Progress percent={67} status="active" />
                            </div>
                            <div>
                                <div style={{ marginBottom: 8 }}>磁盘使用率</div>
                                <Progress percent={23} />
                            </div>
                            <div>
                                <div style={{ marginBottom: 8 }}>网络延迟</div>
                                <Progress percent={12} strokeColor="#52c41a" />
                            </div>
                        </Space>
                    </Card>
                </Col>
            </Row>

            {/* 快速操作 */}
            <Card title="快速操作">
                <Row gutter={16}>
                    <Col xs={24} sm={8}>
                        <Button
                            type="primary"
                            icon={<RocketOutlined />}
                            size="large"
                            block
                            onClick={() => navigate('/app/testing/stress')}
                        >
                            开始压力测试
                        </Button>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Button
                            icon={<CheckCircleOutlined />}
                            size="large"
                            block
                            onClick={() => navigate('/app/testing/performance')}
                        >
                            性能测试
                        </Button>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Button
                            icon={<ClockCircleOutlined />}
                            size="large"
                            block
                            onClick={() => navigate('/app/data/reports')}
                        >
                            查看报告
                        </Button>
                    </Col>
                </Row>
            </Card>
        </div>
    );
};

export default Overview;
