/** Compatibility Test 配置 - 兼容性测试 */
import { TestHistoryConfig } from '../types';

export const compatibilityTestConfig: TestHistoryConfig = {
  testType: 'compatibility',
  apiEndpoint: '/api/test/history',
  title: '兼容性测试历史',
  description: '查看和管理跨浏览器/设备兼容性测试记录',
  columns: [
    { key: 'testName', title: '测试名称', width: 200, sortable: true, filterable: true },
    {
      key: 'url',
      title: '目标URL',
      width: 300,
      sortable: true,
      formatter: (u: string) => (u ? (u.length > 50 ? `${u.slice(0, 47)}...` : u) : '-'),
    },
    {
      key: 'browsers',
      title: '浏览器数',
      width: 100,
      sortable: true,
      align: 'center',
      formatter: (v: Array<unknown> | null | undefined) => v?.length || 0,
    },
    {
      key: 'passed',
      title: '通过数',
      width: 100,
      sortable: true,
      align: 'right',
      formatter: (n: number) => (n ?? 0).toLocaleString(),
    },
    {
      key: 'failed',
      title: '失败数',
      width: 100,
      sortable: true,
      align: 'right',
      formatter: (n: number) => (n ?? 0).toLocaleString(),
    },
    {
      key: 'compatibility',
      title: '兼容性',
      width: 120,
      sortable: true,
      align: 'center',
      formatter: (n: number) => (n !== null && n !== undefined ? `${n}%` : '-'),
    },
    { key: 'status', title: '状态', width: 120, sortable: true },
    {
      key: 'createdAt',
      title: '创建时间',
      width: 180,
      sortable: true,
      formatter: (v: string) =>
        v
          ? new Date(v).toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '-',
    },
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
  features: {
    export: true,
    exportFormats: ['json', 'csv'],
    batchDelete: true,
    detailView: true,
    rerun: true,
    search: true,
    advancedFilter: true,
  },
  customFilters: [
    {
      key: 'browser',
      label: '浏览器',
      type: 'select',
      options: [
        { value: 'all', label: '全部' },
        { value: 'chrome', label: 'Chrome' },
        { value: 'firefox', label: 'Firefox' },
        { value: 'safari', label: 'Safari' },
        { value: 'edge', label: 'Edge' },
      ],
    },
    { key: 'minCompatibility', label: '最低兼容性', type: 'number', placeholder: '0-100(%)' },
  ],
  customActions: [
    {
      key: 'viewMatrix',
      label: '兼容性矩阵',
      onClick: r => {
        void r;
      },
      visible: r => r.status === 'completed',
    },
  ],
  formatters: {
    date: d => (d ? new Date(d).toLocaleString('zh-CN') : '-'),
    number: n => ((n ?? null) === null ? '-' : n.toLocaleString()),
    status: s =>
      ({
        idle: '待开始',
        running: '运行中',
        completed: '已完成',
        failed: '失败',
        cancelled: '已取消',
      })[s] || s,
  },
  emptyState: {
    title: '暂无兼容性测试记录',
    description: '创建跨浏览器/设备兼容性测试',
    action: {
      label: '创建兼容性测试',
      onClick: () => {
        window.location.href = '/testing/compatibility/create';
      },
    },
  },
};
export default compatibilityTestConfig;
