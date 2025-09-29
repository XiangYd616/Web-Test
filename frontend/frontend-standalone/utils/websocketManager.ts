/**
 * WebSocket 连接管理和优化工具
 * 提供连接管理、重连机制、消息队列、性能监控等功能
 */

import { toast } from 'react-hot-toast';

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  messageQueueLimit?: number;
  timeout?: number;
  enableCompression?: boolean;
  enableBinaryMessages?: boolean;
}

export interface WebSocketMessage {
  id: string;
  type: string;
  data: unknown;
  timestamp: number;
  priority?: 'low' | 'normal' | 'high';
  retry?: number;
}

export interface WebSocketStats {
  connected: boolean;
  connectionTime: number;
  reconnectAttempts: number;
  messagesSent: number;
  messagesReceived: number;
  bytesTransferred: number;
  averageLatency: number;
  errors: number;
  lastError?: string;
}

export type WebSocketEventType = 
  | 'connecting'
  | 'connected' 
  | 'disconnected'
  | 'reconnecting'
  | 'error'
  | 'message'
  | 'heartbeat';

export type WebSocketEventListener = (event: unknown) => void;

/**
 * WebSocket连接管理器
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private messageQueue: WebSocketMessage[] = [];
  private pendingMessages = new Map<string, WebSocketMessage>();
  private eventListeners = new Map<WebSocketEventType, Set<WebSocketEventListener>>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionStartTime: number = 0;
  private stats: WebSocketStats;
  private isReconnecting = false;
  private shouldReconnect = true;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectInterval: 3000,
      heartbeatInterval: 30000,
      messageQueueLimit: 100,
      timeout: 10000,
      enableCompression: true,
      enableBinaryMessages: false,
      protocols: [],
      ...config
    };

    this.stats = {
      connected: false,
      connectionTime: 0,
      reconnectAttempts: 0,
      messagesSent: 0,
      messagesReceived: 0,
      bytesTransferred: 0,
      averageLatency: 0,
      errors: 0
    };
  }

  /**
   * 建立WebSocket连接
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.connectionStartTime = Date.now();
        this.emit('connecting', { url: this.config.url });

        // 创建WebSocket连接
        this.ws = new WebSocket(this.config.url, this.config.protocols);

        // 启用压缩（如果支持）
        if (this.config.enableCompression) {
          // 注意：浏览器的WebSocket API不直接支持设置压缩，这通常由浏览器自动处理
          // 这里只是作为配置参数，实际压缩由浏览器和服务器协商
        }

        // 连接成功
        this.ws.onopen = () => {
          this.stats.connected = true;
          this.stats.connectionTime = Date.now() - this.connectionStartTime;
          this.stats.reconnectAttempts = 0;
          this.isReconnecting = false;

          this.emit('connected', {
            connectionTime: this.stats.connectionTime
          });

          // 处理排队的消息
          this.processMessageQueue();

          // 启动心跳
          this.startHeartbeat();

          resolve();
        };

        // 接收消息
        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        // 连接错误
        this.ws.onerror = (event) => {
          this.stats.errors++;
          this.stats.lastError = 'Connection error';
          this.emit('error', event);
          reject(new Error('WebSocket connection error'));
        };

        // 连接关闭
        this.ws.onclose = (event) => {
          this.stats.connected = false;
          this.stopHeartbeat();

          this.emit('disconnected', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });

          // 自动重连
          if (this.shouldReconnect && !this.isReconnecting) {
            this.scheduleReconnect();
          }
        };

        // 连接超时处理
        setTimeout(() => {
          if (!this.stats.connected) {
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, this.config.timeout);

      } catch (error) {
        this.stats.errors++;
        this.stats.lastError = error instanceof Error ? error.message : 'Unknown error';
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    this.shouldReconnect = false;
    this.stopHeartbeat();
    this.clearReconnectTimer();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    
    this.stats.connected = false;
  }

  /**
   * 发送消息
   */
  public send(type: string, data: unknown, options: {
    priority?: 'low' | 'normal' | 'high';
    timeout?: number;
    retry?: boolean;
  } = {}): Promise<void> {
    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type,
      data,
      timestamp: Date.now(),
      priority: options.priority || 'normal',
      retry: options.retry ? 3 : 0
    };

    return this.sendMessage(message, options.timeout);
  }

  /**
   * 发送消息（内部）
   */
  private sendMessage(message: WebSocketMessage, timeout?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        // 如果未连接，将消息加入队列
        this.queueMessage(message);
        resolve(); // 假设稍后会发送
        return;
      }

      try {
        const payload = JSON.stringify(message);
        this.ws!.send(payload);

        this.stats.messagesSent++;
        this.stats.bytesTransferred += payload.length;

        // 如果需要确认，添加到待确认消息
        if (timeout) {
          this.pendingMessages.set(message.id, message);
          setTimeout(() => {
            if (this.pendingMessages.has(message.id)) {
              this.pendingMessages.delete(message.id);
              reject(new Error('Message timeout'));
            }
          }, timeout);
        }

        resolve();
      } catch (error) {
        this.stats.errors++;
        reject(error);
      }
    });
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(event: MessageEvent): void {
    try {
      let message;
      
      if (typeof event.data === 'string') {
        message = JSON.parse(event.data);
      } else if (this.config.enableBinaryMessages && event.data instanceof ArrayBuffer) {
        // 处理二进制消息
        message = this.parseBinaryMessage(event.data);
      } else {
        console.warn('Unsupported message format:', typeof event.data);
        return;
      }

      this.stats.messagesReceived++;
      this.stats.bytesTransferred += (typeof event.data === 'string' ? event.data.length : event.data.byteLength) || 0;

      // 处理确认消息
      if (message.type === 'ack' && message.messageId) {
        this.handleAckMessage(message.messageId);
        return;
      }

      // 处理心跳响应
      if (message.type === 'pong') {
        this.handlePongMessage(message);
        return;
      }

      // 触发消息事件
      this.emit('message', message);

    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error instanceof Error ? error.message : 'Message parsing error';
      console.error('Error handling WebSocket message:', error);
    }
  }

  /**
   * 处理确认消息
   */
  private handleAckMessage(messageId: string): void {
    if (this.pendingMessages.has(messageId)) {
      this.pendingMessages.delete(messageId);
    }
  }

  /**
   * 处理心跳响应
   */
  private handlePongMessage(message: unknown): void {
    if (message.timestamp) {
      const latency = Date.now() - message.timestamp;
      this.updateLatency(latency);
      this.emit('heartbeat', { latency });
    }
  }

  /**
   * 更新延迟统计
   */
  private updateLatency(latency: number): void {
    if (this.stats.averageLatency === 0) {
      this.stats.averageLatency = latency;
    } else {
      // 使用指数移动平均
      this.stats.averageLatency = this.stats.averageLatency * 0.9 + latency * 0.1;
    }
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send('ping', { timestamp: Date.now() })
          .catch(() => {
            // 心跳失败，可能连接有问题
            console.warn('Heartbeat failed');
          });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.isReconnecting || this.stats.reconnectAttempts >= this.config.reconnectAttempts) {
      return;
    }

    this.isReconnecting = true;
    this.stats.reconnectAttempts++;

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.stats.reconnectAttempts - 1),
      30000 // 最大30秒
    );

    this.emit('reconnecting', {
      attempt: this.stats.reconnectAttempts,
      delay
    });

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.isReconnecting = false;
        
        if (this.stats.reconnectAttempts < this.config.reconnectAttempts) {
          this.scheduleReconnect();
        } else {
          this.emit('error', new Error('Max reconnection attempts reached'));
          toast.error('连接失败，已达到最大重试次数');
        }
      }
    }, delay);
  }

  /**
   * 清除重连定时器
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 将消息加入队列
   */
  private queueMessage(message: WebSocketMessage): void {
    // 按优先级排序
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    
    // 如果队列已满，删除低优先级的旧消息
    if (this.messageQueue.length >= this.config.messageQueueLimit) {
      this.messageQueue = this.messageQueue
        .sort((a, b) => {
          const priorityDiff = priorityOrder[a?.priority!] - priorityOrder[b.priority!];
          if (priorityDiff !== 0) return priorityDiff;
          return a?.timestamp - b.timestamp;
        })
        .slice(0, this.config.messageQueueLimit - 1);
    }

    this.messageQueue.push(message);
  }

  /**
   * 处理消息队列
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift()!;
      this.sendMessage(message).catch(error => {
        console.error('Failed to send queued message:', error);
        
        // 如果允许重试
        if (message.retry && message.retry > 0) {
          message.retry--;
          this.queueMessage(message);
        }
      });
    }
  }

  /**
   * 解析二进制消息
   */
  private parseBinaryMessage(buffer: ArrayBuffer): unknown {
    // 这里可以实现自定义的二进制协议解析
    // 例如使用 MessagePack、Protocol Buffers 等
    try {
      const decoder = new TextDecoder();
      const text = decoder.decode(buffer);
      return JSON.parse(text);
    } catch (error) {
      throw new Error('Failed to parse binary message');
    }
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 检查连接状态
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * 添加事件监听器
   */
  public on(event: WebSocketEventType, listener: WebSocketEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * 移除事件监听器
   */
  public off(event: WebSocketEventType, listener: WebSocketEventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * 触发事件
   */
  private emit(event: WebSocketEventType, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 获取连接统计信息
   */
  public getStats(): WebSocketStats {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  public resetStats(): void {
    this.stats = {
      connected: this.stats.connected,
      connectionTime: 0,
      reconnectAttempts: 0,
      messagesSent: 0,
      messagesReceived: 0,
      bytesTransferred: 0,
      averageLatency: 0,
      errors: 0
    };
  }

  /**
   * 获取连接状态信息
   */
  public getConnectionInfo(): {
    state: string;
    url: string;
    protocol?: string;
    extensions?: string;
    bufferedAmount?: number;
  } {
    if (!this.ws) {
      return {
        state: 'disconnected',
        url: this.config.url
      };
    }

    return {
      state: this.getReadyState(),
      url: this.ws.url,
      protocol: this.ws.protocol,
      extensions: this.ws.extensions,
      bufferedAmount: this.ws.bufferedAmount
    };
  }

  /**
   * 获取连接状态字符串
   */
  private getReadyState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'open';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    this.shouldReconnect = false;
    this.disconnect();
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.messageQueue = [];
    this.pendingMessages.clear();
    this.eventListeners.clear();
  }
}

/**
 * WebSocket管理器工厂函数
 */
export function createWebSocketManager(config: WebSocketConfig): WebSocketManager {
  return new WebSocketManager(config);
}

/**
 * 默认WebSocket配置
 */
export const defaultWebSocketConfig: Partial<WebSocketConfig> = {
  reconnectAttempts: 5,
  reconnectInterval: 3000,
  heartbeatInterval: 30000,
  messageQueueLimit: 100,
  timeout: 10000,
  enableCompression: true,
  enableBinaryMessages: false
};

/**
 * React Hook for WebSocket
 */
export function useWebSocket(url: string, config?: Partial<WebSocketConfig>) {
  const [manager] = React.useState(() => 
    createWebSocketManager({ url, ...defaultWebSocketConfig, ...config })
  );
  
  const [isConnected, setIsConnected] = React.useState(false);
  const [stats, setStats] = React.useState<WebSocketStats>(manager.getStats());

  React.useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleStatsUpdate = () => setStats(manager.getStats());

    manager.on('connected', handleConnect);
    manager.on('disconnected', handleDisconnect);
    manager.on('message', handleStatsUpdate);
    manager.on('error', handleStatsUpdate);

    // 自动连接
    manager.connect().catch(console.error);

    return () => {
      manager.off('connected', handleConnect);
      manager.off('disconnected', handleDisconnect);
      manager.off('message', handleStatsUpdate);
      manager.off('error', handleStatsUpdate);
      manager.destroy();
    };
  }, [manager]);

  return {
    manager,
    isConnected,
    stats,
    send: manager.send.bind(manager),
    disconnect: manager.disconnect.bind(manager),
    connect: manager.connect.bind(manager)
  };
}

// 需要导入React以用于Hook
import React from 'react';
