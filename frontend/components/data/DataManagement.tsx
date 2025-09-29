/**
 * DataManagement.tsx - React组件
 * 
 * 文件路径: frontend\components\data\DataManagement.tsx
 * 创建时间: 2025-09-25
 */

import { PaginationInfo, TestRecord } from '@/hooks/useDataStorage';
import {
    BarChart3,
    Database,
    Download,
    FileText,
    RefreshCw,
    Search,
    TrendingUp
} from 'lucide-react';
import React, { useState } from 'react';
// import { TestType } from '@shared/types'; // 暂时禁用
type TestType = 'website' | 'security' | 'performance' | 'seo' | 'api' | 'network' | 'database' | 'compatibility' | 'accessibility' | 'ux';
import DataStats from './DataStats';

interface DataManagementProps {
    className?: string;
    defaultTab?: 'data' | 'history' | 'statistics';
}

export const DataManagement: React.FC<DataManagementProps> = ({
    className = '',
    defaultTab = 'data'
}) => {
    const [activeTab, setActiveTab] = useState<'data' | 'history' | 'statistics'>(defaultTab);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTestTypes, setSelectedTestTypes] = useState<TestType[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // 模拟数据
    const mockPaginationInfo: PaginationInfo = {
        current: 1,
        pageSize: 10,
        total: 100
    };

    const mockTestRecords: TestRecord[] = [
        {
            id: '1',
            testName: '性能测试',
            testType: TestType.PERFORMANCE,
            status: 'completed',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            result: { score: 85 }
        }
    ];

    const handleTabChange = (tab: 'data' | 'history' | 'statistics') => {
        setActiveTab(tab);
    };

    const handleTestTypeToggle = (testType: TestType) => {
        setSelectedTestTypes(prev =>
            prev.includes(testType)
                ? prev.filter(t => t !== testType)
                : [...prev, testType]
        );
    };

    const handleRefresh = () => {
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 1000);
    };

    const handleExport = () => {
    };

    return (
        <div className={`unified-data-management min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-5 ${className}`}>
            {/* 头部 */}
            <div className="header bg-white/95 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-lg">
                <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-3">
                        <Database className="w-8 h-8 text-blue-500" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 m-0">数据管理中心</h1>
                            <p className="text-gray-600 text-base mt-1">管理和分析测试数据</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-lg bg-white text-gray-700 font-medium transition-all hover:border-blue-500 hover:text-blue-500 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            刷新
                        </button>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium transition-all hover:bg-blue-600"
                        >
                            <Download className="w-4 h-4" />
                            导出
                        </button>
                    </div>
                </div>

                {/* 搜索和筛选 */}
                <div className="border-t border-gray-200 pt-5">
                    <div className="flex flex-col gap-4">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="搜索测试记录..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e?.target.value)}
                                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="flex items-center gap-4 flex-wrap">
                            <span className="font-semibold text-gray-700">测试类型:</span>
                            <div className="flex gap-2 flex-wrap">
                                {Object.values(TestType).map((testType) => (
                                    <button
                                        key={testType}
                                        onClick={() => handleTestTypeToggle(testType)}
                                        className={`px-3 py-1.5 text-xs rounded-full border transition-all ${selectedTestTypes.includes(testType)
                                            ? 'bg-blue-500 text-white border-blue-500'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-500 hover:text-blue-500'
                                            }`}
                                    >
                                        {testType}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 标签导航 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <button
                    onClick={() => handleTabChange('data')}
                    className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left ${activeTab === 'data'
                        ? 'border-blue-500 bg-white shadow-lg'
                        : 'border-transparent bg-white/80 hover:border-blue-500 hover:shadow-md'
                        }`}
                >
                    <Database className="w-6 h-6 text-blue-500 flex-shrink-0" />
                    <div>
                        <div className="font-semibold text-gray-800">数据概览</div>
                        <div className="text-sm text-gray-600">查看测试数据统计</div>
                    </div>
                </button>

                <button
                    onClick={() => handleTabChange('history')}
                    className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left ${activeTab === 'history'
                        ? 'border-blue-500 bg-white shadow-lg'
                        : 'border-transparent bg-white/80 hover:border-blue-500 hover:shadow-md'
                        }`}
                >
                    <FileText className="w-6 h-6 text-blue-500 flex-shrink-0" />
                    <div>
                        <div className="font-semibold text-gray-800">测试历史</div>
                        <div className="text-sm text-gray-600">查看历史测试记录</div>
                    </div>
                </button>

                <button
                    onClick={() => handleTabChange('statistics')}
                    className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left ${activeTab === 'statistics'
                        ? 'border-blue-500 bg-white shadow-lg'
                        : 'border-transparent bg-white/80 hover:border-blue-500 hover:shadow-md'
                        }`}
                >
                    <BarChart3 className="w-6 h-6 text-blue-500 flex-shrink-0" />
                    <div>
                        <div className="font-semibold text-gray-800">数据统计</div>
                        <div className="text-sm text-gray-600">查看详细统计信息</div>
                    </div>
                </button>
            </div>

            {/* 内容区域 */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg min-h-[600px]">
                {activeTab === 'data' && (
                    <div className="data-tab">
                        <DataStats
                            pagination={mockPaginationInfo}
                            records={mockTestRecords}
                            loading={isLoading}
                        />
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="history-tab">
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                            <FileText className="w-16 h-16 mb-5 opacity-50" />
                            <h3 className="text-xl font-semibold text-gray-700 mb-3">测试历史功能开发中</h3>
                            <p className="text-center max-w-md">
                                测试历史记录功能正在开发中，敬请期待。
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'statistics' && (
                    <div className="statistics-tab">
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                            <TrendingUp className="w-16 h-16 mb-5 opacity-50" />
                            <h3 className="text-xl font-semibold text-gray-700 mb-3">统计功能开发中</h3>
                            <p className="text-center max-w-md">
                                详细的数据统计和分析功能正在开发中，敬请期待。
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataManagement;