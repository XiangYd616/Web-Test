import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdvancedSettings } from '../../../context/TestContext';

interface AdvancedPanelProps {
  settings: AdvancedSettings;
  onChange: (settings: AdvancedSettings) => void;
}

/**
 * 高级选项面板（Postman 风格独立 Tab）
 * 包含：失败重试、跟随重定向、User Agent
 */
export const AdvancedPanel = ({ settings, onChange }: AdvancedPanelProps) => {
  const { t } = useTranslation();

  return (
    <div className='space-y-4 py-2'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4'>
        <div className='flex items-center justify-between'>
          <div>
            <div className='text-xs font-medium'>{t('editor.advancedRetryOnFail', '失败重试')}</div>
            <div className='text-[11px] text-muted-foreground'>
              {t('editor.advancedRetryOnFailDesc', '请求失败时自动重试')}
            </div>
          </div>
          <Switch
            checked={settings.retryOnFail}
            onCheckedChange={(c: boolean) => onChange({ ...settings, retryOnFail: c })}
          />
        </div>

        <div className='flex items-center justify-between'>
          <div>
            <div className='text-xs font-medium'>
              {t('editor.advancedFollowRedirects', '跟随重定向')}
            </div>
            <div className='text-[11px] text-muted-foreground'>
              {t('editor.advancedFollowRedirectsDesc', '自动跟随 HTTP 3xx 重定向')}
            </div>
          </div>
          <Switch
            checked={settings.followRedirects}
            onCheckedChange={(c: boolean) => onChange({ ...settings, followRedirects: c })}
          />
        </div>
      </div>

      {settings.retryOnFail && (
        <div className='grid gap-1.5'>
          <label className='text-xs font-medium'>
            {t('editor.advancedMaxRetries', '最大重试次数')}
          </label>
          <Input
            type='number'
            min={0}
            max={10}
            className='h-8 text-xs w-32'
            value={settings.maxRetries}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ ...settings, maxRetries: Number(e.target.value) || 0 })
            }
          />
        </div>
      )}

      <div className='grid gap-1.5'>
        <label className='text-xs font-medium'>User Agent</label>
        <Input
          className='h-8 text-xs'
          value={settings.userAgent}
          placeholder={t('editor.advancedUserAgentPlaceholder', '留空则使用默认 User-Agent')}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange({ ...settings, userAgent: e.target.value })
          }
        />
      </div>
    </div>
  );
};
