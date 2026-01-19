/**
 * 增强版WebSocket管理器
 * 集成前端websocketManager功能到后端，提供统一的WebSocket管理和优化
 * 版本: v1.0.0
 */

import { EventEmitter } from 'events';
import { ServerOptions, Socket, Server as SocketIOServer } from 'socket.io';

type SocketIOServerTarget = ConstructorParameters<typeof SocketIOServer>[0];

// 模拟Redis客户端
class RedisClient {
  private data: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }

  async set(key: string, value: string, options?: { EX?: number }): Promise<void> {
    this.data.set(key, value);
    // 简化实现，忽略过期时间
  }

  async del(key: string): Promise<void> {
    this.data.delete(key);
  }

  async exists(key: string): Promise<number> {
    return this.data.has(key) ? 1 : 0;
  }

  async expire(key: string, seconds: number): Promise<void> {
    // 简化实现，忽略过期时间
  }
}

interface AuthPayload {
  token?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

interface JoinRoomPayload {
  roomId: string;
  metadata?: Record<string, unknown>;
}

interface LeaveRoomPayload {
  roomId: string;
}

interface MessagePayload {
  type: string;
  data: unknown;
  to?: string;
  room?: string;
  priority?: WebSocketMessage['priority'];
  encrypted?: boolean;
}

// WebSocket连接接口
export interface WebSocketConnection {
  id: string;
  userId?: string;
  sessionId: string;
  socket: Socket;
  connectedAt: Date;
  lastActivity: Date;
  rooms: Set<string>;
  metadata: Record<string, unknown>;
  isAuthenticated: boolean;
}

// WebSocket房间接口
export interface WebSocketRoom {
  id: string;
  name: string;
  description?: string;
  members: Set<string>;
  createdAt: Date;
  maxMembers?: number;
  isPrivate: boolean;
  metadata: Record<string, unknown>;
}

// 消息队列接口
export interface MessageQueue {
  id: string;
  name: string;
  messages: QueuedMessage[];
  maxSize: number;
  ttl: number;
  createdAt: Date;
}

// 队列消息接口
export interface QueuedMessage {
  id: string;
  type: string;
  data: unknown;
  timestamp: Date;
  attempts: number;
  maxAttempts: number;
  delay: number;
}

// WebSocket消息接口
export interface WebSocketMessage {
  id: string;
  type: string;
  data: unknown;
  from: string;
  to?: string;
  room?: string;
  timestamp: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  encrypted: boolean;
}

// WebSocket统计接口
export interface WebSocketStatistics {
  totalConnections: number;
  activeConnections: number;
  totalRooms: number;
  totalMessages: number;
  messagesPerSecond: number;
  averageLatency: number;
  byRoom: Record<
    string,
    {
      connections: number;
      messages: number;
    }
  >;
  byEventType: Record<string, number>;
  trends: Array<{
    timestamp: Date;
    connections: number;
    messages: number;
    latency: number;
  }>;
}

// WebSocket配置接口
export interface WebSocketConfig {
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  transports: string[];
  pingTimeout: number;
  pingInterval: number;
  maxHttpBufferSize: number;
  allowEIO3: boolean;
  compression: boolean;
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  rooms: {
    maxRooms: number;
    maxMembersPerRoom: number;
    defaultRoomTTL: number;
  };
  messages: {
    maxQueueSize: number;
    messageTTL: number;
    maxRetries: number;
    compressionThreshold: number;
  };
  security: {
    authenticationRequired: boolean;
    rateLimiting: boolean;
    encryptionEnabled: boolean;
    allowedOrigins: string[];
  };
}

/**
 * 增强版WebSocket管理器
 */
class WebSocketManager extends EventEmitter {
  private server: SocketIOServerTarget;
  private io: SocketIOServer | null = null;
  private redisClient: RedisClient | null = null;
  private connections: Map<string, WebSocketConnection> = new Map();
  private rooms: Map<string, WebSocketRoom> = new Map();
  private messageQueues: Map<string, MessageQueue> = new Map();
  private config: WebSocketConfig;
  private statistics: WebSocketStatistics;
  private isInitialized: boolean = false;

  constructor(server: SocketIOServerTarget, options: Partial<WebSocketConfig> = {}) {
    super();

    this.server = server;
    this.config = this.getDefaultConfig(options);

    this.statistics = {
      totalConnections: 0,
      activeConnections: 0,
      totalRooms: 0,
      totalMessages: 0,
      messagesPerSecond: 0,
      averageLatency: 0,
      byRoom: {},
      byEventType: {},
      trends: [],
    };

    this.initializeRedis();
  }

