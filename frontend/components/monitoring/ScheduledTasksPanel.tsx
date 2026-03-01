import { Calendar, Clock, Loader2, Pause, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { isDesktop } from '../../utils/environment';

// ─── 类型 ───

interface ScheduledTask {
  id: string;
  url: string;
  testType: string;
  cronExpression: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

type TaskFormData = {
  url: string;
  testType: string;
  scheduleType: string;
  dailyTime: string;
  intervalMinutes: number;
};

const defaultForm: TaskFormData = {
  url: '',
  testType: 'performance',
  scheduleType: 'daily',
  dailyTime: '08:00',
  intervalMinutes: 60,
};

const testTypeLabels: Record<string, { key: string; fallback: string }> = {
  performance: { key: 'scheduledTasks.typePerformance', fallback: '性能测试' },
  security: { key: 'scheduledTasks.typeSecurity', fallback: '安全测试' },
  seo: { key: 'scheduledTasks.typeSeo', fallback: 'SEO 测试' },
  accessibility: { key: 'scheduledTasks.typeAccessibility', fallback: '无障碍测试' },
  compatibility: { key: 'scheduledTasks.typeCompatibility', fallback: '兼容性测试' },
  ux: { key: 'scheduledTasks.typeUx', fallback: '用户体验测试' },
};

const scheduleTypeLabels: Record<string, { key: string; fallback: string }> = {
  hourly: { key: 'scheduledTasks.schedHourly', fallback: '每小时' },
  daily: { key: 'scheduledTasks.schedDaily', fallback: '每日定时' },
  interval: { key: 'scheduledTasks.schedInterval', fallback: '自定义间隔' },
};

function buildCronExpression(form: TaskFormData): string {
  if (form.scheduleType === 'hourly') return 'hourly';
  if (form.scheduleType === 'daily') return `daily-${form.dailyTime}`;
  return `interval-${form.intervalMinutes}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function describeCron(cron: string, t: any): string {
  if (cron === 'hourly') return t('scheduledTasks.cronHourly', '每小时');
  if (cron.startsWith('daily-'))
    return t('scheduledTasks.cronDaily', {
      time: cron.replace('daily-', ''),
      defaultValue: '每日 {{time}}',
    }) as string;
  if (cron.startsWith('interval-')) {
    const mins = parseInt(cron.replace('interval-', ''), 10);
    if (mins >= 60)
      return t('scheduledTasks.cronEveryHours', {
        count: Math.round(mins / 60),
        defaultValue: '每 {{count}} 小时',
      }) as string;
    return t('scheduledTasks.cronEveryMinutes', {
      count: mins,
      defaultValue: '每 {{count}} 分钟',
    }) as string;
  }
  return cron;
}

// ─── 组件 ───

const ScheduledTasksPanel = () => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<TaskFormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  const desktop = isDesktop();
  const scheduler = window.electronAPI?.scheduler;

  const loadTasks = useCallback(async () => {
    if (!scheduler) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await scheduler.listTasks();
      setTasks(list as unknown as ScheduledTask[]);
    } catch (err) {
      console.error('Failed to load scheduled tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [scheduler]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  // 监听定时任务完成事件
  useEffect(() => {
    if (!scheduler) return;
    const unsub = scheduler.onTaskCompleted(data => {
      toast.success(
        t('scheduledTasks.taskCompleted', {
          type: data.testType,
          score: data.score ?? '-',
          defaultValue: '定时测试完成: {{type}} · 评分 {{score}}',
        })
      );
      void loadTasks();
    });
    return unsub;
  }, [scheduler, loadTasks, t]);

  const handleAdd = async () => {
    if (!scheduler) return;
    if (!form.url.trim()) {
      toast.error(t('scheduledTasks.urlRequired', '请输入测试 URL'));
      return;
    }
    setSubmitting(true);
    try {
      const cron = buildCronExpression(form);
      await scheduler.addTask({
        url: form.url.trim(),
        testType: form.testType,
        cronExpression: cron,
        enabled: true,
      });
      toast.success(t('scheduledTasks.taskAdded', '定时任务已添加'));
      setAddOpen(false);
      setForm(defaultForm);
      void loadTasks();
    } catch (err) {
      toast.error(
        t('scheduledTasks.addFailedDetail', {
          detail: err instanceof Error ? err.message : String(err),
          defaultValue: '添加失败: {{detail}}',
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (taskId: string, enabled: boolean) => {
    if (!scheduler) return;
    try {
      await scheduler.toggleTask(taskId, enabled);
      toast.success(
        enabled
          ? t('scheduledTasks.taskEnabled', '任务已启用')
          : t('scheduledTasks.taskPaused', '任务已暂停')
      );
      void loadTasks();
    } catch (err) {
      toast.error(
        t('scheduledTasks.operationFailedDetail', {
          detail: err instanceof Error ? err.message : String(err),
          defaultValue: '操作失败: {{detail}}',
        })
      );
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!scheduler) return;
    try {
      await scheduler.removeTask(taskId);
      toast.success(t('scheduledTasks.taskDeleted', '任务已删除'));
      void loadTasks();
    } catch (err) {
      toast.error(
        t('scheduledTasks.deleteFailedDetail', {
          detail: err instanceof Error ? err.message : String(err),
          defaultValue: '删除失败: {{detail}}',
        })
      );
    }
  };

  // 非桌面端提示
  if (!desktop) {
    return (
      <Card className='mt-4'>
        <CardContent className='py-12 text-center text-muted-foreground'>
          <Calendar className='h-10 w-10 mx-auto mb-3 opacity-50' />
          <p className='font-medium'>
            {t('scheduledTasks.desktopOnly', '定时测试计划仅在桌面端可用')}
          </p>
          <p className='text-sm mt-1'>
            {t('scheduledTasks.desktopOnlyHint', '请下载桌面客户端以使用后台定时测试功能')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-4 mt-4'>
      {/* 顶部操作栏 */}
      <div className='flex items-center justify-between'>
        <div className='text-sm text-muted-foreground'>
          {tasks.length > 0
            ? t('scheduledTasks.taskSummary', {
                active: tasks.filter(tk => tk.enabled).length,
                total: tasks.length,
                defaultValue: '{{active}} 个活跃任务 / 共 {{total}} 个',
              })
            : t('scheduledTasks.noTasks', '暂无定时任务')}
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => void loadTasks()}>
            <RefreshCw className='h-4 w-4 mr-1' />
            {t('common.refresh', '刷新')}
          </Button>
          <Button size='sm' onClick={() => setAddOpen(true)}>
            <Plus className='h-4 w-4 mr-1' />
            {t('scheduledTasks.addTask', '添加任务')}
          </Button>
        </div>
      </div>

      {/* 任务列表 */}
      {loading ? (
        <div className='flex items-center justify-center h-32 text-muted-foreground'>
          <Loader2 className='h-5 w-5 animate-spin mr-2' />
          {t('common.loading', '加载中...')}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className='py-12 text-center text-muted-foreground'>
            <Clock className='h-10 w-10 mx-auto mb-3 opacity-50' />
            <p className='font-medium'>{t('scheduledTasks.emptyTitle', '还没有定时任务')}</p>
            <p className='text-sm mt-1'>
              {t('scheduledTasks.emptyHint', '点击【添加任务】创建您的第一个定时测试计划')}
            </p>
            <Button className='mt-4' size='sm' onClick={() => setAddOpen(true)}>
              <Plus className='h-4 w-4 mr-1' />
              {t('scheduledTasks.addTask', '添加任务')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-3'>
          {tasks.map(task => (
            <Card key={task.id} className={!task.enabled ? 'opacity-60' : ''}>
              <CardHeader className='pb-2'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-sm font-medium flex items-center gap-2'>
                    <Badge variant={task.enabled ? 'default' : 'secondary'}>
                      {task.enabled
                        ? t('scheduledTasks.statusRunning', '运行中')
                        : t('scheduledTasks.statusPaused', '已暂停')}
                    </Badge>
                    <span className='text-muted-foreground'>
                      {testTypeLabels[task.testType]
                        ? t(
                            testTypeLabels[task.testType].key,
                            testTypeLabels[task.testType].fallback
                          )
                        : task.testType}
                    </span>
                  </CardTitle>
                  <div className='flex gap-1'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleToggle(task.id, !task.enabled)}
                      title={
                        task.enabled
                          ? t('scheduledTasks.pause', '暂停')
                          : t('scheduledTasks.enable', '启用')
                      }
                    >
                      {task.enabled ? <Pause className='h-4 w-4' /> : <Play className='h-4 w-4' />}
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleDelete(task.id)}
                      className='text-destructive hover:text-destructive'
                      title={t('common.delete', '删除')}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='pt-0'>
                <div className='text-sm truncate mb-2 text-foreground'>{task.url}</div>
                <div className='flex items-center gap-4 text-xs text-muted-foreground'>
                  <span className='flex items-center gap-1'>
                    <Clock className='h-3 w-3' />
                    {describeCron(task.cronExpression, t)}
                  </span>
                  {task.lastRun && (
                    <span>
                      {t('scheduledTasks.lastRun', '上次')}:{' '}
                      {new Date(task.lastRun).toLocaleString()}
                    </span>
                  )}
                  {task.nextRun && (
                    <span>
                      {t('scheduledTasks.nextRun', '下次')}:{' '}
                      {new Date(task.nextRun).toLocaleString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 添加任务对话框 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{t('scheduledTasks.addDialogTitle', '添加定时测试任务')}</DialogTitle>
            <DialogDescription>
              {t(
                'scheduledTasks.addDialogDesc',
                '设置自动化测试计划，应用最小化到系统托盘时仍会在后台执行'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label htmlFor='task-url'>{t('scheduledTasks.testUrl', '测试 URL')}</Label>
              <Input
                id='task-url'
                placeholder='https://example.com'
                value={form.url}
                onChange={e => setForm(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>{t('scheduledTasks.testType', '测试类型')}</Label>
                <Select
                  value={form.testType}
                  onValueChange={v => setForm(prev => ({ ...prev, testType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(testTypeLabels).map(([key, lbl]) => (
                      <SelectItem key={key} value={key}>
                        {t(lbl.key, lbl.fallback)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label>{t('scheduledTasks.scheduleType', '调度方式')}</Label>
                <Select
                  value={form.scheduleType}
                  onValueChange={v => setForm(prev => ({ ...prev, scheduleType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(scheduleTypeLabels).map(([key, lbl]) => (
                      <SelectItem key={key} value={key}>
                        {t(lbl.key, lbl.fallback)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.scheduleType === 'daily' && (
              <div className='space-y-2'>
                <Label>{t('scheduledTasks.dailyTime', '每日执行时间')}</Label>
                <Input
                  type='time'
                  value={form.dailyTime}
                  onChange={e => setForm(prev => ({ ...prev, dailyTime: e.target.value }))}
                />
              </div>
            )}

            {form.scheduleType === 'interval' && (
              <div className='space-y-2'>
                <Label>{t('scheduledTasks.intervalMinutes', '间隔（分钟）')}</Label>
                <Input
                  type='number'
                  min={10}
                  max={1440}
                  value={form.intervalMinutes}
                  onChange={e =>
                    setForm(prev => ({ ...prev, intervalMinutes: Number(e.target.value) }))
                  }
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setAddOpen(false)} disabled={submitting}>
              {t('common.cancel', '取消')}
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className='h-4 w-4 mr-1 animate-spin' />
                  {t('scheduledTasks.adding', '添加中...')}
                </>
              ) : (
                t('scheduledTasks.add', '添加')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScheduledTasksPanel;
