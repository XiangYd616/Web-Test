
// 核心类型定义
export interface Report {
    id: string;
    name: string;
    type: 'performance' | 'security' | 'comprehensive' | 'custom';
    format: 'pdf' | 'excel' | 'html' | 'json';
    status: 'generating' | 'completed' | 'failed';
    progress: number;
    createdAt: string;
    completedAt?: string;
    downloadUrl?: string;
    fileSize?: string;
    config: ReportConfig;
    metadata: {
        recordCount: number;
        dateRange: string;
        generatedBy: string;
        version: string;
    };
}

export interface ReportConfig {
    dateRange: number; // 天数
    testTypes: string[];
    includeCharts: boolean;
    includeRecommendations: boolean;
    includeMonitoring: boolean;
    includeRawData: boolean;
    customFilters?: {
        urls?: string[];
        scores?: { min: number; max: number };
        statuses?: string[];
    };
}

export interface ReportTemplate {
    id: string;
    name: string;
    description: string;
    type: 'performance' | 'security' | 'comprehensive';
    sections: ReportSection[];
    defaultConfig: ReportConfig;
    preview?: string;
}

export interface ReportSection {
    id: string;
    title: string;
    type: 'summary' | 'chart' | 'table' | 'recommendations' | 'raw_data';
    required: boolean;
    configurable: boolean;
    description: string;
}

export interface ExportTask {
    id: string;
    name: string;
    format: 'json' | 'csv' | 'excel' | 'pdf';
    status: 'preparing' | 'exporting' | 'completed' | 'failed';
    progress: number;
    recordCount?: number;
    downloadUrl?: string;
    createdAt: string;
    completedAt?: string;
    errorMessage?: string;
}

// 统一服务导出
export { default as reportService } from './reportService';

// 兼容性导出（逐步迁移）
export { reportGeneratorService as legacyReportGenerator, reportGeneratorService as legacyReportService } from '../reportGeneratorService';

// 类型已在上面定义并自动导出，无需重复导出

