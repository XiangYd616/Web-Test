import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { useMemo } from 'react';
import { Bar, Doughnut, Radar } from 'react-chartjs-2';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Statistic } from '@/components/ui/statistic';
import { cn } from '@/lib/utils';

import { useTestResult } from '../../context/TestContext';
import { ratingColor } from '../../utils/colors';
import { parseResultPayloadText } from '../../utils/testResult';

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

type RecommendationItem = {
  type?: string;
  priority?: 'high' | 'medium' | 'low' | string;
  title?: string;
  description?: string;
  impact?: string;
  suggestions?: unknown;
};

type WebVitalItem = {
  value?: unknown;
  rating?: unknown;
  estimated?: boolean;
};

type HttpInfoData = {
  statusCode?: number;
  httpVersion?: string;
  redirectCount?: number;
  compression?: string;
  cacheControl?: string;
  server?: string;
  contentType?: string;
};

type MetricTiming = { average?: string; min?: string; max?: string; rating?: string };

type ContentAnalysisData = {
  title?: { content?: string; length?: number; hasTitle?: boolean };
  meta?: { description?: string; descriptionLength?: number; hasDescription?: boolean };
  h1?: { content?: string; hasH1?: boolean };
  resourceHints?: {
    preconnect?: number;
    prefetch?: number;
    preload?: number;
    dns_prefetch?: number;
  };
  error?: string;
};

