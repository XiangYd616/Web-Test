/**
 * Socket.IO 客户端服务
 * 用于接收后端实时推送的测试进度等事件
 *
 * 桌面端（Electron）不需要 WebSocket（没有后端服务器），
 * 返回一个禁用自动连接的 socket 实例避免 ws://file/ 无限重连。
 */

import { io, type Socket } from 'socket.io-client';
import { isDesktop } from '../utils/environment';

let socket: Socket | null = null;

const getToken = (): string | null =>
  window.localStorage.getItem('accessToken') ||
  window.localStorage.getItem('token') ||
  window.localStorage.getItem('authToken');

/**
 * 获取或创建 Socket.IO 连接（单例）
 */
export function getSocket(): Socket {
  if (socket) return socket;

  // 桌面端：创建一个不会自动连接的 socket（避免 ws://file/ 无限重连）
  if (isDesktop()) {
    socket = io('http://localhost:0', {
      autoConnect: false,
      reconnection: false,
    });
    return socket;
  }

  // VITE_WS_URL 由 .env 配置；未配置时走同源（Vite dev proxy）
  const baseUrl = import.meta.env.VITE_WS_URL || window.location.origin;
  const token = getToken();

  socket = io(baseUrl, {
    auth: { token: token || undefined },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[WS] 已连接:', socket?.id);
  });

  socket.on('disconnect', reason => {
    console.log('[WS] 已断开:', reason);
  });

  socket.on('connect_error', err => {
    console.warn('[WS] 连接失败:', err.message);
  });

  return socket;
}

/**
 * 等待 Socket.IO 连接就绪（已连接则立即返回，超时 5s 自动放行）
 */
export function waitForConnection(timeoutMs = 5000): Promise<Socket> {
  const s = getSocket();
  if (s.connected) return Promise.resolve(s);

  return new Promise<Socket>(resolve => {
    const timer = setTimeout(() => {
      s.off('connect', onConnect);
      resolve(s);
    }, timeoutMs);

    const onConnect = () => {
      clearTimeout(timer);
      resolve(s);
    };
    s.once('connect', onConnect);
  });
}

/**
 * 断开 Socket.IO 连接
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
