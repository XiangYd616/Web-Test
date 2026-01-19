/**
 * 流式通信服务
 * 提供测试进度推送、结果更新、系统通知等实时功能
 */

// 消息类型枚举
export enum MessageType {
  TEST_STARTED = 'test_started',
  TEST_PROGRESS = 'test_progress',
  TEST_COMPLETED = 'test_completed',
  TEST_FAILED = 'test_failed',
  SYSTEM_NOTIFICATION = 'system_notification',
  USER_CONNECTED = 'user_connected',
  USER_DISCONNECTED = 'user_disconnected',
  HEARTBEAT = 'heartbeat',
  ERROR = 'error',
}

// 流式消息接口
export interface StreamingMessage {
  id: string;
  type: MessageType;
  data: unknown;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  roomId?: string;
}

// 订阅者信息接口
export interface Subscriber {
  id: string;
  userId: string;
  sessionId: string;
  socketId: string;
  subscribedAt: Date;
  lastActivity: Date;
  subscriptions: string[];
}

// 测试进度接口
export interface TestProgress {
  testId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep: string;
  totalSteps: number;
  startTime: Date;
  estimatedCompletion?: Date;
  results?: unknown;
  error?: string;
}

// 房间信息接口
export interface Room {
  id: string;
  name: string;
  type: 'public' | 'private';
  participants: string[];
  createdAt: Date;
  lastActivity: Date;
  metadata?: Record<string, unknown>;
}

// 通知接口
export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  data?: unknown;
  timestamp: Date;
  read: boolean;
  userId?: string;
}

// 流式服务配置接口
export interface StreamingServiceConfig {
  maxQueueSize: number;
  batchSize: number;
  processInterval: number;
  retryAttempts: number;
  retryDelay: number;
  heartbeatInterval: number;
  cleanupInterval: number;
}

interface SocketManager {
  emit(event: string, data: unknown): void;
  broadcast(event: string, data: unknown): void;
  joinRoom(socketId: string, roomId: string): void;
  leaveRoom(socketId: string, roomId: string): void;
  getConnectedClients(): string[];
}

interface CacheManager {
  get(key: string): unknown;
  set(key: string, value: unknown, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
}

class StreamingService {
  private socketManager: SocketManager;
  private cache: CacheManager;
  private subscribers: Map<string, Subscriber>;
  private testProgress: Map<string, TestProgress>;
  private messageQueue: StreamingMessage[];
  private isProcessingQueue: boolean;
  private rooms: Map<string, Room>;
  private notifications: Map<string, Notification>;
  private options: StreamingServiceConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;

  constructor(
    socketManager: SocketManager,
    cacheManager: CacheManager,
    config?: Partial<StreamingServiceConfig>
  ) {
    this.socketManager = socketManager;
    this.cache = cacheManager;
    this.subscribers = new Map();
    this.testProgress = new Map();
    this.messageQueue = [];
    this.isProcessingQueue = false;
    this.rooms = new Map();
    this.notifications = new Map();

    this.options = {
      maxQueueSize: 1000,
      batchSize: 10,
      processInterval: 100,
      retryAttempts: 3,
      retryDelay: 1000,
      heartbeatInterval: 30000,
      cleanupInterval: 300000,
      ...config,
    };

    // 启动定时任务
    this.startPeriodicTasks();
  }

  /**
   * 添加订阅者
   */
  addSubscriber(subscriber: Omit<Subscriber, 'id' | 'subscribedAt' | 'lastActivity'>): string {
    const id = this.generateId();
    const fullSubscriber: Subscriber = {
      ...subscriber,
      id,
      subscribedAt: new Date(),
      lastActivity: new Date(),
    };

    this.subscribers.set(id, fullSubscriber);

    // 发送欢迎消息
    this.sendMessage(subscriber.socketId, {
      type: MessageType.USER_CONNECTED,
      data: { message: 'Connected to streaming service' },
    });

    return id;
  }

  /**
   * 移除订阅者
   */
  removeSubscriber(subscriberId: string): boolean {
    const subscriber = this.subscribers.get(subscriberId);
    if (!subscriber) return false;

    // 清理订阅
    subscriber.subscriptions.forEach(roomId => {
      this.leaveRoom(subscriber.socketId, roomId);
    });

    this.subscribers.delete(subscriberId);

    // 发送断开消息
    this.sendMessage(subscriber.socketId, {
      type: MessageType.USER_DISCONNECTED,
      data: { message: 'Disconnected from streaming service' },
    });

    return true;
  }

