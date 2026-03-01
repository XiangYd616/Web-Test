import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ChevronDown,
  Filter,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  XCircle,
} from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Statistic } from '@/components/ui/statistic';

import {
  errorTrackingApi,
  type ErrorGroup,
  type ErrorRecord,
  type ErrorStatistics,
  type ErrorTrend,
} from '../services/errorTrackingApi';

// 辅助：判断错误是否已解决（后端在 details.resolved 中标记）
const isResolved = (err: ErrorRecord) => Boolean(err.details?.resolved);

// ─── 严重级别配置 ───

const severityConfig: Record<string, { color: string; labelKey: string; fallback: string }> = {
  critical: {
    color: 'border-red-500 text-red-600',
    labelKey: 'errorTracking.severityCritical',
    fallback: '严重',
  },
  high: {
    color: 'border-orange-500 text-orange-600',
    labelKey: 'errorTracking.severityHigh',
    fallback: '高',
  },
  medium: {
    color: 'border-yellow-500 text-yellow-600',
    labelKey: 'errorTracking.severityMedium',
    fallback: '中',
  },
  low: {
    color: 'border-blue-500 text-blue-600',
    labelKey: 'errorTracking.severityLow',
    fallback: '低',
  },
};

// ─── 主页面 ───

const ErrorTrackingPage = () => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<ErrorRecord[]>([]);
  const [statistics, setStatistics] = useState<ErrorStatistics | null>(null);
  const [trends, setTrends] = useState<ErrorTrend[]>([]);
  const [groups, setGroups] = useState<ErrorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedErrors, setSelectedErrors] = useState<Set<string>>(new Set());

  // 详情对话框
  const [detailError, setDetailError] = useState<ErrorRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [errorsData, statsData, trendsData, groupsData] = await Promise.allSettled([
        errorTrackingApi.getErrors({
          severity:
            severityFilter !== 'all' ? (severityFilter as ErrorRecord['severity']) : undefined,
          search: searchQuery || undefined,
        }),
        errorTrackingApi.getStatistics(),
        errorTrackingApi.getTrends(),
        errorTrackingApi.getGroups(),
      ]);

      if (errorsData.status === 'fulfilled') {
        const d = errorsData.value;
        setErrors(d?.errors ?? []);
      }
      if (statsData.status === 'fulfilled') setStatistics(statsData.value);
      if (trendsData.status === 'fulfilled') {
        const d = trendsData.value;
        setTrends(d?.series ?? []);
      }
      if (groupsData.status === 'fulfilled') {
        const d = groupsData.value;
        setGroups(d?.items ?? []);
      }
    } catch {
      toast.error(t('errorTracking.loadFailed', '加载错误数据失败'));
    } finally {
      setLoading(false);
    }
  }, [severityFilter, searchQuery, t]);

  useEffect(() => {
    let ignore = false;
    void loadData().then(() => {
      if (ignore) return;
    });
    return () => {
      ignore = true;
    };
  }, [loadData]);

  // 解决错误
  const handleResolve = async (id: string) => {
    try {
      await errorTrackingApi.resolveError(id);
      toast.success(t('errorTracking.resolved', '错误已标记为已解决'));
      void loadData();
    } catch {
      toast.error(t('errorTracking.operationFailed', '操作失败'));
    }
  };

  // 删除错误
  const handleDelete = async (id: string) => {
    try {
      await errorTrackingApi.deleteError(id);
      toast.success(t('errorTracking.deleted', '错误已删除'));
      void loadData();
    } catch {
      toast.error(t('errorTracking.deleteFailed', '删除失败'));
    }
  };

  // 批量解决
  const handleBatchResolve = async () => {
    if (selectedErrors.size === 0) return;
    try {
      await errorTrackingApi.batchResolve(Array.from(selectedErrors));
      toast.success(
        t('errorTracking.batchResolved', {
          count: selectedErrors.size,
          defaultValue: '已批量解决 {{count}} 个错误',
        })
      );
      setSelectedErrors(new Set());
      void loadData();
    } catch {
      toast.error(t('errorTracking.batchFailed', '批量操作失败'));
    }
  };

  // 查看详情
  const handleViewDetail = async (id: string) => {
    try {
      const detail = await errorTrackingApi.getError(id);
      setDetailError(detail);
      setDetailOpen(true);
    } catch {
      toast.error(t('errorTracking.detailFailed', '获取详情失败'));
    }
  };

  // 选择/取消选择
  const toggleSelect = (id: string) => {
    setSelectedErrors(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 趋势简要（最近 7 个点）
  const recentTrends = trends.slice(-7);
  const maxTrendCount = Math.max(...recentTrends.map(pt => pt.count), 1);

  return (
    <div className='space-y-6 p-6 max-w-7xl mx-auto'>
      {/* 页面标题 */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>
            {t('errorTracking.title', '错误追踪')}
          </h1>
          <p className='text-sm text-muted-foreground mt-1'>
            {t('errorTracking.description', '监控和管理系统运行中产生的错误')}
          </p>
        </div>
        <div className='flex gap-2'>
          {selectedErrors.size > 0 && (
            <Button variant='outline' size='sm' onClick={() => void handleBatchResolve()}>
              <CheckCircle2 className='h-4 w-4 mr-1' />
              {t('errorTracking.batchResolve', '批量解决')} ({selectedErrors.size})
            </Button>
          )}
          <Button variant='outline' size='sm' onClick={() => void loadData()}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', '刷新')}
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      {statistics && (
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <Card>
            <CardContent className='pt-4 pb-3 px-4'>
              <Statistic
                title={t('errorTracking.statTotal', '总错误数')}
                value={statistics.total}
                prefix={<Bug className='h-4 w-4 text-muted-foreground' />}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='pt-4 pb-3 px-4'>
              <Statistic
                title={t('errorTracking.statTypes', '错误类型数')}
                value={Object.keys(statistics.byType).length}
                prefix={<Filter className='h-4 w-4 text-blue-500' />}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='pt-4 pb-3 px-4'>
              <Statistic
                title={t('errorTracking.statGroups', '错误分组')}
                value={groups.length}
                prefix={<CheckCircle2 className='h-4 w-4 text-green-500' />}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* 趋势 + 分组 */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* 趋势迷你图 */}
        <Card>
          <CardHeader className='py-3 px-4 border-b'>
            <CardTitle className='text-sm font-medium flex items-center gap-2'>
              <TrendingUp className='h-4 w-4 text-muted-foreground' />
              {t('errorTracking.trends', '错误趋势')}
            </CardTitle>
          </CardHeader>
          <CardContent className='p-4'>
            {recentTrends.length === 0 ? (
              <div className='text-center text-muted-foreground text-sm py-6'>
                {t('errorTracking.noTrends', '暂无趋势数据')}
              </div>
            ) : (
              <div className='flex items-end gap-1 h-20'>
                {recentTrends.map((point, i) => (
                  <div key={i} className='flex-1 flex flex-col items-center gap-1'>
                    <div
                      className='w-full bg-primary/80 rounded-t transition-all min-h-[2px]'
                      style={{ height: `${(point.count / maxTrendCount) * 100}%` }}
                    />
                    <span className='text-[10px] text-muted-foreground truncate w-full text-center'>
                      {point.timestamp?.slice(-5) || ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 错误分组 */}
        <Card>
          <CardHeader className='py-3 px-4 border-b'>
            <CardTitle className='text-sm font-medium flex items-center gap-2'>
              <Bug className='h-4 w-4 text-muted-foreground' />
              {t('errorTracking.statGroups', '错误分组')}
            </CardTitle>
          </CardHeader>
          <CardContent className='p-0'>
            {groups.length === 0 ? (
              <div className='text-center text-muted-foreground text-sm py-6'>
                {t('errorTracking.noGroups', '暂无分组数据')}
              </div>
            ) : (
              <div className='divide-y'>
                {groups.slice(0, 5).map((group, i) => (
                  <div key={i} className='flex items-center gap-3 px-4 py-2.5'>
                    <span className='text-sm flex-1 truncate font-medium'>{group.key}</span>
                    <Badge variant='secondary' className='text-xs'>
                      {group.count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 筛选栏 */}
      <div className='flex flex-wrap gap-3'>
        <div className='relative flex-1 min-w-[200px]'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder={t('errorTracking.searchPlaceholder', '搜索错误信息...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className='pl-9 h-9'
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className='w-[130px] h-9'>
            <SelectValue placeholder={t('errorTracking.severityFilter', '严重级别')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{t('errorTracking.filterAll', '全部级别')}</SelectItem>
            <SelectItem value='critical'>{t('errorTracking.severityCritical', '严重')}</SelectItem>
            <SelectItem value='high'>{t('errorTracking.severityHigh', '高')}</SelectItem>
            <SelectItem value='medium'>{t('errorTracking.severityMedium', '中')}</SelectItem>
            <SelectItem value='low'>{t('errorTracking.severityLow', '低')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 错误列表 */}
      <Card>
        <CardHeader className='py-3 px-4 border-b'>
          <CardTitle className='text-sm font-medium flex items-center gap-2'>
            <AlertTriangle className='h-4 w-4 text-orange-500' />
            {t('errorTracking.listTitle', '错误列表')} ({errors.length})
          </CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          {loading ? (
            <div className='flex items-center justify-center h-32 text-muted-foreground text-sm'>
              <RefreshCw className='h-5 w-5 animate-spin mr-2' />
              {t('common.loading')}
            </div>
          ) : errors.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2'>
              <CheckCircle2 className='h-8 w-8 opacity-30' />
              <span>{t('errorTracking.noErrors', '暂无错误记录')}</span>
            </div>
          ) : (
            <div className='divide-y'>
              {errors.map(err => (
                <div
                  key={err.id}
                  role='button'
                  tabIndex={0}
                  className='flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer'
                  onClick={() => void handleViewDetail(err.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') void handleViewDetail(err.id);
                  }}
                >
                  <input
                    type='checkbox'
                    className='h-4 w-4 rounded border-gray-300'
                    checked={selectedErrors.has(err.id)}
                    onClick={e => e.stopPropagation()}
                    onChange={() => toggleSelect(err.id)}
                  />
                  <Badge
                    variant='outline'
                    className={
                      severityConfig[err.severity]?.color || 'border-gray-500 text-gray-600'
                    }
                  >
                    {severityConfig[err.severity]
                      ? t(
                          severityConfig[err.severity].labelKey,
                          severityConfig[err.severity].fallback
                        )
                      : err.severity}
                  </Badge>
                  <div className='flex-1 min-w-0'>
                    <div className='text-sm font-medium truncate'>{err.message}</div>
                    <div className='text-xs text-muted-foreground flex gap-3 mt-0.5'>
                      <span>{err.type}</span>
                      {err.source && (
                        <span>
                          {t('errorTracking.source', '来源')}: {err.source}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={isResolved(err) ? 'secondary' : 'destructive'}
                    className='text-[10px] shrink-0'
                  >
                    {isResolved(err)
                      ? t('errorTracking.statusResolved', '已解决')
                      : t('errorTracking.statusActive', '活跃')}
                  </Badge>
                  <span className='text-xs text-muted-foreground shrink-0'>
                    {new Date(err.timestamp).toLocaleString()}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant='ghost' size='icon' className='h-7 w-7 shrink-0'>
                        <ChevronDown className='h-3.5 w-3.5' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      {!isResolved(err) && (
                        <DropdownMenuItem onClick={() => void handleResolve(err.id)}>
                          <CheckCircle2 className='h-4 w-4 mr-2 text-green-500' />
                          {t('errorTracking.markResolved', '标记已解决')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className='text-red-600'
                        onClick={() => void handleDelete(err.id)}
                      >
                        <Trash2 className='h-4 w-4 mr-2' />
                        {t('common.delete', '删除')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 错误详情对话框 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className='sm:max-w-lg max-h-[80vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <XCircle className='h-5 w-5 text-red-500' />
              {t('errorTracking.detailTitle', '错误详情')}
            </DialogTitle>
            <DialogDescription>
              {detailError?.type} —{' '}
              {detailError && isResolved(detailError)
                ? t('errorTracking.statusResolved', '已解决')
                : t('errorTracking.statusActive', '活跃')}
            </DialogDescription>
          </DialogHeader>
          {detailError && (
            <div className='space-y-4 py-2'>
              <div>
                <div className='text-xs text-muted-foreground mb-1'>
                  {t('errorTracking.errorMessage', '错误消息')}
                </div>
                <div className='text-sm font-medium'>{detailError.message}</div>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <div className='text-xs text-muted-foreground mb-1'>
                    {t('errorTracking.severityLabel', '严重级别')}
                  </div>
                  <Badge
                    variant='outline'
                    className={severityConfig[detailError.severity]?.color || ''}
                  >
                    {severityConfig[detailError.severity]
                      ? t(
                          severityConfig[detailError.severity].labelKey,
                          severityConfig[detailError.severity].fallback
                        )
                      : detailError.severity}
                  </Badge>
                </div>
                <div>
                  <div className='text-xs text-muted-foreground mb-1'>
                    {t('errorTracking.time', '时间')}
                  </div>
                  <span className='text-sm'>
                    {detailError.timestamp ? new Date(detailError.timestamp).toLocaleString() : '-'}
                  </span>
                </div>
                {detailError.code && (
                  <div>
                    <div className='text-xs text-muted-foreground mb-1'>
                      {t('errorTracking.errorCode', '错误代码')}
                    </div>
                    <span className='text-sm font-medium'>{detailError.code}</span>
                  </div>
                )}
                {detailError.line != null && (
                  <div>
                    <div className='text-xs text-muted-foreground mb-1'>
                      {t('errorTracking.lineNumber', '行号')}
                    </div>
                    <span className='text-sm font-medium'>
                      {detailError.line}:{detailError.column ?? ''}
                    </span>
                  </div>
                )}
              </div>
              {detailError.source && (
                <div>
                  <div className='text-xs text-muted-foreground mb-1'>
                    {t('errorTracking.source', '来源')}
                  </div>
                  <span className='text-sm'>{detailError.source}</span>
                </div>
              )}
              {detailError.stack && (
                <div>
                  <div className='text-xs text-muted-foreground mb-1'>
                    {t('errorTracking.stackTrace', '堆栈信息')}
                  </div>
                  <pre className='text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-48 whitespace-pre-wrap'>
                    {detailError.stack}
                  </pre>
                </div>
              )}
              {detailError.details && Object.keys(detailError.details).length > 0 && (
                <div>
                  <div className='text-xs text-muted-foreground mb-1'>
                    {t('errorTracking.details', '详情')}
                  </div>
                  <pre className='text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-32'>
                    {JSON.stringify(detailError.details, null, 2)}
                  </pre>
                </div>
              )}
              {detailError.context && Object.keys(detailError.context).length > 0 && (
                <div>
                  <div className='text-xs text-muted-foreground mb-1'>
                    {t('errorTracking.context', '上下文')}
                  </div>
                  <pre className='text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-32'>
                    {JSON.stringify(detailError.context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {detailError && !isResolved(detailError) && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  void handleResolve(detailError.id);
                  setDetailOpen(false);
                }}
              >
                <CheckCircle2 className='h-4 w-4 mr-1' />
                {t('errorTracking.markResolved', '标记已解决')}
              </Button>
            )}
            <Button variant='outline' onClick={() => setDetailOpen(false)}>
              {t('common.close', '关闭')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { ErrorTrackingPage };
export default ErrorTrackingPage;
