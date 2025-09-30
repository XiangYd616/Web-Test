/**
 * 实时通信服务
 * 提供测试进度推送、结果更新、系统通知等实时功能
 */

class RealtimeService {
  constructor(socketManager, cacheManager) {
    this.socketManager = socketManager;
    this.cache = cacheManager;
    this.subscribers = new Map(); // 存储订阅信息
    this.testProgress = new Map(); // 存储测试进度
    this.messageQueue = []; // 消息队列
    this.isProcessingQueue = false;
    this.rooms = new Map(); // 房间管理
    this.notifications = new Map(); // 通知管理

    // 配置选项
    this.options = {
      maxQueueSize: 1000,
      batchSize: 10,
      processInterval: 100, // 100ms
      retryAttempts: 3,
      retryDelay: 1000,
      heartbeatInterval: 30000, // 30秒心跳
      cleanupInterval: 300000 // 5分钟清理
    };

    // 消息类型定义
    this.messageTypes = {
      TEST_STARTED: 'test_started',
      TEST_PROGRESS: 'test_progress',
      TEST_COMPLETED: 'test_completed',
      TEST_FAILED: 'test_failed',
      DATA_UPDATED: 'data_updated',
      NOTIFICATION: 'notification',
      SYSTEM_STATUS: 'system_status',
      USER_ACTIVITY: 'user_activity'
    };

    // 启动消息队列处理
    this.startQueueProcessor();

    // 启动定期清理
    this.startCleanupProcess();
  }

  /**
   * 订阅测试进度
   */
  async subscribeToTest(userId, testId, socketId = null) {
    try {
      const subscriptionKey = `${userId}:${testId}`;

      // 存储订阅信息
      this.subscribers.set(subscriptionKey, {
        userId,
        testId,
        socketId,
        subscribedAt: new Date(),
        lastUpdate: null
      });

      // 缓存订阅信息
      await this.cache.set('temporary', `subscription:${subscriptionKey}`, {
        userId,
        testId,
        subscribedAt: new Date().toISOString()
      }, 24 * 60 * 60); // 24小时过期


      // 如果测试已有进度，立即发送
      const currentProgress = this.testProgress.get(testId);
      if (currentProgress) {
        await this.sendTestProgress(testId, currentProgress);
      }

      return true;
    } catch (error) {
      console.error('订阅测试进度失败:', error);
      return false;
    }
  }

  /**
   * 取消订阅测试进度
   */
  async unsubscribeFromTest(userId, testId) {
    try {
      const subscriptionKey = `${userId}:${testId}`;

      // 删除订阅信息
      this.subscribers.delete(subscriptionKey);

      // 删除缓存
      await this.cache.delete('temporary', `subscription:${subscriptionKey}`);


      return true;
    } catch (error) {
      console.error('取消订阅测试进度失败:', error);
      return false;
    }
  }

  /**
   * 更新测试进度
   */
  async updateTestProgress(testId, progress) {
    try {
      // 验证进度数据
      const validatedProgress = this.validateProgress(progress);
      if (!validatedProgress) {
        throw new Error('无效的进度数据');
      }

      // 存储进度
      this.testProgress.set(testId, validatedProgress);

      // 缓存进度
      await this.cache.set('temporary', `progress:${testId}`, validatedProgress, 60 * 60); // 1小时过期

      // 发送进度更新
      await this.sendTestProgress(testId, validatedProgress);

      console.log(`📊 测试进度更新: ${testId} - ${validatedProgress.percentage}%`);

      return true;
    } catch (error) {
      console.error('更新测试进度失败:', error);
      return false;
    }
  }

  /**
   * 发送测试进度
   */
  async sendTestProgress(testId, progress) {
    try {
      // 通过Socket.IO广播
      this.socketManager.broadcastTestProgress(testId, progress);

      // 找到所有订阅者并发送个人消息
      const subscribers = Array.from(this.subscribers.entries())
        .filter(([key, sub]) => sub.testId === testId);

      for (const [key, subscription] of subscribers) {
        // 更新最后更新时间
        subscription.lastUpdate = new Date();

        // 发送个人消息
        const sent = this.socketManager.sendToUser(subscription.userId, 'test:progress_update', {
          testId,
          progress,
          subscription: {
            subscribedAt: subscription.subscribedAt,
            lastUpdate: subscription.lastUpdate
          }
        });

        if (!sent) {
          // 如果发送失败，加入重试队列
          this.addToQueue('test:progress_update', {
            userId: subscription.userId,
            testId,
            progress
          });
        }
      }

      return true;
    } catch (error) {
      console.error('发送测试进度失败:', error);
      return false;
    }
  }

