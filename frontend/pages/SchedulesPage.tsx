import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Statistic } from '@/components/ui/statistic';
import { Textarea } from '@/components/ui/textarea';

import EmptyState from '../components/EmptyState';
import { useTestEnvironment, useTestWorkspace } from '../context/TestContext';
import { listCollections } from '../services/collectionApi';
import {
  schedulesApi,
  type CreateSchedulePayload,
  type ScheduledRun,
  type ScheduledRunExecution,
  type ScheduleStatistics,
} from '../services/schedulesApi';
import { formatRelativeTime } from '../utils/date';

// ─── 常量 ───

const CRON_PRESETS: { labelKey: string; fallback: string; value: string }[] = [
  { labelKey: 'schedules.cronHourly', fallback: '每小时', value: '0 * * * *' },
  { labelKey: 'schedules.cronDaily0', fallback: '每天 0:00', value: '0 0 * * *' },
  { labelKey: 'schedules.cronDaily6', fallback: '每天 6:00', value: '0 6 * * *' },
  { labelKey: 'schedules.cronDaily12', fallback: '每天 12:00', value: '0 12 * * *' },
  { labelKey: 'schedules.cronWeekly', fallback: '每周一 9:00', value: '0 9 * * 1' },
  { labelKey: 'schedules.cronMonthly', fallback: '每月 1 日 0:00', value: '0 0 1 * *' },
];

const statusConfig: Record<
  string,
  {
    color: string;
    labelKey: string;
    fallback: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  active: {
    color: 'bg-green-500',
    labelKey: 'schedules.statusActive',
    fallback: '运行中',
    icon: Play,
  },
  paused: {
    color: 'bg-yellow-500',
    labelKey: 'schedules.statusPaused',
    fallback: '已暂停',
    icon: Pause,
  },
  inactive: {
    color: 'bg-gray-400',
    labelKey: 'schedules.statusInactive',
    fallback: '未激活',
    icon: Clock,
  },
};

const execStatusConfig: Record<string, { color: string; labelKey: string; fallback: string }> = {
  success: { color: 'text-green-600', labelKey: 'schedules.execSuccess', fallback: '成功' },
  failed: { color: 'text-red-600', labelKey: 'schedules.execFailed', fallback: '失败' },
  running: { color: 'text-blue-600', labelKey: 'schedules.execRunning', fallback: '运行中' },
  pending: { color: 'text-yellow-600', labelKey: 'schedules.execPending', fallback: '等待中' },
  cancelled: { color: 'text-gray-500', labelKey: 'schedules.execCancelled', fallback: '已取消' },
};

const getStatusInfo = (status: string) => statusConfig[status] || statusConfig.inactive;

// ─── 创建/编辑对话框 ───

type ScheduleFormData = {
  name: string;
  description: string;
  collectionId: string;
  environmentId: string;
  cronExpression: string;
  timezone: string;
};

