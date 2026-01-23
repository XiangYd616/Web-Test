/**
 * OnlineEditorsList - 在线编辑者列表组件
 * 用于测试配置表单旁显示当前正在编辑的用户
 */

import Logger from '@/utils/logger';
import { createWebSocketManager } from '@/utils/websocketManager';
import { Users } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface OnlineEditor {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  lastSeen: number;
  status: 'active' | 'idle' | 'away';
}

export interface OnlineEditorsListProps {
  /** 资源唯一标识（测试配置ID、报告ID等） */
  resourceId: string;
  /** WebSocket 服务路径 */
  wsPath?: string;
  /** 当前用户信息 */
  currentUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
  /** 自定义样式类名 */
  className?: string;
  /** 是否显示状态指示器 */
  showStatusIndicator?: boolean;
  /** 最大显示用户数 */
  maxVisibleUsers?: number;
}

/**
 * 在线编辑者列表组件
 * 显示当前正在编辑同一资源的用户列表
 */
export const OnlineEditorsList: React.FC<OnlineEditorsListProps> = ({
  resourceId,
  wsPath = '/ws/collaboration',
  currentUser,
  className = '',
  showStatusIndicator = true,
  maxVisibleUsers = 5,
}) => {
  const [editors, setEditors] = useState<OnlineEditor[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const managerRef = useRef<ReturnType<typeof createWebSocketManager> | null>(null);

  // 更新用户状态
  const updateUserStatus = useCallback((userId: string, status: OnlineEditor['status']) => {
    setEditors(prev =>
      prev.map(editor =>
        editor.id === userId ? { ...editor, status, lastSeen: Date.now() } : editor
      )
    );
  }, []);

  // 处理 WebSocket 消息
  const handleWebSocketMessage = useCallback(
    (event: unknown) => {
      const message = event as { type?: string; data?: unknown } | undefined;
      if (!message?.type) return;

      switch (message.type) {
        case 'user_joined': {
          const joinData = message.data as { user?: OnlineEditor } | undefined;
          if (joinData?.user && joinData.user.id !== currentUser?.id) {
            setEditors(prev => {
              const existing = prev.find(e => e.id === joinData.user!.id);
              if (existing) {
                return prev.map(e =>
                  e.id === joinData.user!.id ? { ...joinData.user!, lastSeen: Date.now() } : e
                );
              }
              return [...prev, { ...joinData.user!, lastSeen: Date.now() }];
            });
          }
          break;
        }

        case 'user_left': {
          const leaveData = message.data as { userId?: string } | undefined;
          if (leaveData?.userId) {
            setEditors(prev => prev.filter(e => e.id !== leaveData!.userId));
          }
          break;
        }

        case 'user_active': {
          const activeData = message.data as { userId?: string } | undefined;
          if (activeData?.userId) {
            updateUserStatus(activeData.userId, 'active');
          }
          break;
        }

        case 'user_idle': {
          const idleData = message.data as { userId?: string } | undefined;
          if (idleData?.userId) {
            updateUserStatus(idleData.userId, 'idle');
          }
          break;
        }

        case 'editors_list': {
          const listData = message.data as { editors?: OnlineEditor[] } | undefined;
          if (listData?.editors) {
            setEditors(
              listData.editors
                .filter(e => e.id !== currentUser?.id)
                .map(e => ({ ...e, lastSeen: Date.now() }))
            );
          }
          break;
        }

        default:
          break;
      }
    },
    [currentUser?.id, updateUserStatus]
  );

  // 处理连接状态变化
  const handleConnectionChange = useCallback(
    (connected: boolean) => {
      setIsConnected(connected);
      if (connected && currentUser) {
        // 连接成功后加入房间
        const manager = managerRef.current;
        if (manager) {
          manager
            .send('join_room', {
              roomId: resourceId,
              participant: {
                id: currentUser.id,
                name: currentUser.name,
                avatar: currentUser.avatar,
              },
            })
            .catch((error: unknown) => Logger.error('加入房间失败:', error));
        }
      }
    },
    [currentUser, resourceId]
  );

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

  // 定期清理离线用户
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30秒超时

      setEditors(prev =>
        prev.filter(editor => {
          const timeSinceLastSeen = now - editor.lastSeen;
          if (timeSinceLastSeen > timeout) {
            return false;
          }
          // 自动更新为离开状态
          if (timeSinceLastSeen > 15000 && editor.status === 'active') {
            editor.status = 'idle';
          }
          return true;
        })
      );
    }, 10000); // 每10秒检查一次

    return () => clearInterval(interval);
  }, []);

  // 计算显示的用户
  const visibleEditors = editors.slice(0, maxVisibleUsers);
  const hiddenCount = Math.max(0, editors.length - maxVisibleUsers);

  // 获取状态颜色
  const getStatusColor = (status: OnlineEditor['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'idle':
        return 'bg-yellow-500';
      case 'away':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  // 渲染用户头像
  const renderUserAvatar = (editor: OnlineEditor) => {
    if (editor.avatar) {
      return (
        <img
          src={editor.avatar}
          alt={editor.name}
          className="w-6 h-6 rounded-full border-2 border-white"
        />
      );
    }

    // 显示首字母
    const initial = editor.name.charAt(0).toUpperCase();
    return (
      <div
        className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white"
        style={{ backgroundColor: editor.color }}
      >
        {initial}
      </div>
    );
  };

  if (editors.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showStatusIndicator && (
        <div
          className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}
          title={isConnected ? '已连接' : '连接中...'}
        />
      )}

      <div className="flex items-center gap-1">
        <Users className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600">{editors.length}</span>
      </div>

      <div className="flex -space-x-2">
        {visibleEditors.map(editor => (
          <div
            key={editor.id}
            className="relative group"
            title={`${editor.name} (${editor.status === 'active' ? '正在编辑' : editor.status === 'idle' ? '空闲' : '离开'})`}
          >
            {renderUserAvatar(editor)}
            {showStatusIndicator && (
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${getStatusColor(editor.status)} border border-white`}
              />
            )}

            {/* 悬浮提示 */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              <div>{editor.name}</div>
              <div className="text-gray-300">
                {editor.status === 'active'
                  ? '正在编辑'
                  : editor.status === 'idle'
                    ? '空闲'
                    : '离开'}
              </div>
            </div>
          </div>
        ))}

        {hiddenCount > 0 && (
          <div
            className="w-6 h-6 rounded-full border-2 border-white bg-gray-500 flex items-center justify-center text-xs font-medium text-white"
            title={`还有 ${hiddenCount} 位用户正在编辑`}
          >
            +{hiddenCount}
          </div>
        )}
      </div>
    </div>
  );
};

export default OnlineEditorsList;
