import { cn } from '@/lib/utils';

const ScoreBadge = ({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) => {
  const color =
    score >= 80
      ? 'bg-green-500/10 text-green-600 border-green-500/20'
      : score >= 50
        ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
        : 'bg-red-500/10 text-red-600 border-red-500/20';
  const sizeClass =
    size === 'lg'
      ? 'text-3xl px-4 py-2'
      : size === 'md'
        ? 'text-lg px-3 py-1'
        : 'text-sm px-2 py-0.5';
  return (
    <span className={cn('font-bold rounded-md border inline-block', color, sizeClass)}>
      {score}
    </span>
  );
};

export default ScoreBadge;
