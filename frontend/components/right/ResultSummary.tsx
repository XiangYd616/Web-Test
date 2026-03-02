import { ExternalLink, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { getTestStatusMeta } from '../../constants/status';
import {
  TEST_TYPE_LABELS,
  useTestConfig,
  useTestLogs,
  useTestResult,
} from '../../context/TestContext';
import { parseResultPayloadText } from '../../utils/testResult';
import ScoreGauge from '../visualizations/ScoreGauge';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const METRIC_NAME_MAP: Record<string, string> = {
  totalIssues: '问题总数',
  criticalIssues: '严重问题',
  highRiskIssues: '高风险问题',
  recommendations: '建议数',
  totalRequests: '总请求数',
  successfulRequests: '成功请求',
  failedRequests: '失败请求',
  averageResponseTime: '平均响应时间',
  errorRate: '错误率',
  throughput: '吞吐量',
  p95: 'P95 延迟',
  p99: 'P99 延迟',
  score: '得分',
  overallScore: '综合得分',
  accessibilityScore: '可访问性得分',
  performanceScore: '性能得分',
  seoScore: 'SEO 得分',
  bestPracticesScore: '最佳实践得分',
  loadTime: '加载时间',
  firstContentfulPaint: 'FCP',
  largestContentfulPaint: 'LCP',
  cumulativeLayoutShift: 'CLS',
  totalBlockingTime: 'TBT',
  timeToFirstByte: 'TTFB',
  domContentLoaded: 'DOM 加载',
  transferSize: '传输大小',
  resourceCount: '资源数量',
  averageLoadTime: '平均加载',
  fastestLoadTime: '最快加载',
  slowestLoadTime: '最慢加载',
  grade: '等级',
  successRate: '成功率',
  requestsPerSecond: '每秒请求',
  minResponseTime: '最短响应',
  maxResponseTime: '最长响应',
};

const itemToString = (item: unknown): string => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (typeof item !== 'object' || Array.isArray(item)) return String(item);
  const rec = item as Record<string, unknown>;
  // 尝试从常见字段提取可读文本
  const textFields = [
    'action',
    'issue',
    'title',
    'description',
    'message',
    'recommendation',
    'name',
    'text',
  ];
  for (const key of textFields) {
    if (rec[key] && typeof rec[key] === 'string') return rec[key] as string;
  }
  // 组合 issue + action
  const issue = rec.issue ? String(rec.issue) : '';
  const action = rec.action ? String(rec.action) : '';
  if (issue && action) return `${issue}: ${action}`;
  if (issue || action) return issue || action;
  return '';
};

const toStringList = (value: unknown, limit = 6) => {
  if (!value) {
    return [] as string[];
  }
  if (Array.isArray(value)) {
    return value
      .map(item => itemToString(item))
      .filter(Boolean)
      .slice(0, limit);
  }
  if (isRecord(value)) {
    // 如果是分组结构（如 {immediate: [...], shortTerm: [...]}），展平所有子数组
    const allArrays = Object.values(value).filter(Array.isArray);
    if (allArrays.length > 0) {
      return allArrays
        .flat()
        .map(item => itemToString(item))
        .filter(Boolean)
        .slice(0, limit);
    }
    return Object.values(value)
      .map(item => itemToString(item))
      .filter(Boolean)
      .slice(0, limit);
  }
  return [String(value)].filter(Boolean).slice(0, limit);
};

