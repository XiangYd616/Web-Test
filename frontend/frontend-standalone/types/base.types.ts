// 基础组件类型定义
export interface BaseComponentProps {
  className?: string;
  'data-testid'?: string;
  children?: React.ReactNode;
}

export type ComponentSize = 'sm' | 'md' | 'lg' | 'xl';
export type ComponentColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error';
export type ComponentVariant = 'filled' | 'outlined' | 'text' | 'ghost';

// 回调函数类型
export type ProgressCallback = (progress: number, step: string, metrics?: unknown) => void;
export type CompletionCallback = (result: unknown) => void;
export type ErrorCallback = (error: string | Error) => void;

// 统一测试配置类型
export interface UnifiedTestConfig {
  testType: string;
  url?: string;
  timeout?: number;
  retries?: number;
  [key: string]: unknown;
}
