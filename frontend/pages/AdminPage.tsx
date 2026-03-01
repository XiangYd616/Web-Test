/**
 * 管理后台页面
 * 从设置页中抽离的平台级系统管理功能，通过官网/落地页入口访问
 * 包含：通用设置、测试配置、安全策略、引擎管理、存储管理
 */

import {
  Activity,
  AlertTriangle,
  HardDrive,
  Loader2,
  RefreshCw,
  Save,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { setAppLanguage } from '../i18n';
import { getAdminConfig, updateAdminConfig } from '../services/adminApi';
import { getEngineMetrics, getEnginesHealth, resetEngine } from '../services/coreApi';
import {
  storageApi,
  type StorageFile,
  type StorageQuota,
  type StorageStatus,
} from '../services/storageApi';

// ─── 引擎管理面板 ───

const EngineManagementPanel = () => {
  const { t } = useTranslation();
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [h, m] = await Promise.all([getEnginesHealth(), getEngineMetrics()]);
      setHealth(h);
      setMetrics(m);
    } catch {
      toast.error(t('admin.engine.fetchFailed', '获取引擎状态失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = async (engineType: string) => {
    setResetting(engineType);
    try {
      await resetEngine(engineType);
      toast.success(
        t('admin.engine.resetSuccess', {
          engine: engineType,
          defaultValue: '引擎 {{engine}} 已重置',
        })
      );
      await fetchData();
    } catch {
      toast.error(
        t('admin.engine.resetFailed', {
          engine: engineType,
          defaultValue: '重置引擎 {{engine}} 失败',
        })
      );
    } finally {
      setResetting(null);
    }
  };

  const engines =
    health && typeof health === 'object'
      ? Object.entries(health as Record<string, Record<string, unknown>>)
      : [];

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle>{t('admin.engine.title', '引擎管理')}</CardTitle>
            <CardDescription>
              {t('admin.engine.description', '查看测试引擎健康状态和性能指标')}
            </CardDescription>
          </div>
          <Button variant='outline' size='sm' onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh', '刷新')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {loading && engines.length === 0 ? (
          <div className='flex items-center justify-center py-8 text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin mr-2' />
            {t('common.loading', '加载中...')}
          </div>
        ) : engines.length === 0 ? (
          <div className='text-center py-8 text-muted-foreground text-sm'>
            {t('admin.engine.noData', '暂无引擎数据')}
          </div>
        ) : (
          <div className='grid gap-3'>
            {engines.map(([name, info]) => {
              const status = String((info as Record<string, unknown>)?.status || 'unknown');
              const isHealthy = status === 'healthy';
              return (
                <div key={name} className='flex items-center justify-between p-3 rounded-lg border'>
                  <div className='flex items-center gap-3'>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isHealthy ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <div>
                      <div className='font-medium text-sm'>{name}</div>
                      <div className='text-xs text-muted-foreground'>{status}</div>
                    </div>
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => handleReset(name)}
                    disabled={resetting === name}
                  >
                    {resetting === name ? (
                      <Loader2 className='h-3.5 w-3.5 animate-spin' />
                    ) : (
                      <RefreshCw className='h-3.5 w-3.5' />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        {metrics && typeof metrics === 'object' && Object.keys(metrics).length > 0 && (
          <div className='mt-4'>
            <h4 className='text-sm font-medium mb-2'>{t('admin.engine.metrics', '性能指标')}</h4>
            <pre className='p-3 rounded bg-muted text-xs overflow-auto max-h-[200px]'>
              {JSON.stringify(metrics, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── 存储管理面板 ───

const StorageManagementPanel = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, f, q] = await Promise.allSettled([
        storageApi.getStatus(),
        storageApi.getFiles(),
        storageApi.getQuotas(),
      ]);
      if (s.status === 'fulfilled') setStatus(s.value);
      if (f.status === 'fulfilled') {
        const fv = f.value;
        setFiles(fv?.files ?? (Array.isArray(fv) ? fv : []));
      }
      if (q.status === 'fulfilled') setQuota(q.value);
    } catch {
      toast.error(t('admin.storage.fetchFailed', '获取存储信息失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteFile = async (fileId: string) => {
    try {
      await storageApi.deleteFile(fileId);
      toast.success(t('admin.storage.fileDeleted', '文件已删除'));
      void fetchData();
    } catch {
      toast.error(t('admin.storage.deleteFailed', '删除失败'));
    }
  };

  const handleCleanup = async () => {
    try {
      const result = await storageApi.cleanup(30);
      toast.success(
        result?.deletedCount
          ? t('admin.storage.cleanupSuccessCount', {
              count: Number(result.deletedCount),
              defaultValue: '清理完成，删除 {{count}} 个过期文件',
            })
          : t('admin.storage.cleanupSuccess', '清理完成')
      );
      void fetchData();
    } catch {
      toast.error(t('admin.storage.cleanupFailed', '清理失败'));
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle>{t('admin.storage.title', '存储管理')}</CardTitle>
            <CardDescription>
              {t('admin.storage.description', '查看存储状态、文件列表和配额使用情况')}
            </CardDescription>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' size='sm' onClick={() => void handleCleanup()}>
              <Trash2 className='h-3.5 w-3.5 mr-1.5' />
              {t('admin.storage.cleanup', '清理过期')}
            </Button>
            <Button variant='outline' size='sm' onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              {t('common.refresh', '刷新')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {(status || quota) && (
          <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
            {status && (
              <div className='rounded-lg border p-3'>
                <div className='text-xs text-muted-foreground'>
                  {t('admin.storage.healthStatus', '健康状态')}
                </div>
                <div className='text-sm font-medium mt-1'>
                  {String((status.health as Record<string, unknown>)?.status || 'unknown')}
                </div>
              </div>
            )}
            {status?.timestamp && (
              <div className='rounded-lg border p-3'>
                <div className='text-xs text-muted-foreground'>
                  {t('admin.storage.checkTime', '检查时间')}
                </div>
                <div className='text-sm font-medium mt-1'>
                  {new Date(status.timestamp).toLocaleString()}
                </div>
              </div>
            )}
            {quota && (
              <>
                <div className='rounded-lg border p-3'>
                  <div className='text-xs text-muted-foreground'>
                    {t('admin.storage.fileCount', '文件数量')}
                  </div>
                  <div className='text-sm font-medium mt-1'>{quota.totalFiles}</div>
                </div>
                <div className='rounded-lg border p-3'>
                  <div className='text-xs text-muted-foreground'>
                    {t('admin.storage.totalSize', '总大小')}
                  </div>
                  <div className='text-sm font-medium mt-1'>{formatSize(quota.totalSize)}</div>
                </div>
              </>
            )}
          </div>
        )}
        {loading && files.length === 0 ? (
          <div className='flex items-center justify-center py-8 text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin mr-2' />
            {t('common.loading', '加载中...')}
          </div>
        ) : files.length === 0 ? (
          <div className='text-center py-8 text-muted-foreground text-sm'>
            {t('admin.storage.noFiles', '暂无存储文件')}
          </div>
        ) : (
          <div className='space-y-1'>
            <h4 className='text-sm font-medium mb-2'>
              {t('admin.storage.fileList', '文件列表')} ({files.length})
            </h4>
            <div className='rounded-lg border divide-y max-h-[300px] overflow-y-auto'>
              {files.map(file => (
                <div key={file.id} className='flex items-center justify-between px-3 py-2'>
                  <div className='flex-1 min-w-0'>
                    <div className='text-sm font-medium truncate'>
                      {file.originalName || file.filename}
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      {formatSize(file.size)}
                      {file.mimetype && ` · ${file.mimetype}`}
                      {' · '}
                      {new Date(file.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7 shrink-0 text-red-500 hover:text-red-600'
                    onClick={() => void handleDeleteFile(file.id)}
                  >
                    <Trash2 className='h-3.5 w-3.5' />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── 主页面 ───

const AdminPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const form = useForm({
    defaultValues: {
      general: {
        siteName: '',
        siteDescription: '',
        adminEmail: '',
        timezone: '',
        language: 'en-US',
        registrationEnabled: true,
      },
      testing: {
        maxConcurrentTests: 5,
        testTimeoutMinutes: 10,
        dataRetentionDays: 30,
        webHeavyTestEnabled: true,
      },
      security: {
        passwordMinLength: 8,
        passwordRequireSpecialChars: true,
        sessionTimeoutMinutes: 60,
        maxLoginAttempts: 5,
        lockoutDurationMinutes: 15,
      },
    },
  });

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      setLoading(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (await getAdminConfig()) as Record<string, any>;
        if (data.security?.ipWhitelist && Array.isArray(data.security.ipWhitelist)) {
          data.security.ipWhitelist = data.security.ipWhitelist.join(', ');
        }
        form.reset(data as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        setAuthorized(true);
        setError(null);
      } catch (err) {
        const msg = (err as Error).message || '';
        if (msg.includes('403') || msg.includes('权限') || msg.includes('forbidden')) {
          setAuthorized(false);
        } else {
          setError(msg || t('settings.loadFailed'));
          setAuthorized(true);
        }
      } finally {
        setLoading(false);
      }
    };
    void checkAuthAndLoad();
  }, [t, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const security = (values.security || {}) as any;
      const ipWhitelistRaw = String(security?.ipWhitelist || '');
      const payload = {
        ...values,
        security: {
          ...security,
          ipWhitelist: ipWhitelistRaw
            .split(',')
            .map((item: string) => item.trim())
            .filter(Boolean),
        },
      };
      await updateAdminConfig(payload);
      setError(null);
      toast.success(t('settings.saved'));
    } catch (err) {
      setError((err as Error).message || t('settings.saveFailed'));
      toast.error(t('settings.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-32'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className='flex flex-col items-center justify-center py-32 gap-4'>
        <ShieldAlert className='h-16 w-16 text-muted-foreground' />
        <h2 className='text-xl font-bold'>{t('admin.unauthorized', '无权限访问')}</h2>
        <p className='text-muted-foreground'>
          {t('admin.unauthorizedDesc', '仅管理员可访问系统管理后台')}
        </p>
        <Button variant='outline' onClick={() => navigate('/history')}>
          {t('common.back', '返回')}
        </Button>
      </div>
    );
  }

  return (
    <div className='max-w-5xl mx-auto px-6 py-8 space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>{t('admin.title', '系统管理')}</h1>
          <p className='text-muted-foreground text-sm mt-1'>
            {t('admin.description', '平台级配置，仅管理员可修改')}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size='sm' disabled={loading || saving}>
              {saving && <Loader2 className='mr-2 h-3.5 w-3.5 animate-spin' />}
              <Save className='mr-1.5 h-3.5 w-3.5' />
              {t('common.save', '保存')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('settings.confirmSaveTitle', '确认保存？')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('settings.confirmSaveContent', '保存后系统配置将立即生效，请确认修改内容无误。')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel', '取消')}</AlertDialogCancel>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <AlertDialogAction onClick={form.handleSubmit(handleSubmit as any)}>
                {t('common.confirm', '确认')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {error && (
        <Alert variant='destructive'>
          <AlertTriangle className='h-4 w-4' />
          <AlertTitle>{t('common.error', '错误')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <form onSubmit={form.handleSubmit(handleSubmit as any)} className='space-y-6'>
          <Tabs defaultValue='general' className='space-y-4'>
            <TabsList className='grid w-full grid-cols-5 h-auto'>
              <TabsTrigger value='general'>{t('settings.sectionGeneral', '通用')}</TabsTrigger>
              <TabsTrigger value='testing'>{t('settings.sectionTesting', '测试')}</TabsTrigger>
              <TabsTrigger value='security'>{t('settings.sectionSecurity', '安全')}</TabsTrigger>
              <TabsTrigger value='engines'>
                <Activity className='h-3.5 w-3.5 mr-1' />
                {t('admin.tabEngines', '引擎')}
              </TabsTrigger>
              <TabsTrigger value='storage'>
                <HardDrive className='h-3.5 w-3.5 mr-1' />
                {t('admin.tabStorage', '存储')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value='general'>
              <Card>
                <CardHeader>
                  <CardTitle>{t('settings.sectionGeneral', '通用')}</CardTitle>
                  <CardDescription>
                    {t('admin.generalDesc', '基本应用设置和本地化')}
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <FormField
                    control={form.control}
                    name='general.siteName'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.siteName', '站点名称')}</FormLabel>
                        <FormControl>
                          <Input placeholder='Test Web Platform' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='general.siteDescription'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.siteDescription', '站点描述')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='general.adminEmail'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.adminEmail', '管理员邮箱')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='general.timezone'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.timezone', '时区')}</FormLabel>
                        <FormControl>
                          <Input placeholder='UTC' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='general.language'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.language', '语言')}</FormLabel>
                        <Select
                          onValueChange={v => {
                            field.onChange(v);
                            setAppLanguage(v);
                          }}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder='Select language' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='zh-CN'>
                              {t('settings.languageZh', '中文')}
                            </SelectItem>
                            <SelectItem value='en-US'>
                              {t('settings.languageEn', 'English')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='testing'>
              <Card>
                <CardHeader>
                  <CardTitle>{t('settings.sectionTesting', '测试')}</CardTitle>
                  <CardDescription>
                    {t('settings.testingDesc', '测试执行限制与默认值')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <FormField
                      control={form.control}
                      name='testing.maxConcurrentTests'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.maxConcurrentTests', '最大并发数')}</FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              min={1}
                              {...field}
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='testing.testTimeoutMinutes'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.testTimeoutMinutes', '超时（分）')}</FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              min={1}
                              {...field}
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='testing.dataRetentionDays'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.dataRetentionDays', '数据保留天数')}</FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              min={1}
                              {...field}
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name='testing.webHeavyTestEnabled'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4 mt-4'>
                        <div className='space-y-0.5'>
                          <FormLabel className='text-base'>
                            {t('admin.webHeavyTest', '浏览器类测试')}
                          </FormLabel>
                          <p className='text-sm text-muted-foreground'>
                            {t(
                              'admin.webHeavyTestDesc',
                              '启用后允许用户执行性能、安全、SEO、兼容性、UX、无障碍等需要 Puppeteer 的重型测试。关闭后仅保留 API 测试和压力测试，可大幅降低服务器负载。'
                            )}
                          </p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='security'>
              <Card>
                <CardHeader>
                  <CardTitle>{t('settings.sectionSecurity', '安全')}</CardTitle>
                  <CardDescription>{t('admin.securityDesc', '认证和安全策略')}</CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <FormField
                      control={form.control}
                      name='security.passwordMinLength'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.passwordMinLength', '密码最短长度')}</FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              min={4}
                              {...field}
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='security.sessionTimeoutMinutes'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t('settings.sessionTimeoutMinutes', '会话超时（分）')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              min={5}
                              {...field}
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='security.maxLoginAttempts'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.maxLoginAttempts', '最大登录尝试')}</FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              min={1}
                              {...field}
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='security.lockoutDurationMinutes'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t('settings.lockoutDurationMinutes', '锁定时长（分）')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              min={1}
                              {...field}
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name='security.passwordRequireSpecialChars'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                        <div className='space-y-0.5'>
                          <FormLabel className='text-base'>
                            {t('settings.passwordRequireSpecialChars', '要求特殊字符')}
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='engines'>
              <EngineManagementPanel />
            </TabsContent>

            <TabsContent value='storage'>
              <StorageManagementPanel />
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
};

export default AdminPage;
