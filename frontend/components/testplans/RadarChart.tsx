import { cn } from '@/lib/utils';
import type { TestPlanDimensionScore } from '../../services/testPlanApi';

const RadarChart = ({ dimensions }: { dimensions: TestPlanDimensionScore[] }) => {
  // 1-2 维度：用简易条形图替代雷达图
  if (dimensions.length < 3) {
    if (dimensions.length === 0) return null;
    return (
      <div className='space-y-3 w-full max-w-[280px] mx-auto'>
        {dimensions.map(d => (
          <div key={d.type} className='space-y-1'>
            <div className='flex justify-between text-xs'>
              <span className='text-muted-foreground'>{d.name}</span>
              <span className='font-medium'>{d.score}</span>
            </div>
            <div className='h-2 rounded-full bg-muted overflow-hidden'>
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  d.score >= 80 ? 'bg-green-500' : d.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${Math.max(d.score, 2)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }
  const cx = 120,
    cy = 120,
    r = 90;
  const n = dimensions.length;
  const angleStep = (2 * Math.PI) / n;

  const points = dimensions.map((d, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const ratio = d.score / 100;
    return { x: cx + r * ratio * Math.cos(angle), y: cy + r * ratio * Math.sin(angle) };
  });
  const polygon = points.map(p => `${p.x},${p.y}`).join(' ');

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox='0 0 240 240' className='w-full max-w-[280px] mx-auto'>
      {gridLevels.map(level => (
        <polygon
          key={level}
          points={dimensions
            .map((_, i) => {
              const angle = -Math.PI / 2 + i * angleStep;
              return `${cx + r * level * Math.cos(angle)},${cy + r * level * Math.sin(angle)}`;
            })
            .join(' ')}
          fill='none'
          stroke='currentColor'
          strokeOpacity={0.1}
          strokeWidth={1}
        />
      ))}
      {dimensions.map((_, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + r * Math.cos(angle)}
            y2={cy + r * Math.sin(angle)}
            stroke='currentColor'
            strokeOpacity={0.1}
            strokeWidth={1}
          />
        );
      })}
      <polygon
        points={polygon}
        fill='hsl(var(--primary))'
        fillOpacity={0.2}
        stroke='hsl(var(--primary))'
        strokeWidth={2}
      />
      {dimensions.map((d, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const lx = cx + (r + 18) * Math.cos(angle);
        const ly = cy + (r + 18) * Math.sin(angle);
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor='middle'
            dominantBaseline='middle'
            className='fill-muted-foreground text-[9px]'
          >
            {d.name}
          </text>
        );
      })}
    </svg>
  );
};

export default RadarChart;
