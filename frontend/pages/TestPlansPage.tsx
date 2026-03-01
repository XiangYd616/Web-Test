import {
  AlertTriangle,
  Ban,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Edit2,
  Filter,
  Globe,
  Info,
  Loader2,
  Play,
  Plus,
  Search,
  Square,
  Timer,
  Trash2,
  XCircle,
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import EmptyState from '../components/EmptyState';
import RadarChart from '../components/testplans/RadarChart';
import ScoreBadge from '../components/testplans/ScoreBadge';
import TestPlanEditor from '../components/testplans/TestPlanEditor';
import { useTestWorkspace } from '../context/TestContext';
import { listCollections, type CollectionItem } from '../services/collectionApi';
import { listEnvironments, type EnvironmentItem } from '../services/environmentApi';
import {
  cancelTestPlanExecution,
  createTestPlan,
  deleteTestPlan,
  executeTestPlan,
  getTestPlan,
  getTestPlanExecution,
  getTestPlanReport,
  listTestPlanExecutions,
  listTestPlans,
  updateTestPlan,
  type CreateTestPlanPayload,
  type FailureStrategy,
  type TestPlanExecution,
  type TestPlanItem,
  type TestPlanReport,
  type TestPlanStep,
  type TestType,
} from '../services/testPlanApi';

// ─── 主页面 ───

const TestPlansContent = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceId } = useTestWorkspace();

  // 列表
  const [plans, setPlans] = useState<TestPlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 选中
  const [selected, setSelected] = useState<TestPlanItem | null>(null);

  // 创建/编辑
  const [showEditor, setShowEditor] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TestPlanItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formSteps, setFormSteps] = useState<TestPlanStep[]>([]);
  const [formEnvId, setFormEnvId] = useState<string | null>(null);
  const [formFailureStrategy, setFormFailureStrategy] = useState<FailureStrategy>('continue');

  // 删除
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // 执行
  const [executions, setExecutions] = useState<TestPlanExecution[]>([]);
  const [activeExecution, setActiveExecution] = useState<TestPlanExecution | null>(null);
  const [report, setReport] = useState<TestPlanReport | null>(null);
  const [executing, setExecuting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // P1: 执行历史过滤
  const [execStatusFilter, setExecStatusFilter] = useState<string>('all');

  // 资源列表
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [environments, setEnvironments] = useState<EnvironmentItem[]>([]);

  // ─── 数据加载 ───

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const list = await listTestPlans({ workspaceId });
      setPlans(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!workspaceId) return;
    let ignore = false;
    void Promise.all([listCollections({ workspaceId }), listEnvironments(workspaceId)]).then(
      ([cols, envs]) => {
        if (ignore) return;
        setCollections(Array.isArray(cols) ? cols : []);
        setEnvironments(Array.isArray(envs) ? envs : []);
      }
    );
    return () => {
      ignore = true;
    };
  }, [workspaceId]);

  // ─── 选中计划 ───

  const handleSelect = async (id: string) => {
    try {
      const detail = await getTestPlan(id);
      setSelected(detail);
      setReport(null);
      setActiveExecution(null);
      const execs = await listTestPlanExecutions({ planId: id, limit: 10 });
      setExecutions(execs);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // ─── 创建/编辑 ───

  const openCreate = () => {
    setEditingPlan(null);
    setFormName('');
    setFormDesc('');
    setFormUrl('');
    setFormSteps([]);
    setFormEnvId(null);
    setFormFailureStrategy('continue');
    setShowEditor(true);
  };

  const openEdit = () => {
    if (!selected) return;
    setEditingPlan(selected);
    setFormName(selected.name);
    setFormDesc(selected.description);
    setFormUrl(selected.url);
    setFormSteps([...selected.steps]);
    setFormEnvId(selected.defaultEnvironmentId || null);
    setFormFailureStrategy(selected.failureStrategy || 'continue');
    setShowEditor(true);
  };

  const addStep = () => {
    setFormSteps(prev => [
      ...prev,
      {
        id: `step-${Date.now()}`,
        type: 'performance' as TestType,
        name: '',
        url: '',
        enabled: true,
        sortOrder: prev.length,
        config: {},
      },
    ]);
  };

  const updateStep = (idx: number, patch: Partial<TestPlanStep>) => {
    setFormSteps(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeStep = (idx: number) => {
    setFormSteps(prev => prev.filter((_, i) => i !== idx));
  };

  /** AI 辅助：基于 URL 特征自动推荐测试步骤 */
  const smartRecommend = () => {
    if (!formUrl.trim()) {
      toast.error(t('testPlans.urlRequiredForRecommend', '请先输入目标 URL'));
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(formUrl.trim());
    } catch {
      toast.error(t('testPlans.invalidUrl', 'URL 格式无效'));
      return;
    }

    const steps: TestPlanStep[] = [];
    let idx = 0;
    const add = (type: TestType, name: string, config: Record<string, unknown> = {}) => {
      steps.push({
        id: `step-${Date.now()}-${idx}`,
        type,
        name,
        url: '',
        enabled: true,
        sortOrder: idx++,
        config: { timeout: 30000, ...config },
      });
    };

    const isHttps = parsed.protocol === 'https:';
    const isApi = /\/(api|graphql|v\d)\b/i.test(parsed.pathname);
    const isEcommerce = /shop|store|cart|product|checkout/i.test(parsed.href);
    const isLogin = /login|auth|signin|register/i.test(parsed.pathname);

    // 所有网站都推荐性能测试
    add('performance', t('testPlans.stepPerformance', '性能基准测试'), { iterations: 3 });

    // 安全扫描（HTTPS 站点深度扫描，HTTP 站点基础扫描）
    add('security', t('testPlans.stepSecurity', '安全扫描'), {
      checkSSL: isHttps,
      checkHeaders: true,
      checkVulnerabilities: true,
      enableDeepScan: isLogin || isEcommerce,
    });

    // SEO（非 API 站点）
    if (!isApi) {
      add('seo', t('testPlans.stepSeo', 'SEO 检查'), {
        checkSEO: true,
        checkMobile: true,
        checkBestPractices: true,
      });
    }

    // 无障碍（非 API 站点）
    if (!isApi) {
      add('accessibility', t('testPlans.stepAccessibility', '无障碍检测'), { level: 'AA' });
    }

    // API 测试（API 路径）
    if (isApi) {
      add('api', t('testPlans.stepApi', 'API 接口测试'));
    }

    // 兼容性（面向用户的站点）
    if (!isApi) {
      add('compatibility', t('testPlans.stepCompatibility', '兼容性测试'), {
        browsers: [{ name: 'Chrome' }, { name: 'Safari' }, { name: 'Firefox' }],
        devices: [{ name: 'Desktop' }, { name: 'iPhone 15' }],
      });
    }

    // UX（面向用户的站点）
    if (!isApi) {
      add('ux', t('testPlans.stepUx', '用户体验测试'), { iterations: 2 });
    }

    // 压力测试（电商/登录页面）
    if (isEcommerce || isLogin) {
      add('stress', t('testPlans.stepStress', '压力测试'), { users: 50, duration: 30 });
    }

    setFormSteps(steps);
    if (!formName.trim()) {
      setFormName(
        t('testPlans.fullTestName', { host: parsed.hostname, defaultValue: '{{host}} 全面测试' })
      );
    }
    toast.success(t('testPlans.recommended', `已推荐 ${steps.length} 个测试步骤`));
  };

  const handleSave = async () => {
    if (!formName.trim() || !formUrl.trim()) {
      toast.error(t('testPlans.nameUrlRequired', '请填写计划名称和目标 URL'));
      return;
    }
    try {
      if (editingPlan) {
        const updated = await updateTestPlan(editingPlan.id, {
          name: formName.trim(),
          description: formDesc.trim(),
          url: formUrl.trim(),
          steps: formSteps,
          defaultEnvironmentId: formEnvId,
          failureStrategy: formFailureStrategy,
        });
        setSelected(updated);
        toast.success(t('testPlans.updated', '测试计划已更新'));
      } else {
        const payload: CreateTestPlanPayload = {
          name: formName.trim(),
          description: formDesc.trim(),
          url: formUrl.trim(),
          steps: formSteps,
          defaultEnvironmentId: formEnvId,
          workspaceId: workspaceId || undefined,
          failureStrategy: formFailureStrategy,
        };
        const created = await createTestPlan(payload);
        setSelected(created);
        toast.success(t('testPlans.created', '测试计划已创建'));
      }
      setShowEditor(false);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // ─── 删除 ───

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTestPlan(deleteTarget.id);
      if (selected?.id === deleteTarget.id) {
        setSelected(null);
        setExecutions([]);
        setReport(null);
      }
      await refresh();
      toast.success(t('testPlans.deleted', '测试计划已删除'));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleteTarget(null);
    }
  };

  // ─── 执行 ───

  const handleExecute = async () => {
    if (!selected) return;
    setExecuting(true);
    try {
      const exec = await executeTestPlan(selected.id, {
        environmentId: selected.defaultEnvironmentId || undefined,
        workspaceId: workspaceId || undefined,
      });
      setActiveExecution(exec);
      setReport(null);
      toast.success(t('testPlans.executionStarted', '测试计划已开始执行'));

      // 轮询执行状态
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const updated = await getTestPlanExecution(exec.id);
          setActiveExecution(updated);
          if (
            updated.status === 'completed' ||
            updated.status === 'failed' ||
            updated.status === 'cancelled'
          ) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setExecuting(false);
            if (updated.status === 'completed') {
              const rpt = await getTestPlanReport(updated.id);
              setReport(rpt);
              toast.success(t('testPlans.executionCompleted', '测试计划执行完成'));
            } else {
              toast.error(t('testPlans.executionFailed', '测试计划执行失败'));
            }
            // 刷新执行列表
            const execs = await listTestPlanExecutions({ planId: selected.id, limit: 10 });
            setExecutions(execs);
          }
        } catch {
          // 轮询失败时静默
        }
      }, 3000);
    } catch (e) {
      toast.error((e as Error).message);
      setExecuting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleViewReport = async (executionId: string) => {
    try {
      const exec = await getTestPlanExecution(executionId);
      setActiveExecution(exec);
      if (exec.status === 'completed') {
        const rpt = await getTestPlanReport(executionId);
        setReport(rpt);
      } else {
        setReport(null);
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // P2: 取消执行
  const handleCancel = async () => {
    if (!activeExecution) return;
    try {
      await cancelTestPlanExecution(activeExecution.id);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setExecuting(false);
      const updated = await getTestPlanExecution(activeExecution.id);
      setActiveExecution(updated);
      toast.success(t('testPlans.executionCancelled', '执行已取消'));
      if (selected) {
        const execs = await listTestPlanExecutions({ planId: selected.id, limit: 10 });
        setExecutions(execs);
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // ─── 过滤 ───

  // P1: 执行历史按状态过滤
  const filteredExecutions = useMemo(
    () =>
      execStatusFilter === 'all'
        ? executions
        : executions.filter(e => e.status === execStatusFilter),
    [executions, execStatusFilter]
  );

  const filteredPlans = useMemo(
    () =>
      searchQuery
        ? plans.filter(
            p =>
              p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : plans,
    [plans, searchQuery]
  );

  const enabledStepCount = selected?.steps.filter(s => s.enabled).length ?? 0;

  // ─── 渲染 ───

  return (
    <div className='container py-6 space-y-6 max-w-7xl mx-auto'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold tracking-tight'>{t('testPlans.title', '测试计划')}</h2>
        <Button onClick={openCreate} size='sm'>
          <Plus className='h-4 w-4 mr-1' />
          {t('testPlans.create', '新建计划')}
        </Button>
      </div>

      <div className='flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/50 border text-sm text-muted-foreground'>
        <Info className='h-4 w-4 flex-shrink-0' />
        <span>
          {t(
            'testPlans.featureDesc',
            '测试计划 — 组合多种测试类型（API、性能、安全、SEO 等），一次执行生成综合多维度评估报告。'
          )}
        </span>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-12 gap-6 items-start'>
        {/* Plan List */}
        <div className='md:col-span-4 space-y-4'>
          <Card className='h-full'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base font-medium text-muted-foreground uppercase tracking-wider'>
                {t('testPlans.listTitle', '计划列表')}
              </CardTitle>
            </CardHeader>
            <div className='px-3 pb-2'>
              <div className='relative'>
                <Search className='absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
                <Input
                  placeholder={t('testPlans.search', '搜索计划...')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='h-8 pl-7 text-xs'
                />
              </div>
            </div>
            <CardContent className='p-2'>
              {loading && plans.length === 0 ? (
                <div className='p-4 text-center text-muted-foreground'>{t('common.loading')}</div>
              ) : filteredPlans.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title={searchQuery ? t('common.noData') : t('testPlans.empty', '暂无测试计划')}
                  compact
                />
              ) : (
                <div className='space-y-1'>
                  {filteredPlans.map(plan => (
                    <div
                      key={plan.id}
                      className={cn(
                        'group flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors border border-transparent',
                        selected?.id === plan.id
                          ? 'bg-accent border-border shadow-sm'
                          : 'hover:bg-muted/50'
                      )}
                      role='button'
                      tabIndex={0}
                      onClick={() => handleSelect(plan.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') handleSelect(plan.id);
                      }}
                    >
                      <div className='flex items-center gap-3 overflow-hidden'>
                        <ChevronRight
                          className={cn(
                            'h-3.5 w-3.5 flex-shrink-0 transition-transform duration-150',
                            selected?.id === plan.id && 'rotate-90 text-primary'
                          )}
                        />
                        <div className='bg-primary/10 p-1.5 rounded-md'>
                          <ClipboardList className='h-3.5 w-3.5 text-primary' />
                        </div>
                        <div className='flex flex-col overflow-hidden'>
                          <div className='flex items-center gap-2'>
                            <span className='font-medium text-sm truncate'>{plan.name}</span>
                            <Badge
                              variant='secondary'
                              className='text-[10px] px-1.5 py-0 h-4 flex-shrink-0'
                            >
                              {t('testPlans.stepCount', {
                                count: plan.steps.filter(s => s.enabled).length,
                                defaultValue: '{{count}} 步',
                              })}
                            </Badge>
                          </div>
                          {plan.description && (
                            <span className='text-xs text-muted-foreground truncate'>
                              {plan.description}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size='icon'
                        variant='ghost'
                        className='h-7 w-7 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity'
                        onClick={e => {
                          e.stopPropagation();
                          setDeleteTarget({ id: plan.id, name: plan.name });
                        }}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail / Editor / Report */}
        <div className='md:col-span-8'>
          {showEditor ? (
            <TestPlanEditor
              isEditing={!!editingPlan}
              formName={formName}
              formDesc={formDesc}
              formUrl={formUrl}
              formSteps={formSteps}
              formEnvId={formEnvId}
              formFailureStrategy={formFailureStrategy}
              environments={environments}
              collections={collections}
              onFormNameChange={setFormName}
              onFormDescChange={setFormDesc}
              onFormUrlChange={setFormUrl}
              onFormEnvIdChange={setFormEnvId}
              onFormFailureStrategyChange={setFormFailureStrategy}
              onAddStep={addStep}
              onUpdateStep={updateStep}
              onRemoveStep={removeStep}
              onSmartRecommend={smartRecommend}
              onSave={() => void handleSave()}
              onCancel={() => setShowEditor(false)}
            />
          ) : selected ? (
            /* ─── 详情 + 报告 ─── */
            <div className='space-y-6'>
              <Card>
                <CardHeader className='border-b pb-4'>
                  <div className='flex items-center justify-between'>
                    <div className='flex-1 min-w-0'>
                      <CardTitle className='text-xl flex items-center gap-2'>
                        {selected.name}
                        <Button
                          size='icon'
                          variant='ghost'
                          className='h-7 w-7 text-muted-foreground hover:text-foreground'
                          onClick={openEdit}
                        >
                          <Edit2 className='h-3.5 w-3.5' />
                        </Button>
                      </CardTitle>
                      {selected.description && (
                        <p className='text-sm text-muted-foreground mt-1'>{selected.description}</p>
                      )}
                      <div className='flex items-center gap-3 mt-2 text-xs text-muted-foreground'>
                        <span className='flex items-center gap-1'>
                          <Globe className='h-3 w-3' />
                          <span className='font-mono'>{selected.url}</span>
                        </span>
                      </div>
                    </div>
                    <div className='flex items-center gap-2 flex-shrink-0'>
                      <Button
                        size='sm'
                        onClick={() => void handleExecute()}
                        disabled={executing || enabledStepCount === 0}
                      >
                        {executing ? (
                          <Loader2 className='h-4 w-4 mr-1 animate-spin' />
                        ) : (
                          <Play className='h-4 w-4 mr-1' />
                        )}
                        {executing
                          ? t('testPlans.executing', '执行中...')
                          : t('testPlans.execute', '执行计划')}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='pt-6'>
                  {/* Steps overview */}
                  <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                    {t('testPlans.steps', '测试步骤')} ({enabledStepCount})
                  </h4>
                  <div className='space-y-2'>
                    {selected.steps
                      .filter(s => s.enabled)
                      .map((step, idx) => (
                        <div
                          key={step.id}
                          className='flex items-center gap-3 p-2.5 rounded-md border'
                        >
                          <span className='text-xs font-mono text-muted-foreground w-5 text-right'>
                            {idx + 1}
                          </span>
                          <Badge variant='outline' className='text-[10px] font-mono'>
                            {step.type}
                          </Badge>
                          <span className='text-sm font-medium flex-1'>{step.name}</span>
                          {step.url && (
                            <span className='text-xs font-mono text-muted-foreground truncate max-w-[200px]'>
                              {step.url}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Active execution progress */}
              {activeExecution &&
                (activeExecution.status === 'running' || activeExecution.status === 'pending') && (
                  <Card>
                    <CardHeader className='pb-3'>
                      <CardTitle className='text-base flex items-center gap-2'>
                        <Loader2 className='h-4 w-4 animate-spin text-primary' />
                        {t('testPlans.executionProgress', '执行进度')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-2'>
                        {activeExecution.stepResults.map(sr => {
                          const errorMsg =
                            sr.status === 'failed'
                              ? String(
                                  sr.summary?.error ||
                                    sr.summary?.message ||
                                    sr.summary?.reason ||
                                    ''
                                )
                              : '';
                          return (
                            <div key={sr.stepId} className='space-y-0.5'>
                              <div className='flex items-center gap-3'>
                                {sr.status === 'completed' ? (
                                  <CheckCircle2 className='h-4 w-4 text-green-500' />
                                ) : sr.status === 'running' ? (
                                  <Loader2 className='h-4 w-4 animate-spin text-primary' />
                                ) : sr.status === 'failed' ? (
                                  <XCircle className='h-4 w-4 text-red-500' />
                                ) : sr.status === 'timeout' ? (
                                  <Timer className='h-4 w-4 text-orange-500' />
                                ) : sr.status === 'aborted' ? (
                                  <Ban className='h-4 w-4 text-muted-foreground' />
                                ) : (
                                  <Clock className='h-4 w-4 text-muted-foreground' />
                                )}
                                {sr.testId &&
                                (sr.status === 'completed' || sr.status === 'failed') ? (
                                  <button
                                    type='button'
                                    className='text-sm flex-1 text-left cursor-pointer hover:underline text-primary'
                                    onClick={() => navigate(`/history/${sr.testId}`)}
                                  >
                                    {sr.stepName}
                                  </button>
                                ) : (
                                  <span className='text-sm flex-1'>{sr.stepName}</span>
                                )}
                                {sr.duration != null && sr.duration > 0 && (
                                  <span className='text-[10px] text-muted-foreground'>
                                    {(sr.duration / 1000).toFixed(1)}s
                                  </span>
                                )}
                                <Badge variant='outline' className='text-[10px]'>
                                  {sr.status}
                                </Badge>
                                {sr.score != null && <ScoreBadge score={sr.score} size='sm' />}
                              </div>
                              {errorMsg && (
                                <div className='ml-7 text-[11px] text-destructive bg-destructive/10 rounded px-2 py-0.5 break-all'>
                                  {errorMsg}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <Progress
                        value={
                          (activeExecution.stepResults.filter(
                            sr =>
                              sr.status === 'completed' ||
                              sr.status === 'failed' ||
                              sr.status === 'skipped' ||
                              sr.status === 'timeout' ||
                              sr.status === 'aborted'
                          ).length /
                            Math.max(activeExecution.stepResults.length, 1)) *
                          100
                        }
                        className='mt-4'
                      />
                      {/* P2: 取消按钮 */}
                      <div className='mt-3 flex justify-end'>
                        <Button
                          size='sm'
                          variant='outline'
                          className='text-destructive hover:text-destructive'
                          onClick={() => void handleCancel()}
                        >
                          <Square className='h-3.5 w-3.5 mr-1' />
                          {t('testPlans.cancelExecution', '取消执行')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Report */}
              {report && (
                <Card>
                  <CardHeader className='border-b pb-4'>
                    <CardTitle className='text-base flex items-center gap-2'>
                      <BarChart3 className='h-4 w-4 text-primary' />
                      {t('testPlans.report', '综合评估报告')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='pt-6'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                      {/* Score + Radar */}
                      <div className='space-y-4'>
                        <div className='text-center'>
                          <p className='text-xs text-muted-foreground uppercase tracking-wider mb-2'>
                            {t('testPlans.overallScore', '综合评分')}
                          </p>
                          <ScoreBadge score={report.overallScore} size='lg' />
                        </div>
                        <RadarChart dimensions={report.dimensions} />
                      </div>
                      {/* Dimension details */}
                      <div className='space-y-3'>
                        {report.dimensions.map(dim => (
                          <div key={dim.type} className='p-3 rounded-md border'>
                            <div className='flex items-center justify-between mb-1'>
                              <span className='text-sm font-medium'>{dim.name}</span>
                              <ScoreBadge score={dim.score} size='sm' />
                            </div>
                            <div className='flex items-center gap-1.5'>
                              {dim.status === 'passed' ? (
                                <CheckCircle2 className='h-3.5 w-3.5 text-green-500' />
                              ) : dim.status === 'warning' ? (
                                <AlertTriangle className='h-3.5 w-3.5 text-yellow-500' />
                              ) : (
                                <XCircle className='h-3.5 w-3.5 text-red-500' />
                              )}
                              <span className='text-xs text-muted-foreground'>
                                {dim.highlights.length > 0
                                  ? dim.highlights.join(' · ')
                                  : dim.status}
                              </span>
                            </div>
                          </div>
                        ))}
                        {report.duration > 0 && (
                          <p className='text-xs text-muted-foreground pt-2'>
                            {t('testPlans.totalDuration', '总耗时')}:{' '}
                            {(report.duration / 1000).toFixed(1)}s
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Execution history */}
              {executions.length > 0 && (
                <Card>
                  <CardHeader className='pb-3'>
                    <div className='flex items-center justify-between'>
                      <CardTitle className='text-base'>
                        {t('testPlans.executionHistory', '执行历史')}
                      </CardTitle>
                      {/* P1: 状态过滤 */}
                      <div className='flex items-center gap-2'>
                        <Filter className='h-3.5 w-3.5 text-muted-foreground' />
                        <Select value={execStatusFilter} onValueChange={setExecStatusFilter}>
                          <SelectTrigger className='h-7 w-[120px] text-xs'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='all'>{t('common.all', '全部')}</SelectItem>
                            <SelectItem value='completed'>
                              {t('testPlans.statusCompleted', '已完成')}
                            </SelectItem>
                            <SelectItem value='failed'>
                              {t('testPlans.statusFailed', '失败')}
                            </SelectItem>
                            <SelectItem value='cancelled'>
                              {t('testPlans.statusCancelled', '已取消')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredExecutions.length === 0 ? (
                      <p className='text-sm text-muted-foreground text-center py-4'>
                        {t('testPlans.noMatchingExecutions', '没有匹配的执行记录')}
                      </p>
                    ) : (
                      <div className='space-y-2'>
                        {filteredExecutions.map(exec => (
                          <div
                            key={exec.id}
                            className='flex items-center justify-between p-2.5 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors'
                            role='button'
                            tabIndex={0}
                            onClick={() => void handleViewReport(exec.id)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') void handleViewReport(exec.id);
                            }}
                          >
                            <div className='flex items-center gap-3'>
                              {exec.status === 'completed' ? (
                                <CheckCircle2 className='h-4 w-4 text-green-500' />
                              ) : exec.status === 'failed' ? (
                                <XCircle className='h-4 w-4 text-red-500' />
                              ) : exec.status === 'running' ? (
                                <Loader2 className='h-4 w-4 animate-spin text-primary' />
                              ) : exec.status === 'cancelled' ? (
                                <Ban className='h-4 w-4 text-muted-foreground' />
                              ) : (
                                <Clock className='h-4 w-4 text-muted-foreground' />
                              )}
                              <span className='text-sm'>
                                {new Date(exec.createdAt).toLocaleString()}
                              </span>
                              <Badge variant='outline' className='text-[10px]'>
                                {exec.status}
                              </Badge>
                            </div>
                            <div className='flex items-center gap-2'>
                              {exec.overallScore != null && (
                                <ScoreBadge score={exec.overallScore} size='sm' />
                              )}
                              {exec.duration != null && (
                                <span className='text-xs text-muted-foreground'>
                                  {(exec.duration / 1000).toFixed(1)}s
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            /* ─── 空状态 ─── */
            <Card className='h-full flex flex-col items-center justify-center p-8 text-muted-foreground bg-muted/10 border-dashed min-h-[400px]'>
              <div className='text-center space-y-3'>
                <div className='bg-background p-4 rounded-full inline-flex mb-2 shadow-sm'>
                  <ClipboardList className='w-8 h-8 text-muted-foreground/50' />
                </div>
                <h3 className='text-lg font-medium text-foreground'>
                  {t('testPlans.selectHintTitle', '未选择测试计划')}
                </h3>
                <p className='text-sm'>
                  {t('testPlans.selectHint', '从左侧列表选择一个计划，或创建新的测试计划。')}
                </p>
                <Button size='sm' onClick={openCreate}>
                  <Plus className='h-3.5 w-3.5 mr-1' />
                  {t('testPlans.create', '新建计划')}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={open => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('testPlans.deleteTitle', '删除测试计划？')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'testPlans.deleteDesc',
                `将永久删除 "${deleteTarget?.name}" 及其所有执行记录。此操作不可撤销。`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Wrapper：Tabs 整合测试计划 + 定时任务 ───

const SchedulesPageLazy = lazy(() => import('./SchedulesPage'));

const TestPlansPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('plans');

  return (
    <div className='h-full flex flex-col'>
      <div className='px-4 pt-4 pb-2 flex items-center gap-4'>
        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList>
            <TabsTrigger value='plans'>{t('testPlans.tabPlans', '测试计划')}</TabsTrigger>
            <TabsTrigger value='schedules'>{t('testPlans.tabSchedules', '定时任务')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {activeTab === 'plans' ? (
        <div className='flex-1 overflow-auto'>
          <TestPlansContent />
        </div>
      ) : (
        <div className='flex-1 overflow-auto'>
          <Suspense
            fallback={
              <div className='flex items-center justify-center h-32 text-muted-foreground text-sm'>
                {t('common.loading', '加载中...')}
              </div>
            }
          >
            <SchedulesPageLazy />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default TestPlansPage;
