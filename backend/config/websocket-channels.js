/**
 * WebSocket频道和消息类型配置
 * 统一管理所有WebSocket通信频道和消息格式
 * Version: 2.0
 */

/**
 * WebSocket频道定义
 * 所有实时通信必须通过这些预定义频道
 */
const CHANNELS = {
  // 测试相关频道
  TEST_UPDATES: 'test-updates',                    // 通用测试更新
  TEST_PROGRESS: 'test-progress-{testId}',        // 特定测试进度（动态频道）
  TEST_HISTORY: 'test-history-updates',           // 测试历史更新
  STRESS_TEST: 'stress-test-{testId}',           // 压力测试专用（动态频道）
  
  // 队列相关频道
  QUEUE_UPDATES: 'queue-updates',                 // 队列状态更新
  JOB_STATUS: 'job-status-{jobId}',              // 任务状态（动态频道）
  
  // 系统相关频道
  SYSTEM_ALERTS: 'system-alerts',                 // 系统告警
  SYSTEM_MAINTENANCE: 'system-maintenance',       // 系统维护通知
  
  // 用户相关频道
  USER_NOTIFICATIONS: 'user-notifications-{userId}', // 用户通知（动态频道）
  USER_ACTIVITY: 'user-activity',                 // 用户活动
  
  // 协作相关频道
  TEAM_UPDATES: 'team-{teamId}',                 // 团队更新（动态频道）
  SHARED_TESTS: 'shared-tests-{projectId}'       // 共享测试（动态频道）
};

/**
 * 消息事件类型
 */
const MESSAGE_TYPES = {
  // 测试事件
  TEST_STARTED: 'test:started',
  TEST_PROGRESS: 'test:progress',
  TEST_COMPLETED: 'test:completed',
  TEST_FAILED: 'test:failed',
  TEST_CANCELLED: 'test:cancelled',
  
  // 队列事件
  QUEUE_JOB_ADDED: 'queue:job:added',
  QUEUE_JOB_STARTED: 'queue:job:started',
  QUEUE_JOB_PROGRESS: 'queue:job:progress',
  QUEUE_JOB_COMPLETED: 'queue:job:completed',
  QUEUE_JOB_FAILED: 'queue:job:failed',
  QUEUE_STATUS_UPDATED: 'queue:status:updated',
  
  // 测试历史事件
  TEST_RECORD_CREATED: 'test-record:created',
  TEST_RECORD_UPDATED: 'test-record:updated',
  TEST_RECORD_DELETED: 'test-record:deleted',
  
  // 系统事件
  SYSTEM_ALERT: 'system:alert',
  SYSTEM_MAINTENANCE_START: 'system:maintenance:start',
  SYSTEM_MAINTENANCE_END: 'system:maintenance:end',
  
  // 用户事件
  USER_NOTIFICATION: 'user:notification',
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  
  // 连接事件
  CONNECTION_ESTABLISHED: 'connection:established',
  CONNECTION_ERROR: 'connection:error',
  HEARTBEAT_PING: 'heartbeat:ping',
  HEARTBEAT_PONG: 'heartbeat:pong'
};

/**
 * 消息优先级
 */
const MESSAGE_PRIORITY = {
  CRITICAL: 1,    // 关键消息（系统告警、错误）
  HIGH: 2,        // 高优先级（测试完成、重要通知）
  NORMAL: 3,      // 普通消息（进度更新、状态变化）
  LOW: 4          // 低优先级（统计信息、日志）
};

/**
 * 标准消息格式
 * 所有WebSocket消息必须遵循此格式
 */
