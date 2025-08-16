/**
 * WebSocket 实时通信服务
 * 管理与后端的实时数据通信
 */

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  id?: string;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

export interface WebSocketEventHandlers {
  onOpen?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onReconnect?: (attempt: number) => void;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private handlers: WebSocketEventHandlers = {};
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private messageQueue: WebSocketMessage[] = [];

  constructor(config?: Partial<WebSocketConfig>) {
    this.config = {
      url: process.env.REACT_APP_WS_URL || 'ws://localhost:3001/ws',
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      ...config
    };
  }

  /**
   * 连接WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = (event) => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.processMessageQueue();
          
          if (this.handlers.onOpen) {
            this.handlers.onOpen(event);
          }
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            if (this.handlers.onMessage) {
              this.handlers.onMessage(message);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          this.isConnecting = false;
          this.stopHeartbeat();
          
          if (this.handlers.onClose) {
            this.handlers.onClose(event);
          }

          // 自动重连
          if (!event.wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (event) => {
          this.isConnecting = false;
          
          if (this.handlers.onError) {
            this.handlers.onError(event);
          }
          
          reject(new Error('WebSocket connection failed'));
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.reconnectAttempts = 0;
  }

  /**
   * 发送消息
   */
  send(message: Omit<WebSocketMessage, 'timestamp' | 'id'>): void {
    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: Date.now(),
      id: this.generateMessageId()
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(fullMessage));
    } else {
      // 如果连接未建立，将消息加入队列
      this.messageQueue.push(fullMessage);
    }
  }

  /**
   * 设置事件处理器
   */
  setEventHandlers(handlers: WebSocketEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * 获取连接状态
   */
  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 订阅特定类型的消息
   */
  subscribe(messageType: string, handler: (data: any) => void): () => void {
    const originalHandler = this.handlers.onMessage;
    
    this.handlers.onMessage = (message) => {
      if (message.type === messageType) {
        handler(message.data);
      }
      if (originalHandler) {
        originalHandler(message);
      }
    };

    // 返回取消订阅函数
    return () => {
      this.handlers.onMessage = originalHandler;
    };
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    
    if (this.handlers.onReconnect) {
      this.handlers.onReconnect(this.reconnectAttempts);
    }

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(console.error);
    }, this.config.reconnectInterval);
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'ping',
          data: { timestamp: Date.now() }
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
   * 处理消息队列
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws!.send(JSON.stringify(message));
      }
    }
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 创建单例实例
const websocketService = new WebSocketService();

export default websocketService;
export { WebSocketService };
