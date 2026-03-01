import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Zap } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigField } from '../config-ui/ConfigField';
import { ConfigSection } from '../config-ui/ConfigSection';
import { NumberInput } from '../config-ui/NumberInput';
import { WarningTip } from '../config-ui/WarningTip';

const PRESETS = [
  {
    name: '快速检查',
    description: '单次请求，跳过资源分析',
    options: {
      iterations: 1,
      timeout: 15000,
      cacheControl: 'no-cache',
      includeResources: false,
      fetchHtml: false,
      verbose: false,
    },
  },
  {
    name: '标准测试',
    description: '3 次迭代，完整分析',
    options: {
      iterations: 3,
      timeout: 30000,
      cacheControl: 'no-cache',
      includeResources: true,
      fetchHtml: true,
      verbose: false,
    },
  },
  {
    name: '深度分析',
    description: '10 次迭代，详细日志',
    options: {
      iterations: 10,
      timeout: 60000,
      cacheControl: 'no-store',
      includeResources: true,
      fetchHtml: true,
      verbose: true,
    },
  },
  {
    name: '缓存对比',
    description: '测试浏览器缓存效果',
    options: {
      iterations: 5,
      timeout: 30000,
      cacheControl: 'default',
      includeResources: true,
      fetchHtml: true,
      verbose: false,
    },
  },
];

