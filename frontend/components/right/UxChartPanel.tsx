import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';

import { ImageLightbox } from '@/components/ui/image-lightbox';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Statistic } from '@/components/ui/statistic';
import { cn } from '@/lib/utils';

import { useTestResult } from '../../context/TestContext';
import { ratingColor, ratingLabel, severityColor } from '../../utils/colors';
import { parseResultPayloadText } from '../../utils/testResult';
import ScoreGauge from '../visualizations/ScoreGauge';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// Web Vitals 阈值（Google 标准）
type VitalThresholds = { good: number; poor: number; unit: string; label: string };
const VITAL_THRESHOLDS: Record<string, VitalThresholds> = {
  lcp: { good: 2500, poor: 4000, unit: 'ms', label: 'LCP' },
  fcp: { good: 1800, poor: 3000, unit: 'ms', label: 'FCP' },
  inp: { good: 200, poor: 500, unit: 'ms', label: 'INP' },
  tbt: { good: 200, poor: 600, unit: 'ms', label: 'TBT' },
  cls: { good: 0.1, poor: 0.25, unit: '', label: 'CLS' },
  ttfb: { good: 800, poor: 1800, unit: 'ms', label: 'TTFB' },
  loadTime: { good: 3000, poor: 6000, unit: 'ms', label: '加载时间' },
};

const vitalRating = (
  key: string,
  value: number | null
): 'good' | 'needs-improvement' | 'poor' | null => {
  if (value === null) return null;
  const t = VITAL_THRESHOLDS[key];
  if (!t) return null;
  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs-improvement';
  return 'poor';
};

type RecommendationItem = {
  type: string;
  label: string;
  severity: string;
  metric: string;
  value: number;
  threshold: number;
  recommendation: string;
};

