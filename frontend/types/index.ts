/**
 * 类型定义入口
 */

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string
}

export interface PaginationParams {
  page: number;
  pageSize: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number
  }
}

// export * from '../services/types/versionTypes'; // 暂时注释掉，文件不存在