interface PerformanceConfigPanelProps {
  options: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

export const PerformanceConfigPanel = ({ options, onChange }: PerformanceConfigPanelProps) => {
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

  const iterations = Number(options.iterations ?? 3);
  const timeout = Number(options.timeout ?? 30000);
  const iterationsWarning =
    iterations > 100
      ? t('editor.iterationsWarning', '迭代次数 {{val}} 较大，测试可能耗时较长', {
          val: iterations,
        })
      : '';
  const timeoutWarning =
    timeout > 120000
      ? t('editor.timeoutWarning', '超时 {{val}}ms 较长，测试可能长时间无响应', { val: timeout })
      : timeout < 1000 && timeout > 0
        ? t('editor.timeoutTooSmall', '超时仅 {{val}}ms，可能导致请求来不及响应就失败', {
            val: timeout,
          })
        : '';

  return (
    <ConfigSection title={t('editor.performancePanelTitle', 'Performance Settings')}>
      {/* 快捷预设 */}
      <div className='flex items-center gap-1.5 flex-wrap mb-4'>
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

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <ConfigField
          label={t('editor.performanceIterations', 'Iterations')}
          description={t('editor.performanceIterationsDesc', 'Number of times to run the test')}
        >
          <div className='relative group'>
            <NumberInput
              value={iterations}
              onChange={val => userChange({ iterations: val || 1 })}
              min={1}
              step={1}
              unit='runs'
            />
            <WarningTip message={iterationsWarning} />
          </div>
        </ConfigField>

        <ConfigField
          label={t('editor.performanceTimeout', 'Timeout')}
          description={t('editor.performanceTimeoutDesc', 'Request timeout per iteration')}
        >
          <div className='relative group'>
            <NumberInput
              value={timeout}
              onChange={val => userChange({ timeout: val || 1000 })}
              min={1}
              step={1000}
              unit='ms'
            />
            <WarningTip message={timeoutWarning} />
          </div>
        </ConfigField>

        <ConfigField
          label={t('editor.performanceCacheControl', 'Cache Strategy')}
          description={t('editor.performanceCacheControlDesc', 'HTTP cache control header')}
        >
          <Select
            value={String(options.cacheControl ?? 'no-cache')}
            onValueChange={val => userChange({ cacheControl: val })}
          >
            <SelectTrigger className='h-9'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='no-cache'>
                {t('editor.cacheNoCache', '模拟首次访问（No Cache）')}
              </SelectItem>
              <SelectItem value='default'>
                {t('editor.cacheDefault', '模拟回访（浏览器缓存）')}
              </SelectItem>
              <SelectItem value='max-age=0'>
                {t('editor.cacheRevalidate', '强制重新验证（304 检查）')}
              </SelectItem>
              <SelectItem value='no-store'>
                {t('editor.cacheNoStore', '完全禁用缓存（No Store）')}
              </SelectItem>
            </SelectContent>
          </Select>
          <p className='text-[10px] text-muted-foreground mt-1'>
            {String(options.cacheControl ?? 'no-cache') === 'no-cache' &&
              t('editor.cacheNoCacheHint', '适合评估首次加载性能，所有资源重新获取')}
            {String(options.cacheControl) === 'default' &&
              t('editor.cacheDefaultHint', '适合评估真实用户回访体验，复用浏览器缓存')}
            {String(options.cacheControl) === 'max-age=0' &&
              t('editor.cacheRevalidateHint', '资源未变化时返回 304，测试缓存策略有效性')}
            {String(options.cacheControl) === 'no-store' &&
              t('editor.cacheNoStoreHint', '最严格模式，完全不使用任何缓存')}
          </p>
        </ConfigField>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mt-4'>
        <ConfigField
          label={t('editor.performanceIncludeResources', 'Resource Analysis')}
          description={t('editor.performanceIncludeResourcesDesc', 'Analyze page resources')}
          horizontal
        >
          <Switch
            checked={options.includeResources !== false}
            onCheckedChange={val => userChange({ includeResources: val })}
          />
        </ConfigField>

        <ConfigField
          label={t('editor.performanceFetchHtml', 'Fetch HTML')}
          description={t('editor.performanceFetchHtmlDesc', 'Fetch raw HTML for analysis')}
          horizontal
        >
          <Switch
            checked={options.fetchHtml !== false}
            onCheckedChange={val => userChange({ fetchHtml: val })}
          />
        </ConfigField>

        <ConfigField
          label={t('editor.performanceVerbose', 'Verbose Logging')}
          description={t('editor.performanceVerboseDesc', 'Enable detailed logging')}
          horizontal
        >
          <Switch
            checked={Boolean(options.verbose)}
            onCheckedChange={val => userChange({ verbose: val })}
          />
        </ConfigField>
      </div>

      {/* 网络环境模拟 & 高级选项 */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mt-4'>
        <ConfigField
          label={t('editor.performanceNetwork', '网络环境')}
          description={t('editor.performanceNetworkDesc', '模拟不同网络条件')}
        >
          <Select
            value={String(options.networkThrottle ?? 'none')}
            onValueChange={val => userChange({ networkThrottle: val })}
          >
            <SelectTrigger className='h-9'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='none'>{t('editor.networkNone', '无限制（本机带宽）')}</SelectItem>
              <SelectItem value='wifi'>WiFi (30 Mbps / 10ms RTT)</SelectItem>
              <SelectItem value='5g'>5G (100 Mbps / 20ms RTT)</SelectItem>
              <SelectItem value='4g'>4G (9 Mbps / 170ms RTT)</SelectItem>
              <SelectItem value='3g'>3G (1.6 Mbps / 300ms RTT)</SelectItem>
              <SelectItem value='slow-3g'>
                {t('editor.networkSlow3g', '慢速 3G')} (0.5 Mbps / 400ms RTT)
              </SelectItem>
              <SelectItem value='2g'>2G (0.25 Mbps / 800ms RTT)</SelectItem>
            </SelectContent>
          </Select>
        </ConfigField>

        <ConfigField
          label={t('editor.performanceDevice', '设备仿真')}
          description={t('editor.performanceDeviceDesc', '模拟移动端/桌面端')}
        >
          <Select
            value={String(options.device ?? 'desktop')}
            onValueChange={val => userChange({ device: val })}
          >
            <SelectTrigger className='h-9'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='desktop'>
                {t('editor.deviceDesktop', '桌面端')} (1920×1080)
              </SelectItem>
              <SelectItem value='laptop'>
                {t('editor.deviceLaptop', '笔记本')} (1366×768)
              </SelectItem>
              <SelectItem value='mobile'>{t('editor.deviceMobile', '移动端')} (375×812)</SelectItem>
              <SelectItem value='iphone-14'>
                {t('editor.deviceIPhone14', 'iPhone 14 Pro')} (393×852)
              </SelectItem>
              <SelectItem value='pixel-7'>
                {t('editor.devicePixel7', 'Pixel 7')} (412×915)
              </SelectItem>
              <SelectItem value='galaxy-s23'>
                {t('editor.deviceGalaxyS23', 'Galaxy S23')} (360×780)
              </SelectItem>
              <SelectItem value='tablet'>{t('editor.deviceTablet', '平板')} (768×1024)</SelectItem>
              <SelectItem value='ipad-pro'>
                {t('editor.deviceIPadPro', 'iPad Pro')} (1024×1366)
              </SelectItem>
            </SelectContent>
          </Select>
        </ConfigField>

        <ConfigField
          label={t('editor.performanceRetries', '失败重试')}
          description={t('editor.performanceRetriesDesc', '请求失败时的重试次数')}
        >
          <NumberInput
            value={Number(options.maxRetries ?? 2)}
            onChange={val => userChange({ maxRetries: val, retryOnFail: (val ?? 0) > 0 })}
            min={0}
            max={5}
            step={1}
            unit='次'
          />
        </ConfigField>
      </div>

      {/* 性能阈值自定义 */}
      <div className='mt-6 pt-4 border-t'>
        <h4 className='text-xs font-semibold text-foreground mb-3'>
          {t('editor.performanceThresholds', 'Web Vitals 阈值')}
          <span className='text-[10px] text-muted-foreground font-normal ml-2'>
            超过阈值将触发优化建议
          </span>
        </h4>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <ConfigField label='TTFB' description='服务器响应时间阈值'>
            <NumberInput
              value={Number(options.ttfbThreshold ?? 800)}
              onChange={val => userChange({ ttfbThreshold: val || 800 })}
              min={100}
              step={100}
              unit='ms'
            />
          </ConfigField>
          <ConfigField label='LCP' description='最大内容绘制阈值'>
            <NumberInput
              value={Number(options.lcpThreshold ?? 2500)}
              onChange={val => userChange({ lcpThreshold: val || 2500 })}
              min={500}
              step={500}
              unit='ms'
            />
          </ConfigField>
          <ConfigField label='FCP' description='首次内容绘制阈值'>
            <NumberInput
              value={Number(options.fcpThreshold ?? 1800)}
              onChange={val => userChange({ fcpThreshold: val || 1800 })}
              min={300}
              step={300}
              unit='ms'
            />
          </ConfigField>
        </div>
      </div>
    </ConfigSection>
  );
};
