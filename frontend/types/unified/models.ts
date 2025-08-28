/**
 * 统一模型类型定义
 * 版本: v2.0.0
 */

// 重新导出所有基础类型
export * from '../project';
export * from '../user';
export * from './apiResponse.types';

// 重新导出认证响应类型（为了向后兼容）
export type { AuthResponse } from '../user';

// 基础实体接口
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// 可软删除实体接口
export interface SoftDeletableEntity extends BaseEntity {
  deletedAt?: string;
  isDeleted: boolean;
}

// 用户拥有的实体接口
export interface UserOwnedEntity extends BaseEntity {
  userId: string;
  ownerId: string;
}

// 标签化实体接口
export interface TaggableEntity extends BaseEntity {
  tags: string[];
  categories: string[];
}

// 版本化实体接口
export interface VersionedEntity extends BaseEntity {
  version: number;
  previousVersionId?: string;
}

// 审计实体接口
export interface AuditableEntity extends BaseEntity {
  createdBy: string;
  updatedBy: string;
  auditLog?: AuditLogEntry[];
}

// 审计日志条目
export interface AuditLogEntry {
  id: string;
  action: string;
  userId: string;
  timestamp: string;
  changes: Record<string, any>;
  metadata?: Record<string, any>;
}

// 状态机实体接口
export interface StateMachineEntity extends BaseEntity {
  status: string;
  statusHistory: StatusHistoryEntry[];
}

// 状态历史条目
export interface StatusHistoryEntry {
  id: string;
  fromStatus: string;
  toStatus: string;
  userId: string;
  timestamp: string;
  reason?: string;
}

// 配置实体接口
export interface ConfigurableEntity extends BaseEntity {
  config: Record<string, any>;
  schema?: Record<string, any>;
}

// 可搜索实体接口
export interface SearchableEntity extends BaseEntity {
  searchableText: string;
  searchKeywords: string[];
  searchMetadata?: Record<string, any>;
}

// 基于Context7最佳实践：移除重复导出语句
// 所有类型已通过 export interface/type 关键字直接导出
// 避免TS2484导出声明冲突错误

