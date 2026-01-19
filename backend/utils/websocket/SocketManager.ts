/**
 * WebSocket连接管理器
 * 负责管理所有WebSocket连接和实时通信
 */

const { EventEmitter } = require('events');

type SocketMetadata = {
  userId?: string;
  [key: string]: unknown;
};

type WebSocketLike = {
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  send: (data: string) => void;
  ping: () => void;
};

type SocketConnection = {
  id: string;
  socket: WebSocketLike;
  metadata: SocketMetadata;
  connectedAt: Date;
  lastActivity: Date;
  isActive: boolean;
  userId: string | null;
  rooms: Set<string>;
};

type ConnectionStats = {
  total: number;
  active: number;
  peak: number;
  totalMessages: number;
};

class SocketManager extends EventEmitter {
  connections: Map<string, SocketConnection>;
  userConnections: Map<string, Set<string>>;
  roomConnections: Map<string, Set<string>>;
  connectionStats: ConnectionStats;

  constructor() {
    super();
    this.connections = new Map();
    this.userConnections = new Map();
    this.roomConnections = new Map();
    this.connectionStats = {
      total: 0,
      active: 0,
      peak: 0,
      totalMessages: 0,
    };
  }

  /**
   * 注册新的WebSocket连接
   */
  registerConnection(connectionId: string, socket: WebSocketLike, metadata: SocketMetadata = {}) {
    const connection: SocketConnection = {
      id: connectionId,
      socket,
      metadata,
      connectedAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      userId: metadata.userId || null,
      rooms: new Set(),
    };

    this.connections.set(connectionId, connection);
    this.connectionStats.total++;
    this.connectionStats.active++;

    if (this.connectionStats.active > this.connectionStats.peak) {
      this.connectionStats.peak = this.connectionStats.active;
    }

    if (connection.userId) {
      if (!this.userConnections.has(connection.userId)) {
        this.userConnections.set(connection.userId, new Set());
      }
      this.userConnections.get(connection.userId)?.add(connectionId);
    }

    this.setupSocketListeners(connection);

    this.emit('connection:registered', connection);

    return connection;
  }

  /**
   * 注销WebSocket连接
   */
  unregisterConnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    if (connection.userId) {
      const userConnections = this.userConnections.get(connection.userId);
      if (userConnections) {
        userConnections.delete(connectionId);
        if (userConnections.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }
    }

    connection.rooms.forEach(room => {
      this.leaveRoom(connectionId, room);
    });

    this.connections.delete(connectionId);
    this.connectionStats.active--;

    this.emit('connection:unregistered', connection);

    return true;
  }

  /**
   * 设置Socket事件监听器
   */
  setupSocketListeners(connection: SocketConnection) {
    const { socket, id } = connection;

    socket.on('message', (data: unknown) => {
      this.handleMessage(id, data as string);
    });

    socket.on('close', () => {
      this.unregisterConnection(id);
    });

    socket.on('error', (error: Error) => {
      console.error(`WebSocket错误 [${id}]:`, error);
      this.emit('connection:error', { connectionId: id, error });
    });

    socket.on('pong', () => {
      this.updateActivity(id);
    });
  }

  /**
   * 处理收到的消息
   */
  handleMessage(connectionId: string, data: string) {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return;

      this.updateActivity(connectionId);
      this.connectionStats.totalMessages++;

      let message: Record<string, unknown> | { type: string; data: string };
      try {
        message = JSON.parse(data) as Record<string, unknown>;
      } catch (e) {
        message = { type: 'text', data };
      }

      this.emit('message', {
        connectionId,
        userId: connection.userId,
        message,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error(`处理消息错误 [${connectionId}]:`, error);
    }
  }

  /**
   * 更新连接活动时间
   */
  updateActivity(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  /**
   * 发送消息到指定连接
   */
  sendToConnection(connectionId: string, message: Record<string, unknown> | string) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isActive) return false;

    try {
      const data = typeof message === 'string' ? message : JSON.stringify(message);
      connection.socket.send(data);
      return true;
    } catch (error) {
      console.error(`发送消息失败 [${connectionId}]:`, error);
      return false;
    }
  }

