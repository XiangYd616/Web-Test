/**
 * 防止主题闪烁组件
 * 基于 Remix Themes 的最佳实�? */

import Logger from '@/utils/logger';
import React from 'react';

interface PreventFlashOnWrongThemeProps {
  /** 是否有服务端主题 */
  ssrTheme?: boolean;
  /** 默认主题 */
  defaultTheme?: 'light' | 'dark';
}

/**
 * 防止主题闪烁的内联脚�? * 这个脚本会在页面加载时立即执行，避免闪烁
 */
const themeScript = `
(function() {
  try {
    // 从localStorage获取主题
    const theme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const actualTheme = theme === 'system' || !theme ? systemTheme : theme;
    
    // 立即应用主题�?    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'light-theme', 'dark-theme');
    root.classList.add(actualTheme, actualTheme + '-theme');
    root.setAttribute('data-theme', actualTheme);
    
    // 设置CSS变量
    if (actualTheme === 'dark') {
      root.style.setProperty('--bg-primary', '#1f2937');
      root.style.setProperty('--bg-secondary', '#374151');
      root.style.setProperty('--bg-tertiary', '#4b5563');
      root.style.setProperty('--text-primary', '#f9fafb');
      root.style.setProperty('--text-secondary', '#d1d5db');
      root.style.setProperty('--text-tertiary', '#9ca3af');
      root.style.setProperty('--border-primary', '#4b5563');
      root.style.setProperty('--border-secondary', '#6b7280');
      root.style.setProperty('--border-tertiary', '#9ca3af');
    } else {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f9fafb');
      root.style.setProperty('--bg-tertiary', '#f3f4f6');
      root.style.setProperty('--text-primary', '#111827');
      root.style.setProperty('--text-secondary', '#374151');
      root.style.setProperty('--text-tertiary', '#6b7280');
      root.style.setProperty('--border-primary', '#d1d5db');
      root.style.setProperty('--border-secondary', '#9ca3af');
      root.style.setProperty('--border-tertiary', '#6b7280');
    }
  } catch (e) {
    Logger.warn('Theme initialization failed:', e);
  }
})();
`;

/**
 * 防止主题闪烁组件
 */
export const PreventFlashOnWrongTheme: React.FC<PreventFlashOnWrongThemeProps> = ({
  ssrTheme = false,
  defaultTheme = 'light'
}) => {
  // 如果有服务端主题，不需要防闪烁脚本
  if (ssrTheme) {
    return null;
  }

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: themeScript
      }}
    />
  );
};

/**
 * 主题初始化Hook
 * 确保主题在客户端正确初始�? */
const useThemeInitialization = () => {
  React.useEffect(() => {
    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const currentTheme = localStorage.getItem('theme');
      
      // 只有当用户选择跟随系统时才更新
      if (currentTheme === 'system' || !currentTheme) {
        const newTheme = e?.matches ? 'dark' : 'light';
        const root = document.documentElement;
        
        root.classList.remove('light', 'dark', 'light-theme', 'dark-theme');
        root.classList.add(newTheme, newTheme + '-theme');
        root.setAttribute('data-theme', newTheme);
        
        // 触发自定义事件通知主题变化
        window.dispatchEvent(new CustomEvent('themechange', {
          detail: { theme: newTheme, source: 'system' }
        }));
      }
    };
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);
};

/**
 * 主题同步Hook
 * 确保React状态与DOM状态同�? */
const useThemeSync = () => {
  const [theme, setTheme] = React.useState<string>('light');
  
  React.useEffect(() => {
    // 从DOM获取当前主题
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(currentTheme);
    
    // 监听主题变化事件
    const handleThemeChange = (e: CustomEvent) => {
      setTheme(e?.detail.theme);
    };
    
    window.addEventListener('themechange', handleThemeChange as EventListener);
    
    return () => {
      window.removeEventListener('themechange', handleThemeChange as EventListener);
    };
  }, []);
  
  return theme;
};

export default PreventFlashOnWrongTheme;
