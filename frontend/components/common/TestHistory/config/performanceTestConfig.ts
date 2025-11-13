/**
 * Performance Test 配置
 * 性能测试历史记录配置
 */

import { TestHistoryConfig } from '../types';

export const performanceTestConfig: TestHistoryConfig = {
  // 基础配置
  testType: 'performance',
  apiEndpoint: '/api/test/performance',
  title: '性能测试历史',
  description: '查看和管理所有性能测试记录',

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
      formatter: (url: string) => {
        if (!url) return '-';
        return url.length > 50 ? url.substring(0, 47) + '...' : url;
      },
    },
    {
      key: 'overallScore',
      title: '综合评分',
      width: 120,
      sortable: true,
      align: 'center',
      formatter: (score: number) => {
        if (score === undefined || score === null) return '-';
        const scoreClass = score >= 90 ? 'text-green-400' :
                           score >= 70 ? 'text-yellow-400' :
                           'text-red-400';
        return `<span class="${scoreClass} text-lg font-bold">${score}</span>`;
      },
    },
    {
      key: 'fcp',
      title: 'FCP',
      width: 100,
      sortable: true,
      align: 'right',
      formatter: (ms: number) => {
        if (!ms && ms !== 0) return '-';
        const color = ms < 1000 ? 'text-green-400' :
                      ms < 2000 ? 'text-yellow-400' :
                      'text-red-400';
        return `<span class="${color}">${(ms / 1000).toFixed(2)}s</span>`;
      },
    },
    {
      key: 'lcp',
      title: 'LCP',
      width: 100,
      sortable: true,
      align: 'right',
      formatter: (ms: number) => {
        if (!ms && ms !== 0) return '-';
        const color = ms < 2500 ? 'text-green-400' :
                      ms < 4000 ? 'text-yellow-400' :
                      'text-red-400';
        return `<span class="${color}">${(ms / 1000).toFixed(2)}s</span>`;
      },
    },
    {
      key: 'tti',
      title: 'TTI',
      width: 100,
      sortable: true,
      align: 'right',
      formatter: (ms: number) => {
        if (!ms && ms !== 0) return '-';
        const color = ms < 3000 ? 'text-green-400' :
                      ms < 5000 ? 'text-yellow-400' :
                      'text-red-400';
        return `<span class="${color}">${(ms / 1000).toFixed(2)}s</span>`;
      },
    },
    {
      key: 'cls',
      title: 'CLS',
      width: 100,
      sortable: true,
      align: 'right',
      formatter: (value: number) => {
        if (value === undefined || value === null) return '-';
        const color = value < 0.1 ? 'text-green-400' :
                      value < 0.25 ? 'text-yellow-400' :
                      'text-red-400';
        return `<span class="${color}">${value.toFixed(3)}</span>`;
      },
    },
    {
      key: 'status',
      title: '状态',
      width: 120,
      sortable: true,
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
      key: 'minScore',
      label: '最低评分',
      type: 'number',
      placeholder: '输入最低评分(0-100)',
    },
    {
      key: 'performanceGrade',
      label: '性能等级',
      type: 'select',
      options: [
        { value: 'all', label: '全部等级' },
        { value: 'excellent', label: '优秀 (90+)' },
        { value: 'good', label: '良好 (70-89)' },
        { value: 'needsImprovement', label: '需改进 (<70)' },
      ],
    },
    {
      key: 'device',
      label: '设备类型',
      type: 'select',
      options: [
        { value: 'all', label: '全部设备' },
        { value: 'mobile', label: '移动设备' },
        { value: 'desktop', label: '桌面设备' },
        { value: 'tablet', label: '平板设备' },
      ],
    },
  ],

  // 自定义操作
  customActions: [
    {
      key: 'compare',
      label: '对比',
      onClick: (record) => {
        console.log('对比性能测试:', record);
      },
      visible: (record) => record.status === 'completed',
    },
    {
      key: 'rerun',
      label: '重新测试',
      onClick: (record) => {
        console.log('重新运行性能测试:', record);
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
        running: '运行中',
        completed: '已完成',
        failed: '失败',
        cancelled: '已取消',
      };
      return statusMap[status] || status;
    },
    score: (score: number) => {
      if (score === undefined || score === null) return '-';
      return score.toString();
    },
    number: (num: number) => {
      if (num === undefined || num === null) return '-';
      return num.toLocaleString();
    },
  },

  // 空状态配置
  emptyState: {
    title: '暂无性能测试记录',
    description: '还没有创建任何性能测试,点击下方按钮开始测试',
    action: {
      label: '创建性能测试',
      onClick: () => {
        window.location.href = '/testing/performance/create';
      },
    },
  },
};

export default performanceTestConfig;
