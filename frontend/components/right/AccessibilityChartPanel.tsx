import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Statistic } from '@/components/ui/statistic';
import { cn } from '@/lib/utils';

import { useTestResult } from '../../context/TestContext';
import { parseResultPayloadText } from '../../utils/testResult';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

type CheckItem = {
  key: string;
  name: string;
  passed: number;
  failed: number;
  issueCount: number;
};

type ConclusionSeverity = 'success' | 'info' | 'warning' | 'error';

/* ── 辅助：从 details 路径提取引擎结果 ── */
const resolveEngineResult = (
  parsedPayload: { details?: Record<string, unknown> | null } | null
): Record<string, unknown> | null => {
  if (!parsedPayload?.details) return null;
  const details = parsedPayload.details;
  const directResults = isRecord(details.results) ? details.results : null;
  if (!directResults) return null;
  const engineResult = isRecord((directResults as Record<string, unknown>).accessibility)
    ? ((directResults as Record<string, unknown>).accessibility as Record<string, unknown>)
    : null;
  return engineResult;
};

const AccessibilityChartPanel = () => {
  const { resultPayloadText } = useTestResult();
  const { t } = useTranslation();

  const parsedPayload = useMemo(
    () => parseResultPayloadText(resultPayloadText),
    [resultPayloadText]
  );

  // ── 主数据源：parsedPayload.summary（始终可用） ──
  const summary = useMemo(() => {
    return parsedPayload?.summary && isRecord(parsedPayload.summary) ? parsedPayload.summary : null;
  }, [parsedPayload]);

  // ── 引擎结果对象 ──
  const engineResult = useMemo(() => resolveEngineResult(parsedPayload), [parsedPayload]);

  // ── 测试元信息 ──
  const testMeta = useMemo(() => {
    const innerDetails =
      engineResult && isRecord(engineResult.details)
        ? (engineResult.details as Record<string, unknown>)
        : null;

    const url = String(
      innerDetails?.url ??
        engineResult?.url ??
        (parsedPayload as Record<string, unknown> | null)?.url ??
        ''
    );
    const rawTs =
      innerDetails?.timestamp ??
      engineResult?.timestamp ??
      (parsedPayload as Record<string, unknown> | null)?.timestamp;
    const timestamp: string =
      typeof rawTs === 'number' ? new Date(rawTs).toLocaleString() : rawTs ? String(rawTs) : '';
    const wcagLevel = String(innerDetails?.wcagLevel ?? summary?.wcagLevel ?? '');
    const standards = Array.isArray(innerDetails?.standards)
      ? (innerDetails.standards as string[]).join(', ')
      : Array.isArray(summary?.standards)
        ? (summary.standards as string[]).join(', ')
        : '';

    return { url, timestamp, wcagLevel, standards };
  }, [engineResult, parsedPayload, summary]);

  // ── 尝试从 details 路径提取完整的 checks 数据 ──
  const checksFromDetails = useMemo<Record<string, unknown> | null>(() => {
    if (engineResult) {
      const innerDetails = isRecord(engineResult.details) ? engineResult.details : null;
      if (innerDetails && isRecord((innerDetails as Record<string, unknown>).checks)) {
        return (innerDetails as Record<string, unknown>).checks as Record<string, unknown>;
      }
      const innerSummary = isRecord(engineResult.summary) ? engineResult.summary : null;
      if (innerSummary && isRecord((innerSummary as Record<string, unknown>).checks)) {
        return (innerSummary as Record<string, unknown>).checks as Record<string, unknown>;
      }
    }
    if (summary && isRecord((summary as Record<string, unknown>).checks)) {
      return (summary as Record<string, unknown>).checks as Record<string, unknown>;
    }
    return null;
  }, [engineResult, summary]);

  const checkBreakdown = useMemo<CheckItem[] | null>(() => {
    if (!checksFromDetails) return null;
    const items: CheckItem[] = [];
    Object.entries(checksFromDetails).forEach(([key, val]) => {
      if (!isRecord(val)) return;
      const passed = toNumber(val.passed) ?? 0;
      const failed = toNumber(val.failed) ?? 0;
      const issues = Array.isArray(val.issues) ? val.issues.length : 0;
      const name = typeof val.name === 'string' ? val.name : key;
      items.push({ key, name, passed, failed, issueCount: issues });
    });
    return items.length > 0 ? items : null;
  }, [checksFromDetails]);

  // ── 总体通过率 ──
  const overallPassRate = useMemo(() => {
    if (!checkBreakdown) return null;
    let totalPassed = 0;
    let totalAll = 0;
    checkBreakdown.forEach(item => {
      totalPassed += item.passed;
      totalAll += item.passed + item.failed;
    });
    if (totalAll === 0) return null;
    return {
      passed: totalPassed,
      total: totalAll,
      rate: Math.round((totalPassed / totalAll) * 100),
    };
  }, [checkBreakdown]);

  // ── 严重度分布 ──
  const severityDistribution = useMemo(() => {
    let critical = 0;
    let error = 0;
    let warning = 0;
    let info = 0;

    if (checksFromDetails) {
      Object.values(checksFromDetails).forEach(item => {
        if (!isRecord(item)) return;
        const issues = Array.isArray(item.issues) ? (item.issues as unknown[]) : [];
        issues.forEach(issue => {
          if (!issue || typeof issue !== 'object') return;
          const sev = String(
            (issue as Record<string, unknown>).severity || 'warning'
          ).toLowerCase();
          if (sev.includes('critical')) critical++;
          else if (sev.includes('error')) error++;
          else if (sev.includes('warning')) warning++;
          else info++;
        });
      });
    } else {
      error = (parsedPayload?.errors ?? []).length;
      warning = (parsedPayload?.warnings ?? []).length;
    }

    const total = critical + error + warning + info;
    if (total === 0) return null;
    return { critical, error, warning, info, total };
  }, [checksFromDetails, parsedPayload]);

  // ── 问题列表：优先从 checks.issues 提取，fallback 到 parsedPayload.warnings ──
  const issueSummary = useMemo(() => {
    if (checksFromDetails) {
      const counter = new Map<string, { count: number; severity: string; wcag?: string }>();
      Object.values(checksFromDetails).forEach(item => {
        if (!isRecord(item)) return;
        const issues = Array.isArray(item.issues) ? (item.issues as unknown[]) : [];
        issues.forEach(issue => {
          if (!issue || typeof issue !== 'object') return;
          const record = issue as Record<string, unknown>;
          const label = String(record.issue || record.description || '').trim();
          if (!label) return;
          const severity = String(record.severity || 'warning');
          const wcag = typeof record.wcagCriterion === 'string' ? record.wcagCriterion : undefined;
          const prev = counter.get(label);
          if (prev) {
            prev.count += 1;
          } else {
            counter.set(label, { count: 1, severity, wcag });
          }
        });
      });
      const items = Array.from(counter.entries())
        .map(([issue, data]) => ({ issue, ...data }))
        .sort((a, b) => {
          const sevOrder = (s: string) =>
            s.includes('critical') ? 0 : s.includes('error') ? 1 : s.includes('warning') ? 2 : 3;
          const diff = sevOrder(a.severity) - sevOrder(b.severity);
          return diff !== 0 ? diff : b.count - a.count;
        })
        .slice(0, 10);
      if (items.length > 0) return items;
    }

    const warningItems = (parsedPayload?.warnings ?? []).map(w => ({
      issue: String(w),
      count: 1,
      severity: 'warning',
    }));
    const errorItems = (parsedPayload?.errors ?? []).map(e => ({
      issue: String(e),
      count: 1,
      severity: 'error',
    }));
    const all = [...errorItems, ...warningItems].slice(0, 10);
    return all.length > 0 ? all : null;
  }, [checksFromDetails, parsedPayload]);

  // ── 建议列表 ──
  const recommendations = useMemo(() => {
    if (engineResult) {
      const innerDetails = isRecord(engineResult.details) ? engineResult.details : null;
      const recs =
        innerDetails && Array.isArray((innerDetails as Record<string, unknown>).recommendations)
          ? ((innerDetails as Record<string, unknown>).recommendations as unknown[])
          : null;
      if (recs && recs.length > 0) return recs.map(item => String(item)).slice(0, 15);
      const innerSummary = isRecord(engineResult.summary) ? engineResult.summary : null;
      const sumRecs =
        innerSummary && Array.isArray((innerSummary as Record<string, unknown>).recommendations)
          ? ((innerSummary as Record<string, unknown>).recommendations as unknown[])
          : null;
      if (sumRecs && sumRecs.length > 0) return sumRecs.map(item => String(item)).slice(0, 15);
    }
    if (summary && Array.isArray((summary as Record<string, unknown>).recommendations)) {
      return ((summary as Record<string, unknown>).recommendations as unknown[])
        .map(item => String(item))
        .slice(0, 15);
    }
    const warnings = parsedPayload?.warnings ?? [];
    return warnings.length > 0 ? warnings.map(w => String(w)).slice(0, 15) : [];
  }, [engineResult, parsedPayload, summary]);

  // ── 智能结论 ──
  const conclusion = useMemo(() => {
    const scoreVal = toNumber(summary?.score);
    const errors = toNumber(summary?.errors) ?? 0;
    const warnings = toNumber(summary?.warnings) ?? 0;
    const issues: string[] = [];
    let severity: ConclusionSeverity = 'success';

    // WCAG 等级感知阈值：AAA 更严格，更多问题是预期的，适当放宽判定
    const level = testMeta.wcagLevel || 'AA';
    const isAAA = level === 'AAA';
    const scoreThresholds = isAAA
      ? { low: 50, medium: 65, good: 80 }
      : { low: 60, medium: 75, good: 90 };
    const errorThreshold = isAAA ? 8 : 5;
    const warningThreshold = isAAA ? 10 : 5;
    const passRateThreshold = isAAA ? 60 : 70;

    const push = (msg: string, nextSev: ConclusionSeverity) => {
      issues.push(msg);
      if (nextSev === 'error') severity = 'error';
      else if (nextSev === 'warning' && severity !== 'error') severity = 'warning';
      else if (nextSev === 'info' && severity === 'success') severity = 'info';
    };

    if (scoreVal !== null) {
      if (scoreVal < scoreThresholds.low)
        push(t('resultPanels.accessibility.scoreLow', { score: scoreVal }), 'error');
      else if (scoreVal < scoreThresholds.medium)
        push(t('resultPanels.accessibility.scoreMedium', { score: scoreVal }), 'warning');
      else if (scoreVal < scoreThresholds.good)
        push(t('resultPanels.accessibility.scoreGood', { score: scoreVal }), 'info');
    }

    if (errors > 0) {
      push(
        t('resultPanels.accessibility.errorsFound', { count: errors }),
        errors >= errorThreshold ? 'error' : 'warning'
      );
    }
    if (warnings > warningThreshold) {
      push(t('resultPanels.accessibility.warningsFound', { count: warnings }), 'info');
    }

    if (overallPassRate && overallPassRate.rate < passRateThreshold) {
      push(t('resultPanels.accessibility.lowPassRate', { rate: overallPassRate.rate }), 'warning');
    }

    const levelLabel = level ? ` (WCAG ${level})` : '';
    const titleMap: Record<ConclusionSeverity, string> = {
      success: t('resultPanels.accessibility.conclusionSuccess') + levelLabel,
      info: t('resultPanels.accessibility.conclusionInfo') + levelLabel,
      warning: t('resultPanels.accessibility.conclusionWarning') + levelLabel,
      error: t('resultPanels.accessibility.conclusionError') + levelLabel,
    };

    return {
      severity,
      title: titleMap[severity],
      description: issues.length
        ? issues.join('；')
        : t('resultPanels.accessibility.conclusionAllPassed'),
    };
  }, [summary, overallPassRate, testMeta.wcagLevel, t]);

  const hasAny = Boolean(summary);
  const scoreVal = toNumber(summary?.score);
  const scoreColor =
    scoreVal !== null
      ? scoreVal >= 90
        ? 'text-green-600'
        : scoreVal >= 75
          ? 'text-blue-600'
          : scoreVal >= 60
            ? 'text-yellow-600'
            : 'text-red-600'
      : '';
  const scoreRingColor =
    scoreVal !== null
      ? scoreVal >= 90
        ? 'rgba(34, 197, 94, 0.85)'
        : scoreVal >= 75
          ? 'rgba(59, 130, 246, 0.85)'
          : scoreVal >= 60
            ? 'rgba(234, 179, 8, 0.85)'
            : 'rgba(239, 68, 68, 0.85)'
      : 'rgba(156, 163, 175, 0.5)';

  const getAlertIcon = (sev: ConclusionSeverity) => {
    switch (sev) {
      case 'error':
        return <XCircle className='h-4 w-4' />;
      case 'warning':
        return <AlertTriangle className='h-4 w-4' />;
      case 'info':
        return <Info className='h-4 w-4' />;
      case 'success':
        return <CheckCircle2 className='h-4 w-4' />;
    }
  };

  const getAlertVariant = (sev: ConclusionSeverity): 'default' | 'destructive' =>
    sev === 'error' ? 'destructive' : 'default';

  const getAlertClassName = (sev: ConclusionSeverity) => {
    if (sev === 'warning') return 'border-orange-500 text-orange-600 [&>svg]:text-orange-600';
    if (sev === 'info') return 'border-blue-500 text-blue-600 [&>svg]:text-blue-600';
    if (sev === 'success') return 'border-green-500 text-green-600 [&>svg]:text-green-600';
    return '';
  };

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='py-3 px-4 border-b'>
        <CardTitle className='text-base font-medium'>
          {t('resultPanels.accessibility.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className='flex-1 overflow-auto p-4 space-y-6'>
        {!hasAny && (
          <div className='flex items-center justify-center py-16 text-sm text-muted-foreground'>
            运行无障碍测试后，检测结果将在此展示
          </div>
        )}
        {hasAny && (
          <div className='space-y-6'>
            {/* ── 测试元信息 ── */}
            {(testMeta.url || testMeta.timestamp || testMeta.wcagLevel || testMeta.standards) && (
              <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2'>
                {testMeta.url && (
                  <span className='truncate max-w-[300px]' title={testMeta.url}>
                    <span className='font-medium text-foreground'>URL:</span> {testMeta.url}
                  </span>
                )}
                {testMeta.timestamp && (
                  <span>
                    <span className='font-medium text-foreground'>
                      {t('resultPanels.accessibility.metaTime')}
                    </span>{' '}
                    {testMeta.timestamp}
                  </span>
                )}
                {testMeta.wcagLevel && (
                  <Badge variant='outline' className='text-[10px] h-5'>
                    WCAG {testMeta.wcagLevel}
                  </Badge>
                )}
                {testMeta.standards && (
                  <Badge variant='outline' className='text-[10px] h-5'>
                    {testMeta.standards}
                  </Badge>
                )}
              </div>
            )}

            {/* ── 评分环形图 + KPI 指标 ── */}
            <div className='flex items-start gap-6'>
              {/* 评分环形图 */}
              <div className='shrink-0 w-[120px] h-[120px] relative'>
                <Doughnut
                  data={{
                    labels: [
                      t('resultPanels.accessibility.chartScored'),
                      t('resultPanels.accessibility.chartDeducted'),
                    ],
                    datasets: [
                      {
                        data: [scoreVal ?? 0, 100 - (scoreVal ?? 0)],
                        backgroundColor: [scoreRingColor, 'rgba(229, 231, 235, 0.3)'],
                        borderWidth: 0,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    cutout: '75%',
                    plugins: {
                      legend: { display: false },
                      tooltip: { enabled: false },
                    },
                  }}
                />
                <div className='absolute inset-0 flex flex-col items-center justify-center'>
                  <span className={cn('text-2xl font-bold', scoreColor)}>{scoreVal ?? '-'}</span>
                  <span className='text-[10px] text-muted-foreground'>
                    {t('resultPanels.accessibility.score')}
                  </span>
                </div>
              </div>

              {/* KPI 指标 */}
              <div className='flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4'>
                <Statistic
                  title={t('resultPanels.accessibility.errors')}
                  value={toNumber(summary?.errors) ?? '-'}
                />
                <Statistic
                  title={t('resultPanels.accessibility.warnings')}
                  value={toNumber(summary?.warnings) ?? '-'}
                />
                <Statistic
                  title={t('resultPanels.accessibility.passed')}
                  value={toNumber(summary?.passed) ?? '-'}
                />
                <Statistic
                  title={t('resultPanels.accessibility.totalIssues')}
                  value={toNumber(summary?.totalIssues) ?? '-'}
                />
                {overallPassRate && (
                  <Statistic
                    title={t('resultPanels.accessibility.overallPassRate')}
                    value={`${overallPassRate.rate}%`}
                  />
                )}
                {overallPassRate && (
                  <Statistic
                    title={t('resultPanels.accessibility.passedTotal')}
                    value={`${overallPassRate.passed} / ${overallPassRate.total}`}
                  />
                )}
              </div>
            </div>

            {/* ── 智能结论 ── */}
            <Alert
              variant={getAlertVariant(conclusion.severity)}
              className={getAlertClassName(conclusion.severity)}
            >
              {getAlertIcon(conclusion.severity)}
              <AlertTitle className='ml-2'>{conclusion.title}</AlertTitle>
              <AlertDescription className='ml-2'>{conclusion.description}</AlertDescription>
            </Alert>

            {/* ── 严重度分布 + 检查项通过率 ── */}
            {(severityDistribution || checkBreakdown) && (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {/* 严重度分布柱状图 */}
                {severityDistribution && (
                  <div>
                    <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                      {t('resultPanels.accessibility.severityDistribution')}
                    </h4>
                    <div className='h-[180px]'>
                      <Bar
                        data={{
                          labels: [
                            ...(severityDistribution.critical > 0
                              ? [t('resultPanels.accessibility.sevCritical')]
                              : []),
                            ...(severityDistribution.error > 0
                              ? [t('resultPanels.accessibility.sevError')]
                              : []),
                            ...(severityDistribution.warning > 0
                              ? [t('resultPanels.accessibility.sevWarning')]
                              : []),
                            ...(severityDistribution.info > 0
                              ? [t('resultPanels.accessibility.sevInfo')]
                              : []),
                          ],
                          datasets: [
                            {
                              label: t('resultPanels.accessibility.chartIssueCount'),
                              data: [
                                ...(severityDistribution.critical > 0
                                  ? [severityDistribution.critical]
                                  : []),
                                ...(severityDistribution.error > 0
                                  ? [severityDistribution.error]
                                  : []),
                                ...(severityDistribution.warning > 0
                                  ? [severityDistribution.warning]
                                  : []),
                                ...(severityDistribution.info > 0
                                  ? [severityDistribution.info]
                                  : []),
                              ],
                              backgroundColor: [
                                ...(severityDistribution.critical > 0
                                  ? ['rgba(153, 27, 27, 0.8)']
                                  : []),
                                ...(severityDistribution.error > 0
                                  ? ['rgba(239, 68, 68, 0.8)']
                                  : []),
                                ...(severityDistribution.warning > 0
                                  ? ['rgba(249, 115, 22, 0.8)']
                                  : []),
                                ...(severityDistribution.info > 0
                                  ? ['rgba(59, 130, 246, 0.8)']
                                  : []),
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
                            y: {
                              beginAtZero: true,
                              ticks: { stepSize: 1 },
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 检查项通过率概览 */}
                {checkBreakdown && (
                  <div>
                    <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                      {t('resultPanels.accessibility.checkPassRate')}
                    </h4>
                    <div className='h-[180px]'>
                      <Bar
                        data={{
                          labels: checkBreakdown.map(item => item.name),
                          datasets: [
                            {
                              label: t('resultPanels.accessibility.chartPassed'),
                              data: checkBreakdown.map(item => item.passed),
                              backgroundColor: 'rgba(34, 197, 94, 0.7)',
                              borderRadius: 4,
                            },
                            {
                              label: t('resultPanels.accessibility.chartFailed'),
                              data: checkBreakdown.map(item => item.failed),
                              backgroundColor: 'rgba(239, 68, 68, 0.7)',
                              borderRadius: 4,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                              labels: { boxWidth: 12, font: { size: 11 } },
                            },
                          },
                          scales: {
                            x: {
                              ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 0 },
                            },
                            y: { beginAtZero: true, stacked: true },
                          },
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── 分项检查进度条 ── */}
            {checkBreakdown && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  {t('resultPanels.accessibility.checkBreakdown')}
                </h4>
                <div className='rounded-md border divide-y'>
                  {checkBreakdown.map(item => {
                    const total = item.passed + item.failed;
                    const pct = total > 0 ? Math.round((item.passed / total) * 100) : 100;
                    const barColor =
                      pct >= 90
                        ? 'bg-green-500'
                        : pct >= 70
                          ? 'bg-blue-500'
                          : pct >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500';

                    return (
                      <div key={item.key} className='p-3 space-y-1.5'>
                        <div className='flex items-center justify-between'>
                          <span className='text-sm font-medium'>{item.name}</span>
                          <span className='text-xs text-muted-foreground'>
                            {item.passed}/{total} ({pct}%)
                            {item.issueCount > 0 && (
                              <span className='ml-1.5 text-orange-500'>
                                ({item.issueCount} issues)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className='h-1.5 bg-muted rounded-full overflow-hidden'>
                          <div
                            className={cn('h-full rounded-full transition-all', barColor)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 问题列表 ── */}
            {issueSummary && issueSummary.length > 0 && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  {t('resultPanels.accessibility.topIssues')}
                </h4>
                <div className='rounded-md border divide-y'>
                  {issueSummary.map((item, index) => {
                    const sev = item.severity.toLowerCase();
                    const variant =
                      sev.includes('critical') || sev.includes('error')
                        ? 'destructive'
                        : sev.includes('warning')
                          ? 'default'
                          : 'secondary';
                    const badgeClass = sev.includes('warning')
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : '';

                    return (
                      <div key={index} className='p-3 flex items-start gap-3'>
                        <Badge variant={variant} className={cn('mt-0.5 shrink-0', badgeClass)}>
                          {item.count}
                        </Badge>
                        <div className='flex-1 min-w-0'>
                          <span className='text-sm'>{item.issue}</span>
                          {'wcag' in item && (item as { wcag?: string }).wcag && (
                            <span className='ml-2 text-xs text-muted-foreground'>
                              WCAG {(item as { wcag?: string }).wcag}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 优化建议 ── */}
            {recommendations.length > 0 && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  {t('resultPanels.accessibility.recommendations')}
                </h4>
                <div className='rounded-md border bg-muted/20 p-4'>
                  <ul className='space-y-2 list-disc pl-4 text-sm'>
                    {recommendations.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AccessibilityChartPanel;
