/**
 * 环境变量验证和配置管理
 * 使用 Joi 进行严格的环境变量验证
 */

const Joi = require('joi');
require('dotenv').config();

// 定义环境变量模式
const envSchema = Joi.object({
  // 基础配置
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number()
    .port()
    .default(3001),
  HOST: Joi.string()
    .hostname()
    .default('localhost'),

  // 数据库配置
  DATABASE_URL: Joi.string()
    .uri()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
  DB_HOST: Joi.string()
    .hostname()
    .default('localhost'),
  DB_PORT: Joi.number()
    .port()
    .default(5432),
  DB_NAME: Joi.string()
    .default('testweb_dev'),
  DB_USER: Joi.string()
    .default('postgres'),
  DB_PASSWORD: Joi.string()
    .default('postgres'),
  DB_SSL: Joi.boolean()
    .default(false),

  // 连接池配置
  DB_MAX_CONNECTIONS: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
  DB_MIN_CONNECTIONS: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(5),

  // JWT配置
  JWT_SECRET: Joi.string()
    .min(32)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.default('dev-jwt-secret-please-change-in-production-this-is-not-secure')
    }),
  JWT_EXPIRES_IN: Joi.string()
    .default('24h'),
  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .default('7d'),

  // 会话配置
  SESSION_SECRET: Joi.string()
    .min(32)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.default('dev-session-secret-please-change')
    }),

  // 密码哈希
  BCRYPT_SALT_ROUNDS: Joi.number()
    .integer()
    .min(10)
    .max(15)
    .default(12),

  // CORS配置
  CORS_ORIGIN: Joi.string()
    .default('http://localhost:3000,http://localhost:5174'),

  // 文件上传
  UPLOAD_MAX_SIZE: Joi.number()
    .integer()
    .min(1024)
    .max(52428800) // 50MB
    .default(10485760), // 10MB

  // 日志配置
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),

  // Redis配置（可选）
  REDIS_HOST: Joi.string()
    .hostname()
    .default('localhost'),
  REDIS_PORT: Joi.number()
    .port()
    .default(6379),
  REDIS_PASSWORD: Joi.string()
    .allow('')
    .default(''),

  // 测试引擎配置
  TEST_DEFAULT_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .max(600000)
    .default(300000),
  MAX_CONCURRENT_TESTS: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10),

  // 速率限制
  RATE_LIMIT_WINDOW_MS: Joi.number()
    .integer()
    .default(900000),
  RATE_LIMIT_MAX: Joi.number()
    .integer()
    .default(100)

}).unknown(true); // 允许其他环境变量

// 验证环境变量
const { error, value: validatedEnv } = envSchema.validate(process.env, {
  abortEarly: false, // 返回所有错误
  stripUnknown: false // 保留未知的环境变量
});

if (error) {
  const errorMessages = error.details.map(detail => {
    return `  ❌ ${detail.path.join('.')}: ${detail.message}`;
  }).join('\n');

  console.error('❌ 环境变量验证失败:\n' + errorMessages);
  
  // 仅在生产环境中抛出错误，开发环境显示警告
  if (process.env.NODE_ENV === 'production') {
    throw new Error('环境变量配置错误，请检查 .env 文件');
  } else {
    console.warn('⚠️  使用默认配置继续运行（仅开发环境）');
  }
}

// 导出验证后的环境变量
module.exports = validatedEnv;

// 在开发环境显示配置摘要
if (validatedEnv.NODE_ENV === 'development') {
  console.log('✅ 环境变量已验证:', {
    NODE_ENV: validatedEnv.NODE_ENV,
    PORT: validatedEnv.PORT,
    DB_HOST: validatedEnv.DB_HOST,
    DB_NAME: validatedEnv.DB_NAME,
    LOG_LEVEL: validatedEnv.LOG_LEVEL
  });
}

