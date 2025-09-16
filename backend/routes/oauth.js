/**
 * OAuth2 第三方登录路由
 * 处理Google、GitHub、Microsoft、Discord等第三方登录
 */

const express = require('express');
const { query } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { ErrorHandler, asyncHandler } = require('../middleware/errorHandler');
const { loginRateLimiter } = require('../middleware/rateLimiter');
const { securityLogger } = require('../middleware/logger');
const oauthService = require('../src/services/OAuthService');

const router = express.Router();

/**
 * 获取可用的OAuth提供商
 * GET /api/auth/oauth/providers
 */
router.get('/providers', (req, res) => {
  try {
    const providers = oauthService.getAvailableProviders();
    
    res.json({
      success: true,
      data: {
        providers,
        count: providers.length
      },
      message: '获取OAuth提供商列表成功'
    });
  } catch (error) {
    console.error('获取OAuth提供商失败:', error);
    res.status(500).json({
      success: false,
      error: '获取提供商列表失败'
    });
  }
});

/**
 * 生成OAuth授权URL
 * GET /api/auth/oauth/:provider/authorize
 * @param {string} provider - 提供商 (google, github, microsoft, discord)
 */
router.get('/:provider/authorize', loginRateLimiter, asyncHandler(async (req, res) => {
  const { provider } = req.params;
  
  // 验证提供商
  const availableProviders = oauthService.getAvailableProviders();
  const isValidProvider = availableProviders.some(p => p.id === provider);
  
  if (!isValidProvider) {
    return res.status(400).json({
      success: false,
      error: `不支持的OAuth提供商: ${provider}`,
      availableProviders: availableProviders.map(p => p.id)
    });
  }
  
  try {
    const { authUrl, state } = oauthService.generateAuthUrl(provider, req);
    
    // 记录授权请求
    securityLogger('oauth_authorize_request', {
      provider,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    }, req);
    
    res.json({
      success: true,
      data: {
        authUrl,
        provider,
        state
      },
      message: `${provider}授权URL生成成功`
    });
    
  } catch (error) {
    console.error(`OAuth授权URL生成失败[${provider}]:`, error);
    res.status(400).json({
      success: false,
      error: error.message || `${provider}授权配置错误`
    });
  }
}));

/**
 * 处理OAuth回调
 * GET /api/auth/oauth/:provider/callback
 * @param {string} provider - 提供商
 * @param {string} code - 授权码
 * @param {string} state - 状态参数
 */
router.get('/:provider/callback', loginRateLimiter, asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const { code, state, error: oauthError, error_description } = req.query;
  
  try {
    // 检查OAuth错误
    if (oauthError) {
      securityLogger('oauth_callback_error', {
        provider,
        error: oauthError,
        description: error_description
      }, req);
      
      return res.status(400).json({
        success: false,
        error: `OAuth认证被拒绝: ${error_description || oauthError}`
      });
    }
    
    // 检查必需参数
    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: '缺少必需的OAuth回调参数'
      });
    }
    
    // 处理回调
    const result = await oauthService.handleCallback(provider, code, state, req);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'OAuth登录失败'
      });
    }
    
    // 记录成功登录
    securityLogger('oauth_login_success', {
      provider,
      userId: result.user.id,
      email: result.user.email,
      isNewUser: result.isNewUser
    }, req);
    
    // 返回登录结果
    res.json({
      success: true,
      data: {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        tokenType: result.tokens.tokenType,
        expiresIn: result.tokens.expiresIn,
        user: result.tokens.user,
        isNewUser: result.isNewUser,
        provider
      },
      message: `通过${provider}登录成功`
    });
    
  } catch (error) {
    console.error(`OAuth回调处理失败[${provider}]:`, error);
    
    securityLogger('oauth_callback_failed', {
      provider,
      error: error.message,
      code: code ? 'present' : 'missing'
    }, req);
    
    res.status(500).json({
      success: false,
      error: error.message || 'OAuth登录处理失败'
    });
  }
}));

/**
 * 获取用户的OAuth账户
 * GET /api/auth/oauth/accounts
 */
router.get('/accounts', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const oauthAccounts = await oauthService.getUserOAuthAccounts(req.user.id);
    
    res.json({
      success: true,
      data: {
        accounts: oauthAccounts,
        count: oauthAccounts.length
      },
      message: '获取OAuth账户列表成功'
    });
    
  } catch (error) {
    console.error('获取OAuth账户失败:', error);
    res.status(500).json({
      success: false,
      error: '获取OAuth账户失败'
    });
  }
}));

/**
 * 关联OAuth账户
 * POST /api/auth/oauth/:provider/link
 */
