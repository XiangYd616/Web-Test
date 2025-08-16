/**
 * 批量操作API路由
 * 提供批量测试、批量导出、批量删除等功能
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authMiddleware } = require('../middleware/auth');

// 应用认证中间件
router.use(authMiddleware);

// 存储批量操作状态
const batchOperations = new Map();

/**
 * 生成操作ID
 */
function generateOperationId() {
  return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 创建批量操作记录
 */
function createBatchOperation(type, config, totalItems, userId) {
  const operationId = generateOperationId();
  const operation = {
    id: operationId,
    type,
    status: 'pending',
    progress: 0,
    totalItems,
    completedItems: 0,
    failedItems: 0,
    startTime: new Date().toISOString(),
    endTime: null,
    config,
    userId,
    results: [],
    error: null
  };
  
  batchOperations.set(operationId, operation);
  return operation;
}

/**
 * 批量测试
 */
router.post('/test', asyncHandler(async (req, res) => {
  const { urls, testTypes, options = {} } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({
      success: false,
      message: '需要提供URL列表'
    });
  }

  if (!testTypes || !Array.isArray(testTypes) || testTypes.length === 0) {
    return res.status(400).json({
      success: false,
      message: '需要提供测试类型列表'
    });
  }

  const totalItems = urls.length * testTypes.length;
  const operation = createBatchOperation('test', { urls, testTypes, options }, totalItems, req.user.id);

  // 异步执行批量测试
  executeBatchTest(operation);

  res.json({
    success: true,
    data: {
      operationId: operation.id,
      totalItems
    }
  });
}));

/**
 * 批量导出
 */
router.post('/export', asyncHandler(async (req, res) => {
  const { dataType, filters = {}, format, options = {} } = req.body;

  if (!dataType) {
    
        return res.status(400).json({
      success: false,
      message: '需要指定数据类型'
      });
  }

  if (!format) {
    
        return res.status(400).json({
      success: false,
      message: '需要指定导出格式'
      });
  }

  // 估算导出项目数量
  const estimatedItems = await estimateExportItems(dataType, filters);
  const operation = createBatchOperation('export', { dataType, filters, format, options }, estimatedItems, req.user.id);

  // 异步执行批量导出
  executeBatchExport(operation);

  res.json({
    success: true,
    data: {
      operationId: operation.id,
      totalItems: estimatedItems
    }
  });
}));

/**
 * 批量删除
 */
router.post('/delete', asyncHandler(async (req, res) => {
  const { dataType, ids, options = {} } = req.body;

  if (!dataType) {
    
        return res.status(400).json({
      success: false,
      message: '需要指定数据类型'
      });
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: '需要提供ID列表'
    });
  }

  const operation = createBatchOperation('delete', { dataType, ids, options }, ids.length, req.user.id);

  // 异步执行批量删除
  executeBatchDelete(operation);

  res.json({
    success: true,
    data: {
      operationId: operation.id,
      totalItems: ids.length
    }
  });
}));

/**
 * 获取操作状态
 */
router.get('/status/:operationId', asyncHandler(async (req, res) => {
  const { operationId } = req.params;
  const operation = batchOperations.get(operationId);

  if (!operation) {
    
        return res.status(404).json({
      success: false,
      message: '操作不存在'
      });
  }

  // 检查权限
  if (operation.userId !== req.user.id && req.user.role !== 'admin') {
    
        return res.status(403).json({
      success: false,
      message: '无权访问此操作'
      });
  }

  res.json({
    success: true,
    data: operation
  });
}));

/**
 * 取消操作
 */
router.post('/cancel/:operationId', asyncHandler(async (req, res) => {
  const { operationId } = req.params;
  const operation = batchOperations.get(operationId);

  if (!operation) {
    
        return res.status(404).json({
      success: false,
      message: '操作不存在'
      });
  }

  // 检查权限
  if (operation.userId !== req.user.id && req.user.role !== 'admin') {
    
        return res.status(403).json({
      success: false,
      message: '无权取消此操作'
      });
  }

  if (operation.status !== 'running') {
    
        return res.status(400).json({
      success: false,
      message: '只能取消正在运行的操作'
      });
  }

  operation.status = 'cancelled';
  operation.endTime = new Date().toISOString();

  res.json({
    success: true,
    message: '操作已取消'
  });
}));

/**
 * 获取操作结果
 */
router.get('/results/:operationId', asyncHandler(async (req, res) => {
  const { operationId } = req.params;
  const operation = batchOperations.get(operationId);

  if (!operation) {
    
        return res.status(404).json({
      success: false,
      message: '操作不存在'
      });
  }

  // 检查权限
  if (operation.userId !== req.user.id && req.user.role !== 'admin') {
    
        return res.status(403).json({
      success: false,
      message: '无权访问此操作结果'
      });
  }

  res.json({
    success: true,
    data: {
      operation,
      results: operation.results
    }
  });
}));

/**
 * 下载导出文件
 */
router.get('/download/:operationId', asyncHandler(async (req, res) => {
  const { operationId } = req.params;
  const operation = batchOperations.get(operationId);

  if (!operation) {
    
        return res.status(404).json({
      success: false,
      message: '操作不存在'
      });
  }

  // 检查权限
  if (operation.userId !== req.user.id && req.user.role !== 'admin') {
    
        return res.status(403).json({
      success: false,
      message: '无权下载此文件'
      });
  }

  if (operation.type !== 'export' || operation.status !== 'completed') {
    
        return res.status(400).json({
      success: false,
      message: '文件不可下载'
      });
  }

  // 这里应该返回实际的文件
  // 目前返回模拟数据
  const filename = `export-${operationId}.json`;
  const data = JSON.stringify(operation.results, null, 2);

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(data);
}));

