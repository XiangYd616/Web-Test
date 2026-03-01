import {
  ChevronDown,
  GripVertical,
  PlusCircle,
  Save,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import type { CollectionItem } from '../../services/collectionApi';
import type { EnvironmentItem } from '../../services/environmentApi';
import {
  TEST_TYPE_OPTIONS,
  type FailureStrategy,
  type TestPlanStep,
  type TestType,
} from '../../services/testPlanApi';

export interface TestPlanEditorProps {
  isEditing: boolean;
  formName: string;
  formDesc: string;
  formUrl: string;
  formSteps: TestPlanStep[];
  formEnvId: string | null;
  formFailureStrategy: FailureStrategy;
  environments: EnvironmentItem[];
  collections: CollectionItem[];
  onFormNameChange: (v: string) => void;
  onFormDescChange: (v: string) => void;
  onFormUrlChange: (v: string) => void;
  onFormEnvIdChange: (v: string | null) => void;
  onFormFailureStrategyChange: (v: FailureStrategy) => void;
  onAddStep: () => void;
  onUpdateStep: (idx: number, patch: Partial<TestPlanStep>) => void;
  onRemoveStep: (idx: number) => void;
  onSmartRecommend: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const TestPlanEditor = ({
  isEditing,
  formName,
  formDesc,
  formUrl,
  formSteps,
  formEnvId,
  formFailureStrategy,
  environments,
  collections,
  onFormNameChange,
  onFormDescChange,
  onFormUrlChange,
  onFormEnvIdChange,
  onFormFailureStrategyChange,
  onAddStep,
  onUpdateStep,
  onRemoveStep,
  onSmartRecommend,
  onSave,
  onCancel,
}: TestPlanEditorProps) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className='border-b pb-4'>
        <CardTitle className='text-lg'>
          {isEditing
            ? t('testPlans.editTitle', '编辑测试计划')
            : t('testPlans.createTitle', '创建测试计划')}
        </CardTitle>
      </CardHeader>
      <CardContent className='pt-6 space-y-5'>
        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <Label>{t('testPlans.name', '计划名称')} *</Label>
            <Input
              value={formName}
              onChange={e => onFormNameChange(e.target.value)}
              placeholder='e.g. 网站全面评估'
            />
          </div>
          <div className='space-y-2'>
            <Label>{t('testPlans.url', '目标 URL')} *</Label>
            <Input
              value={formUrl}
              onChange={e => onFormUrlChange(e.target.value)}
              placeholder='https://example.com'
              className='font-mono text-sm'
            />
          </div>
        </div>
        <div className='space-y-2'>
          <Label>{t('testPlans.description', '描述')}</Label>
          <Textarea
            value={formDesc}
            onChange={e => onFormDescChange(e.target.value)}
            placeholder='可选描述'
            className='h-16'
          />
        </div>
        {environments.length > 0 && (
          <div className='space-y-2'>
            <Label>{t('testPlans.defaultEnv', '默认环境')}</Label>
            <Select
              value={formEnvId || '__none__'}
              onValueChange={v => onFormEnvIdChange(v === '__none__' ? null : v)}
            >
              <SelectTrigger className='w-[260px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__none__'>无</SelectItem>
                {environments.map(env => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* P0: 失败策略 */}
        <div className='space-y-2'>
          <Label>{t('testPlans.failureStrategy', '步骤失败策略')}</Label>
          <Select
            value={formFailureStrategy}
            onValueChange={v => onFormFailureStrategyChange(v as FailureStrategy)}
          >
            <SelectTrigger className='w-[320px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='continue'>
                {t('testPlans.strategyContinue', '继续执行 — 某步骤失败后继续后续步骤')}
              </SelectItem>
              <SelectItem value='abort'>
                {t('testPlans.strategyAbort', '立即中止 — 某步骤失败后中止整个计划')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Steps */}
        <div>
          <div className='flex items-center justify-between mb-3'>
            <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
              {t('testPlans.steps', '测试步骤')} ({formSteps.length})
            </h4>
            <div className='flex items-center gap-2'>
              <Button size='sm' variant='outline' onClick={onSmartRecommend}>
                <Sparkles className='h-3.5 w-3.5 mr-1 text-amber-500' />
                {t('testPlans.smartRecommend', '智能推荐')}
              </Button>
              <Button size='sm' variant='outline' onClick={onAddStep}>
                <PlusCircle className='h-3.5 w-3.5 mr-1' />
                {t('testPlans.addStep', '添加步骤')}
              </Button>
            </div>
          </div>

          {formSteps.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground border rounded-md border-dashed'>
              <Settings2 className='h-8 w-8 mx-auto mb-2 opacity-40' />
              <p className='text-sm'>
                {t('testPlans.noSteps', '点击"添加步骤"开始构建测试计划')}
              </p>
            </div>
          ) : (
            <div className='space-y-3'>
              {formSteps.map((step, idx) => (
                <div
                  key={step.id}
                  className='flex items-start gap-3 p-3 rounded-md border bg-card'
                >
                  <GripVertical className='h-4 w-4 mt-2 text-muted-foreground flex-shrink-0' />
                  <div className='flex-1 space-y-2'>
                    <div className='grid grid-cols-12 gap-2'>
                      <div className='col-span-4'>
                        <Select
                          value={step.type}
                          onValueChange={v =>
                            onUpdateStep(idx, {
                              type: v as TestType,
                              name: TEST_TYPE_OPTIONS.find(o => o.value === v)?.label || '',
                            })
                          }
                        >
                          <SelectTrigger className='h-8 text-xs'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TEST_TYPE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className='col-span-5'>
                        <Input
                          className='h-8 text-xs'
                          value={step.name}
                          onChange={e => onUpdateStep(idx, { name: e.target.value })}
                          placeholder='步骤名称'
                        />
                      </div>
                      <div className='col-span-3 flex items-center gap-1'>
                        <Input
                          className='h-8 text-xs font-mono'
                          value={step.url || ''}
                          onChange={e => onUpdateStep(idx, { url: e.target.value })}
                          placeholder='覆盖 URL'
                        />
                      </div>
                    </div>
                    {step.type === 'api' && (
                      <div className='flex items-center gap-2'>
                        <Label className='text-xs whitespace-nowrap'>API 集合:</Label>
                        <Select
                          value={step.collectionId || '__none__'}
                          onValueChange={v =>
                            onUpdateStep(idx, {
                              collectionId: v === '__none__' ? undefined : v,
                            })
                          }
                        >
                          <SelectTrigger className='h-7 text-xs flex-1'>
                            <SelectValue placeholder='选择集合' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='__none__'>无</SelectItem>
                            {collections.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* 内联配置面板（可折叠） */}
                    <details className='group'>
                      <summary className='flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground select-none'>
                        <ChevronDown className='h-3 w-3 transition-transform group-open:rotate-180' />
                        {t('testPlans.stepConfig', '步骤配置')}
                        {step.config.timeout ? ` · ${Number(step.config.timeout)}ms` : ''}
                      </summary>
                      <div className='mt-2 p-2.5 rounded-md bg-muted/30 border border-dashed space-y-2'>
                        <div className='grid grid-cols-2 gap-2'>
                          <div>
                            <Label className='text-[10px] text-muted-foreground'>
                              Timeout (ms)
                            </Label>
                            <Input
                              type='number'
                              className='h-7 text-xs'
                              value={Number(step.config.timeout ?? 30000)}
                              onChange={e =>
                                onUpdateStep(idx, {
                                  config: {
                                    ...step.config,
                                    timeout: Number(e.target.value) || 30000,
                                  },
                                })
                              }
                            />
                          </div>
                          {step.type === 'performance' && (
                            <div>
                              <Label className='text-[10px] text-muted-foreground'>
                                Iterations
                              </Label>
                              <Input
                                type='number'
                                className='h-7 text-xs'
                                value={Number(step.config.iterations ?? 3)}
                                onChange={e =>
                                  onUpdateStep(idx, {
                                    config: {
                                      ...step.config,
                                      iterations: Number(e.target.value) || 1,
                                    },
                                  })
                                }
                              />
                            </div>
                          )}
                          {step.type === 'stress' && (
                            <>
                              <div>
                                <Label className='text-[10px] text-muted-foreground'>
                                  Users
                                </Label>
                                <Input
                                  type='number'
                                  className='h-7 text-xs'
                                  value={Number(step.config.users ?? 50)}
                                  onChange={e =>
                                    onUpdateStep(idx, {
                                      config: {
                                        ...step.config,
                                        users: Number(e.target.value) || 1,
                                      },
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <Label className='text-[10px] text-muted-foreground'>
                                  Duration (s)
                                </Label>
                                <Input
                                  type='number'
                                  className='h-7 text-xs'
                                  value={Number(step.config.duration ?? 60)}
                                  onChange={e =>
                                    onUpdateStep(idx, {
                                      config: {
                                        ...step.config,
                                        duration: Number(e.target.value) || 10,
                                      },
                                    })
                                  }
                                />
                              </div>
                            </>
                          )}
                          {step.type === 'security' && (
                            <div>
                              <Label className='text-[10px] text-muted-foreground'>
                                Deep Scan
                              </Label>
                              <Select
                                value={step.config.enableDeepScan ? 'true' : 'false'}
                                onValueChange={v =>
                                  onUpdateStep(idx, {
                                    config: {
                                      ...step.config,
                                      enableDeepScan: v === 'true',
                                    },
                                  })
                                }
                              >
                                <SelectTrigger className='h-7 text-xs'>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value='false'>Off</SelectItem>
                                  <SelectItem value='true'>On</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          {step.type === 'ux' && (
                            <div>
                              <Label className='text-[10px] text-muted-foreground'>
                                Iterations
                              </Label>
                              <Input
                                type='number'
                                className='h-7 text-xs'
                                value={Number(step.config.iterations ?? 3)}
                                onChange={e =>
                                  onUpdateStep(idx, {
                                    config: {
                                      ...step.config,
                                      iterations: Number(e.target.value) || 1,
                                    },
                                  })
                                }
                              />
                            </div>
                          )}
                        </div>
                        {/* 环境选择 */}
                        {environments.length > 0 && (
                          <div>
                            <Label className='text-[10px] text-muted-foreground'>
                              {t('testPlans.environment', '环境')}
                            </Label>
                            <Select
                              value={step.environmentId || '__inherit__'}
                              onValueChange={v =>
                                onUpdateStep(idx, {
                                  environmentId: v === '__inherit__' ? undefined : v,
                                })
                              }
                            >
                              <SelectTrigger className='h-7 text-xs'>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='__inherit__'>
                                  {t('testPlans.inheritEnv', '继承计划默认')}
                                </SelectItem>
                                {environments.map(env => (
                                  <SelectItem key={env.id} value={env.id}>
                                    {env.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                  <Button
                    size='icon'
                    variant='ghost'
                    className='h-7 w-7 text-muted-foreground hover:text-red-600 flex-shrink-0'
                    onClick={() => onRemoveStep(idx)}
                  >
                    <X className='h-3.5 w-3.5' />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='flex gap-2 pt-2'>
          <Button
            onClick={onSave}
            disabled={!formName.trim() || !formUrl.trim()}
          >
            <Save className='h-4 w-4 mr-1' />
            {isEditing ? t('common.save') : t('testPlans.create', '新建计划')}
          </Button>
          <Button variant='ghost' onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestPlanEditor;
