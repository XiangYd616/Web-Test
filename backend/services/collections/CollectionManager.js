/**
 * API集合管理器 - 类似Postman的Collection功能
 * 提供API请求的组织、存储、分享和版本管理功能
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class CollectionManager {
  constructor(options = {}) {
    this.options = {
      storageDir: options.storageDir || './data/collections',
      backupEnabled: options.backupEnabled !== false,
      maxVersions: options.maxVersions || 10,
      ...options
    };
    
    this.collections = new Map();
    this.folders = new Map();
    this.requests = new Map();
    this.environments = new Map();
    
    // 确保存储目录存在
    this.ensureStorageDir();
  }

  /**
   * 创建新的API集合
   */
  async createCollection(collectionData) {
    const collection = {
      id: uuidv4(),
      name: collectionData.name || 'Untitled Collection',
      description: collectionData.description || '',
      version: '1.0.0',
      schema: 'https://schema.testweb.com/v1/collection.json',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: collectionData.author || 'Anonymous',
      
      // 集合配置
      info: {
        name: collectionData.name,
        description: collectionData.description,
        version: collectionData.version || '1.0.0',
        schema: 'https://schema.testweb.com/v1/collection.json'
      },
      
      // 变量定义
      variable: collectionData.variables || [],
      
      // 认证配置
      auth: collectionData.auth || null,
      
      // 事件脚本
      event: collectionData.events || [],
      
      // 请求项目
      item: [],
      
      // 元数据
      metadata: {
        tags: collectionData.tags || [],
        isPublic: collectionData.isPublic || false,
        sharedWith: collectionData.sharedWith || [],
        forkedFrom: collectionData.forkedFrom || null,
        starCount: 0,
        downloadCount: 0
      }
    };

    // 保存到内存和磁盘
    this.collections.set(collection.id, collection);
    await this.saveCollection(collection);
    
    
    return collection;
  }

  /**
   * 创建文件夹
   */
  async createFolder(collectionId, folderData) {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`集合不存在: ${collectionId}`);
    }

    const folder = {
      id: uuidv4(),
      name: folderData.name || 'New Folder',
      description: folderData.description || '',
      auth: folderData.auth || null,
      event: folderData.events || [],
      variable: folderData.variables || [],
      item: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 添加到父级（集合或文件夹）
    const parentId = folderData.parentId;
    if (parentId && parentId !== collectionId) {
      const parentFolder = this.findItemInCollection(collection, parentId);
      if (parentFolder && parentFolder.item) {
        parentFolder.item.push(folder);
      }
    } else {
      collection.item.push(folder);
    }

    this.folders.set(folder.id, folder);
    collection.updatedAt = new Date().toISOString();
    await this.saveCollection(collection);

    return folder;
  }

  /**
   * 添加请求到集合
   */
  async addRequest(collectionId, requestData, parentFolderId = null) {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`集合不存在: ${collectionId}`);
    }

    const request = {
      id: uuidv4(),
      name: requestData.name || 'Untitled Request',
      description: requestData.description || '',
      
      // HTTP请求配置
      request: {
        method: requestData.method || 'GET',
        header: this.normalizeHeaders(requestData.headers || []),
        body: requestData.body || {},
        url: this.normalizeUrl(requestData.url || ''),
        auth: requestData.auth || null,
        proxy: requestData.proxy || {},
        certificate: requestData.certificate || {},
        description: requestData.description || ''
      },
      
      // 响应示例
      response: requestData.responses || [],
      
      // 事件脚本
      event: requestData.events || [],
      
      // 元数据
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: requestData.tags || [],
        notes: requestData.notes || '',
        difficulty: requestData.difficulty || 'beginner'
      }
    };

    // 添加到指定位置
    if (parentFolderId) {
      const folder = this.findItemInCollection(collection, parentFolderId);
      if (folder && folder.item) {
        folder.item.push(request);
      } else {
        throw new Error(`文件夹不存在: ${parentFolderId}`);
      }
    } else {
      collection.item.push(request);
    }

    this.requests.set(request.id, request);
    collection.updatedAt = new Date().toISOString();
    await this.saveCollection(collection);

    return request;
  }

  /**
   * 批量导入Postman集合
   */
  async importPostmanCollection(postmanData) {
    
    const collection = await this.createCollection({
      name: postmanData.info?.name || 'Imported Collection',
      description: postmanData.info?.description || 'Imported from Postman',
      version: postmanData.info?.version || '1.0.0',
      variables: this.convertPostmanVariables(postmanData.variable || []),
      auth: this.convertPostmanAuth(postmanData.auth),
      events: this.convertPostmanEvents(postmanData.event || [])
    });

    // 递归导入项目
    if (postmanData.item) {
      await this.importPostmanItems(collection.id, postmanData.item);
    }

    console.log(`✅ 成功导入Postman集合: ${collection.name}`);
    
    return collection;
  }

  /**
   * 导入Postman项目（递归）
   */
  async importPostmanItems(collectionId, items, parentFolderId = null) {
    for (const item of items) {
      if (item.item) {
        // 这是一个文件夹
        const folder = await this.createFolder(collectionId, {
          name: item.name,
          description: item.description,
          auth: this.convertPostmanAuth(item.auth),
          events: this.convertPostmanEvents(item.event || []),
          variables: this.convertPostmanVariables(item.variable || []),
          parentId: parentFolderId
        });
        
        // 递归导入子项目
        await this.importPostmanItems(collectionId, item.item, folder.id);
      } else {
        // 这是一个请求
        await this.addRequest(collectionId, {
          name: item.name,
          description: item.description,
          method: item.request?.method,
          url: item.request?.url,
          headers: this.convertPostmanHeaders(item.request?.header || []),
          body: this.convertPostmanBody(item.request?.body),
          auth: this.convertPostmanAuth(item.request?.auth),
          events: this.convertPostmanEvents(item.event || []),
          responses: item.response || []
        }, parentFolderId);
      }
    }
  }

  /**
   * 导出集合为Postman格式
   */
  async exportToPostman(collectionId) {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`集合不存在: ${collectionId}`);
    }

    const postmanCollection = {
      info: {
        _postman_id: collection.id,
        name: collection.name,
        description: collection.description,
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: this.convertToPostmanItems(collection.item),
      variable: this.convertToPostmanVariables(collection.variable),
      auth: this.convertToPostmanAuth(collection.auth),
      event: this.convertToPostmanEvents(collection.event)
    };

    return postmanCollection;
  }

  /**
   * 运行集合中的所有请求
   */
  async runCollection(collectionId, options = {}) {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`集合不存在: ${collectionId}`);
    }

    const runId = uuidv4();
    const startTime = Date.now();
    
    console.log(`🚀 开始运行集合: ${collection.name}`);

    const results = {
      id: runId,
      collection: {
        id: collection.id,
        name: collection.name
      },
      startTime,
      endTime: null,
      duration: null,
      totalRequests: 0,
      passedRequests: 0,
      failedRequests: 0,
      skippedRequests: 0,
      results: [],
      environment: options.environment || {},
      iterations: options.iterations || 1,
      delay: options.delay || 0
    };

    // 递归运行所有请求
    await this.runCollectionItems(collection.item, results, options);

    // 完成统计
    results.endTime = Date.now();
    results.duration = results.endTime - results.startTime;
    
    console.log(`✅ 集合运行完成: ${collection.name}`);

    return results;
  }

  /**
   * 递归运行集合项目
   */
  async runCollectionItems(items, results, options, folderPath = '') {
    const RealHTTPEngine = require('../../engines/api/RealHTTPEngine');
    const httpEngine = new RealHTTPEngine();

    for (const item of items) {
      if (item.item) {
        // 文件夹 - 递归运行
        const currentPath = folderPath ? `${folderPath}/${item.name}` : item.name;
        await this.runCollectionItems(item.item, results, options, currentPath);
      } else if (item.request) {
        // 请求 - 执行
        results.totalRequests++;
        
        const requestPath = folderPath ? `${folderPath}/${item.name}` : item.name;

        try {
          // 解析变量和环境
          const resolvedRequest = this.resolveVariables(item.request, options.environment || {});
          
          // 执行HTTP请求
          const response = await httpEngine.makeRequest({
            method: resolvedRequest.method,
            url: resolvedRequest.url,
            headers: this.convertHeadersToObject(resolvedRequest.header),
            data: resolvedRequest.body,
            auth: resolvedRequest.auth,
            timeout: options.timeout || 30000
          });

          // 记录结果
          const requestResult = {
            id: uuidv4(),
            name: item.name,
            path: requestPath,
            request: resolvedRequest,
            response,
            success: response.success !== false,
            duration: response.duration,
            timestamp: new Date().toISOString()
          };

          results.results.push(requestResult);

          if (requestResult.success) {
            results.passedRequests++;
          } else {
            results.failedRequests++;
          }

          // 请求间延迟
          if (options.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, options.delay));
          }

        } catch (error) {
          results.failedRequests++;
          
          results.results.push({
            id: uuidv4(),
            name: item.name,
            path: requestPath,
            request: item.request,
            error: error.message,
            success: false,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  }

  /**
   * 分享集合
   */
  async shareCollection(collectionId, shareOptions = {}) {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`集合不存在: ${collectionId}`);
    }

    const shareId = uuidv4();
    const shareData = {
      id: shareId,
      collectionId: collection.id,
      name: collection.name,
      description: collection.description,
      createdAt: new Date().toISOString(),
      expiresAt: shareOptions.expiresAt || null,
      permissions: shareOptions.permissions || 'read',
      password: shareOptions.password || null,
      allowDownload: shareOptions.allowDownload !== false,
      viewCount: 0,
      downloadCount: 0
    };

    // 如果设置了密码，进行哈希
    if (shareData.password) {
      shareData.passwordHash = crypto.createHash('sha256')
        .update(shareData.password)
        .digest('hex');
      delete shareData.password;
    }

    // 生成分享链接
    const shareUrl = `${this.options.baseUrl || 'https://testweb.com'}/shared/${shareId}`;
    shareData.shareUrl = shareUrl;

    // 保存分享信息
    await this.saveShareData(shareData);


    return shareData;
  }

  /**
   * 工具方法
   */
  normalizeHeaders(headers) {
    if (Array.isArray(headers)) {
      return headers.map(header => ({
        key: header.key || '',
        value: header.value || '',
        disabled: header.disabled || false,
        description: header.description || ''
      }));
    }
    
    if (typeof headers === 'object') {
      return Object.entries(headers).map(([key, value]) => ({
        key,
        value: String(value),
        disabled: false
      }));
    }
    
    return [];
  }

  normalizeUrl(url) {
    if (typeof url === 'string') {
      return { raw: url, host: [], path: [], query: [], variable: [] };
    }
    
    if (typeof url === 'object' && url.raw) {
      return url;
    }
    
    return { raw: '', host: [], path: [], query: [], variable: [] };
  }

  convertHeadersToObject(headers) {
    const obj = {};
    if (Array.isArray(headers)) {
      headers.forEach(header => {
        if (!header.disabled && header.key) {
          obj[header.key] = header.value;
        }
      });
    }
    return obj;
  }

  resolveVariables(request, environment) {
    // 简化的变量解析实现
    const resolved = JSON.parse(JSON.stringify(request));
    
    // 解析URL中的变量
    if (resolved.url && resolved.url.raw) {
      resolved.url.raw = this.replaceVariables(resolved.url.raw, environment);
    }
    
    // 解析头部中的变量
    if (resolved.header) {
      resolved.header.forEach(header => {
        if (header.value) {
          header.value = this.replaceVariables(header.value, environment);
        }
      });
    }
    
    return resolved;
  }

  replaceVariables(text, variables) {
    if (typeof text !== 'string') return text;
    
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] || match;
    });
  }

  findItemInCollection(collection, itemId) {
    const findInItems = (items) => {
      for (const item of items) {
        if (item.id === itemId) {
          return item;
        }
        if (item.item) {
          const found = findInItems(item.item);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findInItems(collection.item);
  }

  countItemsInCollection(collection) {
    const countItems = (items) => {
      let count = 0;
      for (const item of items) {
        count++;
        if (item.item) {
          count += countItems(item.item);
        }
      }
      return count;
    };
    
    return countItems(collection.item);
  }

  /**
   * Postman格式转换方法
   */
  convertPostmanVariables(variables) {
    return variables.map(v => ({
      key: v.key,
      value: v.value,
      type: v.type || 'string',
      description: v.description || ''
    }));
  }

  convertPostmanAuth(auth) {
    if (!auth) return null;
    
    return {
      type: auth.type,
      ...auth[auth.type] || {}
    };
  }

  convertPostmanEvents(events) {
    return events.map(event => ({
      listen: event.listen,
      script: {
        type: event.script?.type || 'text/javascript',
        exec: event.script?.exec || []
      }
    }));
  }

  convertPostmanHeaders(headers) {
    return headers.map(h => ({
      key: h.key,
      value: h.value,
      disabled: h.disabled || false,
      description: h.description || ''
    }));
  }

  convertPostmanBody(body) {
    if (!body) return {};
    
    return {
      mode: body.mode,
      raw: body.raw,
      urlencoded: body.urlencoded,
      formdata: body.formdata,
      file: body.file,
      graphql: body.graphql,
      disabled: body.disabled || false,
      options: body.options || {}
    };
  }

  /**
   * 存储方法
   */
  async ensureStorageDir() {
    try {
      await fs.mkdir(this.options.storageDir, { recursive: true });
    } catch (error) {
      console.error('创建存储目录失败:', error);
    }
  }

  async saveCollection(collection) {
    const filePath = path.join(this.options.storageDir, `${collection.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(collection, null, 2));
  }

  async loadCollection(collectionId) {
    const filePath = path.join(this.options.storageDir, `${collectionId}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  async saveShareData(shareData) {
    const filePath = path.join(this.options.storageDir, 'shares', `${shareData.id}.json`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(shareData, null, 2));
  }

  /**
   * 获取集合列表
   */
  async getCollections() {
    return Array.from(this.collections.values()).map(collection => ({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      itemCount: this.countItemsInCollection(collection),
      isPublic: collection.metadata?.isPublic || false,
      tags: collection.metadata?.tags || []
    }));
  }

  /**
   * 获取集合详情
   */
  getCollection(collectionId) {
    return this.collections.get(collectionId);
  }

  /**
   * 删除集合
   */
  async deleteCollection(collectionId) {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`集合不存在: ${collectionId}`);
    }

    // 从内存中删除
    this.collections.delete(collectionId);

    // 从磁盘删除
    const filePath = path.join(this.options.storageDir, `${collectionId}.json`);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('删除集合文件失败:', error.message);
    }

    return true;
  }
}

module.exports = CollectionManager;
