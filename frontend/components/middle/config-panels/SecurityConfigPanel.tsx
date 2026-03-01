import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { AlertTriangle, Shield, ShieldAlert, SlidersHorizontal, Zap } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfigField } from '../config-ui/ConfigField';
import { ConfigSection } from '../config-ui/ConfigSection';
import { NumberInput } from '../config-ui/NumberInput';
import { WarningTip } from '../config-ui/WarningTip';

/* ---------- 快捷预设 ---------- */
const PRESETS = [
  {
    name: '快速扫描',
    description: '仅 SSL + 安全响应头，适合快速验证基本安全性（约 15 秒）',
    options: {
      timeout: 15000,
      checkSSL: true,
      checkHeaders: true,
      checkCookies: false,
      checkCors: false,
      checkContentSecurity: false,
      checkVulnerabilities: false,
      checkCsrf: false,
      checkXss: false,
      checkSqlInjection: false,
      checkSensitiveInfo: false,
      enableDeepScan: false,
      enablePortScan: false,
      enableScreenshot: false,
    },
  },
  {
    name: '标准扫描',
    description: '全部合规检查 + 基础漏洞扫描，不含深度扫描（约 30 秒）',
    options: {
      timeout: 30000,
      checkSSL: true,
      checkHeaders: true,
      checkCookies: true,
      checkCors: true,
      checkContentSecurity: true,
      checkVulnerabilities: true,
      checkCsrf: true,
      checkXss: false,
      checkSqlInjection: false,
      checkSensitiveInfo: true,
      enableDeepScan: false,
      enablePortScan: true,
      enableScreenshot: false,
    },
  },
  {
    name: '深度扫描',
    description:
      '全部检测 + XSS/SQL 注入深度扫描 + 端口扫描 + 截图，耗时较长（约 60-120 秒），会向目标发送探测请求',
    options: {
      timeout: 60000,
      checkSSL: true,
      checkHeaders: true,
      checkCookies: true,
      checkCors: true,
      checkContentSecurity: true,
      checkVulnerabilities: true,
      checkCsrf: true,
      checkXss: true,
      checkSqlInjection: true,
      checkSensitiveInfo: true,
      enableDeepScan: true,
      enablePortScan: true,
      enableScreenshot: true,
    },
  },
  {
    name: '合规审计',
    description: '侧重配置合规：SSL + 安全响应头 + Cookie + CORS + 内容安全（约 45 秒）',
    options: {
      timeout: 45000,
      checkSSL: true,
      checkHeaders: true,
      checkCookies: true,
      checkCors: true,
      checkContentSecurity: true,
      checkVulnerabilities: false,
      checkCsrf: false,
      checkXss: false,
      checkSqlInjection: false,
      checkSensitiveInfo: false,
      enableDeepScan: false,
      enablePortScan: false,
      enableScreenshot: false,
    },
  },
];

/* ---------- 分组标题组件 ---------- */
const GroupHeader = ({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  className?: string;
}) => (
  <div className={cn('flex items-start gap-2 mb-3', className)}>
    <Icon className='h-4 w-4 mt-0.5 shrink-0' />
    <div>
      <div className='text-sm font-semibold'>{title}</div>
      <div className='text-[11px] text-muted-foreground'>{description}</div>
    </div>
  </div>
);

