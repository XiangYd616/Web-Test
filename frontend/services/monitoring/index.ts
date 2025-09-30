
// 核心类型定义
export interface MonitoringSite {
    id: string;
    name: string;
    url: string;
    region: string;
    status: 'online' | 'offline' | 'warning' | 'unknown';
    lastCheck: string;
    responseTime: number;
    uptime: number;
    alertsEnabled: boolean;
    checkInterval: number;
    tags: string[];
    createdAt: string;
}

export interface MonitoringData {
    timestamp: string;
    siteId: string;
    status: 'online' | 'offline' | 'warning';
    responseTime: number;
    statusCode: number;
    errorMessage?: string;
    location: string;
    metrics: {
        dns: number;
        connect: number;
        ssl: number;
        download: number;
        total: number;
    };
}

export interface MonitoringStats {
    totalSites: number;
    onlineSites: number;
    avgResponseTime: number;
    totalUptime: number;
    activeAlerts: number;
    checksToday: number;
    incidentsToday: number;
    lastUpdated: string;
}

export interface AlertConfig {
    id: string;
    siteId: string;
    type: 'uptime' | 'response_time' | 'status_code' | 'ssl_expiry';
    condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
    threshold: number;
    enabled: boolean;
    notifications: {
        email: boolean;
        webhook: boolean;
        sms: boolean;
    };
    cooldown: number; // 分钟
    createdAt: string;
}

export interface MonitoringIncident {
    id: string;
    siteId: string;
    type: 'downtime' | 'slow_response' | 'error' | 'ssl_issue';
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    status: 'open' | 'investigating' | 'resolved';
    affectedChecks: number;
    rootCause?: string;
    resolution?: string;
}

// 统一服务导出
export { streamingMonitoring } from './streamingMonitoring';

// 兼容性导出（逐步迁移）
export { monitoringService } from '../monitoringService';

// 类型已在上面定义并自动导出，无需重复导出

