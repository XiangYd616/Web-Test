import { useMemo } from 'react';

export interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface StatusPieChartProps {
  slices: PieSlice[];
  size?: number;
}

const StatusPieChart = ({ slices, size = 120 }: StatusPieChartProps) => {
  const total = useMemo(() => slices.reduce((s, i) => s + i.value, 0), [slices]);

  const segments = useMemo(() => {
    if (total === 0) return [];
    let cumulative = 0;
    return slices.map(slice => {
      const pct = (slice.value / total) * 100;
      const start = cumulative;
      cumulative += pct;
      return { ...slice, pct, start };
    });
  }, [slices, total]);

  if (!segments.length || total === 0) {
    return (
      <div className='tw-pie-empty' style={{ width: size, height: size }}>
        <span>No Data</span>
      </div>
    );
  }

  const r = 40;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * r;

  return (
    <div className='tw-pie-chart' style={{ width: size }}>
      <svg viewBox='0 0 100 100' className='tw-pie-svg'>
        {segments.map(seg => {
          const dashLen = (seg.pct / 100) * circumference;
          const dashGap = circumference - dashLen;
          const offset = -((seg.start / 100) * circumference);
          return (
            <circle
              key={seg.label}
              cx={cx}
              cy={cy}
              r={r}
              fill='none'
              stroke={seg.color}
              strokeWidth='20'
              strokeDasharray={`${dashLen} ${dashGap}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}
      </svg>
      <div className='tw-pie-legend'>
        {segments.map(seg => (
          <div key={seg.label} className='tw-pie-legend-item'>
            <span className='tw-pie-dot' style={{ background: seg.color }} />
            <span className='tw-pie-legend-label'>{seg.label}</span>
            <span className='tw-pie-legend-value'>{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatusPieChart;
