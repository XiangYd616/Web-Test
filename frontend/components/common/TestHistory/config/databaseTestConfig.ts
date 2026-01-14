/** Database Test 配置 - 数据库测试 */
import { TestHistoryConfig } from '../types';

export const databaseTestConfig: TestHistoryConfig = {
  testType: 'database', apiEndpoint: '/api/test/database', title: '数据库测试历史', description: '查看和管理数据库性能和压力测试记录',
  columns: [
    { key: 'testName', title: '测试名称', width: 200, sortable: true, filterable: true },
    { key: 'dbType', title: '数据库类型', width: 120, sortable: true,
      formatter: (t: string) => ({ mysql:'MySQL', postgresql:'PostgreSQL', mongodb:'MongoDB', redis:'Redis' }[t] || t || '-') },
    { key: 'queries', title: '查询次数', width: 120, sortable: true, align: 'right',
      formatter: (n: number) => (n ?? 0).toLocaleString() },
    { key: 'avgQueryTime', title: '平均响应', width: 120, sortable: true, align: 'right',
      formatter: (ms: number) => ms ? `${ms.toFixed(1)}ms` : '-' },
    { key: 'qps', title: 'QPS', width: 100, sortable: true, align: 'right',
      formatter: (n: number) => (n ?? 0).toLocaleString() },
    { key: 'errorRate', title: '错误率', width: 100, sortable: true, align: 'right',
      formatter: (r: number) => r !== null && r !== undefined ? `${(r*100).toFixed(2)}%` : '-' },
    { key: 'status', title: '状态', width: 120, sortable: true },
    { key: 'createdAt', title: '创建时间', width: 180, sortable: true,
      formatter: (v: string) => v ? new Date(v).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '-' },
  ],
  statusOptions: [
    { value: 'all', label: '全部状态' }, { value: 'idle', label: '待开始' }, { value: 'running', label: '运行中' },
    { value: 'completed', label: '已完成' }, { value: 'failed', label: '失败' }, { value: 'cancelled', label: '已取消' },
  ],
  defaultPageSize: 10, pageSizeOptions: [10, 20, 50, 100],
  features: { export: true, exportFormats: ['json','csv'], batchDelete: true, detailView: true, rerun: true, search: true, advancedFilter: true },
  customFilters: [
    { key: 'dbType', label: '数据库类型', type: 'select', options: [
      { value: 'all', label: '全部' }, { value: 'mysql', label: 'MySQL' }, { value: 'postgresql', label: 'PostgreSQL' },
      { value: 'mongodb', label: 'MongoDB' }, { value: 'redis', label: 'Redis' },
    ]},
    { key: 'minQps', label: '最低QPS', type: 'number', placeholder: '输入最低QPS' },
  ],
  customActions: [
    { key: 'viewMetrics', label: '查看指标', onClick: (r) => { console.log('查看数据库指标:', r); }, visible: r => r.status==='completed' },
  ],
  formatters: { date: (d) => d ? new Date(d).toLocaleString('zh-CN') : '-', number: (n) => (n ?? null) === null ? '-' : n.toLocaleString(), status: (s) => ({ idle:'待开始',running:'运行中',completed:'已完成',failed:'失败',cancelled:'已取消' }[s] || s) },
  emptyState: { title: '暂无数据库测试记录', description: '创建数据库性能和压力测试', action: { label: '创建数据库测试', onClick: () => { window.location.href = '/testing/database/create'; } } },
};
export default databaseTestConfig;
