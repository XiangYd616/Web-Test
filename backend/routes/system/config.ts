/**
 * 配置管理API路由
 * 提供配置的查询、更新、历史记录、回滚等功能
 */

import express, { Request, Response } from 'express';
import { configCenter } from '../../config/ConfigCenter';

type ApiResponse = Response & {
  success: (data?: unknown, message?: string) => void;
  error: (message: string, status?: number, details?: unknown) => void;
};

type ConfigSchemaEntry = {
  hotReload?: boolean;
  sensitive?: boolean;
};

const router = express.Router();

/**
 * 获取所有配置
 * GET /api/config
 */
router.get('/', async (req: Request, res: ApiResponse) => {
  try {
    const includeSensitive = req.query.includeSensitive === 'true';
    const configs = configCenter.getAll(includeSensitive);

    res.success(
      {
        configs,
        status: configCenter.getStatus(),
      },
      '获取配置成功'
    );
  } catch (error) {
    console.error('获取配置失败:', error);
    res.error('获取配置失败', 500, (error as Error).message);
  }
});

/**
 * 获取单个配置
 * GET /api/config/:key
 */
router.get('/:key', async (req: Request, res: ApiResponse) => {
  try {
    const { key } = req.params;
    const value = configCenter.get(key);

    if (value === undefined) {
      return res.error('配置项不存在', 404);
    }

    const schema = configCenter.getSchema()[key] as ConfigSchemaEntry | undefined;

    res.success(
      {
        key,
        value: schema && schema.sensitive ? '***' : value,
        schema,
      },
      '获取配置项成功'
    );
  } catch (error) {
    console.error('获取配置项失败:', error);
    res.error('获取配置项失败', 500, (error as Error).message);
  }
});

/**
 * 更新配置
 * PUT /api/config/:key
 */
router.put('/:key', async (req: Request, res: ApiResponse) => {
  try {
    const { key } = req.params;
    const { value } = req.body as { value?: unknown };

    if (value === undefined) {
      return res.error('配置值不能为空', 400);
    }

    // 检查配置项是否存在
    const schema = configCenter.getSchema()[key] as ConfigSchemaEntry | undefined;
    if (!schema) {
      return res.error('配置项不存在', 404);
    }

    // 检查是否支持热更新
    if (!schema.hotReload) {
      return res.error('此配置项不支持热更新，需要重启应用', 400);
    }

    const oldValue = configCenter.get(key);
    configCenter.set(key, value, 'api');

    res.success(
      {
        key,
        oldValue: schema.sensitive ? '***' : oldValue,
        newValue: schema.sensitive ? '***' : value,
        hotReload: schema.hotReload,
      },
      '配置更新成功'
    );
  } catch (error) {
    console.error('更新配置失败:', error);
    res.error('更新配置失败', 400, (error as Error).message);
  }
});

/**
 * 批量更新配置
 * PUT /api/config
 */
router.put('/', async (req: Request, res: ApiResponse) => {
  try {
    const { configs } = req.body as { configs?: Record<string, unknown> };

    if (!configs || typeof configs !== 'object') {
      return res.error('配置数据格式错误', 400);
    }

    const results: Array<Record<string, unknown>> = [];
    const errors: Array<{ key: string; error: string }> = [];

    for (const [key, value] of Object.entries(configs)) {
      try {
        const schema = configCenter.getSchema()[key] as ConfigSchemaEntry | undefined;
        if (!schema) {
          errors.push({ key, error: '配置项不存在' });
          continue;
        }

        if (!schema.hotReload) {
          errors.push({ key, error: '不支持热更新' });
          continue;
        }

        const oldValue = configCenter.get(key);
        configCenter.set(key, value, 'api_batch');

        results.push({
          key,
          oldValue: schema.sensitive ? '***' : oldValue,
          newValue: schema.sensitive ? '***' : value,
          success: true,
        });
      } catch (loopError) {
        errors.push({ key, error: (loopError as Error).message });
      }
    }

    res.success(
      {
        results,
        errors,
        successCount: results.length,
        errorCount: errors.length,
      },
      '批量配置更新完成'
    );
  } catch (error) {
    console.error('批量更新配置失败:', error);
    res.error('批量更新配置失败', 500, (error as Error).message);
  }
});

/**
 * 获取配置模式
 * GET /api/config/schema
 */
