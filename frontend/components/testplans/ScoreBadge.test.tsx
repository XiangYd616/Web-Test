import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ScoreBadge from './ScoreBadge';

describe('ScoreBadge', () => {
  it('renders score text', () => {
    render(<ScoreBadge score={85} />);
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('applies green color for score >= 80', () => {
    const { container } = render(<ScoreBadge score={90} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-green-600');
  });

  it('applies yellow color for score >= 50 and < 80', () => {
    const { container } = render(<ScoreBadge score={65} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-yellow-600');
  });

  it('applies red color for score < 50', () => {
    const { container } = render(<ScoreBadge score={30} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-red-600');
  });

  it('defaults to md size', () => {
    const { container } = render(<ScoreBadge score={50} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-lg');
  });

  it('applies sm size class', () => {
    const { container } = render(<ScoreBadge score={50} size='sm' />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-sm');
  });

  it('applies lg size class', () => {
    const { container } = render(<ScoreBadge score={50} size='lg' />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-3xl');
  });

  it('renders boundary value 80 as green', () => {
    const { container } = render(<ScoreBadge score={80} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-green-600');
  });

  it('renders boundary value 50 as yellow', () => {
    const { container } = render(<ScoreBadge score={50} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('text-yellow-600');
  });
});
