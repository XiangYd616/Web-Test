/**
 * 数据导出组件
 * 支持多格式数据导出功能
 */

import {
    AlertCircle,
    CheckCircle,
    Clock,
    Download,
    FileJson,
    FileSpreadsheet,
    FileText,
    Filter,
    Settings
} from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useNotification } from '../../hooks/useNotification';
import {
    Badge,
    Button,
    Card,
    Checkbox,
    Input,
    Modal,
    ProgressBar,
    Select
} from '../ui/index';

// SelectOption type will be defined locally

// 导出格式类型
export type ExportFormat = 'pdf' | 'excel' | 'xlsx' | 'csv' | 'json';

// 导出数据类型
export type ExportDataType = 'test-results' | 'monitoring-data' | 'user-data' | 'analytics' | 'reports';

// 导出配置接口
export interface ExportConfig {
    format: ExportFormat;
    dataType: ExportDataType;
    dateRange: {
        start: string;
        end: string;
    };
    filters: {
        testTypes?: string[];
        status?: string[];
        targets?: string[];
    };
    options: {
        includeCharts?: boolean;
        includeRawData?: boolean;
        includeRecommendations?: boolean;
        compression?: boolean;
        password?: string;
    };
}

// 导出任务接口
export interface ExportTask {
    id: string;
    name: string;
    config: ExportConfig;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    createdAt: string;
    completedAt?: string;
    downloadUrl?: string;
    error?: string;
    fileSize?: number;
}

// 组件属性接口
export interface DataExporterProps {
    availableData?: {
        testResults?: any[];
        monitoringData?: any[];
        analytics?: any[];
    };
    onExport?: (config: ExportConfig) => Promise<ExportTask>;
    className?: string;
}

// 格式选项
const formatOptions: SelectOption[] = [
    { value: 'pdf', label: 'PDF报告' },
    { value: 'excel', label: 'Excel表格' },
    { value: 'csv', label: 'CSV文件' },
    { value: 'json', label: 'JSON数据' }
];

// 数据类型选项
const dataTypeOptions: SelectOption[] = [
    { value: 'test-results', label: '测试结果' },
    { value: 'monitoring-data', label: '监控数据' },
    { value: 'user-data', label: '用户数据' },
    { value: 'analytics', label: '分析报告' },
    { value: 'reports', label: '综合报告' }
];

// 状态筛选选项
const statusOptions: SelectOption[] = [
    { value: 'all', label: '全部状态' },
    { value: 'completed', label: '已完成' },
    { value: 'failed', label: '失败' },
    { value: 'running', label: '运行中' }
];

