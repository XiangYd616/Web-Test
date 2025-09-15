/**
 * 统一状态管理系统
 * 基于观察者模式，管理测试状态、用户会话、系统配置等
 */

export type StateEventType = 'test' | 'user' | 'system' | 'notification' | 'cache';

export interface StateEvent<T = any> {
  type: StateEventType;
  action: string;
  payload: T;
  timestamp: number;
  id?: string;
}

export interface TestState {
  activeTests: Map<string, TestExecution>;
  testHistory: TestResult[];
  scheduledTests: ScheduledTest[];
  engines: EngineStatus[];
  performance: PerformanceMetrics;
}

export interface TestExecution {
  id: string;
  type: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  message: string;
}

export interface TestResult {
  id: string;
  type: string;
  url: string;
  status: string;
  result: any;
  startTime: Date;
  endTime: Date;
  duration: number;
  overallScore?: number;
}

export interface ScheduledTest {
  id: string;
  testType: string;
  url: string;
  executeAt: Date;
  recurring: boolean;
  interval?: number;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'high' | 'normal' | 'low';
}

export interface EngineStatus {
  type: string;
  available: boolean;
  healthy: boolean;
  activeTests: number;
  avgResponseTime: number;
  successRate: number;
  lastActivity?: Date;
}

export interface PerformanceMetrics {
  activeTests: number;
  scheduledTests: number;
  cachedResults: number;
  systemHealth: {
    uptime: number;
    memory: any;
    cpu: any;
  };
}

export interface UserState {
  isAuthenticated: boolean;
  user: User | null;
  permissions: string[];
  preferences: UserPreferences;
  session: SessionInfo | null;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: Date;
  lastLogin?: Date;
  avatar?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: NotificationSettings;
  dashboard: DashboardSettings;
  testing: TestingSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  testComplete: boolean;
  testFailed: boolean;
  scheduled: boolean;
  system: boolean;
}

export interface DashboardSettings {
  defaultView: string;
  refreshInterval: number;
  maxResults: number;
  showTrends: boolean;
}

export interface TestingSettings {
  autoRefresh: boolean;
  defaultTimeout: number;
  retryAttempts: number;
  cacheEnabled: boolean;
}

export interface SessionInfo {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  expiresAt: Date;
}

export interface SystemState {
  config: SystemConfig;
  health: SystemHealth;
  notifications: SystemNotification[];
  errors: SystemError[];
  maintenance: MaintenanceInfo;
}

export interface SystemConfig {
  apiEndpoint: string;
  websocketEndpoint: string;
  maxConcurrentTests: number;
  defaultCacheTime: number;
  supportedEngines: string[];
  features: FeatureFlags;
}

export interface FeatureFlags {
  scheduling: boolean;
  realTimeUpdates: boolean;
  analytics: boolean;
  exportResults: boolean;
  batchTesting: boolean;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  version: string;
  environment: string;
  services: ServiceStatus[];
}

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  lastCheck: Date;
  error?: string;
}

export interface SystemNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  persistent: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: string;
  type: 'primary' | 'secondary' | 'danger';
}

export interface SystemError {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  stack?: string;
  context?: any;
  resolved: boolean;
}

export interface MaintenanceInfo {
  scheduled: boolean;
  startTime?: Date;
  endTime?: Date;
  message?: string;
  affectedServices: string[];
}

export interface AppState {
  test: TestState;
  user: UserState;
  system: SystemState;
  ui: UIState;
}

export interface UIState {
  loading: Map<string, boolean>;
  modals: Map<string, any>;
  toasts: Toast[];
  sidebarCollapsed: boolean;
  theme: string;
}

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
}

type StateListener<T = any> = (state: T, event: StateEvent) => void;
type StateSelector<T = any, R = any> = (state: T) => R;

class StateManager {
  private state: AppState;
  private listeners: Map<StateEventType | 'all', Set<StateListener>> = new Map();
  private persistenceKey = 'test-web-state';
  private persistenceFields = ['user.preferences', 'ui.theme', 'ui.sidebarCollapsed'];

  constructor() {
    this.state = this.getInitialState();
    this.loadPersistedState();
    
    // 设置定期持久化
    setInterval(() => this.persistState(), 30000); // 每30秒持久化一次
    
    // 页面卸载时保存状态
    window.addEventListener('beforeunload', () => this.persistState());
  }

