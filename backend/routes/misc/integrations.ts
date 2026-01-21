/**
 * 集成路由
 */

import axios from 'axios';
import express from 'express';
import nodemailer from 'nodemailer';
import { asyncHandler } from '../../middleware/errorHandler';
import { dataManagementService } from '../../services/data/DataManagementService';
import Logger from '../../utils/logger';
const { authMiddleware } = require('../../middleware/auth');

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

// 这里保留的集成配置类型可在后续校验中补充

const router = express.Router();

const triggerIntegration = async (
  type: IntegrationType,
  config: Record<string, unknown>,
  eventType: string,
  payload: unknown
) => {
  switch (type) {
    case IntegrationType.WEBHOOK: {
      const url = String(config.url || config.webhookUrl || '');
      const response = await axios.post(url, payload, { timeout: 10000 });
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    case IntegrationType.SLACK: {
      const url = String(config.webhookUrl || '');
      const response = await axios.post(
        url,
        {
          text: (payload as { text?: string }).text || 'TestWeb 集成触发',
          username: config.username || 'TestWeb',
          channel: config.channel,
        },
        { timeout: 10000 }
      );
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    case IntegrationType.TEAMS: {
      const url = String(config.webhookUrl || '');
      const response = await axios.post(
        url,
        {
          title: (payload as { title?: string }).title || 'TestWeb 集成触发',
          text: (payload as { text?: string }).text || 'TestWeb 集成事件通知',
        },
        { timeout: 10000 }
      );
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    case IntegrationType.EMAIL: {
      const smtp = config.smtp as {
        host: string;
        port: number;
        secure: boolean;
        auth?: { user: string; pass: string };
      };
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: smtp.auth,
      });
      const info = await transporter.sendMail({
        from: config.from as string,
        to: (config.to as string[]) || [],
        subject: (payload as { subject?: string }).subject || (config.subject as string),
        text: (payload as { text?: string }).text || 'TestWeb 集成触发通知',
      });
      return { success: true, messageId: info.messageId };
    }
    case IntegrationType.JENKINS: {
      const serverUrl = String(config.serverUrl || '');
      const jobName = String(config.jobName || '');
      const username = String(config.username || '');
      const apiToken = String(config.apiToken || '');
      const auth = { username, password: apiToken };
      const response = await axios.post(
        `${serverUrl}/job/${jobName}/build`,
        {},
        { auth, timeout: 10000 }
      );
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    case IntegrationType.GITHUB: {
      const owner = String(config.owner || '');
      const repo = String(config.repository || config.repo || '');
      const token = String(config.token || '');
      const response = await axios.post(
        `https://api.github.com/repos/${owner}/${repo}/dispatches`,
        {
          event_type: eventType || 'testweb.trigger',
          client_payload: payload || {},
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
          },
          timeout: 10000,
        }
      );
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    case IntegrationType.GITLAB: {
      const serverUrl = String(config.serverUrl || 'https://gitlab.com');
      const projectId = String(config.projectId || '');
      const token = String(config.token || '');
      const ref = String(config.branch || 'main');
      const response = await axios.post(
        `${serverUrl}/api/v4/projects/${encodeURIComponent(projectId)}/trigger/pipeline`,
        null,
        {
          params: { ref, token },
          timeout: 10000,
        }
      );
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    case IntegrationType.JIRA: {
      const baseUrl = String(config.url || '');
      const username = String(config.username || '');
      const password = String(config.password || '');
      const response = await axios.post(
        `${baseUrl}/rest/api/2/issue`,
        payload || {
          fields: {
            project: { key: config.projectKey || 'TEST' },
            summary: 'TestWeb 集成触发',
            description: '由 TestWeb 触发的 Jira 集成事件',
            issuetype: { name: 'Task' },
          },
        },
        { auth: { username, password }, timeout: 10000 }
      );
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    default:
      return { success: false, message: '未支持的集成类型' };
  }
};

const INTEGRATION_LOGS_TYPE = 'misc_integration_logs';

const recordIntegrationLog = async (
  integrationId: string,
  level: 'info' | 'warn' | 'error',
  message: string,
  details: Record<string, unknown>
) => {
  await dataManagementService.createData(
    INTEGRATION_LOGS_TYPE,
    {
      integrationId,
      level,
      message,
      details,
      createdAt: new Date(),
    },
    { source: 'integrations' }
  );
};

const getUserId = (req: express.Request): string => {
  const userId = (req as { user?: { id?: string } }).user?.id;
  if (!userId) {
    throw new Error('用户未认证');
  }
  return userId;
};
const INTEGRATIONS_TYPE = 'misc_integrations';

dataManagementService.initialize().catch(error => {
  console.error('集成数据服务初始化失败:', error);
});

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

const testIntegration = async (type: IntegrationType, config: Record<string, unknown>) => {
  switch (type) {
    case IntegrationType.WEBHOOK: {
      const url = String(config.url || config.webhookUrl || '');
      const response = await axios.post(url, { test: true }, { timeout: 10000 });
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    case IntegrationType.SLACK: {
      const url = String(config.webhookUrl || '');
      const response = await axios.post(url, { text: 'TestWeb 集成连接测试' }, { timeout: 10000 });
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    case IntegrationType.TEAMS: {
      const url = String(config.webhookUrl || '');
      const response = await axios.post(
        url,
        { title: 'TestWeb 集成连接测试', text: 'TestWeb 集成连接测试' },
        { timeout: 10000 }
      );
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    case IntegrationType.EMAIL: {
      const smtp = config.smtp as {
        host: string;
        port: number;
        secure: boolean;
        auth?: { user: string; pass: string };
      };
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: smtp.auth,
      });
      const info = await transporter.sendMail({
        from: config.from as string,
        to: (config.to as string[]) || [],
        subject: 'TestWeb 集成连接测试',
        text: 'TestWeb 集成连接测试',
      });
      return { success: true, messageId: info.messageId };
    }
    case IntegrationType.JENKINS: {
      const serverUrl = String(config.serverUrl || '');
      const jobName = String(config.jobName || '');
      const username = String(config.username || '');
      const apiToken = String(config.apiToken || '');
      const response = await axios.get(`${serverUrl}/job/${jobName}/api/json`, {
        auth: { username, password: apiToken },
        timeout: 10000,
      });
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    case IntegrationType.GITHUB: {
      const owner = String(config.owner || '');
      const repo = String(config.repository || config.repo || '');
      const token = String(config.token || '');
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    case IntegrationType.GITLAB: {
      const serverUrl = String(config.serverUrl || 'https://gitlab.com');
      const projectId = String(config.projectId || '');
      const token = String(config.token || '');
      const response = await axios.get(
        `${serverUrl}/api/v4/projects/${encodeURIComponent(projectId)}`,
        { headers: { 'PRIVATE-TOKEN': token }, timeout: 10000 }
      );
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    case IntegrationType.JIRA: {
      const baseUrl = String(config.url || '');
      const username = String(config.username || '');
      const password = String(config.password || '');
      const response = await axios.get(`${baseUrl}/rest/api/2/myself`, {
        auth: { username, password },
        timeout: 10000,
      });
      return { success: response.status >= 200 && response.status < 300, status: response.status };
    }
    default:
      return { success: false, message: '未支持的集成类型' };
  }
};

/**
 * GET /api/misc/integrations
 * 获取所有集成配置
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = getUserId(req);

    try {
      const { results } = await dataManagementService.queryData(
        INTEGRATIONS_TYPE,
        { filters: { createdBy: userId } },
        {}
      );

      const userIntegrations = results
        .map(record => mapIntegrationRecord(record))
        .filter(integration => integration.enabled);

      return res.json({
        success: true,
        data: {
          integrations: userIntegrations,
          supportedTypes: Object.values(IntegrationType),
        },
      });
    } catch (error) {
      Logger.error('获取集成配置失败', { error, userId });

      return res.status(500).json({
        success: false,
        message: '获取集成配置失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/misc/integrations
 * 创建集成配置
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = getUserId(req);
    const { name, type, config } = req.body;

    if (!name || !type || !config) {
      return res.status(400).json({
        success: false,
        message: '名称、类型和配置都是必需的',
      });
    }

    if (!Object.values(IntegrationType).includes(type)) {
      return res.status(400).json({
        success: false,
        message: '不支持的集成类型',
        supportedTypes: Object.values(IntegrationType),
      });
    }

    try {
      const newIntegrationData: Integration = {
        id: '',
        name,
        type: type as IntegrationType,
        config,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
      };

      const { id } = await dataManagementService.createData(
        INTEGRATIONS_TYPE,
        {
          ...newIntegrationData,
          createdBy: userId,
        } as unknown as Record<string, unknown>,
        { userId, source: 'integrations' }
      );

      Logger.info('创建集成配置', { integrationId: id, userId, name, type });

      return res.status(201).json({
        success: true,
        message: '集成配置创建成功',
        data: { ...newIntegrationData, id },
      });
    } catch (error) {
      Logger.error('创建集成配置失败', { error, userId, name, type });

      return res.status(500).json({
        success: false,
        message: '创建集成配置失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * PUT /api/misc/integrations/:id
 * 更新集成配置
 */
router.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = getUserId(req);
    const { id } = req.params;
    const { name, config, enabled } = req.body;

    try {
      await dataManagementService.readData(INTEGRATIONS_TYPE, id);

      const updatedIntegration = await dataManagementService.updateData(
        INTEGRATIONS_TYPE,
        id,
        {
          ...(name ? { name } : {}),
          ...(config ? { config } : {}),
          ...(enabled !== undefined ? { enabled } : {}),
          updatedAt: new Date(),
        },
        { userId }
      );

      Logger.info('更新集成配置', { integrationId: id, userId, changes: { name, enabled } });

      return res.json({
        success: true,
        message: '集成配置更新成功',
        data: mapIntegrationRecord(
          updatedIntegration as { id: string; data: Record<string, unknown> }
        ),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.status(404).json({
          success: false,
          message: '集成配置不存在',
        });
      }

      Logger.error('更新集成配置失败', { error, integrationId: id, userId });

      return res.status(500).json({
        success: false,
        message: '更新集成配置失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * DELETE /api/misc/integrations/:id
 * 删除集成配置
 */
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    try {
      const integration = await fetchIntegrationById(id);
      await dataManagementService.deleteData(INTEGRATIONS_TYPE, id, { userId });

      Logger.info('删除集成配置', { integrationId: id, userId, name: integration.name });

      return res.json({
        success: true,
        message: '集成配置删除成功',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.status(404).json({
          success: false,
          message: '集成配置不存在',
        });
      }

      Logger.error('删除集成配置失败', { error, integrationId: id, userId });

      return res.status(500).json({
        success: false,
        message: '删除集成配置失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/misc/integrations/:id/test
 * 测试集成连接
 */
router.post(
  '/:id/test',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const userId = getUserId(req);

    try {
      const integration = await fetchIntegrationById(id);

      const testResult = await testIntegration(integration.type, integration.config);

      const updatedIntegration = await dataManagementService.updateData(
        INTEGRATIONS_TYPE,
        id,
        {
          lastTriggered: new Date(),
          status: testResult.success ? 'active' : 'error',
          updatedAt: new Date(),
        },
        { userId }
      );

      await recordIntegrationLog(id, 'info', '集成连接测试', {
        integrationType: integration.type,
        success: testResult.success,
        status: testResult.status,
      });

      Logger.info('测试集成连接', {
        integrationId: id,
        userId,
        type: integration.type,
        success: testResult.success,
      });

      return res.json({
        success: testResult.success,
        message: testResult.success ? '集成连接测试成功' : '集成连接测试失败',
        data: {
          ...testResult,
          integration: mapIntegrationRecord(
            updatedIntegration as { id: string; data: Record<string, unknown> }
          ),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.status(404).json({
          success: false,
          message: '集成配置不存在',
        });
      }

      Logger.error('测试集成连接失败', { error, integrationId: id, userId });

      return res.status(500).json({
        success: false,
        message: '测试集成连接失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/misc/integrations/:id/trigger
 * 手动触发集成
 */
router.post(
  '/:id/trigger',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const userId = getUserId(req);
    const { eventType, payload } = req.body;

    try {
      const integration = await fetchIntegrationById(id);

      if (!integration.enabled) {
        return res.status(400).json({
          success: false,
          message: '集成已禁用，无法触发',
        });
      }

      const triggerResult = await triggerIntegration(
        integration.type,
        integration.config,
        eventType,
        payload
      );

      await dataManagementService.updateData(
        INTEGRATIONS_TYPE,
        id,
        {
          lastTriggered: new Date(),
          updatedAt: new Date(),
        },
        { userId }
      );

      await recordIntegrationLog(id, triggerResult.success ? 'info' : 'error', '手动触发集成', {
        integrationType: integration.type,
        eventType,
        success: triggerResult.success,
      });

      Logger.info('手动触发集成', {
        integrationId: id,
        userId,
        type: integration.type,
        eventType,
        success: triggerResult.success,
      });

      return res.json({
        success: triggerResult.success,
        message: triggerResult.success ? '集成触发成功' : '集成触发失败',
        data: triggerResult,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.status(404).json({
          success: false,
          message: '集成配置不存在',
        });
      }

      Logger.error('手动触发集成失败', { error, integrationId: id, userId, eventType });

      return res.status(500).json({
        success: false,
        message: '手动触发集成失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/misc/integrations/:id/logs
 * 获取集成日志
 */
router.get(
  '/:id/logs',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { limit = 50, level = 'info' } = req.query;

    try {
      await fetchIntegrationById(id);

      const { results } = await dataManagementService.queryData(
        INTEGRATION_LOGS_TYPE,
        {
          filters: {
            integrationId: id,
            ...(level ? { level: level as string } : {}),
          },
          sort: { field: 'createdAt', direction: 'desc' },
        },
        { page: 1, limit: parseInt(limit as string) }
      );
      const logs = results.map(record => ({
        id: record.id,
        ...(record.data as Record<string, unknown>),
      }));

      return res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.status(404).json({
          success: false,
          message: '集成配置不存在',
        });
      }

      Logger.error('获取集成日志失败', { error, integrationId: id });

      return res.status(500).json({
        success: false,
        message: '获取集成日志失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/misc/integrations/types
 * 获取支持的集成类型
 */
router.get(
  '/types',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const typeDefinitions = {
        [IntegrationType.WEBHOOK]: {
          name: 'Webhook',
          description: 'HTTP webhook集成',
          configSchema: {
            url: 'string (required)',
            secret: 'string (required)',
            events: 'array (required)',
            headers: 'object (optional)',
          },
        },
        [IntegrationType.SLACK]: {
          name: 'Slack',
          description: 'Slack消息集成',
          configSchema: {
            webhookUrl: 'string (required)',
            channel: 'string (required)',
            botToken: 'string (required)',
            username: 'string (required)',
            iconEmoji: 'string (optional)',
          },
        },
        [IntegrationType.EMAIL]: {
          name: 'Email',
          description: '邮件集成',
          configSchema: {
            smtp: {
              host: 'string (required)',
              port: 'number (required)',
              secure: 'boolean (required)',
              auth: {
                user: 'string (required)',
                pass: 'string (required)',
              },
            },
            from: 'string (required)',
            to: 'array (required)',
            subject: 'string (required)',
            template: 'string (required)',
          },
        },
        [IntegrationType.JENKINS]: {
          name: 'Jenkins',
          description: 'Jenkins CI/CD集成',
          configSchema: {
            url: 'string (required)',
            username: 'string (required)',
            password: 'string (required)',
            jobName: 'string (required)',
            buildParameters: 'object (optional)',
          },
        },
        [IntegrationType.GITHUB]: {
          name: 'GitHub',
          description: 'GitHub Actions集成',
          configSchema: {
            token: 'string (required)',
            repository: 'string (required)',
            owner: 'string (required)',
            events: 'array (required)',
            branch: 'string (required)',
          },
        },
        [IntegrationType.GITLAB]: {
          name: 'GitLab',
          description: 'GitLab CI/CD集成',
          configSchema: {
            url: 'string (required)',
            token: 'string (required)',
            projectId: 'string (required)',
            events: 'array (required)',
          },
        },
        [IntegrationType.JIRA]: {
          name: 'JIRA',
          description: 'JIRA 集成',
          configSchema: {
            url: 'string (required)',
            username: 'string (required)',
            password: 'string (required)',
            projectKey: 'string (required)',
            issueTypes: 'array (required)',
            priority: 'array (required)',
          },
        },
        [IntegrationType.TEAMS]: {
          name: 'Microsoft Teams',
          description: 'Teams 集成',
          configSchema: {
            webhookUrl: 'string (required)',
            title: 'string (required)',
            summary: 'string (required)',
            color: 'string (required)',
            activity: 'string (required)',
          },
        },
      };

      return res.json({
        success: true,
        data: typeDefinitions,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: '获取集成类型失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/misc/integrations/:id
 * 获取单个集成详情
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    try {
      const integration = await fetchIntegrationById(id);

      return res.json({
        success: true,
        data: integration,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.status(404).json({
          success: false,
          message: '集成配置不存在',
        });
      }

      return res.status(500).json({
        success: false,
        message: '获取集成详情失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/misc/integrations/:id/enable
 * 启用集成
 */
router.post(
  '/:id/enable',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const userId = getUserId(req);

    try {
      const integration = await fetchIntegrationById(id);
      const updatedIntegration = await dataManagementService.updateData(
        INTEGRATIONS_TYPE,
        id,
        {
          enabled: true,
          status: 'active',
          updatedAt: new Date(),
        },
        { userId }
      );

      Logger.info('启用集成', {
        integrationId: id,
        userId,
        name: integration.name,
      });

      return res.json({
        success: true,
        message: '集成已启用',
        data: mapIntegrationRecord(
          updatedIntegration as { id: string; data: Record<string, unknown> }
        ),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.status(404).json({
          success: false,
          message: '集成配置不存在',
        });
      }

      return res.status(500).json({
        success: false,
        message: '启用集成失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/misc/integrations/:id/disable
 * 禁用集成
 */
router.post(
  '/:id/disable',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const userId = getUserId(req);

    try {
      const integration = await fetchIntegrationById(id);
      const updatedIntegration = await dataManagementService.updateData(
        INTEGRATIONS_TYPE,
        id,
        {
          enabled: false,
          status: 'inactive',
          updatedAt: new Date(),
        },
        { userId }
      );

      Logger.info('禁用集成', {
        integrationId: id,
        userId,
        name: integration.name,
      });

      return res.json({
        success: true,
        message: '集成已禁用',
        data: mapIntegrationRecord(
          updatedIntegration as { id: string; data: Record<string, unknown> }
        ),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('数据记录不存在')) {
        return res.status(404).json({
          success: false,
          message: '集成配置不存在',
        });
      }

      return res.status(500).json({
        success: false,
        message: '禁用集成失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

export default router;
