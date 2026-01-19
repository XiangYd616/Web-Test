/**
 * 实时协作服务器
 * 处理 WebSocket 连接，实现实时同步和协作功能
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import * as WebSocket from 'ws';

// WebSocket连接接口
export interface CollaborationConnection {
  id: string;
  socket: WebSocket;
  userId?: string;
  username?: string;
  roomId?: string;
  connectedAt: Date;
  lastActivity: Date;
  metadata: Record<string, unknown>;
  isAuthenticated?: boolean;
}

// 协作房间接口
export interface CollaborationRoom {
  id: string;
  name: string;
  description?: string;
  members: Set<string>;
  createdAt: Date;
  maxMembers?: number;
  isPrivate: boolean;
  metadata: Record<string, unknown>;
}

// 协作消息接口
export interface CollaborationMessage {
  id: string;
  type: string;
  data: unknown;
  from: string;
  to?: string;
  roomId?: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

// 协作服务器配置接口
export interface CollaborationServerConfig {
  port: number;
  heartbeatInterval: number;
  maxMessageSize: number;
  enableCompression: boolean;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  authentication: {
    required: boolean;
    secret: string;
  };
}

/**
 * 实时协作服务器
 */
class CollaborationServer extends EventEmitter {
  private options: CollaborationServerConfig;
  private server: WebSocket.Server | null = null;
  private connections: Map<string, CollaborationConnection> = new Map();
  private rooms: Map<string, CollaborationRoom> = new Map();
  private messageHandlers: Map<
    string,
    (connection: CollaborationConnection, data: unknown) => void
  > = new Map();

  constructor(options: Partial<CollaborationServerConfig> = {}) {
    super();

    this.options = {
      port: options.port || 8080,
      heartbeatInterval: options.heartbeatInterval || 30000,
      maxMessageSize: options.maxMessageSize || 10 * 1024 * 1024, // 10MB
      enableCompression: options.enableCompression !== false,
      cors: {
        origin: options.cors?.origin || ['http://localhost:3000'],
        credentials: options.cors?.credentials || true,
      },
      authentication: {
        required: options.authentication?.required || false,
        secret: options.authentication?.secret || 'default-secret',
      },
      ...options,
    };

    this.initializeMessageHandlers();
  }

  /**
   * 启动协作服务器
   */
  async start(): Promise<void> {
    if (this.server) {
      throw new Error('Collaboration server is already running');
    }

    try {
      this.server = new WebSocket.Server({
        port: this.options.port,
        maxPayload: this.options.maxMessageSize,
      });

      this.setupServerListeners();

      console.log(`Collaboration server started on port ${this.options.port}`);
      this.emit('server_started');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 停止协作服务器
   */
  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    // 关闭所有连接
    for (const connection of this.connections.values()) {
      connection.socket.close();
    }

    // 关闭服务器
    this.server.close();
    this.server = null;

    console.log('Collaboration server stopped');
    this.emit('server_stopped');
  }

  /**
   * 注册消息处理器
   */
  registerHandler(
    type: string,
    handler: (connection: CollaborationConnection, data: unknown) => void
  ): void {
    this.messageHandlers.set(type, handler);
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
      const message: CollaborationMessage = {
        id: uuidv4(),
        type,
        data,
        from: 'server',
        timestamp: new Date(),
        metadata: {},
      };

      connection.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`Failed to send message to connection ${connectionId}:`, error);
      return false;
    }
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
  createRoom(roomData: Omit<CollaborationRoom, 'id' | 'members' | 'createdAt'>): string {
    const roomId = uuidv4();

    const room: CollaborationRoom = {
      ...roomData,
      id: roomId,
      members: new Set(),
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);
    this.emit('room_created', room);
    return roomId;
  }

  /**
   * 加入房间
   */
  joinRoom(connectionId: string, roomId: string): boolean {
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
    connection.roomId = roomId;
    room.members.add(connectionId);

    // 通知房间成员
    this.sendToRoom(
      roomId,
      'user_joined',
      {
        userId: connection.userId,
        username: connection.username,
      },
      [connectionId]
    );

    // 发送房间信息给新成员
    this.sendToConnection(connectionId, 'room_joined', {
      roomId,
      roomName: room.name,
      memberCount: room.members.size,
    });

    this.emit('user_joined_room', { connectionId, roomId });
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
    connection.roomId = undefined;
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
    }

