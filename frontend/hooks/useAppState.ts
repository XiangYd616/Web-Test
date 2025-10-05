/**
 * React Hooks for App State Management
 * 提供基于状态管理器的React Hooks
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { stateManager, StateEventType, StateEvent, AppState } from '../services/state/stateManager';

/**
 * 使用应用状态的主Hook
 */
export function useAppState() {
  const [state, setState] = useState<AppState>(stateManager.getState());

  useEffect(() => {
    const unsubscribe = stateManager.subscribe('all', (newState: AppState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  const dispatch = useCallback((event: Omit<StateEvent, 'timestamp' | 'id'>) => {
    stateManager.dispatch(event);
  }, []);

  const select = useCallback(<R>(selector: (state: AppState) => R): R => {
    return stateManager.select(selector);
  }, []);

  return {
    state,
    dispatch,
    select
  };
}

/**
 * 使用特定状态类型的Hook
 */
export function useStateType<T = any>(type: StateEventType | 'all') {
  const [state, setState] = useState<AppState>(stateManager.getState());

  useEffect(() => {
    const unsubscribe = stateManager.subscribe(type, (newState: AppState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [type]);

  const dispatch = useCallback((action: string, payload: T) => {
    stateManager.dispatch({ type, action, payload });
  }, [type]);

  return {
    state,
    dispatch
  };
}

/**
 * 使用测试状态
 */
export function useTestState() {
  const { state, dispatch } = useStateType('test');

  const testState = useMemo(() => state.test, [state.test]);

  const actions = useMemo(() => ({
    startTest: (testConfig: { id: string; type: string; url: string }) => {
      dispatch('START_TEST', testConfig);
    },
    
    updateProgress: (id: string, progress: number, message?: string) => {
      dispatch('UPDATE_TEST_PROGRESS', { id, progress, message });
    },
    
    completeTest: (id: string, result: any) => {
      dispatch('COMPLETE_TEST', { id, result });
    },
    
    failTest: (id: string, error: string) => {
      dispatch('FAIL_TEST', { id, error });
    },
    
    cancelTest: (id: string) => {
      dispatch('CANCEL_TEST', { id });
    },
    
    removeActiveTest: (id: string) => {
      dispatch('REMOVE_ACTIVE_TEST', { id });
    },
    
    updateEngines: (engines: unknown[]) => {
      dispatch('UPDATE_ENGINES', engines);
    },
    
    updatePerformance: (metrics: any) => {
      dispatch('UPDATE_PERFORMANCE', metrics);
    },
    
    addScheduledTest: (test: any) => {
      dispatch('ADD_SCHEDULED_TEST', test);
    },
    
    updateScheduledTest: (id: string, updates: any) => {
      dispatch('UPDATE_SCHEDULED_TEST', { id, ...updates });
    },
    
    removeScheduledTest: (id: string) => {
      dispatch('REMOVE_SCHEDULED_TEST', { id });
    }
  }), [dispatch]);

  return {
    testState,
    actions
  };
}

/**
 * 使用用户状态
 */
export function useUserState() {
  const { state, dispatch } = useStateType('user');

  const userState = useMemo(() => state.user, [state.user]);

  const actions = useMemo(() => ({
    login: (user: unknown, permissions: string[] = [], session: any = null) => {
      dispatch('LOGIN', { user, permissions, session });
    },
    
    logout: () => {
      dispatch('LOGOUT', {});
    },
    
    updateUser: (updates: any) => {
      dispatch('UPDATE_USER', updates);
    },
    
    updatePreferences: (preferences: any) => {
      dispatch('UPDATE_PREFERENCES', preferences);
    },
    
    updateSession: (session: any) => {
      dispatch('UPDATE_SESSION', session);
    }
  }), [dispatch]);

  return {
    userState,
    actions
  };
}

/**
 * 使用系统状态
 */
export function useSystemState() {
  const { state, dispatch } = useStateType('system');

  const systemState = useMemo(() => state.system, [state.system]);

  const actions = useMemo(() => ({
    updateConfig: (config: any) => {
      dispatch('UPDATE_CONFIG', config);
    },
    
    updateHealth: (health: any) => {
      dispatch('UPDATE_HEALTH', health);
    },
    
    addError: (error: any) => {
      dispatch('ADD_ERROR', error);
    },
    
    resolveError: (id: string) => {
      dispatch('RESOLVE_ERROR', { id });
    },
    
    updateMaintenance: (maintenance: any) => {
      dispatch('UPDATE_MAINTENANCE', maintenance);
    }
  }), [dispatch]);

  return {
    systemState,
    actions
  };
}

/**
 * 使用通知状态
 */
export function useNotificationState() {
  const { state, dispatch } = useStateType('notification');

  const notifications = useMemo(() => state.system.notifications, [state.system.notifications]);
  const toasts = useMemo(() => state.ui.toasts, [state.ui.toasts]);

  const actions = useMemo(() => ({
    addNotification: (notification: any) => {
      dispatch('ADD_NOTIFICATION', notification);
    },
    
    markNotificationRead: (id: string) => {
      dispatch('MARK_NOTIFICATION_READ', { id });
    },
    
    removeNotification: (id: string) => {
      dispatch('REMOVE_NOTIFICATION', { id });
    },
    
    addToast: (toast: any) => {
      dispatch('ADD_TOAST', toast);
    },
    
    removeToast: (id: string) => {
      dispatch('REMOVE_TOAST', { id });
    }
  }), [dispatch]);

  return {
    notifications,
    toasts,
    actions
  };
}

/**
 * 使用加载状态
 */
export function useLoadingState() {
  const { state } = useAppState();

  const setLoading = useCallback((key: string, loading: boolean) => {
    const loadingMap = new Map(state.ui.loading);
    loadingMap.set(key, loading);
    
    stateManager.dispatch({
      type: 'system',
      action: 'UPDATE_UI_STATE',
      payload: { loading: loadingMap }
    });
  }, [state.ui.loading]);

  const isLoading = useCallback((key: string): boolean => {
    return state.ui.loading.get(key) || false;
  }, [state.ui.loading]);

  const isAnyLoading = useMemo(() => {
    return Array.from(state.ui.loading.values()).some(loading => loading);
  }, [state.ui.loading]);

  return {
    setLoading,
    isLoading,
    isAnyLoading,
    loadingStates: state.ui.loading
  };
}

/**
 * 使用模态框状态
 */
export function useModalState() {
  const { state } = useAppState();

  const openModal = useCallback((modalId: string, data?: any) => {
    const modalMap = new Map(state.ui.modals);
    modalMap.set(modalId, { open: true, data });
    
    stateManager.dispatch({
      type: 'system',
      action: 'UPDATE_UI_STATE',
      payload: { modals: modalMap }
    });
  }, [state.ui.modals]);

  const closeModal = useCallback((modalId: string) => {
    const modalMap = new Map(state.ui.modals);
    modalMap.delete(modalId);
    
    stateManager.dispatch({
      type: 'system',
      action: 'UPDATE_UI_STATE',
      payload: { modals: modalMap }
    });
  }, [state.ui.modals]);

  const isModalOpen = useCallback((modalId: string): boolean => {
    return state.ui.modals.get(modalId)?.open || false;
  }, [state.ui.modals]);

  const getModalData = useCallback((modalId: string): any => {
    return state.ui.modals.get(modalId)?.data;
  }, [state.ui.modals]);

  return {
    openModal,
    closeModal,
    isModalOpen,
    getModalData,
    modals: state.ui.modals
  };
}

/**
 * 使用选择器Hook
 */
export function useSelector<R>(selector: (state: AppState) => R): R {
  const [selectedValue, setSelectedValue] = useState<R>(() => {
    return stateManager.select(selector);
  });

  useEffect(() => {
    const unsubscribe = stateManager.subscribe('all', (newState: AppState) => {
      const newValue = selector(newState);
      setSelectedValue(newValue);
    });

    return unsubscribe;
  }, [selector]);

  return selectedValue;
}

/**
 * 使用业务逻辑Hook组合
 */
export function useBusinessState() {
  const { testState, actions: testActions } = useTestState();
  const { userState, actions: userActions } = useUserState();
  const { systemState, actions: systemActions } = useSystemState();
  const { notifications, toasts, actions: notificationActions } = useNotificationState();
  const { setLoading, isLoading, isAnyLoading } = useLoadingState();
  const { openModal, closeModal, isModalOpen, getModalData } = useModalState();

  // 组合业务逻辑
  const businessActions = useMemo(() => ({
    async runTest(testType: string, url: string, options: any = {}) {
      const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        setLoading(`test-${testId}`, true);
        testActions.startTest({ id: testId, type: testType, url });

        // 模拟API调用
        const response = await fetch('/api/tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testType, url, options })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        testActions.completeTest(testId, result);
        
        notificationActions.addToast({
          type: 'success',
          message: `${testType}测试完成`
        });

        return result;
      } catch (error: any) {
        testActions.failTest(testId, error.message);
        notificationActions.addToast({
          type: 'error',
          message: `测试失败: ${error.message}`
        });
        throw error;
      } finally {
        setLoading(`test-${testId}`, false);
      }
    },

    async authenticate(credentials: { username: string; password: string }) {
      try {
        setLoading('auth', true);
        
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials)
        });

        if (!response.ok) {
          throw new Error('登录失败');
        }

        const { user, token, permissions } = await response.json();
        const session = {
          sessionId: token,
          startTime: new Date(),
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时过期
        };

        userActions.login(user, permissions, session);
        
        notificationActions.addToast({
          type: 'success',
          message: `欢迎回来，${user.username}！`
        });

        return { user, token, permissions };
      } catch (error: any) {
        notificationActions.addToast({
          type: 'error',
          message: error.message
        });
        throw error;
      } finally {
        setLoading('auth', false);
      }
    },

    signOut() {
      userActions.logout();
      notificationActions.addToast({
        type: 'info',
        message: '您已成功登出'
      });
    },

    scheduleTest(testConfig: unknown, scheduleOptions: any) {
      const scheduledTest = {
        id: `scheduled-${Date.now()}`,
        ...testConfig,
        ...scheduleOptions,
        status: 'scheduled'
      };
      
      testActions.addScheduledTest(scheduledTest);
      notificationActions.addToast({
        type: 'success',
        message: '测试已成功调度'
      });
    },

    showTestResult(testId: string, result: any) {
      openModal('testResult', { testId, result });
    },

    exportTestData(format: 'json' | 'csv' | 'pdf' = 'json') {
      // 实现数据导出逻辑
      const data = {
        tests: testState.testHistory,
        timestamp: new Date().toISOString(),
        format
      };

      notificationActions.addToast({
        type: 'info',
        message: `数据导出已开始，格式：${format.toUpperCase()}`
      });

      return data;
    }
  }), [
    testActions, userActions, systemActions, notificationActions,
    setLoading, openModal, testState.testHistory
  ]);

  return {
    // 状态
    testState,
    userState,
    systemState,
    notifications,
    toasts,
    
    // 基础操作
    testActions,
    userActions,
    systemActions,
    notificationActions,
    
    // UI操作
    setLoading,
    isLoading,
    isAnyLoading,
    openModal,
    closeModal,
    isModalOpen,
    getModalData,
    
    // 业务操作
    ...businessActions
  };
}

// 导出所有hooks
export default useAppState;
