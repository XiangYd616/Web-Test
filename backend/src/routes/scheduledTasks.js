/**
 * 定时任务管理 API 路由
 * 提供定时任务的创建、管理、执行和监控接口
 */

const express = require('express');
const router = express.Router();
const ScheduledTaskService = require('../services/ScheduledTaskService');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

// 创建定时任务服务实例
const taskService = new ScheduledTaskService();

// 应用认证中间件到所有路由
router.use(authMiddleware);

/**
 * @route GET /api/scheduled-tasks
 * @desc 获取所有定时任务
 * @access Private
 */
router.get('/', async (req, res) => {
  try {
    const tasks = taskService.getAllTasks();
    
    res.json({
      success: true,
      data: {
        tasks,
        total: tasks.length
      }
    });
  } catch (error) {
    logger.error('获取定时任务列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取定时任务列表失败',
      error: error.message
    });
  }
});

/**
 * @route GET /api/scheduled-tasks/:id
 * @desc 获取单个定时任务详情
 * @access Private
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = taskService.getTask(id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('获取任务详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务详情失败',
      error: error.message
    });
  }
});

/**
 * @route POST /api/scheduled-tasks
 * @desc 创建新的定时任务
 * @access Private
 */
router.post('/', async (req, res) => {
  try {
    const taskConfig = req.body;
    
    // 基本验证
    if (!taskConfig.name) {
      return res.status(400).json({
        success: false,
        message: '任务名称不能为空'
      });
    }

    if (!taskConfig.testType) {
      return res.status(400).json({
        success: false,
        message: '测试类型不能为空'
      });
    }

    if (!taskConfig.urls || taskConfig.urls.length === 0) {
      return res.status(400).json({
        success: false,
        message: '至少需要一个测试URL'
      });
    }

    if (!taskConfig.schedule || !taskConfig.schedule.type) {
      return res.status(400).json({
        success: false,
        message: '调度配置不能为空'
      });
    }

    const task = await taskService.createTask(taskConfig);
    
    logger.info(`用户 ${req.user?.username} 创建了定时任务: ${task.name}`);
    
    res.status(201).json({
      success: true,
      message: '定时任务创建成功',
      data: task
    });
  } catch (error) {
    logger.error('创建定时任务失败:', error);
    res.status(500).json({
      success: false,
      message: '创建定时任务失败',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/scheduled-tasks/:id
 * @desc 更新定时任务
 * @access Private
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const task = await taskService.updateTask(id, updates);
    
    logger.info(`用户 ${req.user?.username} 更新了定时任务: ${task.name}`);
    
    res.json({
      success: true,
      message: '定时任务更新成功',
      data: task
    });
  } catch (error) {
    logger.error('更新定时任务失败:', error);
    
    if (error.message.includes('任务不存在')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '更新定时任务失败',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/scheduled-tasks/:id
 * @desc 删除定时任务
 * @access Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await taskService.deleteTask(id);
    
    logger.info(`用户 ${req.user?.username} 删除了定时任务: ${id}`);
    
    res.json({
      success: true,
      message: '定时任务删除成功'
    });
  } catch (error) {
    logger.error('删除定时任务失败:', error);
    
    if (error.message.includes('任务不存在')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '删除定时任务失败',
      error: error.message
    });
  }
});

/**
 * @route POST /api/scheduled-tasks/:id/toggle
 * @desc 启用/禁用定时任务
 * @access Private
 */
router.post('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: '启用状态必须是布尔值'
      });
    }
    
    const task = await taskService.toggleTask(id, enabled);
    
    logger.info(`用户 ${req.user?.username} ${enabled ? '启用' : '禁用'}了定时任务: ${task.name}`);
    
    res.json({
      success: true,
      message: `任务已${enabled ? '启用' : '禁用'}`,
      data: task
    });
  } catch (error) {
    logger.error('切换任务状态失败:', error);
    
    if (error.message.includes('任务不存在')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '切换任务状态失败',
      error: error.message
    });
  }
});

/**
 * @route POST /api/scheduled-tasks/:id/execute
 * @desc 立即执行定时任务
 * @access Private
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    
    const execution = await taskService.executeTaskNow(id);
    
    logger.info(`用户 ${req.user?.username} 手动执行了定时任务: ${id}`);
    
    res.json({
      success: true,
      message: '任务已开始执行',
      data: execution
    });
  } catch (error) {
    logger.error('执行任务失败:', error);
    
    if (error.message.includes('任务不存在')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('最大并发')) {
      return res.status(429).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '执行任务失败',
      error: error.message
    });
  }
});

/**
 * @route GET /api/scheduled-tasks/:id/executions
 * @desc 获取任务执行历史
 * @access Private
 */
router.get('/:id/executions', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;
    
    const executions = taskService.getExecutions(id, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        executions,
        total: executions.length
      }
    });
  } catch (error) {
    logger.error('获取执行历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取执行历史失败',
      error: error.message
    });
  }
});

/**
 * @route GET /api/scheduled-tasks/executions/all
 * @desc 获取所有执行历史
 * @access Private
 */
router.get('/executions/all', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const executions = taskService.getExecutions(null, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        executions,
        total: executions.length
      }
    });
  } catch (error) {
    logger.error('获取所有执行历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取执行历史失败',
      error: error.message
    });
  }
});

