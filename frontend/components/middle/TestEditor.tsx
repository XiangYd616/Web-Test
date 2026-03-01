import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Code2,
  FileJson,
  History,
  KeyRound,
  List,
  Save,
  Settings2,
  Variable,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  TEST_TYPE_LABELS,
  useTestConfig,
  useTestEnvironment,
  useTestTemplates,
} from '../../context/TestContext';
import { isDesktop } from '../../utils/environment';
import { trackCounter } from '../../utils/telemetry';
import {
  TEST_TYPE_SCHEMAS,
  buildFormValues,
  setConfigValueByPath,
} from '../../utils/testConfigSchema';
import { extractTemplateVarNames } from '../../utils/url';
import JsonEditor from './JsonEditor';
import TestTypeCardSelector from './TestTypeCardSelector';
import { AccessibilityConfigPanel } from './config-panels/AccessibilityConfigPanel';
import { ApiConfigPanel } from './config-panels/ApiConfigPanel';
import { CompatibilityConfigPanel } from './config-panels/CompatibilityConfigPanel';
import { HistoryConfigPanel } from './config-panels/HistoryConfigPanel';
import { PerformanceConfigPanel } from './config-panels/PerformanceConfigPanel';
import { SchemaConfigPanel } from './config-panels/SchemaConfigPanel';
import { SecurityConfigPanel } from './config-panels/SecurityConfigPanel';
import { SeoConfigPanel } from './config-panels/SeoConfigPanel';
import { StressConfigPanel } from './config-panels/StressConfigPanel';
import { UxConfigPanel } from './config-panels/UxConfigPanel';
import { WebsiteConfigPanel } from './config-panels/WebsiteConfigPanel';
import { AdvancedPanel } from './config-ui/AdvancedPanel';
import { AdvancedSettingsSection } from './config-ui/AdvancedSettingsSection';
import { AuthPanel } from './config-ui/AuthPanel';
import { HeadersPanel } from './config-ui/HeadersPanel';
import { RequestSettingsSection } from './config-ui/RequestSettingsSection';

