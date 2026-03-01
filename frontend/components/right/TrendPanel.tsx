import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Statistic } from '@/components/ui/statistic';
import { cn } from '@/lib/utils';

import { useTestConfig, useTestHistory } from '../../context/TestContext';
import { getPerformanceTrend, type PerformanceTrendPoint } from '../../services/testApi';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  annotationPlugin
);

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

/** 计算连续上升/下降/持平的趋势方向和次数 */
const computeStreak = (scores: (number | null)[]) => {
  const valid = scores.filter((s): s is number => s !== null);
  if (valid.length < 2) return { direction: 'stable' as const, count: 0 };
  let dir: 'up' | 'down' | 'stable' = 'stable';
  let count = 0;
  for (let i = valid.length - 1; i > 0; i--) {
    const d = valid[i] - valid[i - 1];
    const curDir = d > 0 ? 'up' : d < 0 ? 'down' : 'stable';
    if (i === valid.length - 1) {
      dir = curDir;
      count = 1;
    } else if (curDir === dir && curDir !== 'stable') {
      count++;
    } else {
      break;
    }
  }
  return { direction: dir, count };
};

/* ---------- 组件 ---------- */

const TrendPanel = () => {
  const { t } = useTranslation();
  const { url, selectedType } = useTestConfig();
  const { history } = useTestHistory();

  const trendData = useMemo(() => {
    if (!url || !history.length) return [];
    const target = normalizeUrl(url);
    return history
      .filter(
        item =>
          item.type === selectedType &&
          item.status === 'completed' &&
          normalizeUrl(item.url) === target
      )
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ta - tb;
      })
      .slice(-20);
  }, [history, url, selectedType]);

  /* ---------- 统计指标 ---------- */

  const scores = useMemo(() => trendData.map(item => toScore(item.score)), [trendData]);
  const validScores = useMemo(() => scores.filter((s): s is number => s !== null), [scores]);

  const stats = useMemo(() => {
    if (validScores.length === 0)
      return {
        max: null,
        min: null,
        avg: null,
        volatility: null,
        streak: { direction: 'stable' as const, count: 0 },
      };
    const max = Math.max(...validScores);
    const min = Math.min(...validScores);
    const avg = Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10;
    const variance = validScores.reduce((sum, s) => sum + (s - avg) ** 2, 0) / validScores.length;
    const volatility = Math.round(Math.sqrt(variance) * 10) / 10;
    const streak = computeStreak(scores);
    return { max, min, avg, volatility, streak };
  }, [validScores, scores]);

  const latest = scores.length > 0 ? scores[scores.length - 1] : null;
  const prev = scores.length >= 2 ? scores[scores.length - 2] : null;
  const diff = latest != null && prev != null ? latest - prev : null;

  /* ---------- Web Vitals 趋势数据 ---------- */

  const [vitalsTrend, setVitalsTrend] = useState<PerformanceTrendPoint[]>([]);
  const [_vitalsLoading, setVitalsLoading] = useState(false);

  useEffect(() => {
    if (
      !url ||
      (selectedType !== 'performance' && selectedType !== 'website' && selectedType !== 'ux')
    ) {
      setVitalsTrend([]);
      return;
    }
    let ignore = false;
    setVitalsLoading(true);
    getPerformanceTrend(url, { limit: 20 })
      .then(res => {
        if (!ignore && res.dataPoints?.length > 1) setVitalsTrend(res.dataPoints);
      })
      .catch(() => {
        /* 静默失败 */
      })
      .finally(() => {
        if (!ignore) setVitalsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [url, selectedType]);

  const vitalsChartData = useMemo(() => {
    if (vitalsTrend.length < 2) return null;
    const vLabels = vitalsTrend.map(p => formatTime(p.createdAt));
    const hasLcp = vitalsTrend.some(p => p.lcp != null);
    const hasFcp = vitalsTrend.some(p => p.fcp != null);
    const hasInp = vitalsTrend.some(p => p.inp != null);
    const hasTtfb = vitalsTrend.some(p => p.ttfb != null);
    if (!hasLcp && !hasFcp && !hasInp && !hasTtfb) return null;
    const ds = [
      hasLcp && {
        label: 'LCP (ms)',
        data: vitalsTrend.map(p => p.lcp),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        tension: 0.3,
        pointRadius: 3,
        fill: false,
      },
      hasFcp && {
        label: 'FCP (ms)',
        data: vitalsTrend.map(p => p.fcp),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        tension: 0.3,
        pointRadius: 3,
        fill: false,
      },
      hasInp && {
        label: 'INP (ms)',
        data: vitalsTrend.map(p => p.inp),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.08)',
        tension: 0.3,
        pointRadius: 3,
        fill: false,
      },
      hasTtfb && {
        label: 'TTFB (ms)',
        data: vitalsTrend.map(p => p.ttfb),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.08)',
        tension: 0.3,
        pointRadius: 3,
        fill: false,
      },
    ].filter(Boolean);
    return { labels: vLabels, datasets: ds };
  }, [vitalsTrend]);

  const clsChartData = useMemo(() => {
    if (vitalsTrend.length < 2) return null;
    const hasCls = vitalsTrend.some(p => p.cls != null);
    if (!hasCls) return null;
    return {
      labels: vitalsTrend.map(p => formatTime(p.createdAt)),
      datasets: [
        {
          label: 'CLS',
          data: vitalsTrend.map(p => p.cls),
          borderColor: 'rgb(249, 115, 22)',
          backgroundColor: 'rgba(249, 115, 22, 0.08)',
          tension: 0.3,
          pointRadius: 3,
          fill: true,
        },
      ],
    };
  }, [vitalsTrend]);

  /* ---------- 空态 ---------- */

  if (trendData.length < 2) {
    return (
      <Card className='h-full flex items-center justify-center'>
        <CardContent className='text-center text-muted-foreground py-12'>
          <p className='text-sm'>
            {t('dashboard.trendEmpty', '至少需要 2 次同 URL 测试才能显示趋势')}
          </p>
        </CardContent>
      </Card>
    );
  }

  /* ---------- 图表数据 ---------- */

  const labels = trendData.map(item => formatTime(item.createdAt));

  const durations = trendData.map(item => {
    const d = item.duration;
    if (d === undefined || d === null) return null;
    return typeof d === 'number' ? d : Number(d);
  });
  const validDurations = durations.filter((d): d is number => d !== null && Number.isFinite(d));
  const durationStats =
    validDurations.length > 0
      ? {
          avg: Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length),
          min: Math.min(...validDurations),
          max: Math.max(...validDurations),
        }
      : null;

  const chartData = {
    labels,
    datasets: [
      {
        label: t('dashboard.trendScore', '分数'),
        data: scores,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y',
        pointBackgroundColor: scores.map((s, i) => {
          if (s === null || i === 0) return 'rgb(59, 130, 246)';
          const p = scores[i - 1];
          if (p === null) return 'rgb(59, 130, 246)';
          if (s > p) return 'rgb(34, 197, 94)';
          if (s < p) return 'rgb(239, 68, 68)';
          return 'rgb(59, 130, 246)';
        }),
      },
      ...(validDurations.length > 0
        ? [
            {
              label: t('dashboard.trendDuration', '耗时(ms)'),
              data: durations,
              borderColor: 'rgb(168, 85, 247)',
              backgroundColor: 'rgba(168, 85, 247, 0.08)',
              fill: false,
              tension: 0.3,
              pointRadius: 3,
              pointHoverRadius: 5,
              borderDash: [4, 4],
              yAxisID: 'y1',
              pointBackgroundColor: 'rgb(168, 85, 247)',
            },
          ]
        : []),
    ],
  };

  const hasDuration = validDurations.length > 0;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: hasDuration,
        position: 'top' as const,
        labels: { boxWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          title: (items: { dataIndex: number }[]) => {
            const idx = items[0]?.dataIndex;
            if (idx == null) return '';
            return labels[idx] || '';
          },
          afterLabel: (item: { dataIndex: number; dataset: { yAxisID?: string } }) => {
            const idx = item.dataIndex;
            if (item.dataset.yAxisID === 'y1') {
              const d = durations[idx];
              return d != null ? `${d}ms` : '';
            }
            if (idx === 0) return '';
            const cur = scores[idx];
            const pre = scores[idx - 1];
            if (cur == null || pre == null) return '';
            const d = cur - pre;
            return d === 0 ? '持平' : d > 0 ? `↑ +${d}` : `↓ ${d}`;
          },
        },
      },
      annotation: {
        annotations:
          stats.avg != null
            ? {
                avgLine: {
                  type: 'line' as const,
                  yMin: stats.avg,
                  yMax: stats.avg,
                  yScaleID: 'y',
                  borderColor: 'rgba(249, 115, 22, 0.5)',
                  borderWidth: 1,
                  borderDash: [6, 4],
                  label: {
                    display: true,
                    content: `平均 ${stats.avg}`,
                    position: 'start' as const,
                    backgroundColor: 'rgba(249, 115, 22, 0.8)',
                    font: { size: 10 },
                  },
                },
              }
            : {},
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        min: 0,
        max: 100,
        ticks: { stepSize: 20 },
        grid: { color: 'rgba(0,0,0,0.06)' },
        title: { display: true, text: t('dashboard.trendScore', '分数'), font: { size: 11 } },
      },
      ...(hasDuration
        ? {
            y1: {
              type: 'linear' as const,
              position: 'right' as const,
              min: 0,
              grid: { drawOnChartArea: false },
              title: { display: true, text: 'ms', font: { size: 11 } },
            },
          }
        : {}),
      x: {
        grid: { display: false },
        ticks: { maxRotation: 45, font: { size: 10 } },
      },
    },
  };

  /* ---------- 趋势方向 ---------- */

  const streakLabel =
    stats.streak.direction === 'up'
      ? `连续上升 ${stats.streak.count} 次`
      : stats.streak.direction === 'down'
        ? `连续下降 ${stats.streak.count} 次`
        : '持平';
  const streakColor =
    stats.streak.direction === 'up'
      ? 'text-green-600 bg-green-50'
      : stats.streak.direction === 'down'
        ? 'text-red-600 bg-red-50'
        : 'text-muted-foreground bg-muted';

  /* ---------- 渲染 ---------- */

  return (
    <div className='space-y-4'>
      {/* 统计摘要 */}
      <div className='grid grid-cols-2 md:grid-cols-5 gap-3'>
        <Statistic
          title='最新分数'
          value={latest ?? '-'}
          suffix={
            diff != null && diff !== 0 ? (
              <span className={cn('text-xs ml-1', diff > 0 ? 'text-green-600' : 'text-red-600')}>
                {diff > 0 ? `+${diff}` : diff}
              </span>
            ) : undefined
          }
        />
        <Statistic title='最高分' value={stats.max ?? '-'} />
        <Statistic title='最低分' value={stats.min ?? '-'} />
        <Statistic title='平均分' value={stats.avg ?? '-'} />
        <Statistic
          title='波动率'
          value={stats.volatility ?? '-'}
          suffix={<span className='text-xs text-muted-foreground ml-1'>σ</span>}
        />
      </div>

      {/* 耗时统计 */}
      {durationStats && (
        <div className='grid grid-cols-3 gap-3'>
          <Statistic
            title={t('dashboard.avgDuration', '平均耗时')}
            value={`${durationStats.avg}ms`}
          />
          <Statistic title={t('dashboard.minDuration', '最快')} value={`${durationStats.min}ms`} />
          <Statistic title={t('dashboard.maxDuration', '最慢')} value={`${durationStats.max}ms`} />
        </div>
      )}

      {/* 趋势方向 + 测试次数 */}
      <div className='flex items-center gap-3'>
        <Badge variant='secondary' className={cn('text-xs', streakColor)}>
          {streakLabel}
        </Badge>
        <span className='text-xs text-muted-foreground'>共 {trendData.length} 次测试</span>
      </div>

      {/* 分数趋势折线图 */}
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium'>
            {t('dashboard.trendTitle', '分数趋势')}
          </CardTitle>
        </CardHeader>
        <CardContent className='pb-4'>
          <div style={{ height: 220 }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Web Vitals 趋势折线图 */}
      {vitalsChartData && (
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>Core Web Vitals 趋势</CardTitle>
          </CardHeader>
          <CardContent className='pb-4'>
            <div style={{ height: 240 }}>
              <Line
                data={vitalsChartData as Parameters<typeof Line>[0]['data']}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index' as const, intersect: false },
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: { boxWidth: 12, font: { size: 11 } },
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx: {
                          dataset: { label?: string };
                          parsed: { y: number | null };
                        }) =>
                          `${ctx.dataset.label}: ${ctx.parsed.y != null ? Math.round(ctx.parsed.y) : '-'}`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: 'ms', font: { size: 11 } },
                    },
                    x: { grid: { display: false }, ticks: { maxRotation: 45, font: { size: 10 } } },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* CLS 趋势（独立 Y 轴） */}
      {clsChartData && (
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>CLS 趋势</CardTitle>
          </CardHeader>
          <CardContent className='pb-4'>
            <div style={{ height: 160 }}>
              <Line
                data={clsChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx: { parsed: { y: number | null } }) =>
                          `CLS: ${ctx.parsed.y != null ? ctx.parsed.y.toFixed(3) : '-'}`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: 'CLS', font: { size: 11 } },
                    },
                    x: { grid: { display: false }, ticks: { maxRotation: 45, font: { size: 10 } } },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 每次变化明细 */}
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium'>变化明细</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='max-h-[200px] overflow-y-auto'>
            {[...trendData].reverse().map((item, idx) => {
              const realIdx = trendData.length - 1 - idx;
              const cur = toScore(item.score);
              const pre = realIdx > 0 ? toScore(trendData[realIdx - 1].score) : null;
              const d = cur != null && pre != null ? cur - pre : null;
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center justify-between px-4 py-2 text-sm',
                    idx !== 0 && 'border-t'
                  )}
                >
                  <span className='text-muted-foreground text-xs'>
                    {formatTime(item.createdAt)}
                  </span>
                  <div className='flex items-center gap-2'>
                    <span className='font-mono font-medium'>{cur ?? '-'}</span>
                    {d != null && d !== 0 && (
                      <span
                        className={cn(
                          'text-xs font-medium',
                          d > 0 ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {d > 0 ? `+${d}` : d}
                      </span>
                    )}
                    {d === 0 && <span className='text-xs text-muted-foreground'>—</span>}
                    {d === null && realIdx === 0 && (
                      <span className='text-xs text-muted-foreground'>基准</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrendPanel;
