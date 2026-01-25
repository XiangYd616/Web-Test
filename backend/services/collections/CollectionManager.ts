/**
 * API集合管理器 - 类似Postman的Collection功能
 * 提供API请求的组织、存储、分享和版本管理功能
 */

import axios from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Logger from '../../utils/logger';

// 集合配置接口
export interface CollectionManagerConfig {
  storageDir?: string;
  backupEnabled?: boolean;
  maxVersions?: number;
  models?: CollectionModels;
}

type ResolvedCollectionManagerConfig = {
  storageDir: string;
  backupEnabled: boolean;
  maxVersions: number;
  models?: CollectionModels;
};

// API集合接口
export interface ApiCollection {
  id: string;
  name: string;
  description: string;
  folderId?: string;
  requests: ApiRequest[];
  environment?: Environment;
  variables: Record<string, string>;
  auth?: AuthConfig;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
  tags: string[];
  metadata: Record<string, unknown>;
}

// API请求接口
export interface ApiRequest {
  id: string;
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: unknown;
  tests?: string[];
  preRequestScript?: string;
  postResponseScript?: string;
  timeout?: number;
  auth?: AuthConfig;
  variables?: Record<string, string>;
  metadata: Record<string, unknown>;
}

// 环境配置接口
export interface Environment {
  id: string;
  name: string;
  values: Record<string, string>;
  variables: EnvironmentVariable[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// 环境变量接口
export interface EnvironmentVariable {
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
  type: 'string' | 'number' | 'boolean' | 'secret';
}

// 认证配置接口
export interface AuthConfig {
  type: 'none' | 'basic' | 'bearer' | 'oauth2' | 'apikey';
  basic?: {
    username: string;
    password: string;
  };
  bearer?: {
    token: string;
  };
  oauth2?: {
    clientId: string;
    clientSecret: string;
    scope?: string;
    tokenUrl?: string;
  };
  apikey?: {
    key: string;
    value: string;
    addTo: 'header' | 'query' | 'cookie';
  };
}

type PostmanHeader = { key?: string; value?: string };

type PostmanUrl =
  | string
  | {
      raw?: string;
      protocol?: string;
      host?: string[] | string;
      path?: string[] | string;
      query?: Array<{ key: string; value: string }>;
    };

type PostmanBody = {
  mode?: 'raw' | 'urlencoded' | 'formdata' | string;
  raw?: string;
  urlencoded?: Array<{ key?: string; value?: string }>;
  formdata?: Array<{ key?: string; value?: string }>;
};

type PostmanRequest = {
  method?: string;
  header?: PostmanHeader[];
  url?: PostmanUrl;
  body?: PostmanBody;
};

type PostmanItem = {
  name?: string;
  description?: string;
  request?: PostmanRequest;
  item?: PostmanItem[];
};

// 文件夹接口
export interface Folder {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  collections: string[];
  subfolders: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// 集合版本接口
export interface CollectionVersion {
  id: string;
  collectionId: string;
  version: number;
  name: string;
  description: string;
  collection: ApiCollection;
  createdAt: Date;
  createdBy: string;
  changes: string[];
}

// 集合分享接口
export interface CollectionShare {
  id: string;
  collectionId: string;
  token: string;
  permissions: ('read' | 'write' | 'admin')[];
  expiresAt?: Date;
  accessCount: number;
  maxAccess?: number;
  createdAt: Date;
  createdBy: string;
}

// 导入/导出接口
export interface CollectionExport {
  collection: ApiCollection;
  environments: Environment[];
  version: string;
  exportedAt: Date;
  exportedBy: string;
}

// 执行结果接口
export interface ExecutionResult {
  requestId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  request: ApiRequest;
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    time: number;
  };
  error?: string;
  tests: TestResult[];
  variables: Record<string, string>;
  executedAt: Date;
  duration: number;
}

// 测试结果接口
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

// 模型类型
export interface CollectionModels {
  Collection: Model<CollectionRecord>;
  Environment?: Model<EnvironmentRecord>;
  EnvironmentVariable?: Model<EnvironmentVariableRecord>;
  Run: Model<RunRecord>;
  RunResult: Model<RunResultRecord>;
}

type Model<T> = {
  findByPk: (id: string) => Promise<T | null>;
  findAll: (options?: Record<string, unknown>) => Promise<T[]>;
  findAndCountAll?: (options: Record<string, unknown>) => Promise<{ rows: T[]; count: number }>;
  create: (data: Record<string, unknown>) => Promise<T>;
  update: (
    data: Record<string, unknown>,
    options: Record<string, unknown>
  ) => Promise<[number, T[]]>;
  destroy: (options: Record<string, unknown>) => Promise<number>;
};

// 记录类型
type CollectionRecord = {
  id: string;
  name: string;
  description?: string | null;
  workspace_id?: string | null;
  created_by?: string | null;
  definition?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
};

type EnvironmentRecord = {
  id: string;
  name: string;
  description?: string | null;
  workspace_id?: string | null;
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
};

type EnvironmentVariableRecord = {
  id: string;
  environment_id: string;
  key: string;
  value: string;
  type?: string;
  description?: string | null;
  enabled?: boolean;
  secret?: boolean;
  encrypted?: boolean;
};

type RunRecord = {
  id: string;
  collection_id: string;
  environment_id?: string | null;
  workspace_id?: string | null;
  user_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  options?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  started_at?: Date;
  completed_at?: Date;
  updated_at?: Date;
};

type RunResultRecord = {
  id: string;
  run_id: string;
  request_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  response?: Record<string, unknown>;
  assertions?: TestResult[];
  duration?: number;
};

class CollectionManager {
  private options: ResolvedCollectionManagerConfig;
  private models: CollectionModels;
  private collections: Map<string, ApiCollection> = new Map();
  private folders: Map<string, Folder> = new Map();
  private requests: Map<string, ApiRequest> = new Map();
  private environments: Map<string, Environment> = new Map();
  private versions: Map<string, CollectionVersion[]> = new Map();
  private shares: Map<string, CollectionShare> = new Map();

  constructor(options: CollectionManagerConfig = {}) {
    this.options = {
      storageDir: './data/collections',
      backupEnabled: true,
      maxVersions: 10,
      ...options,
    };

    this.models = options.models as CollectionModels;

    // 确保存储目录存在
    this.ensureStorageDir();
  }

  /**
   * 创建集合
   */
  async createCollection(
    collectionData: Omit<
      ApiCollection,
      'id' | 'createdAt' | 'updatedAt' | 'version' | 'createdBy'
    > & {
      workspaceId: string;
    },
    userId?: string
  ): Promise<ApiCollection> {
    const metadata = {
      ...(collectionData.metadata || {}),
      version: 1,
      tags: collectionData.tags || [],
    };

    const collectionRecord = await this.models.Collection.create({
      workspace_id: collectionData.workspaceId,
      name: collectionData.name,
      description: collectionData.description,
      created_by: userId || null,
      definition: {
        requests: collectionData.requests || [],
        variables: collectionData.variables || {},
        auth: collectionData.auth || null,
      },
      metadata,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const collection = this.toApiCollection(collectionRecord);
    this.collections.set(collection.id, collection);
    await this.saveCollectionToFile(collection);
    await this.createVersion(collection.id, 'Initial version', 'Collection created');
    return collection;
  }

  /**
   * 更新集合
   */
  async updateCollection(id: string, updates: Partial<ApiCollection>): Promise<ApiCollection> {
    const existing = await this.models.Collection.findByPk(id);
    if (!existing) {
      throw new Error('Collection not found');
    }

    const existingDefinition = existing.definition || {};
    const existingMetadata = existing.metadata || {};
    const nextVersion = Number(existingMetadata.version || 1) + 1;
    const definition = {
      ...existingDefinition,
      requests: updates.requests ?? (existingDefinition.requests as ApiRequest[]) ?? [],
      variables:
        updates.variables ?? (existingDefinition.variables as Record<string, string>) ?? {},
      auth: updates.auth ?? (existingDefinition.auth as AuthConfig) ?? null,
    };

    const metadata = {
      ...existingMetadata,
      ...(updates.metadata || {}),
      version: nextVersion,
      tags: updates.tags ?? (existingMetadata.tags as string[]) ?? [],
    };

    await this.models.Collection.update(
      {
        name: updates.name ?? existing.name,
        description: updates.description ?? existing.description,
        definition,
        metadata,
        updated_at: new Date(),
      },
      { where: { id }, returning: true }
    );

    const updated = await this.models.Collection.findByPk(id);
    if (!updated) {
      throw new Error('Collection not found');
    }

    const updatedCollection = this.toApiCollection(updated);
    this.collections.set(id, updatedCollection);
    await this.saveCollectionToFile(updatedCollection);
    const changes = this.detectChanges(this.toApiCollection(existing), updatedCollection);
    await this.createVersion(id, `Version ${updatedCollection.version}`, changes.join(', '));
    return updatedCollection;
  }

  /**
   * 删除集合
   */
  async deleteCollection(id: string): Promise<boolean> {
    const deleted = await this.models.Collection.destroy({ where: { id } });
    if (!deleted) {
      return false;
    }
    await this.deleteCollectionFile(id);
    this.versions.delete(id);
    this.collections.delete(id);
    return true;
  }

  /**
   * 获取集合
   */
  async getCollection(id: string): Promise<ApiCollection | null> {
    const record = await this.models.Collection.findByPk(id);
    if (!record) {
      return null;
    }
    const collection = this.toApiCollection(record);
    this.collections.set(id, collection);
    return collection;
  }

  /**
   * 获取所有集合
   */
  async getAllCollections(): Promise<ApiCollection[]> {
    const records = await this.models.Collection.findAll();
    const collections = records.map(record => this.toApiCollection(record));
    collections.forEach(collection => this.collections.set(collection.id, collection));
    return collections;
  }

  async getCollections(options: { workspaceId: string; limit: number; offset: number }): Promise<{
    collections: ApiCollection[];
    total: number;
  }> {
    if (!this.models.Collection.findAndCountAll) {
      const records = await this.models.Collection.findAll({
        where: { workspace_id: options.workspaceId },
      });
      const collections = records.map(record => this.toApiCollection(record));
      return { collections, total: collections.length };
    }

    const result = await this.models.Collection.findAndCountAll({
      where: { workspace_id: options.workspaceId },
      limit: options.limit,
      offset: options.offset,
      order: [['created_at', 'DESC']],
    });

    const collections = result.rows.map(record => this.toApiCollection(record));
    collections.forEach(collection => this.collections.set(collection.id, collection));
    return { collections, total: result.count };
  }

  async getRuns(options: { workspaceId: string; limit: number; offset: number }): Promise<{
    runs: RunRecord[];
    total: number;
  }> {
    if (!this.models.Run.findAndCountAll) {
      const records = await this.models.Run.findAll({
        where: { workspace_id: options.workspaceId },
      });
      return { runs: records, total: records.length };
    }

    const result = await this.models.Run.findAndCountAll({
      where: { workspace_id: options.workspaceId },
      limit: options.limit,
      offset: options.offset,
      order: [['created_at', 'DESC']],
    });
    return { runs: result.rows, total: result.count };
  }

  async getRun(runId: string): Promise<RunRecord | null> {
    return this.models.Run.findByPk(runId);
  }

  async getRunResults(options: { runId: string; limit: number; offset: number }): Promise<{
    results: RunResultRecord[];
    total: number;
  }> {
    if (!this.models.RunResult.findAndCountAll) {
      const records = await this.models.RunResult.findAll({ where: { run_id: options.runId } });
      return { results: records, total: records.length };
    }

    const result = await this.models.RunResult.findAndCountAll({
      where: { run_id: options.runId },
      limit: options.limit,
      offset: options.offset,
      order: [['created_at', 'ASC']],
    });

    return { results: result.rows, total: result.count };
  }

  async cancelRun(runId: string): Promise<void> {
    await this.models.Run.update(
      { status: 'cancelled', updated_at: new Date() },
      { where: { id: runId } }
    );
  }

  async rerunRun(runId: string, userId: string): Promise<RunRecord> {
    const run = await this.models.Run.findByPk(runId);
    if (!run) {
      throw new Error('运行记录不存在');
    }
    return this.createRun({
      collectionId: run.collection_id,
      environmentId: run.environment_id || undefined,
      userId,
      options: run.options || {},
    });
  }

  async createRun(params: {
    collectionId: string;
    environmentId?: string;
    userId: string;
    options?: Record<string, unknown>;
  }): Promise<RunRecord> {
    const collection = await this.models.Collection.findByPk(params.collectionId);
    if (!collection) {
      throw new Error('集合不存在');
    }

    const run = await this.models.Run.create({
      collection_id: params.collectionId,
      environment_id: params.environmentId || null,
      workspace_id: collection.workspace_id || null,
      user_id: params.userId,
      status: 'running',
      options: params.options || {},
      started_at: new Date(),
    });

    const { results, summary, duration } = await this.executeCollection(
      params.collectionId,
      params.environmentId || '',
      { runId: run.id }
    );

    for (const result of results) {
      await this.models.RunResult.create({
        run_id: run.id,
        request_id: result.requestId,
        status: result.status,
        response: result.response || {},
        assertions: result.tests,
        duration: result.duration,
        created_at: new Date(),
      });
    }

    await this.models.Run.update(
      {
        status: summary.failedRequests > 0 ? 'failed' : 'completed',
        summary,
        duration,
        completed_at: new Date(),
        updated_at: new Date(),
      },
      { where: { id: run.id } }
    );

    const updated = await this.models.Run.findByPk(run.id);
    if (!updated) {
      throw new Error('运行记录不存在');
    }
    return updated;
  }

  async executeCollection(
    collectionId: string,
    environmentId: string,
    options: { runId?: string; environment?: Environment | null } = {}
  ): Promise<{
    results: ExecutionResult[];
    summary: {
      totalRequests: number;
      passedRequests: number;
      failedRequests: number;
      errorCount: number;
      logs: string[];
    };
    duration: number;
  }> {
    const collectionRecord = await this.models.Collection.findByPk(collectionId);
    if (!collectionRecord) {
      throw new Error('集合不存在');
    }

    const definition = collectionRecord.definition || {};
    const requests = (definition.requests as ApiRequest[]) || [];
    const environment =
      options.environment ||
      (environmentId ? await this.getEnvironmentContext(environmentId) : null);

    const start = Date.now();
    const results: ExecutionResult[] = [];
    const logs: string[] = [];

    for (const request of requests) {
      const result = await this.executeRequest(request, environment || undefined);
      results.push(result);
      logs.push(`${request.name}: ${result.status}`);
    }

    const totalRequests = results.length;
    const passedRequests = results.filter(r => r.status === 'completed').length;
    const failedRequests = results.filter(r => r.status === 'failed').length;

    return {
      results,
      summary: {
        totalRequests,
        passedRequests,
        failedRequests,
        errorCount: failedRequests,
        logs,
      },
      duration: Date.now() - start,
    };
  }

  private async getEnvironmentContext(environmentId: string): Promise<Environment | null> {
    if (!this.models.Environment) {
      return this.environments.get(environmentId) || null;
    }

    const record = await this.models.Environment.findByPk(environmentId);
    if (!record) {
      return null;
    }

    const variables: EnvironmentVariable[] = [];
    if (this.models.EnvironmentVariable) {
      const variableRecords = await this.models.EnvironmentVariable.findAll({
        where: { environment_id: environmentId },
      });
      for (const variable of variableRecords) {
        if (variable.enabled === false) {
          continue;
        }
        variables.push({
          key: variable.key,
          value: variable.value,
          description: variable.description || undefined,
          enabled: variable.enabled === undefined ? true : variable.enabled,
          type: (variable.type as EnvironmentVariable['type']) || 'string',
        });
      }
    }

    const values = variables.reduce<Record<string, string>>((acc, variable) => {
      acc[variable.key] = variable.value;
      return acc;
    }, {});

    return {
      id: record.id,
      name: record.name,
      values,
      variables,
      createdAt: record.created_at || new Date(),
      updatedAt: record.updated_at || new Date(),
      createdBy: record.metadata?.createdBy ? String(record.metadata.createdBy) : '',
    };
  }

  private toApiCollection(record: CollectionRecord): ApiCollection {
    const definition = record.definition || {};
    const metadata = record.metadata || {};
    return {
      id: record.id,
      name: record.name,
      description: record.description || '',
      folderId: (metadata.folderId as string) || undefined,
      requests: (definition.requests as ApiRequest[]) || [],
      variables: (definition.variables as Record<string, string>) || {},
      auth: (definition.auth as AuthConfig) || undefined,
      createdAt: record.created_at || new Date(),
      updatedAt: record.updated_at || new Date(),
      createdBy: record.created_by || '',
      version: Number(metadata.version || 1),
      tags: (metadata.tags as string[]) || [],
      metadata: metadata as Record<string, unknown>,
    };
  }

  /**
   * 删除文件夹
   */
  async deleteFolder(id: string): Promise<boolean> {
    const folder = this.folders.get(id);
    if (!folder) {
      return false;
    }

    // 递归删除子文件夹
    for (const subfolderId of folder.subfolders) {
      await this.deleteFolder(subfolderId);
    }

    // 移动集合到根目录
    for (const collectionId of folder.collections) {
      const collection = this.collections.get(collectionId);
      if (collection) {
        collection.folderId = undefined;
        await this.saveCollectionToFile(collection);
      }
    }

    // 从父文件夹中移除
    if (folder.parentId) {
      const parentFolder = this.folders.get(folder.parentId);
      if (parentFolder) {
        parentFolder.subfolders = parentFolder.subfolders.filter(fId => fId !== id);
        await this.saveFolderToFile(parentFolder);
      }
    }

    // 删除文件夹文件
    await this.deleteFolderFile(id);
    this.folders.delete(id);

    return true;
  }

  /**
   * 创建环境
   */
  async createEnvironment(
    environmentData: Omit<Environment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const environment: Environment = {
      ...environmentData,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.environments.set(environment.id, environment);
    await this.saveEnvironmentToFile(environment);

    return environment.id;
  }

  /**
   * 更新环境
   */
  async updateEnvironment(id: string, updates: Partial<Environment>): Promise<Environment> {
    const environment = this.environments.get(id);
    if (!environment) {
      throw new Error('Environment not found');
    }

    const updatedEnvironment = {
      ...environment,
      ...updates,
      updatedAt: new Date(),
    };

    this.environments.set(id, updatedEnvironment);
    await this.saveEnvironmentToFile(updatedEnvironment);

    return updatedEnvironment;
  }

  /**
   * 删除环境
   */
  async deleteEnvironment(id: string): Promise<boolean> {
    const environment = this.environments.get(id);
    if (!environment) {
      return false;
    }

    await this.deleteEnvironmentFile(id);
    this.environments.delete(id);

    return true;
  }

  /**
   * 获取环境
   */
  async getEnvironment(id: string): Promise<Environment | null> {
    return this.environments.get(id) || null;
  }

  /**
   * 获取所有环境
   */
  async getAllEnvironments(): Promise<Environment[]> {
    return Array.from(this.environments.values());
  }

  /**
   * 创建版本
   */
  async createVersion(collectionId: string, name: string, description: string): Promise<string> {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error('Collection not found');
    }

    const version: CollectionVersion = {
      id: uuidv4(),
      collectionId,
      version: collection.version,
      name,
      description,
      collection: { ...collection },
      createdAt: new Date(),
      createdBy: collection.createdBy,
      changes: [],
    };

    const versions = this.versions.get(collectionId) || [];
    versions.push(version);
    this.versions.set(collectionId, versions);

    // 限制版本数量
    if (versions.length > this.options.maxVersions) {
      versions.shift();
    }

    await this.saveVersionsToFile(collectionId, versions);
    return version.id;
  }

  /**
   * 获取版本历史
   */
  async getVersions(collectionId: string): Promise<CollectionVersion[]> {
    return this.versions.get(collectionId) || [];
  }

  /**
   * 恢复到指定版本
   */
  async restoreVersion(collectionId: string, versionId: string): Promise<ApiCollection> {
    const versions = this.versions.get(collectionId);
    if (!versions) {
      throw new Error('No versions found for collection');
    }

    const version = versions.find(v => v.id === versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    const restoredCollection = {
      ...version.collection,
      id: collectionId,
      updatedAt: new Date(),
      version: version.version + 1,
    };

    this.collections.set(collectionId, restoredCollection);
    await this.saveCollectionToFile(restoredCollection);

    return restoredCollection;
  }

  /**
   * 分享集合
   */
  async shareCollection(
    collectionId: string,
    permissions: ('read' | 'write' | 'admin')[],
    options: {
      expiresAt?: Date;
      maxAccess?: number;
    } = {}
  ): Promise<string> {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error('Collection not found');
    }

    const share: CollectionShare = {
      id: uuidv4(),
      collectionId,
      token: this.generateShareToken(),
      permissions,
      expiresAt: options.expiresAt,
      maxAccess: options.maxAccess,
      accessCount: 0,
      createdAt: new Date(),
      createdBy: collection.createdBy,
    };

    this.shares.set(share.token, share);
    await this.saveShareToFile(share);

    return share.token;
  }

  /**
   * 验证分享链接
   */
  async validateShare(token: string): Promise<CollectionShare | null> {
    const share = this.shares.get(token);
    if (!share) {
      return null;
    }

    // 检查是否过期
    if (share.expiresAt && share.expiresAt < new Date()) {
      this.shares.delete(token);
      return null;
    }

    // 检查访问次数限制
    if (share.maxAccess && share.accessCount >= share.maxAccess) {
      return null;
    }

    share.accessCount++;
    await this.saveShareToFile(share);

    return share;
  }

  /**
   * 导出集合
   */
  async exportCollection(collectionId: string): Promise<CollectionExport> {
    const collection =
      this.collections.get(collectionId) || (await this.getCollection(collectionId));
    if (!collection) {
      throw new Error('Collection not found');
    }

    const environments = Array.from(this.environments.values()).filter(
      env => env.createdBy === collection.createdBy
    );

    return {
      collection,
      environments,
      version: '1.0',
      exportedAt: new Date(),
      exportedBy: collection.createdBy,
    };
  }

  /**
   * 导入集合
   */
  async importCollection(exportData: CollectionExport): Promise<string> {
    const workspaceId = (exportData.collection as unknown as Record<string, unknown>).workspaceId;
    if (!workspaceId) {
      throw new Error('导入集合缺少 workspaceId');
    }
    const collection = await this.createCollection(
      {
        workspaceId: String(workspaceId),
        name: exportData.collection.name,
        description: exportData.collection.description,
        requests: exportData.collection.requests,
        variables: exportData.collection.variables,
        auth: exportData.collection.auth,
        tags: exportData.collection.tags,
        metadata: exportData.collection.metadata,
      },
      exportData.exportedBy
    );

    // 导入环境
    for (const environment of exportData.environments) {
      await this.createEnvironment({
        name: environment.name,
        values: environment.values,
        variables: environment.variables,
        createdBy: exportData.exportedBy,
      });
    }

    return collection.id;
  }

  async importPostmanCollection(
    postmanData: {
      info?: { name?: string; description?: string };
      item?: PostmanItem[];
    },
    workspaceId: string,
    userId?: string
  ): Promise<ApiCollection> {
    const { name, description, requests } = this.parsePostmanCollection(postmanData);

    const collection = await this.createCollection(
      {
        workspaceId,
        name,
        description,
        requests,
        variables: {},
        tags: ['postman-import'],
        metadata: {
          source: 'postman',
          importedAt: new Date().toISOString(),
        },
      },
      userId
    );

    return collection;
  }

  async addRequestToCollection(
    collectionId: string,
    requestData: Omit<ApiRequest, 'id' | 'metadata'> & { metadata?: Record<string, unknown> }
  ): Promise<ApiCollection> {
    const record = await this.models.Collection.findByPk(collectionId);
    if (!record) {
      throw new Error('Collection not found');
    }

    const definition = record.definition || {};
    const requests = (definition.requests as ApiRequest[]) || [];
    const newRequest: ApiRequest = {
      ...requestData,
      id: uuidv4(),
      description: requestData.description || '',
      metadata: requestData.metadata || {},
    };

    return this.updateCollection(collectionId, {
      requests: [...requests, newRequest],
    });
  }

  async createFolder(params: {
    name: string;
    description?: string;
    parentId?: string;
    collectionId?: string;
    createdBy: string;
  }): Promise<Folder> {
    if (!params.name || params.name.trim().length === 0) {
      throw new Error('Folder name is required');
    }

    const folder: Folder = {
      id: uuidv4(),
      name: params.name,
      description: params.description || '',
      parentId: params.parentId,
      collections: [],
      subfolders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: params.createdBy,
    };

    if (params.parentId) {
      const parentFolder = this.folders.get(params.parentId);
      if (!parentFolder) {
        throw new Error('Parent folder not found');
      }
      parentFolder.subfolders.push(folder.id);
      parentFolder.updatedAt = new Date();
      await this.saveFolderToFile(parentFolder);
    }

    if (params.collectionId) {
      folder.collections.push(params.collectionId);
      await this.assignCollectionToFolder(params.collectionId, folder.id);
    }

    this.folders.set(folder.id, folder);
    await this.saveFolderToFile(folder);

    return folder;
  }

  /**
   * 执行请求
   */
  async executeRequest(request: ApiRequest, environment?: Environment): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // 替换变量
      const processedRequest = this.processRequest(request, environment);

      // 这里应该实际发送HTTP请求
      // 简化实现，返回模拟结果
      const response = await this.sendHttpRequest(processedRequest);

      // 执行测试
      const tests = await this.executeTests(processedRequest.tests || [], response);

      const result: ExecutionResult = {
        requestId: request.id,
        status: 'completed',
        request,
        response,
        tests,
        variables: {},
        executedAt: new Date(),
        duration: Date.now() - startTime,
      };

      return result;
    } catch (error) {
      Logger.error('集合请求执行失败', error, { requestId: request.id, requestName: request.name });
      return {
        requestId: request.id,
        status: 'failed',
        request,
        error: error instanceof Error ? error.message : String(error),
        tests: [],
        variables: {},
        executedAt: new Date(),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 确保存储目录存在
   */
  private async ensureStorageDir(): Promise<void> {
    try {
      const baseDir = this.options.storageDir;
      await fs.mkdir(baseDir, { recursive: true });
      await fs.mkdir(path.join(baseDir, 'collections'), { recursive: true });
      await fs.mkdir(path.join(baseDir, 'folders'), { recursive: true });
      await fs.mkdir(path.join(baseDir, 'environments'), { recursive: true });
      await fs.mkdir(path.join(baseDir, 'versions'), { recursive: true });
      await fs.mkdir(path.join(baseDir, 'shares'), { recursive: true });
    } catch (error) {
      Logger.error('创建集合存储目录失败', error);
    }
  }

  /**
   * 保存集合到文件
   */
  private async saveCollectionToFile(collection: ApiCollection): Promise<void> {
    const filePath = path.join(this.options.storageDir, 'collections', `${collection.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(collection, null, 2));
  }

  /**
   * 删除集合文件
   */
  private async deleteCollectionFile(id: string): Promise<void> {
    const filePath = path.join(this.options.storageDir, 'collections', `${id}.json`);
    try {
      await fs.unlink(filePath);
    } catch {
      // 文件不存在，忽略错误
    }
  }

  /**
   * 保存文件夹到文件
   */
  private async saveFolderToFile(folder: Folder): Promise<void> {
    const filePath = path.join(this.options.storageDir, 'folders', `${folder.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(folder, null, 2));
  }

  /**
   * 删除文件夹文件
   */
  private async deleteFolderFile(id: string): Promise<void> {
    const filePath = path.join(this.options.storageDir, 'folders', `${id}.json`);
    try {
      await fs.unlink(filePath);
    } catch {
      // 文件不存在，忽略错误
    }
  }

  /**
   * 保存环境到文件
   */
  private async saveEnvironmentToFile(environment: Environment): Promise<void> {
    const filePath = path.join(this.options.storageDir, 'environments', `${environment.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(environment, null, 2));
  }

  /**
   * 删除环境文件
   */
  private async deleteEnvironmentFile(id: string): Promise<void> {
    const filePath = path.join(this.options.storageDir, 'environments', `${id}.json`);
    try {
      await fs.unlink(filePath);
    } catch {
      // 文件不存在，忽略错误
    }
  }

  /**
   * 保存版本到文件
   */
  private async saveVersionsToFile(
    collectionId: string,
    versions: CollectionVersion[]
  ): Promise<void> {
    const filePath = path.join(this.options.storageDir, 'versions', `${collectionId}.json`);
    await fs.writeFile(filePath, JSON.stringify(versions, null, 2));
  }

  /**
   * 保存分享到文件
   */
  private async saveShareToFile(share: CollectionShare): Promise<void> {
    const filePath = path.join(this.options.storageDir, 'shares', `${share.token}.json`);
    await fs.writeFile(filePath, JSON.stringify(share, null, 2));
  }

  /**
   * 检测变更
   */
  private detectChanges(oldCollection: ApiCollection, newCollection: ApiCollection): string[] {
    const changes: string[] = [];

    if (oldCollection.name !== newCollection.name) {
      changes.push(`Name changed from "${oldCollection.name}" to "${newCollection.name}"`);
    }

    if (oldCollection.description !== newCollection.description) {
      changes.push('Description updated');
    }

    if (oldCollection.requests.length !== newCollection.requests.length) {
      changes.push(
        `Requests count changed from ${oldCollection.requests.length} to ${newCollection.requests.length}`
      );
    }

    return changes;
  }

  /**
   * 生成分享令牌
   */
  private generateShareToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 处理请求（替换变量）
   */
  private processRequest(request: ApiRequest, environment?: Environment): ApiRequest {
    const processedRequest = { ...request };

    if (environment) {
      // 替换URL中的变量
      processedRequest.url = this.replaceVariables(processedRequest.url, environment.values);

      // 替换请求头中的变量
      if (processedRequest.headers) {
        processedRequest.headers = this.replaceVariablesInObject(
          processedRequest.headers,
          environment.values
        ) as Record<string, string>;
      }

      // 替换请求体中的变量
      if (processedRequest.body) {
        processedRequest.body = this.replaceVariablesInObject(
          processedRequest.body,
          environment.values
        );
      }
    }

    return processedRequest;
  }

  /**
   * 替换字符串中的变量
   */
  private replaceVariables(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] || match);
  }

  /**
   * 替换对象中的变量
   */
  private replaceVariablesInObject(obj: unknown, variables: Record<string, string>): unknown {
    if (typeof obj === 'string') {
      return this.replaceVariables(obj, variables);
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.replaceVariablesInObject(item, variables));
    } else if (typeof obj === 'object' && obj !== null) {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        result[key] = this.replaceVariablesInObject(value, variables);
      }
      return result;
    }
    return obj;
  }

  /**
   * 发送HTTP请求（模拟实现）
   */
  private async sendHttpRequest(request: ApiRequest): Promise<ExecutionResult['response']> {
    const startTime = Date.now();
    const config = {
      method: request.method,
      url: request.url,
      headers: request.headers,
      params: request.params,
      data: request.body,
      timeout: request.timeout || 30000,
      validateStatus: () => true,
    };

    const response = await axios(config);
    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
      body: response.data,
      time: Date.now() - startTime,
    };
  }

  /**
   * 执行测试
   */
  private async executeTests(
    tests: string[],
    response: ExecutionResult['response']
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const test of tests) {
      try {
        const assert = (condition: boolean, message: string) => {
          if (!condition) {
            throw new Error(message);
          }
        };
        // 支持简单脚本表达式
        const runner = new Function('response', 'assert', test);
        runner(response, assert);
        results.push({
          name: test,
          passed: true,
          duration: Math.random() * 100,
        });
      } catch (error) {
        results.push({
          name: test,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Math.random() * 100,
        });
      }
    }
    return results;
  }

  private parsePostmanCollection(postmanData: {
    info?: { name?: string; description?: string };
    item?: PostmanItem[];
  }): {
    name: string;
    description: string;
    requests: ApiRequest[];
  } {
    const name = postmanData.info?.name || 'Imported Collection';
    const description = postmanData.info?.description || 'Imported from Postman';
    const requests: ApiRequest[] = [];

    const items = postmanData.item || [];
    items.forEach(item => this.flattenPostmanItems(item, requests));

    return { name, description, requests };
  }

  private flattenPostmanItems(item: PostmanItem, requests: ApiRequest[]): void {
    if (item.item && Array.isArray(item.item)) {
      item.item.forEach((child: PostmanItem) => this.flattenPostmanItems(child, requests));
      return;
    }

    if (!item.request) {
      return;
    }

    const request = item.request;
    const url = this.normalizePostmanUrl(request.url);
    const headers = this.normalizePostmanHeaders(request.header || []);
    const body = this.normalizePostmanBody(request.body);

    requests.push({
      id: uuidv4(),
      name: item.name || request.method || 'Unnamed Request',
      description: (item.description as string) || '',
      method: (request.method || 'GET') as ApiRequest['method'],
      url,
      headers,
      body,
      metadata: {
        source: 'postman',
      },
    });
  }

  private normalizePostmanUrl(url: PostmanRequest['url']): string {
    if (!url) {
      return '';
    }
    if (typeof url === 'string') {
      return url;
    }
    if (typeof url === 'object') {
      if (url.raw) {
        return String(url.raw);
      }
      const protocol = url.protocol ? `${url.protocol}://` : '';
      const host = Array.isArray(url.host) ? url.host.join('.') : url.host || '';
      const path = Array.isArray(url.path) ? `/${url.path.join('/')}` : url.path || '';
      const query = Array.isArray(url.query)
        ? `?${url.query.map((q: { key: string; value: string }) => `${q.key}=${q.value}`).join('&')}`
        : '';
      return `${protocol}${host}${path}${query}`;
    }
    return '';
  }

  private normalizePostmanHeaders(
    headers: Array<{ key?: string; value?: string }>
  ): Record<string, string> {
    return headers.reduce<Record<string, string>>((acc, header) => {
      if (header.key) {
        acc[header.key] = header.value || '';
      }
      return acc;
    }, {});
  }

  private normalizePostmanBody(body?: PostmanRequest['body']): unknown {
    if (!body) {
      return undefined;
    }
    if (body.mode === 'raw') {
      return body.raw;
    }
    if (body.mode === 'urlencoded' || body.mode === 'formdata') {
      const items = body[body.mode] || [];
      if (Array.isArray(items)) {
        return items.reduce<Record<string, string>>((acc, item) => {
          if (item.key) {
            acc[item.key] = item.value || '';
          }
          return acc;
        }, {});
      }
    }
    return body;
  }

  /**
   * 将集合分配到文件夹
   */
  private async assignCollectionToFolder(collectionId: string, folderId: string): Promise<void> {
    const record = await this.models.Collection.findByPk(collectionId);
    if (!record) {
      throw new Error('Collection not found');
    }

    const metadata = record.metadata || {};
    await this.models.Collection.update(
      {
        metadata: {
          ...metadata,
          folderId,
        },
        updated_at: new Date(),
      },
      { where: { id: collectionId }, returning: true }
    );

    const updated = await this.models.Collection.findByPk(collectionId);
    if (updated) {
      const updatedCollection = this.toApiCollection(updated);
      this.collections.set(collectionId, updatedCollection);
      await this.saveCollectionToFile(updatedCollection);
    }
  }

  /**
   * 清理过期数据
   */
  async cleanup(): Promise<void> {
    const now = new Date();
    const expireTime = 30 * 24 * 60 * 60 * 1000; // 30天

    // 清理过期的分享链接
    for (const [token, share] of this.shares.entries()) {
      if (share.expiresAt && share.expiresAt < now) {
        this.shares.delete(token);
      }
    }

    // 清理过期的版本
    for (const [collectionId, versions] of this.versions.entries()) {
      const validVersions = versions.filter(
        v => now.getTime() - v.createdAt.getTime() < expireTime
      );

      if (validVersions.length !== versions.length) {
        this.versions.set(collectionId, validVersions);
        await this.saveVersionsToFile(collectionId, validVersions);
      }
    }
  }
}

export default CollectionManager;

// 兼容 CommonJS require
module.exports = { CollectionManager };