  /**
   * 测试完成通知
   */
  async notifyTestComplete(testId, result) {
    try {
      // 验证结果数据
      const validatedResult = this.validateTestResult(result);
      if (!validatedResult) {
        throw new Error('无效的测试结果');
      }

      // 通过Socket.IO广播
      this.socketManager.broadcastTestComplete(testId, validatedResult);

      // 发送个人通知
      const subscribers = Array.from(this.subscribers.entries())
        .filter(([key, sub]) => sub.testId === testId);

      for (const [key, subscription] of subscribers) {
        const sent = this.socketManager.sendToUser(subscription.userId, 'test:completed', {
          testId,
          result: validatedResult,
          completedAt: new Date().toISOString()
        });

        if (!sent) {
          this.addToQueue('test:completed', {
            userId: subscription.userId,
            testId,
            result: validatedResult
          });
        }

        // 自动取消订阅
        await this.unsubscribeFromTest(subscription.userId, testId);
      }

      // 清理进度数据
      this.testProgress.delete(testId);
      await this.cache.delete('temporary', `progress:${testId}`);

      console.log(`✅ 测试完成通知已发送: ${testId}`);

      return true;
    } catch (error) {
      console.error('发送测试完成通知失败:', error);
      return false;
    }
  }

  /**
   * 测试失败通知
   */
  async notifyTestFailed(testId, error) {
    try {
      const errorInfo = {
        message: error.message || '测试执行失败',
        code: error.code || 'TEST_FAILED',
        timestamp: new Date().toISOString()
      };

      // 通过Socket.IO广播
      this.socketManager.io.to(`test:${testId}`).emit('test:failed', {
        testId,
        error: errorInfo
      });

      // 发送个人通知
      const subscribers = Array.from(this.subscribers.entries())
        .filter(([key, sub]) => sub.testId === testId);

      for (const [key, subscription] of subscribers) {
        const sent = this.socketManager.sendToUser(subscription.userId, 'test:failed', {
          testId,
          error: errorInfo
        });

        if (!sent) {
          this.addToQueue('test:failed', {
            userId: subscription.userId,
            testId,
            error: errorInfo
          });
        }

        // 自动取消订阅
        await this.unsubscribeFromTest(subscription.userId, testId);
      }

      // 清理进度数据
      this.testProgress.delete(testId);
      await this.cache.delete('temporary', `progress:${testId}`);

      console.log(`❌ 测试失败通知已发送: ${testId}`);

      return true;
    } catch (error) {
      console.error('发送测试失败通知失败:', error);
      return false;
    }
  }

  /**
   * 发送系统通知
   */
  async sendSystemNotification(message, options = {}) {
    try {
      const notification = {
        id: `notification_${Date.now()}`,
        message,
        level: options.level || 'info',
        category: options.category || 'system',
        targetUsers: options.targetUsers || null,
        targetRoles: options.targetRoles || null,
        persistent: options.persistent || false,
        expiresAt: options.expiresAt || null,
        timestamp: new Date().toISOString()
      };

      // 如果是持久化通知，存储到缓存
      if (notification.persistent) {
        await this.cache.set('temporary', `notification:${notification.id}`, notification, 24 * 60 * 60);
      }

      // 发送通知
      if (notification.targetUsers) {
        // 发送给特定用户
        for (const userId of notification.targetUsers) {
          const sent = this.socketManager.sendToUser(userId, 'system:notification', notification);
          if (!sent) {
            this.addToQueue('system:notification', {
              userId,
              notification
            });
          }
        }
      } else if (notification.targetRoles) {
        // 发送给特定角色
        for (const role of notification.targetRoles) {
          this.socketManager.broadcastSystemNotification(notification.message, notification.level, role);
        }
      } else {
        // 广播给所有用户
        this.socketManager.broadcastSystemNotification(notification.message, notification.level);
      }


      return notification.id;
    } catch (error) {
      console.error('发送系统通知失败:', error);
      return null;
    }
  }

  /**
   * 获取用户的未读通知
   */
  async getUserNotifications(userId) {
    try {
      // 从缓存获取持久化通知
      const notifications = [];

      // 这里可以实现更复杂的通知获取逻辑
      // 例如从数据库获取用户的历史通知

      return notifications;
    } catch (error) {
      console.error('获取用户通知失败:', error);
      return [];
    }
  }

  /**
   * 添加消息到队列
   */
  addToQueue(event, data) {
    if (this.messageQueue.length >= this.options.maxQueueSize) {
      console.warn('消息队列已满，丢弃最旧的消息');
      this.messageQueue.shift();
    }

    this.messageQueue.push({
      event,
      data,
      attempts: 0,
      createdAt: new Date(),
      nextRetry: new Date()
    });
  }

