/**
 * Stress Test 配置
 * 压力测试历史记录配置
 */

import { TestHistoryConfig } from '../types';

export const stressTestConfig: TestHistoryConfig = {
  // 基础配置
  testType: 'stress',
  apiEndpoint: '/api/test/stress',
  title: '压力测试历史',
  description: '查看和管理所有压力测试记录',

  // 表格列配置
  columns: [
    {
      key: 'testName',
      title: '测试名称',
      width: 200,
      sortable: true,
      filterable: true,
    },
    {
      key: 'url',
      title: '目标URL',
      width: 300,
      sortable: true,
      filterable: true,
      formatter: (url: string) => {
        if (!url) return '-';
        return url.length > 50 ? url.substring(0, 47) + '...' : url;
      },
    },
    {
      key: 'totalRequests',
      title: '请求总数',
      width: 120,
      sortable: true,
      align: 'right',
      formatter: (value: number) => value?.toLocaleString() || '0',
    },
    {
      key: 'successfulRequests',
      title: '成功请求',
      width: 120,
      sortable: true,
      align: 'right',
      formatter: (value: number) => value?.toLocaleString() || '0',
    },
    {
      key: 'averageResponseTime',
      title: '平均响应时间',
      width: 140,
      sortable: true,
      align: 'right',
      formatter: (value: number) => value ? `${value.toFixed(0)}ms` : '-',
    },
    {
      key: 'peakTps',
      title: 'Peak TPS',
      width: 120,
      sortable: true,
      align: 'right',
      formatter: (value: number) => value?.toLocaleString() || '0',
    },
    {
      key: 'errorRate',
      title: '错误率',
      width: 100,
      sortable: true,
      align: 'right',
      formatter: (value: number) => {
        if (!value && value !== 0) return '-';
        const percentage = (value * 100).toFixed(2);
        return `${percentage}%`;
      },
    },
    {
      key: 'status',
      title: '状态',
      width: 120,
      sortable: true,
    },
    {
      key: 'duration',
      title: '测试时长',
      width: 120,
      sortable: true,
      align: 'right',
      formatter: (value: number) => {
        if (!value) return '-';
        const seconds = Math.floor(value / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return minutes > 0 
          ? `${minutes}分${remainingSeconds}秒`
          : `${seconds}秒`;
      },
    },
    {
      key: 'createdAt',
      title: '创建时间',
      width: 180,
      sortable: true,
      formatter: (value: string) => {
        if (!value) return '-';
        return new Date(value).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      },
    },
  ],

  // 状态选项
  statusOptions: [
    { value: 'all', label: '全部状态' },
    { value: 'idle', label: '待开始' },
    { value: 'starting', label: '启动中' },
    { value: 'running', label: '运行中' },
    { value: 'completed', label: '已完成' },
    { value: 'failed', label: '失败' },
    { value: 'cancelled', label: '已取消' },
  ],

  // 默认分页配置
  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 50, 100],

  // 功能配置
  features: {
    export: true,
    exportFormats: ['json', 'csv'],
    batchDelete: true,
    detailView: true,
    rerun: true,
    search: true,
    advancedFilter: true,
  },

  // 自定义筛选器
  customFilters: [
    {
      key: 'minTps',
      label: '最小TPS',
      type: 'number',
      placeholder: '输入最小TPS',
    },
    {
      key: 'maxErrorRate',
      label: '最大错误率',
      type: 'number',
      placeholder: '输入最大错误率(%)',
    },
    {
      key: 'environment',
      label: '测试环境',
      type: 'select',
      options: [
        { value: 'all', label: '全部环境' },
        { value: 'development', label: '开发环境' },
        { value: 'staging', label: '预发布环境' },
        { value: 'production', label: '生产环境' },
      ],
    },
  ],

  // 自定义操作
  customActions: [
    {
      key: 'compare',
      label: '对比',
      onClick: (record) => {
        console.log('对比测试:', record);
        // 实际实现中会导航到对比页面
      },
      visible: (record) => record.status === 'completed',
    },
    {
      key: 'rerun',
      label: '重新运行',
      onClick: (record) => {
        console.log('重新运行测试:', record);
        // 实际实现中会触发重新运行
      },
      visible: (record) => ['completed', 'failed', 'cancelled'].includes(record.status),
    },
  ],

  // 数据格式化器
  formatters: {
    date: (date: string | Date) => {
      if (!date) return '-';
      return new Date(date).toLocaleString('zh-CN');
    },
    status: (status: string) => {
      const statusMap: Record<string, string> = {
        idle: '待开始',
        starting: '启动中',
        running: '运行中',
        completed: '已完成',
        failed: '失败',
        cancelled: '已取消',
      };
      return statusMap[status] || status;
    },
    duration: (ms: number) => {
      if (!ms) return '-';
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        return `${hours}小时${minutes % 60}分`;
      } else if (minutes > 0) {
        return `${minutes}分${seconds % 60}秒`;
      } else {
        return `${seconds}秒`;
      }
    },
    number: (num: number) => {
      if (num === undefined || num === null) return '-';
      return num.toLocaleString();
    },
    url: (url: string) => {
      if (!url) return '-';
      try {
        const urlObj = new URL(url);
        return urlObj.hostname;
      } catch {
        return url;
      }
    },
  },

  // 空状态配置
  emptyState: {
    title: '暂无测试记录',
    description: '还没有创建任何压力测试,点击下方按钮开始测试',
    action: {
      label: '创建压力测试',
      onClick: () => {
        // 导航到创建测试页面
        window.location.href = '/testing/stress/create';
      },
    },
  },
};

export default stressTestConfig;
