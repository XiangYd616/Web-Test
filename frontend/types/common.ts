// 常用类型定义
export type UUID = string;
export type Timestamp = string;
export type URL = string;
export type Email = string;

export interface BaseProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number
}

export interface SearchParams {
  keyword?: string;
  filters?: Record<string, any>
  sort?: string;
  order?: 'asc' | 'desc';
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
export type ThemeMode = 'light' | 'dark' | 'auto';
export type Language = 'zh-CN' | 'en-US';
// 工具类型;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
