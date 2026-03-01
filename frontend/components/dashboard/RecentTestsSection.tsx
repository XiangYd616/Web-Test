/**
 * 最近测试卡片区 — 横向可滚动 + 大卡片（320-380px × 200px）
 *
 * 单张卡片结构（从上到下）：
 * 1. 顶部一行：类型图标 + URL 缩写 + 时间戳
 * 2. 中间核心：大分数圆环（80-100px）+ 状态标签
 * 3. 底部操作：重新运行 | 查看报告 | 小指标预览
 */

import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Eye,
  FlaskConical,
  Globe,
  Layers,
  MoreHorizontal,
  RotateCcw,
  Search,
  Shield,
  Smartphone,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { type HistoryItem, type TestType, TEST_TYPE_LABELS } from '../../context/TestContext';
import { formatRelativeTime } from '../../utils/date';
import ScoreRing from './ScoreRing';

/** 每种测试类型对应的图标和颜色 */
const TYPE_ICON_MAP: Record<
  TestType,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  performance: { icon: Zap, color: '#f97316' },
  security: { icon: Shield, color: '#ef4444' },
  seo: { icon: Search, color: '#22c55e' },
  compatibility: { icon: Smartphone, color: '#8b5cf6' },
  accessibility: { icon: Eye, color: '#3b82f6' },
  ux: { icon: Globe, color: '#ec4899' },
  website: { icon: Globe, color: '#06b6d4' },
  stress: { icon: Layers, color: '#eab308' },
  api: { icon: Globe, color: '#6366f1' },
};

type Props = {
  items: HistoryItem[];
  onRerun?: (item: HistoryItem) => void;
};

/** 获取状态标签样式（文本通过 i18n 在组件内获取） */
const STATUS_CLS: Record<string, string> = {
  completed: 'is-ok',
  failed: 'is-fail',
  running: 'is-running',
  timeout: 'is-fail',
  cancelled: 'is-fail',
  pending: '',
  stopped: 'is-fail',
};

const RecentTestsSection = ({ items, onRerun }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  /* ── 空状态 ── */
  if (items.length === 0) {
    return (
      <section className='tw-recent'>
        <h2 className='tw-recent-title'>{t('dashboard.recentTests', '最近测试')}</h2>
        <div className='tw-recent-empty'>
          <div className='tw-recent-empty-icon'>
            <FlaskConical className='w-10 h-10' />
          </div>
          <h3 className='tw-recent-empty-heading'>
            {t('dashboard.emptyTitle', '还没有测试记录？')}
          </h3>
          <p className='tw-recent-empty-desc'>
            {t('dashboard.emptyDesc', '试试在上方输入一个 URL 开始你的第一次测试吧！')}
          </p>
          <button
            type='button'
            className='tw-recent-empty-btn'
            onClick={() => {
              const input = document.querySelector<HTMLInputElement>('.tw-topbar-url-input');
              if (input) {
                input.focus();
                input.select();
              }
            }}
          >
            {t('dashboard.trySample', '试试示例测试')}
          </button>
        </div>
      </section>
    );
  }

  /* ── 卡片列表 ── */
  return (
    <section className='tw-recent'>
      <div className='tw-recent-header'>
        <h2 className='tw-recent-title'>{t('dashboard.recentTests', '最近测试')}</h2>
        <button type='button' className='tw-recent-view-all' onClick={() => navigate('/history')}>
          {t('dashboard.viewAll', '查看全部')} <ArrowRight className='w-3 h-3' />
        </button>
      </div>

      <div className='tw-recent-scroll'>
        {items.slice(0, 6).map(item => {
          const typeDef = TYPE_ICON_MAP[item.type] || TYPE_ICON_MAP.performance;
          const TypeIcon = typeDef.icon;
          const typeLabel = t(TEST_TYPE_LABELS[item.type] || item.type);
          const hasScore = item.score != null && Number.isFinite(item.score);
          const statusCls = STATUS_CLS[item.status || ''] || '';
          const statusText = item.status ? t(`status.${item.status}`, item.status) : '';
          const shortUrl = item.url.replace(/^https?:\/\//, '').replace(/\/$/, '');

          return (
            <div
              key={item.id}
              className='tw-rcard'
              onClick={() => navigate(`/history/${item.id}`)}
              role='button'
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && navigate(`/history/${item.id}`)}
            >
              {/* ── 顶部一行：类型图标 + URL + 时间 ── */}
              <div className='tw-rcard-top'>
                <span
                  className='tw-rcard-type-icon'
                  style={{ color: typeDef.color, background: `${typeDef.color}15` }}
                >
                  <TypeIcon className='w-4 h-4' />
                </span>
                <span className='tw-rcard-url' title={item.url}>
                  {shortUrl}
                </span>
                <span className='tw-rcard-time'>
                  {item.createdAt ? formatRelativeTime(item.createdAt) : ''}
                </span>
              </div>

              {/* ── 中间核心：大分数圆环 + 状态 ── */}
              <div className='tw-rcard-center'>
                {hasScore ? (
                  <ScoreRing score={item.score ?? 0} size={88} strokeWidth={6} showMax glow />
                ) : (
                  <div className='tw-rcard-noscore'>
                    {item.status === 'failed' ? (
                      <AlertTriangle className='w-8 h-8 text-red-400' />
                    ) : (
                      <span className='tw-rcard-noscore-dash'>—</span>
                    )}
                  </div>
                )}
                <div className='tw-rcard-tags'>
                  <span className='tw-rcard-type-tag' style={{ color: typeDef.color }}>
                    {typeLabel}
                  </span>
                  {statusText && (
                    <span className={`tw-rcard-status ${statusCls}`}>{statusText}</span>
                  )}
                </div>
              </div>

              {/* ── 底部：操作按钮 + 指标预览 ── */}
              <div className='tw-rcard-bottom'>
                <div className='tw-rcard-metrics'>
                  {item.duration != null && Number.isFinite(item.duration) && (
                    <span className='tw-rcard-metric'>
                      <Clock className='w-3 h-3' />
                      {(item.duration / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
                <div className='tw-rcard-actions'>
                  {onRerun && (
                    <button
                      type='button'
                      className='tw-rcard-action tw-rcard-action--rerun'
                      onClick={e => {
                        e.stopPropagation();
                        onRerun(item);
                      }}
                      title={t('dashboard.rerun', '重新运行')}
                    >
                      <RotateCcw className='w-3.5 h-3.5' />
                      <span>{t('dashboard.rerun', '重新运行')}</span>
                    </button>
                  )}
                  <button
                    type='button'
                    className='tw-rcard-action'
                    onClick={e => {
                      e.stopPropagation();
                      navigate(`/history/${item.id}`);
                    }}
                    title={t('dashboard.viewReport', '查看报告')}
                  >
                    <ArrowRight className='w-3.5 h-3.5' />
                  </button>
                  <button
                    type='button'
                    className='tw-rcard-action'
                    onClick={e => {
                      e.stopPropagation();
                      void navigator.clipboard.writeText(item.url);
                    }}
                    title={t('dashboard.copyUrl', '复制 URL')}
                  >
                    <MoreHorizontal className='w-3.5 h-3.5' />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default RecentTestsSection;
