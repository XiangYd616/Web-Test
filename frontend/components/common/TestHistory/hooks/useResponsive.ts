/**
 * useResponsive - 响应式断点Hook
 * 
 * 文件路径: frontend/components/common/TestHistory/hooks/useResponsive.ts
 * 创建时间: 2025-11-14
 * 
 * 功能特性:
 * - 响应式断点检测 (mobile, tablet, desktop, wide)
 * - 窗口尺寸监听
 * - 触摸设备检测
 * - 方向变化监听
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * 响应式断点定义
 */
export const BREAKPOINTS = {
  mobile: 640,    // sm
  tablet: 768,    // md
  desktop: 1024,  // lg
  wide: 1280,     // xl
} as const;

/**
 * 设备类型
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'wide';

/**
 * 方向类型
 */
export type Orientation = 'portrait' | 'landscape';

/**
 * 响应式状态
 */
export interface ResponsiveState {
  /** 当前设备类型 */
  device: DeviceType;
  /** 是否为移动设备 */
  isMobile: boolean;
  /** 是否为平板设备 */
  isTablet: boolean;
  /** 是否为桌面设备 */
  isDesktop: boolean;
  /** 是否为宽屏设备 */
  isWide: boolean;
  /** 是否为触摸设备 */
  isTouchDevice: boolean;
  /** 当前屏幕方向 */
  orientation: Orientation;
  /** 视口宽度 */
  width: number;
  /** 视口高度 */
  height: number;
}

/**
 * 获取设备类型
 */
const getDeviceType = (width: number): DeviceType => {
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'mobile';
  if (width < BREAKPOINTS.desktop) return 'tablet';
  if (width < BREAKPOINTS.wide) return 'desktop';
  return 'wide';
};

/**
 * 检测触摸设备
 */
const checkTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0
  );
};

/**
 * 获取屏幕方向
 */
const getOrientation = (width: number, height: number): Orientation => {
  return width > height ? 'landscape' : 'portrait';
};

/**
 * 响应式Hook
 */
export const useResponsive = (): ResponsiveState => {
  // 初始化状态
  const [state, setState] = useState<ResponsiveState>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const height = typeof window !== 'undefined' ? window.innerHeight : 768;
    const device = getDeviceType(width);
    
    return {
      device,
      isMobile: device === 'mobile',
      isTablet: device === 'tablet',
      isDesktop: device === 'desktop',
      isWide: device === 'wide',
      isTouchDevice: checkTouchDevice(),
      orientation: getOrientation(width, height),
      width,
      height,
    };
  });

  // 更新状态
  const updateState = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const device = getDeviceType(width);

    setState({
      device,
      isMobile: device === 'mobile',
      isTablet: device === 'tablet',
      isDesktop: device === 'desktop',
      isWide: device === 'wide',
      isTouchDevice: checkTouchDevice(),
      orientation: getOrientation(width, height),
      width,
      height,
    });
  }, []);

  // 监听窗口大小变化
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 防抖处理
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateState, 150);
    };

    // 监听resize事件
    window.addEventListener('resize', handleResize);
    
    // 监听orientationchange事件 (移动设备)
    window.addEventListener('orientationchange', updateState);

    // 初始更新
    updateState();

    // 清理
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', updateState);
    };
  }, [updateState]);

  return state;
};

/**
 * 媒体查询Hook (简化版)
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // 现代浏览器
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // 旧版浏览器
    else {
      // @ts-ignore
      mediaQuery.addListener(handleChange);
      // @ts-ignore
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [query]);

  return matches;
};

/**
 * 常用媒体查询
 */
export const useCommonMediaQueries = () => {
  const isMobile = useMediaQuery(`(max-width: ${BREAKPOINTS.tablet - 1}px)`);
  const isTablet = useMediaQuery(
    `(min-width: ${BREAKPOINTS.tablet}px) and (max-width: ${BREAKPOINTS.desktop - 1}px)`
  );
  const isDesktop = useMediaQuery(`(min-width: ${BREAKPOINTS.desktop}px)`);
  const isTouch = useMediaQuery('(hover: none) and (pointer: coarse)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    prefersReducedMotion,
    prefersDarkMode,
  };
};

export default useResponsive;