const UxChartPanel = () => {
  const { resultPayloadText } = useTestResult();
  const { t } = useTranslation();

  const parsedPayload = useMemo(
    () => parseResultPayloadText(resultPayloadText),
    [resultPayloadText]
  );

  const normalizedDetails = useMemo<Record<string, unknown> | null>(() => {
    const results = parsedPayload?.details?.results;
    if (!results || typeof results !== 'object' || Array.isArray(results)) {
      return null;
    }
    const engineResult = (results as Record<string, unknown>).ux;
    if (!engineResult || typeof engineResult !== 'object' || Array.isArray(engineResult)) {
      return null;
    }
    const details = (engineResult as { details?: unknown }).details;
    return details && typeof details === 'object' && !Array.isArray(details)
      ? (details as Record<string, unknown>)
      : null;
  }, [parsedPayload]);

  // fallback: 当详细结果路径为空时，从 parsedPayload.summary 中读取嵌入的数据
  const summaryFallback = useMemo<Record<string, unknown> | null>(() => {
    if (normalizedDetails) return null;
    const summary = parsedPayload?.summary;
    if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return null;
    const s = summary as Record<string, unknown>;
    if (!s.metrics) return null;
    // UserTestManager 将 UXResult 的字段直接嵌入 summary
    return {
      results: {
        url: s.url,
        metrics: s.metrics,
        samples: s.samples,
        sampleCount: s.sampleCount,
        stats: s.stats,
        score: s.score,
        grade: s.grade,
        summary: {
          description: s.description,
          highlights: s.highlights,
          issues: s.issues,
          tags: s.tags,
          level: s.level,
          levelLabel: s.levelLabel,
        },
        recommendations: s.recommendations,
        screenshot: s.screenshot,
      },
    };
  }, [normalizedDetails, parsedPayload]);

  const uxDetails = useMemo(
    () => normalizedDetails || summaryFallback,
    [normalizedDetails, summaryFallback]
  );

  const uxResult = useMemo(() => {
    if (!uxDetails) return null;
    // 后端 UXFinalResult.results = UXResult，可能在 uxDetails 本身或 uxDetails.results 中
    const inner = (uxDetails as { results?: unknown }).results;
    if (isRecord(inner) && inner.metrics) return inner as Record<string, unknown>;
    return uxDetails;
  }, [uxDetails]);

  const metrics = useMemo(() => {
    if (!uxResult) return null;
    const raw = (uxResult as { metrics?: unknown }).metrics;
    return isRecord(raw) ? raw : null;
  }, [uxResult]);

  const navigation = useMemo(() => {
    if (!metrics) return null;
    const raw = (metrics as { navigation?: unknown }).navigation;
    return isRecord(raw) ? raw : null;
  }, [metrics]);

  const stats = useMemo(() => {
    if (!uxResult) return null;
    const raw = (uxResult as { stats?: unknown }).stats;
    return isRecord(raw) ? raw : null;
  }, [uxResult]);

  const summary = useMemo(() => {
    if (!uxResult) return null;
    const raw = (uxResult as { summary?: unknown }).summary;
    if (isRecord(raw)) return raw;
    return null;
  }, [uxResult]);

  const screenshot = useMemo<{ data: string; format: string } | null>(() => {
    if (!uxResult) return null;
    const raw = (uxResult as { screenshot?: unknown }).screenshot;
    if (!isRecord(raw)) return null;
    const data = raw.data;
    if (typeof data !== 'string' || !data) return null;
    return { data: data as string, format: String(raw.format || 'png') };
  }, [uxResult]);

  const recommendations = useMemo<RecommendationItem[]>(() => {
    if (!uxResult) return [];
    const raw = (uxResult as { recommendations?: unknown }).recommendations;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(item => item && typeof item === 'object' && !Array.isArray(item))
      .map(item => {
        const rec = item as Record<string, unknown>;
        return {
          type: String(rec.type || ''),
          label: String(rec.label || ''),
          severity: String(rec.severity || 'low'),
          metric: String(rec.metric || ''),
          value: toNumber(rec.value) ?? 0,
          threshold: toNumber(rec.threshold) ?? 0,
          recommendation: String(rec.recommendation || ''),
        };
      })
      .filter(r => r.recommendation);
  }, [uxResult]);

  const highlights = useMemo(() => {
    if (!summary) return [];
    const raw = (summary as { highlights?: unknown }).highlights;
    return Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
  }, [summary]);

  const issues = useMemo(() => {
    if (!summary) return [];
    const raw = (summary as { issues?: unknown }).issues;
    return Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
  }, [summary]);

  // Web Vitals 指标卡片数据
  const vitalCards = useMemo(() => {
    const keys = ['fcp', 'lcp', 'inp', 'tbt', 'cls', 'ttfb', 'loadTime'];
    return keys.map(key => {
      const value =
        key === 'ttfb' || key === 'loadTime'
          ? toNumber(navigation?.[key])
          : toNumber(metrics?.[key] ?? uxResult?.[key]);
      const rating = vitalRating(key, value);
      const threshold = VITAL_THRESHOLDS[key];
      const rawStat = stats?.[key];
      const statDist = isRecord(rawStat) ? (rawStat as Record<string, unknown>) : null;
      return { key, value, rating, threshold, statDist };
    });
  }, [metrics, navigation, stats, uxResult]);

  // 统计分布柱状图数据
  const statsChartData = useMemo(() => {
    if (!stats) return null;
    // U10: CLS 无单位，不应与 ms 指标混合在同一柱状图中
    const keys = ['fcp', 'lcp', 'inp', 'tbt', 'ttfb', 'loadTime'];
    const validKeys = keys.filter(k => {
      const d = stats[k];
      return isRecord(d) && toNumber((d as Record<string, unknown>).mean) !== null;
    });
    if (validKeys.length === 0) return null;

    const labels = validKeys.map(k => VITAL_THRESHOLDS[k]?.label ?? k);
    const p50 = validKeys.map(k => toNumber((stats[k] as Record<string, unknown>).p50) ?? 0);
    const p95 = validKeys.map(k => toNumber((stats[k] as Record<string, unknown>).p95) ?? 0);

    return {
      labels,
      datasets: [
        {
          label: 'P50',
          data: p50,
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderRadius: 3,
        },
        {
          label: 'P95',
          data: p95,
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
          borderRadius: 3,
        },
      ],
    };
  }, [stats]);

  const hasAny = Boolean(uxResult);
  const score = toNumber(uxResult?.score);
  const grade = String(uxResult?.grade ?? summary?.levelLabel ?? '-');

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='py-3 px-4 border-b'>
        <CardTitle className='text-base font-medium'>
          {t('resultPanels.ux.title', 'UX 测试')}
        </CardTitle>
      </CardHeader>
      <CardContent className='flex-1 overflow-auto p-4 space-y-6'>
        {!hasAny && (
          <div className='flex items-center justify-center py-16 text-sm text-muted-foreground'>
            运行 UX 测试后，分析结果将在此展示
          </div>
        )}
        {hasAny && (
          <div className='space-y-6'>
            {/* 评分仪表盘 + 等级 + 采样数 */}
            <div className='flex items-start gap-6'>
              <div className='flex-shrink-0'>
                <ScoreGauge
                  score={score ?? 0}
                  size={120}
                  label={t('resultPanels.ux.score', 'UX 评分')}
                />
              </div>
              <div className='flex-1 grid grid-cols-2 gap-3'>
                <Statistic title={t('resultPanels.ux.grade', '等级')} value={grade} />
                <Statistic
                  title={t('resultPanels.ux.sampleCount', '采样次数')}
                  value={toNumber(uxResult?.sampleCount) ?? '-'}
                />
              </div>
            </div>

            {/* Web Vitals 指标卡片 */}
            <div>
              <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                Web Vitals
              </h4>
              <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
                {vitalCards.map(card => {
                  const displayValue =
                    card.value !== null
                      ? card.key === 'cls'
                        ? card.value.toFixed(3)
                        : `${Math.round(card.value)}${card.threshold?.unit || ''}`
                      : '-';
                  return (
                    <div
                      key={card.key}
                      className={cn('p-3 rounded-lg border', ratingColor(card.rating))}
                    >
                      <div className='flex items-center justify-between mb-1'>
                        <span className='text-xs font-medium'>
                          {card.threshold?.label ?? card.key}
                        </span>
                        <Badge
                          variant='outline'
                          className={cn(
                            'text-[10px] h-4 px-1.5 border-none',
                            card.rating === 'good'
                              ? 'bg-green-500 text-white'
                              : card.rating === 'needs-improvement'
                                ? 'bg-orange-500 text-white'
                                : card.rating === 'poor'
                                  ? 'bg-red-500 text-white'
                                  : ''
                          )}
                        >
                          {ratingLabel(card.rating)}
                        </Badge>
                      </div>
                      <div className='text-xl font-bold'>{displayValue}</div>
                      {card.threshold && card.value !== null && (
                        <Progress
                          value={Math.min(100, (card.value / card.threshold.poor) * 100)}
                          className='h-1 mt-2'
                        />
                      )}
                      {/* 分布统计（如果有） */}
                      {card.statDist && (
                        <div className='flex gap-2 mt-1.5 text-[10px] text-muted-foreground'>
                          <span>
                            P50:{' '}
                            {card.key === 'cls'
                              ? (toNumber(card.statDist.p50) ?? 0).toFixed(3)
                              : Math.round(toNumber(card.statDist.p50) ?? 0)}
                          </span>
                          <span>
                            P95:{' '}
                            {card.key === 'cls'
                              ? (toNumber(card.statDist.p95) ?? 0).toFixed(3)
                              : Math.round(toNumber(card.statDist.p95) ?? 0)}
                          </span>
                          <span>
                            σ:{' '}
                            {card.key === 'cls'
                              ? (toNumber(card.statDist.stdDev) ?? 0).toFixed(4)
                              : (toNumber(card.statDist.stdDev) ?? 0).toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 分布统计柱状图 */}
            {statsChartData && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  指标分布 (P50 vs P95)
                </h4>
                <div className='max-w-md'>
                  <Bar
                    data={statsChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: { display: true, text: 'ms', font: { size: 10 } },
                          ticks: { font: { size: 10 } },
                        },
                        x: { ticks: { font: { size: 10 } } },
                      },
                      plugins: {
                        legend: { position: 'top', labels: { font: { size: 10 } } },
                      },
                    }}
                  />
                </div>
              </div>
            )}

            {/* 结论标签 + 描述 */}
            {summary && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  {t('resultPanels.ux.conclusion', '结论')}
                </h4>
                <div className='flex flex-wrap gap-2 mb-3'>
                  {(summary.tags as Array<Record<string, unknown>> | undefined)?.map(
                    (tag, index) => {
                      const level = String(tag.level || '').toLowerCase();
                      const variant =
                        level === 'good'
                          ? 'default'
                          : level === 'warn'
                            ? 'secondary'
                            : 'destructive';
                      const badgeClass =
                        level === 'good'
                          ? 'bg-green-500 hover:bg-green-600'
                          : level === 'warn'
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : level === 'bad'
                              ? 'bg-red-500 hover:bg-red-600 text-white'
                              : '';
                      return (
                        <Badge
                          key={`${tag.label}-${index}`}
                          variant={variant}
                          className={cn('border-none', badgeClass)}
                        >
                          {String(tag.label || '')}
                        </Badge>
                      );
                    }
                  )}
                </div>
                {Boolean(summary.description) && (
                  <p className='text-sm text-muted-foreground'>{String(summary.description)}</p>
                )}
              </div>
            )}

            {/* 亮点 */}
            {highlights.length > 0 && (
              <div>
                <h4 className='text-sm font-semibold text-green-600 uppercase tracking-wider mb-2'>
                  亮点
                </h4>
                <ul className='space-y-1.5 text-sm'>
                  {highlights.map((item, i) => (
                    <li
                      key={i}
                      className='flex items-start gap-2 text-green-700 dark:text-green-400'
                    >
                      <span className='shrink-0 mt-0.5'>✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 问题 */}
            {issues.length > 0 && (
              <div>
                <h4 className='text-sm font-semibold text-red-600 uppercase tracking-wider mb-2'>
                  问题 ({issues.length})
                </h4>
                <ul className='space-y-1.5 text-sm'>
                  {issues.map((item, i) => (
                    <li key={i} className='flex items-start gap-2 text-red-700 dark:text-red-400'>
                      <span className='shrink-0 mt-0.5'>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 建议（带严重度） */}
            {recommendations.length > 0 && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  {t('resultPanels.ux.recommendations', '优化建议')}
                </h4>
                <div className='space-y-2'>
                  {recommendations.map((rec, index) => (
                    <div key={index} className='rounded-md border p-3 flex items-start gap-3'>
                      <Badge
                        className={cn(
                          'shrink-0 text-[10px] text-white border-none mt-0.5',
                          severityColor(rec.severity)
                        )}
                      >
                        {rec.severity === 'high' ? '高' : rec.severity === 'medium' ? '中' : '低'}
                      </Badge>
                      <div className='flex-1 min-w-0'>
                        <div className='text-sm font-medium'>{rec.label || rec.recommendation}</div>
                        {rec.label && rec.recommendation !== rec.label && (
                          <div className='text-xs text-muted-foreground mt-0.5'>
                            {rec.recommendation}
                          </div>
                        )}
                        {rec.metric && (
                          <div className='text-[10px] text-muted-foreground mt-1'>
                            {rec.metric}: {rec.value} → 目标 {rec.threshold}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 页面截图 */}
            {screenshot && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  {t('resultPanels.ux.screenshot', '页面截图')}
                </h4>
                <ImageLightbox
                  src={`data:image/${screenshot.format};base64,${screenshot.data}`}
                  alt={t('resultPanels.ux.screenshot', '页面截图')}
                  thumbnailClassName='w-full h-auto rounded-lg border'
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UxChartPanel;
