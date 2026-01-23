/**
 * 增强的数据库管理器
 * 提供连接池优化、事务管理、查询优化等功能
 */

import { EventEmitter } from 'events';
import { Sequelize } from 'sequelize';

interface PoolConfig {
  max: number;
  min: number;
  acquire: number;
  idle: number;
  evict: number;
  handleDisconnects: boolean;
  validate: (client?: unknown) => boolean;
}

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  dialect: 'mysql' | 'postgres' | 'sqlite' | 'mariadb';
  logging?: boolean;
}

class DatabaseManager extends EventEmitter {
  private sequelize: Sequelize | null = null;
  private models: Record<string, unknown> = {};
  private isConnected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 5;
  private connectionTimeout = 30000;
  private retryDelay = 5000;

  // 连接池配置
  private poolConfig: PoolConfig = {
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    min: parseInt(process.env.DB_POOL_MIN || '5'),
    acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000'),
    idle: parseInt(process.env.DB_POOL_IDLE || '10000'),
    evict: parseInt(process.env.DB_POOL_EVICT || '1000'),
    handleDisconnects: true,
    validate: () => true,
  };

  constructor() {
    super();
  }

  /**
   * 初始化数据库连接
   */
  async initialize(config?: DatabaseConfig): Promise<void> {
    try {
      if (this.sequelize) {
        await this.sequelize.close();
      }

      const dbConfig = config || this.getDefaultConfig();

      this.sequelize = new Sequelize({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        username: dbConfig.username,
        password: dbConfig.password,
        dialect: dbConfig.dialect,
        logging: dbConfig.logging || false,
        pool: this.poolConfig,
        define: {
          timestamps: true,
          underscored: true,
          freezeTableName: true,
        },
      });

      await this.testConnection();
      this.isConnected = true;
      this.connectionAttempts = 0;

      this.emit('connected', { sequelize: this.sequelize });
    } catch (error) {
      this.isConnected = false;
      this.connectionAttempts++;

      this.emit('error', error);

      if (this.connectionAttempts < this.maxConnectionAttempts) {
        setTimeout(() => this.initialize(config), this.retryDelay);
      } else {
        throw new Error(`数据库连接失败，已尝试 ${this.maxConnectionAttempts} 次`);
      }
    }
  }

  /**
   * 测试数据库连接
   */
  private async testConnection(): Promise<void> {
    if (!this.sequelize) {
      throw new Error('数据库实例未初始化');
    }

    try {
      await this.sequelize.authenticate();
    } catch (error) {
      throw new Error(`数据库连接测试失败: ${error}`);
    }
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): DatabaseConfig {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME || 'testweb',
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      dialect: (process.env.DB_DIALECT as 'mysql' | 'postgres' | 'sqlite' | 'mariadb') || 'mysql',
    };
  }

  /**
   * 获取 Sequelize 实例
   */
  getSequelize(): Sequelize {
    if (!this.sequelize) {
      throw new Error('数据库未连接');
    }
    return this.sequelize;
  }

  /**
   * 检查连接状态
   */
  isConnectionActive(): boolean {
    return this.isConnected && this.sequelize !== null;
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.sequelize) {
      await this.sequelize.close();
      this.sequelize = null;
      this.isConnected = false;
      this.emit('disconnected');
    }
  }

  /**
   * 获取连接池状态
   */
  getPoolStatus(): { total: number; used: number; free: number; waiting: number } | null {
    if (!this.sequelize) {
      return null;
    }

    // 使用 Sequelize 的连接池 API
    const pool = (
      this.sequelize as Sequelize & {
        connectionManager?: {
          pool?: {
            numUsed: () => number;
            numFree: () => number;
            numPendingAcquires: () => number;
          };
        };
      }
    ).connectionManager?.pool;
    if (!pool) {
      return null;
    }

    return {
      total: pool.numUsed() + pool.numFree(),
      used: pool.numUsed(),
      free: pool.numFree(),
      waiting: pool.numPendingAcquires(),
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: string;
    details: {
      connected?: boolean;
      pool?: { total: number; used: number; free: number; waiting: number } | null;
      attempts?: number;
      error?: string;
    };
  }> {
    try {
      if (!this.sequelize) {
        return { status: 'disconnected', details: { error: '数据库未初始化' } };
      }

      await this.testConnection();
      const poolStatus = this.getPoolStatus();

      return {
        status: 'healthy',
        details: {
          connected: this.isConnected,
          pool: poolStatus,
          attempts: this.connectionAttempts,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }
}

export default DatabaseManager;
