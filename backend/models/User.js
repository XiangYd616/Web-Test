/**
 * 用户数据模型
 * 对应前端 src/types/unified/user.ts 中的统一 User 接口
 * 版本: v1.0.0 - 与前端类型定义保持一致
 */

// 用户角色枚举 - 与前端和数据库保持一致
const UserRole = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  TESTER: 'tester',
  MANAGER: 'manager'
};

// 用户状态枚举 - 与前端和数据库保持一致
const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended'
};

// 用户计划枚举 - 与前端和数据库保持一致
const UserPlan = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
};

class User {
  constructor(data = {}) {
    // 基础标识信息
    this.id = data.id || null;
    this.username = data.username || '';
    this.email = data.email || '';

    // 角色和权限 - 使用统一枚举
    this.role = data.role || UserRole.USER;
    this.plan = data.plan || UserPlan.FREE;
    this.status = data.status || UserStatus.ACTIVE;
    this.permissions = data.permissions || [];

    // 个人信息 - 统一使用profile对象
    this.profile = {
      firstName: data.profile?.firstName || data.firstName || null,
      lastName: data.profile?.lastName || data.lastName || null,
      fullName: data.profile?.fullName || data.fullName || null,
      company: data.profile?.company || null,
      department: data.profile?.department || null,
      phone: data.profile?.phone || null,
      timezone: data.profile?.timezone || 'Asia/Shanghai',
      bio: data.profile?.bio || null,
      avatar: data.profile?.avatar || data.avatar || null
    };

    // 偏好设置
    this.preferences = data.preferences || this.getDefaultPreferences();

    // 安全相关 - 统一字段名
    this.emailVerified = data.emailVerified || false;
    this.emailVerifiedAt = data.emailVerifiedAt || null;
    this.twoFactorEnabled = data.twoFactorEnabled || false;
    this.loginAttempts = data.loginAttempts || 0;
    this.lockedUntil = data.lockedUntil || null;

    // 时间戳 - 统一字段名
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.lastLoginAt = data.lastLoginAt || data.lastLogin || null; // 兼容旧字段名

    // 统计信息
    this.loginCount = data.loginCount || 0;
    this.testCount = data.testCount || 0;

    // 元数据
    this.metadata = data.metadata || {};
  }

  /**
   * 获取默认用户偏好设置 - 与前端统一定义保持一致
   */
  getDefaultPreferences() {
    return {
      theme: 'auto',
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      notifications: {
        email: true,
        sms: false,
        push: true,
        browser: true,
        testComplete: true,
        testFailed: true,
        weeklyReport: false,
        securityAlert: true
      },
      dashboard: {
        defaultView: 'overview',
        layout: 'grid',
        widgets: [],
        refreshInterval: 30,
        showTips: true
      },
      testing: {
        defaultTimeout: 30000, // 毫秒
        maxConcurrentTests: 3,
        autoSaveResults: true,
        enableAdvancedFeatures: false
      },
      privacy: {
        shareUsageData: false,
        allowCookies: true,
        trackingEnabled: false
      }
    };
  }

  /**
   * 验证用户数据
   */
  validate() {
    const errors = [];

    if (!this.username || this.username.length < 3) {
      errors.push('用户名至少需要3个字符');
    }

    if (!this.email || !this.isValidEmail(this.email)) {
      errors.push('请提供有效的邮箱地址');
    }

    if (!Object.values(UserRole).includes(this.role)) {
      errors.push('无效的用户角色');
    }

    if (!Object.values(UserStatus).includes(this.status)) {
      errors.push('无效的用户状态');
    }

    if (!Object.values(UserPlan).includes(this.plan)) {
      errors.push('无效的用户计划');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证邮箱格式
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 转换为数据库格式 - 与数据库模式完全匹配
   */
  toDatabase() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,

      // 个人信息字段（从profile对象拆分）
      first_name: this.profile?.firstName || null,
      last_name: this.profile?.lastName || null,
      avatar_url: this.profile?.avatarUrl || null,
      bio: this.profile?.bio || null,
      location: this.profile?.location || null,
      website: this.profile?.website || null,

      // 角色和状态
      role: this.role,
      plan: this.plan,
      status: this.status,

      // 安全相关字段
      email_verified: this.emailVerified,
      email_verified_at: this.emailVerifiedAt,
      two_factor_enabled: this.twoFactorEnabled || false,
      failed_login_attempts: this.loginAttempts,
      locked_until: this.lockedUntil,

      // 统计信息
      login_count: this.loginCount,
      last_login: this.lastLoginAt, // 修复：使用正确的数据库字段名

      // JSON 字段
      preferences: JSON.stringify(this.preferences || {}),
      metadata: JSON.stringify(this.metadata || {}),

      // 时间戳
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      deleted_at: this.deletedAt || null,

      // 扩展字段
      api_key: this.apiKey || null
    };
  }