  /**
   * 订阅房间
   */
  subscribeToRoom(subscriberId: string, roomId: string): boolean {
    const subscriber = this.subscribers.get(subscriberId);
    if (!subscriber) return false;

    if (!subscriber.subscriptions.includes(roomId)) {
      subscriber.subscriptions.push(roomId);
      this.joinRoom(subscriber.socketId, roomId);
    }

    return true;
  }

  /**
   * 取消订阅房间
   */
  unsubscribeFromRoom(subscriberId: string, roomId: string): boolean {
    const subscriber = this.subscribers.get(subscriberId);
    if (!subscriber) return false;

    const index = subscriber.subscriptions.indexOf(roomId);
    if (index > -1) {
      subscriber.subscriptions.splice(index, 1);
      this.leaveRoom(subscriber.socketId, roomId);
    }

    return true;
  }

  /**
   * 发送消息
   */
  sendMessage(socketId: string, message: Omit<StreamingMessage, 'id' | 'timestamp'>): void {
    const fullMessage: StreamingMessage = {
      ...message,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.socketManager.emit(socketId, fullMessage);
  }

  /**
   * 广播消息
   */
  broadcastMessage(message: Omit<StreamingMessage, 'id' | 'timestamp'>): void {
    const fullMessage: StreamingMessage = {
      ...message,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.socketManager.broadcast(fullMessage.type, fullMessage);
  }

  /**
   * 向房间发送消息
   */
  sendToRoom(roomId: string, message: Omit<StreamingMessage, 'id' | 'timestamp'>): void {
    const fullMessage: StreamingMessage = {
      ...message,
      roomId,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.socketManager.emit(roomId, fullMessage);
  }

  /**
   * 更新测试进度
   */
  updateTestProgress(testId: string, progress: Partial<TestProgress>): void {
    const currentProgress = this.testProgress.get(testId) || {
      testId,
      status: 'running',
      progress: 0,
      currentStep: '',
      totalSteps: 0,
      startTime: new Date(),
    };

    const updatedProgress: TestProgress = {
      ...currentProgress,
      ...progress,
    };

    this.testProgress.set(testId, updatedProgress);

    // 广播进度更新
    this.sendToRoom(`test_${testId}`, {
      type: MessageType.TEST_PROGRESS,
      data: updatedProgress,
    });
  }

  /**
   * 完成测试
   */
  completeTest(testId: string, results: unknown): void {
    this.updateTestProgress(testId, {
      status: 'completed',
      progress: 100,
      results,
    });

    this.sendToRoom(`test_${testId}`, {
      type: MessageType.TEST_COMPLETED,
      data: { testId, results },
    });

    // 清理进度数据
    setTimeout(() => {
      this.testProgress.delete(testId);
    }, 60000); // 1分钟后清理
  }

  /**
   * 测试失败
   */
  failTest(testId: string, error: string): void {
    this.updateTestProgress(testId, {
      status: 'failed',
      error,
    });

    this.sendToRoom(`test_${testId}`, {
      type: MessageType.TEST_FAILED,
      data: { testId, error },
    });

    // 清理进度数据
    setTimeout(() => {
      this.testProgress.delete(testId);
    }, 60000);
  }

  /**
   * 创建房间
   */
  createRoom(room: Omit<Room, 'id' | 'createdAt' | 'lastActivity'>): string {
    const id = this.generateId();
    const fullRoom: Room = {
      ...room,
      id,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.rooms.set(id, fullRoom);
    return id;
  }

  /**
   * 删除房间
   */
  deleteRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // 移除所有参与者
    room.participants.forEach(socketId => {
      this.leaveRoom(socketId, roomId);
    });

    this.rooms.delete(roomId);
    return true;
  }

  /**
   * 加入房间
   */
  joinRoom(socketId: string, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (!room.participants.includes(socketId)) {
      room.participants.push(socketId);
      room.lastActivity = new Date();
    }

    this.socketManager.joinRoom(socketId, roomId);
  }

  /**
   * 离开房间
   */
  leaveRoom(socketId: string, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const index = room.participants.indexOf(socketId);
    if (index > -1) {
      room.participants.splice(index, 1);
      room.lastActivity = new Date();
    }

    this.socketManager.leaveRoom(socketId, roomId);
  }

  /**
   * 发送通知
   */
  sendNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): string {
    const id = this.generateId();
    const fullNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      read: false,
    };

    this.notifications.set(id, fullNotification);

    // 如果指定了用户ID，发送给特定用户
    if (notification.userId) {
      const subscriber = Array.from(this.subscribers.values()).find(
        s => s.userId === notification.userId
      );

      if (subscriber) {
        this.sendMessage(subscriber.socketId, {
          type: MessageType.SYSTEM_NOTIFICATION,
          data: fullNotification,
        });
      }
    } else {
      // 广播通知
      this.broadcastMessage({
        type: MessageType.SYSTEM_NOTIFICATION,
        data: fullNotification,
      });
    }

    return id;
  }

  /**
   * 获取测试进度
   */
  getTestProgress(testId: string): TestProgress | undefined {
    return this.testProgress.get(testId);
  }

  /**
   * 获取房间信息
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * 获取所有房间
   */
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * 获取订阅者信息
   */
  getSubscriber(subscriberId: string): Subscriber | undefined {
    return this.subscribers.get(subscriberId);
  }

  /**
   * 获取所有订阅者
   */
  getAllSubscribers(): Subscriber[] {
    return Array.from(this.subscribers.values());
  }

  /**
   * 获取通知
   */
  getNotification(notificationId: string): Notification | undefined {
    return this.notifications.get(notificationId);
  }

  /**
   * 获取用户通知
   */
  getUserNotifications(userId: string): Notification[] {
    return Array.from(this.notifications.values())
      .filter(n => !n.userId || n.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 标记通知为已读
   */
  markNotificationAsRead(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;

    notification.read = true;
    return true;
  }

  /**
   * 发送心跳
   */
  sendHeartbeat(): void {
    this.broadcastMessage({
      type: MessageType.HEARTBEAT,
      data: {
        timestamp: new Date(),
        connectedClients: this.subscribers.size,
        activeRooms: this.rooms.size,
      },
    });
  }

  /**
   * 清理过期数据
   */
  cleanup(): void {
    const now = new Date();
    const expireTime = 5 * 60 * 1000; // 5分钟

    // 清理非活跃订阅者
    for (const [id, subscriber] of this.subscribers.entries()) {
      if (now.getTime() - subscriber.lastActivity.getTime() > expireTime) {
        this.removeSubscriber(id);
      }
    }

    // 清理空房间
    for (const [id, room] of this.rooms.entries()) {
      if (
        room.participants.length === 0 &&
        now.getTime() - room.lastActivity.getTime() > expireTime
      ) {
        this.deleteRoom(id);
      }
    }

    // 清理旧通知
    for (const [id, notification] of this.notifications.entries()) {
      if (now.getTime() - notification.timestamp.getTime() > 24 * 60 * 60 * 1000) {
        // 24小时
        this.notifications.delete(id);
      }
    }

    // 清理完成的测试进度
    for (const [id, progress] of this.testProgress.entries()) {
      if (
        (progress.status === 'completed' || progress.status === 'failed') &&
        now.getTime() - progress.startTime.getTime() > expireTime
      ) {
        this.testProgress.delete(id);
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    subscribers: number;
    activeRooms: number;
    messageQueue: number;
    testProgress: number;
    notifications: number;
  } {
    return {
      subscribers: this.subscribers.size,
      activeRooms: this.rooms.size,
      messageQueue: this.messageQueue.length,
      testProgress: this.testProgress.size,
      notifications: this.notifications.size,
    };
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    // 清理定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    // 清理所有数据
    this.subscribers.clear();
    this.rooms.clear();
    this.testProgress.clear();
    this.notifications.clear();
    this.messageQueue.length = 0;
  }

  /**
   * 启动定时任务
   */
  private startPeriodicTasks(): void {
    // 清理任务
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);

    // 心跳任务
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.options.heartbeatInterval);
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default StreamingService;
