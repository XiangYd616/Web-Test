import { describe, expect, it } from 'vitest';

import {
  hasTemplateVars,
  resolveTemplateVarsForValidation,
  validateUrlWithTemplateVars,
} from './url';

const MESSAGES = {
  invalidProtocol: 'Must start with http:// or https://',
  invalidDomain: 'Invalid domain',
  invalid: 'Invalid URL',
};

describe('hasTemplateVars', () => {
  it('should return true for strings containing {{...}}', () => {
    expect(hasTemplateVars('{{baseUrl}}/api')).toBe(true);
    expect(hasTemplateVars('https://{{host}}/path')).toBe(true);
    expect(hasTemplateVars('{{ spaced }}')).toBe(true);
  });

  it('should return false for strings without template vars', () => {
    expect(hasTemplateVars('https://example.com')).toBe(false);
    expect(hasTemplateVars('')).toBe(false);
    expect(hasTemplateVars('{notTemplate}')).toBe(false);
  });
});

describe('resolveTemplateVarsForValidation', () => {
  it('should return trimmed URL when no template vars', () => {
    expect(resolveTemplateVarsForValidation('  https://example.com  ')).toBe('https://example.com');
  });

  it('should replace {{baseUrl}} at start with https:// prefix', () => {
    const result = resolveTemplateVarsForValidation('{{baseUrl}}/api/v1');
    expect(result).toMatch(/^https?:\/\//);
    expect(result).toContain('/api/v1');
  });

  it('should replace {{path}} in middle of URL', () => {
    const result = resolveTemplateVarsForValidation('https://api.example.com/{{path}}');
    expect(result).toBe('https://api.example.com/placeholder');
  });

  it('should handle multiple template vars', () => {
    const result = resolveTemplateVarsForValidation('{{baseUrl}}/items/{{itemId}}');
    expect(result).toMatch(/^https?:\/\//);
    expect(result).toContain('/items/');
  });
});

describe('validateUrlWithTemplateVars', () => {
  it('should return valid for empty URL', () => {
    const result = validateUrlWithTemplateVars('', MESSAGES);
    expect(result.valid).toBe(true);
  });

  it('should return valid for standard URL', () => {
    const result = validateUrlWithTemplateVars('https://example.com', MESSAGES);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.hasVars).toBe(false);
  });

  it('should return valid for URL with template vars at start', () => {
    const result = validateUrlWithTemplateVars('{{baseUrl}}/api/v1/health', MESSAGES);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.hasVars).toBe(true);
  });

  it('should return valid for URL with template vars in path', () => {
    const result = validateUrlWithTemplateVars(
      'https://api.example.com/items/{{itemId}}',
      MESSAGES
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.hasVars).toBe(true);
  });

  it('should return valid for URL with multiple template vars', () => {
    const result = validateUrlWithTemplateVars('{{baseUrl}}/items/{{itemId}}', MESSAGES);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.hasVars).toBe(true);
  });

  it('should return invalid for non-http protocol', () => {
    const result = validateUrlWithTemplateVars('ftp://example.com', MESSAGES);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe(MESSAGES.invalidProtocol);
  });

  it('should return invalid for malformed URL without template vars', () => {
    const result = validateUrlWithTemplateVars('not-a-url', MESSAGES);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe(MESSAGES.invalid);
  });

  it('should return invalid for domain without dot (no template vars)', () => {
    const result = validateUrlWithTemplateVars('https://intranet/api', MESSAGES);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe(MESSAGES.invalidDomain);
  });

  it('should return valid for localhost', () => {
    const result = validateUrlWithTemplateVars('http://localhost:3000/api', MESSAGES);
    expect(result.valid).toBe(true);
  });
});
