import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import EmptyState from '../components/EmptyState';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import AddSiteDialog from '../components/monitoring/AddSiteDialog';
import SiteDetailDialog from '../components/monitoring/SiteDetailDialog';
import { useTestConfig } from '../context/TestContext';
import { alertApi, type AlertRule, type CreateRulePayload } from '../services/alertApi';
import {
  monitoringApi,
  type AddSitePayload,
  type MonitoringAlert,
  type MonitoringSite,
  type MonitoringSummary,
} from '../services/monitoringApi';
import { isDesktop as isDesktopEnv } from '../utils/environment';

// ─── 状态颜色 & 标签 ───

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
    labelKey: 'monitoring.statusActive',
    fallback: '运行中',
    icon: CheckCircle2,
  },
  up: {
    color: 'bg-green-500',
    labelKey: 'monitoring.statusUp',
    fallback: '正常',
    icon: CheckCircle2,
  },
  online: {
    color: 'bg-green-500',
    labelKey: 'monitoring.statusOnline',
    fallback: '在线',
    icon: CheckCircle2,
  },
  paused: {
    color: 'bg-yellow-500',
    labelKey: 'monitoring.statusPaused',
    fallback: '已暂停',
    icon: Pause,
  },
  inactive: {
    color: 'bg-gray-400',
    labelKey: 'monitoring.statusInactive',
    fallback: '未激活',
    icon: Clock,
  },
  down: { color: 'bg-red-500', labelKey: 'monitoring.statusDown', fallback: '宕机', icon: XCircle },
  error: {
    color: 'bg-red-500',
    labelKey: 'monitoring.statusError',
    fallback: '异常',
    icon: AlertTriangle,
  },
  timeout: {
    color: 'bg-orange-500',
    labelKey: 'monitoring.statusTimeout',
    fallback: '超时',
    icon: Clock,
  },
};

const getStatusInfo = (status: string) =>
  statusConfig[status?.toLowerCase()] || statusConfig.inactive;

const typeLabels: Record<string, { key: string; fallback: string }> = {
  uptime: { key: 'monitoring.typeUptime', fallback: '可用性' },
  performance: { key: 'monitoring.typePerformance', fallback: '性能' },
  security: { key: 'monitoring.typeSecurity', fallback: '安全' },
  seo: { key: 'monitoring.typeSeo', fallback: 'SEO' },
};

// ─── 主页面 ───

