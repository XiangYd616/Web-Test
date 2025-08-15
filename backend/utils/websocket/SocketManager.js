/**
 * WebSocket连接管理器
 * 负责管理所有WebSocket连接和实时通信
 */

const { EventEmitter } = require('events');

class SocketManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map(); // 存储所有连接
    this.userConnections = new Map(); // 用户ID到连接的映射
    this.roomConnections = new Map(); // 房间到连接的映射
    this.connectionStats = {
      total: 0,
      active: 0,
      peak: 0,
      totalMessages: 0
    };
  }

  /**
   * 注册新的WebSocket连接
   * @param {string} connectionId - 连接ID
   * @param {WebSocket} socket - WebSocket实例
   * @param {object} metadata - 连接元数据
   */
  registerConnection(connectionId, socket, metadata = {}) {
    const connection = {
      id: connectionId,
      socket,
      metadata,
      connectedAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      userId: metadata.userId || null,
      rooms: new Set()
    };

    this.connections.set(connectionId, connection);
    this.connectionStats.total++;
    this.connectionStats.active++;
    
    if (this.connectionStats.active > this.connectionStats.peak) {
      this.connectionStats.peak = this.connectionStats.active;
    }

    // 如果有用户ID，建立用户映射
    if (connection.userId) {
      if (!this.userConnections.has(connection.userId)) {
        this.userConnections.set(connection.userId, new Set());
      }
      this.userConnections.get(connection.userId).add(connectionId);
    }

    // 设置socket事件监听
    this.setupSocketListeners(connection);

    this.emit('connection:registered', connection);
    console.log(`WebSocket连接已注册: ${connectionId}, 用户: ${connection.userId || '匿名'}`);

    return connection;
  }

  /**
   * 注销WebSocket连接
   * @param {string} connectionId - 连接ID
   */
  unregisterConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    // 从用户映射中移除
    if (connection.userId) {
      const userConnections = this.userConnections.get(connection.userId);
      if (userConnections) {
        userConnections.delete(connectionId);
        if (userConnections.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }
    }

    // 从所有房间中移除
    connection.rooms.forEach(room => {
      this.leaveRoom(connectionId, room);
    });

    // 移除连接
    this.connections.delete(connectionId);
    this.connectionStats.active--;

    this.emit('connection:unregistered', connection);
    console.log(`WebSocket连接已注销: ${connectionId}`);

    return true;
  }

  /**
   * 设置Socket事件监听器
   * @param {object} connection - 连接对象
   */
  setupSocketListeners(connection) {
    const { socket, id } = connection;

    socket.on('message', (data) => {
      this.handleMessage(id, data);
    });

    socket.on('close', () => {
      this.unregisterConnection(id);
    });

    socket.on('error', (error) => {
      console.error(`WebSocket错误 [${id}]:`, error);
      this.emit('connection:error', { connectionId: id, error });
    });

    socket.on('pong', () => {
      this.updateActivity(id);
    });
  }

  /**
   * 处理收到的消息
   * @param {string} connectionId - 连接ID
   * @param {string} data - 消息数据
   */
  handleMessage(connectionId, data) {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return;

      this.updateActivity(connectionId);
      this.connectionStats.totalMessages++;

      let message;
      try {
        message = JSON.parse(data);
      } catch (e) {
        message = { type: 'text', data };
      }

      this.emit('message', {
        connectionId,
        userId: connection.userId,
        message,
        timestamp: new Date()
      });

    } catch (error) {
      console.error(`处理消息错误 [${connectionId}]:`, error);
    }
  }

  /**
   * 更新连接活动时间
   * @param {string} connectionId - 连接ID
   */
  updateActivity(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  /**
   * 发送消息到指定连接
   * @param {string} connectionId - 连接ID
   * @param {object} message - 消息对象
   */
  sendToConnection(connectionId, message) {
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
   * @param {string} userId - 用户ID
   * @param {object} message - 消息对象
   */
  sendToUser(userId, message) {
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
   * @param {object} message - 消息对象
   * @param {function} filter - 过滤函数
   */
  broadcast(message, filter = null) {
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
   * @param {string} connectionId - 连接ID
   * @param {string} room - 房间名称
   */
  joinRoom(connectionId, room) {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    connection.rooms.add(room);

    if (!this.roomConnections.has(room)) {
      this.roomConnections.set(room, new Set());
    }
    this.roomConnections.get(room).add(connectionId);

    this.emit('room:joined', { connectionId, room, userId: connection.userId });
    return true;
  }

  /**
   * 离开房间
   * @param {string} connectionId - 连接ID
   * @param {string} room - 房间名称
   */
  leaveRoom(connectionId, room) {
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
   * @param {string} room - 房间名称
   * @param {object} message - 消息对象
   * @param {string} excludeConnectionId - 排除的连接ID
   */
  sendToRoom(room, message, excludeConnectionId = null) {
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
      users: this.userConnections.size
    };
  }

  /**
   * 获取用户的连接信息
   * @param {string} userId - 用户ID
   */
  getUserConnections(userId) {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) return [];

    return Array.from(connectionIds).map(id => this.connections.get(id)).filter(Boolean);
  }

  /**
   * 检查用户是否在线
   * @param {string} userId - 用户ID
   */
  isUserOnline(userId) {
    return this.userConnections.has(userId);
  }

  /**
   * 清理非活跃连接
   * @param {number} timeoutMs - 超时时间（毫秒）
   */
  cleanupInactiveConnections(timeoutMs = 300000) { // 默认5分钟
    const now = new Date();
    const toRemove = [];

    this.connections.forEach((connection, connectionId) => {
      if (now - connection.lastActivity > timeoutMs) {
        toRemove.push(connectionId);
      }
    });

    toRemove.forEach(connectionId => {
      console.log(`清理非活跃连接: ${connectionId}`);
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
      timestamp: new Date().toISOString()
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
}, 60000); // 每分钟检查一次

// 定期发送心跳包
setInterval(() => {
  socketManager.sendHeartbeat();
}, 30000); // 每30秒发送一次心跳

module.exports = {
  SocketManager,
  socketManager
};
