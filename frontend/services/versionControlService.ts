/**
 * �汾���Ƽ��ɷ���
 * ͳһ��������ģ�Ͱ汾��Ǩ�ơ������Լ��
 * �汾: v1.0.0
 */

import type {
  ApiVersionNegotiation,
  DataMigration,
  VersionedData
} from '../types/version.types';
import {
  ApiVersionNegotiator,
  AutoMigrationSystem,
  CompatibilityChecker,
  DATA_MODEL_VERSION,
  TypeVersionRegistry,
  VERSION_INFO,
  VersionChecker,
  VersionedDataWrapper
} from '../types/version.types';

const autoMigrationSystem = new AutoMigrationSystem();
import { defaultMemoryCache } from './cacheStrategy';

// ==================== �汾�������� ====================

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

// ==================== �汾���Ʒ��� ====================

export class VersionControlService {
  private config: VersionControlConfig;
  private migrationSystem: AutoMigrationSystem;
  private migrationHistory = new Map<string, MigrationResult[]>();

  constructor(config: Partial<VersionControlConfig> = {}) {
    this.config = {
      enableAutoMigration: true,
      enableCompatibilityCheck: true,
      enableVersionCache: true,
      cacheTimeout: 3600000, // 1Сʱ
      migrationTimeout: 30000, // 30��
      strictMode: false,
      logMigrations: true,
      ...config
    };

    this.migrationSystem = autoMigrationSystem;
    this.setupDefaultMigrations();
  }

  // ==================== �汾��� ====================