interface SecurityConfigPanelProps {
  options: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

export const SecurityConfigPanel = ({ options, onChange }: SecurityConfigPanelProps) => {
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

  const timeout = Number(options.timeout ?? 30000);
  const timeoutWarn =
    timeout > 60000
      ? t('editor.securityTimeoutWarning', '超时 {{val}}ms 较长，请确认是否需要', { val: timeout })
      : timeout < 5000 && timeout > 0
        ? t('editor.securityTimeoutTooSmall', '超时仅 {{val}}ms，扫描可能来不及完成', {
            val: timeout,
          })
        : '';

  const deepScanEnabled = options.enableDeepScan === true;
  const vulnEnabled = options.checkVulnerabilities !== false;

  return (
    <ConfigSection title={t('editor.securityPanelTitle', '安全扫描设置')}>
      <div className='space-y-6'>
        {/* ── 快捷预设 ── */}
        <div className='flex items-center gap-1.5 flex-wrap'>
          <Zap className='h-3.5 w-3.5 text-amber-500 shrink-0' />
          {PRESETS.map(preset => (
            <button
              key={preset.name}
              type='button'
              title={preset.description}
              onClick={() => applyPreset(preset)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all',
                activePreset === preset.name
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5'
              )}
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* ── 超时设置 ── */}
        <ConfigField
          label={t('editor.securityTimeout', '扫描超时')}
          description={t('editor.securityTimeoutDesc', '等待扫描结果的最大时间')}
        >
          <div className='relative group'>
            <NumberInput
              value={timeout}
              onChange={val => userChange({ timeout: val || 5000 })}
              min={5000}
              step={5000}
              unit='ms'
            />
            <WarningTip message={timeoutWarn} />
          </div>
        </ConfigField>

        {/* ═══════════════════════════════════════════════
            第一组：合规检查（配置类，被动检测，不向目标发送攻击请求）
            ═══════════════════════════════════════════════ */}
        <div className='p-4 bg-muted/20 rounded-lg space-y-4'>
          <GroupHeader
            icon={Shield}
            title='合规检查'
            description='检测服务器安全配置是否符合最佳实践，被动检测不会影响目标站点'
            className='text-blue-600 dark:text-blue-400'
          />
          <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4'>
            <ConfigField
              label={t('editor.securityCheckSSL', 'SSL 检查')}
              description='检测 SSL/TLS 协议版本、证书有效性、加密套件安全性'
              horizontal
            >
              <Switch
                checked={options.checkSSL !== false}
                onCheckedChange={val => userChange({ checkSSL: val })}
              />
            </ConfigField>

            <ConfigField
              label={t('editor.securityCheckHeaders', '安全响应头')}
              description='检测 CSP、HSTS、X-Frame-Options 等 7 项关键 HTTP 响应头'
              horizontal
            >
              <Switch
                checked={options.checkHeaders !== false}
                onCheckedChange={val => userChange({ checkHeaders: val })}
              />
            </ConfigField>

            <ConfigField
              label={t('editor.securityCheckCookies', 'Cookie 检查')}
              description='检测 Secure、HttpOnly、SameSite 标志及过期策略'
              horizontal
            >
              <Switch
                checked={options.checkCookies !== false}
                onCheckedChange={val => userChange({ checkCookies: val })}
              />
            </ConfigField>

            <ConfigField
              label={t('editor.securityCheckCors', 'CORS 检查')}
              description='检测跨域资源共享策略，是否存在通配符或反射 Origin'
              horizontal
            >
              <Switch
                checked={options.checkCors !== false}
                onCheckedChange={val => userChange({ checkCors: val })}
              />
            </ConfigField>

            <ConfigField
              label={t('editor.securityCheckContentSecurity', '内容安全')}
              description='检测子资源完整性 (SRI)、混合内容、危险 HTTP 方法'
              horizontal
            >
              <Switch
                checked={options.checkContentSecurity !== false}
                onCheckedChange={val => userChange({ checkContentSecurity: val })}
              />
            </ConfigField>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            第二组：漏洞扫描（主动检测，会向目标发送探测请求）
            ═══════════════════════════════════════════════ */}
        <div className='p-4 bg-muted/20 rounded-lg space-y-4'>
          <GroupHeader
            icon={ShieldAlert}
            title='漏洞扫描'
            description='主动检测可利用漏洞，部分检测项会向目标发送探测请求'
            className='text-orange-600 dark:text-orange-400'
          />
          <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4'>
            <ConfigField
              label={t('editor.securityCheckVulnerabilities', '漏洞扫描')}
              description='总开关：开启后执行快速漏洞扫描（目录穿越、信息泄露等）'
              horizontal
            >
              <Switch
                checked={vulnEnabled}
                onCheckedChange={val => userChange({ checkVulnerabilities: val })}
              />
            </ConfigField>

            <ConfigField
              label={t('editor.securityCheckCsrf', 'CSRF 检测')}
              description='检测表单是否缺少 CSRF Token，分析跨站请求伪造风险'
              horizontal
            >
              <Switch
                checked={options.checkCsrf !== false}
                onCheckedChange={val => userChange({ checkCsrf: val })}
              />
            </ConfigField>

            <ConfigField
              label={t('editor.securityCheckXss', 'XSS 检测')}
              description='检测反射型/存储型跨站脚本漏洞，需开启深度扫描'
              horizontal
            >
              <Switch
                checked={options.checkXss === true}
                disabled={!deepScanEnabled}
                onCheckedChange={val => userChange({ checkXss: val })}
              />
            </ConfigField>

            <ConfigField
              label={t('editor.securityCheckSqlInjection', 'SQL 注入检测')}
              description='检测 SQL 注入漏洞（联合注入、盲注等），需开启深度扫描'
              horizontal
            >
              <Switch
                checked={options.checkSqlInjection === true}
                disabled={!deepScanEnabled}
                onCheckedChange={val => userChange({ checkSqlInjection: val })}
              />
            </ConfigField>

            <ConfigField
              label={t('editor.securityCheckSensitiveInfo', '敏感信息泄露')}
              description='检测页面/响应中是否暴露 API 密钥、内部路径、调试信息等'
              horizontal
            >
              <Switch
                checked={options.checkSensitiveInfo !== false}
                onCheckedChange={val => userChange({ checkSensitiveInfo: val })}
              />
            </ConfigField>

            <ConfigField
              label={t('editor.securityPortScan', '端口扫描')}
              description='扫描常见端口，发现暴露的数据库、管理后台等高危服务'
              horizontal
            >
              <Switch
                checked={options.enablePortScan !== false}
                onCheckedChange={val => userChange({ enablePortScan: val })}
              />
            </ConfigField>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            第三组：高级选项
            ═══════════════════════════════════════════════ */}
        <div className='p-4 bg-muted/20 rounded-lg space-y-4'>
          <GroupHeader
            icon={SlidersHorizontal}
            title='高级选项'
            description='深度扫描和辅助功能'
            className='text-muted-foreground'
          />
          <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4'>
            <ConfigField
              label={t('editor.securityDeepScan', '深度扫描')}
              description='启用 XSS/SQL 注入深度探测，耗时约 60-120 秒，会向目标发送大量探测请求'
              horizontal
            >
              <Switch
                checked={deepScanEnabled}
                onCheckedChange={val => {
                  const patch: Record<string, unknown> = { enableDeepScan: val };
                  if (val) {
                    patch.checkVulnerabilities = true;
                    patch.checkXss = true;
                    patch.checkSqlInjection = true;
                  } else {
                    patch.checkXss = false;
                    patch.checkSqlInjection = false;
                  }
                  userChange(patch);
                }}
              />
            </ConfigField>

            <ConfigField
              label={t('editor.securityScreenshot', '页面截图')}
              description='截取页面截图，用于漏洞复现辅助（纯 API 服务无需开启）'
              horizontal
            >
              <Switch
                checked={options.enableScreenshot === true}
                onCheckedChange={val => userChange({ enableScreenshot: val })}
              />
            </ConfigField>
          </div>

          {/* 深度扫描警告 */}
          {deepScanEnabled && (
            <div className='flex items-start gap-2 p-3 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'>
              <AlertTriangle className='h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0' />
              <div className='text-xs text-amber-700 dark:text-amber-300 space-y-1'>
                <p className='font-medium'>深度扫描注意事项</p>
                <ul className='list-disc list-inside space-y-0.5 text-amber-600 dark:text-amber-400'>
                  <li>会向目标发送 XSS/SQL 注入探测 payload</li>
                  <li>扫描耗时约 60-120 秒，超时上限自动调整</li>
                  <li>可能触发目标站点的 WAF/IDS 告警</li>
                  <li>建议仅对自有站点或已授权目标使用</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </ConfigSection>
  );
};
