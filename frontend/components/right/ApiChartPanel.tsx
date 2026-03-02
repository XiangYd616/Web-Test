import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { useTestConfig, useTestResult } from '../../context/TestContext';
import { parseResultPayloadText } from '../../utils/testResult';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type ApiEndpointResult = {
  url?: unknown;
  method?: unknown;
  responseTime?: unknown;
  summary?: Record<string, unknown>;
  status?: Record<string, unknown>;
  validations?: {
    passed?: boolean;
    total?: number;
    failedCount?: number;
    results?: Array<{ passed?: boolean; message?: string }>;
  };
  error?: unknown;
  responseBody?: string;
  responseHeaders?: Record<string, string | undefined>;
  extractions?: Record<string, string>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const ResponseInspector = ({
  sample,
  sampleSummary,
  requestMeta,
  requestHeaders,
  apiConfig,
}: {
  sample: ApiEndpointResult;
  sampleSummary: Record<string, unknown>;
  requestMeta: Record<string, unknown>;
  requestHeaders: unknown[];
  apiConfig: Record<string, unknown> | null;
}) => {
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body');
  const [bodyView, setBodyView] = useState<'pretty' | 'raw'>('pretty');

  const rawBody = sample.responseBody ?? '';
  const resHeaders = sample.responseHeaders ?? {};
  const headerEntries = Object.entries(resHeaders).filter(([, v]) => v !== undefined) as Array<
    [string, string]
  >;

  const prettyBody = useMemo(() => {
    if (!rawBody) return '';
    try {
      return JSON.stringify(JSON.parse(rawBody), null, 2);
    } catch {
      return rawBody;
    }
  }, [rawBody]);

  return (
    <div>
      <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
        请求 / 响应详情
      </h4>
      <div className='grid gap-4'>
        {/* Request */}
        <Card className='bg-muted/20 border-none shadow-none'>
          <CardHeader className='p-3 border-b border-border/50'>
            <CardTitle className='text-sm font-medium'>Request</CardTitle>
          </CardHeader>
          <CardContent className='p-3 text-sm space-y-2 font-mono'>
            <div>
              <span className='font-semibold'>URL: </span>
              <span className='text-muted-foreground break-all'>
                {String(sample.url ?? apiConfig?.url ?? '-')}
              </span>
            </div>
            <div>
              <span className='font-semibold'>Method: </span>
              <span className='text-muted-foreground'>
                {String(sample.method ?? requestMeta.method ?? '-')}
              </span>
            </div>
            <div>
              <span className='font-semibold'>Headers: </span>
              <span className='text-muted-foreground break-all'>
                {Array.isArray(requestHeaders) && requestHeaders.length
                  ? requestHeaders
                      .map(h => {
                        const rec = h as Record<string, unknown>;
                        return `${rec.key}: ${rec.value}`;
                      })
                      .join(', ')
                  : '-'}
              </span>
            </div>
            {requestMeta.body ? (
              <div>
                <span className='font-semibold'>Body: </span>
                <pre className='text-muted-foreground mt-1 text-xs whitespace-pre-wrap break-all max-h-[120px] overflow-auto bg-muted/30 rounded p-2'>
                  {String(requestMeta.body)}
                </pre>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Response */}
        <Card className='bg-muted/20 border-none shadow-none'>
          <CardHeader className='p-3 border-b border-border/50 flex flex-row items-center justify-between'>
            <CardTitle className='text-sm font-medium'>
              Response
              <Badge variant='outline' className='ml-2 font-mono text-xs'>
                {String(sampleSummary.statusCode ?? '-')}
              </Badge>
              <span className='ml-2 text-xs text-muted-foreground font-normal'>
                {String(sampleSummary.responseTime ?? '-')}
              </span>
              {typeof sampleSummary.contentType === 'string' &&
                sampleSummary.contentType !== 'unknown' && (
                  <span className='ml-2 text-xs text-muted-foreground font-normal'>
                    {sampleSummary.contentType}
                  </span>
                )}
              {sampleSummary.contentLength != null && Number(sampleSummary.contentLength) > 0 && (
                <span className='ml-1 text-xs text-muted-foreground font-normal'>
                  ({String(sampleSummary.contentLength)}B)
                </span>
              )}
            </CardTitle>
            <div className='flex gap-1'>
              <button
                type='button'
                onClick={() => setResponseTab('body')}
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium border transition-all',
                  responseTab === 'body'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                )}
              >
                Body
              </button>
              <button
                type='button'
                onClick={() => setResponseTab('headers')}
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium border transition-all',
                  responseTab === 'headers'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                )}
              >
                Headers
                {headerEntries.length > 0 && (
                  <span className='ml-1 text-[10px] bg-primary/15 text-primary rounded-full px-1.5'>
                    {headerEntries.length}
                  </span>
                )}
              </button>
            </div>
          </CardHeader>
          <CardContent className='p-0'>
            {responseTab === 'body' && (
              <div>
                <div className='flex gap-1 px-3 pt-2'>
                  <button
                    type='button'
                    onClick={() => setBodyView('pretty')}
                    className={cn(
                      'px-2 py-0.5 rounded text-xs border transition-all',
                      bodyView === 'pretty'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Pretty
                  </button>
                  <button
                    type='button'
                    onClick={() => setBodyView('raw')}
                    className={cn(
                      'px-2 py-0.5 rounded text-xs border transition-all',
                      bodyView === 'raw'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Raw
                  </button>
                </div>
                <pre className='p-3 text-xs font-mono overflow-auto max-h-[320px] whitespace-pre-wrap break-all'>
                  {rawBody
                    ? bodyView === 'pretty'
                      ? prettyBody
                      : rawBody
                    : '(empty response body)'}
                </pre>
              </div>
            )}
            {responseTab === 'headers' && (
              <div className='divide-y'>
                {headerEntries.length === 0 ? (
                  <div className='p-3 text-xs text-muted-foreground'>无响应头</div>
                ) : (
                  headerEntries.map(([key, value]) => (
                    <div key={key} className='flex gap-3 px-3 py-1.5 text-xs font-mono'>
                      <span className='font-semibold min-w-[140px] shrink-0 break-all'>{key}</span>
                      <span className='text-muted-foreground break-all'>{value}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ApiChartPanel = () => {
  const { resultPayloadText } = useTestResult();
  const { updateConfigText } = useTestConfig();
  const [selectedEndpointIdx, setSelectedEndpointIdx] = useState(0);

  const parsedPayload = useMemo(
    () => parseResultPayloadText(resultPayloadText),
    [resultPayloadText]
  );

  // 多路径查找 API 测试结果数据，按优先级依次尝试：
  // 1. details.results.api.details  — api_test_results 子表数据
  // 2. details.results.api 整体    — engineDetails 包含 ApiBatchResult
  // 3. details 本身                — ApiFinalResult 直接在 details 中
  // 4. summary.apiSummary/apiResults — UserTestManager 嵌入的 fallback
  const apiDetails = useMemo<Record<string, unknown> | null>(() => {
    if (!parsedPayload) return null;

    const tryRecord = (v: unknown): Record<string, unknown> | null =>
      v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

    // 判断是否像 ApiBatchResult（有 summary 对象或 results 数组）
    const looksLikeBatch = (o: Record<string, unknown>) =>
      tryRecord(o.summary) !== null || Array.isArray(o.results);

    // 路径 1: details.results.api.details（子表数据）
    const detailsResults = tryRecord(parsedPayload.details?.results);
    const engineResult = detailsResults
      ? tryRecord((detailsResults as Record<string, unknown>).api)
      : null;
    if (engineResult) {
      const subDetails = tryRecord((engineResult as { details?: unknown }).details);
      if (subDetails && looksLikeBatch(subDetails)) return subDetails;
    }

    // 路径 2: details.results.api 整体（engineDetails 包含 results/summary）
    if (engineResult && looksLikeBatch(engineResult)) return engineResult;

    // 路径 3: details 本身（ApiFinalResult.results = ApiBatchResult）
    const details = tryRecord(parsedPayload.details);
    if (details) {
      const innerResults = tryRecord((details as { results?: unknown }).results);
      if (innerResults && looksLikeBatch(innerResults)) return innerResults;
      if (looksLikeBatch(details)) return details;
    }

    // 路径 4: summary 中嵌入的 apiSummary/apiResults（fallback）
    const summary = tryRecord(parsedPayload.summary);
    if (summary) {
      const s = summary as Record<string, unknown>;
      if (s.apiSummary || s.apiResults) {
        return {
          results: s.apiResults
            ? { results: s.apiResults, recommendations: s.apiRecommendations }
            : undefined,
          summary: s.apiSummary,
        };
      }
    }

    return null;
  }, [parsedPayload]);

  const apiResults = useMemo(() => {
    if (!apiDetails) {
      return null;
    }
    const raw = (apiDetails as { results?: unknown }).results;
    if (Array.isArray(raw)) {
      return raw as ApiEndpointResult[];
    }
    if (isRecord(raw)) {
      const maybeList = raw.results;
      if (Array.isArray(maybeList)) {
        return maybeList as ApiEndpointResult[];
      }
      return [raw as ApiEndpointResult];
    }
    return null;
  }, [apiDetails]);

  const apiSummary = useMemo(() => {
    if (!apiDetails) {
      return null;
    }
    const summary = (apiDetails as { summary?: unknown }).summary;
    return isRecord(summary) ? summary : null;
  }, [apiDetails]);

  const apiRecommendations = useMemo(() => {
    if (!apiDetails) return [];
    const raw = (apiDetails as { results?: unknown }).results;
    // 从 batchResult.recommendations 获取
    if (isRecord(raw)) {
      const recs = (raw as { recommendations?: unknown }).recommendations;
      if (Array.isArray(recs)) return recs.filter((r): r is string => typeof r === 'string');
    }
    // 从单端点结果获取
    if (apiResults && apiResults.length > 0) {
      const allRecs: string[] = [];
      for (const r of apiResults) {
        const recs = (r as { recommendations?: unknown }).recommendations;
        if (Array.isArray(recs)) {
          for (const rec of recs) {
            if (typeof rec === 'string' && !allRecs.includes(rec)) allRecs.push(rec);
          }
        }
      }
      return allRecs;
    }
    return [];
  }, [apiDetails, apiResults]);

  const apiConfig = useMemo(() => {
    if (!apiDetails) {
      return null;
    }
    const config = (apiDetails as { config?: unknown }).config;
    return isRecord(config) ? config : null;
  }, [apiDetails]);

  const chainVariables = useMemo(() => {
    if (!apiDetails) return null;
    const raw = (apiDetails as { results?: unknown }).results;
    if (isRecord(raw)) {
      const cv = (raw as { chainVariables?: unknown }).chainVariables;
      if (isRecord(cv) && Object.keys(cv).length > 0) return cv as Record<string, unknown>;
    }
    return null;
  }, [apiDetails]);

  const statusCodeCounts = useMemo(() => {
    const counts = new Map<string, number>();

    const fromSummary = apiSummary?.statusCodes;
    if (isRecord(fromSummary)) {
      Object.entries(fromSummary).forEach(([key, value]) => {
        const n = Number(value);
        if (Number.isFinite(n)) {
          counts.set(key, n);
        }
      });
      return counts;
    }

    apiResults?.forEach(item => {
      const summary = isRecord(item.summary) ? item.summary : {};
      const code = summary.statusCode ?? (item.status as Record<string, unknown> | undefined)?.code;
      const key = Number.isFinite(Number(code)) ? String(code) : 'ERR';
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return counts;
  }, [apiResults, apiSummary]);

  const latencyBuckets = useMemo(() => {
    const buckets = [
      { label: '0-100ms', min: 0, max: 100, count: 0 },
      { label: '100-300ms', min: 100, max: 300, count: 0 },
      { label: '300-500ms', min: 300, max: 500, count: 0 },
      { label: '500-1000ms', min: 500, max: 1000, count: 0 },
      { label: '1-3s', min: 1000, max: 3000, count: 0 },
      { label: '3s+', min: 3000, max: Infinity, count: 0 },
    ];

    apiResults?.forEach(item => {
      const value = Number(item.responseTime ?? 0);
      if (!Number.isFinite(value)) {
        return;
      }
      const bucket = buckets.find(b => value >= b.min && value < b.max);
      if (bucket) {
        bucket.count += 1;
      }
    });

    return buckets;
  }, [apiResults]);

  const assertionsSummary = useMemo(() => {
    let total = 0;
    let failed = 0;
    const failures = new Map<string, number>();

    apiResults?.forEach(item => {
      const validations = item.validations;
      if (!validations) {
        return;
      }
      const totalCount = Number(validations.total ?? 0);
      total += Number.isFinite(totalCount) ? totalCount : 0;
      const failedCount = Number(validations.failedCount ?? 0);
      failed += Number.isFinite(failedCount) ? failedCount : 0;

      const results = validations.results || [];
      results.forEach(result => {
        if (result.passed === false) {
          const key = result.message || '断言失败';
          failures.set(key, (failures.get(key) || 0) + 1);
        }
      });
    });

    const topFailures = Array.from(failures.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { total, failed, topFailures };
  }, [apiResults]);

  const parseMs = (value: unknown) => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const numeric = Number(value.replace(/ms$/i, '').trim());
      return Number.isFinite(numeric) ? numeric : null;
    }
    return null;
  };

  const avgLatency = useMemo(() => {
    const fromSummary = apiSummary?.averageResponseTime ?? apiSummary?.responseTime;
    const summaryValue = parseMs(fromSummary);
    if (summaryValue !== null) {
      return summaryValue;
    }
    if (!apiResults || apiResults.length === 0) {
      return null;
    }
    const values = apiResults
      .map(item => Number(item.responseTime ?? 0))
      .filter(value => Number.isFinite(value));
    if (values.length === 0) {
      return null;
    }
    return Math.round(values.reduce((acc, value) => acc + value, 0) / values.length);
  }, [apiResults, apiSummary]);

  // 安全头 & CORS 详情（从第一个端点的 analysis.headers 提取）
  const securityInfo = useMemo(() => {
    if (!apiResults || apiResults.length === 0) return null;
    // 选取第一个有 headers 分析的端点
    for (const ep of apiResults) {
      const headers = (ep as Record<string, unknown>).headers;
      if (!isRecord(headers)) continue;
      const security = (headers as { security?: unknown }).security;
      if (!isRecord(security)) continue;
      const sec = security as Record<string, unknown>;
      const hasSecurityHeaders = isRecord(sec.hasSecurityHeaders)
        ? (sec.hasSecurityHeaders as Record<string, boolean>)
        : null;
      const score = isRecord(sec.securityHeaderScore)
        ? (sec.securityHeaderScore as { present?: number; total?: number })
        : null;
      const corsDetails = isRecord(sec.corsDetails)
        ? (sec.corsDetails as {
            allowOrigin?: string;
            allowMethods?: string;
            allowHeaders?: string;
            allowCredentials?: boolean;
            isWildcard?: boolean;
          })
        : null;
      const rateLimiting = isRecord((headers as Record<string, unknown>).rateLimiting)
        ? ((headers as Record<string, unknown>).rateLimiting as Record<string, string | null>)
        : null;
      const apiVersion =
        typeof (headers as Record<string, unknown>).apiVersion === 'string'
          ? ((headers as Record<string, unknown>).apiVersion as string)
          : null;
      return {
        hasSecurityHeaders,
        score,
        hasCORS: sec.hasCORS === true,
        corsDetails,
        hasHttps: sec.hasHttps === true,
        rateLimiting,
        apiVersion,
        compression:
          typeof (headers as Record<string, unknown>).compression === 'string'
            ? ((headers as Record<string, unknown>).compression as string)
            : null,
        server:
          typeof (headers as Record<string, unknown>).server === 'string'
            ? ((headers as Record<string, unknown>).server as string)
            : null,
      };
    }
    return null;
  }, [apiResults]);

  const totalEndpoints = Number(apiSummary?.total ?? apiResults?.length ?? 0);
  const successRate = apiSummary?.successRate ? String(apiSummary.successRate) : null;

  const sample = apiResults?.[selectedEndpointIdx] ?? apiResults?.[0] ?? null;
  const sampleSummary = sample && isRecord(sample.summary) ? sample.summary : {};
  const requestConfig = apiConfig && isRecord(apiConfig.options) ? apiConfig.options : {};
  const requestMeta = requestConfig && isRecord(requestConfig.request) ? requestConfig.request : {};
  const requestHeaders = Array.isArray(requestMeta.headers) ? requestMeta.headers : [];

  const handleReplay = () => {
    if (!apiConfig) {
      toast.info('暂无可重放的配置');
      return;
    }
    const options = isRecord(apiConfig.options)
      ? (apiConfig.options as Record<string, unknown>)
      : {};
    const request = isRecord(options.request) ? (options.request as Record<string, unknown>) : {};
    const history = isRecord(options.history) ? (options.history as Record<string, unknown>) : {};
    const advanced = isRecord(options.advanced)
      ? ({ ...options.advanced } as Record<string, unknown>)
      : {};

    if (typeof apiConfig.concurrency === 'number' && advanced.concurrency === undefined) {
      advanced.concurrency = apiConfig.concurrency;
    }
    if (typeof apiConfig.duration === 'number' && advanced.duration === undefined) {
      advanced.duration = apiConfig.duration;
    }

    const headerList = Array.isArray((request as { headers?: unknown }).headers)
      ? ((request as { headers?: unknown }).headers as unknown[])
      : [];
    const normalizedHeaders = headerList
      .map(item => {
        if (!isRecord(item)) {
          return null;
        }
        const key = String(item.key ?? '');
        if (!key) {
          return null;
        }
        return {
          key,
          value: String(item.value ?? ''),
          enabled: 'enabled' in item ? Boolean(item.enabled) : true,
        };
      })
      .filter(Boolean);

    const editorConfig = {
      testType: String(apiConfig.testType ?? apiConfig.engineType ?? 'api'),
      url: String(apiConfig.url ?? ''),
      request: {
        ...request,
        headers: normalizedHeaders.length ? normalizedHeaders : requestHeaders,
      },
      history,
      advanced,
      options,
      // 恢复 API 测试元数据（断言、端点、变量、提取规则）
      ...(apiConfig.assertions ? { assertions: apiConfig.assertions } : {}),
      ...(apiConfig.endpoints ? { endpoints: apiConfig.endpoints } : {}),
      ...(apiConfig.variables ? { variables: apiConfig.variables } : {}),
    };

    updateConfigText(JSON.stringify(editorConfig, null, 2));
    toast.success('已加载到 TestEditor');
  };

  const hasAny = Boolean(apiDetails);

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='py-3 px-4 border-b'>
        <CardTitle className='text-base font-medium'>API 测试概览</CardTitle>
      </CardHeader>
      <CardContent className='flex-1 overflow-auto p-4 space-y-6'>
        {!hasAny && (
          <div className='flex items-center justify-center py-16 text-sm text-muted-foreground'>
            运行 API 测试后，分析结果将在此展示
          </div>
        )}
        {hasAny && (
          <div className='space-y-6'>
            <div className='grid grid-cols-3 gap-4'>
              <div className='p-3 rounded-lg border bg-card text-card-foreground shadow-sm'>
                <div className='text-xs text-muted-foreground'>端点数量</div>
                <div className='text-2xl font-bold mt-1'>{totalEndpoints}</div>
              </div>
              <div className='p-3 rounded-lg border bg-card text-card-foreground shadow-sm'>
                <div className='text-xs text-muted-foreground'>平均延迟(ms)</div>
                <div className='text-2xl font-bold mt-1'>{avgLatency ?? '-'}</div>
              </div>
              <div className='p-3 rounded-lg border bg-card text-card-foreground shadow-sm'>
                <div className='text-xs text-muted-foreground'>成功率</div>
                <div className='text-2xl font-bold mt-1'>{successRate ?? '-'}</div>
              </div>
            </div>

            {statusCodeCounts.size > 0 && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  响应码分布
                </h4>
                <div className='h-[220px]'>
                  <Bar
                    data={{
                      labels: Array.from(statusCodeCounts.keys()),
                      datasets: [
                        {
                          label: 'count',
                          data: Array.from(statusCodeCounts.values()),
                          backgroundColor: 'rgba(59, 130, 246, 0.65)', // Blue-500 with opacity
                        },
                      ],
                    }}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </div>
              </div>
            )}

            {latencyBuckets.some(bucket => bucket.count > 0) && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  延迟分布
                </h4>
                <div className='h-[220px]'>
                  <Bar
                    data={{
                      labels: latencyBuckets.map(item => item.label),
                      datasets: [
                        {
                          label: 'count',
                          data: latencyBuckets.map(item => item.count),
                          backgroundColor: 'rgba(34, 197, 94, 0.65)', // Green-500 with opacity
                        },
                      ],
                    }}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </div>
              </div>
            )}

            {/* ── 端点结果列表 ── */}
            {apiResults && apiResults.length > 0 && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  端点结果
                </h4>
                <div className='rounded-md border divide-y'>
                  {apiResults.map((ep, idx) => {
                    const epSummary = isRecord(ep.summary) ? ep.summary : {};
                    const sc = Number(epSummary.statusCode ?? 0);
                    const ok = epSummary.success === true;
                    const epError = ep.error ?? (epSummary.error as string | undefined);
                    const vTotal = ep.validations?.total ?? 0;
                    const vFailed = ep.validations?.failedCount ?? 0;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          'px-3 py-2 text-sm flex items-start gap-3',
                          !ok && 'bg-red-50/50 dark:bg-red-950/10'
                        )}
                      >
                        <div className='flex items-center gap-1.5 shrink-0 mt-0.5'>
                          <span
                            className={cn(
                              'inline-block w-2 h-2 rounded-full shrink-0',
                              ok ? 'bg-green-500' : 'bg-red-500'
                            )}
                          />
                          <Badge variant='outline' className='text-[10px] font-mono'>
                            {String(ep.method ?? 'GET')}
                          </Badge>
                          <Badge
                            variant='outline'
                            className={cn(
                              'text-[10px] font-mono',
                              sc === 0
                                ? 'text-muted-foreground'
                                : sc >= 200 && sc < 300
                                  ? 'text-green-600 border-green-300'
                                  : sc >= 400
                                    ? 'text-red-600 border-red-300'
                                    : 'text-amber-600 border-amber-300'
                            )}
                          >
                            {sc || 'ERR'}
                          </Badge>
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='text-xs font-mono truncate text-muted-foreground'>
                            {String(ep.url ?? '-')}
                          </div>
                          {epError && (
                            <div className='text-xs text-red-600 dark:text-red-400 mt-0.5 break-all'>
                              {String(epError)}
                            </div>
                          )}
                          {vTotal > 0 && vFailed > 0 && (
                            <div className='text-xs text-amber-600 dark:text-amber-400 mt-0.5'>
                              断言: {vFailed}/{vTotal} 失败
                              {ep.validations?.results
                                ?.filter(r => r.passed === false)
                                .slice(0, 3)
                                .map((r, ri) => (
                                  <span key={ri} className='ml-1 text-[10px] text-muted-foreground'>
                                    • {r.message}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                        <div className='text-xs text-muted-foreground shrink-0 tabular-nums'>
                          {Number(ep.responseTime ?? 0)}ms
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 响应头安全分析 ── */}
            {securityInfo && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  响应头分析
                </h4>
                <div className='space-y-3'>
                  {/* 元信息 */}
                  <div className='flex flex-wrap gap-2'>
                    {securityInfo.server && securityInfo.server !== 'unknown' && (
                      <Badge variant='outline' className='text-[11px] font-normal'>
                        Server: {securityInfo.server}
                      </Badge>
                    )}
                    {securityInfo.compression && (
                      <Badge
                        variant='outline'
                        className='text-[11px] font-normal text-green-600 border-green-300 dark:text-green-400 dark:border-green-700'
                      >
                        {securityInfo.compression}
                      </Badge>
                    )}
                    {securityInfo.apiVersion && (
                      <Badge variant='outline' className='text-[11px] font-normal'>
                        API {securityInfo.apiVersion}
                      </Badge>
                    )}
                    {securityInfo.hasHttps && (
                      <Badge
                        variant='outline'
                        className='text-[11px] font-normal text-green-600 border-green-300 dark:text-green-400 dark:border-green-700'
                      >
                        HSTS
                      </Badge>
                    )}
                  </div>

                  {/* 安全头评分 */}
                  {securityInfo.hasSecurityHeaders && securityInfo.score && (
                    <div className='rounded-md border p-3'>
                      <div className='flex items-center justify-between mb-2'>
                        <span className='text-xs font-medium'>安全响应头</span>
                        <span
                          className={cn(
                            'text-xs font-semibold',
                            (securityInfo.score.present ?? 0) >= 5
                              ? 'text-green-600'
                              : (securityInfo.score.present ?? 0) >= 3
                                ? 'text-amber-600'
                                : 'text-red-600'
                          )}
                        >
                          {securityInfo.score.present}/{securityInfo.score.total}
                        </span>
                      </div>
                      <div className='flex flex-wrap gap-1.5'>
                        {Object.entries(securityInfo.hasSecurityHeaders).map(
                          ([header, present]) => (
                            <Badge
                              key={header}
                              variant='outline'
                              className={cn(
                                'text-[10px] font-mono',
                                present
                                  ? 'text-green-600 border-green-300 dark:text-green-400 dark:border-green-700'
                                  : 'text-red-500 border-red-300 dark:text-red-400 dark:border-red-700'
                              )}
                            >
                              {present ? '✓' : '✗'} {header}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* CORS 详情 */}
                  {securityInfo.hasCORS && securityInfo.corsDetails && (
                    <div className='rounded-md border p-3'>
                      <div className='flex items-center gap-2 mb-2'>
                        <span className='text-xs font-medium'>CORS</span>
                        {securityInfo.corsDetails.isWildcard && (
                          <Badge
                            variant='outline'
                            className='text-[10px] text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700'
                          >
                            通配符 *
                          </Badge>
                        )}
                      </div>
                      <div className='space-y-1 text-xs text-muted-foreground font-mono'>
                        <div>
                          <span className='font-semibold text-foreground'>Allow-Origin:</span>{' '}
                          {securityInfo.corsDetails.allowOrigin}
                        </div>
                        {securityInfo.corsDetails.allowMethods && (
                          <div>
                            <span className='font-semibold text-foreground'>Allow-Methods:</span>{' '}
                            {securityInfo.corsDetails.allowMethods}
                          </div>
                        )}
                        {securityInfo.corsDetails.allowHeaders && (
                          <div>
                            <span className='font-semibold text-foreground'>Allow-Headers:</span>{' '}
                            {securityInfo.corsDetails.allowHeaders}
                          </div>
                        )}
                        {securityInfo.corsDetails.allowCredentials && (
                          <div className='text-amber-600 dark:text-amber-400'>
                            Allow-Credentials: true
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 速率限制 */}
                  {securityInfo.rateLimiting && (
                    <div className='rounded-md border p-3'>
                      <span className='text-xs font-medium'>速率限制</span>
                      <div className='flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground font-mono'>
                        {securityInfo.rateLimiting.limit && (
                          <span>
                            Limit:{' '}
                            <span className='font-semibold text-foreground'>
                              {securityInfo.rateLimiting.limit}
                            </span>
                          </span>
                        )}
                        {securityInfo.rateLimiting.remaining && (
                          <span>
                            Remaining:{' '}
                            <span className='font-semibold text-foreground'>
                              {securityInfo.rateLimiting.remaining}
                            </span>
                          </span>
                        )}
                        {securityInfo.rateLimiting.reset && (
                          <span>
                            Reset:{' '}
                            <span className='font-semibold text-foreground'>
                              {securityInfo.rateLimiting.reset}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                断言概览
              </h4>
              <div className='flex gap-2 mb-3'>
                <Badge variant='outline'>断言总数: {assertionsSummary.total}</Badge>
                <Badge
                  className={cn(
                    'border-none text-white',
                    assertionsSummary.failed > 0
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-green-500 hover:bg-green-600'
                  )}
                >
                  失败断言: {assertionsSummary.failed}
                </Badge>
              </div>
              {assertionsSummary.topFailures.length > 0 && (
                <div className='rounded-md border'>
                  {assertionsSummary.topFailures.map((item, index) => (
                    <div
                      key={index}
                      className={cn(
                        'flex items-start gap-3 p-2 text-sm',
                        index !== 0 && 'border-t'
                      )}
                    >
                      <Badge variant='destructive' className='mt-0.5'>
                        {item.count}
                      </Badge>
                      <span className='break-all'>{item.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {apiRecommendations.length > 0 && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  优化建议
                </h4>
                <div className='rounded-md border divide-y'>
                  {apiRecommendations.map((rec, index) => (
                    <div key={index} className='px-3 py-2 text-sm text-muted-foreground'>
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {chainVariables && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  链式变量
                </h4>
                <div className='rounded-md border divide-y'>
                  {Object.entries(chainVariables).map(([key, value]) => (
                    <div key={key} className='flex gap-3 px-3 py-1.5 text-xs font-mono'>
                      <span className='font-semibold min-w-[100px] shrink-0 text-primary'>
                        {`{{${key}}}`}
                      </span>
                      <span className='text-muted-foreground break-all'>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sample && (
              <div>
                {apiResults && apiResults.length > 1 && (
                  <div className='flex items-center gap-1.5 flex-wrap mb-3'>
                    {apiResults.map((ep, idx) => (
                      <button
                        key={idx}
                        type='button'
                        onClick={() => setSelectedEndpointIdx(idx)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all',
                          selectedEndpointIdx === idx
                            ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                            : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5'
                        )}
                      >
                        {String(ep.method ?? 'GET')} {String(ep.url ?? `端点 ${idx + 1}`)}
                        {ep.summary?.success ? (
                          <span className='ml-1 text-green-500'>✓</span>
                        ) : (
                          <span className='ml-1 text-red-500'>✗</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <ResponseInspector
                  sample={sample}
                  sampleSummary={sampleSummary}
                  requestMeta={requestMeta}
                  requestHeaders={requestHeaders}
                  apiConfig={apiConfig}
                />
                {sample.extractions && Object.keys(sample.extractions).length > 0 && (
                  <div className='mt-3'>
                    <h4 className='text-xs font-semibold text-muted-foreground mb-2'>
                      此端点提取的变量
                    </h4>
                    <div className='rounded-md border divide-y'>
                      {Object.entries(sample.extractions).map(([key, value]) => (
                        <div key={key} className='flex gap-3 px-3 py-1.5 text-xs font-mono'>
                          <span className='font-semibold min-w-[80px] shrink-0 text-amber-600'>
                            {key}
                          </span>
                          <span className='text-muted-foreground break-all'>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                重放入口
              </h4>
              <Button size='sm' onClick={handleReplay}>
                加载到 TestEditor
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiChartPanel;
