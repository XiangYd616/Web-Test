/**
 * 集成路由
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const { cicdIntegrationService } = require('../services/integration/CICDIntegrationService');

const router = express.Router();

// 支持的集成类型
const INTEGRATION_TYPES = {
  WEBHOOK: 'webhook',
  SLACK: 'slack',
  EMAIL: 'email',
  JENKINS: 'jenkins',
  GITHUB: 'github',
  GITLAB: 'gitlab',
  JIRA: 'jira',
  TEAMS: 'teams'
};

// 模拟数据库存储
let integrations = [
  {
    id: '1',
    name: 'Slack通知',
    type: INTEGRATION_TYPES.SLACK,
    config: {
      webhookUrl: 'https://hooks.slack.com/services/...',
      channel: '#testing',
      username: 'TestBot'
    },
    enabled: true,
    createdAt: new Date().toISOString(),
    lastUsed: null
  },
  {
    id: '2',
    name: 'Jenkins CI/CD',
    type: INTEGRATION_TYPES.JENKINS,
    config: {
      serverUrl: 'https://jenkins.example.com',
      jobName: 'website-test',
      token: 'jenkins-api-token'
    },
    enabled: false,
    createdAt: new Date().toISOString(),
    lastUsed: null
  }
];

/**
 * 获取集成列表
 * GET /api/integrations
 */
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { type, enabled } = req.query;

    let filteredIntegrations = [...integrations];

    // 按类型过滤
    if (type) {
      filteredIntegrations = filteredIntegrations.filter(integration =>
        integration.type === type
      );
    }

    // 按启用状态过滤
    if (enabled !== undefined) {
      const isEnabled = enabled === 'true';
      filteredIntegrations = filteredIntegrations.filter(integration =>
        integration.enabled === isEnabled
      );
    }

    res.success(filteredIntegrations);
  } catch (error) {
    Logger.error('获取集成列表失败', error);
    res.serverError('获取集成列表失败');
  }
}));

/**
 * 创建集成
 * POST /api/integrations
 */
router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { name, type, config, enabled = true } = req.body;

    // 验证必填字段
    if (!name || !type || !config) {
      
        return res.validationError([], '名称、类型和配置是必填的');
    }

    // 验证集成类型
    if (!Object.values(INTEGRATION_TYPES).includes(type)) {
      return res.validationError([], '不支持的集成类型');
    }

    // 验证配置
    const validationResult = validateIntegrationConfig(type, config);
    if (!validationResult.valid) {
      
        return res.validationError([], '配置验证失败');
    }

    // 创建新集成
    const newIntegration = {
      id: Date.now().toString(),
      name,
      type,
      config,
      enabled,
      createdAt: new Date().toISOString(),
      lastUsed: null
    };

    integrations.push(newIntegration);

    Logger.info('创建集成成功', { integrationId: newIntegration.id, type, name });

    res.status(201).json({
      success: true,
      data: newIntegration,
      message: '集成创建成功'
    });
  } catch (error) {
    Logger.error('创建集成失败', error);
    res.serverError('创建集成失败');
  }
}));

/**
 * 验证集成配置
 */
function validateIntegrationConfig(type, config) {
  const errors = [];

  switch (type) {
    case INTEGRATION_TYPES.WEBHOOK:
      if (!config.url) errors.push('Webhook URL是必填的');
      if (config.url && !isValidUrl(config.url)) errors.push('Webhook URL格式无效');
      break;

    case INTEGRATION_TYPES.SLACK:
      if (!config.webhookUrl) errors.push('Slack Webhook URL是必填的');
      if (config.webhookUrl && !isValidUrl(config.webhookUrl)) errors.push('Slack Webhook URL格式无效');
      break;

    case INTEGRATION_TYPES.EMAIL:
      if (!config.smtpHost) errors.push('SMTP主机是必填的');
      if (!config.smtpPort) errors.push('SMTP端口是必填的');
      if (!config.username) errors.push('用户名是必填的');
      if (!config.password) errors.push('密码是必填的');
      break;

    case INTEGRATION_TYPES.JENKINS:
      if (!config.serverUrl) errors.push('Jenkins服务器URL是必填的');
      if (config.serverUrl && !isValidUrl(config.serverUrl)) errors.push('Jenkins服务器URL格式无效');
      if (!config.jobName) errors.push('Job名称是必填的');
      break;

    default:
      errors.push('未知的集成类型');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 验证URL格式
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// ==================== CI/CD集成功能 ====================

/**
 * 获取支持的CI/CD平台
 */
router.get('/cicd/platforms', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const platforms = cicdIntegrationService.getSupportedPlatforms();

    res.success(platforms);
  } catch (error) {
    Logger.error('获取支持的平台失败', error);
    res.serverError('获取支持的平台失败');
  }
}));

