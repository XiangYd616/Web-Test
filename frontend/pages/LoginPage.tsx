import { useAppMode } from '@/context/AppModeContext';
import { isApiError } from '@/services/apiClient';
import { getCurrentUser, login } from '@/services/authApi';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  username: z.string().min(1, { message: 'Username is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
  rememberMe: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const nextPath = params.get('next') || '/dashboard';
  const { t } = useTranslation();

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    },
  });

  const { switchToWorkspace } = useAppMode();
  const isDesktop = Boolean(window.electronAPI);

  // ── 桌面端：浏览器登录（Postman 风格）──
  const [browserLoginPending, setBrowserLoginPending] = useState(false);

  const handleBrowserLogin = useCallback(
    async (mode: 'login' | 'register' = 'login') => {
      const api = window.electronAPI;
      if (!api?.auth) return;
      const serverUrl =
        localStorage.getItem('cloudApiUrl') ||
        import.meta.env.VITE_API_URL ||
        'https://api.xiangweb.space/api';
      if (!serverUrl) {
        toast.error(t('login.noServerUrl', '请先在设置中配置云端服务器地址'));
        return;
      }
      setBrowserLoginPending(true);
      const result = await api.auth.openBrowserLogin({ serverUrl, mode });
      if (!result.success) {
        toast.error(result.error || '无法打开浏览器');
        setBrowserLoginPending(false);
      }
    },
    [t]
  );

  // 监听浏览器登录回调
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.auth) return;
    const cleanup = api.auth.onCallbackResult(result => {
      setBrowserLoginPending(false);
      if (result.success && result.tokens?.accessToken) {
        // 存储 token
        localStorage.setItem('accessToken', result.tokens.accessToken);
        if (result.tokens.refreshToken) {
          localStorage.setItem('refreshToken', result.tokens.refreshToken);
        }
        if (result.user) {
          localStorage.setItem('current_user', JSON.stringify(result.user));
          switchToWorkspace({
            id: String(result.user.id || ''),
            username: String(result.user.username || ''),
            email: String(result.user.email || ''),
            role: 'user',
          });
        }
        if (result.serverUrl) {
          localStorage.setItem('cloudApiUrl', result.serverUrl);
        }
        toast.success(t('login.success', '登录成功'));
        navigate(nextPath, { replace: true });
      } else if (result.error) {
        setLoginError(result.error);
        toast.error(result.error);
      }
    });
    return cleanup;
  }, [navigate, nextPath, switchToWorkspace, t]);

  const handleFinish = async (values: FormValues) => {
    setLoading(true);
    setLoginError(null);
    try {
      const data = await login(values);
      const me = await getCurrentUser();
      const userPayload = me.user || data.user || null;
      window.localStorage.setItem('current_user', JSON.stringify(userPayload));

      // 切换到 Workspace 模式
      if (userPayload) {
        switchToWorkspace({
          id: String(userPayload.id || ''),
          username: String(userPayload.username || ''),
          email: String(userPayload.email || ''),
          role: String(userPayload.role || 'user'),
        });
      }

      // 桌面端浏览器登录回调：重定向 testweb:// 协议将 token 传回 Electron
      if (params.get('desktop_auth') === '1' && data.tokens?.accessToken) {
        const cbParams = new URLSearchParams();
        cbParams.set('access_token', data.tokens.accessToken);
        if (data.tokens.refreshToken) cbParams.set('refresh_token', data.tokens.refreshToken);
        if (userPayload) {
          cbParams.set('user_id', String(userPayload.id || ''));
          cbParams.set('username', String(userPayload.username || ''));
          cbParams.set('email', String(userPayload.email || ''));
        }
        cbParams.set('server_url', window.location.origin);
        window.location.href = `testweb://auth-callback?${cbParams.toString()}`;
        return;
      }

      toast.success(t('login.success') || 'Login successful');
      navigate(nextPath, { replace: true });
    } catch (error) {
      // 邮箱未验证：引导用户去验证页面
      if (isApiError(error) && error.status === 403 && error.message.includes('邮箱未验证')) {
        toast.warning('请先完成邮箱验证');
        navigate(`/verify-email?email=${encodeURIComponent(values.username)}`, { replace: true });
        return;
      }
      const message = (error as Error).message || t('login.loginFailed');
      setLoginError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4'>
      <div className='w-full max-w-[960px] grid grid-cols-1 md:grid-cols-2 gap-0 bg-background rounded-2xl shadow-2xl overflow-hidden border'>
        {/* Left Side — Brand Visual */}
        <div className='hidden md:flex flex-col items-center justify-center p-10 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white relative overflow-hidden'>
          {/* Decorative background elements */}
          <div className='absolute inset-0 opacity-10'>
            <div className='absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/20' />
            <div className='absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-white/15' />
            <div className='absolute top-1/2 left-1/4 w-32 h-32 rounded-full bg-white/10' />
          </div>

          <div className='relative z-10 flex flex-col items-center text-center space-y-8'>
            {/* Logo */}
            <div className='w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg'>
              <svg
                viewBox='0 0 24 24'
                className='w-9 h-9'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <rect x='3' y='3' width='18' height='18' rx='3' />
                <path d='M9 12h6M12 9v6' />
              </svg>
            </div>

            <div>
              <h2 className='text-3xl font-bold tracking-tight mb-3'>Test Web</h2>
              <p className='text-blue-100 text-sm leading-relaxed max-w-[260px]'>
                {t('login.heroDesc', '专业的多类型 Web 应用测试平台，助力高效质量保障')}
              </p>
            </div>

            {/* Illustration */}
            <div className='w-56 h-40 relative'>
              <svg
                viewBox='0 0 224 160'
                aria-hidden='true'
                className='w-full h-full drop-shadow-lg'
              >
                {/* Browser window */}
                <rect
                  x='24'
                  y='12'
                  width='176'
                  height='120'
                  rx='12'
                  fill='white'
                  fillOpacity='0.15'
                  stroke='white'
                  strokeOpacity='0.3'
                  strokeWidth='1'
                />
                <rect
                  x='24'
                  y='12'
                  width='176'
                  height='24'
                  rx='12'
                  fill='white'
                  fillOpacity='0.1'
                />
                <circle cx='42' cy='24' r='4' fill='#ef4444' fillOpacity='0.8' />
                <circle cx='56' cy='24' r='4' fill='#eab308' fillOpacity='0.8' />
                <circle cx='70' cy='24' r='4' fill='#22c55e' fillOpacity='0.8' />
                {/* Content lines */}
                <rect x='40' y='48' width='80' height='6' rx='3' fill='white' fillOpacity='0.5' />
                <rect x='40' y='62' width='144' height='4' rx='2' fill='white' fillOpacity='0.25' />
                <rect x='40' y='72' width='120' height='4' rx='2' fill='white' fillOpacity='0.25' />
                {/* Chart bars */}
                <rect
                  x='40'
                  y='100'
                  width='16'
                  height='20'
                  rx='3'
                  fill='#22c55e'
                  fillOpacity='0.7'
                />
                <rect
                  x='62'
                  y='90'
                  width='16'
                  height='30'
                  rx='3'
                  fill='#3b82f6'
                  fillOpacity='0.7'
                />
                <rect
                  x='84'
                  y='95'
                  width='16'
                  height='25'
                  rx='3'
                  fill='#8b5cf6'
                  fillOpacity='0.7'
                />
                <rect
                  x='106'
                  y='85'
                  width='16'
                  height='35'
                  rx='3'
                  fill='#06b6d4'
                  fillOpacity='0.7'
                />
                {/* Checkmark badge */}
                <circle cx='170' cy='100' r='16' fill='white' fillOpacity='0.9' />
                <path
                  d='M162 100l5 5 10-10'
                  stroke='#22c55e'
                  strokeWidth='2.5'
                  fill='none'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </div>

            {/* Feature highlights */}
            <div className='flex flex-col gap-2.5 text-left text-sm text-blue-100'>
              <div className='flex items-center gap-2'>
                <div className='w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0'>
                  <svg className='w-3 h-3' viewBox='0 0 12 12' fill='none'>
                    <path
                      d='M2 6l3 3 5-5'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </div>
                {t('login.feature1', 'API、性能、安全多维度测试')}
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0'>
                  <svg className='w-3 h-3' viewBox='0 0 12 12' fill='none'>
                    <path
                      d='M2 6l3 3 5-5'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </div>
                {t('login.feature2', '可视化报告与智能分析')}
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0'>
                  <svg className='w-3 h-3' viewBox='0 0 12 12' fill='none'>
                    <path
                      d='M2 6l3 3 5-5'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </div>
                {t('login.feature3', '团队协作与定时任务调度')}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side — Login Form */}
        <div className='p-8 md:p-12 flex flex-col justify-center'>
          {/* Back navigation */}
          {window.electronAPI ? (
            <Link
              to='/dashboard'
              className='inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 w-fit'
            >
              <ArrowLeft className='w-4 h-4' />
              {t('login.backToDashboard', '返回主页')}
            </Link>
          ) : (
            <a
              href={import.meta.env.VITE_SITE_URL || 'https://xiangweb.space'}
              className='inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 w-fit'
            >
              <ArrowLeft className='w-4 h-4' />
              {t('login.backToHome', '返回官网')}
            </a>
          )}
          {/* Header */}
          <div className='mb-8'>
            {/* Mobile-only logo */}
            <div className='md:hidden flex justify-center mb-6'>
              <div className='w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center'>
                <svg
                  viewBox='0 0 24 24'
                  className='w-7 h-7'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <rect x='3' y='3' width='18' height='18' rx='3' />
                  <path d='M9 12h6M12 9v6' />
                </svg>
              </div>
            </div>
            <h1 className='text-2xl font-bold tracking-tight md:text-left text-center'>
              {t('login.title')}
            </h1>
            <p className='text-muted-foreground mt-1.5 text-sm md:text-left text-center'>
              {t('login.welcomeSubtitle')}
            </p>
          </div>

          {loginError && (
            <Alert variant='destructive' className='mb-6'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}

          {isDesktop ? (
            /* ── 桌面端：浏览器登录（Postman 风格） ── */
            <div className='space-y-5'>
              <Button
                className='w-full h-12 text-base gap-2'
                onClick={() => void handleBrowserLogin('login')}
                disabled={browserLoginPending}
              >
                {browserLoginPending ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <ExternalLink className='h-4 w-4' />
                )}
                {browserLoginPending
                  ? t('login.waitingBrowser', '等待浏览器登录...')
                  : t('login.openBrowser', '在浏览器中登录')}
              </Button>
              {browserLoginPending && (
                <p className='text-center text-sm text-muted-foreground'>
                  {t('login.browserHint', '已在默认浏览器中打开登录页面，完成后将自动返回')}
                </p>
              )}
              <p className='text-center text-xs text-muted-foreground'>
                {t(
                  'login.browserDesc',
                  '点击按钮将在系统默认浏览器中打开登录页面，登录成功后自动回到应用'
                )}
              </p>
              <div className='pt-2 text-center text-sm text-muted-foreground'>
                {t('login.noAccount', '没有账户？')}{' '}
                <Link to='/register' className='text-primary hover:underline font-medium'>
                  {t('login.createAccount', '创建账户')}
                </Link>
              </div>
            </div>
          ) : (
            /* ── Web 端：原有登录表单 ── */
            <>
              {/* eslint-disable @typescript-eslint/no-explicit-any */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFinish as any)} className='space-y-5'>
                  <FormField
                    control={form.control as any}
                    name='username'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('login.usernameLabel')}</FormLabel>
                        <FormControl>
                          <Input className='h-11' placeholder='username / email' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name='password'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('login.passwordLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            className='h-11'
                            type='password'
                            placeholder='••••••••'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className='flex items-center justify-between'>
                    <FormField
                      control={form.control as any}
                      name='rememberMe'
                      render={({ field }) => (
                        <FormItem className='flex flex-row items-center space-x-2 space-y-0'>
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className='text-sm font-normal cursor-pointer'>
                            {t('login.remember')}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type='submit' className='w-full h-11 text-base' disabled={loading}>
                    {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                    {t('login.login')}
                  </Button>
                </form>
              </Form>
              {/* eslint-enable @typescript-eslint/no-explicit-any */}

              <div className='mt-6 flex items-center'>
                <Separator className='flex-1' />
                <span className='mx-4 text-xs text-muted-foreground uppercase'>
                  {t('login.orDivider')}
                </span>
                <Separator className='flex-1' />
              </div>

              <div className='mt-4 text-center text-sm text-muted-foreground'>
                {t('login.noAccount', '没有账户？')}{' '}
                <Link to='/register' className='text-primary hover:underline font-medium'>
                  {t('login.createAccount', '创建账户')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
