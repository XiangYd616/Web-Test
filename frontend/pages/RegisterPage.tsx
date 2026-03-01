import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, ExternalLink, Loader2, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAppMode } from '../context/AppModeContext';
import { getCurrentUser, register } from '../services/authApi';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z
  .object({
    username: z.string().min(3, { message: '用户名至少 3 个字符' }),
    email: z.string().email({ message: '请输入有效的邮箱地址' }),
    password: z.string().min(8, { message: '密码至少 8 个字符' }),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof formSchema>;

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { switchToWorkspace } = useAppMode();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const isDesktop = Boolean(window.electronAPI);
  const params = new URLSearchParams(location.search);

  // ── 桌面端：浏览器注册（Postman 风格）──
  const [browserPending, setBrowserPending] = useState(false);

  const handleBrowserRegister = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.auth) return;
    const serverUrl = localStorage.getItem('cloudApiUrl') || import.meta.env.VITE_API_URL || '';
    if (!serverUrl) {
      toast.error(t('register.noServerUrl', '请先在设置中配置云端服务器地址'));
      return;
    }
    setBrowserPending(true);
    const result = await api.auth.openBrowserLogin({ serverUrl, mode: 'register' });
    if (!result.success) {
      toast.error(result.error || '无法打开浏览器');
      setBrowserPending(false);
    }
  }, [t]);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.auth) return;
    const cleanup = api.auth.onCallbackResult(result => {
      setBrowserPending(false);
      if (result.success && result.tokens?.accessToken) {
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
        toast.success(t('register.success', '注册成功'));
        navigate('/dashboard', { replace: true });
      } else if (result.error) {
        setError(result.error);
        toast.error(result.error);
      }
    });
    return cleanup;
  }, [navigate, switchToWorkspace, t]);

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    try {
      const data = await register({
        username: values.username,
        email: values.email,
        password: values.password,
      });

      // 需要邮箱验证 → 跳转验证页面
      if (data.emailVerificationRequired) {
        toast.success('注册成功，请查收验证邮件');
        navigate(`/verify-email?email=${encodeURIComponent(values.email)}`, { replace: true });
        return;
      }

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

      // 桌面端浏览器注册回调：重定向 testweb:// 协议将 token 传回 Electron
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

      toast.success(t('register.success', '注册成功'));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = (err as Error).message || t('register.failed', '注册失败');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4'>
      <div className='w-full max-w-[960px] grid grid-cols-1 md:grid-cols-2 gap-0 bg-background rounded-2xl shadow-2xl overflow-hidden border'>
        {/* Left Side — Brand Visual */}
        <div className='hidden md:flex flex-col items-center justify-center p-10 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white relative overflow-hidden'>
          {/* Decorative background elements */}
          <div className='absolute inset-0 opacity-10'>
            <div className='absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/20' />
            <div className='absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-white/15' />
            <div className='absolute top-1/3 right-1/4 w-32 h-32 rounded-full bg-white/10' />
          </div>

          <div className='relative z-10 flex flex-col items-center text-center space-y-7'>
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
              <h2 className='text-3xl font-bold tracking-tight mb-3'>
                {t('register.heroTitle', '加入 Test Web')}
              </h2>
              <p className='text-emerald-100 text-sm leading-relaxed max-w-[260px]'>
                {t('register.heroDesc', '创建账户，开始使用多类型 API 与网站测试平台')}
              </p>
            </div>

            {/* Illustration — person + shield */}
            <div className='w-56 h-36 relative'>
              <svg
                viewBox='0 0 224 144'
                aria-hidden='true'
                className='w-full h-full drop-shadow-lg'
              >
                {/* Card background */}
                <rect
                  x='24'
                  y='8'
                  width='176'
                  height='128'
                  rx='16'
                  fill='white'
                  fillOpacity='0.12'
                  stroke='white'
                  strokeOpacity='0.25'
                  strokeWidth='1'
                />
                {/* Avatar circle */}
                <circle cx='90' cy='52' r='22' fill='white' fillOpacity='0.85' />
                <circle cx='90' cy='46' r='9' fill='#10b981' fillOpacity='0.6' />
                <path d='M74 66 a16 12 0 0 1 32 0' fill='#10b981' fillOpacity='0.4' />
                {/* Name line */}
                <rect x='64' y='82' width='52' height='6' rx='3' fill='white' fillOpacity='0.5' />
                <rect x='68' y='94' width='44' height='4' rx='2' fill='white' fillOpacity='0.25' />
                {/* Shield badge */}
                <path
                  d='M155 36 l18 6 v14 c0 10 -8 18 -18 22 c-10-4-18-12-18-22 v-14 z'
                  fill='white'
                  fillOpacity='0.9'
                />
                <path
                  d='M149 56 l5 5 9-9'
                  stroke='#10b981'
                  strokeWidth='2.5'
                  fill='none'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
                {/* Small decorative dots */}
                <circle cx='44' cy='120' r='3' fill='white' fillOpacity='0.2' />
                <circle cx='180' cy='24' r='4' fill='white' fillOpacity='0.15' />
                <circle cx='168' cy='112' r='2.5' fill='white' fillOpacity='0.2' />
              </svg>
            </div>

            {/* Feature highlights */}
            <div className='flex flex-col gap-2.5 text-left text-sm text-emerald-100'>
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
                {t('register.feature1', '免费创建，即刻开始测试')}
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
                {t('register.feature2', '支持 API、性能、安全等多维测试')}
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
                {t('register.feature3', '数据安全加密，隐私有保障')}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side — Register Form */}
        <div className='p-8 md:p-12 flex flex-col justify-center'>
          {/* Back navigation */}
          {window.electronAPI ? (
            <Link
              to='/dashboard'
              className='inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 w-fit'
            >
              <ArrowLeft className='w-4 h-4' />
              {t('register.backToDashboard', '返回主页')}
            </Link>
          ) : (
            <a
              href={import.meta.env.VITE_SITE_URL || 'https://xiangweb.space'}
              className='inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 w-fit'
            >
              <ArrowLeft className='w-4 h-4' />
              {t('register.backToHome', '返回官网')}
            </a>
          )}
          {/* Header */}
          <div className='mb-7'>
            {/* Mobile-only logo */}
            <div className='md:hidden flex justify-center mb-6'>
              <div className='w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center'>
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
            <h2 className='text-2xl font-bold tracking-tight md:text-left text-center'>
              {t('register.title', '创建账户')}
            </h2>
            <p className='text-muted-foreground mt-1.5 text-sm md:text-left text-center'>
              {t('register.subtitle', '填写以下信息完成注册')}
            </p>
          </div>

          {error && (
            <Alert variant='destructive' className='mb-6'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isDesktop ? (
            /* ── 桌面端：浏览器注册（Postman 风格） ── */
            <div className='space-y-5'>
              <Button
                className='w-full h-12 text-base gap-2'
                onClick={() => void handleBrowserRegister()}
                disabled={browserPending}
              >
                {browserPending ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <ExternalLink className='h-4 w-4' />
                )}
                {browserPending
                  ? t('register.waitingBrowser', '等待浏览器注册...')
                  : t('register.openBrowser', '在浏览器中注册')}
              </Button>
              {browserPending && (
                <p className='text-center text-sm text-muted-foreground'>
                  {t('register.browserHint', '已在默认浏览器中打开注册页面，完成后将自动返回')}
                </p>
              )}
              <p className='text-center text-xs text-muted-foreground'>
                {t(
                  'register.browserDesc',
                  '点击按钮将在系统默认浏览器中打开注册页面，注册成功后自动回到应用'
                )}
              </p>
              <div className='pt-2 text-center text-sm text-muted-foreground'>
                {t('register.hasAccount', '已有账户？')}{' '}
                <Link to='/login' className='text-primary hover:underline font-medium'>
                  {t('register.goLogin', '去登录')}
                </Link>
              </div>
            </div>
          ) : (
            /* ── Web 端：原有注册表单 ── */
            <>
              {/* eslint-disable @typescript-eslint/no-explicit-any */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit as any)} className='space-y-4'>
                  <FormField
                    control={form.control as any}
                    name='username'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('register.username', '用户名')}</FormLabel>
                        <FormControl>
                          <Input className='h-11' placeholder='your-username' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name='email'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('register.email', '邮箱')}</FormLabel>
                        <FormControl>
                          <Input
                            className='h-11'
                            type='email'
                            placeholder='you@example.com'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <FormField
                      control={form.control as any}
                      name='password'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('register.password', '密码')}</FormLabel>
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
                    <FormField
                      control={form.control as any}
                      name='confirmPassword'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('register.confirmPassword', '确认密码')}</FormLabel>
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
                  </div>
                  <Button type='submit' className='w-full h-11 text-base' disabled={loading}>
                    {loading ? (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    ) : (
                      <UserPlus className='mr-2 h-4 w-4' />
                    )}
                    {t('register.submit', '注册')}
                  </Button>
                </form>
              </Form>
              {/* eslint-enable @typescript-eslint/no-explicit-any */}

              <div className='mt-6 text-center text-sm text-muted-foreground'>
                {t('register.hasAccount', '已有账户？')}{' '}
                <Link to='/login' className='text-primary hover:underline font-medium'>
                  {t('register.goLogin', '去登录')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
