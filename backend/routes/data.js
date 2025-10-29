/**
 * 数据管理API路由
 * 提供完整的数据CRUD操作、导入导出、统计分析、备份恢复等功能
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const { authMiddleware } = require('../middleware/auth');
const { dataManagementService } = require('../services/data/DataManagementService');

// 配置文件上传
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/json', 'text/csv', 'application/vnd.ms-excel'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

// 应用认证中间件
router.use(authMiddleware);

/**
 * 创建数据记录
 */
router.post('/:type', asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { data, options = {} } = req.body;

  // 输入验证
  if (!type || typeof type !== 'string' || type.trim() === '') {
    return res.status(400).json({
      success: false,
      message: '请提供有效的数据类型'
    });
  }

  // 安全检查：只允许字母、数字和下划线
  if (!/^[a-zA-Z0-9_-]+$/.test(type)) {
    return res.status(400).json({
      success: false,
      message: '数据类型格式不正确'
    });
  }

  if (!data || typeof data !== 'object') {
    return res.status(400).json({
      success: false,
      message: '请提供有效的数据内容'
    });
  }

  try {
    const result = await dataManagementService.createData(type, data, {
      ...options,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      data: result,
      message: '数据创建成功'
    });
  } catch (error) {
    logger.error('创建数据失败:', error);
    res.serverError('创建数据失败');
  }
}));

/**
 * 读取数据记录
 */
router.get('/:type/:id', asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const { fields } = req.query;

  // 输入验证
  if (!type || !/^[a-zA-Z0-9_-]+$/.test(type)) {
    return res.status(400).json({
      success: false,
      message: '无效的数据类型'
    });
  }

  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(400).json({
      success: false,
      message: '无效的记录ID'
    });
  }

  try {
    const options = {};
    if (fields) {
      options.fields = fields.split(',');
    }

    const record = await dataManagementService.readData(type, id, options);

    res.success(record);
  } catch (error) {
    logger.error('读取数据失败:', error);
    const statusCode = error.message.includes('不存在') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: '读取数据失败',
      error: error.message
    });
  }
}));

/**
 * 更新数据记录
 */
router.put('/:type/:id', asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const { updates, options = {} } = req.body;

  if (!updates) {
    
        return res.validationError([], '缺少更新数据');
  }

  try {
    const record = await dataManagementService.updateData(type, id, updates, {
      ...options,
      userId: req.user.id
    });

    res.success(record);
  } catch (error) {
    logger.error('更新数据失败:', error);
    const statusCode = error.message.includes('不存在') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: '更新数据失败',
      error: error.message
    });
  }
}));

/**
 * 删除数据记录
 */
router.delete('/:type/:id', asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const { softDelete = false } = req.query;

  try {
    const result = await dataManagementService.deleteData(type, id, {
      softDelete: softDelete === 'true',
      userId: req.user.id
    });

    res.success(result);
  } catch (error) {
    logger.error('删除数据失败:', error);
    const statusCode = error.message.includes('不存在') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: '删除数据失败',
      error: error.message
    });
  }
}));

/**
 * 查询数据
 */
router.get('/:type', asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { 
    page = 1, 
    limit = 20, 
    search, 
    sort, 
    sortDirection = 'asc',
    ...filters 
  } = req.query;

  try {
    const query = {
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      search,
      sort: sort ? { field: sort, direction: sortDirection } : undefined
    };

    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const result = await dataManagementService.queryData(type, query, options);

    res.success(result);
  } catch (error) {
    logger.error('查询数据失败:', error);
    res.serverError('查询数据失败');
  }
}));

/**
 * 批量操作
 */
router.post('/batch', asyncHandler(async (req, res) => {
  const { operations } = req.body;

  if (!operations || !Array.isArray(operations)) {
    return res.validationError([], '缺少有效的操作列表');
  }

  try {
    // 为所有操作添加用户ID
    const operationsWithUser = operations.map(op => ({
      ...op,
      options: { ...op.options, userId: req.user.id }
    }));

    const result = await dataManagementService.batchOperation(operationsWithUser);

    res.json({
      success: result.success,
      data: result,
      message: `批量操作完成: ${result.summary.successful} 成功, ${result.summary.failed} 失败`
    });
  } catch (error) {
    logger.error('批量操作失败:', error);
    res.serverError('批量操作失败');
  }
}));

/**
 * 数据导出
 */