/**
 * 创建CI/CD集成
 */
router.post('/cicd', authMiddleware, asyncHandler(async (req, res) => {
  const {
    name,
    platform,
    description,
    configuration,
    enabled = true,
    triggerEvents = ['test_completed', 'test_failed'],
    webhookSecret
  } = req.body;

  if (!name || !platform || !configuration) {
    
        return res.validationError([], '缺少必要参数: name, platform, configuration');
  }

  try {
    const integrationId = await cicdIntegrationService.createIntegration({
      name,
      platform,
      description,
      configuration,
      enabled,
      triggerEvents,
      webhookSecret,
      createdBy: req.user.id
    });

    Logger.info(`创建CI/CD集成成功: ${name}`, { integrationId, userId: req.user.id });

    res.json({
      success: true,
      data: { integrationId },
      message: 'CI/CD集成创建成功'
    });
  } catch (error) {
    Logger.error('创建CI/CD集成失败', error, { userId: req.user.id });
    res.serverError('创建CI/CD集成失败');
  }
}));

/**
 * 手动触发CI/CD集成
 */
router.post('/cicd/:integrationId/trigger', authMiddleware, asyncHandler(async (req, res) => {
  const { integrationId } = req.params;
  const { eventType = 'manual_trigger', data = {} } = req.body;

  try {
    await cicdIntegrationService.triggerIntegration(integrationId, eventType, {
      ...data,
      triggeredBy: req.user.id,
      triggeredAt: new Date().toISOString()
    });

    Logger.info(`手动触发CI/CD集成: ${integrationId}`, { eventType, userId: req.user.id });

    res.success('CI/CD集成触发成功');
  } catch (error) {
    Logger.error('触发CI/CD集成失败', error, { integrationId, userId: req.user.id });
    res.serverError('触发CI/CD集成失败');
  }
}));

/**
 * 获取CI/CD集成列表
 */
router.get('/cicd', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const integrations = cicdIntegrationService.getIntegrations();

    res.success(integrations);
  } catch (error) {
    Logger.error('获取CI/CD集成列表失败', error);
    res.serverError('获取CI/CD集成列表失败');
  }
}));

/**
 * 处理webhook回调 (不需要认证)
 */
router.post('/webhook/:platform', asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const payload = req.body;
  const signature = req.headers['x-hub-signature'] || req.headers['x-gitlab-token'] || req.headers['authorization'];

  try {
    const result = await cicdIntegrationService.handleWebhook(platform, payload, signature);

    Logger.info(`处理${platform} webhook`, { success: result.success });

    if (result.success) {
      res.success('Webhook处理成功');
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    Logger.error('Webhook处理失败', error, { platform });
    res.serverError('Webhook处理失败');
  }
}));

/**
 * 获取配置模板
 */
router.get('/cicd/templates/:platform', authMiddleware, asyncHandler(async (req, res) => {
  const { platform } = req.params;

  try {
    const templates = {
      'jenkins': {
        serverUrl: 'https://jenkins.example.com',
        username: 'your-username',
        apiToken: 'your-api-token',
        jobName: 'your-job-name'
      },
      'github-actions': {
        repoOwner: 'your-username',
        repoName: 'your-repo',
        token: 'ghp_your-token',
        workflowFile: 'test-automation.yml'
      },
      'gitlab-ci': {
        gitlabUrl: 'https://gitlab.com',
        projectId: 'your-project-id',
        token: 'glpat-your-token',
        pipelineFile: '.gitlab-ci.yml'
      }
    };

    const template = templates[platform];
    if (!template) {
      
        return res.notFound('资源', '不支持的平台: ${platform
      }');
    }

    res.success(template);
  } catch (error) {
    Logger.error('获取配置模板失败', error);
    res.serverError('获取配置模板失败');
  }
}));

module.exports = router;
