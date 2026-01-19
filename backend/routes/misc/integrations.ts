/**
 * 集成路由
 */

import express from 'express';
import { authMiddleware } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { cicdIntegrationService } from '../../services/integration/CICDIntegrationService';
import Logger from '../../utils/logger';

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

interface WebhookConfig {
  url: string;
  secret: string;
  events: string[];
  headers?: Record<string, string>;
}

interface SlackConfig {
  webhookUrl: string;
  channel: string;
  botToken: string;
  username: string;
  iconEmoji?: string;
}

interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: string;
  to: string[];
  subject: string;
  template: string;
}

interface JenkinsConfig {
  url: string;
  username: string;
  password: string;
  jobName: string;
  buildParameters?: Record<string, unknown>;
}

interface GitHubConfig {
  token: string;
  repository: string;
  owner: string;
  events: string[];
  branch: string;
}

interface GitLabConfig {
  url: string;
  token: string;
  projectId: string;
  events: string[];
}

interface JiraConfig {
  url: string;
  username: string;
  password: string;
  projectKey: string;
  issueTypes: string[];
  priority: string[];
}

interface TeamsConfig {
  webhookUrl: string;
  title: string;
  summary: string;
  color: string;
  activity: string;
}

const router = express.Router();

// 模拟数据库存储
const integrations: Integration[] = [
  {
    id: '1',
    name: 'Slack通知',
    type: IntegrationType.SLACK,
    config: {
      webhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/bot',
      channel: '#general',
      botToken: 'xoxb-0000000000-0000-0000-000000000000000',
      username: 'TestBot',
      iconEmoji: ':robot_face:',
    },
    enabled: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    status: 'active',
  },
  {
    id: '2',
    name: '邮件通知',
    type: IntegrationType.EMAIL,
    config: {
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: true,
        auth: {
          user: 'test@example.com',
          pass: 'app_password',
        },
      },
      from: 'noreply@testweb.com',
      to: ['admin@testweb.com'],
      subject: 'TestWeb 通知',
      template: 'default',
    },
    enabled: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    status: 'inactive',
  },
  {
    id: '3',
    name: 'GitHub Actions',
    type: IntegrationType.GITHUB,
    config: {
      token: 'ghp_000000000000000000000',
      repository: 'testweb/testweb',
      owner: 'testweb',
      events: ['push', 'pull_request'],
      branch: 'main',
    },
    enabled: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    status: 'active',
  },
];

