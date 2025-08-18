/**
 * 完整的WebSocket实时通信服务
 * 提供实时测试状态更新、通知推送和双向通信功能
 * 支持自动重连、心跳检测和消息队列管理
 */

// WebSocket消息类型枚举
export enum WebSocketMessageType {
  // 测试相关
  TEST_STARTED = 'test_started',
  TEST_PROGRESS = 'test_progress',
  TEST_COMPLETED = 'test_completed',
  TEST_FAILED = 'test_failed',
  TEST_CANCELLED = 'test_cancelled',
  
  // 通知相关
  NOTIFICATION = 'notification',
  SYSTEM_ALERT = 'system_alert',
  USER_MESSAGE = 'user_message',
  
  // 系统相关
  SYSTEM_STATUS = 'system_status',
  USER_ACTIVITY = 'user_activity',
  RESOURCE_UPDATE = 'resource_update',
  
  // 连接相关
  PING = 'ping',
  PONG = 'pong',
  AUTH = 'auth',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe'
}

// WebSocket连接状态枚举
export enum WebSocketState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// WebSocket消息接口
export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  data: T;
  timestamp: string;
  id?: string;
  userId?: string;
  channel?: string;
}

// 测试进度消息
export interface TestProgressMessage {
  testId: string;
  status: string;
  progress: number;
  currentStep: string;
  totalSteps: number;
  message?: string;
  estimatedTimeRemaining?: number;
}

// 通知消息
export interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error'
  title: string;
  message: string;
  actions?: Array<{
    label: string;
    action: string;
    variant?: 'primary' | 'secondary'
  }>;
  duration?: number;
  persistent?: boolean;
}

// 系统状态消息
export interface SystemStatusMessage {
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: Record<string, {
    status: string;
    responseTime: number;
    lastCheck: string;
  }>;
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    activeConnections: number;
    requestsPerSecond: number;
  };
}

// WebSocket事件接口
export interface WebSocketEvents {
  onConnect: () => void;
  onDisconnect: (reason: string) => void;
  onError: (error: Error) => void;
  onMessage: (message: WebSocketMessage) => void;
  onStateChange: (state: WebSocketState) => void;
  onTestProgress: (progress: TestProgressMessage) => void;
  onNotification: (notification: NotificationMessage) => void;
  onSystemStatus: (status: SystemStatusMessage) => void;
}

// WebSocket配置接口
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
  autoReconnect?: boolean;
  debug?: boolean;
}

