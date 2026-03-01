import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getLocalTestEngine, hasLocalTestEngine, isDesktop, isLocalMode } from './environment';

describe('environment utils', () => {
  beforeEach(() => {
    // 清理 electronAPI
    // @ts-expect-error test override
    delete window.electronAPI;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isDesktop', () => {
    it('should return false when electronAPI is not defined', () => {
      expect(isDesktop()).toBe(false);
    });

    it('should return true when electronAPI is defined', () => {
      // @ts-expect-error test override
      window.electronAPI = { testEngine: {} };
      expect(isDesktop()).toBe(true);
    });

    it('should return false when electronAPI is falsy', () => {
      // @ts-expect-error test override
      window.electronAPI = null;
      expect(isDesktop()).toBe(false);
    });
  });

  describe('isLocalMode', () => {
    it('should return a boolean', () => {
      const result = isLocalMode();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('hasLocalTestEngine', () => {
    it('should return false when not in desktop mode', () => {
      expect(hasLocalTestEngine()).toBe(false);
    });

    it('should return false when electronAPI exists but testEngine is missing', () => {
      // @ts-expect-error test override
      window.electronAPI = {};
      expect(hasLocalTestEngine()).toBe(false);
    });

    it('should return true when electronAPI.testEngine exists', () => {
      // @ts-expect-error test override
      window.electronAPI = { testEngine: { run: vi.fn() } };
      expect(hasLocalTestEngine()).toBe(true);
    });
  });

  describe('getLocalTestEngine', () => {
    it('should return null when not in desktop mode', () => {
      expect(getLocalTestEngine()).toBeNull();
    });

    it('should return testEngine when available', () => {
      const mockEngine = { run: vi.fn() };
      // @ts-expect-error test override
      window.electronAPI = { testEngine: mockEngine };
      expect(getLocalTestEngine()).toBe(mockEngine);
    });
  });
});
