import { useMemo } from 'react';

import type { CompareKeyMetricRow } from '../components/history/CompareTabContent';

interface UseCompareKeyMetricsParams {
  detail: Record<string, unknown> | null;
  summary: Record<string, unknown> | null;
  metrics: Array<Record<string, unknown>>;
  warnings: unknown[];
  errors: unknown[];
  compareData: {
    summary: Record<string, unknown> | null;
    metrics: Array<Record<string, unknown>>;
    warnings: unknown[];
    errors: unknown[];
  };
  baseFullPayload: Record<string, unknown> | null;
  compareFullPayload: Record<string, unknown> | null;
  compareId: string | null;
}

const toNumber = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const getRecord = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const getByPath = (obj: Record<string, unknown> | null, path: string[]) => {
  let current: unknown = obj;
  for (const key of path) {
    const record = getRecord(current);
    if (!record) {
      return undefined;
    }
    current = record[key];
  }
  return current;
};

const pickMetricNumber = (
  list: Array<Record<string, unknown>>,
  names: string[]
): number | null => {
  const normalized = names.map(n => n.toLowerCase());
  for (const metric of list) {
    const key = String(
      metric.metric || metric.metric_name || metric.metricName || ''
    ).toLowerCase();
    if (!key) {
      continue;
    }
    if (normalized.some(n => key === n || key.includes(n))) {
      const value = metric.value ?? metric.score ?? metric.p95 ?? metric.p99;
      const numeric = toNumber(value);
      if (numeric !== null) {
        return numeric;
      }
    }
  }
  return null;
};

const buildNumeric = (
  label: string,
  base: number | null,
  target: number | null,
  betterWhen: 'higher' | 'lower'
) => {
  if (base === null && target === null) {
    return null;
  }
  const delta = base !== null && target !== null ? base - target : null;
  const improved = delta === null ? null : betterWhen === 'higher' ? delta > 0 : delta < 0;
  const regressed = delta === null ? null : betterWhen === 'higher' ? delta < 0 : delta > 0;
  return {
    type: 'number' as const,
    label,
    base,
    target,
    delta,
    improved,
    regressed,
    betterWhen,
  };
};

const buildText = (label: string, base: string, target: string) => ({
  type: 'text' as const,
  label,
  base,
  target,
});

const compact = (rows: Array<CompareKeyMetricRow | null>): CompareKeyMetricRow[] =>
  rows.filter((row): row is CompareKeyMetricRow => row !== null);

