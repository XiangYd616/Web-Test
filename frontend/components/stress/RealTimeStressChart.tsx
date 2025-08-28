import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, TrendingUp, Users, Zap, AlertTriangle } from 'lucide-react';

interface RealTimeDataPoint {
  timestamp: number;
  responseTime: number;
  throughput: number;
  activeUsers: number;
  errorRate: number;
  successRate: number;
  phase?: string;
}

interface RealTimeStressChartProps {
  testId: string | null;
  isRunning: boolean;
  height?: number;
  maxDataPoints?: number;
  updateInterval?: number;
  onDataUpdate?: (data: RealTimeDataPoint) => void;
}

const RealTimeStressChart: React.FC<RealTimeStressChartProps> = ({
  testId,
  isRunning,
  height = 400,
  maxDataPoints = 100,
  updateInterval = 1000,
  onDataUpdate
}) => {
  const [data, setData] = useState<RealTimeDataPoint[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [currentMetrics, setCurrentMetrics] = useState<RealTimeDataPoint | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // WebSocket连接管理
  const connectWebSocket = useCallback(() => {
    if (!testId || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionStatus('connecting');
      
      // 构建WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host.replace(':5174', ':3001'); // 开发环境端口映射
      const wsUrl = `${protocol}//${host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔌 WebSocket连接已建立');
        setConnectionStatus('connected');
        
        // 订阅测试数据
        ws.send(JSON.stringify({
          type: 'subscribe',
          testId: testId,
          dataType: 'stress_test_progress'
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'test_progress' && message.testId === testId) {
            const dataPoint: RealTimeDataPoint = {
              timestamp: Date.now() - startTimeRef.current,
              responseTime: message.data.responseTime || 0,
              throughput: message.data.throughput || 0,
              activeUsers: message.data.activeUsers || 0,
              errorRate: message.data.errorRate || 0,
              successRate: 100 - (message.data.errorRate || 0),
              phase: message.data.phase
            };

            setCurrentMetrics(dataPoint);
            setData(prev => {
              const newData = [...prev, dataPoint];
              // 限制数据点数量
              if (newData.length > maxDataPoints) {
                return newData.slice(-maxDataPoints);
              }
              return newData;
            });

            onDataUpdate?.(dataPoint);
          }
        } catch (error) {
          console.error('WebSocket消息解析错误:', error);
        }
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket连接已关闭');
        setConnectionStatus('disconnected');
        
        // 如果测试还在运行，尝试重连
        if (isRunning && testId) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket连接错误:', error);
        setConnectionStatus('disconnected');
      };

    } catch (error) {
      console.error('WebSocket连接失败:', error);
      setConnectionStatus('disconnected');
    }
  }, [testId, isRunning, maxDataPoints, onDataUpdate]);

  // 断开WebSocket连接
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  // 管理WebSocket连接
  useEffect(() => {
    if (isRunning && testId) {
      startTimeRef.current = Date.now();
      setData([]); // 清空之前的数据
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isRunning, testId, connectWebSocket, disconnectWebSocket]);

  // 格式化时间标签
  const formatTimeLabel = (timestamp: number) => {
    const seconds = Math.floor(timestamp / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm mb-2">{`时间: ${formatTimeLabel(label)}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}${entry.dataKey === 'responseTime' ? 'ms' : 
                entry.dataKey === 'throughput' ? ' req/s' : 
                entry.dataKey.includes('Rate') ? '%' : ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
      {/* 头部信息 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">实时性能监控</h3>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
            connectionStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {connectionStatus === 'connected' ? '已连接' :
             connectionStatus === 'connecting' ? '连接中' : '未连接'}
          </div>
        </div>

        {/* 当前指标 */}
        {currentMetrics && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-gray-400">响应时间:</span>
              <span className="text-white font-medium">{currentMetrics.responseTime.toFixed(0)}ms</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-green-400" />
              <span className="text-gray-400">吞吐量:</span>
              <span className="text-white font-medium">{currentMetrics.throughput.toFixed(1)} req/s</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-gray-400">活跃用户:</span>
              <span className="text-white font-medium">{currentMetrics.activeUsers}</span>
            </div>
            {currentMetrics.errorRate > 0 && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-gray-400">错误率:</span>
                <span className="text-red-400 font-medium">{currentMetrics.errorRate.toFixed(1)}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 图表区域 */}
      <div style={{ height: `${height}px` }}>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg mb-2">等待实时数据</p>
              <p className="text-sm">
                {!isRunning ? '开始测试后将显示实时图表' : 
                 connectionStatus === 'connecting' ? '正在连接WebSocket...' : 
                 '等待数据传输...'}
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#9CA3AF" 
                fontSize={12}
                tickFormatter={formatTimeLabel}
              />
              <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="responseTime"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                name="响应时间 (ms)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="throughput"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                name="吞吐量 (req/s)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="activeUsers"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={false}
                name="活跃用户"
              />
              {data.some(d => d.errorRate > 0) && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="errorRate"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={false}
                  name="错误率 (%)"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default RealTimeStressChart;
