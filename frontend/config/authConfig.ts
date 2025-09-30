/**
 * 统一认证服务配置
 * 提供企业级安全功能的配置开关和参数设置
 * 版本: v1.0.0
 */

import type { PasswordPolicy } from '../services/auth/core/authTypes';

export interface AuthSecurityConfig {
  // 多因素认证
  mfa: {
    enabled: boolean;
    methods: ('sms' | 'email' | 'totp' | 'backup')[];
    gracePeriod: number; // MFA宽限期（毫秒）
    backupCodeCount: number; // 备用代码数量
    totpIssuer: string; // TOTP发行者名称
  };
  
  // 设备指纹
  deviceFingerprinting: {
    enabled: boolean;
    trackCanvas: boolean; // 是否使用Canvas指纹
    trackWebGL: boolean; // 是否使用WebGL指纹
    trackFonts: boolean; // 是否检测字体
    trackPlugins: boolean; // 是否检测插件
  };
  
  // 会话管理
  sessionManagement: {
    enabled: boolean;
    maxConcurrentSessions: number; // 最大并发会话数
    sessionTimeout: number; // 会话超时时间（毫秒）
    trackLocation: boolean; // 是否追踪登录位置
    notifyNewSession: boolean; // 是否通知新会话登录
  };
  
  // 密码安全
  passwordSecurity: {
    policy: PasswordPolicy;
    breachCheck: boolean; // 是否检查密码泄露
    strengthMeter: boolean; // 是否显示强度表
    suggestPasswords: boolean; // 是否建议密码
  };
}

export interface AuthTokenConfig {
  // JWT配置
  jwt: {
    accessTokenExpiry: number; // 访问token过期时间（秒）
    refreshTokenExpiry: number; // 刷新token过期时间（秒）
    autoRefreshThreshold: number; // 自动刷新阈值（秒）
    issuer: string; // JWT发行者
    algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
  };
  
  // 存储配置
  storage: {
    enableSecureStorage: boolean; // 是否启用安全存储
    encryptTokens: boolean; // 是否加密tokens
    storageType: 'localStorage' | 'sessionStorage' | 'memory';
    keyRotationInterval: number; // 密钥轮换间隔（毫秒）
  };
}

export interface AuthAuditConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  events: {
    login: boolean;
    logout: boolean;
    tokenRefresh: boolean;
    passwordChange: boolean;
    mfaAttempt: boolean;
    sessionStart: boolean;
    sessionEnd: boolean;
    suspiciousActivity: boolean;
  };
  retention: {
    maxAge: number; // 日志最大保留时间（毫秒）
    maxEntries: number; // 最大日志条目数
  };
}

export interface AuthRateLimitConfig {
  enabled: boolean;
  login: {
    maxAttempts: number; // 最大登录尝试次数
    windowSize: number; // 时间窗口大小（毫秒）
    lockoutDuration: number; // 锁定持续时间（毫秒）
  };
  passwordReset: {
    maxAttempts: number;
    windowSize: number;
  };
  mfa: {
    maxAttempts: number;
    windowSize: number;
    lockoutDuration: number;
  };
}

export interface AuthConfig {
  // 基础配置
  apiBaseUrl: string;
  environment: 'development' | 'testing' | 'production';
  enableDebugLogging: boolean;
  
  // 企业级功能配置
  security: AuthSecurityConfig;
  tokens: AuthTokenConfig;
  audit: AuthAuditConfig;
  rateLimiting: AuthRateLimitConfig;
  
  // API端点配置
  endpoints: {
    login: string;
    register: string;
    logout: string;
    refresh: string;
    mfa: string;
    sessions: string;
    profile: string;
    passwordChange: string;
    passwordReset: string;
  };
}

// ==================== 默认配置 ====================

