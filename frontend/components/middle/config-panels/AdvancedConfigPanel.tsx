import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Eye, Zap } from 'lucide-react';
import { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { type TestType, AdvancedSettings } from '../../../context/TestContext';
import { isDesktop } from '../../../utils/environment';
import { WarningTip } from '../config-ui/WarningTip';

const PUPPETEER_TYPES = new Set<TestType>([
  'performance',
  'seo',
  'compatibility',
  'accessibility',
  'ux',
  'security',
  'website',
]);

interface AdvancedConfigPanelProps {
  settings: AdvancedSettings;
  onChange: (settings: AdvancedSettings) => void;
  testType?: TestType;
}

export const AdvancedConfigPanel = ({ settings, onChange, testType }: AdvancedConfigPanelProps) => {
  const { t } = useTranslation();

  // 并发和时长仅在压力测试中有意义
  const showStressFields = testType === 'stress';

  const concurrencyWarning =
    showStressFields && settings.concurrency > 100
      ? t('editor.concurrencyWarning', '并发数 {{val}} 较大，可能影响系统性能', {
          val: settings.concurrency,
        })
      : '';
  const durationWarning =
    showStressFields && settings.duration > 3600
      ? t('editor.durationWarning', '测试时长 {{val}}s 超过 1 小时', { val: settings.duration })
      : '';

  return (
    <div className='space-y-4'>
      <div className={`grid gap-4 ${showStressFields ? 'md:grid-cols-3' : 'md:grid-cols-1'}`}>
        {showStressFields && (
          <div className='relative group grid gap-1.5'>
            <Label>{t('editor.advancedConcurrency')}</Label>
            <Input
              type='number'
              min={1}
              value={settings.concurrency}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onChange({
                  ...settings,
                  concurrency: Number(e.target.value) || 10,
                })
              }
            />
            <WarningTip message={concurrencyWarning} />
          </div>
        )}
        {showStressFields && (
          <div className='relative group grid gap-1.5'>
            <Label>{t('editor.advancedDuration')}</Label>
            <Input
              type='number'
              min={1}
              value={settings.duration}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onChange({
                  ...settings,
                  duration: Number(e.target.value) || 300,
                })
              }
            />
            <WarningTip message={durationWarning} />
          </div>
        )}
        <div className='grid gap-1.5'>
          <Label>{t('editor.advancedMaxRetries')}</Label>
          <Input
            type='number'
            min={0}
            value={settings.maxRetries}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({
                ...settings,
                maxRetries: Number(e.target.value) || 0,
              })
            }
          />
        </div>
      </div>
      <div className='grid md:grid-cols-3 gap-4 items-center'>
        <div className='flex items-center space-x-2'>
          <Switch
            id='retry'
            checked={settings.retryOnFail}
            onCheckedChange={(c: boolean) => onChange({ ...settings, retryOnFail: c })}
          />
          <Label htmlFor='retry'>{t('editor.advancedRetryOnFail')}</Label>
        </div>
        <div className='flex items-center space-x-2'>
          <Switch
            id='redirects'
            checked={settings.followRedirects}
            onCheckedChange={(c: boolean) => onChange({ ...settings, followRedirects: c })}
          />
          <Label htmlFor='redirects'>{t('editor.advancedFollowRedirects')}</Label>
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('editor.advancedDevice')}</Label>
          <Select
            value={settings.device}
            onValueChange={(v: string) => onChange({ ...settings, device: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['desktop', 'mobile', 'tablet'].map(d => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className='grid gap-1.5'>
        <Label>User Agent</Label>
        <Input
          value={settings.userAgent}
          placeholder={t('editor.advancedUserAgentPlaceholder', '留空则使用默认 User-Agent')}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange({ ...settings, userAgent: e.target.value })
          }
        />
      </div>
      {isDesktop() && testType && PUPPETEER_TYPES.has(testType) && (
        <div className='space-y-3 pt-2 border-t border-border/50'>
          <div className='flex items-center space-x-2'>
            <Switch
              id='show-browser'
              checked={settings.showBrowser}
              onCheckedChange={(c: boolean) => onChange({ ...settings, showBrowser: c })}
            />
            <Eye className='h-3.5 w-3.5 text-muted-foreground' />
            <Label htmlFor='show-browser' className='cursor-pointer'>
              {t('editor.showBrowser', '显示浏览器窗口')}
            </Label>
            <span className='text-[10px] text-muted-foreground'>
              {t('editor.showBrowserHint', '测试时弹出 Chromium 窗口，实时查看页面操作')}
            </span>
          </div>
          <div className='flex items-center space-x-3'>
            <Zap className='h-3.5 w-3.5 text-muted-foreground' />
            <Label className='text-xs whitespace-nowrap'>
              {t('editor.engineMode', '引擎性能')}
            </Label>
            <Select
              value={settings.engineMode}
              onValueChange={(v: string) =>
                onChange({ ...settings, engineMode: v as 'eco' | 'balanced' | 'performance' })
              }
            >
              <SelectTrigger className='h-7 w-32 text-xs'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='eco'>{t('editor.engineModeEco', '🍃 节能')}</SelectItem>
                <SelectItem value='balanced'>
                  {t('editor.engineModeBalanced', '⚖️ 平衡')}
                </SelectItem>
                <SelectItem value='performance'>
                  {t('editor.engineModePerf', '🚀 高性能')}
                </SelectItem>
              </SelectContent>
            </Select>
            <span className='text-[10px] text-muted-foreground'>
              {settings.engineMode === 'eco'
                ? t('editor.engineModeEcoHint', '1浏览器 / 3页面，适合低配设备')
                : settings.engineMode === 'performance'
                  ? t('editor.engineModePerfHint', '3浏览器 / 8页面 / 12总页面，适合高配设备')
                  : t('editor.engineModeBalancedHint', '2浏览器 / 5页面 / 8总页面（默认）')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
