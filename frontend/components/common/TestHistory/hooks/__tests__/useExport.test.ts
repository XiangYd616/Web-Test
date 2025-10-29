/**
 * useExport Hook - Unit Tests
 * 
 * Tests for the useExport custom hook that manages export modal
 * and export operations for the TestHistory component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExport } from '../useExport';
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

// Mock ExportUtils
const mockExportByType = vi.fn();
const mockExportUtils = {
  exportByType: mockExportByType,
};

describe('useExport', () => {
  beforeEach(() => {
    mockExportByType.mockClear();
    mockExportByType.mockResolvedValue(undefined);
  });

  describe('Initial State', () => {
    it('should initialize with closed modal', () => {
      const { result } = renderHook(() => useExport());

      expect(result.current.isExportModalOpen).toBe(false);
      expect(result.current.selectedExportRecord).toBeNull();
    });

    it('should provide all required functions', () => {
      const { result } = renderHook(() => useExport());

      expect(typeof result.current.openExportModal).toBe('function');
      expect(typeof result.current.closeExportModal).toBe('function');
      expect(typeof result.current.handleExport).toBe('function');
    });
  });

  describe('openExportModal', () => {
    it('should open modal and set selected record', () => {
      const { result } = renderHook(() => useExport());
      const record = createMockRecord('1');

      act(() => {
        result.current.openExportModal(record);
      });

      expect(result.current.isExportModalOpen).toBe(true);
      expect(result.current.selectedExportRecord).toEqual(record);
    });

    it('should handle multiple records', () => {
      const { result } = renderHook(() => useExport());
      const record1 = createMockRecord('1');
      const record2 = createMockRecord('2');

      act(() => {
        result.current.openExportModal(record1);
      });
      expect(result.current.selectedExportRecord?.id).toBe('1');

      act(() => {
        result.current.openExportModal(record2);
      });
      expect(result.current.selectedExportRecord?.id).toBe('2');
    });
  });

  describe('closeExportModal', () => {
    it('should close modal and clear selected record', () => {
      const { result } = renderHook(() => useExport());
      const record = createMockRecord('1');

      act(() => {
        result.current.openExportModal(record);
      });
      expect(result.current.isExportModalOpen).toBe(true);

      act(() => {
        result.current.closeExportModal();
      });

      expect(result.current.isExportModalOpen).toBe(false);
      expect(result.current.selectedExportRecord).toBeNull();
    });

    it('should be idempotent', () => {
      const { result } = renderHook(() => useExport());

      act(() => {
        result.current.closeExportModal();
        result.current.closeExportModal();
      });

      expect(result.current.isExportModalOpen).toBe(false);
      expect(result.current.selectedExportRecord).toBeNull();
    });
  });

  describe('handleExport', () => {
    it('should call exportByType with correct parameters', async () => {
      const { result } = renderHook(() => useExport());
      const exportType = 'json';
      const data = { test: 'data' };

      await act(async () => {
        await result.current.handleExport(exportType, data, mockExportUtils as any);
      });

      expect(mockExportByType).toHaveBeenCalledWith(exportType, data);
      expect(mockExportByType).toHaveBeenCalledTimes(1);
    });

    it('should close modal after successful export', async () => {
      const { result } = renderHook(() => useExport());
      const record = createMockRecord('1');

      act(() => {
        result.current.openExportModal(record);
      });
      expect(result.current.isExportModalOpen).toBe(true);

      await act(async () => {
        await result.current.handleExport('json', {}, mockExportUtils as any);
      });

      expect(result.current.isExportModalOpen).toBe(false);
      expect(result.current.selectedExportRecord).toBeNull();
    });

    it('should handle different export types', async () => {
      const { result } = renderHook(() => useExport());
      const data = { test: 'data' };
      const types = ['json', 'csv', 'xlsx', 'pdf'];

      for (const type of types) {
        await act(async () => {
          await result.current.handleExport(type, data, mockExportUtils as any);
        });
      }

      expect(mockExportByType).toHaveBeenCalledTimes(types.length);
    });

    it('should throw error when export fails', async () => {
      const { result } = renderHook(() => useExport());
      const exportError = new Error('Export failed');
      mockExportByType.mockRejectedValueOnce(exportError);

      await expect(async () => {
        await act(async () => {
          await result.current.handleExport('json', {}, mockExportUtils as any);
        });
      }).rejects.toThrow('Export failed');
    });

    it('should not close modal when export fails', async () => {
      const { result } = renderHook(() => useExport());
      const record = createMockRecord('1');
      mockExportByType.mockRejectedValueOnce(new Error('Export failed'));

      act(() => {
        result.current.openExportModal(record);
      });
      expect(result.current.isExportModalOpen).toBe(true);

      try {
        await act(async () => {
          await result.current.handleExport('json', {}, mockExportUtils as any);
        });
      } catch (error) {
        // Expected error
      }

      expect(result.current.isExportModalOpen).toBe(true);
      expect(result.current.selectedExportRecord).not.toBeNull();
    });
  });

  describe('Modal Workflow', () => {
    it('should support complete export workflow', async () => {
      const { result } = renderHook(() => useExport());
      const record = createMockRecord('1');

      // Open modal
      act(() => {
        result.current.openExportModal(record);
      });
      expect(result.current.isExportModalOpen).toBe(true);
      expect(result.current.selectedExportRecord?.id).toBe('1');

      // Export
      await act(async () => {
        await result.current.handleExport('json', { data: 'test' }, mockExportUtils as any);
      });

      // Modal should be closed after export
      expect(result.current.isExportModalOpen).toBe(false);
      expect(result.current.selectedExportRecord).toBeNull();
    });

    it('should allow cancellation without export', () => {
      const { result } = renderHook(() => useExport());
      const record = createMockRecord('1');

      act(() => {
        result.current.openExportModal(record);
      });

      act(() => {
        result.current.closeExportModal();
      });

      expect(mockExportByType).not.toHaveBeenCalled();
      expect(result.current.isExportModalOpen).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data', async () => {
      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.handleExport('json', {}, mockExportUtils as any);
      });

      expect(mockExportByType).toHaveBeenCalledWith('json', {});
    });

    it('should handle null export type', async () => {
      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.handleExport('', { data: 'test' }, mockExportUtils as any);
      });

      expect(mockExportByType).toHaveBeenCalledWith('', { data: 'test' });
    });
  });

  describe('State Persistence', () => {
    it('should maintain state across re-renders', () => {
      const { result, rerender } = renderHook(() => useExport());
      const record = createMockRecord('1');

      act(() => {
        result.current.openExportModal(record);
      });

      rerender();

      expect(result.current.isExportModalOpen).toBe(true);
      expect(result.current.selectedExportRecord?.id).toBe('1');
    });
  });
});


