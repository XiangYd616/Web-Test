/**
 * WebSocket管理器
 * 增强版WebSocket连接管理，支持认证、房间、订阅等功能
 */

import { EventEmitter } from 'events';
import * as WebSocket from 'ws';

// 模拟JWT功能
interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

interface JWTOptions {
  algorithm?: string;
  expiresIn?: string;
}

const jwt = {
  sign: (payload: Record<string, unknown>, secret: string, options?: JWTOptions): string => {
    // 简化实现，实际应该使用JWT库
    return `jwt_token_${JSON.stringify(payload)}`;
  },
  verify: (token: string, secret: string): JWTPayload => {
    // 简化实现，实际应该验证JWT
    try {
      const payload = JSON.parse(token.replace('jwt_token_', ''));
      return payload as JWTPayload;
    } catch {
      throw new Error('Invalid token');
    }
  },
};

// WebSocket连接接口
export interface LegacyWebSocketConnection {
  id: string;
  socket: WebSocket;
  userId?: string;
  username?: string;
  role?: string;
  isAuthenticated: boolean;
  connectedAt: Date;
  lastActivity: Date;
  rooms: Set<string>;
  subscriptions: Set<string>;
  metadata: Record<string, unknown>;
  heartbeatInterval?: NodeJS.Timeout;
}

// 房间接口
export interface LegacyWebSocketRoom {
  id: string;
  name: string;
  description?: string;
  members: Set<string>;
  createdAt: Date;
  maxMembers?: number;
  isPrivate: boolean;
  metadata: Record<string, unknown>;
}

// 订阅接口
export interface LegacyWebSocketSubscription {
  id: string;
  type: string;
  filter?: Record<string, unknown>;
  connections: Set<string>;
  createdAt: Date;
}

// 消息处理器接口
export interface MessageHandler {
  type: string;
  handler: (connection: LegacyWebSocketConnection, data: unknown) => Promise<void>;
  requireAuth?: boolean;
}

// WebSocket统计接口
export interface LegacyWebSocketStatistics {
  totalConnections: number;
  activeConnections: number;
  authenticatedConnections: number;
  totalRooms: number;
  totalSubscriptions: number;
  messagesSent: number;
  messagesReceived: number;
  averageMessageSize: number;
  connectionDuration: number;
  byRoom: Record<string, number>;
  byEventType: Record<string, number>;
}

// WebSocket配置接口
export interface LegacyWebSocketConfig {
  port: number;
  path: string;
  maxConnections: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  maxMessageSize: number;
  enableCompression: boolean;
  jwtSecret: string;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

/**
 * WebSocket管理器
 */
class WebSocketManager extends EventEmitter {
  private connections: Map<string, LegacyWebSocketConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private rooms: Map<string, LegacyWebSocketRoom> = new Map();
  private subscriptions: Map<string, LegacyWebSocketSubscription> = new Map();
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private server: WebSocket.Server | null = null;
  private config: LegacyWebSocketConfig;
  private statistics: LegacyWebSocketStatistics;

  constructor(options: Partial<LegacyWebSocketConfig> = {}) {
    super();

    this.config = {
      port: options.port || 8080,
      path: options.path || '/ws',
      maxConnections: options.maxConnections || 1000,
      heartbeatInterval: options.heartbeatInterval || 30000,
      connectionTimeout: options.connectionTimeout || 60000,
      maxMessageSize: options.maxMessageSize || 1024 * 1024, // 1MB
      enableCompression: options.enableCompression !== false,
      jwtSecret: options.jwtSecret || 'default-secret',
      cors: {
        origin: options.cors?.origin || ['http://localhost:3000'],
        credentials: options.cors?.credentials || true,
      },
      rateLimit: {
        windowMs: options.rateLimit?.windowMs || 60000,
        max: options.rateLimit?.max || 100,
      },
      ...options,
    };

    this.statistics = {
      totalConnections: 0,
      activeConnections: 0,
      authenticatedConnections: 0,
      totalRooms: 0,
      totalSubscriptions: 0,
      messagesSent: 0,
      messagesReceived: 0,
      averageMessageSize: 0,
      connectionDuration: 0,
      byRoom: {},
      byEventType: {},
    };

    this.initializeMessageHandlers();
  }

