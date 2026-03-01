import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { TestPlanDimensionScore } from '../../services/testPlanApi';

import RadarChart from './RadarChart';

const makeDim = (
  type: string,
  name: string,
  score: number
): TestPlanDimensionScore => ({
  type: type as TestPlanDimensionScore['type'],
  name,
  score,
  status: score >= 80 ? 'passed' : score >= 50 ? 'warning' : 'failed',
  highlights: [],
});

describe('RadarChart', () => {
  it('returns null for empty dimensions', () => {
    const { container } = render(<RadarChart dimensions={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders bar chart for 1 dimension', () => {
    const dims = [makeDim('performance', '性能', 75)];
    const { container } = render(<RadarChart dimensions={dims} />);

    // Should NOT render SVG (bar chart fallback)
    expect(container.querySelector('svg')).toBeNull();
    // Should show dimension name and score
    expect(screen.getByText('性能')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('renders bar chart for 2 dimensions', () => {
    const dims = [
      makeDim('performance', '性能', 90),
      makeDim('security', '安全', 60),
    ];
    const { container } = render(<RadarChart dimensions={dims} />);

    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByText('性能')).toBeInTheDocument();
    expect(screen.getByText('安全')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('applies green bar color for score >= 80', () => {
    const dims = [makeDim('performance', '性能', 85)];
    const { container } = render(<RadarChart dimensions={dims} />);

    const bar = container.querySelector('.bg-green-500');
    expect(bar).not.toBeNull();
  });

  it('applies yellow bar color for score >= 50 and < 80', () => {
    const dims = [makeDim('performance', '性能', 65)];
    const { container } = render(<RadarChart dimensions={dims} />);

    const bar = container.querySelector('.bg-yellow-500');
    expect(bar).not.toBeNull();
  });

  it('applies red bar color for score < 50', () => {
    const dims = [makeDim('performance', '性能', 30)];
    const { container } = render(<RadarChart dimensions={dims} />);

    const bar = container.querySelector('.bg-red-500');
    expect(bar).not.toBeNull();
  });

  it('renders SVG radar chart for 3+ dimensions', () => {
    const dims = [
      makeDim('performance', '性能', 80),
      makeDim('security', '安全', 70),
      makeDim('seo', 'SEO', 90),
    ];
    const { container } = render(<RadarChart dimensions={dims} />);

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 240 240');
  });

  it('renders dimension labels as text elements in SVG', () => {
    const dims = [
      makeDim('performance', '性能', 80),
      makeDim('security', '安全', 70),
      makeDim('seo', 'SEO', 90),
    ];
    render(<RadarChart dimensions={dims} />);

    expect(screen.getByText('性能')).toBeInTheDocument();
    expect(screen.getByText('安全')).toBeInTheDocument();
    expect(screen.getByText('SEO')).toBeInTheDocument();
  });

  it('renders 4 grid level polygons for 3+ dimensions', () => {
    const dims = [
      makeDim('performance', '性能', 80),
      makeDim('security', '安全', 70),
      makeDim('seo', 'SEO', 90),
    ];
    const { container } = render(<RadarChart dimensions={dims} />);

    // 4 grid polygons + 1 data polygon = 5 total
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBe(5);
  });

  it('renders axis lines equal to number of dimensions', () => {
    const dims = [
      makeDim('performance', '性能', 80),
      makeDim('security', '安全', 70),
      makeDim('seo', 'SEO', 90),
      makeDim('stress', '压力', 65),
    ];
    const { container } = render(<RadarChart dimensions={dims} />);

    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(4);
  });

  it('renders data polygon with correct fill', () => {
    const dims = [
      makeDim('performance', '性能', 80),
      makeDim('security', '安全', 70),
      makeDim('seo', 'SEO', 90),
    ];
    const { container } = render(<RadarChart dimensions={dims} />);

    const polygons = container.querySelectorAll('polygon');
    // Last polygon is the data polygon
    const dataPoly = polygons[polygons.length - 1];
    expect(dataPoly.getAttribute('fill')).toBe('hsl(var(--primary))');
    expect(dataPoly.getAttribute('stroke')).toBe('hsl(var(--primary))');
  });

  it('sets bar width based on score percentage', () => {
    const dims = [makeDim('performance', '性能', 42)];
    const { container } = render(<RadarChart dimensions={dims} />);

    const bar = container.querySelector('[style]');
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute('style')).toContain('width: 42%');
  });

  it('uses minimum 2% width for very low scores', () => {
    const dims = [makeDim('performance', '性能', 0)];
    const { container } = render(<RadarChart dimensions={dims} />);

    const bar = container.querySelector('[style]');
    expect(bar?.getAttribute('style')).toContain('width: 2%');
  });
});
