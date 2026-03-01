import { useMemo } from 'react';

export interface WaterfallItem {
  label: string;
  value: number;
  color?: string;
}

interface WaterfallChartProps {
  items: WaterfallItem[];
  unit?: string;
  maxValue?: number;
}

const DEFAULT_COLORS = ['#ff6c37', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const WaterfallChart = ({ items, unit = 'ms', maxValue }: WaterfallChartProps) => {
  const max = useMemo(
    () => maxValue ?? Math.max(...items.map(i => i.value), 1),
    [items, maxValue]
  );

  if (!items.length) return null;

  return (
    <div className='tw-waterfall'>
      {items.map((item, idx) => {
        const pct = Math.min(100, (item.value / max) * 100);
        const barColor = item.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
        return (
          <div key={item.label} className='tw-waterfall-row'>
            <span className='tw-waterfall-label' title={item.label}>
              {item.label}
            </span>
            <div className='tw-waterfall-track'>
              <div
                className='tw-waterfall-bar'
                style={{ width: `${pct}%`, background: barColor }}
              />
            </div>
            <span className='tw-waterfall-value'>
              {item.value.toFixed(item.value < 10 ? 1 : 0)}
              {unit}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default WaterfallChart;