const MESSAGE_FORMAT = {
  /**
   * 基础消息结构
   * @typedef {Object} BaseMessage
   * @property {string} id - 消息唯一ID
   * @property {string} event - 事件类型 (MESSAGE_TYPES中的值)
   * @property {Object} data - 消息数据
   * @property {string} channel - 频道名称
   * @property {number} priority - 消息优先级
   * @property {number} timestamp - 时间戳
   * @property {string} [userId] - 用户ID（可选）
   */
  createMessage: (event, data, options = {}) => ({
    id: options.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    event,
    data,
    channel: options.channel || null,
    priority: options.priority || MESSAGE_PRIORITY.NORMAL,
    timestamp: Date.now(),
    userId: options.userId || null
  }),
  
  /**
   * 测试进度消息
   */
  createTestProgressMessage: (testId, progress, metrics = {}) => ({
    id: `test_${testId}_${Date.now()}`,
    event: MESSAGE_TYPES.TEST_PROGRESS,
    data: {
      testId,
      progress: Math.min(100, Math.max(0, progress)),
      status: 'running',
      metrics: {
        responseTime: metrics.responseTime || 0,
        throughput: metrics.throughput || 0,
        activeUsers: metrics.activeUsers || 0,
        errorRate: metrics.errorRate || 0,
        successRate: metrics.successRate || 100,
        ...metrics
      },
      message: metrics.message || `测试进度: ${progress}%`
    },
    channel: CHANNELS.TEST_PROGRESS.replace('{testId}', testId),
    priority: MESSAGE_PRIORITY.NORMAL,
    timestamp: Date.now()
  }),
  
  /**
   * 测试完成消息
   */
  createTestCompletedMessage: (testId, results) => ({
    id: `test_${testId}_completed`,
    event: MESSAGE_TYPES.TEST_COMPLETED,
    data: {
      testId,
      status: 'completed',
      results,
      completedAt: new Date().toISOString()
    },
    channel: CHANNELS.TEST_PROGRESS.replace('{testId}', testId),
    priority: MESSAGE_PRIORITY.HIGH,
    timestamp: Date.now()
  }),
  
  /**
   * 队列任务状态消息
   */
  createQueueJobStatusMessage: (jobId, status, data = {}) => ({
    id: `job_${jobId}_${status}`,
    event: `queue:job:${status}`,
    data: {
      jobId,
      status,
      ...data
    },
    channel: CHANNELS.JOB_STATUS.replace('{jobId}', jobId),
    priority: MESSAGE_PRIORITY.NORMAL,
    timestamp: Date.now()
  })
};

/**
 * 生成动态频道名称
 */
const generateChannelName = (template, params) => {
  let channelName = template;
  for (const [key, value] of Object.entries(params)) {
    channelName = channelName.replace(`{${key}}`, value);
  }
  return channelName;
};

/**
 * WebSocket配置
 */
const WEBSOCKET_CONFIG = {
  // Socket.IO配置
  socketIO: {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || [
        "http://localhost:5174",
        "http://127.0.0.1:5174"
      ],
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6,
    transports: ['websocket', 'polling'],
    allowEIO3: true
  },
  
  // 连接限制
  connection: {
    maxConnections: 10000,
    maxConnectionsPerUser: 10,
    maxRoomsPerUser: 50,
    connectionTimeout: 30000,
    idleTimeout: 300000 // 5分钟
  },
  
  // 心跳配置
  heartbeat: {
    interval: 30000,  // 30秒
    timeout: 10000    // 10秒
  },
  
  // 消息队列配置
  messageQueue: {
    maxSize: 1000,
    batchSize: 10,
    processInterval: 100,
    priority: MESSAGE_PRIORITY
  },
  
  // 性能配置
  performance: {
    enableCompression: true,
    enableBatching: true,
    batchDelay: 50,
    maxBatchSize: 100,
    enableStatistics: true
  },
  
  // Redis配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: 2,
    keyPrefix: 'testweb:ws:'
  }
};

module.exports = {
  CHANNELS,
  MESSAGE_TYPES,
  MESSAGE_PRIORITY,
  MESSAGE_FORMAT,
  WEBSOCKET_CONFIG,
  generateChannelName
};

