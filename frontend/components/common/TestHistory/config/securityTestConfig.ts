/**
 * Security Test 配置
 * 安全测试历史记录配置
 */

import { TestHistoryConfig } from '../types';

export const securityTestConfig: TestHistoryConfig = {
  // 基础配置
  testType: 'security',
  apiEndpoint: '/api/test/history',
  title: '安全测试历史',
  description: '查看和管理所有安全测试记录',

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
      key: 'riskLevel',
      title: '风险等级',
      width: 120,
      sortable: true,
      align: 'center',
      formatter: (level: string) => {
        const levelMap: Record<string, { label: string; color: string }> = {
          critical: { label: '严重', color: 'text-red-500 bg-red-900/30' },
          high: { label: '高危', color: 'text-orange-500 bg-orange-900/30' },
          medium: { label: '中危', color: 'text-yellow-500 bg-yellow-900/30' },
          low: { label: '低危', color: 'text-blue-500 bg-blue-900/30' },
          info: { label: '信息', color: 'text-gray-400 bg-gray-700/30' },
        };
        const config = levelMap[level] || levelMap.info;
        return `<span class="${config.color} px-2 py-1 rounded text-xs font-medium">${config.label}</span>`;
      },
    },
    {
      key: 'vulnerabilities',
      title: '漏洞数量',
      width: 120,
      sortable: true,
      align: 'right',
      formatter: (
        value:
          | { critical?: number; high?: number; medium?: number; low?: number }
          | null
          | undefined
      ) => {
        if (!value) return '0';
        const { critical = 0, high = 0, medium = 0, low = 0 } = value;
        const total = critical + high + medium + low;
        const color =
          critical > 0
            ? 'text-red-400'
            : high > 0
              ? 'text-orange-400'
              : medium > 0
                ? 'text-yellow-400'
                : 'text-green-400';
        return `<span class="${color} font-semibold">${total}</span>`;
      },
    },
    {
      key: 'scanDuration',
      title: '扫描时长',
      width: 120,
      sortable: true,
      align: 'right',
      formatter: (ms: number) => {
        if (!ms) return '-';
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        return minutes > 0 ? `${minutes}分${seconds % 60}秒` : `${seconds}秒`;
      },
    },
    {
      key: 'securityScore',
      title: '安全评分',
      width: 120,
      sortable: true,
      align: 'center',
      formatter: (score: number) => {
        if (score === undefined || score === null) return '-';
        const color =
          score >= 90 ? 'text-green-400' : score >= 70 ? 'text-yellow-400' : 'text-red-400';
        return `<span class="${color} text-lg font-bold">${score}</span>`;
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
    { value: 'running', label: '扫描中' },
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
      key: 'riskLevel',
      label: '风险等级',
      type: 'select',
      options: [
        { value: 'all', label: '全部等级' },
        { value: 'critical', label: '严重' },
        { value: 'high', label: '高危' },
        { value: 'medium', label: '中危' },
        { value: 'low', label: '低危' },
        { value: 'info', label: '信息' },
      ],
    },
    {
      key: 'minSecurityScore',
      label: '最低安全评分',
      type: 'number',
      placeholder: '输入最低评分(0-100)',
    },
    {
      key: 'scanType',
      label: '扫描类型',
      type: 'select',
      options: [
        { value: 'all', label: '全部类型' },
        { value: 'full', label: '完整扫描' },
        { value: 'quick', label: '快速扫描' },
        { value: 'custom', label: '自定义扫描' },
      ],
    },
  ],

  // 自定义操作
  customActions: [
    {
      key: 'viewReport',
      label: '查看报告',
      onClick: record => {
        window.location.href = `/testing/security/report/${record.id}`;
      },
      visible: record => record.status === 'completed',
    },
    {
      key: 'rescan',
      label: '重新扫描',
      onClick: record => {
        void record;
      },
      visible: record => ['completed', 'failed', 'cancelled'].includes(record.status),
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
        running: '扫描中',
        completed: '已完成',
        failed: '失败',
        cancelled: '已取消',
      };
      return statusMap[status] || status;
    },
    number: (num: number) => {
      if (num === undefined || num === null) return '-';
      return num.toLocaleString();
    },
  },

  // 空状态配置
  emptyState: {
    title: '暂无安全测试记录',
    description: '还没有创建任何安全测试,点击下方按钮开始测试',
    action: {
      label: '创建安全测试',
      onClick: () => {
        window.location.href = '/testing/security/create';
      },
    },
  },
};

export default securityTestConfig;
