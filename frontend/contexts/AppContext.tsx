/**
 * 应用全局状态管理Context
 * 使用React Context + useReducer实现统一的状态管理
 */

import type { ReactNode, createContext, useContext, useEffect, useReducer, FC } from 'react';

// 用户状态接口
export interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    avatar?: string;
    preferences?: {
        theme: 'light' | 'dark';
        language: string;
        notifications: boolean;
    };
}

// 认证状态接口
export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

// 测试状态接口
export interface TestState {
    activeTests: Array<{
        id: string;
        type: string;
        status: 'running' | 'completed' | 'failed' | 'cancelled';
        progress: number;
        startTime: string;
    }>;
    history: Array<{
        id: string;
        type: string;
        status: string;
        score?: number;
        startTime: string;
        endTime?: string;
    }>;
    configurations: Array<{
        id: string;
        name: string;
        type: string;
        config: Record<string, any>;
    }>;
    isRunning: boolean;
    error: string | null;
}

// 监控状态接口
export interface MonitoringState {
    targets: Array<{
        id: string;
        name: string;
        url: string;
        status: 'online' | 'offline' | 'warning' | 'error';
        enabled: boolean;
        lastChecked?: string;
        responseTime?: number;
        uptime?: number;
    }>;
    alerts: Array<{
        id: string;
        targetId: string;
        type: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        message: string;
        timestamp: string;
        resolved: boolean;
    }>;
    status: 'idle' | 'monitoring' | 'error';
    isConnected: boolean;
    error: string | null;
}

// UI状态接口
export interface UIState {
    theme: 'light' | 'dark';
    sidebarCollapsed: boolean;
    notifications: Array<{
        id: string;
        type: 'success' | 'error' | 'warning' | 'info';
        title?: string;
        message: string;
        timestamp: number;
        read: boolean;
    }>;
    loading: {
        global: boolean;
        auth: boolean;
        test: boolean;
        monitoring: boolean;
    };
    modals: {
        [key: string]: boolean;
    };
}

// 应用状态接口
export interface AppState {
    auth: AuthState;
    test: TestState;
    monitoring: MonitoringState;
    ui: UIState;
}

// Action类型定义
export type AppAction =
    // 认证相关
    | { type: 'AUTH_LOGIN_START' }
    | { type: 'AUTH_LOGIN_SUCCESS'; payload: { user: User; token: string } }
    | { type: 'AUTH_LOGIN_FAILURE'; payload: { error: string } }
    | { type: 'AUTH_LOGOUT' }
    | { type: 'AUTH_UPDATE_USER'; payload: { user: Partial<User> } }
    | { type: 'AUTH_CLEAR_ERROR' }

    // 测试相关
    | { type: 'TEST_START'; payload: { test: any } }
    | { type: 'TEST_UPDATE_PROGRESS'; payload: { testId: string; progress: number } }
    | { type: 'TEST_COMPLETE'; payload: { testId: string; result: any } }
    | { type: 'TEST_FAIL'; payload: { testId: string; error: string } }
    | { type: 'TEST_CANCEL'; payload: { testId: string } }
    | { type: 'TEST_ADD_TO_HISTORY'; payload: { result: any } }
    | { type: 'TEST_SAVE_CONFIGURATION'; payload: { config: any } }
    | { type: 'TEST_CLEAR_ERROR' }

    // 监控相关
    | { type: 'MONITORING_START' }
    | { type: 'MONITORING_STOP' }
    | { type: 'MONITORING_ADD_TARGET'; payload: { target: any } }
    | { type: 'MONITORING_UPDATE_TARGET'; payload: { targetId: string; updates: any } }
    | { type: 'MONITORING_REMOVE_TARGET'; payload: { targetId: string } }
    | { type: 'MONITORING_ADD_ALERT'; payload: { alert: any } }
    | { type: 'MONITORING_RESOLVE_ALERT'; payload: { alertId: string } }
    | { type: 'MONITORING_SET_CONNECTION'; payload: { isConnected: boolean } }
    | { type: 'MONITORING_SET_ERROR'; payload: { error: string | null } }

    // UI相关
    | { type: 'UI_SET_THEME'; payload: { theme: 'light' | 'dark' } }
    | { type: 'UI_TOGGLE_SIDEBAR' }
    | { type: 'UI_ADD_NOTIFICATION'; payload: { notification: any } }
    | { type: 'UI_REMOVE_NOTIFICATION'; payload: { notificationId: string } }
    | { type: 'UI_MARK_NOTIFICATION_READ'; payload: { notificationId: string } }
    | { type: 'UI_SET_LOADING'; payload: { key: keyof UIState['loading']; loading: boolean } }
    | { type: 'UI_OPEN_MODAL'; payload: { modalId: string } }
    | { type: 'UI_CLOSE_MODAL'; payload: { modalId: string } };

