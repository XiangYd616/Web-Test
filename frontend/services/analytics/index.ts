
// 核心类型定义
export interface TestRecord {
    id: string;
    testType: string;
    url?: string;
    status: 'completed' | 'failed' | 'running';
    overallScore?: number;
    startTime: string;
    endTime?: string;
    actualDuration?: number;
    results?: any;
    config?: any;
    scores?: any;
    recommendations?: string[];
    savedAt: string;
}

export interface AnalyticsData {
    // 基础统计
    totalTests: number;
    successRate: number;
    averageScore: number;

    // 分类统计
    testsByType: { [key: string]: number };
    testsByStatus: { [key: string]: number };

    // 时间序列数据
    dailyTests: Array<{ date: string; count: number; successCount: number }>;

    // 性能指标
    coreWebVitals: {
        lcp: { value: number; rating: string; change: number };
        fid: { value: number; rating: string; change: number };
        cls: { value: number; rating: string; change: number };
    };

    // 趋势分析
    trends: {
        performance: number;
        security: number;
        accessibility: number;
    };

    // 热门URL
    topUrls: Array<{
        url: string;
        count: number;
        avgScore: number;
        lastTested: string;
    }>;

    // 洞察和建议
    insights: AnalyticsInsight[];
    recommendations: SmartRecommendation[];

    // 元数据
    timeRange?: string;
    lastUpdated?: string;
}

export interface AnalyticsInsight {
    id: string;
    type: 'performance' | 'security' | 'accessibility' | 'seo' | 'user-experience';
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    title: string;
    description: string;
    impact: string;
    actionRequired: boolean;
    estimatedImpact: 'high' | 'medium' | 'low';
    category: string;
    relatedUrls?: string[];
    timestamp: string;
}

export interface SmartRecommendation {
    id: string;
    category: 'performance' | 'security' | 'accessibility' | 'seo' | 'best-practices';
    priority: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    implementation: string;
    estimatedEffort: 'low' | 'medium' | 'high';
    expectedImpact: 'low' | 'medium' | 'high';
    resources: Array<{ title: string; url: string; type: 'documentation' | 'tool' | 'guide' }>;
    applicableUrls: string[];
    tags: string[];
}

// 统一服务导出
export { analyticsService } from './analyticsService';

// 兼容性导出（逐步迁移）
export { dataAnalysisService } from '../data/dataAnalysisService';

// 类型已在上面定义并自动导出，无需重复导出

