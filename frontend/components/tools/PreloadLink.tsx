/**
 * 带预加载功能的链接组件
 * 在用户悬停时预加载目标页面
 */

import React, { useRef, useEffect } from 'react';
import {Link, LinkProps} from 'react-router-dom';
import {routePreloader, routeImports} from '../../utils/routePreloader';

interface PreloadLinkProps extends LinkProps {
  /** 预加载策略 */
  preloadStrategy?: 'hover' | 'immediate' | 'idle' | 'none';
  /** 悬停延迟时间（毫秒） */
  hoverDelay?: number;
  /** 空闲预加载延迟时间（毫秒） */
  idleDelay?: number;
  /** 是否显示预加载状态 */
  showPreloadState?: boolean;
}

export const PreloadLink: React.FC<PreloadLinkProps> = ({
  to,
  preloadStrategy = 'hover',
  hoverDelay = 100,
  idleDelay = 2000,
  showPreloadState = false,
  children,
  className = '',
  ...linkProps
}) => {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const routePath = typeof to === 'string' ? to : to.pathname || '';
  const importFn = routeImports[routePath as keyof typeof routeImports];

  useEffect(() => {
    if (!importFn || !linkRef.current) return;

    const element = linkRef.current;

    switch (preloadStrategy) {
      case 'immediate':
        routePreloader.preloadRoute(routePath, importFn);
        break;

      case 'idle':
        routePreloader.preloadOnIdle(routePath, importFn, idleDelay);
        break;

      case 'hover':
        cleanupRef.current = routePreloader.preloadOnHover(
          element,
          routePath,
          importFn
        );
        break;

      case 'none':
      default:
        break;
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [routePath, importFn, preloadStrategy, hoverDelay, idleDelay]);

  // 获取预加载状态
  const preloadState = showPreloadState ? routePreloader.getPreloadState(routePath) : 'idle';

  // 状态指示器样式
  const getStateIndicator = () => {
    if (!showPreloadState) return null;

    const indicators = {
      idle: null,
      loading: (
        <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse ml-1" 
              title="预加载中..." />
      ),
      loaded: (
        <span className="inline-block w-2 h-2 bg-green-400 rounded-full ml-1" 
              title="已预加载" />
      ),
      failed: (
        <span className="inline-block w-2 h-2 bg-red-400 rounded-full ml-1" 
              title="预加载失败" />
      )
    };

    return indicators[preloadState];
  };

  return (
    <Link
      ref={linkRef}
      to={to}
      className={`${className} ${preloadState === 'loaded' ? 'preload-ready' : ''}`}
      {...linkProps}
    >
      {children}
      {getStateIndicator()}
    </Link>
  );
};

/**
 * 导航菜单项组件 - 带预加载功能
 */
interface NavLinkProps extends PreloadLinkProps {
  icon?: React.ReactNode;
  badge?: string | number;
  isActive?: boolean;
}

export const NavLink: React.FC<NavLinkProps> = ({
  icon,
  badge,
  isActive = false,
  children,
  className = '',
  ...preloadLinkProps
}) => {
  const baseClasses = `
    flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
    ${isActive 
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
    }
  `;

  return (
    <PreloadLink
      className={`${baseClasses} ${className}`}
      preloadStrategy="hover"
      showPreloadState={process.env.NODE_ENV === 'development'}
      {...preloadLinkProps}
    >
      {icon && <span className="mr-3">{icon}</span>}
      <span className="flex-1">{children}</span>
      {badge && (
        <span className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-full dark:bg-gray-700 dark:text-gray-300">
          {badge}
        </span>
      )}
    </PreloadLink>
  );
};

/**
 * 按钮式链接组件 - 带预加载功能
 */
interface ButtonLinkProps extends PreloadLinkProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export const ButtonLink: React.FC<ButtonLinkProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  className = '',
  ...preloadLinkProps
}) => {
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-lg
    transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
  `;

  if (disabled) {
    
        return (
      <span className={`${baseClasses
      } ${className}`}>
        {children}
      </span>
    );
  }

  return (
    <PreloadLink
      className={`${baseClasses} ${className}`}
      preloadStrategy="hover"
      {...preloadLinkProps}
    >
      {children}
    </PreloadLink>
  );
};

export default PreloadLink;
