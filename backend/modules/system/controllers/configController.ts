/**
 * 配置管理控制器
 * 职责: 处理配置查询、更新、历史记录、回滚等业务逻辑
 * 从 system/routes/config.ts 中提取
 */

import type { NextFunction, Request } from 'express';
import { StandardErrorCode } from '../../../../shared/types/standardApiResponse';
import { configCenter } from '../../config/ConfigCenter';
import type { ApiResponse } from '../../types';

// ==================== 类型定义 ====================

type ConfigSchemaEntry = {
  hotReload?: boolean;
  sensitive?: boolean;
  default?: unknown;
};

// ==================== 控制器方法 ====================

const getAll = async (req: Request, res: ApiResponse, _next: NextFunction) => {
  try {
    const includeSensitive = req.query.includeSensitive === 'true';
    const configs = configCenter.getAll(includeSensitive);
    return res.success({ configs, status: configCenter.getStatus() }, '获取配置成功');
  } catch (error) {
    console.error('获取配置失败:', error);
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取配置失败', (error as Error).message, 500);
  }
};

const getByKey = async (req: Request, res: ApiResponse, _next: NextFunction) => {
  try {
    const { key } = req.params;
    const value = configCenter.get(key);
    if (value === undefined) return res.error(StandardErrorCode.NOT_FOUND, '配置项不存在', undefined, 404);
    const schema = configCenter.getSchema()[key] as ConfigSchemaEntry | undefined;
    return res.success({ key, value: schema && schema.sensitive ? '***' : value, schema }, '获取配置项成功');
  } catch (error) {
    console.error('获取配置项失败:', error);
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取配置项失败', (error as Error).message, 500);
  }
};

const updateByKey = async (req: Request, res: ApiResponse, _next: NextFunction) => {
  try {
    const { key } = req.params;
    const { value } = req.body as { value?: unknown };
    if (value === undefined) return res.error(StandardErrorCode.INVALID_INPUT, '配置值不能为空', undefined, 400);
    const schema = configCenter.getSchema()[key] as ConfigSchemaEntry | undefined;
    if (!schema) return res.error(StandardErrorCode.NOT_FOUND, '配置项不存在', undefined, 404);
    if (!schema.hotReload) return res.error(StandardErrorCode.INVALID_INPUT, '此配置项不支持热更新，需要重启应用', undefined, 400);
    const oldValue = configCenter.get(key);
    configCenter.set(key, value, 'api');
    return res.success({ key, oldValue: schema.sensitive ? '***' : oldValue, newValue: schema.sensitive ? '***' : value, hotReload: schema.hotReload }, '配置更新成功');
  } catch (error) {
    console.error('更新配置失败:', error);
    return res.error(StandardErrorCode.INVALID_INPUT, '更新配置失败', (error as Error).message, 400);
  }
};

const batchUpdate = async (req: Request, res: ApiResponse, _next: NextFunction) => {
  try {
    const { configs } = req.body as { configs?: Record<string, unknown> };
    if (!configs || typeof configs !== 'object') return res.error(StandardErrorCode.INVALID_INPUT, '配置数据格式错误', undefined, 400);
    const results: Array<Record<string, unknown>> = [];
    const errors: Array<{ key: string; error: string }> = [];
    for (const [key, value] of Object.entries(configs)) {
      try {
        const schema = configCenter.getSchema()[key] as ConfigSchemaEntry | undefined;
        if (!schema) { errors.push({ key, error: '配置项不存在' }); continue; }
        if (!schema.hotReload) { errors.push({ key, error: '不支持热更新' }); continue; }
        const oldValue = configCenter.get(key);
        configCenter.set(key, value, 'api_batch');
        results.push({ key, oldValue: schema.sensitive ? '***' : oldValue, newValue: schema.sensitive ? '***' : value, success: true });
      } catch (loopError) { errors.push({ key, error: (loopError as Error).message }); }
    }
    return res.success({ results, errors, successCount: results.length, errorCount: errors.length }, '批量配置更新完成');
  } catch (error) {
    console.error('批量更新配置失败:', error);
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '批量更新配置失败', (error as Error).message, 500);
  }
};

