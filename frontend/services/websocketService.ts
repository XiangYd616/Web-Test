/**
 * WebSocket服务
 * 处理实时测试进度更新和通信
 */

import {TestProgress, TestResult, TestError} from '../types/testConfig';

export interface WebSocketMessage {
  type: 'progress' | 'complete' | 'error' | 'ping' | 'pong';
  payload: any;
  testId?: string;
  timestamp: string;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private messageHandlers = new Map<string, (message: WebSocketMessage) => void>();

  constructor(private baseUrl?: string) {
    this.baseUrl = baseUrl || this.getWebSocketURL();
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
        reject(new Error('WebSocket连接正在进行中'));
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(`${this.baseUrl}/ws`);

        this.ws.onopen = () => {
          console.log('WebSocket连接已建立');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startPing();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('WebSocket消息解析错误:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket连接已关闭:', event.code, event.reason);
          this.isConnecting = false;
          this.stopPing();
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error);
          this.isConnecting = false;
          reject(new Error('WebSocket连接失败'));
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * 断开WebSocket连接
   */
  disconnect(): void {
    this.stopPing();
    
    if (this.ws) {
      this.ws.close(1000, '客户端主动断开');
      this.ws = null;
    }
    
    this.messageHandlers.clear();
  }

  /**
   * 订阅测试进度更新
   */
  subscribeToTestProgress(
    testId: string,
    onProgress: (progress: TestProgress) => void,
    onComplete: (result: TestResult) => void,
    onError: (error: TestError) => void
  ): () => void {
    const handler = (message: WebSocketMessage) => {
      if (message.testId !== testId) return;

      switch (message.type) {
        case 'progress':
          onProgress(message.payload as TestProgress);
          break;
        case 'complete':
          onComplete(message.payload as TestResult);
          break;
        case 'error':
          onError(new TestError(message.payload.message, message.payload.code));
          break;
      }
    };

    this.messageHandlers.set(testId, handler);

    // 发送订阅消息
    this.send({
      type: 'subscribe',
      payload: { testId },
      timestamp: new Date().toISOString()
    });

    // 返回取消订阅函数
    return () => {
      this.messageHandlers.delete(testId);
      this.send({
        type: 'unsubscribe',
        payload: { testId },
        timestamp: new Date().toISOString()
      });
    };
  }

  /**
   * 发送消息
   */
  private send(message: Partial<WebSocketMessage>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      }));
    } else {
      console.warn('WebSocket未连接，无法发送消息');
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'ping':
        this.send({ type: 'pong', payload: {} });
        break;
      case 'pong':
        // 心跳响应，无需处理
        break;
      default:
        // 分发给相应的处理器
        if (message.testId) {
          const handler = this.messageHandlers.get(message.testId);
          handler?.(message);
        }
        break;
    }
  }

  /**
   * 开始心跳检测
   */
  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping', payload: {} });
    }, 30000); // 每30秒发送一次心跳
  }

  /**
   * 停止心跳检测
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`${delay}ms后尝试第${this.reconnectAttempts}次重连...`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('重连失败:', error);
      });
    }, delay);
  }

  /**
   * 获取WebSocket URL
   */
  private getWebSocketURL(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}`;
  }

  /**
   * 获取连接状态
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 获取连接状态描述
   */
  get connectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'closed';
      default:
        return 'unknown';
    }
  }
}

// 单例实例
export const websocketService = new WebSocketService();

// 页面卸载时自动断开连接
window.addEventListener('beforeunload', () => {
  websocketService.disconnect();
});
