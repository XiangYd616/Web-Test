/**
 * 实时协作服务
 * 提供多用户协作功能，包括实时编辑、评论、分享等
 */

import { EventEmitter } from 'events';
import WebSocket, { Server as WebSocketServer } from 'ws';

// 协作房间接口
export interface CollaborationRoom {
  id: string;
  name: string;
  type: 'document' | 'project' | 'workspace';
  ownerId: string;
  participants: Participant[];
  document?: Document;
  createdAt: Date;
  lastActivity: Date;
  settings: RoomSettings;
}

// 参与者接口
export interface Participant {
  id: string;
  userId: string;
  username: string;
  color?: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'online' | 'offline' | 'away';
  joinedAt: Date;
  lastSeen: Date;
  cursor?: CursorPosition;
  permissions: Permission[];
}

// 光标位置接口
export interface CursorPosition {
  line: number;
  column: number;
  selection?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

// 权限接口
export interface Permission {
  action: 'read' | 'write' | 'delete' | 'share' | 'admin';
  granted: boolean;
}

// 文档接口
export interface Document {
  id: string;
  title: string;
  content: string;
  version: number;
  lastModified: Date;
  modifiedBy: string;
  history: DocumentHistory[];
  collaborators: string[];
}

// 文档历史接口
export interface DocumentHistory {
  id: string;
  timestamp: Date;
  userId: string;
  action: 'create' | 'update' | 'delete' | 'format';
  content: string;
  changes: DocumentChange[];
}

// 文档变更接口
export interface DocumentChange {
  type: 'insert' | 'delete' | 'replace';
  position: number;
  length: number;
  content: string;
  userId: string;
  timestamp: Date;
}

// 评论接口
export interface Comment {
  id: string;
  documentId: string;
  userId: string;
  username: string;
  content: string;
  position: {
    line: number;
    column: number;
  };
  threadId?: string;
  replies: Comment[];
  createdAt: Date;
  updatedAt: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

// 分享链接接口
export interface ShareLink {
  id: string;
  documentId: string;
  token: string;
  createdBy: string;
  permissions: Permission[];
  expiresAt?: Date;
  accessCount: number;
  maxAccess?: number;
  createdAt: Date;
}

// 房间设置接口
export interface RoomSettings {
  allowAnonymous: boolean;
  requireApproval: boolean;
  maxParticipants: number;
  enableComments: boolean;
  enableCursorTracking: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
}

// 协作事件接口
export interface CollaborationEvent {
  type: 'user_joined' | 'user_left' | 'document_updated' | 'comment_added' | 'cursor_moved';
  data: unknown;
  timestamp: Date;
  userId?: string;
  roomId: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

class CollaborationService extends EventEmitter {
  private rooms: Map<string, CollaborationRoom> = new Map();
  private users: Map<string, Participant> = new Map();
  private documents: Map<string, Document> = new Map();
  private comments: Map<string, Comment[]> = new Map();
  private shareLinks: Map<string, ShareLink> = new Map();
  private isInitialized: boolean = false;
  private wsServer?: WebSocketServer;
  private connections: Map<string, WebSocket> = new Map();
  private connectionParticipants: Map<string, string> = new Map();
  private readonly participantColors = [
    '#F97316',
    '#22C55E',
    '#3B82F6',
    '#F43F5E',
    '#A855F7',
    '#14B8A6',
    '#EAB308',
  ];