const TestEditor = () => {
  const {
    selectedType,
    testTypes,
    configText,
    requestMeta,
    apiTestMeta,
    historyMeta,
    advancedSettings,
    isProcessing,
    selectedTemplateId,
    progressInfo,
    selectTestType,
    selectTemplate,
    clearTemplate,
    updateRequestMeta,
    updateApiTestMeta,
    updateHistoryMeta,
    updateAdvancedSettings,
    applyPreset,
    updateConfigText,
  } = useTestConfig();
  const { templates, createTemplate } = useTestTemplates();
  const { selectedEnvId, setSelectedEnvId, environments, resolvedVariables } = useTestEnvironment();
  const { t } = useTranslation();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveAsTemplate = useCallback(async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      let config: Record<string, unknown>;
      try {
        config = JSON.parse(configText);
      } catch {
        config = { raw: configText };
      }
      await createTemplate({
        name: saveName.trim(),
        description: saveDesc.trim() || undefined,
        engineType: selectedType,
        config,
        isPublic: false,
        isDefault: false,
      });
      toast.success(t('templates.saveSuccess'));
      setSaveDialogOpen(false);
      setSaveName('');
      setSaveDesc('');
    } catch (error) {
      toast.error((error as Error).message || t('templates.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [saveName, saveDesc, configText, selectedType, createTemplate, t]);

  const isElectron = isDesktop();

  // 全局快捷键：Ctrl+S 打开"保存为模板"对话框（类似 Postman 的 Ctrl+S 保存请求）
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setSaveName('');
        setSaveDesc('');
        setSaveDialogOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const [activePreset, setActivePreset] = useState<'High' | 'Fast' | null>(null);
  const [activeTab, setActiveTab] = useState('config');
  const [displayProgress, setDisplayProgress] = useState(0);
  const activeTemplate = useMemo(
    () => templates.find(item => item.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );
  const templateOptions = useMemo(
    () =>
      templates.map(item => ({
        id: item.id,
        label: `${item.name} · ${t(TEST_TYPE_LABELS[item.engineType] ?? item.engineType)}`,
      })),
    [t, templates]
  );
  const resolvedProgress =
    typeof progressInfo?.progress === 'number' ? progressInfo.progress : null;
  const rafRef = useRef(0);

  // ── 模板变量联动 ──
  const templateVarNames = useMemo(() => extractTemplateVarNames(configText), [configText]);
  const varStatus = useMemo(() => {
    if (templateVarNames.length === 0) return null;
    const resolved: string[] = [];
    const missing: string[] = [];
    for (const name of templateVarNames) {
      if (name in resolvedVariables && resolvedVariables[name]) {
        resolved.push(name);
      } else {
        missing.push(name);
      }
    }
    return { resolved, missing };
  }, [templateVarNames, resolvedVariables]);

  useEffect(() => {
    if (!isProcessing) {
      setDisplayProgress(0);
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const target = Math.min(100, Math.max(0, resolvedProgress ?? 0));
    // 平滑插值到后端推送的真实进度值
    const animate = () => {
      setDisplayProgress(prev => {
        if (Math.abs(prev - target) < 0.5) return target;
        const step = Math.max(0.3, Math.abs(target - prev) * 0.15);
        const next = prev < target ? Math.min(target, prev + step) : Math.max(target, prev - step);
        if (Math.abs(next - target) >= 0.5) {
          rafRef.current = requestAnimationFrame(animate);
        }
        return next;
      });
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isProcessing, resolvedProgress]);
  const progressValue = Math.round(Math.min(100, Math.max(0, displayProgress)));
  const parsedConfig = useMemo(() => {
    try {
      return JSON.parse(configText) as Record<string, unknown>;
    } catch {
      return {} as Record<string, unknown>;
    }
  }, [configText]);
  const activeSchema = useMemo(() => TEST_TYPE_SCHEMAS[selectedType] ?? null, [selectedType]);
  const schemaValues = useMemo(
    () => (activeSchema ? buildFormValues(activeSchema, parsedConfig) : {}),
    [activeSchema, parsedConfig]
  );
  const options = useMemo(() => {
    const raw = parsedConfig.options;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }
    return {} as Record<string, unknown>;
  }, [parsedConfig.options]);

  const updateOptions = useCallback(
    (patch: Record<string, unknown>) => {
      trackCounter('config.form_edit', { throttleMs: 500 });
      const nextConfig = {
        ...parsedConfig,
        options: {
          ...options,
          ...patch,
        },
      };
      updateConfigText(JSON.stringify(nextConfig, null, 2));
    },
    [options, parsedConfig, updateConfigText]
  );
  const updateSchemaField = useCallback(
    (path: string[], value: unknown) => {
      trackCounter('config.schema_edit', { throttleMs: 500 });
      const nextConfig = setConfigValueByPath(parsedConfig, path, value);
      updateConfigText(JSON.stringify(nextConfig, null, 2));
    },
    [parsedConfig, updateConfigText]
  );

  const TEST_TYPE_DESCRIPTIONS: Record<string, string> = useMemo(
    () => ({
      performance: t('editor.perfDesc', '测量页面加载速度、Web Vitals 核心指标和资源分布'),
      security: t('editor.secDesc', '扫描 SSL/TLS、HTTP 头、XSS/SQLi 漏洞和安全最佳实践'),
      seo: t('editor.seoDesc', '审计 Meta 标签、结构化数据、移动端优化和内容质量'),
      stress: t('editor.stressDesc', '模拟并发用户负载，测试系统吞吐量和响应时间'),
      compatibility: t('editor.compatDesc', '跨浏览器和设备兼容性检测，支持特性检测和截图对比'),
      accessibility: t(
        'editor.a11yDesc',
        '依据 WCAG 标准检查页面可访问性，包含键盘导航和屏幕阅读器'
      ),
      ux: t('editor.uxDesc', '真实浏览器采集用户体验指标，包含交互延迟和视觉稳定性'),
      website: t('editor.websiteDesc', '一站式综合测试：性能 + 安全 + SEO + 可访问性'),
      api: t('editor.apiDesc', '接口功能测试：请求/响应验证、状态码检查和 Schema 校验'),
    }),
    [t]
  );

  // 需要请求设置区块的测试类型（api/stress/website 已自带，accessibility/compatibility 不需要）
  const needsRequestSection = ['performance', 'security', 'seo', 'ux'].includes(selectedType);
  const enabledHeaderCount = requestMeta.headers.filter(h => h.enabled && h.key).length;

  const tabs = [
    { value: 'config', label: t('editor.config'), icon: Settings2 },
    { value: 'history', label: t('editor.history'), icon: History },
  ];

  // 桌面端 Postman 风格多 Tab（紧贴 URL 栏下方）
  const desktopTabs = useMemo(() => {
    const base = [
      { value: 'config', label: t('editor.config', '测试配置'), icon: Settings2 },
      {
        value: 'auth',
        label: t('editor.auth', '认证'),
        icon: KeyRound,
        badge: requestMeta.authType !== 'none' ? '✓' : undefined,
      },
      {
        value: 'headers',
        label: t('editor.headers', '请求头'),
        icon: List,
        badge: enabledHeaderCount > 0 ? String(enabledHeaderCount) : undefined,
      },
      { value: 'json', label: 'JSON', icon: FileJson },
      { value: 'advanced', label: t('editor.advanced', '高级'), icon: Code2 },
    ];
    if (templateVarNames.length > 0) {
      base.push({
        value: 'variables',
        label: t('editor.variables', '变量'),
        icon: Variable,
        badge: varStatus?.missing.length ? String(varStatus.missing.length) : undefined,
      });
    }
    base.push({
      value: 'history',
      label: t('editor.history', '历史'),
      icon: History,
      badge: undefined,
    });
    return base;
  }, [
    t,
    requestMeta.authType,
    enabledHeaderCount,
    templateVarNames.length,
    varStatus?.missing.length,
  ]);

  return (
    <TooltipProvider>
      <div className='rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-4'>
        {isElectron ? (
          TEST_TYPE_DESCRIPTIONS[selectedType] && (
            <p className='text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2 border border-border/50'>
              <Clock className='inline h-3 w-3 mr-1.5 -mt-0.5' />
              {TEST_TYPE_DESCRIPTIONS[selectedType]}
            </p>
          )
        ) : (
          <>
            <TestTypeCardSelector
              testTypes={testTypes}
              selectedType={selectedType}
              onSelect={selectTestType}
            />
            {TEST_TYPE_DESCRIPTIONS[selectedType] && (
              <p className='text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2 border border-border/50'>
                <Clock className='inline h-3 w-3 mr-1.5 -mt-0.5' />
                {TEST_TYPE_DESCRIPTIONS[selectedType]}
              </p>
            )}
          </>
        )}

        {!isElectron && (
          <div className='flex items-center gap-2'>
            <Label htmlFor='test-template' className='shrink-0 text-xs'>
              {t('editor.template')}
            </Label>
            <Select
              value={selectedTemplateId ?? 'none'}
              onValueChange={value => {
                if (value === 'none') {
                  clearTemplate();
                  return;
                }
                selectTemplate(value);
              }}
            >
              <SelectTrigger id='test-template' className='w-[220px]'>
                <SelectValue placeholder={t('editor.templatePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>{t('editor.templatePlaceholder')}</SelectItem>
                {templateOptions.map(option => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplateId && (
              <Button type='button' variant='ghost' size='sm' onClick={() => clearTemplate()}>
                {t('editor.templateClear')}
              </Button>
            )}
            {activeTemplate && (
              <span className='text-xs text-muted-foreground truncate max-w-[200px]'>
                {activeTemplate.description}
              </span>
            )}
          </div>
        )}

        {/* 模板变量联动面板 */}
        {varStatus && templateVarNames.length > 0 && (
          <div className='rounded-md border p-3 space-y-2 bg-muted/20'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-medium text-muted-foreground'>
                {t('editor.templateVars', '模板变量')}
                <span className='ml-1 opacity-60'>({templateVarNames.length})</span>
              </span>
              <Select
                value={selectedEnvId ?? '__none__'}
                onValueChange={v => setSelectedEnvId(v === '__none__' ? null : v)}
              >
                <SelectTrigger className='h-7 w-[180px] text-xs'>
                  <SelectValue placeholder={t('editor.selectEnv', '选择环境')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none__'>{t('editor.noEnv', '无环境')}</SelectItem>
                  {environments.map(env => (
                    <SelectItem key={env.id} value={env.id}>
                      {env.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex flex-wrap gap-1.5'>
              {varStatus.resolved.map(name => (
                <span
                  key={name}
                  className='inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20'
                  title={`${name} = ${resolvedVariables[name]}`}
                >
                  <CheckCircle2 className='h-3 w-3' />
                  {name}
                </span>
              ))}
              {varStatus.missing.map(name => (
                <span
                  key={name}
                  className='inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20'
                  title={t('editor.varMissing', { name, defaultValue: `变量 ${name} 未定义` })}
                >
                  <AlertTriangle className='h-3 w-3' />
                  {name}
                </span>
              ))}
            </div>
            {varStatus.missing.length > 0 && (
              <p className='text-[11px] text-destructive/80'>
                {t('editor.varMissingHint', {
                  count: varStatus.missing.length,
                  defaultValue: `${varStatus.missing.length} 个变量未定义，请选择包含这些变量的环境，或前往「环境管理」添加`,
                })}
              </p>
            )}
          </div>
        )}

        {isProcessing && (
          <div
            className='test-progress-bar'
            role='progressbar'
            aria-valuenow={progressValue}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('editor.progress')}
          >
            <div className='progress-meta'>
              <span>{t('editor.progress')}</span>
              <span>{progressValue}%</span>
            </div>
            <div className='progress-track'>
              <div
                className='progress-fill'
                data-progress={
                  progressValue < 30
                    ? 'low'
                    : progressValue < 60
                      ? 'mid'
                      : progressValue < 90
                        ? 'high'
                        : 'done'
                }
                style={{ width: `${progressValue}%` }}
              />
            </div>
            {progressInfo?.currentStep && (
              <div className='progress-step' aria-live='polite'>
                {t('editor.currentStep')}: {progressInfo.currentStep}
              </div>
            )}
          </div>
        )}

        <div className='flex justify-start gap-2 pt-3 border-t'>
          <Button
            variant={activePreset === 'High' ? 'default' : 'outline'}
            size='sm'
            onClick={() => {
              applyPreset('High');
              setActivePreset('High');
            }}
          >
            {t('editor.presetHigh', '高质量')}
          </Button>
          <Button
            variant={activePreset === 'Fast' ? 'default' : 'outline'}
            size='sm'
            onClick={() => {
              applyPreset('Fast');
              setActivePreset('Fast');
            }}
          >
            {t('editor.presetFast', '快速模式')}
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              applyPreset('Custom');
              setActivePreset(null);
            }}
          >
            {t('editor.resetConfig', '重置')}
          </Button>
          <div className='flex-1' />
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              setSaveName('');
              setSaveDesc('');
              setSaveDialogOpen(true);
            }}
          >
            <Save className='h-3.5 w-3.5 mr-1' />
            {t('templates.saveCurrentBtn')}
          </Button>
        </div>

        {isElectron ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className='tw-postman-tabs'>
            <TabsList className='tw-postman-tabs-list'>
              {desktopTabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.value} value={tab.value} className='tw-postman-tab'>
                    <Icon className='h-3 w-3' />
                    <span>{tab.label}</span>
                    {tab.badge && <span className='tw-postman-tab-badge'>{tab.badge}</span>}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value='config' className='tw-postman-tab-content'>
              {selectedType === 'api' && (
                <ApiConfigPanel meta={apiTestMeta} onChange={updateApiTestMeta} />
              )}
              {activeSchema && selectedType !== 'api' && (
                <SchemaConfigPanel
                  schema={activeSchema}
                  values={schemaValues}
                  onChange={updateSchemaField}
                />
              )}
              {!activeSchema && selectedType === 'performance' && (
                <PerformanceConfigPanel options={options} onChange={updateOptions} />
              )}
              {selectedType === 'security' && (
                <SecurityConfigPanel options={options} onChange={updateOptions} />
              )}
              {selectedType === 'seo' && (
                <SeoConfigPanel options={options} onChange={updateOptions} />
              )}
              {selectedType === 'stress' && (
                <StressConfigPanel options={options} onChange={updateOptions} />
              )}
              {selectedType === 'compatibility' && (
                <CompatibilityConfigPanel options={options} onChange={updateOptions} />
              )}
              {selectedType === 'accessibility' && (
                <AccessibilityConfigPanel options={options} onChange={updateOptions} />
              )}
              {selectedType === 'ux' && (
                <UxConfigPanel options={options} onChange={updateOptions} />
              )}
              {selectedType === 'website' && (
                <WebsiteConfigPanel options={options} onChange={updateOptions} />
              )}
            </TabsContent>

            <TabsContent value='auth' className='tw-postman-tab-content'>
              <AuthPanel requestMeta={requestMeta} onChange={updateRequestMeta} />
            </TabsContent>

            <TabsContent value='headers' className='tw-postman-tab-content'>
              <HeadersPanel requestMeta={requestMeta} onChange={updateRequestMeta} />
            </TabsContent>

            <TabsContent value='json' className='tw-postman-tab-content'>
              <JsonEditor />
            </TabsContent>

            <TabsContent value='advanced' className='tw-postman-tab-content'>
              <AdvancedPanel settings={advancedSettings} onChange={updateAdvancedSettings} />
            </TabsContent>

            {templateVarNames.length > 0 && (
              <TabsContent value='variables' className='tw-postman-tab-content'>
                <div className='space-y-3 py-2'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs font-medium text-muted-foreground'>
                      {t('editor.templateVars', '模板变量')}
                      <span className='ml-1 opacity-60'>({templateVarNames.length})</span>
                    </span>
                    <Select
                      value={selectedEnvId ?? '__none__'}
                      onValueChange={v => setSelectedEnvId(v === '__none__' ? null : v)}
                    >
                      <SelectTrigger className='h-7 w-[180px] text-xs'>
                        <SelectValue placeholder={t('editor.selectEnv', '选择环境')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='__none__'>{t('editor.noEnv', '无环境')}</SelectItem>
                        {environments.map(env => (
                          <SelectItem key={env.id} value={env.id}>
                            {env.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='flex flex-wrap gap-1.5'>
                    {varStatus?.resolved.map(name => (
                      <span
                        key={name}
                        className='inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20'
                        title={`${name} = ${resolvedVariables[name]}`}
                      >
                        <CheckCircle2 className='h-3 w-3' />
                        {name}
                      </span>
                    ))}
                    {varStatus?.missing.map(name => (
                      <span
                        key={name}
                        className='inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20'
                        title={t('editor.varMissing', {
                          name,
                          defaultValue: `变量 ${name} 未定义`,
                        })}
                      >
                        <AlertTriangle className='h-3 w-3' />
                        {name}
                      </span>
                    ))}
                  </div>
                  {varStatus && varStatus.missing.length > 0 && (
                    <p className='text-[11px] text-destructive/80'>
                      {t('editor.varMissingHint', {
                        count: varStatus.missing.length,
                        defaultValue: `${varStatus.missing.length} 个变量未定义，请选择包含这些变量的环境，或前往「环境管理」添加`,
                      })}
                    </p>
                  )}
                </div>
              </TabsContent>
            )}

            <TabsContent value='history' className='tw-postman-tab-content'>
              <HistoryConfigPanel historyMeta={historyMeta} onChange={updateHistoryMeta} />
            </TabsContent>
          </Tabs>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.value} value={tab.value} className='gap-1.5'>
                    <Icon className='h-3.5 w-3.5' />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value='config' className='mt-4 space-y-4'>
              {selectedType === 'api' && (
                <ApiConfigPanel meta={apiTestMeta} onChange={updateApiTestMeta} />
              )}
              {activeSchema && selectedType !== 'api' && (
                <SchemaConfigPanel
                  schema={activeSchema}
                  values={schemaValues}
                  onChange={updateSchemaField}
                />
              )}
              {!activeSchema && selectedType === 'performance' && (
                <PerformanceConfigPanel options={options} onChange={updateOptions} />
              )}
              {selectedType === 'security' && (
                <SecurityConfigPanel options={options} onChange={updateOptions} />
              )}
              {selectedType === 'seo' && (
                <SeoConfigPanel options={options} onChange={updateOptions} />
              )}
              {selectedType === 'stress' && (
                <StressConfigPanel options={options} onChange={updateOptions} />
              )}
              {selectedType === 'compatibility' && (
                <CompatibilityConfigPanel options={options} onChange={updateOptions} />
              )}
              {selectedType === 'accessibility' && (
                <AccessibilityConfigPanel options={options} onChange={updateOptions} />
              )}
              {selectedType === 'ux' && (
                <UxConfigPanel options={options} onChange={updateOptions} />
              )}
              {selectedType === 'website' && (
                <WebsiteConfigPanel options={options} onChange={updateOptions} />
              )}
              <JsonEditor />
              {needsRequestSection && (
                <RequestSettingsSection requestMeta={requestMeta} onChange={updateRequestMeta} />
              )}
              <AdvancedSettingsSection
                settings={advancedSettings}
                onChange={updateAdvancedSettings}
              />
            </TabsContent>

            <TabsContent value='history' className='mt-4 space-y-4'>
              <HistoryConfigPanel historyMeta={historyMeta} onChange={updateHistoryMeta} />
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent className='max-w-sm'>
            <DialogHeader>
              <DialogTitle>{t('templates.saveCurrentTitle')}</DialogTitle>
            </DialogHeader>
            <div className='space-y-3'>
              <div className='space-y-1.5'>
                <Label>{t('templates.saveCurrentName')}</Label>
                <Input
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder={t('templates.name')}
                  autoFocus
                />
              </div>
              <div className='space-y-1.5'>
                <Label>{t('templates.saveCurrentDesc')}</Label>
                <Input
                  value={saveDesc}
                  onChange={e => setSaveDesc(e.target.value)}
                  placeholder={t('templates.descriptionOptional')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => void handleSaveAsTemplate()}
                disabled={!saveName.trim() || saving}
              >
                {t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default TestEditor;
