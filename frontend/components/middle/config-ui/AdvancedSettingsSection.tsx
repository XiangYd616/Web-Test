import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdvancedSettings } from '../../../context/TestContext';
import { ConfigField } from './ConfigField';
import { ConfigSection } from './ConfigSection';

interface AdvancedSettingsSectionProps {
  settings: AdvancedSettings;
  onChange: (settings: AdvancedSettings) => void;
}

/**
 * 精简版高级设置区块（可折叠）
 * 仅包含各配置面板未覆盖的通用字段：
 * - 失败重试 (retryOnFail)
 * - 最大重试次数 (maxRetries)
 * - 跟随重定向 (followRedirects)
 * - User Agent
 * 用于嵌入各测试类型的配置面板底部
 */
export const AdvancedSettingsSection = ({
  settings,
  onChange,
}: AdvancedSettingsSectionProps) => {
  const { t } = useTranslation();

  return (
    <ConfigSection
      title={t('editor.advancedSettings', '高级选项')}
      defaultOpen={false}
    >
      <div className='space-y-4'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4'>
          <ConfigField
            label={t('editor.advancedRetryOnFail', '失败重试')}
            description={t('editor.advancedRetryOnFailDesc', '请求失败时自动重试')}
            horizontal
          >
            <Switch
              checked={settings.retryOnFail}
              onCheckedChange={(c: boolean) => onChange({ ...settings, retryOnFail: c })}
            />
          </ConfigField>

          <ConfigField
            label={t('editor.advancedFollowRedirects', '跟随重定向')}
            description={t('editor.advancedFollowRedirectsDesc', '自动跟随 HTTP 3xx 重定向')}
            horizontal
          >
            <Switch
              checked={settings.followRedirects}
              onCheckedChange={(c: boolean) => onChange({ ...settings, followRedirects: c })}
            />
          </ConfigField>
        </div>

        {settings.retryOnFail && (
          <ConfigField
            label={t('editor.advancedMaxRetries', '最大重试次数')}
          >
            <Input
              type='number'
              min={0}
              max={10}
              className='h-8 text-xs w-32'
              value={settings.maxRetries}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onChange({
                  ...settings,
                  maxRetries: Number(e.target.value) || 0,
                })
              }
            />
          </ConfigField>
        )}

        <ConfigField label='User Agent'>
          <Input
            className='h-8 text-xs'
            value={settings.userAgent}
            placeholder={t('editor.advancedUserAgentPlaceholder', '留空则使用默认 User-Agent')}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ ...settings, userAgent: e.target.value })
            }
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
};
