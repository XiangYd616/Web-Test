/**
 * 桌面端自定义标题栏 — Postman 风格全局导航栏
 *
 * 布局（从左到右）：
 * [Home] [Navigate ▾] [Workspaces ▾] ──搜索框── [⚙] [用户] [—][□][✕]
 *
 * - Navigate 下拉菜单承载所有页面导航（按 section 分组）
 * - Workspaces 下拉菜单切换工作空间
 */

import {
  Activity,
  ChevronDown,
  ClipboardList,
  Clock,
  FileCode2,
  FolderOpen,
  Home,
  Layers,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Minus,
  Search,
  Settings,
  Shield,
  Square,
  User,
  Variable,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppMode } from '../../context/AppModeContext';
import { useTestUser, useTestWorkspace } from '../../context/TestContext';

const isMac = window.environment?.platform === 'darwin';

type NavEntry = {
  key: string;
  labelKey: string;
  fallback: string;
  icon: React.ComponentType<{ className?: string }>;
  section: string;
  adminOnly?: boolean;
};

const NAV_ENTRIES: NavEntry[] = [
  {
    key: '/dashboard',
    labelKey: 'nav.console',
    fallback: '控制台',
    icon: LayoutDashboard,
    section: 'core',
  },
  {
    key: '/test-plans',
    labelKey: 'nav.testPlans',
    fallback: '测试计划',
    icon: ClipboardList,
    section: 'core',
  },
  { key: '/uat', labelKey: 'nav.uat', fallback: 'UAT 反馈', icon: MessageSquare, section: 'core' },
  {
    key: '/history',
    labelKey: 'nav.reportCenter',
    fallback: '报告中心',
    icon: Clock,
    section: 'analytics',
  },
  {
    key: '/monitoring',
    labelKey: 'nav.observeCenter',
    fallback: '观测中心',
    icon: Activity,
    section: 'analytics',
  },
  {
    key: '/collections',
    labelKey: 'nav.collections',
    fallback: '集合管理',
    icon: FolderOpen,
    section: 'resources',
  },
  {
    key: '/environments',
    labelKey: 'nav.environments',
    fallback: '环境变量',
    icon: Variable,
    section: 'resources',
  },
  {
    key: '/templates',
    labelKey: 'nav.templates',
    fallback: '模板管理',
    icon: FileCode2,
    section: 'resources',
  },
  {
    key: '/workspaces',
    labelKey: 'nav.workspaces',
    fallback: '工作空间',
    icon: Layers,
    section: 'system',
  },
  {
    key: '/settings',
    labelKey: 'nav.settings',
    fallback: '系统设置',
    icon: Settings,
    section: 'system',
  },
  {
    key: '/admin',
    labelKey: 'nav.admin',
    fallback: '管理后台',
    icon: Shield,
    section: 'system',
    adminOnly: true,
  },
];

const SECTION_LABELS: Record<string, { key: string; fallback: string }> = {
  core: { key: 'nav.sectionCore', fallback: '核心测试' },
  analytics: { key: 'nav.sectionAnalytics', fallback: '数据分析' },
  resources: { key: 'nav.sectionResources', fallback: '资源管理' },
  system: { key: 'nav.sectionSystem', fallback: '系统' },
};

const SECTION_ORDER = ['core', 'analytics', 'resources', 'system'];

