import { AlertCircle, CheckCircle2, Loader2, Mail, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { apiClient } from '../services/apiClient';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [resendEmail, setResendEmail] = useState(email || '');
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // 自动验证（如果 URL 带 token 参数）
  useEffect(() => {
    if (token) {
      void verifyToken(token);
    }
  }, [token]);

  // 倒计时
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const verifyToken = async (t: string) => {
    setStatus('verifying');
    try {
      await apiClient.post('/auth/verify-email', { token: t });
      setStatus('success');
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : '验证失败');
      setStatus('error');
      setErrorMsg(msg);
    }
  };

  const handleResend = async () => {
    if (!resendEmail || resendCooldown > 0) return;
    setResending(true);
    try {
      await apiClient.post('/auth/resend-verification', { email: resendEmail });
      toast.success('验证邮件已发送，请查收');
      setResendCooldown(60);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : '发送失败');
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  // 验证成功
  if (status === 'success') {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4'>
        <Card className='w-full max-w-md'>
          <CardHeader className='text-center'>
            <div className='mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center'>
              <CheckCircle2 className='h-8 w-8 text-green-600' />
            </div>
            <CardTitle className='text-2xl'>邮箱验证成功</CardTitle>
            <CardDescription>您的邮箱已通过验证，现在可以登录使用全部功能</CardDescription>
          </CardHeader>
          <CardContent className='text-center'>
            <Link to='/login'>
              <Button className='w-full'>前往登录</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 正在验证
  if (status === 'verifying') {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4'>
        <Card className='w-full max-w-md'>
          <CardContent className='py-12 text-center'>
            <Loader2 className='h-10 w-10 animate-spin text-primary mx-auto mb-4' />
            <p className='text-muted-foreground'>正在验证您的邮箱...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 验证失败或等待用户操作（无 token）
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center'>
            <Mail className='h-8 w-8 text-blue-600' />
          </div>
          <CardTitle className='text-2xl'>
            {status === 'error' ? '验证失败' : '验证您的邮箱'}
          </CardTitle>
          <CardDescription>
            {status === 'error'
              ? '令牌无效或已过期，请重新发送验证邮件'
              : '我们已向您的邮箱发送了验证链接，请点击链接完成验证'}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {status === 'error' && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          <div className='space-y-2'>
            <p className='text-sm text-muted-foreground'>没有收到邮件？输入注册邮箱重新发送：</p>
            <div className='flex gap-2'>
              <Input
                type='email'
                placeholder='your@email.com'
                value={resendEmail}
                onChange={e => setResendEmail(e.target.value)}
              />
              <Button
                variant='outline'
                onClick={() => void handleResend()}
                disabled={resending || !resendEmail || resendCooldown > 0}
              >
                {resending ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <RefreshCw className='h-4 w-4' />
                )}
                <span className='ml-1.5'>
                  {resendCooldown > 0 ? `${resendCooldown}s` : '重新发送'}
                </span>
              </Button>
            </div>
          </div>

          <div className='pt-2 text-center text-sm text-muted-foreground'>
            <Link to='/login' className='text-primary hover:underline'>
              返回登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmailPage;
