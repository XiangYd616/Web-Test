/**
 * 数据管理路由 - 重构版本
 * 使用新的服务层架构
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const DataManagementService = require('../services/dataManagement');

const router = express.Router();

// 初始化数据管理服务
const dataManagementService = new DataManagementService();

/**
 * 获取导出任务列表
 * GET /api/data-management/exports
 */
router.get('/exports', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const result = await dataManagementService.dataExport.getExportTasks(req.user.id);
    res.json(result);
  } catch (error) {
    const errorResult = dataManagementService.handleError(error, '获取导出任务');
    res.status(500).json(errorResult);
  }
}));

/**
 * 获取导入任务列表
 * GET /api/data-management/imports
 */
router.get('/imports', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const result = await dataManagementService.dataImport.getImportTasks(req.user.id);
    res.json(result);
  } catch (error) {
    const errorResult = dataManagementService.handleError(error, '获取导入任务');
    res.status(500).json(errorResult);
  }
}));

/**
 * 获取测试历史记录
 * GET /api/data-management/test-history
 */
router.get('/test-history', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const result = await dataManagementService.testHistory.getTestHistory(req.user.id, req.query);
    res.json(result);
  } catch (error) {
    const errorResult = dataManagementService.handleError(error, '获取测试历史');
    res.status(500).json(errorResult);
  }
}));

/**
 * 获取测试历史统计
 * GET /api/data-management/statistics
 */
router.get('/statistics', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const timeRange = parseInt(req.query.timeRange) || 30;
    const result = await dataManagementService.statistics.getTestHistoryStatistics(req.user.id, timeRange);
    res.json(result);
  } catch (error) {
    const errorResult = dataManagementService.handleError(error, '获取统计信息');
    res.status(500).json(errorResult);
  }
}));

/**
 * 导出测试历史数据
 * POST /api/data-management/export
 */
router.post('/export', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const result = await dataManagementService.dataExport.exportTestHistory(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    const errorResult = dataManagementService.handleError(error, '导出数据');
    res.status(500).json(errorResult);
  }
}));

/**
 * 批量删除测试记录
 * DELETE /api/data-management/test-history/batch
 */
router.delete('/test-history/batch', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { testIds } = req.body;
    const result = await dataManagementService.testHistory.batchDeleteTestRecords(testIds, req.user.id);
    res.json(result);
  } catch (error) {
    const errorResult = dataManagementService.handleError(error, '批量删除测试记录');
    res.status(500).json(errorResult);
  }
}));

/**
 * 数据查询
 * POST /api/data-management/query
 */
router.post('/query', authMiddleware, asyncHandler(async (req, res) => {
  try {
    console.log('📊 数据查询请求:', JSON.stringify(req.body, null, 2));
    const { table, type, filters, limit = 100, offset = 0, sortBy = 'created_at', sortOrder = 'desc' } = req.body;

    // 确定要查询的表，优先使用table，然后是type
    let targetTable = table;
    if (!targetTable && type) {
      // 将前端的type映射到数据库表名
      const typeToTable = {
        'test': 'test_history',
        'user': 'users',
        'report': 'test_results'
      };
      targetTable = typeToTable[type] || 'test_history';
    }

    // 默认查询test_history表
    if (!targetTable) {
      targetTable = 'test_history';
    }

    // 映射前端的sortBy字段到数据库字段
    const sortFieldMap = {
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'startTime': 'start_time',
      'endTime': 'end_time'
    };
    const dbSortField = sortFieldMap[sortBy] || sortBy;

    // 基本的安全检查
    const allowedTables = ['test_history', 'users', 'test_results'];
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
    if (targetTable === 'test_history' || targetTable === 'test_results') {
      whereClause += ` AND user_id = $${paramIndex}`;
      params.push(req.user.id);
      paramIndex++;
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

    // 转换数据格式以符合前端期望
    const transformedRecords = result.rows.map(row => ({
      id: row.id,
      type: targetTable === 'test_history' ? 'test' :
        targetTable === 'users' ? 'user' : 'report',
      data: row,
      metadata: {
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
        version: 1,
        tags: [],
        size: JSON.stringify(row).length,
        checksum: ''
      },
      permissions: {
        read: [req.user.id],
        write: [req.user.id],
        delete: [req.user.id]
      }
    }));

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: transformedRecords,
      total: total,
      hasMore: offset + limit < total
    });
  } catch (error) {
    console.error('数据查询失败:', error);
    res.status(500).json({
      success: false,
      message: '数据查询失败'
    });
  }
}));

/**
 * 获取分析数据
 * GET /api/data-management/analytics
 */
router.get('/analytics', authMiddleware, asyncHandler(async (req, res) => {
  try {
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
    console.error('获取分析数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分析数据失败'
    });
  }
}));

/**
 * 创建导出任务
 * POST /api/data-management/exports
 */
router.post('/exports', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { type, filters, format = 'json' } = req.body;

    // 创建导出任务（这里简化处理）
    const exportTask = {
      id: Date.now().toString(),
      name: `${type}_export_${new Date().toISOString().split('T')[0]}`,
      type,
      status: 'processing',
      createdAt: new Date().toISOString(),
      format,
      filters
    };

    res.json({
      success: true,
      data: exportTask,
      message: '导出任务已创建'
    });
  } catch (error) {
    console.error('创建导出任务失败:', error);
    res.status(500).json({
      success: false,
      message: '创建导出任务失败'
    });
  }
}));

/**
 * 创建导入任务
 * POST /api/data-management/imports
 */
router.post('/imports', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { type, file, options = {} } = req.body;

    // 创建导入任务（这里简化处理）
    const importTask = {
      id: Date.now().toString(),
      name: `${type}_import_${new Date().toISOString().split('T')[0]}`,
      type,
      status: 'processing',
      createdAt: new Date().toISOString(),
      file,
      options
    };

    res.json({
      success: true,
      data: importTask,
      message: '导入任务已创建'
    });
  } catch (error) {
    console.error('创建导入任务失败:', error);
    res.status(500).json({
      success: false,
      message: '创建导入任务失败'
    });
  }
}));

module.exports = router;