  /**
   * 发送消息到指定用户的所有连接
   */
  sendToUser(userId: string, message: Record<string, unknown> | string) {
    const userConnections = this.userConnections.get(userId);
    if (!userConnections) return 0;

    let sentCount = 0;
    userConnections.forEach(connectionId => {
      if (this.sendToConnection(connectionId, message)) {
        sentCount++;
      }
    });

    return sentCount;
  }

  /**
   * 广播消息到所有连接
   */
  broadcast(
    message: Record<string, unknown> | string,
    filter: ((connection: SocketConnection) => boolean) | null = null
  ) {
    let sentCount = 0;

    this.connections.forEach((connection, connectionId) => {
      if (filter && !filter(connection)) return;

      if (this.sendToConnection(connectionId, message)) {
        sentCount++;
      }
    });

    return sentCount;
  }

  /**
   * 加入房间
   */
  joinRoom(connectionId: string, room: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    connection.rooms.add(room);

    if (!this.roomConnections.has(room)) {
      this.roomConnections.set(room, new Set());
    }
    this.roomConnections.get(room)?.add(connectionId);

    this.emit('room:joined', { connectionId, room, userId: connection.userId });
    return true;
  }

  /**
   * 离开房间
   */
  leaveRoom(connectionId: string, room: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    connection.rooms.delete(room);

    const roomConnections = this.roomConnections.get(room);
    if (roomConnections) {
      roomConnections.delete(connectionId);
      if (roomConnections.size === 0) {
        this.roomConnections.delete(room);
      }
    }

    this.emit('room:left', { connectionId, room, userId: connection.userId });
    return true;
  }

  /**
   * 发送消息到房间
   */
  sendToRoom(
    room: string,
    message: Record<string, unknown> | string,
    excludeConnectionId: string | null = null
  ) {
    const roomConnections = this.roomConnections.get(room);
    if (!roomConnections) return 0;

    let sentCount = 0;
    roomConnections.forEach(connectionId => {
      if (connectionId !== excludeConnectionId) {
        if (this.sendToConnection(connectionId, message)) {
          sentCount++;
        }
      }
    });

    return sentCount;
  }

  /**
   * 获取连接统计信息
   */
  getStats() {
    return {
      ...this.connectionStats,
      rooms: this.roomConnections.size,
      users: this.userConnections.size,
    };
  }

  /**
   * 获取用户的连接信息
   */
  getUserConnections(userId: string) {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) return [];

    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter(Boolean);
  }

  /**
   * 检查用户是否在线
   */
  isUserOnline(userId: string) {
    return this.userConnections.has(userId);
  }

  /**
   * 清理非活跃连接
   */
  cleanupInactiveConnections(timeoutMs = 300000) {
    const now = Date.now();
    const toRemove: string[] = [];

    this.connections.forEach((connection, connectionId) => {
      if (now - connection.lastActivity.getTime() > timeoutMs) {
        toRemove.push(connectionId);
      }
    });

    toRemove.forEach(connectionId => {
      this.unregisterConnection(connectionId);
    });

    return toRemove.length;
  }

  /**
   * 发送心跳包
   */
  sendHeartbeat() {
    const heartbeatMessage = {
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
    };

    this.connections.forEach((connection, connectionId) => {
      try {
        connection.socket.ping();
      } catch (error) {
        console.error(`心跳发送失败 [${connectionId}]:`, error);
      }
    });
  }
}

// 创建全局实例
const socketManager = new SocketManager();

// 定期清理非活跃连接
setInterval(() => {
  socketManager.cleanupInactiveConnections();
}, 60000);

// 定期发送心跳包
setInterval(() => {
  socketManager.sendHeartbeat();
}, 30000);

export { SocketManager, socketManager };

module.exports = {
  SocketManager,
  socketManager,
};
