/**
 * 导入导出页面
 * 
 * 提供数据导入导出功能的页面
 * 
 * @component
 * @author Test-Web Team
 * @since 1.0.0
 */

import React, { useState } from 'react';
import { Card, Upload, Button, Typography, Space, Row, Col, Table, message, Progress } from 'antd';
import { 
  UploadOutlined, 
  DownloadOutlined, 
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  CloudUploadOutlined
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { Dragger } = Upload;

const Export: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const exportFormats = [
    {
      key: 'excel',
      name: 'Excel格式',
      description: '导出为.xlsx文件，适合数据分析',
      icon: <FileExcelOutlined style={{ color: '#52c41a' }} />,
      action: () => handleExport('excel')
    },
    {
      key: 'pdf',
      name: 'PDF报告',
      description: '导出为PDF格式，适合打印和分享',
      icon: <FilePdfOutlined style={{ color: '#ff4d4f' }} />,
      action: () => handleExport('pdf')
    },
    {
      key: 'json',
      name: 'JSON数据',
      description: '导出为JSON格式，适合程序处理',
      icon: <FileTextOutlined style={{ color: '#1890ff' }} />,
      action: () => handleExport('json')
    }
  ];

  const handleExport = async (format: string) => {
    setExportProgress(0);
    
    // 模拟导出进度
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          message.success(`${format.toUpperCase()}文件导出成功！`);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.json,.csv',
    beforeUpload: (file: any) => {
      setUploading(true);
      
      // 模拟上传处理
      setTimeout(() => {
        setUploading(false);
        message.success(`${file.name} 文件上传成功！`);
      }, 2000);
      
      return false; // 阻止自动上传
    },
  };

  return (
    <div className="export-page">
      <div className="mb-6">
        <Title level={2}>
          <CloudUploadOutlined className="mr-2" />
          数据导入导出
        </Title>
        <Paragraph>
          管理您的测试数据，支持多种格式的导入和导出功能。
        </Paragraph>
      </div>

      <Row gutter={24}>
        {/* 数据导出 */}
        <Col span={12}>
          <Card title="数据导出" className="mb-4">
            <Paragraph type="secondary">
              将测试结果和报告导出为不同格式的文件
            </Paragraph>
            
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {exportFormats.map(format => (
                <Card 
                  key={format.key}
                  size="small" 
                  hoverable
                  style={{ cursor: 'pointer' }}
                  onClick={format.action}
                >
                  <Card.Meta
                    avatar={format.icon}
                    title={format.name}
                    description={format.description}
                  />
                </Card>
              ))}
            </Space>

            {exportProgress > 0 && exportProgress < 100 && (
              <div className="mt-4">
                <Progress percent={exportProgress} status="active" />
              </div>
            )}
          </Card>
        </Col>

        {/* 数据导入 */}
        <Col span={12}>
          <Card title="数据导入" className="mb-4">
            <Paragraph type="secondary">
              上传测试数据文件，支持Excel、JSON、CSV格式
            </Paragraph>
            
            <Dragger {...uploadProps} style={{ marginBottom: 16 }}>
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 .xlsx, .json, .csv 格式文件
              </p>
            </Dragger>

            {uploading && (
              <Progress percent={50} status="active" />
            )}
          </Card>
        </Col>
      </Row>

      {/* 最近操作记录 */}
      <Card title="最近操作记录">
        <Table
          dataSource={[
            {
              key: '1',
              operation: '导出Excel报告',
              file: 'test-results-2025-08-19.xlsx',
              time: '2025-08-19 14:30:00',
              status: '成功'
            },
            {
              key: '2',
              operation: '导入测试数据',
              file: 'stress-test-data.json',
              time: '2025-08-19 10:15:00',
              status: '成功'
            }
          ]}
          columns={[
            {
              title: '操作类型',
              dataIndex: 'operation',
              key: 'operation'
            },
            {
              title: '文件名',
              dataIndex: 'file',
              key: 'file'
            },
            {
              title: '操作时间',
              dataIndex: 'time',
              key: 'time'
            },
            {
              title: '状态',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => (
                <span style={{ color: status === '成功' ? '#52c41a' : '#ff4d4f' }}>
                  {status}
                </span>
              )
            }
          ]}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default Export;