const getSchema = async (_req: Request, res: ApiResponse, _next: NextFunction) => {
  try {
    const schema = configCenter.getSchema();
    const publicSchema: Record<string, Record<string, unknown>> = {};
    for (const [key, config] of Object.entries(schema)) {
      publicSchema[key] = { ...config, default: (config as ConfigSchemaEntry).sensitive ? '***' : (config as ConfigSchemaEntry).default };
    }
    return res.success({ schema: publicSchema, totalConfigs: Object.keys(schema).length }, '获取配置模式成功');
  } catch (error) {
    console.error('获取配置模式失败:', error);
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取配置模式失败', (error as Error).message, 500);
  }
};

const getHistory = async (req: Request, res: ApiResponse, _next: NextFunction) => {
  try {
    const { key, limit = '50' } = req.query as { key?: string; limit?: string };
    const history = configCenter.getHistory(key ?? null, Number.parseInt(limit ?? '50', 10));
    const filteredHistory = history.map(change => {
      const schema = configCenter.getSchema()[change.key] as ConfigSchemaEntry | undefined;
      if (schema && schema.sensitive) return { ...change, oldValue: change.oldValue ? '***' : change.oldValue, newValue: change.newValue ? '***' : change.newValue };
      return change;
    });
    return res.success({ history: filteredHistory, totalCount: filteredHistory.length, key: key || 'all' }, '获取配置历史成功');
  } catch (error) {
    console.error('获取配置历史失败:', error);
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取配置历史失败', (error as Error).message, 500);
  }
};

const rollback = async (req: Request, res: ApiResponse, _next: NextFunction) => {
  try {
    const { changeId } = req.body as { changeId?: string };
    if (!changeId) return res.error(StandardErrorCode.INVALID_INPUT, '变更ID不能为空', undefined, 400);
    const rollbackInfo = configCenter.rollback(changeId);
    const schema = configCenter.getSchema()[rollbackInfo.key] as ConfigSchemaEntry | undefined;
    return res.success({ key: rollbackInfo.key, rolledBackTo: schema && schema.sensitive ? '***' : rollbackInfo.value, rolledBackFrom: schema && schema.sensitive ? '***' : rollbackInfo.rollbackFrom }, '配置回滚成功');
  } catch (error) {
    console.error('配置回滚失败:', error);
    return res.error(StandardErrorCode.INVALID_INPUT, '配置回滚失败', (error as Error).message, 400);
  }
};

const reset = async (req: Request, res: ApiResponse, _next: NextFunction) => {
  try {
    const { key } = req.body as { key?: string };
    if (key) {
      const schema = configCenter.getSchema()[key] as ConfigSchemaEntry | undefined;
      if (!schema) return res.error(StandardErrorCode.NOT_FOUND, '配置项不存在', undefined, 404);
      if (!schema.hotReload) return res.error(StandardErrorCode.INVALID_INPUT, '此配置项不支持热更新，需要重启应用', undefined, 400);
      const oldValue = configCenter.get(key);
      configCenter.reset(key);
      const newValue = configCenter.get(key);
      return res.success({ key, oldValue: schema.sensitive ? '***' : oldValue, newValue: schema.sensitive ? '***' : newValue }, '配置重置成功');
    } else {
      const schema = configCenter.getSchema();
      const resetResults: Array<Record<string, unknown>> = [];
      for (const [configKey, configSchema] of Object.entries(schema)) {
        const entry = configSchema as ConfigSchemaEntry | undefined;
        if (entry?.hotReload) {
          const oldValue = configCenter.get(configKey);
          configCenter.reset(configKey);
          const newValue = configCenter.get(configKey);
          resetResults.push({ key: configKey, oldValue: entry.sensitive ? '***' : oldValue, newValue: entry.sensitive ? '***' : newValue });
        }
      }
      return res.success({ resetConfigs: resetResults, resetCount: resetResults.length }, '配置批量重置成功');
    }
  } catch (error) {
    console.error('配置重置失败:', error);
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '配置重置失败', (error as Error).message, 500);
  }
};

