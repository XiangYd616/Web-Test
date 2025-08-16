/**
 * 主题系统
 * 基于设计令牌的主题配置
 */

import { colors, typography, spacing, shadows, borderRadius, transitions } from './tokens';

// 主题接口定义
export interface Theme {
  name: string;
  colors: typeof colors;
  typography: typeof typography;
  spacing: typeof spacing;
  shadows: typeof shadows;
  borderRadius: typeof borderRadius;
  transitions: typeof transitions;
  mode: 'light' | 'dark';
}

// 浅色主题
export const lightTheme: Theme = {
  name: 'light',
  mode: 'light',
  colors: {
    ...colors,
    background: {
      primary: '#ffffff',
      secondary: '#f8f9fa',
      tertiary: '#e9ecef'
    },
    text: {
      primary: '#212529',
      secondary: '#6c757d',
      disabled: '#adb5bd'
    },
    border: {
      primary: '#dee2e6',
      secondary: '#e9ecef'
    }
  },
  typography,
  spacing,
  shadows,
  borderRadius,
  transitions
};

// 深色主题
export const darkTheme: Theme = {
  name: 'dark',
  mode: 'dark',
  colors: {
    ...colors,
    background: {
      primary: '#121212',
      secondary: '#1e1e1e',
      tertiary: '#2d2d2d'
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
      disabled: '#666666'
    },
    border: {
      primary: '#404040',
      secondary: '#333333'
    }
  },
  typography,
  spacing,
  shadows,
  borderRadius,
  transitions
};

// 主题管理器
export class ThemeManager {
  private currentTheme: Theme = lightTheme;
  private listeners: ((theme: Theme) => void)[] = [];

  constructor() {
    // 从localStorage恢复主题设置
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.currentTheme = darkTheme;
    }

    // 监听系统主题变化
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addListener(this.handleSystemThemeChange.bind(this));
    }
  }

  getCurrentTheme(): Theme {
    return this.currentTheme;
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    localStorage.setItem('theme', theme.name);
    this.applyTheme(theme);
    this.notifyListeners(theme);
  }

  toggleTheme(): void {
    const newTheme = this.currentTheme.mode === 'light' ? darkTheme : lightTheme;
    this.setTheme(newTheme);
  }

  subscribe(listener: (theme: Theme) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;

    // 应用CSS变量
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (typeof value === 'object') {
        Object.entries(value).forEach(([subKey, subValue]) => {
          root.style.setProperty(`--color-${key}-${subKey}`, subValue);
        });
      } else {
        root.style.setProperty(`--color-${key}`, value);
      }
    });

    // 应用字体变量
    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value);
    });

    // 应用间距变量
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });

    // 应用阴影变量
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });

    // 设置主题类名
    root.className = root.className.replace(/theme-\w+/g, '');
    root.classList.add(`theme-${theme.name}`);
  }

  private handleSystemThemeChange(e: MediaQueryListEvent): void {
    if (!localStorage.getItem('theme')) {
      const newTheme = e.matches ? darkTheme : lightTheme;
      this.setTheme(newTheme);
    }
  }

  private notifyListeners(theme: Theme): void {
    this.listeners.forEach(listener => listener(theme));
  }
}

// 创建全局主题管理器实例
export const themeManager = new ThemeManager();

export default {
  lightTheme,
  darkTheme,
  ThemeManager,
  themeManager
};