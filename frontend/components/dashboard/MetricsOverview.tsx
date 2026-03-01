/**
 * 核心指标概览区 — 6 张 Lighthouse / DebugBear 风格大卡片
 *
 * 1. 整体性能分    — 大圆环 88/100，绿>80 橙50-79 红<50
 * 2. Core Web Vitals — 3 个小圆环（LCP/FID/CLS 模拟）
 * 3. SEO 健康度     — 圆环 92%
 * 4. 可访问性得分   — 圆环 85/100
 * 5. 平均加载时间   — 大数字 1.8s + sparkline
 * 6. 安全风险       — 数字 0 高危 + 子指标
 *
 * 数据来源：从 HistoryItem[] 按 type 聚合计算
 */

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Clock,
  Eye,
  Gauge,
  Search,
  Shield,
  Zap,
} from 'lucide-react';
import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { HistoryItem, HistoryPagination, TestType } from '../../context/TestContext';
import ScoreRing from './ScoreRing';
import Sparkline from './Sparkline';

type Props = {
  items: HistoryItem[];
  pagination: HistoryPagination;
};

/* ── 辅助：按类型筛选已完成的带分数记录 ── */
const byType = (items: HistoryItem[], ...types: TestType[]) =>
  items.filter(
    i =>
      i.status === 'completed' &&
      types.includes(i.type) &&
      i.score != null &&
      Number.isFinite(i.score)
  );

const avg = (arr: number[]) =>
  arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

/* ── 趋势变化计算：最近 vs 之前 ── */
const calcTrend = (
  scores: number[]
): { delta: number; direction: 'up' | 'down' | 'flat' } | null => {
  if (scores.length < 2) return null;
  const mid = Math.floor(scores.length / 2);
  const recent = avg(scores.slice(0, mid)) ?? 0;
  const older = avg(scores.slice(mid)) ?? 0;
  const delta = recent - older;
  if (Math.abs(delta) < 0.5) return { delta: 0, direction: 'flat' };
  return { delta, direction: delta > 0 ? 'up' : 'down' };
};

/* ── 卡片定义 ── */
type CardDef = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  label: string;
  route: string;
  render: () => ReactNode;
  subMetrics?: () => ReactNode;
  sparkData?: number[];
  sparkColor?: string;
};