  /**
   * 初始化协作服务
   */
  async initialize(
    options?:
      | unknown
      | {
          server?: unknown;
          path?: string;
        }
  ): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const server =
        typeof options === 'object' && options ? (options as { server?: unknown }).server : options;
      const path =
        typeof options === 'object' && options ? (options as { path?: string }).path : undefined;
      if (server) {
        this.wsServer = new WebSocketServer({ server, path });
        this.setupWebSocketServer();
      }

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 创建协作房间
   */
  async createRoom(
    roomData: Omit<CollaborationRoom, 'id' | 'createdAt' | 'lastActivity'>
  ): Promise<string> {
    const roomId = this.generateId();
    const room: CollaborationRoom = {
      ...roomData,
      id: roomId,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.rooms.set(roomId, room);
    this.emit('room_created', room);

    return roomId;
  }

  /**
   * 加入房间
   */
  async joinRoom(
    roomId: string,
    participant: Omit<Participant, 'id' | 'joinedAt' | 'lastSeen'>,
    participantId?: string
  ): Promise<Participant> {
    const room = this.rooms.get(roomId);
    if (!room) {
      const createdRoom = await this.createRoom({
        name: `Room ${roomId}`,
        type: 'document',
        ownerId: participant.userId,
        participants: [],
        document: {
          id: roomId,
          title: `Document ${roomId}`,
          content: '',
          version: 1,
          lastModified: new Date(),
          modifiedBy: participant.userId,
          history: [],
          collaborators: [],
        },
        settings: {
          allowAnonymous: false,
          requireApproval: false,
          maxParticipants: 20,
          enableComments: true,
          enableCursorTracking: true,
          autoSave: true,
          autoSaveInterval: 5000,
        },
      });
      if (!this.rooms.get(createdRoom)) {
        throw new Error('Room not found');
      }
    }

    const activeRoom = this.rooms.get(roomId);
    if (!activeRoom) {
      throw new Error('Room not found');
    }

    const existingParticipant = participantId ? this.users.get(participantId) : undefined;
    if (existingParticipant) {
      existingParticipant.status = 'online';
      existingParticipant.lastSeen = new Date();
      if (!existingParticipant.color) {
        existingParticipant.color = this.pickColor(existingParticipant.userId);
      }
      const targetRoom = this.rooms.get(roomId);
      if (targetRoom && !targetRoom.participants.find(p => p.id === existingParticipant.id)) {
        targetRoom.participants.push(existingParticipant);
      }
      return existingParticipant;
    }

    if (activeRoom.participants.length >= activeRoom.settings.maxParticipants) {
      throw new Error('Room is full');
    }

    const fullParticipant: Participant = {
      ...participant,
      id: this.generateId(),
      color: participant.color || this.pickColor(participant.userId),
      joinedAt: new Date(),
      lastSeen: new Date(),
    };

    const targetRoom = this.rooms.get(roomId);
    if (targetRoom) {
      targetRoom.participants.push(fullParticipant);
      targetRoom.lastActivity = new Date();
    }

    this.users.set(fullParticipant.id, fullParticipant);
    this.emit('user_joined', { roomId, participant: fullParticipant });

    return fullParticipant;
  }

  /**
   * 离开房间
   */
  async leaveRoom(roomId: string, participantId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    const participantIndex = room.participants.findIndex(p => p.id === participantId);
    if (participantIndex === -1) {
      return false;
    }

    const participant = room.participants[participantIndex];
    room.participants.splice(participantIndex, 1);
    room.lastActivity = new Date();

    const participantColor = participant.color;
    this.users.delete(participantId);
    this.emit('user_left', { roomId, participant });

    this.sendToRoom(roomId, {
      type: 'participant_left',
      data: { participantId, userId: participant.userId, color: participantColor },
    });

    // 如果房间为空，删除房间
    if (room.participants.length === 0) {
      this.rooms.delete(roomId);
    }

    return true;
  }

  /**
   * 创建文档
   */
  async createDocument(
    documentData: Omit<Document, 'id' | 'version' | 'lastModified' | 'history' | 'collaborators'>
  ): Promise<string> {
    const documentId = this.generateId();
    const document: Document = {
      ...documentData,
      id: documentId,
      version: 1,
      lastModified: new Date(),
      history: [],
      collaborators: [],
    };

    this.documents.set(documentId, document);
    this.emit('document_created', document);

    return documentId;
  }

  /**
   * 更新文档
   */
  async updateDocument(
    documentId: string,
    changes: DocumentChange[],
    userId: string
  ): Promise<Document> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // 应用变更
    let newContent = document.content;
    for (const change of changes) {
      newContent = this.applyChange(newContent, change);
    }

    // 更新文档
    document.content = newContent;
    document.version++;
    document.lastModified = new Date();
    document.modifiedBy = userId;

    // 添加到历史记录
    const historyEntry: DocumentHistory = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      action: 'update',
      content: newContent,
      changes,
    };

