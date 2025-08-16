/**
 * 性能监控组件
 * 显示应用性能指标和核心Web指标
 */

import React, { useState } from 'react';
import {
    useDevicePerformance,
    useMemoryMonitor,
    useNetworkStatus,
    usePerformanceMonitor,
    // useVisibility
} from '../../hooks/usePerformanceOptimization'; // 已修复
interface PerformanceMonitorProps {
    className?: string;
    showDetails?: boolean;
    autoHide?: boolean; // 在生产环境自动隐藏
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
    className = '',
    showDetails = false,
    autoHide = true
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { metrics, coreVitals, sendMetrics } = usePerformanceMonitor();
    const { isOnline, isSlowNetwork, networkType } = useNetworkStatus();
    const { performanceLevel, deviceInfo } = useDevicePerformance();
    const memoryInfo = useMemoryMonitor();
    const isVisible = useVisibility();

    // 在生产环境且设置了自动隐藏时不显示
    if (autoHide && process.env.NODE_ENV === 'production') {
        
        return null;
      }

    // 页面不可见时不更新
    if (!isVisible) {
        
        return null;
      }

    // 获取性能等级颜色
    const getPerformanceColor = (value: number, thresholds: { good: number; needs: number }) => {
        if (value <= thresholds.good) return 'text-green-600';
        if (value <= thresholds.needs) return 'text-yellow-600';
        return 'text-red-600';
    };

    // 格式化数值
    const formatValue = (value: number | undefined, unit: string = 'ms') => {
        if (value === undefined) return 'N/A';
        return `${Math.round(value)}${unit}`;
    };

    // 格式化字节
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    return (
        <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
            {/* 简化视图 */}
            {!isExpanded && (
                <div
                    className="bg-black bg-opacity-80 text-white p-3 rounded-lg cursor-pointer hover:bg-opacity-90 transition-all"
                    onClick={() => setIsExpanded(true)}
                >
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-sm font-mono">性能监控</span>
                    </div>
                    <div className="text-xs mt-1 space-y-1">
                        <div>LCP: <span className={getPerformanceColor(coreVitals.LCP || 0, { good: 2500, needs: 4000 })}>{formatValue(coreVitals.LCP)}</span></div>
                        <div>FID: <span className={getPerformanceColor(coreVitals.FID || 0, { good: 100, needs: 300 })}>{formatValue(coreVitals.FID)}</span></div>
                        <div>CLS: <span className={getPerformanceColor((coreVitals.CLS || 0) * 1000, { good: 100, needs: 250 })}>{formatValue((coreVitals.CLS || 0) * 1000, '')}</span></div>
                    </div>
                </div>
            )}

            {/* 详细视图 */}
            {isExpanded && (
                <div className="bg-black bg-opacity-90 text-white p-4 rounded-lg max-w-md max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold">性能监控</h3>
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>

                    {/* 核心Web指标 */}
                    <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2 text-blue-300">核心Web指标</h4>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="bg-gray-800 p-2 rounded">
                                <div className="text-gray-400">LCP</div>
                                <div className={getPerformanceColor(coreVitals.LCP || 0, { good: 2500, needs: 4000 })}>
                                    {formatValue(coreVitals.LCP)}
                                </div>
                            </div>
                            <div className="bg-gray-800 p-2 rounded">
                                <div className="text-gray-400">FID</div>
                                <div className={getPerformanceColor(coreVitals.FID || 0, { good: 100, needs: 300 })}>
                                    {formatValue(coreVitals.FID)}
                                </div>
                            </div>
                            <div className="bg-gray-800 p-2 rounded">
                                <div className="text-gray-400">CLS</div>
                                <div className={getPerformanceColor((coreVitals.CLS || 0) * 1000, { good: 100, needs: 250 })}>
                                    {formatValue((coreVitals.CLS || 0) * 1000, '')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 页面加载指标 */}
                    {showDetails && (
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold mb-2 text-green-300">页面加载</h4>
                            <div className="text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">DNS查询:</span>
                                    <span>{formatValue(metrics.DNS)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">TCP连接:</span>
                                    <span>{formatValue(metrics.TCP)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">请求响应:</span>
                                    <span>{formatValue(metrics.Request)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">DOM解析:</span>
                                    <span>{formatValue(metrics.DOMParse)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">总加载时间:</span>
                                    <span className="font-semibold">{formatValue(metrics.PageLoad)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 网络状态 */}
                    <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2 text-yellow-300">网络状态</h4>
                        <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                                <span className="text-gray-400">连接状态:</span>
                                <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
                                    {isOnline ? '在线' : '离线'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">网络类型:</span>
                                <span>{networkType}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">慢速网络:</span>
                                <span className={isSlowNetwork ? 'text-red-400' : 'text-green-400'}>
                                    {isSlowNetwork ? '是' : '否'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 设备信息 */}
                    <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2 text-purple-300">设备信息</h4>
                        <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                                <span className="text-gray-400">性能等级:</span>
                                <span className={
                                    performanceLevel === 'high' ? 'text-green-400' :
                                        performanceLevel === 'medium' ? 'text-yellow-400' : 'text-red-400'
                                }>
                                    {performanceLevel === 'high' ? '高' : performanceLevel === 'medium' ? '中' : '低'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">CPU核心:</span>
                                <span>{deviceInfo.cores}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">内存:</span>
                                <span>{deviceInfo.memory}GB</span>
                            </div>
                        </div>
                    </div>

                    {/* 内存使用 */}
                    {memoryInfo && (
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold mb-2 text-red-300">内存使用</h4>
                            <div className="text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">已使用:</span>
                                    <span>{formatBytes(memoryInfo.used)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">总计:</span>
                                    <span>{formatBytes(memoryInfo.total)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">使用率:</span>
                                    <span className={getPerformanceColor(memoryInfo.percentage, { good: 60, needs: 80 })}>
                                        {memoryInfo.percentage.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                                    <div
                                        className={`h-2 rounded-full ${memoryInfo.percentage > 80 ? 'bg-red-500' :
                                                memoryInfo.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                                            }`}
                                        style={{ width: `${Math.min(memoryInfo.percentage, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex space-x-2">
                        <button
                            onClick={sendMetrics}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 px-3 rounded transition-colors"
                        >
                            发送指标
                        </button>
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs py-2 px-3 rounded transition-colors"
                        >
                            收起
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerformanceMonitor;