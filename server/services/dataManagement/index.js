/**
 * 数据管理服务 - 统一入口
 * 整合测试历史、数据导入导出、统计分析等功能
 */

const TestHistoryService = require('./testHistoryService');
const DataExportService = require('./dataExportService');
const DataImportService = require('./dataImportService');
const StatisticsService = require('./statisticsService');
const winston = require('winston');

class DataManagementService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/data-management.log' }),
        new winston.transports.Console()
      ]
    });

    // 初始化子服务
    this.testHistory = new TestHistoryService();
    this.dataExport = new DataExportService();
    this.dataImport = new DataImportService();
    this.statistics = new StatisticsService();
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      service: 'DataManagementService',
      version: '2.0.0',
      status: 'active',
      modules: {
        testHistory: 'active',
        dataExport: 'active',
        dataImport: 'active',
        statistics: 'active'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 统一错误处理
   */
  handleError(error, context = '') {
    const errorMessage = `${context}: ${error.message}`;
    this.logger.error(errorMessage, {
      error: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 统一成功响应
   */
  handleSuccess(data, message = 'Operation completed successfully') {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 数据验证
   */
  validateRequest(data, requiredFields = []) {
    const errors = [];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    
    return true;
  }

  /**
   * 分页参数处理
   */
  processPaginationParams(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const offset = (page - 1) * limit;
    
    return { page, limit, offset };
  }

  /**
   * 排序参数处理
   */
  processSortParams(query, allowedFields = ['created_at']) {
    const sortBy = allowedFields.includes(query.sortBy) ? query.sortBy : 'created_at';
    const sortOrder = ['asc', 'desc'].includes(query.sortOrder?.toLowerCase()) 
      ? query.sortOrder.toLowerCase() 
      : 'desc';
    
    return { sortBy, sortOrder };
  }

  /**
   * 过滤参数处理
   */
  processFilterParams(query) {
    const filters = {};
    
    // 时间范围过滤
    if (query.dateFrom) {
      filters.dateFrom = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      filters.dateTo = new Date(query.dateTo);
    }
    
    // 搜索过滤
    if (query.search) {
      filters.search = query.search.trim();
    }
    
    // 类型过滤
    if (query.type) {
      filters.type = Array.isArray(query.type) ? query.type : [query.type];
    }
    
    // 状态过滤
    if (query.status) {
      filters.status = Array.isArray(query.status) ? query.status : [query.status];
    }
    
    return filters;
  }

  /**
   * 构建查询条件
   */
  buildWhereClause(filters, params = [], startIndex = 1) {
    let whereClause = 'WHERE 1=1';
    let paramIndex = startIndex;
    
    // 时间范围
    if (filters.dateFrom) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(filters.dateFrom);
      paramIndex++;
    }
    
    if (filters.dateTo) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(filters.dateTo);
      paramIndex++;
    }
    
    // 搜索
    if (filters.search) {
      whereClause += ` AND (test_name ILIKE $${paramIndex} OR url ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }
    
    // 类型过滤
    if (filters.type && filters.type.length > 0) {
      whereClause += ` AND test_type = ANY($${paramIndex})`;
      params.push(filters.type);
      paramIndex++;
    }
    
    // 状态过滤
    if (filters.status && filters.status.length > 0) {
      whereClause += ` AND status = ANY($${paramIndex})`;
      params.push(filters.status);
      paramIndex++;
    }
    
    return { whereClause, paramIndex };
  }

  /**
   * 执行数据库查询并处理错误
   */
  async executeQuery(queryText, params = [], context = 'Database query') {
    try {
      const { query } = require('../../config/database');
      const result = await query(queryText, params);
      return result;
    } catch (error) {
      this.logger.error(`${context} failed:`, {
        error: error.message,
        query: queryText,
        params,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * 格式化数据库记录
   */
  formatRecord(record) {
    if (!record) return null;
    
    return {
      ...record,
      // 确保数据类型正确
      duration: record.duration ? parseInt(record.duration) : null,
      overallScore: record.overall_score ? parseFloat(record.overall_score) : null,
      // 解析JSON字段
      config: this.parseJsonField(record.config),
      results: this.parseJsonField(record.results),
      metadata: this.parseJsonField(record.metadata),
      // 格式化时间
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      startTime: record.start_time,
      endTime: record.end_time
    };
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
      this.logger.warn('Failed to parse JSON field:', { field, error: error.message });
      return null;
    }
  }

  /**
   * 生成分页信息
   */
  generatePaginationInfo(page, limit, total) {
    const totalPages = Math.ceil(total / limit);
    
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      startIndex: (page - 1) * limit + 1,
      endIndex: Math.min(page * limit, total)
    };
  }

  /**
   * 数据清理和优化
   */
  async cleanupOldData(retentionDays = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const result = await this.executeQuery(
        'DELETE FROM test_history WHERE created_at < $1 AND status IN ($2, $3)',
        [cutoffDate, 'failed', 'cancelled'],
        'Data cleanup'
      );
      
      this.logger.info(`Cleaned up ${result.rowCount} old records`);
      return this.handleSuccess({ deletedCount: result.rowCount }, 'Data cleanup completed');
    } catch (error) {
      return this.handleError(error, 'Data cleanup');
    }
  }

  /**
   * 数据库健康检查
   */
  async healthCheck() {
    try {
      const result = await this.executeQuery('SELECT 1 as health_check', [], 'Health check');
      
      if (result.rows.length > 0) {
        return this.handleSuccess({ status: 'healthy' }, 'Database connection is healthy');
      } else {
        throw new Error('No response from database');
      }
    } catch (error) {
      return this.handleError(error, 'Health check');
    }
  }
}

module.exports = DataManagementService;