    document.history.push(historyEntry);

    // 限制历史记录大小
    if (document.history.length > 100) {
      document.history = document.history.slice(-100);
    }

    this.documents.set(documentId, document);
    this.emit('document_updated', { documentId, document, changes, userId });

    this.sendToRoom(documentId, {
      type: 'document_updated',
      data: {
        documentId,
        content: document.content,
        version: document.version,
        changes,
        userId,
      },
    });

    return document;
  }

  /**
   * 获取文档
   */
  async getDocument(documentId: string): Promise<Document | null> {
    return this.documents.get(documentId) || null;
  }

  /**
   * 添加评论
   */
  async addComment(
    commentData: Omit<
      Comment,
      'id' | 'createdAt' | 'updatedAt' | 'replies' | 'resolved' | 'resolvedBy' | 'resolvedAt'
    >
  ): Promise<Comment> {
    const comment: Comment = {
      ...commentData,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      replies: [],
      resolved: false,
    };

    const documentComments = this.comments.get(comment.documentId) || [];
    documentComments.push(comment);
    this.comments.set(comment.documentId, documentComments);

    this.emit('comment_added', comment);
    return comment;
  }

  /**
   * 回复评论
   */
  async replyToComment(
    commentId: string,
    replyData: Omit<
      Comment,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'replies'
      | 'resolved'
      | 'resolvedBy'
      | 'resolvedAt'
      | 'threadId'
    >
  ): Promise<Comment> {
    const reply: Comment = {
      ...replyData,
      id: this.generateId(),
      threadId: commentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      replies: [],
      resolved: false,
    };

    // 查找父评论
    for (const comments of this.comments.values()) {
      const parentComment = comments.find(c => c.id === commentId);
      if (parentComment) {
        parentComment.replies.push(reply);
        this.emit('comment_replied', { parentComment, reply });
        return reply;
      }
    }

    throw new Error('Parent comment not found');
  }

  /**
   * 解决评论
   */
  async resolveComment(commentId: string, userId: string): Promise<boolean> {
    for (const comments of this.comments.values()) {
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
        comment.resolved = true;
        comment.resolvedBy = userId;
        comment.resolvedAt = new Date();
        comment.updatedAt = new Date();

        this.emit('comment_resolved', comment);
        return true;
      }
    }

    return false;
  }

  /**
   * 获取文档评论
   */
  async getDocumentComments(documentId: string): Promise<Comment[]> {
    return this.comments.get(documentId) || [];
  }

  /**
   * 创建分享链接
   */
  async createShareLink(
    linkData: Omit<ShareLink, 'id' | 'token' | 'accessCount' | 'createdAt'>
  ): Promise<ShareLink> {
    const shareLink: ShareLink = {
      ...linkData,
      id: this.generateId(),
      token: this.generateToken(),
      accessCount: 0,
      createdAt: new Date(),
    };

    this.shareLinks.set(shareLink.token, shareLink);
    this.emit('share_link_created', shareLink);

    return shareLink;
  }

  /**
   * 验证分享链接
   */
  async validateShareLink(token: string): Promise<ShareLink | null> {
    const shareLink = this.shareLinks.get(token);
    if (!shareLink) {
      return null;
    }

    // 检查是否过期
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      this.shareLinks.delete(token);
      return null;
    }

    // 检查访问次数限制
    if (shareLink.maxAccess && shareLink.accessCount >= shareLink.maxAccess) {
      return null;
    }

    shareLink.accessCount++;
    return shareLink;
  }

