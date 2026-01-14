/**
 * 定时任务API路由
 * 
 * 文件路径: backend/routes/scheduledTasks.js
 * 创建时间: 2025-11-14
 * 
 * 端点:
 * - POST   /api/scheduled-tasks          - 创建定时任务
 * - GET    /api/scheduled-tasks          - 查询定时任务列表
 * - GET    /api/scheduled-tasks/:id      - 获取任务详情
 * - PUT    /api/scheduled-tasks/:id      - 更新任务
 * - DELETE /api/scheduled-tasks/:id      - 删除任务
 * - POST   /api/scheduled-tasks/:id/enable  - 启用任务
 * - POST   /api/scheduled-tasks/:id/disable - 禁用任务
 * - POST   /api/scheduled-tasks/:id/execute - 立即执行任务
 * - GET    /api/scheduled-tasks/status   - 获取调度器状态
 * - GET    /api/scheduled-tasks/history  - 获取执行历史
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/logger');

// 全局调度器实例（应在服务器启动时初始化）
let scheduler = null;

/**
 * 设置调度器实例
 */
function setScheduler(schedulerInstance) {
  scheduler = schedulerInstance;
}

/**
 * POST /api/scheduled-tasks
 * 创建定时任务
 */
router.post('/', async (req, res) => {
  try {
    if (!scheduler) {
      return res.status(503).json({
        success: false,
        error: '调度器未初始化'
      });
    }

    const {
      name,
      type,
      schedule,
      config,
      enabled = true,
      metadata = {}
    } = req.body;

    // 验证必需参数
    if (!name || !type || !config) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数: name, type, config'
      });
    }

    const taskId = uuidv4();

    // 添加到调度器
    scheduler.addTask({
      taskId,
      name,
      type,
      schedule,
      config,
      enabled,
      metadata: {
        ...metadata,
        userId: req.user?.id,
        createdBy: req.user?.username || 'system'
      }
    });

    const task = scheduler.getTask(taskId);

    res.json({
      success: true,
      data: task,
      message: '定时任务创建成功'
    });

    Logger.info(`创建定时任务: ${taskId} - ${name}`);

  } catch (error) {
    Logger.error('创建定时任务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/scheduled-tasks
 * 查询定时任务列表
 */
router.get('/', async (req, res) => {
  try {
    if (!scheduler) {
      return res.status(503).json({
        success: false,
        error: '调度器未初始化'
      });
    }

    const {
      type,
      enabled,
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let tasks = scheduler.getAllTasks();

    // 过滤
    if (type) {
      tasks = tasks.filter(t => t.type === type);
    }
    if (enabled !== undefined) {
      const enabledBool = enabled === 'true';
      tasks = tasks.filter(t => t.enabled === enabledBool);
    }

    // 排序
    tasks.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1;
      }
      return aVal > bVal ? 1 : -1;
    });

    // 分页
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + parseInt(pageSize);
    const paginatedTasks = tasks.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        tasks: paginatedTasks,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: tasks.length,
          totalPages: Math.ceil(tasks.length / pageSize)
        }
      }
    });

  } catch (error) {
    Logger.error('查询定时任务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/scheduled-tasks/:id
 * 获取任务详情
 */
router.get('/:id', async (req, res) => {
  try {
    if (!scheduler) {
      return res.status(503).json({
        success: false,
        error: '调度器未初始化'
      });
    }

    const { id } = req.params;
    const task = scheduler.getTask(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    // 获取任务的执行历史
    const history = scheduler.getExecutionHistory(id, 10);

    res.json({
      success: true,
      data: {
        task,
        recentExecutions: history
      }
    });

  } catch (error) {
    Logger.error('获取任务详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/scheduled-tasks/:id
 * 更新任务
 */
router.put('/:id', async (req, res) => {
  try {
    if (!scheduler) {
      return res.status(503).json({
        success: false,
        error: '调度器未初始化'
      });
    }

    const { id } = req.params;
    const task = scheduler.getTask(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    const {
      name,
      schedule,
      config,
      metadata
    } = req.body;

    // 更新任务属性
    if (name) task.name = name;
    if (schedule !== undefined) task.schedule = schedule;
    if (config) task.config = { ...task.config, ...config };
    if (metadata) task.metadata = { ...task.metadata, ...metadata };

    // 如果schedule改变，需要重新启动cron任务
    if (schedule !== undefined && task.enabled) {
      scheduler.disableTask(id);
      scheduler.enableTask(id);
    }

    res.json({
      success: true,
      data: task,
      message: '任务更新成功'
    });

    Logger.info(`更新任务: ${id}`);

  } catch (error) {
    Logger.error('更新任务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/scheduled-tasks/:id
 * 删除任务
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!scheduler) {
      return res.status(503).json({
        success: false,
        error: '调度器未初始化'
      });
    }

    const { id } = req.params;
    scheduler.removeTask(id);

    res.json({
      success: true,
      message: '任务删除成功'
    });

    Logger.info(`删除任务: ${id}`);

  } catch (error) {
    Logger.error('删除任务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/scheduled-tasks/:id/enable
 * 启用任务
 */
router.post('/:id/enable', async (req, res) => {
  try {
    if (!scheduler) {
      return res.status(503).json({
        success: false,
        error: '调度器未初始化'
      });
    }

    const { id } = req.params;
    scheduler.enableTask(id);

    const task = scheduler.getTask(id);

    res.json({
      success: true,
      data: task,
      message: '任务已启用'
    });

    Logger.info(`启用任务: ${id}`);

  } catch (error) {
    Logger.error('启用任务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/scheduled-tasks/:id/disable
 * 禁用任务
 */
router.post('/:id/disable', async (req, res) => {
  try {
    if (!scheduler) {
      return res.status(503).json({
        success: false,
        error: '调度器未初始化'
      });
    }

    const { id } = req.params;
    scheduler.disableTask(id);

    const task = scheduler.getTask(id);

    res.json({
      success: true,
      data: task,
      message: '任务已禁用'
    });

    Logger.info(`禁用任务: ${id}`);

  } catch (error) {
    Logger.error('禁用任务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/scheduled-tasks/:id/execute
 * 立即执行任务（不管调度）
 */
router.post('/:id/execute', async (req, res) => {
  try {
    if (!scheduler) {
      return res.status(503).json({
        success: false,
        error: '调度器未初始化'
      });
    }

    const { id } = req.params;
    
    // 异步执行，不等待结果
    scheduler.executeTask(id)
      .then(executionInfo => {
        Logger.info(`任务执行完成: ${id}`, executionInfo);
      })
      .catch(error => {
        Logger.error(`任务执行失败: ${id}`, error);
      });

    res.json({
      success: true,
      message: '任务已开始执行',
      taskId: id
    });

    Logger.info(`手动触发任务执行: ${id}`);

  } catch (error) {
    Logger.error('执行任务失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/scheduled-tasks/scheduler/status
 * 获取调度器状态
 */
router.get('/scheduler/status', async (req, res) => {
  try {
    if (!scheduler) {
      return res.status(503).json({
        success: false,
        error: '调度器未初始化'
      });
    }

    const status = scheduler.getStatus();
    const runningTasks = scheduler.getRunningTasks();

    res.json({
      success: true,
      data: {
        ...status,
        runningTaskDetails: runningTasks
      }
    });

  } catch (error) {
    Logger.error('获取调度器状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/scheduled-tasks/history/all
 * 获取执行历史
 */
router.get('/history/all', async (req, res) => {
  try {
    if (!scheduler) {
      return res.status(503).json({
        success: false,
        error: '调度器未初始化'
      });
    }

    const {
      taskId,
      limit = 50,
      status
    } = req.query;

    let history = scheduler.getExecutionHistory(taskId, parseInt(limit));

    // 按状态过滤
    if (status) {
      history = history.filter(h => h.status === status);
    }

    res.json({
      success: true,
      data: {
        history,
        total: history.length
      }
    });

  } catch (error) {
    Logger.error('获取执行历史失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/scheduled-tasks/validate-cron
 * 验证cron表达式
 */
router.get('/validate-cron', async (req, res) => {
  try {
    const { expression } = req.query;

    if (!expression) {
      return res.status(400).json({
        success: false,
        error: '缺少cron表达式参数'
      });
    }

    const cron = require('node-cron');
    const isValid = cron.validate(expression);

    res.json({
      success: true,
      data: {
        expression,
        valid: isValid,
        message: isValid ? 'Cron表达式有效' : 'Cron表达式无效'
      }
    });

  } catch (error) {
    Logger.error('验证cron表达式失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = {
  router,
  setScheduler
};
