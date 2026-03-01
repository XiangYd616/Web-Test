import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { ArrowDownUp, Sparkles, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { HistoryItem } from '../../context/TestContext';
import { useTestHistory } from '../../context/TestContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/* ---------- 工具函数 ---------- */

const normalizeUrl = (u: string) =>
  u
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .toLowerCase();

const toScore = (s: unknown): number | null => {
  if (s === undefined || s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const formatTime = (iso?: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const formatTimeFull = (iso?: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const shortId = (id: string) => id.slice(0, 8);

const TYPE_LABELS: Record<string, string> = {
  performance: '性能',
  security: '安全',
  seo: 'SEO',
  api: 'API',
  stress: '压力',
  accessibility: '无障碍',
  compatibility: '兼容性',
  ux: '体验',
  website: '全站',
};

const TIME_RANGE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
  { value: '90d', label: '近 90 天' },
];

const getTimeRangeMs = (range: string): number => {
  const DAY = 86400000;
  switch (range) {
    case '7d':
      return 7 * DAY;
    case '30d':
      return 30 * DAY;
    case '90d':
      return 90 * DAY;
    default:
      return 0;
  }
};

type SmartPreset = {
  label: string;
  desc: string;
  pick: (records: HistoryItem[]) => [string, string] | null;
};

const SMART_PRESETS: SmartPreset[] = [
  {
    label: '最近两次',
    desc: '对比最近两次测试',
    pick: r => (r.length >= 2 ? [r[0].id, r[1].id] : null),
  },
  {
    label: '首次 vs 最新',
    desc: '对比最早和最新的测试',
    pick: r => (r.length >= 2 ? [r[0].id, r[r.length - 1].id] : null),
  },
  {
    label: '最佳 vs 最差',
    desc: '对比得分最高和最低',
    pick: r => {
      if (r.length < 2) return null;
      const sorted = [...r].sort((a, b) => (toScore(a.score) ?? 0) - (toScore(b.score) ?? 0));
      return [sorted[sorted.length - 1].id, sorted[0].id];
    },
  },
];

/* ---------- 对比结果子组件 ---------- */

const CompareResult = ({ testA, testB }: { testA: HistoryItem; testB: HistoryItem }) => {
  const scoreA = toScore(testA.score) ?? 0;
  const scoreB = toScore(testB.score) ?? 0;
  const diff = scoreB - scoreA;
  const diffPct = scoreA !== 0 ? ((diff / scoreA) * 100).toFixed(1) : '-';
  const improved = diff > 0;
  const unchanged = diff === 0;

  const sameUrl = normalizeUrl(testA.url) === normalizeUrl(testB.url);
  const sameType = testA.type === testB.type;
  const compareTag =
    sameUrl && sameType
      ? '同 URL · 同类型'
      : sameUrl
        ? '同 URL · 不同类型'
        : sameType
          ? '不同 URL · 同类型'
          : '不同 URL · 不同类型';

  const barData = {
    labels: ['得分'],
    datasets: [
      {
        label: `A · ${shortId(testA.id)}`,
        data: [scoreA],
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      {
        label: `B · ${shortId(testB.id)}`,
        data: [scoreB],
        backgroundColor: improved
          ? 'rgba(34, 197, 94, 0.7)'
          : unchanged
            ? 'rgba(156, 163, 175, 0.7)'
            : 'rgba(239, 68, 68, 0.7)',
        borderColor: improved
          ? 'rgb(34, 197, 94)'
          : unchanged
            ? 'rgb(156, 163, 175)'
            : 'rgb(239, 68, 68)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <Card>
      <CardHeader className='py-3 px-4 border-b'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-sm font-medium'>对比结果</CardTitle>
          <Badge variant='outline' className='text-[10px]'>
            {compareTag}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className='p-4 space-y-4'>
        {/* 分数对比 */}
        <div className='grid grid-cols-3 gap-3'>
          <div className='text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30'>
            <div className='text-[10px] text-muted-foreground mb-1'>记录 A</div>
            <div className='text-2xl font-bold text-blue-600 tabular-nums'>{scoreA}</div>
            <div className='text-[10px] text-muted-foreground mt-1'>
              {formatTime(testA.createdAt)}
            </div>
          </div>
          <div className='text-center p-3 rounded-lg bg-muted/50 flex flex-col items-center justify-center'>
            <div className='text-[10px] text-muted-foreground mb-1'>差值</div>
            <div
              className={cn(
                'text-2xl font-bold tabular-nums',
                improved ? 'text-green-600' : unchanged ? 'text-gray-500' : 'text-red-600'
              )}
            >
              {diff > 0 ? '+' : ''}
              {diff}
            </div>
            <div className='text-[10px] text-muted-foreground mt-1'>
              {diffPct !== '-' ? `${diff > 0 ? '+' : ''}${diffPct}%` : '-'}
            </div>
          </div>
          <div
            className={cn(
              'text-center p-3 rounded-lg',
              improved
                ? 'bg-green-50 dark:bg-green-950/30'
                : unchanged
                  ? 'bg-gray-50 dark:bg-gray-950/30'
                  : 'bg-red-50 dark:bg-red-950/30'
            )}
          >
            <div className='text-[10px] text-muted-foreground mb-1'>记录 B</div>
            <div
              className={cn(
                'text-2xl font-bold tabular-nums',
                improved ? 'text-green-600' : unchanged ? 'text-gray-500' : 'text-red-600'
              )}
            >
              {scoreB}
            </div>
            <div className='text-[10px] text-muted-foreground mt-1'>
              {formatTime(testB.createdAt)}
            </div>
          </div>
        </div>

        {/* 结论 */}
        <div
          className={cn(
            'rounded-lg p-3 text-sm font-medium text-center',
            improved
              ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
              : unchanged
                ? 'bg-gray-50 dark:bg-gray-950/30 text-gray-600 dark:text-gray-400'
                : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
          )}
        >
          {improved
            ? `得分提升 ${Math.abs(diff)} 分（${diffPct}%）`
            : unchanged
              ? '得分持平'
              : `得分下降 ${Math.abs(diff)} 分（${diffPct}%）`}
        </div>

        {/* 柱状图 */}
        <div style={{ height: 120 }}>
          <Bar
            data={barData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: 'y',
              plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } },
              },
              scales: { x: { min: 0, max: 100, ticks: { stepSize: 20 } }, y: { display: false } },
            }}
          />
        </div>

        {/* 详细信息 */}
        <div className='grid grid-cols-2 gap-3 text-xs'>
          <div className='space-y-1.5 p-2.5 rounded-lg border'>
            <div className='font-medium text-blue-600 flex items-center gap-1.5'>
              <span className='h-2 w-2 rounded-full bg-blue-500' /> 记录 A
            </div>
            <div className='text-muted-foreground'>ID: {shortId(testA.id)}</div>
            <div className='text-muted-foreground'>URL: {normalizeUrl(testA.url).slice(0, 30)}</div>
            <div className='text-muted-foreground'>
              类型: {TYPE_LABELS[testA.type] || testA.type}
            </div>
            <div className='text-muted-foreground'>时间: {formatTimeFull(testA.createdAt)}</div>
          </div>
          <div className='space-y-1.5 p-2.5 rounded-lg border'>
            <div
              className={cn(
                'font-medium flex items-center gap-1.5',
                improved ? 'text-green-600' : unchanged ? 'text-gray-500' : 'text-red-600'
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  improved ? 'bg-green-500' : unchanged ? 'bg-gray-400' : 'bg-red-500'
                )}
              />{' '}
              记录 B
            </div>
            <div className='text-muted-foreground'>ID: {shortId(testB.id)}</div>
            <div className='text-muted-foreground'>URL: {normalizeUrl(testB.url).slice(0, 30)}</div>
            <div className='text-muted-foreground'>
              类型: {TYPE_LABELS[testB.type] || testB.type}
            </div>
            <div className='text-muted-foreground'>时间: {formatTimeFull(testB.createdAt)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/* ---------- 主组件 ---------- */

const ComparisonPanel = () => {
  const { history } = useTestHistory();

  const [timeRange, setTimeRange] = useState('all');
  const [filterUrl, setFilterUrl] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selected, setSelected] = useState<[string, string | null]>(['', null]);

  // 已完成且有分数的记录，按时间降序
  const baseRecords = useMemo(() => {
    const rangeMs = getTimeRangeMs(timeRange);
    const cutoff = rangeMs ? Date.now() - rangeMs : 0;
    return history
      .filter(
        h =>
          h.status === 'completed' &&
          toScore(h.score) !== null &&
          (!rangeMs || (h.createdAt && new Date(h.createdAt).getTime() >= cutoff))
      )
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
  }, [history, timeRange]);

  // 可选的测试类型列表
  const typeOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of baseRecords) {
      map.set(item.type, (map.get(item.type) || 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, label: TYPE_LABELS[type] || type, count }));
  }, [baseRecords]);

  // 筛选后的记录
  const filteredRecords = useMemo(() => {
    return baseRecords.filter(h => {
      if (filterUrl && !normalizeUrl(h.url).includes(filterUrl.toLowerCase())) return false;
      if (filterType !== 'all' && h.type !== filterType) return false;
      return true;
    });
  }, [baseRecords, filterUrl, filterType]);

  // 选中的两条记录
  const selectedA = useMemo(
    () =>
      filteredRecords.find(r => r.id === selected[0]) ??
      baseRecords.find(r => r.id === selected[0]) ??
      null,
    [filteredRecords, baseRecords, selected]
  );
  const selectedB = useMemo(
    () =>
      selected[1]
        ? (filteredRecords.find(r => r.id === selected[1]) ??
          baseRecords.find(r => r.id === selected[1]) ??
          null)
        : null,
    [filteredRecords, baseRecords, selected]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      if (prev[0] === id) return [prev[1] ?? '', null];
      if (prev[1] === id) return [prev[0], null];
      if (!prev[0]) return [id, null];
      if (!prev[1]) return [prev[0], id];
      // 已选 2 条，替换第二条
      return [prev[0], id];
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(['', null]), []);

  const applyPreset = useCallback(
    (preset: SmartPreset) => {
      const result = preset.pick(filteredRecords);
      if (result) setSelected(result);
    },
    [filteredRecords]
  );

  return (
    <div className='space-y-3'>
      {/* ─── 筛选区 ─── */}
      <Card>
        <CardContent className='py-3 space-y-3'>
          <div className='flex items-center gap-2 flex-wrap'>
            <Input
              placeholder='搜索 URL...'
              value={filterUrl}
              onChange={e => setFilterUrl(e.target.value)}
              className='h-7 text-xs w-[200px]'
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className='w-[120px] h-7 text-xs'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部类型</SelectItem>
                {typeOptions.map(item => (
                  <SelectItem key={item.type} value={item.type}>
                    {item.label} ({item.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className='w-[100px] h-7 text-xs'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className='text-[10px] text-muted-foreground ml-auto'>
              {filteredRecords.length} 条记录
            </span>
          </div>

          {/* 智能推荐 */}
          {filteredRecords.length >= 2 && (
            <div className='flex items-center gap-1.5 flex-wrap'>
              <Sparkles className='h-3 w-3 text-amber-500' />
              <span className='text-[10px] text-muted-foreground'>快捷对比：</span>
              {SMART_PRESETS.map(preset => {
                const result = preset.pick(filteredRecords);
                if (!result) return null;
                return (
                  <button
                    key={preset.label}
                    type='button'
                    title={preset.desc}
                    onClick={() => applyPreset(preset)}
                    className='px-2 py-0.5 rounded text-[10px] font-medium border border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5 transition-all'
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* 已选标签 */}
          {(selectedA || selectedB) && (
            <div className='flex items-center gap-1.5 flex-wrap'>
              <span className='text-[10px] text-muted-foreground'>已选：</span>
              {selectedA && (
                <Badge
                  variant='outline'
                  className='text-[10px] h-5 gap-1 pr-0.5 cursor-pointer'
                  onClick={() => toggleSelect(selectedA.id)}
                >
                  A: {shortId(selectedA.id)} · {toScore(selectedA.score) ?? '-'}分
                  <X className='h-2.5 w-2.5' />
                </Badge>
              )}
              {selectedB && (
                <Badge
                  variant='outline'
                  className='text-[10px] h-5 gap-1 pr-0.5 cursor-pointer'
                  onClick={() => toggleSelect(selectedB.id)}
                >
                  B: {shortId(selectedB.id)} · {toScore(selectedB.score) ?? '-'}分
                  <X className='h-2.5 w-2.5' />
                </Badge>
              )}
              <Button
                variant='ghost'
                size='sm'
                className='h-5 text-[10px] px-1.5'
                onClick={clearSelection}
              >
                清除
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── 记录列表 ─── */}
      <Card>
        <CardContent className='p-0'>
          {filteredRecords.length === 0 ? (
            <div className='flex items-center justify-center py-12 text-sm text-muted-foreground'>
              当前筛选条件下无测试记录
            </div>
          ) : (
            <div className='max-h-[320px] overflow-auto'>
              <table className='w-full text-xs'>
                <thead className='sticky top-0 bg-muted/80 backdrop-blur-sm'>
                  <tr className='border-b'>
                    <th className='text-left font-medium px-3 py-2 w-8'></th>
                    <th className='text-left font-medium px-3 py-2'>URL</th>
                    <th className='text-left font-medium px-3 py-2 w-16'>类型</th>
                    <th className='text-right font-medium px-3 py-2 w-14'>得分</th>
                    <th className='text-right font-medium px-3 py-2 w-24'>时间</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(record => {
                    const isA = selected[0] === record.id;
                    const isB = selected[1] === record.id;
                    const isSelected = isA || isB;
                    return (
                      <tr
                        key={record.id}
                        className={cn(
                          'border-b last:border-b-0 cursor-pointer transition-colors',
                          isA && 'bg-blue-50 dark:bg-blue-950/20',
                          isB && 'bg-green-50 dark:bg-green-950/20',
                          !isSelected && 'hover:bg-muted/50'
                        )}
                        onClick={() => toggleSelect(record.id)}
                      >
                        <td className='px-3 py-2'>
                          {isA && <Badge className='h-4 px-1 text-[9px] bg-blue-500'>A</Badge>}
                          {isB && <Badge className='h-4 px-1 text-[9px] bg-green-500'>B</Badge>}
                        </td>
                        <td className='px-3 py-2'>
                          <span className='truncate max-w-[200px] block' title={record.url}>
                            {normalizeUrl(record.url)}
                          </span>
                        </td>
                        <td className='px-3 py-2'>
                          <Badge variant='secondary' className='text-[9px] h-4 px-1.5'>
                            {TYPE_LABELS[record.type] || record.type}
                          </Badge>
                        </td>
                        <td className='px-3 py-2 text-right font-mono font-medium tabular-nums'>
                          {toScore(record.score) ?? '-'}
                        </td>
                        <td className='px-3 py-2 text-right text-muted-foreground tabular-nums'>
                          {formatTime(record.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── 对比结果 ─── */}
      {selectedA && selectedB ? (
        <CompareResult testA={selectedA} testB={selectedB} />
      ) : (
        <Card className='flex items-center justify-center'>
          <CardContent className='text-center text-muted-foreground py-10'>
            <ArrowDownUp className='h-8 w-8 mx-auto mb-3 opacity-30' />
            <p className='text-sm'>在列表中点击选择 2 条记录进行对比</p>
            <p className='text-xs mt-1 text-muted-foreground/70'>
              支持任意组合：同 URL 不同时间、不同 URL 同类型、不同类型等
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComparisonPanel;
