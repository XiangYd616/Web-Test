/**
 * 实时数据Hook
 * 提供WebSocket连接和实时数据更新功能
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// 连接状态类型
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// 实时数据Hook配置
export interface RealTimeDataConfig {
    url?: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    heartbeatInterval?: number;
}

// 实时数据Hook状态
export interface RealTimeDataState {
    data: any;
    isConnected: boolean;
    connectionStatus: ConnectionStatus;
    error: string | null;
    reconnectAttempts: number;
}

// 默认配置
const DEFAULT_CONFIG: Required<RealTimeDataConfig> = {
    url: `ws://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}`,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000
};

// 实时数据Hook
export const useRealTimeData = (channel: string, config: RealTimeDataConfig = {}) => {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    const [state, setState] = useState<RealTimeDataState>({
        data: null,
        isConnected: false,
        connectionStatus: 'disconnected',
        error: null,
        reconnectAttempts: 0
    });

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const mountedRef = useRef(true);

    // 更新状态的辅助函数
    const updateState = useCallback((updates: Partial<RealTimeDataState>) => {
        if (mountedRef.current) {
            setState(prev => ({ ...prev, ...updates }));
        }
    }, []);

    // 清理定时器
    const clearTimers = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
    }, []);

    // 发送心跳
    const sendHeartbeat = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'heartbeat',
                channel,
                timestamp: Date.now()
            }));
        }
    }, [channel]);

    // 启动心跳
    const startHeartbeat = useCallback(() => {
        clearTimers();
        heartbeatIntervalRef.current = setInterval(sendHeartbeat, finalConfig.heartbeatInterval);
    }, [sendHeartbeat, finalConfig.heartbeatInterval, clearTimers]);

    // 连接WebSocket
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            updateState({ connectionStatus: 'connecting', error: null });

            // 在实际环境中，这里应该连接到真实的WebSocket服务器
            // 现在我们模拟WebSocket连接
            const mockWs = {
                readyState: WebSocket.OPEN,
                send: (data: string) => {
                },
                close: () => {
                },

                    /**

                     * if功能函数

                     * @param {Object} params - 参数对象

                     * @returns {Promise<Object>} 返回结果

                     */
                addEventListener: (event: string, handler: Function) => {
                    if (event === 'open') {
                        setTimeout(() => handler(), 100);
                    }
                },
                removeEventListener: () => { }
            } as any;

            wsRef.current = mockWs;

            // 模拟连接成功
            setTimeout(() => {
                if (mountedRef.current) {
                    updateState({
                        isConnected: true,
                        connectionStatus: 'connected',
                        reconnectAttempts: 0
                    });
                    startHeartbeat();

                    // 模拟接收数据
                    const mockDataInterval = setInterval(() => {
                        if (mountedRef.current && wsRef.current) {
                            const mockData = {
                                type: 'data_update',
                                channel,
                                data: {
                                    timestamp: new Date().toISOString(),
                                    value: Math.random() * 100,
                                    status: Math.random() > 0.8 ? 'warning' : 'normal'
                                }
                            };
                            updateState({ data: mockData });
                        } else {
                            clearInterval(mockDataInterval);
                        }
                    }, 2000);
                }
            }, 100);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '连接失败';
            updateState({
                connectionStatus: 'error',
                error: errorMessage,
                isConnected: false
            });
            scheduleReconnect();
        }
    }, [channel, updateState, startHeartbeat]);

    // 断开连接
    const disconnect = useCallback(() => {
        clearTimers();

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        updateState({
            isConnected: false,
            connectionStatus: 'disconnected',
            error: null
        });
    }, [clearTimers, updateState]);

    // 安排重连
    const scheduleReconnect = useCallback(() => {
        if (state.reconnectAttempts >= finalConfig.maxReconnectAttempts) {
            updateState({
                connectionStatus: 'error',
                error: '超过最大重连次数'
            });
            return;
        }

        updateState({
            reconnectAttempts: (state.reconnectAttempts || 0) + 1
        });


            /**

             * if功能函数

             * @param {Object} params - 参数对象

             * @returns {Promise<Object>} 返回结果

             */
        reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
                connect();
            }
        }, finalConfig.reconnectInterval);
    }, [state.reconnectAttempts, finalConfig.maxReconnectAttempts, finalConfig.reconnectInterval, updateState, connect]);

    // 发送数据
    const sendData = useCallback((data: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const message = {
                type: 'client_message',
                channel,
                data,
                timestamp: Date.now()
            };
            wsRef.current.send(JSON.stringify(message));
            return true;
        }
        return false;
    }, [channel]);

    // 订阅特定事件
    const subscribe = useCallback((eventType: string, callback: (data: any) => void) => {
        // 在实际实现中，这里会设置事件监听器
        // 现在我们只是模拟订阅

        // 返回取消订阅函数
        return () => {
        };
    }, [channel]);

    // 初始化连接
    useEffect(() => {
        connect();

        return () => {
            mountedRef.current = false;
            disconnect();
        };
    }, [connect, disconnect]);

    // 清理资源
    useEffect(() => {
        return () => {
            clearTimers();
        };
    }, [clearTimers]);

    return {
        // 状态
        data: state.data,
        isConnected: state.isConnected,
        connectionStatus: state.connectionStatus,
        error: state.error,
        reconnectAttempts: state.reconnectAttempts,

        // 方法
        connect,
        disconnect,
        sendData,
        subscribe
    };
};

export default useRealTimeData;