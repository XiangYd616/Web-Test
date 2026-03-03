/**
 * 云端账户面板（桌面端专用）
 * 功能：登录/注册云端账户、查看权益、配置云端 URL、退出登录
 */

import {
  CheckCircle2,
  Crown,
  HardDrive,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  RefreshCw,
  Shield,
  User,
  UserPlus,
  Wifi,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAppMode } from '../../context/AppModeContext';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { apiClient } from '../../services/apiClient';
import { DEFAULT_CLOUD_API_URL } from '../../utils/environment';

// ─── 类型定义 ───

type CloudUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  plan: 'free' | 'pro' | 'team';
  planExpiry: string | null;
};

type LicenseCert = {
  userId: string;
  plan: 'free' | 'pro' | 'team';
  features: string[];
  quotas: { syncPerMonth: number };
  issuedAt: string;
  expiresAt: string;
};

const STORAGE_KEYS = {
  cloudApiUrl: 'cloudApiUrl',
  cloudUser: 'current_user',
  cloudToken: 'accessToken',
  cloudRefresh: 'refreshToken',
  licenseCert: 'licenseCert',
};

// ─── 工具函数 ───

// 云端 API 地址：硬编码官方服务器，用户无需配置
const getCloudApiUrl = (): string => DEFAULT_CLOUD_API_URL;

const getCloudUser = (): CloudUser | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.cloudUser);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed.id) return null;
    return {
      id: String(parsed.id),
      username: String(parsed.username || parsed.name || ''),
      email: String(parsed.email || ''),
      role: String(parsed.role || 'user'),
      plan: (parsed.plan as CloudUser['plan']) || 'free',
      planExpiry: parsed.planExpiry ? String(parsed.planExpiry) : null,
    };
  } catch {
    return null;
  }
};

const setCloudUser = (user: CloudUser | null) => {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.cloudUser, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.cloudUser);
  }
};

const getCloudToken = (): string | null => localStorage.getItem(STORAGE_KEYS.cloudToken);

const setCloudTokens = (access: string, refresh?: string) => {
  localStorage.setItem(STORAGE_KEYS.cloudToken, access);
  if (refresh) localStorage.setItem(STORAGE_KEYS.cloudRefresh, refresh);
};

const clearCloudSession = () => {
  localStorage.removeItem(STORAGE_KEYS.cloudToken);
  localStorage.removeItem(STORAGE_KEYS.cloudRefresh);
  localStorage.removeItem(STORAGE_KEYS.cloudUser);
  localStorage.removeItem(STORAGE_KEYS.licenseCert);
};

const getLicenseCert = (): LicenseCert | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.licenseCert);
    return raw ? (JSON.parse(raw) as LicenseCert) : null;
  } catch {
    return null;
  }
};

const setLicenseCert = (cert: LicenseCert | null) => {
  if (cert) {
    localStorage.setItem(STORAGE_KEYS.licenseCert, JSON.stringify(cert));
  } else {
    localStorage.removeItem(STORAGE_KEYS.licenseCert);
  }
};

const PLAN_LABELS: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  free: { label: '免费版', color: 'bg-gray-100 text-gray-700', icon: User },
  pro: { label: '专业版', color: 'bg-amber-100 text-amber-700', icon: Crown },
  team: { label: '团队版', color: 'bg-blue-100 text-blue-700', icon: Shield },
};

// ─── 登录/注册表单 ───

