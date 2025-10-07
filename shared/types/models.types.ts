/**
 * models.types.ts - 数据模型类型定义
 */

export interface BaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ModelPaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

// Removed PaginatedResponse - use the version from api.types.ts instead
// to avoid type conflicts

export interface ModelSortParams {
  field: string;
  order: 'asc' | 'desc';
}

export interface ModelFilterParams {
  [key: string]: any;
}

export interface ModelQueryParams {
  pagination?: ModelPaginationParams;
  sort?: ModelSortParams;
  filters?: ModelFilterParams;
}

