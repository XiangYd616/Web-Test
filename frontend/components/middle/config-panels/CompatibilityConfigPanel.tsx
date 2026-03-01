import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Camera, Zap } from 'lucide-react';
import { ChangeEvent, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ElementSelectorTool, { type SelectorEntry } from '../ElementSelectorTool';
import { ConfigField } from '../config-ui/ConfigField';
import { ConfigSection } from '../config-ui/ConfigSection';
import { NumberInput } from '../config-ui/NumberInput';
import { WarningTip } from '../config-ui/WarningTip';

/* ---------- 快捷预设 ---------- */
const PRESETS = [
  {
    name: '快速检查',
    description: '主流浏览器 + Desktop，仅矩阵检测',
    options: {
      browsers: [{ name: 'Chrome' }, { name: 'Safari' }, { name: 'Edge' }],
      devices: [{ name: 'Desktop' }],
      enableMatrix: true,
      featureDetection: false,
      realBrowser: false,
      captureScreenshot: false,
      timeout: 15000,
    },
  },
  {
    name: '标准测试',
    description: '5 浏览器 + 3 设备，矩阵 + 特性检测',
    options: {
      browsers: [
        { name: 'Chrome' },
        { name: 'Firefox' },
        { name: 'Safari' },
        { name: 'Edge' },
        { name: 'Opera' },
      ],
      devices: [{ name: 'Desktop' }, { name: 'iPhone 15' }, { name: 'Pixel 8' }],
      enableMatrix: true,
      featureDetection: true,
      realBrowser: false,
      captureScreenshot: false,
      timeout: 30000,
    },
  },
  {
    name: '全面测试',
    description: '全部浏览器 + 全部设备，真实浏览器 + 截图',
    options: {
      browsers: [
        { name: 'Chrome' },
        { name: 'Firefox' },
        { name: 'Safari' },
        { name: 'Edge' },
        { name: 'Opera' },
        { name: 'Samsung' },
      ],
      devices: [
        { name: 'Desktop' },
        { name: 'iPhone 15' },
        { name: 'Pixel 8' },
        { name: 'iPad Pro' },
        { name: 'Galaxy S24' },
      ],
      enableMatrix: true,
      featureDetection: true,
      realBrowser: true,
      captureScreenshot: true,
      timeout: 60000,
    },
  },
  {
    name: '移动端专项',
    description: '仅移动设备，特性检测 + 截图',
    options: {
      browsers: [{ name: 'Chrome' }, { name: 'Safari' }, { name: 'Samsung Internet' }],
      devices: [
        { name: 'iPhone 15' },
        { name: 'Pixel 8' },
        { name: 'Galaxy S24' },
        { name: 'iPad Pro' },
      ],
      enableMatrix: true,
      featureDetection: true,
      realBrowser: false,
      captureScreenshot: true,
      timeout: 30000,
    },
  },
];

interface CompatibilityConfigPanelProps {
  options: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

export const CompatibilityConfigPanel = ({ options, onChange }: CompatibilityConfigPanelProps) => {
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

  const getListString = (key: string) => {
    const raw = options[key];
    if (!Array.isArray(raw)) return '';
    return raw
      .map((item: unknown) =>
        typeof item === 'string'
          ? item
          : typeof item === 'object' && item && 'name' in item
            ? String((item as Record<string, unknown>).name)
            : ''
      )
      .filter(Boolean)
      .join(', ');
  };

  const handleListChange = (key: string, value: string) => {
    const list = value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .map(name => ({ name }));
    userChange({ [key]: list });
  };

  const selectorEntries = useMemo<SelectorEntry[]>(() => {
    const raw = options.targetSelectors;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (item): item is SelectorEntry =>
        item && typeof item === 'object' && typeof item.selector === 'string'
    );
  }, [options.targetSelectors]);

  const handleSelectorChange = (next: SelectorEntry[]) => {
    userChange({ targetSelectors: next });
  };

  return (
    <ConfigSection title={t('editor.compatibilityPanelTitle', 'Compatibility Settings')}>
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
            label={t('editor.compatibilityBrowsers', 'Target Browsers')}
            description={t('editor.compatibilityBrowsersDesc', 'Comma-separated browser names')}
          >
            <Input
              value={getListString('browsers')}
              placeholder='Chrome, Safari, Edge'
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleListChange('browsers', e.target.value)
              }
            />
          </ConfigField>

          <ConfigField
            label={t('editor.compatibilityDevices', 'Target Devices')}
            description={t('editor.compatibilityDevicesDesc', 'Comma-separated device names')}
          >
            <Input
              value={getListString('devices')}
              placeholder='Desktop, iPhone 15, Pixel 8'
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleListChange('devices', e.target.value)
              }
            />
          </ConfigField>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 p-4 bg-muted/20 rounded-lg'>
          <ConfigField label={t('editor.compatibilityEnableMatrix', 'Test Matrix')} horizontal>
            <Switch
              checked={options.enableMatrix !== false}
              onCheckedChange={val => userChange({ enableMatrix: val })}
            />
          </ConfigField>

          <ConfigField
            label={t('editor.compatibilityFeatureDetection', 'Feature Detection')}
            horizontal
          >
            <Switch
              checked={options.featureDetection !== false}
              onCheckedChange={val => userChange({ featureDetection: val })}
            />
          </ConfigField>

          <ConfigField label={t('editor.compatibilityRealBrowser', 'Real Browser Mode')} horizontal>
            <Switch
              checked={Boolean(options.realBrowser)}
              onCheckedChange={val => userChange({ realBrowser: val })}
            />
          </ConfigField>

          <ConfigField
            label={t('editor.compatibilityCaptureScreenshot', 'Capture Screenshots')}
            horizontal
          >
            <Switch
              checked={Boolean(options.captureScreenshot)}
              onCheckedChange={val => userChange({ captureScreenshot: val })}
            />
          </ConfigField>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <ConfigField label={t('editor.compatibilityTimeout', 'Timeout')}>
            <div className='relative group'>
              <NumberInput
                value={Number(options.timeout ?? 30000)}
                onChange={val => userChange({ timeout: val || 1000 })}
                min={1000}
                step={1000}
                unit='ms'
              />
              <WarningTip
                message={
                  Number(options.timeout ?? 30000) > 60000
                    ? t('editor.compatibilityTimeoutWarning', '超时 {{val}}ms 较长', {
                        val: Number(options.timeout ?? 30000),
                      })
                    : Number(options.timeout ?? 30000) < 1000 &&
                        Number(options.timeout ?? 30000) > 0
                      ? t(
                          'editor.compatibilityTimeoutTooSmall',
                          '超时仅 {{val}}ms，测试可能来不及完成',
                          {
                            val: Number(options.timeout ?? 30000),
                          }
                        )
                      : ''
                }
              />
            </div>
          </ConfigField>
        </div>

        {/* ── 多路径截图配置 ── */}
        {Boolean(options.captureScreenshot) && (
          <div className='space-y-4 p-4 bg-muted/20 rounded-lg border border-dashed'>
            <div className='flex items-center gap-2 text-sm font-medium'>
              <Camera className='h-4 w-4 text-amber-500' />
              {t('editor.screenshotSection', '多路径截图配置')}
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <ConfigField label={t('editor.screenshotMaxPages', '最大页面数')}>
                <NumberInput
                  value={Number(options.screenshotMaxPages ?? 5)}
                  onChange={val => userChange({ screenshotMaxPages: val || 1 })}
                  min={1}
                  max={20}
                  step={1}
                />
              </ConfigField>

              <ConfigField label={t('editor.screenshotCrawlDepth', '爬取深度')}>
                <NumberInput
                  value={Number(options.screenshotCrawlDepth ?? 1)}
                  onChange={val => userChange({ screenshotCrawlDepth: val ?? 0 })}
                  min={0}
                  max={3}
                  step={1}
                />
              </ConfigField>

              <ConfigField label={t('editor.screenshotDelay', '截图前等待')}>
                <NumberInput
                  value={Number(options.screenshotDelay ?? 500)}
                  onChange={val => userChange({ screenshotDelay: val || 0 })}
                  min={0}
                  max={5000}
                  step={100}
                  unit='ms'
                />
              </ConfigField>
            </div>

            <ConfigField label={t('editor.screenshotFullPage', '全页截图')} horizontal>
              <Switch
                checked={options.screenshotFullPage !== false}
                onCheckedChange={val => userChange({ screenshotFullPage: val })}
              />
            </ConfigField>

            <ConfigField
              label={t('editor.screenshotPaths', '自定义路径')}
              description={t(
                'editor.screenshotPathsDesc',
                '留空则自动爬取发现页面路径，每行一个路径'
              )}
            >
              <textarea
                className='flex min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                rows={3}
                placeholder={'/\n/about\n/contact'}
                value={
                  Array.isArray(options.screenshotPaths)
                    ? (options.screenshotPaths as string[]).join('\n')
                    : ''
                }
                onChange={e => {
                  const paths = e.target.value
                    .split('\n')
                    .map(s => s.trim())
                    .filter(Boolean);
                  userChange({ screenshotPaths: paths.length > 0 ? paths : undefined });
                }}
              />
            </ConfigField>
          </div>
        )}

        <div className='space-y-3 pt-2 border-t opacity-50'>
          <div className='text-sm font-medium text-muted-foreground'>
            {t('editor.compatibilityTargetElements', 'Target Elements (Optional)')}{' '}
            <span className='text-xs font-normal'>{t('editor.comingSoon', '(coming soon)')}</span>
          </div>
          <p className='text-xs text-muted-foreground'>
            {t(
              'editor.compatibilityTargetElementsDesc',
              'Specify elements to focus compatibility checks on specific components.'
            )}
          </p>
          <div className='pointer-events-none'>
            <ElementSelectorTool
              selectors={selectorEntries}
              onChange={handleSelectorChange}
              multiple
              maxSelectors={6}
              compact
            />
          </div>
        </div>
      </div>
    </ConfigSection>
  );
};
