/**
 * Postman 风格多标签页栏 — 测试类型感知
 *
 * 每个标签页代表一个独立的测试会话，绑定具体测试类型
 * Dashboard 标签显示测试类型图标+颜色，其他页面标签保留路由标签
 * + 按钮弹出下拉菜单，选择测试类型创建对应标签
 */

import {
  Activity,
  ChevronDown,
  Eye,
  FileText,
  Globe,
  Layers,
  Plus,
  Search,
  Shield,
  Smartphone,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import type { TestType } from '../../context/TestContext';
import { isDesktop } from '../../utils/environment';

/* ── 测试类型配置 ── */

type TestTypeMeta = {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  labelKey: string;
};

const TEST_TYPE_META: Record<TestType, TestTypeMeta> = {
  performance: { icon: Zap, color: '#f97316', labelKey: 'testType.performance' },
  security: { icon: Shield, color: '#ef4444', labelKey: 'testType.security' },
  seo: { icon: Search, color: '#22c55e', labelKey: 'testType.seo' },
  api: { icon: FileText, color: '#8b5cf6', labelKey: 'testType.api' },
  stress: { icon: Layers, color: '#eab308', labelKey: 'testType.stress' },
  accessibility: { icon: Eye, color: '#3b82f6', labelKey: 'testType.accessibility' },
  compatibility: { icon: Smartphone, color: '#a855f7', labelKey: 'testType.compatibility' },
  ux: { icon: Activity, color: '#ec4899', labelKey: 'testType.ux' },
  website: { icon: Globe, color: '#06b6d4', labelKey: 'testType.website' },
};

/** 新建 tab 菜单中显示的测试类型顺序 */
const NEW_TAB_TYPES: TestType[] = [
  'performance',
  'api',
  'security',
  'seo',
  'stress',
  'accessibility',
  'compatibility',
  'ux',
  'website',
];

/* ── TabItem 类型 ── */

export type TabItem = {
  id: string;
  /** 显示名 */
  label: string;
  /** 路由路径 */
  path: string;
  /** 是否可关闭 */
  closable: boolean;
  /** 绑定的测试类型（仅 dashboard tab） */
  testType?: TestType;
  /** 测试 URL（仅 dashboard tab） */
  testUrl?: string;
};

const MAX_TABS = 12;
const STORAGE_KEY = 'tw:open-tabs';

/** 路由路径 → i18n key 映射（非 dashboard 页面） */
const PATH_LABEL_KEYS: Record<string, string> = {
  '/history': 'nav.history',
  '/collections': 'nav.collections',
  '/environments': 'nav.environments',
  '/templates': 'nav.templates',
  '/settings': 'nav.settings',
  '/workspaces': 'nav.workspaces',
  '/monitoring': 'nav.monitoring',
  '/test-plans': 'nav.testPlans',
  '/uat': 'nav.uat',
  '/admin': 'nav.admin',
};

const pathToLabel = (path: string): string => {
  if (PATH_LABEL_KEYS[path]) return PATH_LABEL_KEYS[path];
  if (path === '/dashboard') return 'nav.console';
  if (path.startsWith('/history/')) return 'history.detail';
  return path;
};

const loadTabs = (): TabItem[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: TabItem[] = JSON.parse(raw);
      return parsed.filter(tab => tab.path !== '/');
    }
  } catch {
    /* ignore */
  }
  return [];
};

const saveTabs = (tabs: TabItem[]) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
};

