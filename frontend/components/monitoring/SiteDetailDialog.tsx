import { ExternalLink, Globe, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import type { MonitoringSite } from '../../services/monitoringApi';

interface StatusInfo {
  color: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SiteDetailDialog = ({
  site,
  open,
  onOpenChange,
  onCheck,
  statusInfo,
  typeLabel,
}: {
  site: MonitoringSite | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCheck: (id: string) => void;
  statusInfo: StatusInfo;
  typeLabel: string;
}) => {
  const { t } = useTranslation();
  if (!site) return null;

  const info = statusInfo;
  const StatusIcon = info.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Globe className='h-5 w-5 text-muted-foreground' />
            {site.name}
          </DialogTitle>
          <DialogDescription className='flex items-center gap-2'>
            <a
              href={site.url}
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-500 hover:underline flex items-center gap-1'
            >
              {site.url} <ExternalLink className='h-3 w-3' />
            </a>
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='rounded-lg border p-3'>
              <div className='text-xs text-muted-foreground mb-1'>
                {t('monitoring.currentStatus', '当前状态')}
              </div>
              <div className='flex items-center gap-2'>
                <span className={`w-2.5 h-2.5 rounded-full ${info.color}`} />
                <StatusIcon className='h-4 w-4' />
                <span className='font-medium'>{info.label}</span>
              </div>
            </div>
            <div className='rounded-lg border p-3'>
              <div className='text-xs text-muted-foreground mb-1'>
                {t('monitoring.responseTime', '响应时间')}
              </div>
              <div className='font-medium'>
                {site.last_response_time != null ? `${site.last_response_time}ms` : '-'}
              </div>
            </div>
            <div className='rounded-lg border p-3'>
              <div className='text-xs text-muted-foreground mb-1'>
                {t('monitoring.monitorType', '监控类型')}
              </div>
              <div className='font-medium'>{typeLabel}</div>
            </div>
            <div className='rounded-lg border p-3'>
              <div className='text-xs text-muted-foreground mb-1'>
                {t('monitoring.checkInterval', '检查间隔')}
              </div>
              <div className='font-medium'>
                {site.check_interval >= 3600
                  ? t('monitoring.intervalHours', {
                      count: Math.round(site.check_interval / 3600),
                      defaultValue: '{{count}} 小时',
                    })
                  : site.check_interval >= 60
                    ? t('monitoring.intervalMinutes', {
                        count: Math.round(site.check_interval / 60),
                        defaultValue: '{{count}} 分钟',
                      })
                    : t('monitoring.intervalSeconds', {
                        count: site.check_interval,
                        defaultValue: '{{count}} 秒',
                      })}
              </div>
            </div>
            <div className='rounded-lg border p-3'>
              <div className='text-xs text-muted-foreground mb-1'>
                {t('monitoring.lastCheck', '上次检查')}
              </div>
              <div className='font-medium text-xs'>
                {site.last_check
                  ? new Date(site.last_check).toLocaleString()
                  : t('monitoring.never', '从未')}
              </div>
            </div>
            <div className='rounded-lg border p-3'>
              <div className='text-xs text-muted-foreground mb-1'>
                {t('monitoring.consecutiveFailures', '连续失败')}
              </div>
              <div className='font-medium'>
                {site.consecutive_failures > 0 ? (
                  <span className='text-red-500'>
                    {t('monitoring.failureCount', {
                      count: site.consecutive_failures,
                      defaultValue: '{{count}} 次',
                    })}
                  </span>
                ) : (
                  <span className='text-green-600'>0</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('common.close', '关闭')}
          </Button>
          <Button onClick={() => onCheck(site.id)}>
            <RefreshCw className='h-4 w-4 mr-1' />
            {t('monitoring.checkNow', '立即检查')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SiteDetailDialog;
