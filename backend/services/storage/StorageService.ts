/**
 * 统一存储服务
 * 整合专门存储、归档和清理功能的统一接口
 */

import { DataArchiveManager } from './DataArchiveManager';
import { DataCleanupManager } from './DataCleanupManager';
import { SpecializedStorageManager } from './SpecializedStorageManager';

// 存储配置接口
export interface StorageServiceConfig {
  storage?: any;
  archive?: any;
  cleanup?: any;
  monitoring?: {
    enabled: boolean;
  };
}

// 存储统计接口
export interface StorageStatistics {
  totalOperations: number;
  storageOperations: number;
  archiveOperations: number;
  cleanupOperations: number;
  errors: number;
  lastOperation?: Date;
}

// 存储操作结果接口
export interface StorageOperationResult {
  success: boolean;
  operation: string;
  duration: number;
  affected: number;
  error?: string;
}

class StorageService {
  private config: StorageServiceConfig;
  private storageManager: SpecializedStorageManager;
  private archiveManager: DataArchiveManager;
  private cleanupManager: DataCleanupManager;
  private statistics: StorageStatistics;

  constructor(config: StorageServiceConfig = {}) {
    this.config = {
      storage: {},
      archive: {},
      cleanup: {},
      monitoring: { enabled: true },
      ...config,
    };

    // 初始化各个管理器
    this.storageManager = new SpecializedStorageManager(this.config.storage);
    this.archiveManager = new DataArchiveManager(this.config.archive);
    this.cleanupManager = new DataCleanupManager(this.config.cleanup);

    // 统计信息
    this.statistics = {
      totalOperations: 0,
      storageOperations: 0,
      archiveOperations: 0,
      cleanupOperations: 0,
      errors: 0,
    };
  }

  /**
   * 存储数据
   */
  async store(key: string, data: any, options: any = {}): Promise<StorageOperationResult> {
    const startTime = Date.now();

    try {
      const result = await this.storageManager.store(key, data, options);
      this.statistics.storageOperations++;
      this.statistics.totalOperations++;
      this.statistics.lastOperation = new Date();

      return {
        success: true,
        operation: 'store',
        duration: Date.now() - startTime,
        affected: result.affected || 1,
      };
    } catch (error) {
      this.statistics.errors++;
      return {
        success: false,
        operation: 'store',
        duration: Date.now() - startTime,
        affected: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 检索数据
   */
  async retrieve(key: string, options: any = {}): Promise<any> {
    const startTime = Date.now();

    try {
      const result = await this.storageManager.retrieve(key, options);
      this.statistics.storageOperations++;
      this.statistics.totalOperations++;
      this.statistics.lastOperation = new Date();

      return result;
    } catch (error) {
      this.statistics.errors++;
      throw error;
    }
  }

  /**
   * 删除数据
   */
  async delete(key: string, options: any = {}): Promise<StorageOperationResult> {
    const startTime = Date.now();

    try {
      const result = await this.storageManager.delete(key, options);
      this.statistics.storageOperations++;
      this.statistics.totalOperations++;
      this.statistics.lastOperation = new Date();

      return {
        success: true,
        operation: 'delete',
        duration: Date.now() - startTime,
        affected: result.affected || 1,
      };
    } catch (error) {
      this.statistics.errors++;
      return {
        success: false,
        operation: 'delete',
        duration: Date.now() - startTime,
        affected: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 归档数据
   */
  async archive(criteria: any, options: any = {}): Promise<StorageOperationResult> {
    const startTime = Date.now();

    try {
      const result = await this.archiveManager.archive(criteria, options);
      this.statistics.archiveOperations++;
      this.statistics.totalOperations++;
      this.statistics.lastOperation = new Date();

      return {
        success: true,
        operation: 'archive',
        duration: Date.now() - startTime,
        affected: result.affected || 0,
      };
    } catch (error) {
      this.statistics.errors++;
      return {
        success: false,
        operation: 'archive',
        duration: Date.now() - startTime,
        affected: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 清理数据
   */
  async cleanup(criteria: any, options: any = {}): Promise<StorageOperationResult> {
    const startTime = Date.now();

    try {
      const result = await this.cleanupManager.cleanup(criteria, options);
      this.statistics.cleanupOperations++;
      this.statistics.totalOperations++;
      this.statistics.lastOperation = new Date();

      return {
        success: true,
        operation: 'cleanup',
        duration: Date.now() - startTime,
        affected: result.affected || 0,
      };
    } catch (error) {
      this.statistics.errors++;
      return {
        success: false,
        operation: 'cleanup',
        duration: Date.now() - startTime,
        affected: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 获取统计信息
   */
  getStatistics(): StorageStatistics {
    return { ...this.statistics };
  }

  /**
   * 重置统计信息
   */
  resetStatistics(): void {
    this.statistics = {
      totalOperations: 0,
      storageOperations: 0,
      archiveOperations: 0,
      cleanupOperations: 0,
      errors: 0,
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    storage: boolean;
    archive: boolean;
    cleanup: boolean;
    overall: boolean;
  }> {
    try {
      const storage = await this.storageManager.healthCheck();
      const archive = await this.archiveManager.healthCheck();
      const cleanup = await this.cleanupManager.healthCheck();

      const overall = storage && archive && cleanup;

      return {
        storage,
        archive,
        cleanup,
        overall,
      };
    } catch (error) {
      return {
        storage: false,
        archive: false,
        cleanup: false,
        overall: false,
      };
    }
  }
}

export default StorageService;
