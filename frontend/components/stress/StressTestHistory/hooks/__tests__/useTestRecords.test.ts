/**
 * useTestRecords Hook - Unit Tests
 * 
 * Tests for the useTestRecords custom hook that manages test records
 * loading and state for the StressTestHistory component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTestRecords } from '../useTestRecords';
import type { TestRecord } from '../../types';

// Helper function to create mock test record
const createMockRecord = (id: string): TestRecord => ({
  id,
  testName: `Test ${id}`,
  testType: 'stress',
  url: `https://example.com/test${id}`,
  status: 'completed',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  config: {},
});

describe('useTestRecords', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn((key: string) => {
        if (key === 'auth_token') return 'test-token';
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useTestRecords());

      expect(result.current.records).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.totalRecords).toBe(0);
      expect(result.current.currentPage).toBe(1);
    });

    it('should provide all required functions', () => {
      const { result } = renderHook(() => useTestRecords());

      expect(typeof result.current.loadTestRecords).toBe('function');
      expect(typeof result.current.setRecords).toBe('function');
      expect(typeof result.current.setTotalRecords).toBe('function');
      expect(typeof result.current.setCurrentPage).toBe('function');
    });
  });

  describe('loadTestRecords', () => {
    it('should load records successfully', async () => {
      const mockRecords = [createMockRecord('1'), createMockRecord('2')];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            tests: mockRecords,
            pagination: { total: 2, page: 1 },
          },
        }),
      });

      const { result } = renderHook(() => useTestRecords());

      await act(async () => {
        await result.current.loadTestRecords({ page: 1, pageSize: 10 });
      });

      expect(result.current.records).toEqual(mockRecords);
      expect(result.current.totalRecords).toBe(2);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.loading).toBe(false);
    });

    it('should include auth token in request headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { tests: [], pagination: {} },
        }),
      });

      const { result } = renderHook(() => useTestRecords());

      await act(async () => {
        await result.current.loadTestRecords({});
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test/history'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should build query parameters correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { tests: [], pagination: {} },
        }),
      });

      const { result } = renderHook(() => useTestRecords());

      await act(async () => {
        await result.current.loadTestRecords({
          page: 2,
          pageSize: 20,
          search: 'test search',
          status: 'running',
          dateFilter: 'today',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
      });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('type=stress');
      expect(callUrl).toContain('page=2');
      expect(callUrl).toContain('pageSize=20');
      expect(callUrl).toContain('search=test+search');
      expect(callUrl).toContain('status=running');
      expect(callUrl).toContain('dateFilter=today');
      expect(callUrl).toContain('sortBy=createdAt');
      expect(callUrl).toContain('sortOrder=desc');
    });

    it('should exclude "all" status filter from query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { tests: [], pagination: {} },
        }),
      });

      const { result } = renderHook(() => useTestRecords());

      await act(async () => {
        await result.current.loadTestRecords({
          status: 'all',
        });
      });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).not.toContain('status=');
    });

    it('should exclude "all" date filter from query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { tests: [], pagination: {} },
        }),
      });

      const { result } = renderHook(() => useTestRecords());

      await act(async () => {
        await result.current.loadTestRecords({
          dateFilter: 'all',
        });
      });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).not.toContain('dateFilter=');
    });
  });

  describe('Error Handling', () => {
    it('should handle 429 rate limit error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          get: (name: string) => (name === 'Retry-After' ? '60' : null),
        },
      });

      const { result } = renderHook(() => useTestRecords());

      await act(async () => {
        await result.current.loadTestRecords({});
      });

      expect(result.current.records).toEqual([]);
      expect(result.current.totalRecords).toBe(0);
      expect(result.current.loading).toBe(false);
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: { get: () => null },
      });

      const { result } = renderHook(() => useTestRecords());

      await act(async () => {
        await result.current.loadTestRecords({});
      });

      expect(result.current.records).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useTestRecords());

      await act(async () => {
        await result.current.loadTestRecords({});
      });

      expect(result.current.records).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it('should handle unsuccessful API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          message: 'Failed to fetch',
        }),
      });

      const { result } = renderHook(() => useTestRecords());

      await act(async () => {
        await result.current.loadTestRecords({});
      });

      expect(result.current.records).toEqual([]);
      expect(result.current.totalRecords).toBe(0);
    });
  });

  describe('Request Caching and Deduplication', () => {
    it('should not send duplicate requests with same parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { tests: [], pagination: {} },
        }),
      });

      const { result } = renderHook(() => useTestRecords());

      await act(async () => {
        await result.current.loadTestRecords({ page: 1 });
      });

      const firstCallCount = mockFetch.mock.calls.length;

      // Try to load with same params immediately
      await act(async () => {
        await result.current.loadTestRecords({ page: 1 });
      });

      expect(mockFetch).toHaveBeenCalledTimes(firstCallCount);
    });

    it('should wait for in-flight request with same params', async () => {
      let resolveRequest: () => void;
      const requestPromise = new Promise<void>((resolve) => {
        resolveRequest = resolve;
      });

      mockFetch.mockReturnValueOnce(
        requestPromise.then(() => ({
          ok: true,
          json: async () => ({
            success: true,
            data: { tests: [], pagination: {} },
          }),
        }))
      );

      const { result } = renderHook(() => useTestRecords());

      // Start first request
      act(() => {
        result.current.loadTestRecords({ page: 1 });
      });

      // Start second request with same params
      act(() => {
        result.current.loadTestRecords({ page: 1 });
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Resolve the request
      await act(async () => {
        resolveRequest!();
        await requestPromise;
      });
    });

    it('should send different requests for different parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { tests: [], pagination: {} },
        }),
      });

      const { result } = renderHook(() => useTestRecords());

      await act(async () => {
        await result.current.loadTestRecords({ page: 1 });
      });

      await act(async () => {
        await result.current.loadTestRecords({ page: 2 });
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should clean up cache after expiry', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { tests: [], pagination: {} },
        }),
      });

      const { result } = renderHook(() => useTestRecords());

      await act(async () => {
        await result.current.loadTestRecords({ page: 1 });
      });

      // Advance time by 35 seconds (past 30 second cache expiry)
      act(() => {
        vi.advanceTimersByTime(35000);
      });

      // Should make a new request since cache expired
      await act(async () => {
        await result.current.loadTestRecords({ page: 1 });
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should clear cache after 5 seconds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { tests: [], pagination: {} },
        }),
      });

      const { result } = renderHook(() => useTestRecords());

      await act(async () => {
        await result.current.loadTestRecords({ page: 1 });
      });

      // Advance time by 5 seconds
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Cache should be cleared, new request allowed
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { tests: [], pagination: {} },
        }),
      });

      await act(async () => {
        await result.current.loadTestRecords({ page: 1 });
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('State Setters', () => {
    it('should allow manual record updates via setRecords', () => {
      const { result } = renderHook(() => useTestRecords());
      const newRecords = [createMockRecord('1')];

      act(() => {
        result.current.setRecords(newRecords);
      });

      expect(result.current.records).toEqual(newRecords);
    });

    it('should allow manual total updates via setTotalRecords', () => {
      const { result } = renderHook(() => useTestRecords());

      act(() => {
        result.current.setTotalRecords(100);
      });

      expect(result.current.totalRecords).toBe(100);
    });

    it('should allow manual page updates via setCurrentPage', () => {
      const { result } = renderHook(() => useTestRecords());

      act(() => {
        result.current.setCurrentPage(5);
      });

      expect(result.current.currentPage).toBe(5);
    });
  });

  describe('Loading State', () => {
    it('should set loading to true during request', async () => {
      let resolveRequest: () => void;
      const requestPromise = new Promise<void>((resolve) => {
        resolveRequest = resolve;
      });

      mockFetch.mockReturnValueOnce(
        requestPromise.then(() => ({
          ok: true,
          json: async () => ({
            success: true,
            data: { tests: [], pagination: {} },
          }),
        }))
      );

      const { result } = renderHook(() => useTestRecords());

      // Initial loading state should be true
      expect(result.current.loading).toBe(true);

      // Start the request
      const loadPromise = act(async () => {
        await result.current.loadTestRecords({});
      });

      // Complete request
      resolveRequest!();
      await loadPromise;

      // Should not be loading after completion
      expect(result.current.loading).toBe(false);
    });

    it('should set loading to false after error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Error'));

      const { result } = renderHook(() => useTestRecords());

      await act(async () => {
        await result.current.loadTestRecords({});
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {},
        }),
      });

      const { result } = renderHook(() => useTestRecords());

      await act(async () => {
        await result.current.loadTestRecords({});
      });

      expect(result.current.records).toEqual([]);
      expect(result.current.totalRecords).toBe(0);
      expect(result.current.currentPage).toBe(1);
    });

    it('should handle missing pagination data', async () => {
      const mockRecords = [createMockRecord('1')];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            tests: mockRecords,
          },
        }),
      });

      const { result } = renderHook(() => useTestRecords());

      await act(async () => {
        await result.current.loadTestRecords({});
      });

      expect(result.current.records).toEqual(mockRecords);
      expect(result.current.totalRecords).toBe(0);
      expect(result.current.currentPage).toBe(1);
    });

    it('should handle undefined params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { tests: [], pagination: {} },
        }),
      });

      const { result } = renderHook(() => useTestRecords());

      await act(async () => {
        await result.current.loadTestRecords(undefined as any);
      });

      expect(result.current.loading).toBe(false);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should clear cache on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Error'));

      const { result } = renderHook(() => useTestRecords());

      await act(async () => {
        await result.current.loadTestRecords({ page: 1 });
      });

      // Should allow new request after error
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { tests: [], pagination: {} },
        }),
      });

      await act(async () => {
        await result.current.loadTestRecords({ page: 1 });
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

