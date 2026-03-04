import {
  Activity,
  AlertTriangle,
  Archive,
  Calendar,
  CheckCircle2,
  Cloud,
  CloudOff,
  CloudUpload,
  Database,
  Download,
  Loader2,
  RefreshCw,
  RotateCcw,
  Upload,
  User,
  WifiOff,
} from 'lucide-react';
import { Suspense, lazy, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { isDesktop } from '../utils/environment';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

/* ─── 数据备份管理面板（桌面端专用） ─── */
type BackupItem = { name: string; path: string; size: number; date: string };

const BackupManagementPanel = () => {
  const { t } = useTranslation();
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [dbStats, setDbStats] = useState<Record<string, unknown> | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const api = window.electronAPI?.database;
      if (!api) return;
      const [list, stats] = await Promise.all([
        api.listBackups?.() ?? [],
        api.getStats?.() ?? null,
      ]);
      setBackups(list as BackupItem[]);
      setDbStats(stats as Record<string, unknown> | null);
    } catch {
      toast.error(t('settings.backup.fetchFailed', '获取备份信息失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackupNow = async () => {
    setBacking(true);
    try {
      const api = window.electronAPI?.database;
      if (!api) throw new Error(t('settings.backup.apiUnavailable', '桌面端 API 不可用'));
      const date = new Date().toISOString().slice(0, 10);
      const time = new Date().toISOString().slice(11, 19).replace(/:/g, '');
      const dbPath = String((dbStats as Record<string, unknown>)?.dbPath || '');
      const dir = dbPath ? dbPath.replace(/[\\/][^\\/]+$/, '') + '/backups' : '';
      if (!dir) throw new Error(t('settings.backup.noDbPath', '无法获取数据库路径'));
      const backupPath = `${dir}/testweb_${date}_${time}.db`;
      await api.backup(backupPath);
      toast.success(t('settings.backup.backupSuccess', '备份成功'));
      await fetchData();
    } catch (err) {
      toast.error(
        t('settings.backup.backupFailedDetail', {
          detail: err instanceof Error ? err.message : String(err),
          defaultValue: '备份失败: {{detail}}',
        })
      );
    } finally {
      setBacking(false);
    }
  };

  const handleRestore = async (item: BackupItem) => {
    setRestoring(item.name);
    try {
      const api = window.electronAPI?.database;
      if (!api) throw new Error(t('settings.backup.apiUnavailable', '桌面端 API 不可用'));
      await api.restore(item.path);
      toast.success(
        t('settings.backup.restoreSuccess', '恢复成功，部分数据可能需要刷新页面后生效')
      );
      await fetchData();
    } catch (err) {
      toast.error(
        t('settings.backup.restoreFailedDetail', {
          detail: err instanceof Error ? err.message : String(err),
          defaultValue: '恢复失败: {{detail}}',
        })
      );
    } finally {
      setRestoring(null);
    }
  };

  const handleExport = async (format: 'json' | 'sql') => {
    try {
      const api = window.electronAPI?.database;
      if (!api) throw new Error(t('settings.backup.apiUnavailable', '桌面端 API 不可用'));
      const dbPath = String((dbStats as Record<string, unknown>)?.dbPath || '');
      const dir = dbPath ? dbPath.replace(/[\\/][^\\/]+$/, '') : '';
      if (!dir) throw new Error(t('settings.backup.noDbPath', '无法获取数据库路径'));
      const date = new Date().toISOString().slice(0, 10);
      const exportPath = `${dir}/export_${date}.${format}`;
      const result = (await api.export(format, exportPath)) as { recordCount?: number } | null;
      toast.success(
        t('settings.backup.exportSuccess', {
          count: result?.recordCount ?? 0,
          defaultValue: '导出成功 ({{count}} 条记录)',
        })
      );
    } catch (err) {
      toast.error(
        t('settings.backup.exportFailedDetail', {
          detail: err instanceof Error ? err.message : String(err),
          defaultValue: '导出失败: {{detail}}',
        })
      );
    }
  };

  return (
    <div className='space-y-4'>
      {/* 数据库概览 */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Database className='h-5 w-5' />
                {t('settings.backup.dbOverview', '数据库概览')}
              </CardTitle>
              <CardDescription>
                {t('settings.backup.dbOverviewDesc', '本地 SQLite 数据库状态和统计信息')}
              </CardDescription>
            </div>
            <Button variant='outline' size='sm' onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              {t('common.refresh', '刷新')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {dbStats ? (
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
              <div className='rounded-lg border p-3'>
                <div className='text-xs text-muted-foreground'>
                  {t('settings.backup.dbSize', '数据库大小')}
                </div>
                <div className='text-sm font-medium mt-1'>
                  {formatSize(Number(dbStats.dbSize || 0))}
                </div>
              </div>
              <div className='rounded-lg border p-3'>
                <div className='text-xs text-muted-foreground'>
                  {t('settings.backup.testRecords', '测试记录')}
                </div>
                <div className='text-sm font-medium mt-1'>{String(dbStats.testResults ?? 0)}</div>
              </div>
              <div className='rounded-lg border p-3'>
                <div className='text-xs text-muted-foreground'>
                  {t('settings.backup.templateCount', '模板数量')}
                </div>
                <div className='text-sm font-medium mt-1'>{String(dbStats.templates ?? 0)}</div>
              </div>
              <div className='rounded-lg border p-3'>
                <div className='text-xs text-muted-foreground'>
                  {t('settings.backup.reportCount', '报告数量')}
                </div>
                <div className='text-sm font-medium mt-1'>{String(dbStats.reports ?? 0)}</div>
              </div>
            </div>
          ) : loading ? (
            <div className='flex items-center justify-center py-6 text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin mr-2' />
              {t('common.loading', '加载中...')}
            </div>
          ) : (
            <div className='text-center py-6 text-muted-foreground text-sm'>
              {t('settings.backup.dbInfoUnavailable', '无法获取数据库信息')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 备份操作 */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Archive className='h-5 w-5' />
                {t('settings.backup.title', '数据备份')}
              </CardTitle>
              <CardDescription>
                {t(
                  'settings.backup.description',
                  '系统每日自动备份一次，保留最近 7 份。您也可以手动创建备份。'
                )}
              </CardDescription>
            </div>
            <div className='flex gap-2'>
              <Button variant='outline' size='sm' onClick={() => void handleExport('json')}>
                <Download className='h-3.5 w-3.5 mr-1.5' />
                {t('settings.backup.exportJson', '导出 JSON')}
              </Button>
              <Button variant='outline' size='sm' onClick={() => void handleExport('sql')}>
                <Download className='h-3.5 w-3.5 mr-1.5' />
                {t('settings.backup.exportSql', '导出 SQL')}
              </Button>
              <Button size='sm' onClick={() => void handleBackupNow()} disabled={backing}>
                {backing ? (
                  <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />
                ) : (
                  <Upload className='h-3.5 w-3.5 mr-1.5' />
                )}
                {t('settings.backup.backupNow', '立即备份')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && backups.length === 0 ? (
            <div className='flex items-center justify-center py-8 text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin mr-2' />
              {t('common.loading', '加载中...')}
            </div>
          ) : backups.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-10 text-muted-foreground'>
              <Archive className='h-12 w-12 mb-3 opacity-30' />
              <p className='text-sm'>{t('settings.backup.noBackups', '暂无备份记录')}</p>
              <p className='text-xs mt-1'>
                {t('settings.backup.noBackupsHint', '点击「立即备份」创建第一份备份')}
              </p>
            </div>
          ) : (
            <div className='rounded-lg border divide-y'>
              {backups.map(item => (
                <div key={item.name} className='flex items-center justify-between px-4 py-3'>
                  <div className='flex items-center gap-3'>
                    <CheckCircle2 className='h-4 w-4 text-green-500 shrink-0' />
                    <div>
                      <div className='text-sm font-medium'>{item.name}</div>
                      <div className='text-xs text-muted-foreground flex items-center gap-2 mt-0.5'>
                        <Calendar className='h-3 w-3' />
                        {item.date || t('settings.backup.unknownDate', '未知日期')}
                        <span>·</span>
                        {formatSize(item.size)}
                      </div>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant='outline' size='sm' disabled={restoring === item.name}>
                        {restoring === item.name ? (
                          <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />
                        ) : (
                          <RotateCcw className='h-3.5 w-3.5 mr-1.5' />
                        )}
                        {t('settings.backup.restore', '恢复')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t('settings.backup.confirmRestoreTitle', '确认恢复数据？')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('settings.backup.confirmRestoreDesc', {
                            name: item.name,
                            defaultValue:
                              '将从备份 {{name}} 恢复数据。当前数据库将被覆盖，此操作不可撤销。建议先创建一份新备份。',
                          })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel', '取消')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => void handleRestore(item)}
                          className='bg-orange-500 hover:bg-orange-600'
                        >
                          {t('settings.backup.confirmRestore', '确认恢复')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* ─── 云端同步面板 v2（桌面端使用 SyncEngine IPC） ─── */

type SyncConfigState = {
  serverUrl: string;
  intervalMs: number;
  enabled: boolean;
  deviceId: string;
};

type SyncStatusState = {
  status: string;
  lastSyncAt?: string;
  pendingChanges?: number;
  pendingConflicts?: number;
};

type ConflictItem = {
  id: string;
  table_name: string;
  record_sync_id: string;
  local_version: number;
  remote_version: number;
  local_data: string;
  remote_data: string;
  created_at: string;
};

// INTERVAL_OPTIONS 已移至后台自动配置，不再面向用户展示

const CloudSyncPanel = () => {
  const { t } = useTranslation();
  const api = window.electronAPI;
  const hasSyncApi = Boolean(api?.sync);

  const [config, setConfig] = useState<SyncConfigState | null>(null);
  const [status, setStatus] = useState<SyncStatusState>({ status: 'idle' });
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [lastResult, setLastResult] = useState<{
    pulled?: number;
    pushed?: number;
    conflicts?: number;
    error?: string;
  } | null>(null);
  // serverUrlInput 已移除（同步设置不面向用户展示）
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);

  const refresh = async () => {
    if (!api?.sync) return;
    setLoading(true);
    try {
      // 独立调用，每个带默认值防护，避免一个失败导致全部失败
      const cfg = await api.sync.getConfig().catch(() => ({
        serverUrl: '',
        intervalMs: 30000,
        enabled: false,
        deviceId: '',
      }));
      const sts = await api.sync.getStatus().catch(() => ({
        status: 'idle' as const,
        lastSyncAt: undefined as string | undefined,
        pendingChanges: 0,
        pendingConflicts: 0,
      }));
      const cfls = await api.sync.getConflicts().catch(() => []);
      const syncLogs = await api.sync.getLogs(15).catch(() => []);

      // 如果 SyncEngine 没有 serverUrl，从已登录的 cloudApiUrl 自动补全
      let effectiveCfg = cfg;
      if (!cfg.serverUrl) {
        const cloudUrl =
          localStorage.getItem('cloudApiUrl') ||
          import.meta.env.VITE_API_URL ||
          'https://api.xiangweb.space/api';
        if (cloudUrl) {
          await api.sync.setConfig({ serverUrl: cloudUrl }).catch(err => {
            console.error('Failed to set sync config:', err);
          });
          effectiveCfg = { ...cfg, serverUrl: cloudUrl };
        }
      }

      setConfig(effectiveCfg);
      setStatus(sts);
      setConflicts(cfls as ConflictItem[]);
      setLogs(syncLogs);
    } catch {
      toast.error(t('settings.sync.fetchFailed', '获取同步状态失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasSyncApi) {
      setLoading(false);
      return;
    }
    void refresh();

    const cleanup = api?.sync?.onStatusChange(() => {
      void refresh();
    });
    return () => cleanup?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSyncApi]);

  const handleTriggerSync = async () => {
    if (!api?.sync) return;
    setSyncing(true);
    setLastResult(null);
    try {
      const result = await api.sync.triggerSync();
      setLastResult(result);
      await refresh();
      if (result.success) {
        toast.success(
          t('settings.sync.syncComplete', {
            pushed: result.pushed || 0,
            pulled: result.pulled || 0,
            conflicts: result.conflicts || 0,
            defaultValue: '同步完成：↑{{pushed}} 推送，↓{{pulled}} 拉取',
          })
        );
      } else {
        toast.error(
          t('settings.sync.syncFailedDetail', {
            detail: result.error || t('common.unknownError', '未知错误'),
            defaultValue: '同步失败: {{detail}}',
          })
        );
      }
    } catch (err) {
      toast.error(
        t('settings.sync.syncFailedDetail', {
          detail: err instanceof Error ? err.message : String(err),
          defaultValue: '同步失败: {{detail}}',
        })
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    if (!api?.sync) return;
    try {
      await api.sync.setConfig({ enabled });
      await refresh();
      toast.success(
        enabled
          ? t('settings.sync.autoSyncEnabled', '自动同步已开启')
          : t('settings.sync.autoSyncDisabled', '自动同步已关闭')
      );
    } catch {
      toast.error(t('settings.sync.settingFailed', '设置失败'));
    }
  };

  // handleSaveServer / handleIntervalChange 已移至后台自动配置

  const handleResolveConflict = async (conflictId: string, resolution: 'local' | 'remote') => {
    if (!api?.sync) return;
    setResolvingId(conflictId);
    try {
      const result = await api.sync.resolveConflict(conflictId, resolution);
      if (result.success) {
        toast.success(
          t('settings.sync.conflictResolved', {
            version:
              resolution === 'local'
                ? t('settings.sync.local', '本地')
                : t('settings.sync.remote', '远端'),
            defaultValue: '冲突已解决（采用{{version}}版本）',
          })
        );
        await refresh();
      } else {
        toast.error(t('settings.sync.resolveConflictFailed', '解决冲突失败'));
      }
    } catch {
      toast.error(t('settings.sync.resolveConflictFailed', '解决冲突失败'));
    } finally {
      setResolvingId(null);
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'syncing':
        return t('settings.sync.statusSyncing', '同步中...');
      case 'synced':
        return t('settings.sync.statusSynced', '已同步');
      case 'conflict':
        return t('settings.sync.statusConflict', '存在冲突');
      case 'error':
        return t('settings.sync.statusError', '同步失败');
      case 'offline':
        return t('settings.sync.statusOffline', '离线');
      default:
        return t('settings.sync.statusIdle', '未同步');
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'synced':
        return 'text-green-600';
      case 'syncing':
        return 'text-blue-500';
      case 'conflict':
        return 'text-orange-500';
      case 'error':
        return 'text-destructive';
      case 'offline':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  if (!hasSyncApi) {
    return (
      <div className='space-y-4'>
        <Card>
          <CardContent className='py-10'>
            <div className='flex flex-col items-center justify-center text-muted-foreground'>
              <CloudOff className='h-12 w-12 mb-3 opacity-30' />
              <p className='text-sm'>{t('settings.sync.desktopOnly', '同步功能仅在桌面端可用')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* 同步状态 & 操作 */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Cloud className='h-5 w-5' />
                {t('settings.sync.title', '云端同步')}
              </CardTitle>
              <CardDescription>
                {t(
                  'settings.sync.description',
                  '基于版本号的双向增量同步，支持多设备协作与冲突检测'
                )}
              </CardDescription>
            </div>
            <div className='flex items-center gap-2'>
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-medium ${statusColor(status.status)}`}
              >
                {status.status === 'syncing' ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : status.status === 'synced' ? (
                  <CheckCircle2 className='h-4 w-4' />
                ) : status.status === 'conflict' ? (
                  <AlertTriangle className='h-4 w-4' />
                ) : status.status === 'offline' ? (
                  <WifiOff className='h-4 w-4' />
                ) : (
                  <Cloud className='h-4 w-4' />
                )}
                {statusLabel(status.status)}
              </span>
              <Button variant='outline' size='sm' onClick={() => void refresh()} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                {t('common.refresh', '刷新')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* 操作按钮 */}
          <div className='flex items-center gap-3'>
            <Button
              onClick={() => void handleTriggerSync()}
              disabled={syncing || !config?.serverUrl}
            >
              {syncing ? (
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
              ) : (
                <CloudUpload className='h-4 w-4 mr-2' />
              )}
              {t('settings.sync.syncNow', '立即同步')}
            </Button>
            <div className='ml-auto flex items-center gap-2'>
              <Switch
                checked={config?.enabled ?? false}
                onCheckedChange={handleToggleEnabled}
                disabled={!config?.serverUrl}
              />
              <span className='text-sm text-muted-foreground'>
                {t('settings.sync.autoSync', '自动同步')}
              </span>
            </div>
          </div>

          {/* 上次同步时间 & 待处理 */}
          <div className='flex items-center gap-4 text-xs text-muted-foreground'>
            {status.lastSyncAt && (
              <span className='flex items-center gap-1.5'>
                <Calendar className='h-3 w-3' />
                {t('settings.sync.lastSync', '上次同步')}：
                {new Date(status.lastSyncAt).toLocaleString()}
              </span>
            )}
            {(status.pendingChanges || 0) > 0 && (
              <span className='flex items-center gap-1.5 text-orange-500'>
                <Upload className='h-3 w-3' />
                {t('settings.sync.pendingPush', {
                  count: status.pendingChanges,
                  defaultValue: '{{count}} 条待推送',
                })}
              </span>
            )}
            {(status.pendingConflicts || 0) > 0 && (
              <span className='flex items-center gap-1.5 text-destructive'>
                <AlertTriangle className='h-3 w-3' />
                {t('settings.sync.pendingConflicts', {
                  count: status.pendingConflicts,
                  defaultValue: '{{count}} 个冲突',
                })}
              </span>
            )}
          </div>

          {/* 最近同步结果 */}
          {lastResult && (
            <div
              className={`rounded-lg border p-3 text-sm ${lastResult.error ? 'border-destructive/30 bg-destructive/5' : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'}`}
            >
              {lastResult.error ? (
                <span className='text-destructive'>{lastResult.error}</span>
              ) : (
                <span className='text-green-700 dark:text-green-300'>
                  ↑ {lastResult.pushed || 0} {t('settings.sync.pushed', '推送')} · ↓{' '}
                  {lastResult.pulled || 0} {t('settings.sync.pulled', '拉取')}
                  {(lastResult.conflicts || 0) > 0 &&
                    ` · ${lastResult.conflicts} ${t('settings.sync.conflictsCount', '个冲突')}`}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 同步设置 — 技术细节对普通用户隐藏，配置在登录后自动完成 */}

      {/* 冲突解决 */}
      {/* 同步历史日志 */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              <Activity className='h-4 w-4' />
              {t('settings.sync.syncHistory', '同步历史')}
            </CardTitle>
            <CardDescription>{t('settings.sync.recentRecords', '最近的同步记录')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='rounded-lg border divide-y max-h-[280px] overflow-y-auto'>
              {logs.map((log, i) => {
                const isError = log.status === 'error';
                return (
                  <div
                    key={String(log.id || i)}
                    className='flex items-center justify-between px-4 py-2'
                  >
                    <div className='flex items-center gap-2'>
                      {isError ? (
                        <div className='h-2 w-2 rounded-full bg-destructive shrink-0' />
                      ) : (
                        <div className='h-2 w-2 rounded-full bg-green-500 shrink-0' />
                      )}
                      <span className='text-xs text-muted-foreground'>
                        {log.created_at
                          ? new Date(String(log.created_at) + 'Z').toLocaleString()
                          : ''}
                      </span>
                    </div>
                    <div className='flex items-center gap-3 text-xs'>
                      {isError ? (
                        <span
                          className='text-destructive truncate max-w-[200px]'
                          title={String(log.error || '')}
                        >
                          {String(log.error || t('common.unknownError', '未知错误')).slice(0, 40)}
                        </span>
                      ) : (
                        <>
                          <span className='text-green-600'>↑{String(log.pushed || 0)}</span>
                          <span className='text-blue-600'>↓{String(log.pulled || 0)}</span>
                          {Number(log.conflicts) > 0 && (
                            <span className='text-orange-500'>
                              {String(log.conflicts)} {t('settings.sync.conflictsCount', '冲突')}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {conflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              <AlertTriangle className='h-4 w-4 text-orange-500' />
              {t('settings.sync.conflictsTitle', '同步冲突')}（{conflicts.length}）
            </CardTitle>
            <CardDescription>
              {t(
                'settings.sync.conflictsDesc',
                '当本地和云端同时修改了同一条记录时会产生冲突，请选择保留哪个版本'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='rounded-lg border divide-y'>
              {conflicts.map(c => {
                const isResolving = resolvingId === c.id;
                return (
                  <div key={c.id} className='px-4 py-3'>
                    <div className='flex items-start justify-between gap-4'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2'>
                          <span className='text-sm font-medium'>{c.table_name}</span>
                          <span className='text-xs text-muted-foreground font-mono truncate max-w-[200px]'>
                            {c.record_sync_id}
                          </span>
                        </div>
                        <div className='mt-1 flex items-center gap-3 text-xs text-muted-foreground'>
                          <span>
                            {t('settings.sync.local', '本地')} v{c.local_version}
                          </span>
                          <span>→</span>
                          <span>
                            {t('settings.sync.remote', '远端')} v{c.remote_version}
                          </span>
                          <span>·</span>
                          <span>{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className='flex items-center gap-2 shrink-0'>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={isResolving}
                          onClick={() => void handleResolveConflict(c.id, 'local')}
                        >
                          {isResolving ? <Loader2 className='h-3 w-3 animate-spin mr-1' /> : null}
                          {t('settings.sync.keepLocal', '保留本地')}
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={isResolving}
                          onClick={() => void handleResolveConflict(c.id, 'remote')}
                        >
                          {isResolving ? <Loader2 className='h-3 w-3 animate-spin mr-1' /> : null}
                          {t('settings.sync.useRemote', '采用远端')}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ─── 版本检查面板（桌面端专用） ───

type UpdateInfo = {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseDate?: string;
  releaseNotes?: string;
  downloadUrl?: string;
  error?: string;
};

const UpdateCheckPanel = () => {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(false);
  const [info, setInfo] = useState<UpdateInfo | null>(null);

  const checkUpdate = async () => {
    setChecking(true);
    try {
      const result = (await window.electronAPI?.updater?.checkForUpdates()) as
        | UpdateInfo
        | undefined;
      if (result) {
        setInfo(result);
        if (result.updateAvailable) {
          toast.success(
            t('settings.update.newVersionFound', {
              version: result.latestVersion,
              defaultValue: '发现新版本 {{version}}',
            })
          );
        } else if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(t('settings.update.upToDate', '当前已是最新版本'));
        }
      }
    } catch {
      toast.error(t('settings.update.checkFailed', '检查更新失败'));
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void checkUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Download className='h-4 w-4' />
                {t('settings.update.title', '版本与更新')}
              </CardTitle>
              <CardDescription>
                {t('settings.update.description', '检查应用更新，保持最新版本')}
              </CardDescription>
            </div>
            <Button variant='outline' size='sm' onClick={checkUpdate} disabled={checking}>
              {checking ? (
                <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />
              ) : (
                <RefreshCw className='h-3.5 w-3.5 mr-1.5' />
              )}
              {t('settings.update.checkUpdate', '检查更新')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='rounded-lg border p-4'>
              <div className='text-xs text-muted-foreground mb-1'>
                {t('settings.update.currentVersion', '当前版本')}
              </div>
              <div className='text-lg font-bold'>{info?.currentVersion || '...'}</div>
            </div>
            <div className='rounded-lg border p-4'>
              <div className='text-xs text-muted-foreground mb-1'>
                {t('settings.update.latestVersion', '最新版本')}
              </div>
              <div className='text-lg font-bold'>
                {info?.latestVersion || '...'}
                {info?.updateAvailable && (
                  <span className='ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full'>
                    {t('settings.update.hasUpdate', '有更新')}
                  </span>
                )}
                {info && !info.updateAvailable && !info.error && (
                  <span className='ml-2 text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full'>
                    {t('settings.update.latest', '已是最新')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {info?.updateAvailable && (
            <div className='rounded-lg border border-primary/20 bg-primary/5 p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <div className='font-medium'>
                    {t('settings.update.newVersionAvailable', {
                      version: info.latestVersion,
                      defaultValue: '新版本可用：{{version}}',
                    })}
                  </div>
                  {info.releaseDate && (
                    <div className='text-xs text-muted-foreground mt-0.5'>
                      {t('settings.update.releaseDate', '发布日期')}：{info.releaseDate}
                    </div>
                  )}
                  {info.releaseNotes && (
                    <div className='text-sm text-muted-foreground mt-2'>{info.releaseNotes}</div>
                  )}
                </div>
                <Button
                  size='sm'
                  onClick={() => {
                    if (info.downloadUrl) {
                      window.open(info.downloadUrl, '_blank');
                    } else {
                      void window.electronAPI?.updater?.downloadUpdate();
                    }
                  }}
                >
                  <Download className='h-3.5 w-3.5 mr-1.5' />
                  {t('settings.update.downloadUpdate', '下载更新')}
                </Button>
              </div>
            </div>
          )}

          {info?.error && (
            <div className='rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive'>
              {info.error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── 统一设置 Wrapper：Tabs 整合个人/偏好/系统 ───

const ProfilePageLazy = lazy(() => import('./ProfilePage'));
const PreferencesPageLazy = lazy(() => import('./PreferencesPage'));
const CiCdPanelLazy = lazy(() => import('../components/settings/CiCdPanel'));
const CloudAccountPanelLazy = lazy(() => import('../components/settings/CloudAccountPanel'));

type SettingsNavItem = {
  key: string;
  labelKey: string;
  fallback: string;
  icon: React.ComponentType<{ className?: string }>;
  desktopOnly?: boolean;
};

const SETTINGS_NAV: SettingsNavItem[] = [
  { key: 'profile', labelKey: 'settings.tabProfile', fallback: '个人资料', icon: User },
  { key: 'preferences', labelKey: 'settings.tabPreferences', fallback: '偏好设置', icon: Activity },
  {
    key: 'account',
    labelKey: 'settings.tabAccount',
    fallback: '账户',
    icon: User,
    desktopOnly: true,
  },
  {
    key: 'backup',
    labelKey: 'settings.tabBackup',
    fallback: '数据备份',
    icon: Database,
    desktopOnly: true,
  },
  {
    key: 'cloudsync',
    labelKey: 'settings.tabCloudSync',
    fallback: '云端同步',
    icon: Cloud,
    desktopOnly: true,
  },
  { key: 'cicd', labelKey: 'settings.tabCiCd', fallback: 'CI/CD', icon: Activity },
  {
    key: 'update',
    labelKey: 'settings.tabUpdate',
    fallback: '版本更新',
    icon: Download,
    desktopOnly: true,
  },
];

const SettingsTabLoading = () => (
  <div className='flex items-center justify-center h-32 text-muted-foreground text-sm'>
    <Loader2 className='h-5 w-5 animate-spin' />
  </div>
);

const SettingsPage = () => {
  const { t } = useTranslation();
  const desktop = isDesktop();
  const [activeTab, setActiveTab] = useState('profile');

  const visibleNav = SETTINGS_NAV.filter(n => !n.desktopOnly || desktop);

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <Suspense fallback={<SettingsTabLoading />}>
            <ProfilePageLazy />
          </Suspense>
        );
      case 'preferences':
        return (
          <Suspense fallback={<SettingsTabLoading />}>
            <PreferencesPageLazy />
          </Suspense>
        );
      case 'account':
        return desktop ? (
          <Suspense fallback={<SettingsTabLoading />}>
            <CloudAccountPanelLazy />
          </Suspense>
        ) : null;
      case 'backup':
        return desktop ? <BackupManagementPanel /> : null;
      case 'cloudsync':
        return desktop ? <CloudSyncPanel /> : null;
      case 'cicd':
        return (
          <Suspense fallback={<SettingsTabLoading />}>
            <CiCdPanelLazy />
          </Suspense>
        );
      case 'update':
        return desktop ? <UpdateCheckPanel /> : null;
      default:
        return null;
    }
  };

  return (
    <div className='container py-6 space-y-4'>
      <h2 className='text-2xl font-bold tracking-tight'>{t('settings.title', '设置')}</h2>
      <div className='flex gap-6'>
        {/* 左侧垂直导航 */}
        <nav className='w-48 flex-shrink-0 space-y-0.5'>
          {visibleNav.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type='button'
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Icon className='h-4 w-4 flex-shrink-0' />
                <span className='truncate'>{t(item.labelKey, item.fallback)}</span>
              </button>
            );
          })}
        </nav>
        {/* 右侧内容区 */}
        <div className='flex-1 min-w-0'>{renderContent()}</div>
      </div>
    </div>
  );
};

export default SettingsPage;
