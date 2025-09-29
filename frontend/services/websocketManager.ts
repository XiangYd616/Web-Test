/**
 * WebSocket管理器
 * 提供统一的WebSocket连接管理和消息处理
 */

export interface WebSocketMessage {
  type: string;
  testId?: string;
  data?: unknown;
  timestamp?: number;
}

export interface WebSocketConfig {
  url?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export type MessageHandler = (message: WebSocketMessage) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      url: config.url || this.getDefaultWebSocketUrl(),
      autoReconnect: config.autoReconnect ?? true,
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      heartbeatInterval: config.heartbeatInterval || 30000
    };
  }

  /**
   * 获取默认WebSocket URL
   */
  private getDefaultWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host.replace(':5174', ':3001'); // 开发环境端口映射
    return `${protocol}//${host}/ws`;
  }

  /**
   * 连接WebSocket
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.setConnectionStatus('connecting');

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          this.setConnectionStatus('connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          this.setConnectionStatus('disconnected');
          this.stopHeartbeat();
          
          if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket连接错误:', error);
          this.setConnectionStatus('disconnected');
          reject(error);
        };

      } catch (error) {
        console.error('WebSocket连接失败:', error);
        this.setConnectionStatus('disconnected');
        reject(error);
      }
    });
  }

  /**
   * 断开WebSocket连接
   */
  public disconnect(): void {
    this.config.autoReconnect = false; // 禁用自动重连
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setConnectionStatus('disconnected');
  }

  /**
   * 发送消息
   */
  public send(message: WebSocketMessage): boolean {
    if (this.ws.readyState === WebSocket.OPEN) {
      try {
        const messageWithTimestamp = {
          ...message,
          timestamp: Date.now()
        };
        this.ws.send(JSON.stringify(messageWithTimestamp));
        return true;
      } catch (error) {
        console.error('发送WebSocket消息失败:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * 订阅消息类型
   */
  public subscribe(messageType: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    
    this.messageHandlers.get(messageType)!.add(handler);

    // 返回取消订阅函数
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(messageType);
        }
      }
    };
  }

  /**
   * 监听连接状态变化
   */
  public onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    
    // 立即调用一次，提供当前状态
    listener(this.connectionStatus);

    // 返回取消监听函数
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * 获取当前连接状态
   */
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // 处理心跳响应
      if (message.type === 'pong') {
        return;
      }

      // 分发消息给对应的处理器
      const handlers = this.messageHandlers.get(message.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.error(`消息处理器错误 (${message.type}):`, error);
          }
        });
      }

    } catch (error) {
      console.error('WebSocket消息解析错误:', error);
    }
  }

  /**
   * 设置连接状态
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.statusListeners.forEach(listener => {
        try {
          listener(status);
        } catch (error) {
          console.error('状态监听器错误:', error);
        }
      });
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionStatus('reconnecting');


    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect().catch(() => {
        // 重连失败，继续尝试或放弃
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
          console.error('❌ WebSocket重连失败，已达到最大重试次数');
          this.setConnectionStatus('disconnected');
        }
      });
    }, this.config.reconnectInterval);
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// 创建全局WebSocket管理器实例
export const _websocketManager = new WebSocketManager();

export default WebSocketManager;
