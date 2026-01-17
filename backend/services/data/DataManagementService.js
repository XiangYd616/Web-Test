/**
 * 数据管理服务
 * 提供完整的数据CRUD操作、导入导出、统计分析、备份恢复等功能
 */

const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');

/**

 * DataManagementService类 - 负责处理相关功能

 */
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

  /**
   * 处理constructor事件
   * @param {Object} event - 事件对象
   * @returns {Promise<void>}
   */
class DataManagementService extends EventEmitter {
  constructor() {
    super();
    this.dataStore = new Map(); // 内存数据存储
    this.backupDir = path.join(process.cwd(), 'data', 'backups');
    this.exportDir = path.join(process.cwd(), 'data', 'exports');
    this.isInitialized = false;
    
    // 数据类型定义
    this.dataTypes = {
      TEST_RESULTS: 'test_results',
      USER_DATA: 'user_data',
      SYSTEM_LOGS: 'system_logs',
      ANALYTICS: 'analytics',
      REPORTS: 'reports',
      CONFIGURATIONS: 'configurations'
    };
    
  }

  /**
   * 初始化数据管理服务
   */
  async initialize() {
    if (this.isInitialized) {
      
        return;
      }

    try {
      // 创建必要的目录
      await this.ensureDirectories();
      
      // 加载现有数据
      await this.loadExistingData();
      
      // 设置定期备份
      this.setupPeriodicBackup();
      
      this.isInitialized = true;
      console.log('✅ 数据管理服务初始化完成');
      
      this.emit('initialized');
    } catch (error) {
      console.error('❌ 数据管理服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建数据记录
   */
  async createData(type, data, options = {}) {
    try {
      const id = this.generateId();
      const timestamp = new Date().toISOString();
      
      const record = {
        id,
        type,
        data,
        metadata: {
          createdAt: timestamp,
          updatedAt: timestamp,
          version: 1,
          tags: options.tags || [],
          source: options.source || 'api',
          userId: options.userId
        }
      };

      // 验证数据
      this.validateData(type, data);
      
      // 存储数据
      if (!this.dataStore.has(type)) {
        this.dataStore.set(type, new Map());
      }
      this.dataStore.get(type).set(id, record);
      
      // 触发事件
      this.emit('dataCreated', { type, id, record });
      
      return { id, record };
      
    } catch (error) {
      console.error('创建数据失败:', error);
      throw error;
    }
  }

  /**
   * 读取数据记录
   */
  async readData(type, id, options = {}) {
    try {
      if (!this.dataStore.has(type)) {
        throw new Error(`数据类型不存在: ${type}`);
      }
      
      const typeStore = this.dataStore.get(type);
      if (!typeStore.has(id)) {
        throw new Error(`数据记录不存在: ${type}/${id}`);
      }
      
      const record = typeStore.get(id);
      
      // 应用过滤器
      if (options.fields) {
        
        return this.filterFields(record, options.fields);
      }
      
      return record;
      
    } catch (error) {
      console.error('读取数据失败:', error);
      throw error;
    }
  }

  /**
   * 更新数据记录
   */
  async updateData(type, id, updates, options = {}) {
    try {
      const existingRecord = await this.readData(type, id);
      
      const updatedRecord = {
        ...existingRecord,
        data: { ...existingRecord.data, ...updates },
        metadata: {
          ...existingRecord.metadata,
          updatedAt: new Date().toISOString(),
          version: existingRecord.metadata.version + 1,
          updatedBy: options.userId
        }
      };

      // 验证更新后的数据
      this.validateData(type, updatedRecord.data);
      
      // 保存更新
      this.dataStore.get(type).set(id, updatedRecord);
      
      // 触发事件
      this.emit('dataUpdated', { type, id, record: updatedRecord, changes: updates });
      
      return updatedRecord;
      
    } catch (error) {
      console.error('更新数据失败:', error);
      throw error;
    }
  }

  /**
   * 删除数据记录
   */
  async deleteData(type, id, options = {}) {
    try {
      const record = await this.readData(type, id);
      
      if (options.softDelete) {
        
        // 软删除：标记为已删除
        return await this.updateData(type, id, {
      }, {
          ...options,
          metadata: { deletedAt: new Date().toISOString(), deletedBy: options.userId }
        });
      } else {
        // 硬删除：直接移除
        this.dataStore.get(type).delete(id);
        
        // 触发事件
        this.emit('dataDeleted', { type, id, record });
        
        return { success: true, deletedRecord: record };
      }
      
    } catch (error) {
      console.error('删除数据失败:', error);
      throw error;
    }
  }

  /**
   * 查询数据
   */
  async queryData(type, query = {}, options = {}) {
    try {
      if (!this.dataStore.has(type)) {
        return { results: [], total: 0 };
      }
      
      const typeStore = this.dataStore.get(type);
      let results = Array.from(typeStore.values());
      
      // 应用过滤器
      if (query.filters) {
        results = this.applyFilters(results, query.filters);
      }
      
      // 应用搜索
      if (query.search) {
        results = this.applySearch(results, query.search);
      }
      
      // 应用排序
      if (query.sort) {
        results = this.applySort(results, query.sort);
      }
      
      const total = results.length;
      
      // 应用分页
      if (options.page && options.limit) {
        const start = (options.page - 1) * options.limit;
        results = results.slice(start, start + options.limit);
      }
      
      return {
        results,
        total,
        page: options.page || 1,
        limit: options.limit || total,
        totalPages: options.limit ? Math.ceil(total / options.limit) : 1
      };
      
    } catch (error) {
      console.error('查询数据失败:', error);
      throw error;
    }
  }

  /**
   * 批量操作
   */
  async batchOperation(operations) {
    const results = [];
    const errors = [];
    
    try {
      for (const operation of operations) {
        try {
          let result;
          
          switch (operation.type) {
            case 'create':
              result = await this.createData(operation.dataType, operation.data, operation.options);
              break;
            case 'update':
              result = await this.updateData(operation.dataType, operation.id, operation.updates, operation.options);
              break;
            case 'delete':
              result = await this.deleteData(operation.dataType, operation.id, operation.options);
              break;
            default:
              throw new Error(`不支持的操作类型: ${operation.type}`);
          }
          
          results.push({ operation, result, success: true });
          
        } catch (error) {
          errors.push({ operation, error: error.message, success: false });
        }
      }
      
      
      return {
        success: errors.length === 0,
        results,
        errors,
        summary: {
          total: operations.length,
          successful: results.length,
          failed: errors.length
        }
      };
      
    } catch (error) {
      console.error('批量操作失败:', error);
      throw error;
    }
  }

  /**
   * 数据导入
   */
  async importData(type, filepath, format = 'json', options = {}) {
    try {
      let data;
      
      switch (format) {
        case 'json':
          data = await this.importFromJson(filepath);
          break;
        case 'csv':
          data = await this.importFromCsv(filepath);
          break;
        default:
          throw new Error(`不支持的导入格式: ${format}`);
      }
      
      const results = [];
      const errors = [];
      
      for (const item of data) {
        try {
          const result = await this.createData(type, item, options);
          results.push(result);
        } catch (error) {
          errors.push({ item, error: error.message });
        }
      }
      
      
      return {
        success: errors.length === 0,
        imported: results.length,
        failed: errors.length,
        errors
      };
      
    } catch (error) {
      console.error('数据导入失败:', error);
      throw error;
    }
  }

  /**
   * 数据统计
   */
  async getStatistics(type, options = {}) {
    try {
      if (!this.dataStore.has(type)) {
        return { total: 0, statistics: {} };
      }
      
      const typeStore = this.dataStore.get(type);
      const records = Array.from(typeStore.values());
      
      const statistics = {
        total: records.length,
        createdToday: this.countRecordsToday(records),
        createdThisWeek: this.countRecordsThisWeek(records),
        createdThisMonth: this.countRecordsThisMonth(records),
        averageSize: this.calculateAverageSize(records),
        latestRecord: this.getLatestRecord(records),
        oldestRecord: this.getOldestRecord(records)
      };
      
      // 自定义统计
      if (options.customStats) {
        statistics.custom = this.calculateCustomStats(records, options.customStats);
      }
      
      return statistics;
      
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 数据备份
   */
  async createBackup(types = null, options = {}) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = options.name || `backup_${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);
      
      await fs.mkdir(backupPath, { recursive: true });
      
      const typesToBackup = types || Array.from(this.dataStore.keys());
      const backupInfo = {
        name: backupName,
        timestamp,
        types: typesToBackup,
        records: {}
      };
      
      for (const type of typesToBackup) {
        if (this.dataStore.has(type)) {
          const typeData = Array.from(this.dataStore.get(type).values());
          const typeFile = path.join(backupPath, `${type}.json`);
          
          await fs.writeFile(typeFile, JSON.stringify(typeData, null, 2));
          backupInfo.records[type] = typeData.length;
        }
      }
      
      // 保存备份信息
      const infoFile = path.join(backupPath, 'backup-info.json');
      await fs.writeFile(infoFile, JSON.stringify(backupInfo, null, 2));
      
      
      return backupInfo;
      
    } catch (error) {
      console.error('数据备份失败:', error);
      throw error;
    }
  }

  /**
   * 辅助方法
   */
  generateId() {
    return `data_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validateData(type, data) {
    // 基础数据验证
    if (!data || typeof data !== 'object') {
      throw new Error('数据必须是有效的对象');
    }
    
    // 根据类型进行特定验证
    switch (type) {
      case this.dataTypes.TEST_RESULTS:
        if (!data.url || !data.testType) {
          throw new Error('测试结果必须包含URL和测试类型');
        }
        break;
      case this.dataTypes.USER_DATA:
        if (!data.userId) {
          throw new Error('用户数据必须包含用户ID');
        }
        break;
    }
  }

  async ensureDirectories() {
    await fs.mkdir(this.backupDir, { recursive: true });
    await fs.mkdir(this.exportDir, { recursive: true });
  }

  async loadExistingData() {
    // 这里可以从数据库或文件系统加载现有数据
  }

  setupPeriodicBackup() {
    // 每天凌晨2点自动备份
    const backupInterval = 24 * 60 * 60 * 1000; // 24小时
    setInterval(async () => {
      try {
        await this.createBackup(null, { name: `auto_backup_${Date.now()}` });
      } catch (error) {
        console.error('自动备份失败:', error);
      }
    }, backupInterval);
  }

  filterFields(record, fields) {
    const filtered = {};
    for (const field of fields) {
      if (record[field] !== undefined) {
        filtered[field] = record[field];
      }
    }
    return filtered;
  }

  applyFilters(records, filters) {
    return records.filter(record => {
        /**
         * if功能函数
         * @param {Object} params - 参数对象
         * @returns {Promise<Object>} 返回结果
         */
      for (const [key, value] of Object.entries(filters)) {
        if (record.data[key] !== value) {
          
        return false;
      }
      }
      return true;
    });
  }

  applySearch(records, searchTerm) {
    const term = searchTerm.toLowerCase();
    return records.filter(record => {
      const searchableText = JSON.stringify(record.data).toLowerCase();
      return searchableText.includes(term);
    });
  }

  applySort(records, sortConfig) {
    return records.sort((a, b) => {
      const aValue = a.data[sortConfig.field] || a.metadata[sortConfig.field];
      
      /**
      
       * if功能函数
      
       * @param {Object} params - 参数对象
      
       * @returns {Promise<Object>} 返回结果
      
       */
      const bValue = b.data[sortConfig.field] || b.metadata[sortConfig.field];
      
      if (sortConfig.direction === 'desc') {
        
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });
  }

  async exportToJson(data, filepath) {
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
  }

  async exportToCsv(data, filepath) {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0].data);
    const csvWriter = createCsvWriter({
      path: filepath,
      header: headers.map(h => ({ id: h, title: h }))
    });
    
    const csvData = data.map(record => record.data);
    await csvWriter.writeRecords(csvData);
  }

  async exportToExcel(data, filepath) {
    // 简化的Excel导出（实际应使用xlsx库）
    await this.exportToJson(data, filepath.replace('.excel', '.json'));
  }

  async exportToXml(data, filepath) {
    // 简化的XML导出
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<data>\n${
      data.map(record => `  <record>${JSON.stringify(record.data)}</record>`).join('\n')
    }\n</data>`;
    await fs.writeFile(filepath, xml);
  }

  async importFromJson(filepath) {
    const content = await fs.readFile(filepath, 'utf8');
    return JSON.parse(content);
  }

  async importFromCsv(filepath) {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filepath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  countRecordsToday(records) {
    const today = new Date().toDateString();
    return records.filter(r => new Date(r.metadata.createdAt).toDateString() === today).length;
  }

  countRecordsThisWeek(records) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return records.filter(r => new Date(r.metadata.createdAt) > weekAgo).length;
  }

  countRecordsThisMonth(records) {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return records.filter(r => new Date(r.metadata.createdAt) > monthAgo).length;
  }

  calculateAverageSize(records) {
    if (records.length === 0) return 0;
    const totalSize = records.reduce((sum, record) => sum + JSON.stringify(record).length, 0);
    return Math.round(totalSize / records.length);
  }

  getLatestRecord(records) {
    if (records.length === 0) return null;
    return records.reduce((latest, record) => 
      new Date(record.metadata.createdAt) > new Date(latest.metadata.createdAt) ? record : latest
    );
  }

  getOldestRecord(records) {
    if (records.length === 0) return null;
    return records.reduce((oldest, record) => 
      new Date(record.metadata.createdAt) < new Date(oldest.metadata.createdAt) ? record : oldest
    );
  }

  calculateCustomStats(records, customStats) {
    // 自定义统计计算逻辑
    const stats = {};
    for (const stat of customStats) {
      switch (stat.type) {
        case 'count':
          stats[stat.name] = records.filter(r => r.data[stat.field] === stat.value).length;
          break;
        case 'average': {
          const values = records.map(r => r.data[stat.field]).filter(v => typeof v === 'number');
          stats[stat.name] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          break;
        }
      }
    }
    return stats;
  }
}

// 创建单例实例
const dataManagementService = new DataManagementService();

module.exports = {
  DataManagementService,
  dataManagementService
};
