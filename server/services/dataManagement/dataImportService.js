/**
 * 数据导入服务
 * 支持批量数据导入、格式验证和转换
 * 包含进度跟踪和错误处理功能
 */

const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const csv = require('csv-parser');
const ExcelJS = require('exceljs');
const { EventEmitter } = require('events');
const { createReadStream } = require('fs');

class DataImportService extends EventEmitter {
  constructor(dbPool) {
    super();

    this.dbPool = dbPool;
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
    this.tempDir = path.join(__dirname, '../../temp/imports');

    // 导入任务队列
    this.importQueue = new Map();
    this.activeImports = new Map();

    // 支持的格式
    this.supportedFormats = ['csv', 'json', 'excel', 'xlsx'];
    this.supportedDataTypes = ['test-results', 'monitoring-data', 'user-data', 'test-configurations'];

    // 最大文件大小 (50MB)
    this.maxFileSize = 50 * 1024 * 1024;

    this.ensureDirectories();
    this.initializeDatabase();
  }

  /**
   * 确保导入目录存在
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
      this.logger.info('导入目录初始化完成');
    } catch (error) {
      this.logger.error('创建导入目录失败:', error);
      throw error;
    }
  }

  /**
   * 初始化数据库表
   */
  async initializeDatabase() {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS import_tasks (
          id VARCHAR(255) PRIMARY KEY,
          user_id INTEGER NOT NULL,
          name VARCHAR(255) NOT NULL,
          data_type VARCHAR(50) NOT NULL,
          format VARCHAR(20) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          progress INTEGER DEFAULT 0,
          file_path VARCHAR(500),
          file_size BIGINT,
          total_records INTEGER DEFAULT 0,
          processed_records INTEGER DEFAULT 0,
          success_records INTEGER DEFAULT 0,
          failed_records INTEGER DEFAULT 0,
          validation_errors JSONB,
          preview_data JSONB,
          mapping_config JSONB,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          INDEX idx_import_tasks_user (user_id),
          INDEX idx_import_tasks_status (status),
          INDEX idx_import_tasks_created (created_at)
        )
      `;

      if (this.dbPool) {
        await this.dbPool.query(createTableQuery);
        this.logger.info('导入任务表初始化完成');
      }
    } catch (error) {
      this.logger.error('初始化数据库表失败:', error);
    }
  }

  /**
   * 创建导入任务
   */
  async createImportTask(userId, file, config) {
    try {
      // 验证文件
      await this.validateFile(file);

      // 验证配置
      this.validateImportConfig(config);

      const taskId = this.generateTaskId();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const taskName = `${config.dataType}_import_${timestamp}`;

      // 保存上传的文件
      const fileName = `${taskId}_${file.originalname}`;
      const filePath = path.join(this.uploadDir, fileName);
      await fs.writeFile(filePath, file.buffer);

      const task = {
        id: taskId,
        userId,
        name: taskName,
        dataType: config.dataType,
        format: this.getFileFormat(file.originalname),
        status: 'pending',
        progress: 0,
        filePath,
        fileSize: file.size,
        totalRecords: 0,
        processedRecords: 0,
        successRecords: 0,
        failedRecords: 0,
        validationErrors: [],
        previewData: null,
        mappingConfig: config.mapping || {},
        config,
        createdAt: new Date().toISOString()
      };

      // 保存到数据库
      if (this.dbPool) {
        await this.dbPool.query(
          `INSERT INTO import_tasks (
            id, user_id, name, data_type, format, status, progress, 
            file_path, file_size, mapping_config, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            taskId, userId, taskName, config.dataType, task.format, 'pending', 0,
            filePath, file.size, JSON.stringify(config.mapping || {}), task.createdAt
          ]
        );
      }

      // 添加到队列
      this.importQueue.set(taskId, task);

      // 生成预览数据
      await this.generatePreviewData(taskId);

      this.logger.info(`创建导入任务: ${taskId}`, {
        userId,
        dataType: config.dataType,
        format: task.format,
        fileSize: file.size
      });

      return {
        success: true,
        data: task
      };

    } catch (error) {
      this.logger.error('创建导入任务失败:', error);
      throw new Error(`创建导入任务失败: ${error.message}`);
    }
  }

  /**
   * 生成预览数据
   */
  async generatePreviewData(taskId) {
    try {
      const task = this.importQueue.get(taskId);
      if (!task) {
        throw new Error('任务不存在');
      }

      let previewData = [];
      const maxPreviewRows = 10;

      switch (task.format) {
        case 'csv':
          previewData = await this.previewCSV(task.filePath, maxPreviewRows);
          break;
        case 'json':
          previewData = await this.previewJSON(task.filePath, maxPreviewRows);
          break;
        case 'excel':
        case 'xlsx':
          previewData = await this.previewExcel(task.filePath, maxPreviewRows);
          break;
        default:
          throw new Error(`不支持的文件格式: ${task.format}`);
      }

      // 更新任务预览数据
      task.previewData = previewData;
      task.totalRecords = previewData.totalRecords || 0;

      // 更新数据库
      if (this.dbPool) {
        await this.dbPool.query(
          `UPDATE import_tasks 
           SET preview_data = $1, total_records = $2 
           WHERE id = $3`,
          [JSON.stringify(previewData), task.totalRecords, taskId]
        );
      }

      this.logger.info(`生成预览数据完成: ${taskId}`, {
        totalRecords: task.totalRecords,
        previewRows: previewData.data?.length || 0
      });

    } catch (error) {
      this.logger.error(`生成预览数据失败: ${taskId}`, error);
      throw error;
    }
  }

  /**
   * 预览CSV文件
   */
  async previewCSV(filePath, maxRows) {
    return new Promise((resolve, reject) => {
      const results = [];
      let headers = [];
      let totalRows = 0;

      createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headerList) => {
          headers = headerList;
        })
        .on('data', (data) => {
          totalRows++;
          if (results.length < maxRows) {
            results.push(data);
          }
        })
        .on('end', () => {
          resolve({
            headers,
            data: results,
            totalRecords: totalRows,
            format: 'csv'
          });
        })
        .on('error', reject);
    });
  }

  /**
   * 预览JSON文件
   */
  async previewJSON(filePath, maxRows) {
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const jsonData = JSON.parse(fileContent);

      let data = [];
      let headers = [];

      if (Array.isArray(jsonData)) {
        data = jsonData.slice(0, maxRows);
        if (data.length > 0) {
          headers = Object.keys(data[0]);
        }
      } else if (jsonData.data && Array.isArray(jsonData.data)) {
        data = jsonData.data.slice(0, maxRows);
        if (data.length > 0) {
          headers = Object.keys(data[0]);
        }
      } else {
        // 单个对象
        data = [jsonData];
        headers = Object.keys(jsonData);
      }

      return {
        headers,
        data,
        totalRecords: Array.isArray(jsonData) ? jsonData.length : (jsonData.data?.length || 1),
        format: 'json'
      };

    } catch (error) {
      throw new Error(`JSON文件解析失败: ${error.message}`);
    }
  }

  /**
   * 预览Excel文件
   */
  async previewExcel(filePath, maxRows) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const worksheet = workbook.getWorksheet(1); // 读取第一个工作表
      if (!worksheet) {
        throw new Error('Excel文件中没有找到工作表');
      }

      const headers = [];
      const data = [];
      let totalRows = 0;

      // 获取表头
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        headers.push(cell.value?.toString() || `Column${colNumber}`);
      });

      // 获取数据行
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // 跳过表头

        totalRows++;
        if (data.length < maxRows) {
          const rowData = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            rowData[header] = cell.value;
          });
          data.push(rowData);
        }
      });

      return {
        headers,
        data,
        totalRecords: totalRows,
        format: 'excel'
      };

    } catch (error) {
      throw new Error(`Excel文件解析失败: ${error.message}`);
    }
  }

  /**
   * 开始导入处理
   */
  async startImport(taskId, userId) {
    try {
      const task = this.importQueue.get(taskId);
      if (!task || task.userId !== userId) {
        throw new Error('任务不存在或无权限访问');
      }

      if (task.status !== 'pending') {
        throw new Error('任务状态不允许开始导入');
      }

      // 更新任务状态
      await this.updateTaskStatus(taskId, 'processing', 0);
      this.activeImports.set(taskId, task);

      // 异步处理导入
      this.processImportTask(taskId);

      return {
        success: true,
        message: '导入任务已开始处理'
      };

    } catch (error) {
      this.logger.error('开始导入失败:', error);
      throw error;
    }
  }

  /**
   * 处理导入任务
   */
  async processImportTask(taskId) {
    try {
      const task = this.activeImports.get(taskId);
      if (!task) {
        throw new Error('任务不存在');
      }

      this.logger.info(`开始处理导入任务: ${taskId}`);

      // 读取和验证数据
      const importData = await this.readImportData(task);
      await this.updateTaskProgress(taskId, 30);

      // 验证数据格式
      const validationResult = await this.validateImportData(importData, task);
      await this.updateTaskProgress(taskId, 50);

      if (validationResult.errors.length > 0) {
        // 有验证错误，但继续处理有效数据
        task.validationErrors = validationResult.errors;
        this.logger.warn(`导入数据验证发现错误: ${taskId}`, {
          errorCount: validationResult.errors.length
        });
      }

      // 导入有效数据
      const importResult = await this.importValidData(validationResult.validData, task);
      await this.updateTaskProgress(taskId, 90);

      // 更新任务完成状态
      await this.updateTaskStatus(taskId, 'completed', 100, {
        processedRecords: importResult.processed,
        successRecords: importResult.success,
        failedRecords: importResult.failed,
        validationErrors: task.validationErrors
      });

      // 从活动任务中移除
      this.activeImports.delete(taskId);
      this.importQueue.delete(taskId);

      // 发送完成事件
      this.emit('importCompleted', {
        taskId,
        userId: task.userId,
        result: importResult
      });

      this.logger.info(`导入任务完成: ${taskId}`, importResult);

    } catch (error) {
      this.logger.error(`导入任务失败: ${taskId}`, error);

      await this.updateTaskStatus(taskId, 'failed', null, null, error.message);
      this.activeImports.delete(taskId);
      this.importQueue.delete(taskId);

      // 发送失败事件
      this.emit('importFailed', { taskId, error: error.message });
    }
  }

  /**
   * 读取导入数据
   */
  async readImportData(task) {
    switch (task.format) {
      case 'csv':
        return await this.readCSVData(task.filePath);
      case 'json':
        return await this.readJSONData(task.filePath);
      case 'excel':
      case 'xlsx':
        return await this.readExcelData(task.filePath);
      default:
        throw new Error(`不支持的文件格式: ${task.format}`);
    }
  }

  /**
   * 读取CSV数据
   */
  async readCSVData(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];

      createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          results.push(data);
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', reject);
    });
  }

  /**
   * 读取JSON数据
   */
  async readJSONData(filePath) {
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const jsonData = JSON.parse(fileContent);

      if (Array.isArray(jsonData)) {
        return jsonData;
      } else if (jsonData.data && Array.isArray(jsonData.data)) {
        return jsonData.data;
      } else {
        return [jsonData];
      }

    } catch (error) {
      throw new Error(`JSON文件读取失败: ${error.message}`);
    }
  }

  /**
   * 读取Excel数据
   */
  async readExcelData(filePath) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        throw new Error('Excel文件中没有找到工作表');
      }

      const headers = [];
      const data = [];

      // 获取表头
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        headers.push(cell.value?.toString() || `Column${colNumber}`);
      });

      // 获取数据行
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // 跳过表头

        const rowData = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          rowData[header] = cell.value;
        });
        data.push(rowData);
      });

      return data;

    } catch (error) {
      throw new Error(`Excel文件读取失败: ${error.message}`);
    }
  }

  /**
   * 验证导入数据
   */
  async validateImportData(data, task) {
    const validData = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowErrors = [];

      try {
        // 根据数据类型进行验证
        const validationResult = await this.validateRowByDataType(row, task.dataType, i + 1);

        if (validationResult.isValid) {
          validData.push(validationResult.data);
        } else {
          rowErrors.push(...validationResult.errors);
        }

      } catch (error) {
        rowErrors.push({
          row: i + 1,
          field: 'general',
          message: error.message
        });
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      }
    }

    return {
      validData,
      errors,
      totalRows: data.length,
      validRows: validData.length,
      errorRows: errors.length
    };
  }

  /**
   * 根据数据类型验证行数据
   */
  async validateRowByDataType(row, dataType, rowNumber) {
    const errors = [];
    let processedData = { ...row };

    switch (dataType) {
      case 'test-results':
        return this.validateTestResultRow(row, rowNumber);
      case 'monitoring-data':
        return this.validateMonitoringDataRow(row, rowNumber);
      case 'user-data':
        return this.validateUserDataRow(row, rowNumber);
      case 'test-configurations':
        return this.validateTestConfigRow(row, rowNumber);
      default:
        errors.push({
          row: rowNumber,
          field: 'dataType',
          message: `不支持的数据类型: ${dataType}`
        });
    }

    return {
      isValid: errors.length === 0,
      data: processedData,
      errors
    };
  }

  /**
   * 验证测试结果行
   */
  validateTestResultRow(row, rowNumber) {
    const errors = [];
    const processedData = { ...row };

    // 必需字段验证
    const requiredFields = ['test_name', 'test_type', 'url', 'status'];
    for (const field of requiredFields) {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push({
          row: rowNumber,
          field,
          message: `必需字段 ${field} 不能为空`
        });
      }
    }

    // URL格式验证
    if (row.url) {
      try {
        new URL(row.url);
      } catch (error) {
        errors.push({
          row: rowNumber,
          field: 'url',
          message: 'URL格式无效'
        });
      }
    }

    // 状态值验证
    const validStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];
    if (row.status && !validStatuses.includes(row.status)) {
      errors.push({
        row: rowNumber,
        field: 'status',
        message: `状态值无效，必须是: ${validStatuses.join(', ')}`
      });
    }

    // 测试类型验证
    const validTestTypes = ['seo', 'performance', 'security', 'accessibility', 'stress', 'api'];
    if (row.test_type && !validTestTypes.includes(row.test_type)) {
      errors.push({
        row: rowNumber,
        field: 'test_type',
        message: `测试类型无效，必须是: ${validTestTypes.join(', ')}`
      });
    }

    // 日期格式验证
    if (row.created_at) {
      const date = new Date(row.created_at);
      if (isNaN(date.getTime())) {
        errors.push({
          row: rowNumber,
          field: 'created_at',
          message: '创建时间格式无效'
        });
      } else {
        processedData.created_at = date.toISOString();
      }
    }

    return {
      isValid: errors.length === 0,
      data: processedData,
      errors
    };
  }

  /**
   * 验证监控数据行
   */
  validateMonitoringDataRow(row, rowNumber) {
    const errors = [];
    const processedData = { ...row };

    // 必需字段验证
    const requiredFields = ['target_name', 'target_url', 'status'];
    for (const field of requiredFields) {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push({
          row: rowNumber,
          field,
          message: `必需字段 ${field} 不能为空`
        });
      }
    }

    // URL格式验证
    if (row.target_url) {
      try {
        new URL(row.target_url);
      } catch (error) {
        errors.push({
          row: rowNumber,
          field: 'target_url',
          message: 'URL格式无效'
        });
      }
    }

    // 状态值验证
    const validStatuses = ['up', 'down', 'warning', 'unknown'];
    if (row.status && !validStatuses.includes(row.status)) {
      errors.push({
        row: rowNumber,
        field: 'status',
        message: `状态值无效，必须是: ${validStatuses.join(', ')}`
      });
    }

    // 响应时间验证
    if (row.response_time && (isNaN(row.response_time) || row.response_time < 0)) {
      errors.push({
        row: rowNumber,
        field: 'response_time',
        message: '响应时间必须是非负数'
      });
    }

    return {
      isValid: errors.length === 0,
      data: processedData,
      errors
    };
  }

  /**
   * 验证用户数据行
   */
  validateUserDataRow(row, rowNumber) {
    const errors = [];
    const processedData = { ...row };

    // 必需字段验证
    const requiredFields = ['username', 'email'];
    for (const field of requiredFields) {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push({
          row: rowNumber,
          field,
          message: `必需字段 ${field} 不能为空`
        });
      }
    }

    // 邮箱格式验证
    if (row.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email)) {
        errors.push({
          row: rowNumber,
          field: 'email',
          message: '邮箱格式无效'
        });
      }
    }

    // 角色验证
    const validRoles = ['admin', 'user', 'viewer'];
    if (row.role && !validRoles.includes(row.role)) {
      errors.push({
        row: rowNumber,
        field: 'role',
        message: `角色无效，必须是: ${validRoles.join(', ')}`
      });
    }

    return {
      isValid: errors.length === 0,
      data: processedData,
      errors
    };
  }

  /**
   * 验证测试配置行
   */
  validateTestConfigRow(row, rowNumber) {
    const errors = [];
    const processedData = { ...row };

    // 必需字段验证
    const requiredFields = ['name', 'test_type'];
    for (const field of requiredFields) {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push({
          row: rowNumber,
          field,
          message: `必需字段 ${field} 不能为空`
        });
      }
    }

    return {
      isValid: errors.length === 0,
      data: processedData,
      errors
    };
  }

  /**
   * 导入有效数据
   */
  async importValidData(validData, task) {
    let processed = 0;
    let success = 0;
    let failed = 0;

    for (const row of validData) {
      try {
        await this.importSingleRow(row, task.dataType, task.userId);
        success++;
      } catch (error) {
        this.logger.error(`导入行数据失败:`, { row, error: error.message });
        failed++;
      }
      processed++;

      // 更新进度
      const progress = Math.floor((processed / validData.length) * 40) + 50; // 50-90%
      await this.updateTaskProgress(task.id, progress);
    }

    return {
      processed,
      success,
      failed
    };
  }

  /**
   * 导入单行数据
   */
  async importSingleRow(row, dataType, userId) {
    if (!this.dbPool) {
      throw new Error('数据库连接不可用');
    }

    switch (dataType) {
      case 'test-results':
        return await this.importTestResult(row, userId);
      case 'monitoring-data':
        return await this.importMonitoringData(row, userId);
      case 'user-data':
        return await this.importUserData(row, userId);
      case 'test-configurations':
        return await this.importTestConfig(row, userId);
      default:
        throw new Error(`不支持的数据类型: ${dataType}`);
    }
  }

  /**
   * 导入测试结果
   */
  async importTestResult(row, userId) {
    const query = `
      INSERT INTO test_sessions (
        user_id, test_name, test_type, url, status, 
        start_time, end_time, duration, results, config, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `;

    const values = [
      userId,
      row.test_name,
      row.test_type,
      row.url,
      row.status,
      row.start_time || null,
      row.end_time || null,
      row.duration || null,
      row.results ? JSON.stringify(row.results) : null,
      row.config ? JSON.stringify(row.config) : null,
      row.created_at || new Date().toISOString()
    ];

    const result = await this.dbPool.query(query, values);
    return result.rows[0].id;
  }

  /**
   * 导入监控数据
   */
  async importMonitoringData(row, userId) {
    const query = `
      INSERT INTO monitoring_logs (
        user_id, target_name, target_url, status, 
        response_time, status_code, error_message, checked_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;

    const values = [
      userId,
      row.target_name,
      row.target_url,
      row.status,
      row.response_time || null,
      row.status_code || null,
      row.error_message || null,
      row.checked_at || new Date().toISOString(),
      row.created_at || new Date().toISOString()
    ];

    const result = await this.dbPool.query(query, values);
    return result.rows[0].id;
  }

  /**
   * 导入用户数据
   */
  async importUserData(row, userId) {
    // 注意：用户数据导入需要特殊权限，这里只是示例
    const query = `
      INSERT INTO users (
        username, email, role, is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    const values = [
      row.username,
      row.email,
      row.role || 'user',
      row.is_active !== false,
      row.created_at || new Date().toISOString()
    ];

    const result = await this.dbPool.query(query, values);
    return result.rows[0].id;
  }

  /**
   * 导入测试配置
   */
  async importTestConfig(row, userId) {
    const query = `
      INSERT INTO test_configurations (
        user_id, name, test_type, config, is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const values = [
      userId,
      row.name,
      row.test_type,
      row.config ? JSON.stringify(row.config) : '{}',
      row.is_active !== false,
      row.created_at || new Date().toISOString()
    ];

    const result = await this.dbPool.query(query, values);
    return result.rows[0].id;
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(taskId, status, progress, additionalData = null, errorMessage = null) {
    try {
      const task = this.importQueue.get(taskId) || this.activeImports.get(taskId);
      if (task) {
        task.status = status;
        if (progress !== null) task.progress = progress;
        if (additionalData) {
          Object.assign(task, additionalData);
        }
        if (errorMessage) task.errorMessage = errorMessage;

        if (status === 'processing' && !task.startedAt) {
          task.startedAt = new Date().toISOString();
        }
        if (status === 'completed' || status === 'failed') {
          task.completedAt = new Date().toISOString();
        }
      }

      // 更新数据库
      if (this.dbPool) {
        const updateFields = ['status = $2'];
        const params = [taskId, status];
        let paramIndex = 3;

        if (progress !== null) {
          updateFields.push(`progress = $${paramIndex}`);
          params.push(progress);
          paramIndex++;
        }

        if (additionalData?.processedRecords !== undefined) {
          updateFields.push(`processed_records = $${paramIndex}`);
          params.push(additionalData.processedRecords);
          paramIndex++;
        }

        if (additionalData?.successRecords !== undefined) {
          updateFields.push(`success_records = $${paramIndex}`);
          params.push(additionalData.successRecords);
          paramIndex++;
        }

        if (additionalData?.failedRecords !== undefined) {
          updateFields.push(`failed_records = $${paramIndex}`);
          params.push(additionalData.failedRecords);
          paramIndex++;
        }

        if (additionalData?.validationErrors) {
          updateFields.push(`validation_errors = $${paramIndex}`);
          params.push(JSON.stringify(additionalData.validationErrors));
          paramIndex++;
        }

        if (errorMessage) {
          updateFields.push(`error_message = $${paramIndex}`);
          params.push(errorMessage);
          paramIndex++;
        }

        if (status === 'processing') {
          updateFields.push(`started_at = NOW()`);
        }

        if (status === 'completed' || status === 'failed') {
          updateFields.push(`completed_at = NOW()`);
        }

        const updateQuery = `
          UPDATE import_tasks 
          SET ${updateFields.join(', ')}
          WHERE id = $1
        `;

        await this.dbPool.query(updateQuery, params);
      }

      // 发送进度更新事件
      this.emit('taskProgress', { taskId, status, progress });

    } catch (error) {
      this.logger.error(`更新任务状态失败: ${taskId}`, error);
    }
  }

  /**
   * 更新任务进度
   */
  async updateTaskProgress(taskId, progress) {
    await this.updateTaskStatus(taskId, 'processing', progress);
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId, userId) {
    try {
      // 先从内存中查找
      const memoryTask = this.importQueue.get(taskId) || this.activeImports.get(taskId);
      if (memoryTask && memoryTask.userId === userId) {
        return {
          success: true,
          data: memoryTask
        };
      }

      // 从数据库查找
      if (this.dbPool) {
        const result = await this.dbPool.query(
          'SELECT * FROM import_tasks WHERE id = $1 AND user_id = $2',
          [taskId, userId]
        );

        if (result.rows.length > 0) {
          const task = result.rows[0];
          return {
            success: true,
            data: {
              id: task.id,
              name: task.name,
              dataType: task.data_type,
              format: task.format,
              status: task.status,
              progress: task.progress,
              filePath: task.file_path,
              fileSize: task.file_size,
              totalRecords: task.total_records,
              processedRecords: task.processed_records,
              successRecords: task.success_records,
              failedRecords: task.failed_records,
              validationErrors: task.validation_errors,
              previewData: task.preview_data,
              mappingConfig: task.mapping_config,
              errorMessage: task.error_message,
              createdAt: task.created_at,
              startedAt: task.started_at,
              completedAt: task.completed_at
            }
          };
        }
      }

      return {
        success: false,
        error: '任务不存在或无权限访问'
      };

    } catch (error) {
      this.logger.error('获取任务状态失败:', error);
      throw error;
    }
  }

  /**
   * 取消导入任务
   */
  async cancelTask(taskId, userId) {
    try {
      const task = this.importQueue.get(taskId) || this.activeImports.get(taskId);

      if (!task || task.userId !== userId) {
        return {
          success: false,
          error: '任务不存在或无权限访问'
        };
      }

      if (task.status === 'completed' || task.status === 'failed') {
        return {
          success: false,
          error: '任务已完成，无法取消'
        };
      }

      // 更新任务状态
      await this.updateTaskStatus(taskId, 'cancelled', null, null, '用户取消');

      // 从队列中移除
      this.importQueue.delete(taskId);
      this.activeImports.delete(taskId);

      // 删除上传的文件
      if (task.filePath) {
        try {
          await fs.unlink(task.filePath);
        } catch (error) {
          this.logger.warn('删除上传文件失败:', error);
        }
      }

      // 发送取消事件
      this.emit('taskCancelled', { taskId, userId });

      return {
        success: true,
        message: '任务已取消'
      };

    } catch (error) {
      this.logger.error('取消任务失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的导入任务列表
   */
  async getUserTasks(userId, options = {}) {
    try {
      const { page = 1, limit = 20, status, dataType } = options;
      const offset = (page - 1) * limit;

      if (!this.dbPool) {
        return {
          success: true,
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 }
        };
      }

      let whereClause = 'WHERE user_id = $1';
      const params = [userId];
      let paramIndex = 2;

      if (status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (dataType) {
        whereClause += ` AND data_type = $${paramIndex}`;
        params.push(dataType);
        paramIndex++;
      }

      // 获取总数
      const countQuery = `SELECT COUNT(*) as total FROM import_tasks ${whereClause}`;
      const countResult = await this.dbPool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // 获取任务列表
      const tasksQuery = `
        SELECT id, name, data_type, format, status, progress, 
               file_size, total_records, processed_records, success_records, failed_records,
               error_message, created_at, started_at, completed_at
        FROM import_tasks 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const tasksResult = await this.dbPool.query(tasksQuery, params);

      return {
        success: true,
        data: tasksResult.rows.map(task => ({
          id: task.id,
          name: task.name,
          dataType: task.data_type,
          format: task.format,
          status: task.status,
          progress: task.progress,
          fileSize: task.file_size,
          totalRecords: task.total_records,
          processedRecords: task.processed_records,
          successRecords: task.success_records,
          failedRecords: task.failed_records,
          errorMessage: task.error_message,
          createdAt: task.created_at,
          startedAt: task.started_at,
          completedAt: task.completed_at
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      this.logger.error('获取用户任务列表失败:', error);
      throw error;
    }
  }

  /**
   * 验证文件
   */
  async validateFile(file) {
    if (!file) {
      throw new Error('没有上传文件');
    }

    if (file.size > this.maxFileSize) {
      throw new Error(`文件大小超过限制 (${this.maxFileSize / 1024 / 1024}MB)`);
    }

    const format = this.getFileFormat(file.originalname);
    if (!this.supportedFormats.includes(format)) {
      throw new Error(`不支持的文件格式: ${format}`);
    }

    return true;
  }

  /**
   * 验证导入配置
   */
  validateImportConfig(config) {
    const errors = [];

    if (!config.dataType || !this.supportedDataTypes.includes(config.dataType)) {
      errors.push(`不支持的数据类型: ${config.dataType}`);
    }

    if (errors.length > 0) {
      throw new Error(`配置验证失败: ${errors.join(', ')}`);
    }

    return true;
  }

  /**
   * 获取文件格式
   */
  getFileFormat(filename) {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.csv':
        return 'csv';
      case '.json':
        return 'json';
      case '.xlsx':
        return 'xlsx';
      case '.xls':
        return 'excel';
      default:
        return 'unknown';
    }
  }

  /**
   * 生成任务ID
   */
  generateTaskId() {
    return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = DataImportService;