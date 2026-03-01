import { cn } from '@/lib/utils';

const Bone = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-md bg-muted', className)} />
);

/** 通用卡片骨架 */
export const CardSkeleton = ({ className }: { className?: string }) => (
  <div className={cn('rounded-xl border bg-card p-5 space-y-3', className)}>
    <Bone className='h-4 w-1/3' />
    <Bone className='h-3 w-2/3' />
    <Bone className='h-3 w-1/2' />
  </div>
);

/** 表格行骨架 */
export const TableRowSkeleton = ({ cols = 5 }: { cols?: number }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className='px-4 py-3'>
        <Bone className='h-3 w-full' />
      </td>
    ))}
  </tr>
);

/** 页面级骨架：标题 + 若干卡片 */
export const PageSkeleton = ({ cards = 3, className }: { cards?: number; className?: string }) => (
  <div className={cn('space-y-4 p-4', className)}>
    <div className='space-y-2'>
      <Bone className='h-6 w-48' />
      <Bone className='h-3 w-64' />
    </div>
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
      {Array.from({ length: cards }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  </div>
);

/** 列表骨架 */
export const ListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className='space-y-2 p-4'>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className='flex items-center gap-3'>
        <Bone className='h-8 w-8 rounded-lg flex-shrink-0' />
        <div className='flex-1 space-y-1.5'>
          <Bone className='h-3 w-2/5' />
          <Bone className='h-2.5 w-3/5' />
        </div>
      </div>
    ))}
  </div>
);

export default PageSkeleton;
