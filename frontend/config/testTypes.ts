/**
 * 测试类型配置定义
 * 统一管理所有测试类型的配置、验证和结果展示规则
 */

import {Activity, Database, Zap, Code} from 'lucide-react';
import { TestTypeConfig } from '../components/testing/UniversalTestPage';

/**
 * 压力测试配置
 */
export const stressTestConfig: TestTypeConfig = {
  id: 'stress',
  name: '压力测试',
  description: '测试系统在高负载下的性能表现和稳定�?,
  icon: Zap,
  color: 'red',
  defaultConfig: {
    targetUrl: '',
    method: 'GET',
    concurrentUsers: 10,
    duration: 60,
    rampUpTime: 10,
    testType: 'load',
    requestsPerSecond: 100,
    timeout: Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 30000,
    headers: {},
    body: '',
    enableAdvanced: false,
    followRedirects: true,
    keepAlive: true,
    compression: true
  },
  configSchema: {
    fields: [
      {
        key: 'targetUrl',
        type: 'url',
        label: '目标URL',
        placeholder: 'https://www.example.com/api/endpoint',
        required: true,
        validation: [
          { type: 'required', message: '请输入目标URL' },
          { type: 'pattern', value: '^https?://.+', message: '请输入有效的URL' }
        ]
      },
      {
        key: 'method',
        type: 'select',
        label: '请求方法',
        required: true,
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'DELETE', label: 'DELETE' },
          { value: 'PATCH', label: 'PATCH' },
          { value: 'HEAD', label: 'HEAD' },
          { value: 'OPTIONS', label: 'OPTIONS' }
        ]
      },
      {
        key: 'testType',
        type: 'select',
        label: '测试类型',
        required: true,
        options: [
          { value: 'load', label: '负载测试 - 测试预期负载下的表现' },
          { value: 'stress', label: '压力测试 - 测试系统极限' },
          { value: 'spike', label: '峰值测�?- 测试突发流量' },
          { value: 'volume', label: '容量测试 - 测试大量数据处理' },
          { value: 'endurance', label: '耐久测试 - 长时间运行测�? }
        ]
      },
      {
        key: 'concurrentUsers',
        type: 'number',
        label: '并发用户�?,
        required: true,
        min: 1,
        max: 10000,
        validation: [
          { type: 'min', value: 1, message: '并发用户数至少为1' },
          { type: 'max', value: 10000, message: '并发用户数不能超�?0000' }
        ]
      },
      {
        key: 'requestsPerSecond',
        type: 'number',
        label: '目标RPS (请求/�?',
        required: true,
        min: 1,
        max: 100000,
        validation: [
          { type: 'min', value: 1, message: 'RPS至少�?' },
          { type: 'max', value: 100000, message: 'RPS不能超过100000' }
        ]
      },
      {
        key: 'duration',
        type: 'number',
        label: '测试时长(�?',
        required: true,
        min: 10,
        max: 3600,
        validation: [
          { type: 'min', value: 10, message: '测试时长至少10�? },
          { type: 'max', value: 3600, message: '测试时长不能超过1小时' }
        ]
      },
      {
        key: 'rampUpTime',
        type: 'number',
        label: '爬升时间(�?',
        min: 0,
        max: 300,
        placeholder: '逐步增加负载的时�?
      },
      {
        key: 'timeout',
        type: 'number',
        label: '请求超时(毫秒)',
        min: 100,
        max: 120000,
        validation: [
          { type: 'min', value: 100, message: '超时时间至少100ms' },
          { type: 'max', value: 120000, message: '超时时间不能超过2分钟' }
        ]
      },
      {
        key: 'headers',
        type: 'textarea',
        label: '自定义请求头(JSON)',
        placeholder: '{\n  "Authorization": "Bearer token",\n  "Content-Type": "application/json"\n}',
        validation: [
          {
            type: 'custom',
            message: '请输入有效的JSON格式',
            validator: (value: string) => {
              if (!value || value.trim() === '') return true;
              try {
                JSON.parse(value);
                return true;
              } catch {
                return false;
              }
            }
          }
        ]
      },
      {
        key: 'body',
        type: 'textarea',
        label: '请求�?,
        placeholder: '{\n  "key": "value"\n}',
        dependencies: [
          {
            field: 'method',
            value: 'GET',
            action: 'hide'
          },
          {
            field: 'method',
            value: 'HEAD',
            action: 'hide'
          }
        ]
      },
      {
        key: 'enableAdvanced',
        type: 'checkbox',
        label: '启用高级选项'
      },
      {
        key: 'followRedirects',
        type: 'checkbox',
        label: '跟随重定�?,
        dependencies: [
          {
            field: 'enableAdvanced',
            value: false,
            action: 'hide'
          }
        ]
      },
      {
        key: 'keepAlive',
        type: 'checkbox',
        label: '保持连接',
        dependencies: [
          {
            field: 'enableAdvanced',
            value: false,
            action: 'hide'
          }
        ]
      },
      {
        key: 'compression',
        type: 'checkbox',
        label: '启用压缩',
        dependencies: [
          {
            field: 'enableAdvanced',
            value: false,
            action: 'hide'
          }
        ]
      }
    ],
    sections: [
      {
        title: '基础配置',
        fields: ['targetUrl', 'method', 'testType'],
        defaultExpanded: true
      },
      {
        title: '负载参数',
        fields: ['concurrentUsers', 'requestsPerSecond', 'duration', 'rampUpTime'],
        defaultExpanded: true
      },
      {
        title: '请求配置',
        fields: ['timeout', 'headers', 'body'],
        collapsible: true,
        defaultExpanded: false
      },
      {
        title: '高级选项',
        fields: ['enableAdvanced', 'followRedirects', 'keepAlive', 'compression'],
        collapsible: true,
        defaultExpanded: false
      }
    ]
  },
  resultSchema: {
    sections: [
      {
        key: 'summary',
        title: '测试概览',
        type: 'cards'
      },
      {
        key: 'responseTime',
        title: '响应时间趋势',
        type: 'chart'
      },
      {
        key: 'throughput',
        title: '吞吐量趋�?,
        type: 'chart'
      },
      {
        key: 'errorRate',
        title: '错误率分�?,
        type: 'chart'
      },
      {
        key: 'concurrentUsers',
        title: '并发用户�?,
        type: 'chart'
      },
      {
        key: 'errors',
        title: '错误日志',
        type: 'table'
      }
    ],
    charts: [
      {
        key: 'responseTimeChart',
        type: 'line',
        title: '响应时间趋势',
        dataKey: 'metrics.responseTime'
      },
      {
        key: 'throughputChart',
        type: 'line',
        title: '吞吐量趋�?,
        dataKey: 'metrics.throughput'
      },
      {
        key: 'errorRateChart',
        type: 'bar',
        title: '错误�?,
        dataKey: 'metrics.errorRate'
      },
      {
        key: 'usersChart',
        type: 'area',
        title: '并发用户�?,
        dataKey: 'metrics.activeUsers'
      }
    ],
    metrics: [
      { key: 'totalRequests', label: '总请求数', format: 'number', color: 'blue' },
      { key: 'successfulRequests', label: '成功请求', format: 'number', color: 'green' },
      { key: 'failedRequests', label: '失败请求', format: 'number', color: 'red' },
      { key: 'avgResponseTime', label: '平均响应时间', format: 'time', color: 'yellow' },
      { key: 'minResponseTime', label: '最小响应时�?, format: 'time', color: 'green' },
      { key: 'maxResponseTime', label: '最大响应时�?, format: 'time', color: 'red' },
      { key: 'percentile95', label: '95百分�?, format: 'time', color: 'orange' },
      { key: 'percentile99', label: '99百分�?, format: 'time', color: 'red' },
      { key: 'throughput', label: '吞吐�?req/s)', format: 'number', color: 'purple' },
      { key: 'errorRate', label: '错误�?, format: 'percentage', color: 'red' }
    ]
  }
};

/**
 * API测试配置
 */
export const apiTestConfig: TestTypeConfig = {
  id: 'api',
  name: 'API测试',
  description: '测试API接口的功能、性能和可靠�?,
  icon: Code,
  color: 'blue',
  defaultConfig: {
    baseUrl: '',
    endpoints: [],
    timeout: 10000,
    retries: 3,
    validateSchema: true,
    testSecurity: false,
    testPerformance: false
  },
  configSchema: {
    fields: [
      {
        key: 'baseUrl',
        type: 'url',
        label: '基础URL',
        placeholder: 'https://api.example.com',
        required: true
      },
      {
        key: 'timeout',
        type: 'number',
        label: '超时时间(ms)',
        min: 1000,
        max: 60000
      },
      {
        key: 'retries',
        type: 'number',
        label: '重试次数',
        min: 0,
        max: 10
      },
      {
        key: 'validateSchema',
        type: 'checkbox',
        label: '验证响应结构'
      },
      {
        key: 'testSecurity',
        type: 'checkbox',
        label: '安全测试'
      },
      {
        key: 'testPerformance',
        type: 'checkbox',
        label: '性能测试'
      }
    ]
  },
  resultSchema: {
    sections: [
      {
        key: 'endpoints',
        title: '接口测试结果',
        type: 'table'
      },
      {
        key: 'security',
        title: '安全检�?,
        type: 'cards'
      }
    ]
  }
};

/**
 * 性能测试配置
 */
export const performanceTestConfig: TestTypeConfig = {
  id: 'performance',
  name: '性能测试',
  description: '测试网站加载速度和性能指标',
  icon: Activity,
  color: 'green',
  defaultConfig: {
    url: '',
    device: 'desktop',
    networkCondition: 'fast-3g',
    includeScreenshots: true,
    includeMetrics: true
  },
  configSchema: {
    fields: [
      {
        key: 'url',
        type: 'url',
        label: '测试URL',
        required: true
      },
      {
        key: 'device',
        type: 'select',
        label: '设备类型',
        options: [
          { value: 'desktop', label: '桌面�? },
          { value: 'mobile', label: '移动�? },
          { value: 'tablet', label: '平板�? }
        ]
      },
      {
        key: 'networkCondition',
        type: 'select',
        label: '网络条件',
        options: [
          { value: 'fast-3g', label: '快�?G' },
          { value: 'slow-3g', label: '慢�?G' },
          { value: 'no-throttling', label: '无限�? }
        ]
      }
    ]
  },
  resultSchema: {
    sections: [
      {
        key: 'metrics',
        title: 'Core Web Vitals',
        type: 'cards'
      },
      {
        key: 'timeline',
        title: '加载时间�?,
        type: 'chart'
      }
    ]
  }
};

/**
 * 数据库测试配�? */
export const databaseTestConfig: TestTypeConfig = {
  id: 'database',
  name: '数据库测�?,
  description: '测试数据库连接、性能和安全�?,
  icon: Database,
  color: 'purple',
  defaultConfig: {
    connectionString: '',
    testType: 'comprehensive',
    timeout: Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 30000,
    maxConnections: 10,
    includePerformanceTests: true,
    includeSecurityTests: true
  },
  configSchema: {
    fields: [
      {
        key: 'connectionString',
        type: 'text',
        label: '连接字符�?,
        placeholder: 'postgresql://user:password@host:port/database',
        required: true
      },
      {
        key: 'testType',
        type: 'select',
        label: '测试类型',
        options: [
          { value: 'connection', label: '连接测试' },
          { value: 'performance', label: '性能测试' },
          { value: 'security', label: '安全测试' },
          { value: 'comprehensive', label: '综合测试' }
        ]
      }
    ]
  },
  resultSchema: {
    sections: [
      {
        key: 'connection',
        title: '连接测试',
        type: 'cards'
      },
      {
        key: 'performance',
        title: '性能指标',
        type: 'table'
      }
    ]
  }
};

/**
 * 所有测试类型配�? */
export const testTypeConfigs: Record<string, TestTypeConfig> = {
  stress: stressTestConfig,
  api: apiTestConfig,
  performance: performanceTestConfig,
  database: databaseTestConfig,
  // 可以继续添加其他测试类型...
};

/**
 * 获取测试类型配置
 */
const getTestTypeConfig = (testTypeId: string): TestTypeConfig | null => {
  return testTypeConfigs[testTypeId] || null;
};

/**
 * 获取所有测试类型列�? */
const getAllTestTypes = (): TestTypeConfig[] => {
  return Object.values(testTypeConfigs);
};
