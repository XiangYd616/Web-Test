import { describe, expect, it } from 'vitest';

import { parseResultPayload, parseResultPayloadText } from './testResult';

describe('parseResultPayloadText', () => {
  it('should return null for empty string', () => {
    expect(parseResultPayloadText('')).toBeNull();
    expect(parseResultPayloadText('   ')).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    expect(parseResultPayloadText('{invalid')).toBeNull();
  });

  it('should return null for non-object JSON', () => {
    expect(parseResultPayloadText('"hello"')).toBeNull();
    expect(parseResultPayloadText('42')).toBeNull();
    expect(parseResultPayloadText('null')).toBeNull();
  });

  it('should return null when no summary, metrics, or details', () => {
    expect(parseResultPayloadText(JSON.stringify({ schemaVersion: '1.0' }))).toBeNull();
  });

  it('should parse valid payload with summary', () => {
    const payload = {
      schemaVersion: '2.0',
      summary: { score: 85, totalIssues: 3 },
      metrics: [],
      warnings: ['warn1'],
      errors: [],
    };
    const result = parseResultPayloadText(JSON.stringify(payload));
    expect(result).not.toBeNull();
    expect(result!.schemaVersion).toBe('2.0');
    expect(result!.summary).toEqual({ score: 85, totalIssues: 3 });
    expect(result!.warnings).toEqual(['warn1']);
  });

  it('should parse valid payload with metrics only', () => {
    const payload = {
      metrics: [{ name: 'lcp', value: 2500 }],
    };
    const result = parseResultPayloadText(JSON.stringify(payload));
    expect(result).not.toBeNull();
    expect(result!.metrics).toHaveLength(1);
    expect(result!.schemaVersion).toBe('unknown');
  });

  it('should parse valid payload with details only', () => {
    const payload = {
      details: { results: { performance: {} } },
    };
    const result = parseResultPayloadText(JSON.stringify(payload));
    expect(result).not.toBeNull();
    expect(result!.details).toEqual({ results: { performance: {} } });
  });
});

describe('parseResultPayload', () => {
  it('should return null for non-object input', () => {
    expect(parseResultPayload(null)).toBeNull();
    expect(parseResultPayload(undefined)).toBeNull();
    expect(parseResultPayload('string')).toBeNull();
    expect(parseResultPayload(42)).toBeNull();
    expect(parseResultPayload([1, 2])).toBeNull();
  });

  it('should handle non-array metrics gracefully', () => {
    const result = parseResultPayload({ summary: { score: 50 }, metrics: 'invalid' });
    expect(result).not.toBeNull();
    expect(result!.metrics).toEqual([]);
  });

  it('should handle non-array warnings/errors gracefully', () => {
    const result = parseResultPayload({
      summary: { score: 50 },
      warnings: 'not-array',
      errors: null,
    });
    expect(result).not.toBeNull();
    expect(result!.warnings).toEqual([]);
    expect(result!.errors).toEqual([]);
  });

  it('should handle non-object summary gracefully', () => {
    const result = parseResultPayload({
      summary: 'invalid',
      details: { some: 'data' },
    });
    expect(result).not.toBeNull();
    expect(result!.summary).toBeNull();
  });
});