const MetricsOverview = ({ items, pagination }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const completed = items.filter(i => i.status === 'completed');

    // 整体
    const allScores = completed.filter(i => i.score != null).map(i => i.score ?? 0);
    const overallAvg = pagination.avgScore != null ? pagination.avgScore : avg(allScores);

    // 按类型
    const perfItems = byType(items, 'performance');
    const seoItems = byType(items, 'seo');
    const a11yItems = byType(items, 'accessibility');
    const secItems = byType(items, 'security');

    const perfScores = perfItems.map(i => i.score ?? 0);
    const seoScores = seoItems.map(i => i.score ?? 0);
    const a11yScores = a11yItems.map(i => i.score ?? 0);
    const secScores = secItems.map(i => i.score ?? 0);

    // 加载时间
    const withDuration = completed.filter(i => i.duration != null && Number.isFinite(i.duration));
    const durations = withDuration.map(i => i.duration ?? 0);
    const avgDuration = pagination.avgDuration != null ? pagination.avgDuration : avg(durations);

    // 安全风险（失败的安全测试数）
    const secFailed = items.filter(i => i.type === 'security' && i.status === 'failed').length;
    const secLowScore = secItems.filter(i => (i.score ?? 100) < 50).length;

    // 总测试数
    const totalTests = pagination.total || items.length;

    return {
      overallAvg,
      perfScores,
      seoScores,
      a11yScores,
      secScores,
      avgDuration,
      durations,
      secFailed,
      secLowScore,
      totalTests,
    };
  }, [items, pagination]);

  if (stats.totalTests === 0) {
    return (
      <section className='tw-metrics'>
        <h2 className='tw-metrics-title'>{t('dashboard.metricsTitle', '核心指标概览')}</h2>
        <div className='flex flex-col items-center justify-center py-10 text-center text-muted-foreground gap-2'>
          <Gauge className='h-8 w-8 opacity-20' />
          <p className='text-sm font-medium'>
            {t('dashboard.metricsEmpty', '运行你的第一个测试来查看指标数据')}
          </p>
        </div>
      </section>
    );
  }

  /* ── 6 张卡片配置 ── */
  const cards: CardDef[] = [
    // 1. 整体性能分
    {
      id: 'perf',
      icon: Gauge,
      iconColor: '#f97316',
      label: t('dashboard.metricPerf', '整体性能分'),
      route: '/history?type=performance',
      sparkData: stats.perfScores.slice(0, 7).reverse(),
      sparkColor: '#f97316',
      render: () => {
        const score = avg(stats.perfScores);
        return score != null ? (
          <ScoreRing score={score} size={100} strokeWidth={7} showMax glow />
        ) : (
          <span className='tw-mc-na'>N/A</span>
        );
      },
      subMetrics: () => {
        const trend = calcTrend(stats.perfScores);
        return (
          <>
            {stats.perfScores.length > 0 && (
              <span className='tw-mc-sub'>
                {t('dashboard.metricTests', '{{count}} 次测试', { count: stats.perfScores.length })}
              </span>
            )}
            {trend && trend.direction !== 'flat' && (
              <span className={`tw-mc-trend ${trend.direction === 'up' ? 'is-up' : 'is-down'}`}>
                {trend.direction === 'up' ? (
                  <ArrowUp className='w-3 h-3' />
                ) : (
                  <ArrowDown className='w-3 h-3' />
                )}
                {Math.abs(trend.delta).toFixed(1)}
              </span>
            )}
          </>
        );
      },
    },
    // 2. 测试总览
    {
      id: 'overview',
      icon: Zap,
      iconColor: '#22c55e',
      label: t('dashboard.metricOverview', '测试总览'),
      route: '/history',
      render: () => {
        if (stats.overallAvg == null) return <span className='tw-mc-na'>N/A</span>;
        return <ScoreRing score={stats.overallAvg} size={100} strokeWidth={7} showMax glow />;
      },
      subMetrics: () => {
        const completed = items.filter(i => i.status === 'completed').length;
        const failed = items.filter(i => i.status === 'failed').length;
        return (
          <>
            <span className='tw-mc-sub'>
              {t('dashboard.metricTotal', '共 {{count}} 次', { count: stats.totalTests })}
            </span>
            {completed > 0 && (
              <span className='tw-mc-sub' style={{ color: '#22c55e' }}>
                {t('dashboard.metricPassed', '{{count}} 通过', { count: completed })}
              </span>
            )}
            {failed > 0 && (
              <span className='tw-mc-sub' style={{ color: '#ef4444' }}>
                {t('dashboard.metricFailed2', '{{count}} 失败', { count: failed })}
              </span>
            )}
          </>
        );
      },
    },
    // 3. SEO 健康度
    {
      id: 'seo',
      icon: Search,
      iconColor: '#22c55e',
      label: t('dashboard.metricSeo', 'SEO 健康度'),
      route: '/history?type=seo',
      sparkData: stats.seoScores.slice(0, 7).reverse(),
      sparkColor: '#22c55e',
      render: () => {
        const score = avg(stats.seoScores);
        return score != null ? (
          <ScoreRing score={score} size={100} strokeWidth={7} showMax glow />
        ) : (
          <span className='tw-mc-na'>N/A</span>
        );
      },
      subMetrics: () => {
        const trend = calcTrend(stats.seoScores);
        return (
          <>
            {stats.seoScores.length > 0 && (
              <span className='tw-mc-sub'>
                {t('dashboard.metricTests', '{{count}} 次测试', { count: stats.seoScores.length })}
              </span>
            )}
            {trend && trend.direction !== 'flat' && (
              <span className={`tw-mc-trend ${trend.direction === 'up' ? 'is-up' : 'is-down'}`}>
                {trend.direction === 'up' ? (
                  <ArrowUp className='w-3 h-3' />
                ) : (
                  <ArrowDown className='w-3 h-3' />
                )}
                {Math.abs(trend.delta).toFixed(1)}%
              </span>
            )}
          </>
        );
      },
    },
    // 4. 可访问性得分
    {
      id: 'a11y',
      icon: Eye,
      iconColor: '#3b82f6',
      label: t('dashboard.metricA11y', '可访问性得分'),
      route: '/history?type=accessibility',
      sparkData: stats.a11yScores.slice(0, 7).reverse(),
      sparkColor: '#3b82f6',
      render: () => {
        const score = avg(stats.a11yScores);
        return score != null ? (
          <ScoreRing score={score} size={100} strokeWidth={7} showMax glow />
        ) : (
          <span className='tw-mc-na'>N/A</span>
        );
      },
      subMetrics: () => {
        const trend = calcTrend(stats.a11yScores);
        return (
          <>
            {stats.a11yScores.length > 0 && (
              <span className='tw-mc-sub'>
                {t('dashboard.metricTests', '{{count}} 次测试', { count: stats.a11yScores.length })}
              </span>
            )}
            {trend && trend.direction !== 'flat' && (
              <span className={`tw-mc-trend ${trend.direction === 'up' ? 'is-up' : 'is-down'}`}>
                {trend.direction === 'up' ? (
                  <ArrowUp className='w-3 h-3' />
                ) : (
                  <ArrowDown className='w-3 h-3' />
                )}
                {Math.abs(trend.delta).toFixed(1)}
              </span>
            )}
          </>
        );
      },
    },
    // 5. 平均加载时间
    {
      id: 'loadTime',
      icon: Clock,
      iconColor: '#a855f7',
      label: t('dashboard.metricLoadTime', '平均加载时间'),
      route: '/history',
      sparkData: stats.durations
        .slice(0, 7)
        .reverse()
        .map(d => d / 1000),
      sparkColor: '#a855f7',
      render: () => {
        if (stats.avgDuration == null) return <span className='tw-mc-na'>N/A</span>;
        const secs = stats.avgDuration / 1000;
        const colorClass = secs < 2 ? 'is-good' : secs < 4 ? 'is-warn' : 'is-poor';
        return (
          <div className={`tw-mc-bignum ${colorClass}`}>
            <span className='tw-mc-bignum-val'>{secs.toFixed(1)}</span>
            <span className='tw-mc-bignum-unit'>s</span>
          </div>
        );
      },
      subMetrics: () => {
        const trend = calcTrend(stats.durations);
        return (
          <>
            <span className='tw-mc-sub'>
              {t('dashboard.metricTests', '{{count}} 次测试', { count: stats.durations.length })}
            </span>
            {trend && trend.direction !== 'flat' && (
              <span className={`tw-mc-trend ${trend.direction === 'down' ? 'is-up' : 'is-down'}`}>
                {trend.direction === 'down' ? (
                  <ArrowDown className='w-3 h-3' />
                ) : (
                  <ArrowUp className='w-3 h-3' />
                )}
                {Math.abs(trend.delta / 1000).toFixed(1)}s
              </span>
            )}
          </>
        );
      },
    },
    // 6. 安全风险
    {
      id: 'security',
      icon: Shield,
      iconColor: '#ef4444',
      label: t('dashboard.metricSecurity', '安全风险'),
      route: '/history?type=security',
      sparkData: stats.secScores.slice(0, 7).reverse(),
      sparkColor: '#ef4444',
      render: () => {
        const highRisk = stats.secFailed + stats.secLowScore;
        const secAvg = avg(stats.secScores);

        if (secAvg != null) {
          return <ScoreRing score={secAvg} size={100} strokeWidth={7} showMax glow />;
        }
        // 无安全测试数据时显示风险计数
        const colorClass = highRisk === 0 ? 'is-good' : highRisk <= 2 ? 'is-warn' : 'is-poor';
        return (
          <div className={`tw-mc-bignum ${colorClass}`}>
            <span className='tw-mc-bignum-val'>{highRisk}</span>
            <span className='tw-mc-bignum-unit'>{t('dashboard.metricHighRisk', '高危')}</span>
          </div>
        );
      },
      subMetrics: () => (
        <>
          {stats.secScores.length > 0 && (
            <span className='tw-mc-sub'>
              {t('dashboard.metricTests', '{{count}} 次测试', { count: stats.secScores.length })}
            </span>
          )}
          <span className='tw-mc-sub'>
            {t('dashboard.metricFailed', '失败: {{count}}', { count: stats.secFailed })}
          </span>
        </>
      ),
    },
  ];

  return (
    <section className='tw-metrics'>
      <h2 className='tw-metrics-title'>{t('dashboard.metricsTitle', '核心指标概览')}</h2>
      <div className='tw-metrics-grid'>
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className='tw-mc'
              onClick={() => navigate(card.route)}
              role='button'
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && navigate(card.route)}
            >
              {/* 顶部：图标 + 标题 */}
              <div className='tw-mc-head'>
                <span
                  className='tw-mc-icon'
                  style={{ color: card.iconColor, background: `${card.iconColor}12` }}
                >
                  <Icon className='w-4 h-4' />
                </span>
                <span className='tw-mc-label'>{card.label}</span>
              </div>

              {/* 中心：大值区 */}
              <div className='tw-mc-body'>{card.render()}</div>

              {/* 子指标 + Sparkline */}
              <div className='tw-mc-footer'>
                <div className='tw-mc-subs'>{card.subMetrics?.()}</div>
                {card.sparkData && card.sparkData.length >= 2 && (
                  <Sparkline
                    data={card.sparkData}
                    width={80}
                    height={28}
                    color={card.sparkColor}
                    className='tw-mc-sparkline'
                  />
                )}
              </div>

              {/* 底部：查看详情 */}
              <div className='tw-mc-link'>
                <span>{t('dashboard.viewDetails', '查看详情')}</span>
                <ArrowRight className='w-3 h-3' />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default MetricsOverview;
