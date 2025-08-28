/**
 * 版本相关类型定义
 * 版本: v2.0.0
 */

// 版本信息类型
export interface VersionInfo {
  major: number;
  minor: number;
  patch: number;
  build?: string;
  prerelease?: string;
}

// 版本字符串类型
export type VersionString = string;

// 版本比较结果
export type VersionComparison = -1 | 0 | 1;

// API版本类型
export interface ApiVersion {
  version: VersionString;
  deprecated?: boolean;
  supportedUntil?: string;
  changelog?: string;
}

// 应用版本类型
export interface AppVersion {
  app: VersionString;
  api: VersionString;
  build: string;
  timestamp: string;
}

// 兼容性信息
export interface CompatibilityInfo {
  minVersion: VersionString;
  maxVersion?: VersionString;
  deprecated: boolean;
  breaking: boolean;
}

// 版本管理器接口
export interface VersionManager {
  getCurrentVersion(): VersionString;
  isCompatible(version: VersionString): boolean;
  compareVersions(v1: VersionString, v2: VersionString): VersionComparison;
  parseVersion(version: VersionString): VersionInfo;
}

// 版本化数据接口
export interface VersionedData<T = any> {
  version: VersionString;
  data: T;
  timestamp: string;
  checksum?: string;
  metadata?: Record<string, any>;
}

// 基于Context7最佳实践：移除重复导出语句
// 所有类型已通过 export interface/type 关键字直接导出
// 避免TS2484导出声明冲突错误

