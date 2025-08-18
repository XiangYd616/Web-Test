/**
 * 增强版应用上下文
 * 提供全局状态管理、配置管理、通知系统和应用级数据
 */

import React, { createContext, ReactNode, useContext, useEffect, useState, useCallback, useReducer } from 'react

// 通知类型
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info'
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary'
  }>;
  timestamp: Date;
}

// 应用配置
export interface AppConfig {
  apiBaseUrl: string;
  wsBaseUrl: string;
  version: string;
  environment: 'development' | 'staging' | 'production'
  features: {
    enableAnalytics: boolean;
    enableNotifications: boolean;
    enableOfflineMode: boolean;
    enableExperimentalFeatures: boolean;
  };
  limits: {
    maxFileSize: number;
    maxConcurrentTests: number;
    requestTimeout: number;
  };
  ui: {
    showBetaFeatures: boolean;
    enableAnimations: boolean;
    compactMode: boolean;
  };
}

// 应用状态
export interface AppState {
  isOnline: boolean;
  isLoading: boolean;
  lastActivity: Date;
  activeConnections: number;
  systemHealth: 'healthy' | 'warning' | 'error'
  maintenanceMode: boolean;
}

// 应用统计
export interface AppStats {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  averageResponseTime: number;
  activeUsers: number;
  systemUptime: number;
}

// 应用上下文类型
interface EnhancedAppContextType {
  // 配置
  config: AppConfig;
  updateConfig: (config: Partial<AppConfig>) => void;
  
  // 状态
  state: AppState;
  updateState: (state: Partial<AppState>) => void;
  
  // 统计
  stats: AppStats;
  refreshStats: () => Promise<void>;
  
  // 通知系统
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // 全局加载状态
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
  
  // 错误处理
  globalError: string | null;
  setGlobalError: (error: string | null) => void;
  
  // 应用生命周期
  initialize: () => Promise<void>;
  cleanup: () => void;
  
  // 功能检查
  isFeatureEnabled: (feature: keyof AppConfig['features']) => boolean;
  
  // 网络状态
  checkConnectivity: () => Promise<boolean>;
}

// 默认配置
const defaultConfig: AppConfig = {
  apiBaseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  wsBaseUrl: process.env.REACT_APP_WS_URL || 'ws://localhost:3001',
  version: process.env.REACT_APP_VERSION || '1.0.0',
  environment: (process.env.NODE_ENV as any) || 'development',
  features: {
    enableAnalytics: true,
    enableNotifications: true,
    enableOfflineMode: false,
    enableExperimentalFeatures: false
  },
  limits: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxConcurrentTests: 5,
    requestTimeout: 30000 // 30秒
  },
  ui: {
    showBetaFeatures: false,
    enableAnimations: true,
    compactMode: false
  }
};

// 默认状态
const defaultState: AppState = {
  isOnline: navigator.onLine,
  isLoading: false,
  lastActivity: new Date(),
  activeConnections: 0,
  systemHealth: 'healthy',
  maintenanceMode: false
};

// 默认统计
const defaultStats: AppStats = {
  totalTests: 0,
  successfulTests: 0,
  failedTests: 0,
  averageResponseTime: 0,
  activeUsers: 0,
  systemUptime: 0
};

// 通知reducer
type NotificationAction = 
  | { type: 'ADD'; payload: Notification }
  | { type: 'REMOVE'; payload: string }
  | { type: 'CLEAR' };

