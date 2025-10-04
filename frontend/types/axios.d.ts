/**
 * Axios类型扩展
 * 版本: v2.0.0
 */

import 'axios';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      startTime?: number;
      requestId?: string;
      retryCount?: number;
      operation?: string;
      context?: Record<string, any>;
      [key: string]: any;
    };
  }

  export interface AxiosRequestConfig {
    metadata?: {
      startTime?: number;
      requestId?: string;
      retryCount?: number;
      operation?: string;
      context?: Record<string, any>;
      [key: string]: any;
    };
  }
}