/** 测试运行中的实时进度视图 */
const RunningView = () => {
  const { t } = useTranslation();
  const { progressInfo, selectedType, url, stopTest } = useTestConfig();
  const { logs } = useTestLogs();
  const logEndRef = useRef<HTMLDivElement>(null);

  const progress =
    typeof progressInfo?.progress === 'number'
      ? Math.min(100, Math.max(0, progressInfo.progress))
      : null;

  // 自动滚动到最新日志
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const recentLogs = useMemo(() => logs.slice(-50), [logs]);

  const levelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-500';
      case 'warn':
        return 'text-orange-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const levelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return '✕';
      case 'warn':
        return '⚠';
      default:
        return '›';
    }
  };

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='py-3 px-4 border-b'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-base font-medium'>
            {t('result.runningTitle', '测试进行中')}
          </CardTitle>
          <div className='flex items-center gap-2'>
            <Button variant='destructive' size='sm' onClick={stopTest} className='h-7 px-3 text-xs'>
              {t('editor.stop', '停止')}
            </Button>
            <Badge className='bg-blue-500 text-white border-none animate-pulse'>
              {t('result.running', '运行中')}
            </Badge>
            <Badge variant='outline'>{t(TEST_TYPE_LABELS[selectedType] ?? selectedType)}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className='flex-1 overflow-hidden p-4 space-y-4 flex flex-col'>
        {/* URL */}
        {url && <div className='text-xs text-muted-foreground truncate'>{url}</div>}

        {/* 进度条 */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between text-sm'>
            <span className='font-medium'>{t('editor.progress', '进度')}</span>
            <span className='tabular-nums font-semibold'>
              {progress !== null ? `${Math.round(progress)}%` : '...'}
            </span>
          </div>
          <div className='h-3 rounded-full bg-muted overflow-hidden'>
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500 ease-out',
                progress !== null && progress >= 90
                  ? 'bg-green-500'
                  : progress !== null && progress >= 60
                    ? 'bg-blue-500'
                    : progress !== null && progress >= 30
                      ? 'bg-yellow-500'
                      : 'bg-orange-500'
              )}
              style={{ width: `${progress ?? 5}%` }}
            />
          </div>
        </div>

        {/* 当前步骤 */}
        {progressInfo?.currentStep && (
          <div className='flex items-center gap-2 text-sm'>
            <span className='inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse' />
            <span className='text-muted-foreground'>{t('editor.currentStep', '当前步骤')}:</span>
            <span className='font-medium truncate'>{progressInfo.currentStep}</span>
          </div>
        )}

        {/* 压力测试实时统计 */}
        {selectedType === 'stress' && progressInfo?.stats && (
          <div className='grid grid-cols-3 gap-2'>
            <div className='rounded-lg border bg-muted/20 p-2.5 text-center'>
              <div className='text-lg font-bold tabular-nums text-green-600'>
                {progressInfo.stats.completed ?? 0}
              </div>
              <div className='text-[10px] text-muted-foreground'>
                {t('result.stressCompleted', '完成请求')}
              </div>
            </div>
            <div className='rounded-lg border bg-muted/20 p-2.5 text-center'>
              <div className='text-lg font-bold tabular-nums text-red-500'>
                {progressInfo.stats.failed ?? 0}
              </div>
              <div className='text-[10px] text-muted-foreground'>
                {t('result.stressFailed', '失败请求')}
              </div>
            </div>
            <div className='rounded-lg border bg-muted/20 p-2.5 text-center'>
              <div className='text-lg font-bold tabular-nums'>
                {typeof progressInfo.stats.avgResponseTime === 'number'
                  ? `${Math.round(progressInfo.stats.avgResponseTime)}ms`
                  : '-'}
              </div>
              <div className='text-[10px] text-muted-foreground'>
                {t('result.stressAvgTime', '平均响应')}
              </div>
            </div>
          </div>
        )}

        {/* 实时日志 */}
        <div className='flex-1 min-h-0 flex flex-col'>
          <div className='flex items-center justify-between mb-2'>
            <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              {t('dashboard.logs', '日志')}
            </h4>
            <span className='text-xs text-muted-foreground'>
              {recentLogs.length} {t('result.logEntries', '条')}
            </span>
          </div>
          <div className='flex-1 min-h-0 overflow-auto rounded-lg border bg-muted/30 p-2 font-mono text-xs'>
            {recentLogs.length === 0 ? (
              <div className='flex items-center justify-center h-full text-muted-foreground'>
                {t('result.waitingLogs', '等待日志输出...')}
              </div>
            ) : (
              <div className='space-y-0.5'>
                {recentLogs.map((log, i) => {
                  const ts = log.timestamp ? new Date(log.timestamp) : null;
                  const timeStr =
                    ts && !isNaN(ts.getTime())
                      ? ts.toLocaleTimeString('zh-CN', {
                          hour12: false,
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : null;
                  const ctx = log.context;
                  const isSuccess = log.level === 'info' && /测试完成|completed/i.test(log.message);
                  const ctxScore = typeof ctx?.score === 'number' ? ctx.score : null;
                  const ctxGrade = typeof ctx?.grade === 'string' ? ctx.grade : null;
                  const ctxError = typeof ctx?.errorMessage === 'string' ? ctx.errorMessage : null;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex items-start gap-1.5 leading-5 rounded px-1 -mx-1',
                        levelColor(log.level),
                        log.level === 'error' && 'bg-red-500/10',
                        isSuccess && 'bg-green-500/10 text-green-700 dark:text-green-400'
                      )}
                    >
                      <span className='shrink-0 w-3 text-center select-none'>
                        {isSuccess ? '✓' : levelIcon(log.level)}
                      </span>
                      {timeStr && (
                        <span className='shrink-0 text-[10px] opacity-50 tabular-nums'>
                          {timeStr}
                        </span>
                      )}
                      <span className='break-all flex-1'>
                        {log.message}
                        {ctxScore !== null && (
                          <span
                            className={cn(
                              'ml-1 font-semibold',
                              ctxScore >= 90
                                ? 'text-green-600'
                                : ctxScore >= 70
                                  ? 'text-blue-600'
                                  : 'text-red-600'
                            )}
                          >
                            {ctxScore}
                            {ctxGrade ? `(${ctxGrade})` : ''}
                          </span>
                        )}
                        {ctxError && (
                          <span className='ml-1 text-red-500 opacity-80'>{ctxError}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ResultSummary = () => {
  const { result, resultPayloadText } = useTestResult();
  const { logs } = useTestLogs();
  const { selectedType, requestMeta, activeTestId, runTest } = useTestConfig();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const scoreLegend = [
    { min: 90, label: t('result.excellent'), color: 'bg-green-500 text-white hover:bg-green-600' },
    { min: 75, label: t('result.good'), color: 'bg-blue-500 text-white hover:bg-blue-600' },
    { min: 60, label: t('result.fair'), color: 'bg-yellow-500 text-white hover:bg-yellow-600' },
    { min: 0, label: t('result.poor'), color: 'bg-red-500 text-white hover:bg-red-600' },
  ];

  const passLegend = {
    passed: { label: t('result.passedLabel'), color: 'bg-green-500 text-white hover:bg-green-600' },
    failed: { label: t('result.failedLabel'), color: 'bg-red-500 text-white hover:bg-red-600' },
    unknown: { label: t('result.unknownLabel'), color: 'bg-gray-500 text-white hover:bg-gray-600' },
  };

  const status = getTestStatusMeta(result.status);

  const { summary, metrics, details } = useMemo(() => {
    const parsedPayload = parseResultPayloadText(resultPayloadText);
    const EXCLUDE = new Set([
      'status',
      'passed',
      'grade',
      'url',
      'testType',
      'engine_type',
      'description',
      'version',
      'timestamp',
      'duration',
      'score',
      'overallScore',
      'overall_score',
      'warningCount',
      'errorCount',
      'warning_count',
      'error_count',
      'browserCount',
      'deviceCount',
      'matrixCount',
      'realBrowserCount',
      'browser_count',
      'device_count',
      'matrix_count',
      'real_browser_count',
      'sampleCount',
      'sample_count',
      'totalRequests',
      'total_requests',
      'passedRequests',
      'passed_requests',
      'failedRequests',
      'failed_requests',
    ]);
    const rawMetrics = parsedPayload?.metrics ?? [];
    const normalizedMetrics: Array<Record<string, unknown>> = rawMetrics
      .map(
        (m): Record<string, unknown> => ({
          ...m,
          metric: m.metric || m.metric_name || m.metricName || m.name || '',
          value: m.value ?? m.metric_value ?? m.metricValue ?? m.score ?? m.p95 ?? m.p99,
        })
      )
      .filter(m => {
        const name = String(m.metric).toLowerCase();
        return name && !EXCLUDE.has(name);
      });
    return {
      summary: parsedPayload?.summary ?? {},
      metrics: normalizedMetrics,
      details: parsedPayload?.details ?? null,
    };
  }, [resultPayloadText]);

  const engineDetails = useMemo(() => {
    if (!isRecord(details)) {
      return null;
    }
    const results = isRecord(details.results) ? details.results : null;
    const byEngine = results && isRecord(results[result.engine]) ? results[result.engine] : null;
    const direct = isRecord(details[result.engine]) ? details[result.engine] : null;
    return (byEngine ?? direct) as Record<string, unknown> | null;
  }, [details, result.engine]);

  const resolvedSummary = isRecord(engineDetails?.summary) ? engineDetails?.summary : summary;
  const resolvedDetails = isRecord(engineDetails?.details)
    ? engineDetails?.details
    : isRecord(engineDetails)
      ? engineDetails
      : null;

  const warningItems = useMemo(() => {
    const raw = Array.isArray(engineDetails?.warnings)
      ? (engineDetails.warnings as unknown[]).map(w => itemToString(w)).filter(Boolean)
      : [];
    return [...new Set(raw)];
  }, [engineDetails]);

  const errorItems = useMemo(
    () => (Array.isArray(engineDetails?.errors) ? engineDetails?.errors : []),
    [engineDetails]
  );

  const topIssues = useMemo(() => {
    const issueCandidates = [
      resolvedSummary?.issues,
      resolvedSummary?.topIssues,
      resolvedDetails?.issues,
      resolvedDetails?.topIssues,
      resolvedDetails?.top_issues,
      errorItems,
    ];
    const raw = issueCandidates.flatMap(item => toStringList(item)).filter(Boolean);
    const warningSet = new Set(warningItems);
    return [...new Set(raw)].filter(s => !warningSet.has(s)).slice(0, 6);
  }, [errorItems, warningItems, resolvedDetails, resolvedSummary]);

  const recommendations = useMemo(() => {
    const sources = [
      resolvedSummary?.recommendations,
      resolvedDetails?.recommendations,
      resolvedDetails?.recommendation,
      resolvedDetails?.improvements,
    ];
    const raw = sources.flatMap(item => toStringList(item)).filter(Boolean);
    const usedSet = new Set([...warningItems, ...topIssues]);
    return [...new Set(raw)].filter(s => !usedSet.has(s)).slice(0, 6);
  }, [warningItems, topIssues, resolvedDetails, resolvedSummary]);

  const [kpiExpanded, setKpiExpanded] = useState(false);
  const kpiCards = useMemo(
    () => (kpiExpanded ? metrics : metrics.slice(0, 4)),
    [metrics, kpiExpanded]
  );

  const score = Number(summary.score ?? result.score ?? 0);
  const rawDuration = summary.duration ?? summary.averageLoadTime ?? result.duration;
  const duration = (() => {
    if (rawDuration === undefined || rawDuration === null) return '-';
    const s = String(rawDuration).replace(/"/g, '');
    if (/\d+(\.\d+)?\s*(ms|s|秒|毫秒)/.test(s)) return s;
    const n = Number(s);
    if (!Number.isFinite(n)) return s;
    if (n >= 1000) return `${(n / 1000).toFixed(2)}s`;
    return `${Math.round(n)}ms`;
  })();
  const grade = summary.grade ?? '-';
  const passed = summary.passed;

  const scoreTag = Number.isNaN(score)
    ? { label: '-', color: 'bg-gray-500 text-white hover:bg-gray-600' }
    : (scoreLegend.find(item => score >= item.min) ?? scoreLegend[scoreLegend.length - 1]);

  const passTag =
    passed === undefined ? passLegend.unknown : passed ? passLegend.passed : passLegend.failed;

  // Helper to map status color from hex/string to tailwind classes if possible,
  // otherwise style prop will be needed.
  // Assuming getTestStatusMeta returns a hex color, we might need to handle it or use a mapping.
  // For now, let's use a simple mapping or fallback to style.
  const statusColorStyle = { backgroundColor: status.color, color: '#fff' };

  if (result.status === 'idle') {
    return (
      <Card className='h-full flex flex-col'>
        <CardContent className='flex-1 flex flex-col items-center justify-center gap-3 p-6'>
          {requestMeta.contentType === 'application/json' && selectedType !== 'api' && (
            <div className='w-full rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-2.5 mb-2'>
              <p className='text-[11px] text-amber-700 dark:text-amber-400 font-medium'>
                {t(
                  'result.headerWarning',
                  '⚠ Content-Type 为 application/json，但当前测试类型为网页测试。服务器可能返回 JSON 而非 HTML，导致资源分析失效。建议切换为 text/html。'
                )}
              </p>
            </div>
          )}
          <p className='text-sm text-muted-foreground text-center'>
            {t('result.idleHint', '输入 URL → 选择测试类型 → 点击运行，结果将显示在此处')}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (result.status === 'running' || result.status === 'pending' || result.status === 'queued') {
    return <RunningView />;
  }

  if (
    (result.status === 'failed' || result.status === 'stopped' || result.status === 'cancelled') &&
    !resultPayloadText.trim()
  ) {
    const failMessages: Record<string, { icon: string; title: string; desc: string }> = {
      failed: {
        icon: '✕',
        title: t('result.failedTitle', '测试失败'),
        desc: t(
          'result.failedDesc',
          '测试执行过程中发生错误，请检查 URL 是否可访问或查看日志了解详情。'
        ),
      },
      stopped: {
        icon: '⏹',
        title: t('result.stoppedTitle', '测试已停止'),
        desc: t('result.stoppedDesc', '测试已被手动停止，未产生结果数据。'),
      },
      cancelled: {
        icon: '⊘',
        title: t('result.cancelledTitle', '测试已取消'),
        desc: t('result.cancelledDesc', '测试已被取消，未产生结果数据。'),
      },
    };
    const msg = failMessages[result.status] ?? failMessages.failed;
    const errorLogs = logs
      .filter(l => l.level === 'error' && l.message)
      .map(l => l.message)
      .slice(-5);
    return (
      <Card className='h-full flex flex-col items-center justify-center'>
        <CardContent className='text-center space-y-3 py-12'>
          <div className='text-4xl text-red-500'>{msg.icon}</div>
          <p className='text-base font-semibold'>{msg.title}</p>
          <p className='text-sm text-muted-foreground max-w-md'>{msg.desc}</p>
          {errorLogs.length > 0 && (
            <div className='mt-3 max-w-lg mx-auto text-left space-y-1.5'>
              <p className='text-xs font-semibold text-red-600 uppercase tracking-wider'>
                {t('result.errorDetails', '错误详情')}
              </p>
              {errorLogs.map((msg, i) => (
                <div
                  key={i}
                  className='text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2 font-mono break-all'
                >
                  {msg}
                </div>
              ))}
            </div>
          )}
          <Badge style={statusColorStyle} className='border-none mt-2'>
            {t(status.label)}
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='py-3 px-4 border-b'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-base font-medium'>{t('result.latest')}</CardTitle>
          <div className='flex items-center gap-2'>
            <Badge style={statusColorStyle} className='border-none'>
              {t(status.label)}
            </Badge>
            <Badge variant='outline'>{t(TEST_TYPE_LABELS[result.engine] ?? result.engine)}</Badge>
            {(result.status === 'completed' ||
              result.status === 'failed' ||
              result.status === 'stopped') && (
              <>
                <Button
                  size='sm'
                  variant='outline'
                  className='h-7 text-xs'
                  onClick={() => runTest()}
                >
                  <Play className='h-3 w-3 mr-1' />
                  {t('result.rerun', '重新测试')}
                </Button>
                {activeTestId && (
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-7 text-xs text-primary'
                    onClick={() => navigate(`/history/${activeTestId}`)}
                  >
                    <ExternalLink className='h-3 w-3 mr-1' />
                    {t('result.viewDetail', '查看详情')}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className='flex-1 overflow-auto p-4 space-y-5'>
        {(result.status === 'failed' ||
          result.status === 'stopped' ||
          result.status === 'cancelled') && (
          <div className='rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-800 dark:text-red-300'>
            {result.status === 'failed'
              ? t('result.partialFailedHint', '测试未完全成功，以下为部分结果，仅供参考。')
              : result.status === 'stopped'
                ? t('result.partialStoppedHint', '测试已被手动停止，以下为已完成部分的结果。')
                : t('result.partialCancelledHint', '测试已被取消，以下为已完成部分的结果。')}
          </div>
        )}

        {/* ── 核心 KPI 区域 ── */}
        <div className='rounded-xl border bg-gradient-to-b from-muted/30 to-transparent p-4'>
          <div className='flex flex-col items-center gap-4'>
            {/* 评分仪表盘 — 居中突出 */}
            <ScoreGauge
              score={Number.isNaN(score) ? 0 : score}
              size={150}
              label={t('result.score')}
            />
            {/* 核心三指标 */}
            <div className='grid grid-cols-3 gap-3 w-full'>
              <div
                className={cn(
                  'p-3 rounded-lg text-center border-2',
                  score >= 90
                    ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                    : score >= 70
                      ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
                      : score >= 60
                        ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30'
                        : 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                )}
              >
                <div className='text-[10px] text-muted-foreground font-medium uppercase tracking-wider'>
                  {t('result.grade')}
                </div>
                <div className='text-3xl font-extrabold mt-0.5'>{String(grade)}</div>
              </div>
              <div className='p-3 rounded-lg text-center border-2 border-muted bg-card'>
                <div className='text-[10px] text-muted-foreground font-medium uppercase tracking-wider'>
                  {t('result.duration')}
                </div>
                <div className='text-xl font-bold mt-0.5 tabular-nums'>{String(duration)}</div>
              </div>
              <div
                className={cn(
                  'p-3 rounded-lg text-center border-2',
                  passed === true
                    ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                    : passed === false
                      ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                      : 'border-muted bg-card'
                )}
              >
                <div className='text-[10px] text-muted-foreground font-medium uppercase tracking-wider'>
                  {t('result.passed')}
                </div>
                <div className='text-xl font-bold mt-0.5'>
                  {passed === undefined ? '-' : passed ? t('result.yes') : t('result.no')}
                </div>
              </div>
            </div>
            {/* 评级标签 */}
            <div className='flex items-center gap-2'>
              <Badge className={cn('border-none', scoreTag.color)}>{scoreTag.label}</Badge>
              <Badge className={cn('border-none', passTag.color)}>{passTag.label}</Badge>
            </div>
          </div>
        </div>

        {/* ── 扩展指标 ── */}
        {metrics.length > 0 && (
          <div className='space-y-2'>
            <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              {t('result.kpiTitle')}
            </h4>
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
              {kpiCards.map((metric, index) => {
                const rawName = String(metric.metric || `Metric ${index + 1}`);
                const name = METRIC_NAME_MAP[rawName] || rawName;
                const rawValue = metric.value;
                let value = '-';
                if (rawValue !== undefined && rawValue !== null) {
                  if (typeof rawValue === 'object') {
                    const obj = rawValue as Record<string, unknown>;
                    // 优先提取有意义的字段（level/name/label/value/score）
                    const readable = obj.level ?? obj.name ?? obj.label ?? obj.value ?? obj.score;
                    value =
                      readable !== undefined && readable !== null
                        ? String(readable)
                        : JSON.stringify(rawValue);
                  } else {
                    value = String(rawValue).replace(/^"|"$/g, '');
                  }
                }
                const trend = String(metric.trend || '').toLowerCase();
                const metricStatus = String(metric.status || '').toLowerCase();

                let statusColor = '';
                if (metricStatus === 'pass' || metricStatus === 'passed')
                  statusColor = 'text-green-600';
                if (metricStatus === 'fail' || metricStatus === 'failed')
                  statusColor = 'text-red-600';
                if (metricStatus === 'warn' || metricStatus === 'warning')
                  statusColor = 'text-orange-600';

                return (
                  <div key={name} className='p-2.5 rounded-lg border bg-card text-card-foreground'>
                    <div className='text-[10px] text-muted-foreground flex items-center justify-between gap-1'>
                      <span className='break-words leading-tight truncate' title={name}>
                        {name}
                      </span>
                      {metricStatus && (
                        <span className={cn('text-[9px] font-semibold uppercase', statusColor)}>
                          {metricStatus}
                        </span>
                      )}
                    </div>
                    <div className='text-lg font-bold mt-0.5 flex items-baseline gap-1.5'>
                      <span className='truncate' title={String(value)}>
                        {String(value)}
                      </span>
                      {trend && (
                        <span
                          className={cn(
                            'text-[10px] font-normal',
                            trend === 'up'
                              ? 'text-green-600'
                              : trend === 'down'
                                ? 'text-red-600'
                                : 'text-muted-foreground'
                          )}
                        >
                          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {metrics.length > 4 && (
              <Button
                variant='ghost'
                size='sm'
                className='w-full text-xs text-muted-foreground'
                onClick={() => setKpiExpanded(prev => !prev)}
              >
                {kpiExpanded
                  ? t('result.showLess', '收起')
                  : t('result.showMore', `展开全部 ${metrics.length} 项指标`)}
              </Button>
            )}
          </div>
        )}

        {/* ── 注意事项（柔和色调） ── */}
        {warningItems.length > 0 && (
          <div className='space-y-2'>
            <h4 className='text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5'>
              <span className='text-sm'>⚠</span> {t('result.warningsTitle', '注意事项')}
              <Badge variant='secondary' className='text-[10px] px-1.5 py-0 ml-1'>
                {warningItems.length}
              </Badge>
            </h4>
            <div className='rounded-lg border border-amber-100 bg-amber-50/60 dark:bg-amber-950/10 dark:border-amber-900/40 p-3'>
              <ul className='space-y-1.5 text-sm text-amber-800 dark:text-amber-300'>
                {warningItems.map((item: unknown, index: number) => (
                  <li key={index} className='break-words flex items-start gap-2'>
                    <span className='shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-amber-400' />
                    <span>{itemToString(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── 问题 & 建议（并排分组） ── */}
        <div className='grid md:grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5'>
              <span className='text-red-500 text-sm'>●</span> {t('result.issuesTitle')}
              {topIssues.length > 0 && (
                <Badge variant='secondary' className='text-[10px] px-1.5 py-0 ml-1'>
                  {topIssues.length}
                </Badge>
              )}
            </h4>
            <div className='rounded-lg border bg-muted/10 p-3 min-h-[100px]'>
              {topIssues.length ? (
                <ul className='space-y-1.5 text-sm'>
                  {topIssues.map((item, index) => (
                    <li key={`${item}-${index}`} className='break-words flex items-start gap-2'>
                      <span className='shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-red-400' />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className='flex items-center justify-center h-full text-muted-foreground text-sm'>
                  {t('result.listEmpty')}
                </div>
              )}
            </div>
          </div>

          <div className='space-y-2'>
            <h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5'>
              <span className='text-blue-500 text-sm'>◆</span> {t('result.recommendationsTitle')}
              {recommendations.length > 0 && (
                <Badge variant='secondary' className='text-[10px] px-1.5 py-0 ml-1'>
                  {recommendations.length}
                </Badge>
              )}
            </h4>
            <div className='rounded-lg border bg-muted/10 p-3 min-h-[100px]'>
              {recommendations.length ? (
                <ul className='space-y-1.5 text-sm'>
                  {recommendations.map((item, index) => (
                    <li key={`${item}-${index}`} className='break-words flex items-start gap-2'>
                      <span className='shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-blue-400' />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className='flex items-center justify-center h-full text-muted-foreground text-sm'>
                  {t('result.listEmpty')}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultSummary;
