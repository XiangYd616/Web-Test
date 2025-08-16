/**
 * 版本控制集成服务
 * 统一管理数据模型版本、迁移、兼容性检查
 * 版本: v1.0.0
 */

import type {
  Version
} from '../types/versionTypes';
import {
  ApiVersionNegotiator,
  AutoMigrationSystem,
  autoMigrationSystem,
  CompatibilityChecker,
  DATA_MODEL_VERSION,
  TypeVersionRegistry,
  VERSION_INFO,
  VersionChecker,
  VersionedDataWrapper
} from '../types/versionTypes';

// 定义本地类型，避免重复导入
export interface VersionedData {
  version: Version;
  data: any;
  metadata?: Record<string, any>;
}

export interface DataMigration {
  fromVersion: Version;
  toVersion: Version;
  migrate: (data: any) => any;
}

export interface ApiVersionNegotiation {
  clientVersion: Version;
  serverVersion: Version;
  negotiatedVersion: Version;
}
// // // // import {defaultMemoryCache} from './cacheStrategy'; // 已删除 // 已删除 // 服务已删除 // 服务已删除

// ==================== 版本控制配置 ====================

export interface VersionControlConfig {
  enableAutoMigration: boolean;
  enableCompatibilityCheck: boolean;
  enableVersionCache: boolean;
  cacheTimeout: number;
  migrationTimeout: number;
  strictMode: boolean;
  logMigrations: boolean;
}

export interface MigrationResult<T = any> {
  success: boolean;
  data?: VersionedData<T>;
  error?: string;
  migrationPath?: string[];
  duration?: number;
  warnings?: string[];
}

export interface CompatibilityReport {
  overall: boolean;
  api: {
    compatible: boolean;
    warnings: string[];
    errors: string[];
  };
  dataModels: {
    compatible: boolean;
    incompatibleModels: string[];
    warnings: string[];
  };
  recommendations: string[];
}

// ==================== 版本控制服务 ====================

export class VersionControlService {
  private config: VersionControlConfig;
  private migrationSystem: AutoMigrationSystem;
  private migrationHistory = new Map<string, MigrationResult[]>();

  constructor(config: Partial<VersionControlConfig> = {}) {
    this.config = {
      enableAutoMigration: true,
      enableCompatibilityCheck: true,
      enableVersionCache: true,
      cacheTimeout: 3600000, // 1小时
      migrationTimeout: 30000, // 30秒
      strictMode: false,
      logMigrations: true,
      ...config
    };

    this.migrationSystem = autoMigrationSystem;
    this.setupDefaultMigrations();
  }

  // ==================== 版本检查 ====================

