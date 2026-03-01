import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatRelativeTime } from './date';

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  it('should return "-" for undefined input', () => {
    expect(formatRelativeTime()).toBe('-');
    expect(formatRelativeTime(undefined)).toBe('-');
  });

  it('should return "-" for empty string', () => {
    expect(formatRelativeTime('')).toBe('-');
  });

  it('should return raw value for invalid date', () => {
    expect(formatRelativeTime('not-a-date')).toBe('not-a-date');
  });

  it('should show "刚刚" for dates within 60 seconds', () => {
    const recent = new Date(Date.now() - 30 * 1000).toISOString();
    const result = formatRelativeTime(recent);
    expect(result).toContain('刚刚');
  });

  it('should show minutes for dates within 1 hour', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const result = formatRelativeTime(tenMinAgo);
    expect(result).toContain('分钟');
  });

  it('should show hours for dates within 24 hours', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(threeHoursAgo);
    expect(result).toContain('小时');
  });

  it('should show days for dates older than 24 hours', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(twoDaysAgo);
    expect(result).toContain('天');
  });

  it('should include absolute date after separator', () => {
    const recent = new Date(Date.now() - 30 * 1000).toISOString();
    const result = formatRelativeTime(recent);
    expect(result).toContain('·');
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
