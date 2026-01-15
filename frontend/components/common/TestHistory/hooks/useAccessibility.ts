/**
 * useAccessibility - 无障碍支持Hook
 *
 * 文件路径: frontend/components/common/TestHistory/hooks/useAccessibility.ts
 * 创建时间: 2025-11-14
 *
 * 功能特性:
 * - 键盘导航支持
 * - 焦点管理
 * - ARIA属性增强
 * - 屏幕阅读器友好
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 键盘导航配置
 */
export interface KeyboardNavConfig {
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onSpace?: () => void;
  onTab?: (shiftKey: boolean) => void;
  enabled?: boolean;
}

/**
 * 键盘导航Hook
 */
export const useKeyboardNav = (config: KeyboardNavConfig) => {
  const { enabled = true } = config;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          if (config.onEnter) {
            e.preventDefault();
            config.onEnter();
          }
          break;

        case 'Escape':
          if (config.onEscape) {
            e.preventDefault();
            config.onEscape();
          }
          break;

        case 'ArrowUp':
          if (config.onArrowUp) {
            e.preventDefault();
            config.onArrowUp();
          }
          break;

        case 'ArrowDown':
          if (config.onArrowDown) {
            e.preventDefault();
            config.onArrowDown();
          }
          break;

        case 'ArrowLeft':
          if (config.onArrowLeft) {
            e.preventDefault();
            config.onArrowLeft();
          }
          break;

        case 'ArrowRight':
          if (config.onArrowRight) {
            e.preventDefault();
            config.onArrowRight();
          }
          break;

        case ' ':
          if (config.onSpace) {
            e.preventDefault();
            config.onSpace();
          }
          break;

        case 'Tab':
          if (config.onTab) {
            config.onTab(e.shiftKey);
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config, enabled]);
};

/**
 * 焦点管理Hook
 */
export const useFocusManagement = <T extends HTMLElement = HTMLElement>() => {
  const ref = useRef<T>(null);
  const [isFocused, setIsFocused] = useState(false);

  const focus = useCallback(() => {
    if (ref.current) {
      ref.current.focus();
    }
  }, []);

  const blur = useCallback(() => {
    if (ref.current) {
      ref.current.blur();
    }
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);

    return () => {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }, []);

  return {
    ref,
    isFocused,
    focus,
    blur,
  };
};

/**
 * 焦点陷阱Hook (用于模态框)
 */
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    // 获取所有可聚焦元素
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!firstElement) return;

    // 自动聚焦第一个元素
    firstElement.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab: 向前
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: 向后
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
};

/**
 * 表格行导航Hook
 */
export const useTableRowNavigation = (
  rowCount: number,
  onRowSelect: (index: number) => void,
  enabled: boolean = true
) => {
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);

  const handleArrowUp = useCallback(() => {
    setFocusedRowIndex(prev => {
      const newIndex = Math.max(0, prev - 1);
      onRowSelect(newIndex);
      return newIndex;
    });
  }, [onRowSelect]);

  const handleArrowDown = useCallback(() => {
    setFocusedRowIndex(prev => {
      const newIndex = Math.min(rowCount - 1, prev + 1);
      onRowSelect(newIndex);
      return newIndex;
    });
  }, [rowCount, onRowSelect]);

  const handleEnter = useCallback(() => {
    onRowSelect(focusedRowIndex);
  }, [focusedRowIndex, onRowSelect]);

  useKeyboardNav({
    onArrowUp: handleArrowUp,
    onArrowDown: handleArrowDown,
    onEnter: handleEnter,
    enabled,
  });

  return {
    focusedRowIndex,
    setFocusedRowIndex,
  };
};

/**
 * ARIA实时通知Hook
 */
export const useAriaLiveAnnouncer = () => {
  const [announcement, setAnnouncement] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // 清除之前的超时
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 设置新消息
    setAnnouncement(message);

    // 自动清除消息
    timeoutRef.current = setTimeout(() => {
      setAnnouncement('');
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    announcement,
    announce,
  };
};

/**
 * 跳过链接Hook (快速导航)
 */
export const useSkipLinks = () => {
  const mainContentRef = useRef<HTMLElement>(null);
  const navigationRef = useRef<HTMLElement>(null);

  const skipToContent = useCallback(() => {
    mainContentRef.current?.focus();
  }, []);

  const skipToNavigation = useCallback(() => {
    navigationRef.current?.focus();
  }, []);

  return {
    mainContentRef,
    navigationRef,
    skipToContent,
    skipToNavigation,
  };
};

/**
 * 高对比度模式检测Hook
 */
export const useHighContrast = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 检测Windows高对比度模式
    const checkHighContrast = () => {
      // 方法1: 使用media query
      const mediaQuery = window.matchMedia('(prefers-contrast: high)');
      if (mediaQuery.matches) {
        setIsHighContrast(true);
        return;
      }

      // 方法2: 使用forced-colors
      const forcedColors = window.matchMedia('(forced-colors: active)');
      if (forcedColors.matches) {
        setIsHighContrast(true);
        return;
      }

      setIsHighContrast(false);
    };

    checkHighContrast();

    // 监听变化
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    const forcedQuery = window.matchMedia('(forced-colors: active)');

    const handleChange = () => checkHighContrast();

    if (contrastQuery.addEventListener) {
      contrastQuery.addEventListener('change', handleChange);
      forcedQuery.addEventListener('change', handleChange);
    }

    return () => {
      if (contrastQuery.removeEventListener) {
        contrastQuery.removeEventListener('change', handleChange);
        forcedQuery.removeEventListener('change', handleChange);
      }
    };
  }, []);

  return { isHighContrast };
};

/**
 * 减少动画Hook
 */
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    return undefined;
  }, []);

  return { prefersReducedMotion };
};

/**
 * ARIA标签生成器
 */
export const generateAriaLabel = {
  record: (name: string) => `测试记录: ${name}`,
  action: (action: string, target: string) => `${action} ${target}`,
  status: (status: string) => `状态: ${status}`,
  page: (current: number, total: number) => `第 ${current} 页，共 ${total} 页`,
  selected: (count: number, total: number) => `已选择 ${count} 项，共 ${total} 项`,
};

export default {
  useKeyboardNav,
  useFocusManagement,
  useFocusTrap,
  useTableRowNavigation,
  useAriaLiveAnnouncer,
  useSkipLinks,
  useHighContrast,
  useReducedMotion,
  generateAriaLabel,
};
