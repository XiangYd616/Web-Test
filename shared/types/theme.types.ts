/**
 * theme.types.ts - 主题类型定义
 */

export type ThemeMode = 'light' | 'dark' | 'auto' | 'system';

export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  background: string;
  foreground: string;
  muted: string;
  accent: string;
}

export interface ThemeConfig {
  mode: ThemeMode;
  colors: ThemeColors;
  fontFamily?: string;
  fontSize?: string;
  borderRadius?: string;
  spacing?: Record<string, string>;
}

export interface Theme {
  id: string;
  name: string;
  config: ThemeConfig;
  isDark: boolean;
}