export const useCompareKeyMetrics = ({
  detail,
  summary,
  metrics,
  warnings,
  errors,
  compareData,
  baseFullPayload,
  compareFullPayload,
  compareId,
}: UseCompareKeyMetricsParams): CompareKeyMetricRow[] => {
  return useMemo<CompareKeyMetricRow[]>(() => {
    const engineType = String(detail?.testType || detail?.engine || '').toLowerCase();

    const baseSummary = summary || {};
    const targetSummary = compareData.summary || {};

    const baseMetrics = metrics;
    const targetMetrics = compareData.metrics;

    if (engineType === 'performance') {
      const basePerf = getRecord(getByPath(baseFullPayload, ['details', 'results', 'performance']));
      const targetPerf = getRecord(
        getByPath(compareFullPayload, ['details', 'results', 'performance'])
      );
      const baseVitals = getRecord(basePerf?.webVitals);
      const targetVitals = getRecord(targetPerf?.webVitals);

      const lcp = buildNumeric(
        'LCP(ms)',
        toNumber(getByPath(baseVitals || null, ['lcp', 'value'])),
        toNumber(getByPath(targetVitals || null, ['lcp', 'value'])),
        'lower'
      );
      const fcp = buildNumeric(
        'FCP(ms)',
        toNumber(getByPath(baseVitals || null, ['fcp', 'value'])),
        toNumber(getByPath(targetVitals || null, ['fcp', 'value'])),
        'lower'
      );
      const cls = buildNumeric(
        'CLS',
        toNumber(getByPath(baseVitals || null, ['cls', 'value'])),
        toNumber(getByPath(targetVitals || null, ['cls', 'value'])),
        'lower'
      );
      const ttfb = buildNumeric(
        'TTFB(ms)',
        toNumber(getByPath(baseVitals || null, ['ttfb', 'value'])),
        toNumber(getByPath(targetVitals || null, ['ttfb', 'value'])),
        'lower'
      );
      const score = buildNumeric(
        '评分',
        toNumber((baseSummary as Record<string, unknown>).score),
        toNumber((targetSummary as Record<string, unknown>).score),
        'higher'
      );

      return compact([score, lcp, fcp, cls, ttfb]);
    }

    if (engineType === 'stress') {
      const avgRt =
        toNumber((baseSummary as Record<string, unknown>).averageResponseTime) ??
        pickMetricNumber(baseMetrics, [
          'averageResponseTime',
          'avgResponseTime',
          'responseTime',
          'latency',
        ]);
      const avgRtTarget =
        toNumber((targetSummary as Record<string, unknown>).averageResponseTime) ??
        pickMetricNumber(targetMetrics, [
          'averageResponseTime',
          'avgResponseTime',
          'responseTime',
          'latency',
        ]);
      const throughput =
        toNumber((baseSummary as Record<string, unknown>).throughput) ??
        pickMetricNumber(baseMetrics, ['throughput', 'rps', 'requestsPerSecond']);
      const throughputTarget =
        toNumber((targetSummary as Record<string, unknown>).throughput) ??
        pickMetricNumber(targetMetrics, ['throughput', 'rps', 'requestsPerSecond']);
      const errorRate =
        toNumber((baseSummary as Record<string, unknown>).errorRate) ??
        pickMetricNumber(baseMetrics, ['errorRate', 'errors']);
      const errorRateTarget =
        toNumber((targetSummary as Record<string, unknown>).errorRate) ??
        pickMetricNumber(targetMetrics, ['errorRate', 'errors']);
      const successRate =
        toNumber((baseSummary as Record<string, unknown>).successRate) ??
        pickMetricNumber(baseMetrics, ['successRate']);
      const successRateTarget =
        toNumber((targetSummary as Record<string, unknown>).successRate) ??
        pickMetricNumber(targetMetrics, ['successRate']);

      return compact([
        buildNumeric('平均响应时间(ms)', avgRt, avgRtTarget, 'lower'),
        buildNumeric('吞吐量', throughput, throughputTarget, 'higher'),
        buildNumeric('错误率(%)', errorRate, errorRateTarget, 'lower'),
        buildNumeric('成功率(%)', successRate, successRateTarget, 'higher'),
      ]);
    }

    if (engineType === 'security') {
      const baseSec = getRecord(getByPath(baseFullPayload, ['details', 'results', 'security']));
      const targetSec = getRecord(
        getByPath(compareFullPayload, ['details', 'results', 'security'])
      );
      const baseRisk = String(
        baseSec?.riskLevel ?? (baseSummary as Record<string, unknown>).rating ?? ''
      );
      const targetRisk = String(
        targetSec?.riskLevel ?? (targetSummary as Record<string, unknown>).rating ?? ''
      );

      return compact([
        buildNumeric(
          '评分',
          toNumber((baseSummary as Record<string, unknown>).score),
          toNumber((targetSummary as Record<string, unknown>).score),
          'higher'
        ),
        buildNumeric(
          'Total Issues',
          toNumber((baseSummary as Record<string, unknown>).totalIssues),
          toNumber((targetSummary as Record<string, unknown>).totalIssues),
          'lower'
        ),
        buildNumeric(
          'Critical Issues',
          toNumber((baseSummary as Record<string, unknown>).criticalIssues),
          toNumber((targetSummary as Record<string, unknown>).criticalIssues),
          'lower'
        ),
        buildNumeric(
          'High Risk Issues',
          toNumber((baseSummary as Record<string, unknown>).highRiskIssues),
          toNumber((targetSummary as Record<string, unknown>).highRiskIssues),
          'lower'
        ),
        baseRisk || targetRisk ? buildText('风险等级', baseRisk || '-', targetRisk || '-') : null,
      ]);
    }

    if (engineType === 'seo') {
      const baseSeo = getRecord(getByPath(baseFullPayload, ['details', 'results', 'seo']));
      const targetSeo = getRecord(getByPath(compareFullPayload, ['details', 'results', 'seo']));

      const pageSpeed = buildNumeric(
        'PageSpeed',
        toNumber(baseSeo?.pageSpeedScore),
        toNumber(targetSeo?.pageSpeedScore),
        'higher'
      );
      const score = buildNumeric(
        '评分',
        toNumber((baseSummary as Record<string, unknown>).score),
        toNumber((targetSummary as Record<string, unknown>).score),
        'higher'
      );
      const mobile = buildText(
        '移动端友好',
        baseSeo?.mobileFriendly === true ? '是' : baseSeo?.mobileFriendly === false ? '否' : '-',
        targetSeo?.mobileFriendly === true ? '是' : targetSeo?.mobileFriendly === false ? '否' : '-'
      );

      return compact([score, pageSpeed, mobile]);
    }

    if (!compareId) {
      return [];
    }

    return compact([
      buildNumeric(
        '评分',
        toNumber((baseSummary as Record<string, unknown>).score),
        toNumber((targetSummary as Record<string, unknown>).score),
        'higher'
      ),
      buildNumeric(
        '错误数',
        Array.isArray(errors) ? errors.length : 0,
        Array.isArray(compareData.errors) ? compareData.errors.length : 0,
        'lower'
      ),
      buildNumeric(
        '告警数',
        Array.isArray(warnings) ? warnings.length : 0,
        Array.isArray(compareData.warnings) ? compareData.warnings.length : 0,
        'lower'
      ),
    ]);
  }, [
    compareData.errors,
    compareData.metrics,
    compareData.summary,
    compareData.warnings,
    compareFullPayload,
    compareId,
    detail?.engine,
    detail?.testType,
    errors,
    metrics,
    summary,
    warnings,
    baseFullPayload,
  ]);
};
