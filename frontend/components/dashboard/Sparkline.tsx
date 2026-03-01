/**
 * Sparkline 迷你折线图 — 极简 SVG 折线，无坐标轴
 * 用于展示过去 N 次测试的分数/时长趋势
 */

type Props = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  className?: string;
};

const Sparkline = ({
  data,
  width = 96,
  height = 32,
  color = '#f97316',
  fillOpacity = 0.1,
  className,
}: Props) => {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pad = 2;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return { x, y };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');

  // 闭合填充区域
  const fillPath = [
    `M ${points[0].x},${height}`,
    `L ${points.map(p => `${p.x},${p.y}`).join(' L ')}`,
    `L ${points[points.length - 1].x},${height}`,
    'Z',
  ].join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ display: 'block' }}
    >
      {/* 填充区域 */}
      <path d={fillPath} fill={color} opacity={fillOpacity} />
      {/* 折线 */}
      <polyline
        points={polyline}
        fill='none'
        stroke={color}
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      {/* 末端点 */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r='2.5'
        fill={color}
      />
    </svg>
  );
};

export default Sparkline;