// 初始状态
const initialState: AppState = {
    auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
    },
    test: {
        activeTests: [],
        history: [],
        configurations: [],
        isRunning: false,
        error: null
    },
    monitoring: {
        targets: [],
        alerts: [],
        status: 'idle',
        isConnected: false,
        error: null
    },
    ui: {
        theme: 'light',
        sidebarCollapsed: false,
        notifications: [],
        loading: {
            global: false,
            auth: false,
            test: false,
            monitoring: false
        },
        modals: {}
    }
};

// Reducer函数
const appReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
        // 认证相关
        case 'AUTH_LOGIN_START':
            return {
                ...state,
                auth: {
                    ...state.auth,
                    isLoading: true,
                    error: null
                }
            };

        case 'AUTH_LOGIN_SUCCESS':
            return {
                ...state,
                auth: {
                    ...state.auth,
                    user: action.payload.user,
                    token: action.payload.token,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null
                }
            };

        case 'AUTH_LOGIN_FAILURE':
            return {
                ...state,
                auth: {
                    ...state.auth,
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: action.payload.error
                }
            };

        case 'AUTH_LOGOUT':
            return {
                ...state,
                auth: {
                    ...initialState.auth
                }
            };

        case 'AUTH_UPDATE_USER':
            return {
                ...state,
                auth: {
                    ...state.auth,
                    user: state.auth.user ? { ...state.auth.user, ...action.payload.user } : null
                }
            };

        case 'AUTH_CLEAR_ERROR':
            return {
                ...state,
                auth: {
                    ...state.auth,
                    error: null
                }
            };

        // 测试相关
        case 'TEST_START':
            return {
                ...state,
                test: {
                    ...state.test,
                    activeTests: [...state.test.activeTests, action.payload.test],
                    isRunning: true,
                    error: null
                }
            };

        case 'TEST_UPDATE_PROGRESS':
            return {
                ...state,
                test: {
                    ...state.test,
                    activeTests: state.test.activeTests.map(test =>
                        test.id === action.payload.testId
                            ? { ...test, progress: action.payload.progress }
                            : test
                    )
                }
            };

        case 'TEST_COMPLETE':
            return {
                ...state,
                test: {
                    ...state.test,
                    activeTests: state.test.activeTests.filter(test => test.id !== action.payload.testId),
                    history: [action.payload.result, ...state.test.history],
                    isRunning: state.test.activeTests.length <= 1,
                    error: null
                }
            };

        case 'TEST_FAIL':
            return {
                ...state,
                test: {
                    ...state.test,
                    activeTests: state.test.activeTests.filter(test => test.id !== action.payload.testId),
                    isRunning: state.test.activeTests.length <= 1,
                    error: action.payload.error
                }
            };

        case 'TEST_CANCEL':
            return {
                ...state,
                test: {
                    ...state.test,
                    activeTests: state.test.activeTests.filter(test => test.id !== action.payload.testId),
                    isRunning: state.test.activeTests.length <= 1
                }
            };

        case 'TEST_ADD_TO_HISTORY':
            return {
                ...state,
                test: {
                    ...state.test,
                    history: [action.payload.result, ...state.test.history]
                }
            };

        case 'TEST_SAVE_CONFIGURATION':
            return {
                ...state,
                test: {
                    ...state.test,
                    configurations: [action.payload.config, ...state.test.configurations]
                }
            };

        case 'TEST_CLEAR_ERROR':
            return {
                ...state,
                test: {
                    ...state.test,
                    error: null
                }
            };

        // 监控相关
        case 'MONITORING_START':
            return {
                ...state,
                monitoring: {
                    ...state.monitoring,
                    status: 'monitoring',
                    error: null
                }
            };

        case 'MONITORING_STOP':
            return {
                ...state,
                monitoring: {
                    ...state.monitoring,
                    status: 'idle'
                }
            };

        case 'MONITORING_ADD_TARGET':
            return {
                ...state,
                monitoring: {
                    ...state.monitoring,
                    targets: [...state.monitoring.targets, action.payload.target]
                }
            };

        case 'MONITORING_UPDATE_TARGET':
            return {
                ...state,
                monitoring: {
                    ...state.monitoring,
                    targets: state.monitoring.targets.map(target =>
                        target.id === action.payload.targetId
                            ? { ...target, ...action.payload.updates }
                            : target
                    )
                }
            };

        case 'MONITORING_REMOVE_TARGET':
            return {
                ...state,
                monitoring: {
                    ...state.monitoring,
                    targets: state.monitoring.targets.filter(target => target.id !== action.payload.targetId)
                }
            };

        case 'MONITORING_ADD_ALERT':
            return {
                ...state,
                monitoring: {
                    ...state.monitoring,
                    alerts: [action.payload.alert, ...state.monitoring.alerts]
                }
            };

        case 'MONITORING_RESOLVE_ALERT':
            return {
                ...state,
                monitoring: {
                    ...state.monitoring,
                    alerts: state.monitoring.alerts.map(alert =>
                        alert.id === action.payload.alertId
                            ? { ...alert, resolved: true }
                            : alert
                    )
                }
            };

        case 'MONITORING_SET_CONNECTION':
            return {
                ...state,
                monitoring: {
                    ...state.monitoring,
                    isConnected: action.payload.isConnected
                }
            };

        case 'MONITORING_SET_ERROR':
            return {
                ...state,
                monitoring: {
                    ...state.monitoring,
                    error: action.payload.error
                }
            };

        // UI相关
        case 'UI_SET_THEME':
            return {
                ...state,
                ui: {
                    ...state.ui,
                    theme: action.payload.theme
                }
            };

        case 'UI_TOGGLE_SIDEBAR':
            return {
                ...state,
                ui: {
                    ...state.ui,
                    sidebarCollapsed: !state.ui.sidebarCollapsed
                }
            };

        case 'UI_ADD_NOTIFICATION':
            return {
                ...state,
                ui: {
                    ...state.ui,
                    notifications: [action.payload.notification, ...state.ui.notifications]
                }
            };

        case 'UI_REMOVE_NOTIFICATION':
            return {
                ...state,
                ui: {
                    ...state.ui,
                    notifications: state.ui.notifications.filter(n => n.id !== action.payload.notificationId)
                }
            };

        case 'UI_MARK_NOTIFICATION_READ':
            return {
                ...state,
                ui: {
                    ...state.ui,
                    notifications: state.ui.notifications.map(n =>
                        n.id === action.payload.notificationId ? { ...n, read: true } : n
                    )
                }
            };

        case 'UI_SET_LOADING':
            return {
                ...state,
                ui: {
                    ...state.ui,
                    loading: {
                        ...state.ui.loading,
                        [action.payload.key]: action.payload.loading
                    }
                }
            };

        case 'UI_OPEN_MODAL':
            return {
                ...state,
                ui: {
                    ...state.ui,
                    modals: {
                        ...state.ui.modals,
                        [action.payload.modalId]: true
                    }
                }
            };

        case 'UI_CLOSE_MODAL':
            return {
                ...state,
                ui: {
                    ...state.ui,
                    modals: {
                        ...state.ui.modals,
                        [action.payload.modalId]: false
                    }
                }
            };

        default:
            return state;
    }
};

