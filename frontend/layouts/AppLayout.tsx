import {
  Clock,
  ExternalLink,
  FolderOpen,
  Globe,
  Layers,
  Play,
  Plus,
  Search,
  Square,
  Variable,
} from 'lucide-react';
import {
  type ReactNode,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';

import { useAppMode } from '../context/AppModeContext';
import {
  type TestType,
  useTestConfig,
  useTestEnvironment,
  useTestHistory,
  useTestUser,
  useTestWorkspace,
} from '../context/TestContext';
import { setAppLanguage } from '../i18n';
import { getAdminConfig } from '../services/adminApi';
import { isDesktop } from '../utils/environment';
import { validateUrlWithTemplateVars } from '../utils/url';

// 桌面端原生融合组件（懒加载，Web 端不引入）
const TitleBarLazy = lazy(() => import('../components/desktop/TitleBar'));
const TabBarLazy = lazy(() => import('../components/desktop/TabBar'));
const StatusBarLazy = lazy(() => import('../components/desktop/StatusBar'));
const ScratchpadMigrationBanner = lazy(() => import('../components/ScratchpadMigrationBanner'));

type AppLayoutProps = {
  children: ReactNode;
};

type SidebarTab = 'history' | 'collections' | 'environments';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'nav.console',
  '/test-plans': 'nav.testPlans',
  '/history': 'nav.history',
  '/collections': 'nav.collections',
  '/environments': 'nav.environments',
  '/templates': 'nav.templates',
  '/monitoring': 'nav.monitoring',
  '/uat': 'nav.uat',
  '/workspaces': 'nav.workspaces',
  '/settings': 'nav.settings',
  '/admin': 'nav.admin',
};

/** 测试类型 → 颜色 */
const TYPE_COLORS: Record<string, string> = {
  performance: '#3b82f6',
  seo: '#10b981',
  security: '#ef4444',
  accessibility: '#8b5cf6',
  compatibility: '#f59e0b',
  ux: '#ec4899',
  stress: '#f97316',
  website: '#06b6d4',
};

/** 分数 → 颜色 */
const scoreColor = (s: number | undefined) => {
  if (s == null) return '#6b7280';
  if (s >= 90) return '#10b981';
  if (s >= 70) return '#3b82f6';
  if (s >= 50) return '#f59e0b';
  return '#ef4444';
};