const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 7776000000, // 90天（毫秒）
  preventReuse: 5
};

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
  environment: (process.env.NODE_ENV as any) || 'development',
  enableDebugLogging: process.env.NODE_ENV === 'development',
  
  security: {
    mfa: {
      enabled: false, // 默认关闭，可根据需要开启
      methods: ['email', 'sms'],
      gracePeriod: 86400000, // 24小时
      backupCodeCount: 10,
      totpIssuer: 'TestWeb App'
    },
    
    deviceFingerprinting: {
      enabled: true,
      trackCanvas: true,
      trackWebGL: true,
      trackFonts: false, // 可能影响性能
      trackPlugins: false
    },
    
    sessionManagement: {
      enabled: true,
      maxConcurrentSessions: 5,
      sessionTimeout: 3600000, // 1小时
      trackLocation: true,
      notifyNewSession: true
    },
    
    passwordSecurity: {
      policy: DEFAULT_PASSWORD_POLICY,
      breachCheck: false, // 需要外部服务
      strengthMeter: true,
      suggestPasswords: true
    }
  },
  
  tokens: {
    jwt: {
      accessTokenExpiry: 900, // 15分钟
      refreshTokenExpiry: 604800, // 7天
      autoRefreshThreshold: 300, // 5分钟
      issuer: 'testweb-app',
      algorithm: 'HS256'
    },
    
    storage: {
      enableSecureStorage: true,
      encryptTokens: true,
      storageType: 'localStorage',
      keyRotationInterval: 2592000000 // 30天
    }
  },
  
  audit: {
    enabled: true,
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    events: {
      login: true,
      logout: true,
      tokenRefresh: false, // 可能产生大量日志
      passwordChange: true,
      mfaAttempt: true,
      sessionStart: true,
      sessionEnd: true,
      suspiciousActivity: true
    },
    retention: {
      maxAge: 2592000000, // 30天
      maxEntries: 10000
    }
  },
  
  rateLimiting: {
    enabled: true,
    login: {
      maxAttempts: 5,
      windowSize: 900000, // 15分钟
      lockoutDuration: 1800000 // 30分钟
    },
    passwordReset: {
      maxAttempts: 3,
      windowSize: 3600000 // 1小时
    },
    mfa: {
      maxAttempts: 3,
      windowSize: 600000, // 10分钟
      lockoutDuration: 1800000 // 30分钟
    }
  },
  
  endpoints: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    mfa: '/auth/mfa',
    sessions: '/auth/sessions',
    profile: '/auth/profile',
    passwordChange: '/auth/password/change',
    passwordReset: '/auth/password/reset'
  }
};

// ==================== 环境特定配置 ====================

export const DEVELOPMENT_AUTH_CONFIG: Partial<AuthConfig> = {
  enableDebugLogging: true,
  security: {
    ...DEFAULT_AUTH_CONFIG.security,
    mfa: {
      ...DEFAULT_AUTH_CONFIG.security.mfa,
      enabled: false // 开发时通常关闭MFA
    },
    passwordSecurity: {
      ...DEFAULT_AUTH_CONFIG.security.passwordSecurity,
      policy: {
        ...DEFAULT_PASSWORD_POLICY,
        minLength: 6, // 开发时更简单的密码
        requireSpecialChars: false
      }
    }
  },
  tokens: {
    ...DEFAULT_AUTH_CONFIG.tokens,
    jwt: {
      ...DEFAULT_AUTH_CONFIG.tokens.jwt,
      accessTokenExpiry: 3600, // 开发时更长的token时间
      refreshTokenExpiry: 2592000 // 30天
    },
    storage: {
      ...DEFAULT_AUTH_CONFIG.tokens.storage,
      encryptTokens: false // 开发时可以不加密便于调试
    }
  },
  rateLimiting: {
    ...DEFAULT_AUTH_CONFIG.rateLimiting,
    enabled: false // 开发时通常关闭限流
  }
};

export const PRODUCTION_AUTH_CONFIG: Partial<AuthConfig> = {
  enableDebugLogging: false,
  security: {
    ...DEFAULT_AUTH_CONFIG.security,
    mfa: {
      ...DEFAULT_AUTH_CONFIG.security.mfa,
      enabled: true, // 生产环境启用MFA
      methods: ['email', 'sms', 'totp']
    },
    passwordSecurity: {
      ...DEFAULT_AUTH_CONFIG.security.passwordSecurity,
      policy: {
        ...DEFAULT_PASSWORD_POLICY,
        minLength: 12, // 生产环境更强的密码要求
        maxAge: 5184000000 // 60天
      },
      breachCheck: true // 生产环境启用密码泄露检查
    }
  },
  tokens: {
    ...DEFAULT_AUTH_CONFIG.tokens,
    jwt: {
      ...DEFAULT_AUTH_CONFIG.tokens.jwt,
      algorithm: 'RS256', // 生产环境使用更安全的算法
      accessTokenExpiry: 600, // 10分钟
      autoRefreshThreshold: 120 // 2分钟
    }
  },
  audit: {
    ...DEFAULT_AUTH_CONFIG.audit,
    logLevel: 'warn',
    events: {
      ...DEFAULT_AUTH_CONFIG.audit.events,
      tokenRefresh: true // 生产环境记录token刷新
    },
    retention: {
      maxAge: 7776000000, // 90天
      maxEntries: 100000
    }
  }
};

