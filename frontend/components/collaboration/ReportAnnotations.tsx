/**
 * ReportAnnotations - 报告批注/评论组件
 * 用于测试报告详情页的协作批注功能
 */

import Logger from '@/utils/logger';
import { createWebSocketManager } from '@/utils/websocketManager';
import { Edit2, MessageCircle, Reply, Save, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface Annotation {
  id: string;
  reportId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  position?: {
    x: number;
    y: number;
    section?: string;
  };
  createdAt: string;
  updatedAt: string;
  replies?: Annotation[];
  isEditing?: boolean;
}

export interface ReportAnnotationsProps {
  /** 报告唯一标识 */
  reportId: string;
  /** WebSocket 服务路径 */
  wsPath?: string;
  /** 当前用户信息 */
  currentUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
  /** 是否显示位置信息 */
  showPosition?: boolean;
  /** 自定义样式类名 */
  className?: string;
  /** 批注添加回调 */
  onAnnotationAdd?: (annotation: Annotation) => void;
  /** 批注更新回调 */
  onAnnotationUpdate?: (annotation: Annotation) => void;
  /** 批注删除回调 */
  onAnnotationDelete?: (annotationId: string) => void;
}

/**
 * 报告批注组件
 * 提供批注的增删改查和实时同步功能
 */
export const ReportAnnotations: React.FC<ReportAnnotationsProps> = ({
  reportId,
  wsPath = '/ws/annotations',
  currentUser,
  showPosition = true,
  className = '',
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
}) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [newAnnotation, setNewAnnotation] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const managerRef = useRef<ReturnType<typeof createWebSocketManager> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 生成唯一ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // 处理 WebSocket 消息
  const handleWebSocketMessage = useCallback(
    (event: unknown) => {
      const message = event as { type?: string; data?: unknown } | undefined;
      if (!message?.type) return;

      switch (message.type) {
        case 'annotation_added': {
          const annotation = message.data as Annotation;
          if (annotation.reportId === reportId) {
            setAnnotations(prev => [...prev, annotation]);
            onAnnotationAdd?.(annotation);
          }
          break;
        }

        case 'annotation_updated': {
          const updatedAnnotation = message.data as Annotation;
          setAnnotations(prev =>
            prev.map(ann => (ann.id === updatedAnnotation.id ? updatedAnnotation : ann))
          );
          onAnnotationUpdate?.(updatedAnnotation);
          break;
        }

        case 'annotation_deleted': {
          const { annotationId } = message.data as { annotationId: string };
          setAnnotations(prev => prev.filter(ann => ann.id !== annotationId));
          onAnnotationDelete?.(annotationId);
          break;
        }

        case 'annotations_loaded': {
          const loadedAnnotations = message.data as Annotation[];
          setAnnotations(loadedAnnotations.filter(ann => ann.reportId === reportId));
          break;
        }

        default:
          break;
      }
    },
    [reportId, onAnnotationAdd, onAnnotationUpdate, onAnnotationDelete]
  );

  // 处理连接状态变化
  const handleConnectionChange = useCallback(
    (connected: boolean) => {
      setIsConnected(connected);
      if (connected && currentUser) {
        // 连接成功后加载批注
        const manager = managerRef.current;
        if (manager && manager.isConnected()) {
          manager
            .send('load_annotations', { reportId })
            .catch((error: unknown) => Logger.error('加载批注失败:', error));
        }
      }
    },
    [currentUser, reportId]
  );

  // 加载批注
  const loadAnnotations = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager || !manager.isConnected()) return;

    try {
      await manager.send('load_annotations', { reportId });
    } catch (error) {
      Logger.error('加载批注失败:', error);
    }
  }, [reportId]);

  // 添加批注
  const addAnnotation = useCallback(async () => {
    if (!newAnnotation.trim() || !currentUser) return;

    const manager = managerRef.current;
    if (!manager || !manager.isConnected()) {
      Logger.error('网络连接不可用');
      return;
    }

    setIsLoading(true);
    try {
      const annotation: Annotation = {
        id: generateId(),
        reportId,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        content: newAnnotation.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await manager.send('add_annotation', annotation);
      setNewAnnotation('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      Logger.error('添加批注失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [newAnnotation, currentUser, reportId]);

  // 更新批注
  const updateAnnotation = useCallback(
    async (annotationId: string) => {
      if (!editContent.trim()) return;

      const manager = managerRef.current;
      if (!manager || !manager.isConnected()) {
        Logger.error('网络连接不可用');
        return;
      }

      try {
        await manager.send('update_annotation', {
          annotationId,
          content: editContent.trim(),
          updatedAt: new Date().toISOString(),
        });
        setEditingId(null);
        setEditContent('');
      } catch (error) {
        Logger.error('更新批注失败:', error);
      }
    },
    [editContent]
  );

  // 删除批注
  const deleteAnnotation = useCallback(async (annotationId: string) => {
    const manager = managerRef.current;
    if (!manager || !manager.isConnected()) {
      Logger.error('网络连接不可用');
      return;
    }

    try {
      await manager.send('delete_annotation', { annotationId });
    } catch (error) {
      Logger.error('删除批注失败:', error);
    }
  }, []);

  // 添加回复
  const addReply = useCallback(
    async (parentId: string) => {
      if (!replyContent.trim() || !currentUser) return;

      const manager = managerRef.current;
      if (!manager || !manager.isConnected()) {
        Logger.error('网络连接不可用');
        return;
      }

      try {
        const reply: Annotation = {
          id: generateId(),
          reportId,
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          content: replyContent.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await manager.send('add_reply', {
          parentId,
          reply,
        });
        setReplyContent('');
        setReplyingTo(null);
      } catch (error) {
        Logger.error('添加回复失败:', error);
      }
    },
    [replyContent, currentUser, reportId]
  );

  // 自动调整文本框高度
  const adjustTextareaHeight = useCallback((element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
  }, []);

  // 初始化 WebSocket 连接
  useEffect(() => {
    if (!currentUser) return;

    const manager = createWebSocketManager({
      url: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${wsPath}`,
      reconnectAttempts: 5,
      reconnectIntervalRange: [3000, 8000],
      heartbeatInterval: 15000,
    });

    managerRef.current = manager;

    // 事件监听
    const handleConnected = () => handleConnectionChange(true);
    const handleDisconnected = () => handleConnectionChange(false);
    const handleReconnecting = () => setIsConnected(false);

    manager.on('connected', handleConnected);
    manager.on('disconnected', handleDisconnected);
    manager.on('reconnecting', handleReconnecting);
    manager.on('message', handleWebSocketMessage);

    // 自动连接
    manager.connect().catch((error: unknown) => Logger.error('WebSocket 连接失败:', error));

    return () => {
      manager.off('connected', handleConnected);
      manager.off('disconnected', handleDisconnected);
      manager.off('reconnecting', handleReconnecting);
      manager.off('message', handleWebSocketMessage);
      manager.destroy();
    };
  }, [currentUser, wsPath, handleConnectionChange, handleWebSocketMessage]);

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 渲染用户头像
  const renderUserAvatar = (user: { name: string; avatar?: string }) => {
    if (user.avatar) {
      return <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />;
    }

    const initial = user.name.charAt(0).toUpperCase();
    return (
      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
        {initial}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">批注与评论</h3>
            <span className="text-sm text-gray-500">({annotations.length})</span>
          </div>
          <div
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}
            title={isConnected ? '已连接' : '连接中...'}
          />
        </div>
      </div>

      {/* 添加批注 */}
      <div className="p-4 border-b border-gray-200">
        <div className="space-y-3">
          <textarea
            ref={textareaRef}
            value={newAnnotation}
            onChange={e => {
              setNewAnnotation(e.target.value);
              adjustTextareaHeight(e.target);
            }}
            placeholder="添加批注或评论..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={1}
            disabled={!isConnected || isLoading}
          />
          <div className="flex justify-end">
            <button
              onClick={addAnnotation}
              disabled={!newAnnotation.trim() || !isConnected || isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isLoading ? '发送中...' : '添加批注'}
            </button>
          </div>
        </div>
      </div>

      {/* 批注列表 */}
      <div className="max-h-96 overflow-y-auto">
        {annotations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>暂无批注</p>
            <p className="text-sm">成为第一个添加批注的人</p>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {annotations.map(annotation => (
              <div key={annotation.id} className="space-y-3">
                <div className="flex space-x-3">
                  {renderUserAvatar({ name: annotation.userName, avatar: annotation.userAvatar })}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{annotation.userName}</span>
                      <span className="text-sm text-gray-500">
                        {formatTime(annotation.createdAt)}
                      </span>
                      {showPosition && annotation.position && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                          {annotation.position.section || '位置'}
                        </span>
                      )}
                    </div>

                    {editingId === annotation.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => updateAnnotation(annotation.id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditContent('');
                            }}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-800 whitespace-pre-wrap">{annotation.content}</p>
                        {currentUser && currentUser.id === annotation.userId && (
                          <div className="flex space-x-2 mt-2">
                            <button
                              onClick={() => {
                                setEditingId(annotation.id);
                                setEditContent(annotation.content);
                              }}
                              className="text-gray-500 hover:text-blue-600 text-sm"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteAnnotation(annotation.id)}
                              className="text-gray-500 hover:text-red-600 text-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 回复 */}
                    {currentUser && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            setReplyingTo(replyingTo === annotation.id ? null : annotation.id)
                          }
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                        >
                          <Reply className="w-4 h-4" />
                          <span>回复</span>
                        </button>
                      </div>
                    )}

                    {replyingTo === annotation.id && (
                      <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                        <textarea
                          value={replyContent}
                          onChange={e => setReplyContent(e.target.value)}
                          placeholder="添加回复..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => addReply(annotation.id)}
                            disabled={!replyContent.trim()}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded text-sm"
                          >
                            回复
                          </button>
                          <button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent('');
                            }}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 显示回复 */}
                    {annotation.replies && annotation.replies.length > 0 && (
                      <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                        {annotation.replies.map(reply => (
                          <div key={reply.id} className="flex space-x-3">
                            {renderUserAvatar({ name: reply.userName, avatar: reply.userAvatar })}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900 text-sm">
                                  {reply.userName}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatTime(reply.createdAt)}
                                </span>
                              </div>
                              <div className="bg-gray-50 rounded p-2 mt-1">
                                <p className="text-gray-800 text-sm">{reply.content}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportAnnotations;
