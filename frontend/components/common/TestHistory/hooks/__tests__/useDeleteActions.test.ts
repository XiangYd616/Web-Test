/**
 * useDeleteActions Hook - Unit Tests
 *
 * Tests for the useDeleteActions custom hook that manages delete operations
 * for the TestHistory component.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TestRecord } from '../../types';
import { useDeleteActions } from '../useDeleteActions';

// Mock the Toast module
vi.mock('../../../../common/Toast', () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

import { showToast } from '../../../../common/Toast';

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

describe('useDeleteActions', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  const mockOnRecordsDeleted = vi.fn();
  const mockOnSelectionCleared = vi.fn();

  const defaultProps = {
    records: [createMockRecord('1'), createMockRecord('2'), createMockRecord('3')],
    selectedRecords: new Set<string>(),
    onRecordsDeleted: mockOnRecordsDeleted,
    onSelectionCleared: mockOnSelectionCleared,
  };

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    vi.clearAllMocks();

    // Mock localStorage.getItem directly on the window object
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
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with closed dialog', () => {
      const { result } = renderHook(() => useDeleteActions(defaultProps));

      expect(result.current.deleteDialog.isOpen).toBe(false);
      expect(result.current.deleteDialog.type).toBe('single');
      expect(result.current.deleteDialog.isLoading).toBe(false);
    });

    it('should provide all required functions', () => {
      const { result } = renderHook(() => useDeleteActions(defaultProps));

      expect(typeof result.current.openDeleteDialog).toBe('function');
      expect(typeof result.current.openBatchDeleteDialog).toBe('function');
      expect(typeof result.current.closeDeleteDialog).toBe('function');
      expect(typeof result.current.confirmDelete).toBe('function');
    });
  });

  describe('openDeleteDialog', () => {
    it('should open dialog for single record', () => {
      const { result } = renderHook(() => useDeleteActions(defaultProps));

      act(() => {
        result.current.openDeleteDialog('1');
      });

      expect(result.current.deleteDialog.isOpen).toBe(true);
      expect(result.current.deleteDialog.type).toBe('single');
      expect(result.current.deleteDialog.recordId).toBe('1');
      expect(result.current.deleteDialog.recordName).toBe('Test 1');
    });

    it('should use default name for non-existent record', () => {
      const { result } = renderHook(() => useDeleteActions(defaultProps));

      act(() => {
        result.current.openDeleteDialog('999');
      });

      expect(result.current.deleteDialog.recordId).toBe('999');
      expect(result.current.deleteDialog.recordName).toBe('测试记录');
    });

    it('should handle multiple opens', () => {
      const { result } = renderHook(() => useDeleteActions(defaultProps));

      act(() => {
        result.current.openDeleteDialog('1');
      });
      expect(result.current.deleteDialog.recordId).toBe('1');

      act(() => {
        result.current.openDeleteDialog('2');
      });
      expect(result.current.deleteDialog.recordId).toBe('2');
    });
  });

  describe('openBatchDeleteDialog', () => {
    it('should open dialog for batch delete when records selected', () => {
      const propsWithSelection = {
        ...defaultProps,
        selectedRecords: new Set(['1', '2']),
      };
      const { result } = renderHook(() => useDeleteActions(propsWithSelection));

      act(() => {
        result.current.openBatchDeleteDialog();
      });

      expect(result.current.deleteDialog.isOpen).toBe(true);
      expect(result.current.deleteDialog.type).toBe('batch');
      expect(result.current.deleteDialog.recordNames).toEqual(['Test 1', 'Test 2']);
    });

    it('should show error when no records selected', () => {
      const { result } = renderHook(() => useDeleteActions(defaultProps));

      act(() => {
        result.current.openBatchDeleteDialog();
      });

      expect(showToast.error).toHaveBeenCalledWith('请先选择要删除的记录');
      expect(result.current.deleteDialog.isOpen).toBe(false);
    });
  });

  describe('closeDeleteDialog', () => {
    it('should close the dialog', () => {
      const { result } = renderHook(() => useDeleteActions(defaultProps));

      act(() => {
        result.current.openDeleteDialog('1');
      });
      expect(result.current.deleteDialog.isOpen).toBe(true);

      act(() => {
        result.current.closeDeleteDialog();
      });
      expect(result.current.deleteDialog.isOpen).toBe(false);
    });

    it('should be idempotent', () => {
      const { result } = renderHook(() => useDeleteActions(defaultProps));

      act(() => {
        result.current.closeDeleteDialog();
        result.current.closeDeleteDialog();
      });

      expect(result.current.deleteDialog.isOpen).toBe(false);
    });
  });

  describe('confirmDelete - Single Record', () => {
    it('should delete single record successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useDeleteActions(defaultProps));

      act(() => {
        result.current.openDeleteDialog('1');
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test/history/1',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        })
      );
      expect(showToast.success).toHaveBeenCalledWith('"Test 1" 已成功删除');
      expect(mockOnRecordsDeleted).toHaveBeenCalledWith(['1']);
      expect(result.current.deleteDialog.isOpen).toBe(false);
    });

    it('should handle 404 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useDeleteActions(defaultProps));

      act(() => {
        result.current.openDeleteDialog('1');
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(showToast.error).toHaveBeenCalledWith(
        expect.stringContaining('测试记录不存在或已被删除')
      );
    });

    it('should handle 403 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useDeleteActions(defaultProps));

      act(() => {
        result.current.openDeleteDialog('1');
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(showToast.error).toHaveBeenCalledWith(expect.stringContaining('没有权限删除此记录'));
    });

    it('should handle 429 rate limit error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useDeleteActions(defaultProps));

      act(() => {
        result.current.openDeleteDialog('1');
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(showToast.error).toHaveBeenCalledWith(expect.stringContaining('请求过于频繁'));
    });

    it('should handle server error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, message: 'Server error' }),
      });

      const { result } = renderHook(() => useDeleteActions(defaultProps));

      act(() => {
        result.current.openDeleteDialog('1');
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(showToast.error).toHaveBeenCalledWith(expect.stringContaining('Server error'));
    });
  });

  describe('confirmDelete - Batch Delete', () => {
    it('should delete multiple records successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { deletedCount: 2 } }),
      });

      const propsWithSelection = {
        ...defaultProps,
        selectedRecords: new Set(['1', '2']),
      };
      const { result } = renderHook(() => useDeleteActions(propsWithSelection));

      act(() => {
        result.current.openBatchDeleteDialog();
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test/batch-delete',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ids: ['1', '2'] }),
        })
      );
      expect(showToast.success).toHaveBeenCalledWith('成功删除 2 条记录');
      expect(mockOnRecordsDeleted).toHaveBeenCalledWith(['1', '2']);
      expect(mockOnSelectionCleared).toHaveBeenCalled();
    });

    it('should handle batch delete with default count', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      const propsWithSelection = {
        ...defaultProps,
        selectedRecords: new Set(['1', '2', '3']),
      };
      const { result } = renderHook(() => useDeleteActions(propsWithSelection));

      act(() => {
        result.current.openBatchDeleteDialog();
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(showToast.success).toHaveBeenCalledWith('成功删除 3 条记录');
    });

    it('should handle batch delete failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: 'Batch delete failed' }),
      });

      const propsWithSelection = {
        ...defaultProps,
        selectedRecords: new Set(['1', '2']),
      };
      const { result } = renderHook(() => useDeleteActions(propsWithSelection));

      act(() => {
        result.current.openBatchDeleteDialog();
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(showToast.error).toHaveBeenCalledWith(expect.stringContaining('Batch delete failed'));
    });
  });

  describe('Loading State', () => {
    it('should set loading state during delete operation', async () => {
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>(resolve => {
        resolveDelete = resolve;
      });

      mockFetch.mockReturnValueOnce(
        deletePromise.then(() => ({
          ok: true,
          json: async () => ({ success: true }),
        }))
      );

      const { result } = renderHook(() => useDeleteActions(defaultProps));

      act(() => {
        result.current.openDeleteDialog('1');
      });

      // Start delete
      act(() => {
        result.current.confirmDelete();
      });

      // Should be loading
      await waitFor(() => {
        expect(result.current.deleteDialog.isLoading).toBe(true);
      });

      // Complete delete
      await act(async () => {
        resolveDelete!();
        await deletePromise;
      });

      // Loading should be false
      await waitFor(() => {
        expect(result.current.deleteDialog.isLoading).toBe(false);
      });
    });

    it('should clear loading state even on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useDeleteActions(defaultProps));

      act(() => {
        result.current.openDeleteDialog('1');
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(result.current.deleteDialog.isLoading).toBe(false);
    });
  });

  describe('Authorization', () => {
    it('should include auth token when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useDeleteActions(defaultProps));

      act(() => {
        result.current.openDeleteDialog('1');
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should work without auth token', async () => {
      // Override localStorage to return null for auth_token
      const localStorageMock = {
        getItem: vi.fn(() => null),
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useDeleteActions(defaultProps));

      act(() => {
        result.current.openDeleteDialog('1');
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers).not.toHaveProperty('Authorization');
    });
  });

  describe('Edge Cases', () => {
    it('should do nothing when confirmDelete called with closed dialog', async () => {
      const { result } = renderHook(() => useDeleteActions(defaultProps));

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useDeleteActions(defaultProps));

      act(() => {
        result.current.openDeleteDialog('1');
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(showToast.error).toHaveBeenCalledWith(expect.stringContaining('Network error'));
    });
  });
});
