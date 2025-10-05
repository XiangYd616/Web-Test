/**
 * version.types.ts - 版本类型定义
 */

export interface Version {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

export interface VersionInfo {
  version: string;
  versionNumber: Version;
  buildDate: string;
  gitCommit?: string;
  gitBranch?: string;
}

export interface CompatibilityVersion {
  minimum: string;
  maximum?: string;
  recommended: string;
}

