import { AlertTriangle, CheckCircle2, Loader2, Search, XCircle } from 'lucide-react';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  buildReportConfig,
  downloadHtmlReport,
  generateHtmlReport,
  printHtmlReport,
} from '../utils/reportGenerator';

import CompareTabContent from '../components/history/CompareTabContent';
import ConfigSnapshotView from '../components/history/ConfigSnapshotView';
import HistoryDetailHeader from '../components/history/HistoryDetailHeader';
import HistoryTabContent from '../components/history/HistoryTabContent';
import QueueProgressCard from '../components/history/QueueProgressCard';
import LogViewer from '../components/right/LogViewer';
import RawJsonViewer from '../components/right/RawJsonViewer';
import ResultSummary from '../components/right/ResultSummary';
import { type TabId, getTabsForTestType } from '../constants/historyDetailTabs';
import { getQueueNameByTestType } from '../constants/queue';
import { getTestStatusMeta } from '../constants/status';
import {
  DEFAULT_ADVANCED_SETTINGS,
  DEFAULT_HISTORY_META,
  DEFAULT_REQUEST_META,
  type TestStatus,
  type TestType,
  useTestConfig,
  useTestHistory,
  useTestResult,
  useTestTemplates,
  useTestWorkspace,
} from '../context/TestContext';
import { useCompareKeyMetrics } from '../hooks/useCompareKeyMetrics';
import { isApiError } from '../services/apiClient';
import {
  cancelTest,
  exportTestResult,
  getHistoryDetail,
  getTestProgress,
  getTestResult,
  getTestStatus,
  rerunTest,
} from '../services/testApi';
import { formatRelativeTime } from '../utils/date';
import { startTimer, trackCounter } from '../utils/telemetry';
import { parseResultPayload } from '../utils/testResult';
import NotFoundPage from './NotFoundPage';

const PerformanceTrendChartLazy = lazy(() => import('../components/right/PerformanceTrendChart'));
const PerformanceChartPanelLazy = lazy(() => import('../components/right/PerformanceChartPanel'));
const SecurityOverviewPanelLazy = lazy(
  () => import('../components/right/security/SecurityOverviewPanel')
);
const SecurityVulnListPanelLazy = lazy(
  () => import('../components/right/security/SecurityVulnListPanel')
);
const SecurityCompliancePanelLazy = lazy(
  () => import('../components/right/security/SecurityCompliancePanel')
);
const SeoChartPanelLazy = lazy(() => import('../components/right/SeoChartPanel'));
const SeoDetailPanelLazy = lazy(() => import('../components/right/SeoDetailPanel'));
const ApiChartPanelLazy = lazy(() => import('../components/right/ApiChartPanel'));
const StressChartPanelLazy = lazy(() => import('../components/right/StressChartPanel'));
const AccessibilityChartPanelLazy = lazy(
  () => import('../components/right/AccessibilityChartPanel')
);
const CompatibilityChartPanelLazy = lazy(
  () => import('../components/right/CompatibilityChartPanel')
);
const UxChartPanelLazy = lazy(() => import('../components/right/UxChartPanel'));
const WebsiteChartPanelLazy = lazy(() => import('../components/right/WebsiteChartPanel'));
const TrendPanelLazy = lazy(() => import('../components/right/TrendPanel'));
const ConfigSummaryPanelLazy = lazy(() => import('../components/right/ConfigSummaryPanel'));

const TabLoading = () => (
  <div className='flex justify-center py-12'>
    <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
  </div>
);

const HistoryDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { workspaceId } = useTestWorkspace();
  const { updateConfigText, updateUrl, selectTestType } = useTestConfig();
  const { updateResultPayloadText, updateResult } = useTestResult();
  const { createTemplate } = useTestTemplates();
  const { history } = useTestHistory();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [exporting, setExporting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [metricQuery, setMetricQuery] = useState('');
  const [metricSort, setMetricSort] = useState<'name' | 'value-desc' | 'value-asc'>('name');
  const [exportFormat, setExportFormat] = useState<string>('json');
  const [resultPayload, setResultPayload] = useState<Record<string, unknown> | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [comparePayload, setComparePayload] = useState<Record<string, unknown> | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [queueJob, setQueueJob] = useState<Record<string, unknown> | null>(null);
  const [progressInfo, setProgressInfo] = useState<Record<string, unknown> | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { t } = useTranslation();

  const testTypeStr = String(detail?.testType || detail?.engine_type || 'website').toLowerCase();
  const tabs = useMemo(() => getTabsForTestType(testTypeStr), [testTypeStr]);

  const isRecord = useCallback(
    (value: unknown): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null && !Array.isArray(value),
    []
  );

  const resolveReplayConfig = useCallback(() => {
    const configValue =
      (detail as { testConfig?: unknown } | null)?.testConfig ??
      (detail as { test_config?: unknown } | null)?.test_config ??
      null;
    if (!configValue) {
      return null;
    }
    let parsed: Record<string, unknown> | null = null;
    if (typeof configValue === 'string') {
      try {
        parsed = JSON.parse(configValue) as Record<string, unknown>;
      } catch {
        parsed = null;
      }
    } else if (isRecord(configValue)) {
      parsed = configValue;
    }
    if (!parsed) {
      return null;
    }
    const testType = String(parsed.testType || detail?.testType || detail?.engine_type || '');
    const url = String(parsed.url || detail?.url || detail?.test_url || '');
    const nextRequest = isRecord(parsed.request) ? parsed.request : DEFAULT_REQUEST_META;
    const nextHistory = isRecord(parsed.history) ? parsed.history : DEFAULT_HISTORY_META;
    const nextAdvanced = isRecord(parsed.advanced) ? parsed.advanced : DEFAULT_ADVANCED_SETTINGS;
    const nextOptions = isRecord(parsed.options) ? parsed.options : {};
    return JSON.stringify(
      {
        ...parsed,
        testType,
        url,
        request: nextRequest,
        history: nextHistory,
        advanced: nextAdvanced,
        options: nextOptions,
      },
      null,
      2
    );
  }, [detail, isRecord]);

  const resolvePayload = useCallback((payload?: unknown) => {
    const empty = {
      summary: null,
      metrics: [] as Array<Record<string, unknown>>,
      warnings: [] as unknown[],
      errors: [] as unknown[],
    };
    if (!payload) {
      return empty;
    }
    const parseObject = (value: unknown) => {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
      if (typeof value === 'object') {
        return value as Record<string, unknown>;
      }
      return null;
    };
    const parsed = parseObject(payload);
    if (!parsed) {
      return empty;
    }
    const normalized = parseResultPayload(parsed);
    if (!normalized) {
      return empty;
    }

    // 规范化 metrics：后端可能返回 metric_name/metric_value 而非 metric/value
    const METRIC_EXCLUDE_KEYS = new Set([
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
    const normalizedMetrics: Array<Record<string, unknown>> = normalized.metrics
      .map(
        (m): Record<string, unknown> => ({
          ...m,
          metric: m.metric || m.metric_name || m.metricName || m.name || '',
          value: m.value ?? m.metric_value ?? m.metricValue ?? m.score ?? m.p95 ?? m.p99,
        })
      )
      .filter(m => {
        const name = String(m.metric).toLowerCase();
        return name && !METRIC_EXCLUDE_KEYS.has(name);
      });

    return {
      summary: normalized.summary,
      metrics: normalizedMetrics,
      warnings: normalized.warnings,
      errors: normalized.errors,
    };
  }, []);

  const basePayload = resultPayload;
  const { summary, metrics, warnings, errors } = useMemo(
    () => resolvePayload(basePayload),
    [basePayload, resolvePayload]
  );
  const compareData = useMemo(
    () => resolvePayload(comparePayload),
    [comparePayload, resolvePayload]
  );

  const parseFullPayload = useCallback((payload: unknown) => {
    if (!payload) {
      return null;
    }
    const parseObject = (value: unknown) => {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
      if (typeof value === 'object') {
        return value as Record<string, unknown>;
      }
      return null;
    };
    const parsed = parseObject(payload);
    if (!parsed) {
      return null;
    }
    return parseResultPayload(parsed) ? parsed : null;
  }, []);

  const baseFullPayload = useMemo(
    () => parseFullPayload(basePayload),
    [basePayload, parseFullPayload]
  );
  const compareFullPayload = useMemo(
    () => parseFullPayload(comparePayload),
    [comparePayload, parseFullPayload]
  );

  const compareOptions = useMemo(
    () =>
      history
        .filter(item => item.id && item.id !== id)
        .map(item => ({
          value: item.id,
          label: item.label || item.id,
        })),
    [history, id]
  );

  const compareKeyMetrics = useCompareKeyMetrics({
    detail: detail as Record<string, unknown> | null,
    summary: summary as Record<string, unknown> | null,
    metrics,
    warnings,
    errors,
    compareData,
    baseFullPayload,
    compareFullPayload,
    compareId,
  });

  const filteredMetrics = useMemo(() => {
    const normalizedQuery = metricQuery.trim().toLowerCase();
    const list = metrics.filter(m => {
      if (!normalizedQuery) return true;
      return String(m.metric ?? '')
        .toLowerCase()
        .includes(normalizedQuery);
    });
    const toNum = (v: unknown) => {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isNaN(n) ? null : n;
    };
    return [...list].sort((a, b) => {
      if (metricSort === 'name') {
        return String(a.metric ?? '').localeCompare(String(b.metric ?? ''));
      }
      const va = toNum(a.value);
      const vb = toNum(b.value);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return metricSort === 'value-desc' ? vb - va : va - vb;
    });
  }, [metricQuery, metricSort, metrics]);

  const fetchDetail = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    const [detailRes, resultRes] = await Promise.allSettled([
      getHistoryDetail(id, workspaceId || undefined),
      getTestResult(id, workspaceId || undefined),
    ]);
    if (detailRes.status === 'fulfilled') {
      const detailData = detailRes.value;
      setDetail(detailData);
      updateResult({
        status: String(detailData.status || 'pending') as TestStatus,
        engine: String(detailData.testType || 'performance') as TestType,
      });
      setError(null);
    } else {
      setDetail(null);
      const reason = detailRes.reason;
      if (isApiError(reason) && reason.status === 404) {
        setIsNotFound(true);
      }
      setError((reason as Error)?.message || t('historyDetail.detailLoadFailed'));
    }
    if (resultRes.status === 'fulfilled') {
      const payload = resultRes.value as Record<string, unknown>;
      updateResultPayloadText(JSON.stringify(resultRes.value, null, 2));
      setResultPayload(payload);
    } else {
      setResultPayload(null);
    }
    setLoading(false);
  }, [id, t, updateResult, updateResultPayloadText, workspaceId]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  // P0: 运行中/排队中测试自动轮询刷新状态和进度
  // P1: 页面不可见时暂停轮询，可见后恢复
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollActiveRef = useRef(false);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    const status = String(detail?.status || '');
    const isActive = status === 'running' || status === 'pending' || status === 'queued';
    if (!isActive || !id) return;

    pollTimerRef.current = setInterval(async () => {
      try {
        const [statusRes, progressRes] = await Promise.allSettled([
          getTestStatus(id, workspaceId || undefined),
          getTestProgress(id, workspaceId || undefined),
        ]);
        if (progressRes.status === 'fulfilled') {
          setProgressInfo(progressRes.value as Record<string, unknown>);
        }
        if (statusRes.status === 'fulfilled') {
          const data = statusRes.value as Record<string, unknown>;
          const newStatus = String(data.status || '');
          const curStatus = String(detail?.status || '');
          if (newStatus && newStatus !== curStatus) {
            setDetail(prev => (prev ? { ...prev, status: newStatus } : prev));
            updateResult({ status: newStatus as TestStatus });
            if (newStatus === 'completed' || newStatus === 'failed' || newStatus === 'cancelled') {
              if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
              }
              pollActiveRef.current = false;
              void fetchDetail();
            }
          }
        }
      } catch {
        // 轮询失败时静默
      }
    }, 3000);
  }, [detail?.status, id, workspaceId, fetchDetail, updateResult]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    stopPolling();
    const status = String(detail?.status || '');
    const isActive = status === 'running' || status === 'pending' || status === 'queued';
    pollActiveRef.current = isActive;
    if (isActive && id) {
      startPolling();
    }
    return stopPolling;
  }, [detail?.status, id, startPolling, stopPolling]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && pollActiveRef.current) {
        startPolling();
      } else {
        stopPolling();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [startPolling, stopPolling]);

  useEffect(() => {
    if (!compareId) {
      setComparePayload(null);
      return;
    }
    const loadCompare = async () => {
      setCompareLoading(true);
      try {
        const payload = (await getTestResult(compareId, workspaceId || undefined)) as Record<
          string,
          unknown
        >;
        setComparePayload(payload);
      } catch {
        setComparePayload(null);
      } finally {
        setCompareLoading(false);
      }
    };
    void loadCompare();
  }, [compareId, workspaceId]);

  const loadQueueInfo = useCallback(async () => {
    if (!id) {
      return;
    }
    setQueueLoading(true);
    try {
      const progressData = await getTestProgress(id, workspaceId || undefined);
      setProgressInfo(progressData);
    } catch {
      // progress not available
    }
    setQueueJob(null);
    setQueueLoading(false);
  }, [id, workspaceId]);

  useEffect(() => {
    let ignore = false;
    void loadQueueInfo().then(() => {
      if (ignore) return;
    });
    return () => {
      ignore = true;
    };
  }, [loadQueueInfo]);

  const statusValue = String(detail?.status || 'pending') as TestStatus;
  const isQueued = statusValue === 'queued' || statusValue === 'pending';
  const isExportable = statusValue === 'completed';
  const progressValue = useMemo(() => {
    const raw = Number(progressInfo?.progress ?? (statusValue === 'completed' ? 100 : 0));
    if (Number.isNaN(raw)) {
      return statusValue === 'completed' ? 100 : 0;
    }
    return Math.min(100, Math.max(0, raw));
  }, [progressInfo?.progress, statusValue]);
  const queueName = useMemo(
    () => getQueueNameByTestType(String(detail?.testType || '')),
    [detail?.testType]
  );
  const attempts = Number((queueJob?.opts as { attempts?: number } | undefined)?.attempts || 0);
  const attemptsMade = Number(queueJob?.attemptsMade || 0);
  const showQueueInfo = isQueued || statusValue === 'running' || !!queueJob;
  const queueFailedReason: string | null = queueJob?.failedReason
    ? String(queueJob.failedReason)
    : null;
  const progressStatusText: string = String(progressInfo?.status || statusValue);
  const perfTrendUrl: string | null = useMemo(() => {
    const tt = String(detail?.testType || '').toLowerCase();
    if (tt !== 'performance') return null;
    const u = String(detail?.url || detail?.testUrl || '');
    return u || null;
  }, [detail]);

  const handleExport = async () => {
    if (!id) {
      return;
    }
    setExporting(true);
    try {
      const downloadBlob = (content: BlobPart, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
      };
      if (exportFormat === 'json' || exportFormat === 'csv') {
        const response = await exportTestResult(id, {
          workspaceId: workspaceId || undefined,
          format: exportFormat as 'json' | 'csv' | 'markdown' | 'html' | 'pdf',
        });
        const extension = exportFormat === 'csv' ? 'csv' : 'json';
        downloadBlob(response.data, `test-${id}-result.${extension}`, response.data?.type || '');
      } else {
        const normalizeValue = (value: unknown) => {
          if (value === undefined) {
            return '-';
          }
          if (typeof value === 'object') {
            return JSON.stringify(value);
          }
          return String(value);
        };
        const summaryRows = summary
          ? Object.entries(summary).map(([key, value]) => `- ${key}: ${normalizeValue(value)}`)
          : [`- ${t('common.none')}`];
        const metricRows = metrics.length
          ? metrics.map(metric => {
              const name = String(
                metric.metric || metric.metric_name || metric.metricName || 'metric'
              );
              return `- ${name}: ${normalizeValue(metric.value ?? metric.score ?? metric.p95 ?? metric.p99)}`;
            })
          : [`- ${t('common.none')}`];
        const warningRows = warnings.length
          ? warnings.map(item => `- ${normalizeValue(item)}`)
          : [`- ${t('common.none')}`];
        const errorRows = errors.length
          ? errors.map(item => `- ${normalizeValue(item)}`)
          : [`- ${t('common.none')}`];
        const markdown = `# ${t('historyDetail.exportTitle', { id })}\n\n## ${t('historyDetail.exportSummary')}\n${summaryRows.join('\n')}\n\n## ${t('historyDetail.exportMetrics')}\n${metricRows.join('\n')}\n\n## ${t('historyDetail.exportWarnings')}\n${warningRows.join('\n')}\n\n## ${t('historyDetail.exportErrors')}\n${errorRows.join('\n')}`;
        if (exportFormat === 'markdown') {
          downloadBlob(markdown, `test-${id}-result.md`, 'text/markdown;charset=utf-8');
        } else {
          const reportConfig = buildReportConfig(
            id,
            testTypeStr,
            String(detail?.url || detail?.testUrl || ''),
            resultPayload || {}
          );
          const html = generateHtmlReport(reportConfig);
          if (exportFormat === 'pdf') {
            printHtmlReport(html);
          } else {
            downloadHtmlReport(html, `test-${id}-result.html`);
          }
        }
      }
      toast.success(t('historyDetail.exportSuccess'));
    } catch (error) {
      toast.error((error as Error).message || t('historyDetail.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const handleCancel = async () => {
    if (!id) {
      return;
    }
    setActionLoading(true);
    try {
      await cancelTest(id, workspaceId || undefined);
      toast.success(t('historyDetail.cancelSuccess'));
      await fetchDetail();
    } catch (error) {
      toast.error((error as Error).message || t('historyDetail.cancelFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReplay = () => {
    const replayConfig = resolveReplayConfig();
    if (!replayConfig) {
      toast.error(t('historyDetail.replayFailed'));
      return;
    }
    const replayUrl = String(detail?.url || detail?.testUrl || '');
    const replayType = String(detail?.testType || detail?.engine_type || '');
    if (replayUrl) updateUrl(replayUrl);
    if (replayType) selectTestType(replayType as import('../context/TestContext').TestType);
    updateConfigText(replayConfig);
    trackCounter('config.replay');
    toast.success(t('historyDetail.replaySuccess'));
    navigate('/dashboard');
  };

  // ── 联动：保存为模板 ──
  const handleSaveAsTemplate = async () => {
    if (!detail) return;
    const testType = String(detail.testType || 'performance');
    const url = String(detail.url || detail.testUrl || '');
    const snap = detail.configSnapshot as Record<string, unknown> | undefined;
    try {
      await createTemplate({
        name: `${testType} - ${url || id}`,
        description: t('historyDetail.templateFromTest', { id, defaultValue: `从测试 ${id} 保存` }),
        engineType: testType,
        config: snap || { url },
      });
      toast.success(t('historyDetail.saveAsTemplateSuccess', '已保存为模板'));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // ── 联动：添加到监控 ──
  const handleCreateMonitor = () => {
    const url = String(detail?.url || detail?.testUrl || '');
    const testType = String(detail?.testType || 'performance');
    if (url) {
      navigate(`/monitoring?action=add&url=${encodeURIComponent(url)}&type=${testType}`);
    } else {
      navigate('/monitoring');
    }
  };

  // ── 联动：创建定时任务 ──
  const handleCreateSchedule = () => {
    navigate('/schedules');
  };

  const handleRerun = async () => {
    if (!id) {
      return;
    }
    setActionLoading(true);
    try {
      const data = await rerunTest(id, workspaceId || undefined);
      toast.success(t('historyDetail.rerunSuccess'));
      if (data?.testId) {
        trackCounter('test.rerun');
        startTimer('rerun', String(data.testId));
      }
      if (data?.testId) {
        window.location.assign(`/history/${data.testId}`);
        return;
      }
      await fetchDetail();
    } catch (error) {
      toast.error((error as Error).message || t('historyDetail.rerunFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className='container py-6 space-y-6'>
      {/* Header */}
      <HistoryDetailHeader
        id={id}
        isQueued={isQueued}
        isExportable={isExportable}
        exporting={exporting}
        actionLoading={actionLoading}
        statusValue={statusValue}
        exportFormat={exportFormat}
        detail={detail}
        onExportFormatChange={setExportFormat}
        onExport={handleExport}
        onRerun={handleRerun}
        onReplay={handleReplay}
        onCancel={handleCancel}
        onSaveAsTemplate={handleSaveAsTemplate}
        onCreateMonitor={handleCreateMonitor}
        onCreateSchedule={handleCreateSchedule}
      />

      {loading && (
        <div className='flex justify-center py-12'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        </div>
      )}

      {error && !isNotFound && (
        <Alert variant='destructive'>
          <AlertTriangle className='h-4 w-4' />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isNotFound && !loading && (
        <NotFoundPage
          code='404'
          title={t('historyDetail.notFoundTitle', '测试记录不存在')}
          description={t('historyDetail.notFoundDesc', `测试记录 ${id} 不存在或已被删除。`)}
          backTo='/history'
          backLabel={t('historyDetail.backToHistory', '返回历史列表')}
          showQuickLinks={false}
          autoRedirect={false}
        />
      )}

      {!loading && !error && detail && (
        <div className='grid gap-6'>
          {/* Main Info Card */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-lg font-medium'>
                {t('historyDetail.testDetail', '测试详情')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
                <div className='space-y-1'>
                  <dt className='text-sm font-medium text-muted-foreground'>
                    {t('historyDetail.url')}
                  </dt>
                  <dd className='text-sm font-mono break-all'>
                    {String(detail.url || detail.testUrl || '-')}
                  </dd>
                </div>
                <div className='space-y-1'>
                  <dt className='text-sm font-medium text-muted-foreground'>
                    {t('historyDetail.type')}
                  </dt>
                  <dd className='text-sm capitalize'>{String(detail.testType || '-')}</dd>
                </div>
                <div className='space-y-1'>
                  <dt className='text-sm font-medium text-muted-foreground'>
                    {t('historyDetail.status')}
                  </dt>
                  <dd className='flex items-center gap-2'>
                    {(() => {
                      const meta = getTestStatusMeta(statusValue);
                      return (
                        <Badge
                          style={{
                            backgroundColor: meta.color,
                            color: '#fff',
                            borderColor: meta.color,
                          }}
                        >
                          {t(meta.label)}
                        </Badge>
                      );
                    })()}
                    {isQueued && (
                      <Badge variant='outline' className='text-blue-600 border-blue-200 bg-blue-50'>
                        {t('historyDetail.inQueue')}
                      </Badge>
                    )}
                  </dd>
                </div>
                <div className='space-y-1'>
                  <dt className='text-sm font-medium text-muted-foreground'>
                    {t('historyDetail.createdAt')}
                  </dt>
                  <dd className='text-sm'>
                    {formatRelativeTime(detail.createdAt ? String(detail.createdAt) : undefined)}
                  </dd>
                </div>
                {summary && (
                  <>
                    <div className='space-y-1'>
                      <dt className='text-sm font-medium text-muted-foreground'>
                        {t('historyDetail.score')}
                      </dt>
                      <dd className='text-sm font-semibold'>{String(summary.score ?? '-')}</dd>
                    </div>
                    <div className='space-y-1'>
                      <dt className='text-sm font-medium text-muted-foreground'>
                        {t('historyDetail.grade')}
                      </dt>
                      <dd className='text-sm font-semibold'>{String(summary.grade ?? '-')}</dd>
                    </div>
                    <div className='space-y-1'>
                      <dt className='text-sm font-medium text-muted-foreground'>
                        {t('historyDetail.passed')}
                      </dt>
                      <dd className='text-sm'>
                        {summary.passed === undefined ? (
                          '-'
                        ) : summary.passed ? (
                          <span className='flex items-center text-green-600 gap-1'>
                            <CheckCircle2 className='h-3.5 w-3.5' /> {t('historyDetail.passedYes')}
                          </span>
                        ) : (
                          <span className='flex items-center text-red-600 gap-1'>
                            <XCircle className='h-3.5 w-3.5' /> {t('historyDetail.passedNo')}
                          </span>
                        )}
                      </dd>
                    </div>
                    <div className='space-y-1'>
                      <dt className='text-sm font-medium text-muted-foreground'>
                        {t('historyDetail.duration')}
                      </dt>
                      <dd className='text-sm'>{String(summary.duration ?? '-')}</dd>
                    </div>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Queue Info */}
          {showQueueInfo ? (
            <QueueProgressCard
              progressValue={progressValue}
              statusValue={statusValue}
              queueName={queueName}
              progressStatusText={progressStatusText}
              attempts={attempts}
              attemptsMade={attemptsMade}
              queueFailedReason={queueFailedReason}
              queueLoading={queueLoading}
              onRefresh={() => void loadQueueInfo()}
            />
          ) : null}

          {/* Dynamic Tabs */}
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabId)} className='w-full'>
            <TabsList className='flex flex-wrap h-auto gap-1 bg-muted/60 p-1'>
              {tabs.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id} className='text-xs px-3 py-1.5'>
                  {t(tab.labelKey, tab.fallbackLabel)}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── 概览 ── */}
            <TabsContent value='overview' className='space-y-6 mt-4'>
              <div className='grid lg:grid-cols-5 gap-6 items-start'>
                <div className='lg:col-span-3 space-y-6'>
                  <ResultSummary />
                  {/* 安全测试：概览只展示摘要 */}
                  {testTypeStr === 'security' && (
                    <Suspense fallback={<TabLoading />}>
                      <SecurityOverviewPanelLazy />
                    </Suspense>
                  )}
                  {/* Metrics List */}
                  {metrics.length > 0 ? (
                    <Card>
                      <CardHeader className='pb-3 flex flex-row items-center justify-between space-y-0'>
                        <CardTitle className='text-lg font-medium'>
                          {t('historyDetail.metricsTitle')}
                        </CardTitle>
                        <div className='flex items-center gap-2'>
                          <div className='relative w-[150px]'>
                            <Search className='absolute left-2 top-2.5 h-3 w-3 text-muted-foreground' />
                            <Input
                              placeholder={t('historyDetail.metricsSearch')}
                              value={metricQuery}
                              onChange={e => setMetricQuery(e.target.value)}
                              className='h-8 pl-8 text-xs'
                            />
                          </div>
                          <Select
                            value={metricSort}
                            onValueChange={(v: string) =>
                              setMetricSort(v as 'name' | 'value-desc' | 'value-asc')
                            }
                          >
                            <SelectTrigger className='h-8 w-[110px] text-xs'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='name'>{t('historyDetail.sortName')}</SelectItem>
                              <SelectItem value='value-desc'>
                                {t('historyDetail.sortValueDesc')}
                              </SelectItem>
                              <SelectItem value='value-asc'>
                                {t('historyDetail.sortValueAsc')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className='rounded-md border divide-y max-h-[400px] overflow-auto'>
                          {filteredMetrics.length === 0 ? (
                            <div className='p-4 text-center text-sm text-muted-foreground'>
                              {t('historyDetail.metricsEmpty')}
                            </div>
                          ) : (
                            filteredMetrics.map((metric, idx) => (
                              <div
                                key={idx}
                                className='p-2 px-3 flex items-center justify-between text-sm hover:bg-muted/50'
                              >
                                <span
                                  className='font-medium truncate mr-4'
                                  title={String(metric.metric ?? '')}
                                >
                                  {String(metric.metric ?? '')}
                                </span>
                                <span className='font-mono'>
                                  {String(metric.value ?? '-').replace(/^"|"$/g, '')}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                  {/* Alerts / Errors */}
                  {(errors.length > 0 || warnings.length > 0 || !!queueFailedReason) && (
                    <Card>
                      <CardHeader className='pb-3'>
                        <CardTitle className='text-lg font-medium'>
                          {t('historyDetail.alertsTitle')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className='rounded-md border divide-y'>
                          {queueFailedReason && (
                            <div className='p-3 flex items-start gap-2 bg-red-50/50'>
                              <XCircle className='h-4 w-4 text-red-600 mt-0.5 shrink-0' />
                              <span className='text-sm text-red-900'>{queueFailedReason}</span>
                            </div>
                          )}
                          {errors.map((err, idx) => (
                            <div key={`err-${idx}`} className='p-3 flex items-start gap-2'>
                              <XCircle className='h-4 w-4 text-red-500 mt-0.5 shrink-0' />
                              <span className='text-sm'>{String(err)}</span>
                            </div>
                          ))}
                          {warnings.map((warn, idx) => (
                            <div key={`warn-${idx}`} className='p-3 flex items-start gap-2'>
                              <AlertTriangle className='h-4 w-4 text-orange-500 mt-0.5 shrink-0' />
                              <span className='text-sm'>{String(warn)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                <div className='lg:col-span-2 space-y-6 lg:sticky lg:top-6'>
                  {/* Config Snapshot */}
                  {(() => {
                    const snap = detail?.configSnapshot;
                    if (!snap || typeof snap !== 'object') return null;
                    return (
                      <Card>
                        <CardHeader className='pb-3'>
                          <CardTitle className='text-sm font-medium'>
                            {t('historyDetail.configSnapshot', '测试配置快照')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ConfigSnapshotView config={snap as Record<string, unknown>} />
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              </div>
            </TabsContent>

            {/* ── 详情 ── */}
            <TabsContent value='details' className='mt-4'>
              <Suspense fallback={<TabLoading />}>
                {(() => {
                  switch (testTypeStr) {
                    case 'security':
                      return <SecurityOverviewPanelLazy />;
                    case 'seo':
                      return <SeoDetailPanelLazy />;
                    case 'accessibility':
                    case 'a11y':
                      return <AccessibilityChartPanelLazy />;
                    case 'compatibility':
                    case 'compat':
                      return <CompatibilityChartPanelLazy />;
                    case 'ux':
                    case 'experience':
                      return <UxChartPanelLazy />;
                    case 'website':
                    case 'full':
                    case 'comprehensive':
                      return <WebsiteChartPanelLazy />;
                    default:
                      return (
                        <Card>
                          <CardContent className='py-8 text-center text-sm text-muted-foreground'>
                            {t('historyTabs.noDetails', '暂无详情数据')}
                          </CardContent>
                        </Card>
                      );
                  }
                })()}
              </Suspense>
            </TabsContent>

            {/* ── 图表 ── */}
            <TabsContent value='chart' className='mt-4'>
              <Suspense fallback={<TabLoading />}>
                {(() => {
                  switch (testTypeStr) {
                    case 'performance':
                      return <PerformanceChartPanelLazy />;
                    case 'seo':
                      return <SeoChartPanelLazy />;
                    case 'api':
                    case 'rest':
                      return <ApiChartPanelLazy />;
                    case 'stress':
                    case 'load':
                      return <StressChartPanelLazy />;
                    case 'accessibility':
                    case 'a11y':
                      return <AccessibilityChartPanelLazy />;
                    case 'compatibility':
                    case 'compat':
                      return <CompatibilityChartPanelLazy />;
                    case 'ux':
                    case 'experience':
                      return <UxChartPanelLazy />;
                    case 'website':
                    case 'full':
                    case 'comprehensive':
                      return <WebsiteChartPanelLazy />;
                    default:
                      return <PerformanceChartPanelLazy />;
                  }
                })()}
              </Suspense>
            </TabsContent>

            {/* ── 对比 ── */}
            <TabsContent value='compare' className='mt-4'>
              <CompareTabContent
                compareId={compareId}
                compareLoading={compareLoading}
                compareOptions={compareOptions}
                compareKeyMetrics={compareKeyMetrics}
                onCompareIdChange={setCompareId}
              />
            </TabsContent>

            {/* ── 趋势 ── */}
            <TabsContent value='trend' className='mt-4'>
              {(() => {
                if (perfTrendUrl && statusValue === 'completed') {
                  return (
                    <Card>
                      <CardHeader className='pb-3'>
                        <CardTitle className='text-lg font-medium'>
                          {t('historyDetail.perfTrend', '性能趋势')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Suspense fallback={<TabLoading />}>
                          <PerformanceTrendChartLazy
                            url={perfTrendUrl}
                            workspaceId={workspaceId || undefined}
                            currentTestId={id}
                          />
                        </Suspense>
                      </CardContent>
                    </Card>
                  );
                }
                return (
                  <Suspense fallback={<TabLoading />}>
                    <TrendPanelLazy />
                  </Suspense>
                );
              })()}
            </TabsContent>

            {/* ── 漏洞列表（安全测试专用） ── */}
            <TabsContent value='vulnerabilities' className='mt-4'>
              <Suspense fallback={<TabLoading />}>
                <SecurityVulnListPanelLazy />
              </Suspense>
            </TabsContent>

            {/* ── 合规检查（安全测试专用） ── */}
            <TabsContent value='compliance' className='mt-4'>
              <Suspense fallback={<TabLoading />}>
                <SecurityCompliancePanelLazy />
              </Suspense>
            </TabsContent>

            {/* ── 配置 ── */}
            <TabsContent value='config' className='mt-4'>
              {(() => {
                const snap = detail?.configSnapshot;
                if (snap && typeof snap === 'object') {
                  return (
                    <Card>
                      <CardHeader className='pb-3'>
                        <CardTitle className='text-lg font-medium'>
                          {t('historyDetail.configSnapshot', '测试配置快照')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ConfigSnapshotView config={snap as Record<string, unknown>} />
                      </CardContent>
                    </Card>
                  );
                }
                return (
                  <Suspense fallback={<TabLoading />}>
                    <ConfigSummaryPanelLazy />
                  </Suspense>
                );
              })()}
            </TabsContent>

            {/* ── JSON ── */}
            <TabsContent value='json' className='mt-4'>
              <RawJsonViewer />
            </TabsContent>

            {/* ── 日志 ── */}
            <TabsContent value='log' className='mt-4'>
              <LogViewer />
            </TabsContent>

            {/* ── 历史 ── */}
            <TabsContent value='history' className='mt-4'>
              <HistoryTabContent currentId={id} history={history} testTypeStr={testTypeStr} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default HistoryDetailPage;