  /**
   * 启动WebSocket服务器
   */
  async start(): Promise<void> {
    if (this.server) {
      throw new Error('WebSocket server is already running');
    }

    try {
      this.server = new WebSocket.Server({
        port: this.config.port,
        path: this.config.path,
        maxPayload: this.config.maxMessageSize,
        compression: this.config.enableCompression,
      });

      this.setupServerListeners();

      console.log(`WebSocket server started on port ${this.config.port}`);
      this.emit('server_started');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 停止WebSocket服务器
   */
  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    // 关闭所有连接
    for (const connection of this.connections.values()) {
      this.closeConnection(connection.id, 'Server shutting down');
    }

    // 关闭服务器
    this.server.close();
    this.server = null;

    console.log('WebSocket server stopped');
    this.emit('server_stopped');
  }

  /**
   * 注册消息处理器
   */
  registerHandler(handler: MessageHandler): void {
    this.messageHandlers.set(handler.type, handler);
  }

  /**
   * 发送消息到指定连接
   */
  sendToConnection(connectionId: string, type: string, data: unknown): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const message = JSON.stringify({ type, data, timestamp: Date.now() });
      connection.socket.send(message);

      this.statistics.messagesSent++;
      this.statistics.averageMessageSize =
        (this.statistics.averageMessageSize + message.length) / 2;

      return true;
    } catch (error) {
      console.error(`Failed to send message to connection ${connectionId}:`, error);
      return false;
    }
  }

  /**
   * 发送消息到指定用户
   */
  sendToUser(userId: string, type: string, data: unknown): number {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) {
      return 0;
    }

