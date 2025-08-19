/**
 * 性能优化工具单元测试
 * 
 * 测试防抖、节流、缓存等性能优化功能
 * 
 * @author Test-Web Team
 * @since 1.0.0
 */

import { renderHook, act } from '@testing-library/react';
import {
  debounce,
  throttle,
  MemoryCache,
  globalCache,
  useDebounce,
  useThrottle,
  useDebouncedCallback,
  useCache
} from '../performance';

// Mock timers
jest.useFakeTimers();

describe('性能优化工具', () => {
  describe('debounce', () => {
    it('应该延迟执行函数', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn('test');
      expect(mockFn).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('应该在多次调用时只执行最后一次', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');
      
      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('third');
    });

    it('应该支持立即执行模式', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100, true);
      
      debouncedFn('immediate');
      expect(mockFn).toHaveBeenCalledWith('immediate');
      
      debouncedFn('delayed');
      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('应该正确处理参数', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn('arg1', 'arg2', 123);
      jest.advanceTimersByTime(100);
      
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 123);
    });
  });

  describe('throttle', () => {
    it('应该限制函数执行频率', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);
      
      throttledFn('first');
      expect(mockFn).toHaveBeenCalledWith('first');
      
      throttledFn('second');
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(100);
      throttledFn('third');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenLastCalledWith('third');
    });

    it('应该在限制期内忽略后续调用', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);
      
      throttledFn('call1');
      throttledFn('call2');
      throttledFn('call3');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call1');
    });
  });

  describe('MemoryCache', () => {
    let cache: MemoryCache;

    beforeEach(() => {
      cache = new MemoryCache(1000); // 1秒TTL
    });

    it('应该正确存储和获取数据', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('应该在TTL过期后返回null', () => {
      cache.set('key1', 'value1', 100);
      expect(cache.get('key1')).toBe('value1');
      
      jest.advanceTimersByTime(150);
      expect(cache.get('key1')).toBeNull();
    });

    it('应该正确检查键是否存在', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('应该正确删除键', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeNull();
      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('应该正确清空缓存', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });

    it('应该正确计算缓存大小', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
      
      // 添加过期项
      cache.set('expired', 'value', 10);
      jest.advanceTimersByTime(20);
      
      // size()方法应该清理过期项
      expect(cache.size()).toBe(2);
    });

    it('应该支持不同的数据类型', () => {
      const objectValue = { name: 'test', count: 42 };
      const arrayValue = [1, 2, 3];
      
      cache.set('object', objectValue);
      cache.set('array', arrayValue);
      cache.set('number', 123);
      cache.set('boolean', true);
      
      expect(cache.get('object')).toEqual(objectValue);
      expect(cache.get('array')).toEqual(arrayValue);
      expect(cache.get('number')).toBe(123);
      expect(cache.get('boolean')).toBe(true);
    });
  });

  describe('useDebounce Hook', () => {
    it('应该延迟更新值', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 100 } }
      );
      
      expect(result.current).toBe('initial');
      
      rerender({ value: 'updated', delay: 100 });
      expect(result.current).toBe('initial');
      
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      expect(result.current).toBe('updated');
    });

    it('应该在快速变化时只保留最后的值', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 100),
        { initialProps: { value: 'first' } }
      );
      
      rerender({ value: 'second' });
      rerender({ value: 'third' });
      rerender({ value: 'final' });
      
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      expect(result.current).toBe('final');
    });
  });

  describe('useThrottle Hook', () => {
    it('应该返回节流后的回调函数', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useThrottle(mockCallback, 100)
      );
      
      const throttledCallback = result.current;
      
      throttledCallback('arg1');
      expect(mockCallback).toHaveBeenCalledWith('arg1');
      
      throttledCallback('arg2');
      expect(mockCallback).toHaveBeenCalledTimes(1);
      
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      throttledCallback('arg3');
      expect(mockCallback).toHaveBeenCalledTimes(2);
      expect(mockCallback).toHaveBeenLastCalledWith('arg3');
    });
  });

  describe('useDebouncedCallback Hook', () => {
    it('应该返回防抖后的回调函数', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(mockCallback, 100)
      );
      
      const debouncedCallback = result.current;
      
      debouncedCallback('arg1');
      debouncedCallback('arg2');
      debouncedCallback('arg3');
      
      expect(mockCallback).not.toHaveBeenCalled();
      
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith('arg3');
    });

    it('应该在依赖变化时重新创建防抖函数', () => {
      const mockCallback = jest.fn();
      let delay = 100;
      
      const { result, rerender } = renderHook(() => 
        useDebouncedCallback(mockCallback, delay, [delay])
      );
      
      const firstCallback = result.current;
      
      delay = 200;
      rerender();
      
      const secondCallback = result.current;
      
      expect(firstCallback).not.toBe(secondCallback);
    });
  });

  describe('useCache Hook', () => {
    beforeEach(() => {
      globalCache.clear();
    });

    it('应该缓存和返回数据', async () => {
      const mockFetcher = jest.fn().mockResolvedValue('cached data');
      
      const { result, waitForNextUpdate } = renderHook(() =>
        useCache('test-key', mockFetcher)
      );
      
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      
      await waitForNextUpdate();
      
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe('cached data');
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });

    it('应该从缓存中返回数据而不重新获取', async () => {
      const mockFetcher = jest.fn().mockResolvedValue('cached data');
      
      // 第一次调用
      const { result: result1, waitForNextUpdate: wait1 } = renderHook(() =>
        useCache('test-key', mockFetcher)
      );
      
      await wait1();
      
      // 第二次调用相同的key
      const { result: result2 } = renderHook(() =>
        useCache('test-key', mockFetcher)
      );
      
      expect(result2.current.data).toBe('cached data');
      expect(result2.current.loading).toBe(false);
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });

    it('应该处理获取错误', async () => {
      const mockError = new Error('Fetch failed');
      const mockFetcher = jest.fn().mockRejectedValue(mockError);
      
      const { result, waitForNextUpdate } = renderHook(() =>
        useCache('error-key', mockFetcher)
      );
      
      await waitForNextUpdate();
      
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(mockError);
      expect(result.current.data).toBeNull();
    });

    it('应该支持刷新功能', async () => {
      const mockFetcher = jest.fn()
        .mockResolvedValueOnce('first data')
        .mockResolvedValueOnce('refreshed data');
      
      const { result, waitForNextUpdate } = renderHook(() =>
        useCache('refresh-key', mockFetcher)
      );
      
      await waitForNextUpdate();
      expect(result.current.data).toBe('first data');
      
      act(() => {
        result.current.refresh();
      });
      
      await waitForNextUpdate();
      expect(result.current.data).toBe('refreshed data');
      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe('globalCache', () => {
    beforeEach(() => {
      globalCache.clear();
    });

    it('应该是MemoryCache的实例', () => {
      expect(globalCache).toBeInstanceOf(MemoryCache);
    });

    it('应该在不同地方共享数据', () => {
      globalCache.set('shared-key', 'shared-value');
      expect(globalCache.get('shared-key')).toBe('shared-value');
    });
  });
});
