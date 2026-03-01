import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  className?: string;
}

const EmptyState = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  actionLabel,
  onAction,
  compact = false,
  className = '',
}: EmptyStateProps) => (
  <div
    className={`flex flex-col items-center justify-center text-center text-muted-foreground ${compact ? 'py-6 gap-1.5' : 'py-12 gap-3'} ${className}`}
  >
    <Icon className={`${compact ? 'h-6 w-6' : 'h-10 w-10'} opacity-25`} />
    <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
      <p className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>{title}</p>
      {description && (
        <p className={`${compact ? 'text-[11px]' : 'text-xs'} text-muted-foreground/70`}>
          {description}
        </p>
      )}
    </div>
    {action || (actionLabel && onAction) ? (
      <div className='mt-1'>
        {action ?? (
          <Button variant='outline' size='sm' onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    ) : null}
  </div>
);

export default EmptyState;