const defaultForm: ScheduleFormData = {
  name: '',
  description: '',
  collectionId: '',
  environmentId: '',
  cronExpression: '0 0 * * *',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

type CollectionOption = { id: string; name: string };

const CreateScheduleDialog = ({
  open,
  onOpenChange,
  onSubmit,
  editSchedule,
  collections,
  environments,
  prefilledCollectionId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: CreateSchedulePayload) => Promise<void>;
  editSchedule?: ScheduledRun | null;
  collections: CollectionOption[];
  environments: { id: string; name: string }[];
  prefilledCollectionId?: string | null;
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<ScheduleFormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [cronPreset, setCronPreset] = useState('custom');

  useEffect(() => {
    if (open) {
      if (editSchedule) {
        const preset = CRON_PRESETS.find(p => p.value === editSchedule.cron_expression);
        setForm({
          name: editSchedule.name || '',
          description: editSchedule.description || '',
          collectionId: editSchedule.collection_id || '',
          environmentId: editSchedule.environment_id || '',
          cronExpression: editSchedule.cron_expression || '0 0 * * *',
          timezone: editSchedule.timezone || defaultForm.timezone,
        });
        setCronPreset(preset ? preset.value : 'custom');
      } else {
        setForm({
          ...defaultForm,
          collectionId: prefilledCollectionId || '',
        });
        setCronPreset('0 0 * * *');
      }
    }
  }, [open, editSchedule, prefilledCollectionId]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error(t('schedules.nameRequired', '请填写任务名称'));
      return;
    }
    if (!form.collectionId) {
      toast.error(t('schedules.collectionRequired', '请选择集合'));
      return;
    }
    if (!form.cronExpression.trim()) {
      toast.error(t('schedules.cronRequired', '请设置 Cron 表达式'));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        collectionId: form.collectionId,
        environmentId: form.environmentId || undefined,
        cronExpression: form.cronExpression.trim(),
        timezone: form.timezone,
        status: 'active',
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(
        t('schedules.submitFailed', {
          message: err instanceof Error ? err.message : String(err),
          defaultValue: '操作失败',
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {editSchedule
              ? t('schedules.editTitle', '编辑定时任务')
              : t('schedules.createTitle', '创建定时任务')}
          </DialogTitle>
          <DialogDescription>
            {editSchedule
              ? t('schedules.editDesc', '修改定时任务配置')
              : t('schedules.createDesc', '创建一个新的定时测试任务')}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='space-y-2'>
            <Label>{t('schedules.nameLabel', '任务名称')}</Label>
            <Input
              placeholder={t('schedules.namePlaceholder', '例如：每日回归测试')}
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className='space-y-2'>
            <Label>{t('schedules.descLabel', '描述 (可选)')}</Label>
            <Textarea
              placeholder={t('schedules.descPlaceholder', '任务描述...')}
              rows={2}
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className='space-y-2'>
            <Label>{t('schedules.collectionLabel', '集合')}</Label>
            <Select
              value={form.collectionId}
              onValueChange={v => setForm(prev => ({ ...prev, collectionId: v }))}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t('schedules.collectionPlaceholder', '选择要运行的集合')}
                />
              </SelectTrigger>
              <SelectContent>
                {collections.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label>{t('schedules.envLabel', '环境 (可选)')}</Label>
            <Select
              value={form.environmentId || 'none'}
              onValueChange={v =>
                setForm(prev => ({ ...prev, environmentId: v === 'none' ? '' : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('schedules.envPlaceholder', '选择环境')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>{t('schedules.noEnv', '无环境')}</SelectItem>
                {environments.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label>{t('schedules.frequencyLabel', '执行频率')}</Label>
            <Select
              value={cronPreset}
              onValueChange={v => {
                setCronPreset(v);
                if (v !== 'custom') {
                  setForm(prev => ({ ...prev, cronExpression: v }));
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRON_PRESETS.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    {t(p.labelKey, p.fallback)}
                  </SelectItem>
                ))}
                <SelectItem value='custom'>{t('schedules.cronCustom', '自定义 Cron')}</SelectItem>
              </SelectContent>
            </Select>
            {cronPreset === 'custom' && (
              <Input
                placeholder='0 0 * * * (分 时 日 月 周)'
                value={form.cronExpression}
                onChange={e => setForm(prev => ({ ...prev, cronExpression: e.target.value }))}
                className='mt-2 font-mono text-sm'
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? t('schedules.submitting', '提交中...')
              : editSchedule
                ? t('common.save')
                : t('schedules.createBtn', '创建')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── 执行历史对话框 ───

const ExecutionHistoryDialog = ({
  open,
  onOpenChange,
  executions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  executions: ScheduledRunExecution[];
}) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{t('schedules.execHistoryTitle', '执行历史')}</DialogTitle>
          <DialogDescription>
            {t('schedules.execHistoryDesc', '最近的定时任务执行记录')}
          </DialogDescription>
        </DialogHeader>
        <div className='max-h-[400px] overflow-y-auto'>
          {executions.length === 0 ? (
            <div className='text-center text-muted-foreground py-8 text-sm'>
              {t('schedules.noExecutions', '暂无执行记录')}
            </div>
          ) : (
            <div className='divide-y'>
              {executions.map(exec => {
                const cfg = execStatusConfig[exec.status] || execStatusConfig.pending;
                return (
                  <div key={exec.id} className='py-2.5 space-y-1'>
                    <div className='flex items-center gap-3'>
                      <Badge variant='outline' className={cfg.color}>
                        {t(cfg.labelKey, cfg.fallback)}
                      </Badge>
                      <div className='flex-1 text-sm'>
                        {exec.triggeredBy === 'manual'
                          ? t('schedules.triggerManual', '手动触发')
                          : t('schedules.triggerScheduled', '定时触发')}
                        {exec.duration != null && (
                          <span className='text-muted-foreground ml-2'>
                            {t('schedules.duration', {
                              seconds: (exec.duration / 1000).toFixed(1),
                              defaultValue: '耗时 {{seconds}}s',
                            })}
                          </span>
                        )}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {exec.startTime ? new Date(exec.startTime).toLocaleString() : '-'}
                      </div>
                      {exec.totalRequests != null && (
                        <div className='text-xs'>
                          <span className='text-green-600'>{exec.passedRequests ?? 0}</span>/
                          <span>{exec.totalRequests}</span>
                        </div>
                      )}
                    </div>
                    {exec.status === 'failed' && exec.error && (
                      <div className='ml-[calc(theme(spacing.3)+4rem)] text-xs text-destructive bg-destructive/10 rounded px-2 py-1 break-all'>
                        {exec.error}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('common.close', '关闭')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── 主页面 ───

const SchedulesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { workspaceId } = useTestWorkspace();
  const { environments } = useTestEnvironment();

  const [schedules, setSchedules] = useState<ScheduledRun[]>([]);
  const [stats, setStats] = useState<ScheduleStatistics | null>(null);
  const [executions, setExecutions] = useState<ScheduledRunExecution[]>([]);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 从 URL 参数读取预填集合（从 CollectionsPage 跳转）
  // 用 useRef 缓存初始值，避免清除 URL 参数后丢失
  const prefilledCollectionIdRef = useRef(searchParams.get('collectionId'));

  // 对话框状态
  const [createOpen, setCreateOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState<ScheduledRun | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 如果 URL 带有 collectionId 参数，自动打开创建对话框
  useEffect(() => {
    if (prefilledCollectionIdRef.current) {
      setCreateOpen(true);
      // 消费参数后清除 URL
      setSearchParams({}, { replace: true });
    }
  }, [setSearchParams]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [schedulesResp, statsResp, execResp, collectionsResp] = await Promise.allSettled([
        schedulesApi.list(workspaceId ? { workspaceId } : undefined),
        schedulesApi.getStatistics(workspaceId ? { workspaceId } : undefined),
        schedulesApi.getExecutionHistory({ limit: 20, workspaceId: workspaceId || undefined }),
        listCollections({ limit: 100 }),
      ]);

      if (schedulesResp.status === 'fulfilled') {
        const data = schedulesResp.value;
        setSchedules(Array.isArray(data) ? data : []);
      }
      if (statsResp.status === 'fulfilled') {
        setStats(statsResp.value as ScheduleStatistics);
      }
      if (execResp.status === 'fulfilled') {
        const data = execResp.value;
        setExecutions(data?.executions ?? (Array.isArray(data) ? data : []));
      }
      if (collectionsResp.status === 'fulfilled') {
        const data = collectionsResp.value;
        const items = Array.isArray(data)
          ? data
          : (data as { data?: CollectionOption[] }).data || [];
        setCollections(
          items.map((c: Record<string, unknown>) => ({
            id: String(c.id || ''),
            name: String(c.name || t('schedules.unnamed', '未命名')),
          }))
        );
      }
    } catch {
      toast.error(t('schedules.loadFailed', '加载数据失败'));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, t]);

  useEffect(() => {
    let ignore = false;
    void loadData().then(() => {
      if (ignore) return;
    });
    return () => {
      ignore = true;
    };
  }, [loadData]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!s.name?.toLowerCase().includes(q) && !s.description?.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      return true;
    });
  }, [schedules, searchQuery, statusFilter]);

  // 操作
  const handleCreate = async (payload: CreateSchedulePayload) => {
    await schedulesApi.create({ ...payload, workspaceId: workspaceId || undefined });
    toast.success(t('schedules.createSuccess', '定时任务创建成功'));
    void loadData();
  };

  const handleUpdate = async (payload: CreateSchedulePayload) => {
    if (!editSchedule) return;
    await schedulesApi.update(editSchedule.id, payload);
    toast.success(t('schedules.updateSuccess', '定时任务更新成功'));
    setEditSchedule(null);
    void loadData();
  };

  const handleDelete = async (id: string) => {
    try {
      await schedulesApi.delete(id);
      toast.success(t('schedules.deleteSuccess', '定时任务已删除'));
      setDeleteConfirmId(null);
      void loadData();
    } catch {
      toast.error(t('schedules.deleteFailed', '删除失败'));
    }
  };

  const handleToggle = async (schedule: ScheduledRun) => {
    try {
      if (schedule.status === 'active') {
        await schedulesApi.pause(schedule.id);
        toast.success(t('schedules.paused', '已暂停'));
      } else {
        await schedulesApi.start(schedule.id);
        toast.success(t('schedules.started', '已启动'));
      }
      void loadData();
    } catch {
      toast.error(t('schedules.operationFailed', '操作失败'));
    }
  };

  const handleExecute = async (id: string) => {
    try {
      toast.info(t('schedules.executing', '正在执行...'));
      await schedulesApi.execute(id);
      toast.success(t('schedules.executeSuccess', '已触发执行'));
      void loadData();
    } catch {
      toast.error(t('schedules.executeFailed', '执行失败'));
    }
  };

  const envOptions = useMemo(
    () => environments.map(e => ({ id: e.id, name: e.name })),
    [environments]
  );

  return (
    <div className='space-y-6 p-6 max-w-7xl mx-auto'>
      {/* 页面标题 */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>{t('schedules.title', '定时任务')}</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            {t('schedules.description', '管理自动化定时测试任务，定期运行集合中的测试')}
          </p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => navigate('/history')}>
            <Search className='h-4 w-4 mr-1' />
            {t('schedules.testHistory', '测试历史')}
          </Button>
          <Button variant='outline' size='sm' onClick={() => setHistoryOpen(true)}>
            <Clock className='h-4 w-4 mr-1' />
            {t('schedules.execHistory', '执行历史')}
          </Button>
          <Button variant='outline' size='sm' onClick={() => void loadData()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', '刷新')}
          </Button>
          <Button size='sm' onClick={() => setCreateOpen(true)}>
            <Plus className='h-4 w-4 mr-1' />
            {t('schedules.createBtn', '创建任务')}
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <Card>
            <CardContent className='pt-4 pb-3'>
              <Statistic
                title={t('schedules.statTotal', '总任务')}
                value={stats.totalSchedules}
                prefix={<Calendar className='h-4 w-4 text-blue-500' />}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='pt-4 pb-3'>
              <Statistic
                title={t('schedules.statActive', '运行中')}
                value={stats.activeSchedules}
                prefix={<Play className='h-4 w-4 text-green-500' />}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='pt-4 pb-3'>
              <Statistic
                title={t('schedules.statExecutions', '总执行次数')}
                value={stats.totalExecutions}
                prefix={<Zap className='h-4 w-4 text-purple-500' />}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='pt-4 pb-3'>
              <Statistic
                title={t('schedules.statSuccessRate', '成功率')}
                value={
                  stats.totalExecutions > 0
                    ? `${Math.round((stats.successfulExecutions / stats.totalExecutions) * 100)}%`
                    : '-'
                }
                prefix={<CheckCircle2 className='h-4 w-4 text-green-500' />}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* 过滤栏 */}
      <div className='flex flex-wrap gap-3 items-center'>
        <div className='relative flex-1 min-w-[200px] max-w-sm'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder={t('schedules.searchPlaceholder', '搜索任务名称...')}
            className='pl-9'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className='w-[130px]'>
            <SelectValue placeholder={t('schedules.statusFilter', '状态')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{t('schedules.filterAll', '全部状态')}</SelectItem>
            <SelectItem value='active'>{t('schedules.statusActive', '运行中')}</SelectItem>
            <SelectItem value='paused'>{t('schedules.statusPaused', '已暂停')}</SelectItem>
            <SelectItem value='inactive'>{t('schedules.statusInactive', '未激活')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 任务列表 */}
      <Card>
        <CardHeader className='py-3 px-4 border-b'>
          <CardTitle className='text-sm font-medium'>
            {t('schedules.listTitle', '定时任务')} ({filteredSchedules.length})
          </CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          {loading && schedules.length === 0 ? (
            <div className='flex items-center justify-center h-32 text-muted-foreground text-sm'>
              {t('common.loading')}
            </div>
          ) : filteredSchedules.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={
                schedules.length === 0
                  ? t('schedules.empty', '暂无定时任务，点击"创建任务"开始')
                  : t('schedules.noMatch', '没有匹配的任务')
              }
              compact
            />
          ) : (
            <div className='divide-y'>
              {filteredSchedules.map(schedule => {
                const info = getStatusInfo(schedule.status);
                const StatusIcon = info.icon;
                const collectionName =
                  collections.find(c => c.id === schedule.collection_id)?.name ||
                  schedule.collection_name ||
                  schedule.collection_id;
                return (
                  <div
                    key={schedule.id}
                    className='flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors'
                  >
                    {/* 状态 */}
                    <div className='flex-shrink-0'>
                      <span className={`block w-3 h-3 rounded-full ${info.color}`} />
                    </div>

                    {/* 信息 */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-sm truncate'>
                          {schedule.name || t('schedules.unnamedTask', '未命名任务')}
                        </span>
                        <Badge variant='outline' className='text-[10px] shrink-0'>
                          {schedule.cron_expression}
                        </Badge>
                      </div>
                      <div className='text-xs text-muted-foreground mt-0.5 truncate'>
                        {t('schedules.collectionPrefix', '集合')}: {collectionName}
                        {schedule.description && ` · ${schedule.description}`}
                      </div>
                    </div>

                    {/* 状态标签 */}
                    <div className='flex items-center gap-1.5 text-xs shrink-0'>
                      <StatusIcon className='h-3.5 w-3.5' />
                      <span>{t(info.labelKey, info.fallback)}</span>
                    </div>

                    {/* 下次运行 */}
                    <div
                      className='text-xs text-muted-foreground w-40 text-right shrink-0 hidden md:block'
                      title={
                        schedule.next_run_at
                          ? new Date(schedule.next_run_at).toLocaleString()
                          : undefined
                      }
                    >
                      {schedule.next_run_at ? (
                        <>
                          <div>
                            {t('schedules.nextRun', '下次')}:{' '}
                            {formatRelativeTime(schedule.next_run_at)}
                          </div>
                          <div className='text-[10px] opacity-70'>
                            {new Date(schedule.next_run_at).toLocaleString()}
                          </div>
                        </>
                      ) : schedule.last_run_at ? (
                        `${t('schedules.lastRun', '上次')}: ${new Date(schedule.last_run_at).toLocaleString()}`
                      ) : (
                        t('schedules.neverRun', '从未运行')
                      )}
                    </div>

                    {/* 操作 */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='icon' className='h-8 w-8 shrink-0'>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem onClick={() => void handleExecute(schedule.id)}>
                          <Zap className='h-4 w-4 mr-2' />
                          {t('schedules.executeNow', '立即执行')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void handleToggle(schedule)}>
                          {schedule.status === 'active' ? (
                            <>
                              <Pause className='h-4 w-4 mr-2' />
                              {t('schedules.pause', '暂停')}
                            </>
                          ) : (
                            <>
                              <Play className='h-4 w-4 mr-2' />
                              {t('schedules.start', '启动')}
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditSchedule(schedule);
                            setCreateOpen(true);
                          }}
                        >
                          <Calendar className='h-4 w-4 mr-2' />
                          {t('common.edit', '编辑')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className='text-red-600'
                          onClick={() => setDeleteConfirmId(schedule.id)}
                        >
                          <Trash2 className='h-4 w-4 mr-2' />
                          {t('common.delete', '删除')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 最近执行 */}
      {executions.length > 0 && (
        <Card>
          <CardHeader className='py-3 px-4 border-b'>
            <CardTitle className='text-sm font-medium flex items-center gap-2'>
              <Clock className='h-4 w-4 text-muted-foreground' />
              {t('schedules.recentExec', '最近执行')}
            </CardTitle>
          </CardHeader>
          <CardContent className='p-0'>
            <div className='divide-y'>
              {executions.slice(0, 5).map(exec => {
                const cfg = execStatusConfig[exec.status] || execStatusConfig.pending;
                return (
                  <div key={exec.id} className='flex items-center gap-3 px-4 py-2.5'>
                    {exec.status === 'success' ? (
                      <CheckCircle2 className='h-4 w-4 text-green-500 shrink-0' />
                    ) : exec.status === 'failed' ? (
                      <XCircle className='h-4 w-4 text-red-500 shrink-0' />
                    ) : (
                      <AlertTriangle className='h-4 w-4 text-yellow-500 shrink-0' />
                    )}
                    <Badge variant='outline' className={`text-[10px] ${cfg.color}`}>
                      {t(cfg.labelKey, cfg.fallback)}
                    </Badge>
                    <span className='text-sm flex-1 truncate'>
                      {exec.triggeredBy === 'manual'
                        ? t('schedules.triggerManual', '手动触发')
                        : t('schedules.triggerScheduled', '定时触发')}
                      {exec.totalRequests != null && (
                        <span className='text-muted-foreground ml-1'>
                          ({exec.passedRequests ?? 0}/{exec.totalRequests}{' '}
                          {t('schedules.passed', '通过')})
                        </span>
                      )}
                    </span>
                    <span className='text-xs text-muted-foreground shrink-0'>
                      {exec.startTime ? new Date(exec.startTime).toLocaleString() : '-'}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 创建/编辑对话框 */}
      <CreateScheduleDialog
        open={createOpen}
        onOpenChange={v => {
          setCreateOpen(v);
          if (!v) setEditSchedule(null);
        }}
        onSubmit={editSchedule ? handleUpdate : handleCreate}
        editSchedule={editSchedule}
        collections={collections}
        environments={envOptions}
        prefilledCollectionId={prefilledCollectionIdRef.current}
      />

      {/* 执行历史对话框 */}
      <ExecutionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        executions={executions}
      />

      {/* 删除确认 */}
      <Dialog open={Boolean(deleteConfirmId)} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>{t('schedules.deleteConfirmTitle', '确认删除')}</DialogTitle>
            <DialogDescription>
              {t(
                'schedules.deleteConfirmDesc',
                '删除后将停止定时任务并清除执行历史，此操作不可撤销。'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteConfirmId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant='destructive'
              onClick={() => deleteConfirmId && void handleDelete(deleteConfirmId)}
            >
              {t('schedules.confirmDelete', '确认删除')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { SchedulesPage };
export default SchedulesPage;
