/**
 * useFilters Hook - Unit Tests
 * 
 * Tests for the useFilters custom hook that manages filter state
 * for the TestHistory component.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilters } from '../useFilters';

describe('useFilters', () => {
  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useFilters());

      expect(result.current.searchTerm).toBe('');
      expect(result.current.statusFilter).toBe('all');
      expect(result.current.dateFilter).toBe('all');
      expect(result.current.sortBy).toBe('created_at');
      expect(result.current.sortOrder).toBe('desc');
    });

    it('should provide setter functions', () => {
      const { result } = renderHook(() => useFilters());

      expect(typeof result.current.setSearchTerm).toBe('function');
      expect(typeof result.current.setStatusFilter).toBe('function');
      expect(typeof result.current.setDateFilter).toBe('function');
      expect(typeof result.current.setSortBy).toBe('function');
      expect(typeof result.current.setSortOrder).toBe('function');
    });
  });

  describe('Search Term', () => {
    it('should update search term', () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setSearchTerm('test query');
      });

      expect(result.current.searchTerm).toBe('test query');
    });

    it('should handle empty search term', () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setSearchTerm('test');
      });
      expect(result.current.searchTerm).toBe('test');

      act(() => {
        result.current.setSearchTerm('');
      });
      expect(result.current.searchTerm).toBe('');
    });

    it('should handle special characters in search term', () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setSearchTerm('test@#$%^&*()');
      });

      expect(result.current.searchTerm).toBe('test@#$%^&*()');
    });
  });

  describe('Status Filter', () => {
    it('should update status filter', () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setStatusFilter('completed');
      });

      expect(result.current.statusFilter).toBe('completed');
    });

    it('should handle different status values', () => {
      const { result } = renderHook(() => useFilters());

      const statuses = ['all', 'completed', 'failed', 'running', 'cancelled', 'idle', 'starting'];

      statuses.forEach(status => {
        act(() => {
          result.current.setStatusFilter(status);
        });
        expect(result.current.statusFilter).toBe(status);
      });
    });
  });

  describe('Date Filter', () => {
    it('should update date filter', () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setDateFilter('week');
      });

      expect(result.current.dateFilter).toBe('week');
    });

    it('should handle different date filter values', () => {
      const { result } = renderHook(() => useFilters());

      const dateFilters = ['all', 'today', 'week', 'month'];

      dateFilters.forEach(filter => {
        act(() => {
          result.current.setDateFilter(filter);
        });
        expect(result.current.dateFilter).toBe(filter);
      });
    });
  });

  describe('Sort By', () => {
    it('should update sort by field', () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setSortBy('duration');
      });

      expect(result.current.sortBy).toBe('duration');
    });

    it('should handle different sort fields', () => {
      const { result } = renderHook(() => useFilters());

      const sortFields: Array<'created_at' | 'duration' | 'start_time' | 'status'> = [
        'created_at',
        'duration',
        'start_time',
        'status'
      ];

      sortFields.forEach(field => {
        act(() => {
          result.current.setSortBy(field);
        });
        expect(result.current.sortBy).toBe(field);
      });
    });
  });

  describe('Sort Order', () => {
    it('should update sort order', () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setSortOrder('asc');
      });

      expect(result.current.sortOrder).toBe('asc');
    });

    it('should toggle between asc and desc', () => {
      const { result } = renderHook(() => useFilters());

      expect(result.current.sortOrder).toBe('desc');

      act(() => {
        result.current.setSortOrder('asc');
      });
      expect(result.current.sortOrder).toBe('asc');

      act(() => {
        result.current.setSortOrder('desc');
      });
      expect(result.current.sortOrder).toBe('desc');
    });
  });

  describe('Multiple Updates', () => {
    it('should handle multiple filter updates', () => {
      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.setSearchTerm('stress test');
        result.current.setStatusFilter('completed');
        result.current.setDateFilter('week');
        result.current.setSortBy('duration');
        result.current.setSortOrder('asc');
      });

      expect(result.current.searchTerm).toBe('stress test');
      expect(result.current.statusFilter).toBe('completed');
      expect(result.current.dateFilter).toBe('week');
      expect(result.current.sortBy).toBe('duration');
      expect(result.current.sortOrder).toBe('asc');
    });

    it('should maintain state independence', () => {
      const { result } = renderHook(() => useFilters());

      // Update search term
      act(() => {
        result.current.setSearchTerm('test');
      });
      expect(result.current.statusFilter).toBe('all'); // Other filters unchanged

      // Update status filter
      act(() => {
        result.current.setStatusFilter('failed');
      });
      expect(result.current.searchTerm).toBe('test'); // Search term unchanged
      expect(result.current.dateFilter).toBe('all'); // Date filter unchanged
    });
  });

  describe('State Persistence', () => {
    it('should maintain state across re-renders', () => {
      const { result, rerender } = renderHook(() => useFilters());

      act(() => {
        result.current.setSearchTerm('persistent');
        result.current.setStatusFilter('running');
      });

      rerender();

      expect(result.current.searchTerm).toBe('persistent');
      expect(result.current.statusFilter).toBe('running');
    });
  });
});


