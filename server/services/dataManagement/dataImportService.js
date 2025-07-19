/**
 * 数据导入服务
 * 专门处理数据导入功能
 */

const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');

class DataImportService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/data-import.log' }),
        new winston.transports.Console()
      ]
    });

    this.uploadDir = path.join(__dirname, '../../uploads');
    this.ensureUploadDir();
  }

  /**
   * 确保上传目录存在
   */
  async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      this.logger.error('创建上传目录失败:', error);
    }
  }

  /**
   * 导入测试历史数据
   */
  async importTestHistory(userId, file, options = {}) {
    try {
      const {
        format = 'json',
        skipDuplicates = true,
        updateExisting = false,
        validateOnly = false
      } = options;

      // 读取文件内容
      const fileContent = await fs.readFile(file.path, 'utf8');
      let data;

      // 根据格式解析数据
      switch (format.toLowerCase()) {
        case 'json':
          data = await this.parseJSONFile(fileContent);
          break;
        case 'csv':
          data = await this.parseCSVFile(fileContent);
          break;
        default:
          throw new Error(`不支持的导入格式: ${format}`);
      }

      // 验证数据
      const validationResult = await this.validateImportData(data);
      if (!validationResult.isValid) {
        throw new Error(`数据验证失败: ${validationResult.errors.join(', ')}`);
      }

      // 如果只是验证，返回验证结果
      if (validateOnly) {
        return {
          success: true,
          data: {
            isValid: true,
            recordCount: data.length,
            validRecords: validationResult.validRecords,
            invalidRecords: validationResult.invalidRecords
          }
        };
      }

      // 执行导入
      const importResult = await this.executeImport(userId, data, {
        skipDuplicates,
        updateExisting
      });

      // 记录导入任务
      const importTask = {
        id: this.generateTaskId(),
        name: `测试历史导入_${new Date().toISOString().replace(/[:.]/g, '-')}`,
        type: 'test_history',
        format,
        status: 'completed',
        recordsTotal: data.length,
        recordsProcessed: importResult.processedCount,
        recordsSkipped: importResult.skippedCount,
        recordsUpdated: importResult.updatedCount,
        createdAt: new Date().toISOString(),
        userId
      };

      return {
        success: true,
        data: importTask
      };

    } catch (error) {
      this.logger.error('导入测试历史失败:', error);
      throw new Error(`导入测试历史失败: ${error.message}`);
    }
  }

  /**
   * 解析JSON文件
   */
  async parseJSONFile(content) {
    try {
      const parsed = JSON.parse(content);
      
      // 如果是导出的格式，提取data字段
      if (parsed.data && Array.isArray(parsed.data)) {
        return parsed.data;
      }
      
      // 如果直接是数组
      if (Array.isArray(parsed)) {
        return parsed;
      }
      
      throw new Error('JSON文件格式不正确，应该包含数组数据');

    } catch (error) {
      throw new Error(`JSON解析失败: ${error.message}`);
    }
  }

  /**
   * 解析CSV文件
   */
  async parseCSVFile(content) {
    try {
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV文件至少需要包含标题行和一行数据');
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        const record = {};
        
        headers.forEach((header, index) => {
          record[header] = values[index] || null;
        });
        
        data.push(record);
      }

      return data;

    } catch (error) {
      throw new Error(`CSV解析失败: ${error.message}`);
    }
  }

  /**
   * 解析CSV行
   */
  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // 跳过下一个引号
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  /**
   * 验证导入数据
   */
  async validateImportData(data) {
    const errors = [];
    const validRecords = [];
    const invalidRecords = [];

    if (!Array.isArray(data)) {
      return {
        isValid: false,
        errors: ['数据必须是数组格式'],
        validRecords: [],
        invalidRecords: []
      };
    }

    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      const recordErrors = [];

      // 验证必需字段
      if (!record.test_name && !record.testName) {
        recordErrors.push('缺少测试名称');
      }

      if (!record.test_type && !record.testType) {
        recordErrors.push('缺少测试类型');
      }

      if (!record.url) {
        recordErrors.push('缺少URL');
      }

      // 验证URL格式
      if (record.url && !this.isValidURL(record.url)) {
        recordErrors.push('URL格式不正确');
      }

      // 验证测试类型
      const validTypes = ['website', 'performance', 'security', 'seo', 'stress', 'api', 'compatibility', 'ux'];
      const testType = record.test_type || record.testType;
      if (testType && !validTypes.includes(testType)) {
        recordErrors.push(`不支持的测试类型: ${testType}`);
      }

      if (recordErrors.length > 0) {
        invalidRecords.push({
          index: i,
          record,
          errors: recordErrors
        });
        errors.push(`第${i + 1}行: ${recordErrors.join(', ')}`);
      } else {
        validRecords.push(record);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      validRecords,
      invalidRecords
    };
  }

  /**
   * 执行导入
   */
  async executeImport(userId, data, options) {
    const { skipDuplicates, updateExisting } = options;
    const { query } = require('../../config/database');
    
    let processedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    for (const record of data) {
      try {
        // 标准化字段名
        const normalizedRecord = this.normalizeRecord(record);
        
        // 检查是否存在重复记录
        const existingRecord = await this.findExistingRecord(userId, normalizedRecord);
        
        if (existingRecord) {
          if (updateExisting) {
            // 更新现有记录
            await this.updateRecord(existingRecord.id, normalizedRecord);
            updatedCount++;
          } else if (skipDuplicates) {
            // 跳过重复记录
            skippedCount++;
            continue;
          }
        } else {
          // 创建新记录
          await this.createRecord(userId, normalizedRecord);
          processedCount++;
        }

      } catch (error) {
        this.logger.error('导入记录失败:', { record, error: error.message });
        // 继续处理下一条记录
      }
    }

    return {
      processedCount,
      skippedCount,
      updatedCount
    };
  }

  /**
   * 标准化记录字段
   */
  normalizeRecord(record) {
    return {
      testName: record.test_name || record.testName,
      testType: record.test_type || record.testType,
      url: record.url,
      status: record.status || 'completed',
      startTime: record.start_time || record.startTime || new Date().toISOString(),
      endTime: record.end_time || record.endTime,
      duration: record.duration ? parseInt(record.duration) : null,
      config: this.parseJsonField(record.config),
      results: this.parseJsonField(record.results)
    };
  }

  /**
   * 查找现有记录
   */
  async findExistingRecord(userId, record) {
    try {
      const { query } = require('../../config/database');
      
      const result = await query(
        `SELECT id FROM test_history 
         WHERE user_id = $1 AND test_name = $2 AND url = $3 AND test_type = $4`,
        [userId, record.testName, record.url, record.testType]
      );

      return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {
      this.logger.error('查找现有记录失败:', error);
      return null;
    }
  }

  /**
   * 创建新记录
   */
  async createRecord(userId, record) {
    const { query } = require('../../config/database');
    
    await query(
      `INSERT INTO test_history 
       (test_name, test_type, url, status, start_time, end_time, duration, 
        user_id, config, results, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        record.testName,
        record.testType,
        record.url,
        record.status,
        record.startTime,
        record.endTime,
        record.duration,
        userId,
        record.config ? JSON.stringify(record.config) : null,
        record.results ? JSON.stringify(record.results) : null
      ]
    );
  }

  /**
   * 更新记录
   */
  async updateRecord(recordId, record) {
    const { query } = require('../../config/database');
    
    await query(
      `UPDATE test_history 
       SET status = $1, end_time = $2, duration = $3, 
           results = $4, updated_at = NOW()
       WHERE id = $5`,
      [
        record.status,
        record.endTime,
        record.duration,
        record.results ? JSON.stringify(record.results) : null,
        recordId
      ]
    );
  }

  /**
   * 获取导入任务列表
   */
  async getImportTasks(userId) {
    try {
      // 这里应该从数据库获取导入任务记录
      // 暂时返回模拟数据
      const mockTasks = [
        {
          id: '1',
          name: '测试数据导入_2025-07-19',
          type: 'test_history',
          status: 'completed',
          recordsTotal: 100,
          recordsProcessed: 95,
          recordsSkipped: 5,
          createdAt: new Date().toISOString(),
          userId
        }
      ];

      return {
        success: true,
        data: mockTasks
      };

    } catch (error) {
      this.logger.error('获取导入任务失败:', error);
      throw new Error(`获取导入任务失败: ${error.message}`);
    }
  }

  /**
   * 解析JSON字段
   */
  parseJsonField(field) {
    if (!field) return null;
    if (typeof field === 'object') return field;
    
    try {
      return JSON.parse(field);
    } catch (error) {
      return null;
    }
  }

  /**
   * 验证URL格式
   */
  isValidURL(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * 生成任务ID
   */
  generateTaskId() {
    return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = DataImportService;
