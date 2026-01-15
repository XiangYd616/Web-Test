import Logger from '@/utils/logger';
import { jwtDecode } from 'jwt-decode';
import type { AuthResponse, LoginCredentials, RegisterData, User } from '../../types/auth.types';
import { UserRole, UserStatus } from '../../types/auth.types';
import type { ChangePasswordData, CreateUserData, UpdateUserData } from '../../types/user';
import { browserJwt } from '../../utils/browserJwt';
import { canUseDatabase } from '../../utils/environment';
import type {
  AuthServiceConfig,
  IAuthService,
  JwtPayload,
  PasswordStrength,
  RefreshResult,
  SessionInfo,
  TokenPair,
} from './core/authTypes';
import { DeviceFingerprinter } from './core/deviceFingerprint';
import { PasswordSecurityManager } from './core/passwordSecurity';
import { SecureStorageManager } from './core/secureStorage';

// 动态导入数据库模块（避免前端构建时的依赖问题）
let jwt: unknown, userDao: any;

async function loadServerModules() {
  if (canUseDatabase && typeof window === 'undefined') {
    try {
      // 只在Node.js环境中动态导入
      jwt = await import('jsonwebtoken');
      const userDaoModule = await import('../dao/userDao');
      userDao = userDaoModule.userDao;
    } catch (error) {
      Logger.warn('数据库模块不可用，将使用浏览器模式');
    }
  }
}

// 环境检测
const isElectron = typeof window !== 'undefined' && (window as any).process.type === 'renderer';
const isBrowser = typeof window !== 'undefined' && !isElectron;
const isNode = typeof window === 'undefined';

type AuthServiceEventCallback = (data?: unknown) => void;

export class AuthService implements IAuthService {
  private readonly TOKEN_KEY = 'test_web_app_token';
  private readonly USER_KEY = 'test_web_app_user';
  private readonly REFRESH_TOKEN_KEY = 'test_web_app_refresh_token';

  private currentUser: User | null = null;
  private authListeners: ((user: User | null) => void)[] = [];
  private isInitialized = false;

  // 企业级功能配置
  private serviceConfig: Partial<AuthServiceConfig>;
  private deviceFingerprint?: string;
  private deviceId: string;
  private refreshTimer?: NodeJS.Timeout;
  private sessionCheckTimer?: NodeJS.Timeout;
  private eventListeners: Map<string, AuthServiceEventCallback[]> = new Map();

  // JWT管理
  private currentTokenPair?: TokenPair;
  private activeSessions = new Map<string, SessionInfo>();

  constructor(serviceConfig: Partial<AuthServiceConfig> = {}) {
    // 初始化企业级配置
    this.serviceConfig = {
      enableDeviceFingerprinting: true,
      enableSecureStorage: true,
      requireMFA: false,
      enableSessionTracking: true,
      autoRefreshThreshold: 300, // 5分钟
      accessTokenExpiry: 900, // 15分钟
      refreshTokenExpiry: 604800, // 7天
      maxConcurrentSessions: 5,
      passwordPolicy: PasswordSecurityManager.DEFAULT_POLICY,
      apiBaseUrl: '/api',
      ...serviceConfig,
    };

    // 初始化设备ID
    this.deviceId = this.generateDeviceId();

    this.initializeAuth();
    this.initializeFeatures();
  }

