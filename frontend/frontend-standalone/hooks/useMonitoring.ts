/**
 * 监控相关的自定义Hook
 * 基于全局状态管理的监控功能
 */

import { useCallback, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';

// 监控目标接口
export interface MonitoringTarget {
    id: string;
    name: string;
    url: string;
    type: 'website' | 'api' | 'database' | 'service';
    status: 'online' | 'offline' | 'warning' | 'error';
    enabled: boolean;
    interval: number;
    timeout: number;
    lastChecked?: string;
    responseTime?: number;
    uptime?: number;
    errorCount?: number;
    tags?: string[];
}

// 告警接口
export interface Alert {
    id: string;
    targetId: string;
    targetName: string;
    type: 'down' | 'slow' | 'error' | 'timeout';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
    resolved: boolean;
    resolvedAt?: string;
}

// 监控统计接口
export interface MonitoringStats {
    totalTargets: number;
    activeTargets: number;
    onlineTargets: number;
    offlineTargets: number;
    warningTargets: number;
    overallUptime: number;
    averageResponseTime: number;
    totalChecks: number;
    failedChecks: number;
}

// 监控Hook
export const useMonitoring = () => {
    const [error, setError] = useState<string | null>(null);

    const { state, dispatch } = useAppContext();
    const { monitoring } = state;

    // 开始监控
    const startMonitoring = useCallback(async (): Promise<void> => {
        try {
            const response = await fetch('/api/monitoring/start', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${state.auth.token}`
                }
            });

            if (!response.ok) {
                throw new Error('启动监控失败');
            }

            dispatch({ type: 'MONITORING_START' });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '启动监控失败';
            dispatch({
                type: 'MONITORING_SET_ERROR',
                payload: { error: errorMessage }
            });
            throw error;
        }
    }, [state.auth.token, dispatch]);

    // 停止监控
    const stopMonitoring = useCallback(async (): Promise<void> => {
        try {
            const response = await fetch('/api/monitoring/stop', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${state.auth.token}`
                }
            });

            if (!response.ok) {
                throw new Error('停止监控失败');
            }

            dispatch({ type: 'MONITORING_STOP' });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '停止监控失败';
            dispatch({
                type: 'MONITORING_SET_ERROR',
                payload: { error: errorMessage }
            });
            throw error;
        }
    }, [state.auth.token, dispatch]);

    // 添加监控目标
    const addTarget = useCallback(async (target: Omit<MonitoringTarget, 'id' | 'status'>): Promise<void> => {
        try {
            const response = await fetch('/api/monitoring/targets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.auth.token}`
                },
                body: JSON.stringify(target)
            });

            if (!response.ok) {
                throw new Error('添加监控目标失败');
            }

            const data = await response.json();
            const newTarget = {
                ...target,
                id: data.id || Date.now().toString(),
                status: 'offline' as const
            };

            dispatch({
                type: 'MONITORING_ADD_TARGET',
                payload: { target: newTarget }
            });

        } catch (error) {
            console.error('Add target error:', error);
            throw error;
        }
    }, [state.auth.token, dispatch]);

    // 更新监控目标
    const updateTarget = useCallback(async (targetId: string, updates: Partial<MonitoringTarget>): Promise<void> => {
        try {
            const response = await fetch(`/api/monitoring/targets/${targetId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.auth.token}`
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) {
                throw new Error('更新监控目标失败');
            }

            dispatch({
                type: 'MONITORING_UPDATE_TARGET',
                payload: { targetId, updates }
            });

        } catch (error) {
            console.error('Update target error:', error);
            throw error;
        }
    }, [state.auth.token, dispatch]);

    // 删除监控目标
    const removeTarget = useCallback(async (targetId: string): Promise<void> => {
        try {
            const response = await fetch(`/api/monitoring/targets/${targetId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${state.auth.token}`
                }
            });

            if (!response.ok) {
                throw new Error('删除监控目标失败');
            }

            dispatch({
                type: 'MONITORING_REMOVE_TARGET',
                payload: { targetId }
            });

        } catch (error) {
            console.error('Remove target error:', error);
            throw error;
        }
    }, [state.auth.token, dispatch]);

    // 手动检查目标
    const checkTarget = useCallback(async (targetId: string): Promise<void> => {
        try {
            const response = await fetch(`/api/monitoring/targets/${targetId}/check`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${state.auth.token}`
                }
            });

            if (!response.ok) {
                throw new Error('检查目标失败');
            }

            const data = await response.json();

            dispatch({
                type: 'MONITORING_UPDATE_TARGET',
                payload: {
                    targetId,
                    updates: {
                        status: data.status,
                        responseTime: data.responseTime,
                        lastChecked: new Date().toISOString()
                    }
                }
            });

        } catch (error) {
            console.error('Check target error:', error);
            throw error;
        }
    }, [state.auth.token, dispatch]);

    // 获取监控目标列表
    const getTargets = useCallback(async (): Promise<MonitoringTarget[]> => {
        try {
            const response = await fetch('/api/monitoring/targets', {
                headers: {
                    'Authorization': `Bearer ${state.auth.token}`
                }
            });

            if (!response.ok) {
                throw new Error('获取监控目标失败');
            }

            const data = await response.json();
            return data.targets || (monitoring.targets as MonitoringTarget[]);

        } catch (error) {
            console.error('Get targets error:', error);
            return monitoring.targets as MonitoringTarget[];
        }
    }, [state.auth.token, monitoring.targets]);

    // 获取告警列表
    const getAlerts = useCallback(async (filters?: {
        resolved?: boolean;
        severity?: string;
        limit?: number;
        offset?: number;
    }): Promise<Alert[]> => {
        try {
            const queryParams = new URLSearchParams();
            if (filters?.resolved !== undefined) queryParams.append('resolved', filters?.resolved.toString());
            if (filters?.severity) queryParams.append('severity', filters?.severity);
            if (filters?.limit) queryParams.append('limit', filters?.limit.toString());
            if (filters?.offset) queryParams.append('offset', filters?.offset.toString());

            const response = await fetch(`/api/monitoring/alerts?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${state.auth.token}`
                }
            });

            if (!response.ok) {
                throw new Error('获取告警列表失败');
            }

            const data = await response.json();
            return data.alerts || monitoring.alerts;

        } catch (error) {
            console.error('Get alerts error:', error);
            return monitoring.alerts as Alert[];
        }
    }, [state.auth.token, monitoring.alerts]);

    // 解决告警
    const resolveAlert = useCallback(async (alertId: string): Promise<void> => {
        try {
            const response = await fetch(`/api/monitoring/alerts/${alertId}/resolve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${state.auth.token}`
                }
            });

            if (!response.ok) {
                throw new Error('解决告警失败');
            }

            dispatch({
                type: 'MONITORING_RESOLVE_ALERT',
                payload: { alertId }
            });

        } catch (error) {
            console.error('Resolve alert error:', error);
            throw error;
        }
    }, [state.auth.token, dispatch]);

    // 获取监控统计
    const getStats = useCallback(async (): Promise<MonitoringStats> => {
        try {
            const response = await fetch('/api/monitoring/stats', {
                headers: {
                    'Authorization': `Bearer ${state.auth.token}`
                }
            });

            if (!response.ok) {
                throw new Error('获取监控统计失败');
            }

            const data = await response.json();
            return data.stats;

        } catch (error) {
            console.error('Get stats error:', error);

            // 返回基于当前状态的统计
            const targets = monitoring.targets;
            const alerts = monitoring.alerts;

            return {
                totalTargets: targets.length,
                activeTargets: targets.filter(t => t?.enabled).length,
                onlineTargets: targets.filter(t => t.status === 'online').length,
                offlineTargets: targets.filter(t => t.status === 'offline').length,
                warningTargets: targets.filter(t => t.status === 'warning').length,
                overallUptime: targets.length > 0
                    ? targets.reduce((sum, t) => sum + (t?.uptime || 0), 0) / targets.length
                    : 0,
                averageResponseTime: targets.length > 0
                    ? targets.reduce((sum, t) => sum + (t?.responseTime || 0), 0) / targets.length
                    : 0,
                totalChecks: targets.reduce((sum, t) => sum + ((t?.uptime || 0) * 100), 0),
                failedChecks: alerts?.filter(a => !a.resolved).length
            };
        }
    }, [state.auth.token, monitoring.targets, monitoring.alerts]);

    // 设置连接状态
    const setConnectionStatus = useCallback((isConnected: boolean) => {
        dispatch({
            type: 'MONITORING_SET_CONNECTION',
            payload: { isConnected }
        });
    }, [dispatch]);

    // 添加告警
    const addAlert = useCallback((alert: Alert) => {
        dispatch({
            type: 'MONITORING_ADD_ALERT',
            payload: { alert }
        });
    }, [dispatch]);

    // 清除错误
    const clearError = useCallback(() => {
        dispatch({
            type: 'MONITORING_SET_ERROR',
            payload: { error: null }
        });
    }, [dispatch]);

    // 获取目标详情
    const getTargetDetails = useCallback(async (targetId: string): Promise<MonitoringTarget | null> => {
        try {
            const response = await fetch(`/api/monitoring/targets/${targetId}`, {
                headers: {
                    'Authorization': `Bearer ${state.auth.token}`
                }
            });

            if (!response.ok) {
                throw new Error('获取目标详情失败');
            }

            const data = await response.json();
            return data.target;

        } catch (error) {
            console.error('Get target details error:', error);
            const target = (monitoring.targets as MonitoringTarget[]).find(t => t.id === targetId);
            return target || null;
        }
    }, [state.auth.token, monitoring.targets]);

    // 批量操作目标
    const batchUpdateTargets = useCallback(async (targetIds: string[], updates: Partial<MonitoringTarget>): Promise<void> => {
        try {
            const response = await fetch('/api/monitoring/targets/batch', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.auth.token}`
                },
                body: JSON.stringify({ targetIds, updates })
            });

            if (!response.ok) {
                throw new Error('批量更新目标失败');
            }

            // 更新每个目标的状态
            targetIds.forEach(targetId => {
                dispatch({
                    type: 'MONITORING_UPDATE_TARGET',
                    payload: { targetId, updates }
                });
            });

        } catch (error) {
            console.error('Batch update targets error:', error);
            throw error;
        }
    }, [state.auth.token, dispatch]);

    return {
        // 状态
        targets: monitoring.targets,
        alerts: monitoring.alerts,
        status: monitoring.status,
        isConnected: monitoring.isConnected,
        error: monitoring.error,

        // 方法
        startMonitoring,
        stopMonitoring,
        addTarget,
        updateTarget,
        removeTarget,
        checkTarget,
        getTargets,
        getAlerts,
        resolveAlert,
        getStats,
        setConnectionStatus,
        addAlert,
        clearError,
        getTargetDetails,
        batchUpdateTargets
    };
};

export default useMonitoring;