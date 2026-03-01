/**
 * 各测试类型的标签页配置
 * 根据测试类型动态渲染不同的标签页，避免展示无关内容
 */

export type TabId =
  | 'overview'
  | 'details'
  | 'chart'
  | 'compare'
  | 'trend'
  | 'vulnerabilities'
  | 'compliance'
  | 'config'
  | 'json'
  | 'log'
  | 'history';

export interface TabDef {
  id: TabId;
  labelKey: string;
  fallbackLabel: string;
}

const tab = (id: TabId, labelKey: string, fallbackLabel: string): TabDef => ({
  id,
  labelKey,
  fallbackLabel,
});

// ── 公共标签 ──
const TAB_OVERVIEW = tab('overview', 'historyTabs.overview', '概览');
const TAB_DETAILS = tab('details', 'historyTabs.details', '详情');
const TAB_CHART = tab('chart', 'historyTabs.chart', '图表');
const TAB_COMPARE = tab('compare', 'historyTabs.compare', '对比');
const TAB_TREND = tab('trend', 'historyTabs.trend', '趋势');
const TAB_VULNERABILITIES = tab('vulnerabilities', 'historyTabs.vulnerabilities', '漏洞列表');
const TAB_COMPLIANCE = tab('compliance', 'historyTabs.compliance', '合规检查');
const TAB_CONFIG = tab('config', 'historyTabs.config', '配置');
const TAB_JSON = tab('json', 'historyTabs.json', 'JSON');
const TAB_LOG = tab('log', 'historyTabs.log', '日志');
const TAB_HISTORY = tab('history', 'historyTabs.history', '历史');

// ── 各测试类型标签页配置 ──

/** 全量（网站综合评估） */
const WEBSITE_TABS: TabDef[] = [
  TAB_OVERVIEW,
  TAB_DETAILS,
  TAB_CHART,
  TAB_COMPARE,
  TAB_TREND,
  TAB_CONFIG,
  TAB_JSON,
  TAB_LOG,
  TAB_HISTORY,
];

/** 性能（页面加载与性能指标） */
const PERFORMANCE_TABS: TabDef[] = [
  TAB_OVERVIEW,
  TAB_CHART,
  TAB_COMPARE,
  TAB_TREND,
  TAB_CONFIG,
  TAB_JSON,
  TAB_LOG,
  TAB_HISTORY,
];

/** 安全（安全漏洞与合规检测） */
const SECURITY_TABS: TabDef[] = [
  TAB_OVERVIEW,
  TAB_VULNERABILITIES,
  TAB_COMPLIANCE,
  TAB_CONFIG,
  TAB_JSON,
  TAB_LOG,
  TAB_HISTORY,
];

/** SEO（搜索引擎优化分析） */
const SEO_TABS: TabDef[] = [
  TAB_OVERVIEW,
  TAB_DETAILS,
  TAB_CHART,
  TAB_CONFIG,
  TAB_JSON,
  TAB_LOG,
  TAB_HISTORY,
];

/** API（REST API 接口测试） */
const API_TABS: TabDef[] = [TAB_OVERVIEW, TAB_CHART, TAB_CONFIG, TAB_JSON, TAB_LOG, TAB_HISTORY];

/** 压力（并发压力与负载测试） */
const STRESS_TABS: TabDef[] = [
  TAB_OVERVIEW,
  TAB_CHART,
  TAB_TREND,
  TAB_CONFIG,
  TAB_JSON,
  TAB_LOG,
  TAB_HISTORY,
];

/** 可访问性（WCAG 无障碍检测） */
const ACCESSIBILITY_TABS: TabDef[] = [
  TAB_OVERVIEW,
  TAB_DETAILS,
  TAB_CHART,
  TAB_CONFIG,
  TAB_JSON,
  TAB_LOG,
  TAB_HISTORY,
];

/** 兼容性（跨浏览器兼容性） */
const COMPATIBILITY_TABS: TabDef[] = [
  TAB_OVERVIEW,
  TAB_DETAILS,
  TAB_CHART,
  TAB_CONFIG,
  TAB_JSON,
  TAB_LOG,
  TAB_HISTORY,
];

/** 体验（用户体验与核心指标） */
const UX_TABS: TabDef[] = [
  TAB_OVERVIEW,
  TAB_DETAILS,
  TAB_CHART,
  TAB_TREND,
  TAB_CONFIG,
  TAB_JSON,
  TAB_LOG,
  TAB_HISTORY,
];

/** 根据测试类型获取标签页列表 */
export function getTabsForTestType(testType: string): TabDef[] {
  const normalized = testType.toLowerCase().trim();
  switch (normalized) {
    case 'website':
    case 'full':
    case 'comprehensive':
      return WEBSITE_TABS;
    case 'performance':
      return PERFORMANCE_TABS;
    case 'security':
      return SECURITY_TABS;
    case 'seo':
      return SEO_TABS;
    case 'api':
    case 'rest':
      return API_TABS;
    case 'stress':
    case 'load':
      return STRESS_TABS;
    case 'accessibility':
    case 'a11y':
      return ACCESSIBILITY_TABS;
    case 'compatibility':
    case 'compat':
      return COMPATIBILITY_TABS;
    case 'ux':
    case 'experience':
      return UX_TABS;
    default:
      return WEBSITE_TABS;
  }
}
