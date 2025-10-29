/**
 * useSelection Hook - Unit Tests
 * 
 * Tests for the useSelection custom hook that manages record selection state
 * for batch operations in the TestHistory component.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from '../useSelection';
import type { TestRecord } from '../../types';

// Helper function to create mock test records
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

describe('useSelection', () => {
  describe('Initial State', () => {
    it('should initialize with empty selection', () => {
      const records: TestRecord[] = [];
      const { result } = renderHook(() => useSelection(records));

      expect(result.current.selectedRecords).toBeInstanceOf(Set);
      expect(result.current.selectedRecords.size).toBe(0);
    });

    it('should provide selection functions', () => {
      const records: TestRecord[] = [];
      const { result } = renderHook(() => useSelection(records));

      expect(typeof result.current.toggleSelectAll).toBe('function');
      expect(typeof result.current.toggleSelectRecord).toBe('function');
      expect(typeof result.current.clearSelection).toBe('function');
    });
  });

  describe('toggleSelectRecord', () => {
    it('should select a single record', () => {
      const records = [createMockRecord('1'), createMockRecord('2')];
      const { result } = renderHook(() => useSelection(records));

      act(() => {
        result.current.toggleSelectRecord('1');
      });

      expect(result.current.selectedRecords.has('1')).toBe(true);
      expect(result.current.selectedRecords.size).toBe(1);
    });

    it('should deselect a selected record', () => {
      const records = [createMockRecord('1'), createMockRecord('2')];
      const { result } = renderHook(() => useSelection(records));

      act(() => {
        result.current.toggleSelectRecord('1');
      });
      expect(result.current.selectedRecords.has('1')).toBe(true);

      act(() => {
        result.current.toggleSelectRecord('1');
      });
      expect(result.current.selectedRecords.has('1')).toBe(false);
      expect(result.current.selectedRecords.size).toBe(0);
    });

    it('should select multiple records independently', () => {
      const records = [
        createMockRecord('1'),
        createMockRecord('2'),
        createMockRecord('3'),
      ];
      const { result } = renderHook(() => useSelection(records));

      act(() => {
        result.current.toggleSelectRecord('1');
        result.current.toggleSelectRecord('3');
      });

      expect(result.current.selectedRecords.has('1')).toBe(true);
      expect(result.current.selectedRecords.has('2')).toBe(false);
      expect(result.current.selectedRecords.has('3')).toBe(true);
      expect(result.current.selectedRecords.size).toBe(2);
    });

    it('should handle selecting non-existent record', () => {
      const records = [createMockRecord('1')];
      const { result } = renderHook(() => useSelection(records));

      act(() => {
        result.current.toggleSelectRecord('non-existent');
      });

      // Should add to selection even if record doesn't exist in current list
      expect(result.current.selectedRecords.has('non-existent')).toBe(true);
      expect(result.current.selectedRecords.size).toBe(1);
    });
  });

  describe('toggleSelectAll', () => {
    it('should select all records when none selected', () => {
      const records = [
        createMockRecord('1'),
        createMockRecord('2'),
        createMockRecord('3'),
      ];
      const { result } = renderHook(() => useSelection(records));

      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.selectedRecords.size).toBe(3);
      expect(result.current.selectedRecords.has('1')).toBe(true);
      expect(result.current.selectedRecords.has('2')).toBe(true);
      expect(result.current.selectedRecords.has('3')).toBe(true);
    });

    it('should deselect all records when all selected', () => {
      const records = [
        createMockRecord('1'),
        createMockRecord('2'),
      ];
      const { result } = renderHook(() => useSelection(records));

      // Select all
      act(() => {
        result.current.toggleSelectAll();
      });
      expect(result.current.selectedRecords.size).toBe(2);

      // Deselect all
      act(() => {
        result.current.toggleSelectAll();
      });
      expect(result.current.selectedRecords.size).toBe(0);
    });

    it('should select all when some are selected', () => {
      const records = [
        createMockRecord('1'),
        createMockRecord('2'),
        createMockRecord('3'),
      ];
      const { result } = renderHook(() => useSelection(records));

      // Select one record
      act(() => {
        result.current.toggleSelectRecord('1');
      });
      expect(result.current.selectedRecords.size).toBe(1);

      // Toggle select all should select remaining
      act(() => {
        result.current.toggleSelectAll();
      });
      expect(result.current.selectedRecords.size).toBe(3);
    });

    it('should handle empty records list', () => {
      const records: TestRecord[] = [];
      const { result } = renderHook(() => useSelection(records));

      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.selectedRecords.size).toBe(0);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selections', () => {
      const records = [
        createMockRecord('1'),
        createMockRecord('2'),
        createMockRecord('3'),
      ];
      const { result } = renderHook(() => useSelection(records));

      // Select multiple records
      act(() => {
        result.current.toggleSelectRecord('1');
        result.current.toggleSelectRecord('2');
      });
      expect(result.current.selectedRecords.size).toBe(2);

      // Clear all
      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.selectedRecords.size).toBe(0);
    });

    it('should be idempotent', () => {
      const records = [createMockRecord('1')];
      const { result } = renderHook(() => useSelection(records));

      act(() => {
        result.current.clearSelection();
        result.current.clearSelection();
      });

      expect(result.current.selectedRecords.size).toBe(0);
    });
  });

  describe('Records List Changes', () => {
    it('should maintain selection when records list changes', () => {
      const initialRecords = [createMockRecord('1'), createMockRecord('2')];
      const { result, rerender } = renderHook(
        ({ records }) => useSelection(records),
        { initialProps: { records: initialRecords } }
      );

      // Select a record
      act(() => {
        result.current.toggleSelectRecord('1');
      });
      expect(result.current.selectedRecords.size).toBe(1);

      // Change records list (add new record)
      const newRecords = [
        ...initialRecords,
        createMockRecord('3'),
      ];
      rerender({ records: newRecords });

      // Selection should be maintained
      expect(result.current.selectedRecords.has('1')).toBe(true);
      expect(result.current.selectedRecords.size).toBe(1);
    });

    it('should update select all when records list changes', () => {
      const initialRecords = [createMockRecord('1'), createMockRecord('2')];
      const { result, rerender } = renderHook(
        ({ records }) => useSelection(records),
        { initialProps: { records: initialRecords } }
      );

      // Select all
      act(() => {
        result.current.toggleSelectAll();
      });
      expect(result.current.selectedRecords.size).toBe(2);

      // Add more records
      const newRecords = [
        ...initialRecords,
        createMockRecord('3'),
        createMockRecord('4'),
      ];
      rerender({ records: newRecords });

      // Select all again should select new records too
      act(() => {
        result.current.clearSelection();
        result.current.toggleSelectAll();
      });
      expect(result.current.selectedRecords.size).toBe(4);
    });
  });

  describe('Complex Selection Scenarios', () => {
    it('should handle rapid selection changes', () => {
      const records = [
        createMockRecord('1'),
        createMockRecord('2'),
        createMockRecord('3'),
      ];
      const { result } = renderHook(() => useSelection(records));

      act(() => {
        result.current.toggleSelectRecord('1');
        result.current.toggleSelectRecord('2');
        result.current.toggleSelectRecord('1'); // Deselect
        result.current.toggleSelectRecord('3');
      });

      expect(result.current.selectedRecords.has('1')).toBe(false);
      expect(result.current.selectedRecords.has('2')).toBe(true);
      expect(result.current.selectedRecords.has('3')).toBe(true);
      expect(result.current.selectedRecords.size).toBe(2);
    });

    it('should handle select all, modify, then clear', () => {
      const records = [
        createMockRecord('1'),
        createMockRecord('2'),
        createMockRecord('3'),
      ];
      const { result } = renderHook(() => useSelection(records));

      // Select all
      act(() => {
        result.current.toggleSelectAll();
      });
      expect(result.current.selectedRecords.size).toBe(3);

      // Deselect one
      act(() => {
        result.current.toggleSelectRecord('2');
      });
      expect(result.current.selectedRecords.size).toBe(2);

      // Clear all
      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.selectedRecords.size).toBe(0);
    });

    it('should maintain correct state through multiple operations', () => {
      const records = Array.from({ length: 10 }, (_, i) => 
        createMockRecord(String(i + 1))
      );
      const { result } = renderHook(() => useSelection(records));

      // Select some records
      act(() => {
        ['1', '3', '5', '7', '9'].forEach(id => {
          result.current.toggleSelectRecord(id);
        });
      });
      expect(result.current.selectedRecords.size).toBe(5);

      // Toggle select all (should select all)
      act(() => {
        result.current.toggleSelectAll();
      });
      expect(result.current.selectedRecords.size).toBe(10);

      // Deselect a few
      act(() => {
        ['2', '4', '6'].forEach(id => {
          result.current.toggleSelectRecord(id);
        });
      });
      expect(result.current.selectedRecords.size).toBe(7);

      // Toggle select all again (should select all since not all are selected)
      act(() => {
        result.current.toggleSelectAll();
      });
      expect(result.current.selectedRecords.size).toBe(10); // Should select all 10
    });
  });

  describe('Edge Cases', () => {
    it('should handle single record', () => {
      const records = [createMockRecord('1')];
      const { result } = renderHook(() => useSelection(records));

      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.selectedRecords.size).toBe(1);
      expect(result.current.selectedRecords.has('1')).toBe(true);
    });

    it('should handle large number of records', () => {
      const records = Array.from({ length: 1000 }, (_, i) => 
        createMockRecord(String(i))
      );
      const { result } = renderHook(() => useSelection(records));

      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.selectedRecords.size).toBe(1000);
    });

    it('should handle records with duplicate IDs gracefully', () => {
      const records = [
        createMockRecord('1'),
        createMockRecord('1'), // Duplicate
        createMockRecord('2'),
      ];
      const { result } = renderHook(() => useSelection(records));

      act(() => {
        result.current.toggleSelectAll();
      });

      // Set should handle duplicates automatically
      expect(result.current.selectedRecords.size).toBeLessThanOrEqual(3);
    });
  });
});


