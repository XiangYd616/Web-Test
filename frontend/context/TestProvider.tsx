import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import i18n from '../i18n';
import { consoleLog } from '../utils/consoleStore';
// systemApi 已移除（本地工具不需要服务端系统健康检查）
import { getEnvironment, listEnvironments, type EnvironmentItem } from '../services/environmentApi';
import {
  createAndStartTest,
  createTemplate as createTemplateRequest,
  deleteTemplate as deleteTemplateRequest,
  getTestHistory,
  getTestLogs,
  getTestResult,
  getTestStatus,
  getTestTemplates,
  stopTest as stopTestRequest,
  updateTemplate as updateTemplateRequest,
} from '../services/testApi';
import {
  getPollInterval,
  subscribe as subscribeTestEvents,
  waitChannelReady,
} from '../services/testEventChannel';
import {
  createWorkspace as createWorkspaceRequest,
  deleteWorkspace,
  listWorkspaces,
  updateWorkspace as updateWorkspaceRequest,
} from '../services/workspaceApi';
import { isDesktop as checkIsDesktop } from '../utils/environment';
import { storage } from '../utils/storage';
import { finishTimersForTest, trackCounter } from '../utils/telemetry';
import { extractTemplateVarNames, validateUrlWithTemplateVars } from '../utils/url';
import {
  DEFAULT_ADVANCED_SETTINGS,
  DEFAULT_API_TEST_META,
  DEFAULT_CONFIG,
  DEFAULT_HISTORY_META,
  DEFAULT_HISTORY_PAGINATION,
  DEFAULT_REQUEST_META,
  DEFAULT_RESULT_PAYLOAD,
  getDefaultAcceptHeader,
  HISTORY_ITEMS,
  LOG_SEED,
  SYSTEM_STATUS,
  TEMPLATE_ITEMS,
  TEST_TYPE_LABELS,
  TEST_TYPES,
  TestConfigContext,
  TestEnvironmentContext,
  TestHistoryContext,
  TestLogContext,
  TestResultContext,
  TestSystemContext,
  TestTemplateContext,
  TestUserContext,
  TestWorkspaceContext,
  type AdvancedSettings,
  type ApiTestMeta,
  type HistoryMeta,
  type LogEntry,
  type LogStatus,
  type RequestMeta,
  type TemplateItem,
  type TestProgressInfo,
  type TestResult,
  type TestStatus,
  type TestType,
} from './TestContext';

