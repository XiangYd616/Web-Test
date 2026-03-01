import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Zap } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigField } from '../config-ui/ConfigField';
import { ConfigSection } from '../config-ui/ConfigSection';
import { KeyValueEditor } from '../config-ui/KeyValueEditor';
import { NumberInput } from '../config-ui/NumberInput';
import { WarningTip } from '../config-ui/WarningTip';

/* ---------- 测试模式定义 ---------- */
const TEST_PATTERNS = [
  {
    value: 'load',
    label: '负载测试 (Load)',
    description: '以恒定并发持续请求，验证系统在预期负载下的稳定性和响应能力',
  },
  {
    value: 'stress',
    label: '压力测试 (Stress)',
    description: '逐步增加并发直到系统极限，找出性能瓶颈和最大承载能力',
  },
  {
    value: 'spike',
    label: '峰值测试 (Spike)',
    description: '瞬间注入大量并发，测试系统对突发流量的应对和恢复能力',
  },
  {
    value: 'volume',
    label: '容量测试 (Volume)',
    description: '长时间中等负载运行，检测内存泄漏、连接耗尽等持久性问题',
  },
] as const;

/* ---------- 快捷预设 ---------- */
const PRESETS = [
  {
    name: '轻量探测',
    description: '5 用户 / 15 秒，快速验证接口可用性',
    options: {
      users: 5,
      duration: 15,
      rampUp: 3,
      thinkTime: 500,
      timeout: 10000,
      stressMode: 'load',
    },
  },
  {
    name: '标准压测',
    description: '50 用户 / 60 秒，评估常规负载表现',
    options: {
      users: 50,
      duration: 60,
      rampUp: 15,
      thinkTime: 1000,
      timeout: 30000,
      stressMode: 'load',
    },
  },
  {
    name: '极限压测',
    description: '200 用户 / 120 秒，探测系统极限',
    options: {
      users: 200,
      duration: 120,
      rampUp: 30,
      thinkTime: 500,
      timeout: 30000,
      stressMode: 'stress',
    },
  },
  {
    name: '峰值冲击',
    description: '100 用户 / 30 秒，0 秒预热，模拟突发流量',
    options: {
      users: 100,
      duration: 30,
      rampUp: 0,
      thinkTime: 200,
      timeout: 15000,
      stressMode: 'spike',
    },
  },
  {
    name: '持久运行',
    description: '30 用户 / 300 秒，检测长时间运行稳定性',
    options: {
      users: 30,
      duration: 300,
      rampUp: 10,
      thinkTime: 2000,
      timeout: 30000,
      stressMode: 'volume',
    },
  },
];

/* ---------- HTTP 方法 ---------- */
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] as const;