router.get('/meta/schema', async (req: Request, res: ApiResponse) => {
  try {
    const schema = configCenter.getSchema();

    // 过滤敏感信息
    const publicSchema: Record<string, Record<string, unknown>> = {};
    for (const [key, config] of Object.entries(schema)) {
      publicSchema[key] = {
        ...config,
        default: (config as { sensitive?: boolean; default?: unknown }).sensitive
          ? '***'
          : (config as { default?: unknown }).default,
      };
    }

    res.success(
      {
        schema: publicSchema,
        totalConfigs: Object.keys(schema).length,
      },
      '获取配置模式成功'
    );
  } catch (error) {
    console.error('获取配置模式失败:', error);
    res.error('获取配置模式失败', 500, (error as Error).message);
  }
});

/**
 * 获取配置历史
 * GET /api/config/history
 */
router.get('/meta/history', async (req: Request, res: ApiResponse) => {
  try {
    const { key, limit = '50' } = req.query as { key?: string; limit?: string };
    const history = configCenter.getHistory(key ?? null, Number.parseInt(limit ?? '50', 10));

    // 过滤敏感信息
    const filteredHistory = history.map(change => {
      const schema = configCenter.getSchema()[change.key] as ConfigSchemaEntry | undefined;
      if (schema && schema.sensitive) {
        return {
          ...change,
          oldValue: change.oldValue ? '***' : change.oldValue,
          newValue: change.newValue ? '***' : change.newValue,
        };
      }
      return change;
    });

    res.success(
      {
        history: filteredHistory,
        totalCount: filteredHistory.length,
        key: key || 'all',
      },
      '获取配置历史成功'
    );
  } catch (error) {
    console.error('获取配置历史失败:', error);
    res.error('获取配置历史失败', 500, (error as Error).message);
  }
});

/**
 * 回滚配置
 * POST /api/config/rollback
 */
router.post('/meta/rollback', async (req: Request, res: ApiResponse) => {
  try {
    const { changeId } = req.body as { changeId?: string };

    if (!changeId) {
      return res.error('变更ID不能为空', 400);
    }

    const rollbackInfo = configCenter.rollback(changeId);
    const schema = configCenter.getSchema()[rollbackInfo.key] as ConfigSchemaEntry | undefined;

    res.success(
      {
        key: rollbackInfo.key,
        rolledBackTo: schema && schema.sensitive ? '***' : rollbackInfo.value,
        rolledBackFrom: schema && schema.sensitive ? '***' : rollbackInfo.rollbackFrom,
      },
      '配置回滚成功'
    );
  } catch (error) {
    console.error('配置回滚失败:', error);
    res.error('配置回滚失败', 400, (error as Error).message);
  }
});

/**
 * 重置配置
 * POST /api/config/reset
 */
router.post('/meta/reset', async (req: Request, res: ApiResponse) => {
  try {
    const { key } = req.body as { key?: string };

    if (key) {
      // 重置单个配置
      const schema = configCenter.getSchema()[key] as ConfigSchemaEntry | undefined;
      if (!schema) {
        return res.error('配置项不存在', 404);
      }

      if (!schema.hotReload) {
        return res.error('此配置项不支持热更新，需要重启应用', 400);
      }

      const oldValue = configCenter.get(key);
      configCenter.reset(key);
      const newValue = configCenter.get(key);

      res.success(
        {
          key,
          oldValue: schema.sensitive ? '***' : oldValue,
          newValue: schema.sensitive ? '***' : newValue,
        },
        '配置重置成功'
      );
    } else {
      // 重置所有支持热更新的配置
      const schema = configCenter.getSchema();
      const resetResults: Array<Record<string, unknown>> = [];

      for (const [configKey, configSchema] of Object.entries(schema)) {
        const entry = configSchema as ConfigSchemaEntry | undefined;
        if (entry?.hotReload) {
          const oldValue = configCenter.get(configKey);
          configCenter.reset(configKey);
          const newValue = configCenter.get(configKey);

          resetResults.push({
            key: configKey,
            oldValue: entry.sensitive ? '***' : oldValue,
            newValue: entry.sensitive ? '***' : newValue,
          });
        }
      }

      res.success(
        {
          resetConfigs: resetResults,
          resetCount: resetResults.length,
        },
        '配置批量重置成功'
      );
    }
  } catch (error) {
    console.error('配置重置失败:', error);
    res.error('配置重置失败', 500, (error as Error).message);
  }
});

