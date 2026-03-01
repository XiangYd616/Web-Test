import {
  CheckCircle2,
  ChevronRight,
  Clock,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Star,
  ThumbsUp,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Statistic } from '@/components/ui/statistic';
import { Textarea } from '@/components/ui/textarea';

import DesktopFeaturePlaceholder from '../components/DesktopFeaturePlaceholder';
import { useTestWorkspace } from '../context/TestContext';
import { uatApi, type CreateFeedbackPayload, type UatFeedback } from '../services/uatApi';
import { isDesktop as isDesktopEnv } from '../utils/environment';

// ─── 常量 ───

const TEST_TYPES = [
  { value: 'performance', labelKey: 'uat.typePerformance', fallback: '性能测试' },
  { value: 'security', labelKey: 'uat.typeSecurity', fallback: '安全测试' },
  { value: 'seo', labelKey: 'uat.typeSeo', fallback: 'SEO 测试' },
  { value: 'api', labelKey: 'uat.typeApi', fallback: 'API 测试' },
  { value: 'accessibility', labelKey: 'uat.typeAccessibility', fallback: '无障碍测试' },
  { value: 'compatibility', labelKey: 'uat.typeCompatibility', fallback: '兼容性测试' },
  { value: 'ux', labelKey: 'uat.typeUx', fallback: 'UX 测试' },
  { value: 'website', labelKey: 'uat.typeWebsite', fallback: '综合测试' },
  { value: 'stress', labelKey: 'uat.typeStress', fallback: '压力测试' },
];

const RATING_LABELS: Record<string, { key: string; fallback: string }> = {
  usability: { key: 'uat.ratingUsability', fallback: '易用性' },
  accuracy: { key: 'uat.ratingAccuracy', fallback: '准确性' },
  speed: { key: 'uat.ratingSpeed', fallback: '速度' },
  reliability: { key: 'uat.ratingReliability', fallback: '可靠性' },
  overall: { key: 'uat.ratingOverall', fallback: '总体评价' },
};

const ISSUE_PRESETS = [
  { key: 'uat.issueInaccurate', fallback: '结果不准确' },
  { key: 'uat.issueSlow', fallback: '响应太慢' },
  { key: 'uat.issueUnclear', fallback: '界面不清晰' },
  { key: 'uat.issueMissing', fallback: '功能缺失' },
  { key: 'uat.issueFormat', fallback: '报告格式问题' },
  { key: 'uat.issueComplex', fallback: '配置复杂' },
  { key: 'uat.issueErrorMsg', fallback: '错误提示不明确' },
  { key: 'uat.issueDataLoss', fallback: '数据丢失' },
];

// ─── 提交反馈对话框 ───

const CreateFeedbackDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: CreateFeedbackPayload) => Promise<void>;
}) => {
  const { t } = useTranslation();
  const [testType, setTestType] = useState('website');
  const [ratings, setRatings] = useState<Record<string, number>>({
    usability: 4,
    accuracy: 4,
    speed: 4,
    reliability: 4,
    overall: 4,
  });
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTestType('website');
      setRatings({ usability: 4, accuracy: 4, speed: 4, reliability: 4, overall: 4 });
      setSelectedIssues([]);
      setComments('');
    }
  }, [open]);

  const toggleIssue = (issue: string) => {
    setSelectedIssues(prev =>
      prev.includes(issue) ? prev.filter(i => i !== issue) : [...prev, issue]
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        sessionId: `uat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        testType,
        ratings,
        issues: selectedIssues,
        comments: comments.trim() || undefined,
        completed: true,
        submittedAt: new Date().toISOString(),
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(
        t('uat.submitFailedDetail', {
          detail: err instanceof Error ? err.message : String(err),
          defaultValue: '提交失败: {{detail}}',
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{t('uat.submitTitle', '提交 UAT 反馈')}</DialogTitle>
          <DialogDescription>
            {t('uat.submitDesc', '对测试功能进行评价和反馈，帮助改进产品质量')}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-5 py-2'>
          {/* 测试类型 */}
          <div className='space-y-2'>
            <Label>{t('uat.testType', '测试类型')}</Label>
            <Select value={testType} onValueChange={setTestType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEST_TYPES.map(tt => (
                  <SelectItem key={tt.value} value={tt.value}>
                    {t(tt.labelKey, tt.fallback)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 评分 */}
          <div className='space-y-3'>
            <Label>{t('uat.ratingLabel', '评分（1-5 分）')}</Label>
            {Object.entries(RATING_LABELS).map(([key, rl]) => (
              <div key={key} className='flex items-center gap-3'>
                <span className='text-sm w-16 shrink-0'>{t(rl.key, rl.fallback)}</span>
                <div className='flex gap-1'>
                  {[1, 2, 3, 4, 5].map(score => (
                    <button
                      key={score}
                      type='button'
                      onClick={() => setRatings(prev => ({ ...prev, [key]: score }))}
                      className='p-0.5'
                    >
                      <Star
                        className={`h-5 w-5 transition-colors ${
                          score <= (ratings[key] || 0)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className='text-xs text-muted-foreground'>{ratings[key]}/5</span>
              </div>
            ))}
          </div>

          {/* 问题标签 */}
          <div className='space-y-2'>
            <Label>{t('uat.issuesLabel', '遇到的问题（可多选）')}</Label>
            <div className='flex flex-wrap gap-2'>
              {ISSUE_PRESETS.map(issue => {
                const label = t(issue.key, issue.fallback);
                return (
                  <Badge
                    key={issue.key}
                    variant={selectedIssues.includes(label) ? 'default' : 'outline'}
                    className='cursor-pointer select-none'
                    onClick={() => toggleIssue(label)}
                  >
                    {label}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* 补充说明 */}
          <div className='space-y-2'>
            <Label>{t('uat.commentsLabel', '补充说明（可选）')}</Label>
            <Textarea
              placeholder={t('uat.commentsPlaceholder', '描述你遇到的具体问题或改进建议...')}
              rows={3}
              value={comments}
              onChange={e => setComments(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('common.cancel', '取消')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('common.submitting', '提交中...') : t('uat.submitFeedback', '提交反馈')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── 反馈详情对话框 ───

const FeedbackDetailDialog = ({
  feedback,
  open,
  onOpenChange,
  onDelete,
}: {
  feedback: UatFeedback | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDelete?: (id: string) => Promise<void>;
}) => {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!feedback) return null;

  const ttMatch = TEST_TYPES.find(tt => tt.value === feedback.test_type);
  const typeLabel = ttMatch ? t(ttMatch.labelKey, ttMatch.fallback) : feedback.test_type;
  const avgRating =
    Object.values(feedback.ratings || {}).length > 0
      ? (
          Object.values(feedback.ratings).reduce((a, b) => a + b, 0) /
          Object.values(feedback.ratings).length
        ).toFixed(1)
      : '-';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <MessageSquare className='h-5 w-5 text-muted-foreground' />
            {t('uat.feedbackDetail', '反馈详情')}
          </DialogTitle>
          <DialogDescription>
            {typeLabel} ·{' '}
            {feedback.submitted_at ? new Date(feedback.submitted_at).toLocaleString() : '-'}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          {/* 评分 */}
          {Object.keys(feedback.ratings || {}).length > 0 && (
            <div className='space-y-2'>
              <div className='text-sm font-medium'>
                {t('uat.ratingAvg', { avg: avgRating, defaultValue: '评分（平均 {{avg}}）' })}
              </div>
              <div className='grid grid-cols-2 gap-2'>
                {Object.entries(feedback.ratings).map(([key, val]) => (
                  <div key={key} className='flex items-center gap-2 rounded-lg border p-2'>
                    <span className='text-xs text-muted-foreground flex-1'>
                      {RATING_LABELS[key]
                        ? t(RATING_LABELS[key].key, RATING_LABELS[key].fallback)
                        : key}
                    </span>
                    <div className='flex gap-0.5'>
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s}
                          className={`h-3 w-3 ${
                            s <= val ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 问题 */}
          {feedback.issues?.length > 0 && (
            <div className='space-y-2'>
              <div className='text-sm font-medium'>{t('uat.reportedIssues', '报告的问题')}</div>
              <div className='flex flex-wrap gap-1.5'>
                {feedback.issues.map((issue, idx) => (
                  <Badge key={idx} variant='destructive' className='text-xs'>
                    {issue}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 补充说明 */}
          {feedback.comments && (
            <div className='space-y-2'>
              <div className='text-sm font-medium'>{t('uat.commentsTitle', '补充说明')}</div>
              <div className='text-sm text-muted-foreground bg-muted/50 rounded-md p-3'>
                {feedback.comments}
              </div>
            </div>
          )}

          {/* 元信息 */}
          <div className='grid grid-cols-2 gap-2 text-xs text-muted-foreground'>
            <div>
              {t('uat.sessionId', '会话 ID')}:{' '}
              <span className='font-mono'>{feedback.session_id}</span>
            </div>
            <div>
              {t('uat.status', '状态')}:{' '}
              {feedback.completed
                ? t('uat.statusCompleted', '已完成')
                : t('uat.statusIncomplete', '未完成')}
            </div>
            <div>
              {t('uat.actionCount', '操作数')}: {feedback.actions?.length || 0}
            </div>
            <div>
              {t('uat.createdAt', '创建时间')}: {new Date(feedback.created_at).toLocaleString()}
            </div>
          </div>
        </div>

        <DialogFooter className='flex justify-between sm:justify-between'>
          {onDelete && feedback.id && !confirmDelete ? (
            <Button
              variant='ghost'
              size='sm'
              className='text-red-600 hover:text-red-700 hover:bg-red-50'
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className='h-4 w-4 mr-1' />
              {t('common.delete', '删除')}
            </Button>
          ) : onDelete && feedback.id && confirmDelete ? (
            <div className='flex items-center gap-2'>
              <span className='text-xs text-red-600'>
                {t('common.confirmDelete', '确认删除？')}
              </span>
              <Button
                variant='destructive'
                size='sm'
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await onDelete(feedback.id);
                    setConfirmDelete(false);
                    onOpenChange(false);
                  } catch (err) {
                    toast.error(
                      t('uat.deleteFailedDetail', {
                        detail: err instanceof Error ? err.message : String(err),
                        defaultValue: '删除失败: {{detail}}',
                      })
                    );
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? t('common.deleting', '删除中...') : t('common.confirm', '确认')}
              </Button>
              <Button variant='ghost' size='sm' onClick={() => setConfirmDelete(false)}>
                {t('common.cancel', '取消')}
              </Button>
            </div>
          ) : (
            <div />
          )}
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('common.close', '关闭')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── 主页面 ───

const UatFeedbackContent = () => {
  const { t } = useTranslation();
  const { workspaceId } = useTestWorkspace();

  const [feedbacks, setFeedbacks] = useState<UatFeedback[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // 对话框
  const [createOpen, setCreateOpen] = useState(false);
  const [detailFeedback, setDetailFeedback] = useState<UatFeedback | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await uatApi.listFeedbacks({
        workspaceId: workspaceId || undefined,
        limit: 50,
      });
      if (result && result.items) {
        setFeedbacks(result.items);
        setTotal(result.total);
      } else if (Array.isArray(result)) {
        setFeedbacks(result as unknown as UatFeedback[]);
        setTotal((result as unknown[]).length);
      }
    } catch {
      toast.error(t('uat.loadFailed', '加载反馈数据失败'));
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

  // 统计
  const stats = useMemo(() => {
    const completed = feedbacks.filter(f => f.completed).length;
    const allRatings = feedbacks.flatMap(f => Object.values(f.ratings || {}));
    const avgRating =
      allRatings.length > 0
        ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1)
        : '-';
    const totalIssues = feedbacks.reduce((sum, f) => sum + (f.issues?.length || 0), 0);
    return { total, completed, avgRating, totalIssues };
  }, [feedbacks, total]);

  // 过滤
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(f => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !f.test_type?.toLowerCase().includes(q) &&
          !f.comments?.toLowerCase().includes(q) &&
          !f.session_id?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (typeFilter !== 'all' && f.test_type !== typeFilter) return false;
      return true;
    });
  }, [feedbacks, searchQuery, typeFilter]);

  // 操作
  const handleCreate = async (payload: CreateFeedbackPayload) => {
    await uatApi.createFeedback({
      ...payload,
      workspaceId: workspaceId || undefined,
    });
    toast.success(t('uat.submitSuccess', '反馈提交成功'));
    void loadData();
  };

  const handleDelete = async (id: string) => {
    await uatApi.deleteFeedback(id);
    toast.success(t('uat.feedbackDeleted', '反馈已删除'));
    setDetailFeedback(null);
    void loadData();
  };

  return (
    <div className='space-y-6 p-6 max-w-7xl mx-auto'>
      {/* 页面标题 */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>{t('uat.title', 'UAT 反馈')}</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            {t('uat.description', '收集和管理用户验收测试反馈，持续改进产品质量')}
          </p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => void loadData()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', '刷新')}
          </Button>
          <Button size='sm' onClick={() => setCreateOpen(true)}>
            <Plus className='h-4 w-4 mr-1' />
            {t('uat.submitFeedback', '提交反馈')}
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <Card>
          <CardContent className='pt-4 pb-3'>
            <Statistic
              title={t('uat.statTotal', '总反馈')}
              value={stats.total}
              prefix={<MessageSquare className='h-4 w-4 text-blue-500' />}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-4 pb-3'>
            <Statistic
              title={t('uat.statCompleted', '已完成')}
              value={stats.completed}
              prefix={<CheckCircle2 className='h-4 w-4 text-green-500' />}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-4 pb-3'>
            <Statistic
              title={t('uat.statAvgRating', '平均评分')}
              value={stats.avgRating}
              prefix={<Star className='h-4 w-4 text-yellow-500' />}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-4 pb-3'>
            <Statistic
              title={t('uat.statTotalIssues', '问题总数')}
              value={stats.totalIssues}
              prefix={<XCircle className='h-4 w-4 text-red-500' />}
            />
          </CardContent>
        </Card>
      </div>

      {/* 过滤栏 */}
      <div className='flex flex-wrap gap-3 items-center'>
        <div className='relative flex-1 min-w-[200px] max-w-sm'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder={t('uat.searchPlaceholder', '搜索反馈...')}
            className='pl-9'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className='w-[130px]'>
            <SelectValue placeholder={t('uat.filterType', '类型')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{t('uat.filterAllTypes', '全部类型')}</SelectItem>
            {TEST_TYPES.map(tt => (
              <SelectItem key={tt.value} value={tt.value}>
                {t(tt.labelKey, tt.fallback)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 反馈列表 */}
      <Card>
        <CardHeader className='py-3 px-4 border-b'>
          <CardTitle className='text-sm font-medium'>
            {t('uat.feedbackRecords', '反馈记录')} ({filteredFeedbacks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          {loading && feedbacks.length === 0 ? (
            <div className='flex items-center justify-center h-32 text-muted-foreground text-sm'>
              {t('common.loading', '加载中...')}
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2'>
              <MessageSquare className='h-8 w-8 opacity-30' />
              <span>
                {feedbacks.length === 0
                  ? t('uat.noFeedbacks', '暂无反馈记录，点击「提交反馈」开始')
                  : t('uat.noMatch', '没有匹配的反馈')}
              </span>
            </div>
          ) : (
            <div className='divide-y'>
              {filteredFeedbacks.map(fb => {
                const ttm = TEST_TYPES.find(tt => tt.value === fb.test_type);
                const typeLabel = ttm ? t(ttm.labelKey, ttm.fallback) : fb.test_type;
                const avgR =
                  Object.values(fb.ratings || {}).length > 0
                    ? (
                        Object.values(fb.ratings).reduce((a, b) => a + b, 0) /
                        Object.values(fb.ratings).length
                      ).toFixed(1)
                    : null;
                const ratingPct = avgR ? (parseFloat(avgR) / 5) * 100 : 0;

                return (
                  <div
                    key={fb.id || fb.session_id}
                    role='button'
                    tabIndex={0}
                    className='flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer'
                    onClick={() => {
                      setDetailFeedback(fb);
                      setDetailOpen(true);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setDetailFeedback(fb);
                        setDetailOpen(true);
                      }
                    }}
                  >
                    {/* 状态 */}
                    <div className='shrink-0'>
                      {fb.completed ? (
                        <ThumbsUp className='h-4 w-4 text-green-500' />
                      ) : (
                        <Clock className='h-4 w-4 text-yellow-500' />
                      )}
                    </div>

                    {/* 信息 */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2'>
                        <Badge variant='outline' className='text-[10px] shrink-0'>
                          {typeLabel}
                        </Badge>
                        {fb.issues?.length > 0 && (
                          <Badge variant='destructive' className='text-[10px] shrink-0'>
                            {t('uat.issueCount', {
                              count: fb.issues.length,
                              defaultValue: '{{count}} 个问题',
                            })}
                          </Badge>
                        )}
                        {fb.comments && (
                          <span className='text-xs text-muted-foreground truncate'>
                            {fb.comments}
                          </span>
                        )}
                      </div>
                      <div className='text-xs text-muted-foreground mt-0.5'>
                        {fb.submitted_at
                          ? new Date(fb.submitted_at).toLocaleString()
                          : new Date(fb.created_at).toLocaleString()}
                      </div>
                    </div>

                    {/* 评分进度条 */}
                    {avgR && (
                      <div className='w-24 shrink-0 hidden md:block'>
                        <div className='flex items-center gap-1.5'>
                          <Progress value={ratingPct} className='h-1.5 flex-1' />
                          <span className='text-xs font-medium w-7 text-right'>{avgR}</span>
                        </div>
                      </div>
                    )}

                    <ChevronRight className='h-4 w-4 text-muted-foreground shrink-0' />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建反馈对话框 */}
      <CreateFeedbackDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      {/* 反馈详情对话框 */}
      <FeedbackDetailDialog
        feedback={detailFeedback}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDelete={handleDelete}
      />
    </div>
  );
};

const UatFeedbackPage = () => {
  const { t } = useTranslation();

  if (isDesktopEnv()) {
    return (
      <div className='container py-6 space-y-4'>
        <h2 className='text-2xl font-bold tracking-tight'>{t('uat.title', 'UAT 反馈')}</h2>
        <DesktopFeaturePlaceholder
          featureName={t('uat.title', 'UAT 反馈')}
          description={t(
            'uat.desktopUnavailable',
            'UAT 反馈管理需要云端协作服务支持，桌面离线版暂不支持。您可以通过 Web 版提交和管理反馈。'
          )}
        />
      </div>
    );
  }

  return <UatFeedbackContent />;
};

export default UatFeedbackPage;
