/**
 * WebSocket客户端服务
 * 提供与后端WebSocket服务的实时通信功能
 */

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface TestProgressData {
  testId: string;
  progress: number;
  currentStep: number;
  totalSteps: number;
  message: string;
  timestamp: string;
}

interface TestStatusData {
  testId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  timestamp: string;
}

interface TestCompletedData {
  testId: string;
  success: boolean;
  results: any;
  timestamp: string;
}

interface TestErrorData {
  testId: string;
  error: {
    message: string;
    type: string;
    stack?: string;
  };
  timestamp: string;
}

type EventCallback = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private eventListeners = new Map<string, Set<EventCallback>>();
  private subscriptions = new Set<string>();
  private clientId: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * 连接到WebSocket服务器
   */
  async connect(token?: string): Promise<boolean> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return true;
    }

    this.isConnecting = true;

    try {
      // 获取token
      const authToken = token || this.getAuthToken();
      if (!authToken) {
        
        console.warn('⚠️ 无法连接WebSocket: 缺少认证token');
        this.isConnecting = false;
        return false;
      }

      // 构建WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}/${host}/ws?token=${encodeURIComponent(authToken)}`;

      console.log('🔌 正在连接WebSocket服务器...');
      
      this.ws = new WebSocket(wsUrl);
      
      return new Promise((resolve, reject) => {
        if (!this.ws) {
          
        reject(new Error('WebSocket创建失败'));
          return;
      }

        const timeout = setTimeout(() => {
          reject(new Error('WebSocket连接超时'));
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          console.log('✅ WebSocket连接成功');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connected', {});
          resolve(true);
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ WebSocket连接错误:', error);
          this.isConnecting = false;
          this.emit('error', { error });
          reject(error);
        };

        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          console.log('🔌 WebSocket连接已关闭:', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.emit('disconnected', { code: event.code, reason: event.reason });
          
          // 自动重连
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      });

    } catch (error) {
      console.error('❌ WebSocket连接失败:', error);
      this.isConnecting = false;
      return false;
    }
  }

  /**
   * 断开WebSocket连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.stopHeartbeat();
    this.subscriptions.clear();
    console.log('🔌 WebSocket已断开连接');
  }

  /**
   * 发送消息
   */
  send(message: WebSocketMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      
        console.warn('⚠️ WebSocket未连接，无法发送消息');
      return false;
      }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('❌ 发送WebSocket消息失败:', error);
      return false;
    }
  }

  /**
   * 订阅测试进度
   */
  subscribeToTest(testId: string): boolean {
    const subscription = `test:${testId}`;
    
    if (this.subscriptions.has(subscription)) {
      return true;
    }

    const success = this.send({
      type: 'subscribe_test',
      testId
    });

    if (success) {
      this.subscriptions.add(subscription);
      console.log(`📡 已订阅测试: ${testId}`);
    }

    return success;
  }

  /**
   * 取消订阅测试进度
   */
  unsubscribeFromTest(testId: string): boolean {
    const subscription = `test:${testId}`;
    
    if (!this.subscriptions.has(subscription)) {
      return true;
    }

    const success = this.send({
      type: 'unsubscribe_test',
      testId
    });

    if (success) {
      this.subscriptions.delete(subscription);
      console.log(`📡 已取消订阅测试: ${testId}`);
    }

    return success;
  }

  /**
   * 加入房间
   */
  joinRoom(roomName: string): boolean {
    return this.send({
      type: 'join_room',
      room: roomName
    });
  }

  /**
   * 离开房间
   */
  leaveRoom(roomName: string): boolean {
    return this.send({
      type: 'leave_room',
      room: roomName
    });
  }

  /**
   * 添加事件监听器
   */
  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, callback?: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      return;
    }

    if (callback) {
      this.eventListeners.get(event)!.delete(callback);
    } else {
      this.eventListeners.get(event)!.clear();
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ 事件监听器执行失败 (${event}):`, error);
        }
      });
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      
      console.log(`📨 收到WebSocket消息:`, message.type);

      switch (message.type) {
        case 'connection_established':
          this.clientId = message.clientId;
          break;

        case 'test_progress':
          this.emit('testProgress', message as TestProgressData);
          break;

        case 'test_status_update':
          this.emit('testStatusUpdate', message as TestStatusData);
          break;

        case 'test_completed':
          this.emit('testCompleted', message as TestCompletedData);
          break;

        case 'test_error':
          this.emit('testError', message as TestErrorData);
          break;

        case 'subscription_confirmed':
        case 'unsubscription_confirmed':
        case 'room_joined':
        case 'room_left':
          console.log(`✅ ${message.type}: ${message.subscription || message.room}`);
          break;

        case 'pong':
          // 心跳响应，不需要特殊处理
          break;

        case 'error':
          console.error('❌ WebSocket服务器错误:', message.message);
          this.emit('serverError', message);
          break;

        default:
          console.log(`⚠️ 未知消息类型: ${message.type}`);
          this.emit('unknownMessage', message);
      }

    } catch (error) {
      console.error('❌ 解析WebSocket消息失败:', error);
    }
  }

  /**
   * 获取认证token
   */
  private getAuthToken(): string | null {
    // 从localStorage或其他地方获取token
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 ${delay}ms后尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * 开始心跳检测
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000); // 每30秒发送一次心跳
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 设置默认事件监听器
   */
  private setupEventListeners(): void {
    // 页面卸载时断开连接
    window.addEventListener('beforeunload', () => {
      this.disconnect();
    });

    // 页面可见性变化时处理连接
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.ws) {
        this.connect();
      }
    });
  }

  /**
   * 获取连接状态
   */
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * 获取客户端ID
   */
  get id(): string | null {
    return this.clientId;
  }
}

// 创建单例实例
const webSocketClient = new WebSocketClient();

export default webSocketClient;
export type { TestProgressData, TestStatusData, TestCompletedData, TestErrorData };
