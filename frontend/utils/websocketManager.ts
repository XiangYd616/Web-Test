/**
 * WebSocket ���ӹ�����Ż�����
 * �ṩ���ӹ����������ơ���Ϣ���С����ܼ�صȹ���
 */

import Logger from '@/utils/logger';
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
  data: any;
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

export type WebSocketEventListener = (event: any) => void;

/**
 * WebSocket���ӹ�����
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
   * ����WebSocket����
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.connectionStartTime = Date.now();
        this.emit('connecting', { url: this.config.url });

        // ����WebSocket����
        this.ws = new WebSocket(this.config.url, this.config.protocols);

        // ����ѹ�������֧�֣�
        if (this.config.enableCompression) {
          // ע�⣺�������WebSocket API��ֱ��֧������ѹ������ͨ����������Զ�����
          // ����ֻ����Ϊ���ò�����ʵ��ѹ����������ͷ�����Э��
        }

        // ���ӳɹ�
        this.ws.onopen = () => {
          this.stats.connected = true;
          this.stats.connectionTime = Date.now() - this.connectionStartTime;
          this.stats.reconnectAttempts = 0;
          this.isReconnecting = false;

          this.emit('connected', {
            connectionTime: this.stats.connectionTime
          });

          // �����Ŷӵ���Ϣ
          this.processMessageQueue();

          // ��������
          this.startHeartbeat();

          resolve();
        };

        // ������Ϣ
        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        // ���Ӵ���
        this.ws.onerror = (event) => {
          this.stats.errors++;
          this.stats.lastError = 'Connection error';
          this.emit('error', event);
          reject(new Error('WebSocket connection error'));
        };

        // ���ӹر�
        this.ws.onclose = (event) => {
          this.stats.connected = false;
          this.stopHeartbeat();

          this.emit('disconnected', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });

          // �Զ�����
          if (this.shouldReconnect && !this.isReconnecting) {
            this.scheduleReconnect();
          }
        };

        // ���ӳ�ʱ����
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
   * �Ͽ�����
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
   * ������Ϣ
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
   * ������Ϣ���ڲ���
   */
  private sendMessage(message: WebSocketMessage, timeout?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        // ���δ���ӣ�����Ϣ�������
        this.queueMessage(message);
        resolve(); // �����Ժ�ᷢ��
        return;
      }

      try {
        const payload = JSON.stringify(message);
        this.ws!.send(payload);

        this.stats.messagesSent++;
        this.stats.bytesTransferred += payload.length;

        // �����Ҫȷ�ϣ���ӵ���ȷ����Ϣ
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
   * ������յ�����Ϣ
   */
  private handleMessage(event: MessageEvent): void {
    try {
      let message;
      
      if (typeof event.data === 'string') {
        message = JSON.parse(event.data);
      } else if (this.config.enableBinaryMessages && event.data instanceof ArrayBuffer) {
        // �����������Ϣ
        message = this.parseBinaryMessage(event.data);
      } else {
        Logger.warn('Unsupported message format:', typeof event.data);
        return;
      }

      this.stats.messagesReceived++;
      this.stats.bytesTransferred += (typeof event.data === 'string' ? event.data.length : event.data.byteLength) || 0;

      // ����ȷ����Ϣ
      if (message.type === 'ack' && message.messageId) {
        this.handleAckMessage(message.messageId);
        return;
      }

      // ����������Ӧ
      if (message.type === 'pong') {
        this.handlePongMessage(message);
        return;
      }

      // ������Ϣ�¼�
      this.emit('message', message);

    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error instanceof Error ? error.message : 'Message parsing error';
      Logger.error('Error handling WebSocket message:', error);
    }
  }

  /**
   * ����ȷ����Ϣ
   */
  private handleAckMessage(messageId: string): void {
    if (this.pendingMessages.has(messageId)) {
      this.pendingMessages.delete(messageId);
    }
  }

  /**
   * ����������Ӧ
   */
  private handlePongMessage(message: any): void {
    if (message.timestamp) {
      const latency = Date.now() - message.timestamp;
      this.updateLatency(latency);
      this.emit('heartbeat', { latency });
    }
  }

  /**
   * �����ӳ�ͳ��
   */
  private updateLatency(latency: number): void {
    if (this.stats.averageLatency === 0) {
      this.stats.averageLatency = latency;
    } else {
      // ʹ��ָ���ƶ�ƽ��
      this.stats.averageLatency = this.stats.averageLatency * 0.9 + latency * 0.1;
    }
  }

  /**
   * ��������
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send('ping', { timestamp: Date.now() })
          .catch(() => {
            // ����ʧ�ܣ���������������
            Logger.warn('Heartbeat failed', {} as any);
          });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * ֹͣ����
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * ��������
   */
  private scheduleReconnect(): void {
    if (this.isReconnecting || this.stats.reconnectAttempts >= this.config.reconnectAttempts) {
      return;
    }

    this.isReconnecting = true;
    this.stats.reconnectAttempts++;

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.stats.reconnectAttempts - 1),
      30000 // ���30��
    );

    this.emit('reconnecting', {
      attempt: this.stats.reconnectAttempts,
      delay
    });

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        Logger.error('Reconnection failed:', error);
        this.isReconnecting = false;
        
        if (this.stats.reconnectAttempts < this.config.reconnectAttempts) {
          this.scheduleReconnect();
        } else {
          this.emit('error', new Error('Max reconnection attempts reached'));
          toast.error('����ʧ�ܣ��Ѵﵽ������Դ���');
        }
      }
    }, delay);
  }

  /**
   * ���������ʱ��
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * ����Ϣ�������
   */
  private queueMessage(message: WebSocketMessage): void {
    // �����ȼ�����
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    
    // �������������ɾ�������ȼ��ľ���Ϣ
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
   * ������Ϣ����
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift()!;
      this.sendMessage(message).catch(error => {
        Logger.error('Failed to send queued message:', error);
        
        // �����������
        if (message.retry && message.retry > 0) {
          message.retry--;
          this.queueMessage(message);
        }
      });
    }
  }

  /**
   * ������������Ϣ
   */
  private parseBinaryMessage(buffer: ArrayBuffer): unknown {
    // �������ʵ���Զ���Ķ�����Э�����
    // ����ʹ�� MessagePack��Protocol Buffers ��
    try {
      const decoder = new TextDecoder();
      const text = decoder.decode(buffer);
      return JSON.parse(text);
    } catch (error) {
      throw new Error('Failed to parse binary message');
    }
  }

  /**
   * ������ϢID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * �������״̬
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * ����¼�������
   */
  public on(event: WebSocketEventType, listener: WebSocketEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * �Ƴ��¼�������
   */
  public off(event: WebSocketEventType, listener: WebSocketEventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * �����¼�
   */
  private emit(event: WebSocketEventType, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          Logger.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * ��ȡ����ͳ����Ϣ
   */
  public getStats(): WebSocketStats {
    return { ...this.stats };
  }

  /**
   * ����ͳ����Ϣ
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
   * ��ȡ����״̬��Ϣ
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
   * ��ȡ����״̬�ַ���
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
   * ������Դ
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
 * WebSocket��������������
 */
export function createWebSocketManager(config: WebSocketConfig): WebSocketManager {
  return new WebSocketManager(config);
}

/**
 * Ĭ��WebSocket����
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

    // �Զ�����
    manager.connect().catch((error) => Logger.error('WebSocket connection failed', error));

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

// ��Ҫ����React������Hook
import React from 'react';