  /**
   * 启动消息队列处理器
   */
  startQueueProcessor() {
    if (this.isProcessingQueue) {
      
        return;
      }

    this.isProcessingQueue = true;

    const processQueue = async () => {
      if (this.messageQueue.length === 0) {
        
        setTimeout(processQueue, this.options.processInterval);
        return;
      }

      const batch = this.messageQueue.splice(0, this.options.batchSize);
      const now = new Date();

      for (const message of batch) {
        if (message.nextRetry > now) {
          // 还没到重试时间，放回队列
          this.messageQueue.unshift(message);
          continue;
        }

        try {
          let success = false;

          switch (message.event) {
            case 'test:progress_update':
            case 'test:completed':
            case 'test:failed':
              success = this.socketManager.sendToUser(message.data.userId, message.event, message.data);
              break;
            case 'system:notification':
              success = this.socketManager.sendToUser(message.data.userId, message.event, message.data.notification);
              break;
          }

          if (!success) {
            throw new Error('消息发送失败');
          }

        } catch (error) {
          message.attempts++;

          if (message.attempts < this.options.retryAttempts) {
            // 重试
            message.nextRetry = new Date(now.getTime() + this.options.retryDelay * message.attempts);
            this.messageQueue.push(message);
          } else {
            console.error(`消息重试失败，已丢弃:`, message);
          }
        }
      }

      setTimeout(processQueue, this.options.processInterval);
    };

    processQueue();
  }

  /**
   * 验证进度数据
   */
  validateProgress(progress) {
    if (!progress || typeof progress !== 'object') {
      
        return null;
      }

    const validated = {
      percentage: Math.max(0, Math.min(100, progress.percentage || 0)),
      stage: progress.stage || 'unknown',
      message: progress.message || '',
      details: progress.details || {},
      timestamp: new Date().toISOString()
    };

    return validated;
  }

  /**
   * 验证测试结果
   */
  validateTestResult(result) {
    if (!result || typeof result !== 'object') {
      
        return null;
      }

    return {
      testId: result.testId,
      status: result.status || 'completed',
      score: result.score || 0,
      grade: result.grade || 'F',
      summary: result.summary || {},
      completedAt: result.completedAt || new Date().toISOString()
    };
  }

  /**
   * 获取服务统计信息
   */
  getStats() {
    return {
      subscribers: this.subscribers.size,
      activeTests: this.testProgress.size,
      queueSize: this.messageQueue.length,
      socketStats: this.socketManager.getStats()
    };
  }

  /**
   * 清理过期数据
   */
  async cleanup() {
    try {
      const now = new Date();
      const expireTime = 24 * 60 * 60 * 1000; // 24小时

      // 清理过期订阅
      for (const [key, subscription] of this.subscribers.entries()) {
        if (now - subscription.subscribedAt > expireTime) {
          this.subscribers.delete(key);
          await this.cache.delete('temporary', `subscription:${key}`);
        }
      }

      // 清理过期进度
      for (const [testId, progress] of this.testProgress.entries()) {
        if (now - new Date(progress.timestamp) > expireTime) {
          this.testProgress.delete(testId);
          await this.cache.delete('temporary', `progress:${testId}`);
        }
      }

    } catch (error) {
      console.error('清理实时服务数据失败:', error);
    }
  }

  /**
   * 推送数据更新通知
   */
  async pushDataUpdate(dataType, operation, data, userId = null) {
    try {
      const message = {
        type: this.messageTypes.DATA_UPDATED,
        dataType,
        operation,
        data,
        timestamp: new Date().toISOString()
      };

      // 添加到消息队列
      this.addToQueue({
        type: 'broadcast',
        channel: `data:${dataType}`,
        message,
        userId
      });

      console.log(`📊 推送数据更新: ${dataType} - ${operation}`);
    } catch (error) {
      console.error('推送数据更新失败:', error);
    }
  }

  /**
   * 推送系统通知
   */
  async pushNotification(notification) {
    try {
      const message = {
        type: this.messageTypes.NOTIFICATION,
        notification: {
          id: this.generateNotificationId(),
          ...notification,
          timestamp: new Date().toISOString()
        }
      };

      // 存储通知
      this.notifications.set(message.notification.id, message.notification);

      // 推送通知
      if (notification.userId) {
        this.addToQueue({
          type: 'user',
          userId: notification.userId,
          message
        });
      } else {
        this.addToQueue({
          type: 'broadcast',
          channel: 'notifications',
          message
        });
      }

    } catch (error) {
      console.error('推送通知失败:', error);
    }
  }

  /**
   * 推送系统状态更新
   */
  async pushSystemStatus(status) {
    try {
      const message = {
        type: this.messageTypes.SYSTEM_STATUS,
        status,
        timestamp: new Date().toISOString()
      };

      this.addToQueue({
        type: 'broadcast',
        channel: 'system',
        message
      });

    } catch (error) {
      console.error('推送系统状态失败:', error);
    }
  }

