import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { Download, Globe, Monitor, Smartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import PanelLoading from '../components/PanelLoading';
import HistoryList from '../components/left/HistoryList';
import TestEditor from '../components/middle/TestEditor';
import { type DashboardTabId, getDashboardTabs } from '../constants/dashboardTabs';
import { type TestType, useTestConfig, useTestResult } from '../context/TestContext';
import { isDesktop } from '../utils/environment';

const AccessibilityChartPanel = lazy(() => import('../components/right/AccessibilityChartPanel'));
const ApiChartPanel = lazy(() => import('../components/right/ApiChartPanel'));
const ComparisonPanel = lazy(() => import('../components/right/ComparisonPanel'));
const CompatibilityChartPanel = lazy(() => import('../components/right/CompatibilityChartPanel'));
const ConfigSummaryPanel = lazy(() => import('../components/right/ConfigSummaryPanel'));
const PerformanceChartPanel = lazy(() => import('../components/right/PerformanceChartPanel'));
const RawJsonViewer = lazy(() => import('../components/right/RawJsonViewer'));
const ResultSummary = lazy(() => import('../components/right/ResultSummary'));
const SecurityCompliancePanel = lazy(
  () => import('../components/right/security/SecurityCompliancePanel')
);
const SecurityOverviewPanel = lazy(
  () => import('../components/right/security/SecurityOverviewPanel')
);
const SecurityVulnListPanel = lazy(
  () => import('../components/right/security/SecurityVulnListPanel')
);
const SeoChartPanel = lazy(() => import('../components/right/SeoChartPanel'));
const SeoDetailPanel = lazy(() => import('../components/right/SeoDetailPanel'));
const StressChartPanel = lazy(() => import('../components/right/StressChartPanel'));
const TrendPanel = lazy(() => import('../components/right/TrendPanel'));
const UxChartPanel = lazy(() => import('../components/right/UxChartPanel'));
const WebsiteChartPanel = lazy(() => import('../components/right/WebsiteChartPanel'));
const DashboardOverview = lazy(() => import('../components/dashboard/DashboardOverview'));

/** 每种测试类型对应的专属图表面板 */
const ENGINE_PANELS: Record<TestType, React.ComponentType | null> = {
  performance: PerformanceChartPanel,
  security: SecurityOverviewPanel,
  seo: SeoChartPanel,
  api: ApiChartPanel,
  stress: StressChartPanel,
  accessibility: AccessibilityChartPanel,
  compatibility: CompatibilityChartPanel,
  ux: UxChartPanel,
  website: WebsiteChartPanel,
};

/** 每种测试类型对应的专属详情面板（未配置则回退到图表面板） */
const ENGINE_DETAIL_PANELS: Partial<Record<TestType, React.ComponentType | null>> = {
  seo: SeoDetailPanel,
};

/** Web 端欢迎引导页 — 引导用户下载桌面端或使用云端数据管理 */
const WebWelcomePage = () => {
  const { t } = useTranslation();
  const GITHUB_URL = 'https://github.com/XiangYd616/Web-Test/releases';
  const WEBSITE_URL = 'https://xiangweb.space';

  return (
    <div className='flex flex-col items-center justify-center h-full px-6 py-12 text-center'>
      <div className='max-w-2xl space-y-8'>
        <div className='space-y-3'>
          <div className='inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg mb-2'>
            <Monitor className='h-8 w-8 text-white' />
          </div>
          <h1 className='text-2xl font-bold tracking-tight'>
            {t('welcome.title', '测试功能仅在桌面端可用')}
          </h1>
          <p className='text-muted-foreground max-w-md mx-auto'>
            {t(
              'welcome.description',
              'Web 端提供云端数据同步、历史记录查看、集合管理等功能。如需执行性能测试、安全扫描、SEO 检测等，请下载桌面端应用。'
            )}
          </p>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 text-left'>
          <div className='rounded-xl border bg-card p-5 space-y-2 hover:shadow-md transition-shadow'>
            <div className='inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10'>
              <Globe className='h-5 w-5 text-blue-500' />
            </div>
            <h3 className='font-semibold text-sm'>{t('welcome.cloudSync', '云端同步')}</h3>
            <p className='text-xs text-muted-foreground leading-relaxed'>
              {t('welcome.cloudSyncDesc', '测试记录、集合、环境变量自动同步到云端，跨设备访问。')}
            </p>
          </div>
          <div className='rounded-xl border bg-card p-5 space-y-2 hover:shadow-md transition-shadow'>
            <div className='inline-flex items-center justify-center w-9 h-9 rounded-lg bg-green-500/10'>
              <Smartphone className='h-5 w-5 text-green-500' />
            </div>
            <h3 className='font-semibold text-sm'>{t('welcome.dataManage', '数据管理')}</h3>
            <p className='text-xs text-muted-foreground leading-relaxed'>
              {t('welcome.dataManageDesc', '在 Web 端管理历史记录、测试集合、工作空间和环境配置。')}
            </p>
          </div>
          <div className='rounded-xl border bg-card p-5 space-y-2 hover:shadow-md transition-shadow'>
            <div className='inline-flex items-center justify-center w-9 h-9 rounded-lg bg-orange-500/10'>
              <Monitor className='h-5 w-5 text-orange-500' />
            </div>
            <h3 className='font-semibold text-sm'>{t('welcome.desktopTest', '桌面端测试')}</h3>
            <p className='text-xs text-muted-foreground leading-relaxed'>
              {t(
                'welcome.desktopTestDesc',
                '桌面端内置浏览器引擎，支持全部 9 种测试类型，本地执行零延迟。'
              )}
            </p>
          </div>
        </div>

        <div className='flex flex-col sm:flex-row items-center justify-center gap-3'>
          <Button size='lg' className='gap-2 shadow-sm' asChild>
            <a href={GITHUB_URL} target='_blank' rel='noopener noreferrer'>
              <Download className='h-4 w-4' />
              {t('welcome.downloadDesktop', '下载桌面端')}
            </a>
          </Button>
          <Button size='lg' variant='outline' className='gap-2' asChild>
            <a href={WEBSITE_URL} target='_blank' rel='noopener noreferrer'>
              <Globe className='h-4 w-4' />
              {t('welcome.visitWebsite', '访问官网')}
            </a>
          </Button>
        </div>

        <p className='text-xs text-muted-foreground'>
          {t('welcome.platforms', '支持 Windows / macOS / Linux · 登录后数据自动同步')}
        </p>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { selectedType } = useTestConfig();
  const { result, resultPayloadText } = useTestResult();
  const { t } = useTranslation();
  const _isDesktopEnv = isDesktop();

  // 监听 TabBar 事件：当前标签是否为测试类型标签
  // 从 localStorage 读取初始值，避免事件时序竞态
  const [isTestTab, setIsTestTab] = useState(() => {
    try {
      const activeId = window.localStorage.getItem('tw:active-tab');
      const raw = window.localStorage.getItem('tw:open-tabs');
      if (activeId && raw) {
        const tabs = JSON.parse(raw) as Array<{
          id: string;
          closable?: boolean;
          testType?: string;
        }>;
        const active = tabs.find(t => t.id === activeId);
        return active ? Boolean(active.closable) && Boolean(active.testType) : false;
      }
    } catch {
      /* ignore */
    }
    return false;
  });
  useEffect(() => {
    const handler = (e: Event) => {
      setIsTestTab(Boolean((e as CustomEvent).detail));
    };
    window.addEventListener('tw:tab-is-test', handler);
    return () => window.removeEventListener('tw:tab-is-test', handler);
  }, []);

  const hasResult = useMemo(() => {
    if (!resultPayloadText || !resultPayloadText.trim()) return false;
    try {
      const parsed = JSON.parse(resultPayloadText);
      return parsed && typeof parsed === 'object';
    } catch {
      return false;
    }
  }, [resultPayloadText]);

  const EnginePanel = ENGINE_PANELS[selectedType] ?? null;
  const DetailPanel = ENGINE_DETAIL_PANELS[selectedType] ?? EnginePanel;

  const [resultTab, setResultTab] = useState<DashboardTabId>('summary');
  const allDashboardTabs = useMemo(() => getDashboardTabs(selectedType), [selectedType]);
  const dashboardTabs = useMemo(() => {
    if (hasResult || result.status === 'running') return allDashboardTabs;
    return allDashboardTabs.filter(tab => tab.id === 'summary');
  }, [allDashboardTabs, hasResult, result.status]);

  const effectiveTab = useMemo(() => {
    const tabIds = dashboardTabs.map(t => t.id);
    return tabIds.includes(resultTab) ? resultTab : 'summary';
  }, [dashboardTabs, resultTab]);

  // 测试开始运行时自动切换 Tab
  useEffect(() => {
    if (result.status === 'running') {
      if (selectedType === 'stress') {
        setResultTab('charts');
      } else {
        setResultTab('summary');
      }
    } else if (result.status === 'completed') {
      setResultTab('summary');
    }
  }, [result.status, selectedType]);

  // ── 将 Dashboard tab 信息推送给 StatusBar ──
  useEffect(() => {
    const showTabs = hasResult || result.status === 'running';
    if (showTabs && _isDesktopEnv) {
      window.dispatchEvent(
        new CustomEvent('tw:dashboard-tabs-update', {
          detail: {
            tabs: dashboardTabs.map(tab => ({
              id: tab.id,
              labelKey: tab.labelKey,
              fallbackLabel: tab.fallbackLabel,
              iconName: '',
            })),
            activeTab: effectiveTab,
            hasResult,
            score: result.score,
            status: result.status,
          },
        })
      );
    } else if (_isDesktopEnv) {
      window.dispatchEvent(new CustomEvent('tw:dashboard-tabs-update', { detail: null }));
    }
  }, [dashboardTabs, effectiveTab, hasResult, result.score, result.status, _isDesktopEnv]);

  // 卸载时清空 StatusBar 的 tab 数据
  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('tw:dashboard-tabs-update', { detail: null }));
    };
  }, []);

  // ── 监听 StatusBar 的 tab 切换事件 ──
  useEffect(() => {
    const handler = (e: Event) => {
      const tabId = (e as CustomEvent).detail as string;
      if (tabId) setResultTab(tabId as DashboardTabId);
    };
    window.addEventListener('tw:dashboard-tab-change', handler);
    return () => window.removeEventListener('tw:dashboard-tab-change', handler);
  }, []);

  // ── 监听 footer 面板状态，以便知道 portal slot 是否可用 ──
  const [footerState, setFooterState] = useState<{ open: boolean; view: string }>({
    open: false,
    view: 'console',
  });
  useEffect(() => {
    const handler = (e: Event) => {
      setFooterState((e as CustomEvent).detail);
    };
    window.addEventListener('tw:footer-panel-state', handler);
    return () => window.removeEventListener('tw:footer-panel-state', handler);
  }, []);

  const portalSlot =
    footerState.open && footerState.view === 'dashboard'
      ? document.getElementById('footer-dashboard-slot')
      : null;

  // Web 端显示引导页
  if (!_isDesktopEnv) {
    return <WebWelcomePage />;
  }

  // 桌面端：无结果 + 无运行中测试 → 显示引导页或编辑器
  const showHomePage = !hasResult && result.status !== 'running';

  // ── 结果面板（通过 Portal 渲染到 footer 的 #footer-dashboard-slot） ──
  const resultPortal = portalSlot
    ? createPortal(
        <Tabs
          value={effectiveTab}
          onValueChange={v => setResultTab(v as DashboardTabId)}
          className='tw-footer-dashboard-tabs'
        >
          <TabsList className='sr-only'>
            {dashboardTabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.fallbackLabel}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent
            value='summary'
            className='tw-result-content'
            forceMount={effectiveTab === 'summary' ? true : undefined}
          >
            <Suspense fallback={<PanelLoading />}>
              <ResultSummary />
            </Suspense>
          </TabsContent>
          <TabsContent value='charts' className='tw-result-content'>
            {EnginePanel ? (
              <Suspense fallback={<PanelLoading />}>
                <EnginePanel />
              </Suspense>
            ) : (
              <div className='flex items-center justify-center h-full text-muted-foreground text-sm'>
                {t('dashboard.noChartData', '暂无图表数据，请先运行测试')}
              </div>
            )}
          </TabsContent>
          <TabsContent value='details' className='tw-result-content'>
            {DetailPanel ? (
              <Suspense fallback={<PanelLoading />}>
                <DetailPanel />
              </Suspense>
            ) : (
              <div className='flex items-center justify-center h-full text-muted-foreground text-sm'>
                {t('dashboard.noDetails', '暂无详情数据')}
              </div>
            )}
          </TabsContent>
          <TabsContent value='vulnerabilities' className='tw-result-content'>
            <Suspense fallback={<PanelLoading />}>
              <SecurityVulnListPanel />
            </Suspense>
          </TabsContent>
          <TabsContent value='compliance' className='tw-result-content'>
            <Suspense fallback={<PanelLoading />}>
              <SecurityCompliancePanel />
            </Suspense>
          </TabsContent>
          <TabsContent value='config' className='tw-result-content'>
            {hasResult ? (
              <Suspense fallback={<PanelLoading />}>
                <ConfigSummaryPanel />
              </Suspense>
            ) : (
              <div className='flex items-center justify-center h-full text-muted-foreground text-sm'>
                {t('dashboard.noConfigData', '暂无配置数据')}
              </div>
            )}
          </TabsContent>
          <TabsContent value='raw' className='tw-result-content'>
            {hasResult ? (
              <Suspense fallback={<PanelLoading />}>
                <RawJsonViewer />
              </Suspense>
            ) : (
              <div className='flex items-center justify-center h-full text-muted-foreground text-sm'>
                {t('dashboard.noRawData', '暂无原始数据')}
              </div>
            )}
          </TabsContent>
          <TabsContent value='trend' className='tw-result-content'>
            <Suspense fallback={<PanelLoading />}>
              <TrendPanel />
            </Suspense>
          </TabsContent>
          <TabsContent value='comparison' className='tw-result-content'>
            <Suspense fallback={<PanelLoading />}>
              <ComparisonPanel />
            </Suspense>
          </TabsContent>
          <TabsContent value='history' className='tw-result-content'>
            <HistoryList />
          </TabsContent>
        </Tabs>,
        portalSlot
      )
    : null;

  // ── 主内容区：只保留 TestEditor / 引导页 ──
  if (showHomePage) {
    return (
      <>
        {isTestTab ? (
          <div className='tw-dashboard-main'>
            <TestEditor />
          </div>
        ) : (
          <Suspense fallback={<PanelLoading />}>
            <DashboardOverview />
          </Suspense>
        )}
      </>
    );
  }

  return (
    <>
      {/* 主内容区：TestEditor 或总览 */}
      {isTestTab ? (
        <div className='tw-dashboard-main'>
          <TestEditor />
        </div>
      ) : (
        <Suspense fallback={<PanelLoading />}>
          <DashboardOverview />
        </Suspense>
      )}
      {/* 结果面板 Portal 到 footer */}
      {resultPortal}
    </>
  );
};

export default DashboardPage;
