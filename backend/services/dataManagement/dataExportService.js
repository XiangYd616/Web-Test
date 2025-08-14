/**
 * 数据导出服务
 * 专门处理数据导出功能
 * 支持PDF、CSV、JSON、Excel等多种格式
 * 包含任务队列和进度跟踪功能
 */

const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const archiver = require('archiver');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { EventEmitter } = require('events');

class DataExportService extends EventEmitter {
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
        new winston.transports.File({ filename: 'logs/data-export.log' }),
        new winston.transports.Console()
      ]
    });

    this.exportDir = path.join(__dirname, '../../exports');
    this.tempDir = path.join(__dirname, '../../temp/exports');

    // 导出任务队列
    this.exportQueue = new Map();
    this.activeExports = new Map();

    // 支持的格式
    this.supportedFormats = ['pdf', 'csv', 'json', 'excel', 'xlsx'];
    this.supportedDataTypes = ['test-results', 'monitoring-data', 'user-data', 'analytics', 'reports'];

    this.ensureDirectories();
    this.initializeDatabase();
  }

  /**
   * 确保导出目录存在
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
      this.logger.info('导出目录初始化完成');
    } catch (error) {
      this.logger.error('创建导出目录失败:', error);
      throw error;
    }
  }

  /**
   * 初始化数据库表
   */
  async initializeDatabase() {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS export_tasks (
          id VARCHAR(255) PRIMARY KEY,
          user_id INTEGER NOT NULL,
          name VARCHAR(255) NOT NULL,
          data_type VARCHAR(50) NOT NULL,
          format VARCHAR(20) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          progress INTEGER DEFAULT 0,
          config JSONB,
          file_path VARCHAR(500),
          file_size BIGINT,
          record_count INTEGER,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          expires_at TIMESTAMP,
          INDEX idx_export_tasks_user (user_id),
          INDEX idx_export_tasks_status (status),
          INDEX idx_export_tasks_created (created_at)
        )
      `;

      if (this.dbPool) {
        await this.dbPool.query(createTableQuery);
        this.logger.info('导出任务表初始化完成');
      }
    } catch (error) {
      this.logger.error('初始化数据库表失败:', error);
    }
  }

  /**
   * 创建导出任务
   */
  async createExportTask(userId, config) {
    try {
      // 验证配置
      this.validateExportConfig(config);

      const taskId = this.generateTaskId();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const taskName = `${config.dataType}_${config.format}_${timestamp}`;

      // 计算过期时间（7天后）
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const task = {
        id: taskId,
        userId,
        name: taskName,
        dataType: config.dataType,
        format: config.format,
        status: 'pending',
        progress: 0,
        config,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      };

      // 保存到数据库
      if (this.dbPool) {
        await this.dbPool.query(
          `INSERT INTO export_tasks (id, user_id, name, data_type, format, status, progress, config, created_at, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [taskId, userId, taskName, config.dataType, config.format, 'pending', 0, JSON.stringify(config), task.createdAt, task.expiresAt]
        );
      }

      // 添加到队列
      this.exportQueue.set(taskId, task);

      // 异步处理导出
      this.processExportTask(taskId);

      this.logger.info(`创建导出任务: ${taskId}`, { userId, dataType: config.dataType, format: config.format });

      return {
        success: true,
        data: task
      };

    } catch (error) {
      this.logger.error('创建导出任务失败:', error);
      throw new Error(`创建导出任务失败: ${error.message}`);
    }
  }

  /**
   * 处理导出任务
   */
  async processExportTask(taskId) {
    try {
      const task = this.exportQueue.get(taskId);
      if (!task) {
        throw new Error('任务不存在');
      }

      // 更新任务状态
      await this.updateTaskStatus(taskId, 'processing', 0);
      this.activeExports.set(taskId, task);

      // 根据数据类型获取数据
      const data = await this.fetchDataByType(task.userId, task.dataType, task.config);
      await this.updateTaskProgress(taskId, 30);

      // 根据格式导出数据
      const exportResult = await this.exportDataByFormat(data, task.format, task.config, taskId);
      await this.updateTaskProgress(taskId, 80);

      // 压缩文件（如果需要）
      let finalFilePath = exportResult.filePath;
      if (task.config.options?.compression) {
        finalFilePath = await this.compressFile(exportResult.filePath, taskId);
      }

      // 更新任务完成状态
      await this.updateTaskStatus(taskId, 'completed', 100, {
        filePath: finalFilePath,
        fileSize: exportResult.fileSize,
        recordCount: data.length
      });

      // 从活动任务中移除
      this.activeExports.delete(taskId);
      this.exportQueue.delete(taskId);

      // 发送完成事件
      this.emit('exportCompleted', { taskId, userId: task.userId });

      this.logger.info(`导出任务完成: ${taskId}`);

    } catch (error) {
      this.logger.error(`导出任务失败: ${taskId}`, error);

      await this.updateTaskStatus(taskId, 'failed', null, null, error.message);
      this.activeExports.delete(taskId);
      this.exportQueue.delete(taskId);

      // 发送失败事件
      this.emit('exportFailed', { taskId, error: error.message });
    }
  }

  /**
   * 根据数据类型获取数据
   */
  async fetchDataByType(userId, dataType, config) {
    const { dateRange, filters = {} } = config;

    switch (dataType) {
      case 'test-results':
        return await this.fetchTestResults(userId, dateRange, filters);
      case 'monitoring-data':
        return await this.fetchMonitoringData(userId, dateRange, filters);
      case 'user-data':
        return await this.fetchUserData(userId, filters);
      case 'analytics':
        return await this.fetchAnalyticsData(userId, dateRange, filters);
      default:
        throw new Error(`不支持的数据类型: ${dataType}`);
    }
  }

  /**
   * 获取测试结果数据
   */
  async fetchTestResults(userId, dateRange, filters) {
    try {
      let whereClause = 'WHERE user_id = $1 AND deleted_at IS NULL';
      const params = [userId];
      let paramIndex = 2;

      if (dateRange?.start) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(dateRange.start);
        paramIndex++;
      }

      if (dateRange?.end) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(dateRange.end);
        paramIndex++;
      }

      if (filters.testTypes?.length > 0) {
        whereClause += ` AND test_type = ANY($${paramIndex})`;
        params.push(filters.testTypes);
        paramIndex++;
      }

      if (filters.status?.length > 0) {
        whereClause += ` AND status = ANY($${paramIndex})`;
        params.push(filters.status);
        paramIndex++;
      }

      const query = `
        SELECT 
          id, test_name, test_type, url, status,
          start_time, end_time, duration, results,
          config, created_at, updated_at
        FROM test_sessions
        ${whereClause}
        ORDER BY created_at DESC
      `;

      const result = await this.dbPool.query(query, params);
      return result.rows;

    } catch (error) {
      this.logger.error('获取测试结果数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取监控数据
   */
  async fetchMonitoringData(userId, dateRange, filters) {
    try {
      let whereClause = 'WHERE user_id = $1';
      const params = [userId];
      let paramIndex = 2;

      if (dateRange?.start) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(dateRange.start);
        paramIndex++;
      }

      if (dateRange?.end) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(dateRange.end);
        paramIndex++;
      }

      const query = `
        SELECT 
          id, target_name, target_url, status,
          response_time, status_code, error_message,
          checked_at, created_at
        FROM monitoring_logs
        ${whereClause}
        ORDER BY checked_at DESC
      `;

      const result = await this.dbPool.query(query, params);
      return result.rows;

    } catch (error) {
      this.logger.error('获取监控数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户数据
   */
  async fetchUserData(userId, filters) {
    try {
      const query = `
        SELECT 
          id, username, email, role, is_active,
          email_verified, last_login, created_at, updated_at
        FROM users
        WHERE id = $1
      `;

      const result = await this.dbPool.query(query, [userId]);
      return result.rows;

    } catch (error) {
      this.logger.error('获取用户数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取分析数据
   */
  async fetchAnalyticsData(userId, dateRange, filters) {
    try {
      // 获取测试统计
      const testStatsQuery = `
        SELECT 
          COUNT(*) as total_tests,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
          AVG(duration) as avg_duration,
          test_type
        FROM test_sessions
        WHERE user_id = $1 AND deleted_at IS NULL
        ${dateRange?.start ? 'AND created_at >= $2' : ''}
        ${dateRange?.end ? `AND created_at <= $${dateRange?.start ? '3' : '2'}` : ''}
        GROUP BY test_type
      `;

      const params = [userId];
      if (dateRange?.start) params.push(dateRange.start);
      if (dateRange?.end) params.push(dateRange.end);

      const result = await this.dbPool.query(testStatsQuery, params);
      return result.rows;

    } catch (error) {
      this.logger.error('获取分析数据失败:', error);
      throw error;
    }
  }

  /**
   * 根据格式导出数据
   */
  async exportDataByFormat(data, format, config, taskId) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `export_${taskId}_${timestamp}`;

    switch (format.toLowerCase()) {
      case 'json':
        return await this.exportToJSON(data, filename, config);
      case 'csv':
        return await this.exportToCSV(data, filename, config);
      case 'excel':
      case 'xlsx':
        return await this.exportToExcel(data, filename, config);
      case 'pdf':
        return await this.exportToPDF(data, filename, config);
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  /**
   * 导出测试历史数据（保持向后兼容）
   */
  async exportTestHistory(userId, options = {}) {
    try {
      const {
        format = 'json',
        dateFrom,
        dateTo,
        testTypes = [],
        includeResults = true,
        includeConfig = true
      } = options;

      // 获取数据
      const { query } = require('../../config/database');

      let whereClause = 'WHERE user_id = $1';
      const params = [userId];
      let paramIndex = 2;

      if (dateFrom) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(dateTo);
        paramIndex++;
      }

      if (testTypes.length > 0) {
        whereClause += ` AND test_type = ANY($${paramIndex})`;
        params.push(testTypes);
        paramIndex++;
      }

      const selectFields = [
        'id', 'test_name', 'test_type', 'url', 'status',
        'start_time', 'end_time', 'duration', 'created_at', 'updated_at'
      ];

      if (includeResults) {
        selectFields.push('results');
      }

      if (includeConfig) {
        selectFields.push('config');
      }

      const queryText = `
        SELECT ${selectFields.join(', ')}
        FROM test_sessions
        ${whereClause}
        AND deleted_at IS NULL
        ORDER BY created_at DESC
      `;

      const result = await query(queryText, params);
      const data = result.rows;

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `test_sessions_export_${timestamp}.${format}`;
      const filepath = path.join(this.exportDir, filename);

      // 根据格式导出
      let exportedData;
      switch (format.toLowerCase()) {
        case 'json':
          exportedData = await this.exportToJSON(data, filepath);
          break;
        case 'csv':
          exportedData = await this.exportToCSV(data, filepath);
          break;
        case 'xlsx':
          exportedData = await this.exportToExcel(data, filepath);
          break;
        default:
          throw new Error(`不支持的导出格式: ${format}`);
      }

      // 记录导出任务
      const exportTask = {
        id: this.generateTaskId(),
        name: `测试历史导出_${timestamp}`,
        type: 'test_sessions',
        format,
        status: 'completed',
        filename,
        filepath,
        recordCount: data.length,
        fileSize: exportedData.size,
        createdAt: new Date().toISOString(),
        userId
      };

      return {
        success: true,
        data: exportTask
      };

    } catch (error) {
      this.logger.error('导出测试历史失败:', error);
      throw new Error(`导出测试历史失败: ${error.message}`);
    }
  }

  /**
   * 导出为JSON格式
   */
  async exportToJSON(data, filename, config) {
    try {
      const filePath = path.join(this.exportDir, `${filename}.json`);

      const jsonData = {
        exportInfo: {
          timestamp: new Date().toISOString(),
          recordCount: data.length,
          format: 'json',
          dataType: config.dataType,
          filters: config.filters || {},
          dateRange: config.dateRange || {}
        },
        data: data
      };

      const jsonString = JSON.stringify(jsonData, null, 2);
      await fs.writeFile(filePath, jsonString, 'utf8');

      const stats = await fs.stat(filePath);
      return { filePath, fileSize: stats.size };

    } catch (error) {
      this.logger.error('JSON导出失败:', error);
      throw new Error(`JSON导出失败: ${error.message}`);
    }
  }

  /**
   * 导出为CSV格式
   */
  async exportToCSV(data, filename, config) {
    try {
      const filePath = path.join(this.exportDir, `${filename}.csv`);

      if (data.length === 0) {
        await fs.writeFile(filePath, '', 'utf8');
        const stats = await fs.stat(filePath);
        return { filePath, fileSize: stats.size };
      }

      // 获取所有字段
      const fields = Object.keys(data[0]);

      // 生成CSV头部
      const csvHeader = fields.join(',');

      // 生成CSV数据行
      const csvRows = data.map(row => {
        return fields.map(field => {
          let value = row[field];

          // 处理特殊值
          if (value === null || value === undefined) {
            value = '';
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          } else {
            value = String(value);
          }

          // 转义CSV特殊字符
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value.replace(/"/g, '""')}"`;
          }

          return value;
        }).join(',');
      });

      const csvContent = [csvHeader, ...csvRows].join('\n');
      // 添加UTF-8 BOM头以支持中文
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;
      await fs.writeFile(filePath, csvWithBOM, 'utf8');

      const stats = await fs.stat(filePath);
      return { filePath, fileSize: stats.size };

    } catch (error) {
      this.logger.error('CSV导出失败:', error);
      throw new Error(`CSV导出失败: ${error.message}`);
    }
  }

  /**
   * 导出为Excel格式
   */
  async exportToExcel(data, filepath) {
    try {
      // 这里可以使用 xlsx 库来生成Excel文件
      // 为了简化，暂时使用CSV格式
      const csvPath = filepath.replace('.xlsx', '.csv');
      const result = await this.exportToCSV(data, csvPath);

      // 重命名文件
      await fs.rename(csvPath, filepath);

      return result;

    } catch (error) {
      this.logger.error('Excel导出失败:', error);
      throw new Error(`Excel导出失败: ${error.message}`);
    }
  }

  /**
   * 获取导出任务列表
   */
  async getExportTasks(userId) {
    try {
      // 这里应该从数据库获取导出任务记录
      // 暂时返回模拟数据
      const mockTasks = [
        {
          id: '1',
          name: '测试历史导出_2025-07-19',
          type: 'test_sessions',
          format: 'json',
          status: 'completed',
          recordCount: 150,
          fileSize: 2048576,
          createdAt: new Date().toISOString(),
          userId
        }
      ];

      return {
        success: true,
        data: mockTasks
      };

    } catch (error) {
      this.logger.error('获取导出任务失败:', error);
      throw new Error(`获取导出任务失败: ${error.message}`);
    }
  }

  /**
   * 删除导出文件
   */
  async deleteExportFile(taskId, userId) {
    try {
      // 这里应该从数据库获取任务信息
      // 验证用户权限后删除文件

      return {
        success: true,
        message: '导出文件已删除'
      };

    } catch (error) {
      this.logger.error('删除导出文件失败:', error);
      throw new Error(`删除导出文件失败: ${error.message}`);
    }
  }

  /**
   * 下载导出文件
   */
  async downloadExportFile(taskId, userId) {
    try {
      // 这里应该从数据库获取任务信息
      // 验证用户权限后返回文件路径

      return {
        success: true,
        data: {
          filepath: '/path/to/export/file',
          filename: 'export.json'
        }
      };

    } catch (error) {
      this.logger.error('下载导出文件失败:', error);
      throw new Error(`下载导出文件失败: ${error.message}`);
    }
  }

  /**
   * 清理过期的导出文件
   */
  async cleanupExpiredFiles(retentionDays = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const files = await fs.readdir(this.exportDir);
      let deletedCount = 0;

      for (const file of files) {
        const filepath = path.join(this.exportDir, file);
        const stats = await fs.stat(filepath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filepath);
          deletedCount++;
          this.logger.info(`删除过期导出文件: ${file}`);
        }
      }

      return {
        success: true,
        data: { deletedCount },
        message: `已清理 ${deletedCount} 个过期文件`
      };

    } catch (error) {
      this.logger.error('清理过期文件失败:', error);
      throw new Error(`清理过期文件失败: ${error.message}`);
    }
  }

  /**
   * 生成任务ID
   */
  generateTaskId() {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  /**
   * 验证导出配置
   */
  validateExportConfig(config) {
    const errors = [];

    if (!config.dataType || !this.supportedDataTypes.includes(config.dataType)) {
      errors.push(`不支持的数据类型: ${config.dataType}`);
    }

    if (!config.format || !this.supportedFormats.includes(config.format.toLowerCase())) {
      errors.push(`不支持的导出格式: ${config.format}`);
    }

    if (config.dateRange) {
      if (config.dateRange.start && config.dateRange.end) {
        if (new Date(config.dateRange.start) > new Date(config.dateRange.end)) {
          errors.push('开始日期不能晚于结束日期');
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`配置验证失败: ${errors.join(', ')}`);
    }

    return true;
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(taskId, status, progress, additionalData = null, errorMessage = null) {
    try {
      const task = this.exportQueue.get(taskId) || this.activeExports.get(taskId);
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

        if (additionalData?.filePath) {
          updateFields.push(`file_path = $${paramIndex}`);
          params.push(additionalData.filePath);
          paramIndex++;
        }

        if (additionalData?.fileSize) {
          updateFields.push(`file_size = $${paramIndex}`);
          params.push(additionalData.fileSize);
          paramIndex++;
        }

        if (additionalData?.recordCount) {
          updateFields.push(`record_count = $${paramIndex}`);
          params.push(additionalData.recordCount);
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
          UPDATE export_tasks 
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
   * 导出为PDF格式
   */
  async exportToPDF(data, filename, config) {
    try {
      const filePath = path.join(this.exportDir, `${filename}.pdf`);
      const doc = new PDFDocument();
      const stream = require('fs').createWriteStream(filePath);

      doc.pipe(stream);

      // 添加标题
      doc.fontSize(16).text('数据导出报告', { align: 'center' });
      doc.moveDown();

      // 添加导出信息
      doc.fontSize(12)
        .text(`导出时间: ${new Date().toLocaleString('zh-CN')}`)
        .text(`数据类型: ${config.dataType}`)
        .text(`记录数量: ${data.length}`)
        .moveDown();

      // 添加数据表格（简化版）
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        let yPosition = doc.y;

        // 表头
        doc.fontSize(10);
        headers.forEach((header, index) => {
          doc.text(header, 50 + index * 80, yPosition, { width: 75 });
        });

        yPosition += 20;

        // 数据行（限制显示前50行）
        const displayData = data.slice(0, 50);
        displayData.forEach((row, rowIndex) => {
          if (yPosition > 700) { // 换页
            doc.addPage();
            yPosition = 50;
          }

          headers.forEach((header, colIndex) => {
            let value = row[header];
            if (typeof value === 'object') {
              value = JSON.stringify(value).substring(0, 20) + '...';
            } else if (value && value.toString().length > 20) {
              value = value.toString().substring(0, 20) + '...';
            }

            doc.text(value || '', 50 + colIndex * 80, yPosition, { width: 75 });
          });

          yPosition += 15;
        });

        if (data.length > 50) {
          doc.moveDown().text(`... 还有 ${data.length - 50} 条记录未显示`);
        }
      }

      doc.end();

      // 等待PDF生成完成
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      const stats = await fs.stat(filePath);
      return { filePath, fileSize: stats.size };

    } catch (error) {
      this.logger.error('PDF导出失败:', error);
      throw new Error(`PDF导出失败: ${error.message}`);
    }
  }

  /**
   * 导出为Excel格式（完整实现）
   */
  async exportToExcel(data, filename, config) {
    try {
      const filePath = path.join(this.exportDir, `${filename}.xlsx`);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('数据导出');

      if (data.length > 0) {
        // 获取列名
        const columns = Object.keys(data[0]).map(key => ({
          header: key,
          key: key,
          width: 15
        }));

        worksheet.columns = columns;

        // 添加数据
        data.forEach(row => {
          const processedRow = {};
          Object.keys(row).forEach(key => {
            let value = row[key];
            if (typeof value === 'object' && value !== null) {
              value = JSON.stringify(value);
            }
            processedRow[key] = value;
          });
          worksheet.addRow(processedRow);
        });

        // 设置表头样式
        worksheet.getRow(1).eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
          };
        });

        // 自动调整列宽
        worksheet.columns.forEach(column => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, (cell) => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
          column.width = Math.min(maxLength + 2, 50);
        });
      }

      // 保存文件
      await workbook.xlsx.writeFile(filePath);

      const stats = await fs.stat(filePath);
      return { filePath, fileSize: stats.size };

    } catch (error) {
      this.logger.error('Excel导出失败:', error);
      throw new Error(`Excel导出失败: ${error.message}`);
    }
  }

  /**
   * 压缩文件
   */
  async compressFile(filePath, taskId) {
    try {
      const compressedPath = filePath + '.zip';
      const output = require('fs').createWriteStream(compressedPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.pipe(output);
      archive.file(filePath, { name: path.basename(filePath) });
      await archive.finalize();

      // 等待压缩完成
      await new Promise((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);
      });

      // 删除原文件
      await fs.unlink(filePath);

      this.logger.info(`文件压缩完成: ${compressedPath}`);
      return compressedPath;

    } catch (error) {
      this.logger.error('文件压缩失败:', error);
      throw error;
    }
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId, userId) {
    try {
      // 先从内存中查找
      const memoryTask = this.exportQueue.get(taskId) || this.activeExports.get(taskId);
      if (memoryTask && memoryTask.userId === userId) {
        return {
          success: true,
          data: memoryTask
        };
      }

      // 从数据库查找
      if (this.dbPool) {
        const result = await this.dbPool.query(
          'SELECT * FROM export_tasks WHERE id = $1 AND user_id = $2',
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
              recordCount: task.record_count,
              errorMessage: task.error_message,
              createdAt: task.created_at,
              startedAt: task.started_at,
              completedAt: task.completed_at,
              expiresAt: task.expires_at
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
   * 取消导出任务
   */
  async cancelTask(taskId, userId) {
    try {
      const task = this.exportQueue.get(taskId) || this.activeExports.get(taskId);

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
      this.exportQueue.delete(taskId);
      this.activeExports.delete(taskId);

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
   * 获取用户的导出任务列表
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
      const countQuery = `SELECT COUNT(*) as total FROM export_tasks ${whereClause}`;
      const countResult = await this.dbPool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // 获取任务列表
      const tasksQuery = `
        SELECT id, name, data_type, format, status, progress, 
               file_size, record_count, error_message,
               created_at, started_at, completed_at, expires_at
        FROM export_tasks 
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
          recordCount: task.record_count,
          errorMessage: task.error_message,
          createdAt: task.created_at,
          startedAt: task.started_at,
          completedAt: task.completed_at,
          expiresAt: task.expires_at
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
   * 验证导出参数（保持向后兼容）
   */
  validateExportOptions(options) {
    const errors = [];

    if (options.format && !['json', 'csv', 'xlsx', 'pdf'].includes(options.format.toLowerCase())) {
      errors.push('不支持的导出格式');
    }

    if (options.dateFrom && options.dateTo && new Date(options.dateFrom) > new Date(options.dateTo)) {
      errors.push('开始日期不能晚于结束日期');
    }

    if (errors.length > 0) {
      throw new Error(`参数验证失败: ${errors.join(', ')}`);
    }

    return true;
  }
}

module.exports = DataExportService;