const parseMs = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number(v.replace(/ms$/i, '').trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const PerformanceChartPanel = () => {
  const { resultPayloadText } = useTestResult();

  const parsedPayload = useMemo(
    () => parseResultPayloadText(resultPayloadText),
    [resultPayloadText]
  );

  const normalizedDetails = useMemo<Record<string, unknown> | null>(() => {
    // 主路径：buildNormalizedDetails 输出 { summary, metrics, warnings, errors, details: { webVitals, metrics, resources, ... } }
    const detailsObj = parsedPayload?.details;
    if (!detailsObj || typeof detailsObj !== 'object' || Array.isArray(detailsObj)) return null;
    const inner = (detailsObj as Record<string, unknown>).details;
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      const rec = inner as Record<string, unknown>;
      if (rec.webVitals || rec.metrics || rec.resources) return rec;
    }
    // 兼容旧路径：details.results.performance.details
    const results = (detailsObj as Record<string, unknown>).results;
    if (!results || typeof results !== 'object' || Array.isArray(results)) return null;
    const engineResult = (results as Record<string, unknown>).performance;
    if (!engineResult || typeof engineResult !== 'object' || Array.isArray(engineResult))
      return null;
    const details = (engineResult as { details?: unknown }).details;
    return details && typeof details === 'object' && !Array.isArray(details)
      ? (details as Record<string, unknown>)
      : null;
  }, [parsedPayload]);

  // fallback: 当 performance_test_results 表查询失败时，从 summary 中读取嵌入的数据
  const summaryFallback = useMemo<Record<string, unknown> | null>(() => {
    if (normalizedDetails) return null; // 主路径有数据时不需要 fallback
    const summary = parsedPayload?.summary;
    if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return null;
    const s = summary as Record<string, unknown>;
    // summary 中嵌入了 webVitals / performanceMetrics / recommendations / httpInfo / contentAnalysis
    if (!s.webVitals && !s.performanceMetrics) return null;
    return {
      webVitals: s.webVitals,
      metrics: s.performanceMetrics,
      recommendations: s.recommendations,
      httpInfo: s.httpInfo,
      contentAnalysis: s.contentAnalysis,
      resources: s.resources,
    };
  }, [normalizedDetails, parsedPayload]);

  const performanceDetails = normalizedDetails || summaryFallback;

  type InpInteractionEvent = {
    name: string;
    duration: number;
    startTime: number;
    interactionId: number;
    inputDelay: number;
    processingTime: number;
    presentationDelay: number;
  };
  type InpLongTask = {
    duration: number;
    startTime: number;
    blockingTime: number;
    name: string;
  };
  type InpDiagnosticsData = {
    interactionEvents: InpInteractionEvent[];
    longTasks: InpLongTask[];
    totalInteractions: number;
    totalLongTasks: number;
  };

  const inpDiagnostics = useMemo<InpDiagnosticsData | null>(() => {
    const raw = (performanceDetails as { inpDiagnostics?: unknown } | null)?.inpDiagnostics;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const d = raw as Record<string, unknown>;
    const events = Array.isArray(d.interactionEvents)
      ? (d.interactionEvents as InpInteractionEvent[])
      : [];
    const tasks = Array.isArray(d.longTasks) ? (d.longTasks as InpLongTask[]) : [];
    if (events.length === 0 && tasks.length === 0) return null;
    return {
      interactionEvents: events,
      longTasks: tasks,
      totalInteractions:
        typeof d.totalInteractions === 'number' ? d.totalInteractions : events.length,
      totalLongTasks: typeof d.totalLongTasks === 'number' ? d.totalLongTasks : tasks.length,
    };
  }, [performanceDetails]);

  const toNumber = (value: unknown) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const webVitals = useMemo(() => {
    const raw = (performanceDetails as { webVitals?: unknown } | null)?.webVitals;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const lcp = record.lcp as WebVitalItem | undefined;
    const fcp = record.fcp as WebVitalItem | undefined;
    const cls = record.cls as WebVitalItem | undefined;
    const inp = record.inp as WebVitalItem | undefined;
    const ttfb = record.ttfb as WebVitalItem | undefined;
    const lcpValue = toNumber(lcp?.value);
    const fcpValue = toNumber(fcp?.value);
    const clsValue = toNumber(cls?.value);
    const inpValue = toNumber(inp?.value);
    const ttfbValue = toNumber(ttfb?.value);
    if (
      lcpValue === null &&
      fcpValue === null &&
      clsValue === null &&
      inpValue === null &&
      ttfbValue === null
    )
      return null;
    return {
      lcp: {
        value: lcpValue,
        rating: String(lcp?.rating ?? ''),
        estimated: lcp?.estimated !== false,
      },
      fcp: {
        value: fcpValue,
        rating: String(fcp?.rating ?? ''),
        estimated: fcp?.estimated !== false,
      },
      cls: {
        value: clsValue,
        rating: String(cls?.rating ?? ''),
        estimated: cls?.estimated !== false,
      },
      inp: {
        value: inpValue,
        rating: String(inp?.rating ?? ''),
        estimated: inp?.estimated !== false,
      },
      ttfb: {
        value: ttfbValue,
        rating: String(ttfb?.rating ?? ''),
        estimated: ttfb?.estimated !== false,
      },
    };
  }, [performanceDetails]);

  const metrics = useMemo(() => {
    const raw = (performanceDetails as { metrics?: unknown } | null)?.metrics;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    return raw as Record<string, MetricTiming>;
  }, [performanceDetails]);

  const httpInfo = useMemo(() => {
    const raw = (performanceDetails as { httpInfo?: unknown } | null)?.httpInfo;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    return raw as HttpInfoData;
  }, [performanceDetails]);

  const resourceCounts = useMemo(() => {
    const raw = (performanceDetails as { resources?: { counts?: unknown } } | null)?.resources
      ?.counts;
    if (!raw || typeof raw !== 'object') return null;
    return raw as Record<string, number>;
  }, [performanceDetails]);

  const networkResourceInfo = useMemo(() => {
    const res = (performanceDetails as { resources?: Record<string, unknown> } | null)?.resources;
    if (!res) return null;
    const items = res.networkItems as
      | Array<{
          url: string;
          type: string;
          size: number;
          duration: number;
          compressed?: boolean;
          encoding?: string;
          renderBlocking?: boolean;
        }>
      | undefined;
    const totalSize = res.totalTransferSize as number | undefined;
    if (!items || items.length === 0) return null;
    // 统计资源健康指标
    const textTypes = new Set(['scripts', 'stylesheets', 'documents', 'xhr']);
    const uncompressedItems = items.filter(
      i => textTypes.has(i.type) && i.size > 10 * 1024 && i.compressed === false
    );
    const renderBlockingItems = items.filter(
      i => i.renderBlocking && (i.type === 'scripts' || i.type === 'stylesheets')
    );
    return {
      items,
      totalTransferSize: totalSize ?? 0,
      uncompressedCount: uncompressedItems.length,
      uncompressedSize: uncompressedItems.reduce((s, i) => s + i.size, 0),
      renderBlockingCount: renderBlockingItems.length,
      renderBlockingSize: renderBlockingItems.reduce((s, i) => s + i.size, 0),
    };
  }, [performanceDetails]);

  const contentAnalysis = useMemo(() => {
    const raw = (performanceDetails as { contentAnalysis?: unknown } | null)?.contentAnalysis;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const data = raw as ContentAnalysisData;
    if (data.error && !data.title && !data.meta && !data.h1) return null;
    return data;
  }, [performanceDetails]);

  const iterationTimings = useMemo(() => {
    const iterations = toNumber(
      (performanceDetails as { iterations?: unknown } | null)?.iterations
    );
    if (!metrics || !iterations || iterations <= 1) return null;
    const stages = ['dns', 'connection', 'tls', 'ttfb', 'download'] as const;
    const points: Array<{ stage: string; avg: number; min: number; max: number }> = [];
    for (const key of stages) {
      const m = metrics[key];
      if (!m) continue;
      const avg = parseMs(m.average);
      const min = parseMs(m.min);
      const max = parseMs(m.max);
      if (avg !== null && min !== null && max !== null) {
        points.push({ stage: key.toUpperCase(), avg, min, max });
      }
    }
    return points.length > 0 ? points : null;
  }, [metrics, performanceDetails]);

  const recommendations = useMemo(() => {
    const raw = (performanceDetails as { recommendations?: unknown } | null)?.recommendations;
    if (!Array.isArray(raw)) return [] as RecommendationItem[];
    return raw
      .filter(item => item && typeof item === 'object' && !Array.isArray(item))
      .map(item => item as RecommendationItem);
  }, [performanceDetails]);

  const sortedRecommendations = useMemo(() => {
    const priorityRank = (p?: string) => {
      const r = (p || '').toLowerCase();
      return r === 'high' ? 0 : r === 'medium' ? 1 : r === 'low' ? 2 : 3;
    };
    return [...recommendations].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  }, [recommendations]);

  const computeVitalScore = (key: string, value: number | null): number | null => {
    if (value === null) return null;
    // 对数正态分布评分（与后端 Lighthouse 模型对齐）
    // p10 = 90 分阈值，median = 50 分阈值
    const PARAMS: Record<string, [number, number]> = {
      lcp: [2500, 4000],
      fcp: [1800, 3000],
      cls: [0.1, 0.25],
      inp: [200, 500],
      ttfb: [800, 1800],
    };
    const [p10, median] = PARAMS[key] || [800, 1800];
    if (value <= 0) return 100;
    if (p10 <= 0 || median <= 0 || p10 >= median) return value <= p10 ? 100 : 0;
    const logRatio = Math.log(median / p10);
    if (logRatio === 0) return 50;
    // erf 近似（Abramowitz & Stegun）
    const erf = (x: number) => {
      const sign = x >= 0 ? 1 : -1;
      const a = Math.abs(x);
      const t = 1 / (1 + 0.3275911 * a);
      const y =
        1 -
        ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
          0.254829592) *
          t *
          Math.exp(-a * a);
      return sign * y;
    };
    const pct = 0.5 * (1 - erf((Math.log(value / median) / logRatio) * (Math.SQRT2 / 2)));
    return Math.round(Math.max(0, Math.min(100, pct * 100)));
  };

  const vitalScoreSeries = useMemo(() => {
    if (!webVitals) return null;
    const labels = ['LCP', 'FCP', 'CLS', 'INP', 'TTFB'];
    const values = [
      computeVitalScore('lcp', webVitals.lcp.value),
      computeVitalScore('fcp', webVitals.fcp.value),
      computeVitalScore('cls', webVitals.cls.value),
      computeVitalScore('inp', webVitals.inp.value),
      computeVitalScore('ttfb', webVitals.ttfb.value),
    ];
    if (values.every(v => v === null)) return null;
    return { labels, values: values.map(v => v ?? 0) };
  }, [webVitals]);

  const vitalValueSeries = useMemo(() => {
    if (!webVitals) return null;
    // CLS 值为 0.xxx 级别，与 ms 级指标不在同一数量级，单独展示
    return {
      labels: ['LCP(ms)', 'FCP(ms)', 'INP(ms)', 'TTFB(ms)'],
      values: [
        webVitals.lcp.value ?? 0,
        webVitals.fcp.value ?? 0,
        webVitals.inp.value ?? 0,
        webVitals.ttfb.value ?? 0,
      ],
    };
  }, [webVitals]);

  const avgLoadTimeMs = useMemo(() => {
    const summary = parsedPayload?.summary;
    if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return null;
    const record = summary as Record<string, unknown>;
    return parseMs(record.averageLoadTime ?? record.average_load_time);
  }, [parsedPayload]);

  const waterfallData = useMemo(() => {
    if (!metrics) return null;
    const stages = [
      { label: 'DNS', key: 'dns', color: 'rgba(59, 130, 246, 0.75)' },
      { label: 'TCP', key: 'connection', color: 'rgba(249, 115, 22, 0.75)' },
      { label: 'TLS', key: 'tls', color: 'rgba(168, 85, 247, 0.75)' },
      { label: 'TTFB', key: 'ttfb', color: 'rgba(239, 68, 68, 0.75)' },
      { label: 'Download', key: 'download', color: 'rgba(34, 197, 94, 0.75)' },
    ];
    const labels: string[] = [];
    const values: number[] = [];
    const colors: string[] = [];
    for (const s of stages) {
      const m = metrics[s.key];
      const v = parseMs(m?.average);
      if (v !== null && v > 0) {
        labels.push(s.label);
        values.push(v);
        colors.push(s.color);
      }
    }
    return labels.length > 0 ? { labels, values, colors } : null;
  }, [metrics]);

  const hasAny = Boolean(webVitals || recommendations.length > 0 || httpInfo || waterfallData);

  const renderRecommendation = (item: RecommendationItem, index: number) => {
    const priority = String(item.priority || '').toLowerCase();
    const badgeVariant =
      priority === 'high' ? 'destructive' : priority === 'medium' ? 'default' : 'secondary';
    const title = String(item.title || item.type || '性能优化建议');
    const desc = String(item.description || '');
    const suggestions = Array.isArray(item.suggestions)
      ? (item.suggestions as unknown[]).map(v => String(v))
      : [];
    return (
      <div key={index} className={cn('p-3', index !== 0 && 'border-t')}>
        <div className='flex items-start gap-2'>
          <Badge
            variant={badgeVariant}
            className={cn(priority === 'medium' && 'bg-orange-500 hover:bg-orange-600')}
          >
            {priority || 'unknown'}
          </Badge>
          {item.impact && <Badge variant='outline'>{String(item.impact)}</Badge>}
          <span className='font-medium text-sm flex-1'>{title}</span>
        </div>
        {desc && <p className='mt-2 text-sm text-muted-foreground'>{desc}</p>}
        {suggestions.length > 0 && (
          <ul className='mt-2 space-y-1 list-disc pl-4 text-xs text-muted-foreground'>
            {suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className='space-y-6'>
      {!hasAny && (
        <div className='flex items-center justify-center py-16 text-sm text-muted-foreground'>
          运行性能测试后，图表数据将在此展示
        </div>
      )}
      {/* ═══════ 第一区：核心指标概览 ═══════ */}
      {(avgLoadTimeMs != null || webVitals) && (
        <div className='space-y-4'>
          <div className='flex items-center gap-2'>
            <div className='h-5 w-1 rounded-full bg-blue-500' />
            <h3 className='text-sm font-semibold text-foreground'>核心指标</h3>
          </div>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
            {avgLoadTimeMs != null && (
              <Statistic title='平均加载耗时' value={`${avgLoadTimeMs}ms`} />
            )}
            {webVitals?.ttfb.value != null && (
              <Statistic title='TTFB' value={`${webVitals.ttfb.value}ms`} />
            )}
            {webVitals?.fcp.value != null && (
              <Statistic title='FCP' value={`${webVitals.fcp.value}ms`} />
            )}
            {webVitals?.lcp.value != null && (
              <Statistic title='LCP' value={`${webVitals.lcp.value}ms`} />
            )}
          </div>
        </div>
      )}
      {/* ═══════ 可行动项（紧随核心指标，提升可见性） ═══════ */}
      {sortedRecommendations.length > 0 && (
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <div className='h-5 w-1 rounded-full bg-amber-500' />
            <h3 className='text-sm font-semibold text-foreground'>
              可行动项
              <Badge variant='secondary' className='ml-2 text-xs'>
                {sortedRecommendations.length}
              </Badge>
            </h3>
          </div>
          <Card className='border-amber-200/60 dark:border-amber-800/40'>
            <CardContent className='p-0'>
              {sortedRecommendations.map(renderRecommendation)}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════ 第二区：Web Vitals 详情 ═══════ */}
      {webVitals && (
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <div className='h-5 w-1 rounded-full bg-green-500' />
            <h3 className='text-sm font-semibold text-foreground'>
              Core Web Vitals
              {webVitals && webVitals.lcp.estimated && (
                <Badge
                  variant='outline'
                  className='ml-2 text-[10px] px-1.5 py-0 font-normal text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700'
                >
                  估算值
                </Badge>
              )}
              {webVitals && !webVitals.lcp.estimated && (
                <Badge
                  variant='outline'
                  className='ml-2 text-[10px] px-1.5 py-0 font-normal text-green-600 border-green-300 dark:text-green-400 dark:border-green-700'
                >
                  浏览器实测
                </Badge>
              )}
            </h3>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {vitalScoreSeries && (
              <Card>
                <CardHeader className='py-2 px-4 border-b'>
                  <CardTitle className='text-sm font-medium'>评分雷达图</CardTitle>
                </CardHeader>
                <CardContent className='p-3'>
                  <div className='h-[220px] flex justify-center'>
                    <Radar
                      data={{
                        labels: vitalScoreSeries.labels,
                        datasets: [
                          {
                            label: 'score',
                            data: vitalScoreSeries.values,
                            borderColor: 'rgba(59, 130, 246, 1)',
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { r: { min: 0, max: 100 } },
                      }}
                    />
                  </div>
                  <div className='flex flex-wrap gap-2 mt-3 justify-center'>
                    {(['lcp', 'fcp', 'cls', 'inp', 'ttfb'] as const).map(key => (
                      <Badge
                        key={key}
                        variant='secondary'
                        className={ratingColor(webVitals[key].rating)}
                      >
                        {key.toUpperCase()}: {webVitals[key].rating || '-'}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {vitalValueSeries && (
              <Card>
                <CardHeader className='py-2 px-4 border-b'>
                  <CardTitle className='text-sm font-medium'>
                    原始值
                    {webVitals && webVitals.lcp.estimated && (
                      <span className='text-xs text-muted-foreground font-normal ml-1'>
                        (仅 TTFB 为实测，其余为估算)
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className='p-3'>
                  <div className='h-[180px]'>
                    <Bar
                      data={{
                        labels: vitalValueSeries.labels,
                        datasets: [
                          {
                            label: 'ms',
                            data: vitalValueSeries.values,
                            backgroundColor: [
                              'rgba(34, 197, 94, 0.65)',
                              'rgba(59, 130, 246, 0.65)',
                              'rgba(239, 68, 68, 0.65)',
                              'rgba(249, 115, 22, 0.65)',
                            ],
                            borderRadius: 4,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: { title: { display: true, text: 'ms' } },
                        },
                      }}
                    />
                  </div>
                  {webVitals.cls.value != null && (
                    <div className='mt-3 flex items-center justify-between rounded-lg border p-2.5'>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-medium text-muted-foreground'>CLS</span>
                        <Badge variant='secondary' className={ratingColor(webVitals.cls.rating)}>
                          {webVitals.cls.rating || '-'}
                        </Badge>
                      </div>
                      <span className='text-lg font-semibold tabular-nums'>
                        {webVitals.cls.value.toFixed(3)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* INP 诊断详情 */}
      {inpDiagnostics && (
        <Card>
          <CardHeader className='py-2 px-4 border-b'>
            <CardTitle className='text-sm font-medium'>
              INP 诊断详情
              <span className='text-xs text-muted-foreground font-normal ml-2'>
                {inpDiagnostics.totalInteractions} 个交互 · {inpDiagnostics.totalLongTasks} 个长任务
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className='p-3 space-y-4'>
            {inpDiagnostics.interactionEvents.length > 0 && (
              <div>
                <div className='text-xs font-medium text-muted-foreground mb-2'>
                  交互事件耗时分解（按总耗时降序，前 10 项）
                </div>
                <div className='space-y-2'>
                  {inpDiagnostics.interactionEvents.map((evt, idx) => {
                    const total = evt.duration;
                    const inputPct = total > 0 ? (evt.inputDelay / total) * 100 : 0;
                    const procPct = total > 0 ? (evt.processingTime / total) * 100 : 0;
                    const presPct = total > 0 ? (evt.presentationDelay / total) * 100 : 0;
                    const isHigh = total > 200;
                    const isMedium = total > 100 && total <= 200;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          'rounded-lg border p-2.5',
                          isHigh &&
                            'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30',
                          isMedium &&
                            'border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/30'
                        )}
                      >
                        <div className='flex items-center justify-between mb-1.5'>
                          <div className='flex items-center gap-2'>
                            <Badge variant='outline' className='text-[10px] px-1.5 py-0 font-mono'>
                              {evt.name}
                            </Badge>
                            <span className='text-[10px] text-muted-foreground'>
                              @{evt.startTime}ms
                            </span>
                          </div>
                          <span
                            className={cn(
                              'text-sm font-semibold tabular-nums',
                              isHigh
                                ? 'text-red-600 dark:text-red-400'
                                : isMedium
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-foreground'
                            )}
                          >
                            {total}ms
                          </span>
                        </div>
                        <div className='flex h-2 rounded-full overflow-hidden bg-muted'>
                          <div
                            className='bg-blue-400'
                            style={{ width: `${inputPct}%` }}
                            title={`Input Delay: ${evt.inputDelay}ms`}
                          />
                          <div
                            className='bg-amber-400'
                            style={{ width: `${procPct}%` }}
                            title={`Processing: ${evt.processingTime}ms`}
                          />
                          <div
                            className='bg-green-400'
                            style={{ width: `${presPct}%` }}
                            title={`Presentation: ${evt.presentationDelay}ms`}
                          />
                        </div>
                        <div className='flex justify-between mt-1 text-[10px] text-muted-foreground'>
                          <span>输入延迟 {evt.inputDelay}ms</span>
                          <span>处理 {evt.processingTime}ms</span>
                          <span>渲染 {evt.presentationDelay}ms</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className='flex items-center gap-4 mt-2 text-[10px] text-muted-foreground'>
                  <span className='flex items-center gap-1'>
                    <span className='inline-block w-2.5 h-2.5 rounded-sm bg-blue-400' />
                    Input Delay
                  </span>
                  <span className='flex items-center gap-1'>
                    <span className='inline-block w-2.5 h-2.5 rounded-sm bg-amber-400' />
                    Processing
                  </span>
                  <span className='flex items-center gap-1'>
                    <span className='inline-block w-2.5 h-2.5 rounded-sm bg-green-400' />
                    Presentation
                  </span>
                </div>
              </div>
            )}
            {inpDiagnostics.longTasks.length > 0 && (
              <div>
                <div className='text-xs font-medium text-muted-foreground mb-2'>
                  长任务列表（&gt;50ms，按耗时降序）
                </div>
                <div className='space-y-1 max-h-[240px] overflow-y-auto'>
                  {inpDiagnostics.longTasks.map((task, idx) => {
                    const severity =
                      task.duration > 200 ? 'high' : task.duration > 100 ? 'medium' : 'low';
                    return (
                      <div
                        key={idx}
                        className='flex items-center gap-2 text-xs rounded border px-2.5 py-1.5'
                      >
                        <Badge
                          variant={
                            severity === 'high'
                              ? 'destructive'
                              : severity === 'medium'
                                ? 'default'
                                : 'secondary'
                          }
                          className={cn(
                            'text-[10px] px-1.5 py-0 shrink-0',
                            severity === 'medium' && 'bg-orange-500 hover:bg-orange-600'
                          )}
                        >
                          {task.duration}ms
                        </Badge>
                        <span className='text-muted-foreground shrink-0'>@{task.startTime}ms</span>
                        <div className='flex-1 bg-muted rounded-full h-1.5 overflow-hidden'>
                          <div
                            className={cn(
                              'h-full rounded-full',
                              severity === 'high'
                                ? 'bg-red-500'
                                : severity === 'medium'
                                  ? 'bg-orange-400'
                                  : 'bg-blue-400'
                            )}
                            style={{ width: `${Math.min(100, (task.duration / 500) * 100)}%` }}
                          />
                        </div>
                        <span className='font-mono text-muted-foreground shrink-0'>
                          阻塞 {task.blockingTime}ms
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════ 第三区：网络与诊断 ═══════ */}
      <div className='space-y-4'>
        <div className='flex items-center gap-2'>
          <div className='h-5 w-1 rounded-full bg-purple-500' />
          <h3 className='text-sm font-semibold text-foreground'>网络与诊断</h3>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {httpInfo && (
            <Card>
              <CardHeader className='py-2 px-4 border-b'>
                <CardTitle className='text-sm font-medium'>HTTP 信息</CardTitle>
              </CardHeader>
              <CardContent className='p-3'>
                <div className='grid grid-cols-2 gap-x-4 gap-y-2 text-sm'>
                  <div className='text-muted-foreground'>状态码</div>
                  <div className='font-mono'>{httpInfo.statusCode ?? '-'}</div>
                  <div className='text-muted-foreground'>协议</div>
                  <div className='font-mono'>{httpInfo.httpVersion ?? '-'}</div>
                  <div className='text-muted-foreground'>压缩</div>
                  <div className='font-mono'>
                    <Badge
                      variant='outline'
                      className={cn(
                        httpInfo.compression && httpInfo.compression !== 'none'
                          ? 'text-green-600 bg-green-50'
                          : 'text-orange-600 bg-orange-50'
                      )}
                    >
                      {httpInfo.compression || 'none'}
                    </Badge>
                  </div>
                  <div className='text-muted-foreground'>缓存</div>
                  <div className='font-mono text-xs break-all'>{httpInfo.cacheControl || '-'}</div>
                  <div className='text-muted-foreground'>服务器</div>
                  <div className='font-mono text-xs'>{httpInfo.server || '-'}</div>
                  <div className='text-muted-foreground'>重定向</div>
                  <div className='font-mono'>{httpInfo.redirectCount ?? 0} 次</div>
                </div>
              </CardContent>
            </Card>
          )}

          {waterfallData && (
            <Card>
              <CardHeader className='py-2 px-4 border-b'>
                <CardTitle className='text-sm font-medium'>请求时间线</CardTitle>
              </CardHeader>
              <CardContent className='p-3'>
                <div className='h-[180px]'>
                  <Bar
                    data={{
                      labels: waterfallData.labels,
                      datasets: [
                        {
                          label: 'ms',
                          data: waterfallData.values,
                          backgroundColor: waterfallData.colors,
                          borderRadius: 4,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      plugins: { legend: { display: false } },
                      scales: { x: { title: { display: true, text: 'ms' } } },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 资源分布 */}
        {resourceCounts && Object.keys(resourceCounts).length > 1 && (
          <Card>
            <CardHeader className='py-2 px-4 border-b'>
              <CardTitle className='text-sm font-medium'>
                资源分布
                {networkResourceInfo && (
                  <span className='text-xs text-muted-foreground font-normal ml-2'>
                    总传输 {(networkResourceInfo.totalTransferSize / 1024).toFixed(1)}KB ·{' '}
                    {networkResourceInfo.items.length} 个请求
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className='p-3'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 items-center'>
                <div className='h-[200px] flex justify-center'>
                  <Doughnut
                    data={{
                      labels: Object.keys(resourceCounts).filter(k => k !== 'total'),
                      datasets: [
                        {
                          data: Object.entries(resourceCounts)
                            .filter(([k]) => k !== 'total')
                            .map(([, v]) => v),
                          backgroundColor: [
                            'rgba(59,130,246,0.7)',
                            'rgba(249,115,22,0.7)',
                            'rgba(34,197,94,0.7)',
                            'rgba(168,85,247,0.7)',
                            'rgba(239,68,68,0.7)',
                          ],
                        },
                      ],
                    }}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </div>
                <div className='space-y-2'>
                  {Object.entries(resourceCounts).map(([key, val]) => (
                    <div key={key} className='flex justify-between text-sm'>
                      <span className='text-muted-foreground capitalize'>
                        {key === 'total' ? '总计' : key}
                      </span>
                      <span className={cn('font-mono', key === 'total' && 'font-semibold')}>
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {networkResourceInfo && networkResourceInfo.items.length > 0 && (
                <>
                  {(() => {
                    const top12 = [...networkResourceInfo.items]
                      .sort((a, b) => b.duration - a.duration)
                      .slice(0, 12);
                    const typeColorMap: Record<string, string> = {
                      Script: 'rgba(249,115,22,0.7)',
                      Stylesheet: 'rgba(168,85,247,0.7)',
                      Image: 'rgba(34,197,94,0.7)',
                      Font: 'rgba(236,72,153,0.7)',
                      Document: 'rgba(59,130,246,0.7)',
                      XHR: 'rgba(234,179,8,0.7)',
                      Fetch: 'rgba(234,179,8,0.7)',
                    };
                    return (
                      <div className='mt-4 pt-3 border-t'>
                        <div className='text-xs font-medium text-muted-foreground mb-2'>
                          资源瀑布图（按耗时排序，前 12 项）
                        </div>
                        <div className='h-[260px]'>
                          <Bar
                            data={{
                              labels: top12.map(item =>
                                (item.url.split('/').pop()?.split('?')[0] || item.url).slice(0, 30)
                              ),
                              datasets: [
                                {
                                  label: 'ms',
                                  data: top12.map(item => item.duration),
                                  backgroundColor: top12.map(
                                    item => typeColorMap[item.type] || 'rgba(148,163,184,0.7)'
                                  ),
                                  borderRadius: 3,
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              indexAxis: 'y',
                              plugins: { legend: { display: false } },
                              scales: {
                                x: { title: { display: true, text: 'ms' } },
                                y: { ticks: { font: { size: 10 } } },
                              },
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                  <div className='mt-4 pt-3 border-t'>
                    <div className='text-xs font-medium text-muted-foreground mb-2'>
                      资源加载详情（按体积排序，前 15 项）
                    </div>
                    {/* 资源健康摘要 */}
                    {(networkResourceInfo.uncompressedCount > 0 ||
                      networkResourceInfo.renderBlockingCount > 3) && (
                      <div className='flex flex-wrap gap-2 mb-2'>
                        {networkResourceInfo.uncompressedCount > 0 && (
                          <Badge
                            variant='outline'
                            className='text-[10px] px-2 py-0.5 text-red-600 border-red-300 dark:text-red-400 dark:border-red-700'
                          >
                            {networkResourceInfo.uncompressedCount} 个未压缩 (
                            {(networkResourceInfo.uncompressedSize / 1024).toFixed(0)}KB)
                          </Badge>
                        )}
                        {networkResourceInfo.renderBlockingCount > 3 && (
                          <Badge
                            variant='outline'
                            className='text-[10px] px-2 py-0.5 text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700'
                          >
                            {networkResourceInfo.renderBlockingCount} 个渲染阻塞 (
                            {(networkResourceInfo.renderBlockingSize / 1024).toFixed(0)}KB)
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className='space-y-1.5 max-h-[300px] overflow-y-auto'>
                      {[...networkResourceInfo.items]
                        .sort((a, b) => b.size - a.size)
                        .slice(0, 15)
                        .map((item, idx) => {
                          const name = item.url.split('/').pop()?.split('?')[0] || item.url;
                          const sizeKB = (item.size / 1024).toFixed(1);
                          const isLarge = item.size > 200 * 1024;
                          const isSlow = item.duration > 1000;
                          const isUncompressed =
                            ['scripts', 'stylesheets', 'documents', 'xhr'].includes(item.type) &&
                            item.size > 10 * 1024 &&
                            item.compressed === false;
                          return (
                            <div key={idx} className='flex items-center gap-2 text-xs'>
                              <Badge
                                variant='outline'
                                className='text-[10px] px-1.5 py-0 shrink-0 capitalize'
                              >
                                {item.type}
                              </Badge>
                              <span
                                className='truncate flex-1 text-muted-foreground'
                                title={item.url}
                              >
                                {name}
                              </span>
                              {item.renderBlocking && (
                                <span className='text-[9px] px-1 py-0 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0'>
                                  阻塞
                                </span>
                              )}
                              {isUncompressed && (
                                <span className='text-[9px] px-1 py-0 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 shrink-0'>
                                  未压缩
                                </span>
                              )}
                              {item.compressed && item.encoding && (
                                <span className='text-[9px] text-green-600 dark:text-green-400 shrink-0'>
                                  {item.encoding}
                                </span>
                              )}
                              <span
                                className={cn(
                                  'font-mono shrink-0',
                                  isLarge
                                    ? 'text-red-600 dark:text-red-400 font-semibold'
                                    : 'text-foreground'
                                )}
                              >
                                {sizeKB}KB
                              </span>
                              <span
                                className={cn(
                                  'font-mono shrink-0',
                                  isSlow
                                    ? 'text-orange-600 dark:text-orange-400 font-semibold'
                                    : 'text-muted-foreground'
                                )}
                              >
                                {item.duration}ms
                              </span>
                              {isLarge && (
                                <span className='text-[9px] text-red-500 shrink-0'>过大</span>
                              )}
                              {isSlow && !isLarge && (
                                <span className='text-[9px] text-orange-500 shrink-0'>慢</span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* 内容分析 */}
        {contentAnalysis && (
          <Card>
            <CardHeader className='py-2 px-4 border-b'>
              <CardTitle className='text-sm font-medium'>内容分析</CardTitle>
            </CardHeader>
            <CardContent className='p-3 space-y-3'>
              {contentAnalysis.title && (
                <div className='space-y-1'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-medium text-muted-foreground'>Title</span>
                    <Badge
                      variant='outline'
                      className={cn(
                        contentAnalysis.title.hasTitle
                          ? 'text-green-600 bg-green-50'
                          : 'text-red-600 bg-red-50'
                      )}
                    >
                      {contentAnalysis.title.hasTitle ? '✓' : '✗'}
                    </Badge>
                    {contentAnalysis.title.length != null && (
                      <span className='text-[10px] text-muted-foreground'>
                        {contentAnalysis.title.length} 字符
                      </span>
                    )}
                  </div>
                  {contentAnalysis.title.content && (
                    <p className='text-xs text-foreground truncate'>
                      {contentAnalysis.title.content}
                    </p>
                  )}
                </div>
              )}
              {contentAnalysis.meta && (
                <div className='space-y-1'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-medium text-muted-foreground'>
                      Meta Description
                    </span>
                    <Badge
                      variant='outline'
                      className={cn(
                        contentAnalysis.meta.hasDescription
                          ? 'text-green-600 bg-green-50'
                          : 'text-red-600 bg-red-50'
                      )}
                    >
                      {contentAnalysis.meta.hasDescription ? '✓' : '✗'}
                    </Badge>
                    {contentAnalysis.meta.descriptionLength != null && (
                      <span className='text-[10px] text-muted-foreground'>
                        {contentAnalysis.meta.descriptionLength} 字符
                      </span>
                    )}
                  </div>
                  {contentAnalysis.meta.description && (
                    <p className='text-xs text-muted-foreground line-clamp-2'>
                      {contentAnalysis.meta.description}
                    </p>
                  )}
                </div>
              )}
              {contentAnalysis.h1 && (
                <div className='flex items-center gap-2'>
                  <span className='text-xs font-medium text-muted-foreground'>H1</span>
                  <Badge
                    variant='outline'
                    className={cn(
                      contentAnalysis.h1.hasH1
                        ? 'text-green-600 bg-green-50'
                        : 'text-red-600 bg-red-50'
                    )}
                  >
                    {contentAnalysis.h1.hasH1 ? '✓' : '✗'}
                  </Badge>
                  {contentAnalysis.h1.content && (
                    <span className='text-xs text-foreground truncate'>
                      {contentAnalysis.h1.content}
                    </span>
                  )}
                </div>
              )}
              {contentAnalysis.resourceHints && (
                <div className='space-y-1'>
                  <span className='text-xs font-medium text-muted-foreground'>Resource Hints</span>
                  <div className='flex flex-wrap gap-2'>
                    {Object.entries(contentAnalysis.resourceHints).map(([key, val]) => (
                      <Badge key={key} variant='secondary' className='text-xs font-mono'>
                        {key.replace('_', '-')}: {val ?? 0}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 迭代详情 min/max 范围 */}
        {iterationTimings && (
          <Card>
            <CardHeader className='py-2 px-4 border-b'>
              <CardTitle className='text-sm font-medium'>
                各阶段耗时范围
                <span className='text-xs text-muted-foreground font-normal ml-1'>
                  (avg / min / max)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className='p-3'>
              <div className='h-[200px]'>
                <Bar
                  data={{
                    labels: iterationTimings.map(p => p.stage),
                    datasets: [
                      {
                        label: 'Min',
                        data: iterationTimings.map(p => p.min),
                        backgroundColor: 'rgba(34,197,94,0.5)',
                        borderRadius: 2,
                      },
                      {
                        label: 'Avg',
                        data: iterationTimings.map(p => p.avg),
                        backgroundColor: 'rgba(59,130,246,0.65)',
                        borderRadius: 2,
                      },
                      {
                        label: 'Max',
                        data: iterationTimings.map(p => p.max),
                        backgroundColor: 'rgba(239,68,68,0.5)',
                        borderRadius: 2,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
                    },
                    scales: { y: { title: { display: true, text: 'ms' } } },
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PerformanceChartPanel;
