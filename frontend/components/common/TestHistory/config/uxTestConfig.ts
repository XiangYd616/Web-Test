/**
 * UX Test 配置
 * UX测试历史记录配置
 */

import { TestHistoryConfig } from '../types';

export const uxTestConfig: TestHistoryConfig = {
  // 基础配置
  testType: 'ux',
  apiEndpoint: '/api/test/history',
  title: 'UX测试历史',
  description: '查看和管理所有UX测试记录',

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
        return url.length > 50 ? `${url.slice(0, 47)}...` : url;
      },
    },
    {
      key: 'overallScore',
      title: '体验评分',
      width: 120,
      sortable: true,
      align: 'center',
      formatter: (value: number) => {
        if (value === undefined || value === null) return '-';
        return `${value}/100`;
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
        if (!value && value !== 0) return '-';
        const seconds = Math.floor(value / 1000);
        return seconds > 60 ? `${Math.floor(seconds / 60)}分${seconds % 60}秒` : `${seconds}秒`;
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
  defaultPageSize: 20,
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
    duration: (ms: number) => {
      if (!ms && ms !== 0) return '-';
      const seconds = Math.floor(ms / 1000);
      return seconds > 60 ? `${Math.floor(seconds / 60)}分${seconds % 60}秒` : `${seconds}秒`;
    },
  },

  // 空状态配置
  emptyState: {
    title: '暂无UX测试记录',
    description: '开始进行UX测试，提升用户体验',
    action: {
      label: '创建UX测试',
      onClick: () => {
        window.location.href = '/ux-test';
      },
    },
  },
};

export default uxTestConfig;
