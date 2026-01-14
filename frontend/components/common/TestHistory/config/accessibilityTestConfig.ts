/**
 * Accessibility Test 配置
 * 无障碍测试历史记录配置
 */

import React from 'react';
import { TestHistoryConfig } from '../types';

export const accessibilityTestConfig: TestHistoryConfig = {
  // 基础配置
  testType: 'accessibility',
  apiEndpoint: '/api/test/accessibility',
  title: '无障碍测试历史',
  description: '查看和管理无障碍（A11y）测试记录',

  // 表格列配置
  columns: [
    { key: 'testName', title: '测试名称', width: 220, sortable: true, filterable: true },
    { key: 'url', title: '目标URL', width: 320, sortable: true, filterable: true,
      formatter: (url: string) => url ? (url.length > 50 ? `${url.slice(0,47)}...` : url) : '-' },
    { key: 'violations', title: '违规项', width: 100, sortable: true, align: 'right',
      formatter: (n: number) => (n ?? 0).toLocaleString() },
    { key: 'passes', title: '通过项', width: 100, sortable: true, align: 'right',
      formatter: (n: number) => (n ?? 0).toLocaleString() },
    { key: 'incomplete', title: '未完成', width: 100, sortable: true, align: 'right',
      formatter: (n: number) => (n ?? 0).toLocaleString() },
    { key: 'score', title: '可访问性分', width: 140, sortable: true, align: 'center',
      formatter: (score: number) => {
        if (score === undefined || score === null) return '-';
        const color = score >= 90 ? 'text-green-400' : score >= 70 ? 'text-yellow-400' : 'text-red-400';
        return React.createElement('span', { className: `${color} font-bold` }, String(score));
      }
    },
    { key: 'status', title: '状态', width: 120, sortable: true },
    { key: 'createdAt', title: '创建时间', width: 180, sortable: true,
      formatter: (v: string) => v ? new Date(v).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '-' },
  ],

  statusOptions: [
    { value: 'all', label: '全部状态' },
    { value: 'idle', label: '待开始' },
    { value: 'running', label: '运行中' },
    { value: 'completed', label: '已完成' },
    { value: 'failed', label: '失败' },
    { value: 'cancelled', label: '已取消' },
  ],

  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 50, 100],

  features: { export: true, exportFormats: ['json','csv'], batchDelete: true, detailView: true, rerun: true, search: true, advancedFilter: true },

  customFilters: [
    { key: 'minScore', label: '最低分', type: 'number', placeholder: '0-100' },
    { key: 'standard', label: '标准', type: 'select', options: [
      { value: 'all', label: '全部' },
      { value: 'wcag2a', label: 'WCAG 2.0 A' },
      { value: 'wcag2aa', label: 'WCAG 2.0 AA' },
      { value: 'wcag21aa', label: 'WCAG 2.1 AA' },
    ]},
  ],

  customActions: [
    { key: 'viewReport', label: '查看报告', onClick: (r) => { window.location.href = `/testing/accessibility/report/${r.id}`; }, visible: r => r.status==='completed' },
  ],

  formatters: {
    date: (d) => d ? new Date(d).toLocaleString('zh-CN') : '-',
    number: (n) => (n === undefined || n === null) ? '-' : n.toLocaleString(),
    status: (s) => ({ idle:'待开始',running:'运行中',completed:'已完成',failed:'失败',cancelled:'已取消' }[s] || s),
  },

  emptyState: {
    title: '暂无无障碍测试记录',
    description: '点击下方按钮创建您的第一个无障碍测试',
    action: { label: '创建无障碍测试', onClick: () => { window.location.href = '/testing/accessibility/create'; } }
  },
};

export default accessibilityTestConfig;
