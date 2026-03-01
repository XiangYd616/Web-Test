/**
 * Dashboard 页面各测试类型的标签页配置
 * 根据选中的测试类型动态渲染不同的标签页
 */
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  FileJson,
  LayoutList,
  Settings2,
  Shield,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

import type { TestType } from '../context/TestContext';

export type DashboardTabId =
  | 'summary'
  | 'charts'
  | 'details'
  | 'vulnerabilities'
  | 'compliance'
  | 'config'
  | 'raw'
  | 'trend'
  | 'comparison'
  | 'history';

export interface DashboardTabDef {
  id: DashboardTabId;
  labelKey: string;
  fallbackLabel: string;
  icon: LucideIcon;
}

const tab = (
  id: DashboardTabId,
  labelKey: string,
  fallbackLabel: string,
  icon: LucideIcon
): DashboardTabDef => ({ id, labelKey, fallbackLabel, icon });

// ── 公共标签定义 ──
const TAB_SUMMARY = tab('summary', 'dashboard.resultSummary', '概览', TrendingUp);
const TAB_CHARTS = tab('charts', 'dashboard.charts', '图表', BarChart3);
const TAB_DETAILS = tab('details', 'dashboard.details', '详情', BarChart3);
const TAB_VULNERABILITIES = tab('vulnerabilities', 'dashboard.vulnerabilities', '漏洞列表', Shield);
const TAB_COMPLIANCE = tab('compliance', 'dashboard.compliance', '合规', ShieldCheck);
const TAB_CONFIG = tab('config', 'dashboard.configSummary', '配置', Settings2);
const TAB_RAW = tab('raw', 'dashboard.raw', 'JSON', FileJson);
const TAB_TREND = tab('trend', 'dashboard.trend', '趋势', Activity);
const TAB_COMPARISON = tab('comparison', 'dashboard.comparison', '对比', TrendingUp);
const TAB_HISTORY = tab('history', 'dashboard.recentHistory', '历史', LayoutList);

// ── 各测试类型标签页配置 ──

const DASHBOARD_TABS: Record<TestType, DashboardTabDef[]> = {
  website: [
    TAB_SUMMARY,
    TAB_DETAILS,
    TAB_CHARTS,
    TAB_CONFIG,
    TAB_RAW,
    TAB_TREND,
    TAB_COMPARISON,
    TAB_HISTORY,
  ],
  performance: [
    TAB_SUMMARY,
    TAB_CHARTS,
    TAB_CONFIG,
    TAB_RAW,
    TAB_TREND,
    TAB_COMPARISON,
    TAB_HISTORY,
  ],
  security: [TAB_SUMMARY, TAB_VULNERABILITIES, TAB_COMPLIANCE, TAB_CONFIG, TAB_RAW, TAB_HISTORY],
  seo: [TAB_SUMMARY, TAB_DETAILS, TAB_CHARTS, TAB_CONFIG, TAB_RAW, TAB_HISTORY],
  api: [TAB_SUMMARY, TAB_CHARTS, TAB_CONFIG, TAB_RAW, TAB_HISTORY],
  stress: [TAB_SUMMARY, TAB_CHARTS, TAB_CONFIG, TAB_RAW, TAB_TREND, TAB_HISTORY],
  accessibility: [TAB_SUMMARY, TAB_DETAILS, TAB_CHARTS, TAB_CONFIG, TAB_RAW, TAB_HISTORY],
  compatibility: [TAB_SUMMARY, TAB_DETAILS, TAB_CHARTS, TAB_CONFIG, TAB_RAW, TAB_HISTORY],
  ux: [TAB_SUMMARY, TAB_DETAILS, TAB_CHARTS, TAB_CONFIG, TAB_RAW, TAB_TREND, TAB_HISTORY],
};

export function getDashboardTabs(testType: TestType): DashboardTabDef[] {
  return DASHBOARD_TABS[testType] || DASHBOARD_TABS.website;
}
