/**
 * 数据管理API路由
 * 提供完整的数据CRUD操作、导入导出、统计分析、备份恢复等功能
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
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

  if (!data) {
    
        return res.status(400).json({
      success: false,
      message: '缺少数据内容'
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
    console.error('创建数据失败:', error);
    res.status(500).json({
      success: false,
      message: '创建数据失败',
      error: error.message
    });
  }
}));

/**
 * 读取数据记录
 */
router.get('/:type/:id', asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const { fields } = req.query;

  try {
    const options = {};
    if (fields) {
      options.fields = fields.split(',');
    }

    const record = await dataManagementService.readData(type, id, options);

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('读取数据失败:', error);
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
    
        return res.status(400).json({
      success: false,
      message: '缺少更新数据'
      });
  }

  try {
    const record = await dataManagementService.updateData(type, id, updates, {
      ...options,
      userId: req.user.id
    });

    res.json({
      success: true,
      data: record,
      message: '数据更新成功'
    });
  } catch (error) {
    console.error('更新数据失败:', error);
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

    res.json({
      success: true,
      data: result,
      message: '数据删除成功'
    });
  } catch (error) {
    console.error('删除数据失败:', error);
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

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('查询数据失败:', error);
    res.status(500).json({
      success: false,
      message: '查询数据失败',
      error: error.message
    });
  }
}));

/**
 * 批量操作
 */
router.post('/batch', asyncHandler(async (req, res) => {
  const { operations } = req.body;

  if (!operations || !Array.isArray(operations)) {
    return res.status(400).json({
      success: false,
      message: '缺少有效的操作列表'
    });
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
    console.error('批量操作失败:', error);
    res.status(500).json({
      success: false,
      message: '批量操作失败',
      error: error.message
    });
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

    res.json({
      success: true,
      data: result,
      message: '数据导出成功'
    });
  } catch (error) {
    console.error('数据导出失败:', error);
    res.status(500).json({
      success: false,
      message: '数据导出失败',
      error: error.message
    });
  }
}));

/**
 * 数据导入
 */
router.post('/:type/import', upload.single('file'), asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { format = 'json' } = req.body;

  if (!req.file) {
    
        return res.status(400).json({
      success: false,
      message: '缺少上传文件'
      });
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
    console.error('数据导入失败:', error);
    res.status(500).json({
      success: false,
      message: '数据导入失败',
      error: error.message
    });
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
        return res.status(400).json({
          success: false,
          message: '自定义统计参数格式错误'
        });
      }
    }

    const statistics = await dataManagementService.getStatistics(type, options);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
      error: error.message
    });
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

    res.json({
      success: true,
      data: backupInfo,
      message: '数据备份创建成功'
    });
  } catch (error) {
    console.error('创建备份失败:', error);
    res.status(500).json({
      success: false,
      message: '创建备份失败',
      error: error.message
    });
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

    res.json({
      success: true,
      data: typeInfo
    });
  } catch (error) {
    console.error('获取数据类型失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据类型失败',
      error: error.message
    });
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

    res.json({
      success: true,
      data: formats
    });
  } catch (error) {
    console.error('获取导出格式失败:', error);
    res.status(500).json({
      success: false,
      message: '获取导出格式失败',
      error: error.message
    });
  }
}));

/**
 * 数据验证
 */
router.post('/:type/validate', asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { data } = req.body;

  if (!data) {
    
        return res.status(400).json({
      success: false,
      message: '缺少验证数据'
      });
  }

  try {
    dataManagementService.validateData(type, data);
    
    res.json({
      success: true,
      message: '数据验证通过'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: '数据验证失败',
      error: error.message
    });
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

module.exports = router;
