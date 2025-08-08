/**
 * 数据模型版本控制
 * 记录API和类型定义的版本信息，确保前后端兼容性
 * 版本: v2.0.0
 */

// ==================== 版本信息 ====================

/**
 * 当前数据模型版本
 */
export const DATA_MODEL_VERSION = '2.0.0';

/**
 * API版本信息
 */
export const API_VERSION = '1.0.0';

/**
 * 最低兼容版本
 */
export const MIN_COMPATIBLE_VERSION = '1.0.0';

// ==================== 版本历史 ====================

/**
 * 版本变更历史
 */
export interface VersionHistory {
  version: string;
  date: string;
  changes: VersionChange[];
  breaking: boolean;
  migration?: string;
}

/**
 * 版本变更类型
 */
export interface VersionChange {
  type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';
  component: 'api' | 'types' | 'database' | 'frontend' | 'backend';
  description: string;
  impact: 'low' | 'medium' | 'high';
  migration?: string;
}

/**
 * 版本变更历史记录
 */
export const VERSION_HISTORY: VersionHistory[] = [
  {
    version: '2.0.0',
    date: '2024-08-08',
    breaking: false,
    changes: [
      {
        type: 'added',
        component: 'types',
        description: '创建统一的数据模型定义文件 src/types/unified/models.ts',
        impact: 'medium',
        migration: '更新导入路径到统一类型定义'
      },
      {
        type: 'added',
        component: 'types',
        description: '添加测试相关的TypeScript接口和枚举',
        impact: 'low'
      },
      {
        type: 'changed',
        component: 'backend',
        description: '后端Test.js模型添加TestType和TestStatus枚举',
        impact: 'low'
      },
      {
        type: 'changed',
        component: 'types',
        description: '重构src/services/types/user.ts为重新导出统一类型',
        impact: 'low',
        migration: '检查导入路径是否正确'
      },
      {
        type: 'deprecated',
        component: 'backend',
        description: 'ApiResponse.js中间件标记为废弃，推荐使用responseFormatter',
        impact: 'low',
        migration: '迁移到responseFormatter中间件'
      },
      {
        type: 'added',
        component: 'api',
        description: '统一API响应格式验证和数据转换函数',
        impact: 'medium'
      }
    ]
  },
  {
    version: '1.0.0',
    date: '2024-08-01',
    breaking: false,
    changes: [
      {
        type: 'added',
        component: 'types',
        description: '初始化统一类型定义系统',
        impact: 'high'
      },
      {
        type: 'added',
        component: 'api',
        description: '建立统一API响应格式',
        impact: 'high'
      },
      {
        type: 'added',
        component: 'database',
        description: '建立数据库字段映射机制',
        impact: 'high'
      }
    ]
  }
];

// ==================== 兼容性检查 ====================

/**
 * 检查版本兼容性
 */
export function isVersionCompatible(version: string): boolean {
  const [major, minor] = version.split('.').map(Number);
  const [minMajor, minMinor] = MIN_COMPATIBLE_VERSION.split('.').map(Number);
  
  if (major > minMajor) return true;
  if (major === minMajor && minor >= minMinor) return true;
  
  return false;
}

/**
 * 获取版本信息
 */
export function getVersionInfo() {
  return {
    current: DATA_MODEL_VERSION,
    api: API_VERSION,
    minCompatible: MIN_COMPATIBLE_VERSION,
    lastUpdated: VERSION_HISTORY[0]?.date || 'Unknown'
  };
}

/**
 * 获取特定版本的变更信息
 */
export function getVersionChanges(version: string): VersionHistory | undefined {
  return VERSION_HISTORY.find(v => v.version === version);
}

/**
 * 获取破坏性变更列表
 */
export function getBreakingChanges(): VersionHistory[] {
  return VERSION_HISTORY.filter(v => v.breaking);
}

/**
 * 获取迁移指南
 */
export function getMigrationGuide(fromVersion: string, toVersion: string): string[] {
  const migrations: string[] = [];
  
  // 找到版本范围内的所有变更
  const fromIndex = VERSION_HISTORY.findIndex(v => v.version === fromVersion);
  const toIndex = VERSION_HISTORY.findIndex(v => v.version === toVersion);
  
  if (fromIndex === -1 || toIndex === -1) {
    return ['版本信息不存在，请检查版本号'];
  }
  
  // 收集迁移指南
  for (let i = toIndex; i < fromIndex; i++) {
    const version = VERSION_HISTORY[i];
    if (version.migration) {
      migrations.push(`${version.version}: ${version.migration}`);
    }
    
    version.changes.forEach(change => {
      if (change.migration) {
        migrations.push(`${version.version} (${change.component}): ${change.migration}`);
      }
    });
  }
  
  return migrations;
}

// ==================== 类型定义版本 ====================

/**
 * 类型定义版本映射
 */
export const TYPE_VERSIONS = {
  User: '2.0.0',
  TestResult: '2.0.0',
  TestHistory: '2.0.0',
  ApiResponse: '2.0.0',
  ApiSuccessResponse: '2.0.0',
  ApiErrorResponse: '2.0.0',
  PaginatedResponse: '2.0.0'
} as const;

/**
 * 获取类型定义版本
 */
export function getTypeVersion(typeName: keyof typeof TYPE_VERSIONS): string {
  return TYPE_VERSIONS[typeName] || '1.0.0';
}

/**
 * 验证类型定义版本兼容性
 */
export function validateTypeCompatibility(typeName: string, requiredVersion: string): boolean {
  const currentVersion = TYPE_VERSIONS[typeName as keyof typeof TYPE_VERSIONS];
  if (!currentVersion) return false;
  
  return isVersionCompatible(requiredVersion);
}

// ==================== 导出版本信息 ====================

/**
 * 完整的版本信息对象
 */
export const VERSION_INFO = {
  dataModel: DATA_MODEL_VERSION,
  api: API_VERSION,
  minCompatible: MIN_COMPATIBLE_VERSION,
  history: VERSION_HISTORY,
  types: TYPE_VERSIONS,
  
  // 工具函数
  isCompatible: isVersionCompatible,
  getInfo: getVersionInfo,
  getChanges: getVersionChanges,
  getBreaking: getBreakingChanges,
  getMigration: getMigrationGuide,
  getTypeVersion,
  validateType: validateTypeCompatibility
} as const;

export default VERSION_INFO;
