import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Statistic } from '@/components/ui/statistic';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import { useTestConfig, useTestResult } from '../../context/TestContext';
import { parseResultPayloadText } from '../../utils/testResult';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

type MetricRow = {
  metricName?: string;
  metric_name?: string;
  metricValue?: unknown;
  metric_value?: unknown;
  metric?: unknown;
  value?: unknown;
  [key: string]: unknown;
};

type TimelineMode = '综合' | '响应时间' | '并发' | '错误';

type ConclusionSeverity = 'success' | 'info' | 'warning' | 'error';

type LivePoint = {
  time: number;
  completed: number;
  failed: number;
  avgResponseTime: number;
};

const StressChartPanel = () => {
  const { result, resultPayloadText } = useTestResult();
  const { advancedSettings, progressInfo } = useTestConfig();

  const isRunning = result.status === 'running' || result.status === 'pending';

  // ── 实时 timeline 累积 ──
  const liveTimelineRef = useRef<LivePoint[]>([]);
  const liveStartRef = useRef<number>(0);
  const [liveTimeline, setLiveTimeline] = useState<LivePoint[]>([]);

  // 测试开始时重置（仅在新测试启动时清空，测试结束后保留数据供查看）
  useEffect(() => {
    if (result.status === 'running' && liveStartRef.current === 0) {
      liveStartRef.current = Date.now();
      liveTimelineRef.current = [];
      setLiveTimeline([]);
    }
  }, [result.status]);

  // 每次 stats 更新时追加数据点
  useEffect(() => {
    if (!isRunning || !progressInfo?.stats) return;
    const stats = progressInfo.stats;
    const now = Date.now();
    const last = liveTimelineRef.current[liveTimelineRef.current.length - 1];
    // 去重：同一秒内不重复追加
    if (last && now - last.time < 900) return;
    // 去重：数据没变化也不追加
    if (last && last.completed === (stats.completed ?? 0) && last.failed === (stats.failed ?? 0))
      return;
    const point: LivePoint = {
      time: now,
      completed: stats.completed ?? 0,
      failed: stats.failed ?? 0,
      avgResponseTime: typeof stats.avgResponseTime === 'number' ? stats.avgResponseTime : 0,
    };
    liveTimelineRef.current = [...liveTimelineRef.current, point].slice(-300);
    setLiveTimeline(liveTimelineRef.current);
  }, [isRunning, progressInfo?.stats]);

  const [timelineMode, setTimelineMode] = useState<TimelineMode>('综合');

  const toNumber = (value: unknown) => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const parsedPayload = useMemo(
    () => parseResultPayloadText(resultPayloadText),
    [resultPayloadText]
  );

  const normalizedStress = useMemo<Record<string, unknown> | null>(() => {
    const results = parsedPayload?.details?.results;
    if (!results || typeof results !== 'object' || Array.isArray(results)) {
      return null;
    }
    const engineResult = (results as Record<string, unknown>).stress;
    if (!engineResult || typeof engineResult !== 'object' || Array.isArray(engineResult)) {
      return null;
    }
    return engineResult as Record<string, unknown>;
  }, [parsedPayload]);

  // 深层 results 对象：StressNormalizedResult
  // 路径: normalizedStress.details.results
  //   normalizedStress.details = { ...StressFinalResult, timeline }
  //   StressFinalResult.results = StressNormalizedResult
  const stressNormalized = useMemo<Record<string, unknown> | null>(() => {
    const outerDetails = (normalizedStress as { details?: Record<string, unknown> } | null)
      ?.details;
    if (outerDetails && typeof outerDetails === 'object') {
      const r = (outerDetails as { results?: unknown }).results;
      if (r && typeof r === 'object' && !Array.isArray(r)) return r as Record<string, unknown>;
    }
    // 兼容旧路径
    const r = (normalizedStress as { results?: unknown } | null)?.results;
    return r && typeof r === 'object' && !Array.isArray(r) ? (r as Record<string, unknown>) : null;
  }, [normalizedStress]);

  // 深层 StressResult 对象
  // 路径: stressNormalized.details.results (StressNormalizedResult.details.results = StressResult)
  const stressRawResult = useMemo<Record<string, unknown> | null>(() => {
    const details = (stressNormalized as { details?: unknown } | null)?.details;
    if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
    const results = (details as { results?: unknown }).results;
    return results && typeof results === 'object' && !Array.isArray(results)
      ? (results as Record<string, unknown>)
      : null;
  }, [stressNormalized]);

  // timeline: 优先从 normalizedStress.details.timeline（buildNormalizedDetails 注入），
  // 其次从 stressRawResult.timeline
  const normalizedTimeline = useMemo<Array<Record<string, unknown>> | null>(() => {
    // 路径1: normalizedStress.details.timeline (由 buildNormalizedDetails 注入)
    const outerDetails = (normalizedStress as { details?: unknown } | null)?.details;
    if (outerDetails && typeof outerDetails === 'object' && !Array.isArray(outerDetails)) {
      const timeline = (outerDetails as { timeline?: unknown }).timeline;
      if (Array.isArray(timeline)) return timeline as Array<Record<string, unknown>>;
    }
    // 路径2: stressRawResult.timeline
    const fromRaw = (stressRawResult as { timeline?: unknown } | null)?.timeline;
    if (Array.isArray(fromRaw)) return fromRaw as Array<Record<string, unknown>>;
    return null;
  }, [normalizedStress, stressRawResult]);

  // summary: 优先顶层，兼容 results.summary
  const summary = useMemo<Record<string, unknown> | null>(() => {
    const top = (normalizedStress as { summary?: unknown } | null)?.summary;
    if (top && typeof top === 'object' && !Array.isArray(top))
      return top as Record<string, unknown>;
    const nested = (stressNormalized as { summary?: unknown } | null)?.summary;
    if (nested && typeof nested === 'object' && !Array.isArray(nested))
      return nested as Record<string, unknown>;
    return null;
  }, [normalizedStress, stressNormalized]);

  // metrics: 后端是 { throughput, latency: { p50, p90, p95, p99 } } 对象
  const metricsObj = useMemo<Record<string, unknown> | null>(() => {
    // 优先从 results.metrics
    const nested = (stressNormalized as { metrics?: unknown } | null)?.metrics;
    if (nested && typeof nested === 'object' && !Array.isArray(nested))
      return nested as Record<string, unknown>;
    // 兼容从 stressRawResult.performance
    const perf = (stressRawResult as { performance?: unknown } | null)?.performance;
    if (perf && typeof perf === 'object' && !Array.isArray(perf))
      return perf as Record<string, unknown>;
    return null;
  }, [stressNormalized, stressRawResult]);

  // analysis: { performance, issues, recommendations }
  const analysis = useMemo<{
    performance?: string;
    issues?: string[];
    recommendations?: string[];
  } | null>(() => {
    // 优先顶层 analysis
    const top = (normalizedStress as { analysis?: unknown } | null)?.analysis;
    if (top && typeof top === 'object' && !Array.isArray(top))
      return top as { performance?: string; issues?: string[]; recommendations?: string[] };
    // 兼容 results.details.analysis
    const details = (stressNormalized as { details?: unknown } | null)?.details;
    if (details && typeof details === 'object' && !Array.isArray(details)) {
      const a = (details as { analysis?: unknown }).analysis;
      if (a && typeof a === 'object' && !Array.isArray(a))
        return a as { performance?: string; issues?: string[]; recommendations?: string[] };
    }
    // fallback: summary 中嵌入的 analysis
    const fromSummary = (summary as { analysis?: unknown } | null)?.analysis;
    if (fromSummary && typeof fromSummary === 'object' && !Array.isArray(fromSummary))
      return fromSummary as { performance?: string; issues?: string[]; recommendations?: string[] };
    return null;
  }, [normalizedStress, stressNormalized, summary]);

  // score
  const stressScore = useMemo<number | null>(() => {
    const top = (normalizedStress as { score?: unknown } | null)?.score;
    const n = Number(top);
    if (Number.isFinite(n)) return n;
    const nested = (stressNormalized as { score?: unknown } | null)?.score;
    const n2 = Number(nested);
    return Number.isFinite(n2) ? n2 : null;
  }, [normalizedStress, stressNormalized]);

  // 测试元信息
  const testMeta = useMemo(() => {
    const url =
      String((normalizedStress as { url?: unknown } | null)?.url ?? '') ||
      String((stressRawResult as { url?: unknown } | null)?.url ?? '') ||
      String((parsedPayload as { url?: unknown } | null)?.url ?? '');
    const rawTs =
      (normalizedStress as { timestamp?: unknown } | null)?.timestamp ??
      (parsedPayload as { timestamp?: unknown } | null)?.timestamp;
    const timestamp: string =
      typeof rawTs === 'number' ? new Date(rawTs).toLocaleString() : rawTs ? String(rawTs) : '';
    const engine = String((normalizedStress as { engine?: unknown } | null)?.engine ?? 'stress');
    const version = String((normalizedStress as { version?: unknown } | null)?.version ?? '');
    return { url, timestamp, engine, version };
  }, [normalizedStress, stressRawResult, parsedPayload]);

  // 配置回显（从结果中提取原始配置）
  const configEcho = useMemo(() => {
    // 后端 StressFinalResult 的 results.details 包含原始配置信息
    const details = (stressNormalized as { details?: unknown } | null)?.details;
    const detailsRec =
      details && typeof details === 'object' && !Array.isArray(details)
        ? (details as Record<string, unknown>)
        : null;
    // 也尝试从顶层读取
    const src = normalizedStress ?? {};
    const get = (key: string) =>
      (detailsRec as Record<string, unknown> | null)?.[key] ??
      (src as Record<string, unknown>)[key];
    return {
      stressMode: String(get('stressMode') ?? ''),
      concurrency: toNumber(get('concurrency')),
      duration: toNumber(get('duration')),
      rampUp: toNumber(get('rampUp')),
      thinkTime: toNumber(get('thinkTime')),
      timeout: toNumber(get('timeout') ?? advancedSettings.timeout),
      method: String(get('method') ?? 'GET'),
    };
  }, [stressNormalized, normalizedStress, advancedSettings.timeout]);

  // 兼容旧 metricMap（从数组格式的 metrics）
  const metricMap = useMemo(() => {
    const map = new Map<string, unknown>();
    // 旧格式：数组
    const rawMetrics = (normalizedStress as { metrics?: unknown } | null)?.metrics;
    if (Array.isArray(rawMetrics)) {
      (rawMetrics as MetricRow[]).forEach(item => {
        const name = String(item.metricName ?? item.metric_name ?? item.metric ?? '');
        const value = item.metricValue ?? item.metric_value ?? item.value;
        if (name) map.set(name, value);
      });
    }
    return map;
  }, [normalizedStress]);

  const totalRequests =
    toNumber(summary?.totalRequests) ?? toNumber(summary?.total_requests) ?? null;
  const failedRequests =
    toNumber(summary?.failedRequests) ?? toNumber(summary?.failed_requests) ?? null;
  const successRate = toNumber(summary?.successRate) ?? toNumber(summary?.success_rate) ?? null;
  const avgResponseTime =
    toNumber(summary?.averageResponseTime) ?? toNumber(summary?.average_response_time) ?? null;
  const requestsPerSecond =
    toNumber(summary?.requestsPerSecond) ?? toNumber(summary?.requests_per_second) ?? null;

  const throughput =
    toNumber(metricsObj?.throughput) ??
    toNumber(metricMap.get('throughput')) ??
    toNumber(summary?.throughput) ??
    requestsPerSecond;
  const latency = metricsObj?.latency ?? metricMap.get('latency');
  const minResponseTime =
    toNumber(stressRawResult?.minResponseTime) ??
    toNumber(summary?.minResponseTime) ??
    toNumber(summary?.min_response_time) ??
    null;
  const maxResponseTime =
    toNumber(stressRawResult?.maxResponseTime) ??
    toNumber(summary?.maxResponseTime) ??
    toNumber(summary?.max_response_time) ??
    null;

  const timelineSeries = useMemo(() => {
    const timeline = normalizedTimeline;
    if (!Array.isArray(timeline) || timeline.length === 0) {
      return null;
    }

    const points = timeline
      .filter(item => item && typeof item === 'object' && !Array.isArray(item))
      .map(item => {
        const record = item as Record<string, unknown>;
        return {
          timestamp: toNumber(record.timestamp) ?? 0,
          activeConnections: toNumber(record.activeConnections) ?? 0,
          responseTime: toNumber(record.responseTime) ?? 0,
          errors: toNumber(record.errors) ?? 0,
        };
      })
      .filter(item => item.timestamp > 0);

    if (points.length === 0) {
      return null;
    }

    const baseTs = points[0]?.timestamp ?? 0;
    const labels = points.map(item => {
      const delta = baseTs > 0 ? (item.timestamp - baseTs) / 1000 : 0;
      return `t+${Math.max(0, delta).toFixed(0)}s`;
    });

    return {
      labels,
      points,
      activeConnections: points.map(item => item.activeConnections),
      responseTime: points.map(item => item.responseTime),
      errors: points.map(item => item.errors),
    };
  }, [normalizedTimeline]);

  const downloadTextFile = (filename: string, content: string, mime: string) => {
    try {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      return;
    }
  };

  const exportTimelineJson = () => {
    if (!timelineSeries) {
      return;
    }
    const rawId =
      (parsedPayload as { testId?: unknown } | null)?.testId ??
      (parsedPayload as { id?: unknown } | null)?.id ??
      'unknown';
    const exportId = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadTextFile(
      `stress_timeline_${exportId}.json`,
      JSON.stringify(timelineSeries.points, null, 2),
      'application/json;charset=utf-8'
    );
  };

  const exportTimelineCsv = () => {
    if (!timelineSeries) {
      return;
    }
    const rawId =
      (parsedPayload as { testId?: unknown } | null)?.testId ??
      (parsedPayload as { id?: unknown } | null)?.id ??
      'unknown';
    const exportId = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const header = ['timestamp', 'activeConnections', 'responseTime', 'errors'];
    const rows = timelineSeries.points.map(p => [
      p.timestamp,
      p.activeConnections,
      p.responseTime,
      p.errors,
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadTextFile(`stress_timeline_${exportId}.csv`, csv, 'text/csv;charset=utf-8');
  };

  const kpi = useMemo(() => {
    let peakConnections: number | null = null;
    let kpiAvgResponseTime: number | null = null;
    let peakResponseTime: number | null = null;
    let totalErrors: number | null = null;

    if (timelineSeries) {
      const conn = timelineSeries.activeConnections;
      const rt = timelineSeries.responseTime;
      const errs = timelineSeries.errors;

      peakConnections = conn.length ? Math.max(...conn) : null;
      const rtValid = rt.filter(v => typeof v === 'number' && Number.isFinite(v) && v > 0);
      kpiAvgResponseTime = rtValid.length
        ? rtValid.reduce((sum, v) => sum + v, 0) / rtValid.length
        : null;
      peakResponseTime = rtValid.length ? Math.max(...rtValid) : null;

      const errValid = errs.filter(v => typeof v === 'number' && Number.isFinite(v) && v >= 0);
      totalErrors = errValid.length ? errValid.reduce((sum, v) => sum + v, 0) : null;
    }

    // 降级：从 summary 提取（当 timeline 不可用时）
    if (kpiAvgResponseTime === null) {
      kpiAvgResponseTime =
        toNumber(summary?.averageResponseTime) ?? toNumber(summary?.average_response_time) ?? null;
    }
    if (peakResponseTime === null) {
      peakResponseTime =
        toNumber(summary?.maxResponseTime) ?? toNumber(summary?.max_response_time) ?? null;
    }
    if (totalErrors === null && typeof failedRequests === 'number') {
      totalErrors = failedRequests;
    }
    // 峰值并发降级：从配置的 concurrency 获取（配置值即为最大并发）
    if (peakConnections === null) {
      const concurrency = toNumber(
        (stressNormalized as { details?: Record<string, unknown> } | null)?.details?.concurrency ??
          (normalizedStress as Record<string, unknown> | null)?.concurrency
      );
      if (concurrency !== null) peakConnections = concurrency;
    }

    return {
      peakConnections,
      avgResponseTime: kpiAvgResponseTime,
      peakResponseTime,
      totalErrors,
    };
  }, [timelineSeries, summary, failedRequests, stressNormalized, normalizedStress]);

  const errorRatePercent = useMemo(() => {
    // 优先从 timeline KPI 计算（最精确，基于每秒增量）
    if (kpi.totalErrors !== null && typeof totalRequests === 'number' && totalRequests > 0) {
      return (kpi.totalErrors / totalRequests) * 100;
    }
    // 降级：从 failedRequests / totalRequests 计算（精确值）
    if (
      typeof failedRequests === 'number' &&
      typeof totalRequests === 'number' &&
      totalRequests > 0
    ) {
      return (failedRequests / totalRequests) * 100;
    }
    // 最后降级：从 summary 的 successRate 反推（可能有 Math.round 精度损失）
    if (typeof successRate === 'number' && Number.isFinite(successRate)) {
      return 100 - successRate;
    }
    return null;
  }, [kpi.totalErrors, totalRequests, successRate, failedRequests]);

  const errorTop = useMemo(() => {
    // 优先使用 StressResult.errors（详细错误分类 { type, message, count }）
    const detailedErrors = (stressRawResult as { errors?: unknown } | null)?.errors;
    const simpleErrors = (normalizedStress as { errors?: unknown } | null)?.errors;
    const candidates: unknown[] = [];
    if (detailedErrors) candidates.push(detailedErrors);
    else if (simpleErrors) candidates.push(simpleErrors);

    const normalizeKey = (value: unknown): string | null => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
      }
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
      }
      const record = value as Record<string, unknown>;
      const code =
        (typeof record.code === 'string' && record.code.trim()) ||
        (typeof record.errorCode === 'string' && record.errorCode.trim()) ||
        (typeof record.name === 'string' && record.name.trim()) ||
        '';
      const message =
        (typeof record.message === 'string' && record.message.trim()) ||
        (typeof record.error === 'string' && record.error.trim()) ||
        (typeof record.reason === 'string' && record.reason.trim()) ||
        '';

      const combined = `${code}${code && message ? ': ' : ''}${message}`.trim();
      if (combined) {
        return combined;
      }

      try {
        const json = JSON.stringify(record);
        return json && json !== '{}' ? json : null;
      } catch {
        return null;
      }
    };

    const counter = new Map<string, number>();

    const ingest = (source: unknown) => {
      if (!source) {
        return;
      }

      if (Array.isArray(source)) {
        source.forEach(item => {
          const key = normalizeKey(item);
          if (!key) {
            return;
          }
          counter.set(key, (counter.get(key) ?? 0) + 1);
        });
        return;
      }

      if (typeof source === 'object') {
        const record = source as Record<string, unknown>;
        Object.entries(record).forEach(([k, v]) => {
          const key = normalizeKey(v) ?? k;
          if (!key) {
            return;
          }
          const count = typeof v === 'number' && Number.isFinite(v) ? v : 1;
          counter.set(key, (counter.get(key) ?? 0) + count);
        });
      }
    };

    candidates.forEach(ingest);

    const items = Array.from(counter.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    return items.length ? items.slice(0, 5) : null;
  }, [normalizedStress, stressRawResult]);

  const conclusion = useMemo(() => {
    const issues: string[] = [];
    let severity: ConclusionSeverity = 'success';
    const mode = configEcho.stressMode || 'load';

    const push = (next: string, nextSeverity: typeof severity) => {
      issues.push(next);
      if (nextSeverity === 'error') {
        severity = 'error';
      } else if (nextSeverity === 'warning' && severity !== 'error') {
        severity = 'warning';
      } else if (nextSeverity === 'info' && severity === 'success') {
        severity = 'info';
      }
    };

    // 不同模式的判定阈值
    const thresholds: Record<
      string,
      { succError: number; succWarn: number; rtError: number; rtWarn: number; errWarn: number }
    > = {
      load: { succError: 95, succWarn: 99, rtError: 5000, rtWarn: 2000, errWarn: 1 },
      stress: { succError: 85, succWarn: 95, rtError: 10000, rtWarn: 5000, errWarn: 5 },
      spike: { succError: 80, succWarn: 90, rtError: 15000, rtWarn: 8000, errWarn: 10 },
      volume: { succError: 95, succWarn: 99, rtError: 8000, rtWarn: 3000, errWarn: 1 },
    };
    const t = thresholds[mode] || thresholds.load;

    if (typeof successRate === 'number') {
      if (successRate < t.succError) {
        push(`成功率偏低（${successRate.toFixed(2)}%）`, 'error');
      } else if (successRate < t.succWarn) {
        push(`成功率需要关注（${successRate.toFixed(2)}%）`, 'warning');
      }
    }

    if (typeof kpi.peakResponseTime === 'number') {
      if (kpi.peakResponseTime >= t.rtError) {
        push(`峰值响应时间过高（${kpi.peakResponseTime.toFixed(0)}ms）`, 'error');
      } else if (kpi.peakResponseTime >= t.rtWarn) {
        push(`峰值响应时间偏高（${kpi.peakResponseTime.toFixed(0)}ms）`, 'warning');
      }
    }

    if (typeof errorRatePercent === 'number') {
      if (errorRatePercent >= t.errWarn) {
        push(`错误率偏高（${errorRatePercent.toFixed(2)}%）`, 'warning');
      } else if (errorRatePercent > 0) {
        push(`存在错误（错误率 ${errorRatePercent.toFixed(2)}%）`, 'info');
      }
    } else if (typeof kpi.totalErrors === 'number' && kpi.totalErrors > 0) {
      push(`存在错误（累计 ${kpi.totalErrors.toFixed(0)}）`, 'info');
    }

    if (timelineSeries?.responseTime?.length) {
      const series = timelineSeries.responseTime.filter(v => typeof v === 'number' && v > 0);
      const n = series.length;
      if (n >= 12) {
        const first = series.slice(0, Math.floor(n / 3));
        const last = series.slice(Math.floor((n * 2) / 3));
        const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / Math.max(1, arr.length);
        const firstAvg = avg(first);
        const lastAvg = avg(last);
        if (firstAvg > 0 && lastAvg / firstAvg >= 1.5) {
          push('响应时间随时间明显劣化（疑似资源瓶颈/雪崩前兆）', 'warning');
        }
      }
    }

    const modeLabel =
      mode === 'spike'
        ? '峰值测试'
        : mode === 'stress'
          ? '压力测试'
          : mode === 'volume'
            ? '容量测试'
            : '负载测试';
    const titleMap: Record<ConclusionSeverity, string> = {
      success: `结论：${modeLabel}整体表现良好`,
      info: `结论：${modeLabel}基本可用，但存在可优化点`,
      warning: `结论：${modeLabel}需要关注（可能影响稳定性/体验）`,
      error: `结论：${modeLabel}不建议通过（存在明显问题）`,
    };

    return {
      severity,
      title: titleMap[severity],
      description: issues.length ? issues.join('；') : '各项指标未发现明显异常。',
    };
  }, [
    configEcho.stressMode,
    errorRatePercent,
    kpi.peakResponseTime,
    kpi.totalErrors,
    successRate,
    timelineSeries?.responseTime,
  ]);

  const latencySeries = useMemo(() => {
    if (!latency || typeof latency !== 'object' || Array.isArray(latency)) {
      return null;
    }
    const record = latency as Record<string, unknown>;
    const p50 = toNumber(record.p50);
    const p90 = toNumber(record.p90);
    const p95 = toNumber(record.p95);
    const p99 = toNumber(record.p99);
    if (p50 === null && p90 === null && p95 === null && p99 === null) {
      return null;
    }
    return {
      labels: ['p50', 'p90', 'p95', 'p99'],
      data: [p50 ?? 0, p90 ?? 0, p95 ?? 0, p99 ?? 0],
    };
  }, [latency]);

  const throughputSeries = useMemo(() => {
    const rps = requestsPerSecond;
    if (throughput === null && rps === null) {
      return null;
    }
    return {
      labels: ['throughput', 'rps'],
      data: [throughput ?? 0, rps ?? 0],
    };
  }, [requestsPerSecond, throughput]);

  // 响应时间分布直方图
  const rtDistribution = useMemo(() => {
    if (!normalizedTimeline || normalizedTimeline.length === 0) return null;
    const rts = normalizedTimeline
      .map(item => toNumber((item as Record<string, unknown>).responseTime))
      .filter((v): v is number => v !== null && v > 0);
    if (rts.length < 3) return null;

    const buckets = [
      { label: '<100ms', min: 0, max: 100 },
      { label: '100-300ms', min: 100, max: 300 },
      { label: '300-500ms', min: 300, max: 500 },
      { label: '500-1s', min: 500, max: 1000 },
      { label: '1-2s', min: 1000, max: 2000 },
      { label: '2-5s', min: 2000, max: 5000 },
      { label: '>5s', min: 5000, max: Infinity },
    ];
    const counts = buckets.map(b => rts.filter(v => v >= b.min && v < b.max).length);
    // 只保留有数据的桶
    const nonEmpty = buckets
      .map((b, i) => ({ label: b.label, count: counts[i] }))
      .filter(item => item.count > 0);
    if (nonEmpty.length === 0) return null;
    return {
      labels: nonEmpty.map(item => item.label),
      data: nonEmpty.map(item => item.count),
    };
  }, [normalizedTimeline]);

  // HTTP 状态码分布
  const statusCodeDist = useMemo(() => {
    const raw = (stressRawResult as { statusCodeDistribution?: unknown } | null)
      ?.statusCodeDistribution;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const entries = Object.entries(record)
      .map(([code, count]) => ({ code, count: Number(count) || 0 }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);
    if (entries.length === 0) return null;
    return {
      labels: entries.map(e => e.code),
      data: entries.map(e => e.count),
    };
  }, [stressRawResult]);

  // 时间线 RPS 曲线（从 timeline 数据计算每秒请求数）
  const timelineRps = useMemo(() => {
    if (!timelineSeries || timelineSeries.points.length < 2) return null;
    const points = timelineSeries.points;
    // 计算相邻采样点之间的请求增量（近似 RPS）
    const rps: number[] = [];
    for (let i = 0; i < points.length; i++) {
      // 用 activeConnections 作为近似 RPS（每秒活跃连接数）
      rps.push(points[i].activeConnections);
    }
    return rps;
  }, [timelineSeries]);

  // ── 实时图表数据 ──
  const liveChartData =
    isRunning && liveTimeline.length >= 2
      ? {
          labels: liveTimeline.map(p => {
            const delta = liveStartRef.current > 0 ? (p.time - liveStartRef.current) / 1000 : 0;
            return `${Math.max(0, delta).toFixed(0)}s`;
          }),
          completed: liveTimeline.map(p => p.completed),
          failed: liveTimeline.map(p => p.failed),
          avgResponseTime: liveTimeline.map(p => p.avgResponseTime),
        }
      : null;

  const hasAnyChart = Boolean(
    timelineSeries || latencySeries || throughputSeries || rtDistribution || statusCodeDist
  );

  // ── 运行中：实时图表视图 ──
  if (isRunning) {
    const latestStats = progressInfo?.stats;
    return (
      <Card className='h-full flex flex-col'>
        <CardHeader className='py-3 px-4 border-b'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-base font-medium'>压力测试 · 实时监控</CardTitle>
            <Badge className='bg-blue-500 text-white border-none animate-pulse'>运行中</Badge>
          </div>
        </CardHeader>
        <CardContent className='flex-1 overflow-auto p-4 space-y-6'>
          {/* 实时 KPI 卡片 */}
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
            <div className='rounded-lg border bg-muted/20 p-3 text-center'>
              <div className='text-2xl font-bold tabular-nums text-green-600'>
                {latestStats?.completed ?? 0}
              </div>
              <div className='text-xs text-muted-foreground mt-1'>完成请求</div>
            </div>
            <div className='rounded-lg border bg-muted/20 p-3 text-center'>
              <div className='text-2xl font-bold tabular-nums text-red-500'>
                {latestStats?.failed ?? 0}
              </div>
              <div className='text-xs text-muted-foreground mt-1'>失败请求</div>
            </div>
            <div className='rounded-lg border bg-muted/20 p-3 text-center'>
              <div className='text-2xl font-bold tabular-nums'>
                {typeof latestStats?.avgResponseTime === 'number'
                  ? `${Math.round(latestStats.avgResponseTime)}ms`
                  : '-'}
              </div>
              <div className='text-xs text-muted-foreground mt-1'>平均响应时间</div>
            </div>
            <div className='rounded-lg border bg-muted/20 p-3 text-center'>
              <div className='text-2xl font-bold tabular-nums'>
                {typeof progressInfo?.progress === 'number'
                  ? `${Math.round(progressInfo.progress)}%`
                  : '-'}
              </div>
              <div className='text-xs text-muted-foreground mt-1'>测试进度</div>
            </div>
          </div>

          {/* 实时折线图 */}
          {liveChartData ? (
            <div className='space-y-4'>
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                  请求数趋势（实时）
                </h4>
                <div className='h-[220px] w-full'>
                  <Line
                    data={{
                      labels: liveChartData.labels,
                      datasets: [
                        {
                          label: '完成请求',
                          data: liveChartData.completed,
                          borderColor: 'rgba(34, 197, 94, 1)',
                          backgroundColor: 'rgba(34, 197, 94, 0.15)',
                          tension: 0.25,
                          fill: true,
                        },
                        {
                          label: '失败请求',
                          data: liveChartData.failed,
                          borderColor: 'rgba(239, 68, 68, 1)',
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          tension: 0.25,
                          fill: true,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      animation: { duration: 300 },
                      scales: {
                        x: { title: { display: true, text: '运行时间' } },
                        y: { title: { display: true, text: '请求数' }, beginAtZero: true },
                      },
                    }}
                  />
                </div>
              </div>
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                  平均响应时间趋势（实时）
                </h4>
                <div className='h-[220px] w-full'>
                  <Line
                    data={{
                      labels: liveChartData.labels,
                      datasets: [
                        {
                          label: '平均响应时间(ms)',
                          data: liveChartData.avgResponseTime,
                          borderColor: 'rgba(59, 130, 246, 1)',
                          backgroundColor: 'rgba(59, 130, 246, 0.15)',
                          tension: 0.25,
                          fill: true,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      animation: { duration: 300 },
                      scales: {
                        x: { title: { display: true, text: '运行时间' } },
                        y: { title: { display: true, text: 'ms' }, beginAtZero: true },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2'>
              <Info className='h-8 w-8 text-muted-foreground/50 animate-pulse' />
              <p>等待实时数据...</p>
              <p className='text-xs text-muted-foreground/70'>
                {progressInfo?.currentStep || '测试准备中'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const getAlertIcon = (severity: ConclusionSeverity) => {
    switch (severity) {
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

  const getAlertVariant = (severity: ConclusionSeverity): 'default' | 'destructive' => {
    return severity === 'error' ? 'destructive' : 'default';
  };

  const getAlertClassName = (severity: ConclusionSeverity) => {
    if (severity === 'warning') return 'border-orange-500 text-orange-600 [&>svg]:text-orange-600';
    if (severity === 'info') return 'border-blue-500 text-blue-600 [&>svg]:text-blue-600';
    if (severity === 'success') return 'border-green-500 text-green-600 [&>svg]:text-green-600';
    return '';
  };

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='py-3 px-4 border-b'>
        <CardTitle className='text-base font-medium'>压力测试概览</CardTitle>
      </CardHeader>
      <CardContent className='flex-1 overflow-auto p-4 space-y-6'>
        {/* 测试元信息 */}
        {(testMeta.url || testMeta.timestamp) && (
          <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2'>
            {testMeta.url && (
              <span className='truncate max-w-[300px]' title={testMeta.url}>
                <span className='font-medium text-foreground'>URL:</span> {testMeta.url}
              </span>
            )}
            {testMeta.timestamp && (
              <span>
                <span className='font-medium text-foreground'>时间:</span> {testMeta.timestamp}
              </span>
            )}
            {testMeta.version && (
              <span>
                <span className='font-medium text-foreground'>引擎:</span> {testMeta.engine} v
                {testMeta.version}
              </span>
            )}
            {configEcho.stressMode && (
              <Badge variant='outline' className='text-[10px] h-5'>
                {configEcho.stressMode === 'load'
                  ? '负载测试'
                  : configEcho.stressMode === 'stress'
                    ? '压力测试'
                    : configEcho.stressMode === 'spike'
                      ? '峰值测试'
                      : configEcho.stressMode === 'volume'
                        ? '容量测试'
                        : configEcho.stressMode}
              </Badge>
            )}
            {configEcho.method && configEcho.method !== 'GET' && (
              <Badge variant='outline' className='text-[10px] h-5'>
                {configEcho.method}
              </Badge>
            )}
          </div>
        )}

        {/* 评分 + 性能等级 */}
        {(stressScore !== null || analysis?.performance) && (
          <div className='flex items-center gap-4'>
            {stressScore !== null && (
              <div className='flex items-center gap-2'>
                <span className='text-sm text-muted-foreground'>综合评分</span>
                <Badge
                  variant={
                    stressScore >= 80 ? 'default' : stressScore >= 60 ? 'secondary' : 'destructive'
                  }
                  className='text-lg px-3 py-1'
                >
                  {stressScore}
                </Badge>
              </div>
            )}
            {analysis?.performance && (
              <Badge
                variant={
                  analysis.performance === 'good'
                    ? 'default'
                    : analysis.performance === 'fair'
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {analysis.performance === 'good'
                  ? '良好'
                  : analysis.performance === 'fair'
                    ? '一般'
                    : '较差'}
              </Badge>
            )}
          </div>
        )}

        {/* 配置回显 + KPI 指标 */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
          <Statistic
            title='并发用户数（配置）'
            value={configEcho.concurrency ?? advancedSettings.concurrency ?? '-'}
          />
          <Statistic
            title='持续时间(秒)（配置）'
            value={configEcho.duration ?? advancedSettings.duration ?? '-'}
          />
          {configEcho.rampUp !== null && (
            <Statistic title='预热时间(秒)' value={configEcho.rampUp} />
          )}
          {configEcho.thinkTime !== null && (
            <Statistic title='思考时间(ms)' value={configEcho.thinkTime} />
          )}
          {configEcho.timeout !== null && (
            <Statistic title='请求超时(ms)' value={configEcho.timeout} />
          )}
          <Statistic title='峰值并发（实际）' value={kpi.peakConnections ?? '-'} />
          <Statistic
            title='吞吐/RPS'
            value={throughput ?? '-'}
            precision={typeof throughput === 'number' ? 2 : undefined}
          />
          <Statistic title='总请求数' value={totalRequests ?? '-'} />
          <Statistic title='失败请求数' value={failedRequests ?? '-'} />
          <Statistic
            title='成功率(%)'
            value={successRate ?? '-'}
            precision={typeof successRate === 'number' ? 2 : undefined}
          />
          <Statistic
            title='错误率(%)'
            value={errorRatePercent ?? '-'}
            precision={typeof errorRatePercent === 'number' ? 2 : undefined}
          />
          <Statistic
            title='平均响应时间(ms)'
            value={avgResponseTime ?? '-'}
            precision={typeof avgResponseTime === 'number' ? 2 : undefined}
          />
          <Statistic
            title='最小/最大响应时间(ms)'
            value={
              typeof minResponseTime === 'number' && typeof maxResponseTime === 'number'
                ? `${minResponseTime.toFixed(0)} / ${maxResponseTime.toFixed(0)}`
                : '-'
            }
          />
          <Statistic
            title='平均/峰值响应时间(ms)'
            value={
              typeof kpi.avgResponseTime === 'number' && typeof kpi.peakResponseTime === 'number'
                ? `${kpi.avgResponseTime.toFixed(0)} / ${kpi.peakResponseTime.toFixed(0)}`
                : '-'
            }
          />
        </div>

        <Alert
          variant={getAlertVariant(conclusion.severity)}
          className={getAlertClassName(conclusion.severity)}
        >
          {getAlertIcon(conclusion.severity)}
          <AlertTitle className='ml-2'>{conclusion.title}</AlertTitle>
          <AlertDescription className='ml-2'>{conclusion.description}</AlertDescription>
        </Alert>

        {/* 分析建议 */}
        {analysis &&
          ((Array.isArray(analysis.issues) && analysis.issues.length > 0) ||
            (Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0)) && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {Array.isArray(analysis.issues) && analysis.issues.length > 0 && (
                <div>
                  <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                    发现的问题
                  </h4>
                  <div className='rounded-md border p-3 space-y-1.5'>
                    {analysis.issues.map((issue, i) => (
                      <div key={i} className='flex items-start gap-2 text-sm'>
                        <AlertTriangle className='h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0' />
                        <span>{String(issue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 && (
                <div>
                  <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                    优化建议
                  </h4>
                  <div className='rounded-md border p-3 space-y-1.5'>
                    {analysis.recommendations.map((rec, i) => (
                      <div key={i} className='flex items-start gap-2 text-sm'>
                        <CheckCircle2 className='h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0' />
                        <span>{String(rec)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        {errorTop && (
          <div>
            <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
              错误 Top 5
            </h4>
            <div className='rounded-md border'>
              {errorTop.map((item, index) => (
                <div
                  key={index}
                  className={cn('flex items-start gap-3 p-2 text-sm', index !== 0 && 'border-t')}
                >
                  <Badge variant='destructive' className='mt-0.5'>
                    {item.count}
                  </Badge>
                  <span className='break-all flex-1'>{item.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasAnyChart && (
          <div className='flex items-center justify-center py-16 text-sm text-muted-foreground'>
            运行压力测试后，分析结果将在此展示
          </div>
        )}
        {hasAnyChart && (
          <div className='space-y-6'>
            {timelineSeries && (
              <div>
                <div className='flex items-center justify-between mb-3'>
                  <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
                    时间线
                  </h4>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={exportTimelineJson}
                      className='h-7 text-xs'
                    >
                      导出 JSON
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={exportTimelineCsv}
                      className='h-7 text-xs'
                    >
                      导出 CSV
                    </Button>
                    <Tabs
                      value={timelineMode}
                      onValueChange={v => setTimelineMode(v as TimelineMode)}
                      className='h-7'
                    >
                      <TabsList className='h-7 p-0'>
                        {['综合', '响应时间', '并发', '错误'].map(mode => (
                          <TabsTrigger
                            key={mode}
                            value={mode}
                            className='h-full text-xs px-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'
                          >
                            {mode}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>
                </div>
                <div className='h-[250px] w-full'>
                  <Line
                    data={{
                      labels: timelineSeries.labels,
                      datasets:
                        timelineMode === '响应时间'
                          ? [
                              {
                                label: 'responseTime(ms)',
                                data: timelineSeries.responseTime,
                                borderColor: 'rgba(59, 130, 246, 1)',
                                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                tension: 0.25,
                              },
                            ]
                          : timelineMode === '并发'
                            ? [
                                {
                                  label: 'activeConnections',
                                  data: timelineSeries.activeConnections,
                                  borderColor: 'rgba(34, 197, 94, 1)',
                                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                                  tension: 0.25,
                                },
                              ]
                            : timelineMode === '错误'
                              ? [
                                  {
                                    label: 'errors',
                                    data: timelineSeries.errors,
                                    borderColor: 'rgba(239, 68, 68, 1)',
                                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                    tension: 0.25,
                                  },
                                ]
                              : [
                                  {
                                    label: 'activeConnections',
                                    data: timelineSeries.activeConnections,
                                    borderColor: 'rgba(34, 197, 94, 1)',
                                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                                    tension: 0.25,
                                    yAxisID: 'y1',
                                  },
                                  {
                                    label: 'responseTime(ms)',
                                    data: timelineSeries.responseTime,
                                    borderColor: 'rgba(59, 130, 246, 1)',
                                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                    tension: 0.25,
                                    yAxisID: 'y',
                                  },
                                  {
                                    label: 'errors',
                                    data: timelineSeries.errors,
                                    borderColor: 'rgba(239, 68, 68, 1)',
                                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                    tension: 0.25,
                                    yAxisID: 'y2',
                                  },
                                ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales:
                        timelineMode === '综合'
                          ? {
                              y: {
                                type: 'linear',
                                position: 'left',
                                title: { display: true, text: 'responseTime(ms)' },
                              },
                              y1: {
                                type: 'linear',
                                position: 'right',
                                grid: { drawOnChartArea: false },
                                title: { display: true, text: 'activeConnections' },
                              },
                              y2: {
                                type: 'linear',
                                position: 'right',
                                grid: { drawOnChartArea: false },
                                title: { display: true, text: 'errors' },
                              },
                            }
                          : undefined,
                    }}
                  />
                </div>
              </div>
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {latencySeries && (
                <div>
                  <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                    延迟分位(ms)
                  </h4>
                  <div className='h-[200px]'>
                    <Line
                      data={{
                        labels: latencySeries.labels,
                        datasets: [
                          {
                            label: 'latency',
                            data: latencySeries.data,
                            borderColor: 'rgba(59, 130, 246, 1)',
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            tension: 0.25,
                          },
                        ],
                      }}
                      options={{ responsive: true, maintainAspectRatio: false }}
                    />
                  </div>
                </div>
              )}

              {throughputSeries && (
                <div>
                  <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                    吞吐与 RPS
                  </h4>
                  <div className='h-[200px]'>
                    <Bar
                      data={{
                        labels: throughputSeries.labels,
                        datasets: [
                          {
                            label: 'value',
                            data: throughputSeries.data,
                            backgroundColor: ['rgba(34, 197, 94, 0.7)', 'rgba(249, 115, 22, 0.7)'],
                          },
                        ],
                      }}
                      options={{ responsive: true, maintainAspectRatio: false }}
                    />
                  </div>
                </div>
              )}

              {rtDistribution && (
                <div>
                  <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                    响应时间分布
                  </h4>
                  <div className='h-[200px]'>
                    <Bar
                      data={{
                        labels: rtDistribution.labels,
                        datasets: [
                          {
                            label: '请求数',
                            data: rtDistribution.data,
                            backgroundColor: [
                              'rgba(34, 197, 94, 0.7)',
                              'rgba(59, 130, 246, 0.7)',
                              'rgba(168, 85, 247, 0.7)',
                              'rgba(249, 115, 22, 0.7)',
                              'rgba(239, 68, 68, 0.7)',
                              'rgba(220, 38, 38, 0.7)',
                              'rgba(153, 27, 27, 0.7)',
                            ],
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                        },
                      }}
                    />
                  </div>
                </div>
              )}

              {statusCodeDist && (
                <div>
                  <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                    HTTP 状态码分布
                  </h4>
                  <div className='h-[200px]'>
                    <Bar
                      data={{
                        labels: statusCodeDist.labels,
                        datasets: [
                          {
                            label: '请求数',
                            data: statusCodeDist.data,
                            backgroundColor: statusCodeDist.labels.map(code => {
                              if (code === '2xx') return 'rgba(34, 197, 94, 0.7)';
                              if (code === '3xx') return 'rgba(59, 130, 246, 0.7)';
                              if (code === '4xx') return 'rgba(249, 115, 22, 0.7)';
                              if (code === '5xx') return 'rgba(239, 68, 68, 0.7)';
                              return 'rgba(156, 163, 175, 0.7)';
                            }),
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                      }}
                    />
                  </div>
                </div>
              )}

              {timelineRps && timelineSeries && (
                <div>
                  <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                    并发连接趋势
                  </h4>
                  <div className='h-[200px]'>
                    <Line
                      data={{
                        labels: timelineSeries.labels,
                        datasets: [
                          {
                            label: '活跃连接数',
                            data: timelineRps,
                            borderColor: 'rgba(34, 197, 94, 1)',
                            backgroundColor: 'rgba(34, 197, 94, 0.15)',
                            tension: 0.25,
                            fill: true,
                          },
                        ],
                      }}
                      options={{ responsive: true, maintainAspectRatio: false }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StressChartPanel;