/**
 * 获取配置状态
 * GET /api/config/status
 */
router.get('/meta/status', async (req: Request, res: ApiResponse) => {
  try {
    const status = configCenter.getStatus();

    res.success(
      {
        ...status,
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      '获取配置状态成功'
    );
  } catch (error) {
    console.error('获取配置状态失败:', error);
    res.error('获取配置状态失败', 500, (error as Error).message);
  }
});

/**
 * 验证配置
 * POST /api/config/validate
 */
router.post('/meta/validate', async (req: Request, res: ApiResponse) => {
  try {
    const { configs } = req.body as { configs?: Record<string, unknown> };

    if (!configs || typeof configs !== 'object') {
      return res.error('配置数据格式错误', 400);
    }

    const validationResults: Array<Record<string, unknown>> = [];

    for (const [key, value] of Object.entries(configs)) {
      try {
        configCenter.validateConfig(key, value);
        validationResults.push({
          key,
          valid: true,
          value,
        });
      } catch (loopError) {
        validationResults.push({
          key,
          valid: false,
          error: (loopError as Error).message,
          value,
        });
      }
    }

    const validCount = validationResults.filter(item => item.valid).length;
    const invalidCount = validationResults.length - validCount;

    res.success(
      {
        results: validationResults,
        validCount,
        invalidCount,
        allValid: invalidCount === 0,
      },
      '配置验证完成'
    );
  } catch (error) {
    console.error('配置验证失败:', error);
    res.error('配置验证失败', 500, (error as Error).message);
  }
});

/**
 * 导出配置
 * GET /api/config/export
 */
router.get('/meta/export', async (req: Request, res: ApiResponse) => {
  try {
    const { format = 'json', includeSensitive = false } = req.query as {
      format?: string;
      includeSensitive?: string | boolean;
    };
    const configs = configCenter.getAll(includeSensitive === 'true');

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=config-export.json');
      res.send(JSON.stringify(configs, null, 2));
    } else if (format === 'env') {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename=config-export.env');

      let envContent = `# 配置导出文件\n# 生成时间: ${new Date().toISOString()}\n\n`;
      for (const [key, value] of Object.entries(configs)) {
        const envKey = key.toUpperCase().replace(/\./g, '_');
        envContent += `${envKey}=${JSON.stringify(value)}\n`;
      }

      res.send(envContent);
    } else {
      res.error('不支持的导出格式', 400);
    }
  } catch (error) {
    console.error('配置导出失败:', error);
    res.error('配置导出失败', 500, (error as Error).message);
  }
});

/**
 * 导入配置
 * POST /api/config/import
 */
router.post('/meta/import', async (req: Request, res: ApiResponse) => {
  try {
    const { configs, overwrite = false } = req.body as {
      configs?: Record<string, unknown>;
      overwrite?: boolean;
    };

    if (!configs || typeof configs !== 'object') {
      return res.error('配置数据格式错误', 400);
    }

    const importResults: Array<Record<string, unknown>> = [];
    const errors: Array<{ key: string; error: string }> = [];

    for (const [key, value] of Object.entries(configs)) {
      try {
        const schema = configCenter.getSchema()[key] as ConfigSchemaEntry | undefined;
        if (!schema) {
          errors.push({ key, error: '配置项不存在' });
          continue;
        }

        if (!schema.hotReload) {
          errors.push({ key, error: '不支持热更新' });
          continue;
        }

        const currentValue = configCenter.get(key);
        if (currentValue !== undefined && !overwrite) {
          errors.push({ key, error: '配置已存在，使用overwrite=true强制覆盖' });
          continue;
        }

        configCenter.set(key, value, 'import');
        importResults.push({
          key,
          imported: true,
          value: schema.sensitive ? '***' : value,
        });
      } catch (loopError) {
        errors.push({ key, error: (loopError as Error).message });
      }
    }

    res.success(
      {
        results: importResults,
        errors,
        importedCount: importResults.length,
        errorCount: errors.length,
      },
      '配置导入完成'
    );
  } catch (error) {
    console.error('配置导入失败:', error);
    res.error('配置导入失败', 500, (error as Error).message);
  }
});

export default router;

// 兼容 CommonJS require
module.exports = router;