    this.emit('user_left_room', { connectionId, roomId });
    return true;
  }

  /**
   * 获取连接信息
   */
  getConnection(connectionId: string): CollaborationConnection | null {
    return this.connections.get(connectionId) || null;
  }

  /**
   * 获取所有连接
   */
  getAllConnections(): CollaborationConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * 获取房间信息
   */
  getRoom(roomId: string): CollaborationRoom | null {
    return this.rooms.get(roomId) || null;
  }

  /**
   * 获取所有房间
   */
  getAllRooms(): CollaborationRoom[] {
    return Array.from(this.rooms.values());
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    totalConnections: number;
    activeConnections: number;
    totalRooms: number;
    totalMessages: number;
    byRoom: Record<string, number>;
  } {
    const totalConnections = this.connections.size;
    const activeConnections = Array.from(this.connections.values()).filter(
      conn => conn.socket.readyState === WebSocket.OPEN
    ).length;
    const totalRooms = this.rooms.size;

    const byRoom: Record<string, number> = {};
    for (const room of this.rooms.values()) {
      byRoom[room.id] = room.members.size;
    }

    return {
      totalConnections,
      activeConnections,
      totalRooms,
      totalMessages: 0, // 简化实现
      byRoom,
    };
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
  private handleConnection(socket: WebSocket, _request: unknown): void {
    const connectionId = uuidv4();
    const connection: CollaborationConnection = {
      id: connectionId,
      socket,
      connectedAt: new Date(),
      lastActivity: new Date(),
      metadata: {},
    };

    this.connections.set(connectionId, connection);

    // 设置Socket监听器
    this.setupSocketListeners(connection);

    this.emit('connection_established', connection);
  }

  /**
   * 设置Socket监听器
   */
  private setupSocketListeners(connection: CollaborationConnection): void {
    const socket = connection.socket;

    socket.on('message', (data: WebSocket.Data) => {
      this.handleMessage(connection, data);
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
  private handleMessage(connection: CollaborationConnection, data: WebSocket.Data): void {
    try {
      // 检查消息大小
      if (data.length > this.options.maxMessageSize) {
        connection.socket.close(1009, 'Message too large');
        return;
      }

      const message = JSON.parse(data.toString());
      connection.lastActivity = new Date();

      // 处理认证消息
      if (message.type === 'authenticate') {
        this.handleAuthentication(connection, message.data);
        return;
      }

      // 调用消息处理器
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(connection, message.data);
      } else {
        this.sendToConnection(connection.id, 'error', {
          message: 'Unknown message type',
        });
      }

      this.emit('message_received', { connection, message });
    } catch (error) {
      this.sendToConnection(connection.id, 'error', {
        message: 'Invalid message format',
      });
    }
  }

  /**
   * 处理认证
   */
  private handleAuthentication(connection: CollaborationConnection, data: unknown): void {
    if (!isRecord(data)) {
      this.sendToConnection(connection.id, 'authenticated', {
        success: false,
        error: 'Invalid authentication payload',
      });
      return;
    }
    if (!this.options.authentication.required) {
      connection.isAuthenticated = true;
      connection.userId = typeof data.userId === 'string' ? data.userId : undefined;
      connection.username = typeof data.username === 'string' ? data.username : undefined;

      this.sendToConnection(connection.id, 'authenticated', {
        success: true,
        user: {
          userId: connection.userId,
          username: connection.username,
        },
      });

      this.emit('user_authenticated', connection);
      return;
    }

    // 简化的认证逻辑
    if (data.token === this.options.authentication.secret) {
      connection.isAuthenticated = true;
      connection.userId = typeof data.userId === 'string' ? data.userId : undefined;
      connection.username = typeof data.username === 'string' ? data.username : undefined;

      this.sendToConnection(connection.id, 'authenticated', {
        success: true,
        user: {
          userId: connection.userId,
          username: connection.username,
        },
      });

      this.emit('user_authenticated', connection);
    } else {
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
    connection: CollaborationConnection,
    code: number,
    reason: string
  ): void {
    // 离开房间
    if (connection.roomId) {
      this.leaveRoom(connection.id, connection.roomId);
    }

    // 删除连接
    this.connections.delete(connection.id);

    this.emit('connection_disconnected', { connection, code, reason });
  }

  /**
   * 初始化消息处理器
   */
  private initializeMessageHandlers(): void {
    // 房间相关处理器
    this.registerHandler('join_room', (connection, data) => {
      this.joinRoom(connection.id, data.roomId);
    });

    this.registerHandler('leave_room', (connection, data) => {
      this.leaveRoom(connection.id, data.roomId);
    });

    // 协作消息处理器
    this.registerHandler('cursor_move', (connection, data) => {
      if (connection.roomId) {
        this.sendToRoom(
          connection.roomId,
          'cursor_move',
          {
            userId: connection.userId,
            position: data.position,
          },
          [connection.id]
        );
      }
    });

    this.registerHandler('text_change', (connection, data) => {
      if (connection.roomId) {
        this.sendToRoom(
          connection.roomId,
          'text_change',
          {
            userId: connection.userId,
            changes: data.changes,
          },
          [connection.id]
        );
      }
    });

    // 心跳处理器
    this.registerHandler('pong', connection => {
      connection.lastActivity = new Date();
    });
  }
}

export default CollaborationServer;
