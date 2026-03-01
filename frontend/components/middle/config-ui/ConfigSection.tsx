import { ChevronDown, ChevronRight } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

interface ConfigSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const ConfigSection = ({
  title,
  children,
  defaultOpen = true,
  className,
}: ConfigSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('border rounded-lg overflow-hidden bg-card', className)}>
      <button
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        className='flex items-center w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-medium'
      >
        {isOpen ? (
          <ChevronDown className='h-4 w-4 mr-2 text-muted-foreground' />
        ) : (
          <ChevronRight className='h-4 w-4 mr-2 text-muted-foreground' />
        )}
        {title}
      </button>
      {isOpen && <div className='p-4 space-y-4 border-t'>{children}</div>}
    </div>
  );
};