/**
 * 执行批量测试
 */
async function executeBatchTest(operation) {
  try {
    operation.status = 'running';
    const { urls, testTypes, options } = operation.config;
    const concurrent = options.concurrent || 3;
    
    let completed = 0;
    const results = [];

    // 创建测试任务队列
    const tasks = [];
    for (const url of urls) {
      for (const testType of testTypes) {
        tasks.push({ url, testType });
      }
    }

    // 并发执行测试
    const executeTask = async (task) => {
      try {
        const startTime = Date.now();
        
        // 模拟测试执行
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 2000));
        
        const duration = Date.now() - startTime;
        const success = Math.random() > 0.1; // 90% 成功率
        
        const result = {
          url: task.url,
          testType: task.testType,
          status: success ? 'success' : 'failed',
          result: success ? { score: Math.floor(Math.random() * 40) + 60 } : null,
          error: success ? null : '模拟测试失败',
          duration
        };

        results.push(result);
        completed++;
        
        if (!success) {
          operation.failedItems++;
        }
        
        operation.completedItems = completed;
        operation.progress = (completed / operation.totalItems) * 100;
        
        console.log(`批量测试进度: ${completed}/${operation.totalItems}`);
        
      } catch (error) {
        console.error('测试任务执行失败:', error);
        operation.failedItems++;
        completed++;
        operation.completedItems = completed;
        operation.progress = (completed / operation.totalItems) * 100;
      }
    };

    // 控制并发数
    const executeWithConcurrency = async (tasks, concurrency) => {
      const executing = [];
      for (const task of tasks) {
        if (operation.status === 'cancelled') break;
        
        const promise = executeTask(task);
        executing.push(promise);
        
        if (executing.length >= concurrency) {
          await Promise.race(executing);
          executing.splice(executing.findIndex(p => p === promise), 1);
        }
      }
      
      await Promise.all(executing);
    };

    await executeWithConcurrency(tasks, concurrent);
    
    if (operation.status !== 'cancelled') {
      operation.status = 'completed';
      operation.results = results;
      operation.endTime = new Date().toISOString();
      
      console.log(`批量测试完成: ${operation.id}`);
    }
    
  } catch (error) {
    console.error('批量测试执行失败:', error);
    operation.status = 'failed';
    operation.error = error.message;
    operation.endTime = new Date().toISOString();
  }
}

/**
 * 执行批量导出
 */
async function executeBatchExport(operation) {
  try {
    operation.status = 'running';
    const { dataType, filters, format, options } = operation.config;
    
    // 模拟导出过程
    for (let i = 0; i < operation.totalItems; i++) {
      if (operation.status === 'cancelled') break;
      
      // 模拟处理时间
      await new Promise(resolve => setTimeout(resolve, 100));
      
      operation.completedItems = i + 1;
      operation.progress = ((i + 1) / operation.totalItems) * 100;
    }
    
    if (operation.status !== 'cancelled') {
      operation.status = 'completed';
      operation.results = {
        dataType,
        format,
        itemCount: operation.totalItems,
        exportedAt: new Date().toISOString()
      };
      operation.endTime = new Date().toISOString();
      
      console.log(`批量导出完成: ${operation.id}`);
    }
    
  } catch (error) {
    console.error('批量导出执行失败:', error);
    operation.status = 'failed';
    operation.error = error.message;
    operation.endTime = new Date().toISOString();
  }
}

/**
 * 执行批量删除
 */
async function executeBatchDelete(operation) {
  try {
    operation.status = 'running';
    const { dataType, ids, options } = operation.config;
    
    // 模拟删除过程
    for (let i = 0; i < ids.length; i++) {
      if (operation.status === 'cancelled') break;
      
      // 模拟删除时间
      await new Promise(resolve => setTimeout(resolve, 200));
      
      operation.completedItems = i + 1;
      operation.progress = ((i + 1) / operation.totalItems) * 100;
    }
    
    if (operation.status !== 'cancelled') {
      operation.status = 'completed';
      operation.results = {
        dataType,
        deletedCount: operation.completedItems,
        deletedAt: new Date().toISOString()
      };
      operation.endTime = new Date().toISOString();
      
      console.log(`批量删除完成: ${operation.id}`);
    }
    
  } catch (error) {
    console.error('批量删除执行失败:', error);
    operation.status = 'failed';
    operation.error = error.message;
    operation.endTime = new Date().toISOString();
  }
}

/**
 * 估算导出项目数量
 */
async function estimateExportItems(dataType, filters) {
  // 这里应该查询数据库获取实际数量
  // 目前返回模拟数量
  const estimates = {
    'test-results': 1000,
    'test-history': 500,
    'analytics': 200,
    'reports': 100
  };
  
  return estimates[dataType] || 100;
}

// 定期清理已完成的操作（保留24小时）
setInterval(() => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  for (const [id, operation] of batchOperations) {
    if (operation.endTime && new Date(operation.endTime) < cutoff) {
      batchOperations.delete(id);
      console.log(`清理批量操作: ${id}`);
    }
  }
}, 60 * 60 * 1000); // 每小时清理一次

module.exports = router;
