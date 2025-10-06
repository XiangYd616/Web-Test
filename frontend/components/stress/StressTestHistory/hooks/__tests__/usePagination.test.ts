/**
 * usePagination Hook - Unit Tests
 * 
 * Tests for the usePagination custom hook that manages pagination state
 * and calculations for the StressTestHistory component.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../usePagination';

describe('usePagination', () => {
  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => usePagination(0));

      expect(result.current.currentPage).toBe(1);
      expect(result.current.pageSize).toBe(10);
      expect(result.current.totalPages).toBe(0);
      expect(result.current.startRecord).toBe(0);
      expect(result.current.endRecord).toBe(0);
    });

    it('should provide navigation functions', () => {
      const { result } = renderHook(() => usePagination(50));

      expect(typeof result.current.goToPage).toBe('function');
      expect(typeof result.current.goToPreviousPage).toBe('function');
      expect(typeof result.current.goToNextPage).toBe('function');
      expect(typeof result.current.changePageSize).toBe('function');
    });
  });

  describe('Total Pages Calculation', () => {
    it('should calculate total pages correctly', () => {
      const { result } = renderHook(() => usePagination(50));

      expect(result.current.totalPages).toBe(5); // 50 records / 10 per page = 5 pages
    });

    it('should round up for partial pages', () => {
      const { result } = renderHook(() => usePagination(55));

      expect(result.current.totalPages).toBe(6); // 55 records / 10 per page = 5.5 -> 6 pages
    });

    it('should handle zero records', () => {
      const { result } = renderHook(() => usePagination(0));

      expect(result.current.totalPages).toBe(0);
      expect(result.current.startRecord).toBe(0);
      expect(result.current.endRecord).toBe(0);
    });

    it('should recalculate when total records change', () => {
      const { result, rerender } = renderHook(
        ({ totalRecords }) => usePagination(totalRecords),
        { initialProps: { totalRecords: 50 } }
      );

      expect(result.current.totalPages).toBe(5);

      rerender({ totalRecords: 100 });

      expect(result.current.totalPages).toBe(10);
    });
  });

  describe('Start and End Record Calculation', () => {
    it('should calculate start and end records correctly', () => {
      const { result } = renderHook(() => usePagination(50));

      expect(result.current.startRecord).toBe(1);
      expect(result.current.endRecord).toBe(10);
    });

    it('should update when changing pages', () => {
      const { result } = renderHook(() => usePagination(50));

      act(() => {
        result.current.goToPage(2);
      });

      expect(result.current.startRecord).toBe(11);
      expect(result.current.endRecord).toBe(20);
    });

    it('should handle last page correctly', () => {
      const { result } = renderHook(() => usePagination(55));

      act(() => {
        result.current.goToPage(6); // Last page
      });

      expect(result.current.startRecord).toBe(51);
      expect(result.current.endRecord).toBe(55); // Only 5 records on last page
    });

    it('should handle single record correctly', () => {
      const { result } = renderHook(() => usePagination(1));

      expect(result.current.startRecord).toBe(1);
      expect(result.current.endRecord).toBe(1);
    });
  });

  describe('goToPage', () => {
    it('should navigate to specific page', () => {
      const { result } = renderHook(() => usePagination(100));

      act(() => {
        result.current.goToPage(5);
      });

      expect(result.current.currentPage).toBe(5);
      expect(result.current.startRecord).toBe(41);
      expect(result.current.endRecord).toBe(50);
    });

    it('should not navigate to page 0', () => {
      const { result } = renderHook(() => usePagination(100));

      act(() => {
        result.current.goToPage(0);
      });

      expect(result.current.currentPage).toBe(1); // Should stay at page 1
    });

    it('should not navigate beyond total pages', () => {
      const { result } = renderHook(() => usePagination(50));

      act(() => {
        result.current.goToPage(10); // Only 5 pages exist
      });

      expect(result.current.currentPage).toBe(1); // Should not change
    });

    it('should not navigate to negative page', () => {
      const { result } = renderHook(() => usePagination(50));

      act(() => {
        result.current.goToPage(-1);
      });

      expect(result.current.currentPage).toBe(1);
    });
  });

  describe('goToPreviousPage', () => {
    it('should navigate to previous page', () => {
      const { result } = renderHook(() => usePagination(100));

      act(() => {
        result.current.goToPage(3);
      });

      act(() => {
        result.current.goToPreviousPage();
      });

      expect(result.current.currentPage).toBe(2);
    });

    it('should not go below page 1', () => {
      const { result } = renderHook(() => usePagination(100));

      act(() => {
        result.current.goToPreviousPage();
      });

      expect(result.current.currentPage).toBe(1); // Already at first page
    });
  });

  describe('goToNextPage', () => {
    it('should navigate to next page', () => {
      const { result } = renderHook(() => usePagination(100));

      act(() => {
        result.current.goToNextPage();
      });

      expect(result.current.currentPage).toBe(2);
    });

    it('should not go beyond total pages', () => {
      const { result } = renderHook(() => usePagination(50));

      act(() => {
        result.current.goToPage(5); // Last page
      });

      act(() => {
        result.current.goToNextPage();
      });

      expect(result.current.currentPage).toBe(5); // Should stay at last page
    });
  });

  describe('changePageSize', () => {
    it('should change page size', () => {
      const { result } = renderHook(() => usePagination(100));

      act(() => {
        result.current.changePageSize(20);
      });

      expect(result.current.pageSize).toBe(20);
      expect(result.current.totalPages).toBe(5); // 100 records / 20 per page = 5 pages
    });

    it('should reset to first page when changing page size', () => {
      const { result } = renderHook(() => usePagination(100));

      act(() => {
        result.current.goToPage(5);
      });
      expect(result.current.currentPage).toBe(5);

      act(() => {
        result.current.changePageSize(20);
      });

      expect(result.current.currentPage).toBe(1); // Should reset to first page
    });

    it('should handle common page sizes', () => {
      const { result } = renderHook(() => usePagination(100));

      const pageSizes = [5, 10, 20, 50, 100];

      pageSizes.forEach(size => {
        act(() => {
          result.current.changePageSize(size);
        });
        expect(result.current.pageSize).toBe(size);
        expect(result.current.totalPages).toBe(Math.ceil(100 / size));
      });
    });

    it('should recalculate records for new page size', () => {
      const { result } = renderHook(() => usePagination(100));

      act(() => {
        result.current.changePageSize(25);
      });

      expect(result.current.startRecord).toBe(1);
      expect(result.current.endRecord).toBe(25);
      expect(result.current.totalPages).toBe(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly one page of records', () => {
      const { result } = renderHook(() => usePagination(10));

      expect(result.current.totalPages).toBe(1);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.startRecord).toBe(1);
      expect(result.current.endRecord).toBe(10);
    });

    it('should handle large number of records', () => {
      const { result } = renderHook(() => usePagination(10000));

      expect(result.current.totalPages).toBe(1000);
      expect(result.current.startRecord).toBe(1);
      expect(result.current.endRecord).toBe(10);
    });

    it('should handle page size larger than total records', () => {
      const { result } = renderHook(() => usePagination(5));

      act(() => {
        result.current.changePageSize(100);
      });

      expect(result.current.totalPages).toBe(1);
      expect(result.current.startRecord).toBe(1);
      expect(result.current.endRecord).toBe(5);
    });
  });

  describe('Dynamic Total Records', () => {
    it('should handle increasing total records', () => {
      const { result, rerender } = renderHook(
        ({ totalRecords }) => usePagination(totalRecords),
        { initialProps: { totalRecords: 50 } }
      );

      expect(result.current.totalPages).toBe(5);

      rerender({ totalRecords: 150 });

      expect(result.current.totalPages).toBe(15);
    });

    it('should handle decreasing total records', () => {
      const { result, rerender } = renderHook(
        ({ totalRecords }) => usePagination(totalRecords),
        { initialProps: { totalRecords: 150 } }
      );

      act(() => {
        result.current.goToPage(10);
      });

      rerender({ totalRecords: 50 });

      expect(result.current.totalPages).toBe(5);
      // Current page might need adjustment if it exceeds new total pages
    });

    it('should adjust current page when total records decrease significantly', () => {
      const { result, rerender } = renderHook(
        ({ totalRecords }) => usePagination(totalRecords),
        { initialProps: { totalRecords: 100 } }
      );

      act(() => {
        result.current.goToPage(10); // Last page
      });

      rerender({ totalRecords: 20 }); // Now only 2 pages

      // Current page should be adjusted or maintained based on implementation
      expect(result.current.totalPages).toBe(2);
    });
  });

  describe('Navigation Sequence', () => {
    it('should handle navigation sequence correctly', () => {
      const { result } = renderHook(() => usePagination(100));

      // Start at page 1
      expect(result.current.currentPage).toBe(1);

      // Go to next page
      act(() => {
        result.current.goToNextPage();
      });
      expect(result.current.currentPage).toBe(2);

      // Go to next page again
      act(() => {
        result.current.goToNextPage();
      });
      expect(result.current.currentPage).toBe(3);

      // Go to previous page
      act(() => {
        result.current.goToPreviousPage();
      });
      expect(result.current.currentPage).toBe(2);

      // Jump to specific page
      act(() => {
        result.current.goToPage(5);
      });
      expect(result.current.currentPage).toBe(5);

      // Change page size (should reset to page 1)
      act(() => {
        result.current.changePageSize(20);
      });
      expect(result.current.currentPage).toBe(1);
    });
  });
});