const TitleBar = () => {
  const [maximized, setMaximized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { mode, cloudUser, switchToScratchpad } = useAppMode();
  const { currentUser } = useTestUser();
  const userRole = String(
    (currentUser as Record<string, unknown> | null)?.role || ''
  ).toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const { workspaceId, workspaceOptions, updateWorkspaceId } = useTestWorkspace();
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const [wsOpen, setWsOpen] = useState(false);
  const wsRef = useRef<HTMLDivElement>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;
    void api.window.isMaximized().then(setMaximized);
    const unsub = api.window.onMaximizedChange(setMaximized);
    return unsub;
  }, []);

  // Ctrl+K 聚焦搜索
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // 点击外部关闭导航菜单 / 工作空间菜单 / 用户菜单
  useEffect(() => {
    if (!navOpen && !wsOpen && !userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (navOpen && navRef.current && !navRef.current.contains(e.target as Node)) {
        setNavOpen(false);
      }
      if (wsOpen && wsRef.current && !wsRef.current.contains(e.target as Node)) {
        setWsOpen(false);
      }
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [navOpen, wsOpen, userMenuOpen]);

  const handleMinimize = useCallback(() => {
    void window.electronAPI?.window.minimize();
  }, []);
  const handleMaximize = useCallback(() => {
    void window.electronAPI?.window.maximize();
  }, []);
  const handleClose = useCallback(() => {
    void window.electronAPI?.window.close();
  }, []);

  const handleSearch = useCallback(
    (q: string) => {
      if (!q.trim()) return;
      navigate(`/history?q=${encodeURIComponent(q.trim())}`);
      setSearchQuery('');
      searchRef.current?.blur();
    },
    [navigate]
  );

  // 按 section 分组过滤
  const visibleEntries = NAV_ENTRIES.filter(e => !e.adminOnly || isAdmin);
  const groupedSections = SECTION_ORDER.map(s => ({
    section: s,
    label: SECTION_LABELS[s],
    items: visibleEntries.filter(e => e.section === s),
  })).filter(g => g.items.length > 0);

  return (
    <div className='tw-titlebar'>
      {isMac && <div className='tw-titlebar-traffic-light-spacer' />}

      {/* 左侧导航区 */}
      <div className='tw-titlebar-nav'>
        <button
          type='button'
          className={`tw-titlebar-nav-btn ${location.pathname === '/dashboard' ? 'is-active' : ''}`}
          onClick={() => navigate('/dashboard')}
        >
          <Home className='w-3.5 h-3.5' />
          <span>{t('nav.home', 'Home')}</span>
        </button>

        {/* 导航下拉菜单 */}
        <div ref={navRef} className='tw-titlebar-nav-dropdown-wrap'>
          <button
            type='button'
            className={`tw-titlebar-nav-btn ${navOpen ? 'is-active' : ''}`}
            onClick={() => setNavOpen(prev => !prev)}
          >
            <span>{t('nav.navigate', '导航')}</span>
            <ChevronDown
              className={`w-3 h-3 opacity-60 transition-transform ${navOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {navOpen && (
            <div className='tw-nav-menu'>
              {groupedSections.map((group, gi) => (
                <div key={group.section}>
                  {gi > 0 && <div className='tw-nav-menu-sep' />}
                  <div className='tw-nav-menu-section'>
                    {t(group.label.key, group.label.fallback)}
                  </div>
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const active = location.pathname === item.key;
                    return (
                      <button
                        key={item.key}
                        type='button'
                        className={`tw-nav-menu-item ${active ? 'is-active' : ''}`}
                        onClick={() => {
                          navigate(item.key);
                          setNavOpen(false);
                        }}
                      >
                        <Icon className='w-4 h-4' />
                        <span>{t(item.labelKey, item.fallback)}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Workspaces 下拉（Postman 风格） */}
        {workspaceOptions.length > 0 && (
          <div ref={wsRef} className='tw-titlebar-nav-dropdown-wrap'>
            <button
              type='button'
              className={`tw-titlebar-nav-btn ${wsOpen ? 'is-active' : ''}`}
              onClick={() => setWsOpen(prev => !prev)}
            >
              <Layers className='w-3.5 h-3.5' />
              <span>{t('nav.workspaces', 'Workspaces')}</span>
              <ChevronDown
                className={`w-3 h-3 opacity-60 transition-transform ${wsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {wsOpen && (
              <div className='tw-nav-menu'>
                <div className='tw-nav-menu-section'>
                  {t('nav.switchWorkspace', '切换工作空间')}
                </div>
                {workspaceOptions.map(ws => (
                  <button
                    key={ws.id}
                    type='button'
                    className={`tw-nav-menu-item ${workspaceId === ws.id ? 'is-active' : ''}`}
                    onClick={() => {
                      updateWorkspaceId(ws.id);
                      setWsOpen(false);
                    }}
                  >
                    <Layers className='w-4 h-4' />
                    <span>{ws.name}</span>
                    {workspaceId === ws.id && (
                      <span style={{ marginLeft: 'auto', fontSize: 11 }}>✓</span>
                    )}
                  </button>
                ))}
                <div className='tw-nav-menu-sep' />
                <button
                  type='button'
                  className='tw-nav-menu-item'
                  onClick={() => {
                    navigate('/workspaces');
                    setWsOpen(false);
                  }}
                >
                  <Settings className='w-4 h-4' />
                  <span>{t('nav.manageWorkspaces', '管理工作空间')}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 中间：可拖拽 + 搜索框 */}
      <div className='tw-titlebar-center'>
        <div className='tw-titlebar-drag' />
        <div className='tw-titlebar-search'>
          <Search className='tw-titlebar-search-icon' />
          <input
            ref={searchRef}
            type='text'
            className='tw-titlebar-search-input'
            placeholder={t('nav.searchPlaceholder', 'Search Test-Web')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSearch(searchQuery);
              if (e.key === 'Escape') {
                setSearchQuery('');
                searchRef.current?.blur();
              }
            }}
          />
        </div>
        <div className='tw-titlebar-drag' />
      </div>

      {/* 右侧操作区 */}
      <div className='tw-titlebar-actions'>
        <button
          type='button'
          className='tw-titlebar-icon-btn'
          onClick={() => navigate('/settings')}
          aria-label={t('nav.settings', '设置')}
        >
          <Settings className='w-4 h-4' />
        </button>

        {mode === 'workspace' ? (
          <div ref={userMenuRef} className='tw-titlebar-nav-dropdown-wrap'>
            <button
              type='button'
              className={`tw-titlebar-user tw-titlebar-user--btn ${userMenuOpen ? 'is-active' : ''}`}
              onClick={() => setUserMenuOpen(prev => !prev)}
            >
              <User className='w-3.5 h-3.5' />
              <span>{cloudUser?.username || 'Workspace'}</span>
              <ChevronDown
                className={`w-3 h-3 opacity-60 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {userMenuOpen && (
              <div className='tw-nav-menu' style={{ right: 0, left: 'auto', minWidth: 180 }}>
                <div className='tw-nav-menu-section'>
                  {cloudUser?.email || cloudUser?.username || ''}
                </div>
                <button
                  type='button'
                  className='tw-nav-menu-item'
                  onClick={() => {
                    navigate('/settings');
                    setUserMenuOpen(false);
                  }}
                >
                  <Settings className='w-4 h-4' />
                  <span>{t('nav.settings', '系统设置')}</span>
                </button>
                <button
                  type='button'
                  className='tw-nav-menu-item'
                  onClick={() => {
                    navigate('/settings?tab=account');
                    setUserMenuOpen(false);
                  }}
                >
                  <User className='w-4 h-4' />
                  <span>{t('nav.account', '账户管理')}</span>
                </button>
                <div className='tw-nav-menu-sep' />
                <button
                  type='button'
                  className='tw-nav-menu-item tw-nav-menu-item--danger'
                  onClick={() => {
                    // 清除云端凭据
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('current_user');
                    localStorage.removeItem('licenseCert');
                    // 通知主进程
                    void window.electronAPI?.appState?.clearCloudAuth?.();
                    // 切回 Scratch Pad
                    switchToScratchpad();
                    setUserMenuOpen(false);
                  }}
                >
                  <LogOut className='w-4 h-4' />
                  <span>{t('nav.logout', '退出登录')}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <button
              type='button'
              className='tw-titlebar-signin-btn'
              onClick={() => navigate('/login')}
            >
              {t('nav.signIn', 'Sign In')}
            </button>
            <button
              type='button'
              className='tw-titlebar-create-btn'
              onClick={() => navigate('/register')}
            >
              {t('nav.createAccount', 'Create Account')}
            </button>
          </>
        )}
      </div>

      {/* 窗口控制按钮（仅 Windows/Linux） */}
      {!isMac && (
        <div className='tw-titlebar-controls'>
          <button
            type='button'
            className='tw-titlebar-btn'
            onClick={handleMinimize}
            aria-label='最小化'
          >
            <Minus className='w-4 h-4' />
          </button>
          <button
            type='button'
            className='tw-titlebar-btn'
            onClick={handleMaximize}
            aria-label={maximized ? '还原' : '最大化'}
          >
            {maximized ? (
              <svg
                width='16'
                height='16'
                viewBox='0 0 16 16'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.2'
              >
                <rect x='3' y='5' width='8' height='8' rx='1' />
                <path d='M5 5V3.5A1.5 1.5 0 016.5 2H12.5A1.5 1.5 0 0114 3.5V9.5A1.5 1.5 0 0112.5 11H11' />
              </svg>
            ) : (
              <Square className='w-3.5 h-3.5' />
            )}
          </button>
          <button
            type='button'
            className='tw-titlebar-btn tw-titlebar-btn--close'
            onClick={handleClose}
            aria-label='关闭'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      )}
    </div>
  );
};

export default TitleBar;