  /**
   * 初始化WebSocket管理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 初始化Socket.IO服务器
      const serverOptions: Partial<ServerOptions> = {
        cors: this.config.cors,
        transports: this.config.transports as ServerOptions['transports'],
        pingTimeout: this.config.pingTimeout,
        pingInterval: this.config.pingInterval,
        maxHttpBufferSize: this.config.maxHttpBufferSize,
        allowEIO3: this.config.allowEIO3,
        compression: this.config.compression,
      };

      this.io = new SocketIOServer(this.server, serverOptions);

      // 设置事件监听器
      this.setupEventListeners();

      // 启动清理任务
      this.startCleanupTasks();

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 发送消息到指定连接
   */
  async sendToConnection(connectionId: string, message: WebSocketMessage): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.socket.connected) {
      return false;
    }

    try {
      // 处理消息
      const processedMessage = await this.processMessage(message);

      // 发送消息
      connection.socket.emit(processedMessage.type, processedMessage.data);

      // 更新统计
      this.updateStatistics('message_sent', processedMessage);

      return true;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  /**
   * 发送消息到指定房间
   */
  async sendToRoom(
    roomId: string,
    message: WebSocketMessage,
    excludeConnections?: string[]
  ): Promise<number> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    let sentCount = 0;

    for (const connectionId of room.members) {
      if (excludeConnections?.includes(connectionId)) {
        continue;
      }

      const success = await this.sendToConnection(connectionId, message);
      if (success) {
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * 广播消息到所有连接
   */
  async broadcast(message: WebSocketMessage, excludeConnections?: string[]): Promise<number> {
    let sentCount = 0;

    for (const [connectionId] of this.connections.entries()) {
      if (excludeConnections?.includes(connectionId)) {
        continue;
      }

      const success = await this.sendToConnection(connectionId, message);
      if (success) {
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * 创建房间
   */
  async createRoom(roomData: Omit<WebSocketRoom, 'id' | 'members' | 'createdAt'>): Promise<string> {
    const roomId = this.generateRoomId();

    const room: WebSocketRoom = {
      ...roomData,
      id: roomId,
      members: new Set(),
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);
    this.statistics.totalRooms = this.rooms.size;

    // 保存到Redis
    if (this.redisClient) {
      await this.redisClient.set(`room:${roomId}`, JSON.stringify(room));
      await this.redisClient.expire(`room:${roomId}`, this.config.rooms.defaultRoomTTL);
    }

    this.emit('room_created', room);
    return roomId;
  }

  /**
   * 加入房间
   */
  async joinRoom(
    connectionId: string,
    roomId: string,
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
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

    // 更新Socket.IO房间
    if (connection.socket) {
      connection.socket.join(roomId);
    }

    // 更新统计
    this.updateRoomStatistics(roomId);

    // 保存到Redis
    if (this.redisClient) {
      await this.redisClient.set(`room:${roomId}`, JSON.stringify(room));
    }

    this.emit('user_joined_room', { connectionId, roomId, metadata });
    return true;
  }

  /**
   * 离开房间
   */
  async leaveRoom(connectionId: string, roomId: string): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    const room = this.rooms.get(roomId);

    if (!connection || !room) {
      return false;
    }

    // 离开房间
    connection.rooms.delete(roomId);
    room.members.delete(connectionId);

    // 更新Socket.IO房间
    if (connection.socket) {
      connection.socket.leave(roomId);
    }

    // 更新统计
    this.updateRoomStatistics(roomId);

    // 清理空房间
    if (room.members.size === 0) {
      await this.deleteRoom(roomId);
    } else {
      // 保存到Redis
      if (this.redisClient) {
        await this.redisClient.set(`room:${roomId}`, JSON.stringify(room));
      }
    }

    this.emit('user_left_room', { connectionId, roomId });
    return true;
  }

  /**
   * 删除房间
   */
  async deleteRoom(roomId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    // 移除所有成员
    for (const connectionId of room.members) {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.rooms.delete(roomId);
        if (connection.socket) {
          connection.socket.leave(roomId);
        }
      }
    }

    // 删除房间
    this.rooms.delete(roomId);
    this.statistics.totalRooms = this.rooms.size;

    // 从Redis删除
    if (this.redisClient) {
      await this.redisClient.del(`room:${roomId}`);
    }

    this.emit('room_deleted', { roomId });
    return true;
  }

  /**
   * 获取连接信息
   */
  getConnection(connectionId: string): WebSocketConnection | null {
    return this.connections.get(connectionId) || null;
  }

  /**
   * 获取所有连接
   */
  getAllConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * 获取房间信息
   */
  getRoom(roomId: string): WebSocketRoom | null {
    return this.rooms.get(roomId) || null;
  }

  /**
   * 获取所有房间
   */
  getAllRooms(): WebSocketRoom[] {
    return Array.from(this.rooms.values());
  }

  /**
   * 获取统计信息
   */
  getStatistics(): WebSocketStatistics {
    // 计算实时指标
    this.statistics.activeConnections = this.connections.size;
    this.statistics.messagesPerSecond = this.calculateMessagesPerSecond();
    this.statistics.averageLatency = this.calculateAverageLatency();

    return { ...this.statistics };
  }

  /**
   * 断开连接
   */
  async disconnect(connectionId: string, reason?: string): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    // 离开所有房间
    for (const roomId of connection.rooms) {
      await this.leaveRoom(connectionId, roomId);
    }

    // 断开Socket连接
    if (connection.socket) {
      connection.socket.disconnect(true);
    }

    // 删除连接
    this.connections.delete(connectionId);

    this.emit('connection_disconnected', { connectionId, reason });
    return true;
  }

  /**
   * 关闭WebSocket管理器
   */
  async close(): Promise<void> {
    if (this.io) {
      this.io.close();
      this.io = null;
    }

    if (this.redisClient) {
      // 关闭Redis连接
      this.redisClient = null;
    }

    this.connections.clear();
    this.rooms.clear();
    this.messageQueues.clear();
    this.isInitialized = false;

    this.emit('closed');
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    this.io.on('error', (error: Error) => {
      this.emit('error', error);
    });
  }

  /**
   * 处理新连接
   */
  private handleConnection(socket: Socket): void {
    const connectionId = this.generateConnectionId();
    const sessionId = this.generateSessionId();

    const connection: WebSocketConnection = {
      id: connectionId,
      sessionId,
      socket,
      connectedAt: new Date(),
      lastActivity: new Date(),
      rooms: new Set(),
      metadata: {},
      isAuthenticated: false,
    };

    this.connections.set(connectionId, connection);
    this.statistics.totalConnections++;

    // 设置Socket事件监听器
    this.setupSocketListeners(connection);

    this.emit('connection_established', connection);
  }

  /**
   * 设置Socket事件监听器
   */
  private setupSocketListeners(connection: WebSocketConnection): void {
    const socket = connection.socket;

    socket.on('authenticate', async (data: AuthPayload) => {
      await this.handleAuthentication(connection, data);
    });

    socket.on('join_room', async (data: JoinRoomPayload) => {
      await this.joinRoom(connection.id, data.roomId, data.metadata);
    });

    socket.on('leave_room', async (data: LeaveRoomPayload) => {
      await this.leaveRoom(connection.id, data.roomId);
    });

    socket.on('message', async (data: MessagePayload) => {
      await this.handleMessage(connection, data);
    });

    socket.on('disconnect', (reason: string) => {
      this.handleDisconnection(connection, reason);
    });

    socket.on('error', (error: Error) => {
      this.emit('socket_error', { connectionId: connection.id, error });
    });
  }

  /**
   * 处理认证
   */
  private async handleAuthentication(
    connection: WebSocketConnection,
    data: AuthPayload
  ): Promise<void> {
    try {
      // 简化认证逻辑
      const isAuthenticated = data.token === 'valid-token';

      connection.isAuthenticated = isAuthenticated;
      connection.userId = data.userId;
      connection.metadata = { ...connection.metadata, ...data.metadata };

      connection.socket.emit('authenticated', { success: isAuthenticated });
      this.emit('authentication_result', { connectionId: connection.id, success: isAuthenticated });
    } catch (error) {
      connection.socket.emit('authenticated', {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 处理消息
   */
  private async handleMessage(
    connection: WebSocketConnection,
    data: MessagePayload
  ): Promise<void> {
    try {
      const message: WebSocketMessage = {
        id: this.generateMessageId(),
        type: data.type,
        data: data.data,
        from: connection.id,
        to: data.to,
        room: data.room,
        timestamp: new Date(),
        priority: data.priority || 'normal',
        encrypted: data.encrypted || false,
      };

      // 处理消息
      await this.processMessage(message);

      this.updateStatistics('message_received', message);
      this.emit('message_received', message);
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * 处理断开连接
   */
  private handleDisconnection(connection: WebSocketConnection, reason: string): void {
    // 离开所有房间
    for (const roomId of connection.rooms) {
      this.leaveRoom(connection.id, roomId);
    }

    // 删除连接
    this.connections.delete(connection.id);

    this.emit('connection_disconnected', { connectionId: connection.id, reason });
  }

  /**
   * 处理消息
   */
  private async processMessage(message: WebSocketMessage): Promise<WebSocketMessage> {
    // 加密/解密处理
    if (message.encrypted && this.config.security.encryptionEnabled) {
      message.data = await this.encryptMessage(message.data);
    }

    // 压缩处理
    if (JSON.stringify(message.data).length > this.config.messages.compressionThreshold) {
      message.data = await this.compressMessage(message.data);
    }

    return message;
  }

  /**
   * 加密消息
   */
  private async encryptMessage(data: unknown): Promise<unknown> {
    // 简化实现，实际应该使用加密算法
    return data;
  }

  /**
   * 压缩消息
   */
  private async compressMessage(data: unknown): Promise<unknown> {
    // 简化实现，实际应该使用压缩算法
    return data;
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(type: string, message: WebSocketMessage): void {
    this.statistics.totalMessages++;

    // 按事件类型统计
    this.statistics.byEventType[message.type] =
      (this.statistics.byEventType[message.type] || 0) + 1;

    // 按房间统计
    if (message.room) {
      if (!this.statistics.byRoom[message.room]) {
        this.statistics.byRoom[message.room] = { connections: 0, messages: 0 };
      }
      this.statistics.byRoom[message.room].messages++;
    }
  }

  /**
   * 更新房间统计
   */
  private updateRoomStatistics(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room && this.statistics.byRoom[roomId]) {
      this.statistics.byRoom[roomId].connections = room.members.size;
    }
  }

  /**
   * 计算每秒消息数
   */
  private calculateMessagesPerSecond(): number {
    // 简化实现，实际应该基于时间窗口计算
    return this.statistics.totalMessages / (Date.now() / 1000);
  }

  /**
   * 计算平均延迟
   */
  private calculateAverageLatency(): number {
    // 简化实现，实际应该基于ping/pong计算
    return 50; // 模拟50ms延迟
  }

  /**
   * 启动清理任务
   */
  private startCleanupTasks(): void {
    // 定期清理过期连接
    setInterval(() => {
      this.cleanupExpiredConnections();
    }, 60000); // 每分钟清理一次

    // 定期清理空房间
    setInterval(() => {
      this.cleanupEmptyRooms();
    }, 300000); // 每5分钟清理一次
  }

  /**
   * 清理过期连接
   */
  private cleanupExpiredConnections(): void {
    const now = Date.now();
    const expireTime = 30 * 60 * 1000; // 30分钟

    for (const [connectionId, connection] of this.connections.entries()) {
      if (now - connection.lastActivity.getTime() > expireTime) {
        this.disconnect(connectionId, 'expired');
      }
    }
  }

  /**
   * 清理空房间
   */
  private cleanupEmptyRooms(): void {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.members.size === 0) {
        this.deleteRoom(roomId);
      }
    }
  }

  /**
   * 初始化Redis
   */
  private initializeRedis(): void {
    try {
      this.redisClient = new RedisClient();
    } catch (error) {
      console.warn('Redis initialization failed, running in single-instance mode:', error);
    }
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(options: Partial<WebSocketConfig>): WebSocketConfig {
    return {
      cors: {
        origin: ['http://localhost:3000'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6,
      allowEIO3: true,
      compression: true,
      redis: {
        host: 'localhost',
        port: 6379,
        db: 0,
      },
      rooms: {
        maxRooms: 1000,
        maxMembersPerRoom: 100,
        defaultRoomTTL: 3600,
      },
      messages: {
        maxQueueSize: 1000,
        messageTTL: 300,
        maxRetries: 3,
        compressionThreshold: 1024,
      },
      security: {
        authenticationRequired: false,
        rateLimiting: true,
        encryptionEnabled: false,
        allowedOrigins: ['http://localhost:3000'],
      },
      ...options,
    };
  }

  /**
   * 生成连接ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成房间ID
   */
  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default WebSocketManager;
