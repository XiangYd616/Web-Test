/**
 * 集成路由
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');

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

    res.json({
      success: true,
      data: filteredIntegrations,
      total: filteredIntegrations.length,
      supportedTypes: Object.values(INTEGRATION_TYPES)
    });
  } catch (error) {
    Logger.error('获取集成列表失败', error);
    res.status(500).json({
      success: false,
      message: '获取集成列表失败'
    });
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
      return res.status(400).json({
        success: false,
        message: '名称、类型和配置是必填的'
      });
    }

    // 验证集成类型
    if (!Object.values(INTEGRATION_TYPES).includes(type)) {
      return res.status(400).json({
        success: false,
        message: '不支持的集成类型',
        supportedTypes: Object.values(INTEGRATION_TYPES)
      });
    }

    // 验证配置
    const validationResult = validateIntegrationConfig(type, config);
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        message: '配置验证失败',
        errors: validationResult.errors
      });
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
    res.status(500).json({
      success: false,
      message: '创建集成失败'
    });
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

module.exports = router;