  /**
   * 从数据库格式创建实例 - 与数据库模式完全匹配
   */
  static fromDatabase(dbData) {
    if (!dbData) return null;

    return new User({
      id: dbData.id,
      username: dbData.username,
      email: dbData.email,
      role: dbData.role,
      plan: dbData.plan,
      status: dbData.status,
      permissions: [], // 需要从其他表获取

      // 构建profile对象（从数据库字段组装）
      profile: {
        firstName: dbData.first_name,
        lastName: dbData.last_name,
        fullName: dbData.first_name && dbData.last_name
          ? `${dbData.first_name} ${dbData.last_name}`
          : null,
        avatarUrl: dbData.avatar_url,
        bio: dbData.bio,
        location: dbData.location,
        website: dbData.website,
        timezone: 'Asia/Shanghai' // 默认值
      },
      emailVerified: dbData.email_verified,
      emailVerifiedAt: dbData.email_verified_at,
      lastLoginAt: dbData.last_login, // 使用统一字段名
      loginCount: dbData.login_count,
      loginAttempts: dbData.failed_login_attempts,
      lockedUntil: dbData.locked_until,
      preferences: dbData.preferences ? JSON.parse(dbData.preferences) : null,
      metadata: dbData.metadata ? JSON.parse(dbData.metadata) : {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    });
  }

  /**
   * 转换为API响应格式（隐藏敏感信息）
   */
  toAPI() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      fullName: this.fullName,
      role: this.role,
      status: this.status,
      permissions: this.permissions,
      avatar: this.avatar,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLogin: this.lastLogin,
      emailVerified: this.emailVerified,
      preferences: this.preferences,
      metadata: this.metadata
    };
  }

  /**
   * 更新最后登录时间
   */
  updateLastLogin() {
    this.lastLogin = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * 重置登录尝试次数
   */
  resetLoginAttempts() {
    this.loginAttempts = 0;
    this.lockedUntil = null;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * 增加登录尝试次数
   */
  incrementLoginAttempts() {
    this.loginAttempts = (this.loginAttempts || 0) + 1;

    // 如果尝试次数超过5次，锁定账户1小时
    if (this.loginAttempts >= 5) {
      const lockDuration = 60 * 60 * 1000; // 1小时
      this.lockedUntil = new Date(Date.now() + lockDuration).toISOString();
    }

    this.updatedAt = new Date().toISOString();
  }

  /**
   * 检查账户是否被锁定
   */
  isLocked() {
    if (!this.lockedUntil) return false;
    return new Date() < new Date(this.lockedUntil);
  }

  /**
   * 检查用户是否有指定权限
   */
  hasPermission(permission) {
    return this.permissions.includes(permission);
  }

  /**
   * 检查用户是否有指定角色
   */
  hasRole(role) {
    return this.role === role;
  }

  /**
   * 获取用户显示名称
   */
  getDisplayName() {
    return this.profile.fullName || this.profile.firstName || this.username;
  }
}

// 导出User类和枚举
module.exports = {
  User,
  UserRole,
  UserStatus,
  UserPlan
};