  /**
   * 推送用户活动
   */
  async pushUserActivity(userId, activity) {
    try {
      const message = {
        type: this.messageTypes.USER_ACTIVITY,
        userId,
        activity,
        timestamp: new Date().toISOString()
      };

      this.addToQueue({
        type: 'broadcast',
        channel: 'user_activity',
        message,
        excludeUserId: userId
      });

    } catch (error) {
      console.error('推送用户活动失败:', error);
    }
  }

  /**
   * 创建协作房间
   */
  async createRoom(roomId, options = {}) {
    try {
      const room = {
        id: roomId,
        name: options.name || roomId,
        type: options.type || 'collaboration',
        members: new Set(),
        createdAt: new Date(),
        lastActivity: new Date(),
        settings: options.settings || {}
      };

      this.rooms.set(roomId, room);

      // 缓存房间信息
      await this.cache.set('temporary', `room:${roomId}`, room, 24 * 60 * 60);

      return room;
    } catch (error) {
      console.error('创建协作房间失败:', error);
      throw error;
    }
  }

  /**
   * 加入协作房间
   */
  async joinRoom(userId, roomId) {
    try {
      let room = this.rooms.get(roomId);

      if (!room) {
        // 尝试从缓存加载房间
        const cachedRoom = await this.cache.get('temporary', `room:${roomId}`);
        if (cachedRoom) {
          room = {
            ...cachedRoom,
            members: new Set(cachedRoom.members || [])
          };
          this.rooms.set(roomId, room);
        } else {
          // 创建新房间
          room = await this.createRoom(roomId);
        }
      }

      room.members.add(userId);
      room.lastActivity = new Date();

      // 通知房间内其他成员
      this.addToQueue({
        type: 'room',
        roomId,
        message: {
          type: 'user_joined',
          userId,
          timestamp: new Date().toISOString()
        },
        excludeUserId: userId
      });

      return room;
    } catch (error) {
      console.error('加入协作房间失败:', error);
      throw error;
    }
  }

  /**
   * 离开协作房间
   */
  async leaveRoom(userId, roomId) {
    try {
      const room = this.rooms.get(roomId);
      if (!room) return;

      room.members.delete(userId);
      room.lastActivity = new Date();

      // 通知房间内其他成员
      this.addToQueue({
        type: 'room',
        roomId,
        message: {
          type: 'user_left',
          userId,
          timestamp: new Date().toISOString()
        },
        excludeUserId: userId
      });

      // 如果房间为空，删除房间
      if (room.members.size === 0) {
        this.rooms.delete(roomId);
        await this.cache.delete('temporary', `room:${roomId}`);
      }

    } catch (error) {
      console.error('离开协作房间失败:', error);
    }
  }

  /**
   * 启动定期清理
   */
  startCleanupProcess() {
    setInterval(async () => {
      await this.cleanupData();
      await this.cleanupRooms();
      await this.cleanupNotifications();
    }, this.options.cleanupInterval);
  }

  /**
   * 清理房间
   */
  async cleanupRooms() {
    try {
      const expireTime = 24 * 60 * 60 * 1000; // 24小时
      const now = new Date();

      for (const [roomId, room] of this.rooms) {
        if (now - room.lastActivity > expireTime || room.members.size === 0) {
          this.rooms.delete(roomId);
          await this.cache.delete('temporary', `room:${roomId}`);
        }
      }
    } catch (error) {
      console.error('清理房间失败:', error);
    }
  }

  /**
   * 清理通知
   */
  async cleanupNotifications() {
    try {
      const expireTime = 7 * 24 * 60 * 60 * 1000; // 7天
      const now = new Date();

      for (const [notificationId, notification] of this.notifications) {
        if (now - new Date(notification.timestamp) > expireTime) {
          this.notifications.delete(notificationId);
        }
      }
    } catch (error) {
      console.error('清理通知失败:', error);
    }
  }

  /**
   * 生成通知ID
   */
  generateNotificationId() {
    return `notification_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 获取服务统计信息
   */
  getStats() {
    return {
      subscribers: this.subscribers.size,
      activeTests: this.testProgress.size,
      queueSize: this.messageQueue.length,
      rooms: this.rooms.size,
      notifications: this.notifications.size,
      isProcessingQueue: this.isProcessingQueue
    };
  }

  /**
   * 关闭服务
   */
  async shutdown() {

    this.isProcessingQueue = false;

    // 通知所有用户服务即将关闭
    await this.sendSystemNotification('系统维护中，连接即将断开', {
      level: 'warning',
      category: 'maintenance'
    });

    // 清理数据
    this.subscribers.clear();
    this.testProgress.clear();
    this.messageQueue.length = 0;

    console.log('✅ 实时通信服务已关闭');
  }
}

module.exports = RealtimeService;
