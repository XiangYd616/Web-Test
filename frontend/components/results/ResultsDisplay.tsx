/**
 * 实时结果展示组件
 * 提供实时更新的测试结果展示
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Wifi, WifiOff, Bell, BellOff,
  TrendingUp, Activity, Clock, AlertCircle
} from 'lucide-react';
import TestResults from './EnhancedTestResults';
import { createApiUrl } from '../../config/api';

interface TestResult {
  id: string;
  type: string;
  url: string;
  score: number;
  status: 'success' | 'warning' | 'error';
  timestamp: string;
  duration: number;
  metrics: Record<string, any>;
  details: any;
}

interface RealTimeResultsDisplayProps {
  initialResults?: TestResult[];
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableNotifications?: boolean;
  onNewResult?: (result: TestResult) => void;
}

const RealTimeResultsDisplay: React.FC<RealTimeResultsDisplayProps> = ({
  initialResults = [],
  autoRefresh = true,
  refreshInterval = 5000,
  enableNotifications = true,
  onNewResult
}) => {
  const [results, setResults] = useState<TestResult[]>(initialResults);
  const [isConnected, setIsConnected] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(autoRefresh);
  const [notifications, setNotifications] = useState(enableNotifications);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  const wsRef = useRef<WebSocket | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationPermission = useRef<NotificationPermission>('default');

  // 请求通知权限
  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        notificationPermission.current = permission;
      });
    }
  }, []);

  // 建立WebSocket连接
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/test-results`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('✅ WebSocket连接已建立');
        setIsConnected(true);
        setConnectionStatus('connected');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('解析WebSocket消息失败:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('❌ WebSocket连接已断开');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // 自动重连
        if (isAutoRefresh) {
          setTimeout(connectWebSocket, 3000);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket错误:', error);
        setConnectionStatus('disconnected');
      };
      
    } catch (error) {
      console.error('建立WebSocket连接失败:', error);
      setConnectionStatus('disconnected');
    }
  }, [isAutoRefresh]);

  // 处理WebSocket消息
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'new_result':
        const newResult = data.result as TestResult;
        setResults(prev => [newResult, ...prev]);
        setLastUpdate(new Date());
        
        // 发送通知
        if (notifications && notificationPermission.current === 'granted') {
          showNotification(newResult);
        }
        
        // 回调
        if (onNewResult) {
          onNewResult(newResult);
        }
        break;
        
      case 'result_updated':
        const updatedResult = data.result as TestResult;
        setResults(prev => prev.map(r => r.id === updatedResult.id ? updatedResult : r));
        setLastUpdate(new Date());
        break;
        
      case 'bulk_update':
        const bulkResults = data.results as TestResult[];
        setResults(bulkResults);
        setLastUpdate(new Date());
        break;
        
      default:
        console.log('未知的WebSocket消息类型:', data.type);
    }
  }, [notifications, onNewResult]);

  // 显示通知
  const showNotification = useCallback((result: TestResult) => {
    if (!('Notification' in window)) return;
    
    const title = `新的${result.type}测试结果`;
    const body = `${result.url} - 分数: ${result.score}`;
    const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: result.id
    });
  }, []);

  // 获取最新结果
  const fetchLatestResults = useCallback(async () => {
    setLoading(true);
    
    try {
      const response = await fetch(createApiUrl('/api/test-results/latest'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setResults(data.data);
          setLastUpdate(new Date());
        }
      }
    } catch (error) {
      console.error('获取最新结果失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 设置定时刷新
  useEffect(() => {
    if (isAutoRefresh && !isConnected) {
      refreshIntervalRef.current = setInterval(fetchLatestResults, refreshInterval);
    } else if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAutoRefresh, isConnected, fetchLatestResults, refreshInterval]);

  // 初始化连接
  useEffect(() => {
    if (isAutoRefresh) {
      connectWebSocket();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket, isAutoRefresh]);

  // 切换自动刷新
  const toggleAutoRefresh = useCallback(() => {
    setIsAutoRefresh(prev => {
      const newValue = !prev;
      if (newValue) {
        connectWebSocket();
      } else if (wsRef.current) {
        wsRef.current.close();
      }
      return newValue;
    });
  }, [connectWebSocket]);

  // 手动刷新
  const handleManualRefresh = useCallback(() => {
    fetchLatestResults();
  }, [fetchLatestResults]);

  // 切换通知
  const toggleNotifications = useCallback(() => {
    setNotifications(prev => !prev);
  }, []);

  // 重置连接
  const resetConnection = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setTimeout(connectWebSocket, 1000);
  }, [connectWebSocket]);

  return (
    <div className="space-y-4">
      {/* 实时控制栏 */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 连接状态 */}
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : connectionStatus === 'connecting' ? (
                <Activity className="w-5 h-5 text-yellow-500 animate-pulse" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              <span className="text-sm text-gray-300">
                {connectionStatus === 'connected' ? '已连接' : 
                 connectionStatus === 'connecting' ? '连接中...' : '未连接'}
              </span>
            </div>

            {/* 最后更新时间 */}
            {lastUpdate && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                最后更新: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* 通知开关 */}
            <button
              type="button"
              onClick={toggleNotifications}
              className={`p-2 rounded-lg ${notifications ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
              title={notifications ? '关闭通知' : '开启通知'}
            >
              {notifications ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>

            {/* 自动刷新开关 */}
            <button
              type="button"
              onClick={toggleAutoRefresh}
              className={`p-2 rounded-lg ${isAutoRefresh ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
              title={isAutoRefresh ? '停止自动刷新' : '开启自动刷新'}
            >
              {isAutoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            {/* 手动刷新 */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={loading}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              title="手动刷新"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* 重置连接 */}
            {connectionStatus === 'disconnected' && (
              <button
                type="button"
                onClick={resetConnection}
                className="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                title="重新连接"
              >
                <AlertCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 连接信息 */}
        {connectionStatus !== 'connected' && (
          <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                {connectionStatus === 'connecting' 
                  ? '正在建立实时连接...' 
                  : '实时连接已断开，将使用定时刷新模式'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 结果展示 */}
      <EnhancedTestResults
        results={results}
        loading={loading}
        onResultClick={(result) => {
          console.log('查看结果详情:', result);
        }}
        onExport={(format) => {
          console.log('导出格式:', format);
        }}
        onShare={(result) => {
          console.log('分享结果:', result);
        }}
      />
    </div>
  );
};

export default RealTimeResultsDisplay;