// Context接口
export interface AppContextValue {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
}

// 创建Context
export const AppContext = createContext<AppContextValue | undefined>(undefined);

// Provider组件属性
export interface AppProviderProps {
    children: ReactNode;
}

// Provider组件
export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);

    // 状态持久化
    useEffect(() => {
        // 从localStorage加载状态
        const savedState = localStorage.getItem('appState');
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                // 只恢复部分状态，避免恢复临时状态
                if (parsedState.auth?.token) {
                    dispatch({
                        type: 'AUTH_LOGIN_SUCCESS',
                        payload: {
                            user: parsedState.auth.user,
                            token: parsedState.auth.token
                        }
                    });
                }
                if (parsedState.ui?.theme) {
                    dispatch({
                        type: 'UI_SET_THEME',
                        payload: { theme: parsedState.ui.theme }
                    });
                }
                if (parsedState.ui?.sidebarCollapsed !== undefined) {
                    if (parsedState.ui.sidebarCollapsed) {
                        dispatch({ type: 'UI_TOGGLE_SIDEBAR' });
                    }
                }
            } catch (error) {
                console.error('Failed to load saved state:', error);
            }
        }
    }, []);

    // 保存状态到localStorage
    useEffect(() => {
        const stateToSave = {
            auth: {
                user: state.auth.user,
                token: state.auth.token,
                isAuthenticated: state.auth.isAuthenticated
            },
            ui: {
                theme: state.ui.theme,
                sidebarCollapsed: state.ui.sidebarCollapsed
            }
        };
        localStorage.setItem('appState', JSON.stringify(stateToSave));
    }, [state.auth.user, state.auth.token, state.auth.isAuthenticated, state.ui.theme, state.ui.sidebarCollapsed]);

    const value: AppContextValue = {
        state,
        dispatch
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

// Hook for using the context
export const useAppContext = (): AppContextValue => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

export default AppProvider;