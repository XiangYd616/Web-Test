import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { ConfigField } from '../config-ui/ConfigField';
import { ConfigSection } from '../config-ui/ConfigSection';
import { NumberInput } from '../config-ui/NumberInput';
import { WarningTip } from '../config-ui/WarningTip';

interface UxConfigPanelProps {
  options: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

export const UxConfigPanel = ({ options, onChange }: UxConfigPanelProps) => {
  const { t } = useTranslation();
  const network = (options.network as Record<string, unknown>) || {};

  const iterations = Number(options.iterations ?? 3);
  const iterationsWarn =
    iterations > 10
      ? t('editor.uxIterationsWarning', '迭代次数 {{val}} 较大，UX 测试可能耗时较长', {
          val: iterations,
        })
      : '';

  return (
    <ConfigSection title={t('editor.uxPanelTitle', 'UX & Performance Settings')}>
      <div className='space-y-6'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <ConfigField label={t('editor.uxIterations', 'Iterations')}>
            <div className='relative group'>
              <NumberInput
                value={iterations}
                onChange={val => onChange({ iterations: val || 1 })}
                min={1}
                step={1}
              />
              <WarningTip message={iterationsWarn} />
            </div>
          </ConfigField>

          <ConfigField label={t('editor.uxSampleDelay', 'Sample Delay')}>
            <NumberInput
              value={Number(options.sampleDelayMs ?? 500)}
              onChange={val => onChange({ sampleDelayMs: val || 0 })}
              min={0}
              max={10000}
              step={100}
              unit='ms'
            />
          </ConfigField>

          <ConfigField label={t('editor.uxCpuSlowdown', 'CPU Slowdown')}>
            <NumberInput
              value={Number(options.cpuSlowdownMultiplier ?? 1)}
              onChange={val => onChange({ cpuSlowdownMultiplier: val || 1 })}
              min={1}
              max={6}
              step={1}
              unit='x'
            />
          </ConfigField>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <ConfigField
            label={t('editor.uxEnableScreenshot', 'Capture Screenshot')}
            description={t(
              'editor.uxEnableScreenshotDesc',
              'Take a page screenshot after UX metrics collection'
            )}
            horizontal
          >
            <Switch
              checked={options.enableScreenshot === true}
              onCheckedChange={val => onChange({ enableScreenshot: val })}
            />
          </ConfigField>
        </div>

        <div className='space-y-3 pt-2 border-t'>
          <div className='text-sm font-medium text-muted-foreground'>
            {t('editor.uxDeviceEmulation', 'Device Emulation')}
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <ConfigField label={t('editor.uxDevicePreset', 'Device Preset')}>
              <select
                className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                value={String((options.device as Record<string, unknown>)?.preset ?? 'desktop')}
                onChange={e => {
                  const preset = e.target.value;
                  onChange({
                    device: { ...((options.device as Record<string, unknown>) || {}), preset },
                  });
                }}
              >
                <option value='desktop'>
                  {t('editor.uxDeviceDesktop', 'Desktop (1920×1080)')}
                </option>
                <option value='mobile'>{t('editor.uxDeviceMobile', 'Mobile (375×812)')}</option>
                <option value='tablet'>{t('editor.uxDeviceTablet', 'Tablet (768×1024)')}</option>
              </select>
            </ConfigField>

            <ConfigField label={t('editor.uxDeviceWidth', 'Viewport Width')}>
              <NumberInput
                value={Number((options.device as Record<string, unknown>)?.width ?? 0)}
                onChange={val => {
                  const dev = (options.device as Record<string, unknown>) || {};
                  onChange({ device: { ...dev, width: val || undefined } });
                }}
                min={0}
                max={3840}
                step={1}
                unit='px'
              />
            </ConfigField>

            <ConfigField label={t('editor.uxDeviceHeight', 'Viewport Height')}>
              <NumberInput
                value={Number((options.device as Record<string, unknown>)?.height ?? 0)}
                onChange={val => {
                  const dev = (options.device as Record<string, unknown>) || {};
                  onChange({ device: { ...dev, height: val || undefined } });
                }}
                min={0}
                max={2160}
                step={1}
                unit='px'
              />
            </ConfigField>
          </div>
          <p className='text-xs text-muted-foreground'>
            {t(
              'editor.uxDeviceDesc',
              'Select a device preset or set custom viewport dimensions. Width/Height of 0 uses preset defaults.'
            )}
          </p>
        </div>

        <div className='space-y-3 pt-2 border-t'>
          <div className='text-sm font-medium text-muted-foreground'>
            {t('editor.uxNetworkThrottling', 'Network Throttling')}
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <ConfigField label={t('editor.uxNetworkDownload', 'Download')}>
              <NumberInput
                value={Number(network.downloadKbps ?? 0)}
                onChange={val =>
                  onChange({
                    network: { ...network, downloadKbps: val || 0 },
                  })
                }
                min={0}
                unit='kbps'
              />
            </ConfigField>

            <ConfigField label={t('editor.uxNetworkUpload', 'Upload')}>
              <NumberInput
                value={Number(network.uploadKbps ?? 0)}
                onChange={val =>
                  onChange({
                    network: { ...network, uploadKbps: val || 0 },
                  })
                }
                min={0}
                unit='kbps'
              />
            </ConfigField>

            <ConfigField label={t('editor.uxNetworkLatency', 'Latency')}>
              <NumberInput
                value={Number(network.latencyMs ?? 0)}
                onChange={val =>
                  onChange({
                    network: { ...network, latencyMs: val || 0 },
                  })
                }
                min={0}
                unit='ms'
              />
            </ConfigField>
          </div>
        </div>
      </div>
    </ConfigSection>
  );
};
