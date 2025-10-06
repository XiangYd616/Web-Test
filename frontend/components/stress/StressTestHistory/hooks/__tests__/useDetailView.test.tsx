/**
 * useDetailView Hook - Unit Tests
 * 
 * Tests for the useDetailView custom hook that manages detail view
 * modal and navigation for the StressTestHistory component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useDetailView } from '../useDetailView';
import type { TestRecord } from '../../types';
import type { ReactNode } from 'react';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

// Wrapper component for hooks that need Router context
const wrapper = ({ children }: { children: ReactNode }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

describe('useDetailView', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('Initial State', () => {
    it('should initialize with closed modal', () => {
      const { result } = renderHook(() => useDetailView(), { wrapper });

      expect(result.current.isDetailModalOpen).toBe(false);
      expect(result.current.selectedDetailRecord).toBeNull();
    });

    it('should provide all required functions', () => {
      const { result } = renderHook(() => useDetailView(), { wrapper });

      expect(typeof result.current.openDetailModal).toBe('function');
      expect(typeof result.current.closeDetailModal).toBe('function');
      expect(typeof result.current.navigateToDetailPage).toBe('function');
    });
  });

  describe('openDetailModal', () => {
    it('should open modal and set selected record', () => {
      const { result } = renderHook(() => useDetailView(), { wrapper });
      const record = createMockRecord('1');

      act(() => {
        result.current.openDetailModal(record);
      });

      expect(result.current.isDetailModalOpen).toBe(true);
      expect(result.current.selectedDetailRecord).toEqual(record);
    });

    it('should handle multiple records', () => {
      const { result } = renderHook(() => useDetailView(), { wrapper });
      const record1 = createMockRecord('1');
      const record2 = createMockRecord('2');

      act(() => {
        result.current.openDetailModal(record1);
      });
      expect(result.current.selectedDetailRecord?.id).toBe('1');

      act(() => {
        result.current.openDetailModal(record2);
      });
      expect(result.current.selectedDetailRecord?.id).toBe('2');
    });

    it('should keep modal open when switching records', () => {
      const { result } = renderHook(() => useDetailView(), { wrapper });
      const record1 = createMockRecord('1');
      const record2 = createMockRecord('2');

      act(() => {
        result.current.openDetailModal(record1);
      });
      expect(result.current.isDetailModalOpen).toBe(true);

      act(() => {
        result.current.openDetailModal(record2);
      });
      expect(result.current.isDetailModalOpen).toBe(true);
    });
  });

  describe('closeDetailModal', () => {
    it('should close modal and clear selected record', () => {
      const { result } = renderHook(() => useDetailView(), { wrapper });
      const record = createMockRecord('1');

      // Open modal first
      act(() => {
        result.current.openDetailModal(record);
      });
      expect(result.current.isDetailModalOpen).toBe(true);
      expect(result.current.selectedDetailRecord).not.toBeNull();

      // Close modal
      act(() => {
        result.current.closeDetailModal();
      });
      expect(result.current.isDetailModalOpen).toBe(false);
      expect(result.current.selectedDetailRecord).toBeNull();
    });

    it('should be idempotent when called multiple times', () => {
      const { result } = renderHook(() => useDetailView(), { wrapper });

      act(() => {
        result.current.closeDetailModal();
        result.current.closeDetailModal();
      });

      expect(result.current.isDetailModalOpen).toBe(false);
      expect(result.current.selectedDetailRecord).toBeNull();
    });

    it('should work without opening modal first', () => {
      const { result } = renderHook(() => useDetailView(), { wrapper });

      act(() => {
        result.current.closeDetailModal();
      });

      expect(result.current.isDetailModalOpen).toBe(false);
      expect(result.current.selectedDetailRecord).toBeNull();
    });
  });

  describe('navigateToDetailPage', () => {
    it('should navigate to detail page with correct URL', () => {
      const { result } = renderHook(() => useDetailView(), { wrapper });
      const record = createMockRecord('test-123');

      act(() => {
        result.current.navigateToDetailPage(record);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/stress-test/test-123');
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('should not affect modal state', () => {
      const { result } = renderHook(() => useDetailView(), { wrapper });
      const record = createMockRecord('1');

      // Open modal
      act(() => {
        result.current.openDetailModal(record);
      });
      expect(result.current.isDetailModalOpen).toBe(true);

      // Navigate should not close modal
      act(() => {
        result.current.navigateToDetailPage(record);
      });
      expect(result.current.isDetailModalOpen).toBe(true);
      expect(result.current.selectedDetailRecord).toEqual(record);
    });

    it('should handle different record IDs', () => {
      const { result } = renderHook(() => useDetailView(), { wrapper });

      const ids = ['1', 'abc-123', 'test_456', '789-xyz'];
      
      ids.forEach((id) => {
        const record = createMockRecord(id);
        act(() => {
          result.current.navigateToDetailPage(record);
        });
        expect(mockNavigate).toHaveBeenCalledWith(`/stress-test/${id}`);
      });

      expect(mockNavigate).toHaveBeenCalledTimes(ids.length);
    });
  });

  describe('Modal Workflow', () => {
    it('should support open-close-open cycle', () => {
      const { result } = renderHook(() => useDetailView(), { wrapper });
      const record1 = createMockRecord('1');
      const record2 = createMockRecord('2');

      // First cycle
      act(() => {
        result.current.openDetailModal(record1);
      });
      expect(result.current.isDetailModalOpen).toBe(true);
      expect(result.current.selectedDetailRecord?.id).toBe('1');

      act(() => {
        result.current.closeDetailModal();
      });
      expect(result.current.isDetailModalOpen).toBe(false);

      // Second cycle
      act(() => {
        result.current.openDetailModal(record2);
      });
      expect(result.current.isDetailModalOpen).toBe(true);
      expect(result.current.selectedDetailRecord?.id).toBe('2');
    });

    it('should handle rapid open/close', () => {
      const { result } = renderHook(() => useDetailView(), { wrapper });
      const record = createMockRecord('1');

      act(() => {
        result.current.openDetailModal(record);
        result.current.closeDetailModal();
        result.current.openDetailModal(record);
        result.current.closeDetailModal();
      });

      expect(result.current.isDetailModalOpen).toBe(false);
      expect(result.current.selectedDetailRecord).toBeNull();
    });
  });

  describe('Navigation and Modal Independence', () => {
    it('should allow navigation without modal', () => {
      const { result } = renderHook(() => useDetailView(), { wrapper });
      const record = createMockRecord('1');

      act(() => {
        result.current.navigateToDetailPage(record);
      });

      expect(mockNavigate).toHaveBeenCalled();
      expect(result.current.isDetailModalOpen).toBe(false);
      expect(result.current.selectedDetailRecord).toBeNull();
    });

    it('should allow modal without navigation', () => {
      const { result } = renderHook(() => useDetailView(), { wrapper });
      const record = createMockRecord('1');

      act(() => {
        result.current.openDetailModal(record);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(result.current.isDetailModalOpen).toBe(true);
      expect(result.current.selectedDetailRecord).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle record with empty ID', () => {
      const { result } = renderHook(() => useDetailView(), { wrapper });
      const record = createMockRecord('');

      act(() => {
        result.current.openDetailModal(record);
      });

      expect(result.current.selectedDetailRecord?.id).toBe('');

      act(() => {
        result.current.navigateToDetailPage(record);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/stress-test/');
    });

    it('should handle record with special characters in ID', () => {
      const { result } = renderHook(() => useDetailView(), { wrapper });
      const specialId = 'test@#$%^&*()';
      const record = createMockRecord(specialId);

      act(() => {
        result.current.navigateToDetailPage(record);
      });

      expect(mockNavigate).toHaveBeenCalledWith(`/stress-test/${specialId}`);
    });
  });

  describe('State Persistence', () => {
    it('should maintain state across re-renders', () => {
      const { result, rerender } = renderHook(() => useDetailView(), { wrapper });
      const record = createMockRecord('1');

      act(() => {
        result.current.openDetailModal(record);
      });

      rerender();

      expect(result.current.isDetailModalOpen).toBe(true);
      expect(result.current.selectedDetailRecord?.id).toBe('1');
    });
  });
});

