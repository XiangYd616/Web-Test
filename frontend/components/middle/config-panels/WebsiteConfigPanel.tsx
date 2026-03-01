import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { ConfigField } from '../config-ui/ConfigField';
import { ConfigSection } from '../config-ui/ConfigSection';
import { KeyValueEditor } from '../config-ui/KeyValueEditor';
import { NumberInput } from '../config-ui/NumberInput';
import { WarningTip } from '../config-ui/WarningTip';
import { AccessibilityConfigPanel } from './AccessibilityConfigPanel';
import { PerformanceConfigPanel } from './PerformanceConfigPanel';
import { SecurityConfigPanel } from './SecurityConfigPanel';
import { SeoConfigPanel } from './SeoConfigPanel';

const WEBSITE_TEST_TYPES = [
  { value: 'performance', label: 'Performance' },
  { value: 'security', label: 'Security' },
  { value: 'seo', label: 'SEO' },
  { value: 'accessibility', label: 'Accessibility' },
  { value: 'ux', label: 'UX' },
] as const;

interface WebsiteConfigPanelProps {
  options: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

export const WebsiteConfigPanel = ({ options, onChange }: WebsiteConfigPanelProps) => {
  const { t } = useTranslation();

  const handleCookiesChange = (cookies: { key: string; value: string }[]) => {
    const mapped = cookies
      .filter(c => c.key.trim())
      .map(c => ({
        name: c.key.trim(),
        value: c.value,
        domain: '', // Simplified for now
      }));
    onChange({ cookies: mapped });
  };

  const handleHeadersChange = (headers: { key: string; value: string }[]) => {
    const mapped = headers.reduce<Record<string, string>>((acc, item) => {
      if (item.key.trim()) {
        acc[item.key.trim()] = item.value;
      }
      return acc;
    }, {});
    onChange({ customHeaders: mapped });
  };

  const currentCookies = Array.isArray(options.cookies)
    ? (options.cookies as Record<string, unknown>[]).map(c => ({
        key: String(c.name || ''),
        value: String(c.value || ''),
      }))
    : [];

  const currentHeaders = options.customHeaders
    ? Object.entries(options.customHeaders as Record<string, string>).map(([key, value]) => ({
        key,
        value,
      }))
    : [];

  return (
    <div className='space-y-4'>
      <ConfigSection title={t('editor.websitePanelTitle', 'Website Test Settings')}>
        <div className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <ConfigField
              label={t('editor.websiteTestTypes', 'Included Tests')}
              description={t('editor.websiteTestTypesDesc', 'Select which tests to include')}
            >
              <div className='flex flex-wrap gap-3'>
                {WEBSITE_TEST_TYPES.map(tt => {
                  const current = Array.isArray(options.testTypes)
                    ? (options.testTypes as string[])
                    : [];
                  const checked = current.includes(tt.value);
                  return (
                    <label
                      key={tt.value}
                      className='flex items-center gap-1.5 text-sm cursor-pointer'
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(val: boolean | 'indeterminate') => {
                          const next =
                            val === true
                              ? [...current, tt.value]
                              : current.filter(v => v !== tt.value);
                          onChange({ testTypes: next });
                        }}
                      />
                      {tt.label}
                    </label>
                  );
                })}
              </div>
            </ConfigField>

            <ConfigField label={t('editor.websiteTimeout', 'Global Timeout')}>
              <div className='relative group'>
                <NumberInput
                  value={Number(options.timeout ?? 60000)}
                  onChange={val => onChange({ timeout: val || 10000 })}
                  min={1}
                  step={5000}
                  unit='ms'
                />
                <WarningTip
                  message={
                    Number(options.timeout ?? 60000) > 120000
                      ? t('editor.websiteTimeoutWarning', '全局超时 {{val}}ms 较长', {
                          val: Number(options.timeout ?? 60000),
                        })
                      : Number(options.timeout ?? 60000) < 5000 &&
                          Number(options.timeout ?? 60000) > 0
                        ? t(
                            'editor.websiteTimeoutTooSmall',
                            '超时仅 {{val}}ms，多项测试可能来不及完成',
                            {
                              val: Number(options.timeout ?? 60000),
                            }
                          )
                        : ''
                  }
                />
              </div>
            </ConfigField>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 p-4 bg-muted/20 rounded-lg'>
            <ConfigField label={t('editor.websiteEnableScreenshots', 'Screenshots')} horizontal>
              <Switch
                checked={options.enableScreenshots !== false}
                onCheckedChange={val => onChange({ enableScreenshots: val })}
              />
            </ConfigField>

            <ConfigField
              label={t('editor.websiteEnableVideo', 'Video Recording')}
              description={t('editor.comingSoon', '(coming soon)')}
              horizontal
            >
              <Switch checked={false} disabled />
            </ConfigField>

            <ConfigField
              label={t('editor.websiteEnableConsole', 'Console Logs')}
              description={t('editor.comingSoon', '(coming soon)')}
              horizontal
            >
              <Switch checked={false} disabled />
            </ConfigField>

            <ConfigField
              label={t('editor.websiteEnableNetwork', 'Network Logs')}
              description={t('editor.comingSoon', '(coming soon)')}
              horizontal
            >
              <Switch checked={false} disabled />
            </ConfigField>
          </div>
        </div>
      </ConfigSection>

      <div className='pl-4 border-l-2 border-muted space-y-4'>
        <PerformanceConfigPanel
          options={(options.performanceOptions as Record<string, unknown>) || {}}
          onChange={patch =>
            onChange({
              performanceOptions: {
                ...((options.performanceOptions as Record<string, unknown>) || {}),
                ...patch,
              },
            })
          }
        />

        <SecurityConfigPanel
          options={(options.securityOptions as Record<string, unknown>) || {}}
          onChange={patch =>
            onChange({
              securityOptions: {
                ...((options.securityOptions as Record<string, unknown>) || {}),
                ...patch,
              },
            })
          }
        />

        <SeoConfigPanel
          options={(options.seoOptions as Record<string, unknown>) || {}}
          onChange={patch =>
            onChange({
              seoOptions: {
                ...((options.seoOptions as Record<string, unknown>) || {}),
                ...patch,
              },
            })
          }
        />

        <AccessibilityConfigPanel
          options={(options.accessibilityOptions as Record<string, unknown>) || {}}
          onChange={patch =>
            onChange({
              accessibilityOptions: {
                ...((options.accessibilityOptions as Record<string, unknown>) || {}),
                ...patch,
              },
            })
          }
        />
      </div>

      <ConfigSection title={t('editor.websiteAdvanced', 'Advanced Options')} defaultOpen={false}>
        <div className='space-y-6'>
          <div className='space-y-2'>
            <Label>{t('editor.websiteCookies', 'Cookies')}</Label>
            <KeyValueEditor
              items={currentCookies}
              onChange={handleCookiesChange}
              keyPlaceholder='Cookie Name'
              valuePlaceholder='Value'
            />
          </div>

          <div className='space-y-2'>
            <Label>{t('editor.websiteHeaders', 'Custom Headers')}</Label>
            <KeyValueEditor
              items={currentHeaders}
              onChange={handleHeadersChange}
              keyPlaceholder='Header Name'
              valuePlaceholder='Value'
            />
          </div>
        </div>
      </ConfigSection>
    </div>
  );
};
