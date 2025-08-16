/**
 * 前端实时协作服务
 * 提供WebSocket连接和协作功能管理
 */

export interface CollaborationUser     {
  id: string;
  sessionId: string;
  name?: string;
  avatar?: string;
  cursor?: {
    position: number;
    selection?: { start: number; end: number };
    timestamp: Date;
  };
}

export interface CollaborationComment     {
  id: string;
  documentId: string;
  position: number;
  content: string;
  parentId?: string;
  authorId: string;
  authorName?: string;
  createdAt: Date;
  updatedAt: Date;
  resolved: boolean;
  replies: string[];
}

export interface CollaborationDocument     {
  id: string;
  content: string;
  version: number;
  lastModified: Date;
  collaborators: Set<string>;
}

export interface ShareLink     {
  id: string;
  documentId: string;
  url: string;
  permissions: 'read' | 'write' | 'admin';
  expiresAt?: Date;
  createdAt: Date;
  accessCount: number;
}

class CollaborationService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  private currentRoom: string | null = null;
  private currentDocument: string | null = null;
  private sessionId: string | null = null;
  
  private users = new Map<string, CollaborationUser>();
  private comments = new Map<string, CollaborationComment>();
  private document: CollaborationDocument | null = null;
  
  private eventListeners = new Map<string, Function[]>();

  /**
   * 连接到协作服务
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      
        return;
      }

    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https: ' ? 'wss: ' : 'ws: ';
        const wsUrl = `${protocol}/${window.location.host}/ws/collaboration`;`
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log("✅ 协作服务连接成功');'`
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');'
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.ws.onclose = () => {
          console.log('❌ 协作服务连接断开');'
          this.isConnected = false;
          this.emit('disconnected');'
          this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error);'
          this.emit('error', error);'
          reject(error);
        };
        
      } catch (error) {
        console.error('连接协作服务失败:', error);'
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.currentRoom = null;
    this.currentDocument = null;
    this.users.clear();
    this.comments.clear();
    this.document = null;
  }

  /**
   * 加入协作房间
   */
  async joinRoom(roomId: string, documentId: string): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    this.send({
      type: 'join_room','
      roomId,
      documentId
    });

    this.currentRoom = roomId;
    this.currentDocument = documentId;
  }

  /**
   * 离开协作房间
   */
  leaveRoom(): void {
    if (this.currentRoom) {
      this.send({
        type: 'leave_room','
        roomId: this.currentRoom
      });
      
      this.currentRoom = null;
      this.currentDocument = null;
      this.users.clear();
      this.comments.clear();
      this.document = null;
    }
  }

  /**
   * 编辑文档
   */
  editDocument(operation: any, content?: string): void {
    if (!this.currentDocument || !this.document) {
      
        console.warn('没有活跃的文档');'
      return;
      }

    this.send({
      type: 'document_edit','
      documentId: this.currentDocument,
      operation,
      content,
      version: this.document.version
    });
  }

  /**
   * 更新光标位置
   */
  updateCursor(position: number, selection?: { start: number; end: number }): void {
    this.send({
      type: 'cursor_update','
      position,
      selection
    });
  }

  /**
   * 添加评论
   */
  addComment(position: number, content: string, parentId?: string): void {
    if (!this.currentDocument) {
      
        console.warn('没有活跃的文档');'
      return;
      }

    this.send({
      type: 'add_comment','
      documentId: this.currentDocument,
      position,
      content,
      parentId
    });
  }

  /**
   * 更新评论
   */
  updateComment(commentId: string, content: string): void {
    this.send({
      type: 'update_comment','
      commentId,
      content
    });
  }

  /**
   * 删除评论
   */
  deleteComment(commentId: string): void {
    this.send({
      type: 'delete_comment','
      commentId
    });
  }

  /**
   * 创建分享链接
   */
  createShareLink(permissions: string = 'read', expiresAt?: Date): void {'
    if (!this.currentDocument) {
      
        console.warn('没有活跃的文档');'
      return;
      }

    this.send({
      type: 'create_share_link','
      documentId: this.currentDocument,
      permissions,
      expiresAt: expiresAt?.toISOString()
    });
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'connection_established': ''
          this.sessionId = message.sessionId;
          this.emit('session_established', message);'
          break;
          
        case 'room_joined': ''
          this.handleRoomJoined(message);
          break;
          
        case 'user_joined': ''
          this.handleUserJoined(message);
          break;
          
        case 'user_left': ''
          this.handleUserLeft(message);
          break;
          
        case 'document_updated': ''
          this.handleDocumentUpdated(message);
          break;
          
        case 'cursor_updated': ''
          this.handleCursorUpdated(message);
          break;
          
        case 'comment_added': ''
          this.handleCommentAdded(message);
          break;
          
        case 'comment_updated': ''
          this.handleCommentUpdated(message);
          break;
          
        case 'comment_deleted': ''
          this.handleCommentDeleted(message);
          break;
          
        case 'share_link_created': ''
          this.handleShareLinkCreated(message);
          break;
          
        case 'version_conflict': ''
          this.handleVersionConflict(message);
          break;
          
        case 'error': ''
          this.handleError(message);
          break;
          
        case 'pong': ''
          // 心跳响应
          break;
          
        default:
          console.warn('未知消息类型:', message.type);'
      }
    } catch (error) {
      console.error('处理消息失败:', error);'
    }
  }

  /**
   * 处理加入房间成功
   */
  private handleRoomJoined(message: any): void {
    // 更新文档状态
    this.document = {
      id: message.documentId,
      content: message.document.content,
      version: message.document.version,
      lastModified: new Date(),
      collaborators: new Set()
    };

    // 更新用户列表
    this.users.clear();
    message.users.forEach((user: any) => {
      this.users.set(user.sessionId, {
        id: user.id,
        sessionId: user.sessionId
      });
    });

    this.emit('room_joined', {'
      roomId: this.currentRoom,
      document: this.document,
      users: Array.from(this.users.values())
    });
  }

  /**
   * 处理用户加入
   */
  private handleUserJoined(message: any): void {
    const user: CollaborationUser  = {
      id: message.userId,
      sessionId: message.sessionId
    };
    this.users.set(message.sessionId, user);
    this.emit('user_joined', user);'
  }

  /**
   * 处理用户离开
   */
  private handleUserLeft(message: any): void {
    const user = this.users.get(message.sessionId);
    if (user) {
      this.users.delete(message.sessionId);
      this.emit('user_left', user);'
    }
  }

  /**
   * 处理文档更新
   */
  private handleDocumentUpdated(message: any): void {
    if (this.document) {
      this.document.content = message.content;
      this.document.version = message.version;
      this.document.lastModified = new Date();
    }

    this.emit('document_updated', {'
      operation: message.operation,
      content: message.content,
      version: message.version,
      userId: message.userId
    });
  }

  /**
   * 处理光标更新
   */
  private handleCursorUpdated(message: any): void {
    const user = this.users.get(message.sessionId);
    if (user) {
      user.cursor = {
        ...message.cursor,
        timestamp: new Date(message.cursor.timestamp)
      };
      
      this.emit('cursor_updated', {'
        user,
        cursor: user.cursor
      });
    }
  }

  /**
   * 处理评论添加
   */
  private handleCommentAdded(message: any): void {
    const comment: CollaborationComment  = {
      ...message.comment,
      createdAt: new Date(message.comment.createdAt),
      updatedAt: new Date(message.comment.updatedAt)
    };
    this.comments.set(comment.id, comment);
    this.emit('comment_added', comment);'
  }

  /**
   * 处理分享链接创建
   */
  private handleShareLinkCreated(message: any): void {
    const shareLink: ShareLink  = {
      ...message.shareLink,
      createdAt: new Date(message.shareLink.createdAt),
      expiresAt: message.shareLink.expiresAt ? new Date(message.shareLink.expiresAt) : undefined
    };
    this.emit('share_link_created', shareLink);'
  }

  /**
   * 处理版本冲突
   */
  private handleVersionConflict(message: any): void {
    this.emit('version_conflict', {'
      documentId: message.documentId,
      currentVersion: message.currentVersion,
      yourVersion: message.yourVersion
    });
  }

  /**
   * 处理错误
   */
  private handleError(message: any): void {
    console.error('协作服务错误:', message.message);'
    this.emit('error', new Error(message.message));'
  }

  /**
   * 发送消息
   */
  private send(message: any): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket未连接，无法发送消息');'
    }
  }

  /**
   * 尝试重连
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      
        console.error('达到最大重连次数，停止重连');'
      return;
      }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`${delay}ms后尝试第${this.reconnectAttempts}次重连...`);`
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error("重连失败:', error);'`
      });
    }, delay);
  }

  /**
   * 事件监听
   */
  on(event: string, callback: Function): ()  => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    this.eventListeners.get(event)!.push(callback);
    
    // 返回取消监听的函数
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * 触发事件
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * 获取当前状态
   */
  getState() {
    return {
      isConnected: this.isConnected,
      currentRoom: this.currentRoom,
      currentDocument: this.currentDocument,
      sessionId: this.sessionId,
      users: Array.from(this.users.values()),
      comments: Array.from(this.comments.values()),
      document: this.document
    };
  }

  /**
   * 发送心跳
   */
  ping(): void {
    this.send({ type: 'ping' });'
  }
}

export const collaborationService = new CollaborationService();

// 自动心跳
setInterval(() => {
  if (collaborationService.getState().isConnected) {
    collaborationService.ping();
  }
}, 30000);
