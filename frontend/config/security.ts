
export interface SecurityConfig     {
  // 路由安全
  enableRouteProtection: boolean;
  enableAdminRouteHiding: boolean;
  enableAccessLogging: boolean;

  // 认证安全
  maxLoginAttempts: number;
  lockoutDuration: number; // 分钟
  sessionTimeout: number; // 毫秒
  requireStrongPassword: boolean;

  // API安全
  enableRateLimiting: boolean;
  apiRateLimit: number; // 每分钟请求数
  adminApiRateLimit: number; // 管理员API每分钟请求数

  // 内容安全
  enableCSP: boolean;
  enableXSSProtection: boolean;
  enableClickjacking: boolean;

  // 开发调试
  enableDebugMode: boolean;
  enableSecurityLogs: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug
}

export function getSecurityConfig(): SecurityConfig   {
  const isDevelopment = process.env.NODE_ENV === 'development
  const isProduction = process.env.NODE_ENV === 'production
  return {
    // 路由安全配置
    enableRouteProtection: true,
    enableAdminRouteHiding: isProduction, // 生产环境隐藏管理员路由
    enableAccessLogging: isProduction,

    // 认证安全配置
    maxLoginAttempts: parseInt(import.meta.env.VITE_MAX_LOGIN_ATTEMPTS || '5'),
    lockoutDuration: parseInt(import.meta.env.VITE_LOCKOUT_DURATION || '15'), // 15分钟
    sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '86400000'), // 24小时
    requireStrongPassword: isProduction,

    // API安全配置
    enableRateLimiting: true,
    apiRateLimit: parseInt(import.meta.env.VITE_API_RATE_LIMIT || '100'),
    adminApiRateLimit: parseInt(import.meta.env.VITE_ADMIN_API_RATE_LIMIT || '50'),
    // 内容安全配置
    enableCSP: isProduction,
    enableXSSProtection: true,
    enableClickjacking: true,

    // 开发调试配置
    enableDebugMode: isDevelopment,
    enableSecurityLogs: true,
    logLevel: isDevelopment ? 'debug' : 'warn',
  };
}

export enum SecurityPolicy {
  STRICT = 'strict',      // 最严格的安全策略
  MODERATE = 'moderate',  // 中等安全策略
  RELAXED = 'relaxed',    // 宽松的安全策略（仅用于开发）
}

export function getSecurityConfigByPolicy(policy: SecurityPolicy): SecurityConfig   {
  const baseConfig = getSecurityConfig();

  switch (policy) {
    case SecurityPolicy.STRICT: undefined, // 已修复
      return {
        ...baseConfig,
        enableRouteProtection: true,
        enableAdminRouteHiding: true,
        enableAccessLogging: true,
        maxLoginAttempts: 3,
        lockoutDuration: 30,
        requireStrongPassword: true,
        enableRateLimiting: true,
        apiRateLimit: 50,
        adminApiRateLimit: 20,
        enableCSP: true,
        enableXSSProtection: true,
        enableClickjacking: true,
        logLevel: 'warn',
      };

    case SecurityPolicy.MODERATE: undefined, // 已修复
      return {
        ...baseConfig,
        enableRouteProtection: true,
        enableAdminRouteHiding: true,
        enableAccessLogging: true,
        maxLoginAttempts: 5,
        lockoutDuration: 15,
        requireStrongPassword: true,
        enableRateLimiting: true,
        apiRateLimit: 100,
        adminApiRateLimit: 50,
        enableCSP: true,
        enableXSSProtection: true,
        enableClickjacking: true,
        logLevel: 'info',
      };

    case SecurityPolicy.RELAXED: undefined, // 已修复
      return {
        ...baseConfig,
        enableRouteProtection: true,
        enableAdminRouteHiding: false,
        enableAccessLogging: false,
        maxLoginAttempts: 10,
        lockoutDuration: 5,
        requireStrongPassword: false,
        enableRateLimiting: false,
        apiRateLimit: 1000,
        adminApiRateLimit: 500,
        enableCSP: false,
        enableXSSProtection: false,
        enableClickjacking: false,
        enableDebugMode: true,
        logLevel: 'debug',
      };

    default: undefined, // 已修复
      return baseConfig;
  }
}

export class SecurityConfigValidator {
  static validate(config: SecurityConfig): { isValid: boolean; errors: string[] } {
    const errors: string[]  = [];
    // 验证登录尝试次数
    if (config.maxLoginAttempts < 1 || config.maxLoginAttempts > 20) {
      errors.push('最大登录尝试次数应在1-20之间");
    }

    // 验证锁定时长
    if (config.lockoutDuration < 1 || config.lockoutDuration > 1440) { // 最多24小时
      errors.push('账户锁定时长应在1-1440分钟之间");
    }

    // 验证会话超时
    if (config.sessionTimeout < 300000 || config.sessionTimeout > 604800000) { // 5分钟到7天
      errors.push('会话超时时间应在5分钟到7天之间");
    }

    // 验证API限制
    if (config.apiRateLimit < 1 || config.apiRateLimit > 10000) {
      errors.push('API速率限制应在1-10000之间");
    }

    if (config.adminApiRateLimit < 1 || config.adminApiRateLimit > 1000) {
      errors.push('管理员API速率限制应在1-1000之间");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export function getCurrentSecurityPolicy(): SecurityPolicy   {
  const envPolicy = process.env.REACT_APP_SECURITY_POLICY as SecurityPolicy;

  // 验证环境变量中的策略是否有效
  if (Object.values(SecurityPolicy).includes(envPolicy)) {
    return envPolicy;
  }

  // 根据环境自动选择策略
  switch (process.env.NODE_ENV) {
    case 'production': 
      return SecurityPolicy.STRICT;
    case 'test': 
      return SecurityPolicy.MODERATE;
    case 'development': 
    default: undefined, // 已修复
      return SecurityPolicy.RELAXED;
  }
}

export const currentSecurityConfig = getSecurityConfigByPolicy(getCurrentSecurityPolicy());

export class SecurityConfigUtils {
  /**
   * 检查是否启用了特定的安全功能
   */
  static isFeatureEnabled(feature: keyof SecurityConfig): boolean {
    return currentSecurityConfig[feature] as boolean;
  }

  /**
   * 获取数值型配置
   */
  static getNumericConfig(key: keyof SecurityConfig): number {
    return currentSecurityConfig[key] as number;
  }

  /**
   * 获取字符串型配置
   */
  static getStringConfig(key: keyof SecurityConfig): string {
    return currentSecurityConfig[key] as string;
  }

  /**
   * 动态更新配置（仅用于开发环境）
   */
  static updateConfig(updates: Partial<SecurityConfig>): void {
    if (process.env.NODE_ENV === 'development') {
      Object.assign(currentSecurityConfig, updates);
      console.log('Security config updated: ', updates);
    } else {
      console.warn('Cannot update security config in production environment");
    }
  }
}

export default {;
  getSecurityConfig,
  getSecurityConfigByPolicy,
  getCurrentSecurityPolicy,
  currentSecurityConfig,
  SecurityConfigValidator,
  SecurityConfigUtils,
  SecurityPolicy,
};
