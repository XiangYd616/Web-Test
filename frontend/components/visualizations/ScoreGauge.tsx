import { useMemo } from 'react';

interface ScoreGaugeProps {
  score: number;
  size?: number;
  label?: string;
  showGrade?: boolean;
}

const GRADE_MAP = [
  { min: 90, grade: 'A+', color: '#10b981' },
  { min: 80, grade: 'A', color: '#34d399' },
  { min: 70, grade: 'B', color: '#3b82f6' },
  { min: 60, grade: 'C', color: '#f59e0b' },
  { min: 40, grade: 'D', color: '#f97316' },
  { min: 0, grade: 'F', color: '#ef4444' },
];

const ScoreGauge = ({ score, size = 140, label, showGrade = true }: ScoreGaugeProps) => {
  const { grade, color, dashOffset } = useMemo(() => {
    const clamped = Math.max(0, Math.min(100, score));
    const entry = GRADE_MAP.find(g => clamped >= g.min) ?? GRADE_MAP[GRADE_MAP.length - 1];
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const arc = circumference * 0.75;
    const offset = arc - (arc * clamped) / 100;
    return { grade: entry.grade, color: entry.color, dashOffset: offset, arc, circumference };
  }, [score]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * 0.75;

  return (
    <div className='tw-score-gauge' style={{ width: size, height: size }}>
      <svg viewBox='0 0 120 120' className='tw-score-gauge-svg'>
        {/* 背景弧线 */}
        <circle
          cx='60'
          cy='60'
          r={radius}
          fill='none'
          stroke='currentColor'
          strokeWidth='8'
          strokeLinecap='round'
          strokeDasharray={`${arc} ${circumference}`}
          strokeDashoffset='0'
          transform='rotate(135 60 60)'
          className='tw-gauge-bg'
        />
        {/* 前景弧线 */}
        <circle
          cx='60'
          cy='60'
          r={radius}
          fill='none'
          stroke={color}
          strokeWidth='8'
          strokeLinecap='round'
          strokeDasharray={`${arc} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform='rotate(135 60 60)'
          className='tw-gauge-fg'
        />
      </svg>
      <div className='tw-score-gauge-center'>
        <span className='tw-score-gauge-value' style={{ color }}>
          {Math.round(score)}
        </span>
        {showGrade && <span className='tw-score-gauge-grade'>{grade}</span>}
        {label && <span className='tw-score-gauge-label'>{label}</span>}
      </div>
    </div>
  );
};

export default ScoreGauge;
