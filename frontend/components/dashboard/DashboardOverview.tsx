/**
 * 控制台总览仪表板
 *
 * "控制台"标签的默认内容：
 * - 9 种测试类型快速入口（卡片网格）
 * - 最近测试历史（跨类型）
 * - 统计摘要（总数、平均分、类型分布）
 */

import {
  Activity,
  ArrowRight,
  Clock,
  Eye,
  FileText,
  Globe,
  Layers,
  Search,
  Shield,
  Smartphone,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { type HistoryItem, type TestType, useTestHistory } from '../../context/TestContext';

/* ── 测试类型配置 ── */

type TypeMeta = {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  bg: string;
  labelKey: string;
  descKey: string;
};

const TYPE_META: Record<TestType, TypeMeta> = {
  performance: {
    icon: Zap,
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    labelKey: 'testType.performance',
    descKey: 'overview.perfDesc',
  },
  security: {
    icon: Shield,
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    labelKey: 'testType.security',
    descKey: 'overview.secDesc',
  },
  seo: {
    icon: Search,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    labelKey: 'testType.seo',
    descKey: 'overview.seoDesc',
  },
  api: {
    icon: FileText,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
    labelKey: 'testType.api',
    descKey: 'overview.apiDesc',
  },
  stress: {
    icon: Layers,
    color: '#eab308',
    bg: 'rgba(234,179,8,0.08)',
    labelKey: 'testType.stress',
    descKey: 'overview.stressDesc',
  },
  accessibility: {
    icon: Eye,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    labelKey: 'testType.accessibility',
    descKey: 'overview.a11yDesc',
  },
  compatibility: {
    icon: Smartphone,
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.08)',
    labelKey: 'testType.compatibility',
    descKey: 'overview.compatDesc',
  },
  ux: {
    icon: Activity,
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.08)',
    labelKey: 'testType.ux',
    descKey: 'overview.uxDesc',
  },
  website: {
    icon: Globe,
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.08)',
    labelKey: 'testType.website',
    descKey: 'overview.webDesc',
  },
};

const TYPE_ORDER: TestType[] = [
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

const DESC_FALLBACKS: Record<string, string> = {
  'overview.perfDesc': 'Core Web Vitals · 加载速度 · 资源分析',
  'overview.secDesc': 'OWASP Top10 · SSL/TLS · 安全头',
  'overview.seoDesc': 'Meta 标签 · 结构化数据 · 可索引性',
  'overview.apiDesc': '请求/响应 · 状态码 · 延迟',
  'overview.stressDesc': '并发 · 吞吐量 · 稳定性',
  'overview.a11yDesc': 'WCAG 2.1 · ARIA · 键盘导航',
  'overview.compatDesc': '多浏览器 · 多设备 · 响应式',
  'overview.uxDesc': '交互体验 · 视觉稳定 · 可用性',
  'overview.webDesc': '综合健康度 · 全站扫描',
};

/* ── 辅助函数 ── */

function formatRelativeTime(
  dateStr: string | undefined,
  t: (k: string, d: string) => string
): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('time.justNow', '刚刚');
  if (mins < 60) return `${mins} ${t('time.minutesAgo', '分钟前')}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${t('time.hoursAgo', '小时前')}`;
  const days = Math.floor(hours / 24);
  return `${days} ${t('time.daysAgo', '天前')}`;
}

