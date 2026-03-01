import {
  ArrowUpDown,
  Ban,
  BarChart3,
  Check as CheckIcon,
  Clock,
  Download,
  Loader2,
  Play,
  Search,
  Trash2,
  Trophy,
} from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { getTestStatusMeta } from '../constants/status';
import {
  TEST_TYPE_LABELS,
  useTestConfig,
  useTestHistory,
  useTestWorkspace,
} from '../context/TestContext';
import { batchDelete } from '../services/batchApi';
import { cancelTest, deleteTest, rerunTest, updateTest } from '../services/testApi';
import { formatRelativeTime } from '../utils/date';
import { isDesktop } from '../utils/environment';
import { startTimer, trackCounter } from '../utils/telemetry';

const HistoryContent = () => {
  const { history, historyPagination, refreshHistory } = useTestHistory();
  const { updateConfigText, updateUrl, selectTestType } = useTestConfig();
  const { workspaceId } = useTestWorkspace();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const _isDesktop = isDesktop();
  const [searchParams, setSearchParams] = useSearchParams();

  // P2: 从 URL query 初始化筛选状态
  const [keywordInput, setKeywordInput] = useState(searchParams.get('q') || '');
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get('type') || 'all');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [page, setPage] = useState(Number(searchParams.get('page')) || historyPagination.page);
  const [pageSize] = useState(historyPagination.limit);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [tagEditing, setTagEditing] = useState<Record<string, string>>({});
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    actionLabel: string;
    variant?: 'default' | 'destructive';
  }>({
    open: false,
    title: '',
    description: '',
    action: async () => {},
    actionLabel: '',
  });

  const [sortField, setSortField] = useState<'createdAt' | 'type' | 'status'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (field: 'createdAt' | 'type' | 'status') => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filteredHistory = useMemo(() => {
    const sorted = [...history].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'createdAt') {
        cmp = new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
      } else if (sortField === 'type') {
        cmp = (a.type ?? '').localeCompare(b.type ?? '');
      } else if (sortField === 'status') {
        cmp = (a.status ?? '').localeCompare(b.status ?? '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [history, sortField, sortDir]);

  useEffect(() => {
    if (keywordInput.trim() !== keyword) setSearching(true);
    const timer = setTimeout(() => {
      setKeyword(keywordInput.trim());
      setPage(1);
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [keywordInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // P2: 筛选/翻页变更时同步 URL query 并刷新数据（合并为单个 effect 避免多次重渲染）
  useEffect(() => {
    const params: Record<string, string> = {};
    if (keyword) params.q = keyword;
    if (typeFilter !== 'all') params.type = typeFilter;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (page > 1) params.page = String(page);
    setSearchParams(params, { replace: true });

    void refreshHistory({
      page,
      limit: pageSize,
      testType: typeFilter === 'all' ? undefined : typeFilter,
      keyword: keyword || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, page, pageSize, typeFilter, statusFilter]);

  // ── 统计摘要（全量数据，来源于后端聚合） ──
  const stats = useMemo(() => {
    const total = historyPagination.total;
    const sc = historyPagination.statusCounts || {};
    const completed = sc.completed ?? filteredHistory.filter(i => i.status === 'completed').length;
    const failed = sc.failed ?? filteredHistory.filter(i => i.status === 'failed').length;
    const avgScore = historyPagination.avgScore ?? null;
    const avgDuration = historyPagination.avgDuration ?? null;
    return { total, completed, failed, avgScore, avgDuration };
  }, [filteredHistory, historyPagination]);

  // ── 按状态过滤（前端侧） ──
  const displayHistory = useMemo(() => {
    if (statusFilter === 'all') return filteredHistory;
    return filteredHistory.filter(i => i.status === statusFilter);
  }, [filteredHistory, statusFilter]);

  const selectedRecords = useMemo(
    () => displayHistory.filter(r => selectedRowKeys.includes(r.id)),
    [displayHistory, selectedRowKeys]
  );

  // ── 类型颜色映射 ──
  const TYPE_COLORS: Record<string, string> = {
    performance: '#8b5cf6',
    security: '#ef4444',
    seo: '#22c55e',
    api: '#3b82f6',
    stress: '#f97316',
    accessibility: '#06b6d4',
    compatibility: '#ec4899',
    ux: '#a855f7',
    website: '#6366f1',
  };

  // ── 耗时格式化 ──
  const formatDuration = (ms?: number) => {
    if (ms == null) return '-';
    if (ms < 1000) return `${ms}ms`;
    const sec = ms / 1000;
    if (sec < 60) return `${sec.toFixed(1)}s`;
    const min = Math.floor(sec / 60);
    const remainSec = Math.round(sec % 60);
    return `${min}m ${remainSec}s`;
  };

  // ── 分数颜色 ──
  const getScoreColor = (score?: number) => {
    if (score == null) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const refreshCurrent = async () => {
    await refreshHistory({
      page,
      limit: pageSize,
      testType: typeFilter === 'all' ? undefined : typeFilter,
      keyword: keyword || undefined,
    });
  };

  const STATUS_OPTIONS = [
    { value: 'all', label: t('common.all') },
    { value: 'completed', label: t('status.completed') },
    { value: 'failed', label: t('status.failed') },
    { value: 'running', label: t('status.running') },
    { value: 'pending', label: t('status.pending') },
    { value: 'cancelled', label: t('status.cancelled') },
  ];

  const handleReplay = (record: {
    id: string;
    url?: string;
    type?: string;
    configText?: string;
  }) => {
    if (!record.configText) {
      toast.error(t('history.replayFailed'));
      return;
    }
    if (record.url) updateUrl(record.url);
    if (record.type) selectTestType(record.type as import('../context/TestContext').TestType);
    updateConfigText(record.configText);
    trackCounter('config.replay');
    toast.success(t('history.replaySuccess'));
    navigate('/dashboard');
  };

  const handleSaveTags = async (record: { id: string; tags?: string[] }) => {
    const raw = tagEditing[record.id];
    const tags = raw
      ? raw
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean)
      : [];
    setActionLoadingId(record.id);
    try {
      await updateTest(record.id, { tags }, workspaceId || undefined);
      toast.success(t('history.tagSaved'));
      await refreshCurrent();
      setTagEditing(prev => {
        const next = { ...prev };
        delete next[record.id];
        return next;
      });
    } catch (error) {
      toast.error((error as Error).message || t('history.tagSaveFailed'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const openConfirm = (
    title: string,
    description: string,
    action: () => Promise<void>,
    actionLabel: string,
    variant: 'default' | 'destructive' = 'default'
  ) => {
    setConfirmDialog({
      open: true,
      title,
      description,
      action,
      actionLabel,
      variant,
    });
  };

  const handleBulkCancel = () => {
    const targets = selectedRecords.filter(
      record =>
        record.status === 'pending' || record.status === 'queued' || record.status === 'running'
    );
    if (targets.length === 0) {
      toast.info(t('history.cancelNone'));
      return;
    }
    openConfirm(
      t('history.bulkCancelTitle'),
      t('history.bulkCancelContent', { count: targets.length }),
      async () => {
        setBulkLoading(true);
        try {
          await Promise.allSettled(
            targets.map(record => cancelTest(record.id, workspaceId || undefined))
          );
          toast.success(t('history.cancelSuccess'));
          await refreshCurrent();
          setSelectedRowKeys([]);
        } finally {
          setBulkLoading(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      },
      t('history.bulkCancelOk'),
      'destructive'
    );
  };

  const handleBulkRerun = () => {
    if (selectedRecords.length === 0) {
      toast.info(t('history.rerunNone'));
      return;
    }
    openConfirm(
      t('history.bulkRerunTitle'),
      t('history.bulkRerunContent', { count: selectedRecords.length }),
      async () => {
        setBulkLoading(true);
        try {
          await Promise.allSettled(
            selectedRecords.map(record => rerunTest(record.id, workspaceId || undefined))
          );
          toast.success(t('history.rerunSuccess'));
          await refreshCurrent();
          setSelectedRowKeys([]);
        } finally {
          setBulkLoading(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      },
      t('history.bulkRerunOk')
    );
  };

  const handleBulkDelete = () => {
    if (selectedRecords.length === 0) {
      toast.info(t('history.deleteNone'));
      return;
    }
    openConfirm(
      t('history.bulkDeleteTitle'),
      t('history.bulkDeleteContent', { count: selectedRecords.length }),
      async () => {
        setBulkLoading(true);
        try {
          await batchDelete(selectedRecords.map(record => record.id));
          toast.success(t('history.deleteSuccess'));
          await refreshCurrent();
          setSelectedRowKeys([]);
        } finally {
          setBulkLoading(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      },
      t('history.bulkDeleteOk'),
      'destructive'
    );
  };

  const handleCancel = (record: { id: string }) => {
    openConfirm(
      t('history.cancelTitle'),
      t('history.cancelContent'),
      async () => {
        setActionLoadingId(record.id);
        try {
          await cancelTest(record.id, workspaceId || undefined);
          toast.success(t('history.cancelSuccess'));
          await refreshCurrent();
        } catch (error) {
          toast.error((error as Error).message || t('history.cancelFailed'));
        } finally {
          setActionLoadingId(null);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      },
      t('history.bulkCancelOk'),
      'destructive'
    );
  };

  const handleRerun = async (record: { id: string }) => {
    setActionLoadingId(record.id);
    try {
      const data = await rerunTest(record.id, workspaceId || undefined);
      toast.success(t('history.rerunSuccess'));
      if (data?.testId) {
        trackCounter('test.rerun');
        startTimer('rerun', String(data.testId));
      }
      await refreshCurrent();
      if (data?.testId) {
        navigate(`/history/${data.testId}`);
      }
    } catch (error) {
      toast.error((error as Error).message || t('history.rerunFailed'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = (record: { id: string }) => {
    openConfirm(
      t('history.deleteTitle'),
      t('history.deleteContent'),
      async () => {
        setActionLoadingId(record.id);
        try {
          await deleteTest(record.id, workspaceId || undefined);
          toast.success(t('history.deleteSuccess'));
          await refreshCurrent();
        } catch (error) {
          toast.error((error as Error).message || t('history.deleteFailed'));
        } finally {
          setActionLoadingId(null);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      },
      t('history.bulkDeleteOk'),
      'destructive'
    );
  };

  const toggleSelectAll = () => {
    if (selectedRowKeys.length === displayHistory.length) {
      setSelectedRowKeys([]);
    } else {
      setSelectedRowKeys(displayHistory.map(item => item.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedRowKeys(prev => (prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]));
  };

  const totalPages = Math.ceil(historyPagination.total / pageSize);

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-end'>
        <div className='flex items-center flex-wrap gap-2'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm' className='w-[100px]'>
                <Download className='h-3.5 w-3.5 mr-1' />
                {t('history.export', '导出')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              {(['json', 'csv'] as const).map(fmt => (
                <DropdownMenuItem
                  key={fmt}
                  onClick={() => {
                    if (selectedRowKeys.length === 0) {
                      toast.info(t('history.exportNoSelection', '请先勾选要导出的记录'));
                      return;
                    }
                    const exportData = selectedRecords;
                    const label = t('history.exportSelected', {
                      count: selectedRowKeys.length,
                      defaultValue: `已导出 ${selectedRowKeys.length} 条选中记录`,
                    });
                    if (fmt === 'json') {
                      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                        type: 'application/json',
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `test-report-${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } else {
                      const headers = [
                        'ID',
                        'URL',
                        'Type',
                        'Status',
                        'Score',
                        'Duration(ms)',
                        'CreatedAt',
                        'Tags',
                      ];
                      const rows = exportData.map(r => [
                        r.id,
                        r.url,
                        r.type,
                        r.status,
                        r.score ?? '',
                        r.duration ?? '',
                        r.createdAt,
                        (r.tags || []).join(';'),
                      ]);
                      const csv = [
                        headers.join(','),
                        ...rows.map(r =>
                          r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')
                        ),
                      ].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `test-report-${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                    toast.success(label);
                  }}
                >
                  {fmt.toUpperCase()}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className='relative w-48'>
            {searching ? (
              <Loader2 className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground animate-spin' />
            ) : (
              <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
            )}
            <Input
              placeholder={t('history.searchPlaceholder')}
              value={keywordInput}
              onChange={e => setKeywordInput(e.target.value)}
              className='pl-8'
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={v => {
              setTypeFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className='w-[130px]'>
              <SelectValue placeholder={t('history.filterPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>{t('common.all')}</SelectItem>
              {Object.entries(TEST_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {t(label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={v => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className='w-[130px]'>
              <SelectValue placeholder={t('history.filterStatus')} />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 统计摘要 — 内联指标条 */}
      <div className='flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-sm'>
        <span className='inline-flex items-center gap-1.5'>
          <BarChart3 className='h-3.5 w-3.5 text-blue-500' />
          <span className='text-muted-foreground'>{t('history.statsTotal')}</span>
          <span className='font-semibold'>{stats.total}</span>
        </span>
        <span className='inline-flex items-center gap-1.5'>
          <CheckIcon className='h-3.5 w-3.5 text-green-500' />
          <span className='text-muted-foreground'>{t('history.statsCompleted')}</span>
          <span className='font-semibold text-green-600'>{stats.completed}</span>
        </span>
        <span className='inline-flex items-center gap-1.5'>
          <Ban className='h-3.5 w-3.5 text-red-500' />
          <span className='text-muted-foreground'>{t('history.statsFailed')}</span>
          <span className='font-semibold text-red-600'>{stats.failed}</span>
        </span>
        <span className='inline-flex items-center gap-1.5'>
          <Trophy className='h-3.5 w-3.5 text-amber-500' />
          <span className='text-muted-foreground'>{t('history.statsAvgScore')}</span>
          <span className={`font-semibold ${getScoreColor(stats.avgScore ?? undefined)}`}>
            {stats.avgScore != null ? stats.avgScore : '-'}
          </span>
        </span>
        <span className='inline-flex items-center gap-1.5'>
          <Clock className='h-3.5 w-3.5 text-purple-500' />
          <span className='text-muted-foreground'>{t('history.statsAvgDuration')}</span>
          <span className='font-semibold'>{formatDuration(stats.avgDuration ?? undefined)}</span>
        </span>
      </div>

      {/* 类型分布（全量数据） */}
      {(() => {
        const typeCounts = historyPagination.typeCounts || {};
        const entries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
        if (entries.length === 0) return null;
        const maxCount = Math.max(...Object.values(typeCounts), 1);
        return (
          <div className='p-4 rounded-lg border bg-card'>
            <p className='text-xs font-medium text-muted-foreground mb-3'>
              {t('history.typeDistribution', '类型分布')}
            </p>
            <div className='flex items-end gap-1.5' style={{ height: 48 }}>
              {entries.map(([type, count]) => (
                <div key={type} className='flex-1 flex flex-col items-center gap-1 min-w-0'>
                  <span className='text-[10px] font-medium'>{count}</span>
                  <div
                    className='w-full rounded-t-sm transition-all'
                    style={{
                      height: `${Math.max((count / maxCount) * 32, 4)}px`,
                      backgroundColor: TYPE_COLORS[type] || '#6b7280',
                    }}
                  />
                  <span className='text-[9px] text-muted-foreground truncate w-full text-center'>
                    {t((TEST_TYPE_LABELS as Record<string, string>)[type] ?? type)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {selectedRowKeys.length > 0 && (
        <div className='flex items-center gap-2 p-2 bg-muted/50 rounded-md'>
          <span className='text-sm text-muted-foreground ml-2'>
            {t('history.selected', { count: selectedRowKeys.length })}
          </span>
          <div className='ml-auto flex items-center gap-2'>
            {_isDesktop && (
              <Button size='sm' variant='outline' onClick={handleBulkRerun} disabled={bulkLoading}>
                <Play className='mr-2 h-3.5 w-3.5' />
                {t('history.bulkRerun')}
              </Button>
            )}
            <Button size='sm' variant='outline' onClick={handleBulkCancel} disabled={bulkLoading}>
              <Ban className='mr-2 h-3.5 w-3.5' />
              {t('history.bulkCancel')}
            </Button>
            <Button
              size='sm'
              variant='destructive'
              onClick={handleBulkDelete}
              disabled={bulkLoading}
            >
              <Trash2 className='mr-2 h-3.5 w-3.5' />
              {t('history.bulkDelete')}
            </Button>
            <Button size='sm' variant='ghost' onClick={() => setSelectedRowKeys([])}>
              {t('history.clearSelection')}
            </Button>
          </div>
        </div>
      )}

      <div className='border rounded-md'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[40px]'>
                <Checkbox
                  checked={
                    displayHistory.length > 0 && selectedRowKeys.length === displayHistory.length
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>{t('history.name')}</TableHead>
              <TableHead>{t('history.type')}</TableHead>
              <TableHead>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 -ml-3 font-medium'
                  onClick={() => toggleSort('status')}
                >
                  {t('history.status')}
                  <ArrowUpDown className='ml-1 h-3 w-3' />
                </Button>
              </TableHead>
              <TableHead className='text-center'>{t('history.score')}</TableHead>
              <TableHead className='text-center'>{t('history.duration')}</TableHead>
              <TableHead>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 -ml-3 font-medium'
                  onClick={() => toggleSort('createdAt')}
                >
                  {t('history.createdAt')}
                  <ArrowUpDown className='ml-1 h-3 w-3' />
                </Button>
              </TableHead>
              <TableHead>{t('history.tags')}</TableHead>
              <TableHead className='text-right'>{t('history.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayHistory.map(record => {
              const meta = getTestStatusMeta(record.status || 'pending');
              const isProcessing =
                record.status === 'pending' ||
                record.status === 'queued' ||
                record.status === 'running';
              const isEditingTags = tagEditing[record.id] !== undefined;
              const typeColor = TYPE_COLORS[record.type] || '#6b7280';

              return (
                <TableRow
                  key={record.id}
                  className='cursor-pointer hover:bg-muted/50'
                  onClick={e => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button, input, [role="checkbox"]')) return;
                    navigate(`/history/${record.id}`);
                  }}
                >
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedRowKeys.includes(record.id)}
                      onCheckedChange={() => toggleSelect(record.id)}
                    />
                  </TableCell>
                  <TableCell className='font-medium'>
                    <div className='flex flex-col'>
                      <span className='truncate max-w-[220px]'>
                        {record.label || t('common.untitled')}
                      </span>
                      <span className='text-xs text-muted-foreground truncate max-w-[220px]'>
                        {record.url}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant='outline' style={{ borderColor: typeColor, color: typeColor }}>
                      {t(TEST_TYPE_LABELS[record.type] ?? record.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge style={{ backgroundColor: meta.color, color: '#fff', border: 'none' }}>
                      {t(meta.label)}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-center'>
                    <span className={`font-semibold ${getScoreColor(record.score)}`}>
                      {record.score != null ? record.score : '-'}
                    </span>
                  </TableCell>
                  <TableCell className='text-center text-sm text-muted-foreground'>
                    {formatDuration(record.duration)}
                  </TableCell>
                  <TableCell className='text-sm text-muted-foreground whitespace-nowrap'>
                    {formatRelativeTime(record.createdAt)}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className='flex items-center gap-2'>
                      <Input
                        className='h-7 w-[140px]'
                        placeholder={t('history.tagPlaceholder')}
                        value={tagEditing[record.id] ?? (record.tags || []).join(', ')}
                        onChange={e =>
                          setTagEditing(prev => ({ ...prev, [record.id]: e.target.value }))
                        }
                      />
                      {isEditingTags && (
                        <Button
                          size='sm'
                          variant='ghost'
                          className='h-7 w-7 p-0'
                          onClick={() => void handleSaveTags(record)}
                          disabled={actionLoadingId === record.id}
                        >
                          <CheckIcon className='h-4 w-4' />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='text-right' onClick={e => e.stopPropagation()}>
                    <div className='flex items-center justify-end gap-1'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => navigate(`/history/${record.id}`)}
                      >
                        {t('history.viewDetail')}
                      </Button>
                      {_isDesktop && (
                        <Button variant='ghost' size='sm' onClick={() => handleReplay(record)}>
                          {t('history.replay')}
                        </Button>
                      )}
                      {_isDesktop && (
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => handleRerun(record)}
                          disabled={actionLoadingId === record.id}
                        >
                          {t('history.rerun')}
                        </Button>
                      )}
                      {isProcessing ? (
                        <Button
                          variant='ghost'
                          size='sm'
                          className='text-destructive hover:text-destructive'
                          onClick={() => handleCancel(record)}
                        >
                          {t('history.cancel')}
                        </Button>
                      ) : (
                        <Button
                          variant='ghost'
                          size='sm'
                          className='text-destructive hover:text-destructive'
                          onClick={() => handleDelete(record)}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {displayHistory.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className='h-24 text-center text-muted-foreground'>
                  {t('common.noData')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className='py-4'>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              <PaginationItem>
                <span className='px-4 text-sm text-muted-foreground'>
                  {t('common.pagination', { current: page, total: totalPages })}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className={
                    page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={open => setConfirmDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialog.action}
              className={
                confirmDialog.variant === 'destructive'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {confirmDialog.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── 报告中心 Wrapper：Tabs 整合历史记录 + 报告模板 ───

const ReportsPageLazy = lazy(() => import('./ReportsPage'));

const HistoryPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('records');

  return (
    <div className='container py-6 space-y-4'>
      <h2 className='text-2xl font-bold tracking-tight'>{t('history.reportCenter', '报告中心')}</h2>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value='records'>{t('history.testRecords', '测试记录')}</TabsTrigger>
          <TabsTrigger value='templates'>{t('history.reportTemplates', '报告模板')}</TabsTrigger>
        </TabsList>
        <TabsContent value='records' className='mt-0'>
          <HistoryContent />
        </TabsContent>
        <TabsContent value='templates' className='mt-0'>
          <Suspense
            fallback={
              <div className='flex items-center justify-center h-32 text-muted-foreground text-sm'>
                {t('common.loading', '加载中...')}
              </div>
            }
          >
            <ReportsPageLazy />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HistoryPage;
