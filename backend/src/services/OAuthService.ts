/**
 * OAuth2 服务
 * 处理第三方登录认证逻辑
 */

import axios, { AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import { query } from '../../config/database';
import { generateTokenPair } from '../../middleware/auth';
import { logSecurityEvent } from '../utils/securityLogger';

// OAuth2提供商配置接口
export interface OAuthProviderConfig {
  name: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// OAuth用户信息接口
export interface OAuthUserInfo {
  id: string;
  email?: string;
  name?: string;
  username?: string;
  avatar?: string;
  provider: string;
  verified?: boolean;
}

// OAuth令牌响应接口
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

// 登录结果接口
export interface OAuthLoginResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    username: string;
    avatar?: string;
    provider: string;
    providerId: string;
    createdAt: Date;
    lastLoginAt: Date;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  error?: string;
}

// OAuth状态接口
export interface OAuthState {
  state: string;
  provider: string;
  redirectUri?: string;
  createdAt: Date;
}

/**
 * OAuth2 服务类
 */
class OAuthService {
  private providers: Record<string, OAuthProviderConfig>;
  private states: Map<string, OAuthState> = new Map();
  private stateExpiry: number = 600000; // 10分钟

  constructor() {
    // OAuth2 提供商配置
    this.providers = {
      google: {
        name: 'Google',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scope: 'openid email profile',
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
      },
      github: {
        name: 'GitHub',
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        scope: 'user:email',
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        redirectUri: process.env.GITHUB_REDIRECT_URI || '',
      },
      facebook: {
        name: 'Facebook',
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
        userInfoUrl: 'https://graph.facebook.com/v18.0/me',
        scope: 'email public_profile',
        clientId: process.env.FACEBOOK_CLIENT_ID || '',
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
        redirectUri: process.env.FACEBOOK_REDIRECT_URI || '',
      },
      microsoft: {
        name: 'Microsoft',
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scope: 'openid email profile',
        clientId: process.env.MICROSOFT_CLIENT_ID || '',
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
        redirectUri: process.env.MICROSOFT_REDIRECT_URI || '',
      },
    };

    // 定期清理过期状态
    setInterval(() => this.cleanExpiredStates(), 60000); // 每分钟清理一次
  }

  /**
   * 生成OAuth授权URL
   */
  generateAuthUrl(provider: string, redirectUri?: string): string {
    const config = this.providers[provider];
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    const state = this.generateState();
    const stateData: OAuthState = {
      state,
      provider,
      redirectUri,
      createdAt: new Date(),
    };

    this.states.set(state, stateData);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri || config.redirectUri,
      scope: config.scope,
      response_type: 'code',
      state: state,
      access_type: 'offline', // Google特有
      prompt: 'consent', // 强制显示同意页面
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * 处理OAuth回调
   */
  async handleCallback(provider: string, code: string, state: string): Promise<OAuthLoginResult> {
    try {
      // 验证状态
      const stateData = this.states.get(state);
      if (!stateData || stateData.provider !== provider) {
        throw new Error('Invalid or expired OAuth state');
      }

      // 清理状态
      this.states.delete(state);

      // 获取访问令牌
      const tokenResponse = await this.exchangeCodeForToken(provider, code, stateData.redirectUri);

      // 获取用户信息
      const userInfo = await this.getUserInfo(provider, tokenResponse.access_token);

      // 查找或创建用户
      const user = await this.findOrCreateUser(userInfo);

      // 生成JWT令牌
      const tokens = generateTokenPair({
        userId: user.id,
        username: user.username,
        email: user.email,
        provider: user.provider,
      });

      // 记录安全事件
      await logSecurityEvent({
        type: 'oauth_login',
        userId: user.id,
        provider,
        success: true,
        timestamp: new Date(),
        metadata: {
          userAgent: 'OAuth Service',
          ipAddress: 'OAuth Provider',
        },
      });

      // 更新最后登录时间
      await this.updateLastLogin(user.id);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
          provider: user.provider,
          providerId: user.providerId,
          createdAt: user.createdAt,
          lastLoginAt: new Date(),
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      };
    } catch (error: any) {
      // 记录安全事件
      await logSecurityEvent({
        type: 'oauth_login_failed',
        provider,
        success: false,
        error: error.message,
        timestamp: new Date(),
        metadata: {
          code: code ? 'present' : 'missing',
          state: state ? 'present' : 'missing',
        },
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 用授权码换取访问令牌
   */
  private async exchangeCodeForToken(
    provider: string,
    code: string,
    redirectUri?: string
  ): Promise<OAuthTokenResponse> {
    const config = this.providers[provider];
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    try {
      const response: AxiosResponse<OAuthTokenResponse> = await axios.post(
        config.tokenUrl,
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code: code,
          redirect_uri: redirectUri || config.redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to exchange code for token: ${error.message}`);
    }
  }

  /**
   * 获取用户信息
   */
  private async getUserInfo(provider: string, accessToken: string): Promise<OAuthUserInfo> {
    const config = this.providers[provider];
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    try {
      const response = await axios.get(config.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      // 根据不同提供商标准化用户信息
      return this.normalizeUserInfo(provider, response.data);
    } catch (error: any) {
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  /**
   * 标准化用户信息
   */
  private normalizeUserInfo(provider: string, data: any): OAuthUserInfo {
    switch (provider) {
      case 'google':
        return {
          id: data.id,
          email: data.email,
          name: data.name,
          avatar: data.picture,
          provider,
          verified: data.verified_email,
        };

      case 'github':
        return {
          id: data.id.toString(),
          email: data.email,
          name: data.name,
          username: data.login,
          avatar: data.avatar_url,
          provider,
        };

      case 'facebook':
        return {
          id: data.id,
          name: data.name,
          provider,
        };

      case 'microsoft':
        return {
          id: data.id,
          email: data.mail || data.userPrincipalName,
          name: data.displayName,
          provider,
        };

      default:
        return {
          id: data.id,
          email: data.email,
          name: data.name,
          provider,
        };
    }
  }

  /**
   * 查找或创建用户
   */
  private async findOrCreateUser(userInfo: OAuthUserInfo): Promise<any> {
    try {
      // 首先查找现有用户
      const existingUser = await query(
        'SELECT * FROM users WHERE provider = ? AND provider_id = ?',
        [userInfo.provider, userInfo.id]
      );

      if (existingUser.length > 0) {
        return existingUser[0];
      }

      // 如果用户不存在，创建新用户
      const newUser = await query(
        `INSERT INTO users (
          provider, provider_id, email, username, avatar, 
          verified, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          userInfo.provider,
          userInfo.id,
          userInfo.email || '',
          userInfo.username || userInfo.name || `user_${userInfo.id}`,
          userInfo.avatar || '',
          userInfo.verified || false,
        ]
      );

      // 返回新创建的用户
      const createdUser = await query('SELECT * FROM users WHERE id = ?', [newUser.insertId]);

      return createdUser[0];
    } catch (error: any) {
      throw new Error(`Failed to find or create user: ${error.message}`);
    }
  }

  /**
   * 更新最后登录时间
   */
  private async updateLastLogin(userId: string): Promise<void> {
    try {
      await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [userId]);
    } catch (error: any) {
      // 记录错误但不抛出异常
      console.error('Failed to update last login time:', error);
    }
  }

  /**
   * 生成随机状态
   */
  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 清理过期状态
   */
  private cleanExpiredStates(): void {
    const now = Date.now();
    for (const [state, stateData] of this.states.entries()) {
      if (now - stateData.createdAt.getTime() > this.stateExpiry) {
        this.states.delete(state);
      }
    }
  }

  /**
   * 验证提供商配置
   */
  validateProviderConfig(provider: string): boolean {
    const config = this.providers[provider];
    if (!config) {
      return false;
    }

    return !!(config.clientId && config.clientSecret && config.redirectUri);
  }

  /**
   * 获取支持的提供商列表
   */
  getSupportedProviders(): string[] {
    return Object.keys(this.providers).filter(provider => this.validateProviderConfig(provider));
  }

  /**
   * 撤销OAuth令牌
   */
  async revokeToken(provider: string, accessToken: string): Promise<boolean> {
    try {
      const config = this.providers[provider];
      if (!config) {
        throw new Error(`Unsupported OAuth provider: ${provider}`);
      }

      // 根据不同提供商调用撤销端点
      switch (provider) {
        case 'google':
          await axios.post(
            'https://oauth2.googleapis.com/revoke',
            new URLSearchParams({ token: accessToken }),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            }
          );
          break;

        case 'github':
          // GitHub没有直接的撤销端点，但可以删除授权
          await axios.delete('https://api.github.com/applications/grants/' + accessToken, {
            auth: {
              username: config.clientId,
              password: config.clientSecret,
            },
          });
          break;

        default:
          // 对于没有撤销端点的提供商，返回true
          return true;
      }

      return true;
    } catch (error: any) {
      console.error('Failed to revoke token:', error);
      return false;
    }
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(provider: string, refreshToken: string): Promise<OAuthTokenResponse | null> {
    try {
      const config = this.providers[provider];
      if (!config) {
        throw new Error(`Unsupported OAuth provider: ${provider}`);
      }

      const response: AxiosResponse<OAuthTokenResponse> = await axios.post(
        config.tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  /**
   * 获取OAuth状态信息
   */
  getState(state: string): OAuthState | null {
    return this.states.get(state) || null;
  }

  /**
   * 清理特定状态
   */
  clearState(state: string): void {
    this.states.delete(state);
  }

  /**
   * 获取当前活跃状态数量
   */
  getActiveStatesCount(): number {
    return this.states.size;
  }
}

export default OAuthService;
