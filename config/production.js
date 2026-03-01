// 生产环境配置
module.exports = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://testweb.example.com'],
      credentials: true
    }
  },

  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'testweb_prod',
    username: process.env.DB_USER || 'testweb',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 5,
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000
    },
    logging: false // 生产环境关闭SQL日志
  },

  // Redis配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0,
    keyPrefix: 'testweb:',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
  },

  // 安全配置
  security: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiration: process.env.JWT_EXPIRATION || '24h',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100, // 限制每个IP 15分钟内最多100个请求
      message: '请求过于频繁，请稍后再试'
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "https://api.testweb.example.com"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    transports: [
      {
        type: 'file',
        filename: 'logs/app.log',
        maxsize: 10485760, // 10MB
        maxFiles: 5,
        colorize: false
      },
      {
        type: 'file',
        level: 'error',
        filename: 'logs/error.log',
        maxsize: 10485760,
        maxFiles: 5,
        colorize: false
      }
    ]
  },

  // 监控配置
  monitoring: {
    enabled: true,
    prometheus: {
      enabled: process.env.PROMETHEUS_ENABLED === 'true',
      port: process.env.PROMETHEUS_PORT || 9090,
      endpoint: '/metrics'
    },
    healthCheck: {
      endpoint: '/health',
      timeout: 5000
    },
    performance: {
      collectMetrics: true,
      sampleRate: 0.1 // 10%采样率
    }
  },

  // 缓存配置
  cache: {
    ttl: {
      default: 300, // 5分钟
      testResults: 3600, // 1小时
      userSessions: 1800, // 30分钟
      configTemplates: 7200 // 2小时
    },
    maxSize: 1000, // 最大缓存条目数
    checkPeriod: 600 // 10分钟检查一次过期项
  },

  // 文件上传配置
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['.json', '.yaml', '.yml', '.txt'],
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    cleanupInterval: 24 * 60 * 60 * 1000 // 24小时清理一次临时文件
  },

  // 邮件配置
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    },
    from: process.env.EMAIL_FROM || 'noreply@testweb.example.com',
    templates: {
      testComplete: 'test-complete',
      errorAlert: 'error-alert'
    }
  },

  // 测试引擎配置
  testEngines: {
    timeout: {
      api: 30000,
      security: 300000, // 5分钟
      stress: 1800000, // 30分钟
      seo: 60000,
      compatibility: 120000,
      ux: 180000,
      website: 60000,
      infrastructure: 300000
    },
    concurrency: {
      max: parseInt(process.env.MAX_CONCURRENT_TESTS) || 10,
      perUser: parseInt(process.env.MAX_TESTS_PER_USER) || 3
    },
    resources: {
      maxMemoryUsage: '1GB',
      maxCpuUsage: '80%'
    }
  },

  // 第三方服务配置
  thirdParty: {
    analytics: {
      enabled: process.env.ANALYTICS_ENABLED === 'true',
      trackingId: process.env.ANALYTICS_TRACKING_ID
    },
    errorTracking: {
      enabled: process.env.ERROR_TRACKING_ENABLED === 'true',
      dsn: process.env.ERROR_TRACKING_DSN
    }
  },

  // 性能配置
  performance: {
    compression: {
      enabled: true,
      level: 6,
      threshold: 1024
    },
    staticFiles: {
      maxAge: 31536000, // 1年
      etag: true,
      lastModified: true
    },
    clustering: {
      enabled: process.env.CLUSTER_ENABLED === 'true',
      workers: process.env.CLUSTER_WORKERS || 'auto'
    }
  },

  // 备份配置
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // 每天凌晨2点
    retention: parseInt(process.env.BACKUP_RETENTION) || 30, // 保留30天
    storage: {
      type: process.env.BACKUP_STORAGE_TYPE || 'local',
      path: process.env.BACKUP_PATH || './backups',
      s3: {
        bucket: process.env.BACKUP_S3_BUCKET,
        region: process.env.BACKUP_S3_REGION,
        accessKeyId: process.env.BACKUP_S3_ACCESS_KEY,
        secretAccessKey: process.env.BACKUP_S3_SECRET_KEY
      }
    }
  }
};