  /**
   * 检查客户端和服务器版本兼容性
   */
  async checkCompatibility(
    clientVersion: string,
    serverVersion: string,
    endpoints: string[] = [],
    dataModels: Record<string, string> = {}
  ): Promise<CompatibilityReport> {
    const cacheKey = `compatibility_${clientVersion}_${serverVersion}`;

    if (this.config.enableVersionCache) {
      const cached = await defaultMemoryCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const apiCheck = CompatibilityChecker.checkApiCompatibility(
      clientVersion,
      serverVersion,
      endpoints
    );

    const dataModelCheck = CompatibilityChecker.checkDataModelCompatibility(
      dataModels,
      this.getServerDataModels()
    );

    const report: CompatibilityReport = {
      overall: apiCheck.compatible && dataModelCheck.compatible,
      api: {
        compatible: apiCheck.compatible,
        warnings: apiCheck.warnings,
        errors: apiCheck.errors
      },
      dataModels: {
        compatible: dataModelCheck.compatible,
        incompatibleModels: dataModelCheck.incompatibleModels,
        warnings: dataModelCheck.warnings
      },
      recommendations: this.generateRecommendations(apiCheck, dataModelCheck)
    };

    if (this.config.enableVersionCache) {
      await defaultMemoryCache.set(cacheKey, report, undefined, this.config.cacheTimeout);
    }

    return report;
  }

  /**
   * 协商API版本
   */
  negotiateApiVersion(
    clientVersion: string,
    serverVersion: string,
    supportedVersions: string[] = [DATA_MODEL_VERSION]
  ): ApiVersionNegotiation {
    return ApiVersionNegotiator.negotiate(clientVersion, serverVersion, supportedVersions);
  }

  // ==================== 数据迁移 ====================

  /**
   * 迁移单个数据对象
   */
  async migrateData<T>(
    typeName: string,
    data: VersionedData<any> | any,
    targetVersion: string = DATA_MODEL_VERSION
  ): Promise<MigrationResult<T>> {
    const startTime = Date.now();
    const migrationId = `${typeName}_${Date.now()}`;

    try {
      // 包装数据为版本化格式
      const versionedData = this.ensureVersionedData(data);

      if (versionedData.version === targetVersion) {
        return {
          success: true,
          data: versionedData as VersionedData<T>,
          duration: Date.now() - startTime
        };
      }

      // 执行迁移
      const migrated = await Promise.race([
        this.migrationSystem.migrateData<T>(typeName, versionedData, targetVersion),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Migration timeout')), this.config.migrationTimeout)
        )
      ]);

      const result: MigrationResult<T> = {
        success: true,
        data: migrated,
        migrationPath: VersionChecker.getMigrationPath(typeName, versionedData.version, targetVersion),
        duration: Date.now() - startTime
      };

      // 记录迁移历史
      this.recordMigration(migrationId, result);

      if (this.config.logMigrations) {
        console.log(`Migration completed: ${typeName} from ${versionedData.version} to ${targetVersion}`, result);
      }

      return result;
    } catch (error) {
      const result: MigrationResult<T> = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };

      this.recordMigration(migrationId, result);

      if (this.config.strictMode) {
        throw error;
      }

      return result;
    }
  }

  /**
   * 批量迁移数据
   */
  async migrateBatch<T>(
    typeName: string,
    dataList: (VersionedData<any> | any)[],
    targetVersion: string = DATA_MODEL_VERSION,
    onProgress?: (completed: number, total: number, current?: MigrationResult<T>) => void
  ): Promise<MigrationResult<T>[]> {
    const results: MigrationResult<T>[] = [];

    for (let i = 0; i < dataList.length; i++) {
      const result = await this.migrateData<T>(typeName, dataList[i], targetVersion);
      results.push(result);
      onProgress?.(i + 1, dataList.length, result);
    }

    return results;
  }

  /**
   * 注册数据迁移
   */
  registerMigration<TFrom, TTo>(
    typeName: string,
    fromVersion: string,
    toVersion: string,
    migrator: (data: TFrom) => TTo,
    validator?: (data: TTo) => boolean
  ): void {
    const migration: DataMigration<TFrom, TTo> = {
      fromVersion,
      toVersion,
      migrate: migrator,
      validate: validator
    };

    this.migrationSystem.registerMigration(typeName, migration);
  }

  // ==================== 版本信息管理 ====================

  /**
   * 获取当前版本信息
   */
  getVersionInfo(): typeof VERSION_INFO {
    return VERSION_INFO;
  }

  /**
   * 获取类型版本信息
   */
  getTypeVersions(typeName?: string): any {
    if (typeName) {
      return TypeVersionRegistry.getVersions(typeName);
    }
    return TypeVersionRegistry.getAll();
  }

  /**
   * 注册类型版本
   */
  registerTypeVersion(
    name: string,
    version: string,
    validator?: (data: any) => boolean,
    schema?: any
  ): void {
    TypeVersionRegistry.register({
      name,
      version,
      validator,
      schema
    });
  }

  /**
   * 验证数据类型和版本
   */
  validateData(typeName: string, version: string, data: any): boolean {
    return TypeVersionRegistry.validate(typeName, version, data);
  }

  // ==================== 迁移历史管理 ====================

  /**
   * 获取迁移历史
   */
  getMigrationHistory(migrationId?: string): MigrationResult[] | MigrationResult | null {
    if (migrationId) {
      const history = this.migrationHistory.get(migrationId);
      return history ? history[0] : null;
    }

    const allHistory: MigrationResult[] = [];
    for (const history of this.migrationHistory.values()) {
      allHistory.push(...history);
    }

    return allHistory.sort((a, b) => (b.duration || 0) - (a.duration || 0));
  }

  /**
   * 清理迁移历史
   */
  clearMigrationHistory(olderThan?: number): void {
    if (olderThan) {
      const cutoff = Date.now() - olderThan;
      for (const [id, history] of this.migrationHistory.entries()) {
        const filtered = history.filter(h => (h.duration || 0) > cutoff);
        if (filtered.length === 0) {
          this.migrationHistory.delete(id);
        } else {
          this.migrationHistory.set(id, filtered);
        }
      }
    } else {
      this.migrationHistory.clear();
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 创建版本化数据包装器
   */
  createVersionedData<T>(data: T, version: string = DATA_MODEL_VERSION): VersionedDataWrapper<T> {
    return VersionedDataWrapper.create(data, version);
  }

  /**
   * 检查是否需要迁移
   */
  needsMigration(data: VersionedData<any> | any, targetVersion: string = DATA_MODEL_VERSION): boolean {
    const versionedData = this.ensureVersionedData(data);
    return VersionChecker.needsMigration(versionedData.version, targetVersion);
  }

  /**
   * 获取迁移路径
   */
  getMigrationPath(typeName: string, fromVersion: string, toVersion: string): string[] {
    return VersionChecker.getMigrationPath(typeName, fromVersion, toVersion);
  }

  // ==================== 私有方法 ====================

  private ensureVersionedData(data: VersionedData<any> | any): VersionedData<any> {
    if (data && typeof data === 'object' && 'version' in data && 'data' in data) {
      return data as VersionedData<any>;
    }

    return {
      version: '1.0.0', // 默认版本
      data,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'legacy'
      }
    };
  }

  private getServerDataModels(): Record<string, string> {
    // 这里应该从服务器获取数据模型版本信息
    // 目前返回默认版本
    return {
      'User': '1.0.0',
      'TestResult': '1.0.0',
      'ApiResponse': '1.0.0'
    };
  }

  private generateRecommendations(
    apiCheck: any,
    dataModelCheck: any
  ): string[] {
    const recommendations: string[] = [];

    if (!apiCheck.compatible) {
      recommendations.push('升级客户端到兼容的API版本');
    }

    if (!dataModelCheck.compatible) {
      recommendations.push('执行数据模型迁移以确保兼容性');
    }

    if (apiCheck.warnings.length > 0) {
      recommendations.push('检查API使用方式，避免使用已弃用的功能');
    }

    if (dataModelCheck.warnings.length > 0) {
      recommendations.push('更新数据模型定义以匹配服务器版本');
    }

    return recommendations;
  }

  private recordMigration(migrationId: string, result: MigrationResult): void {
    if (!this.migrationHistory.has(migrationId)) {
      this.migrationHistory.set(migrationId, []);
    }
    this.migrationHistory.get(migrationId)!.push(result);

    // 限制历史记录数量
    const history = this.migrationHistory.get(migrationId)!;
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  private setupDefaultMigrations(): void {
    // 设置默认的数据迁移
    // 这里可以注册常见的数据模型迁移

    // 示例：用户模型从1.0.0到1.1.0的迁移
    this.registerMigration(
      'User',
      '1.0.0',
      '1.1.0',
      (data: any) => ({
        ...data,
        preferences: data.preferences || {},
        profile: data.profile || {}
      }),
      (data: any) => data && data.preferences && data.profile
    );

    // 示例：测试结果模型迁移
    this.registerMigration(
      'TestResult',
      '1.0.0',
      '1.1.0',
      (data: any) => ({
        ...data,
        metadata: data.metadata || {},
        version: '1.1.0'
      }),
      (data: any) => data && data.metadata
    );
  }
}

// ==================== Hook集成 ====================

export function useVersionControl(config?: Partial<VersionControlConfig>) {
  const service = new VersionControlService(config);

  return {
    checkCompatibility: service.checkCompatibility.bind(service),
    migrateData: service.migrateData.bind(service),
    migrateBatch: service.migrateBatch.bind(service),
    needsMigration: service.needsMigration.bind(service),
    getVersionInfo: service.getVersionInfo.bind(service),
    createVersionedData: service.createVersionedData.bind(service),
    validateData: service.validateData.bind(service),
    getMigrationHistory: service.getMigrationHistory.bind(service)
  };
}

// ==================== 默认实例 ====================

export const defaultVersionControlService = new VersionControlService();

export default defaultVersionControlService;
