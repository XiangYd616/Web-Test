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
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import {
  getPerformanceTrend,
  type PerformanceTrendPoint,
} from '../../services/testApi';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface PerformanceTrendChartProps {
  url: string;
  workspaceId?: string;
  currentTestId?: string;
}

const formatTime = (iso?: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const VITAL_COLORS = {
  lcp: { border: 'rgb(239, 68, 68)', bg: 'rgba(239, 68, 68, 0.08)' },
  fcp: { border: 'rgb(59, 130, 246)', bg: 'rgba(59, 130, 246, 0.08)' },
  ttfb: { border: 'rgb(34, 197, 94)', bg: 'rgba(34, 197, 94, 0.08)' },
  inp: { border: 'rgb(168, 85, 247)', bg: 'rgba(168, 85, 247, 0.08)' },
  cls: { border: 'rgb(249, 115, 22)', bg: 'rgba(249, 115, 22, 0.08)' },
  score: { border: 'rgb(14, 165, 233)', bg: 'rgba(14, 165, 233, 0.08)' },
};

const TrendIcon = ({ direction }: { direction: string }) => {
  if (direction === 'increasing') return <TrendingUp className='h-3 w-3' />;
  if (direction === 'decreasing') return <TrendingDown className='h-3 w-3' />;
  return <Minus className='h-3 w-3' />;
};

const trendLabel = (direction: string, metric: string) => {
  const lowerBetter = ['lcp', 'fcp', 'ttfb', 'inp', 'cls'].includes(metric);
  if (direction === 'stable') return { text: '稳定', color: 'text-muted-foreground bg-muted' };
  if (direction === 'increasing') {
    return lowerBetter
      ? { text: '上升(恶化)', color: 'text-red-600 bg-red-50' }
      : { text: '上升(改善)', color: 'text-green-600 bg-green-50' };
  }
  return lowerBetter
    ? { text: '下降(改善)', color: 'text-green-600 bg-green-50' }
    : { text: '下降(恶化)', color: 'text-red-600 bg-red-50' };
};

const PerformanceTrendChart = ({ url, workspaceId, currentTestId }: PerformanceTrendChartProps) => {
  const [dataPoints, setDataPoints] = useState<PerformanceTrendPoint[]>([]);
  const [trend, setTrend] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) return;
    let ignore = false;
    setLoading(true);
    getPerformanceTrend(url, { workspaceId, limit: 30 })
      .then(res => {
        if (ignore) return;
        setDataPoints(res.dataPoints || []);
        setTrend(res.trend || null);
      })
      .catch(() => {
        if (ignore) return;
        setDataPoints([]);
        setTrend(null);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => { ignore = true; };
  }, [url, workspaceId]);

  const labels = useMemo(() => dataPoints.map(dp => formatTime(dp.createdAt)), [dataPoints]);

  const msChartData = useMemo(() => {
    if (dataPoints.length < 2) return null;
    return {
      labels,
      datasets: [
        {
          label: 'LCP',
          data: dataPoints.map(dp => dp.lcp),
          borderColor: VITAL_COLORS.lcp.border,
          backgroundColor: VITAL_COLORS.lcp.bg,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: 'FCP',
          data: dataPoints.map(dp => dp.fcp),
          borderColor: VITAL_COLORS.fcp.border,
          backgroundColor: VITAL_COLORS.fcp.bg,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: 'TTFB',
          data: dataPoints.map(dp => dp.ttfb),
          borderColor: VITAL_COLORS.ttfb.border,
          backgroundColor: VITAL_COLORS.ttfb.bg,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: 'INP',
          data: dataPoints.map(dp => dp.inp),
          borderColor: VITAL_COLORS.inp.border,
          backgroundColor: VITAL_COLORS.inp.bg,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [dataPoints, labels]);

  const scoreChartData = useMemo(() => {
    if (dataPoints.length < 2) return null;
    const scores = dataPoints.map(dp => dp.score);
    return {
      labels,
      datasets: [
        {
          label: '评分',
          data: scores,
          borderColor: VITAL_COLORS.score.border,
          backgroundColor: VITAL_COLORS.score.bg,
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: scores.map((s, i) => {
            if (s === null || i === 0) return VITAL_COLORS.score.border;
            const p = scores[i - 1];
            if (p === null) return VITAL_COLORS.score.border;
            if (s > p) return 'rgb(34, 197, 94)';
            if (s < p) return 'rgb(239, 68, 68)';
            return VITAL_COLORS.score.border;
          }),
        },
      ],
    };
  }, [dataPoints, labels]);

  const msChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: {
      y: { title: { display: true, text: 'ms' }, grid: { color: 'rgba(0,0,0,0.06)' } },
      x: { grid: { display: false }, ticks: { maxRotation: 45, font: { size: 10 } } },
    },
  };

  const scoreChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 100, ticks: { stepSize: 20 }, grid: { color: 'rgba(0,0,0,0.06)' } },
      x: { grid: { display: false }, ticks: { maxRotation: 45, font: { size: 10 } } },
    },
  };

  if (loading) {
    return (
      <Card>
        <CardContent className='flex items-center justify-center py-12 text-muted-foreground text-sm'>
          加载趋势数据...
        </CardContent>
      </Card>
    );
  }

  if (dataPoints.length < 2) {
    return (
      <Card>
        <CardContent className='flex items-center justify-center py-8 text-muted-foreground text-sm'>
          至少需要 2 次同 URL 的性能测试才能显示趋势
        </CardContent>
      </Card>
    );
  }

  const currentIdx = currentTestId ? dataPoints.findIndex(dp => dp.testId === currentTestId) : -1;
  const currentPoint = currentIdx >= 0 ? dataPoints[currentIdx] : dataPoints[dataPoints.length - 1];

  return (
    <div className='space-y-4'>
      {/* 趋势方向标签 */}
      {trend && (
        <div className='flex flex-wrap gap-2'>
          {(['score', 'lcp', 'fcp', 'ttfb', 'inp', 'cls'] as const).map(key => {
            const dir = trend[key];
            if (!dir) return null;
            const info = trendLabel(dir, key);
            return (
              <Badge key={key} variant='outline' className={cn('text-xs gap-1', info.color)}>
                <TrendIcon direction={dir} />
                {key.toUpperCase()}: {info.text}
              </Badge>
            );
          })}
          <span className='text-xs text-muted-foreground self-center'>
            共 {dataPoints.length} 次测试
          </span>
        </div>
      )}

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* 评分趋势 */}
        {scoreChartData && (
          <Card>
            <CardHeader className='py-2 px-4 border-b'>
              <CardTitle className='text-sm font-medium'>
                评分趋势
                {currentPoint?.score != null && (
                  <span className='text-xs text-muted-foreground font-normal ml-2'>
                    当前: {currentPoint.score}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className='p-3'>
              <div className='h-[200px]'>
                <Line data={scoreChartData} options={scoreChartOptions} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Web Vitals 趋势 */}
        {msChartData && (
          <Card>
            <CardHeader className='py-2 px-4 border-b'>
              <CardTitle className='text-sm font-medium'>
                Core Web Vitals 趋势
                <span className='text-xs text-muted-foreground font-normal ml-2'>
                  LCP / FCP / TTFB / INP
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className='p-3'>
              <div className='h-[200px]'>
                <Line data={msChartData} options={msChartOptions} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PerformanceTrendChart;
