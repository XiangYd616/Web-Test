/**
 * API Test 配置
 * API测试历史记录配置
 */

import { TestHistoryConfig } from '../types';

export const apiTestConfig: TestHistoryConfig = {
  // 基础配置
  testType: 'api',
  apiEndpoint: '/api/test/history',
  title: 'API测试历史',
  description: '查看和管理所有API测试记录',

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
      title: 'API端点',
      width: 300,
      sortable: true,
      filterable: true,
      formatter: (url: string) => {
        if (!url) return '-';
        return url.length > 50 ? url.substring(0, 47) + '...' : url;
      },
    },
    {
      key: 'method',
      title: '请求方法',
      width: 100,
      sortable: true,
      formatter: (method: string) => {
        const methodColors: Record<string, string> = {
          GET: 'text-green-400',
          POST: 'text-blue-400',
          PUT: 'text-yellow-400',
          DELETE: 'text-red-400',
          PATCH: 'text-purple-400',
        };
        const color = methodColors[method?.toUpperCase()] || 'text-gray-400';
        return `<span class="${color} font-semibold">${method?.toUpperCase() || '-'}</span>`;
      },
    },
    {
      key: 'statusCode',
      title: '状态码',
      width: 100,
      sortable: true,
      align: 'center',
      formatter: (code: number) => {
        if (!code) return '-';
        const codeClass =
          code >= 200 && code < 300
            ? 'text-green-400'
            : code >= 400 && code < 500
              ? 'text-yellow-400'
              : code >= 500
                ? 'text-red-400'
                : 'text-gray-400';
        return `<span class="${codeClass} font-mono">${code}</span>`;
      },
    },
    {
      key: 'responseTime',
      title: '响应时间',
      width: 120,
      sortable: true,
      align: 'right',
      formatter: (ms: number) => {
        if (!ms && ms !== 0) return '-';
        const timeClass =
          ms < 100 ? 'text-green-400' : ms < 500 ? 'text-yellow-400' : 'text-red-400';
        return `<span class="${timeClass}">${ms}ms</span>`;
      },
    },
    {
      key: 'assertions',
      title: '断言结果',
      width: 120,
      sortable: true,
      align: 'right',
      formatter: (value: { passed?: number; total?: number } | null | undefined) => {
        if (!value) return '-';
        const { passed = 0, total = 0 } = value;
        const percentage = total > 0 ? ((passed / total) * 100).toFixed(0) : 0;
        const color = passed === total ? 'text-green-400' : 'text-yellow-400';
        return `<span class="${color}">${passed}/${total} (${percentage}%)</span>`;
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
          minute: '2-digit',
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
      key: 'method',
      label: '请求方法',
      type: 'select',
      options: [
        { value: 'all', label: '全部方法' },
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'DELETE', label: 'DELETE' },
        { value: 'PATCH', label: 'PATCH' },
      ],
    },
    {
      key: 'statusCode',
      label: '状态码范围',
      type: 'select',
      options: [
        { value: 'all', label: '全部' },
        { value: '2xx', label: '2xx 成功' },
        { value: '4xx', label: '4xx 客户端错误' },
        { value: '5xx', label: '5xx 服务器错误' },
      ],
    },
    {
      key: 'maxResponseTime',
      label: '最大响应时间',
      type: 'number',
      placeholder: '输入最大响应时间(ms)',
    },
  ],

  // 自定义操作
  customActions: [
    {
      key: 'rerun',
      label: '重新运行',
      onClick: record => {
        void record;
        // 实际实现中会触发重新运行
      },
      visible: record => ['completed', 'failed', 'cancelled'].includes(record.status),
    },
    {
      key: 'viewRequest',
      label: '查看请求',
      onClick: record => {
        void record;
      },
      visible: () => true,
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
    method: (method: string) => {
      return method?.toUpperCase() || '-';
    },
    number: (num: number) => {
      if (num === undefined || num === null) return '-';
      return num.toLocaleString();
    },
  },

  // 空状态配置
  emptyState: {
    title: '暂无API测试记录',
    description: '还没有创建任何API测试,点击下方按钮开始测试',
    action: {
      label: '创建API测试',
      onClick: () => {
        window.location.href = '/testing/api/create';
      },
    },
  },
};

export default apiTestConfig;