  /**
   * 更新用户光标位置
   */
  async updateCursor(participantId: string, cursor: CursorPosition): Promise<void> {
    const participant = this.users.get(participantId);
    if (participant) {
      participant.cursor = cursor;
      participant.lastSeen = new Date();
      this.emit('cursor_moved', { participantId, cursor });

      const roomId = this.findRoomByParticipant(participantId);
      if (roomId) {
        this.sendToRoom(roomId, {
          type: 'cursor_moved',
          data: {
            participantId,
            userId: participant.userId,
            username: participant.username,
            color: participant.color,
            cursor,
          },
        });
      }
    }
  }

  /**
   * 获取房间信息
   */
  async getRoom(roomId: string): Promise<CollaborationRoom | null> {
    return this.rooms.get(roomId) || null;
  }

  /**
   * 获取用户信息
   */
  async getUser(participantId: string): Promise<Participant | null> {
    return this.users.get(participantId) || null;
  }

  /**
   * 获取房间参与者
   */
  async getRoomParticipants(roomId: string): Promise<Participant[]> {
    const room = this.rooms.get(roomId);
    return room ? room.participants : [];
  }

  /**
   * 广播事件到房间
   */
  async broadcastToRoom(roomId: string, event: CollaborationEvent): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    // 这里应该通过WebSocket发送给房间内的所有用户
    // 简化实现，只触发事件
    this.emit('broadcast', { roomId, event });
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<{
    totalRooms: number;
    totalUsers: number;
    totalDocuments: number;
    totalComments: number;
    totalShareLinks: number;
  }> {
    let totalComments = 0;
    for (const comments of this.comments.values()) {
      totalComments += comments.length;
    }

    return {
      totalRooms: this.rooms.size,
      totalUsers: this.users.size,
      totalDocuments: this.documents.size,
      totalComments,
      totalShareLinks: this.shareLinks.size,
    };
  }

  /**
   * 清理过期数据
   */
  async cleanup(): Promise<void> {
    const now = new Date();
    const expireTime = 24 * 60 * 60 * 1000; // 24小时

    // 清理过期的分享链接
    for (const [token, link] of this.shareLinks.entries()) {
      if (link.expiresAt && link.expiresAt < now) {
        this.shareLinks.delete(token);
      }
    }

    // 清理离线用户
    for (const [userId, user] of this.users.entries()) {
      if (now.getTime() - user.lastSeen.getTime() > expireTime) {
        this.users.delete(userId);
      }
    }

    // 清理空房间
    for (const [roomId, room] of this.rooms.entries()) {
      if (
        room.participants.length === 0 &&
        now.getTime() - room.lastActivity.getTime() > expireTime
      ) {
        this.rooms.delete(roomId);
      }
    }

    this.emit('cleanup_completed');
  }

  /**
   * 销毁服务
   */
  async destroy(): Promise<void> {
    if (this.wsServer) {
      this.wsServer.close();
    }

    this.rooms.clear();
    this.users.clear();
    this.documents.clear();
    this.comments.clear();
    this.shareLinks.clear();

    this.isInitialized = false;
    this.emit('destroyed');
  }

  /**
   * 设置WebSocket服务器
   */
  private setupWebSocketServer(): void {
    if (!this.wsServer) return;

    this.wsServer.on('connection', (socket, _req) => {
      this.handleWebSocketConnection(socket as WebSocket, _req);
    });
  }

  /**
   * 处理WebSocket连接
   */
  private handleWebSocketConnection(ws: WebSocket, _req: unknown): void {
    const connectionId = this.generateId();
    this.connections.set(connectionId, ws);

    ws.on('message', (data: unknown) => {
      try {
        const messageText =
          typeof data === 'string'
            ? data
            : Buffer.isBuffer(data)
              ? data.toString()
              : Array.isArray(data)
                ? Buffer.concat(data).toString()
                : Buffer.from(data as ArrayBuffer).toString();
        const message = JSON.parse(messageText);
        this.handleWebSocketMessage(ws, connectionId, message).catch(error => {
          this.emit('error', error);
        });
      } catch (error) {
        this.emit('error', error);
      }
    });

    ws.on('close', () => {
      this.connections.delete(connectionId);
      this.handleWebSocketClose(connectionId);
    });

    ws.on('error', (error: unknown) => {
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    });
  }