// ==================== 配置工具函数 ====================

/**
 * 合并认证配置
 */
export function mergeAuthConfig(
  baseConfig: AuthConfig = DEFAULT_AUTH_CONFIG,
  overrides: Partial<AuthConfig> = {}
): AuthConfig {
  return {
    ...baseConfig,
    ...overrides,
    security: {
      mfa: { ...baseConfig.security.mfa, ...overrides.security?.mfa },
      deviceFingerprinting: { ...baseConfig.security.deviceFingerprinting, ...overrides.security?.deviceFingerprinting },
      sessionManagement: { ...baseConfig.security.sessionManagement, ...overrides.security?.sessionManagement },
      passwordSecurity: {
        ...baseConfig.security.passwordSecurity,
        ...overrides.security?.passwordSecurity,
        policy: { ...baseConfig.security.passwordSecurity?.policy, ...overrides.security?.passwordSecurity?.policy }
      }
    },
    tokens: {
      jwt: { ...baseConfig.tokens.jwt, ...overrides.tokens?.jwt },
      storage: { ...baseConfig.tokens.storage, ...overrides.tokens?.storage }
    },
    audit: {
      ...baseConfig.audit,
      ...overrides.audit,
      events: { ...baseConfig.audit.events, ...overrides.audit?.events },
      retention: { ...baseConfig.audit.retention, ...overrides.audit?.retention }
    },
    rateLimiting: {
      ...baseConfig.rateLimiting,
      ...overrides.rateLimiting,
      login: { ...baseConfig.rateLimiting.login, ...overrides.rateLimiting?.login },
      passwordReset: { ...baseConfig.rateLimiting.passwordReset, ...overrides.rateLimiting?.passwordReset },
      mfa: { ...baseConfig.rateLimiting.mfa, ...overrides.rateLimiting?.mfa }
    },
    endpoints: { ...baseConfig.endpoints, ...overrides.endpoints }
  };
}

/**
 * 获取环境特定的认证配置
 */
export function getEnvironmentAuthConfig(): AuthConfig {
  const baseConfig = DEFAULT_AUTH_CONFIG;
  
  if (process.env.NODE_ENV === 'development') {
    return mergeAuthConfig(baseConfig, DEVELOPMENT_AUTH_CONFIG);
  }
  
  if (process.env.NODE_ENV === 'production') {
    return mergeAuthConfig(baseConfig, PRODUCTION_AUTH_CONFIG);
  }
  
  return baseConfig;
}

/**
 * 创建自定义认证配置
 */
export function createAuthConfig(overrides: Partial<AuthConfig>): AuthConfig {
  const envConfig = getEnvironmentAuthConfig();
  return mergeAuthConfig(envConfig, overrides);
}

/**
 * 验证认证配置
 */
export function validateAuthConfig(config: AuthConfig): string[] {
  const errors: string[] = [];
  
  if (!config.apiBaseUrl) {
    errors.push('apiBaseUrl 不能为空');
  }
  
  if (config.tokens.jwt.accessTokenExpiry <= 0) {
    errors.push('JWT访问token过期时间必须大于0');
  }
  
  if (config.tokens.jwt.refreshTokenExpiry <= config.tokens.jwt.accessTokenExpiry) {
    errors.push('刷新token过期时间必须大于访问token过期时间');
  }
  
  if (config.security.sessionManagement.maxConcurrentSessions <= 0) {
    errors.push('最大并发会话数必须大于0');
  }
  
  if (config.security.passwordSecurity?.policy.minLength < 6) {
    errors.push('密码最小长度不能少于6位');
  }
  
  if (config.rateLimiting.enabled) {
    if (config.rateLimiting.login.maxAttempts <= 0) {
      errors.push('登录最大尝试次数必须大于0');
    }
    if (config.rateLimiting.login.windowSize <= 0) {
      errors.push('登录时间窗口必须大于0');
    }
  }
  
  return errors;
}

/**
 * 获取功能开关状态
 */
export function getFeatureFlags(config: AuthConfig) {
  return {
    mfaEnabled: config.security.mfa.enabled,
    deviceFingerprintingEnabled: config.security.deviceFingerprinting.enabled,
    sessionTrackingEnabled: config.security.sessionManagement.enabled,
    auditLoggingEnabled: config.audit.enabled,
    rateLimitingEnabled: config.rateLimiting.enabled,
    secureStorageEnabled: config.tokens.storage.enableSecureStorage,
    passwordBreachCheckEnabled: config.security.passwordSecurity?.breachCheck
  };
}

// 默认导出环境配置
export default getEnvironmentAuthConfig();