const TabBar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNewMenu, setShowNewMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [tabs, setTabs] = useState<TabItem[]>(() => {
    const saved = loadTabs();
    if (saved.length > 0) return saved;
    const defaultPath = isDesktop() ? '/dashboard' : '/history';
    return [
      {
        id: 'home',
        label: pathToLabel(defaultPath),
        path: defaultPath,
        closable: false,
        testType: defaultPath === '/dashboard' ? ('performance' as TestType) : undefined,
      },
    ];
  });

  const [activeTabId, setActiveTabId] = useState(() => {
    const lastActive = window.localStorage.getItem('tw:active-tab');
    if (lastActive && tabs.some(tab => tab.id === lastActive)) return lastActive;
    return tabs.find(tab => tab.path === location.pathname)?.id || tabs[0]?.id || '';
  });

  // 路由变化 → 确保有匹配 tab（/ 路径由路由重定向处理，不创建 tab）
  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath === '/') return;
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (activeTab && activeTab.path === currentPath) return;
    const existing = tabs.find(tab => tab.path === currentPath);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    const newTab: TabItem = {
      id: `tab-${Date.now()}`,
      label: pathToLabel(currentPath),
      path: currentPath,
      closable: true,
    };
    setTabs(prev => {
      const next = [...prev, newTab].slice(-MAX_TABS);
      saveTabs(next);
      return next;
    });
    setActiveTabId(newTab.id);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.localStorage.setItem('tw:active-tab', activeTabId);
    // 通知 TestProvider 当前活跃的 tabId（初始化 + 路由变化创建新 tab 时）
    window.dispatchEvent(new CustomEvent('tw:active-tab-id', { detail: activeTabId }));
    // 通知 DashboardPage 当前标签是否为测试类型标签
    const activeTab = tabs.find(t => t.id === activeTabId);
    window.dispatchEvent(
      new CustomEvent('tw:tab-is-test', {
        detail: activeTab ? activeTab.closable && Boolean(activeTab.testType) : false,
      })
    );
  }, [activeTabId, tabs]);
  useEffect(() => {
    saveTabs(tabs);
  }, [tabs]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    if (!showNewMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNewMenu]);

  // 切换 tab 时同步 TestContext 的 selectedType
  const syncTestType = useCallback((testType?: TestType) => {
    if (testType) {
      window.dispatchEvent(new CustomEvent('tw:select-test-type', { detail: testType }));
    }
  }, []);

  const handleSwitch = useCallback(
    (tab: TabItem) => {
      const prevId = activeTabId;
      setActiveTabId(tab.id);
      syncTestType(tab.testType);
      // 通知 TestProvider 保存旧会话、恢复新会话
      window.dispatchEvent(
        new CustomEvent('tw:switch-tab', {
          detail: { fromTabId: prevId, toTabId: tab.id, testType: tab.testType },
        })
      );
      // 通知 DashboardPage 当前标签是否为测试类型标签（closable 的才是用户创建的测试标签）
      window.dispatchEvent(
        new CustomEvent('tw:tab-is-test', { detail: tab.closable && Boolean(tab.testType) })
      );
      if (location.pathname !== tab.path) {
        navigate(tab.path);
      }
    },
    [activeTabId, navigate, location.pathname, syncTestType]
  );

  const handleClose = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();
      setTabs(prev => {
        const idx = prev.findIndex(t => t.id === tabId);
        if (idx < 0) return prev;
        const next = prev.filter(t => t.id !== tabId);
        if (next.length === 0) {
          const defaultPath = isDesktop() ? '/dashboard' : '/history';
          next.push({
            id: 'home',
            label: pathToLabel(defaultPath),
            path: defaultPath,
            closable: false,
            testType: defaultPath === '/dashboard' ? ('performance' as TestType) : undefined,
          });
        }
        saveTabs(next);
        if (tabId === activeTabId) {
          const newActive = next[Math.min(idx, next.length - 1)];
          if (newActive) {
            setActiveTabId(newActive.id);
            syncTestType(newActive.testType);
            navigate(newActive.path);
          }
        }
        return next;
      });
    },
    [activeTabId, navigate, syncTestType]
  );

  /** 创建指定测试类型的新标签 */
  const handleNewTestTab = useCallback(
    (testType: TestType) => {
      const meta = TEST_TYPE_META[testType];
      const newTab: TabItem = {
        id: `tab-${Date.now()}`,
        label: meta.labelKey,
        path: '/dashboard',
        closable: true,
        testType,
      };
      setTabs(prev => {
        const next = [...prev, newTab].slice(-MAX_TABS);
        saveTabs(next);
        return next;
      });
      const prevId = activeTabId;
      setActiveTabId(newTab.id);
      syncTestType(testType);
      setShowNewMenu(false);
      // 通知 TestProvider 保存旧会话、重置新会话（携带 testType）
      window.dispatchEvent(
        new CustomEvent('tw:switch-tab', {
          detail: { fromTabId: prevId, toTabId: newTab.id, testType },
        })
      );
      // 通知 DashboardPage 当前是测试类型标签
      window.dispatchEvent(new CustomEvent('tw:tab-is-test', { detail: true }));
      navigate('/dashboard');
    },
    [activeTabId, navigate, syncTestType]
  );

  // 监听 DashboardOverview 发出的 tw:create-test-tab 事件
  useEffect(() => {
    const handler = (e: Event) => {
      const testType = (e as CustomEvent).detail as TestType;
      if (testType && TEST_TYPE_META[testType]) {
        handleNewTestTab(testType);
      }
    };
    window.addEventListener('tw:create-test-tab', handler);
    return () => window.removeEventListener('tw:create-test-tab', handler);
  }, [handleNewTestTab]);

  // 监听 selectTestType 发出的 tw:update-tab-type 事件，同步更新当前活跃标签的测试类型
  useEffect(() => {
    const handler = (e: Event) => {
      const testType = (e as CustomEvent).detail as TestType;
      if (!testType || !TEST_TYPE_META[testType]) return;
      setTabs(prev => {
        const idx = prev.findIndex(t => t.id === activeTabId);
        if (idx < 0) return prev;
        const tab = prev[idx];
        // 仅更新绑定了测试类型的可关闭标签（用户创建的测试标签）
        if (!tab.closable) return prev;
        if (tab.testType === testType) return prev;
        const next = [...prev];
        next[idx] = { ...tab, testType, label: TEST_TYPE_META[testType].labelKey };
        saveTabs(next);
        return next;
      });
    };
    window.addEventListener('tw:update-tab-type', handler);
    return () => window.removeEventListener('tw:update-tab-type', handler);
  }, [activeTabId]);

  // 监听 runTest 发出的 tw:ensure-test-tab 事件
  // 如果当前活跃标签没有绑定 testType（即"控制台"标签），自动创建测试类型标签页
  useEffect(() => {
    const handler = (e: Event) => {
      const testType = (e as CustomEvent).detail as TestType;
      if (!testType) return;
      // 查找当前活跃标签
      const active = tabs.find(t => t.id === activeTabId);
      if (active && !active.testType) {
        // 当前是"控制台"标签（没有 testType），创建新标签
        const meta = TEST_TYPE_META[testType];
        if (!meta) return;
        const prevId = activeTabId;
        const newTab: TabItem = {
          id: `tab-${Date.now()}`,
          label: meta.labelKey,
          path: '/dashboard',
          closable: true,
          testType,
        };
        setTabs(prev => {
          const next = [...prev, newTab].slice(-MAX_TABS);
          saveTabs(next);
          return next;
        });
        setActiveTabId(newTab.id);
        syncTestType(testType);
        // 通知 TestProvider 保存旧会话、重置新会话（携带 testType）
        window.dispatchEvent(
          new CustomEvent('tw:switch-tab', {
            detail: { fromTabId: prevId, toTabId: newTab.id, testType },
          })
        );
        // 通知 DashboardPage 当前是测试类型标签
        window.dispatchEvent(new CustomEvent('tw:tab-is-test', { detail: true }));
        navigate('/dashboard');
      }
    };
    window.addEventListener('tw:ensure-test-tab', handler);
    return () => window.removeEventListener('tw:ensure-test-tab', handler);
  }, [tabs, activeTabId, navigate, syncTestType]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, tabId: string, closable: boolean) => {
      if (e.button === 1 && closable) {
        e.preventDefault();
        handleClose(e, tabId);
      }
    },
    [handleClose]
  );

  /** 渲染 tab 内容：测试类型 tab 显示图标+颜色，其他显示路由标签 */
  const renderTabContent = (tab: TabItem) => {
    if (tab.testType && TEST_TYPE_META[tab.testType]) {
      const meta = TEST_TYPE_META[tab.testType];
      const Icon = meta.icon;
      return (
        <>
          <Icon className='w-3 h-3 tw-tab-type-icon' style={{ color: meta.color }} />
          <span className='tw-tab-label'>
            {tab.testUrl ? new URL(tab.testUrl).hostname : t(meta.labelKey)}
          </span>
        </>
      );
    }

    // 非测试类型 tab（history/settings 等）
    return (
      <>
        <span
          className='tw-tab-dot'
          style={tab.testType ? { background: TEST_TYPE_META[tab.testType]?.color } : undefined}
        />
        <span className='tw-tab-label'>
          {PATH_LABEL_KEYS[tab.path]
            ? t(PATH_LABEL_KEYS[tab.path])
            : tab.path === '/dashboard'
              ? t('nav.console')
              : tab.path.startsWith('/history/')
                ? `${t('nav.history')} ${tab.path.split('/').pop()?.slice(0, 6) || ''}`
                : tab.label}
        </span>
      </>
    );
  };

  return (
    <div className='tw-tabbar'>
      <div className='tw-tabbar-scroll'>
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          const meta = tab.testType ? TEST_TYPE_META[tab.testType] : undefined;
          return (
            <button
              key={tab.id}
              type='button'
              className={`tw-tab ${isActive ? 'is-active' : ''}`}
              style={
                isActive && meta
                  ? ({ '--tab-accent': meta.color } as React.CSSProperties)
                  : undefined
              }
              onClick={() => handleSwitch(tab)}
              onMouseDown={e => handleMouseDown(e, tab.id, tab.closable)}
              title={
                tab.testType
                  ? `${t(TEST_TYPE_META[tab.testType].labelKey)} — ${tab.path}`
                  : tab.path
              }
            >
              {renderTabContent(tab)}
              {tab.closable && (
                <span
                  className='tw-tab-close'
                  role='button'
                  tabIndex={-1}
                  onClick={e => handleClose(e, tab.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleClose(e as unknown as React.MouseEvent, tab.id);
                  }}
                  aria-label={t('tab.close', '关闭标签')}
                >
                  <X className='w-3 h-3' />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* + 新建标签按钮 + 下拉菜单 */}
      <div className='tw-tabbar-new' ref={menuRef}>
        <button
          type='button'
          className='tw-tabbar-add'
          onClick={() => setShowNewMenu(prev => !prev)}
          aria-label={t('tab.new', '新建标签页')}
          title={t('tab.new', '新建标签页')}
        >
          <Plus className='w-3.5 h-3.5' />
          <ChevronDown className='w-2.5 h-2.5 opacity-50' />
        </button>

        {showNewMenu && (
          <div className='tw-tab-new-menu'>
            <div className='tw-tab-new-menu-title'>{t('tab.selectTestType', '选择测试类型')}</div>
            {NEW_TAB_TYPES.map(type => {
              const meta = TEST_TYPE_META[type];
              const Icon = meta.icon;
              return (
                <button
                  key={type}
                  type='button'
                  className='tw-tab-new-menu-item'
                  onClick={() => handleNewTestTab(type)}
                >
                  <Icon className='w-3.5 h-3.5' style={{ color: meta.color }} />
                  <span>{t(meta.labelKey)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TabBar;
