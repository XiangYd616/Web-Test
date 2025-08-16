/**
 * 响应式设计工具
 * 提供响应式设计相关的工具函数和Hook
 */

import { useState, useEffect } from 'react';
import { breakpoints } from '../design/tokens';

// 断点类型
export type Breakpoint = keyof typeof breakpoints;

// 媒体查询工具
export const mediaQueries = {
  up: (breakpoint: Breakpoint) => `@media (min-width: ${breakpoints[breakpoint]})`,
  down: (breakpoint: Breakpoint) => {
    const breakpointValues = Object.values(breakpoints);
    const currentIndex = Object.keys(breakpoints).indexOf(breakpoint);
    const nextValue = breakpointValues[currentIndex + 1];
    return nextValue ? `@media (max-width: ${parseInt(nextValue) - 1}px)` : '';
  },
  between: (min: Breakpoint, max: Breakpoint) =>
    `@media (min-width: ${breakpoints[min]}) and (max-width: ${parseInt(breakpoints[max]) - 1}px)`,
  only: (breakpoint: Breakpoint) => {
    const breakpointKeys = Object.keys(breakpoints) as Breakpoint[];
    const currentIndex = breakpointKeys.indexOf(breakpoint);
    const nextBreakpoint = breakpointKeys[currentIndex + 1];

    if (nextBreakpoint) {
      return mediaQueries.between(breakpoint, nextBreakpoint);
    } else {
      return mediaQueries.up(breakpoint);
    }
  }
};

// 响应式值类型
export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>;

// 获取当前断点
export const getCurrentBreakpoint = (): Breakpoint => {
  const width = window.innerWidth;

  if (width >= parseInt(breakpoints.xxl)) return 'xxl';
  if (width >= parseInt(breakpoints.xl)) return 'xl';
  if (width >= parseInt(breakpoints.lg)) return 'lg';
  if (width >= parseInt(breakpoints.md)) return 'md';
  if (width >= parseInt(breakpoints.sm)) return 'sm';
  return 'xs';
};

// 响应式断点Hook
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    if (typeof window !== 'undefined') {
      return getCurrentBreakpoint();
    }
    return 'md';
  });

  useEffect(() => {
    const handleResize = () => {
      setBreakpoint(getCurrentBreakpoint());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
};

// 媒体查询Hook
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [query]);

  return matches;
};

// 响应式值解析
export const resolveResponsiveValue = <T>(
  value: ResponsiveValue<T>,
  currentBreakpoint: Breakpoint
): T => {
  if (typeof value !== 'object' || value === null) {
    return value as T;
  }

  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);

  // 从当前断点向下查找最近的值
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (value[bp] !== undefined) {
      return value[bp] as T;
    }
  }

  // 如果没找到，返回第一个可用值
  for (const bp of breakpointOrder) {
    if (value[bp] !== undefined) {
      return value[bp] as T;
    }
  }

  return undefined as T;
};

// 响应式值Hook
export const useResponsiveValue = <T>(value: ResponsiveValue<T>): T => {
  const breakpoint = useBreakpoint();
  return resolveResponsiveValue(value, breakpoint);
};

// 设备检测
export const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isTouchDevice: false
  });

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    setDeviceInfo({
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice
    });
  }, []);

  return deviceInfo;
};

export default {
  mediaQueries,
  getCurrentBreakpoint,
  useBreakpoint,
  useMediaQuery,
  resolveResponsiveValue,
  useResponsiveValue,
  useDeviceDetection
};