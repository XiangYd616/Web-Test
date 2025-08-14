/**
 * WebSocket管理器
 * 
 * 提供统一的WebSocket房间管理、事件处理和连接管理功能
 */

const Logger = require('./logger');

/**
 * WebSocket管理器类
 */
class WebSocketManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // 房间信息存储
    this.clientRooms = new Map(); // 客户端房间映射
    this.roomStats = new Map(); // 房间统计信息
    this.setupEventHandlers();
  }

  /**
   * 设置事件处理器
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      Logger.info('WebSocket客户端连接', { socketId: socket.id });
      this.handleClientConnection(socket);
    });
  }

  /**
   * 处理客户端连接
   */
  handleClientConnection(socket) {
    // 记录客户端连接
    this.clientRooms.set(socket.id, new Set());

    // 加入压力测试房间
    socket.on('join-stress-test', (testId) => {
      this.joinStressTestRoom(socket, testId);
    });

    // 离开压力测试房间
    socket.on('leave-stress-test', (testId) => {
      this.leaveStressTestRoom(socket, testId);
    });

    // 加入通用房间
    socket.on('join-room', (data) => {
      this.joinRoom(socket, data.room, data);
    });

    // 离开通用房间
    socket.on('leave-room', (data) => {
      this.leaveRoom(socket, data.room);
    });

    socket.on('test-ping', (data) => {
      this.handlePing(socket, data);
    });

    // 处理断开连接
    socket.on('disconnect', () => {
      this.handleClientDisconnection(socket);
    });
  }

  /**
   * 加入压力测试房间
   */
  joinStressTestRoom(socket, testId) {
    if (!testId) {
      Logger.warn('尝试加入压力测试房间但testId为空', { socketId: socket.id });
      return;
    }

    const roomName = `stress-test-${testId}`;
    
    try {
      // 加入房间
      socket.join(roomName);
      
      // 记录房间信息
      this.addClientToRoom(socket.id, roomName, 'stress-test', { testId });
      
      // 获取房间统计
      const roomStats = this.getRoomStats(roomName);
      
      Logger.info('客户端加入压力测试房间', {
        socketId: socket.id,
        testId,
        roomName,
        clientCount: roomStats.clientCount
      });

      // 发送房间加入确认
      socket.emit('room-joined', {
        testId,
        roomName,
        clientId: socket.id,
        clientCount: roomStats.clientCount,
        timestamp: Date.now()
      });

      // 如果测试已经在运行，发送当前状态
      this.sendCurrentTestStatus(socket, testId);

    } catch (error) {
      Logger.error('加入压力测试房间失败', error, {
        socketId: socket.id,
        testId,
        roomName
      });
    }
  }

  /**
   * 离开压力测试房间
   */
  leaveStressTestRoom(socket, testId) {
    const roomName = `stress-test-${testId}`;
    
    try {
      socket.leave(roomName);
      this.removeClientFromRoom(socket.id, roomName);
      
      const roomStats = this.getRoomStats(roomName);
      
      Logger.info('客户端离开压力测试房间', {
        socketId: socket.id,
        testId,
        roomName,
        remainingClients: roomStats.clientCount
      });

    } catch (error) {
      Logger.error('离开压力测试房间失败', error, {
        socketId: socket.id,
        testId,
        roomName
      });
    }
  }

  /**
   * 加入通用房间
   */
  joinRoom(socket, roomName, data = {}) {
    if (!roomName) {
      Logger.warn('尝试加入房间但roomName为空', { socketId: socket.id });
      return;
    }

    try {
      socket.join(roomName);
      this.addClientToRoom(socket.id, roomName, 'general', data);
      
      const roomStats = this.getRoomStats(roomName);
      
      Logger.info('客户端加入房间', {
        socketId: socket.id,
        roomName,
        clientCount: roomStats.clientCount
      });

      // 发送房间加入确认
      socket.emit('room-joined', {
        room: roomName,
        clientId: socket.id,
        clientCount: roomStats.clientCount,
        timestamp: Date.now()
      });

    } catch (error) {
      Logger.error('加入房间失败', error, {
        socketId: socket.id,
        roomName
      });
    }
  }

  /**
   * 离开通用房间
   */
  leaveRoom(socket, roomName) {
    try {
      socket.leave(roomName);
      this.removeClientFromRoom(socket.id, roomName);
      
      Logger.info('客户端离开房间', {
        socketId: socket.id,
        roomName
      });

    } catch (error) {
      Logger.error('离开房间失败', error, {
        socketId: socket.id,
        roomName
      });
    }
  }

  /**
   * 处理ping请求
   */
  handlePing(socket, data) {
    Logger.debug('收到ping请求', { socketId: socket.id, data });
    
    socket.emit('test-pong', {
      ...data,
      pongTime: Date.now(),
      socketId: socket.id
    });
  }

  /**
   * 处理客户端断开连接
   */
  handleClientDisconnection(socket) {
    Logger.info('WebSocket客户端断开连接', { socketId: socket.id });
    
    // 清理客户端房间记录
    const clientRooms = this.clientRooms.get(socket.id);
    if (clientRooms) {
      clientRooms.forEach(roomName => {
        this.removeClientFromRoom(socket.id, roomName);
      });
      this.clientRooms.delete(socket.id);
    }
  }

  /**
   * 添加客户端到房间记录
   */
  addClientToRoom(socketId, roomName, roomType, metadata = {}) {
    // 更新房间信息
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, {
        name: roomName,
        type: roomType,
        clients: new Set(),
        createdAt: Date.now(),
        metadata
      });
    }
    
    const room = this.rooms.get(roomName);
    room.clients.add(socketId);
    
    // 更新客户端房间映射
    const clientRooms = this.clientRooms.get(socketId) || new Set();
    clientRooms.add(roomName);
    this.clientRooms.set(socketId, clientRooms);
    
    // 更新房间统计
    this.updateRoomStats(roomName);
  }

  /**
   * 从房间记录中移除客户端
   */
  removeClientFromRoom(socketId, roomName) {
    const room = this.rooms.get(roomName);
    if (room) {
      room.clients.delete(socketId);
      
      // 如果房间为空，清理房间记录
      if (room.clients.size === 0) {
        this.rooms.delete(roomName);
        this.roomStats.delete(roomName);
      } else {
        this.updateRoomStats(roomName);
      }
    }
    
    // 更新客户端房间映射
    const clientRooms = this.clientRooms.get(socketId);
    if (clientRooms) {
      clientRooms.delete(roomName);
    }
  }

  /**
   * 更新房间统计信息
   */
  updateRoomStats(roomName) {
    const room = this.rooms.get(roomName);
    if (room) {
      this.roomStats.set(roomName, {
        clientCount: room.clients.size,
        lastUpdated: Date.now()
      });
    }
  }

  /**
   * 获取房间统计信息
   */
  getRoomStats(roomName) {
    return this.roomStats.get(roomName) || { clientCount: 0, lastUpdated: 0 };
  }

  /**
   * 发送当前测试状态（如果存在）
   */
  sendCurrentTestStatus(socket, testId) {
    // 这里可以集成测试状态管理，发送当前测试的状态
    // 暂时留空，由具体业务逻辑实现
  }

  /**
   * 广播到房间
   */
  broadcastToRoom(roomName, event, data) {
    const roomStats = this.getRoomStats(roomName);
    
    if (roomStats.clientCount === 0) {
      Logger.debug('房间中没有客户端，跳过广播', {
        roomName,
        event,
        dataSize: JSON.stringify(data).length
      });
      return false;
    }

    try {
      this.io.to(roomName).emit(event, data);
      
      Logger.debug('广播消息到房间', {
        roomName,
        event,
        clientCount: roomStats.clientCount,
        dataSize: JSON.stringify(data).length
      });
      
      return true;
    } catch (error) {
      Logger.error('广播消息失败', error, {
        roomName,
        event
      });
      return false;
    }
  }

  /**
   * 清理房间
   */
  cleanupRoom(roomName) {
    try {
      const room = this.rooms.get(roomName);
      if (room) {
        Logger.info('清理WebSocket房间', {
          roomName,
          clientCount: room.clients.size
        });

        // 通知所有客户端房间即将关闭
        this.broadcastToRoom(roomName, 'room-closing', {
          roomName,
          timestamp: Date.now()
        });

        // 让所有客户端离开房间
        this.io.in(roomName).disconnectSockets();
        
        // 清理房间记录
        this.rooms.delete(roomName);
        this.roomStats.delete(roomName);
        
        Logger.info('房间清理完成', { roomName });
        return true;
      }
      
      return false;
    } catch (error) {
      Logger.error('清理房间失败', error, { roomName });
      return false;
    }
  }

  /**
   * 获取所有房间信息
   */
  getAllRooms() {
    const rooms = [];
    this.rooms.forEach((room, roomName) => {
      const stats = this.getRoomStats(roomName);
      rooms.push({
        name: roomName,
        type: room.type,
        clientCount: stats.clientCount,
        createdAt: room.createdAt,
        lastUpdated: stats.lastUpdated,
        metadata: room.metadata
      });
    });
    return rooms;
  }

  /**
   * 健康检查
   */
  healthCheck() {
    const totalRooms = this.rooms.size;
    const totalClients = this.clientRooms.size;
    const roomDetails = this.getAllRooms();
    
    return {
      status: 'healthy',
      totalRooms,
      totalClients,
      rooms: roomDetails,
      timestamp: Date.now()
    };
  }
}

module.exports = WebSocketManager;