  /**
   * 处理WebSocket消息
   */
  private async handleWebSocketMessage(
    ws: WebSocket,
    connectionId: string,
    message: unknown
  ): Promise<void> {
    if (!isRecord(message) || typeof message.type !== 'string') {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      return;
    }

    const payload = isRecord(message.data) ? (message.data as Record<string, unknown>) : message;

    switch (message.type) {
      case 'join_room':
        this.joinRoom(
          String(payload.roomId || ''),
          payload.participant as Participant,
          typeof payload.participantId === 'string' ? payload.participantId : undefined
        )
          .then(participant => {
            this.connectionParticipants.set(connectionId, participant.id);
            this.connections.set(participant.id, ws);
            const room = this.rooms.get(String(payload.roomId || ''));
            ws.send(
              JSON.stringify({
                type: 'joined',
                participant,
                roomId: room?.id,
                document: room?.document,
                participants: room?.participants || [],
              })
            );

            if (room) {
              this.sendToRoom(room.id, {
                type: 'participant_joined',
                data: {
                  participantId: participant.id,
                  userId: participant.userId,
                  username: participant.username,
                  color: participant.color,
                },
              });
            }
          })
          .catch(error => {
            ws.send(JSON.stringify({ type: 'error', message: error.message }));
          });
        break;

      case 'sync_document': {
        const documentId = String(payload.documentId || payload.roomId || '');
        const document = this.documents.get(documentId) || this.rooms.get(documentId)?.document;
        if (!document) {
          ws.send(JSON.stringify({ type: 'error', message: 'Document not found' }));
          return;
        }
        ws.send(
          JSON.stringify({
            type: 'document_sync',
            data: {
              documentId,
              content: document.content,
              version: document.version,
            },
          })
        );
        break;
      }

      case 'leave_room':
        this.leaveRoom(
          String(payload.roomId || ''),
          this.connectionParticipants.get(connectionId) ?? connectionId
        );
        break;

      case 'update_document':
        this.updateDocument(
          String(payload.documentId || ''),
          payload.changes as DocumentChange[],
          this.connectionParticipants.get(connectionId) ?? connectionId
        );
        break;

      case 'update_cursor':
        this.updateCursor(
          this.connectionParticipants.get(connectionId) ?? connectionId,
          payload.cursor as CursorPosition
        );
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;

      case 'add_annotation': {
        const annotationData = payload as Omit<
          Comment,
          'id' | 'createdAt' | 'updatedAt' | 'replies'
        >;
        try {
          const documentId = String(annotationData.documentId || payload.reportId || '');
          const annotation = await this.addComment({
            ...annotationData,
            documentId,
            userId: annotationData.userId,
            username: annotationData.username,
            content: annotationData.content,
            position: annotationData.position,
          });

          ws.send(
            JSON.stringify({
              type: 'annotation_added',
              data: annotation,
            })
          );

          // 广播给房间内其他用户
          this.sendToRoom(documentId, {
            type: 'annotation_added',
            data: annotation,
          });
        } catch (error) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : '添加批注失败',
            })
          );
        }
        break;
      }

      case 'update_annotation': {
        const { annotationId, content } = payload as { annotationId: string; content: string };
        try {
          // 查找并更新批注
          for (const comments of this.comments.values()) {
            const annotation = comments.find(c => c.id === annotationId);
            if (annotation) {
              annotation.content = content;
              annotation.updatedAt = new Date();

              ws.send(
                JSON.stringify({
                  type: 'annotation_updated',
                  data: annotation,
                })
              );

              // 广播给房间内其他用户
              this.sendToRoom(annotation.documentId, {
                type: 'annotation_updated',
                data: annotation,
              });
              break;
            }
          }
        } catch (error) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : '更新批注失败',
            })
          );
        }
        break;
      }

      case 'delete_annotation': {
        const { annotationId } = payload as { annotationId: string };
        try {
          let deletedAnnotation: Comment | null = null;

          // 查找并删除批注
          for (const [documentId, comments] of this.comments.entries()) {
            const index = comments.findIndex(c => c.id === annotationId);
            if (index !== -1) {
              deletedAnnotation = comments[index];
              comments.splice(index, 1);

              ws.send(
                JSON.stringify({
                  type: 'annotation_deleted',
                  data: { annotationId },
                })
              );

              // 广播给房间内其他用户
              this.sendToRoom(documentId, {
                type: 'annotation_deleted',
                data: { annotationId },
              });
              break;
            }
          }

          if (!deletedAnnotation) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: '批注不存在',
              })
            );
          }
        } catch (error) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : '删除批注失败',
            })
          );
        }
        break;
      }

      case 'load_annotations': {
        const reportId = String(payload.reportId || payload.documentId || '');
        try {
          const annotations = await this.getDocumentComments(reportId);
          ws.send(
            JSON.stringify({
              type: 'annotations_loaded',
              data: annotations,
            })
          );
        } catch (error) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : '加载批注失败',
            })
          );
        }
        break;
      }

      case 'add_reply': {
        const { parentId, reply } = payload as {
          parentId: string;
          reply: Omit<Comment, 'id' | 'createdAt' | 'updatedAt' | 'replies'>;
        };
        try {
          const replyDocumentId = String(reply.documentId || '');
          const replyComment = await this.replyToComment(parentId, {
            ...reply,
            documentId: replyDocumentId,
            userId: reply.userId,
            username: reply.username,
            content: reply.content,
            position: reply.position,
          });

          ws.send(
            JSON.stringify({
              type: 'reply_added',
              data: { parentId, reply: replyComment },
            })
          );

          // 广播给房间内其他用户
          this.sendToRoom(replyDocumentId, {
            type: 'reply_added',
            data: { parentId, reply: replyComment },
          });
        } catch (error) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : '添加回复失败',
            })
          );
        }
        break;
      }

      default:
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
  }

  /**
   * 处理WebSocket关闭
   */
  private handleWebSocketClose(connectionId: string): void {
    const participantId = this.connectionParticipants.get(connectionId);
    if (participantId) {
      this.connections.delete(participantId);
      this.connectionParticipants.delete(connectionId);
    }
    // 从所有房间中移除用户
    for (const [roomId, room] of this.rooms.entries()) {
      const resolvedParticipantId = participantId ?? connectionId;
      const participantIndex = room.participants.findIndex(p => p.id === resolvedParticipantId);
      if (participantIndex !== -1) {
        this.leaveRoom(roomId, resolvedParticipantId);
      }
    }
  }

  private findRoomByParticipant(participantId: string): string | null {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.participants.find(participant => participant.id === participantId)) {
        return roomId;
      }
    }
    return null;
  }

  private sendToRoom(roomId: string, payload: Record<string, unknown>): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }
    room.participants.forEach(participant => {
      const socket = this.connections.get(participant.id);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
      }
    });
  }

  private pickColor(seed: string): string {
    if (!seed) {
      return this.participantColors[0];
    }
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % this.participantColors.length;
    return this.participantColors[index];
  }

  /**
   * 应用文档变更
   */
  private applyChange(content: string, change: DocumentChange): string {
    switch (change.type) {
      case 'insert':
        return content.slice(0, change.position) + change.content + content.slice(change.position);

      case 'delete':
        return content.slice(0, change.position) + content.slice(change.position + change.length);

      case 'replace':
        return (
          content.slice(0, change.position) +
          change.content +
          content.slice(change.position + change.length)
        );

      default:
        return content;
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成分享令牌
   */
  private generateToken(): string {
    return Math.random().toString(36).substr(2, 32);
  }
}

export default CollaborationService;
