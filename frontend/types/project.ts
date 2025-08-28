/**
 * 项目相关类型定义
 * 版本: v2.0.0
 */

import type { ApiResponse } from './unified/apiResponse.types';

// 项目状态枚举
export enum ProjectStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

// 项目类型枚举
export enum ProjectType {
  WEB = 'web',
  MOBILE = 'mobile',
  API = 'api',
  DESKTOP = 'desktop'
}

// 项目基础信息
export interface Project {
  id: string;
  name: string;
  description?: string;
  type: ProjectType;
  status: ProjectStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  settings?: ProjectSettings;
  metadata?: Record<string, any>;
}

// 项目设置
export interface ProjectSettings {
  testingEnabled: boolean;
  monitoringEnabled: boolean;
  notificationsEnabled: boolean;
  maxTestsPerDay?: number;
  allowedTestTypes: string[];
  customSettings?: Record<string, any>;
}

// 项目成员
export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  permissions: string[];
  joinedAt: string;
}

// 项目角色枚举
export enum ProjectRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

// 项目统计信息
export interface ProjectStats {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  averageScore: number;
  lastTestDate?: string;
  testsByType: Record<string, number>;
}

// 项目创建请求
export interface CreateProjectRequest {
  name: string;
  description?: string;
  type?: ProjectType;
  target_url?: string;
  settings?: Partial<ProjectSettings>;
}

// 项目更新请求
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  settings?: Partial<ProjectSettings>;
}

// 项目查询参数
export interface ProjectQuery {
  status?: ProjectStatus;
  type?: ProjectType;
  ownerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// API响应类型
export type ProjectResponse = ApiResponse<Project>;
export type ProjectListResponse = ApiResponse<Project[]>;
export type ProjectStatsResponse = ApiResponse<ProjectStats>;

// 基于Context7最佳实践：移除重复导出语句
// 所有类型已通过 export interface/type 关键字直接导出
// 避免TS2484导出声明冲突错误

