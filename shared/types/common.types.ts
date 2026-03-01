/**
 * common.types.ts - 通用类型定义
 */

export interface FlexibleObject {
  [key: string]: any;
  [key: number]: any;
}

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type Email = string;
export type Timestamp = number | string | Date;
export type URL = string;
export type UUID = string;

export interface APIResponse<T = any> {
  status: number;
  message?: string;
  error?: string;
  data?: T;
  success?: boolean;
  timestamp?: number;
  errors?: string[];
}

export interface APIError {
  error: string;
  message: string;
  status: number;
  code?: string;
  details?: any;
}