    let sentCount = 0;
    for (const connectionId of connectionIds) {
      if (this.sendToConnection(connectionId, type, data)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * 发送消息到房间
   */
  sendToRoom(roomId: string, type: string, data: unknown, excludeConnections?: string[]): number {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    let sentCount = 0;
    for (const connectionId of room.members) {
      if (excludeConnections?.includes(connectionId)) {
        continue;
      }

      if (this.sendToConnection(connectionId, type, data)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * 广播消息到所有连接
   */
  broadcast(type: string, data: unknown, excludeConnections?: string[]): number {
    let sentCount = 0;

    for (const [connectionId] of this.connections.entries()) {
      if (excludeConnections?.includes(connectionId)) {
        continue;
      }

      if (this.sendToConnection(connectionId, type, data)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * 创建房间
   */
  createRoom(roomData: Omit<LegacyWebSocketRoom, 'id' | 'members' | 'createdAt'>): string {
    const roomId = this.generateRoomId();

    const room: LegacyWebSocketRoom = {
      ...roomData,
      id: roomId,
      members: new Set(),
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);
    this.statistics.totalRooms = this.rooms.size;

    this.emit('room_created', room);
    return roomId;
  }

  /**
   * 加入房间
   */
  joinRoom(connectionId: string, roomId: string, metadata?: Record<string, unknown>): boolean {
    const connection = this.connections.get(connectionId);
    const room = this.rooms.get(roomId);

    if (!connection || !room) {
      return false;
    }

    // 检查房间容量
    if (room.maxMembers && room.members.size >= room.maxMembers) {
      return false;
    }

    // 加入房间
    connection.rooms.add(roomId);
    room.members.add(connectionId);

    // 通知房间成员
    this.sendToRoom(
      roomId,
      'user_joined',
      {
        userId: connection.userId,
        username: connection.username,
        metadata,
      },
      [connectionId]
    );

    // 发送房间信息给新成员
    this.sendToConnection(connectionId, 'room_joined', {
      roomId,
      roomName: room.name,
      memberCount: room.members.size,
    });

    this.emit('user_joined_room', { connectionId, roomId, metadata });
    return true;
  }

  /**
   * 离开房间
   */
  leaveRoom(connectionId: string, roomId: string): boolean {
    const connection = this.connections.get(connectionId);
    const room = this.rooms.get(roomId);

    if (!connection || !room) {
      return false;
    }

    // 离开房间
    connection.rooms.delete(roomId);
    room.members.delete(connectionId);

    // 通知房间成员
    this.sendToRoom(
      roomId,
      'user_left',
      {
        userId: connection.userId,
        username: connection.username,
      },
      [connectionId]
    );

    // 清理空房间
    if (room.members.size === 0) {
      this.rooms.delete(roomId);
      this.statistics.totalRooms = this.rooms.size;
    }

    this.emit('user_left_room', { connectionId, roomId });
    return true;
  }

  /**
   * 创建订阅
   */
  createSubscription(type: string, filter?: Record<string, unknown>): string {
    const subscriptionId = this.generateSubscriptionId();

    const subscription: LegacyWebSocketSubscription = {
      id: subscriptionId,
      type,
      filter,
      connections: new Set(),
      createdAt: new Date(),
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.statistics.totalSubscriptions = this.subscriptions.size;

    this.emit('subscription_created', subscription);
    return subscriptionId;
  }

  /**
   * 订阅事件
   */
  subscribe(connectionId: string, subscriptionId: string): boolean {
    const connection = this.connections.get(connectionId);
    const subscription = this.subscriptions.get(subscriptionId);

    if (!connection || !subscription) {
      return false;
    }

    connection.subscriptions.add(subscriptionId);
    subscription.connections.add(connectionId);

    this.emit('user_subscribed', { connectionId, subscriptionId });
    return true;
  }

  /**
   * 取消订阅
   */
  unsubscribe(connectionId: string, subscriptionId: string): boolean {
    const connection = this.connections.get(connectionId);
    const subscription = this.subscriptions.get(subscriptionId);

    if (!connection || !subscription) {
      return false;
    }

    connection.subscriptions.delete(subscriptionId);
    subscription.connections.delete(connectionId);

    // 清理空订阅
    if (subscription.connections.size === 0) {
      this.subscriptions.delete(subscriptionId);
      this.statistics.totalSubscriptions = this.subscriptions.size;
    }

    this.emit('user_unsubscribed', { connectionId, subscriptionId });
    return true;
  }

  /**
   * 发布事件到订阅者
   */
  publish(type: string, data: unknown): number {
    let sentCount = 0;

    for (const subscription of this.subscriptions.values()) {
      if (subscription.type === type && this.matchesFilter(data, subscription.filter)) {
        for (const connectionId of subscription.connections) {
          if (this.sendToConnection(connectionId, type, data)) {
            sentCount++;
          }
        }
      }
    }

    return sentCount;
  }

  /**
   * 获取连接信息
   */
  getConnection(connectionId: string): LegacyWebSocketConnection | null {
    return this.connections.get(connectionId) || null;
  }

  /**
   * 获取用户的所有连接
   */
  getUserConnections(userId: string): LegacyWebSocketConnection[] {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) {
      return [];
    }

    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter(conn => conn !== undefined) as LegacyWebSocketConnection[];
  }

  /**
   * 获取房间信息
   */
  getRoom(roomId: string): LegacyWebSocketRoom | null {
    return this.rooms.get(roomId) || null;
  }

  /**
   * 获取统计信息
   */
  getStatistics(): LegacyWebSocketStatistics {
    // 更新实时统计
    this.statistics.activeConnections = this.connections.size;
    this.statistics.authenticatedConnections = Array.from(this.connections.values()).filter(
      conn => conn.isAuthenticated
    ).length;

    return { ...this.statistics };
  }

  /**
   * 设置服务器监听器
   */
  private setupServerListeners(): void {
    if (!this.server) return;

    this.server.on('connection', (socket: WebSocket, request: unknown) => {
      this.handleConnection(socket, request);
    });

    this.server.on('error', (error: Error) => {
      this.emit('error', error);
    });
  }

  /**
   * 处理新连接
   */
  private handleConnection(socket: WebSocket, request: unknown): void {
    // 检查连接限制
    if (this.connections.size >= this.config.maxConnections) {
      socket.close(1013, 'Server overloaded');
      return;
    }

    const connectionId = this.generateConnectionId();
    const connection: LegacyWebSocketConnection = {
      id: connectionId,
      socket,
      isAuthenticated: false,
      connectedAt: new Date(),
      lastActivity: new Date(),
      rooms: new Set(),
      subscriptions: new Set(),
      metadata: {},
    };

    this.connections.set(connectionId, connection);
    this.statistics.totalConnections++;

    // 设置Socket监听器
    this.setupSocketListeners(connection);

    // 启动心跳
    this.startHeartbeat(connection);

    // 设置连接超时
    this.setConnectionTimeout(connection);

    this.emit('connection_established', connection);
  }

  /**
   * 设置Socket监听器
   */
  private setupSocketListeners(connection: LegacyWebSocketConnection): void {
    const socket = connection.socket;

    socket.on('message', async (data: WebSocket.Data) => {
      await this.handleMessage(connection, data);
    });

    socket.on('close', (code: number, reason: string) => {
      this.handleDisconnection(connection, code, reason);
    });

    socket.on('error', (error: Error) => {
      this.emit('socket_error', { connectionId: connection.id, error });
    });

    socket.on('pong', () => {
      connection.lastActivity = new Date();
    });
  }

  /**
   * 处理消息
   */
  private async handleMessage(
    connection: LegacyWebSocketConnection,
    data: WebSocket.Data
  ): Promise<void> {
    try {
      // 检查消息大小
      if (data.length > this.config.maxMessageSize) {
        connection.socket.close(1009, 'Message too large');
        return;
      }

      const message = JSON.parse(data.toString());
      connection.lastActivity = new Date();

      this.statistics.messagesReceived++;

      // 处理认证消息
      if (message.type === 'authenticate') {
        await this.handleAuthentication(connection, message.data);
        return;
      }

      // 检查是否需要认证
      const handler = this.messageHandlers.get(message.type);
      if (handler?.requireAuth && !connection.isAuthenticated) {
        this.sendToConnection(connection.id, 'error', {
          message: 'Authentication required',
        });
        return;
      }

      // 调用消息处理器
      if (handler) {
        await handler.handler(connection, message.data);
      } else {
        this.sendToConnection(connection.id, 'error', {
          message: 'Unknown message type',
        });
      }

      // 更新事件统计
      this.statistics.byEventType[message.type] =
        (this.statistics.byEventType[message.type] || 0) + 1;
    } catch (error) {
      this.sendToConnection(connection.id, 'error', {
        message: 'Invalid message format',
      });
    }
  }

  /**
   * 处理认证
   */
  private async handleAuthentication(
    connection: LegacyWebSocketConnection,
    data: unknown
  ): Promise<void> {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid authentication payload');
      }

      const token = (data as { token?: string }).token;
      if (!token) {
        throw new Error('Missing token');
      }
      const payload = jwt.verify(token, this.config.jwtSecret);

      connection.isAuthenticated = true;
      connection.userId = payload.userId;
      connection.username = payload.username;
      connection.role = payload.role;

      // 添加到用户连接映射
      if (!this.userConnections.has(payload.userId)) {
        this.userConnections.set(payload.userId, new Set());
      }
      this.userConnections.get(payload.userId)!.add(connection.id);

      this.sendToConnection(connection.id, 'authenticated', {
        success: true,
        user: {
          userId: payload.userId,
          username: payload.username,
          role: payload.role,
        },
      });

      this.emit('user_authenticated', connection);
    } catch (error) {
      this.sendToConnection(connection.id, 'authenticated', {
        success: false,
        error: 'Invalid token',
      });
    }
  }

  /**
   * 处理断开连接
   */
  private handleDisconnection(
    connection: LegacyWebSocketConnection,
    code: number,
    reason: string
  ): void {
    // 清理心跳
    if (connection.heartbeatInterval) {
      clearInterval(connection.heartbeatInterval);
    }

    // 离开所有房间
    for (const roomId of connection.rooms) {
      this.leaveRoom(connection.id, roomId);
    }

    // 取消所有订阅
    for (const subscriptionId of connection.subscriptions) {
      this.unsubscribe(connection.id, subscriptionId);
    }

    // 从用户连接映射中移除
    if (connection.userId) {
      const userConns = this.userConnections.get(connection.userId);
      if (userConns) {
        userConns.delete(connection.id);
        if (userConns.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }
    }

    // 删除连接
    this.connections.delete(connection.id);

    // 更新统计
    const duration = Date.now() - connection.connectedAt.getTime();
    this.statistics.connectionDuration = (this.statistics.connectionDuration + duration) / 2;

    this.emit('connection_disconnected', { connection, code, reason });
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(connection: LegacyWebSocketConnection): void {
    connection.heartbeatInterval = setInterval(() => {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.ping();
      } else {
        this.closeConnection(connection.id, 'Heartbeat failed');
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 设置连接超时
   */
  private setConnectionTimeout(connection: LegacyWebSocketConnection): void {
    setTimeout(() => {
      if (!connection.isAuthenticated) {
        this.closeConnection(connection.id, 'Authentication timeout');
      }
    }, this.config.connectionTimeout);
  }

  /**
   * 关闭连接
   */
  private closeConnection(connectionId: string, reason: string): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.close(1000, reason);
    }
  }

  /**
   * 匹配过滤器
   */
  private matchesFilter(data: unknown, filter?: Record<string, unknown>): boolean {
    if (!filter) return true;
    if (!data || typeof data !== 'object') {
      return false;
    }

    const record = data as Record<string, unknown>;

    for (const [key, value] of Object.entries(filter)) {
      if (record[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * 初始化消息处理器
   */
  private initializeMessageHandlers(): void {
    // 房间相关处理器
    this.registerHandler({
      type: 'join_room',
      requireAuth: true,
      handler: async (connection, data) => {
        this.joinRoom(connection.id, data.roomId, data.metadata);
      },
    });

    this.registerHandler({
      type: 'leave_room',
      requireAuth: true,
      handler: async (connection, data) => {
        this.leaveRoom(connection.id, data.roomId);
      },
    });

    // 订阅相关处理器
    this.registerHandler({
      type: 'subscribe',
      requireAuth: true,
      handler: async (connection, data) => {
        this.subscribe(connection.id, data.subscriptionId);
      },
    });

    this.registerHandler({
      type: 'unsubscribe',
      requireAuth: true,
      handler: async (connection, data) => {
        this.unsubscribe(connection.id, data.subscriptionId);
      },
    });

    // 心跳处理器
    this.registerHandler({
      type: 'pong',
      requireAuth: false,
      handler: async connection => {
        connection.lastActivity = new Date();
      },
    });
  }

  /**
   * 生成连接ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成房间ID
   */
  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成订阅ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default WebSocketManager;
