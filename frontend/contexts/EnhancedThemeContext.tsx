/**
 * 增强版主题上下文
 * 提供完整的主题管理、深色/浅色模式切换和主题定制功能
 */

import React, { createContext, ReactNode, useContext, useEffect, useState, useCallback } from 'react

// 主题类型定义
export type ThemeMode = 'light' | 'dark' | 'auto
export type ActualTheme = 'light' | 'dark
// 主题配置接口
export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  borderColor: string;
  shadowColor: string;
  fontSize: 'small' | 'medium' | 'large
  borderRadius: 'none' | 'small' | 'medium' | 'large
  spacing: 'compact' | 'normal' | 'comfortable
}

// 预定义主题
export const lightTheme: ThemeConfig = {
  primaryColor: '#3B82F6',
  secondaryColor: '#6B7280',
  accentColor: '#10B981',
  backgroundColor: '#FFFFFF',
  surfaceColor: '#F9FAFB',
  textColor: '#111827',
  borderColor: '#E5E7EB',
  shadowColor: 'rgba(0, 0, 0, 0.1)',
  fontSize: 'medium',
  borderRadius: 'medium',
  spacing: 'normal
};

export const darkTheme: ThemeConfig = {
  primaryColor: '#60A5FA',
  secondaryColor: '#9CA3AF',
  accentColor: '#34D399',
  backgroundColor: '#111827',
  surfaceColor: '#1F2937',
  textColor: '#F9FAFB',
  borderColor: '#374151',
  shadowColor: 'rgba(0, 0, 0, 0.3)',
  fontSize: 'medium',
  borderRadius: 'medium',
  spacing: 'normal
};

// 主题上下文类型
interface EnhancedThemeContextType {
  // 基础主题
  theme: ThemeMode;
  actualTheme: ActualTheme;
  themeConfig: ThemeConfig;
  
  // 主题控制
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  
  // 主题定制
  updateThemeConfig: (config: Partial<ThemeConfig>) => void;
  resetThemeConfig: () => void;
  
  // 系统主题检测
  systemTheme: ActualTheme;
  isSystemThemeSupported: boolean;
  
  // 主题预设
  applyPreset: (preset: 'default' | 'high-contrast' | 'colorful' | 'minimal') => void;
  
  // 辅助功能
  isHighContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  
  // 动画控制
  reduceMotion: boolean;
  setReduceMotion: (enabled: boolean) => void;
}

const EnhancedThemeContext = createContext<EnhancedThemeContextType | undefined>(undefined);

export const useEnhancedTheme = () => {
  const context = useContext(EnhancedThemeContext);
  if (context === undefined) {
    throw new Error('useEnhancedTheme must be used within an EnhancedThemeProvider');
  }
  return context;
};

interface EnhancedThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeMode;
  customThemes?: Record<string, ThemeConfig>;
}

