/**
 * 版本控制相关类型定义
 */

export interface Version     {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

export interface VersionInfo     {
  version: Version;
  versionString: string;
  releaseDate: Date;
  changelog?: string[];
  isStable: boolean;
  isLatest: boolean;
}

export interface VersionHistory     {
  versions: VersionInfo[];
  currentVersion: VersionInfo;
  latestVersion: VersionInfo;
}

export interface VersionComparison     {
  current: Version;
  target: Version;
  result: 'newer' | 'older' | 'same';
  difference: {
    major: number;
    minor: number;
    patch: number;
  };
}

export interface VersionUpdate     {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  updateType: 'major' | 'minor' | 'patch';
  changelog?: string[];
  downloadUrl?: string;
  releaseNotes?: string;
}

export interface VersionConfig     {
  checkInterval: number; // 检查更新间隔（毫秒）
  autoCheck: boolean;
  includePrerelease: boolean;
  updateChannel: 'stable' | 'beta' | 'alpha';
}

export interface VersionMetadata     {
  buildNumber: string;
  buildDate: Date;
  commitHash: string;
  branch: string;
  environment: 'development' | 'staging' | 'production';
  features: string[];
  dependencies: Record<string, string>;
}

export interface VersionCompatibility     {
  minVersion: Version;
  maxVersion?: Version;
  supportedVersions: Version[];
  deprecatedVersions: Version[];
  incompatibleVersions: Version[];
}

export interface VersionMigration     {
  fromVersion: Version;
  toVersion: Version;
  migrationSteps: VersionMigrationStep[];
  isRequired: boolean;
  estimatedTime: number; // 预估迁移时间（分钟）
}

export interface VersionMigrationStep     {
  id: string;
  title: string;
  description: string;
  type: 'data' | 'config' | 'schema' | 'cleanup';
  isReversible: boolean;
  execute: () => Promise<void>;
  rollback?: () => Promise<void>;
}

export interface VersionValidation     {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface VersionRelease     {
  version: Version;
  releaseDate: Date;
  title: string;
  description: string;
  type: 'major' | 'minor' | 'patch' | 'hotfix';
  features: VersionFeature[];
  bugFixes: VersionBugFix[];
  breakingChanges: VersionBreakingChange[];
  deprecations: VersionDeprecation[];
  security: VersionSecurityFix[];
}

export interface VersionFeature     {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: 'low' | 'medium' | 'high';
  documentation?: string;
}

export interface VersionBugFix     {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedVersions: Version[];
  issueUrl?: string;
}

export interface VersionBreakingChange     {
  id: string;
  title: string;
  description: string;
  impact: string;
  migrationGuide: string;
  affectedAPIs: string[];
}

export interface VersionDeprecation     {
  id: string;
  feature: string;
  deprecatedIn: Version;
  removedIn: Version;
  replacement?: string;
  migrationGuide?: string;
}

export interface VersionSecurityFix     {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cveId?: string;
  affectedVersions: Version[];
}

export interface VersionNotification     {
  id: string;
  type: 'update' | 'security' | 'deprecation' | 'migration';
  title: string;
  message: string;
  version: Version;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionRequired: boolean;
  actionUrl?: string;
  dismissible: boolean;
  expiresAt?: Date;
}

export interface VersionAnalytics     {
  versionUsage: Record<string, number>;
  updateAdoption: {
    version: string;
    adoptionRate: number;
    timeToAdopt: number; // 平均采用时间（天）
  }[];
  migrationSuccess: {
    fromVersion: string;
    toVersion: string;
    successRate: number;
    averageTime: number;
  }[];
  errorRates: Record<string, number>;
}

export interface VersionPreferences     {
  autoUpdate: boolean;
  updateChannel: 'stable' | 'beta' | 'alpha';
  notificationSettings: {
    updates: boolean;
    security: boolean;
    deprecations: boolean;
    migrations: boolean;
  };
  backupBeforeUpdate: boolean;
  rollbackEnabled: boolean;
}

// 版本比较函数类型
export type VersionComparator   = (a: Version, b: Version) => number;// 版本格式化函数类型
export type VersionFormatter   = (version: Version) => string;// 版本解析函数类型
export type VersionParser   = (versionString: string) => Version | null;// 版本验证函数类型
export type VersionValidator   = (version: Version) => VersionValidation;// 版本更新检查函数类型
export type VersionUpdateChecker   = () => Promise<VersionUpdate>;// 版本迁移执行函数类型
export type VersionMigrationExecutor   = (migration: VersionMigration) => Promise<boolean>;// 常用版本常量
export const VERSION_PATTERNS = {
  SEMANTIC: /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*))?(?:\+([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*))?$/,
  SIMPLE: /^(\d+)\.(\d+)\.(\d+)$/,
  WITH_V: /^v(\d+)\.(\d+)\.(\d+)$/
} as const;

export const VERSION_CHANNELS = {
  STABLE: 'stable','
  BETA: 'beta','
  ALPHA: 'alpha','
  NIGHTLY: 'nightly';
} as const;

export const UPDATE_TYPES = {
  MAJOR: 'major','
  MINOR: 'minor','
  PATCH: 'patch','
  PRERELEASE: 'prerelease';
} as const;

export const MIGRATION_TYPES = {
  DATA: 'data','
  CONFIG: 'config','
  SCHEMA: 'schema','
  CLEANUP: 'cleanup';
} as const;

export const NOTIFICATION_TYPES = {
  UPDATE: 'update','
  SECURITY: 'security','
  DEPRECATION: 'deprecation','
  MIGRATION: 'migration';
} as const;

export const PRIORITY_LEVELS = {
  LOW: 'low','
  MEDIUM: 'medium','
  HIGH: 'high','
  CRITICAL: 'critical';
} as const;