/** 时间距离 */
const timeAgo = (
  date: string | Date,
  t: (k: string, f: string, o?: Record<string, unknown>) => string
) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('time.justNow', '刚刚');
  if (mins < 60) return t('time.minsAgo', '{{m}} 分钟前', { m: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('time.hoursAgo', '{{h}} 小时前', { h: hours });
  const days = Math.floor(hours / 24);
  return t('time.daysAgo', '{{d}} 天前', { d: days });
};

const AppLayout = ({ children }: AppLayoutProps) => {
  const {
    url,
    updateUrl,
    runTest,
    stopTest,
    isProcessing,
    selectedType,
    testTypes,
    selectTestType,
  } = useTestConfig();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedEnvId, setSelectedEnvId, environments } = useTestEnvironment();
  const { workspaceId, workspaceOptions, updateWorkspaceId } = useTestWorkspace();
  const { currentUser } = useTestUser();
  const { cloudUser } = useAppMode();
  const userRole = String(
    (currentUser as Record<string, unknown> | null)?.role || ''
  ).toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const urlInputRef = useRef<HTMLInputElement>(null);
  const { history: testHistory } = useTestHistory();
  const [urlFocused, setUrlFocused] = useState(false);
  const urlDropdownRef = useRef<HTMLDivElement>(null);

  // 侧边栏 tab 切换（Postman 风格）
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('history');

  // 侧边栏历史搜索
  const [historySearch, setHistorySearch] = useState('');
  // 侧边栏历史筛选类型
  const [historyFilter, setHistoryFilter] = useState<string>('all');

  // 从历史记录中提取去重 URL（最多显示 8 个）— 用于 URL 下拉
  const recentUrls = useMemo(() => {
    const seen = new Set<string>();
    const result: { url: string; type: TestType; label: string }[] = [];
    for (const item of testHistory) {
      const u = item.url?.trim();
      if (!u || seen.has(u)) continue;
      seen.add(u);
      result.push({ url: u, type: item.type, label: item.label });
      if (result.length >= 8) break;
    }
    return result;
  }, [testHistory]);

  // 根据当前输入过滤
  const filteredUrls = useMemo(() => {
    if (!url.trim()) return recentUrls;
    const q = url.toLowerCase();
    return recentUrls.filter(r => r.url.toLowerCase().includes(q));
  }, [recentUrls, url]);

  // 侧边栏历史列表（搜索+筛选）
  const sidebarHistory = useMemo(() => {
    let items = testHistory;
    if (historyFilter !== 'all') {
      items = items.filter(h => h.type === historyFilter);
    }
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      items = items.filter(
        h => h.url?.toLowerCase().includes(q) || h.label?.toLowerCase().includes(q)
      );
    }
    return items.slice(0, 50);
  }, [testHistory, historyFilter, historySearch]);

  // 侧边栏状态
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    return window.localStorage.getItem('tw:sidebar-expanded') !== 'false';
  });

  const toggleSidebar = useCallback(() => {
    setSidebarExpanded(prev => {
      const next = !prev;
      window.localStorage.setItem('tw:sidebar-expanded', String(next));
      window.dispatchEvent(new CustomEvent('tw:sidebar-state', { detail: next }));
      return next;
    });
  }, []);

  // 监听 StatusBar 派发的 tw:toggle-sidebar 事件
  useEffect(() => {
    const handler = () => toggleSidebar();
    window.addEventListener('tw:toggle-sidebar', handler);
    return () => window.removeEventListener('tw:toggle-sidebar', handler);
  }, [toggleSidebar]);

  // Scratch Pad 横幅关闭持久化
  const [scratchBannerDismissed, setScratchBannerDismissed] = useState(() => {
    return window.localStorage.getItem('tw:scratch-banner-dismissed') === 'true';
  });

  // 监听 DashboardHomePage 发出的 tw:focus-url-and-run 自定义事件
  useEffect(() => {
    const handler = () => {
      urlInputRef.current?.focus();
      requestAnimationFrame(() => {
        runTest();
      });
    };
    window.addEventListener('tw:focus-url-and-run', handler);
    return () => window.removeEventListener('tw:focus-url-and-run', handler);
  }, [runTest]);

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        urlDropdownRef.current &&
        !urlDropdownRef.current.contains(e.target as Node) &&
        urlInputRef.current &&
        !urlInputRef.current.contains(e.target as Node)
      ) {
        setUrlFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 全局快捷键
  useEffect(() => {
    const SHORTCUTS: Record<string, string> = {
      '1': '/dashboard',
      '2': '/history',
      '3': '/monitoring',
      '4': '/collections',
      '5': '/settings',
    };
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'l') {
        e.preventDefault();
        urlInputRef.current?.focus();
        urlInputRef.current?.select();
        return;
      }
      if (e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      const path = SHORTCUTS[e.key];
      if (path) {
        e.preventDefault();
        navigate(path);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, toggleSidebar]);

  // 加载服务端语言配置（仅管理员调用 admin/config）
  useEffect(() => {
    if (!isAdmin) return;
    const loadLanguage = async () => {
      try {
        const config = await getAdminConfig();
        const language = (config as { general?: { language?: string } })?.general?.language;
        if (language) {
          setAppLanguage(language);
        }
      } catch {
        // ignore config load failures
      }
    };
    void loadLanguage();
  }, [isAdmin]);

  const _isDesktop = isDesktop();
  const isDashboard = location.pathname === '/dashboard';

  const currentPageTitleKey =
    PAGE_TITLES[location.pathname] ??
    (location.pathname.startsWith('/history/') ? 'history.detail' : '');

  useEffect(() => {
    const appName = 'Test-Web';
    const pageTitle = currentPageTitleKey ? t(currentPageTitleKey) : '';
    document.title = pageTitle ? `${pageTitle} - ${appName}` : appName;
  }, [currentPageTitleKey, t]);

  const urlError = useMemo(() => {
    const result = validateUrlWithTemplateVars(url, {
      invalidProtocol: t('editor.urlInvalidProtocol', '网址必须以 http:// 或 https:// 开头'),
      invalidDomain: t('editor.urlInvalidDomain', '域名无效，请输入完整域名，例如 example.com'),
      invalid: t('editor.urlInvalid', '请输入有效的网址，例如 https://example.com'),
    });
    return result.valid ? '' : result.error;
  }, [url, t]);

  // 可用的测试类型集合（用于侧边栏筛选下拉）
  const historyTypes = useMemo(() => {
    const s = new Set(testHistory.map(h => h.type));
    return Array.from(s);
  }, [testHistory]);

  return (
    <TooltipProvider delayDuration={300}>
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-primary focus:text-foreground focus:shadow-lg'
      >
        {t('a11y.skipToContent', '跳至主要内容')}
      </a>
      <div className={`tw-app-shell ${_isDesktop ? 'tw-app-shell--desktop' : ''}`}>
        {/* ── 桌面端自定义标题栏 ── */}
        {_isDesktop && (
          <Suspense fallback={<div className='tw-titlebar' />}>
            <TitleBarLazy />
          </Suspense>
        )}

        <div className='tw-app-body'>
          {/* ══ 左侧 Postman 风格侧边栏 ══ */}
          <aside className={`tw-sidebar ${sidebarExpanded ? 'is-expanded' : ''}`}>
            {/* ── 顶部：New 按钮 ── */}
            <div className='tw-sidebar-top-actions'>
              {sidebarExpanded ? (
                <button
                  type='button'
                  className='tw-sidebar-new-btn'
                  onClick={() => navigate('/dashboard')}
                >
                  <Plus className='w-4 h-4' />
                  <span>{t('sidebar.new', 'New')}</span>
                </button>
              ) : (
                <button
                  type='button'
                  className='tw-sidebar-new-btn tw-sidebar-new-btn--icon'
                  onClick={() => navigate('/dashboard')}
                  title={t('sidebar.new', 'New')}
                >
                  <Plus className='w-4 h-4' />
                </button>
              )}
            </div>

            {/* ── Tab 切换条（Postman 风格） ── */}
            {sidebarExpanded ? (
              <div className='tw-sidebar-tabs'>
                <button
                  type='button'
                  className={`tw-sidebar-tab ${sidebarTab === 'history' ? 'is-active' : ''}`}
                  onClick={() => setSidebarTab('history')}
                >
                  <Clock className='w-3.5 h-3.5' />
                  <span>{t('sidebar.history', 'History')}</span>
                </button>
                <button
                  type='button'
                  className={`tw-sidebar-tab ${sidebarTab === 'collections' ? 'is-active' : ''}`}
                  onClick={() => setSidebarTab('collections')}
                >
                  <FolderOpen className='w-3.5 h-3.5' />
                  <span>{t('sidebar.collections', 'Collections')}</span>
                </button>
                <button
                  type='button'
                  className={`tw-sidebar-tab ${sidebarTab === 'environments' ? 'is-active' : ''}`}
                  onClick={() => setSidebarTab('environments')}
                >
                  <Variable className='w-3.5 h-3.5' />
                  <span>{t('sidebar.environments', 'Envs')}</span>
                </button>
              </div>
            ) : (
              <div className='tw-sidebar-tabs-collapsed'>
                <button
                  type='button'
                  className={`tw-sidebar-tab-icon ${sidebarTab === 'history' ? 'is-active' : ''}`}
                  onClick={() => {
                    setSidebarTab('history');
                    if (!sidebarExpanded) toggleSidebar();
                  }}
                  title={t('sidebar.history', 'History')}
                >
                  <Clock className='w-4 h-4' />
                </button>
                <button
                  type='button'
                  className={`tw-sidebar-tab-icon ${sidebarTab === 'collections' ? 'is-active' : ''}`}
                  onClick={() => {
                    setSidebarTab('collections');
                    if (!sidebarExpanded) toggleSidebar();
                  }}
                  title={t('sidebar.collections', 'Collections')}
                >
                  <FolderOpen className='w-4 h-4' />
                </button>
                <button
                  type='button'
                  className={`tw-sidebar-tab-icon ${sidebarTab === 'environments' ? 'is-active' : ''}`}
                  onClick={() => {
                    setSidebarTab('environments');
                    if (!sidebarExpanded) toggleSidebar();
                  }}
                  title={t('sidebar.environments', 'Environments')}
                >
                  <Variable className='w-4 h-4' />
                </button>
              </div>
            )}

            {/* ── Tab 面板内容 ── */}
            {sidebarExpanded && (
              <div className='tw-sidebar-panel'>
                {/* History 面板 */}
                {sidebarTab === 'history' && (
                  <>
                    <div className='tw-sidebar-panel-toolbar'>
                      <div className='tw-sidebar-search'>
                        <Search className='w-3.5 h-3.5 opacity-40' />
                        <input
                          type='text'
                          className='tw-sidebar-search-input'
                          placeholder={t('sidebar.searchHistory', '搜索历史...')}
                          value={historySearch}
                          onChange={e => setHistorySearch(e.target.value)}
                        />
                      </div>
                      {historyTypes.length > 1 && (
                        <select
                          className='tw-sidebar-filter-select'
                          value={historyFilter}
                          onChange={e => setHistoryFilter(e.target.value)}
                        >
                          <option value='all'>{t('sidebar.allTypes', '全部')}</option>
                          {historyTypes.map(type => (
                            <option key={type} value={type}>
                              {t(`testType.${type}`, type)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className='tw-sidebar-list'>
                      {sidebarHistory.length === 0 ? (
                        <div className='tw-sidebar-empty'>
                          <Globe className='w-8 h-8 opacity-15' />
                          <span>{t('sidebar.noHistory', '暂无测试记录')}</span>
                        </div>
                      ) : (
                        sidebarHistory.map(item => {
                          const shortId = item.id?.slice(0, 8) || '';
                          const isActive = location.pathname === `/history/${item.id}`;
                          const color = TYPE_COLORS[item.type] || '#6b7280';
                          const score = (item as Record<string, unknown>).score as
                            | number
                            | undefined;
                          return (
                            <button
                              key={item.id}
                              type='button'
                              className={`tw-sidebar-history-item ${isActive ? 'is-active' : ''}`}
                              onClick={() => navigate(`/history/${item.id}`)}
                              title={item.url}
                            >
                              <div className='tw-sidebar-history-top'>
                                <span className='tw-sidebar-history-type' style={{ color }}>
                                  {t(`testType.${item.type}`, item.type)}
                                </span>
                                {score != null && (
                                  <span
                                    className='tw-sidebar-history-score'
                                    style={{ color: scoreColor(score) }}
                                  >
                                    {score}
                                  </span>
                                )}
                              </div>
                              <div className='tw-sidebar-history-url'>
                                {item.url || item.label || shortId}
                              </div>
                              <div className='tw-sidebar-history-meta'>
                                {item.createdAt && <span>{timeAgo(item.createdAt, t)}</span>}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                    {sidebarHistory.length > 0 && (
                      <div className='tw-sidebar-panel-footer'>
                        <button
                          type='button'
                          className='tw-sidebar-view-all-btn'
                          onClick={() => navigate('/history')}
                        >
                          <ExternalLink className='w-3.5 h-3.5' />
                          <span>{t('sidebar.viewAll', '查看全部历史')}</span>
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Collections 面板 */}
                {sidebarTab === 'collections' && (
                  <>
                    <div className='tw-sidebar-panel-toolbar'>
                      <div className='tw-sidebar-search'>
                        <Search className='w-3.5 h-3.5 opacity-40' />
                        <input
                          type='text'
                          className='tw-sidebar-search-input'
                          placeholder={t('sidebar.searchCollections', '搜索集合...')}
                          readOnly
                          onFocus={() => navigate('/collections')}
                        />
                      </div>
                    </div>
                    <div className='tw-sidebar-list'>
                      <div className='tw-sidebar-empty'>
                        <FolderOpen className='w-8 h-8 opacity-15' />
                        <span>{t('sidebar.collectionsHint', '管理你的测试集合')}</span>
                        <button
                          type='button'
                          className='tw-sidebar-link-btn'
                          onClick={() => navigate('/collections')}
                        >
                          {t('sidebar.goToCollections', '前往集合管理')} →
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Environments 面板 */}
                {sidebarTab === 'environments' && (
                  <>
                    <div className='tw-sidebar-panel-toolbar'>
                      <div className='tw-sidebar-search'>
                        <Search className='w-3.5 h-3.5 opacity-40' />
                        <input
                          type='text'
                          className='tw-sidebar-search-input'
                          placeholder={t('sidebar.searchEnvs', '搜索环境...')}
                          readOnly
                          onFocus={() => navigate('/environments')}
                        />
                      </div>
                    </div>
                    <div className='tw-sidebar-list'>
                      {environments.length === 0 ? (
                        <div className='tw-sidebar-empty'>
                          <Variable className='w-8 h-8 opacity-15' />
                          <span>{t('sidebar.noEnvs', '暂无环境变量')}</span>
                          <button
                            type='button'
                            className='tw-sidebar-link-btn'
                            onClick={() => navigate('/environments')}
                          >
                            {t('sidebar.createEnv', '创建环境')} →
                          </button>
                        </div>
                      ) : (
                        environments.map(env => (
                          <button
                            key={env.id}
                            type='button'
                            className={`tw-sidebar-env-item ${selectedEnvId === env.id ? 'is-active' : ''}`}
                            onClick={() => setSelectedEnvId(env.id)}
                          >
                            <Variable className='w-3.5 h-3.5 opacity-50' />
                            <span className='tw-sidebar-env-name'>{env.name}</span>
                            {selectedEnvId === env.id && (
                              <span className='tw-sidebar-env-check'>✓</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                    <div className='tw-sidebar-panel-footer'>
                      <button
                        type='button'
                        className='tw-sidebar-view-all-btn'
                        onClick={() => navigate('/environments')}
                      >
                        <ExternalLink className='w-3.5 h-3.5' />
                        <span>{t('sidebar.manageEnvs', '管理环境变量')}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </aside>

          {/* ── 右侧主区域 ── */}
          <div className='tw-main-area'>
            {/* ── 桌面端多标签页栏（与 Topbar 同宽） ── */}
            {_isDesktop && (
              <Suspense fallback={null}>
                <TabBarLazy />
              </Suspense>
            )}
            {/* ── Scratch Pad 推荐横幅（Postman 风格） ── */}
            {_isDesktop && !cloudUser && !scratchBannerDismissed && (
              <div className='tw-scratch-banner'>
                <span>
                  {t(
                    'banner.scratchPad',
                    'You are using the Lightweight API Client, sign in or create an account to work with collections, environments and unlock all free features in Test-Web.'
                  )}
                </span>
                <button
                  type='button'
                  className='tw-scratch-banner-close'
                  onClick={() => {
                    setScratchBannerDismissed(true);
                    window.localStorage.setItem('tw:scratch-banner-dismissed', 'true');
                  }}
                  aria-label='Close'
                >
                  ✕
                </button>
              </div>
            )}

            {/* ── 顶部工具栏 ── */}
            <header className='tw-topbar'>
              {isDashboard && _isDesktop ? (
                <div className='relative flex-1'>
                  <div className={`tw-topbar-url-group ${urlError ? 'tw-url-error' : ''}`}>
                    <select
                      className='tw-topbar-type-select'
                      value={selectedType}
                      onChange={e => selectTestType(e.target.value as typeof selectedType)}
                      aria-label={t('editor.selectTestType', '选择测试类型')}
                    >
                      {testTypes.map(type => (
                        <option key={type} value={type}>
                          {t(`testType.${type}`)}
                        </option>
                      ))}
                    </select>
                    <div className='tw-topbar-url-divider' />
                    <input
                      ref={urlInputRef}
                      type='text'
                      className='tw-topbar-url-input'
                      placeholder='https://example.com'
                      aria-label={t('editor.urlInputLabel', '测试目标网址')}
                      value={url}
                      onChange={e => updateUrl(e.target.value)}
                      onFocus={() => setUrlFocused(true)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !isProcessing && url.trim() && !urlError) {
                          setUrlFocused(false);
                          runTest();
                        }
                        if (e.key === 'Escape') setUrlFocused(false);
                      }}
                      autoComplete='off'
                    />
                    {isProcessing ? (
                      <Button
                        className='tw-topbar-run-btn'
                        onClick={stopTest}
                        variant='destructive'
                        size='sm'
                      >
                        <Square className='h-4 w-4' />
                        <span>{t('editor.stopTest', '停止')}</span>
                      </Button>
                    ) : (
                      <Button
                        className='tw-topbar-run-btn'
                        onClick={runTest}
                        size='sm'
                        disabled={!url.trim() || Boolean(urlError)}
                      >
                        <Play className='h-4 w-4' />
                        <span>{t('editor.runTest')}</span>
                        <kbd className='tw-topbar-kbd'>Enter</kbd>
                      </Button>
                    )}
                  </div>
                  {urlError && (
                    <div className='absolute left-0 top-full mt-1 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-md px-2.5 py-1 shadow-md z-50 whitespace-nowrap font-medium'>
                      ⚠ {urlError}
                    </div>
                  )}
                  {urlFocused && filteredUrls.length > 0 && (
                    <div ref={urlDropdownRef} className='tw-url-dropdown'>
                      <div className='tw-url-dropdown-header'>
                        {t('editor.recentUrls', '最近测试')}
                      </div>
                      {filteredUrls.map((item, i) => (
                        <button
                          key={`${item.url}-${i}`}
                          type='button'
                          className='tw-url-dropdown-item'
                          onMouseDown={e => {
                            e.preventDefault();
                            updateUrl(item.url);
                            selectTestType(item.type);
                            setUrlFocused(false);
                          }}
                        >
                          <span className='tw-url-dropdown-type'>{item.type}</span>
                          <span className='tw-url-dropdown-url'>{item.url}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className='tw-topbar-page-title'>
                  <span className='text-sm font-medium text-muted-foreground'>
                    {currentPageTitleKey
                      ? t(currentPageTitleKey)
                      : _isDesktop
                        ? ''
                        : 'Test-Web Cloud'}
                  </span>
                </div>
              )}

              <div className='tw-topbar-right'>
                {/* 桌面端：只读环境指示标签（切换在侧边栏 Environments tab 完成） */}
                {_isDesktop && selectedEnvId && (
                  <span className='tw-topbar-env-badge'>
                    <Variable className='h-3 w-3 opacity-60' />
                    <span>{environments.find(e => e.id === selectedEnvId)?.name || 'Env'}</span>
                  </span>
                )}
                {/* Web 端：完整的选择器组 */}
                {!_isDesktop && (
                  <>
                    <span className='inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border'>
                      <span className='h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse' />
                      <span className='text-green-700 dark:text-green-400'>
                        {cloudUser?.username || t('nav.cloudSync', '云端同步')}
                      </span>
                    </span>
                    {workspaceOptions.length > 1 && (
                      <Select
                        value={workspaceId ?? ''}
                        onValueChange={v => updateWorkspaceId(v || null)}
                      >
                        <SelectTrigger className='tw-env-select'>
                          <Layers className='h-3.5 w-3.5 mr-1.5 opacity-60' />
                          <SelectValue placeholder={t('nav.workspaces', '工作空间')} />
                        </SelectTrigger>
                        <SelectContent>
                          {workspaceOptions.map(ws => (
                            <SelectItem key={ws.id} value={ws.id}>
                              {ws.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Select
                      value={selectedEnvId ?? 'none'}
                      onValueChange={v => setSelectedEnvId(v === 'none' ? null : v)}
                    >
                      <SelectTrigger className='tw-env-select'>
                        <Variable className='h-3.5 w-3.5 mr-1.5 opacity-60' />
                        <SelectValue placeholder={t('environments.noEnv')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='none'>{t('environments.noEnv')}</SelectItem>
                        {environments.map(env => (
                          <SelectItem key={env.id} value={env.id}>
                            {env.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </header>

            {/* ── Scratch Pad 迁移提示 ── */}
            <Suspense fallback={null}>
              <ScratchpadMigrationBanner />
            </Suspense>

            {/* ── 主内容区 ── */}
            <main
              id='main-content'
              tabIndex={-1}
              className={`tw-content${isDashboard ? ' tw-content--dashboard' : ''}`}
            >
              {children}
            </main>
          </div>
        </div>

        {/* ── 桌面端底部状态栏（Console 已整合在内） ── */}
        {_isDesktop && (
          <Suspense fallback={null}>
            <StatusBarLazy />
          </Suspense>
        )}
      </div>
    </TooltipProvider>
  );
};

export default AppLayout;