export const EnhancedThemeProvider: React.FC<EnhancedThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'auto',
  customThemes = {}
}) => {
  // 系统主题检测
  const [systemTheme, setSystemTheme] = useState<ActualTheme>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light
    }
    return 'light
  });

  const [isSystemThemeSupported] = useState(() => {
    return typeof window !== 'undefined' && window.matchMedia !== undefined;
  });

  // 主题状态
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    
    const savedTheme = localStorage.getItem('theme') as ThemeMode;
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      return savedTheme;
    }
    return defaultTheme;
  });

  // 主题配置
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => {
    if (typeof window === 'undefined') return lightTheme;
    
    const savedConfig = localStorage.getItem('themeConfig');
    if (savedConfig) {
      try {
        return { ...lightTheme, ...JSON.parse(savedConfig) };
      } catch {
        return lightTheme;
      }
    }
    return lightTheme;
  });

  // 辅助功能状态
  const [isHighContrast, setIsHighContrast] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('highContrast') === 'true
  });

  const [reduceMotion, setReduceMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    
    // 检查系统设置
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return true;
    }
    
    return localStorage.getItem('reduceMotion') === 'true
  });

  // 计算实际主题
  const actualTheme: ActualTheme = theme === 'auto' ? systemTheme : theme;

  // 设置主题
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  }, []);

  // 切换主题
  const toggleTheme = useCallback(() => {
    if (theme === 'auto') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('dark');
    } else {
      setTheme('auto');
    }
  }, [theme, setTheme]);

  // 更新主题配置
  const updateThemeConfig = useCallback((config: Partial<ThemeConfig>) => {
    const newConfig = { ...themeConfig, ...config };
    setThemeConfig(newConfig);
    localStorage.setItem('themeConfig', JSON.stringify(newConfig));
  }, [themeConfig]);

  // 重置主题配置
  const resetThemeConfig = useCallback(() => {
    const defaultConfig = actualTheme === 'dark' ? darkTheme : lightTheme;
    setThemeConfig(defaultConfig);
    localStorage.removeItem('themeConfig');
  }, [actualTheme]);

  // 应用预设主题
  const applyPreset = useCallback((preset: 'default' | 'high-contrast' | 'colorful' | 'minimal') => {
    let presetConfig: Partial<ThemeConfig>;
    
    switch (preset) {
      case 'high-contrast':
        presetConfig = {
          primaryColor: actualTheme === 'dark' ? '#FFFFFF' : '#000000',
          backgroundColor: actualTheme === 'dark' ? '#000000' : '#FFFFFF',
          textColor: actualTheme === 'dark' ? '#FFFFFF' : '#000000',
          borderColor: actualTheme === 'dark' ? '#FFFFFF' : '#000000
        };
        break;
      case 'colorful':
        presetConfig = {
          primaryColor: '#8B5CF6',
          secondaryColor: '#F59E0B',
          accentColor: '#EF4444',
          borderRadius: 'large
        };
        break;
      case 'minimal':
        presetConfig = {
          borderRadius: 'none',
          spacing: 'compact',
          shadowColor: 'transparent
        };
        break;
      default: undefined, // 已修复
        presetConfig = actualTheme === 'dark' ? darkTheme : lightTheme;
    }
    
    updateThemeConfig(presetConfig);
  }, [actualTheme, updateThemeConfig]);

  // 设置高对比度
  const setHighContrast = useCallback((enabled: boolean) => {
    setIsHighContrast(enabled);
    localStorage.setItem('highContrast', enabled.toString());
    
    if (enabled) {
      applyPreset('high-contrast');
    } else {
      resetThemeConfig();
    }
  }, [applyPreset, resetThemeConfig]);

  // 设置减少动画
  const setReduceMotion = useCallback((enabled: boolean) => {
    setReduceMotion(enabled);
    localStorage.setItem('reduceMotion', enabled.toString());
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    if (!isSystemThemeSupported) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isSystemThemeSupported]);

  // 应用主题到DOM
  useEffect(() => {
    const root = document.documentElement;
    const currentConfig = actualTheme === 'dark' ? { ...darkTheme, ...themeConfig } : { ...lightTheme, ...themeConfig };

    // 设置CSS变量
    root.style.setProperty('--color-primary', currentConfig.primaryColor);
    root.style.setProperty('--color-secondary', currentConfig.secondaryColor);
    root.style.setProperty('--color-accent', currentConfig.accentColor);
    root.style.setProperty('--color-background', currentConfig.backgroundColor);
    root.style.setProperty('--color-surface', currentConfig.surfaceColor);
    root.style.setProperty('--color-text', currentConfig.textColor);
    root.style.setProperty('--color-border', currentConfig.borderColor);
    root.style.setProperty('--color-shadow', currentConfig.shadowColor);

    // 设置主题类
    root.classList.remove('light', 'dark');
    root.classList.add(actualTheme);

    // 设置辅助功能类
    root.classList.toggle('high-contrast', isHighContrast);
    root.classList.toggle('reduce-motion', reduceMotion);

    // 设置字体大小
    const fontSizeMap = { small: '14px', medium: '16px', large: '18px' };
    root.style.setProperty('--font-size-base', fontSizeMap[currentConfig.fontSize]);

    // 设置边框圆角
    const borderRadiusMap = { none: '0', small: '4px', medium: '8px', large: '12px' };
    root.style.setProperty('--border-radius', borderRadiusMap[currentConfig.borderRadius]);

    // 设置间距
    const spacingMap = { compact: '0.5rem', normal: '1rem', comfortable: '1.5rem' };
    root.style.setProperty('--spacing-base', spacingMap[currentConfig.spacing]);

    // 更新meta标签
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', currentConfig.primaryColor);
    }
  }, [actualTheme, themeConfig, isHighContrast, reduceMotion]);

  const contextValue: EnhancedThemeContextType = {
    theme,
    actualTheme,
    themeConfig,
    setTheme,
    toggleTheme,
    updateThemeConfig,
    resetThemeConfig,
    systemTheme,
    isSystemThemeSupported,
    applyPreset,
    isHighContrast,
    setHighContrast,
    reduceMotion,
    setReduceMotion
  };

  return (
    <EnhancedThemeContext.Provider value={contextValue}>
      {children}
    </EnhancedThemeContext.Provider>
  );
};

export default EnhancedThemeProvider;