interface StressConfigPanelProps {
  options: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

export const StressConfigPanel = ({ options, onChange }: StressConfigPanelProps) => {
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

  const users = Number(options.users ?? 50);
  const duration = Number(options.duration ?? 60);
  const rampUp = Number(options.rampUp ?? 15);
  const timeout = Number(options.timeout ?? 30000);
  const method = String(options.method ?? 'GET').toUpperCase();

  const usersWarn =
    users > 200
      ? t('editor.stressUsersWarning', '并发用户 {{val}} 较多，可能影响系统性能', { val: users })
      : '';
  const durationWarn =
    duration > 600
      ? t('editor.stressDurationWarning', '测试时长 {{val}}s 超过 10 分钟', { val: duration })
      : '';
  const rampUpWarn =
    rampUp > 300 ? t('editor.stressRampUpWarning', '预热时间 {{val}}s 较长', { val: rampUp }) : '';
  const timeoutWarn =
    timeout > 60000
      ? t('editor.stressTimeoutWarning', '请求超时 {{val}}ms 较长', { val: timeout })
      : '';

  const handleHeadersChange = (headers: { key: string; value: string }[]) => {
    const mapped = headers.reduce<Record<string, string>>((acc, item) => {
      if (item.key.trim()) {
        acc[item.key.trim()] = item.value;
      }
      return acc;
    }, {});
    userChange({ customHeaders: mapped });
  };

  const currentHeaders = options.customHeaders
    ? Object.entries(options.customHeaders as Record<string, string>).map(([key, value]) => ({
        key,
        value,
      }))
    : [];

  const selectedPattern = TEST_PATTERNS.find(p => p.value === String(options.stressMode || 'load'));
  const showBody = ['POST', 'PUT', 'PATCH'].includes(method);

  return (
    <ConfigSection title={t('editor.stressPanelTitle', 'Stress Test Settings')}>
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

        {/* 第一行：并发 / 时长 / 测试模式 */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <ConfigField
            label={t('editor.stressUsers', '并发用户数')}
            description={t('editor.stressUsersDesc', '模拟的虚拟用户数量，每个用户持续发送请求')}
          >
            <div className='relative group'>
              <NumberInput
                value={users}
                onChange={val => userChange({ users: val || 1 })}
                min={1}
                step={1}
                unit='users'
              />
              <WarningTip message={usersWarn} />
            </div>
          </ConfigField>

          <ConfigField
            label={t('editor.stressDuration', '测试时长')}
            description={t('editor.stressDurationDesc', '测试持续运行的总时间')}
          >
            <div className='relative group'>
              <NumberInput
                value={duration}
                onChange={val => userChange({ duration: val || 10 })}
                min={10}
                step={10}
                unit='sec'
              />
              <WarningTip message={durationWarn} />
            </div>
          </ConfigField>

          <ConfigField
            label={t('editor.stressTestType', '测试模式')}
            description={selectedPattern?.description}
          >
            <Select
              value={String(options.stressMode || 'load')}
              onValueChange={value => userChange({ stressMode: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEST_PATTERNS.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    <div className='flex flex-col'>
                      <span>{item.label}</span>
                      <span className='text-[10px] text-muted-foreground'>{item.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ConfigField>
        </div>

        {/* 第二行：预热 / 思考时间 / 超时 */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <ConfigField
            label={t('editor.stressRampUp', '预热时间')}
            description={t('editor.stressRampUpDesc', '从 0 逐步增加到目标并发用户数所需的时间')}
          >
            <div className='relative group'>
              <NumberInput
                value={rampUp}
                onChange={val => userChange({ rampUp: val ?? 0 })}
                min={0}
                step={1}
                unit='sec'
              />
              <WarningTip message={rampUpWarn} />
            </div>
          </ConfigField>

          <ConfigField
            label={t('editor.stressThinkTime', '思考时间')}
            description={t(
              'editor.stressThinkTimeDesc',
              '每个虚拟用户在两次请求之间的等待时间，模拟真实用户行为'
            )}
          >
            <NumberInput
              value={Number(options.thinkTime ?? 1000)}
              onChange={val => userChange({ thinkTime: val ?? 0 })}
              min={0}
              step={100}
              unit='ms'
            />
          </ConfigField>

          <ConfigField
            label={t('editor.stressTimeout', '请求超时')}
            description={t('editor.stressTimeoutDesc', '单个请求的最大等待时间，超时视为失败')}
          >
            <div className='relative group'>
              <NumberInput
                value={timeout}
                onChange={val => userChange({ timeout: val || 5000 })}
                min={1000}
                step={1000}
                unit='ms'
              />
              <WarningTip message={timeoutWarn} />
            </div>
          </ConfigField>
        </div>

        {/* 第三行：HTTP 方法 + 请求体 */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <ConfigField
            label={t('editor.stressMethod', 'HTTP 方法')}
            description={t('editor.stressMethodDesc', '压测请求使用的 HTTP 方法')}
          >
            <Select value={method} onValueChange={value => userChange({ method: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HTTP_METHODS.map(m => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ConfigField>

          {showBody && (
            <div className='md:col-span-2'>
              <ConfigField
                label={t('editor.stressBody', '请求体')}
                description={t(
                  'editor.stressBodyDesc',
                  '请求正文内容（JSON 格式），仅 POST/PUT/PATCH 有效'
                )}
              >
                <Textarea
                  value={String(options.body ?? '')}
                  onChange={e => userChange({ body: e.target.value })}
                  placeholder='{"key": "value"}'
                  className='font-mono text-xs min-h-[60px] max-h-[120px]'
                  rows={3}
                />
              </ConfigField>
            </div>
          )}
        </div>

        {/* 性能阈值自定义 */}
        <div className='pt-4 border-t'>
          <h4 className='text-xs font-semibold text-foreground mb-3'>
            {t('editor.stressThresholds', '性能阈值')}
            <span className='text-[10px] text-muted-foreground font-normal ml-2'>
              仅用于结果评分和告警判定，不影响测试执行过程
            </span>
          </h4>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <ConfigField
              label={t('editor.stressMaxResponseTime', '最大响应时间')}
              description='平均响应时间超过此值将触发告警'
            >
              <NumberInput
                value={Number(options.maxResponseTimeThreshold ?? 5000)}
                onChange={val => userChange({ maxResponseTimeThreshold: val || 5000 })}
                min={100}
                step={500}
                unit='ms'
              />
            </ConfigField>
            <ConfigField
              label={t('editor.stressMaxErrorRate', '最大错误率')}
              description='错误率超过此百分比将触发告警'
            >
              <NumberInput
                value={Number(options.maxErrorRateThreshold ?? 5)}
                onChange={val => userChange({ maxErrorRateThreshold: val || 5 })}
                min={0}
                step={1}
                unit='%'
              />
            </ConfigField>
            <ConfigField
              label={t('editor.stressMinSuccessRate', '最低成功率')}
              description='成功率低于此百分比将触发告警'
            >
              <NumberInput
                value={Number(options.minSuccessRateThreshold ?? 95)}
                onChange={val => userChange({ minSuccessRateThreshold: val || 95 })}
                min={0}
                step={1}
                unit='%'
              />
            </ConfigField>
          </div>
        </div>

        {/* 自定义请求头 */}
        <div className='space-y-3 pt-2 border-t'>
          <Label>{t('editor.stressHeaders', '自定义请求头')}</Label>
          <KeyValueEditor
            items={currentHeaders}
            onChange={handleHeadersChange}
            keyPlaceholder={t('editor.stressHeaderKey', 'Header Name')}
            valuePlaceholder={t('editor.stressHeaderValue', 'Value')}
            addButtonLabel={t('editor.stressAddHeader', '添加请求头')}
          />
        </div>
      </div>
    </ConfigSection>
  );
};