router.post('/:type/export', asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { format = 'json', query = {}, filename } = req.body;

  try {
    const result = await dataManagementService.exportData(type, format, {
      query,
      filename
    });

    res.success(result);
  } catch (error) {
    logger.error('数据导出失败:', error);
    res.serverError('数据导出失败');
  }
}));

/**
 * 数据导入
 */
router.post('/:type/import', upload.single('file'), asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { format = 'json' } = req.body;

  if (!req.file) {
    
        return res.validationError([], '缺少上传文件');
  }

  try {
    const result = await dataManagementService.importData(type, req.file.path, format, {
      userId: req.user.id
    });

    res.json({
      success: result.success,
      data: result,
      message: `数据导入完成: ${result.imported} 成功, ${result.failed} 失败`
    });
  } catch (error) {
    logger.error('数据导入失败:', error);
    res.serverError('数据导入失败');
  }
}));

/**
 * 获取数据统计
 */
router.get('/:type/statistics', asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { customStats } = req.query;

  try {
    const options = {};
    if (customStats) {
      try {
        options.customStats = JSON.parse(customStats);
      } catch (e) {
        return res.validationError([], '自定义统计参数格式错误');
      }
    }

    const statistics = await dataManagementService.getStatistics(type, options);

    res.success(statistics);
  } catch (error) {
    logger.error('获取统计信息失败:', error);
    res.serverError('获取统计信息失败');
  }
}));

/**
 * 创建数据备份
 */
router.post('/backup', asyncHandler(async (req, res) => {
  const { types, name } = req.body;

  try {
    const backupInfo = await dataManagementService.createBackup(types, {
      name,
      createdBy: req.user.id
    });

    res.success(backupInfo);
  } catch (error) {
    logger.error('创建备份失败:', error);
    res.serverError('创建备份失败');
  }
}));

/**
 * 获取数据类型列表
 */
router.get('/types', asyncHandler(async (req, res) => {
  try {
    const types = dataManagementService.dataTypes;
    const typeInfo = Object.entries(types).map(([key, value]) => ({
      key,
      value,
      description: getTypeDescription(value)
    }));

    res.success(typeInfo);
  } catch (error) {
    logger.error('获取数据类型失败:', error);
    res.serverError('获取数据类型失败');
  }
}));

/**
 * 获取支持的导出格式
 */
router.get('/export-formats', asyncHandler(async (req, res) => {
  try {
    const formats = dataManagementService.exportFormats.map(format => ({
      format,
      description: getFormatDescription(format),
      mimeType: getFormatMimeType(format)
    }));

    res.success(formats);
  } catch (error) {
    logger.error('获取导出格式失败:', error);
    res.serverError('获取导出格式失败');
  }
}));

/**
 * 数据验证
 */
router.post('/:type/validate', asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { data } = req.body;

  if (!data) {
    
        return res.validationError([], '缺少验证数据');
  }

  try {
    dataManagementService.validateData(type, data);
    
    res.success('数据验证通过');
  } catch (error) {
    res.validationError([], '数据验证失败');
  }
}));

// 辅助函数
function getTypeDescription(type) {
  const descriptions = {
    'test_results': '测试结果数据',
    'user_data': '用户数据',
    'system_logs': '系统日志',
    'analytics': '分析数据',
    'reports': '报告数据',
    'configurations': '配置数据'
  };
  return descriptions[type] || '未知类型';
}

function getFormatDescription(format) {
  const descriptions = {
    'json': 'JSON格式，适合程序处理',
    'csv': 'CSV格式，适合Excel打开',
    'excel': 'Excel格式，适合数据分析',
    'xml': 'XML格式，适合系统集成'
  };
  return descriptions[format] || '未知格式';
}

function getFormatMimeType(format) {
  const mimeTypes = {
    'json': 'application/json',
    'csv': 'text/csv',
    'excel': 'application/vnd.ms-excel',
    'xml': 'application/xml'
  };
  return mimeTypes[format] || 'application/octet-stream';
}

// =====================================================
// 从dataManagement.js合并的功能：高级数据查询和统计分析
// =====================================================

/**
 * 高级数据查询
 * POST /api/data/query
 */
