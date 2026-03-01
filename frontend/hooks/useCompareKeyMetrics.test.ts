import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCompareKeyMetrics } from './useCompareKeyMetrics';

const emptyCompareData = {
  summary: null,
  metrics: [],
  warnings: [],
  errors: [],
};

const baseParams = {
  detail: null,
  summary: null,
  metrics: [] as Array<Record<string, unknown>>,
  warnings: [] as unknown[],
  errors: [] as unknown[],
  compareData: emptyCompareData,
  baseFullPayload: null,
  compareFullPayload: null,
  compareId: null,
};

describe('useCompareKeyMetrics', () => {
  it('returns empty array when detail is null and no compareId', () => {
    const { result } = renderHook(() => useCompareKeyMetrics(baseParams));
    expect(result.current).toEqual([]);
  });

  it('returns empty array when compareId is null for unknown engine types', () => {
    const { result } = renderHook(() =>
      useCompareKeyMetrics({
        ...baseParams,
        detail: { testType: 'unknown' },
      })
    );
    expect(result.current).toEqual([]);
  });

  it('returns performance metrics (score, LCP, FCP, CLS, TTFB) for performance engine', () => {
    const { result } = renderHook(() =>
      useCompareKeyMetrics({
        ...baseParams,
        detail: { testType: 'performance' },
        summary: { score: 85 },
        compareData: {
          ...emptyCompareData,
          summary: { score: 78 },
        },
        baseFullPayload: {
          details: {
            results: {
              performance: {
                webVitals: {
                  lcp: { value: 2500 },
                  fcp: { value: 1200 },
                  cls: { value: 0.1 },
                  ttfb: { value: 300 },
                },
              },
            },
          },
        },
        compareFullPayload: {
          details: {
            results: {
              performance: {
                webVitals: {
                  lcp: { value: 3000 },
                  fcp: { value: 1500 },
                  cls: { value: 0.15 },
                  ttfb: { value: 400 },
                },
              },
            },
          },
        },
        compareId: 'compare-1',
      })
    );

    expect(result.current.length).toBe(5);
    expect(result.current[0]).toMatchObject({ label: '评分', base: 85, target: 78 });
    expect(result.current[1]).toMatchObject({ label: 'LCP(ms)', base: 2500, target: 3000 });
    expect(result.current[2]).toMatchObject({ label: 'FCP(ms)', base: 1200, target: 1500 });
    expect(result.current[3]).toMatchObject({ label: 'CLS', base: 0.1, target: 0.15 });
    expect(result.current[4]).toMatchObject({ label: 'TTFB(ms)', base: 300, target: 400 });
  });

  it('correctly marks improved/regressed for performance (lower is better)', () => {
    const { result } = renderHook(() =>
      useCompareKeyMetrics({
        ...baseParams,
        detail: { testType: 'performance' },
        summary: { score: 90 },
        compareData: {
          ...emptyCompareData,
          summary: { score: 80 },
        },
        baseFullPayload: {
          details: {
            results: {
              performance: {
                webVitals: {
                  lcp: { value: 2000 },
                },
              },
            },
          },
        },
        compareFullPayload: {
          details: {
            results: {
              performance: {
                webVitals: {
                  lcp: { value: 3000 },
                },
              },
            },
          },
        },
        compareId: 'compare-2',
      })
    );

    const scoreRow = result.current.find(r => r.label === '评分');
    expect(scoreRow).toBeDefined();
    expect(scoreRow?.type).toBe('number');
    if (scoreRow?.type === 'number') {
      expect(scoreRow.improved).toBe(true);
      expect(scoreRow.regressed).toBe(false);
    }

    const lcpRow = result.current.find(r => r.label === 'LCP(ms)');
    expect(lcpRow).toBeDefined();
    if (lcpRow?.type === 'number') {
      // LCP: lower is better, base 2000 < target 3000 → improved
      expect(lcpRow.improved).toBe(true);
      expect(lcpRow.regressed).toBe(false);
    }
  });

  it('returns stress metrics for stress engine', () => {
    const { result } = renderHook(() =>
      useCompareKeyMetrics({
        ...baseParams,
        detail: { testType: 'stress' },
        summary: { averageResponseTime: 150, throughput: 500, errorRate: 2, successRate: 98 },
        compareData: {
          ...emptyCompareData,
          summary: { averageResponseTime: 200, throughput: 400, errorRate: 5, successRate: 95 },
        },
        compareId: 'compare-3',
      })
    );

    expect(result.current.length).toBe(4);
    expect(result.current.map(r => r.label)).toEqual([
      '平均响应时间(ms)',
      '吞吐量',
      '错误率(%)',
      '成功率(%)',
    ]);
  });

  it('returns security metrics for security engine', () => {
    const { result } = renderHook(() =>
      useCompareKeyMetrics({
        ...baseParams,
        detail: { testType: 'security' },
        summary: { score: 70, totalIssues: 5, criticalIssues: 1, highRiskIssues: 2 },
        compareData: {
          ...emptyCompareData,
          summary: { score: 60, totalIssues: 8, criticalIssues: 3, highRiskIssues: 4 },
        },
        baseFullPayload: { details: { results: { security: { riskLevel: 'Medium' } } } },
        compareFullPayload: { details: { results: { security: { riskLevel: 'High' } } } },
        compareId: 'compare-4',
      })
    );

    expect(result.current.length).toBe(5);
    const riskRow = result.current.find(r => r.label === '风险等级');
    expect(riskRow).toBeDefined();
    expect(riskRow?.type).toBe('text');
    if (riskRow?.type === 'text') {
      expect(riskRow.base).toBe('Medium');
      expect(riskRow.target).toBe('High');
    }
  });

  it('returns seo metrics for seo engine', () => {
    const { result } = renderHook(() =>
      useCompareKeyMetrics({
        ...baseParams,
        detail: { testType: 'seo' },
        summary: { score: 92 },
        compareData: {
          ...emptyCompareData,
          summary: { score: 85 },
        },
        baseFullPayload: { details: { results: { seo: { pageSpeedScore: 95, mobileFriendly: true } } } },
        compareFullPayload: { details: { results: { seo: { pageSpeedScore: 80, mobileFriendly: false } } } },
        compareId: 'compare-5',
      })
    );

    expect(result.current.length).toBe(3);
    const mobileRow = result.current.find(r => r.label === '移动端友好');
    expect(mobileRow?.type).toBe('text');
    if (mobileRow?.type === 'text') {
      expect(mobileRow.base).toBe('是');
      expect(mobileRow.target).toBe('否');
    }
  });

  it('returns generic fallback metrics when engine type is unknown but compareId is set', () => {
    const { result } = renderHook(() =>
      useCompareKeyMetrics({
        ...baseParams,
        detail: { testType: 'custom' },
        summary: { score: 50 },
        errors: ['err1'],
        warnings: ['warn1', 'warn2'],
        compareData: {
          summary: { score: 60 },
          metrics: [],
          errors: ['err1', 'err2'],
          warnings: ['warn1'],
        },
        compareId: 'compare-6',
      })
    );

    expect(result.current.length).toBe(3);
    expect(result.current[0]).toMatchObject({ label: '评分', base: 50, target: 60 });
    expect(result.current[1]).toMatchObject({ label: '错误数', base: 1, target: 2 });
    expect(result.current[2]).toMatchObject({ label: '告警数', base: 2, target: 1 });
  });

  it('skips null-valued rows via compact', () => {
    const { result } = renderHook(() =>
      useCompareKeyMetrics({
        ...baseParams,
        detail: { testType: 'performance' },
        // No score, no vitals → all buildNumeric calls return null
        summary: {},
        compareData: { ...emptyCompareData, summary: {} },
        baseFullPayload: null,
        compareFullPayload: null,
        compareId: 'compare-7',
      })
    );

    expect(result.current).toEqual([]);
  });
});
