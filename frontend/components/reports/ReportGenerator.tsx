/**
 * 报告生成器组件
 * 提供多种报告生成功能：测试报告、性能分析、安全评估等
 */

import React, { useState, useEffect } from 'react';
import {Card, Form, Select, DatePicker, Button, Steps, Progress, Table, Tag, Space, Divider, Checkbox, Radio, Input, notification} from 'antd';
import {FileTextOutlined, DownloadOutlined, EyeOutlined, BarChartOutlined, ClockCircleOutlined, CheckCircleOutlined, LoadingOutlined} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Step } = Steps;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

interface ReportConfig {
  type: 'performance' | 'security' | 'comprehensive' | 'custom';
  dateRange: [string, string];
  testTypes: string[];
  includeCharts: boolean;
  includeRawData: boolean;
  format: 'pdf' | 'html' | 'excel' | 'json';
  recipients?: string[];
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  sections: string[];
  estimatedTime: number; // 分钟
}

interface GeneratedReport {
  id: string;
  name: string;
  type: string;
  status: 'generating' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  fileSize?: string;
  downloadUrl?: string;
}

const ReportGenerator: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [recentReports, setRecentReports] = useState<GeneratedReport[]>([]);

  // 报告模板数据
  const [templates] = useState<ReportTemplate[]>([
    {
      id: '1',
      name: '性能测试报告',
      description: '包含网站性能、加载时间、性能优化建议',
      type: 'performance',
      sections: ['性能概览', '响应时间分析', '资源加载分析', '优化建议'],
      estimatedTime: 5
    },
    {
      id: '2',
      name: '安全评估报告',
      description: '安全漏洞扫描、风险评估、修复建议',
      type: 'security',
      sections: ['安全概览', '漏洞详情', '风险评级', '修复建议'],
      estimatedTime: 8
    },
    {
      id: '3',
      name: '综合测试报告',
      description: '全面的网站测试报告，包含所有测试类型',
      type: 'comprehensive',
      sections: ['执行摘要', '性能分析', '安全评估', 'SEO分析', '兼容性测试', '总结建议'],
      estimatedTime: 15
    },
    {
      id: '4',
      name: '自定义报告',
      description: '根据需要自定义报告内容和格式',
      type: 'custom',
      sections: ['自定义内容'],
      estimatedTime: 10
    }
  ]);

  // 最近生成的报告
  useEffect(() => {
    const mockReports: GeneratedReport[] = [
      {
        id: '1',
        name: '网站性能测试报告_20241215',
        type: 'performance',
        status: 'completed',
        progress: 100,
        createdAt: '2024-12-15 10:30:00',
        fileSize: '2.5MB',
        downloadUrl: '/api/reports/download/1'
      },
      {
        id: '2',
        name: '安全评估报告_20241214',
        type: 'security',
        status: 'completed',
        progress: 100,
        createdAt: '2024-12-14 16:45:00',
        fileSize: '1.8MB',
        downloadUrl: '/api/reports/download/2'
      },
      {
        id: '3',
        name: '综合测试报告_20241213',
        type: 'comprehensive',
        status: 'generating',
        progress: 65,
        createdAt: '2024-12-13 14:20:00'
      }
    ];
    setRecentReports(mockReports);
  }, []);

  // 报告列表表格列
  const reportColumns: ColumnsType<GeneratedReport> = [
    {
      title: '报告名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <FileTextOutlined />
          <span>{text}</span>
        </Space>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap = {
          performance: { text: '性能', color: 'blue' },
          security: { text: '安全', color: 'red' },
          comprehensive: { text: '综合', color: 'green' },
          custom: { text: '自定义', color: 'purple' }
        };
        const config = typeMap[type as keyof typeof typeMap] || { text: type, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record) => {
        if (status === 'generating') {
          return (
            <Space>
              <LoadingOutlined />
              <span>生成中</span>
              <Progress percent={record.progress} size="small" style={{ width: 60 }} />
            </Space>
          );
        } else if (status === 'completed') {
          return (
            <Space>
              <CheckCircleOutlined style={{ color: 'green' }} />
              <span>已完成</span>
            </Space>
          );
        }
        return <Tag color="red">失败</Tag>;
      }
    }
  ];

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      form.setFieldsValue({
        type: template.type,
        testTypes: template.sections
      });
    }
  };

  const handleGenerateReport = async () => {
    try {
      const _values = await form.validateFields();
      setGenerating(true);
      setGenerationProgress(0);
      setCurrentStep(2);

      // 模拟报告生成过程
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setGenerating(false);
            setCurrentStep(3);
            notification.success({
              message: '报告生成成功',
              description: '报告已生成完成，可以在报告列表中查看和下载。'
            });
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const _handleDownload = (report: GeneratedReport) => {
    // 模拟下载
    notification.success({
      message: '下载开始',
      description: `正在下载 ${report.name}`
    });
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setGenerating(false);
    setGenerationProgress(0);
    form.resetFields();
    setSelectedTemplate('');
  };

  const steps = [
    {
      title: '选择模板',
      icon: <FileTextOutlined />
    },
    {
      title: '配置选项',
      icon: <BarChartOutlined />
    },
    {
      title: '生成报告',
      icon: generating ? <LoadingOutlined /> : <ClockCircleOutlined />
    },
    {
      title: '完成',
      icon: <CheckCircleOutlined />
    }
  ];

  return (
    <div className="report-generator p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">报告生成器</h1>
        <p className="text-gray-600">生成专业的测试报告，支持多种格式和自定义配置</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 报告生成向导 */}
        <div className="lg:col-span-2">
          <Card title="创建新报告">
            <Steps current={currentStep} className="mb-8">
              {steps.map((step, index) => (
                <Step key={index} title={step.title} icon={step.icon} />
              ))}
            </Steps>

            {/* 步骤1: 选择模板 */}
            {currentStep === 0 && (
              <div>
                <h3 className="text-lg font-medium mb-4">选择报告模板</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {templates.map(template => (
                    <Card
                      key={template.id}
                      size="small"
                      hoverable
                      className={`cursor-pointer transition-all ${
                        selectedTemplate === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <Tag color="blue">{template.estimatedTime}min</Tag>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                      <div>
                        <span className="text-xs text-gray-500">包含: </span>
                        {template.sections.slice(0, 2).map(section => (
                          <Tag key={section} className="text-xs">{section}</Tag>
                        ))}
                        {template.sections.length > 2 && (
                          <Tag className="text-xs">+{template.sections.length - 2}</Tag>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button
                    type="primary"
                    disabled={!selectedTemplate}
                    onClick={() => setCurrentStep(1)}
                  >
                    下一步
                  </Button>
                </div>
              </div>
            )}

            {/* 步骤2: 配置选项 */}
            {currentStep === 1 && (
              <div>
                <Form form={form} layout="vertical">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item label="报告名称" name="name" rules={[{ required: true, message: '请输入报告名称' }]}>
                      <Input placeholder="输入报告名称" />
                    </Form.Item>
                    <Form.Item label="时间范围" name="dateRange" rules={[{ required: true, message: '请选择时间范围' }]}>
                      <RangePicker
                        style={{ width: '100%' }}
                        defaultValue={[dayjs().subtract(7, 'day'), dayjs()]}
                      />
                    </Form.Item>
                  </div>

                  <Form.Item label="包含的测试类型" name="testTypes">
                    <Checkbox.Group>
                      <div className="grid grid-cols-2 gap-2">
                        <Checkbox value="performance">性能测试</Checkbox>
                        <Checkbox value="security">安全测试</Checkbox>
                        <Checkbox value="seo">SEO分析</Checkbox>
                        <Checkbox value="compatibility">兼容性测试</Checkbox>
                        <Checkbox value="ux">用户体验</Checkbox>
                        <Checkbox value="accessibility">可访问性</Checkbox>
                      </div>
                    </Checkbox.Group>
                  </Form.Item>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Form.Item label="报告格式" name="format" initialValue="pdf">
                      <Radio.Group>
                        <Radio value="pdf">PDF</Radio>
                        <Radio value="html">HTML</Radio>
                        <Radio value="excel">Excel</Radio>
                        <Radio value="json">JSON</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </div>

                  <Form.Item label="附加选项">
                    <Checkbox.Group>
                      <div className="space-y-2">
                        <div><Checkbox value="charts">包含图表</Checkbox></div>
                        <div><Checkbox value="rawData">包含原始数据</Checkbox></div>
                        <div><Checkbox value="recommendations">包含优化建议</Checkbox></div>
                        <div><Checkbox value="trend">包含趋势分析</Checkbox></div>
                      </div>
                    </Checkbox.Group>
                  </Form.Item>

                  <Form.Item label="报告描述" name="description">
                    <TextArea rows={3} placeholder="可选：添加报告描述" />
                  </Form.Item>
                </Form>

                <div className="flex justify-between">
                  <Button onClick={() => setCurrentStep(0)}>上一步</Button>
                  <Button type="primary" onClick={handleGenerateReport}>生成报告</Button>
                </div>
              </div>
            )}

            {/* 步骤3: 生成进度 */}
            {currentStep === 2 && (
              <div className="text-center py-8">
                <LoadingOutlined className="text-4xl text-blue-500 mb-4" />
                <h3 className="text-lg font-medium mb-4">正在生成报告...</h3>
                <Progress percent={Math.floor(generationProgress)} className="mb-4" />
                <p className="text-gray-600">预计剩余时间: {Math.max(1, Math.floor((100 - generationProgress) / 20))} 分钟</p>
              </div>
            )}

            {/* 步骤4: 完成 */}
            {currentStep === 3 && (
              <div className="text-center py-8">
                <CheckCircleOutlined className="text-4xl text-green-500 mb-4" />
                <h3 className="text-lg font-medium mb-4">报告生成完成！</h3>
                <p className="text-gray-600 mb-6">您的报告已成功生成，可以在右侧的报告列表中查看。</p>
                <Space>
                  <Button type="primary" icon={<EyeOutlined />}>预览报告</Button>
                  <Button icon={<DownloadOutlined />}>下载报告</Button>
                  <Button onClick={resetWizard}>创建新报告</Button>
                </Space>
              </div>
            )}
          </Card>
        </div>

        {/* 最近报告列表 */}
        <div>
          <Card title="最近生成的报告" size="small">
            <Table
              columns={reportColumns.slice(0, 3)} // 只显示部分列
              dataSource={recentReports.slice(0, 5)}
              rowKey="id"
              pagination={false}
              size="small"
            />
            <Divider />
            <div className="text-center">
              <Button type="link" size="small">查看所有报告</Button>
            </div>
          </Card>

          <Card title="使用提示" size="small" className="mt-4">
            <div className="text-sm text-gray-600 space-y-2">
              <p>• 选择合适的报告模板以快速开始</p>
              <p>• 自定义报告配置以满足特定需求</p>
              <p>• PDF格式适合分享，Excel适合数据分析</p>
              <p>• 生成时间取决于数据量和复杂度</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;
