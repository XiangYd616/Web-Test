import {
  ArrowLeft,
  FolderOpen,
  Gauge,
  History,
  Home,
  LayoutDashboard,
  MessageSquarePlus,
  Shield,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const AUTO_REDIRECT_SECONDS = 15;

const quickLinks = [
  { path: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.console', fallback: '控制台' },
  { path: '/history', icon: History, labelKey: 'nav.reportCenter', fallback: '报告中心' },
  { path: '/monitoring', icon: Shield, labelKey: 'nav.observeCenter', fallback: '观测中心' },
  { path: '/collections', icon: FolderOpen, labelKey: 'nav.collections', fallback: 'API 集合' },
  { path: '/templates', icon: Gauge, labelKey: 'nav.templates', fallback: '模板' },
  { path: '/settings', icon: Home, labelKey: 'nav.settings', fallback: '设置' },
];

interface NotFoundPageProps {
  code?: string | number;
  title?: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
  showQuickLinks?: boolean;
  autoRedirect?: boolean;
}

const NotFoundPage = ({
  code = '404',
  title,
  description,
  backTo,
  backLabel,
  showQuickLinks = true,
  autoRedirect = true,
}: NotFoundPageProps = {}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(AUTO_REDIRECT_SECONDS);
  const [paused, setPaused] = useState(!autoRedirect);

  const targetPath = backTo || '/dashboard';
  const goTarget = useCallback(
    () => navigate(targetPath, { replace: true }),
    [navigate, targetPath]
  );

  useEffect(() => {
    if (paused) return;
    if (countdown <= 0) {
      goTarget();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, paused, goTarget]);

  const displayTitle = title || t('notFound.title', '页面未找到');
  const displayDesc =
    description || t('notFound.description', '您访问的页面不存在或已被移除，请检查 URL 是否正确。');
  const displayBackLabel = backLabel || t('notFound.goBack', '返回上页');

  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4'>
      <div className='text-8xl font-extrabold text-muted-foreground/20 select-none'>{code}</div>

      <div className='space-y-2 max-w-lg'>
        <h1 className='text-2xl font-bold'>{displayTitle}</h1>
        <p className='text-muted-foreground'>{displayDesc}</p>
        <p className='text-xs text-muted-foreground/60 font-mono break-all'>{location.pathname}</p>
      </div>

      {/* 操作按钮 */}
      <div className='flex items-center gap-3 flex-wrap justify-center'>
        <Button variant='outline' onClick={() => navigate(-1)}>
          <ArrowLeft className='h-4 w-4 mr-1' />
          {displayBackLabel}
        </Button>
        <Button onClick={goTarget}>
          <Home className='h-4 w-4 mr-1' />
          {t('notFound.goHome', '回到首页')}
        </Button>
        <Button
          variant='ghost'
          className='text-muted-foreground'
          onClick={() => {
            const params = new URLSearchParams({
              source: '404',
              path: location.pathname,
              referrer: document.referrer || '',
            });
            navigate(`/uat?${params.toString()}`);
          }}
        >
          <MessageSquarePlus className='h-4 w-4 mr-1' />
          {t('notFound.reportIssue', '报告问题')}
        </Button>
      </div>

      {/* 自动跳转倒计时 */}
      {!paused ? (
        <p className='text-xs text-muted-foreground'>
          {t('notFound.redirectCountdown', {
            seconds: countdown,
            defaultValue: `${countdown} 秒后自动跳转`,
          })}
          <button
            type='button'
            className='ml-2 underline hover:text-foreground transition-colors'
            onClick={() => setPaused(true)}
          >
            {t('notFound.cancelRedirect', '取消')}
          </button>
        </p>
      ) : autoRedirect ? (
        <p className='text-xs text-muted-foreground'>
          {t('notFound.redirectPaused', '自动跳转已暂停')}
        </p>
      ) : null}

      {/* 常用页面快捷入口 */}
      {showQuickLinks && (
        <Card className='w-full max-w-xl mt-2'>
          <CardContent className='p-4'>
            <p className='text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3'>
              {t('notFound.quickLinks', '快捷导航')}
            </p>
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
              {quickLinks.map(link => {
                const Icon = link.icon;
                return (
                  <Button
                    key={link.path}
                    variant='ghost'
                    className='h-auto py-3 flex flex-col items-center gap-1.5 text-muted-foreground hover:text-foreground'
                    onClick={() => navigate(link.path)}
                  >
                    <Icon className='h-5 w-5' />
                    <span className='text-xs'>{t(link.labelKey, link.fallback)}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotFoundPage;