const notificationReducer = (state: Notification[], action: NotificationAction): Notification[] => {
  switch (action.type) {
    case 'ADD':
      return [...state, action.payload];
    case 'REMOVE':
      return state.filter(n => n.id !== action.payload);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
};

const EnhancedAppContext = createContext<EnhancedAppContextType | undefined>(undefined);

export const useEnhancedApp = () => {
  const context = useContext(EnhancedAppContext);
  if (context === undefined) {
    throw new Error('useEnhancedApp must be used within an EnhancedAppProvider');
  }
  return context;
};

interface EnhancedAppProviderProps {
  children: ReactNode;
  initialConfig?: Partial<AppConfig>;
}

export const EnhancedAppProvider: React.FC<EnhancedAppProviderProps> = ({ 
  children, 
  initialConfig = {} 
}) => {
  // 状态管理
  const [config, setConfig] = useState<AppConfig>(() => ({
    ...defaultConfig,
    ...initialConfig
  }));
  
  const [state, setState] = useState<AppState>(defaultState);
  const [stats, setStats] = useState<AppStats>(defaultStats);
  const [notifications, dispatchNotifications] = useReducer(notificationReducer, []);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // 更新配置
  const updateConfig = useCallback((newConfig: Partial<AppConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      localStorage.setItem('appConfig', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // 更新状态
  const updateState = useCallback((newState: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...newState }));
  }, []);

  // 刷新统计数据
  const refreshStats = useCallback(async () => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/stats`);
      if (response.ok) {
        const newStats = await response.json();
        setStats(newStats);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  }, [config.apiBaseUrl]);

  // 通知管理
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date()
    };
    
    dispatchNotifications({ type: 'ADD', payload: fullNotification });
    
    // 自动移除通知
    if (notification.duration !== 0) {
      const duration = notification.duration || 5000;
      setTimeout(() => {
        dispatchNotifications({ type: 'REMOVE', payload: id });
      }, duration);
    }
    
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    dispatchNotifications({ type: 'REMOVE', payload: id });
  }, []);

  const clearNotifications = useCallback(() => {
    dispatchNotifications({ type: 'CLEAR' });
  }, []);

  // 功能检查
  const isFeatureEnabled = useCallback((feature: keyof AppConfig['features']) => {
    return config.features[feature];
  }, [config.features]);

  // 网络连接检查
  const checkConnectivity = useCallback(async () => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/health`, {
        method: 'HEAD',
        timeout: 5000
      } as any);
      return response.ok;
    } catch {
      return false;
    }
  }, [config.apiBaseUrl]);

  // 应用初始化
  const initialize = useCallback(async () => {
    try {
      setGlobalLoading(true);
      
      // 加载保存的配置
      const savedConfig = localStorage.getItem('appConfig');
      if (savedConfig) {
        try {
          const parsedConfig = JSON.parse(savedConfig);
          setConfig(prev => ({ ...prev, ...parsedConfig }));
        } catch (error) {
          console.warn('加载保存的配置失败:', error);
        }
      }
      
      // 检查网络连接
      const isOnline = await checkConnectivity();
      updateState({ isOnline });
      
      // 刷新统计数据
      if (isOnline) {
        await refreshStats();
      }
      
      // 检查系统健康状态
      if (isOnline) {
        try {
          const response = await fetch(`${config.apiBaseUrl}/api/health`);
          const health = await response.json();
          updateState({ systemHealth: health.status || 'healthy' });
        } catch {
          updateState({ systemHealth: 'warning' });
        }
      }
      
    } catch (error) {
      console.error('应用初始化失败:', error);
      setGlobalError('应用初始化失败');
    } finally {
      setGlobalLoading(false);
    }
  }, [config.apiBaseUrl, checkConnectivity, refreshStats, updateState]);

  // 应用清理
  const cleanup = useCallback(() => {
    // 清理定时器、事件监听器等
    clearNotifications();
    setGlobalLoading(false);
    setGlobalError(null);
  }, [clearNotifications]);

  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => updateState({ isOnline: true });
    const handleOffline = () => updateState({ isOnline: false });
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateState]);

  // 监听用户活动
  useEffect(() => {
    const updateActivity = () => {
      updateState({ lastActivity: new Date() });
    };
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [updateState]);

  // 定期刷新统计数据
  useEffect(() => {
    if (!state.isOnline) return;
    
    const interval = setInterval(() => {
      refreshStats();
    }, 30000); // 每30秒刷新一次
    
    return () => clearInterval(interval);
  }, [state.isOnline, refreshStats]);

  // 应用初始化
  useEffect(() => {
    initialize();
    
    return () => {
      cleanup();
    };
  }, [initialize, cleanup]);

  const contextValue: EnhancedAppContextType = {
    config,
    updateConfig,
    state,
    updateState,
    stats,
    refreshStats,
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    globalLoading,
    setGlobalLoading,
    globalError,
    setGlobalError,
    initialize,
    cleanup,
    isFeatureEnabled,
    checkConnectivity
  };

  return (
    <EnhancedAppContext.Provider value={contextValue}>
      {children}
    </EnhancedAppContext.Provider>
  );
};

export default EnhancedAppProvider;