router.post('/query', authMiddleware, asyncHandler(async (req, res) => {
  try {
    logger.info('📊 数据查询请求:', JSON.stringify(req.body, null, 2));
    const { table, type, filters, limit = 100, offset = 0, sortBy = 'created_at', sortOrder = 'desc' } = req.body;

    // 确定要查询的表，优先使用table，然后是type
    let targetTable = table;
    if (!targetTable && type) {
      const typeToTable = {
        'test': 'test_sessions',
        'user': 'users',
        'report': 'test_sessions'
      };
      targetTable = typeToTable[type] || 'test_sessions';
    }

    if (!targetTable) {
      targetTable = 'test_history';
    }

    // 验证sortBy字段
    const validSortFields = ['created_at', 'updated_at', 'start_time', 'end_time', 'status', 'test_type'];
    const dbSortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';

    // 基本的安全检查
    const allowedTables = ['test_sessions', 'users', 'test_history'];
    if (!allowedTables.includes(targetTable)) {
      return res.status(400).json({
        success: false,
        message: '不允许查询此表'
      });
    }

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // 添加用户过滤（确保用户只能查看自己的数据）
    if (targetTable !== 'users') {
      whereClause += ` AND user_id = $${paramIndex}`;
      params.push(req.user.id);
      paramIndex++;
      whereClause += ' AND deleted_at IS NULL';
    }

    // 应用过滤器
    if (filters && typeof filters === 'object') {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== null && value !== undefined && value !== '') {
          whereClause += ` AND ${key} = $${paramIndex}`;
          params.push(value);
          paramIndex++;
        }
      }
    }

    // 获取数据库连接
    const { query } = require('../config/database');

    // 执行查询
    const result = await query(
      `SELECT * FROM ${targetTable} ${whereClause} ORDER BY ${dbSortField} ${sortOrder.toUpperCase()} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // 获取总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM ${targetTable} ${whereClause}`,
      params
    );

    const typeMapping = {
      'test_history': 'test',
      'users': 'user'
    };

    const transformedRecords = result.rows.map(row => ({
      id: row.id,
      type: typeMapping[targetTable] || 'report',
      data: row,
      metadata: {
        created_at: row.created_at,
        updated_at: row.updated_at || row.created_at,
        version: 1
      },
      permissions: {
        owner: req.user.id
      }
    }));

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        records: transformedRecords,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('数据查询失败:', error);
    res.status(500).json({
      success: false,
      message: '数据查询失败',
      error: error.message
    });
  }
}));

/**
 * 获取分析数据
 * GET /api/data/analytics
 */
router.get('/analytics', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { query } = require('../config/database');

    // 获取测试历史统计
    const testStats = await query(
      `SELECT 
        COUNT(*) as total_tests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
        AVG(duration) as avg_duration
       FROM test_history 
       WHERE user_id = $1`,
      [req.user.id]
    );

    // 获取按日期分组的测试数量
    const dailyStats = await query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
       FROM test_history 
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [req.user.id]
    );

    // 获取按测试类型分组的统计
    const typeStats = await query(
      `SELECT 
        test_type,
        COUNT(*) as count
       FROM test_history 
       WHERE user_id = $1
       GROUP BY test_type
       ORDER BY count DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        overview: testStats.rows[0],
        dailyStats: dailyStats.rows,
        typeStats: typeStats.rows
      }
    });
  } catch (error) {
    logger.error('获取分析数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分析数据失败'
    });
  }
}));

/**
 * 获取测试历史记录
 * GET /api/data/test-history
 */
router.get('/test-history', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      testType,
      status,
      startDate,
      endDate
    } = req.query;

    const { query } = require('../config/database');
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = $1 AND deleted_at IS NULL';
    const params = [req.user.id];
    let paramIndex = 2;

    if (testType) {
      whereClause += ` AND test_type = $${paramIndex}`;
      params.push(testType);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const result = await query(
      `SELECT * FROM test_history ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM test_history ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        records: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('获取测试历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取测试历史失败'
    });
  }
}));

/**
 * 批量删除测试记录
 * DELETE /api/data/test-history/batch
 */
router.delete('/test-history/batch', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { testIds } = req.body;

    if (!testIds || !Array.isArray(testIds) || testIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的测试ID列表'
      });
    }

    const { query } = require('../config/database');

    // 软删除测试记录
    const placeholders = testIds.map((_, index) => `$${index + 2}`).join(',');
    const result = await query(
      `UPDATE test_history 
       SET deleted_at = NOW(), updated_at = NOW() 
       WHERE id IN (${placeholders}) AND user_id = $1 AND deleted_at IS NULL`,
      [req.user.id, ...testIds]
    );

    res.json({
      success: true,
      data: {
        deletedCount: result.rowCount
      },
      message: `已成功删除 ${result.rowCount} 条测试记录`
    });
  } catch (error) {
    logger.error('批量删除测试记录失败:', error);
    res.status(500).json({
      success: false,
      message: '批量删除测试记录失败'
    });
  }
}));

module.exports = router;
