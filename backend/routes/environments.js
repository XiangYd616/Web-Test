/**
 * 环境变量管理API路由
 * 提供类似Postman Environment的功能接口
 */

const express = require('express');
const router = express.Router();
const EnvironmentManager = require('../services/environments/EnvironmentManager');

// 初始化环境管理器
let environmentManager;
try {
  environmentManager = new EnvironmentManager({
    storageDir: './data/environments',
    encryptionKey: process.env.ENVIRONMENT_ENCRYPTION_KEY
  });
} catch (error) {
  console.error('环境管理器初始化失败:', error);
}

/**
 * 获取所有环境列表
 */
router.get('/', async (req, res) => {
  try {
    const environments = environmentManager.getEnvironments();
    res.json({
      success: true,
      data: environments,
      total: environments.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 创建新环境
 */
router.post('/', async (req, res) => {
  try {
    const environmentData = req.body;
    
    // 基本验证
    if (!environmentData.name) {
      return res.status(400).json({
        success: false,
        error: '环境名称是必需的'
      });
    }

    const environment = await environmentManager.createEnvironment(environmentData);
    res.status(201).json({
      success: true,
      data: environment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取特定环境详情
 */
router.get('/:environmentId', async (req, res) => {
  try {
    const { environmentId } = req.params;
    const environment = environmentManager.getEnvironment(environmentId);
    
    if (!environment) {
      return res.status(404).json({
        success: false,
        error: '环境不存在'
      });
    }

    res.json({
      success: true,
      data: environment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 更新环境配置
 */
router.put('/:environmentId', async (req, res) => {
  try {
    const { environmentId } = req.params;
    const updateData = req.body;
    
    const environment = environmentManager.getEnvironment(environmentId);
    if (!environment) {
      return res.status(404).json({
        success: false,
        error: '环境不存在'
      });
    }

    // 更新环境属性
    if (updateData.name) environment.name = updateData.name;
    if (updateData.description !== undefined) environment.description = updateData.description;
    if (updateData.config) environment.config = { ...environment.config, ...updateData.config };
    if (updateData.auth) environment.auth = updateData.auth;
    if (updateData.proxy) environment.proxy = updateData.proxy;
    if (updateData.ssl) environment.ssl = { ...environment.ssl, ...updateData.ssl };
    if (updateData.metadata) environment.metadata = { ...environment.metadata, ...updateData.metadata };

    environment.updatedAt = new Date().toISOString();
    await environmentManager.saveEnvironment(environment);

    res.json({
      success: true,
      data: environment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除环境
 */
router.delete('/:environmentId', async (req, res) => {
  try {
    const { environmentId } = req.params;
    await environmentManager.deleteEnvironment(environmentId);
    
    res.json({
      success: true,
      message: '环境已删除'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 设置活跃环境
 */
router.post('/:environmentId/activate', async (req, res) => {
  try {
    const { environmentId } = req.params;
    const environment = await environmentManager.setActiveEnvironment(environmentId);
    
    res.json({
      success: true,
      data: environment,
      message: `已切换到环境: ${environment.name}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取活跃环境
 */
router.get('/active/current', async (req, res) => {
  try {
    const activeEnvironment = environmentManager.getActiveEnvironment();
    
    if (!activeEnvironment) {
      return res.json({
        success: true,
        data: null,
        message: '没有活跃环境'
      });
    }

    res.json({
      success: true,
      data: activeEnvironment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取环境变量列表
 */
router.get('/:environmentId/variables', async (req, res) => {
  try {
    const { environmentId } = req.params;
    const environment = environmentManager.getEnvironment(environmentId);
    
    if (!environment) {
      return res.status(404).json({
        success: false,
        error: '环境不存在'
      });
    }

    res.json({
      success: true,
      data: environment.variables,
      total: environment.variables.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 设置环境变量
 */
router.post('/:environmentId/variables', async (req, res) => {
  try {
    const { environmentId } = req.params;
    const { key, value, type, description, secret } = req.body;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        error: '变量名称是必需的'
      });
    }

    await environmentManager.setVariable(key, value, {
      environmentId,
      type,
      description,
      secret
    });

    res.json({
      success: true,
      message: `变量 ${key} 已设置`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取特定变量值
 */
router.get('/:environmentId/variables/:key', async (req, res) => {
  try {
    const { environmentId, key } = req.params;
    const value = environmentManager.getVariable(key, { environmentId });
    
    res.json({
      success: true,
      data: {
        key,
        value,
        found: value !== undefined
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 批量设置变量
 */
router.post('/:environmentId/variables/batch', async (req, res) => {
  try {
    const { environmentId } = req.params;
    const { variables } = req.body;
    
    if (!Array.isArray(variables)) {
      return res.status(400).json({
        success: false,
        error: '变量列表必须是数组'
      });
    }

    const results = [];
    for (const variable of variables) {
      try {
        await environmentManager.setVariable(variable.key, variable.value, {
          environmentId,
          type: variable.type,
          description: variable.description,
          secret: variable.secret
        });
        results.push({ key: variable.key, success: true });
      } catch (error) {
        results.push({ key: variable.key, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      data: results,
      message: `处理了 ${variables.length} 个变量`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 变量解析预览
 */
router.post('/:environmentId/variables/resolve', async (req, res) => {
  try {
    const { environmentId } = req.params;
    const { text, object } = req.body;
    
    const options = { environmentId };
    
    let resolved;
    if (text) {
      resolved = environmentManager.resolveVariables(text, options);
    } else if (object) {
      resolved = environmentManager.resolveObjectVariables(object, options);
    } else {
      return res.status(400).json({
        success: false,
        error: '请提供 text 或 object 参数'
      });
    }

    res.json({
      success: true,
      data: {
        original: text || object,
        resolved
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 全局变量管理
 */
router.get('/global/variables', async (req, res) => {
  try {
    const variables = environmentManager.getGlobalVariables();
    res.json({
      success: true,
      data: variables,
      total: variables.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/global/variables', async (req, res) => {
  try {
    const { key, value, type, description, secret } = req.body;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        error: '变量名称是必需的'
      });
    }

    await environmentManager.setVariable(key, value, {
      scope: 'global',
      type,
      description,
      secret
    });

    res.json({
      success: true,
      message: `全局变量 ${key} 已设置`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 导入/导出功能
 */
router.post('/import', async (req, res) => {
  try {
    const environmentData = req.body;
    const environment = await environmentManager.importEnvironment(environmentData);
    
    res.json({
      success: true,
      data: environment,
      message: '环境导入成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:environmentId/export', async (req, res) => {
  try {
    const { environmentId } = req.params;
    const { format = 'testweb' } = req.query;
    
    const exportData = await environmentManager.exportEnvironment(environmentId, format);
    
    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 动态变量预览
 */
router.get('/dynamic/variables', async (req, res) => {
  try {
    const dynamicVariables = {
      '$timestamp': environmentManager.resolveDynamicVariable('$timestamp'),
      '$isoTimestamp': environmentManager.resolveDynamicVariable('$isoTimestamp'),
      '$randomInt': environmentManager.resolveDynamicVariable('$randomInt'),
      '$randomFloat': environmentManager.resolveDynamicVariable('$randomFloat'),
      '$randomString': environmentManager.resolveDynamicVariable('$randomString'),
      '$guid': environmentManager.resolveDynamicVariable('$guid'),
      '$randomEmail': environmentManager.resolveDynamicVariable('$randomEmail'),
      '$randomUserAgent': environmentManager.resolveDynamicVariable('$randomUserAgent'),
      '$randomIP': environmentManager.resolveDynamicVariable('$randomIP'),
      '$randomPort': environmentManager.resolveDynamicVariable('$randomPort'),
      '$randomColor': environmentManager.resolveDynamicVariable('$randomColor')
    };

    res.json({
      success: true,
      data: dynamicVariables,
      description: '动态变量每次调用都会生成新值'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 变量历史记录
 */
router.get('/history/variables', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = environmentManager.getVariableHistory(parseInt(limit));
    
    res.json({
      success: true,
      data: history,
      total: history.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 错误处理中间件
 */
router.use((err, req, res, next) => {
  console.error('环境管理API错误:', err);
  res.status(500).json({
    success: false,
    error: '内部服务器错误',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = router;