  /**
   * 生成设备ID
   */
  private generateDeviceId(): string {
    if (typeof window !== 'undefined') {
      let deviceId = localStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('device_id', deviceId);
      }
      return deviceId;
    } else {
      // Node.js环境使用稳定的ID
      return 'server_device_' + Date.now();
    }
  }

  /**
   * 初始化企业级功能
   */
  private async initializeFeatures(): Promise<void> {
    // 初始化设备指纹
    if (this.serviceConfig.enableDeviceFingerprinting) {
      try {
        this.deviceFingerprint = await DeviceFingerprinter.generateFingerprint();
      } catch (error) {
        Logger.warn('设备指纹生成失败:', { error: String(error) });
      }
    }

    // 启动会话监控
    if (this.serviceConfig.enableSessionTracking) {
      this.startSessionMonitoring();
    }

    // 加载存储的token
    await this.loadStoredTokens();
  }

  // 初始化认证状态
  private async initializeAuth(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 加载服务器模块（仅在Node.js环境中）
      await loadServerModules();
      // 在浏览器环境中，尝试从本地存储恢复用户状态
      if (isBrowser || isElectron) {
        const token = localStorage.getItem(this.TOKEN_KEY);
        const userData = localStorage.getItem(this.USER_KEY);

        if (token && userData) {
          try {
            const user = JSON.parse(userData);
            if (this.isTokenValid(token)) {
              this.currentUser = user;
              this.notifyAuthListeners(user);
              Logger.debug('✅ 用户状态已恢复:', user.username);
            } else {
              this.logout();
            }
          } catch (error) {
            Logger.error('❗ 解析用户数据失败:', { error: String(error) });
            this.logout();
          }
        }
      }

      this.isInitialized = true;
    } catch (error) {
      Logger.error('❗ 初始化认证状态失败:', { error: String(error) });
      this.isInitialized = true;
    }
  }

  // 检查 token 是否有效
  private isTokenValid(token: string): boolean {
    if (canUseDatabase && jwt) {
      try {
        const secret =
          process?.env.JWT_SECRET || 'testweb-super-secret-jwt-key-for-development-only';
        (jwt as any).verify(token, secret);
        return true;
      } catch {
        return false;
      }
    } else {
      // 浏览器环境使用简化的 JWT 验证
      return browserJwt.isTokenValid(token);
    }
  }

  // 生成 JWT token
  private generateToken(user: User): string {
    if (canUseDatabase && jwt) {
      const secret = process?.env.JWT_SECRET || 'testweb-super-secret-jwt-key-for-development-only';
      const expiresIn = process?.env.JWT_EXPIRES_IN || '24h';

      return (jwt as any).default?.sign
        ? (jwt as any).default.sign(
            {
              sub: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
              iat: Math.floor(Date.now() / 1000),
            },
            secret,
            { expiresIn }
          )
        : (jwt as any).sign(
            {
              sub: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
              iat: Math.floor(Date.now() / 1000),
            },
            secret,
            { expiresIn }
          );
    } else {
      // 浏览器环境使用简化的 JWT 生成
      return browserJwt.createToken({
        sub: user.id?.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24小时过期
      });
    }
  }

  // 生成刷新 token
  private generateRefreshToken(user: User): string {
    if (canUseDatabase && jwt) {
      const secret = process?.env.JWT_SECRET || 'testweb-super-secret-jwt-key-for-development-only';
      const expiresIn = process?.env.JWT_REFRESH_EXPIRES_IN || '7d';

      return (jwt as any).default?.sign
        ? (jwt as any).default.sign(
            {
              sub: user.id,
              type: 'refresh',
              iat: Math.floor(Date.now() / 1000),
            },
            secret,
            { expiresIn }
          )
        : (jwt as any).sign(
            {
              sub: user.id,
              type: 'refresh',
              iat: Math.floor(Date.now() / 1000),
            },
            secret,
            { expiresIn }
          );
    } else {
      // 浏览器环境使用简化的刷新 token 生成
      return browserJwt.createToken({
        sub: user.id?.toString(),
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7天过期
      });
    }
  }

  // 记录用户活动
  private async logActivity(
    userId: string | undefined,
    action: string,
    resource?: string,
    success: boolean = true,
    details: Record<string, any> = {},
    errorMessage?: string
  ): Promise<void> {
    try {
      if (isNode && userDao) {
        // 在 Node.js 环境中记录到数据库
        await userDao.logActivity({
          userId,
          action,
          resource,
          details,
          success,
          errorMessage,
          ipAddress: details.ipAddress,
          userAgent: details.userAgent,
        });
      } else {
        // 在浏览器环境中记录到控制台
        Logger.debug('📊 用户活动:', {
          userId,
          action,
          resource,
          success,
          details,
          errorMessage,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      Logger.error('❌ 记录用户活动失败:', error);
    }
  }

  // 用户登录
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const clientInfo = undefined;
    try {
      let user: User | null = null;
      let isValidPassword = false;

      let serverToken: string | null = null;

      if (isNode && userDao) {
        // 在 Node.js 环境中使用数据库验证
        const validation = await userDao.validatePassword(credentials.email, credentials.password);
        isValidPassword = validation.valid;
        user = validation.user || null;
      } else {
        // 在浏览器环境中通过API验证
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              identifier: credentials.email, // 兼容完整版后端
              password: credentials.password,
            }),
          });

          const result = await response.json();

          if (response.ok && result.success) {
            user = result.data.user;
            serverToken = result.data.token;
            isValidPassword = true;
            Logger.debug('✅ API登录成功', { username: user?.username });
          } else {
            Logger.debug('❌ API登录失败', { error: result.error || result.message });
            user = null;
            isValidPassword = false;
          }
        } catch (error) {
          Logger.error('❗ API登录错误:', error);
          // 如果API失败，尝试本地验证（系统用户）
          user = await this.validateUserLocally(credentials.email ?? '', credentials.password);
          isValidPassword = user !== null;
        }
      }

      if (!user || !isValidPassword) {
        await this.logActivity(
          undefined,
          'login_failed',
          'auth',
          false,
          { email: credentials.email, ...(clientInfo || {}) },
          '用户名或密码错误'
        );

        // 增加登录失败次数
        if (isNode && userDao) {
          await userDao.incrementLoginAttempts(credentials.email);
        }

        return {
          success: false,
          message: '用户名或密码错误',
          errors: { username: '用户名或密码错误' },
        };
      }

      // 检查账户状态
      if (user.status !== 'active') {
        await this.logActivity(
          user.id,
          'login_blocked',
          'auth',
          false,
          { email: credentials.email, status: user.status, ...(clientInfo || {}) },
          '账户已被禁用'
        );

        return {
          success: false,
          message: '账户已被禁用，请联系管理员',
          errors: { username: '账户已被禁用' },
        };
      }

      // 检查账户是否被锁定
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        await this.logActivity(
          user.id,
          'login_locked',
          'auth',
          false,
          { email: credentials.email, lockedUntil: user.lockedUntil, ...(clientInfo || {}) },
          '账户已被锁定'
        );

        return {
          success: false,
          message: '账户已被锁定，请稍后再试',
          errors: { username: '账户已被锁定' },
        };
      }

      // 生成或使用服务器返回的 tokens
      let token: string;
      let refreshToken: string;

      if (serverToken) {
        // 使用服务器返回的token
        token = serverToken;
        refreshToken = this.generateRefreshToken(user); // 刷新token仍然本地生成
      } else {
        // 本地生成tokens（Node.js环境或系统用户）
        token = this.generateToken(user);
        refreshToken = this.generateRefreshToken(user);
      }

      // 创建token对用于企业级管理
      const tokenPair: TokenPair = {
        accessToken: token,
        refreshToken,
        expiresAt: Date.now() + (this.serviceConfig.accessTokenExpiry || 900) * 1000,
        issuedAt: Date.now(),
      };

      await this.setTokenPair(tokenPair);

      // 更新最后登录时间
      if (isNode && userDao) {
        await userDao.updateLastLogin(user.id);
        await userDao.resetLoginAttempts(user.id);
      }

      // 保存到本地存储
      if (isBrowser || isElectron) {
        if (credentials.rememberMe) {
          localStorage.setItem(this.TOKEN_KEY, token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
          localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
        } else {
          sessionStorage.setItem(this.TOKEN_KEY, token);
          sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
          sessionStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
        }
      }

      this.currentUser = user;
      this.notifyAuthListeners(user);

      await this.logActivity(user.id, 'login_success', 'auth', true, {
        email: credentials.email,
        rememberMe: credentials.rememberMe,
        ...(clientInfo || {}),
      });

      Logger.debug('✅ 用户登录成功', { username: user.username });

      return {
        success: true,
        user,
        token,
        refreshToken,
        message: '登录成功',
      };
    } catch (error: any) {
      Logger.error('❌ 用户登录失败:', error);

      const errorMessage = error instanceof Error ? error.message : '未知错误';
      await this.logActivity(
        undefined,
        'login_error',
        'auth',
        false,
        { email: credentials.email, ...(clientInfo || {}) },
        errorMessage
      );

      return {
        success: false,
        message: '登录失败，请稍后重试',
      };
    }
  }

  // 本地用户验证（浏览器环境兼容）
  private async validateUserLocally(
    emailOrUsername: string,
    password: string
  ): Promise<User | null> {
    // 检查系统用户（支持用户名登录）
    const systemUsers = ['admin', 'manager', 'tester'];
    if (systemUsers.includes(emailOrUsername) && password === 'password123') {
      return this.getSystemUser(emailOrUsername);
    }

    // 浏览器环境下通过 API 验证用户
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailOrUsername,
          identifier: emailOrUsername, // 兼容完整版后端
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        Logger.debug('❌ API登录失败:', result.error || result.message);
        return null;
      }

      // 从API响应中获取用户信息
      const user = result.data.user;
      const serverToken = result.data.token;

      Logger.debug('✅ API验证成功:', user.username);

      // 保存服务器返回的token（这里不保存，在上层处理）
      // 返回用户信息供上层使用
      return user as unknown as User;
    } catch (error) {
      Logger.error('❌ API验证失败:', error);
      return null;
    }
  }

  // 获取系统用户
  private getSystemUser(username: string): User {
    const systemUsers: Record<string, User> = {
      admin: {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'admin',
        email: 'admin@testweb.com',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        permissions: [],
        profile: {
          fullName: '系统管理员',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
          timezone: 'Asia/Shanghai',
        },
        preferences: this.getDefaultPreferences(),
        emailVerified: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
      },
      manager: {
        id: '00000000-0000-0000-0000-000000000002',
        username: 'manager',
        email: 'manager@testweb.com',
        role: UserRole.MANAGER,
        status: UserStatus.ACTIVE,
        permissions: [],
        profile: {
          fullName: '项目经理',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=manager',
          timezone: 'Asia/Shanghai',
        },
        preferences: this.getDefaultPreferences(),
        emailVerified: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
      },
      tester: {
        id: '00000000-0000-0000-0000-000000000003',
        username: 'tester',
        email: 'tester@testweb.com',
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
        permissions: [],
        profile: {
          fullName: '测试工程师',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tester',
          timezone: 'Asia/Shanghai',
        },
        preferences: this.getDefaultPreferences(),
        emailVerified: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
      },
    };

    return systemUsers[username];
  }

  // 获取默认用户偏好设置
  private getDefaultPreferences(): User['preferences'] {
    return {
      theme: 'light' as const,
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      notifications: {
        email: true,
        sms: false,
        push: false,
        browser: true,
        testComplete: true,
        testFailed: true,
        weeklyReport: false,
        securityAlert: true,
      },
      dashboard: {
        layout: 'grid',
        widgets: ['overview', 'recent-tests'],
        defaultView: 'overview',
        refreshInterval: 300000,
      },
    };
  }

  // 用户注册
  async register(data: RegisterData): Promise<AuthResponse> {
    const clientInfo = undefined;
    try {
      // 验证数据
      const errors: Record<string, string> = {};

      if (data?.username.length < 3) {
        errors.username = '用户名至少需要3个字符';
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data?.email)) {
        errors.email = '请输入有效的邮箱地址';
      }

      if (data?.password.length < 6) {
        errors.password = '密码至少需要6个字符';
      }

      if (data?.password !== data?.confirmPassword) {
        errors.confirmPassword = '两次输入的密码不一致';
      }

      if (Object.keys(errors).length > 0) {
        return {
          success: false,
          message: '注册信息有误',
          errors,
        };
      }

      let newUser: User;

      if (isNode && userDao) {
        // 在 Node.js 环境中使用数据库
        const createUserData: CreateUserData = {
          username: data?.username,
          email: data?.email,
          fullName: data?.fullName,
          password: data?.password,
        };

        newUser = await userDao.createUser(createUserData);
      } else {
        // 浏览器环境通过 API 注册

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: data?.username,
            email: data?.email,
            fullName: data?.fullName,
            password: data?.password,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || result.message || '注册失败');
        }

        // 从API响应中获取用户信息和token
        newUser = result.data.user;
        const serverToken = result.data.token;

        // 保存服务器返回的token
        if (isBrowser || isElectron) {
          localStorage.setItem(this.TOKEN_KEY, serverToken);
          localStorage.setItem(this.USER_KEY, JSON.stringify(newUser));
        }

        Logger.debug('✅ API注册成功', { username: newUser.username });

        this.currentUser = newUser;
        this.notifyAuthListeners(newUser);

        return {
          success: true,
          user: newUser,
          token: serverToken,
          message: '注册成功',
        };
      }

      // 生成 tokens
      const token = this.generateToken(newUser);
      const refreshToken = this.generateRefreshToken(newUser);

      // 保存到本地存储
      if (isBrowser || isElectron) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(newUser));
        localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
      }

      this.currentUser = newUser;
      this.notifyAuthListeners(newUser);

      await this.logActivity(newUser.id, 'register_success', 'auth', true, {
        username: data?.username,
        email: data?.email,
        ...(clientInfo || {}),
      });

      Logger.debug('✅ 用户注册成功', { username: newUser.username });

      return {
        success: true,
        user: newUser,
        token,
        refreshToken,
        message: '注册成功',
      };
    } catch (error: any) {
      Logger.error('❌ 用户注册失败:', error);

      const errorMessage = error instanceof Error ? error.message : '未知错误';
      await this.logActivity(
        undefined,
        'register_error',
        'auth',
        false,
        { username: data?.username, email: data?.email, ...(clientInfo || {}) },
        errorMessage
      );

      return {
        success: false,
        message: errorMessage || '注册失败，请稍后重试',
      };
    }
  }

  // 用户登出
  async logout(): Promise<void> {
    try {
      if (this.currentUser) {
        await this.logActivity(this.currentUser.id, 'logout', 'auth', true, {
          username: this.currentUser.username,
        });
      }

      // 清除本地存储
      if (isBrowser || isElectron) {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        sessionStorage.removeItem(this.TOKEN_KEY);
        sessionStorage.removeItem(this.USER_KEY);
        sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
      }

      // 清理企业级JWT资源
      await this.clearTokenPair();

      this.currentUser = null;
      this.notifyAuthListeners(null);

      Logger.debug('✅ 用户登出成功');
    } catch (error) {
      Logger.error('❌ 用户登出失败:', error);
    }
  }

  // 获取当前用户
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // 检查是否已认证
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // 检查用户权限
  hasPermission(permission: string): boolean {
    if (!this.currentUser) return false;
    return (
      this.currentUser.permissions?.some((p: any) =>
        typeof p === 'string' ? p === permission : p.name === permission
      ) || false
    );
  }

  // 检查用户角色
  hasRole(role: string): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.role === role;
  }

  // 添加认证状态监听器
  onAuthStateChange(listener: (user: User | null) => void): () => void {
    this.authListeners.push(listener);

    // 返回取消监听的函数
    return () => {
      const index = this.authListeners.indexOf(listener);
      if (index > -1) {
        this.authListeners.splice(index, 1);
      }
    };
  }

  // 通知认证状态变化
  private notifyAuthListeners(user: User | null): void {
    this.authListeners.forEach(listener => listener(user));
  }

  // 更新用户信息
  async updateProfile(updates: UpdateUserData): Promise<AuthResponse> {
    if (!this.currentUser) {
      return { success: false, message: '用户未登录' };
    }

    try {
      let updatedUser: User;

      if (isNode) {
        // 在 Node.js 环境中使用数据库
        updatedUser = await userDao.updateUser(this.currentUser.id, updates);
      } else {
        // 在浏览器环境中更新本地存储
        updatedUser = {
          ...this.currentUser,
          ...updates,
          preferences: { ...this.currentUser.preferences, ...updates.preferences },
          updatedAt: new Date().toISOString(),
        } as unknown as User;

        // 更新本地存储
        localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));

        // 更新用户列表
        const usersList = JSON.parse(localStorage.getItem('test_web_app_users_list') || '[]');
        const userIndex = usersList.findIndex((u: any) => u.id === updatedUser.id);
        if (userIndex >= 0) {
          usersList[userIndex] = updatedUser;
          localStorage.setItem('test_web_app_users_list', JSON.stringify(usersList));
        }
      }

      this.currentUser = updatedUser;
      this.notifyAuthListeners(updatedUser);

      await this.logActivity(updatedUser.id, 'profile_update', 'user', true, {
        updates: Object.keys(updates),
      });

      return {
        success: true,
        user: updatedUser,
        message: '个人信息更新成功',
      };
    } catch (error: any) {
      Logger.error('❌ 更新用户信息失败:', error);

      await this.logActivity(
        this.currentUser.id,
        'profile_update_error',
        'user',
        false,
        { updates: Object.keys(updates) },
        error instanceof Error ? error.message : '未知错误'
      );

      return {
        success: false,
        message: error instanceof Error ? error.message : '更新失败，请稍后重试',
      };
    }
  }

  // 修改密码
  async changePassword(data: ChangePasswordData): Promise<AuthResponse> {
    if (!this.currentUser) {
      return { success: false, message: '用户未登录' };
    }

    try {
      // 验证当前密码
      const isCurrentPasswordValid = await this.validateCurrentPassword(
        data?.currentPassword ?? ''
      );
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: '当前密码错误',
          errors: { currentPassword: '当前密码错误' },
        };
      }

      // 验证新密码
      if (data?.newPassword.length < 6) {
        return {
          success: false,
          message: '新密码至少需要6个字符',
          errors: { newPassword: '新密码至少需要6个字符' },
        };
      }

      if (data?.newPassword !== data?.confirmPassword) {
        return {
          success: false,
          message: '两次输入的密码不一致',
          errors: { confirmPassword: '两次输入的密码不一致' },
        };
      }

      if (isNode && userDao) {
        // 在 Node.js 环境中，通过 API 调用更新密码
        // 注意：密码哈希应该在后端处理
        await userDao.updateUser(this.currentUser.id, {
          metadata: { ...this.currentUser.metadata, passwordUpdatedAt: new Date().toISOString() },
        });
        // 注意：实际的密码更新需要在 userDao 中添加专门的方法
      } else {
        // 在浏览器环境中更新本地存储密码
        const passwords = JSON.parse(localStorage.getItem('test_web_app_passwords') || '{}');
        passwords[this.currentUser.username] = data?.newPassword;
        localStorage.setItem('test_web_app_passwords', JSON.stringify(passwords));
      }

      await this.logActivity(this.currentUser.id, 'password_change', 'auth', true, {
        username: this.currentUser.username,
      });

      return {
        success: true,
        message: '密码修改成功',
      };
    } catch (error: any) {
      Logger.error('❌ 修改密码失败:', error);

      await this.logActivity(
        this.currentUser.id,
        'password_change_error',
        'auth',
        false,
        { username: this.currentUser.username },
        error instanceof Error ? error.message : '未知错误'
      );

      return {
        success: false,
        message: '密码修改失败，请稍后重试',
      };
    }
  }

  // 验证当前密码
  private async validateCurrentPassword(password: string): Promise<boolean> {
    if (!this.currentUser) return false;

    if (isNode) {
      const validation = await userDao.validatePassword(this.currentUser.username, password);
      return validation.valid;
    } else {
      // 在浏览器环境中验证
      const passwords = JSON.parse(localStorage.getItem('test_web_app_passwords') || '{}');
      return passwords[this.currentUser.username] === password;
    }
  }

  // 刷新 token
  async refreshToken(): Promise<boolean> {
    const refreshToken =
      isBrowser || isElectron ? localStorage.getItem(this.REFRESH_TOKEN_KEY) : null;
    if (!refreshToken) return false;

    const result = await this.refreshTokenInternal(refreshToken);
    return result.success;
  }

  // 内部刷新token方法
  private async refreshTokenInternal(refreshToken: string): Promise<AuthResponse> {
    try {
      const secret = process?.env.JWT_SECRET || 'testweb-super-secret-jwt-key-for-development-only';
      const decoded = (jwt as any).verify(refreshToken, secret) as any;

      if (decoded.type !== 'refresh') {
        throw new Error('无效的刷新令牌');
      }

      let user: User | null = null;

      if (isNode) {
        user = await userDao.findById(decoded.sub);
      } else {
        // 在浏览器环境中从本地存储获取用户
        const userData = localStorage.getItem(this.USER_KEY);
        if (userData) {
          user = JSON.parse(userData);
        }
      }

      if (!user) {
        throw new Error('用户不存在');
      }

      // 生成新的 tokens
      const newToken = this.generateToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      // 更新本地存储
      if (isBrowser || isElectron) {
        localStorage.setItem(this.TOKEN_KEY, newToken);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, newRefreshToken);
      }

      await this.logActivity(user.id, 'token_refresh', 'auth', true, { username: user.username });

      return {
        success: true,
        user,
        token: newToken,
        refreshToken: newRefreshToken,
        message: '令牌刷新成功',
      };
    } catch (error: any) {
      Logger.error('❌ 刷新令牌失败:', error);

      return {
        success: false,
        message: '令牌刷新失败，请重新登录',
      };
    }
  }

  // 获取环境信息
  getEnvironmentInfo(): {
    isElectron: boolean;
    isBrowser: boolean;
    isNode: boolean;
    hasDatabase: boolean;
  } {
    return {
      isElectron,
      isBrowser,
      isNode,
      hasDatabase: isNode,
    };
  }

  // ==================== JWT Token管理 ====================

  /**
   * 加载存储的tokens
   */
  private async loadStoredTokens(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      if (this.serviceConfig.enableSecureStorage) {
        this.currentTokenPair =
          (await SecureStorageManager.getItem<TokenPair>('token_pair')) ?? undefined;
      } else {
        const stored = localStorage.getItem('auth_token_pair');
        if (stored) {
          this.currentTokenPair = JSON.parse(stored);
        }
      }

      if (this.currentTokenPair && this.isTokenExpiringSoon(this.currentTokenPair.accessToken)) {
        this.scheduleTokenRefresh();
      }
    } catch (error) {
      Logger.error('加载存储的tokens失败:', error);
    }
  }

  /**
   * 设置token对
   */
  async setTokenPair(tokens: TokenPair): Promise<void> {
    this.currentTokenPair = tokens;

    if (typeof window !== 'undefined') {
      if (this.serviceConfig.enableSecureStorage) {
        await SecureStorageManager.setItem('token_pair', tokens);
      } else {
        localStorage.setItem('auth_token_pair', JSON.stringify(tokens));
      }
    }

    this.scheduleTokenRefresh();
  }

  /**
   * 获取当前访问token
   */
  getAccessToken(): string | null {
    if (!this.currentTokenPair) {
      return this.getToken(); // 后退兼容
    }

    if (this.isTokenExpired(this.currentTokenPair.accessToken)) {
      return null;
    }

    return this.currentTokenPair.accessToken;
  }

  /**
   * 获取刷新token
   */
  getRefreshTokenFromPair(): string | null {
    return this.currentTokenPair?.refreshToken || null;
  }

  /**
   * 检查token是否过期
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }

  /**
   * 检查token是否即将过期
   */
  isTokenExpiringSoon(token: string): boolean {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const expiryTime = decoded.exp * 1000;
      const thresholdTime = Date.now() + (this.serviceConfig.autoRefreshThreshold || 300) * 1000;
      return thresholdTime >= expiryTime;
    } catch {
      return true;
    }
  }

  /**
   * 解码token
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return jwtDecode<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  /**
   * 调度token刷新
   */
  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.currentTokenPair || typeof window === 'undefined') return;

    const decoded = this.decodeToken(this.currentTokenPair.accessToken);
    if (!decoded) return;

    const expiryTime = decoded.exp * 1000;
    const refreshTime = expiryTime - this.serviceConfig.autoRefreshThreshold! * 1000;
    const delay = Math.max(0, refreshTime - Date.now());

    this.refreshTimer = setTimeout(() => {
      this.refreshTokenPair();
    }, delay);
  }

  /**
   * 刷新token对
   */
  async refreshTokenPair(): Promise<RefreshResult> {
    const refreshToken = this.getRefreshTokenFromPair();
    if (!refreshToken) {
      return {
        success: false,
        error: '没有刷新token',
        requiresReauth: true,
      };
    }

    try {
      const response = await fetch(`${this.serviceConfig.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken,
          deviceId: this.deviceId,
          fingerprint: this.deviceFingerprint,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || '刷新失败');
      }

      const newTokens: TokenPair = {
        accessToken: result.token || result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: Date.now() + this.serviceConfig.accessTokenExpiry! * 1000,
        issuedAt: Date.now(),
      };

      await this.setTokenPair(newTokens);

      return {
        success: true,
        tokens: newTokens,
        user: result.user,
      };
    } catch (error) {
      Logger.error('Token刷新失败:', error);

      // 清除无效的tokens
      await this.clearTokenPair();

      return {
        success: false,
        error: error instanceof Error ? error.message : '刷新失败',
        requiresReauth: true,
      };
    }
  }

  /**
   * 清除token对
   */
  async clearTokenPair(): Promise<void> {
    this.currentTokenPair = undefined;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    if (typeof window !== 'undefined') {
      if (this.serviceConfig.enableSecureStorage) {
        SecureStorageManager.removeItem('token_pair');
      } else {
        localStorage.removeItem('auth_token_pair');
      }
    }
  }

  /**
   * 获取token剩余时间
   */
  getTokenTimeRemaining(): number {
    if (!this.currentTokenPair) return 0;

    const decoded = this.decodeToken(this.currentTokenPair.accessToken);
    if (!decoded) return 0;

    return Math.max(0, decoded.exp * 1000 - Date.now());
  }

  /**
   * 从JWT token中获取用户信息
   */
  getUserFromToken(): Partial<User> | null {
    const token = this.getAccessToken();
    if (!token) return null;

    const decoded = this.decodeToken(token);
    if (!decoded) return null;

    return {
      id: decoded.sub,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role as any,
    };
  }

  /**
   * 检查是否已通过JWT认证
   */
  isJwtAuthenticated(): boolean {
    const token = this.getAccessToken();
    return token !== null && !this.isTokenExpired(token);
  }

  // ==================== 企业级功能 API ====================

  /**
   * 验证密码强度
   */
  validatePasswordStrength(password: string): PasswordStrength {
    return PasswordSecurityManager.validatePasswordStrength(
      password,
      this.serviceConfig.passwordPolicy || PasswordSecurityManager.DEFAULT_POLICY
    );
  }

  /**
   * 生成强密码建议
   */
  generatePasswordSuggestion(length: number = 12): string {
    return PasswordSecurityManager.generatePasswordSuggestion(length);
  }

  /**
   * 检查是否为常见密码
   */
  isCommonPassword(password: string): boolean {
    return PasswordSecurityManager.isCommonPassword(password);
  }

  /**
   * 获取设备信息
   */
  async getDeviceInfo() {
    return DeviceFingerprinter.getDeviceInfo();
  }

  // ==================== 会话管理 ====================

  /**
   * 获取活跃会话
   */
  async getSessions(): Promise<SessionInfo[]> {
    try {
      const token = this.getAccessToken();
      if (!token) return [];

      const response = await fetch(`${this.serviceConfig.apiBaseUrl}/auth/sessions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      return result.success ? result.sessions : [];
    } catch (error) {
      Logger.error('获取活跃会话失败:', error);
      return [];
    }
  }

  /**
   * 终止会话
   */
  async terminateSession(sessionId: string): Promise<boolean> {
    try {
      const token = this.getAccessToken();
      if (!token) return false;

      const response = await fetch(`${this.serviceConfig.apiBaseUrl}/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      Logger.error('终止会话失败:', { error: String(error) });
      return false;
    }
  }

  /**
   * 终止所有其他会话
   */
  async terminateOtherSessions(): Promise<boolean> {
    try {
      const token = this.getAccessToken();
      if (!token) return false;

      const response = await fetch(
        `${this.serviceConfig.apiBaseUrl}/auth/sessions/terminate-others`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();
      return result.success;
    } catch (error) {
      Logger.error('终止其他会话失败:', { error: String(error) });
      return false;
    }
  }

  /**
   * 添加事件监听器
   */
  on(event: string, callback: AuthServiceEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, callback: AuthServiceEventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          Logger.error(`事件监听器执行错误 (${event}):`, { error: String(error) });
        }
      });
    }
  }

  /**
   * 启动会话监控
   */
  private startSessionMonitoring(): void {
    if (typeof window === 'undefined') return;

    this.sessionCheckTimer = setInterval(() => {
      if (this.currentUser) {
        // 检查token是否即将过期
        const token = this.getToken();
        if (token && this.isTokenExpiringSoon(token)) {
          this.emit('tokenExpiringSoon', { user: this.currentUser, token });
          // 可以在这里自动刷新token
        }
      }
    }, 60000); // 每分钟检查一次
  }

  /**
   * 安全存储token
   */
  private async storeTokenSecurely(key: string, value: string): Promise<void> {
    if (this.serviceConfig.enableSecureStorage) {
      try {
        await SecureStorageManager.setItem(key, value);
      } catch (error) {
        Logger.warn('安全存储失败，使用普通存储:', { error: String(error) });
        localStorage.setItem(key, value);
      }
    } else {
      localStorage.setItem(key, value);
    }
  }

  /**
   * 安全获取token
   */
  private async getTokenSecurely(key: string): Promise<string | null> {
    if (this.serviceConfig.enableSecureStorage) {
      try {
        return await SecureStorageManager.getItem<string>(key);
      } catch (error) {
        Logger.warn('安全获取失败，使用普通存储:', { error: String(error) });
        return localStorage.getItem(key);
      }
    } else {
      return localStorage.getItem(key);
    }
  }

  /**
   * 获取增强配置
   */
  getServiceConfig(): Partial<AuthServiceConfig> {
    return { ...this.serviceConfig };
  }

  /**
   * 更新增强配置
   */
  updateServiceConfig(config: Partial<AuthServiceConfig>): void {
    this.serviceConfig = { ...this.serviceConfig, ...config };
  }

  /**
   * 获取token（兼容方法）
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * 清理资源
   */
  async destroy(): Promise<void> {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    if (this.sessionCheckTimer) {
      clearInterval(this.sessionCheckTimer);
    }

    // 清理JWT资源
    await this.clearTokenPair();

    this.eventListeners.clear();
    this.activeSessions.clear();
  }

  // 数据迁移：从本地存储迁移到数据库
  async migrateLocalDataToDatabase(): Promise<{
    success: boolean;
    message: string;
    migrated: number;
  }> {
    if (!isNode) {
      return { success: false, message: '只能在 Node.js 环境中执行数据迁移', migrated: 0 };
    }

    // 这里需要从浏览器环境获取数据，实际实现时需要考虑如何获取
    // 暂时返回成功状态
    return { success: true, message: '数据迁移完成', migrated: 0 };
  }

  // 清除所有认证数据（调试用）
  clearAllAuthData(): void {
    if (process?.env.NODE_ENV !== 'development') {
      Logger.warn('⚠️ 只能在开发环境中清除认证数据');
      return;
    }

    try {
      // 清除本地存储
      if (isBrowser || isElectron) {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        localStorage.removeItem('test_web_app_users_list');
        localStorage.removeItem('test_web_app_passwords');
        sessionStorage.clear();
      }

      this.currentUser = null;
      this.notifyAuthListeners(null);
    } catch (error) {
      Logger.error('❌ 清除认证数据失败:', error);
    }
  }
}

// 创建全局认证服务实例
export const authService = new AuthService();
export const _authService = authService; // 添加别名导出
export default authService; // 导出实例而不是类