const getStatus = async (_req: Request, res: ApiResponse, _next: NextFunction) => {
  try {
    const status = configCenter.getStatus();
    return res.success({ ...status, environment: process.env.NODE_ENV || 'development', uptime: process.uptime(), timestamp: new Date().toISOString() }, '获取配置状态成功');
  } catch (error) {
    console.error('获取配置状态失败:', error);
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取配置状态失败', (error as Error).message, 500);
  }
};

const validate = async (req: Request, res: ApiResponse, _next: NextFunction) => {
  try {
    const { configs } = req.body as { configs?: Record<string, unknown> };
    if (!configs || typeof configs !== 'object') return res.error(StandardErrorCode.INVALID_INPUT, '配置数据格式错误', undefined, 400);
    const validationResults: Array<Record<string, unknown>> = [];
    for (const [key, value] of Object.entries(configs)) {
      try {
        configCenter.validateConfig(key, value);
        validationResults.push({ key, valid: true, value });
      } catch (loopError) { validationResults.push({ key, valid: false, error: (loopError as Error).message, value }); }
    }
    const validCount = validationResults.filter(item => item.valid).length;
    const invalidCount = validationResults.length - validCount;
    return res.success({ results: validationResults, validCount, invalidCount, allValid: invalidCount === 0 }, '配置验证完成');
  } catch (error) {
    console.error('配置验证失败:', error);
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '配置验证失败', (error as Error).message, 500);
  }
};

const exportConfig = async (req: Request, res: ApiResponse, _next: NextFunction) => {
  try {
    const { format = 'json', includeSensitive = false } = req.query as { format?: string; includeSensitive?: string | boolean };
    const configs = configCenter.getAll(includeSensitive === 'true');
    if (format === 'json') return res.downloadResponse(JSON.stringify(configs, null, 2), 'config-export.json', 'application/json');
    if (format === 'env') {
      let envContent = `# 配置导出文件\n# 生成时间: ${new Date().toISOString()}\n\n`;
      for (const [key, value] of Object.entries(configs)) {
        const envKey = key.toUpperCase().replace(/\./g, '_');
        envContent += `${envKey}=${JSON.stringify(value)}\n`;
      }
      return res.downloadResponse(envContent, 'config-export.env', 'text/plain');
    }
    return res.error(StandardErrorCode.INVALID_INPUT, '不支持的导出格式', undefined, 400);
  } catch (error) {
    console.error('配置导出失败:', error);
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '配置导出失败', (error as Error).message, 500);
  }
};

const importConfig = async (req: Request, res: ApiResponse, _next: NextFunction) => {
  try {
    const { configs, overwrite = false } = req.body as { configs?: Record<string, unknown>; overwrite?: boolean };
    if (!configs || typeof configs !== 'object') return res.error(StandardErrorCode.INVALID_INPUT, '配置数据格式错误', undefined, 400);
    const importResults: Array<Record<string, unknown>> = [];
    const errors: Array<{ key: string; error: string }> = [];
    for (const [key, value] of Object.entries(configs)) {
      try {
        const schema = configCenter.getSchema()[key] as ConfigSchemaEntry | undefined;
        if (!schema) { errors.push({ key, error: '配置项不存在' }); continue; }
        if (!schema.hotReload) { errors.push({ key, error: '不支持热更新' }); continue; }
        const currentValue = configCenter.get(key);
        if (currentValue !== undefined && !overwrite) { errors.push({ key, error: '配置已存在，使用overwrite=true强制覆盖' }); continue; }
        configCenter.set(key, value, 'import');
        importResults.push({ key, imported: true, value: schema.sensitive ? '***' : value });
      } catch (loopError) { errors.push({ key, error: (loopError as Error).message }); }
    }
    return res.success({ results: importResults, errors, importedCount: importResults.length, errorCount: errors.length }, '配置导入完成');
  } catch (error) {
    console.error('配置导入失败:', error);
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '配置导入失败', (error as Error).message, 500);
  }
};

export default {
  getAll,
  getByKey,
  updateByKey,
  batchUpdate,
  getSchema,
  getHistory,
  rollback,
  reset,
  getStatus,
  validate,
  exportConfig,
  importConfig,
};