const MonitoringContent = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { updateUrl, selectTestType } = useTestConfig();
  const [sites, setSites] = useState<MonitoringSite[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // 告警规则
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    severity: 'high' as 'low' | 'medium' | 'high' | 'critical',
    conditionType: 'response_time',
    threshold: 5000,
    enabled: true,
    notifyEmail: true,
    notifyWebhook: false,
  });
  const [ruleSubmitting, setRuleSubmitting] = useState(false);

  // 对话框状态
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editSite, setEditSite] = useState<MonitoringSite | null>(null);
  const [detailSite, setDetailSite] = useState<MonitoringSite | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // P1-4: 从 URL 参数自动预填添加站点（来自 HistoryDetail 联动）
  useEffect(() => {
    const action = searchParams.get('action');
    const prefillUrl = searchParams.get('url');
    if (action === 'add' && prefillUrl) {
      const prefillType = searchParams.get('type') || 'uptime';
      setEditSite({
        id: '',
        name: '',
        url: prefillUrl,
        monitoring_type: prefillType,
        status: 'inactive',
      } as MonitoringSite);
      setAddDialogOpen(true);
      // 清除 URL 参数，避免刷新重复触发
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sitesResp, alertsResp, summaryResp] = await Promise.allSettled([
        monitoringApi.getSites(),
        monitoringApi.getAlerts({ limit: 10 }),
        monitoringApi.getSummary(),
      ]);

      if (sitesResp.status === 'fulfilled') {
        const data = sitesResp.value;
        setSites(data?.sites ?? (Array.isArray(data) ? data : []));
        if (data?.summary) setSummary(data.summary as MonitoringSummary);
      }
      if (alertsResp.status === 'fulfilled') {
        const data = alertsResp.value;
        setAlerts(data?.alerts ?? (Array.isArray(data) ? data : []));
      }
      if (summaryResp.status === 'fulfilled') {
        setSummary(summaryResp.value as MonitoringSummary);
      }
    } catch {
      toast.error(t('monitoring.loadFailed', '加载监控数据失败'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      await loadData();
      if (ignore) return;
    };
    void run();
    const interval = setInterval(() => {
      if (!ignore) void loadData();
    }, 60000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [loadData]);

  // 过滤站点
  const filteredSites = useMemo(() => {
    return sites.filter(site => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!site.name?.toLowerCase().includes(q) && !site.url?.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (statusFilter !== 'all' && site.status !== statusFilter) return false;
      if (typeFilter !== 'all' && site.monitoring_type !== typeFilter) return false;
      return true;
    });
  }, [sites, searchQuery, statusFilter, typeFilter]);

  // 操作
  const handleAddSite = async (payload: AddSitePayload) => {
    await monitoringApi.addSite(payload);
    toast.success(t('monitoring.siteAdded', '站点添加成功'));
    void loadData();
  };

  const handleUpdateSite = async (payload: AddSitePayload) => {
    if (!editSite) return;
    await monitoringApi.updateSite(editSite.id, payload);
    toast.success(t('monitoring.siteUpdated', '站点更新成功'));
    setEditSite(null);
    void loadData();
  };

  const handleDeleteSite = async (id: string) => {
    try {
      await monitoringApi.deleteSite(id);
      toast.success(t('monitoring.siteDeleted', '站点已删除'));
      setDeleteConfirmId(null);
      void loadData();
    } catch {
      toast.error(t('monitoring.deleteFailed', '删除失败'));
    }
  };

  const handleCheckSite = async (id: string) => {
    try {
      toast.info(t('monitoring.checking', '正在检查...'));
      await monitoringApi.checkSite(id);
      toast.success(t('monitoring.checkDone', '检查完成'));
      void loadData();
    } catch {
      toast.error(t('monitoring.checkFailed', '检查失败'));
    }
  };

  const handleRunTest = (site: MonitoringSite) => {
    const testType =
      site.monitoring_type === 'performance'
        ? 'performance'
        : site.monitoring_type === 'security'
          ? 'security'
          : site.monitoring_type === 'seo'
            ? 'seo'
            : 'website';
    selectTestType(testType as Parameters<typeof selectTestType>[0]);
    updateUrl(site.url);
    toast.info(
      t('monitoring.runTestRedirect', {
        name: site.name,
        type: testType,
        defaultValue: '已预填 {{name}} 的{{type}}测试配置，跳转控制台...',
      })
    );
    navigate('/dashboard');
  };

  const handleTogglePause = async (site: MonitoringSite) => {
    try {
      if (site.status === 'paused') {
        await monitoringApi.resumeSite(site.id);
        toast.success(
          t('monitoring.resumed', { name: site.name, defaultValue: '已恢复监控: {{name}}' })
        );
      } else {
        await monitoringApi.pauseSite(site.id);
        toast.success(
          t('monitoring.paused', { name: site.name, defaultValue: '已暂停监控: {{name}}' })
        );
      }
      void loadData();
    } catch {
      toast.error(t('monitoring.operationFailed', '操作失败'));
    }
  };

  // 告警操作
  const handleAcknowledgeAlert = async (id: string) => {
    try {
      await alertApi.acknowledgeAlert(id);
      toast.success(t('monitoring.alertAcknowledged', '告警已确认'));
      void loadData();
    } catch {
      toast.error(t('monitoring.operationFailed', '操作失败'));
    }
  };

  const handleResolveAlert = async (id: string) => {
    try {
      await alertApi.resolveAlert(id);
      toast.success(t('monitoring.alertResolved', '告警已解决'));
      void loadData();
    } catch {
      toast.error(t('monitoring.operationFailed', '操作失败'));
    }
  };

  const loadAlertRules = async () => {
    try {
      const data = await alertApi.getRules();
      setAlertRules(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    }
  };

  const handleCreateRule = async (payload: CreateRulePayload) => {
    await alertApi.createRule(payload);
    toast.success(t('monitoring.ruleCreated', '告警规则已创建'));
    void loadAlertRules();
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await alertApi.deleteRule(id);
      toast.success(t('monitoring.ruleDeleted', '规则已删除'));
      void loadAlertRules();
    } catch {
      toast.error(t('monitoring.deleteFailed', '删除失败'));
    }
  };

  return (
    <div className='space-y-6 p-6 max-w-7xl mx-auto'>
      {/* 页面标题 */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>{t('monitoring.title', '网站监控')}</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            {t('monitoring.description', '7×24 持续监控你的网站可用性、性能和安全状态')}
          </p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => void loadData()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', '刷新')}
          </Button>
          <Button size='sm' onClick={() => setAddDialogOpen(true)}>
            <Plus className='h-4 w-4 mr-1' />
            {t('monitoring.addSite', '添加站点')}
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      {summary && (
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <Card>
            <CardContent className='pt-4 pb-3'>
              <Statistic
                title={t('monitoring.statTotal', '总站点')}
                value={summary.total}
                prefix={<Globe className='h-4 w-4 text-blue-500' />}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='pt-4 pb-3'>
              <Statistic
                title={t('monitoring.statActive', '运行中')}
                value={summary.active}
                prefix={<Activity className='h-4 w-4 text-green-500' />}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='pt-4 pb-3'>
              <Statistic
                title={t('monitoring.statPaused', '已暂停')}
                value={summary.paused}
                prefix={<Pause className='h-4 w-4 text-yellow-500' />}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='pt-4 pb-3'>
              <Statistic
                title={t('monitoring.statAlerts', '告警')}
                value={alerts.length}
                prefix={<AlertTriangle className='h-4 w-4 text-red-500' />}
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
            placeholder={t('monitoring.searchPlaceholder', '搜索站点名称或 URL...')}
            className='pl-9'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className='w-[130px]'>
            <SelectValue placeholder={t('monitoring.statusFilter', '状态')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{t('monitoring.filterAll', '全部状态')}</SelectItem>
            <SelectItem value='active'>{t('monitoring.statusActive', '运行中')}</SelectItem>
            <SelectItem value='paused'>{t('monitoring.statusPaused', '已暂停')}</SelectItem>
            <SelectItem value='inactive'>{t('monitoring.statusInactive', '未激活')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className='w-[130px]'>
            <SelectValue placeholder={t('monitoring.typeFilter', '类型')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{t('monitoring.filterAllTypes', '全部类型')}</SelectItem>
            <SelectItem value='uptime'>{t('monitoring.typeUptime', '可用性')}</SelectItem>
            <SelectItem value='performance'>{t('monitoring.typePerformance', '性能')}</SelectItem>
            <SelectItem value='security'>{t('monitoring.typeSecurity', '安全')}</SelectItem>
            <SelectItem value='seo'>{t('monitoring.typeSeo', 'SEO')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 站点列表 */}
      <Card>
        <CardHeader className='py-3 px-4 border-b'>
          <CardTitle className='text-sm font-medium'>
            {t('monitoring.siteListTitle', '监控站点')} ({filteredSites.length})
          </CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          {loading && sites.length === 0 ? (
            <div className='flex items-center justify-center h-32 text-muted-foreground text-sm'>
              {t('common.loading')}
            </div>
          ) : filteredSites.length === 0 ? (
            <EmptyState
              icon={Globe}
              title={
                sites.length === 0
                  ? t('monitoring.empty', '暂无监控站点，点击上方"添加站点"开始')
                  : t('monitoring.noMatch', '没有匹配的站点')
              }
              compact
            />
          ) : (
            <div className='divide-y'>
              {filteredSites.map(site => {
                const info = getStatusInfo(site.last_status || site.status);
                const StatusIcon = info.icon;
                return (
                  <div
                    key={site.id}
                    role='button'
                    tabIndex={0}
                    className='flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer'
                    onClick={() => {
                      setDetailSite(site);
                      setDetailOpen(true);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setDetailSite(site);
                        setDetailOpen(true);
                      }
                    }}
                  >
                    {/* 状态指示器 */}
                    <div className='flex-shrink-0'>
                      <span className={`block w-3 h-3 rounded-full ${info.color}`} />
                    </div>

                    {/* 站点信息 */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-sm truncate'>{site.name}</span>
                        <Badge variant='outline' className='text-[10px] shrink-0'>
                          {typeLabels[site.monitoring_type]
                            ? t(
                                typeLabels[site.monitoring_type].key,
                                typeLabels[site.monitoring_type].fallback
                              )
                            : site.monitoring_type}
                        </Badge>
                      </div>
                      <div className='text-xs text-muted-foreground truncate mt-0.5'>
                        {site.url}
                      </div>
                    </div>

                    {/* 状态 */}
                    <div className='flex items-center gap-1.5 text-xs shrink-0'>
                      <StatusIcon className='h-3.5 w-3.5' />
                      <span>{t(info.labelKey, info.fallback)}</span>
                    </div>

                    {/* 响应时间 */}
                    <div className='text-xs text-muted-foreground w-16 text-right shrink-0'>
                      {site.last_response_time != null ? `${site.last_response_time}ms` : '-'}
                    </div>

                    {/* 上次检查 */}
                    <div className='text-xs text-muted-foreground w-32 text-right shrink-0 hidden md:block'>
                      {site.last_check
                        ? new Date(site.last_check).toLocaleString()
                        : t('monitoring.never', '从未')}
                    </div>

                    {/* 操作菜单 */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant='ghost' size='icon' className='h-8 w-8 shrink-0'>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation();
                            void handleCheckSite(site.id);
                          }}
                        >
                          <RefreshCw className='h-4 w-4 mr-2' />
                          {t('monitoring.checkNow', '立即检查')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation();
                            handleRunTest(site);
                          }}
                        >
                          <Zap className='h-4 w-4 mr-2' />
                          {t('monitoring.runTest', '运行测试')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/history?q=${encodeURIComponent(site.url)}`);
                          }}
                        >
                          <Clock className='h-4 w-4 mr-2' />
                          {t('monitoring.viewHistory', '查看测试历史')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation();
                            void handleTogglePause(site);
                          }}
                        >
                          {site.status === 'paused' ? (
                            <>
                              <Play className='h-4 w-4 mr-2' />
                              {t('monitoring.resume', '恢复监控')}
                            </>
                          ) : (
                            <>
                              <Pause className='h-4 w-4 mr-2' />
                              {t('monitoring.pauseMonitor', '暂停监控')}
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation();
                            setEditSite(site);
                            setAddDialogOpen(true);
                          }}
                        >
                          <Activity className='h-4 w-4 mr-2' />
                          {t('common.edit', '编辑')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className='text-red-600'
                          onClick={e => {
                            e.stopPropagation();
                            setDeleteConfirmId(site.id);
                          }}
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

      {/* 最近告警 */}
      <Card>
        <CardHeader className='py-3 px-4 border-b flex flex-row items-center justify-between'>
          <CardTitle className='text-sm font-medium flex items-center gap-2'>
            <AlertTriangle className='h-4 w-4 text-orange-500' />
            {t('monitoring.recentAlerts', '最近告警')} ({alerts.length})
          </CardTitle>
          <Button
            variant='outline'
            size='sm'
            className='h-7 text-xs'
            onClick={() => {
              setRulesDialogOpen(true);
              void loadAlertRules();
            }}
          >
            <Shield className='h-3 w-3 mr-1' />
            {t('monitoring.alertRules', '告警规则')}
          </Button>
        </CardHeader>
        <CardContent className='p-0'>
          {alerts.length === 0 ? (
            <EmptyState icon={Bell} title={t('monitoring.noAlerts', '暂无告警')} compact />
          ) : (
            <div className='divide-y'>
              {alerts.map(alert => (
                <div key={alert.id} className='flex items-center gap-3 px-4 py-2.5'>
                  <Badge
                    variant='outline'
                    className={
                      alert.severity === 'critical'
                        ? 'border-red-500 text-red-600'
                        : alert.severity === 'warning'
                          ? 'border-orange-500 text-orange-600'
                          : 'border-blue-500 text-blue-600'
                    }
                  >
                    {alert.severity === 'critical'
                      ? t('monitoring.severityCritical', '严重')
                      : alert.severity === 'warning'
                        ? t('monitoring.severityWarning', '警告')
                        : t('monitoring.severityInfo', '信息')}
                  </Badge>
                  <span className='text-sm flex-1 truncate'>
                    {alert.site_name && (
                      <span className='font-medium mr-1'>[{alert.site_name}]</span>
                    )}
                    {alert.message || alert.alert_type}
                  </span>
                  <span className='text-xs text-muted-foreground shrink-0'>
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                  <div className='flex gap-1 shrink-0'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6'
                      title={t('monitoring.acknowledgeAlert', '确认告警')}
                      onClick={() => void handleAcknowledgeAlert(alert.id)}
                    >
                      <CheckCircle2 className='h-3 w-3 text-blue-500' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6'
                      title={t('monitoring.resolveAlert', '解决告警')}
                      onClick={() => void handleResolveAlert(alert.id)}
                    >
                      <XCircle className='h-3 w-3 text-green-500' />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添加/编辑对话框 */}
      <AddSiteDialog
        open={addDialogOpen}
        onOpenChange={v => {
          setAddDialogOpen(v);
          if (!v) setEditSite(null);
        }}
        onSubmit={editSite ? handleUpdateSite : handleAddSite}
        editSite={editSite}
      />

      {/* 站点详情对话框 */}
      <SiteDetailDialog
        site={detailSite}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onCheck={handleCheckSite}
        statusInfo={(() => {
          const si = getStatusInfo(detailSite?.last_status || detailSite?.status || '');
          return { color: si.color, label: t(si.labelKey, si.fallback), icon: si.icon };
        })()}
        typeLabel={
          typeLabels[detailSite?.monitoring_type || '']
            ? t(
                typeLabels[detailSite?.monitoring_type || ''].key,
                typeLabels[detailSite?.monitoring_type || ''].fallback
              )
            : detailSite?.monitoring_type || ''
        }
      />

      {/* 删除确认对话框 */}
      <Dialog open={Boolean(deleteConfirmId)} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>{t('monitoring.deleteConfirmTitle', '确认删除')}</DialogTitle>
            <DialogDescription>
              {t(
                'monitoring.deleteConfirmDesc',
                '删除后将停止监控并清除所有历史数据，此操作不可撤销。'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteConfirmId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant='destructive'
              onClick={() => deleteConfirmId && void handleDeleteSite(deleteConfirmId)}
            >
              {t('monitoring.confirmDelete', '确认删除')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 告警规则管理对话框 */}
      <Dialog
        open={rulesDialogOpen}
        onOpenChange={v => {
          setRulesDialogOpen(v);
          if (!v) setRuleFormOpen(false);
        }}
      >
        <DialogContent className='sm:max-w-lg max-h-[80vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Shield className='h-5 w-5 text-muted-foreground' />
              {t('monitoring.ruleManagement', '告警规则管理')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'monitoring.ruleManagementDesc',
                '配置自动告警触发条件，当指标超过阈值时自动发送通知'
              )}
            </DialogDescription>
          </DialogHeader>

          {/* 规则列表 */}
          <div className='space-y-3 py-2'>
            {alertRules.length === 0 && !ruleFormOpen ? (
              <EmptyState
                icon={Shield}
                title={t('monitoring.noRules', '暂无告警规则，点击下方按钮创建')}
                compact
              />
            ) : (
              alertRules.map(rule => (
                <div key={rule.id} className='flex items-center gap-3 rounded-lg border p-3'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium text-sm'>{rule.name}</span>
                      <Badge
                        variant='outline'
                        className={
                          rule.severity === 'critical'
                            ? 'border-red-500 text-red-600'
                            : rule.severity === 'high'
                              ? 'border-orange-500 text-orange-600'
                              : rule.severity === 'medium'
                                ? 'border-yellow-500 text-yellow-600'
                                : 'border-blue-500 text-blue-600'
                        }
                      >
                        {rule.severity === 'critical'
                          ? t('monitoring.severityCritical', '严重')
                          : rule.severity === 'high'
                            ? t('monitoring.severityHigh', '高')
                            : rule.severity === 'medium'
                              ? t('monitoring.severityMedium', '中')
                              : t('monitoring.severityLow', '低')}
                      </Badge>
                      <Badge
                        variant={rule.enabled ? 'default' : 'secondary'}
                        className='text-[10px]'
                      >
                        {rule.enabled
                          ? t('monitoring.enabled', '启用')
                          : t('monitoring.disabled', '禁用')}
                      </Badge>
                    </div>
                    {rule.description && (
                      <div className='text-xs text-muted-foreground mt-0.5 truncate'>
                        {rule.description}
                      </div>
                    )}
                    <div className='text-xs text-muted-foreground mt-0.5'>
                      {t('monitoring.condition', '条件')}:{' '}
                      {String((rule.conditions as Record<string, unknown>)?.type || '-')}
                      {' ≥ '}
                      {String((rule.conditions as Record<string, unknown>)?.threshold || '-')}
                    </div>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7 shrink-0 text-red-500 hover:text-red-600'
                    onClick={() => void handleDeleteRule(rule.id)}
                  >
                    <Trash2 className='h-3.5 w-3.5' />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* 创建规则表单 */}
          {ruleFormOpen && (
            <div className='space-y-3 border rounded-lg p-4 bg-muted/30'>
              <h4 className='text-sm font-medium'>{t('monitoring.newRule', '新建告警规则')}</h4>
              <div className='space-y-2'>
                <Label>{t('monitoring.ruleName', '规则名称')}</Label>
                <Input
                  placeholder={t('monitoring.ruleNamePlaceholder', '例如：响应时间超限告警')}
                  value={ruleForm.name}
                  onChange={e => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className='space-y-2'>
                <Label>{t('monitoring.ruleDesc', '描述（可选）')}</Label>
                <Input
                  placeholder={t('monitoring.ruleDescPlaceholder', '规则描述...')}
                  value={ruleForm.description}
                  onChange={e => setRuleForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-2'>
                  <Label>{t('monitoring.metric', '监控指标')}</Label>
                  <Select
                    value={ruleForm.conditionType}
                    onValueChange={v => setRuleForm(prev => ({ ...prev, conditionType: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='response_time'>
                        {t('monitoring.metricResponseTime', '响应时间 (ms)')}
                      </SelectItem>
                      <SelectItem value='status_code'>
                        {t('monitoring.metricStatusCode', '状态码异常')}
                      </SelectItem>
                      <SelectItem value='uptime'>
                        {t('monitoring.metricUptime', '可用率 (%)')}
                      </SelectItem>
                      <SelectItem value='error_rate'>
                        {t('monitoring.metricErrorRate', '错误率 (%)')}
                      </SelectItem>
                      <SelectItem value='ssl_expiry'>
                        {t('monitoring.metricSslExpiry', 'SSL 过期 (天)')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label>{t('monitoring.threshold', '阈值')}</Label>
                  <Input
                    type='number'
                    value={ruleForm.threshold}
                    onChange={e =>
                      setRuleForm(prev => ({ ...prev, threshold: Number(e.target.value) }))
                    }
                  />
                </div>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-2'>
                  <Label>{t('monitoring.severityLabel', '严重级别')}</Label>
                  <Select
                    value={ruleForm.severity}
                    onValueChange={v =>
                      setRuleForm(prev => ({ ...prev, severity: v as typeof ruleForm.severity }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='low'>{t('monitoring.severityLow', '低')}</SelectItem>
                      <SelectItem value='medium'>{t('monitoring.severityMedium', '中')}</SelectItem>
                      <SelectItem value='high'>{t('monitoring.severityHigh', '高')}</SelectItem>
                      <SelectItem value='critical'>
                        {t('monitoring.severityCritical', '严重')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label>{t('monitoring.notifyMethod', '通知方式')}</Label>
                  <div className='flex items-center gap-4 h-9'>
                    <label className='flex items-center gap-1.5 text-sm'>
                      <input
                        type='checkbox'
                        checked={ruleForm.notifyEmail}
                        onChange={e =>
                          setRuleForm(prev => ({ ...prev, notifyEmail: e.target.checked }))
                        }
                        className='rounded'
                      />
                      {t('monitoring.email', '邮件')}
                    </label>
                    <label className='flex items-center gap-1.5 text-sm'>
                      <input
                        type='checkbox'
                        checked={ruleForm.notifyWebhook}
                        onChange={e =>
                          setRuleForm(prev => ({ ...prev, notifyWebhook: e.target.checked }))
                        }
                        className='rounded'
                      />
                      Webhook
                    </label>
                  </div>
                </div>
              </div>
              <div className='flex justify-end gap-2 pt-1'>
                <Button variant='ghost' size='sm' onClick={() => setRuleFormOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  size='sm'
                  disabled={!ruleForm.name.trim() || ruleSubmitting}
                  onClick={async () => {
                    setRuleSubmitting(true);
                    try {
                      await handleCreateRule({
                        name: ruleForm.name.trim(),
                        description: ruleForm.description || undefined,
                        severity: ruleForm.severity,
                        enabled: ruleForm.enabled,
                        conditions: {
                          type: ruleForm.conditionType,
                          threshold: ruleForm.threshold,
                        },
                        actions: {
                          notify: true,
                          email: ruleForm.notifyEmail,
                          webhook: ruleForm.notifyWebhook,
                        },
                      });
                      setRuleFormOpen(false);
                      setRuleForm({
                        name: '',
                        description: '',
                        severity: 'high',
                        conditionType: 'response_time',
                        threshold: 5000,
                        enabled: true,
                        notifyEmail: true,
                        notifyWebhook: false,
                      });
                    } catch {
                      toast.error(t('monitoring.ruleCreateFailed', '创建规则失败'));
                    } finally {
                      setRuleSubmitting(false);
                    }
                  }}
                >
                  {ruleSubmitting ? (
                    <Loader2 className='h-3.5 w-3.5 mr-1 animate-spin' />
                  ) : (
                    <Plus className='h-3.5 w-3.5 mr-1' />
                  )}
                  {t('schedules.createBtn', '创建')}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className='flex-col sm:flex-row gap-2'>
            {!ruleFormOpen && (
              <Button variant='outline' size='sm' onClick={() => setRuleFormOpen(true)}>
                <Plus className='h-3.5 w-3.5 mr-1' />
                {t('monitoring.newRule', '新建规则')}
              </Button>
            )}
            <Button variant='outline' onClick={() => setRulesDialogOpen(false)}>
              {t('common.close', '关闭')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── 观测中心 Wrapper：Tabs 整合监控 + 错误追踪 ───

const ErrorTrackingPageLazy = lazy(() => import('./ErrorTrackingPage'));

const ScheduledTasksPanelLazy = lazy(() => import('../components/monitoring/ScheduledTasksPanel'));

const MonitoringWrapper = () => {
  const { t } = useTranslation();
  const desktop = isDesktopEnv();
  const [activeTab, setActiveTab] = useState(desktop ? 'scheduled' : 'monitoring');

  return (
    <div className='container py-6 space-y-4'>
      <h2 className='text-2xl font-bold tracking-tight'>
        {t('monitoring.observeCenter', '观测中心')}
      </h2>
      {desktop ? (
        /* 桌面端：直接显示本地定时任务（站点监控/错误追踪需要云端，不再展示占位 Tab） */
        <Suspense
          fallback={
            <div className='flex items-center justify-center h-32 text-muted-foreground text-sm'>
              {t('common.loading')}
            </div>
          }
        >
          <ScheduledTasksPanelLazy />
        </Suspense>
      ) : (
        /* Web 端：Tabs 整合站点监控 + 错误追踪 + 定时任务 */
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value='monitoring'>
              {t('monitoring.tabMonitoring', '站点监控')}
            </TabsTrigger>
            <TabsTrigger value='errors'>{t('monitoring.tabErrors', '错误追踪')}</TabsTrigger>
            <TabsTrigger value='scheduled'>{t('monitoring.tabScheduled', '定时任务')}</TabsTrigger>
          </TabsList>
          <TabsContent value='monitoring' className='mt-0'>
            <MonitoringContent />
          </TabsContent>
          <TabsContent value='errors' className='mt-0'>
            <Suspense
              fallback={
                <div className='flex items-center justify-center h-32 text-muted-foreground text-sm'>
                  {t('common.loading')}
                </div>
              }
            >
              <ErrorTrackingPageLazy />
            </Suspense>
          </TabsContent>
          <TabsContent value='scheduled' className='mt-0'>
            <Suspense
              fallback={
                <div className='flex items-center justify-center h-32 text-muted-foreground text-sm'>
                  {t('common.loading')}
                </div>
              }
            >
              <ScheduledTasksPanelLazy />
            </Suspense>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default MonitoringWrapper;
