/**
 * OAuth2 服务
 * 处理第三方登录认证逻辑
 */

const crypto = require('crypto');
const axios = require('axios');
const { query } = require('../../config/database');
const { logSecurityEvent } = require('../utils/securityLogger');
const { generateTokenPair } = require('../../middleware/auth');

class OAuthService {
  constructor() {
    // OAuth2 提供商配置
    this.providers = {
      google: {
        name: 'Google',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scope: 'openid email profile',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI
      },
      github: {
        name: 'GitHub',
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        emailUrl: 'https://api.github.com/user/emails',
        scope: 'user:email',
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        redirectUri: process.env.GITHUB_REDIRECT_URI
      },
      microsoft: {
        name: 'Microsoft',
        authUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/token`,
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scope: 'openid email profile User.Read',
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        redirectUri: process.env.MICROSOFT_REDIRECT_URI
      },
      discord: {
        name: 'Discord',
        authUrl: 'https://discord.com/api/oauth2/authorize',
        tokenUrl: 'https://discord.com/api/oauth2/token',
        userInfoUrl: 'https://discord.com/api/users/@me',
        scope: 'identify email',
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        redirectUri: process.env.DISCORD_REDIRECT_URI
      }
    };
  }

  /**
   * 生成OAuth授权URL
   */
  generateAuthUrl(provider, req) {
    const config = this.providers[provider];
    if (!config || !config.clientId) {
      throw new Error(`未配置的OAuth提供商: ${provider}`);
    }

    // 生成state参数用于防止CSRF攻击
    const state = this.generateState(provider, req);
    
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope,
      response_type: 'code',
      state: state,
      access_type: 'offline', // Google需要
      prompt: 'consent' // 强制显示授权页面
    });

    // GitHub特殊参数
    if (provider === 'github') {
      params.set('allow_signup', 'true');
    }

    // Microsoft特殊参数
    if (provider === 'microsoft') {
      params.set('response_mode', 'query');
    }

    const authUrl = `${config.authUrl}?${params.toString()}`;
    
    // 记录授权请求
    logSecurityEvent(null, 'oauth_authorization_initiated', {
      provider,
      clientIP: req.ip,
      userAgent: req.get('User-Agent')
    });

    return { authUrl, state };
  }

  /**
   * 处理OAuth回调
   */
  async handleCallback(provider, code, state, req) {
    const config = this.providers[provider];
    if (!config) {
      throw new Error(`未支持的OAuth提供商: ${provider}`);
    }

    try {
      // 验证state参数
      if (!this.validateState(state, provider, req)) {
        throw new Error('无效的state参数');
      }

      // 获取访问令牌
      const tokenData = await this.exchangeCodeForToken(provider, code);
      
      // 获取用户信息
      const userInfo = await this.getUserInfo(provider, tokenData.access_token);
      
      // 查找或创建用户
      const user = await this.findOrCreateUser(provider, userInfo, req);
      
      // 生成应用JWT令牌
      const tokenPair = await generateTokenPair(user.id);
      
      // 记录成功登录
      await logSecurityEvent(user.id, 'oauth_login_success', {
        provider,
        email: user.email,
        isNewUser: user.isNewUser
      });

      return {
        success: true,
        user,
        tokens: tokenPair,
        isNewUser: user.isNewUser
      };

    } catch (error) {
      // 记录失败
      await logSecurityEvent(null, 'oauth_login_failed', {
        provider,
        error: error.message,
        code: code ? 'present' : 'missing'
      });
      
      throw error;
    }
  }

  /**
   * 交换授权码获取访问令牌
   */
  async exchangeCodeForToken(provider, code) {
    const config = this.providers[provider];
    
    const params = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      redirect_uri: config.redirectUri
    };

    // 不同提供商的参数差异
    if (provider === 'google' || provider === 'microsoft') {
      params.grant_type = 'authorization_code';
    }

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    // GitHub需要特殊的Accept头
    if (provider === 'github') {
      headers['Accept'] = 'application/json';
    }

    const response = await axios.post(config.tokenUrl, 
      new URLSearchParams(params).toString(), 
      { headers }
    );

    if (!response.data.access_token) {
      throw new Error(`无法获取${config.name}访问令牌`);
    }

    return response.data;
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(provider, accessToken) {
    const config = this.providers[provider];
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    };

    // GitHub需要User-Agent
    if (provider === 'github') {
      headers['User-Agent'] = 'Test-Web-App/1.0';
    }

    const response = await axios.get(config.userInfoUrl, { headers });
    const userData = response.data;

    let userInfo = {
      providerId: userData.id?.toString() || userData.sub,
      email: userData.email,
      name: userData.name || userData.login,
      avatar: userData.picture || userData.avatar_url,
      provider: provider
    };

    // GitHub特殊处理 - 可能需要单独获取邮箱
    if (provider === 'github' && !userData.email) {
      try {
        const emailResponse = await axios.get(config.emailUrl, { headers });
        const emails = emailResponse.data;
        const primaryEmail = emails.find(email => email.primary) || emails[0];
        userInfo.email = primaryEmail?.email;
      } catch (error) {
        console.warn('无法获取GitHub用户邮箱:', error.message);
      }
    }

    // Microsoft特殊处理
    if (provider === 'microsoft') {
      userInfo.email = userData.mail || userData.userPrincipalName;
      userInfo.name = userData.displayName;
      userInfo.avatar = null; // Microsoft Graph需要额外请求获取头像
    }

    // Discord特殊处理
    if (provider === 'discord') {
      userInfo.name = userData.username;
      userInfo.avatar = userData.avatar 
        ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
        : null;
    }

    // 验证必要字段
    if (!userInfo.providerId || !userInfo.email) {
      throw new Error(`无法获取${config.name}用户的必要信息`);
    }

    return userInfo;
  }

  /**
   * 查找或创建用户
   */
  async findOrCreateUser(provider, userInfo, req) {
    try {
      // 首先查找是否已有OAuth账户
      const existingOAuthUser = await query(
        'SELECT u.* FROM users u JOIN user_oauth_accounts oa ON u.id = oa.user_id WHERE oa.provider = $1 AND oa.provider_user_id = $2',
        [provider, userInfo.providerId]
      );

      if (existingOAuthUser.rows.length > 0) {
        const user = existingOAuthUser.rows[0];
        
        // 更新最后登录时间
        await query(
          'UPDATE users SET last_login_at = NOW() WHERE id = $1',
          [user.id]
        );

        // 更新OAuth账户信息
        await query(
          'UPDATE user_oauth_accounts SET email = $1, name = $2, avatar = $3, last_login_at = NOW() WHERE provider = $4 AND provider_user_id = $5',
          [userInfo.email, userInfo.name, userInfo.avatar, provider, userInfo.providerId]
        );

        return { ...user, isNewUser: false };
      }

      // 检查是否有相同邮箱的用户（用于账户关联）
      const existingUserByEmail = await query(
        'SELECT * FROM users WHERE email = $1',
        [userInfo.email]
      );

      let user;
      let isNewUser = false;

      if (existingUserByEmail.rows.length > 0 && process.env.OAUTH_AUTO_LINK_ACCOUNTS === 'true') {
        // 自动关联已存在的账户
        user = existingUserByEmail.rows[0];
        
        await logSecurityEvent(user.id, 'oauth_account_linked', {
          provider,
          email: userInfo.email
        });
      } else if (process.env.OAUTH_ALLOW_SIGNUP === 'true') {
        // 创建新用户
        const username = await this.generateUniqueUsername(userInfo.name, userInfo.email);
        
        const newUserResult = await query(
          `INSERT INTO users (username, email, is_active, email_verified_at, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW(), NOW())
           RETURNING *`,
          [username, userInfo.email, true]
        );

        user = newUserResult.rows[0];
        isNewUser = true;

        await logSecurityEvent(user.id, 'user_registered_via_oauth', {
          provider,
          email: userInfo.email,
          username: username
        });
      } else {
        throw new Error('不允许通过OAuth注册新账户，请联系管理员');
      }

      // 创建OAuth账户关联记录
      await query(
        `INSERT INTO user_oauth_accounts 
         (user_id, provider, provider_user_id, email, name, avatar, created_at, last_login_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [user.id, provider, userInfo.providerId, userInfo.email, userInfo.name, userInfo.avatar]
      );

      // 更新用户最后登录时间
      await query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      return { ...user, isNewUser };

    } catch (error) {
      console.error('OAuth用户创建/查找失败:', error);
      throw new Error('用户账户处理失败');
    }
  }

  /**
   * 生成唯一用户名
   */
  async generateUniqueUsername(name, email) {
    // 从姓名或邮箱生成基础用户名
    let baseUsername = name?.replace(/\s+/g, '_').toLowerCase() || 
                       email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
    
    // 限制长度
    baseUsername = baseUsername.substring(0, 20);

    // 检查是否唯一
    let username = baseUsername;
    let counter = 1;

    while (true) {
      const existing = await query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (existing.rows.length === 0) {
        break;
      }

      username = `${baseUsername}_${counter}`;
      counter++;

      // 防止无限循环
      if (counter > 1000) {
        username = `user_${Date.now()}`;
        break;
      }
    }

    return username;
  }

  /**
   * 生成state参数
   */
  generateState(provider, req) {
    const data = {
      provider,
      timestamp: Date.now(),
      ip: req.ip,
      nonce: crypto.randomBytes(16).toString('hex')
    };

    const stateData = JSON.stringify(data);
    const cipher = crypto.createCipher('aes-256-cbc', process.env.OAUTH_STATE_SECRET || 'default-secret');
    let encrypted = cipher.update(stateData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return encrypted;
  }

  /**
   * 验证state参数
   */
  validateState(state, expectedProvider, req) {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', process.env.OAUTH_STATE_SECRET || 'default-secret');
      let decrypted = decipher.update(state, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      const data = JSON.parse(decrypted);
      
      // 验证提供商匹配
      if (data.provider !== expectedProvider) {
        return false;
      }
      
      // 验证时间戳（防止重放攻击）
      const maxAge = 10 * 60 * 1000; // 10分钟
      if (Date.now() - data.timestamp > maxAge) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('State验证失败:', error);
      return false;
    }
  }

  /**
   * 获取用户的OAuth账户
   */
  async getUserOAuthAccounts(userId) {
    const result = await query(
      'SELECT provider, email, name, avatar, created_at, last_login_at FROM user_oauth_accounts WHERE user_id = $1',
      [userId]
    );
    return result.rows;
  }

  /**
   * 解绑OAuth账户
   */
  async unlinkOAuthAccount(userId, provider) {
    const result = await query(
      'DELETE FROM user_oauth_accounts WHERE user_id = $1 AND provider = $2 RETURNING *',
      [userId, provider]
    );

    if (result.rows.length > 0) {
      await logSecurityEvent(userId, 'oauth_account_unlinked', {
        provider,
        email: result.rows[0].email
      });
      return true;
    }

    return false;
  }

  /**
   * 获取已配置的OAuth提供商
   */
  getAvailableProviders() {
    return Object.keys(this.providers).filter(provider => {
      const config = this.providers[provider];
      return config.clientId && config.clientSecret;
    }).map(provider => ({
      id: provider,
      name: this.providers[provider].name,
      configured: true
    }));
  }
}

module.exports = new OAuthService();