  private getInitialState(): AppState {
    return {
      test: {
        activeTests: new Map(),
        testHistory: [],
        scheduledTests: [],
        engines: [],
        performance: {
          activeTests: 0,
          scheduledTests: 0,
          cachedResults: 0,
          systemHealth: {
            uptime: 0,
            memory: {},
            cpu: {}
          }
        }
      },
      user: {
        isAuthenticated: false,
        user: null,
        permissions: [],
        preferences: {
          theme: 'auto',
          language: 'zh-CN',
          notifications: {
            email: true,
            push: true,
            testComplete: true,
            testFailed: true,
            scheduled: true,
            system: false
          },
          dashboard: {
            defaultView: 'overview',
            refreshInterval: 30000,
            maxResults: 50,
            showTrends: true
          },
          testing: {
            autoRefresh: true,
            defaultTimeout: 30000,
            retryAttempts: 3,
            cacheEnabled: true
          }
        },
        session: null
      },
      system: {
        config: {
          apiEndpoint: '/api',
          websocketEndpoint: '/ws',
          maxConcurrentTests: 5,
          defaultCacheTime: 300000,
          supportedEngines: ['performance', 'seo', 'security', 'compatibility', 'api', 'stress', 'ux', 'infrastructure'],
          features: {
            scheduling: true,
            realTimeUpdates: true,
            analytics: true,
            exportResults: true,
            batchTesting: true
          }
        },
        health: {
          status: 'healthy',
          uptime: 0,
          version: '1.0.0',
          environment: 'development',
          services: []
        },
        notifications: [],
        errors: [],
        maintenance: {
          scheduled: false,
          affectedServices: []
        }
      },
      ui: {
        loading: new Map(),
        modals: new Map(),
        toasts: [],
        sidebarCollapsed: false,
        theme: 'auto'
      }
    };
  }

