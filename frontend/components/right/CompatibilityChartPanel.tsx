import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { Statistic } from '@/components/ui/statistic';
import { cn } from '@/lib/utils';

import { useTestResult } from '../../context/TestContext';
import { parseResultPayloadText } from '../../utils/testResult';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const CompatibilityChartPanel = () => {
  const { resultPayloadText } = useTestResult();
  const { t } = useTranslation();

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

  const normalizedDetails = useMemo<Record<string, unknown> | null>(() => {
    const results = parsedPayload?.details?.results;
    if (!results || typeof results !== 'object' || Array.isArray(results)) {
      return null;
    }
    const engineResult = (results as Record<string, unknown>).compatibility;
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
    if (!s.browsers && !s.overallScore) return null;
    return {
      summary: {
        overallScore: s.overallScore,
        browserCount: s.browserCount,
        deviceCount: s.deviceCount,
        matrixCount: s.matrixCount,
        realBrowserCount: s.realBrowserCount,
      },
      browsers: s.browsers,
      devices: s.devices,
      matrix: s.matrix,
      realBrowser: s.realBrowser,
      featureSummary: s.featureSummary,
      recommendations: s.recommendations,
      warnings: s.compatWarnings,
    };
  }, [normalizedDetails, parsedPayload]);

  const compatibilityDetails = useMemo(
    () => normalizedDetails || summaryFallback,
    [normalizedDetails, summaryFallback]
  );

  const summary = useMemo(() => {
    if (!compatibilityDetails) return null;
    const raw = (compatibilityDetails as { summary?: unknown }).summary;
    return isRecord(raw) ? raw : null;
  }, [compatibilityDetails]);

  const issueSummary = useMemo(() => {
    if (!compatibilityDetails) return null;
    const sources: Array<Record<string, unknown>> = [];
    const browsers = (compatibilityDetails as { browsers?: unknown }).browsers;
    const devices = (compatibilityDetails as { devices?: unknown }).devices;
    const matrix = (compatibilityDetails as { matrix?: unknown }).matrix;
    [browsers, devices, matrix].forEach(raw => {
      if (Array.isArray(raw)) {
        raw.forEach(item => {
          if (isRecord(item)) {
            sources.push(item);
          }
        });
      }
    });

    const counter = new Map<string, number>();
    sources.forEach(item => {
      const issues = Array.isArray(item.issues) ? (item.issues as unknown[]) : [];
      issues.forEach(issue => {
        const label = String(issue || '').trim();
        if (!label) return;
        counter.set(label, (counter.get(label) || 0) + 1);
      });
    });

    const items = Array.from(counter.entries())
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return items.length ? items : null;
  }, [compatibilityDetails]);

  const recommendations = useMemo(() => {
    if (!compatibilityDetails) return [] as string[];
    const raw = (compatibilityDetails as { recommendations?: unknown }).recommendations;
    return Array.isArray(raw) ? raw.map(item => String(item)) : [];
  }, [compatibilityDetails]);

  const warnings = useMemo(() => {
    if (!compatibilityDetails) return [] as string[];
    const raw = (compatibilityDetails as { warnings?: unknown }).warnings;
    return Array.isArray(raw) ? raw.map(item => String(item)) : [];
  }, [compatibilityDetails]);

  type BrowserItem = { browser: string; version: string; compatible: boolean; issues: string[] };
  const browserList = useMemo<BrowserItem[]>(() => {
    if (!compatibilityDetails) return [];
    const raw = (compatibilityDetails as { browsers?: unknown }).browsers;
    if (!Array.isArray(raw)) return [];
    return raw.filter(isRecord).map(item => ({
      browser: String(item.browser || ''),
      version: String(item.version || ''),
      compatible: Boolean(item.compatible),
      issues: Array.isArray(item.issues) ? (item.issues as string[]) : [],
    }));
  }, [compatibilityDetails]);

  type DeviceItem = {
    device: string;
    viewport: { width: number; height: number };
    compatible: boolean;
    issues: string[];
  };
  const deviceList = useMemo<DeviceItem[]>(() => {
    if (!compatibilityDetails) return [];
    const raw = (compatibilityDetails as { devices?: unknown }).devices;
    if (!Array.isArray(raw)) return [];
    return raw.filter(isRecord).map(item => ({
      device: String(item.device || ''),
      viewport: isRecord(item.viewport)
        ? {
            width: Number((item.viewport as Record<string, unknown>).width ?? 0),
            height: Number((item.viewport as Record<string, unknown>).height ?? 0),
          }
        : { width: 0, height: 0 },
      compatible: Boolean(item.compatible),
      issues: Array.isArray(item.issues) ? (item.issues as string[]) : [],
    }));
  }, [compatibilityDetails]);

  type MatrixItem = {
    browser: string;
    device: string;
    compatible: boolean;
    issues: string[];
    warnings: string[];
    features: string[];
  };
  const matrixData = useMemo<MatrixItem[]>(() => {
    if (!compatibilityDetails) return [];
    const raw = (compatibilityDetails as { matrix?: unknown }).matrix;
    if (!Array.isArray(raw)) return [];
    return raw.filter(isRecord).map(item => ({
      browser: String(item.browser || ''),
      device: String(item.device || ''),
      compatible: Boolean(item.compatible),
      issues: Array.isArray(item.issues) ? (item.issues as string[]) : [],
      warnings: Array.isArray(item.warnings) ? (item.warnings as string[]) : [],
      features: Array.isArray(item.features) ? (item.features as string[]) : [],
    }));
  }, [compatibilityDetails]);

  type FeatureSummaryData = {
    requiredFeatures: string[];
    css: Record<string, unknown>;
    fonts: Record<string, unknown>;
    media: Record<string, unknown>;
  };
  const featureSummary = useMemo<FeatureSummaryData | null>(() => {
    if (!compatibilityDetails) return null;
    const fs = (compatibilityDetails as { featureSummary?: unknown }).featureSummary;
    if (!isRecord(fs)) return null;
    return {
      requiredFeatures: Array.isArray(fs.requiredFeatures) ? (fs.requiredFeatures as string[]) : [],
      css: isRecord(fs.css) ? (fs.css as Record<string, unknown>) : {},
      fonts: isRecord(fs.fonts) ? (fs.fonts as Record<string, unknown>) : {},
      media: isRecord(fs.media) ? (fs.media as Record<string, unknown>) : {},
    };
  }, [compatibilityDetails]);

  type RealBrowserItem = {
    browser: string;
    version: string;
    device: string;
    viewport: { width: number; height: number };
    available: boolean;
    compatible: boolean;
    issues: string[];
    warnings: string[];
    metrics: {
      title: string;
      scrollWidth: number;
      scrollHeight: number;
      timing: { domContentLoaded: number; loadEvent: number } | null;
      failedRequests: number;
      firstContentfulPaint: number;
      screenshot: string | null;
    } | null;
  };
  const realBrowserList = useMemo<RealBrowserItem[]>(() => {
    if (!compatibilityDetails) return [];
    const raw = (compatibilityDetails as { realBrowser?: unknown }).realBrowser;
    if (!Array.isArray(raw)) return [];
    return raw.filter(isRecord).map(item => ({
      browser: String(item.browser || ''),
      version: String(item.version || ''),
      device: String(item.device || ''),
      viewport: isRecord(item.viewport)
        ? {
            width: Number((item.viewport as Record<string, unknown>).width ?? 0),
            height: Number((item.viewport as Record<string, unknown>).height ?? 0),
          }
        : { width: 0, height: 0 },
      available: Boolean(item.available),
      compatible: Boolean(item.compatible),
      issues: Array.isArray(item.issues) ? (item.issues as string[]) : [],
      warnings: Array.isArray(item.warnings) ? (item.warnings as string[]) : [],
      metrics: isRecord(item.metrics)
        ? {
            title: String((item.metrics as Record<string, unknown>).title || ''),
            scrollWidth: Number((item.metrics as Record<string, unknown>).scrollWidth ?? 0),
            scrollHeight: Number((item.metrics as Record<string, unknown>).scrollHeight ?? 0),
            timing: isRecord((item.metrics as Record<string, unknown>).timing)
              ? {
                  domContentLoaded: Number(
                    ((item.metrics as Record<string, unknown>).timing as Record<string, unknown>)
                      .domContentLoaded ?? 0
                  ),
                  loadEvent: Number(
                    ((item.metrics as Record<string, unknown>).timing as Record<string, unknown>)
                      .loadEvent ?? 0
                  ),
                }
              : null,
            failedRequests: Number((item.metrics as Record<string, unknown>).failedRequests ?? 0),
            firstContentfulPaint: Number(
              (item.metrics as Record<string, unknown>).firstContentfulPaint ?? 0
            ),
            screenshot:
              typeof (item.metrics as Record<string, unknown>).screenshot === 'string'
                ? ((item.metrics as Record<string, unknown>).screenshot as string)
                : null,
          }
        : null,
    }));
  }, [compatibilityDetails]);

  // ── 截图结果数据 ──
  type ScreenshotItem = {
    path: string;
    url: string;
    device: string;
    viewport: { width: number; height: number };
    screenshotBase64: string;
    format: string;
    meta?: { title: string; statusCode: number; loadTime: number };
  };
  type ScreenshotData = {
    summary: {
      totalPaths: number;
      totalScreenshots: number;
      devices: string[];
      failedPaths: string[];
    };
    items: ScreenshotItem[];
  };
  const screenshotData = useMemo<ScreenshotData | null>(() => {
    if (!compatibilityDetails) return null;
    const raw = (compatibilityDetails as { screenshotResults?: unknown }).screenshotResults;
    if (!isRecord(raw)) return null;
    const sum = isRecord(raw.summary) ? raw.summary : {};
    const items = Array.isArray(raw.items)
      ? (raw.items as unknown[]).filter(isRecord).map(item => ({
          path: String(item.path || '/'),
          url: String(item.url || ''),
          device: String(item.device || ''),
          viewport: isRecord(item.viewport)
            ? {
                width: Number((item.viewport as Record<string, unknown>).width ?? 0),
                height: Number((item.viewport as Record<string, unknown>).height ?? 0),
              }
            : { width: 0, height: 0 },
          screenshotBase64: String(item.screenshotBase64 || ''),
          format: String(item.format || 'png'),
          meta: isRecord(item.meta)
            ? {
                title: String((item.meta as Record<string, unknown>).title || ''),
                statusCode: Number((item.meta as Record<string, unknown>).statusCode ?? 0),
                loadTime: Number((item.meta as Record<string, unknown>).loadTime ?? 0),
              }
            : undefined,
        }))
      : [];
    if (items.length === 0) return null;
    return {
      summary: {
        totalPaths: Number(sum.totalPaths ?? 0),
        totalScreenshots: Number(sum.totalScreenshots ?? 0),
        devices: Array.isArray(sum.devices) ? (sum.devices as string[]) : [],
        failedPaths: Array.isArray(sum.failedPaths) ? (sum.failedPaths as string[]) : [],
      },
      items,
    };
  }, [compatibilityDetails]);

  type ConclusionSeverity = 'success' | 'info' | 'warning' | 'error';
  const conclusion = useMemo(() => {
    const scoreVal = toNumber(summary?.overallScore);
    const issues: string[] = [];
    let severity: ConclusionSeverity = 'success';

    const push = (msg: string, nextSev: ConclusionSeverity) => {
      issues.push(msg);
      if (nextSev === 'error') severity = 'error';
      else if (nextSev === 'warning' && severity !== 'error') severity = 'warning';
      else if (nextSev === 'info' && severity === 'success') severity = 'info';
    };

    if (scoreVal !== null) {
      if (scoreVal < 60)
        push(t('resultPanels.compatibility.scoreLow', { score: scoreVal }), 'error');
      else if (scoreVal < 75)
        push(t('resultPanels.compatibility.scoreMedium', { score: scoreVal }), 'warning');
      else if (scoreVal < 90)
        push(t('resultPanels.compatibility.scoreGood', { score: scoreVal }), 'info');
    }

    const incompatBrowsers = browserList.filter(b => !b.compatible).length;
    if (incompatBrowsers > 0) {
      push(
        t('resultPanels.compatibility.incompatBrowsers', {
          count: incompatBrowsers,
          total: browserList.length,
        }),
        incompatBrowsers >= 3 ? 'error' : 'warning'
      );
    }

    const incompatDevices = deviceList.filter(d => !d.compatible).length;
    if (incompatDevices > 0) {
      push(
        t('resultPanels.compatibility.incompatDevices', {
          count: incompatDevices,
          total: deviceList.length,
        }),
        incompatDevices >= 3 ? 'error' : 'warning'
      );
    }

    const realBrowserFails = realBrowserList.filter(r => r.available && !r.compatible).length;
    if (realBrowserFails > 0) {
      push(
        t('resultPanels.compatibility.realBrowserFails', { count: realBrowserFails }),
        'warning'
      );
    }

    const titleMap: Record<ConclusionSeverity, string> = {
      success: t('resultPanels.compatibility.conclusionSuccess'),
      info: t('resultPanels.compatibility.conclusionInfo'),
      warning: t('resultPanels.compatibility.conclusionWarning'),
      error: t('resultPanels.compatibility.conclusionError'),
    };

    return {
      severity,
      title: titleMap[severity],
      description: issues.length
        ? issues.join('；')
        : t('resultPanels.compatibility.conclusionAllPassed'),
    };
  }, [summary, browserList, deviceList, realBrowserList, t]);

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

  const hasAny = Boolean(compatibilityDetails);

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='py-3 px-4 border-b'>
        <CardTitle className='text-base font-medium'>
          {t('resultPanels.compatibility.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className='flex-1 overflow-auto p-4 space-y-6'>
        {!hasAny && (
          <div className='flex items-center justify-center py-16 text-sm text-muted-foreground'>
            运行兼容性测试后，检测结果将在此展示
          </div>
        )}
        {hasAny && (
          <div className='space-y-6'>
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4'>
              <Statistic
                title={t('resultPanels.compatibility.overallScore')}
                value={toNumber(summary?.overallScore) ?? '-'}
              />
              <Statistic
                title={t('resultPanels.compatibility.browserCount')}
                value={toNumber(summary?.browserCount) ?? '-'}
              />
              <Statistic
                title={t('resultPanels.compatibility.deviceCount')}
                value={toNumber(summary?.deviceCount) ?? '-'}
              />
              <Statistic
                title={t('resultPanels.compatibility.matrixCount')}
                value={toNumber(summary?.matrixCount) ?? '-'}
              />
              <Statistic
                title={t('resultPanels.compatibility.realBrowserCount')}
                value={toNumber(summary?.realBrowserCount) ?? '-'}
              />
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

            {issueSummary && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  {t('resultPanels.compatibility.topIssues')}
                </h4>
                <div className='rounded-md border divide-y'>
                  {issueSummary.map((item, index) => (
                    <div key={index} className='p-3 flex items-start gap-3'>
                      <Badge
                        variant='secondary'
                        className='mt-0.5 bg-orange-500 text-white hover:bg-orange-600 border-none'
                      >
                        {item.count}
                      </Badge>
                      <span className='flex-1 text-sm'>{item.issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 浏览器兼容性详情 */}
            {browserList.length > 0 && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  {t('resultPanels.compatibility.browserCompat')}
                </h4>
                <div className='rounded-md border divide-y'>
                  {browserList.map((item, index) => (
                    <div key={index} className='p-3'>
                      <div className='flex items-center gap-3'>
                        <Badge
                          variant='default'
                          className={cn(
                            'shrink-0 text-[10px] px-1.5',
                            item.compatible
                              ? 'bg-green-500 hover:bg-green-600 text-white border-none'
                              : 'bg-red-500 hover:bg-red-600 text-white border-none'
                          )}
                        >
                          {item.compatible
                            ? t('resultPanels.compatibility.passTag')
                            : t('resultPanels.compatibility.failTag')}
                        </Badge>
                        <span className='font-medium text-sm'>
                          {item.browser} {item.version}
                        </span>
                      </div>
                      {item.issues.length > 0 && (
                        <div className='mt-2 ml-14 flex flex-wrap gap-1.5'>
                          {item.issues.slice(0, 4).map((issue, i) => (
                            <Badge
                              key={i}
                              variant='outline'
                              className='text-[11px] font-normal max-w-sm truncate'
                              title={issue}
                            >
                              {issue}
                            </Badge>
                          ))}
                          {item.issues.length > 4 && (
                            <Badge variant='outline' className='text-[11px] font-normal'>
                              +{item.issues.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 设备适配详情 */}
            {deviceList.length > 0 && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  {t('resultPanels.compatibility.deviceAdapt')}
                </h4>
                <div className='rounded-md border divide-y'>
                  {deviceList.map((item, index) => (
                    <div key={index} className='p-3'>
                      <div className='flex items-center gap-3'>
                        <Badge
                          variant='default'
                          className={cn(
                            'shrink-0 text-[10px] px-1.5',
                            item.compatible
                              ? 'bg-green-500 hover:bg-green-600 text-white border-none'
                              : 'bg-red-500 hover:bg-red-600 text-white border-none'
                          )}
                        >
                          {item.compatible
                            ? t('resultPanels.compatibility.passTag')
                            : t('resultPanels.compatibility.failTag')}
                        </Badge>
                        <span className='font-medium text-sm'>{item.device}</span>
                        <span className='text-xs text-muted-foreground'>
                          {item.viewport.width}×{item.viewport.height}
                        </span>
                      </div>
                      {item.issues.length > 0 && (
                        <div className='mt-2 ml-14 flex flex-wrap gap-1.5'>
                          {item.issues.slice(0, 4).map((issue, i) => (
                            <Badge
                              key={i}
                              variant='outline'
                              className='text-[11px] font-normal max-w-sm truncate'
                              title={issue}
                            >
                              {issue}
                            </Badge>
                          ))}
                          {item.issues.length > 4 && (
                            <Badge variant='outline' className='text-[11px] font-normal'>
                              +{item.issues.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 兼容性矩阵 */}
            {matrixData.length > 0 &&
              (() => {
                const browsers = Array.from(new Set(matrixData.map(m => m.browser)));
                const devices = Array.from(new Set(matrixData.map(m => m.device)));
                const lookup = new Map(matrixData.map(m => [`${m.browser}|${m.device}`, m]));
                return (
                  <div>
                    <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                      {t('resultPanels.compatibility.compatMatrix')}
                    </h4>
                    <div className='rounded-md border overflow-x-auto'>
                      <table className='w-full text-xs'>
                        <thead>
                          <tr className='border-b bg-muted/30'>
                            <th className='p-2 text-left font-medium text-muted-foreground'>
                              {t('resultPanels.compatibility.matrixHeader')}
                            </th>
                            {browsers.map(b => (
                              <th
                                key={b}
                                className='p-2 text-center font-medium text-muted-foreground'
                              >
                                {b}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {devices.map(d => (
                            <tr key={d} className='border-b last:border-b-0'>
                              <td className='p-2 font-medium'>{d}</td>
                              {browsers.map(b => {
                                const cell = lookup.get(`${b}|${d}`);
                                if (!cell)
                                  return (
                                    <td key={b} className='p-2 text-center text-muted-foreground'>
                                      -
                                    </td>
                                  );
                                const hasWarnings = cell.warnings.length > 0;
                                return (
                                  <td
                                    key={b}
                                    className={cn(
                                      'p-2 text-center',
                                      cell.compatible
                                        ? hasWarnings
                                          ? 'bg-yellow-50 dark:bg-yellow-950/20'
                                          : 'bg-green-50 dark:bg-green-950/20'
                                        : 'bg-red-50 dark:bg-red-950/20'
                                    )}
                                    title={
                                      cell.issues.length > 0
                                        ? cell.issues.join('\n')
                                        : cell.warnings.length > 0
                                          ? cell.warnings.join('\n')
                                          : t('resultPanels.compatibility.compatible')
                                    }
                                  >
                                    {cell.compatible ? (hasWarnings ? '⚠' : '✓') : '✗'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

            {/* 真实浏览器测试结果 */}
            {realBrowserList.length > 0 && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  {t('resultPanels.compatibility.realBrowserResults')}
                </h4>
                <div className='rounded-md border divide-y'>
                  {realBrowserList.map((item, index) => (
                    <div key={index} className='p-3'>
                      <div className='flex items-center gap-3'>
                        <Badge
                          variant='default'
                          className={cn(
                            'shrink-0 text-[10px] px-1.5',
                            !item.available
                              ? 'bg-gray-400 hover:bg-gray-500 text-white border-none'
                              : item.compatible
                                ? 'bg-green-500 hover:bg-green-600 text-white border-none'
                                : 'bg-red-500 hover:bg-red-600 text-white border-none'
                          )}
                        >
                          {!item.available
                            ? t('resultPanels.compatibility.realBrowserUnavailable')
                            : item.compatible
                              ? t('resultPanels.compatibility.passTag')
                              : t('resultPanels.compatibility.failTag')}
                        </Badge>
                        <span className='font-medium text-sm'>
                          {item.browser} {item.version}
                        </span>
                        <span className='text-xs text-muted-foreground'>
                          {item.device} ({item.viewport.width}×{item.viewport.height})
                        </span>
                      </div>
                      {item.metrics && (
                        <div className='mt-2 ml-14 flex flex-wrap gap-3 text-xs text-muted-foreground'>
                          {item.metrics.firstContentfulPaint > 0 && (
                            <span>
                              {t('resultPanels.compatibility.realBrowserFcp')}:{' '}
                              <span className='font-medium text-foreground'>
                                {Math.round(item.metrics.firstContentfulPaint)}ms
                              </span>
                            </span>
                          )}
                          {item.metrics.timing && (
                            <>
                              <span>
                                {t('resultPanels.compatibility.realBrowserDcl')}:{' '}
                                <span className='font-medium text-foreground'>
                                  {Math.round(item.metrics.timing.domContentLoaded)}ms
                                </span>
                              </span>
                              <span>
                                {t('resultPanels.compatibility.realBrowserLoad')}:{' '}
                                <span className='font-medium text-foreground'>
                                  {Math.round(item.metrics.timing.loadEvent)}ms
                                </span>
                              </span>
                            </>
                          )}
                          {item.metrics.failedRequests > 0 && (
                            <span className='text-orange-500'>
                              {t('resultPanels.compatibility.realBrowserFailedReqs')}:{' '}
                              {item.metrics.failedRequests}
                            </span>
                          )}
                          {item.metrics.scrollWidth > item.viewport.width + 5 && (
                            <span className='text-red-500'>
                              {t('resultPanels.compatibility.realBrowserOverflow')} (
                              {item.metrics.scrollWidth}px)
                            </span>
                          )}
                        </div>
                      )}
                      {item.issues.length > 0 && (
                        <div className='mt-2 ml-14 flex flex-wrap gap-1.5'>
                          {item.issues.slice(0, 4).map((issue, i) => {
                            const isCssFeature = issue.includes('但当前浏览器引擎不支持');
                            return (
                              <Badge
                                key={i}
                                variant='outline'
                                className={cn(
                                  'text-[11px] font-normal max-w-sm truncate',
                                  isCssFeature &&
                                    'text-purple-600 border-purple-300 dark:text-purple-400 dark:border-purple-700'
                                )}
                                title={issue}
                              >
                                {issue}
                              </Badge>
                            );
                          })}
                          {item.issues.length > 4 && (
                            <Badge variant='outline' className='text-[11px] font-normal'>
                              +{item.issues.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}
                      {item.metrics?.screenshot && (
                        <div className='mt-2 ml-14'>
                          <ImageLightbox
                            src={`data:image/png;base64,${item.metrics.screenshot}`}
                            alt={`${item.browser} ${item.version} - ${item.device} (${item.viewport.width}×${item.viewport.height})`}
                            thumbnailClassName='max-h-48'
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 特性支持摘要 */}
            {featureSummary && featureSummary.requiredFeatures.length > 0 && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  {t('resultPanels.compatibility.detectedFeatures')}
                </h4>
                <div className='flex flex-wrap gap-1.5'>
                  {featureSummary.requiredFeatures.map(f => (
                    <Badge key={f} variant='secondary' className='text-[11px]'>
                      {f}
                    </Badge>
                  ))}
                </div>
                {Object.keys(featureSummary.css).length > 0 && (
                  <div className='mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs'>
                    {Object.entries(featureSummary.css)
                      .filter(([, v]) => typeof v === 'boolean' && v)
                      .map(([k]) => (
                        <div key={k} className='flex items-center gap-1.5'>
                          <span className='w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0' />
                          <span>{k.replace(/^uses/, 'CSS ')}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* 多路径截图结果 */}
            {screenshotData && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  {t('resultPanels.compatibility.screenshotResults', '多路径截图')}
                </h4>

                <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-4'>
                  <Statistic
                    title={t('resultPanels.compatibility.screenshotPaths', '页面路径')}
                    value={screenshotData.summary.totalPaths}
                  />
                  <Statistic
                    title={t('resultPanels.compatibility.screenshotCount', '截图数')}
                    value={screenshotData.summary.totalScreenshots}
                  />
                  <Statistic
                    title={t('resultPanels.compatibility.screenshotDevices', '设备数')}
                    value={screenshotData.summary.devices.length}
                  />
                  {screenshotData.summary.failedPaths.length > 0 && (
                    <Statistic
                      title={t('resultPanels.compatibility.screenshotFailed', '失败路径')}
                      value={screenshotData.summary.failedPaths.length}
                    />
                  )}
                </div>

                {/* 按路径分组展示截图 */}
                {(() => {
                  const pathGroups = new Map<string, typeof screenshotData.items>();
                  for (const item of screenshotData.items) {
                    const group = pathGroups.get(item.path) || [];
                    group.push(item);
                    pathGroups.set(item.path, group);
                  }
                  return Array.from(pathGroups.entries()).map(([path, items]) => (
                    <div key={path} className='mb-4 rounded-md border'>
                      <div className='p-3 bg-muted/30 border-b flex items-center gap-3'>
                        <span className='font-medium text-sm'>{path}</span>
                        {items[0]?.meta && (
                          <>
                            <Badge variant='outline' className='text-[10px]'>
                              {items[0].meta.statusCode}
                            </Badge>
                            <span className='text-xs text-muted-foreground'>
                              {items[0].meta.title}
                            </span>
                            <span className='text-xs text-muted-foreground ml-auto'>
                              {items[0].meta.loadTime}ms
                            </span>
                          </>
                        )}
                      </div>
                      <div className='p-3 grid grid-cols-1 md:grid-cols-3 gap-3'>
                        {items.map((item, idx) => (
                          <div key={idx} className='space-y-1.5'>
                            <div className='text-xs text-muted-foreground text-center'>
                              {item.device} ({item.viewport.width}×{item.viewport.height})
                            </div>
                            {item.screenshotBase64 && !item.screenshotBase64.endsWith('...') ? (
                              <ImageLightbox
                                src={`data:image/${item.format};base64,${item.screenshotBase64}`}
                                alt={`${path} - ${item.device}`}
                                thumbnailClassName='max-h-40 rounded border'
                              />
                            ) : (
                              <div className='h-24 rounded border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground'>
                                {t('resultPanels.compatibility.screenshotSaved', '已保存到文件')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}

                {screenshotData.summary.failedPaths.length > 0 && (
                  <div className='mt-2 p-3 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900'>
                    <div className='text-xs font-medium text-red-600 mb-1'>
                      {t('resultPanels.compatibility.screenshotFailedPaths', '截图失败路径')}
                    </div>
                    <div className='flex flex-wrap gap-1.5'>
                      {screenshotData.summary.failedPaths.map((p, i) => (
                        <Badge
                          key={i}
                          variant='outline'
                          className='text-[11px] text-red-600 border-red-300'
                        >
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 告警 */}
            {warnings.length > 0 && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  {t('resultPanels.compatibility.warnings')}
                </h4>
                <div className='rounded-md border divide-y'>
                  {warnings.map((item, index) => (
                    <div key={index} className='p-3 flex items-start gap-3'>
                      <Badge
                        variant='secondary'
                        className='mt-0.5 bg-yellow-500 text-white hover:bg-yellow-600 border-none'
                      >
                        {t('resultPanels.compatibility.warnTag')}
                      </Badge>
                      <span className='flex-1 text-sm'>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 建议 */}
            {recommendations.length > 0 && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  {t('resultPanels.compatibility.recommendations')}
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

export default CompatibilityChartPanel;