// 完整WebSocket服务类
export class CompleteWebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private state: WebSocketState = WebSocketState.DISCONNECTED;
  private events: Partial<WebSocketEvents> = {};
  private messageQueue: WebSocketMessage[] = [];
  private subscriptions: Set<string> = new Set();
  private reconnectAttempts: number = 0;
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private lastPingTime: number = 0;
  private latency: number = 0;

  constructor(config: WebSocketConfig) {
    this.config = {
      protocols: [],
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      messageQueueSize: 100,
      autoReconnect: true,
      debug: false,
      ...config
    };
  }

  // 注册事件监听器
  on<K extends keyof WebSocketEvents>(event: K, handler: WebSocketEvents[K]): void {
    this.events[event] = handler;
  }

  // 移除事件监听器
  off<K extends keyof WebSocketEvents>(event: K): void {
    delete this.events[event];
  }

  // 触发事件
  private emit<K extends keyof WebSocketEvents>(
    event: K,
    ...args: Parameters<WebSocketEvents[K]>
  ): void {
    const handler = this.events[event];
    if (handler) {
      try {
        (handler as any)(...args);
      } catch (error) {
        this.log('Error in event handler:', error);
      }
    }
  }

  // 连接WebSocket
  async connect(): Promise<void> {
    if (this.state === WebSocketState.CONNECTED || this.state === WebSocketState.CONNECTING) {
      return;
    }

    this.setState(WebSocketState.CONNECTING);
    this.log('Connecting to WebSocket:', this.config.url);

    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols);
      this.setupEventHandlers();
    } catch (error) {
      this.setState(WebSocketState.ERROR);
      this.emit('onError', error as Error);
      throw error;
    }
  }

  // 断开连接
  disconnect(): void {
    this.config.autoReconnect = false;
    this.clearTimers();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.setState(WebSocketState.DISCONNECTED);
    this.log('Disconnected from WebSocket');
  }

  // 发送消息
  send<T>(type: WebSocketMessageType, data: T, channel?: string): void {
    const message: WebSocketMessage<T> = {
      type,
      data,
      timestamp: new Date().toISOString(),
      id: this.generateMessageId(),
      channel
    };

    if (this.state === WebSocketState.CONNECTED && this.ws) {
      try {
        this.ws.send(JSON.stringify(message));
        this.log('Sent message:', message);
      } catch (error) {
        this.log('Error sending message:', error);
        this.queueMessage(message);
      }
    } else {
      this.queueMessage(message);
    }
  }

  // 订阅频道
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send(WebSocketMessageType.SUBSCRIBE, { channel });
    this.log('Subscribed to channel:', channel);
  }

  // 取消订阅频道
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send(WebSocketMessageType.UNSUBSCRIBE, { channel });
    this.log('Unsubscribed from channel:', channel);
  }

  // 认证
  authenticate(token: string): void {
    this.send(WebSocketMessageType.AUTH, { token });
    this.log('Sent authentication token');
  }

  // 获取连接状态
  getState(): WebSocketState {
    return this.state;
  }

  // 获取连接延迟
  getLatency(): number {
    return this.latency;
  }

  // 获取订阅列表
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  // 获取消息队列大小
  getQueueSize(): number {
    return this.messageQueue.length;
  }

  // 私有方法

  // 设置WebSocket事件处理器
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.setState(WebSocketState.CONNECTED);
      this.reconnectAttempts = 0;
      this.emit('onConnect');
      this.log('WebSocket connected');
      
      // 发送认证信息
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (token) {
        this.authenticate(token);
      }
      
      // 重新订阅频道
      this.subscriptions.forEach(channel => {
        this.send(WebSocketMessageType.SUBSCRIBE, { channel });
      });
      
      // 发送队列中的消息
      this.flushMessageQueue();
      
      // 启动心跳
      this.startHeartbeat();
    };

    this.ws.onclose = (event) => {
      this.setState(WebSocketState.DISCONNECTED);
      this.clearTimers();
      this.emit('onDisconnect', event.reason || 'Connection closed');
      this.log('WebSocket closed:', event.code, event.reason);
      
      if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      this.setState(WebSocketState.ERROR);
      const error = new Error('WebSocket error');
      this.emit('onError', error);
      this.log('WebSocket error:', event);
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        this.log('Error parsing message:', error);
      }
    };
  }

  // 处理接收到的消息
  private handleMessage(message: WebSocketMessage): void {
    this.log('Received message:', message);
    this.emit('onMessage', message);

    // 处理特定类型的消息
    switch (message.type) {
      case WebSocketMessageType.PONG:
        this.handlePong();
        break;
        
      case WebSocketMessageType.TEST_PROGRESS:
        this.emit('onTestProgress', message.data as TestProgressMessage);
        break;
        
      case WebSocketMessageType.NOTIFICATION:
        this.emit('onNotification', message.data as NotificationMessage);
        break;
        
      case WebSocketMessageType.SYSTEM_STATUS:
        this.emit('onSystemStatus', message.data as SystemStatusMessage);
        break;
        
      case WebSocketMessageType.TEST_STARTED:
      case WebSocketMessageType.TEST_COMPLETED:
      case WebSocketMessageType.TEST_FAILED:
      case WebSocketMessageType.TEST_CANCELLED:
        this.emit('onTestProgress', message.data as TestProgressMessage);
        break;
    }
  }

  // 设置连接状态
  private setState(state: WebSocketState): void {
    if (this.state !== state) {
      this.state = state;
      this.emit('onStateChange', state);
    }
  }

  // 队列消息
  private queueMessage(message: WebSocketMessage): void {
    if (this.messageQueue.length >= this.config.messageQueueSize) {
      this.messageQueue.shift(); // 移除最旧的消息
    }
    this.messageQueue.push(message);
    this.log('Queued message:', message);
  }

  // 发送队列中的消息
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.state === WebSocketState.CONNECTED) {
      const message = this.messageQueue.shift();
      if (message && this.ws) {
        try {
          this.ws.send(JSON.stringify(message));
          this.log('Sent queued message:', message);
        } catch (error) {
          this.log('Error sending queued message:', error);
          this.messageQueue.unshift(message); // 重新放回队列
          break;
        }
      }
    }
  }

  // 启动心跳
  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.state === WebSocketState.CONNECTED) {
        this.lastPingTime = Date.now();
        this.send(WebSocketMessageType.PING, {});
      }
    }, this.config.heartbeatInterval);
  }

  // 处理心跳响应
  private handlePong(): void {
    if (this.lastPingTime > 0) {
      this.latency = Date.now() - this.lastPingTime;
      this.lastPingTime = 0;
    }
  }

  // 清除心跳定时器
  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // 安排重连
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    this.setState(WebSocketState.RECONNECTING);
    
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // 最大30秒
    );

    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch(error => {
        this.log('Reconnect failed:', error);
      });
    }, delay);
  }

  // 清除所有定时器
  private clearTimers(): void {
    this.clearHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // 生成消息ID
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // 日志输出
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[WebSocket]', ...args);
    }
  }

  // 获取连接统计信息
  getStats(): {
    state: WebSocketState;
    latency: number;
    reconnectAttempts: number;
    queueSize: number;
    subscriptions: number;
    uptime: number;
  } {
    return {
      state: this.state,
      latency: this.latency,
      reconnectAttempts: this.reconnectAttempts,
      queueSize: this.messageQueue.length,
      subscriptions: this.subscriptions.size,
      uptime: this.state === WebSocketState.CONNECTED ? Date.now() - this.lastPingTime : 0
    };
  }

  // 清空消息队列
  clearQueue(): void {
    this.messageQueue.length = 0;
    this.log('Message queue cleared');
  }

  // 更新配置
  updateConfig(config: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...config };
    this.log('Configuration updated:', config);
  }
}

// 创建默认WebSocket服务实例
const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3001/ws'
export const completeWebSocketService = new CompleteWebSocketService({
  url: wsUrl,
  autoReconnect: true,
  debug: process.env.NODE_ENV === 'development'
});

// 便捷方法
export const webSocketUtils = {
  // 连接并认证
  connectAndAuth: async (token?: string) => {
    await completeWebSocketService.connect();
    if (token) {
      completeWebSocketService.authenticate(token);
    }
  },

  // 订阅测试更新
  subscribeToTests: (testIds: string[]) => {
    testIds.forEach(testId => {
      completeWebSocketService.subscribe(`test:${testId}`);
    });
  },

  // 订阅用户通知
  subscribeToNotifications: (userId: string) => {
    completeWebSocketService.subscribe(`user:${userId}:notifications`);
  },

  // 订阅系统状态
  subscribeToSystemStatus: () => {
    completeWebSocketService.subscribe('system:status');
  },

  // 发送测试命令
  sendTestCommand: (testId: string, command: string, data?: any) => {
    completeWebSocketService.send(WebSocketMessageType.TEST_PROGRESS, {
      testId,
      command,
      data
    }, `test:${testId}`);
  }
};

export default CompleteWebSocketService;