  /**
   * ���ͻ��˺ͷ������汾������
   */
  async checkCompatibility(
    clientVersion: string,
    serverVersion: string,
    endpoints: string[] = [],
    dataModels: Record<string, string> = {}
  ): Promise<CompatibilityReport> {

    /**

     * if���ܺ���

     * @param {Object} params - ��������

     * @returns {Promise<Object>} ���ؽ��

     */
    const cacheKey = `compatibility_${clientVersion}_${serverVersion}`;

    if (this.config.enableVersionCache) {
      /**
       * if���ܺ���
       * @param {Object} params - ��������
       * @returns {Promise<Object>} ���ؽ��
       */
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
   * Э��API�汾
   */
  negotiateApiVersion(
    clientVersion: string,
    serverVersion: string,
    supportedVersions: string[] = [DATA_MODEL_VERSION]
  ): ApiVersionNegotiation {
    return ApiVersionNegotiator.negotiate(clientVersion, serverVersion, supportedVersions);
  }

  // ==================== ����Ǩ�� ====================

  /**
   * Ǩ�Ƶ������ݶ���
   */
  async migrateData<T>(
    typeName: string,
    data: VersionedData<any> | any,
    targetVersion: string = DATA_MODEL_VERSION
  ): Promise<MigrationResult<T>> {
    const startTime = Date.now();
    const migrationId = `${typeName}_${Date.now()}`;

    try {
      // ��װ����Ϊ�汾����ʽ
      const versionedData = this.ensureVersionedData(data);

      if (versionedData.version === targetVersion) {
        return {
          success: true,
          data: versionedData as VersionedData<T>,
          duration: Date.now() - startTime
        };
      }

      // ִ��Ǩ��
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

      // ��¼Ǩ����ʷ
      this.recordMigration(migrationId, result);

      if (this.config.logMigrations) {
      }

      return result;
    } catch (error) {
      const result: MigrationResult<T> = {
        success: false,
        error: error instanceof Error ? error?.message : String(error),
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
   * ����Ǩ������
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
   * ע������Ǩ��
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

  // ==================== �汾��Ϣ���� ====================

  /**
   * ��ȡ��ǰ�汾��Ϣ
   */
  getVersionInfo(): typeof VERSION_INFO {
    return VERSION_INFO;
  }

  /**
   * ��ȡ���Ͱ汾��Ϣ
   */
  getTypeVersions(typeName?: string): unknown {
    if (typeName) {
      return TypeVersionRegistry.getVersions(typeName);
    }
    return TypeVersionRegistry.getAll();
  }

  /**
   * ע�����Ͱ汾
   */
  registerTypeVersion(
    name: string,
    version: string,
    validator?: (data: any) => boolean,
    schema?: any): void {
    TypeVersionRegistry.register({
      name,
      version,
      validator,
      schema
    });
  }

  /**
   * ��֤�������ͺͰ汾
   */
  validateData(typeName: string, version: string, data: any): boolean {
    return TypeVersionRegistry.validate(typeName, version, data);
  }

  // ==================== Ǩ����ʷ���� ====================

  /**
   * ��ȡǨ����ʷ
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

    return allHistory.sort((a, b) => (b.duration || 0) - (a?.duration || 0));
  }

  /**
   * ����Ǩ����ʷ
   */
  clearMigrationHistory(olderThan?: number): void {
    if (olderThan) {
      const cutoff = Date.now() - olderThan;
      for (const [id, history] of this.migrationHistory.entries()) {
        const filtered = history.filter(h => (h?.duration || 0) > cutoff);
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

  // ==================== ���߷��� ====================

  /**
   * �����汾�����ݰ�װ��
   */
  createVersionedData<T>(data: T, version: string = DATA_MODEL_VERSION): VersionedDataWrapper<T> {
    return VersionedDataWrapper.create(data, version);
  }

  /**
   * ����Ƿ���ҪǨ��
   */
  needsMigration(data: VersionedData<any> | any, targetVersion: string = DATA_MODEL_VERSION): boolean {
    const versionedData = this.ensureVersionedData(data);
    return VersionChecker.needsMigration(versionedData.version, targetVersion);
  }

  /**
   * ��ȡǨ��·��
   */
  getMigrationPath(typeName: string, fromVersion: string, toVersion: string): string[] {
    return VersionChecker.getMigrationPath(typeName, fromVersion, toVersion);
  }

  // ==================== ˽�з��� ====================

  private ensureVersionedData(data: VersionedData<any> | any): VersionedData<any> {
    if (data && typeof data === 'object' && 'version' in data && 'data' in data) {
      return data as VersionedData<any>;
    }

    return {
      version: '1.0.0', // Ĭ�ϰ汾
      data,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'legacy'
      }
    };
  }

  private getServerDataModels(): Record<string, string> {
    // ����Ӧ�ôӷ�������ȡ����ģ�Ͱ汾��Ϣ
    // Ŀǰ����Ĭ�ϰ汾
    return {
      'User': '1.0.0',
      'TestResult': '1.0.0',
      'ApiResponse': '1.0.0'
    };
  }

  private generateRecommendations(
    apiCheck: unknown,
    dataModelCheck: any): string[] {
    const recommendations: string[] = [];

    if (!(apiCheck as any).compatible) {
      recommendations.push('�����ͻ��˵����ݵ�API�汾');
    }

    if (!(dataModelCheck as any).compatible) {
      recommendations.push('ִ������ģ��Ǩ����ȷ��������');
    }

    if ((apiCheck as any).warnings?.length > 0) {
      recommendations.push('���APIʹ�÷�ʽ������ʹ�������õĹ���');
    }

    if ((dataModelCheck as any).warnings?.length > 0) {
      recommendations.push('��������ģ�Ͷ�����ƥ��������汾');
    }

    return recommendations;
  }

  private recordMigration(migrationId: string, result: MigrationResult): void {
    if (!this.migrationHistory.has(migrationId)) {
      this.migrationHistory.set(migrationId, []);
    }
    this.migrationHistory.get(migrationId)!.push(result);

    // ������ʷ��¼����
    const history = this.migrationHistory.get(migrationId)!;
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  private setupDefaultMigrations(): void {
    // ����Ĭ�ϵ�����Ǩ��
    // �������ע�᳣��������ģ��Ǩ��

    // ʾ�����û�ģ�ʹ�1.0.0��1.1.0��Ǩ��
    this.registerMigration(
      'User',
      '1.0.0',
      '1.1.0',
      (data: any) => ({
        ...data,
        preferences: data?.preferences || {},
        profile: data?.profile || {}
      }),
      (data: any) => data && data?.preferences && data?.profile
    );

    // ʾ�������Խ��ģ��Ǩ��
    this.registerMigration(
      'TestResult',
      '1.0.0',
      '1.1.0',
      (data: any) => ({
        ...data,
        metadata: data?.metadata || {},
        version: '1.1.0'
      }),
      (data: any) => data && data?.metadata
    );
  }
}

// ==================== Hook���� ====================

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

// ==================== Ĭ��ʵ�� ====================

export const defaultVersionControlService = new VersionControlService();

export default defaultVersionControlService;