function scoreColor(score: number | undefined): string {
  if (!score) return 'var(--muted-foreground)';
  if (score >= 90) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

/* ── 组件 ── */

const DashboardOverview: React.FC = () => {
  const { t } = useTranslation();
  const { history } = useTestHistory();

  // 统计
  const stats = useMemo(() => {
    const total = history.length;
    const withScore = history.filter(h => typeof h.score === 'number' && h.score > 0);
    const avgScore =
      withScore.length > 0
        ? Math.round(withScore.reduce((s, h) => s + (h.score ?? 0), 0) / withScore.length)
        : 0;
    const byType: Partial<Record<TestType, number>> = {};
    for (const h of history) {
      byType[h.type] = (byType[h.type] ?? 0) + 1;
    }
    return { total, avgScore, byType };
  }, [history]);

  // 最近 8 条历史
  const recentHistory = useMemo(() => {
    return [...history]
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 8);
  }, [history]);

  // 点击测试类型卡片 → 创建新标签
  const handleTypeClick = (type: TestType) => {
    window.dispatchEvent(new CustomEvent('tw:create-test-tab', { detail: type }));
  };

  // 点击历史条目 → 查看详情
  const handleHistoryClick = (item: HistoryItem) => {
    window.dispatchEvent(new CustomEvent('tw:view-history', { detail: item.id }));
  };

  return (
    <div className='tw-overview'>
      {/* ── 统计摘要 ── */}
      <div className='tw-overview-stats'>
        <div className='tw-overview-stat-card'>
          <span className='tw-overview-stat-value'>{stats.total}</span>
          <span className='tw-overview-stat-label'>{t('overview.totalTests', '总测试')}</span>
        </div>
        <div className='tw-overview-stat-card'>
          <span className='tw-overview-stat-value' style={{ color: scoreColor(stats.avgScore) }}>
            {stats.avgScore > 0 ? stats.avgScore : '—'}
          </span>
          <span className='tw-overview-stat-label'>{t('overview.avgScore', '平均分')}</span>
        </div>
        <div className='tw-overview-stat-card'>
          <span className='tw-overview-stat-value'>{Object.keys(stats.byType).length}</span>
          <span className='tw-overview-stat-label'>{t('overview.testedTypes', '已测类型')}</span>
        </div>
        <div className='tw-overview-stat-card'>
          <span className='tw-overview-stat-value'>
            {history.filter(h => h.status === 'completed' && (h.score ?? 0) >= 90).length}
          </span>
          <span className='tw-overview-stat-label'>{t('overview.excellentCount', '优秀')}</span>
        </div>
      </div>

      {/* ── 测试类型入口 ── */}
      <div className='tw-overview-section'>
        <h3 className='tw-overview-section-title'>{t('overview.quickStart', '快速开始')}</h3>
        <div className='tw-overview-type-grid'>
          {TYPE_ORDER.map(type => {
            const meta = TYPE_META[type];
            const Icon = meta.icon;
            const count = stats.byType[type] ?? 0;
            return (
              <button
                key={type}
                type='button'
                className='tw-overview-type-card'
                onClick={() => handleTypeClick(type)}
              >
                <div className='tw-overview-type-icon' style={{ background: meta.bg }}>
                  <Icon className='w-5 h-5' style={{ color: meta.color }} />
                </div>
                <div className='tw-overview-type-info'>
                  <span className='tw-overview-type-name'>{t(meta.labelKey)}</span>
                  <span className='tw-overview-type-desc'>
                    {t(meta.descKey, DESC_FALLBACKS[meta.descKey] ?? '')}
                  </span>
                </div>
                {count > 0 && (
                  <span className='tw-overview-type-badge' style={{ color: meta.color }}>
                    {count}
                  </span>
                )}
                <ArrowRight className='w-3.5 h-3.5 tw-overview-type-arrow' />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 最近测试 ── */}
      {recentHistory.length > 0 && (
        <div className='tw-overview-section'>
          <h3 className='tw-overview-section-title'>
            <Clock className='w-3.5 h-3.5' />
            {t('overview.recentTests', '最近测试')}
          </h3>
          <div className='tw-overview-history'>
            {recentHistory.map(item => {
              const meta = TYPE_META[item.type];
              const Icon = meta?.icon ?? Globe;
              return (
                <button
                  key={item.id}
                  type='button'
                  className='tw-overview-history-item'
                  onClick={() => handleHistoryClick(item)}
                >
                  <Icon
                    className='w-3.5 h-3.5 flex-shrink-0'
                    style={{ color: meta?.color ?? '#888' }}
                  />
                  <span className='tw-overview-history-url'>{item.url || item.label}</span>
                  <span className='tw-overview-history-type'>{t(meta?.labelKey ?? '')}</span>
                  {typeof item.score === 'number' && item.score > 0 && (
                    <span
                      className='tw-overview-history-score'
                      style={{ color: scoreColor(item.score) }}
                    >
                      {item.score}
                    </span>
                  )}
                  <span className='tw-overview-history-time'>
                    {formatRelativeTime(item.createdAt, t)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 类型分布 ── */}
      {stats.total > 0 && (
        <div className='tw-overview-section'>
          <h3 className='tw-overview-section-title'>
            {t('overview.typeDistribution', '类型分布')}
          </h3>
          <div className='tw-overview-distribution'>
            {TYPE_ORDER.filter(type => (stats.byType[type] ?? 0) > 0).map(type => {
              const meta = TYPE_META[type];
              const count = stats.byType[type] ?? 0;
              const pct = Math.round((count / stats.total) * 100);
              return (
                <div key={type} className='tw-overview-dist-row'>
                  <span className='tw-overview-dist-label'>{t(meta.labelKey)}</span>
                  <div className='tw-overview-dist-bar-bg'>
                    <div
                      className='tw-overview-dist-bar'
                      style={{ width: `${pct}%`, background: meta.color }}
                    />
                  </div>
                  <span className='tw-overview-dist-count'>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;
