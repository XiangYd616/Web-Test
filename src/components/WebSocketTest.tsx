import React, { useState, useEffect, useRef } from 'react';

const WebSocketTest: React.FC = () => {
    const [connectionStatus, setConnectionStatus] = useState<string>('未连接');
    const [socketId, setSocketId] = useState<string>('');
    const [logs, setLogs] = useState<string[]>([]);
    const [testResult, setTestResult] = useState<string>('');
    const socketRef = useRef<any>(null);

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
        console.log(message);
    };

    const connectWebSocket = async () => {
        try {
            addLog('🔄 开始连接WebSocket...');
            
            const { io } = await import('socket.io-client');
            
            const socket = io('http://localhost:3001', {
                transports: ['websocket', 'polling'],
                timeout: 20000,
            });

            socketRef.current = socket;

            socket.on('connect', () => {
                addLog('✅ WebSocket连接成功');
                setConnectionStatus('已连接');
                setSocketId(socket.id);
                addLog(`🆔 Socket ID: ${socket.id}`);
                addLog(`🔗 连接URL: ${socket.io?.uri}`);
                addLog(`🚀 传输方式: ${socket.io?.engine?.transport?.name}`);
            });

            socket.on('connect_error', (error) => {
                addLog(`❌ 连接错误: ${error.message}`);
                setConnectionStatus('连接失败');
            });

            socket.on('disconnect', () => {
                addLog('🔌 连接断开');
                setConnectionStatus('已断开');
                setSocketId('');
            });

            // 测试ping/pong
            socket.on('test-pong', (data) => {
                addLog(`🏓 收到pong: ${JSON.stringify(data)}`);
                setTestResult('✅ Ping/Pong测试成功');
            });

        } catch (error) {
            addLog(`❌ 连接失败: ${error}`);
            setConnectionStatus('连接失败');
        }
    };

    const disconnectWebSocket = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            addLog('🔌 手动断开连接');
        }
    };

    const testPing = () => {
        if (socketRef.current && socketRef.current.connected) {
            const testData = {
                message: 'WebSocket连接测试',
                timestamp: Date.now()
            };
            addLog(`🏓 发送ping: ${JSON.stringify(testData)}`);
            socketRef.current.emit('test-ping', testData);
        } else {
            addLog('❌ WebSocket未连接，无法发送ping');
        }
    };

    const testJoinRoom = () => {
        if (socketRef.current && socketRef.current.connected) {
            const testId = 'test_' + Date.now();
            addLog(`🏠 测试加入房间: ${testId}`);
            socketRef.current.emit('join-stress-test', testId);
            
            // 监听房间加入确认
            socketRef.current.once('room-joined', (data: any) => {
                addLog(`✅ 房间加入成功: ${JSON.stringify(data)}`);
                setTestResult('✅ 房间加入测试成功');
            });
            
            setTimeout(() => {
                if (testResult !== '✅ 房间加入测试成功') {
                    setTestResult('⚠️ 房间加入测试超时');
                }
            }, 5000);
        } else {
            addLog('❌ WebSocket未连接，无法测试房间加入');
        }
    };

    const clearLogs = () => {
        setLogs([]);
        setTestResult('');
    };

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    return (
        <div className="p-6 bg-gray-900 text-white min-h-screen">
            <h1 className="text-2xl font-bold mb-6">WebSocket连接测试</h1>
            
            {/* 连接状态 */}
            <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">连接状态</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="text-gray-400">状态: </span>
                        <span className={`font-semibold ${
                            connectionStatus === '已连接' ? 'text-green-400' : 
                            connectionStatus === '连接失败' ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                            {connectionStatus}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-400">Socket ID: </span>
                        <span className="text-blue-400">{socketId || '无'}</span>
                    </div>
                </div>
            </div>

            {/* 控制按钮 */}
            <div className="mb-6 flex gap-4 flex-wrap">
                <button
                    onClick={connectWebSocket}
                    disabled={connectionStatus === '已连接'}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded"
                >
                    连接WebSocket
                </button>
                <button
                    onClick={disconnectWebSocket}
                    disabled={connectionStatus !== '已连接'}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded"
                >
                    断开连接
                </button>
                <button
                    onClick={testPing}
                    disabled={connectionStatus !== '已连接'}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded"
                >
                    测试Ping
                </button>
                <button
                    onClick={testJoinRoom}
                    disabled={connectionStatus !== '已连接'}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded"
                >
                    测试房间加入
                </button>
                <button
                    onClick={clearLogs}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
                >
                    清空日志
                </button>
            </div>

            {/* 测试结果 */}
            {testResult && (
                <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                    <h2 className="text-lg font-semibold mb-2">测试结果</h2>
                    <div className="text-lg">{testResult}</div>
                </div>
            )}

            {/* 日志显示 */}
            <div className="bg-gray-800 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-2">连接日志</h2>
                <div className="bg-black rounded p-4 h-96 overflow-y-auto font-mono text-sm">
                    {logs.length === 0 ? (
                        <div className="text-gray-500">暂无日志...</div>
                    ) : (
                        logs.map((log, index) => (
                            <div key={index} className="mb-1">
                                {log}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default WebSocketTest;
