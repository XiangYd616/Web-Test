import { cn } from '@/lib/utils';
import * as React from 'react';

interface StatisticProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'prefix'> {
  title: React.ReactNode;
  value: React.ReactNode;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  precision?: number;
}

const Statistic = React.forwardRef<HTMLDivElement, StatisticProps>(
  ({ className, title, value, prefix, suffix, precision, ...props }, ref) => {
    const formattedValue = React.useMemo(() => {
      if (typeof value === 'number' && precision !== undefined) {
        return value.toFixed(precision);
      }
      return value;
    }, [value, precision]);

    return (
      <div ref={ref} className={cn('flex flex-col space-y-1', className)} {...props}>
        <div className='text-xs font-medium text-muted-foreground tracking-wide uppercase'>
          {title}
        </div>
        <div className='flex items-baseline space-x-1 text-2xl font-bold tabular-nums tracking-tight'>
          {prefix && <span className='text-sm text-muted-foreground'>{prefix}</span>}
          <span>{formattedValue}</span>
          {suffix && <span className='text-sm text-muted-foreground'>{suffix}</span>}
        </div>
      </div>
    );
  }
);
Statistic.displayName = 'Statistic';

export { Statistic };
