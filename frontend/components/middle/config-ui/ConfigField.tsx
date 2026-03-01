import { Info } from 'lucide-react';
import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ConfigFieldProps {
  label: string;
  children: ReactNode;
  description?: string;
  className?: string;
  horizontal?: boolean; // For switches mainly
  error?: string;
}

export const ConfigField = ({
  label,
  children,
  description,
  className,
  horizontal = false,
  error,
}: ConfigFieldProps) => {
  return (
    <div
      className={cn(
        'relative',
        horizontal ? 'flex items-center justify-between gap-4' : 'space-y-1.5',
        className
      )}
    >
      <div className='flex items-center gap-2'>
        <Label className={cn(error ? 'text-destructive' : '')}>{label}</Label>
        {description && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help' />
            </TooltipTrigger>
            <TooltipContent>
              <p className='max-w-xs text-xs'>{description}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className={horizontal ? '' : 'w-full'}>{children}</div>
      {error && <p className='text-xs text-destructive mt-1'>{error}</p>}
    </div>
  );
};