  /**
   * 订阅状态变化
   */
  subscribe<T = AppState>(
    type: StateEventType | 'all',
    listener: StateListener<T>
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    // 返回取消订阅函数
    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  /**
   * 获取当前状态
   */
  getState(): AppState {
    return this.state;
  }

  /**
   * 使用选择器获取特定状态
   */
  select<R>(selector: StateSelector<AppState, R>): R {
    return selector(this.state);
  }

  /**
   * 派发状态事件
   */
  dispatch<T = any>(event: Omit<StateEvent<T>, 'timestamp' | 'id'>): void {
    const fullEvent: StateEvent<T> = {
      ...event,
      timestamp: Date.now(),
      id: this.generateId()
    };

    // 更新状态
    this.updateState(fullEvent);

    // 通知监听者
    this.notifyListeners(fullEvent);

    // 处理持久化
    if (this.shouldPersist(fullEvent)) {
      this.persistState();
    }
  }

  private updateState<T>(event: StateEvent<T>): void {
    const { type, action, payload } = event;

    switch (type) {
      case 'test':
        this.updateTestState(action, payload);
        break;
      case 'user':
        this.updateUserState(action, payload);
        break;
      case 'system':
        this.updateSystemState(action, payload);
        break;
      case 'notification':
        this.updateNotificationState(action, payload);
        break;
      case 'cache':
        // 缓存相关状态更新
        break;
    }
  }

  private updateTestState(action: string, payload: any): void {
    const testState = this.state.test;

    switch (action) {
      case 'START_TEST':
        testState.activeTests.set(payload.id, {
          ...payload,
          status: 'running',
          progress: 0,
          startTime: new Date(),
          message: '测试启动中...'
        });
        break;

      case 'UPDATE_TEST_PROGRESS':
        const activeTest = testState.activeTests.get(payload.id);
        if (activeTest) {
          Object.assign(activeTest, payload);
        }
        break;

      case 'COMPLETE_TEST':
        const completedTest = testState.activeTests.get(payload.id);
        if (completedTest) {
          completedTest.status = 'completed';
          completedTest.endTime = new Date();
          completedTest.result = payload.result;
          
          // 移动到历史记录
          testState.testHistory.unshift({
            ...completedTest,
            duration: completedTest.endTime.getTime() - completedTest.startTime.getTime()
          } as TestResult);

          // 限制历史记录数量
          if (testState.testHistory.length > 100) {
            testState.testHistory = testState.testHistory.slice(0, 100);
          }
        }
        break;

      case 'FAIL_TEST':
        const failedTest = testState.activeTests.get(payload.id);
        if (failedTest) {
          failedTest.status = 'failed';
          failedTest.endTime = new Date();
          failedTest.error = payload.error;
        }
        break;

      case 'CANCEL_TEST':
        const cancelledTest = testState.activeTests.get(payload.id);
        if (cancelledTest) {
          cancelledTest.status = 'cancelled';
          cancelledTest.endTime = new Date();
        }
        break;

      case 'REMOVE_ACTIVE_TEST':
        testState.activeTests.delete(payload.id);
        break;

      case 'UPDATE_ENGINES':
        testState.engines = payload;
        break;

      case 'UPDATE_PERFORMANCE':
        Object.assign(testState.performance, payload);
        break;

      case 'ADD_SCHEDULED_TEST':
        testState.scheduledTests.push(payload);
        break;

      case 'UPDATE_SCHEDULED_TEST':
        const scheduleIndex = testState.scheduledTests.findIndex(t => t.id === payload.id);
        if (scheduleIndex !== -1) {
          testState.scheduledTests[scheduleIndex] = { ...testState.scheduledTests[scheduleIndex], ...payload };
        }
        break;

      case 'REMOVE_SCHEDULED_TEST':
        testState.scheduledTests = testState.scheduledTests.filter(t => t.id !== payload.id);
        break;
    }
  }

  private updateUserState(action: string, payload: any): void {
    const userState = this.state.user;

    switch (action) {
      case 'LOGIN':
        userState.isAuthenticated = true;
        userState.user = payload.user;
        userState.permissions = payload.permissions || [];
        userState.session = payload.session;
        break;

      case 'LOGOUT':
        userState.isAuthenticated = false;
        userState.user = null;
        userState.permissions = [];
        userState.session = null;
        break;

      case 'UPDATE_USER':
        if (userState.user) {
          Object.assign(userState.user, payload);
        }
        break;

      case 'UPDATE_PREFERENCES':
        Object.assign(userState.preferences, payload);
        break;

      case 'UPDATE_SESSION':
        if (userState.session) {
          Object.assign(userState.session, payload);
        }
        break;
    }
  }

  private updateSystemState(action: string, payload: any): void {
    const systemState = this.state.system;

    switch (action) {
      case 'UPDATE_CONFIG':
        Object.assign(systemState.config, payload);
        break;

      case 'UPDATE_HEALTH':
        Object.assign(systemState.health, payload);
        break;

      case 'ADD_ERROR':
        systemState.errors.unshift({
          id: this.generateId(),
          timestamp: new Date(),
          resolved: false,
          ...payload
        });
        // 限制错误记录数量
        if (systemState.errors.length > 1000) {
          systemState.errors = systemState.errors.slice(0, 1000);
        }
        break;

      case 'RESOLVE_ERROR':
        const error = systemState.errors.find(e => e.id === payload.id);
        if (error) {
          error.resolved = true;
        }
        break;

      case 'UPDATE_MAINTENANCE':
        Object.assign(systemState.maintenance, payload);
        break;
    }
  }

  private updateNotificationState(action: string, payload: any): void {
    const systemState = this.state.system;
    const uiState = this.state.ui;

    switch (action) {
      case 'ADD_NOTIFICATION':
        systemState.notifications.unshift({
          id: this.generateId(),
          timestamp: new Date(),
          read: false,
          persistent: false,
          ...payload
        });
        break;

      case 'MARK_NOTIFICATION_READ':
        const notification = systemState.notifications.find(n => n.id === payload.id);
        if (notification) {
          notification.read = true;
        }
        break;

      case 'REMOVE_NOTIFICATION':
        systemState.notifications = systemState.notifications.filter(n => n.id !== payload.id);
        break;

      case 'ADD_TOAST':
        uiState.toasts.push({
          id: this.generateId(),
          duration: 5000,
          persistent: false,
          ...payload
        });
        break;

      case 'REMOVE_TOAST':
        uiState.toasts = uiState.toasts.filter(t => t.id !== payload.id);
        break;
    }
  }

  private notifyListeners<T>(event: StateEvent<T>): void {
    // 通知特定类型的监听者
    this.listeners.get(event.type)?.forEach(listener => {
      try {
        listener(this.state, event);
      } catch (error) {
        console.error('State listener error:', error);
      }
    });

    // 通知全局监听者
    this.listeners.get('all')?.forEach(listener => {
      try {
        listener(this.state, event);
      } catch (error) {
        console.error('Global state listener error:', error);
      }
    });
  }

  private shouldPersist(event: StateEvent): boolean {
    return event.type === 'user' || 
           (event.type === 'system' && event.action.includes('CONFIG')) ||
           (event.type === 'cache');
  }

  private persistState(): void {
    try {
      const stateToPersist = this.extractPersistableState();
      localStorage.setItem(this.persistenceKey, JSON.stringify(stateToPersist));
    } catch (error) {
      console.warn('Failed to persist state:', error);
    }
  }

  private loadPersistedState(): void {
    try {
      const persistedData = localStorage.getItem(this.persistenceKey);
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        this.mergePersistedState(parsed);
      }
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
    }
  }

  private extractPersistableState(): any {
    const persistable: any = {};
    
    for (const field of this.persistenceFields) {
      const value = this.getNestedValue(this.state, field);
      if (value !== undefined) {
        this.setNestedValue(persistable, field, value);
      }
    }
    
    return persistable;
  }

  private mergePersistedState(persistedState: any): void {
    for (const field of this.persistenceFields) {
      const value = this.getNestedValue(persistedState, field);
      if (value !== undefined) {
        this.setNestedValue(this.state, field, value);
      }
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理状态
   */
  cleanup(): void {
    this.persistState();
    this.listeners.clear();
  }
}

// 单例实例
export const stateManager = new StateManager();

// 默认导出
export default stateManager;
