import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
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
import { Progress } from '@/components/ui/progress';
import { Statistic } from '@/components/ui/statistic';
import { cn } from '@/lib/utils';

import { useTestResult } from '../../context/TestContext';
import { scoreColor } from '../../utils/colors';
import { parseResultPayloadText } from '../../utils/testResult';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  PointElement,
  RadialLinearScale,
  LineElement,
  Tooltip
);

type CheckItem = {
  key: string;
  title: string;
  status: 'passed' | 'warning' | 'failed' | string;
  score: number;
  issues: string[];
  group: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const CHECK_LABELS: Record<string, string> = {
  meta: 'Meta 标签',
  headings: '标题结构',
  images: '图片优化',
  links: '链接结构',
  canonical: 'Canonical',
  openGraph: 'Open Graph',
  twitterCard: 'Twitter Card',
  hreflang: 'Hreflang',
  structuredData: '结构化数据',
  robots: 'Robots.txt',
  sitemap: 'Sitemap',
  deadLinks: '死链检测',
  favicon: 'Favicon',
  httpsRedirect: 'HTTPS',
  mobile: '移动端',
  content: '内容质量',
  accessibility: '可访问性',
  pwa: 'PWA',
};

const CHECK_GROUPS: Record<string, string> = {
  meta: 'SEO 核心',
  headings: 'SEO 核心',
  images: 'SEO 核心',
  links: 'SEO 核心',
  canonical: 'SEO 核心',
  openGraph: '社交媒体',
  twitterCard: '社交媒体',
  hreflang: '国际化',
  structuredData: '最佳实践',
  robots: '最佳实践',
  sitemap: '最佳实践',
  deadLinks: 'SEO 核心',
  favicon: '最佳实践',
  httpsRedirect: '最佳实践',
  mobile: '移动端与内容',
  content: '移动端与内容',
  accessibility: '移动端与内容',
  pwa: '移动端与内容',
};

const GROUP_ORDER = ['SEO 核心', '社交媒体', '最佳实践', '国际化', '移动端与内容'];

const progressColor = (score: number) => {
  if (score >= 80) return '[&>div]:bg-green-500';
  if (score >= 50) return '[&>div]:bg-orange-500';
  return '[&>div]:bg-red-500';
};

const SeoChartPanel = () => {
  const { resultPayloadText } = useTestResult();

  const parsedPayload = useMemo(
    () => parseResultPayloadText(resultPayloadText),
    [resultPayloadText]
  );

  const seoDetails = useMemo<Record<string, unknown> | null>(() => {
    const results = parsedPayload?.details?.results;
    if (!results || typeof results !== 'object' || Array.isArray(results)) return null;
    const engineResult = (results as Record<string, unknown>).seo;
    if (!engineResult || typeof engineResult !== 'object' || Array.isArray(engineResult))
      return null;
    const details = (engineResult as { details?: unknown }).details;
    return details && typeof details === 'object' && !Array.isArray(details)
      ? (details as Record<string, unknown>)
      : null;
  }, [parsedPayload]);

  const summaryFallback = useMemo<Record<string, unknown> | null>(() => {
    if (seoDetails) return null;
    const summary = parsedPayload?.summary;
    if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return null;
    const s = summary as Record<string, unknown>;
    if (!s.seoChecks && !s.seoSummary) return null;
    return {
      checks: s.seoChecks,
      summary: s.seoSummary,
      detailedAnalysis: s.seoDetailedAnalysis,
    };
  }, [seoDetails, parsedPayload]);

  const effectiveDetails = useMemo(
    () => seoDetails || summaryFallback,
    [seoDetails, summaryFallback]
  );

  const checkItems = useMemo<CheckItem[]>(() => {
    if (!effectiveDetails) return [];
    const checksData = isRecord(effectiveDetails.checks)
      ? (effectiveDetails.checks as Record<string, unknown>)
      : null;
    if (checksData && Object.keys(checksData).length > 0) {
      return Object.entries(checksData)
        .filter(([, v]) => isRecord(v))
        .map(([key, v]) => {
          const check = v as Record<string, unknown>;
          return {
            key,
            title: CHECK_LABELS[key] || key,
            status: String(check.status || 'failed'),
            score: Number(check.score ?? 0),
            issues: Array.isArray(check.issues) ? (check.issues as string[]) : [],
            group: CHECK_GROUPS[key] || '其他',
          };
        });
    }
    return [];
  }, [effectiveDetails]);

  // 按分组归类
  const groupedChecks = useMemo(() => {
    const groups: Record<string, CheckItem[]> = {};
    for (const item of checkItems) {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    }
    return GROUP_ORDER.filter(g => groups[g]).map(g => ({ group: g, items: groups[g] }));
  }, [checkItems]);

  // 总览统计
  const overview = useMemo(() => {
    if (checkItems.length === 0) return null;
    const passed = checkItems.filter(c => c.status === 'passed').length;
    const warned = checkItems.filter(c => c.status === 'warning').length;
    const failed = checkItems.filter(c => c.status === 'failed').length;
    const avgScore =
      checkItems.length > 0
        ? Math.round(checkItems.reduce((s, c) => s + c.score, 0) / checkItems.length)
        : 0;
    return { total: checkItems.length, passed, warned, failed, avgScore };
  }, [checkItems]);

  const mobileFriendly = useMemo(() => {
    const checksData =
      effectiveDetails && isRecord(effectiveDetails.checks)
        ? (effectiveDetails.checks as Record<string, unknown>)
        : null;
    if (checksData?.mobile && isRecord(checksData.mobile)) {
      return Number((checksData.mobile as Record<string, unknown>).score ?? 0) >= 60;
    }
    return (effectiveDetails as { mobileFriendly?: unknown } | null)?.mobileFriendly === true;
  }, [effectiveDetails]);

  const pageSpeedScore = useMemo(() => {
    const raw = (effectiveDetails as { pageSpeedScore?: unknown } | null)?.pageSpeedScore;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [effectiveDetails]);

  // summary 层数据
  const summaryData = useMemo(() => {
    if (!effectiveDetails) return null;
    const s = effectiveDetails.summary;
    if (!isRecord(s)) return null;
    return s as {
      score?: number;
      grade?: string;
      competitiveness?: { level?: string; description?: string };
      breakdown?: {
        breakdown?: Record<
          string,
          { score?: number; weight?: number; contribution?: number; status?: string }
        >;
        totalPossibleScore?: number;
      };
    };
  }, [effectiveDetails]);

  // detailedAnalysis 层数据
  const detailedAnalysis = useMemo(() => {
    if (!effectiveDetails) return null;
    const da = effectiveDetails.detailedAnalysis;
    if (!isRecord(da)) return null;
    return da as {
      competitorInsights?: {
        marketPosition?: string;
        competitiveAdvantages?: string[];
        improvementAreas?: string[];
        benchmarkComparison?: {
          industryAverage?: number;
          yourScore?: number;
          percentile?: number;
          gap?: number;
          recommendation?: string;
        };
      };
    };
  }, [effectiveDetails]);

  /* ── 雷达图：各检查项评分 ── */
  const radarData = useMemo(() => {
    if (checkItems.length === 0) return null;
    const labels = checkItems.map(c => c.title);
    const scores = checkItems.map(c => c.score);
    return {
      labels,
      datasets: [
        {
          label: 'SEO 评分',
          data: scores,
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          borderColor: 'rgba(59, 130, 246, 0.8)',
          borderWidth: 2,
          pointBackgroundColor: scores.map(s =>
            s >= 80 ? '#22c55e' : s >= 50 ? '#f97316' : '#ef4444'
          ),
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [checkItems]);

  const radarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: { stepSize: 20, font: { size: 10 }, backdropColor: 'transparent' },
          pointLabels: { font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.06)' },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: { parsed: { r: number } }) => `评分: ${ctx.parsed.r}`,
          },
        },
      },
    }),
    []
  );

  /* ── 柱状图：各检测项加权贡献分（与雷达图的单项评分形成互补） ── */
  const barData = useMemo(() => {
    const bd = summaryData?.breakdown?.breakdown;
    if (!bd || Object.keys(bd).length === 0) {
      // 回退到分组平均分
      if (groupedChecks.length === 0) return null;
      const labels = groupedChecks.map(g => g.group);
      const avgScores = groupedChecks.map(g => {
        const sum = g.items.reduce((s, c) => s + c.score, 0);
        return Math.round(sum / g.items.length);
      });
      const colors = avgScores.map(s =>
        s >= 80
          ? 'rgba(34, 197, 94, 0.7)'
          : s >= 50
            ? 'rgba(249, 115, 22, 0.7)'
            : 'rgba(239, 68, 68, 0.7)'
      );
      return {
        labels,
        datasets: [
          {
            label: '平均分',
            data: avgScores,
            backgroundColor: colors,
            borderColor: colors.map(c => c.replace('0.7', '1')),
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      };
    }
    // 使用加权贡献分：展示每个检测项对总分的实际贡献和最大可能贡献
    const entries = Object.entries(bd).sort((a, b) => (b[1].weight ?? 0) - (a[1].weight ?? 0));
    const labels = entries.map(([k]) => CHECK_LABELS[k] || k);
    const contributions = entries.map(([, v]) => v.contribution ?? 0);
    const maxContributions = entries.map(([, v]) => v.weight ?? 0);
    const contribColors = entries.map(([, v]) => {
      const s = v.score ?? 0;
      return s >= 80
        ? 'rgba(34, 197, 94, 0.75)'
        : s >= 50
          ? 'rgba(249, 115, 22, 0.75)'
          : 'rgba(239, 68, 68, 0.75)';
    });
    return {
      labels,
      datasets: [
        {
          label: '实际贡献',
          data: contributions,
          backgroundColor: contribColors,
          borderColor: contribColors.map(c => c.replace('0.75', '1')),
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: '最大可能',
          data: maxContributions,
          backgroundColor: 'rgba(148, 163, 184, 0.2)',
          borderColor: 'rgba(148, 163, 184, 0.4)',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [summaryData, groupedChecks]);

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y' as const,
      scales: {
        x: {
          beginAtZero: true,
          stacked: false,
          ticks: { font: { size: 11 } },
          title: { display: true, text: '加权贡献分', font: { size: 11 } },
        },
        y: { ticks: { font: { size: 11 } } },
      },
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: { font: { size: 11 }, padding: 12 },
        },
        tooltip: {
          callbacks: {
            label: (ctx: { dataset: { label?: string }; parsed: { x: number } }) =>
              `${ctx.dataset.label}: ${ctx.parsed.x}`,
          },
        },
      },
    }),
    []
  );

  /* ── 饼图：通过/警告/失败分布 ── */
  const doughnutData = useMemo(() => {
    if (!overview) return null;
    return {
      labels: ['通过', '警告', '失败'],
      datasets: [
        {
          data: [overview.passed, overview.warned, overview.failed],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(249, 115, 22, 0.8)',
            'rgba(239, 68, 68, 0.8)',
          ],
          borderColor: ['#fff', '#fff', '#fff'],
          borderWidth: 2,
        },
      ],
    };
  }, [overview]);

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: { position: 'bottom' as const, labels: { font: { size: 12 }, padding: 16 } },
        tooltip: {
          callbacks: {
            label: (ctx: { label: string; parsed: number }) => `${ctx.label}: ${ctx.parsed} 项`,
          },
        },
      },
    }),
    []
  );

  const hasAny = Boolean(effectiveDetails);

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='py-3 px-4 border-b'>
        <CardTitle className='text-base font-medium'>SEO 图表分析</CardTitle>
      </CardHeader>
      <CardContent className='flex-1 overflow-auto p-4 space-y-6'>
        {!hasAny && (
          <div className='flex items-center justify-center py-16 text-sm text-muted-foreground'>
            运行 SEO 测试后，图表分析将在此展示
          </div>
        )}
        {hasAny && (
          <div className='space-y-6'>
            {/* 总览统计 */}
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
              {overview && (
                <>
                  <div className='relative'>
                    <Statistic
                      title='综合得分'
                      value={summaryData?.score ?? overview.avgScore}
                      suffix='/100'
                    />
                    {summaryData?.grade && (
                      <Badge
                        className={cn(
                          'absolute top-1 right-1 text-xs font-bold',
                          summaryData.grade === 'A'
                            ? 'bg-green-500 text-white'
                            : summaryData.grade === 'B'
                              ? 'bg-blue-500 text-white'
                              : summaryData.grade === 'C'
                                ? 'bg-orange-500 text-white'
                                : summaryData.grade === 'D'
                                  ? 'bg-orange-600 text-white'
                                  : 'bg-red-500 text-white'
                        )}
                      >
                        {summaryData.grade}
                      </Badge>
                    )}
                  </div>
                  <Statistic
                    title='通过 / 警告 / 失败'
                    value={`${overview.passed} / ${overview.warned} / ${overview.failed}`}
                  />
                  <Statistic title='移动端友好' value={mobileFriendly ? '是' : '否'} />
                  <Statistic
                    title={pageSpeedScore !== null ? 'PageSpeed' : '检测维度'}
                    value={pageSpeedScore ?? overview.total}
                  />
                </>
              )}
            </div>

            {/* 竞争力 */}
            {summaryData?.competitiveness && (
              <div className='flex flex-wrap gap-2'>
                <Badge className='bg-blue-500 hover:bg-blue-600 text-white'>
                  {summaryData.competitiveness.level}
                </Badge>
                <span className='text-sm text-muted-foreground'>
                  {summaryData.competitiveness.description}
                </span>
              </div>
            )}

            {/* 雷达图 + 饼图 */}
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
              {/* 雷达图 */}
              {radarData && (
                <div className='lg:col-span-2'>
                  <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                    各维度评分雷达图
                  </h4>
                  <div className='rounded-md border p-4 bg-muted/10'>
                    <div className='h-[340px]'>
                      <Radar data={radarData} options={radarOptions} />
                    </div>
                  </div>
                </div>
              )}

              {/* 饼图 */}
              {doughnutData && (
                <div>
                  <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                    检测结果分布
                  </h4>
                  <div className='rounded-md border p-4 bg-muted/10'>
                    <div className='h-[340px] flex items-center justify-center'>
                      <Doughnut data={doughnutData} options={doughnutOptions} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 柱状图：加权贡献分 */}
            {barData && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  各检测项加权贡献
                </h4>
                <div className='rounded-md border p-4 bg-muted/10'>
                  <div style={{ height: Math.max(220, (barData.labels?.length ?? 5) * 36) }}>
                    <Bar data={barData} options={barOptions} />
                  </div>
                </div>
              </div>
            )}

            {/* 加权评分明细 */}
            {summaryData?.breakdown?.breakdown &&
              Object.keys(summaryData.breakdown.breakdown).length > 0 && (
                <div>
                  <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                    评分权重明细
                  </h4>
                  <div className='rounded-md border divide-y'>
                    {Object.entries(summaryData.breakdown.breakdown).map(([key, item]) => (
                      <div key={key} className='flex items-center gap-3 p-2 text-sm'>
                        <div className='w-32 sm:w-40 font-medium shrink-0'>
                          {CHECK_LABELS[key] || key}
                        </div>
                        <Progress
                          value={item.score ?? 0}
                          className={cn('h-2 flex-1', progressColor(item.score ?? 0))}
                        />
                        <span
                          className={cn(
                            'text-xs font-mono w-8 text-right',
                            scoreColor(item.score ?? 0)
                          )}
                        >
                          {item.score ?? 0}
                        </span>
                        <span className='text-xs text-muted-foreground w-16 text-right'>
                          权重 {item.weight}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* 竞争力基准对比 */}
            {detailedAnalysis?.competitorInsights && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  竞争力分析
                </h4>
                {detailedAnalysis.competitorInsights.marketPosition && (
                  <p className='text-sm mb-3'>
                    {detailedAnalysis.competitorInsights.marketPosition}
                  </p>
                )}
                {detailedAnalysis.competitorInsights.benchmarkComparison && (
                  <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3'>
                    <Statistic
                      title='你的得分'
                      value={
                        detailedAnalysis.competitorInsights.benchmarkComparison.yourScore ?? '-'
                      }
                    />
                    <Statistic
                      title='行业平均'
                      value={
                        detailedAnalysis.competitorInsights.benchmarkComparison.industryAverage ??
                        '-'
                      }
                    />
                    <Statistic
                      title='百分位'
                      value={
                        detailedAnalysis.competitorInsights.benchmarkComparison.percentile ?? '-'
                      }
                      suffix='%'
                    />
                    <Statistic
                      title='差距'
                      value={detailedAnalysis.competitorInsights.benchmarkComparison.gap ?? 0}
                    />
                  </div>
                )}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {(detailedAnalysis.competitorInsights.competitiveAdvantages?.length ?? 0) > 0 && (
                    <div>
                      <div className='font-medium text-sm mb-1.5'>竞争优势</div>
                      <div className='space-y-1'>
                        {(detailedAnalysis.competitorInsights.competitiveAdvantages ?? []).map(
                          (a, i) => (
                            <p key={i} className='text-xs text-muted-foreground'>
                              - {a}
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  )}
                  {(detailedAnalysis.competitorInsights.improvementAreas?.length ?? 0) > 0 && (
                    <div>
                      <div className='font-medium text-sm mb-1.5'>改进方向</div>
                      <div className='space-y-1'>
                        {(detailedAnalysis.competitorInsights.improvementAreas ?? []).map(
                          (a, i) => (
                            <p key={i} className='text-xs text-muted-foreground'>
                              - {a}
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SeoChartPanel;
