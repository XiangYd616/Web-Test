/**
 * 分数圆环组件 — Lighthouse 风格的圆形分数仪表盘
 *
 * 颜色分级：绿（80+）、橙（50-79）、红（<50）
 * 支持 showMax 显示 "88/100" 格式
 */

type Props = {
  score: number; // 0-100
  size?: number; // 直径 px
  strokeWidth?: number;
  label?: string;
  showMax?: boolean; // 显示 /100
  glow?: boolean; // 外发光
  className?: string;
};

const getColor = (score: number) => {
  if (score >= 80) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
};

const getGlowColor = (score: number) => {
  if (score >= 80) return 'rgba(34,197,94,0.25)';
  if (score >= 50) return 'rgba(245,158,11,0.2)';
  return 'rgba(239,68,68,0.2)';
};

const ScoreRing = ({
  score,
  size = 64,
  strokeWidth = 5,
  label,
  showMax,
  glow,
  className,
}: Props) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(score, 0), 100);
  const offset = circumference * (1 - clamped / 100);
  const color = getColor(clamped);
  const filterId = `glow-${size}`;

  return (
    <div
      className={`tw-score-ring ${className || ''}`}
      style={{
        width: size,
        height: size,
        filter: glow ? `drop-shadow(0 0 8px ${getGlowColor(clamped)})` : undefined,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {glow && (
          <defs>
            <filter id={filterId} x='-20%' y='-20%' width='140%' height='140%'>
              <feGaussianBlur in='SourceGraphic' stdDeviation='2' />
            </filter>
          </defs>
        )}
        {/* 背景轨道 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill='none'
          stroke='rgba(255,255,255,0.06)'
          strokeWidth={strokeWidth}
        />
        {/* 分数弧 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill='none'
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap='round'
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className='tw-score-ring-arc'
        />
      </svg>
      <div className='tw-score-ring-value' style={{ color }}>
        <span className='tw-score-ring-num'>{Math.round(clamped)}</span>
        {showMax && <span className='tw-score-ring-max'>/100</span>}
      </div>
      {label && <div className='tw-score-ring-label'>{label}</div>}
    </div>
  );
};

export default ScoreRing;