/**
 * GET /api/misc/integrations
 * 获取所有集成配置
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;

    try {
      // 在实际应用中，这里应该从数据库获取用户特定的集成配置
      const userIntegrations = integrations.filter(integration => integration.enabled);

      res.json({
        success: true,
        data: {
          integrations: userIntegrations,
          supportedTypes: Object.values(IntegrationType),
        },
      });
    } catch (error) {
      Logger.error('获取集成配置失败', { error, userId });

      res.status(500).json({
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
    const userId = (req as any).user.id;
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
      const newIntegration: Integration = {
        id: Date.now().toString(),
        name,
        type: type as IntegrationType,
        config,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
      };

      integrations.push(newIntegration);

      Logger.info('创建集成配置', { integrationId: newIntegration.id, userId, name, type });

      res.status(201).json({
        success: true,
        message: '集成配置创建成功',
        data: newIntegration,
      });
    } catch (error) {
      Logger.error('创建集成配置失败', { error, userId, name, type });

      res.status(500).json({
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
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { name, config, enabled } = req.body;

    try {
      const integrationIndex = integrations.findIndex(integration => integration.id === id);

      if (integrationIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '集成配置不存在',
        });
      }

      if (name) integrations[integrationIndex].name = name;
      if (config) integrations[integrationIndex].config = config;
      if (enabled !== undefined) integrations[integrationIndex].enabled = enabled;
      integrations[integrationIndex].updatedAt = new Date();

      Logger.info('更新集成配置', { integrationId: id, userId, changes: { name, enabled } });

      res.json({
        success: true,
        message: '集成配置更新成功',
        data: integrations[integrationIndex],
      });
    } catch (error) {
      Logger.error('更新集成配置失败', { error, integrationId: id, userId });

      res.status(500).json({
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
    const userId = (req as any).user.id;
    const { id } = req.params;

    try {
      const integrationIndex = integrations.findIndex(integration => integration.id === id);

      if (integrationIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '集成配置不存在',
        });
      }

      const deletedIntegration = integrations.splice(integrationIndex, 1)[0];

      Logger.info('删除集成配置', { integrationId: id, userId, name: deletedIntegration.name });

      res.json({
        success: true,
        message: '集成配置删除成功',
      });
    } catch (error) {
      Logger.error('删除集成配置失败', { error, integrationId: id, userId });

      res.status(500).json({
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
    const userId = (req as any).user.id;

    try {
      const integration = integrations.find(integration => integration.id === id);

      if (!integration) {
        return res.status(404).json({
          success: false,
          message: '集成配置不存在',
        });
      }

      // 模拟测试连接
      const testResult = await cicdIntegrationService.testIntegration(
        integration.type,
        integration.config
      );

      // 更新最后触发时间和状态
      integration.lastTriggered = new Date();
      integration.status = testResult.success ? 'active' : 'error';

      Logger.info('测试集成连接', {
        integrationId: id,
        userId,
        type: integration.type,
        success: testResult.success,
      });

      res.json({
        success: testResult.success,
        message: testResult.success ? '集成连接测试成功' : '集成连接测试失败',
        data: testResult,
      });
    } catch (error) {
      Logger.error('测试集成连接失败', { error, integrationId: id, userId });

      res.status(500).json({
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
    const userId = (req as any).user.id;
    const { eventType, payload } = req.body;

    try {
      const integration = integrations.find(integration => integration.id === id);

      if (!integration) {
        return res.status(404).json({
          success: false,
          message: '集成配置不存在',
        });
      }

      if (!integration.enabled) {
        return res.status(400).json({
          success: false,
          message: '集成已禁用，无法触发',
        });
      }

      // 触发集成
      const triggerResult = await cicdIntegrationService.triggerIntegration(
        integration.type,
        integration.config,
        eventType,
        payload
      );

      // 更新最后触发时间
      integration.lastTriggered = new Date();

      Logger.info('手动触发集成', {
        integrationId: id,
        userId,
        type: integration.type,
        eventType,
        success: triggerResult.success,
      });

      res.json({
        success: triggerResult.success,
        message: triggerResult.success ? '集成触发成功' : '集成触发失败',
        data: triggerResult,
      });
    } catch (error) {
      Logger.error('手动触发集成失败', { error, integrationId: id, userId, eventType });

      res.status(500).json({
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
      const integration = integrations.find(integration => integration.id === id);

      if (!integration) {
        return res.status(404).json({
          success: false,
          message: '集成配置不存在',
        });
      }

      // 模拟获取日志
      const logs = await cicdIntegrationService.getIntegrationLogs(id, {
        limit: parseInt(limit as string),
        level: level as string,
      });

      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      Logger.error('获取集成日志失败', { error, integrationId: id });

      res.status(500).json({
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

      res.json({
        success: true,
        data: typeDefinitions,
      });
    } catch (error) {
      res.status(500).json({
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
      const integration = integrations.find(integration => integration.id === id);

      if (!integration) {
        return res.status(404).json({
          success: false,
          message: '集成配置不存在',
        });
      }

      res.json({
        success: true,
        data: integration,
      });
    } catch (error) {
      res.status(500).json({
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
    const userId = (req as any).user.id;

    try {
      const integrationIndex = integrations.findIndex(integration => integration.id === id);

      if (integrationIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '集成配置不存在',
        });
      }

      integrations[integrationIndex].enabled = true;
      integrations[integrationIndex].updatedAt = new Date();
      integrations[integrationIndex].status = 'active';

      Logger.info('启用集成', {
        integrationId: id,
        userId,
        name: integrations[integrationIndex].name,
      });

      res.json({
        success: true,
        message: '集成已启用',
        data: integrations[integrationIndex],
      });
    } catch (error) {
      res.status(500).json({
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
    const userId = (req as any).user.id;

    try {
      const integrationIndex = integrations.findIndex(integration => integration.id === id);

      if (integrationIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '集成配置不存在',
        });
      }

      integrations[integrationIndex].enabled = false;
      integrations[integrationIndex].updatedAt = new Date();
      integrations[integrationIndex].status = 'inactive';

      Logger.info('禁用集成', {
        integrationId: id,
        userId,
        name: integrations[integrationIndex].name,
      });

      res.json({
        success: true,
        message: '集成已禁用',
        data: integrations[integrationIndex],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '禁用集成失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

export default router;