/**
 * @route GET /api/scheduled-tasks/stats/system
 * @desc 获取系统统计信息
 * @access Private
 */
router.get('/stats/system', async (req, res) => {
  try {
    const stats = taskService.getSystemStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('获取系统统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统统计失败',
      error: error.message
    });
  }
});

/**
 * @route GET /api/scheduled-tasks/settings
 * @desc 获取系统设置
 * @access Private
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = taskService.getSettings();
    
    // 隐藏敏感信息
    const safeSettings = { ...settings };
    if (safeSettings.emailConfig && safeSettings.emailConfig.auth) {
      safeSettings.emailConfig.auth.pass = '********';
    }
    
    res.json({
      success: true,
      data: safeSettings
    });
  } catch (error) {
    logger.error('获取系统设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统设置失败',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/scheduled-tasks/settings
 * @desc 更新系统设置
 * @access Private
 */
router.put('/settings', async (req, res) => {
  try {
    const newSettings = req.body;
    
    // 验证设置
    if (newSettings.maxConcurrentTasks && 
        (newSettings.maxConcurrentTasks < 1 || newSettings.maxConcurrentTasks > 20)) {
      return res.status(400).json({
        success: false,
        message: '最大并发任务数必须在1-20之间'
      });
    }
    
    if (newSettings.logRetentionDays && 
        (newSettings.logRetentionDays < 1 || newSettings.logRetentionDays > 365)) {
      return res.status(400).json({
        success: false,
        message: '日志保留天数必须在1-365之间'
      });
    }
    
    taskService.updateSettings(newSettings);
    
    logger.info(`用户 ${req.user?.username} 更新了系统设置`);
    
    res.json({
      success: true,
      message: '系统设置更新成功'
    });
  } catch (error) {
    logger.error('更新系统设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新系统设置失败',
      error: error.message
    });
  }
});

/**
 * @route GET /api/scheduled-tasks/export
 * @desc 导出任务配置
 * @access Private
 */
router.get('/export', async (req, res) => {
  try {
    const exportData = taskService.exportTasks();
    
    logger.info(`用户 ${req.user?.username} 导出了任务配置`);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 
      `attachment; filename=scheduled-tasks-${new Date().toISOString().split('T')[0]}.json`);
    
    res.json(exportData);
  } catch (error) {
    logger.error('导出任务配置失败:', error);
    res.status(500).json({
      success: false,
      message: '导出任务配置失败',
      error: error.message
    });
  }
});

/**
 * @route POST /api/scheduled-tasks/import
 * @desc 导入任务配置
 * @access Private
 */
router.post('/import', async (req, res) => {
  try {
    const importData = req.body;
    
    if (!importData || typeof importData !== 'object') {
      return res.status(400).json({
        success: false,
        message: '无效的导入数据'
      });
    }
    
    const result = await taskService.importTasks(importData);
    
    logger.info(`用户 ${req.user?.username} 导入了任务配置，成功导入 ${result.importedCount} 个任务`);
    
    res.json({
      success: true,
      message: `成功导入 ${result.importedCount} 个任务`,
      data: result
    });
  } catch (error) {
    logger.error('导入任务配置失败:', error);
    res.status(500).json({
      success: false,
      message: '导入任务配置失败',
      error: error.message
    });
  }
});

/**
 * @route POST /api/scheduled-tasks/validate-cron
 * @desc 验证Cron表达式
 * @access Private
 */
router.post('/validate-cron', async (req, res) => {
  try {
    const { cronExpression } = req.body;
    
    if (!cronExpression) {
      return res.status(400).json({
        success: false,
        message: 'Cron表达式不能为空'
      });
    }
    
    const cron = require('node-cron');
    const isValid = cron.validate(cronExpression);
    
    res.json({
      success: true,
      data: {
        valid: isValid,
        expression: cronExpression
      }
    });
  } catch (error) {
    logger.error('验证Cron表达式失败:', error);
    res.status(500).json({
      success: false,
      message: '验证Cron表达式失败',
      error: error.message
    });
  }
});

/**
 * @route GET /api/scheduled-tasks/test-types
 * @desc 获取支持的测试类型
 * @access Private
 */
router.get('/test-types', async (req, res) => {
  try {
    const testTypes = [
      {
        value: 'performance',
        label: '性能测试',
        description: '测试网页加载速度和性能指标'
      },
      {
        value: 'security',
        label: '安全测试',
        description: '检查网站安全配置和漏洞'
      },
      {
        value: 'seo',
        label: 'SEO测试',
        description: '检查搜索引擎优化相关指标'
      },
      {
        value: 'api',
        label: 'API测试',
        description: '测试API接口响应和数据格式'
      },
      {
        value: 'batch',
        label: '批量测试',
        description: '批量执行多种类型的测试'
      }
    ];
    
    res.json({
      success: true,
      data: testTypes
    });
  } catch (error) {
    logger.error('获取测试类型失败:', error);
    res.status(500).json({
      success: false,
      message: '获取测试类型失败',
      error: error.message
    });
  }
});

// 错误处理中间件
router.use((error, req, res, next) => {
  logger.error('定时任务API错误:', error);
  
  res.status(500).json({
    success: false,
    message: '内部服务器错误',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 在应用关闭时清理资源
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭定时任务服务...');
  taskService.destroy();
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在关闭定时任务服务...');
  taskService.destroy();
});

module.exports = router;
