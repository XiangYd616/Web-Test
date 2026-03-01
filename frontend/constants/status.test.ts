import { describe, expect, it } from 'vitest';

import { TEST_STATUS_META, getTestStatusMeta } from './status';

describe('TEST_STATUS_META', () => {
  it('should have entries for all expected statuses', () => {
    const expectedStatuses = [
      'idle',
      'pending',
      'queued',
      'running',
      'completed',
      'failed',
      'cancelled',
      'stopped',
    ];
    for (const status of expectedStatuses) {
      expect(TEST_STATUS_META).toHaveProperty(status);
      expect(TEST_STATUS_META[status as keyof typeof TEST_STATUS_META]).toHaveProperty('label');
      expect(TEST_STATUS_META[status as keyof typeof TEST_STATUS_META]).toHaveProperty('color');
    }
  });

  it('should have non-empty label and color for each status', () => {
    for (const [, meta] of Object.entries(TEST_STATUS_META)) {
      expect(meta.label).toBeTruthy();
      expect(meta.color).toBeTruthy();
    }
  });
});

describe('getTestStatusMeta', () => {
  it('should return correct meta for known statuses', () => {
    const completed = getTestStatusMeta('completed');
    expect(completed.label).toBe('status.completed');
    expect(completed.color).toBe('#22c55e');
  });

  it('should return unknown meta for undefined status', () => {
    const result = getTestStatusMeta(undefined);
    expect(result.label).toBe('status.unknown');
    expect(result.color).toBe('default');
  });

  it('should return fallback for unrecognized status', () => {
    // @ts-expect-error testing unknown status
    const result = getTestStatusMeta('nonexistent');
    expect(result.label).toBe('nonexistent');
    expect(result.color).toBe('default');
  });

  it('should return running meta', () => {
    const result = getTestStatusMeta('running');
    expect(result.label).toBe('status.running');
    expect(result.color).toBe('#f59e0b');
  });

  it('should return failed meta', () => {
    const result = getTestStatusMeta('failed');
    expect(result.label).toBe('status.failed');
    expect(result.color).toBe('#ef4444');
  });
});
