/**
 * 集成管理控制器
 * 职责: 处理第三方集成的CRUD、测试、触发等业务逻辑
 * 从 integrations/routes/integrations.ts 中提取
 */

import axios from 'axios';
import type { NextFunction } from 'express';
import nodemailer from 'nodemailer';
import { StandardErrorCode } from '../../../../shared/types/standardApiResponse';
import { dataManagementService } from '../../data/services/DataManagementService';
import type { ApiResponse, AuthenticatedRequest } from '../../types';
import Logger from '../../utils/logger';

// ==================== 类型定义 ====================

enum IntegrationType {
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  EMAIL = 'email',
  JENKINS = 'jenkins',
  GITHUB = 'github',
  GITLAB = 'gitlab',
  JIRA = 'jira',
  TEAMS = 'teams',
}

interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastTriggered?: Date;
  status: 'active' | 'inactive' | 'error';
}

// ==================== 内部工具函数 ====================

const INTEGRATIONS_TYPE = 'misc_integrations';
const INTEGRATION_LOGS_TYPE = 'misc_integration_logs';

const getUserId = (req: AuthenticatedRequest): string => {
  const userId = req.user?.id;
  if (!userId) throw new Error('用户未认证');
  return userId;
};

const mapIntegrationRecord = (record: { id: string; data: Record<string, unknown> }) => {
  const data = record.data as unknown as Integration;
  return {
    ...data,
    id: record.id,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    lastTriggered: data.lastTriggered ? new Date(data.lastTriggered) : undefined,
  } as Integration;
};

const fetchIntegrationById = async (id: string) => {
  const record = await dataManagementService.readData(INTEGRATIONS_TYPE, id);
  return mapIntegrationRecord(record as { id: string; data: Record<string, unknown> });
};

const recordIntegrationLog = async (
  integrationId: string, level: 'info' | 'warn' | 'error', message: string, details: Record<string, unknown>
) => {
  await dataManagementService.createData(INTEGRATION_LOGS_TYPE, { integrationId, level, message, details, createdAt: new Date() }, { source: 'integrations' });
};

