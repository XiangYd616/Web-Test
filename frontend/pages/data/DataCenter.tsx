/**
 * 数据中心页面
 *
 * 提供数据管理和分析功能
 *
 * @component
 * @author Test-Web Team
 * @since 1.0.0
 */

import {
    DatabaseOutlined,
    DeleteOutlined,
    DownloadOutlined,
    EyeOutlined,
    UploadOutlined
} from '@ant-design/icons';
import { Button, Card, Col, Progress, Row, Space, Table, Tag, Typography } from 'antd';
import React from 'react';

const { Title, Paragraph } = Typography;

const DataCenter: React.FC = () => {
    const dataStats = [
        { label: '总数据量', value: '2.3 GB', color: '#1890ff' },
        { label: '测试记录', value: '1,234', color: '#52c41a' },
        { label: '报告文件', value: '89', color: '#722ed1' },
        { label: '备份数据', value: '456 MB', color: '#fa8c16' }
    ];

    const recentData = [
        {
            key: '1',
            name: '压力测试报告_20250819',
            type: '测试报告',
            size: '2.3 MB',
            date: '2025-08-19 10:30',
            status: '正常'
        },
        {
            key: '2',
            name: '性能测试数据_batch1',
            type: '测试数据',
            size: '15.7 MB',
            date: '2025-08-19 09:15',
            status: '正常'
        },
        {
            key: '3',
            name: '用户行为分析_202508',
            type: '分析报告',
            size: '5.2 MB',
            date: '2025-08-18 16:45',
            status: '正常'
        }
    ];

    const columns = [
        {
            title: '文件名',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>
        },
        {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            render: (type: string) => {
                const color = type === '测试报告' ? 'blue' :
                    type === '测试数据' ? 'green' : 'purple';
                return <Tag color={color}>{type}</Tag>;
            }
        },
        {
            title: '大小',
            dataIndex: 'size',
            key: 'size'
        },
        {
            title: '创建时间',
            dataIndex: 'date',
            key: 'date'
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={status === '正常' ? 'success' : 'error'}>{status}</Tag>
            )
        },
        {
            title: '操作',
            key: 'action',
            render: () => (
                <Space>
                    <Button type="link" icon={<EyeOutlined />} size="small">查看</Button>
                    <Button type="link" icon={<DownloadOutlined />} size="small">下载</Button>
                    <Button type="link" icon={<DeleteOutlined />} size="small" danger>删除</Button>
                </Space>
            )
        }
    ];

    return (
        <div className="data-center">
            <div className="mb-6">
                <Title level={2}>
                    <DatabaseOutlined className="mr-2" />
                    数据中心
                </Title>
                <Paragraph>
                    管理和分析您的测试数据，包括测试报告、原始数据和分析结果。
                </Paragraph>
            </div>

            {/* 数据统计 */}
            <Row gutter={16} className="mb-6">
                {dataStats.map((stat, index) => (
                    <Col xs={24} sm={12} lg={6} key={index}>
                        <Card>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: stat.color,
                                    marginBottom: '8px'
                                }}>
                                    {stat.value}
                                </div>
                                <div style={{ color: '#666' }}>{stat.label}</div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* 存储使用情况 */}
            <Row gutter={16} className="mb-6">
                <Col span={24}>
                    <Card title="存储使用情况">
                        <Row gutter={16}>
                            <Col span={8}>
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ marginBottom: 8 }}>数据存储 (2.3GB / 10GB)</div>
                                    <Progress percent={23} strokeColor="#1890ff" />
                                </div>
                            </Col>
                            <Col span={8}>
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ marginBottom: 8 }}>备份存储 (456MB / 2GB)</div>
                                    <Progress percent={22} strokeColor="#52c41a" />
                                </div>
                            </Col>
                            <Col span={8}>
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ marginBottom: 8 }}>临时文件 (89MB / 500MB)</div>
                                    <Progress percent={18} strokeColor="#fa8c16" />
                                </div>
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>

            {/* 最近数据 */}
            <Card
                title="最近数据"
                extra={
                    <Space>
                        <Button icon={<UploadOutlined />}>上传数据</Button>
                        <Button type="primary" icon={<DownloadOutlined />}>批量下载</Button>
                    </Space>
                }
            >
                <Table
                    columns={columns}
                    dataSource={recentData}
                    pagination={false}
                    size="middle"
                />
            </Card>
        </div>
    );
};

export default DataCenter;
