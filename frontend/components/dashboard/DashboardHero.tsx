/**
 * Dashboard 英雄区 — 引导区 + 测试类型芯片 + 快捷模式
 * URL 输入统一使用顶栏（AppLayout），此处不再重复放置输入框
 */

import { Activity, Eye, Globe, Layers, Play, Search, Shield, Smartphone, Zap } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type TestType, TEST_TYPE_LABELS, useTestConfig } from '../../context/TestContext';

type ChipDef = {
  type: TestType;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

const CHIPS: ChipDef[] = [
  { type: 'performance', icon: Zap, color: '#f97316' },
  { type: 'security', icon: Shield, color: '#ef4444' },
  { type: 'seo', icon: Search, color: '#22c55e' },
  { type: 'compatibility', icon: Smartphone, color: '#8b5cf6' },
  { type: 'accessibility', icon: Eye, color: '#3b82f6' },
  { type: 'ux', icon: Activity, color: '#ec4899' },
  { type: 'website', icon: Globe, color: '#06b6d4' },
  { type: 'stress', icon: Layers, color: '#eab308' },
];

type QuickMode = 'fast' | 'quality' | 'last';

type Props = {
  onStartTest: (urls: string[], types: TestType[], mode: QuickMode) => void;
};

/** 聚焦顶栏 URL 输入框 */
const focusTopbarUrl = () => {
  const input = document.querySelector<HTMLInputElement>('.tw-topbar-url-input');
  if (input) {
    input.focus();
    input.select();
  }
};

const DashboardHero = ({ onStartTest }: Props) => {
  const { t } = useTranslation();
  const { url, selectedType, selectTestType } = useTestConfig();

  const [selectedTypes, setSelectedTypes] = useState<TestType[]>([selectedType]);
  const [quickMode, setQuickMode] = useState<QuickMode>('fast');

  const toggleType = useCallback(
    (type: TestType, e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        setSelectedTypes(prev =>
          prev.includes(type)
            ? prev.length > 1
              ? prev.filter(t => t !== type)
              : prev
            : [...prev, type]
        );
      } else {
        setSelectedTypes([type]);
        selectTestType(type);
      }
    },
    [selectTestType]
  );

  const handleStart = useCallback(() => {
    const trimmed = (url || '').trim();
    if (!trimmed) {
      focusTopbarUrl();
      return;
    }
    onStartTest([trimmed], selectedTypes, quickMode);
  }, [url, selectedTypes, quickMode, onStartTest]);

  return (
    <section className='tw-hero'>
      {/* 标题 */}
      <div className='tw-hero-heading'>
        <h1 className='tw-hero-title'>{t('dashboard.heroTitle', 'Web 性能 & 安全测试')}</h1>
        <p className='tw-hero-subtitle'>
          {t('dashboard.heroSubtitle', '输入 URL，选择测试类型，一键获取专业级诊断报告')}
        </p>
      </div>

      {/* CTA 按钮 — 聚焦顶栏 URL 输入框或直接运行 */}
      <div className='tw-hero-cta-row'>
        {url ? (
          <button type='button' className='tw-hero-start-btn' onClick={handleStart}>
            <Play className='w-5 h-5' />
            <span>{t('dashboard.startTest', '开始测试')}</span>
          </button>
        ) : (
          <button type='button' className='tw-hero-focus-btn' onClick={focusTopbarUrl}>
            <Search className='w-4 h-4' />
            <span>{t('dashboard.enterUrl', '输入 URL 开始测试')}</span>
            <kbd className='tw-hero-kbd'>Ctrl+L</kbd>
          </button>
        )}
      </div>

      {/* 测试类型芯片 */}
      <div className='tw-hero-chips'>
        {CHIPS.map(chip => {
          const Icon = chip.icon;
          const active = selectedTypes.includes(chip.type);
          return (
            <button
              key={chip.type}
              type='button'
              className={`tw-hero-chip${active ? ' is-active' : ''}`}
              style={active ? ({ '--chip-color': chip.color } as React.CSSProperties) : undefined}
              onClick={e => toggleType(chip.type, e)}
              title={t('dashboard.ctrlMultiSelect', 'Ctrl+点击多选')}
            >
              <Icon className='w-3.5 h-3.5' />
              <span>{t(TEST_TYPE_LABELS[chip.type])}</span>
            </button>
          );
        })}
      </div>

      {/* 快捷模式 */}
      <div className='tw-hero-modes'>
        {[
          { id: 'fast' as QuickMode, label: t('dashboard.modeFast', '快速模式') },
          { id: 'quality' as QuickMode, label: t('dashboard.modeQuality', '高质量模式') },
          { id: 'last' as QuickMode, label: t('dashboard.modeLast', '使用上次配置') },
        ].map(m => (
          <button
            key={m.id}
            type='button'
            className={`tw-hero-mode${quickMode === m.id ? ' is-active' : ''}`}
            onClick={() => setQuickMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
    </section>
  );
};

export default DashboardHero;