const triggerIntegration = async (type: IntegrationType, config: Record<string, unknown>, eventType: string, payload: unknown) => {
  switch (type) {
    case IntegrationType.WEBHOOK: {
      const url = String(config.url || config.webhookUrl || '');
      const response = await axios.post(url, payload, { timeout: 10000 });
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    case IntegrationType.SLACK: {
      const url = String(config.webhookUrl || '');
      const response = await axios.post(url, { text: (payload as { text?: string }).text || 'TestWeb 集成触发', username: config.username || 'TestWeb', channel: config.channel }, { timeout: 10000 });
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    case IntegrationType.TEAMS: {
      const url = String(config.webhookUrl || '');
      const response = await axios.post(url, { title: (payload as { title?: string }).title || 'TestWeb 集成触发', text: (payload as { text?: string }).text || 'TestWeb 集成事件通知' }, { timeout: 10000 });
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    case IntegrationType.EMAIL: {
      const smtp = config.smtp as { host: string; port: number; secure: boolean; auth?: { user: string; pass: string } };
      const transporter = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: smtp.auth });
      const info = await transporter.sendMail({ from: config.from as string, to: (config.to as string[]) || [], subject: (payload as { subject?: string }).subject || (config.subject as string), text: (payload as { text?: string }).text || 'TestWeb 集成触发通知' });
      return { success: true, messageId: info.messageId };
    }
    case IntegrationType.JENKINS: {
      const serverUrl = String(config.serverUrl || '');
      const jobName = String(config.jobName || '');
      const auth = { username: String(config.username || ''), password: String(config.apiToken || '') };
      const response = await axios.post(`${serverUrl}/job/${jobName}/build`, {}, { auth, timeout: 10000 });
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    case IntegrationType.GITHUB: {
      const owner = String(config.owner || '');
      const repo = String(config.repository || config.repo || '');
      const token = String(config.token || '');
      const response = await axios.post(`https://api.github.com/repos/${owner}/${repo}/dispatches`, { event_type: eventType || 'testweb.trigger', client_payload: payload || {} }, { headers: { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }, timeout: 10000 });
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    case IntegrationType.GITLAB: {
      const serverUrl = String(config.serverUrl || 'https://gitlab.com');
      const projectId = String(config.projectId || '');
      const token = String(config.token || '');
      const ref = String(config.branch || 'main');
      const response = await axios.post(`${serverUrl}/api/v4/projects/${encodeURIComponent(projectId)}/trigger/pipeline`, null, { params: { ref, token }, timeout: 10000 });
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    case IntegrationType.JIRA: {
      const baseUrl = String(config.url || '');
      const response = await axios.post(`${baseUrl}/rest/api/2/issue`, payload || { fields: { project: { key: config.projectKey || 'TEST' }, summary: 'TestWeb 集成触发', description: '由 TestWeb 触发的 Jira 集成事件', issuetype: { name: 'Task' } } }, { auth: { username: String(config.username || ''), password: String(config.password || '') }, timeout: 10000 });
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    default:
      return { success: false, message: '未支持的集成类型' };
  }
};

const testIntegrationConnection = async (type: IntegrationType, config: Record<string, unknown>) => {
  switch (type) {
    case IntegrationType.WEBHOOK: {
      const url = String(config.url || config.webhookUrl || '');
      const r = await axios.post(url, { test: true }, { timeout: 10000 });
      return { success: r.status >= 200 && r.status < 300, status: r.status };
    }
    case IntegrationType.SLACK: {
      const url = String(config.webhookUrl || '');
      const r = await axios.post(url, { text: 'TestWeb 集成连接测试' }, { timeout: 10000 });
      return { success: r.status >= 200 && r.status < 300, status: r.status };
    }
    case IntegrationType.TEAMS: {
      const url = String(config.webhookUrl || '');
      const r = await axios.post(url, { title: 'TestWeb 集成连接测试', text: 'TestWeb 集成连接测试' }, { timeout: 10000 });
      return { success: r.status >= 200 && r.status < 300, status: r.status };
    }
    case IntegrationType.EMAIL: {
      const smtp = config.smtp as { host: string; port: number; secure: boolean; auth?: { user: string; pass: string } };
      const transporter = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: smtp.auth });
      const info = await transporter.sendMail({ from: config.from as string, to: (config.to as string[]) || [], subject: 'TestWeb 集成连接测试', text: 'TestWeb 集成连接测试' });
      return { success: true, messageId: info.messageId };
    }
    case IntegrationType.JENKINS: {
      const r = await axios.get(`${String(config.serverUrl || '')}/job/${String(config.jobName || '')}/api/json`, { auth: { username: String(config.username || ''), password: String(config.apiToken || '') }, timeout: 10000 });
      return { success: r.status >= 200 && r.status < 300, status: r.status };
    }
    case IntegrationType.GITHUB: {
      const r = await axios.get(`https://api.github.com/repos/${String(config.owner || '')}/${String(config.repository || config.repo || '')}`, { headers: { Authorization: `Bearer ${String(config.token || '')}` }, timeout: 10000 });
      return { success: r.status >= 200 && r.status < 300, status: r.status };
    }
    case IntegrationType.GITLAB: {
      const r = await axios.get(`${String(config.serverUrl || 'https://gitlab.com')}/api/v4/projects/${encodeURIComponent(String(config.projectId || ''))}`, { headers: { 'PRIVATE-TOKEN': String(config.token || '') }, timeout: 10000 });
      return { success: r.status >= 200 && r.status < 300, status: r.status };
    }
    case IntegrationType.JIRA: {
      const r = await axios.get(`${String(config.url || '')}/rest/api/2/myself`, { auth: { username: String(config.username || ''), password: String(config.password || '') }, timeout: 10000 });
      return { success: r.status >= 200 && r.status < 300, status: r.status };
    }
    default:
      return { success: false, message: '未支持的集成类型' };
  }
};

// ==================== 控制器方法 ====================

const getAll = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  try {
    const { results } = await dataManagementService.queryData(INTEGRATIONS_TYPE, { filters: { createdBy: userId } }, {});
    const userIntegrations = results.map(record => mapIntegrationRecord(record)).filter(i => i.enabled);
    return res.success({ integrations: userIntegrations, supportedTypes: Object.values(IntegrationType) });
  } catch (error) {
    Logger.error('获取集成配置失败', { error, userId });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取集成配置失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const create = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const { name, type, config } = req.body;
  if (!name || !type || !config) return res.error(StandardErrorCode.INVALID_INPUT, '名称、类型和配置都是必需的', undefined, 400);
  if (!Object.values(IntegrationType).includes(type)) return res.error(StandardErrorCode.INVALID_INPUT, '不支持的集成类型', { supportedTypes: Object.values(IntegrationType) }, 400);
  try {
    const newData: Integration = { id: '', name, type: type as IntegrationType, config, enabled: true, createdAt: new Date(), updatedAt: new Date(), status: 'active' };
    const { id } = await dataManagementService.createData(INTEGRATIONS_TYPE, { ...newData, createdBy: userId } as unknown as Record<string, unknown>, { userId, source: 'integrations' });
    Logger.info('创建集成配置', { integrationId: id, userId, name, type });
    return res.success({ ...newData, id }, '集成配置创建成功', 201);
  } catch (error) {
    Logger.error('创建集成配置失败', { error, userId, name, type });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '创建集成配置失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const update = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { name, config, enabled } = req.body;
  try {
    await dataManagementService.readData(INTEGRATIONS_TYPE, id);
    const updated = await dataManagementService.updateData(INTEGRATIONS_TYPE, id, { ...(name ? { name } : {}), ...(config ? { config } : {}), ...(enabled !== undefined ? { enabled } : {}), updatedAt: new Date() }, { userId });
    Logger.info('更新集成配置', { integrationId: id, userId, changes: { name, enabled } });
    return res.success(mapIntegrationRecord(updated as { id: string; data: Record<string, unknown> }), '集成配置更新成功');
  } catch (error) {
    if (error instanceof Error && error.message.includes('数据记录不存在')) return res.error(StandardErrorCode.NOT_FOUND, '集成配置不存在', undefined, 404);
    Logger.error('更新集成配置失败', { error, integrationId: id, userId });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '更新集成配置失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const remove = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    const integration = await fetchIntegrationById(id);
    await dataManagementService.deleteData(INTEGRATIONS_TYPE, id, { userId });
    Logger.info('删除集成配置', { integrationId: id, userId, name: integration.name });
    return res.success(null, '集成配置删除成功');
  } catch (error) {
    if (error instanceof Error && error.message.includes('数据记录不存在')) return res.error(StandardErrorCode.NOT_FOUND, '集成配置不存在', undefined, 404);
    Logger.error('删除集成配置失败', { error, integrationId: id, userId });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '删除集成配置失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const test = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { id } = req.params;
  const userId = getUserId(req);
  try {
    const integration = await fetchIntegrationById(id);
    const testResult = await testIntegrationConnection(integration.type, integration.config);
    const updated = await dataManagementService.updateData(INTEGRATIONS_TYPE, id, { lastTriggered: new Date(), status: testResult.success ? 'active' : 'error', updatedAt: new Date() }, { userId });
    await recordIntegrationLog(id, 'info', '集成连接测试', { integrationType: integration.type, success: testResult.success, status: testResult.status });
    Logger.info('测试集成连接', { integrationId: id, userId, type: integration.type, success: testResult.success });
    return res.success({ ...testResult, integration: mapIntegrationRecord(updated as { id: string; data: Record<string, unknown> }) }, testResult.success ? '集成连接测试成功' : '集成连接测试失败');
  } catch (error) {
    if (error instanceof Error && error.message.includes('数据记录不存在')) return res.error(StandardErrorCode.NOT_FOUND, '集成配置不存在', undefined, 404);
    Logger.error('测试集成连接失败', { error, integrationId: id, userId });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '测试集成连接失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const trigger = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { id } = req.params;
  const userId = getUserId(req);
  const { eventType, payload } = req.body;
  try {
    const integration = await fetchIntegrationById(id);
    if (!integration.enabled) return res.error(StandardErrorCode.INVALID_INPUT, '集成已禁用，无法触发', undefined, 400);
    const triggerResult = await triggerIntegration(integration.type, integration.config, eventType, payload);
    await dataManagementService.updateData(INTEGRATIONS_TYPE, id, { lastTriggered: new Date(), updatedAt: new Date() }, { userId });
    await recordIntegrationLog(id, triggerResult.success ? 'info' : 'error', '手动触发集成', { integrationType: integration.type, eventType, success: triggerResult.success });
    Logger.info('手动触发集成', { integrationId: id, userId, type: integration.type, eventType, success: triggerResult.success });
    return res.success(triggerResult, triggerResult.success ? '集成触发成功' : '集成触发失败');
  } catch (error) {
    if (error instanceof Error && error.message.includes('数据记录不存在')) return res.error(StandardErrorCode.NOT_FOUND, '集成配置不存在', undefined, 404);
    Logger.error('手动触发集成失败', { error, integrationId: id, userId, eventType });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '手动触发集成失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const getLogs = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { id } = req.params;
  const { limit = 50, level = 'info' } = req.query;
  try {
    await fetchIntegrationById(id);
    const { results } = await dataManagementService.queryData(INTEGRATION_LOGS_TYPE, { filters: { integrationId: id, ...(level ? { level: level as string } : {}) }, sort: { field: 'createdAt', direction: 'desc' } }, { page: 1, limit: parseInt(limit as string) });
    const logs = results.map(record => ({ id: record.id, ...(record.data as Record<string, unknown>) }));
    return res.success(logs);
  } catch (error) {
    if (error instanceof Error && error.message.includes('数据记录不存在')) return res.error(StandardErrorCode.NOT_FOUND, '集成配置不存在', undefined, 404);
    Logger.error('获取集成日志失败', { error, integrationId: id });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取集成日志失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const getTypes = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const typeDefinitions = {
      [IntegrationType.WEBHOOK]: { name: 'Webhook', description: 'HTTP webhook集成', configSchema: { url: 'string (required)', secret: 'string (required)', events: 'array (required)', headers: 'object (optional)' } },
      [IntegrationType.SLACK]: { name: 'Slack', description: 'Slack消息集成', configSchema: { webhookUrl: 'string (required)', channel: 'string (required)', botToken: 'string (required)', username: 'string (required)', iconEmoji: 'string (optional)' } },
      [IntegrationType.EMAIL]: { name: 'Email', description: '邮件集成', configSchema: { smtp: { host: 'string (required)', port: 'number (required)', secure: 'boolean (required)', auth: { user: 'string (required)', pass: 'string (required)' } }, from: 'string (required)', to: 'array (required)', subject: 'string (required)', template: 'string (required)' } },
      [IntegrationType.JENKINS]: { name: 'Jenkins', description: 'Jenkins 集成', configSchema: { url: 'string (required)', username: 'string (required)', password: 'string (required)', jobName: 'string (required)', buildParameters: 'object (optional)' } },
      [IntegrationType.GITHUB]: { name: 'GitHub', description: 'GitHub Actions集成', configSchema: { token: 'string (required)', repository: 'string (required)', owner: 'string (required)', events: 'array (required)', branch: 'string (required)' } },
      [IntegrationType.GITLAB]: { name: 'GitLab', description: 'GitLab 集成', configSchema: { url: 'string (required)', token: 'string (required)', projectId: 'string (required)', events: 'array (required)' } },
      [IntegrationType.JIRA]: { name: 'JIRA', description: 'JIRA 集成', configSchema: { url: 'string (required)', username: 'string (required)', password: 'string (required)', projectKey: 'string (required)', issueTypes: 'array (required)', priority: 'array (required)' } },
      [IntegrationType.TEAMS]: { name: 'Microsoft Teams', description: 'Teams 集成', configSchema: { webhookUrl: 'string (required)', title: 'string (required)', summary: 'string (required)', color: 'string (required)', activity: 'string (required)' } },
    };
    return res.success(typeDefinitions);
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取集成类型失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const getById = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { id } = req.params;
  try {
    const integration = await fetchIntegrationById(id);
    return res.success(integration);
  } catch (error) {
    if (error instanceof Error && error.message.includes('数据记录不存在')) return res.error(StandardErrorCode.NOT_FOUND, '集成配置不存在', undefined, 404);
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取集成详情失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const enable = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { id } = req.params;
  const userId = getUserId(req);
  try {
    const integration = await fetchIntegrationById(id);
    const updated = await dataManagementService.updateData(INTEGRATIONS_TYPE, id, { enabled: true, status: 'active', updatedAt: new Date() }, { userId });
    Logger.info('启用集成', { integrationId: id, userId, name: integration.name });
    return res.success(mapIntegrationRecord(updated as { id: string; data: Record<string, unknown> }), '集成已启用');
  } catch (error) {
    if (error instanceof Error && error.message.includes('数据记录不存在')) return res.error(StandardErrorCode.NOT_FOUND, '集成配置不存在', undefined, 404);
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '启用集成失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const disable = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { id } = req.params;
  const userId = getUserId(req);
  try {
    const integration = await fetchIntegrationById(id);
    const updated = await dataManagementService.updateData(INTEGRATIONS_TYPE, id, { enabled: false, status: 'inactive', updatedAt: new Date() }, { userId });
    Logger.info('禁用集成', { integrationId: id, userId, name: integration.name });
    return res.success(mapIntegrationRecord(updated as { id: string; data: Record<string, unknown> }), '集成已禁用');
  } catch (error) {
    if (error instanceof Error && error.message.includes('数据记录不存在')) return res.error(StandardErrorCode.NOT_FOUND, '集成配置不存在', undefined, 404);
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '禁用集成失败', error instanceof Error ? error.message : String(error), 500);
  }
};

// 初始化数据服务
dataManagementService.initialize().catch(error => {
  console.error('集成数据服务初始化失败:', error);
});

export default {
  getAll, create, update, remove, test, trigger, getLogs, getTypes, getById, enable, disable,
};