router.post('/:provider/link', authMiddleware, loginRateLimiter, asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const { code, state } = req.body;
  
  // 验证提供商
  const availableProviders = oauthService.getAvailableProviders();
  const isValidProvider = availableProviders.some(p => p.id === provider);
  
  if (!isValidProvider) {
    return res.status(400).json({
      success: false,
      error: `不支持的OAuth提供商: ${provider}`
    });
  }
  
  if (!code || !state) {
    return res.status(400).json({
      success: false,
      error: '缺少必需参数'
    });
  }
  
  try {
    // 检查用户是否已关联此提供商
    const existingAccounts = await oauthService.getUserOAuthAccounts(req.user.id);
    const isAlreadyLinked = existingAccounts.some(account => account.provider === provider);
    
    if (isAlreadyLinked) {
      return res.status(400).json({
        success: false,
        error: `您已经关联了${provider}账户`
      });
    }
    
    // 处理OAuth认证，但不创建新用户，只关联到现有账户
    const result = await oauthService.handleCallback(provider, code, state, req, req.user.id);
    
    securityLogger('oauth_account_linked', {
      provider,
      userId: req.user.id,
      email: req.user.email
    }, req);
    
    res.json({
      success: true,
      data: {
        provider,
        linkedAt: new Date().toISOString()
      },
      message: `${provider}账户关联成功`
    });
    
  } catch (error) {
    console.error(`OAuth账户关联失败[${provider}]:`, error);
    
    securityLogger('oauth_link_failed', {
      provider,
      userId: req.user.id,
      error: error.message
    }, req);
    
    res.status(400).json({
      success: false,
      error: error.message || `${provider}账户关联失败`
    });
  }
}));

/**
 * 解绑OAuth账户
 * DELETE /api/auth/oauth/:provider/unlink
 */
router.delete('/:provider/unlink', authMiddleware, asyncHandler(async (req, res) => {
  const { provider } = req.params;
  
  try {
    // 检查用户是否有密码（确保不会被锁定）
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    const user = userResult.rows[0];
    const hasPassword = user.password_hash && user.password_hash.trim() !== '';
    
    // 检查用户关联的OAuth账户数量
    const oauthAccounts = await oauthService.getUserOAuthAccounts(req.user.id);
    
    // 如果用户没有密码且只有一个OAuth账户，不允许解绑
    if (!hasPassword && oauthAccounts.length <= 1) {
      return res.status(400).json({
        success: false,
        error: '无法解绑最后一个登录方式，请先设置密码'
      });
    }
    
    // 执行解绑
    const unlinkResult = await oauthService.unlinkOAuthAccount(req.user.id, provider);
    
    if (!unlinkResult) {
      return res.status(404).json({
        success: false,
        error: `未找到${provider}账户关联`
      });
    }
    
    securityLogger('oauth_account_unlinked', {
      provider,
      userId: req.user.id,
      email: req.user.email
    }, req);
    
    res.json({
      success: true,
      message: `${provider}账户解绑成功`
    });
    
  } catch (error) {
    console.error(`OAuth账户解绑失败[${provider}]:`, error);
    
    securityLogger('oauth_unlink_failed', {
      provider,
      userId: req.user.id,
      error: error.message
    }, req);
    
    res.status(500).json({
      success: false,
      error: error.message || `${provider}账户解绑失败`
    });
  }
}));

/**
 * 获取OAuth配置状态（用于管理员）
 * GET /api/auth/oauth/config/status
 */
router.get('/config/status', authMiddleware, asyncHandler(async (req, res) => {
  // 仅允许管理员访问
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '权限不足'
    });
  }
  
  try {
    const allProviders = ['google', 'github', 'microsoft', 'discord'];
    const configStatus = allProviders.map(provider => {
      const config = oauthService.providers[provider];
      return {
        provider,
        name: config.name,
        configured: !!(config.clientId && config.clientSecret),
        hasClientId: !!config.clientId,
        hasClientSecret: !!config.clientSecret,
        hasRedirectUri: !!config.redirectUri
      };
    });
    
    res.json({
      success: true,
      data: {
        providers: configStatus,
        totalProviders: allProviders.length,
        configuredCount: configStatus.filter(p => p.configured).length
      },
      message: 'OAuth配置状态获取成功'
    });
    
  } catch (error) {
    console.error('获取OAuth配置状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取配置状态失败'
    });
  }
}));

/**
 * 错误处理中间件
 */
router.use((error, req, res, next) => {
  console.error('OAuth路由错误:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: '输入验证失败',
      details: error.message
    });
  }
  
  if (error.message.includes('OAuth') || error.message.includes('oauth')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'OAuth服务内部错误'
  });
});

module.exports = router;
