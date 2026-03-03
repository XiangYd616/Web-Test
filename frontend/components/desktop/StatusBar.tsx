/**
 * 桌面端底部状态栏 — Postman Footer 风格
 * 左侧：引擎状态 · 连接 · 同步 · 定时任务
 * 右侧：环境指示器 · 版本号
 * Console 面板嵌入在 footer 中，可拖拽展开/收起
 */

import {
  Activity,
  AlertTriangle,
  Clock,
  CloudOff,
  Copy,
  Info,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Terminal,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { type TestProgressInfo, TEST_TYPE_LABELS } from '../../context/TestContext';
import {
  type ConsoleEntry,
  type LogLevel,
  consoleClear,
  consoleLog,
  getConsoleEntries,
  subscribeConsole,
} from '../../utils/consoleStore';
import { isDesktop } from '../../utils/environment';

const useConsoleLogs = () => {
  const [entries, setEntries] = useState<ConsoleEntry[]>(getConsoleEntries);
  useEffect(() => subscribeConsole(() => setEntries([...getConsoleEntries()])), []);
  return entries;
};

const LEVEL_CONFIG: Record<LogLevel, { icon: typeof Info; cls: string }> = {
  info: { icon: Info, cls: 'tw-console-level--info' },
  warn: { icon: AlertTriangle, cls: 'tw-console-level--warn' },
  error: { icon: XCircle, cls: 'tw-console-level--error' },
};

const formatTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;

const MIN_PANEL_HEIGHT = 120;
const MAX_PANEL_HEIGHT = 600;
const DEFAULT_PANEL_HEIGHT = 280;
const BAR_HEIGHT = 24;

type SyncInfo = {
  status: string;
  lastSyncAt?: string;
  pendingChanges?: number;
  pendingConflicts?: number;
};

type SyncDisplay = {
  cls: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  fallback: string;
};

const SYNC_MAP: Record<string, SyncDisplay> = {
  syncing: { cls: '', icon: Loader2, labelKey: 'status.syncing', fallback: '同步中' },
  synced: {
    cls: 'tw-statusbar-item--ok',
    icon: RefreshCw,
    labelKey: 'status.synced',
    fallback: '已同步',
  },
  conflict: {
    cls: 'tw-statusbar-item--warn',
    icon: RefreshCw,
    labelKey: 'status.conflict',
    fallback: '冲突',
  },
  error: {
    cls: 'tw-statusbar-item--warn',
    icon: RefreshCw,
    labelKey: 'status.syncError',
    fallback: '同步失败',
  },
  offline: {
    cls: 'tw-statusbar-item--warn',
    icon: CloudOff,
    labelKey: 'status.offline',
    fallback: '离线',
  },
  idle: { cls: '', icon: RefreshCw, labelKey: 'status.notSynced', fallback: '未同步' },
};

const StatusBar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [taskCount, setTaskCount] = useState(0);
  const [appVersion, setAppVersion] = useState('');
  const [connected, setConnected] = useState(true);
  const [syncInfo, setSyncInfo] = useState<SyncInfo>({ status: 'idle' });

  // ── 侧边栏折叠/展开（由 AppLayout 管理，StatusBar 只派发事件和接收状态） ──
  const [sidebarExpanded, setSidebarExpanded] = useState(
    () => window.localStorage.getItem('tw:sidebar-expanded') !== 'false'
  );
  useEffect(() => {
    const handler = (e: Event) => {
      setSidebarExpanded((e as CustomEvent).detail as boolean);
    };
    window.addEventListener('tw:sidebar-state', handler);
    return () => window.removeEventListener('tw:sidebar-state', handler);
  }, []);
  const handleToggleSidebar = useCallback(() => {
    window.dispatchEvent(new CustomEvent('tw:toggle-sidebar'));
  }, []);

  // ── 底部面板状态：支持 Console / Dashboard 双视图 ──
  type FooterView = 'console' | 'dashboard';
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeView, setActiveView] = useState<FooterView>('console');
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const [consoleFilter, setConsoleFilter] = useState<LogLevel | 'all'>('all');
  const consoleEntries = useConsoleLogs();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // ── 监听全局测试进度（由 TestProvider 广播） ──
  type TestProgressState = {
    isProcessing: boolean;
    selectedType?: string;
    progressInfo?: TestProgressInfo | null;
    url?: string;
  };
  const [testProgress, setTestProgress] = useState<TestProgressState>({ isProcessing: false });
  useEffect(() => {
    const handler = (e: Event) => {
      setTestProgress((e as CustomEvent).detail as TestProgressState);
    };
    window.addEventListener('tw:test-progress-update', handler);
    return () => window.removeEventListener('tw:test-progress-update', handler);
  }, []);

  const filteredEntries =
    consoleFilter === 'all'
      ? consoleEntries
      : consoleEntries.filter(e => e.level === consoleFilter);

  // 自动滚到底部
  useEffect(() => {
    if (panelOpen && activeView === 'console' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredEntries.length, panelOpen, activeView]);

  // 监听 toggle-console 事件
  useEffect(() => {
    const handler = () => {
      if (panelOpen && activeView === 'console') {
        setPanelOpen(false);
      } else {
        setPanelOpen(true);
        setActiveView('console');
      }
    };
    window.addEventListener('tw:toggle-console', handler);
    return () => window.removeEventListener('tw:toggle-console', handler);
  });

  // 通知 DashboardPage footer 面板状态（开/关 + 当前视图）
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('tw:footer-panel-state', {
        detail: { open: panelOpen, view: activeView },
      })
    );
  }, [panelOpen, activeView]);

  // 拖拽调整高度
  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      const startY = e.clientY;
      const startH = panelHeight;
      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = startY - ev.clientY;
        setPanelHeight(Math.max(MIN_PANEL_HEIGHT, Math.min(MAX_PANEL_HEIGHT, startH + delta)));
      };
      const onUp = () => {
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [panelHeight]
  );

  // 复制所有日志
  const handleCopyAll = useCallback(() => {
    const text = filteredEntries
      .map(
        e =>
          `[${formatTime(e.timestamp)}] [${e.level.toUpperCase()}] ${e.message}${e.detail ? ' — ' + e.detail : ''}`
      )
      .join('\n');
    void navigator.clipboard.writeText(text);
  }, [filteredEntries]);

  const refreshSyncStatus = useCallback(() => {
    const api = window.electronAPI;
    if (api?.sync) {
      void api.sync.getStatus().then(setSyncInfo);
    }
  }, []);

  useEffect(() => {
    if (!isDesktop()) return;
    const api = window.electronAPI;
    if (!api) return;

    // 获取定时任务数
    if (api.scheduler) {
      void api.scheduler.listTasks().then(tasks => {
        setTaskCount(tasks.filter((t: Record<string, unknown>) => t.enabled).length);
      });
    }

    // 获取版本
    void api.getAppVersion().then(setAppVersion);

    // 同步状态
    refreshSyncStatus();
    let cleanupSync: (() => void) | undefined;
    if (api.sync) {
      cleanupSync = api.sync.onStatusChange(s => {
        setSyncInfo(prev => ({ ...prev, status: s.status }));
        refreshSyncStatus();
        if (s.status === 'error')
          consoleLog('error', `同步失败: ${(s as { error?: string }).error || '未知错误'}`);
        else if (s.status === 'conflict') consoleLog('warn', '同步冲突');
        else if (s.status === 'synced') consoleLog('info', '同步完成');
      });
    }

    // 简单心跳检测
    const checkConnection = async () => {
      try {
        const info = await api.getSystemInfo();
        setConnected(Boolean(info));
      } catch {
        setConnected(false);
      }
    };
    void checkConnection();
    const timer = setInterval(() => void checkConnection(), 30000);
    return () => {
      clearInterval(timer);
      cleanupSync?.();
    };
  }, [refreshSyncStatus]);

  // 同步状态展示
  const syncDisplay = useMemo(() => {
    return SYNC_MAP[syncInfo.status] || SYNC_MAP.idle;
  }, [syncInfo.status]);
  const SyncIcon = syncDisplay.icon;

  // ── Dashboard 结果 tab 栏整合 ──
  type DashTabInfo = { id: string; labelKey: string; fallbackLabel: string; iconName: string };
  type DashTabsPayload = {
    tabs: DashTabInfo[];
    activeTab: string;
    hasResult: boolean;
    score?: number;
    status?: string;
  };
  const [dashTabs, setDashTabs] = useState<DashTabsPayload | null>(null);
  const dashTabsRef = useRef(dashTabs);
  dashTabsRef.current = dashTabs;

  useEffect(() => {
    const handler = (e: Event) => {
      const payload = (e as CustomEvent).detail as DashTabsPayload | null;
      setDashTabs(payload);
      // 有结果 tab 时自动展开 dashboard 视图
      if (payload && payload.tabs.length > 0) {
        setPanelOpen(true);
        setActiveView('dashboard');
      }
      // tab 数据清空且当前是 dashboard 视图时收起
      if (!payload && activeView === 'dashboard') {
        setPanelOpen(false);
      }
    };
    window.addEventListener('tw:dashboard-tabs-update', handler);
    return () => window.removeEventListener('tw:dashboard-tabs-update', handler);
  }, [activeView]);

  // Console 按钮点击
  const handleConsoleClick = useCallback(() => {
    if (panelOpen && activeView === 'console') {
      setPanelOpen(false);
    } else {
      setPanelOpen(true);
      setActiveView('console');
    }
  }, [panelOpen, activeView]);

  // Dashboard tab 按钮点击（点击已激活的 tab 时收起面板）
  const handleDashTabClick = useCallback(
    (tabId: string) => {
      if (panelOpen && activeView === 'dashboard' && dashTabsRef.current?.activeTab === tabId) {
        setPanelOpen(false);
        return;
      }
      window.dispatchEvent(new CustomEvent('tw:dashboard-tab-change', { detail: tabId }));
      setPanelOpen(true);
      setActiveView('dashboard');
    },
    [panelOpen, activeView]
  );

  if (!isDesktop()) return null;

  const totalHeight = panelOpen ? panelHeight + BAR_HEIGHT : BAR_HEIGHT;

  return (
    <div className='tw-footer-panel' style={{ height: totalHeight }}>
      {/* ── 拖拽手柄（仅展开时显示） ── */}
      {panelOpen && (
        <div className='tw-footer-resizer' role='separator' tabIndex={0} onMouseDown={onDragStart}>
          <div className='tw-footer-resizer-handle' />
        </div>
      )}

      {/* ── Console 内容区（展开 + console 视图） ── */}
      {panelOpen && activeView === 'console' && (
        <div className='tw-footer-console' style={{ height: panelHeight }}>
          <div className='tw-console-header'>
            <div className='tw-console-header-left'>
              <Terminal className='w-3.5 h-3.5' />
              <span className='tw-console-title'>{t('console.title', 'Console')}</span>
            </div>
            <div className='tw-console-header-right'>
              <select
                className='tw-console-log-select'
                value={consoleFilter}
                onChange={e => setConsoleFilter(e.target.value as LogLevel | 'all')}
              >
                <option value='all'>{t('console.allLogs', 'All Logs')}</option>
                <option value='info'>Info</option>
                <option value='warn'>Warning</option>
                <option value='error'>Error</option>
              </select>
              <button
                type='button'
                className='tw-console-action'
                onClick={() => consoleClear()}
                title={t('console.clear', 'Clear')}
              >
                <span>{t('console.clear', 'Clear')}</span>
              </button>
              <button
                type='button'
                className='tw-console-action'
                onClick={handleCopyAll}
                title={t('console.copy', 'Copy')}
              >
                <Copy className='w-3 h-3' />
              </button>
            </div>
          </div>
          {/* ── Console 内嵌测试进度条 ── */}
          {testProgress.isProcessing && (
            <div className='tw-console-progress'>
              <div className='tw-console-progress-header'>
                <div className='tw-console-progress-left'>
                  <Loader2 className='w-3 h-3 animate-spin' />
                  <span className='tw-console-progress-type'>
                    {testProgress.selectedType
                      ? t(
                          TEST_TYPE_LABELS[
                            testProgress.selectedType as keyof typeof TEST_TYPE_LABELS
                          ] ?? testProgress.selectedType
                        )
                      : t('result.running', '运行中')}
                  </span>
                  {testProgress.url && (
                    <span className='tw-console-progress-url' title={testProgress.url}>
                      {testProgress.url}
                    </span>
                  )}
                </div>
                <span className='tw-console-progress-pct'>
                  {typeof testProgress.progressInfo?.progress === 'number'
                    ? `${Math.round(Math.min(100, Math.max(0, testProgress.progressInfo.progress)))}%`
                    : '...'}
                </span>
              </div>
              <div className='tw-console-progress-track'>
                <div
                  className='tw-console-progress-fill'
                  style={{
                    width: `${typeof testProgress.progressInfo?.progress === 'number' ? Math.min(100, Math.max(0, testProgress.progressInfo.progress)) : 2}%`,
                  }}
                />
              </div>
              {testProgress.progressInfo?.currentStep && (
                <div className='tw-console-progress-step'>
                  {t('editor.currentStep', '当前步骤')}: {testProgress.progressInfo.currentStep}
                </div>
              )}
            </div>
          )}
          <div className='tw-console-body' ref={scrollRef}>
            {filteredEntries.length === 0 ? (
              <div className='tw-console-empty'>
                <h3 className='tw-console-empty-title'>{t('console.noLogs', 'No logs yet')}</h3>
                <p className='tw-console-empty-desc'>
                  {t('console.noLogsHint', 'Send a request to view its details in the console.')}
                </p>
              </div>
            ) : (
              filteredEntries.map(entry => {
                const cfg = LEVEL_CONFIG[entry.level];
                const Icon = cfg.icon;
                return (
                  <div key={entry.id} className={`tw-console-entry ${cfg.cls}`}>
                    <span className='tw-console-time'>{formatTime(entry.timestamp)}</span>
                    <Icon className='w-3 h-3 tw-console-icon' />
                    <span className='tw-console-msg'>{entry.message}</span>
                    {entry.detail && <span className='tw-console-detail'>{entry.detail}</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── Dashboard 结果面板 Portal 插槽（展开 + dashboard 视图） ── */}
      {panelOpen && activeView === 'dashboard' && (
        <div
          id='footer-dashboard-slot'
          className='tw-footer-dashboard'
          style={{ height: panelHeight }}
        />
      )}

      {/* ── 底部状态栏（始终显示） ── */}
      <footer className='tw-statusbar'>
        <div className='tw-statusbar-left'>
          {/* 侧边栏折叠/展开 */}
          <button
            type='button'
            className='tw-statusbar-item tw-statusbar-btn'
            onClick={handleToggleSidebar}
            title={
              sidebarExpanded
                ? t('nav.collapseSidebar', '收起侧边栏')
                : t('nav.expandSidebar', '展开侧边栏')
            }
          >
            {sidebarExpanded ? (
              <PanelLeftClose className='w-3 h-3' />
            ) : (
              <PanelLeftOpen className='w-3 h-3' />
            )}
          </button>
          <div className='tw-statusbar-sep' />
          {/* Console 开关 */}
          <button
            type='button'
            className={`tw-statusbar-item tw-statusbar-btn${panelOpen && activeView === 'console' ? ' tw-statusbar-tab--active' : ''}`}
            onClick={handleConsoleClick}
            title={t('status.openConsole', 'Console')}
          >
            <Terminal className='w-3 h-3' />
            <span>Console</span>
          </button>

          {/* Dashboard 结果 tab */}
          {dashTabs && dashTabs.tabs.length > 0 && (
            <>
              <div className='tw-statusbar-sep' />
              {dashTabs.tabs.map(tab => (
                <button
                  key={tab.id}
                  type='button'
                  className={`tw-statusbar-item tw-statusbar-btn${panelOpen && activeView === 'dashboard' && tab.id === dashTabs.activeTab ? ' tw-statusbar-tab--active' : ''}`}
                  onClick={() => handleDashTabClick(tab.id)}
                >
                  <span>{t(tab.labelKey, tab.fallbackLabel)}</span>
                </button>
              ))}
            </>
          )}
        </div>

        <div className='tw-statusbar-right'>
          {dashTabs && dashTabs.hasResult && (
            <>
              {(dashTabs.score ?? 0) > 0 && (
                <span
                  className={`tw-statusbar-item ${
                    (dashTabs.score ?? 0) >= 90
                      ? 'tw-statusbar-item--ok'
                      : (dashTabs.score ?? 0) >= 60
                        ? 'tw-statusbar-item--warn'
                        : ''
                  }`}
                >
                  {t('result.score', '得分')}: {dashTabs.score}
                </span>
              )}
              <span
                className={`tw-statusbar-item ${
                  dashTabs.status === 'completed'
                    ? 'tw-statusbar-item--ok'
                    : dashTabs.status === 'failed'
                      ? 'tw-statusbar-item--warn'
                      : ''
                }`}
              >
                {dashTabs.status === 'completed' ? '✓' : dashTabs.status === 'failed' ? '✗' : '●'}{' '}
                {t(`status.${dashTabs.status}`, dashTabs.status ?? '')}
              </span>
              <div className='tw-statusbar-sep' />
            </>
          )}
          <div
            className={`tw-statusbar-item ${connected ? 'tw-statusbar-item--ok' : 'tw-statusbar-item--warn'}`}
          >
            {connected ? <Wifi className='w-3 h-3' /> : <WifiOff className='w-3 h-3' />}
            <span>{connected ? t('status.ready', '就绪') : t('status.offline', '离线')}</span>
          </div>
          <div className='tw-statusbar-sep' />
          <button
            type='button'
            className={`tw-statusbar-item tw-statusbar-btn ${syncDisplay.cls}`}
            onClick={refreshSyncStatus}
            title={t('status.manualSync', '手动同步')}
          >
            <SyncIcon
              className={`w-3 h-3 ${syncInfo.status === 'syncing' ? 'animate-spin' : ''}`}
            />
            <span>
              {syncInfo.status === 'conflict'
                ? `${syncInfo.pendingConflicts || 0} ${t('status.conflicts', '个冲突')}`
                : t(syncDisplay.labelKey, syncDisplay.fallback)}
            </span>
          </button>
          <div className='tw-statusbar-sep' />
          <button
            type='button'
            className='tw-statusbar-item tw-statusbar-btn'
            onClick={() => navigate('/test-plans')}
            title={t('status.viewSchedules', '查看定时任务')}
          >
            <Clock className='w-3 h-3' />
            <span>
              {t('status.scheduledTasksCount', '{{count}} 个计划任务', { count: taskCount })}
            </span>
          </button>
          <div className='tw-statusbar-sep' />
          <div className='tw-statusbar-item'>
            <Activity className='w-3 h-3' />
            <span>v{appVersion}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StatusBar;
