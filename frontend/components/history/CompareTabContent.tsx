import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type CompareKeyMetricRow =
  | {
      type: 'number';
      label: string;
      base: number | null;
      target: number | null;
      delta: number | null;
      improved: boolean | null;
      regressed: boolean | null;
      betterWhen: 'higher' | 'lower';
    }
  | {
      type: 'text';
      label: string;
      base: string;
      target: string;
    };

interface CompareTabContentProps {
  compareId: string | null;
  compareLoading: boolean;
  compareOptions: Array<{ value: string; label: string }>;
  compareKeyMetrics: CompareKeyMetricRow[];
  onCompareIdChange: (value: string | null) => void;
}

const CompareTabContent = ({
  compareId,
  compareLoading,
  compareOptions,
  compareKeyMetrics,
  onCompareIdChange,
}: CompareTabContentProps) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className='pb-3 flex flex-row items-center justify-between space-y-0'>
        <CardTitle className='text-lg font-medium'>
          {t('historyDetail.compareTitle')}
        </CardTitle>
        <div className='w-[200px]'>
          <Select
            value={compareId || ''}
            onValueChange={value => onCompareIdChange(value || null)}
          >
            <SelectTrigger className='h-8 text-xs'>
              <SelectValue placeholder={t('historyDetail.comparePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {compareOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!compareId ? (
          <div className='text-center py-8 text-muted-foreground text-sm'>
            {t('historyDetail.compareEmpty')}
          </div>
        ) : compareLoading ? (
          <div className='flex justify-center py-8'>
            <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <div className='space-y-6'>
            {compareKeyMetrics.length > 0 && (
              <div className='space-y-3'>
                <h4 className='text-sm font-semibold text-muted-foreground'>
                  {t('historyDetail.compareTitle')}：关键指标变化
                </h4>
                <div className='rounded-md border divide-y'>
                  {compareKeyMetrics.map((row, idx) => {
                    if (row.type === 'text') {
                      return (
                        <div
                          key={idx}
                          className='p-3 flex items-center justify-between text-sm'
                        >
                          <span className='font-medium'>{row.label}</span>
                          <div className='flex gap-4 text-muted-foreground'>
                            <span>
                              {t('historyDetail.compareCurrent')}: {row.base}
                            </span>
                            <span>
                              {t('historyDetail.compareTarget')}: {row.target}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    const colorClass =
                      row.delta === null
                        ? ''
                        : row.improved
                          ? 'text-green-600 bg-green-50 border-green-200'
                          : row.regressed
                            ? 'text-red-600 bg-red-50 border-red-200'
                            : '';
                    const deltaText =
                      row.delta === null
                        ? '-'
                        : `${row.delta > 0 ? '↑' : row.delta < 0 ? '↓' : ''}${Math.abs(row.delta).toFixed(2)}`;
                    return (
                      <div
                        key={idx}
                        className='p-3 flex items-center justify-between text-sm'
                      >
                        <span className='font-medium'>{row.label}</span>
                        <div className='flex items-center gap-4'>
                          <span className='text-muted-foreground text-xs'>
                            {t('historyDetail.compareCurrent')}:{' '}
                            {row.base === null ? '-' : row.base.toFixed(2)}
                          </span>
                          <span className='text-muted-foreground text-xs'>
                            {t('historyDetail.compareTarget')}:{' '}
                            {row.target === null ? '-' : row.target.toFixed(2)}
                          </span>
                          <Badge
                            variant='outline'
                            className={cn('font-mono', colorClass)}
                          >
                            Δ {deltaText}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompareTabContent;