export const DataExporter: React.FC<DataExporterProps> = ({
    onExport,
    className = ''
}) => {
    // 状态管理
    const [config, setConfig] = useState<ExportConfig>({
        format: 'json',
        dataType: 'test-results',
        dateRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0]
        },
        filters: {},
        options: {
            includeCharts: true,
            includeRawData: false,
            includeRecommendations: true,
            compression: false
        }
    });
    const [exportTasks, setExportTasks] = useState<ExportTask[]>([]);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 自定义钩子
    const { showNotification } = useNotification();

    // API调用函数
    const apiCall = async (endpoint: string, options: RequestInit = {}) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/v1/data-export${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '请求失败');
        }

        return response.json();
    };

    // 加载导出任务列表
    const loadExportTasks = useCallback(async () => {
        try {
            setIsLoading(true);
            const result = await apiCall('/tasks');
            if (result.success) {
                setExportTasks(result.data);
            }
        } catch (error) {
            console.error('加载导出任务失败:', error);
            showNotification('加载导出任务失败', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showNotification]);

    // 组件挂载时加载任务列表
    useEffect(() => {
        loadExportTasks();
    }, [loadExportTasks]);

    // 轮询任务状态更新
    useEffect(() => {
        const interval = setInterval(async () => {
            const activeTasks = exportTasks.filter(task =>
                task.status === 'pending' || task.status === 'processing'
            );

            if (activeTasks.length > 0) {
                try {
                    for (const task of activeTasks) {
                        const result = await apiCall(`/task/${task.id}/status`);
                        if (result.success) {
                            setExportTasks(prev => prev.map(t =>
                                t.id === task.id ? { ...t, ...result.data } : t
                            ));
                        }
                    }
                } catch (error) {
                    console.error('更新任务状态失败:', error);
                }
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [exportTasks]);

    // 获取格式图标
    const getFormatIcon = (format: ExportFormat) => {
        switch (format) {
            case 'pdf': return <FileText className="w-5 h-5 text-red-600" />;
            case 'excel': return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
            case 'csv': return <FileSpreadsheet className="w-5 h-5 text-blue-600" />;
            case 'json': return <FileJson className="w-5 h-5 text-yellow-600" />;
            case 'xlsx': return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
            default: return <FileText className="w-5 h-5 text-gray-600" />;
        }
    };

    // 获取任务状态图标
    const getTaskStatusIcon = (status: ExportTask['status']) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'processing': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
            default: return <Clock className="w-4 h-4 text-gray-500" />;
        }
    };

    // 获取任务状态颜色
    const getTaskStatusColor = (status: ExportTask['status']) => {
        switch (status) {
            case 'completed': return 'green';
            case 'failed': return 'red';
            case 'processing': return 'blue';
            default: return 'gray';
        }
    };

    // 开始导出
    const handleStartExport = useCallback(async () => {
        try {
            setIsExporting(true);

            // 调用API创建导出任务
            const result = await apiCall('/create', {
                method: 'POST',
                body: JSON.stringify({
                    dataType: config.dataType,
                    format: config.format,
                    dateRange: config.dateRange,
                    filters: config.filters,
                    options: config.options
                })
            });

            if (result.success) {
                // 添加新任务到列表
                setExportTasks(prev => [result.data, ...prev]);
                showNotification('导出任务已创建，正在处理中...', 'success');
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '创建导出任务失败';
            showNotification(`导出失败: ${errorMessage}`, 'error');
        } finally {
            setIsExporting(false);
        }
    }, [config, showNotification]);

    // 下载文件
    const handleDownload = useCallback(async (task: ExportTask) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/v1/data-export/task/${task.id}/download`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('下载失败');
            }

            // 获取文件名
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `${task.name}.${task.config.format}`;
            if (contentDisposition) {
                const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (matches && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            // 创建下载
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = decodeURIComponent(filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showNotification('文件下载成功', 'success');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '下载失败';
            showNotification(`下载失败: ${errorMessage}`, 'error');
        }
    }, [showNotification]);

    // 取消任务
    const handleCancelTask = useCallback(async (taskId: string) => {
        try {
            const result = await apiCall(`/task/${taskId}/cancel`, {
                method: 'POST'
            });

            if (result.success) {
                setExportTasks(prev => prev.map(t =>
                    t.id === taskId ? { ...t, status: 'failed', error: '用户取消' } : t
                ));
                showNotification('任务已取消', 'success');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '取消任务失败';
            showNotification(`取消失败: ${errorMessage}`, 'error');
        }
    }, [showNotification]);

    // 删除任务
    const handleDeleteTask = useCallback(async (taskId: string) => {
        if (!confirm('确定要删除这个导出任务吗？')) {
            return;
        }

        try {
            const result = await apiCall(`/task/${taskId}`, {
                method: 'DELETE'
            });

            if (result.success) {
                setExportTasks(prev => prev.filter(t => t.id !== taskId));
                showNotification('任务已删除', 'success');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '删除任务失败';
            showNotification(`删除失败: ${errorMessage}`, 'error');
        }
    }, [showNotification]);

    // 格式化文件大小
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 格式化时间
    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* 头部 */}
            <Card className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                            <Download className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">数据导出</h1>
                            <p className="text-gray-600 mt-1">导出测试结果、监控数据和分析报告</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* 导出配置 */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">导出配置</h2>

                <div className="space-y-4">
                    {/* 基础配置 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="导出格式"
                            options={formatOptions}
                            value={config.format}
                            onChange={(value) => setConfig(prev => ({ ...prev, format: value as ExportFormat }))}
                        />
                        <Select
                            label="数据类型"
                            options={dataTypeOptions}
                            value={config.dataType}
                            onChange={(value) => setConfig(prev => ({ ...prev, dataType: value as ExportDataType }))}
                        />
                    </div>

                    {/* 时间范围 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="开始日期"
                            type="date"
                            value={config.dateRange.start}
                            onChange={(value) => setConfig(prev => ({
                                ...prev,
                                dateRange: { ...prev.dateRange, start: value as string }
                            }))}
                        />
                        <Input
                            label="结束日期"
                            type="date"
                            value={config.dateRange.end}
                            onChange={(value) => setConfig(prev => ({
                                ...prev,
                                dateRange: { ...prev.dateRange, end: value as string }
                            }))}
                        />
                    </div>

                    {/* 基础选项 */}
                    <div className="space-y-3">
                        <h3 className="font-medium text-gray-900">包含内容</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className="flex items-center space-x-2">
                                <Checkbox
                                    checked={config.options.includeCharts || false}
                                    onChange={(checked) => setConfig(prev => ({
                                        ...prev,
                                        options: { ...prev.options, includeCharts: checked as boolean }
                                    }))}
                                />
                                <span className="text-sm text-gray-700">包含图表</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <Checkbox
                                    checked={config.options.includeRecommendations || false}
                                    onChange={(checked) => setConfig(prev => ({
                                        ...prev,
                                        options: { ...prev.options, includeRecommendations: checked as boolean }
                                    }))}
                                />
                                <span className="text-sm text-gray-700">包含建议</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <Checkbox
                                    checked={config.options.includeRawData || false}
                                    onChange={(checked) => setConfig(prev => ({
                                        ...prev,
                                        options: { ...prev.options, includeRawData: checked as boolean }
                                    }))}
                                />
                                <span className="text-sm text-gray-700">包含原始数据</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <Checkbox
                                    checked={config.options.compression || false}
                                    onChange={(checked) => setConfig(prev => ({
                                        ...prev,
                                        options: { ...prev.options, compression: checked as boolean }
                                    }))}
                                />
                                <span className="text-sm text-gray-700">压缩文件</span>
                            </label>
                        </div>
                    </div>

                    {/* 高级选项 */}
                    <div>
                        <Button
                            variant="ghost"
                            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                            icon={<Settings className="w-4 h-4" />}
                        >
                            高级选项
                        </Button>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        <Button
                            variant="primary"
                            onClick={handleStartExport}
                            disabled={isExporting}
                            loading={isExporting}
                            icon={<Download className="w-4 h-4" />}
                        >
                            开始导出
                        </Button>
                    </div>
                </div>
            </Card>

            {/* 导出任务列表 */}
            <Card>
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">导出任务</h2>
                </div>

                <div className="divide-y divide-gray-200">
                    {exportTasks.length === 0 ? (
                        <div className="p-8 text-center">
                            <Download className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无导出任务</h3>
                            <p className="text-gray-600">开始您的第一个数据导出</p>
                        </div>
                    ) : (
                        exportTasks.map((task) => (
                            <div key={task.id} className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-4">
                                        <div className="flex-shrink-0">
                                            {getFormatIcon(task.config.format)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <h4 className="font-medium text-gray-900">{task.name}</h4>
                                                <Badge variant={getTaskStatusColor(task.status) as any} size="sm">
                                                    {task.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2">
                                                {task.config.dataType} • {task.config.format.toUpperCase()} •
                                                {task.config.dateRange.start} 至 {task.config.dateRange.end}
                                            </p>
                                            <div className="text-xs text-gray-500">
                                                <span>创建时间: {formatTime(task.createdAt)}</span>
                                                {task.completedAt && (
                                                    <span className="ml-4">完成时间: {formatTime(task.completedAt)}</span>
                                                )}
                                                {task.fileSize && (
                                                    <span className="ml-4">文件大小: {formatFileSize(task.fileSize)}</span>
                                                )}
                                            </div>

                                            {/* 进度条 */}
                                            {task.status === 'processing' && (
                                                <div className="mt-3">
                                                    <ProgressBar value={task.progress} />
                                                </div>
                                            )}

                                            {/* 错误信息 */}
                                            {task.error && (
                                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                                    {task.error}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        {getTaskStatusIcon(task.status)}
                                        {task.status === 'completed' && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleDownload(task)}
                                                icon={<Download className="w-4 h-4" />}
                                            >
                                                下载
                                            </Button>
                                        )}
                                        {(task.status === 'pending' || task.status === 'processing') && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleCancelTask(task.id)}
                                                icon={<X className="w-4 h-4" />}
                                            >
                                                取消
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteTask(task.id)}
                                            icon={<Trash2 className="w-4 h-4" />}
                                        >
                                            删除
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            {/* 高级选项模态框 */}
            <Modal
                isOpen={showAdvancedOptions}
                onClose={() => setShowAdvancedOptions(false)}
                title="高级导出选项"
                size="lg"
            >
                <div className="space-y-4">
                    {/* 筛选器 */}
                    <div>
                        <h3 className="font-medium text-gray-900 mb-3">数据筛选</h3>
                        <div className="space-y-3">
                            <Select
                                label="状态筛选"
                                options={statusOptions}
                                value="all"
                                onChange={() => { }}
                            />
                            <Input
                                label="关键词筛选"
                                placeholder="输入关键词..."
                                leftIcon={<Filter className="w-4 h-4" />}
                            />
                        </div>
                    </div>

                    {/* 安全选项 */}
                    <div>
                        <h3 className="font-medium text-gray-900 mb-3">安全选项</h3>
                        <Input
                            label="文件密码（可选）"
                            type="password"
                            placeholder="设置文件密码"
                            value={config.options.password || ''}
                            onChange={(value) => setConfig(prev => ({
                                ...prev,
                                options: { ...prev.options, password: value as string }
                            }))}
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="ghost" onClick={() => setShowAdvancedOptions(false)}>
                            取消
                        </Button>
                        <Button variant="primary" onClick={() => setShowAdvancedOptions(false)}>
                            应用设置
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DataExporter;