const AuthForm = ({
  apiUrl,
  onSuccess,
}: {
  apiUrl: string;
  onSuccess: (user: CloudUser) => void;
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiUrl) {
      toast.error('请先配置云端服务器地址');
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const body =
        mode === 'login'
          ? { username: username || email, password }
          : { username, email, password };

      const resp = await apiClient.post(endpoint, body, { baseURL: apiUrl });
      const data = resp.data?.data || resp.data;

      // 注册时如果需要邮箱验证，提示用户去验证
      if (mode === 'register' && data?.emailVerificationRequired) {
        toast.success('注册成功，请查收验证邮件后再登录');
        setMode('login');
        setLoading(false);
        return;
      }

      const tokens = data?.tokens;
      const user = data?.user;

      if (!tokens?.accessToken || !user?.id) {
        throw new Error('响应格式异常');
      }

      setCloudTokens(tokens.accessToken, tokens.refreshToken);
      const cloudUser: CloudUser = {
        id: user.id,
        username: user.username || username,
        email: user.email || email,
        role: user.role || 'user',
        plan: 'free',
        planExpiry: null,
      };
      setCloudUser(cloudUser);

      // 通知 Electron 主进程（写入 app_state + 激活 SyncEngine）
      if (window.electronAPI?.appState) {
        void window.electronAPI.appState.setCloudAuth({
          serverUrl: DEFAULT_CLOUD_API_URL,
          token: tokens.accessToken,
          userId: user.id,
          username: user.username || username,
          email: user.email || email,
        });
      }
      // 同时设置 SyncEngine 的 serverUrl
      if (window.electronAPI?.sync) {
        void window.electronAPI.sync.setConfig({ serverUrl: DEFAULT_CLOUD_API_URL, enabled: true });
      }

      onSuccess(cloudUser);
      toast.success(mode === 'login' ? '登录成功' : '注册成功');
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : '操作失败');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          {mode === 'login' ? <LogIn className='h-5 w-5' /> : <UserPlus className='h-5 w-5' />}
          {mode === 'login' ? '登录云端账户' : '注册云端账户'}
        </CardTitle>
        <CardDescription>
          {mode === 'login'
            ? '登录后可同步数据到云端、解锁高级功能'
            : '创建账户以使用云端同步和高级功能'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={e => void handleSubmit(e)} className='space-y-4'>
          {mode === 'register' && (
            <div className='space-y-2'>
              <Label htmlFor='cloud-username'>用户名</Label>
              <Input
                id='cloud-username'
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder='your-username'
                required
              />
            </div>
          )}
          <div className='space-y-2'>
            <Label htmlFor='cloud-email'>{mode === 'login' ? '用户名或邮箱' : '邮箱'}</Label>
            <Input
              id='cloud-email'
              type={mode === 'register' ? 'email' : 'text'}
              value={mode === 'login' ? username || email : email}
              onChange={e => {
                if (mode === 'login') setUsername(e.target.value);
                else setEmail(e.target.value);
              }}
              placeholder={mode === 'login' ? 'username or email@example.com' : 'email@example.com'}
              required
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='cloud-password'>密码</Label>
            <Input
              id='cloud-password'
              type='password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder='••••••••'
              required
              minLength={6}
            />
          </div>
          <div className='flex items-center justify-between'>
            <Button type='submit' disabled={loading}>
              {loading && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
              {mode === 'login' ? '登录' : '注册'}
            </Button>
            <Button
              type='button'
              variant='link'
              className='text-sm'
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? '没有账户？去注册' : '已有账户？去登录'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// ─── 已登录状态面板 ───

const AccountInfo = ({
  user,
  cert,
  onLogout,
  onRefresh,
  refreshing,
}: {
  user: CloudUser;
  cert: LicenseCert | null;
  onLogout: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) => {
  const planMeta = PLAN_LABELS[user.plan] || PLAN_LABELS.free;
  const PlanIcon = planMeta.icon;
  const certValid = cert && new Date(cert.expiresAt) > new Date();

  return (
    <div className='space-y-4'>
      {/* 用户信息 */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <User className='h-5 w-5' />
                云端账户
              </CardTitle>
              <CardDescription>已登录，数据可同步至云端</CardDescription>
            </div>
            <div className='flex gap-2'>
              <Button variant='outline' size='sm' onClick={onRefresh} disabled={refreshing}>
                {refreshing ? (
                  <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />
                ) : (
                  <RefreshCw className='h-3.5 w-3.5 mr-1.5' />
                )}
                刷新权益
              </Button>
              <Button variant='outline' size='sm' onClick={onLogout}>
                <LogOut className='h-3.5 w-3.5 mr-1.5' />
                退出登录
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-start gap-4'>
            <div className='h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center'>
              <User className='h-7 w-7 text-primary' />
            </div>
            <div className='flex-1 space-y-1'>
              <div className='flex items-center gap-2'>
                <span className='font-semibold text-lg'>{user.username}</span>
                <Badge className={`${planMeta.color} gap-1`}>
                  <PlanIcon className='h-3 w-3' />
                  {planMeta.label}
                </Badge>
              </div>
              <div className='flex items-center gap-1 text-sm text-muted-foreground'>
                <Mail className='h-3.5 w-3.5' />
                {user.email}
              </div>
            </div>
          </div>

          <div className='border-t' />

          {/* 权益信息 */}
          <div className='space-y-3'>
            <h4 className='text-sm font-medium'>当前权益</h4>
            {certValid ? (
              <div className='grid grid-cols-2 gap-3'>
                <div className='rounded-lg border p-3'>
                  <div className='text-xs text-muted-foreground'>同步额度</div>
                  <div className='text-sm font-medium mt-1'>
                    {cert.quotas.syncPerMonth === -1
                      ? '无限制'
                      : `${cert.quotas.syncPerMonth} 条/月`}
                  </div>
                </div>
                <div className='rounded-lg border p-3'>
                  <div className='text-xs text-muted-foreground'>证书有效期</div>
                  <div className='text-sm font-medium mt-1'>
                    {new Date(cert.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <div className='rounded-lg border p-3 col-span-2'>
                  <div className='text-xs text-muted-foreground mb-1.5'>已解锁功能</div>
                  <div className='flex gap-1.5 flex-wrap'>
                    {cert.features.length > 0 ? (
                      cert.features.map(f => (
                        <Badge key={f} variant='secondary' className='text-xs'>
                          <CheckCircle2 className='h-3 w-3 mr-1 text-green-500' />
                          {f}
                        </Badge>
                      ))
                    ) : (
                      <span className='text-xs text-muted-foreground'>基础功能</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className='rounded-lg border border-amber-200 bg-amber-50 p-4'>
                <div className='flex items-start gap-3'>
                  <Crown className='h-5 w-5 text-amber-600 mt-0.5' />
                  <div>
                    <div className='font-medium text-amber-800'>
                      {cert ? '权益证书已过期' : '免费版'}
                    </div>
                    <p className='text-sm text-amber-700 mt-1'>
                      {user.plan === 'free'
                        ? '升级到专业版可解锁无限同步、高级模板等功能'
                        : '请点击「刷新权益」更新证书'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── 主面板 ───

const CloudAccountPanel = () => {
  const [cloudUser, setCloudUserState] = useState<CloudUser | null>(getCloudUser);
  const [licenseCert, setLicenseCertState] = useState<LicenseCert | null>(getLicenseCert);
  const [refreshing, setRefreshing] = useState(false);

  const isLoggedIn = Boolean(cloudUser && getCloudToken());

  useEffect(() => {
    const token = getCloudToken();
    const url = getCloudApiUrl();
    if (token && url && !cloudUser) {
      void fetchCloudUser(url, token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCloudUser = async (url: string, token: string) => {
    try {
      const resp = await apiClient.get('/auth/me', {
        baseURL: url,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = resp.data?.data || resp.data;
      const user = data?.user;
      if (user?.id) {
        const cu: CloudUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          plan: user.plan || 'free',
          planExpiry: user.planExpiry || null,
        };
        setCloudUser(cu);
        setCloudUserState(cu);
      }
    } catch {
      clearCloudSession();
      setCloudUserState(null);
    }
  };

  const { switchToWorkspace, switchToScratchpad } = useAppMode();

  const handleLoginSuccess = (user: CloudUser) => {
    setCloudUserState(user);
    // 切换到 Workspace 模式
    switchToWorkspace({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  };

  const handleLogout = () => {
    clearCloudSession();
    setCloudUserState(null);
    setLicenseCertState(null);

    // 通知 Electron 主进程（清除 app_state + 断开 SyncEngine）
    if (window.electronAPI?.appState) {
      void window.electronAPI.appState.clearCloudAuth();
    }

    // 切回 Scratch Pad 模式
    switchToScratchpad();

    toast.success('已退出云端账户');
  };

  const handleRefreshLicense = async () => {
    const token = getCloudToken();
    const url = getCloudApiUrl();
    if (!token || !url) {
      toast.error('请先登录云端账户');
      return;
    }
    setRefreshing(true);
    try {
      const resp = await apiClient.get('/auth/license', {
        baseURL: url,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = resp.data?.data || resp.data;
      if (data?.plan) {
        const cert: LicenseCert = {
          userId: data.userId || cloudUser?.id || '',
          plan: data.plan || 'free',
          features: data.features || [],
          quotas: data.quotas || { syncPerMonth: 50 },
          issuedAt: data.issuedAt || new Date().toISOString(),
          expiresAt: data.expiresAt || new Date(Date.now() + 30 * 86400000).toISOString(),
        };
        setLicenseCert(cert);
        setLicenseCertState(cert);

        if (cloudUser) {
          const updated = { ...cloudUser, plan: cert.plan };
          setCloudUser(updated);
          setCloudUserState(updated);
        }
        toast.success('权益信息已更新');
      } else {
        const defaultCert: LicenseCert = {
          userId: cloudUser?.id || '',
          plan: 'free',
          features: [],
          quotas: { syncPerMonth: 50 },
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        };
        setLicenseCert(defaultCert);
        setLicenseCertState(defaultCert);
        toast.info('当前为免费版权益');
      }
    } catch {
      toast.error('获取权益信息失败');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className='space-y-4'>
      {/* ① 未登录 → 直接显示登录表单 */}
      {!isLoggedIn && <AuthForm apiUrl={DEFAULT_CLOUD_API_URL} onSuccess={handleLoginSuccess} />}

      {/* ② 已登录 → 显示账户信息 + 权益 */}
      {isLoggedIn && cloudUser && (
        <AccountInfo
          user={cloudUser}
          cert={licenseCert}
          onLogout={handleLogout}
          onRefresh={() => void handleRefreshLicense()}
          refreshing={refreshing}
        />
      )}

      {/* ③ 本地模式概览 — 始终显示 */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <HardDrive className='h-5 w-5' />
                本地模式
              </CardTitle>
              <CardDescription>所有数据存储在本地，无需联网即可使用全部功能</CardDescription>
            </div>
            <Badge
              variant='outline'
              className={
                isLoggedIn
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-green-200 bg-green-50 text-green-700'
              }
            >
              {isLoggedIn ? (
                <>
                  <Wifi className='h-3 w-3 mr-1' />
                  云端已连接
                </>
              ) : (
                <>
                  <CheckCircle2 className='h-3 w-3 mr-1' />
                  离线可用
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-3 gap-3'>
            <div className='rounded-lg border bg-muted/30 p-3 text-center'>
              <div className='text-2xl font-bold text-primary'>∞</div>
              <div className='text-xs text-muted-foreground mt-1'>测试次数</div>
            </div>
            <div className='rounded-lg border bg-muted/30 p-3 text-center'>
              <div className='text-2xl font-bold text-primary'>∞</div>
              <div className='text-xs text-muted-foreground mt-1'>数据存储</div>
            </div>
            <div className='rounded-lg border bg-muted/30 p-3 text-center'>
              <div className='text-2xl font-bold text-primary'>7</div>
              <div className='text-xs text-muted-foreground mt-1'>测试引擎</div>
            </div>
          </div>
          <p className='text-xs text-muted-foreground mt-3'>
            所有测试计算在本地执行，数据完全离线存储。登录云端账户后可解锁跨设备同步。
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CloudAccountPanel;
