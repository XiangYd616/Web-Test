import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface QueueProgressCardProps {
  progressValue: number;
  statusValue: string;
  queueName: string;
  progressStatusText: string;
  attempts: number;
  attemptsMade: number;
  queueFailedReason: string | null;
  queueLoading: boolean;
  onRefresh: () => void;
}

const QueueProgressCard = ({
  progressValue,
  statusValue,
  queueName,
  progressStatusText,
  attempts,
  attemptsMade,
  queueFailedReason,
  queueLoading,
  onRefresh,
}: QueueProgressCardProps) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className='pb-3 flex flex-row items-center justify-between space-y-0'>
        <CardTitle className='text-lg font-medium'>{t('historyDetail.queueProgress')}</CardTitle>
        <Button
          variant='ghost'
          size='sm'
          onClick={onRefresh}
          disabled={queueLoading}
          className='h-8 w-8 p-0'
        >
          <RefreshCw className={cn('h-4 w-4', queueLoading && 'animate-spin')} />
        </Button>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className='space-y-1'>
            <div className='text-sm font-medium text-muted-foreground mb-1'>
              {t('historyDetail.progress')}
            </div>
            <div className='flex items-center gap-3'>
              <Progress
                value={progressValue}
                className={cn('h-2', statusValue === 'failed' && 'bg-red-100')}
                indicatorClassName={cn(statusValue === 'failed' && 'bg-red-500')}
              />
              <span className='text-sm w-12 text-right'>{Math.round(progressValue)}%</span>
            </div>
          </div>
          <div className='grid grid-cols-3 gap-4'>
            <div className='space-y-1'>
              <div className='text-sm font-medium text-muted-foreground'>
                {t('historyDetail.queue')}
              </div>
              <div className='text-sm font-mono'>{queueName}</div>
            </div>
            <div className='space-y-1'>
              <div className='text-sm font-medium text-muted-foreground'>
                {t('historyDetail.execStatus')}
              </div>
              <div className='text-sm'>{progressStatusText}</div>
            </div>
            <div className='space-y-1'>
              <div className='text-sm font-medium text-muted-foreground'>
                {t('historyDetail.retries')}
              </div>
              <div className='text-sm'>
                {attempts ? `${attemptsMade}/${attempts}` : `${attemptsMade}`}
              </div>
            </div>
          </div>
        </div>
        {queueFailedReason && (
          <Alert variant='destructive'>
            <AlertTriangle className='h-4 w-4' />
            <AlertTitle>{t('historyDetail.failReason')}</AlertTitle>
            <AlertDescription className='font-mono text-xs mt-1'>
              {queueFailedReason}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default QueueProgressCard;
