/**
 * 测试类型配置定义
 * 统一管理所有测试类型的配置、验证和结果展示规则
 */

import { 
  Activity, 
  Database, 
  Globe, 
  Search, 
  Shield, 
  Users, 
  Wifi, 
  Zap,
  Monitor,
  Code
} from 'lucide-react';
import { TestTypeConfig } from '../components/testing/UniversalTestPage';

/**
 * 压力测试配置
 */
export const stressTestConfig: TestTypeConfig = {
  id: 'stress',
  name: '压力测试',
  description: '测试系统在高负载下的性能表现',
  icon: Zap,
  color: 'yellow',
  defaultConfig: {
    targetUrl: '',
    concurrentUsers: 10,
    duration: 60,
    rampUpTime: 10,
    testType: 'load',
    requestsPerSecond: 10,
    timeout: 30000
  },
  configSchema: {
    fields: [
      {
        key: 'targetUrl',
        type: 'url',
        label: '目标URL',
        placeholder: 'https://www.example.com',
        required: true,
        validation: [
          { type: 'required', message: '请输入目标URL' },
          { type: 'pattern', value: '^https?://.+', message: '请输入有效的URL' }
        ]
      },
      {
        key: 'testType',
        type: 'select',
        label: '测试类型',
        required: true,
        options: [
          { value: 'load', label: '负载测试' },
          { value: 'stress', label: '压力测试' },
          { value: 'spike', label: '峰值测试' },
          { value: 'volume', label: '容量测试' }
        ]
      },
      {
        key: 'concurrentUsers',
        type: 'number',
        label: '并发用户数',
        required: true,
        min: 1,
        max: 1000,
        validation: [
          { type: 'min', value: 1, message: '并发用户数至少为1' },
          { type: 'max', value: 1000, message: '并发用户数不能超过1000' }
        ]
      },
      {
        key: 'duration',
        type: 'number',
        label: '测试时长(秒)',
        required: true,
        min: 10,
        max: 3600
      },
      {
        key: 'rampUpTime',
        type: 'number',
        label: '预热时间(秒)',
        min: 0,
        max: 300
      }
    ],
    sections: [
      {
        title: '基础配置',
        fields: ['targetUrl', 'testType'],
        defaultExpanded: true
      },
      {
        title: '负载参数',
        fields: ['concurrentUsers', 'duration', 'rampUpTime'],
        defaultExpanded: true
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
        key: 'performance',
        title: '性能指标',
        type: 'chart'
      },
      {
        key: 'errors',
        title: '错误分析',
        type: 'table'
      }
    ],
    metrics: [
      { key: 'avgResponseTime', label: '平均响应时间', format: 'time' },
      { key: 'throughput', label: '吞吐量', format: 'number' },
      { key: 'errorRate', label: '错误率', format: 'percentage' }
    ]
  }
};

/**
 * API测试配置
 */
export const apiTestConfig: TestTypeConfig = {
  id: 'api',
  name: 'API测试',
  description: '测试API接口的功能、性能和可靠性',
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
        title: '安全检查',
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
          { value: 'desktop', label: '桌面端' },
          { value: 'mobile', label: '移动端' },
          { value: 'tablet', label: '平板端' }
        ]
      },
      {
        key: 'networkCondition',
        type: 'select',
        label: '网络条件',
        options: [
          { value: 'fast-3g', label: '快速3G' },
          { value: 'slow-3g', label: '慢速3G' },
          { value: 'no-throttling', label: '无限制' }
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
        title: '加载时间线',
        type: 'chart'
      }
    ]
  }
};

/**
 * 数据库测试配置
 */
export const databaseTestConfig: TestTypeConfig = {
  id: 'database',
  name: '数据库测试',
  description: '测试数据库连接、性能和安全性',
  icon: Database,
  color: 'purple',
  defaultConfig: {
    connectionString: '',
    testType: 'comprehensive',
    timeout: 30000,
    maxConnections: 10,
    includePerformanceTests: true,
    includeSecurityTests: true
  },
  configSchema: {
    fields: [
      {
        key: 'connectionString',
        type: 'text',
        label: '连接字符串',
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
 * 所有测试类型配置
 */
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
export const getTestTypeConfig = (testTypeId: string): TestTypeConfig | null => {
  return testTypeConfigs[testTypeId] || null;
};

/**
 * 获取所有测试类型列表
 */
export const getAllTestTypes = (): TestTypeConfig[] => {
  return Object.values(testTypeConfigs);
};
