/** Network Test 配置 - 网络测试 */
import { TestHistoryConfig } from '../types';

export const networkTestConfig: TestHistoryConfig = {
  testType: 'network', apiEndpoint: '/api/test/network', title: '网络测试历史', description: '查看和管理网络性能和连接测试记录',
  columns: [
    { key: 'testName', title: '测试名称', width: 200, sortable: true, filterable: true },
    { key: 'url', title: '目标URL', width: 300, sortable: true,
      formatter: (u: string) => u ? (u.length > 50 ? `${u.slice(0,47)}...` : u) : '-' },
    { key: 'latency', title: '延迟', width: 100, sortable: true, align: 'right',
      formatter: (ms: number) => ms ? `${ms.toFixed(0)}ms` : '-' },
    { key: 'downloadSpeed', title: '下载速度', width: 120, sortable: true, align: 'right',
      formatter: (mbps: number) => mbps ? `${mbps.toFixed(2)} Mbps` : '-' },
    { key: 'uploadSpeed', title: '上传速度', width: 120, sortable: true, align: 'right',
      formatter: (mbps: number) => mbps ? `${mbps.toFixed(2)} Mbps` : '-' },
    { key: 'packetLoss', title: '丢包率', width: 100, sortable: true, align: 'right',
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
    { key: 'maxLatency', label: '最大延迟', type: 'number', placeholder: '输入最大延迟(ms)' },
    { key: 'minDownloadSpeed', label: '最低下载速度', type: 'number', placeholder: '输入最低速度(Mbps)' },
    { key: 'protocol', label: '协议', type: 'select', options: [
      { value: 'all', label: '全部' }, { value: 'http', label: 'HTTP' }, { value: 'https', label: 'HTTPS' },
      { value: 'ws', label: 'WebSocket' }, { value: 'tcp', label: 'TCP' }, { value: 'udp', label: 'UDP' },
    ]},
  ],
  customActions: [
    { key: 'viewTrace', label: '查看路由', onClick: (r) => { console.log('查看网络路由:', r); }, visible: r => r.status==='completed' },
  ],
  formatters: { date: (d) => d ? new Date(d).toLocaleString('zh-CN') : '-', number: (n) => (n ?? null) === null ? '-' : n.toLocaleString(), status: (s) => ({ idle:'待开始',running:'运行中',completed:'已完成',failed:'失败',cancelled:'已取消' }[s] || s) },
  emptyState: { title: '暂无网络测试记录', description: '创建网络性能和连接测试', action: { label: '创建网络测试', onClick: () => { window.location.href = '/testing/network/create'; } } },
};
export default networkTestConfig;
