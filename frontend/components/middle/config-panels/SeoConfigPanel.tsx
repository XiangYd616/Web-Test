import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import i18n from '@/i18n';
import { Zap } from 'lucide-react';
import { ChangeEvent, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigField } from '../config-ui/ConfigField';
import { ConfigSection } from '../config-ui/ConfigSection';
import { NumberInput } from '../config-ui/NumberInput';
import { WarningTip } from '../config-ui/WarningTip';

/* ---------- 快捷预设 ---------- */
const PRESETS = [
  {
    name: '快速检查',
    description: '仅 SEO 核心 + 移动端，快速验证基本 SEO',
    options: {
      timeout: 15000,
      checkSEO: true,
      checkMobile: true,
      checkBestPractices: false,
      checkPerformance: false,
      checkAccessibility: false,
      checkPWA: false,
    },
  },
  {
    name: '标准 SEO',
    description: '核心 + 最佳实践 + 移动端 + 内容质量',
    options: {
      timeout: 30000,
      checkSEO: true,
      checkMobile: true,
      checkBestPractices: true,
      checkPerformance: true,
      checkAccessibility: false,
      checkPWA: false,
    },
  },
  {
    name: '深度分析',
    description: '全部 6 项检查，最全面的 SEO 审计',
    options: {
      timeout: 60000,
      checkSEO: true,
      checkMobile: true,
      checkBestPractices: true,
      checkPerformance: true,
      checkAccessibility: true,
      checkPWA: true,
    },
  },
  {
    name: '移动优先',
    description: '移动端 + 内容质量 + PWA，侧重移动体验',
    options: {
      timeout: 30000,
      checkSEO: true,
      checkMobile: true,
      checkBestPractices: false,
      checkPerformance: true,
      checkAccessibility: false,
      checkPWA: true,
    },
  },
];

interface SeoConfigPanelProps {
  options: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

export const SeoConfigPanel = ({ options, onChange }: SeoConfigPanelProps) => {
  const { t } = useTranslation();
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const applyPreset = useCallback(
    (preset: (typeof PRESETS)[number]) => {
      setActivePreset(preset.name);
      onChange(preset.options);
    },
    [onChange]
  );

  const userChange = useCallback(
    (patch: Record<string, unknown>) => {
      setActivePreset(null);
      onChange(patch);
    },
    [onChange]
  );

  return (
    <ConfigSection title={t('editor.seoPanelTitle', 'SEO 设置')}>
      <div className='space-y-6'>
        {/* 快捷预设 */}
        <div className='flex items-center gap-1.5 flex-wrap'>
          <Zap className='h-3.5 w-3.5 text-amber-500 shrink-0' />
          {PRESETS.map(preset => (
            <button
              key={preset.name}
              type='button'
              title={preset.description}
              onClick={() => applyPreset(preset)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                activePreset === preset.name
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <ConfigField
            label={t('editor.seoLanguage', '语言')}
            description={t('editor.comingSoon', '(coming soon)')}
          >
            <Input
              value={String(options.language || '')}
              disabled
              placeholder={i18n.language?.split('-')[0] || 'zh'}
              className='opacity-50'
            />
          </ConfigField>

          <ConfigField
            label={t('editor.seoLocale', '地区')}
            description={t('editor.comingSoon', '(coming soon)')}
          >
            <Input
              value={String(options.locale || '')}
              disabled
              placeholder={i18n.language?.split('-')[1] || 'CN'}
              className='opacity-50'
            />
          </ConfigField>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 p-4 bg-muted/20 rounded-lg'>
          <ConfigField
            label={t('editor.seoCheckSEO', 'SEO 核心检测')}
            description='Meta 标签、标题结构、图片、链接、Canonical、Open Graph、Twitter Card、Hreflang、死链检测'
            horizontal
          >
            <Switch
              checked={options.checkSEO !== false}
              onCheckedChange={val => userChange({ checkSEO: val })}
            />
          </ConfigField>

          <ConfigField
            label={t('editor.seoCheckBestPractices', '最佳实践')}
            description='结构化数据、Robots.txt、Sitemap、Favicon、HTTPS 重定向'
            horizontal
          >
            <Switch
              checked={options.checkBestPractices !== false}
              onCheckedChange={val => userChange({ checkBestPractices: val })}
            />
          </ConfigField>

          <ConfigField
            label={t('editor.seoCheckMobile', '移动端优化')}
            description='Viewport、响应式图片、字体可读性、触摸目标间距'
            horizontal
          >
            <Switch
              checked={options.checkMobile !== false}
              onCheckedChange={val => userChange({ checkMobile: val })}
            />
          </ConfigField>

          <ConfigField
            label={t('editor.seoCheckPerformance', '内容质量')}
            description='内容字数、段落可读性、内容丰富度'
            horizontal
          >
            <Switch
              checked={options.checkPerformance !== false}
              onCheckedChange={val => userChange({ checkPerformance: val })}
            />
          </ConfigField>

          <ConfigField
            label={t('editor.seoCheckAccessibility', '可访问性')}
            description='Skip Link、Color-Scheme、HTML lang（SEO 信号轻量检查）'
            horizontal
          >
            <Switch
              checked={options.checkAccessibility !== false}
              onCheckedChange={val => userChange({ checkAccessibility: val })}
            />
          </ConfigField>

          <ConfigField
            label={t('editor.seoCheckPWA', 'PWA')}
            description='Web Manifest、Service Worker、Theme Color'
            horizontal
          >
            <Switch
              checked={Boolean(options.checkPWA)}
              onCheckedChange={val => userChange({ checkPWA: val })}
            />
          </ConfigField>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <ConfigField
            label={t('editor.seoCustomCategories', '自定义检测类别')}
            description={t('editor.seoCustomCategoriesDesc', '英文逗号分隔')}
          >
            <Input
              value={
                Array.isArray(options.customCategories)
                  ? (options.customCategories as string[]).join(', ')
                  : ''
              }
              placeholder='category-a, category-b'
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                userChange({
                  customCategories: e.target.value
                    .split(',')
                    .map(item => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </ConfigField>

          <ConfigField label={t('editor.seoTimeout', '超时时间')}>
            <div className='relative group'>
              <NumberInput
                value={Number(options.timeout ?? 30000)}
                onChange={val => userChange({ timeout: val || 30000 })}
                min={1}
                step={1000}
                unit='ms'
              />
              <WarningTip
                message={
                  Number(options.timeout ?? 30000) > 60000
                    ? t('editor.seoTimeoutWarning', 'SEO 超时 {{val}}ms 较长', {
                        val: Number(options.timeout ?? 30000),
                      })
                    : Number(options.timeout ?? 30000) < 1000 &&
                        Number(options.timeout ?? 30000) > 0
                      ? t('editor.seoTimeoutTooSmall', '超时仅 {{val}}ms，SEO 审计可能来不及完成', {
                          val: Number(options.timeout ?? 30000),
                        })
                      : ''
                }
              />
            </div>
          </ConfigField>
        </div>
      </div>
    </ConfigSection>
  );
};
