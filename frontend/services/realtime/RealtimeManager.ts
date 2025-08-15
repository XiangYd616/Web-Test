/**
 * 前端实时连接管理器
 * 提供WebSocket连接管理、消息处理、重连机制等功能
 */

export interface RealtimeMessage {
  type: string;
  data?: any;
  timestamp: string;
}

export interface ConnectionOptions {
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

export interface Subscription {
  id: string;
  channel: string;
  callback: (message: RealtimeMessage) => void;
  options?: any;
}

class RealtimeManager {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private subscriptions = new Map<string, Subscription>();
  private eventListeners = new Map<string, Function[]>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  private options: Required<ConnectionOptions> = {
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    heartbeatInterval: 30000
  };

  constructor(options?: ConnectionOptions) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
  }

  /**
   * 连接到WebSocket服务器
   */
  async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('✅ 实时连接已建立');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          
          this.startHeartbeat();
          this.resubscribeAll();
          this.emit('connected');
          
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.ws.onclose = (event) => {
          console.log('❌ 实时连接已断开', event.code, event.reason);
          this.handleDisconnection();
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error);
          this.isConnecting = false;
          this.emit('error', error);
          reject(error);
        };
        
      } catch (error) {
        this.isConnecting = false;
        console.error('建立实时连接失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.options.autoReconnect = false;
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * 发送消息
   */
  send(message: any): boolean {
    if (!this.isConnected || !this.ws) {
      console.warn('WebSocket未连接，无法发送消息');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('发送消息失败:', error);
      return false;
    }
  }

  /**
   * 订阅频道
   */
  subscribe(channel: string, callback: (message: RealtimeMessage) => void, options?: any): string {
    const subscriptionId = this.generateSubscriptionId();
    
    const subscription: Subscription = {
      id: subscriptionId,
      channel,
      callback,
      options
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    // 如果已连接，立即发送订阅请求
    if (this.isConnected) {
      this.send({
        type: 'subscribe',
        channel,
        options
      });
    }
    
    console.log(`📡 订阅频道: ${channel}`);
    return subscriptionId;
  }

  /**
   * 取消订阅
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;
    
    this.subscriptions.delete(subscriptionId);
    
    // 检查是否还有其他订阅同一频道
    const hasOtherSubscriptions = Array.from(this.subscriptions.values())
      .some(sub => sub.channel === subscription.channel);
    
    // 如果没有其他订阅，发送取消订阅请求
    if (!hasOtherSubscriptions && this.isConnected) {
      this.send({
        type: 'unsubscribe',
        channel: subscription.channel
      });
    }
    
    console.log(`📡 取消订阅频道: ${subscription.channel}`);
  }

  /**
   * 加入房间
   */
  joinRoom(roomId: string, options?: any): void {
    this.send({
      type: 'join_room',
      roomId,
      options
    });
    
    console.log(`🏠 加入房间: ${roomId}`);
  }

  /**
   * 离开房间
   */
  leaveRoom(roomId: string): void {
    this.send({
      type: 'leave_room',
      roomId
    });
    
    console.log(`🚪 离开房间: ${roomId}`);
  }

  /**
   * 广播消息
   */
  broadcast(target: { type: string; id: string }, data: any): void {
    this.send({
      type: 'broadcast',
      target,
      data
    });
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(data: string): void {
    try {
      const message: RealtimeMessage = JSON.parse(data);
      
      // 处理特殊消息类型
      switch (message.type) {
        case 'heartbeat':
          // 心跳响应
          break;
        case 'subscribed':
          this.emit('subscribed', message.data);
          break;
        case 'unsubscribed':
          this.emit('unsubscribed', message.data);
          break;
        case 'error':
          this.emit('error', new Error(message.data?.message || '服务器错误'));
          break;
        default:
          // 分发消息给订阅者
          this.distributeMessage(message);
          break;
      }
      
      // 触发全局消息事件
      this.emit('message', message);
      
    } catch (error) {
      console.error('处理消息失败:', error);
    }
  }

  /**
   * 分发消息给订阅者
   */
  private distributeMessage(message: RealtimeMessage): void {
    for (const subscription of this.subscriptions.values()) {
      // 检查消息是否匹配订阅频道
      if (this.matchesSubscription(message, subscription)) {
        try {
          subscription.callback(message);
        } catch (error) {
          console.error('订阅回调执行失败:', error);
        }
      }
    }
  }

  /**
   * 检查消息是否匹配订阅
   */
  private matchesSubscription(message: RealtimeMessage, subscription: Subscription): boolean {
    // 简单的频道匹配逻辑
    if (message.type === subscription.channel) {
      return true;
    }
    
    // 支持通配符匹配
    if (subscription.channel.includes('*')) {
      const pattern = subscription.channel.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(message.type);
    }
    
    return false;
  }

  /**
   * 处理断开连接
   */
  private handleDisconnection(): void {
    this.isConnected = false;
    this.isConnecting = false;
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    this.emit('disconnected');
    
    // 自动重连
    if (this.options.autoReconnect && this.reconnectAttempts < this.options.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连');
      this.emit('reconnectFailed');
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`${delay}ms后尝试第${this.reconnectAttempts}次重连...`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('重连失败:', error);
      });
    }, delay);
  }

  /**
   * 重新订阅所有频道
   */
  private resubscribeAll(): void {
    const channels = new Set<string>();
    
    for (const subscription of this.subscriptions.values()) {
      if (!channels.has(subscription.channel)) {
        channels.add(subscription.channel);
        this.send({
          type: 'subscribe',
          channel: subscription.channel,
          options: subscription.options
        });
      }
    }
    
    if (channels.size > 0) {
      console.log(`📡 重新订阅 ${channels.size} 个频道`);
    }
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'heartbeat' });
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * 事件监听
   */
  on(event: string, callback: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    this.eventListeners.get(event)!.push(callback);
    
    // 返回取消监听的函数
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * 触发事件
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * 生成订阅ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取连接状态
   */
  getConnectionState() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: this.subscriptions.size
    };
  }
}

// 创建单例实例
export const realtimeManager = new RealtimeManager();

// 自动连接
if (typeof window !== 'undefined') {
  realtimeManager.connect().catch(error => {
    console.error('自动连接实时服务失败:', error);
  });
}

export default RealtimeManager;
