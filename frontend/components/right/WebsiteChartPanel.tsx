import {
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { useMemo, useState } from 'react';
import { Radar } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';

import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Statistic } from '@/components/ui/statistic';
import { cn } from '@/lib/utils';

import { useTestResult } from '../../context/TestContext';
import { scoreColor } from '../../utils/colors';
import { parseResultPayloadText } from '../../utils/testResult';
import ScoreGauge from '../visualizations/ScoreGauge';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

type EngineKey = 'performance' | 'seo' | 'accessibility' | 'ux';

const ENGINE_LABELS: Record<EngineKey, string> = {
  performance: '性能',
  seo: 'SEO',
  accessibility: '可访问性',
  ux: '用户体验',
};

const WebsiteChartPanel = () => {
  const { resultPayloadText } = useTestResult();
  const { t } = useTranslation();
  const [expandedEngine, setExpandedEngine] = useState<string | null>(null);

  const parsedPayload = useMemo(
    () => parseResultPayloadText(resultPayloadText),
    [resultPayloadText]
  );

  const normalizedDetails = useMemo<Record<string, unknown> | null>(() => {
    const results = parsedPayload?.details?.results;
    if (!results || typeof results !== 'object' || Array.isArray(results)) {
      return null;
    }
    const engineResult = (results as Record<string, unknown>).website;
    if (!engineResult || typeof engineResult !== 'object' || Array.isArray(engineResult)) {
      return null;
    }
    // details 在 run() 中通过 { ...result } 展开，所以 results 就在 engineResult.details.results 中
    const details = (engineResult as { details?: unknown }).details;
    if (details && typeof details === 'object' && !Array.isArray(details)) {
      // details = { engine, version, success, testId, results: { summary, checks, ... }, timestamp }
      const innerResults = (details as { results?: unknown }).results;
      if (innerResults && typeof innerResults === 'object' && !Array.isArray(innerResults)) {
        return innerResults as Record<string, unknown>;
      }
      return details as Record<string, unknown>;
    }
    return null;
  }, [parsedPayload]);

  const websiteDetails = useMemo(() => normalizedDetails, [normalizedDetails]);

  const summary = useMemo(() => {
    if (!websiteDetails) return null;
    const raw = (websiteDetails as { summary?: unknown }).summary;
    return isRecord(raw) ? raw : null;
  }, [websiteDetails]);

  const checks = useMemo(() => {
    if (!websiteDetails) return null;
    const raw = (websiteDetails as { checks?: unknown }).checks;
    return isRecord(raw) ? raw : null;
  }, [websiteDetails]);

  const engineMetrics = useMemo(() => {
    if (!websiteDetails) return null;
    const raw = (websiteDetails as { engineMetrics?: unknown }).engineMetrics;
    return isRecord(raw) ? raw : null;
  }, [websiteDetails]);

  const recommendations = useMemo(() => {
    if (!websiteDetails) return [] as string[];
    const raw = (websiteDetails as { recommendations?: unknown }).recommendations;
    return Array.isArray(raw) ? raw.map(item => String(item)) : [];
  }, [websiteDetails]);

  // 基础检查
  const basicChecks = useMemo(() => {
    if (!checks) return null;
    const raw = checks.basic;
    return isRecord(raw) ? raw : null;
  }, [checks]);

  // 各子引擎评分
  const engineScores = useMemo(() => {
    const keys: EngineKey[] = ['performance', 'seo', 'accessibility', 'ux'];
    return keys.map(key => {
      const score = toNumber(summary?.[key]);
      const rawCheck = checks?.[key];
      const checkData = isRecord(rawCheck) ? (rawCheck as Record<string, unknown>) : null;
      const skipped = checkData ? Boolean(checkData.skipped) : score === 0 || score === null;
      const rawMetric = engineMetrics?.[key];
      const metric = isRecord(rawMetric) ? (rawMetric as Record<string, unknown>) : null;
      return { key, label: ENGINE_LABELS[key], score, skipped, checkData, metric };
    });
  }, [summary, checks, engineMetrics]);

  // 雷达图数据
  const radarData = useMemo(() => {
    const activeEngines = engineScores.filter(e => !e.skipped && e.score !== null);
    if (activeEngines.length < 2) return null;
    return {
      labels: activeEngines.map(e => e.label),
      datasets: [
        {
          label: '评分',
          data: activeEngines.map(e => e.score ?? 0),
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          borderColor: 'rgba(59, 130, 246, 0.8)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointRadius: 4,
        },
      ],
    };
  }, [engineScores]);

  // W8: 智能结论
  const conclusion = useMemo(() => {
    if (!summary) return null;
    const score = toNumber(summary.overallScore) ?? 0;
    const activeEngines = engineScores.filter(e => !e.skipped);
    const failedEngines = activeEngines.filter(e => (e.score ?? 0) < 60);
    const warnEngines = activeEngines.filter(e => (e.score ?? 0) >= 60 && (e.score ?? 0) < 80);
    const skippedEngines = engineScores.filter(e => e.skipped);

    let level: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90 && failedEngines.length === 0) level = 'excellent';
    else if (score >= 75 && failedEngines.length === 0) level = 'good';
    else if (score >= 60 && failedEngines.length <= 1) level = 'fair';
    else level = 'poor';

    const parts: string[] = [];
    parts.push(`综合评分 ${score} 分`);
    if (activeEngines.length > 0) {
      parts.push(`共测试 ${activeEngines.length} 个引擎`);
    }
    if (failedEngines.length > 0) {
      parts.push(`${failedEngines.map(e => e.label).join('、')}未达标(<60)`);
    }
    if (warnEngines.length > 0) {
      parts.push(`${warnEngines.map(e => e.label).join('、')}待优化(60-80)`);
    }
    if (skippedEngines.length > 0) {
      parts.push(`${skippedEngines.map(e => e.label).join('、')}已跳过`);
    }

    const titleMap = {
      excellent: '网站质量优秀',
      good: '网站质量良好',
      fair: '网站质量一般，建议优化',
      poor: '网站质量较差，需要重点改进',
    };
    const iconMap = { excellent: CheckCircle2, good: Info, fair: AlertCircle, poor: XCircle };
    const variantMap = {
      excellent: 'default' as const,
      good: 'default' as const,
      fair: 'default' as const,
      poor: 'destructive' as const,
    };
    const classMap = {
      excellent:
        'border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800 [&>svg]:text-green-600',
      good: 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 [&>svg]:text-blue-600',
      fair: 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800 [&>svg]:text-orange-600',
      poor: '',
    };

    return {
      level,
      title: titleMap[level],
      description: parts.join('；'),
      Icon: iconMap[level],
      variant: variantMap[level],
      className: classMap[level],
    };
  }, [summary, engineScores]);

  const hasAny = Boolean(websiteDetails);
  const overallScore = toNumber(summary?.overallScore);

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='py-3 px-4 border-b'>
        <CardTitle className='text-base font-medium'>
          {t('resultPanels.website.title', '网站综合测试')}
        </CardTitle>
      </CardHeader>
      <CardContent className='flex-1 overflow-auto p-4 space-y-6'>
        {!hasAny && (
          <div className='flex items-center justify-center py-16 text-sm text-muted-foreground'>
            运行网站综合测试后，分析结果将在此展示
          </div>
        )}
        {hasAny && (
          <div className='space-y-6'>
            {/* 综合评分 + 雷达图 */}
            <div className='flex items-start gap-6'>
              <div className='flex-shrink-0'>
                <ScoreGauge
                  score={overallScore ?? 0}
                  size={130}
                  label={t('resultPanels.website.overallScore', '综合评分')}
                />
              </div>
              {radarData && (
                <div className='flex-1 max-w-xs'>
                  <Radar
                    data={radarData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      scales: {
                        r: {
                          beginAtZero: true,
                          max: 100,
                          ticks: { stepSize: 25, display: false },
                          grid: { color: 'rgba(128,128,128,0.15)' },
                          angleLines: { color: 'rgba(128,128,128,0.15)' },
                          pointLabels: { font: { size: 11 } },
                        },
                      },
                      plugins: { legend: { display: false } },
                    }}
                  />
                </div>
              )}
            </div>

            {/* W8: 智能结论 */}
            {conclusion && (
              <Alert variant={conclusion.variant} className={conclusion.className}>
                <conclusion.Icon className='h-4 w-4' />
                <AlertTitle>{conclusion.title}</AlertTitle>
                <AlertDescription className='text-xs'>{conclusion.description}</AlertDescription>
              </Alert>
            )}

            {/* 子引擎评分卡片 */}
            <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
              {engineScores.map(engine => (
                <button
                  key={engine.key}
                  type='button'
                  className={cn(
                    'p-3 rounded-lg border text-left transition-colors',
                    engine.skipped
                      ? 'bg-muted/30 opacity-60 cursor-default'
                      : expandedEngine === engine.key
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                        : 'bg-card hover:border-blue-300 cursor-pointer'
                  )}
                  onClick={() => {
                    if (engine.skipped) return;
                    setExpandedEngine(prev => (prev === engine.key ? null : engine.key));
                  }}
                >
                  <div className='text-xs text-muted-foreground mb-1'>{engine.label}</div>
                  <div className='flex items-baseline gap-2'>
                    <span className={cn('text-2xl font-bold', scoreColor(engine.score))}>
                      {engine.skipped ? '-' : (engine.score ?? 0)}
                    </span>
                    {!engine.skipped && <span className='text-xs text-muted-foreground'>/100</span>}
                    {engine.skipped && (
                      <Badge variant='outline' className='text-[10px]'>
                        跳过
                      </Badge>
                    )}
                  </div>
                  {!engine.skipped && <Progress value={engine.score ?? 0} className='h-1.5 mt-2' />}
                  {engine.metric && (
                    <div className='text-[10px] text-muted-foreground mt-1.5'>
                      耗时 {Math.round(toNumber(engine.metric.executionTime) ?? 0)}ms
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* 展开的子引擎详情 */}
            {expandedEngine &&
              (() => {
                const engine = engineScores.find(e => e.key === expandedEngine);
                if (!engine?.checkData || engine.skipped) return null;
                const data = engine.checkData;
                const subSummary = isRecord(data.summary) ? data.summary : null;
                const subIssues = Array.isArray(data.issues) ? data.issues : [];
                const subWarnings = Array.isArray(data.warnings) ? data.warnings : [];
                const subRecommendations = Array.isArray(data.recommendations)
                  ? data.recommendations
                  : [];

                return (
                  <div className='rounded-lg border p-4 space-y-3 bg-muted/10'>
                    <div className='flex items-center justify-between'>
                      <h4 className='text-sm font-semibold'>{engine.label} 详情</h4>
                      <button
                        type='button'
                        className='text-xs text-muted-foreground hover:text-foreground'
                        onClick={() => setExpandedEngine(null)}
                      >
                        收起
                      </button>
                    </div>

                    {/* 子引擎 summary 指标 */}
                    {subSummary && (
                      <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                        {Object.entries(subSummary)
                          .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
                          .slice(0, 9)
                          .map(([k, v]) => (
                            <Statistic key={k} title={k} value={v as string | number} />
                          ))}
                      </div>
                    )}

                    {/* 问题列表 */}
                    {subIssues.length > 0 && (
                      <div>
                        <div className='text-xs font-medium text-red-600 mb-1'>
                          问题 ({subIssues.length})
                        </div>
                        <ul className='space-y-1 text-xs'>
                          {subIssues.slice(0, 5).map((issue, i) => (
                            <li
                              key={i}
                              className='flex items-start gap-1.5 text-red-700 dark:text-red-400'
                            >
                              <span className='shrink-0 mt-0.5'>•</span>
                              <span>{String(issue)}</span>
                            </li>
                          ))}
                          {subIssues.length > 5 && (
                            <li className='text-muted-foreground'>
                              ...还有 {subIssues.length - 5} 个问题
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* 警告 */}
                    {subWarnings.length > 0 && (
                      <div>
                        <div className='text-xs font-medium text-orange-600 mb-1'>
                          警告 ({subWarnings.length})
                        </div>
                        <ul className='space-y-1 text-xs'>
                          {subWarnings.slice(0, 5).map((warn, i) => (
                            <li
                              key={i}
                              className='flex items-start gap-1.5 text-orange-700 dark:text-orange-400'
                            >
                              <span className='shrink-0 mt-0.5'>⚠</span>
                              <span>{String(warn)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 子引擎建议 */}
                    {subRecommendations.length > 0 && (
                      <div>
                        <div className='text-xs font-medium text-blue-600 mb-1'>
                          建议 ({subRecommendations.length})
                        </div>
                        <ul className='space-y-1 text-xs list-disc pl-4'>
                          {subRecommendations.slice(0, 5).map((rec, i) => (
                            <li key={i}>{String(rec)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}

            {/* 基础检查 */}
            {basicChecks && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  基础检查
                </h4>
                <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
                  {basicChecks.score !== undefined && (
                    <Statistic title='基础评分' value={toNumber(basicChecks.score) ?? '-'} />
                  )}
                  {Array.isArray(basicChecks.warnings) && (
                    <Statistic title='警告数' value={basicChecks.warnings.length} />
                  )}
                  {Array.isArray(basicChecks.errors) && (
                    <Statistic title='错误数' value={basicChecks.errors.length} />
                  )}
                </div>
                {Array.isArray(basicChecks.warnings) && basicChecks.warnings.length > 0 && (
                  <div className='mt-2 rounded-md border p-3 space-y-1'>
                    {(basicChecks.warnings as string[]).slice(0, 5).map((w, i) => (
                      <div
                        key={i}
                        className='flex items-start gap-1.5 text-xs text-orange-700 dark:text-orange-400'
                      >
                        <span className='shrink-0'>⚠</span>
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}
                {Array.isArray(basicChecks.errors) && basicChecks.errors.length > 0 && (
                  <div className='mt-2 rounded-md border border-red-200 p-3 space-y-1'>
                    {(basicChecks.errors as string[]).slice(0, 5).map((e, i) => (
                      <div
                        key={i}
                        className='flex items-start gap-1.5 text-xs text-red-700 dark:text-red-400'
                      >
                        <span className='shrink-0'>✕</span>
                        <span>{e}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 引擎执行指标 */}
            {engineMetrics && Object.keys(engineMetrics).length > 0 && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  引擎执行指标
                </h4>
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                  {Object.entries(engineMetrics).map(([key, val]) => {
                    if (!isRecord(val)) return null;
                    const execTime = toNumber(val.executionTime);
                    const memUsage = toNumber(val.memoryUsage);
                    return (
                      <div key={key} className='p-3 rounded-lg border bg-card'>
                        <div className='text-xs text-muted-foreground mb-1'>
                          {ENGINE_LABELS[key as EngineKey] ?? key}
                        </div>
                        <div className='text-sm font-medium'>
                          {execTime !== null ? `${(execTime / 1000).toFixed(1)}s` : '-'}
                        </div>
                        {memUsage !== null && memUsage > 0 && (
                          <div className='text-[10px] text-muted-foreground mt-0.5'>
                            内存 {(memUsage / 1024 / 1024).toFixed(1)}MB
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 综合建议 */}
            {recommendations.length > 0 ? (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  {t('resultPanels.website.recommendations', '综合建议')}
                </h4>
                <div className='rounded-md border bg-muted/20 p-4'>
                  <ul className='space-y-2 list-disc pl-4 text-sm'>
                    {recommendations.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className='flex items-center gap-2 p-4 rounded-md bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-800'>
                <Badge className='bg-green-500 hover:bg-green-600 border-none'>
                  {t('resultPanels.website.passTag', 'PASS')}
                </Badge>
                <span className='text-sm text-muted-foreground'>
                  {t('resultPanels.website.noRecommendations', '未发现需要改进的项目')}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WebsiteChartPanel;