export const TestProvider = ({ children }: { children: ReactNode }) => {
  const isDesktop = checkIsDesktop();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<TestType>('performance');

  // 监听 TabBar 发出的测试类型切换事件
  useEffect(() => {
    const handler = (e: Event) => {
      const testType = (e as CustomEvent).detail as TestType;
      if (testType) setSelectedType(testType);
    };
    window.addEventListener('tw:select-test-type', handler);
    return () => window.removeEventListener('tw:select-test-type', handler);
  }, []);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [url, setUrl] = useState<string>('https://example.com');
  const [configText, setConfigText] = useState<string>(DEFAULT_CONFIG);
  const [resultPayloadText, setResultPayloadText] = useState<string>(DEFAULT_RESULT_PAYLOAD);
  const [history, setHistory] = useState(HISTORY_ITEMS);
  const [historyPagination, setHistoryPagination] = useState(DEFAULT_HISTORY_PAGINATION);
  const [templates, setTemplates] = useState(TEMPLATE_ITEMS);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [progressInfo, setProgressInfo] = useState<TestProgressInfo | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceOptions, setWorkspaceOptions] = useState<
    Array<{
      id: string;
      name: string;
      description?: string;
      visibility?: 'private' | 'team' | 'public';
    }>
  >([]);
  const [currentUser, setCurrentUser] = useState<Record<string, unknown> | null>(() =>
    storage.get('current_user', null as Record<string, unknown> | null)
  );
  const [requestMeta, setRequestMeta] = useState<RequestMeta>(DEFAULT_REQUEST_META);
  const [apiTestMeta, setApiTestMeta] = useState<ApiTestMeta>(DEFAULT_API_TEST_META);
  const [historyMeta, setHistoryMeta] = useState<HistoryMeta>(DEFAULT_HISTORY_META);
  const [advancedSettings, setAdvancedSettings] =
    useState<AdvancedSettings>(DEFAULT_ADVANCED_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TestResult>({
    status: 'idle',
    duration: '-',
    score: 0,
    engine: 'performance',
  });
  const [logs, setLogs] = useState(LOG_SEED);
  const [currentLogTestId, setCurrentLogTestId] = useState<string | null>(null);
  const [logStatus, setLogStatus] = useState<LogStatus>('idle');
  const [systemStatus, setSystemStatus] = useState<string[]>(SYSTEM_STATUS);
  const initialLogLoadedRef = useRef(false);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [environments, setEnvironments] = useState<EnvironmentItem[]>([]);
  const [resolvedVariables, setResolvedVariables] = useState<Record<string, string>>({});

  // ── 标签页会话快照缓存：切换标签时保存/恢复显示层状态 ──
  // 注意：activeTestId / isProcessing 保持全局，不隔离，确保后台测试订阅不中断
  type SessionSnapshot = {
    selectedType: TestType;
    result: TestResult;
    resultPayloadText: string;
    logs: LogEntry[];
    logStatus: LogStatus;
    progressInfo: TestProgressInfo | null;
    configText: string;
    url: string;
  };
  const sessionCacheRef = useRef<Record<string, SessionSnapshot>>({});
  const activeTabIdRef = useRef<string | null>(null);
  // testId → tabId 映射：后台测试完成时知道结果属于哪个标签
  const testTabMapRef = useRef<Record<string, string>>({});

  // 监听 TabBar 初始化/路由变化时的 activeTabId 同步
  useEffect(() => {
    const handler = (e: Event) => {
      const tabId = (e as CustomEvent).detail as string;
      if (tabId) activeTabIdRef.current = tabId;
    };
    window.addEventListener('tw:active-tab-id', handler);
    return () => window.removeEventListener('tw:active-tab-id', handler);
  }, []);

  // 监听 TabBar 标签切换事件：保存旧会话显示状态、恢复新会话显示状态
  useEffect(() => {
    const handler = (e: Event) => {
      const { fromTabId, toTabId } = (e as CustomEvent).detail as {
        fromTabId: string;
        toTabId: string;
      };
      if (!fromTabId || !toTabId || fromTabId === toTabId) return;

      // 保存旧标签页的显示快照
      sessionCacheRef.current[fromTabId] = {
        selectedType,
        result,
        resultPayloadText,
        logs,
        logStatus,
        progressInfo,
        configText,
        url,
      };

      // 恢复新标签页的显示快照（如果存在）
      const cached = sessionCacheRef.current[toTabId];
      if (cached) {
        setSelectedType(cached.selectedType);
        setResult(cached.result);
        setResultPayloadText(cached.resultPayloadText);
        setLogs(cached.logs);
        setLogStatus(cached.logStatus);
        setProgressInfo(cached.progressInfo);
        setConfigText(cached.configText);
        setUrl(cached.url);
      } else {
        // 新标签页：重置显示为空状态
        setResult({ status: 'idle', duration: '-', score: 0, engine: 'performance' });
        setResultPayloadText(DEFAULT_RESULT_PAYLOAD);
        setLogs(LOG_SEED);
        setLogStatus('idle');
        setProgressInfo(null);
        setConfigText(DEFAULT_CONFIG);
      }

      activeTabIdRef.current = toTabId;
    };
    window.addEventListener('tw:switch-tab', handler);
    return () => window.removeEventListener('tw:switch-tab', handler);
  }); // 不传依赖数组，每次渲染都用最新的状态值

  // 自动将当前全局显示状态持续同步到 sessionCache
  // 同步到两个 tabId：① 当前显示的标签 ② activeTestId 所属的标签
  // 这样后台测试完成时，即使用户已切到其他标签，结果也会写入发起测试的标签 cache
  useEffect(() => {
    const snapshot: SessionSnapshot = {
      selectedType,
      result,
      resultPayloadText,
      logs,
      logStatus,
      progressInfo,
      configText,
      url,
    };
    // 同步到当前显示的标签
    const displayTabId = activeTabIdRef.current;
    if (displayTabId) {
      sessionCacheRef.current[displayTabId] = snapshot;
    }
    // 同步到发起测试的标签（如果不同于当前显示的标签）
    if (activeTestId) {
      const testOwnerTabId = testTabMapRef.current[activeTestId];
      if (testOwnerTabId && testOwnerTabId !== displayTabId) {
        sessionCacheRef.current[testOwnerTabId] = snapshot;
      }
    }
  }, [
    selectedType,
    result,
    resultPayloadText,
    logs,
    logStatus,
    progressInfo,
    configText,
    url,
    activeTestId,
  ]);

  const configDraftsRef = useRef<Record<TestType, string>>({} as Record<TestType, string>);
  const logOffsetsRef = useRef<Record<string, number>>({});
  const logsByTestIdRef = useRef<Record<string, LogEntry[]>>({});
  const LOG_MAX_PER_TEST = 500;
  const LOG_MAX_TEST_IDS = 20;

  const trimLogCache = useCallback(() => {
    const ids = Object.keys(logsByTestIdRef.current);
    if (ids.length > LOG_MAX_TEST_IDS) {
      const toRemove = ids.slice(0, ids.length - LOG_MAX_TEST_IDS);
      for (const id of toRemove) {
        delete logsByTestIdRef.current[id];
        delete logOffsetsRef.current[id];
      }
    }
  }, []);

  const appendLogForTest = useCallback(
    (testId: string | null, entry: LogEntry) => {
      // 同步写入全局 Console 面板
      const level = entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warn' : 'info';
      consoleLog(level, entry.message);

      if (!testId) {
        setLogs(prev => [...prev, entry].slice(-LOG_MAX_PER_TEST));
        return;
      }
      const baseLogs = logsByTestIdRef.current[testId] ?? [];
      const nextLogs = [...baseLogs, entry].slice(-LOG_MAX_PER_TEST);
      logsByTestIdRef.current[testId] = nextLogs;
      trimLogCache();
      if (!currentLogTestId || currentLogTestId === testId) {
        setLogs(nextLogs);
      }
    },
    [currentLogTestId, trimLogCache]
  );

  const isRecord = useCallback(
    (value: unknown): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null && !Array.isArray(value),
    []
  );

  const composeConfig = useCallback(
    (
      nextUrl: string,
      type: TestType,
      nextRequest: RequestMeta,
      nextHistory: HistoryMeta,
      nextAdvanced: AdvancedSettings,
      nextOptions: Record<string, unknown> = {}
    ) => {
      return JSON.stringify(
        {
          testType: type,
          url: nextUrl,
          request: nextRequest,
          history: nextHistory,
          advanced: nextAdvanced,
          options: nextOptions,
        },
        null,
        2
      );
    },
    []
  );

  const safeParseConfig = useCallback((value: string) => {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, []);

  const buildDefaultConfigText = useCallback(
    (type: TestType, nextUrl: string) =>
      composeConfig(
        nextUrl,
        type,
        DEFAULT_REQUEST_META,
        DEFAULT_HISTORY_META,
        DEFAULT_ADVANCED_SETTINGS,
        {}
      ),
    [composeConfig]
  );

  useEffect(() => {
    configDraftsRef.current[selectedType] = configText;
  }, [configText, selectedType]);

  const formatHistoryLabel = useCallback((type: TestType, testUrl?: string) => {
    const key = TEST_TYPE_LABELS[type] ?? type;
    const name = i18n.t(key);
    const safeUrl = testUrl ? testUrl.replace(/^https?:\/\//, '') : '';
    return `${name} · ${safeUrl || 'unknown'}`;
  }, []);

  useEffect(() => {
    const handleLanguageChange = () => {
      setHistory(prev =>
        prev.map(item => ({
          ...item,
          label: formatHistoryLabel(item.type, item.url),
        }))
      );
    };
    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [formatHistoryLabel]);

  const mapHistoryItem = useCallback(
    (item: Record<string, unknown>) => {
      const testId = String(item.id || '');
      const engineType = String(item.testType || 'performance') as TestType;
      const testUrl = String(item.url || '');
      const testConfig = (item.testConfig as Record<string, unknown> | undefined) || undefined;
      const testOptions = isRecord(testConfig?.options)
        ? (testConfig?.options as Record<string, unknown>)
        : {};
      const rootRequest = isRecord(testConfig?.request)
        ? (testConfig?.request as RequestMeta)
        : null;
      const rootHistory = isRecord(testConfig?.history)
        ? (testConfig?.history as HistoryMeta)
        : null;
      const rootAdvanced = isRecord(testConfig?.advanced)
        ? (testConfig?.advanced as AdvancedSettings)
        : null;
      const optionsRequest = isRecord(testOptions.request)
        ? (testOptions.request as RequestMeta)
        : null;
      const optionsHistory = isRecord(testOptions.history)
        ? (testOptions.history as HistoryMeta)
        : null;
      const optionsAdvanced = isRecord(testOptions.advanced)
        ? (testOptions.advanced as AdvancedSettings)
        : null;
      const nextRequest = rootRequest || optionsRequest || requestMeta;
      const nextHistory = rootHistory || optionsHistory || historyMeta;
      let nextAdvanced = rootAdvanced || optionsAdvanced || advancedSettings;
      if (typeof testConfig?.concurrency === 'number') {
        nextAdvanced = { ...nextAdvanced, concurrency: testConfig.concurrency };
      }
      if (typeof testConfig?.duration === 'number') {
        nextAdvanced = { ...nextAdvanced, duration: testConfig.duration };
      }
      return {
        id: testId,
        label: formatHistoryLabel(engineType, testUrl),
        type: engineType,
        url: testUrl,
        score:
          item.score === null || item.score === undefined || item.score === ''
            ? undefined
            : Number.isFinite(Number(item.score))
              ? Number(item.score)
              : undefined,
        configText: composeConfig(
          testUrl || url,
          engineType,
          nextRequest,
          nextHistory,
          nextAdvanced,
          testOptions
        ),
        duration:
          item.executionTime != null && Number.isFinite(Number(item.executionTime))
            ? Number(item.executionTime)
            : undefined,
        status: String(item.status || 'pending') as TestStatus,
        createdAt: item.createdAt ? String(item.createdAt) : undefined,
        updatedAt: item.updatedAt ? String(item.updatedAt) : undefined,
        tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
      } as const;
    },
    [advancedSettings, composeConfig, formatHistoryLabel, historyMeta, requestMeta, url, isRecord]
  );

  const normalizeTemplate = useCallback(
    (item: Record<string, unknown>): TemplateItem => {
      const configValue = item.config;
      const parsedConfig =
        typeof configValue === 'string'
          ? safeParseConfig(configValue)
          : (configValue as Record<string, unknown>);
      const engineType = String(item.engineType || 'performance') as TestType;
      return {
        id: String(item.id || ''),
        name: String(item.name || 'Untitled'),
        engineType,
        config: parsedConfig || {},
        description: String(item.description || ''),
        isPublic: Boolean(item.isPublic),
        isDefault: Boolean(item.isDefault),
        isOfficial:
          item.userId === null ||
          item.userId === undefined ||
          item.user_id === null ||
          item.user_id === undefined,
      };
    },
    [safeParseConfig]
  );

  // 用 ref 保存最新的 pagination 默认值，避免 refreshHistory 依赖 historyPagination 导致无限循环
  const historyPaginationRef = useRef(historyPagination);
  historyPaginationRef.current = historyPagination;

  const refreshHistory = useCallback(
    async (params?: { page?: number; limit?: number; testType?: string; keyword?: string }) => {
      const page = params?.page ?? historyPaginationRef.current.page ?? 1;
      const limit = params?.limit ?? historyPaginationRef.current.limit ?? 20;
      const testType = params?.testType;
      const keyword = params?.keyword;
      try {
        const data = await getTestHistory({
          page,
          limit,
          testType,
          keyword,
          workspaceId: workspaceId || undefined,
        });
        const mapped = (data.tests || []).map(mapHistoryItem);
        setHistory(mapped);
        const pagination = data.pagination || {};
        setHistoryPagination({
          page: Number(pagination.page ?? page) || page,
          limit: Number(pagination.limit ?? limit) || limit,
          total: Number(pagination.total ?? mapped.length) || 0,
          totalPages: Number(pagination.totalPages ?? 1) || 1,
          typeCounts: (data as Record<string, unknown>).typeCounts as
            | Record<string, number>
            | undefined,
          statusCounts: (data as Record<string, unknown>).statusCounts as
            | Record<string, number>
            | undefined,
          avgScore: (data as Record<string, unknown>).avgScore as number | null | undefined,
          avgDuration: (data as Record<string, unknown>).avgDuration as number | null | undefined,
        });
      } catch {
        setHistory([]);
        setHistoryPagination(prev => ({ ...prev, total: 0 }));
      }
    },
    [mapHistoryItem, workspaceId]
  );

  const refreshTemplates = useCallback(async () => {
    try {
      const data = await getTestTemplates({ workspaceId: workspaceId || undefined });
      const mapped = (data || []).map(normalizeTemplate);
      setTemplates(mapped);
    } catch {
      setTemplates([]);
    }
  }, [normalizeTemplate, workspaceId]);

  // 稳定引用：避免 refreshHistory / refreshTemplates 因内部依赖变化导致 useEffect 无限循环
  const refreshHistoryRef = useRef(refreshHistory);
  refreshHistoryRef.current = refreshHistory;
  const stableRefreshHistory = useCallback(
    (params?: { page?: number; limit?: number; testType?: string; keyword?: string }) =>
      refreshHistoryRef.current(params),
    []
  );

  const refreshTemplatesRef = useRef(refreshTemplates);
  refreshTemplatesRef.current = refreshTemplates;
  const stableRefreshTemplates = useCallback(() => refreshTemplatesRef.current(), []);

  // 防重入锁：避免多次并发 refreshTest 导致状态抖动
  const refreshTestBusyRef = useRef(false);

  const refreshTest = useCallback(
    async (testId: string) => {
      if (refreshTestBusyRef.current) return;
      refreshTestBusyRef.current = true;
      try {
        const statusData = await getTestStatus(testId, workspaceId || undefined);
        const status = String(statusData.status || 'pending') as TestStatus;
        const processing = status === 'pending' || status === 'queued' || status === 'running';
        const actualEngine = statusData.testType
          ? (String(statusData.testType) as TestType)
          : selectedType;
        setResult(prev => ({
          ...prev,
          status,
          engine: actualEngine,
        }));
        setIsProcessing(processing);
        if (status === 'completed') {
          setProgressInfo((prev: TestProgressInfo | null) => ({
            progress: 100,
            status,
            currentStep: prev?.currentStep,
          }));
        } else if (status === 'failed' || status === 'cancelled' || status === 'stopped') {
          setProgressInfo((prev: TestProgressInfo | null) => ({
            progress: prev?.progress ?? 0,
            status,
            currentStep: prev?.currentStep,
          }));
          const errorMsg = statusData.errorMessage as string | undefined;
          if (errorMsg && status === 'failed') {
            toast.error(errorMsg);
          }
        }

        // 提取日志的通用辅助函数（仅在终态时拉取完整日志）
        const fetchAndApplyLogs = async (targetTestId: string) => {
          try {
            const logsData = await getTestLogs(targetTestId, {
              workspaceId: workspaceId || undefined,
              limit: 200,
              offset: 0,
            });
            if (!Array.isArray(logsData.logs)) return;
            const nextLogs = logsData.logs.map(log => {
              const raw = log as Record<string, unknown>;
              return {
                level: (raw.level as 'info' | 'warn' | 'error') || 'info',
                message: String(raw.message || ''),
                timestamp: raw.createdAt ? String(raw.createdAt) : undefined,
                context:
                  raw.context && typeof raw.context === 'object' && !Array.isArray(raw.context)
                    ? (raw.context as Record<string, unknown>)
                    : undefined,
              };
            });
            logsByTestIdRef.current[targetTestId] = nextLogs;
            if (!currentLogTestId || currentLogTestId === targetTestId) {
              setLogs(nextLogs);
            }
          } catch {
            // 日志拉取失败不影响主流程
          }
        };

        if (status === 'completed') {
          let resultData: Record<string, unknown> | null = null;
          try {
            resultData = await getTestResult(testId, workspaceId || undefined);
          } catch {
            // ignore
          }
          if (resultData) {
            setResultPayloadText(JSON.stringify(resultData, null, 2));
            setResult(prev => ({
              ...prev,
              status: 'completed',
              score: Number(resultData.score ?? prev.score ?? 0),
            }));
            finishTimersForTest(testId);
            trackCounter('test.completed');
            const scoreVal = Number(resultData.score ?? 0);
            appendLogForTest(testId, {
              level: 'info',
              message: `[${actualEngine}] 测试完成 · 评分 ${scoreVal}`,
            });
            toast.success(
              i18n.t('test.completedSaved', `测试完成 · 评分 ${scoreVal} · 已保存到历史`)
            );
          } else {
            setResultPayloadText('');
          }
          await fetchAndApplyLogs(testId);
          setLogStatus('done');
          void stableRefreshHistory();
          return;
        }

        if (status === 'failed' || status === 'cancelled' || status === 'stopped') {
          appendLogForTest(testId, {
            level: status === 'failed' ? 'error' : 'warn',
            message: `[${actualEngine}] 测试${status === 'failed' ? '失败' : status === 'cancelled' ? '已取消' : '已停止'}`,
          });
          // 尝试加载部分结果数据（测试可能已产出部分结果）
          try {
            const partialResult = await getTestResult(testId, workspaceId || undefined);
            if (partialResult) {
              setResultPayloadText(JSON.stringify(partialResult, null, 2));
              setResult(prev => ({
                ...prev,
                score: Number(partialResult.score ?? prev.score ?? 0),
              }));
            }
          } catch {
            // 部分结果不可用，不影响主流程
          }
          await fetchAndApplyLogs(testId);
          setLogStatus('done');
          void stableRefreshHistory();
          return;
        }

        // 运行中 → live（日志由事件通道实时推送，无需 HTTP 拉取）
        setLogStatus('live');
      } catch (error) {
        const httpStatus = (error as { response?: { status?: number } })?.response?.status;
        if (httpStatus === 404 || httpStatus === 403) {
          setIsProcessing(false);
          setLogStatus('idle');
          return;
        }
        setIsProcessing(false);
        setLogStatus('idle');
        appendLogForTest(activeTestId, { level: 'error', message: (error as Error).message });
      } finally {
        refreshTestBusyRef.current = false;
      }
    },
    [
      activeTestId,
      appendLogForTest,
      currentLogTestId,
      stableRefreshHistory,
      selectedType,
      workspaceId,
    ]
  );

  const appendLogRef = useRef(appendLogForTest);
  appendLogRef.current = appendLogForTest;

  // ── 统一事件通道：通过 testEventChannel 订阅进度/完成/失败/日志 ──
  useEffect(() => {
    if (!activeTestId || !isProcessing) {
      setProgressInfo(null);
      return;
    }

    const sub = subscribeTestEvents(activeTestId, {
      onProgress: info => {
        setProgressInfo(prev => ({
          progress: info.progress ?? prev?.progress ?? 0,
          status: info.status ?? prev?.status,
          currentStep: info.currentStep ?? prev?.currentStep,
          stats: info.stats ?? prev?.stats,
        }));
      },
      onLog: log => {
        appendLogRef.current(activeTestId, log);
      },
      onCompleted: () => {
        void refreshTest(activeTestId);
      },
      onError: () => {
        void refreshTest(activeTestId);
      },
    });

    // 保底轮询（桌面端 3s / Web 端 15s）
    const timer = window.setInterval(() => {
      void refreshTest(activeTestId);
    }, getPollInterval());

    // 硬超时兜底：5 分钟后若仍在 processing，强制清理
    const hardTimeout = window.setTimeout(
      () => {
        setIsProcessing(false);
        setResult(prev => ({ ...prev, status: 'failed' }));
        setProgressInfo(prev => ({
          progress: prev?.progress ?? 0,
          status: 'failed' as TestStatus,
          currentStep: '超时：未能获取测试结果',
        }));
        appendLogRef.current(activeTestId, {
          level: 'error',
          message: '测试超时: 5 分钟内未获取到结果，已强制终止',
        });
        toast.error('测试超时，未能获取结果。请检查网络连接后重试。');
      },
      5 * 60 * 1000
    );

    return () => {
      sub.unsubscribe();
      window.clearInterval(timer);
      window.clearTimeout(hardTimeout);
    };
  }, [activeTestId, isProcessing, refreshTest]);

  useEffect(() => {
    if (!activeTestId) {
      return;
    }
    setCurrentLogTestId(activeTestId);
    const cachedLogs = logsByTestIdRef.current[activeTestId];
    setLogs(cachedLogs ?? LOG_SEED);
  }, [activeTestId]);

  useEffect(() => {
    if (!selectedHistoryId || selectedHistoryId === activeTestId) {
      return;
    }
    setCurrentLogTestId(selectedHistoryId);
    const cachedLogs = logsByTestIdRef.current[selectedHistoryId];
    setLogs(cachedLogs ?? LOG_SEED);
  }, [activeTestId, selectedHistoryId]);

  const updateConfigText = useCallback(
    (value: string) => {
      setConfigText(value);
      const parsed = safeParseConfig(value);
      const nextUrl = typeof parsed.url === 'string' ? parsed.url : url;
      const nextType = (parsed.testType as TestType) || selectedType;
      const nextRequest = (parsed.request as RequestMeta) || requestMeta;
      const nextHistory = (parsed.history as HistoryMeta) || historyMeta;
      const nextAdvanced = (parsed.advanced as AdvancedSettings) || advancedSettings;
      setUrl(nextUrl);
      setSelectedType(nextType);
      setRequestMeta(nextRequest);
      setHistoryMeta(nextHistory);
      setAdvancedSettings(nextAdvanced);
    },
    [advancedSettings, historyMeta, requestMeta, safeParseConfig, selectedType, url]
  );

  const selectTestType = useCallback(
    (type: TestType) => {
      if (type === selectedType) {
        return;
      }
      configDraftsRef.current[selectedType] = configText;
      setSelectedHistoryId(null);
      setSelectedTemplateId(null);
      const nextConfig = configDraftsRef.current[type] ?? buildDefaultConfigText(type, url);
      updateConfigText(nextConfig);
      setResult(prev => ({
        ...prev,
        engine: type,
        status: isProcessing ? prev.status : 'idle',
      }));

      // 自动更新 Accept 请求头以匹配目标测试类型
      const newAccept = getDefaultAcceptHeader(type);
      setRequestMeta(prev => {
        const acceptIdx = prev.headers.findIndex(h => h.key.toLowerCase() === 'accept');
        if (acceptIdx >= 0) {
          const updated = [...prev.headers];
          updated[acceptIdx] = { ...updated[acceptIdx], value: newAccept };
          return {
            ...prev,
            headers: updated,
            contentType: type === 'api' ? 'application/json' : 'text/html',
          };
        }
        return {
          ...prev,
          headers: [...prev.headers, { key: 'Accept', value: newAccept, enabled: true }],
          contentType: type === 'api' ? 'application/json' : 'text/html',
        };
      });
    },
    [buildDefaultConfigText, configText, isProcessing, selectedType, updateConfigText, url]
  );

  const selectHistory = useCallback(
    (id: string) => {
      const item = history.find(entry => entry.id === id);
      if (!item) {
        return;
      }
      logOffsetsRef.current[id] = 0;
      setSelectedHistoryId(id);
      setSelectedType(item.type);
      setUrl(item.url);
      updateConfigText(
        item.configText ||
          composeConfig(item.url, item.type, requestMeta, historyMeta, advancedSettings)
      );
      // API 测试：从历史配置中恢复 apiTestMeta
      if (item.type === 'api' && item.configText) {
        try {
          const parsed = JSON.parse(item.configText) as Record<string, unknown>;
          const opts = isRecord(parsed.options)
            ? (parsed.options as Record<string, unknown>)
            : parsed;
          const restoredMeta: ApiTestMeta = {
            assertions: Array.isArray(opts.assertions)
              ? (opts.assertions as ApiTestMeta['assertions'])
              : [],
            endpoints: Array.isArray(opts.endpoints)
              ? (opts.endpoints as ApiTestMeta['endpoints'])
              : [],
            variables: Array.isArray(opts.variables)
              ? (opts.variables as ApiTestMeta['variables'])
              : isRecord(opts.variables)
                ? Object.entries(opts.variables as Record<string, string>).map(([key, value]) => ({
                    key,
                    value,
                    enabled: true,
                  }))
                : [],
            extractions: Array.isArray(opts.extractions)
              ? (opts.extractions as ApiTestMeta['extractions'])
              : [],
          };
          if (
            restoredMeta.assertions.length ||
            restoredMeta.endpoints.length ||
            restoredMeta.variables.length ||
            restoredMeta.extractions.length
          ) {
            setApiTestMeta(restoredMeta);
          }
        } catch {
          // 解析失败不影响主流程
        }
      }
      setResult(prev => ({ ...prev, engine: item.type, status: 'pending' }));
      // 场景2: 立即清空日志 → loading → 加载该次完整日志
      setLogs([]);
      setCurrentLogTestId(id);
      setLogStatus('loading');
      void refreshTest(id);
    },
    [
      advancedSettings,
      composeConfig,
      history,
      historyMeta,
      isRecord,
      refreshTest,
      requestMeta,
      updateConfigText,
    ]
  );

  const selectTemplate = useCallback(
    (id: string) => {
      const template = templates.find(item => item.id === id);
      if (!template) {
        return;
      }
      setSelectedTemplateId(id);
      setSelectedType(template.engineType);
      const nextUrl = String(template.config.url || url || '');
      setUrl(nextUrl);
      const nextRequest = (template.config.request as RequestMeta) || requestMeta;
      const nextHistory = (template.config.history as HistoryMeta) || historyMeta;
      const nextAdvanced = (template.config.advanced as AdvancedSettings) || advancedSettings;
      const nextOptions = (template.config.options as Record<string, unknown> | undefined) || {};
      setRequestMeta(nextRequest);
      setHistoryMeta(nextHistory);
      setAdvancedSettings(nextAdvanced);
      setConfigText(
        composeConfig(
          nextUrl,
          template.engineType,
          nextRequest,
          nextHistory,
          nextAdvanced,
          nextOptions
        )
      );
    },
    [advancedSettings, composeConfig, historyMeta, requestMeta, templates, url]
  );

  const clearTemplate = useCallback(() => {
    setSelectedTemplateId(null);
  }, []);

  const updateUrl = useCallback(
    (value: string) => {
      const parsed = safeParseConfig(configText);
      const nextOptions = (parsed.options as Record<string, unknown> | undefined) || {};
      setUrl(value);
      setConfigText(
        composeConfig(value, selectedType, requestMeta, historyMeta, advancedSettings, nextOptions)
      );
    },
    [
      advancedSettings,
      composeConfig,
      configText,
      historyMeta,
      requestMeta,
      safeParseConfig,
      selectedType,
    ]
  );

  const updateResultPayloadText = useCallback((value: string) => {
    setResultPayloadText(value);
  }, []);

  const updateResult = useCallback((value: Partial<TestResult>) => {
    setResult(prev => ({ ...prev, ...value }));
  }, []);

  const updateLogs = useCallback(
    (value: LogEntry[], testId?: string) => {
      const targetId = testId ?? currentLogTestId ?? undefined;
      if (targetId) {
        logsByTestIdRef.current[targetId] = value;
        setCurrentLogTestId(targetId);
      }
      setLogs(value);
    },
    [currentLogTestId]
  );

  const updateRequestMeta = useCallback(
    (value: RequestMeta) => {
      const parsed = safeParseConfig(configText);
      const nextOptions = (parsed.options as Record<string, unknown> | undefined) || {};
      setRequestMeta(value);
      setConfigText(
        composeConfig(url, selectedType, value, historyMeta, advancedSettings, nextOptions)
      );
    },
    [advancedSettings, composeConfig, configText, historyMeta, safeParseConfig, selectedType, url]
  );

  const updateApiTestMeta = useCallback((value: ApiTestMeta) => {
    setApiTestMeta(value);
  }, []);

  const updateHistoryMeta = useCallback(
    (value: HistoryMeta) => {
      const parsed = safeParseConfig(configText);
      const nextOptions = (parsed.options as Record<string, unknown> | undefined) || {};
      setHistoryMeta(value);
      setConfigText(
        composeConfig(url, selectedType, requestMeta, value, advancedSettings, nextOptions)
      );
    },
    [advancedSettings, composeConfig, configText, requestMeta, safeParseConfig, selectedType, url]
  );

  const updateAdvancedSettings = useCallback(
    (value: AdvancedSettings) => {
      const parsed = safeParseConfig(configText);
      const nextOptions = (parsed.options as Record<string, unknown> | undefined) || {};
      setAdvancedSettings(value);
      setConfigText(composeConfig(url, selectedType, requestMeta, historyMeta, value, nextOptions));
    },
    [composeConfig, configText, historyMeta, requestMeta, safeParseConfig, selectedType, url]
  );

  const applyPreset = useCallback(
    (preset: 'High' | 'Fast' | 'Custom') => {
      const parsed = safeParseConfig(configText);
      const baseOptions = (parsed.options as Record<string, unknown> | undefined) || {};

      if (preset === 'Custom') {
        setConfigText(
          composeConfig(url, selectedType, requestMeta, historyMeta, advancedSettings, baseOptions)
        );
        return;
      }

      const isHigh = preset === 'High';

      // 通用 advanced 参数
      const nextAdvanced = {
        ...advancedSettings,
        timeout: isHigh ? 90000 : 20000,
        concurrency: isHigh ? 50 : 5,
        iterations: isHigh ? 3 : 1,
        maxRetries: isHigh ? 3 : 1,
      };

      // 按测试类型差异化 options
      const typeOverrides: Record<string, unknown> = {};
      if (selectedType === 'security') {
        Object.assign(typeOverrides, {
          scanDepth: isHigh ? 5 : 2,
          timeout: isHigh ? 60000 : 15000,
          checkVulnerabilities: true,
          checkSSL: true,
          checkHeaders: true,
          checkCookies: isHigh,
        });
      } else if (selectedType === 'seo') {
        Object.assign(typeOverrides, {
          checkMobile: true,
          checkPerformance: isHigh,
          checkAccessibility: isHigh,
          checkBestPractices: isHigh,
          checkSEO: true,
          checkPWA: isHigh,
        });
      } else if (selectedType === 'stress') {
        Object.assign(typeOverrides, {
          users: isHigh ? 100 : 10,
          duration: isHigh ? 300 : 30,
          rampUp: isHigh ? 60 : 5,
          thinkTime: isHigh ? 1000 : 0,
        });
        nextAdvanced.concurrency = isHigh ? 100 : 10;
        nextAdvanced.duration = isHigh ? 300 : 30;
      } else if (selectedType === 'api') {
        Object.assign(typeOverrides, {
          timeout: isHigh ? 30000 : 10000,
        });
        nextAdvanced.maxRetries = isHigh ? 3 : 0;
      } else if (selectedType === 'performance') {
        Object.assign(typeOverrides, {
          iterations: isHigh ? 5 : 1,
          includeResources: isHigh,
          fetchHtml: isHigh,
          verbose: isHigh,
        });
      } else if (selectedType === 'accessibility') {
        Object.assign(typeOverrides, {
          standards: isHigh ? ['WCAG2.1'] : ['WCAG2.0'],
          level: isHigh ? 'AAA' : 'A',
        });
      } else if (selectedType === 'compatibility') {
        Object.assign(typeOverrides, {
          enableMatrix: true,
          featureDetection: isHigh,
          realBrowser: isHigh,
          captureScreenshot: isHigh,
          timeout: isHigh ? 60000 : 15000,
        });
      } else if (selectedType === 'ux') {
        Object.assign(typeOverrides, {
          iterations: isHigh ? 5 : 1,
          sampleDelayMs: isHigh ? 500 : 200,
          confirmPuppeteer: true,
        });
      } else if (selectedType === 'website') {
        Object.assign(typeOverrides, {
          testTypes: isHigh
            ? ['performance', 'security', 'seo', 'accessibility', 'ux']
            : ['performance', 'security'],
          enableScreenshots: isHigh,
          enableConsoleLogging: isHigh,
        });
      }

      const nextOptions = { ...baseOptions, ...typeOverrides };
      setAdvancedSettings(nextAdvanced);
      setConfigText(
        composeConfig(url, selectedType, requestMeta, historyMeta, nextAdvanced, nextOptions)
      );
    },
    [
      advancedSettings,
      composeConfig,
      configText,
      historyMeta,
      requestMeta,
      safeParseConfig,
      selectedType,
      url,
    ]
  );

  const replaceEnvVars = useCallback(
    (text: string): string => {
      if (!text || Object.keys(resolvedVariables).length === 0) return text;
      return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
        key in resolvedVariables ? resolvedVariables[key] : match
      );
    },
    [resolvedVariables]
  );

  const runTest = useCallback(async () => {
    try {
      const parsed = safeParseConfig(configText);
      const finalTestUrl = String(parsed.url || url).trim();
      if (!finalTestUrl) {
        toast.error(i18n.t('editor.urlRequired', '请输入测试网址'));
        return;
      }
      const urlValidation = validateUrlWithTemplateVars(finalTestUrl, {
        invalidProtocol: i18n.t('editor.urlInvalidProtocol', '网址必须以 http:// 或 https:// 开头'),
        invalidDomain: i18n.t(
          'editor.urlInvalidDomain',
          '域名无效，请输入完整域名，例如 example.com'
        ),
        invalid: i18n.t('editor.urlInvalid', '请输入有效的网址，例如 https://example.com'),
      });
      if (!urlValidation.valid) {
        toast.error(urlValidation.error);
        return;
      }

      // 通知 TabBar：如果当前是控制台标签，自动创建测试类型标签页
      window.dispatchEvent(new CustomEvent('tw:ensure-test-tab', { detail: selectedType }));

      setIsProcessing(true);
      setResult(prev => ({ ...prev, status: 'running', score: 0, duration: '' }));
      setResultPayloadText('');
      setProgressInfo({ progress: 0, status: 'pending' });
      // 场景3: 清空历史选中 → 清空日志 → 切换为新测试面板
      setSelectedHistoryId(null);
      setLogs([]);
      setLogStatus('live');
      appendLogForTest(activeTestId, {
        level: 'info',
        message: `[${selectedType}] 测试开始: ${finalTestUrl}`,
      });

      const parsedAdvanced = (parsed.advanced as Record<string, unknown> | undefined) || {};
      const parsedOptions = (parsed.options as Record<string, unknown> | undefined) || {};
      const resolvedType = (parsed.testType as TestType) || selectedType;
      const websiteOptions =
        resolvedType === 'website'
          ? (() => {
              const testTypes = Array.isArray(parsedOptions.testTypes)
                ? (parsedOptions.testTypes as unknown[]).map(value => String(value)).filter(Boolean)
                : [];
              const resolvedTestTypes = testTypes.length ? testTypes : ['performance', 'security'];
              const normalizeRecord = (value: unknown) =>
                isRecord(value) ? (value as Record<string, unknown>) : {};
              const performanceOptions = normalizeRecord(parsedOptions.performanceOptions);
              const securityOptions = normalizeRecord(parsedOptions.securityOptions);
              const seoOptions = normalizeRecord(parsedOptions.seoOptions);
              const accessibilityOptions = normalizeRecord(parsedOptions.accessibilityOptions);
              const uxOptions = normalizeRecord(
                (parsedOptions as Record<string, unknown>).uxOptions ?? parsedOptions.uxConfig
              );
              return {
                ...parsedOptions,
                testTypes: resolvedTestTypes,
                timeout: typeof parsedOptions.timeout === 'number' ? parsedOptions.timeout : 60000,
                enableScreenshots:
                  typeof parsedOptions.enableScreenshots === 'boolean'
                    ? parsedOptions.enableScreenshots
                    : true,
                enableVideoRecording:
                  typeof parsedOptions.enableVideoRecording === 'boolean'
                    ? parsedOptions.enableVideoRecording
                    : false,
                enableConsoleLogging:
                  typeof parsedOptions.enableConsoleLogging === 'boolean'
                    ? parsedOptions.enableConsoleLogging
                    : true,
                enableNetworkLogging:
                  typeof parsedOptions.enableNetworkLogging === 'boolean'
                    ? parsedOptions.enableNetworkLogging
                    : false,
                customHeaders: normalizeRecord(parsedOptions.customHeaders),
                cookies: Array.isArray(parsedOptions.cookies) ? parsedOptions.cookies : [],
                performanceOptions: {
                  iterations: 3,
                  includeResources: true,
                  ...performanceOptions,
                },
                securityOptions: {
                  checkSSL: true,
                  checkHeaders: true,
                  checkVulnerabilities: true,
                  checkCookies: true,
                  scanDepth: 3,
                  timeout: 30000,
                  ...securityOptions,
                },
                seoOptions: {
                  language: i18n.language?.split('-')[0] || 'zh',
                  locale: i18n.language?.split('-')[1] || 'CN',
                  checkMobile: true,
                  checkPerformance: true,
                  checkAccessibility: true,
                  checkBestPractices: true,
                  checkSEO: true,
                  checkPWA: false,
                  customCategories: [],
                  ...seoOptions,
                },
                accessibilityOptions: {
                  standards: ['WCAG2.1'],
                  level: 'AA',
                  checkColorContrast: true,
                  checkKeyboardNavigation: true,
                  checkScreenReaders: true,
                  checkForms: true,
                  checkImages: true,
                  checkHeadings: true,
                  checkLinks: true,
                  checkTables: true,
                  checkLists: true,
                  checkIFrames: true,
                  checkLanguage: true,
                  checkZoom: true,
                  ...accessibilityOptions,
                },
                uxOptions: Object.keys(uxOptions).length ? uxOptions : undefined,
              };
            })()
          : parsedOptions;
      const websiteOverrides =
        resolvedType === 'website'
          ? (() => {
              const testTypes = Array.isArray(websiteOptions.testTypes)
                ? (websiteOptions.testTypes as string[])
                : [];
              const websiteOptionRecord = isRecord(websiteOptions)
                ? (websiteOptions as Record<string, unknown>)
                : {};
              return {
                enablePerformance: testTypes.includes('performance'),
                enableSEO: testTypes.includes('seo'),
                enableAccessibility: testTypes.includes('accessibility'),
                enableUX: testTypes.includes('ux'),
                confirmPuppeteer: true,
                performanceConfig: websiteOptions.performanceOptions,
                seoConfig: websiteOptions.seoOptions,
                accessibilityConfig: websiteOptions.accessibilityOptions,
                uxConfig: websiteOptions.uxOptions ?? websiteOptionRecord.uxConfig,
              };
            })()
          : {};
      const enabledHeaders = requestMeta.headers
        .filter(header => header.enabled && header.key.trim())
        .map(header => ({ key: header.key.trim(), value: header.value }));
      // ── 各引擎配置面板的显示默认值（与 *ConfigPanel 组件一致） ──
      // 确保用户在面板上看到的默认值一定会传递到后端
      const ENGINE_PANEL_DEFAULTS: Record<string, Record<string, unknown>> = {
        stress: {
          users: 50,
          duration: 60,
          rampUp: 15,
          thinkTime: 1000,
          timeout: 30000,
          method: 'GET',
          stressMode: 'load',
          maxResponseTimeThreshold: 5000,
          maxErrorRateThreshold: 5,
          minSuccessRateThreshold: 95,
        },
        performance: {
          iterations: 3,
          timeout: 30000,
          cacheControl: 'no-cache',
          ttfbThreshold: 800,
          lcpThreshold: 2500,
          fcpThreshold: 1800,
        },
        security: {
          timeout: 30000,
          checkSSL: true,
          checkHeaders: true,
          checkVulnerabilities: true,
          checkCookies: true,
          checkCsrf: true,
          checkCors: true,
          checkContentSecurity: true,
          checkXss: false,
          checkSqlInjection: false,
          checkSensitiveInfo: true,
          enableDeepScan: false,
          enablePortScan: false,
          enableScreenshot: false,
        },
        seo: { timeout: 30000 },
        compatibility: { timeout: 30000 },
        accessibility: { timeout: 60000 },
        ux: { iterations: 3, timeout: 60000, sampleDelayMs: 500, cpuSlowdownMultiplier: 1 },
        website: { timeout: 60000 },
        api: { timeout: 30000 },
      };
      const engineDefaults = ENGINE_PANEL_DEFAULTS[resolvedType] || {};

      // 将引擎面板默认值与用户实际设置合并（用户设置优先）
      const mergedOptions: Record<string, unknown> = { ...engineDefaults, ...parsedOptions };

      const resolvedConcurrency =
        resolvedType === 'stress' && typeof mergedOptions.concurrency === 'number'
          ? (mergedOptions.concurrency as number)
          : resolvedType === 'stress' && typeof mergedOptions.users === 'number'
            ? (mergedOptions.users as number)
            : typeof parsedAdvanced.concurrency === 'number'
              ? (parsedAdvanced.concurrency as number)
              : advancedSettings.concurrency;
      const resolvedDuration =
        resolvedType === 'stress' && typeof mergedOptions.duration === 'number'
          ? (mergedOptions.duration as number)
          : typeof parsedAdvanced.duration === 'number'
            ? (parsedAdvanced.duration as number)
            : advancedSettings.duration;
      const stressOverrides =
        resolvedType === 'stress'
          ? {
              concurrency: resolvedConcurrency,
              duration: resolvedDuration,
              rampUp: mergedOptions.rampUp,
              timeout: mergedOptions.timeout,
              method: mergedOptions.method || 'GET',
              body: mergedOptions.body,
              headers: mergedOptions.customHeaders || mergedOptions.headers,
              thinkTime: mergedOptions.thinkTime,
              stressMode: String(mergedOptions.stressMode || 'load'),
              maxResponseTimeThreshold: mergedOptions.maxResponseTimeThreshold,
              maxErrorRateThreshold: mergedOptions.maxErrorRateThreshold,
              minSuccessRateThreshold: mergedOptions.minSuccessRateThreshold,
            }
          : {};
      // 解析引擎面板的 timeout：优先使用引擎面板设置/默认值，fallback 到高级面板
      const resolvedTimeout =
        typeof mergedOptions.timeout === 'number'
          ? (mergedOptions.timeout as number)
          : advancedSettings.timeout;
      const finalUrl = replaceEnvVars(String(parsed.url || url));
      const unresolvedVars = extractTemplateVarNames(finalUrl);
      if (unresolvedVars.length > 0) {
        toast.warning(
          i18n.t('editor.unresolvedVars', {
            vars: unresolvedVars.join(', '),
            defaultValue: `URL 中仍有未解析的变量: ${unresolvedVars.join(', ')}，请在「环境管理」中配置`,
          })
        );
      }
      const resolvedAuthToken = replaceEnvVars(requestMeta.authToken || '');
      const resolvedHeaders = enabledHeaders.map(h => ({
        key: h.key,
        value: replaceEnvVars(h.value),
      }));
      const requestConfig = {
        method: requestMeta.method,
        contentType: requestMeta.contentType,
        authType: requestMeta.authType || 'none',
        authToken: resolvedAuthToken,
        headers: resolvedHeaders,
        queryParams: (requestMeta.queryParams || [])
          .filter(p => p.enabled && p.key.trim())
          .map(p => ({ key: p.key.trim(), value: replaceEnvVars(p.value) })),
        body: requestMeta.body || '',
        bodyType: requestMeta.bodyType || 'none',
        formData: (requestMeta.formData || [])
          .filter(f => f.key.trim())
          .map(f => ({ key: f.key.trim(), value: replaceEnvVars(f.value), type: f.type })),
      };
      const payload = {
        url: finalUrl,
        ...(resolvedType === 'website' ? websiteOptions : mergedOptions),
        ...websiteOverrides,
        ...stressOverrides,
        // testType 必须放在所有展开之后，确保始终是引擎类型（stress/performance/...），不被 parsedOptions 覆盖
        testType: resolvedType,
        // 高级面板字段提升到顶层，让引擎直接读取
        timeout: resolvedTimeout,
        maxRetries: advancedSettings.maxRetries,
        retryOnFail: advancedSettings.retryOnFail,
        followRedirects: advancedSettings.followRedirects,
        // 仅当引擎 options 中没有 device 时才使用高级面板的 device 字符串作为 fallback
        ...(mergedOptions.device == null ? { device: advancedSettings.device } : {}),
        userAgent: advancedSettings.userAgent,
        showBrowser: advancedSettings.showBrowser,
        engineMode: advancedSettings.engineMode,
        // 请求配置提升到顶层
        request: requestConfig,
        // API 测试专用字段：断言、端点、变量
        // 将 extractions 转为 type='extract' 合并到 assertions（后端通过 assertions 中 type=extract 提取变量）
        ...(resolvedType === 'api' &&
        (apiTestMeta.assertions.length > 0 || apiTestMeta.extractions.length > 0)
          ? {
              assertions: [
                ...apiTestMeta.assertions
                  .filter(a => a.enabled)
                  .map(({ id: _id, enabled: _e, ...rest }) => rest),
                ...apiTestMeta.extractions
                  .filter(e => e.enabled && e.name.trim())
                  .map(e => ({
                    type: 'extract' as const,
                    name: e.name.trim(),
                    source: e.source,
                    path: e.path,
                    ...(e.pattern ? { pattern: e.pattern } : {}),
                  })),
              ],
            }
          : {}),
        ...(resolvedType === 'api' && apiTestMeta.endpoints.length > 0
          ? {
              endpoints: apiTestMeta.endpoints
                .filter(ep => ep.enabled)
                .map(ep => ({
                  name: ep.name,
                  url: replaceEnvVars(ep.url),
                  method: ep.method,
                  headers: Object.fromEntries(
                    ep.headers
                      .filter(h => h.enabled && h.key.trim())
                      .map(h => [h.key.trim(), replaceEnvVars(h.value)])
                  ),
                  body: ep.body || undefined,
                  assertions: [
                    ...ep.assertions
                      .filter(a => a.enabled)
                      .map(({ id: _id, enabled: _e, ...rest }) => rest),
                    ...apiTestMeta.extractions
                      .filter(e => e.enabled && e.name.trim())
                      .map(e => ({
                        type: 'extract' as const,
                        name: e.name.trim(),
                        source: e.source,
                        path: e.path,
                        ...(e.pattern ? { pattern: e.pattern } : {}),
                      })),
                  ],
                  variables: ep.variables,
                })),
            }
          : {}),
        ...(resolvedType === 'api' && apiTestMeta.variables.length > 0
          ? {
              variables: Object.fromEntries(
                apiTestMeta.variables
                  .filter(v => v.enabled && v.key.trim())
                  .map(v => [v.key.trim(), replaceEnvVars(v.value)])
              ),
            }
          : {}),
        // 历史配置提升到顶层
        history: historyMeta,
        options: {
          ...mergedOptions,
          request: requestConfig,
          history: historyMeta,
          advanced: advancedSettings,
        },
        concurrency: resolvedConcurrency,
        duration: resolvedDuration,
        templateId: selectedTemplateId || (parsed.templateId as string | undefined),
        workspaceId: workspaceId || (parsed.workspaceId as string | undefined),
      };

      // 等待事件通道就绪（Web 端等 WS 连接，桌面端立即返回）
      await waitChannelReady();

      const data = await createAndStartTest(payload);
      const testId = String(data.testId || data.id || '');

      logOffsetsRef.current[testId] = 0;
      // 记录 testId 属于哪个标签页
      if (activeTabIdRef.current) {
        testTabMapRef.current[testId] = activeTabIdRef.current;
      }
      setActiveTestId(testId);
      setSelectedHistoryId(testId);
      const [historyRes, testRes] = await Promise.allSettled([
        stableRefreshHistory(),
        refreshTest(testId),
      ]);
      if (historyRes.status === 'rejected') {
        appendLogForTest(testId, {
          level: 'error',
          message: (historyRes.reason as Error).message,
        });
      }
      if (testRes.status === 'rejected') {
        appendLogForTest(testId, { level: 'error', message: (testRes.reason as Error).message });
      }
    } catch (error) {
      setIsProcessing(false);
      setResult(prev => ({ ...prev, status: 'failed' }));
      toast.error((error as Error).message || i18n.t('common.requestFailed'));
      appendLogForTest(activeTestId, {
        level: 'error',
        message: `[${selectedType}] 测试启动失败: ${(error as Error).message}`,
      });
    }
  }, [
    activeTestId,
    advancedSettings,
    appendLogForTest,
    configText,
    historyMeta,
    isRecord,
    stableRefreshHistory,
    refreshTest,
    apiTestMeta,
    replaceEnvVars,
    requestMeta,
    safeParseConfig,
    selectedTemplateId,
    selectedType,
    url,
    workspaceId,
  ]);

  const stopTest = useCallback(async () => {
    if (!activeTestId) {
      return;
    }
    try {
      await stopTestRequest(activeTestId, workspaceId || undefined);
      // 不立即 setIsProcessing(false) —— 否则 useEffect 会清理 WS 监听器，
      // 导致后端还在异步处理取消时前端收不到后续事件。
      // 由 refreshTest（轮询或 WS 事件触发）检测到终态后自动设置。
      setResult(prev => ({ ...prev, status: 'stopped' }));
      setProgressInfo(prev => ({
        ...prev,
        progress: prev?.progress ?? 0,
        status: 'stopped' as TestStatus,
      }));
      appendLogForTest(activeTestId, { level: 'warn', message: 'Run stopped by user.' });
      // 主动拉取一次状态，加速 UI 更新
      void refreshTest(activeTestId);
    } catch (error) {
      appendLogForTest(activeTestId, {
        level: 'error',
        message: (error as Error).message,
      });
    }
  }, [activeTestId, appendLogForTest, refreshTest, workspaceId]);

  const createTemplate = useCallback(
    async (payload: {
      name: string;
      description?: string;
      engineType: string;
      config: Record<string, unknown>;
      isPublic?: boolean;
      isDefault?: boolean;
    }) => {
      await createTemplateRequest({ ...payload, workspaceId: workspaceId || undefined });
      await stableRefreshTemplates();
    },
    [stableRefreshTemplates, workspaceId]
  );

  const updateWorkspaceId = useCallback(
    (nextWorkspaceId: string | null) => {
      const params = new URLSearchParams(location.search);
      if (nextWorkspaceId) {
        params.set('workspaceId', nextWorkspaceId);
      } else {
        params.delete('workspaceId');
      }
      const search = params.toString();
      // '/' 是临时路径（会被路由重定向到 /dashboard），直接跳到 /dashboard 避免竞争
      const pathname = location.pathname === '/' ? '/dashboard' : location.pathname;
      navigate(`${pathname}${search ? `?${search}` : ''}`, { replace: true });
      setWorkspaceId(nextWorkspaceId);
    },
    [location.pathname, location.search, navigate]
  );

  const refreshWorkspaces = useCallback(async () => {
    if (isDesktop) {
      setWorkspaceOptions([]);
      return;
    }
    try {
      const data = await listWorkspaces({ page: 1, limit: 50 });
      const mapped = (data || []).map(item => ({
        id: String(item.id),
        name: String(item.name || item.id),
        description: item.description ? String(item.description) : undefined,
        visibility: item.visibility as 'private' | 'team' | 'public' | undefined,
      }));
      setWorkspaceOptions(mapped);
      if (workspaceId && !mapped.some(item => item.id === workspaceId)) {
        updateWorkspaceId(mapped.length > 0 ? mapped[0].id : null);
      } else if (!workspaceId && mapped.length > 0) {
        updateWorkspaceId(mapped[0].id);
      }
    } catch {
      setWorkspaceOptions([]);
    }
  }, [isDesktop, updateWorkspaceId, workspaceId]);

  const refreshSystemStatus = useCallback(async () => {
    // 本地工具不需要服务端系统健康检查
    setSystemStatus([]);
  }, []);

  const createWorkspace = useCallback(
    async (payload: { name: string; description?: string; visibility?: string }) => {
      const data = await createWorkspaceRequest({
        name: payload.name,
        description: payload.description,
        visibility: payload.visibility as 'private' | 'team' | 'public' | undefined,
      });
      await refreshWorkspaces();
      if (data?.id) {
        updateWorkspaceId(String(data.id));
      }
    },
    [refreshWorkspaces, updateWorkspaceId]
  );

  const updateWorkspace = useCallback(
    async (
      workspaceIdValue: string,
      payload: { name?: string; description?: string; visibility?: string }
    ) => {
      await updateWorkspaceRequest(workspaceIdValue, {
        name: payload.name,
        description: payload.description,
        visibility: payload.visibility as 'private' | 'team' | 'public' | undefined,
      });
      await refreshWorkspaces();
    },
    [refreshWorkspaces]
  );

  const removeWorkspaceId = useCallback(
    async (targetId: string) => {
      setWorkspaceOptions(prev => prev.filter(item => item.id !== targetId));
      if (workspaceId === targetId) {
        updateWorkspaceId(null);
      }
      try {
        await deleteWorkspace(targetId);
        await refreshWorkspaces();
      } catch (error) {
        await refreshWorkspaces();
        throw error;
      }
    },
    [refreshWorkspaces, updateWorkspaceId, workspaceId]
  );

  const updateTemplate = useCallback(
    async (
      templateId: string,
      payload: {
        name?: string;
        description?: string;
        engineType?: string;
        config?: Record<string, unknown>;
        isPublic?: boolean;
        isDefault?: boolean;
      }
    ) => {
      await updateTemplateRequest(templateId, {
        ...payload,
        workspaceId: workspaceId || undefined,
      });
      await stableRefreshTemplates();
    },
    [stableRefreshTemplates, workspaceId]
  );

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      await deleteTemplateRequest(templateId, workspaceId || undefined);
      setSelectedTemplateId(prev => (prev === templateId ? null : prev));
      await stableRefreshTemplates();
    },
    [stableRefreshTemplates, workspaceId]
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextWorkspaceId = params.get('workspaceId');
    setWorkspaceId(nextWorkspaceId);
  }, [location.search]);

  useEffect(() => {
    if (!workspaceId) {
      return;
    }
    setWorkspaceOptions(prev => {
      const existing = prev.find(item => item.id === workspaceId);
      if (!existing) {
        return prev;
      }
      return [existing, ...prev.filter(item => item.id !== workspaceId)];
    });
  }, [workspaceId]);

  useEffect(() => {
    if (isDesktop) {
      return;
    }
    let ignore = false;
    const init = async () => {
      await refreshWorkspaces();
      if (ignore) return;
      await refreshSystemStatus();
    };
    void init();
    return () => {
      ignore = true;
    };
  }, [isDesktop, refreshSystemStatus, refreshWorkspaces]);

  // ── 环境变量管理 ──
  const refreshEnvironments = useCallback(async () => {
    if (!workspaceId) {
      setEnvironments([]);
      return;
    }
    try {
      const list = await listEnvironments(workspaceId);
      setEnvironments(Array.isArray(list) ? list : []);
    } catch {
      setEnvironments([]);
    }
  }, [workspaceId]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      await refreshEnvironments();
      if (ignore) return;
    };
    void run();
    return () => {
      ignore = true;
    };
  }, [refreshEnvironments]);

  useEffect(() => {
    if (!selectedEnvId) {
      setResolvedVariables({});
      return;
    }
    let cancelled = false;
    getEnvironment(selectedEnvId)
      .then(detail => {
        if (cancelled) return;
        const vars: Record<string, string> = {};
        for (const v of detail?.variables || []) {
          if (v.enabled !== false && v.key) {
            vars[v.key] = v.value ?? '';
          }
        }
        setResolvedVariables(vars);
      })
      .catch(() => {
        if (!cancelled) setResolvedVariables({});
      });
    return () => {
      cancelled = true;
    };
  }, [selectedEnvId]);

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      await Promise.allSettled([stableRefreshHistory(), stableRefreshTemplates()]);
      if (ignore) return;
    };
    void init();
    return () => {
      ignore = true;
    };
  }, [stableRefreshHistory, stableRefreshTemplates]);

  // 场景1: 页面首次加载 → 自动加载最近一次完成测试的日志
  useEffect(() => {
    if (initialLogLoadedRef.current) return;
    if (!history.length) return;
    if (activeTestId || selectedHistoryId) return;
    initialLogLoadedRef.current = true;
    const latestTest = history[0];
    if (!latestTest?.id) return;
    setCurrentLogTestId(latestTest.id);
    setLogStatus('loading');
    getTestLogs(latestTest.id, {
      workspaceId: workspaceId || undefined,
      limit: 200,
      offset: 0,
    })
      .then(data => {
        if (!Array.isArray(data.logs)) {
          setLogStatus('done');
          return;
        }
        const nextLogs = data.logs.map(log => {
          const raw = log as Record<string, unknown>;
          return {
            level: (raw.level as 'info' | 'warn' | 'error') || 'info',
            message: String(raw.message || ''),
            timestamp: raw.createdAt ? String(raw.createdAt) : undefined,
            context:
              raw.context && typeof raw.context === 'object' && !Array.isArray(raw.context)
                ? (raw.context as Record<string, unknown>)
                : undefined,
          };
        });
        logsByTestIdRef.current[latestTest.id] = nextLogs;
        setLogs(nextLogs);
        setLogStatus('done');
      })
      .catch(() => {
        setLogStatus('idle');
      });
  }, [activeTestId, history, selectedHistoryId, workspaceId]);

  // 注意: 巨型 TestContext value 已移除（无消费者），所有组件应使用拆分后的子 Context hooks

  const configValue = useMemo(
    () => ({
      testTypes: TEST_TYPES,
      selectedType,
      selectedTemplateId,
      progressInfo,
      activeTestId,
      url,
      configText,
      requestMeta,
      apiTestMeta,
      historyMeta,
      advancedSettings,
      isProcessing,
      selectTestType,
      selectTemplate,
      clearTemplate,
      updateUrl,
      updateConfigText,
      updateRequestMeta,
      updateApiTestMeta,
      updateHistoryMeta,
      updateAdvancedSettings,
      applyPreset,
      runTest,
      stopTest,
    }),
    [
      activeTestId,
      advancedSettings,
      apiTestMeta,
      applyPreset,
      clearTemplate,
      configText,
      historyMeta,
      isProcessing,
      progressInfo,
      requestMeta,
      runTest,
      selectTemplate,
      selectTestType,
      selectedTemplateId,
      selectedType,
      stopTest,
      updateAdvancedSettings,
      updateApiTestMeta,
      updateConfigText,
      updateHistoryMeta,
      updateRequestMeta,
      updateUrl,
      url,
    ]
  );

  const historyValue = useMemo(
    () => ({
      history,
      historyPagination,
      selectedHistoryId,
      selectHistory,
      refreshHistory: stableRefreshHistory,
    }),
    [history, historyPagination, selectedHistoryId, selectHistory, stableRefreshHistory]
  );

  const templateValue = useMemo(
    () => ({
      templates,
      selectedTemplateId,
      createTemplate,
      updateTemplate,
      deleteTemplate,
    }),
    [templates, selectedTemplateId, createTemplate, updateTemplate, deleteTemplate]
  );

  const resultValue = useMemo(
    () => ({
      result,
      resultPayloadText,
      updateResult,
      updateResultPayloadText,
    }),
    [result, resultPayloadText, updateResult, updateResultPayloadText]
  );

  const logValue = useMemo(
    () => ({
      logs,
      logStatus,
      logTestId: currentLogTestId,
      updateLogs,
    }),
    [logs, logStatus, currentLogTestId, updateLogs]
  );

  const workspaceValue = useMemo(
    () => ({
      workspaceId,
      workspaceOptions,
      updateWorkspaceId,
      removeWorkspaceId,
      createWorkspace,
      updateWorkspace,
      refreshWorkspaces,
    }),
    [
      workspaceId,
      workspaceOptions,
      updateWorkspaceId,
      removeWorkspaceId,
      createWorkspace,
      updateWorkspace,
      refreshWorkspaces,
    ]
  );

  const envListSlim = useMemo(
    () => environments.map(e => ({ id: e.id, name: e.name, isActive: e.isActive })),
    [environments]
  );

  const environmentValue = useMemo(
    () => ({
      selectedEnvId,
      setSelectedEnvId,
      environments: envListSlim,
      resolvedVariables,
      refreshEnvironments,
    }),
    [selectedEnvId, envListSlim, resolvedVariables, refreshEnvironments]
  );

  const systemValue = useMemo(() => ({ systemStatus }), [systemStatus]);

  const userValue = useMemo(() => ({ currentUser, setCurrentUser }), [currentUser, setCurrentUser]);

  return (
    <TestUserContext.Provider value={userValue}>
      <TestWorkspaceContext.Provider value={workspaceValue}>
        <TestEnvironmentContext.Provider value={environmentValue}>
          <TestSystemContext.Provider value={systemValue}>
            <TestTemplateContext.Provider value={templateValue}>
              <TestHistoryContext.Provider value={historyValue}>
                <TestResultContext.Provider value={resultValue}>
                  <TestLogContext.Provider value={logValue}>
                    <TestConfigContext.Provider value={configValue}>
                      {children}
                    </TestConfigContext.Provider>
                  </TestLogContext.Provider>
                </TestResultContext.Provider>
              </TestHistoryContext.Provider>
            </TestTemplateContext.Provider>
          </TestSystemContext.Provider>
        </TestEnvironmentContext.Provider>
      </TestWorkspaceContext.Provider>
    </TestUserContext.Provider>
  );
};
