/**
 * API集合管理器 - 类似Postman的Collection功能
 * 提供API请求的组织、存储、分享和版本管理功能
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// 集合配置接口
export interface CollectionManagerConfig {
  storageDir?: string;
  backupEnabled?: boolean;
  maxVersions?: number;
  models?: any;
}

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
  metadata: Record<string, any>;
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
  body?: any;
  tests?: string[];
  preRequestScript?: string;
  postResponseScript?: string;
  timeout?: number;
  auth?: AuthConfig;
  variables?: Record<string, string>;
  metadata: Record<string, any>;
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
    body: any;
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

class CollectionManager {
  private options: CollectionManagerConfig;
  private models: any;
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

    this.models = options.models;

    // 确保存储目录存在
    this.ensureStorageDir();
  }

  /**
   * 创建集合
   */
  async createCollection(
    collectionData: Omit<ApiCollection, 'id' | 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<string> {
    const collection: ApiCollection = {
      ...collectionData,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    this.collections.set(collection.id, collection);

    // 保存到文件
    await this.saveCollectionToFile(collection);

    // 创建初始版本
    await this.createVersion(collection.id, 'Initial version', 'Collection created');

    return collection.id;
  }

  /**
   * 更新集合
   */
  async updateCollection(id: string, updates: Partial<ApiCollection>): Promise<ApiCollection> {
    const collection = this.collections.get(id);
    if (!collection) {
      throw new Error('Collection not found');
    }

    const oldCollection = { ...collection };
    const updatedCollection = {
      ...collection,
      ...updates,
      updatedAt: new Date(),
      version: collection.version + 1,
    };

    this.collections.set(id, updatedCollection);

    // 保存到文件
    await this.saveCollectionToFile(updatedCollection);

    // 创建版本
    const changes = this.detectChanges(oldCollection, updatedCollection);
    await this.createVersion(id, `Version ${updatedCollection.version}`, changes.join(', '));

    return updatedCollection;
  }

  /**
   * 删除集合
   */
  async deleteCollection(id: string): Promise<boolean> {
    const collection = this.collections.get(id);
    if (!collection) {
      return false;
    }

    // 从文件夹中移除
    if (collection.folderId) {
      const folder = this.folders.get(collection.folderId);
      if (folder) {
        folder.collections = folder.collections.filter(cId => cId !== id);
        await this.saveFolderToFile(folder);
      }
    }

    // 删除文件
    await this.deleteCollectionFile(id);

    // 删除版本
    this.versions.delete(id);

    // 删除分享
    for (const [shareId, share] of this.shares.entries()) {
      if (share.collectionId === id) {
        this.shares.delete(shareId);
      }
    }

    this.collections.delete(id);
    return true;
  }

  /**
   * 获取集合
   */
  async getCollection(id: string): Promise<ApiCollection | null> {
    return this.collections.get(id) || null;
  }

  /**
   * 获取所有集合
   */
  async getAllCollections(): Promise<ApiCollection[]> {
    return Array.from(this.collections.values());
  }

  /**
   * 创建文件夹
   */
  async createFolder(
    folderData: Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'collections' | 'subfolders'>
  ): Promise<string> {
    const folder: Folder = {
      ...folderData,
      id: uuidv4(),
      collections: [],
      subfolders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.folders.set(folder.id, folder);

    // 如果有父文件夹，添加到父文件夹的子文件夹列表
    if (folder.parentId) {
      const parentFolder = this.folders.get(folder.parentId);
      if (parentFolder) {
        parentFolder.subfolders.push(folder.id);
        await this.saveFolderToFile(parentFolder);
      }
    }

    await this.saveFolderToFile(folder);
    return folder.id;
  }

  /**
   * 更新文件夹
   */
  async updateFolder(id: string, updates: Partial<Folder>): Promise<Folder> {
    const folder = this.folders.get(id);
    if (!folder) {
      throw new Error('Folder not found');
    }

    const updatedFolder = {
      ...folder,
      ...updates,
      updatedAt: new Date(),
    };

    this.folders.set(id, updatedFolder);
    await this.saveFolderToFile(updatedFolder);

    return updatedFolder;
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

    if (!this.versions.has(collectionId)) {
      this.versions.set(collectionId, []);
    }

    const versions = this.versions.get(collectionId)!;
    versions.push(version);

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
    const collection = this.collections.get(collectionId);
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
    const collectionId = await this.createCollection({
      ...exportData.collection,
      createdBy: exportData.exportedBy,
    });

    // 导入环境
    for (const environment of exportData.environments) {
      await this.createEnvironment({
        ...environment,
        createdBy: exportData.exportedBy,
      });
    }

    return collectionId;
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
      await fs.mkdir(this.options.storageDir, { recursive: true });
      await fs.mkdir(path.join(this.options.storageDir, 'collections'), { recursive: true });
      await fs.mkdir(path.join(this.options.storageDir, 'folders'), { recursive: true });
      await fs.mkdir(path.join(this.options.storageDir, 'environments'), { recursive: true });
      await fs.mkdir(path.join(this.options.storageDir, 'versions'), { recursive: true });
      await fs.mkdir(path.join(this.options.storageDir, 'shares'), { recursive: true });
    } catch (error) {
      console.error('Failed to create storage directories:', error);
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    let processedRequest = { ...request };

    if (environment) {
      // 替换URL中的变量
      processedRequest.url = this.replaceVariables(processedRequest.url, environment.values);

      // 替换请求头中的变量
      if (processedRequest.headers) {
        processedRequest.headers = this.replaceVariablesInObject(
          processedRequest.headers,
          environment.values
        );
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
  private replaceVariablesInObject(obj: any, variables: Record<string, string>): any {
    if (typeof obj === 'string') {
      return this.replaceVariables(obj, variables);
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.replaceVariablesInObject(item, variables));
    } else if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceVariablesInObject(value, variables);
      }
      return result;
    }
    return obj;
  }

  /**
   * 发送HTTP请求（模拟实现）
   */
  private async sendHttpRequest(request: ApiRequest): Promise<any> {
    // 这里应该实现实际的HTTP请求
    // 简化实现，返回模拟数据
    return {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json',
      },
      body: {
        message: 'Mock response',
        url: request.url,
        method: request.method,
      },
      time: Math.random() * 1000,
    };
  }

  /**
   * 执行测试
   */
  private async executeTests(tests: string[], response: any): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const test of tests) {
      try {
        // 这里应该执行实际的测试脚本
        // 简化实现，总是返回通过
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

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<{
    totalCollections: number;
    totalFolders: number;
    totalEnvironments: number;
    totalVersions: number;
    totalShares: number;
  }> {
    let totalVersions = 0;
    for (const versions of this.versions.values()) {
      totalVersions += versions.length;
    }

    return {
      totalCollections: this.collections.size,
      totalFolders: this.folders.size,
      totalEnvironments: this.environments.size,
      totalVersions,
      totalShares: this.shares.size,
    };
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
